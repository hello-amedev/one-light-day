# 使っているもののライセンス

ONE LIGHT-DAY は NASA / JPL とは関係のない、非公式のファンサイトです。使っているものと、そのライセンスの一覧です。
素材ごとの取得日・取得元の URL・利用条件の読み直しの記録は `docs/assets/` にあります。

## ソフトウェア

| 名前 | 使う所 | ライセンス | 出どころ |
|---|---|---|---|
| three.js | 3D の描画 | MIT | https://threejs.org / https://github.com/mrdoob/three.js |
| Svelte | 画面の部品 | MIT | https://svelte.dev / https://github.com/sveltejs/svelte |

ビルドの道具(Vite、TypeScript、Vitest、subset-font など)は成果物に入りません。それぞれのライセンスは `node_modules/<パッケージ>/` にあります。

## フォント(SIL Open Font License 1.1)

| 名前 | 使う所 | 著作権表示 | 出どころ |
|---|---|---|---|
| Michroma | 題字 | Copyright 2011 The Michroma Project Authors | `@fontsource/michroma` |
| Share Tech Mono | 数字 | Copyright (c) 2012, Carrois Type Design, Ralph du Carrois(予約フォント名 "Share") | `@fontsource/share-tech-mono` |
| Zen Kaku Gothic New(太さ 400) | 本文と日本語 | Copyright 2022 The Zen Project Authors | `@fontsource/zen-kaku-gothic-new` |

Zen Kaku Gothic New は、サイトで使う文字だけを残した 1 ファイル(`src/assets/fonts/zen-kaku-gothic-new-subset.woff2`)に絞って同梱しています。
絞ることは OFL で認められた改変です。元と同じ OFL 1.1 の下にあり、ライセンスの全文は https://openfontlicense.org/ で読めます。

## データ

| 名前 | 使う所 | ライセンス・条件 | 出どころ |
|---|---|---|---|
| 位置データ | 天体とボイジャーの位置 | NASA / JPL の成果物。出典を示せば利用できる。ロゴは使わない | NASA/JPL Horizons On-Line Ephemeris System(https://ssd.jpl.nasa.gov/horizons/) |
| HYG Database v4.4(David Nash)を加工した星のデータ | 背景の星 | CC BY-SA 4.0。加工したデータも同じライセンスで提供(`public/data/stars/LICENSE.md`) | https://codeberg.org/astronexus/hyg |

## 画像

| 使う所 | クレジット | 条件 |
|---|---|---|
| 地球 | NASA Goddard Space Flight Center(画像: Reto Stöckli、Robert Simmon)。Blue Marble | 出典を書く |
| 月 | NASA's Scientific Visualization Studio(CGI Moon Kit) | NASA の一般の方針(出典を書く、ロゴは使わない、NASA の推薦に見せない) |
| 木星 | NASA/JPL/Space Science Institute(カッシーニの全球の地図 PIA07782) | 出典を書く。ロゴは使わない |
| イオ・エウロパ・ガニメデ・カリスト | U.S. Geological Survey(ボイジャーとガリレオの画像から作った全球の地図) | パブリックドメイン |
| 天の川の背景 | NASA/Goddard Space Flight Center Scientific Visualization Studio、Gaia DR2: ESA/Gaia/DPAC | NASA の一般の方針。元の星のデータ(Gaia DR2)は CC BY-NC 3.0 IGO のため、広告・物販を付けない間だけ使える |
| ペイル・ブルー・ドット | NASA/JPL-Caltech(2020 年の再処理版 PIA23645) | 出典を書く。再処理版であることを書く |

土星・環・タイタンは素材を使わず、プログラムで描いています。

NASA / JPL は、このサイトを推薦・承認していません。

## ボイジャー本体の 3D モデルと圧縮の復号

| 名前 | 使う所 | ライセンス・条件 | 出どころ |
|---|---|---|---|
| Voyager Probe (B)(`public/models/voyager.glb`) | 「ボイジャー本体」の視点の 3D モデル | NASA の素材の方針(無料・著作権なし。出典を書く、NASA の推薦に見せない、ロゴは使わない)。モデルにロゴは無い | NASA 3D Resources(https://github.com/nasa/NASA-3D-Resources) |
| Draco の復号の部品(`public/draco/`) | 上のモデルの圧縮を解く | Apache License 2.0 | https://github.com/google/draco(three.js 同梱の版) |

Draco の部品は Copyright Google Inc. です。ライセンスの全文は https://www.apache.org/licenses/LICENSE-2.0 で読めます。
