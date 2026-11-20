// 球の天体を「カメラを中心に縮めて」置く計算。
// 距離 d・半径 r の天体を、方向はそのまま、距離 SHELL・半径 r/d×SHELL に置く。
// カメラから見た絵は厳密に同じで、全天体が同じ奥行きになるので、奥行きの判定を使わずに済む。
// float32 は 259 億 km 先で約 2,000km 単位に丸められるが、縮めれば SHELL の大きさで足りる。
import { sub, type Vec3 } from './math';

/** 縮めた球を置く距離(km)。near(1km)より十分遠く、float32 で位置の誤差が 1e-7 の割合に収まる */
export const SHELL = 1e6;

export interface ShellPlacement {
  /** カメラからの位置(three.js に渡す座標) */
  position: Vec3;
  radius: number;
  /** もとの距離 */
  distance: number;
}

/**
 * 天体のカメラからの相対位置は、必ず倍精度のまま「その天体の位置(ボイジャー中心) − カメラのずれ」で作る。
 * 太陽中心の位置どうしを引き算しない(通過の距離が数百〜千 km ずれ、遠くでは丸めで震える)。
 */
export function relativePosition(positionFromVoyager: Vec3, camOffset: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  return sub(positionFromVoyager, camOffset, out);
}

/** 相対位置 rel(km)・半径 radiusKm の球を、SHELL の距離に縮めて置く時の位置と半径 */
export function shellPlacement(rel: Vec3, radiusKm: number, shell: number = SHELL): ShellPlacement {
  const d = Math.hypot(rel[0], rel[1], rel[2]);
  const k = shell / d;
  // カメラが球の中に入る距離(d <= r)でも半径が距離を超えないようにする
  const radius = Math.min(radiusKm / d, 0.99999) * shell;
  return { position: [rel[0] * k, rel[1] * k, rel[2] * k], radius, distance: d };
}
