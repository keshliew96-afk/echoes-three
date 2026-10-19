#!/usr/bin/env node
// CAMP GUEST FACING (docs/CLASS_SELECT.md "Co-op"): in a co-op camp a guest
// turns its own critter freely, as the host does. Own network server, a host
// page on http://127.0.0.1:5199 and a guest page on http://localhost:5199
// (two origins = two players' browsers); the guest takes the Tank seat west
// of the fire:
//   - the guest points its mouse west (away from the hearth) and stands
//     still: its Tank faces the mouse on the guest's own page and on the
//     host's, and keeps facing it (no slow turn back to the fire);
//   - it walks south with the mouse still west: the Tank still faces west;
//   - the AI seats nobody holds still idle toward the hearth;
//   - the guest walks into the portal, sees Begin Run and presses E: the
//     host starts the run and both pages are in room 1.
//   node tools/camp-guest-facing.mjs [--port 7931] [--shots <dir>] [--tag after]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<chrome> ECHOES_CHROME_ARGS="--no-sandbox".
import { mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7931));
const shots = arg('shots', 'captures');
const tag = arg('tag', 'after');
mkdirSync(shots, { recursive: true });
const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 600)}`}`);
  if (!ok) fails.push(what);
}
// The Tank's camp rig and body on one page: rig yaw, the yaw that would face
// the hearth from where it stands, and the anim.
const tankOn = (c) =>
  netEval(c, 'const s = E.cmd("campState"); const r = s.party.rigs.find((x) => x.classId === "tank"); const h = s.hearth; return { yaw: r.yaw, fireYaw: Math.atan2(h.x - r.x, h.z - r.z), anim: r.anim, x: r.x, z: r.z, rigs: s.party.rigs };');
