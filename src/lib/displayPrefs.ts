// 表示の切り替え(メニューの「天体の名前と目印」「惑星の軌道」「名場面と出来事の文」)を、そのブラウザに覚えておく。
// 覚えられない環境(プライベートの窓・保存の禁止)でも、既定の値で必ず動く。
import type { DisplayPrefs } from './store/types';

export const DISPLAY_DEFAULTS: DisplayPrefs = { labels: true, orbits: true, captions: true };

const KEY = 'one-light-day.display.v1';

/** 保存先の最小の形(テストで差し替えるため、Storage そのものに依存しない) */
export interface PrefsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): PrefsStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadDisplayPrefs(storage: PrefsStorage | null = defaultStorage()): DisplayPrefs {
  if (!storage) return { ...DISPLAY_DEFAULTS };
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { ...DISPLAY_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Record<keyof DisplayPrefs, unknown>>;
    const out = { ...DISPLAY_DEFAULTS };
    for (const k of Object.keys(DISPLAY_DEFAULTS) as (keyof DisplayPrefs)[]) {
      if (typeof parsed[k] === 'boolean') out[k] = parsed[k] as boolean;
    }
    return out;
  } catch {
    return { ...DISPLAY_DEFAULTS };
  }
}

export function saveDisplayPrefs(prefs: DisplayPrefs, storage: PrefsStorage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // 保存できなくても画面の動きは変えない
  }
}
