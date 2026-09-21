#!/usr/bin/env node
// gntM5a — pure protocol probes (docs/gauntlet/PLAN.md §7 G5a.3 tree-diff law,
// G5a.4 conditioner accuracy, codec round trips). No browser, no server.
//
//   node tools/gntM5a-protocol.mjs [--fuzz 10000] [--packets 10000] [--out captures/gntM5a-protocol.json]
//
// Prints one PASS/FAIL line per check and writes the report; exit 1 on any FAIL.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(resolve(here, p)).href;
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const FUZZ = Number(arg('fuzz', 10000));
const PACKETS = Number(arg('packets', 10000));
const OUT = arg('out', 'captures/gntM5a-protocol.json');

const { diff, diffValue, apply, applyOp, canonicalEqual } = await import(u('src/net/protocol/treediff.js'));
const { canonicalJSON, parseCanonical, cloneCanonical } = await import(u('src/core/canonical.js'));
const codec = await import(u('src/net/protocol/codec.js'));
const { createConditioner, parseCond, formatCond } = await import(u('src/net/protocol/conditioner.js'));
const msgs = await import(u('src/net/protocol/messages.js'));
const bv = await import(u('src/net/protocol/bvalue.js'));
const binPatch = (p) => {
  const w = new codec.ByteWriter(64);
  bv.encodePatch(w, p);
  const r = new codec.ByteReader(w.finish());
  const out = bv.decodePatch(r);
  if (r.remaining !== 0) throw new Error('trailing bytes after patch');
  return out;
};
const binValue = (v) => {
  const w = new codec.ByteWriter(64);
  bv.encodeValue(w, v);
  const bytes = w.finish();
  const r = new codec.ByteReader(bytes);
  const out = bv.decodeValue(r);
  if (r.remaining !== 0) throw new Error('trailing bytes after value');
  return { out, bytes: bytes.length };
};

