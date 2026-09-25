#!/usr/bin/env node
// Refuter (spec lens) for J3: does Continue / save.list()[0] pick an autosave whose STATE is older
// than a later manual save, because the autosave's write lands late? Real-input journey:
// room 1 (autosave safe point) -> room 2 within the 20 s throttle -> pause -> Save -> Slot 1 ->
// Quit to Title -> read Continue caption -> Continue -> where are we?
// Load profiles: --cpu R (CDP CPU throttling on the game page, a low-end-laptop proxy) and/or
// --load N (N extra game pages, the critic's method). --room2 0 saves in room 1 right after entry.
//   node tools/gntfixINT1-j3order.mjs [--url u] [--tag t] [--cpu 1] [--load 0] [--room2 1] [--delay 0]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:5199');
const tag = arg('tag', 'dev');
const cpu = Number(arg('cpu', 1));
const load = Number(arg('load', 0));
const room2 = Number(arg('room2', 1));
const delay = Number(arg('delay', 0));
const f5 = Number(arg('f5', 0));
const out = join(root, 'captures', `gntfixINT1-j3order-${tag}.json`);
mkdirSync(join(root, 'captures'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = { schema: 'gntfixINT1-j3order/1', at: new Date().toISOString(), base, tag, cpu, load, room2, delay, steps: [] };
const log = (name, data) => { R.steps.push({ name, t: Date.now(), ...data }); console.log(name, JSON.stringify(data)); };
async function waitFor(page, body, timeout = 20000, every = 50) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; await sleep(every); } return -1; }
async function press(page, key, n = 1, gap = 120) { for (let i = 0; i < n; i++) { await page.keyboard.press(key); await sleep(gap); } }
const focusId = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
async function navTo(page, id, max = 14) { if ((await focusId(page)) === id) return true; for (const k of ['ArrowDown', 'ArrowUp']) { for (let i = 0; i < max; i++) { await press(page, k); if ((await focusId(page)) === id) return true; } } return false; }
const live = (page) => page.evaluate(() => { const s = window.__echoes.state(); const r = s.run; return { version: window.__echoes.version, tick: window.__echoes.tick, room: r.room, phase: r.phase, wallet: r.wallet, skills: (s.skills || []).map((k) => k && k.id), active: r.active }; });
const slots = (page) => page.evaluate(() => window.__echoes.save.list().map((x) => ({ id: x.id, kind: x.kind, tick: x.meta && x.meta.tick, room: x.meta && x.meta.room, wallet: x.meta && x.meta.wallet, skills: x.meta && x.meta.skills && x.meta.skills.length, playtimeSec: x.meta && x.meta.playtimeSec, createdAt: x.createdAt || null, savedAt: x.savedAt || (x.meta && x.meta.savedAt) || null })));
const latest = (page) => page.evaluate(() => { try { const l = window.__echoes.save.latest ? window.__echoes.save.latest() : null; return l ? { id: l.id, tick: l.meta && l.meta.tick, room: l.meta && l.meta.room } : null; } catch (e) { return String(e); } });
async function steerToPortal(page) { for (let i = 0; i < 40; i++) { const cs = await page.evaluate(() => { const c = window.__echoes.cmd('campState'); return { p: c.player, portal: c.portal, inPortal: c.inPortal }; }); if (cs.inPortal) return true; const dx = cs.portal.x - cs.p.x, dz = cs.portal.z + 0.55 - cs.p.z; const keys = []; if (Math.abs(dx) > 0.25) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.25) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break; const ms = Math.max(90, Math.min(500, (Math.hypot(dx, dz) / 2.2) * 1000)); for (const k of keys) await page.keyboard.down(k); await sleep(ms); for (const k of keys) await page.keyboard.up(k); await sleep(160); } return page.evaluate(() => window.__echoes.cmd('campState').inPortal); }
async function shot(page, name) { try { await page.screenshot({ path: join(root, 'captures', `${name}.png`) }); } catch (e) { log('shot-fail', { name, e: String(e) }); } }

