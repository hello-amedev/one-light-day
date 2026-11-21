<script lang="ts">
  // 操作の部品のボタン。見た目は 1 種類(文字かアイコンだけ。選択中は金の下線)。
  // tip を渡すと、PC で指した時(ホバー・キーボードの焦点)に小さな吹き出しで名前を出す。
  import type { Snippet } from 'svelte';

  interface Props {
    onclick: () => void;
    /** 見える文字と読み上げが違う時、アイコンだけのボタンの名前 */
    label?: string;
    /** 選ばれている状態(視点・速さ・再生中)。aria-pressed と金の下線になる */
    pressed?: boolean;
    disabled?: boolean;
    /** アイコンだけのボタン(正方形にする) */
    icon?: boolean;
    /** 指した時に出す名前 */
    tip?: string;
    /** 吹き出しを出す側と、ボタンのどこにそろえるか(画面の端で切れないように) */
    tipPlace?: 'above' | 'below';
    tipAlign?: 'start' | 'center' | 'end';
    /** 一覧を開くボタンの、開いている状態 */
    expanded?: boolean;
    haspopup?: 'menu';
    children: Snippet;
  }

  let {
    onclick,
    label,
    pressed,
    disabled = false,
    icon = false,
    tip,
    tipPlace = 'below',
    tipAlign = 'center',
    expanded,
    haspopup,
    children,
  }: Props = $props();
</script>

<button
  type="button"
  class="ui-button"
  class:icon
  {onclick}
  aria-label={label}
  aria-pressed={pressed}
  aria-expanded={expanded}
  aria-haspopup={haspopup}
  {disabled}
>
  {@render children()}
  {#if tip}<span class="tip {tipPlace} {tipAlign}" aria-hidden="true">{tip}</span>{/if}
</button>

<style>
  .ui-button {
    position: relative;
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: var(--control-h);
    min-width: var(--control-h);
    padding: 0 var(--space-2);
    background: none;
    border: none;
    border-bottom: var(--line-medium) solid transparent;
    color: var(--color-text-dim);
    font-size: var(--text-s);
    letter-spacing: 0.04em;
    text-shadow: var(--text-halo);
    cursor: pointer;
    white-space: nowrap;
    transition:
      color var(--dur-s) var(--ease-out),
      border-color var(--dur-s) var(--ease-out);
  }
  .ui-button.icon {
    padding: 0;
  }
  .ui-button:hover:not(:disabled) {
    color: var(--color-text);
  }
  .ui-button[aria-pressed='true'] {
    color: var(--color-text);
    border-bottom-color: var(--color-gold);
  }
  .ui-button[aria-expanded='true'] {
    color: var(--color-text);
  }
  .ui-button:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: -2px;
  }
  .ui-button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  /* 指した時の名前。ブラウザの title の遅い吹き出しに頼らず、トークンで作る */
  .tip {
    position: absolute;
    z-index: 3;
    padding: 2px var(--space-2);
    background: var(--panel-bg);
    border: var(--line-thin) solid var(--color-rule);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: var(--text-xs);
    letter-spacing: var(--body-tracking);
    text-shadow: none;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity var(--dur-s) var(--ease-out),
      visibility 0s linear var(--dur-s);
  }
  .tip.below {
    top: calc(100% + var(--space-1));
  }
  .tip.above {
    bottom: calc(100% + var(--space-1));
  }
  .tip.center {
    left: 50%;
    transform: translateX(-50%);
  }
  .tip.start {
    left: 0;
  }
  .tip.end {
    right: 0;
  }
  .ui-button:focus-visible .tip {
    opacity: 1;
    visibility: visible;
    transition-delay: 0s;
  }
  @media (hover: hover) {
    .ui-button:hover:not(:disabled) .tip {
      opacity: 1;
      visibility: visible;
      transition-delay: var(--dur-m);
    }
  }
  /* 一覧が開いている間は、一覧に重ならないよう出さない */
  .ui-button[aria-expanded='true'] .tip {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .ui-button,
    .tip {
      transition: none;
    }
  }
</style>
