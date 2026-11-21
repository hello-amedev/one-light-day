// 名場面・出来事の文を、いつ・どの順に出すかの決まり(画面に依存しない純粋な関数)。
// 時刻は呼ぶ側が渡すミリ秒(Date.now() など)。
import { SCENES, type SceneId } from '../lib/scenes';
import { eventsCrossed, STORY_EVENTS, type EventId } from '../lib/events';

export type CaptionRef = { kind: 'scene'; id: SceneId } | { kind: 'event'; id: EventId };

/** 次の文が待っている時、いまの文を出し続ける最低の時間(ms)。早回しで一瞬で過ぎないように */
export const MIN_SHOW_MS = 4000;
/** 待っている文が無い時、文を出し続ける時間(ms) */
export const HOLD_MS = 6000;
/**
 * 待たせておく文の数の上限。超えたら古い出来事から飛ばす(出来事が無ければ古い名場面から)。
 * 早回しで名場面を何個も通り過ぎても、遅れて何十秒も前の文が出続けないようにする
 */
export const MAX_PENDING = 2;

export interface CaptionState {
  current: CaptionRef | null;
  /** current を出し始めた時刻(ms) */
  since: number;
  pending: readonly CaptionRef[];
}

export const EMPTY_CAPTION: CaptionState = { current: null, since: 0, pending: [] };

export const sameRef = (a: CaptionRef, b: CaptionRef): boolean => a.kind === b.kind && a.id === b.id;

/** 移った先の文を、いま出ているものに代えてすぐ出す(待っていた文は捨てる) */
export function showNow(ref: CaptionRef, now: number): CaptionState {
  return { current: ref, since: now, pending: [] };
}

function trim(list: readonly CaptionRef[]): CaptionRef[] {
  const out = [...list];
  while (out.length > MAX_PENDING) {
    const i = out.findIndex((r) => r.kind === 'event');
    out.splice(i === -1 ? 0 : i, 1);
  }
  return out;
}

/** 再生で通り過ぎた文を足す。何も出ていなければ先頭をすぐ出し、残りは待たせる */
export function enqueue(state: CaptionState, refs: readonly CaptionRef[], now: number): CaptionState {
  let s = state;
  for (const ref of refs) {
    if (s.current && sameRef(s.current, ref)) continue;
    if (s.pending.some((p) => sameRef(p, ref))) continue;
    s = s.current ? { ...s, pending: trim([...s.pending, ref]) } : { current: ref, since: now, pending: [] };
  }
  return s;
}

/** 時間が過ぎた分だけ進める。待っている文があり最低の時間を過ぎていれば次へ、無ければ出し続ける時間を過ぎたら消す */
export function advance(state: CaptionState, now: number): CaptionState {
  if (!state.current) return state;
  const age = now - state.since;
  if (state.pending.length > 0) {
    if (age < MIN_SHOW_MS) return state;
    const [next, ...rest] = state.pending;
    return { current: next, since: now, pending: rest };
  }
  return age >= HOLD_MS ? EMPTY_CAPTION : state;
}

/** advance を次に呼ぶべき時刻(ms)。何も出ていなければ null */
export function nextDeadline(state: CaptionState): number | null {
  if (!state.current) return null;
  return state.since + (state.pending.length > 0 ? MIN_SHOW_MS : HOLD_MS);
}

/**
 * 時刻が prevEt から nextEt へ進む間に通り過ぎた名場面・出来事を、時刻の順に返す。
 * 戻る方向は返さない(つまみを戻しても文は出さない)。includeEvents が false なら名場面だけ(開いた直後の自動再生)
 */
export function captionsCrossed(prevEt: number, nextEt: number, includeEvents: boolean): CaptionRef[] {
  if (!(nextEt > prevEt)) return [];
  const found: { et: number; ref: CaptionRef }[] = [];
  for (const s of SCENES) {
    if (s.et > prevEt && s.et <= nextEt) found.push({ et: s.et, ref: { kind: 'scene', id: s.id } });
  }
  if (includeEvents) {
    for (const e of eventsCrossed(prevEt, nextEt, STORY_EVENTS)) found.push({ et: e.et, ref: { kind: 'event', id: e.id } });
  }
  return found.sort((a, b) => a.et - b.et).map((f) => f.ref);
}

/** 文を出してよい状態か。自動再生が今日で止まった後(intro が 'done')も、1光日の文を出すので止めない */
export function captionsAllowed(s: { display: { captions: boolean }; starsOnly: boolean }): boolean {
  return s.display.captions && !s.starsOnly;
}

export type CaptionAction = 'show' | 'hide' | 'none';

/** 状態の変わりから、文への働きかけを決める。移った(arrivalSeq が増えた) → show、操作で時刻・向きが変わった → hide */
export function actionFor(
  prev: { et: number; playing: boolean; lookSeq: number; arrivalSeq: number },
  next: { et: number; playing: boolean; lookSeq: number; arrivalSeq: number },
): CaptionAction {
  if (next.arrivalSeq !== prev.arrivalSeq) return 'show';
  // 再生で時刻が進んでも消さない(右端に着いて止まる最後の 1 歩も再生のうち)。
  // 再生していない時に時刻が動いた(つまみ・送りダイヤル)、再生中に戻された、別の相手を向いた時は消す
  if (next.et !== prev.et && !(prev.playing && next.et > prev.et)) return 'hide';
  if (next.lookSeq !== prev.lookSeq) return 'hide';
  return 'none';
}
