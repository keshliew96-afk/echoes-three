#!/usr/bin/env node
// gntfixDEPLOY6-firstclick: does the FIRST mouse click on the title's
// Multiplayer item open the multiplayer menu? (The refuter probe
// gntrdeploy6harness-f2-lobbycopy clicks once and failed on v0.5.209.)
// usage: node tools/gntfixDEPLOY6-firstclick.mjs --url http://127.0.0.1:7931/ [--tag A] [--wait 0]
import puppeteer from 'puppeteer';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
const URL0 = a.url || 'http://127.0.0.1:7931/';
const TAG = a.tag || 'A';
const WAIT = +(a.wait || 0);
const OUT = 'captures/gntfixDEPLOY6';
mkdirSync(OUT, { recursive: true });
const PROF = join(process.env.TEMP || '.', 'gntfixDEPLOY6-profiles');
mkdirSync(PROF, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, userDataDir: mkdtempSync(join(PROF, 'fc-')), args: ['--enable-unsafe-swiftshader', '--window-size=1280,720', ...(a.autoplay === '1' ? ['--autoplay-policy=no-user-gesture-required'] : [])] });
const out = { url: URL0, wait: WAIT };
try {
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1280, height: 720 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.app, { timeout: 120000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const st = await page.evaluate(() => window.__echoes.app.state);
    if (st === 'title') break;
    if (st === 'boot') await page.keyboard.press('KeyQ');
    await sleep(300);
  }
  out.titleMs = Date.now() - t0;
  if (WAIT) await sleep(WAIT);
  const r = await page.evaluate(() => {
    const el = document.querySelector('#ap-title-multiplayer');
    const b = el.getBoundingClientRect();
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, hit: hit ? `${hit.tagName}#${hit.id}.${hit.className}` : null, overlay: window.__echoes.app.overlay, state: window.__echoes.app.state };
  });
  out.before = r;
  if (a.fast !== '1') await page.screenshot({ path: `${OUT}/fc-${TAG}-before.png` });
  await page.mouse.click(r.x, r.y);
  out.clickAt = Date.now() - t0;
  const tries = [];
  for (let i = 0; i < 25; i++) {
    await sleep(200);
    const s = await page.evaluate(() => ({ overlay: window.__echoes.app.overlay, state: window.__echoes.app.state, mp: !!(document.querySelector('#nt-mp-host') && document.querySelector('#nt-mp-host').getClientRects().length) }));
    tries.push(s);
    if (s.mp) break;
  }
  out.after = tries[tries.length - 1];
  out.openedMs = out.after.mp ? tries.length * 200 : null;
  await page.screenshot({ path: `${OUT}/fc-${TAG}-after.png` });
  out.errors = errs;
} catch (e) {
  out.fatal = String(e.stack || e);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/fc-${TAG}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
}
