import { describe, expect, it } from 'vitest';
import { etFromIso, etFromUtcMs, utcMsFromEt } from '../../src/lib/ephemeris';

/** TDB − UTC(秒) */
const tdbMinusUtc = (iso: string) => etFromIso(iso) - (Date.parse(iso) - Date.UTC(2000, 0, 1, 12)) / 1000;

describe('時刻の変換', () => {
  it('TDB − UTC が年ごとの値になる', () => {
    expect(tdbMinusUtc('1977-09-05T12:00:00Z')).toBeCloseTo(48.184, 6);
    expect(tdbMinusUtc('1990-02-14T04:48:00Z')).toBeCloseTo(57.184, 6);
    expect(tdbMinusUtc('2026-11-20T00:00:00Z')).toBeCloseTo(69.184, 6);
  });

  it('J2000 は et=0', () => {
    // 2000-01-01T11:58:55.816Z(TT で正午)が et=0
    expect(etFromUtcMs(Date.UTC(2000, 0, 1, 11, 58, 55, 816))).toBeCloseTo(0, 3);
  });

  it('往復して同じミリ秒に戻る', () => {
    const samples = [
      Date.UTC(1977, 8, 5, 14),
      Date.UTC(1979, 2, 5, 12, 4, 17, 123),
      Date.UTC(1990, 1, 14, 4, 48),
      Date.UTC(2016, 11, 31, 23, 59, 59, 500),
      Date.UTC(2017, 0, 1),
      Date.UTC(2026, 10, 20, 8, 1, 2, 3),
      Date.UTC(2060, 11, 30),
    ];
    for (const x of samples) expect(utcMsFromEt(etFromUtcMs(x))).toBe(x);
  });
});
