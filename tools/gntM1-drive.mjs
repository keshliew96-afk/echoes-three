#!/usr/bin/env node
// M1 driver: open Echoes in puppeteer (GPU harness by default, PLAN §6.7),
// run a scenario script, screenshot, print JSON. Scenario files are ES modules
// exporting `default async function (h) {...}` where h = { page, sleep, shot,
// ev, key, press, waitFor, log, errors, consoleLines, W, H }.
//
//   node tools/gntM1-drive.mjs <scenario.mjs> [--url U] [--w 1600] [--h 900]
//        [--gpu 1] [--headful 0] [--autoplay 0] [--timeout 180000]
import { resolve, dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const scenarioPath = argv[0];
const opt = { url: 'http://127.0.0.1:5199/', w: 1600, h: 900, gpu: 1, headful: 0, autoplay: 0, timeout: 180000, dpr: 1 };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = k === 'url' ? argv[i + 1] : Number(argv[i + 1]);
}
const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await launchEchoes({
  gpu: !!opt.gpu,
  headful: !!opt.headful,
  autoplay: !!opt.autoplay,
  width: opt.w,
  height: opt.h,
});
const out = { scenario: scenarioPath, url: opt.url, w: opt.w, h: opt.h, results: [] };
let code = 0;
try {
  const { page, errors, consoleLines } = await openEchoes(browser, opt.url, { width: opt.w, height: opt.h, timeout: opt.timeout });
  if (opt.dpr !== 1) await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: opt.dpr });
  const h = {
    page,
    errors,
    consoleLines,
    W: opt.w,
    H: opt.h,
    sleep,
    log: (tag, v) => {
      out.results.push({ tag, v });
      console.log(`[${tag}] ${JSON.stringify(v)}`);
    },
    ev: (fn, ...args) => page.evaluate(fn, ...args),
    shot: async (name, clip) => {
      const path = join(outDir, `gntM1-${name}.png`);
      await page.screenshot({ path, ...(clip ? { clip } : {}) });
      return path;
    },
    key: async (k, ms = 60) => {
      await page.keyboard.down(k);
      await sleep(ms);
      await page.keyboard.up(k);
    },
    press: (action) => page.evaluate((a) => window.__echoes.app.press(a), action),
    waitFor: async (fn, { timeout = 30000, poll = 50, arg } = {}) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        let v;
        try {
          v = await page.evaluate(fn, arg);
        } catch {
          v = null;
        }
        if (v) return v;
        await sleep(poll);
      }
      return null;
    },
  };
  const mod = await import(pathToFileURL(resolve(root, scenarioPath)).href);
  await mod.default(h);
  out.pageErrors = errors;
  out.consoleErrors = consoleLines.filter((l) => l.startsWith('[error]'));
  if (errors.length) code = 1;
  console.log(`[PAGEERRORS] ${errors.length} ${JSON.stringify(errors.slice(0, 5))}`);
  console.log(`[CONSOLE-ERRORS] ${out.consoleErrors.length} ${JSON.stringify(out.consoleErrors.slice(0, 5))}`);
} catch (err) {
  console.error('[DRIVER] failed', err);
  out.driverError = String(err && err.stack ? err.stack : err);
  code = 2;
} finally {
  const name = scenarioPath.split(/[\\/]/).pop().replace(/\.mjs$/, '');
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(out, null, 1));
  await browser.close();
}
process.exit(code);
