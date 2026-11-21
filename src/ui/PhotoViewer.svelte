<script lang="ts">
  // 文と一緒に浮かんだ写真を押した時に、画面の中央へ大きく広げる。写真の窓(PhotoWindow)を広げた時と同じ見た目。
  // 写真か背景を押す・Esc・閉じるで戻る。文が消えても、閉じるまで出しておく。
  import { tick } from 'svelte';
  import { t } from '../lib/i18n';
  import type { ViewerPhoto } from './captionPhoto';

  let { photo, onclose }: { photo: ViewerPhoto | null; onclose: () => void } = $props();
  let closeButton: HTMLButtonElement | undefined = $state();

  $effect(() => {
    if (!photo) return;
    void tick().then(() => closeButton?.focus());
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (photo && e.key === 'Escape') onclose();
  }}
/>

{#if photo}
  <button type="button" class="backdrop" tabindex="-1" aria-hidden="true" onclick={onclose}></button>
  <div class="card" role="dialog" aria-modal="true" aria-label={photo.alt}>
    <header>
      <button type="button" class="close" bind:this={closeButton} onclick={onclose}>{t().photo.close}</button>
    </header>
    <button type="button" class="photo" aria-label={t().photo.collapse} onclick={onclose}>
      <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" />
    </button>
    <p class="credit">{photo.credit}</p>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    padding: 0;
    border: none;
    background: var(--color-space);
    opacity: 0.85;
    pointer-events: auto;
  }
  .card {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    padding: 0 var(--space-2) var(--space-2);
    background: var(--color-space);
    border: var(--line-thin) solid var(--color-gold);
    font-family: var(--font-body);
    pointer-events: auto;
  }
  /* 角の小さな括弧(写真の窓と同じ) */
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
    justify-content: flex-end;
    align-items: center;
    height: 36px;
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
  .photo {
    display: block;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-out;
  }
  .photo img {
    display: block;
    width: auto;
    height: auto;
    max-width: calc(100vw - 2 * var(--space-4) - 2 * var(--space-2));
    max-height: calc(100vh - 140px);
  }
  .credit {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    letter-spacing: var(--body-tracking);
    color: var(--color-text-dim);
  }
</style>
