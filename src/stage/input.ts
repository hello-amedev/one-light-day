// 星空の上の操作: ドラッグで見回す・回す、ホイールとピンチで視野(拡大率)を変える。
// マウスと指を Pointer Events でまとめて扱う。canvas の touch-action は none(app.css)。

export interface InputHandlers {
  /** 1 本の指(マウス)のドラッグ。移動量は CSS px */
  drag(dx: number, dy: number): void;
  /** ホイールとピンチ。factor が 1 より大きいと遠ざかる */
  zoom(factor: number): void;
  /** 動かさずに押して離した(タップ・クリック)。「星空だけを表示」から戻すのに使う */
  tap?(): void;
}

/** タップとみなす、押してから離すまでの動きの限度(CSS px)と時間(ミリ秒) */
const TAP_SLOP_PX = 8;
const TAP_MAX_MS = 500;

export function attachInput(canvas: HTMLElement, handlers: InputHandlers): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;
  /** 1 本目の指を押した位置と時刻。動きすぎた・2 本目が触れた時は null(タップではない) */
  let tapStart: { x: number; y: number; ms: number } | null = null;

  const pinchDist = (): number => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const down = (e: PointerEvent): void => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    tapStart = pointers.size === 1 ? { x: e.clientX, y: e.clientY, ms: performance.now() } : null;
    if (pointers.size === 2) pinchDistance = pinchDist();
  };

  const move = (e: PointerEvent): void => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > TAP_SLOP_PX) tapStart = null;
    if (pointers.size === 1) {
      if (dx !== 0 || dy !== 0) handlers.drag(dx, dy);
    } else if (pointers.size === 2) {
      const d = pinchDist();
      if (pinchDistance > 0 && d > 0) handlers.zoom(pinchDistance / d);
      pinchDistance = d;
    }
  };

  const up = (e: PointerEvent): void => {
    const had = pointers.delete(e.pointerId);
    if (had && e.type === 'pointerup' && pointers.size === 0 && tapStart && performance.now() - tapStart.ms <= TAP_MAX_MS) {
      handlers.tap?.();
    }
    if (pointers.size === 0) tapStart = null;
    if (pointers.size === 2) pinchDistance = pinchDist();
  };

  const wheel = (e: WheelEvent): void => {
    e.preventDefault();
    // 行単位・ページ単位で届く時は px に換算する
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    handlers.zoom(Math.exp(e.deltaY * unit * 0.0012));
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
  };
}
