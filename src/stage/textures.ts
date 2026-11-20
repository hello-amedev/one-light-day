// 光の絵。canvas で放射状のグラデーションを描いて、点・にじみとして重ねる(画面全体の加工は使わない)。
import * as THREE from 'three';

function makeTexture(size: number, draw: (g: CanvasRenderingContext2D, c: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  draw(g, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function radial(g: CanvasRenderingContext2D, c: number, stops: ReadonlyArray<readonly [number, string]>): void {
  const grad = g.createRadialGradient(c, c, 0, c, c, c);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, c * 2, c * 2);
}

/** 太陽のにじみ。中心が白に近い暖色で、外へ向けてなだらかに消える */
export function makeGlowTexture(): THREE.CanvasTexture {
  return makeTexture(256, (g, c) =>
    radial(g, c, [
      [0, 'rgba(255,252,240,1)'],
      [0.04, 'rgba(255,246,222,0.95)'],
      [0.12, 'rgba(255,226,170,0.55)'],
      [0.3, 'rgba(255,200,120,0.2)'],
      [0.55, 'rgba(255,180,100,0.06)'],
      [1, 'rgba(255,170,90,0)'],
    ]),
  );
}

/** 太陽の芯。小さくて鋭い光 */
export function makeCoreTexture(): THREE.CanvasTexture {
  return makeTexture(128, (g, c) =>
    radial(g, c, [
      [0, 'rgba(255,255,255,1)'],
      [0.18, 'rgba(255,250,235,0.98)'],
      [0.4, 'rgba(255,240,205,0.45)'],
      [0.7, 'rgba(255,230,190,0.08)'],
      [1, 'rgba(255,225,180,0)'],
    ]),
  );
}

/** 惑星や探査機の点。白の丸い点で、色は素材の色で付ける */
export function makeDotTexture(): THREE.CanvasTexture {
  return makeTexture(64, (g, c) =>
    radial(g, c, [
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,255,255,0.95)'],
      [0.6, 'rgba(255,255,255,0.4)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
  );
}
