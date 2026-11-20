import { describe, expect, it } from 'vitest';
import { PLANET_IDS } from '../../src/lib/bodies';
import { etFromIso } from '../../src/lib/ephemeris/time';
import type { Vec3 } from '../../src/lib/ephemeris/types';
import { distanceFromOrbit, orbitFromState, orbitLoop } from '../../src/stage/orbit';
import { loadFromDisk } from '../ephemeris/helpers';

const { eph } = loadFromDisk();
const len = (a: ArrayLike<number>) => Math.hypot(a[0], a[1], a[2]);

describe('軌道の要素', () => {
  // 画面は 30 日ごとに要素を求め直す。求めた時刻から ±30 日のあいだ、惑星が線から軌道半径の 1% 以内にいればよい
  const epochs = ['1979-03-05T12:04:00Z', '1990-02-14T04:48:00Z', '2012-08-25T00:00:00Z', '2026-11-18T00:00:00Z'].map(etFromIso);

  for (const id of PLANET_IDS) {
    it(`${id}: 求めた楕円が、その前後の惑星の位置と軌道半径の 1% 以内で合う`, () => {
      for (const t0 of epochs) {
        const p = eph.position(id, 'sun', t0);
        const v = eph.velocity(id, 'sun', t0);
        const el = orbitFromState(p, v);
        for (const dt of [-30, -10, 0, 10, 30]) {
          const q = eph.position(id, 'sun', t0 + dt * 86400);
          expect(distanceFromOrbit(el, q) / len(p)).toBeLessThan(0.01);
        }
      }
    });
  }

  it('点の並びは閉じていて、どの点も楕円の式を満たす', () => {
    const t0 = epochs[1];
    const p = eph.position('mars', 'sun', t0);
    const el = orbitFromState(p, eph.velocity('mars', 'sun', t0));
    const loop = orbitLoop(el, 360);
    expect(loop.length).toBe(361 * 3);
    expect(Array.from(loop.slice(0, 3))).toEqual(Array.from(loop.slice(360 * 3, 361 * 3)));
    for (let i = 0; i < 361; i += 30) {
      const q: Vec3 = [loop[i * 3], loop[i * 3 + 1], loop[i * 3 + 2]];
      expect(distanceFromOrbit(el, q)).toBeLessThan(1e-3 * len(q));
    }
  });

  it('海王星の 1 周は 165 年で、データの期間(49 年)より長い', () => {
    const t0 = epochs[1];
    const el = orbitFromState(eph.position('neptune', 'sun', t0), eph.velocity('neptune', 'sun', t0));
    const periodYears = (2 * Math.PI * Math.sqrt(el.a ** 3 / 1.32712440018e11)) / (365.25 * 86400);
    expect(periodYears).toBeGreaterThan(160);
    expect(periodYears).toBeLessThan(170);
  });
});
