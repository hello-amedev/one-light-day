// 色は CSS のトークン(src/app.css)から起動時に 1 回だけ読む。第 2 段階でトークンを差し替えると 3D にも効く。
export interface Theme {
  space: string;
  gold: string;
  earth: string;
  text: string;
  textDim: string;
}

/** 読めなかった時(テストなど)の値。app.css の第 1 段階の値と同じ */
const FALLBACK: Theme = {
  space: '#070a11',
  gold: '#d8a84a',
  earth: '#a9cdf0',
  text: '#ebe5d3',
  textDim: '#979daa',
};

export function readTheme(): Theme {
  if (typeof document === 'undefined') return FALLBACK;
  const css = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string): string => css.getPropertyValue(name).trim() || fallback;
  return {
    space: get('--color-space', FALLBACK.space),
    gold: get('--color-gold', FALLBACK.gold),
    earth: get('--color-earth', FALLBACK.earth),
    text: get('--color-text', FALLBACK.text),
    textDim: get('--color-text-dim', FALLBACK.textDim),
  };
}
