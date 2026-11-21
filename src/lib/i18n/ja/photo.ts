/** 写真の窓（ペイル・ブルー・ドットの実際の写真） */
export const photo = {
  /** 写真の alt */
  alt: 'ボイジャー1号が1990年に、太陽から約60億kmの所で撮った地球の写真。太陽の光の筋の中に、地球が小さな点として写っている',
  /** 窓の見出し（題字に近い雰囲気で出す短い名前） */
  heading: 'PALE BLUE DOT',
  close: '閉じる',
  /** 小さい窓を押すと広がる、広がった窓を押すと戻る */
  expand: '写真を広げる',
  collapse: '写真を戻す',
  /** 撮影の日時。dateTime は formatDateTime の文字（UTC つき） */
  taken: (dateTime: string) => `撮影：${dateTime}`,
  credit: '出典：NASA/JPL-Caltech（2020年の再処理版）',
  note: '光の筋は、カメラの中で散った太陽の光です',
  /** 窓を閉じた後、地球の目印を押すとまた開く */
  reopen: '写真を開く',
};
