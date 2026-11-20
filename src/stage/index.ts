// 3D の表示(three.js)。画面の部品とは store だけを介してつながる。
//
// 描き直しが要る時(状態が変わった・入力があった・大きさが変わった・カメラが動いている・再生中)だけ
// requestAnimationFrame を予約する。止まっている間は 1 回も描かない。
import * as THREE from 'three';
import type { Ephemeris } from '../lib/ephemeris';
import type { StarCatalog } from '../lib/stars';
import type { AppState, AppStore } from '../lib/store';
import { Bodies } from './bodies';
import { basisFromForward, CameraRig, verticalFovDeg } from './camera';
import type { FrameContext } from './frame';
import { attachInput } from './input';
import { OrbitLines, TrackLines } from './lines';
import { MarkerLayer } from './markers';
import { DEG, add, type Vec3 } from './math';
import { createStarfield } from './starfield';
import { readTheme } from './theme';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  /** 天体の目印と名前を置く層(canvas の上に重ねた要素) */
  overlay: HTMLElement;
  eph: Ephemeris;
  stars: StarCatalog;
  store: AppStore;
}

export interface StageStats {
  /** 直近の 1 秒間に描いたコマ数。描いていない間は 0 */
  fps: number;
  /** 起動してから描いたコマの総数 */
  frames: number;
  /** 動きが無く、描き直しを止めているか */
  idle: boolean;
}

export interface Stage {
  stats(): StageStats;
  /** 操作しない間に文字や目盛りと一緒に軌道の線を薄くする。false で薄くする */
  setChromeVisible(visible: boolean): void;
  dispose(): void;
}

/** 軌道の線の濃さを切り替える時間(秒)。操作の部品の薄れ方(--dur-l)に合わせる */
const CHROME_FADE_S = 0.34;

