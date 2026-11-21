// 画面全体の状態。Svelte にも three.js にも依存しない素の TypeScript。
// 画面の部品と 3D の表示は、互いを呼ばずにこの 1 つの状態だけを介してつながる。
import { DISPLAY_DEFAULTS } from '../displayPrefs';
import { findEvent, type EventId } from '../events';
import { CRAFT_DISTANCE_DEFAULT_M, MAG_MIN, clampMagnification, zoomCraftDistance, zoomMagnification } from '../zoom';
import { INTRO_RUN_SECONDS, INTRO_TITLE_SECONDS, introEt } from '../intro';
import { SCENES, type LookTarget, type Scene, type SceneId } from '../scenes';
import { pacedRate } from './pacing';
import { RATE_SECONDS, type AppState, type AppStore, type RateId, type StoreOptions, type ViewId } from './types';

export * from './types';

/** 1 回の tick で進める現実の秒数の上限。タブが隠れていた後に時刻が飛ぶのを防ぐ */
const MAX_TICK_SECONDS = 0.1;

/** 「次」「前」の名場面に数えるための最小の差(秒)。いまいる場面を次の場面と取り違えないため */
const SCENE_MIN_GAP = 1;

const SCENES_BY_TIME: readonly Scene[] = [...SCENES].sort((a, b) => a.et - b.et);

export function createStore(options: StoreOptions): AppStore {
  const { minEt, maxEt } = options;
  const listeners = new Set<(state: Readonly<AppState>) => void>();

  const clampEt = (et: number): number => Math.min(maxEt, Math.max(minEt, et));

  let state: AppState = {
    et: clampEt(options.initialEt),
    playing: false,
    rate: 'day',
    view: 'voyager',
    lookTarget: null,
    lookSeq: 0,
    intro: 'off',
    magnification: MAG_MIN,
    craftDistance: CRAFT_DISTANCE_DEFAULT_M,
    display: { ...(options.initialDisplay ?? DISPLAY_DEFAULTS) },
    starsOnly: false,
    arrival: null,
    arrivalSeq: 0,
  };
  /** 自動再生が始まってからの、現実の経過秒 */
  let introElapsed = 0;

  /**
   * 状態を更新する唯一の入口。値が実際に変わった時だけ、新しいオブジェクトに差し替えて 1 回通知する
   * (毎フレーム呼ばれる tick の値が同じ時に、画面を無駄に組み直させない)
   */
  function commit(patch: Partial<AppState>): boolean {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof AppState)[]) {
      if (patch[key] !== state[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return false;
    state = { ...state, ...patch };
    for (const listener of [...listeners]) listener(state);
    return true;
  }

  /** いまの時刻で、選んだ速さに名場面の近くの減速をかけた後の「現実の 1 秒あたりに進む秒数」 */
  function effectiveRate(et: number, rate: RateId): number {
    return pacedRate(et, RATE_SECONDS[rate], SCENES_BY_TIME);
  }

  /** 利用者の操作で状態を動かす時に足す。自動再生中・案内中なら、その場で終わらせて操作を渡す */
  function endIntro(): Partial<AppState> {
    return state.intro === 'off' ? {} : { intro: 'off' };
  }

  function lookPatch(target: LookTarget): Partial<AppState> {
    return { lookTarget: target, lookSeq: state.lookSeq + 1 };
  }

  function jumpScene(id: SceneId): void {
    const scene = SCENES_BY_TIME.find((s) => s.id === id);
    if (!scene) return;
    commit({
      et: clampEt(scene.et),
      playing: false,
      ...endIntro(),
      ...lookPatch(scene.look),
      arrival: { kind: 'scene', id },
      arrivalSeq: state.arrivalSeq + 1,
    });
  }

  function jumpEvent(id: EventId): void {
    const event = findEvent(id);
    if (!event) return;
    commit({
      et: clampEt(event.et),
      playing: false,
      ...endIntro(),
      ...(event.look ? lookPatch(event.look) : {}),
      arrival: { kind: 'event', id },
      arrivalSeq: state.arrivalSeq + 1,
    });
  }

  return {
    minEt,
    maxEt,

    get: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setTime(et) {
      commit({ et: clampEt(et), ...endIntro() });
    },
    stepTime(deltaSeconds) {
      commit({ et: clampEt(state.et + deltaSeconds), ...endIntro() });
    },

    play() {
      // 右端では進めないので、押しても点滅だけして止まる状態を作らない
      if (state.et >= maxEt) return;
      commit({ playing: true, ...endIntro() });
    },
    pause() {
      commit({ playing: false, ...endIntro() });
    },
    toggle() {
      if (state.playing) commit({ playing: false, ...endIntro() });
      else if (state.et < maxEt) commit({ playing: true, ...endIntro() });
    },
    setRate(rate: RateId) {
      commit({ rate });
    },

    setView(view: ViewId) {
      commit({ view, ...endIntro() });
    },
    lookAt(target) {
      commit({ ...endIntro(), ...lookPatch(target) });
    },

    zoomBy(factor) {
      if (!(factor > 0) || !Number.isFinite(factor)) return;
      if (state.view === 'voyager') commit({ magnification: zoomMagnification(state.magnification, factor) });
      else if (state.view === 'craft') commit({ craftDistance: zoomCraftDistance(state.craftDistance, factor) });
    },
    setMagnification(m) {
      if (Number.isFinite(m)) commit({ magnification: clampMagnification(m) });
    },
    setDisplay(patch) {
      const next = { ...state.display, ...patch };
      const d = state.display;
      if (next.labels === d.labels && next.orbits === d.orbits && next.captions === d.captions) return;
      commit({ display: next });
    },
    setStarsOnly(on) {
      commit({ starsOnly: on });
    },

    jumpScene,
    jumpEvent,
    nextScene() {
      const next = SCENES_BY_TIME.find((s) => s.et > state.et + SCENE_MIN_GAP);
      if (next) jumpScene(next.id);
    },
    prevScene() {
      const prev = [...SCENES_BY_TIME].reverse().find((s) => s.et < state.et - SCENE_MIN_GAP);
      if (prev) jumpScene(prev.id);
    },

    startIntro() {
      introElapsed = 0;
      commit({ et: minEt, view: 'overview', playing: true, intro: 'title' });
    },
    stopIntro() {
      if (state.intro === 'off') return;
      commit({ intro: 'off', playing: false });
    },
    skipIntro() {
      commit({ et: maxEt, view: 'overview', playing: false, intro: 'done' });
    },

    tick(realDeltaSeconds) {
      if (!state.playing) return false;
      const dt = Math.min(Math.max(realDeltaSeconds, 0), MAX_TICK_SECONDS);
      if (state.intro === 'title' || state.intro === 'run') {
        // 自動再生中は名場面の減速を使わず、決まった配分だけで進める
        introElapsed += dt;
        if (introElapsed < INTRO_TITLE_SECONDS) return false;
        const progress = (introElapsed - INTRO_TITLE_SECONDS) / INTRO_RUN_SECONDS;
        if (progress >= 1) return commit({ et: maxEt, playing: false, intro: 'done' });
        return commit({ et: introEt(progress, minEt, maxEt), intro: 'run' });
      }
      const next = state.et + effectiveRate(state.et, state.rate) * dt;
      if (next >= maxEt) return commit({ et: maxEt, playing: false });
      return commit({ et: next });
    },
  };
}
