import { describe, expect, it } from 'vitest';
import { DISPLAY_DEFAULTS, loadDisplayPrefs, saveDisplayPrefs, type PrefsStorage } from '../../src/lib/displayPrefs';
import { eventsCrossed, eventsOfScene, STANDALONE_EVENTS, STORY_EVENTS } from '../../src/lib/events';
import { SCENES } from '../../src/lib/scenes';
import { createStore } from '../../src/lib/store';
import { swingbySpeeds } from '../../src/lib/swingby';
import {
  atNacLimit,
  CRAFT_DISTANCE_DEFAULT_M,
  CRAFT_DISTANCE_MAX_M,
  displayMagnification,
  fovFromMagnification,
  MAG_MAX,
  MAG_MIN,
  zoomMagnification,
} from '../../src/lib/zoom';
import { loadFromDisk } from '../ephemeris/helpers';

const sc = (id: string) => SCENES.find((s) => s.id === id)!;
const make = () => createStore({ minEt: sc('launch').et, maxEt: sc('lightday').et, initialEt: sc('pbd').et });

describe('倍率', () => {
  it('×1 は 60 度、上限は狭角カメラの 0.42 度(×約143)', () => {
    expect(fovFromMagnification(1)).toBe(60);
    expect(fovFromMagnification(MAG_MAX)).toBeCloseTo(0.42, 9);
    expect(MAG_MAX).toBeGreaterThan(140);
    expect(MAG_MAX).toBeLessThan(145);
  });
  it('ホイールの量で倍率が変わり、限度で止まる。限度のすぐそばは限度に吸い付く', () => {
    expect(zoomMagnification(1, 0.5)).toBe(2);
    expect(zoomMagnification(1, 2)).toBe(MAG_MIN);
    expect(zoomMagnification(MAG_MAX * 0.996, 0.9999)).toBe(MAG_MAX);
    expect(zoomMagnification(100, 0.1)).toBe(MAG_MAX);
    expect(atNacLimit(MAG_MAX)).toBe(true);
    expect(atNacLimit(100)).toBe(false);
  });
  it('画面の数は 10 倍未満で小数 1 桁、10 倍以上は整数', () => {
    expect(displayMagnification(1)).toBe(1);
    expect(displayMagnification(2.345)).toBe(2.3);
    expect(displayMagnification(12.4)).toBe(12);
    expect(displayMagnification(MAG_MAX)).toBe(143);
  });
});

describe('状態(第6段階の追加)', () => {
  it('ボイジャーの視界では倍率、本体の視点では距離、引きの眺めでは何も変えない', () => {
    const s = make();
    s.zoomBy(0.5);
    expect(s.get().magnification).toBe(2);
    s.setView('craft');
    s.zoomBy(2);
    expect(s.get().craftDistance).toBe(CRAFT_DISTANCE_DEFAULT_M * 2);
    s.zoomBy(1000);
    expect(s.get().craftDistance).toBe(CRAFT_DISTANCE_MAX_M);
    s.setView('overview');
    const before = s.get();
    s.zoomBy(0.5);
    expect(s.get()).toBe(before);
  });
  it('向くと名場面への移動で倍率は変わらない(自動の望遠をしない)', () => {
    const s = make();
    s.zoomBy(0.1);
    const m = s.get().magnification;
    s.lookAt('earth');
    s.jumpScene('jupiter');
    expect(s.get().magnification).toBe(m);
  });
  it('表示の切り替えと「星空だけを表示」', () => {
    const s = make();
    expect(s.get().display).toEqual(DISPLAY_DEFAULTS);
    s.setDisplay({ orbits: false });
    expect(s.get().display).toEqual({ labels: true, orbits: false, captions: true });
    const same = s.get();
    s.setDisplay({ orbits: false });
    expect(s.get()).toBe(same);
    s.setStarsOnly(true);
    expect(s.get().starsOnly).toBe(true);
  });
  it('名場面・出来事へ移ると、移った先と通し番号が変わる', () => {
    const s = make();
    s.jumpScene('saturn');
    expect(s.get().arrival).toEqual({ kind: 'scene', id: 'saturn' });
    expect(s.get().arrivalSeq).toBe(1);
    s.jumpEvent('thrusters');
    const e = STORY_EVENTS.find((x) => x.id === 'thrusters')!;
    expect(s.get().et).toBe(e.et);
    expect(s.get().playing).toBe(false);
    expect(s.get().arrival).toEqual({ kind: 'event', id: 'thrusters' });
    expect(s.get().arrivalSeq).toBe(2);
    // look の無い出来事は向きを変えない
    const seq = s.get().lookSeq;
    s.jumpEvent('mostDistant');
    expect(s.get().lookSeq).toBe(seq);
    s.jumpEvent('titanFlyby');
    expect(s.get().lookTarget).toBe('titan');
  });
});

