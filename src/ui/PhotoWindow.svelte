<script lang="ts">
  // 写真の窓。ペイル・ブルー・ドットの実際の写真を、計器の小窓のように見せる。
  // 名場面の前後 1 日以内に、ボイジャーの視界で地球を向いている間だけ出る。操作しない間に薄くならない(層の外に置く)。
  // 写真は、窓を最初に開く時まで読み込まない。
  import { untrack } from 'svelte';
  import { formatDateTime } from '../lib/format';
  import { t } from '../lib/i18n';
  import { SCENES } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import type { BodyScreenPoint } from '../stage';
  import { edgeMidpoint, photoWindowAvailable, placePhotoWindow } from './photoWindow';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    /** 3D が出来た後に渡る。無い時は、窓だけ出して線は引かない */
    watchBody?: (body: 'earth', listener: (p: BodyScreenPoint) => void) => () => void;
  }
  let { store, watchBody }: Props = $props();

  const txt = t().photo;
  const view = watchStore(store);
  const takenAt = formatDateTime(SCENES.find((s) => s.id === 'pbd')!.et);
  const src = import.meta.env.BASE_URL + 'textures/pbd.jpg';

  const SIDE = 16;
  /** 広げた窓の周りの余白 */
  const EXPAND_MARGIN = 16;
  const PAD = 8;
  const HEADER = 36;

  let vw = $state(typeof window === 'undefined' ? 1280 : window.innerWidth);
  let vh = $state(typeof window === 'undefined' ? 800 : window.innerHeight);

  const available = $derived(photoWindowAvailable(view.state));
  let open = $state(false);
  let expanded = $state(false);
  /** 写真は、窓を最初に開いた時に読み込む */
  let wantPhoto = $state(false);
  let photoLoaded = $state(false);
  let earth = $state<BodyScreenPoint>({ x: 0, y: 0, visible: false });
  let cardH = $state(0);

  // 出せる状態になった時と、地球を向き直した時・名場面へ移った時(向くの通し番号が増えた時)は開く
  let prevAvailable = false;
  let prevSeq = view.state.lookSeq;
  $effect(() => {
    const a = available;
    const seq = view.state.lookSeq;
    untrack(() => {
      if (a && (!prevAvailable || seq !== prevSeq)) {
        open = true;
        wantPhoto = true;
      }
      if (!a) {
        open = false;
        expanded = false;
      }
      prevAvailable = a;
      prevSeq = seq;
    });
  });

  $effect(() => {
    if (!available || !watchBody) return;
    return watchBody('earth', (p) => (earth = p));
  });

  const portrait = $derived(vw <= 640 && vh > vw);
  /** 小さい画面(スマホの縦・横): 写真と文字を横に並べて、背を低くする */
  const compact = $derived(portrait || vh < 560);
  const cardW = $derived(compact ? Math.min(336, vw - 2 * SIDE) : 272);

  const placement = $derived(
    placePhotoWindow({
      viewport: { width: vw, height: vh },
      portrait,
      size: { w: cardW, h: cardH || (compact ? 190 : 380) },
      reserve: { top: portrait ? 96 : 96, bottom: portrait ? 250 : 170, side: SIDE },
      earth: earth.visible ? earth : null,
    }),
  );

  // 広げた時: 余白を残して、写真が入る最大の大きさ
  const expandedSide = $derived(
    Math.max(
      120,
      Math.min(vw - 2 * EXPAND_MARGIN - 2 * PAD, vh - 2 * EXPAND_MARGIN - 2 * PAD - HEADER - 100),
    ),
  );
  const rect = $derived(
    expanded
      ? {
          x: (vw - (expandedSide + 2 * PAD)) / 2,
          y: Math.max(EXPAND_MARGIN, (vh - (expandedSide + 2 * PAD + HEADER + 100)) / 2),
          w: expandedSide + 2 * PAD,
        }
      : { x: placement.x, y: placement.y, w: cardW },
  );

  const line = $derived.by(() => {
    if (!open || expanded || !earth.visible) return null;
    const to = edgeMidpoint(placement);
    const dx = to.x - earth.x;
    const dy = to.y - earth.y;
    const len = Math.hypot(dx, dy);
    if (len < 40) return null;
    // 地球の目印の輪に重ならないよう、少し離れた所から引く
    const k = 16 / len;
    return { x1: earth.x + dx * k, y1: earth.y + dy * k, x2: to.x, y2: to.y };
  });

  function close() {
    open = false;
    expanded = false;
  }
  function reopen() {
    open = true;
    wantPhoto = true;
  }
</script>

<svelte:window
  bind:innerWidth={vw}
  bind:innerHeight={vh}
  onkeydown={(e) => {
    if (e.key === 'Escape' && expanded) expanded = false;
  }}
/>

