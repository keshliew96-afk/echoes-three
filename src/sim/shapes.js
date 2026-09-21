// GAUNTLET OWNERSHIP: M4a only (docs/gauntlet/PLAN.md §2). M4b never edits
// this file — barricades/rubble reach the skill-bolt sweep through
// movement.sweptContact() (M4b's export), which M4a calls here.
//
// Delivery shapes (§6) — the closed set of 6, as pure sim primitives shared by
// every skill (and later by ally kits): target selection for `direct`, `nova`,
// `melee_arc`, aim fans + a swept skill-bolt subsystem for `projectile`,
// placement clamping for `ground_aoe`. `aura` and zone CLOCKS live with the
// skill system (they are per-caster / per-entity state, not geometry).
//
// Binding rules implemented here:
//   - count_final = max(1, floor(count)); arc half-angle clamped 10–90° (§6)
//   - count-capped shapes filter to eligible targets (living, not i-framed)
//     first; ties by spawn ordinal (§6)
//   - multi-hits within one delivery resolve near→far, ties by ascending
//     target id (§4 ①) — every selector returns targets already in that order
//   - heal smart-target (§8): lowest-HP-fraction living ally (self included)
//     within range; self exempt from the range test; tiebreak caster first,
//     then ascending party_index (never distance); override forces, an invalid
//     override falls back WITHOUT clearing; forced recipient excluded from the
//     remaining N−1 picks
//   - projectile fan: n bolts symmetric about aim, 12° spacing (n=2 → ±6°)
//   - projectiles: straight line, expire at range, swept vs walls AND bodies;
//     heal bolts hit the first ALLY in path and pass enemies (§7 Mending Bolt);
//     damage bolts hit the first hostile (same contact rule as basics)
//
// Sim discipline: no DOM, no render imports, no wall clock.
import { TICK_HZ } from '../core/constants.js';
import { sweptContactT, sweptStep } from './movement.js';

const r2 = (v) => Math.round(v * 100) / 100;
const FAN_STEP_RAD = (12 * Math.PI) / 180; // §6: 12° spacing
const ARC_EPS = 1e-4; // a target at the caster's own position is always in-arc
let nextBoltOwnerSeq = 0; // one id per createSkillBolts instance (see below)

export const countFinal = (count) => Math.max(1, Math.floor(count));
export const clampHalfAngle = (deg) => Math.min(90, Math.max(10, deg));

// n unit directions fanned symmetric about (dirX, dirZ): offsets
// (i - (n-1)/2) * 12°, so n=1 → straight, n=2 → ±6°, n=3 → −12/0/+12.
export function fanDirections(dirX, dirZ, count) {
  const n = countFinal(count);
  const base = Math.atan2(dirZ, dirX);
  const dirs = [];
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * FAN_STEP_RAD;
    dirs.push({ x: Math.cos(a), z: Math.sin(a) });
  }
  return dirs;
}

// First-contact parameter t in [0,1] of a point sweeping (dx, dz) against a
// circle at (cx, cz) with combined radius R; Infinity if no contact this step.
// Already-overlapping starts contact immediately (t = 0). Same math as the
// basic-bolt system (sim/projectiles.js) so skill bolts can never behave
// differently at a wall or a body.
export function circleContactT(px, pz, dx, dz, cx, cz, R) {
  const rx = px - cx;
  const rz = pz - cz;
  const c = rx * rx + rz * rz - R * R;
  if (c <= 0) return 0;
  const a = dx * dx + dz * dz;
  if (a < 1e-12) return Infinity;
  const b = 2 * (rx * dx + rz * dz);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : Infinity;
}

const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
};

// Near→far ordering from a reference point, ties by ascending spawn ordinal
// (§4 ①). Mutates and returns the array.
function sortNearFar(targets, refX, refZ) {
  return targets.sort((a, b) => {
    const da = dist2(a.x, a.z, refX, refZ);
    const db = dist2(b.x, b.z, refX, refZ);
    return da !== db ? da - db : a.id - b.id;
  });
}

