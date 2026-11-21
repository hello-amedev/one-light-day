import type { RateId } from '../../store/types';

/** 操作の部品と数字の表示 */
export const hud = {
  // ── 視点の切り替え ──
  viewGroup: '視点',
  viewVoyager: 'ボイジャーの視界',
  viewOverview: '引きの眺め',
  viewCraft: 'ボイジャー本体',

  // ── 向くボタン ──
  lookGroup: '向く',
  /** 天体の名前を受けて「◯◯を向く」 */
  lookAt: (name: string) => `${name}を向く`,
  lookAhead: '進む先を向く',

  // ── 再生 ──
  playGroup: '再生',
  play: '再生',
  pause: '停止',
  /** 速さのボタンの名前(指した時)。押すたびに 1時間 → 1日 → 1か月 → 1年 と切り替わる */
  rateName: '再生の速さ',
  /** 速さのボタンの読み上げ。speed は下の rates の文 */
  rateButton: (speed: string) => `再生の速さ：${speed}`,
  rates: {
    hour: '1秒＝1時間',
    day: '1秒＝1日',
    month: '1秒＝1か月',
    year: '1秒＝1年',
  } satisfies Record<RateId, string>,

  // ── 送りダイヤル ──
  stepBackDay: '1日戻す',
  stepForwardDay: '1日進める',
  stepBackHour: '1時間戻す',
  stepForwardHour: '1時間進める',

  // ── 数字 ──
  fromEarth: '地球から',
  fromSun: '太陽から',
  // ── 右上の日付の入力(日付を押すと入力欄になる) ──
  /** 日付のボタン(指した時の名前) */
  dateEdit: '日付を入力',
  /** 入力欄の読み上げ */
  dateInput: '日付（年.月.日）',
  /** 読めない形や範囲の外の日付を打った時。from / to は 1977.09.05 の形の日付 */
  dateRange: (from: string, to: string) => `${from}〜${to}の日付を入力してください`,
  /** 打ち上げからの日数。days は桁区切り済みの文字 */
  sinceLaunch: (days: string) => `打ち上げから${days}日`,
  /** 光が届くまでの時間。duration は下の duration* で作った文字 */
  lightTime: (duration: string) => `光の速さで${duration}`,
  durationHM: (h: string, m: string) => `${h}時間${m}分`,
  durationHMS: (h: string, m: string, s: string) => `${h}時間${m}分${s}秒`,
  durationMS: (m: string, s: string) => `${m}分${s}秒`,
  durationS: (s: string) => `${s}秒`,
  /** 距離。value は桁区切り・小数の桁を決めた文字 */
  distanceOku: (value: string) => `${value}億km`,
  distanceMan: (value: string) => `${value}万km`,
  distanceKm: (value: string) => `${value}km`,

  // ── 右下の距離の上の小さな表示 ──
  /** ボイジャーの視界の倍率。value は 1 や 12 のような数の文字 */
  magnification: (value: string) => `×${value}`,
  magnificationAria: (value: string) => `${value}倍に拡大`,
  /** 倍率が上限(狭角カメラの視野)に達した時 */
  magnificationLimit: 'ボイジャーの狭角カメラと同じ視野',
  /** ボイジャー本体の視点の、カメラから機体までの距離。meters は整数の文字 */
  craftDistance: (meters: string) => `機体から${meters}m`,

  // ── 引きの眺めの縮尺の物差し ──
  /** 物差しの読み上げ。length は「10億km」のような長さ */
  scaleBarAria: (length: string) => `縮尺の物差し（この長さが${length}）`,

  // ── 日付 ──
  /** 日本時間の併記。時刻が意味を持つ所だけで使う */
  jstDateTime: (y: number, mo: number, d: number, h: number, mi: number, s: number) =>
    `${y}年${mo}月${d}日 ${h}時${mi}分${s}秒（日本時間）`,
  utcSuffix: 'UTC',
};
