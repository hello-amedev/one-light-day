// 衛星(イオ・エウロパ・ガニメデ・カリスト・タイタン)の位置データの検査。
// 正解は 2 種類:
//  - 監督が設計の段階で NASA JPL Horizons へ直接問い合わせて控えた「衛星の中心から見たボイジャーの距離」(時刻は TDB)
//  - 道具が --fixtures で作った、区間の中の無作為な時刻の値(fixtures/horizons-moons.json)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { etFromIso } from '../../src/lib/ephemeris';
import { SATELLITE_PARENT, type BodyId } from '../../src/lib/bodies';
import { err, loadFromDisk } from './helpers';

/** TDB の暦(UTC ではない)→ et */
function etFromTdb(y: number, mo: number, d: number, h = 0, mi = 0): number {
  return (Date.UTC(y, mo - 1, d, h, mi, 0) - Date.UTC(2000, 0, 1, 12, 0, 0)) / 1000;
}

interface MoonSample {
  body: BodyId;
  parent: BodyId;
  utc: string;
  moonParent: [number, number, number];
  voyagerMoon: [number, number, number];
}

const { eph } = loadFromDisk();
const samples = (
  JSON.parse(readFileSync(join(__dirname, 'fixtures', 'horizons-moons.json'), 'utf8')) as { samples: MoonSample[] }
).samples;

describe('衛星: 控えておいた Horizons の値との突き合わせ', () => {
  const cases: Array<[string, BodyId, number, number, number]> = [
    // [説明, 衛星, et, 衛星の中心から見たボイジャーの距離 km, 許す差 km]
    ['タイタン(1980-11-12 05:40 TDB)', 'titan', etFromTdb(1980, 11, 12, 5, 40), 6708, 30],
    ['イオ(1979-03-05 15:10 TDB)', 'io', etFromTdb(1979, 3, 5, 15, 10), 20838, 30],
    ['ガニメデ(1979-03-06 02:20 TDB)', 'ganymede', etFromTdb(1979, 3, 6, 2, 20), 113980, 200],
    ['カリスト(1979-03-06 17:00 TDB)', 'callisto', etFromTdb(1979, 3, 6, 17, 0), 126627, 200],
    ['エウロパ(1979-03-05 17:20 TDB)', 'europa', etFromTdb(1979, 3, 5, 17, 20), 733028, 300],
  ];
  for (const [name, body, et, expected, tolerance] of cases) {
    it(name, () => {
      expect(Math.abs(eph.distance('voyager1', body, et) - expected)).toBeLessThanOrEqual(tolerance);
    });
  }
});

describe('衛星: 区間の中の無作為な時刻', () => {
  it('各衛星に 5 点以上の正解がある', () => {
    for (const body of ['io', 'europa', 'ganymede', 'callisto', 'titan'] as const) {
      expect(samples.filter((s) => s.body === body).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('親の惑星から見た衛星の位置が 10km 以内で合う', () => {
    for (const s of samples) {
      const got = eph.position(s.body, s.parent, etFromIso(s.utc));
      expect(err(got, s.moonParent)).toBeLessThan(10);
    }
  });

  it('衛星の中心から見たボイジャーの位置が 20km 以内で合う', () => {
    for (const s of samples) {
      const got = eph.position('voyager1', s.body, etFromIso(s.utc));
      expect(err(got, s.voyagerMoon)).toBeLessThan(20);
    }
  });
});

describe('衛星: 読み出しの決まり', () => {
  it('位置がある範囲は、親の惑星の通過の前後 3 日', () => {
    const jupiter = etFromTdb(1979, 3, 5, 12, 5);
    const saturn = etFromTdb(1980, 11, 12, 23, 45);
    for (const [body, parent] of Object.entries(SATELLITE_PARENT) as Array<[BodyId, BodyId]>) {
      if (body === 'moon') continue;
      const c = eph.coverage(body);
      const centre = parent === 'jupiter' ? jupiter : saturn;
      expect(Math.abs(c.t0 - (centre - 3 * 86400))).toBeLessThan(3600);
      expect(Math.abs(c.t1 - (centre + 3 * 86400))).toBeLessThan(3600);
    }
  });

  it('太陽中心の位置は、親の惑星の位置 + 衛星の相対位置', () => {
    const et = etFromTdb(1980, 11, 12, 5, 40);
    const titanSun = eph.position('titan', 'sun', et);
    const saturnSun = eph.position('saturn', 'sun', et);
    const rel = eph.position('titan', 'saturn', et);
    expect(err(titanSun, [saturnSun[0] + rel[0], saturnSun[1] + rel[1], saturnSun[2] + rel[2]])).toBeLessThan(1);
    // タイタンの軌道半径は約 122 万km
    expect(Math.abs(Math.hypot(rel[0], rel[1], rel[2]) - 1_222_000)).toBeLessThan(40_000);
  });

  it('範囲の外の時刻でも例外が出ず、端の値に丸まる', () => {
    const c = eph.coverage('io');
    const atEdge = eph.position('io', 'jupiter', c.t1);
    const beyond = eph.position('io', 'jupiter', c.t1 + 10 * 365 * 86400);
    expect(err(atEdge, beyond)).toBeLessThan(1e-6);
    expect(() => eph.position('titan', 'voyager1', 0)).not.toThrow();
  });
});
