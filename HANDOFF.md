# HANDOFF(voyager / ONE LIGHT-DAY)

## 0. 次の Claude へ

起動時に読むのはこのファイルと CLAUDE.md だけ。必要な時だけ下の資料を読む。

| 作業 | 読む場所 |
|---|---|
| 何を作るか・段階・完成の条件 | [SPEC.md](SPEC.md)(設計書の URL は冒頭) |
| 部品の境界・座標・時刻・データの形 | [docs/contracts.md](docs/contracts.md) |
| 何を確かめたか・未解決の問題 | [PROGRESS.md](PROGRESS.md) |
| 使う部品の一覧 | [docs/shared-parts.md](docs/shared-parts.md) |
| 素材の出どころと条件 | [docs/assets/](docs/assets/) |

## 1. 概要

ボイジャー1号の49年を、ボイジャーの視界と太陽系の引きの眺めでたどるファンサイト。Vite + Svelte 5 + three.js の静的なサイト。
GitHub: hello-amedev/one-light-day(**Public**。2026-11-21 に voyager から改名して公開。手元のフォルダ名は voyager のまま)。
サイトは https://ame-dev.com/one-light-day/ で動いている(GitHub Pages。告知はまだで、検索よけの印を入れてある)。更新の反映は docs/publish.md の「公開のあと」。

## 2. 現在の状態(2026-11-21)

- **第1段階(骨組みと快適さの土台)は完了**。位置データ、星、操作の部品、3D の表示(2つの視点、視点の切り替え、見回し、向く、軌道と軌跡)が動く。
  `npm run verify` が通る。Chrome を直接起動した計測で、再生中・視点の切り替え中とも毎秒 60 コマ、止めている間の描き直し 0
- **第2段階(見た目の方向)は完了**。あめさんが「計器盤をもとに、数字だけ端末の字体」を選び、`src/app.css` のトークンに反映した
  (題字 Michroma、数字 Share Tech Mono、本文 Zen Kaku Gothic New、四隅の括弧)。比較用のページと案の CSS は消した(履歴の 7d53a0d にある)
- **第3段階(ボイジャーの視界)は完了**(土星の環の直しをあめさんが見て OK。2026-11-21)。天の川、太陽の光(にじみ + 十字の光条)、画像を貼った地球・月・木星・衛星 4 つ、
  プログラムで描いた土星・環(影つき)・タイタン、目印の名前の置き方、写真の窓、名場面の短い文。`npm run verify` と計測(毎秒 60 コマ)が通る
- **第4段階(引きの眺め)は完了**。早回し中の惑星の残像の弧、垂線、名場面の刻み、縮尺の物差し、開いた直後の自動再生、減速の見直し。`npm run verify` と計測が通る
- **第5段階(仕上げ)は実装が終わり、本番の環境であめさんが確認している**。「このサイトについて」、名場面ごとの URL(`?scene=`)、共有用の画像と説明、
  3D が使えない端末向けの表示(`?no3d` で確認)、数字の桁が回る動き、絞ったフォント、読み込む量の検査、公開の手順書(docs/publish.md)。`npm run verify` と計測が通る
- **告知せずに公開した**(2026-11-21)。あめさんの方針は「すぐ外にリンクは出さず、本番の環境で最終調整する」。`index.html` に検索よけ(noindex)を入れてあり、告知の前に外す
- **確認リスト**: https://claude.ai/artifact/J3m1UWXu4ZPYJgWnHnUesL(あめさんだけが見られる Artifact)。項目ごとに 未確認 / OK / 直したい とメモを、あめさんが書き込む。
  中身は Artifact の db の `checks` コレクション(ArtifactData の list で読む。項目を足す時は order を 10 刻みで、status は todo / ok / fix)。直したら status はあめさんに付け直してもらう
- 星の数は約9千個のまま(あめさんの指定なし)。約4万個は `?stars=deep` で試せる

- **第6段階(本番での確認を受けた見直し)の仕様が確定し、実装は未着手**。中身は SPEC.md の「第6段階の仕様」1〜8、出来事の事実は docs/events.md
  (本体の視点、自動の望遠の廃止と倍率、軌跡、アイコンとメニュー、時間軸の吹き出しと吸い付き、出来事、拡大した時の星空、垂線)

直近の作業: (1) 告知なしの公開(リポジトリの改名と公開、Pages、検索よけ)と確認リストの用意、(2) あめさんの 8 つの要望を検証して第6段階の仕様にまとめた(実物どおりの 3D モデル (B)、上限を狭角カメラに、出来事を名場面に含める、速さの前後を数字で)。

## 3. 次回着手するなら

