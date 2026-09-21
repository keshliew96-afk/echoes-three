#!/usr/bin/env node
// M2 driver: open Echoes in puppeteer (GPU harness, PLAN §6.7), run a scenario
// module, print + write JSON. Scenario files export
//   default async function (h) { ... }   with h = { page, browser, ev, sleep, shot, key,
//     press, waitFor, log, errors, consoleLines, open(url), reload(), W, H, url, fail(msg) }
// Retries the whole scenario up to 3 times when another agent's HMR reload
// or a navigation timeout interrupts it (not a defect, see the task rules).
//
//   node tools/gntM2-drive.mjs tools/gntM2-sc-<name>.mjs [--url U] [--w 1600] [--h 900] [--gpu 1] [--tries 3]
// Output: captures/gntM2-sc-<name>.json
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const scenarioPath = argv[0];
const opt = { url: 'http://127.0.0.1:5199/?menu=0&seed=7', w: 1600, h: 900, gpu: 1, tries: 3, timeout: 180000, autoplay: 0 };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = k === 'url' ? argv[i + 1] : Number(argv[i + 1]);
}
const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const name = basename(scenarioPath).replace(/\.mjs$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mod = await import(pathToFileURL(resolve(root, scenarioPath)).href);

const TRANSIENT = /Execution context was destroyed|Target closed|Navigation timeout|detached Frame|Cannot find context|Session closed|net::ERR/i;

let final = null;
for (let attempt = 1; attempt <= opt.tries; attempt++) {
  const browser = await launchEchoes({ gpu: !!opt.gpu, autoplay: !!opt.autoplay, width: opt.w, height: opt.h });
  const out = { scenario: name, url: opt.url, w: opt.w, h: opt.h, attempt, results: [], failures: [] };
  let transient = false;
  try {
    let { page, errors, consoleLines } = await openEchoes(browser, opt.url, { width: opt.w, height: opt.h, timeout: opt.timeout });
    const h = {
      browser,
      get page() {
        return page;
      },
      errors,
      consoleLines,
      W: opt.w,
      H: opt.h,
      url: opt.url,
      sleep,
      log: (tag, v) => {
        out.results.push({ tag, v });
        console.log(`[${tag}] ${JSON.stringify(v).slice(0, 2000)}`);
      },
      fail: (msg, v) => {
        out.failures.push({ msg, v });
        console.log(`[FAIL] ${msg} ${v !== undefined ? JSON.stringify(v).slice(0, 1500) : ''}`);
      },
      ev: (fn, ...args) => page.evaluate(fn, ...args),
      shot: async (n, clip) => {
        const p = join(outDir, `gntM2-${n}.png`);
        await page.screenshot({ path: p, ...(clip ? { clip } : {}) });
        return p;
      },
      key: async (k, ms = 60) => {
        await page.keyboard.down(k);
        await sleep(ms);
        await page.keyboard.up(k);
      },
      press: (action) => page.evaluate((a) => window.__echoes.app.press(a), action),
      waitFor: (fn, { timeout = 30000, polling = 50 } = {}, ...args) => page.waitForFunction(fn, { timeout, polling }, ...args),
      // Navigate the SAME page (localStorage persists): a page reload / new URL.
      open: async (url) => {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opt.timeout });
        await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: opt.timeout });
      },
      reload: async () => {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: opt.timeout });
        await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: opt.timeout });
      },
    };
    await mod.default(h);
    out.pageErrors = errors.slice();
    out.consoleErrors = consoleLines.filter((l) => l.startsWith('[error]') && !/X3595|X4000/.test(l)).slice(0, 20);
    out.ok = out.failures.length === 0 && errors.length === 0;
  } catch (err) {
    const msg = String(err && err.stack ? err.stack : err);
    transient = TRANSIENT.test(msg);
    out.ok = false;
    out.crash = msg.slice(0, 1500);
    console.log(`[CRASH attempt ${attempt}] ${msg.slice(0, 600)}`);
  } finally {
    await browser.close().catch(() => {});
  }
  final = out;
  if (!transient) break;
  await sleep(1500);
}
writeFileSync(join(outDir, `${name}.json`), JSON.stringify(final, null, 1));
console.log(`${name}: ${final.ok ? 'OK' : 'FAIL'} (${final.failures ? final.failures.length : '?'} failures, ${final.pageErrors ? final.pageErrors.length : '?'} page errors)`);
process.exit(final.ok ? 0 : 1);
