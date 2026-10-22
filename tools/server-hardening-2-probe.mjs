#!/usr/bin/env node
// SERVER HARDENING 2 (docs/DAILY.md "Run tickets", docs/WEBRTC_COOP.md "Input
// buffer cap"): headless checks, no browser and no server process.
//   - the board reports its version; the game reads itself as out of date
//     against a newer or far older server and plays a practice run (the
//     counted run stays open);
//   - a counted run asks for a signed ticket at Set out, keeps it on the
//     device and posts it with its score;
//   - the server refuses a post from this build with no ticket, a forged or
//     another player's ticket, or a run shorter in wall time than its ticks;
//     an older build within the window still posts without one;
//   - one ticket per player and day; per-player post and ticket limits; a
//     few new tickets per address a day;
//   - the host's per-seat input buffer stays capped under a far-future seq
//     flood, a normal guest line is unchanged, and a line that jumped past
//     the window after an outage restarts.
//   node tools/server-hardening-2-probe.mjs [--out captures/server-hardening-2.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const u = (p) => pathToFileURL(resolve(here, '..', p)).href;
const argv = process.argv.slice(2);
const OUT = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : '../captures/server-hardening-2.json';

const results = [];
let failed = 0;
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${group}] ${name}${detail !== undefined ? ` ${JSON.stringify(detail)}` : ''}`);
}

const { createDailyStore, signTicket, checkTicket, ID_RATE, NEW_TICKETS_PER_IP_DAY, TICKET_SLACK_MS, TICKET_MIN_SHARE } = await import(u('server/daily.mjs'));
const { dailySeed, versionOk, versionAtLeast, TICKET_SINCE } = await import(u('src/data/daily.js'));
const { VERSION } = await import(u('src/version.js'));
const { SIM_HZ } = await import(u('src/net/protocol/constants.js'));

const DAY = '2026-10-21';
const bump = (v, n) => v.replace(/\d+$/, (x) => String(Number(x) + n));
const id = (n) => `hardening2-player-${String(n).padStart(6, '0')}`;

// ------------------------------------------------------------ versions --
check('version', 'this build takes tickets', versionAtLeast(VERSION, TICKET_SINCE) && !versionAtLeast(bump(TICKET_SINCE, -1), TICKET_SINCE) && versionAtLeast('0.6.0', TICKET_SINCE));
check('version', 'versionOk is shared by the game and the server', versionOk(VERSION, VERSION) && !versionOk(VERSION, bump(VERSION, 4)) && !versionOk(bump(VERSION, 1), VERSION));

// -------------------------------------------------------------- server --
{
  let now = Date.parse(`${DAY}T10:00:00Z`);
  const s = createDailyStore({ env: { ECHOES_DAILY_SECRET: 'probe-secret' }, now: () => now });
  const base = (n, extra = {}) => ({ key: DAY, id: id(n), seed: dailySeed(DAY), version: VERSION, ...extra });
  const b = await s.board(DAY, null, '10.1.0.1');
  check('board', 'the board reports the server version', b.status === 200 && b.body.version === VERSION, b.body.version);

  const t1 = await s.ticket(base(1), '10.1.0.1');
  check('ticket', 'Set out gets a signed ticket', t1.status === 200 && t1.body.ticket && t1.body.ticket.at === now && t1.body.ticket.sig === signTicket('probe-secret', DAY, id(1), now), t1.body);
  now += 5000;
  const t1b = await s.ticket(base(1), '10.1.0.1');
  check('ticket', 'asked again, the same ticket (one per player and day)', t1b.status === 200 && t1b.body.ticket.at === t1.body.ticket.at && t1b.body.ticket.sig === t1.body.ticket.sig);
  const tOld = await s.ticket(base(2, { version: bump(VERSION, -4) }), '10.1.0.1');
  check('ticket', 'an out-of-date build is told at Set out, with the server version', tOld.status === 400 && tOld.body.error === 'bad_version' && tOld.body.version === VERSION, tOld.body);
  const tYest = await s.ticket(base(2, { key: '2026-10-20', seed: dailySeed('2026-10-20') }), '10.1.0.1');
  check('ticket', "only today's run takes a ticket", tYest.status === 400 && tYest.body.error === 'closed_day', tYest.body);

  const score = (n, ticks, extra = {}) => s.score({ ...base(n), name: `P${n}`, cls: 'tank', depth: 5, won: false, ticks, ...extra }, `10.1.0.${n}`);
  const runTicks = 30 * 60 * SIM_HZ; // a 30-minute run
  const r0 = await score(1, runTicks, {});
  check('score', 'a post from this build with no ticket is refused', r0.status === 400 && r0.body.error === 'no_ticket', r0.body);
  const forged = { at: t1.body.ticket.at, sig: signTicket('wrong-secret', DAY, id(1), t1.body.ticket.at) };
  const r1 = await score(1, runTicks, { ticket: forged });
  check('score', 'a forged ticket is refused', r1.status === 400 && r1.body.error === 'bad_ticket', r1.body);
  const t3 = await s.ticket(base(3), '10.1.0.3');
  const r2 = await score(1, runTicks, { ticket: t3.body.ticket });
  check('score', "another player's ticket is refused", r2.status === 400 && r2.body.error === 'bad_ticket', r2.body);
  const r3 = await score(1, runTicks, { ticket: t1.body.ticket });
  check('score', 'a run shorter in wall time than its own ticks is refused', r3.status === 400 && r3.body.error === 'implausible', { body: r3.body, wallS: (now - t1.body.ticket.at) / 1000, runS: runTicks / SIM_HZ });
  now = t1.body.ticket.at + runTicks * (1000 / SIM_HZ) * TICKET_MIN_SHARE - TICKET_SLACK_MS + 1000;
  const r4 = await score(1, runTicks, { ticket: t1.body.ticket });
  check('score', 'the same run once its wall time has passed is taken', r4.status === 200 && r4.body.ok && r4.body.rank === 1, r4.body);
  // The builds before tickets age out of the window as the version moves on
  // (VERSION_PATCH_WINDOW patches behind this one), so the check follows them.
  const preTicket = bump(TICKET_SINCE, -1);
  const r5 = await score(4, runTicks, { version: preTicket });
  if (versionOk(preTicket, VERSION)) check('score', 'an older build in the window (before tickets) still posts without one', r5.status === 200 && r5.body.ok, r5.body);
  else check('score', `a build before tickets (${preTicket}) is outside the window now and is told so`, r5.status === 400 && r5.body.error === 'bad_version', r5.body);
  check('score', 'checkTicket: a ticket issued on another day is refused', checkTicket({ key: DAY, id: id(9), version: VERSION, ticks: 60, ticket: { at: Date.parse('2026-10-20T23:00:00Z'), sig: signTicket('k', DAY, id(9), Date.parse('2026-10-20T23:00:00Z')) } }, 'k', Date.parse(`${DAY}T10:00:00Z`)) === 'bad_ticket');

  // Per-player limits: posts and tickets per id over many addresses.
  const st = [];
  // (the same ticketed run posted again and again, so it is simply answered
  // again until the per-player limit answers 429)
  const t8 = await s.ticket(base(8), '10.2.0.0');
  now = Math.max(now, t8.body.ticket.at + runTicks * (1000 / SIM_HZ) * TICKET_MIN_SHARE - TICKET_SLACK_MS + 1000);
  for (let i = 0; i < ID_RATE.score + 2; i++) st.push((await s.score({ ...base(8), name: 'P8', cls: 'tank', depth: 5, won: false, ticks: runTicks, ticket: t8.body.ticket }, `10.2.0.${i}`)).status);
  check('limits', `one player posts at most ${ID_RATE.score} times in ten minutes, from any address`, st.slice(0, ID_RATE.score).every((x) => x === 200) && st.slice(ID_RATE.score).every((x) => x === 429), st);
  const tt = [];
  for (let i = 0; i < ID_RATE.ticket + 2; i++) tt.push((await s.ticket(base(7), `10.3.0.${i}`)).status);
  check('limits', `one player asks for a ticket at most ${ID_RATE.ticket} times in ten minutes`, tt.slice(0, ID_RATE.ticket).every((x) => x === 200) && tt.slice(ID_RATE.ticket).every((x) => x === 429), tt);
  const nt = [];
  for (let i = 0; i < NEW_TICKETS_PER_IP_DAY + 2; i++) nt.push((await s.ticket(base(100 + i), '10.4.0.1')).status);
  check('limits', `one address takes tickets for at most ${NEW_TICKETS_PER_IP_DAY} new players a day`, nt.slice(0, NEW_TICKETS_PER_IP_DAY).every((x) => x === 200) && nt.slice(NEW_TICKETS_PER_IP_DAY).every((x) => x === 429), nt);
}

// -------------------------------------------------------------- client --
{
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  let now = Date.now();
  const key = new Date(now).toISOString().slice(0, 10);
  const store = createDailyStore({ env: { ECHOES_DAILY_SECRET: 'client-secret' }, now: () => now });
  let serverVersion = VERSION;
  const posted = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : null;
    let r;
    if (path === '/daily/ticket') r = await store.ticket(body, '10.9.0.1');
    else if (path === '/daily/score') {
      posted.push(body);
      r = await store.score(body, '10.9.0.1');
    } else r = await store.board(decodeURIComponent(path.split('/').pop()), null, '10.9.0.1');
    if (r.body && r.body.version) r.body.version = serverVersion;
    return { ok: r.status === 200, status: r.status, json: async () => r.body };
  };
  const { createDailyClient } = await import(u('src/daily/client.js'));
  const handlers = {};
  const bus = { on: (ev, fn) => (handlers[ev] = fn) };
  let summary = null;
  const world = { runSystem: () => ({ view: () => ({ summary }) }) };
  const service = (name) => (name === 'net' ? { addressInfo: () => ({ url: 'ws://127.0.0.1:1/' }) } : null);
  const d = createDailyClient({ bus, world, service, settings: null });

  serverVersion = bump(VERSION, 2);
  await d.board(key, true);
  check('client', 'a server two patches newer: this game is still in the window', !d.outdated());
  serverVersion = bump(VERSION, 4);
  await d.board(key, true);
  const p0 = d.attempt(key);
  check('client', 'a server past the window: Set out plays practice and the counted run stays open', d.outdated() && p0.practice === true && d.counted(key) === 'open', { outdated: d.outdated(), p0, counted: d.counted(key) });
  serverVersion = VERSION;
  await d.board(key, true);
  const p1 = d.attempt(key);
  for (let i = 0; i < 20 && !(JSON.parse(mem.get('echoes.daily.v1')).days[key] || {}).ticket; i++) await new Promise((r) => setTimeout(r, 10));
  const day = JSON.parse(mem.get('echoes.daily.v1')).days[key] || {};
  check('client', 'the counted run asks for its ticket at Set out and keeps it on the device', !d.outdated() && p1.practice === false && day.counted === 'started' && day.ticket && typeof day.ticket.sig === 'string', day);
  // The run ends 20 minutes later and is posted with its ticket.
  now += 20 * 60 * 1000;
  summary = { ticks: 15 * 60 * SIM_HZ, campaign: { daily: { key, depth: 6, won: false } } };
  handlers.run_end({ result: 'fall' });
  for (let i = 0; i < 50 && (!d.last() || d.last().state === 'posting'); i++) await new Promise((r) => setTimeout(r, 10));
  check('client', 'the run is posted with its ticket and taken', posted.length === 1 && posted[0].ticket && posted[0].ticket.sig === day.ticket.sig && d.last().state === 'posted' && d.last().rank === 1, { last: d.last(), sentTicket: !!(posted[0] && posted[0].ticket) });
  check('client', 'the day keeps its ticket after the result is noted', !!(JSON.parse(mem.get('echoes.daily.v1')).days[key] || {}).ticket);
}

// ---------------------------------------------------------- input cap --
{
  const { createHostDriver, INPUT_BUFFER_CAP, INPUT_SEQ_WINDOW } = await import(u('src/net/driver.js'));
  const { encodeInputPacket, withSeat } = await import(u('src/net/protocol/codec.js'));
  const make = () => {
    const seats = [{ index: 0, peerId: 'h', connected: true }, { index: 1, peerId: 'g', connected: true }];
    const net = { room: { seats }, peerId: 'h', transport: { state: 'open', sendBinary() {} } };
    const seen = [];
    const world = { step(t, p, si) { seen.push(si.seats[1] ? si.seats[1].moves.length : 0); }, cmd() { return {}; } };
    const clock = { tick: 0, onTickEnd() { return () => {}; } };
    const d = createHostDriver({ net, world, clock, bus: { on() { return () => {}; } }, registry: { all: () => [] }, capture: () => ({}), sampleLocal: () => ({ move: { x: 0, z: 0 }, presses: [] }) });
    return { d, seen };
  };
  const fr = (seq, move = 1) => ({ seq, tick: seq, viewTick: 0, move, basic: false, revive: false, away: false, aimX: 0, aimZ: 0, press: 0 });
  const send = (d, frames) => d.onBinary(withSeat(encodeInputPacket(1, null, frames), 1));

  // A normal guest: six-frame redundancy, one new frame a tick.
  {
    const { d } = make();
    let maxDepth = 0;
    for (let t = 1; t <= 600; t++) {
      const lo = Math.max(1, t - 5);
      send(d, Array.from({ length: t - lo + 1 }, (_, k) => fr(lo + k)));
      d.step(t);
      maxDepth = Math.max(maxDepth, d.feeds.get(1).buffer.size);
    }
    const st = d.stats();
    check('input', 'a normal guest line is consumed in order, nothing dropped', d.feeds.get(1).lastConsumed === 600 && st.inputDropped === 0 && st.seqJumps === 0 && st.gapsFilled === 0, { lastConsumed: d.feeds.get(1).lastConsumed, maxDepth, dropped: st.inputDropped });
  }
  // A hostile guest: far-future seqs in every packet.
  {
    const { d } = make();
    for (let s = 1; s <= 10; s++) send(d, [fr(s)]);
    for (let t = 1; t <= 10; t++) d.step(t);
    const heap0 = process.memoryUsage().heapUsed;
    for (let p = 0; p < 50000; p++) send(d, [0, 1, 2, 3, 4, 5].map((k) => fr(51 + ((p * 7) % 5000) + k * 1000)));
    const size = d.feeds.get(1).buffer.size;
    const grew = process.memoryUsage().heapUsed - heap0;
    check('input', `the seat buffer stays at most ${INPUT_BUFFER_CAP} under a far-future flood`, size <= INPUT_BUFFER_CAP && d.stats().inputDropped > 0, { size, dropped: d.stats().inputDropped, heapGrowthMB: +(grew / 1048576).toFixed(1) });
    // Before the host has consumed anything there is no line yet: the cap
    // alone holds the buffer.
    const { d: d0 } = make();
    for (let p = 0; p < 2000; p++) send(d0, [0, 1, 2, 3, 4, 5].map((k) => fr(1 + p * 6 + k)));
    check('input', 'before the first tick the cap alone holds the buffer', d0.feeds.get(1).buffer.size === INPUT_BUFFER_CAP, { size: d0.feeds.get(1).buffer.size });
    // A burst ahead within the window is buffered whole, then capped.
    const { d: d2 } = make();
    send(d2, [fr(1)]);
    d2.step(1);
    for (let s = 2; s <= 400; s += 6) send(d2, Array.from({ length: 6 }, (_, k) => fr(s + k)));
    check('input', `frames past the window (${INPUT_SEQ_WINDOW}) are dropped`, Math.max(...d2.feeds.get(1).buffer.keys()) <= 1 + INPUT_SEQ_WINDOW, { maxSeq: Math.max(...d2.feeds.get(1).buffer.keys()) });
  }
  // An outage: the guest's line comes back 500 frames on, nothing buffered.
  {
    const { d, seen } = make();
    for (let s = 1; s <= 30; s++) send(d, [fr(s)]);
    for (let t = 1; t <= 30; t++) d.step(t);
    for (let t = 31; t <= 60; t++) d.step(t); // starved
    for (let s = 531; s <= 560; s++) send(d, [fr(s, 5)]);
    for (let t = 61; t <= 90; t++) d.step(t);
    check('input', 'a line that jumped past the window restarts instead of freezing the seat', d.stats().seqJumps === 1 && d.feeds.get(1).lastConsumed >= 555 && seen.slice(-5).every((n) => n >= 1), { lastConsumed: d.feeds.get(1).lastConsumed, jumps: d.stats().seqJumps });
  }
}

mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify({ probe: 'server-hardening-2', failed, passed: results.length - failed, results }, null, 1));
console.log(`server hardening 2 probe: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
