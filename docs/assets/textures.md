# テクスチャ(天体の球に貼る地図と背景の天の川)

取得日: 2026-11-21。作り直す手順は、末尾の「作り直す」。
画像の出どころごとの利用条件は、取得した日に各配布元のページで読み直し、`docs/assets/stage3-assets.md` の記載と食い違いが無いことを確かめた。

## 道具の前提

- `npm run data:textures`(`tools/textures/build.mjs`)。Node 26。package.json に依存は足していない
- 外部の実行ファイル: `curl`(取得。途中から再開できる)と `python3` + Pillow + numpy(加工。`tools/textures/process.py`)。どちらもこの Mac に入っているもの
- EXR の読み込みだけは three.js 同梱の `EXRLoader`(Node で動く)。three.js の EXRLoader は行を下から上の順で返すため、加工の側で北が上になるよう反転している
- 生のファイルは `tools/textures/cache/`(Git に入れない。約 0.9GB)。同梱するのは `public/textures/`(合計 約 8MB)
- 取得したファイルは SHA-256 で照合する。値は `build.mjs` の `FILES` にある。配布元で差し替わると、止まって知らせる

## 共通の条件

- NASA / JPL の画像: 事前の許可は不要、出典を書く。NASA・JPL が推薦・承認しているように見せない。NASA / JPL のロゴは使わない
- USGS が作った地図: 利用の制約なし(ページの「Use Constraints: None」)。出典を書く
- 天の川: NASA の画像だが、元の星のデータ(ESA Gaia DR2)は CC BY-NC 3.0 IGO(非営利に限る)。広告・物販を付けない間は使える。付ける時は差し替える

## 素材ごとの記録

| 名前 | 配布ページ | 取得したファイル | SHA-256 | クレジット |
|---|---|---|---|---|
| earth | https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/ | https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/land_ocean_ice_cloud_2048.jpg(2048×1024) | fb67ac03…fe708e | NASA Goddard Space Flight Center(画像: Reto Stöckli、Robert Simmon) |
| moon | https://svs.gsfc.nasa.gov/4720/ | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif(4096×2048) | 918649a7…1344f | NASA's Scientific Visualization Studio |
| jupiter | https://www.jpl.nasa.gov/images/pia07782-cassinis-best-maps-of-jupiter-cylindrical-map/ | https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA07782.jpg(3601×1801) | 6b835ddd…ba3 | NASA/JPL/Space Science Institute |
| io | https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km | https://planetarymaps.usgs.gov/mosaic/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif(11445×5723、約197MB) | 135f88cb…81ac | U.S. Geological Survey |
| europa | https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m | https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif(19631×9816、約193MB) | a323f0c9…9624 | U.S. Geological Survey |
| ganymede | https://astrogeology.usgs.gov/search/map/ganymede_voyager_galileo_ssi_global_mosaic_1km | https://planetarymaps.usgs.gov/mosaic/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif(16539×8270、約137MB) | c2c8d950…f888 | U.S. Geological Survey |
| callisto | https://astrogeology.usgs.gov/search/map/callisto_voyager_galileo_ssi_global_mosaic_1km | https://planetarymaps.usgs.gov/mosaic/Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif(15138×7569、約115MB) | e1f0bd2e…3dbaa3 | U.S. Geological Survey |
| milkyway | https://svs.gsfc.nasa.gov/4851/ | https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k.exr(4096×2048、約35MB、半精度浮動小数点) | 2eb802d6…f74fdb | NASA/Goddard Space Flight Center Scientific Visualization Studio、Gaia DR2: ESA/Gaia/DPAC |
| pbd | https://science.nasa.gov/photojournal/pale-blue-dot-revisited/ | https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia23/pia23645/PIA23645.jpg(5230×5175、約0.6MB) | b783a29a…c265c34 | NASA/JPL-Caltech(2020年の再処理版) |
| earthmoon | https://science.nasa.gov/photojournal/crescent-earth-and-moon/ | https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00013/PIA00013.jpg(565×790、約9KB。2026-11-22 に取得) | 62894fa8…cd2b16 | NASA/JPL |

