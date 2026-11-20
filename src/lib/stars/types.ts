// 星のデータの取り決め。実装は index.ts(担当B)。

/** 1 つの星あたりの数値の個数: [x, y, z, 等級, B−V の色指数] */
export const STAR_STRIDE = 5;

export interface StarCatalog {
  /** 星の数 */
  count: number;
  /**
   * [x, y, z, mag, bv] × count。明るい順(等級の小さい順)に並ぶので、先頭から n 個だけ描けば明るい n 個になる。
   * x, y, z は黄道 J2000 の単位ベクトル(位置データと同じ座標)。
   */
  data: Float32Array;
}
