// Movement + wall collision (§5, §13). The arena boundary is an axis-aligned
// rect; a circle of `radius` traverses the inner rect [-mx..mx] x [-mz..mz].
// Two motion flavors, both wall-safe:
//   - walkStep: per-axis end-point clamp => sliding along walls. The boundary
//     region is convex, so end-point clamping IS the swept result per axis at
//     walk speeds — walking can never tunnel.
//   - sweptStep: parametric first-contact test along the motion vector, STOP
//     at contact with no slide. §5 binds this for the dash (wall contact
//     terminates the dash; 7.2 u/s would tunnel thin geometry if
//     point-sampled) and projectiles reuse it so a 5.2 u/s bolt can't skip a
//     wall either. Interior walls (later arena variants) plug into these two
//     helpers, not into callers.
//
// STATIC COLLIDERS (camp block, Round D F3). A scene may hand the sim a list
// of solid prop footprints — circles `{x, z, r}` and yaw-rotated boxes
// `{x, z, hx, hz, yaw}` — via setStaticColliders(). Both step helpers then
// resolve the moving circle OUT of every footprint after the wall clamp
// (position projection along the contact normal: walking slides around a
// prop exactly the way it slides along a wall, and a dash that lands in one
// reports a hit so §5 can end it). Per-tick travel is far under the smallest
// footprint dimension (walk 0.04 u, dash 0.12 u vs >= 0.24 u), so end-point
// projection cannot tunnel. The list is EMPTY in every combat scene — the
// arena's edge props are dressing the brief keeps navigable (§19.3) — so this
// changes nothing on the combat path.
//
// DYNAMIC COLLIDERS (Gauntlet M4b, docs/gauntlet/PLAN.md §3.6 (a)/(g)). Layout
// blockers that live and die with the sim — barricades, rockfall rubble — are
// ENTITY-OWNED colliders the content systems (sim/interactables.js,
// sim/hazards.js) install every tick through setDynamicColliders(list). Same
// shapes as the statics (`{ x, z, r }` / `{ x, z, hx, hz, yaw }`) plus the
// owning entity id. walkStep / sweptStep resolve bodies out of them exactly
// like statics (fliers — `e.flier` — pass over them), and sweptContact() gives
// projectiles the first contact over walls + statics + dynamics with the
// blocker's entity id, so a bolt stops ON a barricade and the barricade takes
// the hit. The list is empty unless a layout placed a blocker, so every legacy
// path (the ?room= harness, the golden traces) is untouched.
import { ARENA } from '../core/constants.js';

export function innerBounds(radius) {
  return { mx: ARENA.halfW - radius, mz: ARENA.halfD - radius };
}

// --- Static colliders ------------------------------------------------------
let statics = [];

// Install (or clear, with null / []) the static collider list. Boxes are
// stored with their rotation pre-solved. Returns the installed count.
export function setStaticColliders(list) {
  statics = [];
  if (!list) return 0;
  for (const c of list) {
    if (c.hx !== undefined) {
      const yaw = c.yaw ?? 0;
      statics.push({
        kind: 'box',
        id: c.id ?? null,
        x: c.x,
        z: c.z,
        hx: c.hx,
        hz: c.hz,
        c: Math.cos(yaw),
        s: Math.sin(yaw),
      });
    } else {
      statics.push({ kind: 'circle', id: c.id ?? null, x: c.x, z: c.z, r: c.r });
    }
  }
  return statics.length;
}

export function staticColliders() {
  return statics;
}

// --- Dynamic (entity-owned) colliders --------------------------------------
let dynamics = [];

function solveCollider(c) {
  if (c.hx !== undefined) {
    const yaw = c.yaw ?? 0;
    return { kind: 'box', id: c.id ?? null, x: c.x, z: c.z, hx: c.hx, hz: c.hz, c: Math.cos(yaw), s: Math.sin(yaw) };
  }
  return { kind: 'circle', id: c.id ?? null, x: c.x, z: c.z, r: c.r };
}

// Install (or clear) the entity-owned collider list. Called by the content
// systems at the start of every tick they own blockers, so a collider exists
// exactly while its entity does. Returns the installed count.
export function setDynamicColliders(list) {
  dynamics = [];
  if (!list) return 0;
  for (const c of list) dynamics.push({ ...solveCollider(c), dyn: true });
  return dynamics.length;
}

export function dynamicColliders() {
  return dynamics;
}

// Module-level state for the save system (PLAN §3.4 rule 4): the dynamic list
// is DERIVED from entities (the content systems rebuild it every tick), and
// statics are re-installed by re-entering the saved scene mode — so the
// serialised form is the dynamic list as plain data, for completeness.
export function serializeMovement() {
  return {
    dynamics: dynamics.map((c) =>
      c.kind === 'box'
        ? { id: c.id, x: c.x, z: c.z, hx: c.hx, hz: c.hz, yaw: Math.atan2(c.s, c.c) }
        : { id: c.id, x: c.x, z: c.z, r: c.r }
    ),
  };
}

