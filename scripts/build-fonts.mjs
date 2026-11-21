/**
 * 日本語フォント(Zen Kaku Gothic New 400)を、サイトで使う文字だけの 1 ファイル(woff2)に絞る。
 *
 * 入れる文字 = ASCII の印字できる文字 + ひらがな・カタカナ + 日本語の基本の記号 + src と index.html の中の文字(コメントを除く)。
 * 辞書に文言が増えたら、`npm run build` の前(prebuild)に自動で作り直す。足りない文字が無ければ何もしない。
 * 元のフォントはパッケージ(@fontsource)の中のファイルだけを使い、外へはダウンロードしない。
 *
 * 絞るのは npm の subset-font(HarfBuzz を WebAssembly にしたもの)。Python の fontTools は woff2 の出力に
 * brotli が要り、環境ごとに入れ方が違うので使わない(`npm ci` だけで動くようにするため)。
 */
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';
import { SOURCE_DIR, SUBSET_FILE, baseChars, collectSiteChars, cpToChar, readCmap, sourceFontFiles } from './lib/font-tools.mjs';

const force = process.argv.includes('--force');

const site = collectSiteChars();
const sources = sourceFontFiles().map((f) => ({ file: f, cmap: readCmap(fs.readFileSync(f)) }));
const main = sources[0]; // 日本語の一括ファイル(約 6900 字)
if (!main.file.includes('-japanese-')) throw new Error(`japanese font file not found in ${SOURCE_DIR}`);

// 一括ファイルに無いサイトの文字: 他の分割ファイルにあれば、ここでは入れられないので失敗にする(足す方法は下に書く)
const needInOthers = [];
const notInAny = [];
for (const cp of site) {
  if (main.cmap.has(cp)) continue;
  if (sources.some((s) => s.cmap.has(cp))) needInOthers.push(cp);
  else notInAny.push(cp);
}
if (needInOthers.length) {
  console.error(
    `fonts: 次の文字は一括ファイルに無く、分割ファイルにだけある: ${needInOthers.map(cpToChar).join('')}\n` +
      '  scripts/build-fonts.mjs が 1 ファイルから絞る作りのため、複数のファイルを合わせる処理を足す必要がある',
  );
  process.exit(1);
}
if (notInAny.length) {
  console.warn(`fonts: 元のフォントに字形が無い文字(端末のフォントで出る): ${notInAny.map(cpToChar).join('')}`);
}

const wanted = new Set([...baseChars(), ...site].filter((cp) => main.cmap.has(cp)));

// 今のファイルが過不足なければ作り直さない
if (!force && fs.existsSync(SUBSET_FILE)) {
  const have = readCmap(fs.readFileSync(SUBSET_FILE));
  const same = have.size === wanted.size && [...wanted].every((cp) => have.has(cp));
  if (same) {
    console.log(`fonts: 最新(${wanted.size} 字, ${(fs.statSync(SUBSET_FILE).size / 1024).toFixed(1)}KB)`);
    process.exit(0);
  }
}

const text = [...wanted].sort((a, b) => a - b).map(cpToChar).join('');
// 一括ファイルは woff2 版を使う(同じ字形。読み込みが速い)
const srcFile = main.file.replace(/\.woff$/, '.woff2');
const out = await subsetFont(fs.readFileSync(fs.existsSync(srcFile) ? srcFile : main.file), text, { targetFormat: 'woff2' });
fs.mkdirSync(path.dirname(SUBSET_FILE), { recursive: true });
fs.writeFileSync(SUBSET_FILE, out);
console.log(`fonts: 作り直した(${wanted.size} 字, ${(out.length / 1024).toFixed(1)}KB) → ${path.relative(process.cwd(), SUBSET_FILE)}`);
