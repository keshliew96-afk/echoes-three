#!/usr/bin/env node
// fix-M2-r3 (F1) probe — mouse paths on the saves screen: does the detail
// panel's Load / Export / Delete act on the slot the player chose?
//   node tools/gntfixM23-mousepaths.mjs [--url U] [--w 1600] [--h 900] [--tag t] [--headful 0]
// Setup: fresh profile, New Game, three manual saves at three positions (keyboard).
// Title > Load Game (mouse). Each trial: hover the chosen row, rest 700 ms (the
// panel previews it), then move to a panel button along a path and click:
//   straight 20/300 ms (the critic's), 6/90 ms flick, 3 events/30 ms, 60/1 s,
//   90/3 s, arc right-first, arc down-first, L right-then-down, L down-then-right,
//   Slot 3 -> Load crossing two rows, Export straight, Delete straight.
// Pass = the slot acted on (lastLoad / download name / confirm title) is the
// chosen row. Extra checks:
//   preview   — resting on a non-selected row previews it in the panel (delay ms)
//   ringBack  — crossing a row into the panel's blank area leaves the focus ring
//               on the selected row (ring and panel agree)
//   clickRow  — a click on a row loads exactly that row
//   inGameDelete — pause > Save Game: Slot 2 -> Delete diagonal names Slot 2
// Output: captures/gntfixM23-mousepaths-<tag>.json (+ PNGs of two trials)
import { launchEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = { url: 'http://127.0.0.1:5199/', w: 1600, h: 900, tag: 'dev', headful: 0 };
for (let i = 0; i < argv.length; i += 2) {
  const k = argv[i].replace(/^--/, '');
  opt[k] = ['url', 'tag'].includes(k) ? argv[i + 1] : Number(argv[i + 1]);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { opt, startedAt: new Date().toISOString(), version: null, positions: null, trials: [], checks: {}, pageErrors: [] };
const log = (tag, v) => console.log(`[${tag}] ${JSON.stringify(v).slice(0, 1400)}`);

const browser = await launchEchoes({ gpu: true, headful: !!opt.headful, width: opt.w, height: opt.h, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: opt.w, height: opt.h, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => out.pageErrors.push(String((e && e.message) || e)));
  await page.evaluateOnNewDocument(() => {
    window.__gntDl = [];
    const ac = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        window.__gntDl.push(this.download);
        return undefined; // recorded, not downloaded
      }
      return ac.call(this);
    };
  });
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
  const foc = () => page.evaluate(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, stack: E.app.stack().join('>'), focus: f && f.id }; });
  const center = (id) => page.evaluate((id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, id);
  const panel = () => page.evaluate(() => { const d = document.querySelector('.sv-detail .sv-dname'); return d ? d.textContent : null; });
  const ring = () => page.evaluate(() => { const r = document.querySelector('.sv-screen .ap-focus'); return r ? r.id : null; });
  const conf = () => page.evaluate(() => { const c = document.getElementById('ap-confirm-ok'); const box = c && (c.closest('[class*="confirm"]') || c.parentElement.parentElement); return box && box.offsetParent !== null ? box.innerText.split('\n')[0] : null; });
  const pos = () => page.evaluate(() => { const p = window.__echoes.state().party[0]; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) }; });
  const bez = (a, c, b, n) => Array.from({ length: n }, (_, i) => { const t = (i + 1) / n; return { x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y }; });
  const PATHS = {
    straight: (a, b, n) => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * (i + 1)) / n, y: a.y + ((b.y - a.y) * (i + 1)) / n })),
    arcRight: (a, b, n) => bez(a, { x: b.x, y: a.y }, b, n),
    arcDown: (a, b, n) => bez(a, { x: a.x, y: b.y }, b, n),
    lRight: (a, b, n) => { const h = Math.ceil(n / 2); return [...Array.from({ length: h }, (_, i) => ({ x: a.x + ((b.x - a.x) * (i + 1)) / h, y: a.y })), ...Array.from({ length: n - h }, (_, i) => ({ x: b.x, y: a.y + ((b.y - a.y) * (i + 1)) / (n - h) }))]; },
    lDown: (a, b, n) => { const h = Math.ceil(n / 2); return [...Array.from({ length: h }, (_, i) => ({ x: a.x, y: a.y + ((b.y - a.y) * (i + 1)) / h })), ...Array.from({ length: n - h }, (_, i) => ({ x: a.x + ((b.x - a.x) * (i + 1)) / (n - h), y: b.y }))]; },
  };
  const walk = async (pts, ms) => { for (const p of pts) { await page.mouse.move(p.x, p.y); await sleep(ms / pts.length); } };

  // ---- setup: three manual saves (keyboard) at three positions
  await key('Enter');
  await page.waitForFunction(() => window.__echoes.app.state === 'playing' && window.__echoes.tick >= 200, { timeout: 90000 });
  await sleep(800);
  const positions = {};
  for (const [n, k] of [[1, 'KeyW'], [2, 'KeyD'], [3, 'KeyS']]) {
    await page.keyboard.down(k); await sleep(600); await page.keyboard.up(k); await sleep(250);
    positions[`manual-${n}`] = await pos();
    await key('Escape'); await sleep(450);
    for (let i = 0; i < 8; i++) { if ((await foc()).focus === 'pz-save') break; await key('ArrowDown'); await sleep(90); }
    await key('Enter'); await sleep(600);
    for (let i = 0; i < 10; i++) { if ((await foc()).focus === `sv-slot-manual-${n}`) break; await key('ArrowDown'); await sleep(90); }
    await key('Enter'); await sleep(900);
    for (let i = 0; i < 5; i++) { if (!(await foc()).stack) break; await key('Escape'); await sleep(350); }
    await sleep(300);
  }
  out.positions = positions;
  log('positions', positions);

  const toTitleLoad = async () => {
    const st = await foc();
    if (st.state !== 'title') {
      await page.evaluate(() => window.__echoes.app.quitToTitle && window.__echoes.app.quitToTitle());
      await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 20000 });
      await sleep(700);
    }
    if (!(await foc()).stack.includes('saves')) {
      const c = await center('ap-title-load');
      await page.mouse.move(c.x - 40, c.y, { steps: 2 });
      await page.mouse.move(c.x, c.y, { steps: 2 });
      await sleep(120);
      await page.mouse.click(c.x, c.y);
      await sleep(700);
    }
  };
  const TRIALS = [
    { id: 'critic-replica', row: 'manual-2', btn: 'sv-act-load', path: 'straight', n: 20, ms: 300 },
    { id: 'fast-flick', row: 'manual-2', btn: 'sv-act-load', path: 'straight', n: 6, ms: 90 },
    { id: 'very-fast-3ev', row: 'manual-2', btn: 'sv-act-load', path: 'straight', n: 3, ms: 30 },
    { id: 'slow-1s', row: 'manual-2', btn: 'sv-act-load', path: 'straight', n: 60, ms: 1000 },
    { id: 'slow-3s', row: 'manual-2', btn: 'sv-act-load', path: 'straight', n: 120, ms: 3000 },
    { id: 'arc-right-first', row: 'manual-2', btn: 'sv-act-load', path: 'arcRight', n: 24, ms: 400 },
    { id: 'arc-down-first', row: 'manual-2', btn: 'sv-act-load', path: 'arcDown', n: 24, ms: 400 },
    { id: 'L-right-then-down', row: 'manual-2', btn: 'sv-act-load', path: 'lRight', n: 24, ms: 400 },
    { id: 'L-down-then-right', row: 'manual-2', btn: 'sv-act-load', path: 'lDown', n: 24, ms: 400 },
    { id: 'slot3-straight', row: 'manual-3', btn: 'sv-act-load', path: 'straight', n: 20, ms: 300 },
    { id: 'export-slot2-straight', row: 'manual-2', btn: 'sv-act-export', path: 'straight', n: 20, ms: 300 },
    { id: 'delete-slot2-straight', row: 'manual-2', btn: 'sv-act-delete', path: 'straight', n: 20, ms: 300 },
  ];
  for (const tr of TRIALS) {
    let rec = null;
    for (let attempt = 1; attempt <= 3 && !rec; attempt++) {
      try {
        await toTitleLoad();
        const order = await page.evaluate(() => [...document.querySelectorAll('[id^="sv-slot-"]')].map((e) => e.id.replace('sv-slot-', '')));
        const r = await center(`sv-slot-${tr.row}`);
        await page.mouse.move(r.x - 160, r.y, { steps: 3 });
        await sleep(200);
        await page.mouse.move(r.x, r.y, { steps: 4 });
        await sleep(700);
        const hovered = await panel();
        const b = await center(tr.btn);
        await walk(PATHS[tr.path](r, b, tr.n), tr.ms);
        await sleep(60);
        const pre = { panel: await panel(), ring: await ring() };
        if (tr.id === 'critic-replica') await page.screenshot({ path: join(root, 'captures', `gntfixM23-mousepaths-${opt.tag}-${tr.id}-preclick.png`) });
        const dl0 = await page.evaluate(() => window.__gntDl.length);
        await page.mouse.click(b.x, b.y);
        await sleep(700);
        const c = await conf();
        const st = await foc();
        const lastLoad = await page.evaluate(() => { const l = window.__echoes.save.lastLoad(); return l && { slot: l.slot, at: l.at }; });
        const dls = await page.evaluate((n) => window.__gntDl.slice(n), dl0);
        let acted = null;
        if (tr.btn === 'sv-act-load') acted = st.state === 'playing' && lastLoad ? lastLoad.slot : null;
        if (tr.btn === 'sv-act-export') acted = dls[0] ? (dls[0].match(/echoes-(manual-\d|auto-\d|quick)/) || [])[1] : null;
        if (tr.btn === 'sv-act-delete') acted = c ? `manual-${(c.match(/Slot (\d)/) || [])[1]}` : null;
        let loadedPos = null;
        if (tr.btn === 'sv-act-load' && st.state === 'playing') { await sleep(150); loadedPos = await pos(); }
        rec = { ...tr, attempt, order, hovered, pre, confirm: c, acted, loadedPos, intendedPos: positions[tr.row], pass: acted === tr.row };
        if (c) { await key('Escape'); await sleep(350); }
        if (tr.btn !== 'sv-act-load') { await key('Escape'); await sleep(300); }
      } catch (err) {
        log('retry', { id: tr.id, attempt, err: String(err && err.message).slice(0, 200) });
        await sleep(1000);
      }
    }
    out.trials.push(rec);
    log('trial', rec && { id: rec.id, hovered: rec.hovered, prePanel: rec.pre.panel, preRing: rec.pre.ring, acted: rec.acted, pass: rec.pass });
  }

  // ---- preview: rest on a non-selected row -> the panel follows (delay)
  await toTitleLoad();
  {
    const sel0 = await panel();
    const r1 = await center('sv-slot-manual-1');
    await page.mouse.move(r1.x - 30, r1.y, { steps: 3 });
    await page.mouse.move(r1.x, r1.y, { steps: 2 });
    const tA = Date.now();
    let seen = null;
    while (Date.now() - tA < 1500) { if ((await panel()) === 'Slot 1') { seen = Date.now() - tA; break; } await sleep(15); }
    out.checks.preview = { before: sel0, after: await panel(), followedAfterMs: seen, pass: seen !== null && seen <= 400 };
    log('preview', out.checks.preview);
    // ringBack: from Slot 1 (now selected), cross Slot 2 fast into the panel's blank text area
    const r2 = await center('sv-slot-manual-2');
    const blank = await page.evaluate(() => { const d = document.querySelector('.sv-detail .sv-dl') || document.querySelector('.sv-detail'); const b = d.getBoundingClientRect(); return { x: b.x + b.width * 0.6, y: b.y + 6 }; });
    await walk(PATHS.straight(r1, { x: r2.x, y: r2.y }, 6), 60);
    await walk(PATHS.straight(r2, blank, 6), 60);
    await sleep(250);
    out.checks.ringBack = { panel: await panel(), ring: await ring(), pass: (await panel()) === 'Slot 1' && (await ring()) === 'sv-slot-manual-1' };
    log('ringBack', out.checks.ringBack);
    // clickRow: a click on the Slot 3 row loads Slot 3
    const r3 = await center('sv-slot-manual-3');
    await walk(PATHS.straight(blank, r3, 8), 80);
    await page.mouse.click(r3.x, r3.y);
    await sleep(800);
    const l = await page.evaluate(() => { const x = window.__echoes.save.lastLoad(); return x && x.slot; });
    out.checks.clickRow = { loaded: l, state: (await foc()).state, pos: await pos(), intended: positions['manual-3'], pass: l === 'manual-3' };
    log('clickRow', out.checks.clickRow);
  }

  // ---- in-game Save screen: Slot 2 -> Delete (diagonal) names Slot 2
  {
    await key('Escape'); await sleep(450);
    for (let i = 0; i < 8; i++) { if ((await foc()).focus === 'pz-save') break; await key('ArrowDown'); await sleep(90); }
    await key('Enter'); await sleep(700);
    const r2 = await center('sv-slot-manual-2');
    await page.mouse.move(r2.x - 150, r2.y, { steps: 3 });
    await sleep(150);
    await page.mouse.move(r2.x, r2.y, { steps: 3 });
    await sleep(700);
    const hovered = await panel();
    const d = await center('sv-act-delete');
    await walk(PATHS.straight(r2, d, 20), 300);
    await sleep(60);
    const pre = await panel();
    await page.mouse.click(d.x, d.y);
    await sleep(600);
    const c = await conf();
    out.checks.inGameDelete = { hovered, prePanel: pre, confirm: c, pass: !!c && c.includes('Slot 2') };
    log('inGameDelete', out.checks.inGameDelete);
    if (c) { await key('Escape'); await sleep(300); }
    await page.screenshot({ path: join(root, 'captures', `gntfixM23-mousepaths-${opt.tag}-ingame.png`) });
  }
} finally {
  await browser.close();
}
out.endedAt = new Date().toISOString();
const t = out.trials.filter(Boolean);
out.summary = {
  version: out.version,
  trials: t.length,
  pass: t.filter((x) => x.pass).length,
  wrong: t.filter((x) => !x.pass).map((x) => ({ id: x.id, row: x.row, acted: x.acted, prePanel: x.pre.panel })),
  checks: Object.fromEntries(Object.entries(out.checks).map(([k, v]) => [k, v.pass])),
  pageErrors: out.pageErrors.length,
};
const file = join(root, 'captures', `gntfixM23-mousepaths-${opt.tag}.json`);
writeFileSync(file, JSON.stringify(out, null, 1));
log('summary', out.summary);
console.log(`[DONE] -> ${file}`);
