// Menu critic r5 — "Socket my new nodes" row sub-line vs value: toggled by Enter, by ArrowRight/Left, by mouse click, and
// after a reload with the value On (fresh render of the tab). Title Settings (no run needed).
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-autosocket2');
const browser = await launch({ width: 1600, height: 900 });
const sub = (page) => page.evaluate(() => {
  const el = document.getElementById('pt-gameplay-autoSocketOwn');
  const ally = document.getElementById('pt-gameplay-allyBuilds');
  const rowOf = (x) => { let p = x; while (p && p.parentElement && !/row/i.test(typeof p.className === 'string' ? p.className : '')) p = p.parentElement; return p; };
  const r = el && rowOf(el); const ra = ally && rowOf(ally);
  return { value: window.__echoes.settings.get('gameplay.autoSocketOwn'), row: r ? r.textContent.replace(/\s+/g, ' ').trim() : null, allyValue: window.__echoes.settings.get('gameplay.allyBuilds'), allyRow: ra ? ra.textContent.replace(/\s+/g, ' ').trim() : null };
});
async function toTab(page) {
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'gameplay' })); await sleep(800);
  for (let i = 0; i < 12 && (await focusInfo(page)).id !== 'pt-gameplay-autoSocketOwn'; i++) { await page.keyboard.press('ArrowDown'); await sleep(180); }
}
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1');
  await reachTitle(page);
  await toTab(page);
  const s0 = await sub(page);
  await page.keyboard.press('Enter'); await sleep(400); const s1 = await sub(page);
  await page.keyboard.press('ArrowLeft'); await sleep(400); const s2 = await sub(page);
  await page.keyboard.press('ArrowRight'); await sleep(400); const s3 = await sub(page);
  log('keys', { s0, s1, s2, s3 });
  // Ally builds for comparison (its sub-line follows the value)
  await page.keyboard.press('ArrowUp'); await sleep(250);
  await page.keyboard.press('ArrowRight'); await sleep(400); const a1 = await sub(page);
  await page.keyboard.press('ArrowLeft'); await sleep(400);
  log('ally compare', { allyValue: a1.allyValue, allyRow: a1.allyRow });
  await page.keyboard.press('Escape'); await sleep(600);
  // reload with the value On persisted
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => !!window.__echoes, { timeout: 180000 });
  await reachTitle(page);
  await toTab(page);
  const r1 = await sub(page);
  await page.screenshot({ path: `${CAP}/gntfixM15-autosocket2-reload-on.png` });
  log('after reload', r1);
  // mouse click on the toggle
  const box = await page.evaluate(() => { const r = document.getElementById('pt-gameplay-autoSocketOwn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.click(box.x, box.y); await sleep(400); const m1 = await sub(page);
  log('mouse click', m1);
  log('errors', errors);
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
