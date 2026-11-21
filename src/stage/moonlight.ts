// 地球の夜の側を照らす月明かり(画面に依存しない純粋な関数)。
// 向きは、その時刻の地球から月への向き。強さは月の満ち欠けで変わる(満月を 1 とした割合)。
import type { Vec3 } from './math';

const DEG = 180 / Math.PI;

/**
 * 月の明るさの、満月に対する割合。位相角(月から見た太陽と地球の間の角度、度)から求める。
 * 月の等級の位相の式(Allen の近似: 0.026α + 4×10⁻⁹α⁴ 等)を明るさの比に直したもの。半月(90 度)で約 0.09
 */
export function moonPhaseFactor(phaseAngleDeg: number): number {
  const a = Math.min(180, Math.max(0, Math.abs(phaseAngleDeg)));
  if (a >= 179.9) return 0;
  return 10 ** (-0.4 * (0.026 * a + 4e-9 * a ** 4));
}

/**
 * 地球から月・太陽への位置(km、同じ座標)から、月明かりの向き(単位ベクトル)と満ち欠けの割合を返す。
 * 向きは地球から月への向き(地球の大きさに比べて月は遠いので、地球のどの点からも同じ向きとみなす)
 */
export function moonlight(earthToMoon: Vec3, earthToSun: Vec3, outDir: Vec3): number {
  const [mx, my, mz] = earthToMoon;
  const ml = Math.hypot(mx, my, mz);
  if (!(ml > 0)) return 0;
  outDir[0] = mx / ml;
  outDir[1] = my / ml;
  outDir[2] = mz / ml;
  // 月から太陽へと、月から地球へ
  const sx = earthToSun[0] - mx;
  const sy = earthToSun[1] - my;
  const sz = earthToSun[2] - mz;
  const sl = Math.hypot(sx, sy, sz);
  if (!(sl > 0)) return 0;
  const cos = (sx * -mx + sy * -my + sz * -mz) / (sl * ml);
  return moonPhaseFactor(Math.acos(Math.min(1, Math.max(-1, cos))) * DEG);
}
