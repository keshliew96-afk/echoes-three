#!/usr/bin/env node
// SLICK FLOOR in co-op (docs/SLICK_FLOOR.md "Co-op"). Own network server, a
// host page on http://127.0.0.1:5199 and a guest page on http://localhost:5199:
//   - the host starts Level 1 and lays the Flooded Cellar (layout 13) in the
//     live room, plus a frost patch under the guest's own body;
//   - the guest's replica holds the same patches (position, size, skin), its
//     movement module carries the same slip list (the guest's own-seat
//     predictor slides on exactly what the host does), and its hazard layer
//     draws them;
//   - no page errors. A screenshot of the guest's view.
//   node tools/slickfloor-net.mjs [--port 7912] [--shots dir]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<a chrome wrapper adding --no-sandbox>.
import { mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7912));
const SHOTS = arg('shots', 'captures/slick');
mkdirSync(SHOTS, { recursive: true });
const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${got !== null ? ` ${JSON.stringify(got).slice(0, 600)}` : ''}`);
  if (!ok) fails.push(what);
}
async function waitOn(c, src, { timeout = 60000, poll = 250, arg: a = null } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await netEval(c, src, a)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`${c.name}: timeout waiting for ${src.slice(0, 120)}`);
}
const slipsOn = (c) =>
  netEval(c, 'return E.content.world().entities().filter((e) => e.kind === "hazard" && e.htype === "slip").map((e) => ({ id: e.id, x: e.x, z: e.z, r: e.radius, skin: e.skin })).sort((a, b) => a.id - b.id);');
const moduleSlips = (c) => c.page.evaluate(async () => (await import('/src/sim/movement.js')).slipPatches().map((p) => ({ id: p.id, x: p.x, z: p.z, r: p.r, grip: p.grip })));

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const host = await openClient(browser, { base: 'http://127.0.0.1:5199/', server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base: 'http://localhost:5199/', server: srv.url, name: 'Guest', seed: 8 });
  const code = await hostRoom(host);
  const gSeat = await joinRoom(guest, code);
  await startGame(host, [guest]);
  await waitSession([host, guest], 60000);
  await sleep(1500);
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 120000 });
  const ch = await netEval(host, 'return E.campaign.choose(1);');
  check('the host starts Level 1 from the camp', ch && ch.ok, ch);
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.room === 1;', { timeout: 120000 });
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.room === 1;', { timeout: 120000 });

  // The Flooded Cellar's placements in the live room, then frost under the
  // guest's own body.
  const lay = await netEval(host, 'return E.cmd("setLayout", 13);');
  check('the host lays the Flooded Cellar in the live room', lay && lay.layoutId === 13, lay);
  const gb = await netEval(host, 'const b = E.content.world().entities().find((e) => e.partyIndex === arg); return b ? { x: b.x, z: b.z } : null;', gSeat);
  const fid = await netEval(host, 'return E.cmd("spawnHazard", "slip", arg.x, arg.z, { r: 1.6, skin: "frost" });', gb);
  check('a frost patch under the guest\'s body', Number.isInteger(fid), { fid, at: gb });
  await netEval(host, 'E.cmd("killAllEnemies"); return 1;');
  await waitOn(guest, 'return E.content.world().entities().filter((e) => e.kind === "hazard" && e.htype === "slip").length === 3;', { timeout: 60000 });
  const hs = await slipsOn(host);
  const gs = await slipsOn(guest);
  // Snapshot positions are quantised (1/256 u): the replica's entities sit
  // within that of the host's; the slip list below is carried exactly.
  const same = hs.length === 3 && gs.length === 3 && hs.every((h, i) => h.id === gs[i].id && h.skin === gs[i].skin && h.r === gs[i].r && Math.hypot(h.x - gs[i].x, h.z - gs[i].z) < 0.01);
  check('the guest\'s replica holds the same three patches (place, size, skin)', same, { host: hs, guest: gs });
  await sleep(1500);
  const hm = await moduleSlips(host);
  const gm = await moduleSlips(guest);
  check('the guest\'s movement module slides on the same list as the host\'s', hm.length === 3 && JSON.stringify(hm) === JSON.stringify(gm), { host: hm, guest: gm });
  await sleep(2500);
  const gr = await netEval(guest, 'return E.content.probe("render");');
  check('the guest\'s hazard layer draws the three patches', gr && gr.byType && gr.byType.slip === 3, gr && gr.byType);
  await netEval(host, 'E.cmd("killAllEnemies"); return 1;');
  await guest.page.bringToFront().catch(() => {});
  await sleep(2000);
  await guest.page.screenshot({ path: `${SHOTS}/7-coop-guest.png` });
  const errs = [...host.errors, ...guest.errors];
  check('no page errors', errs.length === 0, errs.slice(0, 3));
} catch (err) {
  console.error(err);
  fails.push(String(err && err.message ? err.message : err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv && srv.stop) await srv.stop();
}
console.log(fails.length ? `\nFAIL slick floor net (${fails.length})` : '\nPASS slick floor net');
process.exit(fails.length ? 1 : 0);
