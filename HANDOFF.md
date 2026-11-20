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
GitHub: hello-amedev/voyager(Private)。公開は GitHub Pages(ame-dev.com の下)の予定で、公開の操作はあめさんの確認を取ってから。

## 2. 現在の状態(2026-11-21)

- **第1段階(骨組みと快適さの土台)は完了**。位置データ、星、操作の部品、3D の表示(2つの視点、視点の切り替え、見回し、向く、軌道と軌跡)が動く。
  `npm run verify` が通る。Chrome を直接起動した計測で、再生中・視点の切り替え中とも毎秒 60 コマ、止めている間の描き直し 0
- **第2段階(見た目の方向)は完了**。あめさんが「計器盤をもとに、数字だけ端末の字体」を選び、`src/app.css` のトークンに反映した
  (題字 Michroma、数字 Share Tech Mono、本文 Zen Kaku Gothic New、四隅の括弧)。比較用のページと案の CSS は消した(履歴の 7d53a0d にある)
- 星の数は約9千個のまま(あめさんの指定なし)。約4万個は `?stars=deep` で試せる
- スマホの実機での確認は、あめさんに依頼済み(結果はまだ)

直近の作業: (1) 3D の表示 → 計測 → 見た目の比較ページ、(2) 選ばれた見た目の反映と、第3段階の素材の調査。

## 3. 次回着手するなら

1. 第3段階: 素材の一覧(`docs/assets/stage3-assets.md`)をあめさんが確認 → 取得して加工 → 天の川、太陽の光、地球と月、木星と衛星、土星と環とタイタン、写真の窓
2. PROGRESS.md の「未解決の問題」(太陽のにじみ、打ち上げの場面の暗い地球、自動減速の配分、近い目印の名前の重なり)
3. 仕上げの段階で、日本語のフォントを画面で使う文字だけに絞る(docs/assets/fonts.md)

## 4. 判断待ち・残る論点

- 第3段階の素材の一覧の確認
- 星の数(約9千個のまま / 約4万個)
- スマホの実機での滑らかさと操作の確認(`npm run dev:lan` → 同じ Wi-Fi のスマホから Network の URL を開く)
- 星のデータ(HYG v4.4、CC BY-SA 4.0)の継承の範囲は「星のデータだけ」と置いた。第3段階の素材の一覧で確認
- 日本時間の併記の括弧は全角(規約の検査に合わせた)
- サイト名(仮称 ONE LIGHT-DAY)、公開の目標日は未定
- ハブの CLAUDE.md の「サブアプリ別」の表に voyager を足すか?

## 5. 落とし穴と鉄則

- **アプリ内のプレビューが隠れている間は、滑らかさを測れない**(ブラウザがコマを間引き、毎秒 15 コマに見える)。計測は `node tools/perf/measure.mjs`
- **Horizons のベクトル表の時刻は TDB**。UTC として扱うと 69 秒ずれる。変換は `src/lib/ephemeris/time.ts` だけ
- **惑星のそばを通る間の相対位置は `eph.position(天体, 'voyager1', et)` で直接取る**。太陽中心の位置どうしを引くと、木星で 380km・土星で 1,360km ずれる
- 3D はカメラを原点に置き、倍精度でカメラ相対の位置を出してから float32 に渡す。天体はカメラ中心に縮めて遠い順に描く(奥行きの判定を使わない)
- セッションの作業フォルダがハブの worktree の時、`~/claude-private/voyager` への直接の Write は hook で止まる。
  セッションの作業フォルダの中に voyager リポジトリの worktree を作って作業し、最後に main へマージする
- HYG の CSV は Codeberg の `media/` の URL から取る(`raw/` は Git LFS のポインタを返す)
- 画面に出ない開発者向けのエラー文は英語で書く(日本語の直書きは規約の検査で止まる)

## 6. 起動と検査

- `npm run dev`(ハブの `.claude/launch.json` の "voyager"。ポート 5180)
- `npm run verify`(規約の検査・型チェック・テスト・ビルド)
- `node tools/perf/measure.mjs`(dev サーバーを立ててから。滑らかさと震えの計測)
- データの作り直し: `npm run data:eph` / `npm run data:stars`(手順は docs/assets/)
- 確認用の URL: `?t=<UTC>&view=voyager|overview&look=<天体か ahead>&debug`
