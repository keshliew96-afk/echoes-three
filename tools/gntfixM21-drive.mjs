#!/usr/bin/env node
// fix-M2-r1 driver: a copy of the save critic r1 driver (tools/gntcsave1-drive.mjs) that writes captures/gntfixM21-<scenario>.json / gntfixM21-<shot>.png so the critic evidence is never overwritten.
//   node tools/gntfixM21-drive.mjs tools/<gntcsave1|gntfixM21>-sc-<name>.mjs [--tag before] [--url U] [--w 1600] [--h 900] [--tries 3] [--autoplay 0]
// Scenario module: export default async function (h) {...}
// h = { page, browser, ev, sleep, shot, key, log, fail, open, gesture, waitFor, errors, consoleLines, W, H, url }
// Output: captures/gntfixM21-<scenario>[-<tag>].json  (results, failures, page errors, console errors)
import { resolve, dirname, join, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const scenarioPath = argv[0];
const opt = { tag: '', url: 'http://127.0.0.1:5199/?menu=0&seed=7&fresh=1', w: 1600, h: 900, tries: 3, timeout: 180000, autoplay: 0, gpu: 1 };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = k === 'url' || k === 'tag' ? argv[i + 1] : Number(argv[i + 1]);
}
const outDir = join(root, 'captures');
mkdirSync(outDir, { recursive: true });
const name = basename(scenarioPath).replace(/\.mjs$/, '').replace(/^(gntcsave1|gntfixM21)-/, '') + (opt.tag ? `-${opt.tag}` : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mod = await import(pathToFileURL(resolve(root, scenarioPath)).href);
const TRANSIENT = /Execution context was destroyed|Target closed|Navigation timeout|detached Frame|Cannot find context|Session closed|net::ERR|Waiting failed|Protocol error/i;

let final = null;
for (let attempt = 1; attempt <= opt.tries; attempt++) {
  const browser = await launchEchoes({ gpu: !!opt.gpu, autoplay: !!opt.autoplay, width: opt.w, height: opt.h, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
  const out = { scenario: name, url: opt.url, w: opt.w, h: opt.h, attempt, startedAt: new Date().toISOString(), results: [], failures: [], pageErrors: [], consoleErrors: [] };
  let transient = false;
  try {
    let { page, errors, consoleLines } = await openEchoes(browser, opt.url, { width: opt.w, height: opt.h, timeout: opt.timeout });
    const h = {
      browser,
      get page() { return page; },
      errors, consoleLines, W: opt.w, H: opt.h, url: opt.url, sleep,
      log: (tag, v) => { out.results.push({ tag, v }); console.log(`[${tag}] ${JSON.stringify(v).slice(0, 1500)}`); },
      fail: (msg, v) => { out.failures.push({ msg, v }); console.log(`[FAIL] ${msg} ${v !== undefined ? JSON.stringify(v).slice(0, 1200) : ''}`); },
      check: (cond, msg, v) => { if (!cond) h.fail(msg, v); return !!cond; },
      ev: (fn, ...args) => page.evaluate(fn, ...args),
      shot: async (n, clip) => { const p = join(outDir, `gntfixM21-${n}${opt.tag ? `-${opt.tag}` : ''}.png`); await page.screenshot({ path: p, clip }); console.log(`[shot] ${p}`); return p; },
      key: async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); await sleep(40); },
      waitFor: async (fn, timeout = 30000, poll = 100) => page.waitForFunction(fn, { timeout, polling: poll }),
      open: async (url) => {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opt.timeout });
        await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: opt.timeout });
      },
      // Pass the "Press any key" loading screen with a trusted gesture and wait for the title.
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
      ready: async () => page.waitForFunction(() => window.__echoes && window.__echoes.tick >= 240, { timeout: 90000 }),
    };
    await mod.default(h);
    out.pageErrors = errors.slice();
    out.consoleErrors = consoleLines.filter((l) => /^\[error\]/.test(l) && !/WebGLProgram|X3595|X4000/.test(l));
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
writeFileSync(join(outDir, `gntfixM21-${name}.json`), JSON.stringify(final, null, 1));
console.log(`[DONE] ${final.verdict} failures=${final.failures.length} pageErrors=${final.pageErrors.length} -> captures/gntfixM21-${name}.json`);
