import { describe, expect, it } from 'vitest';
import { FOV_BASE_DEG, MAG_MAX, fovFromMagnification } from '../../src/lib/zoom';
import { STAR_STRIDE } from '../../src/lib/stars';
import {
  DEEP_STARS_OFF_ZOOM,
  DEEP_STARS_ON_ZOOM,
  catalogHasDeepStars,
  deepStarsWanted,
  effectiveZoom,
  glareZoomFactor,
  milkywayZoomGain,
  shouldLoadDeepStars,
  sunGlowSizes,
} from '../../src/stage/zoomView';

const topZoom = effectiveZoom(fovFromMagnification(MAG_MAX));

describe('見え方に使う拡大の度合い', () => {
  it('×1 と引きの眺め(視野 45 度以上)は 1', () => {
    expect(effectiveZoom(FOV_BASE_DEG)).toBe(1);
    expect(effectiveZoom(45)).toBe(1);
    expect(effectiveZoom(80)).toBe(1);
  });
  it('視野が狭いほど大きく、上限の視野で最大', () => {
    expect(effectiveZoom(10)).toBeGreaterThan(effectiveZoom(30));
    expect(topZoom).toBeGreaterThan(100);
  });
});

describe('太陽の光の大きさ', () => {
  const base = { au: 200, discPx: 0, shortPx: 800, glare: 1.3 };
  it('×1 では今までと同じ大きさ(遠い所: 64px のにじみ × 光の倍率)', () => {
    const s = sunGlowSizes({ ...base, zoom: 1 });
    expect(s.glowPx).toBeCloseTo(64 * 1.3, 5);
    expect(s.corePx).toBeCloseTo(20, 5);
    expect(s.spikePx).toBeCloseTo(150 * Math.sqrt(1.3), 5);
  });
  it('拡大するほど、にじみ・芯・光条は小さくなる', () => {
    const sizes = [1, 3, 10, 40, topZoom].map((zoom) => sunGlowSizes({ ...base, zoom }));
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i].glowPx).toBeLessThan(sizes[i - 1].glowPx);
      expect(sizes[i].spikePx).toBeLessThan(sizes[i - 1].spikePx);
    }
  });
  it('上限まで拡大しても、遠い所の太陽の光は画面の短い辺の 1 割に収まる(地球の点と分けて見える)', () => {
    const s = sunGlowSizes({ ...base, zoom: topZoom });
    expect(s.glowPx).toBeLessThan(80);
    expect(s.spikePx).toBeLessThan(80);
    expect(glareZoomFactor(topZoom)).toBeLessThan(0.4);
  });
  it('どの倍率・距離でも、画面の短い辺を超えない(画面を覆いつくさない)', () => {
    for (const zoom of [1, 5, 30, topZoom]) {
      for (const au of [0.5, 1, 5, 40, 170]) {
        for (const discPx of [0, 50, 5000, 1e6]) {
          const s = sunGlowSizes({ au, discPx, shortPx: 800, glare: 1.3, zoom });
          expect(s.glowPx).toBeLessThanOrEqual(800 * 0.9 + 1e-9);
          expect(s.corePx).toBeLessThanOrEqual(800 * 0.4 + 1e-9);
          expect(s.spikePx).toBeLessThanOrEqual(800 * 1.1 + 1e-9);
          expect(Number.isFinite(s.glowPx + s.corePx + s.spikePx + s.spikeOpacity)).toBe(true);
        }
      }
    }
  });
  it('近い太陽は大きく、球そのものが大きい分は縮めない', () => {
    const near = sunGlowSizes({ au: 1, discPx: 0, shortPx: 800, glare: 1.3, zoom: 1 });
    const far = sunGlowSizes({ au: 200, discPx: 0, shortPx: 800, glare: 1.3, zoom: 1 });
    expect(near.glowPx).toBeGreaterThan(far.glowPx);
    const disc = sunGlowSizes({ au: 200, discPx: 40, shortPx: 800, glare: 1, zoom: topZoom });
    const none = sunGlowSizes({ au: 200, discPx: 0, shortPx: 800, glare: 1, zoom: topZoom });
    expect(disc.glowPx - none.glowPx).toBeCloseTo(160, 5);
  });
});

describe('天の川の淡さ', () => {
  it('×1 で 1(今の濃さ)', () => {
    expect(milkywayZoomGain(1)).toBe(1);
  });
  it('拡大するほど淡くなり、上限で 0.15', () => {
    const gains = [1, 2, 5, 20, 60, topZoom].map(milkywayZoomGain);
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeLessThan(gains[i - 1]);
    expect(milkywayZoomGain(topZoom)).toBeCloseTo(0.15, 5);
    expect(milkywayZoomGain(1e6)).toBeCloseTo(0.15, 5);
  });
});

describe('暗い星の読み込み', () => {
  it('倍率が閾値(×3)に届いたら、まだ読んでいなければ読む', () => {
    expect(shouldLoadDeepStars(DEEP_STARS_ON_ZOOM, 'none', false)).toBe(true);
    expect(shouldLoadDeepStars(2.9, 'none', false)).toBe(false);
    expect(shouldLoadDeepStars(1, 'none', false)).toBe(false);
  });
  it('読み込み中・読み込み済み・失敗した後は、もう読まない', () => {
    for (const load of ['loading', 'ready', 'failed'] as const) {
      expect(shouldLoadDeepStars(100, load, false)).toBe(false);
    }
  });
  it('?stars=deep で最初から入っている時は読まない', () => {
    expect(shouldLoadDeepStars(100, 'none', true)).toBe(false);
  });
  it('層を見せるかは、閾値で入り、少し下がるまで保つ(境目でちらつかない)', () => {
    expect(deepStarsWanted(2.5, false)).toBe(false);
    expect(deepStarsWanted(3, false)).toBe(true);
    expect(deepStarsWanted(2.5, true)).toBe(true);
    expect(deepStarsWanted(DEEP_STARS_OFF_ZOOM - 0.01, true)).toBe(false);
  });
  it('カタログの等級の列から、暗い星が入っているかを判断する', () => {
    const mk = (mags: number[]): Float32Array => {
      const d = new Float32Array(mags.length * STAR_STRIDE);
      mags.forEach((m, i) => (d[i * STAR_STRIDE + 3] = m));
      return d;
    };
    expect(catalogHasDeepStars(mk([-1.4, 3, 6.5]), STAR_STRIDE)).toBe(false);
    expect(catalogHasDeepStars(mk([-1.4, 3, 6.5, 7.2]), STAR_STRIDE)).toBe(true);
    expect(catalogHasDeepStars(new Float32Array(0), STAR_STRIDE)).toBe(false);
  });
});
