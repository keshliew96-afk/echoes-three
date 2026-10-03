#!/usr/bin/env node
// gntDEPLOY-redeploy — "a redeploy never strands players" (docs/gauntlet/
// PLAN.md §14.5, gate GD.6). Real servers, real pages, real clicks.
//
//   node tools/gntDEPLOY-redeploy.mjs --dist dist-DEPLOY [--port 7927] [--mode graceful|crash]
//
// The session servers run in this process (the same createEchoesServer the
// CLI runs) so the redeploy can be GRACEFUL — srv.close(): close 4007 to
// every client, what SIGTERM does under systemd on Linux — or a CRASH
// (--mode crash: every socket dropped without a close frame).
//
// Build A = --dist. Build B = a synthetic redeploy of A: a copy whose entry
// chunk has a NEW hashed name and a newer VERSION (0.5.999), version.json and
// index.html updated to match — what `npm run build` of a newer commit gives
// (new hashes, new version).
//  1. `--static A` on the port; host + guest (fresh profiles) open the link,
//     host a room, join by code, Start — both in game.
//  2. Redeploy: SIGTERM the server (graceful: close 4007 to every client),
//     start `--static B` on the same port.
//  3. Both stale pages return to the title ("Connection to the server was
//     lost"), then get "A new version of Echoes is available" (Reload / Not
//     now) without touching anything — time from restart to dialog.
//  4. The host presses Reload -> it runs B (version + entry). The guest
//     answers "Not now", then clicks Multiplayer -> the update panel (Reload
//     focused, Back works) — never "Can't reach" nor a bare version_mismatch.
//  5. The guest presses Reload -> B; host hosts again, guest joins by code
//     -> both in the lobby on B.
import { createEchoesServer } from '../server/server.mjs';
import { cpSync, readFileSync, writeFileSync, renameSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launchEchoes } from './gnt-arch-browser.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const distA = arg('dist', 'dist-DEPLOY');
const distB = `${distA}-B`;
const port = Number(arg('port', 7927));
const mode = arg('mode', 'graceful');
const W = 1280;
const H = 720;
const url = `http://127.0.0.1:${port}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { distA, distB, port, checks: [], shots: [], timeline: [] };
const T0 = Date.now();
const mark = (what, extra = {}) => out.timeline.push({ t: Date.now() - T0, what, ...extra });
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 300)}`);
}

// ---------------------------------------------------------- build B --
const vA = JSON.parse(readFileSync(join(distA, 'version.json'), 'utf8'));
const vB = { ...vA, version: '0.5.999', entry: vA.entry.replace(/-[A-Za-z0-9_-]{8,}\.js$/, '-REDPLOY9.js'), builtAt: new Date().toISOString() };
rmSync(distB, { recursive: true, force: true });
cpSync(distA, distB, { recursive: true });
const chunkA = join(distB, 'assets', vA.entry);
const js = readFileSync(chunkA, 'utf8').split(`\`${vA.version}\``).join(`\`${vB.version}\``).split(`"${vA.version}"`).join(`"${vB.version}"`).split(`'${vA.version}'`).join(`'${vB.version}'`);
writeFileSync(join(distB, 'assets', vB.entry), js);
rmSync(chunkA);
writeFileSync(join(distB, 'index.html'), readFileSync(join(distB, 'index.html'), 'utf8').split(vA.entry).join(vB.entry));
writeFileSync(join(distB, 'version.json'), `${JSON.stringify(vB)}\n`);
out.builds = { A: vA, B: vB };

