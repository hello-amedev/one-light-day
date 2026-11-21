import { describe, expect, it } from 'vitest';
import { ROLL_MAX_CHANGED, ROLL_MIN_INTERVAL_MS, changedPositions, isRollable, planRoll } from '../../src/ui/rolling';

describe('changedPositions', () => {
  it('違う文字の位置を返す', () => {
    expect(changedPositions('1980.11.12', '1980.11.13')).toEqual([9]);
    expect(changedPositions('1980.11.30', '1980.12.01')).toEqual([6, 8, 9]);
  });
  it('同じ文字列なら空', () => {
    expect(changedPositions('1980.11.12', '1980.11.12')).toEqual([]);
  });
  it('長さが違う時は null', () => {
    expect(changedPositions('99.9億km', '100.0億km')).toBeNull();
  });
});

describe('isRollable', () => {
  it('数字だけ回す', () => {
    expect(isRollable('7')).toBe(true);
    expect(isRollable('.')).toBe(false);
    expect(isRollable('億')).toBe(false);
  });
});

describe('planRoll', () => {
  it('ゆっくり変わる時は、変わった桁を回す', () => {
    expect(planRoll('1980.11.12', '1980.11.13', 1000, false).positions).toEqual([9]);
    expect(planRoll('250.3億km', '250.4億km', 7000, false).positions).toEqual([4]);
  });
  it('速く変わる時は回さない', () => {
    expect(planRoll('1980.11.12', '1980.11.13', ROLL_MIN_INTERVAL_MS - 1, false).positions).toEqual([]);
    expect(planRoll('1980.11.12', '1980.11.13', ROLL_MIN_INTERVAL_MS, false).positions).toEqual([9]);
  });
  it('動きを減らす設定では回さない', () => {
    expect(planRoll('1980.11.12', '1980.11.13', 5000, true).positions).toEqual([]);
  });
  it('大きく飛んだ時(多くの文字が変わる)は回さない', () => {
    const jumped = planRoll('1977.09.05', '1989.12.25', 5000, false);
    expect(changedPositions('1977.09.05', '1989.12.25')!.length).toBeGreaterThan(ROLL_MAX_CHANGED);
    expect(jumped.positions).toEqual([]);
  });
  it('月をまたぐ 1 日送りは回す', () => {
    expect(planRoll('1980.11.30', '1980.12.01', 5000, false).positions).toEqual([6, 8, 9]);
  });
  it('桁数が変わる時は回さない', () => {
    expect(planRoll('99.9億km', '100.0億km', 5000, false).positions).toEqual([]);
  });
  it('数字以外の文字まで変わる時は回さない', () => {
    expect(planRoll('999万km', '1.0億km', 5000, false).positions).toEqual([]);
  });
});
