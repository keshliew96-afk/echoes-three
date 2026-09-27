// gntfixM5a4-dictscan.mjs — fix-M5a r4 (NET4-F3): measure what the wire codec writes INLINE
// (keys / strings missing from bvalue.js KEY_DICT / STR_DICT) and the event shapes, over real
// campaign play (single-player page, autopilot, party HP kept up) in Levels 1-3 and the Stag.
// Walks exactly what the codec writes: event objects, COLD tree-diff patches (baseline 4 back),
// HOT rest patches and NEW-entity rests.
// node tools/gntfixM5a4-dictscan.mjs [--seconds 40] [--runs 1,2,3,3b]
import { openClient, closeClient, writeJson, waitFor } from './gntcnet4-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const BASE = process.env.GNTCNET4_BASE || 'http://127.0.0.1:5199/';
const SEC = Number(A.seconds || 40);
const runs = String(A.runs || '1,2,3,3b').split(',');
const merged = { keys: {}, strs: {}, shapes: {}, types: {} };
const add = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
for (const run of runs) for (let attempt = 1; attempt <= 3; attempt++) {
  let okRun = false;
  const level = Number(run[0]);
  const boss = run.endsWith('b');
  const c = await openClient(BASE + `?menu=0&seed=${7 + level}`, { w: 960, h: 540, tag: 'scan' + run });
  try {
    await waitFor(c.page, () => window.__echoes && window.__echoes.tick > 240, { timeout: 120000 });
    await c.page.evaluate((lv) => window.__echoes.cmd('startCampaign', { level: lv }), level);
    await waitFor(c.page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat'; }, { timeout: 30000 });
    if (boss) { await c.page.evaluate(() => window.__echoes.cmd('skipToRoom', 8)); await waitFor(c.page, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 }); }
    await c.page.evaluate(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
    const res = await c.page.evaluate(async (SEC) => {
      const E = window.__echoes;
      const bv = await import('/src/net/protocol/bvalue.js');
      const tdm = await import('/src/net/protocol/treediff.js');
      const snapM = await import('/src/net/protocol/snapshot.js');
      const qm = await import('/src/net/protocol/quantize.js');
      const KD = new Set(bv.KEY_DICT); const SD = new Set(bv.STR_DICT);
      const keys = {}; const strs = {}; const shapes = {}; const types = {};
      const add = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
      const val = (v) => {
        if (typeof v === 'string') { add(strs, (SD.has(v) ? '=' : '') + v); return; }
        if (Array.isArray(v)) { for (const x of v) val(x); return; }
        if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) { if (x === undefined) continue; add(keys, (KD.has(k) ? '=' : '') + k); val(x); } }
      };
      const op = (o) => {
        switch (o[0]) {
          case 's': val(o[1]); return;
          case 'o': patch(o[1]); return;
          case 'a': for (const [, sub] of o[2]) op(sub); return;
          case 'k': for (const id of o[2]) val(id); for (const sub of Object.values(o[3])) op(sub); return;
          default:
        }
      };
      const patch = (p) => { for (const [k, o] of Object.entries(p)) { add(keys, (KD.has(k) ? '=' : '') + k); op(o); } };
      const keep = setInterval(() => { try { for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }, 1000);
      const off = E.on('*', (ev) => {
        if (ev.type === 'sound' || ev.predicted || ev.view) return;
        const ks = Object.keys(ev).filter((k) => ev[k] !== undefined && k !== 'tick' && k !== 'type').sort();
        add(shapes, `${ev.type}|${ks.join(',')}`);
        add(types, ev.type);
        // event KEYS ride in the static shapes (codec.js v3): count only the values
        for (const k of Object.keys(ev)) if (ev[k] !== undefined) val(ev[k]);
      });
      const trees = []; const t0 = performance.now(); let next = 0;
      await new Promise((resolve) => { const f = () => { if (E.tick >= next) { next = E.tick + 3; trees.push({ tick: E.tick, t: E.save.capture() }); } if (performance.now() - t0 < SEC * 1000) requestAnimationFrame(f); else resolve(); }; requestAnimationFrame(f); });
      off && off(); clearInterval(keep);
      const recs = trees.map(({ tick, t }) => { const { hot, cold } = snapM.splitTree(t); return { cold, q: hot.map((e) => qm.quantizeEntity(e, tick, null)) }; });
      for (let i = 4; i < recs.length; i++) {
        const b = recs[i - 4]; const r = recs[i];
        patch(tdm.diff(b.cold, r.cold));
        const bm = new Map(b.q.map((q) => [q.id, q]));
        for (const q of r.q) { const bq = bm.get(q.id); if (!bq) val(q.rest); else patch(tdm.diff(bq.rest, q.rest)); }
      }
      return { keys, strs, shapes, types, n: recs.length };
    }, SEC);
    for (const k of ['keys', 'strs', 'shapes', 'types']) for (const [x, n] of Object.entries(res[k])) add(merged[k], x, n);
    console.log(run, 'snapshots', res.n, 'pageErrors', c.errors.length);
    okRun = true;
  } catch (e) { console.error(run, 'attempt', attempt, String(e.message || e).slice(0, 120)); }
  finally { await closeClient(c); }
  if (okRun) break;
}
const top = (o, f = () => true, n = 400) => Object.entries(o).filter(([k]) => f(k)).sort((a, b) => b[1] - a[1]).slice(0, n);
const out = { inlineKeys: top(merged.keys, (k) => !k.startsWith('=')), dictKeys: top(merged.keys, (k) => k.startsWith('=')), inlineStrs: top(merged.strs, (k) => !k.startsWith('=')), dictStrs: top(merged.strs, (k) => k.startsWith('=')), shapes: top(merged.shapes), types: top(merged.types) };
writeJson('gntfixM5a4-dictscan.json', out);
console.log('inlineKeys', JSON.stringify(out.inlineKeys.slice(0, 80)));
console.log('inlineStrs', JSON.stringify(out.inlineStrs.slice(0, 80)));
console.log('shapes', out.shapes.length, JSON.stringify(out.shapes.slice(0, 20)));
