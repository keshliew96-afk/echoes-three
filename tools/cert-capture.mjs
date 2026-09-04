#!/usr/bin/env node
// Certification-critic copy of tools/capture.mjs. Identical pixels/console
// contract, plus: --timeout <ms> for the navigation (default 90000 — the camp
// boot intermittently exceeds the stock 30 s networkidle2 wait), goto timing +
// request count in the console log, and three extra action types needed to
// drive a full run with REAL input:
//   {type:'loop', cond, maxMs, body:[...]}   repeat body until page-eval cond is truthy
//   {type:'if',   cond, then:[...]}          run `then` once if cond is truthy
//   {type:'shot', name}                      intermediate screenshot captures/<name>.png
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const mode = argv[0];
if (mode !== 'shot' && mode !== 'seq') {
  console.error('usage: cert-capture.mjs shot <name> | seq <name> <count> <intervalMs>');
  process.exit(2);
}
const name = argv[1];
let count = 1, interval = 0, rest = 2;
if (mode === 'seq') { count = parseInt(argv[2], 10); interval = parseInt(argv[3], 10); rest = 4; }
const opt = { url: 'http://127.0.0.1:5199', settle: 2500, actions: null, w: 1600, h: 900, zoom: 1, timeout: 90000 };
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
  protocolTimeout: 240000,
  args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', `--window-size=${opt.w},${opt.h}`],
});
let hadError = false;
let shots = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: 1 });
  let reqs = 0, lastReq = 0;
  const t0 = Date.now();
  page.on('request', () => { reqs++; lastReq = Date.now() - t0; });
  page.on('console', (m) => logLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => { hadError = true; logLines.push(`[PAGEERROR] ${e.message}`); });
  page.on('requestfailed', (r) => logLines.push(`[REQFAIL] ${r.url()} ${r.failure()?.errorText}`));

  await page.goto(opt.url, { waitUntil: 'networkidle2', timeout: opt.timeout });
  logLines.push(`[GOTO] ${Date.now() - t0} ms, ${reqs} requests, last request at ${lastReq} ms`);
  if (opt.zoom !== 1) await page.evaluate((z) => { document.body.style.zoom = z; }, opt.zoom);
  await sleep(opt.settle);

  const run = async (acts) => {
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
      else if (a.type === 'shot') { await page.screenshot({ path: join(outDir, `${a.name}.png`) }); shots++; logLines.push(`[SHOT] ${a.name}.png`); }
      else if (a.type === 'if') { if (await page.evaluate(a.cond)) await run(a.then); }
      else if (a.type === 'loop') {
        const start = Date.now(); let n = 0;
        while (!(await page.evaluate(a.cond)) && Date.now() - start < (a.maxMs ?? 60000)) { await run(a.body); n++; }
        logLines.push(`[LOOP] ${a.label ?? ''} iterations ${n}, ${Date.now() - start} ms, cond ${await page.evaluate(a.cond)}`);
      }
    }
  };
  if (opt.actions) await run(JSON.parse(readFileSync(resolve(root, opt.actions), 'utf8')));

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
  console.log(`captured ${count} frame(s) (+${shots} shots) -> captures/${name}*.png; errors: ${hadError}`);
  process.exit(hadError ? 1 : 0);
}
