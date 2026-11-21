// 画像の撮り直しと、表示の確認用スクリーンショット。Chrome の DevTools Protocol で、実時間で待って撮る。
//
// 使い方: 先に `npx vite --port 5188 --strictPort` を立ててから
//   node tools/shots/shoot.mjs <名前> [開発サーバーの URL]
//
// 名前:
//   og-saturn   共有用の画像の案 1(通過の翌日の土星と環)  → .shots/og-saturn.jpg
//   og-earth    共有用の画像の案 2(1990-02-14 の地球を向いた眺め) → .shots/og-earth.jpg
//   og          採る案を public/og.jpg に書き出す(1200x630。環境変数 OG=saturn|earth。既定は saturn)
//   fallback    3D が使えない端末向けの静止画を public/fallback.jpg に書き出す(1600x1000)
//   no3d        ?no3d の表示(PC とスマホの縦)             → .shots/no3d-*.png
//   rolling     数字の桁が回る動きの確認(途中のコマと、早回し中)  → .shots/rolling-*.png
//
// 題字は、ページの上へ一時的に DOM を足して重ねる(サイトの題字と同じ字体・同じ字間)。

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOTS = join(ROOT, '.shots');
const NAME = process.argv[2];
const BASE = process.argv[3] ?? 'http://localhost:5188/';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9344;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const URLS = {
  saturn: '?t=1980-11-13T12:00:00Z&look=saturn',
  earth: '?t=1990-02-14T04:48:00Z&look=earth',
};

/** 操作の部品と目印を見えなくする(font は読み込まれたままにするため、display ではなく opacity) */
const HIDE_UI = `(() => {
  const s = document.createElement('style');
  s.textContent = '.ui, .markers { opacity: 0 !important; }';
  document.head.append(s);
})()`;

/** 題字と副題を左下に重ねる。字体と字間は、サイトの開いた直後の題字(IntroOverlay)と同じ */
const TITLE_OVERLAY = `(async () => {
  const css = getComputedStyle(document.documentElement);
  const root = document.createElement('div');
  root.id = 'share-title';
  root.style.cssText = 'position:fixed;left:6.5%;bottom:9%;display:flex;flex-direction:column;gap:14px;pointer-events:none;';
  const name = document.createElement('div');
  name.textContent = 'ONE LIGHT-DAY';
  name.style.cssText = 'font-family:var(--font-title);font-size:46px;letter-spacing:0.4em;color:var(--color-text);text-shadow:var(--text-halo),0 0 18px var(--color-space);';
  const sub = document.createElement('div');
  sub.textContent = 'ボイジャー1号、1光日の旅';
  sub.style.cssText = 'font-family:var(--font-body);font-size:20px;letter-spacing:0.18em;color:var(--color-text-dim);text-shadow:var(--text-halo),0 0 14px var(--color-space);';
  const rule = document.createElement('div');
  rule.style.cssText = 'width:56px;height:2px;background:var(--color-gold);';
  root.append(name, rule, sub);
  document.body.append(root);
  await document.fonts.ready;
  await Promise.all([document.fonts.load('46px Michroma'), document.fonts.load('20px "Zen Kaku Gothic New"', 'ボイジャー1号、1光日の旅')]);
  return document.fonts.check('46px Michroma');
})()`;

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'voyager-shots-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--hide-scrollbars', '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* まだ起動中 */ }
  }
  if (!target) throw new Error('Chrome に接続できません');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 1;
  const waiting = new Map();
  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails).slice(0, 300));
    return res.result?.result?.value;
  };
  const open = async (query, width, height, dpr = 1, mobile = false) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile });
    await send('Page.navigate', { url: BASE + query });
  };
  const save = async (file, format, quality) => {
    const res = await send('Page.captureScreenshot', { format, quality, captureBeyondViewport: false });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(res.result.data, 'base64'));
    console.log('保存: ' + file);
  };
  const close = async () => {
    ws.close();
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  };
  await send('Runtime.enable');
  await send('Page.enable');
  return { send, evaluate, open, save, close, errors };
}

