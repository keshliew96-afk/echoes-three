// Menu critic r5 — reverse direction: boot with "Socket my new nodes" On stored, toggle it Off by a real Enter, read the
// row (live, after closing/reopening Settings, after a tab switch), then run the room-1 page and check the effect is Off.
import { launch, open, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-autosocket5');
const browser = await launch({ width: 1600, height: 900, autoplay: true });
const row = (page) => page.evaluate(() => { const el = document.getElementById('pt-gameplay-autoSocketOwn'); let p = el; while (p && p.parentElement && !/row/i.test(typeof p.className === 'string' ? p.className : '')) p = p.parentElement; return { value: window.__echoes.settings.get('gameplay.autoSocketOwn'), row: p && p.textContent.replace(/\s+/g, ' ').trim() }; });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1&menu=0&seed=7');
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 30, { timeout: 180000 });
  await page.evaluate(() => { window.__echoes.settings.set('gameplay.autoSocketOwn', true); window.__echoes.settings.persist && window.__echoes.settings.persist(); });
  await sleep(600);
  await page.goto(URL_BASE + '?menu=0&seed=7', { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 180000 });
  await sleep(600);
  await page.keyboard.press('Escape'); await sleep(500);
  for (let i = 0; i < 8 && (await focusInfo(page)).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(180); }
  await page.keyboard.press('Enter'); await sleep(700);
  for (let i = 0; i < 5; i++) { const sel = await page.evaluate(() => { const s = document.querySelector('[data-screen="settings"] [aria-selected="true"]'); return s && s.id; }); if (sel === 'ap-tab-gameplay') break; await page.keyboard.press('KeyE'); await sleep(350); }
  for (let i = 0; i < 12 && (await focusInfo(page)).id !== 'pt-gameplay-autoSocketOwn'; i++) { await page.keyboard.press('ArrowDown'); await sleep(180); }
  const r0 = await row(page);
  await page.keyboard.press('Enter'); await sleep(450);
  const r1 = await row(page);
  await page.screenshot({ path: `${CAP}/gntfixM15-autosocket5-toggled-off.png` });
  await page.keyboard.press('KeyQ'); await sleep(400); await page.keyboard.press('KeyE'); await sleep(500);
  const r2 = await row(page);
  await page.keyboard.press('Escape'); await sleep(500);
  await page.evaluate(() => { const b = document.querySelector('#pz-settings'); b && b.click(); }); await sleep(800);
  const r3 = await row(page);
  log('rows', { bootOn: r0, afterEnterOff: r1, afterTabSwitch: r2, afterReopen: r3 });
  while ((await page.evaluate(() => window.__echoes.app.stack().length)) > 0) { await page.keyboard.press('Escape'); await sleep(450); }
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__echoes.cmd('campState').inPortal, { timeout: 30000, polling: 50 });
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => { const r = window.__echoes.state().run; return r && r.phase === 'combat' && r.room === 1; }, { timeout: 30000 });
  for (let i = 0; i < 80; i++) { const ph = await page.evaluate(() => { window.__echoes.cmd('killAllEnemies'); const r = window.__echoes.state().run; return r && r.phase; }); if (ph === 'reward') break; await sleep(400); }
  await page.waitForFunction(() => { const u = window.__echoes.runUi(); return u.screen === 'draft' && u.settled; }, { timeout: 20000, polling: 100 }).catch(() => {});
  await sleep(700);
  await page.keyboard.press('Enter'); await sleep(1500);
  const b = await page.evaluate(() => { const s = window.__echoes.state(); const bd = s.build || {}; return { bench: (bd.bench || []).map((x) => x.node), filled: (bd.skills || []).map((k) => k.id + ':' + k.filled) }; });
  log('effect after commit with the value Off', b, 'errors', errors);
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
