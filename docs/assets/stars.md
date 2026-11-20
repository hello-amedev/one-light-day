# 星のデータ(担当B)

## 出どころ

- **HYG Database v4.4**(Hipparcos・Yale Bright Star・Gliese を統合した恒星データベース)。作者は David Nash(astronexus)
- 取得した URL: `https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz`(13,636,362 バイト。Codeberg の Git LFS の実体)
  - `raw/` の URL は LFS のポインタ(133 バイトの文字列)を返すので使えない。道具は SHA-256(`00b34989…682197d`)で取り違えを検出する
- 取得した日: 2026-11-20
- 公式ページ: https://www.astronexus.com/projects/hyg (配布元の案内。この日の表示は v4.2 で、リポジトリの v4.4 のほうが新しい)

## 利用条件(読んだページと要点)

- https://www.astronexus.com/projects/hyg : 「HYG データベースは Creative Commons 表示-継承 4.0 ライセンスで提供される」。クレジットの文面の指定は無い
- https://codeberg.org/astronexus/hyg/raw/branch/main/LICENSE と README.md : 「This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License」。v4.0 以降が CC BY-SA 4.0(v3.x 以前は 2.5)
- https://codeberg.org/astronexus/hyg/raw/branch/main/data/hyg/README.md : v4.4 の変更点と列の説明。proper 名は IAU の公式名

CC BY-SA 4.0 の要点: 出典の表示、ライセンスへのリンク、変更した旨の明記が要る。加工物は同じライセンスで提供する(継承)。商用利用も可。

## 対応

- 加工した bin は HYG の翻案なので、`public/data/stars/LICENSE.md` を置き、bin を CC BY-SA 4.0 で提供する
- 継承の対象は「加工した星のデータ」。サイトのコードや文章は対象外のつもりだが、法的な線引きは未確認(監督の判断事項)

### サイトの出典ページに書く文の案

> 星の位置・明るさ・色は HYG Database v4.4(David Nash、Hipparcos・Yale Bright Star Catalog・Gliese を統合)をもとに、
> 8等までの星を選び、黄道座標に変換して並べ替えたものです。加工後のデータも [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.ja) で提供しています。
> 元のデータ: https://codeberg.org/astronexus/hyg

## 作った内容

| ファイル | 内容 | 星の数 | 大きさ |
|---|---|---|---|
| `public/data/stars/stars.bin` | 6.5 等まで | 8,920 | 178,400 バイト |
| `public/data/stars/stars-deep.bin` | 6.5 等より暗く 8.0 等まで | 32,566 | 651,320 バイト |

- 1 つの星は `[x, y, z, mag, bv]` の Float32(リトルエンディアン)。xyz は黄道 J2000 の単位ベクトル。明るい順(同じ等級は HYG の id 順)
- 捨てた行(119,614 行のうち): 太陽 1、8 等より暗い 78,127。位置なし・等級なしは 0。B−V が無い星 112 個は 0.6 で代用
- 固有運動は使っていない(HYG の J2000 の位置のまま)
- HYG の等級はシリウスが −1.44(BSC の −1.46 と少し違う)

## 作り直す手順

`npm run data:stars` だけでよい。`tools/stars/cache/`(.gitignore 済み)に生データを保存し、2 回目以降はそこから読む。
同じ入力なら同じ bin ができる(確認済み)。HYG の版を上げる時は、`tools/stars/build.mjs` の `HYG_URL` と `HYG_SHA256`(LFS ポインタの oid)を直す。
テスト用の `tests/stars/fixtures/named.json` も同時に作り直される。
