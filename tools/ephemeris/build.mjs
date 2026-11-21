// NASA JPL Horizons から位置データを取得し、サイトが読む小さなファイルに加工する道具。
//
//   node tools/ephemeris/build.mjs             データを作る(public/data/eph/)
//   node tools/ephemeris/build.mjs --verify    作ったデータを、Horizons への別の問い合わせと突き合わせる(目標を超えたら終了コード 1)
//   node tools/ephemeris/build.mjs --fixtures  自動テスト用の正解を作る(tests/ephemeris/fixtures/horizons-samples.json)
//
// 2 つ目の引数に --only=moons を付けると、衛星の区間だけを作る・検証する(既存の manifest.json に足し込む。
// 惑星などの既存の区間は触らない)。--fixtures では衛星の正解(horizons-moons.json)だけを作る。
//
// 取得した応答は tools/ephemeris/cache/ に保存する。2回目以降はそこから読むので、途中で失敗しても続きから進められる。
// Horizons へは直列で、間を空けて頼む。作り方の詳細と出典は docs/assets/ephemeris.md。

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE_DIR = join(ROOT, 'tools', 'ephemeris', 'cache');
const OUT_DIR = join(ROOT, 'public', 'data', 'eph');
const FIXTURE_PATH = join(ROOT, 'tests', 'ephemeris', 'fixtures', 'horizons-samples.json');
const MOON_FIXTURE_PATH = join(ROOT, 'tests', 'ephemeris', 'fixtures', 'horizons-moons.json');
const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

const DAY = 86400;
const J2000_JD = 2451545.0;
const jdFromEt = (et) => J2000_JD + et / DAY;
const etFromJd = (jd) => (jd - J2000_JD) * DAY;
/** TDB の暦(UTC と同じ書き方で読む。うるう秒は入れない)から et */
const etFromTdbCalendar = (y, mo, d, h = 0, mi = 0, s = 0) =>
  (Date.UTC(y, mo - 1, d, h, mi, s) - Date.UTC(2000, 0, 1, 12, 0, 0)) / 1000;

// --- 期間と通過の区間 -------------------------------------------------------------------------

/** ボイジャー1号のデータの始まり(Horizons の最初は 13:59:24.383 TDB。端の丸めで弾かれないよう 1 秒ほど後から) */
const T_START = etFromTdbCalendar(1977, 9, 5, 13, 59, 25);
const T_END = etFromTdbCalendar(2060, 12, 31);
/** 最接近の時刻(TDB) */
const JUPITER_CA = etFromTdbCalendar(1979, 3, 5, 12, 5);
const SATURN_CA = etFromTdbCalendar(1980, 11, 12, 23, 45);
const HALF_WINDOW = 3 * DAY;
const EARTH_WINDOW = [T_START, T_START + 3 * DAY];
const JUPITER_WINDOW = [JUPITER_CA - HALF_WINDOW, JUPITER_CA + HALF_WINDOW];
const SATURN_WINDOW = [SATURN_CA - HALF_WINDOW, SATURN_CA + HALF_WINDOW];
const MOON_END = etFromTdbCalendar(1977, 10, 5);
const FINE_END = etFromTdbCalendar(1981, 1, 1);

// --- 作るデータの計画 ------------------------------------------------------------------------
//
// pieces: [開始 et, 終了 et, 刻み(分)] の並び。ここで取得する「細かい元データ」から、
//         tol(km)以内で補間できる最小限の点だけを残す(thin)。巡航は粗く、通過の前後は細かくなる。
// limit:  --verify が守らせる誤差の目標(km)。tol はそれより十分小さく取る(補間は点の間で最大になるため)。
// truth:  --verify で突き合わせる Horizons の天体番号と中心(省略時は取得に使ったものと同じ)。

