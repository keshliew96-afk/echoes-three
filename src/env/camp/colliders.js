// Camp static colliders (Round D camp critic F3: "nothing in the camp is
// solid" — the Healer stood IN the hearth 0.29 u from its centre and walked
// straight through a tent).
//
// One authored footprint per solid prop type, in the prop's own frame, scaled
// by the instance scale and rotated by its yaw. Circles for round things
// (the hearth's stone ring, the woodpile, poles, stones), yaw-rotated boxes
// for the long ones (tents, benches, bedrolls, the forge, the stall, the
// cart). The shapes are the VISIBLE mass, not the shadow footprint props.js
// hands the foliage placer (that one is padded +0.16 so grass stays clear):
// a body should stop at the canvas, not a hand-width short of it.
//
// Deliberately walkable: the portal's THRESHOLD (only its two jambs are
// solid — the run starts by standing on the sill), lantern light pools, and
// every perimeter-scrub cluster from the shared Act-1 set (bushes, logs and
// stumps the brief keeps navigable, §19.3).
import { CAMP_SPEC } from './spec.js';

export const CAMP_COLLIDER_SHAPES = Object.freeze({
  hearth: { r: 0.9 }, // stone ring outer edge (critic F3: "hearth ring r~0.9")
  tripod: { r: 0.34 },
  bench: { hx: 0.58, hz: 0.2 },
  woodpile: { r: 0.5 },
  tent: { hx: 0.66, hz: 0.95 },
  bedroll: { hx: 0.46, hz: 0.26 },
  forge: { hx: 0.56, hz: 0.42 },
  anvil: { r: 0.34 },
  rack: { hx: 0.58, hz: 0.28 },
  stall: { hx: 0.9, hz: 0.7 },
  sack: { r: 0.24 },
  cart: { hx: 0.8, hz: 0.62 },
  lanternpole: { r: 0.16 }, // the pole, not the crossarm
  banner: { r: 0.12 },
  runestone: { r: 0.3 },
  // Two jambs at local x = +-0.72 (props.js: jamb(-0.72), jamb(0.72)); the
  // sill between them stays open.
  portal: { jambs: [-0.72, 0.72], r: 0.2 },
});

// Build the sim collider list for a camp spec: [{ id, x, z, r } | { id, x,
// z, hx, hz, yaw }] in the shape sim/movement.js setStaticColliders takes.
export function buildCampColliders(spec = CAMP_SPEC) {
  const out = [];
  for (const [type, x, z, yaw = 0, s = 1] of spec.props ?? []) {
    const shape = CAMP_COLLIDER_SHAPES[type];
    if (!shape) continue;
    if (shape.jambs) {
      // Local -> world under rotation.y = yaw: wx = lx cos + lz sin,
      // wz = -lx sin + lz cos (lz = 0 here).
      const c = Math.cos(yaw);
      const sn = Math.sin(yaw);
      for (const lx of shape.jambs)
        out.push({ id: type, x: x + lx * s * c, z: z - lx * s * sn, r: shape.r * s });
    } else if (shape.hx !== undefined) {
      out.push({ id: type, x, z, hx: shape.hx * s, hz: shape.hz * s, yaw });
    } else {
      out.push({ id: type, x, z, r: shape.r * s });
    }
  }
  return out;
}

// --- Road clearance guard ---------------------------------------------------
// Round D2 camp critic F1: the Round-D collider fix turned the authored west
// road into a dead end (tent 3 + bedroll + forge on paths[1] left a 0.18 u
// gap for a 0.60 u body). Sweep a body-radius circle (+ margin) along every
// path centreline against the built colliders; any penetration is a layout
// bug. Returns [] when every road is walkable, else one record per violating
// sample. camp.js calls this at build time and warns; it is also exported so
// a probe can run it headlessly (`node -e "import('./src/env/camp/colliders.js')
// .then(m => console.log(m.campRoadsClear()))"`).
export const ROAD_BODY_RADIUS = 0.3; // the party body radius sim/movement.js uses
export const ROAD_MARGIN = 0.1; // a little air beyond the body
// Props a road is AUTHORED to run into: both tracks end at the hearth's stone
// ring ("two tracks, both through the fire"), and the gate road threads the
// portal's two jambs (the sill between them is the doorway — a 0.60 u body
// clears the 1.04 u gap, which is exactly the walkable width the spec wants).
export const ROAD_TERMINI = Object.freeze(['hearth', 'portal']);

function clearanceAt(colliders, x, z, radius) {
  let best = Infinity;
  let hit = null;
  for (const c of colliders) {
    let d;
    if (c.hx === undefined) {
      d = Math.hypot(x - c.x, z - c.z) - c.r - radius;
    } else {
      const yaw = c.yaw ?? 0;
      const cs = Math.cos(yaw);
      const sn = Math.sin(yaw);
      const dx = x - c.x;
      const dz = z - c.z;
      const lx = dx * cs - dz * sn;
      const lz = dx * sn + dz * cs;
      const qx = Math.max(-c.hx, Math.min(c.hx, lx));
      const qz = Math.max(-c.hz, Math.min(c.hz, lz));
      const out = Math.hypot(lx - qx, lz - qz);
      d = out > 0 ? out - radius : -Math.min(c.hx - Math.abs(lx), c.hz - Math.abs(lz)) - radius;
    }
    if (d < best) {
      best = d;
      hit = c;
    }
  }
  return { clearance: best, hit };
}

export function campRoadsClear(
  spec = CAMP_SPEC,
  radius = ROAD_BODY_RADIUS + ROAD_MARGIN,
  step = 0.1,
  ignore = ROAD_TERMINI
) {
  const colliders = buildCampColliders(spec).filter((c) => !ignore.includes(c.id));
  const out = [];
  (spec.paths ?? []).forEach((path, pi) => {
    const pts = path.pts;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.ceil(len / step));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        const { clearance, hit } = clearanceAt(colliders, x, z, radius);
        if (clearance < 0) {
          out.push({
            path: pi,
            seg: i,
            x: +x.toFixed(2),
            z: +z.toFixed(2),
            id: hit?.id ?? null,
            at: hit ? [+hit.x.toFixed(2), +hit.z.toFixed(2)] : null,
            clearance: +clearance.toFixed(3),
          });
        }
      }
    }
  });
  return out;
}
