// 太陽・惑星・月・(引きの眺めの)ボイジャーの描画。
// 球は「カメラを中心に縮めて」置く(placement.ts)。遠い順に描き、奥行きの判定は使わない。
// 画面上の半径が 1.5px より小さい球は、球の代わりに光の点で描く。
import * as THREE from 'three';
import { BODY_RADIUS_KM, PLANET_IDS, type BodyId } from '../lib/bodies';
import type { Ephemeris } from '../lib/ephemeris';
import type { FrameContext } from './frame';
import { projectToScreen, screenRadiusPx } from './frame';
import { length, normalize, sub, type Vec3 } from './math';
import { relativePosition, shellPlacement, SHELL } from './placement';
import type { Theme } from './theme';
import { makeCoreTexture, makeDotTexture, makeGlowTexture } from './textures';

/** この半径(px)より小さい球は、光の点で描く */
const DOT_BELOW_PX = 1.5;
/** ボイジャーの点・名前を出す、カメラからの最小の距離(km)。視界から切り替えた直後は出さない */
const VOYAGER_MARK_MIN_KM = 1e5;

interface BodyStyle {
  color: string;
  /** 点で描く時の大きさ(CSS px) */
  dotPx: number;
}

// 色は第 1 段階の仮の色。地球だけ app.css の --color-earth(淡い青)を使う
const STYLES: Record<Exclude<BodyId, 'voyager1' | 'earth' | 'sun'>, BodyStyle> = {
  mercury: { color: '#a39d92', dotPx: 4 },
  venus: { color: '#dcc590', dotPx: 5 },
  moon: { color: '#bdbab2', dotPx: 3.5 },
  mars: { color: '#c8704f', dotPx: 4.5 },
  jupiter: { color: '#d3b08c', dotPx: 5.5 },
  saturn: { color: '#dccb9a', dotPx: 5 },
  uranus: { color: '#a5d6da', dotPx: 4.5 },
  neptune: { color: '#6e8fe0', dotPx: 4.5 },
};
const SUN_SPHERE_COLOR = '#fff6e2';
const EARTH_DOT_PX = 5.5;

/** 描く天体の順番(月は範囲の中だけ) */
const DRAWN: readonly Exclude<BodyId, 'voyager1'>[] = ['sun', ...PLANET_IDS, 'moon'];

const sphereVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    // 球は回さないので、物体の法線がそのまま世界の向きになる
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const sphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uEmissive;
  varying vec3 vNormal;
  void main() {
    float l = dot(normalize(vNormal), uLight);
    // 昼と夜の境は少しだけぼかし、夜の側は暗く(真っ黒にはしない)
    float lit = smoothstep(-0.04, 0.6, l);
    vec3 c = mix(uColor * 0.1, uColor, lit);
    gl_FragColor = vec4(mix(c, uColor, uEmissive), 1.0);
  }
