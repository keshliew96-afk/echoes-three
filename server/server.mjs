// Echoes session server core (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// Zero npm dependencies: node:http + node:crypto + node:os only.
//
//   const srv = createEchoesServer({ port, host, admin, cond: { up, down } });
//   await srv.listen();  ...  await srv.close();
//
// Responsibilities: WebSocket termination (ws.mjs), identities + session
// tokens, the JSON control protocol (hello / rooms / matchmaking / ready /
// start / reconnect / ping), lobby rooms (lobby.mjs, matchmaking.mjs), the
// host <-> guest binary relay with a per-link network conditioner
// (relay.mjs), host keyframes for migration (keyframes.mjs), silence
// detection (guests 5 s, an in-game host 3 s), seat holds, host grace +
// migration, and the admin HTTP API (admin.mjs). The server never runs game
// logic: the authoritative sim is the host browser (listen-server model).
//
// DEPLOY (PLAN §14): `static` serves the built game on the same port as the
// WebSocket (static.mjs) and reports its build in `welcome.latestBuild` /
// `/health`, so a page older than the deployed game is told to reload;
// public-hosting hardening: an optional Origin allow-list (`origins`: exact
// origins, 'self' = the page came from this same host, '*' = any) and a
// per-IP WebSocket cap (`maxPerIp`; the client IP is X-Forwarded-For's
// last hop when the direct peer is a loopback reverse proxy; direct
// loopback clients — the host's own browser, the harness bots — are exempt).
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import {
  PROTOCOL_VERSION,
  DEFAULT_PORT,
  WS_PATH,
  MSG,
  REJECT,
  MAX_ROOMS,
  PEER_TIMEOUT_MS,
  HOST_TIMEOUT_MS,
} from '../src/net/protocol/constants.js';
import { decodeClientMessage, encodeMessage, sanitizeName, ERR } from '../src/net/protocol/messages.js';
import { parseCond, formatCond } from '../src/net/protocol/conditioner.js';
import { isUnreliableChannel } from '../src/net/protocol/codec.js';
import { isHeartbeat } from '../src/net/transport.js';
import { acceptUpgrade, CLOSE } from './ws.mjs';
import { Lobby } from './lobby.mjs';
import { quickMatch, cancelMatch } from './matchmaking.mjs';
import { createLink, linkStats, routeBinary } from './relay.mjs';
import { createHttpHandler } from './admin.mjs';
import { createStaticHandler, createBuildInfoReader } from './static.mjs';

export const HELLO_TIMEOUT_MS = 5000;
export const IDENTITY_TTL_MS = 10 * 60 * 1000;
export const MAX_PEERS = 256;
// Per client IP: a household of 4 players + their menu probes + a reload
// or two fits; a script opening sockets in a loop does not.
export const MAX_PER_IP = 16;
const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const isLoopbackIp = (ip) => LOOPBACK_IPS.has(String(ip || '')) || /^(::ffff:)?127\./.test(String(ip || ''));

// The client's IP: the direct peer, or — when the direct peer is a reverse
// proxy on this machine (Caddy / nginx / the Vite dev proxy) — the last
// X-Forwarded-For hop, which that proxy appended itself.
export function clientIp(req) {
  const direct = (req.socket && req.socket.remoteAddress) || '';
  const xff = req.headers['x-forwarded-for'];
  if (isLoopbackIp(direct) && xff) {
    const hops = String(xff).split(',').map((h) => h.trim()).filter(Boolean);
    if (hops.length) return { ip: hops[hops.length - 1], proxied: true };
  }
  return { ip: direct, proxied: false };
}

