// 開いた直後の自動再生の決まり(画面に依存しない純粋な関数)。
// 時刻を実際に進めるのは store の tick。ここは「経過の割合 → 時刻」と「始めるかどうか」だけを決める。
import { etFromIso } from './ephemeris/time';

/** 題字を見せる秒数。この間、時刻は打ち上げのまま動かさない */
export const INTRO_TITLE_SECONDS = 3;
/** 早回しの秒数 */
export const INTRO_RUN_SECONDS = 20;
/** 今日で止まった後、案内の 1 行を出しておく秒数 */
export const INTRO_GUIDE_SECONDS = 6;

/** 最初の山場(木星・土星の通過)の終わり。進路が曲がるのはここまでなので、時間を多く使う */
export const INTRO_EARLY_END_ET = etFromIso('1981-01-01T00:00:00Z');
/** 山場に使う、早回しの時間の割合 */
export const INTRO_EARLY_SHARE = 0.4;

/**
 * 早回しの経過の割合(0〜1)から、表示する時刻を返す。
 * 前半は一定の速さで山場(startEt〜earlyEndEt)を通る。後半は残りの約 46 年を、前半の速さから滑らかにつなぎ、
 * 最後は 0 まで減速して今日で止まる(3 次のエルミート補間。速さが途中で飛ばない)。
 */
export function introEt(
  progress: number,
  startEt: number,
  endEt: number,
  earlyEndEt: number = INTRO_EARLY_END_ET,
): number {
  const p = Math.min(1, Math.max(0, progress));
  const span = endEt - startEt;
  if (!(span > 0)) return startEt;
  const mid = Math.min(endEt, Math.max(startEt, earlyEndEt));
  const first = mid - startEt;
  const rest = endEt - mid;
  if (rest <= 0) return startEt + span * p;
  if (p <= INTRO_EARLY_SHARE) return startEt + first * (p / INTRO_EARLY_SHARE);

  const s = (p - INTRO_EARLY_SHARE) / (1 - INTRO_EARLY_SHARE);
  // 前半の速さ(割合 1 あたり first/EARLY_SHARE)を、後半の割合 s に直した接線。大きすぎると逆戻りするので 3 で抑える
  const m0 = Math.min(3, ((first / INTRO_EARLY_SHARE) * (1 - INTRO_EARLY_SHARE)) / rest);
  const x = (s ** 3 - 2 * s ** 2 + s) * m0 + (-2 * s ** 3 + 3 * s ** 2);
  return mid + rest * x;
}

/** 開いた直後にどうするか。'play' は自動再生、'still' は今日の引きの眺めを止めて始める、'none' は何もしない */
export type IntroMode = 'play' | 'still' | 'none';

/**
 * 始め方を決める。名場面への直リンクや確認用の URL(t / view / look)と、計測用の ?intro=0 では始めない。
 * 動きを減らす設定の人には、動かさずに今日の引きの眺めだけを見せる。
 */
export function introMode(search: string, reducedMotion: boolean): IntroMode {
  const q = new URLSearchParams(search);
  if (q.has('t') || q.has('view') || q.has('look') || q.get('intro') === '0') return 'none';
  return reducedMotion ? 'still' : 'play';
}
