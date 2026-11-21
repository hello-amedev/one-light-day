import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { SCENES } from '../../src/lib/scenes';
import {
  DROP_AFTER_DRAG_MS,
  SATURN_DROP_AFTER_S,
  SATURN_DROP_BEFORE_S,
  dropWanted,
  footOnEcliptic,
  inSaturnDropWindow,
  passedSceneCount,
} from '../../src/stage/guide';

describe('垂線の足もと', () => {
  it('ボイジャーの位置から、黄道面(z = 0)の上の点を作る', () => {
    expect(footOnEcliptic([1.5e9, -2e9, 7e9])).toEqual([1.5e9, -2e9, 0]);
    expect(footOnEcliptic([1, 2, -3])).toEqual([1, 2, 0]);
  });
  it('面の下にいても、足もとは z = 0', () => {
    expect(footOnEcliptic([4, 5, -6])[2]).toBe(0);
  });
  it('渡した配列には書き込まない(out を渡した時だけ書く)', () => {
    const pos: [number, number, number] = [1, 2, 3];
    footOnEcliptic(pos);
    expect(pos).toEqual([1, 2, 3]);
    const out: [number, number, number] = [9, 9, 9];
    expect(footOnEcliptic(pos, out)).toBe(out);
    expect(out).toEqual([1, 2, 0]);
  });
});

describe('名場面の刻み', () => {
  it('過ぎた名場面だけ数える', () => {
    expect(passedSceneCount(etFromIso('1977-09-05T00:00:00Z'))).toBe(0);
    expect(passedSceneCount(etFromIso('1977-12-01T00:00:00Z'))).toBe(1);
    expect(passedSceneCount(etFromIso('1981-01-01T00:00:00Z'))).toBe(3);
    expect(passedSceneCount(etFromIso('1990-02-14T04:48:00Z'))).toBe(4);
    expect(passedSceneCount(etFromIso('2026-11-01T00:00:00Z'))).toBe(5);
    expect(passedSceneCount(etFromIso('2026-11-19T00:00:00Z'))).toBe(6);
  });
  it('名場面の時刻ちょうどは過ぎたとみなし、その直前はまだ', () => {
    for (const s of SCENES) {
      expect(passedSceneCount(s.et - 1)).toBe(SCENES.filter((o) => o.et < s.et).length);
      expect(passedSceneCount(s.et)).toBe(SCENES.filter((o) => o.et <= s.et).length);
    }
  });
});

describe('垂線を出す時', () => {
  const saturn = SCENES.find((s) => s.id === 'saturn')!;
  const ordinary = etFromIso('2010-01-01T00:00:00Z');

  it('普段は出さない', () => {
    expect(dropWanted(ordinary, null)).toBe(false);
    expect(dropWanted(etFromIso('1977-12-01T00:00:00Z'), null)).toBe(false);
    expect(dropWanted(etFromIso('2026-11-18T00:00:00Z'), null)).toBe(false);
  });
  it('引きの眺めを回している間と、回し終えてから 3 秒は出す', () => {
    expect(dropWanted(ordinary, 0)).toBe(true);
    expect(dropWanted(ordinary, DROP_AFTER_DRAG_MS)).toBe(true);
    expect(dropWanted(ordinary, DROP_AFTER_DRAG_MS + 1)).toBe(false);
    expect(DROP_AFTER_DRAG_MS).toBe(3000);
  });
  it('土星の場面の 30 日前から 90 日後までは、回していなくても出す', () => {
    expect(SATURN_DROP_BEFORE_S).toBe(30 * 86400);
    expect(SATURN_DROP_AFTER_S).toBe(90 * 86400);
    expect(inSaturnDropWindow(saturn.et)).toBe(true);
    expect(inSaturnDropWindow(saturn.et - 29 * 86400)).toBe(true);
    expect(inSaturnDropWindow(saturn.et + 89 * 86400)).toBe(true);
    expect(inSaturnDropWindow(saturn.et - 31 * 86400)).toBe(false);
    expect(inSaturnDropWindow(saturn.et + 91 * 86400)).toBe(false);
    expect(dropWanted(saturn.et, null)).toBe(true);
  });
  it('木星の場面など、ほかの名場面の前後では出さない', () => {
    for (const s of SCENES) {
      if (s.id === 'saturn') continue;
      expect(dropWanted(s.et, null)).toBe(false);
    }
  });
});
