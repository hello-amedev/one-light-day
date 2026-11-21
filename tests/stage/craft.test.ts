import { describe, expect, it } from 'vitest';
import { applyMat3, craftOpacity, craftOrientation, DISH_DIAMETER_M, modelUnitKm } from '../../src/stage/craftMath';
import { CraftView } from '../../src/stage/craft';
import type { Ephemeris } from '../../src/lib/ephemeris';
import { dot, length, type Vec3 } from '../../src/stage/math';

const close = (a: Vec3, b: Vec3, eps = 1e-9) => {
  for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(eps);
};

describe('機体の大きさ', () => {
  it('皿の直径が実際の 3.7 m になる倍率(km)', () => {
    const k = modelUnitKm(3.81);
    expect(k * 3.81 * 1000).toBeCloseTo(DISH_DIAMETER_M, 9);
    expect(k).toBeCloseTo(9.71e-4, 6);
  });
  it('モデルの単位が違っても、皿は同じ大きさになる', () => {
    expect(modelUnitKm(7.62) * 7.62).toBeCloseTo(modelUnitKm(3.81) * 3.81, 12);
  });
});

describe('皿の軸を地球へ向ける回転', () => {
  const axis: Vec3 = [0, 1, 0];
  const roll: Vec3 = [0, 0, 1];
  const cases: Vec3[] = [
    [1, 0, 0],
    [0.3, -0.8, 0.2],
    [-5e9, 2e9, 1e8],
  ];
  for (const e of cases) {
    it(`軸が地球の方向(${e.join(', ')})を向く`, () => {
      const m = craftOrientation(axis, roll, e);
      const out = applyMat3(m, axis);
      const n = length(e);
      close(out, [e[0] / n, e[1] / n, e[2] / n]);
    });
    it('回転は長さを変えず、ブームは黄道の北の側へ向く', () => {
      const m = craftOrientation(axis, roll, e);
      expect(length(applyMat3(m, roll))).toBeCloseTo(1, 9);
      expect(applyMat3(m, roll)[2]).toBeGreaterThanOrEqual(0);
      // 軸とブームは直角のまま
      expect(dot(applyMat3(m, axis), applyMat3(m, roll))).toBeCloseTo(0, 9);
    });
  }
  it('地球が真上でも壊れない', () => {
    const m = craftOrientation(axis, roll, [0, 0, 1]);
    close(applyMat3(m, axis), [0, 0, 1]);
    expect(length(applyMat3(m, roll))).toBeCloseTo(1, 9);
  });
});

describe('機体の見え方', () => {
  it('ボイジャーの視界のすぐそば(数 m 以内)では描かない', () => {
    expect(craftOpacity(1, 0)).toBe(0);
    expect(craftOpacity(1, 0.001)).toBe(0);
  });
  it('離れると現れ、20 m では全部見える', () => {
    expect(craftOpacity(1, 0.007)).toBeGreaterThan(0);
    expect(craftOpacity(1, 0.007)).toBeLessThan(1);
    expect(craftOpacity(1, 0.02)).toBe(1);
  });
  it('視点を出ていく間(ramp = 0)は消える', () => {
    expect(craftOpacity(0, 1e9)).toBe(0);
  });
});

describe('本体の視点のカメラの姿勢', () => {
  const eph = {
    position: () => [3e9, -4e9, 1e9] as Vec3,
  } as unknown as Ephemeris;
  const view = new CraftView({ eph, onChange: () => {} });
  it('ずれの長さ = 機体までの距離(m を km に直した値)', () => {
    for (const m of [6, 20, 200]) {
      const p = view.pose(0, m);
      expect(length(p.offset)).toBeCloseTo(m / 1000, 12);
    }
  });
  it('機体の中心を向く', () => {
    const p = view.pose(0, 20);
    const n = length(p.offset);
    close(p.forward, [-p.offset[0] / n, -p.offset[1] / n, -p.offset[2] / n]);
  });
  it('ドラッグで回っても、距離は変わらない', () => {
    view.drag(120, -40);
    expect(length(view.pose(0, 30).offset)).toBeCloseTo(0.03, 12);
  });
});
