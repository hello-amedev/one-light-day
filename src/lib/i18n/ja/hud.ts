import type { RateId } from '../../store/types';

/** 操作の部品と数字の表示 */
export const hud = {
  // ── 視点の切り替え ──
  viewGroup: '視点',
  viewVoyager: 'ボイジャーの視界',
  viewOverview: '引きの眺め',

  // ── 向くボタン ──
  lookGroup: '向く',
  /** 天体の名前を受けて「◯◯を向く」 */
  lookAt: (name: string) => `${name}を向く`,
  lookAhead: '進む先を向く',

  // ── 再生 ──
  playGroup: '再生',
  play: '再生',
  pause: '停止',
  rates: {
    hour: '1秒＝1時間',
    day: '1秒＝1日',
    month: '1秒＝1か月',
    year: '1秒＝1年',
  } satisfies Record<RateId, string>,

  // ── 送りダイヤル ──
  stepGroup: '送り',
  stepDay: '1日',
  stepHour: '1時間',
  stepBackDay: '1日戻す',
  stepForwardDay: '1日進める',
  stepBackHour: '1時間戻す',
  stepForwardHour: '1時間進める',

  // ── 数字 ──
  fromEarth: '地球から',
  fromSun: '太陽から',
  /** 打ち上げからの日数。days は桁区切り済みの文字 */
  sinceLaunch: (days: string) => `打ち上げから${days}日`,
  /** 光が届くまでの時間。duration は下の duration* で作った文字 */
  lightTime: (duration: string) => `光で${duration}`,
  durationHM: (h: string, m: string) => `${h}時間${m}分`,
  durationHMS: (h: string, m: string, s: string) => `${h}時間${m}分${s}秒`,
  durationMS: (m: string, s: string) => `${m}分${s}秒`,
  durationS: (s: string) => `${s}秒`,
  /** 距離。value は桁区切り・小数の桁を決めた文字 */
  distanceOku: (value: string) => `${value}億km`,
  distanceMan: (value: string) => `${value}万km`,
  distanceKm: (value: string) => `${value}km`,

  // ── 日付 ──
  /** 日本時間の併記。時刻が意味を持つ所だけで使う */
  jstDateTime: (y: number, mo: number, d: number, h: number, mi: number, s: number) =>
    `${y}年${mo}月${d}日 ${h}時${mi}分${s}秒（日本時間）`,
  utcSuffix: 'UTC',
};
