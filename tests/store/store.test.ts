import { describe, expect, it } from 'vitest';
import { createStore, RATE_SECONDS } from '../../src/lib/store';
import { SCENES } from '../../src/lib/scenes';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { INTRO_RUN_SECONDS, INTRO_TITLE_SECONDS } from '../../src/lib/intro';

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
  it('右端で再生を押すと、初めに戻って再生する(play と toggle の両方)', () => {
    const s = make(MAX);
    s.play();
    expect(s.get()).toMatchObject({ et: MIN, playing: true });
    const t = make(MAX);
    t.toggle();
    expect(t.get()).toMatchObject({ et: MIN, playing: true });
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
  it('nextScene / prevScene は前後の名場面か出来事へ(名場面に含まれる出来事にも止まる)。無ければ何もしない', () => {
    const s = make(MIN);
    s.prevScene();
    expect(s.get().et).toBe(MIN);
    const arrived = () => s.get().arrival;
    s.nextScene();
    expect(arrived()).toEqual({ kind: 'event', id: 'earthMoonPhoto' });
    s.nextScene();
    expect(arrived()).toEqual({ kind: 'event', id: 'jupiterRing' });
    s.nextScene();
    expect(arrived()).toEqual({ kind: 'scene', id: 'jupiter' });
    expect(s.get().et).toBe(sc('jupiter').et);
    s.nextScene();
    expect(arrived()).toEqual({ kind: 'event', id: 'ioVolcano' });
    s.nextScene();
    expect(arrived()).toEqual({ kind: 'event', id: 'titanFlyby' });
    s.nextScene();
    expect(s.get().et).toBe(sc('saturn').et);
    s.prevScene();
    expect(arrived()).toEqual({ kind: 'event', id: 'titanFlyby' });
    s.jumpScene('jupiter');
    s.prevScene();
    expect(arrived()).toEqual({ kind: 'event', id: 'jupiterRing' });
    s.jumpScene('jupiter');
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

/** 現実の 1/60 秒刻みで再生し、速さ(現実の 1 秒あたりに進む秒数)の列を返す */
function run(s: ReturnType<typeof make>, seconds: number): number[] {
  const rates: number[] = [];
  for (let i = 0; i < seconds * 60; i++) {
    const before = s.get().et;
    s.tick(1 / 60);
    rates.push((s.get().et - before) * 60);
  }
  return rates;
}

describe('速度の配分(ふだんの再生)', () => {
  const YEAR = RATE_SECONDS.year;

  it('どの名場面の手前からでも、1 秒＝1 年の再生で前後 6 秒以内に抜けて元の速さへ戻る', () => {
    for (const scene of SCENES) {
      const s = make(Math.max(MIN, scene.et - 200 * 86400));
      s.setRate('year');
      s.play();
      let slowStart = -1;
      let slowEnd = -1;
      for (let i = 0; i < 60 * 30 && s.get().playing; i++) {
        const before = s.get().et;
        s.tick(1 / 60);
        const rate = (s.get().et - before) * 60;
        const t = i / 60;
        if (rate < YEAR * 0.95 && slowStart < 0) slowStart = t;
        if (rate < YEAR * 0.95) slowEnd = t;
        if (s.get().et > scene.et + 400 * 86400) break;
      }
      // 終わりが今日(右端)の場面は、通り過ぎた後が無いので所要時間は見ない
      if (scene.et >= MAX - 86400) continue;
      expect(slowEnd - slowStart, scene.id).toBeLessThanOrEqual(6);
    }
  });
  it('名場面のちょうどから再生を始めると、2 秒後には選んだ速さの 8 割以上', () => {
    for (const id of ['launch', 'jupiter', 'pbd']) {
      const s = make(MIN);
      s.jumpScene(id as never);
      s.setRate('year');
      s.play();
      const rates = run(s, 2);
      expect(rates[rates.length - 1], id).toBeGreaterThanOrEqual(YEAR * 0.8);
    }
  });
  it('打ち上げの場面から 1 秒＝1 年で再生すると、4 秒で 1978 年へ進む', () => {
    const s = make(MIN);
    s.jumpScene('launch');
    s.setRate('year');
    s.play();
    run(s, 4);
    expect(s.get().et).toBeGreaterThan(sc('launch').et + 0.5 * YEAR);
  });
  it('通り過ぎた後は減速しない(場面の後ろでは近づく減速がかからない)', () => {
    const pbd = sc('pbd');
    const s = make(pbd.et + 30 * 86400);
    s.setRate('year');
    s.play();
    const rates = run(s, 1);
    expect(rates[rates.length - 1]).toBeCloseTo(YEAR, -3);
  });
  it('1 秒＝1 日以下は何も変えない', () => {
    const s = make(sc('jupiter').et);
    s.setRate('day');
    s.play();
    for (const r of run(s, 1)) expect(r).toBeCloseTo(RATE_SECONDS.day, 0);
  });
});

describe('開いた直後の自動再生', () => {
  const SPAN = MAX - MIN;
  it('startIntro で打ち上げの日・引きの眺め・題字の段階から始まり、題字の間は時刻が動かない', () => {
    const s = make(MAX);
    s.startIntro();
    const st = s.get();
    expect(st.et).toBe(MIN);
    expect(st.view).toBe('overview');
    expect(st.playing).toBe(true);
    expect(st.intro).toBe('title');
    run(s, 2.5);
    expect(s.get().et).toBe(MIN);
    expect(s.get().intro).toBe('title');
  });
  it('題字のあと早回しに入り、時刻が進む。山場は全体の約 4 割の時間で 1981 年へ', () => {
    const s = make(MAX);
    s.startIntro();
    run(s, 3.2);
    expect(s.get().intro).toBe('run');
    run(s, INTRO_RUN_SECONDS * 0.4);
    // 題字の後の 0.2 秒 + 早回しの 4 割
    expect(s.get().et).toBeGreaterThan(etFromIso('1980-06-01T00:00:00Z'));
    expect(s.get().et).toBeLessThan(etFromIso('1982-06-01T00:00:00Z'));
  });
  it('自動再生中は名場面の減速が働かない(速さは配分だけで決まる)', () => {
    const s = make(MAX);
    s.startIntro();
    run(s, 3.1);
    // 打ち上げの直後でも、最初の山場の一定の速さ(後の名場面でも同じ)
    const a = run(s, 0.5);
    const b = run(s, 0.5);
    expect(a[a.length - 1]).toBeCloseTo(b[0], -3);
    expect(a[a.length - 1]).toBeGreaterThan(1e6);
  });
  it('終わったら今日で止まり、playing が false、段階は done', () => {
    const s = make(MAX);
    s.startIntro();
    run(s, INTRO_TITLE_SECONDS + INTRO_RUN_SECONDS + 1);
    const st = s.get();
    expect(st.et).toBe(MAX);
    expect(st.playing).toBe(false);
    expect(st.intro).toBe('done');
  });
  it('stopIntro でその場で止まり、操作を渡す', () => {
    const s = make(MAX);
    s.startIntro();
    run(s, 10);
    const et = s.get().et;
    expect(et).toBeGreaterThan(MIN);
    s.stopIntro();
    expect(s.get().intro).toBe('off');
    expect(s.get().playing).toBe(false);
    run(s, 1);
    expect(s.get().et).toBe(et);
    expect(et).toBeLessThan(SPAN + MIN);
  });
  it('案内(done)は stopIntro で閉じる。操作(setTime など)でも自動再生は終わる', () => {
    const a = make(MAX);
    a.startIntro();
    run(a, INTRO_TITLE_SECONDS + INTRO_RUN_SECONDS + 1);
    a.stopIntro();
    expect(a.get().intro).toBe('off');
    expect(a.get().et).toBe(MAX);
    const b = make(MAX);
    b.startIntro();
    run(b, 5);
    b.setTime(sc('pbd').et);
    expect(b.get().intro).toBe('off');
  });
  it('skipIntro は再生せず、今日の引きの眺めで案内の段階にする', () => {
    const s = make(MIN);
    s.skipIntro();
    expect(s.get()).toMatchObject({ et: MAX, view: 'overview', playing: false, intro: 'done' });
  });
});

describe('名場面から移った後の向き', () => {
  it('名場面の減速の範囲の中では追い続け、外へ出たら追うのをやめる', () => {
    const s = make(MIN);
    s.jumpScene('jupiter');
    expect(s.get().lookTarget).toBe('jupiter');
    const seq = s.get().lookReleaseSeq;
    s.setTime(sc('jupiter').et + sc('jupiter').slowWindow - 1);
    expect(s.get().lookTarget).toBe('jupiter');
    expect(s.get().lookReleaseSeq).toBe(seq);
    s.setTime(sc('jupiter').et + sc('jupiter').slowWindow + 1);
    expect(s.get()).toMatchObject({ lookTarget: null, lookHold: null, lookReleaseSeq: seq + 1 });
  });
  it('再生で範囲を出た時も、追うのをやめる', () => {
    const s = make(MIN);
    s.jumpScene('jupiter');
    s.setRate('year');
    s.play();
    for (let i = 0; i < 50 && s.get().lookTarget; i++) s.tick(0.1);
    expect(s.get().lookTarget).toBeNull();
    expect(s.get().et).toBeGreaterThan(sc('jupiter').et + sc('jupiter').slowWindow);
  });
  it('出来事から移った時は、その出来事の名場面の範囲で追う', () => {
    const s = make(MIN);
    s.jumpEvent('ioVolcano');
    expect(s.get().lookHold).toEqual({ t0: sc('jupiter').et - sc('jupiter').slowWindow, t1: sc('jupiter').et + sc('jupiter').slowWindow });
  });
  it('「向く」で選んだ相手は、時刻を動かしても追い続ける', () => {
    const s = make(MIN);
    s.jumpScene('jupiter');
    s.lookAt('saturn');
    s.setTime(MAX);
    expect(s.get().lookTarget).toBe('saturn');
  });
});

describe('最初からやり直す(左上の題字)', () => {
  it('開いた直後の状態に戻して題字から自動再生する。表示の切り替えは残す', () => {
    const s = make(MIN);
    s.jumpScene('saturn');
    s.setView('craft');
    s.zoomBy(0.5);
    s.setStarsOnly(true);
    s.setRate('year');
    s.setDisplay({ orbits: false });
    const seq = s.get().resetSeq;
    s.restart();
    const st = s.get();
    expect(st.et).toBe(MIN);
    expect(st.playing).toBe(true);
    expect(st.intro).toBe('title');
    expect(st.view).toBe('overview');
    expect(st.lookTarget).toBeNull();
    expect(st.lookHold).toBeNull();
    expect(st.starsOnly).toBe(false);
    expect(st.rate).toBe('day');
    expect(st.arrival).toBeNull();
    expect(st.display.orbits).toBe(false);
    expect(st.resetSeq).toBe(seq + 1);
  });
  it('still なら再生せず、今日の引きの眺めで止める', () => {
    const s = make(MIN);
    s.jumpScene('saturn');
    s.restart(true);
    expect(s.get().et).toBe(MAX);
    expect(s.get().playing).toBe(false);
    expect(s.get().intro).toBe('done');
    expect(s.get().view).toBe('overview');
  });
});
