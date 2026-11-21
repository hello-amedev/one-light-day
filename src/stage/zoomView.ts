// 拡大(倍率)に合わせた見え方の決まり。画面にも three.js にも依存しない純粋な関数。
// 光や星の大きさは角度ではなく画面の px で決める。拡大しても、太陽の光が画面を覆わず、星や惑星の点が大きくならない。
import { FOV_BASE_DEG, MAG_MAX } from '../lib/zoom';
import { smoothstep } from './math';

/** 引きの眺めの視野(度)。これより広い視野は「拡大していない」とみなす(camera.ts の OVERVIEW_FOV と同じ値) */
const WIDE_FOV_DEG = 45;

/**
 * 視野(画面の短い辺。度)から、見え方に使う拡大の度合い(1 以上)。
 * 引きの眺め・本体の視点・視点の切り替えの途中も、視野から求めるので値が途切れない。ボイジャーの視界の ×1〜×1.33 は 1 のまま
 */
export function effectiveZoom(fovDeg: number): number {
  return Math.max(1, WIDE_FOV_DEG / Math.max(fovDeg, 1e-3));
}

// ── 太陽の光 ──

/** 拡大のたびに、太陽の光の素の大きさを縮める強さ(倍率の 2 を底にした対数に掛ける) */
const GLARE_SHRINK = 0.28;

/**
 * 拡大するほど 1 から小さくなる、太陽の光の大きさの倍率。
 * ×1 で 1、上限(×約143)で約 0.33。光は画面の px で決めているので、そのままだと拡大した時に
 * 「地球から 0.3 度の太陽」と「地球の点」の間に光のにじみが広がって見分けにくい。縮めて点を分ける
 */
export function glareZoomFactor(zoom: number): number {
  return 1 / (1 + GLARE_SHRINK * Math.log2(Math.max(zoom, 1)));
}

export interface SunGlowInput {
  /** 太陽までの距離(天文単位) */
  au: number;
  /** 太陽の球の画面上の直径(px)。見えない時は 0 */
  discPx: number;
  /** 画面の短い辺(px) */
  shortPx: number;
  /** 見た目のトークン(--sun-glare) */
  glare: number;
  /** effectiveZoom の値 */
  zoom: number;
}

export interface SunGlowSizes {
  glowPx: number;
  corePx: number;
  spikePx: number;
  spikeOpacity: number;
}

/**
 * 太陽の光(にじみ・芯・十字の光条)の画面上の大きさ(px)。
 * 距離が近いほど大きく、遠くても「ひときわ明るい星」と分かる大きさを保つ(画面の短い辺で頭打ち)。
 * 拡大すると素の大きさを縮める。球そのものの大きさ(discPx)の分は縮めない(球は実物の大きさで見える)
 */
export function sunGlowSizes(p: SunGlowInput): SunGlowSizes {
  const au = Math.max(p.au, 1);
  // 1 天文単位で 1、200 天文単位で 0 になる近さ
  const t = Math.min(1, Math.max(0, 1 - Math.log10(au) / Math.log10(200)));
  const z = glareZoomFactor(p.zoom);
  // 光が画面を覆いつくさない上限。拡大するほど低くする(上限の倍率で、にじみは短い辺の約 5 割まで)。
  // 上限に当たるのは、球そのものが大きい時(太陽に近づいて拡大した時)だけ
  const capScale = 0.35 + 0.65 * z;
  const glowPx = Math.min((64 * z + 240 * t * t * z + p.discPx * 4) * p.glare, p.shortPx * 0.9 * capScale);
  const corePx = Math.min(20 * z + 36 * t * z + p.discPx * 1.2, p.shortPx * 0.4 * capScale);
  const spikePx = Math.min((150 * z + 520 * t * z) * Math.sqrt(p.glare), p.shortPx * 1.1 * capScale);
  return { glowPx, corePx, spikePx, spikeOpacity: (0.3 + 0.3 * t) * (0.55 + 0.45 * z) };
}

// ── 天の川 ──

/** 上限まで拡大した時の、天の川の明るさ(×1 を 1 とした割合) */
const MILKYWAY_MIN_GAIN = 0.15;

/**
 * 拡大に合わせた天の川の淡さ(1 = ×1 の濃さ)。
 * 画像は 4,096 画素の横幅で、上限の視野(0.42 度)では 1 画素が画面の 160 画素ほどに伸びる。
 * 伸ばした画像が主役にならないよう、倍率の対数に沿ってなめらかに淡くし、上限で 0.15 にする
 */
export function milkywayZoomGain(zoom: number): number {
  const top = MAG_MAX * (WIDE_FOV_DEG / FOV_BASE_DEG);
  const x = Math.log(Math.max(zoom, 1)) / Math.log(top);
  return 1 - (1 - MILKYWAY_MIN_GAIN) * smoothstep(0, 1, x);
}

// ── 暗い星 ──

/**
 * この倍率を超えたら暗い星(8 等まで)を足す。×3 は視野が約 20 度になる所で、
 * そこから先は 6.5 等より暗い星が見え始める(肉眼の限界を超えて、望遠鏡で星が増える感覚)。
 * ×1 で足さないのは、最初の表示を軽くするのと、広い視野では暗い星が砂のように見えて星座の形を邪魔するため
 */
export const DEEP_STARS_ON_ZOOM = 3;
/** 暗い星の層は、拡大が ×2.4 を下回るまで保つ(境目で出入りをくり返さない) */
export const DEEP_STARS_OFF_ZOOM = 2.4;

/** 暗い星のカタログを読み込み済みか・読み込み中か・手元にあるかの状態 */
export type DeepStarsLoad = 'none' | 'loading' | 'ready' | 'failed';

/**
 * 暗い星を、いま読み込み始めるか。条件: まだ読み込んでいない・失敗していない・最初から入っていない(?stars=deep)・倍率が閾値以上。
 * 失敗した時はくり返し読みに行かない
 */
export function shouldLoadDeepStars(zoom: number, load: DeepStarsLoad, alreadyInCatalog: boolean): boolean {
  return !alreadyInCatalog && load === 'none' && zoom >= DEEP_STARS_ON_ZOOM;
}

/** 暗い星の層を見せたいか(ヒステリシスつき)。wasOn は前の判断 */
export function deepStarsWanted(zoom: number, wasOn: boolean): boolean {
  return wasOn ? zoom >= DEEP_STARS_OFF_ZOOM : zoom >= DEEP_STARS_ON_ZOOM;
}

/** 6.5 等は、基本のカタログ(stars.bin)に入れた星の暗さの限度。これより暗い星があれば、暗い星を最初から足してある(?stars=deep) */
export const DEEP_STAR_MAG = 6.5;

/** 星のカタログの等級の列(STAR_STRIDE 個ごとの 4 番目)に、DEEP_STAR_MAG より暗い星があるか */
export function catalogHasDeepStars(data: Float32Array, stride: number): boolean {
  for (let o = 3; o < data.length; o += stride) if (data[o] > DEEP_STAR_MAG + 1e-4) return true;
  return false;
}
