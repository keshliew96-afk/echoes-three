// Snapshot baseline/ack delta compression — the Quake 3 model (docs/gauntlet/
// PLAN.md §3.7 "Snapshots"). Owner: M5a. ISOMORPHIC, pure (no timers, no I/O).
//
// A snapshot is the host's complete state tree (save.capture(), taken at a
// clock.onTickEnd — never inside a bus listener) split in two:
//   HOT  = the registry entity table at `hotPath` (default registry.entities):
//          quantised binary channels + per-entity rest diffs (delta.js)
//   COLD = everything else, as a null-safe tagged tree diff (treediff.js)
//          against the baseline's cold tree; omitted (zero bytes) when equal.
//
// Wire layout (after the two-byte relay envelope `u8 BIN.SNAP · u8 seat`):
//   u32 tick · u32 seq · u32 baselineSeq (0xFFFFFFFF = full) ·
//   u32 lastInputSeqConsumed (for this guest; 0xFFFFFFFF = none) · u8 flags ·
//   u16 inputBufferDepth · [u64 hash of the QUANTISED tree when flags bit 7] ·
//   u8 bodyFlags (bit 0: the tree has a hot table, bit 1: COLD unchanged) ·
//   HOT table (delta.js) · COLD (full: bvalue.js encodeValue of the cold
//   tree; delta: encodePatch of the tree-diff patch; absent when unchanged)
//
// flags: bit 7 = hash present; bits 0-6 = UPSTREAM LOSS echo (NET-F2) — the
// host's measured loss of THIS guest's input packets: 0 = not measured, else
// 1 + whole percent (0-100). Decoders before it ignored bits 0-6, so the
// header layout (and PROTOCOL_VERSION) is unchanged. The guest measures its
// own DOWNSTREAM loss from gaps in `seq` (transport.js SeqLossMeter).
//
// The host keeps the last BASELINE_RING (32) snapshots; each guest link
// remembers the newest seq that guest acknowledged (acks ride in every INPUT
// packet) and the host deltas against it — no usable baseline -> full. Lost,
// duplicated and reordered snapshots are harmless: a guest can decode any
// snapshot whose baseline it still holds, and acks only what it decoded.
//
// Exactness (gate G5a.3): the guest's decoded view tree is canonically equal
// to the host's quantised view of the same snapshot, so hashState() of both
// sides agree unless something is actually broken (a real desync).
import { NO_SEQ, ByteWriter, ByteReader } from './codec.js';
import { BIN, BASELINE_RING } from './constants.js';
import { hashState } from '../../core/hash.js';
import { encodeValue, decodeValue, encodePatch, decodePatch } from './bvalue.js';
import { diff, apply, isEmptyPatch, plainClone } from './treediff.js';
import { quantizeEntity, viewEntity } from './quantize.js';
import { encodeHot, decodeHot } from './delta.js';

export const HOT_PATH = Object.freeze(['registry', 'entities']);
export const HASH_EVERY_TICKS = 30;
export const SNAP_FLAG_HASH = 0x80;
const HEADER_BYTES = 2 + 4 + 4 + 4 + 4 + 1 + 2;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const cloneTree = (t) => (typeof structuredClone === 'function' ? structuredClone(t) : plainClone(t));

// ------------------------------------------------------- tree split --
// splitTree(tree) -> { hot: entity[] (ascending id), cold } — `cold` shares
// every subtree with `tree` except the objects on the hot path, which are
// shallow-copied so the hot key can be removed.
export function splitTree(tree, hotPath = HOT_PATH) {
  if (!tree || typeof tree !== 'object') throw new TypeError('snapshot: state tree must be an object');
  const cold = { ...tree };
  let src = tree;
  let dst = cold;
  for (let i = 0; i < hotPath.length - 1; i++) {
    const k = hotPath[i];
    if (!src || typeof src[k] !== 'object' || src[k] === null) return { hot: [], cold, hadHot: false };
    dst[k] = { ...src[k] };
    src = src[k];
    dst = dst[k];
  }
  const leaf = hotPath[hotPath.length - 1];
  const hot = Array.isArray(src[leaf]) ? src[leaf] : [];
  delete dst[leaf];
  const sorted = hot.slice().sort((a, b) => a.id - b.id);
  return { hot: sorted, cold, hadHot: Array.isArray(src[leaf]) };
}

// joinTree(cold, entities) -> a new view tree with `entities` at hotPath.
export function joinTree(cold, entities, hotPath = HOT_PATH, hadHot = true) {
  const out = { ...cold };
  if (!hadHot) return out;
  let dst = out;
  for (let i = 0; i < hotPath.length - 1; i++) {
    const k = hotPath[i];
    dst[k] = { ...(dst[k] || {}) };
    dst = dst[k];
  }
  dst[hotPath[hotPath.length - 1]] = entities;
  return out;
}

