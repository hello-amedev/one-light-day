// 名場面・出来事の文と一緒に浮かばせる写真の決まり(画面に依存しない純粋な関数)。
// 写真のある文は 2 つ: 出来事「地球と月を一緒に撮影」(1977)と、名場面「ペイル・ブルー・ドット」(1990)。
import type { CaptionRef } from './captionQueue';

export type CaptionPhotoId = 'earthMoon' | 'pbd';

export interface CaptionPhoto {
  id: CaptionPhotoId;
  /** public/textures/ の下のファイル名 */
  file: string;
  width: number;
  height: number;
}

const PHOTOS: Record<CaptionPhotoId, CaptionPhoto> = {
  // PIA00013。配布されている版そのまま(565×790 画素)。docs/assets/textures.md
  earthMoon: { id: 'earthMoon', file: 'earthmoon.jpg', width: 565, height: 790 },
  // 写真の窓と同じファイル
  pbd: { id: 'pbd', file: 'pbd.jpg', width: 1600, height: 1583 },
};

/** その文に添える写真。無ければ null */
export function captionPhotoOf(ref: CaptionRef | null): CaptionPhoto | null {
  if (!ref) return null;
  if (ref.kind === 'event' && ref.id === 'earthMoonPhoto') return PHOTOS.earthMoon;
  if (ref.kind === 'scene' && ref.id === 'pbd') return PHOTOS.pbd;
  return null;
}

/** 広げて見せる写真(PhotoViewer に渡す形)。src は読み込む URL、alt と credit は辞書の文 */
export interface ViewerPhoto {
  src: string;
  alt: string;
  credit: string;
  width: number;
  height: number;
}
