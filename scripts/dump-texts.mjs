// 画面に出る文言の一覧(docs/texts.md)を、辞書(src/lib/i18n/ja/)から作り直す。
//   node scripts/dump-texts.mjs          docs/texts.md を書き出す
//   node scripts/dump-texts.mjs --check  今の辞書と docs/texts.md が合っているかだけ調べる(合わなければ失敗)
//   node scripts/dump-texts.mjs --json <出力先>  文言の直しの画面(Artifact)に入れるデータを JSON で書き出す(docs/texts.md は書かない)
//
// なぜあるか: 依頼主が公開の前に、画面の文言をまとめて確認できるようにするため。手で写すとずれるので、辞書から作る。
// 辞書にキーを足した時は、下の PLACES に「どこに出るか」を足す(足さないと止まる)。値の入る文の例は EXAMPLES に足す。

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outPath = join(root, 'docs', 'texts.md');

/** 領域ごとの見出しと説明。この順に並べる */
const AREAS = [
  ['common', '共通', 'どの画面でも同じ意味になる文言'],
  ['intro', '開いた直後の題字と案内', '題字と副題はサイト名の仮称。差し替える時は src/lib/i18n/ja/intro.ts だけを直す'],
  ['menu', '右上のメニュー', '表示の切り替え、星空だけを表示、このサイトについて'],
  ['hud', '操作の部品と数字', '視点のアイコン、向く、再生・速さ・送り、右上と右下の数字、縮尺の物差し'],
  ['timeline', '時間軸', '下端の時間軸と、その両脇の名場面の移動'],
  ['scenes', '名場面の名前', '時間軸の刻みの読み上げと、名場面に着いた時の見出し'],
  ['events', '出来事', '名場面に含める出来事の文と、時間軸の単独の刻み(事実と出典は docs/events.md)'],
  ['caption', '名場面に着いた時の短い文', '名場面へ移る・再生で通り過ぎると、画面の中央より少し下に 6 秒ほど出る 1 行（木星と土星は速さの 1 行つき）'],
  ['bodies', '天体の名前', '目印の名前、向くボタン、読み上げ'],
  ['photo', '写真の窓', 'ペイル・ブルー・ドットの実際の写真を出す小窓'],
  ['tutorial', '使い方の案内', '初めて来た人の自動再生が今日で止まった後に 1 回だけ出る 4 段の札と、メニューの「使い方」'],
  ['about', '「このサイトについて」', '右上の入口のボタンと、押すと開く板。節の順に出る'],
  ['fallback', '3D を始められなかった時の案内', '3D の表示を始められない端末で、静止画と一緒に出る 2 行'],
];

