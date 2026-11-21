import { describe, expect, it } from 'vitest';
import { AU_KM } from '../../src/lib/ephemeris/types';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { approachPose, overviewDistance, overviewPose, blendPose } from '../../src/stage/camera';
import { BODY_RADIUS_KM, PLANET_IDS } from '../../src/lib/bodies';
import { angleBetween, azElFromDir, dirFromAzEl, length, DEG, type Vec3 } from '../../src/stage/math';
import { relativePosition, shellPlacement } from '../../src/stage/placement';
import { loadFromDisk } from '../ephemeris/helpers';

const { eph } = loadFromDisk();
const f32 = (v: Vec3): Vec3 => [Math.fround(v[0]), Math.fround(v[1]), Math.fround(v[2])];

const TIMES = {
  木星の最接近: etFromIso('1979-03-05T12:04:00Z'),
  今日: etFromIso('2026-11-18T10:16:07Z'),
};

describe('カメラ相対の位置の精度', () => {
  for (const [name, et] of Object.entries(TIMES)) {
    const voyagerSun = eph.position('voyager1', 'sun', et);
    const offsets: [string, Vec3][] = [
      ['ボイジャーの視界', [0, 0, 0]],
      ['引きの眺め', overviewPose(voyagerSun, 70 * DEG, 28 * DEG, 1).offset],
    ];
    for (const [viewName, offset] of offsets) {
      it(`${name}・${viewName}: float32 に丸めても向きの差が 1e-6 ラジアン以内、縮めた半径の誤差が 0.1% 以内`, () => {
        for (const id of ['sun', ...PLANET_IDS, 'moon'] as const) {
          const rel = relativePosition(eph.position(id, 'voyager1', et), offset);
          const rounded = f32(rel);
          expect(angleBetween(rel, rounded)).toBeLessThan(1e-6);

          // 縮めた位置(float32 で渡される値)の向きと、半径の割合
          const p = shellPlacement(rel, BODY_RADIUS_KM[id]);
          const pf = f32(p.position);
          expect(angleBetween(rel, pf)).toBeLessThan(1e-6);
          const exact = (BODY_RADIUS_KM[id] / length(rel)) * 1e6;
          expect(Math.abs(Math.fround(p.radius) - exact) / exact).toBeLessThan(1e-3);
        }
      });
    }
  }

  it('木星の最接近: 惑星から見たボイジャーの距離を、太陽中心の引き算でなく直接の値で使う', () => {
    const et = TIMES.木星の最接近;
    const direct = length(eph.position('jupiter', 'voyager1', et));
    const viaSun = length(
      relativePosition(eph.position('jupiter', 'sun', et), eph.position('voyager1', 'sun', et)),
    );
    // 直接の値は約 349,000 km。引き算の値とは数百 km ずれる(だから使わない)
    expect(direct).toBeGreaterThan(3.3e5);
    expect(direct).toBeLessThan(3.7e5);
    expect(Math.abs(direct - viaSun)).toBeGreaterThan(50);
  });
});

describe('引きの眺め', () => {
  it('距離: 1977 年は 5 天文単位(下限)、今日はボイジャーの距離の 1.6 倍', () => {
    const v77 = eph.distance('voyager1', 'sun', etFromIso('1977-09-05T14:05:00Z'));
    expect(overviewDistance(v77, 1)).toBeCloseTo(5 * AU_KM, 0);
    const vNow = eph.distance('voyager1', 'sun', TIMES.今日);
    expect(overviewDistance(vNow, 1)).toBeCloseTo(vNow * 1.6, 0);
    expect(overviewDistance(vNow, 2)).toBeCloseTo(vNow * 3.2, 0);
  });

  it('姿勢: カメラは中点から指定の距離にいて、中点を向く', () => {
    const v = eph.position('voyager1', 'sun', TIMES.今日);
    const pose = overviewPose(v, 70 * DEG, 28 * DEG, 1);
    // ボイジャー中心の offset に v を足すと太陽中心のカメラ位置
    const cam: Vec3 = [pose.offset[0] + v[0], pose.offset[1] + v[1], pose.offset[2] + v[2]];
    const toMid: Vec3 = [v[0] / 2 - cam[0], v[1] / 2 - cam[1], v[2] / 2 - cam[2]];
    expect(length(toMid)).toBeCloseTo(overviewDistance(length(v), 1), -2);
    expect(angleBetween(toMid, pose.forward)).toBeLessThan(1e-9);
  });

  it('視点の切り替えの途中も、ずれが飛ばない(対数の補間で、0 の端もなめらか)', () => {
    const v = eph.position('voyager1', 'sun', TIMES.今日);
    const from = { offset: [0, 0, 0] as Vec3, forward: [1, 0, 0] as Vec3, fov: 60 };
    const to = overviewPose(v, 70 * DEG, 28 * DEG, 1);
    let prev = 0;
    for (let i = 0; i <= 100; i++) {
      const p = blendPose(from, to, i / 100);
      const l = length(p.offset);
      if (i === 0) expect(l).toBe(0);
      if (i === 100) expect(l).toBeCloseTo(length(to.offset), -2);
      // 1 コマで急に飛ばない(前の長さの 2 倍まで。0 から出る最初の数コマは下限から)
      if (i > 5) expect(l / prev).toBeLessThan(2);
      prev = l;
    }
  });
});

