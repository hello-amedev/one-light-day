// 「向く」を押した時の、向きと視野の決まり。画面にも 3D にも依存しない純粋な関数。
import { BODY_RADIUS_KM } from '../lib/bodies';
import type { Ephemeris } from '../lib/ephemeris';
import type { LookTarget } from '../lib/scenes';
import { angleBetween, clamp, normalize, DEG, type Vec3 } from './math';

/** 視野(画面の短い辺の視野。度)の限度 */
export const FOV_MIN = 2;
export const FOV_MAX = 75;
export const FOV_DEFAULT = 60;

/** 見かけの直径がこれ以上(度)なら「近い」。直径に合わせて視野を決める */
const NEAR_DIAMETER_DEG = 0.2;

/** ボイジャーから見た、向く相手の方向(単位ベクトル)。'ahead' は進む先(速度の向き) */
export function lookDirection(target: LookTarget, eph: Ephemeris, et: number, out: Vec3 = [0, 0, 0]): Vec3 {
  if (target === 'ahead' || target === 'voyager1') {
    return normalize(eph.velocity('voyager1', 'sun', et), out);
  }
  return normalize(eph.position(target, 'voyager1', et), out);
}

/** 向いた時の視野(度)。近いものは大きさに合わせ、点にしか見えないものは太陽との離れ具合に合わせる */
export function lookFov(target: LookTarget, eph: Ephemeris, et: number): number {
  if (target === 'sun') return 40;
  if (target === 'ahead' || target === 'voyager1') return FOV_DEFAULT;

  const d = eph.distance(target, 'voyager1', et);
  const r = BODY_RADIUS_KM[target];
  // 球の見かけの直径(中にいる時は 180 度として扱う)
  const diameterDeg = (2 * Math.asin(Math.min(1, r / d))) / DEG;
  if (diameterDeg >= NEAR_DIAMETER_DEG) return clamp(diameterDeg * 2.5, 2, 60);

  // 遠くて点にしか見えない: 太陽が同じ画面に入るよう、太陽との離角の 8 倍
  const toBody = eph.position(target, 'voyager1', et);
  const toSun = eph.position('sun', 'voyager1', et);
  const separationDeg = angleBetween(toBody, toSun) / DEG;
  return clamp(separationDeg * 8, 2, 40);
}

/** 視野 fovShortDeg(短い辺)の画面で、角度 angleRad だけ離れた 2 点の画面上の間隔(px) */
export function angleToPixels(angleRad: number, fovShortDeg: number, shortSidePx: number): number {
  return (Math.tan(angleRad) / Math.tan((fovShortDeg * DEG) / 2)) * (shortSidePx / 2);
}
