<script lang="ts">
  // 「このサイトについて」のパネル。画面の上に重ね、閉じるボタン・外側を押す・Esc で閉じる。
  // 中身は辞書(t().about)の見出し・段落・箇条書きを並べるだけ。開いている間は後ろの 3D へ操作を通さない。
  import { onMount } from 'svelte';
  import { t } from '../lib/i18n';
  import { focusTrapTarget } from './aboutFocus';

  interface Props {
    /** 閉じる時に呼ぶ(再生を止めるなど、開く側の後始末は呼び出し側) */
    onclose: () => void;
  }
  let { onclose }: Props = $props();

  const txt = t().about;

  let panel: HTMLElement;
  let closeButton: HTMLButtonElement;
  /** 外側を押した時だけ閉じる。中で文字を選んで外で離した時は閉じない */
  let downOnScrim = false;

  onMount(() => {
    const before = document.activeElement as HTMLElement | null;
    closeButton.focus();
    return () => before?.focus?.();
  });

  function keydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onclose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...panel.querySelectorAll<HTMLElement>('button, a[href]')];
    const target = focusTrapTarget(items.length, items.indexOf(document.activeElement as HTMLElement), e.shiftKey);
    if (target !== null) {
      e.preventDefault();
      items[target].focus();
    }
  }
</script>

<svelte:window onkeydowncapture={keydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="scrim"
  onpointerdown={(e) => (downOnScrim = e.target === e.currentTarget)}
  onclick={(e) => {
    if (downOnScrim && e.target === e.currentTarget) onclose();
    downOnScrim = false;
  }}
>
  <div class="panel" bind:this={panel} role="dialog" aria-modal="true" aria-label={txt.title}>
    <header>
      <span class="kicker">{txt.kicker}</span>
      <button type="button" class="close" bind:this={closeButton} onclick={onclose}>{txt.close}</button>
    </header>
    <div class="scroll">
      {#each txt.sections as section (section.heading)}
        <section class="part">
          <h2>{section.heading}</h2>
          {#each section.blocks as block}
            {#if block.kind === 'p'}
              <p>{block.text}</p>
            {:else if block.kind === 'sub'}
              <h3>{block.text}</h3>
            {:else if block.kind === 'list'}
              <ul>
                {#each block.items as item}<li>{item}</li>{/each}
              </ul>
            {:else if block.kind === 'terms'}
              <dl>
                {#each block.items as item}
                  <dt>{item.term}</dt>
                  {#if item.href}
                    <dd><a class="term-link" href={item.href} target="_blank" rel="noopener noreferrer">{item.text}</a></dd>
                  {:else}
                    <dd>{item.text}</dd>
                  {/if}
                {/each}
              </dl>
            {:else if block.kind === 'credits'}
              <dl class="credits">
                {#each block.items as item}
                  <dt>{item.use}</dt>
                  <dd>
                    {item.name}
                    {#if item.license}
                      {#if item.href}
                        <a href={item.href} target="_blank" rel="noopener noreferrer">{item.license}</a>
                      {:else}
                        <span class="license">{item.license}</span>
                      {/if}
                    {/if}
                    {#if item.note}<span class="note">{item.note}</span>{/if}
                  </dd>
                {/each}
              </dl>
            {/if}
          {/each}
        </section>
      {/each}
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: calc(var(--safe-top) + var(--space-3)) calc(var(--safe-right) + var(--space-3))
      calc(var(--safe-bottom) + var(--space-3)) calc(var(--safe-left) + var(--space-3));
    background: var(--scrim-bg);
    /* 後ろの 3D へドラッグ・ホイール・ピンチを通さない */
    pointer-events: auto;
    touch-action: none;
    animation: fade-in var(--dur-m) var(--ease-out);
  }
  .panel {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 40rem;
    max-height: 100%;
    background: var(--panel-bg);
    border: var(--line-thin) solid var(--color-gold);
    font-family: var(--font-body);
    color: var(--color-text);
    /* 板の中は文字を選んでコピーできる(問い合わせ先) */
    user-select: text;
    -webkit-user-select: text;
  }
  /* 角の小さな括弧(写真の窓と同じあしらい) */
  .panel::before,
  .panel::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    border: var(--line-medium) solid var(--color-gold);
    pointer-events: none;
  }
  .panel::before {
    top: -4px;
    left: -4px;
    border-right: 0;
    border-bottom: 0;
  }
  .panel::after {
    bottom: -4px;
    right: -4px;
    border-left: 0;
    border-top: 0;
  }
  header {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-3);
    min-height: var(--hit-min);
    border-bottom: var(--line-thin) solid var(--color-gold);
  }
  .kicker {
    font-family: var(--font-title);
    font-size: var(--text-xs);
    letter-spacing: 0.28em;
    color: var(--color-text);
  }
  .close {
    min-height: var(--hit-min);
    padding: 0 var(--space-2);
    margin-right: calc(var(--space-2) * -1);
    border: none;
    background: none;
    color: var(--color-text-dim);
    font-size: var(--text-s);
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  .close:hover {
    color: var(--color-text);
  }
  .close:focus-visible,
  a:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: 2px;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--space-3) var(--space-3) var(--space-4);
    /* 板の中は縦にスクロールできる。端に着いても後ろへ伝えない */
    touch-action: pan-y;
    overscroll-behavior: contain;
    font-size: var(--text-m);
    line-height: 1.85;
    letter-spacing: var(--body-tracking);
  }
  .part + .part {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: var(--line-thin) solid var(--color-rule);
  }
  h2 {
    margin: 0 0 var(--space-2);
    padding-left: var(--space-2);
    border-left: var(--line-medium) solid var(--color-gold);
    font-size: var(--text-m);
    font-weight: 400;
    line-height: 1.6;
    letter-spacing: 0.12em;
    color: var(--color-text);
  }
  h3 {
    margin: var(--space-3) 0 var(--space-1);
    font-size: var(--text-s);
    font-weight: 400;
    letter-spacing: 0.16em;
    color: var(--color-gold);
  }
  p {
    margin: 0 0 var(--space-2);
    color: var(--color-text-dim);
  }
  ul {
    margin: 0;
    padding-left: 1.2em;
    color: var(--color-text-dim);
  }
  li {
    margin-bottom: var(--space-1);
  }
  li::marker {
    color: var(--color-gold);
  }
  dl {
    margin: 0 0 var(--space-2);
  }
  dt {
    margin-top: var(--space-2);
    font-size: var(--text-s);
    letter-spacing: 0.12em;
    color: var(--color-text);
  }
  dd {
    margin: 0;
    color: var(--color-text-dim);
    overflow-wrap: anywhere;
  }
  .license,
  a {
    margin-left: var(--space-1);
    color: var(--color-text);
    white-space: nowrap;
  }
  /* 項目の説明そのものがリンクの時は、前に名前が無いので空けない */
  a.term-link {
    margin-left: 0;
  }
  a {
    text-decoration: underline;
    text-decoration-color: var(--color-gold);
    text-underline-offset: 3px;
  }
  .note {
    display: block;
    font-size: var(--text-s);
    line-height: 1.7;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .scrim {
      animation: none;
    }
  }
</style>
