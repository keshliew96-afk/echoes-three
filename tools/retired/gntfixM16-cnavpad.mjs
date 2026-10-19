// fix-M1-r6: verbatim copy of tools/gntcmenu6-navpad.mjs (menu critic r6), outputs renamed gntfixM16-cnavpad.
// Menu critic r6 — G1.2 gamepad-only navigation (mocked navigator.getGamepads, standard mapping),
// repeat timing, deadzone, B/back consistency, Start = pause, hint glyphs.
import { launch, open, logger, sleep, CAP, URL_BASE, installGamepad, padTap, padStick } from './gntcmenu6-lib.mjs';
const log = logger('gntfixM16-cnavpad');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({});
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  await installGamepad(page);
  const F = () => page.evaluate(() => { const a = window.__echoes.app; const f = a.focus(); return { id: f && f.id, stack: a.stack().join('>'), ring: a.ringCount(), state: a.state }; });
  const pad = async (b, w = 200) => { await padTap(page, b); await sleep(w); return F(); };
  // loading card by pad only
  await page.waitForFunction(() => { const el = document.querySelector('[data-screen="loading"]'); return window.__echoes.app.state !== 'boot' || (el && /Ready|Press any key/i.test(el.textContent)); }, { timeout: 150000, polling: 200 });
  const loadTxt = await page.evaluate(() => { const el = document.querySelector('[data-screen="loading"]'); return el ? el.innerText.replace(/\s+/g, ' ') : null; });
  log('loading text', loadTxt, 'state', (await F()).state);
  let t0 = Date.now();
  for (let i = 0; i < 20 && (await F()).state === 'boot'; i++) await pad(0, 300);
  let f = await F();
  check('P0 loading card passes with pad A only', f.state === 'title', { f, ms: Date.now() - t0 });
  if (f.state !== 'title') { await page.keyboard.press('KeyZ'); await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 30000 }); }
  await sleep(800);
  const hints0 = await page.evaluate(() => document.querySelector('.ap-title-foot').innerText.replace(/\s+/g, ' '));
  f = await pad(13); check('P1 D-pad down moves', f.id === 'ap-title-multiplayer', f);
  const hints1 = await page.evaluate(() => document.querySelector('.ap-title-foot').innerText.replace(/\s+/g, ' '));
  log('title hints before/after pad', hints0, '||', hints1);
  check('P1b hint glyphs switch to the pad after pad input', hints0 !== hints1 && /\bA\b|Ⓐ|B\b/.test(hints1), { hints0, hints1 });
  f = await pad(12); check('P2 D-pad up moves', f.id === 'ap-title-new', f);
  f = await pad(12); check('P2b D-pad up wraps', f.id === 'ap-title-exit', f);
  // deadzone: stick 0.4 must not move
  await padStick(page, 1, 0.4, 300); f = await F(); check('P3 stick 0.4 (inside deadzone 0.5) does not move', f.id === 'ap-title-exit', f);
  await padStick(page, 1, 0.9, 80); f = await F(); check('P3b stick 0.9 tap moves one', f.id === 'ap-title-new', f);
  // B on title root no-op
  f = await pad(1); check('P4 B on title root = no-op', f.stack === 'title' && f.id === 'ap-title-new', f);
  // to Settings: down x2, A
  await pad(13); f = await pad(13); check('P5 on Settings', f.id === 'ap-title-settings', f);
  f = await pad(0, 500); check('P5b A opens Settings', f.stack === 'title>settings', f);
  // RB/LB tabs
  const tabSel = () => page.evaluate(() => { const t = document.querySelector('[id^="ap-tab-"][aria-selected="true"]'); return t && t.id; });
  await pad(5, 400); const tRB = await tabSel(); await pad(4, 400); const tLB = await tabSel();
  check('P6 RB next tab / LB previous tab', tRB === 'ap-tab-audio' && tLB === 'ap-tab-display', { tRB, tLB });
  // repeat timing on the Audio tab
  await pad(5, 500);
  await page.evaluate(() => window.__echoes.app.clearResponses());
  await page.evaluate(() => window.__gcAxis(1, 0.95)); await sleep(1400); await page.evaluate(() => window.__gcAxis(1, 0)); await sleep(300);
  const rs = await page.evaluate(() => window.__echoes.app.responses().filter((r) => r.source === 'gamepad' && r.action === 'down').map((r) => r.inputTs));
  const gaps = rs.slice(1).map((t, i) => +(t - rs[i]).toFixed(0));
  log('stick hold 1400 ms: down actions', rs.length, 'gaps ms', gaps);
  check('P7 stick hold: initial delay 350-450 ms then ~90 ms repeats', rs.length >= 8 && gaps[0] >= 350 && gaps[0] <= 470 && gaps.slice(1).every((g) => g >= 70 && g <= 130), { n: rs.length, first: gaps[0], rest: gaps.slice(1, 6) });
  // B closes Settings with focus restored (a stick walk moved rows only)
  f = await pad(1, 600);
  check('P8 B closes Settings, focus restored on Settings', f.stack === 'title' && f.id === 'ap-title-settings', f);
  // Records + Multiplayer by pad
  f = await pad(13); f = await pad(0, 600); const recStack = f.stack; f = await pad(1, 500);
  check('P9 Records open/close by A/B, focus restored', recStack === 'title>records' && f.id === 'ap-title-records', { recStack, f });
  // Exit confirm by pad: A opens, B cancels
  f = await pad(13); f = await pad(0, 500); const exStack = f.stack; const exFocus = f.id; f = await pad(1, 500);
  check('P10 Exit confirm by pad: A opens (Cancel focused), B cancels to Exit', exStack === 'title>confirm' && exFocus === 'ap-confirm-cancel' && f.id === 'ap-title-exit', { exStack, exFocus, f });
  // New Game by pad -> playing; Start = pause; Start again = resume; B = resume
  f = await pad(13); // New Game (wrap)
  f = await pad(0, 1500);
  check('P11 A on New Game -> playing', f.state === 'playing', f);
  await sleep(1200);
  f = await pad(9, 500); check('P12 Start opens pause in play', f.stack === 'pause', f);
  const hintsP = await page.evaluate(() => { const s = document.querySelector('[data-screen="pause"]'); return s ? s.innerText.split('\n').slice(-6).join(' ') : null; });
  log('pause hints after pad', hintsP);
  f = await pad(9, 500); check('P12b Start on the pause menu resumes', f.stack === '' && f.state === 'playing', f);
  f = await pad(9, 500); f = await pad(1, 500); check('P12c B on the pause menu resumes', f.stack === '' && f.state === 'playing', f);
  // Pause -> Settings -> B -> pause focus restored on Settings -> B -> resume
  f = await pad(9, 500); f = await pad(13); const onSet = f.id; f = await pad(0, 600); const inSet = f.stack; f = await pad(1, 600);
  check('P13 pause > Settings > B returns to pause with focus on Settings', inSet === 'pause>settings' && f.stack === 'pause' && f.id === onSet, { onSet, inSet, f });
  f = await pad(1, 500);
  // triggers (6/7) and other buttons on the title must not do anything surprising
  log('page errors', errors.length, errors.slice(0, 3));
  check('P14 0 page errors', errors.length === 0, errors.length);
  await page.screenshot({ path: `${CAP}/gntfixM16-cnavpad-end.png` });
} finally { await browser.close(); }
log('TOTAL FAILS', fails);
