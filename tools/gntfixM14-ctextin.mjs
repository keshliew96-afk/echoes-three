// Menu critic r4 — B28: text fields in Settings > Network (player name, server address) by real keys: typing letters that are
// nav keys (W A S D Q E), Enter commits, Esc behaviour, Up/Down leave the field, invalid address, Reset to automatic.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM14-lib.mjs';
const log = logger(process.env.LOGNAME_M14 || 'gntfixM14-ctextin');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({ width: 1280, height: 720 });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: 1280, height: 720 });
  await reachTitle(page);
  const st = () => page.evaluate(() => { const a = document.activeElement; const f = window.__echoes.app.focus(); return { stack: window.__echoes.app.stack(), focus: f && f.id, ring: window.__echoes.app.ringCount(), active: a && (a.id || a.tagName), activeTag: a && a.tagName, value: a && a.value, name: window.__echoes.settings.get('net.playerName'), server: window.__echoes.settings.get('net.serverUrl'), tab: (document.querySelector('[data-screen="settings"] [aria-selected="true"]') || {}).id }; });
  await page.evaluate(() => window.__echoes.app.open('settings')); await sleep(700);
  for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyE'); await sleep(350); }
  let s = await st();
  check('T0 E x4 -> Network tab, cursor on the tab stop', s.tab === 'ap-tab-network', s);
  await page.keyboard.press('ArrowDown'); await sleep(300);
  s = await st();
  log('T1 Down from the tab', s);
  const nameFocused = s.focus === 'nt-set-name';
  // typing into the field: does the field get DOM focus without an extra Enter?
  const needEnter = s.activeTag !== 'INPUT';
  if (needEnter) { await page.keyboard.press('Enter'); await sleep(300); s = await st(); log('T1b after Enter to edit', s); }
  check('T1 Down reaches Player name and the field takes typing', nameFocused && s.activeTag === 'INPUT', { needEnter, s });
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.type('Wasd Qe', { delay: 40 }); await sleep(300);
  s = await st();
  check('T2 typing W A S D Q E goes into the field (not nav, not tab switch)', s.value === 'Wasd Qe' && s.tab === 'ap-tab-network' && s.stack.join() === 'title,settings', s);
  await page.keyboard.press('Enter'); await sleep(500);
  s = await st();
  check('T3 Enter commits the name', s.name === 'Wasd Qe', s);
  await page.keyboard.press('ArrowDown'); await sleep(300);
  s = await st();
  log('T4 Down after commit', s);
  if (s.activeTag !== 'INPUT' && s.focus === 'nt-set-server') { await page.keyboard.press('Enter'); await sleep(300); s = await st(); }
  check('T4 Down moves to Server address', s.focus === 'nt-set-server', s);
  // Esc while editing with an uncommitted address
  await page.keyboard.type('ws://127.0.0.1:7841/echoes', { delay: 15 }); await sleep(200);
  const beforeEsc = await st();
  await page.keyboard.press('Escape'); await sleep(500);
  const afterEsc = await st();
  log('T5 Esc while editing (uncommitted address)', { beforeEsc, afterEsc });
  check('T5 Esc while editing leaves the field without committing the address and without closing Settings', afterEsc.server === '' && afterEsc.stack.join() === 'title,settings' && afterEsc.ring === 1, { beforeEsc, afterEsc });
  // invalid address
  await page.keyboard.press('Enter'); await sleep(300); // re-enter the field if needed
  s = await st();
  if (s.activeTag !== 'INPUT') { await page.evaluate(() => { const i = document.querySelector('#nt-set-server input, input#nt-set-server'); i && i.focus(); }); }
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.type('http://example.com', { delay: 10 }); await page.keyboard.press('Enter'); await sleep(500);
  const inv = await page.evaluate(() => ({ server: window.__echoes.settings.get('net.serverUrl'), text: document.querySelector('[data-screen="settings"] [data-tab-body].active, [data-screen="settings"]').textContent.replace(/\s+/g, ' ').match(/[^.]*ws:\/\/ or wss:\/\/[^.]*/)?.[0] }));
  check('T6 invalid http:// address refused with a reason', inv.server === '' && !!inv.text, inv);
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.type('ws://127.0.0.1:7841/echoes', { delay: 10 }); await page.keyboard.press('Enter'); await sleep(600);
  s = await st();
  const resetEnabled = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-screen="settings"] button')].find((x) => /Reset to automatic/.test(x.textContent)); return b ? !(b.disabled || b.getAttribute('aria-disabled') === 'true') : null; });
  await page.screenshot({ path: `${CAP}/gntfixM14-ctextin-custom.png` });
  check('T7 valid ws:// + Enter saves; Reset to automatic becomes enabled', s.server === 'ws://127.0.0.1:7841/echoes' && resetEnabled === true, { s, resetEnabled });
  // leave the field with Up, walk to Reset to automatic by keys
  const walk = [];
  for (let i = 0; i < 8; i++) { const f = await st(); walk.push(f.focus + (f.activeTag === 'INPUT' ? '(input)' : '')); if (/automatic|reset-auto|nt-set-auto/i.test(f.focus || '')) break; await page.keyboard.press('ArrowRight'); await sleep(200); const g = await st(); if (g.focus === f.focus) { await page.keyboard.press('ArrowDown'); await sleep(200); } }
  log('T8 walk to Reset to automatic', walk);
  const f8 = await st();
  if (/automatic|nt-set-auto/i.test(f8.focus || '')) { await page.keyboard.press('Enter'); await sleep(600); }
  s = await st();
  check('T8 Reset to automatic reachable by keys and resets the address', s.server === '', { walk, s });
  // Esc with no field editing closes Settings exactly one level
  for (let i = 0; i < 3 && (await st()).activeTag === 'INPUT'; i++) { await page.keyboard.press('Escape'); await sleep(300); }
  await page.keyboard.press('Escape'); await sleep(700);
  s = await st();
  check('T9 Esc (not editing) backs to the title', s.stack.join() === 'title', s);
  // reload: name persisted
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForFunction(() => !!window.__echoes, { timeout: 180000 }); await reachTitle(page);
  s = await st();
  check('T10 name persists after reload, server stays automatic', s.name === 'Wasd Qe' && s.server === '', s);
  check('T pageerrors', errors.length === 0, errors);
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
