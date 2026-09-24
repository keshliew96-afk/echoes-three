// Client-side WebSocket transport (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// ISOMORPHIC: the browser uses window.WebSocket; Node bots and probes use
// Node's built-in WebSocket (global since Node 22) — pass `WebSocketImpl` to
// override. No DOM, no Node built-ins.
//
//   const t = createTransport({ cond: 'lat75,loss10' });
//   await t.open('ws://127.0.0.1:7800/echoes');   // rejects after 3 s
//   t.on('control', (msg) => …); t.on('binary', (u8) => …); t.on('close', (e) => …);
//   t.sendControl({ t: 'hello', … }); t.sendBinary(u8);
//
// The client-side conditioner (?netcond=) shapes BOTH directions of this one
// link — outgoing frames before ws.send, incoming frames before dispatch —
// with the same per-class semantics as the server's (conditioner.js). With
// no spec it is a synchronous pass-through (zero cost, order preserved).
import { createConditioner, parseCond, formatCond } from './protocol/conditioner.js';
import { isUnreliableChannel } from './protocol/codec.js';

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Heartbeat frames (ping / pong) travel in the UNRELIABLE class (see below).
export function isHeartbeat(text) {
  return text.length < 200 && (text.includes('"t":"pong"') || text.includes('"t":"ping"'));
}

// Bytes per 1 s window (last 60 windows) — mean / p95 for stats().
export class RateMeter {
  constructor(now = defaultNow) {
    this.now = now;
    this.win = [];
    this.curT = Math.floor(now() / 1000);
    this.cur = 0;
    this.curN = 0;
    this.total = 0;
    this.count = 0;
  }
  add(bytes) {
    this.roll();
    this.cur += bytes;
    this.curN += 1;
    this.total += bytes;
    this.count += 1;
  }
  roll() {
    const t = Math.floor(this.now() / 1000);
    while (this.curT < t) {
      this.win.push({ bytes: this.cur, n: this.curN });
      if (this.win.length > 60) this.win.shift();
      this.cur = 0;
      this.curN = 0;
      this.curT += 1;
      if (t - this.curT > 120) this.curT = t; // long idle: skip ahead
    }
  }
  perSec(n = 5) {
    this.roll();
    const w = this.win.slice(-n);
    return w.length ? Math.round(w.reduce((s, x) => s + x.bytes, 0) / w.length) : 0;
  }
  // Mean events (add() calls) per second over the last `n` complete windows.
  countPerSec(n = 5) {
    this.roll();
    const w = this.win.slice(-n);
    return w.length ? Math.round((w.reduce((s, x) => s + x.n, 0) / w.length) * 10) / 10 : 0;
  }
  p95(n = 60) {
    this.roll();
    const w = this.win.slice(-n).map((x) => x.bytes).sort((a, b) => a - b);
    return w.length ? w[Math.min(w.length - 1, Math.floor(w.length * 0.95))] : 0;
  }
  windows(n = 60) {
    this.roll();
    return this.win.slice(-n).map((x) => x.bytes);
  }
}

