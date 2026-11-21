// 太陽・惑星・衛星・(引きの眺めの)ボイジャーの描画。
// 球は「カメラを中心に縮めて」置く(placement.ts)。遠い順に描き、奥行きの判定は使わない。
// 画面上の半径が 1.5px より小さい球は、球の代わりに光の点で描く。
// 画像は、半径が 4px を超えてから読み込み、0.4 秒でなじませる(surfaceTextures.ts)。
// 土星は本体と環を 1 つのまとまりとして同じ倍率で置き、環は奥の半分 → 本体 → 手前の半分の順に描く。
import * as THREE from 'three';
import { BODY_RADIUS_KM, PLANET_IDS, SATELLITE_PARENT, type BodyId } from '../lib/bodies';
import type { Ephemeris } from '../lib/ephemeris';
import { AU_KM } from '../lib/ephemeris/types';
import {
  haloFragment,
  haloVertex,
  RING_HALF_KM,
  ringFragment,
  ringVertex,
  surfaceFragment,
  surfaceVertex,
} from './bodyShaders';
import { makeRingProfileTexture, makeSaturnSurfaceTexture } from './bodyTextures';
import type { FrameContext } from './frame';
import { projectToScreen, screenRadiusPx } from './frame';
import { clamp, length, normalize, sub, type Vec3 } from './math';
import { relativePosition, shellPlacement, SHELL } from './placement';
import { bodyToEcliptic, EQUATORIAL_RADIUS_KM, FLATTENING, ROTATION, toBodyFrame, type Mat3 } from './rotation';
import { SurfaceTextures } from './surfaceTextures';
import type { Theme } from './theme';
import { sunGlowSizes } from './zoomView';
import { makeCoreTexture, makeDotTexture, makeGlowTexture, makeSpikeTexture } from './textures';
import { moonlight } from './moonlight';

/** この半径(px)より小さい球は、光の点で描く */
export const DOT_BELOW_PX = 1.5;
/** 画像を読み込み始める半径(px) */
const LOAD_ABOVE_PX = 4;
/** 画像へなじませる時間(秒) */
const FADE_SECONDS = 0.4;
/** 大気の光を描き始める半径(px)。これより小さいと光の幅が 1px に満たない */
const HALO_ABOVE_PX = 6;
/** ボイジャーの点・名前を出す、カメラからの最小の距離(km)。視界から切り替えた直後は出さない */
const VOYAGER_MARK_MIN_KM = 1e5;
/** 土星の環の表の画像の幅 */
const RING_PROFILE_WIDTH = 4096;
/** 環の色合い(わずかに黄みのある白) */
const RING_TINT: readonly [number, number, number] = [1, 0.9, 0.72];

type DrawnId = Exclude<BodyId, 'voyager1'>;

interface BodyStyle {
  color: string;
  /** 点で描く時の大きさ(CSS px) */
  dotPx: number;
}

// 画像が来るまで(と、画像を持たない天体)の色。地球だけ app.css の --color-earth(淡い青)を使う
export const STYLES: Record<Exclude<DrawnId, 'earth' | 'sun'>, BodyStyle> = {
  mercury: { color: '#a39d92', dotPx: 4 },
  venus: { color: '#dcc590', dotPx: 5 },
  moon: { color: '#bdbab2', dotPx: 3.5 },
  mars: { color: '#c8704f', dotPx: 4.5 },
  jupiter: { color: '#d3b08c', dotPx: 5.5 },
  saturn: { color: '#dccb9a', dotPx: 5 },
  uranus: { color: '#a5d6da', dotPx: 4.5 },
  neptune: { color: '#6e8fe0', dotPx: 4.5 },
  io: { color: '#e0c060', dotPx: 3 },
  europa: { color: '#cdbfae', dotPx: 3 },
  ganymede: { color: '#a89c8c', dotPx: 3 },
  callisto: { color: '#7d7468', dotPx: 3 },
  // タイタンは画像を使わず、橙色のもやの球として描く
  titan: { color: '#d99a45', dotPx: 3 },
};
const SUN_SPHERE_COLOR = '#fff6e2';
/** 地球の点の大きさ(CSS px)。ほかの惑星は STYLES */
export const EARTH_DOT_PX = 5.5;

