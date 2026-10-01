// gntfixM5a6-shophead.mjs — fix-M5a-r6 (NET6-F2) probe: does the multiplayer shop header (the party
// tabs with their owner pills + the lantern + the Glint / room plate) stay inside the window and the
// shop frame at every supported size, for the host AND every guest, with long player names?
//
// Self-contained (own browser per client = own profile; own session server child on --port, killed
// at the end). Flow = the net critic r6 probe (tools/gntcnet6-mpwidth.mjs): Level 1, room 1 cleared,
// reward left, skipToRoom 7 -> the shop on every client; then every size in --sizes.
//
// Per client x size it reports:
//   out      visible text boxes outside the window or outside the shop frame (critic rule + vertical)
//   overlap  pairs of visible header text boxes that intersect (> 2 px^2) — name / owner pill / chip /
//            plate pieces / lantern
//   headOver the header row's scrollWidth - clientWidth (> 0 = its content spills)
//   tabs     per tab: width, name, owner text, owner truncated (ellipsis) + its tooltip
//   plate    the Glint / room plate rect + its text + rows (1 or 2)
//   frame    the shop frame rect, head height
// PASS = 0 out, 0 overlap, headOver <= 0, every truncated owner keeps its full name in the tooltip,
// and the plate text still reads the wallet and "ROOM 7 OF 8".
//
// node tools/gntfixM5a6-shophead.mjs --port 7812 [--base http://127.0.0.1:5199/] [--names "Host,Maximilian Wolfe,Wren"]
//      [--sp 1] [--done 1] [--interact 1024x640] [--sizes 1024x576,1024x640,...] [--css file.css] [--out name] [--shots 1024x576,1024x640,1152x648]
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = path.join(ROOT, 'captures');
const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7812);
const BASE = A.base || 'http://127.0.0.1:5199/';
const SP = A.sp === '1';
const OUT = A.out || `gntfixM5a6-shophead${SP ? '-sp' : ''}`;
const NAMES = SP ? ['Solo'] : String(A.names || 'Host,Maximilian Wolfe,Wren').split(',').map((s) => s.trim()).filter(Boolean);
const SIZES = String(A.sizes || '1024x576,1024x640,1152x648,1200x700,1279x719,1280x720,1366x768,1600x900,1920x1080,2560x1440').split(',').map((s) => s.split('x').map(Number));
const SHOTS = new Set(String(A.shots || '1024x576,1024x640,1152x648').split(','));
const CSS = A.css ? fs.readFileSync(A.css, 'utf8') : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GPU = ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'];
const BG = ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'];

// --launch WxH: every client is launched at that size (never resized before the shop) — the size a
// player's window simply is; default 1280x720 then the --sizes sweep resizes.
const [LW, LH] = String(A.launch || '1280x720').split('x').map(Number);
async function openClient(url, tag) {
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000, defaultViewport: { width: LW, height: LH, deviceScaleFactor: 1 }, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', ...GPU, ...BG, `--window-size=${LW},${LH}`] });
  const page = (await browser.pages())[0] || (await browser.newPage());
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
      break;
    } catch (e) { if (i === 2) throw e; await sleep(1000); }
  }
  return { browser, page, errors, tag };
}
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'server', 'index.mjs'), '--port', String(port), '--admin'], { cwd: ROOT });
    let out = '';
    const on = (d) => { out += d; if (/\[echoes-net\] ready/.test(out) && !proc._ok) { proc._ok = true; resolve(proc); } };
    proc.stdout.on('data', on); proc.stderr.on('data', on);
    proc.on('exit', (c) => { if (!proc._ok) reject(new Error('server exit ' + c + out)); });
    setTimeout(() => { if (!proc._ok) reject(new Error('server not ready ' + out)); }, 10000);
  });
}
async function waitOn(c, fn, timeout = 40000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn); if (v) return v; } catch { /* navigating */ } await sleep(100); } throw new Error(c.tag + ' timeout ' + String(fn).slice(0, 100)); }

