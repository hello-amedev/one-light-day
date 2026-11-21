import type { EventId } from '../../events';

/**
 * 出来事の文(第6段階)。事実と出典は docs/events.md。時刻と種類は src/lib/events.ts。
 * 名場面に含める出来事は、名場面の近くで再生がゆっくりになる間に順に出る。単独の刻みは時間軸の小さな刻みになる
 */
export const events = {
  /** 出来事の名前(時間軸の刻みの吹き出し・読み上げ、文の見出し) */
  names: {} as Record<EventId, string>,
};
