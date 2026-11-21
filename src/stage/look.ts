// 「向く」を押した時の向きの決まり。画面にも 3D にも依存しない純粋な関数。
import type { Ephemeris } from '../lib/ephemeris';
import type { LookTarget } from '../lib/scenes';
import { normalize, DEG, type Vec3 } from './math';

/** ボイジャーから見た、向く相手の方向(単位ベクトル)。'ahead' は進む先(速度の向き) */
export function lookDirection(target: LookTarget, eph: Ephemeris, et: number, out: Vec3 = [0, 0, 0]): Vec3 {
  if (target === 'ahead' || target === 'voyager1') {
    return normalize(eph.velocity('voyager1', 'sun', et), out);
  }
  return normalize(eph.position(target, 'voyager1', et), out);
}

/** 視野 fovShortDeg(短い辺)の画面で、角度 angleRad だけ離れた 2 点の画面上の間隔(px) */
export function angleToPixels(angleRad: number, fovShortDeg: number, shortSidePx: number): number {
  return (Math.tan(angleRad) / Math.tan((fovShortDeg * DEG) / 2)) * (shortSidePx / 2);
}
