# docs/shared-parts.md — 共通部品の一覧

> 新しい画面・部品・処理を書く前に、この表を見る。同じ役目の部品があればそれを使い、自前で書かない。
> サブエージェントへの指示書の「先に読む」にも入れる。破ると `npm run check` の規約の検査(`scripts/check-conventions.mjs`)が失敗する項目には ✔ を付けた。

## 決まり

- 同じ処理の 2 回目を書く前に部品にする(1 回目は決め打ちでよい)
- 並列で実装する時は、共通の土台(部品・データの形)を先に 1 体で作ってから分担する
- 部品を作ったら、この表に 1 行足す。自前実装のパターンが正規表現で書けるなら、検査にも規則を足す

## 画面の文言・整形

| やりたいこと | 使うもの | 場所 | 検査 |
|---|---|---|---|
| 画面に出る文字を出す(ボタン・ラベル・aria-label) | 辞書 `t().領域.キー`。受ける変数は `txt`(共通は `com`)。使うたびに `t()` を呼び、読み込み時に定数へ固めない | `src/lib/i18n/` | ✔ i18n-literal |
| 値の入る文を出す | 値を受けて文を丸ごと返す辞書の関数(`txt.lookAt(名前)`、`txt.sinceLaunch(日数)`) | `src/lib/i18n/ja/*.ts` | |
| 名前を並べる、句読点・括弧を出す | `joinList`。記号も辞書に置く | `src/lib/i18n/index.ts` | ✔ i18n-punct |
| 日本語の表記(括弧は全角、英字と日本語の間に空白なし、コロンは全角) | 辞書を書く時の決まり | `src/lib/i18n/ja/*.ts` | ✔ ja-paren / ja-colon / ja-ascii-space / ja-toast-period |
| 天体の名前・名場面の名前を出す | `t().bodies[id]`、`t().scenes[id]`(ID は `bodies.ts`・`scenes.ts`) | `src/lib/i18n/ja/bodies.ts`・`scenes.ts` | |
| 日付(UTC)・時刻・日本時間の併記 | `formatDate` / `formatDateTime` / `formatJstDateTime` | `src/lib/format.ts` | |
| 打ち上げからの日数 | `formatSinceLaunch`(数だけなら `daysSinceLaunch`) | `src/lib/format.ts` | |
| 距離(億km・万km・km) | `formatDistance` | `src/lib/format.ts` | |
| 光が届くまでの時間 | `formatLightTime`(距離から)、`formatLightDuration`(秒から。秒まで出す版あり) | `src/lib/format.ts` | |
| 数の桁区切り | `formatInteger` | `src/lib/format.ts` | |
| 色・フォント | `src/app.css` の変数(`var(--color-…)`・`var(--font-…)`)。部品に直書きしない | `src/app.css` | ✔ ui-token-only |
| 線の太さ・動きの長さ・余白・押す範囲 | `--line-*`・`--dur-*`・`--space-*`・`--hit-min` / `--control-h` | `src/app.css` | |
| スマホの安全な領域 | `--safe-top` / `--safe-right` / `--safe-bottom` / `--safe-left` | `src/app.css` | |

## 状態

| やりたいこと | 使うもの | 場所 | 検査 |
|---|---|---|---|
| 画面全体の状態を作る・読む・変える | `createStore(options)`(Svelte に依存しない)。部品も 3D もこれだけを介してつながる | `src/lib/store/index.ts` | |
| 部品から状態を反応する値として読む | `watchStore(store).state`(部品の初期化の中で呼ぶ) | `src/ui/store.svelte.ts` | |

## 画面の部品

| やりたいこと | 使うもの | 場所 |
|---|---|---|
| ボタンを置く(文字だけ。選択中は金の下線。押す範囲は指で 44px) | `UiButton`(`pressed` で選択中、`label` で読み上げ) | `src/ui/UiButton.svelte` |
| 矢印を描く(送り・名場面の移動) | `Chevron`(`bar` で名場面用) | `src/ui/Chevron.svelte` |
| 数字のブロック(ラベル・大きい数字・補足) | `Readout`(日付も距離もこれ。補足の行は空でも高さを残す) | `src/ui/Readout.svelte` |
| 送りダイヤル 1 つ(‹ 1日 ›) | `StepDial` | `src/ui/StepDial.svelte` |
| 視点の切り替え | `ViewSwitch` | `src/ui/ViewSwitch.svelte` |
| 向くボタン(木星・土星・月は近い時期だけ) | `LookButtons` | `src/ui/LookButtons.svelte` |
| 再生・速さ・送りダイヤル | `PlayControls` | `src/ui/PlayControls.svelte` |
| 時間軸(目盛り・名場面の刻み・つまみ・前後の名場面) | `Timeline` | `src/ui/Timeline.svelte` |
| 操作の部品の層全体(配置・操作しない間に薄くする・?debug の計測値) | `UiLayer` | `src/ui/UiLayer.svelte` |
| 写真の窓(開く条件 `photoWindowAvailable`・置き場所 `placePhotoWindow`) | `PhotoWindow` | `src/ui/PhotoWindow.svelte`・`src/ui/photoWindow.ts` |
| 名場面に着いた時の短い文(条件 `sceneJumpedTo`) | `SceneCaption` | `src/ui/SceneCaption.svelte`・`src/ui/sceneCaption.ts` |
| 開いた直後の題字と、今日で止まった時の案内の 1 行(止める操作もここ) | `IntroOverlay`(文言は `t().intro`。題字と副題は仮称なので `ja/intro.ts` だけ直す) | `src/ui/IntroOverlay.svelte` |
| 自動再生の進み方(割合 → 時刻)・始めるかどうかの判定 | `introEt` / `introMode`(時刻を進めるのは `store.tick`。始める・止める・止めた状態で始めるは `startIntro` / `stopIntro` / `skipIntro`) | `src/lib/intro.ts`・`src/lib/store/index.ts` |
| ふだんの再生で名場面の近くだけ遅くする(近づく時だけ減速、通過後 2 秒ほどで戻る) | `pacedRate` | `src/lib/store/pacing.ts` |
| 開発用の代用データ(本番ビルドに入れない) | `createMockEphemeris` / `createMockStars` | `src/ui/dev/mockData.ts` |

