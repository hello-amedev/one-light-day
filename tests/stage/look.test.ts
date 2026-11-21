import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { fovFromMagnification, MAG_MAX, NAC_FOV_DEG } from '../../src/lib/zoom';
import { angleToPixels, lookDirection } from '../../src/stage/look';
import { angleBetween } from '../../src/stage/math';
import { loadFromDisk } from '../ephemeris/helpers';

const { eph } = loadFromDisk();

describe('向く', () => {
  it('地球を向くと、ボイジャーから見た地球の方向になる', () => {
    const et = etFromIso('1990-02-14T04:48:00Z');
    const dir = lookDirection('earth', eph, et);
    expect(angleBetween(dir, eph.position('earth', 'voyager1', et))).toBeLessThan(1e-9);
  });

  // 完成の定義(第6段階で置き換え): 地球を向いて拡大の上限(狭角カメラの視野)まで拡大すると、
  // どの日付でも太陽の光と地球の点を見分けられる。短い辺 800px の画面で 60px 以上離れることで確かめる
  for (const utc of ['1990-02-14T04:48:00Z', '2026-11-18T00:00:00Z']) {
    it(`${utc} に地球を向いて上限まで拡大すると、短い辺 800px の画面で地球と太陽が 60px 以上離れる`, () => {
      const et = etFromIso(utc);
      const fov = fovFromMagnification(MAG_MAX);
      expect(fov).toBeCloseTo(NAC_FOV_DEG, 6);
      const sep = angleBetween(eph.position('earth', 'voyager1', et), eph.position('sun', 'voyager1', et));
      expect(angleToPixels(sep, fov, 800)).toBeGreaterThanOrEqual(60);
    });
  }
});
