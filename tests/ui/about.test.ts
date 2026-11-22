import { describe, expect, it } from 'vitest';
import { t } from '../../src/lib/i18n';
import { focusTrapTarget } from '../../src/ui/aboutFocus';

const about = t().about;
const allText = JSON.stringify(about);

describe('「このサイトについて」の文言', () => {
  it('5 つの節が、決めた順にある', () => {
    expect(about.sections).toHaveLength(5);
    expect(about.sections.map((s) => s.heading)).toEqual([
      expect.stringContaining('非公式'),
      '操作のしかた',
      expect.stringContaining('再現'),
      expect.stringContaining('出典'),
      '問い合わせ先',
    ]);
  });
  it('どの節にも中身があり、空の文字列は無い', () => {
    for (const s of about.sections) {
      expect(s.heading.trim()).not.toBe('');
      expect(s.blocks.length).toBeGreaterThan(0);
    }
    expect(allText).not.toMatch(/""/);
  });
  it('出典に必要な名前とライセンス名が、原文のまま入っている', () => {
    for (const word of [
      'NASA JPL Horizons',
      'HYG Database v4.4',
      'CC BY-SA 4.0',
      'NASA/Goddard Space Flight Center Scientific Visualization Studio',
      'Gaia DR2: ESA/Gaia/DPAC',
      'NASA/JPL-Caltech',
      'Michroma',
      'Share Tech Mono',
      'Zen Kaku Gothic New',
      'SIL Open Font License 1.1',
      'three.js',
      'MIT License',
    ]) {
      expect(allText).toContain(word);
    }
  });
  it('出典のリンクは https だけ', () => {
    for (const s of about.sections)
      for (const b of s.blocks)
        if (b.kind === 'credits') for (const c of b.items) if (c.href) expect(c.href).toMatch(/^https:\/\//);
  });
  it('問い合わせ先は、作者名と作者のサイトへのリンクで置き、メールアドレスは出さない', () => {
    expect(allText).toContain('ame_dev');
    expect(allText).not.toContain('@');
    expect(allText).not.toContain('mailto:');
    const links = about.sections.flatMap((s) =>
      s.blocks.flatMap((b) => (b.kind === 'terms' ? b.items.flatMap((i) => (i.href ? [i.href] : [])) : [])),
    );
    expect(links).toContain('https://ame-dev.com/');
  });
  it('専門の言葉をそのまま出さない', () => {
    for (const word of ['黄道', '光学的厚み', 'IAU']) expect(allText).not.toContain(word);
  });
});

describe('focusTrapTarget', () => {
  it('板の中の移動はブラウザに任せる', () => {
    expect(focusTrapTarget(3, 1, false)).toBeNull();
    expect(focusTrapTarget(3, 1, true)).toBeNull();
  });
  it('端から出る時は反対の端へ戻す', () => {
    expect(focusTrapTarget(3, 2, false)).toBe(0);
    expect(focusTrapTarget(3, 0, true)).toBe(2);
  });
  it('板の外にいる時は板の中へ入れる', () => {
    expect(focusTrapTarget(3, -1, false)).toBe(0);
    expect(focusTrapTarget(3, -1, true)).toBe(2);
  });
  it('何も無ければ何もしない', () => {
    expect(focusTrapTarget(0, -1, false)).toBeNull();
  });
});
