#!/usr/bin/env node
// gntM5b-ui2 — the rest of G5b.13 by REAL keyboard input. Owner: M5b.
//   A. every action re-probes: with the menu Online, the server dies, then
//      Host a Game / Join by Code / Quick Match each land on the unreachable
//      panel within 5 s; the server comes back -> Retry is Online within 5 s.
//   B. https page (tools/gntM5b-https.mjs serving the production build over a
//      self-signed loopback cert): the unreachable panel carries the https
//      line; Change server rejects ws:// with the mixed-content copy and
//      accepts wss://.
//   C. Back from the unreachable panel returns to the title; 0 page errors.
//   node tools/gntM5b-ui2.mjs [--port 7821] [--httpsPort 7829] [--base http://127.0.0.1:4307/] [--dist dist-M5b]
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { startServer, launchEchoes, sleep } from './gntM5b-lib.mjs';
import { openEchoesWindow } from './gntM5a-botlib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7821));
const httpsPort = Number(arg('httpsPort', 7829));
const base = arg('base', 'http://127.0.0.1:4307/');
const dist = arg('dist', 'dist-M5b');
const W = 1600;
const H = 900;
const out = { checks: [] };
const check = (name, ok, detail = {}) => {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 300)}`);
};
async function openTitle(browser, url) {
  const c = await openEchoesWindow(browser, url, { width: W, height: H });
  for (let i = 0; i < 80; i++) {
    const st = await c.page.evaluate(() => window.__echoes && window.__echoes.app && window.__echoes.app.state).catch(() => null);
    if (st === 'title') break;
    if (i % 5 === 4) await c.page.keyboard.press('Enter');
    await sleep(250);
  }
  await sleep(600);
  return c;
}
const focus = (c) => c.page.evaluate(() => (window.__echoes.app.focus() || {}).id || null);
async function focusOn(c, id, key = 'ArrowDown', max = 16) {
  for (let i = 0; i < max; i++) {
    if ((await focus(c)) === id) return true;
    await c.page.keyboard.press(key);
    await sleep(110);
  }
  return (await focus(c)) === id;
}
async function waitFor(c, src, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await c.page.evaluate(new Function(`return (${src})`)).catch(() => null);
    if (v) return { ok: true, ms: Date.now() - t0 };
    await sleep(80);
  }
  return { ok: false, ms: Date.now() - t0 };
}
const UNREACH = "document.querySelector('.nt-mp .nt-status') && document.querySelector('.nt-mp .nt-status').classList.contains('nt-unreachable') && document.querySelector('#nt-mp-retry') && document.querySelector('#nt-mp-retry').isConnected";
const ONLINE = "document.querySelector('.nt-mp .nt-status') && document.querySelector('.nt-mp .nt-status').classList.contains('nt-online')";

let srv = null;
let browser = null;
let https = null;
const pages = [];
try {
  browser = await launchEchoes({ gpu: true, background: true, width: W, height: H, extraArgs: ['--ignore-certificate-errors'] });
  const netUrl = `ws://127.0.0.1:${port}/echoes`;
  // ------------------------------------------------------------ A actions
  srv = await startServer({ port, admin: true });
  const a = await openTitle(browser, `${base}?fresh=1&net=${encodeURIComponent(netUrl)}&netname=Prober`);
  pages.push(a);
  await focusOn(a, 'ap-title-multiplayer');
  await a.page.keyboard.press('Enter');
  check('menu online first', (await waitFor(a, ONLINE, 6000)).ok);
  for (const [id, label] of [['nt-mp-host', 'Host a Game'], ['nt-mp-join', 'Join by Code'], ['nt-mp-quick', 'Quick Match']]) {
    await srv.stop();
    srv = null;
    await sleep(600);
    // The menu may already have noticed (its socket closed): bring it back
    // to Online first when needed, so the press itself does the probing.
    const onlineNow = await a.page.evaluate(new Function(`return (${ONLINE})`));
    let focused = await focusOn(a, id, 'ArrowDown');
    if (!focused) focused = await focusOn(a, id, 'ArrowUp');
    const t0 = Date.now();
    await a.page.keyboard.press('Enter');
    const u = await waitFor(a, UNREACH, 9000);
    check(`${label} with the server gone -> unreachable panel within 5 s`, u.ok && u.ms <= 5000, { ms: u.ms, focused, onlineBefore: onlineNow, top: await a.page.evaluate(() => window.__echoes.app.overlay) });
    srv = await startServer({ port, admin: true });
    await focusOn(a, 'nt-mp-retry', 'ArrowUp', 6);
    const tR = Date.now();
    await a.page.keyboard.press('Enter');
    const on = await waitFor(a, ONLINE, 7000);
    check(`Retry after ${label}: Online within 5 s of the server starting`, on.ok && Date.now() - tR <= 5000, { ms: Date.now() - tR });
    if ((await a.page.evaluate(() => window.__echoes.app.overlay)) !== 'mp-menu') {
      await a.page.keyboard.press('Escape');
      await sleep(400);
    }
  }
  // Back from the unreachable panel -> title.
  await srv.stop();
  srv = null;
  await sleep(500);
  await focusOn(a, 'nt-mp-host');
  await a.page.keyboard.press('Enter');
  await waitFor(a, UNREACH, 9000);
  await focusOn(a, 'nt-mp-uback', 'ArrowDown', 6);
  await a.page.keyboard.press('Enter');
  await sleep(500);
  check('Back on the unreachable panel returns to the title', (await a.page.evaluate(() => window.__echoes.app.overlay)) === 'title', { top: await a.page.evaluate(() => window.__echoes.app.overlay) });
  await a.page.screenshot({ path: 'captures/gntM5b-ui2-backtitle.png' });

  // --------------------------------------------------------------- B https
  https = spawn(process.execPath, ['tools/gntM5b-https.mjs', '--dir', dist, '--port', String(httpsPort)], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('https server not ready')), 15000);
    https.stdout.on('data', (d) => {
      if (String(d).includes('ready')) {
        clearTimeout(t);
        res();
      }
    });
  });
  const hp = await openTitle(browser, `https://127.0.0.1:${httpsPort}/?fresh=1&netname=Secure`);
  pages.push(hp);
  check('https page boots to the title', (await hp.page.evaluate(() => location.protocol + ' ' + window.__echoes.app.state)) === 'https: title');
  await focusOn(hp, 'ap-title-multiplayer');
  await hp.page.keyboard.press('Enter');
  const hu = await waitFor(hp, UNREACH, 9000);
  const copy = await hp.page.evaluate(() => (document.querySelector('.nt-unreach') || {}).innerText || '');
  check('https: unreachable panel within 5 s with the https (wss://) line', hu.ok && hu.ms <= 5000 && /served over https, so the browser only allows secure \(wss:\/\/\) servers/.test(copy), { ms: hu.ms, copy: copy.slice(0, 260) });
  await hp.page.screenshot({ path: 'captures/gntM5b-ui2-https-unreachable.png' });
  await focusOn(hp, 'nt-mp-change', 'ArrowDown', 6);
  await hp.page.keyboard.press('Enter');
  await waitFor(hp, "window.__echoes.app.overlay === 'nt-server'", 3000);
  const typeUrl = async (u) => {
    await hp.page.keyboard.down('Control');
    await hp.page.keyboard.press('KeyA');
    await hp.page.keyboard.up('Control');
    await hp.page.keyboard.type(u);
    await hp.page.keyboard.press('Enter');
    await sleep(300);
  };
  const before = await hp.page.evaluate(() => window.__echoes.settings.get('net.serverUrl'));
  await typeUrl('ws://127.0.0.1:7811/echoes');
  const err = await hp.page.evaluate(() => (document.querySelector('.nt-server .nt-err') || {}).textContent || '');
  const kept = await hp.page.evaluate(() => window.__echoes.settings.get('net.serverUrl'));
  check('https: Change server rejects ws:// with the mixed-content copy (setting unchanged)', /served over https/.test(err) && /wss:\/\//.test(err) && kept === before, { err, before, kept });
  await hp.page.screenshot({ path: 'captures/gntM5b-ui2-https-changeserver.png' });
  await typeUrl('wss://127.0.0.1:7800/echoes');
  const saved = await hp.page.evaluate(() => window.__echoes.settings.get('net.serverUrl'));
  check('https: Change server accepts and saves wss://', saved === 'wss://127.0.0.1:7800/echoes', { saved });
  out.errors = pages.map((p) => p.errors.slice(0, 5));
  check('0 page errors throughout', pages.every((p) => p.errors.length === 0), { errors: out.errors });
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
  if (https) https.kill();
}
writeFileSync('captures/gntM5b-ui2.json', JSON.stringify(out, null, 1));
const fails = out.checks.filter((c) => !c.ok).length;
console.log(`${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`);
process.exit(out.crash ? 1 : 0);
