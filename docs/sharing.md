# 共有した時のカードと、3D が使えない端末の表示

## 公開先の URL を決めたら直す 1 か所

`og:url` と `og:image` は絶対 URL が要る。`index.html` は Vite の環境変数 `%VITE_SITE_URL%` で埋めている。

- 既定の値はリポジトリ直下の `.env` の `VITE_SITE_URL`(末尾は `/`)。いまは仮に `https://ame-dev.com/one-light-day/`
- 公開先が決まったら、この 1 行だけを直す。ビルドのたびに `dist/index.html` へ反映される
- ビルドする環境で `VITE_SITE_URL=https://…/ npm run build` と渡せば、`.env` を変えずに上書きできる

## カードの中身

| 項目 | 置き場所 |
|---|---|
| 説明(`description` / `og:description`) | `index.html` |
| 画像 `public/og.jpg`(1200×630) | `tools/shots/shoot.mjs og` で撮り直す |
| 3D が使えない端末向けの静止画 `public/fallback.jpg`(1600×1000) | `tools/shots/shoot.mjs fallback` |
| アイコン | `public/favicon.svg` |

題字と副題の文言を変えたら、`index.html` の `og:title` と、`tools/shots/shoot.mjs` の題字を合わせて直し、`og.jpg` を撮り直す。

## 画像の撮り直し

```
npx vite --port 5188 --strictPort
node tools/shots/shoot.mjs og        # 既定は 1光日の日の本体視点(OG=saturn / OG=earth で前の案)
node tools/shots/shoot.mjs fallback
```

いまの画像は、1光日に達した日(2026-11-18)のボイジャーを本体の視点で後ろから撮り、左上に軌道の線つきの太陽系、右に機体を置いた構図(2026-11-21 にあめさんが選んだ)。機体は磁力計の竿の先まで画面に収め、ぽっかり浮かぶ感じにする。構図の数値(回り込み・右へのずらし・機体からの距離)は `shoot.mjs` の `CRAFT_FRAME` の既定の値。

比較用の案は `og-craft` / `og-saturn` / `og-earth`(`.shots/` に出る)。X のカードは、投稿前に Card Validator 相当の確認ができないので、公開後にリンクを貼って見え方を確かめる。

## 3D が使えない端末

`createStage` が例外を投げた時は、操作の部品の代わりに `Fallback`(静止画と短い案内)を出す。確かめる時は URL に `?no3d` を付ける(本番でも働く)。位置・星のデータの読み込みに失敗した時は、これとは別に「データを読み込めませんでした」を出す。

## 数字の桁が回る動き

`Readout` の大きい数字は `RollingNumber` で出す。回すのは、前に変わってから 500ms 以上空いた時で、変わった文字が 4 つ以内、かつ数字だけの時(`src/ui/rolling.ts`)。1日・1時間の送りと「1秒＝1時間」「1秒＝1日」の再生で回り、それ以上の速さ、時間軸のつまみ、名場面への移動では回さない。再生を押した直後の 1 回目だけは、速い再生でも一瞬回ることがある。