`;

/** 目印の層に渡す、天体ごとの画面の情報 */
export interface BodyScreenInfo {
  id: BodyId;
  /** 画面の位置(CSS px)。カメラの後ろなら null */
  screen: { x: number; y: number } | null;
  /** 画面上の半径(px) */
  radiusPx: number;
  distance: number;
}

interface BodyItem {
  id: Exclude<BodyId, 'voyager1'>;
  sphere: THREE.Mesh;
  uniforms: { uColor: { value: THREE.Color }; uLight: { value: THREE.Vector3 }; uEmissive: { value: number } };
  dot: THREE.Sprite | null;
  dotPx: number;
}

export class Bodies {
  readonly group = new THREE.Group();
  private items: BodyItem[] = [];
  private sphereGeometry = new THREE.SphereGeometry(1, 64, 48);
  private textures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];
  /** 太陽の光のにじみの大きさの倍率(見た目のトークン) */
  private glare = 1;
  private glow: THREE.Sprite;
  private core: THREE.Sprite;
  private voyagerDot: THREE.Sprite;
  private eph: Ephemeris;

  // 毎フレーム使う作業用
  private rel: Vec3 = [0, 0, 0];
  private sunRel: Vec3 = [0, 0, 0];
  private tmp: Vec3 = [0, 0, 0];
  private order: { item: BodyItem; d: number }[] = [];
  private sunPos = new THREE.Vector3();
  private sunDiscPx = 0;

  constructor(eph: Ephemeris, theme: Theme) {
    this.glare = theme.sunGlare;
    this.eph = eph;
    const dotTex = makeDotTexture();
    const glowTex = makeGlowTexture();
    const coreTex = makeCoreTexture();
    this.textures.push(dotTex, glowTex, coreTex);

    for (const id of DRAWN) {
      const uColor = { value: new THREE.Color(id === 'sun' ? SUN_SPHERE_COLOR : id === 'earth' ? theme.earth : STYLES[id].color) };
      const uniforms = { uColor, uLight: { value: new THREE.Vector3(1, 0, 0) }, uEmissive: { value: id === 'sun' ? 1 : 0 } };
      const material = new THREE.ShaderMaterial({
        vertexShader: sphereVertex,
        fragmentShader: sphereFragment,
        uniforms,
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
          color: uColor.value,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        this.materials.push(dm);
        dot = new THREE.Sprite(dm);
        dot.frustumCulled = false;
        this.group.add(dot);
      }
      const dotPx = id === 'earth' ? EARTH_DOT_PX : id === 'sun' ? 0 : STYLES[id].dotPx;
      this.items.push({ id, sphere, uniforms, dot, dotPx });
    }

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

  /** 位置を更新し、目印の層に渡す画面の情報を返す */
  update(ctx: FrameContext): BodyScreenInfo[] {
    const eph = this.eph;
    const et = ctx.et;
    // 画面の 1px が、縮めた球の距離(SHELL)で何 km にあたるか
    const kmPerPx = (2 * ctx.tanV * SHELL) / ctx.height;
    const moonRange = eph.coverage('moon');
    const infos: BodyScreenInfo[] = [];

    // 太陽の位置は、各天体の陰影の向きと、にじみの位置に使う
    relativePosition(eph.position('sun', 'voyager1', et, this.tmp), ctx.offset, this.sunRel);

    this.order.length = 0;
    for (const item of this.items) {
      const id = item.id;
      const inRange = id !== 'moon' || (et >= moonRange.t0 && et <= moonRange.t1);
      item.sphere.visible = false;
      if (item.dot) item.dot.visible = false;
      if (!inRange) continue;

      // 惑星のそばを通る間の相対位置は、太陽中心どうしの引き算でなく、直接取った値を使う
      relativePosition(eph.position(id, 'voyager1', et, this.tmp), ctx.offset, this.rel);
      const placement = shellPlacement(this.rel, BODY_RADIUS_KM[id]);
      const rPx = screenRadiusPx(BODY_RADIUS_KM[id], placement.distance, ctx);
      const [px, py, pz] = placement.position;
      if (id === 'sun') {
        this.sunPos.set(px, py, pz);
        this.sunDiscPx = Number.isFinite(rPx) ? rPx * 2 : 0;
      }

      if (rPx >= DOT_BELOW_PX) {
        item.sphere.visible = true;
        item.sphere.position.set(px, py, pz);
        item.sphere.scale.setScalar(placement.radius);
        // 光が当たる向き = その天体から太陽への向き(倍精度の相対位置で出す)
        if (id === 'sun') item.uniforms.uLight.value.set(0, 0, 0);
        else {
          sub(this.sunRel, this.rel, this.tmp);
          normalize(this.tmp, this.tmp);
          item.uniforms.uLight.value.set(this.tmp[0], this.tmp[1], this.tmp[2]);
        }
      } else if (item.dot) {
        item.dot.visible = true;
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
      item.sphere.renderOrder = base;
      if (item.dot) item.dot.renderOrder = base;
      if (item.id === 'sun') this.layoutSun(base, ctx, kmPerPx);
    });
    if (!this.order.some((o) => o.item.id === 'sun')) {
      this.glow.visible = false;
      this.core.visible = false;
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

  /** 太陽のにじみと芯。大きさは距離が遠いほど小さくなるが、173 天文単位でも星より明るく見える大きさを保つ */
  private layoutSun(base: number, ctx: FrameContext, kmPerPx: number): void {
    const short = Math.min(ctx.width, ctx.height);
    // 点にしか見えない時は 56px。近づくほど太陽の円盤の大きさに比例して広がる(画面の短い辺の 0.9 倍まで)
    const glowPx = Math.min((56 + this.sunDiscPx * 5) * this.glare, short * 0.9);
    const corePx = Math.min(14 + this.sunDiscPx * 1.2, short * 0.4);
    this.glow.visible = true;
    this.core.visible = true;
    this.glow.position.copy(this.sunPos);
    this.core.position.copy(this.sunPos);
    this.glow.scale.setScalar(glowPx * kmPerPx);
    this.core.scale.setScalar(corePx * kmPerPx);
    this.glow.renderOrder = base + 1;
    this.core.renderOrder = base + 2;
  }

  dispose(): void {
    this.sphereGeometry.dispose();
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
  }
}
