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
