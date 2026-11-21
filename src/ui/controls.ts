// 操作の部品の「判断」の部分。画面にも 3D にも依存しない純粋な関数(tests/ui/controls.test.ts で試す)。
import type { BodyId } from '../lib/bodies';
import type { LookTarget } from '../lib/scenes';
import type { RateId, ViewId } from '../lib/store';
import { atNacLimit, displayMagnification } from '../lib/zoom';

/** 速さのボタンを押すたびに進む順(1時間 → 1日 → 1か月 → 1年 → 1時間) */
export const RATE_ORDER: readonly RateId[] = ['hour', 'day', 'month', 'year'];

export function nextRate(rate: RateId): RateId {
  const i = RATE_ORDER.indexOf(rate);
  return RATE_ORDER[(i + 1) % RATE_ORDER.length];
}

/** 送り(‹ ›)の量。速さが 1時間の時は 1時間、それ以外は 1日 */
export function stepUnit(rate: RateId): 'hour' | 'day' {
  return rate === 'hour' ? 'hour' : 'day';
}

export function stepSeconds(rate: RateId): number {
  return stepUnit(rate) === 'hour' ? 3600 : 86400;
}

/** 右下の距離の上に小さく出すもの */
export type ReadoutExtra =
  | { kind: 'magnification'; value: number; atLimit: boolean }
  | { kind: 'craft'; meters: number }
  | null;

/** ボイジャーの視界は倍率、本体の視点は機体からの距離(整数の m)、引きの眺めは出さない */
export function readoutExtra(view: ViewId, magnification: number, craftDistance: number): ReadoutExtra {
  if (view === 'voyager') {
    return { kind: 'magnification', value: displayMagnification(magnification), atLimit: atNacLimit(magnification) };
  }
  if (view === 'craft') return { kind: 'craft', meters: Math.round(craftDistance) };
  return null;
}

/** 「星空だけを表示」から戻る案内。指で操作する端末はタップ、それ以外はクリック */
export function starsOnlyHintKind(coarsePointer: boolean): 'tap' | 'click' {
  return coarsePointer ? 'tap' : 'click';
}

/** 案内を出しておく時間(ミリ秒) */
export const STARS_ONLY_HINT_MS = 4000;

// ── 向く相手の候補 ──

/** 木星・土星は、ボイジャーとの距離がこの値以内の時だけ出す(km) */
export const PLANET_NEAR_KM = 3e7;
/** 月は、ボイジャーと地球の距離がこの値以内の時だけ出す(km) */
export const MOON_NEAR_KM = 2e6;
/** 木星・土星の衛星は、ボイジャーとの距離がこの値以内の時だけ出す(km) */
export const SATELLITE_NEAR_KM = 2e6;
export const GAS_GIANT_MOONS = ['io', 'europa', 'ganymede', 'callisto', 'titan'] as const;

export interface LookSource {
  /** 位置データのある時刻か */
  inCoverage(body: BodyId): boolean;
  /** 2 つの天体の距離(km) */
  distance(a: BodyId | 'voyager1', b: BodyId | 'voyager1'): number;
}

/**
 * 向く相手の候補。地球・太陽・進む先は常に。木星・土星・月は近い時期だけ。
 * 衛星は位置データの範囲の中で、ボイジャーに近い間だけ近い順に出す(範囲の外は端に丸まって距離が当てにならない)
 */
export function chooseLookTargets(src: LookSource): LookTarget[] {
  const list: LookTarget[] = ['earth', 'sun'];
  if (src.distance('voyager1', 'jupiter') <= PLANET_NEAR_KM) list.push('jupiter');
  if (src.distance('voyager1', 'saturn') <= PLANET_NEAR_KM) list.push('saturn');
  if (src.inCoverage('moon') && src.distance('voyager1', 'earth') <= MOON_NEAR_KM) list.push('moon');
  const near = GAS_GIANT_MOONS.filter((m) => src.inCoverage(m))
    .map((m) => ({ m, d: src.distance(m, 'voyager1') }))
    .filter((x) => x.d <= SATELLITE_NEAR_KM)
    .sort((a, b) => a.d - b.d);
  for (const x of near) list.push(x.m);
  list.push('ahead');
  return list;
}

// ── メニュー(一覧)のキーボード操作 ──

export type MenuKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

/** 一覧の中で次に当てる項目。current が -1 は、まだどれにも当たっていない。端で折り返す */
export function nextMenuIndex(count: number, current: number, key: MenuKey): number {
  if (count <= 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown') return current < 0 ? 0 : (current + 1) % count;
  return current < 0 ? count - 1 : (current - 1 + count) % count;
}
