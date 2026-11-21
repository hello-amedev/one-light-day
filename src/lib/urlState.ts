// 確認用の URL と、名場面ごとの URL を、起動時の状態に当てる。
//   ?scene=<名場面の ID>                          その名場面から始める(時刻・向く相手・ボイジャーの視界)
//   ?t=<UTC の ISO 文字列>&view=voyager|overview&look=<天体の ID か ahead>
// scene と t が両方ある時は scene を優先する。値が不正なものは無視する。
// 名場面へ移った時は、アドレスバーを ?scene=... に書き換える(履歴は増やさない)。
import { BODY_IDS } from './bodies';
import { etFromIso } from './ephemeris/time';
import { SCENES, type LookTarget, type SceneId } from './scenes';
import type { AppStore } from './store';

export interface UrlState {
  et?: number;
  view?: 'voyager' | 'overview';
  look?: LookTarget;
  scene?: SceneId;
}

export function parseUrlState(search: string): UrlState {
  const q = new URLSearchParams(search);
  const out: UrlState = {};

  const t = q.get('t');
  if (t) {
    try {
      const et = etFromIso(t);
      if (Number.isFinite(et)) out.et = et;
    } catch {
      // 不正な日時は無視する
    }
  }

  const view = q.get('view');
  if (view === 'voyager' || view === 'overview') out.view = view;

  const look = q.get('look');
  if (look === 'ahead' || (look && (BODY_IDS as readonly string[]).includes(look))) out.look = look as LookTarget;

  const scene = q.get('scene');
  if (scene && SCENES.some((s) => s.id === scene)) out.scene = scene as SceneId;

  return out;
}

export function applyUrlState(store: AppStore, search: string): void {
  const s = parseUrlState(search);
  // scene は t より優先する(名場面の時刻と、向く相手・視界がそろう)
  if (s.scene) {
    store.jumpScene(s.scene);
    store.setView('voyager');
  } else if (s.et !== undefined) {
    store.setTime(s.et);
  }
  if (s.view) store.setView(s.view);
  if (s.look) store.lookAt(s.look);
}

/** 名場面の時刻とみなす近さ(秒)。時間軸のつまみが少しでもずれたら、名場面から離れたものとする */
const SCENE_EPSILON = 1;

/** いま名場面の時刻に止まっているなら、その ID。再生で通り過ぎている間は null */
export function sceneAtState(state: { et: number; playing: boolean }): SceneId | null {
  if (state.playing) return null;
  return SCENES.find((s) => Math.abs(state.et - s.et) < SCENE_EPSILON)?.id ?? null;
}

/**
 * 検索部分(`?...`)の scene を付け替えた文字列を返す。ほかの項目は書かれたまま残す(`?debug` を `debug=` にしない)。
 * scene を付ける時は、古い t を外す(離れた後に、前の時刻が残らないように)。scene が null なら外す。
 */
export function withScene(search: string, scene: SceneId | null): string {
  const drop = scene ? new Set(['scene', 't']) : new Set(['scene']);
  const parts = search
    .replace(/^\?/, '')
    .split('&')
    .filter((p) => {
      if (!p) return false;
      const raw = p.split('=')[0];
      let key = raw;
      try {
        key = decodeURIComponent(raw);
      } catch {
        // 壊れた項目は、そのまま残す
      }
      return !drop.has(key);
    });
  if (scene) parts.push(`scene=${scene}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export interface UrlTarget {
  location: { pathname: string; search: string; hash: string };
  history: { replaceState(data: unknown, unused: string, url: string): void };
}

/**
 * 名場面に着いた・離れた時に、アドレスバーを書き換える(replaceState。履歴は増やさない)。
 * 戻り値を呼ぶと止める。
 */
export function syncSceneUrl(store: AppStore, target: UrlTarget): () => void {
  let current = parseUrlState(target.location.search).scene ?? null;
  return store.subscribe((state) => {
    const next = sceneAtState(state);
    if (next === current) return;
    current = next;
    const { pathname, search, hash } = target.location;
    target.history.replaceState(null, '', pathname + withScene(search, next) + hash);
  });
}
