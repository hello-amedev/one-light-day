// 3D の計算で使う小さなベクトル演算。配列を作り直さないよう、out を渡せる形にしてある。
// 座標は黄道 J2000(x = 春分点、z = 黄道の北)で、three.js にもそのまま渡す。
import type { Vec3 } from '../lib/ephemeris/types';

export type { Vec3 };

export const DEG = Math.PI / 180;

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a: number, b: number, s: number): number => a + (b - a) * s;

export function sub(a: Vec3, b: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

export function add(a: Vec3, b: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

export function scale(a: Vec3, k: number, out: Vec3 = [0, 0, 0]): Vec3 {
  out[0] = a[0] * k;
  out[1] = a[1] * k;
  out[2] = a[2] * k;
  return out;
}

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function cross(a: Vec3, b: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export function normalize(a: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  const l = length(a);
  if (l === 0) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  return scale(a, 1 / l, out);
}

/** 2 つの向きのあいだの角度(ラジアン)。小さな角度でも精度が落ちない atan2 の形 */
export function angleBetween(a: Vec3, b: Vec3): number {
  const c = cross(a, b);
  return Math.atan2(length(c), dot(a, b));
}

/** 単位ベクトル a から b へ、球面上を s(0〜1)だけ進んだ向き。真逆の時も落ちない */
export function slerp(a: Vec3, b: Vec3, s: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const d = clamp(dot(a, b), -1, 1);
  if (d > 0.999999) {
    out[0] = lerp(a[0], b[0], s);
    out[1] = lerp(a[1], b[1], s);
    out[2] = lerp(a[2], b[2], s);
    return normalize(out, out);
  }
  if (d < -0.999999) {
    // 真逆: a に垂直な軸のまわりを半周する
    const axis: Vec3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const p = normalize(cross(a, axis));
    const th = Math.PI * s;
    out[0] = a[0] * Math.cos(th) + p[0] * Math.sin(th);
    out[1] = a[1] * Math.cos(th) + p[1] * Math.sin(th);
    out[2] = a[2] * Math.cos(th) + p[2] * Math.sin(th);
    return out;
  }
  const th = Math.acos(d);
  const sin = Math.sin(th);
  const wa = Math.sin((1 - s) * th) / sin;
  const wb = Math.sin(s * th) / sin;
  out[0] = a[0] * wa + b[0] * wb;
  out[1] = a[1] * wa + b[1] * wb;
  out[2] = a[2] * wa + b[2] * wb;
  return out;
}

/** 方位(x 軸から +y へ回る角)と仰角(+z が上)→ 単位ベクトル。ラジアン */
export function dirFromAzEl(az: number, el: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const c = Math.cos(el);
  out[0] = c * Math.cos(az);
  out[1] = c * Math.sin(az);
  out[2] = Math.sin(el);
  return out;
}

export function azElFromDir(d: Vec3): { az: number; el: number } {
  return { az: Math.atan2(d[1], d[0]), el: Math.asin(clamp(d[2] / (length(d) || 1), -1, 1)) };
}

/** 角度を -π〜π にそろえる */
export function wrapAngle(a: number): number {
  const t = Math.PI * 2;
  return a - t * Math.round(a / t);
}

/** 動きの加減速(始まりと終わりがゆるやか) */
export function easeInOut(u: number): number {
  const x = clamp(u, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
