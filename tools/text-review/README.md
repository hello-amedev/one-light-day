# 文言の直しの画面

あめさんが、サイトに出る文言を 1 件ずつ書き換えたり、コメントで指示したりするための Artifact。
画面は https://claude.ai/artifact/HkZcCKmSzftQ6gvdrLRzn9 (あめさんだけが見られる)。中身は `page.html` で、直したら Artifact の公開で同じ URL に出し直す。

## データの形

Artifact の db の `texts` コレクションに、辞書の文言 1 件ずつが入っている。doc の id はキーの `.` と `[n]` を `-` に置き換えたもの(`hud.lookAt` → `hud-lookAt`)。

| 欄 | 中身 | 書く人 |
|---|---|---|
| key / area / areaTitle / place / order | 辞書のキー、領域、どこに出るか、並び順 | Claude |
| current | 今の文言。値の入る文は、入れ替わる所を `{例の値}` で囲む(template が true) | Claude |
| draft | あめさんが書き換えた文(今の文言と同じなら空) | 画面 |
| note | あめさんのコメント・指示 | 画面 |
| state | `asked`(依頼あり)/ `done`(反映済み)/ 空 | 画面が asked、Claude が done |
| reply | Claude からの返事 | Claude |

データは `node scripts/dump-texts.mjs --json <出力先>` で辞書から書き出す。

## 「直して」と言われたら

1. `ArtifactData` の query で `state == asked` の doc を読む(out_dir に書き出すと楽)
2. draft と note に沿って `src/lib/i18n/ja/` の辞書を直す。`{ }` の所は関数の引数なので、辞書では `${...}` のまま残す。
   ボタン・見出し・エラーなどの短い文言は `ui-text` スキル、説明文は `reader-first` スキルに沿う
3. `npm run verify`(フォントと文言の一覧も作り直される)
4. `--json` で書き出し直し、直した doc を update する: current を新しい文に、draft を空に、state を `done`、reply に直したことを書く。note は残す。
   直さなかった項目は、state を空にして reply に理由を書く。update には読んだ時の version を if_version で付ける
5. 本番への反映は、いつもの公開の手順(HANDOFF §3)

## 辞書を別の作業で直した時

`--json` で書き出して、current が変わったキーだけ update する(draft・note・state は触らない)。
新しいキーは set で足し、消えたキーは、依頼が残っていないのを確かめてから delete する。
