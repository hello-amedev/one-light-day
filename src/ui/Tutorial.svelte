<script lang="ts">
  // 使い方の案内。画面全体を暗くし、段ごとに説明する部品だけを金の括弧で囲んで明るく残し、そばに札を出す。
  // 部品は UiLayer の data-tour の印で探す(段と印の対応は TUTORIAL_STEPS)。部品が無い時(本体の視点の向くボタンなど)は札を中央に出す。
  // 開いている間は後ろの部品と 3D へ操作を通さない。× ・完了・Esc で閉じる。← → でも段を移れる。
  import { onMount, tick } from 'svelte';
  import { t } from '../lib/i18n';
  import { cardPosition, spotlightRect, TUTORIAL_STEPS, type Rect } from '../lib/tutorial';
  import { focusTrapTarget } from './aboutFocus';

  interface Props {
    /** 閉じる時に呼ぶ */
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  const txt = t().tutorial;
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  /** 札と部品の間、画面の端と札の間、部品の外側に広げる余白(px) */
  const GAP = 14;
  const MARGIN = 12;
  const PAD = 6;

  let index = $state(0);
  const step = $derived(TUTORIAL_STEPS[index]);
  const last = $derived(index === TUTORIAL_STEPS.length - 1);
  const words = $derived(txt.steps[step.id]);
  const body = $derived('bodyTouch' in words && touch ? words.bodyTouch : words.body);

  let viewport = $state({ width: 0, height: 0 });
  let spot = $state<Rect | null>(null);
  let cardWidth = $state(0);
  let cardHeight = $state(0);
  const pos = $derived(
    cardPosition(spot, { width: cardWidth, height: cardHeight }, viewport, GAP, MARGIN),
  );

  let card: HTMLElement;
  let primary: HTMLButtonElement;

  // 書き込む値(viewport・spot)を読まない。effect の中から呼ぶので、読むと自分の書き込みで呼ばれ直し続ける
  function measure() {
    const vp = { width: window.innerWidth, height: window.innerHeight };
    const rects = step.targets.flatMap((id) =>
      [...document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)].map((el) => el.getBoundingClientRect()),
    );
    viewport = vp;
    spot = spotlightRect(rects, vp, PAD);
  }

  // 段が変わったら測り直す。部品が薄い状態から戻る動きの間に大きさが変わることがあるので、少し後にも測る
  $effect(() => {
    void index;
    measure();
    const id = setTimeout(measure, 400);
    return () => clearTimeout(id);
  });

  onMount(() => {
    const before = document.activeElement as HTMLElement | null;
    primary.focus();
    return () => before?.focus?.();
  });

  async function go(next: number) {
    if (next < 0) return;
    if (next >= TUTORIAL_STEPS.length) {
      onclose();
      return;
    }
    index = next;
    await tick();
    primary?.focus();
  }

  function keydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onclose();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      void go(index + (e.key === 'ArrowRight' ? 1 : -1));
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...card.querySelectorAll<HTMLElement>('button')];
    const target = focusTrapTarget(items.length, items.indexOf(document.activeElement as HTMLElement), e.shiftKey);
    if (target !== null) {
      e.preventDefault();
      items[target].focus();
    }
  }
</script>

<svelte:window onkeydowncapture={keydown} onresize={measure} />

