# フォント

サイトに同梱するフォント。すべて SIL Open Font License 1.1(再配布できる。ライセンスの文はパッケージの `LICENSE` にある)。
npm のパッケージ(Fontsource)から取り込み、ビルドの成果物に含める。外部のサーバーへは読みに行かない。

| 使う所 | フォント | パッケージ | 備考 |
|---|---|---|---|
| 題字(VOYAGER 1) | Michroma | `@fontsource/michroma` | 1970 年代の計器盤や SF 映画の題字に多かった、幅の広い角丸の欧文に近い |
| 数字(日付・距離・目盛り) | Share Tech Mono | `@fontsource/share-tech-mono` | 等幅。日本語の字は無いので「億km」などは本文のフォントで出る |
| 本文と日本語 | IBM Plex Sans JP(太さ 400) | `@fontsource/ibm-plex-sans-jp` | サイトで使う文字だけを 1 ファイルに絞って同梱(下の「日本語の絞り込み」)。2026-11-22 に Zen Kaku Gothic New から替えた(よく見かける顔だったため。あめさんの選択) |

## 日本語の絞り込み

- `npm run fonts`(`scripts/build-fonts.mjs`)が、パッケージの中の日本語の一括ファイル(約 6,900 字)から、使う文字だけの woff2 を作る。できたファイルは `src/assets/fonts/ibm-plex-sans-jp-subset.woff2`(Git に入れる)
- 入れる文字: ASCII の印字できる文字、ひらがな・カタカナ全部、日本語の基本の記号、`src/` と `index.html` の中の文字(コメントを除く)。辞書に文言が増えると、次の `npm run dev` / `npm run build`(prebuild)で自動で作り直す
- `npm run check` の `scripts/check-fonts.mjs` が、サイトの文字が絞ったフォントに全部入っているかを確かめる。足りないと文字名を出して失敗する(端末のフォントで出て、そこだけ見た目が変わるため)
- 元のフォントに字形が無い文字(例: 一部の記号)は、どうしても端末のフォントになる。道具が警告で知らせる
- 絞るのは npm の `subset-font`(開発用の依存。HarfBuzz を WebAssembly にしたもの)。Python の fontTools は、woff2 の出力に別の `brotli` が要り環境で差が出るので使わない
- 一括ファイルに無く分割ファイルにだけある文字がサイトに出てきたら、道具が失敗で知らせる(複数のファイルを合わせる処理を足す)
- 外部からのダウンロードは無い。パッケージの中のファイルだけを使う

読み込む量(2026-11-21): 日本語は 1 ファイル 38KB(絞る前は 21 ファイルで 187KB)。フォントの宣言の CSS は 1.3KB(絞る前は 110KB)。
題字 18KB + 数字 14KB は今の読み込み方のまま。
2026-11-22 に IBM Plex Sans JP へ替えた時点: 日本語は 1 ファイル 67KB(631 字)。替える前の Zen Kaku Gothic New は同じ文字で 68KB。

出典のページには、フォントの名前とライセンス(SIL Open Font License 1.1)を書く。
