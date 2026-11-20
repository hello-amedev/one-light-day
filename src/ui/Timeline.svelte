<script lang="ts">
  // 下端の時間軸。物差しの目盛り(1 年ごとに短い刻み・10 年ごとに長い刻み)、名場面の金の刻み、つまみ。
  import { etFromUtcMs, utcMsFromEt } from '../lib/ephemeris/time';
  import { formatDate } from '../lib/format';
  import { t } from '../lib/i18n';
  import { SCENES } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import Chevron from './Chevron.svelte';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  let { store }: { store: AppStore } = $props();
  const txt = t().timeline;
  const sceneNames = t().scenes;
  const view = watchStore(store);

  const span = store.maxEt - store.minEt;
  const frac = (et: number): number => Math.min(1, Math.max(0, (et - store.minEt) / span));

  // 年の刻み。範囲の中にある 1 月 1 日だけ
  const years: { frac: number; decade: boolean; year: number }[] = [];
  {
    const first = new Date(utcMsFromEt(store.minEt)).getUTCFullYear() + 1;
    const last = new Date(utcMsFromEt(store.maxEt)).getUTCFullYear();
    for (let y = first; y <= last; y++) {
      const et = etFromUtcMs(Date.UTC(y, 0, 1));
      if (et <= store.minEt || et >= store.maxEt) continue;
      years.push({ frac: frac(et), decade: y % 10 === 0, year: y });
    }
  }

  let track: HTMLElement;
  let dragging = $state(false);

  function etAt(clientX: number): number {
    const r = track.getBoundingClientRect();
    return store.minEt + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span;
  }

  /** 押した位置。ほとんど動かさずに離したら「押しただけ」とみなす */
  let downX = 0;
  let moved = false;
  /** 押しただけの時に、名場面の刻みとみなす近さ(px) */
  const SCENE_SNAP_PX = 10;

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    track.setPointerCapture(e.pointerId);
    dragging = true;
    downX = e.clientX;
    moved = false;
    // 動かしている間は再生を止める(再生に引っ張られて指から離れない)
    store.pause();
    store.setTime(etAt(e.clientX));
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    if (Math.abs(e.clientX - downX) > 4) moved = true;
    store.setTime(etAt(e.clientX));
  }
  function up(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    if (moved || e.type !== 'pointerup') return;
    // 名場面の刻みは、つまみと重なってもつまみをつかめるよう、ポインタでは直接押せないようにしてある。
    // 動かさずに離した位置が刻みの近くなら、その名場面へ移る
    const r = track.getBoundingClientRect();
    let best: (typeof SCENES)[number] | null = null;
    let bestPx = SCENE_SNAP_PX;
    for (const s of SCENES) {
      if (s.et > store.maxEt) continue;
      const px = Math.abs(r.left + frac(s.et) * r.width - e.clientX);
      if (px <= bestPx) {
        best = s;
        bestPx = px;
      }
    }
    if (best) store.jumpScene(best.id);
  }
  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') store.stepTime(-86400);
    else if (e.key === 'ArrowRight') store.stepTime(86400);
    else return;
    e.preventDefault();
  }
</script>

<div class="timeline">
  <UiButton label={txt.prevScene} onclick={() => store.prevScene()}><Chevron direction="left" bar /></UiButton>

  <div class="body">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="track"
      class:dragging
      bind:this={track}
      role="slider"
      tabindex="0"
      aria-label={txt.axis}
      aria-valuemin={store.minEt}
      aria-valuemax={store.maxEt}
      aria-valuenow={view.state.et}
      aria-valuetext={formatDate(view.state.et)}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      onkeydown={key}
    >
      <div class="rule"></div>
      {#each years as y (y.year)}
        <div class="tick" class:decade={y.decade} style:left="{y.frac * 100}%">
          {#if y.decade}<span class="year">{y.year}</span>{/if}
        </div>
      {/each}
      <div class="thumb" style:left="{frac(view.state.et) * 100}%"></div>
    </div>

    <!-- 名場面の刻み。ポインタの操作は下の時間軸が受ける(つまみと重なってもつかめるように)。キーボードではこのボタンで移れる -->
    <div class="scenes">
      {#each SCENES as s (s.id)}
        <button
          type="button"
          class="scene"
          style:left="{frac(s.et) * 100}%"
          aria-label={sceneNames[s.id]}
          title={sceneNames[s.id]}
          onclick={() => store.jumpScene(s.id)}
        >
          <span class="mark"></span>
        </button>
      {/each}
    </div>
  </div>

  <UiButton label={txt.nextScene} onclick={() => store.nextScene()}><Chevron direction="right" bar /></UiButton>
</div>

<style>
  .timeline {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }
  .body {
    position: relative;
    flex: 1;
    min-width: 0;
    height: var(--hit-min);
    /* つまみと端の刻みが切れない余白 */
    margin: 0 var(--space-2);
  }
  .track {
    pointer-events: auto;
    position: absolute;
    inset: 0;
    cursor: pointer;
    touch-action: none;
    outline: none;
  }
  .track::before {
    /* 両端(打ち上げの日と今日)にあるつまみも、外側からつかめるようにする。位置の計算は .track の箱のまま */
    content: '';
    position: absolute;
    inset: 0 -12px;
  }
  .track:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: 2px;
  }
  .rule {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 14px;
    border-top: var(--line-thin) solid var(--color-text-dim);
    opacity: 0.6;
  }
  .tick {
    position: absolute;
    bottom: 14px;
    width: 0;
    height: 5px;
    border-left: var(--line-thin) solid var(--color-text-dim);
    opacity: 0.7;
  }
  .tick.decade {
    height: 11px;
    opacity: 1;
  }
  .year {
    position: absolute;
    top: 100%;
    left: 0;
    transform: translateX(-50%);
    margin-top: 2px;
    font-family: var(--font-numeric);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-xs);
    color: var(--color-text-dim);
    text-shadow: var(--text-halo);
  }
  .thumb {
    position: absolute;
    bottom: 8px;
    top: 6px;
    width: 0;
    border-left: var(--line-medium) solid var(--color-gold);
    transform: translateX(-1px);
    pointer-events: none;
  }
  .thumb::before {
    /* つまみの頭。つかめる所だと分かるように小さな四角 */
    content: '';
    position: absolute;
    top: -2px;
    left: -4px;
    width: 6px;
    height: 6px;
    background: var(--color-gold);
    transform: rotate(45deg);
  }
  .scenes {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .scene {
    pointer-events: none;
    position: absolute;
    top: 0;
    bottom: 0;
    width: 20px;
    margin-left: -10px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }
  .mark {
    position: absolute;
    left: 50%;
    bottom: 14px;
    height: 18px;
    border-left: var(--line-medium) solid var(--color-gold);
    transform: translateX(-1px);
    transition: height var(--dur-s) var(--ease-out);
  }
  .scene:hover .mark,
  .scene:focus-visible .mark {
    height: 24px;
  }
  .scene:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
  }
  @media (prefers-reduced-motion: reduce) {
    .mark {
      transition: none;
    }
  }
</style>
