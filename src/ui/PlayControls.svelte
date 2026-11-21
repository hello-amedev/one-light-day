<script lang="ts">
  // 時間軸の左に置く操作。再生 / 停止、速さ(押すたびに 1時間 → 1日 → 1か月 → 1年)、送り(‹ ›)。
  import { t } from '../lib/i18n';
  import type { AppStore } from '../lib/store';
  import { nextRate, stepSeconds, stepUnit } from './controls';
  import Icon from './Icon.svelte';
  import StepDial from './StepDial.svelte';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  let { store }: { store: AppStore } = $props();
  const txt = t().hud;
  const view = watchStore(store);
  const playText = $derived(view.state.playing ? txt.pause : txt.play);
  const unit = $derived(stepUnit(view.state.rate));
</script>

<div class="play" role="group" aria-label={txt.playGroup}>
  <UiButton icon label={playText} tip={playText} tipPlace="above" tipAlign="start" onclick={() => store.toggle()}>
    <Icon name={view.state.playing ? 'pause' : 'play'} />
  </UiButton>
  <UiButton
    label={txt.rateButton(txt.rates[view.state.rate])}
    tip={txt.rateName}
    tipPlace="above"
    onclick={() => store.setRate(nextRate(view.state.rate))}
  >
    <span class="rate">{txt.rates[view.state.rate]}</span>
  </UiButton>
  <StepDial
    backLabel={unit === 'hour' ? txt.stepBackHour : txt.stepBackDay}
    forwardLabel={unit === 'hour' ? txt.stepForwardHour : txt.stepForwardDay}
    onstep={(d) => store.stepTime(d * stepSeconds(view.state.rate))}
  />
</div>

<style>
  .play {
    display: flex;
    align-items: center;
  }
  /* 速さの文字が変わってもボタンの幅が動かない(最長は「1秒＝1か月」) */
  .rate {
    display: inline-block;
    min-width: 6em;
    text-align: center;
  }
</style>
