import type { SceneId } from '../../scenes';

/** 1 行は 6 秒ほどしか出ないので、50 字前後までにする。事実と出典は docs/events.md */
const sceneLines = {
  launch: '打ち上げから約1時間後の眺め。2号より16日遅れて出発したが、速い軌道で先に木星へ着いた',
  jupiter: '木星の中心から約35万kmまで近づいた時。木星の重力を使うスイングバイで、太陽に対する速さが上がった',
  saturn: '土星に最も近づいた時。スイングバイで進路が北へ曲がり、ほかの惑星には寄らない道に入った',
  pbd: '太陽から約60億kmの所で振り返り、地球を撮った日。写真の地球は1画素にも満たない点だった',
  heliopause: '太陽風が届く範囲（太陽圏）を抜け、人工物で初めて星と星の間の空間に出た',
  lightday: '地球から約259億km。人工物で初めて、地球から送った電波が届くまでに丸1日かかる距離になった',
} satisfies Record<SceneId, string>;

/** 名場面に着いた時に出す 1 行の文（名前は scenes.ts）。swingby は木星と土星の場面に添える速さ */
export const caption = {
  ...sceneLines,
  /** 位置のデータから計算した、太陽に対する速さ（km/s の数が入る） */
  swingby: (before: string, after: string) => `太陽に対する速さ スイングバイ前 ${before}km/s、後 ${after}km/s`,
};
