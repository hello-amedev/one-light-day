<script lang="ts">
  // 送り・名場面の移動・一覧を開くボタンに使う矢印。文字ではなく線で描く。
  interface Props {
    direction: 'left' | 'right' | 'down' | 'up';
    /** 名場面の移動は端に縦線を足して、日の送りと見分ける(縦線と矢印の間を空け、「K」に見えないようにする) */
    bar?: boolean;
  }
  let { direction, bar = false }: Props = $props();
</script>

<svg class="chevron" class:small={direction === 'down' || direction === 'up'} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
  {#if direction === 'down'}
    <path d="M2.5 4.5 6 8l3.5-3.5" />
  {:else if direction === 'up'}
    <path d="M2.5 7.5 6 4l3.5 3.5" />
  {:else if bar}
    {#if direction === 'left'}
      <path d="M10 2 6 6l4 4M2 1.5v9" />
    {:else}
      <path d="M2 2l4 4-4 4M10 1.5v9" />
    {/if}
  {:else if direction === 'left'}
    <path d="M8 1.5 3.5 6 8 10.5" />
  {:else}
    <path d="M4 1.5 8.5 6 4 10.5" />
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
  .chevron.small {
    width: 10px;
    height: 10px;
  }
</style>
