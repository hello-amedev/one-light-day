// ボイジャー本体の視点(第6段階)。機体のモデルを、そばから回して見る。
//
// - カメラの姿勢は pose() が返す。CameraRig は本体の視点の時、これをそのまま使う(ずれは数十 m、km の単位)
// - 主の場面(星・天体・線)を描いた後に render() で機体を重ねる。機体だけの場面を、奥行きを消してから描く
// - モデル(NASA 3D Resources の Voyager Probe (B))は、この視点を最初に開いた時だけ読み込む
import * as THREE from 'three';
import type { Ephemeris } from '../lib/ephemeris';
import type { CameraPose } from './camera';
import { craftOpacity, craftOrientation, modelUnitKm, type Mat3 } from './craftMath';
import type { FrameContext } from './frame';
import { DEG, clamp, cross, normalize, scale, type Vec3 } from './math';

export interface CraftViewOptions {
  eph: Ephemeris;
  /** モデルの読み込みが終わった時など、描き直しが要る時に呼ぶ */
  onChange: () => void;
}

/** 回す時の、仰角の限度 */
const EL_LIMIT = 80 * DEG;
/** 視点に入る・出る時に、機体が現れる・消える時間(秒) */
const FADE_SECONDS = 0.6;
/** 機体の場面のカメラの手前・奥の限度(km)。機体は数 m〜十数 m */
const NEAR_KM = 0.0002;
const FAR_KM = 0.5;

// モデルの形から決めた値(docs/assets/craft.md)。単位はモデルの座標
const MODEL_URL = 'models/voyager.glb';
/** 皿の軸(アンテナの向く先)。モデルの座標 */
const DISH_AXIS: Vec3 = [0, 1, 0];
/** 皿の軸のまわりの向きを決める目印(磁力計のブームの向き)。モデルの座標 */
const ROLL_REF: Vec3 = [0, 0, 1];
/** 皿の直径 */
const DISH_DIAMETER = 3.81;
/** 回る中心(モデルの座標) */
const CENTER: Vec3 = [0, 1.5, 0];

export class CraftView {
  private eph: Ephemeris;
  private onChange: () => void;
  /** アンテナの向き(地球の方)を基準にした、カメラの回り込みの角度 */
  private az = 24 * DEG;
  private el = 12 * DEG;

  private started = false;
  private loaded = false;
  private disposed = false;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(50, 1, NEAR_KM, FAR_KM);
  /** モデルを入れる枠。位置 = 機体の位置(カメラ相対)、向き = 地球へ向けた回転、大きさ = km への縮め */
  private pivot = new THREE.Group();
  private sun = new THREE.DirectionalLight(0xfff4e6, 3.6);
  private fill = new THREE.HemisphereLight(0x8a96b4, 0x2a2a34, 0.8);
  /** 影の側が真っ黒にならないための、カメラ側からのごく弱い光 */
  private rim = new THREE.DirectionalLight(0xaab6d4, 1.3);
  private materials: THREE.Material[] = [];
  private lastMs: number | null = null;
  private ramp = 0;
  private rampTarget = 0;

  // 毎フレームの new を避けるための置き場
  private vSun: Vec3 = [0, 0, 0];
  private vEarth: Vec3 = [0, 0, 0];
  private mat4 = new THREE.Matrix4();
  private orientedAt = NaN;

  constructor(options: CraftViewOptions) {
    this.eph = options.eph;
    this.onChange = options.onChange;
    this.pivot.matrixAutoUpdate = true;
    this.scene.add(this.pivot, this.sun, this.fill, this.rim);
    this.scene.add(this.sun.target);
  }

  /** 本体の視点に入った時に呼ぶ。最初の 1 回だけモデルの読み込みを始める */
  activate(): void {
    if (this.started) return;
    this.started = true;
    void this.load().catch((e: unknown) => {
      console.warn('Voyager model could not be loaded; the craft view will show no model.', e);
    });
  }

