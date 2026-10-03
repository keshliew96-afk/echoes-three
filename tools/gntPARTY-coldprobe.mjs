#!/usr/bin/env node
// PARTY GP.10 bandwidth diagnosis (Node): which COLD-tree paths change from
// one snapshot to the next (every 3 ticks) in Level 3 room 6 with the four
// MAX-STRESS builds, and how many encoded patch bytes each costs — the same
// split / diff / encode the host's snapshot.js uses (read-only imports).
//   node tools/gntPARTY-coldprobe.mjs [--ticks 1200] [--seed 7] [--root <checkout>]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(opt('root', here));
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const TICKS = Number(opt('ticks', 1200));
const SEED = Number(opt('seed', 7));

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { scriptedInput } = await import(u('src/sim/script.js'));
const { createStateIO } = await import(u('src/save/capture.js'));
const { splitTree } = await import(u('src/net/protocol/snapshot.js'));
const { quantizeEntity } = await import(u('src/net/protocol/quantize.js'));
const { encodeHotBytes } = await import(u('src/net/protocol/delta.js'));
const { diff, isEmptyPatch } = await import(u('src/net/protocol/treediff.js'));
const { encodePatch, KEY_DICT, STR_DICT } = await import(u('src/net/protocol/bvalue.js'));
const KD = new Set(KEY_DICT);
const SD = new Set(STR_DICT);
const unk = { keys: {}, strs: {}, shapes: {} };
function scanValue(v) {
  if (typeof v === 'string') {
    if (!SD.has(v)) unk.strs[v] = (unk.strs[v] || 0) + 1;
    return;
  }
  if (v === null || typeof v !== 'object') return;
  if (Array.isArray(v)) {
    for (const x of v) scanValue(x);
    return;
  }
  for (const [k, x] of Object.entries(v)) {
    if (!KD.has(k)) unk.keys[k] = (unk.keys[k] || 0) + 1;
    scanValue(x);
  }
}
const { ByteWriter, encodeEvents } = await import(u('src/net/protocol/codec.js'));
const { EVENT_SHAPES } = await import(u('src/net/protocol/evshapes.js'));
const SHAPES = new Set(EVENT_SHAPES);