// ------------------------------------------------------ link quality --
// Packet loss from sequence gaps (NET-F2, gauntlet round 1). The receiver of
// an UNRELIABLE, sequence-numbered stream (a guest's snapshots, a host's
// input packets) counts the distinct sequence numbers that arrived in the
// last `windowMs` against the span they cover (hi - lo + 1). Duplicates and
// reordering are harmless (distinct set; a late packet only fills its gap).
// pct() is null until the window spans `minSpan` numbers (no guess from two
// packets). A sequence that restarts (a new host after a migration: seqs
// begin at 1 again) or jumps by more than `maxJump` (a stall or reconnect,
// not loss) starts a fresh window instead of reporting a giant gap.
// total(): the same count CUMULATIVE since clear() (every segment summed;
// comparable to a conditioner's cumulative appliedLossPct), so a probe can
// compare minutes of traffic instead of one 5 s window.
export class SeqLossMeter {
  constructor({ windowMs = 5000, minSpan = 20, maxJump = 200, reorderSlack = 64, now = defaultNow } = {}) {
    this.windowMs = windowMs;
    this.minSpan = minSpan;
    this.maxJump = maxJump;
    this.reorderSlack = reorderSlack;
    this.now = now;
    this.recv = []; // { at, seq } in arrival order
    this.maxSeq = null;
    this.lastAt = null;
    this.resets = 0;
    this.totGot = 0;
    this.totExpected = 0;
    this.recent = new Set(); // seqs counted in this segment (bounded)
  }
  add(seq) {
    if (!Number.isFinite(seq)) return;
    const t = this.now();
    if (this.maxSeq !== null && (seq < this.maxSeq - this.reorderSlack || seq > this.maxSeq + this.maxJump)) this.reset();
    // Cumulative: a new high seq extends the expected span; any seq not yet
    // counted (first arrival, or a late one filling its gap) is received.
    if (this.maxSeq === null) this.totExpected += 1;
    else if (seq > this.maxSeq) this.totExpected += seq - this.maxSeq;
    if (!this.recent.has(seq)) {
      this.recent.add(seq);
      this.totGot += 1;
      if (this.recent.size > 512) this.recent.delete(this.recent.values().next().value);
    }
    this.recv.push({ at: t, seq });
    if (this.maxSeq === null || seq > this.maxSeq) this.maxSeq = seq;
    this.lastAt = t;
    this.prune(t);
  }
  // -> { pct, got, expected } since clear(); pct null below minSpan.
  total() {
    const e = this.totExpected;
    return { pct: e >= this.minSpan ? Math.max(0, Math.round((1 - Math.min(this.totGot, e) / e) * 1000) / 10) : null, got: this.totGot, expected: e };
  }
  clear() {
    this.reset();
    this.totGot = 0;
    this.totExpected = 0;
  }
  // Entries live 1 s past the window: a seq that arrived just before the
  // window's oldest entry (reordered) still counts as received.
  prune(t = this.now()) {
    while (this.recv.length && t - this.recv[0].at > this.windowMs + 1000) this.recv.shift();
  }
  // A new sequence segment (the cumulative totals are kept; see clear()).
  reset() {
    if (this.recv.length) this.resets += 1;
    this.recv.length = 0;
    this.maxSeq = null;
    this.lastAt = null;
    this.recent.clear();
  }
  // -> { pct, got, expected } over the window; pct null while unmeasurable.
  measure() {
    const t = this.now();
    this.prune(t);
    let lo = Infinity;
    let hi = -Infinity;
    let n = 0;
    for (const x of this.recv) {
      if (t - x.at > this.windowMs) continue;
      n += 1;
      if (x.seq < lo) lo = x.seq;
      if (x.seq > hi) hi = x.seq;
    }
    if (n < 2) return { pct: null, got: n, expected: n };
    const seen = new Set();
    for (const x of this.recv) if (x.seq >= lo && x.seq <= hi) seen.add(x.seq);
    const expected = hi - lo + 1;
    if (expected < this.minSpan) return { pct: null, got: seen.size, expected };
    return { pct: Math.max(0, Math.round((1 - seen.size / expected) * 1000) / 10), got: seen.size, expected };
  }
  pct() {
    return this.measure().pct;
  }
  // ms since the newest packet (null when none in this window's session).
  ageMs() {
    return this.lastAt === null ? null : this.now() - this.lastAt;
  }
}

// Connection quality for the player (the in-game chip's signal bars and
// warnings; PLAN §3.7 UI states, benchmark C8 / A10). Thresholds, chosen
// against what the game tolerates — the guest's interpolation delay is
// ~100-200 ms, input frames ride 6-deep so upstream loss is masked until
// heavy, remote entities extrapolate across a lost snapshot or two, and the
// adaptive interpolation delay absorbs RTT jitter well below ~half of it
// (jitterMs is the RFC 3550 mean |ΔRTT| of the 1 Hz pings, which also
// carries this page's own main-thread stalls — so its bar sits high enough
// that a loaded machine on a clean LAN link is not called a bad connection):
//   poor  loss >= 8 %, or RTT >= 250 ms, or jitter >= 80 ms, or no update for >= 1.5 s
//   fair  loss >= 2 %, or RTT >= 150 ms, or jitter >= 40 ms
//   good  otherwise
// reasons (worst first): 'stalled' | 'loss' | 'latency' | 'jitter'.
export const QUALITY_THRESHOLDS = Object.freeze({
  poor: Object.freeze({ lossPct: 8, rttMs: 250, jitterMs: 80, stallMs: 1500 }),
  fair: Object.freeze({ lossPct: 2, rttMs: 150, jitterMs: 40 }),
});
const LEVELS = ['good', 'fair', 'poor'];
export function linkQuality({ lossPct = null, rttMs = null, jitterMs = null, stallMs = null } = {}) {
  const T = QUALITY_THRESHOLDS;
  const reasons = [];
  let level = 0;
  const at = (lvl, why) => {
    if (lvl > level) level = lvl;
    if (!reasons.includes(why)) reasons.push(why);
  };
  if (Number.isFinite(stallMs) && stallMs >= T.poor.stallMs) at(2, 'stalled');
  if (Number.isFinite(lossPct)) {
    if (lossPct >= T.poor.lossPct) at(2, 'loss');
    else if (lossPct >= T.fair.lossPct) at(1, 'loss');
  }
  if (Number.isFinite(rttMs)) {
    if (rttMs >= T.poor.rttMs) at(2, 'latency');
    else if (rttMs >= T.fair.rttMs) at(1, 'latency');
  }
  if (Number.isFinite(jitterMs)) {
    if (jitterMs >= T.poor.jitterMs) at(2, 'jitter');
    else if (jitterMs >= T.fair.jitterMs) at(1, 'jitter');
  }
  return { level: LEVELS[level], reasons };
}

