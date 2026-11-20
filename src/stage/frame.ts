// 1 コマの描画に使う、画面とカメラの値。球・線・目印が同じ値で画面の位置を出す。
import type { Basis } from './camera';
import { dot, type Vec3 } from './math';

export interface FrameContext {
  et: number;
  /** ボイジャーからのカメラのずれ km(倍精度) */
  offset: Vec3;
  basis: Basis;
  /** 縦・横の視野の半分の tan */
  tanV: number;
  tanH: number;
  /** 画面の大きさ(CSS px) */
  width: number;
  height: number;
  pixelRatio: number;
}

/** カメラからの相対位置 rel を画面の座標(CSS px、左上が原点)にする。カメラの後ろなら null */
export function projectToScreen(rel: Vec3, ctx: FrameContext): { x: number; y: number } | null {
  const z = dot(rel, ctx.basis.forward);
  if (z <= 0) return null;
  const x = dot(rel, ctx.basis.right);
  const y = dot(rel, ctx.basis.up);
  return {
    x: ctx.width / 2 + (x / (z * ctx.tanH)) * (ctx.width / 2),
    y: ctx.height / 2 - (y / (z * ctx.tanV)) * (ctx.height / 2),
  };
}

/** 距離 distance km・半径 radius km の球の、画面上の半径(px)。縮めて描いても同じ値 */
export function screenRadiusPx(radius: number, distance: number, ctx: FrameContext): number {
  if (distance <= radius) return Infinity;
  const tanHalf = radius / Math.sqrt(distance * distance - radius * radius);
  return (tanHalf / ctx.tanV) * (ctx.height / 2);
}
