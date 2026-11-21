// 名場面の短い文を出す条件(画面に依存しない純粋な関数)。
import { SCENES, type SceneId } from '../lib/scenes';

export interface JumpState {
  et: number;
  lookSeq: number;
}

/**
 * 名場面へ移った時だけ、その名場面の ID を返す。
 * 移った = 「向く」の通し番号が増え、時刻が変わり、新しい時刻がちょうど名場面の時刻。
 * 再生や時間軸のつまみで時刻が通り過ぎた時(通し番号は変わらない)や、向くボタンだけを押した時(時刻が変わらない)は null。
 */
export function sceneJumpedTo(prev: JumpState, next: JumpState): SceneId | null {
  if (next.lookSeq === prev.lookSeq || next.et === prev.et) return null;
  return SCENES.find((s) => s.et === next.et)?.id ?? null;
}
