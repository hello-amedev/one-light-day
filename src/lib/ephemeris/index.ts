// 位置データの読み込み(差し込み口)。担当A が中身を入れる。
import type { Ephemeris } from './types';

export * from './types';
export * from './time';

/** baseUrl(末尾は /)の下の manifest.json とデータを読み込む */
export async function loadEphemeris(_baseUrl: string): Promise<Ephemeris> {
  throw new Error('loadEphemeris: not implemented yet');
}