export function createStage(options: StageOptions): Stage {
  const { canvas, overlay, eph, stars, store } = options;
  const theme = readTheme();

  // 色は CSS の値をそのまま画面に出す(three.js の色の変換を切る)。画素比は 2 まで
  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, depth: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(new THREE.Color(theme.space), 1);

  const scene = new THREE.Scene();
  // カメラは常に原点。near / far は線が切れない広さにとる(奥行きの判定は使わないので精度は問わない)
  const camera = new THREE.PerspectiveCamera(60, 1, 1, 1e13);
  const starfield = createStarfield(stars, theme.starGain);
  const orbits = new OrbitLines(eph, theme);
  const track = new TrackLines(eph, theme);
  const bodies = new Bodies(eph, theme);
  const markers = new MarkerLayer(overlay);
  scene.add(starfield.object, orbits.group, track.group, bodies.group);

  const rig = new CameraRig(eph);
  const initial = store.get();
  rig.initLook(initial.lookTarget, initial.et);

  const reducedMotion = (): boolean =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 大きさ ──
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  function resize(): void {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    starfield.setPixelRatio(pixelRatio);
    camera.aspect = width / height;
  }
  resize();

  // ── 描き直しの予約 ──
  let disposed = false;
  let scheduled = false;
  let rafId = 0;
  let lastFrameMs: number | null = null;
  let frames = 0;
  const stamps: number[] = [];
  let chrome = 1;
  let chromeTarget = 1;

  function invalidate(): void {
    if (disposed || scheduled) return;
    scheduled = true;
    rafId = requestAnimationFrame(frame);
  }

  // ── 状態の変化 ──
  let lastView = initial.view;
  let lastLookSeq = initial.lookSeq;
  const unsubscribe = store.subscribe((s: Readonly<AppState>) => {
    const now = performance.now();
    if (s.view !== lastView) {
      lastView = s.view;
      rig.switchView(!reducedMotion());
    }
    if (s.lookSeq !== lastLookSeq) {
      lastLookSeq = s.lookSeq;
      if (s.lookTarget) rig.look(s.lookTarget, s.et, now, s.view === 'voyager' && !reducedMotion());
    }
    invalidate();
  });

  // ── 入力 ──
  const detachInput = attachInput(canvas, {
    drag(dx, dy) {
      if (store.get().view === 'voyager') rig.dragVoyager(dx, dy, Math.min(width, height));
      else rig.dragOverview(dx, dy);
      invalidate();
    },
    zoom(factor) {
      rig.zoom(factor, store.get().view);
      invalidate();
    },
  });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    invalidate();
  });
  resizeObserver.observe(canvas);

  // WebGL のコンテキストが失われた時は既定の動作(復元の放棄)を止め、戻ったら描き直す
  const onLost = (e: Event): void => e.preventDefault();
  const onRestored = (): void => invalidate();
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  // ── 1 コマ ──
  const voyagerSun: Vec3 = [0, 0, 0];
  const frameCtx: FrameContext = {
    et: 0,
    offset: [0, 0, 0],
    basis: { right: [1, 0, 0], up: [0, 0, 1], forward: [0, 1, 0] },
    tanV: 1,
    tanH: 1,
    width: 1,
    height: 1,
    pixelRatio: 1,
  };

  function frame(now: number): void {
    scheduled = false;
    if (disposed) return;
    const dt = lastFrameMs === null ? 0 : Math.max(0, (now - lastFrameMs) / 1000);
    lastFrameMs = now;

    // 再生中は毎フレーム時刻を進める(状態が変わると上の購読が次のコマを予約する)
    if (store.get().playing) store.tick(dt);
    const state = store.get();

    chrome += Math.sign(chromeTarget - chrome) * Math.min(Math.abs(chromeTarget - chrome), dt / CHROME_FADE_S);

    eph.position('voyager1', 'sun', state.et, voyagerSun);
    const pose = rig.update(now, state.view, state.et, voyagerSun);

    const vfov = verticalFovDeg(pose.fov, width / height);
    camera.fov = vfov;
    camera.aspect = width / height;
    camera.near = 1;
    camera.far = 1e13;
    camera.updateProjectionMatrix();
    const basis = basisFromForward(pose.forward);
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...basis.right),
      new THREE.Vector3(...basis.up),
      new THREE.Vector3(-basis.forward[0], -basis.forward[1], -basis.forward[2]),
    );
    camera.quaternion.setFromRotationMatrix(m);
    camera.position.set(0, 0, 0);
    camera.updateMatrixWorld(true);

    const tanV = Math.tan((vfov * DEG) / 2);
    frameCtx.et = state.et;
    frameCtx.offset = pose.offset;
    frameCtx.basis = basis;
    frameCtx.tanV = tanV;
    frameCtx.tanH = tanV * (width / height);
    frameCtx.width = width;
    frameCtx.height = height;
    frameCtx.pixelRatio = pixelRatio;

    // カメラの太陽中心の位置(線の頂点を相対位置に直すのに使う)
    const cameraSun = add(voyagerSun, pose.offset);
    const infos = bodies.update(frameCtx);
    orbits.update(frameCtx, cameraSun, chrome);
    track.update(frameCtx, cameraSun);
    markers.update(infos, frameCtx, state.lookTarget);

    renderer.render(scene, camera);

    frames++;
    stamps.push(now);
    while (stamps.length > 0 && now - stamps[0] > 1000) stamps.shift();

    if (state.playing || rig.animating || chrome !== chromeTarget) invalidate();
    else lastFrameMs = null;
  }

  invalidate();

  return {
    stats() {
      const now = performance.now();
      let n = 0;
      for (let i = stamps.length - 1; i >= 0 && now - stamps[i] <= 1000; i--) n++;
      return { fps: n, frames, idle: !scheduled };
    },
    setChromeVisible(visible) {
      chromeTarget = visible ? 1 : 0;
      invalidate();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      unsubscribe();
      detachInput();
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      markers.dispose();
      starfield.dispose();
      orbits.dispose();
      track.dispose();
      bodies.dispose();
      renderer.dispose();
    },
  };
}
