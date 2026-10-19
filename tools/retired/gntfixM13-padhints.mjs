// fix-M1-r3 — control-hint glyphs follow the last device on every menu (critic
// advisory: Settings kept keyboard glyphs after the title switched to the pad).
import { launch, open, reachTitle, logger, sleep, URL_BASE, installGamepad, padTap, focusInfo } from './gntcmenu3-lib.mjs';
const log = logger('gntfixM13-padhints');
let fails = 0;
const check = (n, ok, d) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', n, d === undefined ? '' : d); };
const hintText = (page, scr) => page.evaluate((s) => { const el = document.querySelector(`[data-screen="${s}"] .ap-hints`); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, scr);
const browser = await launch({ width: 1600, height: 900 });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  await reachTitle(page);
  await installGamepad(page);
  await sleep(300);
  await padTap(page, 13); await sleep(200);
  const t = await hintText(page, 'title');
  // pad to Settings: d-pad down until settings, A
  for (let i = 0; i < 8 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) await padTap(page, 13);
  await padTap(page, 0); await sleep(600);
  const s = await hintText(page, 'settings');
  check('title hints on pad', /LB|D-pad|\bA\b/.test(t || ''), t);
  check('settings hints on pad', /D-pad/.test(s || '') && /LB/.test(s || ''), s);
  await padTap(page, 1); await sleep(500);
  await page.keyboard.press('ArrowDown'); await sleep(300);
  const t2 = await hintText(page, 'title');
  await page.keyboard.press('ArrowUp'); await sleep(200);
  for (let i = 0; i < 8 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(150); }
  await page.keyboard.press('Enter'); await sleep(600);
  const s2 = await hintText(page, 'settings');
  check('back on keyboard: title + settings hints show keys', /Enter/.test(t2 || '') && /Esc/.test(s2 || ''), { t2, s2 });
  check('page errors', errors.length === 0, errors);
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { await browser.close(); log('TOTAL FAILS', fails); }
