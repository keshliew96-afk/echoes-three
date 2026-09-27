// Menu critic r4 — consequence of the Esc-committed half-typed address: what does Multiplayer show?
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM14-lib.mjs';
const log = logger(process.env.LOGNAME_M14 || 'gntfixM14-textesc2');
const browser = await launch({ width: 1280, height: 720 });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: 1280, height: 720 });
  await reachTitle(page);
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'network' })); await sleep(800);
  for (let i = 0; i < 6 && (await focusInfo(page)).id !== 'nt-set-server'; i++) { await page.keyboard.press('ArrowDown'); await sleep(200); }
  await page.keyboard.type('ws://12', { delay: 20 }); await page.keyboard.press('Escape'); await sleep(700);
  const saved = await page.evaluate(() => window.__echoes.settings.get('net.serverUrl'));
  // reload (a later visit), then Multiplayer
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForFunction(() => !!window.__echoes, { timeout: 180000 }); await reachTitle(page);
  for (let i = 0; i < 8 && (await focusInfo(page)).id !== 'ap-title-multiplayer'; i++) { await page.keyboard.press('ArrowDown'); await sleep(200); }
  await page.keyboard.press('Enter'); await sleep(7000);
  const mp = await page.evaluate(() => ({ stack: window.__echoes.app.stack(), text: (document.querySelector('[data-screen="mp-menu"]') || {}).textContent, focus: window.__echoes.app.focus() && window.__echoes.app.focus().label }));
  await page.screenshot({ path: log.file.replace(/.log$/, "-mp.png") });
  log({ saved, afterReload: await page.evaluate(() => window.__echoes.settings.get('net.serverUrl')), mp: { stack: mp.stack, focus: mp.focus, text: mp.text && mp.text.replace(/\s+/g, ' ').slice(0, 500) }, errors });
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
