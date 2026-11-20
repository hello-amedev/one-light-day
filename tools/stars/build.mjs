// 恒星カタログ(HYG Database)を取得し、サイト用の小さな bin に加工する道具。
// 使い方: npm run data:stars   (Node 26。追加の依存なし)
// 出力: public/data/stars/stars.bin(〜6.5等)、stars-deep.bin(6.5等より暗く〜8.0等)、
//       tests/stars/fixtures/named.json(テスト用の名前付きの星)
// 出どころと利用条件は docs/assets/stars.md を参照。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools/stars/cache');
const OUT = join(ROOT, 'public/data/stars');
const FIXTURE = join(ROOT, 'tests/stars/fixtures/named.json');

// Codeberg の raw は Git LFS のポインタ(133バイトの文字列)を返す。実体は media の URL から取る。
const HYG_URL = 'https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz';
const HYG_FILE = join(CACHE, 'hyg_v44.csv.gz');
const HYG_SHA256 = '00b349893b9a53106dd488d8371e8d2fa586043e500bb3cdb8bff3931682197d'; // LFS ポインタの oid。壊れた取得を見分ける

const EPS = 23.4392911 * Math.PI / 180; // 黄道傾斜角(J2000)
const MAG_NAKED = 6.5; // 肉眼で見える限界。stars.bin はここまで
const MAG_DEEP = 8.0; // stars-deep.bin はここまで
const BV_DEFAULT = 0.6; // 色指数が無い星。太陽に近い淡い黄白

// テスト用の名前付きの星(HYG の proper 名)。裏返し・軸の検査に使う
const NAMED = ['Sirius', 'Canopus', 'Arcturus', 'Vega', 'Capella', 'Rigel', 'Procyon', 'Betelgeuse', 'Altair', 'Aldebaran',
  'Antares', 'Spica', 'Deneb', 'Regulus', 'Polaris', 'Bellatrix', 'Saiph', 'Alnitak', 'Alnilam', 'Mintaka'];

async function loadCsv() {
  mkdirSync(CACHE, { recursive: true });
  if (!existsSync(HYG_FILE)) {
    console.log('取得: ' + HYG_URL);
    const res = await fetch(HYG_URL);
    if (!res.ok) throw new Error('取得に失敗: HTTP ' + res.status);
    writeFileSync(HYG_FILE, Buffer.from(await res.arrayBuffer()));
  }
  const gz = readFileSync(HYG_FILE);
  const sha = createHash('sha256').update(gz).digest('hex');
  if (sha !== HYG_SHA256) {
    throw new Error(`キャッシュの SHA-256 が一致しません(${sha})。LFS のポインタを保存した可能性があります。${HYG_FILE} を消して再実行してください`);
  }
  return gunzipSync(gz).toString('utf8');
}

// 引用符つきの項目を含む CSV の 1 行を分ける
function splitLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

const num = (s) => (s === '' || s === undefined ? NaN : Number(s));

/** 赤道座標 J2000(ra: 時、dec: 度)→ 黄道 J2000 の単位ベクトル(回転だけ。向きは保たれる) */
function toEcliptic(raHours, decDeg) {
  const a = raHours * 15 * Math.PI / 180, d = decDeg * Math.PI / 180;
  const xe = Math.cos(d) * Math.cos(a), ye = Math.cos(d) * Math.sin(a), ze = Math.sin(d);
  return [xe, Math.cos(EPS) * ye + Math.sin(EPS) * ze, -Math.sin(EPS) * ye + Math.cos(EPS) * ze];
}

function writeBin(file, stars) {
  const buf = new ArrayBuffer(stars.length * 20);
  const dv = new DataView(buf);
  stars.forEach((s, i) => {
    [...s.v, s.mag, s.bv].forEach((val, k) => dv.setFloat32((i * 5 + k) * 4, val, true)); // リトルエンディアンを明示
  });
  writeFileSync(file, Buffer.from(buf));
  return buf.byteLength;
}

const text = await loadCsv();
const lines = text.split(/\r?\n/).filter((l) => l !== '');
const head = splitLine(lines[0]);
const col = Object.fromEntries(head.map((h, i) => [h, i]));
for (const k of ['id', 'hr', 'proper', 'ra', 'dec', 'mag', 'ci', 'bayer', 'con']) {
  if (!(k in col)) throw new Error('HYG の列が見つかりません: ' + k);
}

const dropped = { sol: 0, noPosition: 0, noMag: 0, fainter: 0 };
let noBv = 0;
const stars = [];
for (const line of lines.slice(1)) {
  const f = splitLine(line);
  const id = Number(f[col.id]);
  if (id === 0) { dropped.sol++; continue; } // 先頭は太陽(Sol)。星空には出さない
  const ra = num(f[col.ra]), dec = num(f[col.dec]), mag = num(f[col.mag]);
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) { dropped.noPosition++; continue; }
  if (!Number.isFinite(mag)) { dropped.noMag++; continue; }
  if (mag > MAG_DEEP) { dropped.fainter++; continue; }
  let bv = num(f[col.ci]);
  if (!Number.isFinite(bv)) { bv = BV_DEFAULT; noBv++; }
  stars.push({ id, proper: f[col.proper], hr: f[col.hr], bayer: f[col.bayer], con: f[col.con], ra, dec, mag, bv, v: toEcliptic(ra, dec) });
}
// 明るい順。同じ等級は HYG の id 順にして、作り直しても並びが変わらないようにする
stars.sort((a, b) => a.mag - b.mag || a.id - b.id);

const base = stars.filter((s) => s.mag <= MAG_NAKED);
const deep = stars.filter((s) => s.mag > MAG_NAKED);

mkdirSync(OUT, { recursive: true });
const b1 = writeBin(join(OUT, 'stars.bin'), base);
const b2 = writeBin(join(OUT, 'stars-deep.bin'), deep);

// テスト用の名前付きの星。index は stars.bin の中の何番目か
const named = NAMED.map((name) => {
  const index = base.findIndex((s) => s.proper === name);
  if (index < 0) throw new Error('名前の付いた星が見つかりません: ' + name);
  const s = base[index];
  return { name, hr: s.hr === '' ? null : Number(s.hr), raDeg: s.ra * 15, decDeg: s.dec, mag: s.mag, index };
});
mkdirSync(dirname(FIXTURE), { recursive: true });
writeFileSync(FIXTURE, JSON.stringify(named, null, 2) + '\n');

console.log(`HYG v4.4: ${lines.length - 1} 行`);
console.log(`stars.bin: ${base.length} 個, ${b1} バイト / stars-deep.bin: ${deep.length} 個, ${b2} バイト`);
console.log(`捨てた行: 太陽 ${dropped.sol}, 位置なし ${dropped.noPosition}, 等級なし ${dropped.noMag}, ${MAG_DEEP}等より暗い ${dropped.fainter}`);
console.log(`B−V なし(${BV_DEFAULT} で代用): ${noBv}`);
