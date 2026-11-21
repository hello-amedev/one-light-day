import { describe, expect, it } from 'vitest';
import { LINE_FADE_S, stepToward, viewLineFade } from '../../src/stage/fade';

describe('すっと薄れる・戻る動き', () => {
  it('seconds 秒で端から端まで動く', () => {
    let v = 1;
    for (let i = 0; i < 30; i++) v = stepToward(v, 0, 0.01, LINE_FADE_S);
    expect(v).toBeCloseTo(0, 5);
  });
  it('途中までなら途中の値', () => {
    expect(stepToward(1, 0, 0.15, 0.3)).toBeCloseTo(0.5, 5);
    expect(stepToward(0, 1, 0.15, 0.3)).toBeCloseTo(0.5, 5);
  });
  it('目標を行き過ぎない・時間が 0 なら動かさない・すでに目標なら変わらない', () => {
    expect(stepToward(0.9, 1, 5, 0.3)).toBe(1);
    expect(stepToward(0.4, 0.4, 0.1, 0.3)).toBe(0.4);
    expect(stepToward(1, 0, 0, 0.3)).toBe(1);
    expect(stepToward(1, 0, 0.1, 0)).toBe(0);
  });
});

describe('引きの眺めの線の、視点による濃さ', () => {
  it('ボイジャーの視界(ずれ 0)と本体の視点(数十 m)は 0', () => {
    expect(viewLineFade(0)).toBe(0);
    expect(viewLineFade(0.05)).toBe(0);
  });
  it('引きの眺め(最も寄っても約 1.5 億 km)は 1 に近い', () => {
    expect(viewLineFade(1.5e8)).toBe(1);
    expect(viewLineFade(7.5e8)).toBe(1);
  });
  it('切り替えの途中は 0 から 1 へつながる', () => {
    expect(viewLineFade(1e5)).toBe(0);
    const mid = viewLineFade(5e6);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(viewLineFade(1e7)).toBeGreaterThan(mid);
  });
});
