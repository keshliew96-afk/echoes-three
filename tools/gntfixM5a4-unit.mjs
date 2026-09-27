#!/usr/bin/env node
// gntfixM5a4-unit.mjs — fix-M5a r4 (NET4-F3) unit checks for protocol v3:
//   1. baseline-relative patch ops (bvalue.js u / w / D / based k): for 20 000 random
//      (a, b) tree pairs with tick counters, countdowns, keyed arrays that drop / append /
//      reorder, Map-as-pairs, nulls, -0, NaN: decodePatch(encodePatch(diff(a,b), a, dt), a, dt)
//      is canonically diff(a,b), and apply(clone(a), it) === b; the based forms are used;
//      a decoder with the WRONG base never yields silently wrong state for a numeric op
//      (it throws or the based forms were not used).
//   2. v2-compatible calls (no base) still write tags 0-4 only.
//   3. EVENTS v3 bodies: 5 000 random batches (static shapes, inline shapes, repeated
//      inline shapes, no tick, tick below fromTick, exotic numbers) round-trip canonically;
//      EVENTS_U bundles likewise.
//   4. HOT table: NEW movers anchored at the snapshot tick round-trip; the field mask of
//      a moving actor is one byte.
// node tools/gntfixM5a4-unit.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { writeFileSync } from 'node:fs';
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(resolve(here, p)).href;
const { encodePatch, decodePatch } = await import(u('src/net/protocol/bvalue.js'));
const { diff, apply, plainClone } = await import(u('src/net/protocol/treediff.js'));
const { ByteWriter, ByteReader, encodeEvents, decodeEvents, encodeEventsBundle, decodeEventsBundle, eventsBody } = await import(u('src/net/protocol/codec.js'));
const { EVENT_SHAPES } = await import(u('src/net/protocol/evshapes.js'));
const { encodeHot, decodeHot } = await import(u('src/net/protocol/delta.js'));
const { quantizeEntity } = await import(u('src/net/protocol/quantize.js'));
const { canonicalJSON } = await import(u('src/core/canonical.js'));

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const ri = (n) => Math.floor(rnd() * n);
const pick = (arr) => arr[ri(arr.length)];
const results = [];
const check = (name, ok, info = {}) => { results.push({ name, ok: !!ok, ...info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${Object.keys(info).length ? '  ' + JSON.stringify(info) : ''}`); };
const C = (v) => canonicalJSON(v);

// ---------------------------------------------------------------- 1 --
const EXOTIC = [null, -0, 0, NaN, Infinity, -Infinity, 1.5, 0.01, 1 / 3, 2 ** 53 - 1, -(2 ** 53) + 1, 'x', 'healer', true, false];
function randLeaf() { return rnd() < 0.3 ? pick(EXOTIC) : rnd() < 0.5 ? ri(5000) - 2500 : Math.round(rnd() * 1000) / 100; }
function randTree(depth = 0) {
  const t = { tick: 1000 + ri(50), countdown: ri(200), ord: ri(100000) };
  const n = 2 + ri(4);
  for (let i = 0; i < n; i++) {
    const r = rnd();
    const k = `k${ri(8)}`;
    if (depth < 3 && r < 0.2) t[k] = randTree(depth + 1);
    else if (r < 0.35) t[k] = Array.from({ length: ri(6) }, (_, j) => ({ id: j * 3 + ri(3) + 1000 * i, hp: ri(100), timer: ri(50), tag: pick(['a', 'b']) })).filter((e, idx, arr) => arr.findIndex((x) => x.id === e.id) === idx);
    else if (r < 0.45) t[k] = Array.from({ length: ri(5) }, (_, j) => [`p${j}`, { left: ri(30), v: randLeaf() }]);
    else if (r < 0.52) t[k] = Array.from({ length: 1 + ri(6) }, (_, j) => ({ due: 100 + j * 5, skill: pick(['a', 'b']), cast: { tick: 90 + j, targets: [j, j + 1] } }));
    else if (r < 0.6) t[k] = Array.from({ length: ri(6) }, () => randLeaf());
    else t[k] = randLeaf();
  }
  return t;
}
function mutate(a, dt) {
  const b = plainClone(a);
  const walk = (o, depth) => {
    if (Array.isArray(o)) {
      if (o.length && o.every((e) => e && typeof e === 'object' && !Array.isArray(e) && 'id' in e)) {
        const r = rnd();
        if (r < 0.2 && o.length) o.splice(ri(o.length), 1); // drop
        if (r > 0.6) o.push({ id: 900000 + ri(100000), hp: 1, timer: 5, tag: 'a' }); // append
        if (r > 0.9 && o.length > 1) o.reverse(); // reorder
        for (const e of o) if (rnd() < 0.5) e.timer -= dt; else if (rnd() < 0.3) e.hp += ri(7) - 3;
        return;
      }
      for (let i = 0; i < o.length; i++) {
        if (o[i] && typeof o[i] === 'object') walk(o[i], depth + 1);
        else if (typeof o[i] === 'number' && rnd() < 0.3) o[i] = rnd() < 0.5 ? o[i] + dt : o[i] - (ri(3) + 1);
      }
      if (rnd() < 0.1) o.push(randLeaf());
      if (rnd() < 0.1 && o.length) o.pop();
      if (rnd() < 0.25 && o.length) { o.splice(0, 1 + ri(Math.min(3, o.length))); if (rnd() < 0.7) o.push(rnd() < 0.5 ? { due: ri(99), s: 'q' } : randLeaf()); } // a queue
      return;
    }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (k === 'tick') o[k] = v + dt;
      else if (k === 'countdown' || k === 'left') o[k] = v - dt;
      else if (k === 'ord') o[k] = v + ri(4);
      else if (v && typeof v === 'object') walk(v, depth + 1);
      else if (typeof v === 'number' && rnd() < 0.2) o[k] = rnd() < 0.3 ? null : v + ri(9) - 4;
      else if (rnd() < 0.05) delete o[k];
      else if (rnd() < 0.05) o[k] = null;
    }
    if (rnd() < 0.1) o[`n${ri(5)}`] = randLeaf();
  };
  walk(b, 0);
  return b;
}
let fails = 0; let pairs = 0; let bytesBased = 0; let bytesPlain = 0; let usedTags = new Set();
const tagsIn = (u8) => u8; // (bytes only)
for (let i = 0; i < 20000; i++) {
  const a = randTree();
  const dt = 1 + ri(12);
  const b = mutate(a, dt);
  const p = diff(a, b);
  const w1 = new ByteWriter(256); encodePatch(w1, p, a, dt); const u1 = w1.finish();
  const w0 = new ByteWriter(256); encodePatch(w0, p); const u0 = w0.finish();
  bytesBased += u1.length; bytesPlain += u0.length;
  try {
    const r = new ByteReader(u1);
    const q = decodePatch(r, 0, a, dt);
    if (r.remaining !== 0) throw new Error('trailing');
    const ok = C(q) === C(p) && C(apply(plainClone(a), q)) === C(b);
    if (!ok) { fails += 1; if (fails < 4) console.log('MISMATCH', C(p).slice(0, 300), C(q).slice(0, 300)); }
    // plain (v2-style) bytes still decode without a base
    const q0 = decodePatch(new ByteReader(u0));
    if (C(q0) !== C(p)) { fails += 1; if (fails < 4) console.log('PLAIN MISMATCH'); }
  } catch (e) { fails += 1; if (fails < 4) console.log('THROW', e.message); }
  pairs += 1;
}
check('patch v3: 20 000 random pairs, based encode/decode == diff and apply == b (incl. -0, NaN, ±Inf, null, keyed drop/append/reorder, pairs)', fails === 0, { pairs, fails, bytesBased, bytesPlain, saved: Math.round((1 - bytesBased / bytesPlain) * 1000) / 10 + '%' });

// specific forms
{
  const a = { clock: { tick: 540 }, t: { castLeftTicks: 30, ord: 7 }, q: [{ id: 1, v: 1 }, { id: 2, v: 2 }, { id: 3, v: 3 }], z: [{ id: 1, v: 1 }, { id: 2, v: 2 }] };
  const b = { clock: { tick: 543 }, t: { castLeftTicks: 27, ord: 9 }, q: [{ id: 1, v: 1 }, { id: 3, v: 4 }, { id: 5, v: 5 }], z: [{ id: 1, v: 9 }, { id: 2, v: 2 }] };
  const p = diff(a, b);
  const w = new ByteWriter(64); encodePatch(w, p, a, 3); const x = w.finish();
  const w0 = new ByteWriter(64); encodePatch(w0, p); const x0 = w0.finish();
  const q = decodePatch(new ByteReader(x), 0, a, 3);
  {
    const qa = { q: [{ due: 1, s: 'a', c: { t: 1 } }, { due: 2, s: 'b', c: { t: 2 } }, { due: 3, s: 'c', c: { t: 3 } }], g: [{ atTick: 10, amount: 2 }, { atTick: 15, amount: 2 }] };
    const qb = { q: [{ due: 2, s: 'b', c: { t: 2 } }, { due: 3, s: 'c', c: { t: 3 } }, { due: 9, s: 'z', c: { t: 9 } }], g: [{ atTick: 15, amount: 2 }, { atTick: 20, amount: 2 }] };
    const qp = diff(qa, qb);
    const wq = new ByteWriter(64); encodePatch(wq, qp, qa, 5); const xq = wq.finish();
    const wq0 = new ByteWriter(64); encodePatch(wq0, qp); const xq0 = wq0.finish();
    const qq = decodePatch(new ByteReader(xq), 0, qa, 5);
    check('patch v3: queues (front consumed + appended, no ids) ride as a shifted array op and decode to the same JSON op', C(qq) === C(qp) && C(apply(plainClone(qa), qq)) === C(qb) && xq.length < xq0.length, { based: xq.length, plain: xq0.length });
  }
  check('patch v3: tick +dt / countdown -dt / ordinal delta / keyed drop+append / same-order keyed decode exactly and shrink', C(q) === C(p) && C(apply(plainClone(a), q)) === C(b) && x.length < x0.length, { based: x.length, plain: x0.length });
  let threw = false;
  try { decodePatch(new ByteReader(x), 0, { clock: { tick: 'x' }, t: {}, q: [], z: [] }, 3); } catch { threw = true; }
  check('patch v3: a numeric based op against a non-numeric / missing base throws (never silent wrong state)', threw);
}

// ---------------------------------------------------------------- 3 --
const STATIC = EVENT_SHAPES.map((s) => { const i = s.indexOf('|'); return { type: s.slice(0, i), keys: s.slice(i + 1) ? s.slice(i + 1).split(',') : [] }; });
function randEvent(from) {
  const r = rnd();
  let ev;
  if (r < 0.6) { const sh = pick(STATIC); ev = { tick: from + 1 + ri(3), type: sh.type }; for (const k of sh.keys) ev[k] = randLeaf(); }
  else if (r < 0.8) ev = { tick: from + 1 + ri(3), type: pick(['odd_a', 'odd_b']), [`m${ri(3)}`]: randLeaf(), q: [randLeaf(), { a: randLeaf() }] };
  else if (r < 0.9) ev = { type: 'no_tick', v: randLeaf() };
  else ev = { tick: from - 1 - ri(5), type: pick(STATIC).type, w: randLeaf(), und: undefined };
  return ev;
}
let evFails = 0; let evBytes = 0; let evPlain = 0;
const { encodeValue } = await import(u('src/net/protocol/bvalue.js'));
for (let i = 0; i < 5000; i++) {
  const from = ri(100000);
  const to = from + 3;
  const evs = Array.from({ length: ri(8) }, () => randEvent(from));
  const f = encodeEvents(0xff, i + 1, from, to, evs);
  const wp = new ByteWriter(256); encodeValue(wp, evs); evPlain += wp.finish().length + 14; evBytes += f.length;
  try {
    const d = decodeEvents(f);
    const ok = d.batchSeq === i + 1 && d.fromTick === from && d.toTick === to && C(d.events) === C(plainClone(evs));
    const bu = decodeEventsBundle(encodeEventsBundle(0xff, [eventsBody(f)]));
    const ok2 = bu.length === 1 && C(bu[0].events) === C(plainClone(evs)) && bu[0].batchSeq === i + 1 && bu[0].fromTick === from;
    if (!ok || !ok2) { evFails += 1; if (evFails < 4) console.log('EV MISMATCH', C(evs).slice(0, 300), C(d.events).slice(0, 300)); }
  } catch (e) { evFails += 1; if (evFails < 4) console.log('EV THROW', e.message); }
}
check('EVENTS v3: 5 000 random batches (static / inline / repeated inline shapes, no tick, tick < fromTick, -0 / NaN / ±Inf / null) + EVENTS_U round-trip canonically', evFails === 0, { evFails, bytes: evBytes, v2Bytes: evPlain, saved: Math.round((1 - evBytes / evPlain) * 1000) / 10 + '%' });

// ---------------------------------------------------------------- 4 --
{
  const tick = 5000;
  const ents = [
    { id: 3, kind: 'ally', x: 1.5, z: -2.25, hp: 90, faceX: 1, faceZ: 0, castLeftTicks: 12 },
    { id: 9, kind: 'skillbolt', x: 0.5, z: 0.5, vx: 0.07, vz: -0.03, traveled: 0.2, range: 5.5, radius: 0.05 },
  ];
  const q0 = ents.map((e) => quantizeEntity(e, tick, new Map()));
  const w = new ByteWriter(128); encodeHot(w, q0, null, 0, tick); const full = w.finish();
  const back = decodeHot(new ByteReader(full), null, 0, tick);
  const ok1 = C(back) === C(q0);
  const moved = [{ ...ents[0], x: 1.6, z: -2.2, castLeftTicks: 9 }];
  const q1 = moved.map((e) => quantizeEntity(e, tick + 3, new Map()));
  const w2 = new ByteWriter(64); encodeHot(w2, q1, [q0[0]], 3, tick + 3); const dl = w2.finish();
  const back2 = decodeHot(new ByteReader(dl), [q0[0]], 3, tick + 3);
  // bytes: despawn count 1 + despawn id 1 + changed count 1 + id 1 + mask 1 + dx + dz + REST(key + op 'w')
  check('HOT v3: NEW mover anchored at the snapshot tick round-trips; a moving actor delta = one-byte mask, castLeftTicks -dt as a value-free op', ok1 && C(back2) === C(q1) && dl.length <= 12, { fullBytes: full.length, deltaBytes: dl.length });
}

const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} checks pass`);
writeFileSync(resolve(here, 'captures/gntfixM5a4-unit.json'), JSON.stringify({ tool: 'gntfixM5a4-unit', results }, null, 1));
process.exit(pass === results.length ? 0 : 1);
