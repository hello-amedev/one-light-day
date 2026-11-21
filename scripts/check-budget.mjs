/**
 * ビルドの後に dist/ を見て、読み込む量が目標に収まっているかを表で出す(SPEC.md「快適さの目標」)。
 * - 最初に読み込む量: index.html、index.html から読む JS と CSS(gzip の大きさ)、位置データ data/eph/*、星 data/stars/stars.bin、フォント(woff2)
 * - すべて合わせた量: dist/ 全体(JS・CSS・HTML・SVG は gzip の大きさ、画像やデータは元のまま)
 * 超えたら終了コード 1。
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const FIRST_LIMIT = 2 * 1024 * 1024;
const TOTAL_LIMIT = 20 * 1024 * 1024;

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('budget: dist/ が無い。先に npm run build を実行する');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(DIST, p).split(path.sep).join('/');
/** 転送される大きさ: テキスト系は gzip、画像・バイナリ・フォントはそのまま */
function size(f) {
  const buf = fs.readFileSync(f);
  return /\.(js|css|html|svg|mjs)$/.test(f) ? zlib.gzipSync(buf, { level: 9 }).length : buf.length;
}

const files = walk(DIST);
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const entry = new Set(['index.html']);
for (const m of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|mjs))"/g)) {
  const p = path.normalize(path.join('.', m[1])).replace(/^\//, '');
  entry.add(p.split(path.sep).join('/'));
}

const groups = [
  { name: 'index.html・最初の JS と CSS(gzip)', first: true, match: (r) => entry.has(r) },
  { name: '位置データ data/eph/*', first: true, match: (r) => r.startsWith('data/eph/') },
  { name: '星 data/stars/stars.bin', first: true, match: (r) => r === 'data/stars/stars.bin' },
  { name: 'フォント(woff2)', first: true, match: (r) => /\.woff2$/.test(r) },
  { name: 'フォント(woff。古い端末用の控え。ふつうは読まれない)', first: false, match: (r) => /\.woff$/.test(r) },
  { name: '星の深い層 data/stars/stars-deep.bin', first: false, match: (r) => r === 'data/stars/stars-deep.bin' },
  { name: '天体のテクスチャ textures/*(あとから読む)', first: false, match: (r) => r.startsWith('textures/') },
  { name: '写真 photos/*(あとから読む)', first: false, match: (r) => r.startsWith('photos/') },
];

const claimed = new Set();
const rows = [];
let first = 0;
for (const g of groups) {
  const mine = files.filter((f) => !claimed.has(f) && g.match(rel(f)));
  mine.forEach((f) => claimed.add(f));
  const total = mine.reduce((s, f) => s + size(f), 0);
  rows.push({ name: g.name, count: mine.length, total, first: g.first });
  if (g.first) first += total;
}
const rest = files.filter((f) => !claimed.has(f));
rows.push({ name: 'そのほか', count: rest.length, total: rest.reduce((s, f) => s + size(f), 0), first: false });
const all = files.reduce((s, f) => s + size(f), 0);

const fmt = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)}MB` : `${(n / 1024).toFixed(1)}KB`);
console.log('読み込む量(JS・CSS・HTML は gzip の大きさ)');
for (const r of rows) {
  console.log(`  ${r.first ? '[最初]' : '[後  ]'} ${fmt(r.total).padStart(9)}  ${String(r.count).padStart(3)} ファイル  ${r.name}`);
}
console.log(`  最初に読み込む量   ${fmt(first).padStart(9)} / 目標 ${fmt(FIRST_LIMIT)}`);
console.log(`  すべて合わせた量   ${fmt(all).padStart(9)} / 目標 ${fmt(TOTAL_LIMIT)}`);

let bad = false;
if (first > FIRST_LIMIT) {
  console.error(`budget: 最初に読み込む量が目標を超えている(${fmt(first)} > ${fmt(FIRST_LIMIT)})`);
  bad = true;
}
if (all > TOTAL_LIMIT) {
  console.error(`budget: すべて合わせた量が目標を超えている(${fmt(all)} > ${fmt(TOTAL_LIMIT)})`);
  bad = true;
}
if (bad) process.exit(1);
console.log('budget: OK');
