// 写真の窓の決まり(画面に依存しない純粋な関数)。開く条件と、置く場所。
import type { LookTarget } from '../lib/scenes';
import { SCENES } from '../lib/scenes';
import type { ViewId } from '../lib/store';

const PBD = SCENES.find((s) => s.id === 'pbd')!;
/** 名場面の前後、この秒数の中で窓を出す(1 日) */
export const PHOTO_WINDOW_SPAN_S = 86400;

/** 写真の窓を出せる状態か。ボイジャーの視界で、名場面の前後 1 日以内に、地球を向いている時 */
export function photoWindowAvailable(s: { view: ViewId; et: number; lookTarget: LookTarget | null }): boolean {
  return s.view === 'voyager' && s.lookTarget === 'earth' && Math.abs(s.et - PBD.et) <= PHOTO_WINDOW_SPAN_S;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placement extends Rect {
  /** 窓のどの辺から地球の目印へ線を引くか */
  edge: 'left' | 'right' | 'top' | 'bottom';
}

export interface PlaceInput {
  viewport: { width: number; height: number };
  /** スマホの縦画面か */
  portrait: boolean;
  /** 窓の大きさ(高さは測った値) */
  size: { w: number; h: number };
  /** 操作の部品が使う、上と下の高さ(題字・日付と、操作の部品)と、左右の余白 */
  reserve: { top: number; bottom: number; side: number };
  /** 地球の目印。画面に無ければ null */
  earth: { x: number; y: number } | null;
}

function distanceToRect(p: { x: number; y: number }, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/**
 * 窓を置く場所。候補(PC・横画面は右と左、縦画面は上と下)のうち、地球の目印から遠いほう。
 * 同じくらいなら先に挙げたほう(PC は右、縦画面は上)。
 */
export function placePhotoWindow(input: PlaceInput): Placement {
  const { viewport, portrait, size, reserve, earth } = input;
  const bandTop = reserve.top;
  const bandBottom = viewport.height - reserve.bottom;
  const midY = Math.max(bandTop, (bandTop + bandBottom) / 2 - size.h / 2);
  const cands: Placement[] = portrait
    ? [
        { x: viewport.width - reserve.side - size.w, y: bandTop, w: size.w, h: size.h, edge: 'bottom' },
        { x: viewport.width - reserve.side - size.w, y: bandBottom - size.h, w: size.w, h: size.h, edge: 'top' },
      ]
    : [
        { x: viewport.width - reserve.side - size.w, y: midY, w: size.w, h: size.h, edge: 'left' },
        { x: reserve.side, y: midY, w: size.w, h: size.h, edge: 'right' },
      ];
  if (!earth) return cands[0];
  const margin = 56;
  if (distanceToRect(earth, cands[0]) >= margin) return cands[0];
  return distanceToRect(earth, cands[1]) > distanceToRect(earth, cands[0]) ? cands[1] : cands[0];
}

/** 窓の辺の真ん中(地球の目印からの線の終点) */
export function edgeMidpoint(r: Placement): { x: number; y: number } {
  switch (r.edge) {
    case 'left':
      return { x: r.x, y: r.y + r.h / 2 };
    case 'right':
      return { x: r.x + r.w, y: r.y + r.h / 2 };
    case 'top':
      return { x: r.x + r.w / 2, y: r.y };
    default:
      return { x: r.x + r.w / 2, y: r.y + r.h };
  }
}