/** 画像を貼る天体(public/textures の名前と同じ) */
const IMAGE_BODIES: ReadonlySet<DrawnId> = new Set(['earth', 'moon', 'jupiter', 'io', 'europa', 'ganymede', 'callisto']);

interface Shading {
  /** 昼夜の境の広がり(小さいほど広い)と、明るさの立ち上がり(小さいほど平ら) */
  term: [number, number];
  /** 縁に向かって暗くなる強さ */
  limb: number;
  /** 夜の側に残す光(線形)。真っ黒にならないように */
  night: [number, number, number];
}
const FLAT_SHADING: Shading = { term: [-0.05, 0.6], limb: 0, night: [0.0007, 0.001, 0.0018] };
const SHADING: Partial<Record<DrawnId, Shading>> = {
  // 地球の夜の側は月明かりで照らす(uMoonLight)。月の届かない所はごく暗い青だけを残す
  earth: { term: [-0.1, 0.9], limb: 0, night: [0.0003, 0.0005, 0.0009] },
  moon: { term: [-0.06, 0.4], limb: 0, night: [0.0007, 0.001, 0.0018] },
  jupiter: { term: [-0.16, 0.8], limb: 0.5, night: [0.0007, 0.001, 0.0018] },
  saturn: { term: [-0.14, 0.8], limb: 0.42, night: [0.0007, 0.001, 0.0018] },
  io: { term: [-0.12, 0.6], limb: 0.08, night: [0.0007, 0.001, 0.0018] },
  europa: { term: [-0.12, 0.6], limb: 0.08, night: [0.0007, 0.001, 0.0018] },
  ganymede: { term: [-0.12, 0.6], limb: 0.08, night: [0.0007, 0.001, 0.0018] },
  callisto: { term: [-0.12, 0.6], limb: 0.08, night: [0.0007, 0.001, 0.0018] },
  // タイタンは厚いもやが光を散らすので、昼夜の境がとても広い
  titan: { term: [-0.55, 0.9], limb: 0, night: [0.0022, 0.0011, 0.0003] },
};

interface HaloSpec {
  /** 殻の大きさ(球の半径に対する倍率) */
  scale: number;
  color: [number, number, number];
  core: [number, number, number];
  /** 縁からにじむ幅(球の半径に対する割合)と、にじみが消える幅 */
  h: number;
  outer: number;
  rim: number;
  ambient: number;
  forward: number;
  inner: number;
  innerPow: number;
}
const HALOS: Partial<Record<DrawnId, HaloSpec>> = {
  // 地球: 縁に細く淡い青い光。昼の側が明るく、夜の側へ消える。太陽が後ろにある時は縁を取り巻く
  earth: {
    scale: 1.1,
    color: [0.3, 0.56, 1],
    core: [0.62, 0.8, 1],
    h: 0.011,
    outer: 0.09,
    rim: 1,
    ambient: 0.1,
    forward: 0.9,
    inner: 0.85,
    innerPow: 3.6,
  },
  // タイタン: 橙色のもやの層が縁の外へにじむ
  titan: {
    scale: 1.3,
    color: [1, 0.6, 0.2],
    core: [1, 0.74, 0.38],
    h: 0.055,
    outer: 0.28,
    rim: 0.55,
    ambient: 0.16,
    forward: 0.9,
    inner: 0.5,
    innerPow: 2.2,
  },
};

/** 描く天体の順番(衛星は位置データがある範囲の中だけ) */
const SATELLITES = Object.keys(SATELLITE_PARENT) as (keyof typeof SATELLITE_PARENT)[];
const DRAWN: readonly DrawnId[] = ['sun', ...PLANET_IDS, ...SATELLITES];

/** 目印の層に渡す、天体ごとの画面の情報 */
export interface BodyScreenInfo {
  id: BodyId;
  /** 画面の位置(CSS px)。カメラの後ろなら null */
  screen: { x: number; y: number } | null;
  /** 画面上の半径(px) */
  radiusPx: number;
  distance: number;
}