const MIN = 60;
const SERIES = [
  {
    body: 'voyager1', center: 'sun', cmd: '-31', ctr: '500@10', dtype: 'f64', tol: 15, limit: 50,
    pieces: [
      [EARTH_WINDOW[0], EARTH_WINDOW[1], 1],
      [EARTH_WINDOW[1], JUPITER_WINDOW[0], 60],
      [...JUPITER_WINDOW, 1],
      [JUPITER_WINDOW[1], SATURN_WINDOW[0], 60],
      [...SATURN_WINDOW, 1],
      [SATURN_WINDOW[1], FINE_END, 60],
      [FINE_END, T_END, 1440],
    ],
  },
  { body: 'voyager1', center: 'earth', cmd: '-31', ctr: '500@399', dtype: 'f64', tol: 1.2, limit: 5, pieces: [[...EARTH_WINDOW, 1]] },
  { body: 'voyager1', center: 'jupiter', cmd: '-31', ctr: '500@599', dtype: 'f64', tol: 1.2, limit: 5, pieces: [[...JUPITER_WINDOW, 1]] },
  { body: 'voyager1', center: 'saturn', cmd: '-31', ctr: '500@699', dtype: 'f64', tol: 1.2, limit: 5, pieces: [[...SATURN_WINDOW, 1]] },
  { body: 'earth', center: 'sun', cmd: '399', ctr: '500@10', dtype: 'f64', tol: 30, limit: 50, pieces: [[T_START, T_END, 1440]] },
  { body: 'moon', center: 'earth', cmd: '301', ctr: '500@399', dtype: 'f64', tol: 10, limit: 50, pieces: [[T_START, MOON_END, 60]] },
  { body: 'mercury', center: 'sun', cmd: '199', ctr: '500@10', dtype: 'f32', tol: 16000, limit: 20000, pieces: [[T_START, T_END, 1440]] },
  { body: 'venus', center: 'sun', cmd: '299', ctr: '500@10', dtype: 'f32', tol: 15000, limit: 20000, pieces: [[T_START, T_END, 1440]] },
  { body: 'mars', center: 'sun', cmd: '499', ctr: '500@10', dtype: 'f32', tol: 15000, limit: 20000, pieces: [[T_START, T_END, 2880]] },
  // 木星と土星の「中心」は衛星の引力で数百 km 揺れる(土星はタイタンで約 290km、周期 16 日)。
  // その揺れを粗い点で追うと速度の食い違いで補間が暴れるので、全期間は揺れの無い重心(5, 6)で作り、
  // 通過の区間だけ本当の中心(599, 699)を細かく入れる。重心と中心の差は 300km 以内(500km の目標に収まる)。
  {
    body: 'jupiter', center: 'sun', cmd: '5', ctr: '500@10', dtype: 'f64', tol: 100, limit: 500,
    truth: { cmd: '599', ctr: '500@10' }, pieces: [[T_START, T_END, 7200]],
  },
  {
    body: 'jupiter', center: 'sun', cmd: '599', ctr: '500@10', dtype: 'f64', tol: 0, limit: 50, tag: 'window',
    pieces: [[...JUPITER_WINDOW, 180]],
  },
  {
    body: 'saturn', center: 'sun', cmd: '6', ctr: '500@10', dtype: 'f64', tol: 100, limit: 500,
    truth: { cmd: '699', ctr: '500@10' }, pieces: [[T_START, T_END, 7200]],
  },
  {
    body: 'saturn', center: 'sun', cmd: '699', ctr: '500@10', dtype: 'f64', tol: 0, limit: 50, tag: 'window',
    pieces: [[...SATURN_WINDOW, 180]],
  },
  { body: 'uranus', center: 'sun', cmd: '799', fallbackCmd: '7', ctr: '500@10', dtype: 'f32', tol: 12000, limit: 20000, pieces: [[T_START, T_END, 7200]] },
  { body: 'neptune', center: 'sun', cmd: '899', fallbackCmd: '8', ctr: '500@10', dtype: 'f32', tol: 12000, limit: 20000, pieces: [[T_START, T_END, 7200]] },
];

