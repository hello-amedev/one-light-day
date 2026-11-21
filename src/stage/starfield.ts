// 星。約 8,900 個を 1 回の描画(THREE.Points)で出す。位置は単位ベクトル × 大きな半径で、カメラに付いて回る背景。
// 暗い星(8 等まで。約 3 万個)は、拡大した時に後から足す別の層で、ふっと現れる(addDeep)。
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
  uniform float uAlpha;
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
    vLum = (0.32 + 0.68 * sqrt(b)) * faint * uGain * uAlpha;
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

/** 暗い星の層が現れる・消える時間(秒) */
const DEEP_FADE_S = 0.6;

export interface Starfield {
  /** 星の層をまとめたもの(基本の層と、足した暗い星の層) */
  object: THREE.Group;
  setPixelRatio(pr: number): void;
  /** 暗い星のカタログを足す(1 回だけ)。足した層は、setDeepVisible(true) になるまで見えない */
  addDeep(stars: StarCatalog): void;
  /** 暗い星の層を見せる・隠す。すっと(0.6 秒で)変わる。層が無い間は覚えておく */
  setDeepVisible(on: boolean): void;
  /** 毎コマ呼ぶ。暗い星の層が変わっている間(描き直しを続ける間)は true を返す */
  update(dtSec: number): boolean;
  dispose(): void;
}

function buildLayer(stars: StarCatalog, gain: number, alpha: number): { points: THREE.Points; material: THREE.ShaderMaterial } {
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
    uniforms: { uPixelRatio: { value: 1 }, uGain: { value: gain }, uAlpha: { value: alpha } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 0;
  return { points, material };
}

export function createStarfield(stars: StarCatalog, gain = 1): Starfield {
  const object = new THREE.Group();
  const base = buildLayer(stars, gain, 1);
  object.add(base.points);
  let pixelRatio = 1;
  let deep: { points: THREE.Points; material: THREE.ShaderMaterial } | null = null;
  let deepTarget = 0;
  let deepAlpha = 0;

  return {
    object,
    setPixelRatio(pr) {
      pixelRatio = pr;
      base.material.uniforms.uPixelRatio.value = pr;
      if (deep) deep.material.uniforms.uPixelRatio.value = pr;
    },
    addDeep(more) {
      if (deep) return;
      deep = buildLayer(more, gain, 0);
      deep.material.uniforms.uPixelRatio.value = pixelRatio;
      deepAlpha = 0;
      deep.points.visible = false;
      object.add(deep.points);
    },
    setDeepVisible(on) {
      deepTarget = on ? 1 : 0;
    },
    update(dtSec) {
      // 層が来るまでは進めない(来た時に、0 から現れる)
      if (!deep || deepAlpha === deepTarget) return false;
      deepAlpha += Math.sign(deepTarget - deepAlpha) * Math.min(Math.abs(deepTarget - deepAlpha), dtSec / DEEP_FADE_S);
      deep.material.uniforms.uAlpha.value = deepAlpha * deepAlpha * (3 - 2 * deepAlpha);
      deep.points.visible = deepAlpha > 0;
      return deepAlpha !== deepTarget;
    },
    dispose() {
      base.points.geometry.dispose();
      base.material.dispose();
      if (deep) {
        deep.points.geometry.dispose();
        deep.material.dispose();
      }
    },
  };
}