/** 「どこに出るか」。完全一致を先に、なければ末尾が . のものを前方一致で探す */
const PLACES = [
  ['common.title', '画面の左上の題字'],
  ['common.listSeparator', '名前を並べる時の区切り（「木星、土星」のように）'],
  ['common.restart', '左上の題字（押すと開いた直後の状態に戻り、打ち上げから自動再生し直す）の指した時の名前'],
  ['common.phraseBreaks', '名場面・出来事の文で、改行してよい所の記号（この記号の直後でだけ改行する。画面には出ない）'],
  ['common.loading', '位置のデータを読み込んでいる間の中央の表示'],
  ['common.loadFailed', '位置のデータを読み込めなかった時の中央の表示'],
  ['intro.title', '開いた直後の中央の題字(1 行目)'],
  ['intro.days', '開いた直後の題字の 2 行目(打ち上げから、地球から 1 光日に達した日までの日数)'],
  ['intro.subtitle', '開いた直後の題字の下の副題'],
  ['intro.guide', '自動再生が今日で止まった後、画面の中央より少し下に出る案内'],
  ['fallback.notice', '3D を始められなかった時の案内の 1 行目'],
  ['fallback.advice', '3D を始められなかった時の案内の 2 行目'],
  // ── menu(担当: 画面の部品。ここに足す) ──
  ['menu.open', '左上の題字の右のメニューのボタン（指した時の名前と読み上げ）、メニューの読み上げ'],
  ['menu.displayGroup', 'メニューの見出し（表示の切り替えの 3 項目の上）'],
  ['menu.labels', 'メニューの項目（入・切の表示の切り替え）'],
  ['menu.orbits', 'メニューの項目（入・切の表示の切り替え）'],
  ['menu.captions', 'メニューの項目（入・切の表示の切り替え）'],
  ['menu.starsOnly', 'メニューの項目（押すと数字と操作をすべて隠す）'],
  ['menu.starsOnlyHintClick', '星空だけを表示に入った時、画面の下寄りに 4 秒ほど出る案内（マウスの端末）'],
  ['menu.starsOnlyHintTap', '星空だけを表示に入った時、画面の下寄りに 4 秒ほど出る案内（指で操作する端末）'],
  // ── menu ここまで ──
  ['tutorial.entry', 'メニューの項目（押すと使い方の案内を最初の段から開く）、案内の札の読み上げ'],
  ['tutorial.progress', '使い方の案内の札の左上（今の段と段の数）'],
  ['tutorial.back', '使い方の案内の札のボタン（前の段へ戻る。2 段目から）'],
  ['tutorial.next', '使い方の案内の札のボタン（次の段へ進む）'],
  ['tutorial.done', '使い方の案内の最後の段のボタン（押すと案内を閉じる）'],
  ['tutorial.close', '使い方の案内の札の右上の × の読み上げと指した時の名前'],
  ['tutorial.steps.timeline.', '使い方の案内の 1 段目（下の時系列を囲む）'],
  ['tutorial.steps.views.', '使い方の案内の 2 段目（左上の視点のアイコンを囲む）'],
  ['tutorial.steps.look.', '使い方の案内の 3 段目（左上の視点の向きのボタンを囲む。bodyTouch は指で操作する端末）'],
  ['tutorial.steps.menu.', '使い方の案内の 4 段目（右上の日付と左上のメニューのボタンを囲む）'],
  ['hud.viewGroup', '視点の切り替えの読み上げ（グループ名）、メニューの見出し'],
  ['hud.viewVoyager', '左上の視点のアイコン（指した時の名前・読み上げ・アイコンの横の今の視点の名前・メニューの項目）'],
  ['hud.viewOverview', '左上の視点のアイコン（指した時の名前・読み上げ・アイコンの横の今の視点の名前・メニューの項目）'],
  ['hud.viewCraft', '左上の視点のアイコン（指した時の名前・読み上げ・アイコンの横の今の視点の名前・メニューの項目）'],
  ['hud.lookGroup', '左上の 3 段目の視点の向きのボタン（アイコンの横の名前）、開く一覧の読み上げ、メニューの見出し'],
  ['hud.lookAt', '視点の向きの一覧とメニューの項目（天体の名前が入る）'],
  ['hud.lookAhead', '視点の向きの一覧とメニューの項目'],
  ['hud.playGroup', '再生の操作の読み上げ（グループ名）'],
  ['hud.play', '再生のアイコン（止まっている時。指した時の名前・読み上げ）'],
  ['hud.pause', '再生のアイコン（再生中。指した時の名前・読み上げ）'],
  ['hud.rateName', '再生の速さのボタン（指した時の名前）、押すと開く候補の一覧の読み上げ、スマホの一覧の見出し'],
  ['hud.rateButton', '再生の速さのボタンの読み上げ（今の速さが入る）'],
  ['hud.rates.', '再生の速さのボタンの表示（今の速さ）と、押すと上に開く候補の一覧の項目'],
  ['hud.step', '送り（‹ ›）の指した時の名前・読み上げ（速さが1時間の時は1時間、それ以外は1日）。スマホの縦画面は速さの一覧の下の項目'],
  ['hud.fromEarth', '右下の距離のラベル'],
  ['hud.fromSun', '右下の距離のラベル（早回しの間）'],
  ['hud.magnificationAria', 'ボイジャーの視界の倍率の読み上げ'],
  ['hud.magnificationLimit', '右下の距離の上（倍率が上限に達した時の添え書き）'],
  ['hud.magnification', '右下の距離の上（ボイジャーの視界の倍率）'],
  ['hud.craftDistance', '右下の距離の上（ボイジャー本体の視点）'],
  ['hud.dateEdit', '右上の日付（押すと入力欄になる）の指した時の名前'],
  ['hud.dateInput', '右上の日付の入力欄の読み上げ'],
  ['hud.dateRange', '右上の日付の入力欄で、読めない形や範囲の外の日付を打って Enter を押した時に、入力欄の下に出る案内'],
  ['hud.sinceLaunch', '右上の日付の下の補足'],
  ['hud.lightTime', '右下の距離の下の補足'],
  ['hud.duration', '「光の速さで」の後ろの時間の書き方'],
  ['hud.distance', '右下の距離の単位の書き方'],
  ['hud.scaleBarAria', '引きの眺めの縮尺の物差しの読み上げ'],
  ['hud.jstDateTime', '日本時間の併記'],
  ['hud.utcSuffix', '日付と時刻の末尾'],
  ['timeline.axis', '時間軸の読み上げ'],
  ['timeline.prevScene', '時間軸の左の矢印の読み上げ'],
  ['timeline.nextScene', '時間軸の右の矢印の読み上げ'],
  ['timeline.month', '刻みの吹き出しの日付（月までしか分からない出来事）'],
  ['timeline.period', '刻みの吹き出しの日付（期間のある出来事）'],
  // ── events(担当: 時間軸と文。ここに足す) ──
  ['events.names.', '出来事の名前（時間軸の刻みの吹き出し・読み上げ、文の見出し）'],
  ['events.lines.', '出来事へ移った時・通り過ぎた時に、名前の下へ出る 1 行'],
  // ── events ここまで ──
  ['scenes.', '名場面の名前（時間軸の刻みの読み上げ、名場面に着いた時の見出し）'],
  ['caption.swingby', '木星と土星の場面の文に添える、太陽に対する速さの通過前と通過後'],
  ['caption.', '名場面に着いた時の短い文'],
  ['bodies.', '天体の目印の名前、向くボタン'],
  ['photo.alt', '写真の代替文（読み上げ）'],
  ['photo.heading', '写真の窓の見出し'],
  ['photo.close', '写真の窓の閉じるボタン'],
  ['photo.expand', '小さい窓の写真の読み上げ（押すと広がる）'],
  ['photo.collapse', '広げた写真の読み上げ（押すと戻る）'],
  ['photo.taken', '写真の窓の 1 行目'],
  ['photo.credit', '写真の窓の 2 行目'],
  ['photo.note', '写真の窓の 3 行目'],
  ['photo.reopen', '窓を閉じた後の、地球の目印の読み上げ'],
  ['photo.floating.earthMoonAlt', '出来事「地球と月を一緒に撮影」の文と一緒に浮かぶ写真の代替文（読み上げ）'],
  ['photo.floating.earthMoonCredit', '浮かぶ地球と月の写真の下の出典'],
  ['photo.floating.pbdCredit', '名場面「ペイル・ブルー・ドット」の文と一緒に浮かぶ写真の下の出典（代替文は photo.alt）'],
  ['about.entry', 'メニューの項目（押すと板が開く）'],
  ['about.kicker', '板の上端の小さな題字'],
  ['about.title', '板の読み上げ'],
  ['about.close', '板の上端の閉じるボタン'],
];

