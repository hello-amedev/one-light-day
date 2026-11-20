<script lang="ts">
  // 画面の入口。位置と星のデータを読み込み、状態を作り、3D(canvas)とその上の操作の部品を重ねる。
  // 3D の表示は別の担当が作る。まだ差し込み口(例外を投げる)なので、握って操作の部品だけで動かす。
  import { onDestroy, onMount } from 'svelte';
  import { etNow, loadEphemeris, type Ephemeris } from './lib/ephemeris';
  import { t } from './lib/i18n';
  import { loadStars, type StarCatalog } from './lib/stars';
  import { createStore, type AppStore } from './lib/store';
  import { createStage, type Stage } from './stage';
  import UiLayer from './ui/UiLayer.svelte';

  const com = t().common;

  let canvas: HTMLCanvasElement | undefined = $state();
  let overlay: HTMLDivElement | undefined = $state();

  let status = $state<'loading' | 'ready' | 'failed'>('loading');
  let store = $state.raw<AppStore | null>(null);
  let eph = $state.raw<Ephemeris | null>(null);
  let stage = $state.raw<Stage | null>(null);

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

    const maxEt = Math.min(loadedEph.t1, etNow());
    const created = createStore({ minEt: loadedEph.t0, maxEt, initialEt: maxEt });
    eph = loadedEph;
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

  onDestroy(() => {
    stopLoop?.();
    stage?.dispose();
  });
</script>

<main class="app">
  <!-- 重ね順: 3D の canvas → 目印の層(3D の担当が使う) → 操作の部品の層 -->
  <canvas class="stage" bind:this={canvas}></canvas>
  <div class="markers" bind:this={overlay}></div>

  {#if status === 'ready' && store && eph}
    <UiLayer {store} {eph} stats={stage ? () => stage!.stats() : undefined} />
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
