# ONE LIGHT-DAY

ボイジャー1号の 49 年を、3D の眺めでたどるファンサイトです。ブラウザで動きます。広告や解析はありません。
NASA / JPL とは関係のない、非公式のサイトです。

## 開発の始め方

Node 26 が要ります。

```
npm ci          # 依存を入れる
npm run dev     # 開発サーバーを立てる(日本語のフォントも自動で作り直す)
```

## 検査

```
npm run verify  # 規約・フォント・型・テスト・ビルド・読み込む量の検査を、順に全部行う
```

個別には `npm run check`(規約・フォント・型)、`npm test`、`npm run build`、`npm run check:budget`(ビルドの後)があります。

## フォントとデータの作り直し

```
npm run fonts          # 日本語フォントを、画面で使う文字だけに絞る(build の前に自動で走る)
npm run data:eph       # 位置データ(NASA JPL Horizons)
npm run data:stars     # 星のデータ(HYG)
npm run data:textures  # 天体の地図と天の川
```

作ったフォントとデータは Git に入れてあるので、ふだんは作り直す必要はありません。手順は `docs/assets/` にあります。

## 文書

- `SPEC.md`: 何を作るか、決めてあること、完成の定義
- `HANDOFF.md`: 引き継ぎ(いまの状態、次にやること)
- `docs/`: 設計と素材の記録(`contracts.md`、`shared-parts.md`、`assets/`)、公開の手順(`publish.md`)
- `THIRD-PARTY-NOTICES.md`: 使っているもののライセンス
