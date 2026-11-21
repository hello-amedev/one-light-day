import { describe, expect, it } from 'vitest';
import { splitPhrases } from '../../src/lib/phrases';
import { t } from '../../src/lib/i18n';

const B = t().common.phraseBreaks;

describe('splitPhrases', () => {
  it('句点・読点・空白の後で区切り、記号は前の塊に残す', () => {
    expect(splitPhrases('木星に近づいた時。重力で、速さが上がった', B)).toEqual(['木星に近づいた時。', '重力で、', '速さが上がった']);
    expect(splitPhrases('太陽に対する速さ スイングバイ前 13.2km/s、後 23.6km/s', B)).toEqual([
      '太陽に対する速さ ',
      'スイングバイ前 ',
      '13.2km/s、',
      '後 ',
      '23.6km/s',
    ]);
  });
  it('つなぎ直すと元の文に戻る', () => {
    const all = [...Object.values(t().events.lines), ...Object.values(t().caption).filter((v) => typeof v === 'string')];
    for (const s of all) expect(splitPhrases(s, B).join('')).toBe(s);
  });
  it('空の文は空の配列', () => {
    expect(splitPhrases('', B)).toEqual([]);
  });
});
