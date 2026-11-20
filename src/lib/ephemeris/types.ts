// 位置データの取り決め。実装は index.ts(担当A)。この型は 3D の表示と画面の両方が使う。
//
// 座標: 黄道 J2000(x = 春分点の方向, z = 黄道の北)。単位は km と km/s。
// 時刻: et = TDB の秒数(J2000 = 2000-01-01 12:00:00 TDB を 0 とする)。倍精度。
//       UTC との変換は time.ts。画面に出す日付は必ず time.ts を通す。

import type { BodyId } from '../bodies';

export type Vec3 = [number, number, number];

export interface Coverage {
  t0: number;
  t1: number;
}

export interface Ephemeris {
  /** ボイジャー1号の位置がある範囲 */
  readonly t0: number;
  readonly t1: number;

  /**
   * center から見た body の位置(km)。out を渡すとそこへ書き込んで返す(毎フレーム呼ぶので配列を作らない)。
   * 惑星のそばを通る間は、惑星を中心にした細かいデータを自動で使う。
   * 範囲の外の et は、範囲の端に丸めて返す(例外を投げない)。
   */
  position(body: BodyId, center: BodyId, et: number, out?: Vec3): Vec3;

  /** center から見た body の速度(km/s) */
  velocity(body: BodyId, center: BodyId, et: number, out?: Vec3): Vec3;

  /** 2 つの天体の、その瞬間の直線距離(km) */
  distance(a: BodyId, b: BodyId, et: number): number;

  /** その天体の位置がある範囲。月のように一部の期間しか無い天体がある */
  coverage(body: BodyId): Coverage;

  /**
   * 軌跡の線を描くための点の並び(太陽を中心にした位置)。
   * [t, x, y, z, t, x, y, z, ...] の形で t の昇順。惑星のそばを通る前後は点が密になっている。
   */
  track(body: BodyId): Float64Array;
}

/** 光の速さ km/s */
export const C_KM_S = 299_792.458;

/** 1 天文単位 km */
export const AU_KM = 149_597_870.7;
