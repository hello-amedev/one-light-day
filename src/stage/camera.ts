// カメラの状態。カメラは常に原点にあり、「ボイジャーからのずれ(offset)」と「向き」と「視野」だけを持つ。
// ボイジャーの視界は offset = 0。引きの眺めは、太陽とボイジャーの中点を見下ろす位置へのずれ。
import type { Ephemeris } from '../lib/ephemeris';
import { AU_KM } from '../lib/ephemeris/types';
import type { LookTarget } from '../lib/scenes';
import type { ViewId } from '../lib/store';
import { FOV_BASE_DEG } from '../lib/zoom';
import { lookDirection } from './look';
import {
  DEG,
  add,
  azElFromDir,
  clamp,
  cross,
  dirFromAzEl,
  easeInOut,
  length,
  lerp,
  normalize,
  scale,
  slerp,
  smoothstep,
  wrapAngle,
  type Vec3,
} from './math';

/** 向きを動かす時間(秒) */
export const LOOK_SECONDS = 0.8;
/** 視点を切り替える時間(秒) */
export const VIEW_SECONDS = 1.6;

export const OVERVIEW_FOV = 45;
/** 引きの眺めの既定の向き */
const OVERVIEW_EL = 28 * DEG;
const OVERVIEW_AZ = 70 * DEG;
const OVERVIEW_EL_MIN = 5 * DEG;
const OVERVIEW_EL_MAX = 85 * DEG;
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 5;
/** 視点の切り替えで、ずれが 0 の端から始める(終える)時に使う最小の長さ(km) */
const OFFSET_FLOOR_KM = 1e4;
/** ボイジャーの視界で仰角を止める限度(真上・真下では上の向きが定まらない) */
const EL_LIMIT = 89 * DEG;

export interface CameraPose {
  /** ボイジャーからのカメラのずれ km(倍精度) */
  offset: Vec3;
  /** 向いている方向(単位ベクトル) */
  forward: Vec3;
  /** 画面の短い辺の視野(度) */
  fov: number;
}

/** 引きの眺めのカメラまでの距離 km。ボイジャーが遠ざかると自動で引く。zoom は利用者の拡大率 */
export function overviewDistance(voyagerFromSunKm: number, zoom: number): number {
  return Math.max(5 * AU_KM, voyagerFromSunKm * 1.6) * zoom;
}

/**
 * 引きの眺めのカメラ。注視点は太陽とボイジャーの中点。
 * az は「ボイジャーの方向(黄道面に落としたもの)」からの横回り(ラジアン)、el は黄道面からの仰角。
 */
export function overviewPose(
  voyagerFromSun: Vec3,
  az: number,
  el: number,
  zoom: number,
): CameraPose {
  const base = Math.atan2(voyagerFromSun[1], voyagerFromSun[0]);
  const dir = dirFromAzEl(base + az, el);
  const dist = overviewDistance(length(voyagerFromSun), zoom);
  // カメラの位置(太陽中心) = 中点 + 向き × 距離。ボイジャー中心にすると offset = カメラ − ボイジャー
  const offset = add(scale(voyagerFromSun, -0.5), scale(dir, dist));
  return { offset, forward: scale(dir, -1), fov: OVERVIEW_FOV };
}

/** 2 つの姿勢の間を s(0〜1)で移す。ずれの長さは対数で、向きは球面で、視野は線形で補間する */
export function blendPose(from: CameraPose, to: CameraPose, s: number): CameraPose {
  const l0 = length(from.offset);
  const l1 = length(to.offset);
  // ずれが 0 の端は、向きが無いのでもう一方の向きを借りる(両方 0 なら 0 のまま)
  const d1 = l1 > 0 ? scale(to.offset, 1 / l1) : null;
  const d0 = l0 > 0 ? scale(from.offset, 1 / l0) : null;
  let offset: Vec3 = [0, 0, 0];
  if (d0 || d1) {
    const dir = slerp(d0 ?? d1!, d1 ?? d0!, s);
    // 下限の長さは、0 でない側の長さの半分を超えない(本体の視点は数十 m のずれなので、1 万 km へ膨らませない)
    const nonzero = [l0, l1].filter((l) => l > 0);
    const floor = Math.min(OFFSET_FLOOR_KM, ...nonzero.map((l) => l * 0.5));
    const len = Math.exp(lerp(Math.log(Math.max(l0, floor)), Math.log(Math.max(l1, floor)), s));
    // 0 の端へ向かう/から出る時は、下限の長さから滑らかに 0 へつなぐ
    let k = 1;
    if (l0 === 0) k *= smoothstep(0, 0.2, s);
    if (l1 === 0) k *= 1 - smoothstep(0.8, 1, s);
    offset = scale(dir, len * k);
  }
  return { offset, forward: slerp(from.forward, to.forward, s), fov: lerp(from.fov, to.fov, s) };
}

/** 画面の向き(右・上・前)。上は常に +z */
export interface Basis {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

export function basisFromForward(forward: Vec3): Basis {
  const f = normalize(forward);
  const right = normalize(cross(f, [0, 0, 1]));
  const up = cross(right, f);
  return { right, up, forward: f };
}

/** 短い辺の視野(度)から、縦の視野(度)。縦長の画面では縦のほうが長い辺になる */
export function verticalFovDeg(fovShortDeg: number, aspect: number): number {
  if (aspect >= 1) return fovShortDeg;
  return (2 * Math.atan(Math.tan((fovShortDeg * DEG) / 2) / aspect)) / DEG;
}

/** カメラの状態を持ち、毎フレームの姿勢を作る */
export class CameraRig {
  private eph: Ephemeris;
  /** ボイジャーの視界の向き(単位ベクトル) */
  private dir: Vec3 = [1, 0, 0];
  /** 追っている相手。利用者がドラッグするまで追い続ける */
  private follow: LookTarget | null = 'sun';
  private lookAnim: { startDir: Vec3; startMs: number } | null = null;

