import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { STANDALONE_EVENTS } from '../../src/lib/events';
import { formatEventDate, formatSpeed } from '../../src/lib/format';

describe('刻みの吹き出しの日付', () => {
  const find = (id: string) => STANDALONE_EVENTS.find((e) => e.id === id)!;
  const fmt = (id: string) => {
    const e = find(id);
    return formatEventDate({ et: e.et, precision: e.precision, endEt: e.endUtc ? etFromIso(e.endUtc) : undefined });
  };
  it('日までのものは 1998.02.17 の形', () => {
    expect(fmt('mostDistant')).toBe('1998.02.17');
    expect(fmt('thrusters')).toBe('2017.11.28');
  });
  it('月までしか分からないものは「2004年12月」', () => {
    expect(fmt('terminationShock')).toBe('2004年12月');
  });
  it('期間のあるものは始まり〜終わり', () => {
    expect(fmt('memoryFix')).toBe('2023.11.14〜2024.06.13');
  });
  it('速さは小数 1 桁', () => {
    expect(formatSpeed(13.2345)).toBe('13.2');
    expect(formatSpeed(23)).toBe('23.0');
  });
});