// --- 衛星の区間 ---------------------------------------------------------------------------
//
// 衛星は親の惑星を中心にした区間だけを持つ(太陽中心の区間は無い。月と同じ扱い)。刻みは 1 分で、
// 通過の区間(最接近の前後 3 日)だけ。誤差の許容値は 5km。
// 衛星の中心から見たボイジャーの区間(body: 'voyager1', center: 衛星)は、「衛星の惑星中心 − ボイジャーの惑星中心」で
// 出した相対位置が Horizons の直接の値と大きくずれる衛星にだけ足す(ずれの実測は docs/assets/ephemeris.md)。
const MOON_TOL = 5;
const MOON_LIMIT = 10;
const moonSeries = (body, center, cmd, window) => ({
  body, center, cmd, ctr: `500@${center === 'jupiter' ? '599' : '699'}`, dtype: 'f64', tol: MOON_TOL, limit: MOON_LIMIT,
  group: 'moons', pieces: [[...window, 1]],
});
SERIES.push(
  moonSeries('io', 'jupiter', '501', JUPITER_WINDOW),
  moonSeries('europa', 'jupiter', '502', JUPITER_WINDOW),
  moonSeries('ganymede', 'jupiter', '503', JUPITER_WINDOW),
  moonSeries('callisto', 'jupiter', '504', JUPITER_WINDOW),
  moonSeries('titan', 'saturn', '606', SATURN_WINDOW),
);

const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const selected = () => (ONLY ? SERIES.filter((s) => s.group === ONLY) : SERIES);

const fileName = (s) => `${s.body}.${s.center}${s.tag ? '.' + s.tag : ''}.bin`;

// --- Horizons への問い合わせ -----------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequestAt = 0;

class SemanticError extends Error {}

/** 共通のパラメータ(個人を特定できる情報は入れない) */
function baseParams(cmd, ctr) {
  return {
    format: 'text',
    COMMAND: `'${cmd}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${ctr}'`,
    VEC_TABLE: "'2'",
    OUT_UNITS: "'KM-S'",
    CSV_FORMAT: "'YES'",
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
  };
}

/** キャッシュを見て、無ければ Horizons に問い合わせて応答の本文を返す */
async function horizons(params, label) {
  const key = createHash('sha1').update(JSON.stringify(params)).digest('hex').slice(0, 16);
  const path = join(CACHE_DIR, `${label}.${key}.txt`);
  if (existsSync(path)) return readFileSync(path, 'utf8');
  mkdirSync(CACHE_DIR, { recursive: true });
  const url = `${API}?${new URLSearchParams(params).toString()}`;
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    // 公開 API への礼儀として、間を空けて直列に頼む
    const wait = lastRequestAt + 1500 - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (res.ok && text.includes('$$SOE')) {
        writeFileSync(path, text);
        return text;
      }
      // 期間外・天体の指定違いなど、やり直しても直らないもの
      if (res.ok && /No ephemeris|Cannot|not available|out of range|prior to|after A\.D\./i.test(text)) {
        throw new SemanticError(text.split('\n').filter((l) => l.trim()).slice(0, 6).join(' | '));
      }
      lastError = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    } catch (e) {
      if (e instanceof SemanticError) throw e;
      lastError = e;
    }
    console.warn(`  再試行 ${attempt}/5 (${label}): ${lastError.message.slice(0, 120)}`);
    await sleep(3000 * attempt);
  }
  throw lastError;
}

/** 応答の $$SOE〜$$EOE を [{jd, v:[x,y,z,vx,vy,vz]}] にする */
function parseRows(text) {
  const body = text.slice(text.indexOf('$$SOE') + 5, text.indexOf('$$EOE'));
  const rows = [];
  for (const line of body.split('\n')) {
    const c = line.split(',');
    if (c.length < 8) continue;
    rows.push({ jd: Number(c[0]), v: c.slice(2, 8).map(Number) });
  }
  return rows;
}

