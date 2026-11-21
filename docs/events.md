# ボイジャー1号の出来事(事実確認の記録)

第6段階の「出来事」の文を書く時の拠り所。2026-11-21 に NASA / JPL の資料で確かめた(担当のサブエージェントの調べ。引用は検索結果の要約を通したもので、原典の逐語確認ではない)。
画面の文は辞書に置き、ここは事実と出典だけ。食い違いや未確認は「注意」に書く。

## 名場面に含める出来事

| 名場面 | 日付(UTC) | 事実 | 注意 | 出典 |
|---|---|---|---|---|
| 打ち上げ | 1977-09-18 | 地球と月を初めて一緒に撮影した。地球から約 1,166 万km | 3 枚の色の画像の合成で、月は 3 倍明るく加工してある。「1 枚に収めた」とは書かない | [1] |
| 木星 | 1979-03-04(撮影) | 木星の環の最初の証拠が写った。環の厚さは 30km 以下 | 発表日(3 日後ごろ)は二次情報のみ。書かない | [2] |
| 木星 | 1979-03-08 撮影、03-09 発見 | 航法用の画像から、イオの縁に立ち上がる噴煙が見つかった。地球以外で初めての活火山。噴煙の高さは約 270km | 撮影と発見の日付を分けて書く | [3][4] |
| 木星 | 1979-03-05 | 木星に最接近。雲頂から約 27.7 万km | 時刻はサイトの位置データ(scenes.ts)を使う。速さの前後は位置データから計算する(資料の値は二次情報のみ)。前後 30 日の太陽に対する速さは、木星 13.2 → 23.6km/s、土星 20.2 → 21.5km/s(`src/lib/swingby.ts`) | [5] |
| 土星 | 1980-11-12 | タイタンに最接近(中心から約 6,490km)。土星の最接近の約 18 時間前 | 米国時間では 11 日。UTC で書く。サイトの位置データでは 05:40 UTC・中心から約 6,590km(資料と約 100km 違うので、画面には距離の数を書かない) | [6] |
| 土星 | 1980-11-12 | 土星に最接近(雲頂から約 12.6 万km)。土星の重力で進路が北へ曲がり、惑星の並ぶ面から約 35 度それた | 35 度は NASA の「約」の値。位置データでは通過の 30 日後に 34.2 度(2026-11-21 に確認) | [6] |
| ペイル・ブルー・ドット | 1990-02-14 05:22 GMT | カメラの電源を切った(地球を写した 04:48 の 34 分後)。太陽から約 60 億km | 「03:22」は出典が無い | [7] |

## 単独の刻みにする出来事

| 日付(UTC) | 事実 | 注意 | 出典 |
|---|---|---|---|
| 1998-02-17 | パイオニア10号を抜き、最も遠い人工物になった。太陽から 69.4 天文単位 | JPL の記事は事前の予告。時刻は書かない | [8] |
| 2004年12月 | 末端衝撃波を通過した。太陽から約 94 天文単位。磁場が約 2.5 倍に強まった | データの欠けた間(12/15〜12/17)の中で、正確な日時は分からない。「2004年12月」とだけ書く | [9] |
| 2017-11-28 | 軌道修正用のスラスターを 37 年ぶりに噴射した(前回は 1980-11-08) | | [10] |
| 2023-11-14 〜 2024-06-13 | 2023-11-14 から読めないデータが続いた(メモリの部品の故障)。プログラムを別の場所へ移し、2024-04-20 に機体の状態のデータ、2024-06-13 に 4 つの観測装置すべてのデータが戻った | 5 月の再開日は NASA の中で食い違う。書かない | [11][12] |

## 出典

1. https://science.nasa.gov/photojournal/crescent-earth-and-moon
2. https://www.jpl.nasa.gov/images/pia01484-first-evidence-of-jupiter-ring/
3. https://www.jpl.nasa.gov/images/pia00379-volcanic-eruptions-on-io/
4. https://arxiv.org/abs/1211.2554 (発見者の回想)
5. https://www.nasa.gov/history/40-years-ago-voyager-1-explores-jupiter
6. https://www.nasa.gov/history/40-years-ago-voyager-1-explores-saturn
7. https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot
8. https://www.jpl.nasa.gov/news/voyager-1-now-most-distant-human-made-object-in-space/
9. https://resolver.caltech.edu/CaltechAUTHORS:20140826-084449577
10. https://www.jpl.nasa.gov/news/voyager-1-fires-up-thrusters-after-37-years/
11. https://www.jpl.nasa.gov/news/nasas-voyager-1-resumes-sending-engineering-updates-to-earth
12. https://www.jpl.nasa.gov/news/voyager-1-returning-science-data-from-all-four-instruments/
