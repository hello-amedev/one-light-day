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
  voyager1: '-31',
};
