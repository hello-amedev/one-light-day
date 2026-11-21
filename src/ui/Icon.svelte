<script lang="ts" module>
  export type IconName = 'view-voyager' | 'view-overview' | 'view-craft' | 'menu' | 'look' | 'play' | 'pause';
</script>

<script lang="ts">
  // 操作の部品のアイコン。細い線だけで描く(色は currentColor、線の太さはトークン)。名前は押すボタン側が持つ。
  let { name }: { name: IconName } = $props();
</script>

<svg class="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  {#if name === 'view-voyager'}
    <!-- ファインダーの四隅の括弧と、中央の円 -->
    <path d="M3.5 8.5v-5h5M15.5 3.5h5v5M20.5 15.5v5h-5M8.5 20.5h-5v-5" />
    <circle cx="12" cy="12" r="3.2" />
  {:else if name === 'view-overview'}
    <!-- 太陽のまわりの軌道と、その上の点 -->
    <g transform="rotate(-18 12 12)">
      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
      <ellipse cx="12" cy="12" rx="5.5" ry="2.2" />
      <circle class="solid" cx="22" cy="12" r="1.4" />
    </g>
    <circle class="solid" cx="12" cy="12" r="1.4" />
  {:else if name === 'view-craft'}
    <!-- 大きなアンテナと本体 -->
    <ellipse cx="12" cy="7.5" rx="8" ry="3" />
    <path d="M4 7.5q8 9 16 0" />
    <path d="M12 12.8v3M16 19.5h4.5" />
    <rect x="9" y="15.8" width="7" height="5" />
  {:else if name === 'menu'}
    <path d="M4 7h16M4 12h16M4 17h16" />
  {:else if name === 'look'}
    <circle cx="12" cy="12" r="5" />
    <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    <circle class="solid" cx="12" cy="12" r="1" />
  {:else if name === 'play'}
    <path d="M8 5l11 7-11 7z" />
  {:else if name === 'pause'}
    <rect x="7" y="5" width="3.5" height="14" />
    <rect x="13.5" y="5" width="3.5" height="14" />
  {/if}
</svg>

<style>
  .icon {
    fill: none;
    stroke: currentColor;
    stroke-width: var(--line-thin);
    stroke-linecap: round;
    stroke-linejoin: round;
    flex: none;
  }
  .solid {
    fill: currentColor;
    stroke: none;
  }
</style>
