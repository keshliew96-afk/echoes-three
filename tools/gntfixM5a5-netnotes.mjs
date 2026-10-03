// gntfixM5a5-netnotes.mjs — fix-M5a-r5 (the NET5-F1 family): do the network
// session's transient messages — the notes column ("Not applied …", "No
// updates from the host …", "Fox reconnecting …") and the ping line ("Fox
// points at door 2") — stay clear of the open build page, at every PLAN §16.4
// layout size?
//
// Host + guest "Fox" (own browsers, own child server). REAL triggers only:
//   * a note on the guest: a raw party CMD for another seat
//     (__echoes.net.session.debugPartyCmd({ op: 'pick', seat: 0 })) — the
//     host answers command_rejected not_owner, the guest's HUD says so;
//   * a ping on the host: the guest focuses a door on the path page
//     (runSystem().focusPath(i) through the guest's guard proxy -> ping CMD).
// Per page (party reward page, socket screen, doors, party shop, socket
// screen in the shop) x size (1024x576 .. 2560x1440):
//   notes mode (stack / side / row / held), every SHOWN message's rect,
//   its overlap (px2) with the open page, in-view, and an ancestor-aware
//   text audit: any visible text box the message covers (> 0 px2).
//   FAIL = a shown message over the page or over other visible text, off
//   screen, or a message lost (neither shown nor held).
// Held -> released: where nothing fits (the socket screen filling a 16:9
// window) the message waits; closing the page shows it with its full
// lifetime. Control: during combat (no page) a note sits in the usual stack.
//
// node tools/gntfixM5a5-netnotes.mjs --port 7813 [--base http://127.0.0.1:5199/] [--out name]
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = path.join(ROOT, 'captures');
const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const PORT = Number(A.port || 7813);
const BASE = String(A.base || 'http://127.0.0.1:5199/');
const OUT = String(A.out || 'gntfixM5a5-netnotes');
const SIZES = [[1024, 576], [1024, 640], [1280, 720], [1600, 900], [1920, 1080], [2560, 1440]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { tool: OUT, base: BASE, errors: {}, cases: [], verdict: null };
const fails = [];

const GPU = ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'];
const BG = ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'];
async function openClient(url, tag, w = 1280, h = 720) {
  const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000, defaultViewport: { width: w, height: h, deviceScaleFactor: 1 }, args: ['--disable-dev-shm-usage', '--no-first-run', ...GPU, ...BG, `--window-size=${w},${h}`] });
  const page = (await browser.pages())[0] || (await browser.newPage());
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  let last = null;
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
      last = null;
      break;
    } catch (e) { last = e; await sleep(1000); }
  }
  if (last) throw last;
  return { browser, page, errors, tag };
}
function startServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'server', 'index.mjs'), '--port', String(port), '--admin'], { cwd: ROOT });
    let buf = '';
    const on = (d) => { buf += d; if (/\[echoes-net\] ready/.test(buf) && !proc._r) { proc._r = 1; resolve(proc); } };
    proc.stdout.on('data', on); proc.stderr.on('data', on);
    proc.on('exit', (c) => { if (!proc._r) reject(new Error('server exit ' + c + ' ' + buf)); });
    setTimeout(() => { if (!proc._r) reject(new Error('server not ready ' + buf)); }, 10000);
  });
}
async function waitOn(c, fn, timeout = 30000, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn, arg); if (v) return v; } catch { /* navigating */ } await sleep(80); }
  throw new Error(c.tag + ' timeout ' + String(fn).slice(0, 120));
}

