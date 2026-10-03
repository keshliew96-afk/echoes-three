#!/usr/bin/env node
// Fix builder M1 r1 (MENU-R1-F1) — background dressing builder timeline around the title: polls
// __echoes.cmd('arenaLayout') every 100 ms from page load to +8 s after the title and prints, per change,
// the built / queued / building ids, the worker paint stats and maxSliceMs, plus every long task and rAF gap
// (> 60 ms) with its age relative to the title.
//   node tools/gntfixM11-builder.mjs [--label L] [--url U]
import { launchEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = { label: 'run', url: 'http://127.0.0.1:5199/?fresh=1', after: 8000 };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  if (k in opt) opt[k] = k === 'after' ? Number(argv[++i]) : argv[++i];
}
const log = (t, v) => console.log('NDJSON ' + JSON.stringify({ tag: t, label: opt.label, v }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => {
    const t = m.text();
    if (/error|warn|willReadFrequently/i.test(t)) log('console', `[${m.type()}] ${t.slice(0, 240)}`);
  });
  await page.evaluateOnNewDocument(() => {
    window.__tl = [];
    window.__slow = [];
    // Time the big main-thread pieces of a dressing build: texture uploads, mipmaps, canvas blits.
    const wrap = (proto, name, big) => {
      if (!proto || typeof proto[name] !== 'function') return;
      const orig = proto[name];
      proto[name] = function (...a) {
        const t = performance.now();
        const r = orig.apply(this, a);
        const d = performance.now() - t;
        if (d > 4) window.__slow.push({ t: Math.round(t), fn: name, ms: +d.toFixed(1), what: big(a) });
        return r;
      };
    };
    const dim = (a) => {
      const s = a.find((x) => x && typeof x === 'object' && 'width' in x && 'height' in x);
      return s ? `${s.constructor && s.constructor.name} ${s.width}x${s.height}` : String(a.length);
    };
    wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, 'texImage2D', dim);
    wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, 'texSubImage2D', dim);
    wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, 'texStorage2D', (a) => `${a[3]}x${a[4]}`);
    wrap(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, 'generateMipmap', () => '');
    wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, 'drawImage', dim);
    wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, 'getImageData', (a) => `${a[2]}x${a[3]}`);
    wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype, 'putImageData', dim);
    window.__lt = [];
    window.__gaps = [];
    let last = 0;
    const loop = (t) => {
      if (last && t - last > 60) window.__gaps.push({ t: Math.round(t), gap: Math.round(t - last) });
      last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push({ t: Math.round(e.startTime), dur: Math.round(e.duration) });
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      /* */
    }
    let prev = '';
    setInterval(() => {
      const E = window.__echoes;
      if (!E || typeof E.cmd !== 'function') return;
      let L = null;
      try {
        L = E.cmd('arenaLayout');
      } catch {
        return;
      }
      if (!L) return;
      const key = JSON.stringify([L.built, L.building, L.worker && L.worker.ok, L.maxSliceMs]);
      if (key !== prev) {
        prev = key;
        window.__tl.push({ t: Math.round(performance.now()), state: E.app ? E.app.state : null, built: L.built.length, building: L.building, queued: L.queued.length, maxSliceMs: L.maxSliceMs, worker: L.worker, sync: L.syncBuilds });
      }
    }, 100);
  });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(opt.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.app, { timeout: 180000 });
  await page.waitForFunction(
    () => {
      const a = window.__echoes.app;
      if (a.state !== 'boot') return true;
      const el = document.querySelector('#app-ui');
      return !!(el && /Ready|Press any key/i.test(el.textContent || ''));
    },
    { timeout: 120000, polling: 200 },
  );
  const readyAt = await page.evaluate(() => performance.now());
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__echoes.app.state);
    if (st === 'title' || st === 'playing') break;
    await page.keyboard.press('KeyZ');
    await sleep(400);
  }
  await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 30000, polling: 50 });
  const titleAt = await page.evaluate(() => performance.now());
  await sleep(opt.after);
  const out = await page.evaluate(
    (t0) => ({
      tl: window.__tl.map((r) => ({ ...r, age: r.t - Math.round(t0) })),
      lt: window.__lt.map((r) => ({ age: r.t - Math.round(t0), dur: r.dur })),
      gaps: window.__gaps.map((r) => ({ age: r.t - Math.round(t0), gap: r.gap })),
      slow: window.__slow.map((r) => ({ ...r, age: r.t - Math.round(t0) })),
      loading: window.__echoes.app.screens && null,
    }),
    titleAt,
  );
  log('marks', { readyAge: Math.round(readyAt - titleAt), titleAt: Math.round(titleAt) });
  for (const r of out.tl) log('builder', r);
  log('slow', out.slow);
  log('longtasks', out.lt);
  log('gaps', out.gaps.filter((g) => g.age > -4000));
  log('errors', errors);
} finally {
  await browser.close();
}
