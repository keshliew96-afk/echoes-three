// Menu critic r4 — B28 continued: invalid address + Enter, valid + Enter, Reset to automatic by keys, Esc, reload.
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM14-lib.mjs';
const log = logger(process.env.LOGNAME_M14 || 'gntfixM14-ctextin2');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const browser = await launch({ width: 1280, height: 720 });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: 1280, height: 720 });
  await reachTitle(page);
  const st = () => page.evaluate(() => { const a = document.activeElement; const f = window.__echoes.app.focus(); return { stack: window.__echoes.app.stack(), focus: f && f.id, label: f && f.label, ring: window.__echoes.app.ringCount(), activeTag: a && a.tagName, value: a && a.value, server: window.__echoes.settings.get('net.serverUrl') }; });
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'network' })); await sleep(800);
  for (let i = 0; i < 6 && (await focusInfo(page)).id !== 'nt-set-server'; i++) { await page.keyboard.press('ArrowDown'); await sleep(200); }
  await page.keyboard.type('http://example.com', { delay: 10 }); await page.keyboard.press('Enter'); await sleep(600);
  const inv = await page.evaluate(() => ({ server: window.__echoes.settings.get('net.serverUrl'), row: (document.querySelector('#nt-set-server') || {}).closest ? document.querySelector('#nt-set-server').closest('[class*="row"]')?.textContent.replace(/\s+/g, ' ') : null, all: document.querySelector('[data-screen="settings"]').textContent.replace(/\s+/g, ' ').match(/[^.]{0,60}ws:\/\/ or wss:\/\/[^.]{0,40}/)?.[0] }));
  await page.screenshot({ path: `${CAP}/gntfixM14-ctextin2-invalid.png` });
  check('T6 http:// + Enter refused with a reason, nothing saved', inv.server === '' && !!inv.all, inv);
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.type('ws://127.0.0.1:7841/echoes', { delay: 10 }); await page.keyboard.press('Enter'); await sleep(600);
  let s = await st();
  check('T7 ws:// + Enter saves, stays in Settings on the field', s.server === 'ws://127.0.0.1:7841/echoes' && s.stack.join() === 'title,settings', s);
  const walk = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowDown'); await sleep(220); const f = await st(); walk.push(f.focus || f.label); if (/automatic/i.test((f.label || '') + (f.focus || ''))) break; }
  const f8 = await st();
  if (/automatic/i.test((f8.label || '') + (f8.focus || ''))) { await page.keyboard.press('Enter'); await sleep(700); }
  s = await st();
  check('T8 Reset to automatic reachable by Down and resets the address', s.server === '', { walk, s });
  await page.keyboard.press('Escape'); await sleep(700);
  s = await st();
  check('T9 Esc (cursor on a button) backs to the title', s.stack.join() === 'title', s);
  check('T pageerrors', errors.length === 0, errors);
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
