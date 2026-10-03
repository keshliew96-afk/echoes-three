// Network conditioner (docs/gauntlet/PLAN.md §3.7). Owner: M5a. ISOMORPHIC:
// used by the session server per link and direction, by the browser
// transport (?netcond=) and by Node bots / probes.
//
// WebSocket runs on TCP, which never loses or reorders packets, so the
// conditioner models what the game would see on a UDP-style link, per
// delivery CLASS:
//   unreliable (SNAP, INPUT)   loss (plain or Gilbert–Elliott bursts), dup,
//                              reorder (+20–60 ms), latency + jitter (each
//                              packet independent, so jitter reorders too),
//                              bandwidth tail-drop (queue > 300 ms)
//   reliable (control, EVENTS, CMD, KEYFRAME)  in order PER STREAM (meta.stream:
//                              one ordered channel per kind, like ENet / GNS
//                              reliable channels — a retransmitted EVENTS batch
//                              never stalls a pong), never dropped: a simulated
//                              loss becomes a retransmit delay of max(200 ms,
//                              2 × RTT) per lost attempt — exactly what a
//                              reliable-over-UDP layer would do
// outage { atMs, forMs } / blackhole(forMs): the link is dead for the window —
// unreliable packets are dropped, reliable ones wait for the link to return
// (plus one retransmit timeout). Silence longer than a peer timeout is then
// detected by the normal timeout rules (the server / client close the socket).
//
// Spec (object or compact string, both accepted everywhere):
//   { latencyMs, jitterMs (normal σ, delay clamped ≥ 0), loss (0–1),
//     burstLoss { pGB, pBG, lossInBad } | null, dup (0–1), reorder (0–1),
//     bandwidthKbps (0 = unlimited), outage { atMs, forMs } | null, seed }
//   "lat75,jit10,loss10,dup1,reo2,burst0.05:0.3:0.8,bw256,out5000:3000,seed7"
//   (compact string: loss / dup / reo are PERCENT; lat / jit ms; bw kbit/s;
//    out = atMs:forMs from the moment the spec is applied)
//
// One-way numbers: lat75 on both directions of a guest link = 150 ms RTT.

export const DEFAULT_COND = Object.freeze({
  latencyMs: 0,
  jitterMs: 0,
  loss: 0,
  burstLoss: null,
  dup: 0,
  reorder: 0,
  bandwidthKbps: 0,
  outage: null,
  seed: null,
});

const REORDER_MIN_MS = 20;
const REORDER_MAX_MS = 60;
const RTO_MIN_MS = 200;
const MAX_RETRANSMITS = 8;
const BW_QUEUE_DROP_MS = 300;

const clamp01 = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const nonNeg = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

// parseCond(spec) -> normalised spec object (throws TypeError on garbage).
export function parseCond(spec) {
  if (spec === null || spec === undefined || spec === '' || spec === 'off' || spec === 'none') return { ...DEFAULT_COND };
  if (typeof spec === 'string') {
    const out = { ...DEFAULT_COND };
    for (const raw of spec.split(/[,\s]+/)) {
      const part = raw.trim();
      if (!part) continue;
      const m = /^([a-z]+)(.*)$/i.exec(part);
      if (!m) throw new TypeError(`conditioner: bad term "${part}"`);
      const key = m[1].toLowerCase();
      const val = m[2];
      const num = Number(val);
      switch (key) {
        case 'lat':
          out.latencyMs = nonNeg(num);
          break;
        case 'jit':
          out.jitterMs = nonNeg(num);
          break;
        case 'loss':
          out.loss = clamp01(num / 100);
          break;
        case 'dup':
          out.dup = clamp01(num / 100);
          break;
        case 'reo':
          out.reorder = clamp01(num / 100);
          break;
        case 'bw':
          out.bandwidthKbps = nonNeg(num);
          break;
        case 'burst': {
          const [a, b, c] = val.split(':').map(Number);
          if (![a, b, c].every(Number.isFinite)) throw new TypeError(`conditioner: burst needs pGB:pBG:lossInBad ("${part}")`);
          out.burstLoss = { pGB: clamp01(a), pBG: clamp01(b), lossInBad: clamp01(c) };
          break;
        }
        case 'out': {
          const [a, b] = val.split(':').map(Number);
          if (![a, b].every(Number.isFinite)) throw new TypeError(`conditioner: out needs atMs:forMs ("${part}")`);
          out.outage = { atMs: nonNeg(a), forMs: nonNeg(b) };
          break;
        }
        case 'seed':
          out.seed = Number.isFinite(num) ? num >>> 0 : null;
          break;
        default:
          throw new TypeError(`conditioner: unknown term "${part}"`);
      }
      if (['lat', 'jit', 'loss', 'dup', 'reo', 'bw', 'seed'].includes(key) && !Number.isFinite(num)) {
        throw new TypeError(`conditioner: "${part}" needs a number`);
      }
    }
    return out;
  }
  if (typeof spec !== 'object') throw new TypeError('conditioner: spec must be an object or a string');
  const b = spec.burstLoss || spec.burst || null;
  const o = spec.outage || null;
  return {
    latencyMs: nonNeg(Number(spec.latencyMs ?? spec.latency ?? 0)),
    jitterMs: nonNeg(Number(spec.jitterMs ?? spec.jitter ?? 0)),
    loss: clamp01(Number(spec.loss ?? 0)),
    burstLoss: b ? { pGB: clamp01(Number(b.pGB ?? b[0])), pBG: clamp01(Number(b.pBG ?? b[1])), lossInBad: clamp01(Number(b.lossInBad ?? b[2])) } : null,
    dup: clamp01(Number(spec.dup ?? 0)),
    reorder: clamp01(Number(spec.reorder ?? 0)),
    bandwidthKbps: nonNeg(Number(spec.bandwidthKbps ?? spec.bw ?? 0)),
    outage: o ? { atMs: nonNeg(Number(o.atMs)), forMs: nonNeg(Number(o.forMs)) } : null,
    seed: Number.isFinite(Number(spec.seed)) && spec.seed !== null ? Number(spec.seed) >>> 0 : null,
  };
}

