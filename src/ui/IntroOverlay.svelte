<script lang="ts">
  // 開いた直後の題字と、自動再生が今日で止まった時の案内の 1 行。操作の部品の層(薄くなる .ui)の外に置く。
  // 画面を押す・キーを押す・ホイールを回すと、その場で自動再生を止めて操作を渡す。
  import { onDestroy } from 'svelte';
  import { INTRO_GUIDE_SECONDS } from '../lib/intro';
  import { t } from '../lib/i18n';
  import type { AppStore } from '../lib/store';
  import { watchStore } from './store.svelte';

  let { store }: { store: AppStore } = $props();
  const txt = t().intro;
  const view = watchStore(store);

  const showTitle = $derived(view.state.intro === 'title');
  const showGuide = $derived(view.state.intro === 'done');
  /** 操作で消す時は速く、時間が来て消す時はゆっくり */
  let quick = $state(false);

  // 案内は時間が来たら閉じる(store を 'off' に戻す。操作の部品の層もこれで薄くなる準備が整う)
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!showGuide) return;
    timer = setTimeout(() => store.stopIntro(), INTRO_GUIDE_SECONDS * 1000);
    return () => clearTimeout(timer);
  });
  onDestroy(() => clearTimeout(timer));

  function touch() {
    if (view.state.intro === 'off') return;
    quick = true;
    store.stopIntro();
  }
</script>

<svelte:window onpointerdown={touch} onkeydown={touch} onwheel={touch} />

<div class="title" class:shown={showTitle} class:quick aria-hidden="true">
  <div class="name">{txt.title}</div>
  <div class="sub">{txt.subtitle}</div>
</div>

<div class="guide" class:shown={showGuide} class:quick role="status" aria-live="polite">
  {#if showGuide}{txt.guide}{/if}
</div>

<style>
  .title,
  .guide {
    position: fixed;
    left: 0;
    right: 0;
    padding: 0 calc(var(--safe-right) + var(--space-3)) 0 calc(var(--safe-left) + var(--space-3));
    text-align: center;
    pointer-events: none;
    opacity: 0;
    text-shadow: var(--text-halo);
  }
  .title {
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    transition: opacity var(--dur-intro-out) var(--ease-in-out);
  }
  .title.shown {
    opacity: 1;
    transition-duration: var(--dur-intro-in);
  }
  .name {
    font-family: var(--font-title);
    font-size: var(--intro-title-size);
    letter-spacing: var(--intro-title-tracking);
    /* 字間の余りが右にだけ付くので、同じだけ左を空けて中央に見せる */
    padding-left: var(--intro-title-tracking);
    color: var(--color-text);
  }
  .sub {
    font-family: var(--font-body);
    font-size: var(--text-s);
    letter-spacing: var(--body-tracking);
    color: var(--color-text-dim);
  }
  .guide {
    top: 62%;
    font-family: var(--font-body);
    font-size: var(--text-s);
    letter-spacing: var(--body-tracking);
    color: var(--color-text-dim);
    transition: opacity var(--dur-l) var(--ease-in-out);
  }
  .guide.shown {
    opacity: 1;
    transition-duration: var(--dur-xl);
  }
  .quick {
    transition-duration: var(--dur-s);
  }
  @media (prefers-reduced-motion: reduce) {
    .title,
    .guide {
      transition: none;
    }
  }
</style>