function viewTreeOf(rec, hotPath) {
  const ents = rec.q.map((q) => viewEntity(q, rec.tick));
  return joinTree(rec.cold, ents, hotPath, rec.hadHot);
}

// ------------------------------------------------------------- host --
export function createSnapshotHost({ hotPath = HOT_PATH, ringSize = BASELINE_RING, hashEveryTicks = HASH_EVERY_TICKS } = {}) {
  let seq = 0;
  const ring = []; // ascending seq
  const anchors = new Map(); // mover id -> anchor (shared by every guest)
  let lastHashTick = -Infinity;
  const stats = {
    captures: 0,
    captureMs: [],
    encodes: 0,
    encodeMs: [],
    fullCount: 0,
    fullBytes: 0,
    deltaCount: 0,
    deltaBytes: 0,
    bodyCacheHits: 0,
    deltaBodies: 0,
    deltaHotBytes: 0,
    deltaColdBytes: 0,
    deltaChanged: 0,
  };
  const pushSample = (arr, v) => {
    arr.push(v);
    if (arr.length > 600) arr.shift();
  };

  function findRec(s) {
    for (let i = ring.length - 1; i >= 0; i--) if (ring[i].seq === s) return ring[i];
    return null;
  }

  // capture(tick, tree) -> snapshot record (shared by every guest). The tree
  // is deep-cloned first (pass { clone: false } for a tree the caller will
  // never mutate again), so live sim objects are never retained.
  function capture(tick, tree, { clone = true } = {}) {
    const t0 = now();
    const src = clone ? cloneTree(tree) : tree;
    const { hot, cold, hadHot } = splitTree(src, hotPath);
    const q = new Array(hot.length);
    const live = new Set();
    for (let i = 0; i < hot.length; i++) {
      q[i] = quantizeEntity(hot[i], tick, anchors);
      live.add(hot[i].id);
    }
    for (const id of anchors.keys()) if (!live.has(id)) anchors.delete(id);
    seq += 1;
    const rec = { seq, tick, q, cold, hadHot: hadHot !== false, hash: null, bodies: new Map() };
    if (tick - lastHashTick >= hashEveryTicks) {
      rec.hash = hashState(viewTreeOf(rec, hotPath));
      lastHashTick = tick;
    }
    ring.push(rec);
    while (ring.length > ringSize) ring.shift();
    stats.captures += 1;
    pushSample(stats.captureMs, now() - t0);
    return rec;
  }

  function link() {
    return { acked: 0, sent: 0, fulls: 0, lastSeq: 0, lastFullSeq: 0 };
  }

  // ack(link, seq): the guest decoded `seq`. Unknown / stale / bogus seqs
  // (not in the ring, older than the current ack) are ignored.
  function ack(l, s) {
    if (typeof s !== 'number' || s <= l.acked || s > seq) return false;
    if (!findRec(s)) return false;
    l.acked = s;
    return true;
  }

  function encodeBody(rec, base) {
    const key = base ? base.seq : 0;
    const cached = rec.bodies.get(key);
    if (cached) {
      stats.bodyCacheHits += 1;
      return cached;
    }
    const w = new ByteWriter(1024);
    const p = base ? diff(base.cold, rec.cold) : null;
    const coldSame = !!base && isEmptyPatch(p);
    w.u8((rec.hadHot ? 1 : 0) | (coldSame ? 2 : 0));
    // dt = tick distance to the baseline: the patches' baseline-relative
    // forms (bvalue.js 'u' / 'w' / 'D' / based 'k', protocol v3) decode
    // against the guest's copy of the same baseline.
    const dt = base ? rec.tick - base.tick : 0;
    const hot = encodeHot(w, rec.q, base ? base.q : null, dt, rec.tick);
    const coldStart = w.len;
    if (!base) encodeValue(w, rec.cold);
    else if (!coldSame) encodePatch(w, p, base.cold, dt);
    const body = w.finish();
    if (base) {
      stats.deltaBodies += 1;
      stats.deltaHotBytes += hot.bytes;
      stats.deltaColdBytes += w.len - coldStart;
      stats.deltaChanged += hot.changed;
    }
    rec.bodies.set(key, body);
    return body;
  }

  // encodeFor(link, rec, header) -> Uint8Array (a complete relay frame).
  function encodeFor(l, rec, { seat = 0, lastInputSeqConsumed = null, flags = 0, inputBufferDepth = 0, upLossPct = null, forceFull = false } = {}) {
    const t0 = now();
    let base = null;
    if (!forceFull && l.acked) {
      base = findRec(l.acked);
      if (base && base.seq >= rec.seq) base = null;
    }
    const body = encodeBody(rec, base);
    const w = new ByteWriter(HEADER_BYTES + 8 + body.length);
    w.u8(BIN.SNAP).u8(seat);
    w.u32(rec.tick).u32(rec.seq).u32(base ? base.seq : NO_SEQ);
    w.u32(lastInputSeqConsumed === null || lastInputSeqConsumed === undefined ? NO_SEQ : lastInputSeqConsumed);
    w.u8((upLossPct === null || upLossPct === undefined ? flags & 0x7f : upLossCode(upLossPct)) | (rec.hash ? SNAP_FLAG_HASH : 0));
    w.u16(Math.max(0, Math.min(0xffff, inputBufferDepth | 0)));
    if (rec.hash) {
      w.u32(parseInt(rec.hash.slice(0, 8), 16));
      w.u32(parseInt(rec.hash.slice(8, 16), 16));
    }
    w.bytes(body);
    const out = w.finish();
    l.sent += 1;
    l.lastSeq = rec.seq;
    if (base) {
      stats.deltaCount += 1;
      stats.deltaBytes += out.length;
    } else {
      l.fulls += 1;
      l.lastFullSeq = rec.seq;
      stats.fullCount += 1;
      stats.fullBytes += out.length;
    }
    stats.encodes += 1;
    pushSample(stats.encodeMs, now() - t0);
    return out;
  }

  return {
    capture,
    link,
    ack,
    encodeFor,
    view: (rec) => plainClone(viewTreeOf(rec, hotPath)),
    hashOf: (rec) => hashState(viewTreeOf(rec, hotPath)),
    latest: () => (ring.length ? ring[ring.length - 1] : null),
    get seq() {
      return seq;
    },
    stats: () => ({
      ...stats,
      captureMs: undefined,
      encodeMs: undefined,
      captureMsP50: pct(stats.captureMs, 0.5),
      captureMsP95: pct(stats.captureMs, 0.95),
      encodeMsP50: pct(stats.encodeMs, 0.5),
      encodeMsP95: pct(stats.encodeMs, 0.95),
      fullAvg: stats.fullCount ? stats.fullBytes / stats.fullCount : 0,
      deltaAvg: stats.deltaCount ? stats.deltaBytes / stats.deltaCount : 0,
      anchors: anchors.size,
      ring: ring.length,
      deltaHotAvg: stats.deltaBodies ? stats.deltaHotBytes / stats.deltaBodies : 0,
      deltaColdAvg: stats.deltaBodies ? stats.deltaColdBytes / stats.deltaBodies : 0,
      deltaChangedAvg: stats.deltaBodies ? stats.deltaChanged / stats.deltaBodies : 0,
    }),
  };
}

