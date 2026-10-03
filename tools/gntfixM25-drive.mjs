#!/usr/bin/env node
// fix-M2-r5 driver (copy of the save critic r5 driver, outputs renamed; PLAN §6.7 GPU harness via the shared read-only launcher).
//   node tools/gntfixM25-drive.mjs tools/gntfixM25-sc-<name>.mjs [--url U] [--w 1600] [--h 900] [--tries 3] [--autoplay 0] [--tag t]
// Scenario module: export default async function (h) {...}
// Output: captures/gntfixM25-<scenario>[-tag].json
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const scenarioPath = argv[0];
const opt = { url: (process.env.GFM25_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7&fresh=1', w: 1600, h: 900, tries: 3, timeout: 180000, autoplay: 0, gpu: 1, tag: '' };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = (k === 'url' || k === 'tag') ? argv[i + 1] : Number(argv[i + 1]);
}
const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const name = basename(scenarioPath).replace(/\.mjs$/, '').replace(/^gntfixM25-/, '') + (opt.tag ? '-' + opt.tag : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mod = await import(pathToFileURL(resolve(root, scenarioPath)).href);
const TRANSIENT = /Execution context was destroyed|Target closed|Navigation timeout|detached Frame|Cannot find context|Session closed|net::ERR|Waiting failed|Protocol error|context was destroyed/i;

let final = null;
for (let attempt = 1; attempt <= opt.tries; attempt++) {
  const browser = await launchEchoes({ gpu: !!opt.gpu, headful: !!process.env.GCS5_HEADFUL, autoplay: !!opt.autoplay, width: opt.w, height: opt.h, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  const out = { scenario: name, url: opt.url, w: opt.w, h: opt.h, attempt, startedAt: new Date().toISOString(), results: [], failures: [], pageErrors: [], consoleErrors: [] };
  let transient = false;
  const allErrors = [];
  const allConsole = [];
  try {
    let { page, errors, consoleLines } = await openEchoes(browser, opt.url, { width: opt.w, height: opt.h, timeout: opt.timeout });
    const timedErrors = []; out.timedErrors = timedErrors;
    page.on('pageerror', (e) => timedErrors.push({ t: new Date().toISOString(), url: page.url(), msg: String(e && e.message ? e.message : e).slice(0, 300), stack: String(e && e.stack || '').slice(0, 800) }));
    const hook = (p) => { p.on('pageerror', (e) => allErrors.push(String(e && e.message ? e.message : e))); p.on('console', (m) => allConsole.push(`[${m.type()}] ${m.text()}`)); };
    const h = {
      browser, opt, root, outDir,
      get page() { return page; },
      set page(p) { page = p; },
      errors, consoleLines, allErrors, allConsole, hook, W: opt.w, H: opt.h, url: opt.url, sleep,
      log: (tag, v) => { out.results.push({ tag, v, t: new Date().toISOString() }); console.log(`[${tag}] ${JSON.stringify(v).slice(0, 1800)}`); },
      fail: (msg, v) => { out.failures.push({ msg, v }); console.log(`[FAIL] ${msg} ${v !== undefined ? JSON.stringify(v).slice(0, 1500) : ''}`); },
      check: (cond, msg, v) => { if (!cond) h.fail(msg, v); return !!cond; },
      ev: (fn, ...args) => page.evaluate(fn, ...args),
      shot: async (n, clip) => { const p = join(outDir, `gntfixM25-${n}.png`); await page.screenshot({ path: p, clip }); console.log(`[shot] ${p}`); return p; },
      key: async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); await sleep(60); },
      waitFor: async (fn, timeout = 30000, poll = 100, ...args) => page.waitForFunction(fn, { timeout, polling: poll }, ...args),
      open: async (url) => {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opt.timeout });
        await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: opt.timeout });
      },
      gesture: async (timeout = 60000) => {
        const t0 = Date.now();
        while (Date.now() - t0 < timeout) {
          const st = await page.evaluate(() => window.__echoes.app && window.__echoes.app.state);
          if (st === 'title' || st === 'playing') return st;
          await page.keyboard.press('Space');
          await sleep(300);
        }
        throw new Error('gesture: title not reached');
      },
      ready: async (minTick = 240) => page.waitForFunction((m) => window.__echoes && window.__echoes.tick >= m, { timeout: 90000 }, minTick),
    };
    await mod.default(h);
    out.pageErrors = errors.concat(allErrors);
    out.consoleErrors = consoleLines.concat(allConsole).filter((l) => /^\[error\]/.test(l) && !/WebGLProgram|X3595|X4000/.test(l));
    final = out;
    break;
  } catch (e) {
    const msg = String(e && e.stack ? e.stack : e);
    transient = TRANSIENT.test(msg);
    out.failures.push({ msg: `exception${transient ? ' (transient)' : ''}`, v: msg.slice(0, 1500) });
    console.log(`[EXC attempt ${attempt}] ${msg.slice(0, 800)}`);
    final = out;
    if (!transient) break;
  } finally {
    try { await browser.close(); } catch {}
  }
  if (transient && attempt < opt.tries) console.log(`retrying (${attempt + 1}/${opt.tries})`);
}
final.endedAt = new Date().toISOString();
final.verdict = final.failures.length === 0 && final.pageErrors.length === 0 ? 'OK' : 'FAIL';
writeFileSync(join(outDir, `gntfixM25-${name}.json`), JSON.stringify(final, null, 1));
console.log(`[DONE] ${final.verdict} failures=${final.failures.length} pageErrors=${final.pageErrors.length} -> captures/gntfixM25-${name}.json`);
