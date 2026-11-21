import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { SCENES } from '../../src/lib/scenes';
import { footOnEcliptic, passedSceneCount } from '../../src/stage/guide';

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