/** 一定の刻みの元データを、最大 15000 行ずつに分けて取得する */
async function fetchUniform(cmd, ctr, t0, t1, stepMin, tag) {
  const stepSec = stepMin * MIN;
  const total = Math.floor((t1 - t0) / stepSec + 1e-9) + 1;
  const rows = [];
  const CHUNK = 15000;
  for (let first = 0; first < total; first += CHUNK) {
    const n = Math.min(CHUNK, total - first);
    const start = t0 + first * stepSec;
    const stop = start + (n - 1) * stepSec;
    const params = {
      ...baseParams(cmd, ctr),
      START_TIME: `'JD ${jdFromEt(start).toFixed(9)}'`,
      STOP_TIME: `'JD ${jdFromEt(stop + stepSec * 0.25).toFixed(9)}'`,
      STEP_SIZE: `'${stepMin}m'`,
      TIME_TYPE: "'TDB'",
    };
    const text = await horizons(params, `${tag}_${stepMin}m_${first}`);
    const got = parseRows(text);
    if (got.length !== n) throw new Error(`${tag}: ${n} 行を頼んだが ${got.length} 行が返った`);
    rows.push(...got);
  }
  return rows;
}

/** 系列の元データ(細かい点)を取る。t は et、d は [x,y,z,vx,vy,vz] × n */
async function fetchDense(series) {
  const cmds = series.fallbackCmd ? [series.cmd, series.fallbackCmd] : [series.cmd];
  for (let ci = 0; ci < cmds.length; ci++) {
    try {
      const all = [];
      for (const [a, b, step] of series.pieces) {
        const tag = `${series.body}-${cmds[ci].replace('-', 'm')}-${series.ctr.replace('@', 'at')}`;
        all.push(...(await fetchUniform(cmds[ci], series.ctr, a, b, step, tag)));
      }
      all.sort((p, q) => p.jd - q.jd);
      // 区間のつなぎ目の重複を除く(0.05 秒未満の差)
      const uniq = [];
      for (const r of all) {
        if (uniq.length && (r.jd - uniq[uniq.length - 1].jd) * DAY < 0.05) continue;
        uniq.push(r);
      }
      const t = new Float64Array(uniq.length);
      const d = new Float64Array(uniq.length * 6);
      uniq.forEach((r, i) => {
        t[i] = etFromJd(r.jd);
        d.set(r.v, i * 6);
      });
      return { t, d, usedCmd: cmds[ci] };
    } catch (e) {
      if (!(e instanceof SemanticError) || ci === cmds.length - 1) throw e;
      console.warn(`  ${series.body}: 惑星の中心(${cmds[ci]})が取れないので重心(${cmds[ci + 1]})で代用する: ${e.message.slice(0, 100)}`);
    }
  }
  throw new Error('unreachable');
}

// --- 補間と間引き ---------------------------------------------------------------------------