// In-page measurement (shop page).
const measure = () => {
  const vis = (e) => { let p = e; while (p) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false; p = p.parentElement; } return true; };
  const page = [...document.querySelectorAll('.rn-page.rn-shop')].find((e) => e.offsetParent && vis(e));
  if (!page) return { noPage: true };
  const pr = page.getBoundingClientRect();
  const R = (r) => ({ l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) });
  const out = [];
  const texts = [];
  for (const e of page.querySelectorAll('*')) {
    if (!e.offsetParent || !vis(e)) continue;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2) continue;
    const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim().slice(0, 30);
    if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1 || r.right > pr.right + 1 || r.left < pr.left - 1 || r.top < pr.top - 1 || r.bottom > pr.bottom + 1) out.push({ txt: t, cls: String(e.className).slice(0, 30), ...R(r) });
    if (e.closest('.rn-head')) texts.push({ e, t, r });
  }
  // Header text-on-text overlap (text RANGE boxes, not element boxes, so a grid cell wider than its text never counts).
  // The painted part only: a text run inside a box that clips (overflow != visible, e.g. an ellipsized
  // owner pill) is cut to that box, the way the frame shows it.
  const clipTo = (r, e) => { let x0 = r.left, x1 = r.right, y0 = r.top, y1 = r.bottom; for (let p = e; p && p !== page; p = p.parentElement) { if (getComputedStyle(p).overflowX !== 'visible') { const b = p.getBoundingClientRect(); x0 = Math.max(x0, b.left); x1 = Math.min(x1, b.right); y0 = Math.max(y0, b.top); y1 = Math.min(y1, b.bottom); } } return { left: x0, right: x1, top: y0, bottom: y1, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) }; };
  // Text box = the union of the client rects of the element's OWN text nodes (the net critic r6 audit's
  // method: an inline label broken over two lines counts as one box spanning both).
  const tb = texts.map(({ e, t }) => {
    const rg = document.createRange(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const q of rg.getClientRects()) { x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top); x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom); } }
    const r = clipTo({ left: x0, right: x1, top: y0, bottom: y1 }, e);
    return { e, t: e.textContent.trim().slice(0, 24), cls: String(e.className).slice(0, 20), r };
  }).filter((b) => b.r.width > 0 && b.r.height > 0);
  const overlap = [];
  for (let i = 0; i < tb.length; i++) for (let j = i + 1; j < tb.length; j++) {
    const a = tb[i].r; const b = tb[j].r;
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left); const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (tb[i].e.contains(tb[j].e) || tb[j].e.contains(tb[i].e)) continue;
    // Same-row overlap (the boxes share more than half of the shorter one's height — a font's ascent /
    // descent bleeding into the row above or below is not text over text), or the critic's rule: the
    // intersection covers > 25 % of the smaller box.
    const frac = w > 0 && h > 0 ? (w * h) / Math.min(a.width * a.height, b.width * b.height) : 0;
    if ((w > 1 && h > 0.5 * Math.min(a.height, b.height)) || frac > 0.25) overlap.push({ a: tb[i].t, b: tb[j].t, px: Math.round(w * h), frac: Math.round(frac * 100) / 100 });
  }
  const head = page.querySelector('.rn-head');
  const plate = page.querySelector('.rn-head .rn-strip');
  // Lines of plate text: the distinct line boxes of every text run inside the plate (an inline label that
  // wraps across the line break has one client rect per line).
  const cy = [];
  if (plate) { const tw = document.createTreeWalker(plate, NodeFilter.SHOW_TEXT); let tn; while ((tn = tw.nextNode())) { if (!tn.textContent.trim() || !vis(tn.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(tn); for (const r of rg.getClientRects()) if (r.width > 1) cy.push((r.top + r.bottom) / 2); } }
  cy.sort((x, y) => x - y);
  const rows = cy.length ? 1 + cy.slice(1).filter((y, i) => y - cy[i] > 12).length : 0;
  const tabs = [...page.querySelectorAll('.rn-ptab')].filter((e) => e.offsetParent).map((t) => {
    const o = t.querySelector('.rn-powner');
    const os = o && getComputedStyle(o).display !== 'none' ? o : null;
    return { w: Math.round(t.getBoundingClientRect().width), name: t.querySelector('.rn-pname').textContent, chip: t.querySelector('.rn-pchip').textContent, owner: os ? os.textContent : '', ownerW: os ? Math.round(os.getBoundingClientRect().width) : 0, trunc: os ? os.scrollWidth > os.clientWidth + 0.5 : false, title: os ? os.title : '' };
  });
  return {
    win: [innerWidth, innerHeight], tabhead: page.classList.contains('rn-tabhead'), cls: page.className,
    frame: R(pr), head: head ? { ...R(head.getBoundingClientRect()), h: Math.round(head.getBoundingClientRect().height), over: head.scrollWidth - head.clientWidth, items: [...head.children].filter((c) => getComputedStyle(c).display !== 'none').map((c) => `${String(c.className).split(' ')[0]}:${Math.round(c.getBoundingClientRect().width)}x${Math.round(c.getBoundingClientRect().height)}`).join(' '), tabH: [...head.querySelectorAll('.rn-ptab')].map((t) => Math.round(t.getBoundingClientRect().height)).join('/') } : null,
    fit: (() => { try { return window.__echoes.content ? null : null; } catch { return null; } })(),
    plate: plate ? { ...R(plate.getBoundingClientRect()), text: plate.textContent.replace(/\s+/g, ' ').trim(), rows, kids: [...plate.querySelectorAll('.rn-coin, .rn-amt, .rn-lab, .rn-num')].map((k) => { const r = k.getBoundingClientRect(); return `${k.className.split(' ')[0]}:${r.left.toFixed(1)},${r.top.toFixed(1)},${r.width.toFixed(1)}x${r.height.toFixed(1)}`; }).join(' ') } : null,
    tabRects: [...page.querySelectorAll('.rn-ptab')].filter((e) => e.offsetParent).map((t) => { const r = t.getBoundingClientRect(); return `${r.left.toFixed(1)},${r.width.toFixed(1)}x${r.height.toFixed(1)}`; }).join(' '),
    out, nOut: out.length, overlap, tabs, s: getComputedStyle(document.getElementById('run-screen')).getPropertyValue('--rn-s').trim(),
  };
};

const out = { tool: 'gntfixM5a6-shophead', base: BASE, sp: SP, names: NAMES, css: A.css || null, version: null, results: {}, fails: [], errors: {} };
let srv = null;
const cl = [];
try {
  if (!SP) srv = await startServer();
  const url = (nm) => BASE + `?menu=0&seed=7&netname=${encodeURIComponent(nm)}` + (SP ? '' : `&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`);
  for (const [i, nm] of NAMES.entries()) cl.push(await openClient(url(nm), i === 0 ? 'H' : `G${i}`));
  const [H, ...G] = cl;
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
  out.version = await H.page.evaluate(() => window.__echoes.version);
  if (!SP) {
    const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
    for (const g of G) await g.page.evaluate(async (c) => { const n = window.__echoes.net; await n.join(c); n.setReady(true); return 1; }, code);
    await sleep(400);
    await H.page.evaluate(() => window.__echoes.net.start());
    for (const g of G) await waitOn(g, () => window.__echoes.net.session.status().synced);
  }
  if (CSS) for (const c of cl) await c.page.evaluate((css) => { const s = document.createElement('style'); s.id = 'gntfixM5a6-exp'; s.textContent = css; document.head.appendChild(s); }, CSS);
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat');
  await sleep(1200);
  // Kill until the room clears (a wave may still be spawning on the first call).
  for (let i = 0; i < 40; i++) {
    const ph = await H.page.evaluate(() => { const v = window.__echoes.state().run; if (v.phase === 'combat') window.__echoes.cmd('killAllEnemies'); return v.phase; });
    if (ph !== 'combat') break;
    await sleep(500);
  }
  for (const c of cl) await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, 60000).catch(async (e) => { console.log(c.tag, 'reward wait', await c.page.evaluate(() => JSON.stringify({ phase: window.__echoes.state().run.phase, party: !!window.__echoes.state().run.party }))); throw e; });
  await sleep(800);
  await H.page.evaluate(() => window.__echoes.content.world().runSystem().partyPick(0, 'leave'));
  if (!SP) for (const g of G) await g.page.evaluate(() => window.__echoes.content.world().runSystem().partyPick(window.__echoes.net.seat, 'leave'));
  await waitOn(H, () => ['path', 'combat'].includes(window.__echoes.state().run.phase), 40000);
  await H.page.evaluate(() => { const v = window.__echoes.state().run; if (v.phase === 'path') window.__echoes.content.world().runSystem().choosePath(0); return 1; });
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', 20000);
  await H.page.evaluate(() => window.__echoes.cmd('skipToRoom', 7));
  for (const c of cl) await waitOn(c, () => window.__echoes.state().run.phase === 'shop', 40000);
  await sleep(1500);
  // --done 1: every guest presses its "Done" lamp first, so the tabs' purse lines read "◉ 72 · Done".
  if (A.done === '1') {
    for (const g of G) await g.page.evaluate(() => { window.__echoes.content.world().runSystem().advanceFromShop(); return 1; });
    const t0 = Date.now();
    let nDone = 0;
    while (Date.now() - t0 < 20000) {
      nDone = await H.page.evaluate(() => { const ps = window.__echoes.content.world().runSystem().view().partyShop; return ps && ps.done ? ps.done.filter(Boolean).length : 0; });
      if (nDone >= G.length) break;
      await sleep(150);
    }
    out.done = nDone;
    console.log('guests Done', nDone, '/', G.length);
    await sleep(800);
  }
  for (const [w, h] of SIZES) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1100);
    for (const c of cl) {
      let m = await c.page.evaluate(measure);
      // A failure is re-measured once 700 ms later (a page mid-reflow is not a defect).
      const bad = (x) => x.noPage || x.nOut || x.overlap.length || (x.head && x.head.over > 0);
      if (bad(m)) { await sleep(700); m = await c.page.evaluate(measure); }
      const key = `${w}x${h}`;
      (out.results[key] ||= {})[c.tag] = m;
      const why = [];
      if (m.noPage) why.push('no shop page');
      else {
        if (m.nOut) why.push(`${m.nOut} text outside: ${m.out.map((o) => `"${o.txt}" ${o.l}-${o.r}`).join(', ')}`);
        if (m.overlap.length) why.push(`${m.overlap.length} header overlaps: ${m.overlap.map((o) => `${o.a} x ${o.b} ${o.px}px2`).join(', ')}`);
        if (m.head && m.head.over > 0) why.push(`head spills ${m.head.over} px`);
        for (const t of m.tabs) if (t.trunc && !t.title.includes(t.owner.replace(/…$/, ''))) why.push(`owner "${t.owner}" truncated without its name in the tooltip`);
        if (m.plate && !(/GLINT/.test(m.plate.text) && /ROOM\s*7\s*OF 8/.test(m.plate.text.replace('· ', '')))) why.push(`plate text "${m.plate.text}"`);
      }
      if (why.length) out.fails.push({ size: key, client: c.tag, why });
      console.log(key, c.tag, why.length ? 'FAIL ' + why.join(' | ') : 'ok', '| tabs', m.tabs ? m.tabs.map((t) => `${t.w}${t.owner ? `[${t.owner}${t.trunc ? '~' : ''}]` : ''}`).join(' ') : '-', '| plate', m.plate ? `${m.plate.l}-${m.plate.r} rows ${m.plate.rows}` : '-', '| frame', m.frame ? `${m.frame.l}-${m.frame.r} t${m.frame.t}` : '-', '| head h', m.head ? `${m.head.h} [${m.head.items}] tabs h ${m.head.tabH}` : '-', 's', m.s);
      if (SHOTS.has(key)) {
        await c.page.screenshot({ path: path.join(CAP, `${OUT}-${c.tag}-${key}.png`) });
        // The header row alone (a closer look at the tabs, the lantern and the plate).
        if (m.head) { const x = Math.max(0, m.head.l - 8); const y = Math.max(0, m.head.t - 8); await c.page.screenshot({ path: path.join(CAP, `${OUT}-${c.tag}-${key}-head.png`), clip: { x, y, width: Math.min(w - x, m.head.r - m.head.l + 16), height: Math.min(h - y, m.head.h + 16) } }); }
      }
    }
  }
  // --interact WxH: at that size the host switches through every character (Q / E), buys a card, then a
  // guest presses Done — the header must hold still on a switch (tabs move 0 px beyond the viewed tab's
  // lift, fit level unchanged) and keep fitting after the purchase and the Done chip.
  if (A.interact && !SP) {
    const [w, h] = String(A.interact).split('x').map(Number);
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1200);
    const snap = async (c, label) => {
      const m = await c.page.evaluate(measure);
      const lv = await c.page.evaluate(() => { const s = [...document.querySelectorAll('.rn-page.rn-shop')][0]; return { cls: s.className.replace(/rn-page rn-shop ?/, ''), lefts: [...s.querySelectorAll('.rn-ptab')].map((t) => Math.round(t.offsetLeft)), viewed: [...s.querySelectorAll('.rn-ptab')].findIndex((t) => t.classList.contains('rn-pview')), wallet: s.querySelector('.rn-amt').textContent }; });
      const why = [];
      if (m.nOut) why.push(`${m.nOut} text outside`);
      if (m.overlap.length) why.push(`${m.overlap.length} header overlaps`);
      if (m.head && m.head.over > 0) why.push(`head spills ${m.head.over} px`);
      const row = { label, client: c.tag, ...lv, plate: m.plate && `${m.plate.l}-${m.plate.r}`, frame: m.frame && `${m.frame.l}-${m.frame.r} t${m.frame.t}`, why };
      (out.interact ||= []).push(row);
      if (why.length) out.fails.push({ size: `interact ${label}`, client: c.tag, why });
      console.log('interact', label, c.tag, why.length ? 'FAIL ' + why.join(' | ') : 'ok', JSON.stringify(lv), 'plate', row.plate, 'frame', row.frame);
      return row;
    };
    const H0 = await snap(H, 'start');
    for (let k = 1; k <= 4; k++) {
      await H.page.keyboard.press('KeyE');
      await sleep(500);
      const r = await snap(H, `switch${k}`);
      const hf = (x) => x.cls.split(' ').filter((c) => c.startsWith('rn-hf-')).sort().join(' ');
      if (hf(r) !== hf(H0)) out.fails.push({ size: `interact switch${k}`, client: 'H', why: [`fit levels changed on a character switch: "${hf(H0)}" -> "${hf(r)}"`] });
      if (r.frame !== H0.frame) out.fails.push({ size: `interact switch${k}`, client: 'H', why: [`the shop frame moved on a character switch: ${H0.frame} -> ${r.frame}`] });
      if (r.lefts.join() !== H0.lefts.join()) out.fails.push({ size: `interact switch${k}`, client: 'H', why: [`tabs moved on a character switch: ${H0.lefts} -> ${r.lefts}`] });
    }
    await H.page.evaluate(() => { const card = document.querySelector('.rn-page.rn-shop .rn-shelf .rn-item:not(.rn-sold) .rn-card'); if (card) card.click(); return !!card; });
    await sleep(2600);
    await snap(H, 'bought');
    if (G[0]) {
      await G[0].page.evaluate(() => { window.__echoes.content.world().runSystem().advanceFromShop(); return 1; });
      await sleep(1500);
      await snap(H, 'guestDone');
      await snap(G[0], 'guestDone');
    }
  }
} catch (e) { out.crash = String(e.stack || e); console.log('CRASH', out.crash); }
finally {
  for (const c of cl) { out.errors[c.tag] = c.errors; try { await c.browser.close(); } catch { /* */ } }
  if (srv) srv.kill();
  out.verdict = !out.crash && out.fails.length === 0 && Object.values(out.errors).every((e) => !e.length) ? 'PASS' : 'FAIL';
  fs.writeFileSync(path.join(CAP, `${OUT}.json`), JSON.stringify(out, null, 1));
  console.log('VERDICT', out.verdict, 'fails', out.fails.length, 'pageErrors', JSON.stringify(out.errors));
}