let impl = createGameplayRng(SEED);
const rng = {
  stream: 'gameplay',
  get seed() { return impl.seed; },
  get drawIndex() { return impl.drawIndex; },
  float: () => impl.float(),
  range: (a, b) => impl.range(a, b),
  int: (n) => impl.int(n),
  chance: (q) => impl.chance(q),
  pick: (a) => impl.pick(a),
  reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
  getState: () => impl.getState(),
  setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
};
const registry = createRegistry();
const bus = createEventBus();
const clock = createClock();
const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
const io = createStateIO({ clock, rng, registry, world });
const step = (n) => {
  for (let k = 0, g = 0; k < n && g < n * 8 + 64; g++) if (clock.stepOnce((t) => world.step(t, scriptedInput(3, t, { skillSlots: 4 })))) k += 1;
};
world.runSystem().setHarnessGrant('max');
world.cmd('startCampaign', { level: 3 });
step(5);
const NATURAL = opt('natural', '0') === '1';
if (!NATURAL) world.cmd('skipToRoom', 6);
world.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto' });
step(240);
const bytesOf = (patch) => {
  const w = new ByteWriter(256);
  encodePatch(w, patch);
  return w.length ?? w.finish().length;
};
// Attribute a patch's bytes to its top paths: diff each depth-3 subtree alone.
function subtrees(t, depth = 3) {
  const out = {};
  const walk = (o, p, d) => {
    const lim = p.startsWith('systems.party') ? Number(opt('partyDepth', 6)) : depth;
    if (d >= lim || o === null || typeof o !== 'object') {
      out[p] = o;
      return;
    }
    for (const k of Object.keys(o)) walk(o[k], p ? `${p}.${k}` : k, d + 1);
  };
  walk(t, '', 0);
  return out;
}
let evWin = [];
bus.on('*', (e) => {
  if (e.type === 'sound' || e.predicted || e.view) return;
  evWin.push(e);
});
const evAcc = {};
let evTotal = 0;
const EMPTY = encodeEvents(255, 1, 0, 3, []).length;
// --age A: diff against the capture A snapshots back (a guest at N1 acks
// ~4 snapshots late, so the host deltas against an older baseline).
const AGE = Number(opt('age', 1));
const coldHist = [];
const hotHist = [];
let prev = splitTree(io.capture()).cold;
const anchors = new Map();
const quant = (hot, tick) => new Map(hot.map((e) => [e.id, quantizeEntity(e, tick, anchors)]));
let prevHot = quant(splitTree(io.capture()).hot, clock.tick);
const hotAcc = {};
let hotTotal = 0;
let hotEnc = 0;
const hotKind = {};
let prevKinds = new Map();
const acc = {};
let total = 0;
let snaps = 0;
for (let t = 0; t < TICKS; t += 3) {
  step(3);
  if (!NATURAL && world.runSystem().view().phase !== 'combat') {
    world.cmd('skipToRoom', 6);
    step(2);
  }
  const sp = splitTree(io.capture());
  const cold = sp.cold;
  const hot = quant(sp.hot, clock.tick);
  // Encoded HOT bytes (the real codec) — total and per entity kind (the
  // table restricted to that kind, against the same baseline subset).
  const kindOf = new Map(sp.hot.map((e) => [e.id, e.kind || '?']));
  for (const [id, k] of prevKinds) if (!kindOf.has(id)) kindOf.set(id, k);
  const curArr = [...hot.values()];
  hotHist.push(hot);
  if (hotHist.length > AGE + 1) hotHist.shift();
  const baseMap = AGE > 1 && hotHist.length === AGE + 1 ? hotHist[0] : prevHot;
  const baseArr = [...baseMap.values()];
  hotEnc += encodeHotBytes(curArr, baseArr).length;
  for (const kind of new Set(kindOf.values())) {
    const c = curArr.filter((q) => kindOf.get(q.id) === kind);
    const b = baseArr.filter((q) => kindOf.get(q.id) === kind);
    const n = encodeHotBytes(c, b).length - encodeHotBytes([], []).length;
    const r = (hotKind[kind] = hotKind[kind] || { bytes: 0, spawned: 0 });
    r.bytes += n;
    r.spawned += c.filter((q) => !baseMap.has(q.id)).length;
  }
  for (const q of curArr) if (!prevHot.has(q.id)) scanValue(q.rest);
  prevKinds = new Map(sp.hot.map((e) => [e.id, e.kind || '?']));
  for (const [id, q] of hot) {
    const pq = prevHot.get(id);
    const kind = (sp.hot.find((e) => e.id === id) || {}).kind || '?';
    if (!pq) continue;
    for (const k of new Set([...Object.keys(q.rest || {}), ...Object.keys(pq.rest || {})])) {
      const pk = diff({ v: pq.rest[k] ?? null }, { v: q.rest[k] ?? null });
      if (isEmptyPatch(pk)) continue;
      const key = `${kind}.${k}`;
      const r = (hotAcc[key] = hotAcc[key] || { changes: 0, bytes: 0 });
      r.changes += 1;
      const b = bytesOf(pk);
      r.bytes += b;
      hotTotal += b;
    }
  }
  prevHot = hot;
  const byType = {};
  for (const e of evWin) (byType[e.type] = byType[e.type] || []).push(e);
  evTotal += encodeEvents(255, 1, t, t + 3, evWin).length;
  for (const e of evWin) {
    const keys = Object.keys(e).filter((k) => k !== 'tick' && k !== 'type').sort().join(',');
    const sk = `${e.type}|${keys}`;
    if (!SHAPES.has(sk)) unk.shapes[sk] = (unk.shapes[sk] || 0) + 1;
    for (const [k, x] of Object.entries(e)) if (k !== 'tick' && k !== 'type') scanValue(x);
    if (!SD.has(e.type)) unk.strs[e.type] = (unk.strs[e.type] || 0) + 1;
  }
  for (const [ty, list] of Object.entries(byType)) {
    const r = (evAcc[ty] = evAcc[ty] || { n: 0, bytes: 0, shaped: 0 });
    r.n += list.length;
    r.bytes += encodeEvents(255, 1, t, t + 3, list).length - EMPTY;
    for (const e of list) {
      const keys = Object.keys(e).filter((k) => k !== 'tick' && k !== 'type').sort().join(',');
      if (SHAPES.has(`${e.type}|${keys}`)) r.shaped += 1;
    }
  }
  evWin = [];
  coldHist.push(cold);
  if (coldHist.length > AGE + 1) coldHist.shift();
  if (AGE > 1 && coldHist.length === AGE + 1) prev = coldHist[0];
  const p = diff(prev, cold);
  if (!isEmptyPatch(p)) {
    total += bytesOf(p);
    scanValue(p);
  }
  snaps += 1;
  const a = subtrees(prev);
  const b = subtrees(cold);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const pk = diff({ v: a[k] ?? null }, { v: b[k] ?? null });
    if (isEmptyPatch(pk)) continue;
    const r = (acc[k] = acc[k] || { changes: 0, bytes: 0 });
    r.changes += 1;
    r.bytes += bytesOf(pk);
  }
  prev = cold;
}
const rows = Object.entries(acc).sort((x, y) => y[1].bytes - x[1].bytes).slice(0, 30);
if (opt('dict', '0') === '1') {
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  console.log(JSON.stringify({ unknownKeys: top(unk.keys, 80), unknownStrings: top(unk.strs, 120), unshapedEvents: top(unk.shapes, 60) }));
  process.exit(0);
}
const hotRows = Object.entries(hotAcc).sort((x, y) => y[1].bytes - x[1].bytes).slice(0, 30);
console.log(JSON.stringify({ tool: 'gntPARTY-coldprobe', snapshots: snaps, coldBytesPerSnapshot: Math.round(total / snaps), perSec: Math.round((total / snaps) * 20), hotRestBytesPerSnapshot: Math.round(hotTotal / snaps), top: rows.map(([k, v]) => `${k} ${v.changes}x ${Math.round(v.bytes / snaps)} B/snap`), hotRest: hotRows.map(([k, v]) => `${k} ${v.changes}x ${(v.bytes / snaps).toFixed(1)} B/snap`), hotEncodedPerSnapshot: Math.round(hotEnc / snaps), hotByKind: Object.entries(hotKind).sort((x, y) => y[1].bytes - x[1].bytes).map(([k, v]) => `${k} ${(v.bytes / snaps).toFixed(1)} B/snap (${v.spawned} new)`), eventsBytesPerSec: Math.round((evTotal / snaps) * 20), events: Object.entries(evAcc).sort((x, y) => y[1].bytes - x[1].bytes).slice(0, 30).map(([k, v]) => `${k} n${v.n} ${Math.round((v.bytes / snaps) * 20)} B/s ${Math.round(v.bytes / v.n)} B/ev shaped ${v.shaped}/${v.n}`) }, null, 1));
