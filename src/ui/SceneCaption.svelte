<script lang="ts">
  // 名場面・出来事の文を、画面の中央より少し下へ出す。
  // - 名場面・出来事へ移った時(state.arrival)は、その文をすぐ出す
  // - 再生で名場面・出来事の時刻を通り過ぎた時は、順に出す(1 つを最低 4 秒。たまったら古いものを飛ばす)
  // - 再生で時刻が進んでも消さない。時間軸をつまむ・別の所へ移る・向きを変える・星空を操作すると消す
  // - 開いた直後の自動再生が今日で止まった時は、「地球から1光日」の文を出す(案内の 1 行はその後に出る)
  // - 写真のある文(地球と月、ペイル・ブルー・ドット)は、写真を空いた所に浮かばせる。写真の窓が出ている間は浮かばせない
  // - 文は句点・読点の後でだけ改行する(PhraseText)
  // 操作の部品の層の外に置く(薄くならない)。
  import { onDestroy } from 'svelte';
  import PhraseText from './PhraseText.svelte';
  import PhotoViewer from './PhotoViewer.svelte';
  import { captionPhotoOf, type ViewerPhoto } from './captionPhoto';
  import { photoWindowAvailable } from './photoWindow';
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
  interface Props {
    store: AppStore;
    eph?: Ephemeris;
    /** 文が出た・消えた時に呼ぶ(出ている間、後ろの天体の名前と目印を薄くするため) */
    onshownchange?: (shown: boolean) => void;
  }
  let { store, eph, onshownchange }: Props = $props();

  let cs: CaptionState = EMPTY_CAPTION;
  /** 出ている(または消えていく途中の)文。消えていく間も中身を残す */
  let current = $state<CaptionRef | null>(null);
  let shown = $state(false);
  $effect(() => {
    onshownchange?.(shown);
  });
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
    return { et: s.et, playing: s.playing, lookSeq: s.lookSeq, arrivalSeq: s.arrivalSeq, intro: s.intro };
  }

  /** 写真の窓が出ている間は、同じ写真を浮かばせない */
  let photoBlocked = $state(false);
  /** 浮かばせる写真を読み込み終えたか(読み込む前の空の枠を見せない) */
  let photoLoaded = $state(false);
  /** 押して大きく広げている写真。文が消えても、閉じるまで出しておく */
  let viewer = $state<ViewerPhoto | null>(null);

  const first = store.get();
  if (captionsAllowed(first) && first.arrival) {
    // 名場面の URL(?scene=…)で開いた時は、移った後にこの部品ができる
    apply(showNow(first.arrival, Date.now()));
  }

  let prev = pick(first);
  photoBlocked = photoWindowAvailable(first);
  const off = store.subscribe((s) => {
    const p = prev;
    prev = pick(s);
    photoBlocked = photoWindowAvailable(s);
    if (!captionsAllowed(s)) return hide(true);
    if (p.intro === 'run' && s.intro === 'done') {
      // 自動再生の最後の一瞬で 1光日の刻みを飛び越えても、必ず 1光日の文で終える
      return apply(enqueue(cs, [{ kind: 'scene', id: 'lightday' }], Date.now()));
    }
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

  /** 文に添えて浮かばせる写真。出し終わって消えていく間も、文と一緒に残す */
  const photo = $derived.by(() => {
    const p = captionPhotoOf(current);
    if (!p) return null;
    const txt = t().photo;
    return p.id === 'earthMoon'
      ? { ...p, src: import.meta.env.BASE_URL + 'textures/' + p.file, alt: txt.floating.earthMoonAlt, credit: txt.floating.earthMoonCredit }
      : { ...p, src: import.meta.env.BASE_URL + 'textures/' + p.file, alt: txt.alt, credit: txt.floating.pbdCredit };
  });
  $effect(() => {
    // 写真が替わったら、読み込み終えるまで隠す
    void photo?.src;
    photoLoaded = false;
  });
</script>

<svelte:window onpointerdown={onCanvasInput} onwheel={onCanvasInput} />

<div class="caption" class:shown class:quick role="status" aria-live="polite">
  {#if content}
    <div class="name"><PhraseText text={content.name} /></div>
    <div class="line"><PhraseText text={content.line} /></div>
    {#if content.speed}<div class="speed"><PhraseText text={content.speed} /></div>{/if}
  {/if}
</div>

{#if photo && !photoBlocked}
  <figure class="photo" class:shown={shown && photoLoaded} class:quick>
    <!-- 押すと画面の中央へ大きく広げる(PhotoViewer)。見えている間だけ押せる -->
    <button type="button" class="open" aria-label={t().photo.expand} title={t().photo.expand} onclick={() => (viewer = photo)}>
      <img
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        onload={() => (photoLoaded = true)}
      />
    </button>
    <figcaption>{photo.credit}</figcaption>
  </figure>
{/if}

<PhotoViewer photo={viewer} onclose={() => (viewer = null)} />

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
  /* 文と一緒に浮かばせる写真。スマホ(縦長・幅の狭い画面)は文のすぐ上、広い画面は右の数字の間 */
  .photo {
    position: fixed;
    left: 50%;
    bottom: calc(38% + var(--space-3));
    margin: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--dur-xl) var(--ease-in-out);
  }
  .photo.shown {
    opacity: 1;
    transition-duration: var(--dur-l);
  }
  .photo.quick {
    transition-duration: var(--dur-s);
  }
  .photo .open {
    display: block;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
  }
  .photo.shown .open {
    pointer-events: auto;
  }
  .photo .open:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: 2px;
  }
  .photo img {
    display: block;
    width: auto;
    height: min(16vh, 150px);
    border: var(--line-thin) solid var(--color-rule);
  }
  .photo figcaption {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    letter-spacing: var(--body-tracking);
    color: var(--color-text-dim);
    text-shadow: var(--text-halo);
  }
  @media (min-width: 768px) and (orientation: landscape) {
    .photo {
      left: auto;
      right: calc(var(--safe-right) + var(--space-4));
      bottom: auto;
      top: 20%;
      transform: none;
    }
    .photo img {
      height: min(36vh, 320px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .caption,
    .photo {
      transition: none;
    }
  }
</style>