SHA-256 の全文は `tools/textures/build.mjs` の `FILES` にある。

### 利用条件の要点(取得日に読み直した結果)

- earth: 「教育者・科学者・博物館・一般に自由に使える」。出典は NASA Goddard / Reto Stöckli / Robert Simmon
- moon: 出典は「NASA's Scientific Visualization Studio」。ページに別の許諾の記載なし。NASA の一般の方針に従う
- jupiter: キャプションの出典は NASA/JPL/Space Science Institute。JPL の画像の方針は、事前の許可は不要・出典を書く・ロゴは使わない(ロゴは事前の書面の承認が要る)・推薦に見せない
- 衛星(USGS): 「Use Constraints: None」
- milkyway: 出典は上の表のとおり。ページに別の許諾の記載なし。NASA の一般の方針と、Gaia データの CC BY-NC 3.0 IGO
- pbd: JPL の画像の方針
- earthmoon: ページの出典は「NASA/JPL」。JPL の画像の方針(事前の許可は不要・出典を書く)。3 枚の色の画像の合成で、月は NASA が 3 倍明るくしてある(サイトの「このサイトについて」に書いた)

一覧(stage3-assets.md)の記載との食い違いは無かった。

### 地球の 8192 画素版が取れなかったこと

指示書の第一候補 `eoimages.gsfc.nasa.gov` は、この環境から接続が時間切れになった(2026-11-21、IPv4・IPv6 とも)。NASA の新しい置き場所(`assets.science.nasa.gov`)には、8192 画素の版が無い(2048 の版だけ)。
Blue Marble: Next Generation の 5400 画素の版は、同じ置き場所からは縮小された版(1280 画素)しか取れず、雲だけの画像は 2048 のみ。重ねても元より細かくならないため、2048 画素の版を拡大せずに使った(地球の hi は 2048、lo は 1024)。8192 画素版の置き場所が戻った時は、`build.mjs` の `FILES` の earth の URL と SHA、`process.py` の `photo('earth', …, 4096, 2048)` を差し替える。

## 加工

- すべて JPEG(品質 84〜86、プログレッシブ)。図法は正距円筒のまま。hi から lo を作る(天の川は線形の値から)
- 共通: 縮小は Lanczos(浮動小数点のまま)。上端・下端の 2%(天の川は 3%)の行を行の平均色になじませた(極で筋が渦のように集まらないように)。左右の端をそろえ、継ぎ目の線が出ないようにした
- 衛星の地図の「画像のない所」(値が 0 の黒い穴。極や撮影の隙間)は、数えずに縮め、周りの値のなだらかな補間で埋めた(球に貼った時に黒い穴にならないように)
- **色つけ(演出)**: エウロパ・ガニメデ・カリストの元の地図は白黒。明るさ(輝度)は地図のまま、色相と彩度だけを乗せた。乗せた色(相対値、輝度は 1 にそろえる): エウロパ (1.00, 0.98, 0.88) 黄みのある白、ガニメデ (1.00, 0.93, 0.84) 灰がかった褐色、カリスト (1.00, 0.86, 0.70) 暗い褐色。実際の色の測定値ではなく、平均的な印象に合わせた値
- イオは元から色つき(ガリレオとボイジャーの色合成)。色は触っていない
- 木星は 3601×1801 を 3600×1800 に揃えた
- **天の川の調整**(`process.py` の `MW_*`): 線形の値から黒点 0.0065 を引き、露出 2.4 倍、肩 `x/(1+0.9x)`、ガンマ 2.2(`x^(1/2.2)`)。8bit にする前に 1 段階ぶんの乱数を足して、暗部の帯状のむらを散らした。暗い星の点は元のまま。明るさの分布(線形値)は、中央値 0.014、99% が 0.2、最大 1.0

## 向きの確認

次の担当が球に貼る時の基準。経度は東経を正とした(画像の中身で確かめた向き)。

