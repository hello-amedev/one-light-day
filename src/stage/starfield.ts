// 星。約 8,900 個を 1 回の描画(THREE.Points)で出す。位置は単位ベクトル × 大きな半径で、カメラに付いて回る背景。
// 大きさは等級から決め、明るい星だけ少しにじむ。星は鋭い点で、ほとんどは 1.5px ほどの小さな点。
import * as THREE from 'three';
import { bvToRgb, STAR_STRIDE, type StarCatalog } from '../lib/stars';

/** 星を置く半径(km)。near/far の内側で、線や球より遠い */
const STAR_RADIUS = 1e8;
/** 星の最小の大きさ(CSS px)。画素比を掛けて使う */
const MIN_SIZE_PX = 1.5;

const vertex = /* glsl */ `
  attribute float aMag;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uGain;
  varying vec3 vColor;
  varying float vCore;
  varying float vHalo;
  varying float vLum;
  varying float vSize;
  void main() {
    // 明るさ 0(6.5 等)〜 1(0 等より明るい)
    float b = clamp((6.5 - aMag) / 6.5, 0.0, 1.0);
    float core = 0.55 + 0.75 * b;            // 芯の半径(px)
    float halo = 6.0 * pow(b, 3.0) * uGain;  // にじみの半径(px)。明るい星だけ大きい
    // 6.5 等より暗い星(8 等までを足した時)は、暗くなるほど光を落とす。同じ明るさの点が増えて砂のように見えるのを防ぐ
    float faint = aMag > 6.5 ? max(0.22, 1.0 - (aMag - 6.5) * 0.5) : 1.0;
    float size = max(${MIN_SIZE_PX.toFixed(1)}, 2.0 * max(core * 1.8, halo));
    vColor = aColor;
    vCore = core;
    vHalo = halo;
    vLum = (0.32 + 0.68 * sqrt(b)) * faint * uGain;
    vSize = size;
    gl_PointSize = size * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vCore;
  varying float vHalo;
  varying float vLum;
  varying float vSize;
  void main() {
    // 点の中心からの距離(px)
    float d = length(gl_PointCoord - 0.5) * vSize;
    float core = exp(-(d * d) / (vCore * vCore) * 1.2);
    float halo = vHalo > 0.01 ? 0.22 * exp(-(d * d) / (vHalo * vHalo) * 2.0) : 0.0;
    float a = (core + halo) * vLum;
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

export interface Starfield {
  object: THREE.Points;
  setPixelRatio(pr: number): void;
  dispose(): void;
}

export function createStarfield(stars: StarCatalog, gain = 1): Starfield {
  const n = stars.count;
  const pos = new Float32Array(n * 3);
  const mag = new Float32Array(n);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * STAR_STRIDE;
    pos[i * 3] = stars.data[o] * STAR_RADIUS;
    pos[i * 3 + 1] = stars.data[o + 1] * STAR_RADIUS;
    pos[i * 3 + 2] = stars.data[o + 2] * STAR_RADIUS;
    mag[i] = stars.data[o + 3];
    const [r, g, b] = bvToRgb(stars.data[o + 4]);
    col[i * 3] = r;
    col[i * 3 + 1] = g;
    col[i * 3 + 2] = b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(col, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uPixelRatio: { value: 1 }, uGain: { value: gain } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;
  object.renderOrder = 0;

  return {
    object,
    setPixelRatio(pr) {
      material.uniforms.uPixelRatio.value = pr;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