0. **第6段階の実装**(SPEC.md「第6段階の仕様」)。部品が多いので agent-orchestration スキルで分担する。共通の土台(表示の切り替えの状態、出来事の一覧の形、倍率の計算)を先に 1 体で作ってから並行にする。
   計測の道具は並行の担当に使わせない(§5)。終わったら本番に反映し、確認リスト(Artifact の db)に新しい項目を足す。古い項目のうち仕様で解決したもの(星の数など)は note に書いて status は変えない
1. 確認リストを読んで、「直したい」の項目を直す: 文言(辞書を直したら `node scripts/dump-texts.mjs` で一覧を作り直す)、見え方(天の川の濃さは `--milkyway-gain`、太陽の光は `--sun-glare`)。
   直したら main に入れて、公開用のワークフローを手で動かす(`gh workflow run deploy.yml --repo hello-amedev/one-light-day --ref main`)
2. 告知の前に: 検索よけを外して公開し直す(docs/publish.md「告知の前に」)。サイト名を変える時は、辞書 `src/lib/i18n/ja/intro.ts`、`index.html` の題と説明、`tools/shots/shoot.mjs` の題字を直して `public/og.jpg` を撮り直す
3. 地球の高精細の画像(8,192 画素)が取得できるようになったら差し替える(docs/assets/textures.md)

## 4. 判断待ち・残る論点

- スマホの実機・文言・見え方・星の数・告知の日は、確認リスト(§2)の項目で管理する。ここには書かない
- 星のデータ(HYG v4.4、CC BY-SA 4.0)の継承の範囲は「星のデータだけ」と置いた(素材の一覧はあめさんが承認済み)
- ハブの CLAUDE.md の「サブアプリ別」の表に voyager を足すか?(未回答。足していない)

## 5. 落とし穴と鉄則

- **アプリ内のプレビューが隠れている間は、滑らかさを測れない**(ブラウザがコマを間引き、毎秒 15 コマに見える)。計測は `node tools/perf/measure.mjs`
- **Horizons のベクトル表の時刻は TDB**。UTC として扱うと 69 秒ずれる。変換は `src/lib/ephemeris/time.ts` だけ
- **惑星のそばを通る間の相対位置は `eph.position(天体, 'voyager1', et)` で直接取る**。太陽中心の位置どうしを引くと、木星で 380km・土星で 1,360km ずれる
- 3D はカメラを原点に置き、倍精度でカメラ相対の位置を出してから float32 に渡す。天体はカメラ中心に縮めて遠い順に描く(奥行きの判定を使わない)
- セッションの作業フォルダがハブの worktree の時、`~/claude-private/voyager` への直接の Write は hook で止まる。
  セッションの作業フォルダの中に voyager リポジトリの worktree を作って作業し、最後に main へマージする
- 画像の生のファイル(`tools/textures/cache/`、約 0.7GB)は Git に入れていないので、この Mac の `~/claude-private/voyager` にしか無い。
  別の端末で画像を作り直す時は、docs/assets/textures.md の出どころから取り直す(サイトを動かすだけなら要らない)
- HYG の CSV は Codeberg の `media/` の URL から取る(`raw/` は Git LFS のポインタを返す)
- 画面に出ない開発者向けのエラー文は英語で書く(日本語の直書きは規約の検査で止まる)
- **担当(サブエージェント)の報告の「テストを作った・通った」は、ファイルの実在と件数の増え方で確かめる**。道具の中で比べた値と、サイトが実際に使う読み出しの値は別物
- ヘッドレスの Chrome の `--virtual-time-budget` では画像の読み込みが進まない。画像を貼った後の絵は、実時間で待ってから撮る
- 開発サーバーの監視の除外に `**/.claude/**` と書くと、作業コピー自身(`.claude/worktrees/` の下)の編集が反映されなくなる
- 辞書に文言を足したら、フォント(`npm run fonts`。verify の最初でも走る)と文言の一覧(`node scripts/dump-texts.mjs`。新しい領域は道具の AREAS / PLACES に足す)を作り直す。足りないと `npm run check` が止まる
- 計測の道具(`tools/perf/measure.mjs`)は、同じ時間に 2 つ動かすとぶつかって失敗する(Chrome の遠隔操作のポートが同じ)。並行で作業する担当には使わせず、監督が統合の後に 1 回走らせる

## 6. 起動と検査

- `npm run dev`(ハブの `.claude/launch.json` の "voyager"。ポート 5180)
- `npm run verify`(フォントの作り直し・規約とフォントと文言の一覧の検査・型チェック・テスト・ビルド・読み込む量の検査)
- `node tools/perf/measure.mjs`(dev サーバーを立ててから。滑らかさと震えの計測)
- データの作り直し: `npm run data:eph` / `npm run data:stars`(手順は docs/assets/)
- 確認用の URL: `?t=<UTC>&view=voyager|overview&look=<天体か ahead>&debug`