{#if available}
  <!-- 地球の目印から窓の枠へ引く細い金の線 -->
  <svg class="leader" class:shown={open && !expanded} aria-hidden="true">
    {#if line}<line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />{/if}
  </svg>

  <!-- 閉じた後は、地球の目印を押すとまた開く(この場面の間だけ) -->
  {#if !open && earth.visible}
    <button
      type="button"
      class="earth-hit"
      style:left="{earth.x - 22}px"
      style:top="{earth.y - 22}px"
      aria-label={txt.reopen}
      onclick={reopen}
    ></button>
  {/if}

  <button
    type="button"
    class="backdrop"
    class:shown={expanded}
    tabindex="-1"
    aria-hidden="true"
    onclick={() => (expanded = false)}
  ></button>

  <div
    class="card"
    class:closed={!open}
    class:expanded
    class:compact={compact && !expanded}
    style:left="{rect.x}px"
    style:top="{rect.y}px"
    style:width="{rect.w}px"
    bind:clientHeight={cardH}
    role="dialog"
    aria-label={txt.heading}
  >
    <header>
      <span class="heading">{txt.heading}</span>
      <button type="button" class="close" onclick={close}>{txt.close}</button>
    </header>
    <div class="body">
      <button
        type="button"
        class="photo"
        aria-label={expanded ? txt.collapse : txt.expand}
        onclick={() => (expanded = !expanded)}
      >
        {#if wantPhoto}
          <img {src} alt={txt.alt} class:loaded={photoLoaded} onload={() => (photoLoaded = true)} decoding="async" />
        {/if}
      </button>
      <div class="text">
        <p>{txt.taken(takenAt)}</p>
        <p>{txt.credit}</p>
        <p>{txt.note}</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .leader {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--dur-m) var(--ease-out);
  }
  .leader.shown {
    opacity: 0.7;
  }
  .leader line {
    stroke: var(--color-gold);
    stroke-width: var(--line-thin);
  }
  .earth-hit {
    position: fixed;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    pointer-events: auto;
  }
  .earth-hit:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
  }
  .backdrop {
    position: fixed;
    inset: 0;
    padding: 0;
    border: none;
    background: var(--color-space);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-m) var(--ease-out);
  }
  .backdrop.shown {
    opacity: 0.78;
    pointer-events: auto;
  }
  .card {
    position: fixed;
    box-sizing: border-box;
    padding: 0 var(--space-2) var(--space-2);
    background: var(--color-space);
    border: var(--line-thin) solid var(--color-gold);
    font-family: var(--font-body);
    pointer-events: auto;
    opacity: 1;
    transition:
      left var(--dur-m) var(--ease-out),
      top var(--dur-m) var(--ease-out),
      width var(--dur-m) var(--ease-out),
      opacity var(--dur-m) var(--ease-out),
      visibility var(--dur-m);
  }
  .card.closed {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  /* 角の小さな括弧 */
  .card::before,
  .card::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    border: var(--line-medium) solid var(--color-gold);
    pointer-events: none;
  }
  .card::before {
    top: -4px;
    left: -4px;
    border-right: 0;
    border-bottom: 0;
  }
  .card::after {
    bottom: -4px;
    right: -4px;
    border-left: 0;
    border-top: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
  }
  .heading {
    font-family: var(--font-title);
    font-size: var(--text-xs);
    letter-spacing: 0.28em;
    color: var(--color-text);
  }
  .close {
    position: relative;
    padding: 0;
    border: none;
    background: none;
    color: var(--color-text-dim);
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  .close::before {
    /* 見た目は小さいまま、押す範囲を広げる */
    content: '';
    position: absolute;
    inset: -12px -8px;
  }
  .close:hover {
    color: var(--color-text);
  }
  .close:focus-visible,
  .photo:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: 2px;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .compact .body {
    flex-direction: row;
    align-items: flex-start;
  }
  .photo {
    display: block;
    flex: none;
    width: 100%;
    aspect-ratio: 1600 / 1583;
    padding: 0;
    border: none;
    background: var(--color-space);
    cursor: zoom-in;
    overflow: hidden;
  }
  .expanded .photo {
    cursor: zoom-out;
  }
  .compact .photo {
    width: 132px;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity var(--dur-m) var(--ease-out);
  }
  img.loaded {
    opacity: 1;
  }
  .text {
    min-width: 0;
    flex: 1;
  }
  .text p {
    margin: 0 0 var(--space-1);
    font-size: var(--text-xs);
    line-height: 1.5;
    letter-spacing: var(--body-tracking);
    color: var(--color-text-dim);
  }
  .text p:first-child {
    font-family: var(--font-numeric);
  }
  @media (prefers-reduced-motion: reduce) {
    .leader,
    .backdrop,
    .card,
    img {
      transition: none;
    }
  }
</style>
