import { describe, expect, it } from 'vitest';
import { eventsOfScene, STORY_EVENTS, type EventId } from '../../src/lib/events';
import { t } from '../../src/lib/i18n';
import { SCENES, type SceneId } from '../../src/lib/scenes';
import {
  actionFor,
  advance,
  captionsAllowed,
  captionsCrossed,
  EMPTY_CAPTION,
  enqueue,
  HOLD_MS,
  MAX_PENDING,
  MIN_SHOW_MS,
  nextDeadline,
  showNow,
  type CaptionRef,
} from '../../src/ui/captionQueue';

const sc = (id: string) => SCENES.find((s) => s.id === id)!;
const S = (id: SceneId): CaptionRef => ({ kind: 'scene', id });
const E = (id: EventId): CaptionRef => ({ kind: 'event', id });

describe('通り過ぎた文', () => {
  it('木星の前後を通ると、環・木星・イオの順に出る', () => {
    const jup = sc('jupiter').et;
    const refs = captionsCrossed(jup - 10 * 86400, jup + 10 * 86400, true);
    expect(refs).toEqual([E('jupiterRing'), S('jupiter'), E('ioVolcano')]);
  });
  it('土星はタイタンが先、土星が後', () => {
    const sat = sc('saturn').et;
    expect(captionsCrossed(sat - 86400, sat + 3600, true)).toEqual([E('titanFlyby'), S('saturn')]);
  });
  it('自動再生の間は名場面だけ', () => {
    const jup = sc('jupiter').et;
    expect(captionsCrossed(jup - 10 * 86400, jup + 10 * 86400, false)).toEqual([S('jupiter')]);
  });
  it('単独の出来事も通り過ぎると出る。戻る向きと動かない時は出ない', () => {
    const e = STORY_EVENTS.find((x) => x.id === 'mostDistant')!;
    expect(captionsCrossed(e.et - 100, e.et + 100, true)).toEqual([E('mostDistant')]);
    expect(captionsCrossed(e.et + 100, e.et - 100, true)).toEqual([]);
    expect(captionsCrossed(e.et, e.et, true)).toEqual([]);
  });
  it('端は「前を含まず、後を含む」ので、同じ時刻を二度は数えない', () => {
    const jup = sc('jupiter').et;
    expect(captionsCrossed(jup - 1, jup, false)).toEqual([S('jupiter')]);
    expect(captionsCrossed(jup, jup + 1, false)).toEqual([]);
  });
  it('名場面に含める出来事は、含まれる名場面の近くにある', () => {
    for (const s of SCENES) for (const e of eventsOfScene(s.id)) expect(Math.abs(e.et - s.et)).toBeLessThan(15 * 86400);
  });
});

describe('出す順番と時間', () => {
  it('何も出ていなければすぐ出す。待つ文があれば最低 4 秒は出し続ける', () => {
    let s = enqueue(EMPTY_CAPTION, [E('jupiterRing'), S('jupiter')], 1000);
    expect(s.current).toEqual(E('jupiterRing'));
    expect(s.pending).toEqual([S('jupiter')]);
    expect(nextDeadline(s)).toBe(1000 + MIN_SHOW_MS);
    expect(advance(s, 1000 + MIN_SHOW_MS - 1)).toBe(s);
    s = advance(s, 1000 + MIN_SHOW_MS);
    expect(s.current).toEqual(S('jupiter'));
    expect(s.since).toBe(1000 + MIN_SHOW_MS);
    expect(s.pending).toEqual([]);
  });
  it('最後の文は 6 秒で消える', () => {
    const s = showNow(S('pbd'), 0);
    expect(nextDeadline(s)).toBe(HOLD_MS);
    expect(advance(s, HOLD_MS - 1)).toBe(s);
    expect(advance(s, HOLD_MS)).toEqual(EMPTY_CAPTION);
  });
  it('同じ文は重ねない', () => {
    const s = enqueue(showNow(S('pbd'), 0), [S('pbd'), E('camerasOff'), E('camerasOff')], 10);
    expect(s.pending).toEqual([E('camerasOff')]);
  });
  it('たまったら古い出来事から飛ばし、名場面は残す', () => {
    let s = showNow(S('launch'), 0);
    s = enqueue(s, [E('earthMoonPhoto'), S('jupiter'), E('jupiterRing'), E('ioVolcano')], 100);
    expect(s.pending.length).toBe(MAX_PENDING);
    expect(s.pending).toContainEqual(S('jupiter'));
    expect(s.pending).toContainEqual(E('ioVolcano'));
  });
  it('出来事が無ければ古い名場面から飛ばす', () => {
    let s = showNow(S('launch'), 0);
    s = enqueue(s, [S('jupiter'), S('saturn'), S('pbd')], 100);
    expect(s.pending).toEqual([S('saturn'), S('pbd')]);
  });
  it('移った先の文は、出ているものと待っているものに代わってすぐ出る', () => {
    expect(showNow(E('thrusters'), 5)).toEqual({ current: E('thrusters'), since: 5, pending: [] });
  });
});

