// 拡大(倍率)と、ボイジャー本体の視点のカメラの距離の決まり。画面にも 3D にも依存しない純粋な関数。
// 倍率は「標準の視野(画面の短い辺で 60 度)÷ いまの視野」。×1 が標準、上限はボイジャーの狭角カメラの視野。

/** ×1 の視野(画面の短い辺。度) */
export const FOV_BASE_DEG = 60;
/** ボイジャーの狭角カメラ(ISS NAC)の視野(度) */
export const NAC_FOV_DEG = 0.42;
/** 倍率の下限と上限。上限は狭角カメラと同じ視野(×約143) */
export const MAG_MIN = 1;
export const MAG_MAX = FOV_BASE_DEG / NAC_FOV_DEG;

/** 本体の視点の、カメラから機体までの距離(m)。既定・近い限度・遠い限度 */
export const CRAFT_DISTANCE_DEFAULT_M = 20;
export const CRAFT_DISTANCE_MIN_M = 6;
export const CRAFT_DISTANCE_MAX_M = 200;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function clampMagnification(m: number): number {
  return clamp(m, MAG_MIN, MAG_MAX);
}

export function clampCraftDistance(m: number): number {
  return clamp(m, CRAFT_DISTANCE_MIN_M, CRAFT_DISTANCE_MAX_M);
}

/** 倍率から、画面の短い辺の視野(度) */
export function fovFromMagnification(m: number): number {
  return FOV_BASE_DEG / clampMagnification(m);
}

/** 画面の短い辺の視野(度)から倍率 */
export function magnificationFromFov(fovDeg: number): number {
  return clampMagnification(FOV_BASE_DEG / fovDeg);
}

/**
 * ホイール・ピンチの量を倍率に当てる。factor が 1 より大きいと遠ざかる(視野が広がる = 倍率が下がる)。
 * 上限・下限の近くで丸め誤差が残らないよう、限度のすぐそばは限度に吸い付ける
 */
export function zoomMagnification(m: number, factor: number): number {
  const next = clampMagnification(m / factor);
  if (next > MAG_MAX * 0.995) return MAG_MAX;
  if (next < MAG_MIN * 1.005) return MAG_MIN;
  return next;
}

/** ホイール・ピンチの量を本体からの距離に当てる。factor が 1 より大きいと離れる */
export function zoomCraftDistance(m: number, factor: number): number {
  return clampCraftDistance(m * factor);
}

/** 倍率が上限(狭角カメラと同じ視野)に達しているか */
export function atNacLimit(m: number): boolean {
  return m >= MAG_MAX * 0.999;
}

/** 画面に出す倍率の数(10 倍未満は小数 1 桁。整数になる時は小数を付けない) */
export function displayMagnification(m: number): number {
  if (m >= 10) return Math.round(m);
  return Math.round(m * 10) / 10;
}
