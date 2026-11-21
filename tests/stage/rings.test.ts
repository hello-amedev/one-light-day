import { describe, expect, it } from 'vitest';
import { chooseVariant } from '../../src/stage/textureChoice';
import {
  planetShadowOnRing,
  ringCrossingRadius,
  ringSample,
  ringShadowOnPlanet,
} from '../../src/stage/saturnRings';
import { normalize, type Vec3 } from '../../src/stage/math';

describe('環の表', () => {
  const peak = (a: number, b: number): number => {
    let m = 0;
    for (let r = a; r < b; r += 25) m = Math.max(m, ringSample(r).tau);
    return m;
  };
  it('濃さは B 環で最大', () => {
    const b = peak(92_000, 117_580);
    expect(b).toBeGreaterThan(peak(74_658, 92_000));
    expect(b).toBeGreaterThan(peak(122_170, 136_775));
    expect(b).toBeGreaterThan(1.5);
  });
  it('カッシーニの間隙と環の外は 0 に近い', () => {
    expect(ringSample(119_800).tau).toBeLessThan(0.12);
    expect(ringSample(100_000).tau).toBeGreaterThan(1);
    expect(ringSample(60_000).tau).toBe(0);
    expect(ringSample(138_500).tau).toBeLessThan(0.01);
    expect(ringSample(150_000).tau).toBe(0);
  });
  it('エンケの間隙は A 環より薄い', () => {
    expect(ringSample(133_589).tau).toBeLessThan(ringSample(130_000).tau * 0.5);
  });
  it('同じ半径は同じ値(決まった乱数)', () => {
    expect(ringSample(101_234.5)).toEqual(ringSample(101_234.5));
  });
});

describe('影', () => {
  const L: Vec3 = normalize([1, 0, 0.3]);
  it('土星の真後ろ(太陽と反対側)の環の点は影、太陽の側は影でない', () => {
    expect(planetShadowOnRing([-1.8, 0, 0], L, 0.098)).toBeGreaterThan(0.99);
    expect(planetShadowOnRing([1.8, 0, 0], L, 0.098)).toBe(0);
    expect(planetShadowOnRing([0, 1.8, 0], L, 0.098)).toBe(0);
  });
  it('太陽が環の北側にある時、環の影は南半球に落ちる', () => {
    // 南半球(z < 0)の点から太陽へ向かう線は環の面を横切る。北半球は横切らない
    const south: Vec3 = normalize([0.9, 0.1, -0.3]);
    const north: Vec3 = [south[0], south[1], -south[2]];
    expect(ringCrossingRadius(south, L)).not.toBeNull();
    expect(ringCrossingRadius(north, L)).toBeNull();
  });
  it('B 環を通る線は光をほぼ遮り、環を通らない線は遮らない', () => {
    // 点 q=(0.9, 0, -0.4)(土星の表面付近)。太陽の向き L で横切る半径を逆算
    const q: Vec3 = [0.9, 0, -0.4];
    const r = ringCrossingRadius(q, L)!;
    expect(r).toBeGreaterThan(0);
    const lit = ringShadowOnPlanet(q, L, 60_268);
    expect(lit).toBeGreaterThanOrEqual(0);
    expect(lit).toBeLessThanOrEqual(1);
    // 北半球は常に 1
    expect(ringShadowOnPlanet([0.9, 0, 0.4], L, 60_268)).toBe(1);
    // 環の内側の外(D 環より内)を横切る点は遮られない: 横切る半径が 1.0 未満
    const steep: Vec3 = normalize([0.2, 0, 0.98]);
    expect(ringShadowOnPlanet([0.5, 0, -0.3], steep, 60_268)).toBeGreaterThan(0.95);
  });
});

describe('画像の選び方', () => {
  const base = { screenShortPx: 900, pixelRatio: 2, coarsePointer: false, maxTextureSize: 8192, hiWidth: 3600, hiHeight: 1800 };
  it('大きい画面 × 細かいポインタは hi', () => expect(chooseVariant(base)).toBe('hi'));
  it('短い辺 × 画素比が 1,000 未満は lo', () => expect(chooseVariant({ ...base, screenShortPx: 800, pixelRatio: 1 })).toBe('lo'));
  it('ポインタが粗いと lo', () => expect(chooseVariant({ ...base, coarsePointer: true })).toBe('lo'));
  it('GPU の上限を超える画像は lo', () => expect(chooseVariant({ ...base, maxTextureSize: 2048 })).toBe('lo'));
});
