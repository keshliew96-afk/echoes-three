#!/usr/bin/env node
// Fix builder M1 r1 (MENU-R1-F1) — Chrome trace of the loading -> title hand-over and the first seconds of
// the title (GPU harness), with the GPU-process categories (gpu, gpu.angle, gpu.service, viz, skia) so the
// cause of the early rAF gaps can be attributed. Writes captures/gntfixM11-trace-<label>.json and prints a
// digest: per-second self time by event name on the GPU main thread + renderer main thread, and every GPU
// main-thread task > --min ms with its biggest children.
//   node tools/gntfixM11-trace.mjs [--label L] [--url U] [--from ms-before-title] [--to ms-after-title] [--min 25]
//   node tools/gntfixM11-trace.mjs --digest captures/gntfixM11-trace-L.json
import fs from 'node:fs';
import { launchEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = { label: 'run', url: 'http://127.0.0.1:5199/?fresh=1', to: 6000, min: 25, digest: null, presses: 1 };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  const v = argv[i + 1];
  if (['label', 'url', 'digest'].includes(k)) {
    opt[k] = v;
    i++;
  } else if (['to', 'min', 'presses'].includes(k)) {
    opt[k] = Number(v);
    i++;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CATS = ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink.user_timing', 'toplevel', 'v8.execute', 'gpu', 'gpu.angle', 'gpu.service', 'cc', 'viz', 'skia', 'skia.gpu', 'skia.shaders', 'disabled-by-default-skia.shaders'];

function digest(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ev = Array.isArray(raw) ? raw : raw.traceEvents;
  const names = {};
  const pnames = {};
  for (const e of ev) {
    if (e.ph === 'M' && e.name === 'thread_name') names[e.pid + ':' + e.tid] = e.args.name;
    if (e.ph === 'M' && e.name === 'process_name') pnames[e.pid] = e.args.name;
  }
  const title = ev.find((e) => e.name === 'gntfix-title');
  if (!title) return console.log('no gntfix-title mark');
  const t0 = title.ts;
  const threads = {};
  for (const e of ev) {
    if (e.ph !== 'X' || typeof e.dur !== 'number') continue;
    const k = e.pid + ':' + e.tid;
    (threads[k] = threads[k] || []).push(e);
  }
  const pick = (tn, pn) => Object.keys(threads).filter((k) => names[k] === tn && (!pn || pnames[k.split(':')[0]] === pn)).sort((a, b) => threads[b].length - threads[a].length)[0];
  for (const [label, key] of [['GPU CrGpuMain', pick('CrGpuMain')], ['Renderer main', pick('CrRendererMain', 'Renderer')], ['VizCompositor', pick('VizCompositorThread')]]) {
    if (!key) continue;
    const arr = threads[key].sort((a, b) => a.ts - b.ts || b.dur - a.dur);
    const stack = [];
    for (const e of arr) {
      e.self = e.dur;
      e.kids = [];
      while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
      if (stack.length) {
        stack[stack.length - 1].self -= e.dur;
        stack[stack.length - 1].kids.push(e);
        e.parent = stack[stack.length - 1];
      }
      stack.push(e);
    }
    console.log(`\n=== ${label} (${key})`);
    for (let a = -2000; a < opt.to + 1000; a += 1000) {
      const tot = {};
      let busy = 0;
      for (const e of arr) {
        const age = (e.ts - t0) / 1000;
        if (age < a || age >= a + 1000) continue;
        tot[e.name] = (tot[e.name] || 0) + e.self / 1000;
        if (!e.parent) busy += e.dur / 1000;
      }
      const top = Object.entries(tot).sort((x, y) => y[1] - x[1]).slice(0, 9).map(([n, v]) => `${n} ${v.toFixed(0)}`).join(' | ');
      console.log(`[${a},${a + 1000}) busy ${busy.toFixed(0)} :: ${top}`);
    }
    if (label.startsWith('GPU')) {
      const tops = arr.filter((e) => !e.parent && e.dur > opt.min * 1000 && e.ts >= t0 - 2000000);
      for (const e of tops.slice(0, 60)) {
        const flat = [];
        const walk = (n, d) => {
          for (const c of n.kids) {
            if (c.dur > 3000) flat.push(`${'  '.repeat(d)}${c.name}${c.args && c.args.data && c.args.data.name ? '(' + c.args.data.name + ')' : ''} ${(c.dur / 1000).toFixed(1)}`);
            if (d < 4) walk(c, d + 1);
          }
        };
        walk(e, 1);
        console.log(`@${((e.ts - t0) / 1000).toFixed(0)} ${(e.dur / 1000).toFixed(1)}ms ${e.name}\n${flat.slice(0, 12).join('\n')}`);
      }
    }
  }
}

if (opt.digest) {
  digest(opt.digest);
  process.exit(0);
}

const browser = await launchEchoes({ gpu: true, width: 1600, height: 900 });
const path = `captures/gntfixM11-trace-${opt.label}.json`;
try {
  const page = await browser.newPage();
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
  await page.tracing.start({ path, categories: CATS });
  await sleep(1500);
  await page.evaluate(() => performance.mark('gntfix-ready'));
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => window.__echoes.app.state);
    if (st === 'title' || st === 'playing') break;
    await page.keyboard.press('KeyZ');
    await sleep(400);
  }
  await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 30000, polling: 50 });
  await page.evaluate(() => { performance.mark('gntfix-title'); performance.mark('gnt-title'); });
  const t0 = Date.now();
  while (Date.now() - t0 < opt.to) {
    if (opt.presses) await page.keyboard.press(Math.random() < 0.5 ? 'ArrowUp' : 'ArrowDown');
    await sleep(220);
  }
  await page.evaluate(() => { performance.mark('gntfix-end'); performance.mark('gnt-end'); });
  await page.tracing.stop();
  console.log('trace written', path);
} finally {
  await browser.close();
}
digest(path);
