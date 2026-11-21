// 位置データの読み出し。public/data/eph の manifest.json と .bin を読み、3次のエルミート補間で任意の時刻の位置・速度を返す。
// ファイルの形は docs/contracts.md の 5。作る側は tools/ephemeris/build.mjs。
import type { BodyId } from '../bodies';
import type { Coverage, Ephemeris, Vec3 } from './types';

export * from './types';
export * from './time';

export interface ManifestSegment {
  center: BodyId;
  file: string;
  dtype: 'f64' | 'f32';
  count: number;
  t0: number;
  t1: number;
}

export interface Manifest {
  version: number;
  frame: string;
  generated: string;
  source: string;
  notes?: string[];
  bodies: Partial<Record<BodyId, { segments: ManifestSegment[] }>>;
}

/** 読み込んだ区間。どの dtype でも、計算は倍精度の配列で行う(データは小さいので複製して構わない) */
interface Segment {
  center: BodyId;
  t0: number;
  t1: number;
  count: number;
  t: Float64Array;
  /** [x, y, z, vx, vy, vz] × count */
  d: Float64Array;
  /** 前回の補間で使った区間の番号。時刻が連続して進む呼び出しを速くする */
  last: number;
}

function decodeSegment(meta: ManifestSegment, buffer: ArrayBuffer): Segment {
  const n = meta.count;
  const t = new Float64Array(n);
  const d = new Float64Array(n * 6);
  if (meta.dtype === 'f64') {
    if (buffer.byteLength !== n * 56) throw new Error(`${meta.file}: size mismatch`);
    const f = new Float64Array(buffer);
    for (let r = 0; r < n; r++) {
      t[r] = f[r * 7];
      for (let c = 0; c < 6; c++) d[r * 6 + c] = f[r * 7 + 1 + c];
    }
  } else {
    // f32: 先頭に t(f64)× count、続けて [x,y,z,vx,vy,vz](f32)をレコードごとに count 個
    if (buffer.byteLength !== n * 32) throw new Error(`${meta.file}: size mismatch`);
    t.set(new Float64Array(buffer, 0, n));
    d.set(new Float32Array(buffer, n * 8, n * 6));
  }
  return { center: meta.center, t0: meta.t0, t1: meta.t1, count: n, t, d, last: 0 };
}

/** seg の中で t[i] <= et <= t[i+1] となる i。前回の位置の近くから探し、外れたら二分探索 */
function locate(seg: Segment, et: number): number {
  const t = seg.t;
  let i = seg.last;
  if (t[i] <= et && et <= t[i + 1]) return i;
  if (i + 2 < seg.count && t[i + 1] <= et && et <= t[i + 2]) return (seg.last = i + 1);
  if (i > 0 && t[i - 1] <= et && et <= t[i]) return (seg.last = i - 1);
  let lo = 0;
  let hi = seg.count - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t[mid] <= et) lo = mid;
    else hi = mid - 1;
  }
  i = lo;
  seg.last = i;
  return i;
}

