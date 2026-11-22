<script lang="ts">
  // 開いた直後の題字と、自動再生が今日で止まった時の案内の 1 行。操作の部品の層(薄くなる .ui)の外に置く。
  // 画面を押す・キーを押す・ホイールを回すと、その場で自動再生を止めて操作を渡す。
  import { onDestroy, untrack } from 'svelte';
  import { INTRO_GUIDE_SECONDS } from '../lib/intro';
  import { HOLD_MS } from './captionQueue';
  import PhraseText from './PhraseText.svelte';

  /** 1光日の文が出し終わって薄れ終わるまでの時間(文を出す時間 + 消える動き --dur-xl の 900ms と少しの間) */
  const GUIDE_AFTER_CAPTION_MS = HOLD_MS + 1000;
  import { t } from '../lib/i18n';
  import type { AppStore } from '../lib/store';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    /** 案内の 1 行を出す時に先に呼ぶ。使い方の案内を代わりに開いたら true(その時は 1 行を出さない) */
    ontutorial?: () => boolean;
  }
  let { store, ontutorial }: Props = $props();
  const txt = t().intro;
  const view = watchStore(store);

  const showTitle = $derived(view.state.intro === 'title');
  /** 案内を出しているか。自動再生が今日で止まった後、1光日の文が消えてから出す */
  let showGuide = $state(false);
  /** 操作で消す時は速く、時間が来て消す時はゆっくり */
  let quick = $state(false);

  // 自動再生で今日に着いた時は、同じ場所に「地球から1光日」の文が出ている(SceneCaption)。
  // 文が出し終わって消えるまで待ってから案内を出し、案内も時間が来たら閉じる(store を 'off' に戻す)
  let lastIntro = untrack(() => view.state.intro);
  let timers: ReturnType<typeof setTimeout>[] = [];
  const clearTimers = () => {
    for (const id of timers) clearTimeout(id);
    timers = [];
  };
  $effect(() => {
    const intro = view.state.intro;
    const prev = lastIntro;
    lastIntro = intro;
    if (intro !== 'done') {
      showGuide = false;
      return;
    }
    const s = untrack(() => view.state);
    const wait = prev === 'run' && s.display.captions && !s.starsOnly ? GUIDE_AFTER_CAPTION_MS : 0;
    timers.push(
      setTimeout(() => {
        if (!ontutorial?.()) showGuide = true;
      }, wait),
    );
    timers.push(setTimeout(() => store.stopIntro(), wait + INTRO_GUIDE_SECONDS * 1000));
    return clearTimers;
  });
  onDestroy(clearTimers);

  function touch() {
    if (view.state.intro === 'off') return;
    quick = true;
    store.stopIntro();
  }
</script>

<svelte:window onpointerdown={touch} onkeydown={touch} onwheel={touch} />

<div class="title" class:shown={showTitle} class:quick aria-hidden="true">
  <div class="name">{txt.title}</div>
  <div class="days">{txt.days}</div>
  <div class="sub">{txt.subtitle}</div>
</div>

<div class="guide" class:shown={showGuide} class:quick role="status" aria-live="polite">
  {#if showGuide}<PhraseText text={txt.guide} />{/if}
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
    /* 画面の中央には太陽の光がある(打ち上げの日の引きの眺め)。題字はその上に置き、光と重ねない */
    top: 32%;
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
  /* 題字の 2 行目(日数)。数字の字体と金で、1 行目の「1」との対比を見せる */
  .days {
    font-family: var(--font-numeric);
    /* スマホの幅でも読める大きさを下限にする */
    font-size: max(var(--text-s), calc(var(--intro-title-size) * 0.56));
    letter-spacing: calc(var(--intro-title-tracking) * 0.6);
    padding-left: calc(var(--intro-title-tracking) * 0.6);
    color: var(--color-gold);
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
