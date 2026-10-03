// fix-M1-r3 copy of the critic's tools/gntcmenu3-tabland.mjs (log + captures renamed) — settings cursor-order repro (keyboard + pad) and pause/levels/quit-to-lobby legs.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, installGamepad, padTap, focusInfo } from './gntcmenu3-lib.mjs';
const log = logger('gntfixM15-m14tabland');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
async function key(page, k, ms = 260) { await page.keyboard.press(k); await sleep(ms); return focusInfo(page); }
const selTab = (page) => page.evaluate(() => { const s = document.querySelector('[data-screen="settings"] [aria-selected="true"]'); return s && s.id; });
const browser = await launch({ width: 1600, height: 900, autoplay: true });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  await reachTitle(page);
  await installGamepad(page);
  await page.evaluate(() => window.__echoes.app.open('settings'));
  await sleep(700);
  // keyboard: 6 x ArrowDown from Resolution scale
  const seq = [];
  for (let i = 1; i <= 8; i++) {
    const f = await key(page, 'ArrowDown', 280);
    seq.push([i, f.id, await selTab(page)]);
    if (i === 6 || i === 7) await page.screenshot({ path: `${CAP}/gntfixM15-m14tabland-kbd-${i}down.png` });
  }
  log('K down x8 from renderScale', seq);
  const up = [];
  for (let i = 1; i <= 8; i++) { const f = await key(page, 'ArrowUp', 280); up.push([i, f.id, await selTab(page)]); }
  log('K up x8', up);
  check('K1 Down from Reset never lands on an unselected tab', !seq.some((s) => s[1] && s[1].startsWith('ap-tab-') && s[1] !== s[2]), seq);
  check('K2 Down cycle returns to Resolution scale', seq.some((s) => s[1] === 'ap-display-renderScale'), seq.map((s) => s[1]));
  // what does Enter do on the mis-focused tab?
  // re-home
  await page.keyboard.press('Escape'); await sleep(600);
  await page.evaluate(() => window.__echoes.app.open('settings')); await sleep(700);
  for (let i = 0; i < 6; i++) await key(page, 'ArrowDown', 200);
  const before = [(await focusInfo(page)).id, await selTab(page)];
  const afterEnter = await key(page, 'Enter', 500);
  log('K3 Enter on mis-focused tab', { before, after: [afterEnter.id, await selTab(page)] });
  await page.keyboard.press('Escape'); await sleep(600);
  // gamepad: same with d-pad
  await page.evaluate(() => window.__echoes.app.open('settings')); await sleep(700);
  const pseq = [];
  for (let i = 1; i <= 8; i++) { await padTap(page, 13); const f = await focusInfo(page); pseq.push([i, f.id, await selTab(page)]); }
  log('P down x8 (d-pad)', pseq);
  check('P1 d-pad Down never lands on an unselected tab / reaches Resolution scale again', !pseq.some((s) => s[1] && s[1].startsWith('ap-tab-') && s[1] !== s[2]) && pseq.some((s) => s[1] === 'ap-display-renderScale'), pseq.map((s) => s[1]));
  await padTap(page, 1); await sleep(600);
  // pause-from-run legs: New Game, then campaign Level I from the levels screen
  await page.evaluate(() => document.querySelector('#ap-title-new').click());
  await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 });
  await sleep(1500);
  await page.evaluate(() => window.__echoes.campaign.open()); await sleep(700);
  const lv = await page.evaluate(() => [...document.querySelectorAll('[data-screen="levels"] [data-nav]')].map((b) => ({ label: b.getAttribute('aria-label'), disabled: b.getAttribute('aria-disabled') || b.disabled, text: b.textContent.replace(/\s+/g, ' ').trim().slice(-60) })));
  log('L0 levels items', lv);
  // mouse click on a locked card
  const lockedC = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-screen="levels"] [data-nav]')][1]; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(lockedC.x, lockedC.y, { steps: 5 }); await sleep(200);
  const hoverLocked = await focusInfo(page);
  await page.mouse.click(lockedC.x, lockedC.y); await sleep(600);
  const afterClick = await focusInfo(page);
  const runA = await page.evaluate(() => { const r = window.__echoes.state().run; return r && { active: r.active, phase: r.phase }; });
  await page.screenshot({ path: `${CAP}/gntfixM15-m14tabland-levels-lockedclick.png` });
  check('L1 click on locked Level II refused (levels stays, no run)', afterClick.stack.join() === 'levels' && !(runA && runA.active), { hoverLocked: [hoverLocked.id, hoverLocked.label, hoverLocked.ring], afterClick: afterClick.stack, runA });
  const t0 = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const r = window.__echoes.state().run; return r && r.active && r.phase === 'combat'; }, { timeout: 30000, polling: 100 });
  log('L2 Enter on Level I -> combat in ms', Date.now() - t0);
  await sleep(800);
  let f = await key(page, 'Escape', 600);
  const cyc = [f.id];
  for (let i = 0; i < 8; i++) { f = await key(page, 'ArrowDown', 200); cyc.push(f.id); }
  log('Q0 pause-run down cycle', cyc);
  for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'pz-lobby'; i++) await key(page, 'ArrowDown', 180);
  const qc = await key(page, 'Enter', 700);
  const qtext = await page.evaluate(() => { const c = document.querySelector('[data-screen="confirm"]'); return c && c.textContent.replace(/\s+/g, ' ').trim(); });
  await page.screenshot({ path: `${CAP}/gntfixM15-m14tabland-quitlobby-confirm.png` });
  f = await key(page, 'Escape', 600);
  check('Q1 Quit to Lobby -> confirm (default focus safe), Esc -> pause focus Quit to Lobby', qc.stack.join() === 'pause,confirm' && /cancel|keep|stay/i.test(qc.id + ' ' + qc.label) && f.stack.join() === 'pause' && f.id === 'pz-lobby', { qc: [qc.stack, qc.id, qc.label], qtext, back: [f.stack, f.id] });
  await key(page, 'Enter', 700);
  const okId = await page.evaluate(() => document.querySelector('#ap-confirm-ok') ? 'ap-confirm-ok' : null);
  await key(page, 'ArrowRight', 250); await key(page, 'ArrowLeft', 250);
  const fsel = await focusInfo(page);
  // choose the destructive button explicitly
  await page.evaluate(() => { const b = document.querySelector('#ap-confirm-ok'); b && b.focus(); });
  const cl = await page.evaluate(() => { const b = document.querySelector('#ap-confirm-ok'); if (b) { b.click(); return true; } return false; });
  await sleep(2500);
  f = await focusInfo(page);
  const st = await page.evaluate(() => { const r = window.__echoes.state().run; return { mode: window.__echoes.app.mode, run: r && { active: r.active, phase: r.phase }, tick: window.__echoes.tick }; });
  check('Q2 Quit to Lobby OK -> camp, no overlay', f.stack.length === 0 && st.mode === 'camp', { fsel: [fsel.id], cl, f, st });
  await sleep(500);
  const t1 = await page.evaluate(() => window.__echoes.tick); await sleep(1000); const t2 = await page.evaluate(() => window.__echoes.tick);
  log('Q3 camp ticking after quit', t2 - t1);
  check('pageerrors', errors.length === 0, errors);
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