async function startServer(dir) {
  const s = createEchoesServer({ port, host: '127.0.0.1', static: dir, origins: ['self'] });
  await s.listen();
  return s;
}
async function stopServer(s, how = 'graceful') {
  if (!s || s.stopped) return;
  s.stopped = true;
  if (how === 'crash') for (const rec of [...s.conns]) rec.conn.socket.destroy();
  await s.close();
}
async function openProfile(browser, name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const rec = { name, ctx, page, errors: [] };
  page.on('pageerror', (e) => rec.errors.push(String(e && e.message ? e.message : e)));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await toTitle(rec);
  return rec;
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
    await sleep(100);
  }
  return { ok: false, ms };
}
async function click(rec, sel) {
  await rec.page.waitForSelector(sel, { visible: true, timeout: 8000 });
  await rec.page.click(sel);
}
const shot = async (rec, name) => {
  const p = `captures/gntDEPLOY-redeploy-${mode}-${name}.png`;
  await rec.page.screenshot({ path: p });
  out.shots.push(p);
};
const ver = (rec) => rec.page.evaluate(() => ({ v: window.__echoes.version, entry: [...document.scripts].map((s) => s.src).find((s) => /assets\/index-/.test(s)) || null }));
const ONLINE = "document.querySelector('.nt-mp .nt-status') && document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')";
const DIALOG = "window.__echoes.app.overlay === 'confirm' && /new version of Echoes/i.test((document.querySelector('.ap-dlg-title')||{}).textContent||'')";

