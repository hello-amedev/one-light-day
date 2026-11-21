<script lang="ts">
  // 右下の距離の上に小さく出す 1 行。ボイジャーの視界は倍率(上限では狭角カメラの視野と添える)、
  // 本体の視点は機体からの距離。引きの眺めでは出さない(出す中身は readoutExtra が決める)。
  import { t } from '../lib/i18n';
  import type { ReadoutExtra } from './controls';

  let { extra }: { extra: ReadoutExtra } = $props();
  const txt = t().hud;
</script>

{#if extra}
  <div class="extra">
    {#if extra.kind === 'magnification'}
      <span class="mag" role="img" aria-label={txt.magnificationAria(String(extra.value))}>
        {txt.magnification(String(extra.value))}
      </span>
      {#if extra.atLimit}<span class="limit">{txt.magnificationLimit}</span>{/if}
    {:else}
      <span class="mag">{txt.craftDistance(String(extra.meters))}</span>
    {/if}
  </div>
{/if}

<style>
  .extra {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    flex-wrap: wrap;
    column-gap: var(--space-2);
    text-shadow: var(--text-halo);
    font-family: var(--font-numeric);
    pointer-events: none;
  }
  .mag {
    font-size: var(--text-m);
    color: var(--color-text-dim);
    white-space: nowrap;
  }
  .limit {
    font-family: var(--font-body);
    font-size: var(--text-xs);
    letter-spacing: 0.08em;
    color: var(--color-gold);
  }
  @media (max-width: 640px) and (orientation: portrait) {
    .extra {
      justify-content: flex-start;
    }
  }
</style>
