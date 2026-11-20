// 線: 8 惑星の軌道(楕円)と、ボイジャーの軌跡。
// 線は実際の距離のまま描き、奥行きの判定は使わない。頂点は毎フレーム、倍精度でカメラ相対に直してから float32 に渡す
// (軌跡は約 3,000 点、軌道は 8 × 361 点で、毎回作り直しても軽い)。
import * as THREE from 'three';
import { PLANET_IDS } from '../lib/bodies';
import type { Ephemeris } from '../lib/ephemeris';
import type { FrameContext } from './frame';
import type { Vec3 } from './math';
import { orbitFromState, orbitLoop } from './orbit';
import type { Theme } from './theme';

const ORBIT_SEGMENTS = 360;
/** 軌道の要素を求め直す間隔(秒)。惑星どうしの引き合いで要素はゆっくり動くので、30 日ごとで線は惑星を外れない */
const ORBIT_REFRESH_S = 30 * 86400;

const ORBIT_OPACITY = 0.42;
/** 操作しない間の軌道の線の濃さ(通常に対する割合) */
const ORBIT_DIM = 0.25;
const TRACK_PAST_OPACITY = 0.9;
const TRACK_FUTURE_OPACITY = 0.28;

function makeLine(points: number, color: string, opacity: number, order: number): THREE.Line {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points * 3), 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.renderOrder = order;
  return line;
}

function disposeLine(line: THREE.Line): void {
  line.geometry.dispose();
  (line.material as THREE.Material).dispose();
}

/** 軌道の線 8 本 */
export class OrbitLines {
  readonly group = new THREE.Group();
  private lines: THREE.Line[] = [];
  private loops: Float64Array[] = [];
  private loopEt = -Infinity;
  private eph: Ephemeris;
  private p: Vec3 = [0, 0, 0];
  private v: Vec3 = [0, 0, 0];

  constructor(eph: Ephemeris, theme: Theme) {
    this.eph = eph;
    for (let i = 0; i < PLANET_IDS.length; i++) {
      const line = makeLine(ORBIT_SEGMENTS + 1, theme.gold, ORBIT_OPACITY, 1);
      this.lines.push(line);
      this.group.add(line);
    }
  }

  /** chrome: 0(薄い)〜 1(通常) */
  update(ctx: FrameContext, cameraSun: Vec3, chrome: number): void {
    if (Math.abs(ctx.et - this.loopEt) > ORBIT_REFRESH_S) {
      this.loopEt = ctx.et;
      PLANET_IDS.forEach((id, i) => {
        this.eph.position(id, 'sun', ctx.et, this.p);
        this.eph.velocity(id, 'sun', ctx.et, this.v);
        this.loops[i] = orbitLoop(orbitFromState(this.p, this.v), ORBIT_SEGMENTS);
      });
    }
    const opacity = ORBIT_OPACITY * (ORBIT_DIM + (1 - ORBIT_DIM) * chrome);
    this.lines.forEach((line, i) => {
      const src = this.loops[i];
      const dst = (line.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      for (let k = 0; k < src.length; k += 3) {
        dst[k] = src[k] - cameraSun[0];
        dst[k + 1] = src[k + 1] - cameraSun[1];
        dst[k + 2] = src[k + 2] - cameraSun[2];
      }
      line.geometry.attributes.position.needsUpdate = true;
      line.geometry.setDrawRange(0, src.length / 3);
      (line.material as THREE.LineBasicMaterial).opacity = opacity;
    });
  }

  dispose(): void {
    this.lines.forEach(disposeLine);
  }
}

/** ボイジャーの軌跡。いまの時刻までを金の線、その先を控えめな線にする */
export class TrackLines {
  readonly group = new THREE.Group();
  private past: THREE.Line;
  private future: THREE.Line;
  private track: Float64Array;
  private count: number;
  private lastIndex = 0;

  constructor(eph: Ephemeris, theme: Theme) {
    this.track = eph.track('voyager1');
    this.count = this.track.length / 4;
    // 先頭からの線と、いまの位置からの線で、それぞれ「全点 + 現在位置」の分だけ持つ
    this.past = makeLine(this.count + 1, theme.gold, TRACK_PAST_OPACITY, 2);
    this.future = makeLine(this.count + 1, theme.gold, TRACK_FUTURE_OPACITY, 2);
    this.group.add(this.past, this.future);
  }

  /** et より前の最後の点の番号(なければ -1) */
  private indexBefore(et: number): number {
    const t = this.track;
    let i = this.lastIndex;
    // 時刻が連続して動く時は前回の近くにある
    if (i < this.count && t[i * 4] <= et && (i + 1 >= this.count || t[(i + 1) * 4] > et)) return i;
    let lo = -1;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (t[mid * 4] <= et) lo = mid;
      else hi = mid - 1;
    }
    i = lo;
    if (i >= 0) this.lastIndex = i;
    return i;
  }

  /**
   * cameraSun: カメラの太陽中心の位置(= ボイジャーの位置 + offset)。
   * いまの時刻の端は、ボイジャーの現在位置(カメラ相対で −offset)にぴったり合わせる。
   */
  update(ctx: FrameContext, cameraSun: Vec3): void {
    const t = this.track;
    const k = this.indexBefore(ctx.et);
    const here: Vec3 = [-ctx.offset[0], -ctx.offset[1], -ctx.offset[2]];

    const pastArr = (this.past.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    let n = 0;
    for (let i = 0; i <= k; i++) {
      pastArr[n++] = t[i * 4 + 1] - cameraSun[0];
      pastArr[n++] = t[i * 4 + 2] - cameraSun[1];
      pastArr[n++] = t[i * 4 + 3] - cameraSun[2];
    }
    pastArr[n++] = here[0];
    pastArr[n++] = here[1];
    pastArr[n++] = here[2];
    this.past.geometry.attributes.position.needsUpdate = true;
    this.past.geometry.setDrawRange(0, n / 3);

    const futArr = (this.future.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    let m = 0;
    futArr[m++] = here[0];
    futArr[m++] = here[1];
    futArr[m++] = here[2];
    for (let i = k + 1; i < this.count; i++) {
      futArr[m++] = t[i * 4 + 1] - cameraSun[0];
      futArr[m++] = t[i * 4 + 2] - cameraSun[1];
      futArr[m++] = t[i * 4 + 3] - cameraSun[2];
    }
    this.future.geometry.attributes.position.needsUpdate = true;
    this.future.geometry.setDrawRange(0, m / 3);
  }

  dispose(): void {
    disposeLine(this.past);
    disposeLine(this.future);
  }
}
