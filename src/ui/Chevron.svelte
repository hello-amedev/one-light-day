<script lang="ts">
  // 送り・名場面の移動に使う矢印。文字ではなく線で描く。
  interface Props {
    direction: 'left' | 'right';
    /** 名場面の移動は端に縦線を足して、日の送りと見分ける */
    bar?: boolean;
  }
  let { direction, bar = false }: Props = $props();
</script>

<svg class="chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
  {#if direction === 'left'}
    <path d="M8 1.5 3.5 6 8 10.5" />
    {#if bar}<path d="M1.5 1.5v9" />{/if}
  {:else}
    <path d="M4 1.5 8.5 6 4 10.5" />
    {#if bar}<path d="M10.5 1.5v9" />{/if}
  {/if}
</svg>

<style>
  .chevron {
    fill: none;
    stroke: currentColor;
    stroke-width: var(--line-thin);
    stroke-linecap: round;
    stroke-linejoin: round;
    flex: none;
  }
</style>
