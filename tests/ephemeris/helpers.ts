// テスト共通: public/data/eph を fs で読んで Ephemeris を作る(ネットワークは使わない)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createEphemeris, type Manifest } from '../../src/lib/ephemeris';

const DIR = join(__dirname, '..', '..', 'public', 'data', 'eph');

export function loadFromDisk() {
  const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as Manifest;
  const buffers: Record<string, ArrayBuffer> = {};
  for (const entry of Object.values(manifest.bodies)) {
    for (const s of entry!.segments) {
      const b = readFileSync(join(DIR, s.file));
      buffers[s.file] = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    }
  }
  return { manifest, eph: createEphemeris(manifest, buffers) };
}

export interface Sample {
  group: 'global' | 'earth' | 'jupiter' | 'saturn';
  utc: string;
  voyagerSun: [number, number, number];
  voyagerEarth: [number, number, number];
  earthSun: [number, number, number];
  voyagerJupiter?: [number, number, number];
  voyagerSaturn?: [number, number, number];
}

export function loadSamples(): Sample[] {
  const raw = readFileSync(join(__dirname, 'fixtures', 'horizons-samples.json'), 'utf8');
  return (JSON.parse(raw) as { samples: Sample[] }).samples;
}

export const err = (a: ArrayLike<number>, b: ArrayLike<number>) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
