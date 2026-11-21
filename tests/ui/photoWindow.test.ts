import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris/time';
import { SCENES } from '../../src/lib/scenes';
import { photoWindowAvailable, placePhotoWindow } from '../../src/ui/photoWindow';
import { sceneJumpedTo } from '../../src/ui/sceneCaption';

const pbd = etFromIso('1990-02-14T04:48:00Z');

describe('写真の窓が開く条件', () => {
  it('ボイジャーの視界で、名場面の前後 1 日以内で、地球を向いている時', () => {
    expect(photoWindowAvailable({ view: 'voyager', et: pbd, lookTarget: 'earth' })).toBe(true);
    expect(photoWindowAvailable({ view: 'voyager', et: pbd + 86400, lookTarget: 'earth' })).toBe(true);
    expect(photoWindowAvailable({ view: 'voyager', et: pbd - 86400, lookTarget: 'earth' })).toBe(true);
  });
  it('1 日を超える・引きの眺め・地球以外を向く・何も向いていない時は開かない', () => {
    expect(photoWindowAvailable({ view: 'voyager', et: pbd + 86401, lookTarget: 'earth' })).toBe(false);
    expect(photoWindowAvailable({ view: 'voyager', et: pbd - 86401, lookTarget: 'earth' })).toBe(false);
    expect(photoWindowAvailable({ view: 'overview', et: pbd, lookTarget: 'earth' })).toBe(false);
    expect(photoWindowAvailable({ view: 'voyager', et: pbd, lookTarget: 'sun' })).toBe(false);
    expect(photoWindowAvailable({ view: 'voyager', et: pbd, lookTarget: null })).toBe(false);
  });
});

describe('写真の窓を置く場所', () => {
  const reserve = { top: 96, bottom: 170, side: 16 };
  const size = { w: 272, h: 380 };
  it('PC は右。地球の目印が右にある時は左', () => {
    const vp = { width: 1280, height: 800 };
    const r = placePhotoWindow({ viewport: vp, portrait: false, size, reserve, earth: { x: 640, y: 400 } });
    expect(r.x).toBe(1280 - 16 - 272);
    expect(r.edge).toBe('left');
    const l = placePhotoWindow({ viewport: vp, portrait: false, size, reserve, earth: { x: 1100, y: 400 } });
    expect(l.x).toBe(16);
  });
  it('スマホの縦画面は、地球の目印と離れた上か下。操作の部品の上に出ない', () => {
    const vp = { width: 390, height: 844 };
    const small = { w: 336, h: 190 };
    const res = { top: 96, bottom: 250, side: 16 };
    const a = placePhotoWindow({ viewport: vp, portrait: true, size: small, reserve: res, earth: { x: 195, y: 422 } });
    expect(a.y).toBe(96);
    const b = placePhotoWindow({ viewport: vp, portrait: true, size: small, reserve: res, earth: { x: 195, y: 180 } });
    expect(b.y + b.h).toBeLessThanOrEqual(844 - 250);
  });
});

describe('名場面の文を出す条件', () => {
  const jup = SCENES.find((s) => s.id === 'jupiter')!;
  it('名場面へ移った時だけ(向くの通し番号が増え、時刻が名場面の時刻になる)', () => {
    expect(sceneJumpedTo({ et: 0, lookSeq: 1 }, { et: jup.et, lookSeq: 2 })).toBe('jupiter');
  });
  it('再生で通り過ぎた時(通し番号が同じ)は出さない', () => {
    expect(sceneJumpedTo({ et: jup.et - 10, lookSeq: 2 }, { et: jup.et, lookSeq: 2 })).toBeNull();
  });
  it('向くボタンだけを押した時(時刻が同じ)や、名場面でない時刻へ移った時は出さない', () => {
    expect(sceneJumpedTo({ et: jup.et, lookSeq: 2 }, { et: jup.et, lookSeq: 3 })).toBeNull();
    expect(sceneJumpedTo({ et: 0, lookSeq: 1 }, { et: 12345, lookSeq: 2 })).toBeNull();
  });
});