/** seg の et での位置を p へ、速度を v へ書く(どちらも null なら書かない) */
function evalSegment(seg: Segment, et: number, p: number[] | null, v: number[] | null): void {
  const i = locate(seg, et);
  const t = seg.t;
  const d = seg.d;
  const h = t[i + 1] - t[i];
  const s = (et - t[i]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const a = i * 6;
  const b = a + 6;
  if (p) {
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = (s3 - 2 * s2 + s) * h;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = (s3 - s2) * h;
    for (let k = 0; k < 3; k++) p[k] = h00 * d[a + k] + h10 * d[a + 3 + k] + h01 * d[b + k] + h11 * d[b + 3 + k];
  }
  if (v) {
    // 位置の式を時刻で微分したもの
    const g00 = (6 * s2 - 6 * s) / h;
    const g10 = 3 * s2 - 4 * s + 1;
    const g01 = (-6 * s2 + 6 * s) / h;
    const g11 = 3 * s2 - 2 * s;
    for (let k = 0; k < 3; k++) v[k] = g00 * d[a + k] + g10 * d[a + 3 + k] + g01 * d[b + k] + g11 * d[b + 3 + k];
  }
}

/** 通過の区間の中の点を、track に差し込む時の間隔(秒)。進路の曲がりが滑らかな線になる細かさ */
const TRACK_WINDOW_STEP = 600;

/** 取得済みのデータから Ephemeris を作る。buffers はファイル名 → ArrayBuffer */
export function createEphemeris(manifest: Manifest, buffers: Record<string, ArrayBuffer>): Ephemeris {
  const segs = new Map<BodyId, Segment[]>();
  for (const [body, entry] of Object.entries(manifest.bodies) as [BodyId, { segments: ManifestSegment[] }][]) {
    const list = entry.segments.map((m) => {
      const buf = buffers[m.file];
      if (!buf) throw new Error(`missing data file: ${m.file}`);
      return decodeSegment(m, buf);
    });
    // 同じ時刻に複数あれば、太陽以外を中心にしたもの、次に範囲の狭いものを優先する
    list.sort((x, y) => {
      const xs = x.center === 'sun' ? 1 : 0;
      const ys = y.center === 'sun' ? 1 : 0;
      return xs - ys || x.t1 - x.t0 - (y.t1 - y.t0);
    });
    segs.set(body, list);
  }

  const cover = (body: BodyId): Coverage => {
    const list = segs.get(body);
    if (!list) throw new Error(`no data for body: ${body}`);
    let t0 = Infinity;
    let t1 = -Infinity;
    for (const s of list) {
      if (s.t0 < t0) t0 = s.t0;
      if (s.t1 > t1) t1 = s.t1;
    }
    return { t0, t1 };
  };
  const coverageCache = new Map<BodyId, Coverage>();
  const coverage = (body: BodyId): Coverage => {
    if (body === 'sun') return cover('voyager1');
    let c = coverageCache.get(body);
    if (!c) coverageCache.set(body, (c = cover(body)));
    return { ...c };
  };

  /** その時刻をカバーする、body を center 中心にした区間 */
  const find = (body: BodyId, center: BodyId | null, et: number): Segment | undefined => {
    const list = segs.get(body);
    if (!list) return undefined;
    for (const s of list) {
      if (et >= s.t0 && et <= s.t1 && (center === null ? s.center !== 'sun' : s.center === center)) return s;
    }
    return undefined;
  };

  // 再帰で使う作業用の配列(深さごとに分ける)。毎フレーム呼ばれるので配列を作らない
  const scratchP: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const scratchV: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

  /**
   * 太陽から見た body の位置・速度を p, v に書く。太陽中心の区間があればそれを使う。
   * 無い天体(月)だけ、周りの区間を使って「中心の位置 + 相対位置」で出す。
   *
   * ボイジャーを「惑星の位置 + 惑星中心の相対位置」で出す案は採らない:
   * Horizons の「木星(土星)中心から見たボイジャー」は、Horizons 自身の「太陽から見た木星(土星)の中心」を
   * 使って引いても合わず、383km(木星)・1,356km(土星)ずれる(docs/assets/ephemeris.md)。
   * 太陽中心の区間を直接使えば、Horizons の値に 12km 以内で一致する。
   */
  const sunState = (body: BodyId, et: number, p: number[], v: number[], depth: number): void => {
    if (body === 'sun') {
      p[0] = p[1] = p[2] = v[0] = v[1] = v[2] = 0;
      return;
    }
    const seg = find(body, 'sun', et);
    if (seg) {
      evalSegment(seg, et, p, v);
      return;
    }
    const rel = find(body, null, et);
    if (!rel) throw new Error(`no data for ${body} at et=${et}`);
    sunState(rel.center, et, p, v, depth + 1);
    const rp = scratchP[depth];
    const rv = scratchV[depth];
    evalSegment(rel, et, rp, rv);
    for (let k = 0; k < 3; k++) {
      p[k] += rp[k];
      v[k] += rv[k];
    }
  };

  /** body を center から見た位置・速度。直接の区間 → 逆向きの区間 → 同じ惑星を中心にした区間どうしの差 → 太陽中心どうしの差、の順 */
  const state = (body: BodyId, center: BodyId, et: number, p: number[], v: number[]): void => {
    if (body === center) {
      p[0] = p[1] = p[2] = v[0] = v[1] = v[2] = 0;
      return;
    }
    const direct = find(body, center, et);
    if (direct) {
      evalSegment(direct, et, p, v);
      return;
    }
    const reverse = find(center, body, et);
    if (reverse) {
      evalSegment(reverse, et, p, v);
      for (let k = 0; k < 3; k++) {
        p[k] = -p[k];
        v[k] = -v[k];
      }
      return;
    }
    // 2 つとも同じ惑星を中心にした区間を持つ時(通過の間のボイジャーと衛星、打ち上げ直後のボイジャーと月)は、
    // その区間どうしの差で出す。太陽中心の位置どうしを引くと、Horizons のデータの食い違い
    // (土星で約 1,360km)がそのまま乗り、タイタンとの距離(最接近 約 6,700km)が大きくずれる
    const hubA = find(body, null, et);
    const hubB = find(center, null, et);
    if (hubA && hubB && hubA.center === hubB.center) {
      evalSegment(hubA, et, p, v);
      const hp = scratchP[0];
      const hv = scratchV[0];
      evalSegment(hubB, et, hp, hv);
      for (let k = 0; k < 3; k++) {
        p[k] -= hp[k];
        v[k] -= hv[k];
      }
      return;
    }
    sunState(body, et, p, v, 0);
    const cp = scratchP[2];
    const cv = scratchV[2];
    sunState(center, et, cp, cv, 0);
    for (let k = 0; k < 3; k++) {
      p[k] -= cp[k];
      v[k] -= cv[k];
    }
  };

  /** 範囲の外は端に丸める。2 つの天体の範囲が重ならない時(月と遠い時刻など)は、それぞれの端に丸める */
  const clampEt = (a: BodyId, b: BodyId, et: number): number => {
    const ca = a === 'sun' ? null : coverage(a);
    const cb = b === 'sun' ? null : coverage(b);
    let lo = Math.max(ca?.t0 ?? -Infinity, cb?.t0 ?? -Infinity);
    let hi = Math.min(ca?.t1 ?? Infinity, cb?.t1 ?? Infinity);
    if (lo === -Infinity) {
      lo = coverage('voyager1').t0;
      hi = coverage('voyager1').t1;
    }
    if (lo > hi) return et < lo ? lo : hi;
    return et < lo ? lo : et > hi ? hi : et;
  };

  // 太陽を含む場合に使う作業用の配列(state が使うものとは別)
  const outP = [0, 0, 0];
  const outV = [0, 0, 0];
  const tmpP = [0, 0, 0];
  const tmpV = [0, 0, 0];

  const trackCache = new Map<BodyId, Float64Array>();

  const buildTrack = (body: BodyId): Float64Array => {
    const list = segs.get(body);
    if (!list) throw new Error(`no data for body: ${body}`);
    const sunSegs = list.filter((s) => s.center === 'sun').sort((x, y) => y.t1 - y.t0 - (x.t1 - x.t0));
    if (sunSegs.length === 0) throw new Error(`no sun-centered data for ${body}`);
    const main = sunSegs[0];
    const windows = list.filter((s) => s.center !== 'sun');
    const pts: number[] = [];
    const p = [0, 0, 0];
    const v = [0, 0, 0];
    for (let r = 0; r < main.count; r++) {
      const t = main.t[r];
      // 通過の区間の中は、下で 10 分刻みの密な点に置き換える(進路の曲がりが滑らかな線になる)
      if (windows.some((w) => t >= w.t0 && t <= w.t1)) continue;
      pts.push(t, main.d[r * 6], main.d[r * 6 + 1], main.d[r * 6 + 2]);
    }
    for (const w of windows) {
      const n = Math.floor((w.t1 - w.t0) / TRACK_WINDOW_STEP);
      for (let k = 0; k <= n; k++) {
        const t = k === n ? w.t1 : w.t0 + k * TRACK_WINDOW_STEP;
        sunState(body, t, p, v, 0);
        pts.push(t, p[0], p[1], p[2]);
      }
    }
    // 差し込んだ点を時刻順に並べ直す
    const n = pts.length / 4;
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => pts[a * 4] - pts[b * 4]);
    const out = new Float64Array(n * 4);
    order.forEach((src, dst) => {
      for (let c = 0; c < 4; c++) out[dst * 4 + c] = pts[src * 4 + c];
    });
    return out;
  };

  const vc = coverage('voyager1');

  return {
    t0: vc.t0,
    t1: vc.t1,

    position(body, center, et, out) {
      const e = clampEt(body, center, et);
      const o = out ?? [0, 0, 0];
      state(body, center, e, outP, outV);
      o[0] = outP[0];
      o[1] = outP[1];
      o[2] = outP[2];
      return o as Vec3;
    },

    velocity(body, center, et, out) {
      const e = clampEt(body, center, et);
      const o = out ?? [0, 0, 0];
      state(body, center, e, outP, outV);
      o[0] = outV[0];
      o[1] = outV[1];
      o[2] = outV[2];
      return o as Vec3;
    },

    distance(a, b, et) {
      const e = clampEt(a, b, et);
      state(a, b, e, tmpP, tmpV);
      return Math.hypot(tmpP[0], tmpP[1], tmpP[2]);
    },

    coverage,

    track(body) {
      let tr = trackCache.get(body);
      if (!tr) trackCache.set(body, (tr = buildTrack(body)));
      return tr;
    },
  };
}

/** baseUrl(末尾は /)の下の manifest.json とデータを読み込む */
export async function loadEphemeris(baseUrl: string): Promise<Ephemeris> {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const res = await fetch(`${base}manifest.json`);
  if (!res.ok) throw new Error(`manifest.json: HTTP ${res.status}`);
  const manifest = (await res.json()) as Manifest;
  const files = new Set<string>();
  for (const entry of Object.values(manifest.bodies)) for (const s of entry.segments) files.add(s.file);
  const buffers: Record<string, ArrayBuffer> = {};
  await Promise.all(
    [...files].map(async (f) => {
      const r = await fetch(`${base}${f}`);
      if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
      buffers[f] = await r.arrayBuffer();
    }),
  );
  return createEphemeris(manifest, buffers);
}
