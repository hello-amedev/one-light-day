import { describe, expect, it } from 'vitest';
import {
  daysSinceLaunch,
  formatDate,
  formatDateTime,
  formatDistance,
  formatJstDateTime,
  formatLightDuration,
  formatLightTime,
  formatSinceLaunch,
} from '../../src/lib/format';
import { etFromIso } from '../../src/lib/ephemeris/time';

describe('日付', () => {
  it('UTC の日付と時刻', () => {
    expect(formatDate(etFromIso('1990-02-14T04:48:00Z'))).toBe('1990.02.14');
    expect(formatDateTime(etFromIso('1990-02-14T04:48:00Z'))).toBe('1990.02.14 04:48 UTC');
  });
  it('日本時間の併記', () => {
    expect(formatJstDateTime(etFromIso('2026-11-18T10:16:07Z'))).toBe('2026年11月18日 19時16分7秒（日本時間）');
  });
  it('打ち上げからの日数', () => {
    expect(daysSinceLaunch(etFromIso('1990-02-14T04:48:00Z'))).toBe(4545);
    expect(daysSinceLaunch(etFromIso('2026-11-18T10:16:07Z'))).toBe(17971);
    expect(formatSinceLaunch(etFromIso('1990-02-14T04:48:00Z'))).toBe('打ち上げから4,545日');
    expect(daysSinceLaunch(etFromIso('1977-09-05T14:05:00Z'))).toBe(0);
  });
});

describe('距離', () => {
  it('億・万・km', () => {
    expect(formatDistance(6.06e9)).toBe('60.6億km');
    expect(formatDistance(2.59e10)).toBe('259億km');
    expect(formatDistance(3.48e5)).toBe('34.8万km');
    expect(formatDistance(1.096e7)).toBe('1,096万km');
    expect(formatDistance(6708)).toBe('6,708km');
    expect(formatDistance(1.5e8)).toBe('1.5億km');
  });
  it('丸めで桁が上がる時は次の単位', () => {
    expect(formatDistance(9_999_700)).toBe('1,000万km');
    expect(formatDistance(99_999_999)).toBe('1.0億km');
    expect(formatDistance(9999.7)).toBe('10,000km');
    expect(formatDistance(10_000)).toBe('1.0万km');
  });
});

describe('光の時間', () => {
  it('時間と分、秒まで、短い時間', () => {
    expect(formatLightDuration(5 * 3600 + 36 * 60 + 20)).toBe('5時間36分');
    expect(formatLightDuration(86400, true)).toBe('24時間0分0秒');
    expect(formatLightDuration(36 * 60 + 12)).toBe('36分12秒');
    expect(formatLightDuration(8.3)).toBe('8.3秒');
    expect(formatLightTime(299_792.458 * (5 * 3600 + 36 * 60))).toBe('光の速さで5時間36分');
    expect(formatLightTime(299_792.458 * 86400, true)).toBe('光の速さで24時間0分0秒');
  });
});
