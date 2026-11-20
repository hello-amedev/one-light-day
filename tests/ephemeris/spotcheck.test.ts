// 監督による抜き取りの検査。
// 正解は、データを作る道具とは別に、設計の段階で NASA JPL Horizons へ直接問い合わせて控えた値(2026-11-20)。
// 道具が作った fixtures と同じ間違いを共有しないよう、時刻は TDB の暦から直接 et に直している。

import { describe, expect, it } from 'vitest';
import { loadFromDisk } from './helpers';

/** TDB の暦(UTC ではない)→ et */
function etFromTdb(y: number, mo: number, d: number, h = 0, mi = 0): number {
  return (Date.UTC(y, mo - 1, d, h, mi, 0) - Date.UTC(2000, 0, 1, 12, 0, 0)) / 1000;
}

describe('控えておいた Horizons の値との突き合わせ', () => {
  const { eph } = loadFromDisk();

  const cases: Array<[string, 'earth' | 'sun' | 'jupiter' | 'saturn', number, number, number]> = [
    // [説明, 中心, et, Horizons の距離 km, 許す差 km]
    ['1光日の直前(2026-11-18 10:15 TDB)の地球から', 'earth', etFromTdb(2026, 11, 18, 10, 15), 2.590206491123884e10, 100],
    ['1光日の直後(2026-11-18 10:30 TDB)の地球から', 'earth', etFromTdb(2026, 11, 18, 10, 30), 2.590208777649022e10, 100],
    ['2027-04-30 の地球から(地球が近づく時期)', 'earth', etFromTdb(2027, 4, 30), 259.2906e8, 1e5],
    ['2035-01-01 の太陽から(予測位置)', 'sun', etFromTdb(2035, 1, 1), 3.010836058329089e10, 100],
    ['木星の最接近(1979-03-05 12:05 TDB)', 'jupiter', etFromTdb(1979, 3, 5, 12, 5), 348436, 20],
    ['土星の最接近(1980-11-12 23:45 TDB)', 'saturn', etFromTdb(1980, 11, 12, 23, 45), 184039, 20],
    ['データの始まり付近(1977-09-05 14:00 TDB)の地球の中心から', 'earth', etFromTdb(1977, 9, 5, 14, 0), 7703, 20],
    ['打ち上げの2時間後(16:00 TDB)の地球の中心から', 'earth', etFromTdb(1977, 9, 5, 16, 0), 84405, 20],
    ['1977-09-18 の地球から', 'earth', etFromTdb(1977, 9, 18), 10955880, 100],
  ];

  for (const [name, center, et, expected, tolerance] of cases) {
    it(name, () => {
      const got = eph.distance('voyager1', center, et);
      expect(Math.abs(got - expected)).toBeLessThanOrEqual(tolerance);
    });
  }

  it('今日のボイジャーから振り返ると、太陽はオリオン座の足元(リゲルの近く)に見える', () => {
    // 黄道座標 → 赤道座標に戻して、赤経・赤緯で確かめる(軸の取り違えと裏返しの検査)
    const et = etFromTdb(2026, 11, 18);
    const v = eph.position('sun', 'voyager1', et);
    const eps = (23.4392911 * Math.PI) / 180;
    const xe = v[0];
    const ye = Math.cos(eps) * v[1] - Math.sin(eps) * v[2];
    const ze = Math.sin(eps) * v[1] + Math.cos(eps) * v[2];
    const raHours = (((Math.atan2(ye, xe) * 12) / Math.PI) + 24) % 24;
    const decDeg = (Math.asin(ze / Math.hypot(xe, ye, ze)) * 180) / Math.PI;
    // 太陽は赤経 5時16分・赤緯 −12度あたり。リゲルは赤経 5時14.5分・赤緯 −8.2度
    expect(Math.abs(raHours - 5.27)).toBeLessThan(0.1);
    expect(Math.abs(decDeg - -12.2)).toBeLessThan(1);
  });

  it('惑星から見たボイジャーと、ボイジャーから見た惑星が正反対になる(通過の区間)', () => {
    const et = etFromTdb(1979, 3, 5, 12, 5);
    const a = eph.position('voyager1', 'jupiter', et);
    const b = eph.position('jupiter', 'voyager1', et);
    expect(Math.hypot(a[0] + b[0], a[1] + b[1], a[2] + b[2])).toBeLessThan(1e-3);
  });
});
