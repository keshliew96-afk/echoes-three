// gntfixCAMPAIGN6 — COPY of tools/gntccampaign6-locks.mjs (campaign critic r6), outputs renamed (copied from the r4 critic tool, derived from the r3 critic method, own file): lobby level select + sequential locking, every input path; unlock persistence across reload;
// Level-2 start N -> final with the starter grant; a locked save file; Records screen.
// usage: node tools/gntccampaign6-locks.mjs [--base URL] [--tag dev]
import { launch, open, sleep, writeJson } from './gntfixCAMPAIGN6-lib.mjs';
import fs from 'fs';
const A = {};
for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const base = A.base || 'http://127.0.0.1:4332/';
const tag = A.tag || 'dev';
const NAME = `gntfixCAMPAIGN6-locks-${tag}`;
const LEGS = (A.legs || 'A,B,C').split(',');
const R = { base, tag, legs: {}, pageErrors: {} };
const save = () => writeJson(NAME, R);
const log = (leg, m, d) => { (R.legs[leg] = R.legs[leg] || []).push({ m, d }); console.log(`[${leg}]`, m, d ? JSON.stringify(d).slice(0, 500) : ''); save(); };

const browser = await launch({ autoplay: true });
const focus = (page) => page.evaluate(() => { const f = window.__echoes.app.focus(); return f ? { screen: f.screen, id: f.id, label: (f.label || '').slice(0, 40) } : null; });
const stack = (page) => page.evaluate(() => window.__echoes.app.stack());
const runInfo = (page) => page.evaluate(() => { const E = window.__echoes; const cs = E.campaign.state(); return { active: E.state().run.active, phase: cs.phase, level: cs.level, startLevel: cs.startLevel, harness: cs.harness, unlocked: cs.unlocked, stack: E.app.stack() }; });
async function walkTo(page, target) {
  // target: 'portal' | 'table'
  await page.mouse.move(800, 450);
  const t0 = Date.now();
  if (target === 'portal') {
    await page.keyboard.down('KeyW');
    while (Date.now() - t0 < 25000) { if (await page.evaluate(() => window.__echoes.cmd('campState').inPortal)) break; await sleep(40); }
    await page.keyboard.up('KeyW');
  } else {
    // north until level with the table, then west until in its ring
    await page.keyboard.down('KeyW');
    while (Date.now() - t0 < 15000) { const p = await page.evaluate(() => window.__echoes.cmd('campState').player); if (p.z <= -5.3) break; await sleep(30); }
    await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyA');
    while (Date.now() - t0 < 30000) { const c = await page.evaluate(() => window.__echoes.cmd('campState').levelTable); if (c.inRange) break; await sleep(30); }
    await page.keyboard.up('KeyA');
  }
  await sleep(300);
  return page.evaluate(() => { const c = window.__echoes.cmd('campState'); return { inPortal: c.inPortal, table: c.levelTable.inRange, tablePrompt: c.levelTable.promptVisible, player: c.player }; });
}
async function cards(page) {
  return page.evaluate(() => [...document.querySelectorAll('.cg-card')].map((e) => ({ lvl: e.dataset.level, dis: e.getAttribute('aria-disabled'), cls: e.className, text: e.innerText.replace(/\s+/g, ' ').slice(0, 140), r: (() => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })() })));
}
async function clearLevelFast(page) {
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
  await page.waitForFunction(() => { const r = window.__echoes.state().run; return r.room === 8 && r.boss && r.boss.active && r.phase === 'combat'; }, { timeout: 30000 });
  await sleep(4000); // let the level settle (preload realism)
  await page.evaluate(() => { const E = window.__echoes; E.cmd('killBoss'); E.cmd('killAllEnemies'); });
}

