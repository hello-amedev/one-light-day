import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { angleToPixels, lookFov } from '../../src/stage/look';
import { angleBetween, DEG } from '../../src/stage/math';
import { loadFromDisk } from '../ephemeris/helpers';

const { eph } = loadFromDisk();

describe('向いた時の視野', () => {
  const pbd = etFromIso('1990-02-14T04:48:00Z');
  const today = etFromIso('2026-11-18T10:16:07Z');

  it('太陽は 40 度、進む先は 60 度', () => {
    expect(lookFov('sun', eph, pbd)).toBe(40);
    expect(lookFov('ahead', eph, pbd)).toBe(60);
  });

  it('1990-02-14 の地球は、太陽との離角の 8 倍で約 11 度', () => {
    const fov = lookFov('earth', eph, pbd);
    expect(fov).toBeGreaterThan(9);
    expect(fov).toBeLessThan(13);
  });

  it('今日の地球は 2 度(下限)', () => {
    expect(lookFov('earth', eph, today)).toBe(2);
  });

  it('近い天体は、見かけの直径の 2.5 倍(木星の最接近は 2〜60 度の中)', () => {
    const fov = lookFov('jupiter', eph, etFromIso('1979-03-05T12:04:00Z'));
    expect(fov).toBeGreaterThan(30);
    expect(fov).toBeLessThanOrEqual(60);
  });

  it('打ち上げの時の地球は 60 度(上限)で、画面の大部分を占める', () => {
    expect(lookFov('earth', eph, etFromIso('1977-09-05T14:05:00Z'))).toBe(60);
  });

  for (const [name, et] of [['1990-02-14T04:48:00Z', pbd], ['2026-11-18', etFromIso('2026-11-18T00:00:00Z')]] as const) {
    it(`${name} に地球を向くと、短い辺 800px の画面で地球と太陽が 60px 以上離れる`, () => {
      const fov = lookFov('earth', eph, et);
      const sep = angleBetween(eph.position('earth', 'voyager1', et), eph.position('sun', 'voyager1', et));
      expect(angleToPixels(sep, fov, 800)).toBeGreaterThanOrEqual(60);
      expect(fov).toBeGreaterThanOrEqual(2);
      expect(fov).toBeLessThanOrEqual(40);
      expect(fov * DEG).toBeGreaterThan(0);
    });
  }
});
