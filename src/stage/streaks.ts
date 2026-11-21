// 早回し中の惑星の「残像の弧」の描画。判断の式は streak.ts。
// 点の代わりに、軌道に沿った短い帯を描く。帯は進んできた向きへ尾を引き、後ろほど細く薄い。
// 弧の長さは「1 コマで進んだ角度」に比例し、毎コマの弧がつながって、軌道をなぞる光に見える。
// 位置は位置データから直接取る(軌道の楕円ではなく、実際の動きに沿う)。帯の幅は画面上の px で決める。
import * as THREE from 'three';
import { PLANET_IDS, type BodyId } from '../lib/bodies';
import type { Ephemeris } from '../lib/ephemeris';
import { DOT_BELOW_PX, EARTH_DOT_PX, STYLES } from './bodies';
import type { BodyScreenInfo } from './bodies';
import type { FrameContext } from './frame';
import { cross, dot, normalize, type Vec3 } from './math';
import { classifyStreak, PERIOD_DAYS, stepAngleDeg, type StreakShape } from './streak';
import type { Theme } from './theme';

/** 弧を何区間で描くか */
const SEGMENTS = 28;
/** 帯の太さ(点の大きさに対する割合)。点の絵は縁がにじむので、芯の幅に合わせて細くする */
const WIDTH_RATIO = 0.8;
/** 尾の先の太さ(頭に対する割合) */
const TAIL_WIDTH = 0.3;
/** 頭の明るさ */
const PEAK = 0.95;
/** 操作しない間に弧を薄くする下限(軌道の線と同じ) */
const DIM = 0.25;

interface Item {
  id: BodyId;
  index: number;
  mesh: THREE.Mesh;
  positions: Float32Array;
  colors: Float32Array;
  color: THREE.Color;
  dotPx: number;
  /** 前のコマで弧(または軌道全体)にしていたか。境目での入れ替わりを防ぐ */
  was: boolean;
  shape: StreakShape;
}

export class PlanetStreaks {
  readonly group = new THREE.Group();
  /** このコマで、点の代わりに弧(または軌道全体の光)にする惑星。bodies へ渡す */
  readonly active = new Set<BodyId>();
  /** 実際に弧・軌道全体の光で描いた惑星。目印を隠すのに使う */
  readonly drawn = new Set<BodyId>();
  /** 惑星の軌道の線の明るさの足し分(PLANET_IDS の順)。軌道の線へ渡す */
  readonly glow: number[] = PLANET_IDS.map(() => 0);

  private items: Item[] = [];
  private material: THREE.MeshBasicMaterial;
  private index: THREE.BufferAttribute;
  private eph: Ephemeris;
  // 毎コマ使う作業用
  private tmp: Vec3 = [0, 0, 0];
  private rel: Vec3[] = Array.from({ length: SEGMENTS + 1 }, () => [0, 0, 0] as Vec3);

