import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { C_KM_S, etFromIso, etFromUtcMs, utcMsFromEt } from '../../src/lib/ephemeris';
import { BODY_IDS } from '../../src/lib/bodies';
import { err, loadFromDisk, loadSamples } from './helpers';

const { eph, manifest } = loadFromDisk();
const samples = loadSamples();

describe('正解データ(Horizons に直接問い合わせた値)との一致', () => {
  it('正解は 40 点以上あり、通過の区間に各 5 点以上ある', () => {
    expect(samples.filter((s) => s.group === 'global').length).toBeGreaterThanOrEqual(40);
    for (const g of ['earth', 'jupiter', 'saturn'] as const) {
      expect(samples.filter((s) => s.group === g).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('地球とボイジャーの距離の差が全点で 1,000km 以内', () => {
    let worst = 0;
    for (const s of samples) {
      const et = etFromIso(s.utc);
      const truth = Math.hypot(...s.voyagerEarth);
      worst = Math.max(worst, Math.abs(eph.distance('earth', 'voyager1', et) - truth));
    }
    expect(worst).toBeLessThan(1000);
    // 実際はもっと良い
    expect(worst).toBeLessThan(100);
  });

  it('ボイジャーと地球の太陽中心の位置が 50km 以内', () => {
    for (const s of samples) {
      const et = etFromIso(s.utc);
      expect(err(eph.position('voyager1', 'sun', et), s.voyagerSun)).toBeLessThan(50);
      expect(err(eph.position('earth', 'sun', et), s.earthSun)).toBeLessThan(50);
    }
  });

  it('通過の区間の相対位置が 5km 以内', () => {
    for (const s of samples) {
      const et = etFromIso(s.utc);
      if (s.group === 'earth') expect(err(eph.position('voyager1', 'earth', et), s.voyagerEarth)).toBeLessThan(5);
      if (s.voyagerJupiter) expect(err(eph.position('voyager1', 'jupiter', et), s.voyagerJupiter)).toBeLessThan(5);
      if (s.voyagerSaturn) expect(err(eph.position('voyager1', 'saturn', et), s.voyagerSaturn)).toBeLessThan(5);
    }
  });

  it('通過の区間の外でも、地球中心の位置が 100km 以内(太陽中心どうしの差)', () => {
    for (const s of samples.filter((x) => x.group === 'global')) {
      expect(err(eph.position('voyager1', 'earth', etFromIso(s.utc)), s.voyagerEarth)).toBeLessThan(100);
    }
  });
});

describe('名場面の数字', () => {
  it('木星の最接近は 1979-03-05 12:04 UTC の前後 2 分、約 348,400km', () => {
    const { t, d } = closest('jupiter', etFromIso('1979-03-05T11:00:00Z'), etFromIso('1979-03-05T13:00:00Z'));
    expect(Math.abs(utcMsFromEt(t) - Date.UTC(1979, 2, 5, 12, 4))).toBeLessThan(120_000);
    expect(Math.abs(d - 348_400)).toBeLessThan(200);
  });

  it('土星の最接近は 1980-11-12 23:45 UTC の前後 2 分、約 184,000km', () => {
    const { t, d } = closest('saturn', etFromIso('1980-11-12T22:45:00Z'), etFromIso('1980-11-13T00:45:00Z'));
    expect(Math.abs(utcMsFromEt(t) - Date.UTC(1980, 10, 12, 23, 45))).toBeLessThan(120_000);
    expect(Math.abs(d - 184_000)).toBeLessThan(200);
  });

  it('1990-02-14T04:48:00Z の地球からの距離は 60.5〜60.6 億km', () => {
    const d = eph.distance('earth', 'voyager1', etFromIso('1990-02-14T04:48:00Z'));
    expect(d).toBeGreaterThan(6.05e9);
    expect(d).toBeLessThan(6.06e9);
  });

  it('地球から 1 光日になるのは 2026-11-18T10:16:07 UTC の前後 10 秒', () => {
    let lo = etFromIso('2026-01-01T00:00:00Z');
    let hi = etFromIso('2027-01-01T00:00:00Z');
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (eph.distance('earth', 'voyager1', mid) / C_KM_S < 86400) lo = mid;
      else hi = mid;
    }
    const diff = utcMsFromEt((lo + hi) / 2) - Date.UTC(2026, 10, 18, 10, 16, 7);
    expect(Math.abs(diff)).toBeLessThan(10_000);
  });
});

describe('読み出しの振る舞い', () => {
  it('範囲の外の et で例外が出ず、端の値が返る', () => {
    for (const body of BODY_IDS) {
      const c = eph.coverage(body);
      expect(c.t0).toBeLessThan(c.t1);
    }
    const c = eph.coverage('voyager1');
    expect(eph.t0).toBe(c.t0);
    expect(eph.t1).toBe(c.t1);
    expect(eph.position('voyager1', 'sun', c.t0 - 1e9)).toEqual(eph.position('voyager1', 'sun', c.t0));
    expect(eph.position('voyager1', 'sun', c.t1 + 1e9)).toEqual(eph.position('voyager1', 'sun', c.t1));
    expect(eph.velocity('earth', 'sun', c.t1 + 1e9)).toEqual(eph.velocity('earth', 'sun', c.t1));
    expect(() => eph.position('moon', 'earth', etFromIso('2026-01-01T00:00:00Z'))).not.toThrow();
    expect(() => eph.distance('moon', 'voyager1', c.t1 + 5e8)).not.toThrow();
  });

  it('out を渡した時に同じ配列が返る', () => {
    const out: [number, number, number] = [0, 0, 0];
    const et = etFromIso('2000-01-01T00:00:00Z');
    expect(eph.position('earth', 'sun', et, out)).toBe(out);
    expect(Math.hypot(...out)).toBeGreaterThan(1.4e8);
    expect(eph.velocity('earth', 'sun', et, out)).toBe(out);
    expect(Math.hypot(...out)).toBeGreaterThan(29);
    expect(Math.hypot(...out)).toBeLessThan(31);
  });

  it('速度が位置の変化と合う', () => {
    const et = etFromIso('2010-05-05T00:00:00Z');
    const v = eph.velocity('voyager1', 'sun', et);
    const a = eph.position('voyager1', 'sun', et - 50);
    const b = eph.position('voyager1', 'sun', et + 50);
    expect(Math.hypot((b[0] - a[0]) / 100 - v[0], (b[1] - a[1]) / 100 - v[1], (b[2] - a[2]) / 100 - v[2])).toBeLessThan(1e-4);
  });

  it('逆向き・自分自身・月の位置が筋が通る', () => {
    const et = etFromIso('1977-09-20T00:00:00Z');
    const a = eph.position('earth', 'voyager1', etFromIso('1977-09-06T00:00:00Z'));
    const b = eph.position('voyager1', 'earth', etFromIso('1977-09-06T00:00:00Z'));
    expect(err(a, [-b[0], -b[1], -b[2]])).toBeLessThan(1e-3);
    expect(eph.position('earth', 'earth', et)).toEqual([0, 0, 0]);
    const moon = eph.distance('moon', 'earth', et);
    expect(moon).toBeGreaterThan(356_000);
    expect(moon).toBeLessThan(407_000);
    // 太陽中心どうしの差でも同じになる
    const m = eph.position('moon', 'sun', et);
    const e = eph.position('earth', 'sun', et);
    expect(Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2])).toBeCloseTo(moon, 3);
  });

  it('惑星の位置が現実的(太陽からの距離)', () => {
    const et = etFromIso('2026-11-20T00:00:00Z');
    const au = (b: Parameters<typeof eph.distance>[0]) => eph.distance('sun', b, et) / 149_597_870.7;
    expect(au('earth')).toBeGreaterThan(0.98);
    expect(au('earth')).toBeLessThan(1.02);
    expect(au('jupiter')).toBeGreaterThan(4.9);
    expect(au('jupiter')).toBeLessThan(5.5);
    expect(au('neptune')).toBeGreaterThan(29.5);
    expect(au('neptune')).toBeLessThan(30.5);
  });
});

describe('track', () => {
  const tr = eph.track('voyager1');

  it('voyager1 は t が昇順で、点が 2 万点以内', () => {
    expect(tr.length % 4).toBe(0);
    expect(tr.length / 4).toBeLessThan(20_000);
    for (let i = 4; i < tr.length; i += 4) expect(tr[i]).toBeGreaterThan(tr[i - 4]);
    expect(tr[0]).toBe(eph.t0);
    expect(tr[tr.length - 4]).toBe(eph.t1);
  });

  it('木星・土星の最接近の前後 1 日に 100 点以上ある', () => {
    for (const iso of ['1979-03-05T12:04:00Z', '1980-11-12T23:45:00Z']) {
      const c = etFromIso(iso);
      let n = 0;
      for (let i = 0; i < tr.length; i += 4) if (Math.abs(tr[i] - c) <= 86400) n++;
      expect(n).toBeGreaterThanOrEqual(100);
    }
  });

  it('点が実際の位置と一致し、惑星の track も昇順', () => {
    for (let i = 0; i < tr.length; i += 4 * 97) {
      expect(err([tr[i + 1], tr[i + 2], tr[i + 3]], eph.position('voyager1', 'sun', tr[i]))).toBeLessThan(1e-3);
    }
    const e = eph.track('earth');
    expect(e.length / 4).toBeGreaterThan(1000);
    for (let i = 4; i < e.length; i += 4) expect(e[i]).toBeGreaterThan(e[i - 4]);
  });
});

describe('manifest', () => {
  it('区間の範囲が正しく、public/data/eph の合計が 900KB 以内', () => {
    for (const entry of Object.values(manifest.bodies)) for (const s of entry!.segments) expect(s.t0).toBeLessThan(s.t1);
    expect(etFromUtcMs(Date.UTC(2026, 10, 20))).toBeLessThan(eph.t1);
    const dir = join(__dirname, '..', '..', 'public', 'data', 'eph');
    const total = readdirSync(dir).reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
    expect(total).toBeLessThan(900 * 1024);
  });
});

/** 範囲の中で voyager1 と planet の距離が最小になる時刻と距離(黄金分割) */
function closest(planet: 'jupiter' | 'saturn', a: number, b: number) {
  const f = (t: number) => eph.distance(planet, 'voyager1', t);
  const g = (Math.sqrt(5) - 1) / 2;
  let x1 = b - g * (b - a);
  let x2 = a + g * (b - a);
  for (let i = 0; i < 80; i++) {
    if (f(x1) < f(x2)) b = x2;
    else a = x1;
    x1 = b - g * (b - a);
    x2 = a + g * (b - a);
  }
  const t = (a + b) / 2;
  return { t, d: f(t) };
}
