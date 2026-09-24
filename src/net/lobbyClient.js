// Network client: connection, lobby, matchmaking, reconnect, and the W3
// replication probe stream (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// ISOMORPHIC — the browser `net` service (provide('net', …) in main.js) and
// the Node bots of tools/gnt-M5a-netbench.mjs run this same module.
//
//   const net = createNetClient({ params, version, storage, clock, capture, bus });
//   await net.connect();            // hello -> welcome (3 s timeout)
//   await net.host({ visibility: 'public' }) | net.join('ABCDE') | net.quickMatch()
//   await net.setReady(true); await net.start();
//   net.on('state' | 'room' | 'snapshot' | 'events' | 'session_lost' | …, fn)
//
// State (net.state, PLAN §1.2): offline | connecting | lobby | host | guest |
// reconnecting | migrating. `lobby` = connected, in no room or in a room that
// has not started; host / guest = in a running room; migrating = the room's
// host is lost (grace window / migration).
//
// Reconnect: an unexpected close or 5 s of silence (3 s for an in-game host)
// while seated -> `reconnecting`, retries with backoff 0.25/0.5/1/2/4/5 s using
// the session token (hello { token } then reconnect { token, code }) until
// the 60 s seat hold runs out -> `session_lost`. The session is stored in
// localStorage `echoes.net.session` so a page reload within 60 s can offer
// "Rejoin ABCDE?" (rejoinInfo()).
//
// Session driver seam (M5b, W4): setSessionDriver(driver) hands every binary
// frame and room transition to the real host/guest driver. Until one is
// registered, a room that goes in_game runs the PROBE STREAM — the host
// captures its real state tree at every 3rd tick end (clock.onTickEnd, PLAN
// §3.4 rule 6), streams baseline/ack delta snapshots + event batches to each
// guest and keyframes to the server; guests decode, verify the quantised-tree
// hash, ack in 60 Hz input packets. It replicates nothing into the guest's
// world (that is M5b's replica) — it is the transport-level measurement the
// netbench reports (bytes/s, loss, delta ratio, desyncs).
import {
  DEFAULT_URL,
  MSG,
  BIN,
  PROTOCOL_VERSION,
  PING_INTERVAL_MS,
  PEER_TIMEOUT_MS,
  HOST_TIMEOUT_MS,
  SEAT_HOLD_MS,
  RECONNECT_BACKOFF_MS,
  SNAPSHOT_EVERY_TICKS,
  KEYFRAME_EVERY_TICKS,
  SIM_HZ,
} from './protocol/constants.js';
import { createTransport, RateMeter, SeqLossMeter, createQualityTracker } from './transport.js';
import { normalizeCode, sanitizeName, reasonText } from './protocol/messages.js';
import { createSnapshotHost, createSnapshotClient, pct, readSnapHeader } from './protocol/snapshot.js';
import { encodeInputPacket, decodeInputPacket, encodeKeyframe, encodeEvents, decodeEvents, decodeCmd, encodeCmd, SEAT_ALL, channelOf } from './protocol/codec.js';

export const SESSION_KEY = 'echoes.net.session';
export const IDENTITY_KEY = 'echoes.net.identity';
export const REJOIN_WINDOW_MS = 60000;
// Close codes that end the session instead of retrying: protocol mismatch,
// server full, superseded (the same session continued in another window —
// retrying would ping-pong the two), removed by the server, server shutdown.
const NO_RECONNECT_CODES = new Set([4001, 4002, 4003, 4006, 4007]);
const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// validateServerUrl(u, { https }) -> { ok, url } | { ok:false, reason }
export function validateServerUrl(u, { https = false } = {}) {
  if (typeof u !== 'string' || !u.trim()) return { ok: false, reason: 'empty' };
  let parsed;
  try {
    parsed = new URL(u.trim());
  } catch {
    return { ok: false, reason: 'not_a_url' };
  }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return { ok: false, reason: 'not_ws' };
  if (https && parsed.protocol === 'ws:') return { ok: false, reason: 'insecure_on_https' };
  return { ok: true, url: parsed.href.replace(/\/$/, parsed.pathname === '/' ? '' : '/') };
}

