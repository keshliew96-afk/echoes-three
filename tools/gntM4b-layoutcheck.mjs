#!/usr/bin/env node
// M4b placement audit (docs/gauntlet/PLAN.md §3.6 / BUILD_BRIEF §23.7): every
// layout placement in src/data/layouts.js against the §11 spawn ring, the
// Waystone, the party's entry spots, the playfield and — for the dressed
// layouts — the dressing's own prop anchors / fire bowls / torches. Prints one
// line per violation and a summary; exit 1 if any rule fails.
//   node tools/gntM4b-layoutcheck.mjs [--verbose]
import { LAYOUTS, PLACEMENT_RULES } from '../src/data/layouts.js';
import { SPAWN_POINTS } from '../src/sim/waves.js';
import { ARENA } from '../src/core/constants.js';

const verbose = process.argv.includes('--verbose');
let dressFor = () => null;
try {
  const mod = await import('../src/env/biomes/index.js');
  dressFor = (id) => mod.layoutSpec(id);
} catch {
  const { VARIANTS } = await import('../src/env/variants.js');
  dressFor = (id) => VARIANTS[id] ?? null;
}

const FOOT = { bramble: null, puffcap: 0.35, millrace: null, gravefire: 0.7, dewfont: 0.55, barricade: 0.75, keg: 0.3, sluice: 0.45, bell: 0.45 };
const segDist = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax;
  const dz = bz - az;
  const L2 = dx * dx + dz * dz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
};

function shapesOf(p) {
  // -> [{ kind: 'pt', x, z, r } | { kind: 'seg', ax, az, bx, bz, r }]
  if (p.type === 'millrace') return [{ kind: 'seg', ax: p.x0, az: p.z0, bx: p.x1, bz: p.z1, r: 0 }];
  if (p.type === 'gravefire') return p.vents.map(([x, z]) => ({ kind: 'pt', x, z, r: FOOT.gravefire }));
  if (p.type === 'rockfall') return [];
  const r = p.type === 'bramble' ? p.r : FOOT[p.type] ?? 0.4;
  return [{ kind: 'pt', x: p.x, z: p.z, r }];
}
const distTo = (s, x, z) => (s.kind === 'pt' ? Math.hypot(s.x - x, s.z - z) - s.r : segDist(x, z, s.ax, s.az, s.bx, s.bz));

let fails = 0;
const note = (lid, p, msg) => {
  fails += 1;
  console.log(`L${lid} ${p.type}@${p.x ?? p.x0},${p.z ?? p.z0}: ${msg}`);
};
for (const [lid, L] of Object.entries(LAYOUTS)) {
  const all = [...L.hazards, ...L.interactables];
  const dress = dressFor(Number(lid));
  const anchors = [];
  if (dress) {
    for (const c of dress.clusters ?? []) anchors.push({ x: c[0], z: c[1], r: c[2] + 0.35, what: `cluster ${c[3]}` });
    for (const b of dress.braziers ?? []) anchors.push({ x: b[0], z: b[1], r: 0.55, what: 'brazier' });
    for (const t of dress.torches ?? []) anchors.push({ x: t[0], z: t[1], r: 0.4, what: 'torch' });
    for (const t of dress.lanterns ?? []) anchors.push({ x: t[0], z: t[1], r: 0.45, what: 'lantern' });
    if (dress.monolith) anchors.push({ x: dress.monolith[0], z: dress.monolith[1], r: 0.95, what: 'monolith' });
    for (const t of dress.landmarks ?? []) anchors.push({ x: t[0], z: t[1], r: t[2] ?? 1.0, what: `landmark ${t[3] ?? ''}` });
  }
  for (const p of all) {
    for (const s of shapesOf(p)) {
      for (const [sx, sz] of SPAWN_POINTS) {
        const d = distTo(s, sx, sz);
        if (d < PLACEMENT_RULES.spawnClear) note(lid, p, `spawn (${sx},${sz}) ${d.toFixed(2)} < ${PLACEMENT_RULES.spawnClear}`);
      }
      const w = PLACEMENT_RULES.waystone;
      const dw = distTo(s, w.x, w.z);
      if (dw < w.clear) note(lid, p, `waystone ${dw.toFixed(2)} < ${w.clear}`);
      for (const [px, pz] of PLACEMENT_RULES.partySpots) {
        const d = distTo(s, px, pz) - (p.type === 'millrace' ? (p.w ?? 1.4) / 2 : 0);
        if (d < PLACEMENT_RULES.partyClear) note(lid, p, `party (${px},${pz}) ${d.toFixed(2)} < ${PLACEMENT_RULES.partyClear}`);
      }
      if (s.kind === 'pt') {
        if (Math.abs(s.x) + s.r > ARENA.halfW - 0.4 || Math.abs(s.z) + s.r > ARENA.halfD - 0.4) note(lid, p, 'outside the playfield');
        for (const a of anchors) {
          const d = Math.hypot(a.x - s.x, a.z - s.z) - a.r - s.r;
          if (d < 0.15) note(lid, p, `overlaps dressing ${a.what} @${a.x},${a.z} (gap ${d.toFixed(2)})`);
        }
      }
    }
  }
  // Placements vs each other (points only).
  const pts = all.flatMap((p) => shapesOf(p).filter((s) => s.kind === 'pt').map((s) => ({ ...s, p })));
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].p === pts[j].p) continue;
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) - pts[i].r - pts[j].r;
      if (d < 0.25) note(lid, pts[i].p, `crowds ${pts[j].p.type}@${pts[j].x},${pts[j].z} (gap ${d.toFixed(2)})`);
    }
  if (verbose) console.log(`L${lid} ${L.name}: ${L.hazards.length} hazards, ${L.interactables.length} assets, dressing ${dress ? 'yes' : 'none'}`);
}
console.log(fails ? `${fails} placement violation(s)` : 'all placements clear');
process.exit(fails ? 1 : 0);
