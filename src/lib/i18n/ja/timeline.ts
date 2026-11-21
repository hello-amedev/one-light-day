/** 時間軸と、その両脇の名場面の移動 */
export const timeline = {
  /** 時間軸(スライダー)の aria-label */
  axis: '時間軸',
  prevScene: '前の名場面',
  nextScene: '次の名場面',
  /** 刻みの吹き出しの日付。月までしか分からない出来事（「2004年12月」） */
  month: (year: string, month: string) => `${year}年${month}月`,
  /** 刻みの吹き出しの日付。期間のある出来事（始まりと終わりの日付が入る） */
  period: (from: string, to: string) => `${from}〜${to}`,
};
