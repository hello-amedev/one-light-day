// 天体の画像を、高い解像度(hi)と軽い解像度(lo)のどちらで読むかの決まり。純粋な関数。

export interface TextureChoiceInput {
  /** 画面(端末の画面)の短い辺(CSS px) */
  screenShortPx: number;
  pixelRatio: number;
  /** ポインタが粗い(指で操作する端末)か */
  coarsePointer: boolean;
  /** GPU が扱える画像の一辺の最大(px) */
  maxTextureSize: number;
  /** hi の画像の大きさ(px) */
  hiWidth: number;
  hiHeight: number;
}

/** 画面の短い辺 × 画素比がこれ未満なら lo */
export const HI_MIN_SCREEN_PX = 1000;

export function chooseVariant(i: TextureChoiceInput): 'hi' | 'lo' {
  if (i.screenShortPx * i.pixelRatio < HI_MIN_SCREEN_PX) return 'lo';
  if (i.coarsePointer) return 'lo';
  if (Math.max(i.hiWidth, i.hiHeight) > i.maxTextureSize) return 'lo';
  return 'hi';
}
