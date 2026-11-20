# フォント

サイトに同梱するフォント。すべて SIL Open Font License 1.1(再配布できる。ライセンスの文はパッケージの `LICENSE` にある)。
npm のパッケージ(Fontsource)から取り込み、ビルドの成果物に含める。外部のサーバーへは読みに行かない。

| 使う所 | フォント | パッケージ | 備考 |
|---|---|---|---|
| 題字(VOYAGER 1) | Michroma | `@fontsource/michroma` | 1970 年代の計器盤や SF 映画の題字に多かった、幅の広い角丸の欧文に近い |
| 数字(日付・距離・目盛り) | Share Tech Mono | `@fontsource/share-tech-mono` | 等幅。日本語の字は無いので「億km」などは本文のフォントで出る |
| 本文と日本語 | Zen Kaku Gothic New(太さ 400) | `@fontsource/zen-kaku-gothic-new` | 文字の範囲ごとに約 120 個に分かれていて、画面で使った範囲だけが読み込まれる |

読み込む量(2026-11-21 に実測): 題字 18KB + 数字 14KB + 日本語 21 ファイルで 187KB = 約 220KB。
フォントの宣言だけで CSS が 110KB(gzip 37KB)ある。仕上げの段階で、画面で使う文字だけに絞った 1 ファイルに置き換える。

出典のページには、フォントの名前とライセンス(SIL Open Font License 1.1)を書く。
