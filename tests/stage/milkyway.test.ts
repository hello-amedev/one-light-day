import { describe, expect, it } from 'vitest';
import { equatorialToEcliptic, narrowFovGain, pickMilkywayVariant, skyUV } from '../../src/stage/milkyway';

// 画像(4096×2048)の中の目印。docs/assets/textures.md の「向きの確認」
describe('天の川の向き', () => {
  it('銀河の中心(赤経 266.4 度・赤緯 -28.9 度)は、一番明るい帯(x 3056〜3112、y 1344〜1353)の位置に来る', () => {
    const { u, v } = skyUV(equatorialToEcliptic(266.4, -28.9));
    expect(u * 4096).toBeGreaterThan(3056 - 40);
    expect(u * 4096).toBeLessThan(3112 + 40);
    // v は下端 0・上端 1。画像の行は上から数える
    const row = (1 - v) * 2048;
    expect(row).toBeGreaterThan(1344 - 40);
    expect(row).toBeLessThan(1353 + 40);
  });

  it('大マゼラン雲(赤経 80 度・赤緯 -70 度)は x ≈ 0.28、画像の下側', () => {
    const { u, v } = skyUV(equatorialToEcliptic(80, -70));
    expect(u).toBeCloseTo(0.28, 1);
    expect(v).toBeLessThan(0.3);
  });

  it('赤経 0 度は画像の中央、赤経 180 度は左端(右端)。天の北極は上端', () => {
    expect(skyUV(equatorialToEcliptic(0, 0)).u).toBeCloseTo(0.5, 6);
    const edge = skyUV(equatorialToEcliptic(179.999, 0)).u;
    expect(edge < 0.01 || edge > 0.99).toBe(true);
    expect(skyUV(equatorialToEcliptic(0, 90)).v).toBeCloseTo(1, 6);
  });

  it('黄道の北(z 軸)は、赤道座標の赤緯 66.56 度の方向', () => {
    const { v } = skyUV([0, 0, 1]);
    expect((v - 0.5) * 180).toBeCloseTo(66.56, 1);
  });

  it('春分点の方向(黄道の x 軸)は画像の中央・赤道上', () => {
    const { u, v } = skyUV([1, 0, 0]);
    expect(u).toBeCloseTo(0.5, 6);
    expect(v).toBeCloseTo(0.5, 6);
  });
});

describe('画像の選び方と明るさ', () => {
  it('短い辺 × 画素比が 1,000px 未満、または粗いポインタなら小さい画像', () => {
    expect(pickMilkywayVariant(800, 2, false)).toBe('hi');
    expect(pickMilkywayVariant(390, 3, false)).toBe('hi'); // 1170
    expect(pickMilkywayVariant(390, 2, false)).toBe('lo'); // 780
    expect(pickMilkywayVariant(1200, 2, true)).toBe('lo');
  });

  it('視野が狭いほど暗く、広い所では 1', () => {
    expect(narrowFovGain(60)).toBe(1);
    expect(narrowFovGain(2)).toBeLessThan(narrowFovGain(10));
    expect(narrowFovGain(10)).toBeLessThan(1);
    expect(narrowFovGain(2)).toBeGreaterThan(0.4);
  });
});
