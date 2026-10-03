#!/usr/bin/env node
// M5b bring-up probe: host + guest windows, start a session, move the guest
// by real keys, fire, then report both sides' stats + page errors.
//   node tools/gntM5b-smoke2.mjs [--port 7821] [--base http://127.0.0.1:5199/] [--cond lat75,jit10,loss10]
import { writeFileSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, stats, holdKeys, netEval, sleep, admin } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7821));
const base = arg('base', 'http://127.0.0.1:5199/');
const cond = arg('cond', null);
const out = { port, cond, steps: [] };
const step = (name, data) => {
  out.steps.push({ name, ...data });
  console.log(`[smoke2] ${name} ${JSON.stringify(data).slice(0, 600)}`);
};
let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  step('server', { pid: srv.pid });
  browser = await launchEchoes({ gpu: true, background: true, width: 1280, height: 720 });
  const host = await openClient(browser, { base, server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base, server: srv.url, name: 'Guest', seed: 8 });
  step('pages', { ok: true });
  const code = await hostRoom(host);
  const seat = await joinRoom(guest, code);
  step('room', { code, seat });
  if (cond) {
    const gp = await netEval(guest, 'return n.peerId;');
    step('cond', await admin(srv, '/admin/conditioner', { target: gp, up: cond, down: cond }));
  }
  await startGame(host, [guest]);
  const st = await waitSession([host, guest], 25000);
  step('session', { st });
  await sleep(1500);
  // Guest walks east 1 s by real keys.
  const before = await netEval(guest, 'const g = n.session.debugGuest(); const e = E.state().party.find((p) => p.partyIndex === g.seat); return { pred: g.own.pos, seat: g.seat };');
  await holdKeys(guest, ['KeyD'], 1000);
  await sleep(600);
  const after = await netEval(guest, 'const g = n.session.debugGuest(); return { pred: g.own.pos };');
  const hostView = await netEval(host, 'return E.state().party.map((p) => ({ i: p.partyIndex ?? 0, x: p.x, z: p.z, kind: p.kind }));');
  step('walk', { before, after, hostView });
  // Guest basic attack (right mouse) + skill 1.
  await guest.page.mouse.move(900, 360);
  await guest.page.mouse.down({ button: 'right' });
  await sleep(800);
  await guest.page.mouse.up({ button: 'right' });
  await guest.page.keyboard.press('Digit1');
  await sleep(1200);
  const hs = await stats(host);
  const gs = await stats(guest);
  step('stats', { host: hs, guest: gs });
  step('logs', { host: await netEval(host, 'return n.session.log(40);'), guest: await netEval(guest, 'return n.session.log(40);') });
  await host.page.screenshot({ path: 'captures/gntM5b-smoke2-host.png' });
  await guest.page.screenshot({ path: 'captures/gntM5b-smoke2-guest.png' });
  step('errors', { host: host.errors, guest: guest.errors, hostConsole: host.consoleLines.filter((l) => /error|warn/i.test(l)).slice(-15), guestConsole: guest.consoleLines.filter((l) => /error|warn/i.test(l)).slice(-15) });
} catch (err) {
  step('crash', { error: String(err && err.stack ? err.stack : err) });
  out.crashed = true;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
writeFileSync('captures/gntM5b-smoke2.json', JSON.stringify(out, null, 1));
process.exit(out.crashed ? 1 : 0);