  private ovAz = OVERVIEW_AZ;
  private ovEl = OVERVIEW_EL;
  private ovZoom = 1;

  private trans: { from: CameraPose; startMs: number; seconds: number } | null = null;
  private lastPose: CameraPose | null = null;

  constructor(eph: Ephemeris) {
    this.eph = eph;
  }

  /** 動きの途中か(途中の間は毎フレーム描き直す) */
  get animating(): boolean {
    return this.lookAnim !== null || this.trans !== null;
  }

  /** 視点を切り替えている途中か(縮尺の物差しは、切り替えが終わるまで出さない) */
  get transitioning(): boolean {
    return this.trans !== null;
  }

  get followTarget(): LookTarget | null {
    return this.follow;
  }

  /** 最初の向き(動かさず、すぐ合わせる) */
  initLook(target: LookTarget | null, et: number): void {
    const t = target ?? 'sun';
    this.follow = t;
    this.lookAnim = null;
    lookDirection(t, this.eph, et, this.dir);
  }

  /** 「向く」が押された。animate なら約 0.8 秒で向きを動かす。視野(倍率)は変えない(第6段階で自動の望遠をやめた) */
  look(target: LookTarget, et: number, nowMs: number, animate: boolean): void {
    this.follow = target;
    if (animate) {
      this.lookAnim = { startDir: [...this.dir], startMs: nowMs };
    } else {
      this.lookAnim = null;
      lookDirection(target, this.eph, et, this.dir);
    }
  }

  /** 視点を切り替える。いまの姿勢から約 1.6 秒で、移った先の姿勢へ */
  switchView(animate: boolean): void {
    if (animate && this.lastPose) {
      this.trans = { from: this.lastPose, startMs: -1, seconds: VIEW_SECONDS };
    } else {
      this.trans = null;
    }
  }

  /** ボイジャーの視界でドラッグした。1px あたり 視野 ÷ 短い辺 の角度だけ見回す。fovDeg はいまの短い辺の視野 */
  dragVoyager(dx: number, dy: number, shortSidePx: number, fovDeg: number): void {
    // 見回し始めたら、追う動きは止める
    this.follow = null;
    this.lookAnim = null;
    const k = (fovDeg * DEG) / shortSidePx;
    const { az, el } = azElFromDir(this.dir);
    // 星が指に付いてくる向き: 右へ引くと、見ている方向は左(方位は増える)、下へ引くと上を向く
    dirFromAzEl(az + dx * k, clamp(el + dy * k, -EL_LIMIT, EL_LIMIT), this.dir);
  }

  /** 引きの眺めでドラッグした。方位と仰角を回す */
  dragOverview(dx: number, dy: number): void {
    this.ovAz = wrapAngle(this.ovAz - dx * 0.4 * DEG);
    this.ovEl = clamp(this.ovEl + dy * 0.4 * DEG, OVERVIEW_EL_MIN, OVERVIEW_EL_MAX);
  }

  /** 引きの眺めのホイールとピンチ。factor が 1 より大きいと遠ざかる。ボイジャーの視界と本体の視点の拡大は状態(store.zoomBy)が持つ */
  zoomOverview(factor: number): void {
    this.ovZoom = clamp(this.ovZoom * factor, ZOOM_MIN, ZOOM_MAX);
  }

  /**
   * 今のフレームの姿勢。voyagerFromSun はボイジャーの太陽中心の位置。
   * voyagerFov はボイジャーの視界の短い辺の視野(倍率から。src/lib/zoom.ts)、craftPose は本体の視点の姿勢(本体の視点の時だけ)
   */
  update(
    nowMs: number,
    view: ViewId,
    et: number,
    voyagerFromSun: Vec3,
    voyagerFov: number = FOV_BASE_DEG,
    craftPose: CameraPose | null = null,
  ): CameraPose {
    this.updateVoyager(nowMs, et);
    let target: CameraPose;
    if (view === 'craft' && craftPose) target = craftPose;
    else if (view === 'overview') target = overviewPose(voyagerFromSun, this.ovAz, this.ovEl, this.ovZoom);
    else target = { offset: [0, 0, 0], forward: [...this.dir], fov: voyagerFov };

    let pose = target;
    if (this.trans) {
      if (this.trans.startMs < 0) this.trans.startMs = nowMs;
      const u = (nowMs - this.trans.startMs) / (this.trans.seconds * 1000);
      if (u >= 1) this.trans = null;
      else pose = blendPose(this.trans.from, target, easeInOut(u));
    }
    this.lastPose = pose;
    return pose;
  }

  private updateVoyager(nowMs: number, et: number): void {
    if (!this.follow) return;
    // 追う相手の向きは毎回引き直す(再生中に相手が画面から逃げない)。向ける途中は始点と今の向きの間を進む
    const goal = lookDirection(this.follow, this.eph, et);
    if (this.lookAnim) {
      const u = (nowMs - this.lookAnim.startMs) / (LOOK_SECONDS * 1000);
      if (u >= 1) {
        this.lookAnim = null;
        this.dir = goal;
      } else {
        slerp(this.lookAnim.startDir, goal, easeInOut(u), this.dir);
      }
    } else {
      this.dir = goal;
    }
  }
}
