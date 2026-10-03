#!/usr/bin/env node
// gntDEPLOY-settings — the address rules a player can see and change
// (docs/gauntlet/PLAN.md §14.1, gates GD.1 / GD.7). Real clicks and typing.
//
//   node tools/gntDEPLOY-settings.mjs --dist dist-DEPLOY [--port 7928]
//
// Servers (in this process): A = `--static <dist>` on --port (the site),
// B = a plain session server on --port+1 (another server a player may pick).
//  1. Fresh profile on A: Settings ▸ Network shows "Automatic (this site) —
//     ws://127.0.0.1:A/echoes", "Reset to automatic" disabled.
//  2. Typing B's address + Enter saves it; the net client uses it at once;
//     after a reload it is still saved and wins (Multiplayer: online at B,
//     "Custom address").
//  3. "Reset to automatic" -> '' and the site's address, also after a reload.
//  4. A wrong saved address -> the unreachable panel names it as the saved
//     custom address and offers "Use this site's server" -> online at A.
//  5. ?net= wins over a saved address (and Settings says so).
//  6. Validation unchanged: http:// refused with the ws:// copy.
//  7. Legacy blobs: a v0.5.117 settings blob holding the old default
//     (ws://127.0.0.1:7800/echoes) boots as Automatic; one holding another
//     address keeps it as the saved address.
//  8. The page opened as a file (file://): what the player sees.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createEchoesServer } from '../server/server.mjs';
import { launchEchoes } from './gnt-arch-browser.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const dist = arg('dist', 'dist-DEPLOY');
const portA = Number(arg('port', 7928));
const portB = portA + 1;
const portX = portA + 2; // nothing listens here
const site = `http://127.0.0.1:${portA}/`;
const wsA = `ws://127.0.0.1:${portA}/echoes`;
const wsB = `ws://127.0.0.1:${portB}/echoes`;
const wsX = `ws://127.0.0.1:${portX}/echoes`;
const W = 1280;
const H = 720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('captures', { recursive: true });
const out = { site, checks: [], shots: [] };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 300)}`);
}
async function profile(browser, u, { preset = null } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const rec = { ctx, page, errors: [] };
  page.on('pageerror', (e) => rec.errors.push(String(e && e.message ? e.message : e)));
  if (preset) await page.evaluateOnNewDocument((blob) => {
    if (!sessionStorage.getItem('gnt-preset')) {
      localStorage.setItem('echoes.settings', blob);
      sessionStorage.setItem('gnt-preset', '1');
    }
  }, preset);
  await go(rec, u);
  return rec;
}
async function go(rec, u) {
  await rec.page.goto(u, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await toTitle(rec);
}
async function toTitle(rec) {
  await rec.page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  for (let i = 0; i < 160; i++) {
    const st = await rec.page.evaluate(() => window.__echoes.app.state).catch(() => null);
    if (st === 'title') break;
    if (i % 4 === 3) await rec.page.keyboard.press('Enter').catch(() => {});
    await sleep(250);
  }
  await sleep(500);
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
  const p = `captures/gntDEPLOY-settings-${name}.png`;
  await rec.page.screenshot({ path: p });
  out.shots.push(p);
};
const state = (rec) =>
  rec.page.evaluate(() => {
    const n = window.__echoes.net;
    const a = n.addressInfo();
    const q = (s) => (document.querySelector(s) || {}).textContent || null;
    return {
      url: n.serverUrl,
      source: a.source,
      saved: window.__echoes.settings.get('net.serverUrl'),
      input: (document.querySelector('#nt-set-server') || {}).value ?? null,
      placeholder: (document.querySelector('#nt-set-server') || {}).placeholder ?? null,
      note: q('.nt-textrow[data-row-id="nt-set-server"] .ap-note'),
      autoNote: q('.nt-autorow .ap-note'),
      autoDisabled: document.querySelector('#nt-set-auto') ? document.querySelector('#nt-set-auto').disabled : null,
    };
  });
async function openNetworkTab(rec) {
  await click(rec, '#ap-title-settings');
  await waitFor(rec, "window.__echoes.app.overlay === 'settings'", 4000);
  await click(rec, '#ap-tab-network');
  await waitFor(rec, "!!document.querySelector('#nt-set-server') && document.querySelector('#nt-set-server').getClientRects().length > 0", 4000);
  await sleep(250);
}
async function closeSettings(rec) {
  for (let i = 0; i < 4; i++) {
    const top = await rec.page.evaluate(() => window.__echoes.app.overlay);
    if (top === 'title') return;
    await rec.page.keyboard.press('Escape');
    await sleep(300);
  }
}
async function typeServer(rec, text) {
  await click(rec, '#nt-set-server');
  await rec.page.keyboard.down('Control');
  await rec.page.keyboard.press('KeyA');
  await rec.page.keyboard.up('Control');
  await rec.page.keyboard.press('Backspace');
  if (text) await rec.page.keyboard.type(text, { delay: 10 });
  await rec.page.keyboard.press('Enter');
  await sleep(300);
}
async function mpStatus(rec) {
  await click(rec, '#ap-title-multiplayer');
  const r = await waitFor(rec, "document.querySelector('.nt-mp .nt-status') && !document.querySelector('.nt-mp .nt-status').classList.contains('nt-checking')", 9000);
  const s = await rec.page.evaluate(() => ({
    cls: document.querySelector('.nt-mp .nt-status').className,
    addr: (document.querySelector('.nt-mp .nt-addr') || {}).textContent,
    panel: (document.querySelector('.nt-mp .nt-unreach') || {}).innerText || null,
    focus: (document.activeElement || {}).id || null,
  }));
  return { ...s, ms: r.ms };
}

let browser = null;
const recs = [];
let A = null;
let B = null;
try {
  A = createEchoesServer({ port: portA, host: '127.0.0.1', static: dist });
  await A.listen();
  B = createEchoesServer({ port: portB, host: '127.0.0.1' });
  await B.listen();
  browser = await launchEchoes({ gpu: true, background: true, width: W, height: H });

  // 1. fresh
  const p = await profile(browser, site);
  recs.push(p);
  await openNetworkTab(p);
  let s = await state(p);
  check('1 fresh: Settings ▸ Network shows "Automatic (this site) — <resolved>"; Reset to automatic disabled; input empty with the automatic placeholder', s.saved === '' && s.url === wsA && s.note === `Automatic (this site) — ${wsA}` && s.autoDisabled === true && s.input === '' && s.placeholder === 'Automatic', s);
  await shot(p, '1-automatic');
  // 6. validation unchanged
  await typeServer(p, 'http://example.com');
  s = await state(p);
  check('6 validation unchanged: http:// refused with "Server addresses start with ws:// or wss://", nothing saved', s.saved === '' && /start with ws:\/\/ or wss:\/\//.test(s.note || ''), { note: s.note, saved: s.saved });
  // 2. custom address
  await typeServer(p, wsB);
  s = await state(p);
  check('2 a typed address is saved and used at once; Reset to automatic enabled', s.saved === wsB && s.url === wsB && s.source === 'saved' && s.autoDisabled === false, s);
  await shot(p, '2-custom');
  await closeSettings(p);
  await go(p, site);
  const s2 = await p.page.evaluate(() => ({ url: window.__echoes.net.serverUrl, source: window.__echoes.net.addressInfo().source, saved: window.__echoes.settings.get('net.serverUrl') }));
  const m2 = await mpStatus(p);
  check('2 after a reload the saved address persists and wins over the site (Multiplayer online at it, "Custom address")', s2.saved === wsB && s2.url === wsB && /nt-online/.test(m2.cls) && /Custom address/.test(m2.addr), { ...s2, addr: m2.addr });
  await p.page.keyboard.press('Escape');
  await sleep(400);
  // 5. ?net= wins over saved
  await go(p, `${site}?net=${encodeURIComponent(wsA)}`);
  await openNetworkTab(p);
  s = await state(p);
  check('5 ?net= wins over the saved address, and Settings says so', s.url === wsA && s.source === 'param' && s.saved === wsB && /page link \(\?net=\)/.test(s.note || ''), s);
  await closeSettings(p);
  await go(p, site);
  // 3. reset
  await openNetworkTab(p);
  await click(p, '#nt-set-auto');
  await sleep(300);
  s = await state(p);
  check('3 Reset to automatic -> "" and the site address at once', s.saved === '' && s.url === wsA && s.source === 'site' && s.autoDisabled === true && s.note === `Automatic (this site) — ${wsA}`, s);
  await shot(p, '3-reset');
  await closeSettings(p);
  await go(p, site);
  const s3 = await p.page.evaluate(() => ({ url: window.__echoes.net.serverUrl, saved: window.__echoes.settings.get('net.serverUrl') }));
  check('3 still automatic after a reload', s3.saved === '' && s3.url === wsA, s3);
  // 4. wrong saved address
  await openNetworkTab(p);
  await typeServer(p, wsX);
  await closeSettings(p);
  const m4 = await mpStatus(p);
  check('4 a wrong saved address -> the unreachable panel names it as the saved custom address and offers "Use this site’s server"', /nt-unreachable/.test(m4.cls) && /custom address saved in Settings/.test(m4.panel || '') && /Use this site/.test(m4.panel || '') && m4.focus === 'nt-mp-retry', { panel: (m4.panel || '').slice(0, 260), focus: m4.focus });
  await shot(p, '4-wrong-saved');
  await click(p, '#nt-mp-auto');
  const back = await waitFor(p, "document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')", 9000);
  const s4 = await p.page.evaluate(() => ({ url: window.__echoes.net.serverUrl, saved: window.__echoes.settings.get('net.serverUrl') }));
  check('4 "Use this site’s server" -> automatic and online', back.ok && s4.saved === '' && s4.url === wsA, s4);
  await p.page.keyboard.press('Escape');

  // 7. legacy blobs
  const legacy = JSON.stringify({ v: 1, savedAt: '2026-09-20T10:00:00.000Z', data: { 'net.serverUrl': 'ws://127.0.0.1:7800/echoes', 'net.playerName': 'Legacy1', 'gameplay.screenshake': 0.5 } });
  const l1 = await profile(browser, site, { preset: legacy });
  recs.push(l1);
  const L1 = await l1.page.evaluate(() => ({ url: window.__echoes.net.serverUrl, saved: window.__echoes.settings.get('net.serverUrl'), name: window.__echoes.settings.get('net.playerName'), shake: window.__echoes.settings.get('gameplay.screenshake'), status: window.__echoes.settings.loadReport.status }));
  check('7 a v0.5.117 blob holding the old default boots as Automatic (other settings kept, loadReport ok)', L1.saved === '' && L1.url === wsA && L1.name === 'Legacy1' && L1.shake === 0.5 && L1.status === 'ok', L1);
  const legacy2 = JSON.stringify({ v: 1, savedAt: '2026-09-20T10:00:00.000Z', data: { 'net.serverUrl': wsB } });
  const l2 = await profile(browser, site, { preset: legacy2 });
  recs.push(l2);
  const L2 = await l2.page.evaluate(() => ({ url: window.__echoes.net.serverUrl, saved: window.__echoes.settings.get('net.serverUrl'), source: window.__echoes.net.addressInfo().source }));
  check('7 a blob holding another address keeps it as the saved address', L2.saved === wsB && L2.url === wsB && L2.source === 'saved', L2);
  // An explicit save of the old default after migration is kept.
  await openNetworkTab(l1);
  await typeServer(l1, 'ws://127.0.0.1:7800/echoes');
  await l1.page.evaluate(() => window.__echoes.settings.persist());
  await closeSettings(l1);
  await go(l1, site);
  const L3 = await l1.page.evaluate(() => ({ saved: window.__echoes.settings.get('net.serverUrl'), marker: window.__echoes.settings.get('net.serverUrlV') }));
  check('7 the migration runs once: typing ws://127.0.0.1:7800/echoes afterwards is kept across a reload', L3.saved === 'ws://127.0.0.1:7800/echoes' && L3.marker === 1, L3);

  // 8. file://
  const fileUrl = pathToFileURL(resolve(dist, 'index.html')).href;
  const fctx = await browser.createBrowserContext();
  const fp = await fctx.newPage();
  const ferr = [];
  const fcons = [];
  fp.on('pageerror', (e) => ferr.push(String(e.message)));
  fp.on('console', (m) => fcons.push(`[${m.type()}] ${m.text()}`.slice(0, 200)));
  await fp.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await fp.goto(fileUrl, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  const f = await fp.evaluate(() => ({ echoes: !!window.__echoes, text: document.body.innerText.slice(0, 400) })).catch(() => ({}));
  await fp.screenshot({ path: 'captures/gntDEPLOY-settings-8-file.png' });
  out.shots.push('captures/gntDEPLOY-settings-8-file.png');
  out.file = { url: fileUrl, ...f, console: fcons.slice(0, 6), errors: ferr.slice(0, 4) };
  check('8 file://: the boot card says how to run it (npm run serve + the address), not "check the connection"', /npm run serve/.test(out.file.text || '') && /opened as a file/.test(out.file.text || ''), out.file);
  await fctx.close();
  check('0 page errors (http pages)', recs.every((r) => r.errors.length === 0), { errors: recs.map((r) => r.errors.slice(0, 3)) });
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (A) await A.close();
  if (B) await B.close();
}
const fails = out.checks.filter((c) => !c.ok).length;
out.summary = `${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`;
writeFileSync('captures/gntDEPLOY-settings.json', JSON.stringify(out, null, 1));
console.log(out.summary);
process.exit(out.crash || fails ? 1 : 0);
