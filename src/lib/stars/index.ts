// 星のデータの読み出し。道具(tools/stars/build.mjs)が作った bin を StarCatalog にする。
import { STAR_STRIDE, type StarCatalog } from './types';

export * from './types';

/** ArrayBuffer(Float32 リトルエンディアンの [x, y, z, mag, bv] × n)から StarCatalog を作る。テストでも使う純粋な関数 */
export function createStarCatalog(buffer: ArrayBuffer): StarCatalog {
  const bytes = STAR_STRIDE * 4;
  if (buffer.byteLength % bytes !== 0) {
    throw new Error(`星のデータの大きさが不正です(${buffer.byteLength} バイトは ${bytes} の倍数ではない)`);
  }
  // 手元の端末は全てリトルエンディアン。bin もリトルエンディアンなので、そのまま Float32 として見る(コピーしない)
  const data = new Float32Array(buffer);
  return { count: data.length / STAR_STRIDE, data };
}

/** url の星のデータを読み込む */
export async function loadStars(url: string): Promise<StarCatalog> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`星のデータを読み込めません: ${url}(HTTP ${res.status})`);
  return createStarCatalog(await res.arrayBuffer());
}

/**
 * 2 つのカタログをつなげた新しいカタログを返す(元は変えない)。
 * stars.bin の後ろに stars-deep.bin を足す使い方を想定する。どちらも明るい順で、
 * more の最も明るい星が base の最も暗い星より暗い時だけ、全体も明るい順のままになる。
 */
export function appendStars(base: StarCatalog, more: StarCatalog): StarCatalog {
  const data = new Float32Array(base.data.length + more.data.length);
  data.set(base.data, 0);
  data.set(more.data, base.data.length);
  return { count: base.count + more.count, data };
}

// B−V → 色の目印。夜空の星の色は淡いので、原色にせず白へ寄せた値にする。
// 青白(−0.3)から橙(1.8)まで、太陽に近い 0.65 付近はほぼ白になるように置いた。
const BV_STOPS: ReadonlyArray<readonly [number, number, number, number]> = [
  [-0.3, 0.6, 0.72, 1.0],
  [0.0, 0.82, 0.88, 1.0],
  [0.35, 0.97, 0.96, 1.0],
  [0.65, 1.0, 0.97, 0.92],
  [1.0, 1.0, 0.9, 0.76],
  [1.4, 1.0, 0.8, 0.6],
  [1.8, 1.0, 0.68, 0.46],
];

/** B−V の色指数 → 画面の色(各 0〜1 の [r, g, b])。範囲外は端の色に丸める */
export function bvToRgb(bv: number): [number, number, number] {
  const first = BV_STOPS[0];
  const last = BV_STOPS[BV_STOPS.length - 1];
  if (!(bv > first[0])) return [first[1], first[2], first[3]]; // NaN もここに入れる
  if (bv >= last[0]) return [last[1], last[2], last[3]];
  for (let i = 1; i < BV_STOPS.length; i++) {
    const b = BV_STOPS[i];
    if (bv <= b[0]) {
      const a = BV_STOPS[i - 1];
      const t = (bv - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  return [last[1], last[2], last[3]];
}
