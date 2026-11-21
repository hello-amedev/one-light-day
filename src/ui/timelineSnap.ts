// 時間軸の刻みの「指した」「吸い付く」の判定(画面に依存しない純粋な関数)。
// 位置はどれも同じ向きの px(画面の左端からの距離など、同じ基準なら何でもよい)。

export type MarkKind = 'scene' | 'event';

export interface TimelineMark {
  kind: MarkKind;
  /** 名場面の ID か出来事の ID */
  id: string;
  px: number;
}

/** PC。カーソルが刻みを指したとみなす近さ(px)。つまみの太さと同じくらい、刻みの真上だけ */
export const HOVER_RADIUS: Record<MarkKind, number> = { scene: 10, event: 8 };

/**
 * スマホ。つまみが刻みに近づいたとみなす近さ(px)。名場面は強め(広く)、出来事は弱め(狭く)。
 * 1 年が約 7px の幅でも、打ち上げ・木星・土星(約 10px ずつ)を分けて選べる範囲に収める
 */
export const SNAP_RADIUS: Record<MarkKind, number> = { scene: 16, event: 9 };

/**
 * 吸い付きの強さ。刻みから d だけ離れた指に対し、つまみは R·(d/R)^p だけ離れて見える(R = 範囲)。
 * p が大きいほど、刻みの近くでつまみが動かなくなる。範囲の縁では d と同じなので、つまみは飛ばない
 */
export const SNAP_POWER: Record<MarkKind, number> = { scene: 2, event: 1.5 };

/** 範囲 radius の中で、距離の割合(距離 ÷ 範囲)が一番小さい刻み。範囲の外なら null */
export function nearestMark(px: number, marks: readonly TimelineMark[], radius: Record<MarkKind, number>): TimelineMark | null {
  let best: TimelineMark | null = null;
  let bestRatio = Infinity;
  for (const m of marks) {
    const ratio = Math.abs(px - m.px) / radius[m.kind];
    if (ratio <= 1 && ratio < bestRatio) {
      best = m;
      bestRatio = ratio;
    }
  }
  return best;
}

/** 指が px にある時の、つまみの位置と、吸い付いている刻み(無ければ null)。離したらその刻みへ移る */
export function snapPull(px: number, marks: readonly TimelineMark[]): { px: number; mark: TimelineMark | null } {
  const mark = nearestMark(px, marks, SNAP_RADIUS);
  if (!mark) return { px, mark: null };
  const d = px - mark.px;
  const r = SNAP_RADIUS[mark.kind];
  const pulled = Math.sign(d) * r * (Math.abs(d) / r) ** SNAP_POWER[mark.kind];
  return { px: mark.px + pulled, mark };
}

/** 吹き出しの位置の寄せ方(0〜1)。端の刻みでは吹き出しを内側へ寄せ、画面からはみ出さないようにする */
export function bubbleAnchor(frac: number): number {
  return Math.min(1, Math.max(0, frac));
}