// --- `direct` (§6 + §8): recipients = bottom-N by HP fraction.
// party: living-or-not member list in ascending party_index order (the caller
// passes registry truth); override: party_index 0–3 or null.
// Returns { targets (near→far), overrideMode: 'forced'|'fallback'|null }.
export function selectDirect({ caster, party, range, count, override = null, isIframed = () => false }) {
  const n = countFinal(count);
  const r2max = range * range;
  const eligible = party.filter(
    (m) =>
      m.hp > 0 &&
      !isIframed(m) &&
      (m.id === caster.id || dist2(m.x, m.z, caster.x, caster.z) <= r2max) // self exempt from range (§8)
  );
  // §8 sort: HP fraction ascending; tiebreak caster first, then ascending
  // party_index — NEVER distance.
  const byNeed = [...eligible].sort((a, b) => {
    const fa = a.hp / a.maxHp;
    const fb = b.hp / b.maxHp;
    if (fa !== fb) return fa - fb;
    if (a.id === caster.id) return -1;
    if (b.id === caster.id) return 1;
    return a.partyIndex - b.partyIndex;
  });

  let overrideMode = null;
  let chosen;
  if (override !== null) {
    const forced = eligible.find((m) => m.partyIndex === override);
    if (forced) {
      overrideMode = 'forced';
      chosen = [forced, ...byNeed.filter((m) => m.id !== forced.id).slice(0, n - 1)];
    } else {
      overrideMode = 'fallback'; // invalid (downed/out of range): smart-target, override NOT cleared
      chosen = byNeed.slice(0, n);
    }
  } else {
    chosen = byNeed.slice(0, n);
  }
  return { targets: sortNearFar(chosen, caster.x, caster.z), overrideMode };
}

// --- `nova` (§6): self burst, radius, max targets. Eligible living
// non-i-framed party members with center within the radius (self at d=0
// qualifies); capped near→far.
export function selectNova({ caster, party, radius, count, isIframed = () => false }) {
  const r2max = radius * radius;
  const eligible = party.filter(
    (m) => m.hp > 0 && !isIframed(m) && dist2(m.x, m.z, caster.x, caster.z) <= r2max
  );
  return sortNearFar(eligible, caster.x, caster.z).slice(0, countFinal(count));
}

// --- `melee_arc` (§6): reach u, arc half-angle ° about the live aim, max
// targets nearest-first. A target at the caster's own position (the caster
// itself — §15 counts the whole party as Restorative Wave's population) has a
// degenerate angle and counts as in-arc.
export function selectArc({ caster, party, aimX, aimZ, reach, halfAngleDeg, count, isIframed = () => false }) {
  const r2max = reach * reach;
  const half = (clampHalfAngle(halfAngleDeg) * Math.PI) / 180;
  const cosHalf = Math.cos(half);
  const alen = Math.hypot(aimX, aimZ);
  const ax = alen > 1e-9 ? aimX / alen : 1;
  const az = alen > 1e-9 ? aimZ / alen : 0;
  const eligible = party.filter((m) => {
    if (!(m.hp > 0) || isIframed(m)) return false;
    const dx = m.x - caster.x;
    const dz = m.z - caster.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > r2max) return false;
    const d = Math.sqrt(d2);
    if (d < ARC_EPS) return true; // degenerate: the caster's own position
    return (dx / d) * ax + (dz / d) * az >= cosHalf;
  });
  return sortNearFar(eligible, caster.x, caster.z).slice(0, countFinal(count));
}

// --- `ground_aoe` placement (§6): at cursor, clamped to range from caster.
// Degenerate/absent cursor places at the caster (§6: ground_aoe uses the
// cursor as-is; no cursor yet = the caster's own tile).
export function clampPlacement(caster, aim, range) {
  if (!aim) return { x: caster.x, z: caster.z };
  const dx = aim.x - caster.x;
  const dz = aim.z - caster.z;
  const d = Math.hypot(dx, dz);
  if (d <= range || d < 1e-9) return { x: aim.x, z: aim.z };
  const s = range / d;
  return { x: caster.x + dx * s, z: caster.z + dz * s };
}

