<script lang="ts">
  // 視点の切り替え(ボイジャーの視界 / 引きの眺め)。選択中は金の下線。
  import { t } from '../lib/i18n';
  import type { AppStore, ViewId } from '../lib/store';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  let { store }: { store: AppStore } = $props();
  const txt = t().hud;
  const view = watchStore(store);
  const options: { id: ViewId; text: string }[] = [
    { id: 'voyager', text: txt.viewVoyager },
    { id: 'overview', text: txt.viewOverview },
  ];
</script>

<div class="view-switch" role="group" aria-label={txt.viewGroup}>
  {#each options as o (o.id)}
    <UiButton pressed={view.state.view === o.id} onclick={() => store.setView(o.id)}>{o.text}</UiButton>
  {/each}
</div>

<style>
  .view-switch {
    display: flex;
    flex-wrap: wrap;
    margin-left: calc(var(--space-2) * -1);
  }
</style>
