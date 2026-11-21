<script lang="ts">
  // 操作の部品の層。四隅(スマホの縦画面は上と下)に部品を置き、操作しない間は薄くする。
  // 層全体は pointer-events: none で、部品だけが auto。星空の上の操作は 3D 側へ通る。
  import { onDestroy, onMount } from 'svelte';
  import type { Ephemeris } from '../lib/ephemeris';
  import { formatDistance, formatLightTime } from '../lib/format';
  import { SCENES } from '../lib/scenes';
  import { t } from '../lib/i18n';
  import type { AppStore } from '../lib/store';
  import type { BodyScreenPoint, StageStats } from '../stage';
  import AboutPanel from './AboutPanel.svelte';
  import IntroOverlay from './IntroOverlay.svelte';
  import LookMenu from './LookMenu.svelte';
  import MainMenu from './MainMenu.svelte';
  import PhotoWindow from './PhotoWindow.svelte';
  import PlayControls from './PlayControls.svelte';
  import DateJump from './DateJump.svelte';
  import Readout from './Readout.svelte';
  import ReadoutExtra from './ReadoutExtra.svelte';
  import SceneCaption from './SceneCaption.svelte';
  import Timeline from './Timeline.svelte';
  import ViewSwitch from './ViewSwitch.svelte';
  import { readoutExtra, starsOnlyHintKind, STARS_ONLY_HINT_MS } from './controls';
  import { watchStore } from './store.svelte';

  interface Props {
    store: AppStore;
    eph: Ephemeris;
    /** 3D の計測値(?debug の時だけ出す)。3D が無い時は渡さない */
    stats?: () => StageStats;
    /** 操作しない間に入った/戻った時に呼ぶ(目印の層と 3D の線を一緒に薄くするため) */
    onIdleChange?: (idle: boolean) => void;
    /** 天体の目印の画面の位置を 3D から受け取る口(写真の窓の線に使う)。3D が無い時は渡さない */
    watchBody?: (body: 'earth', listener: (p: BodyScreenPoint) => void) => () => void;
  }
  let { store, eph, stats, onIdleChange, watchBody }: Props = $props();

  const com = t().common;
  const txt = t().hud;
  const menuTxt = t().menu;
  const view = watchStore(store);

  // ── 「このサイトについて」 ──
  // 開いている間は再生を止める(後ろの 3D は板が受け止めるので操作は通らない)。閉じても再生は戻さない
  let aboutOpen = $state(false);
  function openAbout() {
    store.pause();
    aboutOpen = true;
  }

  // ── 一覧(メニュー・向く)。開いている間は薄くしない ──
  // 確認用に、?open=menu か ?open=look で一覧を開いた状態から、?open=stars で星空だけを表示から始められる(?debug と同じ作り)
  const openParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('open') : null;
  let menuOpen = $state(openParam === 'menu');
  let lookOpen = $state(openParam === 'look');
  onMount(() => {
    if (openParam === 'stars') store.setStarsOnly(true);
  });
  // ── 左上の題字: 開いた直後の状態に戻して、打ち上げから自動再生し直す(ページは読み込み直さない) ──
  function restart(e: MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // 新しいタブで開く操作はそのまま通す
    e.preventDefault();
    menuOpen = false;
    lookOpen = false;
    // 名場面や確認用の項目(?scene= など)をアドレスバーから外す
    history.replaceState(null, '', location.pathname);
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    store.restart(still);
  }

  /** 右上の日付を入力している間 */
  let dateEditing = $state(false);
  const popOpen = $derived(menuOpen || lookOpen || dateEditing);

  // ── 星空だけを表示 ──
  // 数字と操作をすべて隠す(戻るのは 3D 側の星空のタップ、または Esc)。入った時に戻し方を数秒だけ案内する
  const starsOnly = $derived(view.state.starsOnly);
  const hintKind = $derived(
    starsOnlyHintKind(typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches),
  );
  let hintShown = $state(false);
  $effect(() => {
    if (!starsOnly) {
      hintShown = false;
      return;
    }
    hintShown = true;
    const id = setTimeout(() => (hintShown = false), STARS_ONLY_HINT_MS);
    return () => clearTimeout(id);
  });
  function keydown(e: KeyboardEvent) {
    wake();
    if (e.key === 'Escape' && view.state.starsOnly) store.setStarsOnly(false);
  }

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

  // ── 開いた直後の自動再生 ──
  // 題字の間は部品を出さず、早回しの間は日付と距離だけ見せる。終わったら(または止めたら)部品を出し直す
  const intro = $derived(view.state.intro);
  const introActive = $derived(intro === 'title' || intro === 'run');
  let prevIntro = intro;
  $effect(() => {
    const cur = intro;
    if (cur !== prevIntro && (cur === 'done' || cur === 'off')) wake();
    prevIntro = cur;
  });
  /** 案内を出している間は、時間軸が薄くならないようにする */
  const dim = $derived(idle && !introActive && intro !== 'done' && !popOpen);
  $effect(() => {
    onIdleChange?.(dim || intro === 'title');
  });
  onDestroy(() => clearTimeout(timer));

  // ── 右下の数字 ──
  // 早回し(1 か月・1 年)の間は、地球からの距離が毎年行き来して読めないので、太陽からの距離に切り替える
  const sunMode = $derived(
    view.state.playing && (view.state.rate === 'month' || view.state.rate === 'year' || introActive),
  );
  const distKm = $derived(eph.distance('voyager1', sunMode ? 'sun' : 'earth', view.state.et));
  // 「地球から1光日」の前後 2 日だけ、光が届くまでの時間を秒まで出す(24時間0分0秒になる瞬間が見えるように)
  const lightDayEt = SCENES.find((sc) => sc.id === 'lightday')?.et ?? Infinity;
  const showLightSeconds = $derived(Math.abs(view.state.et - lightDayEt) <= 2 * 86400);

  const extra = $derived(readoutExtra(view.state.view, view.state.magnification, view.state.craftDistance));

  // ── ?debug ──
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
  let statsText = $state('');
  // stats は 3D が出来た後に渡るので、onMount ではなく effect で見る
  $effect(() => {
    if (!debug || !stats) return;
    const read = stats;
    const id = setInterval(() => {
      const s = read();
      statsText = `fps ${s.fps}  frames ${s.frames}  ${s.idle ? 'idle' : 'active'}`;
    }, 500);
    return () => clearInterval(id);
  });
