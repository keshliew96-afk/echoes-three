#!/usr/bin/env node
// INT fix builder (r1, J1 re-check): does a REAL mouse click on a Save-mode slot
// row, from the pause menu, write the save? Varies the delay between the saves
// screen opening and the click (settle window), and hover-then-click vs click.
//   node tools/gntfixINT1-slotclick.mjs [--url http://127.0.0.1:5199] [--tag dev] [--delays 120,400,900]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:5199');
const tag = arg('tag', 'dev');
const delays = String(arg('delays', '120,400,900')).split(',').map(Number);
const inRun = Number(arg('run', 0)); // 1: the refuter's B-section conditions — room 1 combat right after entry (autosave in flight)
mkdirSync(join(root, 'captures'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = { schema: 'gntfixINT1-slotclick/1', at: new Date().toISOString(), base, tag, cases: [] };
async function waitFor(page, body, timeout = 15000, every = 50) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
const focusId = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
async function press(page, key, n = 1, gap = 120) { for (let i = 0; i < n; i++) { await page.keyboard.press(key); await sleep(gap); } }
async function navTo(page, id, max = 14) { if ((await focusId(page)) === id) return true; for (const k of ['ArrowDown', 'ArrowUp']) { for (let i = 0; i < max; i++) { await press(page, k); if ((await focusId(page)) === id) return true; } } return false; }
const snap = (page) => page.evaluate(() => { const S = window.__echoes.save; let can = null; try { can = typeof S.canSave === 'function' ? S.canSave() : null; } catch (e) { can = String(e); } let alog = null; try { alog = typeof S.autosaveLog === 'function' ? S.autosaveLog().slice(-2) : null; } catch { /* */ } return { stack: window.__echoes.app.stack(), focus: (window.__echoes.app.focus() || {}).id ?? null, saves: S.list().map((m) => m.id), toast: ((document.querySelector('.ap-toast, [class*="toast"]') || {}).textContent || '').trim().slice(0, 80) || null, tick: window.__echoes.tick, phase: (window.__echoes.state().run || {}).phase, canSave: can, alog }; });
async function steerToPortal(page) { for (let i = 0; i < 40; i++) { const cs = await page.evaluate(() => { const c = window.__echoes.cmd('campState'); return { p: c.player, portal: c.portal, inPortal: c.inPortal }; }); if (cs.inPortal) return true; const dx = cs.portal.x - cs.p.x, dz = cs.portal.z + 0.55 - cs.p.z; const keys = []; if (Math.abs(dx) > 0.25) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.25) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break; const ms = Math.max(90, Math.min(500, (Math.hypot(dx, dz) / 2.2) * 1000)); for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); await sleep(160); } return page.evaluate(() => window.__echoes.cmd('campState').inPortal); }

const browser = await launchEchoes({ gpu: true });
let errors = [];
try {
  const o = await openEchoes(browser, `${base}/?menu=0&seed=7&fresh=1`); const page = o.page; errors = o.errors;
  await waitReady(page); await sleep(800);
  if (inRun) {
    await page.keyboard.down('w'); await sleep(500); await page.keyboard.up('w'); await sleep(300);
    const atPortal = await steerToPortal(page);
    let r1 = -1; for (let i = 0; i < 3 && r1 < 0; i++) { await press(page, 'e'); r1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.active&&r.room===1})()`, 12000, 20); }
    R.run = { atPortal, r1, ...(await snap(page)) }; console.log('run', JSON.stringify(R.run).slice(0, 300));
    await sleep(Number(arg('afterEntryMs', 1500)));
  }
  for (const [i, delay] of delays.entries()) {
    const slotId = `sv-slot-manual-${i + 1}`;
    await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`); await sleep(250);
    await navTo(page, 'pz-save'); await press(page, 'Enter');
    await waitFor(page, `window.__echoes.app.stack().includes('saves')`);
    const tOpen = Date.now();
    await sleep(delay);
    const before = await snap(page);
    const rect = await page.evaluate((id) => { const b = document.getElementById(id); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, hit: (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) || {}).id || null }; }, slotId);
    let after = null;
    if (rect && rect.w > 0) {
      if (inRun) { await page.mouse.move(rect.x - 250, rect.y + 150); await sleep(120); await page.mouse.move(rect.x, rect.y, { steps: 14 }); await sleep(350); } else { await page.mouse.move(rect.x, rect.y); await sleep(60); }
      await page.mouse.click(rect.x, rect.y);
      const tClick = Date.now();
      const slotKey = slotId.replace('sv-slot-', '');
      const grew = await waitFor(page, `window.__echoes.save.list().some((m) => m.id === ${JSON.stringify(slotKey)}) || window.__echoes.app.stack().includes('confirm')`, 6000, 25);
      const clog = await page.evaluate(() => { const S = window.__echoes.save; try { return typeof S.captureLog === 'function' ? S.captureLog().slice(-3) : null; } catch { return null; } });
      after = { grew, clickToSlotMs: grew >= 0 ? Date.now() - tClick : null, clog, ...(await snap(page)) };
    }
    const c = { slotId, delay, sinceOpenMs: Date.now() - tOpen, rect, before, after, ok: !!after && (after.saves.length > before.saves.length || after.stack.includes('confirm')) };
    R.cases.push(c); console.log(c.ok ? 'PASS' : 'FAIL', JSON.stringify(c));
    if (after && after.stack.includes('confirm')) { await press(page, 'Escape'); await sleep(200); }
    // close saves + pause
    for (let k = 0; k < 3; k++) { const st = await page.evaluate(() => window.__echoes.app.stack()); if (!st.length) break; await press(page, 'Escape'); await sleep(250); }
    await sleep(300);
  }
} catch (e) { R.error = String((e && e.stack) || e); console.error(R.error); }
R.pageErrors = errors;
writeFileSync(join(root, 'captures', `gntfixINT1-slotclick-${tag}.json`), JSON.stringify(R, null, 1));
console.log(`${R.cases.filter((c) => c.ok).length}/${R.cases.length} pageErrors ${errors.length}`);
await browser.close();
