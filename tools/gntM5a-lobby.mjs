#!/usr/bin/env node
// gntM5a — session server probes (docs/gauntlet/PLAN.md §7 G5a.1, G5a.2,
// G5a.4 outage/drop, plus reconnect / host grace / migration / server kill).
// Node WebSocket clients built from src/net/lobbyClient.js (the same module the
// browser runs) against an in-process server (server/server.mjs) on port
// 7811, plus one CHILD-PROCESS server (`node server/index.mjs --port 7812`)
// for the startup-time and zero-dependency checks. Every server this tool
// starts is closed / killed before it exits.
//
//   node tools/gntM5a-lobby.mjs [--trials 50] [--quick] [--out captures/gntM5a-lobby.json]
import { spawn } from 'node:child_process';
import { connect as netConnect } from 'node:net';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(resolve(here, p)).href;
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const TRIALS = Number(arg('trials', 50));
const QUICK = argv.includes('--quick');
const OUT = arg('out', 'captures/gntM5a-lobby.json');
const PORT = 7811;
const CHILD_PORT = 7812;

const { createEchoesServer } = await import(u('server/server.mjs'));
const { createNetClient } = await import(u('src/net/lobbyClient.js'));
const { MSG, BIN, PROTOCOL_VERSION } = await import(u('src/net/protocol/constants.js'));
const codec = await import(u('src/net/protocol/codec.js'));
const { VERSION } = await import(u('src/version.js'));

const results = [];
let failed = 0;
function check(group, name, ok, detail = {}) {
  results.push({ group, name, ok: !!ok, ...detail });
  if (!ok) failed += 1;
  const d = Object.keys(detail).length ? '  ' + JSON.stringify(detail).slice(0, 400) : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${d}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, timeoutMs = 5000, step = 20) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const v = fn();
    if (v) return v;
    await sleep(step);
  }
  return fn();
}

const URL0 = `ws://127.0.0.1:${PORT}/echoes`;
const clients = [];
function client(name, extra = {}) {
  const c = createNetClient({ params: { net: extra.url || URL0, netName: name, netCond: extra.cond || null }, version: extra.version || VERSION, autoStart: false, probeStream: false });
  clients.push(c);
  return c;
}
async function closeAll() {
  for (const c of clients.splice(0)) {
    try {
      c.disconnect();
    } catch {
      /* ignore */
    }
  }
  await sleep(50);
}
// Raw control client (hand-written JSON) for malformed / edge messages.
function raw(url = URL0) {
  const ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';
  const inbox = [];
  const closed = { code: null };
  ws.onmessage = (e) => inbox.push(typeof e.data === 'string' ? JSON.parse(e.data) : new Uint8Array(e.data));
  ws.onclose = (e) => (closed.code = e.code);
  const opened = new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  return {
    ws,
    inbox,
    closed,
    opened,
    send: (o) => ws.send(typeof o === 'string' ? o : JSON.stringify(o)),
    next: (pred, ms = 3000) => until(() => inbox.find(pred), ms),
  };
}

const server = createEchoesServer({ port: PORT, host: '127.0.0.1', admin: true });
await server.listen();
const report = { schema: 'gntM5a-lobby/1', at: new Date().toISOString(), version: VERSION };

