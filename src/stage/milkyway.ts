// 背景の天の川。星と同じく「カメラに付いて回る、無限に遠い背景」で、星より奥(最初)に描く。
// 画像は赤道座標(赤経・赤緯)の正距円筒図。サイトの座標は黄道 J2000 なので、向きは画素ごとにシェーダーで変換する
// (球の貼り方や UV の継ぎ目に頼らず、方向 → 画像の位置を 1 つの式で決める。同じ式を TypeScript にも置き、向きの検査に使う)。
import * as THREE from 'three';
import { DEG, type Vec3 } from './math';

/** 黄道傾斜角(J2000)。黄道 ↔ 赤道の変換に使う */
export const OBLIQUITY_DEG = 23.4392911;

/** 画像の左端の赤経(度)。右へ行くと赤経が減る(manifest の ra0 と raIncreasesRight=false) */
const RA0_DEG = 180;

/** 天の川を置く半径(km)。星(1e8)より遠く、far(1e13)の内側 */
const SKY_RADIUS = 5e8;

/** 読み込みが終わってから、淡く浮かび上がるまでの秒数 */
const FADE_S = 1;

/** 画面の短い辺 × 画素比がこれ未満(または粗いポインタ)なら、小さい画像を使う */
const LO_BELOW_PX = 1000;

/** 視野(縦、度)がこれ以下では画像の粗さが目立つので、明るさを落とす。落とす下限の倍率は NARROW_GAIN */
const NARROW_FOV_DEG = 20;
const MIN_FOV_DEG = 2;
const NARROW_GAIN = 0.55;

/** 画像の値を沈めるべき乗と、標準の明るさ(トークン --milkyway-gain = 1 の時の倍率) */
const CURVE = 1.9;
const BASE_GAIN = 0.5;

/** 黄道 J2000 の向き(単位ベクトル)→ 画像の位置(u: 左端 0〜右端 1、v: 下端 0〜上端 1) */
export function skyUV(dir: Vec3): { u: number; v: number } {
  const e = OBLIQUITY_DEG * DEG;
  const c = Math.cos(e);
  const s = Math.sin(e);
  const len = Math.hypot(dir[0], dir[1], dir[2]);
  const x = dir[0] / len;
  const y = dir[1] / len;
  const z = dir[2] / len;
  // 黄道 → 赤道(x 軸まわりに黄道傾斜角だけ回す)
  const xe = x;
  const ye = y * c - z * s;
  const ze = y * s + z * c;
  const ra = Math.atan2(ye, xe); // -π〜π(度なら -180〜180)
  const dec = Math.asin(Math.max(-1, Math.min(1, ze)));
  // 赤経 RA0 が左端、右へ行くと減る。ra は ±180 の表し方なので、RA0=180 のとき u = 0.5 - ra/360
  const u = (RA0_DEG - 180) / 360 + 0.5 - ra / (2 * Math.PI);
  const v = 0.5 + dec / Math.PI;
  return { u: ((u % 1) + 1) % 1, v };
}

/** 赤道座標(度)→ 黄道 J2000 の向き(検査用。画像の中の目印の位置を、天文の座標から求める) */
export function equatorialToEcliptic(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const xe = Math.cos(dec) * Math.cos(ra);
  const ye = Math.cos(dec) * Math.sin(ra);
  const ze = Math.sin(dec);
  const e = OBLIQUITY_DEG * DEG;
  const c = Math.cos(e);
  const s = Math.sin(e);
  return [xe, ye * c + ze * s, -ye * s + ze * c];
}

export type MilkywayVariant = 'hi' | 'lo';

/** 大きい画像(PC)か小さい画像(スマホ)か。画面の短い辺 × 画素比が 1,000px 未満、またはポインタが粗いなら小さいほう */
export function pickMilkywayVariant(shortSidePx: number, pixelRatio: number, coarsePointer: boolean): MilkywayVariant {
  return coarsePointer || shortSidePx * pixelRatio < LO_BELOW_PX ? 'lo' : 'hi';
}

