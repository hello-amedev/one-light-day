import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { SCENES } from '../../src/lib/scenes';
import { createStore } from '../../src/lib/store';
import { applyUrlState, parseUrlState, sceneAtState, syncSceneUrl, withScene } from '../../src/lib/urlState';

const sc = (id: string) => SCENES.find((s) => s.id === id)!;
const MIN = sc('launch').et;
const MAX = sc('lightday').et + 5 * 86400;
const make = () => createStore({ minEt: MIN, maxEt: MAX, initialEt: MAX });

describe('?scene= を読む', () => {
  it('6 つの名場面の ID を読む', () => {
    for (const s of SCENES) expect(parseUrlState(`?scene=${s.id}`).scene).toBe(s.id);
  });
  it('知らない ID・空は無視する', () => {
    expect(parseUrlState('?scene=pluto').scene).toBeUndefined();
    expect(parseUrlState('?scene=').scene).toBeUndefined();
  });
  it('ほかの項目と一緒でも読める', () => {
    expect(parseUrlState('?debug&scene=saturn&view=overview')).toMatchObject({ scene: 'saturn', view: 'overview' });
  });
});

describe('名場面から始める', () => {
  it('その時刻・向く相手・ボイジャーの視界で、再生は止まっている', () => {
    const s = make();
    applyUrlState(s, '?scene=saturn');
    expect(s.get().et).toBe(sc('saturn').et);
    expect(s.get().lookTarget).toBe('saturn');
    expect(s.get().view).toBe('voyager');
    expect(s.get().playing).toBe(false);
    expect(s.get().intro).toBe('off');
  });
  it('scene と t が両方ある時は scene を優先する', () => {
    const s = make();
    applyUrlState(s, '?t=1985-01-01T00:00:00Z&scene=jupiter');
    expect(s.get().et).toBe(sc('jupiter').et);
  });
  it('scene が不正なら t が働く', () => {
    const s = make();
    applyUrlState(s, '?t=1985-01-01T00:00:00Z&scene=pluto');
    expect(s.get().et).toBe(etFromIso('1985-01-01T00:00:00Z'));
  });
  it('今までの ?t ?view ?look は変わらず働く', () => {
    const s = make();
    applyUrlState(s, '?t=1990-02-14T04:48:00Z&view=overview&look=earth');
    expect(s.get()).toMatchObject({ et: etFromIso('1990-02-14T04:48:00Z'), view: 'overview', lookTarget: 'earth' });
  });
});

describe('withScene', () => {
  it('scene を付ける。古い scene と t は外し、ほかは書かれたまま残す', () => {
    expect(withScene('', 'saturn')).toBe('?scene=saturn');
    expect(withScene('?debug', 'saturn')).toBe('?debug&scene=saturn');
    expect(withScene('?t=1985-01-01T00:00:00Z&scene=jupiter&intro=0', 'pbd')).toBe('?intro=0&scene=pbd');
  });
  it('null なら scene だけを外す。t は付け足さない', () => {
    expect(withScene('?scene=saturn', null)).toBe('');
    expect(withScene('?debug&scene=saturn&stars=deep', null)).toBe('?debug&stars=deep');
    expect(withScene('?t=1985-01-01T00:00:00Z', null)).toBe('?t=1985-01-01T00:00:00Z');
  });
});

describe('sceneAtState', () => {
  it('名場面の時刻に止まっている時だけ ID を返す', () => {
    expect(sceneAtState({ et: sc('pbd').et, playing: false })).toBe('pbd');
    expect(sceneAtState({ et: sc('pbd').et + 0.5, playing: false })).toBe('pbd');
    expect(sceneAtState({ et: sc('pbd').et + 60, playing: false })).toBeNull();
    expect(sceneAtState({ et: sc('pbd').et, playing: true })).toBeNull();
  });
});

describe('アドレスバーの書き換え', () => {
  function setup(search: string) {
    const loc = { pathname: '/voyager/', search, hash: '' };
    const calls: string[] = [];
    const history = {
      replaceState(_d: unknown, _u: string, url: string) {
        calls.push(url);
        loc.search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
      },
    };
    const store = make();
    const stop = syncSceneUrl(store, { location: loc, history });
    return { store, calls, loc, stop };
  }

  it('名場面へ移ると ?scene= に、離れると外す', () => {
    const { store, calls, stop } = setup('?debug');
    store.jumpScene('saturn');
    expect(calls).toEqual(['/voyager/?debug&scene=saturn']);
    store.stepTime(86400);
    expect(calls[1]).toBe('/voyager/?debug');
    stop();
  });
  it('次の名場面・前の名場面でも書き換わる', () => {
    const { store, calls } = setup('');
    // 木星の後は出来事(イオの火山)に止まる。出来事では scene を外す
    store.setTime(sc('jupiter').et + 100);
    store.prevScene();
    store.nextScene();
    expect(calls).toEqual(['/voyager/?scene=jupiter', '/voyager/']);
  });
  it('名場面から名場面へ移る時は 1 回だけ書き換える', () => {
    const { store, calls } = setup('?scene=jupiter');
    store.jumpScene('jupiter');
    expect(calls).toEqual([]);
    store.jumpScene('saturn');
    expect(calls).toEqual(['/voyager/?scene=saturn']);
  });
  it('再生で通り過ぎる間は書き換えない', () => {
    const { store, calls } = setup('');
    store.setTime(sc('saturn').et - 30);
    store.play();
    store.tick(0.05);
    expect(calls).toEqual([]);
  });
  it('止めると呼ばれなくなる', () => {
    const { store, calls, stop } = setup('');
    stop();
    store.jumpScene('pbd');
    expect(calls).toEqual([]);
  });
});