const results = [];
let failed = 0;
function check(group, name, ok, detail = {}) {
  results.push({ group, name, ok: !!ok, ...detail });
  if (!ok) failed += 1;
  const d = Object.keys(detail).length ? '  ' + JSON.stringify(detail).slice(0, 300) : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${d}`);
}

// ------------------------------------------------------ tree-diff law --
// The law: canonicalJSON(apply(clone(a), diff(a, b))) === canonicalJSON(b),
// also after the patch crosses the wire (canonicalJSON -> parseCanonical).
// The binary wire form (bvalue.js) must carry the patch and both trees
// canonically unchanged too.
function law(a, b) {
  const p = diff(a, b);
  const wire = parseCanonical(canonicalJSON(p));
  const bin = binPatch(p);
  const out1 = canonicalJSON(apply(cloneCanonical(a), p));
  const out2 = canonicalJSON(apply(cloneCanonical(a), wire));
  const out3 = canonicalJSON(apply(cloneCanonical(a), bin));
  const want = canonicalJSON(b);
  const va = canonicalJSON(binValue(a).out) === canonicalJSON(a);
  const vb = canonicalJSON(binValue(b).out) === want;
  return { ok: out1 === want && out2 === want && out3 === want && va && vb, patch: p, out1, want };
}

const corpus = [
  ['value -> null', { a: 1, m: { x: 2 } }, { a: null, m: { x: 2 } }],
  ['null -> value', { a: null }, { a: { deep: [1, 2] } }],
  ['key deletion vs null', { a: 1, b: 2 }, { a: null }],
  ['null vs absent', { a: null }, {}],
  ['absent vs null', {}, { a: null }],
  ['undefined member == absent', { a: 1, b: undefined }, { a: 1 }],
  ['nested object -> scalar', { o: { p: { q: 1 } } }, { o: 7 }],
  ['scalar -> nested object', { o: 7 }, { o: { p: { q: 1 } } }],
  ['object -> array', { o: { 0: 1 } }, { o: [1] }],
  ['array element change', { a: [1, 2, 3] }, { a: [1, 9, 3] }],
  ['array insert (front)', { a: [1, 2, 3] }, { a: [0, 1, 2, 3] }],
  ['array remove (middle)', { a: [1, 2, 3, 4] }, { a: [1, 3, 4] }],
  ['array truncate', { a: [1, 2, 3, 4] }, { a: [1] }],
  ['array grow', { a: [1] }, { a: [1, 2, 3, null, [4]] }],
  ['array -> empty', { a: [1, 2] }, { a: [] }],
  ['empty -> array', { a: [] }, { a: [{ id: 1 }] }],
  ['array holes/undefined -> null', { a: [1, undefined, 3] }, { a: [1, null, 3] }],
  ['Map-as-pairs (waves.pending)', { pending: [[3, { t: 10 }], [5, { t: 12 }]] }, { pending: [[5, { t: 11 }], [7, { t: 20 }]] }],
  ['Map-as-pairs string keys (allies seats)', { seats: [['a', 1], ['b', 2]] }, { seats: [['b', 3], ['c', null]] }],
  ['id-keyed array (waves.schedule)', { schedule: [{ id: 1, at: 5 }, { id: 2, at: 9 }] }, { schedule: [{ id: 2, at: 9 }, { id: 3, at: 12 }, { id: 1, at: 6 }] }],
  ['id-keyed reorder only', { q: [{ id: 1 }, { id: 2 }, { id: 3 }] }, { q: [{ id: 3 }, { id: 1 }, { id: 2 }] }],
  ['id-keyed echoQueue with null fields', { echoQueue: [{ id: 'e1', due: 30, aim: null }] }, { echoQueue: [{ id: 'e1', due: 30, aim: { x: 1, z: 2 } }, { id: 'e2', due: 40, aim: null }] }],
  ['duplicate ids fall back to index diff', { q: [{ id: 1, v: 1 }, { id: 1, v: 2 }] }, { q: [{ id: 1, v: 3 }] }],
  ['mixed id types fall back', { q: [{ id: 1 }, { id: '2' }] }, { q: [{ id: '2' }] }],
  ['NaN stays NaN', { n: NaN }, { n: NaN }],
  ['number -> NaN', { n: 1 }, { n: NaN }],
  ['NaN -> number', { n: NaN }, { n: 0 }],
  ['+Infinity / -Infinity', { a: Infinity, b: 1 }, { a: -Infinity, b: Infinity }],
  ['-0 vs 0 differ', { z: 0 }, { z: -0 }],
  ['-0 -> 0', { z: -0 }, { z: 0 }],
  ['-0 inside arrays', { a: [0, -0] }, { a: [-0, 0] }],
  ['boss.js -Infinity state', { boss: { lastTelegraph: -Infinity, bossId: 12 } }, { boss: { lastTelegraph: 480, bossId: null } }],
  ['allies mark / rallyPoint null', { allies: { mark: { id: 4 }, rallyPoint: { x: 1, z: 2 } } }, { allies: { mark: null, rallyPoint: null } }],
  ['run reward/path/shop/frame', { run: { reward: { kind: 'skill' }, path: null, shop: null, frame: [1, 2] } }, { run: { reward: null, path: { doors: [0, 1] }, shop: { items: [] }, frame: null } }],
  ['empty containers', { a: {}, b: [], c: { d: {} } }, { a: [], b: {}, c: { d: [] } }],
  ['identical', { a: [1, { b: [null, NaN, -0] }] }, { a: [1, { b: [null, NaN, -0] }] }],
  ['string / boolean changes', { s: 'x', f: true }, { s: 'y', f: false }],
  ['deep nesting', { a: { b: { c: { d: { e: [1, [2, [3, { f: null }]]] } } } } }, { a: { b: { c: { d: { e: [1, [2, [3, { f: 0 }]]] } } } } }],
];
let corpusFails = 0;
for (const [name, a, b] of corpus) {
  const r = law(a, b);
  if (!r.ok) corpusFails += 1;
  check('treediff-corpus', name, r.ok, r.ok ? {} : { out: r.out1, want: r.want, patch: r.patch });
}
check('treediff', 'diff(a, a) = {} on every corpus pair', corpus.every(([, a, b]) => Object.keys(diff(a, a)).length === 0 && Object.keys(diff(b, b)).length === 0));
// Which op the auto-detection picked (the spec's intent, not just the law).
const opOf = (a, b, k) => diff(a, b)[k] && diff(a, b)[k][0];
check('treediff', "Map-as-pairs arrays use 'k' idKey 0", opOf({ p: [[1, 'a']] }, { p: [[2, 'b']] }, 'p') === 'k' && diff({ p: [[1, 'a']] }, { p: [[2, 'b']] }).p[1] === 0);
check('treediff', "id-keyed arrays use 'k' idKey 'id'", opOf({ s: [{ id: 1 }] }, { s: [{ id: 2 }] }, 's') === 'k' && diff({ s: [{ id: 1 }] }, { s: [{ id: 2 }] }).s[1] === 'id');
check('treediff', "plain arrays use 'a'", opOf({ a: [1] }, { a: [2] }, 'a') === 'a');
check('treediff', "null is carried with 's' (not deletion)", JSON.stringify(diff({ a: 1 }, { a: null })) === '{"a":["s",null]}');
check('treediff', "deletion is 'd'", JSON.stringify(diff({ a: 1 }, {})) === '{"a":["d"]}');
{
  let threw = 0;
  for (const bad of [{ x: ['z'] }, { x: ['a', -1, []] }, { x: ['k', 'id', [5], {}] }, { __proto__x: 1 }]) {
    try {
      apply({ x: [1] }, bad);
    } catch {
      threw += 1;
    }
  }
  let polluted = false;
  try {
    apply({}, JSON.parse('{"__proto__":["o",{"polluted":["s",1]}]}'));
  } catch {
    /* expected */
  }
  polluted = ({}).polluted === 1;
  check('treediff', 'corrupt / hostile patches throw, never pollute prototypes', threw >= 3 && !polluted, { threw, polluted });
}

// --------------------------------------------------------------- fuzz --
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry(12345);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const KEYS = ['a', 'b', 'c', 'id', 'x', 'z', 'hp', 'mark', 'rallyPoint', 'reward', 'path', 'q', 'n', 'k0', 'k1'];
function scalar() {
  return pick([null, 0, -0, 1, -1, 2.5, NaN, Infinity, -Infinity, 1e-9, 123456789, 'a', 'b', '', true, false, 0.1 + 0.2]);
}
function value(depth) {
  const r = R();
  if (depth <= 0 || r < 0.45) return scalar();
  if (r < 0.62) {
    const o = {};
    const n = Math.floor(R() * 5);
    for (let i = 0; i < n; i++) o[pick(KEYS)] = R() < 0.1 ? undefined : value(depth - 1);
    return o;
  }
  if (r < 0.74) {
    const n = Math.floor(R() * 5);
    const out = [];
    for (let i = 0; i < n; i++) out.push(value(depth - 1));
    return out;
  }
  if (r < 0.87) {
    // entity-like id-keyed array
    const n = Math.floor(R() * 5);
    const ids = new Set();
    const out = [];
    for (let i = 0; i < n; i++) {
      const id = Math.floor(R() * 8);
      if (ids.has(id)) continue;
      ids.add(id);
      out.push({ id, v: value(depth - 1), w: scalar() });
    }
    return out;
  }
  // Map-as-pairs
  const n = Math.floor(R() * 5);
  const ks = new Set();
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = R() < 0.5 ? Math.floor(R() * 6) : pick(['s', 't', 'u', 'v']);
    if (ks.has(String(k))) continue;
    ks.add(String(k));
    out.push([k, value(depth - 1)]);
  }
  return out;
}
function rootObj() {
  const o = {};
  const n = 1 + Math.floor(R() * 6);
  for (let i = 0; i < n; i++) o[pick(KEYS)] = value(3);
  return o;
}
function mutate(v, depth) {
  if (R() < 0.15 || depth > 4) return value(2);
  if (Array.isArray(v)) {
    const out = v.map((x) => (R() < 0.3 ? mutate(x, depth + 1) : cloneCanonical(x === undefined ? null : x)));
    const r = R();
    if (r < 0.2) out.splice(Math.floor(R() * (out.length + 1)), 0, value(2));
    else if (r < 0.35 && out.length) out.splice(Math.floor(R() * out.length), 1);
    else if (r < 0.45) out.reverse();
    return out;
  }
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) {
      if (v[k] === undefined) continue;
      const r = R();
      if (r < 0.12) continue; // delete
      out[k] = r < 0.4 ? mutate(v[k], depth + 1) : cloneCanonical(v[k]);
    }
    if (R() < 0.3) out[pick(KEYS)] = value(2);
    return out;
  }
  return R() < 0.5 ? scalar() : v;
}
let fuzzFails = 0;
let firstFail = null;
const t0 = Date.now();
for (let i = 0; i < FUZZ; i++) {
  const a = rootObj();
  const b = i % 3 === 0 ? rootObj() : mutate(a, 0);
  const bb = b && typeof b === 'object' && !Array.isArray(b) ? b : { wrapped: b };
  let ok;
  try {
    ok = law(a, bb).ok && Object.keys(diff(a, a)).length === 0;
  } catch (err) {
    ok = false;
    if (!firstFail) firstFail = { i, error: String(err.message) };
  }
  if (!ok) {
    fuzzFails += 1;
    if (!firstFail) firstFail = { i, a: canonicalJSON(a), b: canonicalJSON(bb) };
  }
}
{
  // Binary value codec: every number class exact, sizes as documented.
  const nums = [0, -0, 1, -1, 12.34, -0.01, 0.1 + 0.2, 1 / 3, 1e300, -1e-300, 2 ** 53, 2 ** 53 + 2, 5e-324, NaN, Infinity, -Infinity, 1 / 256, 1023.99609375];
  const same = nums.every((n) => Object.is(binValue(n).out, n));
  const small = binValue({ castLeftTicks: 11 }).bytes;
  const w = new codec.ByteWriter(8);
  bv.encodePatch(w, { castLeftTicks: ['s', 11] });
  const patchBytes = w.finish().length;
  check('bvalue', `numbers exact (-0, NaN, ±Inf, subnormal, 2^53+2); {"castLeftTicks":["s",11]} = ${patchBytes} bytes vs ${JSON.stringify({ castLeftTicks: ['s', 11] }).length} JSON`, same && patchBytes <= 6, { valueBytes: small, patchBytes });
  let threw = 0;
  for (const bad of [[99], [10, 5], [9, 200], [8, 250], [3]]) {
    try {
      bv.decodeValue(new codec.ByteReader(new Uint8Array(bad)));
    } catch {
      threw += 1;
    }
  }
  check('bvalue', 'corrupt / truncated input throws (never reads past the frame)', threw === 5, { threw });
}
check('treediff-fuzz', `${FUZZ} random pairs satisfy the law (JSON and binary wire forms)`, fuzzFails === 0, { pairs: FUZZ, failures: fuzzFails, ms: Date.now() - t0, firstFail });

// -------------------------------------------------------------- codec --
{
  const w = new codec.ByteWriter(4);
  const vals = [0, 1, 127, 128, 16383, 16384, 2 ** 31 - 1, 2 ** 31, 2 ** 32, 2 ** 53 - 1];
  const ivals = [0, -1, 1, -64, 64, -(2 ** 40), 2 ** 40, -(2 ** 52), 2 ** 52 - 1];
  vals.forEach((v) => w.varu(v));
  ivals.forEach((v) => w.vari(v));
  w.u16(65535).i16(-32768).u32(0xffffffff).f64(-0).str('héllo ✓ 🐉');
  const r = new codec.ByteReader(w.finish());
  const okU = vals.every((v) => r.varu() === v);
  const okI = ivals.every((v) => r.vari() === v);
  const okRest = r.u16() === 65535 && r.i16() === -32768 && r.u32() === 0xffffffff && Object.is(r.f64(), -0) && r.str() === 'héllo ✓ 🐉' && r.remaining === 0;
  let truncThrows = false;
  try {
    new codec.ByteReader(new Uint8Array([0x80, 0x80])).varu();
  } catch {
    truncThrows = true;
  }
  check('codec', 'varu / vari / fixed ints / f64 / utf8 round trip; truncation throws', okU && okI && okRest && truncThrows);
  const frames = [];
  for (let i = 0; i < 6; i++) frames.push({ seq: 100 + i, tick: 5000 + i, viewTick: 4990.375 + i, move: i % 9, basic: i % 2 === 0, revive: i === 3, away: i === 5, aimX: -12.5 + i / 64, aimZ: 7.25, press: (1 << i) | (i === 4 ? 1 << 9 : 0) });
  const pkt = codec.encodeInputPacket(2, 777, frames);
  const dec = codec.decodeInputPacket(pkt);
  const same = dec.ackSnapSeq === 777 && dec.frames.length === 6 && dec.frames.every((f, i) => f.seq === frames[i].seq && f.tick === frames[i].tick && f.viewTick === frames[i].viewTick && f.move === frames[i].move && f.basic === frames[i].basic && f.revive === frames[i].revive && f.away === frames[i].away && f.aimX === frames[i].aimX && f.aimZ === frames[i].aimZ && f.press === frames[i].press);
  check('codec', `INPUT packet (6 redundant frames) round trip exact, ${pkt.length} bytes`, same, { bytes: pkt.length });
  const evs = [{ tick: 5, type: 'hit', target: 3, amount: 12.5, crit: false }, { tick: 5, type: 'death', id: 3, cause: null, t: -0 }];
  const e2 = codec.decodeEvents(codec.encodeEvents(1, 9, 3, 6, evs));
  check('codec', 'EVENTS batch round trip canonical-exact (incl. -0, null)', canonicalJSON(e2.events) === canonicalJSON(evs) && e2.batchSeq === 9 && e2.fromTick === 3 && e2.toTick === 6);
  const c2 = codec.decodeCmd(codec.encodeCmd(3, 4, { kind: 'ping_door', door: 1 }));
  check('codec', 'CMD round trip', c2.seat === 3 && c2.cmdSeq === 4 && c2.cmd.door === 1);
  const tree = { v: 1, clock: { tick: 9 }, boss: { t: -Infinity }, z: -0, list: [NaN] };
  const kf = codec.encodeKeyframe(1234, tree);
  const k2 = codec.decodeKeyframe(kf);
  const b64 = codec.toBase64(kf);
  const back = codec.fromBase64(b64);
  check('codec', 'KEYFRAME exact + base64 round trip', k2.tick === 1234 && canonicalJSON(k2.tree) === canonicalJSON(tree) && codec.keyframeTick(kf) === 1234 && back.length === kf.length && back.every((x, i) => x === kf[i]));
  let b64ok = true;
  for (let n = 0; n < 40; n++) {
    const arr = new Uint8Array(n).map((_, i) => (i * 97 + n) & 255);
    const rt = codec.fromBase64(codec.toBase64(arr));
    if (rt.length !== n || !rt.every((x, i) => x === arr[i])) b64ok = false;
  }
  check('codec', 'base64 every length 0..39', b64ok);
}

// ---------------------------------------------------------- messages --
{
  const good = msgs.decodeClientMessage(JSON.stringify({ t: 'join_room', code: 'ab cd-e', seat: 2 }));
  const bads = ['{', '[]', '{"t":1}', '{"t":"nope"}', '{"t":"join_room","code":"ABC"}', '{"t":"join_room","code":"ABCDE","seat":0}', '{"t":"set_ready","ready":"yes"}', '{"t":"hello","v":1}', 'x'.repeat(5000)];
  const reasons = bads.map((b) => msgs.decodeClientMessage(b));
  check('messages', 'valid join normalises the code; malformed messages map to explicit reasons', good.ok && good.msg.code === 'ABCDE' && reasons.every((r) => !r.ok && typeof r.reason === 'string'), { reasons: reasons.map((r) => r.reason) });
  check('messages', 'names sanitised (control chars stripped, 16 code points)', msgs.sanitizeName('' + String.fromCharCode(7) + '  Ædelweiß the Brave and Bold' + String.fromCharCode(0x202e) + ' ') === 'Ædelweiß the Bra' && msgs.sanitizeName('   ') === 'Player');
}

// ------------------------------------------------------- conditioner --
// Measured in virtual time with plan(): 10 000 packets at 60 Hz per case.
function measure(spec, { reliable = false, n = PACKETS, bytes = 200, intervalMs = 1000 / 60 } = {}) {
  let t = 0;
  const c = createConditioner(spec, { now: () => t, setTimer: () => 0, clearTimer: () => {} });
  const arrivals = [];
  let dropped = 0;
  let dups = 0;
  const delays = [];
  for (let i = 0; i < n; i++) {
    t = i * intervalMs;
    const p = c.plan(t, { reliable, bytes });
    if (p.dropped) dropped += 1;
    if (p.times.length > 1) dups += p.times.length - 1;
    if (p.times.length) delays.push(p.times[0] - t);
    for (const at of p.times) arrivals.push({ i, at });
  }
  arrivals.sort((a, b) => a.at - b.at || a.i - b.i);
  // Reordered = arrived after a packet that was sent later (first copy only).
  let maxSeen = -1;
  let reordered = 0;
  const seen = new Set();
  for (const a of arrivals) {
    if (seen.has(a.i)) continue;
    seen.add(a.i);
    if (a.i < maxSeen) reordered += 1;
    else maxSeen = a.i;
  }
  const mean = delays.reduce((s, d) => s + d, 0) / Math.max(1, delays.length);
  const std = Math.sqrt(delays.reduce((s, d) => s + (d - mean) ** 2, 0) / Math.max(1, delays.length));
  return { n, lossPct: (dropped / n) * 100, dupPct: (dups / n) * 100, reorderPct: (reordered / n) * 100, meanMs: mean, stdMs: std, stats: c.stats(), lastAt: arrivals.length ? arrivals[arrivals.length - 1].at : 0 };
}
const within = (got, want, rel = 0.1) => Math.abs(got - want) <= Math.abs(want) * rel;
const cond = {};
{
  const m = measure({ latencyMs: 75, seed: 107 });
  cond.latency = m;
  check('conditioner', `latency 75 ms -> mean ${m.meanMs.toFixed(2)} ms (±10%)`, within(m.meanMs, 75) && m.stdMs < 1e-6);
}
{
  const m = measure({ latencyMs: 75, jitterMs: 10, seed: 108 });
  cond.jitter = m;
  check('conditioner', `jitter σ 10 ms -> measured σ ${m.stdMs.toFixed(2)} ms, mean ${m.meanMs.toFixed(2)} (±10%)`, within(m.stdMs, 10) && within(m.meanMs, 75));
}
// Seeded (reproducible) and sized so each rate is judged on >= 1600 expected
// events (±10% relative = 4σ): the headline 10% case uses exactly 10 000.
const nFor = (p) => Math.max(PACKETS, Math.ceil(1600 / p));
for (const [p, seed] of [[0.1, 101], [0.2, 102], [0.01, 103]]) {
  const m = measure({ latencyMs: 50, loss: p, seed }, { n: nFor(p) });
  cond[`loss${p}`] = m;
  check('conditioner', `loss ${p * 100}% -> ${m.lossPct.toFixed(2)}% over ${m.n} packets (±10% rel)`, within(m.lossPct, p * 100));
}
{
  // Unseeded repeat of the gate's headline: 10% over 10 000, 20 runs, every one 9-11%.
  const runs = [];
  for (let i = 0; i < 20; i++) runs.push(measure({ latencyMs: 50, loss: 0.1 }, { n: 10000 }).lossPct);
  cond.loss10Runs = runs;
  check('conditioner', `loss 10% x 20 unseeded runs of 10 000 packets: ${Math.min(...runs).toFixed(2)}-${Math.max(...runs).toFixed(2)}% (gate 9-11%)`, runs.every((r) => r >= 9 && r <= 11));
}
{
  const m = measure({ latencyMs: 50, dup: 0.01, seed: 104 }, { n: nFor(0.01) });
  cond.dup = m;
  check('conditioner', `dup 1% -> ${m.dupPct.toFixed(3)}% over ${m.n} packets (±10% rel)`, within(m.dupPct, 1));
}
{
  const m = measure({ latencyMs: 50, reorder: 0.02, seed: 105 }, { n: nFor(0.02) });
  cond.reorder = m;
  check('conditioner', `reorder 2% (+20-60 ms) -> ${m.reorderPct.toFixed(3)}% arrive out of order over ${m.n} packets (±10% rel)`, within(m.reorderPct, 2));
}
{
  // Gilbert–Elliott N3: pGB 0.05, pBG 0.3, lossInBad 0.8 -> 0.8 × 0.05/0.35 = 11.43 %
  const m = measure({ latencyMs: 75, burstLoss: { pGB: 0.05, pBG: 0.3, lossInBad: 0.8 }, seed: 106 }, { n: Math.max(PACKETS, 50000) });
  cond.burst = m;
  const want = (0.8 * 0.05) / 0.35 * 100;
  check('conditioner', `burst loss (GE 0.05/0.3/0.8) -> ${m.lossPct.toFixed(2)}% vs ${want.toFixed(2)}% (±10% rel)`, within(m.lossPct, want));
}
{
  // Reliable class: loss becomes delay, order kept, nothing dropped.
  const m = measure({ latencyMs: 50, loss: 0.2 }, { reliable: true });
  const inOrder = (() => {
    let t = 0;
    const c = createConditioner({ latencyMs: 50, jitterMs: 20, loss: 0.2 }, { now: () => t, setTimer: () => 0, clearTimer: () => {} });
    let last = -1;
    for (let i = 0; i < 2000; i++) {
      t = i * 16;
      const p = c.plan(t, { reliable: true });
      if (p.times.length !== 1 || p.times[0] < last) return false;
      last = p.times[0];
    }
    return true;
  })();
  cond.reliable = m;
  check('conditioner', `reliable class: 0 dropped at 20% loss, in order, retransmit delay adds ${(m.meanMs - 50).toFixed(1)} ms mean`, m.lossPct === 0 && inOrder && m.meanMs > 50 + 200 * 0.2 * 0.8);
}
{
  // Bandwidth 64 kbit/s = 8000 B/s: 200-byte packets at 60 Hz (12 000 B/s offered).
  const m = measure({ latencyMs: 20, bandwidthKbps: 64 }, { n: 6000, bytes: 200 });
  const deliveredBytesPerSec = ((m.n - m.lossPct / 100 * m.n) * 200) / ((m.n / 60));
  cond.bandwidth = { ...m, deliveredBytesPerSec };
  check('conditioner', `bandwidth 64 kbit/s -> ${deliveredBytesPerSec.toFixed(0)} B/s delivered (±10% of 8000), excess tail-dropped`, within(deliveredBytesPerSec, 8000));
}
{
  // Outage { at 1000, for 500 }: unreliable dropped inside the window only.
  let t = 0;
  const c = createConditioner({ latencyMs: 10, outage: { atMs: 1000, forMs: 500 } }, { now: () => t, setTimer: () => 0, clearTimer: () => {} });
  let inWin = 0;
  let droppedIn = 0;
  let droppedOut = 0;
  let relAfter = true;
  for (let i = 0; i < 180; i++) {
    t = i * (1000 / 60);
    const p = c.plan(t, { reliable: false });
    const inside = t >= 1000 && t < 1500;
    if (inside) inWin += 1;
    if (p.dropped && inside) droppedIn += 1;
    if (p.dropped && !inside) droppedOut += 1;
    if (inside) {
      const pr = c.plan(t, { reliable: true });
      if (pr.times[0] < 1500) relAfter = false;
    }
  }
  check('conditioner', `outage 1000+500 ms: ${droppedIn}/${inWin} unreliable dropped inside, ${droppedOut} outside, reliable held until the link returns`, droppedIn === inWin && droppedOut === 0 && relAfter);
}
{
  // Real timers: send() through setTimeout keeps reliable order and delivers.
  const c = createConditioner({ latencyMs: 30, jitterMs: 15, loss: 0.3 });
  const got = [];
  await new Promise((res) => {
    for (let i = 0; i < 50; i++) c.send(i, { reliable: true, bytes: 10 }, (p) => {
      got.push(p);
      if (got.length === 50) res();
    });
    setTimeout(res, 8000);
  });
  check('conditioner', 'live timers: 50 reliable sends at 30% loss all delivered in order', got.length === 50 && got.every((v, i) => v === i));
  const spec = parseCond('lat75,jit10,loss10,dup1,reo2,burst0.05:0.3:0.8,bw256,out5000:3000,seed7');
  check('conditioner', 'compact spec parses and formats back', spec.latencyMs === 75 && spec.jitterMs === 10 && Math.abs(spec.loss - 0.1) < 1e-12 && spec.burstLoss.pGB === 0.05 && spec.bandwidthKbps === 256 && spec.outage.forMs === 3000 && spec.seed === 7 && parseCond(formatCond(spec)).reorder === spec.reorder, { formatted: formatCond(spec) });
  let bad = false;
  try {
    parseCond('lat75,wat3');
  } catch {
    bad = true;
  }
  check('conditioner', 'unknown spec terms are rejected with a message', bad);
}

const report = { schema: 'gntM5a-protocol/1', at: new Date().toISOString(), failed, checks: results.length, conditioner: cond, results };
mkdirSync(dirname(resolve(here, OUT)), { recursive: true });
writeFileSync(resolve(here, OUT), JSON.stringify(report, null, 1));
console.log(`\n${results.length - failed}/${results.length} checks pass -> ${OUT}`);
process.exit(failed ? 1 : 0);