// In-page: the notes column vs the open page and every other visible text.
const measure = () => {
  const hud = document.getElementById('nt-hud');
  const col = hud && hud.querySelector('.nt-notes');
  if (!col) return { none: true };
  const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  const ov = (a, b) => (a && b && a.w > 0 && b.w > 0 ? Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y)) : 0);
  const onScreen = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  // The open modal page (same rule as src/ui/net/hud.js modalPage()).
  let page = null;
  const sock = document.getElementById('socket-screen');
  if (sock && getComputedStyle(sock).display !== 'none' && getComputedStyle(sock).visibility !== 'hidden') page = sock.querySelector('.nd-page');
  const run = document.getElementById('run-screen');
  if (!page && run && run.classList.contains('rn-open')) page = [...run.querySelectorAll('.rn-page')].find((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0) || null;
  const pr = page ? R(page) : null;
  const mode = col.classList.contains('nt-aside') ? 'held' : col.classList.contains('nt-row') ? 'row' : 'stack';
  // (The pre-fix build drew the ping as its own top-right element, .nt-ping.)
  const legacy = hud.querySelector('.nt-ping');
  const items = [...col.children, ...(legacy ? [legacy] : [])].map((n) => {
    const shown = onScreen(n) && n.getBoundingClientRect().width > 0;
    const r = R(n);
    return { cls: n.className, text: n.textContent.slice(0, 70), shown, wait: n.classList.contains('nt-wait'), rect: shown ? r : null, overPage: shown ? ov(r, pr) : 0, inView: !shown || (r.x >= 0 && r.y >= 0 && r.r <= innerWidth && r.b <= innerHeight), clipped: n.scrollWidth > n.clientWidth + 1, title: n.title };
  });
  // Visible text boxes (own text nodes, ancestor-aware) outside the notes column.
  const texts = [];
  for (const e of document.querySelectorAll('body *')) {
    if (col.contains(e) || (legacy && legacy.contains(e))) continue;
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!onScreen(e)) continue;
    const rg = document.createRange(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const q of rg.getClientRects()) { x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top); x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom); } }
    if (!Number.isFinite(x0) || x1 - x0 < 2 || y1 - y0 < 2) continue;
    texts.push({ t: e.textContent.trim().slice(0, 40), cls: String(e.className && e.className.baseVal === undefined ? e.className : '').slice(0, 40), r: { x: x0, y: y0, r: x1, b: y1, w: x1 - x0 } });
  }
  for (const it of items) {
    if (!it.shown) continue;
    it.coversText = texts.filter((t) => ov(it.rect, t.r) > 4).map((t) => `${t.t} [${t.cls}]`).slice(0, 6);
  }
  const chip = hud.querySelector('.nt-chip');
  return { vw: innerWidth, vh: innerHeight, mode, page: pr, pageKind: page ? (page.closest('#socket-screen') ? 'socket' : 'run') : null, chip: chip && onScreen(chip) ? R(chip) : null, colStyle: { left: col.style.left, bottom: col.style.bottom, maxWidth: col.style.maxWidth }, items };
};

function judge(where, tag, m, expect) {
  const shown = m.items.filter((i) => i.shown);
  const waiting = m.items.filter((i) => i.wait);
  for (const it of shown) {
    if (it.overPage > 0) fails.push(`${where} ${tag}: '${it.text}' covers the page (${it.overPage} px2, mode ${m.mode})`);
    if (!it.inView) fails.push(`${where} ${tag}: '${it.text}' off screen ${JSON.stringify(it.rect)}`);
    if (it.coversText && it.coversText.length) fails.push(`${where} ${tag}: '${it.text}' covers text ${JSON.stringify(it.coversText)} (mode ${m.mode})`);
  }
  if (expect && !m.items.some((i) => expect.test(i.text))) fails.push(`${where} ${tag}: the message was lost (${JSON.stringify(m.items.map((i) => i.text))})`);
  if (expect && m.mode !== 'held' && !shown.some((i) => expect.test(i.text))) fails.push(`${where} ${tag}: mode ${m.mode} but the message is not shown`);
  if (m.mode === 'held' && shown.length) fails.push(`${where} ${tag}: held but ${shown.length} shown`);
  return { shown: shown.length, waiting: waiting.length };
}

