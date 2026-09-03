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
