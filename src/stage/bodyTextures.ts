// 素材の画像を使わず、起動後に canvas で作る土星の表面と、環の表(半径 → 明るさ・濃さ)。
import * as THREE from 'three';
import { buildRingProfileData } from './saturnRings';

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 経度方向につなぎ目のない値のむら。period は経度方向の格子の数(整数) */
function periodicNoise(u: number, v: number, nx: number, ny: number, seed: number): number {
  const x = u * nx;
  const y = v * ny;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (i: number, j: number): number => hash2(((i % nx) + nx) % nx, j, seed);
  const a = h(x0, y0) * (1 - sx) + h(x0 + 1, y0) * sx;
  const b = h(x0, y0 + 1) * (1 - sx) + h(x0 + 1, y0 + 1) * sx;
  return a * (1 - sy) + b * sy;
}

/**
 * 土星の表面。緯度ごとの淡い縞(黄土色〜クリーム色)に、経度方向へ引き伸ばした細かなむらを重ねる。
 * 正距円筒の画像(左端が経度 -180 度、上が北)。原色にせず、彩度を低く抑える。
 */
export function makeSaturnSurfaceTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - (j + 0.5) / h) * 180;
    const al = Math.abs(lat);
    // 縞: 周期の違う波を重ねる。極に近いほど弱い
    const calm = 1 - 0.65 * smoothstep(40, 80, al);
    const bands =
      (0.55 * Math.sin((lat * Math.PI) / 5.5 + 0.6) +
        0.35 * Math.sin((lat * Math.PI) / 3.1 + 2.1) +
        0.25 * Math.sin((lat * Math.PI) / 11 + 4.0)) *
      calm;
    // 赤道付近は少し明るいクリーム色、中緯度は黄土色、極に近づくと灰がかった青緑
    const polar = smoothstep(52, 78, al);
    const eq = 1 - smoothstep(0, 22, al);
    for (let i = 0; i < w; i++) {
      const u = (i + 0.5) / w;
      const v = (j + 0.5) / h;
      // 経度方向に長い(格子 6 × 緯度方向 90)むらと、もう少し細かいむら
      const n =
        (periodicNoise(u, v, 6, 90, 3) - 0.5) * 0.5 +
        (periodicNoise(u, v, 18, 200, 9) - 0.5) * 0.28 +
        (periodicNoise(u, v, 4, 24, 17) - 0.5) * 0.3 * calm;
      const k = 1 + 0.085 * bands + 0.09 * n;
      let r = 0.9 + 0.04 * eq;
      let gr = 0.8 + 0.04 * eq;
      let b = 0.56 + 0.06 * eq;
      // 縞の濃い所は橙みの黄土色へ
      const tint = Math.max(0, bands) * 0.5;
      r += 0.02 * tint;
      gr -= 0.03 * tint;
      b -= 0.06 * tint;
      r = r * (1 - polar) + 0.62 * polar;
      gr = gr * (1 - polar) + 0.66 * polar;
      b = b * (1 - polar) + 0.62 * polar;
      const idx = (j * w + i) * 4;
      img.data[idx] = Math.min(255, r * k * 255);
      img.data[idx + 1] = Math.min(255, gr * k * 255);
      img.data[idx + 2] = Math.min(255, b * k * 255);
      img.data[idx + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

/** 環の表の画像(width × 1)。R = 明るさ、G = √(tau / 3)。つなぎ方は saturnRings.ts */
export function makeRingProfileTexture(width: number): THREE.DataTexture {
  const data = buildRingProfileData(width);
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width, 1, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
