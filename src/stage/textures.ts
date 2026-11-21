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

/**
 * 加算で重ねる光の絵を、1 画素ずつ計算して作る。明るさは色(rgb)に入れ、alpha は 1 のまま。
 * (alpha に入れると、描画の途中で色の精度が落ちて暗い所が段になる)
 * f(x, y) は中心を原点に、-1〜1 の座標で [r, g, b](0〜1)を返す。
 */
function makeLightTexture(size: number, f: (x: number, y: number) => readonly [number, number, number]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const [r, gr, b] = f(((i + 0.5) / size) * 2 - 1, ((j + 0.5) / size) * 2 - 1);
      const k = (j * size + i) * 4;
      img.data[k] = Math.min(255, r * 255);
      img.data[k + 1] = Math.min(255, gr * 255);
      img.data[k + 2] = Math.min(255, b * 255);
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 端で必ず 0 になる窓(絵の四角い縁が見えないように) */
const edgeWindow = (r: number): number => 1 - smoothstep(0.7, 1, r);

/**
 * 太陽のにじみ。中心は白に近く、外へ向けて暖色になりながら、べき乗に近い裾でなだらかに消える
 * (指数だけだと裾が急に切れて、ぼやけた円盤に見える)
 */
export function makeGlowTexture(): THREE.CanvasTexture {
  return makeLightTexture(256, (x, y) => {
    const r = Math.hypot(x, y);
    const w = edgeWindow(r);
    // 芯のすぐ外の強い部分 + 広い裾
    const near = 1 / (1 + Math.pow(r / 0.045, 2));
    const far = 0.16 / (1 + Math.pow(r / 0.22, 1.6));
    const i = (near * 0.85 + far) * w;
    // 外ほど橙に寄る
    const warm = smoothstep(0.02, 0.5, r);
    return [i, i * (0.97 - 0.2 * warm), i * (0.9 - 0.45 * warm)];
  });
}

/** 太陽の芯。小さくて鋭い、白に近い光 */
export function makeCoreTexture(): THREE.CanvasTexture {
  return makeLightTexture(128, (x, y) => {
    const r = Math.hypot(x, y);
    const i = Math.pow(Math.max(0, 1 - r), 3.2) * (1 - smoothstep(0.85, 1, r));
    const hot = Math.pow(Math.max(0, 1 - r / 0.35), 2);
    return [Math.min(1, i * 1.2 + hot), Math.min(1, i * 1.1 + hot), Math.min(1, i * 0.95 + hot * 0.9)];
  });
}

/** 太陽の十字の光条(回折の筋)。細く、中心から離れるほど弱い。控えめに */
export function makeSpikeTexture(): THREE.CanvasTexture {
  return makeLightTexture(512, (x, y) => {
    const spike = (along: number, across: number): number => {
      const a = Math.abs(along);
      const length = Math.pow(Math.max(0, 1 - a), 2.4);
      const thin = Math.exp(-Math.abs(across) * 90) + 0.25 * Math.exp(-Math.abs(across) * 24);
      return length * thin;
    };
    const i = Math.min(1, spike(x, y) + spike(y, x)) * (1 - smoothstep(0.9, 1, Math.max(Math.abs(x), Math.abs(y))));
    return [i, i * 0.95, i * 0.84];
  });
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
