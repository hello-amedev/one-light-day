// ボイジャー本体の視点の、純粋な計算(three.js に頼らない)。テストは tests/stage/craft.test.ts。
import { cross, dot, normalize, scale, sub, type Vec3 } from './math';

/** 3×3 の行列(行の順。列ベクトルに左から掛ける) */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

/** 高利得アンテナ(皿)の実際の直径(m) */
export const DISH_DIAMETER_M = 3.7;

/** モデルの 1 単位が何 km か。皿の直径(モデルの単位)を実際の大きさ(m)に合わせる */
export function modelUnitKm(dishDiameterModel: number, dishDiameterM: number = DISH_DIAMETER_M): number {
  return dishDiameterM / 1000 / dishDiameterModel;
}

/**
 * モデルの向きを、黄道の座標へ移す回転。
 * 皿の軸(axisModel)が toEarth を向き、皿の軸のまわりは、rollModel が upWorld を含む面に来るよう一定にする。
 * 記録された機体の回転は再現しない(SPEC)ので、日付によらず見え方が安定する。
 */
export function craftOrientation(
  axisModel: Vec3,
  rollModel: Vec3,
  toEarth: Vec3,
  upWorld: Vec3 = [0, 0, 1],
): Mat3 {
  const a = normalize(axisModel);
  const r = normalize(sub(rollModel, scale(a, dot(rollModel, a))));
  const s = cross(a, r);
  const A = normalize(toEarth);
  // 皿の軸が上と平行に近い時は、別の上を借りる
  const up = Math.abs(dot(A, upWorld)) > 0.999 ? ([1, 0, 0] as Vec3) : upWorld;
  const R = normalize(sub(up, scale(A, dot(up, A))));
  const S = cross(A, R);
  // 行列 = W · Mᵀ(W は世界の基底を列に並べたもの、M はモデルの基底を列に並べたもの)
  const out = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i * 3 + j] = A[i] * a[j] + R[i] * r[j] + S[i] * s[j];
    }
  }
  return out as unknown as Mat3;
}

export function applyMat3(m: Mat3, v: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  const x = m[0] * v[0] + m[1] * v[1] + m[2] * v[2];
  const y = m[3] * v[0] + m[4] * v[1] + m[5] * v[2];
  const z = m[6] * v[0] + m[7] * v[1] + m[8] * v[2];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/** 0〜1 のなめらかな段(a 以下で 0、b 以上で 1) */
export function smooth01(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * 光点と機体の入れ替え(全体を俯瞰 ↔ 本体の視点)。機体の皿の画面上の大きさ(px)で決める。
 * 機体が光点より小さい間は光点だけ、光点と同じくらいに育つ間に重ねて入れ替える(遠くでいきなり消えて、近くでふっと出るのを防ぐ)
 */
export const HANDOFF_MODEL_PX: readonly [number, number] = [1.5, 6];
export const HANDOFF_BEACON_PX: readonly [number, number] = [5, 16];

/** 皿の直径が画面で何 px に見えるか。offsetKm はカメラから機体までの距離、heightPx と tanV は画面の高さと縦の視野の半分の tan */
export function craftScreenPx(offsetKm: number, heightPx: number, tanV: number): number {
  if (!(offsetKm > 0)) return Infinity;
  return (DISH_DIAMETER_M / 1000 / offsetKm) * (heightPx / (2 * tanV));
}

/** 光点の濃さ(0〜1)。機体が育つほど薄くなる */
export function beaconHandoff(craftPx: number): number {
  return 1 - smooth01(HANDOFF_BEACON_PX[0], HANDOFF_BEACON_PX[1], craftPx);
}

/**
 * 機体の見え方(0〜1)。timeRamp は視点に入る・出る時間のなめらかな変化、
 * offsetKm はボイジャーからカメラまでのずれ(km)。機体のすぐそば(ボイジャーの視界)では描かない。
 * craftPx は皿の画面上の大きさ(px)。遠くで小さい間は光点に任せて描かない
 */
export function craftOpacity(timeRamp: number, offsetKm: number, craftPx: number = Infinity): number {
  return timeRamp * smooth01(0.002, 0.012, offsetKm) * smooth01(HANDOFF_MODEL_PX[0], HANDOFF_MODEL_PX[1], craftPx);
}
