import type { EventId } from '../../events';

/**
 * 出来事の文(第6段階)。事実と出典は docs/events.md。時刻と種類は src/lib/events.ts。
 * 名場面に含める出来事は、名場面の近くで再生がゆっくりになる間に順に出る。単独の刻みは時間軸の小さな刻みになる。
 * 下書き。あめさんが確かめる(タイタンの日付は UTC、イオは撮影と発見の日を分ける、2004 年は月だけ)
 */
export const events = {
  /** 出来事の名前(時間軸の刻みの吹き出し・読み上げ、文の見出し) */
  names: {
    earthMoonPhoto: '地球と月の撮影',
    jupiterRing: '木星の環',
    ioVolcano: 'イオの火山',
    titanFlyby: 'タイタンに最接近',
    camerasOff: 'カメラの電源を切る',
    mostDistant: '最も遠い人工物に',
    terminationShock: '末端衝撃波を通過',
    thrusters: 'スラスターを37年ぶりに噴射',
    memoryFix: '故障と遠隔での修理',
  } satisfies Record<EventId, string>,
  /** 出来事へ移った時・通り過ぎた時に名前の下へ出す 1 行 */
  lines: {
    earthMoonPhoto: '地球と月を初めて一緒に撮影した。地球から約1,166万km',
    jupiterRing: '環の最初の証拠が写った。厚さは30km以下',
    ioVolcano: '3月8日に撮影、9日に発見。地球以外で初めての活火山で、噴煙の高さは約270km',
    titanFlyby: '11月12日（UTC）、土星への最接近の約18時間前にタイタンへ最も近づいた',
    camerasOff: '地球を撮影した34分後に、カメラの電源を切った。太陽から約60億km',
    mostDistant: 'パイオニア10号を抜いた。太陽からの距離は、地球と太陽の間の69.4倍',
    terminationShock: '太陽からの距離は、地球と太陽の間の約94倍。磁場が約2.5倍に強まった',
    thrusters: '軌道修正用のスラスターを噴射した。前回は1980年11月8日',
    memoryFix: 'メモリの部品が故障し、読めないデータが続いた。プログラムを別の場所へ移し、4つの観測装置のデータが戻った',
  } satisfies Record<EventId, string>,
};
