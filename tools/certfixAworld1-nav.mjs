// certfixAworld1 — worst-case navigable-floor estimate for REFERENCE_BAR
// check 4 ("props ring the edges, >=60% of the floor kept navigable").
// Every authored prop is charged its MAXIMUM footprint (env/props.js `foot`
// x the 1.35 scale ceiling + the 0.16 pad expandClusters adds) placed at its
// cluster centre, plus the fires, the monolith and the room dressing. Real
// placement spreads a cluster's tokens over a ring, so the true figure is
// higher than this. Read-only: imports the spec, runs no game code.
import { VARIANTS } from '../src/env/variants.js';
const FOOT = { slab: 0.52, stump: 0.46, fence: 0.56, crate: 0.3, barrel: 0.27, log: 0.85,
  bush: 0.48, boulder: 0.5, cairn: 0.32, torch: 0.24, lantern: 0.26, brazier: 0.38,
  tower: 0.3, banner: 0.26, barricade: 0.64, pillar: 0.38, urn: 0.26, idol: 0.36,
  sack: 0.22, stall: 0.88 };
const HALF_W = 12, HALF_D = 8, AREA = HALF_W * 2 * HALF_D * 2;
const rad = (t) => (FOOT[t] ?? 0.4) * 1.35 + 0.16;
for (const key of Object.keys(VARIANTS)) {
  const v = VARIANTS[key];
  for (const room of ['combat', 'shop', 'boss']) {
    const discs = [];
    const push = (x, z, t) => discs.push([x, z, rad(t)]);
    for (const [x, z, , recipe] of v.clusters) for (const t of recipe.split(/\s+/)) push(x, z, t);
    for (const [x, z] of v.torches ?? []) push(x, z, 'torch');
    for (const [x, z] of v.lanterns ?? []) push(x, z, 'lantern');
    for (const [x, z] of v.braziers ?? []) push(x, z, 'brazier');
    if (v.monolith) push(v.monolith[0], v.monolith[1], 'boulder');
    const def = v.rooms?.[room];
    if (def) {
      for (const [x, z, , recipe] of def.clusters ?? []) for (const t of recipe.split(/\s+/)) push(x, z, t);
      if (def.stall) push(def.stall[0], def.stall[1], 'stall');
    }
    // Monte Carlo over the playfield rect (deterministic lattice, 640x420).
    let blocked = 0, n = 0;
    for (let i = 0; i < 640; i++) for (let j = 0; j < 420; j++) {
      const x = -HALF_W + ((i + 0.5) / 640) * HALF_W * 2;
      const z = -HALF_D + ((j + 0.5) / 420) * HALF_D * 2;
      n++;
      for (const [dx, dz, r] of discs) if ((x - dx) ** 2 + (z - dz) ** 2 < r * r) { blocked++; break; }
    }
    console.log(`variant ${key} ${room.padEnd(6)} props ${String(discs.length).padStart(3)}  blocked ${((blocked / n) * 100).toFixed(1)}%  navigable ${((1 - blocked / n) * 100).toFixed(1)}%  (area ${AREA} u2)`);
  }
}
