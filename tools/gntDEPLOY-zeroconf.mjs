#!/usr/bin/env node
// gntDEPLOY-zeroconf — the DEPLOY acceptance flow (docs/gauntlet/PLAN.md §14,
// gates GD.1 / GD.2 / GD.3): fresh browser profiles open the game by its
// plain URL (NO ?net=, nothing in storage) and play together with ZERO
// settings touched — host: click Multiplayer -> Host a Game; guests: click
// Multiplayer -> Join by Code -> type the code -> Ready; host: Start.
//
//   node tools/gntDEPLOY-zeroconf.mjs --url http://127.0.0.1:7920/ [--guests 2]
//        [--tag static] [--insecure] [--w 1280 --h 720] [--expect ws://127.0.0.1:7920/echoes]
//
// Each profile is its own incognito-like browser context (separate
// localStorage / cache — a "fresh browser profile"). Real mouse clicks on
// the menu buttons, real key presses for the code. Output:
// captures/gntDEPLOY-zeroconf-<tag>.json (+ PNGs of mp-menu, lobby, in-game).
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes } from './gnt-arch-browser.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const url = arg('url', 'http://127.0.0.1:7920/');
const guests = Number(arg('guests', 2));
const tag = arg('tag', 'static');
const W = Number(arg('w', 1280));
const H = Number(arg('h', 720));
const expect = arg('expect', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('captures', { recursive: true });
const out = { url, tag, guests, checks: [], pages: [], shots: [], at: new Date().toISOString() };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 300)}`);
}

async function openProfile(browser, name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const rec = { name, ctx, page, errors: [], console: [], t0: 0 };
  page.on('pageerror', (e) => rec.errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') rec.console.push(`[${m.type()}] ${m.text()}`.slice(0, 300));
  });
  rec.t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  // Loading screen -> "press any key" -> title.
  for (let i = 0; i < 160; i++) {
    const st = await page.evaluate(() => window.__echoes.app.state).catch(() => null);
    if (st === 'title') break;
    if (i % 4 === 3) await page.keyboard.press('Enter').catch(() => {});
    await sleep(250);
  }
  rec.titleMs = Date.now() - rec.t0;
  await sleep(500);
  return rec;
}
async function waitFor(rec, fnSrc, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await rec.page.evaluate(new Function(`return (${fnSrc})`)).catch(() => null);
    if (v) return { ok: true, ms: Date.now() - t0, v };
    await sleep(80);
  }
  return { ok: false, ms };
}
async function click(rec, sel) {
  await rec.page.waitForSelector(sel, { visible: true, timeout: 8000 });
  await rec.page.click(sel);
}
const shot = async (rec, name) => {
  const p = `captures/gntDEPLOY-zeroconf-${tag}-${name}.png`;
  await rec.page.screenshot({ path: p });
  out.shots.push(p);
};
const addr = (rec) =>
  rec.page.evaluate(() => {
    const n = window.__echoes.net;
    const a = n.addressInfo ? n.addressInfo() : null;
    return { url: n.serverUrl, source: a && a.source, saved: window.__echoes.settings.get('net.serverUrl'), site: a && a.site, stored: localStorage.getItem('echoes.settings') };
  });

let browser = null;
const recs = [];
try {
  browser = await launchEchoes({ gpu: true, background: true, width: W, height: H, extraArgs: has('insecure') ? ['--ignore-certificate-errors'] : [] });
  const host = await openProfile(browser, 'host');
  recs.push(host);
  const a0 = await addr(host);
  check('host: fresh profile, nothing saved — the address is automatic from the page origin', a0.saved === '' && a0.source === 'site' && (!expect || a0.url === expect), a0);
  await click(host, '#ap-title-multiplayer');
  const on = await waitFor(host, "document.querySelector('.nt-mp .nt-status') && document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')", 8000);
  const side = await host.page.evaluate(() => ({ status: (document.querySelector('.nt-mp .nt-stext') || {}).textContent, addr: (document.querySelector('.nt-mp .nt-addr') || {}).textContent, lan: (document.querySelector('.nt-mp .nt-lan') || {}).textContent }));
  check('host: Multiplayer is online with no settings (click -> online)', on.ok, { ms: on.ms, ...side });
  await shot(host, 'host-mpmenu');
  await click(host, '#nt-mp-host');
  const lob = await waitFor(host, "window.__echoes.app.overlay === 'lobby' && /^[A-Z2-9]{5}$/.test((document.querySelector('.nt-roomcode')||{}).textContent||'')", 8000);
  const code = await host.page.evaluate(() => document.querySelector('.nt-roomcode').textContent);
  const invite = await host.page.evaluate(() => (document.querySelector('.nt-lanline') || {}).textContent || '');
  check('host: Host a Game -> lobby with a room code', lob.ok, { code, invite });
  out.code = code;
  out.invite = invite;
  await shot(host, 'host-lobby');

  const gs = [];
  for (let g = 0; g < guests; g++) {
    const gr = await openProfile(browser, `guest${g + 1}`);
    recs.push(gr);
    gs.push(gr);
    const ga = await addr(gr);
    check(`guest${g + 1}: fresh profile — automatic address, nothing typed`, ga.saved === '' && ga.source === 'site' && ga.url === a0.url, ga);
    await click(gr, '#ap-title-multiplayer');
    const gon = await waitFor(gr, "document.querySelector('.nt-mp .nt-status') && document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')", 8000);
    check(`guest${g + 1}: Multiplayer online`, gon.ok, { ms: gon.ms });
    await click(gr, '#nt-mp-join');
    await waitFor(gr, "window.__echoes.app.overlay === 'mp-join'", 4000);
    await gr.page.keyboard.type(code.toLowerCase(), { delay: 40 });
    await gr.page.keyboard.press('Enter');
    const gl = await waitFor(gr, "window.__echoes.app.overlay === 'lobby'", 8000);
    check(`guest${g + 1}: Join by Code ${code} -> lobby`, gl.ok, { ms: gl.ms });
    await sleep(300);
    await click(gr, '#nt-lobby-ready');
    await sleep(300);
    if (g === 0) await shot(gr, 'guest-lobby');
  }
  const canStart = await waitFor(host, "document.querySelector('#nt-lobby-start') && !document.querySelector('#nt-lobby-start').disabled", 8000);
  check('host: every guest ready -> Start enabled', canStart.ok, { ms: canStart.ms });
  await click(host, '#nt-lobby-start');
  const hs = await waitFor(host, "window.__echoes.net.role === 'host' && window.__echoes.app.state === 'playing'", 15000);
  check('host: in game as host', hs.ok, { ms: hs.ms });
  for (const gr of gs) {
    const gp = await waitFor(gr, "window.__echoes.net.role === 'guest' && window.__echoes.app.state === 'playing' && (() => { const s = window.__echoes.net.session; const st = s && s.status ? s.status() : null; return !st || st.synced; })()", 15000);
    gr.inGameMs = Date.now() - gr.t0;
    check(`${gr.name}: in game as guest, synced (page load -> in game ${Math.round(gr.inGameMs / 100) / 10} s, incl. reading the code)`, gp.ok, { ms: gp.ms, inGameMs: gr.inGameMs });
  }
  await sleep(2500);
  // Real movement on a guest reaches the host (the session plays).
  if (gs[0]) {
    const before = await host.page.evaluate(() => {
      const st = window.__echoes.state();
      const p = st && st.party ? st.party : null;
      return p ? JSON.stringify(p.map((m) => [Math.round(m.x * 10) / 10, Math.round(m.z * 10) / 10])) : null;
    }).catch(() => null);
    await gs[0].page.bringToFront().catch(() => {});
    await gs[0].page.keyboard.down('KeyD');
    await sleep(1200);
    await gs[0].page.keyboard.up('KeyD');
    await sleep(600);
    const after = await host.page.evaluate(() => {
      const st = window.__echoes.state();
      const p = st && st.party ? st.party : null;
      return p ? JSON.stringify(p.map((m) => [Math.round(m.x * 10) / 10, Math.round(m.z * 10) / 10])) : null;
    }).catch(() => null);
    out.move = { before, after };
  }
  await shot(host, 'host-ingame');
  if (gs[0]) await shot(gs[0], 'guest-ingame');
  for (const r of recs) {
    const a = await addr(r);
    const s = await r.page.evaluate(() => ({ role: window.__echoes.net.role, state: window.__echoes.app.state, stats: window.__echoes.net.stats ? (({ rttMs, lossPct }) => ({ rttMs, lossPct }))(window.__echoes.net.stats()) : null })).catch(() => null);
    out.pages.push({ name: r.name, titleMs: r.titleMs, inGameMs: r.inGameMs || null, address: a, ...s, errors: r.errors, console: r.console.slice(0, 8) });
  }
  check('zero settings: net.serverUrl stayed "" (automatic) on every profile', out.pages.every((p) => p.address.saved === ''), { saved: out.pages.map((p) => p.address.saved) });
  check('0 page errors on every profile', recs.every((r) => r.errors.length === 0), { errors: recs.map((r) => r.errors.slice(0, 3)) });
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
}
const fails = out.checks.filter((c) => !c.ok).length;
out.summary = `${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`;
writeFileSync(`captures/gntDEPLOY-zeroconf-${tag}.json`, JSON.stringify(out, null, 1));
console.log(out.summary);
process.exit(out.crash || fails ? 1 : 0);
