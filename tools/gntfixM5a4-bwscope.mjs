// gntfixM5a4-bwscope.mjs — fix-M5a r4 (NET4-F3): where do the downstream bytes go?
// One single-player page runs the campaign on the autopilot (party HP kept up, like the
// critic's sweep); in the page, the REAL protocol modules (snapshot.js, codec.js) encode
// every 3rd tick exactly as the host driver does, against a baseline acked `--lag` snapshots
// back (N1: 150 ms RTT -> ~4). Reports per level: snapshot delta bytes (HOT vs COLD, the
// top COLD paths, HOT bytes per entity kind), EVENTS bytes (per type), EVENTS_U copies,
// keyframes; all as bytes/s at the §3.7 20 Hz snapshot rate, plus 1 s-window p95.
// node tools/gntfixM5a4-bwscope.mjs [--levels 1,3] [--seconds 60] [--room 8] [--lag 4] [--tag x]
// env GNTCNET4_BASE (default the dev server 5199).
import { openClient, closeClient, writeJson, sleep, waitFor } from './gntcnet4-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const BASE = process.env.GNTCNET4_BASE || 'http://127.0.0.1:5199/';
const levels = String(A.levels || '1,3').split(',').map(Number);
const SEC = Number(A.seconds || 60);
const LAG = Number(A.lag || 4);
const tag = A.tag || 'scope';
const out = { tool: 'gntfixM5a4-bwscope', base: BASE, seconds: SEC, lag: LAG, levels: {} };

