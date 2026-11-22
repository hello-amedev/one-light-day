import { describe, expect, it } from 'vitest';
import { t } from '../../src/lib/i18n';
import {
  cardPosition,
  markTutorialSeen,
  spotlightRect,
  TUTORIAL_STEPS,
  tutorialSeen,
  type TutorialStorage,
} from '../../src/lib/tutorial';

function memory(): TutorialStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('使い方の案内を見たかどうか', () => {
  it('初めては未読で、覚えた後は既読になる', () => {
    const s = memory();
    expect(tutorialSeen(s)).toBe(false);
    markTutorialSeen(s);
    expect(tutorialSeen(s)).toBe(true);
  });
  it('覚えられない環境では毎回未読として扱い、例外を外に出さない', () => {
    expect(tutorialSeen(null)).toBe(false);
    const broken: TutorialStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(tutorialSeen(broken)).toBe(false);
    expect(() => markTutorialSeen(broken)).not.toThrow();
  });
});

describe('段と文言', () => {
  it('4 段で、どの段にも見出しと本文がある', () => {
    expect(TUTORIAL_STEPS).toHaveLength(4);
    for (const step of TUTORIAL_STEPS) {
      const words = t().tutorial.steps[step.id];
      expect(words.heading.length).toBeGreaterThan(0);
      expect(words.body.length).toBeGreaterThan(0);
      expect(step.targets.length).toBeGreaterThan(0);
    }
  });
  it('最後の段で、メニューの「使い方」から開き直せることを伝える', () => {
    expect(t().tutorial.steps.menu.body).toContain(t().tutorial.entry);
  });
});

describe('囲む範囲', () => {
  const vp = { width: 1000, height: 600 };
  it('部品が無い・大きさが 0 の時は null', () => {
    expect(spotlightRect([], vp, 6)).toBeNull();
    expect(spotlightRect([{ left: 10, top: 10, width: 0, height: 0 }], vp, 6)).toBeNull();
  });
  it('複数の部品をまとめ、余白を足して画面の中に収める', () => {
    const r = spotlightRect(
      [
        { left: 800, top: 2, width: 120, height: 40 },
        { left: 930, top: 4, width: 68, height: 36 },
      ],
      vp,
      6,
    );
    expect(r).toEqual({ left: 794, top: 0, width: 206, height: 48 });
  });
});

describe('札の位置', () => {
  const vp = { width: 1000, height: 600 };
  const card = { width: 300, height: 150 };
  it('上の部品なら下に、下の部品なら上に置く', () => {
    const top = cardPosition({ left: 0, top: 0, width: 200, height: 50 }, card, vp, 14, 12);
    expect(top.top).toBe(64);
    expect(top.left).toBe(12); // 左の端に寄りすぎないよう余白で止める
    const bottom = cardPosition({ left: 100, top: 540, width: 800, height: 50 }, card, vp, 14, 12);
    expect(bottom.top).toBe(540 - 14 - 150);
    expect(bottom.left).toBe(350);
  });
  it('部品が無い時は画面の中央', () => {
    expect(cardPosition(null, card, vp, 14, 12)).toEqual({ left: 350, top: 225 });
  });
});
