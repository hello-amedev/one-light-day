# 部品の境界とデータの形(担当間の取り決め)

複数の担当が並行して作るための共通の前提。ここに書いた形と境界は、監督の合意なしに変えない。
変える必要が出たら、作業を止めて報告する。

## 1. デザインブリーフ(全担当に共通)

- **誰が使うか**: ボイジャーや宇宙が好きな一般の人。エンジニアではない。X のリンクから来て、スマホか PC で数分眺める
- **どんな体験か**: 説明図ではなく、眺めるための映像。主役は宇宙の眺めで、文字や操作の部品は控えめに置き、操作しない間は薄れる。
  数字と日付は「本物のデータで動いている」ことが伝わる精度で出す
- **見た目**: 1977年ごろの計器や印刷物を手がかりにしたレトロフューチャー。入れる場所は文字・目盛り・線だけ。
  ネオンの色、画面の乱れの演出、NASA のロゴは使わない
- **第1段階の見た目は仮**。ただし色・フォント・線の太さ・動きの長さは、必ず `src/app.css` の変数(トークン)から取る。
  第2段階で、この変数を差し替えて見た目の案を比べるため。部品の中に色や字体を直接書かない
- **文言**: 日本語。短いラベルにする。画面に出る文字はすべて辞書(`src/lib/i18n`)に置く。数字・英字と日本語の間に空白を入れない

仮のトークンの値(第1段階):

| 役割 | 値 |
|---|---|
| 宇宙の地の色 | `#070a11` |
| 文字 | `#ebe5d3` |
| 控えめな文字 | `#979daa` |
| 金(線・選択中・刻み) | `#d8a84a` |
| 地球だけに使う淡い青 | `#a9cdf0` |
| 罫線 | `#273044` |
| 題字の欧文 / 数字 / 本文 | 第1段階は端末のフォント(`ui-sans-serif` / `ui-monospace`)。外部のフォントは読み込まない |

## 2. 全体の構造

```
public/data/eph/     位置データ(担当A の道具が作る)
public/data/stars/   星のデータ(担当B の道具が作る)
tools/ephemeris/     NASA JPL Horizons から取得して加工する道具(Node)
tools/stars/         恒星カタログを取得して加工する道具(Node)
src/lib/bodies.ts    天体の ID と半径(共通。変えない)
src/lib/scenes.ts    名場面の一覧(共通。変えない)
src/lib/ephemeris/   位置データの読み出し(担当A)。types.ts と time.ts は共通
src/lib/stars/       星のデータの読み出し(担当B)。types.ts は共通
src/lib/store/       画面全体の状態(担当C)。types.ts は共通
src/lib/i18n/        画面の文言の辞書(担当C)
src/lib/format.ts    日付・距離・時間の整形(担当C)
src/ui/              画面の部品(担当C)
src/app.css          トークンと土台のスタイル(担当C)
src/App.svelte       画面の入口(担当C。第2波で担当D が 3D をつなぐ)
src/stage/           3D の表示(担当D。第2波)
tests/               自動テスト(担当ごとに tests/<領域>/)
```

データの流れ: 道具 → `public/data` → 読み出し(`loadEphemeris` / `loadStars`) → 状態(`AppStore`) ⇄ 画面の部品 / 3D の表示。
画面の部品と 3D の表示は互いを直接呼ばず、`AppStore` だけを介してつながる。

## 3. 座標と時刻(全担当が守る)

- **座標**: 黄道 J2000(x = 春分点の方向、z = 黄道の北)。右手系。単位は km、速度は km/s
- **時刻**: `et` = TDB の秒数(J2000 = 2000-01-01 12:00:00 TDB が 0)。倍精度の数値
- **UTC との変換**は `src/lib/ephemeris/time.ts` だけで行う。Horizons のベクトル表の時刻は TDB なので、UTC として扱わない(69 秒ずれる)
- **画面に出す日付は UTC**。日本時間を併記するのは、時刻が意味を持つ所だけ
- **距離**は、その瞬間の直線距離。光が届くまでの時間 = 距離 ÷ 光の速さ(`C_KM_S`)
- 3D の表示は three.js の座標にそのまま黄道 J2000 を使う(軸を入れ替えない)。「上」は +z

## 4. 型の取り決め

正本はソースの型。ここは要約。

- `src/lib/ephemeris/types.ts` — `Ephemeris`(`position` / `velocity` / `distance` / `coverage` / `track`)
- `src/lib/ephemeris/time.ts` — `etFromUtcMs` / `utcMsFromEt` / `etFromIso` / `etNow`
- `src/lib/stars/types.ts` — `StarCatalog`(`[x, y, z, mag, bv]` × count、明るい順、xyz は黄道 J2000 の単位ベクトル)
- `src/lib/store/types.ts` — `AppState` / `AppStore` / `RATE_SECONDS`
- `src/lib/scenes.ts` — `SCENES`(名場面の時刻と、向く相手、自動減速の幅)
- `src/stage/index.ts` — `createStage({ canvas, overlay, eph, stars, store })`

## 5. 位置データのファイルの形

`public/data/eph/manifest.json` と、区間ごとの `.bin`。

```jsonc
{
  "version": 1,
  "frame": "ECLIPJ2000",
  "generated": "2026-11-20",          // 作った日
  "source": "NASA JPL Horizons",
  "bodies": {
    "voyager1": {
      "segments": [
        // center: この区間の位置が何を中心にしているか(BodyId)
        // dtype: "f64" か "f32"。count: レコードの数。t0 / t1: 区間の範囲(et)
        { "center": "sun", "file": "voyager1.sun.bin", "dtype": "f64", "count": 4321, "t0": -7.04e8, "t1": 1.89e9 },
        { "center": "jupiter", "file": "voyager1.jupiter.bin", "dtype": "f64", "count": 2000, "t0": 0, "t1": 0 }
      ]
    },
    "earth": { "segments": [ { "center": "sun", "file": "earth.sun.bin", "dtype": "f64", "count": 0, "t0": 0, "t1": 0 } ] }
  }
}
```

- `.bin` は、レコード `[t, x, y, z, vx, vy, vz]` を count 個並べたもの(リトルエンディアン)。`dtype` が `f64` なら 1 レコード 56 バイト、`f32` なら 28 バイト。
  `f32` の区間でも t は別に持つ必要があるので、`f32` の時は `t` だけ `f64` の配列を先頭に置く: `[t × count (f64)] [x, y, z, vx, vy, vz × count (f32)]`
- レコードの間隔は一定でなくてよい(通過の前後は密、巡航は粗く)。t は昇順
- レコードの間は、位置と速度の両方を使う3次のエルミート補間でつなぐ
- 同じ時刻に複数の区間がある時は、太陽以外を中心にした区間を優先する(通過の距離と向きを正確に出すため)

## 6. 守ること(全担当)

- **自分の担当の場所以外を編集しない**。`package.json` は依存を足す必要が出た時だけ触り、報告に書く
- 共通の型(`types.ts`)・`bodies.ts`・`scenes.ts` に足りないものがあれば、勝手に変えずに報告する(足すだけで済む小さな追加は、理由を添えて行ってよい)
- 外部への通信は、データを作る道具(`tools/`)の中だけ。サイト本体(`src/`)は、同梱したファイル以外を読み込まない
- 取得した素材は、出どころ・URL・使用の条件・出典の文を `docs/assets/<領域>.md` に書く
- `npm run check`(規約の検査 + 型チェック)と `npm test` を通してから報告する
- コミットしない(監督が検品してからコミットする)