/** 共有用の画像を撮る。title が true なら題字を重ねる */
async function shootShare(c, key, file, { width, height, title }) {
  await c.open(URLS[key], width, height);
  await sleep(7000); // 画像(テクスチャ)の読み込みと、描き込みを待つ
  await c.evaluate(HIDE_UI);
  if (title) console.log('題字の字体が読み込まれた: ' + (await c.evaluate(TITLE_OVERLAY)));
  await sleep(800);
  await c.save(file, 'jpeg', 86);
}

async function main() {
  const c = await launch();
  try {
    if (NAME === 'og-saturn' || NAME === 'og-earth') {
      const key = NAME.slice(3);
      await shootShare(c, key, join(SHOTS, `${NAME}.jpg`), { width: 1200, height: 630, title: true });
    } else if (NAME === 'og') {
      const key = process.env.OG ?? 'saturn';
      await shootShare(c, key, join(ROOT, 'public', 'og.jpg'), { width: 1200, height: 630, title: true });
    } else if (NAME === 'fallback') {
      const key = process.env.FALLBACK ?? 'saturn';
      await shootShare(c, key, join(ROOT, 'public', 'fallback.jpg'), { width: 1600, height: 1000, title: false });
    } else if (NAME === 'no3d') {
      await c.open('?no3d', 1280, 800, 1);
      await sleep(2500);
      await c.save(join(SHOTS, 'no3d-pc.png'), 'png');
      console.log('本文: ' + (await c.evaluate('document.body.innerText')).replace(/\n/g, ' / '));
      await c.open('?no3d', 390, 844, 3, true);
      await sleep(2500);
      await c.save(join(SHOTS, 'no3d-phone.png'), 'png');
    } else if (NAME === 'rolling') {
      await rolling(c);
    } else {
      throw new Error('名前は og-saturn / og-earth / og / fallback / no3d / rolling のどれか');
    }
    if (c.errors.length) console.log('ページの例外: ' + c.errors.join(' | '));
  } finally {
    await c.close();
  }
}

/** 送りダイヤルで 1 日送った直後の途中のコマと、早回しの再生中を撮る */
async function rolling(c) {
  const click = (label) => c.evaluate(`(() => { const b = document.querySelector('button[aria-label="${label}"]'); b.click(); return !!b; })()`);
  const text = (sel) => c.evaluate(`document.querySelector('${sel}')?.textContent ?? ''`);
  await c.open('?t=1980-11-13T12:00:00Z&look=saturn', 1280, 800, 1);
  await sleep(6000);
  // 動きを 1/20 に遅くして、途中のコマを撮れるようにする
  await c.send('Animation.enable');
  await c.send('Animation.setPlaybackRate', { playbackRate: 0.05 });
  console.log('送る前の日付: ' + (await text('.date .value')));
  await click('1日進める');
  await sleep(400);
  console.log('回っている桁の数(1日送り): ' + (await c.evaluate("document.querySelectorAll('.cell').length")));
  await c.save(join(SHOTS, 'rolling-step-mid.png'), 'png');
  await c.send('Animation.setPlaybackRate', { playbackRate: 1 });
  await sleep(1500);
  console.log('桁が回り終わった後の日付: ' + (await text('.date .value')) + ' / 回っている桁: ' + (await c.evaluate("document.querySelectorAll('.cell').length")));
  // 1 秒＝1 年で再生
  await c.evaluate("[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '1秒＝1年').click()");
  await c.evaluate("[...document.querySelectorAll('button')].find((b) => /^(再生|停止)$/.test(b.textContent.trim()) && b.textContent.trim() === '再生')?.click()");
  let maxCells = 0;
  const seen = [];
  for (let i = 0; i < 20; i++) {
    await sleep(100);
    // 再生を押した直後の 1 回目の変化だけは、前に変わってから時間が空いているので回ることがある。0.5 秒後からを数える
    const n = await c.evaluate("document.querySelectorAll('.cell').length");
    if (i >= 5) maxCells = Math.max(maxCells, n);
    if (i % 5 === 0) seen.push(await text('.date .value'));
  }
  console.log('1秒＝1年の再生中、回っていた桁の最大数(0.5秒後から): ' + maxCells + ' / 日付の推移: ' + seen.join(' → '));
  await c.save(join(SHOTS, 'rolling-year.png'), 'png');
}

main().catch((error) => { console.error(error); process.exit(1); });
