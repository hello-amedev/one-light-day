import type { SceneId } from '../../scenes';

/** 名場面の名前。ID は src/lib/scenes.ts */
export const scenes = {
  launch: '打ち上げ',
  jupiter: '木星の近くを通過',
  saturn: '土星の近くを通過',
  pbd: 'ペイル・ブルー・ドット',
  heliopause: '太陽圏の外へ',
  lightday: '地球から1光日',
} satisfies Record<SceneId, string>;