/** 値の入る文の例。引数をこの値で呼んで、出来上がった文を載せる */
const EXAMPLES = {
  'hud.lookAt': ['地球'],
  'tutorial.progress': ['1', '4'],
  'hud.rateButton': ['1秒＝1日'],
  'hud.magnification': ['12'],
  'hud.magnificationAria': ['12'],
  'hud.craftDistance': ['20'],
  'hud.sinceLaunch': ['17,243'],
  'hud.dateRange': ['1977.09.05', '2026.11.22'],
  'hud.lightTime': ['21時間30分'],
  'hud.durationHM': ['21', '30'],
  'hud.durationHMS': ['21', '30', '15'],
  'hud.durationMS': ['31', '50'],
  'hud.durationS': ['45'],
  'hud.distanceOku': ['245'],
  'hud.distanceMan': ['3,500'],
  'hud.distanceKm': ['12,000'],
  'hud.scaleBarAria': ['10億km'],
  'hud.jstDateTime': [1990, 2, 14, 13, 48, 0],
  'photo.taken': ['1990.02.14 04:48 UTC'],
  'timeline.month': ['2004', '12'],
  'timeline.period': ['2023.11.14', '2024.06.13'],
  'caption.swingby': ['13.2', '23.6'],
};

const AREA_IDS = new Set(AREAS.map((a) => a[0]));

