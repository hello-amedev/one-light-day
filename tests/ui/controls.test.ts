import { describe, expect, it } from 'vitest';
import {
  GAS_GIANT_MOONS,
  chooseLookTargets,
  nextMenuIndex,
  nextRate,
  readoutExtra,
  starsOnlyHintKind,
  stepSeconds,
  stepUnit,
  type LookSource,
} from '../../src/ui/controls';
import { MAG_MAX } from '../../src/lib/zoom';
import { t } from '../../src/lib/i18n';

describe('速さのボタン', () => {
  it('押すたびに 1時間 → 1日 → 1か月 → 1年 → 1時間 と進む', () => {
    expect(nextRate('hour')).toBe('day');
    expect(nextRate('day')).toBe('month');
    expect(nextRate('month')).toBe('year');
    expect(nextRate('year')).toBe('hour');
  });
  it('送る量は、速さが 1時間の時は 1時間、それ以外は 1日', () => {
    expect(stepUnit('hour')).toBe('hour');
    expect(stepSeconds('hour')).toBe(3600);
    for (const r of ['day', 'month', 'year'] as const) {
      expect(stepUnit(r)).toBe('day');
      expect(stepSeconds(r)).toBe(86400);
    }
  });
});

describe('右下の距離の上の表示', () => {
  it('ボイジャーの視界は倍率を常に出す', () => {
    expect(readoutExtra('voyager', 1, 20)).toEqual({ kind: 'magnification', value: 1, atLimit: false });
    expect(readoutExtra('voyager', 12.3, 20)).toEqual({ kind: 'magnification', value: 12, atLimit: false });
    expect(readoutExtra('voyager', 3.14, 20)).toEqual({ kind: 'magnification', value: 3.1, atLimit: false });
  });
  it('上限では、狭角カメラの視野と添える', () => {
    const e = readoutExtra('voyager', MAG_MAX, 20);
    expect(e).toMatchObject({ kind: 'magnification', atLimit: true });
  });
  it('本体の視点は、機体からの距離を整数の m で出す', () => {
    expect(readoutExtra('craft', 5, 20.4)).toEqual({ kind: 'craft', meters: 20 });
    expect(readoutExtra('craft', 5, 6.6)).toEqual({ kind: 'craft', meters: 7 });
  });
  it('引きの眺めでは出さない', () => {
    expect(readoutExtra('overview', 50, 20)).toBeNull();
  });
});

describe('星空だけを表示の案内', () => {
  it('指で操作する端末はタップ、それ以外はクリック', () => {
    expect(starsOnlyHintKind(true)).toBe('tap');
    expect(starsOnlyHintKind(false)).toBe('click');
  });
  it('辞書の 2 つの案内が、それぞれの言い方になっている', () => {
    const m = t().menu;
    expect(m.starsOnlyHintTap).toContain('タップ');
    expect(m.starsOnlyHintClick).toContain('クリック');
  });
});

describe('倍率・距離の文言', () => {
  it('値の入る文が値を含み、読み上げは「◯倍に拡大」', () => {
    const h = t().hud;
    expect(h.magnification('12')).toBe('×12');
    expect(h.magnificationAria('12')).toBe('12倍に拡大');
    expect(h.craftDistance('20')).toBe('機体から20m');
  });
});

describe('向く相手の候補', () => {
  /** km を表で渡す。表に無い組は遠い */
  function source(far: Record<string, number>, covered: string[] = ['moon', ...GAS_GIANT_MOONS]): LookSource {
    return {
      inCoverage: (b) => covered.includes(b),
      distance: (a, b) => far[[a, b].join('>')] ?? 1e12,
    };
  }
  it('遠い時期は、地球・太陽・進む先だけ', () => {
    expect(chooseLookTargets(source({}))).toEqual(['earth', 'sun', 'ahead']);
  });
  it('木星・土星は 3000 万km 以内の時だけ出る', () => {
    expect(chooseLookTargets(source({ 'voyager1>jupiter': 2.9e7 }))).toEqual(['earth', 'sun', 'jupiter', 'ahead']);
    expect(chooseLookTargets(source({ 'voyager1>saturn': 3.1e7 }))).toEqual(['earth', 'sun', 'ahead']);
  });
  it('月は地球に近く、位置データがある時だけ出る', () => {
    const near = { 'voyager1>earth': 1e6 };
    expect(chooseLookTargets(source(near))).toContain('moon');
    expect(chooseLookTargets(source(near, []))).not.toContain('moon');
  });
  it('衛星は近い順。位置データの外・遠いものは出さない', () => {
    const list = chooseLookTargets(
      source(
        { 'voyager1>jupiter': 1e7, 'io>voyager1': 9e5, 'europa>voyager1': 3e5, 'ganymede>voyager1': 5e6 },
        ['io', 'europa', 'ganymede'],
      ),
    );
    expect(list).toEqual(['earth', 'sun', 'jupiter', 'europa', 'io', 'ahead']);
  });
});

describe('一覧のキーボード操作', () => {
  it('矢印で移り、端で折り返す', () => {
    expect(nextMenuIndex(4, 0, 'ArrowDown')).toBe(1);
    expect(nextMenuIndex(4, 3, 'ArrowDown')).toBe(0);
    expect(nextMenuIndex(4, 0, 'ArrowUp')).toBe(3);
  });
  it('どれにも当たっていない時、下は先頭・上は末尾から', () => {
    expect(nextMenuIndex(4, -1, 'ArrowDown')).toBe(0);
    expect(nextMenuIndex(4, -1, 'ArrowUp')).toBe(3);
  });
  it('Home と End、項目が無い時', () => {
    expect(nextMenuIndex(4, 2, 'Home')).toBe(0);
    expect(nextMenuIndex(4, 1, 'End')).toBe(3);
    expect(nextMenuIndex(0, -1, 'ArrowDown')).toBe(-1);
  });
});
