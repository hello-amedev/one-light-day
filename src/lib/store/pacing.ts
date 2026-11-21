// ふだんの再生で、名場面の近くだけ速さを落とす配分(画面に依存しない純粋な関数)。
// 近づく時だけ滑らかに落とし、通り過ぎた後は短い時間で元の速さへ戻す。
// 名場面のちょうどの時刻から再生を始めた時に、場面を抜けるまで何十秒も遅いままにならないようにするため。
import type { Scene } from '../scenes';

/** この速さ(1 秒＝1 日)以下は、もともと遅いので何も変えない */
export const NO_SLOWDOWN_AT_OR_BELOW = 86400;

/** 名場面へ近づく減速に使う、現実の秒数(選んだ速さから下限まで落ちて、場面に着くまで) */
export const APPROACH_SECONDS = 2.5;
/** 通り過ぎた後、元の速さへ戻るまでの現実の秒数 */
export const RECOVER_SECONDS = 1.8;

/**
 * 距離(場面までの時刻の差。秒)を「距離 ÷ 時定数」で速さの上限にすると、距離が指数で縮み、
 * 選んだ速さから下限まで落ちるのに時定数 × ln(選んだ速さ ÷ 下限) かかる。
 * 下限が選んだ速さよりずっと低い場面(打ち上げ)でも所要時間が伸びないよう、時定数は対数で割って決める。
 */
function timeConstant(totalSeconds: number, chosen: number, slowRate: number): number {
  return totalSeconds / (Math.log(chosen / slowRate) + 1);
}

/**
 * いまの時刻での、現実の 1 秒あたりに進む秒数。
 * 次の名場面へ近づく間は「距離 ÷ 時定数」まで、通り過ぎた直後は「通り過ぎた距離 ÷ 時定数」までに抑え、下限は場面の slowRate。
 */
export function pacedRate(et: number, chosen: number, scenes: readonly Scene[]): number {
  if (chosen <= NO_SLOWDOWN_AT_OR_BELOW) return chosen;
  let cap = chosen;
  let next: Scene | undefined;
  let prev: Scene | undefined;
  for (const s of scenes) {
    if (s.et > et) {
      if (!next || s.et < next.et) next = s;
    } else if (!prev || s.et > prev.et) {
      prev = s;
    }
  }
  if (next && chosen > next.slowRate) {
    const tau = timeConstant(APPROACH_SECONDS, chosen, next.slowRate);
    cap = Math.min(cap, Math.max(next.slowRate, (next.et - et) / tau));
  }
  if (prev && chosen > prev.slowRate) {
    const tau = timeConstant(RECOVER_SECONDS, chosen, prev.slowRate);
    cap = Math.min(cap, Math.max(prev.slowRate, (et - prev.et) / tau));
  }
  return cap;
}
