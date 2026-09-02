#!/usr/bin/env node
// Same contract as tools/capture.mjs, plus a {type:'shot', name} action so a
// probe can freeze the frame, screenshot it, mutate the scene and screenshot
// again in ONE page session (what the Round-D critic's kxb-*.json files need).
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const name = argv[0];
const opt = { url: 'http://127.0.0.1:5199', settle: 2500, actions: null, w: 1600, h: 900, zoom: 1, shot: 1 };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = (k === 'url' || k === 'actions') ? argv[i + 1] : parseFloat(argv[i + 1]);
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
  await page.goto(opt.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(opt.settle);
  let shots = 0;
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
      else if (a.type === 'shot') { await page.screenshot({ path: join(outDir, `${a.name}.png`) }); shots++; }
    }
  }
  if (shots === 0) await page.screenshot({ path: join(outDir, `${name}.png`) });
  const dbg = await page.evaluate(() => (window.__echoes ? { version: window.__echoes.version, tick: window.__echoes.tick, fps: window.__echoes.fps, entities: window.__echoes.entityCount } : null));
  logLines.push(`[DEBUG-API] ${JSON.stringify(dbg)}`);
} catch (e) { hadError = true; logLines.push(`[HARNESS-ERROR] ${e.message}`); }
finally {
  await browser.close();
  writeFileSync(join(outDir, `${name}.console.txt`), logLines.join('\n') + '\n');
  console.log(`ky-run ${name}; errors: ${hadError}`);
  process.exit(hadError ? 1 : 0);
}
