#!/usr/bin/env node
// fix-M2-r3 (F2) probe — how saves taken on the two level cards are described.
//   node tools/gntfixM23-cards.mjs [--url U] [--tag t]
// 1. New Game, portal (E) -> Level I campaign, skip to the Stag, kill it ->
//    the CLEAR card; pause > Save Game > Slot 1; title Continue caption.
// 2. Load Slot 1 again (on the card), abandon -> camp, Level Select choose II
//    (player path, lock-checked) -> the SETTING OUT card; Save > Slot 2.
// 3. Legacy files: Slot 1 / Slot 2 re-imported into Slot 3 / Slot 4 with
//    meta.campaign.card removed (as written before v0.5.104).
// 4. Title Continue caption; title Load Game rows (line 1) + each detail "Where".
// Pass: clear-card rows say "Level I cleared — next: Level II …", setting-out
// rows say "Setting out — Level II …", never "Level II cleared".
// Output: captures/gntfixM23-cards-<tag>.json (+ PNG of the load list)
import { launchEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = { url: 'http://127.0.0.1:5199/', tag: 'dev', w: 1600, h: 900 };
for (let i = 0; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = ['url', 'tag'].includes(k) ? argv[i + 1] : Number(argv[i + 1]);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { opt, startedAt: new Date().toISOString(), version: null, steps: {}, pageErrors: [] };
const log = (tag, v) => { out.steps[tag] = v; console.log(`[${tag}] ${JSON.stringify(v).slice(0, 1500)}`); };

const browser = await launchEchoes({ gpu: true, width: opt.w, height: opt.h, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => out.pageErrors.push(String((e && e.message) || e)));
  await page.goto(opt.url + '?fresh=1', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
  out.version = await page.evaluate(() => window.__echoes.version);
  await sleep(1500);
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    if ((await page.evaluate(() => window.__echoes.app && window.__echoes.app.state)) === 'title') break;
    await page.keyboard.press('Space');
    await sleep(300);
  }
  await sleep(600);
  const key = async (k, ms = 50) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); await sleep(50); };
  const foc = () => page.evaluate(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id, label: f && f.label }; });
  const navTo = async (id) => { for (const k of ['ArrowDown', 'ArrowUp']) for (let i = 0; i < 12; i++) { if ((await foc()).focus === id) return true; await key(k); await sleep(80); } return (await foc()).focus === id; };
  const saveTo = async (n) => {
    await key('Escape'); await sleep(450);
    await navTo('pz-save');
    await key('Enter'); await sleep(650);
    await navTo(`sv-slot-manual-${n}`);
    await key('Enter'); await sleep(900);
    const row = await page.evaluate((n) => { const e = document.getElementById(`sv-slot-manual-${n}`); return e ? e.querySelector('.sv-line').textContent : null; }, n);
    const where = await page.evaluate(() => { const dts = [...document.querySelectorAll('.sv-detail dt')]; const i = dts.findIndex((d) => d.textContent === 'Where'); return i >= 0 ? dts[i].nextElementSibling.textContent : null; });
    for (let i = 0; i < 5; i++) { if (!(await foc()).stack) break; await key('Escape'); await sleep(320); }
    return { row, where };
  };
  const titleCaption = async () => {
    await page.evaluate(() => window.__echoes.app.quitToTitle());
    await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 20000 });
    await sleep(700);
    return page.evaluate(() => { const e = document.getElementById('ap-title-continue'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; });
  };

  // 1. Level I clear card
  await key('Enter');
  await page.waitForFunction(() => window.__echoes.app.state === 'playing' && window.__echoes.tick >= 120, { timeout: 90000 });
  await sleep(500);
  await page.keyboard.down('KeyW');
  const tw = Date.now();
  while (Date.now() - tw < 20000) { if (await page.evaluate(() => { const c = window.__echoes.cmd('campState'); return !!(c && c.inPortal); })) break; await sleep(50); }
  await page.keyboard.up('KeyW');
  await key('KeyE');
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
  await page.waitForFunction(() => { const r = window.__echoes.state().run; return r.phase === 'combat' && r.boss && r.boss.active; }, { timeout: 30000 });
  await sleep(300);
  await page.waitForFunction(() => { const E = window.__echoes; try { E.cmd('killBoss'); } catch (e) {} E.cmd('killAllEnemies'); return E.state().run.phase === 'transit'; }, { timeout: 20000, polling: 50 });
  await sleep(400);
  const card1 = await page.evaluate(() => { const c = window.__echoes.campaign.state(); return c.card && { kind: c.card.kind, from: c.card.from, to: c.card.to }; });
  const s1 = await saveTo(1);
  log('clearCard', { card: card1, ...s1, pass: /^Level I cleared — next: Level II/.test(s1.row || '') && s1.row === s1.where });
  const cap1 = await titleCaption();
  log('titleClear', { caption: cap1, pass: /Level I cleared/.test(cap1 || '') });

  // 2. back on the card, abandon, Level Select II -> setting-out card
  await page.evaluate(() => window.__echoes.save.load('manual-1'));
  await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 20000 });
  await sleep(500);
  await page.evaluate(() => window.__echoes.cmd('abandonRun'));
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'idle', { timeout: 20000 });
  await sleep(1500);
  const ch = await page.evaluate(() => window.__echoes.cmd('campChoose', 2));
  await sleep(1200);
  const card2 = await page.evaluate(() => { const c = window.__echoes.campaign.state(); return c.card && { kind: c.card.kind, from: c.card.from, to: c.card.to, harness: c.harness }; });
  const s2 = await saveTo(2);
  log('departCard', { choose: ch, card: card2, ...s2, pass: /^Setting out — Level II · The Sunken Mill/.test(s2.row || '') && !/cleared/.test(s2.row || '') && s2.row === s2.where });

  // 3. legacy copies (meta.campaign.card removed) into Slot 3 / Slot 4
  const legacy = await page.evaluate(async () => {
    const S = window.__echoes.save;
    const res = {};
    for (const [from, to] of [['manual-1', 'manual-3'], ['manual-2', 'manual-4']]) {
      const f = JSON.parse(S.exportText(from));
      if (f.meta && f.meta.campaign) delete f.meta.campaign.card;
      f.slot.name = `Legacy ${from}`;
      const r = await S.importText(JSON.stringify(f), to);
      res[to] = { ok: r.ok, error: r.error || null };
    }
    return res;
  });
  log('legacyImport', legacy);
  const cap2 = await titleCaption();
  log('titleDepart', { caption: cap2, pass: /Setting out · Level II · The Sunken Mill/.test(cap2 || '') && !/cleared/.test(cap2 || '') });

  // 4. title Load Game: every row + detail
  await navTo('ap-title-load');
  await key('Enter');
  await sleep(800);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[id^="sv-slot-"]')].map((e) => ({ id: e.dataset.slot, name: e.querySelector('.sv-name').textContent, line: e.querySelector('.sv-line').textContent })));
  await page.screenshot({ path: join(root, 'captures', `gntfixM23-cards-${opt.tag}-loadlist.png`) });
  const expect = (r) => {
    if (r.id === 'manual-1' || r.id === 'manual-3') return /^Level I cleared — next: Level II · The Sunken Mill$/.test(r.line);
    if (r.id === 'manual-2' || r.id === 'manual-4') return /^Setting out — Level II · The Sunken Mill$/.test(r.line);
    return !/Level II cleared/.test(r.line);
  };
  log('loadList', { rows: rows.map((r) => ({ ...r, ok: expect(r) })), pass: rows.every(expect) });
} finally {
  await browser.close();
}
out.endedAt = new Date().toISOString();
out.summary = { version: out.version, pass: Object.fromEntries(Object.entries(out.steps).filter(([, v]) => v && 'pass' in v).map(([k, v]) => [k, v.pass])), pageErrors: out.pageErrors.length };
const file = join(root, 'captures', `gntfixM23-cards-${opt.tag}.json`);
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`[summary] ${JSON.stringify(out.summary)}`);
console.log(`[DONE] -> ${file}`);
