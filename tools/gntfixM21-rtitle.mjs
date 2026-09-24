#!/usr/bin/env node
// fix-M2-r1 copy of the save r1 F2 refuter harness (tools/gntrsave1harness-title.mjs), outputs renamed to captures/gntfixM21-rtitle-*: title default focus after in-session Save & Quit, under varied conditions.
//   node tools/gntrsave1harness-title.mjs <scenario> [--gpu 1] [--mouse corner]
// Each scenario launches its OWN browser (run alone), keyboard-only real input via CDP.
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'captures');
mkdirSync(out, { recursive: true });
const scen = process.argv[2] || 'A';
const opt = { gpu: 1, w: 1600, h: 900 };
for (let i = 3; i < process.argv.length; i += 2) opt[process.argv[i].replace(/^--/, '')] = Number(process.argv[i + 1]) || process.argv[i + 1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { scen, opt, startedAt: new Date().toISOString(), log: [] };
const L = (tag, v) => { res.log.push({ tag, v }); console.log(`[${tag}] ${JSON.stringify(v).slice(0, 900)}`); };
const tagName = `${scen}${opt.mouse ? '-m' + opt.mouse : ''}${opt.gpu ? '' : '-nogpu'}`;

const browser = await launchEchoes({ gpu: !!opt.gpu, width: opt.w, height: opt.h });
let page, errors;
try {
  ({ page, errors } = await openEchoes(browser, `http://127.0.0.1:5199/?menu=1&fresh=1&seed=7`, { width: opt.w, height: opt.h }));
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); await sleep(60); };
  const waitFor = (fn, t = 30000) => page.waitForFunction(fn, { timeout: t, polling: 100 });
  const snap = () => ev(() => { const E = window.__echoes; const f = E.app.focus(); return { v: E.version, state: E.app.state, stack: E.app.stack(), focus: f && { id: f.id, label: f.label }, focusables: E.app.focusables().map((x) => x.id), saves: E.save ? E.save.list().map((m) => m.id) : null, tick: E.tick, active: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }; });
  const shot = (n) => page.screenshot({ path: join(out, `gntfixM21-rtitle-${n}.png`) });
  const gesture = async () => { for (let i = 0; i < 200; i++) { const st = await ev(() => window.__echoes.app && window.__echoes.app.state); if (st === 'title' || st === 'playing') return st; await page.keyboard.press('Space'); await sleep(300); } throw new Error('no title'); };
  const pauseTo = async (re) => { for (let i = 0; i < 10; i++) { const s = await snap(); if (re.test((s.focus && s.focus.label) || '')) return s; await key('ArrowDown'); await sleep(120); } return snap(); };
  const titleSeries = async (tag) => {
    await waitFor(() => window.__echoes.app.state === 'title', 20000);
    const series = [];
    const t0 = Date.now();
    for (const at of [50, 300, 700, 1200, 2500, 5000]) { while (Date.now() - t0 < at) await sleep(20); const s = await snap(); series.push({ at, focus: s.focus && s.focus.id, n: s.focusables.length }); }
    const s = await snap();
    L(tag, { series, final: s });
    return s;
  };
  const saveQuit = async (tag) => {
    await key('Escape'); await sleep(500);
    const p = await pauseTo(/save & quit/i); L(tag + '.pauseFocus', p.focus);
    await key('Enter'); await sleep(600);
    const c = await snap(); L(tag + '.confirm', { focus: c.focus, stack: c.stack, focusables: c.focusables });
    await key('ArrowLeft'); await sleep(200);
    const c2 = await snap(); L(tag + '.confirm2', c2.focus);
    await key('Enter');
  };
  const enterAndReport = async (tag) => {
    const before = await ev(() => ({ saves: window.__echoes.save.list().map((m) => ({ id: m.id, tick: m.tick, hash: m.hash })) }));
    await key('Enter');
    await waitFor(() => window.__echoes.app.state === 'playing' || window.__echoes.app.stack().some((s) => s !== 'title'), 20000); await sleep(900);
    const after = await ev(() => { const E = window.__echoes; const st = E.state(); return { state: E.app.state, stack: E.app.stack(), lastLoad: E.save.lastLoad(), tick: E.tick, room: st.run && st.run.room, phase: st.run && st.run.phase }; });
    L(tag, { before: before.saves.slice(0, 3), after });
    return after;
  };
  if (opt.mouse === 'corner') await page.mouse.move(opt.w - 5, opt.h - 5);

  await gesture(); await sleep(800);
  L('title.first', await snap());
  if (scen === 'A' || scen === 'B') {
    // A: critic path (New Game -> run combat -> Save & Quit). B: Save & Quit straight from camp (no run).
    await key('Enter'); await waitFor(() => window.__echoes.app.state === 'playing', 20000);
    await waitFor(() => window.__echoes.tick >= 240, 90000);
    if (scen === 'A') { await ev(() => window.__echoes.cmd('startRun', { act: 1 })); await waitFor(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 1; }, 20000); await sleep(1500); }
    else await sleep(1500);
    await saveQuit('sq1');
    await titleSeries('title.afterSaveQuit');
    await shot(`${tagName}-title-after-savequit`);
    await enterAndReport('title.afterSaveQuit.enter');
  } else if (scen === 'C') {
    // C: profile WITH a save at first title visit (seed via New Game + Save & Quit, then page reload), then Continue -> Save & Quit.
    await key('Enter'); await waitFor(() => window.__echoes.app.state === 'playing', 20000); await waitFor(() => window.__echoes.tick >= 240, 90000); await sleep(800);
    await saveQuit('sq0'); await titleSeries('title.sq0');
    await page.goto('http://127.0.0.1:5199/?menu=1&seed=7', { waitUntil: 'domcontentloaded' });
    await waitFor(() => !!window.__echoes && window.__echoes.tick >= 0, 60000); await gesture(); await sleep(1000);
    L('title.reload', await snap());
    await enterAndReport('title.reload.enter');
    await sleep(1000);
    await saveQuit('sq1'); await titleSeries('title.afterContinueSaveQuit'); await shot(`${tagName}-title-after-continue-savequit`);
    for (let i = 0; i < 6; i++) { const s = await snap(); if (s.focus && s.focus.id === 'ap-title-new') break; await key('ArrowDown'); await sleep(120); }
    L('title.chooseNew', (await snap()).focus);
    await key('Enter'); await sleep(700);
    const c = await snap(); L('newgame.after', { state: c.state, stack: c.stack, focus: c.focus });
    if (c.state !== 'playing') { await key('Enter'); await sleep(700); }
    await waitFor(() => window.__echoes.app.state === 'playing', 20000); await sleep(1500);
    await saveQuit('sq2'); await titleSeries('title.afterNewGameSaveQuit'); await shot(`${tagName}-title-after-newgame-savequit`);
  } else if (scen === 'E') {
    // E: consequence of the accidental Enter: does the fresh game's autosave rotation evict the save Continue offered?
    await key('Enter'); await waitFor(() => window.__echoes.app.state === 'playing', 20000); await waitFor(() => window.__echoes.tick >= 240, 90000);
    await ev(() => window.__echoes.cmd('startRun', { act: 1 })); await waitFor(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 1; }, 20000); await sleep(1500);
    await saveQuit('sq1');
    await waitFor(() => window.__echoes.app.state === 'title', 20000); await sleep(1500);
    const cont = await ev(() => { const E = window.__echoes; const l = E.save.list(); return { focus: E.app.focus().id, contLabel: (E.app.focusables().find((f) => f.id === 'ap-title-continue') || {}).label, list: l.map((m) => ({ id: m.id, hash: m.hash, room: m.room, savedAt: m.savedAt })) }; });
    L('title.withContinue', cont);
    const newest = cont.list.slice().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0];
    L('continueTarget', newest);
    await key('Enter'); await waitFor(() => window.__echoes.app.state === 'playing', 20000); await sleep(1500);
    L('afterEnter', await ev(() => ({ lastLoad: window.__echoes.save.lastLoad(), tick: window.__echoes.tick, run: window.__echoes.state().run.phase })));
    await waitFor(() => window.__echoes.tick >= 240, 90000);
    await ev(() => window.__echoes.cmd('startRun', { act: 1 })); await waitFor(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 1; }, 20000); await sleep(2500);
    for (let r = 2; r <= 4; r++) { await ev((n) => window.__echoes.cmd('skipToRoom', n), r); await sleep(3000); const l = await ev(() => window.__echoes.save.list().map((m) => ({ id: m.id, hash: m.hash, room: m.room }))); L('rotation.room' + r, { list: l, survives: l.some((m) => m.hash === newest.hash) }); }
  } else if (scen === 'D') {
    // D: Quit to Title WITHOUT saving (autosave exists from room entry) -> title focus
    await key('Enter'); await waitFor(() => window.__echoes.app.state === 'playing', 20000); await waitFor(() => window.__echoes.tick >= 240, 90000);
    await ev(() => window.__echoes.cmd('startRun', { act: 1 })); await waitFor(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.room === 1; }, 20000); await sleep(1500);
    L('saves.beforeQuit', await ev(() => window.__echoes.save.list().map((m) => m.id)));
    await key('Escape'); await sleep(500);
    await pauseTo(/^quit to title/i);
    await key('Enter'); await sleep(600);
    const c = await snap(); L('quit.confirm', { focus: c.focus, focusables: c.focusables });
    await key('ArrowLeft'); await sleep(200); await key('Enter');
    await titleSeries('title.afterQuit'); await shot(`${tagName}-title-after-quit`);
  }
  res.pageErrors = errors.slice();
} catch (e) {
  res.exception = String((e && e.stack) || e); console.log('EXC', res.exception);
} finally {
  try { await browser.close(); } catch {}
}
writeFileSync(join(out, `gntfixM21-rtitle-${tagName}.json`), JSON.stringify(res, null, 1));
console.log('[DONE]', tagName, res.exception ? 'EXC' : 'ok', 'pageErrors', (res.pageErrors || []).length);
