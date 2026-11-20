// 画面全体の状態。Svelte にも three.js にも依存しない素の TypeScript。
// 画面の部品と 3D の表示は、互いを呼ばずにこの 1 つの状態だけを介してつながる。
import { SCENES, type LookTarget, type Scene, type SceneId } from '../scenes';
import { RATE_SECONDS, type AppState, type AppStore, type RateId, type StoreOptions, type ViewId } from './types';

export * from './types';

/** 1 回の tick で進める現実の秒数の上限。タブが隠れていた後に時刻が飛ぶのを防ぐ */
const MAX_TICK_SECONDS = 0.1;

/** 名場面の近くで、場面までの距離をこの秒数で割った速さまで落とす(近づくほどゆっくり、通り過ぎると戻る) */
const SLOW_APPROACH_SECONDS = 1.5;

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
  };

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

  function nearestScene(et: number): Scene {
    let best = SCENES_BY_TIME[0];
    for (const scene of SCENES_BY_TIME) {
      if (Math.abs(scene.et - et) < Math.abs(best.et - et)) best = scene;
    }
    return best;
  }

  /** いまの時刻で、選んだ速さに自動減速をかけた後の「現実の 1 秒あたりに進む秒数」 */
  function effectiveRate(et: number, rate: RateId): number {
    const chosen = RATE_SECONDS[rate];
    const scene = nearestScene(et);
    const distance = Math.abs(et - scene.et);
    if (distance > scene.slowWindow || chosen <= scene.slowRate) return chosen;
    return Math.min(chosen, Math.max(scene.slowRate, distance / SLOW_APPROACH_SECONDS));
  }

  function lookPatch(target: LookTarget): Partial<AppState> {
    return { lookTarget: target, lookSeq: state.lookSeq + 1 };
  }

  function jumpScene(id: SceneId): void {
    const scene = SCENES_BY_TIME.find((s) => s.id === id);
    if (!scene) return;
    commit({ et: clampEt(scene.et), playing: false, ...lookPatch(scene.look) });
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
      commit({ et: clampEt(et) });
    },
    stepTime(deltaSeconds) {
      commit({ et: clampEt(state.et + deltaSeconds) });
    },

    play() {
      // 右端では進めないので、押しても点滅だけして止まる状態を作らない
      if (state.et >= maxEt) return;
      commit({ playing: true });
    },
    pause() {
      commit({ playing: false });
    },
    toggle() {
      if (state.playing) commit({ playing: false });
      else if (state.et < maxEt) commit({ playing: true });
    },
    setRate(rate: RateId) {
      commit({ rate });
    },

    setView(view: ViewId) {
      commit({ view });
    },
    lookAt(target) {
      commit(lookPatch(target));
    },

    jumpScene,
    nextScene() {
      const next = SCENES_BY_TIME.find((s) => s.et > state.et + SCENE_MIN_GAP);
      if (next) jumpScene(next.id);
    },
    prevScene() {
      const prev = [...SCENES_BY_TIME].reverse().find((s) => s.et < state.et - SCENE_MIN_GAP);
      if (prev) jumpScene(prev.id);
    },

    tick(realDeltaSeconds) {
      if (!state.playing) return false;
      const dt = Math.min(Math.max(realDeltaSeconds, 0), MAX_TICK_SECONDS);
      const next = state.et + effectiveRate(state.et, state.rate) * dt;
      if (next >= maxEt) return commit({ et: maxEt, playing: false });
      return commit({ et: next });
    },
  };
}
