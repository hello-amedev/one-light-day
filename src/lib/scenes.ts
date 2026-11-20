// 名場面の一覧。時間軸の刻み、「前の名場面」「次の名場面」、早回しの自動減速がこれを使う。
// 名前や説明の文はここに置かず、辞書(src/lib/i18n)から id で引く。

import { etFromIso } from './ephemeris/time';
import type { BodyId } from './bodies';

export type SceneId = 'launch' | 'jupiter' | 'saturn' | 'pbd' | 'heliopause' | 'lightday';

/** 向く相手。'ahead' はボイジャーが進む先 */
export type LookTarget = BodyId | 'ahead';

export interface Scene {
  id: SceneId;
  /** 場面の時刻(UTC) */
  utc: string;
  et: number;
  /** 場面に着いた時に向く相手 */
  look: LookTarget;
  /** 早回しがこの場面の近くで落とす速さの下限(現実の 1 秒あたりに進む秒数) */
  slowRate: number;
  /** 場面の前後、この秒数の範囲で減速する */
  slowWindow: number;
}

const HOUR = 3600;
const DAY = 86400;

function scene(id: SceneId, utc: string, look: LookTarget, slowRate: number, slowWindow: number): Scene {
  return { id, utc, et: etFromIso(utc), look, slowRate, slowWindow };
}

// 時刻は NASA JPL Horizons のデータで確かめた値(木星・土星は最接近、1光日は地球からの直線距離が 1 光日になる瞬間)
export const SCENES: readonly Scene[] = [
  scene('launch', '1977-09-05T14:05:00Z', 'earth', 0.5 * HOUR, 2 * DAY),
  scene('jupiter', '1979-03-05T12:04:00Z', 'jupiter', 1 * HOUR, 10 * DAY),
  scene('saturn', '1980-11-12T23:45:00Z', 'saturn', 1 * HOUR, 10 * DAY),
  scene('pbd', '1990-02-14T04:48:00Z', 'earth', 5 * DAY, 120 * DAY),
  scene('heliopause', '2012-08-25T00:00:00Z', 'ahead', 5 * DAY, 120 * DAY),
  scene('lightday', '2026-11-18T10:16:07Z', 'sun', 1 * DAY, 60 * DAY),
];
