// 数字の桁を回して切り替えるかどうかの判断(画面に依存しない純粋な関数)。
// 回すのは、ゆっくり変わる時だけ。速く変わる時に回すと読めず、ちらつく。

/** 前に変わってからこれより短い間隔で変わった時は、速く変わっているとみなして回さない(ミリ秒) */
export const ROLL_MIN_INTERVAL_MS = 500;
/** 1 回に変わる文字がこれより多い時は、大きく飛んだとみなして回さない(名場面への移動など) */
export const ROLL_MAX_CHANGED = 4;

/** 回す対象の文字(数字だけ。単位や区切りは回さない) */
export function isRollable(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** 前の文字列と次の文字列で、違う文字の位置。長さが違う時(桁が増減した時)は null */
export function changedPositions(prev: string, next: string): number[] | null {
  if (prev.length !== next.length) return null;
  const out: number[] = [];
  for (let i = 0; i < next.length; i++) if (prev[i] !== next[i]) out.push(i);
  return out;
}

export interface RollPlan {
  /** 回す文字の位置(空なら回さず、すぐ切り替える) */
  positions: number[];
}

/**
 * 値が変わった時に、どの桁を回すか。
 * @param intervalMs 前に値が変わってからの時間(ミリ秒)
 * @param reducedMotion 動きを減らす設定か
 */
export function planRoll(prev: string, next: string, intervalMs: number, reducedMotion: boolean): RollPlan {
  const none: RollPlan = { positions: [] };
  if (reducedMotion || intervalMs < ROLL_MIN_INTERVAL_MS) return none;
  const changed = changedPositions(prev, next);
  if (!changed || changed.length === 0 || changed.length > ROLL_MAX_CHANGED) return none;
  // 単位や区切りまで変わる時(「万km」から「億km」など)は、桁の送りではないので回さない
  if (!changed.every((i) => isRollable(prev[i]) && isRollable(next[i]))) return none;
  return { positions: changed };
}
