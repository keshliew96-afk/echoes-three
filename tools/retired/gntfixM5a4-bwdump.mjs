// gntfixM5a4-bwdump.mjs — fix-M5a r4 (NET4-F3): dump sample payloads behind the byte counts
// (a skillbolt / bolt entity rest, a typical cold patch between snapshots 4 apart, sample events
// per type, the inline (non-dictionary) keys and strings with their byte cost).
// node tools/gntfixM5a4-bwdump.mjs [--level 3] [--seconds 25]
import { openClient, closeClient, writeJson, waitFor } from './gntcnet4-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const BASE = process.env.GNTCNET4_BASE || 'http://127.0.0.1:5199/';
const level = Number(A.level || 3);
const SEC = Number(A.seconds || 25);
const c = await openClient(BASE + `?menu=0&seed=5`, { w: 960, h: 540, tag: 'dump' });
try {
  await waitFor(c.page, () => window.__echoes && window.__echoes.tick > 240, { timeout: 120000 });
  await c.page.evaluate((lv) => window.__echoes.cmd('startCampaign', { level: lv }), level);
  await waitFor(c.page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat'; }, { timeout: 30000 });
  await c.page.evaluate(() => window.__echoes.cmd('autopilot', { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest' }));
  const res = await c.page.evaluate(async (SEC) => {
    const E = window.__echoes;
    const bv = await import('/src/net/protocol/bvalue.js');
    const tdm = await import('/src/net/protocol/treediff.js');
    const snapM = await import('/src/net/protocol/snapshot.js');
    const KD = new Set(bv.KEY_DICT); const SD = new Set(bv.STR_DICT);
    const keep = setInterval(() => { try { for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.6) E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }, 1000);
    const inlineKeys = {}; const inlineStrs = {}; const floats = {};
    const walk = (v, path, w) => {
      if (Array.isArray(v)) { v.forEach((x) => walk(x, path + '[]', w)); return; }
      if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) { if (!KD.has(k)) inlineKeys[k] = (inlineKeys[k] || 0) + w; walk(x, path + '.' + k, w); } return; }
      if (typeof v === 'string' && !SD.has(v)) inlineStrs[v] = (inlineStrs[v] || 0) + w;
      if (typeof v === 'number' && Number.isFinite(v) && !Number.isInteger(v) && Math.round(v * 100) / 100 !== v && Math.round(v * 256) / 256 !== v) floats[path] = (floats[path] || 0) + w;
    };
    const events = {}; const evs = [];
    const off = E.on('*', (ev) => { if (ev.type === 'sound' || ev.predicted || ev.view) return; evs.push(ev); if (!events[ev.type]) events[ev.type] = JSON.parse(JSON.stringify(ev)); });
    const trees = []; const t0 = performance.now(); let next = 0;
    const kinds = {};
    await new Promise((resolve) => { const f = () => { if (E.tick >= next) { next = E.tick + 3; const t = E.save.capture(); trees.push(t); for (const e of t.registry.entities) if (!kinds[e.kind || e.type]) kinds[e.kind || e.type] = e; } if (performance.now() - t0 < SEC * 1000) requestAnimationFrame(f); else resolve(); }; requestAnimationFrame(f); });
    off && off(); clearInterval(keep);
    for (const ev of evs) walk(ev, 'ev.' + ev.type, 1);
    const cold = (t) => snapM.splitTree(t).cold;
    const patches = [];
    for (let i = 4; i < trees.length; i += 40) patches.push(tdm.diff(cold(trees[i - 4]), cold(trees[i])));
    const patchWalk = {};
    for (let i = 4; i < trees.length; i++) { const p = tdm.diff(cold(trees[i - 4]), cold(trees[i])); walk(p, 'patch', 1); }
    const topo = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
    const lastTree = trees[trees.length - 1];
    const coldShape = {}; const ct = cold(lastTree);
    for (const [k, v] of Object.entries(ct)) coldShape[k] = v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k2, v2]) => [k2, JSON.stringify(v2).length])) : JSON.stringify(v).length;
    return { kinds, events, patches: patches.slice(0, 4), inlineKeys: topo(inlineKeys, 60), inlineStrs: topo(inlineStrs, 40), floats: topo(floats, 40), coldShape, app: ct.app, autopilot: ct.systems && ct.systems.run && ct.systems.run.autopilot };
  }, SEC);
  writeJson(`gntfixM5a4-bwdump-L${level}.json`, res);
  console.log('kinds', Object.keys(res.kinds).join(','));
  console.log('skillbolt', JSON.stringify(res.kinds.skillbolt || null).slice(0, 1500));
  console.log('inlineKeys', JSON.stringify(res.inlineKeys));
  console.log('inlineStrs', JSON.stringify(res.inlineStrs));
  console.log('floats', JSON.stringify(res.floats));
  console.log('app', JSON.stringify(res.app).slice(0, 400));
  console.log('autopilot', JSON.stringify(res.autopilot).slice(0, 800));
  console.log('patch0', JSON.stringify(res.patches[1]).slice(0, 2500));
} finally { await closeClient(c); }
