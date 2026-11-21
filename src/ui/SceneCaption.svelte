<script lang="ts">
  // 名場面へ移った時に、名前と 1 行の文を画面の中央より少し下へ 6 秒ほど出す。
  // 再生で通り過ぎただけの時は出さない。出ている間に操作したら、すぐ消す。操作の部品の層の外に置く(薄くならない)。
  import { onDestroy } from 'svelte';
  import { t } from '../lib/i18n';
  import type { SceneId } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import { sceneJumpedTo } from './sceneCaption';

  let { store }: { store: AppStore } = $props();
  const names = t().scenes;
  const lines = t().caption;

  const SHOW_MS = 6000;

  let id = $state<SceneId | null>(null);
  let shown = $state(false);
  /** 操作で消す時は速く、時間が来て消す時はゆっくり */
  let quick = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let shownEt = 0;
  let shownSeq = 0;

  function hide(fast: boolean) {
    if (!shown) return;
    quick = fast;
    shown = false;
    clearTimeout(timer);
  }

  let prev = { et: store.get().et, lookSeq: store.get().lookSeq };
  const off = store.subscribe((s) => {
    const jumped = sceneJumpedTo(prev, s);
    prev = { et: s.et, lookSeq: s.lookSeq };
    if (jumped) {
      id = jumped;
      shownEt = s.et;
      shownSeq = s.lookSeq;
      quick = false;
      shown = true;
      clearTimeout(timer);
      timer = setTimeout(() => hide(false), SHOW_MS);
    } else if (shown && (s.et !== shownEt || s.lookSeq !== shownSeq || s.playing)) {
      // 時刻が動いた・別の相手を向いた・再生を始めた = 操作した
      hide(true);
    }
  });
  onDestroy(() => {
    off();
    clearTimeout(timer);
  });
</script>

<!-- 画面のどこを押しても・どのキーを押しても、すぐ消す。名場面へ移した操作そのもの(押した瞬間)より後の操作だけを見る -->
<svelte:window onpointerdown={() => hide(true)} onkeydown={() => hide(true)} onwheel={() => hide(true)} />

<div class="caption" class:shown class:quick role="status" aria-live="polite">
  {#if id}
    <div class="name">{names[id]}</div>
    <div class="line">{lines[id]}</div>
  {/if}
</div>

<style>
  .caption {
    position: fixed;
    left: 0;
    right: 0;
    top: 62%;
    padding: 0 calc(var(--safe-right) + var(--space-3)) 0 calc(var(--safe-left) + var(--space-3));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    text-align: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--dur-xl) var(--ease-in-out);
    text-shadow: var(--text-halo);
  }
  .caption.shown {
    opacity: 1;
    transition-duration: var(--dur-l);
  }
  .caption.quick {
    transition-duration: var(--dur-s);
  }
  .name {
    font-family: var(--font-title);
    font-size: var(--text-s);
    letter-spacing: 0.28em;
    color: var(--color-text);
  }
  .line {
    font-family: var(--font-body);
    font-size: var(--text-s);
    letter-spacing: var(--body-tracking);
    color: var(--color-text-dim);
  }
  @media (prefers-reduced-motion: reduce) {
    .caption {
      transition: none;
    }
  }
</style>