  constructor(eph: Ephemeris, theme: Theme) {
    this.eph = eph;
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    // 2 頂点ずつ(左右)の帯。区間ごとに三角形 2 枚
    const idx: number[] = [];
    for (let k = 0; k < SEGMENTS; k++) {
      const a = k * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.index = new THREE.BufferAttribute(new Uint16Array(idx), 1);

    PLANET_IDS.forEach((id, index) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((SEGMENTS + 1) * 2 * 3);
      const colors = new Float32Array((SEGMENTS + 1) * 2 * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(this.index);
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.frustumCulled = false;
      mesh.visible = false;
      // 線(1〜3)より上、天体(10 以上)より下
      mesh.renderOrder = 5;
      this.group.add(mesh);
      const style = id === 'earth' ? null : STYLES[id];
      this.items.push({
        id,
        index,
        mesh,
        positions,
        colors,
        color: new THREE.Color(style ? style.color : theme.earth),
        dotPx: style ? style.dotPx : EARTH_DOT_PX,
        was: false,
        shape: classifyStreak(0),
      });
    });
  }

  /**
   * 前のコマからの時刻の進み(秒)で、点・弧・軌道全体のどれにするかを決める。
   * bodies の更新より前に呼び、active を渡す。
   */
  classify(deltaEt: number): void {
    this.active.clear();
    for (const item of this.items) {
      const angle = stepAngleDeg(deltaEt, PERIOD_DAYS[item.id as keyof typeof PERIOD_DAYS]);
      item.shape = classifyStreak(angle, item.was);
      item.was = item.shape.mode !== 'dot';
      if (item.was) this.active.add(item.id);
    }
  }

  /** bodies の更新の後に呼ぶ。点で描かれている惑星だけ弧にする(近くて球で描く惑星はそのまま) */
  update(ctx: FrameContext, cameraSun: Vec3, deltaEt: number, infos: readonly BodyScreenInfo[], chrome: number): void {
    this.drawn.clear();
    const dim = DIM + (1 - DIM) * chrome;
    const forward = ctx.basis.forward;
    const kmPerPxAt = (z: number): number => (2 * ctx.tanV * z) / ctx.height;
    const sign = deltaEt >= 0 ? 1 : -1;

    for (const item of this.items) {
      const shape = item.shape;
      const info = infos.find((i) => i.id === item.id);
      const asDot = !!info && info.radiusPx < DOT_BELOW_PX;
      item.mesh.visible = false;
      this.glow[item.index] = 0;
      if (shape.mode === 'dot' || !asDot) continue;
      this.drawn.add(item.id);
      this.glow[item.index] = shape.glow * dim;
      if (shape.mode === 'orbit' || shape.arcAlpha <= 0.01) continue;

      // 弧の上の点を、時刻をさかのぼって位置データから取る(カメラ相対・倍精度)
      const span = Math.abs(deltaEt);
      for (let k = 0; k <= SEGMENTS; k++) {
        const t = ctx.et - sign * span * (k / SEGMENTS);
        this.eph.position(item.id, 'sun', t, this.tmp);
        const r = this.rel[k];
        r[0] = this.tmp[0] - cameraSun[0];
        r[1] = this.tmp[1] - cameraSun[1];
        r[2] = this.tmp[2] - cameraSun[2];
      }
      if (dot(this.rel[0], forward) <= 0) continue;

      const half = (item.dotPx * WIDTH_RATIO) / 2;
      const alpha = PEAK * shape.arcAlpha * dim;
      for (let k = 0; k <= SEGMENTS; k++) {
        const s = k / SEGMENTS;
        const r = this.rel[k];
        const a = this.rel[Math.max(0, k - 1)];
        const b = this.rel[Math.min(SEGMENTS, k + 1)];
        const tangent: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        // 帯の幅の向き: 進む向きと視線の両方に直交する向き(帯が常にカメラのほうを向く)
        const side = normalize(cross(tangent, forward));
        const z = Math.max(dot(r, forward), 1);
        const w = half * kmPerPxAt(z) * (1 - (1 - TAIL_WIDTH) * s);
        const o = k * 6;
        item.positions[o] = r[0] + side[0] * w;
        item.positions[o + 1] = r[1] + side[1] * w;
        item.positions[o + 2] = r[2] + side[2] * w;
        item.positions[o + 3] = r[0] - side[0] * w;
        item.positions[o + 4] = r[1] - side[1] * w;
        item.positions[o + 5] = r[2] - side[2] * w;
        // 後ろほど薄く(加算で重ねるので、色を暗くすれば薄くなる)
        const f = alpha * Math.pow(1 - s, 1.5);
        for (let v = 0; v < 2; v++) {
          item.colors[o + v * 3] = item.color.r * f;
          item.colors[o + v * 3 + 1] = item.color.g * f;
          item.colors[o + v * 3 + 2] = item.color.b * f;
        }
      }
      const geometry = item.mesh.geometry;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      item.mesh.visible = true;
    }
  }

  dispose(): void {
    for (const item of this.items) item.mesh.geometry.dispose();
    this.material.dispose();
  }
}
