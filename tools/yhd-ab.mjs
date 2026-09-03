#!/usr/bin/env node
// HUD on/off A/B capture (round D2 HUD critique). Same page/action semantics as
// tools/capture.mjs, but after the actions it screenshots three frames back to
// back: HUD on, HUD off (__echoes.hud.setEnabled(false)), HUD on again — so a
// per-box diff isolates exactly what the HUD contributes (on vs off) against the
// scene's own motion noise (on vs on2).
//   node tools/yhd-ab.mjs <name> [--url u] [--settle ms] [--actions file] [--w px] [--h px]
// Output: captures/<name>-on.png, -off.png, -on2.png, <name>.console.txt
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const name = argv[0];
const opt = { url: 'http://127.0.0.1:5199', settle: 2500, actions: null, w: 1600, h: 900 };
for (let i = 1; i < argv.length; i += 2) {
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
  await page.goto(opt.url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(opt.settle);
  if (opt.actions) {
    const acts = JSON.parse(readFileSync(resolve(root, opt.actions), 'utf8'));
    for (const a of acts) {
      if (a.type === 'keydown') await page.keyboard.down(a.key);
      else if (a.type === 'keyup') await page.keyboard.up(a.key);
      else if (a.type === 'key') { await page.keyboard.down(a.key); await sleep(a.ms ?? 100); await page.keyboard.up(a.key); }
      else if (a.type === 'mousemove') await page.mouse.move(a.x, a.y);
      else if (a.type === 'click') await page.mouse.click(a.x, a.y, { button: a.button ?? 'left' });
      else if (a.type === 'wait') await sleep(a.ms);
      else if (a.type === 'eval') logLines.push(`[EVAL] ${JSON.stringify(await page.evaluate(a.code))}`);
    }
  }
  const t0 = Date.now();
  await page.screenshot({ path: join(outDir, `${name}-on.png`) });
  const t1 = Date.now();
  logLines.push(`[AB] setEnabled(false) -> ${JSON.stringify(await page.evaluate(() => window.__echoes.hud.setEnabled(false)))}`);
  await sleep(40);
  await page.screenshot({ path: join(outDir, `${name}-off.png`) });
  const t2 = Date.now();
  logLines.push(`[AB] setEnabled(true) -> ${JSON.stringify(await page.evaluate(() => window.__echoes.hud.setEnabled(true)))}`);
  await sleep(40);
  await page.screenshot({ path: join(outDir, `${name}-on2.png`) });
  const t3 = Date.now();
  logLines.push(`[AB] timing on=${t1 - t0}ms off@+${t2 - t1}ms on2@+${t3 - t2}ms`);
  const dbg = await page.evaluate(() => ({ version: window.__echoes.version, tick: window.__echoes.tick, fps: window.__echoes.fps }));
  logLines.push(`[DEBUG-API] ${JSON.stringify(dbg)}`);
} catch (e) {
  hadError = true;
  logLines.push(`[HARNESS-ERROR] ${e.message}`);
} finally {
  await browser.close();
  writeFileSync(join(outDir, `${name}.console.txt`), logLines.join('\n') + '\n');
  console.log(`ab captured -> captures/${name}-{on,off,on2}.png; errors: ${hadError}`);
  process.exit(hadError ? 1 : 0);
}
