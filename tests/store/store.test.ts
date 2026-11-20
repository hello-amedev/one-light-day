import { describe, expect, it } from 'vitest';
import { createStore, RATE_SECONDS } from '../../src/lib/store';
import { SCENES } from '../../src/lib/scenes';

const sc = (id: string) => SCENES.find((s) => s.id === id)!;
const MIN = sc('launch').et;
const MAX = sc('lightday').et;

function make(initialEt = MIN) {
  return createStore({ minEt: MIN, maxEt: MAX, initialEt });
}

describe('範囲の丸め', () => {
  it('初期値と setTime と stepTime は範囲の端に丸める', () => {
    expect(make(MIN - 1e6).get().et).toBe(MIN);
    expect(make(MAX + 1e6).get().et).toBe(MAX);
    const s = make(MIN + 100);
    s.setTime(MAX + 5);
    expect(s.get().et).toBe(MAX);
    s.stepTime(-1e12);
    expect(s.get().et).toBe(MIN);
    s.stepTime(86400);
    expect(s.get().et).toBe(MIN + 86400);
  });
});

describe('tick', () => {
  it('停止中は進まず false', () => {
    const s = make(MIN + 1e8);
    expect(s.tick(0.05)).toBe(false);
    expect(s.get().et).toBe(MIN + 1e8);
  });
  it('再生中は速さ × 経過秒だけ進む(名場面から遠い所)', () => {
    const s = make(sc('pbd').et + 400 * 86400);
    const start = s.get().et;
    s.setRate('month');
    s.play();
    expect(s.tick(0.05)).toBe(true);
    expect(s.get().et - start).toBeCloseTo(RATE_SECONDS.month * 0.05, 3);
  });
  it('経過秒は 0.1 秒に丸める', () => {
    const s = make(sc('pbd').et + 400 * 86400);
    const start = s.get().et;
    s.setRate('day');
    s.play();
    s.tick(30);
    expect(s.get().et - start).toBeCloseTo(RATE_SECONDS.day * 0.1, 3);
  });
  it('名場面の近くでは遅くなり、通り過ぎると戻る', () => {
    const pbd = sc('pbd');
    const s = make(pbd.et - pbd.slowWindow + 86400);
    s.setRate('year');
    s.play();
    const steps: number[] = [];
    let guard = 0;
    while (s.get().et < pbd.et + pbd.slowWindow + 5 * 86400 && guard++ < 100000) {
      const before = s.get().et;
      s.tick(0.1);
      steps.push((s.get().et - before) / 0.1);
    }
    expect(steps[0]).toBeLessThan(RATE_SECONDS.year);
    expect(Math.min(...steps)).toBeLessThan(RATE_SECONDS.year / 10);
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(pbd.slowRate - 1e-6);
    const before = s.get().et;
    s.tick(0.1);
    expect((s.get().et - before) / 0.1).toBeCloseTo(RATE_SECONDS.year, 3);
  });
  it('選んだ速さが下限より遅ければ、そのまま', () => {
    const pbd = sc('pbd');
    const s = make(pbd.et);
    s.setRate('hour');
    s.play();
    const before = s.get().et;
    s.tick(0.1);
    expect(s.get().et - before).toBeCloseTo(RATE_SECONDS.hour * 0.1, 3);
  });
  it('右端に着いたら丸めて止まる', () => {
    const s = make(MAX - 1000);
    s.setRate('year');
    s.play();
    expect(s.tick(0.1)).toBe(true);
    expect(s.get().et).toBe(MAX);
    expect(s.get().playing).toBe(false);
    expect(s.tick(0.1)).toBe(false);
  });
  it('右端では再生を始めない', () => {
    const s = make(MAX);
    s.play();
    expect(s.get().playing).toBe(false);
    s.toggle();
    expect(s.get().playing).toBe(false);
  });
});

describe('名場面', () => {
  it('jumpScene は時刻を移し、止め、向く', () => {
    const s = make(MIN + 1e8);
    s.play();
    const seq = s.get().lookSeq;
    s.jumpScene('jupiter');
    const st = s.get();
    expect(st.et).toBe(sc('jupiter').et);
    expect(st.playing).toBe(false);
    expect(st.lookTarget).toBe('jupiter');
    expect(st.lookSeq).toBe(seq + 1);
  });
  it('nextScene / prevScene は前後の場面へ。無ければ何もしない', () => {
    const s = make(MIN);
    s.prevScene();
    expect(s.get().et).toBe(MIN);
    s.nextScene();
    expect(s.get().et).toBe(sc('jupiter').et);
    s.nextScene();
    expect(s.get().et).toBe(sc('saturn').et);
    s.prevScene();
    expect(s.get().et).toBe(sc('jupiter').et);
    s.setTime(MAX);
    s.nextScene();
    expect(s.get().et).toBe(MAX);
    s.setTime(sc('pbd').et + 2);
    s.prevScene();
    expect(s.get().et).toBe(sc('pbd').et);
  });
});

describe('subscribe', () => {
  it('変わった時だけ 1 回通知し、get は変更まで同じ物を返す', () => {
    const s = make(MIN + 1e8);
    let n = 0;
    const off = s.subscribe(() => n++);
    const a = s.get();
    expect(s.get()).toBe(a);
    s.setRate('day');
    s.setView('voyager');
    s.setTime(s.get().et);
    expect(n).toBe(0);
    s.jumpScene('saturn');
    expect(n).toBe(1);
    expect(s.get()).not.toBe(a);
    s.lookAt('earth');
    s.lookAt('earth');
    expect(n).toBe(3);
    off();
    s.setView('overview');
    expect(n).toBe(3);
  });
});