const NOTE_RE = /another player|Not applied|Healer makes/;
const PING_RE = /points at/;
let srv = null;
const cl = [];
try {
  srv = await startServer(PORT);
  const url = (nm) => BASE + `?menu=0&seed=7&netname=${encodeURIComponent(nm)}&net=${encodeURIComponent(`ws://127.0.0.1:${PORT}/echoes`)}`;
  cl[0] = await openClient(url('Host'), 'Host');
  cl[1] = await openClient(url('Fox'), 'Fox');
  const [H, G] = cl;
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await G.page.evaluate(async (c) => { const n = window.__echoes.net; await n.join(c); n.setReady(true); return 1; }, code);
  await sleep(800);
  await H.page.evaluate(() => window.__echoes.net.start());
  await waitOn(G, () => window.__echoes.net.session.status().synced, 60000);
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', 60000);
  await waitOn(G, () => window.__echoes.state().run.phase === 'combat', 60000);
  await sleep(1200);

  // Clear old messages (their lifetime is <= 4.1 s) so a case reads only its own.
  const drain = async (c) => { try { await waitOn(c, () => !document.querySelector('#nt-hud .nt-notes').children.length, 6000); } catch { /* measured anyway */ } };
  const fireNote = (c) => c.page.evaluate(() => window.__echoes.net.session.debugPartyCmd({ op: 'pick', seat: 0, index: 0 }));
  async function noteCase(where, c = G) {
    await drain(c);
    const ok = await fireNote(c);
    try { await waitOn(c, () => [...document.querySelectorAll('#nt-hud .nt-notes > *')].some((n) => /another player|Not applied|Healer makes/.test(n.textContent)), 5000); } catch { /* judged */ }
    await sleep(300); // one 10 Hz placement past the arrival
    const m = await c.page.evaluate(measure);
    const j = judge(where, c.tag, m, NOTE_RE);
    out.cases.push({ where, tag: c.tag, sent: ok, ...m });
    console.log(where.padEnd(24), c.tag, 'mode', m.mode.padEnd(5), 'shown', j.shown, 'held', j.waiting, m.items.filter((i) => i.shown).map((i) => `${JSON.stringify(i.rect)} page${i.overPage} text${(i.coversText || []).length}${i.clipped ? ' ell' : ''}`).join(' '));
    return m;
  }

  // 0) Control: combat, no page -> the usual stack above the chip.
  for (const c of cl) await c.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await sleep(600);
  const ctl = await noteCase('combat 1280x720');
  if (ctl.mode !== 'stack') fails.push(`combat: mode ${ctl.mode}, expected the usual stack`);
  await G.page.screenshot({ path: path.join(CAP, `${OUT}-combat-Fox-1280x720.png`) });

  // 1) The party reward page.
  await H.page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
  for (const c of cl) await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, 60000);
  await sleep(900);
  const pass = async (name, sizes = SIZES, shots = [[1024, 576], [1920, 1080]]) => {
    for (const [w, h] of sizes) {
      for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await sleep(700);
      await noteCase(`${name} ${w}x${h}`);
      if (shots.some(([a, b]) => a === w && b === h)) await G.page.screenshot({ path: path.join(CAP, `${OUT}-${name}-Fox-${w}x${h}.png`) });
    }
  };
  // A ping on the HOST (the guest focusing a door) while the host's page is open.
  out.pings = [];
  const pingPass = async (name) => {
    for (const [w, h] of SIZES) {
      for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await sleep(500);
      await drain(H);
      // Every text the net HUD adds (a held ping is added and removed in one task).
      await H.page.evaluate(() => {
        window.__gntSeen = [];
        if (window.__gntObs) window.__gntObs.disconnect();
        window.__gntDropped = [];
        window.__gntObs = new MutationObserver((ms) => {
          const col = document.querySelector('#nt-hud .nt-notes');
          for (const q of ms) {
            for (const n of q.addedNodes) window.__gntSeen.push(n.textContent);
            // Removed while the column is held (nt-aside) = dropped for want of room.
            for (const n of q.removedNodes) if (col && col.classList.contains('nt-aside')) window.__gntDropped.push(n.textContent);
          }
        });
        window.__gntObs.observe(document.getElementById('nt-hud'), { childList: true, subtree: true });
        return 1;
      });
      await G.page.evaluate((i) => { try { window.__echoes.content.world().runSystem().focusPath(i); } catch { /* */ } return 1; }, (w % 2));
      let got = true;
      try { await waitOn(H, () => (window.__gntSeen || []).some((t) => /points at/.test(t)), 4000); } catch { got = false; }
      await sleep(250);
      const m = await H.page.evaluate(measure);
      const dropped = await H.page.evaluate(() => (window.__gntDropped || []).some((t) => /points at/.test(t)));
      if (dropped) m.pingHeldDrop = true;
      judge(`${name} ${w}x${h}`, 'Host', m, got && m.mode !== 'held' && !dropped ? PING_RE : null);
      if (!got) fails.push(`${name} ${w}x${h}: the host never showed the ping`);
      out.pings.push({ name, w, h, got, ...m });
      console.log(`${name} ${w}x${h}`.padEnd(24), 'Host mode', m.pingHeldDrop ? 'held (ping dropped, the card outline shows it)' : m.mode, 'page', m.pageKind, m.items.filter((i) => i.shown).map((i) => `'${i.text}' ${JSON.stringify(i.rect)} page${i.overPage} text${(i.coversText || []).length}`).join(' '));
      if (w === 1024 || w === 1920) await H.page.screenshot({ path: path.join(CAP, `${OUT}-${name}-Host-${w}x${h}.png`) });
    }
  };
  await pass('reward', [[1024, 576], [1280, 720], [1920, 1080], [2560, 1440]]);

  // 2) The socket screen (reward page underneath): the tight sizes + held -> released.
  await G.page.evaluate(() => window.__echoes.cmd('openSocket'));
  await sleep(700);
  await pass('socket-reward', [[1280, 720], [1920, 1080]], [[1280, 720], [1920, 1080]]);
  for (const c of cl) await c.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await sleep(700);
  const heldM = await noteCase('socket-hold 1280x720');
  out.held = { mode: heldM.mode };
  if (heldM.mode === 'held') {
    await G.page.evaluate(() => window.__echoes.cmd('closeSocket'));
    await sleep(400);
    const rel = await G.page.evaluate(measure);
    const shownRel = rel.items.filter((i) => i.shown && NOTE_RE.test(i.text));
    judge('socket-released 1280x720', 'Fox', rel, NOTE_RE);
    await sleep(2400);
    const later = await G.page.evaluate(measure);
    out.held.released = { mode: rel.mode, shown: shownRel.length, stillShownAfter2800ms: later.items.filter((i) => i.shown && NOTE_RE.test(i.text)).length };
    if (!shownRel.length) fails.push('socket-released: the held message did not show when the page closed');
    if (!out.held.released.stillShownAfter2800ms) fails.push('socket-released: the held message did not get its full lifetime');
    console.log('held -> released', JSON.stringify(out.held));
    await G.page.screenshot({ path: path.join(CAP, `${OUT}-socket-released-Fox-1280x720.png`) });
  } else {
    await G.page.evaluate(() => window.__echoes.cmd('closeSocket'));
  }

  // 3) The doors: guest notes + HOST pings (the guest focusing doors).
  for (const c of cl) await c.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  for (const c of cl) await c.page.evaluate(() => { try { const s = window.__echoes.net.seat ?? 0; window.__echoes.content.world().runSystem().partyPick(s, 'leave'); } catch { /* */ } return 1; });
  try {
    for (const c of cl) await waitOn(c, () => window.__echoes.state().run.phase === 'path', 30000);
    await sleep(900);
    await pingPass('ping-path');
    await pass('path', SIZES);
  } catch (e) { out.pathErr = String(e.message || e); fails.push('path phase not reached: ' + out.pathErr); }

  // 4) The party shop + the socket screen in the shop.
  out.skip = await H.page.evaluate(() => { try { return window.__echoes.cmd('skipToRoom', 7); } catch (e) { return String(e); } });
  try {
    for (const c of cl) await waitOn(c, () => window.__echoes.state().run.phase === 'shop', 45000);
    await sleep(1200);
    await pass('shop', SIZES);
    await H.page.evaluate(() => window.__echoes.cmd('openSocket'));
    await sleep(700);
    await pingPass('ping-socket');
    await H.page.evaluate(() => window.__echoes.cmd('closeSocket'));
    await G.page.evaluate(() => window.__echoes.cmd('openSocket'));
    await sleep(800);
    await pass('socket', SIZES);
    await G.page.evaluate(() => window.__echoes.cmd('closeSocket'));
  } catch (e) { out.shopErr = String(e.message || e); fails.push('shop not reached: ' + out.shopErr); }
} catch (e) { out.crash = String(e.stack || e); fails.push('crash ' + out.crash); console.log('CRASH', out.crash); }
finally {
  for (const c of cl) if (c) { out.errors[c.tag] = c.errors; if (c.errors.length) fails.push(`${c.tag} page errors ${c.errors.length}: ${c.errors.slice(0, 2).join(' | ')}`); }
  for (const c of cl) if (c) await c.browser.close().catch(() => {});
  if (srv) srv.kill();
}
out.modes = out.cases.reduce((a, c) => ((a[c.mode] = (a[c.mode] || 0) + 1), a), {});
out.fails = fails;
out.verdict = fails.length ? 'FAIL' : 'PASS';
fs.writeFileSync(path.join(CAP, `${OUT}.json`), JSON.stringify(out, null, 1));
console.log('modes', JSON.stringify(out.modes));
console.log(out.verdict, fails.length);
for (const f of fails) console.log('  ', f.slice(0, 400));
process.exit(0);
