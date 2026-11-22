/**
 * 絞った日本語フォントに、サイトで使う文字が全部入っているかを確かめる。
 * 足りない文字は端末のフォントで出てしまい、そこだけ見た目が変わるため。
 * 直し方: `npm run fonts`(scripts/build-fonts.mjs)で作り直す。
 */
import fs from 'node:fs';
import { SUBSET_FILE, baseChars, collectSiteChars, cpToChar, readCmap, sourceFontFiles } from './lib/font-tools.mjs';

if (!fs.existsSync(SUBSET_FILE)) {
  console.error('fonts: 絞ったフォントが無い。`npm run fonts` で作る');
  process.exit(1);
}
const have = readCmap(fs.readFileSync(SUBSET_FILE));
const site = collectSiteChars();

// 絞る元のフォントにも字形が無い文字は、どうしても端末のフォントになる(警告だけ)
const original = new Set();
for (const f of sourceFontFiles()) for (const cp of readCmap(fs.readFileSync(f))) original.add(cp);

const missing = [...site].filter((cp) => original.has(cp) && !have.has(cp));
const noGlyph = [...site].filter((cp) => !original.has(cp));
// 常に入れる文字は、絞る元の一括ファイルにあるものだけを求める(build-fonts.mjs と同じ基準。分割ファイルにだけある記号は入れない)
const main = readCmap(fs.readFileSync(sourceFontFiles()[0]));
const baseMissing = [...baseChars()].filter((cp) => main.has(cp) && !have.has(cp));

if (noGlyph.length) console.warn(`fonts: 元のフォントに字形が無い文字(端末のフォントで出る): ${noGlyph.map(cpToChar).join('')}`);
if (missing.length || baseMissing.length) {
  const list = [...new Set([...missing, ...baseMissing])];
  console.error(`fonts: 絞ったフォントに無い文字がある: ${list.map((cp) => `${cpToChar(cp)}(U+${cp.toString(16).toUpperCase()})`).join(' ')}`);
  console.error('  `npm run fonts` で作り直し、できたファイルをコミットする');
  process.exit(1);
}
console.log(`fonts: OK(サイトの文字 ${site.size} 字が、絞ったフォント ${have.size} 字に入っている)`);