try {
  // ---------------------------------------------------------------- leg A: fresh profile, every input path vs locked cards
  if (LEGS.includes('A')) {
    const ctx = await browser.createBrowserContext();
    const { page, errors } = await open(browser, base + '?menu=0&seed=5&fresh=1', { context: ctx, gamepad: true });
    R.pageErrors.A = errors;
    await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 90000 });
    log('A', 'fresh profile', { unlocked: await page.evaluate(() => window.__echoes.campaign.unlocked()), profileUnlocks: await page.evaluate(() => window.__echoes.save.profile().unlocks) });
    const w = await walkTo(page, 'table');
    const tp = await page.evaluate(() => { const e = document.getElementById('cg-table-prompt'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
    await page.screenshot({ path: `captures/gntfixCAMPAIGN6-locks-${tag}-table.png` });
    await page.keyboard.press('KeyE'); await sleep(900);
    log('A', 'walked to the map table, E', { w, tablePrompt: tp, stack: await stack(page), focus: await focus(page) });
    const cs = await cards(page);
    log('A', 'cards', cs);
    await page.screenshot({ path: `captures/gntfixCAMPAIGN6-locks-${tag}-select-fresh.png` });
    // keyboard: every nav key, focus must never land on a locked card
    const kb = [];
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'Tab', 'Tab', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'KeyD', 'End']) { await page.keyboard.press(k); await sleep(160); kb.push([k, (await focus(page) || {}).label]); }
    log('A', 'keyboard focus walk', kb);
    // mouse on locked cards
    const c2 = cs.find((c) => c.lvl === '2'), c3 = cs.find((c) => c.lvl === '3');
    await page.mouse.click(c2.r.x, c2.r.y); await sleep(250);
    await page.screenshot({ path: `captures/gntfixCAMPAIGN6-locks-${tag}-click-locked.png` });
    await page.mouse.click(c3.r.x, c3.r.y, { clickCount: 2 }); await sleep(900);
    const afterMouse = await runInfo(page);
    const lockMsg = await page.evaluate(() => [...document.querySelectorAll('.cg-card')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(-60)));
    log('A', 'mouse click L2 + double-click L3', { afterMouse, lockMsg });
    // mocked gamepad: d-pad right x3 then A
    const pad = [];
    for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__gc4pad.press(15, 150)); await sleep(150); pad.push((await focus(page) || {}).label); }
    const padSrc = await page.evaluate(() => window.__echoes.app.lastSource);
    const padInfo = await page.evaluate(() => { try { return window.__echoes.app.gamepad(); } catch (e) { return String(e); } });
    log('A', 'gamepad d-pad right x3 focus', { pad, lastSource: padSrc, gamepad: padInfo });
    // API paths
    const api = await page.evaluate(() => { const E = window.__echoes; const r = {}; try { r.choose2 = E.campaign.choose(2); } catch (e) { r.choose2 = 'ERR ' + e; } try { r.choose3 = E.campaign.choose(3); } catch (e) { r.choose3 = 'ERR ' + e; } try { r.campChoose2 = E.cmd('campChoose', 2); } catch (e) { r.campChoose2 = 'ERR ' + e; } try { r.campChoose3 = E.cmd('campChoose', 3); } catch (e) { r.campChoose3 = 'ERR ' + e; } r.run = E.state().run.active; r.level = E.campaign.state().level; return r; });
    log('A', 'API choose/campChoose on locked levels', api);
    // positive control: gamepad A on the focused (unlocked) Level 1
    await page.evaluate(() => window.__gc4pad.press(0, 150)); await sleep(1500);
    const padStart = await runInfo(page);
    log('A', 'gamepad A (positive control, focus on Level 1)', padStart);
    R.legA = { cards: cs, kb, afterMouse, pad, api, padStart };
    await ctx.close();
  }
  // ---------------------------------------------------------------- leg B: clear L1 legitimately, unlock persists over a reload; export an L2 save
  let l2SaveText = fs.existsSync('captures/gntccampaign6-l2save.txt') ? fs.readFileSync('captures/gntccampaign6-l2save.txt', 'utf8') : null;
  if (LEGS.includes('B')) {
    const ctx = await browser.createBrowserContext();
    let { page, errors } = await open(browser, base + '?menu=0&seed=5&fresh=1', { context: ctx });
    R.pageErrors.B = errors;
    await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 90000 });
    await walkTo(page, 'portal');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__echoes.campaign.state().phase === 'combat', { timeout: 30000 });
    await clearLevelFast(page);
    await page.waitForFunction(() => { const cs = window.__echoes.campaign.state(); return cs.level === 2 && cs.phase === 'combat'; }, { timeout: 30000 });
    await sleep(1500);
    const unl = await page.evaluate(() => ({ unlocked: window.__echoes.campaign.unlocked(), prof: window.__echoes.save.profile().unlocks, ls: Object.keys(localStorage).filter((k) => k.startsWith('echoes')) }));
    log('B', 'L1 cleared in a portal campaign; now in L2', unl);
    // manual save mid-L2 by keys
    await page.keyboard.press('Escape'); await sleep(400);
    for (let i = 0; i < 8; i++) { const f = await focus(page); if (f && f.id === 'pz-save') break; await page.keyboard.press('ArrowDown'); await sleep(130); }
    const fpz = await focus(page);
    await page.keyboard.press('Enter'); await sleep(700);
    const fsv = await focus(page);
    await page.keyboard.press('Enter'); await sleep(1500);
    const fsv2 = await focus(page);
    log('B', 'save focus path', { fpz, fsv, fsv2, stack: await stack(page) });
    const list = await page.evaluate(() => window.__echoes.save.list().map((s) => ({ slot: s.slot || s.id, meta: s.meta && { level: s.meta.level, room: s.meta.room, phase: s.meta.phase, campaign: s.meta.campaign } })));
    log('B', 'saved mid-L2 (pause -> Save Game -> Slot 1)', list);
    if (!list.find((x) => x.slot === 'manual-1')) { const r = await page.evaluate(() => window.__echoes.save.save('manual-1')); log('B', 'UI save did not land; fallback __echoes.save.save(manual-1)', r); }
    l2SaveText = await page.evaluate(() => { try { return window.__echoes.save.exportText('manual-1'); } catch (e) { return 'ERR ' + e; } });
    fs.writeFileSync('captures/gntccampaign6-l2save.txt', String(l2SaveText));
    log('B', 'exported L2 save text', { len: l2SaveText && l2SaveText.length, head: String(l2SaveText).slice(0, 80) });
    for (let i = 0; i < 4; i++) { const s = await stack(page); if (!s.length) break; await page.keyboard.press('Escape'); await sleep(300); }
    // reload (no fresh) -> unlock persisted?
    page.on('dialog', async (d) => { R.dialogs = (R.dialogs || []).concat([d.type() + ': ' + d.message()]); await d.accept(); });
    await page.goto(base + '?menu=0&seed=5', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.campaign && window.__echoes.tick > 120, { timeout: 90000 });
    const afterReload = await page.evaluate(() => ({ app: window.__echoes.app.state, unlocked: window.__echoes.campaign.unlocked(), prof: window.__echoes.save.profile().unlocks }));
    log('B', 'after reload (same profile, ?menu=0)', afterReload);
    // level select via L at the portal: L2 selectable, L3 locked
    await walkTo(page, 'portal');
    await page.keyboard.press('KeyL'); await sleep(900);
    const cs = await cards(page);
    await page.screenshot({ path: `captures/gntfixCAMPAIGN6-locks-${tag}-select-after-L1.png` });
    const kb = [];
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight']) { await page.keyboard.press(k); await sleep(160); kb.push([k, (await focus(page) || {}).label]); }
    log('B', 'Level Select after reload', { cards: cs.map((c) => [c.lvl, c.dis, c.text.slice(-70)]), kb });
    // choose Level 2 with the keyboard: go left fully then one right
    for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowLeft'); await sleep(120); }
    await page.keyboard.press('ArrowRight'); await sleep(150);
    const f2 = await focus(page);
    await page.evaluate(() => { const E = window.__echoes; window.__gc4ev = []; for (const ty of ['run_start', 'level_transit', 'level_start', 'level_clear', 'run_end', 'return_to_camp']) E.on(ty, (e) => window.__gc4ev.push({ ty, tick: E.tick, level: e && e.level, kind: e && e.kind, from: e && e.from, to: e && e.to, result: e && e.result })); });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__echoes.campaign.state().phase === 'transit', { timeout: 10000 }).catch(() => {});
    await sleep(700);
    const depart = await page.evaluate(() => { const E = window.__echoes; const cs = E.campaign.state(); const s = E.state(); return { cs: { level: cs.level, startLevel: cs.startLevel, phase: cs.phase, card: cs.card && { kind: cs.card.kind, to: cs.card.to, untilTick: cs.card.untilTick - cs.card.startTick }, harness: cs.harness }, text: (document.getElementById('run-screen') || {}).innerText, skills: s.build.skills.map((k) => ({ id: k.id, filled: k.filled })), bench: s.build.bench.length, wallet: s.wallet }; });
    await page.screenshot({ path: `captures/gntfixCAMPAIGN6-locks-${tag}-depart-L2.png` });
    log('B', 'chose Level 2 (focus ' + (f2 && f2.label) + ') -> setting-out card', { ...depart, text: String(depart.text).replace(/\s+/g, ' ').slice(0, 500) });
    await page.waitForFunction(() => { const cs = window.__echoes.campaign.state(); return cs.level === 2 && cs.phase === 'combat'; }, { timeout: 20000 });
    await clearLevelFast(page);
    await page.waitForFunction(() => { const cs = window.__echoes.campaign.state(); return cs.level === 3 && cs.phase === 'combat'; }, { timeout: 30000 });
    const mid = await runInfo(page);
    await clearLevelFast(page);
    await page.waitForFunction(() => window.__echoes.state().run.phase === 'victory', { timeout: 30000 });
    await sleep(1000);
    const vt = await page.evaluate(() => document.getElementById('run-screen').innerText.replace(/\s+/g, ' ').slice(0, 400));
    await page.waitForFunction(() => { const E = window.__echoes; return !E.state().run.active && E.state().run.phase === 'idle'; }, { timeout: 20000 });
    const evs = await page.evaluate(() => window.__gc4ev.map((e) => `${e.ty}@${e.tick} ${e.level ?? ''}${e.kind ? ' ' + e.kind : ''}${e.to ? '->' + e.to : ''}${e.result ? ' ' + e.result : ''}`));
    const prof = await page.evaluate(() => window.__echoes.save.profile());
    log('B', 'Level-2 start played 2 -> 3 -> CAMPAIGN COMPLETE -> camp', { mid, victoryText: vt, events: evs, records: prof.records, unlocks: prof.unlocks });
    // Records screen via title
    await page.keyboard.press('Escape'); await sleep(400);
    await ctx.close();
  }
  // ---------------------------------------------------------------- leg C: a save file whose run sits in a locked level
  if (LEGS.includes('C')) {
    const ctx = await browser.createBrowserContext();
    const { page, errors } = await open(browser, base + '?menu=0&seed=5&fresh=1', { context: ctx });
    R.pageErrors.C = errors;
    await page.waitForFunction(() => window.__echoes.tick > 240, { timeout: 90000 });
    const imp = await page.evaluate((t) => { try { return window.__echoes.save.importText(t); } catch (e) { return 'ERR ' + e; } }, l2SaveText);
    const list = await page.evaluate(() => window.__echoes.save.list().map((s) => ({ slot: s.slot || s.id, level: s.meta && s.meta.level })));
    const slot = (list.find((s) => s.level === 2) || list[0] || {}).slot;
    const ld = await page.evaluate((slot) => { try { return window.__echoes.save.load(slot); } catch (e) { return 'ERR ' + e; } }, slot);
    await sleep(1500);
    const after = await runInfo(page);
    log('C', 'fresh profile: import the L2 save, load it', { imp: JSON.stringify(imp).slice(0, 300), list, ld: JSON.stringify(ld).slice(0, 400), after });
    // and through the UI: pause -> Load Game
    await page.keyboard.press('Escape'); await sleep(400);
    for (let i = 0; i < 8; i++) { const f = await focus(page); if (f && /load/i.test(f.id || '')) break; await page.keyboard.press('ArrowDown'); await sleep(130); }
    const fl = await focus(page);
    await page.keyboard.press('Enter'); await sleep(700);
    const f2 = await focus(page);
    await page.keyboard.press('Enter'); await sleep(700);
    const conf = await page.evaluate(() => ({ stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus(), text: [...document.querySelectorAll('[role=dialog],[role=alertdialog],.ap-confirm')].map((e) => e.innerText.replace(/s+/g, ' ')).join(' | ').slice(0, 300) }));
    for (let i = 0; i < 3; i++) { const f = await focus(page); if (f && f.id === 'ap-confirm-ok') break; await page.keyboard.press('ArrowLeft'); await sleep(120); }
    await page.keyboard.press('Enter'); await sleep(1500);
    const after2 = await runInfo(page);
    log('C', 'load confirm dialog', conf);
    const toasts = await page.evaluate(() => { try { return window.__echoes.app.toasts(); } catch (e) { return [...document.querySelectorAll('[class*=toast]')].map((e) => e.innerText); } });
    await page.screenshot({ path: `captures/gntfixCAMPAIGN6-locks-${tag}-load-locked.png` });
    log('C', 'UI: pause -> Load Game -> the imported L2 slot', { loadFocus: fl, slotFocus: f2, after2, toasts: JSON.stringify(toasts).slice(0, 400) });
    await ctx.close();
  }
  R.done = true;
} catch (e) {
  R.fatal = String(e && e.stack || e).slice(0, 1500); console.error(R.fatal);
} finally { save(); await browser.close(); }
