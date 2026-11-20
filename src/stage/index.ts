// 3D の表示(差し込み口)。担当D が中身を入れる。
import type { Ephemeris } from '../lib/ephemeris';
import type { StarCatalog } from '../lib/stars';
import type { AppStore } from '../lib/store';

export interface StageOptions {
  canvas: HTMLCanvasElement;
  /** 天体の目印と名前を置く層(canvas の上に重ねた要素) */
  overlay: HTMLElement;
  eph: Ephemeris;
  stars: StarCatalog;
  store: AppStore;
}

export interface StageStats {
  /** 直近の 1 秒間に描いたコマ数。描いていない間は 0 */
  fps: number;
  /** 起動してから描いたコマの総数 */
  frames: number;
  /** 動きが無く、描き直しを止めているか */
  idle: boolean;
}

export interface Stage {
  stats(): StageStats;
  dispose(): void;
}

export function createStage(_options: StageOptions): Stage {
  throw new Error('createStage: not implemented yet');
}
