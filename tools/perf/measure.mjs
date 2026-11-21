// 快適さの計測。Chrome をヘッドレスで起動し、開発サーバーのページを開いて、コマの間隔と目印の動きを記録する。
//
// 使い方: 先に `npm run dev -- --port 5180` を立ててから
//   node tools/perf/measure.mjs [http://localhost:5180/]
//
// アプリ内のプレビューが隠れている間は、ブラウザがコマを間引くので滑らかさを測れない。
// そのため、ここでは Chrome を直接起動して測る(GPU は実機のもの。CPU は 4 倍遅くした設定も測る)。

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:5180/';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ページの中で走らせる計測。結果を JSON で返す */
const PAGE_SCRIPT = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // 第6段階で部品がアイコンになったので、読み上げの名前(aria-label)でも探す
  const button = (label) =>
    [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
  const statsText = () => {
    const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^fps /.test(e.textContent.trim()));
    return el ? el.textContent.trim() : '';
  };
  const frameCount = () => Number((statsText().match(/frames (\\d+)/) ?? [])[1] ?? NaN);

  // コマの間隔と、目印(天体の名前の位置)を毎コマ記録する
  const record = async (ms) => {
    const gaps = [];
    const tracks = new Map();
    await new Promise((resolve) => {
      const t0 = performance.now();
      let last = t0;
      const step = (now) => {
        gaps.push(now - last);
        last = now;
        for (const el of document.querySelectorAll('.markers > div')) {
          if (el.style.display === 'none') continue;
          const m = /translate3d\\(([-\\d.]+)px, ([-\\d.]+)px/.exec(el.style.transform);
          if (!m) continue;
          const name = el.textContent.trim();
          if (!tracks.has(name)) tracks.set(name, []);
          tracks.get(name).push([gaps.length, Number(m[1]), Number(m[2])]);
        }
        if (now - t0 < ms) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    gaps.shift();
    const sorted = [...gaps].sort((a, b) => a - b);
    const pct = (p) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] * 10) / 10;
    // 震えの目安: 連続した 3 コマで、動きの向きが反転して戻る(行って戻る)回数と、その大きさ
    let reversals = 0;
    let worst = 0;
    for (const pts of tracks.values()) {
      for (let i = 2; i < pts.length; i++) {
        if (pts[i][0] - pts[i - 2][0] !== 2) continue; // 途中で隠れた所はまたがない
        const ax = pts[i - 1][1] - pts[i - 2][1], ay = pts[i - 1][2] - pts[i - 2][2];
        const bx = pts[i][1] - pts[i - 1][1], by = pts[i][2] - pts[i - 1][2];
        const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
        if (la < 0.5 || lb < 0.5) continue;
        const cos = (ax * bx + ay * by) / (la * lb);
        if (cos < -0.5) { reversals++; worst = Math.max(worst, Math.min(la, lb)); }
      }
    }
    return {
      frames: gaps.length,
      fps: Math.round((gaps.length / (gaps.reduce((a, b) => a + b, 0) / 1000)) * 10) / 10,
      medianMs: pct(0.5), p95Ms: pct(0.95), maxMs: pct(1),
      markerReversals: reversals, worstReversalPx: Math.round(worst * 10) / 10,
    };
  };

  const out = {};
  // 止まっている間は描かない: 2 秒待ってコマ数が増えないこと
  await sleep(1500);
  const before = frameCount();
  await sleep(2000);
  out.idleFramesIn2s = frameCount() - before;
  out.idleStats = statsText();

  button('再生').click();
  await sleep(300);
  out.playing = await record(3000);
  button('停止')?.click();
  await sleep(300);

  button('引きの眺め').click();
  out.toOverview = await record(2000);
  button('再生').click();
  await sleep(300);
  out.overviewPlaying = await record(2000);
  button('停止')?.click();
  await sleep(300);
  button('ボイジャーの視界').click();
  out.toVoyager = await record(2000);
  return JSON.stringify(out);
})()`;

const SCENARIOS = [
  { name: 'PC 1280x800 2026年11月(259億km)', query: '?debug&t=2026-11-01T00:00:00Z&view=voyager&look=sun', width: 1280, height: 800, dpr: 2, mobile: false, cpu: 1 },
  { name: 'PC 1280x800 木星の最接近', query: '?debug&t=1979-03-05T12:04:00Z&view=voyager&look=jupiter', width: 1280, height: 800, dpr: 2, mobile: false, cpu: 1 },
  { name: 'PC 1280x800 拡大の上限で地球を向く(×143)', query: '?debug&t=2026-11-01T00:00:00Z&view=voyager&look=earth&mag=143', width: 1280, height: 800, dpr: 2, mobile: false, cpu: 1 },
  { name: 'PC 1280x800 ボイジャー本体(機体の読み込み後)', query: '?debug&t=2026-11-01T00:00:00Z&view=craft', width: 1280, height: 800, dpr: 2, mobile: false, cpu: 1 },
  { name: 'スマホ 390x844 2026年11月(CPU 4倍遅く)', query: '?debug&t=2026-11-01T00:00:00Z&view=voyager&look=sun', width: 390, height: 844, dpr: 3, mobile: true, cpu: 4 },
  { name: 'スマホ 390x844 木星の最接近(CPU 4倍遅く)', query: '?debug&t=1979-03-05T12:04:00Z&view=voyager&look=jupiter', width: 390, height: 844, dpr: 3, mobile: true, cpu: 4 },
];

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'voyager-perf-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--hide-scrollbars', '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });

  try {
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
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
    };
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = nextId++;
      waiting.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Runtime.enable');
    await send('Page.enable');

    const rows = [];
    for (const s of SCENARIOS) {
      await send('Emulation.setDeviceMetricsOverride', { width: s.width, height: s.height, deviceScaleFactor: s.dpr, mobile: s.mobile });
      await send('Emulation.setCPUThrottlingRate', { rate: s.cpu });
      await send('Page.navigate', { url: BASE + s.query });
      await sleep(3500);
      const res = await send('Runtime.evaluate', { expression: PAGE_SCRIPT, awaitPromise: true, returnByValue: true });
      const value = res.result?.result?.value;
      if (res.result?.exceptionDetails || typeof value !== 'string') { rows.push({ name: s.name, error: JSON.stringify(res.result ?? res.error).slice(0, 300) }); continue; }
      rows.push({ name: s.name, ...JSON.parse(value) });
    }

    for (const r of rows) {
      console.log(`\n■ ${r.name}`);
      if (r.error) { console.log('  計測に失敗: ' + r.error); continue; }
      console.log(`  止めている 2 秒間に描いたコマ数: ${r.idleFramesIn2s} (${r.idleStats})`);
      for (const key of ['playing', 'toOverview', 'overviewPlaying', 'toVoyager']) {
        const m = r[key];
        console.log(`  ${key.padEnd(16)} fps ${String(m.fps).padStart(5)}  中央 ${m.medianMs}ms  95% ${m.p95Ms}ms  最大 ${m.maxMs}ms  目印の行き戻り ${m.markerReversals} 回(最大 ${m.worstReversalPx}px)`);
      }
    }
    console.log(errors.length ? `\nコンソールのエラー ${errors.length} 件:\n  ` + [...new Set(errors)].slice(0, 5).join('\n  ') : '\nコンソールのエラー: なし');
    ws.close();
  } finally {
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