type U<T> = { value: T };
interface SurfaceUniforms {
  uRot: U<THREE.Matrix3>;
  uFlat: U<number>;
  uTex: U<THREE.Texture>;
  uFade: U<number>;
  uOffU: U<number>;
  uColor: U<THREE.Color>;
  uLight: U<THREE.Vector3>;
  uTerm: U<THREE.Vector2>;
  uLimb: U<number>;
  uNight: U<THREE.Vector3>;
  uMoonDir: U<THREE.Vector3>;
  uMoonLight: U<number>;
  uEmissive: U<number>;
  uProfile: U<THREE.Texture>;
  uLightBody: U<THREE.Vector3>;
  uEqKm: U<number>;
}

interface HaloItem {
  mesh: THREE.Mesh;
  spec: HaloSpec;
  uniforms: Record<string, U<unknown>> & {
    uCenter: U<THREE.Vector3>;
    uRadius: U<number>;
    uLight: U<THREE.Vector3>;
  };
}

interface RingItem {
  back: THREE.Mesh;
  front: THREE.Mesh;
  /** 奥・手前で共有しない値(uHalf)以外は同じ値を指す */
  uniforms: { uCenter: U<THREE.Vector3>; uRadius: U<number>; uLightBody: U<THREE.Vector3>; uRot: U<THREE.Matrix3> }[];
}

interface BodyItem {
  id: DrawnId;
  sphere: THREE.Mesh;
  uniforms: SurfaceUniforms;
  dot: THREE.Sprite | null;
  dotPx: number;
  radiusKm: number;
  halo: HaloItem | null;
  ring: RingItem | null;
  /** 画像(または土星の表面)を貼り終えているか */
  textured: boolean;
  /** なじませの開始時刻(ms)。null ならなじませ中ではない */
  fadeStart: number | null;
}

