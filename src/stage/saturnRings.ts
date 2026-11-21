// 土星の環の「半径 → 明るさ・濃さ」の表と、影の計算。素材の画像は使わず、すべて計算で作る。
// 画面にも WebGL にも依存しない純粋な関数。シェーダー(bodyShaders.ts)の影の計算は、ここと同じ式。
import type { Vec3 } from './math';

/** 環の表が覆う半径の範囲(土星の中心から、km) */
export const RING_R0_KM = 66_900;
export const RING_R1_KM = 140_500;

export interface RingSample {
  /** 明るさ(反射率の目安、0〜1) */
  albedo: number;
  /** 垂直に見た時の光学的厚み(0 で透明、2 以上でほぼ不透明) */
  tau: number;
}

/** 決まった乱数。同じ値を入れれば同じ値が返る(環の細かな濃淡を毎回同じにするため) */
function hash(i: number): number {
  let x = Math.imul(i | 0, 0x27d4eb2d) ^ 0x165667b1;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** 1 次元の値のむら(0〜1)。波長 lambda km ごとに値が変わり、なめらかにつなぐ */
function noise1(r: number, lambda: number, seed: number): number {
  const x = r / lambda;
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return hash(i * 7919 + seed) * (1 - s) + hash((i + 1) * 7919 + seed) * s;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 区間 [a, b] の内側で 1、縁は幅 edge km でなめらかに 0 へ */
const band = (r: number, a: number, b: number, edge: number): number => smooth(a - edge, a + edge, r) * (1 - smooth(b - edge, b + edge, r));

/** 半径の細かな濃淡(同心円の細い環の筋)。mean 1 のまわりで amount だけ揺れる */
function ringlets(r: number, amount: number): number {
  const n = 0.5 * noise1(r, 38, 11) + 0.32 * noise1(r, 140, 23) + 0.18 * noise1(r, 620, 37);
  return 1 + amount * (n - 0.5) * 2;
}

/**
 * 半径(土星の中心から km)での環の明るさと濃さ。
 * D 環 66,900〜74,500(ごく淡い)/ C 環 74,658〜92,000(淡く透ける)/ B 環 92,000〜117,580(最も明るく濃い)/
 * カッシーニの間隙 117,580〜122,170(ほぼ透ける)/ A 環 122,170〜136,775(エンケの間隙 133,589 付近・キーラーの間隙 136,505 付近)/ F 環 140,180。
 */
export function ringSample(r: number): RingSample {
  if (r < RING_R0_KM - 200 || r > RING_R1_KM + 200) return { albedo: 0, tau: 0 };

  let tau = 0;
  let albedo = 0.4;

  // D 環: ごく淡い
  tau += 0.018 * band(r, 66_900, 74_500, 800) * ringlets(r, 0.7);
  // C 環: 淡く透ける。内側ほど薄く、外側へ少し濃くなる。暗い色
  const cMix = band(r, 74_658, 92_000, 150);
  tau += cMix * (0.07 + 0.1 * smooth(74_658, 92_000, r)) * ringlets(r, 0.8);
  // マクスウェルの間隙(87,500 付近)
  tau *= 1 - 0.7 * band(r, 87_380, 87_620, 60);
  // B 環: 内側は薄く、中ほどから外側は濃い。むらが大きい
  const bMix = band(r, 92_000, 117_580, 60);
  const bBase = 0.55 + 1.9 * smooth(92_000, 104_000, r) - 0.25 * smooth(110_000, 117_000, r);
  tau += bMix * bBase * ringlets(r, 0.6);
  // カッシーニの間隙: 完全に空ではなく、ごく淡い塵と細い環がある
  const cassini = band(r, 117_580, 122_170, 40);
  tau += cassini * (0.045 + 0.05 * noise1(r, 90, 5)) ;
  // A 環: 中くらい。外縁へ向けて少し薄い
  const aMix = band(r, 122_170, 136_775, 40);
  tau += aMix * (0.62 - 0.12 * smooth(125_000, 136_000, r)) * ringlets(r, 0.35);
  // エンケの間隙(幅 325km)とキーラーの間隙(幅 35km): A 環の濃さを落とす
  const enke = band(r, 133_589 - 162, 133_589 + 162, 12);
  const keeler = band(r, 136_505 - 17, 136_505 + 17, 4);
  tau *= 1 - 0.92 * enke;
  tau *= 1 - 0.9 * keeler;
  // F 環: 細い 1 本(中心 140,180、幅は数十 km)
  tau += 0.16 * Math.exp(-Math.pow((r - 140_180) / 28, 2)) * (0.7 + 0.6 * noise1(r, 12, 41));

  // 明るさ: B が最も明るく、C は暗い、カッシーニは中くらい、A はやや暗い
  const wB = bMix;
  const wA = aMix;
  const wC = cMix + 0.4 * band(r, 66_900, 74_500, 800);
  const wK = cassini;
  const wSum = wB + wA + wC + wK + 1e-6;
  albedo = (0.78 * wB + 0.6 * wA + 0.3 * wC + 0.42 * wK + 0.5 * (r > 139_000 ? 1 : 0) * 0.001) / wSum;
  if (tau < 1e-4) albedo = 0.4;
  return { albedo: Math.min(1, albedo * (0.92 + 0.16 * noise1(r, 55, 3))), tau };
}

/**
 * 表の画像のデータ(RGBA、width × 1)。R = 明るさ、G = √(tau / 3)(薄い所の精度を上げる)、B = 0、A = 255。
 * 光学的厚み 3 までを表せる。
 */
export function buildRingProfileData(width: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * 4);
  for (let i = 0; i < width; i++) {
    const r = RING_R0_KM + ((i + 0.5) / width) * (RING_R1_KM - RING_R0_KM);
    const s = ringSample(r);
    data[i * 4] = Math.round(s.albedo * 255);
    data[i * 4 + 1] = Math.round(Math.sqrt(Math.min(1, s.tau / 3)) * 255);
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  return data;
}

// ───────── 影(天体固定の座標。単位は土星の赤道半径。z が極) ─────────

/**
 * 環の上の点 p(赤道面 z = 0)から太陽の向き light(単位ベクトル)へ引いた線が、土星(扁平な球)に当たるか。
 * 当たるなら 1(影)、外れるなら 0。縁は penumbra(半径に対する割合)の幅でなだらかにつなぐ。
 * 土星の扁平は、z を 1 / (1 − flattening) 倍して球にそろえて扱う。
 */
export function planetShadowOnRing(p: Vec3, light: Vec3, flattening: number, penumbra = 0.01): number {
  const b = 1 - flattening;
  const px = p[0];
  const py = p[1];
  const pz = p[2] / b;
  const lx = light[0];
  const ly = light[1];
  const lz = light[2] / b;
  const a = lx * lx + ly * ly + lz * lz;
  const bq = px * lx + py * ly + pz * lz;
  // 太陽と反対向きに離れていく点は影にならない
  if (bq >= 0) return 0;
  const miss = Math.sqrt(Math.max(0, px * px + py * py + pz * pz - (bq * bq) / a));
  const t = Math.min(1, Math.max(0, (1 + penumbra - miss) / (2 * penumbra)));
  return t * t * (3 - 2 * t);
}

/**
 * 土星の表面の点 q から太陽へ引いた線が赤道面を横切る半径(土星の赤道半径の単位)。
 * 太陽が赤道面の反対側にある点だけが、環を通して太陽を見る。届かない時は null。
 */
export function ringCrossingRadius(q: Vec3, light: Vec3): number | null {
  if (Math.abs(light[2]) < 1e-9) return null;
  const t = -q[2] / light[2];
  if (t <= 0) return null;
  return Math.hypot(q[0] + t * light[0], q[1] + t * light[1]);
}

/**
 * 土星の表面の点 q に届く光の割合(1 = 環に遮られない)。
 * 太陽へ向かう線が横切る半径の環の濃さ tau を、斜めに通る長さ(1 / |light.z|)で割って弱める。
 */
export function ringShadowOnPlanet(q: Vec3, light: Vec3, equatorialKm: number): number {
  const r = ringCrossingRadius(q, light);
  if (r === null) return 1;
  const tau = ringSample(r * equatorialKm).tau;
  return Math.exp(-tau / Math.max(Math.abs(light[2]), 0.04));
}
