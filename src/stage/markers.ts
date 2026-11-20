// 目印と名前(DOM)。小さな輪(切れ目のある細い円)と名前を、天体の画面の位置に重ねる。
// 位置は描くたびに transform で更新する。近くに重なる名前は、優先度の低いほうを隠す。
// 色と文字は CSS のトークンから取る(第 2 段階で見た目を差し替えられるように)。
import type { BodyId } from '../lib/bodies';
import { t } from '../lib/i18n';
import type { LookTarget } from '../lib/scenes';
import type { BodyScreenInfo } from './bodies';
import type { FrameContext } from './frame';

/** 名前どうしがこの距離(px)以内なら、優先度の低いほうを隠す */
const DECLUTTER_PX = 28;
const RING_MIN_PX = 18;
/** 円盤がこれより大きい(半径 px)時は、輪を出さず名前だけにする */
const RING_MAX_DISC_PX = 40;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** 優先度(小さいほど優先)。向いている相手 > 地球 > 太陽 > 木星 > 土星 > そのほか。ボイジャー自身は引きの眺めの主役 */
function priorityOf(id: BodyId, lookTarget: LookTarget | null): number {
  if (id === lookTarget) return 0;
  switch (id) {
    case 'voyager1':
      return 0.5;
    case 'earth':
      return 1;
    case 'sun':
      return 2;
    case 'jupiter':
      return 3;
    case 'saturn':
      return 4;
    default:
      return 5;
  }
}

interface Marker {
  root: HTMLDivElement;
  svg: SVGSVGElement;
  label: HTMLSpanElement;
  visible: boolean;
  color: string;
  ringPx: number;
}

export class MarkerLayer {
  private markers = new Map<BodyId, Marker>();
  private overlay: HTMLElement;
  private order: { info: BodyScreenInfo; priority: number }[] = [];
  private accepted: { x: number; y: number }[] = [];

  constructor(overlay: HTMLElement) {
    this.overlay = overlay;
  }

  private create(id: BodyId): Marker {
    const root = document.createElement('div');
    root.style.cssText =
      'position:absolute;left:0;top:0;width:0;height:0;display:none;pointer-events:none;will-change:transform;';

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.style.cssText = 'position:absolute;overflow:visible;';
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '10');
    circle.setAttribute('cy', '10');
    circle.setAttribute('r', '9');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'currentColor');
    // 円周 56.5 のうち 7 を切れ目にする(細い線で、切れ目のある輪)
    circle.setAttribute('stroke-width', '1');
    circle.setAttribute('stroke-dasharray', '49.5 7');
    circle.setAttribute('stroke-linecap', 'butt');
    circle.setAttribute('transform', 'rotate(-60 10 10)');
    svg.appendChild(circle);

    const label = document.createElement('span');
    label.textContent = t().bodies[id];
    label.style.cssText =
      'position:absolute;top:0;transform:translateY(-50%);white-space:nowrap;' +
      'font-family:var(--font-body);font-size:var(--text-xs);letter-spacing:0.08em;' +
      'text-shadow:var(--text-halo);color:inherit;';

    root.append(svg, label);
    this.overlay.appendChild(root);
    return { root, svg, label, visible: false, color: '', ringPx: 0 };
  }

  update(infos: BodyScreenInfo[], ctx: FrameContext, lookTarget: LookTarget | null): void {
    const seen = new Set<BodyId>();
    this.order.length = 0;
    for (const info of infos) {
      const s = info.screen;
      // カメラの後ろと、画面の外は出さない
      if (!s || s.x < -20 || s.y < -20 || s.x > ctx.width + 20 || s.y > ctx.height + 20) continue;
      this.order.push({ info, priority: priorityOf(info.id, lookTarget) });
    }
    this.order.sort((a, b) => a.priority - b.priority);

    this.accepted.length = 0;
    for (const { info } of this.order) {
      const s = info.screen!;
      let blocked = false;
      for (const a of this.accepted) {
        if (Math.hypot(a.x - s.x, a.y - s.y) < DECLUTTER_PX) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      this.accepted.push(s);
      seen.add(info.id);

      let m = this.markers.get(info.id);
      if (!m) this.markers.set(info.id, (m = this.create(info.id)));
      if (!m.visible) {
        m.root.style.display = 'block';
        m.visible = true;
      }
      m.root.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`;

      const color =
        info.id === lookTarget || info.id === 'voyager1'
          ? 'var(--color-gold)'
          : info.id === 'earth'
            ? 'var(--color-earth)'
            : 'var(--color-text-dim)';
      if (color !== m.color) {
        m.root.style.color = color;
        m.color = color;
      }

      // 輪の大きさ: 小さな点には最小の輪、円盤が見える時は円盤を囲む。大きい円盤は輪なし
      const bigDisc = info.radiusPx > RING_MAX_DISC_PX;
      const ring = bigDisc ? 0 : Math.max(RING_MIN_PX, info.radiusPx * 2 + 10);
      if (ring !== m.ringPx) {
        m.ringPx = ring;
        m.svg.style.display = bigDisc ? 'none' : 'block';
        m.svg.style.width = m.svg.style.height = `${ring}px`;
        m.svg.style.left = m.svg.style.top = `${-ring / 2}px`;
        m.label.style.left = `${bigDisc ? 0 : ring / 2 + 5}px`;
      }
    }

    for (const [id, m] of this.markers) {
      if (!seen.has(id) && m.visible) {
        m.root.style.display = 'none';
        m.visible = false;
      }
    }
  }

  dispose(): void {
    for (const m of this.markers.values()) m.root.remove();
    this.markers.clear();
  }
}
