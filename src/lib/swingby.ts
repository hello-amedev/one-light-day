// スイングバイの前後の、太陽に対する速さ(km/s)。位置データの速度から計算する(資料の値は二次情報しか無いため)。
import type { Ephemeris } from './ephemeris';
import type { SceneId } from './scenes';
import { SCENES } from './scenes';

/** 通過の前後、何日離れた時刻の速さを「前」「後」とするか。惑星の重力の効きがほぼ消える日数 */
export const SWINGBY_OFFSET_DAYS = 30;

export interface SwingbySpeeds {
  /** 通過前の速さ(km/s) */
  before: number;
  /** 通過後の速さ(km/s) */
  after: number;
}

/** et の時刻の、ボイジャーの太陽に対する速さ(km/s) */
export function heliocentricSpeed(eph: Ephemeris, et: number): number {
  const v = eph.velocity('voyager1', 'sun', et);
  return Math.hypot(v[0], v[1], v[2]);
}

/** スイングバイの場面(木星・土星)の前後の速さ。それ以外の場面は null */
export function swingbySpeeds(eph: Ephemeris, scene: SceneId): SwingbySpeeds | null {
  if (scene !== 'jupiter' && scene !== 'saturn') return null;
  const s = SCENES.find((x) => x.id === scene)!;
  const d = SWINGBY_OFFSET_DAYS * 86400;
  return { before: heliocentricSpeed(eph, s.et - d), after: heliocentricSpeed(eph, s.et + d) };
}
