// 引きの眺めで、ボイジャーの位置を読み取りやすくする線の計算(純粋な関数)。
// 描画は guideLines.ts。
import { SCENES, type Scene } from '../lib/scenes';
import type { Vec3 } from './math';

/** ボイジャーから黄道面(z = 0)へ下ろした垂線の足もと。太陽中心の座標のまま、z だけ 0 にする */
export function footOnEcliptic(pos: Vec3, out: Vec3 = [0, 0, 0]): Vec3 {
  out[0] = pos[0];
  out[1] = pos[1];
  out[2] = 0;
  return out;
}

/** 時刻 et までに過ぎた名場面の数(その時刻ちょうどの名場面も過ぎたとみなす) */
export function passedSceneCount(et: number, scenes: readonly Scene[] = SCENES): number {
  let n = 0;
  for (const s of scenes) if (s.et <= et) n++;
  return n;
}

/** 垂線を出し続ける時間(ミリ秒)。引きの眺めを回している間と、回し終えてからこの時間 */
export const DROP_AFTER_DRAG_MS = 3000;
/**
 * 土星の場面の前後で垂線を出す範囲(秒)。
 * 土星の通過で進路は黄道面の近く(仰角 2〜3 度)から北へ約 35 度それ、通過の 1 か月後には面から 0.6 天文単位(通過の 1 か月前は 0.37)離れ始める。
 * それる瞬間は通過の数日前後だが、「面からどれだけ離れたか」が読み取れるのは数か月かけて離れていく間なので、後ろを長くとる
 */
export const SATURN_DROP_BEFORE_S = 30 * 86400;
export const SATURN_DROP_AFTER_S = 90 * 86400;

/** 時刻が土星の場面の前後(垂線を出す範囲)に入っているか */
export function inSaturnDropWindow(et: number, scenes: readonly Scene[] = SCENES): boolean {
  const saturn = scenes.find((s) => s.id === 'saturn');
  if (!saturn) return false;
  return et >= saturn.et - SATURN_DROP_BEFORE_S && et <= saturn.et + SATURN_DROP_AFTER_S;
}

/**
 * 垂線(と足もとの輪)を出したいか。普段は出さない。
 * (a) 引きの眺めを回している間と、最後に回してから DROP_AFTER_DRAG_MS の間 (b) 土星の場面の前後
 * msSinceDrag: 最後に回してからの時間(ミリ秒)。まだ回していなければ null
 */
export function dropWanted(et: number, msSinceDrag: number | null): boolean {
  if (msSinceDrag !== null && msSinceDrag <= DROP_AFTER_DRAG_MS) return true;
  return inSaturnDropWindow(et);
}
