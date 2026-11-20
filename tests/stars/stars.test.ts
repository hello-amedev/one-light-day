import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appendStars, bvToRgb, createStarCatalog, STAR_STRIDE, type StarCatalog } from '../../src/lib/stars';

const load = (name: string): StarCatalog => {
  const b = readFileSync(new URL(`../../public/data/stars/${name}`, import.meta.url));
  return createStarCatalog(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
interface Named { name: string; hr: number | null; raDeg: number; decDeg: number; mag: number; index: number }
const named: Named[] = JSON.parse(readFileSync(new URL('./fixtures/named.json', import.meta.url), 'utf8'));
const byName = (n: string) => named.find((s) => s.name === n)!;

const base = load('stars.bin');
const deep = load('stars-deep.bin');
const D2R = Math.PI / 180;
const vec = (cat: StarCatalog, i: number): [number, number, number] => [cat.data[i * 5], cat.data[i * 5 + 1], cat.data[i * 5 + 2]];
const mag = (cat: StarCatalog, i: number) => cat.data[i * STAR_STRIDE + 3];

// 黄道 → 赤道(ε は道具と同じ値。逆回転)
const EPS = 23.4392911 * D2R;
function toEquatorial([x, y, z]: number[]): { ra: number; dec: number } {
  const ye = Math.cos(EPS) * y - Math.sin(EPS) * z;
  const ze = Math.sin(EPS) * y + Math.cos(EPS) * z;
  return { ra: ((Math.atan2(ye, x) / D2R) + 360) % 360, dec: Math.asin(ze) / D2R };
}
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const equ = (n: string) => { const s = byName(n); const a = s.raDeg * D2R, d = s.decDeg * D2R; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; };
const ecl = (n: string) => vec(base, byName(n).index);

describe('星の数と並び', () => {
  it('stars.bin は 8,500〜9,300 個で、先頭がシリウス', () => {
    expect(base.count).toBeGreaterThanOrEqual(8500);
    expect(base.count).toBeLessThanOrEqual(9300);
    expect(mag(base, 0)).toBeCloseTo(-1.44, 1);
    expect(byName('Sirius').index).toBe(0);
  });
  it('stars-deep.bin は 25,000〜40,000 個で、全て 6.5 等より暗い', () => {
    expect(deep.count).toBeGreaterThanOrEqual(25000);
    expect(deep.count).toBeLessThanOrEqual(40000);
    expect(mag(deep, 0)).toBeGreaterThan(6.5);
    expect(mag(deep, deep.count - 1)).toBeLessThanOrEqual(8.0);
  });
  it('太陽(-26.7等)が含まれない', () => {
    expect(mag(base, 0)).toBeGreaterThan(-5);
  });
  it('等級が昇順(appendStars の後も)', () => {
    const all = appendStars(base, deep);
    expect(all.count).toBe(base.count + deep.count);
    for (let i = 1; i < all.count; i++) expect(mag(all, i)).toBeGreaterThanOrEqual(mag(all, i - 1));
  });
  it('appendStars は元を変えない', () => {
    const copy = base.data.slice(0, 10);
    appendStars(base, deep);
    expect([...base.data.slice(0, 10)]).toEqual([...copy]);
  });
  it('全ての (x, y, z) の長さが 1 ± 1e-5、値は有限', () => {
    for (const cat of [base, deep]) {
      for (let i = 0; i < cat.count; i++) {
        const [x, y, z] = vec(cat, i);
        expect(Math.abs(Math.hypot(x, y, z) - 1)).toBeLessThan(1e-5);
        expect(Number.isFinite(mag(cat, i)) && Number.isFinite(cat.data[i * 5 + 4])).toBe(true);
      }
    }
  });
  it('不正な大きさの buffer は拒否する', () => {
    expect(() => createStarCatalog(new ArrayBuffer(7))).toThrow();
  });
});

describe('位置の向き', () => {
  it('名前の付いた星を赤道座標に戻すと、元の赤経・赤緯と 0.02 度以内で一致する', () => {
    expect(named.length).toBeGreaterThanOrEqual(20);
    for (const s of named) {
      const { ra, dec } = toEquatorial(vec(base, s.index));
      expect(angDiff(ra, s.raDeg), s.name + ' ra').toBeLessThan(0.02);
      expect(Math.abs(dec - s.decDeg), s.name + ' dec').toBeLessThan(0.02);
    }
  });
  it('裏返しでない: ベテルギウス・ベラトリックス・リゲルの三重積の符号が赤道座標と同じ', () => {
    const e = ['Betelgeuse', 'Bellatrix', 'Rigel'].map(equ);
    const c = ['Betelgeuse', 'Bellatrix', 'Rigel'].map(ecl);
    const te = dot(cross(e[0], e[1]), e[2]);
    const tc = dot(cross(c[0], c[1]), c[2]);
    expect(Math.abs(te)).toBeGreaterThan(1e-3); // 符号が読み取れる大きさ
    expect(Math.sign(tc)).toBe(Math.sign(te));
  });
  it('軸の取り違えがない: 黄緯・黄経が既知の値と合う', () => {
    const lat = (n: string) => Math.asin(ecl(n)[2]) / D2R;
    const lon = (n: string) => { const [x, y] = ecl(n); return ((Math.atan2(y, x) / D2R) + 360) % 360; };
    expect(Math.abs(lat('Regulus') - 0.46)).toBeLessThan(0.2);
    expect(Math.abs(lat('Spica') + 2.05)).toBeLessThan(0.2);
    expect(Math.abs(lat('Polaris') - 66.1)).toBeLessThan(0.2);
    expect(angDiff(lon('Regulus'), 149.8)).toBeLessThan(0.3);
    expect(angDiff(lon('Spica'), 203.8)).toBeLessThan(0.3);
  });
});

describe('bvToRgb', () => {
  it('青白は青が最も強く、橙は赤が最も強い', () => {
    const [r1, g1, b1] = bvToRgb(-0.3);
    expect(b1).toBeGreaterThan(g1);
    expect(g1).toBeGreaterThan(r1);
    const [r2, g2, b2] = bvToRgb(1.8);
    expect(r2).toBeGreaterThan(g2);
    expect(g2).toBeGreaterThan(b2);
  });
  it('太陽に近い 0.65 付近はほぼ白', () => {
    const c = bvToRgb(0.65);
    expect(Math.min(...c)).toBeGreaterThan(0.9);
  });
  it('全域・範囲外・NaN で各成分が 0〜1、範囲外は端に丸める', () => {
    for (let bv = -2; bv <= 4; bv += 0.05) for (const v of bvToRgb(bv)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    expect(bvToRgb(-5)).toEqual(bvToRgb(-0.3));
    expect(bvToRgb(9)).toEqual(bvToRgb(1.8));
    for (const v of bvToRgb(NaN)) expect(v).toBeLessThanOrEqual(1);
  });
});
