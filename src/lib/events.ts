// 出来事の一覧(第6段階)。事実と出典は docs/events.md。文は辞書(t().events[id])に置き、ここは時刻と種類だけ。
//
// - scene が付いたものは「名場面に含める出来事」。時間軸の刻みは持たず、名場面の近くで再生がゆっくりになる間に文が順に出る
// - scene が null のものは「単独の刻み」。時間軸の小さな刻みと、引きの眺めの軌跡の上の小さな点になる

import { etFromIso } from './ephemeris/time';
import type { LookTarget, SceneId } from './scenes';

export type EventId =
  | 'earthMoonPhoto'
  | 'jupiterRing'
  | 'ioVolcano'
  | 'titanFlyby'
  | 'camerasOff'
  | 'mostDistant'
  | 'terminationShock'
  | 'thrusters'
  | 'memoryFix';

/** 日付をどの細かさで出すか。'month' は「2004年12月」のように月までしか分からない出来事 */
export type DatePrecision = 'minute' | 'day' | 'month';

export interface StoryEvent {
  id: EventId;
  /** 出来事の時刻(UTC)。月までしか分からないものは、データの欠けた間の中ほどに置いた代表の時刻 */
  utc: string;
  et: number;
  precision: DatePrecision;
  /** 期間のある出来事の終わり(UTC)。無ければ undefined */
  endUtc?: string;
  /** 含まれる名場面。null は単独の刻み */
  scene: SceneId | null;
  /** その出来事へ移った時に向く相手。無ければ向きを変えない */
  look?: LookTarget;
}

function ev(
  id: EventId,
  utc: string,
  precision: DatePrecision,
  scene: SceneId | null,
  extra: { look?: LookTarget; endUtc?: string } = {},
): StoryEvent {
  return { id, utc, et: etFromIso(utc), precision, scene, ...extra };
}

/** 時刻の順。日付の出どころは docs/events.md(タイタンの時刻は位置データの最接近) */
export const STORY_EVENTS: readonly StoryEvent[] = [
  ev('earthMoonPhoto', '1977-09-18T00:00:00Z', 'day', 'launch', { look: 'earth' }),
  ev('jupiterRing', '1979-03-04T12:00:00Z', 'day', 'jupiter', { look: 'jupiter' }),
  ev('ioVolcano', '1979-03-08T12:00:00Z', 'day', 'jupiter', { look: 'io' }),
  ev('titanFlyby', '1980-11-12T05:40:30Z', 'minute', 'saturn', { look: 'titan' }),
  ev('camerasOff', '1990-02-14T05:22:00Z', 'minute', 'pbd', { look: 'earth' }),
  ev('mostDistant', '1998-02-17T12:00:00Z', 'day', null),
  ev('terminationShock', '2004-12-16T00:00:00Z', 'month', null),
  ev('thrusters', '2017-11-28T12:00:00Z', 'day', null),
  ev('memoryFix', '2023-11-14T12:00:00Z', 'day', null, { endUtc: '2024-06-13T12:00:00Z' }),
];

/** 時間軸の小さな刻みと、引きの眺めの軌跡の上の点になる出来事 */
export const STANDALONE_EVENTS: readonly StoryEvent[] = STORY_EVENTS.filter((e) => e.scene === null);

/** 名場面に含める出来事(時刻の順) */
export function eventsOfScene(scene: SceneId): StoryEvent[] {
  return STORY_EVENTS.filter((e) => e.scene === scene);
}

export function findEvent(id: EventId): StoryEvent | undefined {
  return STORY_EVENTS.find((e) => e.id === id);
}

/**
 * 時刻が prevEt から nextEt へ進んだ(または戻った)間に通り過ぎた出来事を、通った順に返す。
 * 端は「prevEt を含まず nextEt を含む」。再生で文を順に出す時に使う
 */
export function eventsCrossed(prevEt: number, nextEt: number, list: readonly StoryEvent[] = STORY_EVENTS): StoryEvent[] {
  if (nextEt === prevEt) return [];
  if (nextEt > prevEt) return list.filter((e) => e.et > prevEt && e.et <= nextEt).sort((a, b) => a.et - b.et);
  return list.filter((e) => e.et < prevEt && e.et >= nextEt).sort((a, b) => b.et - a.et);
}
