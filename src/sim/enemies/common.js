// Shared helpers for the Gauntlet enemy archetypes (src/sim/enemies/*.js,
// docs/gauntlet/PLAN.md §3.6 "Enemy archetype", BUILD_BRIEF §23.5). Owner: M4b.
//
// Every archetype is plain data + pure functions over plain entity data: all
// per-enemy state lives ON the entity (mode, telegraph, charge velocity,
// per-charge hit ids, burrow clocks), never in closures, so the registry
// serialises the whole AI for free (save files, network snapshots — PLAN §3.4).
//
// Telegraph record (every avoidable attack, BUILD_BRIEF §23 "≥ 0.7 s Ember"):
//   e.telegraph = { kind: 'lane'|'ring'|'cone', startTick, resolveTick,
//                   x, z,                  // impact point (ring centre / lane end / cone apex)
//                   fromX?, fromZ?,        // lane origin
//                   dirX, dirZ, length?, width?, radius?, halfAngleDeg?,
//                   playerTargeted, targetId }
// The render layer reads it off the entity; the §11 governor counts every
// live `telegraph.playerTargeted` in the registry.
export const r2 = (v) => Math.round(v * 100) / 100;

export function unit(dx, dz) {
  const l = Math.hypot(dx, dz);
  return l > 1e-9 ? { x: dx / l, z: dz / l, l } : { x: 0, z: 0, l: 0 };
}

// Shortest signed angle a -> b (radians), in (-PI, PI].
export function angleTo(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Party bodies (player + allies + the defend Waystone count as party faction
// for targeting; DAMAGE from area attacks lands on every living party-faction
// body inside the area).
export function partyInRadius(registry, x, z, radius) {
  const out = [];
  for (const t of registry.all()) {
    if (t.faction !== 'party' || !(t.hp > 0)) continue;
    if (Math.hypot(t.x - x, t.z - z) <= radius + (t.radius ?? 0)) out.push(t);
  }
  return out;
}

// Neutral breakables (barricades, kegs, puffcaps) inside an area — enemy area
// attacks hit them too (a keg next to a toad's landing ring goes up).
export function neutralsInRadius(registry, x, z, radius) {
  const out = [];
  for (const t of registry.all()) {
    if (t.faction !== 'neutral' || !t.hittable || !(t.hp > 0)) continue;
    if (Math.hypot(t.x - x, t.z - z) <= radius + (t.radius ?? 0)) out.push(t);
  }
  return out;
}

// One enemy area/contact instance on a list of targets, knocked away from
// (fx, fz). Returns the number of instances delivered.
export function strike(ctx, e, targets, base, fx, fz, { delivery = 'contact', shape = 'contact' } = {}) {
  let n = 0;
  for (const t of targets) {
    if (!ctx.registry.byId(t.id) || !(t.hp > 0)) continue;
    const d = unit(t.x - fx, t.z - fz);
    const dir = d.l > 1e-6 ? d : { x: e.faceX ?? 0, z: e.faceZ ?? 1 };
    const r = ctx.combat.applyDamage(t, base, {
      delivery,
      shape,
      dirX: dir.x,
      dirZ: dir.z,
      attacker: e.id,
      source: e.kind,
    });
    if (r) n += 1;
  }
  return n;
}
