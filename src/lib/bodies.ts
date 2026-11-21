// 天体の一覧。位置データ・3D の表示・画面の文言がすべてこの ID を共有する。
// 名前(画面に出す文字)はここに置かず、辞書(src/lib/i18n)から引く。

export const BODY_IDS = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'io',
  'europa',
  'ganymede',
  'callisto',
  'titan',
  'voyager1',
] as const;

export type BodyId = (typeof BODY_IDS)[number];

/** 太陽のまわりを回る惑星(内側から)。軌道の線を描く対象 */
export const PLANET_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const satisfies readonly BodyId[];

/** 平均半径 km(NASA の惑星の諸元表による) */
export const BODY_RADIUS_KM: Record<Exclude<BodyId, 'voyager1'>, number> = {
  sun: 695_700,
  mercury: 2_439.7,
  venus: 6_051.8,
  earth: 6_371.0,
  moon: 1_737.4,
  mars: 3_389.5,
  jupiter: 69_911,
  saturn: 58_232,
  uranus: 25_362,
  neptune: 24_622,
  io: 1_821.6,
  europa: 1_560.8,
  ganymede: 2_634.1,
  callisto: 2_410.3,
  titan: 2_574.7,
};

/** NASA JPL Horizons での天体の番号(データを作る道具が使う) */
export const HORIZONS_ID: Record<BodyId, string> = {
  sun: '10',
  mercury: '199',
  venus: '299',
  earth: '399',
  moon: '301',
  mars: '499',
  jupiter: '599',
  saturn: '699',
  uranus: '799',
  neptune: '899',
  io: '501',
  europa: '502',
  ganymede: '503',
  callisto: '504',
  titan: '606',
  voyager1: '-31',
};

/** 衛星と、それが回る親の天体。位置データは親を中心にした区間だけを持つ */
export const SATELLITE_PARENT = {
  moon: 'earth',
  io: 'jupiter',
  europa: 'jupiter',
  ganymede: 'jupiter',
  callisto: 'jupiter',
  titan: 'saturn',
} as const satisfies Partial<Record<BodyId, BodyId>>;

export type SatelliteId = keyof typeof SATELLITE_PARENT;