<div class="tour">
  <!-- 後ろへ操作を通さない受け止め。押しても何もしない -->
  <div class="catcher" aria-hidden="true"></div>
  {#if spot}
    <div
      class="spot"
      aria-hidden="true"
      style:left="{spot.left}px"
      style:top="{spot.top}px"
      style:width="{spot.width}px"
      style:height="{spot.height}px"
    ></div>
  {:else}
    <div class="scrim" aria-hidden="true"></div>
  {/if}

  <div
    class="card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tour-heading"
    aria-describedby="tour-body"
    bind:this={card}
    bind:clientWidth={cardWidth}
    bind:clientHeight={cardHeight}
    style:left="{pos.left}px"
    style:top="{pos.top}px"
  >
    <header>
      <span class="progress">{txt.progress(String(index + 1), String(TUTORIAL_STEPS.length))}</span>
      <button type="button" class="close" aria-label={txt.close} title={txt.close} onclick={onclose}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M2 2 L10 10 M10 2 L2 10" />
        </svg>
      </button>
    </header>
    <h2 id="tour-heading">{words.heading}</h2>
    <p id="tour-body">{body}</p>
    <footer>
      {#if index > 0}
        <button type="button" class="action" onclick={() => go(index - 1)}>{txt.back}</button>
      {/if}
      <button type="button" class="action primary" bind:this={primary} onclick={() => go(index + 1)}>
        {last ? txt.done : txt.next}
      </button>
    </footer>
  </div>
</div>

<style>
  .tour {
    position: fixed;
    inset: 0;
    z-index: 11;
    pointer-events: none;
    font-family: var(--font-body);
    animation: tour-in var(--dur-l) var(--ease-out) both;
  }
  @keyframes tour-in {
    from {
      opacity: 0;
    }
  }
  .catcher {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: var(--tour-scrim);
  }
  /* 囲む範囲の外を暗くする(大きな影で塗る)。四隅に金の括弧 */
  .spot {
    position: absolute;
    box-shadow: 0 0 0 200vmax var(--tour-scrim);
    background:
      linear-gradient(var(--color-gold), var(--color-gold)) top left / 14px var(--line-thin),
      linear-gradient(var(--color-gold), var(--color-gold)) top left / var(--line-thin) 14px,
      linear-gradient(var(--color-gold), var(--color-gold)) top right / 14px var(--line-thin),
      linear-gradient(var(--color-gold), var(--color-gold)) top right / var(--line-thin) 14px,
      linear-gradient(var(--color-gold), var(--color-gold)) bottom left / 14px var(--line-thin),
      linear-gradient(var(--color-gold), var(--color-gold)) bottom left / var(--line-thin) 14px,
      linear-gradient(var(--color-gold), var(--color-gold)) bottom right / 14px var(--line-thin),
      linear-gradient(var(--color-gold), var(--color-gold)) bottom right / var(--line-thin) 14px;
    background-repeat: no-repeat;
    transition:
      left var(--dur-l) var(--ease-in-out),
      top var(--dur-l) var(--ease-in-out),
      width var(--dur-l) var(--ease-in-out),
      height var(--dur-l) var(--ease-in-out);
  }
  .card {
    position: absolute;
    width: min(20rem, calc(100vw - 24px));
    box-sizing: border-box;
    padding: var(--space-3);
    pointer-events: auto;
    background: var(--panel-bg);
    border: var(--line-thin) solid var(--color-rule);
    color: var(--color-text);
    transition:
      left var(--dur-l) var(--ease-in-out),
      top var(--dur-l) var(--ease-in-out);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: calc(var(--space-2) * -1) calc(var(--space-2) * -1) 0 0;
  }
  .progress {
    font-family: var(--font-numeric);
    font-size: var(--text-xs);
    letter-spacing: 0.12em;
    color: var(--color-gold);
  }
  .close {
    display: grid;
    place-items: center;
    width: var(--control-h);
    height: var(--control-h);
    padding: 0;
    background: none;
    border: none;
    color: var(--color-text-dim);
    cursor: pointer;
  }
  .close path {
    stroke: currentColor;
    stroke-width: 1.2;
  }
  .close:hover,
  .close:focus-visible {
    color: var(--color-text);
  }
  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-m);
    font-weight: 500;
    letter-spacing: var(--body-tracking);
  }
  p {
    margin: 0;
    font-size: var(--text-s);
    line-height: 1.8;
    letter-spacing: 0.04em;
    color: var(--color-text-dim);
    word-break: auto-phrase;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .action {
    min-height: var(--control-h);
    min-width: 5.5em;
    padding: 0 var(--space-3);
    background: none;
    border: var(--line-thin) solid var(--color-rule);
    color: var(--color-text-dim);
    font-family: var(--font-body);
    font-size: var(--text-s);
    letter-spacing: var(--body-tracking);
    cursor: pointer;
  }
  .action.primary {
    border-color: var(--color-gold);
    color: var(--color-text);
  }
  .action:hover {
    color: var(--color-text);
    background: var(--scrim-bg);
  }
  .action:focus-visible,
  .close:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .tour {
      animation: none;
    }
    .spot,
    .card {
      transition: none;
    }
  }
</style>
