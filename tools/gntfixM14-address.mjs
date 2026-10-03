// fix-M1-r4 (MENU-R4-F1 follow-up, src/net/address.js) — an address the URL
// parser would rewrite ("ws://12" -> ws://0.0.0.12) or an unroutable 0.x host
// is refused with a reason in Settings ▸ Network, by real keys + Enter; a valid
// one still saves; a ws://0.0.0.12 stored by the old bug reads as Automatic
// after a reload and Multiplayer no longer names it.
// Usage: node tools/gntfixM14-address.mjs   (ECHOES_URL for a preview)
import { launch, open, reachTitle, logger, sleep, URL_BASE, focusInfo } from './gntfixM14-lib.mjs';

const log = logger('gntfixM14-address' + (process.env.LOGSUFFIX ? '-' + process.env.LOGSUFFIX : ''));
let fails = 0;
const check = (name, ok, data) => {
  if (!ok) fails++;
  log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data);
};
const browser = await launch({ width: 1280, height: 720 });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: 1280, height: 720 });
  log('url', URL_BASE, 'version', await page.evaluate(() => window.__echoes.version));
  await reachTitle(page);
  const st = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      const i = document.getElementById('nt-set-server');
      const n = i && i.closest('.ap-row') && i.closest('.ap-row').querySelector('.ap-note');
      let stored = null;
      try {
        stored = JSON.parse(localStorage.getItem('echoes.settings')).data['net.serverUrl'];
      } catch {
        stored = null;
      }
      return { stack: window.__echoes.app.stack(), active: a && (a.id || a.tagName), value: i && i.value, server: window.__echoes.settings.get('net.serverUrl'), stored, note: n && n.textContent };
    });
  const key = async (code, wait = 250) => {
    await page.keyboard.press(code);
    await sleep(wait);
  };
  for (let i = 0; i < 10 && (await focusInfo(page)).id !== 'ap-title-settings'; i++) await key('ArrowDown', 200);
  await key('Enter', 700);
  for (let i = 0; i < 6 && !(await page.evaluate(() => !!document.querySelector('#ap-tab-network[aria-selected="true"]'))); i++) await key('KeyE', 350);
  for (let i = 0; i < 6 && (await st()).active !== 'nt-set-server'; i++) await key('ArrowDown', 220);
  const cases = [
    ['ws://12', false, /“12” isn’t a full address \(it would reach 0\.0\.0\.12\)/],
    ['ws://192.168.1:7800/echoes', false, /“192\.168\.1” isn’t a full address \(it would reach 192\.168\.0\.1\)/],
    ['ws://0.0.0.0:7800/echoes', false, /0\.0\.0\.0 is where a server listens/],
    ['ws://192.168.1.20:7800/echoes', true, /Saved/],
  ];
  for (const [text, ok, re] of cases) {
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.type(text, { delay: 10 });
    await key('Enter', 500);
    const s = await st();
    check(`A ${text} + Enter -> ${ok ? 'saved' : 'refused with a reason, nothing saved'}`, ok ? s.server === text && s.stored === text && re.test(s.note || '') : s.server === '' && !s.stored && re.test(s.note || ''), s);
    if (ok) {
      await page.evaluate(() => window.__echoes.settings.set('net.serverUrl', '', { source: 'ui' }));
      await sleep(200);
    }
  }
  // A value the old bug stored: reload -> Automatic, Multiplayer resolves this site.
  await page.evaluate(() => {
    const doc = JSON.parse(localStorage.getItem('echoes.settings'));
    doc.data['net.serverUrl'] = 'ws://0.0.0.12';
    localStorage.setItem('echoes.settings', JSON.stringify(doc));
  });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes, { timeout: 180000 });
  await reachTitle(page);
  const b = await page.evaluate(() => ({ server: window.__echoes.settings.get('net.serverUrl'), info: window.__echoes.net && window.__echoes.net.addressInfo ? window.__echoes.net.addressInfo() : null }));
  check('B a stored ws://0.0.0.12 (old bug) reads as Automatic after a reload', b.server === '' && (!b.info || b.info.source === 'site'), b);
  check('0 page errors', errors.length === 0, errors);
} catch (e) {
  fails++;
  log('ERR', String((e && e.stack) || e));
} finally {
  await browser.close();
  log('TOTAL FAILS', fails);
}
