// gntfixM36 copy of tools/gntcmenu6-navkb.mjs (menu critic r6) with renamed outputs gntfixM36-m-navkb — fix-M3-r6 regression of the pointer nav-sound edit in src/app/nav.js.
// Menu critic r6 — G1.2 keyboard-only navigation + Esc consistency + focus memory + 50 random actions (no trap).
import { launch, open, logger, reachTitle, sleep, CAP, URL_BASE } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM36-m-navkb');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({});
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  await page.evaluate(() => { history.pushState({}, '', location.href); });
  await reachTitle(page);
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), ring: a.ringCount(), state: a.state }; });
  const key = async (k, w = 220) => { await page.keyboard.press(k); await sleep(w); return F(); };
  let f = await F();
  check('K1 arrival focus New Game, ring 1', f.id === 'ap-title-new' && f.ring === 1, f);
  // Down order + wrap
  const order = [f.id];
  for (let i = 0; i < 6; i++) { f = await key('ArrowDown'); order.push(f.id); }
  log('down order', order);
  check('K2 Down skips disabled Load and wraps Exit->New Game', order[5] === 'ap-title-new' && !order.includes('ap-title-load'), order);
  f = await key('ArrowUp'); check('K2a Up from Multiplayer to New Game', f.id === 'ap-title-new', f);
  f = await key('ArrowUp'); check('K2b Up from New Game wraps to Exit', f.id === 'ap-title-exit', f);
  f = await key('KeyW'); check('K2c W moves up', f.id === 'ap-title-records', f);
  f = await key('KeyS'); check('K2d S moves down', f.id === 'ap-title-exit', f);
  // Esc on title root = no-op
  f = await key('Escape'); check('K3 Esc on title root is a no-op', f.stack === 'title' && f.state === 'title' && f.id === 'ap-title-exit', f);
  f = await key('Backspace'); check('K3b Backspace on title root is a no-op', f.stack === 'title' && f.id === 'ap-title-exit', f);
  // Settings via Enter, then Esc restores focus
  f = await key('ArrowUp'); f = await key('ArrowUp');
  check('K4 focus on Settings', f.id === 'ap-title-settings', f);
  f = await key('Enter', 500); check('K4b Enter opens Settings with focus on first row', f.stack === 'title>settings' && f.ring === 1, f);
  f = await key('Escape', 500); check('K4c Esc closes Settings back to title with focus restored on Settings', f.stack === 'title' && f.id === 'ap-title-settings', f);
  f = await key('Space', 500); check('K4d Space opens Settings', f.stack === 'title>settings', f);
  // Settings ring walk (Display): Down until Back, record ids
  const ring = [f.id];
  for (let i = 0; i < 14; i++) { f = await key('ArrowDown'); ring.push(f.id); if (f.id === ring[0] && i > 0) break; }
  log('display ring', ring);
  check('K5 Display ring returns to start and includes Reset/Back/tab', ring.includes('ap-settings-back') && ring[ring.length - 1] === ring[0], ring);
  // tabs by Q/E and PageDown
  const tabs = [];
  for (let i = 0; i < 6; i++) { await key('KeyE', 350); tabs.push(await page.evaluate(() => { const t = document.querySelector('[id^="ap-tab-"][aria-selected="true"]'); return t && t.id; })); }
  log('E tab order', tabs);
  check('K6 E cycles tabs (5 distinct)', new Set(tabs).size === 5, tabs);
  await key('KeyQ', 350); const tq = await page.evaluate(() => { const t = document.querySelector('[id^="ap-tab-"][aria-selected="true"]'); return t && t.id; });
  check('K6b Q goes back one tab', tq !== tabs[5], { tq, last: tabs[5] });
  // Backspace backs out of settings
  f = await key('Backspace', 500); check('K7 Backspace closes Settings', f.stack === 'title', f);
  // Records, Multiplayer: open and Esc
  for (const id of ['ap-title-records', 'ap-title-multiplayer']) {
    for (let i = 0; i < 8 && (await F()).id !== id; i++) await key('ArrowDown', 150);
    f = await key('Enter', 600); const opened = f.stack;
    f = await key('Escape', 600);
    check(`K8 ${id}: opens (${opened}) and Esc returns with focus restored`, opened !== 'title' && f.stack === 'title' && f.id === id, f);
  }
  // Exit -> confirm -> Esc cancels, focus Exit; Enter on OK -> farewell (window.close stubbed by pushState)
  for (let i = 0; i < 8 && (await F()).id !== 'ap-title-exit'; i++) await key('ArrowDown', 150);
  f = await key('Enter', 500); check('K9 Exit opens a confirm with focus on Cancel (safe default)', f.stack === 'title>confirm' && f.id === 'ap-confirm-cancel', f);
  f = await key('Escape', 500); check('K9b Esc cancels the confirm, focus back on Exit', f.stack === 'title' && f.id === 'ap-title-exit', f);
  // Random 50 actions: no trap, ring 1 whenever a screen is open
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'KeyQ', 'KeyE'];
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const path = []; let ringBad = 0; let leftTitle = 0;
  for (let i = 0; i < 50; i++) {
    const cur = await F();
    let k = keys[Math.floor(rnd() * keys.length)];
    // never confirm New Game / Continue / Exit OK (would leave the menu tree) — replaced by Escape
    if (k === 'Enter' && ['ap-title-new', 'ap-title-continue', 'ap-confirm-ok', 'ap-title-exit'].includes(cur.id)) k = 'ArrowDown';
    const r = await key(k, 200);
    path.push(`${k}->${r.stack}:${r.id}`);
    if (r.stack && r.ring !== 1) ringBad++;
    if (r.state !== 'title') leftTitle++;
  }
  log('random path', path.join(' | '));
  // escape out: at most 8 Esc
  let n = 0; f = await F();
  while (f.stack !== 'title' && n < 8) { f = await key('Escape', 500); if (f.stack.endsWith('keep-display')) log('keep-display dialog met while backing out'); n++; }
  check('K10 50 random actions: ring 1 always, back to title root within 8 Esc', ringBad === 0 && f.stack === 'title', { ringBad, escPresses: n, final: f, leftTitle });
  log('page errors', errors.length, errors.slice(0, 3));
  check('K11 0 page errors', errors.length === 0, errors.length);
} finally { await browser.close(); }
log('TOTAL FAILS', fails);
