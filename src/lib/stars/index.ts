// 星のデータの読み込み(差し込み口)。担当B が中身を入れる。
import type { StarCatalog } from './types';

export * from './types';

/** url の星のデータを読み込む */
export async function loadStars(_url: string): Promise<StarCatalog> {
  throw new Error('loadStars: not implemented yet');
}

/** B−V の色指数 → 画面の色(各 0〜1 の [r, g, b]) */
export function bvToRgb(_bv: number): [number, number, number] {
  return [1, 1, 1];
}