export function restoreMovement(data) {
  setDynamicColliders(data && Array.isArray(data.dynamics) ? data.dynamics : null);
}

// Signed clearance of a circle at (x, z) from the nearest static collider
// (negative = penetrating). Probe helper; the step helpers use resolveStatics.
export function staticClearance(x, z, radius) {
  let best = Infinity;
  for (const c of statics) {
    let d;
    if (c.kind === 'circle') {
      d = Math.hypot(x - c.x, z - c.z) - c.r - radius;
    } else {
      const dx = x - c.x;
      const dz = z - c.z;
      const lx = dx * c.c - dz * c.s;
      const lz = dx * c.s + dz * c.c;
      const qx = Math.max(-c.hx, Math.min(c.hx, lx));
      const qz = Math.max(-c.hz, Math.min(c.hz, lz));
      const out = Math.hypot(lx - qx, lz - qz);
      d = out > 0 ? out - radius : -Math.min(c.hx - Math.abs(lx), c.hz - Math.abs(lz)) - radius;
    }
    if (d < best) best = d;
  }
  return best;
}

// Push the circle (e.x, e.z, radius) out of every static collider it
// overlaps. Three sweeps let a corner shared by two props settle. Ends with a
// wall re-clamp so a prop can never project a body outside the rect. Returns
// true if any contact was resolved.
export function resolveStatics(e, radius) {
  const useDyn = dynamics.length > 0 && !e.flier && !e.burrowed; // fliers pass over, burrowers under
  if (statics.length === 0 && !useDyn) return false;
  const list = useDyn ? (statics.length > 0 ? statics.concat(dynamics) : dynamics) : statics;
  let pushed = false;
  for (let pass = 0; pass < 3; pass++) {
    let any = false;
    for (const c of list) {
      if (c.dyn && c.id === e.id) continue; // an entity never collides with its own collider
      if (c.kind === 'circle') {
        const dx = e.x - c.x;
        const dz = e.z - c.z;
        const want = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= want * want) continue;
        const d = Math.sqrt(d2);
        if (d < 1e-6) {
          e.x = c.x + want;
        } else {
          const k = want / d;
          e.x = c.x + dx * k;
          e.z = c.z + dz * k;
        }
        any = true;
      } else {
        // World -> box-local (rotate by -yaw; props use rotation.y = yaw).
        const dx = e.x - c.x;
        const dz = e.z - c.z;
        const lx = dx * c.c - dz * c.s;
        const lz = dx * c.s + dz * c.c;
        const qx = Math.max(-c.hx, Math.min(c.hx, lx));
        const qz = Math.max(-c.hz, Math.min(c.hz, lz));
        const nx = lx - qx;
        const nz = lz - qz;
        const d = Math.hypot(nx, nz);
        if (d >= radius) continue;
        let px;
        let pz;
        if (d > 1e-6) {
          const k = radius / d;
          px = qx + nx * k;
          pz = qz + nz * k;
        } else {
          // Centre inside the box: leave through the nearest face.
          const ex = c.hx - Math.abs(lx);
          const ez = c.hz - Math.abs(lz);
          if (ex < ez) {
            px = (lx < 0 ? -1 : 1) * (c.hx + radius);
            pz = lz;
          } else {
            pz = (lz < 0 ? -1 : 1) * (c.hz + radius);
            px = lx;
          }
        }
        e.x = c.x + px * c.c + pz * c.s;
        e.z = c.z - px * c.s + pz * c.c;
        any = true;
      }
    }
    if (!any) break;
    pushed = true;
  }
  if (pushed) {
    const { mx, mz } = innerBounds(radius);
    if (e.x < -mx) e.x = -mx;
    else if (e.x > mx) e.x = mx;
    if (e.z < -mz) e.z = -mz;
    else if (e.z > mz) e.z = mz;
  }
  return pushed;
}

// Displace by (dx, dz), clamping each axis independently (slide). Returns
// true if any wall (or static collider) was contacted.
export function walkStep(e, dx, dz, radius) {
  const { mx, mz } = innerBounds(radius);
  e.x += dx;
  e.z += dz;
  let hit = false;
  if (e.x < -mx) { e.x = -mx; hit = true; }
  else if (e.x > mx) { e.x = mx; hit = true; }
  if (e.z < -mz) { e.z = -mz; hit = true; }
  else if (e.z > mz) { e.z = mz; hit = true; }
  if ((statics.length > 0 || dynamics.length > 0) && resolveStatics(e, radius)) hit = true;
  return hit;
}

