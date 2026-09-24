#!/usr/bin/env node
// gntfixM5a1 — unit checks for NET-F2 (own file): the sequence-gap loss
// meter, the link-quality thresholds + hysteresis, and the snapshot header's
// upstream-loss echo (flags bits 0-6) round trip. Exit 1 on any failure.
import { SeqLossMeter, linkQuality, createQualityTracker } from '../src/net/transport.js';
import { createSnapshotHost, createSnapshotClient, readSnapHeader, upLossCode, upLossOf } from '../src/net/protocol/snapshot.js';

let fails = 0;
const ok = (cond, what, got) => {
  if (!cond) fails += 1;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${what}${got !== undefined ? ` -> ${JSON.stringify(got)}` : ''}`);
};

// ---- meter on a fake clock
let t = 0;
const now = () => t;
function run(lossEvery, n = 200, { dupEvery = 0, reorder = false } = {}) {
  const m = new SeqLossMeter({ windowMs: 5000, now });
  const seqs = [];
  for (let s = 1; s <= n; s++) if (!(lossEvery && s % lossEvery === 0)) seqs.push(s);
  if (reorder) for (let i = 0; i + 1 < seqs.length; i += 7) [seqs[i], seqs[i + 1]] = [seqs[i + 1], seqs[i]];
  for (const [i, s] of seqs.entries()) {
    t += 50;
    m.add(s);
    if (dupEvery && i % dupEvery === 0) m.add(s);
  }
  return m;
}
ok(run(0).pct() === 0, 'no loss -> 0 %', run(0).pct());
ok(Math.abs(run(10).pct() - 10) <= 1.5, '1 in 10 lost -> ~10 %', run(10).pct());
ok(Math.abs(run(5).pct() - 20) <= 1.5, '1 in 5 lost -> ~20 %', run(5).pct());
ok(run(0, 200, { dupEvery: 3 }).pct() === 0, 'duplicates are not loss', run(0, 200, { dupEvery: 3 }).pct());
ok(run(0, 200, { reorder: true }).pct() === 0, 'reordering is not loss', run(0, 200, { reorder: true }).pct());
{
  t = 0;
  const m = new SeqLossMeter({ now });
  m.add(1);
  m.add(2);
  ok(m.pct() === null, 'unmeasurable until 20 seqs spanned', m.pct());
}
{
  t = 0;
  const m = new SeqLossMeter({ now });
  for (let s = 1; s <= 100; s++) (t += 50), m.add(s);
  for (let s = 1; s <= 40; s++) (t += 50), m.add(s); // a new host: seqs restart
  ok(m.pct() === 0 && m.resets === 1, 'seq restart (migration) starts a fresh window', { pct: m.pct(), resets: m.resets });
  for (let s = 5000; s <= 5100; s++) (t += 50), m.add(s); // jump > maxJump
  ok(m.pct() === 0 && m.resets === 2, 'huge jump (stall / reconnect) starts a fresh window', { pct: m.pct(), resets: m.resets });
}
{
  t = 0;
  const m = new SeqLossMeter({ now });
  for (let s = 1; s <= 200; s++) {
    t += 50;
    if (s <= 100 && s % 4 === 0) continue; // 25 % early
    m.add(s);
  }
  ok(m.pct() === 0, 'the 5 s window forgets old loss', m.pct());
}

// ---- cumulative totals (comparable to the conditioner's cumulative counters)
{
  const m = run(10, 400, { dupEvery: 5, reorder: true });
  const tot = m.total();
  ok(Math.abs(tot.pct - 10) <= 0.5, 'total(): 1 in 10 lost over 400, with dups + reordering -> ~10 %', tot);
  t = 0;
  const m2 = new SeqLossMeter({ now });
  for (let s = 1; s <= 100; s++) (t += 50), s % 5 !== 0 && m2.add(s); // 20 % loss
  for (let s = 1; s <= 100; s++) (t += 50), m2.add(s); // new host: clean
  ok(Math.abs(m2.total().pct - 10) <= 0.6 && m2.pct() === 0, 'total() keeps summing across a seq restart; the window restarts', { total: m2.total(), window: m2.pct() });
  m2.clear();
  ok(m2.total().expected === 0 && m2.total().pct === null, 'clear() drops the totals', m2.total());
}

// ---- quality levels
const L = (x) => linkQuality(x).level;
ok(L({ lossPct: 0, rttMs: 40, jitterMs: 3 }) === 'good', 'clean link good');
ok(L({ lossPct: 3, rttMs: 40 }) === 'fair', '3 % loss fair');
ok(L({ lossPct: 10, rttMs: 40 }) === 'poor', '10 % loss poor');
ok(L({ lossPct: 0, rttMs: 160 }) === 'fair', '160 ms fair');
ok(L({ lossPct: 0, rttMs: 301 }) === 'poor', '301 ms poor');
ok(L({ lossPct: 20, rttMs: 151 }) === 'poor', 'the critic frame (151 ms, 20 %) poor');
ok(L({ stallMs: 2000 }) === 'poor' && linkQuality({ stallMs: 2000 }).reasons[0] === 'stalled', 'no update 2 s poor/stalled');
ok(linkQuality({ lossPct: 20, rttMs: 300 }).reasons.join() === 'loss,latency', 'reasons worst-first order', linkQuality({ lossPct: 20, rttMs: 300 }).reasons);
{
  t = 0;
  const q = createQualityTracker({ now, recoverMs: 2000 });
  let r = q.update({ lossPct: 0, rttMs: 20 });
  ok(r.level === 'good', 'tracker starts good');
  t += 100;
  r = q.update({ lossPct: 20, rttMs: 20 });
  ok(r.level === 'poor', 'worse shows at once', r);
  t += 500;
  r = q.update({ lossPct: 0, rttMs: 20 });
  ok(r.level === 'poor' && r.raw === 'good', 'better waits (hysteresis)', r);
  t += 2100;
  r = q.update({ lossPct: 0, rttMs: 20 });
  ok(r.level === 'good', 'better after 2 s', r);
}

// ---- snapshot header echo
ok(upLossCode(null) === 0 && upLossOf(0) === null, 'null -> not measured');
ok(upLossOf(upLossCode(0)) === 0 && upLossOf(upLossCode(19.6)) === 20 && upLossOf(upLossCode(250)) === 100, 'code round trip 0 / 19.6 / clamp');
{
  const host = createSnapshotHost();
  const link = host.link();
  const tree = { registry: { entities: [{ id: 1, kind: 'ally', x: 1, z: 2, hp: 50, maxHp: 60 }] }, run: { room: 1, phase: 'combat' } };
  const rec = host.capture(30, tree);
  const u8 = host.encodeFor(link, rec, { seat: 1, lastInputSeqConsumed: 7, inputBufferDepth: 2, upLossPct: 12.4 });
  const h = readSnapHeader(u8);
  ok(h.upLossPct === 12 && h.inputBufferDepth === 2 && h.lastInputSeqConsumed === 7 && !!h.hash, 'header carries the echo next to the hash', { up: h.upLossPct, hash: !!h.hash });
  const dec = createSnapshotClient();
  const r = dec.decode(u8);
  ok(r.ok && r.hashOk === true && r.upLossPct === 12, 'decode ok, hash ok, echo exposed', { ok: r.ok, hashOk: r.hashOk, up: r.upLossPct });
  const u8b = host.encodeFor(link, rec, { seat: 1 });
  ok(readSnapHeader(u8b).upLossPct === null && u8b.length === u8.length, 'no echo -> null, same frame size', { len: [u8.length, u8b.length] });
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