/** 望遠で寄った時の明るさの倍率(1 = そのまま)。画像が粗くなる分、目立たないよう少し落とす */
export function narrowFovGain(verticalFovDeg: number): number {
  const s = Math.min(1, Math.max(0, (verticalFovDeg - MIN_FOV_DEG) / (NARROW_FOV_DEG - MIN_FOV_DEG)));
  const smooth = s * s * (3 - 2 * s);
  return NARROW_GAIN + (1 - NARROW_GAIN) * smooth;
}

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    // 球はカメラ(原点)を中心に置くので、頂点の位置がそのまま世界の向きになる
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uGain;
  varying vec3 vDir;
  const float PI = 3.14159265358979;
  const float OBLIQ = ${(OBLIQUITY_DEG * DEG).toFixed(12)};
  void main() {
    vec3 d = normalize(vDir);
    float c = cos(OBLIQ);
    float s = sin(OBLIQ);
    vec3 e = vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);
    float ra = atan(e.y, e.x);
    float dec = asin(clamp(e.z, -1.0, 1.0));
    float u = 0.5 - ra / (2.0 * PI);
    float v = 0.5 + dec / PI;
    // 画像の継ぎ目(赤経 ±180 度)をまたぐ画素は u が 0 と 1 で飛び、細かさの判定(ミップマップ)が狂って線が出る。
    // 0.5 ずらした u2 は継ぎ目が別の所にあるので、傾きの小さいほうを細かさの判定に使う
    float u2 = fract(u + 0.5);
    vec2 gx1 = vec2(dFdx(u), dFdx(v));
    vec2 gy1 = vec2(dFdy(u), dFdy(v));
    vec2 gx2 = vec2(dFdx(u2), dFdx(v));
    vec2 gy2 = vec2(dFdy(u2), dFdy(v));
    bool alt = abs(gx2.x) + abs(gy2.x) < abs(gx1.x) + abs(gy1.x);
    vec2 gx = alt ? gx2 : gx1;
    vec2 gy = alt ? gy2 : gy1;
    vec3 tex = textureGrad(uMap, vec2(u, v), gx, gy).rgb;
    // 画像は 8bit に落とす時にガンマで持ち上げてある。そのままでは星空の主役を奪うので、暗い所を沈めて帯の濃い所だけ残す
    gl_FragColor = vec4(pow(tex, vec3(${CURVE.toFixed(2)})) * uGain, 1.0);
  }
`;

export interface Milkyway {
  /** 最初のコマを描いた後に呼ぶ。画像を読み込み、終わったら淡く浮かび上がらせる */
  load(): void;
  /** 毎コマ呼ぶ。明るさを更新し、浮かび上がっている間(描き直しを続ける間)は true を返す */
  update(nowMs: number, verticalFovDeg: number): boolean;
  object: THREE.Mesh;
  dispose(): void;
}

export interface MilkywayOptions {
  /** 画像の置き場所(例: BASE_URL + 'textures/') */
  baseUrl: string;
  variant: MilkywayVariant;
  /** トークン --milkyway-gain */
  gain: number;
  /** 画像が読み込めた時(描き直しを予約するため) */
  onLoad: () => void;
}

export function createMilkyway(options: MilkywayOptions): Milkyway {
  const geometry = new THREE.SphereGeometry(SKY_RADIUS, 24, 16);
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uMap: { value: null }, uGain: { value: 0 } },
    // 星・太陽の光と同じ足し合わせ。画像は淡く調整済みなので、地の色に足すだけで足りる
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  });
  const object = new THREE.Mesh(geometry, material);
  object.frustumCulled = false;
  // 星(0)より前に描く。奥行きの判定は使わないので、描く順番だけで奥になる
  object.renderOrder = -10;
  object.visible = false;

  let texture: THREE.Texture | null = null;
  let loadedAtMs: number | null = null;
  let started = false;
  let disposed = false;
  let fading = false;

  return {
    object,
    load() {
      if (started || disposed) return;
      started = true;
      new THREE.TextureLoader().load(
        `${options.baseUrl}milkyway.${options.variant}.jpg`,
        (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          // 左右は赤経でつながっている(継ぎ目をまたぐ補間のため繰り返し)。上下は端の行
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = 4;
          texture = tex;
          material.uniforms.uMap.value = tex;
          object.visible = true;
          fading = true;
          options.onLoad();
        },
        undefined,
        (error) => {
          // 読み込めなくても星空だけで動き続ける
          console.warn('milkyway texture failed to load', error);
        },
      );
    },
    update(nowMs, verticalFovDeg) {
      if (!texture) return false;
      loadedAtMs ??= nowMs;
      const p = Math.min(1, (nowMs - loadedAtMs) / (FADE_S * 1000));
      const eased = p * p * (3 - 2 * p);
      material.uniforms.uGain.value = options.gain * BASE_GAIN * eased * narrowFovGain(verticalFovDeg);
      if (p >= 1) fading = false;
      return fading;
    },
    dispose() {
      disposed = true;
      geometry.dispose();
      material.dispose();
      texture?.dispose();
    },
  };
}