describe('方位・仰角と方向ベクトルの往復', () => {
  it('どの向きでも往復で戻る', () => {
    for (const az of [-3, -1.2, 0, 0.7, 2.9]) {
      for (const el of [-1.4, -0.3, 0, 0.5, 1.5]) {
        const back = azElFromDir(dirFromAzEl(az, el));
        expect(back.az).toBeCloseTo(az, 10);
        expect(back.el).toBeCloseTo(el, 10);
      }
    }
  });
  it('仰角 +90 度は +z(上)', () => {
    const d = dirFromAzEl(0.3, Math.PI / 2);
    expect(d[2]).toBeCloseTo(1, 12);
  });
});

describe('引きの眺めから本体の視点へ寄る動き', () => {
  const v = eph.position('voyager1', 'sun', TIMES.今日);
  const from = overviewPose(v, 70 * DEG, 28 * DEG, 1);
  // 本体の視点: 機体の 20m 後ろから、機体を向く
  const back: Vec3 = [0.3, -0.9, 0.3];
  const bl = length(back);
  const dirBack: Vec3 = [back[0] / bl, back[1] / bl, back[2] / bl];
  const to = { offset: [dirBack[0] * 0.02, dirBack[1] * 0.02, dirBack[2] * 0.02] as Vec3, forward: [-dirBack[0], -dirBack[1], -dirBack[2]] as Vec3, fov: 52 };

  it('始めと終わりは、それぞれの視点の姿勢と一致する', () => {
    const a = approachPose(from, to, 0);
    expect(length([a.offset[0] - from.offset[0], a.offset[1] - from.offset[1], a.offset[2] - from.offset[2]])).toBeLessThan(1e-6);
    expect(angleBetween(a.forward, from.forward)).toBeLessThan(1e-9);
    const b = approachPose(from, to, 1);
    expect(length([b.offset[0] - to.offset[0], b.offset[1] - to.offset[1], b.offset[2] - to.offset[2]])).toBeLessThan(1e-9);
    expect(angleBetween(b.forward, to.forward)).toBeLessThan(1e-9);
    expect(b.fov).toBeCloseTo(52, 9);
  });

  it('向き直った後は、ボイジャーを画面の中央に置いたまま、遠ざからずに寄っていく', () => {
    let prev = Infinity;
    for (let i = 25; i <= 100; i++) {
      const p = approachPose(from, to, i / 100);
      const toVoyager: Vec3 = [-p.offset[0], -p.offset[1], -p.offset[2]];
      expect(angleBetween(toVoyager, p.forward)).toBeLessThan(1e-6);
      const l = length(p.offset);
      expect(l).toBeLessThanOrEqual(prev * (1 + 1e-12));
      prev = l;
    }
  });

  it('向き直る間は、カメラの位置を動かさない', () => {
    for (const s of [0.05, 0.12, 0.2]) {
      const p = approachPose(from, to, s);
      expect(length([p.offset[0] - from.offset[0], p.offset[1] - from.offset[1], p.offset[2] - from.offset[2]])).toBeLessThan(1e-6);
    }
  });
});