// origins: null / [] / ['*'] = any origin. Entries are exact origins
// ('https://echoes.example.com') or 'self' (the Origin's host equals the
// Host the request was sent to — the page came from this server or from a
// proxy in front of it). A request without an Origin header is not a
// browser page (bots, CLI tools) and is let through: the list fences off
// OTHER websites, it is not authentication.
export function originAllowed(req, origins) {
  if (!origins || !origins.length || origins.includes('*')) return true;
  const origin = req.headers.origin;
  if (!origin) return true;
  let o;
  try {
    o = new URL(String(origin));
  } catch {
    return false;
  }
  const exact = `${o.protocol}//${o.host}`.toLowerCase();
  for (const a of origins) {
    const want = String(a).trim().toLowerCase().replace(/\/$/, '');
    if (want === exact) return true;
    if (want === 'self') {
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
      if (host && host === o.host.toLowerCase()) return true;
    }
  }
  return false;
}

// Page links a static server is reachable at (the invite players open).
export function siteUrls(host, port, isStatic) {
  if (!isStatic) return [];
  if (host === '0.0.0.0' || host === '::') return lanUrls(host, port).map((u) => u.replace(/^ws:/, 'http:').replace(new RegExp(`${WS_PATH}$`), '/'));
  if (host === '127.0.0.1' || host === 'localhost' || host === '::1') return [];
  return [`http://${host.includes(':') ? `[${host}]` : host}:${port}/`];
}
const CONTROL_RATE = { perSec: 40, burst: 80, killAfter: 400 };
const BINARY_RATE = { perSec: 600, burst: 1200, killAfter: 6000 };

export function lanUrls(host, port) {
  if (host !== '0.0.0.0' && host !== '::') return [];
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list || []) {
      if (a.internal) continue;
      if (a.family === 'IPv4' || a.family === 4) out.push(`ws://${a.address}:${port}${WS_PATH}`);
    }
  }
  return out;
}

function bucket(rate, now) {
  return { tokens: rate.burst, last: now, dropped: 0, windowStart: now };
}
function take(b, rate, now) {
  b.tokens = Math.min(rate.burst, b.tokens + ((now - b.last) / 1000) * rate.perSec);
  b.last = now;
  if (now - b.windowStart > 10000) {
    b.windowStart = now;
    b.dropped = 0;
  }
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return 'ok';
  }
  b.dropped += 1;
  return b.dropped > rate.killAfter ? 'kill' : 'drop';
}

