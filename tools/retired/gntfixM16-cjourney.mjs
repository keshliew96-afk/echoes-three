// fix-M1-r6: verbatim copy of tools/gntcmenu6-journey.mjs (menu critic r6), outputs renamed gntfixM16-cjourney.
// Menu critic r6 — G1.11 journey: title -> New Game (real Enter) -> camp controllable (first player
// movement from a real W) timed from the Enter keydown; camp -> portal (real W hold) -> E -> level 1
// room 1 combat -> killAllEnemies -> reward; then legacy / harness params boot straight into play.
import { launch, logger, sleep, CAP, URL_BASE, reachTitle } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM16-cjourney' + (process.env.TAG || ''));
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const W = 1600, H = 900;
const browser = await launch({ width: W, height: H });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { window.__gcT = {}; window.addEventListener('keydown', (e) => { if (e.code === 'Enter' && window.__gcArm && !window.__gcT.enter) window.__gcT.enter = performance.now(); }, true); });
  await page.goto(URL_BASE + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  await reachTitle(page);
  await sleep(1500);
  const tickTitle0 = await page.evaluate(() => window.__echoes.tick); await sleep(1000);
  const tickTitle1 = await page.evaluate(() => window.__echoes.tick);
  check('title: sim paused (0 ticks in 1 s)', tickTitle1 === tickTitle0, { tickTitle0, tickTitle1 });
  const f0 = await page.evaluate(() => window.__echoes.app.focus().id);
  await page.evaluate(() => { window.__gcArm = true; const p0 = window.__echoes.state().party[0]; window.__gcT.p0 = { x: p0.x, z: p0.z }; const loop = () => { const p = window.__echoes.state().party[0]; if (!window.__gcT.moved && window.__gcT.enter && (Math.abs(p.x - window.__gcT.p0.x) > 0.01 || Math.abs(p.z - window.__gcT.p0.z) > 0.01)) { window.__gcT.moved = performance.now(); window.__gcT.pos = { x: p.x, z: p.z }; } if (!window.__gcT.playing && window.__echoes.app.state === 'playing') window.__gcT.playing = performance.now(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  await page.keyboard.press('Enter');
  for (let i = 0; i < 40; i++) {
    await page.keyboard.down('KeyW'); await sleep(90);
    const m = await page.evaluate(() => window.__gcT.moved);
    if (m) break;
    await page.keyboard.up('KeyW'); await sleep(10);
  }
  const T = await page.evaluate(() => window.__gcT);
  const ctrlMs = T.moved ? +(T.moved - T.enter).toFixed(0) : null;
  log('New Game timing', { focusWas: f0, enterToPlaying: T.playing ? +(T.playing - T.enter).toFixed(0) : null, enterToFirstMove: ctrlMs, pos: T.pos });
  check('G1.11a New Game -> camp controllable within 1.0 s of the press (first real-W movement)', f0 === 'ap-title-new' && ctrlMs !== null && ctrlMs <= 1000, { ctrlMs });
  // hold W to the portal
  let t = 0; let cs;
  await page.keyboard.down('KeyW');
  for (; t < 150; t++) { cs = await page.evaluate(() => window.__echoes.cmd('campState')); if (t % 10 === 0) log('hold W', t, cs.player, cs.inPortal, await page.evaluate(() => window.__echoes.app.state + ' ' + window.__echoes.app.stack().join('>'))); if (cs.inPortal) break; await sleep(100); }
  await page.keyboard.up('KeyW');
  log('portal reached', { inPortal: cs.inPortal, promptVisible: cs.promptVisible, player: cs.player, tick: await page.evaluate(() => window.__echoes.tick) });
  await sleep(300);
  await page.screenshot({ path: `${CAP}/gntfixM16-cjourney-portal.png` });
  await page.keyboard.press('KeyE');
  let run = null;
  for (let i = 0; i < 300; i++) { run = await page.evaluate(() => { const r = window.__echoes.state().run; return { phase: r.phase, room: r.room, act: r.act, actName: r.actName, active: r.active }; }); if (run.phase === 'combat' && run.room === 1) break; await sleep(100); }
  const tickCombat = await page.evaluate(() => window.__echoes.tick);
  log('after E', run, 'tick', tickCombat);
  check('G1.11b portal E -> Level 1 room 1 combat (no picker)', run.phase === 'combat' && run.room === 1 && run.act === 1, run);
  await sleep(1500);
  await page.screenshot({ path: `${CAP}/gntfixM16-cjourney-combat.png` });
  for (let i = 0; i < 100; i++) { const ph = await page.evaluate(() => { window.__echoes.cmd('killAllEnemies'); return window.__echoes.state().run.phase; }); if (ph !== 'combat') break; await sleep(150); }
  await sleep(800);
  const r2 = await page.evaluate(() => { const r = window.__echoes.state().run; return { phase: r.phase, room: r.room }; });
  log('after killAllEnemies', r2, 'tick', await page.evaluate(() => window.__echoes.tick));
  check('G1.11c room 1 clears -> reward', r2.phase === 'reward', r2);
  await page.screenshot({ path: `${CAP}/gntfixM16-cjourney-reward.png` });
  // Esc opens pause over the reward page; Resume returns to it
  await page.keyboard.press('Escape'); await sleep(500);
  const pz = await page.evaluate(() => ({ stack: window.__echoes.app.stack(), items: [...document.querySelectorAll('[data-screen="pause"] [data-nav]')].map((e) => e.id) }));
  await page.keyboard.press('Escape'); await sleep(500);
  const back = await page.evaluate(() => ({ stack: window.__echoes.app.stack(), phase: window.__echoes.state().run.phase }));
  log('pause over reward', pz, '-> Esc', back);
  check('pause opens over the reward page (Quit to Lobby offered in a run) and Esc returns to it', pz.stack.join() === 'pause' && pz.items.includes('pz-lobby') !== false && back.stack.length === 0 && back.phase === 'reward', { pz, back });
  log('journey page errors', errors.length, errors.slice(0, 3));
  check('journey 0 page errors', errors.length === 0, errors.slice(0, 3));
  await page.close();
  // legacy params
  const cases = ['?menu=0', '?seed=5', '?room=kill_all&seed=7', '?run=1&seed=3', '?scene=arena', '?variant=4', '?layout=2', '?level=2&seed=4', '?act=2&run=1&seed=2', '?seed=5&menu=1'];
  for (const q of cases) {
    const p = await browser.newPage();
    const err = [];
    p.on('pageerror', (e) => err.push(String(e.message || e)));
    await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    try {
      await p.goto(URL_BASE + q, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await p.waitForFunction(() => !!window.__echoes && !!window.__echoes.app && window.__echoes.tick >= 0, { timeout: 180000 });
      const first = await p.evaluate(() => ({ state: window.__echoes.app.state, stack: window.__echoes.app.stack() }));
      await sleep(4000);
      const r = await p.evaluate(() => { const s = window.__echoes.state(); return { state: window.__echoes.app.state, stack: window.__echoes.app.stack(), tick: window.__echoes.tick, scene: s.scene, run: s.run && { phase: s.run.phase, room: s.run.room, act: s.run.act }, fpsMeter: !!document.querySelector('#fps, .fps, [id*="fps"]') }; });
      const wantTitle = q.includes('menu=1');
      const ok = q.startsWith('?run=1') ? (r.state === 'playing' && r.run.phase === 'combat' && r.run.room === 1) : wantTitle ? (r.state === 'title' || r.stack.includes('title') || r.stack.includes('loading')) : (r.state === 'playing' && !r.stack.includes('title') && r.tick > 30 && !first.stack.includes('title'));
      check(`legacy ${q}`, ok && err.length === 0, { first, ...r, err: err.slice(0, 2) });
    } catch (e) { check(`legacy ${q}`, false, String(e).slice(0, 200)); }
    await p.close();
  }
} finally { await browser.close(); }
log('TOTAL FAILS', fails);
