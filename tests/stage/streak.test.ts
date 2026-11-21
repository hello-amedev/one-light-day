import { describe, expect, it } from 'vitest';
import {
  classifyStreak,
  GLOW_FULL_DEG,
  PERIOD_DAYS,
  STREAK_OFF_DEG,
  STREAK_ON_DEG,
  stepAngleDeg,
} from '../../src/stage/streak';

const DAY = 86400;
const YEAR = 365.25 * DAY;

describe('1 コマで進む角度', () => {
  it('水星は 1 秒＝1 年・60 コマ/秒で、1 コマに約 24 度', () => {
    expect(stepAngleDeg(YEAR / 60, PERIOD_DAYS.mercury)).toBeCloseTo(24.9, 0);
  });
  it('周期ぶんの時間で 360 度、逆向きでも同じ角度', () => {
    expect(stepAngleDeg(88 * DAY, 88)).toBeCloseTo(360, 6);
    expect(stepAngleDeg(-88 * DAY, 88)).toBeCloseTo(360, 6);
  });
  it('止まっていれば 0 度', () => {
    expect(stepAngleDeg(0, PERIOD_DAYS.earth)).toBe(0);
  });
});

describe('点・弧・軌道全体の切り替え', () => {
  it('3 度より小さい進みは今までどおりの点', () => {
    expect(classifyStreak(0).mode).toBe('dot');
    expect(classifyStreak(STREAK_ON_DEG - 0.01).mode).toBe('dot');
  });
  it('3 度以上で弧になり、長さは進んだ角度に比例する', () => {
    const a = classifyStreak(STREAK_ON_DEG);
    expect(a.mode).toBe('arc');
    expect(a.arcDeg).toBe(3);
    expect(classifyStreak(30).arcDeg).toBe(30);
    expect(classifyStreak(60).arcDeg / classifyStreak(30).arcDeg).toBe(2);
  });
  it('弧が長くなると軌道の線が明るくなり、弧は薄れる', () => {
    expect(classifyStreak(10).glow).toBe(0);
    const long = classifyStreak(330);
    expect(long.glow).toBeGreaterThan(0.5);
    expect(long.arcAlpha).toBeCloseTo(1 - long.glow, 9);
  });
  it('1 周以上は軌道全体(弧は出さない)', () => {
    const s = classifyStreak(GLOW_FULL_DEG);
    expect(s).toMatchObject({ mode: 'orbit', arcDeg: 0, glow: 1 });
    expect(classifyStreak(1000).mode).toBe('orbit');
  });
  it('弧になっている間は 2.2 度まで弧を続ける(境目で入れ替わり続けない)', () => {
    expect(classifyStreak(2.5, false).mode).toBe('dot');
    expect(classifyStreak(2.5, true).mode).toBe('arc');
    expect(classifyStreak(STREAK_OFF_DEG - 0.01, true).mode).toBe('dot');
  });
  it('数でない値(NaN)は点', () => {
    expect(classifyStreak(Number.NaN).mode).toBe('dot');
  });
});
