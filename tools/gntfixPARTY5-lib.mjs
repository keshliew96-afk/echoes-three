// gntfixPARTY5-lib — a copy of the party critic r5 helpers (tools/gntcparty5-lib.mjs, untracked) so the fix probes run from the repo.
// gntcparty5 critic helpers (party critic, round 5). Read-only use of gnt-arch-browser.
import { launchEchoes } from './gnt-arch-browser.mjs';
import fs from 'node:fs';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const BASE = process.env.GNTC_BASE || 'http://127.0.0.1:5199/';
export async function launch(opts = {}) {
  return launchEchoes({ gpu: true, background: true, autoplay: true, width: opts.width || 1600, height: opts.height || 900, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
}
export async function open(browser, url, { width = 1600, height = 900, pad = true, minTick = 120 } = {}) {
  const page = await browser.newPage();
  const errors = [];
  const cons = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') cons.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
  if (pad) {
    await page.evaluateOnNewDocument(() => {
      window.__pad = { buttons: new Array(17).fill(0), axes: [0, 0, 0, 0] };
      const mk = () => ({ id: 'Mock Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.axes.slice(), buttons: window.__pad.buttons.map((v) => ({ pressed: v > 0.5, touched: v > 0.1, value: v })) });
      navigator.getGamepads = () => [mk(), null, null, null];
      window.__padPress = async (i, ms = 90) => { window.__pad.buttons[i] = 1; await new Promise((r) => setTimeout(r, ms)); window.__pad.buttons[i] = 0; await new Promise((r) => setTimeout(r, 160)); };
    });
  }
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction((m) => !!window.__echoes && window.__echoes.tick > m, { timeout: 180000 }, minTick);
      lastErr = null;
      break;
    } catch (e) { lastErr = e; await sleep(2000); }
  }
  if (lastErr) throw lastErr;
  await page.bringToFront();
  return { page, errors, cons };
}
export const E = (page, fn, ...args) => page.evaluate(fn, ...args);
export async function waitFor(page, fn, arg, timeout = 30000) {
  return page.waitForFunction(fn, { timeout, polling: 100 }, arg);
}
export function writeJson(name, obj) { fs.writeFileSync(`captures/${name}.json`, JSON.stringify(obj, null, 1)); }
export async function shot(page, name) { await page.screenshot({ path: `captures/${name}.png` }); return `captures/${name}.png`; }
