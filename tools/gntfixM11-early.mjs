#!/usr/bin/env node
// Fix builder M1 r1 (MENU-R1-F1) — early-title response probe. Reproduces the critic's keyboardEarly metric
// (tools/gntcmenu1-resp.mjs: reachTitle -> +700 ms -> 20 ArrowDown/Up presses 220 ms apart, latency from
// app.responses()) and adds, per run: an independent keydown -> first rAF after the #app-ui mutation measure,
// every rAF gap > 40 ms with its age relative to the title, long tasks, scheduler frame stats, and the same
// set again after 5 s idle ("settled"). --src gamepad|mouse measures that source in the early window instead.
//   node tools/gntfixM11-early.mjs [--label L] [--url U] [--src keyboard|gamepad|mouse] [--w 1600 --h 900]
//                                  [--settings '{"display.renderScale":0.5}'] [--exp hideui] [--settled 0|1]
import { launchEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = { label: 'run', url: 'http://127.0.0.1:5199/?fresh=1', src: 'keyboard', w: 1600, h: 900, settings: null, exp: '', settled: 1, gap: 220 };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  const v = argv[i + 1];
  if (['label', 'url', 'src', 'settings', 'exp'].includes(k)) {
    opt[k] = v;
    i++;
  } else if (['w', 'h', 'settled', 'gap'].includes(k)) {
    opt[k] = Number(v);
    i++;
  }
}
const log = (t, v) => console.log('NDJSON ' + JSON.stringify({ tag: t, label: opt.label, v }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (a, p) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y);
  return +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)].toFixed(1);
};
const sum = (a) => ({ n: a.length, p50: pct(a, 50), p95: pct(a, 95), max: a.length ? +Math.max(...a).toFixed(1) : null });