function placeFor(path) {
  const exact = PLACES.find(([k]) => k === path);
  if (exact) return exact[1];
  const prefix = PLACES.filter(([k]) => path.startsWith(k)).sort(
    (a, b) => b[0].length - a[0].length,
  )[0];
  return prefix ? prefix[1] : null;
}

/** 表のセルに入れるため、| と改行を逃がす */
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, '<br>');

/** 辞書の 1 つの値を、(キー, 文言, 例の有無) の行に開く */
function* rows(value, path, problems) {
  if (typeof value === 'string') {
    yield { path, text: value };
  } else if (typeof value === 'function') {
    const args = EXAMPLES[path];
    if (!args) {
      problems.push(`${path}: 値の入る文の例が EXAMPLES にありません`);
      return;
    }
    // 文言の直しの画面では、入れ替わる所を { } で囲んだ例の値で見せる
    yield { path, text: value(...args), example: args, template: value(...args.map((a) => `{${a}}`)) };
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* rows(value[i], `${path}[${i}]`, problems);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) yield* rows(v, path ? `${path}.${k}` : k, problems);
  }
}

function aboutSections(about, problems) {
  const out = [];
  for (const key of ['entry', 'kicker', 'title', 'close']) {
    const place = placeFor(`about.${key}`);
    if (!place) problems.push(`about.${key}: PLACES にありません`);
    out.push(`| about.${key} | ${cell(about[key])} | ${cell(place ?? '')} |`);
  }
  const lines = [out.join('\n'), ''];
  about.sections.forEach((s, i) => {
    lines.push(`#### ${i + 1} 節　${s.heading}`, '', '| 種類 | 文言 |', '|---|---|');
    lines.push(`| 見出し | ${cell(s.heading)} |`);
    for (const b of s.blocks) {
      if (b.kind === 'p') lines.push(`| 段落 | ${cell(b.text)} |`);
      else if (b.kind === 'sub') lines.push(`| 小見出し | ${cell(b.text)} |`);
      else if (b.kind === 'list') b.items.forEach((x) => lines.push(`| 箇条書き | ${cell(x)} |`));
      else if (b.kind === 'terms') b.items.forEach((x) => lines.push(`| 項目 | ${cell(x.term)}　${cell(x.text)} |`));
      else if (b.kind === 'credits')
        b.items.forEach((x) =>
          lines.push(
            `| 出典 | ${cell(x.use)}　${cell(x.name)}${x.license ? `　${cell(x.license)}` : ''}${x.href ? `（${cell(x.href)}）` : ''}${x.note ? `　${cell(x.note)}` : ''} |`,
          ),
        );
    }
    lines.push('');
  });
  return lines.join('\n');
}

/** 「このサイトについて」の節の中身を、直しの画面の 1 件ずつに開く */
function aboutItems(about) {
  const out = [];
  about.sections.forEach((s, i) => {
    const at = `「このサイトについて」${i + 1} 節（${s.heading}）`;
    const base = `about.sections[${i}]`;
    out.push({ path: `${base}.heading`, text: s.heading, place: `${at}の見出し` });
    s.blocks.forEach((b, j) => {
      const bp = `${base}.blocks[${j}]`;
      if (b.kind === 'p') out.push({ path: `${bp}.text`, text: b.text, place: `${at}の段落` });
      else if (b.kind === 'sub') out.push({ path: `${bp}.text`, text: b.text, place: `${at}の小見出し` });
      else if (b.kind === 'list')
        b.items.forEach((x, k) => out.push({ path: `${bp}.items[${k}]`, text: x, place: `${at}の箇条書き` }));
      else if (b.kind === 'terms')
        b.items.forEach((x, k) => {
          out.push({ path: `${bp}.items[${k}].term`, text: x.term, place: `${at}の項目名` });
          out.push({ path: `${bp}.items[${k}].text`, text: x.text, place: `${at}の項目「${x.term}」の説明` });
        });
      else if (b.kind === 'credits')
        b.items.forEach((x, k) => {
          for (const f of ['use', 'name', 'license', 'note']) {
            if (!x[f]) continue;
            const what = { use: '何に使ったか', name: '出典の名前', license: '条件の名前', note: '補足' }[f];
            out.push({ path: `${bp}.items[${k}].${f}`, text: x[f], place: `${at}の出典「${x.name}」の${what}` });
          }
        });
    });
  });
  return out;
}

