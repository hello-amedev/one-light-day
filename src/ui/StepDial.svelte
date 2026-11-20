<script lang="ts">
  // 送りダイヤル 1 つ分(‹ 1日 ›)。1 日用と 1 時間用で共通。
  import UiButton from './UiButton.svelte';
  import Chevron from './Chevron.svelte';

  interface Props {
    /** 見える文字(「1日」「1時間」) */
    text: string;
    backLabel: string;
    forwardLabel: string;
    onstep: (direction: -1 | 1) => void;
  }
  let { text, backLabel, forwardLabel, onstep }: Props = $props();
</script>

<div class="dial">
  <UiButton label={backLabel} onclick={() => onstep(-1)}><Chevron direction="left" /></UiButton>
  <span class="text">{text}</span>
  <UiButton label={forwardLabel} onclick={() => onstep(1)}><Chevron direction="right" /></UiButton>
</div>

<style>
  .dial {
    display: inline-flex;
    align-items: center;
  }
  .text {
    min-width: 3.4em;
    text-align: center;
    font-size: var(--text-s);
    color: var(--color-text);
    text-shadow: var(--text-halo);
    letter-spacing: 0.04em;
  }
</style>