  private async load(): Promise<void> {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ]);
    const base = import.meta.env.BASE_URL;
    const draco = new DRACOLoader().setDecoderPath({
      js: `${base}draco/draco_wasm_wrapper.js`,
      wasm: `${base}draco/draco_decoder.wasm`,
    });
    const loader = new GLTFLoader().setDRACOLoader(draco);
    try {
      const gltf = await loader.loadAsync(`${base}${MODEL_URL}`);
      if (this.disposed) return;
      const model = gltf.scene;
      const mats = new Set<THREE.Material>();
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of list) mats.add(m);
      });
      this.materials = [...mats];
      // 向き・大きさ・中心は pivot で決める。モデルの中心を原点へ
      model.position.set(-CENTER[0], -CENTER[1], -CENTER[2]);
      this.pivot.add(model);
      const k = modelUnitKm(DISH_DIAMETER);
      this.pivot.scale.setScalar(k);
      this.loaded = true;
      this.onChange();
    } finally {
      draco.dispose();
    }
  }

  /** 動きの途中か(読み込み中のフェードなど。途中の間は毎フレーム描き直す) */
  get animating(): boolean {
    return this.ramp !== this.rampTarget;
  }

  /** ドラッグで機体のまわりを回る */
  drag(dx: number, dy: number): void {
    this.az -= dx * 0.4 * DEG;
    this.el = clamp(this.el + dy * 0.4 * DEG, -EL_LIMIT, EL_LIMIT);
  }

  /**
   * 本体の視点のカメラの姿勢。distanceM はカメラから機体までの距離(m)。
   * 機体の後ろ(地球と反対の側)から、アンテナの向く先(地球の方)を見る。az・el で回り込む
   */
  pose(et: number, distanceM: number): CameraPose {
    const toEarth = normalize(this.eph.position('earth', 'voyager1', et));
    const side = normalize(cross(toEarth, [0, 0, 1]));
    const up = cross(side, toEarth);
    const ca = Math.cos(this.az);
    const sa = Math.sin(this.az);
    const ce = Math.cos(this.el);
    const se = Math.sin(this.el);
    // カメラの位置(機体から見た向き)。az = 0, el = 0 で真後ろ
    const back: Vec3 = [
      -toEarth[0] * ca * ce + side[0] * sa * ce + up[0] * se,
      -toEarth[1] * ca * ce + side[1] * sa * ce + up[1] * se,
      -toEarth[2] * ca * ce + side[2] * sa * ce + up[2] * se,
    ];
    const offset = scale(back, distanceM / 1000);
    return { offset, forward: scale(back, -1), fov: 52 };
  }

  /** 主の場面を描いた後に、機体を重ねる。visible が false の時は(消え終えたら)何も描かない */
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, frame: FrameContext, visible: boolean): void {
    const now = performance.now();
    const dt = this.lastMs === null ? 0 : Math.min(0.1, (now - this.lastMs) / 1000);
    this.lastMs = now;
    this.rampTarget = visible && this.loaded ? 1 : 0;
    const step = dt / FADE_SECONDS;
    this.ramp += Math.sign(this.rampTarget - this.ramp) * Math.min(Math.abs(this.rampTarget - this.ramp), step);
    if (!this.animating) this.lastMs = null;
    if (!this.loaded) return;

    const off = Math.hypot(frame.offset[0], frame.offset[1], frame.offset[2]);
    const alpha = craftOpacity(this.ramp * this.ramp * (3 - 2 * this.ramp), off);
    if (alpha <= 0.002) return;

    // 向き: 皿の軸を地球へ。光: 太陽の方向から。時刻が変わった時だけ求め直す
    if (frame.et !== this.orientedAt) {
      this.orientedAt = frame.et;
      this.eph.position('earth', 'voyager1', frame.et, this.vEarth);
      this.eph.position('sun', 'voyager1', frame.et, this.vSun);
      const rot: Mat3 = craftOrientation(DISH_AXIS, ROLL_REF, this.vEarth);
      this.mat4.set(rot[0], rot[1], rot[2], 0, rot[3], rot[4], rot[5], 0, rot[6], rot[7], rot[8], 0, 0, 0, 0, 1);
      this.pivot.quaternion.setFromRotationMatrix(this.mat4);
      const sd = normalize(this.vSun);
      this.sun.position.set(sd[0], sd[1], sd[2]);
    }
    // 機体の位置 = ボイジャーのカメラに対するずれの逆
    this.pivot.position.set(-frame.offset[0], -frame.offset[1], -frame.offset[2]);
    this.fill.position.set(0, 0, 1);
    const { right, up, forward } = frame.basis;
    this.rim.position.set(
      -forward[0] + 0.6 * up[0] - 0.4 * right[0],
      -forward[1] + 0.6 * up[1] - 0.4 * right[1],
      -forward[2] + 0.6 * up[2] - 0.4 * right[2],
    );

    // 現れる・消える間は透けさせる
    const translucent = alpha < 0.999;
    for (const m of this.materials) {
      if (m.transparent !== translucent) {
        m.transparent = translucent;
        m.needsUpdate = true;
      }
      m.opacity = alpha;
    }

    const cam = this.cam;
    if (cam.fov !== camera.fov || cam.aspect !== camera.aspect) {
      cam.fov = camera.fov;
      cam.aspect = camera.aspect;
      cam.updateProjectionMatrix();
    }
    cam.quaternion.copy(camera.quaternion);
    cam.updateMatrixWorld(true);

    const prevAuto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, cam);
    renderer.autoClear = prevAuto;
  }

  dispose(): void {
    this.disposed = true;
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
    });
    for (const m of this.materials) {
      for (const v of Object.values(m)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
      m.dispose();
    }
    this.materials = [];
    this.pivot.clear();
  }
}