export function formatCond(c) {
  const s = parseCond(c);
  const parts = [];
  if (s.latencyMs) parts.push(`lat${s.latencyMs}`);
  if (s.jitterMs) parts.push(`jit${s.jitterMs}`);
  if (s.loss) parts.push(`loss${+(s.loss * 100).toFixed(3)}`);
  if (s.dup) parts.push(`dup${+(s.dup * 100).toFixed(3)}`);
  if (s.reorder) parts.push(`reo${+(s.reorder * 100).toFixed(3)}`);
  if (s.burstLoss) parts.push(`burst${s.burstLoss.pGB}:${s.burstLoss.pBG}:${s.burstLoss.lossInBad}`);
  if (s.bandwidthKbps) parts.push(`bw${s.bandwidthKbps}`);
  if (s.outage) parts.push(`out${s.outage.atMs}:${s.outage.forMs}`);
  if (s.seed !== null) parts.push(`seed${s.seed}`);
  return parts.join(',') || 'off';
}

export function isActive(c) {
  return !!(c.latencyMs || c.jitterMs || c.loss || c.burstLoss || c.dup || c.reorder || c.bandwidthKbps || c.outage);
}

// mulberry32 — seeded so a critic's run is reproducible (seed in the spec).
function makeRng(seed) {
  let a = (seed ?? Math.floor(Math.random() * 0x100000000)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Timer precision. Node on Windows wakes timers on the 15.6 ms system tick
// (measured here: setTimeout(50) fires after 62.9 ms, Atomics.wait likewise),
// which would add up to +15.6 ms to every shaped hop. With `precise: true`
// (the Node server and bots) the pump sleeps with setTimeout until one tick
// before the deadline and then yields with setImmediate (I/O keeps flowing)
// until the deadline — ~0.1 ms accuracy, and only while packets are queued:
// an inactive conditioner is a synchronous pass-through and never spins.
const hasImmediate = typeof setImmediate === 'function';
const COARSE_TICK_MS = typeof process !== 'undefined' && process.platform === 'win32' ? 17 : 2;

// createConditioner(spec, opts) -> one DIRECTION of one link.
//   send(packet, { reliable, bytes }, deliver)  schedules deliver(packet) 0..2 times
//   plan(now, { reliable, bytes })              pure planning: { times: [ms…], dropped, reason }
// opts: { now, setTimer(fn, ms), clearTimer(h), precise }
export function createConditioner(spec = null, opts = {}) {
  const nowFn = opts.now || defaultNow;
  const precise = !!opts.precise && hasImmediate && !opts.setTimer;
  const setTimer = opts.setTimer || ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer || ((h) => clearTimeout(h));
  let spinning = false;
  let cfg = parseCond(spec);
  let rand = makeRng(cfg.seed);
  let epoch = nowFn();
  let bad = false; // Gilbert–Elliott state
  let tat = 0; // bandwidth GCRA theoretical arrival time
  const lastReliable = new Map(); // stream -> last scheduled delivery time
  let blackholeUntil = -Infinity;
  let nextSeq = 0;
  const queue = []; // { at, seq, packet, deliver }
  let timer = null;
  let timerAt = Infinity;
  const stats = freshStats();

  function freshStats() {
    return {
      sent: 0,
      sentUnreliable: 0,
      sentReliable: 0,
      delivered: 0,
      lost: 0,
      dupes: 0,
      reordered: 0,
      bwDrops: 0,
      outageDrops: 0,
      retransmits: 0,
      bytes: 0,
      delaySum: 0,
      delaySq: 0,
      delayN: 0,
      burstBadPackets: 0,
    };
  }

  function gauss() {
    let u = 0;
    while (u === 0) u = rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function baseDelay() {
    const d = cfg.latencyMs + (cfg.jitterMs ? gauss() * cfg.jitterMs : 0);
    return d > 0 ? d : 0;
  }
  // Retransmit timeout: max(200 ms, 2 x RTT) with RTT = the link's BASE
  // round trip (this direction's latency doubled — a symmetric link). Never
  // the measured RTT: measured samples include earlier retransmits, and
  // feeding them back would inflate the RTO without bound (Karn's rule —
  // real reliable layers exclude retransmitted samples for the same reason).
  function rto() {
    return Math.max(RTO_MIN_MS, 2 * (2 * cfg.latencyMs));
  }
  function lossProb() {
    if (cfg.burstLoss) {
      const b = cfg.burstLoss;
      bad = bad ? rand() >= b.pBG : rand() < b.pGB;
      if (bad) stats.burstBadPackets += 1;
      return bad ? b.lossInBad : cfg.loss;
    }
    return cfg.loss;
  }
  function stationaryLoss() {
    const b = cfg.burstLoss;
    if (!b) return cfg.loss;
    const denom = b.pGB + b.pBG;
    const piBad = denom > 0 ? b.pGB / denom : 0;
    return piBad * b.lossInBad + (1 - piBad) * cfg.loss;
  }
  function deadWindow(t) {
    if (t < blackholeUntil) return blackholeUntil;
    const o = cfg.outage;
    if (o && o.forMs > 0) {
      const a = epoch + o.atMs;
      if (t >= a && t < a + o.forMs) return a + o.forMs;
    }
    return null;
  }

  // plan(): the pure scheduling decision for one packet sent at `t`.
  function plan(t, { reliable = false, bytes = 0, stream = 'ctl' } = {}) {
    stats.sent += 1;
    stats.bytes += bytes;
    if (reliable) stats.sentReliable += 1;
    else stats.sentUnreliable += 1;
    const pLoss = lossProb();
    // Bandwidth (GCRA token bucket, 50 ms burst tolerance).
    let depart = t;
    if (cfg.bandwidthKbps > 0 && bytes > 0) {
      const rate = (cfg.bandwidthKbps * 1000) / 8 / 1000; // bytes per ms
      const inc = bytes / rate;
      const tau = 50;
      const tatNow = Math.max(tat, t);
      depart = Math.max(t, tatNow - tau);
      if (!reliable && depart - t > BW_QUEUE_DROP_MS) {
        stats.bwDrops += 1;
        return { times: [], dropped: true, reason: 'bandwidth' };
      }
      tat = tatNow + inc;
    }
    const dead = deadWindow(depart);
    if (dead !== null) {
      if (!reliable) {
        stats.outageDrops += 1;
        return { times: [], dropped: true, reason: 'outage' };
      }
      depart = dead + rto();
      stats.retransmits += 1;
    }
    if (reliable) {
      let at = depart + baseDelay();
      let tries = 0;
      // First attempt: the link's CURRENT state (a burst hits it). Each
      // retransmit goes out one RTO (>= 200 ms) later, long after a
      // Gilbert–Elliott burst (mean 1/pBG packets ≈ 50 ms at 60 Hz) has
      // mixed, so retries see the stationary average loss — a bad state
      // never chains 0.8-probability losses for seconds.
      let p = pLoss;
      while (p > 0 && tries < MAX_RETRANSMITS && rand() < p) {
        at += rto();
        tries += 1;
        stats.retransmits += 1;
        p = stationaryLoss();
      }
      const prev = lastReliable.get(stream) ?? -Infinity;
      if (at < prev) at = prev; // in order within the stream (head-of-line)
      lastReliable.set(stream, at);
      record(at - t);
      return { times: [at], dropped: false, retransmits: tries };
    }
    if (pLoss > 0 && rand() < pLoss) {
      stats.lost += 1;
      return { times: [], dropped: true, reason: 'loss' };
    }
    let at = depart + baseDelay();
    let reordered = false;
    if (cfg.reorder > 0 && rand() < cfg.reorder) {
      at += REORDER_MIN_MS + rand() * (REORDER_MAX_MS - REORDER_MIN_MS);
      stats.reordered += 1;
      reordered = true;
    }
    const times = [at];
    record(at - t);
    if (cfg.dup > 0 && rand() < cfg.dup) {
      times.push(depart + baseDelay());
      stats.dupes += 1;
    }
    return { times, dropped: false, reordered };
  }
  function record(d) {
    stats.delaySum += d;
    stats.delaySq += d * d;
    stats.delayN += 1;
  }

  function arm() {
    if (queue.length === 0) return;
    const at = queue[0].at;
    const wait = at - nowFn();
    if (precise && wait <= COARSE_TICK_MS) {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
        timerAt = Infinity;
      }
      if (!spinning) {
        spinning = true;
        setImmediate(spin);
      }
      return;
    }
    if (timer !== null && at >= timerAt) return;
    if (timer !== null) clearTimer(timer);
    timerAt = at;
    timer = setTimer(pump, Math.max(0, precise ? wait - COARSE_TICK_MS : wait));
  }
  function spin() {
    spinning = false;
    pump();
  }
  function pump() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    timerAt = Infinity;
    const t = nowFn();
    while (queue.length && queue[0].at <= t + (precise ? 0.05 : 0.5)) {
      const job = queue.shift();
      stats.delivered += 1;
      try {
        job.deliver(job.packet);
      } catch (err) {
        if (opts.onError) opts.onError(err);
      }
    }
    arm();
  }
  function enqueue(at, packet, deliver) {
    const job = { at, seq: nextSeq++, packet, deliver };
    // Insert keeping (at, seq) order — equal times keep send order.
    let i = queue.length;
    while (i > 0 && queue[i - 1].at > at) i -= 1;
    queue.splice(i, 0, job);
    arm();
  }

  // send(): pass-through (synchronous, zero cost) when the spec is inactive.
  function send(packet, meta, deliver) {
    const t = nowFn();
    if (!isActive(cfg) && t >= blackholeUntil && queue.length === 0) {
      stats.sent += 1;
      stats.bytes += meta && meta.bytes ? meta.bytes : 0;
      if (meta && meta.reliable) stats.sentReliable += 1;
      else stats.sentUnreliable += 1;
      stats.delivered += 1;
      record(0);
      deliver(packet);
      return 1;
    }
    const p = plan(t, meta || {});
    for (const at of p.times) enqueue(at, packet, deliver);
    return p.times.length;
  }

  return {
    send,
    plan,
    set(spec2) {
      cfg = parseCond(spec2);
      rand = makeRng(cfg.seed);
      epoch = nowFn();
      bad = false;
      return { ...cfg };
    },
    get: () => ({ ...cfg }),
    clear() {
      cfg = parseCond(null);
      return { ...cfg };
    },
    blackhole(forMs) {
      blackholeUntil = nowFn() + Math.max(0, forMs);
      return blackholeUntil;
    },
    get active() {
      return isActive(cfg) || nowFn() < blackholeUntil;
    },
    get pending() {
      return queue.length;
    },
    // Drop everything queued (the link closed).
    flush() {
      queue.length = 0;
      spinning = false;
      if (timer !== null) clearTimer(timer);
      timer = null;
      timerAt = Infinity;
    },
    stats() {
      const n = stats.delayN || 1;
      const mean = stats.delaySum / n;
      const std = Math.sqrt(Math.max(0, stats.delaySq / n - mean * mean));
      const u = stats.sentUnreliable || 1;
      return {
        ...stats,
        delayMeanMs: Math.round(mean * 100) / 100,
        delayStdMs: Math.round(std * 100) / 100,
        appliedLossPct: Math.round(((stats.lost + stats.outageDrops + stats.bwDrops) / u) * 10000) / 100,
        spec: formatCond(cfg),
      };
    },
    resetStats() {
      Object.assign(stats, freshStats());
    },
  };
}
