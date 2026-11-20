// 開発用の代用データ。位置と星のデータが無い作業コピーで、操作の部品だけを動かすためのもの。
// 本番ビルドでは使わない(App.svelte が import.meta.env.DEV の時だけ読み込む)。
//
// ボイジャーは地球から太陽の外向きへ一定の速さでまっすぐ遠ざかり、惑星は円軌道。
// 木星の通過の日に木星と重なるよう、速さと木星の位相を決めてある(「木星を向く」の出る時期を確かめるため)。
import { BODY_IDS, type BodyId } from '../../lib/bodies';
import type { Coverage, Ephemeris, Vec3 } from '../../lib/ephemeris/types';
import { AU_KM } from '../../lib/ephemeris/types';
import { etFromIso } from '../../lib/ephemeris/time';
import { SCENES } from '../../lib/scenes';
import type { StarCatalog } from '../../lib/stars/types';

const YEAR_S = 31_557_600;
const T0 = etFromIso('1977-09-05T14:05:00Z');
const T1 = etFromIso('2060-01-01T00:00:00Z');
const sceneEt = (id: string): number => SCENES.find((s) => s.id === id)!.et;

/** 惑星の軌道半径(AU)。木星・土星は下でボイジャーに合わせる */
const SEMI_MAJOR_AU: Partial<Record<BodyId, number>> = {
  mercury: 0.387,
  venus: 0.723,
  earth: 1,
  mars: 1.524,
  uranus: 19.2,
  neptune: 30.07,
};

const EARTH_N = (2 * Math.PI) / YEAR_S;
const EARTH_THETA0 = 0.6; // J2000 での地球の角度
const earthAngleAtLaunch = EARTH_THETA0 + EARTH_N * T0;

// ボイジャー: 打ち上げ時の地球の位置から、太陽の外向きへ一定の速さで
const JUPITER_AU = 5.2;
const speed = ((JUPITER_AU - 1) * AU_KM) / (sceneEt('jupiter') - T0); // km/s
const voyagerRadiusAt = (et: number): number => AU_KM + speed * (et - T0);

function orbit(body: BodyId): { a: number; theta0: number } | null {
  if (body === 'earth') return { a: AU_KM, theta0: EARTH_THETA0 };
  if (body === 'jupiter' || body === 'saturn') {
    const et = sceneEt(body);
    const a = body === 'jupiter' ? JUPITER_AU * AU_KM : voyagerRadiusAt(et);
    const n = (2 * Math.PI) / (Math.pow(a / AU_KM, 1.5) * YEAR_S);
    // その場面の時刻に、ボイジャーの進む直線の上に来る角度
    return { a, theta0: earthAngleAtLaunch - n * et };
  }
  const au = SEMI_MAJOR_AU[body];
  return au ? { a: au * AU_KM, theta0: (BODY_IDS.indexOf(body) * 1.7) % (2 * Math.PI) } : null;
}

function angularRate(a: number): number {
  return (2 * Math.PI) / (Math.pow(a / AU_KM, 1.5) * YEAR_S);
}

function sunPosition(body: BodyId, et: number, out: Vec3): Vec3 {
  const t = Math.min(T1, Math.max(T0, et));
  if (body === 'sun') {
    out[0] = out[1] = out[2] = 0;
  } else if (body === 'voyager1') {
    const r = voyagerRadiusAt(t);
    out[0] = r * Math.cos(earthAngleAtLaunch);
    out[1] = r * Math.sin(earthAngleAtLaunch);
    out[2] = 0;
  } else if (body === 'moon') {
    sunPosition('earth', t, out);
    const phase = ((2 * Math.PI) / (27.3 * 86400)) * t;
    out[0] += 384_400 * Math.cos(phase);
    out[1] += 384_400 * Math.sin(phase);
  } else {
    const o = orbit(body);
    if (!o) {
      out[0] = out[1] = out[2] = 0;
      return out;
    }
    const th = o.theta0 + angularRate(o.a) * t;
    out[0] = o.a * Math.cos(th);
    out[1] = o.a * Math.sin(th);
    out[2] = 0;
  }
  return out;
}

export function createMockEphemeris(): Ephemeris {
  const tmpA: Vec3 = [0, 0, 0];
  const tmpB: Vec3 = [0, 0, 0];
  const position = (body: BodyId, center: BodyId, et: number, out: Vec3 = [0, 0, 0]): Vec3 => {
    sunPosition(body, et, tmpA);
    sunPosition(center, et, tmpB);
    out[0] = tmpA[0] - tmpB[0];
    out[1] = tmpA[1] - tmpB[1];
    out[2] = tmpA[2] - tmpB[2];
    return out;
  };
  return {
    t0: T0,
    t1: T1,
    position,
    velocity(body, center, et, out = [0, 0, 0]) {
      // 前後 1 時間の差から作る(代用データなので十分)
      const a = position(body, center, et - 1800);
      const b = position(body, center, et + 1800);
      out[0] = (b[0] - a[0]) / 3600;
      out[1] = (b[1] - a[1]) / 3600;
      out[2] = (b[2] - a[2]) / 3600;
      return out;
    },
    distance(a, b, et) {
      const p = position(a, b, et);
      return Math.hypot(p[0], p[1], p[2]);
    },
    coverage(): Coverage {
      return { t0: T0, t1: T1 };
    },
    track(body) {
      const n = 400;
      const out = new Float64Array(n * 4);
      const p: Vec3 = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        const t = T0 + ((T1 - T0) * i) / (n - 1);
        sunPosition(body, t, p);
        out.set([t, p[0], p[1], p[2]], i * 4);
      }
      return out;
    },
  };
}

/** 空の星のデータ(開発で星が読めない時の代用) */
export function createMockStars(): StarCatalog {
  return { count: 0, data: new Float32Array(0) };
}
