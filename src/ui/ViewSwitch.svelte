<script lang="ts">
  // 視点の切り替え(ボイジャーの視界 / 引きの眺め / ボイジャー本体)。アイコン 3 つと、今の視点の名前。
  // 選択中は金の下線。名前は指した時に出る吹き出しと読み上げにも使う。PC は横に今の視点の名前を出す(スマホの縦画面は出さない)。
  import { t } from '../lib/i18n';
  import type { AppStore, ViewId } from '../lib/store';
  import Icon, { type IconName } from './Icon.svelte';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  let { store }: { store: AppStore } = $props();
  const txt = t().hud;
  const view = watchStore(store);
  const options: { id: ViewId; text: string; icon: IconName }[] = [
    { id: 'voyager', text: txt.viewVoyager, icon: 'view-voyager' },
    { id: 'overview', text: txt.viewOverview, icon: 'view-overview' },
    { id: 'craft', text: txt.viewCraft, icon: 'view-craft' },
  ];
  const current = $derived(options.find((o) => o.id === view.state.view)?.text);
</script>

<div class="view-switch" role="group" aria-label={txt.viewGroup}>
  {#each options as o (o.id)}
    <UiButton
      icon
      label={o.text}
      tip={o.text}
      tipAlign="start"
      pressed={view.state.view === o.id}
      onclick={() => store.setView(o.id)}
    >
      <Icon name={o.icon} />
    </UiButton>
  {/each}
  <span class="name" aria-hidden="true">{current}</span>
</div>

<style>
  .view-switch {
    display: flex;
    align-items: center;
    margin-left: calc(var(--space-2) * -1);
  }
  .name {
    margin-left: var(--space-2);
    font-size: var(--text-xs);
    letter-spacing: var(--body-tracking);
    color: var(--color-text-dim);
    text-shadow: var(--text-halo);
    white-space: nowrap;
  }
  /* スマホの縦画面: 幅が足りず、アイコンの並びで分かるので、今の視点の名前は出さない(読み上げはボタンの名前で足りる) */
  @media (max-width: 640px) and (orientation: portrait) {
    .name {
      display: none;
    }
  }
</style>
