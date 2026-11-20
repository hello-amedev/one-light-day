import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { parseUrlState } from '../../src/lib/urlState';

describe('確認用の URL', () => {
  it('t・view・look を読む', () => {
    const s = parseUrlState('?t=1990-02-14T04:48:00Z&view=overview&look=earth');
    expect(s).toEqual({ et: etFromIso('1990-02-14T04:48:00Z'), view: 'overview', look: 'earth' });
  });
  it('進む先も読める', () => {
    expect(parseUrlState('?look=ahead').look).toBe('ahead');
  });
  it('不正な値は無視する', () => {
    expect(parseUrlState('?t=abc&view=top&look=pluto')).toEqual({});
    expect(parseUrlState('')).toEqual({});
  });
});
