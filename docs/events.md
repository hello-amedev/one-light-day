# ボイジャー1号の出来事(事実確認の記録)

第6段階の「出来事」の文を書く時の拠り所。2026-11-21 に NASA / JPL の資料で確かめた(担当のサブエージェントの調べ。引用は検索結果の要約を通したもので、原典の逐語確認ではない)。
画面の文は辞書に置き、ここは事実と出典だけ。食い違いや未確認は「注意」に書く。

## 名場面に含める出来事

| 名場面 | 日付(UTC) | 事実 | 注意 | 出典 |
|---|---|---|---|---|
| 打ち上げ | 1977-09-18 | 地球と月を初めて一緒に撮影した。地球から約 1,166 万km | 3 枚の色の画像の合成で、月は 3 倍明るく加工してある。「1 枚に収めた」とは書かない | [1] |
| 木星 | 1979-03-04(撮影) | 木星の環の最初の証拠が写った。環の厚さは 30km 以下 | 発表日(3 日後ごろ)は二次情報のみ。書かない | [2] |
| 木星 | 1979-03-08 撮影、03-09 発見 | 航法用の画像から、イオの縁に立ち上がる噴煙が見つかった。地球以外で初めての活火山。噴煙の高さは 260km 以上 | 撮影と発見の日付を分けて書く。「約 270km」は出典に無い(PIA00379 は 260km 以上) | [3][4] |
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

## 2026-11-21 の調べ直し(サイトの文を書き直した時)

担当のサブエージェントが、上の出典と下の追加の出典を実際に開いて確かめた。画面の文はこの結果に合わせてある。

| 項目 | 確かめた事実 | 画面の文への影響 | 出典 |
|---|---|---|---|
| 打ち上げ | 1977-09-05 12:56 UT。2号(1977-08-20)の 16 日後に出発し、速い軌道で 4 か月早く木星に着いた | 名場面「打ち上げ」の文 | [13][14] |
| 地球と月 | NASA の言い方は「地球と月を 1 枚に収めた初めての画像」「宇宙機が撮った初めての同種の写真」。「初めて一緒に撮影」は言い過ぎ | 「同じ画面に写った、初めての写真」 | [1][14] |
| イオ | 噴煙は 260km 以上(PIA00379)。発見は撮影の翌日、航法の技術者による | 「260km 以上」 | [3][4] |
| 木星 | NASA は雲頂から約 28 万km。中心から約 35 万km は位置データ(Horizons)の値 | 名場面の文は中心からの距離(サイトの位置データと合わせる) | [5] |
| タイタン | 中心から約 6,490km。窒素の厚い大気が地表を隠していた | 出来事の文 | [13] |
| 土星 | 雲頂から約 12.6 万km。北へ向かい黄道面を離れ、ほかの惑星には寄れなくなった。35 度は進む向きの角度 | 「土星に最接近。スイングバイによる進路変更で、黄道面（惑星の軌道が並ぶ面）を離れ、土星が最後に訪れた惑星になった」。「北」は黄道の北で読み手に通じないので書かない。35 度も書かない | [6][13] |
| カメラの電源 | 電力を節約するため。1号・2号を通じて最後の写真 | 出来事の文 | [7][14] |
| ペイル・ブルー・ドット | 地球は 0.12 画素。太陽から約 60 億km | 名場面の文、写真の代替文 | [7][15] |
| 末端衝撃波 | 太陽風が音速より速い状態から急に遅くなる境目。約 94 天文単位、磁場は約 2.5 倍 | 出来事の文に境目の説明を足した | [16][17] |
| 太陽圏の外 | 2012-08-25、約 122 天文単位(約 183 億km)。人工物で初めて星間空間へ | 名場面の文 | [16][18] |
| スラスター | 姿勢制御用が 2014 年から劣化。軌道修正用で代わりを務め、運用を 2〜3 年延ばせる | 出来事の文 | [10] |
| メモリの故障 | 故障したのは、データをまとめるコンピューター(FDS)のメモリの 1 つの部品。プログラムを分けて別の場所へ移した。当時は地球から約 240 億km | 出来事の文 | [11][12] |
| 1 光日 | 2026-11-18 10:16 UTC(NASA の発表)。約 259 億km。地球から 1 光日に達した初めての宇宙機 | 名場面の文、「このサイトについて」 | [19][20] |
| 狭角カメラ | 視野 0.42 度 | 「このサイトについて」の拡大の説明 | [21] |