/** 3次のエルミート補間(位置と速度)。i 番と i+1 番のレコードの間の et の位置を out[0..2] に書く */
function hermite(t, d, i, et, out) {
  const h = t[i + 1] - t[i];
  const s = (et - t[i]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  const a = i * 6;
  const b = a + 6;
  for (let k = 0; k < 3; k++) {
    out[k] = h00 * d[a + k] + h10 * h * d[a + 3 + k] + h01 * d[b + k] + h11 * h * d[b + 3 + k];
  }
}

/**
 * 元データ(細かい点)から、補間の誤差が tol(km)を超えない最小限に近い点を選ぶ。
 * 区間の中で一番ずれる点を足して二分していく。補間の誤差は点の間でしか測れないので、
 * 元データが密なほど(=元データが「正解」に近いほど)この選び方は確かになる。
 */
function thin(dense, tol) {
  const { t, d } = dense;
  const n = t.length;
  if (tol <= 0) return Array.from({ length: n }, (_, i) => i);
  const keep = new Set([0, n - 1]);
  const stack = [[0, n - 1]];
  const p = [0, 0, 0];
  while (stack.length) {
    const [i, j] = stack.pop();
    if (j - i < 2) continue;
    // [i, j] だけを使った補間を、その間の元データの点すべてと比べる
    const sub = { t: [t[i], t[j]], d: [...d.slice(i * 6, i * 6 + 6), ...d.slice(j * 6, j * 6 + 6)] };
    let worst = -1;
    let worstK = -1;
    for (let k = i + 1; k < j; k++) {
      hermite(sub.t, sub.d, 0, t[k], p);
      const e = Math.hypot(p[0] - d[k * 6], p[1] - d[k * 6 + 1], p[2] - d[k * 6 + 2]);
      if (e > worst) {
        worst = e;
        worstK = k;
      }
    }
    if (worst > tol) {
      keep.add(worstK);
      stack.push([i, worstK], [worstK, j]);
    }
  }
  return [...keep].sort((a, b) => a - b);
}

// --- ファイルの書き出し・読み込み(形は docs/contracts.md の 5) ----------------------------------

function encodeBin(dense, idx, dtype) {
  const count = idx.length;
  if (dtype === 'f64') {
    const f = new Float64Array(count * 7);
    idx.forEach((k, r) => {
      f[r * 7] = dense.t[k];
      f.set(dense.d.subarray(k * 6, k * 6 + 6), r * 7 + 1);
    });
    return Buffer.from(f.buffer);
  }
  // f32: 先頭に t を f64 で count 個、続けて [x,y,z,vx,vy,vz] を f32 で count 個(レコードごとに並べる)
  const buf = new ArrayBuffer(count * 8 + count * 24);
  const tt = new Float64Array(buf, 0, count);
  const dd = new Float32Array(buf, count * 8, count * 6);
  idx.forEach((k, r) => {
    tt[r] = dense.t[k];
    for (let c = 0; c < 6; c++) dd[r * 6 + c] = dense.d[k * 6 + c];
  });
  return Buffer.from(buf);
}

/** encodeBin の逆。--verify が、実際に書いたファイルを読み直して使う */
function decodeBin(buf, count, dtype) {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const t = new Float64Array(count);
  const d = new Float64Array(count * 6);
  if (dtype === 'f64') {
    const f = new Float64Array(ab);
    for (let r = 0; r < count; r++) {
      t[r] = f[r * 7];
      for (let c = 0; c < 6; c++) d[r * 6 + c] = f[r * 7 + 1 + c];
    }
  } else {
    t.set(new Float64Array(ab, 0, count));
    d.set(new Float32Array(ab, count * 8, count * 6));
  }
  return { t, d };
}

// --- データを作る ---------------------------------------------------------------------------

async function build() {
  mkdirSync(OUT_DIR, { recursive: true });
  const manifestPath = join(OUT_DIR, 'manifest.json');
  const manifest = ONLY && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {
    version: 1,
    frame: 'ECLIPJ2000',
    generated: new Date().toISOString().slice(0, 10),
    source: 'NASA JPL Horizons',
    notes: [],
    bodies: {},
  };
  let totalBytes = 0;
  const report = [];
  for (const series of selected()) {
    const name = fileName(series);
    console.log(`取得: ${name}`);
    const dense = await fetchDense(series);
    if (dense.usedCmd !== series.cmd) manifest.notes.push(`${series.body}: 惑星の中心が全期間で取れないため重心(${dense.usedCmd})で代用`);
    const idx = thin(dense, series.tol);
    const buf = encodeBin(dense, idx, series.dtype);
    writeFileSync(join(OUT_DIR, name), buf);
    totalBytes += buf.length;
    const entry = (manifest.bodies[series.body] ??= { segments: [] });
    entry.segments = entry.segments.filter((x) => x.file !== name); // 作り直しの時は同じファイルの区間を置き換える
    entry.segments.push({
      center: series.center,
      file: name,
      dtype: series.dtype,
      count: idx.length,
      t0: dense.t[idx[0]],
      t1: dense.t[idx[idx.length - 1]],
    });
    const step = (dense.t[dense.t.length - 1] - dense.t[0]) / idx.length / 3600;
    report.push(`${name.padEnd(30)} 元 ${String(dense.t.length).padStart(6)} 点 → ${String(idx.length).padStart(5)} 点  ${String(buf.length).padStart(7)} B  平均刻み ${step.toFixed(1)} 時間`);
  }
  const note = '木星と土星は全期間を重心(5, 6)で作り、通過の区間だけ本当の中心(599, 699)を細かく入れている(docs/assets/ephemeris.md)';
  if (!manifest.notes.includes(note)) manifest.notes.push(note);
  const moonNote = '衛星(イオ・エウロパ・ガニメデ・カリスト・タイタン)は親の惑星を中心にした通過の区間だけを持つ(docs/assets/ephemeris.md)';
  if (manifest.bodies.io && !manifest.notes.includes(moonNote)) manifest.notes.push(moonNote);
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log('\n' + report.join('\n'));
  console.log(`\n合計(.bin のみ): ${(totalBytes / 1024).toFixed(1)} KB`);
}

// --- 検証 -----------------------------------------------------------------------------------

/** 再現できる乱数(mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 時刻を並べて(TDB の JD)、Horizons の位置を一括で問い合わせる */
async function truthAt(cmd, ctr, jds, label) {
  const out = [];
  for (let i = 0; i < jds.length; i += 40) {
    const part = jds.slice(i, i + 40);
    const params = {
      ...baseParams(cmd, ctr),
      TLIST: `'${part.map((j) => j.toFixed(9)).join(' ')}'`,
      TLIST_TYPE: "'JD'",
      TIME_TYPE: "'TDB'",
    };
    const rows = parseRows(await horizons(params, `${label}_v${i}`));
    if (rows.length !== part.length) throw new Error(`${label}: ${part.length} 点を頼んだが ${rows.length} 点が返った`);
    out.push(...rows);
  }
  return out;
}

async function verify() {
  const manifest = JSON.parse(readFileSync(join(OUT_DIR, 'manifest.json'), 'utf8'));
  const rows = [];
  let failed = false;
  for (const series of selected()) {
    const seg = manifest.bodies[series.body].segments.find((s) => s.file === fileName(series));
    const { t, d } = decodeBin(readFileSync(join(OUT_DIR, seg.file)), seg.count, seg.dtype);
    const rand = rng(0x5eed + seg.count);
    // 半分はレコードの間隔を等しく、半分は時間を等しく選ぶ(長い間隔ほど誤差が大きいので、そこも確実に測る)
    const N = 40;
    const jds = [];
    for (let k = 0; k < N; k++) {
      let i;
      if (k % 2 === 0) i = Math.min(seg.count - 2, Math.floor(rand() * (seg.count - 1)));
      else {
        const target = seg.t0 + rand() * (seg.t1 - seg.t0);
        i = 0;
        let lo = 0;
        let hi = seg.count - 2;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (t[mid] <= target) lo = mid;
          else hi = mid - 1;
        }
        i = lo;
      }
      const et = t[i] + (0.05 + 0.9 * rand()) * (t[i + 1] - t[i]);
      jds.push(jdFromEt(et));
    }
    jds.sort((a, b) => a - b);
    const truth = series.truth ?? { cmd: series.cmd, ctr: series.ctr };
    const tag = `verify-${series.body}-${truth.cmd.replace('-', 'm')}-${truth.ctr.replace('@', 'at')}-${seg.count}`;
    const res = await truthAt(truth.cmd, truth.ctr, jds, tag);
    let worst = 0;
    let sum = 0;
    const p = [0, 0, 0];
    for (const r of res) {
      const et = etFromJd(r.jd);
      let lo = 0;
      let hi = seg.count - 2;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (t[mid] <= et) lo = mid;
        else hi = mid - 1;
      }
      hermite(t, d, lo, et, p);
      const e = Math.hypot(p[0] - r.v[0], p[1] - r.v[1], p[2] - r.v[2]);
      worst = Math.max(worst, e);
      sum += e;
    }
    const ok = worst <= series.limit;
    if (!ok) failed = true;
    rows.push({ seg: `${series.body}/${series.center}${series.tag ? ' (' + series.tag + ')' : ''}`, count: seg.count, bytes: statSync(join(OUT_DIR, seg.file)).size, n: res.length, mean: sum / res.length, worst, limit: series.limit, ok });
  }
  console.log('区間'.padEnd(26) + '点数'.padStart(7) + '容量(B)'.padStart(10) + '検証点'.padStart(7) + '平均誤差km'.padStart(12) + '最大誤差km'.padStart(12) + '目標km'.padStart(9) + '  結果');
  for (const r of rows) {
    console.log(`${r.seg.padEnd(26)}${String(r.count).padStart(7)}${String(r.bytes).padStart(10)}${String(r.n).padStart(7)}${r.mean.toFixed(3).padStart(12)}${r.worst.toFixed(3).padStart(12)}${String(r.limit).padStart(9)}  ${r.ok ? 'OK' : 'NG'}`);
  }
  const total = readdirSync(OUT_DIR).reduce((s, f) => s + statSync(join(OUT_DIR, f)).size, 0);
  console.log(`\npublic/data/eph の合計: ${(total / 1024).toFixed(1)} KB(目標 950 KB 以内)`);
  if (total > 950 * 1024) failed = true;
  if (failed) {
    console.error('目標を超えた区間があります');
    process.exit(1);
  }
}