重ね方: canvas(3D)→ 目印の層(3D の担当が使う)→ 操作の部品の層(`.ui` は `pointer-events: none`、部品だけ `auto`)。

## 3D の表示(src/stage)

| やりたいこと | 使うもの | 場所 |
|---|---|---|
| 3D を作る・止める・計測値を読む・操作しない間に線を薄くする | `createStage` / `Stage.stats` / `Stage.setChromeVisible` / `dispose` | `src/stage/index.ts` |
| 天体の相対位置を作る(倍精度で `eph.position(天体,'voyager1') − camOffset`) | `relativePosition` | `src/stage/placement.ts` |
| 球をカメラ中心に縮めて置く(距離 SHELL・半径 r/d×SHELL) | `shellPlacement` / `SHELL` | `src/stage/placement.ts` |
| 向いた時の向きと視野 | `lookDirection` / `lookFov` | `src/stage/look.ts` |
| カメラの姿勢(視界・引きの眺め・切り替えの補間) | `CameraRig` / `overviewPose` / `blendPose` / `overviewDistance` | `src/stage/camera.ts` |
| 軌道の楕円を位置と速度から求める | `orbitFromState` / `orbitLoop` | `src/stage/orbit.ts` |
| 画面の位置・円盤の半径(px) | `projectToScreen` / `screenRadiusPx` | `src/stage/frame.ts` |
| ベクトル・方位仰角・球面補間・加減速 | `math.ts` の関数 | `src/stage/math.ts` |
| 目印と名前(DOM)・重なりの間引き・名前を出す側(`placeLabel`)・優先度(`priorityOf`) | `MarkerLayer` | `src/stage/markers.ts` |
| 背景の天の川(向きの式 `skyUV`・画像の選び方・淡さ) | `createMilkyway` | `src/stage/milkyway.ts` |
| 天体の目印の画面の位置を 3D から受け取る | `Stage.watchBody(body, listener)` | `src/stage/index.ts` |
| 天体の自転の向き(極・自転の角度)を黄道へ移す行列 | `bodyToEcliptic` / `poleDirection` / `toBodyFrame` / `surfacePoint`(要素は `ROTATION`、扁平は `FLATTENING`) | `src/stage/rotation.ts` |
| 土星の環の濃さの表・環と土星の影の計算(試験できる版。シェーダーは同じ式) | `ringSample` / `planetShadowOnRing` / `ringShadowOnPlanet` | `src/stage/saturnRings.ts` |
| 天体の画像の読み込み(manifest は 1 回、画像は大きく見えてから 1 回) | `SurfaceTextures.request`、hi / lo の選び方は `chooseVariant` | `src/stage/surfaceTextures.ts` / `textureChoice.ts` |
| 天体・環・大気のシェーダー | `surfaceFragment` / `ringFragment` / `haloFragment` | `src/stage/bodyShaders.ts` |
| 太陽の光(にじみ・芯・十字の光条)の絵 | `makeGlowTexture` / `makeCoreTexture` / `makeSpikeTexture` | `src/stage/textures.ts` |
| 目印と名前(DOM)・重なりの間引き | `MarkerLayer` | `src/stage/markers.ts` |
| 早回し中の惑星の残像の弧(1 コマで 3 度以上進む時、点の代わりに。判断は前のコマとの時刻の差) | `classifyStreak` / `stepAngleDeg` / `PlanetStreaks` | `src/stage/streak.ts`・`streaks.ts` |
| 縮尺の物差し(1px あたりの km → 1・2・5 × 10 の何乗 km で 80〜200px) | `pickScaleBar` / `ScaleBarView` / `formatDistanceRound` | `src/stage/scaleBar.ts`・`scaleBarView.ts`・`src/lib/format.ts` |
| 引きの眺めの垂線・足もとの輪・過ぎた名場面の刻み | `footOnEcliptic` / `passedSceneCount` / `GuideLines` | `src/stage/guide.ts`・`guideLines.ts` |
| 確認用の URL(?t= ?view= ?look=)を状態に当てる | `applyUrlState` / `parseUrlState` | `src/lib/urlState.ts` |

注意: 天体の位置を太陽中心どうしの引き算で作らない(通過の距離がずれる)。球は奥行きの判定を使わず、遠い順の `renderOrder` で描く。
