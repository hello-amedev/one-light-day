// 天体の自転の向き(極)と自転の角度。国際天文学連合(IAU)の回転要素から、
// 「天体に固定した座標(経度 0 度の向き・東・北極)」を「黄道 J2000」へ移す 3x3 の行列を作る。
// 画面にも WebGL にも依存しない純粋な関数。
//
// 天体固定の座標: x = 経度 0 度の向き、y = 東経 90 度の向き、z = 北極(自転軸)。右手系で、東経は x から y へ増える。
import type { BodyId } from '../lib/bodies';
import { DEG, type Vec3 } from './math';

/** 黄道傾斜角(J2000、度) */
export const OBLIQUITY_DEG = 23.4392911;
/** J2000 の瞬間(et = 0)からの 1 日の秒数 */
const DAY_S = 86400;

export interface RotationElements {
  /** 極の赤経・赤緯(赤道座標 J2000、度) */
  ra0: number;
  dec0: number;
  /** 自転の角度 W = w0 + rate × d(d は J2000 からの日数)。度、度/日 */
  w0: number;
  rate: number;
}

/** 自転の要素。IAU の報告による値(周期項は入れていない) */
export const ROTATION: Partial<Record<BodyId, RotationElements>> = {
  earth: { ra0: 0, dec0: 90, w0: 190.147, rate: 360.9856235 },
  moon: { ra0: 269.9949, dec0: 66.5392, w0: 38.3213, rate: 13.17635815 },
  jupiter: { ra0: 268.056595, dec0: 64.495303, w0: 284.95, rate: 870.536 },
  io: { ra0: 268.05, dec0: 64.5, w0: 200.39, rate: 203.4889538 },
  europa: { ra0: 268.08, dec0: 64.51, w0: 36.022, rate: 101.3747235 },
  ganymede: { ra0: 268.2, dec0: 64.57, w0: 44.064, rate: 50.3176081 },
  callisto: { ra0: 268.72, dec0: 64.83, w0: 259.51, rate: 21.5710715 },
  saturn: { ra0: 40.589, dec0: 83.537, w0: 38.9, rate: 810.7939024 },
  titan: { ra0: 39.4827, dec0: 83.4279, w0: 186.5855, rate: 22.5769768 },
};

/** 扁平率(極方向に縮む割合)。木星 0.0649、土星 0.0980 */
export const FLATTENING: Partial<Record<BodyId, number>> = { jupiter: 0.0649, saturn: 0.098 };

/** 赤道半径 km。BODY_RADIUS_KM(平均半径)は球としての大きさ。扁平な天体は赤道半径で描く */
export const EQUATORIAL_RADIUS_KM: Partial<Record<BodyId, number>> = { jupiter: 71_492, saturn: 60_268 };

/** 3x3 の行列。行優先で 9 個(m[行 * 3 + 列]) */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

function mul(a: Mat3, b: Mat3, out: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): Mat3 {
  const r: number[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
    }
  }
  for (let k = 0; k < 9; k++) out[k] = r[k];
  return out;
}

const rotX = (deg: number): Mat3 => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
const rotZ = (deg: number): Mat3 => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};

/** 赤道座標 → 黄道座標(x 軸のまわりに黄道傾斜角だけ回す) */
const EQUATOR_TO_ECLIPTIC: Mat3 = (() => {
  const c = Math.cos(OBLIQUITY_DEG * DEG);
  const s = Math.sin(OBLIQUITY_DEG * DEG);
  return [1, 0, 0, 0, c, s, 0, -s, c];
})();

/**
 * W = 0 の時の、天体固定の座標 → 黄道の行列。
 * 赤道座標では、天体の赤道が赤道面と交わる点(赤経 α0 + 90 度)から経度を測り、極を δ0 まで傾ける。
 */
export function poleMatrix(el: RotationElements): Mat3 {
  const m = mul(rotZ(el.ra0 + 90), rotX(90 - el.dec0));
  return mul(EQUATOR_TO_ECLIPTIC, m, m);
}

/** その時刻の自転の角度 W(度、0〜360 にそろえない) */
export function rotationAngleDeg(el: RotationElements, et: number): number {
  return el.w0 + (el.rate * et) / DAY_S;
}

/**
 * 天体固定の座標 → 黄道 J2000 の行列(列が、天体の x・y・z 軸の黄道での向き)。
 * 天体の自転軸のまわりに W だけ回してから、極の向きへ移す。
 */
export function bodyToEcliptic(el: RotationElements, et: number, out: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0]): Mat3 {
  const m0 = poleMatrix(el);
  const w = rotationAngleDeg(el, et) * DEG;
  const c = Math.cos(w);
  const s = Math.sin(w);
  // 右から Rz(W) を掛ける: 新しい x 列 = c·x列 + s·y列、新しい y 列 = −s·x列 + c·y列、z 列はそのまま
  for (let i = 0; i < 3; i++) {
    const x = m0[i * 3];
    const y = m0[i * 3 + 1];
    out[i * 3] = c * x + s * y;
    out[i * 3 + 1] = -s * x + c * y;
    out[i * 3 + 2] = m0[i * 3 + 2];
  }
  return out;
}

/** 自転軸(北極)の黄道での向き(単位ベクトル) */
export function poleDirection(el: RotationElements, out: Vec3 = [0, 0, 0]): Vec3 {
  const m = poleMatrix(el);
  out[0] = m[2];
  out[1] = m[5];
  out[2] = m[8];
  return out;
}

/** 黄道のベクトル v を、天体固定の座標へ(行列の転置を掛ける) */
export function toBodyFrame(m: Mat3, v: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  const x = m[0] * v[0] + m[3] * v[1] + m[6] * v[2];
  const y = m[1] * v[0] + m[4] * v[1] + m[7] * v[2];
  const z = m[2] * v[0] + m[5] * v[1] + m[8] * v[2];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/** 黄道の向き v が天体の表面で指す点の、経度(東経、度、-180〜180)と緯度(度) */
export function surfacePoint(m: Mat3, v: Vec3): { lon: number; lat: number } {
  const b = toBodyFrame(m, v);
  return { lon: Math.atan2(b[1], b[0]) / DEG, lat: Math.atan2(b[2], Math.hypot(b[0], b[1])) / DEG };
}
