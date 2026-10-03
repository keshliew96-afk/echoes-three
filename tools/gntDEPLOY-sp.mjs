#!/usr/bin/env node
// gntDEPLOY-sp — single-player never touches the network (docs/gauntlet/
// PLAN.md §14, gate GD.9). Now that the client resolves a server from the
// page's own origin, prove that nothing connects to it unless the player
// opens Multiplayer: a plain page with NO session server anywhere boots to
// the title, New Game, walks into the portal and plays room 1 to its reward
// — zero /echoes WebSockets (CDP Network.webSocketCreated), zero page errors.
// Then opening Multiplayer makes exactly the probe sockets and shows the
// unreachable panel with the dev-proxy copy.
//
//   node tools/gntDEPLOY-sp.mjs [--url http://127.0.0.1:5199/]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes } from './gnt-arch-browser.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5199/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('captures', { recursive: true });
const out = { url, checks: [] };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 300)}`);
}
let browser = null;
try {
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  const sockets = [];
  cdp.on('Network.webSocketCreated', (e) => {
    if (/\/echoes(\?|$)/.test(e.url)) sockets.push({ url: e.url, t: Date.now() });
  });
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}fresh=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.app, { timeout: 180000 });
  for (let i = 0; i < 160; i++) {
    if ((await page.evaluate(() => window.__echoes.app.state)) === 'title') break;
    if (i % 4 === 3) await page.keyboard.press('Enter');
    await sleep(250);
  }
  await sleep(1500);
  const addr = await page.evaluate(() => ({ url: window.__echoes.net.serverUrl, source: window.__echoes.net.addressInfo().source, state: window.__echoes.net.state }));
  check('title: the automatic address is resolved (the site) but nothing connects', sockets.length === 0 && addr.state === 'offline', { sockets: sockets.length, ...addr });
  await page.click('#ap-title-new');
  let st = null;
  for (let i = 0; i < 60; i++) {
    st = await page.evaluate(() => window.__echoes.app.state);
    if (st === 'playing') break;
    await sleep(200);
  }
  await sleep(1500);
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 90; i++) {
    if (await page.evaluate(() => window.__echoes.cmd('campState').inPortal)) break;
    await sleep(100);
  }
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  let run = null;
  for (let i = 0; i < 80; i++) {
    run = await page.evaluate(() => {
      const s = window.__echoes.state();
      return { phase: s.run && s.run.phase, room: s.run && s.run.room };
    });
    if (run.phase === 'combat' && run.room === 1) break;
    await sleep(100);
  }
  for (let i = 0; i < 40; i++) {
    const ph = await page.evaluate(() => {
      window.__echoes.cmd('killAllEnemies');
      return window.__echoes.state().run.phase;
    });
    if (ph !== 'combat') break;
    await sleep(250);
  }
  const end = await page.evaluate(() => ({ app: window.__echoes.app.state, phase: window.__echoes.state().run.phase, room: window.__echoes.state().run.room, net: window.__echoes.net.state }));
  check('single-player: New Game -> portal -> room 1 -> reward with ZERO /echoes sockets', end.app === 'playing' && end.phase === 'reward' && end.room === 1 && sockets.length === 0, { ...end, sockets: sockets.length });
  // Back to the title and open Multiplayer: now (and only now) it probes.
  await page.evaluate(() => window.__echoes.app.quitToTitle({ save: false }));
  for (let i = 0; i < 40; i++) {
    if ((await page.evaluate(() => window.__echoes.app.state)) === 'title') break;
    await sleep(150);
  }
  await sleep(800);
  await page.click('#ap-title-multiplayer');
  let panel = null;
  for (let i = 0; i < 80; i++) {
    panel = await page.evaluate(() => (document.querySelector('.nt-mp .nt-status.nt-unreachable') ? (document.querySelector('.nt-mp .nt-unreach') || {}).innerText : null));
    if (panel) break;
    await sleep(100);
  }
  await page.screenshot({ path: 'captures/gntDEPLOY-sp-unreachable.png' });
  check('Multiplayer with no session server: the unreachable panel names the site address and the fix (npm run net), sockets only now', !!panel && /npm run net/.test(panel) && sockets.length > 0 && sockets.every((s) => s.url === addr.url), { sockets: sockets.map((s) => s.url), panel: String(panel).slice(0, 240) });
  check('0 page errors', errors.length === 0, { errors: errors.slice(0, 3) });
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  if (browser) await browser.close().catch(() => {});
}
const fails = out.checks.filter((c) => !c.ok).length;
out.summary = `${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`;
writeFileSync('captures/gntDEPLOY-sp.json', JSON.stringify(out, null, 1));
console.log(out.summary);
process.exit(out.crash || fails ? 1 : 0);
