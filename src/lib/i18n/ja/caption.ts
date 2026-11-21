import type { SceneId } from '../../scenes';

const sceneLines = {
  launch: '地球を離れた直後。打ち上げから約1時間',
  jupiter: '木星に最も近づいた時。中心から約35万km',
  saturn: '土星に最も近づいた時。重力で進路が北へ曲がった',
  pbd: '太陽系を振り返り、地球を撮影した日',
  heliopause: '太陽の風が届く範囲を抜けた日',
  lightday: '地球からの距離が、光で1日かかる距離になった',
} satisfies Record<SceneId, string>;

/** 名場面に着いた時に出す 1 行の文（名前は scenes.ts）。swingby は木星と土星の場面に添える速さ */
export const caption = {
  ...sceneLines,
  /** 位置のデータから計算した、太陽に対する速さ（km/s の数が入る） */
  swingby: (before: string, after: string) => `太陽に対する速さ 通過前 ${before}km/s、通過後 ${after}km/s`,
};
