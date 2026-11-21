import { describe, expect, it } from 'vitest';
import { dateInputToEt, parseDateInput } from '../../src/lib/dateInput';
import { etFromIso, utcMsFromEt } from '../../src/lib/ephemeris/time';

describe('parseDateInput', () => {
  it('いろいろな区切りと全角を読む', () => {
    const want = { y: 1990, m: 2, d: 14 };
    for (const s of ['1990.02.14', '1990.2.14', '1990/2/14', '1990-02-14', '1990 2 14', '1990年2月14日', '19900214', '１９９０．０２．１４', ' 1990.02.14 ']) {
      expect(parseDateInput(s)).toEqual(want);
    }
  });
  it('暦に無い日・形の違うものは読まない', () => {
    for (const s of ['1990.02.30', '1990.13.01', '90.2.14', '1990.2', '', 'abc', '1990.02.14.01', '199002141']) {
      expect(parseDateInput(s)).toBeNull();
    }
  });
});

describe('dateInputToEt', () => {
  const MIN = etFromIso('1977-09-05T13:00:00Z');
  const MAX = etFromIso('2026-11-22T06:00:00Z');
  const iso = (et: number) => new Date(Math.round(utcMsFromEt(et) / 1000) * 1000).toISOString();
  it('今の時刻を残して日付だけを替える', () => {
    const now = etFromIso('1980-11-12T23:45:00Z');
    expect(iso(dateInputToEt('1990.02.14', now, MIN, MAX)!)).toBe('1990-02-14T23:45:00.000Z');
  });
  it('範囲の端の日は範囲の中へ丸め、範囲の外の日は null', () => {
    const now = etFromIso('1990-02-14T04:48:00Z');
    expect(dateInputToEt('1977.09.05', now, MIN, MAX)).toBe(MIN);
    expect(dateInputToEt('2026.11.22', etFromIso('1990-02-14T20:00:00Z'), MIN, MAX)).toBe(MAX);
    expect(dateInputToEt('1977.09.04', now, MIN, MAX)).toBeNull();
    expect(dateInputToEt('2026.11.23', now, MIN, MAX)).toBeNull();
    expect(dateInputToEt('だめ', now, MIN, MAX)).toBeNull();
  });
});
