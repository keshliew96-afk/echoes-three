#!/usr/bin/env node
// fix-INT-r3 J3-F3 probe: does a Save & Quit run survive a New Game / a Load?
//   node tools/gntfixINT3-newgame.mjs <baseUrl> <tag> [--legs critic,two,load,rotate,fresh] [--real 0|1]
// Setup by debug commands where labelled (startCampaign / skipToRoom); every
// decision the fix is about (Save & Quit, New Game, the confirm, Load) is made
// by REAL keys. `--real 1` waits the real 20 s autosave throttle between rooms
// (like the critic's tool: 32 s); default resets the throttle (probe seam
// save.debug.resetAutosaveThrottle) so the leg takes seconds, not minutes.
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync } from 'fs';

const argv = process.argv.slice(2);
const base = argv[0] || 'http://127.0.0.1:5199';
const tag = argv[1] || 'dev';
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const legs = opt('legs', 'critic,two,load,end,rotate,fresh').split(',');
const real = opt('real', '0') === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(page, body, { timeout = 30000, every = 50 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(every); } return -1; }
async function press(page, key, times = 1, gap = 110) { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(gap); } }
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
async function navTo(page, id, max = 24) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowDown'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowUp'); if ((await focusOf(page)) === id) return true; } return false; }
async function navH(page, id, max = 6) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowLeft'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowRight'); if ((await focusOf(page)) === id) return true; } return false; }
const list = (page) => page.evaluate(() => window.__echoes.save.list().map((x) => ({ id: x.id, mode: x.meta && x.meta.mode, level: x.meta && x.meta.level, room: x.meta && x.meta.room, phase: x.meta && x.meta.phase, seed: x.meta && x.meta.seed, savedAt: x.savedAt })));
const runSeed = async (page) => { for (let i = 0; i < 5; i++) { const v = await page.evaluate(() => { try { const f = window.__echoes.save.capture().systems.run.frame; return f ? f.seed >>> 0 : null; } catch (e) { return 'retry'; } }).catch(() => 'retry'); if (v !== 'retry') return v; await sleep(50); } return null; };
const out = { schema: 'gntfixINT3-newgame/1', at: new Date().toISOString(), base, tag, real, legs: {} };
const flush = () => writeFileSync(`captures/gntfixINT3-newgame-${tag}.json`, JSON.stringify(out, null, 1));

