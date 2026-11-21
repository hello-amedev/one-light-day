import type { SceneId } from '../../scenes';

/** 1 行は 6 秒ほどしか出ないので、50 字前後までにする。事実と出典は docs/events.md */
const sceneLines = {
  launch: '地球を離れて約1時間。2号より16日遅れて出発したが、速い軌道で先に木星へ着いた',
  jupiter: '木星の中心から約35万kmまで近づいた時。木星の重力を使うスイングバイを実施',
  saturn: '土星に最接近。スイングバイによる進路変更で、黄道面（惑星の軌道が並ぶ面）を離れ、土星が最後に訪れた惑星になった',
  pbd: '太陽から約60億kmの所で振り返り、地球を撮った日。写真の地球は1画素にも満たない点だった',
  heliopause: '太陽風が届く範囲（太陽圏）を抜け、人工物で初めて星間空間に出た',
  lightday: '地球から約259億km。光の速さで丸1日かかる距離に、人工物として初めて達した。交信は片道1日、往復で2日かかる',
} satisfies Record<SceneId, string>;

/** 名場面に着いた時に出す 1 行の文（名前は scenes.ts）。swingby は木星と土星の場面に添える速さ */
export const caption = {
  ...sceneLines,
  /** 位置のデータから計算した、太陽に対する速さ（km/s の数が入る）。文には「太陽に対する」を書かない（2026-11-22 あめさんの指定） */
  swingby: (before: string, after: string) => `スイングバイ前 ${before}km/s、後 ${after}km/s`,
};
