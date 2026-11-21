// 引きの眺めで、ボイジャーの位置を読み取りやすくする線の描画(計算は guide.ts)。
// ・ボイジャーから黄道面(惑星の並ぶ面)へ下ろした細い点線の垂線と、面の上の足もとの小さな輪。
//   普段は出さず、引きの眺めを回している間とその後の数秒、土星の場面の前後だけ、すっと現れて消える(第6段階。出す判断は guide.ts)
// ・過ぎた名場面の、軌跡の上の小さな刻み(軌跡に直交する短い線)
// ・過ぎた単独の出来事の、軌跡の上の小さな点(名場面の刻みより小さく控えめ)
// ボイジャーの視界では出さない(カメラのずれが小さい間は消える)。「星空だけを表示」の間はすべて消える。
import * as THREE from 'three';
import type { Ephemeris } from '../lib/ephemeris';
import { STANDALONE_EVENTS } from '../lib/events';
import { SCENES } from '../lib/scenes';
import type { FrameContext } from './frame';
import { projectToScreen } from './frame';
import { viewLineFade } from './fade';
import { footOnEcliptic } from './guide';
import type { Vec3 } from './math';
import type { Theme } from './theme';
import { makeDotTexture } from './textures';

/** 垂線の点線の最大の数 */
const MAX_DASHES = 56;
/** 点線 1 周期の画面上の長さ(px)と、線の部分の割合 */
const DASH_PERIOD_PX = 9;
const DASH_ON = 0.5;
/** 垂線が画面でこれより短い間は出さない(ボイジャーが面のすぐ上にいる時) */
const MIN_DROP_PX = 12;
/** 足もとの輪の半径(px) */
const FOOT_RING_PX = 6.5;
const FOOT_SEGMENTS = 40;
/** 名場面の刻みの長さ(px) */
const TICK_PX = 9;
/** 刻みの向きを決める、前後の時間(秒) */
const TICK_SPAN_S = 86400;
/** 単独の出来事の点の大きさ(CSS px)。名場面の刻み(9px)より小さく */
const EVENT_DOT_PX = 5;

const DROP_OPACITY = 0.6;
const FOOT_OPACITY = 0.8;
const TICK_OPACITY = 0.95;
const EVENT_OPACITY = 0.8;

function makeLines<T extends THREE.Line | THREE.LineSegments | THREE.LineLoop>(
  ctor: new (g: THREE.BufferGeometry, m: THREE.Material) => T,
  vertices: number,
  color: string,
): T {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false });
  const obj = new ctor(geometry, material);
  obj.frustumCulled = false;
  // 軌跡(2)のすぐ上
  obj.renderOrder = 3;
  return obj;
}

export class GuideLines {
  readonly group = new THREE.Group();
  private drop: THREE.LineSegments;
  private foot: THREE.LineLoop;
  private ticks: THREE.LineSegments;
  private eventDots: THREE.Points;
  private eventMaterial: THREE.PointsMaterial;
  private eventTexture: THREE.Texture;
  /** 名場面ごとの、太陽中心の位置と軌跡の向き(単位ベクトル。起動時に 1 回だけ作る) */
  private marks: { et: number; pos: Vec3; dir: Vec3 }[] = [];
  /** 単独の出来事ごとの、時刻と太陽中心の位置 */
  private events: { et: number; pos: Vec3 }[] = [];
  private foots: Vec3 = [0, 0, 0];

