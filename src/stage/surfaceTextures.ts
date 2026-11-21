// 天体の表面の画像(public/textures)の読み込み。
// - manifest.json は起動時に 1 回だけ読む
// - 画像は、その天体が大きく見え始めてから 1 回だけ読む(同じ画像を 2 回読まない)
// - hi / lo の選び方は textureChoice.ts
import * as THREE from 'three';
import type { BodyId } from '../lib/bodies';
import { chooseVariant } from './textureChoice';

interface ManifestVariant {
  file: string;
  width: number;
  height: number;
}
export interface ManifestEntry {
  hi: ManifestVariant;
  lo: ManifestVariant;
  /** 画像の左端の経度(東経、度) */
  lon0: number;
  lonEast: boolean;
}

export interface LoadedSurface {
  texture: THREE.Texture;
  lon0: number;
}

export interface SurfaceTextureOptions {
  maxTextureSize: number;
  maxAnisotropy: number;
  /** 画像の読み込みが終わった時(描き直しを予約する) */
  onLoaded: () => void;
}

type State = { status: 'loading' } | { status: 'ready'; surface: LoadedSurface } | { status: 'failed' };

export class SurfaceTextures {
  private manifest: Record<string, ManifestEntry> | null = null;
  private manifestFailed = false;
  private state = new Map<BodyId, State>();
  private wanted = new Set<BodyId>();
  private opts: SurfaceTextureOptions;
  private disposed = false;
  private all: THREE.Texture[] = [];

  constructor(opts: SurfaceTextureOptions) {
    this.opts = opts;
    void this.loadManifest();
  }

  private url(path: string): string {
    return import.meta.env.BASE_URL + 'textures/' + path;
  }

  private async loadManifest(): Promise<void> {
    try {
      const res = await fetch(this.url('manifest.json'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.manifest = (await res.json()) as Record<string, ManifestEntry>;
      // 待っていた天体の読み込みを始める
      for (const id of this.wanted) this.start(id);
    } catch (e) {
      this.manifestFailed = true;
      console.error('textures: failed to read manifest.json', e);
    }
  }

  /** hi か lo の file 名を選ぶ */
  private pick(entry: ManifestEntry): ManifestVariant {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const short = typeof screen !== 'undefined' ? Math.min(screen.width, screen.height) : 0;
    const variant = chooseVariant({
      screenShortPx: short,
      pixelRatio: window.devicePixelRatio || 1,
      coarsePointer: coarse,
      maxTextureSize: this.opts.maxTextureSize,
      hiWidth: entry.hi.width,
      hiHeight: entry.hi.height,
    });
    const v = entry[variant];
    // lo も GPU の上限を超える時は読まない(超えると黒く表示される)
    return Math.max(v.width, v.height) > this.opts.maxTextureSize ? entry.lo : v;
  }

  /** 画像があれば返す。まだなら(初めての呼び出しなら読み込みを始めて)null */
  request(id: BodyId): LoadedSurface | null {
    const s = this.state.get(id);
    if (s?.status === 'ready') return s.surface;
    if (s) return null;
    this.wanted.add(id);
    if (this.manifest) this.start(id);
    return null;
  }

  private start(id: BodyId): void {
    if (this.state.has(id) || this.disposed) return;
    const entry = this.manifest?.[id];
    if (!entry) {
      if (!this.manifestFailed) console.error(`textures: no manifest entry for ${id}`);
      this.state.set(id, { status: 'failed' });
      return;
    }
    this.state.set(id, { status: 'loading' });
    const variant = this.pick(entry);
    const img = new Image();
    img.decoding = 'async';
    img.src = this.url(variant.file);
    img
      .decode()
      .then(() => {
        if (this.disposed) return;
        const tex = new THREE.Texture(img);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = Math.min(4, this.opts.maxAnisotropy);
        tex.needsUpdate = true;
        this.all.push(tex);
        this.state.set(id, { status: 'ready', surface: { texture: tex, lon0: entry.lon0 } });
        this.opts.onLoaded();
      })
      .catch((e: unknown) => {
        this.state.set(id, { status: 'failed' });
        console.error(`textures: failed to load ${variant.file}`, e);
      });
  }

  dispose(): void {
    this.disposed = true;
    for (const t of this.all) t.dispose();
    this.all.length = 0;
  }
}