const browser = await launchEchoes({ gpu: true });
let errors = [];
try {
  for (let i = 0; i < load; i++) { const o = await openEchoes(browser, `${base}/?menu=0&seed=${21 + i}`); await o.page.keyboard.down('w'); }
  const o = await openEchoes(browser, `${base}/?menu=0&seed=7&fresh=1`); const page = o.page; errors = o.errors;
  await waitReady(page); await sleep(800);
  if (cpu > 1) { const cdp = await page.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); log('cpu throttle', { rate: cpu }); }
  log('A0 boot', { live: await live(page), slots: await slots(page) });
  await page.keyboard.down('w'); await sleep(500); await page.keyboard.up('w'); await sleep(400);
  const atPortal = await steerToPortal(page);
  let r1 = -1; for (let i = 0; i < 3 && r1 < 0; i++) { await press(page, 'e'); r1 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.active&&r.room===1})()`, 12000, 20); }
  const tRoom1 = Date.now();
  const room1 = await live(page);
  log('A1 room 1 entered', { atPortal, r1, room1 });
  // Watch (without pausing) when the room-1 autosave shows up in save.list() while the player keeps playing.
  let autoSeenMs = -1;
  const watch = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (autoSeenMs < 0 && (await page.evaluate(() => window.__echoes.save.list().some((x) => /auto/.test(x.id))))) { autoSeenMs = Date.now() - tRoom1; log('A2 autosave visible in list', { msAfterRoomEnter: autoSeenMs, slots: await slots(page), live: await live(page) }); } await sleep(50); } };
  if (room2) {
    await page.keyboard.down('d'); await watch(700); await page.keyboard.up('d');
    await page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
    await waitFor(page, `window.__echoes.state().run.phase==='reward'`, 15000); await waitFor(page, `window.__echoes.runUi().settled===true`, 8000);
    await press(page, 'Enter'); await watch(900);
    if (await page.evaluate(() => !!(window.__echoes.content && window.__echoes.content.socketUi && window.__echoes.content.socketUi().open))) { await press(page, 'Escape'); await sleep(400); }
    await waitFor(page, `(window.__echoes.runUi()||{}).screen==='path'`, 8000); await waitFor(page, `window.__echoes.runUi().settled===true`, 8000);
    await press(page, 'Enter');
    const r2 = await waitFor(page, `(()=>{const r=window.__echoes.state().run;return r.phase==='combat'&&r.room===2})()`, 20000, 20);
    log('A3 room 2', { r2, msAfterRoom1: Date.now() - tRoom1, live: await live(page), slots: await slots(page), autoSeenMs });
    await page.keyboard.down('a'); await watch(1500); await page.keyboard.up('a');
  } else if (delay) await watch(delay);
  if (f5) {
    const atSave = await live(page);
    await press(page, 'F5', 1, 60);
    const qMs = await waitFor(page, `window.__echoes.save.list().some(x=>x.id==='quick')`, 15000, 20);
    log('Q1 F5 quicksave', { atSave, qMs, msAfterRoom1: Date.now() - tRoom1, slots: await slots(page) });
    const tl = []; const t0 = Date.now();
    await page.keyboard.down('d');
    while (Date.now() - t0 < 12000) { const l = await slots(page); tl.push({ t: Date.now() - t0, order: l.map((x) => `${x.id}@tick${x.tick}/${x.savedAt}`) }); await sleep(300); }
    await page.keyboard.up('d');
    const after = await slots(page);
    log('Q2 after F5 + 12 s play', { after, flipped: !!after[0] && after[0].id !== 'quick', orderTimeline: tl.filter((_, i) => i % 5 === 0 || i === tl.length - 1), live: await live(page) });
    await shot(page, `gntfixINT1-j3order-${tag}-Q2-play`);
    await press(page, 'Escape', 1, 60); await waitFor(page, `window.__echoes.app.stack().includes('pause')`, 5000, 20); await sleep(300);
    await navTo(page, 'pz-quit'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('confirm')`, 5000); await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter');
    await waitFor(page, `window.__echoes.app.state==='title'`, 20000); await sleep(1200);
    const title = await page.evaluate(() => ({ focus: (window.__echoes.app.focus() || {}).id, cont: (document.getElementById('ap-title-continue') || {}).textContent?.replace(/\s+/g, ' ').trim() || null }));
    log('Q3 title', { title, slots: await slots(page) });
    await shot(page, `gntfixINT1-j3order-${tag}-Q3-title`);
    await navTo(page, 'ap-title-continue'); await press(page, 'Enter');
    await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.state().run.active`, 20000); await sleep(600);
    const q = after.find((s) => s.id === 'quick');
    log('Q4 after Continue', { cont: await live(page), quickTick: q && q.tick, atSave });
    throw new Error('f5 branch done');
  }
  // Manual save from pause.
  await press(page, 'Escape', 1, 60); await waitFor(page, `window.__echoes.app.stack().includes('pause')`, 5000, 20);
  const atSave = await live(page);
  log('A4 paused for manual save', { atSave, msAfterRoom1: Date.now() - tRoom1, slots: await slots(page), autoSeenMs });
  await navTo(page, 'pz-save'); await press(page, 'Enter', 1, 60); await waitFor(page, `window.__echoes.app.stack().includes('saves')`, 5000, 20); await sleep(150);
  await navTo(page, 'sv-slot-manual-1', 12); await press(page, 'Enter', 1, 60); await sleep(150);
  for (let i = 0; i < 3; i++) { const st = await page.evaluate(() => window.__echoes.app.stack()); if (st.includes('confirm')) { await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter'); await sleep(200); } else if (st.includes('sv-rename')) { await press(page, 'Enter'); await sleep(200); } else break; }
  const manualMs = await waitFor(page, `window.__echoes.save.list().some(x=>x.id==='manual-1')`, 10000, 20);
  const tl = []; const t0 = Date.now();
  while (Date.now() - t0 < 6000) { const l = await slots(page); tl.push({ t: Date.now() - t0, order: l.map((x) => `${x.id}@tick${x.tick}/room${x.room}`) }); await sleep(250); }
  const after = await slots(page);
  log('A5 after manual save', { manualMs, after, latest: await latest(page), orderTimeline: tl.filter((_, i) => i % 4 === 0 || i === tl.length - 1), autoSeenMs });
  await shot(page, `gntfixINT1-j3order-${tag}-A5-saves`);
  // Back to pause, Quit to Title.
  for (let i = 0; i < 3; i++) { const st = await page.evaluate(() => window.__echoes.app.stack()); if (st.includes('saves')) { await press(page, 'Escape'); await sleep(300); } else break; }
  await navTo(page, 'pz-quit'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('confirm')`, 5000); await navTo(page, 'ap-confirm-ok', 6); await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, 20000); await sleep(1200);
  const title = await page.evaluate(() => ({ focus: (window.__echoes.app.focus() || {}).id, cont: (document.getElementById('ap-title-continue') || {}).textContent?.replace(/\s+/g, ' ').trim() || null }));
  log('A6 title', { title, slots: await slots(page), latest: await latest(page) });
  await shot(page, `gntfixINT1-j3order-${tag}-A6-title`);
  await navTo(page, 'ap-title-continue'); await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.state().run.active`, 20000); await sleep(600);
  const cont = await live(page);
  const manual = after.find((s) => s.id === 'manual-1');
  log('A7 after Continue', { cont, atSave, manual, resumedManual: !!manual && cont.room === manual.room && cont.wallet === manual.wallet, lostRooms: (atSave.room || 0) - (cont.room || 0), lostWallet: (atSave.wallet || 0) - (cont.wallet || 0) });
  await shot(page, `gntfixINT1-j3order-${tag}-A7-continued`);
} catch (e) { log('EXCEPTION', { e: String((e && e.stack) || e) }); }
R.pageErrors = errors;
writeFileSync(out, JSON.stringify(R, null, 1));
console.log('pageErrors', errors.length, '->', out);
await browser.close();
