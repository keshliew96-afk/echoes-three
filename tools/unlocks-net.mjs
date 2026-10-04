#!/usr/bin/env node
// CROSS-RUN UNLOCKS in co-op (docs/UNLOCKS.md "Co-op"). Own network server, a
// host page on http://127.0.0.1:5199 and a guest page on http://localhost:5199
// (two origins = two localStorage profiles, like two players' browsers):
//   - each player equips different unlocks on their own profile;
//   - the host starts the campaign: the run (host sim and the guest's replica)
//     carries the HOST's boons only;
//   - the host kills the Level I boss and quits to the lobby: BOTH players
//     earn Embers on their own profile, from the same run.
//   node tools/unlocks-net.mjs [--port 7910] [--host-base http://127.0.0.1:5199/] [--guest-base http://localhost:5199/]
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7910));
const hostBase = arg('host-base', 'http://127.0.0.1:5199/');
const guestBase = arg('guest-base', 'http://localhost:5199/');
const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 600)}`}`);
  if (!ok) fails.push(what);
}
async function waitOn(c, src, { timeout = 60000, poll = 200, arg: a = null } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await netEval(c, src, a)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`${c.name}: timeout waiting for ${src.slice(0, 120)}`);
}
const meta = (c) => netEval(c, 'return E.save.profile().meta;');

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const host = await openClient(browser, { base: hostBase, server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base: guestBase, server: srv.url, name: 'Guest', seed: 8 });

  // Each player's own unlocks (before the session).
  await netEval(host, 'E.save.embers(200); return [E.save.buyUnlock("kit_bulwark"), E.save.buyUnlock("purse_1")];');
  await netEval(guest, 'E.save.embers(120); return [E.save.buyUnlock("kit_lanternbearer"), E.save.buyUnlock("tint_moonlit")];');
  const hm0 = await meta(host);
  const gm0 = await meta(guest);
  check('the two pages hold separate profiles', hm0.owned.kit_bulwark !== undefined && hm0.owned.kit_lanternbearer === undefined && gm0.owned.kit_lanternbearer !== undefined && gm0.owned.kit_bulwark === undefined, { host: hm0.owned, guest: gm0.owned });

  const code = await hostRoom(host);
  await joinRoom(guest, code);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await sleep(1500);
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 90000 });

  const ch = await netEval(host, 'return E.campaign.choose(1);');
  check('the host starts Level 1 from the camp', ch && ch.ok, ch);
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.room === 1;', { timeout: 60000 });
  await waitOn(guest, 'const v = E.state().run; return v.phase === "combat" && v.room === 1;', { timeout: 60000 });
  const hv = await netEval(host, 'const v = E.state().run; return { boons: v.boons ?? null, wallet: v.wallet };');
  const gv = await netEval(guest, 'const v = E.state().run; return { boons: v.boons ?? null, wallet: v.wallet };');
  check('the run carries the HOST\'s boons (Bulwark kit, purse)', hv.boons && hv.boons.kits && hv.boons.kits.tank && !hv.boons.kits.healer && hv.boons.glint === 15 && hv.wallet === 15, hv);
  check('the guest\'s replica shows the same run (the guest\'s own kit is not applied)', JSON.stringify(gv.boons) === JSON.stringify(hv.boons) && gv.wallet === 15, gv);
  const gTint = await guest.page.evaluate(async () => (await import('/src/data/vfx.js')).vfxClassStyle('healer').glow);
  const hTint = await host.page.evaluate(async () => (await import('/src/data/vfx.js')).vfxClassStyle('healer').glow);
  check('tints are local: the guest sees its Moonlit Healer, the host does not', gTint === '#9FB8FF' && hTint !== '#9FB8FF', { gTint, hTint });

  // The host takes the party through the Level I boss, then quits to the lobby.
  await netEval(host, 'E.cmd("skipToRoom", 8); return 1;');
  await waitOn(host, 'const v = E.state().run; return v.phase === "combat" && v.room === 8;', { timeout: 60000 });
  await waitOn(host, 'return E.cmd("killBoss") === true;', { timeout: 120000, poll: 500 });
  await waitOn(host, 'return E.state().run.phase === "transit";', { timeout: 120000 });
  await waitOn(guest, 'return E.state().run.phase === "transit";', { timeout: 120000 });
  await sleep(1500);
  await netEval(host, 'E.cmd("abandonRun"); return 1;');
  await waitOn(host, 'return !!E.save.profile().meta.lastAward;', { timeout: 60000 });
  await waitOn(guest, 'return !!E.save.profile().meta.lastAward;', { timeout: 60000 });
  const hm = await meta(host);
  const gm = await meta(guest);
  check('the host earned Embers on its profile', hm.lastAward.embers > 0 && hm.embers === hm0.embers + hm.lastAward.embers, hm.lastAward);
  check('the guest earned Embers on ITS profile from the same run', gm.lastAward.embers > 0 && gm.embers === gm0.embers + gm.lastAward.embers && gm.deeds.includes('first_light'), gm.lastAward);
  const errs = [...host.errors, ...guest.errors];
  check('no page errors', errs.length === 0, errs.slice(0, 3));
} catch (err) {
  console.error(err);
  fails.push(String(err && err.message ? err.message : err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv && srv.stop) await srv.stop();
  else if (srv && srv.proc) srv.proc.kill();
}
console.log(fails.length ? `\nFAIL unlocks net (${fails.length})` : '\nPASS unlocks net');
process.exit(fails.length ? 1 : 0);