const server = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
let md;
const problems = [];
/** 文言の直しの画面に入れる 1 件ずつ */
const items = [];
const addItem = (areaId, areaTitle, r, place) =>
  items.push({
    id: r.path.replace(/\[(\d+)\]/g, '-$1').replace(/\./g, '-'),
    order: (items.length + 1) * 10,
    key: r.path,
    area: areaId,
    areaTitle,
    place: place ?? '',
    current: r.template ?? r.text,
    template: Boolean(r.template),
  });
try {
  const { ja } = await server.ssrLoadModule('/src/lib/i18n/ja/index.ts');
  const keys = Object.keys(ja);
  for (const k of keys) if (!AREA_IDS.has(k)) problems.push(`辞書の領域 ${k} が AREAS にありません`);

  const parts = [
    '# 画面に出る文言の一覧',
    '',
    '> 公開の前に、画面の文言を確認するための一覧。`src/lib/i18n/ja/` の辞書から `node scripts/dump-texts.mjs` で作っている。',
    '> 直す時は、この表ではなく辞書を直してから作り直す（`node scripts/dump-texts.mjs`。辞書と食い違っていないかは `--check` で調べられる）。',
    '> 値の入る文は、例の値を入れた形で載せている。',
    '',
  ];
  for (const [id, title, note] of AREAS) {
    const area = ja[id];
    if (!area) {
      problems.push(`領域 ${id} が辞書にありません`);
      continue;
    }
    parts.push(`## ${title}`, '', note, '');
    if (id === 'about') {
      parts.push('| キー | 文言 | どこに出るか |', '|---|---|---|', aboutSections(area, problems));
      for (const k of ['entry', 'kicker', 'title', 'close'])
        addItem(id, title, { path: `about.${k}`, text: area[k] }, placeFor(`about.${k}`));
      for (const r of aboutItems(area)) addItem(id, title, r, r.place);
      continue;
    }
    parts.push('| キー | 文言 | どこに出るか |', '|---|---|---|');
    for (const r of rows(area, id, problems)) {
      const place = placeFor(r.path);
      if (!place) problems.push(`${r.path}: 「どこに出るか」が PLACES にありません`);
      parts.push(`| ${r.path} | ${cell(r.text)} | ${cell(place ?? '')}${r.example ? `（例の値：${cell(r.example.join('、'))}）` : ''} |`);
      addItem(id, title, r, place);
    }
    parts.push('');
  }
  md = parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
} finally {
  await server.close();
}

if (problems.length > 0) {
  console.error('一覧を作れません:\n' + problems.map((p) => `  ${p}`).join('\n'));
  process.exit(1);
}

const jsonAt = process.argv.indexOf('--json');
if (jsonAt !== -1) {
  const out = process.argv[jsonAt + 1];
  if (!out) {
    console.error('--json の後に出力先のファイルを書いてください');
    process.exit(1);
  }
  const ids = new Set(items.map((x) => x.id));
  if (ids.size !== items.length) {
    console.error('直しの画面の id が重なっています');
    process.exit(1);
  }
  writeFileSync(out, JSON.stringify(items, null, 2) + '\n');
  console.log(`${out} に ${items.length} 件を書き出しました`);
} else if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(outPath, 'utf8');
  } catch {
    // 無ければ食い違い
  }
  if (current !== md) {
    console.error('docs/texts.md が辞書と食い違っています。`node scripts/dump-texts.mjs` で作り直してください');
    process.exit(1);
  }
  console.log('docs/texts.md: 辞書と一致');
} else {
  writeFileSync(outPath, md);
  console.log(`docs/texts.md を書き出しました（${md.split('\n').length} 行）`);
}
