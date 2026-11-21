import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { angleBetween, DEG, type Vec3 } from '../../src/stage/math';
import { bodyToEcliptic, poleDirection, ROTATION, surfacePoint } from '../../src/stage/rotation';
import { loadFromDisk } from '../ephemeris/helpers';

const { eph } = loadFromDisk();
const NORTH: Vec3 = [0, 0, 1];
const wrap = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;

describe('自転: 極の向き', () => {
  it('黄道の北との角度: 地球 23.44 度、木星 2〜3 度、土星 約 28 度', () => {
    const deg = (id: 'earth' | 'jupiter' | 'saturn') => angleBetween(poleDirection(ROTATION[id]!), NORTH) / DEG;
    expect(deg('earth')).toBeCloseTo(23.44, 1);
    expect(deg('jupiter')).toBeGreaterThan(2);
    expect(deg('jupiter')).toBeLessThan(3.5);
    expect(deg('saturn')).toBeGreaterThan(26.5);
    expect(deg('saturn')).toBeLessThan(29.5);
  });
});

describe('自転: 地球の昼', () => {
  it('1977-09-05T14:00Z に太陽の真下になる経度は西経 30 度付近', () => {
    const et = etFromIso('1977-09-05T14:00:00Z');
    const m = bodyToEcliptic(ROTATION.earth!, et);
    const lon = surfacePoint(m, eph.position('sun', 'earth', et)).lon;
    expect(Math.abs(wrap(lon + 30))).toBeLessThan(3);
  });
  it('UTC の正午に経度 0 度が太陽の側を向く(時刻の式の確認)', () => {
    const et = etFromIso('1977-12-01T12:00:00Z');
    const lon = surfacePoint(bodyToEcliptic(ROTATION.earth!, et), eph.position('sun', 'earth', et)).lon;
    // 均時差(12 月初めは約 -11 分 = 約 3 度)の範囲
    expect(Math.abs(wrap(lon))).toBeLessThan(5);
  });
});

describe('自転: 衛星は同じ面を親に向ける', () => {
  // タイタンは軌道の離心率による見かけの首振りで、通過の前後に最大 5.3 度ずれる(指示書は ±5 度。周期項を入れていないための差)
  const cases = [
    ['moon', 'earth', 9],
    ['io', 'jupiter', 5],
    ['titan', 'saturn', 6],
  ] as const;
  for (const [id, parent, tol] of cases) {
    it(`${id}: 経度 0 度の面が ${parent} の方向(±${tol} 度)`, () => {
      const range = eph.coverage(id);
      const et = (range.t0 + range.t1) / 2;
      const m = bodyToEcliptic(ROTATION[id]!, et);
      const lon = surfacePoint(m, eph.position(parent, id, et)).lon;
      expect(Math.abs(wrap(lon))).toBeLessThan(tol);
    });
  }
});
