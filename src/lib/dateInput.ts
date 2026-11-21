// 右上の日付に打った文字を読み、移る先の時刻を決める(画面に依存しない純粋な関数)。
// 日付は UTC。時刻は今の表示のまま、日付だけを替える。範囲(打ち上げ〜今日)の外や、読めない形は null。
import { etFromUtcMs, utcMsFromEt } from './ephemeris/time';

const DAY_MS = 86_400_000;

/**
 * 打った文字から年・月・日を読む。読める形:
 * 1990.02.14 / 1990.2.14 / 1990/2/14 / 1990-02-14 / 1990 2 14 / 1990年2月14日 / 19900214。全角の数字も読む
 */
export function parseDateInput(text: string): { y: number; m: number; d: number } | null {
  const s = text.normalize('NFKC').trim();
  let parts: string[] | null = null;
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (compact) parts = compact.slice(1);
  else {
    const split = s.split(/[^\d]+/).filter(Boolean);
    if (split.length === 3 && split[0].length === 4 && split[1].length <= 2 && split[2].length <= 2) parts = split;
  }
  if (!parts) return null;
  const [y, m, d] = parts.map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

/**
 * 打った文字から、移る先の et を返す。今の et の時刻(UTC の時・分・秒)を残して日付だけを替え、
 * 範囲の端の日は範囲の中へ丸める(打ち上げの日の打ち上げ前など)。範囲の外の日付や読めない形は null
 */
export function dateInputToEt(text: string, currentEt: number, minEt: number, maxEt: number): number | null {
  const date = parseDateInput(text);
  if (!date) return null;
  const dayStart = Date.UTC(date.y, date.m - 1, date.d);
  const minDay = Math.floor(utcMsFromEt(minEt) / DAY_MS) * DAY_MS;
  const maxDay = Math.floor(utcMsFromEt(maxEt) / DAY_MS) * DAY_MS;
  if (dayStart < minDay || dayStart > maxDay) return null;
  const nowMs = utcMsFromEt(currentEt);
  const timeOfDay = nowMs - Math.floor(nowMs / DAY_MS) * DAY_MS;
  const et = etFromUtcMs(dayStart + timeOfDay);
  return Math.min(maxEt, Math.max(minEt, et));
}
