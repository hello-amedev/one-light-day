import { describe, expect, it } from 'vitest';
import { moonlight, moonPhaseFactor } from '../../src/stage/moonlight';
import type { Vec3 } from '../../src/stage/math';

describe('月明かり', () => {
  it('満月が 1、半月は約 0.09、新月は 0', () => {
    expect(moonPhaseFactor(0)).toBe(1);
    expect(moonPhaseFactor(90)).toBeGreaterThan(0.07);
    expect(moonPhaseFactor(90)).toBeLessThan(0.11);
    expect(moonPhaseFactor(180)).toBe(0);
    expect(moonPhaseFactor(45)).toBeGreaterThan(moonPhaseFactor(90));
  });
  it('向きは地球から月へ。太陽と月が地球をはさむと満月、同じ側だと新月', () => {
    const dir: Vec3 = [0, 0, 0];
    const full = moonlight([384000, 0, 0], [-1.5e8, 0, 0], dir);
    expect(dir).toEqual([1, 0, 0]);
    expect(full).toBeCloseTo(1, 3);
    expect(moonlight([384000, 0, 0], [1.5e8, 0, 0], dir)).toBeLessThan(0.001);
    // 半月(太陽と月が地球から 90 度)
    const half = moonlight([0, 384000, 0], [1.5e8, 0, 0], dir);
    expect(half).toBeGreaterThan(0.07);
    expect(half).toBeLessThan(0.11);
  });
});
