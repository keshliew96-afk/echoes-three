#!/usr/bin/env node
// fix-INT-r4 J4-F2: a safe point inside the 20 s autosave window is HELD, never dropped, and every way a page can
// end or switch writes it. Debug-driven legs (fresh profile each, ?fresh=1&seed=7&menu=0, GPU harness):
//   A1 deferral: room 2 entered 3 s after the room-1 autosave is held (captureTick === eventTick) and written when
//      the window ends, with its picture; frames during that write <= 50 ms (G2.7)
//   A2 hidden: the game tab goes to the background (another tab in front) -> written synchronously at once
//   A3 pagehide: a pagehide event -> written synchronously (the real tab close is the critic's closeloss probe)
//   A4 pause: Esc opens the pause menu -> the held capture is written at once (Save / Load list it)
//   A5 Save & Quit supersedes a held capture: nothing older lands after the quit save
//   A6 Load of the slot the held capture would overwrite: that slot loads exactly as saved (the capture is dropped)
//   A7 New Game with a held capture: the old game's safe point is written before the new game starts
//   A8 the M2 G2.7 sequence (tools/gntM2-sc-autosave.mjs drive): >= 4 writes, every capture on its event tick, the
//      throttle still spaces writes (room_enter / return_to_camp deferred, not dropped), shop / run end / quit written
//   A9 0 page errors
//   node tools/gntfixINT4-autosave.mjs [--url http://127.0.0.1:4310] [--tag x] [--only A1,A2]
import { writeFileSync } from 'fs';
import { launchEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const tag = arg('tag', 'x');
const only = arg('only', null); const want = (id) => !only || only.split(',').includes(id);
const sleep = (t) => new Promise((r) => setTimeout(r, t));
const checks = []; let fails = 0; const errorsAll = [];
const check = (n, ok, d) => { checks.push({ n, ok: !!ok, d }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${String(JSON.stringify(d ?? null)).slice(0, 700)}`); };
async function waitFor(page, fn, arg0, timeout = 30000, every = 50) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(fn, arg0)) return Date.now() - t0; } catch { /* */ } await sleep(every); } return -1; }
const autos = (page) => page.evaluate(() => window.__echoes.save.list().filter((m) => m.kind === 'auto' && m.status === 'ok').map((m) => ({ id: m.id, room: m.meta.room, level: m.meta.level ?? m.meta.act, phase: m.meta.phase, tick: m.meta.tick, savedAt: m.savedAt, thumb: !!m.thumb })));
const alog = (page) => page.evaluate(() => window.__echoes.save.autosaveLog());
async function boot(ctx, extra = '') {
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => { errors.push(String(e && e.message ? e.message : e)); errorsAll.push(String(e)); });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${base}/?fresh=1&seed=7&menu=0${extra}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 240 && window.__echoes.save && window.__echoes.state().gl.warmupPending === 0, { timeout: 180000 });
  await page.evaluate(() => { window.__fr = []; let last = performance.now(); const f = (t) => { window.__fr.push([Math.round(t), +(t - last).toFixed(1)]); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  return { page, errors };
}
// start a run and wait for the room-1 autosave to land; then enter room 2 `gapMs` later
async function toRoom2Held(page, gapMs = 3000) {
  await page.evaluate(() => window.__echoes.cmd('startRun'));
  await waitFor(page, () => window.__echoes.save.autosaveLog().some((r) => r.ok && /room_enter/.test(r.reason)), null, 20000);
  await sleep(gapMs);
  const at = await page.evaluate(() => { window.__echoes.cmd('skipToRoom', 2); return { t: performance.now(), tick: window.__echoes.tick }; });
  await waitFor(page, () => !!window.__echoes.save.autosaveHeld(), null, 3000);
  const held = await page.evaluate(() => window.__echoes.save.autosaveHeld());
  return { at, held };
}
const out = { schema: 'gntfixINT4-autosave/1', at: new Date().toISOString(), base, tag, checks };
const browser = await launchEchoes({ gpu: true });
try {
  if (want('A1')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx);
    const { at, held } = await toRoom2Held(page);
    const L0 = await alog(page);
    const deferRec = L0.find((r) => r.deferred && /room_enter/.test(r.reason));
    const ms = await waitFor(page, () => window.__echoes.save.list().some((m) => m.kind === 'auto' && m.meta && m.meta.room === 2), null, 26000, 100);
    await sleep(1500);
    const L = await alog(page); const w = L.filter((r) => r.ok === true && /room_enter/.test(r.reason) && r.captureTick !== undefined);
    const w2 = w[w.length - 1];
    const S = await autos(page);
    const fr = await page.evaluate(() => window.__fr);
    const win = w2 ? fr.filter(([t]) => t >= w2.startedAt + (w2.calmMs || 0) && t <= w2.at + 30).map(([, d]) => d) : [];
    const slot2 = S.find((x) => x.room === 2);
    check('A1 room 2 entered inside the window is HELD (captured on its event tick), then written when the window ends with its picture', held && held.captureTick === held.eventTick && deferRec && ms > 0 && w2 && w2.captureTick === w2.eventTick && slot2 && slot2.thumb, { held, deferRec, writtenAfterMs: ms, write: w2 && { reason: w2.reason, eventTick: w2.eventTick, captureTick: w2.captureTick, slot: w2.slot, calmMs: w2.calmMs, pieces: w2.pieces }, slots: S });
    check('A1b no frame > 50 ms while the held capture is written (G2.7)', win.length > 0 && Math.max(...win) <= 50, { frames: win.length, max: win.length ? Math.max(...win) : null });
    await ctx.close();
  }
  if (want('A2')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx);
    const { held } = await toRoom2Held(page);
    const other = await ctx.newPage(); await other.goto('about:blank'); await other.bringToFront();
    const vis = await waitFor(page, () => document.visibilityState === 'hidden', null, 3000);
    await sleep(200);
    const S = await autos(page); const L = await alog(page);
    const sync = L.find((r) => r.sync === 'hidden');
    check('A2 the tab going to the background writes the held capture at once (synchronously)', held && vis >= 0 && sync && sync.ok && S.some((x) => x.room === 2), { visibilityHiddenAfterMs: vis, sync, slots: S });
    await other.close(); await ctx.close();
  }
  if (want('A3')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx);
    const { held } = await toRoom2Held(page);
    const r = await page.evaluate(() => { const t0 = performance.now(); window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); return { ms: +(performance.now() - t0).toFixed(1), rooms: window.__echoes.save.list().filter((m) => m.kind === 'auto').map((m) => m.meta.room) }; });
    const L = await alog(page); const sync = L.find((r2) => r2.sync === 'pagehide');
    check('A3 pagehide writes the held capture before the handler returns', held && r.rooms.includes(2) && sync && sync.ok, { handlerMs: r.ms, rooms: r.rooms, sync: sync && { slot: sync.slot, syncMs: sync.syncMs, captureTick: sync.captureTick, eventTick: sync.eventTick } });
    await ctx.close();
  }
  if (want('A4')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx);
    const { held } = await toRoom2Held(page);
    await page.keyboard.press('Escape');
    const ms = await waitFor(page, () => window.__echoes.save.list().some((m) => m.kind === 'auto' && m.meta && m.meta.room === 2), null, 5000, 50);
    const st = await page.evaluate(() => ({ stack: window.__echoes.app.stack(), paused: window.__echoes.app.simPaused ? window.__echoes.app.simPaused() : null }));
    check('A4 opening the pause menu writes the held capture at once (Save / Load list it)', held && ms >= 0 && ms < 2500 && st.stack.includes('pause'), { writtenAfterMs: ms, st });
    await ctx.close();
  }
  if (want('A5')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx);
    const { held } = await toRoom2Held(page);
    const q = await page.evaluate(async () => { const r = await window.__echoes.save.autosave('quit'); return { ok: r.ok, slot: r.meta && r.meta.id, tick: r.meta && r.meta.meta && r.meta.meta.tick, savedAt: r.meta && r.meta.savedAt }; });
    await sleep(21000);
    const S = await autos(page); const L = await alog(page);
    const newest = [...S].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0];
    const late = L.filter((r) => r.ok && /room_enter/.test(r.reason) && r.captureTick === held.captureTick);
    check('A5 Save & Quit supersedes a held capture: the quit save stays the newest, the older capture never lands after it', held && q.ok && newest && newest.tick === q.tick && late.length === 0 && L.some((r) => r.skipped === 'superseded:quit'), { held, quit: q, slots: S, lateWrites: late.length });
    await ctx.close();
  }
  if (want('A6')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx);
    await page.evaluate(() => window.__echoes.cmd('startRun'));
    await waitFor(page, () => window.__echoes.save.autosaveLog().some((r) => r.ok && /room_enter/.test(r.reason)), null, 20000);
    await page.evaluate(() => { window.__echoes.save.resetAutosaveThrottle(); window.__echoes.cmd('skipToRoom', 2); });
    await waitFor(page, () => window.__echoes.save.list().some((m) => m.kind === 'auto' && m.meta && m.meta.room === 2), null, 20000);
    await sleep(800);
    await page.evaluate(() => window.__echoes.cmd('skipToRoom', 3));
    await waitFor(page, () => !!window.__echoes.save.autosaveHeld(), null, 3000);
    const held = await page.evaluate(() => window.__echoes.save.autosaveHeld());
    const before = await autos(page);
    const target = before.find((x) => x.room === 1);
    const r = await page.evaluate(async (id) => { const x = await window.__echoes.save.load(id); return { ok: x.ok, room: window.__echoes.state().run.room }; }, target && target.id);
    await sleep(500);
    const after = await autos(page); const L = await alog(page);
    check('A6 loading the slot a held capture would overwrite loads it exactly as saved (the capture is dropped, the other slot kept)', held && target && r.ok && r.room === 1 && after.find((x) => x.id === target.id).room === 1 && after.some((x) => x.room === 2) && L.some((x) => /^avoid:load/.test(String(x.skipped))), { held, before, load: r, after });
    await ctx.close();
  }
  if (want('A7')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx);
    const { held } = await toRoom2Held(page);
    const r = await page.evaluate(() => { const x = window.__echoes.save.resetToFresh({ seed: 99 }); return { ok: x.ok, rooms: window.__echoes.save.list().filter((m) => m.kind === 'auto').map((m) => m.meta.room), run: window.__echoes.state().run.active }; });
    const L = await alog(page);
    check('A7 New Game with a held capture writes the old game\'s safe point first', held && r.ok && r.rooms.includes(2) && L.some((x) => x.sync === 'new_game' && x.ok), { held, r });
    await ctx.close();
  }
  if (want('A8')) {
    const ctx = await browser.createBrowserContext(); const { page } = await boot(ctx, '');
    await page.evaluate(() => { window.__gntM2ev = []; for (const t of ['run_start', 'room_enter', 'shop_open', 'run_end', 'return_to_camp']) window.__echoes.on(t, (e) => window.__gntM2ev.push({ type: t, tick: e.tick })); });
    await page.evaluate(() => window.__echoes.cmd('startRun', { act: 1 })); await sleep(3000);
    await page.evaluate(() => window.__echoes.cmd('skipToRoom', 2)); await sleep(2500);
    await page.evaluate(() => window.__echoes.save.resetAutosaveThrottle());
    await page.evaluate(() => window.__echoes.cmd('skipToRoom', 7)); await sleep(3000);
    await page.evaluate(() => window.__echoes.save.resetAutosaveThrottle());
    await page.evaluate(() => window.__echoes.cmd('shopAdvance'));
    await waitFor(page, () => window.__echoes.state().run.room === 8 && window.__echoes.state().run.phase === 'combat', null, 10000);
    await sleep(3000);
    await page.evaluate(() => window.__echoes.cmd('endRun', 'victory')); await sleep(2500);
    await page.evaluate(() => window.__echoes.cmd('returnToCamp')); await sleep(2500);
    const quit = await page.evaluate(async () => { const r = await window.__echoes.save.autosave('quit'); return { ok: r.ok }; });
    await sleep(600);
    const L = await alog(page); const S = await autos(page);
    const SAFE = new Set(['room_enter', 'shop_open', 'run_end', 'return_to_camp', 'quit']);
    const written = L.filter((r) => r.ok === true);
    const bad = written.filter((r) => !r.reason.split('+').every((x) => SAFE.has(x)) || r.captureTick !== r.eventTick);
    const skipped = L.filter((r) => r.skipped);
    const ok = written.length >= 4 && bad.length === 0 && skipped.some((s) => s.skipped === 'throttle' && s.deferred && s.reason === 'room_enter') && skipped.some((s) => s.skipped === 'throttle' && s.deferred && s.reason === 'return_to_camp') && written.some((r) => r.reason.includes('shop_open')) && written.some((r) => r.reason === 'run_end') && quit.ok && S.length === 2;
    check('A8 the M2 G2.7 sequence: >= 4 writes all on their event tick, the window still spaces writes (deferred, not dropped), shop / run end / quit written, 2 auto slots', ok, { written: written.map((r) => `${r.reason}@${r.eventTick}/${r.captureTick}${r.sync ? ':' + r.sync : ''}`), bad, skipped: skipped.map((s) => `${s.reason}:${s.skipped}${s.deferred ? '(deferred)' : ''}`), quit, slots: S });
    await ctx.close();
  }
  check('A9 0 page errors', errorsAll.length === 0, errorsAll.slice(0, 5));
} catch (e) { out.harnessError = String((e && e.stack) || e); console.error(e); fails++; }
finally { await browser.close(); }
out.fails = fails;
writeFileSync(`captures/gntfixINT4-autosave-${tag}.json`, JSON.stringify(out, null, 1));
console.log(`${checks.length - checks.filter((c) => !c.ok).length}/${checks.length}`);
process.exit(fails ? 1 : 0);
