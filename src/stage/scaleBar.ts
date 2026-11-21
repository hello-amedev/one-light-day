// 縮尺の物差しの長さを決める(純粋な関数)。DOM の部品は scaleBarView.ts。

/** 物差しの画面上の長さ(px)の範囲 */
export const SCALE_BAR_MIN_PX = 80;
export const SCALE_BAR_MAX_PX = 200;

export interface ScaleBar {
  /** 物差しが表す長さ(km)。1・2・5 × 10 の何乗か */
  km: number;
  /** 画面上の長さ(px) */
  px: number;
}

/**
 * 画面の 1px が何 km にあたるか(kmPerPx)から、切りのよい長さを選ぶ。
 * 1・2・5 の並びは隣との比が 2 か 2.5 なので、200px 以下で最大のものは必ず 80px 以上になる。
 * kmPerPx が 0 以下・有限でない時は null(物差しを出さない)。
 */
export function pickScaleBar(kmPerPx: number): ScaleBar | null {
  if (!(kmPerPx > 0) || !Number.isFinite(kmPerPx)) return null;
  const maxKm = kmPerPx * SCALE_BAR_MAX_PX;
  const exp = Math.floor(Math.log10(maxKm));
  let best = 0;
  // 桁の境目の丸め誤差に備え、1 つ上の桁からも探す
  for (let e = exp + 1; e >= exp - 1; e--) {
    for (const m of [5, 2, 1]) {
      const km = m * 10 ** e;
      if (km <= maxKm && km > best) best = km;
    }
  }
  return { km: best, px: best / kmPerPx };
}
