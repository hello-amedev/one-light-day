<script lang="ts">
  // 名場面・出来事の文を、画面の中央より少し下へ出す。
  // - 名場面・出来事へ移った時(state.arrival)は、その文をすぐ出す
  // - 再生で名場面・出来事の時刻を通り過ぎた時は、順に出す(1 つを最低 4 秒。たまったら古いものを飛ばす)
  // - 再生で時刻が進んでも消さない。時間軸をつまむ・別の所へ移る・向きを変える・星空を操作すると消す
  // 操作の部品の層の外に置く(薄くならない)。
  import { onDestroy } from 'svelte';
  import type { Ephemeris } from '../lib/ephemeris';
  import { formatSpeed } from '../lib/format';
  import { t } from '../lib/i18n';
  import type { SceneId } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import { swingbySpeeds } from '../lib/swingby';
  import {
    actionFor,
    advance,
    captionsAllowed,
    captionsCrossed,
    EMPTY_CAPTION,
    enqueue,
    nextDeadline,
    showNow,
    type CaptionRef,
    type CaptionState,
  } from './captionQueue';

  /** eph があれば、木星と土星の場面に太陽に対する速さの前後を添える */
  let { store, eph }: { store: AppStore; eph?: Ephemeris } = $props();

  let cs: CaptionState = EMPTY_CAPTION;
  /** 出ている(または消えていく途中の)文。消えていく間も中身を残す */
  let current = $state<CaptionRef | null>(null);
  let shown = $state(false);
  /** 操作で消す時は速く、時間が来て消す時はゆっくり */
  let quick = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    clearTimeout(timer);
    const at = nextDeadline(cs);
    if (at === null) return;
    timer = setTimeout(() => apply(advance(cs, Date.now())), Math.max(0, at - Date.now()));
  }

  function apply(next: CaptionState, fast = false) {
    cs = next;
    if (next.current) {
      current = next.current;
      quick = false;
      shown = true;
    } else if (shown) {
      quick = fast;
      shown = false;
    }
    schedule();
  }

  const hide = (fast: boolean) => {
    if (cs.current) apply(EMPTY_CAPTION, fast);
  };

  function pick(s: Readonly<ReturnType<AppStore['get']>>) {
    return { et: s.et, playing: s.playing, lookSeq: s.lookSeq, arrivalSeq: s.arrivalSeq };
  }

  const first = store.get();
  if (captionsAllowed(first) && first.arrival) {
    // 名場面の URL(?scene=…)で開いた時は、移った後にこの部品ができる
    apply(showNow(first.arrival, Date.now()));
  }

  let prev = pick(first);
  const off = store.subscribe((s) => {
    const p = prev;
    prev = pick(s);
    if (!captionsAllowed(s)) return hide(true);
    const action = actionFor(p, s);
    if (action === 'show' && s.arrival) return apply(showNow(s.arrival, Date.now()));
    if (action === 'hide') return hide(true);
    if (p.playing && s.et > p.et) {
      const crossed = captionsCrossed(p.et, s.et, s.intro === 'off');
      if (crossed.length > 0) apply(enqueue(cs, crossed, Date.now()));
    }
  });
  onDestroy(() => {
    off();
    clearTimeout(timer);
  });

  /** 画面の見回し・拡大(星空への操作)で消す。ボタンや時間軸の操作は、状態の変わりで判断する */
  function onCanvasInput(e: Event) {
    if (e.target instanceof Element && e.target.closest('button, [role="slider"], a, input, select, textarea')) return;
    hide(true);
  }

  const speedCache = new Map<SceneId, { before: string; after: string } | null>();
  function speedOf(id: SceneId) {
    if (!eph) return null;
    if (!speedCache.has(id)) {
      const v = swingbySpeeds(eph, id);
      speedCache.set(id, v && { before: formatSpeed(v.before), after: formatSpeed(v.after) });
    }
    return speedCache.get(id)!;
  }

  const content = $derived.by(() => {
    if (!current) return null;
    if (current.kind === 'event') {
      return { name: t().events.names[current.id], line: t().events.lines[current.id], speed: null };
    }
    const v = speedOf(current.id);
    return {
      name: t().scenes[current.id],
      line: t().caption[current.id],
      speed: v ? t().caption.swingby(v.before, v.after) : null,
    };
  });
</script>

<svelte:window onpointerdown={onCanvasInput} onwheel={onCanvasInput} />

<div class="caption" class:shown class:quick role="status" aria-live="polite">
  {#if content}
    <div class="name">{content.name}</div>
    <div class="line">{content.line}</div>
    {#if content.speed}<div class="speed">{content.speed}</div>{/if}
  {/if}
</div>

<style>
  .caption {
    position: fixed;
    left: 0;
    right: 0;
    top: 62%;
    padding: 0 calc(var(--safe-right) + var(--space-3)) 0 calc(var(--safe-left) + var(--space-3));
    max-width: 40rem;
    margin: 0 auto;
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
  .speed {
    font-family: var(--font-numeric);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-s);
    letter-spacing: var(--body-tracking);
    color: var(--color-gold);
  }
  @media (prefers-reduced-motion: reduce) {
    .caption {
      transition: none;
    }
  }
</style>