const angle = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};
const WEST = -Math.PI / 2; // yaw = atan2(dx, dz): facing -x
const hostTick = (c) => netEval(c, 'return E.state().tick;');
async function waitTicks(c, n) {
  const t0 = await hostTick(c);
  const w0 = Date.now();
  while ((await hostTick(c)) < t0 + n && Date.now() - w0 < 120000) await sleep(200);
}

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  const extraArgs = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
  browser = await launchEchoes({ gpu: !extraArgs.length, background: true, width: 1280, height: 720, extraArgs });
  const host = await openClient(browser, { base: 'http://127.0.0.1:5199/', server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base: 'http://localhost:5199/', server: srv.url, name: 'Guest', seed: 8 });
  const code = await hostRoom(host);
  const gSeat = await joinRoom(guest, code, 1);
  check('the guest takes the Tank seat', gSeat === 1, gSeat);
  await startGame(host, [guest]);
  await waitSession([host, guest], 30000);
  await waitTicks(host, 60);
  const ctl = await netEval(host, 'return E.cmd("netSeats").controllers;');
  check('host world in camp: the guest holds the Tank', ctl[1] === 'human', ctl);

  // Mouse to the far west of the guest's screen (the camera follows the
  // guest's Tank, which sits west of the fire): aim = west, away from it.
  await guest.page.mouse.move(8, 360);
  await guest.page.mouse.move(4, 362);
  await waitTicks(host, 90);
  let g = await tankOn(guest);
  let h = await tankOn(host);
  console.log(`info still: guest page yaw ${g.yaw} (fire ${g.fireYaw.toFixed(2)}), host page yaw ${h.yaw} (fire ${h.fireYaw.toFixed(2)})`);
  check('guest page: the standing guest Tank faces its mouse (west)', angle(g.yaw, WEST) < 0.6, g);
  check('host page: the standing guest Tank faces west too', angle(h.yaw, WEST) < 0.6, h);
  await guest.page.screenshot({ path: `${shots}/${tag}-guest-still.png` });
  await host.page.screenshot({ path: `${shots}/${tag}-host-still.png` });
  // It holds: no slow turn back to the hearth.
  await waitTicks(host, 180);
  g = await tankOn(guest);
  h = await tankOn(host);
  check('guest page: three seconds on, it still faces west', angle(g.yaw, WEST) < 0.6, g);
  check('host page: three seconds on, it still faces west', angle(h.yaw, WEST) < 0.6, h);

  // Walk south with the mouse still west.
  const z0 = (await tankOn(host)).z;
  await guest.page.keyboard.down('KeyS');
  try {
    await waitTicks(host, 40);
    g = await tankOn(guest);
    h = await tankOn(host);
  } finally {
    await guest.page.keyboard.up('KeyS');
  }
  check('the guest walked south', h.z - z0 > 0.4, { z0, z: h.z });
  check('guest page: walking south it faces the mouse, not its path', angle(g.yaw, WEST) < 0.8, g);
  check('host page: walking south it faces the mouse, not its path', angle(h.yaw, WEST) < 0.8, h);
  await guest.page.screenshot({ path: `${shots}/${tag}-guest-walk.png` });

  // Nobody holds the Archer: it idles toward the hearth as ever.
  await waitTicks(host, 60);
  const ar = await netEval(host, 'const s = E.cmd("campState"); const r = s.party.rigs.find((x) => x.classId === "archer"); const h = s.hearth; return { yaw: r.yaw, fireYaw: Math.atan2(h.x - r.x, h.z - r.z) };');
  check('the AI Archer still idles toward the hearth', angle(ar.yaw, ar.fireYaw) < 0.4, ar);

  // The guest walks into the portal and presses E: the host starts the run
  // for the whole party (scenes/camp.js askHost -> the host's guestBegin).
  const portal = await netEval(host, 'return E.cmd("campState").portal;');
  const goal = { x: portal.x, z: portal.z + 0.55 };
  for (let i = 0; i < 40; i++) {
    const b = await netEval(host, 'const e = E.state().party.find((p) => p.partyIndex === 1); return { x: e.x, z: e.z };');
    const dx = goal.x - b.x;
    const dz = goal.z - b.z;
    if (Math.hypot(dx, dz) < portal.radius * 0.6) break;
    const keys = [];
    if (dz < -0.3) keys.push('KeyW');
    if (dz > 0.3) keys.push('KeyS');
    if (dx < -0.3) keys.push('KeyA');
    if (dx > 0.3) keys.push('KeyD');
    for (const k of keys) await guest.page.keyboard.down(k);
    try {
      await waitTicks(host, 15);
    } finally {
      for (const k of keys) await guest.page.keyboard.up(k);
    }
  }
  const inGate = await netEval(guest, 'return E.cmd("campState").inPortal;');
  check('the guest stands in the portal on its own page', inGate === true, inGate);
  const gPrompt = await netEval(guest, 'return E.cmd("campState").promptVisible;');
  check('the guest sees the Begin Run prompt there', gPrompt === true, gPrompt);
  await guest.page.screenshot({ path: `${shots}/${tag}-guest-portal.png` });
  await guest.page.keyboard.down('KeyE');
  await sleep(300);
  await guest.page.keyboard.up('KeyE');
  const t0 = Date.now();
  let started = null;
  while (Date.now() - t0 < 120000) {
    const v = await netEval(host, 'const v = E.state().run; return { phase: v.phase, room: v.room };');
    if (v.phase === 'combat') {
      started = v;
      break;
    }
    await sleep(500);
  }
  check('the guest\'s E at the portal starts the run on the host', started && started.room === 1, started);
  const g0 = Date.now();
  let gv = null;
  while (Date.now() - g0 < 90000) {
    gv = await netEval(guest, 'const v = E.state().run; return { phase: v.phase, room: v.room };');
    if (gv.phase === 'combat') break;
    await sleep(500);
  }
  check('the guest is in the run too', gv && gv.phase === 'combat' && gv.room === 1, gv);
  await host.page.screenshot({ path: `${shots}/${tag}-host-run.png` });

  const errs = [...host.errors, ...guest.errors];
  check('no page errors', errs.length === 0, errs.slice(0, 3));
} catch (err) {
  console.error(err);
  fails.push(String(err && err.message ? err.message : err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv && srv.stop) await srv.stop();
}
console.log(fails.length ? `\nFAIL camp guest facing (${fails.length})` : '\nPASS camp guest facing');
process.exit(fails.length ? 1 : 0);