describe('出す・消す条件', () => {
  const base = { display: { captions: true }, starsOnly: false, intro: 'off' };
  it('表示の切り替えが切れている・星空だけ・自動再生が済んだ案内の間は出さない', () => {
    expect(captionsAllowed(base)).toBe(true);
    expect(captionsAllowed({ ...base, display: { captions: false } })).toBe(false);
    expect(captionsAllowed({ ...base, starsOnly: true })).toBe(false);
    expect(captionsAllowed({ ...base, intro: 'done' })).toBe(false);
    expect(captionsAllowed({ ...base, intro: 'run' })).toBe(true);
  });
  const st = (o: Partial<{ et: number; playing: boolean; lookSeq: number; arrivalSeq: number }> = {}) => ({
    et: 100,
    playing: false,
    lookSeq: 1,
    arrivalSeq: 1,
    ...o,
  });
  it('移った時は出す', () => {
    expect(actionFor(st(), st({ et: 500, arrivalSeq: 2, lookSeq: 2 }))).toBe('show');
    expect(actionFor(st({ playing: true }), st({ et: 500, arrivalSeq: 2 }))).toBe('show');
  });
  it('再生で時刻が進んでも消さない。再生を始めた・止めただけでも消さない', () => {
    expect(actionFor(st({ playing: true }), st({ playing: true, et: 200 }))).toBe('none');
    expect(actionFor(st({ playing: true }), st({ playing: false, et: 200 }))).toBe('none');
    expect(actionFor(st(), st({ playing: true }))).toBe('none');
    expect(actionFor(st({ playing: true }), st({ playing: false }))).toBe('none');
  });
  it('つまみ・送りで時刻が動いた時、向きを変えた時は消す', () => {
    expect(actionFor(st(), st({ et: 200 }))).toBe('hide');
    expect(actionFor(st({ playing: true }), st({ playing: true, et: 50 }))).toBe('hide');
    expect(actionFor(st(), st({ lookSeq: 2 }))).toBe('hide');
  });
});

describe('出来事の文', () => {
  it('9 件すべてに名前と 1 行がある', () => {
    for (const e of STORY_EVENTS) {
      expect(t().events.names[e.id]).toBeTruthy();
      expect(t().events.lines[e.id]).toBeTruthy();
    }
  });
  it('資料の「注意」に反する書き方をしない', () => {
    const all = Object.values(t().events.lines).join('\n') + Object.values(t().events.names).join('\n');
    expect(all).not.toMatch(/1\s*枚/); // 地球と月は「1 枚に収めた」と書かない
    expect(all).not.toContain('03:22');
    // タイタンの日付は米国の時刻では 11 日になる。日付を書くなら UTC を添える
    const titan = t().events.lines.titanFlyby;
    if (/\d+\s*日/.test(titan.replace(/\d+時間/g, ''))) expect(titan).toContain('UTC');
    expect(t().events.lines.titanFlyby).not.toMatch(/6,?490/);
    expect(t().events.lines.ioVolcano).toMatch(/撮影.*発見/);
  });
});
