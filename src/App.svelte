<script lang="ts">
  // 画面の入口。位置と星のデータを読み込み、状態を作り、3D(canvas)とその上の操作の部品を重ねる。
  // 3D の表示(src/stage)が作れなかった時(WebGL が無いなど)は、操作の部品だけで動かす。
  import { onDestroy, onMount } from 'svelte';
  import { etNow, loadEphemeris, type Ephemeris } from './lib/ephemeris';
  import { t } from './lib/i18n';
  import { introMode } from './lib/intro';
  import { appendStars, loadStars, type StarCatalog } from './lib/stars';
  import { createStore, type AppStore } from './lib/store';
  import { applyUrlState } from './lib/urlState';
  import { createStage, type Stage } from './stage';
  import UiLayer from './ui/UiLayer.svelte';

  const com = t().common;

  let canvas: HTMLCanvasElement | undefined = $state();
  let overlay: HTMLDivElement | undefined = $state();

  let status = $state<'loading' | 'ready' | 'failed'>('loading');
  let store = $state.raw<AppStore | null>(null);
  let eph = $state.raw<Ephemeris | null>(null);
  let stage = $state.raw<Stage | null>(null);
  /** 操作しない間(UiLayer が知らせる)。目印の層と軌道の線を文字や目盛りと一緒に薄くする */
  let idle = $state(false);

  let frame = 0;
  let stopLoop: (() => void) | undefined;

  /** 3D が動いていない間に、再生を進める。3D があれば 3D が毎フレーム tick を呼ぶので使わない */
  function startFallbackLoop(s: AppStore) {
    let last = performance.now();
    const step = (now: number) => {
      s.tick((now - last) / 1000);
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    stopLoop = () => cancelAnimationFrame(frame);
  }

  onMount(async () => {
    const base = import.meta.env.BASE_URL;
    let loadedEph: Ephemeris;
    let loadedStars: StarCatalog;
    try {
      [loadedEph, loadedStars] = await Promise.all([
        loadEphemeris(base + 'data/eph/'),
        loadStars(base + 'data/stars/stars.bin'),
      ]);
    } catch (error) {
      if (!import.meta.env.DEV) {
        console.error(error);
        status = 'failed';
        return;
      }
      // 開発時だけ、データが無くても操作の部品を動かせるよう代用に切り替える。本番ビルドには入らない
      const mock = await import('./ui/dev/mockData');
      loadedEph = mock.createMockEphemeris();
      loadedStars = mock.createMockStars();
      console.warn('データを読み込めないため、代用のデータで動かします', error);
    }

    // 比較用: ?stars=deep で、8 等までの星(約 3 万個)を足す
    if (new URLSearchParams(location.search).get('stars') === 'deep') {
      try {
        loadedStars = appendStars(loadedStars, await loadStars(base + 'data/stars/stars-deep.bin'));
      } catch (error) {
        console.warn(error);
      }
    }

    const maxEt = Math.min(loadedEph.t1, etNow());
    const created = createStore({ minEt: loadedEph.t0, maxEt, initialEt: maxEt });
    eph = loadedEph;
    // 確認用の URL(?t= ?view= ?look=)を当てる。3D を作る前に済ませ、最初の 1 コマから反映する
    applyUrlState(created, location.search);
    // 開いた直後の自動再生。確認用の URL・?intro=0 では始めない。3D を作る前に済ませ、最初の 1 コマから引きの眺めにする
    const mode = introMode(
      location.search,
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    if (mode === 'play') created.startIntro();
    else if (mode === 'still') created.skipIntro();
    store = created;
    status = 'ready';

    // canvas と目印の層は status が ready になって描かれた後に取れる
    await Promise.resolve();
    requestAnimationFrame(() => {
      if (canvas && overlay) {
        try {
          stage = createStage({ canvas, overlay, eph: loadedEph, stars: loadedStars, store: created });
        } catch (error) {
          console.warn('3D の表示を始められないため、操作の部品だけで動かします', error);
        }
      }
      if (!stage) startFallbackLoop(created);
    });
  });

  $effect(() => {
    stage?.setChromeVisible(!idle);
  });

  onDestroy(() => {
    stopLoop?.();
    stage?.dispose();
  });
</script>

<main class="app">
  <!-- 重ね順: 3D の canvas → 目印の層(3D の担当が使う) → 操作の部品の層 -->
  <canvas class="stage" bind:this={canvas}></canvas>
  <div class="markers" class:idle bind:this={overlay}></div>

  {#if status === 'ready' && store && eph}
    <UiLayer
      {store}
      {eph}
      stats={stage ? () => stage!.stats() : undefined}
      onIdleChange={(v) => (idle = v)}
      watchBody={stage ? (b, l) => stage!.watchBody(b, l) : undefined}
    />
  {:else}
    <p class="message" role="status">{status === 'failed' ? com.loadFailed : com.loading}</p>
  {/if}
</main>

<style>
  .app {
    position: fixed;
    inset: 0;
    background: var(--color-space);
  }
  .stage {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .markers {
    position: absolute;
    inset: 0;
    /* 目印の層は 3D の担当が使う。星空の上の操作は下の canvas へ通す */
    pointer-events: none;
    overflow: hidden;
    transition: opacity var(--dur-l) var(--ease-in-out);
  }
  /* 操作の部品と同じ薄さ・同じ速さで薄くする */
  .markers.idle {
    opacity: var(--idle-opacity);
  }
  .message {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    padding: var(--space-3);
    text-align: center;
    color: var(--color-text-dim);
    font-size: var(--text-m);
    letter-spacing: 0.06em;
  }
</style>
