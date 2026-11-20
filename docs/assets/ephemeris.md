# 位置データ(public/data/eph)

## 出どころ

- NASA JPL Horizons(Solar System Dynamics Group)。API: `https://ssd.jpl.nasa.gov/api/horizons.api`(API 1.2)
- 取得した日: 2026-11-20(`manifest.json` の `generated`)
- 取得したもの: ベクトル表(`EPHEM_TYPE=VECTORS`、`VEC_TABLE=2`)、黄道 J2000(`REF_PLANE=ECLIPTIC` / `REF_SYSTEM=ICRF`)、km と km/s、時刻は TDB
- ボイジャー1号は `-31`(Horizons の軌道ファイル `Voyager_1_ST+refit2022_m`)。データは 1977-09-05 13:59:24 TDB から。2060 年までの値は予測
- 使用の条件: NASA / JPL の成果物は、出典を示せば利用できる。NASA / JPL のロゴは使わない

## 出典の書き方

> 位置データ: NASA/JPL Horizons On-Line Ephemeris System(https://ssd.jpl.nasa.gov/horizons/)

## 区間ごとの刻みと誤差

--verify の結果(各区間 40 点を Horizons へ別に問い合わせ、補間との差を測った。2026-11-20 時点)。
刻みは一定ではない。誤差の目標を満たす範囲で粗くなるよう、細かい元データから点を選んでいる(巡航は数日から数か月、通過の前後は 30 分以下)。

| 区間 | 点数 | 容量 | 最大誤差 | 目標 |
|---|---|---|---|---|
| voyager1 / 太陽 | 863 | 48 KB | 11.7 km | 50 km |
| voyager1 / 地球(始まり〜+3日) | 25 | 1.4 KB | 0.8 km | 5 km |
| voyager1 / 木星(最接近の前後3日) | 73 | 4.1 KB | 0.9 km | 5 km |
| voyager1 / 土星(同) | 76 | 4.3 KB | 0.9 km | 5 km |
| earth / 太陽 | 7,898 | 432 KB | 22.4 km | 50 km |
| moon / 地球(〜1977-10-05) | 33 | 1.8 KB | 2.5 km | 50 km |
| mercury / 太陽(f32) | 5,742 | 179 KB | 13,113 km | 20,000 km |
| venus / 太陽(f32) | 2,753 | 86 KB | 12,846 km | 20,000 km |
| mars / 太陽(f32) | 1,031 | 32 KB | 8,658 km | 20,000 km |
| jupiter / 太陽(重心) | 715 | 39 KB | 268 km | 500 km |
| jupiter / 太陽(通過の区間、3 時間刻み、中心) | 49 | 2.7 KB | 0.002 km | 50 km |
| saturn / 太陽(重心) | 388 | 21 KB | 334 km | 500 km |
| saturn / 太陽(通過の区間、3 時間刻み、中心) | 49 | 2.7 KB | 0.000 km | 50 km |
| uranus / 太陽(f32) | 49 | 1.5 KB | 11,233 km | 20,000 km |
| neptune / 太陽(f32) | 54 | 1.7 KB | 10,643 km | 20,000 km |

合計 約 860 KB(目標 900 KB 以内)。自動テストの正解(`tests/ephemeris/fixtures/horizons-samples.json`、72 点)との比較では、
地球とボイジャーの距離の差が最大 14.5 km。

## 置いた仮定と判断

- **木星と土星は全期間を重心(Horizons の 5, 6)で作った。** 惑星の「中心」(599, 699)は衛星の引力で数百 km 揺れる(土星はタイタンで約 290km、周期 16 日)。
  粗い点でその揺れを追うと速度の食い違いで補間が暴れる。重心と中心の差は 300km 以内で、目標の 500km に収まる(--verify は 599 / 699 の値と比べている)。
  通過の区間(最接近の前後 3 日)だけは、本当の中心を 3 時間刻みで別の区間として持つ。範囲の狭い区間を優先して使う。
- **天王星・海王星は中心(799, 899)で取れた**(2100 年まで取れることを確認)。重心での代用はこの 2 つには無い。
- **ボイジャーの太陽中心の位置は、通過の区間の中でも、太陽中心の区間を直接使う。**
  「惑星の太陽中心の位置 + 惑星中心の相対位置」で出す案は、Horizons の値と合わなかった。
  Horizons の「木星(土星)中心から見たボイジャー」は、Horizons の「太陽から見た木星(土星)の中心」を使って引いても合わず、
  木星で約 383 km、土星で約 1,356 km ずれる(ボイジャーの軌道ファイルが持つ惑星の位置と、惑星の軌道ファイルの食い違いと思われる)。
  このずれのせいで、足し算で出すと地球との距離が 1,000 km を超えてずれるため、太陽中心は直接の区間(Horizons に 12 km 以内で一致)を使い、
  惑星中心の位置は `position('voyager1', 'jupiter' | 'saturn' | 'earth', et)` で通過の区間から直接出す(最接近の距離は Horizons の値どおり)。
  惑星の位置(太陽中心)とボイジャーの位置(太陽中心)の差は、通過の区間の中で 383 km(木星)・1,356 km(土星)だけ、この相対位置とずれる。
- f32 の区間は、レコードごとに `[x,y,z,vx,vy,vz]` を f32 で並べ、その前に t を f64 の配列でまとめて置いた(`docs/contracts.md` の「t × count」を、t だけ先頭にまとめる意味で読んだ)。1 レコード 32 バイト。
- `manifest.json` に、区間の説明の `notes` を足した(読み出しは使わない)。
- 光の速さの見積もり、1 光日の時刻などの値は、テストで確かめている(`tests/ephemeris/`)。

## 作り直す手順

```
npm run data:eph                       # public/data/eph を作る(取得済みの応答は tools/ephemeris/cache/ から読む。初回は約 70 秒)
node tools/ephemeris/build.mjs --verify    # Horizons に別途問い合わせて、誤差を表で出す(目標を超えたら終了コード 1)
node tools/ephemeris/build.mjs --fixtures  # テスト用の正解を作り直す(再現できる乱数で時刻を選ぶ)
npm test
```

- 最新の予測に取り直したい時は `tools/ephemeris/cache/` を消してから実行する。失敗しても、取得済みの分はキャッシュに残るので続きから進む
- Horizons へは直列で、1.5 秒以上空けて頼む。個人を特定できる情報はリクエストに入れない
- 刻みや許す誤差は `tools/ephemeris/build.mjs` の `SERIES`(区間の定義)にまとめてある
