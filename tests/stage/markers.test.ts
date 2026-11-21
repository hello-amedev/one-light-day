import { describe, expect, it } from 'vitest';
import { placeLabel, priorityOf, RING_MAX_DISC_PX } from '../../src/stage/markers';

const viewport = { width: 1280, height: 800 };
const base = { radiusPx: 0, ringPx: 18, labelW: 40, viewport };

describe('名前を出す側', () => {
  it('近くの目印(太陽)が左にある時は右、右にある時は左', () => {
    expect(placeLabel({ ...base, at: { x: 600, y: 400 }, ref: { x: 540, y: 400 } })?.anchor).toBe('start');
    expect(placeLabel({ ...base, at: { x: 600, y: 400 }, ref: { x: 660, y: 400 } })?.anchor).toBe('end');
  });

  it('近くに目印が無ければ、画面の中心から遠い側', () => {
    expect(placeLabel({ ...base, at: { x: 900, y: 400 }, ref: null })?.anchor).toBe('start');
    expect(placeLabel({ ...base, at: { x: 300, y: 400 }, ref: null })?.anchor).toBe('end');
  });

  it('画面の端ではみ出すなら反対側', () => {
    expect(placeLabel({ ...base, at: { x: 1270, y: 400 }, ref: null })?.anchor).toBe('end');
    expect(placeLabel({ ...base, at: { x: 10, y: 400 }, ref: { x: 0, y: 400 } })?.anchor).toBe('start');
  });

  it('大きな円盤は輪なし。名前は縁の外側(半径 + すき間)に置く', () => {
    const r = 160;
    expect(r).toBeGreaterThan(RING_MAX_DISC_PX);
    const p = placeLabel({ ...base, at: { x: 640, y: 400 }, radiusPx: r, ringPx: 0, ref: { x: 400, y: 400 } })!;
    expect(p.anchor).toBe('start');
    expect(p.dx).toBeGreaterThan(r);
  });

  it('円盤が画面いっぱいで縁の外に入らない時は、名前を出さない', () => {
    expect(placeLabel({ ...base, at: { x: 640, y: 400 }, radiusPx: 2000, ringPx: 0, ref: null })).toBeNull();
  });
});

describe('優先度', () => {
  it('向いている相手 > 地球 > 太陽 > 木星 > 土星 > 衛星 > そのほか', () => {
    const order = [
      priorityOf('mars', 'mars'),
      priorityOf('earth', null),
      priorityOf('sun', null),
      priorityOf('jupiter', null),
      priorityOf('saturn', null),
      priorityOf('io', null),
      priorityOf('moon', null),
      priorityOf('venus', null),
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(priorityOf('io', null)).toBe(priorityOf('titan', null));
    expect(priorityOf('moon', null)).toBeLessThan(priorityOf('venus', null));
  });
});

describe('他の目印との重なり', () => {
  it('反対側に別の目印の輪があれば、重ならない側を選ぶ', () => {
    // 金星(600,400)の名前は太陽(右)の反対の左へ出したいが、そこに地球の輪(570,400)がある
    const occupied = [{ x0: 561, y0: 391, x1: 579, y1: 409, owner: 1 }];
    const p = placeLabel({ ...base, at: { x: 600, y: 400 }, ref: { x: 700, y: 400 }, occupied, owner: 0 })!;
    expect(p.anchor).toBe('start');
  });
  it('どちらも重なるなら、最初の候補(太陽の反対側)のまま', () => {
    const occupied = [
      { x0: 561, y0: 391, x1: 579, y1: 409, owner: 1 },
      { x0: 620, y0: 391, x1: 700, y1: 409, owner: 2 },
    ];
    const p = placeLabel({ ...base, at: { x: 600, y: 400 }, ref: { x: 700, y: 400 }, occupied, owner: 0 })!;
    expect(p.anchor === 'middle' || p.anchor === 'end').toBe(true);
  });
});
