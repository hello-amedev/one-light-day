// 画面全体の状態の取り決め。実装は index.ts(担当C)。
// 画面の部品(Svelte)と 3D の表示(three.js)の両方がこの 1 つの状態を見る。Svelte に依存しない素の TypeScript で作る。

import type { LookTarget, SceneId } from '../scenes';

export type ViewId = 'voyager' | 'overview';

/** 再生の速さ。「1 秒＝◯」の◯ */
export type RateId = 'hour' | 'day' | 'month' | 'year';

/** 再生の速さごとの、現実の 1 秒あたりに進む秒数 */
export const RATE_SECONDS: Record<RateId, number> = {
  hour: 3600,
  day: 86400,
  month: 2_629_800,
  year: 31_557_600,
};

/**
 * 開いた直後の自動再生の段階。'title' は題字(時刻は動かさない)、'run' は早回し、
 * 'done' は今日で止まって案内を出している間、'off' は自動再生をしていない(利用者の操作で止めた後も)
 */
export type IntroPhase = 'off' | 'title' | 'run' | 'done';

export interface AppState {
  /** いま表示している時刻(et) */
  et: number;
  playing: boolean;
  rate: RateId;
  view: ViewId;
  /** 最後に「向く」を押した相手。まだ押していなければ null */
  lookTarget: LookTarget | null;
  /** 「向く」を押すたびに増える通し番号。同じ相手をもう一度押した時も 3D 側が気付けるようにする */
  lookSeq: number;
  /** 開いた直後の自動再生の段階。既存の項目とは独立で、'title' と 'run' の間は playing も true */
  intro: IntroPhase;
}

export interface AppStore {
  /** 時間軸の左端と右端。右端は「位置データの終わり」と「いま」の早いほう */
  readonly minEt: number;
  readonly maxEt: number;

  get(): Readonly<AppState>;
  /** 状態が変わるたびに呼ばれる。戻り値を呼ぶと解除 */
  subscribe(listener: (state: Readonly<AppState>) => void): () => void;

  /** 時刻を移す。範囲の外は端に丸める */
  setTime(et: number): void;
  /** 時刻を deltaSeconds だけ送る(送りダイヤル用。負の値で戻す) */
  stepTime(deltaSeconds: number): void;

  play(): void;
  pause(): void;
  toggle(): void;
  setRate(rate: RateId): void;

  setView(view: ViewId): void;
  lookAt(target: LookTarget): void;

  /** 名場面へ移る。その場面の時刻に移し、再生を止め、その場面の look を向く */
  jumpScene(id: SceneId): void;
  nextScene(): void;
  prevScene(): void;

  /**
   * 毎フレーム 3D 側が呼ぶ。再生中なら時刻を進める。名場面の近くでは自動で遅くする(自動再生中は決まった配分で進める)。
   * 右端に着いたら再生を止める。状態が変わったら true を返す。
   */
  /** 自動再生を始める(引きの眺めで、打ち上げの日から)。時刻は tick が進める */
  startIntro(): void;
  /** 自動再生を止めて操作を渡す。今日まで再生が済んだ後の案内も閉じる */
  stopIntro(): void;
  /** 動きを減らす設定の人向け。再生せず、今日の引きの眺めで止めて、案内だけ出せる状態にする */
  skipIntro(): void;

  tick(realDeltaSeconds: number): boolean;
}

export interface StoreOptions {
  minEt: number;
  maxEt: number;
  initialEt: number;
}
