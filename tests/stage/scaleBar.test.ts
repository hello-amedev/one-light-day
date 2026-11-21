import { describe, expect, it } from 'vitest';
import { formatDistanceRound } from '../../src/lib/format';
import { pickScaleBar, SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from '../../src/stage/scaleBar';

/** 1・2・5 × 10 の何乗か */
function isRound(km: number): boolean {
  const m = km / 10 ** Math.floor(Math.log10(km));
  return [1, 2, 5].some((v) => Math.abs(m - v) < 1e-9);
}

describe('縮尺の物差し', () => {
  it('どんな縮尺でも、長さは 80〜200px に収まり、切りのよい値になる', () => {
    // 1px が 1km(惑星のそば)〜 1e9km(太陽系の外)まで、細かく刻んで確かめる
    for (let e = 0; e <= 9; e += 0.037) {
      const kmPerPx = 10 ** e;
      const bar = pickScaleBar(kmPerPx)!;
      expect(bar.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX - 1e-6);
      expect(bar.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX + 1e-6);
      expect(isRound(bar.km)).toBe(true);
      expect(bar.px).toBeCloseTo(bar.km / kmPerPx, 6);
    }
  });
  it('例: 1px が 4,300 万 km なら 50 億 km', () => {
    const bar = pickScaleBar(4.3e7)!;
    expect(bar.km).toBe(5e9);
    expect(bar.px).toBeCloseTo(116.3, 0);
  });
  it('引いていくと値が切り替わる(2 → 5 → 10 → 20 百万 km)', () => {
    // 1px の長さが 1 万 km から 2 倍ずつ・2.5 倍ずつ大きくなっていく
    expect(pickScaleBar(1.0e4)!.km).toBe(2e6);
    expect(pickScaleBar(2.6e4)!.km).toBe(5e6);
    expect(pickScaleBar(5.1e4)!.km).toBe(1e7);
    expect(pickScaleBar(1.0e5)!.km).toBe(2e7);
  });
  it('縮尺が決まらない時は出さない', () => {
    expect(pickScaleBar(0)).toBeNull();
    expect(pickScaleBar(-1)).toBeNull();
    expect(pickScaleBar(Number.NaN)).toBeNull();
    expect(pickScaleBar(Infinity)).toBeNull();
  });
});

describe('切りのよい距離の文字', () => {
  it('億km・万km・km で、小数を出さない', () => {
    expect(formatDistanceRound(1e9)).toBe('10億km');
    expect(formatDistanceRound(1e10)).toBe('100億km');
    expect(formatDistanceRound(5e8)).toBe('5億km');
    expect(formatDistanceRound(1e8)).toBe('1億km');
    expect(formatDistanceRound(2e7)).toBe('2,000万km');
    expect(formatDistanceRound(5e4)).toBe('5万km');
    expect(formatDistanceRound(2000)).toBe('2,000km');
    expect(formatDistanceRound(1e12)).toBe('10,000億km');
  });
});