// Pure first-contact parameter for a swept circle vs the arena walls: the
// fraction t in [0,1] of step (dx, dz) traveled before wall contact (1 = no
// contact, may exceed 1 pre-clamp). Shared by sweptStep and the projectile
// system (which must compare wall-contact t against entity-impact t without
// mutating the bolt first).
export function sweptContactT(x, z, dx, dz, radius) {
  const { mx, mz } = innerBounds(radius);
  let t = 1;
  if (dx > 0) t = Math.min(t, (mx - x) / dx);
  else if (dx < 0) t = Math.min(t, (-mx - x) / dx);
  if (dz > 0) t = Math.min(t, (mz - z) / dz);
  else if (dz < 0) t = Math.min(t, (-mz - z) / dz);
  return t;
}

// Advance along (dx, dz), stopping at the FIRST wall contact (no slide).
// Returns { hit, t }: t in [0,1] is the fraction of the step actually
// traveled (t=0 => already flush against the wall: zero travel, §5). A static
// collider contact after the move also reports hit (the dash ends on it).
export function sweptStep(e, dx, dz, radius) {
  const { mx, mz } = innerBounds(radius);
  let t = sweptContactT(e.x, e.z, dx, dz, radius);
  let hit = t < 1;
  t = Math.max(0, Math.min(1, t));
  e.x += dx * t;
  e.z += dz * t;
  // Float-drift guard: never end outside the traversable rect.
  if (e.x < -mx) e.x = -mx;
  else if (e.x > mx) e.x = mx;
  if (e.z < -mz) e.z = -mz;
  else if (e.z > mz) e.z = mz;
  if ((statics.length > 0 || dynamics.length > 0) && resolveStatics(e, radius)) hit = true;
  return { hit, t };
}

// --- Swept contact vs colliders (PLAN §3.6 (g)) -----------------------------
// First contact parameter of a circle of `radius` sweeping (dx, dz) from
// (x, z) against ONE collider: a circle (quadratic) or a yaw-rotated box
// expanded by the radius (slab method in box-local space; the corner rounding
// is ignored — a projectile's radius is <= 0.07 u). Already overlapping = 0.
function colliderContactT(c, x, z, dx, dz, radius) {
  if (c.kind === 'circle') {
    const R = c.r + radius;
    const rx = x - c.x;
    const rz = z - c.z;
    const cc = rx * rx + rz * rz - R * R;
    if (cc <= 0) return 0;
    const a = dx * dx + dz * dz;
    if (a < 1e-12) return Infinity;
    const b = 2 * (rx * dx + rz * dz);
    const disc = b * b - 4 * a * cc;
    if (disc < 0) return Infinity;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : Infinity;
  }
  // World -> box-local (same rotation convention as resolveStatics).
  const ox = x - c.x;
  const oz = z - c.z;
  const lx = ox * c.c - oz * c.s;
  const lz = ox * c.s + oz * c.c;
  const ldx = dx * c.c - dz * c.s;
  const ldz = dx * c.s + dz * c.c;
  const ex = c.hx + radius;
  const ez = c.hz + radius;
  if (Math.abs(lx) <= ex && Math.abs(lz) <= ez) return 0;
  let t0 = 0;
  let t1 = 1;
  for (const [p, d, e] of [
    [lx, ldx, ex],
    [lz, ldz, ez],
  ]) {
    if (Math.abs(d) < 1e-12) {
      if (Math.abs(p) > e) return Infinity;
      continue;
    }
    let ta = (-e - p) / d;
    let tb = (e - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return Infinity;
  }
  return t0 >= 0 && t0 <= 1 ? t0 : Infinity;
}

// Dynamic (entity-owned) colliders only: { t, entityId } of the earliest
// contact along the step, t = Infinity when none. Ascending install order on
// exact ties (the content systems install in ascending entity id).
export function sweptDynamicContact(x, z, dx, dz, radius) {
  let best = Infinity;
  let id = null;
  for (const c of dynamics) {
    const t = colliderContactT(c, x, z, dx, dz, radius);
    if (t < best) {
      best = t;
      id = c.id;
    }
  }
  return { t: best, entityId: id };
}

// sweptContact(x, z, dx, dz, radius) -> { t, entityId | null } — the FIRST
// contact over walls, static colliders and dynamic colliders (PLAN §3.6 (g),
// the contract shapes.js calls for skill + echo bolts). t in [0, 1]; t === 1
// with entityId null means no contact this step. entityId is set only when the
// first contact is an entity-owned dynamic collider (a barricade, rubble).
export function sweptContact(x, z, dx, dz, radius) {
  let t = Math.max(0, Math.min(1, sweptContactT(x, z, dx, dz, radius)));
  let entityId = null;
  for (const c of statics) {
    const ct = colliderContactT(c, x, z, dx, dz, radius);
    if (ct < t) t = ct;
  }
  for (const c of dynamics) {
    const ct = colliderContactT(c, x, z, dx, dz, radius);
    if (ct < t) {
      t = ct;
      entityId = c.id;
    }
  }
  return { t, entityId };
}
