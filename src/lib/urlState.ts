// 確認用の URL を読んで、起動時の状態に当てる。後で名場面ごとの URL の土台になる。
//   ?t=<UTC の ISO 文字列>&view=voyager|overview&look=<天体の ID か ahead>
// 値が不正なものは無視する。
import { BODY_IDS } from './bodies';
import { etFromIso } from './ephemeris/time';
import type { LookTarget } from './scenes';
import type { AppStore } from './store';

export interface UrlState {
  et?: number;
  view?: 'voyager' | 'overview';
  look?: LookTarget;
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

  return out;
}

export function applyUrlState(store: AppStore, search: string): void {
  const s = parseUrlState(search);
  if (s.et !== undefined) store.setTime(s.et);
  if (s.view) store.setView(s.view);
  if (s.look) store.lookAt(s.look);
}
