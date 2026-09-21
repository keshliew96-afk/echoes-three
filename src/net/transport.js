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
          inc.send(data, { reliable: true, bytes: data.length }, (d) => deliverText(my, d));
        } else {
          const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
          if (!u8) return; // Blob (binaryType not honoured) — never used by this protocol
          inMeter.add(u8.length);
          inc.send(u8, { reliable: !isUnreliableChannel(u8[0]), bytes: u8.length }, (d) => deliverBinary(my, d));
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
  function sendControl(msg) {
    if (!ws || state !== 'open') return false;
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    counts.controlOut += 1;
    const my = gen;
    out.send(text, { reliable: true, bytes: text.length }, (d) => my === gen && rawSend(d, d.length));
    return true;
  }
  function sendBinary(u8) {
    if (!ws || state !== 'open') return false;
    counts.binaryOut += 1;
    const my = gen;
    out.send(u8, { reliable: !isUnreliableChannel(u8[0]), bytes: u8.length }, (d) => my === gen && rawSend(d, d.length));
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
