// fix-M1-r4: the Join-by-code dialog (a text dialog without a live-save hook) still backs out on ONE Esc after typing.
import { launch, open, reachTitle, logger, sleep, URL_BASE } from './gntfixM14-lib.mjs';
const log = logger('gntfixM14-join' + (process.env.LOGSUFFIX ? '-' + process.env.LOGSUFFIX : ''));
const browser = await launch({ width: 1280, height: 720 });
let fails = 0;
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: 1280, height: 720 });
  await reachTitle(page);
  await page.evaluate(() => window.__echoes.app.open('mp-join'));
  await sleep(700);
  const s0 = await page.evaluate(() => ({ stack: window.__echoes.app.stack(), active: document.activeElement && document.activeElement.id }));
  await page.keyboard.type('ABCDE', { delay: 30 });
  await page.keyboard.press('Escape');
  await sleep(600);
  const s1 = await page.evaluate(() => ({ stack: window.__echoes.app.stack(), active: document.activeElement && document.activeElement.id, focus: window.__echoes.app.focus() && window.__echoes.app.focus().id, ring: window.__echoes.app.ringCount() }));
  const ok = s0.active === 'nt-join-code' && s1.stack.join() === 'title' && s1.ring === 1 && s1.active !== 'nt-join-code';
  if (!ok) fails++;
  log(ok ? 'PASS' : 'FAIL', 'J1 join code typed + ONE Esc -> back to the title, caret gone, ring 1', { s0, s1 });
  if (errors.length) fails++;
  log(errors.length ? 'FAIL' : 'PASS', '0 page errors', errors);
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
