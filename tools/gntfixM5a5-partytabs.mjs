// gntfixM5a5-partytabs.mjs — fix-M5a-r5 (NET5-F1): the party strip's owner line
// in a network session, on EVERY build page that carries the strip (the party
// reward page, the socket screen, the party shop), host + 2 guests (one with a
// 16-character name, the NAME_MAX worst case), at the PLAN §16.4 layout sizes.
//
// Per client / size / page:
//   * the critic's generic overlapping-text audit (tools/gntcnet5-partytabs.mjs:
//     every element with its own text, pairs not ancestor / descendant whose
//     tight text boxes intersect > 25 % of the smaller) — here with an
//     ANCESTOR-aware visibility test (an element under an opacity-0 / hidden
//     ancestor is not on screen) and the raw element-only variant both kept;
//   * per tab: name / owner / chip rects, the owner text, px overlap of every
//     pair, owner clipped (scrollWidth > clientWidth = an ellipsis), the tab
//     inside its strip's page box, the tab height;
//   * the expected owner labels: host sees you / Fox / <long> / AI, guest Fox
//     sees Host / you / <long> / AI, guest 2 sees Host / Fox / you / AI.
// Single-player control: no owner line on any tab (display none, 0 px).
//
// node tools/gntfixM5a5-partytabs.mjs --port 7812 [--base http://127.0.0.1:5199/] [--out name]
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAP = path.join(ROOT, 'captures');
const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const PORT = Number(A.port || 7812);
const BASE = String(A.base || 'http://127.0.0.1:5199/');
const OUT = String(A.out || 'gntfixM5a5-partytabs');
const LONG = 'Maximilian Wolfe'; // 16 = NAME_MAX
const SIZES = [[1024, 576], [1024, 640], [1280, 720], [1600, 900], [1920, 1080], [2560, 1440]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { tool: OUT, base: BASE, reward: {}, socket: {}, shop: {}, sp: null, errors: {}, verdict: null };

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

// In-page measurement (one function, serialised).
const measure = (sel) => {
  const onScreen = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const audit = (ancestorAware) => {
    const els = [...document.querySelectorAll('body *')].filter((e) => {
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
      if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)) return false;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      if (ancestorAware && !onScreen(e)) return false;
      const r = e.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
    });
    const boxes = els.map((e) => {
      const rg = document.createRange(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const r of rg.getClientRects()) { x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); } }
      return { e, t: e.textContent.trim().slice(0, 40), x0, y0, x1, y1, cls: String(e.className && e.className.baseVal === undefined ? e.className : '') };
    }).filter((b) => Number.isFinite(b.x0));
    const pairs = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (w <= 1 || h <= 1) continue;
      const small = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
      const frac = (w * h) / small;
      if (frac > 0.25) pairs.push({ a: a.t, ac: a.cls.slice(0, 40), b: b.t, bc: b.cls.slice(0, 40), frac: Math.round(frac * 100) / 100 });
    }
    return { n: boxes.length, pairs };
  };
  const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  const ov = (a, b) => (a && b && a.w > 0 && b.w > 0 ? Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y)) : 0);
  const strips = [...document.querySelectorAll(sel)].filter((s) => onScreen(s) && s.getBoundingClientRect().width > 0);
  const strip = strips[0] || null;
  let tabs = [];
  let box = null;
  if (strip) {
    // The page panel that frames the strip (its nearest ancestor wider than the strip with a border / background).
    let p = strip.parentElement;
    while (p && p !== document.body) { const cs = getComputedStyle(p); if ((cs.borderTopWidth !== '0px' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') && p.getBoundingClientRect().width > strip.getBoundingClientRect().width - 1) break; p = p.parentElement; }
    box = R(p);
    tabs = [...strip.querySelectorAll('.rn-ptab')].map((t) => {
      const n = t.querySelector('.rn-pname'), o = t.querySelector('.rn-powner'), c = t.querySelector('.rn-pchip');
      const rn = R(n), ro = o && getComputedStyle(o).display !== 'none' ? R(o) : null, rc = R(c), rt = R(t);
      return {
        seat: Number(t.dataset.seat), name: n.textContent, owner: o ? o.textContent : null, ownerShown: !!(ro && ro.w > 0), title: o ? o.title : '',
        chip: c.textContent, tab: rt, nameR: rn, ownerR: ro,
        ovNameOwner: ov(rn, ro), ovOwnerChip: ov(ro, rc), ovNameChip: ov(rn, rc),
        ownerClipped: !!(o && ro && o.scrollWidth > o.clientWidth + 1), nameClipped: n.scrollWidth > n.clientWidth + 1,
        inBox: !!(box && rt.x >= box.x - 1 && rt.r <= box.r + 1),
      };
    });
  }
  return { fonts: document.fonts.status, strips: strips.length, box, tabs, audit: audit(true), auditRaw: audit(false) };
};

const EXPECT = { Host: ['you', 'Fox', LONG, 'AI'], Fox: ['Host', 'you', LONG, 'AI'], Long: ['Host', 'Fox', 'you', 'AI'] };
const fails = [];
function judge(where, tag, m, expectOwners) {
  if (!m.strips) { fails.push(`${where} ${tag}: no strip on screen`); return; }
  const pairs = m.audit.pairs.filter((p) => /rn-p/.test(p.ac) || /rn-p/.test(p.bc));
  if (pairs.length) fails.push(`${where} ${tag}: strip text overlap ${JSON.stringify(pairs)}`);
  for (const t of m.tabs) {
    if (t.ovNameOwner || t.ovOwnerChip || t.ovNameChip) fails.push(`${where} ${tag} seat ${t.seat}: overlap px name/owner ${t.ovNameOwner} owner/chip ${t.ovOwnerChip} name/chip ${t.ovNameChip}`);
    if (t.nameClipped) fails.push(`${where} ${tag} seat ${t.seat}: name clipped`);
    if (!t.inBox) fails.push(`${where} ${tag} seat ${t.seat}: tab outside its page ${JSON.stringify(t.tab)} vs ${JSON.stringify(m.box)}`);
    if (expectOwners) {
      if (t.owner !== expectOwners[t.seat]) fails.push(`${where} ${tag} seat ${t.seat}: owner '${t.owner}' expected '${expectOwners[t.seat]}'`);
      if (!t.ownerShown) fails.push(`${where} ${tag} seat ${t.seat}: owner line hidden`);
    } else if (t.ownerShown || t.owner) fails.push(`${where} ${tag} seat ${t.seat}: single-player tab shows an owner '${t.owner}'`);
  }
}

let srv = null;
const cl = [];
try {
  srv = await startServer(PORT);
  const url = (nm) => BASE + `?menu=0&seed=7&netname=${encodeURIComponent(nm)}&net=${encodeURIComponent(`ws://127.0.0.1:${PORT}/echoes`)}`;
  cl[0] = await openClient(url('Host'), 'Host');
  cl[1] = await openClient(url('Fox'), 'Fox');
  cl[2] = await openClient(url(LONG), 'Long');
  const [H, G, L] = cl;
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  for (const g of [G, L]) {
    await g.page.evaluate(async (c) => { const n = window.__echoes.net; await n.join(c); n.setReady(true); return 1; }, code);
    await sleep(300);
  }
  await sleep(500);
  await H.page.evaluate(() => window.__echoes.net.start());
  for (const g of [G, L]) await waitOn(g, () => window.__echoes.net.session.status().synced, 60000);
  out.seats = await H.page.evaluate(() => window.__echoes.net.room.seats.map((s) => ({ i: s.index, name: s.name, peer: !!s.peerId })));
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', 60000);
  await sleep(1500);
  await H.page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
  for (const c of cl) await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, 60000);
  await sleep(900);
  out.controllersGuest = await G.page.evaluate(() => { try { return window.__echoes.content.world().allySystem().controllers(); } catch (e) { return String(e); } });

  // 1) The party reward page.
  for (const [w, h] of SIZES) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1000);
    const r = {};
    for (const c of cl) {
      r[c.tag] = await c.page.evaluate(measure, '#run-screen .rn-pstrip');
      judge(`reward ${w}x${h}`, c.tag, r[c.tag], EXPECT[c.tag]);
      if (w === 1024 || w === 1920) await c.page.screenshot({ path: path.join(CAP, `${OUT}-reward-${c.tag}-${w}x${h}.png`) });
    }
    out.reward[`${w}x${h}`] = r;
    console.log('reward', w, h, cl.map((c) => `${c.tag}: ${r[c.tag].tabs.map((t) => `${t.name}|${t.owner}|ov${t.ovNameOwner}${t.ownerClipped ? '|ell' : ''}`).join(' ')} pairs ${r[c.tag].audit.pairs.length}/${r[c.tag].auditRaw.pairs.length}`).join(' || '));
  }
  // 2) The socket screen (each client opens its own), at the sizes.
  for (const c of cl) await c.page.evaluate(() => window.__echoes.cmd('openSocket'));
  await sleep(800);
  for (const [w, h] of SIZES) {
    for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await sleep(1000);
    const r = {};
    for (const c of cl) {
      r[c.tag] = await c.page.evaluate(measure, '.nd-strip .rn-pstrip');
      judge(`socket ${w}x${h}`, c.tag, r[c.tag], EXPECT[c.tag]);
      if (w === 1024 || w === 1920) await c.page.screenshot({ path: path.join(CAP, `${OUT}-socket-${c.tag}-${w}x${h}.png`) });
    }
    out.socket[`${w}x${h}`] = r;
    console.log('socket', w, h, cl.map((c) => `${c.tag}: ${r[c.tag].tabs.map((t) => `${t.name}|${t.owner}|ov${t.ovNameOwner}${t.ownerClipped ? '|ell' : ''}`).join(' ')} pairs ${r[c.tag].audit.pairs.length}`).join(' || '));
  }
  for (const c of cl) await c.page.evaluate(() => window.__echoes.cmd('closeSocket'));
  for (const c of cl) await c.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  // 3) The party shop: everyone decides, then the host skips to room 7.
  for (const c of cl) await c.page.evaluate(() => { try { const s = window.__echoes.net.seat ?? 0; window.__echoes.content.world().runSystem().partyPick(s, 'leave'); } catch { /* */ } return 1; });
  await sleep(1500);
  out.skip = await H.page.evaluate(() => { try { return window.__echoes.cmd('skipToRoom', 7); } catch (e) { return String(e); } });
  try {
    for (const c of cl) await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'shop'; }, 45000);
    await sleep(1200);
    for (const [w, h] of SIZES) {
      for (const c of cl) await c.page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await sleep(1000);
      const r = {};
      for (const c of cl) {
        r[c.tag] = await c.page.evaluate(measure, '#run-screen .rn-shopstrip .rn-pstrip');
        judge(`shop ${w}x${h}`, c.tag, r[c.tag], EXPECT[c.tag]);
        if (w === 1024 || w === 1920) await c.page.screenshot({ path: path.join(CAP, `${OUT}-shop-${c.tag}-${w}x${h}.png`) });
      }
      out.shop[`${w}x${h}`] = r;
      console.log('shop', w, h, cl.map((c) => `${c.tag}: ${r[c.tag].tabs.map((t) => `${t.name}|${t.owner}|ov${t.ovNameOwner}${t.ownerClipped ? '|ell' : ''}`).join(' ')} pairs ${r[c.tag].audit.pairs.length}`).join(' || '));
    }
  } catch (e) { out.shopErr = String(e.message || e); fails.push('shop not reached: ' + out.shopErr); }
} catch (e) { out.crash = String(e.stack || e); fails.push('crash ' + out.crash); console.log('CRASH', out.crash); }
finally {
  for (const c of cl) if (c) { out.errors[c.tag] = c.errors; if (c.errors.length) fails.push(`${c.tag} page errors ${c.errors.length}`); }
  for (const c of cl) if (c) await c.browser.close().catch(() => {});
  if (srv) srv.kill();
}
// 4) Single-player control (no session): the reward page's tabs carry no owner line.
try {
  const c = await openClient(BASE + '?menu=0&seed=7', 'sp', 1920, 1080);
  await waitOn(c, () => window.__echoes.tick > 240, 120000);
  await c.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(c, () => window.__echoes.state().run.phase === 'combat', 60000);
  await sleep(1200);
  await c.page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
  await waitOn(c, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, 60000);
  await sleep(1000);
  out.sp = await c.page.evaluate(measure, '#run-screen .rn-pstrip');
  judge('sp 1920x1080', 'sp', out.sp, null);
  await c.page.screenshot({ path: path.join(CAP, `${OUT}-sp-1920x1080.png`) });
  out.errors.sp = c.errors;
  if (c.errors.length) fails.push(`sp page errors ${c.errors.length}`);
  console.log('sp', out.sp.tabs.map((t) => `${t.name}|owner '${t.owner}' shown ${t.ownerShown} w${t.tab.w}`).join(' '));
  await c.browser.close().catch(() => {});
} catch (e) { fails.push('sp crash ' + String(e.message || e)); }
out.fails = fails;
out.verdict = fails.length ? 'FAIL' : 'PASS';
fs.writeFileSync(path.join(CAP, `${OUT}.json`), JSON.stringify(out, null, 1));
console.log(out.verdict, fails.length, JSON.stringify(fails.slice(0, 20)));
process.exit(0);