const browser = await launchEchoes({ gpu: true, width: opt.w, height: opt.h });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => {
    errors.push(String(e.message || e));
    log('pageerror', String(e.message || e));
  });
  page.on('console', (m) => {
    const t = m.text();
    if (/\[vite\]|error|warn/i.test(t)) log('console', `[${m.type()}] ${t.slice(0, 300)}`);
  });
  await page.evaluateOnNewDocument((settingsJson) => {
    if (settingsJson) {
      try {
        const data = JSON.parse(settingsJson);
        localStorage.setItem('echoes.settings', JSON.stringify({ v: 1, savedAt: Date.now(), data }));
      } catch (e) {
        /* ignore */
      }
    }
    window.__pad = { buttons: new Array(17).fill(0), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [
      { id: 'Mock Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.axes.slice(), buttons: window.__pad.buttons.map((v) => ({ pressed: v > 0.5, touched: v > 0.1, value: v })) },
      null,
      null,
      null,
    ];
    window.__gaps = [];
    window.__lt = [];
    window.__lat = [];
    window.__pend = null;
    window.__titleAt = null;
    let last = 0;
    const loop = (t) => {
      if (last && t - last > 40) window.__gaps.push({ t: +t.toFixed(1), gap: +(t - last).toFixed(1) });
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push({ t: +e.startTime.toFixed(0), dur: +e.duration.toFixed(0) });
      }).observe({ type: 'longtask', buffered: true });
    } catch (e) {
      /* */
    }
    addEventListener('keydown', (e) => (window.__pend = { t: e.timeStamp, src: 'keyboard' }), true);
    addEventListener('mousemove', (e) => (window.__pend = { t: e.timeStamp, src: 'mouse' }), true); // each probe move lands on another item
    window.__armMO = () => {
      const mo = new MutationObserver(() => {
        const p = window.__pend;
        if (!p) return;
        window.__pend = null;
        requestAnimationFrame(() => window.__lat.push({ src: p.src, at: +p.t.toFixed(0), ms: +(performance.now() - p.t).toFixed(1) }));
      });
      mo.observe(document.getElementById('app-ui'), { attributes: true, subtree: true, childList: true, characterData: true });
    };
    window.__padTap = (i) => {
      window.__pend = { t: performance.now(), src: 'gamepad' };
      window.__pad.buttons[i] = 1;
      setTimeout(() => (window.__pad.buttons[i] = 0), 90);
    };
  }, opt.settings);
  await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: 1 });
  const tNav = Date.now();
  await page.goto(opt.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.app, { timeout: 180000 });
  // == the critic's reachTitle (tools/gntcmenu1-lib.mjs)
  await page.waitForFunction(
    () => {
      const a = window.__echoes && window.__echoes.app;
      if (!a) return false;
      if (a.state !== 'boot') return true;
      const el = document.querySelector('#app-ui');
      return !!(el && /Ready|Press any key/i.test(el.textContent || ''));
    },
    { timeout: 120000, polling: 200 },
  );
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__echoes.app.state);
    if (st === 'title' || st === 'playing') break;
    await page.bringToFront().catch(() => {});
    await page.keyboard.press('KeyZ');
    await sleep(400);
  }
  await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 30000, polling: 100 });
  const titleAt = await page.evaluate(() => (window.__titleAt = performance.now()));
  log('boot', { msToTitle: Date.now() - tNav, titleAt: +titleAt.toFixed(0), version: await page.evaluate(() => window.__echoes.version) });
  if (opt.exp === 'hideui') await page.evaluate(() => (document.getElementById('app-ui').style.visibility = 'hidden'));
  await sleep(700);
  await page.evaluate(() => window.__armMO());
  const take = async () => page.evaluate(() => window.__echoes.app.responses().slice());
  const runSet = async (src) => {
    const b = await take();
    await page.evaluate(() => (window.__lat.length = 0));
    const t0 = await page.evaluate(() => performance.now() - window.__titleAt);
    let rects = null;
    if (src === 'mouse')
      rects = await page.evaluate(() =>
        [...document.querySelectorAll('.ap-title [data-nav]')]
          .filter((e) => e.getBoundingClientRect().width > 0 && !e.disabled) // hover: app.responses() records no hover, the independent measure does
          .slice(0, 3)
          .map((e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }),
      );
    for (let i = 0; i < 20; i++) {
      if (src === 'keyboard') await page.keyboard.press(i % 2 ? 'ArrowUp' : 'ArrowDown');
      else if (src === 'gamepad') await page.evaluate((btn) => window.__padTap(btn), i % 2 ? 12 : 13);
      else {
        const r = rects[i % 2];
        await page.mouse.move(r.x + (i % 3), r.y, { steps: 1 });
      }
      await sleep(src === 'gamepad' ? 320 : opt.gap);
    }
    await sleep(300);
    const a = await take();
    const recs = a.filter((r) => !b.some((x) => x.inputTs === r.inputTs && x.action === r.action) && r.source === src);
    const lat = await page.evaluate(() => window.__lat.slice());
    const titleT = await page.evaluate(() => window.__titleAt);
    const t1 = await page.evaluate(() => performance.now() - window.__titleAt);
    const frame = await page.evaluate(() => {
      const f = window.__echoes.app.frameStats();
      return { fps: f.renderedFps, p50: f.frameMsP50, p95: f.frameMsP95, workP50: f.workMsP50, workP95: f.workMsP95 };
    });
    return {
      window: [+t0.toFixed(0), +t1.toFixed(0)],
      responses: sum(recs.map((r) => r.ms)),
      all: recs.map((r) => ({ age: +(r.inputTs - titleT).toFixed(0), ms: r.ms })),
      independent: sum(lat.map((l) => l.ms)),
      frame,
    };
  };
  const early = await runSet(opt.src);
  log('early', early);
  if (opt.settled) {
    await sleep(5000);
    log('settled', await runSet(opt.src));
  }
  const tl = await page.evaluate(() => ({
    gaps: window.__gaps.filter((g) => g.t > window.__titleAt - 1500).map((g) => ({ age: +(g.t - window.__titleAt).toFixed(0), gap: g.gap })),
    longtasks: window.__lt.filter((l) => l.t > window.__titleAt - 1500).map((l) => ({ age: l.t - Math.round(window.__titleAt), dur: l.dur })),
  }));
  log('gaps', tl.gaps);
  log('longtasks', tl.longtasks);
  log('errors', errors);
} catch (e) {
  log('FATAL', String(e && e.stack));
} finally {
  await browser.close();
}
