// 早回し中の惑星の「残像の弧」の判断(純粋な関数)。
// 1 秒＝1 年で再生すると水星は 1 秒に 4 周し、点が飛び飛びに見えてちらつく。
// 速さは再生の設定ではなく、前のコマから実際に時刻がどれだけ進んだかで決める。
// こうすると、自動再生でも時間軸をつまんで動かした時でも同じに働く。
import type { BodyId } from '../lib/bodies';
import { smoothstep } from './math';

export type PlanetId = Extract<BodyId, 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'>;

/** 公転周期(日)。1 コマで進む角度を求めるだけなので、平均の周期で足りる */
export const PERIOD_DAYS: Record<PlanetId, number> = {
  mercury: 87.969,
  venus: 224.701,
  earth: 365.256,
  mars: 686.98,
  jupiter: 4332.589,
  saturn: 10759.22,
  uranus: 30688.5,
  neptune: 60182,
};

/** 1 コマでこの角度(度)以上進む時に、点を弧に替える */
export const STREAK_ON_DEG = 3;
/** 弧になっている間は、この角度を下回るまで弧を続ける(境目で点と弧が入れ替わり続けないように) */
export const STREAK_OFF_DEG = 2.2;
/** 弧が長くなり、軌道全体の明るさへ移っていく範囲(度)。360 度で軌道全体になる */
export const GLOW_FROM_DEG = 240;
export const GLOW_FULL_DEG = 360;
/** 時刻がこの秒数より大きく飛んだコマは、早回しではなく移動(名場面への移動など)なので弧にしない */
export const JUMP_SECONDS = 3 * 365.25 * 86400;

export type StreakMode = 'dot' | 'arc' | 'orbit';

export interface StreakShape {
  mode: StreakMode;
  /** 弧の長さ(度)。点と軌道全体の時は 0 */
  arcDeg: number;
  /** 弧の濃さ(0〜1)。軌道全体が明るくなるにつれて弧は消える */
  arcAlpha: number;
  /** 軌道の線の明るさの足し分(0〜1) */
  glow: number;
}

/** 1 コマで時刻が deltaSeconds 進んだ時、周期 periodDays の惑星が軌道を進む角度(度、常に 0 以上) */
export function stepAngleDeg(deltaSeconds: number, periodDays: number): number {
  return (360 * Math.abs(deltaSeconds)) / (periodDays * 86400);
}

/** 1 コマで進んだ角度から、点・弧・軌道全体のどれで描くかと、弧の長さ・明るさを決める */
export function classifyStreak(angleDeg: number, wasStreaking = false): StreakShape {
  const threshold = wasStreaking ? STREAK_OFF_DEG : STREAK_ON_DEG;
  if (!(angleDeg >= threshold)) return { mode: 'dot', arcDeg: 0, arcAlpha: 0, glow: 0 };
  if (angleDeg >= GLOW_FULL_DEG) return { mode: 'orbit', arcDeg: 0, arcAlpha: 0, glow: 1 };
  const glow = smoothstep(GLOW_FROM_DEG, GLOW_FULL_DEG, angleDeg);
  return { mode: 'arc', arcDeg: angleDeg, arcAlpha: 1 - glow, glow };
}
