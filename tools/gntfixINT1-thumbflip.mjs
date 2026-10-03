#!/usr/bin/env node
// Journey critic: does a slot's ordering timestamp change AFTER the save (e.g. when its off-thread
// thumbnail lands), so that an OLDER autosave can climb above a NEWER manual save? Save manually
// right after the room-1 autosave, then watch save.list() order / savedAt / thumbnails for 8 s.
//   node tools/gntfixINT1-thumbflip.mjs [--url http://127.0.0.1:5199] [--tag dev] [--delay 300]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:5199');
const tag = arg('tag', 'dev');
const delay = Number(arg('delay', 300));
const load = Number(arg('load', 0)); // extra game pages opened first to starve the CPU/GPU (the journey ran under 22 chrome.exe)
const outPath = arg('out', `captures/gntfixINT1-thumbflip-${tag}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(root, 'captures'), { recursive: true });
const checks = []; let failures = 0;
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ''}`); }
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
async function press(page, key, times = 1, gap = 110) { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(gap); } }
async function navTo(page, id, max = 24) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowDown'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowUp'); if ((await focusOf(page)) === id) return true; } return false; }
async function waitFor(page, body, { timeout = 20000, every = 100 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
const snapList = (page) => page.evaluate(() => window.__echoes.save.list().map((x) => ({ id: x.id, tick: x.meta && x.meta.tick, room: x.meta && x.meta.room, savedAt: x.savedAt || (x.meta && x.meta.savedAt) || null, thumb: !!(x.thumb || x.thumbnail || (x.meta && (x.meta.thumb || x.meta.thumbnail))), keys: Object.keys(x).join(',') })));
async function steerToPortal(page) { for (let i = 0; i < 40; i++) { const cs = await page.evaluate(() => { const c = window.__echoes.cmd('campState'); return { p: c.player, portal: c.portal, inPortal: c.inPortal }; }); if (cs.inPortal) return true; const dx = cs.portal.x - cs.p.x, dz = cs.portal.z + 0.55 - cs.p.z; const keys = []; if (Math.abs(dx) > 0.25) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.25) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break; const ms = Math.max(90, Math.min(500, (Math.hypot(dx, dz) / 2.2) * 1000)); for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); await sleep(160); } return page.evaluate(() => window.__echoes.cmd('campState').inPortal); }

const browser = await launchEchoes({ gpu: true });
const result = { schema: 'gntfixINT1-thumbflip/1', at: new Date().toISOString(), base, tag, delay };
try {
  const loadPages = [];
  for (let i = 0; i < load; i++) { const o = await openEchoes(browser, `${base}/?menu=0&seed=${11 + i}`); loadPages.push(o.page); }
  if (load) { await sleep(4000); for (const lp of loadPages) { await lp.keyboard.down('w'); } }
  const { page, errors } = await openEchoes(browser, `${base}/?menu=0&seed=7&fresh=1`);
  await waitReady(page); await sleep(800);
  await page.keyboard.down('w'); await sleep(500); await page.keyboard.up('w'); await sleep(500);
  const atPortal = await steerToPortal(page); await press(page, 'e');
  const r1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.phase==='combat'&&r.room===1})()`, { timeout: 20000, every: 20 });
  check('T0 room 1 reached', atPortal && r1 >= 0);
  const autoT = await waitFor(page, `window.__echoes.save.list().some(x=>/auto/.test(x.id))`, { timeout: 150, every: 20 }); // do NOT wait for the autosave write (the journey saved before it landed)
  const listA = await snapList(page);
  await sleep(delay);
  // Manual save as fast as real keys allow.
  await press(page, 'Escape', 1, 60); await waitFor(page, `window.__echoes.app.stack().includes('pause')`, { timeout: 4000, every: 20 });
  await navTo(page, 'pz-save'); await press(page, 'Enter', 1, 60); await waitFor(page, `window.__echoes.app.stack().includes('saves')`, { timeout: 4000, every: 20 }); await sleep(150);
  await navTo(page, 'sv-slot-manual-1', 12); await press(page, 'Enter', 1, 60); await sleep(150);
  for (let i = 0; i < 3; i++) { const st = await page.evaluate(() => window.__echoes.app.stack()); if (st.includes('confirm')) { await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter'); await sleep(200); } else if (st.includes('sv-rename')) { await press(page, 'Enter'); await sleep(200); } else break; }
  const manualT = await waitFor(page, `window.__echoes.save.list().some(x=>x.id==='manual-1')`, { timeout: 8000, every: 20 });
  const timeline = []; const t0 = Date.now();
  while (Date.now() - t0 < 12000) { const l = await snapList(page); timeline.push({ t: Date.now() - t0, order: l.map((x) => x.id), savedAt: Object.fromEntries(l.map((x) => [x.id, x.savedAt])), thumbs: Object.fromEntries(l.map((x) => [x.id, x.thumb])), ticks: Object.fromEntries(l.map((x) => [x.id, x.tick])), rooms: Object.fromEntries(l.map((x) => [x.id, x.room])) }); await sleep(200); }
  const first = timeline[0]; const last = timeline[timeline.length - 1];
  const autoAppearedAt = (timeline.find((s) => s.order.includes('auto-1')) || {}).t ?? null; const manualAppearedAt = (timeline.find((s) => s.order.includes('manual-1')) || {}).t ?? null;
  const autoStampChanged = timeline.some((s) => s.savedAt['auto-1'] !== undefined && first.savedAt['auto-1'] !== undefined && s.savedAt['auto-1'] !== first.savedAt['auto-1']);
  const manualStampChanged = timeline.some((s) => s.savedAt['manual-1'] !== first.savedAt['manual-1']);
  const orderFlipped = timeline.some((s) => s.order[0] !== 'manual-1');
  result.listA = listA; result.autoT = autoT; result.manualT = manualT; result.timeline = timeline.filter((_, i) => i % 5 === 0 || i === timeline.length - 1); result.keys = listA[0] && listA[0].keys;
  check('T1 the manual save stays FIRST (newest by content) and no slot is re-stamped afterwards', last.order[0] === 'manual-1' && !orderFlipped && !autoStampChanged && !manualStampChanged, { load, autoT, manualT, autoAppearedAt, manualAppearedAt, firstOrder: first.order, lastOrder: last.order, firstStamps: first.savedAt, lastStamps: last.savedAt, lastTicks: last.ticks, lastRooms: last.rooms, thumbsFirst: first.thumbs, thumbsLast: last.thumbs, autoStampChanged, manualStampChanged, orderFlipped, flipAt: (timeline.find((s) => s.order[0] !== 'manual-1') || {}).t ?? null });
  const cont = await page.evaluate(() => { const l = window.__echoes.save.list(); return l[0] && l[0].id; });
  console.log('list[0] now:', cont);
  check('Z 0 page errors', errors.length === 0, errors.slice(0, 5));
} catch (e) { console.error('[HARNESS-ERROR]', (e && e.stack) || e); result.harnessError = String((e && e.message) || e); failures += 1; }
finally { await browser.close(); }
result.failures = failures; result.checks = checks;
writeFileSync(join(root, outPath), JSON.stringify(result, null, 1));
console.log(`\n${checks.length - failures}/${checks.length} checks passed -> ${outPath}`);
process.exit(result.harnessError ? 1 : 0);
