// 画面全体の状態(差し込み口)。担当C が中身を入れる。
import type { AppStore, StoreOptions } from './types';

export * from './types';

export function createStore(_options: StoreOptions): AppStore {
  throw new Error('createStore: not implemented yet');
}
