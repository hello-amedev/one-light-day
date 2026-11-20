// 時刻の変換。位置データの時刻(et = TDB の秒数, J2000 起点)と、UTC(JavaScript の Date のミリ秒)を行き来する。
//
// TDB と UTC の差は「うるう秒の累計 + 32.184 秒」。1977 年は 48.184 秒、2017 年以降は 69.184 秒。
// TDB と TT の差(最大 1.7 ミリ秒)は無視する。

/** うるう秒の表: [この UTC のミリ秒から, TAI−UTC の秒数]。1977 年より前は扱わない */
const LEAP_TABLE: ReadonlyArray<readonly [number, number]> = [
  [Date.UTC(1977, 0, 1), 16],
  [Date.UTC(1978, 0, 1), 17],
  [Date.UTC(1979, 0, 1), 18],
  [Date.UTC(1980, 0, 1), 19],
  [Date.UTC(1981, 6, 1), 20],
  [Date.UTC(1982, 6, 1), 21],
  [Date.UTC(1983, 6, 1), 22],
  [Date.UTC(1985, 6, 1), 23],
  [Date.UTC(1988, 0, 1), 24],
  [Date.UTC(1990, 0, 1), 25],
  [Date.UTC(1991, 0, 1), 26],
  [Date.UTC(1992, 6, 1), 27],
  [Date.UTC(1993, 6, 1), 28],
  [Date.UTC(1994, 6, 1), 29],
  [Date.UTC(1996, 0, 1), 30],
  [Date.UTC(1997, 6, 1), 31],
  [Date.UTC(1999, 0, 1), 32],
  [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34],
  [Date.UTC(2012, 6, 1), 35],
  [Date.UTC(2015, 6, 1), 36],
  [Date.UTC(2017, 0, 1), 37],
];

const TT_MINUS_TAI = 32.184;
const J2000_AS_UTC_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** その UTC の時点での TAI−UTC(うるう秒の累計) */
export function leapSecondsAt(utcMs: number): number {
  let value = LEAP_TABLE[0][1];
  for (const [from, seconds] of LEAP_TABLE) {
    if (utcMs >= from) value = seconds;
    else break;
  }
  return value;
}

/** UTC のミリ秒 → et */
export function etFromUtcMs(utcMs: number): number {
  return (utcMs - J2000_AS_UTC_MS) / 1000 + leapSecondsAt(utcMs) + TT_MINUS_TAI;
}

/** et → UTC のミリ秒 */
export function utcMsFromEt(et: number): number {
  // うるう秒の表は UTC で引くので、近似してから引き直す
  let utcMs = J2000_AS_UTC_MS + (et - 69.184) * 1000;
  for (let i = 0; i < 2; i++) {
    utcMs = J2000_AS_UTC_MS + (et - leapSecondsAt(utcMs) - TT_MINUS_TAI) * 1000;
  }
  return utcMs;
}

/** '1990-02-14T04:48:00Z' のような UTC の文字列 → et */
export function etFromIso(isoUtc: string): number {
  const ms = Date.parse(isoUtc);
  if (Number.isNaN(ms)) throw new Error(`invalid UTC string: ${isoUtc}`);
  return etFromUtcMs(ms);
}

/** いまの時刻の et */
export function etNow(): number {
  return etFromUtcMs(Date.now());
}
