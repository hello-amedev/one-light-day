/**
 * 画面に出る文言の置き場(多言語の入口)。Hanella の方式を写した。
 *
 * 使い方 — 各ファイルの先頭で、使う領域だけを取り出す:
 *
 *   import { t } from '../lib/i18n';
 *   const txt = t().hud;
 *
 * ## 決まり
 *
 * - 受ける変数は `txt`(共通は `com`)にそろえる
 * - 使うたびに t() を呼ぶ。読み込み時に定数へ固めない(言語が決まる前の値で固まる)
 * - 値の入る文は、値を受け取って文を丸ごと返す関数にする(語順が言語で変わるため)
 * - 日本語を正とする。英語を足す時は `en/` を `ja/` と同じ形で作り、DICTIONARIES に並べる。
 *   Locale に 'en' を足した時点で、DICTIONARIES に en が無ければ・形がずれていれば型チェックで落ちる
 * - 英語の辞書は画面が固まってから、まとめて作る(i18n-conventions.md §1-8)
 * - 言語で変わる処理(日付・距離・時間の整形)は src/lib/format.ts に集める
 */
import { ja } from './ja';

/** 使える言語。足したら DICTIONARIES にも書かないと型が通らない */
export type Locale = 'ja';

export const AVAILABLE_LOCALES: readonly Locale[] = ['ja'];

/** 文言の形。日本語版を正とし、他の言語はこれと同じ形で書く */
export type Strings = typeof ja;

const DICTIONARIES: Record<Locale, Strings> = { ja };

let resolved: Locale | null = null;

function detectLocale(): Locale {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'ja';
  return AVAILABLE_LOCALES.find((l) => lang.toLowerCase().startsWith(l)) ?? 'ja';
}

/** 表示言語。最初に呼ばれた時に 1 回だけ決め、切り替えは再読み込みで反映する */
export function currentLocale(): Locale {
  resolved ??= detectLocale();
  return resolved;
}

/** 表示言語の文言を引く */
export function t(): Strings {
  return DICTIONARIES[currentLocale()];
}

/** 名前を表示言語の区切りで並べる */
export function joinList(items: readonly string[]): string {
  return items.join(t().common.listSeparator);
}