// --- 自動テスト用の正解 ---------------------------------------------------------------------

/** UTC のミリ秒 → UT の JD(Horizons に UT として渡す) */
const jdUtFromMs = (ms) => ms / 86400000 + 2440587.5;

/** 衛星の正解: 衛星ごとに区間の中の無作為な 8 点。親から見た衛星と、衛星から見たボイジャーを Horizons に直接頼む */
async function moonFixtures() {
  const rand = rng(20261121);
  const utc = (y, mo, d, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s);
  const defs = [
    ['io', '501', 'jupiter', '599', utc(1979, 3, 2, 12, 30), utc(1979, 3, 8, 11, 30)],
    ['europa', '502', 'jupiter', '599', utc(1979, 3, 2, 12, 30), utc(1979, 3, 8, 11, 30)],
    ['ganymede', '503', 'jupiter', '599', utc(1979, 3, 2, 12, 30), utc(1979, 3, 8, 11, 30)],
    ['callisto', '504', 'jupiter', '599', utc(1979, 3, 2, 12, 30), utc(1979, 3, 8, 11, 30)],
    ['titan', '606', 'saturn', '699', utc(1980, 11, 9, 23, 30), utc(1980, 11, 15, 22, 30)],
  ];
  const samples = [];
  for (const [body, cmd, parent, pcmd, from, to] of defs) {
    const list = Array.from({ length: 8 }, () => Math.round((from + rand() * (to - from)) / 1000) * 1000).sort((a, b) => a - b);
    const tlist = `'${list.map((ms) => jdUtFromMs(ms).toFixed(9)).join(' ')}'`;
    const q = async (c, ctr, label) =>
      parseRows(await horizons({ ...baseParams(c, ctr), TLIST: tlist, TLIST_TYPE: "'JD'", TIME_TYPE: "'UT'" }, `fixture-moon-${body}-${label}`)).map((r) => r.v.slice(0, 3));
    const rel = await q(cmd, `500@${pcmd}`, 'parent');
    const vm = await q('-31', `500@${cmd}`, 'voyager');
    list.forEach((ms, i) => samples.push({ body, parent, utc: new Date(ms).toISOString().replace('.000Z', 'Z'), moonParent: rel[i], voyagerMoon: vm[i] }));
  }
  mkdirSync(dirname(MOON_FIXTURE_PATH), { recursive: true });
  writeFileSync(
    MOON_FIXTURE_PATH,
    JSON.stringify(
      { source: 'NASA JPL Horizons (API 1.2) 黄道 J2000・単位 km。時刻は UTC(Horizons に UT として渡した)。moonParent は親の惑星の中心から見た衛星、voyagerMoon は衛星の中心から見たボイジャー', generated: new Date().toISOString().slice(0, 10), samples },
      null,
      1,
    ) + '\n',
  );
  console.log(`衛星の正解を ${samples.length} 点書き出した: ${MOON_FIXTURE_PATH}`);
}