for (const level of levels) {
  const c = await openClient(BASE + `?menu=0&seed=${Number(A.seed || 5)}`, { w: 960, h: 540, tag: 'L' + level });
  try {
    await waitFor(c.page, () => window.__echoes && window.__echoes.tick > 240, { timeout: 120000 });
    await c.page.evaluate((lv) => window.__echoes.cmd('startCampaign', { level: lv }), level);
    await waitFor(c.page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat'; }, { timeout: 30000 });
    if (A.room) {
      await c.page.evaluate((n) => window.__echoes.cmd('skipToRoom', n), Number(A.room));
      await waitFor(c.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
    }
    await c.page.evaluate(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
    const res = await c.page.evaluate(async ({ SEC, LAG, EVU2 }) => {
      const E = window.__echoes;
      const snapM = await import('/src/net/protocol/snapshot.js');
      const codec = await import('/src/net/protocol/codec.js');
      const bv = await import('/src/net/protocol/bvalue.js');
      const tdm = await import('/src/net/protocol/treediff.js');
      const dm = await import('/src/net/protocol/delta.js');
      const keep = setInterval(() => { try { for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }, 1000);
      const host = snapM.createSnapshotHost();
      const link = host.link();
      const recs = [];
      let pending = [];
      const evType = {};
      const off = E.on('*', (ev) => { if (ev.type === 'sound' || ev.predicted || ev.view) return; pending.push(ev); });
      const size = (v) => { const w = new codec.ByteWriter(256); bv.encodeValue(w, v); return w.finish().length; };
      const psize = (p, b, dt) => { const w = new codec.ByteWriter(256); bv.encodePatch(w, p, b, dt); return w.finish().length; };
      const snaps = []; // { t, bytes, hot, cold, ev, evu, kf }
      const coldPaths = {};
      const hotKinds = {};
      const hotFields = {};
      const restKeys = {};
      let lastKf = -Infinity;
      const recent = [];
      let batchSeq = 0;
      let evFrom = E.tick;
      let next = Math.ceil((E.tick + 1) / 3) * 3;
      const t0 = performance.now();
      const phases = {};
      await new Promise((resolve) => {
        const f = () => {
          const tick = E.tick;
          if (tick >= next) {
            next = Math.floor(tick / 3) * 3 + 3;
            const tree = E.save.capture();
            const rec = host.capture(tick, tree);
            recs.push(rec);
            // ack the snapshot LAG back (a guest decodes + acks with the RTT)
            if (recs.length > LAG) host.ack(link, recs[recs.length - 1 - LAG].seq);
            const base = link.acked ? recs.find((r) => r.seq === link.acked) : null;
            const u8 = host.encodeFor(link, rec, { seat: 1, lastInputSeqConsumed: 1, inputBufferDepth: 2, upLossPct: 0 });
            let hotB = 0, coldB = 0;
            if (base) {
              const w = new codec.ByteWriter(1024);
              hotB = dm.encodeHot(w, rec.q, base.q, rec.tick - base.tick, rec.tick).bytes;
              const p = tdm.diff(base.cold, rec.cold);
              if (!tdm.isEmptyPatch(p)) {
                const dt = rec.tick - base.tick; const bc = base.cold; const sub = (o, k) => (o && typeof o === 'object' ? o[k] : undefined);
                coldB = psize(p, bc, dt);
                for (const [k, op] of Object.entries(p)) {
                  if (op[0] === 'o') for (const [k2, op2] of Object.entries(op[1])) {
                    if (op2[0] === 'o') for (const [k3, op3] of Object.entries(op2[1])) { const key = `${k}.${k2}.${k3}`; coldPaths[key] = (coldPaths[key] || 0) + psize({ [k3]: op3 }, sub(sub(bc, k), k2), dt); }
                    else { const key = `${k}.${k2}`; coldPaths[key] = (coldPaths[key] || 0) + psize({ [k2]: op2 }, sub(bc, k), dt); }
                  } else coldPaths[k] = (coldPaths[k] || 0) + psize({ [k]: op }, bc, dt);
                }
              }
              // HOT per entity kind: encode each changed entity alone
              const bm = new Map(base.q.map((q) => [q.id, q]));
              const kindOf = (q) => (q.rest && (q.rest.kind || q.rest.type)) || '?';
              for (const q of rec.q) {
                const b = bm.get(q.id) || null;
                const w2 = new codec.ByteWriter(128);
                const r = dm.encodeHot(w2, [q], b ? [b] : null, rec.tick - base.tick, rec.tick);
                if (r.changed) {
                  const k = kindOf(q) + (b ? '' : ':NEW');
                  hotKinds[k] = (hotKinds[k] || 0) + r.bytes;
                  if (b) {
                    const rp = tdm.diff(b.rest, q.rest);
                    for (const [rk, rop] of Object.entries(rp)) { const key = `${kindOf(q)}.${rk}`; restKeys[key] = (restKeys[key] || 0) + psize({ [rk]: rop }, b.rest, rec.tick - base.tick); }
                    for (const ch of ['qx', 'qz', 'hp', 'yaw', 'yawf', 'ax', 'az', 'fv']) if (q[ch] !== b[ch]) hotFields[`${kindOf(q)}.${ch}`] = (hotFields[`${kindOf(q)}.${ch}`] || 0) + 1;
                  } else restKeys[`${kindOf(q)}:NEW`] = (restKeys[`${kindOf(q)}:NEW`] || 0) + size(q.rest);
                }
              }
            }
            // events: one batch per snapshot + EVENTS_U with the newest two bodies
            const evs = pending; pending = [];
            for (const ev of evs) { const s = size(ev); const e = (evType[ev.type] ||= { n: 0, bytes: 0 }); e.n += 1; e.bytes += s; }
            const evFrame = codec.encodeEvents(codec.SEAT_ALL, ++batchSeq, evFrom, tick, evs);
            evFrom = tick;
            // EVENTS_U exactly as the driver of the build under test: v3 = the previous batch only;
            // --evu2 = the v2 rule (the newest two batches)
            let evU;
            if (EVU2) { recent.push(codec.eventsBody(evFrame).slice()); while (recent.length > 2) recent.shift(); evU = codec.encodeEventsBundle(codec.SEAT_ALL, recent); }
            else { evU = recent.length ? codec.encodeEventsBundle(codec.SEAT_ALL, [recent[0]]) : new Uint8Array(0); recent[0] = codec.eventsBody(evFrame).slice(); }
            let kf = 0;
            if (tick - lastKf >= 120) { lastKf = tick; kf = codec.encodeKeyframe(tick, tree).length; }
            const st = E.state();
            const ph = st.run ? st.run.phase : '?';
            phases[ph] = (phases[ph] || 0) + 1;
            snaps.push({ t: performance.now() - t0, tick, full: !base, bytes: u8.length, hot: hotB, cold: coldB, ev: evFrame.length, evu: evU.length, kf, nEnt: rec.q.length, ph, room: st.run ? st.run.room : null, alive: (st.enemies || []).length });
          }
          if (performance.now() - t0 < SEC * 1000) requestAnimationFrame(f); else resolve();
        };
        requestAnimationFrame(f);
      });
      off && off();
      clearInterval(keep);
      const top = (o, n = 25) => Object.entries(o).sort((a, b) => (b[1].bytes ?? b[1]) - (a[1].bytes ?? a[1])).slice(0, n);
      return { snaps, coldPaths: top(coldPaths, 30), hotKinds: top(hotKinds, 20), restKeys: top(restKeys, 40), hotFields: top(hotFields, 20), evType: top(evType, 30), phases, level: E.campaign.state().level };
    }, { SEC, LAG, EVU2: !!A.evu2 });
    // aggregate: per 1 s windows (wall)
    const s = res.snaps.filter((x) => !x.full);
    const dur = (res.snaps[res.snaps.length - 1].t - res.snaps[0].t) / 1000;
    const perSnap = (k) => s.reduce((a, x) => a + x[k], 0) / Math.max(1, s.length);
    const bins = {};
    for (const x of res.snaps) { const b = Math.floor(x.t / 1000); const o = (bins[b] ||= { snap: 0, ev: 0, evu: 0, kf: 0, n: 0 }); o.snap += x.full ? 0 : x.bytes; o.ev += x.ev; o.evu += x.evu; o.kf += x.kf; o.n += 1; }
    // normalise each window to 20 snapshots/s (rAF pacing jitter in the page)
    const wins = Object.values(bins).filter((o) => o.n >= 10).map((o) => { const k = 20 / o.n; return { down: (o.snap + o.ev + o.evu) * k, snap: o.snap * k, ev: o.ev * k, evu: o.evu * k, up: (o.snap + o.ev + o.evu) * k + o.kf }; });
    const p = (arr, q) => { const a = [...arr].sort((x, y) => x - y); return a.length ? Math.round(a[Math.min(a.length - 1, Math.floor(a.length * q))]) : null; };
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    const L = {
      level: res.level, snapshots: res.snaps.length, durS: Math.round(dur), phases: res.phases,
      perSnap: { bytes: Math.round(perSnap('bytes')), hot: Math.round(perSnap('hot')), cold: Math.round(perSnap('cold')), ev: Math.round(perSnap('ev')), evu: Math.round(perSnap('evu')), ents: Math.round(perSnap('nEnt')), alive: Math.round(perSnap('alive')) },
      kfBytes: res.snaps.filter((x) => x.kf).map((x) => x.kf).slice(-5),
      downBps: { avg: avg(wins.map((w) => w.down)), p95: p(wins.map((w) => w.down), 0.95), max: p(wins.map((w) => w.down), 1) },
      split: { snap: avg(wins.map((w) => w.snap)), ev: avg(wins.map((w) => w.ev)), evu: avg(wins.map((w) => w.evu)) },
      hostUpBps: { avg: avg(wins.map((w) => w.up)), p95: p(wins.map((w) => w.up), 0.95) },
      coldPaths: res.coldPaths, hotKinds: res.hotKinds, restKeys: res.restKeys, hotFields: res.hotFields, evType: res.evType,
    };
    out.levels[level] = L;
    console.log(`L${level}`, JSON.stringify({ perSnap: L.perSnap, down: L.downBps, split: L.split, up: L.hostUpBps, kf: L.kfBytes, phases: L.phases }));
    console.log('  cold', JSON.stringify(L.coldPaths.slice(0, 12)));
    console.log('  hotKinds', JSON.stringify(L.hotKinds.slice(0, 10)));
    console.log('  rest', JSON.stringify(L.restKeys.slice(0, 16)));
    console.log('  ev', JSON.stringify(L.evType.slice(0, 12)));
    out.levels[level].pageErrors = c.errors;
  } catch (e) { out.levels[level] = { crash: String(e.stack || e) }; console.error(e); }
  finally { await closeClient(c); }
  writeJson(`gntfixM5a4-bwscope-${tag}.json`, out);
}
