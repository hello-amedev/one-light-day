import type { BodyId } from '../../bodies';

/** 天体の名前。ID は src/lib/bodies.ts */
export const bodies = {
  sun: '太陽',
  mercury: '水星',
  venus: '金星',
  earth: '地球',
  moon: '月',
  mars: '火星',
  jupiter: '木星',
  saturn: '土星',
  uranus: '天王星',
  neptune: '海王星',
  voyager1: 'ボイジャー1号',
} satisfies Record<BodyId, string>;
