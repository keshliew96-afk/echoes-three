// certfixDshouldfix4-pipes.mjs — Graphite pipeline timeline from a
// `--cats shaders --traceBoot 1` trace: every createGraphicsPipeline placed
// against the user-timing marks (prepaint-*, hudwarm-*, GAP*), and the set of
// pipeline labels USED in each window vs CREATED at the gaps.
import { readFileSync } from 'fs';
const file = process.argv[2];
const raw = JSON.parse(readFileSync(file, 'utf8'));
const evs = raw.traceEvents || raw;
let t0 = Infinity;
for (const e of evs) if (typeof e.ts === 'number' && e.ph !== 'M' && e.ts < t0) t0 = e.ts;
const R = (ts) => ((ts - t0) / 1000).toFixed(1);
const marks = evs.filter((e) => e.cat && e.cat.includes('blink.user_timing') && e.ph !== 'M' && e.name).sort((a, b) => a.ts - b.ts);
console.log('marks:', marks.map((m) => `${m.name}@${R(m.ts)}`).join('  '));
const mark = (n) => marks.find((m) => m.name === n)?.ts;
const creates = evs.filter((e) => e.name === 'createGraphicsPipeline').sort((a, b) => a.ts - b.ts);
console.log(`createGraphicsPipeline: ${creates.length} total, ${(creates.reduce((s, e) => s + (e.dur || 0), 0) / 1000).toFixed(1)} ms`);
const uses = evs.filter((e) => e.name && e.name.startsWith('RP(')).sort((a, b) => a.ts - b.ts);
const firstUse = new Map();
for (const u of uses) if (!firstUse.has(u.name)) firstUse.set(u.name, u.ts);
console.log(`distinct pipeline labels used: ${firstUse.size}`);
const ps = mark('prepaint-start'), pe = mark('prepaint-end'), hs = mark('hudwarm-start'), he = mark('hudwarm-end');
const gaps = marks.filter((m) => /^GAP/.test(m.name));
const openStart = gaps.length ? gaps[0].ts - 2000 * 1000 : Infinity;
const phase = (ts) => {
  if (ps && ts < ps - 5) return 'boot-before-prepaint';
  if (ps && pe && ts >= ps - 5 && ts <= pe + 40000) return 'prepaint';
  if (ts < openStart) return 'camp';
  return 'open';
};
const usedIn = { 'boot-before-prepaint': new Set(), prepaint: new Set(), camp: new Set(), open: new Set() };
for (const u of uses) usedIn[phase(u.ts)].add(u.name);
console.log('\n== createGraphicsPipeline timeline (phase, t, dur, desc) ==');
const byPhase = {};
for (const c of creates) {
  const p = phase(c.ts);
  byPhase[p] = (byPhase[p] || 0) + 1;
  const d = (c.args && c.args.desc) || '';
  const wasUsedInPrepaint = usedIn.prepaint.has(d.trim()) || usedIn.prepaint.has(d);
  console.log(`${p.padEnd(22)} ${R(c.ts).padStart(8)} +${((c.dur || 0) / 1000).toFixed(1).padStart(5)}  ${p === 'open' ? (wasUsedInPrepaint ? '[USED IN PREPAINT!] ' : '[never in prepaint] ') : ''}${d}`);
}
console.log('\ncreates per phase:', JSON.stringify(byPhase));
console.log('labels used per phase:', Object.fromEntries(Object.entries(usedIn).map(([k, v]) => [k, v.size])));
// What the open used that the prepaint never touched:
const openOnly = [...usedIn.open].filter((l) => !usedIn.prepaint.has(l) && !usedIn.camp.has(l) && !usedIn['boot-before-prepaint'].has(l));
console.log(`\nlabels used at open and NEVER before (${openOnly.length}):`);
for (const l of openOnly) console.log('  ', l);
// Per GAP: creates in [gap-start-100, gap-end+10]
for (const g of gaps) {
  const ms = parseFloat(g.name.slice(3));
  const from = g.ts - (ms + 100) * 1000, to = g.ts + 10 * 1000;
  const cs = creates.filter((c) => c.ts >= from && c.ts <= to);
  console.log(`\n${g.name}@${R(g.ts)}: ${cs.length} pipeline creations in its window`);
}