  constructor(eph: Ephemeris, theme: Theme) {
    this.drop = makeLines(THREE.LineSegments, MAX_DASHES * 2, theme.gold);
    this.foot = makeLines(THREE.LineLoop, FOOT_SEGMENTS, theme.gold);
    this.ticks = makeLines(THREE.LineSegments, SCENES.length * 2, theme.gold);
    this.eventTexture = makeDotTexture();
    this.eventMaterial = new THREE.PointsMaterial({
      map: this.eventTexture,
      color: theme.gold,
      size: EVENT_DOT_PX,
      sizeAttenuation: false,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const eventGeometry = new THREE.BufferGeometry();
    eventGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STANDALONE_EVENTS.length * 3), 3));
    eventGeometry.setDrawRange(0, 0);
    this.eventDots = new THREE.Points(eventGeometry, this.eventMaterial);
    this.eventDots.frustumCulled = false;
    this.eventDots.renderOrder = 3;
    this.group.add(this.drop, this.foot, this.ticks, this.eventDots);
    for (const e of STANDALONE_EVENTS) {
      this.events.push({ et: e.et, pos: eph.position('voyager1', 'sun', e.et, [0, 0, 0]) });
    }
    for (const s of SCENES) {
      const pos = eph.position('voyager1', 'sun', s.et, [0, 0, 0]);
      const before = eph.position('voyager1', 'sun', s.et - TICK_SPAN_S, [0, 0, 0]);
      const after = eph.position('voyager1', 'sun', s.et + TICK_SPAN_S, [0, 0, 0]);
      const d: Vec3 = [after[0] - before[0], after[1] - before[1], after[2] - before[2]];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      this.marks.push({ et: s.et, pos, dir: [d[0] / l, d[1] / l, d[2] / l] });
    }
  }

  /**
   * voyagerSun: ボイジャーの太陽中心の位置、cameraSun: カメラの太陽中心の位置。
   * lines: 線全体の濃さ(0〜1。「星空だけを表示」の間は 0)、drop: 垂線と足もとの輪の濃さ(0〜1。出すかどうかは guide.ts の dropWanted)
   */
  update(ctx: FrameContext, voyagerSun: Vec3, cameraSun: Vec3, lines = 1, drop = 1): void {
    const offsetLen = Math.hypot(ctx.offset[0], ctx.offset[1], ctx.offset[2]);
    const fade = viewLineFade(offsetLen) * lines;
    const visible = fade > 0.001;
    this.group.visible = visible;
    if (!visible) return;
    const kmPerPxAt = (z: number): number => (2 * ctx.tanV * Math.max(z, 1)) / ctx.height;
    const { forward, right, up } = ctx.basis;
    const dotv = (v: Vec3, w: Vec3): number => v[0] * w[0] + v[1] * w[1] + v[2] * w[2];

    // ── 垂線と足もと ──
    const here: Vec3 = [-ctx.offset[0], -ctx.offset[1], -ctx.offset[2]];
    footOnEcliptic(voyagerSun, this.foots);
    const foot: Vec3 = [this.foots[0] - cameraSun[0], this.foots[1] - cameraSun[1], this.foots[2] - cameraSun[2]];
    const sHere = projectToScreen(here, ctx);
    const sFoot = projectToScreen(foot, ctx);
    let dropOn = false;
    if (drop > 0.001 && sHere && sFoot) {
      const px = Math.hypot(sHere.x - sFoot.x, sHere.y - sFoot.y);
      if (px >= MIN_DROP_PX) {
        dropOn = true;
        const n = Math.min(MAX_DASHES, Math.max(1, Math.floor(px / DASH_PERIOD_PX)));
        const arr = (this.drop.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < n; i++) {
          const u0 = i / n;
          const u1 = (i + DASH_ON) / n;
          const o = i * 6;
          for (let c = 0; c < 3; c++) {
            arr[o + c] = here[c] + (foot[c] - here[c]) * u0;
            arr[o + 3 + c] = here[c] + (foot[c] - here[c]) * u1;
          }
        }
        this.drop.geometry.attributes.position.needsUpdate = true;
        this.drop.geometry.setDrawRange(0, n * 2);
      }
    }
    this.drop.visible = dropOn;
    this.foot.visible = dropOn;
    (this.drop.material as THREE.LineBasicMaterial).opacity = DROP_OPACITY * fade * drop;
    (this.foot.material as THREE.LineBasicMaterial).opacity = FOOT_OPACITY * fade * drop;
    if (dropOn) {
      // 面の上の輪: 黄道面(z = 0)に置いた円。半径は足もとの奥行きで 6.5px にあたる長さ
      const r = FOOT_RING_PX * kmPerPxAt(dotv(foot, forward));
      const arr = (this.foot.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < FOOT_SEGMENTS; i++) {
        const th = (i / FOOT_SEGMENTS) * Math.PI * 2;
        arr[i * 3] = foot[0] + Math.cos(th) * r;
        arr[i * 3 + 1] = foot[1] + Math.sin(th) * r;
        arr[i * 3 + 2] = foot[2];
      }
      this.foot.geometry.attributes.position.needsUpdate = true;
      this.foot.geometry.setDrawRange(0, FOOT_SEGMENTS);
    }

    // ── 名場面の刻み(過ぎたものだけ) ──
    const arr = (this.ticks.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    let n = 0;
    for (const m of this.marks) {
      if (m.et > ctx.et) continue;
      const p: Vec3 = [m.pos[0] - cameraSun[0], m.pos[1] - cameraSun[1], m.pos[2] - cameraSun[2]];
      const z = dotv(p, forward);
      if (z <= 0) continue;
      // 画面の中で、軌跡の向きに直交する向き(右と上の成分から作る)
      const tx = dotv(m.dir, right);
      const ty = dotv(m.dir, up);
      const tl = Math.hypot(tx, ty);
      if (tl < 1e-6) continue; // 軌跡が真正面を向いている時は向きが決まらない
      const nx = -ty / tl;
      const ny = tx / tl;
      const half = (TICK_PX / 2) * kmPerPxAt(z);
      for (let c = 0; c < 3; c++) {
        const d = right[c] * nx + up[c] * ny;
        arr[n * 6 + c] = p[c] - d * half;
        arr[n * 6 + 3 + c] = p[c] + d * half;
      }
      n++;
    }
    this.ticks.geometry.attributes.position.needsUpdate = true;
    this.ticks.geometry.setDrawRange(0, n * 2);
    (this.ticks.material as THREE.LineBasicMaterial).opacity = TICK_OPACITY * fade;
    this.ticks.visible = n > 0;

    // ── 単独の出来事の点(過ぎたものだけ。名場面の刻みと同じ扱い) ──
    const ev = (this.eventDots.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    let k = 0;
    for (const e of this.events) {
      if (e.et > ctx.et) continue;
      ev[k * 3] = e.pos[0] - cameraSun[0];
      ev[k * 3 + 1] = e.pos[1] - cameraSun[1];
      ev[k * 3 + 2] = e.pos[2] - cameraSun[2];
      k++;
    }
    this.eventDots.geometry.attributes.position.needsUpdate = true;
    this.eventDots.geometry.setDrawRange(0, k);
    this.eventMaterial.size = EVENT_DOT_PX * ctx.pixelRatio;
    this.eventMaterial.opacity = EVENT_OPACITY * fade;
    this.eventDots.visible = k > 0;
  }

  dispose(): void {
    for (const o of [this.drop, this.foot, this.ticks, this.eventDots]) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
    this.eventTexture.dispose();
  }
}