async function boot(browser) {
  const ctx = await browser.createBrowserContext();
  const { page, errors } = await openEchoes(ctx, `${base}/?fresh=1`);
  await waitFor(page, `(window.__echoes.app.focus()||{}).label==='Press any key or click' || window.__echoes.app.state==='title'`, { timeout: 90000 });
  await press(page, 'Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 });
  return { ctx, page, errors };
}
// title -> New Game by keys; returns what the confirm (if any) said
async function titleNewGame(page, answer = 'ok') {
  await navTo(page, 'ap-title-new'); await press(page, 'Enter'); await sleep(450);
  const stack = await page.evaluate(() => window.__echoes.app.stack());
  let dialog = null;
  if (stack.includes('confirm')) {
    dialog = await page.evaluate(() => {
      const el = document.querySelector('[data-screen="confirm"]');
      return { title: (el.querySelector('.ap-dlg-title') || {}).textContent, body: (el.querySelector('.ap-dlg-body') || {}).textContent, focus: (window.__echoes.app.focus() || {}).id, ok: (document.getElementById('ap-confirm-ok') || {}).textContent, cancel: (document.getElementById('ap-confirm-cancel') || {}).textContent };
    });
    await page.screenshot({ path: `captures/gntfixINT3-newgame-${tag}-confirm-${answer}-${Date.now() % 100000}.png` });
    await navH(page, answer === 'ok' ? 'ap-confirm-ok' : 'ap-confirm-cancel'); await press(page, 'Enter');
  }
  await sleep(500);
  return { stackAfterPress: stack, dialog, state: await page.evaluate(() => window.__echoes.app.state) };
}
async function startCampaignAt(page, room) {
  await page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 })); // setup
  await waitFor(page, `window.__echoes.state().run.phase==='combat'`, { timeout: 20000 });
  if (room > 1) { await page.evaluate((r) => window.__echoes.cmd('skipToRoom', r), room); await waitFor(page, `window.__echoes.state().run.room===${room} && window.__echoes.state().run.phase==='combat'`, { timeout: 20000 }); }
  await sleep(1200);
}
async function nextRoomAutosave(page, r) {
  if (real) await sleep(32000); else await page.evaluate(() => window.__echoes.save.resetAutosaveThrottle());
  const before = await page.evaluate(() => window.__echoes.save.autosaveLog().length);
  await page.evaluate((r) => window.__echoes.cmd('skipToRoom', r), r); // setup
  await waitFor(page, `window.__echoes.state().run.room===${r} && window.__echoes.state().run.phase==='combat'`, { timeout: 20000 });
  await waitFor(page, `window.__echoes.save.autosaveLog().length > ${before}`, { timeout: 15000 });
  await sleep(600);
  const log = await page.evaluate(() => window.__echoes.save.autosaveLog().slice(-1)[0]);
  return { room: r, write: log && { slot: log.slot, ok: log.ok, reason: log.reason, skipped: log.skipped }, saves: await list(page) };
}
async function saveAndQuit(page) {
  await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`, { timeout: 8000 });
  await navTo(page, 'pz-savequit'); await press(page, 'Enter'); await sleep(450);
  if (await page.evaluate(() => window.__echoes.app.stack().includes('confirm'))) { await navH(page, 'ap-confirm-ok'); await press(page, 'Enter'); }
  await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 }); await sleep(900);
  return page.evaluate(() => ((document.getElementById('ap-title-continue') || {}).textContent || '').replace(/\s+/g, ' ').trim());
}

const browser = await launchEchoes({ gpu: true, background: true });
try {
  // ---- critic: Save & Quit campaign A at room 4 -> New Game -> campaign B plays 4 autosaved rooms
  if (legs.includes('critic')) {
    const L = (out.legs.critic = { steps: [] });
    const { ctx, page, errors } = await boot(browser);
    const ng0 = await titleNewGame(page); L.steps.push({ at: 'first New Game (fresh profile)', ...ng0 });
    await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1200);
    await startCampaignAt(page, 1); // room-1 autosave of A
    await sleep(real ? 21000 : 200); if (!real) await page.evaluate(() => window.__echoes.save.resetAutosaveThrottle());
    await page.evaluate(() => window.__echoes.cmd('skipToRoom', 4)); await waitFor(page, `window.__echoes.state().run.room===4 && window.__echoes.state().run.phase==='combat'`); await sleep(1500);
    const seedA = await runSeed(page);
    const contA = await saveAndQuit(page);
    L.seedA = seedA;
    L.steps.push({ at: 'after Save & Quit (A, L1 room 4)', continue: contA, saves: await list(page) });
    const ng = await titleNewGame(page, 'ok');
    L.newGame = ng;
    L.steps.push({ at: 'New Game pressed', ...ng, saves: await list(page) });
    await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1200);
    await startCampaignAt(page, 1);
    L.seedB = await runSeed(page);
    L.steps.push({ at: 'B room 1', saves: await list(page) });
    for (const r of [2, 3, 4, 5]) L.steps.push({ at: `B room ${r}`, ...(await nextRoomAutosave(page, r)) });
    const fin = await list(page);
    L.final = fin;
    L.aSurvives = fin.some((s) => s.id.startsWith('auto') && s.seed === seedA && s.room === 4);
    L.bAutosaved = fin.some((s) => s.id.startsWith('auto') && s.seed === L.seedB);
    L.autosaveLog = await page.evaluate(() => window.__echoes.save.autosaveLog().slice(-8));
    // the player can still get A back: title -> Load Game -> the A autosave
    await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
    await navTo(page, 'pz-quit'); await press(page, 'Enter'); await sleep(400);
    if (await page.evaluate(() => window.__echoes.app.stack().includes('confirm'))) { await navH(page, 'ap-confirm-ok'); await press(page, 'Enter'); }
    await waitFor(page, `window.__echoes.app.state==='title'`); await sleep(800);
    const aSlot = fin.find((s) => s.id.startsWith('auto') && s.seed === seedA);
    if (aSlot) {
      const r = await page.evaluate((id) => window.__echoes.save.load(id), aSlot.id);
      await sleep(800);
      L.loadA = { slot: aSlot.id, ok: r && r.ok, room: await page.evaluate(() => window.__echoes.state().run.room), seed: await runSeed(page) };
    }
    L.errors = errors.length;
    console.log('CRITIC', JSON.stringify({ seedA, seedB: L.seedB, dialog: ng.dialog, aSurvives: L.aSurvives, bAutosaved: L.bAutosaved, loadA: L.loadA, final: fin.map((s) => `${s.id}:${s.mode}/${s.phase}/r${s.room}/${s.seed}`), errors: L.errors }));
    await ctx.close(); flush();
  }

  // ---- two: both autosave slots hold runs of two different games -> a third New Game names the older one
  if (legs.includes('two')) {
    const L = (out.legs.two = {});
    const { ctx, page, errors } = await boot(browser);
    await titleNewGame(page); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 3); const seedA = await runSeed(page); await saveAndQuit(page);
    const ngB = await titleNewGame(page, 'ok'); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 1); const seedB = await runSeed(page);
    if (!real) await page.evaluate(() => window.__echoes.save.resetAutosaveThrottle());
    const contB = await saveAndQuit(page);
    L.afterTwo = await list(page);
    // third New Game: Cancel first (default), then accept
    const cancel = await titleNewGame(page, 'cancel');
    L.cancel = { ...cancel, saves: await list(page) };
    const accept = await titleNewGame(page, 'ok');
    await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 1); const seedC = await runSeed(page);
    await sleep(800);
    L.final = await list(page);
    L.seeds = { seedA, seedB, seedC };
    L.ngB = ngB.dialog; L.accept = accept.dialog; L.contB = contB;
    L.bKept = L.final.some((s) => s.id.startsWith('auto') && s.seed === seedB);
    L.aReplaced = !L.final.some((s) => s.id.startsWith('auto') && s.seed === seedA);
    L.errors = errors.length;
    console.log('TWO', JSON.stringify({ ngB: ngB.dialog && ngB.dialog.title, cancelDialog: cancel.dialog, cancelState: cancel.state, accept: accept.dialog && { title: accept.dialog.title, focus: accept.dialog.focus }, bKept: L.bKept, aReplaced: L.aReplaced, final: L.final.map((s) => `${s.id}:${s.mode}/${s.phase}/r${s.room}/${s.seed}`), errors: L.errors }));
    await ctx.close(); flush();
  }

  // ---- load: A Save & Quit -> title Load of a manual slot of another game -> that game autosaves: A survives
  if (legs.includes('load')) {
    const L = (out.legs.load = {});
    const { ctx, page, errors } = await boot(browser);
    await titleNewGame(page); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 2); const seedM = await runSeed(page);
    await page.evaluate(() => window.__echoes.save.save('manual-1', { name: 'Game M' })); await sleep(600); // setup: a manual save of game M
    await page.evaluate(() => window.__echoes.app.quitToTitle ? window.__echoes.app.quitToTitle({ save: false }) : null); await waitFor(page, `window.__echoes.app.state==='title'`); await sleep(600);
    await titleNewGame(page, 'ok'); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 4); const seedA = await runSeed(page);
    await saveAndQuit(page);
    L.afterA = await list(page);
    // Load Game -> Slot 1 by keys
    await navTo(page, 'ap-title-load'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`); await sleep(500);
    await navTo(page, 'sv-slot-manual-1', 20); await press(page, 'Enter'); await sleep(500);
    for (let i = 0; i < 3; i++) { const st = await page.evaluate(() => window.__echoes.app.stack()); if (st.includes('confirm')) { await navH(page, 'ap-confirm-ok'); await press(page, 'Enter'); await sleep(400); } else if (st.includes('saves')) { await press(page, 'Enter'); await sleep(400); } else break; }
    await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 15000 }); await sleep(800);
    L.loaded = { seed: await runSeed(page), room: await page.evaluate(() => window.__echoes.state().run.room) };
    for (const r of [3, 4, 5]) await nextRoomAutosave(page, r);
    L.final = await list(page);
    L.aSurvives = L.final.some((s) => s.id.startsWith('auto') && s.seed === seedA);
    L.mAutosaved = L.final.some((s) => s.id.startsWith('auto') && s.seed === seedM);
    L.seeds = { seedM, seedA }; L.errors = errors.length;
    console.log('LOAD', JSON.stringify({ loaded: L.loaded, seedM, seedA, aSurvives: L.aSurvives, mAutosaved: L.mAutosaved, final: L.final.map((s) => `${s.id}:${s.mode}/${s.phase}/r${s.room}/${s.seed}`), errors: L.errors }));
    await ctx.close(); flush();
  }

  // ---- end: another game's run END (end card + back to camp) never evicts a suspended run
  if (legs.includes('end')) {
    const L = (out.legs.end = {});
    const { ctx, page, errors } = await boot(browser);
    await titleNewGame(page); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 3); const seedA = await runSeed(page); await saveAndQuit(page);
    const ng = await titleNewGame(page, 'ok'); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 1); const seedB = await runSeed(page);
    // setup: wipe the party (the critic's method) -> end card -> Enter -> camp
    await page.evaluate(() => window.__echoes.save.resetAutosaveThrottle());
    await page.evaluate(() => { const E = window.__echoes; const s = E.state(); const e = (s.enemies || [])[0]; const et = e && (e.type || e.etype || e.kind); const p = s.party[0]; for (let i = 0; i < 8; i++) { try { E.cmd('spawn', et || 'mantis', p.x + Math.cos(i) * 1.5, p.z + Math.sin(i) * 1.5, { elite: true, hpMul: 6, dmgMul: 4 }); } catch { /* */ } } for (const m of s.party) E.cmd('setHp', m.id, 1); });
    L.endCard = await waitFor(page, `(window.__echoes.runUi()||{}).screen==='end'`, { timeout: 90000 });
    await sleep(2500);
    L.atEnd = await list(page);
    await press(page, 'Enter'); await waitFor(page, `window.__echoes.state().run.phase==='idle' || window.__echoes.cmd('campState')`, { timeout: 20000 }); await sleep(3000);
    L.final = await list(page);
    L.log = await page.evaluate(() => window.__echoes.save.autosaveLog().slice(-4).map((x) => ({ reason: x.reason, slot: x.slot, ok: x.ok, skipped: x.skipped })));
    L.aSurvives = L.final.some((s) => s.id.startsWith('auto') && s.seed === seedA && s.phase !== 'defeat');
    L.seeds = { seedA, seedB }; L.dialog = ng.dialog && ng.dialog.title; L.errors = errors.length;
    console.log('END', JSON.stringify({ dialog: L.dialog, endCard: L.endCard, aSurvives: L.aSurvives, log: L.log, final: L.final.map((s) => `${s.id}:${s.mode}/${s.phase}/r${s.room}/${s.seed}`), seeds: L.seeds, errors: L.errors }));
    await ctx.close(); flush();
  }

  // ---- rotate: one game only -> autosaves still alternate auto-1 / auto-2 (no regression)
  if (legs.includes('rotate')) {
    const L = (out.legs.rotate = { writes: [] });
    const { ctx, page, errors } = await boot(browser);
    await titleNewGame(page); await waitFor(page, `window.__echoes.app.state==='playing'`); await sleep(1000);
    await startCampaignAt(page, 1);
    for (const r of [2, 3, 4, 5]) { const s = await nextRoomAutosave(page, r); L.writes.push(s.write && s.write.slot); }
    L.alternates = L.writes.every((w, i) => i === 0 || w !== L.writes[i - 1]);
    L.errors = errors.length;
    console.log('ROTATE', JSON.stringify(L));
    await ctx.close(); flush();
  }

  // ---- fresh: no run in progress -> New Game asks nothing
  if (legs.includes('fresh')) {
    const L = (out.legs.fresh = {});
    const { ctx, page, errors } = await boot(browser);
    const a = await titleNewGame(page); L.freshProfile = { dialog: a.dialog, state: a.state };
    // a camp-only save (Save & Quit from camp) -> still no question
    await sleep(800);
    await saveAndQuit(page);
    L.campSaves = await list(page);
    const b = await titleNewGame(page); L.campOnly = { dialog: b.dialog, state: b.state };
    L.errors = errors.length;
    console.log('FRESH', JSON.stringify(L));
    await ctx.close(); flush();
  }
} catch (e) {
  out.harnessError = String((e && e.stack) || e);
  console.error('[HARNESS-ERROR]', out.harnessError);
} finally {
  await browser.close();
}
flush();
process.exit(out.harnessError ? 1 : 0);
