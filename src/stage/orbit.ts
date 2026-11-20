// 軌道の線。位置と速度(ある瞬間の状態)から楕円の軌道の要素を求めて、1 周ぶんの点を作る。
// 海王星は 1 周が 165 年でデータの期間(49 年)より長いので、位置をなぞって線にする方法は使えない。
import { cross, dot, length, normalize, scale, type Vec3 } from './math';

/** 太陽の重力定数 GM(km³/s²) */
export const GM_SUN = 1.32712440018e11;

export interface OrbitElements {
  /** 軌道長半径 km */
  a: number;
  e: number;
  /** 半直弦 a(1−e²) km */
  p: number;
  /** 近日点の向き(単位ベクトル) */
  P: Vec3;
  /** 軌道面の中で P から 90 度進んだ向き(単位ベクトル) */
  Q: Vec3;
}

/** 太陽から見た位置 r(km)と速度 v(km/s)から、軌道の要素を求める */
export function orbitFromState(r: Vec3, v: Vec3, mu: number = GM_SUN): OrbitElements {
  const h = cross(r, v);
  const rLen = length(r);
  const vxh = cross(v, h);
  const ecc: Vec3 = [vxh[0] / mu - r[0] / rLen, vxh[1] / mu - r[1] / rLen, vxh[2] / mu - r[2] / rLen];
  // 離心率が 1 に近づくと楕円でなくなる。惑星では起きないが、線が壊れないよう上限を置く
  const e = Math.min(length(ecc), 0.995);
  const p = dot(h, h) / mu;
  const a = p / (1 - e * e);
  const hHat = normalize(h);
  // ほぼ円の時は近日点の向きが定まらないので、いまの位置の向きを P にする
  const P = length(ecc) < 1e-9 ? normalize(r) : normalize(ecc);
  const Q = cross(hHat, P);
  return { a, e, p, P, Q };
}

/** 離心近点角 E の点(太陽を原点にした位置 km)を out に書く */
export function orbitPoint(el: OrbitElements, E: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const x = el.a * (Math.cos(E) - el.e);
  const y = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  out[0] = el.P[0] * x + el.Q[0] * y;
  out[1] = el.P[1] * x + el.Q[1] * y;
  out[2] = el.P[2] * x + el.Q[2] * y;
  return out;
}

/** 1 周ぶんの点(segments + 1 個。最後は最初と同じ点)を、太陽を原点にして返す */
export function orbitLoop(el: OrbitElements, segments: number): Float64Array {
  const out = new Float64Array((segments + 1) * 3);
  const tmp: Vec3 = [0, 0, 0];
  for (let i = 0; i <= segments; i++) {
    const E = (i % segments) * ((Math.PI * 2) / segments);
    orbitPoint(el, E, tmp);
    out[i * 3] = tmp[0];
    out[i * 3 + 1] = tmp[1];
    out[i * 3 + 2] = tmp[2];
  }
  return out;
}

/** 位置 r が、楕円からどれだけ離れているか(km)。同じ向きの楕円上の点との距離で測る */
export function distanceFromOrbit(el: OrbitElements, r: Vec3): number {
  const nu = Math.atan2(dot(r, el.Q), dot(r, el.P));
  const rho = el.p / (1 + el.e * Math.cos(nu));
  const rLen = length(r);
  const onOrbit = scale(r, rho / rLen);
  return Math.hypot(r[0] - onOrbit[0], r[1] - onOrbit[1], r[2] - onOrbit[2]);
}