export function pct(arr, p) {
  if (!arr || arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

// ---------------------------------------------------------- header --
// Upstream-loss echo in flags bits 0-6: 0 = not measured, else 1 + percent.
export function upLossCode(pct) {
  const v = Number(pct);
  if (pct === null || pct === undefined || !Number.isFinite(v)) return 0;
  return 1 + Math.max(0, Math.min(100, Math.round(v)));
}
export function upLossOf(flags) {
  const c = flags & 0x7f;
  return c ? Math.min(100, c - 1) : null;
}
export function readSnapHeader(u8) {
  const r = new ByteReader(u8);
  if (r.u8() !== BIN.SNAP) throw new RangeError('not a SNAP frame');
  const seat = r.u8();
  const tick = r.u32();
  const seq = r.u32();
  const bs = r.u32();
  const li = r.u32();
  const flags = r.u8();
  const inputBufferDepth = r.u16();
  let hash = null;
  if (flags & SNAP_FLAG_HASH) hash = r.u32().toString(16).padStart(8, '0') + r.u32().toString(16).padStart(8, '0');
  return {
    r,
    seat,
    tick,
    seq,
    baselineSeq: bs === NO_SEQ ? null : bs,
    lastInputSeqConsumed: li === NO_SEQ ? null : li,
    flags: flags & 0x7f,
    upLossPct: upLossOf(flags),
    inputBufferDepth,
    hash,
  };
}

// ----------------------------------------------------------- client --
export function createSnapshotClient({ hotPath = HOT_PATH, ringSize = BASELINE_RING } = {}) {
  const ring = new Map(); // seq -> rec
  let newest = 0;
  const stats = { decoded: 0, duplicates: 0, noBaseline: 0, corrupt: 0, fullCount: 0, fullBytes: 0, deltaCount: 0, deltaBytes: 0, hashChecks: 0, hashMismatches: 0, decodeMs: [] };

  function prune() {
    if (ring.size <= ringSize) return;
    const seqs = [...ring.keys()].sort((a, b) => a - b);
    for (let i = 0; i < seqs.length - ringSize; i++) ring.delete(seqs[i]);
  }

  // decode(u8) -> { ok:true, seq, tick, full, baselineSeq, hash, hashOk, view(), … }
  //            | { ok:false, error:'no_baseline'|'corrupt', seq?, message? }
  function decode(u8) {
    const t0 = now();
    let h;
    try {
      h = readSnapHeader(u8);
    } catch (err) {
      stats.corrupt += 1;
      return { ok: false, error: 'corrupt', message: String(err.message || err) };
    }
    if (ring.has(h.seq)) {
      stats.duplicates += 1;
      return { ok: true, duplicate: true, seq: h.seq, tick: h.tick, bytes: u8.length };
    }
    let base = null;
    if (h.baselineSeq !== null) {
      base = ring.get(h.baselineSeq) || null;
      if (!base) {
        stats.noBaseline += 1;
        return { ok: false, error: 'no_baseline', seq: h.seq, baselineSeq: h.baselineSeq, bytes: u8.length };
      }
    }
    let rec;
    try {
      const bodyFlags = h.r.u8();
      const dt = base ? h.tick - base.tick : 0;
      const q = decodeHot(h.r, base ? base.q : null, dt, h.tick);
      let cold;
      if (!base) {
        cold = decodeValue(h.r);
        if (!cold || typeof cold !== 'object' || Array.isArray(cold)) throw new RangeError('full COLD is not an object');
      } else if (bodyFlags & 2) {
        cold = base.cold;
      } else {
        cold = apply(plainClone(base.cold), decodePatch(h.r, 0, base.cold, dt));
      }
      if (h.r.remaining !== 0) throw new RangeError(`${h.r.remaining} trailing bytes`);
      rec = { seq: h.seq, tick: h.tick, q, cold, hadHot: (bodyFlags & 1) === 1 };
    } catch (err) {
      stats.corrupt += 1;
      return { ok: false, error: 'corrupt', seq: h.seq, message: String(err.message || err) };
    }
    ring.set(rec.seq, rec);
    if (rec.seq > newest) newest = rec.seq;
    prune();
    let hashOk = null;
    let view = null;
    if (h.hash) {
      view = viewTreeOf(rec, hotPath);
      hashOk = hashState(view) === h.hash;
      stats.hashChecks += 1;
      if (!hashOk) stats.hashMismatches += 1;
    }
    stats.decoded += 1;
    if (base) {
      stats.deltaCount += 1;
      stats.deltaBytes += u8.length;
    } else {
      stats.fullCount += 1;
      stats.fullBytes += u8.length;
    }
    stats.decodeMs.push(now() - t0);
    if (stats.decodeMs.length > 600) stats.decodeMs.shift();
    return {
      ok: true,
      duplicate: false,
      seq: h.seq,
      tick: h.tick,
      full: !base,
      baselineSeq: h.baselineSeq,
      lastInputSeqConsumed: h.lastInputSeqConsumed,
      flags: h.flags,
      upLossPct: h.upLossPct,
      inputBufferDepth: h.inputBufferDepth,
      hash: h.hash,
      hashOk,
      bytes: u8.length,
      // Fresh deep copies — consumers may mutate them freely.
      view: () => plainClone(view || viewTreeOf(rec, hotPath)),
      entities: () => plainClone(rec.q.map((qq) => viewEntity(qq, rec.tick))),
      quantised: rec.q,
    };
  }

  return {
    decode,
    get ackSeq() {
      return newest || null;
    },
    has: (s) => ring.has(s),
    reset() {
      ring.clear();
      newest = 0;
    },
    viewOf: (s) => (ring.has(s) ? plainClone(viewTreeOf(ring.get(s), hotPath)) : null),
    stats: () => ({
      ...stats,
      decodeMs: undefined,
      decodeMsP95: pct(stats.decodeMs, 0.95),
      fullAvg: stats.fullCount ? stats.fullBytes / stats.fullCount : 0,
      deltaAvg: stats.deltaCount ? stats.deltaBytes / stats.deltaCount : 0,
      ring: ring.size,
    }),
  };
}

// Stateless reference: the quantised view of a tree exactly as a guest would
// reconstruct it from a FULL snapshot taken at `tick` (tests / tools).
export function quantisedView(tree, tick, hotPath = HOT_PATH) {
  const { hot, cold, hadHot } = splitTree(cloneTree(tree), hotPath);
  const rec = { tick, q: hot.map((e) => quantizeEntity(e, tick, null)), cold, hadHot: hadHot !== false };
  return plainClone(viewTreeOf(rec, hotPath));
}
