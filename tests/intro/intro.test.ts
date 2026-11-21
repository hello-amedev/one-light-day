import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { INTRO_EARLY_END_ET, INTRO_EARLY_SHARE, introEt, introMode } from '../../src/lib/intro';

const START = etFromIso('1977-09-05T14:05:00Z');
const END = etFromIso('2026-11-18T10:16:07Z');
const at = (p: number) => introEt(p, START, END);

describe('introEt', () => {
  it('0 で始まり、1 で今日', () => {
    expect(at(0)).toBe(START);
    expect(at(1)).toBeCloseTo(END, 3);
    expect(at(-1)).toBe(START);
    expect(at(2)).toBeCloseTo(END, 3);
  });
  it('単調に増える', () => {
    let prev = at(0);
    for (let i = 1; i <= 1000; i++) {
      const cur = at(i / 1000);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });
  it('最初の 4 割の時間で 1981 年の初めに着く', () => {
    expect(at(INTRO_EARLY_SHARE)).toBeCloseTo(INTRO_EARLY_END_ET, 3);
  });
  it('最後は減速している(終わりの 1 割で進む量が、途中の 1 割より少ない)', () => {
    const last = at(1) - at(0.9);
    const middle = at(0.7) - at(0.6);
    expect(last).toBeLessThan(middle);
    expect(last).toBeLessThan((at(0.6) - at(0.5)) / 2);
  });
  it('山場の終わりが範囲の外でも壊れない', () => {
    expect(introEt(0.5, START, END, START - 1e9)).toBeGreaterThanOrEqual(START);
    expect(introEt(0.5, START, END, END + 1e9)).toBeLessThanOrEqual(END);
  });
});

describe('introMode', () => {
  it('何も付いていなければ再生', () => {
    expect(introMode('', false)).toBe('play');
    expect(introMode('?debug', false)).toBe('play');
  });
  it('t / view / look / intro=0 では始めない', () => {
    expect(introMode('?t=1990-02-14T04:48:00Z', false)).toBe('none');
    expect(introMode('?view=overview', false)).toBe('none');
    expect(introMode('?look=earth', false)).toBe('none');
    expect(introMode('?intro=0', false)).toBe('none');
    expect(introMode('?intro=0', true)).toBe('none');
  });
  it('動きを減らす設定では止めた状態で始める。URL の指定があればそちらが先', () => {
    expect(introMode('', true)).toBe('still');
    expect(introMode('?t=1990-02-14T04:48:00Z', true)).toBe('none');
  });
});
