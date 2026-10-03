// fix-M1-r3 copy of the critic's tools/gntcmenu3-journey.mjs (log + captures renamed; unchanged otherwise)
// Menu critic r3 — G1.11 journey: New Game -> camp controllable <= 1.0 s; portal -> room 1 -> reward by real input;
// title-after-run leak check; legacy/menu-skip boots; B22 focus-loss handling.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntcmenu3-lib.mjs';
const log = logger('gntfixM13-cjourney');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({ width: 1600, height: 900, autoplay: true });
const pstate = (page) => page.evaluate(() => { const s = window.__echoes.state(); const p = s.player || (s.party && s.party[0]) || null; return { tick: window.__echoes.tick, state: window.__echoes.app.state, stack: window.__echoes.app.stack(), run: s.run && { active: s.run.active, phase: s.run.phase, room: s.run.room, level: s.run.level }, pos: p && (p.pos || p.position || (p.x !== undefined ? { x: p.x, z: p.z } : null)) }; });
try {
  // J1/J2 fresh profile, New Game by Enter, time to controllable
  {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
    await reachTitle(page);
    const s0 = await pstate(page);
    log('J0 title', s0, 'focus', (await focusInfo(page)).id);
    // press Enter on New Game, hold W, measure when the player's position starts to change
    const res = await page.evaluate(async () => {
      const E = window.__echoes;
      const pos = () => { const s = E.state(); const p = s.player || (s.party && s.party[0]); if (!p) return null; const q = p.pos || p.position || p; return [q.x, q.z !== undefined ? q.z : q.y]; };
      return { start: performance.now(), pos0: pos() };
    });
    const t0 = Date.now();
    await page.keyboard.press('Enter');
    await page.keyboard.down('KeyW');
    let moved = null, playingAt = null;
    const p0 = await page.evaluate(() => { const s = window.__echoes.state(); return JSON.stringify(s.player || (s.party && s.party[0]) || null).slice(0, 300); });
    for (let i = 0; i < 60; i++) {
      await sleep(50);
      const st = await page.evaluate(() => { const s = window.__echoes.state(); const p = s.player || (s.party && s.party[0]); const q = p && (p.pos || p.position || p); return { app: window.__echoes.app.state, x: q && q.x, z: q && (q.z !== undefined ? q.z : q.y) }; });
      if (!playingAt && st.app === 'playing') playingAt = Date.now() - t0;
      if (!st.moved0) st.moved0 = null;
      if (playingAt && res.pos0 && st.x !== undefined && (Math.abs(st.x - res.pos0[0]) > 0.05 || Math.abs(st.z - res.pos0[1]) > 0.05)) { moved = Date.now() - t0; break; }
    }
    log('J1 player sample', p0);
    check('J1 New Game -> playing and the player moving under held W within 1.0 s', playingAt !== null && moved !== null && moved <= 1000, { playingAt, moved, pos0: res.pos0 });
    // walk to the portal
    let inPortal = false;
    for (let i = 0; i < 120 && !inPortal; i++) { await sleep(100); inPortal = await page.evaluate(() => !!window.__echoes.cmd('campState').inPortal); }
    await page.keyboard.up('KeyW');
    const tp = await page.evaluate(() => window.__echoes.tick);
    await page.keyboard.press('KeyE');
    let combat = null;
    for (let i = 0; i < 100; i++) { await sleep(100); const r = await page.evaluate(() => { const s = window.__echoes.state(); return s.run && s.run.active && s.run.phase === 'combat' ? { tick: window.__echoes.tick, room: s.run.room, level: s.run.level } : null; }); if (r) { combat = r; break; } }
    check('J2 portal E -> combat room 1 (no picker)', inPortal && combat && combat.room === 1, { inPortal, portalTick: tp, combat, stack: (await pstate(page)).stack });
    // fight by real input: hold right mouse at screen centre area, press skills, strafe
    await page.mouse.move(800, 380);
    const t1 = Date.now();
    let phase = 'combat', presses = 0;
    await page.mouse.down({ button: 'right' });
    while (Date.now() - t1 < 90000) {
      for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) { await page.keyboard.press(k); presses++; }
      await page.keyboard.down(presses % 8 < 4 ? 'KeyA' : 'KeyD'); await sleep(350); await page.keyboard.up(presses % 8 < 4 ? 'KeyA' : 'KeyD');
      // aim at the nearest enemy
      const aim = await page.evaluate(() => { try { const s = window.__echoes.state(); const en = (s.enemies || []).filter((e) => e.hp > 0); return en.length; } catch { return -1; } });
      phase = await page.evaluate(() => { const s = window.__echoes.state(); return s.run && s.run.phase; });
      if (phase !== 'combat') break;
      if (aim === 0) await sleep(200);
    }
    await page.mouse.up({ button: 'right' });
    const clearMs = Date.now() - t1;
    await page.screenshot({ path: `${CAP}/gntfixM13-cjourney-afterfight.png` });
    const endSt = await pstate(page);
    let usedKill = false;
    if (phase === 'combat') { usedKill = true; for (let i = 0; i < 20 && phase === 'combat'; i++) { await page.evaluate(() => window.__echoes.cmd('killAllEnemies')); await sleep(500); phase = await page.evaluate(() => window.__echoes.state().run.phase); } }
    check('J3 room 1 cleared -> reward (by real input unless noted)', phase === 'reward' || phase === 'draft' || phase === 'path', { phase, byRealInput: !usedKill, clearMs, endSt });
    // pause -> Quit to Title (confirm) -> title leak check
    await page.keyboard.press('Escape'); await sleep(600);
    for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'pz-quit'; i++) { await page.keyboard.press('ArrowDown'); await sleep(200); }
    await page.keyboard.press('Enter'); await sleep(600);
    const qconf = await focusInfo(page);
    await page.evaluate(() => document.querySelector('#ap-confirm-ok').click());
    await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    const tt = await page.evaluate(() => ({ state: window.__echoes.app.state, stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus().id, rows: [...document.querySelectorAll('[data-screen="title"] [data-nav]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()) }));
    log('J4 back at title', { qconf: [qconf.stack, qconf.id, qconf.label], tt });
    await page.screenshot({ path: `${CAP}/gntfixM13-cjourney-backtitle.png` });
    const leak = await page.evaluate(async () => { let raf = 0; const t0 = performance.now(); await new Promise((r) => { function f() { raf++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(); } requestAnimationFrame(f); }); const m = window.__echoes.audio.music(); return { rafPerSec: raf / 2, fps: window.__echoes.app.frameStats().renderedFps, music: m.state, players: m.players, listeners: window.__echoes.busCounters && window.__echoes.busCounters.listeners }; });
    const f0 = await focusInfo(page); await page.keyboard.press('ArrowDown'); await sleep(250); const f1 = await focusInfo(page);
    check('J5 title after a run: one render loop, one music player, one ArrowDown = one step', leak.players === 1 && f0.id !== f1.id, { leak, step: [f0.id, f1.id] });
    // New Game again -> fresh world, then second core loop
    for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-new'; i++) { await page.keyboard.press('ArrowUp'); await sleep(200); }
    const tn = Date.now(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 10000 }).catch(() => {});
    const ngMs = Date.now() - tn;
    const fresh = await page.evaluate(() => { const s = window.__echoes.state(); return { run: s.run && s.run.active, wallet: s.wallet !== undefined ? s.wallet : (s.run && s.run.wallet), stack: window.__echoes.app.stack() }; });
    log('J6 New Game after a run', { ngMs, fresh });
    await sleep(800);
    await page.keyboard.down('KeyW');
    let inP = false; for (let i = 0; i < 120 && !inP; i++) { await sleep(100); inP = await page.evaluate(() => !!window.__echoes.cmd('campState').inPortal); }
    await page.keyboard.up('KeyW'); await page.keyboard.press('KeyE');
    let c2 = null; for (let i = 0; i < 100; i++) { await sleep(100); c2 = await page.evaluate(() => { const s = window.__echoes.state(); return s.run && s.run.active && s.run.phase === 'combat' ? s.run.room : null; }); if (c2) break; }
    for (let i = 0; i < 20; i++) { await page.evaluate(() => window.__echoes.cmd('killAllEnemies')); await sleep(400); const ph = await page.evaluate(() => window.__echoes.state().run.phase); if (ph !== 'combat') { c2 = ph; break; } }
    check('J7 second core loop after returning to the title reaches reward', inP && c2 === 'reward', { inP, c2 });
    check('J pageerrors', errors.length === 0, errors);
    await page.close();
  }
  // J8 legacy boots
  for (const q of ['?menu=0&seed=7', '?seed=5', '?room=kill_all', '?room=defend', '?run=1', '?scene=arena', '?variant=2', '?layout=4&room=kill_all', '?level=2', '?seed=5&menu=1']) {
    const { page, errors } = await open(browser, URL_BASE + q);
    await sleep(6000);
    const a = await page.evaluate(() => ({ state: window.__echoes.app.state, stack: window.__echoes.app.stack(), tick: window.__echoes.tick }));
    await sleep(500);
    const b = await page.evaluate(() => { const s = window.__echoes.state(); return { tick: window.__echoes.tick, run: s.run && { active: s.run.active, level: s.run.level, phase: s.run.phase } }; });
    const expectTitle = q.includes('menu=1');
    const ok = expectTitle ? (a.state === 'title' || a.state === 'boot') && b.tick === a.tick : a.state === 'playing' && !a.stack.includes('title') && b.tick - a.tick >= 20;
    check(`J8 ${q}`, ok && errors.length === 0, { a, b, dTicks: b.tick - a.tick, errors });
    await page.close();
  }
  // B22 focus loss (auto-pause) from live play
  {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
    await reachTitle(page);
    await page.evaluate(() => document.querySelector('#ap-title-new').click());
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 });
    await sleep(1500);
    const k0 = await page.evaluate(() => window.__echoes.tick);
    await page.evaluate(() => { window.dispatchEvent(new Event('blur')); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(1000);
    const k1 = await page.evaluate(() => ({ tick: window.__echoes.tick, stack: window.__echoes.app.stack(), paused: window.__echoes.app.simPaused(), reason: window.__echoes.app.pauseReason, master: (() => { try { return window.__echoes.audio.busGain('master'); } catch (e) { return String(e); } })() }));
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
    await sleep(1000);
    const k2 = await page.evaluate(() => ({ tick: window.__echoes.tick, stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus().id, ring: window.__echoes.app.ringCount() }));
    await page.keyboard.press('Escape'); await sleep(1000);
    const k3 = await page.evaluate(() => ({ tick: window.__echoes.tick, stack: window.__echoes.app.stack() }));
    await sleep(1000);
    const k4 = await page.evaluate(() => window.__echoes.tick);
    check('B22 blur/hidden in SP play -> pause menu, sim frozen, audio ducks; return keeps the menu with focus; Esc resumes 60 ticks/s', k1.stack.includes('pause') && k1.tick - k0 <= 2 && k2.ring === 1 && k3.stack.length === 0 && k4 - k3.tick >= 55, { k0, k1, k2, k3, k4 });
    check('B22 pageerrors', errors.length === 0, errors);
    await page.close();
  }
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
