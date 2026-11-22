// 3D の表示(three.js)。画面の部品とは store だけを介してつながる。
//
// 描き直しが要る時(状態が変わった・入力があった・大きさが変わった・カメラが動いている・再生中)だけ
// requestAnimationFrame を予約する。止まっている間は 1 回も描かない。
import * as THREE from 'three';
import type { Ephemeris } from '../lib/ephemeris';
import { loadStars, STAR_STRIDE, type StarCatalog } from '../lib/stars';
import type { AppState, AppStore } from '../lib/store';
import { Bodies } from './bodies';
import { CraftView } from './craft';
import { fovFromMagnification } from '../lib/zoom';
import { basisFromForward, CameraRig, LOOK_RELEASE_SECONDS, verticalFovDeg } from './camera';
import { DROP_FADE_S, LINE_FADE_S, stepToward, viewLineFade } from './fade';
import type { FrameContext } from './frame';
import { attachInput } from './input';
import { dropWanted, DROP_AFTER_DRAG_MS } from './guide';
import { GuideLines } from './guideLines';
import { OrbitLines, TrackLines } from './lines';
import { MarkerLayer } from './markers';
import { createMilkyway, pickMilkywayVariant } from './milkyway';
import { DEG, add, dot, type Vec3 } from './math';
import type { BodyId } from '../lib/bodies';
import { ScaleBarView } from './scaleBarView';
import { createStarfield } from './starfield';
import { JUMP_SECONDS } from './streak';
import { PlanetStreaks } from './streaks';
import { readTheme } from './theme';
import { catalogHasDeepStars, DEEP_STARS_DELAY_MS, effectiveZoom } from './zoomView';

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

export interface BodyScreenPoint {
  x: number;
  y: number;
  /** 画面の中にあるか(カメラの後ろ・画面の外なら false) */
  visible: boolean;
}

export interface Stage {
  stats(): StageStats;
  /** 操作しない間に文字や目盛りと一緒に軌道の線を薄くする。false で薄くする */
  setChromeVisible(visible: boolean): void;
  /** 天体の目印の画面の位置(CSS px)を、描くたびに位置が変わった時だけ知らせる。戻り値を呼ぶと解除 */
  watchBody(body: BodyId, listener: (p: BodyScreenPoint) => void): () => void;
  dispose(): void;
}

/** 軌道の線の濃さを切り替える時間(秒)。操作の部品の薄れ方(--dur-l)に合わせる */
const CHROME_FADE_S = 0.34;

