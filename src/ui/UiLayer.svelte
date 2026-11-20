<script lang="ts">
  // 操作の部品の層。四隅(スマホの縦画面は上と下)に部品を置き、操作しない間は薄くする。
  // 層全体は pointer-events: none で、部品だけが auto。星空の上の操作は 3D 側へ通る。
  import { onDestroy, onMount } from 'svelte';
  import type { Ephemeris } from '../lib/ephemeris';
  import { formatDate, formatDistance, formatLightTime, formatSinceLaunch } from '../lib/format';
  import { t } from '../lib/i18n';
  import type { AppStore } from '../lib/store';
  import type { StageStats } from '../stage';
  import LookButtons from './LookButtons.svelte';
  import PlayControls from './PlayControls.svelte';
  import Readout from './Readout.svelte';
  import Timeline from './Timeline.svelte';
  import ViewSwitch from './ViewSwitch.svelte';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    eph: Ephemeris;
    /** 3D の計測値(?debug の時だけ出す)。3D が無い時は渡さない */
    stats?: () => StageStats;
  }
  let { store, eph, stats }: Props = $props();

  const com = t().common;
  const txt = t().hud;
  const view = watchStore(store);

  // ── 操作しない間は薄くする ──
  const IDLE_MS = 4000;
  let idle = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  function wake() {
    idle = false;
    clearTimeout(timer);
    timer = setTimeout(() => (idle = true), IDLE_MS);
  }
  onMount(wake);
  onDestroy(() => clearTimeout(timer));

  // ── 右下の数字 ──
  // 早回し(1 か月・1 年)の間は、地球からの距離が毎年行き来して読めないので、太陽からの距離に切り替える
  const sunMode = $derived(view.state.playing && (view.state.rate === 'month' || view.state.rate === 'year'));
  const distKm = $derived(eph.distance('voyager1', sunMode ? 'sun' : 'earth', view.state.et));

  // ── ?debug ──
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
  let statsText = $state('');
  onMount(() => {
    if (!debug || !stats) return;
    const id = setInterval(() => {
      const s = stats();
      statsText = `fps ${s.fps}  frames ${s.frames}  ${s.idle ? 'idle' : 'active'}`;
    }, 500);
    return () => clearInterval(id);
  });
</script>

<svelte:window
  onpointermove={wake}
  onpointerdown={wake}
  ontouchstart={wake}
  onkeydown={wake}
  onwheel={wake}
/>

<div class="ui" class:idle>
  <header class="brand">
    <h1 class="title">{com.title}</h1>
    <ViewSwitch {store} />
  </header>

  <div class="date">
    <Readout value={formatDate(view.state.et)} sub={formatSinceLaunch(view.state.et)} />
  </div>

  <div class="readout-area">
    <Readout
      rowOnPhone
      label={sunMode ? txt.fromSun : txt.fromEarth}
      value={formatDistance(distKm)}
      sub={sunMode ? undefined : formatLightTime(distKm)}
      earth={!sunMode}
    />
  </div>

  <div class="controls">
    <LookButtons {store} {eph} />
    <PlayControls {store} />
  </div>

  <div class="timeline">
    <Timeline {store} />
  </div>

  {#if debug && stats}
    <div class="debug">{statsText}</div>
  {/if}
</div>

<style>
  .ui {
    position: fixed;
    inset: 0;
    pointer-events: none;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto 1fr auto auto;
    grid-template-areas:
      'brand date'
      '. .'
      'controls readout'
      'timeline timeline';
    row-gap: var(--space-2);
    padding: calc(var(--safe-top) + var(--space-3)) calc(var(--safe-right) + var(--space-3))
      calc(var(--safe-bottom) + var(--space-2)) calc(var(--safe-left) + var(--space-3));
    font-family: var(--font-body);
    transition: opacity var(--dur-l) var(--ease-in-out);
  }
  /* 完全には消さず、押す範囲も生かしたまま薄くする */
  .ui.idle {
    opacity: var(--idle-opacity);
  }
  .brand {
    grid-area: brand;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }
  .title {
    margin: 0;
    font-family: var(--font-title);
    font-size: var(--text-l);
    font-weight: 600;
    letter-spacing: 0.22em;
    color: var(--color-text);
    text-shadow: var(--text-halo);
  }
  .date {
    grid-area: date;
    justify-self: end;
  }
  .readout-area {
    grid-area: readout;
    align-self: end;
    justify-self: end;
  }
  .controls {
    grid-area: controls;
    align-self: end;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .timeline {
    grid-area: timeline;
  }
  .debug {
    position: absolute;
    left: calc(var(--safe-left) + var(--space-3));
    top: calc(var(--safe-top) + 6rem);
    font-family: var(--font-numeric);
    font-size: var(--text-xs);
    color: var(--color-text-dim);
    text-shadow: var(--text-halo);
  }

  /* スマホの縦画面: 題字と日付は上、数字・ボタン・時間軸は親指が届く下側に集める */
  @media (max-width: 640px) and (orientation: portrait) {
    .ui {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto 1fr auto auto auto;
      grid-template-areas:
        'brand date'
        '. .'
        'readout readout'
        'controls controls'
        'timeline timeline';
    }
    .readout-area {
      justify-self: stretch;
    }
    .controls {
      align-self: stretch;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ui {
      transition: none;
    }
  }
</style>
