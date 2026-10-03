// Menu critic r4 — Esc semantics inside Settings > Network text fields: does one Esc commit an uncommitted edit and close Settings?
import { launch, open, reachTitle, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM14-lib.mjs';
const log = logger(process.env.LOGNAME_M14 || 'gntfixM14-textesc');
const browser = await launch({ width: 1280, height: 720 });
try {
  const { page, errors } = await open(browser, URL_BASE + '?fresh=1', { width: 1280, height: 720 });
  await reachTitle(page);
  const st = () => page.evaluate(() => { const a = document.activeElement; return { stack: window.__echoes.app.stack(), focus: window.__echoes.app.focus() && window.__echoes.app.focus().id, active: a && (a.id || a.tagName), value: a && a.value, name: window.__echoes.settings.get('net.playerName'), server: window.__echoes.settings.get('net.serverUrl'), stored: (() => { try { const d = JSON.parse(localStorage.getItem('echoes.settings')).data; return [d['net.playerName'], d['net.serverUrl']]; } catch { return null; } })() }; });
  const toField = async (id) => {
    await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'network' })); await sleep(800);
    for (let i = 0; i < 6 && (await focusInfo(page)).id !== id; i++) { await page.keyboard.press('ArrowDown'); await sleep(200); }
    return st();
  };
  const cases = [
    ['nt-set-server', 'ws://12', 'half-typed address'],
    ['nt-set-server', 'http://oops', 'invalid scheme'],
    ['nt-set-server', 'ws://127.0.0.1:7841/echoes', 'valid but uncommitted'],
    ['nt-set-name', 'Zed', 'player name'],
  ];
  for (const [id, text, label] of cases) {
    // reset to defaults first
    await page.evaluate(() => { window.__echoes.settings.set('net.serverUrl', '', { source: 'ui' }); window.__echoes.settings.set('net.playerName', 'Mouse111', { source: 'ui' }); }); await sleep(300);
    const s0 = await toField(id);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.type(text, { delay: 15 }); await sleep(200);
    const s1 = await st();
    await page.keyboard.press('Escape'); await sleep(700);
    const s2 = await st();
    const toasts = await page.evaluate(() => (window.__echoes.app.toasts() || []).slice(-2).map((t) => t.text));
    log(label, { focusBefore: s0.focus, typed: s1.value, afterEsc: { stack: s2.stack, focus: s2.focus, name: s2.name, server: s2.server, stored: s2.stored }, toasts });
    // close anything left
    for (let i = 0; i < 4 && (await st()).stack.length > 1; i++) { await page.keyboard.press('Escape'); await sleep(400); }
  }
  // what does Settings > Network show after the "ws://12" case? reopen and screenshot
  await page.evaluate(() => { window.__echoes.settings.set('net.serverUrl', '', { source: 'ui' }); }); await sleep(200);
  await toField('nt-set-server');
  await page.keyboard.type('ws://12', { delay: 15 }); await page.keyboard.press('Escape'); await sleep(600);
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'network' })); await sleep(900);
  await page.screenshot({ path: log.file.replace(/.log$/, "-after-halftyped.png") });
  log('reopened', await page.evaluate(() => document.querySelector('[data-screen="settings"]').textContent.replace(/\s+/g, ' ').match(/Server address.{0,160}/)?.[0]));
  log('errors', errors);
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
