// 目印と名前(DOM)。小さな輪(切れ目のある細い円)と名前を、天体の画面の位置に重ねる。
// 位置は描くたびに transform で更新する。近くに重なる名前は、優先度の低いほうを隠す。
// 名前を出す側は、近くの目印(太陽など)と反対側。大きな円盤は輪を出さず、縁の外に名前だけを置く。
// 色と文字は CSS のトークンから取る(第 2 段階で見た目を差し替えられるように)。
import { BODY_RADIUS_KM, SATELLITE_PARENT, type BodyId } from '../lib/bodies';
import type { Ephemeris } from '../lib/ephemeris';
import { t } from '../lib/i18n';
import type { LookTarget } from '../lib/scenes';
import type { BodyScreenInfo } from './bodies';
import type { FrameContext } from './frame';
import { projectToScreen, screenRadiusPx } from './frame';
import type { Vec3 } from './math';
import { relativePosition } from './placement';

/** 名前どうしがこの距離(px)以内なら、優先度の低いほうを隠す */
const DECLUTTER_PX = 28;
const RING_MIN_PX = 18;
/** 円盤がこれより大きい(半径 px)時は、輪を出さず名前だけにする */
export const RING_MAX_DISC_PX = 40;
/** 近くの目印(太陽・隣の天体)とみなす距離(px)。この内側なら、名前をその反対側に出す */
export const NEAR_REF_PX = 120;
/** 名前と輪・縁の間のすき間(px) */
const LABEL_GAP_PX = 5;
const DISC_GAP_PX = 8;
/** 画面の端からこれだけは内側に名前を収める(px) */
const EDGE_MARGIN_PX = 8;
/** 名前の幅の見積り(1 文字あたり px)。文字は --text-xs で字間 0.16em */
const CHAR_PX = 12.8;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** 位置データが通過の前後だけにある衛星(目印は範囲の中だけ出す) */
const GAS_GIANT_MOONS = ['io', 'europa', 'ganymede', 'callisto', 'titan'] as const satisfies readonly BodyId[];

/** 優先度(小さいほど優先)。向いている相手 > ボイジャー > 地球 > 太陽 > 木星 > 土星 > 衛星・月 > そのほか */
export function priorityOf(id: BodyId, lookTarget: LookTarget | null): number {
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
      return id in SATELLITE_PARENT ? 5 : 6;
  }
}

export interface Pt {
  x: number;
  y: number;
}

/** 名前の置き場所。marker の中心からの位置(px)と、その位置が名前のどこにあたるか */
export interface LabelPlacement {
  dx: number;
  dy: number;
  anchor: 'start' | 'end' | 'middle';
}

/** 画面の中で、すでに何かが占めている四角(他の目印の輪・置いた名前) */
export interface Occupied {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** 持ち主の番号。自分の輪とは重なっても構わない */
  owner: number;
}

export interface LabelInput {
  /** 目印の中心(画面の座標) */
  at: Pt;
  /** 円盤の画面上の半径 */
  radiusPx: number;
  /** 輪の直径(大きい円盤は 0) */
  ringPx: number;
  /** 名前の幅の見積り */
  labelW: number;
  viewport: { width: number; height: number };
  /** 近くの目印。あれば、名前はその反対側に出す */
  ref: Pt | null;
  /** 他の目印の輪・置いた名前。重なる側は避ける */
  occupied?: readonly Occupied[];
  owner?: number;
}

const LABEL_H = 14;

function labelRect(at: Pt, c: LabelPlacement, w: number): Occupied {
  const x = at.x + c.dx;
  const y = at.y + c.dy;
  const x0 = c.anchor === 'start' ? x : c.anchor === 'end' ? x - w : x - w / 2;
  return { x0, x1: x0 + w, y0: y - LABEL_H / 2, y1: y + LABEL_H / 2, owner: -1 };
}

function fitsViewport(r: Occupied, vp: { width: number; height: number }): boolean {
  return r.x0 >= EDGE_MARGIN_PX && r.x1 <= vp.width - EDGE_MARGIN_PX && r.y0 >= EDGE_MARGIN_PX && r.y1 <= vp.height - EDGE_MARGIN_PX;
}

