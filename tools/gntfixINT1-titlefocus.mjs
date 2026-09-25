#!/usr/bin/env node
// Refuter (journey r1, J2-title-focus-after-quit): title focus after Quit / Save & Quit, run ALONE,
// with varied input sources and timings. Judges only the running page (debug API + DOM + pixels).
//   node tools/gntfixINT1-titlefocus.mjs [--url http://127.0.0.1:5199] [--tag dev] [--only S1,S5]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:5199');
const tag = arg('tag', 'dev');
const only = arg('only', 'all');
const outPath = `captures/gntfixINT1-titlefocus-${tag}.json`;
mkdirSync(join(root, 'captures'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { schema: 'gntfixINT1-titlefocus/1', at: new Date().toISOString(), base, tag, scenarios: {} };
const log = (...a) => console.log(...a);
const want = (n) => only === 'all' || only.split(',').includes(n);
const shot = async (page, name) => { await page.screenshot({ path: join(root, 'captures', `gntfixINT1-${tag}-${name}.png`) }); log(`[SHOT] gntfixINT1-${tag}-${name}.png`); };
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
async function press(page, key, times = 1, gap = 120) { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(gap); } }
async function navTo(page, id, max = 16) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowDown'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowUp'); if ((await focusOf(page)) === id) return true; } return false; }
async function waitFor(page, body, { timeout = 20000, every = 80 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
const titleState = (page) => page.evaluate(() => {
  const a = window.__echoes.app; const f = a.focus() || {};
  const items = [...document.querySelectorAll('[data-nav]')].filter((b) => /^ap-title-/.test(b.id) && b.getBoundingClientRect().width > 0)
    .map((b) => ({ id: b.id, dis: !!b.disabled, def: b.hasAttribute('data-nav-default'), text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70), y: Math.round(b.getBoundingClientRect().y) }));
  return { state: a.state, stack: a.stack(), focus: f.id ?? null, focusLabel: f.label ?? null, rings: a.ringCount ? a.ringCount() : null, activeEl: document.activeElement && document.activeElement.id, items, version: window.__echoes.version, marker: window.__gntrMarker || null, tick: window.__echoes.tick };
});
const snapshot = (page) => page.evaluate(() => { const s = window.__echoes.state(); let ll = null; try { const l = window.__echoes.save.lastLoad; ll = typeof l === 'function' ? l() : l; } catch (e) { ll = String(e); } return { state: window.__echoes.app.state, mode: window.__echoes.app.mode, tick: window.__echoes.tick, runActive: s.run && s.run.active, room: s.run && s.run.room, phase: s.run && s.run.phase, lastLoad: ll && (ll.slot || ll.id || ll.slotId || JSON.stringify(ll).slice(0, 120)), slots: window.__echoes.save.list().map((x) => x.id) }; });

async function bootToTitle(page, { mouse = false } = {}) {
  await page.evaluate(() => { window.__gntrMarker = 'm' + Date.now(); });
  const spl = await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, { timeout: 40000 });
  if (await page.evaluate(() => window.__echoes.app.state !== 'title')) { if (mouse) await page.mouse.click(800, 450); else await press(page, 'Enter'); }
  const t = await waitFor(page, `window.__echoes.app.state==='title' && window.__echoes.app.stack().join()==='title'`, { timeout: 20000 });
  await sleep(900);
  return { spl, t };
}
async function clickId(page, id) { const r = await page.evaluate((i) => { const e = document.getElementById(i); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, id); if (!r) return false; await page.mouse.move(r.x - 3, r.y - 2, { steps: 4 }); await sleep(80); await page.mouse.move(r.x, r.y, { steps: 3 }); await sleep(80); await page.mouse.click(r.x, r.y); return true; }
async function pollTitleFocus(page) { const series = []; const t0 = Date.now(); for (const at of [0, 150, 400, 900, 1600, 3000]) { const w = at - (Date.now() - t0); if (w > 0) await sleep(w); series.push({ at, ...(await page.evaluate(() => ({ focus: (window.__echoes.app.focus() || {}).id ?? null, stack: window.__echoes.app.stack().join(), hasContinue: !!document.getElementById('ap-title-continue') }))) }); } return series; }

// quitKind: 'savequit' | 'quit'; input: 'kbd' | 'mouse'
async function leaveToTitle(page, quitKind, input) {
  await press(page, 'Escape');
  await waitFor(page, `window.__echoes.app.stack().includes('pause')`, { timeout: 6000 }); await sleep(350);
  const pzId = quitKind === 'savequit' ? 'pz-savequit' : 'pz-quit';
  if (input === 'mouse') await clickId(page, pzId); else { await navTo(page, pzId); await press(page, 'Enter'); }
  const c = await waitFor(page, `window.__echoes.app.stack().includes('confirm')`, { timeout: 6000 }); await sleep(300);
  const conf = await page.evaluate(() => ({ focus: (window.__echoes.app.focus() || {}).id, ids: [...document.querySelectorAll('[data-nav]')].filter((b) => /confirm/.test(b.id) && b.getBoundingClientRect().width > 0).map((b) => b.id) }));
  if (c >= 0) { if (input === 'mouse') await clickId(page, 'ap-confirm-ok'); else { await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter', 1, 10); } }
  const tt = await waitFor(page, `window.__echoes.app.state==='title' && window.__echoes.app.stack().join()==='title'`, { timeout: 20000, every: 30 });
  return { conf, titleMs: tt };
}

const browser = await launchEchoes({ gpu: true });
try {
  const runScenario = async (name, { input = 'kbd', quitKind = 'savequit', saveFirst = null }) => {
    if (!want(name)) return;
    const res = { input, quitKind, saveFirst };
    const { page, errors } = await openEchoes(browser, `${base}/?fresh=1`);
    try {
      res.boot = await bootToTitle(page, { mouse: input === 'mouse' });
      res.title0 = await titleState(page);
      if (input === 'mouse') await clickId(page, 'ap-title-new'); else { await navTo(page, 'ap-title-new'); await press(page, 'Enter'); }
      res.playMs = await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 20000 });
      await sleep(1500);
      if (input === 'mouse') await page.mouse.move(5, 5, { steps: 2 });
      await page.keyboard.down('w'); await sleep(400); await page.keyboard.up('w'); await sleep(300);
      if (saveFirst === 'f5') { await press(page, 'F5'); await waitFor(page, `window.__echoes.save.list().length>0`, { timeout: 8000 }); await sleep(600); }
      res.slotsBefore = (await snapshot(page)).slots;
      res.leave = await leaveToTitle(page, quitKind, input);
      res.series = await pollTitleFocus(page);
      res.title1 = await titleState(page);
      await shot(page, `${name}-title-after`);
      if (input === 'mouse') { await page.mouse.move(5, 5, { steps: 3 }); await sleep(300); res.focusAfterMouseParked = await focusOf(page); }
      await press(page, 'Enter', 1, 50);
      await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 15000 }); await sleep(1200);
      res.afterEnter = await snapshot(page);
      await shot(page, `${name}-after-enter`);
      res.marker = await page.evaluate(() => window.__gntrMarker || null);
      res.errors = errors.slice(0, 5);
    } catch (e) { res.harnessError = String((e && e.stack) || e); }
    out.scenarios[name] = res;
    log(name, JSON.stringify({ title0: res.title0 && res.title0.focus, title1: res.title1 && { focus: res.title1.focus, items: res.title1.items.map((i) => `${i.id}${i.def ? '*' : ''}`), rings: res.title1.rings, v: res.title1.version }, mouseParked: res.focusAfterMouseParked, series: res.series, afterEnter: res.afterEnter, marker: res.marker, errors: res.errors, err: res.harnessError }));
    await page.close();
  };
  await runScenario('S1-kbd-f5-savequit', { input: 'kbd', quitKind: 'savequit', saveFirst: 'f5' });
  await runScenario('S2-kbd-savequit-only', { input: 'kbd', quitKind: 'savequit' });
  await runScenario('S3-kbd-f5-quit', { input: 'kbd', quitKind: 'quit', saveFirst: 'f5' });
  await runScenario('S4-mouse-f5-savequit', { input: 'mouse', quitKind: 'savequit', saveFirst: 'f5' });

  if (want('S5')) {
    const res = {};
    const { page, errors } = await openEchoes(browser, `${base}/?fresh=1`);
    try {
      await bootToTitle(page); await navTo(page, 'ap-title-new'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1500);
      await press(page, 'F5'); await waitFor(page, `window.__echoes.save.list().length>0`, { timeout: 8000 }); await sleep(800);
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => !!window.__echoes, { timeout: 60000 });
      await bootToTitle(page);
      res.titleReload = await titleState(page); await shot(page, 'S5-title-reload');
      await navTo(page, 'ap-title-continue'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1500);
      res.leave = await leaveToTitle(page, 'savequit', 'kbd');
      res.series = await pollTitleFocus(page);
      res.titleAfter = await titleState(page); await shot(page, 'S5-title-after-continue-savequit');
      await navTo(page, 'ap-title-new'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1500);
      res.leave2 = await leaveToTitle(page, 'savequit', 'kbd');
      res.series2 = await pollTitleFocus(page);
      res.titleAfter2 = await titleState(page);
      res.errors = errors.slice(0, 5);
    } catch (e) { res.harnessError = String((e && e.stack) || e); }
    out.scenarios.S5 = res;
    log('S5', JSON.stringify({ reload: res.titleReload && res.titleReload.focus, reloadItems: res.titleReload && res.titleReload.items.map((i) => `${i.id}${i.def ? '*' : ''}`), afterContinue: res.titleAfter && res.titleAfter.focus, afterNew: res.titleAfter2 && res.titleAfter2.focus, series: res.series, series2: res.series2, errors: res.errors, err: res.harnessError }));
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(root, outPath), JSON.stringify(out, null, 1));
log(`-> ${outPath}`);