export function createNetClient(opts = {}) {
  const {
    params = {},
    version = '0',
    storage = null,
    clock = null,
    capture = null,
    captureIsPrivate = false,
    bus = null,
    WebSocketImpl = null,
    now = defaultNow,
    wallNow = () => Date.now(),
    settings = null,
    probeStream = true,
    autoStart = true,
  } = opts;
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  const listeners = new Map();
  const logRing = [];
  let state = 'offline';
  let serverState = 'unknown';
  let peerId = null;
  let token = null;
  let lanUrls = [];
  let room = null;
  let seat = null;
  let role = 'none';
  let intentional = false;
  let reconnect = null;
  let pingTimer = null;
  let watchdog = null;
  let driver = null;
  let closingOnPurpose = false; // a close WE started (drop test, silence, leave)
  let rejoinToken = null; // set only by rejoin() for its one connect()
  let name = sanitizeName(params.netName || readJSON(IDENTITY_KEY)?.name || 'Player');
  const rtt = { samples: [], srtt: null, jitter: 0, last: null, offsetMs: null };
  const counters = { reconnects: 0, lastReconnectMs: null, drops: 0, sessionLost: 0, rejects: {}, migrations: 0 };
  const statExtensions = [];
  let snapEvery = params.netRate ? Math.max(1, Math.round(SIM_HZ / Math.max(10, Math.min(60, params.netRate)))) : SNAPSHOT_EVERY_TICKS;

  const transport = createTransport({ WebSocketImpl, cond: params.netCond || null, now });
  let url = resolveUrl();

  // Link quality (NET-F2): what this client KNOWS about its packet loss, for
  // stats() and the in-game chip. A guest measures DOWNSTREAM loss from gaps
  // in the snapshot seq of every SNAP frame that reaches it (whoever decodes
  // it — the session driver or the probe stream), and learns its UPSTREAM
  // loss from the host, which echoes its measured loss of this guest's input
  // packets in each snapshot header (snapshot.js flags bits 0-6). A host's
  // incoming (input) loss comes from its session driver's stats.
  const downLoss = new SeqLossMeter({ windowMs: 5000, now });
  const upLoss = { pct: null, at: 0 };
  const quality = createQualityTracker({ now });
  const UPLOSS_STALE_MS = 3000;
  function noteSnapHeader(u8) {
    let h;
    try {
      h = readSnapHeader(u8);
    } catch {
      return; // a corrupt frame is the decoder's to count
    }
    downLoss.add(h.seq);
    if (h.upLossPct !== null) {
      upLoss.pct = h.upLossPct;
      upLoss.at = now();
    }
  }
  function resetLinkMeters() {
    downLoss.reset();
    upLoss.pct = null;
    upLoss.at = 0;
    quality.reset();
  }
  function lossIn() {
    return downLoss.pct();
  }
  function lossOut() {
    return upLoss.pct !== null && now() - upLoss.at < UPLOSS_STALE_MS ? upLoss.pct : null;
  }

  // ------------------------------------------------------------ plumbing --
  function log(kind, data = {}) {
    logRing.push({ t: Math.round(now()), kind, ...data });
    if (logRing.length > 400) logRing.shift();
  }
  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        if (typeof console !== 'undefined') console.warn(`[net] '${type}' listener threw`, err);
      }
    }
  }
  function on(type, fn) {
    let set = listeners.get(type);
    if (!set) listeners.set(type, (set = new Set()));
    set.add(fn);
    return () => set.delete(fn);
  }
  function readJSON(key) {
    try {
      const s = storage && storage.getItem(key);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }
  function writeJSON(key, v) {
    try {
      if (!storage) return;
      if (v === null) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage unavailable (private mode / quota) — sessions just do not survive a reload */
    }
  }
  function resolveUrl() {
    const cand = [params.net, opts.serverUrl, settings && typeof settings.get === 'function' ? safeGet('net.serverUrl') : null, DEFAULT_URL];
    for (const c of cand) {
      if (!c) continue;
      const v = validateServerUrl(String(c));
      if (v.ok) return v.url;
    }
    return DEFAULT_URL;
  }
  function safeGet(k) {
    try {
      return settings.get(k);
    } catch {
      return null;
    }
  }

  // Pending request waiters: resolved by the first incoming control message
  // their matcher accepts (returns a non-undefined value).
  const waiters = new Set();
  function waitFor(match, timeoutMs, onTimeout = { ok: false, reason: 'timeout' }) {
    return new Promise((resolve) => {
      const w = { match, resolve, timer: null };
      w.timer = setTimeout(() => {
        waiters.delete(w);
        resolve(onTimeout);
      }, timeoutMs);
      waiters.add(w);
    });
  }
  function settleWaiters(m) {
    for (const w of [...waiters]) {
      let r;
      try {
        r = w.match(m);
      } catch {
        r = undefined;
      }
      if (r !== undefined) {
        clearTimeout(w.timer);
        waiters.delete(w);
        w.resolve(r);
      }
    }
  }
  function failWaiters(reason) {
    for (const w of [...waiters]) {
      clearTimeout(w.timer);
      waiters.delete(w);
      w.resolve({ ok: false, reason });
    }
  }
  const rejected = (m, re) => (m.t === MSG.JOIN_REJECTED || m.t === MSG.ERROR) && m.re === re ? { ok: false, reason: m.reason, text: reasonText(m.reason), detail: m.detail ?? null } : undefined;

  // --------------------------------------------------------------- state --
  function mySeat() {
    return room ? room.seats.find((s) => s.peerId === peerId) || null : null;
  }
  function recompute() {
    let next;
    if (reconnect) next = 'reconnecting';
    else if (transport.state !== 'open' || !peerId) next = transport.state === 'connecting' ? 'connecting' : 'offline';
    else if (room && room.state === 'migrating') next = 'migrating';
    else if (room && room.state === 'in_game') next = role === 'host' ? 'host' : role === 'guest' ? 'guest' : 'lobby';
    else next = 'lobby';
    if (next !== state) {
      const prev = state;
      state = next;
      // Outside a running session the link figures describe nothing.
      if (next === 'offline' || next === 'lobby' || next === 'connecting') resetLinkMeters();
      log('state', { from: prev, to: next });
      emit('state', { state: next, prev });
    }
    syncStreams();
  }
  function applyRoom(r) {
    room = r;
    const s = mySeat();
    seat = s ? s.index : null;
    role = !room || !s ? 'none' : room.hostPeerId === peerId ? 'host' : 'guest';
    if (room && s) saveSession();
    emit('room', room);
    recompute();
  }
  function saveSession() {
    if (!room || !token) return;
    writeJSON(SESSION_KEY, { url, token, code: room.code, seat, role, savedAt: wallNow() });
  }
  function clearSession() {
    writeJSON(SESSION_KEY, null);
  }

  // --------------------------------------------------------- connection --
  async function openAndHello(target, { resumeToken = null, timeoutMs = 3000 } = {}) {
    await transport.open(target, { timeoutMs });
    transport.sendControl({ t: MSG.HELLO, v: PROTOCOL_VERSION, build: String(version), name, token: resumeToken || undefined });
    const w = await waitFor((m) => (m.t === MSG.WELCOME ? { ok: true, m } : rejected(m, MSG.HELLO)), timeoutMs, { ok: false, reason: 'timeout' });
    if (!w.ok) {
      transport.close(1000, 'hello failed');
      throw Object.assign(new Error(w.reason), { reason: w.reason });
    }
    return w.m;
  }

  function onWelcome(m) {
    peerId = m.peerId;
    token = m.token;
    lanUrls = Array.isArray(m.lanUrls) ? m.lanUrls : [];
    serverState = 'online';
    startTimers();
  }

  async function connect(target = null) {
    if (target) {
      const v = validateServerUrl(target, { https: isHttps });
      if (!v.ok) return { ok: false, error: v.reason };
      url = v.url;
    }
    if (transport.state === 'open' && peerId) return { ok: true, peerId, url, resumed: false };
    if (isHttps && url.startsWith('ws:')) return { ok: false, error: 'insecure_on_https' };
    intentional = false;
    state = 'connecting';
    emit('state', { state, prev: 'offline' });
    // A plain connect never borrows the STORED session token: several tabs of
    // one browser share localStorage, and a second tab resuming the first
    // tab's identity would steal its seat. Only an explicit rejoin() (the
    // title's "Rejoin ABCDE?") resumes a stored session.
    const resumeToken = rejoinToken || token;
    rejoinToken = null;
    try {
      const w = await openAndHello(url, { resumeToken });
      onWelcome(w);
      log('connected', { url, peerId, resumed: !!w.resumed, room: w.room });
      recompute();
      if (w.room) emit('rejoin_available', { code: w.room, seat: w.seat });
      return { ok: true, peerId, url, resumed: !!w.resumed, room: w.room ?? null, lanUrls };
    } catch (err) {
      serverState = 'unreachable';
      state = 'offline';
      emit('state', { state, prev: 'connecting' });
      log('connect_failed', { url, error: String(err.reason || err.message) });
      return { ok: false, error: String(err.reason || err.message), url };
    }
  }

  // probe(url?) -> { state: 'online'|'unreachable', ms, url, lanUrls, error }
  // A throwaway socket (hello -> welcome, 3 s timeout, one retry after 0.5 s):
  // the mp-menu's server check (PLAN "No server / unreachable / LAN").
  async function probe(target = null) {
    const t0 = now();
    const u = target ? validateServerUrl(target, { https: isHttps }) : { ok: true, url };
    if (!u.ok) return { state: 'unreachable', ms: 0, url: target, error: u.reason };
    serverState = 'checking';
    emit('server', { state: serverState, url: u.url });
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 500));
      const t = createTransport({ WebSocketImpl, now });
      try {
        await t.open(u.url, { timeoutMs: 3000 });
        const wm = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 3000);
          t.on('control', (m) => {
            if (m.t === MSG.WELCOME || m.t === MSG.ERROR) {
              clearTimeout(timer);
              resolve(m);
            }
          });
          t.sendControl({ t: MSG.HELLO, v: PROTOCOL_VERSION, build: String(version), name: `${name} (probe)` });
        });
        t.close(1000, 'probe done');
        if (wm && wm.t === MSG.WELCOME) {
          serverState = 'online';
          lanUrls = wm.lanUrls || [];
          const res = { state: 'online', ms: Math.round(now() - t0), url: u.url, lanUrls, attempts: attempt + 1 };
          emit('server', res);
          return res;
        }
        lastErr = wm ? wm.reason : 'timeout';
      } catch (err) {
        lastErr = String(err.message || err);
        t.close();
      }
    }
    serverState = 'unreachable';
    const res = { state: 'unreachable', ms: Math.round(now() - t0), url: u.url, error: lastErr, attempts: 2 };
    emit('server', res);
    return res;
  }

  async function ensureConnected() {
    if (transport.state === 'open' && peerId) return { ok: true };
    return connect();
  }

  function startTimers() {
    stopTimers();
    pingTimer = setInterval(sendPing, PING_INTERVAL_MS);
    watchdog = setInterval(checkSilence, 250);
    sendPing();
  }
  function stopTimers() {
    if (pingTimer) clearInterval(pingTimer);
    if (watchdog) clearInterval(watchdog);
    pingTimer = null;
    watchdog = null;
  }
  let lastSessionSave = 0;
  function sendPing() {
    if (transport.state !== 'open') return;
    // Unreliable heartbeat: a lost ping/pong yields no sample (never a
    // retransmit-inflated one); silence detection still sees every frame.
    transport.sendControl({ t: MSG.PING, ts: now(), rttMs: rtt.samples.length ? Math.round(median(rtt.samples.slice(-5)) * 10) / 10 : undefined }, { unreliable: true });
    if (room && wallNow() - lastSessionSave > 5000) {
      lastSessionSave = wallNow();
      saveSession();
    }
  }
  function onPong(m) {
    if (!Number.isFinite(m.ts)) return;
    const sample = now() - m.ts;
    if (sample < 0 || sample > 60000) return;
    if (rtt.last !== null) rtt.jitter += (Math.abs(sample - rtt.last) - rtt.jitter) / 16; // RFC 3550
    rtt.last = sample;
    rtt.srtt = rtt.srtt === null ? sample : rtt.srtt * 0.875 + sample * 0.125; // RFC 6298
    rtt.samples.push(sample);
    if (rtt.samples.length > 120) rtt.samples.shift();
    if (Number.isFinite(m.serverTime)) rtt.offsetMs = m.serverTime - (wallNow() - sample / 2);
  }
  function checkSilence() {
    if (transport.state !== 'open') return;
    const limit = role === 'host' && room && room.state === 'in_game' ? HOST_TIMEOUT_MS : PEER_TIMEOUT_MS;
    const silent = now() - transport.lastRecvAt;
    if (silent > limit) {
      log('silence', { silentMs: Math.round(silent), limit });
      linkLost(4000, 'silence');
    }
  }

  // The socket died under us (close event, silence, forced drop test).
  function linkLost(code, reason, { suppressMs = 0 } = {}) {
    stopTimers();
    failWaiters('disconnected');
    if (reconnect) {
      // A reconnect attempt's socket died (link still down): the attempt loop
      // owns the retry — never restart it (that would reset the drop clock).
      log('reconnect_attempt_failed', { code, reason });
      return;
    }
    const wasRoom = room ? room.code : null;
    if (transport.state === 'open' || transport.state === 'connecting') {
      closingOnPurpose = true;
      transport.close(code, reason);
      closingOnPurpose = false;
    }
    counters.drops += 1;
    log('link_lost', { code, reason, room: wasRoom });
    if (intentional) {
      recompute();
      return;
    }
    if (wasRoom && !NO_RECONNECT_CODES.has(code)) startReconnect(wasRoom, suppressMs);
    else if (wasRoom) sessionLost(code === 4007 ? 'server_shutdown' : code === 4006 ? 'removed_by_server' : code === 4003 ? 'superseded' : 'refused', code);
    else {
      serverState = 'unreachable';
      recompute();
      emit('disconnected', { code, reason });
    }
  }
  transport.on('close', (e) => {
    if (closingOnPurpose || e.local) return;
    linkLost(e.code, e.reason || 'closed');
  });
  transport.on('control', onControl);
  transport.on('binary', onBinary);

  function startReconnect(code, suppressMs = 0) {
    const inGame = !!room && (room.state === 'in_game' || room.state === 'migrating' || room.state === 'starting');
    reconnect = { code, startedAt: now(), attempt: 0, timer: null, suppressUntil: now() + suppressMs, inGame };
    recompute();
    emit('reconnecting', { code, holdMs: SEAT_HOLD_MS });
    scheduleAttempt();
  }
  function scheduleAttempt() {
    if (!reconnect) return;
    const i = Math.min(reconnect.attempt, RECONNECT_BACKOFF_MS.length - 1);
    const wait = Math.max(RECONNECT_BACKOFF_MS[i], reconnect.suppressUntil - now());
    reconnect.timer = setTimeout(attemptReconnect, wait);
  }
  async function attemptReconnect() {
    const rc = reconnect;
    if (!rc || rc !== reconnect) return;
    if (now() - rc.startedAt > SEAT_HOLD_MS) return sessionLost('seat_expired');
    rc.attempt += 1;
    log('reconnect_attempt', { attempt: rc.attempt, code: rc.code });
    try {
      const w = await openAndHello(url, { resumeToken: token, timeoutMs: 3000 });
      if (rc !== reconnect) return undefined;
      if (!w.resumed) {
        // The server no longer knows this session (it restarted).
        transport.close(1000, 'stale session');
        return sessionLost('server_restarted');
      }
      onWelcome(w);
      transport.sendControl({ t: MSG.RECONNECT, token, code: rc.code });
      const r = await waitFor(
        (m) => (m.t === MSG.ROOM_STATE && m.room.seats.some((s) => s.peerId === peerId && s.connected) ? { ok: true, m } : rejected(m, MSG.RECONNECT)),
        4000
      );
      if (rc !== reconnect) return undefined;
      if (!r.ok) {
        transport.close(1000, 'rejoin refused');
        return sessionLost(r.reason === 'timeout' ? 'timeout' : r.detail || r.reason);
      }
      reconnect = null;
      counters.reconnects += 1;
      counters.lastReconnectMs = Math.round(now() - rc.startedAt);
      log('reconnected', { ms: counters.lastReconnectMs, attempts: rc.attempt });
      applyRoom(r.m.room);
      resetStreamsAfterReconnect();
      emit('reconnected', { ms: counters.lastReconnectMs, attempts: rc.attempt, code: rc.code });
    } catch {
      if (rc !== reconnect) return undefined;
      if (now() - rc.startedAt > SEAT_HOLD_MS) return sessionLost('server_unreachable');
      scheduleAttempt();
    }
    return undefined;
  }
  function sessionLost(reason, code = null) {
    if (reconnect && reconnect.timer) clearTimeout(reconnect.timer);
    reconnect = null;
    const code0 = room ? room.code : null;
    room = null;
    seat = null;
    role = 'none';
    counters.sessionLost += 1;
    clearSession();
    stopStreams();
    log('session_lost', { reason, code });
    recompute();
    emit('session_lost', { reason, code: code0, text: sessionLostText(reason) });
  }
  function sessionLostText(reason) {
    switch (reason) {
      case 'server_shutdown':
      case 'server_unreachable':
      case 'server_restarted':
        return 'Connection to the server was lost.';
      case 'seat_expired':
        return 'Your seat was released — the session moved on without you.';
      case 'removed_by_server':
        return 'The server closed this session.';
      case 'superseded':
        return 'This session continued in another window.';
      default:
        return 'The session ended.';
    }
  }

  // ---------------------------------------------------------- incoming --
  function onControl(m) {
    settleWaiters(m);
    switch (m.t) {
      case MSG.WELCOME:
        break;
      case MSG.ROOM_STATE:
        if (m.room) {
          const was = room;
          applyRoom(m.room);
          if (was && was.hostPeerId !== m.room.hostPeerId) onHostChanged(m.room.hostPeerId);
        }
        break;
      case MSG.PONG:
        onPong(m);
        break;
      case MSG.PEER_JOINED:
      case MSG.PEER_RESTORED:
        log(m.t, { peer: m.peerId, seat: m.seat });
        if (hostStream) hostStream.resetSeat(m.seat);
        emit(m.t, m);
        break;
      case MSG.PEER_LEFT:
      case MSG.PEER_DROPPED:
        log(m.t, { peer: m.peerId, seat: m.seat });
        if (hostStream) hostStream.resetSeat(m.seat);
        emit(m.t, m);
        break;
      case MSG.HOST_LOST:
        log('host_lost', { graceMs: m.graceMs });
        emit('host_lost', m);
        break;
      case MSG.HOST_CHANGED:
        log('host_changed', { host: m.hostPeerId, reason: m.reason });
        emit('host_changed', m);
        break;
      case MSG.BECOME_HOST:
        counters.migrations += 1;
        log('become_host', { keyframeTick: m.keyframe ? m.keyframe.tick : null, stateAgeMs: m.keyframe ? m.keyframe.stateAgeMs : null });
        emit('become_host', m);
        break;
      case MSG.GAME_STARTING:
      case MSG.MATCH_STATUS:
      case MSG.MATCH_FOUND:
        emit(m.t, m);
        break;
      case MSG.JOIN_REJECTED:
        counters.rejects[m.reason] = (counters.rejects[m.reason] || 0) + 1;
        log('join_rejected', { reason: m.reason, re: m.re });
        emit('join_rejected', { ...m, text: reasonText(m.reason) });
        break;
      case MSG.ERROR:
        if (m.reason === 'room_closed') {
          log('room_closed', { detail: m.detail });
          const code = room ? room.code : m.code;
          room = null;
          seat = null;
          role = 'none';
          clearSession();
          recompute();
          emit('room_closed', { code, detail: m.detail });
        } else emit('server_error', { ...m, text: reasonText(m.reason) });
        break;
      default:
        emit('control', m);
    }
    if (driver && typeof driver.onControl === 'function') driver.onControl(m);
  }
  function onHostChanged(hostId) {
    // A new authority: sequence spaces restart.
    if (guestStream) guestStream.reset();
    resetLinkMeters();
    if (hostId === peerId) log('now_host', {});
  }

  function onBinary(u8) {
    if (u8.length > 2 && u8[0] === BIN.SNAP) noteSnapHeader(u8);
    if (driver && typeof driver.onBinary === 'function') {
      driver.onBinary(u8);
      return;
    }
    const ch = channelOf(u8);
    if (hostStream && (ch === BIN.INPUT || ch === BIN.CMD)) hostStream.onBinary(u8);
    else if (guestStream && (ch === BIN.SNAP || ch === BIN.EVENTS)) guestStream.onBinary(u8);
    emit('binary', u8);
  }

  // ------------------------------------------------------------ actions --
  async function host({ visibility = 'private', roomName = null, dropIn = true } = {}) {
    const c = await ensureConnected();
    if (!c.ok) return { ok: false, reason: c.error || 'unreachable' };
    if (room) return { ok: false, reason: 'already_in_room', text: reasonText('already_in_room') };
    intentional = false;
    transport.sendControl({ t: MSG.CREATE_ROOM, visibility, name: roomName || undefined, dropIn });
    const r = await waitFor((m) => (m.t === MSG.ROOM_STATE && m.room.hostPeerId === peerId ? { ok: true, code: m.room.code, room: m.room } : rejected(m, MSG.CREATE_ROOM)), 4000);
    return r;
  }
  async function join(code, wantSeat = null) {
    const c0 = normalizeCode(code);
    if (!c0) return { ok: false, reason: 'not_found', text: 'Room codes are 5 letters/digits (no 0, O, 1 or I).' };
    const c = await ensureConnected();
    if (!c.ok) return { ok: false, reason: c.error || 'unreachable' };
    if (room) return { ok: false, reason: 'already_in_room', text: reasonText('already_in_room') };
    intentional = false;
    transport.sendControl({ t: MSG.JOIN_ROOM, code: c0, seat: Number.isInteger(wantSeat) ? wantSeat : undefined });
    return waitFor(
      (m) => (m.t === MSG.ROOM_STATE && m.room.code === c0 && m.room.seats.some((s) => s.peerId === peerId) ? { ok: true, code: c0, seat: m.room.seats.find((s) => s.peerId === peerId).index, room: m.room } : rejected(m, MSG.JOIN_ROOM)),
      4000
    );
  }
  async function quickMatch() {
    const c = await ensureConnected();
    if (!c.ok) return { ok: false, reason: c.error || 'unreachable' };
    if (room) return { ok: false, reason: 'already_in_room', text: reasonText('already_in_room') };
    intentional = false;
    transport.sendControl({ t: MSG.QUICK_MATCH });
    const first = await waitFor(
      (m) => (m.t === MSG.MATCH_FOUND ? { ok: true, code: m.code, seat: m.seat, queued: false } : m.t === MSG.MATCH_STATUS && m.queued ? { ok: true, code: m.code, queued: true } : rejected(m, MSG.QUICK_MATCH)),
      4000
    );
    if (first.ok && !room) await waitFor((m) => (m.t === MSG.ROOM_STATE ? true : undefined), 2000, false);
    return first.ok ? { ...first, seat: seat, room } : first;
  }
  async function cancelMatch() {
    if (transport.state !== 'open') return { ok: true };
    intentional = true;
    transport.sendControl({ t: MSG.CANCEL_MATCH });
    const r = await waitFor((m) => (m.t === MSG.MATCH_STATUS && m.cancelled ? { ok: true } : undefined), 3000, { ok: true, timeout: true });
    room = null;
    seat = null;
    role = 'none';
    clearSession();
    intentional = false;
    recompute();
    return r;
  }
  async function leave() {
    if (reconnect) {
      clearTimeout(reconnect.timer);
      reconnect = null;
    }
    const code = room ? room.code : null;
    if (transport.state === 'open' && room) transport.sendControl({ t: MSG.LEAVE_ROOM });
    room = null;
    seat = null;
    role = 'none';
    clearSession();
    stopStreams();
    recompute();
    log('left', { code });
    return { ok: true, code };
  }
  async function setReady(ready = true) {
    if (!room) return { ok: false, reason: 'not_in_room' };
    transport.sendControl({ t: MSG.SET_READY, ready: !!ready });
    return waitFor((m) => (m.t === MSG.ROOM_STATE && m.room.seats.some((s) => s.peerId === peerId && (s.ready === !!ready || m.room.hostPeerId === peerId)) ? { ok: true } : rejected(m, MSG.SET_READY)), 3000);
  }
  async function selectSeat(want) {
    if (!room) return { ok: false, reason: 'not_in_room' };
    transport.sendControl({ t: MSG.SELECT_SEAT, seat: want });
    return waitFor((m) => (m.t === MSG.ROOM_STATE && m.room.seats.some((s) => s.peerId === peerId && s.index === want) ? { ok: true, seat: want } : rejected(m, MSG.SELECT_SEAT)), 3000);
  }
  async function start(seed = undefined) {
    if (!room) return { ok: false, reason: 'not_in_room' };
    transport.sendControl({ t: MSG.START_GAME, seed: Number.isInteger(seed) ? seed >>> 0 : undefined });
    const r = await waitFor((m) => (m.t === MSG.GAME_STARTING ? { ok: true, countdownMs: m.countdownMs, seed: m.seed } : rejected(m, MSG.START_GAME)), 3000);
    return r;
  }
  async function rejoin() {
    const s = readJSON(SESSION_KEY);
    if (!s || wallNow() - s.savedAt > REJOIN_WINDOW_MS) return { ok: false, reason: 'no_session' };
    url = s.url || url;
    rejoinToken = s.token;
    const c = await connect();
    if (!c.ok) return { ok: false, reason: c.error };
    transport.sendControl({ t: MSG.RECONNECT, token, code: s.code });
    const r = await waitFor((m) => (m.t === MSG.ROOM_STATE && m.room.seats.some((x) => x.peerId === peerId && x.connected) ? { ok: true, code: m.room.code } : rejected(m, MSG.RECONNECT)), 4000);
    if (!r.ok) clearSession();
    return r;
  }
  function rejoinInfo() {
    const s = readJSON(SESSION_KEY);
    if (!s || !s.code || wallNow() - s.savedAt > REJOIN_WINDOW_MS) return null;
    return { code: s.code, url: s.url, seat: s.seat, role: s.role, ageMs: wallNow() - s.savedAt };
  }
  // drop(ms): force-close the socket as if the link died; no reconnect attempt
  // lands before `ms` has passed (drop-off tests).
  function drop(ms = 0) {
    if (transport.state !== 'open') return { ok: false, reason: 'not_connected' };
    log('drop_test', { ms });
    linkLost(4000, 'drop test', { suppressMs: ms });
    return { ok: true, ms };
  }
  // disconnect(): the player quits multiplayer — leave the room gracefully
  // (a quit is not a drop: no seat hold, no reconnect), then close.
  function disconnect() {
    intentional = true;
    if (transport.state === 'open' && room) transport.sendControl({ t: MSG.LEAVE_ROOM });
    if (reconnect) {
      clearTimeout(reconnect.timer);
      reconnect = null;
    }
    stopTimers();
    stopStreams();
    closingOnPurpose = true;
    transport.close(1000, 'bye');
    closingOnPurpose = false;
    peerId = null;
    room = null;
    seat = null;
    role = 'none';
    recompute();
    intentional = false;
    return { ok: true };
  }
  function setName(n) {
    name = sanitizeName(n);
    writeJSON(IDENTITY_KEY, { name });
    return name;
  }

  // ----------------------------------------------- W3 probe stream --
  let hostStream = null;
  let guestStream = null;
  function syncStreams() {
    const want = !driver && probeStream && room && (room.state === 'in_game' || room.state === 'migrating') && transport.state === 'open';
    if (want && role === 'host' && !hostStream) {
      if (guestStream) stopGuest();
      startHost();
    } else if (want && role === 'guest' && !guestStream) {
      if (hostStream) stopHost();
      startGuest();
    } else if (!want) stopStreams();
    else if (role === 'host' && guestStream) {
      stopGuest();
      startHost();
    } else if (role === 'guest' && hostStream) {
      stopHost();
      startGuest();
    }
  }
  function stopStreams() {
    stopHost();
    stopGuest();
  }
  function resetStreamsAfterReconnect() {
    if (hostStream) hostStream.resetAll();
    if (guestStream) guestStream.reset();
    // The snapshots the host sent while this link was down were never
    // "lost in transit" — the window restarts with the new socket.
    resetLinkMeters();
  }

  function startHost() {
    if (!clock || typeof clock.onTickEnd !== 'function' || typeof capture !== 'function') {
      log('probe_host_unavailable', { clock: !!clock, capture: typeof capture });
      return;
    }
    const snap = createSnapshotHost();
    const links = new Map(); // seat -> { link, lastInput, newest, missing, packets }
    const hostNetMs = [];
    const captureMeter = new RateMeter(now);
    let batchSeq = 0;
    let evFrom = clock.tick;
    let pending = [];
    let lastKeyframeTick = -Infinity;
    let captureErrors = 0;
    const offBus = bus && typeof bus.on === 'function' ? bus.on('*', (ev) => {
      if (ev.type !== 'sound') pending.push(ev);
      if (pending.length > 2000) pending.shift();
    }) : null;
    const linkFor = (s) => {
      let L = links.get(s);
      if (!L) links.set(s, (L = { link: snap.link(), lastInput: null, newest: null, packets: 0, fullsRequested: 0, recv: [] }));
      return L;
    };
    // Runs INSIDE the clock's tick-end hook: it must never throw into the
    // sim loop, whatever the capture or a peer does.
    const off = clock.onTickEnd((tick) => {
      try {
        hostTick(tick);
      } catch (err) {
        captureErrors += 1;
        if (captureErrors <= 3) log('probe_host_error', { error: String(err && err.message) });
      }
    });
    function hostTick(tick) {
      if (tick % snapEvery !== 0) return;
      if (!room || transport.state !== 'open') return;
      const guests = room.seats.filter((s) => s.peerId && s.connected && s.peerId !== peerId);
      if (!guests.length) {
        pending = [];
        evFrom = tick;
        return;
      }
      const t0 = now();
      let tree;
      try {
        tree = capture();
      } catch (err) {
        captureErrors += 1;
        if (captureErrors <= 3) log('capture_error', { error: String(err && err.message) });
        return;
      }
      const rec = snap.capture(tick, tree, { clone: !captureIsPrivate });
      captureMeter.add(1);
      for (const g of guests) {
        const L = linkFor(g.index);
        transport.sendBinary(snap.encodeFor(L.link, rec, { seat: g.index, lastInputSeqConsumed: L.lastInput, inputBufferDepth: 0 }));
      }
      if (pending.length) {
        transport.sendBinary(encodeEvents(SEAT_ALL, ++batchSeq, evFrom, tick, pending));
        pending = [];
      }
      evFrom = tick;
      if (tick - lastKeyframeTick >= KEYFRAME_EVERY_TICKS) {
        lastKeyframeTick = tick;
        try {
          transport.sendBinary(encodeKeyframe(tick, captureIsPrivate ? tree : snapTreeCopy(tree)));
        } catch (err) {
          log('keyframe_error', { error: String(err && err.message) });
        }
      }
      hostNetMs.push(now() - t0);
      if (hostNetMs.length > 600) hostNetMs.shift();
    }
    hostStream = {
      snap,
      links,
      hostNetMs,
      captureMeter,
      get captureErrors() {
        return captureErrors;
      },
      resetSeat(s) {
        const L = links.get(s);
        if (L) L.link.acked = 0;
      },
      resetAll() {
        for (const L of links.values()) L.link.acked = 0;
      },
      onBinary(u8) {
        try {
          if (u8[0] === BIN.INPUT) {
            const p = decodeInputPacket(u8);
            const L = linkFor(p.seat);
            L.packets += 1;
            if (p.ackSnapSeq === null) {
              if (L.link.acked) L.fullsRequested += 1;
              L.link.acked = 0;
            } else snap.ack(L.link, p.ackSnapSeq);
            const newest = p.frames.length ? p.frames[p.frames.length - 1].seq : null;
            if (newest !== null) {
              // Packet loss = gaps in the per-packet newest seq over a 10 s
              // window (a reordered packet still counts as received).
              L.recv.push({ at: now(), seq: newest });
              while (L.recv.length && now() - L.recv[0].at > 10000) L.recv.shift();
              if (L.newest === null || newest > L.newest) L.newest = newest;
              L.lastInput = L.newest;
            }
          } else if (u8[0] === BIN.CMD) {
            const c = decodeCmd(u8);
            if (c.cmd && c.cmd.kind === 'full') {
              const L = linkFor(c.seat);
              L.link.acked = 0;
              L.fullsRequested += 1;
            }
          }
        } catch (err) {
          log('host_decode_error', { error: String(err && err.message) });
        }
      },
      stop() {
        off();
        if (offBus) offBus();
      },
    };
    log('probe_host_started', { every: snapEvery });
  }
  function snapTreeCopy(tree) {
    return typeof structuredClone === 'function' ? structuredClone(tree) : JSON.parse(JSON.stringify(tree));
  }
  function stopHost() {
    if (!hostStream) return;
    hostStream.stop();
    hostStream = null;
    log('probe_host_stopped', {});
  }

  function startGuest() {
    const dec = createSnapshotClient();
    const recvMeter = new RateMeter(now);
    let inputSeq = 0;
    let frames = [];
    let lastConsumed = 0; // newest input seq the host reports consumed (SNAP header)
    let latestTick = 0;
    let needFull = true;
    let firstSeq = null;
    let maxSeq = null;
    const seen = [];
    const g = {
      dec,
      recvMeter,
      decodeErrors: 0,
      desyncs: 0,
      firstDesync: null,
      events: 0,
      eventBatches: 0,
      eventGaps: 0,
      lastBatch: 0,
      snapshots: 0,
      lossWindow: seen,
      get latestTick() {
        return latestTick;
      },
      reset() {
        dec.reset();
        needFull = true;
        firstSeq = null;
        maxSeq = null;
        seen.length = 0;
        g.lastBatch = 0;
      },
      onBinary(u8) {
        if (u8[0] === BIN.SNAP) {
          const r = dec.decode(u8);
          if (!r.ok) {
            if (r.error === 'no_baseline') needFull = true;
            else {
              g.decodeErrors += 1;
              needFull = true;
            }
            return;
          }
          if (r.duplicate) return;
          g.snapshots += 1;
          recvMeter.add(r.bytes);
          if (r.full) needFull = false;
          if (r.lastInputSeqConsumed !== null && r.lastInputSeqConsumed > lastConsumed) lastConsumed = r.lastInputSeqConsumed;
          latestTick = Math.max(latestTick, r.tick);
          seen.push({ at: now(), seq: r.seq });
          while (seen.length && now() - seen[0].at > 10000) seen.shift();
          if (firstSeq === null || r.seq < firstSeq) firstSeq = r.seq;
          if (maxSeq === null || r.seq > maxSeq) maxSeq = r.seq;
          if (r.hashOk === false) {
            g.desyncs += 1;
            if (!g.firstDesync) g.firstDesync = { seq: r.seq, tick: r.tick };
            dec.reset();
            needFull = true;
          }
          emit('snapshot', r);
        } else if (u8[0] === BIN.EVENTS) {
          try {
            const b = decodeEvents(u8);
            g.eventBatches += 1;
            g.events += b.events.length;
            if (g.lastBatch && b.batchSeq !== g.lastBatch + 1) g.eventGaps += 1;
            g.lastBatch = b.batchSeq;
            emit('events', b);
          } catch {
            g.decodeErrors += 1;
          }
        }
      },
      stop() {
        clearInterval(timer);
      },
    };
    const timer = setInterval(() => {
      if (transport.state !== 'open' || seat === null) return;
      inputSeq += 1;
      frames.push({ seq: inputSeq, tick: inputSeq, viewTick: latestTick, move: 0, aimX: 0, aimZ: 0, press: 0 });
      // Only UNACKED frames ride along (PLAN: the last <= 6 unacked frames).
      frames = frames.filter((f) => f.seq > lastConsumed).slice(-6);
      transport.sendBinary(encodeInputPacket(seat, needFull ? null : dec.ackSeq, frames));
    }, 1000 / SIM_HZ);
    guestStream = g;
    log('probe_guest_started', {});
  }
  function stopGuest() {
    if (!guestStream) return;
    guestStream.stop();
    guestStream = null;
    log('probe_guest_stopped', {});
  }

  // --------------------------------------------------------------- stats --
  // A guest's loss = the worse direction (downstream measured here,
  // upstream as the host reports it); 0 while unmeasurable. A host's comes
  // from its probe stream here, or from the session driver's stats (which
  // override this field).
  function lossPct() {
    if (role === 'guest' || guestStream) return Math.max(lossIn() ?? 0, lossOut() ?? 0);
    if (hostStream) {
      let got = 0;
      let expected = 0;
      for (const L of hostStream.links.values()) {
        if (L.recv.length < 2) continue;
        const seqs = L.recv.map((x) => x.seq);
        got += new Set(seqs).size;
        expected += Math.max(...seqs) - Math.min(...seqs) + 1;
      }
      return expected ? Math.max(0, Math.round((1 - got / expected) * 1000) / 10) : 0;
    }
    return 0;
  }
  function stats() {
    const ts = transport.stats();
    const sh = hostStream ? hostStream.snap.stats() : null;
    const sg = guestStream ? guestStream.dec.stats() : null;
    const full = sh ? sh.fullAvg : sg ? sg.fullAvg : 0;
    const delta = sh ? sh.deltaAvg : sg ? sg.deltaAvg : 0;
    const snapsPerSec = guestStream ? guestStream.recvMeter.countPerSec(5) : hostStream ? hostStream.captureMeter.countPerSec(5) : 0;
    const out = {
      state,
      role,
      serverState,
      url,
      // Median of the last 5 round trips (robust, converges within 5 s of a
      // link change); srtt (RFC 6298 EWMA) is kept for retransmit timing.
      rttMs: rtt.samples.length ? Math.round(median(rtt.samples.slice(-5)) * 10) / 10 : null,
      srttMs: rtt.srtt === null ? null : Math.round(rtt.srtt * 10) / 10,
      rttP95: rtt.samples.length ? Math.round(pct(rtt.samples, 0.95) * 10) / 10 : null,
      jitterMs: Math.round(rtt.jitter * 10) / 10,
      clockOffsetMs: rtt.offsetMs === null ? null : Math.round(rtt.offsetMs),
      lossPct: lossPct(),
      bytesInPerSec: ts.bytesInPerSec,
      bytesOutPerSec: ts.bytesOutPerSec,
      bytesInP95: ts.bytesInP95,
      bytesOutP95: ts.bytesOutP95,
      bytesIn: ts.bytesIn,
      bytesOut: ts.bytesOut,
      snapshotBytesAvg: sh ? Math.round(((sh.fullBytes + sh.deltaBytes) / Math.max(1, sh.fullCount + sh.deltaCount)) * 10) / 10 : sg ? Math.round(((sg.fullBytes + sg.deltaBytes) / Math.max(1, sg.fullCount + sg.deltaCount)) * 10) / 10 : null,
      fullBytesAvg: full ? Math.round(full * 10) / 10 : null,
      deltaBytesAvg: delta ? Math.round(delta * 10) / 10 : null,
      deltaRatio: full && delta ? Math.round((delta / full) * 1000) / 1000 : null,
      snapshotsPerSec: snapsPerSec,
      fullSnapshots: sh ? sh.fullCount : sg ? sg.fullCount : 0,
      desyncs: guestStream ? guestStream.desyncs : 0,
      hashChecks: sg ? sg.hashChecks : 0,
      decodeErrors: guestStream ? guestStream.decodeErrors : 0,
      eventBatches: guestStream ? guestStream.eventBatches : 0,
      eventGaps: guestStream ? guestStream.eventGaps : 0,
      reconnects: counters.reconnects,
      lastReconnectMs: counters.lastReconnectMs,
      drops: counters.drops,
      migrations: counters.migrations,
      hostNetMsP50: hostStream ? pct(hostStream.hostNetMs, 0.5) : null,
      hostNetMsP95: hostStream ? pct(hostStream.hostNetMs, 0.95) : null,
      captureMsP95: sh ? sh.captureMsP95 : null,
      encodeMsP95: sh ? sh.encodeMsP95 : null,
      decodeMsP95: sg ? sg.decodeMsP95 : null,
      stream: driver ? 'driver' : hostStream ? 'probe-host' : guestStream ? 'probe-guest' : 'none',
      // Session-driver numbers (M5b, W4) — null until a driver reports them.
      interpDelayMs: null,
      predErrP95: null,
      predErrMax: null,
      corrections: null,
      inputBufferDepth: null,
      rewindTicksAvg: null,
      lagCompHits: null,
      frameOver50Net: null,
      ownActionFeedbackMs: null,
      retractions: null,
      mispredictRetractMs: null,
      staleRepeatTicksMax: null,
      awaySeats: null,
      replayedOnce: null,
      conditioner: transport.conditioner.get(),
    };
    for (const fn of statExtensions) {
      try {
        Object.assign(out, fn());
      } catch {
        /* a broken extension never breaks stats() */
      }
    }
    // Link quality (NET-F2) — after the extensions, so a host's figures are
    // its session driver's (incoming input loss). lossInPct / lossOutPct:
    // per direction, null while unmeasured; snapshotAgeMs: since the newest
    // snapshot (a guest in a session); quality: the chip's level + reasons +
    // the loss figure it judged (transport.js linkQuality thresholds, 2 s
    // recovery hysteresis).
    //   guest: judged loss = lossPct = the worse direction.
    //   host:  lossPct stays the driver's aggregate over every guest's input
    //          packets; the chip judges THIS host's own link — the loss every
    //          guest's inputs share (min of lossBySeat) — so one guest's bad
    //          Wi-Fi shows on that guest's chip (and as a note on the host's),
    //          not as the host's own problem.
    const guestSide = role === 'guest' || (!!guestStream && !hostStream);
    const inGame = state === 'host' || state === 'guest' || state === 'migrating';
    out.lossInPct = guestSide ? lossIn() : role === 'host' && inGame ? out.lossPct : null;
    out.lossOutPct = guestSide ? lossOut() : null;
    out.lossInWindow = guestSide ? downLoss.measure() : null;
    out.snapshotAgeMs = guestSide && downLoss.ageMs() !== null ? Math.round(downLoss.ageMs()) : null;
    let judged = null;
    if (guestSide) judged = lossIn() === null && lossOut() === null ? null : out.lossPct;
    else if (role === 'host') {
      const by = out.lossBySeat && typeof out.lossBySeat === 'object' ? Object.values(out.lossBySeat).filter((v) => Number.isFinite(v)) : [];
      judged = by.length ? Math.min(...by) : Number.isFinite(out.lossPct) ? out.lossPct : null;
    }
    const q = inGame ? quality.update({ lossPct: judged, rttMs: out.rttMs, jitterMs: out.jitterMs, stallMs: guestSide && state === 'guest' ? out.snapshotAgeMs : null }) : null;
    out.quality = q ? { ...q, lossPct: judged } : null;
    return out;
  }

  function median(a) {
    const s = [...a].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function peers() {
    return room ? room.seats.map((s) => ({ ...s, me: s.peerId === peerId })) : [];
  }

  // --------------------------------------------------------------- API --
  const api = {
    get state() {
      return state;
    },
    get role() {
      return role;
    },
    get room() {
      return room;
    },
    get code() {
      return room ? room.code : null;
    },
    get seat() {
      return seat;
    },
    get peerId() {
      return peerId;
    },
    get serverState() {
      return serverState;
    },
    get serverUrl() {
      return url;
    },
    set serverUrl(u) {
      const v = validateServerUrl(u, { https: isHttps });
      if (v.ok) url = v.url;
    },
    get lanUrls() {
      return lanUrls;
    },
    get name() {
      return name;
    },
    get connected() {
      return transport.state === 'open' && !!peerId;
    },
    // True while a network SESSION runs (a started room, incl. reconnecting /
    // migrating): the app never pauses the shared sim (M1 netActive) and a
    // guest never saves (M2 canSave). Being in a lobby room is not a session.
    inSession() {
      return state === 'host' || state === 'guest' || state === 'migrating' || (state === 'reconnecting' && !!reconnect && reconnect.inGame);
    },
    get snapshotEveryTicks() {
      return snapEvery;
    },
    setSnapshotRate(hz) {
      snapEvery = Math.max(1, Math.round(SIM_HZ / Math.max(10, Math.min(60, hz))));
      return SIM_HZ / snapEvery;
    },
    connect,
    probe,
    host,
    join,
    quickMatch,
    cancelMatch,
    leave,
    setReady,
    selectSeat,
    start,
    rejoin,
    rejoinInfo,
    drop,
    disconnect,
    setName,
    on,
    peers,
    stats,
    log: (n = 50) => logRing.slice(-n),
    conditioner: transport.conditioner,
    transport,
    // M5b seam: the real host/guest driver takes over binary frames + streams.
    setSessionDriver(d) {
      driver = d || null;
      stopStreams();
      syncStreams();
      return true;
    },
    extendStats(fn) {
      statExtensions.push(fn);
      return () => statExtensions.splice(statExtensions.indexOf(fn), 1);
    },
    sendBinary: (u8) => transport.sendBinary(u8),
    sendCmd: (cmd, cmdSeq = 0) => transport.sendBinary(encodeCmd(seat ?? 0, cmdSeq, cmd)),
    probeStreams: () => ({ host: hostStream, guest: guestStream }),
  };
  api.debug = api;

  // Harness params (PLAN §6.1): auto-host / auto-join / quick match.
  if (autoStart) {
    const go = async () => {
      if (params.netHost) await host({ visibility: 'private' });
      else if (params.netJoin) await join(String(params.netJoin), Number.isInteger(params.netSeat) ? params.netSeat : null);
      else if (params.netQuick) await quickMatch();
    };
    if (params.netHost || params.netJoin || params.netQuick) setTimeout(() => go().catch((err) => log('auto_error', { error: String(err && err.message) })), 0);
  }
  return api;
}
