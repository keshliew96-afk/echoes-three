#!/usr/bin/env node
// WEBRTC CO-OP (docs/WEBRTC_COOP.md) — two browsers on this machine and the
// real session server:
//   A. host + guest come up DIRECT in the lobby (an RTCPeerConnection each
//      way, server only signalling), the game starts, and a short co-op stretch
//      runs on the direct link: the guest's frames arrive on it, the server
//      relays (almost) nothing, the guest stays in sync (no desyncs, fresh
//      snapshots, same room as the host), in the camp and in a Level 1 fight;
//   B. mid-game the direct link is broken (as a dead network would): both
//      sides land on the RELAY without anyone doing anything, and the game
//      keeps going in sync through the server;
//   C. a third player whose browser offers no direct link (?p2p=0) drops in:
//      the host's offer goes unanswered, that seat falls back to the relay
//      after the connect window and plays on.
//   Screenshots of the in-game chip (Direct / Relay) go to --shots.
//   node tools/webrtc-coop-probe.mjs [--port 7931] [--shots dir] [--wait 30000]
// --wait = ?p2pwait= for every page: a software-GL page here crawls (each
// await of the WebRTC handshake takes ~1 s), so the 6 s connect window that
// suits a real browser is stretched; the probe still checks the timeout path.
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<a chrome wrapper adding --no-sandbox>,
// and a Vite dev server on 5199 (npx vite --port 5199).
import { mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep, admin } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7931));
const SHOTS = arg('shots', 'captures/webrtc');
const WAIT = String(arg('wait', '30000'));
mkdirSync(SHOTS, { recursive: true });
const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${got !== null ? ` ${JSON.stringify(got).slice(0, 700)}` : ''}`);
  if (!ok) fails.push(what);
}
async function waitOn(c, src, { timeout = 60000, poll = 250, arg: a = null } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await netEval(c, src, a).catch(() => false)) return Date.now() - t0;
    await sleep(poll);
  }
  throw new Error(`${c.name}: timeout waiting for ${src.slice(0, 140)}`);
}
const paths = (c) => netEval(c, 'return n.paths();');
const p2p = (c) => netEval(c, 'return n.stats().p2p;');
const relayed = async (srv) => (await admin(srv, '/stats')).totals.relayed;
const guestHealth = (c) =>
  netEval(c, 'const s = n.stats(); const g = n.session.status(); return { role: g.role, synced: g.synced, desyncs: s.desyncs, decodeErrors: s.decodeErrors, snapshotAgeMs: s.snapshotAgeMs, snapshotsPerSec: s.snapshotsPerSec, room: E.state().run ? E.state().run.room : null, tick: E.tick };');
const chipText = (c) => c.page.evaluate(() => document.querySelector('#nt-hud .nt-lt')?.textContent || '');
async function shot(c, name) {
  await c.page.screenshot({ path: `${SHOTS}/${name}.png` });
}
// Poll fn() until it returns a truthy value (or the deadline): a software-GL
// page here stalls for seconds at a time, so one sample proves nothing.
async function until(fn, timeout) {
  const t0 = Date.now();
  let v = null;
  while (Date.now() - t0 < timeout) {
    v = await fn().catch(() => null);
    if (v && v.ok) return v;
    await sleep(500);
  }
  return v;
}
// A few seconds of play on the guest: walk around (keys held, trusted events).
async function play(c, ms) {
  const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < ms) {
    const k = keys[i++ % keys.length];
    await c.page.keyboard.down(k);
    await sleep(400);
    await c.page.keyboard.up(k);
  }
}

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  browser = await launchEchoes({ gpu: true, background: true, width: 960, height: 540, extraArgs: (process.env.ECHOES_P2P_ARGS || '').split(' ').filter(Boolean) });
  const host = await openClient(browser, { base: 'http://127.0.0.1:5199/', server: srv.url, name: 'Host', seed: 7, w: 960, h: 540, extra: { p2pwait: WAIT } });
  const guest = await openClient(browser, { base: 'http://localhost:5199/', server: srv.url, name: 'Guest', seed: 8, w: 960, h: 540, extra: { p2pwait: WAIT } });
  const code = await hostRoom(host);
  const gSeat = await joinRoom(guest, code);
  const hSeat = await netEval(host, 'return n.seat;');

  // ---- A: direct ------------------------------------------------------
  let msDirect = null;
  try {
    msDirect = await waitOn(host, `const p = n.paths(); return p[${gSeat}] === 'direct';`, { timeout: Number(WAIT) + 10000 });
    await waitOn(guest, `const p = n.paths(); return p[${hSeat}] === 'direct';`, { timeout: 5000 });
  } catch {
    /* reported below */
  }
  const lobbyPaths = { host: await paths(host), guest: await paths(guest) };
  check('A1 the lobby link comes up direct on both sides (server only signals)', lobbyPaths.host[gSeat] === 'direct' && lobbyPaths.guest[hSeat] === 'direct', { msDirect, ...lobbyPaths, signals: (await admin(srv, '/stats')).counters.signals, hostP2p: await p2p(host), log: await netEval(host, 'return n.log(400).filter((e) => String(e.kind).startsWith("p2p"));') });

  await startGame(host, [guest]);
  await waitSession([host, guest], 90000);
  await sleep(1500);
  const r0 = await relayed(srv);
  const g0 = await p2p(guest);
  const h0 = await p2p(host);
  await play(guest, 8000);
  // The window: the guest's frames on the direct link, the server's relay
  // count, and a fresh in-sync guest (polled through this machine's stalls).
  const a = await until(async () => {
    const [r1, g1, h1, gh, hh, pg] = [await relayed(srv), await p2p(guest), await p2p(host), await guestHealth(guest), await netEval(host, 'return { room: E.state().run ? E.state().run.room : null, tick: E.tick };'), await paths(guest)];
    const dIn = g1.framesIn - g0.framesIn;
    const dHostIn = h1.framesIn - h0.framesIn;
    const ok = pg[hSeat] === 'direct' && dIn > 60 && dHostIn > 60 && gh.synced && gh.snapshotAgeMs !== null && gh.snapshotAgeMs < 1500;
    return { ok, guestFramesIn: dIn, hostFramesIn: dHostIn, serverRelayed: r1 - r0, guest: gh, host: hh, path: pg[hSeat] };
  }, 60000);
  check('A2 the game runs on the direct link: the guest receives its frames there and the server relays (almost) nothing', !!a && a.ok && a.serverRelayed < 0.05 * a.guestFramesIn, a);
  check('A3 the guest stays in sync on the direct link', !!a && a.ok && a.guest.role === 'guest' && a.guest.desyncs === 0 && a.guest.decodeErrors === 0 && a.guest.room === a.host.room, a && { guest: a.guest, host: a.host });
  await sleep(1200);
  const chipG = await chipText(guest);
  check('A4 the guest chip says Direct', /Direct/.test(chipG), chipG);
  await shot(guest, '1-guest-direct');
  await shot(host, '2-host-direct');

  // A5: into combat (Level 1, room 1) on the direct link — the busy stream
  // (big snapshots on the reliable channel, event bursts).
  await waitOn(host, 'return E.campaign.ready(1).ready;', { timeout: 120000 }).catch(() => null);
  const ch = await netEval(host, 'return E.campaign.choose(1);');
  let combat = null;
  if (ch && ch.ok) {
    try {
      await waitOn(host, 'const v = E.state().run; return !!v && v.phase === "combat" && v.room === 1;', { timeout: 120000 });
      await waitOn(guest, 'const v = E.state().run; return !!v && v.phase === "combat" && v.room === 1;', { timeout: 120000 });
      const rc0 = await relayed(srv);
      const gc0 = await p2p(guest);
      await play(guest, 6000);
      combat = await until(async () => {
        const [rc1, gc1, gh, pg] = [await relayed(srv), await p2p(guest), await guestHealth(guest), await paths(guest)];
        const dIn = gc1.framesIn - gc0.framesIn;
        return { ok: pg[hSeat] === 'direct' && dIn > 60 && gh.synced && gh.snapshotAgeMs !== null && gh.snapshotAgeMs < 1500, framesIn: dIn, bytesIn: gc1.bytesIn - gc0.bytesIn, serverRelayed: rc1 - rc0, guest: gh, path: pg[hSeat] };
      }, 60000);
    } catch (err) {
      combat = { ok: false, error: String(err && err.message) };
    }
  }
  check('A5 a combat stretch (Level 1) runs direct and in sync', !!combat && combat.ok && combat.guest.desyncs === 0 && combat.guest.decodeErrors === 0 && combat.serverRelayed < 0.05 * combat.framesIn, combat || ch);
  if (combat && combat.ok) await shot(guest, '1b-guest-direct-combat');

  // ---- B: the direct link dies mid-game --------------------------------
  const d0 = await guestHealth(guest);
  await netEval(host, `return n.mesh.debugDrop(${gSeat}, 'probe_drop');`);
  let msFallback = null;
  try {
    msFallback = await waitOn(guest, `return n.paths()[${hSeat}] === 'relay';`, { timeout: 15000, poll: 100 });
  } catch {
    /* reported below */
  }
  const afterDrop = { host: await paths(host), guest: await paths(guest) };
  check('B1 both sides fall back to the relay on their own', afterDrop.host[gSeat] === 'relay' && afterDrop.guest[hSeat] === 'relay', { msFallback, ...afterDrop });
  const rb0 = await relayed(srv);
  await play(guest, 8000);
  const b = await until(async () => {
    const [rb1, gb, hb] = [await relayed(srv), await guestHealth(guest), await netEval(host, 'return { room: E.state().run ? E.state().run.room : null, tick: E.tick };')];
    const ok = rb1 - rb0 > 60 && gb.synced && gb.snapshotAgeMs !== null && gb.snapshotAgeMs < 1500 && gb.tick > d0.tick;
    return { ok, serverRelayed: rb1 - rb0, guest: gb, host: hb };
  }, 60000);
  check('B2 the game keeps going through the relay', !!b && b.serverRelayed > 60, b && { serverRelayed: b.serverRelayed });
  check('B3 the guest stays in sync after the fallback', !!b && b.ok && b.guest.role === 'guest' && b.guest.desyncs === 0 && b.guest.decodeErrors === 0 && b.guest.room === b.host.room, b && { before: d0, guest: b.guest, host: b.host, paths: await paths(guest) });
  await sleep(1200);
  const chipB = await chipText(guest);
  check('B4 the guest chip says Relay', /Relay/.test(chipB), chipB);
  await shot(guest, '3-guest-relay-after-drop');

  // ---- C: a browser with no direct link drops in -----------------------
  const third = await openClient(browser, { base: 'http://127.0.0.1:5199/', server: srv.url, name: 'NoP2P', seed: 9, w: 960, h: 540, extra: { p2p: '0', p2pwait: WAIT } });
  // Its own origin's storage would collide with the host's tab session: a
  // fresh identity via a different origin is not available, so it joins as
  // another tab of the host's origin (per-tab sessions, fix-M5b-r4).
  const tSeat = await joinRoom(third, code);
  let msTimeout = null;
  try {
    msTimeout = await waitOn(host, `return n.paths()[${tSeat}] === 'relay' && n.stats().p2p.fallbacks >= 2;`, { timeout: Number(WAIT) + 30000, poll: 200 });
  } catch {
    /* reported below */
  }
  const hp = await paths(host);
  check('C1 an unanswered offer falls back to the relay after the connect window', hp[tSeat] === 'relay', { msTimeout, tSeat, seats: await netEval(host, 'return n.room.seats.map((s) => [s.index, s.name, s.connected]);'), host: hp, third: await paths(third), hostP2p: await p2p(host) });
  await waitSession([third], 90000);
  await play(third, 5000);
  const th = await until(async () => {
    const h = await guestHealth(third);
    return { ...h, ok: h.synced && h.snapshotAgeMs !== null && h.snapshotAgeMs < 1500 && h.tick > 0 };
  }, 60000);
  check('C2 the relay-only player plays in sync', !!th && th.ok && th.role === 'guest' && th.desyncs === 0 && th.decodeErrors === 0, th);
  await sleep(1200);
  // (The guest of A/B stays on the relay after its link broke: no second
  // try until that player's connection changes.)
  const chipH = await chipText(host);
  const titleH = await host.page.evaluate(() => document.querySelector('#nt-hud .nt-chip')?.getAttribute('title') || '');
  check('C3 the host chip says Relay and its tooltip names each seat', /Relay/.test(chipH) && (titleH.match(/through the server relay/g) || []).length === 2, { chipH, titleH, paths: await paths(host) });
  await shot(host, '4-host-relay');

  const errs = [host, guest, third].flatMap((c) => (c.errors || []).map((e) => `${c.name}: ${e}`));
  check('no page errors', errs.length === 0, errs.slice(0, 5));
} catch (err) {
  console.log(`FAIL probe aborted: ${err && err.stack ? err.stack : err}`);
  fails.push('aborted');
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv) await srv.stop();
}
console.log(fails.length ? `WEBRTC CO-OP: ${fails.length} FAIL (${fails.join('; ')})` : 'WEBRTC CO-OP: ALL PASS');
process.exit(fails.length ? 1 : 0);
