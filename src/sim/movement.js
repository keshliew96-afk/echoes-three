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
import { ARENA } from '../core/constants.js';

export function innerBounds(radius) {
  return { mx: ARENA.halfW - radius, mz: ARENA.halfD - radius };
}

// Displace by (dx, dz), clamping each axis independently (slide). Returns
// true if any wall was contacted.
export function walkStep(e, dx, dz, radius) {
  const { mx, mz } = innerBounds(radius);
  e.x += dx;
  e.z += dz;
  let hit = false;
  if (e.x < -mx) { e.x = -mx; hit = true; }
  else if (e.x > mx) { e.x = mx; hit = true; }
  if (e.z < -mz) { e.z = -mz; hit = true; }
  else if (e.z > mz) { e.z = mz; hit = true; }
  return hit;
}

// Advance along (dx, dz), stopping at the FIRST wall contact (no slide).
// Returns { hit, t }: t in [0,1] is the fraction of the step actually
// traveled (t=0 => already flush against the wall: zero travel, §5).
export function sweptStep(e, dx, dz, radius) {
  const { mx, mz } = innerBounds(radius);
  let t = 1;
  if (dx > 0) t = Math.min(t, (mx - e.x) / dx);
  else if (dx < 0) t = Math.min(t, (-mx - e.x) / dx);
  if (dz > 0) t = Math.min(t, (mz - e.z) / dz);
  else if (dz < 0) t = Math.min(t, (-mz - e.z) / dz);
  const hit = t < 1;
  t = Math.max(0, Math.min(1, t));
  e.x += dx * t;
  e.z += dz * t;
  // Float-drift guard: never end outside the traversable rect.
  if (e.x < -mx) e.x = -mx;
  else if (e.x > mx) e.x = mx;
  if (e.z < -mz) e.z = -mz;
  else if (e.z > mz) e.z = mz;
  return { hit, t };
}