// Hysteresis so the chip never flickers: a WORSE level shows at once; a
// better one only after it has held for `recoverMs`.
export function createQualityTracker({ recoverMs = 2000, now = defaultNow } = {}) {
  let shown = null;
  let better = null; // { level, since }
  let changedAt = null;
  return {
    update(input) {
      const q = linkQuality(input);
      const t = now();
      if (!shown || LEVELS.indexOf(q.level) >= LEVELS.indexOf(shown.level)) {
        if (!shown || q.level !== shown.level) changedAt = t;
        shown = q;
        better = null;
      } else {
        if (!better || better.level !== q.level) better = { level: q.level, since: t };
        if (t - better.since >= recoverMs) {
          shown = q;
          better = null;
          changedAt = t;
        } else shown = { level: shown.level, reasons: shown.reasons };
      }
      return { level: shown.level, reasons: shown.reasons.slice(), raw: q.level, sinceMs: changedAt === null ? 0 : Math.round(t - changedAt) };
    },
    reset() {
      shown = null;
      better = null;
      changedAt = null;
    },
  };
}

export function createTransport({ WebSocketImpl = null, cond = null, now = defaultNow, precise = typeof window === 'undefined' } = {}) {
  const listeners = new Map();
  let ws = null;
  let state = 'closed';
  let openedAt = 0;
  let lastRecvAt = 0;
  let url = null;
  let gen = 0; // bumps per open(): late events from an old socket are ignored
  const opts = { now, precise }; // precise pump for Node bots (browser timers are ~1 ms already)
  const out = createConditioner(cond, opts);
  const inc = createConditioner(cond, opts);
  const inMeter = new RateMeter(now);
  const outMeter = new RateMeter(now);
  const counts = { controlIn: 0, controlOut: 0, binaryIn: 0, binaryOut: 0, opens: 0, closes: 0 };

  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        // A consumer bug must never break the socket loop; surface it once.
        if (typeof console !== 'undefined') console.warn(`[net] ${type} listener threw`, err);
      }
    }
  }
  function on(type, fn) {
    let set = listeners.get(type);
    if (!set) listeners.set(type, (set = new Set()));
    set.add(fn);
    return () => set.delete(fn);
  }

  function Impl() {
    const I = WebSocketImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
    if (!I) throw new Error('no WebSocket implementation available');
    return I;
  }

  // open(url, { timeoutMs }) -> Promise (resolves on 'open').
  function open(target, { timeoutMs = 3000 } = {}) {
    if (ws) close(1000, 'reopen');
    const my = ++gen;
    url = target;
    state = 'connecting';
    counts.opens += 1;
    return new Promise((resolve, reject) => {
      let settled = false;
      let sock;
      try {
        const I = Impl();
        sock = new I(target);
      } catch (err) {
        state = 'closed';
        reject(new Error(`bad_url: ${err && err.message ? err.message : err}`));
        return;
      }
      ws = sock;
      try {
        sock.binaryType = 'arraybuffer';
      } catch {
        /* Node implementations may not allow it before open */
      }
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          sock.close();
        } catch {
          /* ignore */
        }
        if (my === gen) {
          ws = null;
          state = 'closed';
        }
        reject(new Error('timeout'));
      }, timeoutMs);
      sock.onopen = () => {
        if (my !== gen) return;
        try {
          sock.binaryType = 'arraybuffer';
        } catch {
          /* ignore */
        }
        state = 'open';
        openedAt = now();
        lastRecvAt = openedAt;
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
        emit('open', { url: target });
      };
      sock.onmessage = (ev) => {
        if (my !== gen) return;
        const data = ev.data;
        if (typeof data === 'string') {
          inMeter.add(data.length);
          // The heartbeat (pong) is UNRELIABLE, like a game's latency probe:
          // a lost one is simply lost, so RTT samples never include retransmit
          // delays. Every other text frame is reliable control.
          const hb = isHeartbeat(data);
          inc.send(data, { reliable: !hb, bytes: data.length, stream: hb ? 'hb' : 'ctl' }, (d) => deliverText(my, d));
        } else {
          const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
          if (!u8) return; // Blob (binaryType not honoured) — never used by this protocol
          inMeter.add(u8.length);
          inc.send(u8, { reliable: !isUnreliableChannel(u8[0]), bytes: u8.length, stream: u8[0] }, (d) => deliverBinary(my, d));
        }
      };
      sock.onerror = () => {
        if (my !== gen) return;
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          ws = null;
          state = 'closed';
          reject(new Error('unreachable'));
        }
      };
      sock.onclose = (ev) => {
        if (my !== gen) return;
        const wasOpen = state === 'open' || state === 'closing';
        ws = null;
        state = 'closed';
        counts.closes += 1;
        out.flush();
        inc.flush();
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error('unreachable'));
          return;
        }
        if (wasOpen) emit('close', { code: ev.code, reason: ev.reason, clean: !!ev.wasClean });
      };
    });
  }

  function deliverText(my, text) {
    if (my !== gen) return;
    lastRecvAt = now();
    counts.controlIn += 1;
    let msg = null;
    try {
      msg = JSON.parse(text);
    } catch {
      msg = null;
    }
    if (msg && typeof msg === 'object' && typeof msg.t === 'string') emit('control', msg);
  }
  function deliverBinary(my, u8) {
    if (my !== gen) return;
    lastRecvAt = now();
    counts.binaryIn += 1;
    emit('binary', u8);
  }

  function rawSend(data, bytes) {
    if (!ws || state !== 'open') return false;
    try {
      ws.send(data);
      outMeter.add(bytes);
      return true;
    } catch {
      return false;
    }
  }
  function sendControl(msg, { unreliable = false } = {}) {
    if (!ws || state !== 'open') return false;
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    counts.controlOut += 1;
    const my = gen;
    out.send(text, { reliable: !unreliable, bytes: text.length, stream: unreliable ? 'hb' : 'ctl' }, (d) => my === gen && rawSend(d, d.length));
    return true;
  }
  function sendBinary(u8) {
    if (!ws || state !== 'open') return false;
    counts.binaryOut += 1;
    const my = gen;
    out.send(u8, { reliable: !isUnreliableChannel(u8[0]), bytes: u8.length, stream: u8[0] }, (d) => my === gen && rawSend(d, d.length));
    return true;
  }

  function close(code = 1000, reason = '') {
    const sock = ws;
    gen += 1; // ignore everything the old socket still says
    ws = null;
    const wasOpen = state === 'open';
    state = 'closed';
    out.flush();
    inc.flush();
    if (sock) {
      try {
        sock.close(code, reason);
      } catch {
        try {
          sock.close();
        } catch {
          /* ignore */
        }
      }
    }
    if (wasOpen) emit('close', { code, reason, clean: true, local: true });
  }

  return {
    open,
    close,
    on,
    sendControl,
    sendBinary,
    get state() {
      return state;
    },
    get url() {
      return url;
    },
    get lastRecvAt() {
      return lastRecvAt;
    },
    get openedAt() {
      return openedAt;
    },
    get bufferedAmount() {
      return ws && typeof ws.bufferedAmount === 'number' ? ws.bufferedAmount : 0;
    },
    conditioner: {
      set(spec) {
        const c = parseCond(spec);
        out.set(c);
        inc.set(c);
        return formatCond(c);
      },
      get: () => formatCond(out.get()),
      clear() {
        out.clear();
        inc.clear();
        return 'off';
      },
      stats: () => ({ out: out.stats(), in: inc.stats() }),
    },
    stats() {
      return {
        bytesInPerSec: inMeter.perSec(),
        bytesOutPerSec: outMeter.perSec(),
        bytesInP95: inMeter.p95(),
        bytesOutP95: outMeter.p95(),
        bytesIn: inMeter.total,
        bytesOut: outMeter.total,
        inWindows: inMeter.windows(),
        outWindows: outMeter.windows(),
        ...counts,
      };
    },
  };
}
