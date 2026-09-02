#!/usr/bin/env node
// Headless frame-capture harness. The ONLY sanctioned way for agents to look at
// the running game: real Chrome pixels + console log, parallel-safe (each run
// owns its own browser). Requires the vite dev server on 127.0.0.1:5199
// (or pass --url).
//
// Usage:
//   node tools/capture.mjs shot <name> [opts]           one PNG after settle
//   node tools/capture.mjs seq <name> <count> <intervalMs> [opts]
// Options:
//   --url <u>          default http://127.0.0.1:5199
//   --settle <ms>      wait after load before acting/capturing (default 2500)
//   --actions <file>   JSON array of actions executed after settle, before capture
//   --w <px> --h <px>  viewport (default 1600x900)
//   --zoom <f>         page zoom factor (e.g. 0.5 for the 50%-zoom silhouette check)
// Actions: {type:'keydown'|'keyup', key:'KeyW'} | {type:'key', key, ms} (hold)
//          {type:'mousemove', x, y} | {type:'mousedown'|'mouseup', button:'left'|'right'}
//          {type:'click', x, y, button} | {type:'wait', ms} | {type:'eval', code}
// Output:  captures/<name>.png (seq: <name>_00.png …), captures/<name>.console.txt
// Exit 1 if any page JS error occurred (uncaught exception) — console.txt has it.

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const mode = argv[0];
if (mode !== 'shot' && mode !== 'seq') {
  console.error('usage: capture.mjs shot <name> | seq <name> <count> <intervalMs>');
  process.exit(2);
}
const name = argv[1];
let count = 1, interval = 0, rest = 2;
if (mode === 'seq') { count = parseInt(argv[2], 10); interval = parseInt(argv[3], 10); rest = 4; }
const opt = { url: 'http://127.0.0.1:5199', settle: 2500, actions: null, w: 1600, h: 900, zoom: 1 };
for (let i = rest; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = k === 'url' || k === 'actions' ? argv[i + 1] : parseFloat(argv[i + 1]);
}

const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const logLines = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', `--window-size=${opt.w},${opt.h}`],
});
let hadError = false;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: 1 });
  page.on('console', (m) => logLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => { hadError = true; logLines.push(`[PAGEERROR] ${e.message}`); });
  page.on('requestfailed', (r) => logLines.push(`[REQFAIL] ${r.url()} ${r.failure()?.errorText}`));

  await page.goto(opt.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  if (opt.zoom !== 1) await page.evaluate((z) => { document.body.style.zoom = z; }, opt.zoom);
  await sleep(opt.settle);

  if (opt.actions) {
    const acts = JSON.parse(readFileSync(resolve(root, opt.actions), 'utf8'));
    for (const a of acts) {
      if (a.type === 'keydown') await page.keyboard.down(a.key);
      else if (a.type === 'keyup') await page.keyboard.up(a.key);
      else if (a.type === 'key') { await page.keyboard.down(a.key); await sleep(a.ms ?? 100); await page.keyboard.up(a.key); }
      else if (a.type === 'mousemove') await page.mouse.move(a.x, a.y);
      else if (a.type === 'mousedown') await page.mouse.down({ button: a.button ?? 'left' });
      else if (a.type === 'mouseup') await page.mouse.up({ button: a.button ?? 'left' });
      else if (a.type === 'click') await page.mouse.click(a.x, a.y, { button: a.button ?? 'left' });
      else if (a.type === 'wait') await sleep(a.ms);
      else if (a.type === 'eval') logLines.push(`[EVAL] ${JSON.stringify(await page.evaluate(a.code))}`);
      else if (a.type === 'shot') { await page.screenshot({ path: join(outDir, `${a.name}.png`) }); logLines.push(`[SHOT] ${a.name}`); }
    }
  }

  for (let f = 0; f < count; f++) {
    const file = mode === 'seq'
      ? join(outDir, `${name}_${String(f).padStart(2, '0')}.png`)
      : join(outDir, `${name}.png`);
    await page.screenshot({ path: file });
    if (f < count - 1) await sleep(interval);
  }

  const dbg = await page.evaluate(() => (window.__echoes ? {
    version: window.__echoes.version, tick: window.__echoes.tick,
    fps: window.__echoes.fps, entities: window.__echoes.entityCount,
  } : null));
  logLines.push(`[DEBUG-API] ${JSON.stringify(dbg)}`);
} catch (e) {
  hadError = true;
  logLines.push(`[HARNESS-ERROR] ${e.message}`);
} finally {
  await browser.close();
  writeFileSync(join(outDir, `${name}.console.txt`), logLines.join('\n') + '\n');
  console.log(`captured ${count} frame(s) -> captures/${name}*.png; errors: ${hadError}`);
  process.exit(hadError ? 1 : 0);
}