export function createEchoesServer(options = {}) {
  const opt = {
    port: DEFAULT_PORT,
    host: '127.0.0.1',
    admin: false,
    maxPeers: MAX_PEERS,
    maxRooms: MAX_ROOMS,
    log: false,
    cond: { up: null, down: null },
    static: null, // DEPLOY: a built game directory to serve at /
    origins: null, // DEPLOY: Origin allow-list (null = any)
    maxPerIp: MAX_PER_IP, // DEPLOY: WebSocket connections per client IP (0 = no cap)
    build: null, // DEPLOY: the deployed build when it is not served here ({ version, entry } or a version string)
    ...options,
  };
  const serveStatic = opt.static ? createStaticHandler({ root: opt.static, log: (k, d) => log(k, d) }) : null;
  const staticBuild = opt.static ? createBuildInfoReader(serveStatic.root) : null;
  function servedBuild() {
    if (opt.build) return typeof opt.build === 'string' ? { version: opt.build, entry: null } : opt.build;
    return staticBuild ? staticBuild() : null;
  }
  const perIp = new Map(); // client ip -> live WebSocket connections
  const now = () => Date.now();
  const startedAt = now();
  const peers = new Map(); // peerId -> identity
  const tokens = new Map(); // token -> identity
  const conns = new Set(); // live connection records
  let defaultCond = { up: parseCond(opt.cond.up), down: parseCond(opt.cond.down) };
  const counters = {
    connections: 0,
    hellos: 0,
    resumed: 0,
    relayed: 0,
    badFrames: 0,
    badByReason: {},
    keyframes: 0,
    controlIn: 0,
    controlOut: 0,
    binaryIn: 0,
    binaryOut: 0,
    timeouts: 0,
    rateLimited: 0,
    protocolErrors: 0,
    adminDrops: 0,
    superseded: 0,
    rejectedHello: 0,
    originRejected: 0,
    ipRejected: 0,
  };
  const logRing = [];
  function log(kind, data = {}) {
    const e = { t: now(), kind, ...data };
    logRing.push(e);
    if (logRing.length > 1000) logRing.shift();
    if (opt.log) console.log(`[echoes-net] ${kind} ${JSON.stringify(data)}`);
  }

  // ---------------------------------------------------------- sending --
  function sendRec(rec, text, { unreliable = false } = {}) {
    if (!rec || rec.closedHandled || !rec.conn.open) return false;
    rec.link.down.send(text, { reliable: !unreliable, bytes: text.length, stream: unreliable ? 'hb' : 'ctl' }, (m) => {
      if (rec.closedHandled || !rec.conn.open) return;
      rec.conn.send(m);
      rec.link.outMeter.add(Buffer.byteLength(m));
      counters.controlOut += 1;
    });
    return true;
  }
  function sendControl(peer, t, payload) {
    return sendRec(peer && peer.rec, encodeMessage(t, payload));
  }
  function sendBinary(peer, u8) {
    const rec = peer && peer.rec;
    if (!rec || rec.closedHandled || !rec.conn.open) return false;
    rec.link.down.send(u8, { reliable: !isUnreliableChannel(u8[0]), bytes: u8.length, stream: u8[0] }, (m) => {
      if (rec.closedHandled || !rec.conn.open) return;
      rec.conn.send(m);
      rec.link.outMeter.add(m.length);
      counters.binaryOut += 1;
    });
    return true;
  }

  const lobby = new Lobby({ send: sendControl, now, log, maxRooms: opt.maxRooms });
  const routeCtx = { lobby, sendBinary, now, counters };

  // ------------------------------------------------------ connections --
  function onConnection(conn, ip = null) {
    counters.connections += 1;
    if (ip) {
      perIp.set(ip, (perIp.get(ip) || 0) + 1);
      conn.once('close', () => {
        const n = (perIp.get(ip) || 1) - 1;
        if (n > 0) perIp.set(ip, n);
        else perIp.delete(ip);
      });
    }
    const rec = {
      conn,
      ip,
      peer: null,
      openedAt: now(),
      lastRecvAt: now(),
      closedHandled: false,
      ctrlRate: bucket(CONTROL_RATE, now()),
      binRate: bucket(BINARY_RATE, now()),
      link: null,
    };
    rec.link = createLink({ now, up: defaultCond.up, down: defaultCond.down });
    conns.add(rec);
    conn.on('message', (data, isBinary) => {
      const bytes = isBinary ? data.length : Buffer.byteLength(data);
      rec.link.inMeter.add(bytes);
      const hb = !isBinary && isHeartbeat(data);
      const reliable = isBinary ? !isUnreliableChannel(data[0]) : !hb;
      rec.link.up.send(data, { reliable, bytes, stream: isBinary ? data[0] : hb ? 'hb' : 'ctl' }, (d) => handleIncoming(rec, d, isBinary));
    });
    conn.on('close', (code) => handleClose(rec, `close_${code}`));
    conn.on('protocolError', (e) => {
      counters.protocolErrors += 1;
      log('protocol_error', { peer: rec.peer?.id ?? null, ...e });
    });
  }

  function handleClose(rec, why) {
    if (rec.closedHandled) return;
    rec.closedHandled = true;
    conns.delete(rec);
    rec.link.up.flush();
    rec.link.down.flush();
    const p = rec.peer;
    if (p && p.rec === rec) {
      p.rec = null;
      p.disconnectedAt = now();
      log('disconnect', { peer: p.id, why, room: p.roomCode });
      lobby.peerDropped(p, why);
    }
  }

  function closeRec(rec, code, reason, why = reason) {
    try {
      rec.conn.close(code, reason);
    } catch {
      rec.conn.terminate();
    }
    handleClose(rec, why);
  }

  function handleIncoming(rec, data, isBinary) {
    if (rec.closedHandled) return;
    const t = now();
    rec.lastRecvAt = t;
    if (rec.peer) rec.peer.lastRecvAt = t;
    if (isBinary) {
      counters.binaryIn += 1;
      const r = take(rec.binRate, BINARY_RATE, t);
      if (r === 'kill') return closeRec(rec, CLOSE.POLICY, 'binary flood');
      if (r === 'drop') {
        counters.rateLimited += 1;
        return undefined;
      }
      if (!rec.peer) {
        counters.badFrames += 1;
        return undefined;
      }
      routeBinary(routeCtx, rec.peer, data);
      return undefined;
    }
    counters.controlIn += 1;
    const r = take(rec.ctrlRate, CONTROL_RATE, t);
    if (r === 'kill') return closeRec(rec, CLOSE.POLICY, 'control flood');
    if (r === 'drop') {
      counters.rateLimited += 1;
      sendRec(rec, encodeMessage(MSG.ERROR, { reason: ERR.RATE_LIMITED }));
      return undefined;
    }
    const d = decodeClientMessage(data);
    if (!d.ok) {
      const joinish = d.t === MSG.JOIN_ROOM || d.t === MSG.RECONNECT;
      sendRec(rec, encodeMessage(joinish ? MSG.JOIN_REJECTED : MSG.ERROR, { reason: d.reason, re: d.t ?? null, detail: d.detail }));
      return undefined;
    }
    const m = d.msg;
    if (m.t === MSG.HELLO) return onHello(rec, m);
    const peer = rec.peer;
    if (!peer) {
      sendRec(rec, encodeMessage(MSG.ERROR, { reason: ERR.NO_HELLO, re: m.t }));
      return undefined;
    }
    switch (m.t) {
      case MSG.CREATE_ROOM:
        lobby.createRoom(peer, { visibility: m.visibility, name: m.name, dropIn: m.dropIn !== false });
        break;
      case MSG.JOIN_ROOM:
        lobby.joinRoom(peer, m.code, m.seat ?? null);
        break;
      case MSG.QUICK_MATCH:
        quickMatch(lobby, peer);
        break;
      case MSG.CANCEL_MATCH:
        cancelMatch(lobby, peer);
        break;
      case MSG.LEAVE_ROOM:
        lobby.leaveRoom(peer);
        break;
      case MSG.SELECT_SEAT:
        lobby.selectSeat(peer, m.seat);
        break;
      case MSG.SET_READY:
        lobby.setReady(peer, m.ready);
        break;
      case MSG.START_GAME:
        lobby.startGame(peer, m.seed ?? null);
        break;
      case MSG.RECONNECT:
        if (m.token !== peer.token) {
          sendControl(peer, MSG.JOIN_REJECTED, { reason: REJECT.BAD_REQUEST, re: MSG.RECONNECT, detail: 'token does not match this session' });
          break;
        }
        if (peer.roomCode === m.code) {
          const room = lobby.roomOf(peer);
          const seat = room && lobby.seatOf(room, peer.id);
          if (seat && seat.connected) {
            sendControl(peer, MSG.ROOM_STATE, { room: lobby.view(room) });
            break;
          }
        }
        if (peer.roomCode && peer.roomCode !== m.code) {
          sendControl(peer, MSG.ERROR, { reason: ERR.ALREADY_IN_ROOM, re: MSG.RECONNECT });
          break;
        }
        lobby.reattach(peer, m.code);
        break;
      case MSG.PING: {
        if (Number.isFinite(m.rttMs)) {
          peer.rttMs = m.rttMs;
          const room = lobby.roomOf(peer);
          const seat = room && lobby.seatOf(room, peer.id);
          if (seat) seat.rttMs = Math.round(m.rttMs);
        }
        // Heartbeat reply travels unreliable (a game's latency probe is never
        // retransmitted — RTT samples stay pure).
        sendRec(peer.rec, encodeMessage(MSG.PONG, { ts: m.ts, serverTime: now() }), { unreliable: true });
        break;
      }
      default:
        sendControl(peer, MSG.ERROR, { reason: ERR.BAD_REQUEST, re: m.t });
    }
    return undefined;
  }

  function onHello(rec, m) {
    if (rec.peer) {
      sendRec(rec, encodeMessage(MSG.ERROR, { reason: ERR.BAD_REQUEST, re: MSG.HELLO, detail: 'hello sent twice' }));
      return;
    }
    if (m.v !== PROTOCOL_VERSION) {
      counters.rejectedHello += 1;
      sendRec(rec, encodeMessage(MSG.ERROR, { reason: REJECT.VERSION, re: MSG.HELLO, serverProtocol: PROTOCOL_VERSION, yourProtocol: m.v }));
      setTimeout(() => closeRec(rec, CLOSE.VERSION, 'protocol version mismatch'), 50);
      return;
    }
    let live = 0;
    for (const r of conns) if (r.peer) live += 1;
    if (live >= opt.maxPeers) {
      counters.rejectedHello += 1;
      sendRec(rec, encodeMessage(MSG.ERROR, { reason: REJECT.SERVER_FULL, re: MSG.HELLO }));
      setTimeout(() => closeRec(rec, CLOSE.SERVER_FULL, 'server full'), 50);
      return;
    }
    let peer = m.token ? tokens.get(m.token) : null;
    let resumed = false;
    if (peer) {
      if (peer.blockUntil && peer.blockUntil > now()) {
        // Admin drop window: this identity's link is "down" — no answer at all.
        rec.conn.terminate();
        handleClose(rec, 'blocked');
        return;
      }
      resumed = true;
      counters.resumed += 1;
      if (peer.rec && peer.rec !== rec) {
        const old = peer.rec;
        counters.superseded += 1;
        old.closedHandled = true;
        conns.delete(old);
        old.link.up.flush();
        old.link.down.flush();
        try {
          old.conn.close(CLOSE.SUPERSEDED, 'superseded by a new connection');
        } catch {
          old.conn.terminate();
        }
      }
    } else {
      const id = `p${randomBytes(4).toString('hex')}`;
      const token = randomBytes(16).toString('hex');
      peer = { id, token, rttMs: null, roomCode: null, seat: null, cond: null, blockUntil: 0, createdAt: now() };
      peers.set(id, peer);
      tokens.set(token, peer);
    }
    counters.hellos += 1;
    peer.name = sanitizeName(m.name);
    peer.build = String(m.build);
    peer.protocol = m.v;
    peer.rec = rec;
    peer.lastRecvAt = now();
    peer.disconnectedAt = null;
    rec.peer = peer;
    if (peer.cond) {
      if (peer.cond.up) rec.link.up.set(peer.cond.up);
      if (peer.cond.down) rec.link.down.set(peer.cond.down);
    }
    log('hello', { peer: peer.id, name: peer.name, build: peer.build, resumed });
    sendControl(peer, MSG.WELCOME, {
      peerId: peer.id,
      token: peer.token,
      serverTime: now(),
      protocol: PROTOCOL_VERSION,
      name: peer.name,
      resumed,
      room: peer.roomCode,
      seat: peer.seat,
      lanUrls: lanUrls(opt.host, boundPort),
      // DEPLOY: the build this server deploys (null when it serves no game)
      // — a page older than it offers "A new version … — Reload".
      latestBuild: servedBuild() ? servedBuild().version : null,
      latestEntry: servedBuild() ? servedBuild().entry : null,
      siteUrls: siteUrls(opt.host, boundPort, !!serveStatic),
      conditioner: { up: rec.link.up.stats().spec, down: rec.link.down.stats().spec },
    });
  }

  // ------------------------------------------------------------ sweep --
  let lastRttPush = 0;
  const rttPushed = new Map(); // code -> { sig, at }
  // A room in play refreshes its roster pings every 10 s at most (a lobby
  // every 2 s): each push is the whole room_state (~0.9 KB) to every seat, and
  // under N1 jitter the 15 ms buckets change on almost every check — 0.4 KB/s
  // of a guest's §3.7 downstream budget for a number the in-game chip reads
  // from its own pong (fix-M5a-r4, NET4-F3).
  const RTT_PUSH_IN_GAME_MS = 10000;
  function sweep() {
    const t = now();
    lobby.sweep();
    for (const rec of [...conns]) {
      if (rec.closedHandled) continue;
      if (!rec.peer) {
        if (t - rec.openedAt > HELLO_TIMEOUT_MS) closeRec(rec, CLOSE.NO_HELLO, 'no hello', 'no_hello');
        continue;
      }
      const room = lobby.roomOf(rec.peer);
      const hostInGame = room && room.hostPeerId === rec.peer.id && room.state === 'in_game';
      const limit = hostInGame ? HOST_TIMEOUT_MS : PEER_TIMEOUT_MS;
      if (t - rec.lastRecvAt > limit) {
        counters.timeouts += 1;
        log('timeout', { peer: rec.peer.id, silentMs: t - rec.lastRecvAt, limit });
        closeRec(rec, CLOSE.TIMEOUT, 'timeout', 'timeout');
      }
    }
    for (const p of [...peers.values()]) {
      if (!p.rec && !p.roomCode && p.disconnectedAt && t - p.disconnectedAt > IDENTITY_TTL_MS) {
        peers.delete(p.id);
        tokens.delete(p.token);
      }
    }
    if (t - lastRttPush > 2000) {
      lastRttPush = t;
      for (const room of lobby.rooms.values()) {
        const sig = room.seats.map((s) => (s.rttMs === null ? '-' : Math.round(s.rttMs / 15))).join(',');
        const last = rttPushed.get(room.code);
        if (last && last.sig === sig) continue;
        if (last && room.state === 'in_game' && t - last.at < RTT_PUSH_IN_GAME_MS) continue;
        rttPushed.set(room.code, { sig, at: t });
        lobby.pushState(room);
      }
    }
  }

  // ------------------------------------------------------------ admin --
  function specOrKeep(spec) {
    if (spec === undefined) return undefined;
    return parseCond(spec === null ? 'off' : spec);
  }
  function applyCond(peer, up, down) {
    peer.cond = { up: up !== undefined ? up : peer.cond?.up ?? null, down: down !== undefined ? down : peer.cond?.down ?? null };
    if (peer.rec) {
      if (up !== undefined) peer.rec.link.up.set(up);
      if (down !== undefined) peer.rec.link.down.set(down);
    }
  }
  function setConditioner(target = 'all', upSpec, downSpec) {
    let up;
    let down;
    try {
      up = specOrKeep(upSpec);
      down = specOrKeep(downSpec);
    } catch (err) {
      return { ok: false, error: String(err.message) };
    }
    const applied = [];
    if (target === 'all') {
      if (up !== undefined) defaultCond.up = up;
      if (down !== undefined) defaultCond.down = down;
      for (const p of peers.values()) {
        p.cond = null;
        if (p.rec) {
          p.rec.link.up.set(defaultCond.up);
          p.rec.link.down.set(defaultCond.down);
          applied.push(p.id);
        }
      }
      for (const rec of conns) {
        if (!rec.peer) {
          rec.link.up.set(defaultCond.up);
          rec.link.down.set(defaultCond.down);
        }
      }
    } else if (peers.has(target)) {
      applyCond(peers.get(target), up, down);
      applied.push(target);
    } else if (lobby.rooms.has(target)) {
      const room = lobby.rooms.get(target);
      for (const s of room.seats) {
        const p = s.peerId ? room.peerRef.get(s.peerId) : null;
        if (p) {
          applyCond(p, up, down);
          applied.push(p.id);
        }
      }
    } else return { ok: false, error: 'unknown_target', target };
    log('conditioner', { target, up: up ? formatCond(up) : 'unchanged', down: down ? formatCond(down) : 'unchanged', applied: applied.length });
    return { ok: true, target, applied, up: up ? formatCond(up) : null, down: down ? formatCond(down) : null };
  }

  function dropPeer(peerId, mode = 'close', forMs = 0) {
    const p = peers.get(peerId);
    if (!p || !p.rec) return { ok: false, error: 'not_connected', peerId };
    counters.adminDrops += 1;
    const ms = Math.max(0, Number(forMs) || 0);
    if (mode === 'blackhole') {
      p.rec.link.up.blackhole(ms);
      p.rec.link.down.blackhole(ms);
    } else if (mode === 'close') {
      p.blockUntil = now() + ms;
      closeRec(p.rec, CLOSE.ADMIN_DROP, 'admin drop', 'admin_drop');
    } else return { ok: false, error: 'bad_mode', mode };
    log('admin_drop', { peer: peerId, mode, forMs: ms });
    return { ok: true, peerId, mode, forMs: ms };
  }

  function killHost(code) {
    const r = lobby.evictHost(code);
    if (!r) return { ok: false, error: 'not_found', code };
    const host = r.host;
    if (host && host.rec) closeRec(host.rec, CLOSE.KILLED_HOST, 'host killed (admin)', 'killed');
    log('kill_host', { code, host: host?.id ?? null });
    return { ok: true, code, hostPeerId: host?.id ?? null, graceMs: r.room.state === 'migrating' ? r.room.migrateAt - now() : null };
  }

  function health() {
    let live = 0;
    for (const r of conns) if (r.peer) live += 1;
    return {
      ok: true,
      name: 'echoes-net',
      protocol: PROTOCOL_VERSION,
      path: WS_PATH,
      transport: 'websocket',
      rooms: lobby.rooms.size,
      peers: live,
      connections: conns.size,
      uptimeMs: now() - startedAt,
      lanUrls: lanUrls(opt.host, boundPort),
      admin: !!opt.admin,
      conditioner: { up: formatCond(defaultCond.up), down: formatCond(defaultCond.down) },
      // DEPLOY
      build: servedBuild(),
      static: !!serveStatic,
      siteUrls: siteUrls(opt.host, boundPort, !!serveStatic),
      origins: opt.origins && opt.origins.length ? opt.origins : ['*'],
      maxPerIp: opt.maxPerIp || 0,
    };
  }

  function stats() {
    const peerList = [];
    let drops = 0;
    let reorders = 0;
    let dups = 0;
    for (const p of peers.values()) {
      const rec = p.rec;
      const ls = rec ? linkStats(rec.link) : null;
      if (ls) {
        drops += ls.up.lost + ls.up.outageDrops + ls.up.bwDrops + ls.down.lost + ls.down.outageDrops + ls.down.bwDrops;
        reorders += ls.up.reordered + ls.down.reordered;
        dups += ls.up.dupes + ls.down.dupes;
      }
      const room = p.roomCode ? lobby.rooms.get(p.roomCode) : null;
      peerList.push({
        peerId: p.id,
        name: p.name,
        build: p.build,
        room: p.roomCode,
        seat: p.seat,
        role: room ? (room.hostPeerId === p.id ? 'host' : 'guest') : 'none',
        connected: !!rec,
        rttMs: p.rttMs,
        lastRecvAgoMs: rec ? now() - rec.lastRecvAt : null,
        link: ls,
      });
    }
    return {
      ok: true,
      at: now(),
      uptimeMs: now() - startedAt,
      protocol: PROTOCOL_VERSION,
      ...lobby.stats(),
      peers: peerList,
      connections: conns.size,
      totals: { drops, reorders, dups, relayed: counters.relayed, badFrames: counters.badFrames },
      counters,
      conditionerDefault: { up: formatCond(defaultCond.up), down: formatCond(defaultCond.down) },
      log: logRing.slice(-100),
    };
  }

  // ----------------------------------------------------------- listen --
  const http = createServer();
  const server = { opt, lobby, peers, conns, counters, health, stats, setConditioner, dropPeer, killHost, log: logRing, serveStatic, servedBuild };
  const handler = createHttpHandler(server);
  http.on('request', (req, res) => {
    handler(req, res).catch(() => {
      try {
        res.writeHead(500);
        res.end();
      } catch {
        /* ignore */
      }
    });
  });
  http.on('upgrade', (req, socket, head) => {
    socket.on('error', () => socket.destroy());
    // DEPLOY hardening, before the handshake: the Origin allow-list and the
    // per-IP cap (only for the game path — anything else 404s below).
    let pathname = '/';
    try {
      pathname = new URL(req.url, 'http://x').pathname;
    } catch {
      /* acceptUpgrade answers 404 */
    }
    const { ip } = clientIp(req);
    if (pathname === WS_PATH) {
      if (!originAllowed(req, opt.origins)) {
        counters.originRejected += 1;
        log('origin_rejected', { origin: String(req.headers.origin || ''), ip });
        return refuseUpgrade(socket, 403, 'Forbidden', 'This site may not connect to this Echoes server.');
      }
      if (opt.maxPerIp > 0 && !isLoopbackIp(ip) && (perIp.get(ip) || 0) >= opt.maxPerIp) {
        counters.ipRejected += 1;
        log('ip_cap', { ip, live: perIp.get(ip) || 0, cap: opt.maxPerIp });
        return refuseUpgrade(socket, 429, 'Too Many Requests', 'Too many connections from your address.', 'Retry-After: 10\r\n');
      }
    }
    const conn = acceptUpgrade(req, socket, head, { path: WS_PATH, maxPayload: 1 << 20 });
    if (conn) onConnection(conn, ip || null);
  });
  function refuseUpgrade(socket, status, statusText, body, extra = '') {
    try {
      socket.end(`HTTP/1.1 ${status} ${statusText}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\n${extra}Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    } catch {
      socket.destroy();
    }
  }
  http.on('clientError', (err, socket) => {
    try {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } catch {
      socket.destroy();
    }
  });
  let boundPort = opt.port;
  let sweepTimer = null;
  server.listen = () =>
    new Promise((resolve, reject) => {
      http.once('error', reject);
      http.listen(opt.port, opt.host, () => {
        http.off('error', reject);
        boundPort = http.address().port;
        sweepTimer = setInterval(sweep, 100);
        const local = `ws://${opt.host === '0.0.0.0' || opt.host === '::' ? '127.0.0.1' : opt.host}:${boundPort}${WS_PATH}`;
        const localHttp = `http://${opt.host === '0.0.0.0' || opt.host === '::' ? '127.0.0.1' : opt.host}:${boundPort}`;
        if (serveStatic) serveStatic.warm().then((w) => log('static_warm', w)).catch(() => {});
        resolve({ port: boundPort, host: opt.host, url: local, lanUrls: lanUrls(opt.host, boundPort), health: `${localHttp}/health`, site: serveStatic ? `${localHttp}/` : null, siteUrls: siteUrls(opt.host, boundPort, !!serveStatic), build: servedBuild() });
      });
    });
  server.close = () =>
    new Promise((resolve) => {
      if (sweepTimer) clearInterval(sweepTimer);
      for (const rec of [...conns]) {
        try {
          rec.conn.close(CLOSE.SHUTDOWN, 'server shutting down');
        } catch {
          /* ignore */
        }
      }
      const done = setTimeout(() => {
        for (const rec of [...conns]) rec.conn.terminate();
        resolve();
      }, 1200);
      http.close(() => {
        clearTimeout(done);
        resolve();
      });
      setTimeout(() => {
        for (const rec of [...conns]) rec.conn.terminate();
      }, 300).unref?.();
    });
  Object.defineProperty(server, 'port', { get: () => boundPort });
  return server;
}