| 名前 | 左端 | 右へ行くと | 上 | 確かめたもの |
|---|---|---|---|---|
| earth | 東経 -180 | 東経が増える | 北 | 大陸の形(北米が左、アフリカが中央、オーストラリアが右下) |
| moon | 東経 -180(中央が 0) | 東経が増える | 北 | 中央にティコ(11°W、43°S)が下寄り、右にクリシウム海(59°E、17°N)。配布ページは「0° 中心」と記載 |
| jupiter | 基準は配布ページに無い。左端を 0 とした仮の値 | 東(右) | 北 | 大赤斑(南半球)の後ろ(西側)に乱れが伸びるのが左に見える。木星の経度系は画像から確定できない |
| io | 東経 -180 | 東経が増える | 北 | ペレ(19°S、255°W = 105°E)の赤い環が、右寄り(x≈0.79)の南に見える |
| europa | 東経 0 | 東経が増える | 北 | パルウィル(25°S、271°W = 89°E)の放射状の明るいクレーターが、左から 4分の1の南に見える |
| ganymede | 東経 0 | 東経が増える | 北 | ガリレオ地域(暗い広い地域、約 220°E)が中央よりやや右、トロス(35°W = 325°E)の放射状のクレーターが右端近く |
| callisto | 東経 0 | 東経が増える | 北 | ヴァルハラ(56°W = 304°E、14°N)の同心円が右寄りに見える |
| milkyway | 赤経 180度(12h) | 赤経は減る(中央が 0h、右端が -180度) | 天の北 | 銀河の中心(赤経 266.4度、赤緯 -29度)付近が最も明るい(x≈3056〜3112 / 4096、y≈1344〜1353 / 2048)。大マゼラン雲が赤経 80度付近の南(下)に見える |

注意: USGS のページは「Longitude Direction: Positive West」と書いているが、画像の中身(上の地形)は東経が右へ増える向きで貼られている。ページの数値ではなく上の表を使うこと。
天の川: 画像の中心(x=2048)が赤経 0度。画素 x の赤経は `180 - x / 4096 * 360` 度。赤緯は `90 - y / 2048 * 180` 度。

## サイトの出典ページに書く文の案

- 地球: 「地球の画像: NASA Goddard Space Flight Center、Blue Marble(画像: Reto Stöckli、Robert Simmon)。2001年の観測の合成で、打ち上げの日の雲ではない」
- 月: 「月の画像: NASA's Scientific Visualization Studio」
- 木星: 「木星の画像: NASA/JPL/Space Science Institute(カッシーニ、2000年12月)。1979年の木星そのものではない」
- 木星の衛星: 「イオ・エウロパ・ガニメデ・カリストの地図: U.S. Geological Survey(ボイジャーとガリレオの画像)。エウロパ・ガニメデ・カリストの色は、白黒の地図に平均的な色を乗せた演出」
- 天の川: 「天の川の背景: NASA/Goddard Space Flight Center Scientific Visualization Studio、Gaia DR2: ESA/Gaia/DPAC(CC BY-NC 3.0 IGO)。明るさを調整している」
- ペイル・ブルー・ドット: 「NASA/JPL-Caltech(2020年の再処理版)」
- 共通: 「NASA・JPL・USGS・ESA が、このサイトを推薦・承認しているわけではない」

## 作り直す

`npm run data:textures`。キャッシュが無ければ約 0.9GB を取得してから、加工と manifest の書き出しまで行う(キャッシュがあれば数秒)。`public/textures/manifest.json` が、次の担当への引き渡し(向き・出典・大きさ)。

## 監督による追記(2026-11-21)

- pbd(ペイル・ブルー・ドットの写真)は、配布されている 5230×5175 画素の版を、長辺 1600 画素に縮めて同梱する(色や明るさは変えない)。そのまま表示するとスマホで展開に 100MB 以上のメモリを使うため
- earth は 8192 画素の版が取得できず、2048 画素の版を使っている。打ち上げ直後の、地球が画面を大きく占める場面では少しぼやける。公式の置き場所が戻ったら差し替える
