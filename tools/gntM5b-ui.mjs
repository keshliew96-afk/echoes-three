#!/usr/bin/env node
// M5b UI flow probe (G5b.13 + lobby UX) by REAL keyboard input:
//   A. no server: title -> Multiplayer -> unreachable panel (time to panel),
//      Retry succeeds once the server starts, Change server validates
//      ws:// / wss://, Back returns to the title;
//   B. host window: Multiplayer -> Host a Game -> lobby (code read off the
//      screen); guest window: Multiplayer -> Join by Code -> type -> lobby ->
//      Ready; host Start -> both in game (session roles, app state playing);
//   C. layout audit of mp-menu / lobby / join at the given size (rects in
//      the viewport, pairwise non-overlap of buttons, type >= 14 px);
// screenshots of every screen. Title-boot pages (plain URL + ?net=).
//   node tools/gntM5b-ui.mjs [--port 7822] [--w 1600 --h 900] [--base http://127.0.0.1:5199/]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, sleep } from './gntM5b-lib.mjs';
import { openEchoesWindow } from './gntM5a-botlib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7822));
const W = Number(arg('w', 1600));
const H = Number(arg('h', 900));
const base = arg('base', 'http://127.0.0.1:5199/');
const tag = `${W}x${H}`;
const out = { size: tag, checks: [], shots: [] };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 400)}`);
}
const shot = async (c, name) => {
  const p = `captures/gntM5b-ui-${name}-${tag}.png`;
  await c.page.screenshot({ path: p });
  out.shots.push(p);
};

async function openTitle(browser, extra) {
  const q = new URLSearchParams({ fresh: '1', ...extra });
  const c = await openEchoesWindow(browser, `${base}?${q}`, { width: W, height: H });
  // Loading splash -> any key.
  for (let i = 0; i < 80; i++) {
    const st = await c.page.evaluate(() => window.__echoes.app.state);
    if (st === 'title') break;
    if (i % 5 === 4) await c.page.keyboard.press('Enter');
    await sleep(250);
  }
  await sleep(600);
  return c;
}
const focus = (c) => c.page.evaluate(() => {
  const f = window.__echoes.app.focus();
  return f ? f.id : null;
});
const top = (c) => c.page.evaluate(() => window.__echoes.app.overlay);
async function focusOn(c, id, key = 'ArrowDown', max = 14) {
  for (let i = 0; i < max; i++) {
    if ((await focus(c)) === id) return true;
    await c.page.keyboard.press(key);
    await sleep(120);
  }
  return (await focus(c)) === id;
}
async function waitFor(c, fnSrc, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await c.page.evaluate(new Function(`return (${fnSrc})`)).catch(() => null);
    if (v) return { ok: true, ms: Date.now() - t0, v };
    await sleep(100);
  }
  return { ok: false, ms };
}
async function layoutAudit(c, screenSel) {
  return c.page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return { found: false };
    const vw = innerWidth;
    const vh = innerHeight;
    const items = [...root.querySelectorAll('[data-nav]')].filter((n) => n.getClientRects().length);
    const rects = items.map((n) => {
      const r = n.getBoundingClientRect();
      return { id: n.id, x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const outside = rects.filter((r) => r.x < -0.5 || r.y < -0.5 || r.x + r.w > vw + 0.5 || r.y + r.h > vh + 0.5).map((r) => r.id);
    const overlaps = [];
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (a.x < b.x + b.w - 0.5 && a.x + a.w > b.x + 0.5 && a.y < b.y + b.h - 0.5 && a.y + a.h > b.y + 0.5) overlaps.push([a.id, b.id]);
      }
    const small = rects.filter((r) => r.w < 40 || r.h < 40).map((r) => r.id);
    let minFont = 99;
    for (const n of root.querySelectorAll('*')) {
      if (!n.getClientRects().length) continue;
      const txt = [...n.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent.trim()).join('');
      if (!txt) continue;
      const fs = parseFloat(getComputedStyle(n).fontSize);
      if (fs < minFont) minFont = fs;
    }
    return { found: true, items: rects.length, outside, overlaps, small, minFont: Math.round(minFont * 10) / 10 };
  }, screenSel);
}

let srv = null;
let browser = null;
try {
  browser = await launchEchoes({ gpu: true, background: true, width: W, height: H });
  const netUrl = `ws://127.0.0.1:${port}/echoes`;
  // ----------------------------------------------------------- A no server
  const a = await openTitle(browser, { net: netUrl, netname: 'Alone' });
  const hasMp = await a.page.evaluate(() => !!document.querySelector('#ap-title-multiplayer'));
  check('title shows Multiplayer (mp-menu registered)', hasMp, {});
  await focusOn(a, 'ap-title-multiplayer');
  const tPress = Date.now();
  await a.page.keyboard.press('Enter');
  const un = await waitFor(a, "document.querySelector('.nt-unreach') && document.querySelector('.nt-unreach').isConnected && document.querySelector('.nt-mp .nt-status').classList.contains('nt-unreachable')", 8000);
  check('no server: unreachable panel within 5 s (no endless spinner)', un.ok && Date.now() - tPress <= 5500, { ms: Date.now() - tPress });
  const copy = await a.page.evaluate(() => document.querySelector('.nt-unreach').innerText);
  check('unreachable copy names the server and `npm run net`', /Can.t reach the Echoes server at ws:\/\/127\.0\.0\.1:\d+\/echoes/.test(copy) && /npm run net/.test(copy) && /--host 0\.0\.0\.0/.test(copy), { copy: copy.slice(0, 200) });
  check('Retry has default focus', (await focus(a)) === 'nt-mp-retry', { focus: await focus(a) });
  await shot(a, 'unreachable');
  const lay0 = await layoutAudit(a, '.nt-mp');
  check('unreachable layout: inside viewport, no overlap, >= 40 px targets, type >= 14 px', lay0.found && !lay0.outside.length && !lay0.overlaps.length && !lay0.small.length && lay0.minFont >= 14, lay0);
  // Change server: invalid then valid.
  const fc = await focusOn(a, 'nt-mp-change', 'ArrowDown', 4);
  if (!fc) console.log('focus now', await focus(a));
  await a.page.keyboard.press('Enter');
  const dlg = await waitFor(a, "window.__echoes.app.overlay === 'nt-server'", 3000);
  check('Change server opens its dialog (keyboard)', dlg.ok, { focus: await focus(a), top: await top(a) });
  await a.page.keyboard.down('Control');
  await a.page.keyboard.press('KeyA');
  await a.page.keyboard.up('Control');
  await a.page.keyboard.type('http://example.com');
  await a.page.keyboard.press('Enter');
  await sleep(200);
  const bad = await a.page.evaluate(() => document.querySelector('.nt-server .nt-err').textContent);
  check('Change server rejects a non ws:// address with a clear message', /ws:\/\/ or wss:\/\//.test(bad), { bad });
  await shot(a, 'changeserver');
  await a.page.keyboard.down('Control');
  await a.page.keyboard.press('KeyA');
  await a.page.keyboard.up('Control');
  await a.page.keyboard.type(netUrl);
  await a.page.keyboard.press('Enter');
  await sleep(300);
  const saved = await a.page.evaluate(() => window.__echoes.settings.get('net.serverUrl'));
  check('Change server saves a valid ws:// URL to net.serverUrl', saved === netUrl, { saved });
  // The dialog's save re-probes by itself (the server is still down):
  // wait for the unreachable panel again, THEN start the server and Retry.
  const again = await waitFor(a, "window.__echoes.app.overlay === 'mp-menu' && document.querySelector('.nt-mp .nt-status').classList.contains('nt-unreachable') && document.querySelector('#nt-mp-retry') && document.querySelector('#nt-mp-retry').isConnected", 9000);
  check('after Change server the menu re-checks and shows the panel again', again.ok, { ms: again.ms });
  srv = await startServer({ port, admin: true, extra: ['--host', '0.0.0.0'] });
  const tRetry = Date.now();
  await focusOn(a, 'nt-mp-retry', 'ArrowUp', 4);
  await a.page.keyboard.press('Enter');
  const on = await waitFor(a, "document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')", 6000);
  check('Retry succeeds within 5 s of the server starting', on.ok && Date.now() - tRetry <= 5000, { ms: Date.now() - tRetry });
  const lan = await a.page.evaluate(() => document.querySelector('.nt-mp .nt-lan').textContent);
  check('--host 0.0.0.0: the menu lists the LAN URLs', /ws:\/\/\d+\.\d+\.\d+\.\d+:\d+\/echoes/.test(lan), { lan: lan.slice(0, 160) });
  await sleep(300);
  await shot(a, 'mpmenu-online');
  const lay1 = await layoutAudit(a, '.nt-mp');
  check('mp-menu layout: inside viewport, no overlap, >= 40 px, type >= 14 px', lay1.found && !lay1.outside.length && !lay1.overlaps.length && !lay1.small.length && lay1.minFont >= 14, lay1);
  await a.page.keyboard.press('Escape');
  await sleep(400);
  check('Back returns to the title', (await top(a)) === 'title', { top: await top(a) });
  await a.page.close();

  // ----------------------------------------------------- B host + guest
  const host = await openTitle(browser, { net: netUrl, netname: 'Hosty' });
  const guest = await openTitle(browser, { net: netUrl, netname: 'Guesty' });
  await focusOn(host, 'ap-title-multiplayer');
  await host.page.keyboard.press('Enter');
  await waitFor(host, "document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')", 6000);
  await sleep(200);
  await focusOn(host, 'nt-mp-host');
  await host.page.keyboard.press('Enter');
  const inLobby = await waitFor(host, "window.__echoes.app.overlay === 'lobby' && /^[A-Z2-9]{5}$/.test(document.querySelector('.nt-roomcode').textContent)", 6000);
  const code = await host.page.evaluate(() => document.querySelector('.nt-roomcode').textContent);
  check('Host a Game -> lobby with a 5-char code', inLobby.ok, { code });
  const lanLine = await host.page.evaluate(() => document.querySelector('.nt-lanline').textContent);
  check('host lobby shows "Friends on your network: server … · code …"', lanLine.includes('Friends on your network') && lanLine.includes(code), { lanLine });
  await focusOn(guest, 'ap-title-multiplayer');
  await guest.page.keyboard.press('Enter');
  await waitFor(guest, "document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')", 6000);
  await sleep(200);
  await focusOn(guest, 'nt-mp-join');
  await guest.page.keyboard.press('Enter');
  await sleep(400);
  await guest.page.keyboard.type('zzzz9');
  await guest.page.keyboard.press('Enter');
  const nf = await waitFor(guest, "document.querySelector('.nt-join .nt-err') && /No room with that code/.test(document.querySelector('.nt-join .nt-err').textContent)", 5000);
  check('join with an unknown code -> explicit "not found" message', nf.ok, { msg: nf.v ? await guest.page.evaluate(() => document.querySelector('.nt-join .nt-err').textContent) : null });
  await shot(guest, 'join-error');
  await guest.page.keyboard.down('Control');
  await guest.page.keyboard.press('KeyA');
  await guest.page.keyboard.up('Control');
  await guest.page.keyboard.type(code.toLowerCase());
  await guest.page.keyboard.press('Enter');
  const gl = await waitFor(guest, "window.__echoes.app.overlay === 'lobby'", 6000);
  check('Join by Code (typed lower-case) -> lobby', gl.ok, {});
  await sleep(500);
  await shot(host, 'lobby-host');
  const layL = await layoutAudit(host, '.nt-lobby');
  check('lobby layout: inside viewport, no overlap, >= 40 px, type >= 14 px', layL.found && !layL.outside.length && !layL.overlaps.length && !layL.small.length && layL.minFont >= 14, layL);
  const startDisabled = await host.page.evaluate(() => document.querySelector('#nt-lobby-start').disabled);
  check('Start is disabled until the guest is ready (reason shown)', startDisabled, { caption: await host.page.evaluate(() => document.querySelector('#nt-lobby-start .nt-bc').textContent) });
  await focusOn(guest, 'nt-lobby-ready', 'ArrowDown', 8);
  await guest.page.keyboard.press('Enter');
  await waitFor(host, "!document.querySelector('#nt-lobby-start').disabled", 5000);
  await shot(guest, 'lobby-guest');
  await focusOn(host, 'nt-lobby-start', 'ArrowDown', 8);
  const tStart = Date.now();
  await host.page.keyboard.press('Enter');
  const playing = await waitFor(host, "window.__echoes.app.state === 'playing' && window.__echoes.net.session.role === 'host'", 8000);
  const gplaying = await waitFor(guest, "window.__echoes.app.state === 'playing' && window.__echoes.net.session.status().synced", 8000);
  check('Start -> countdown -> both in game (host plays, guest synced)', playing.ok && gplaying.ok, { ms: Date.now() - tStart });
  await sleep(1500);
  await shot(host, 'ingame-host');
  await shot(guest, 'ingame-guest');
  const hudG = await guest.page.evaluate(() => {
    const e = document.querySelector('#nt-hud');
    return e ? { on: !e.classList.contains('nt-off'), chip: e.querySelector('.nt-chip').innerText } : null;
  });
  check('guest net HUD chip shows role + room + players', hudG && hudG.on && /Online/.test(hudG.chip) && hudG.chip.includes(code), hudG || {});
  out.errors = { host: host.errors, guest: guest.errors, alone: a.errors };
  check('0 page errors throughout', !host.errors.length && !guest.errors.length && !a.errors.length, out.errors);
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync(`captures/gntM5b-ui-${tag}.json`, JSON.stringify(out, null, 1));
const fails = out.checks.filter((c) => !c.ok).length;
console.log(`${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`);
process.exit(out.crash ? 1 : 0);