let browser = null;
let srv = null;
const recs = [];
try {
  mkdirSync('captures', { recursive: true });
  srv = await startServer(distA);
  mark('server A up');
  browser = await launchEchoes({ gpu: true, background: true, width: W, height: H });
  const host = await openProfile(browser, 'host');
  const guest = await openProfile(browser, 'guest');
  recs.push(host, guest);
  check('both pages run build A', (await ver(host)).v === vA.version && (await ver(guest)).v === vA.version, { host: await ver(host), guest: await ver(guest) });
  await click(host, '#ap-title-multiplayer');
  await waitFor(host, ONLINE, 8000);
  await click(host, '#nt-mp-host');
  await waitFor(host, "window.__echoes.app.overlay === 'lobby' && /^[A-Z2-9]{5}$/.test((document.querySelector('.nt-roomcode')||{}).textContent||'')", 8000);
  const code = await host.page.evaluate(() => document.querySelector('.nt-roomcode').textContent);
  await click(guest, '#ap-title-multiplayer');
  await waitFor(guest, ONLINE, 8000);
  await click(guest, '#nt-mp-join');
  await waitFor(guest, "window.__echoes.app.overlay === 'mp-join'", 4000);
  await guest.page.keyboard.type(code, { delay: 30 });
  await guest.page.keyboard.press('Enter');
  await waitFor(guest, "window.__echoes.app.overlay === 'lobby'", 8000);
  await click(guest, '#nt-lobby-ready');
  await waitFor(host, "document.querySelector('#nt-lobby-start') && !document.querySelector('#nt-lobby-start').disabled", 8000);
  await click(host, '#nt-lobby-start');
  const ig = await waitFor(guest, "window.__echoes.net.role === 'guest' && window.__echoes.app.state === 'playing'", 15000);
  check('A: host + guest in game', ig.ok, { code });
  await sleep(2000);

  // ------------------------------------------------------- redeploy --
  await stopServer(srv, mode);
  mark(`server A stopped (${mode})`);
  srv = await startServer(distB);
  const tUp = Date.now();
  mark('server B up');
  const back = await Promise.all([host, guest].map((r) => waitFor(r, "window.__echoes.app.state === 'title'", 20000)));
  check('both stale pages are back on the title (the session ended, single-player intact)', back.every((b) => b.ok), { ms: back.map((b) => b.ms) });
  const dlg = await Promise.all([host, guest].map((r) => waitFor(r, DIALOG, 35000)));
  const dlgMs = dlg.map((d) => (d.ok ? Date.now() - tUp : null));
  const body = await guest.page.evaluate(() => (document.querySelector('.ap-dlg-body') || {}).textContent || '');
  const focusId = await guest.page.evaluate(() => (document.activeElement || {}).id || null);
  check('both stale pages offer "A new version of Echoes is available" by themselves (Reload focused)', dlg.every((d) => d.ok) && focusId === 'ap-confirm-ok', { afterRestartMs: dlgMs, body, focusId });
  mark('update dialogs shown', { dlgMs });
  await shot(guest, 'stale-dialog');
  // Host reloads.
  await click(host, '#ap-confirm-ok');
  await host.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await toTitle(host);
  const hv = await ver(host);
  check('host: Reload -> runs build B (new version, new entry chunk)', hv.v === vB.version && String(hv.entry).endsWith(vB.entry), hv);
  // Guest: Not now -> Multiplayer -> update panel.
  await click(guest, '#ap-confirm-cancel');
  await sleep(400);
  await click(guest, '#ap-title-multiplayer');
  const panel = await waitFor(guest, "document.querySelector('.nt-mp .nt-status.nt-update') && document.querySelector('#nt-mp-reload')", 10000);
  const pText = await guest.page.evaluate(() => (document.querySelector('.nt-mp .nt-actions') || {}).innerText || '');
  const pFocus = await guest.page.evaluate(() => (document.activeElement || {}).id || null);
  check('stale guest: Multiplayer shows the update panel (Reload focused), never "Can’t reach" nor a bare version_mismatch', panel.ok && pFocus === 'nt-mp-reload' && !/can.t reach|different version|version_mismatch/i.test(pText), { ms: panel.ms, focus: pFocus, text: pText.slice(0, 220) });
  await shot(guest, 'stale-mpmenu');
  await guest.page.keyboard.press('Escape');
  const esc = await waitFor(guest, "window.__echoes.app.overlay === 'title' || window.__echoes.app.screens && false", 3000);
  const topAfter = await guest.page.evaluate(() => window.__echoes.app.overlay);
  check('stale guest: Back / Esc leaves the panel (no dead end)', topAfter === 'title' || esc.ok, { top: topAfter });
  await click(guest, '#ap-title-multiplayer');
  await waitFor(guest, "document.querySelector('#nt-mp-reload')", 8000);
  await click(guest, '#nt-mp-reload');
  await guest.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await toTitle(guest);
  const gv = await ver(guest);
  check('guest: Reload -> runs build B', gv.v === vB.version && String(gv.entry).endsWith(vB.entry), gv);
  // Play again on B.
  await click(host, '#ap-title-multiplayer');
  const hon = await waitFor(host, ONLINE, 8000);
  await click(host, '#nt-mp-host');
  await waitFor(host, "window.__echoes.app.overlay === 'lobby' && /^[A-Z2-9]{5}$/.test((document.querySelector('.nt-roomcode')||{}).textContent||'')", 8000);
  const code2 = await host.page.evaluate(() => document.querySelector('.nt-roomcode').textContent);
  await click(guest, '#ap-title-multiplayer');
  const gon = await waitFor(guest, ONLINE, 8000);
  await click(guest, '#nt-mp-join');
  await waitFor(guest, "window.__echoes.app.overlay === 'mp-join'", 4000);
  await guest.page.keyboard.type(code2, { delay: 30 });
  await guest.page.keyboard.press('Enter');
  const gl = await waitFor(guest, "window.__echoes.app.overlay === 'lobby'", 8000);
  check('B: both online again, guest joins the host’s new room', hon.ok && gon.ok && gl.ok, { code2 });
  await shot(guest, 'b-lobby');
  check('0 page errors', recs.every((r) => r.errors.length === 0), { errors: recs.map((r) => r.errors.slice(0, 3)) });
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopServer(srv);
  rmSync(distB, { recursive: true, force: true });
}
const fails = out.checks.filter((c) => !c.ok).length;
out.summary = `${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`;
writeFileSync(`captures/gntDEPLOY-redeploy-${mode}.json`, JSON.stringify(out, null, 1));
console.log(out.summary);
process.exit(out.crash || fails ? 1 : 0);
