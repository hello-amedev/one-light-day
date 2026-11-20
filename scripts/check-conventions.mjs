// 規約の検査(`npm run check` の先頭で走る)。Hanella(workshoptool/scripts/check-conventions.mjs)の
// 言語まわりの規則を、このプロジェクトの構成に合わせて移したもの。
//
// なぜあるか: 画面の文字の直書き・日本語の表記の揺れ・色やフォントの直書きは、後から直すと高くつく。
// 破るとその場で失敗する検査にして、レビューを待たずに気づけるようにする。
//
// 引っかかった時: まず docs/shared-parts.md で使う部品・辞書を探す。本当に例外にすべき時は、
// 下の rules の allow に「ファイルと理由」を足す(理由の無い例外は足さない)。
// 1 行だけの例外は、行の中か直前の行に `convention-ok: 理由` を書く。

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcDir = join(root, 'src');

/** コメントを同じ長さの空白に置き換える(行番号は保つ)。文字列の中の `://` は URL として残す */
function stripComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

const KANA_KANJI = '぀-ゟ゠-ヿ々〆一-龯';

/** @typedef {{ id: string, message: string, pattern: RegExp, in?: RegExp, allow?: Record<string, string> }} Rule */

/** @type {Rule[]} */
const rules = [
  {
    // console.* の行は開発者向けで画面に出ないため対象外
    id: 'i18n-literal',
    message: '画面に出る文言は直書きせず src/lib/i18n の辞書に置き、t() で引く(書き方は src/lib/i18n/index.ts の先頭)',
    pattern: new RegExp(`^(?!.*\\bconsole\\.).*[${KANA_KANJI}]`),
    in: /^src\/(?!lib\/i18n\/).*\.(svelte|ts)$/,
    allow: {},
  },
  {
    // 句読点・括弧だけの文字列は i18n-literal をすり抜けるが、英語では別の記号になる
    id: 'i18n-punct',
    message:
      '日本語の句読点・括弧（、。「」（）：／・など）も文言として辞書に置く。名前を並べる「、」は i18n の joinList を使う',
    pattern: /^(?!.*\bconsole\.).*[、。「」『』（）：／〜・　]/,
    in: /^src\/(?!lib\/i18n\/).*\.(svelte|ts)$/,
    allow: {},
  },
  {
    id: 'ja-paren',
    message: '日本語の文言の括弧は全角「（）」にする',
    // 括弧の中に引用符があるものはプログラムの括弧なので見ない
    pattern: new RegExp(`[${KANA_KANJI}]\\(|\\([^()'"\`\\n]*[${KANA_KANJI}][^()'"\`\\n]*\\)`),
    in: /^src\/lib\/i18n\/ja\/.*\.ts$/,
    allow: {},
  },
  {
    id: 'ja-colon',
    message: '日本語の文言のコロンは全角「：」にし、後ろに空白を入れない',
    pattern: new RegExp(`[${KANA_KANJI}]:|:[ \\t]*[${KANA_KANJI}]|：[ \\t]`),
    in: /^src\/lib\/i18n\/ja\/.*\.ts$/,
    allow: {},
  },
  {
    id: 'ja-ascii-space',
    message: '英字と日本語の間に空白を入れない(「PDFを保存」)',
    pattern: new RegExp(`[${KANA_KANJI}] [A-Za-z]|[A-Za-z] [${KANA_KANJI}]`),
    in: /^src\/lib\/i18n\/ja\/.*\.ts$/,
    allow: {},
  },
  {
    // キー名に Toast が付くものだけを見る。このプロジェクトにはまだトーストが無いが、足した時に効くよう残す
    id: 'ja-toast-period',
    message: 'トーストの文末に「。」を付けない(2 文の時も区切りの「。」だけ)',
    pattern: /\w*Toast\w*:.*。\s*['`]/,
    in: /^src\/lib\/i18n\/ja\/.*\.ts$/,
    allow: {},
  },
  {
    // 第 2 段階でトークンを差し替えるだけで見た目を変えられるように、部品に色・字体を直接書かせない
    id: 'ui-token-only',
    message: '色と font-family は src/app.css のトークン(var(--color-…)・var(--font-…))で書く。部品に直書きしない',
    pattern: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(|font-family\s*:(?!\s*var\()/,
    in: /^src\/(ui\/.*|App\.svelte)$/,
    allow: {},
  },
];

/** 行ごとの例外: 行の中か直前の行に `convention-ok: <理由>` と書く(理由は必須) */
const LINE_OK = /convention-ok:\s*\S/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(svelte|ts|js|css|html)$/.test(name) && !/\.test\.ts$/.test(name)) yield path;
  }
}

/** @type {string[]} */
const problems = [];
/** @type {Record<string, string[]>} */
const found = {};
for (const path of walk(srcDir)) {
  const rel = relative(root, path).split(sep).join('/');
  const raw = readFileSync(path, 'utf8');
  const rawLines = raw.split('\n');
  const lines = stripComments(raw).split('\n');
  for (const rule of rules) {
    if (rule.in && !rule.in.test(rel)) continue;
    if (rule.allow && rel in rule.allow) continue;
    lines.forEach((line, i) => {
      if (!rule.pattern.test(line)) return;
      if (LINE_OK.test(rawLines[i]) || (i > 0 && LINE_OK.test(rawLines[i - 1]))) return;
      (found[rule.id] ??= []).push(`${rel}:${i + 1}  ${rawLines[i].trim().slice(0, 140)}`);
    });
  }
}

for (const rule of rules) {
  const hits = found[rule.id];
  if (hits) problems.push(`[${rule.id}] ${rule.message}\n` + hits.map((h) => `    ${h}`).join('\n'));
}

if (problems.length > 0) {
  console.error('規約の検査で見つかりました(使う部品は docs/shared-parts.md):\n');
  console.error(problems.join('\n\n'));
  process.exit(1);
}
console.log(`規約の検査: OK(${rules.length} 項目)`);
