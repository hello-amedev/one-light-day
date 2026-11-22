// 使い方の案内の決まり(画面に依存しない純粋な関数と、見たかどうかの記録)。
// 表示は src/ui/Tutorial.svelte。文言は t().tutorial。
// 初めて来た人の自動再生が今日で止まった後に 1 回だけ自動で出す。見たことはブラウザに覚え、2 回目からは出さない。

/** 段の並び。target は明るく残す部品の data-tour の値(複数なら囲む範囲をまとめる) */
export const TUTORIAL_STEPS = [
  { id: 'timeline', targets: ['timeline'] },
  { id: 'views', targets: ['views'] },
  { id: 'look', targets: ['look'] },
  { id: 'menu', targets: ['date', 'menu'] },
] as const;

export type TutorialStepId = (typeof TUTORIAL_STEPS)[number]['id'];

const KEY = 'one-light-day.tutorial.v1';

/** 保存先の最小の形(テストで差し替えるため、Storage そのものに依存しない) */
export interface TutorialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): TutorialStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** もう見たか。覚えられない環境(プライベートの窓・保存の禁止)では false(毎回出す) */
export function tutorialSeen(storage: TutorialStorage | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** 見たことを覚える。保存できなくても画面の動きは変えない */
export function markTutorialSeen(storage: TutorialStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, '1');
  } catch {
    // 保存できない環境では何もしない
  }
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 囲む範囲を、部品の外側に pad だけ広げてまとめ、画面の中に収める。部品が 1 つも無ければ null */
export function spotlightRect(rects: Rect[], viewport: { width: number; height: number }, pad: number): Rect | null {
  const shown = rects.filter((r) => r.width > 0 && r.height > 0);
  if (shown.length === 0) return null;
  const left = Math.max(0, Math.min(...shown.map((r) => r.left)) - pad);
  const top = Math.max(0, Math.min(...shown.map((r) => r.top)) - pad);
  const right = Math.min(viewport.width, Math.max(...shown.map((r) => r.left + r.width)) + pad);
  const bottom = Math.min(viewport.height, Math.max(...shown.map((r) => r.top + r.height)) + pad);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/**
 * 札を置く位置(左上の座標)。囲む範囲が画面の上半分にあれば下に、下半分にあれば上に置き、
 * 横は囲む範囲の中央にそろえて画面の端から margin だけ離す。範囲が無い時は画面の中央。
 */
export function cardPosition(
  spot: Rect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  gap: number,
  margin: number,
): { left: number; top: number } {
  const clampX = (x: number) => Math.min(Math.max(margin, x), Math.max(margin, viewport.width - card.width - margin));
  const clampY = (y: number) => Math.min(Math.max(margin, y), Math.max(margin, viewport.height - card.height - margin));
  if (!spot) {
    return { left: clampX((viewport.width - card.width) / 2), top: clampY((viewport.height - card.height) / 2) };
  }
  const centerX = spot.left + spot.width / 2;
  const below = spot.top + spot.height / 2 < viewport.height / 2;
  const top = below ? spot.top + spot.height + gap : spot.top - gap - card.height;
  return { left: clampX(centerX - card.width / 2), top: clampY(top) };
}