async function fixtures() {
  if (ONLY === 'moons') return moonFixtures();
  const rand = rng(20261120);
  const sec = (ms) => Math.round(ms / 1000) * 1000;
  const utc = (y, mo, d, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s);
  const groups = [];
  const addGroup = (group, count, fromMs, toMs) => {
    for (let i = 0; i < count; i++) groups.push({ group, ms: sec(fromMs + rand() * (toMs - fromMs)) });
  };
  // 全期間(レコードの時刻とは無関係に選ぶ)。打ち上げの直後から 2060 年末まで
  addGroup('global', 44, utc(1977, 9, 6), utc(2060, 12, 30));
  // 通過の区間(最接近の前後 3 日の内側)
  addGroup('earth', 8, utc(1977, 9, 5, 14, 0), utc(1977, 9, 8, 13, 0));
  addGroup('jupiter', 10, utc(1979, 3, 2, 12, 30), utc(1979, 3, 8, 11, 30));
  addGroup('saturn', 10, utc(1980, 11, 9, 23, 30), utc(1980, 11, 15, 22, 30));
  groups.sort((a, b) => a.ms - b.ms);

  const query = async (cmd, ctr, list, label) => {
    const out = [];
    for (let i = 0; i < list.length; i += 40) {
      const part = list.slice(i, i + 40);
      const params = {
        ...baseParams(cmd, ctr),
        TLIST: `'${part.map((g) => jdUtFromMs(g.ms).toFixed(9)).join(' ')}'`,
        TLIST_TYPE: "'JD'",
        TIME_TYPE: "'UT'",
      };
      const rows = parseRows(await horizons(params, `fixture-${label}_${i}`));
      if (rows.length !== part.length) throw new Error(`fixture ${label}: 点数が合わない`);
      out.push(...rows.map((r) => r.v.slice(0, 3)));
    }
    return out;
  };
  const sun = await query('-31', '500@10', groups, 'v1-sun');
  const earth = await query('-31', '500@399', groups, 'v1-earth');
  const earthSun = await query('399', '500@10', groups, 'earth-sun');
  const jg = groups.filter((g) => g.group === 'jupiter');
  const sg = groups.filter((g) => g.group === 'saturn');
  const jup = await query('-31', '500@599', jg, 'v1-jupiter');
  const sat = await query('-31', '500@699', sg, 'v1-saturn');
  const samples = groups.map((g, i) => {
    const s = {
      group: g.group,
      utc: new Date(g.ms).toISOString().replace('.000Z', 'Z'),
      voyagerSun: sun[i],
      voyagerEarth: earth[i],
      earthSun: earthSun[i],
    };
    if (g.group === 'jupiter') s.voyagerJupiter = jup[jg.indexOf(g)];
    if (g.group === 'saturn') s.voyagerSaturn = sat[sg.indexOf(g)];
    return s;
  });
  mkdirSync(dirname(FIXTURE_PATH), { recursive: true });
  writeFileSync(
    FIXTURE_PATH,
    JSON.stringify(
      {
        source: 'NASA JPL Horizons (API 1.2) 黄道 J2000・単位 km。時刻は UTC(Horizons に UT として渡した)',
        generated: new Date().toISOString().slice(0, 10),
        samples,
      },
      null,
      1,
    ) + '\n',
  );
  console.log(`正解を ${samples.length} 点書き出した: ${FIXTURE_PATH}`);
  await moonFixtures();
}

// --- 入口 -----------------------------------------------------------------------------------

const mode = process.argv.slice(2).find((a) => !a.startsWith('--only='));
try {
  if (mode === '--verify') await verify();
  else if (mode === '--fixtures') await fixtures();
  else if (!mode) await build();
  else throw new Error(`知らないオプション: ${mode}(--verify / --fixtures)`);
} catch (e) {
  console.error(`失敗: ${e.message}`);
  process.exit(1);
}
