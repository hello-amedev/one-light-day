// 線や点がすっと現れる・消える動きの決まり(純粋な関数)。
import { smoothstep } from './math';

/** 表示の切り替え(軌道・星空だけ)で線が薄れる・戻る時間(秒)。操作しない間の薄れ(0.34 秒)に近い */
export const LINE_FADE_S = 0.3;
/** 垂線が現れる・消える時間(秒) */
export const DROP_FADE_S = 0.5;

/** current を target へ、seconds 秒で端から端へ動く速さで dt 秒ぶん近づける */
export function stepToward(current: number, target: number, dtSec: number, seconds: number): number {
  const step = seconds > 0 ? dtSec / seconds : 1;
  const d = target - current;
  return Math.abs(d) <= step ? target : current + Math.sign(d) * step;
}

/** カメラの、ボイジャーからのずれ(km)がこの範囲で、視界・本体の視点(0)から引きの眺め(1)へ切り替わる */
export const VIEW_FADE_FROM_KM = 1e6;
export const VIEW_FADE_TO_KM = 3e7;

/**
 * 引きの眺めの線(軌跡・刻み・点・垂線)の、視点による濃さ。
 * ボイジャーの視界(ずれ 0)と本体の視点(数十 m)では 0 で、引きの眺めでは 1。視点の切り替えの途中は、ずれの長さに沿ってつながる
 */
export function viewLineFade(offsetKm: number): number {
  return smoothstep(VIEW_FADE_FROM_KM, VIEW_FADE_TO_KM, offsetKm);
}
