// Menu critic r5 — B29: the Gameplay tab's new PARTY rows (Ally builds, Socket my new nodes) change something observable,
// by real keys in Settings (from the pause menu in camp), persist, and the ?party= param overrides without saving.
import { launch, open, logger, sleep, URL_BASE, CAP, focusInfo } from './gntfixM15-clib.mjs';
const log = logger('gntfixM15-allyrows');
let fails = 0;
const check = (name, ok, data) => { if (!ok) fails++; log(ok ? 'PASS' : 'FAIL', name, data === undefined ? '' : data); };
const rowText = (page, id) => page.evaluate((id) => { const el = document.getElementById(id); const row = el && (el.closest('[class*="row"]') || el.parentElement); return row ? row.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : null; }, id);
async function setViaUi(page, rowId, target, key) {
  await page.keyboard.press('Escape'); await sleep(500);
  for (let i = 0; i < 8 && (await focusInfo(page)).id !== 'pz-settings'; i++) { await page.keyboard.press('ArrowDown'); await sleep(180); }
  await page.keyboard.press('Enter'); await sleep(700);
  for (let i = 0; i < 5; i++) { const sel = await page.evaluate(() => { const s = document.querySelector('[data-screen="settings"] [aria-selected="true"]'); return s && s.id; }); if (sel === 'ap-tab-gameplay') break; await page.keyboard.press('KeyE'); await sleep(350); }
  for (let i = 0; i < 12 && (await focusInfo(page)).id !== rowId; i++) { await page.keyboard.press('ArrowDown'); await sleep(180); }
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const v = await page.evaluate((k) => window.__echoes.settings.get(k), key);
    seen.push(v);
    if (v === target) break;
    await page.keyboard.press('ArrowRight'); await sleep(300);
  }
  const txt = await rowText(page, rowId);
  await page.keyboard.press('Escape'); await sleep(500);
  await page.keyboard.press('Escape'); await sleep(500);
  return { seen, txt, final: await page.evaluate((k) => window.__echoes.settings.get(k), key), stack: await page.evaluate(() => window.__echoes.app.stack()) };
}
async function toReward(page) {
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__echoes.cmd('campState').inPortal, { timeout: 30000, polling: 50 });
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => { const r = window.__echoes.state().run; return r && r.phase === 'combat' && r.room === 1; }, { timeout: 30000 });
  for (let i = 0; i < 80; i++) { const ph = await page.evaluate(() => { window.__echoes.cmd('killAllEnemies'); const r = window.__echoes.state().run; return r && r.phase; }); if (ph === 'reward') break; await sleep(400); }
  await page.waitForFunction(() => { const u = window.__echoes.runUi(); return u.screen === 'draft' && u.settled; }, { timeout: 20000, polling: 100 }).catch(() => {});
  await sleep(700);
  return page.evaluate(() => { const r = window.__echoes.state().run; const u = window.__echoes.runUi(); return { mode: r.party && r.party.mode, cards: (r.party && r.party.cards || []).map((c) => [c.seat, c.decided, c.choice, c.by]), chips: ((u.draft || {}).tabs || []).map((t) => t.chip), partyMode: window.__echoes.party && window.__echoes.party.state ? window.__echoes.party.state().mode : null }; });
}
const browser = await launch({ width: 1600, height: 900, autoplay: true });
try {
  const results = {};
  for (const target of ['suggest', 'manual', 'auto']) {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1&seed=7&menu=0');
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
    await sleep(800);
    const ui = await setViaUi(page, 'pt-gameplay-allyBuilds', target, 'gameplay.allyBuilds');
    log(`A ${target} set by keys`, ui);
    const pg = await toReward(page);
    results[target] = pg;
    log(`A ${target} reward page`, pg);
    await page.screenshot({ path: `${CAP}/gntfixM15-allyrows-${target}.png` });
    check(`A ${target} pageerrors`, errors.length === 0, errors);
    await page.close();
  }
  const sig = (k) => JSON.stringify(results[k] && results[k].cards.slice(1));
  check('A1 Ally builds: the three values produce different ally cards on the next page (observable effect)', new Set(['suggest', 'manual', 'auto'].map(sig)).size >= 2, { suggest: results.suggest && results.suggest.chips, manual: results.manual && results.manual.chips, auto: results.auto && results.auto.chips });
  // persistence + ?party override
  {
    const { page, errors } = await open(browser, URL_BASE + '?seed=7&menu=0');
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 30, { timeout: 120000 });
    const p = await page.evaluate(() => ({ ally: window.__echoes.settings.get('gameplay.allyBuilds'), auto: window.__echoes.settings.get('gameplay.autoSocketOwn') }));
    log('P1 after reload (last set: auto)', p);
    check('P1 Ally builds persists across reload', p.ally === 'auto', p);
    await page.close();
    const { page: p2 } = await open(browser, URL_BASE + '?seed=7&menu=0&party=manual');
    await p2.waitForFunction(() => window.__echoes && window.__echoes.tick > 30, { timeout: 120000 });
    const o = await p2.evaluate(() => ({ stored: window.__echoes.settings.get('gameplay.allyBuilds'), mode: window.__echoes.party && window.__echoes.party.state ? window.__echoes.party.state().mode : null, blob: (() => { try { return JSON.parse(localStorage.getItem('echoes.settings')).data['gameplay.allyBuilds']; } catch { return null; } })() }));
    log('P2 ?party=manual', o);
    check('P2 ?party=manual overrides the mode for this boot without saving it', o.blob === 'auto', o);
    await p2.close();
  }
  // Socket my new nodes
  {
    const { page, errors } = await open(browser, URL_BASE + '?fresh=1&seed=7&menu=0');
    await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
    await sleep(800);
    const ui = await setViaUi(page, 'pt-gameplay-autoSocketOwn', true, 'gameplay.autoSocketOwn');
    log('S set by keys', ui);
    await toReward(page);
    const b0 = await page.evaluate(() => { const s = window.__echoes.state(); return { bench: ((s.build || {}).bench || []).map((b) => b.node), rows: ((s.build || {}).skills || []).map((k) => k.id + ':' + k.filled) }; });
    log('S reward page (On) Healer bench/rows', b0);
    check('S pageerrors', errors.length === 0, errors);
    await page.close();
    const { page: q, errors: e2 } = await open(browser, URL_BASE + '?fresh=1&seed=7&menu=0');
    await q.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
    await sleep(800);
    await toReward(q);
    const b1 = await q.evaluate(() => { const s = window.__echoes.state(); return { bench: ((s.build || {}).bench || []).map((b) => b.node), rows: ((s.build || {}).skills || []).map((k) => k.id + ':' + k.filled), setting: window.__echoes.settings.get('gameplay.autoSocketOwn') }; });
    log('S reward page (Off default) Healer bench/rows', b1);
    check('S1 Socket my new nodes On vs Off differs observably (bench vs sockets)', JSON.stringify(b0) !== JSON.stringify({ bench: b1.bench, rows: b1.rows }), { on: b0, off: b1 });
    await q.close();
  }
} catch (e) { fails++; log('ERR', String(e && e.stack || e)); } finally { log('TOTAL FAILS', fails); await browser.close(); }
