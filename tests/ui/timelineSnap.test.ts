import { describe, expect, it } from 'vitest';
import { bubbleAnchor, HOVER_RADIUS, nearestMark, snapPull, SNAP_RADIUS, type TimelineMark } from '../../src/ui/timelineSnap';

const scene = (id: string, px: number): TimelineMark => ({ kind: 'scene', id, px });
const event = (id: string, px: number): TimelineMark => ({ kind: 'event', id, px });

describe('指した刻み(PC)', () => {
  const marks = [scene('jupiter', 100), event('mostDistant', 300)];
  it('範囲の中なら刻みを返し、外なら null', () => {
    expect(nearestMark(105, marks, HOVER_RADIUS)?.id).toBe('jupiter');
    expect(nearestMark(100 + HOVER_RADIUS.scene + 1, marks, HOVER_RADIUS)).toBeNull();
    expect(nearestMark(300 + HOVER_RADIUS.event, marks, HOVER_RADIUS)?.id).toBe('mostDistant');
    expect(nearestMark(300 + HOVER_RADIUS.event + 1, marks, HOVER_RADIUS)).toBeNull();
  });
  it('刻みが重なる時は、範囲に対して一番近いほうを選ぶ', () => {
    const close = [scene('jupiter', 100), scene('saturn', 108)];
    expect(nearestMark(103, close, HOVER_RADIUS)?.id).toBe('jupiter');
    expect(nearestMark(106, close, HOVER_RADIUS)?.id).toBe('saturn');
  });
});

describe('吸い付き(スマホ)', () => {
  it('範囲の外ではつまみは指に付いてくる', () => {
    const r = snapPull(200, [scene('a', 100)]);
    expect(r).toEqual({ px: 200, mark: null });
  });
  it('範囲の縁ではつまみは飛ばず、刻みに近づくほど動きが鈍る', () => {
    const m = scene('a', 100);
    const edge = snapPull(100 + SNAP_RADIUS.scene, [m]);
    expect(edge.px).toBeCloseTo(100 + SNAP_RADIUS.scene, 9);
    const near = snapPull(104, [m]);
    expect(near.mark?.id).toBe('a');
    expect(near.px - 100).toBeLessThan(2); // 指は 4px 離れているが、つまみは 1px 足らずの所
    expect(near.px).toBeGreaterThan(100);
    // 刻みの反対側でも対称
    expect(snapPull(96, [m]).px).toBeCloseTo(200 - near.px, 9);
  });
  it('名場面は出来事より広く、強く吸い付く', () => {
    expect(SNAP_RADIUS.scene).toBeGreaterThan(SNAP_RADIUS.event);
    const d = 6;
    const sceneOffset = snapPull(100 + d, [scene('a', 100)]).px - 100;
    const eventOffset = snapPull(100 + d, [event('b', 100)]).px - 100;
    expect(sceneOffset).toBeLessThan(eventOffset);
    // 出来事の範囲(9px)の外でも、名場面ならまだ吸い付く
    expect(snapPull(100 + 12, [event('b', 100)]).mark).toBeNull();
    expect(snapPull(100 + 12, [scene('a', 100)]).mark?.id).toBe('a');
  });
  it('1 年 7px の幅で、約 10px 離れた木星と土星を選び分けられる', () => {
    const marks = [scene('jupiter', 100), scene('saturn', 110)];
    expect(snapPull(101, marks).mark?.id).toBe('jupiter');
    expect(snapPull(109, marks).mark?.id).toBe('saturn');
  });
});

describe('吹き出しの寄せ方', () => {
  it('0〜1 に収める', () => {
    expect(bubbleAnchor(-0.2)).toBe(0);
    expect(bubbleAnchor(0.4)).toBe(0.4);
    expect(bubbleAnchor(3)).toBe(1);
  });
});
