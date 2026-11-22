<script lang="ts">
  // 再生のまとまり(薄い地と細い枠の箱 1 つ)。再生 / 停止、速さ(押すと候補が上に開き、選ぶと閉じる)、送り(‹ ›)。
  // スマホの縦画面は右下に小さく置くため、箱には再生と速さだけを入れ、送りは速さの一覧の下に入れる(一覧を開いた時だけ出る)。
  import { onMount } from 'svelte';
  import { t } from '../lib/i18n';
  import type { AppStore, RateId } from '../lib/store';
  import Chevron from './Chevron.svelte';
  import { RATE_ORDER, stepSeconds, stepUnit } from './controls';
  import Icon from './Icon.svelte';
  import { popover } from './popover';
  import StepDial from './StepDial.svelte';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    /** 速さの一覧を開いている間 true(操作しない間に薄くならないよう、層が知る) */
    rateOpen?: boolean;
  }
  let { store, rateOpen = $bindable(false) }: Props = $props();
  const txt = t().hud;
  const view = watchStore(store);
  const playText = $derived(view.state.playing ? txt.pause : txt.play);
  const unit = $derived(stepUnit(view.state.rate));
  const backLabel = $derived(unit === 'hour' ? txt.stepBackHour : txt.stepBackDay);
  const forwardLabel = $derived(unit === 'hour' ? txt.stepForwardHour : txt.stepForwardDay);

  /** スマホの縦画面か(UiLayer の並べ替えと同じ条件) */
  const PHONE = '(max-width: 640px) and (orientation: portrait)';
  let phone = $state(typeof matchMedia === 'function' && matchMedia(PHONE).matches);
  onMount(() => {
    if (typeof matchMedia !== 'function') return;
    const q = matchMedia(PHONE);
    const change = () => (phone = q.matches);
    q.addEventListener('change', change);
    return () => q.removeEventListener('change', change);
  });

  function chooseRate(rate: RateId) {
    rateOpen = false;
    store.setRate(rate);
  }
  function step(direction: -1 | 1) {
    store.stepTime(direction * stepSeconds(view.state.rate));
  }
</script>

<div class="play ui-group" role="group" aria-label={txt.playGroup}>
  <UiButton icon label={playText} tip={playText} tipPlace="above" tipAlign="start" onclick={() => store.toggle()}>
    <Icon name={view.state.playing ? 'pause' : 'play'} />
  </UiButton>
  <span class="ui-group-sep"></span>
  <div class="rate">
    <UiButton
      label={txt.rateButton(txt.rates[view.state.rate])}
      tip={txt.rateName}
      tipPlace="above"
      expanded={rateOpen}
      haspopup="menu"
      onclick={() => (rateOpen = !rateOpen)}
    >
      <span class="rate-text">{txt.rates[view.state.rate]}</span>
      <Chevron direction="up" />
    </UiButton>
    {#if rateOpen}
      <div class="ui-menu list" role="menu" aria-label={txt.rateName} use:popover={() => (rateOpen = false)}>
        {#if phone}<div class="ui-menu-heading">{txt.rateName}</div>{/if}
        {#each RATE_ORDER as rate (rate)}
          <button
            type="button"
            class="ui-menu-item"
            role="menuitemradio"
            aria-checked={view.state.rate === rate}
            onclick={() => chooseRate(rate)}
          >
            {txt.rates[rate]}
          </button>
        {/each}
        {#if phone}
          <!-- 送りは続けて押せるよう、押しても閉じない -->
          <div class="steps">
            <button type="button" class="ui-menu-item" role="menuitem" onclick={() => step(-1)}>
              <Chevron direction="left" /><span>{backLabel}</span>
            </button>
            <button type="button" class="ui-menu-item" role="menuitem" onclick={() => step(1)}>
              <span>{forwardLabel}</span><Chevron direction="right" />
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  {#if !phone}
    <span class="ui-group-sep"></span>
    <StepDial {backLabel} {forwardLabel} onstep={step} />
  {/if}
</div>

<style>
  .play {
    display: flex;
  }
  /* 中の要素を縦の中央にそろえる。ボタンの下の選択中の線の分(透明の 2px)を外し、字の行の高さを詰める */
  .play :global(.ui-button) {
    border-bottom: 0;
    line-height: 1;
  }
  .play :global(svg) {
    display: block;
  }
  .rate {
    position: relative;
    display: flex;
  }
  .rate :global(.ui-button) {
    gap: var(--space-2);
  }
  /* 速さの文字が変わってもボタンの幅が動かない(最長は「1秒＝1か月」) */
  .rate-text {
    display: inline-block;
    min-width: 5.5em;
    text-align: left;
  }
  /* 速さの一覧は、ボタンの上に開く(下は画面の端) */
  .list {
    left: 0;
    bottom: calc(100% + var(--space-2));
    min-width: 100%;
  }
  .steps {
    display: flex;
    margin-top: var(--space-1);
    border-top: var(--line-thin) solid var(--color-rule);
    padding-top: var(--space-1);
  }
  .steps .ui-menu-item {
    flex: 1;
    justify-content: center;
    gap: var(--space-1);
    padding: 0 var(--space-2);
  }
  .steps :global(svg) {
    display: block;
  }

  /* マウスの端末: 低く、細かく。ボタンの高さを詰め、アイコンを小さくする */
  @media (pointer: fine) {
    .play :global(.ui-button) {
      min-height: 30px;
      min-width: 30px;
      padding: 0 var(--space-2);
    }
    .play :global(.ui-button.icon) {
      width: 32px;
      padding: 0;
    }
    .play :global(.icon) {
      width: 16px;
      height: 16px;
    }
    .play :global(.icon *) {
      vector-effect: non-scaling-stroke;
    }
    .play :global(.ui-group-sep) {
      margin: 7px 0;
    }
  }
  /* スマホの縦画面: 右下に小さく置く。箱とアイコンを小さくし、一覧の行も詰める。一覧は右の端にそろえて開く */
  @media (max-width: 640px) and (orientation: portrait) {
    .play :global(.ui-button) {
      min-height: 36px;
      min-width: 38px;
    }
    .play :global(.icon) {
      width: 18px;
      height: 18px;
    }
    .play :global(.icon *) {
      vector-effect: non-scaling-stroke;
    }
    .play :global(.ui-group-sep) {
      margin: 9px 0;
    }
    .list {
      left: auto;
      right: calc(-1 * var(--line-thin));
      min-width: 13em;
    }
    .list .ui-menu-item {
      min-height: 34px;
    }
    .list .ui-menu-heading {
      padding-top: var(--space-2);
      padding-bottom: 6px;
    }
  }
</style>