</script>

<svelte:window
  onpointermove={wake}
  onpointerdown={wake}
  ontouchstart={wake}
  onkeydown={keydown}
  onwheel={wake}
/>

<div
  class="ui"
  class:idle={dim}
  class:intro-title={intro === 'title'}
  class:intro-run={intro === 'run'}
  class:stars-only={starsOnly}
>
  <header class="brand">
    <h1 class="title">
      <a href={import.meta.env.BASE_URL} class="home" title={com.restart} onclick={restart}>{com.title}</a>
    </h1>
    <ViewSwitch {store} />
  </header>

  <div class="top">
    <div class="date">
      <DateJump {store} bind:editing={dateEditing} />
    </div>
    <div class="menu">
      <MainMenu {store} onabout={openAbout} bind:open={menuOpen} />
    </div>
  </div>

  {#if view.state.view !== 'craft'}
    <div class="look">
      <LookMenu {store} {eph} bind:open={lookOpen} />
    </div>
  {/if}

  <div class="readout-area">
    <ReadoutExtra extra={extra} />
    <Readout
      rowOnPhone
      label={sunMode ? txt.fromSun : txt.fromEarth}
      value={formatDistance(distKm)}
      sub={sunMode ? undefined : formatLightTime(distKm, showLightSeconds)}
      earth={!sunMode}
    />
  </div>

  <div class="bottom">
    <div class="transport">
      <PlayControls {store} />
    </div>
    <div class="timeline">
      <Timeline {store} />
    </div>
  </div>

  {#if debug && stats}
    <div class="debug">{statsText}</div>
  {/if}
</div>

<!-- 見せたい中身なので、操作しない間に薄くなる層(.ui)の外に置く。星空だけを表示の間は隠す -->
<div class="photo-layer" class:hidden={starsOnly}>
  <PhotoWindow {store} {watchBody} />
</div>
<SceneCaption {store} {eph} />
<IntroOverlay {store} />
{#if aboutOpen}
  <AboutPanel onclose={() => (aboutOpen = false)} />
{/if}
{#if hintShown}
  <div class="hint" role="status">{hintKind === 'tap' ? menuTxt.starsOnlyHintTap : menuTxt.starsOnlyHintClick}</div>
{/if}

<style>
  .ui {
    position: fixed;
    inset: 0;
    pointer-events: none;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto 1fr auto auto;
    grid-template-areas:
      'brand top'
      '. .'
      'look readout'
      'bottom bottom';
    row-gap: var(--space-2);
    padding: calc(var(--safe-top) + var(--space-3)) calc(var(--safe-right) + var(--space-3))
      calc(var(--safe-bottom) + var(--space-2)) calc(var(--safe-left) + var(--space-3));
    font-family: var(--font-body);
    transition:
      opacity var(--dur-l) var(--ease-in-out),
      visibility 0s linear 0s;
  }
  /* 計器盤のあしらい: 左上と右下に細い金の括弧。押す操作は素通しにする */
  .ui::before,
  .ui::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border: var(--line-thin) solid var(--color-gold);
    opacity: 0.75;
    pointer-events: none;
  }
  .ui::before {
    top: calc(var(--safe-top) + 6px);
    left: calc(var(--safe-left) + 6px);
    border-right: 0;
    border-bottom: 0;
  }
  .ui::after {
    bottom: calc(var(--safe-bottom) + 6px);
    right: calc(var(--safe-right) + 6px);
    border-left: 0;
    border-top: 0;
  }
  /* 完全には消さず、押す範囲も生かしたまま薄くする */
  .ui.idle {
    opacity: var(--idle-opacity);
  }
  /* 自動再生: 題字の間は全部、早回しの間は日付と距離以外を薄くしておく */
  .ui.intro-title {
    opacity: 0;
  }
  /* 星空だけを表示: 全部隠す。隠す時は薄れてから外し、戻る時はすぐ出して、ふっと現れる */
  .ui.stars-only {
    opacity: 0;
    visibility: hidden;
    transition:
      opacity var(--dur-l) var(--ease-in-out),
      visibility 0s linear var(--dur-l);
  }
  .photo-layer.hidden {
    visibility: hidden;
  }
  .brand,
  .look,
  .transport,
  .timeline,
  .menu {
    transition: opacity var(--dur-l) var(--ease-in-out);
  }
  .ui.intro-run .brand,
  .ui.intro-run .look,
  .ui.intro-run .transport,
  .ui.intro-run .timeline,
  .ui.intro-run .menu {
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
    font-size: var(--title-size, var(--text-l));
    font-weight: var(--title-weight, 600);
    letter-spacing: var(--title-tracking, 0.22em);
    color: var(--color-text);
    text-shadow: var(--text-halo);
    /* 題字は 1 行のまま(スマホの縦画面で右上のメニューのアイコンが増え、幅が足りず折れていた) */
    white-space: nowrap;
  }
  .home {
    color: inherit;
    text-decoration: none;
    pointer-events: auto;
  }
  .home:hover {
    color: var(--color-gold);
  }
  .home:focus-visible {
    outline: var(--line-thin) solid var(--color-gold);
    outline-offset: var(--space-1);
  }
  /* 右上: 日付と、その右のメニューのアイコン */
  .top {
    grid-area: top;
    justify-self: end;
    display: flex;
    align-items: flex-start;
  }
  .date {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  /* アイコンの余白ぶん、右の端へ寄せる */
  .menu {
    margin-right: calc(var(--space-2) * -1);
  }
  .look {
    grid-area: look;
    align-self: end;
    justify-self: start;
  }
  .readout-area {
    grid-area: readout;
    align-self: end;
    justify-self: end;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    min-width: 0;
  }
  /* 時間軸の左に、再生・速さ・送り */
  .bottom {
    grid-area: bottom;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .transport {
    flex: none;
    margin-left: calc(var(--space-2) * -1);
  }
  .timeline {
    flex: 1;
    min-width: 0;
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

  /* 星空だけを表示に入った時の案内。数秒でゆっくり消える */
  .hint {
    position: fixed;
    left: 50%;
    bottom: calc(var(--safe-bottom) + 18%);
    transform: translateX(-50%);
    max-width: calc(100vw - var(--space-4) * 2);
    text-align: center;
    font-family: var(--font-body);
    font-size: var(--text-m);
    letter-spacing: var(--body-tracking);
    color: var(--color-text);
    text-shadow: var(--text-halo);
    pointer-events: none;
    animation: hint-fade 4s var(--ease-in-out) both;
  }
  @keyframes hint-fade {
    0% {
      opacity: 0;
    }
    10%,
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  /* スマホの縦画面: 題字と日付は上、数字・操作・時間軸は親指が届く下側に集める。
     向くと、再生・速さ・送りは 1 行に並べ、時間軸はその下の全幅にする */
  @media (max-width: 640px) and (orientation: portrait) {
    /* 幅の狭い画面では、題字の字の間を詰めて右上の日付と離す */
    .title {
      letter-spacing: 0.12em;
    }
    .ui {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto 1fr auto auto auto;
      grid-template-areas:
        'brand top'
        '. .'
        'readout readout'
        'look transport'
        'timeline timeline';
    }
    .bottom {
      display: contents;
    }
    .transport {
      grid-area: transport;
      margin-left: 0;
      margin-right: calc(var(--space-2) * -1);
    }
    .timeline {
      grid-area: timeline;
    }
    .readout-area {
      justify-self: stretch;
      gap: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ui,
    .brand,
    .look,
    .transport,
    .timeline,
    .menu {
      transition: none;
    }
    .hint {
      animation: none;
    }
  }
</style>