try {
  // ------------------------------------------------ G5a.1 child process --
  {
    const t0 = Date.now();
    const child = spawn(process.execPath, [join(here, 'server/index.mjs'), '--port', String(CHILD_PORT), '--admin'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const ready = await new Promise((res) => {
      const timer = setTimeout(() => res(null), 5000);
      child.stdout.on('data', (d) => {
        out += d;
        if (out.includes('[echoes-net] ready')) {
          clearTimeout(timer);
          res(Date.now() - t0);
        }
      });
    });
    let health = null;
    try {
      health = await (await fetch(`http://127.0.0.1:${CHILD_PORT}/health`)).json();
    } catch {
      health = null;
    }
    child.kill();
    await new Promise((r) => child.once('exit', r));
    report.startupMs = ready;
    check('G5a.1', `\`node server/index.mjs --port ${CHILD_PORT}\` prints ready in ${ready} ms (gate <= 1000, incl. Node start); /health ok`, ready !== null && ready <= 1000 && health && health.ok === true && health.transport === 'websocket', { readyMs: ready, health });
    // Zero npm dependencies: every import reachable from server/index.mjs is
    // a node: built-in or a relative project file.
    const seen = new Set();
    const bad = [];
    const walk = (file) => {
      if (seen.has(file)) return;
      seen.add(file);
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm)) {
        const spec = m[1];
        if (spec.startsWith('node:')) continue;
        if (spec.startsWith('.')) walk(resolve(dirname(file), spec));
        else bad.push(`${file.replace(here, '')}: ${spec}`);
      }
    };
    walk(join(here, 'server/index.mjs'));
    check('G5a.1', `zero npm dependencies: ${seen.size} modules reachable from server/index.mjs, all node: built-ins or project files`, bad.length === 0, { modules: seen.size, bad });
  }

  // ------------------------------------------------ RFC 6455 conformance --
  {
    const rawSock = (headers, path = '/echoes') =>
      new Promise((res) => {
        const s = netConnect(PORT, '127.0.0.1', () => {
          s.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\n${headers}\r\n`);
        });
        let buf = Buffer.alloc(0);
        s.on('data', (d) => (buf = Buffer.concat([buf, d])));
        setTimeout(() => {
          s.destroy();
          res(buf.toString('latin1'));
        }, 300);
      });
    const key = randomBytes(16).toString('base64');
    const good = await rawSock(`Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n`);
    const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    const v12 = await rawSock(`Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 12\r\n`);
    const wrongPath = await rawSock(`Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n`, '/nope');
    check('ws', 'handshake: 101 + correct Sec-WebSocket-Accept; version 12 -> 426; wrong path -> 404', good.startsWith('HTTP/1.1 101') && good.includes(`Sec-WebSocket-Accept: ${accept}`) && v12.startsWith('HTTP/1.1 426') && wrongPath.startsWith('HTTP/1.1 404'));

    // Frame-level probes on an upgraded raw socket.
    const frameProbe = (frames) =>
      new Promise((res) => {
        const k = randomBytes(16).toString('base64');
        const s = netConnect(PORT, '127.0.0.1', () => {
          s.write(`GET /echoes HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${k}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
          setTimeout(() => {
            for (const f of frames) s.write(f);
          }, 50);
        });
        let buf = Buffer.alloc(0);
        s.on('data', (d) => (buf = Buffer.concat([buf, d])));
        const done = () => {
          const i = buf.indexOf('\r\n\r\n');
          const body = i >= 0 ? buf.subarray(i + 4) : Buffer.alloc(0);
          res(parseServerFrames(body));
        };
        s.on('close', done);
        setTimeout(() => {
          s.destroy();
        }, 700);
      });
    const mk = (opcode, payload, { fin = true, mask = true } = {}) => {
      const p = Buffer.from(payload);
      const len = p.length;
      const hdr = [((fin ? 0x80 : 0) | opcode) & 0xff];
      let ext = Buffer.alloc(0);
      if (len < 126) hdr.push((mask ? 0x80 : 0) | len);
      else if (len < 65536) {
        hdr.push((mask ? 0x80 : 0) | 126);
        ext = Buffer.alloc(2);
        ext.writeUInt16BE(len);
      } else {
        hdr.push((mask ? 0x80 : 0) | 127);
        ext = Buffer.alloc(8);
        ext.writeUInt32BE(Math.floor(len / 2 ** 32), 0);
        ext.writeUInt32BE(len >>> 0, 4);
      }
      if (!mask) return Buffer.concat([Buffer.from(hdr), ext, p]);
      const m = randomBytes(4);
      const q = Buffer.from(p);
      for (let i = 0; i < q.length; i++) q[i] ^= m[i & 3];
      return Buffer.concat([Buffer.from(hdr), ext, m, q]);
    };
    function parseServerFrames(b) {
      const out = [];
      let o = 0;
      while (o + 2 <= b.length) {
        const op = b[o] & 0x0f;
        let len = b[o + 1] & 0x7f;
        let off = o + 2;
        if (len === 126) {
          len = b.readUInt16BE(o + 2);
          off += 2;
        } else if (len === 127) {
          len = b.readUInt32BE(o + 6);
          off += 8;
        }
        const payload = b.subarray(off, off + len);
        out.push({ op, payload, code: op === 8 && payload.length >= 2 ? payload.readUInt16BE(0) : null, text: op === 1 ? payload.toString('utf8') : null });
        o = off + len;
      }
      return out;
    }
    const hello = JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, build: VERSION, name: 'frag' });
    const fr = await frameProbe([mk(1, hello.slice(0, 10), { fin: false }), mk(9, 'ping!'), mk(0, hello.slice(10, 30), { fin: false }), mk(0, hello.slice(30), { fin: true })]);
    const welcome = fr.find((f) => f.op === 1 && f.text.includes('"welcome"'));
    const pong = fr.find((f) => f.op === 10 && f.payload.toString() === 'ping!');
    check('ws', 'fragmented text (3 frames) with an interleaved ping: reassembled -> welcome; ping -> pong', !!welcome && !!pong);
    const unmasked = await frameProbe([mk(1, hello, { mask: false })]);
    const badUtf8 = await frameProbe([mk(1, Buffer.from([0xc3, 0x28]))]);
    const tooBig = await frameProbe([mk(2, Buffer.alloc((1 << 20) + 10))]);
    const badClose = await frameProbe([mk(8, Buffer.from([0x03, 0xe7]))]); // 999
    const reserved = await frameProbe([Buffer.from([0xc1, 0x80, 1, 2, 3, 4])]); // RSV1
    const code = (fs) => (fs.find((f) => f.op === 8) || {}).code ?? null;
    check('ws', 'protocol errors close with the RFC code: unmasked 1002, bad UTF-8 1007, > 1 MiB 1009, bad close code 1002, RSV bit 1002', code(unmasked) === 1002 && code(badUtf8) === 1007 && code(tooBig) === 1009 && code(badClose) === 1002 && code(reserved) === 1002, {
      unmasked: code(unmasked),
      badUtf8: code(badUtf8),
      tooBig: code(tooBig),
      badClose: code(badClose),
      reserved: code(reserved),
    });
    const cleanClose = await frameProbe([mk(8, Buffer.from([0x03, 0xe8, 0x62, 0x79, 0x65]))]);
    check('ws', 'close handshake: the server echoes 1000', code(cleanClose) === 1000);
  }

  // ------------------------------------------------------------ G5a.2 --
  {
    const h = client('Host');
    const r1 = await h.host({ visibility: 'public' });
    const g1 = client('Ada');
    const j1 = await g1.join(r1.code);
    const g2 = client('Bo');
    const j2 = await g2.join(r1.code.toLowerCase().split('').join(' '), 3);
    check('G5a.2', `create public room ${r1.code}; join by code (seat ${j1.seat}); join by messy lowercase code asking for seat 3 -> seat ${j2.seat}`, r1.ok && j1.ok && j1.seat === 1 && j2.ok && j2.seat === 3);
    const sel = await g1.selectSeat(2);
    const selTaken = await g1.selectSeat(3);
    check('G5a.2', `seat select: 1 -> 2 ok; 2 -> 3 (taken) refused "${selTaken.reason}"`, sel.ok && g1.seat === 2 && !selTaken.ok && selTaken.reason === 'seat_taken');
    const early = await h.start(42);
    await g1.setReady(true);
    await g2.setReady(true);
    const notHost = await g1.start();
    const st = await h.start(42);
    const inGame = await until(() => h.state === 'host' && g1.state === 'guest' && g2.state === 'guest', 4000);
    check('G5a.2', `ready gate: start before ready -> "${early.reason}"; guest start -> "${notHost.reason}"; all ready -> game_starting (${st.countdownMs} ms countdown) -> host/guest states`, !early.ok && early.reason === 'not_ready' && !notHost.ok && notHost.reason === 'not_host' && st.ok && st.countdownMs === 1500 && !!inGame, { states: [h.state, g1.state, g2.state] });
    // Drop-in: the fourth seat of an in_game room.
    const g3 = client('Cy');
    const dropIn = await g3.join(r1.code);
    const hostSawJoin = await until(() => h.log(80).some((e) => e.kind === 'peer_joined' && e.seat === dropIn.seat), 2000);
    check('G5a.2', `drop-in: joining the running room takes the AI-held seat ${dropIn.seat}; host notified (full snapshot trigger)`, dropIn.ok && !!hostSawJoin && g3.state === 'guest');
    // Private room: not offered to quick match.
    const p = client('Priv');
    const pr = await p.host({ visibility: 'private' });
    const q = client('Quinn');
    const qm = await q.quickMatch();
    check('G5a.2', `quick match never lands in a private room (${pr.code}) nor a started one -> creates its own public room ${qm.code} and waits (queued)`, pr.ok && qm.ok && qm.queued === true && qm.code !== pr.code && qm.code !== r1.code);
    const q2 = client('Rae');
    const qm2 = await q2.quickMatch();
    const hostMatched = await until(() => q.log(50).some((e) => e.kind === 'state') && q.room && q.room.seats.filter((s) => s.peerId).length === 2, 2000);
    check('G5a.2', `quick match: the second player joins the oldest open public room ${qm.code} (match_found, seat ${qm2.seat})`, qm2.ok && qm2.code === qm.code && !qm2.queued && !!hostMatched);
    const qc = client('Sol');
    await qc.quickMatch();
    const cancelled = await qc.cancelMatch();
    check('G5a.2', 'cancel match: leaves (and closes) the waiting room', cancelled.ok && qc.room === null);
    await closeAll();
  }

  // Every rejection reason, reachable and explicit.
  {
    const reasons = {};
    const h = client('H');
    const r = await h.host({ visibility: 'public', dropIn: false });
    const gs = [client('a'), client('b'), client('c')];
    for (const g of gs) await g.join(r.code);
    const extra = client('late');
    reasons.full = (await extra.join(r.code)).reason;
    reasons.not_found = (await extra.join('ZZZZZ')).reason;
    reasons.bad_code = (await extra.join('O0I1!')).reason;
    const wrongBuild = client('old', { version: '0.0.1' });
    reasons.version_mismatch = (await wrongBuild.join(r.code)).reason;
    for (const g of gs) await g.setReady(true);
    // One guest leaves so a seat is free, then start -> starting: joins are locked.
    await gs[2].leave();
    await h.start(1);
    reasons.in_progress_locked_starting = (await extra.join(r.code)).reason;
    await until(() => h.state === 'host', 3000);
    reasons.in_progress_locked_nodropin = (await client('late2').join(r.code)).reason;
    // bad_request: malformed JSON / payloads from a raw socket.
    const rw = raw();
    await rw.opened;
    rw.send({ t: 'hello', v: PROTOCOL_VERSION, build: VERSION, name: 'raw' });
    await rw.next((m) => m.t === 'welcome');
    rw.send('{not json');
    rw.send({ t: 'join_room', code: 'ABCDE', seat: 9 });
    rw.send({ t: 'teleport' });
    const br = await until(() => rw.inbox.filter((m) => m.reason === 'bad_request').length >= 3 && rw.inbox, 2000);
    reasons.bad_request = br ? rw.inbox.filter((m) => m.reason === 'bad_request').map((m) => m.t) : null;
    // version mismatch at hello (protocol) + server_full (rooms).
    const rv = raw();
    await rv.opened;
    rv.send({ t: 'hello', v: PROTOCOL_VERSION + 7, build: VERSION, name: 'future' });
    const vm = await rv.next((m) => m.reason === 'version_mismatch');
    await until(() => rv.closed.code !== null, 1500);
    reasons.hello_version = vm ? `${vm.reason} (closed ${rv.closed.code})` : null;
    const small = createEchoesServer({ port: 7813, maxRooms: 1 });
    await small.listen();
    const s1 = client('s1', { url: 'ws://127.0.0.1:7813/echoes' });
    const s2 = client('s2', { url: 'ws://127.0.0.1:7813/echoes' });
    await s1.host();
    reasons.server_full = (await s2.host()).reason;
    rw.ws.close();
    await closeAll();
    await small.close();
    report.rejections = reasons;
    check(
      'G5a.2',
      'every rejection reason reachable and explicit: full, not_found, in_progress_locked (starting + no drop-in), version_mismatch (build + protocol), bad_request, server_full',
      reasons.full === 'full' &&
        reasons.not_found === 'not_found' &&
        reasons.bad_code === 'not_found' &&
        reasons.version_mismatch === 'version_mismatch' &&
        reasons.in_progress_locked_starting === 'in_progress_locked' &&
        reasons.in_progress_locked_nodropin === 'in_progress_locked' &&
        Array.isArray(reasons.bad_request) &&
        reasons.bad_request.length >= 3 &&
        typeof reasons.hello_version === 'string' &&
        reasons.hello_version.includes('4001') &&
        reasons.server_full === 'server_full',
      reasons
    );
  }

  // Last-seat race: exactly one of two simultaneous joins wins, 50 trials.
  {
    let exactOne = 0;
    const outcomes = [];
    for (let t = 0; t < TRIALS; t++) {
      const h = client(`h${t}`);
      const r = await h.host({ visibility: 'private' });
      const a = client(`a${t}`);
      const b = client(`b${t}`);
      await a.join(r.code);
      await b.join(r.code); // seats 1, 2 taken; seat 3 is the last
      const x = client(`x${t}`);
      const y = client(`y${t}`);
      await Promise.all([x.connect(), y.connect()]);
      const [rx, ry] = await Promise.all([x.join(r.code), y.join(r.code)]);
      const wins = [rx, ry].filter((v) => v.ok).length;
      const fulls = [rx, ry].filter((v) => !v.ok && v.reason === 'full').length;
      if (wins === 1 && fulls === 1) exactOne += 1;
      outcomes.push([rx.ok ? `seat${rx.seat}` : rx.reason, ry.ok ? `seat${ry.seat}` : ry.reason]);
      await closeAll();
    }
    report.race = { trials: TRIALS, exactOne, sample: outcomes.slice(0, 5) };
    check('G5a.2', `last-seat race: exactly 1 success + 1 explicit "full" in ${exactOne}/${TRIALS} trials`, exactOne === TRIALS, report.race);
    // Quick-match race: two quick matches for one open seat -> both end up seated (loser routed on).
    const h = client('qh');
    await h.quickMatch();
    const f1 = client('qf1');
    const f2 = client('qf2');
    await f1.quickMatch();
    await f2.quickMatch(); // host + 2 = one seat left
    const z1 = client('qz1');
    const z2 = client('qz2');
    await Promise.all([z1.connect(), z2.connect()]);
    const [a1, a2] = await Promise.all([z1.quickMatch(), z2.quickMatch()]);
    const codes = [a1.code, a2.code];
    check('G5a.2', `quick-match race for the last seat: one takes it, the loser is routed to a new room (${codes.join(' / ')})`, a1.ok && a2.ok && codes[0] !== codes[1] && [a1, a2].some((x) => x.queued === true) && [a1, a2].some((x) => !x.queued));
    await closeAll();
  }

  // --------------------------------------------- relay + keyframe cache --
  {
    const h = client('H');
    const r = await h.host({ visibility: 'private' });
    const g = client('G');
    await g.join(r.code);
    await g.setReady(true);
    await h.start(3);
    await until(() => h.state === 'host' && g.state === 'guest', 3000);
    const gotSnap = [];
    const gotInput = [];
    g.on('binary', (u8) => gotSnap.push(u8));
    h.on('binary', (u8) => gotInput.push(u8));
    h.sendBinary(new Uint8Array([BIN.SNAP, 1, 9, 9, 9]));
    h.sendBinary(new Uint8Array([BIN.SNAP, 0xff, 7]));
    g.sendBinary(codec.encodeInputPacket(0, 5, [{ seq: 1, tick: 1, viewTick: 0, move: 3, aimX: 1, aimZ: 2, press: 1 }]));
    const badBefore = server.counters.badFrames;
    g.sendBinary(new Uint8Array([BIN.SNAP, 0, 1])); // guest may not send SNAP
    h.sendBinary(codec.encodeKeyframe(1200, { v: 1, clock: { tick: 1200 }, z: -0 }));
    await until(() => gotSnap.length >= 2 && gotInput.length >= 1, 2000);
    const inp = gotInput[0] ? codec.decodeInputPacket(gotInput[0]) : null;
    const room = server.lobby.rooms.get(r.code);
    check('relay', 'host SNAP -> guest (addressed + broadcast with seat rewrite); guest INPUT -> host with seat := sender (1); guest SNAP refused; KEYFRAME cached, not forwarded', gotSnap.length === 2 && gotSnap[1][1] === 1 && inp && inp.seat === 1 && inp.ackSnapSeq === 5 && server.counters.badFrames === badBefore + 1 && room.keyframe && room.keyframe.tick === 1200 && !gotSnap.some((x) => x[0] === BIN.KEYFRAME), { snaps: gotSnap.length, inputSeat: inp && inp.seat, keyframe: room.keyframe && room.keyframe.tick });
    await closeAll();
  }

  // ---------------------------------------------- reconnect + holds --
  {
    const h = client('H');
    const r = await h.host({ visibility: 'private' });
    const g = client('G');
    await g.join(r.code);
    await g.setReady(true);
    await h.start(4);
    await until(() => g.state === 'guest', 3000);
    const events = [];
    h.on('peer_dropped', (m) => events.push(['dropped', m.seat, m.holdMs]));
    h.on('peer_restored', (m) => events.push(['restored', m.seat]));
    g.drop(1000); // socket dies; no retry before 1 s
    const t0 = Date.now();
    const back = await until(() => g.state === 'guest' && g.stats().reconnects === 1, 8000);
    const took = Date.now() - t0;
    check('reconnect', `guest drop (1 s outage) -> seat held 60 s (AI), host told; reconnect with the session token after the outage: restored in ${took} ms (client lastReconnectMs ${g.stats().lastReconnectMs})`, !!back && events.some((e) => e[0] === 'dropped' && e[2] === 60000) && events.some((e) => e[0] === 'restored' && e[1] === g.seat) && g.stats().lastReconnectMs < 3000, { events, took });
    // Host drop inside the grace window: host_lost then the host returns.
    const gEvents = [];
    g.on('host_lost', (m) => gEvents.push(['host_lost', m.graceMs]));
    g.on('peer_restored', (m) => gEvents.push(['restored', m.host]));
    h.drop(800);
    const hostBack = await until(() => h.state === 'host' && gEvents.some((e) => e[0] === 'restored' && e[1] === true), 8000);
    check('reconnect', 'host drop < grace: guests get host_lost { graceMs: 10000 } (room -> migrating) and the host resumes (no migration)', !!hostBack && gEvents.some((e) => e[0] === 'host_lost' && e[1] === 10000) && server.lobby.rooms.get(r.code).hostPeerId === h.peerId, { gEvents });
    await closeAll();
  }

  // Blackhole via admin: silence > 5 s -> server drops the guest, client
  // watchdog reconnects once the link returns.
  if (!QUICK) {
    const h = client('H');
    const r = await h.host({ visibility: 'private' });
    const g = client('G');
    await g.join(r.code);
    await g.setReady(true);
    await h.start(5);
    await until(() => g.state === 'guest', 3000);
    const res = await (await fetch(`http://127.0.0.1:${PORT}/admin/drop`, { method: 'POST', body: JSON.stringify({ peerId: g.peerId, mode: 'blackhole', forMs: 6500 }) })).json();
    const dropped = await until(() => h.log(100).some((e) => e.kind === 'peer_dropped'), 9000);
    const restored = await until(() => g.state === 'guest' && g.stats().reconnects >= 1, 15000);
    check('G5a.4', `admin blackhole 6.5 s on a guest link: server declares it dropped after 5 s silence, the client watchdog reconnects after the outage (${g.stats().lastReconnectMs} ms)`, res.ok && !!dropped && !!restored, { res });
    await closeAll();
  }

  // Admin drop close + forMs: the identity is refused until the window ends.
  {
    const h = client('H');
    const r = await h.host({ visibility: 'private' });
    const g = client('G');
    await g.join(r.code);
    await g.setReady(true);
    await h.start(6);
    await until(() => g.state === 'guest', 3000);
    const t0 = Date.now();
    const res = await (await fetch(`http://127.0.0.1:${PORT}/admin/drop`, { method: 'POST', body: JSON.stringify({ peerId: g.peerId, mode: 'close', forMs: 2000 }) })).json();
    const reconnecting = await until(() => g.state === 'reconnecting', 2000);
    const back = await until(() => g.state === 'guest', 9000);
    const ms = Date.now() - t0;
    check('G5a.4', `admin drop close forMs 2000: the guest reconnects only after the window (${ms} ms), state reconnecting -> guest`, res.ok && !!reconnecting && !!back && ms >= 2000 && ms < 7000, { ms });
    await closeAll();
  }

  // Server conditioner on one link: RTT follows the configured latency.
  {
    const h = client('H');
    const r = await h.host({ visibility: 'private' });
    const g = client('G');
    await g.join(r.code);
    const res = await (await fetch(`http://127.0.0.1:${PORT}/admin/conditioner`, { method: 'POST', body: JSON.stringify({ target: g.peerId, up: 'lat50,jit5', down: 'lat50,jit5' }) })).json();
    await sleep(6500);
    const s = g.stats();
    const hs = h.stats();
    check('G5a.4', `admin conditioner lat50 both ways on ONE guest link: guest RTT ${s.rttMs} ms (want 100 ± 10%), host RTT untouched ${hs.rttMs} ms`, res.ok && Math.abs(s.rttMs - 100) <= 10 && hs.rttMs < 10, { guest: s.rttMs, host: hs.rttMs });
    const st = await (await fetch(`http://127.0.0.1:${PORT}/stats`)).json();
    const gl = st.peers.find((p) => p.peerId === g.peerId);
    check('admin', '/stats lists rooms, peers with per-link bytes/s + conditioner specs + rtt', st.ok && st.rooms.length >= 1 && gl && gl.link && gl.link.down.spec.includes('lat50') && typeof gl.link.bytesOutPerSec === 'number' && gl.rttMs > 0);
    await closeAll();
  }

  // Host migration: kill-host -> grace 10 s -> lowest-RTT guest becomes host
  // with the cached keyframe (state age <= 2 s).
  if (!QUICK) {
    const h = client('H');
    const r = await h.host({ visibility: 'private' });
    const a = client('A');
    const b = client('B');
    await a.join(r.code);
    await b.join(r.code);
    await (await fetch(`http://127.0.0.1:${PORT}/admin/conditioner`, { method: 'POST', body: JSON.stringify({ target: b.peerId, up: 'lat40', down: 'lat40' }) })).json();
    await a.setReady(true);
    await b.setReady(true);
    await h.start(7);
    await until(() => a.state === 'guest' && b.state === 'guest', 3000);
    await sleep(2500); // RTT samples reach the server
    // Host keyframes every 2 s (what the host driver does), last one just before the kill.
    for (let i = 0; i < 2; i++) {
      h.sendBinary(codec.encodeKeyframe(1000 + i * 120, { v: 1, clock: { tick: 1000 + i * 120 }, marker: i }));
      await sleep(i === 0 ? 1500 : 300);
    }
    const became = [];
    const changed = [];
    a.on('become_host', (m) => became.push(['A', m]));
    b.on('become_host', (m) => became.push(['B', m]));
    a.on('host_changed', (m) => changed.push(['A', m.hostPeerId]));
    b.on('host_changed', (m) => changed.push(['B', m.hostPeerId]));
    const hostLost = [];
    h.on('session_lost', (m) => hostLost.push(m.reason));
    const tKill = Date.now();
    const kh = await (await fetch(`http://127.0.0.1:${PORT}/admin/kill-host`, { method: 'POST', body: JSON.stringify({ code: r.code }) })).json();
    const lost = await until(() => a.state === 'migrating' && b.state === 'migrating', 2000);
    const migrated = await until(() => became.length > 0, 16000);
    const tMig = Date.now() - tKill;
    const bh = became[0] ? became[0][1] : null;
    const kf = bh && bh.keyframe ? codec.decodeKeyframe(codec.fromBase64(bh.keyframe.b64)) : null;
    const newHostState = await until(() => a.state === 'host' || b.state === 'host', 3000);
    await until(() => changed.some((c) => c[0] === 'B'), 3000);
    report.migration = { killToBecomeHostMs: tMig, who: became[0] && became[0][0], keyframeTick: kf && kf.tick, stateAgeMs: bh && bh.keyframe && bh.keyframe.stateAgeMs, changed };
    check('migration', `kill-host -> guests "migrating" (grace), become_host after ${tMig} ms to the LOWEST-RTT guest (${became[0] && became[0][0]}), keyframe tick ${kf && kf.tick} exact (-0 kept), state age ${bh && bh.keyframe && bh.keyframe.stateAgeMs} ms (<= 2000); others get host_changed`, kh.ok && !!lost && !!migrated && became[0][0] === 'A' && kf && kf.tick === 1120 && kf.tree.marker === 1 && bh.keyframe.stateAgeMs <= 2000 && tMig >= 10000 && tMig <= 15000 && changed.some((c) => c[0] === 'B' && c[1] === a.peerId) && !!newHostState, report.migration);
    // The killed host's client is told it was removed (close 4006: no retry
    // loop), and its token can no longer reattach to the room.
    const evicted = server.lobby.rooms.get(r.code)?.evicted.has(kh.hostPeerId);
    check('migration', `the killed host's client ends with session_lost "${hostLost[0]}" (no reconnect loop), state ${h.state}; its identity is barred from the room`, hostLost[0] === 'removed_by_server' && h.state === 'offline' && evicted === true);
    await closeAll();
  }

  // 8 concurrent Node clients (G5a.1; the Chrome half runs in the netbench).
  {
    const cs = [];
    for (let i = 0; i < 8; i++) cs.push(client(`c${i}`));
    const rs = await Promise.all(cs.map((c) => c.connect()));
    const h1 = await cs[0].host({ visibility: 'public' });
    const h2 = await cs[4].host({ visibility: 'public' });
    const js = await Promise.all([1, 2, 3].map((i) => cs[i].join(h1.code)).concat([5, 6, 7].map((i) => cs[i].join(h2.code))));
    const health = await (await fetch(`http://127.0.0.1:${PORT}/health`)).json();
    const full = [cs[0], cs[4]].every((c) => c.room && c.room.seats.every((s) => s.peerId && s.connected));
    check('G5a.1', `8 concurrent Node WebSocket clients: 8 welcomes, two full 4-seat rooms, /health peers ${health.peers}`, rs.every((x) => x.ok) && js.every((x) => x.ok) && health.peers === 8 && full);
    await closeAll();
  }

  // Server kill: every client learns it at once (no endless spinner).
  {
    const k = createEchoesServer({ port: 7814 });
    await k.listen();
    const h = client('H', { url: 'ws://127.0.0.1:7814/echoes' });
    const g = client('G', { url: 'ws://127.0.0.1:7814/echoes' });
    const r = await h.host();
    await g.join(r.code);
    const lost = [];
    h.on('session_lost', (m) => lost.push(['H', m.reason, m.text]));
    g.on('session_lost', (m) => lost.push(['G', m.reason, m.text]));
    const t0 = Date.now();
    await k.close();
    await until(() => lost.length === 2, 3000);
    check('server-kill', `server shutdown -> both clients session_lost "${lost[0] && lost[0][2]}" within ${Date.now() - t0} ms (no retry loop)`, lost.length === 2 && lost.every((l) => l[1] === 'server_shutdown') && h.state === 'offline' && g.state === 'offline', { lost });
    await closeAll();
  }

  // Probe unreachable: fast, explicit.
  {
    const c = client('P', { url: 'ws://127.0.0.1:7819/echoes' });
    const t0 = Date.now();
    const pr = await c.probe();
    const ok = await client('P2').probe();
    check('probe', `probe of a dead port -> unreachable in ${pr.ms} ms (<= 5000, one retry); a live server -> online in ${ok.ms} ms`, pr.state === 'unreachable' && Date.now() - t0 <= 5000 && ok.state === 'online');
    await closeAll();
  }
} catch (err) {
  console.error(err);
  failed += 1;
  results.push({ group: 'harness', name: 'crash', ok: false, error: String(err && err.stack) });
} finally {
  await closeAll();
  await server.close();
}

report.failed = failed;
report.results = results;
report.serverCounters = server.counters;
mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify(report, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