// --- Skill-bolt subsystem (`projectile` shape). Mirrors sim/projectiles.js
// (straight line, swept, impact beats same-tick expiry) with the §7 targeting
// difference: heal bolts contact PARTY members other than the caster and pass
// enemies; damage bolts contact hittable hostiles (i-framed bodies are still
// contacted — the §9 pipeline resolves the contact to hit_immune).
export function createSkillBolts({ registry, events, onImpact, owner = null }) {
  // Owner tag: more than one subsystem instance can share the registry (the
  // healer kit + the build block's Echo recasts). Each instance advances ONLY
  // the bolts it spawned — otherwise every bolt would be stepped once per live
  // instance and fly at N x its briefed speed (§6: speeds are per-skill data).
  const me = owner ?? `bolts#${(nextBoltOwnerSeq += 1)}`;

  // opts: { x, z, dirX, dirZ, speed, range, radius, power, skill, heal, sourceId }
  function spawn(tick, opts) {
    const perTick = opts.speed / TICK_HZ;
    const b = registry.spawn({
      kind: 'skillbolt',
      boltOwner: me,
      x: opts.x,
      z: opts.z,
      px: opts.x,
      pz: opts.z,
      vx: opts.dirX * perTick,
      vz: opts.dirZ * perTick,
      traveled: 0,
      range: opts.range,
      radius: opts.radius,
      power: opts.power,
      skill: opts.skill,
      heal: !!opts.heal,
      sourceId: opts.sourceId,
    });
    events.emit(tick, 'skill_bolt_spawn', {
      id: b.id,
      skill: opts.skill,
      heal: b.heal,
      x: r2(opts.x),
      z: r2(opts.z),
      dx: r2(opts.dirX),
      dz: r2(opts.dirZ),
    });
    return b;
  }

  function contactable(bolt, e) {
    if (e.id === bolt.sourceId || !(e.hp > 0)) return false;
    if (bolt.heal) return e.partyIndex !== undefined; // first ally in path; passes enemies
    return !!e.hittable && e.faction !== 'party'; // first hostile in path
  }

  // Continuous-phase advance (§4 phase 1) — call once per tick after actors.
  function step(tick) {
    for (const b of registry.all()) {
      if (b.kind !== 'skillbolt' || b.boltOwner !== me) continue;
      const stepLen = Math.hypot(b.vx, b.vz);
      const remaining = b.range - b.traveled;
      let dx = b.vx;
      let dz = b.vz;
      let expires = false;
      if (stepLen >= remaining) {
        const s = stepLen > 0 ? remaining / stepLen : 0;
        dx *= s;
        dz *= s;
        expires = true;
      }
      let tHit = Infinity;
      let victim = null;
      for (const e of registry.all()) {
        if (!contactable(b, e)) continue;
        const t = circleContactT(b.x, b.z, dx, dz, e.x, e.z, b.radius + e.radius);
        if (t < tHit) {
          tHit = t;
          victim = e;
        }
      }
      const tWall = sweptContactT(b.x, b.z, dx, dz, b.radius);
      if (victim && tHit <= tWall) {
        b.x += dx * tHit;
        b.z += dz * tHit;
        b.traveled += Math.hypot(dx, dz) * tHit;
        despawn(tick, b, 'impact');
        onImpact(tick, b, victim);
      } else {
        const { hit, t } = sweptStep(b, dx, dz, b.radius);
        b.traveled += Math.hypot(dx, dz) * t;
        if (hit) despawn(tick, b, 'wall');
        else if (expires) despawn(tick, b, 'expired');
      }
    }
  }

  function despawn(tick, b, cause) {
    events.emit(tick, 'skill_bolt_despawn', {
      id: b.id,
      skill: b.skill,
      heal: b.heal,
      cause,
      traveled: r2(b.traveled),
      x: r2(b.x),
      z: r2(b.z),
    });
    registry.despawn(b.id);
  }

  return { spawn, step };
}
