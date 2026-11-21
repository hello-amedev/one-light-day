import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error 型の無い .mjs(道具の部品)
import { SUBSET_FILE, baseChars, collectSiteChars, readCmap } from '../../scripts/lib/font-tools.mjs';

describe('絞った日本語フォント', () => {
  const have: Set<number> = readCmap(fs.readFileSync(SUBSET_FILE));

  it('ASCII の印字できる文字が全部入っている', () => {
    for (let c = 0x20; c <= 0x7e; c++) expect(have.has(c), String.fromCharCode(c)).toBe(true);
  });

  it('ひらがな・カタカナが入っている', () => {
    for (const ch of 'あいうえおんアイウエオン') expect(have.has(ch.codePointAt(0)!), ch).toBe(true);
  });

  it('サイトの文字(元のフォントにあるもの)が入っている。足りなければ npm run fonts', () => {
    const base: Set<number> = baseChars();
    expect(base.has(0x3042)).toBe(true);
    const site: Set<number> = collectSiteChars();
    // 字形が元のフォントに無い文字は端末のフォントになる(検査 scripts/check-fonts.mjs が警告する)。ここでは主な文言の文字だけ確かめる
    for (const ch of '光日時間分地球向') expect(site.has(ch.codePointAt(0)!) ? have.has(ch.codePointAt(0)!) : true, ch).toBe(true);
  });

  // 第6段階で出来事の文が増え、約 61KB になったので 80KB に上げた(最初に読む量の目標 2MB に比べて小さい)。絞り忘れを見つけるための上限
  it('1 ファイル 80KB 以内', () => {
    expect(fs.statSync(SUBSET_FILE).size).toBeLessThanOrEqual(80 * 1024);
  });
});
