// 素の状態(AppStore)を、Svelte の部品から反応する値として読むための橋渡し。
import { onDestroy } from 'svelte';
import type { AppState, AppStore } from '../lib/store';

/** 部品の初期化の中で呼ぶ。`.state` を読むと、状態が変わるたびに部品が組み直される */
export function watchStore(store: AppStore): { readonly state: Readonly<AppState> } {
  let state = $state.raw<Readonly<AppState>>(store.get());
  const off = store.subscribe((next) => {
    state = next;
  });
  onDestroy(off);
  return {
    get state() {
      return state;
    },
  };
}
