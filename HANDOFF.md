# HANDOFF(voyager / ONE LIGHT-DAY)

## 0. 次の Claude へ
起動時に読むのはこのファイルと CLAUDE.md だけ。仕様は SPEC.md、部品の境界とデータの形は docs/contracts.md、設計書(図つき)は SPEC.md 冒頭の URL。

## 1. 概要
ボイジャー1号の49年を、ボイジャーの視界と太陽系の引きの眺めでたどるファンサイト。Vite + Svelte 5 + three.js。GitHub: hello-amedev/voyager(Private)。

## 2. 現在の状態(2026-11-21。第1段階の途中で、利用上限により中断)
- ブランチ claude/stage1 に、土台・星のデータ(担当B)・画面の操作部品(担当C)を統合済み。`npm run check` と `npm test` が通る
- **位置データ(担当A)は未統合**。ブランチ unit/eph の作業コピー(セッションの作業フォルダの units/eph)に未コミットの成果が残っている可能性がある。残っていれば検品(`node tools/ephemeris/build.mjs --verify`、`npm test`)してからコミットし、claude/stage1 へマージする。無ければ docs/contracts.md と下の指示で作り直す
- 3D の表示(src/stage/)は未着手(差し込み口のまま)。位置データが無い間、開発時は代用データ(src/ui/dev/mockData.ts)で操作の部品だけ動く
- 操作の部品は、ブラウザでの実操作(つまむ・再生・ボタン)をまだ目視していない
- main には空のコミットだけ。claude/stage1 は main へ未マージ

## 3. 次回着手するなら
1. 位置データ(担当A の成果)を検品して統合する
2. 3D の表示を作る(カメラを原点に置き、倍精度でカメラ相対の位置を計算。天体はカメラ中心に縮めて遠い順に描く。動いた時だけ描く。画素比の上限 2)。合格の条件は SPEC.md の第1段階
3. ブラウザで通しの確認と快適さの計測 → PROGRESS.md に記録 → main へマージ
4. 第2段階: 見た目の比較ページ(色・フォント・あしらい・星の数 9千 / 4万)

## 4. 判断待ち・残る論点
- 星のデータ(HYG v4.4、CC BY-SA 4.0)の継承の範囲は「星のデータだけ」と置いた。第3段階の素材の一覧であめさんが確認
- 日本時間の併記の括弧は全角にしてある(規約の検査に合わせた)
- サイト名(仮称 ONE LIGHT-DAY)、公開の目標日は未定

## 5. 落とし穴
- セッションの作業フォルダがハブの worktree の時、~/claude-private/voyager への直接の Write は hook で止まる。セッションの作業フォルダの中に voyager リポジトリの worktree を作って作業し、最後に main へマージする
- Horizons のベクトル表の時刻は TDB。UTC として扱うと 69 秒ずれる(変換は src/lib/ephemeris/time.ts だけ)
- HYG の CSV は Codeberg の media/ の URL から取る(raw/ は Git LFS のポインタを返す)

## 6. 起動と検査
- `npm run dev`(ハブの .claude/launch.json に "voyager" を追加済み。ポート 5180)
- `npm run verify`(規約の検査・型チェック・テスト・ビルド)