/** z を極にした球(経度は -180〜180 度が u = 0〜1、緯度は南北が v = 0〜1)。天体固定の座標で作る */
function createSphereGeometry(wSeg: number, hSeg: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= hSeg; j++) {
    const v = j / hSeg;
    const lat = (v - 0.5) * Math.PI;
    for (let i = 0; i <= wSeg; i++) {
      const u = i / wSeg;
      const lon = (u - 0.5) * 2 * Math.PI;
      pos.push(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
      uvs.push(u, v);
    }
  }
  const row = wSeg + 1;
  for (let j = 0; j < hSeg; j++) {
    for (let i = 0; i < wSeg; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      // 外から見て反時計回りが表
      idx.push(a, b, d, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

export class Bodies {
  readonly group = new THREE.Group();
  private items: BodyItem[] = [];
  private sphereGeometry = createSphereGeometry(128, 64);
  private haloGeometry = createSphereGeometry(64, 32);
  private ringGeometry = new THREE.PlaneGeometry(2, 2);
  private textures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];
  private surfaces: SurfaceTextures;
  private blank: THREE.DataTexture;
  /** 環の表(土星が見え始めてから作る) */
  private ringProfile: THREE.DataTexture | null = null;
  /** 太陽の光のにじみの大きさの倍率(見た目のトークン) */
  private glare = 1;
  private glow: THREE.Sprite;
  private core: THREE.Sprite;
  private spikes: THREE.Sprite;
  private voyagerDot: THREE.Sprite;
  private eph: Ephemeris;
  private fading = false;

  // 毎フレーム使う作業用
  private rel: Vec3 = [0, 0, 0];
  private sunRel: Vec3 = [0, 0, 0];
  private tmp: Vec3 = [0, 0, 0];
  private light: Vec3 = [1, 0, 0];
  private lightBody: Vec3 = [1, 0, 0];
  private moonDir: Vec3 = [1, 0, 0];
  private earthToMoon: Vec3 = [0, 0, 0];
  private earthToSun: Vec3 = [0, 0, 0];
  /** 満月の時の月明かりの強さ(app.css の --earth-moonlight) */
  private moonlightGain: number;
  private rot: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  private order: { item: BodyItem; d: number }[] = [];
  private sunPos = new THREE.Vector3();
  private sunDiscPx = 0;
  private sunDistanceKm = 0;

  constructor(
    eph: Ephemeris,
    theme: Theme,
    options: { maxTextureSize: number; maxAnisotropy: number; onTextureLoaded: () => void },
  ) {
    this.glare = theme.sunGlare;
    this.moonlightGain = theme.earthMoonlight;
    this.eph = eph;
    this.surfaces = new SurfaceTextures({
      maxTextureSize: options.maxTextureSize,
      maxAnisotropy: options.maxAnisotropy,
      onLoaded: options.onTextureLoaded,
    });
    this.blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    this.blank.needsUpdate = true;
    const dotTex = makeDotTexture();
    const glowTex = makeGlowTexture();
    const coreTex = makeCoreTexture();
    const spikeTex = makeSpikeTexture();
    this.textures.push(dotTex, glowTex, coreTex, spikeTex, this.blank);

    for (const id of DRAWN) this.items.push(this.createItem(id, theme, dotTex));

    const additive = (map: THREE.Texture): THREE.Sprite => {
      const m = new THREE.SpriteMaterial({
        map,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      this.materials.push(m);
      const s = new THREE.Sprite(m);
      s.frustumCulled = false;
      this.group.add(s);
      return s;
    };
    this.glow = additive(glowTex);
    this.spikes = additive(spikeTex);
    this.core = additive(coreTex);

    const vm = new THREE.SpriteMaterial({
      map: dotTex,
      color: new THREE.Color(theme.gold),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.materials.push(vm);
    this.voyagerDot = new THREE.Sprite(vm);
    this.voyagerDot.frustumCulled = false;
    this.voyagerDot.renderOrder = 1000;
    this.group.add(this.voyagerDot);
  }

  private createItem(id: DrawnId, theme: Theme, dotTex: THREE.Texture): BodyItem {
    const shading = SHADING[id] ?? FLAT_SHADING;
    const flat = FLATTENING[id] ?? 0;
    const color = id === 'sun' ? SUN_SPHERE_COLOR : id === 'earth' ? theme.earth : STYLES[id].color;
    const uniforms: SurfaceUniforms = {
      uRot: { value: new THREE.Matrix3() },
      uFlat: { value: 1 - flat },
      uTex: { value: this.blank },
      uFade: { value: 0 },
      uOffU: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uLight: { value: new THREE.Vector3(1, 0, 0) },
      uTerm: { value: new THREE.Vector2(shading.term[0], shading.term[1]) },
      uLimb: { value: shading.limb },
      uNight: { value: new THREE.Vector3(...shading.night) },
      uMoonDir: { value: new THREE.Vector3(1, 0, 0) },
      uMoonLight: { value: 0 },
      uEmissive: { value: id === 'sun' ? 1 : 0 },
      uProfile: { value: this.blank },
      uLightBody: { value: new THREE.Vector3(1, 0, 0) },
      uEqKm: { value: EQUATORIAL_RADIUS_KM[id] ?? BODY_RADIUS_KM[id] },
    };
    const defines: Record<string, string> = {};
    if (IMAGE_BODIES.has(id) || id === 'saturn') defines.USE_TEX = '';
    if (id === 'saturn') defines.RING_SHADOW = '';
    const material = new THREE.ShaderMaterial({
      vertexShader: surfaceVertex,
      fragmentShader: surfaceFragment,
      uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
      defines,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    this.materials.push(material);
    const sphere = new THREE.Mesh(this.sphereGeometry, material);
    sphere.frustumCulled = false;
    this.group.add(sphere);

    let dot: THREE.Sprite | null = null;
    if (id !== 'sun') {
      const dm = new THREE.SpriteMaterial({
        map: dotTex,
        color: uniforms.uColor.value,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      this.materials.push(dm);
      dot = new THREE.Sprite(dm);
      dot.frustumCulled = false;
      this.group.add(dot);
    }

    const halo = HALOS[id] ? this.createHalo(HALOS[id]) : null;
    const ring = id === 'saturn' ? this.createRing(uniforms, flat) : null;
    const dotPx = id === 'earth' ? EARTH_DOT_PX : id === 'sun' ? 0 : STYLES[id].dotPx;
    return {
      id,
      sphere,
      uniforms,
      dot,
      dotPx,
      radiusKm: EQUATORIAL_RADIUS_KM[id] ?? BODY_RADIUS_KM[id],
      halo,
      ring,
      textured: false,
      fadeStart: null,
    };
  }

  private createHalo(spec: HaloSpec): HaloItem {
    const uniforms = {
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 1 },
      uLight: { value: new THREE.Vector3(1, 0, 0) },
      uColor: { value: new THREE.Vector3(...spec.color) },
      uColorCore: { value: new THREE.Vector3(...spec.core) },
      uH: { value: spec.h },
      uOuter: { value: spec.outer },
      uRim: { value: spec.rim },
      uAmbient: { value: spec.ambient },
      uForward: { value: spec.forward },
      uInner: { value: spec.inner },
      uInnerPow: { value: spec.innerPow },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    this.materials.push(material);
    const mesh = new THREE.Mesh(this.haloGeometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.group.add(mesh);
    return { mesh, spec, uniforms };
  }

  private createRing(surface: SurfaceUniforms, flat: number): RingItem {
    const shared = {
      uProfile: surface.uProfile,
      uRot: surface.uRot,
      uLightBody: surface.uLightBody,
      uTint: { value: new THREE.Vector3(...RING_TINT) },
      uFlat: { value: 1 - flat },
      uEqKm: surface.uEqKm,
      uRadius: { value: 1 },
      uCenter: { value: new THREE.Vector3() },
      uHalfRatio: { value: RING_HALF_KM / (EQUATORIAL_RADIUS_KM.saturn ?? 60_268) },
    };
    const make = (half: number): THREE.Mesh => {
      const material = new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        uniforms: { ...shared, uHalf: { value: half } },
        transparent: true,
        // 色は環が出す光そのもの(alpha を掛ける前の値ではない)として出すので、混ぜ方を「色を足し、背景を alpha の分だけ隠す」にする
        premultipliedAlpha: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.materials.push(material);
      const mesh = new THREE.Mesh(this.ringGeometry, material);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.group.add(mesh);
      return mesh;
    };
    return { back: make(1), front: make(-1), uniforms: [shared] };
  }

  /** 画像のなじませの途中か(途中の間は毎フレーム描き直す) */
  get animating(): boolean {
    return this.fading;
  }

  /** 位置を更新し、目印の層に渡す画面の情報を返す。streaking は、点の代わりに弧で描く惑星 */
  update(ctx: FrameContext, streaking?: ReadonlySet<BodyId>): BodyScreenInfo[] {
    const eph = this.eph;
    const et = ctx.et;
    const nowMs = performance.now();
    // 画面の 1px が、縮めた球の距離(SHELL)で何 km にあたるか
    const kmPerPx = (2 * ctx.tanV * SHELL) / ctx.height;
    const infos: BodyScreenInfo[] = [];
    this.fading = false;

    // 太陽の位置は、各天体の陰影の向きと、にじみの位置に使う
    relativePosition(eph.position('sun', 'voyager1', et, this.tmp), ctx.offset, this.sunRel);
    this.sunDistanceKm = length(this.sunRel);

    this.order.length = 0;
    for (const item of this.items) {
      const id = item.id;
      // 衛星(と月)は、位置データがある範囲の中だけ描く
      let inRange = true;
      if (id in SATELLITE_PARENT) {
        const range = eph.coverage(id);
        inRange = et >= range.t0 && et <= range.t1;
      }
      item.sphere.visible = false;
      if (item.dot) item.dot.visible = false;
      if (item.halo) item.halo.mesh.visible = false;
      if (item.ring) item.ring.back.visible = item.ring.front.visible = false;
      if (!inRange) continue;

      // 惑星のそばを通る間の相対位置は、太陽中心どうしの引き算でなく、直接取った値を使う
      relativePosition(eph.position(id, 'voyager1', et, this.tmp), ctx.offset, this.rel);
      const placement = shellPlacement(this.rel, item.radiusKm);
      const rPx = screenRadiusPx(item.radiusKm, placement.distance, ctx);
      const [px, py, pz] = placement.position;
      if (id === 'sun') {
        this.sunPos.set(px, py, pz);
        this.sunDiscPx = Number.isFinite(rPx) ? rPx * 2 : 0;
      }

      if (rPx >= DOT_BELOW_PX) {
        this.drawSphere(item, placement, rPx, ctx, nowMs);
      } else if (item.dot) {
        // 早回しで残像の弧(streaks.ts)に替える惑星は、点を出さない
        item.dot.visible = !streaking?.has(id);
        item.dot.position.set(px, py, pz);
        item.dot.scale.setScalar(item.dotPx * kmPerPx);
      }
      this.order.push({ item, d: placement.distance });

      infos.push({
        id,
        screen: projectToScreen(this.rel, ctx),
        radiusPx: rPx,
        distance: placement.distance,
      });
    }

    // 遠い順に描く(奥行きの判定を使わない代わりの並び)
    this.order.sort((a, b) => b.d - a.d);
    this.order.forEach(({ item }, rank) => {
      const base = 10 + rank * 10;
      // 土星: 環の奥の半分(base - 2)→ 本体(base)→ 手前の半分(base + 2)。大気の光は本体の直後
      item.sphere.renderOrder = base;
      if (item.dot) item.dot.renderOrder = base;
      if (item.halo) item.halo.mesh.renderOrder = base + 1;
      if (item.ring) {
        item.ring.back.renderOrder = base - 2;
        item.ring.front.renderOrder = base + 2;
      }
      if (item.id === 'sun') this.layoutSun(base, ctx, kmPerPx);
    });
    if (!this.order.some((o) => o.item.id === 'sun')) {
      this.glow.visible = false;
      this.core.visible = false;
      this.spikes.visible = false;
    }

    // ボイジャー自身(引きの眺めで、カメラが離れている時)
    const vRel: Vec3 = [-ctx.offset[0], -ctx.offset[1], -ctx.offset[2]];
    const vd = length(vRel);
    const showVoyager = vd > VOYAGER_MARK_MIN_KM;
    this.voyagerDot.visible = showVoyager;
    if (showVoyager) {
      const p = shellPlacement(vRel, 1);
      this.voyagerDot.position.set(p.position[0], p.position[1], p.position[2]);
      this.voyagerDot.scale.setScalar(7 * kmPerPx);
      infos.push({ id: 'voyager1', screen: projectToScreen(vRel, ctx), radiusPx: 0, distance: vd });
    }
    return infos;
  }

  /** 球(と、あれば大気の光・環)の位置・向き・陰影の値を更新する */
  private drawSphere(
    item: BodyItem,
    placement: { position: Vec3; radius: number; distance: number },
    rPx: number,
    ctx: FrameContext,
    nowMs: number,
  ): void {
    const id = item.id;
    const u = item.uniforms;
    const [px, py, pz] = placement.position;
    item.sphere.visible = true;
    item.sphere.position.set(px, py, pz);
    item.sphere.scale.setScalar(placement.radius);

    // 光が当たる向き = その天体から太陽への向き(倍精度の相対位置で出す)
    if (id === 'sun') {
      this.light[0] = this.light[1] = this.light[2] = 0;
      u.uLight.value.set(0, 0, 0);
    } else {
      sub(this.sunRel, this.rel, this.tmp);
      normalize(this.tmp, this.light);
      u.uLight.value.set(this.light[0], this.light[1], this.light[2]);
    }

    // 地球の夜の側を照らす月明かり。月の位置データがある間だけ(打ち上げの直後。地球が大きく見えるのはこの間)
    if (id === 'earth') {
      const range = this.eph.coverage('moon');
      let strength = 0;
      if (ctx.et >= range.t0 && ctx.et <= range.t1) {
        this.eph.position('moon', 'earth', ctx.et, this.earthToMoon);
        this.eph.position('sun', 'earth', ctx.et, this.earthToSun);
        strength = moonlight(this.earthToMoon, this.earthToSun, this.moonDir) * this.moonlightGain;
      }
      u.uMoonDir.value.set(this.moonDir[0], this.moonDir[1], this.moonDir[2]);
      u.uMoonLight.value = strength;
    }

    // 自転の向き(天体固定の座標 → 黄道)
    const el = ROTATION[id];
    if (el) {
      bodyToEcliptic(el, ctx.et, this.rot);
      const m = this.rot;
      u.uRot.value.set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
      toBodyFrame(m, this.light, this.lightBody);
      u.uLightBody.value.set(this.lightBody[0], this.lightBody[1], this.lightBody[2]);
    }

    // 画像: 大きく見え始めてから読み込み、なじませる
    if (!item.textured && rPx > LOAD_ABOVE_PX) this.tryApplyTexture(item, nowMs);
    if (item.fadeStart !== null) {
      const f = clamp((nowMs - item.fadeStart) / (FADE_SECONDS * 1000), 0, 1);
      u.uFade.value = f * f * (3 - 2 * f);
      if (f >= 1) item.fadeStart = null;
      else this.fading = true;
    }

    if (item.halo && rPx > HALO_ABOVE_PX) {
      const h = item.halo;
      h.mesh.visible = true;
      h.mesh.position.set(px, py, pz);
      h.mesh.scale.setScalar(placement.radius * h.spec.scale);
      h.uniforms.uCenter.value.set(px, py, pz);
      h.uniforms.uRadius.value = placement.radius;
      h.uniforms.uLight.value.set(this.light[0], this.light[1], this.light[2]);
    }

    if (item.ring) {
      if (!this.ringProfile) {
        this.ringProfile = makeRingProfileTexture(RING_PROFILE_WIDTH);
        this.textures.push(this.ringProfile);
        u.uProfile.value = this.ringProfile;
      }
      for (const mesh of [item.ring.back, item.ring.front]) {
        mesh.visible = true;
        mesh.position.set(px, py, pz);
        mesh.scale.setScalar(placement.radius);
      }
      const r = item.ring.uniforms[0];
      r.uCenter.value.set(px, py, pz);
      r.uRadius.value = placement.radius;
    }
  }

  /** 画像(土星は自前の縞)が使えるなら貼って、なじませを始める */
  private tryApplyTexture(item: BodyItem, nowMs: number): void {
    const u = item.uniforms;
    if (item.id === 'saturn') {
      const tex = makeSaturnSurfaceTexture();
      this.textures.push(tex);
      u.uTex.value = tex;
      u.uOffU.value = 0;
    } else if (IMAGE_BODIES.has(item.id)) {
      const surface = this.surfaces.request(item.id);
      if (!surface) return;
      u.uTex.value = surface.texture;
      // 画像の左端の経度 lon0 と、球の u = 0 の経度(-180 度)の差
      u.uOffU.value = (-180 - surface.lon0) / 360;
    } else {
      return;
    }
    item.textured = true;
    item.fadeStart = nowMs;
    u.uFade.value = 0;
    this.fading = true;
  }

  /**
   * 太陽の光。にじみ + 芯 + 細い十字の光条。
   * 大きさは画面の px で決める(sunGlowSizes)。距離で変え、近くでは大きく、173 天文単位でも「ひときわ明るい星」と分かる大きさを保つ。
   * 拡大するほど縮めるので、上限まで拡大しても光が画面を覆わず、地球の点と見分けられる。
   */
  private layoutSun(base: number, ctx: FrameContext, kmPerPx: number): void {
    const { glowPx, corePx, spikePx, spikeOpacity } = sunGlowSizes({
      au: this.sunDistanceKm / AU_KM,
      discPx: this.sunDiscPx,
      shortPx: Math.min(ctx.width, ctx.height),
      glare: this.glare,
      zoom: ctx.zoom,
    });
    for (const s of [this.glow, this.core, this.spikes]) {
      s.visible = true;
      s.position.copy(this.sunPos);
    }
    this.glow.scale.setScalar(glowPx * kmPerPx);
    this.core.scale.setScalar(corePx * kmPerPx);
    this.spikes.scale.setScalar(spikePx * kmPerPx);
    (this.spikes.material as THREE.SpriteMaterial).opacity = spikeOpacity;
    this.glow.renderOrder = base + 1;
    this.spikes.renderOrder = base + 2;
    this.core.renderOrder = base + 3;
  }

  dispose(): void {
    this.sphereGeometry.dispose();
    this.haloGeometry.dispose();
    this.ringGeometry.dispose();
    this.surfaces.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
  }
}
