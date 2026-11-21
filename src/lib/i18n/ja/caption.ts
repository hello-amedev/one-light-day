import type { SceneId } from '../../scenes';

/** 名場面に着いた時に出す 1 行の文（名前は scenes.ts） */
export const caption = {
  launch: '地球を離れた直後。打ち上げから約1時間',
  jupiter: '木星に最も近づいた時。中心から約35万km',
  saturn: '土星に最も近づいた時。18時間前にタイタンのそばを通った',
  pbd: '太陽系を振り返り、地球を撮影した日',
  heliopause: '太陽の風が届く範囲を抜けた日',
  lightday: '地球からの距離が、光で1日かかる距離になった',
} satisfies Record<SceneId, string>;
