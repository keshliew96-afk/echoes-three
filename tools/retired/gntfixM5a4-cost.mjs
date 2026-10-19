// gntfixM5a4-cost.mjs — fix-M5a r4 (NET4-F3): host CPU cost of the wire encoders, protocol v2
// (commit a8cea95, staged under captures/gntfixM5a4-v2proto/) vs v3 (src/net/protocol), on the
// SAME recorded state trees and events of real Level 3 play (single-player autopilot page on the
// dev server). Per snapshot: capture (quantise + hash), one guest's delta encode against a
// baseline 4 back, the EVENTS batch + EVENTS_U resend, and a keyframe every 40 snapshots.
// Both versions run on private clones of the recording, interleaved per round to share the
// machine's load. node tools/gntfixM5a4-cost.mjs [--level 3] [--room 8] [--seconds 30] [--rounds 3]
import { openClient, closeClient, writeJson, waitFor } from './gntcnet4-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const BASE = process.env.GNTCNET4_BASE || 'http://127.0.0.1:5199/';
const level = Number(A.level || 3);
const SEC = Number(A.seconds || 30);
const ROUNDS = Number(A.rounds || 3);
const c = await openClient(BASE + '?menu=0&seed=5', { w: 960, h: 540, tag: 'cost' });
try {
  await waitFor(c.page, () => window.__echoes && window.__echoes.tick > 240, { timeout: 120000 });
  await c.page.evaluate((lv) => window.__echoes.cmd('startCampaign', { level: lv }), level);
  await waitFor(c.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  if (A.room) { await c.page.evaluate((n) => window.__echoes.cmd('skipToRoom', n), Number(A.room)); await waitFor(c.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 }); }
  await c.page.evaluate(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
  const res = await c.page.evaluate(async ({ SEC, ROUNDS }) => {
    const E = window.__echoes;
    const keep = setInterval(() => { try { for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }, 1000);
    const rec = [];
    let pending = [];
    const off = E.on('*', (ev) => { if (ev.type === 'sound' || ev.predicted || ev.view) return; pending.push(JSON.parse(JSON.stringify(ev))); });
    const t0 = performance.now();
    let next = 0;
    await new Promise((resolve) => { const f = () => { if (E.tick >= next) { next = Math.floor(E.tick / 3) * 3 + 3; rec.push({ tick: E.tick, tree: E.save.capture(), events: pending }); pending = []; } if (performance.now() - t0 < SEC * 1000) requestAnimationFrame(f); else resolve(); }; requestAnimationFrame(f); });
    off && off(); clearInterval(keep);
    const mods = {
      v2: { snap: await import('/captures/gntfixM5a4-v2proto/snapshot.js'), codec: await import('/captures/gntfixM5a4-v2proto/codec.js') },
      v3: { snap: await import('/src/net/protocol/snapshot.js'), codec: await import('/src/net/protocol/codec.js') },
    };
    const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))] * 1000) / 1000 : null; };
    const now = () => performance.now();
    function run(ver) {
      const { snap, codec } = mods[ver];
      const trees = rec.map((r) => structuredClone(r.tree));
      const host = snap.createSnapshotHost();
      const link = host.link();
      const recs = [];
      const t = { capture: [], encode: [], events: [], keyframe: [], total: [] };
      let bytes = 0;
      let prev = null; const recent = [];
      let from = rec[0].tick;
      for (let i = 0; i < rec.length; i++) {
        const tick = rec[i].tick;
        const a = now();
        const r = host.capture(tick, trees[i], { clone: false });
        const b = now();
        recs.push(r);
        if (recs.length > 4) host.ack(link, recs[recs.length - 5].seq);
        const u8 = host.encodeFor(link, r, { seat: 1, lastInputSeqConsumed: 1, inputBufferDepth: 2, upLossPct: 0 });
        const c2 = now();
        const f = codec.encodeEvents(0xff, i + 1, from, tick, rec[i].events);
        from = tick;
        let u;
        if (ver === 'v2') { recent.push(codec.eventsBody(f).slice()); while (recent.length > 2) recent.shift(); u = codec.encodeEventsBundle(0xff, recent); }
        else { u = prev ? codec.encodeEventsBundle(0xff, [prev]) : new Uint8Array(0); prev = codec.eventsBody(f).slice(); }
        const d = now();
        let kf = 0;
        if (i % 40 === 0) kf = codec.encodeKeyframe(tick, trees[i]).length;
        const e = now();
        bytes += u8.length + f.length + u.length + kf;
        t.capture.push(b - a); t.encode.push(c2 - b); t.events.push(d - c2); if (i % 40 === 0) t.keyframe.push(e - d); t.total.push(e - a);
      }
      return t;
    }
    const agg = { v2: { capture: [], encode: [], events: [], keyframe: [], total: [] }, v3: { capture: [], encode: [], events: [], keyframe: [], total: [] } };
    for (let k = 0; k < ROUNDS; k++) for (const ver of k % 2 ? ['v3', 'v2'] : ['v2', 'v3']) { const t = run(ver); for (const key of Object.keys(t)) agg[ver][key].push(...t[key]); }
    const out = { snapshots: rec.length, rounds: ROUNDS };
    for (const ver of ['v2', 'v3']) out[ver] = Object.fromEntries(Object.entries(agg[ver]).map(([k, a]) => [k, { p50: pct(a, 0.5), p95: pct(a, 0.95), max: pct(a, 1) }]));
    return out;
  }, { SEC, ROUNDS });
  writeJson(`gntfixM5a4-cost-L${level}${A.room ? 'r' + A.room : ''}.json`, res);
  console.log(JSON.stringify(res, null, 1));
} finally { await closeClient(c); }