function collides(r: Occupied, occupied: readonly Occupied[], owner: number): boolean {
  for (const o of occupied) {
    if (o.owner === owner) continue;
    if (r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0) return true;
  }
  return false;
}

/**
 * 名前を出す側を決める(純粋な関数)。
 * - 小さな目印: 近くの目印が左にあれば右、右にあれば左。近くに無ければ画面の中心から遠い側
 * - 大きな円盤: 縁の外に置く。同じ向きの決め方で、横から。入らなければ下、上の順
 * - どちらも、画面からはみ出す側・他の目印の輪や名前に重なる側は避ける。避けられなければ最初の候補。
 *   円盤が画面いっぱいで縁の外に入らない時は名前を出さない(null)
 */
export function placeLabel(input: LabelInput): LabelPlacement | null {
  const { at, radiusPx, ringPx, labelW, viewport, ref } = input;
  const occupied = input.occupied ?? [];
  const owner = input.owner ?? -2;
  const preferRight = ref ? ref.x <= at.x : at.x >= viewport.width / 2;

  const off = ringPx > 0 ? ringPx / 2 + LABEL_GAP_PX : radiusPx + DISC_GAP_PX;
  const side = (dir: 1 | -1): LabelPlacement => ({ dx: dir * off, dy: 0, anchor: dir === 1 ? 'start' : 'end' });
  const vgap = ringPx > 0 ? off + 6 : off + 6;
  const candidates: LabelPlacement[] = [
    preferRight ? side(1) : side(-1),
    preferRight ? side(-1) : side(1),
    { dx: 0, dy: vgap, anchor: 'middle' },
    { dx: 0, dy: -vgap, anchor: 'middle' },
  ];
  const inside = candidates.filter((c) => fitsViewport(labelRect(at, c, labelW), viewport));
  if (inside.length === 0) return ringPx > 0 ? candidates[0] : null;
  const free = inside.find((c) => !collides(labelRect(at, c, labelW), occupied, owner));
  return free ?? inside[0];
}

interface Marker {
  root: HTMLDivElement;
  svg: SVGSVGElement;
  label: HTMLSpanElement;
  visible: boolean;
  color: string;
  ringPx: number;
  labelKey: string;
  labelW: number;
}

export class MarkerLayer {
  private markers = new Map<BodyId, Marker>();
  private overlay: HTMLElement;
  private eph: Ephemeris | null;
  private moonRange = new Map<BodyId, { t0: number; t1: number }>();
  private extra: BodyScreenInfo[] = [];
  private order: { info: BodyScreenInfo; priority: number }[] = [];
  private accepted: { info: BodyScreenInfo; ref: Pt | null }[] = [];
  private tmp: Vec3 = [0, 0, 0];
  private rel: Vec3 = [0, 0, 0];

  constructor(overlay: HTMLElement, eph?: Ephemeris) {
    this.overlay = overlay;
    this.eph = eph ?? null;
    if (eph) for (const id of GAS_GIANT_MOONS) this.moonRange.set(id, eph.coverage(id));
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

    const name = t().bodies[id];
    const label = document.createElement('span');
    label.textContent = name;
    label.style.cssText =
      'position:absolute;left:0;top:0;white-space:nowrap;' +
      'font-family:var(--font-body);font-size:var(--text-xs);letter-spacing:var(--label-tracking);' +
      'text-shadow:var(--text-halo);color:inherit;';

    root.append(svg, label);
    this.overlay.appendChild(root);
    return { root, svg, label, visible: false, color: '', ringPx: -1, labelKey: '', labelW: name.length * CHAR_PX };
  }

  /** 位置データが通過の前後だけにある衛星の画面の情報(bodies が出していない天体だけ) */
  private collectMoons(infos: BodyScreenInfo[], ctx: FrameContext): void {
    this.extra.length = 0;
    const eph = this.eph;
    if (!eph) return;
    for (const id of GAS_GIANT_MOONS) {
      if (infos.some((i) => i.id === id)) continue;
      const range = this.moonRange.get(id)!;
      if (ctx.et < range.t0 || ctx.et > range.t1) continue;
      relativePosition(eph.position(id, 'voyager1', ctx.et, this.tmp), ctx.offset, this.rel);
      const distance = Math.hypot(this.rel[0], this.rel[1], this.rel[2]);
      this.extra.push({
        id,
        screen: projectToScreen(this.rel, ctx),
        radiusPx: screenRadiusPx(BODY_RADIUS_KM[id], distance, ctx),
        distance,
      });
    }
  }