export function createStage(options: StageOptions): Stage {
  const { canvas, overlay, eph, stars, store } = options;
  const theme = readTheme();

  // 色は CSS の値をそのまま画面に出す(three.js の色の変換を切る)。画素比は 2 まで
  THREE.ColorManagement.enabled = false;
  // 奥行きの判定は本体の視点の機体だけが使う(ほかの素材は depthTest: false で、遠い順の renderOrder で描く)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, depth: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(new THREE.Color(theme.space), 1);

  const scene = new THREE.Scene();
  // カメラは常に原点。near / far は線が切れない広さにとる(奥行きの判定は使わないので精度は問わない)
  const camera = new THREE.PerspectiveCamera(60, 1, 1, 1e13);
  const starfield = createStarfield(stars, theme.starGain);
  // 暗い星(8 等まで)は、開いて最初の表示が落ち着いてから 1 回だけ読み込み、ふっと足す。?stars=deep で最初から入っている時は足さない
  const deepAtStart = catalogHasDeepStars(stars.data, STAR_STRIDE);
  const orbits = new OrbitLines(eph, theme);
  const track = new TrackLines(eph, theme);
  const bodies = new Bodies(eph, theme, {
    maxTextureSize: renderer.capabilities.maxTextureSize,
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    onTextureLoaded: () => invalidate(),
  });
  const streaks = new PlanetStreaks(eph, theme);
  const guide = new GuideLines(eph, theme);
  const markers = new MarkerLayer(overlay, eph);
  const scaleBar = new ScaleBarView(overlay);
  // 天の川は最初のコマを描いた後に読み込む(星空が先に出る)
  const milkyway = createMilkyway({
    baseUrl: import.meta.env.BASE_URL + 'textures/',
    variant: pickMilkywayVariant(
      Math.min(window.innerWidth, window.innerHeight),
      Math.min(window.devicePixelRatio || 1, 2),
      typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
    ),
    gain: theme.milkywayGain,
    onLoad: () => invalidate(),
  });
  scene.add(milkyway.object, starfield.object, orbits.group, track.group, guide.group, streaks.group, bodies.group);

  // ── ボイジャー本体 ──(第6段階。中身は craft.ts)
  const craft = new CraftView({ eph, onChange: () => invalidate() });
  if (store.get().view === 'craft') craft.activate();

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
  /** 前のコマの時刻(et)。止まっている間は null に戻す(止まった後の最初のコマを「飛んだ」と見ない) */
  let prevEt: number | null = null;
  let frames = 0;
  const stamps: number[] = [];
  let chrome = 1;
  let chromeTarget = 1;
  // 表示の切り替えによる線の濃さ(0〜1)。軌道の線はメニューの「惑星の軌道」、そのほかの線は「星空だけを表示」で消える
  let orbitFade = initial.display.orbits && !initial.starsOnly ? 1 : 0;
  let lineFade = initial.starsOnly ? 0 : 1;
  // 垂線: 引きの眺めを回した最後の時刻(ms。まだなら null)と、いまの濃さ
  let lastOverviewDragMs: number | null = null;
  let dropFade = 0;
  let dropTimer: ReturnType<typeof setTimeout> | null = null;
  // 暗い星を後から読む(最初に読み込む量に入れない)。読めなくても星空は動き続け、くり返し読みに行かない
  const deepTimer = deepAtStart
    ? null
    : setTimeout(() => {
        void loadStars(import.meta.env.BASE_URL + 'data/stars/stars-deep.bin').then(
          (more) => {
            if (disposed) return;
            starfield.addDeep(more);
            starfield.setDeepVisible(true);
            invalidate();
          },
          (error: unknown) => console.warn('deep stars failed to load', error),
        );
      }, DEEP_STARS_DELAY_MS);

  function invalidate(): void {
    if (disposed || scheduled) return;
    scheduled = true;
    rafId = requestAnimationFrame(frame);
  }

  // ── 状態の変化 ──
  let lastView = initial.view;
  let lastLookSeq = initial.lookSeq;
  let lastReleaseSeq = initial.lookReleaseSeq;
  let lastResetSeq = initial.resetSeq;
  const unsubscribe = store.subscribe((s: Readonly<AppState>) => {
    const now = performance.now();
    if (s.view !== lastView) {
      const fromView = lastView;
      lastView = s.view;
      if (s.view === 'craft') craft.activate();
      rig.switchView(fromView, s.view, !reducedMotion());
    }
    if (s.lookSeq !== lastLookSeq) {
      lastLookSeq = s.lookSeq;
      if (s.lookTarget) rig.look(s.lookTarget, s.et, now, s.view === 'voyager' && !reducedMotion());
    }
    // 最初からやり直した: カメラの向きを開いた直後に戻す
    if (s.resetSeq !== lastResetSeq) {
      lastResetSeq = s.resetSeq;
      rig.reset(s.et);
    }
    // 名場面の範囲を出て追うのをやめた: 開いた直後と同じく太陽へ、ゆっくり向き直る
    if (s.lookReleaseSeq !== lastReleaseSeq) {
      lastReleaseSeq = s.lookReleaseSeq;
      rig.look('sun', s.et, now, s.view === 'voyager' && !reducedMotion(), LOOK_RELEASE_SECONDS);
    }
    invalidate();
  });

  // ── 入力 ──
  const detachInput = attachInput(canvas, {
    drag(dx, dy) {
      const s = store.get();
      if (s.view === 'voyager') rig.dragVoyager(dx, dy, Math.min(width, height), fovFromMagnification(s.magnification));
      else if (s.view === 'craft') craft.drag(dx, dy);
      else {
        rig.dragOverview(dx, dy);
        // 回している間とその後の数秒は垂線を出す。数秒後に消える時の描き直しは、止まっている間も 1 回だけ予約する
        lastOverviewDragMs = performance.now();
        if (dropTimer !== null) clearTimeout(dropTimer);
      if (deepTimer !== null) clearTimeout(deepTimer);
        dropTimer = setTimeout(() => {
          dropTimer = null;
          invalidate();
        }, DROP_AFTER_DRAG_MS + 50);
      }
      invalidate();
    },
    zoom(factor) {
      // ボイジャーの視界の倍率と本体の視点の距離は状態が持つ(画面に数字を出すため)。引きの眺めは 3D 側が持つ
      if (store.get().view === 'overview') rig.zoomOverview(factor);
      else store.zoomBy(factor);
      invalidate();
    },
    tap() {
      if (store.get().starsOnly) store.setStarsOnly(false);
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

  // ── 目印の位置を外へ伝える口 ──
  const watchers: { body: BodyId; listener: (p: BodyScreenPoint) => void; last: BodyScreenPoint | null }[] = [];
  function notifyWatchers(infos: { id: BodyId; screen: { x: number; y: number } | null }[]): void {
    for (const w of watchers) {
      const s = infos.find((i) => i.id === w.body)?.screen ?? null;
      const inside = !!s && s.x >= 0 && s.y >= 0 && s.x <= width && s.y <= height;
      const next: BodyScreenPoint = { x: s ? Math.round(s.x * 2) / 2 : 0, y: s ? Math.round(s.y * 2) / 2 : 0, visible: inside };
      const p = w.last;
      if (p && p.visible === next.visible && (!next.visible || (p.x === next.x && p.y === next.y))) continue;
      w.last = next;
      w.listener(next);
    }
  }
  let milkywayStarted = false;

  // ── 1 コマ ──
  const voyagerSun: Vec3 = [0, 0, 0];
  const frameCtx: FrameContext = {
    zoom: 1,
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
    // 表示の切り替え(すっと 0.3 秒で薄れる・戻る)。止まっていた後の最初のコマ(dt = 0)は動かさず、次のコマから進む
    const orbitsOn = state.display.orbits && !state.starsOnly;
    const linesOn = !state.starsOnly;
    orbitFade = stepToward(orbitFade, orbitsOn ? 1 : 0, dt, LINE_FADE_S);
    lineFade = stepToward(lineFade, linesOn ? 1 : 0, dt, LINE_FADE_S);
    const msSinceDrag = lastOverviewDragMs === null ? null : now - lastOverviewDragMs;
    dropFade = stepToward(dropFade, dropWanted(state.et, msSinceDrag) ? 1 : 0, dt, DROP_FADE_S);

    eph.position('voyager1', 'sun', state.et, voyagerSun);
    const pose = rig.update(
      now,
      state.view,
      state.et,
      voyagerSun,
      fovFromMagnification(state.magnification),
      state.view === 'craft' ? craft.pose(state.et, state.craftDistance) : null,
    );

    const zoom = effectiveZoom(pose.fov);
    frameCtx.zoom = zoom;
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
    // 早回しの判断は、再生の設定ではなく、前のコマから実際に進んだ時刻で行う
    let deltaEt = prevEt === null ? 0 : state.et - prevEt;
    if (Math.abs(deltaEt) > JUMP_SECONDS) deltaEt = 0; // 名場面への移動などの大きな飛びは弧にしない
    prevEt = state.et;
    streaks.classify(deltaEt);
    // 「星空だけを表示」の間は残像の弧を出さず、惑星は点で描く
    const streakOn = lineFade > 0.001;
    const infos = bodies.update(frameCtx, streakOn ? streaks.active : undefined, state.view === 'craft' || rig.retreatingFromCraft);
    streaks.update(frameCtx, cameraSun, deltaEt, infos, chrome, lineFade);
    orbits.update(frameCtx, cameraSun, chrome, streakOn ? streaks.glow : undefined, orbitFade);
    // 軌跡は引きの眺めだけ(ボイジャーの視界と本体の視点では足もとから延びる線が手前で切れる)
    const offsetLen = Math.hypot(pose.offset[0], pose.offset[1], pose.offset[2]);
    track.update(frameCtx, cameraSun, viewLineFade(offsetLen) * lineFade);
    guide.update(frameCtx, voyagerSun, cameraSun, lineFade, dropFade);
    markers.update(infos, frameCtx, state.lookTarget, streaks.drawn);

    // 縮尺の物差し: 注視点(太陽とボイジャーの中点)の奥行きでの、画面の 1px あたりの km
    const midDepth =
      -0.5 * dot(voyagerSun, basis.forward) - dot(pose.offset, basis.forward);
    scaleBar.update(state.view === 'overview' && !rig.transitioning && !state.starsOnly, (2 * tanV * midDepth) / height);
    const mwFading = milkyway.update(now, zoom);

    const starsFading = starfield.update(dt);
    notifyWatchers(infos);

    renderer.render(scene, camera);
    craft.render(renderer, camera, frameCtx, state.view === 'craft' || rig.retreatingFromCraft);
    if (!milkywayStarted) {
      milkywayStarted = true;
      milkyway.load();
    }

    frames++;
    stamps.push(now);
    while (stamps.length > 0 && now - stamps[0] > 1000) stamps.shift();

    const linesFading =
      orbitFade !== (orbitsOn ? 1 : 0) || lineFade !== (linesOn ? 1 : 0) || dropFade !== (dropWanted(state.et, msSinceDrag) ? 1 : 0);
    if (
      state.playing ||
      rig.animating ||
      bodies.animating ||
      craft.animating ||
      chrome !== chromeTarget ||
      mwFading ||
      starsFading ||
      linesFading
    )
      invalidate();
    else {
      lastFrameMs = null;
      prevEt = null;
    }
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
    watchBody(body, listener) {
      const w = { body, listener, last: null as BodyScreenPoint | null };
      watchers.push(w);
      // 止まっている間は描かないので、登録した時に 1 コマ予約して最初の位置を受け取る
      invalidate();
      return () => {
        const i = watchers.indexOf(w);
        if (i >= 0) watchers.splice(i, 1);
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (dropTimer !== null) clearTimeout(dropTimer);
      unsubscribe();
      detachInput();
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      markers.dispose();
      scaleBar.dispose();
      streaks.dispose();
      guide.dispose();
      starfield.dispose();
      milkyway.dispose();
      orbits.dispose();
      track.dispose();
      bodies.dispose();
      craft.dispose();
      renderer.dispose();
    },
  };
}
