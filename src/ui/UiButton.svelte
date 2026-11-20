<script lang="ts">
  // 操作の部品のボタン。見た目は 1 種類(文字だけ。選択中は金の下線)。
  import type { Snippet } from 'svelte';

  interface Props {
    onclick: () => void;
    /** 見える文字と読み上げが違う時だけ */
    label?: string;
    /** 選ばれている状態(視点・速さ・再生中)。aria-pressed と金の下線になる */
    pressed?: boolean;
    disabled?: boolean;
    children: Snippet;
  }

  let { onclick, label, pressed, disabled = false, children }: Props = $props();
</script>

<button type="button" class="ui-button" {onclick} aria-label={label} aria-pressed={pressed} {disabled}>
  {@render children()}
</button>

<style>
  .ui-button {
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
  .ui-button:hover:not(:disabled) {
    color: var(--color-text);
  }
  .ui-button[aria-pressed='true'] {
    color: var(--color-text);
    border-bottom-color: var(--color-gold);
  }
  .ui-button:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: -2px;
  }
  .ui-button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    .ui-button {
      transition: none;
    }
  }
</style>
