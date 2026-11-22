// 縮尺の物差し(DOM)。細い金の線に目盛りが付き、その長さが何 km かを数字で添える。
// 長さの決め方は scaleBar.ts。目印(markers.ts)と同じ層(overlay)に置くので、
// 操作しない間は目印と一緒に薄くなる(App.svelte の .markers.idle)。
// 色・字体・線の太さ・動きの長さは app.css のトークンから取る。
import { formatDistanceRound } from '../lib/format';
import { t } from '../lib/i18n';
import { pickScaleBar } from './scaleBar';

const STYLE_ID = 'scale-bar-style';

// 位置の決め方: 横長の画面は左下の再生のまとまりのすぐ上(左端は操作の部品と同じ --edge-x)、
// スマホの縦画面は左下の距離の数字のすぐ上(左上の視点の向きと重ならないよう、上には置かない)。引きの眺めでだけ出る
const CSS = `
.scale-bar {
  position: absolute;
  left: calc(var(--safe-left) + var(--edge-x));
  bottom: calc(var(--safe-bottom) + var(--edge-bottom) + var(--control-h) + var(--space-4));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  color: var(--color-gold);
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--dur-l) var(--ease-in-out), visibility 0s linear var(--dur-l);
  pointer-events: none;
}
.scale-bar.on {
  opacity: 1;
  visibility: visible;
  transition: opacity var(--dur-l) var(--ease-in-out), visibility 0s;
}
.scale-bar .label {
  font-family: var(--font-numeric);
  font-size: var(--text-s);
  letter-spacing: var(--label-tracking);
  color: var(--color-gold);
  text-shadow: var(--text-halo);
  white-space: nowrap;
}
.scale-bar .rule {
  position: relative;
  height: 7px;
  border-bottom: var(--line-thin) solid var(--color-gold);
}
.scale-bar .tick {
  position: absolute;
  bottom: 0;
  width: 0;
  border-left: var(--line-thin) solid var(--color-gold);
}
@media (max-width: 640px) and (orientation: portrait) {
  .scale-bar {
    /* 距離(地球から・数字・光の速さで…)の 3 行の上。引きの眺めでは倍率の行が無い */
    bottom: calc(var(--safe-bottom) + 8.5rem);
  }
}
@media (prefers-reduced-motion: reduce) {
  .scale-bar,
  .scale-bar.on {
    transition: none;
  }
}
`;

export class ScaleBarView {
  private root: HTMLDivElement;
  private label: HTMLSpanElement;
  private rule: HTMLDivElement;
  private style: HTMLStyleElement | null = null;
  private shown = false;
  private km = 0;
  private px = 0;

  constructor(overlay: HTMLElement) {
    if (!document.getElementById(STYLE_ID)) {
      this.style = document.createElement('style');
      this.style.id = STYLE_ID;
      this.style.textContent = CSS;
      document.head.appendChild(this.style);
    }
    this.root = document.createElement('div');
    this.root.className = 'scale-bar';
    this.label = document.createElement('span');
    this.label.className = 'label';
    this.rule = document.createElement('div');
    this.rule.className = 'rule';
    // 目盛り: 両端と中央(中央は低く)
    for (const [at, h] of [
      [0, 7],
      [0.5, 4],
      [1, 7],
    ] as const) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = `${at * 100}%`;
      tick.style.height = `${h}px`;
      this.rule.appendChild(tick);
    }
    this.root.append(this.label, this.rule);
    overlay.appendChild(this.root);
  }

  /** visible: 引きの眺めで、視点の切り替えが終わっている時だけ true。kmPerPx: 注視点の奥行きでの画面の 1px あたりの km */
  update(visible: boolean, kmPerPx: number): void {
    const bar = visible ? pickScaleBar(kmPerPx) : null;
    const on = !!bar;
    if (on !== this.shown) {
      this.shown = on;
      this.root.classList.toggle('on', on);
    }
    if (!bar) return;
    if (bar.km !== this.km) {
      this.km = bar.km;
      const text = formatDistanceRound(bar.km);
      this.label.textContent = text;
      this.root.setAttribute('role', 'img');
      this.root.setAttribute('aria-label', t().hud.scaleBarAria(text));
    }
    if (Math.abs(bar.px - this.px) >= 0.25) {
      this.px = bar.px;
      this.rule.style.width = `${bar.px.toFixed(1)}px`;
    }
  }

  dispose(): void {
    this.root.remove();
    this.style?.remove();
  }
}
