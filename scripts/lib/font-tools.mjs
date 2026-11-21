/**
 * フォントを絞る道具と検査で共有する部品。
 * - サイトに出る文字の集め方(辞書など、ソースの中の文字)
 * - フォントファイル(ttf / woff / woff2)の cmap(文字 → 字形の対応)を読む処理
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SUBSET_FILE = path.join(ROOT, 'src/assets/fonts/zen-kaku-gothic-new-subset.woff2');
export const SOURCE_DIR = path.join(ROOT, 'node_modules/@fontsource/zen-kaku-gothic-new/files');

/** 常に入れる文字: ASCII の印字できる文字、ひらがな・カタカナ全部、日本語の基本の記号(絞る元のフォントに無い文字は入れない) */
export function baseChars() {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(c);
  for (let c = 0x3041; c <= 0x3096; c++) set.add(c); // ひらがな
  for (let c = 0x30a1; c <= 0x30fa; c++) set.add(c); // カタカナ
  for (const ch of '、。・「」『』（）：；！？〜ー…―—　×÷°±ー') set.add(ch.codePointAt(0));
  return set;
}

/** コメントを取り除く(コメントの中の文字まで入れて太らせないため) */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, '$1');
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|svelte)$/.test(e.name)) out.push(p);
  }
}

/** サイトの中の、ASCII ではない文字(コメントを除く)。辞書だけでなく src 全体と index.html を見る */
export function collectSiteChars() {
  const files = [];
  walk(path.join(ROOT, 'src'), files);
  files.push(path.join(ROOT, 'index.html'));
  const set = new Set();
  for (const f of files) {
    for (const ch of stripComments(fs.readFileSync(f, 'utf8'))) {
      const cp = ch.codePointAt(0);
      if (cp > 0x7e) set.add(cp);
    }
  }
  return set;
}

function parseCmapTable(b) {
  const n = b.readUInt16BE(2);
  let best = null;
  for (let i = 0; i < n; i++) {
    const pid = b.readUInt16BE(4 + i * 8);
    const eid = b.readUInt16BE(6 + i * 8);
    const off = b.readUInt32BE(8 + i * 8);
    const fmt = b.readUInt16BE(off);
    const rank = fmt === 12 ? 2 : fmt === 4 && (pid === 3 || pid === 0) ? 1 : 0;
    if (rank > 0 && (!best || rank > best.rank)) best = { rank, off, fmt, eid };
  }
  const set = new Set();
  if (!best) return set;
  const o = best.off;
  if (best.fmt === 12) {
    const groups = b.readUInt32BE(o + 12);
    for (let g = 0; g < groups; g++) {
      const s = b.readUInt32BE(o + 16 + g * 12);
      const e = b.readUInt32BE(o + 20 + g * 12);
      const gid = b.readUInt32BE(o + 24 + g * 12);
      for (let c = s; c <= e; c++) if (gid + (c - s) !== 0) set.add(c);
    }
  } else {
    const segX2 = b.readUInt16BE(o + 6);
    const seg = segX2 / 2;
    const endO = o + 14;
    const startO = endO + segX2 + 2;
    const deltaO = startO + segX2;
    const rangeO = deltaO + segX2;
    for (let i = 0; i < seg; i++) {
      const end = b.readUInt16BE(endO + i * 2);
      const start = b.readUInt16BE(startO + i * 2);
      const delta = b.readInt16BE(deltaO + i * 2);
      const ro = b.readUInt16BE(rangeO + i * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let gid;
        if (ro === 0) gid = (c + delta) & 0xffff;
        else {
          const p = rangeO + i * 2 + ro + (c - start) * 2;
          gid = b.readUInt16BE(p);
          if (gid !== 0) gid = (gid + delta) & 0xffff;
        }
        if (gid !== 0) set.add(c);
      }
    }
  }
  return set;
}

function readBase128(b, pos) {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const byte = b[pos.p++];
    v = v * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return v;
  }
  throw new Error('bad UIntBase128');
}

/** ttf / woff / woff2 のバッファから、字形を持つ文字(コードポイント)の集合を返す */
export function readCmap(buf) {
  const sig = buf.toString('latin1', 0, 4);
  if (sig === 'wOF2') {
    const numTables = buf.readUInt16BE(12);
    const compSize = buf.readUInt32BE(20);
    const pos = { p: 48 };
    let cmapLen = 0;
    let cmapOff = -1;
    let acc = 0;
    for (let i = 0; i < numTables; i++) {
      const flags = buf[pos.p++];
      const idx = flags & 0x3f;
      if (idx === 63) pos.p += 4;
      const ver = flags >> 6;
      const orig = readBase128(buf, pos);
      const transformed = idx === 10 || idx === 11 ? ver === 0 : ver !== 0;
      const len = transformed ? readBase128(buf, pos) : orig;
      if (idx === 0) {
        cmapOff = acc;
        cmapLen = orig;
      }
      acc += len;
    }
    if (cmapOff < 0) throw new Error('no cmap table');
    const data = zlib.brotliDecompressSync(buf.subarray(pos.p, pos.p + compSize));
    return parseCmapTable(data.subarray(cmapOff, cmapOff + cmapLen));
  }
  if (sig === 'wOFF') {
    const n = buf.readUInt16BE(12);
    for (let i = 0; i < n; i++) {
      const e = 44 + i * 20;
      if (buf.toString('latin1', e, e + 4) !== 'cmap') continue;
      const off = buf.readUInt32BE(e + 4);
      const comp = buf.readUInt32BE(e + 8);
      const orig = buf.readUInt32BE(e + 12);
      const raw = buf.subarray(off, off + comp);
      return parseCmapTable(comp < orig ? zlib.inflateSync(raw) : raw);
    }
    throw new Error('no cmap table');
  }
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const e = 12 + i * 16;
    if (buf.toString('latin1', e, e + 4) !== 'cmap') continue;
    const off = buf.readUInt32BE(e + 8);
    return parseCmapTable(buf.subarray(off, buf.readUInt32BE(e + 12) + off));
  }
  throw new Error('no cmap table');
}

/** 絞る元(パッケージ同梱の 400 の分割ファイル)の一覧。大きい日本語の一括ファイルと latin を先に、残りは番号のファイル */
export function sourceFontFiles() {
  const all = fs.readdirSync(SOURCE_DIR).filter((f) => /-400-normal\.woff$/.test(f));
  const rank = (f) => (f.includes('-japanese-') ? 0 : f.includes('-latin-') && !f.includes('ext') ? 1 : 2);
  return all.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((f) => path.join(SOURCE_DIR, f));
}

export function cpToChar(cp) {
  return String.fromCodePoint(cp);
}
