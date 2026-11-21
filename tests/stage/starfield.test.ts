import { describe, expect, it } from 'vitest';
import { STAR_STRIDE, type StarCatalog } from '../../src/lib/stars';
import { createStarfield } from '../../src/stage/starfield';

function catalog(mags: number[]): StarCatalog {
  const data = new Float32Array(mags.length * STAR_STRIDE);
  mags.forEach((m, i) => {
    data[i * STAR_STRIDE] = 1;
    data[i * STAR_STRIDE + 3] = m;
  });
  return { count: mags.length, data };
}

describe('星の層', () => {
  it('暗い星の層は足すまで無く、足した直後は見えず、0.6 秒かけて現れる', () => {
    const sf = createStarfield(catalog([1, 2]));
    expect(sf.object.children.length).toBe(1);
    sf.setDeepVisible(true);
    // 層が無い間は進めない(来た時に 0 から現れる)
    expect(sf.update(0.1)).toBe(false);
    sf.addDeep(catalog([7, 7.5]));
    expect(sf.object.children.length).toBe(2);
    const deep = sf.object.children[1];
    expect(deep.visible).toBe(false);
    expect(sf.update(0.3)).toBe(true);
    expect(deep.visible).toBe(true);
    expect(sf.update(0.4)).toBe(false);
  });
  it('足すのは 1 回だけ', () => {
    const sf = createStarfield(catalog([1]));
    sf.addDeep(catalog([7]));
    sf.addDeep(catalog([7, 7.5]));
    expect(sf.object.children.length).toBe(2);
  });
  it('隠すとすっと消え、描き直しの要不要が分かる', () => {
    const sf = createStarfield(catalog([1]));
    sf.addDeep(catalog([7]));
    sf.setDeepVisible(true);
    sf.update(1);
    expect(sf.update(0.1)).toBe(false);
    sf.setDeepVisible(false);
    expect(sf.update(0.3)).toBe(true);
    expect(sf.update(0.4)).toBe(false);
    expect(sf.object.children[1].visible).toBe(false);
  });
});
