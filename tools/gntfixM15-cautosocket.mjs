// Menu critic r5 — "Socket my new nodes" (gameplay.autoSocketOwn): row copy in each state (pixels) and its effect after the
// room-1 page commits (Healer bench vs sockets), On vs Off, same seed.
import { launch, open, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-autosocket');
const browser = await launch({ width: 1600, height: 900, autoplay: true });
const build = (page) => page.evaluate(() => { const s = window.__echoes.state(); const b = s.build || {}; return { bench: (b.bench || []).map((x) => x.node), rows: (b.skills || []).map((k) => ({ id: k.id, filled: k.filled, nodes: (k.sockets || k.nodes || []).map((n) => n && (n.node || n.id || n)).filter(Boolean) })), phase: s.run && s.run.phase, screen: window.__echoes.runUi().screen, socket: window.__echoes.content && window.__echoes.content.socketUi ? !!(window.__echoes.content.socketUi() || {}).open : null }; });
try {
  for (const on of [true, false]) {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1&seed=7&menu=0');
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
    await sleep(800);
    await page.keyboard.press('Escape'); await sleep(500);
    for (let i = 0; i < 8 && (await focusInfo(page)).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(180); }
    await page.keyboard.press('Enter'); await sleep(700);
    for (let i = 0; i < 5; i++) { const sel = await page.evaluate(() => { const s = document.querySelector('[data-screen="settings"] [aria-selected="true"]'); return s && s.id; }); if (sel === 'ap-tab-gameplay') break; await page.keyboard.press('KeyE'); await sleep(350); }
    for (let i = 0; i < 12 && (await focusInfo(page)).id !== 'pt-gameplay-autoSocketOwn'; i++) { await page.keyboard.press('ArrowDown'); await sleep(180); }
    const rowTxt = () => page.evaluate(() => { const el = document.getElementById('pt-gameplay-autoSocketOwn'); let p = el; for (let i = 0; i < 4 && p && !/Socket my new nodes/.test(p.textContent) ; i++) p = p.parentElement; while (p && p.parentElement && p.parentElement.textContent.replace(/\s+/g, ' ').length < 160 && /Socket my new nodes/.test(p.parentElement.textContent)) p = p.parentElement; return p ? p.textContent.replace(/\s+/g, ' ').trim() : null; });
    const t0 = await rowTxt();
    if (on) { await page.keyboard.press('Enter'); await sleep(400); }
    const t1 = await rowTxt();
    const v = await page.evaluate(() => window.__echoes.settings.get('gameplay.autoSocketOwn'));
    await page.screenshot({ path: `${CAP}/gntfixM15-autosocket-row-${on ? 'on' : 'off'}.png` });
    log(`${on ? 'ON' : 'OFF'} row`, { before: t0, after: t1, value: v });
    await page.keyboard.press('Escape'); await sleep(500); await page.keyboard.press('Escape'); await sleep(500);
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => window.__echoes.cmd('campState').inPortal, { timeout: 30000, polling: 50 });
    await page.keyboard.up('KeyW');
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => { const r = window.__echoes.state().run; return r && r.phase === 'combat' && r.room === 1; }, { timeout: 30000 });
    for (let i = 0; i < 80; i++) { const ph = await page.evaluate(() => { window.__echoes.cmd('killAllEnemies'); const r = window.__echoes.state().run; return r && r.phase; }); if (ph === 'reward') break; await sleep(400); }
    await page.waitForFunction(() => { const u = window.__echoes.runUi(); return u.screen === 'draft' && u.settled; }, { timeout: 20000, polling: 100 }).catch(() => {});
    await sleep(700);
    const b0 = await build(page);
    await page.keyboard.press('Enter'); await sleep(1500);
    const b1 = await build(page);
    await page.screenshot({ path: `${CAP}/gntfixM15-autosocket-after-${on ? 'on' : 'off'}.png` });
    log(`${on ? 'ON' : 'OFF'} build`, { atPage: b0, afterCommit: b1, errors });
    await page.close();
  }
} catch (e) { log('ERR', String(e && e.stack || e)); } finally { await browser.close(); }
