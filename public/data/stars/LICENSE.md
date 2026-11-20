# 星のデータのライセンス

このフォルダの星のデータ(`stars.bin`、`stars-deep.bin`)は、HYG Database v4.4 を加工したものです。
加工したデータは、元と同じ [Creative Commons 表示-継承 4.0 国際(CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.ja)で提供します。

## 元のデータ

- 名前: HYG Database(Hipparcos、Yale Bright Star Catalog、Gliese の 3 つのカタログを統合した恒星データベース)
- 版: v4.4(2026-07-12 の更新)
- 作者: David Nash(astronexus)
- 配布元: https://codeberg.org/astronexus/hyg 、 https://www.astronexus.com/projects/hyg
- ライセンス: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

## 加工の内容

- 太陽(Sol)を除いた
- 視等級 8.0 等までの星を選んだ
- 赤経・赤緯(J2000)を、黄道座標 J2000 の単位ベクトル(x, y, z)に変換した
- 明るい順に並べ、6.5 等までを `stars.bin`、6.5 等より暗い星を `stars-deep.bin` に分けた
- 1 つの星を `[x, y, z, 等級, B−V の色指数]` の 5 個の Float32(リトルエンディアン)で書いた。色指数が無い星は 0.6 とした
- 固有運動、距離、名前、ほかのカタログの番号は捨てた

作り直す手順は `docs/assets/stars.md` にあります。
