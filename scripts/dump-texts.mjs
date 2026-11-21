// 画面に出る文言の一覧(docs/texts.md)を、辞書(src/lib/i18n/ja/)から作り直す。
//   node scripts/dump-texts.mjs          docs/texts.md を書き出す
//   node scripts/dump-texts.mjs --check  今の辞書と docs/texts.md が合っているかだけ調べる(合わなければ失敗)
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
  ['hud', '操作の部品と数字', '視点の切り替え、向くボタン、再生、送りダイヤル、右上と右下の数字、縮尺の物差し'],
  ['timeline', '時間軸', '下端の時間軸と、その両脇の名場面の移動'],
  ['scenes', '名場面の名前', '時間軸の刻みの読み上げと、名場面に着いた時の見出し'],
  ['events', '出来事', '名場面に含める出来事の文と、時間軸の単独の刻み(事実と出典は docs/events.md)'],
  ['caption', '名場面に着いた時の短い文', '名場面へ移る・再生で通り過ぎると、画面の中央より少し下に 6 秒ほど出る 1 行（木星と土星は速さの 1 行つき）'],
  ['bodies', '天体の名前', '目印の名前、向くボタン、読み上げ'],
  ['photo', '写真の窓', 'ペイル・ブルー・ドットの実際の写真を出す小窓'],
  ['about', '「このサイトについて」', '右上の入口のボタンと、押すと開く板。節の順に出る'],
  ['fallback', '3D を始められなかった時の案内', '3D の表示を始められない端末で、静止画と一緒に出る 2 行'],
];

/** 「どこに出るか」。完全一致を先に、なければ末尾が . のものを前方一致で探す */
const PLACES = [
  ['common.title', '画面の左上の題字'],
  ['common.listSeparator', '名前を並べる時の区切り（「木星、土星」のように）'],
  ['common.loading', '位置のデータを読み込んでいる間の中央の表示'],
  ['common.loadFailed', '位置のデータを読み込めなかった時の中央の表示'],
  ['intro.title', '開いた直後の中央の題字(1 行目)'],
  ['intro.days', '開いた直後の題字の 2 行目(打ち上げから、地球から 1 光日に達した日までの日数)'],
  ['intro.subtitle', '開いた直後の題字の下の副題'],
  ['intro.guide', '自動再生が今日で止まった後、画面の中央より少し下に出る案内'],
  ['fallback.notice', '3D を始められなかった時の案内の 1 行目'],
  ['fallback.advice', '3D を始められなかった時の案内の 2 行目'],
  // ── menu(担当: 画面の部品。ここに足す) ──
  ['menu.open', '右上のメニューのボタン（指した時の名前と読み上げ）'],
  // ── menu ここまで ──
  ['hud.viewGroup', '視点の切り替えの読み上げ（グループ名）'],
  ['hud.viewVoyager', '左上の視点の切り替えのボタン'],
  ['hud.viewOverview', '左上の視点の切り替えのボタン'],
  ['hud.viewCraft', '左上の視点の切り替えのボタン'],
  ['hud.lookGroup', '向くボタンの読み上げ（グループ名）'],
  ['hud.lookAt', '向くボタン（天体の名前が入る）'],
  ['hud.lookAhead', '向くボタン'],
  ['hud.playGroup', '再生の操作の読み上げ（グループ名）'],
  ['hud.play', '再生のボタン（止まっている時）'],
  ['hud.pause', '再生のボタン（再生中）'],
  ['hud.rates.', '再生の速さを選ぶボタン'],
  ['hud.stepGroup', '送りダイヤルの読み上げ（グループ名）'],
  ['hud.stepDay', '送りダイヤルの中央の表示'],
  ['hud.stepHour', '送りダイヤルの中央の表示'],
  ['hud.step', '送りダイヤルの矢印の読み上げ'],
  ['hud.fromEarth', '右下の距離のラベル'],
  ['hud.fromSun', '右下の距離のラベル（早回しの間）'],
  ['hud.sinceLaunch', '右上の日付の下の補足'],
  ['hud.lightTime', '右下の距離の下の補足'],
  ['hud.duration', '「光で」の後ろの時間の書き方'],
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
  ['about.entry', '右上の日付の下の小さなボタン'],
  ['about.kicker', '板の上端の小さな題字'],
  ['about.title', '板の読み上げ'],
  ['about.close', '板の上端の閉じるボタン'],
];

/** 値の入る文の例。引数をこの値で呼んで、出来上がった文を載せる */
const EXAMPLES = {
  'hud.lookAt': ['地球'],
  'hud.sinceLaunch': ['17,243'],
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
    yield { path, text: value(...args), example: args };
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

const server = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
let md;
const problems = [];
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
      continue;
    }
    parts.push('| キー | 文言 | どこに出るか |', '|---|---|---|');
    for (const r of rows(area, id, problems)) {
      const place = placeFor(r.path);
      if (!place) problems.push(`${r.path}: 「どこに出るか」が PLACES にありません`);
      parts.push(`| ${r.path} | ${cell(r.text)} | ${cell(place ?? '')}${r.example ? `（例の値：${cell(r.example.join('、'))}）` : ''} |`);
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

if (process.argv.includes('--check')) {
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
