#!/usr/bin/env node
// fix-INT-r3 J3-F1 probe: how is a save taken on a Level-N SETTING-OUT card
// described — the autosave row + Load detail "Where" (critic journey O1b),
// a manual Slot 1 row and the title's Continue caption (critic departsave)?
//   node tools/gntfixINT3-departsave.mjs <baseUrl> <tag> [--path real|unlock]
// path real  : Level 1 cleared (setup: startCampaign L1, skipToRoom 8, kill
//              the Stag) -> the clear card -> Level 2 -> pause -> Quit to
//              Lobby (keys) -> Levels (L key at the portal prompt is the
//              player path; setup opens it with cmd('campLevels')) -> Level II
//              -> Enter -> on the SETTING OUT card: Esc -> Load Game.
// path unlock: campaign.unlock([1,2]) setup instead of the clear.
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync } from 'fs';

const argv = process.argv.slice(2);
const base = argv[0] || 'http://127.0.0.1:5199';
const tag = argv[1] || 'dev';
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const path = opt('path', 'real');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(page, body, { timeout = 30000, every = 50 } = {}) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return Date.now() - t0; } catch { /* */ } await sleep(every); } return -1; }
async function press(page, key, times = 1, gap = 120) { for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(gap); } }
const focusOf = (page) => page.evaluate(() => (window.__echoes.app.focus() || {}).id ?? null);
async function navTo(page, id, max = 24) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowDown'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowUp'); if ((await focusOf(page)) === id) return true; } return false; }
async function navH(page, id, max = 6) { if ((await focusOf(page)) === id) return true; for (let i = 0; i < max; i++) { await press(page, 'ArrowLeft'); if ((await focusOf(page)) === id) return true; } for (let i = 0; i < max; i++) { await press(page, 'ArrowRight'); if ((await focusOf(page)) === id) return true; } return false; }
const txt = (page, id) => page.evaluate((i) => ((document.getElementById(i) || {}).textContent || '').replace(/\s+/g, ' ').trim(), id);
const out = { schema: 'gntfixINT3-departsave/1', at: new Date().toISOString(), base, tag, path, checks: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail).slice(0, 300)}`); };

const browser = await launchEchoes({ gpu: true, background: true });
try {
  const ctx = await browser.createBrowserContext();
  const { page, errors } = await openEchoes(ctx, `${base}/?fresh=1`);
  await waitFor(page, `(window.__echoes.app.focus()||{}).label==='Press any key or click' || window.__echoes.app.state==='title'`, { timeout: 90000 });
  await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 });
  await navTo(page, 'ap-title-new'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 20000 }); await sleep(1200);
  if (path === 'real') {
    await page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 })); // setup
    await waitFor(page, `window.__echoes.state().run.phase==='combat'`);
    await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8)); // setup
    await waitFor(page, `window.__echoes.state().run.room===8 && window.__echoes.state().run.phase==='combat'`, { timeout: 20000 });
    for (let i = 0; i < 40; i++) { await page.evaluate(() => { try { window.__echoes.cmd('bossHp', 0.001); } catch { /* */ } window.__echoes.cmd('killAllEnemies'); }); await sleep(250); if (await page.evaluate(() => window.__echoes.state().run.phase === 'transit')) break; }
    const cleared = await waitFor(page, `window.__echoes.state().run.phase==='transit'`, { timeout: 20000 });
    check('L1 cleared -> clear card', cleared >= 0, { cleared });
    await waitFor(page, `window.__echoes.state().run.phase==='combat' && window.__echoes.state().run.room===1`, { timeout: 20000 }); await sleep(1500);
    await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`);
    const lob = await navTo(page, 'pz-lobby'); await press(page, 'Enter'); await sleep(450);
    if (await page.evaluate(() => window.__echoes.app.stack().includes('confirm'))) { await navH(page, 'ap-confirm-ok'); await press(page, 'Enter'); }
    const inCamp = await waitFor(page, `window.__echoes.app.stack().length===0 && !window.__echoes.state().run.active`, { timeout: 20000 });
    check('Quit to Lobby by keys -> camp', lob && inCamp >= 0, { lob, inCamp });
    await sleep(1200);
  } else {
    await page.evaluate(() => window.__echoes.campaign.unlock([1, 2])); // setup
  }
  await page.evaluate(() => window.__echoes.cmd('campLevels')); // setup: the map table's E / the portal prompt's L
  await waitFor(page, `window.__echoes.app.stack().includes('levels')`, { timeout: 8000 }); await sleep(450);
  for (let i = 0; i < 4; i++) { const f = await page.evaluate(() => (window.__echoes.app.focus() || {}).label || ''); if (/Level 2/.test(f)) break; await press(page, 'ArrowRight', 1, 160); }
  const lvFocus = await page.evaluate(() => (window.__echoes.app.focus() || {}).label || '');
  await press(page, 'Enter');
  const card = await waitFor(page, `window.__echoes.state().run.phase==='transit'`, { timeout: 10000 });
  const cardText = await page.evaluate(() => ((window.__echoes.runUi() || {}).text || '').slice(0, 120));
  check('Level II chosen -> setting-out card', card >= 0 && /SETTING OUT/i.test(cardText), { lvFocus, cardText });
  await sleep(900); // the level_transit autosave lands
  await press(page, 'Escape'); await waitFor(page, `window.__echoes.app.stack().includes('pause')`, { timeout: 8000 });
  // Load Game list: the autosave written on this card
  await navTo(page, 'pz-load'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`, { timeout: 8000 }); await sleep(700);
  const autos = await page.evaluate(() => window.__echoes.save.list().filter((x) => x.id.startsWith('auto')).map((x) => ({ id: x.id, phase: x.meta.phase, level: x.meta.level, room: x.meta.room, card: x.meta.campaign && x.meta.campaign.card })));
  const cardAuto = autos.find((a) => a.phase === 'transit' && a.level === 2 && a.room === 0);
  const autoRow = cardAuto ? await txt(page, `sv-slot-${cardAuto.id}`) : null;
  if (cardAuto) { await navTo(page, `sv-slot-${cardAuto.id}`, 20); await sleep(400); }
  const where = await page.evaluate(() => { const el = document.querySelector('[data-screen="saves"]'); const t = el ? el.innerText : ''; const m = t.match(/Where[^\n]*\n?[^\n]*/); return m ? m[0].replace(/\s+/g, ' ') : null; });
  await page.screenshot({ path: `captures/gntfixINT3-departsave-${tag}-load.png` });
  check('autosave on the setting-out card: row says Setting out, never "cleared"', cardAuto && /Setting out/.test(autoRow) && !/cleared/i.test(autoRow), { autos, autoRow });
  check('Load detail Where says Setting out, never "cleared"', where && /Setting out/.test(where) && !/cleared/i.test(where), { where });
  await press(page, 'Escape'); await sleep(400);
  // manual Slot 1 on the same card
  await navTo(page, 'pz-save'); await press(page, 'Enter'); await waitFor(page, `window.__echoes.app.stack().includes('saves')`, { timeout: 8000 }); await sleep(500);
  await navTo(page, 'sv-slot-manual-1', 20); await press(page, 'Enter'); await sleep(500);
  for (let i = 0; i < 3; i++) { const st = await page.evaluate(() => window.__echoes.app.stack()); if (st.includes('confirm')) { await navH(page, 'ap-confirm-ok'); await press(page, 'Enter'); await sleep(400); } else if (st.includes('sv-rename')) { await press(page, 'Enter'); await sleep(400); } else break; }
  await waitFor(page, `window.__echoes.save.list().some(x=>x.id==='manual-1')`, { timeout: 15000 }); await sleep(600);
  const row = await txt(page, 'sv-slot-manual-1');
  check('manual Slot 1 row says Setting out', /Setting out/.test(row) && !/cleared/i.test(row), { row });
  await press(page, 'Escape'); await sleep(400);
  await navTo(page, 'pz-quit'); await press(page, 'Enter'); await sleep(450);
  if (await page.evaluate(() => window.__echoes.app.stack().includes('confirm'))) { await navH(page, 'ap-confirm-ok'); await press(page, 'Enter'); }
  await waitFor(page, `window.__echoes.app.state==='title'`, { timeout: 20000 }); await sleep(900);
  const cont = await txt(page, 'ap-title-continue');
  await page.screenshot({ path: `captures/gntfixINT3-departsave-${tag}-title.png` });
  check('title Continue says Setting out · Level II', /Setting out · Level II/.test(cont) && !/cleared/i.test(cont), { cont });
  // Continue restores the card state
  await navTo(page, 'ap-title-continue'); await press(page, 'Enter');
  const back = await waitFor(page, `window.__echoes.app.state==='playing'`, { timeout: 20000 }); await sleep(600);
  const st = await page.evaluate(() => { const r = window.__echoes.state().run; return { phase: r.phase, room: r.room, level: window.__echoes.save.capture().systems.run.act }; });
  check('Continue -> the setting-out card / Level II', back >= 0 && (st.phase === 'transit' || (st.level === 2 && st.room <= 1)), st);
  out.errors = errors;
  check('0 page errors', errors.length === 0, { errors: errors.slice(0, 3) });
  await ctx.close();
} catch (e) {
  out.harnessError = String((e && e.stack) || e);
  console.error('[HARNESS-ERROR]', out.harnessError);
} finally {
  await browser.close();
}
out.pass = out.checks.filter((c) => c.ok).length;
out.total = out.checks.length;
writeFileSync(`captures/gntfixINT3-departsave-${tag}.json`, JSON.stringify(out, null, 1));
console.log(`RESULT ${out.pass}/${out.total}`);
process.exit(out.harnessError ? 1 : 0);
