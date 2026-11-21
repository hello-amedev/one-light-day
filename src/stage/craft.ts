// ボイジャー本体の視点(第6段階)。機体のモデルを、そばから回して見る。
//
// 土台(監督が作った差し込み口)。担当がモデルの読み込み・光・描き方を実装する。外から呼ばれる形(このクラスの公開の口)は変えない。
// - カメラの姿勢は pose() が返す。CameraRig は本体の視点の時、これをそのまま使う(ずれは数十 m、km の単位)
// - 主の場面(星・天体・線)を描いた後に render() で機体を重ねる。renderer は奥行きの判定(depth)を持つ
import type * as THREE from 'three';
import type { Ephemeris } from '../lib/ephemeris';
import type { CameraPose } from './camera';
import type { FrameContext } from './frame';
import { DEG, clamp, cross, normalize, scale, type Vec3 } from './math';

export interface CraftViewOptions {
  eph: Ephemeris;
  /** モデルの読み込みが終わった時など、描き直しが要る時に呼ぶ */
  onChange: () => void;
}

/** 回す時の、仰角の限度 */
const EL_LIMIT = 80 * DEG;

export class CraftView {
  private eph: Ephemeris;
  private onChange: () => void;
  /** アンテナの向き(地球の方)を基準にした、カメラの回り込みの角度 */
  private az = 0;
  private el = 12 * DEG;

  constructor(options: CraftViewOptions) {
    this.eph = options.eph;
    this.onChange = options.onChange;
  }

  /** 本体の視点に入った時に呼ぶ。最初の 1 回だけモデルの読み込みを始める(担当が実装する) */
  activate(): void {
    void this.onChange;
  }

  /** 動きの途中か(読み込み中のフェードなど。途中の間は毎フレーム描き直す) */
  get animating(): boolean {
    return false;
  }

  /** ドラッグで機体のまわりを回る */
  drag(dx: number, dy: number): void {
    this.az -= dx * 0.4 * DEG;
    this.el = clamp(this.el + dy * 0.4 * DEG, -EL_LIMIT, EL_LIMIT);
  }

  /**
   * 本体の視点のカメラの姿勢。distanceM はカメラから機体までの距離(m)。
   * 仮: 機体の後ろ(地球と反対の側)から、アンテナの向く先(地球の方)を見る
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
    return { offset, forward: scale(back, -1), fov: 50 };
  }

  /** 主の場面を描いた後に、機体を重ねる。visible が false の時は何も描かない */
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, frame: FrameContext, visible: boolean): void {
    void renderer;
    void camera;
    void frame;
    void visible;
  }

  dispose(): void {}
}
