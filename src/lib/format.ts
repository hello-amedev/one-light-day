// 日付・距離・時間の整形。言語で変わる処理はここに集める(文にする部分は辞書の関数を通す)。
import { C_KM_S } from './ephemeris/types';
import { utcMsFromEt } from './ephemeris/time';
import { currentLocale, t } from './i18n';

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** 秒単位に丸めた UTC のミリ秒。et と UTC の変換の誤差で 59.9999 秒になって分が 1 つ戻るのを防ぐ */
function utcMsRounded(et: number): number {
  return Math.round(utcMsFromEt(et) / 1000) * 1000;
}

/** 整数の桁区切り(4,545) */
export function formatInteger(n: number): string {
  return new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 0 }).format(n);
}

/** 小数 1 桁(60.6)。桁区切りつき */
function formatOneDecimal(n: number): string {
  return new Intl.NumberFormat(currentLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}

/** et → UTC の日付 `1990.02.14` */
export function formatDate(et: number): string {
  const d = new Date(utcMsRounded(et));
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

/** et → UTC の日付と時刻 `1990.02.14 04:48 UTC` */
export function formatDateTime(et: number): string {
  const d = new Date(utcMsRounded(et));
  return `${formatDate(et)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} ${t().hud.utcSuffix}`;
}

/** et → 日本時間の日付と時刻(秒まで)。時刻が意味を持つ所だけで使う */
export function formatJstDateTime(et: number): string {
  const d = new Date(utcMsRounded(et) + 9 * 3600 * 1000);
  return t().hud.jstDateTime(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
}

const LAUNCH_UTC_DAY = Date.UTC(1977, 8, 5);

/** 打ち上げ(1977-09-05, UTC の日付)からの経過日数 */
export function daysSinceLaunch(et: number): number {
  const d = new Date(utcMsRounded(et));
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day - LAUNCH_UTC_DAY) / 86_400_000);
}

/** 「打ち上げから4,545日」 */
export function formatSinceLaunch(et: number): string {
  return t().hud.sinceLaunch(formatInteger(daysSinceLaunch(et)));
}

/** 距離 km → 「60.6億km」「34.8万km」「6,708km」 */
export function formatDistance(km: number): string {
  const hud = t().hud;
  const abs = Math.abs(km);
  // 丸めた結果が次の単位の桁に届く時は、次の単位で出す(「10,000km」「100.0万km」を避ける)
  const man = abs / 1e4;
  const manRounded = man < 100 ? Math.round(man * 10) / 10 : Math.round(man);
  if (abs >= 1e8 || manRounded >= 10_000) {
    const oku = abs / 1e8;
    const okuRounded = Math.round(oku * 10) / 10;
    return hud.distanceOku(okuRounded < 100 ? formatOneDecimal(oku) : formatInteger(oku));
  }
  if (abs >= 1e4) {
    return hud.distanceMan(man < 100 && manRounded < 100 ? formatOneDecimal(man) : formatInteger(man));
  }
  return hud.distanceKm(formatInteger(abs));
}

/**
 * 切りのよい距離 km → 「10億km」「2000万km」「500km」。縮尺の物差し用で、小数は出さない。
 * 1・2・5 × 10 の何乗 km を渡す前提(億・万の単位に丸めた時に端数が出ない値)
 */
export function formatDistanceRound(km: number): string {
  const hud = t().hud;
  const abs = Math.abs(km);
  if (abs >= 1e8) return hud.distanceOku(formatInteger(abs / 1e8));
  if (abs >= 1e4) return hud.distanceMan(formatInteger(abs / 1e4));
  return hud.distanceKm(formatInteger(abs));
}

/** 秒数 → 「5時間36分」。withSeconds なら「24時間0分0秒」。1 時間未満は「36分12秒」、1 分未満は「8.3秒」 */
export function formatLightDuration(seconds: number, withSeconds = false): string {
  const hud = t().hud;
  if (seconds < 60) {
    const tenths = Math.round(seconds * 10) / 10;
    // 59.96 秒が 60.0 秒に丸まる時は 1 分として出す
    if (tenths < 60) return hud.durationS(tenths.toFixed(1));
  }
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h === 0) return hud.durationMS(String(m), String(s));
  return withSeconds ? hud.durationHMS(String(h), String(m), String(s)) : hud.durationHM(String(h), String(m));
}

/** 距離 km → 「光で5時間36分」 */
export function formatLightTime(distanceKm: number, withSeconds = false): string {
  return t().hud.lightTime(formatLightDuration(distanceKm / C_KM_S, withSeconds));
}