注意: 2026-11-14 から、ボイジャー1号からデータが届かず、電波の搬送波だけを受けている(NASA が原因を調べている)。観測装置は 2026-04-17 に LECP を切り、残りは磁力計とプラズマ波の 2 つ。サイトの文はこの状況を扱っていない。

13. https://science.nasa.gov/mission/voyager/voyager-1/
14. https://www.nasa.gov/history/45-years-ago-voyager-1-begins-its-epic-journey-to-the-outer-planets-and-beyond/
15. https://www.jpl.nasa.gov/images/pia00452-solar-system-portrait-earth-as-pale-blue-dot/
16. https://science.nasa.gov/mission/voyager/interstellar-mission/
17. https://www.jpl.nasa.gov/news/voyager-spacecraft-enters-solar-systems-final-frontier/
18. https://www.nasa.gov/news-release/nasa-spacecraft-embarks-on-historic-journey-into-interstellar-space/
19. https://www.nasa.gov/news-release/nasas-voyager-1-makes-history-reaching-one-light-day-from-earth/
20. https://science.nasa.gov/resource/voyager-one-light-day-downloads/
21. https://ntrs.nasa.gov/citations/19820036881

## 2026-11-22 の調べ: 1光日の報じられ方

名場面「地球から1光日」の文を書き直す時に、NASA と国内外の報道の言い方を調べた(担当のサブエージェント。NASA の 3 ページは原文、ほかは要約を通した読み)。

- NASA: 「A light-day is the distance light travels in 24 hours」。管理者の言い方は「信号は機体まで 24 時間、こちらへ戻るのに 24 時間」。解説のページは「no other human-made object」が達していない距離とする
- 国内: NHK「光の速さで24時間かかる「1光日」」、毎日「光でも丸1日かかる遠さ」、sorae「光で丸1日かかる距離」、アストロアーツ「交信には片道24時間、往復で2日かかる」、CNN.co.jp「交信に往復2日」
- 多く使われた説明は「光の速さで 1 日(24 時間)」と「片道 1 日・往復 2 日」の 2 つ。画面の文はこの 2 つで書いた
- 2026-11-14 から科学・工学のデータは届かず、搬送波だけを受けている。NASA は搬送波と軌道の計算で 1 光日を確かめた。画面の文は扱っていない

出典: https://www.nasa.gov/news-release/nasas-voyager-1-makes-history-reaching-one-light-day-from-earth/ 、https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/ 、https://svs.gsfc.nasa.gov/15120 、https://www.astroarts.co.jp/article/hl/a/14777_voyager1 、https://sorae.info/space/20261117-voyager-1-one-light-day.html

## 2026-11-22 の調べ: 最も遠い人工物になった日の距離の基準

文言の直しの画面で、出来事の名前を「地球から最も遠い人工物に」とする案が出たので、Horizons でボイジャー1号(-31)とパイオニア10号(-23)の距離を 10 日おきに比べた。

- 太陽からの距離: 1998-02-19 でパイオニア10号 69.424 天文単位、ボイジャー1号 69.425 天文単位。2-17 ごろに入れ替わる(NASA の日付と合う)
- 地球からの距離: 1997-11-01 ですでにボイジャー1号が遠い(69.04 対 67.86)。1998-03-01 から 7 月ごろまではパイオニア10号のほうが遠い。地球の公転で入れ替わりを繰り返す
- そのため、2-17 の出来事は「太陽から」の距離で書く。画面の名前は「太陽から最も遠い人工物に」

出典: https://ssd.jpl.nasa.gov/horizons/ (観測者の表、中心は地球、量 19・20)
