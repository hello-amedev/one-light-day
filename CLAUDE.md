# CLAUDE.md(voyager / ONE LIGHT-DAY)

ボイジャー1号の49年をたどるファンサイト。まず [HANDOFF.md](HANDOFF.md) を読む。

## 決まり

- 仕様の正本は [SPEC.md](SPEC.md)。迷ったらここに戻る。仕様に無い思いつきは実装せず、SPEC.md の「提案リスト」に書く
- 部品の境界・座標・時刻・データの形は [docs/contracts.md](docs/contracts.md)。座標は黄道 J2000、時刻は TDB の秒数。UTC との変換は `src/lib/ephemeris/time.ts` だけで行う
- 画面の文字は辞書(`src/lib/i18n`)に置く。決まりはハブの `i18n-conventions.md`
- 色・フォント・線・動きの長さは `src/app.css` のトークンから取る。部品の中に直接書かない
- サイト本体は同梱したファイル以外を読み込まない(外部のフォント・解析・CDN を足さない)
- NASA / JPL のロゴは使わない。取得した素材は `docs/assets/` に出どころと条件を書く
- 検査は `npm run verify`(規約の検査・型チェック・テスト・ビルド)
- 公開(GitHub Pages、リポジトリの公開への切り替え)は、あめさんの確認を取ってから
