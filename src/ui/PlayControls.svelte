<script lang="ts">
  // 再生 / 停止、再生の速さ 4 段、送りダイヤル(1日・1時間)。
  import { t } from '../lib/i18n';
  import { RATE_SECONDS, type AppStore, type RateId } from '../lib/store';
  import UiButton from './UiButton.svelte';
  import StepDial from './StepDial.svelte';
  import { watchStore } from './store.svelte';

  let { store }: { store: AppStore } = $props();
  const txt = t().hud;
  const view = watchStore(store);
  const rateIds = Object.keys(RATE_SECONDS) as RateId[];
</script>

<div class="play" role="group" aria-label={txt.playGroup}>
  <UiButton pressed={view.state.playing} onclick={() => store.toggle()}>
    {view.state.playing ? txt.pause : txt.play}
  </UiButton>
  <div class="rates">
    {#each rateIds as id (id)}
      <UiButton pressed={view.state.rate === id} onclick={() => store.setRate(id)}>{txt.rates[id]}</UiButton>
    {/each}
  </div>
</div>

<div class="dials" role="group" aria-label={txt.stepGroup}>
  <StepDial
    text={txt.stepDay}
    backLabel={txt.stepBackDay}
    forwardLabel={txt.stepForwardDay}
    onstep={(d) => store.stepTime(d * 86400)}
  />
  <StepDial
    text={txt.stepHour}
    backLabel={txt.stepBackHour}
    forwardLabel={txt.stepForwardHour}
    onstep={(d) => store.stepTime(d * 3600)}
  />
</div>

<style>
  .play {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin-left: calc(var(--space-2) * -1);
  }
  .rates {
    display: flex;
    flex-wrap: wrap;
  }
  .dials {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: var(--space-3);
    margin-left: calc(var(--space-2) * -1);
  }
</style>