describe('出来事', () => {
  it('名場面に含める出来事は 5 件、単独の刻みは 4 件。時刻の順', () => {
    expect(STORY_EVENTS.length - STANDALONE_EVENTS.length).toBe(5);
    expect(STANDALONE_EVENTS.map((e) => e.id)).toEqual(['mostDistant', 'terminationShock', 'thrusters', 'memoryFix']);
    for (let i = 1; i < STORY_EVENTS.length; i++) expect(STORY_EVENTS[i].et).toBeGreaterThan(STORY_EVENTS[i - 1].et);
    expect(eventsOfScene('jupiter').map((e) => e.id)).toEqual(['jupiterRing', 'ioVolcano']);
  });
  it('通り過ぎた出来事を通った順に返す(戻る時は逆順)', () => {
    const a = sc('jupiter').et - 10 * 86400;
    const b = sc('jupiter').et + 10 * 86400;
    expect(eventsCrossed(a, b).map((e) => e.id)).toEqual(['jupiterRing', 'ioVolcano']);
    expect(eventsCrossed(b, a).map((e) => e.id)).toEqual(['ioVolcano', 'jupiterRing']);
    const ring = STORY_EVENTS.find((e) => e.id === 'jupiterRing')!;
    expect(eventsCrossed(ring.et, ring.et + 1)).toEqual([]);
    expect(eventsCrossed(ring.et - 1, ring.et).map((e) => e.id)).toEqual(['jupiterRing']);
  });
});

describe('スイングバイの速さ', () => {
  const { eph } = loadFromDisk();
  it('木星で約 13km/s から約 24km/s へ、土星で約 20km/s から約 22km/s へ速くなる', () => {
    const j = swingbySpeeds(eph, 'jupiter')!;
    expect(j.before).toBeGreaterThan(12.5);
    expect(j.before).toBeLessThan(14);
    expect(j.after).toBeGreaterThan(23);
    expect(j.after).toBeLessThan(24.5);
    const s = swingbySpeeds(eph, 'saturn')!;
    expect(s.after).toBeGreaterThan(s.before);
    expect(swingbySpeeds(eph, 'pbd')).toBeNull();
  });
});

describe('表示の切り替えを覚えておく', () => {
  const mem = (): PrefsStorage & { data: Record<string, string> } => {
    const data: Record<string, string> = {};
    return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
  };
  it('保存した値を読み戻す。壊れた値・保存先が無い時は既定', () => {
    const st = mem();
    saveDisplayPrefs({ labels: false, orbits: true, captions: false }, st);
    expect(loadDisplayPrefs(st)).toEqual({ labels: false, orbits: true, captions: false });
    st.data[Object.keys(st.data)[0]] = '{broken';
    expect(loadDisplayPrefs(st)).toEqual(DISPLAY_DEFAULTS);
    expect(loadDisplayPrefs(null)).toEqual(DISPLAY_DEFAULTS);
    const throwing: PrefsStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadDisplayPrefs(throwing)).toEqual(DISPLAY_DEFAULTS);
    expect(() => saveDisplayPrefs(DISPLAY_DEFAULTS, throwing)).not.toThrow();
  });
});
