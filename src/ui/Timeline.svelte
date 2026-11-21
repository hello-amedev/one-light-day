<script lang="ts">
  // 下端の時間軸。物差しの目盛り(1 年ごとに短い刻み・10 年ごとに長い刻み)、名場面の金の刻み、単独の出来事の小さな刻み、つまみ。
  // PC は刻みを指すと太くなり名前と日付の吹き出しが出る。スマホはつまみが刻みへ近づくと少し吸い付き、離すとその刻みへ移る。
  import { etFromIso, etFromUtcMs, utcMsFromEt } from '../lib/ephemeris/time';
  import { STANDALONE_EVENTS, type EventId } from '../lib/events';
  import { formatDate, formatEventDate } from '../lib/format';
  import { t } from '../lib/i18n';
  import { SCENES, type SceneId } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import Chevron from './Chevron.svelte';
  import { bubbleAnchor, HOVER_RADIUS, nearestMark, snapPull, type TimelineMark } from './timelineSnap';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  let { store }: { store: AppStore } = $props();
  const txt = t().timeline;
  const sceneNames = t().scenes;
  const eventNames = t().events.names;
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

  // 名場面の刻みと、単独の出来事の刻み(範囲の中にあるものだけ)
  const sceneMarks = SCENES.filter((s) => s.et >= store.minEt && s.et <= store.maxEt);
  const eventMarks = STANDALONE_EVENTS.filter((e) => e.et >= store.minEt && e.et <= store.maxEt);

  interface Active {
    kind: 'scene' | 'event';
    id: string;
    frac: number;
    name: string;
    date: string;
  }
  function sceneActive(id: SceneId): Active {
    const s = SCENES.find((x) => x.id === id)!;
    return { kind: 'scene', id, frac: frac(s.et), name: sceneNames[id], date: formatDate(s.et) };
  }
  function eventActive(id: EventId): Active {
    const e = STANDALONE_EVENTS.find((x) => x.id === id)!;
    const date = formatEventDate({ et: e.et, precision: e.precision, endEt: e.endUtc ? etFromIso(e.endUtc) : undefined });
    return { kind: 'event', id, frac: frac(e.et), name: eventNames[id], date };
  }
  const activeOf = (m: TimelineMark): Active => (m.kind === 'scene' ? sceneActive(m.id as SceneId) : eventActive(m.id as EventId));

  function jump(kind: 'scene' | 'event', id: string) {
    if (kind === 'scene') store.jumpScene(id as SceneId);
    else store.jumpEvent(id as EventId);
  }

  /** 指した・吸い付いた刻み(吹き出しを出す)。キーボードで選んだ刻みは focused */
  let pointed = $state<Active | null>(null);
  let focused = $state<Active | null>(null);
  const bubble = $derived(pointed ?? focused);
  const isActive = (kind: string, id: string): boolean => bubble?.kind === kind && bubble.id === id;

  let track: HTMLElement;
  let dragging = $state(false);

  function etAt(clientX: number): number {
    const r = track.getBoundingClientRect();
    return store.minEt + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span;
  }

  /** 刻みの位置(画面の左端からの px)。つまみ・カーソルの clientX と同じ基準 */
  function pxMarks(): TimelineMark[] {
    const r = track.getBoundingClientRect();
    return [
      ...sceneMarks.map((s): TimelineMark => ({ kind: 'scene', id: s.id, px: r.left + frac(s.et) * r.width })),
      ...eventMarks.map((e): TimelineMark => ({ kind: 'event', id: e.id, px: r.left + frac(e.et) * r.width })),
    ];
  }

  /** 指(粗いポインタ)の端末か。つまみの吸い付きは指の時だけ */
  function isCoarse(): boolean {
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }

  /** 押した位置。ほとんど動かさずに離したら「押しただけ」とみなす */
  let downX = 0;
  let moved = false;
  let coarse = false;
  /** 指で動かしている間に、つまみが吸い付いている刻み */
  let snapped: TimelineMark | null = null;

  function follow(clientX: number) {
    if (!coarse) {
      store.setTime(etAt(clientX));
      return;
    }
    const r = snapPull(clientX, pxMarks());
    if (r.mark?.id !== snapped?.id || r.mark?.kind !== snapped?.kind) {
      // 吸い付いた瞬間に、対応する端末なら軽く振るわせる
      if (r.mark) {
        try {
          navigator.vibrate?.(8);
        } catch {
          // 振るわせられなくてもよい
        }
      }
    }
    snapped = r.mark;
    pointed = r.mark ? activeOf(r.mark) : null;
    store.setTime(etAt(r.px));
  }

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    track.setPointerCapture(e.pointerId);
    dragging = true;
    downX = e.clientX;
    moved = false;
    coarse = isCoarse();
    snapped = null;
    // 動かしている間は再生を止める(再生に引っ張られて指から離れない)
    store.pause();
    follow(e.clientX);
  }
  function move(e: PointerEvent) {
    if (!dragging) {
      // カーソルが刻みの上にある時だけ、その刻みを太くして吹き出しを出す(指には「指している」状態が無い)
      if (e.pointerType === 'touch') return;
      const m = nearestMark(e.clientX, pxMarks(), HOVER_RADIUS);
      if (!m) pointed = null;
      else if (!(pointed?.kind === m.kind && pointed.id === m.id)) pointed = activeOf(m);
      return;
    }
    if (Math.abs(e.clientX - downX) > 4) moved = true;
    follow(e.clientX);
  }
  function up(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const landed = snapped;
    snapped = null;
    if (coarse) pointed = null;
    if (e.type !== 'pointerup') return;
    if (coarse) {
      // 離した時に吸い付いていた刻みへ移る
      if (landed) jump(landed.kind, landed.id);
      return;
    }
    if (moved) return;
    // 名場面の刻みは、つまみと重なってもつまみをつかめるよう、ポインタでは直接押せないようにしてある。
    // 動かさずに離した位置が刻みの近くなら、その刻みへ移る
    const m = nearestMark(e.clientX, pxMarks(), HOVER_RADIUS);
    if (m) jump(m.kind, m.id);
  }
  function leave() {
    if (!dragging) pointed = null;
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
      onpointerleave={leave}
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

    <!-- 刻み。ポインタの操作は下の時間軸が受ける(つまみと重なってもつかめるように)。キーボードではこのボタンで移れる -->
    <div class="scenes">
      {#each eventMarks as e (e.id)}
        <button
          type="button"
          class="scene event"
          class:active={isActive('event', e.id)}
          style:left="{frac(e.et) * 100}%"
          aria-label={eventNames[e.id]}
          onclick={() => store.jumpEvent(e.id)}
          onfocus={() => (focused = eventActive(e.id))}
          onblur={() => (focused = null)}
        >
          <span class="mark"></span>
        </button>
      {/each}
      {#each sceneMarks as s (s.id)}
        <button
          type="button"
          class="scene"
          class:active={isActive('scene', s.id)}
          style:left="{frac(s.et) * 100}%"
          aria-label={sceneNames[s.id]}
          onclick={() => store.jumpScene(s.id)}
          onfocus={() => (focused = sceneActive(s.id))}
          onblur={() => (focused = null)}
        >
          <span class="mark"></span>
        </button>
      {/each}
    </div>

    {#if bubble}
      <div class="bubble" class:event={bubble.kind === 'event'} style:--a={bubbleAnchor(bubble.frac)} aria-hidden="true">
        <div class="bubble-name">{bubble.name}</div>
        <div class="bubble-date">{bubble.date}</div>
      </div>
    {/if}
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
    transition:
      height var(--dur-s) var(--ease-out),
      border-left-width var(--dur-s) var(--ease-out);
  }
  .scene.active .mark {
    height: 28px;
    border-left-width: 4px;
    transform: translateX(-2px);
  }
  /* 単独の出来事の刻み。名場面より短く細く、色も控えめ */
  .event .mark {
    height: 11px;
    border-left: var(--line-thin) solid var(--color-gold);
    opacity: 0.75;
  }
  .event .mark::before {
    content: '';
    position: absolute;
    top: -3px;
    left: -2px;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--color-gold);
  }
  .event.active .mark {
    height: 18px;
    border-left-width: var(--line-medium);
    transform: translateX(-1px);
    opacity: 1;
  }
  .bubble {
    position: absolute;
    bottom: calc(100% + 2px);
    left: calc(var(--a) * 100%);
    transform: translateX(calc(var(--a) * -100%));
    padding: var(--space-1) var(--space-2);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    white-space: nowrap;
    background: var(--panel-bg);
    border: var(--line-thin) solid var(--color-gold);
    pointer-events: none;
    animation: bubble-in var(--dur-s) var(--ease-out);
  }
  .bubble.event {
    border-color: var(--color-rule);
  }
  .bubble::after {
    /* 刻みを指す小さな三角 */
    content: '';
    position: absolute;
    top: 100%;
    left: clamp(8px, calc(var(--a) * 100%), calc(100% - 8px));
    margin-left: -4px;
    border: 4px solid transparent;
    border-top-color: var(--color-gold);
  }
  .bubble.event::after {
    border-top-color: var(--color-rule);
  }
  .bubble-name {
    font-family: var(--font-body);
    font-size: var(--text-s);
    letter-spacing: var(--body-tracking);
    color: var(--color-text);
  }
  .bubble-date {
    font-family: var(--font-numeric);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-xs);
    color: var(--color-text-dim);
  }
  @keyframes bubble-in {
    from {
      opacity: 0;
    }
  }
  .scene:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
  }
  @media (prefers-reduced-motion: reduce) {
    .mark {
      transition: none;
    }
    .bubble {
      animation: none;
    }
  }
</style>