  /** hidden: 名前を出さない天体(早回しで残像の弧に替えた惑星。名前が飛び回らないように) */
  update(infos: BodyScreenInfo[], ctx: FrameContext, lookTarget: LookTarget | null, hidden?: ReadonlySet<BodyId>): void {
    const seen = new Set<BodyId>();
    this.collectMoons(infos, ctx);
    this.order.length = 0;
    for (const list of [infos, this.extra]) {
      for (const info of list) {
        const s = info.screen;
        // カメラの後ろと、画面の外は出さない
        if (!s || s.x < -20 || s.y < -20 || s.x > ctx.width + 20 || s.y > ctx.height + 20) continue;
        if (hidden?.has(info.id)) continue;
        this.order.push({ info, priority: priorityOf(info.id, lookTarget) });
      }
    }
    this.order.sort((a, b) => a.priority - b.priority);

    // 1 巡目: 重なる名前の間引き
    this.accepted.length = 0;
    for (const { info } of this.order) {
      const s = info.screen!;
      let blocked = false;
      for (const a of this.accepted) {
        if (Math.hypot(a.info.screen!.x - s.x, a.info.screen!.y - s.y) < DECLUTTER_PX) {
          blocked = true;
          break;
        }
      }
      if (!blocked) this.accepted.push({ info, ref: null });
    }

    // 2 巡目: 近くの目印を探す(太陽が近ければ太陽、なければいちばん近い目印。太陽自身は近い目印の反対側)
    const sun = this.accepted.find((a) => a.info.id === 'sun')?.info.screen ?? null;
    for (const a of this.accepted) {
      const s = a.info.screen!;
      if (sun && a.info.id !== 'sun' && Math.hypot(sun.x - s.x, sun.y - s.y) < NEAR_REF_PX) {
        a.ref = sun;
        continue;
      }
      let best = NEAR_REF_PX;
      for (const b of this.accepted) {
        if (b === a) continue;
        const d = Math.hypot(b.info.screen!.x - s.x, b.info.screen!.y - s.y);
        if (d < best) {
          best = d;
          a.ref = b.info.screen!;
        }
      }
    }

    const viewport = { width: ctx.width, height: ctx.height };
    // 先に、受け入れた目印の輪をすべて「占めている所」にする。名前は優先度の高い順に置き、置いたらそれも占める
    const occupied: Occupied[] = [];
    this.accepted.forEach(({ info }, i) => {
      const r = Math.max(RING_MIN_PX, info.radiusPx * 2 + 10) / 2;
      if (info.radiusPx > RING_MAX_DISC_PX) return;
      const s = info.screen!;
      occupied.push({ x0: s.x - r, y0: s.y - r, x1: s.x + r, y1: s.y + r, owner: i });
    });
    for (const [index, { info, ref }] of this.accepted.entries()) {
      const s = info.screen!;
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
      }

      // 名前の置き場所(変わった時だけ書く)
      const place = placeLabel({
        at: s,
        radiusPx: Number.isFinite(info.radiusPx) ? info.radiusPx : 0,
        ringPx: ring,
        labelW: m.labelW,
        viewport,
        ref,
        occupied,
        owner: index,
      });
      if (place) {
        const rect = labelRect(s, place, m.labelW);
        rect.owner = index;
        occupied.push(rect);
      }
      const key = place ? `${place.anchor}:${Math.round(place.dx)}:${Math.round(place.dy)}` : 'none';
      if (key !== m.labelKey) {
        m.labelKey = key;
        if (!place) m.label.style.display = 'none';
        else {
          const shift = place.anchor === 'start' ? '0' : place.anchor === 'end' ? '-100%' : '-50%';
          m.label.style.display = '';
          m.label.style.left = `${place.dx}px`;
          m.label.style.top = `${place.dy}px`;
          m.label.style.transform = `translate(${shift},-50%)`;
        }
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
