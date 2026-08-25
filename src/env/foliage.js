// Instanced foliage (§19.3: instanced grass tufts >=300 + small flowers).
// One InstancedMesh for grass, one for flowers — two draw calls total, with
// per-instance color from the cosmetic stream (hue jitter inside the green
// band, ramping between the LIT green and the COOL shade end so the field is
// never one flat value).
//
// PLACEMENT CONTRACT: a tuft may never sprout inside a solid prop. Blades
// rendering through crate faces and stump trunks is a scatter-rejection
// problem, not a depth-sort one, so buildProps hands over a list of footprint
// discs and every sample is rejected against them (plus the dirt paths).
import {
  Color,
  ConeGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../core/constants.js';
import { FLOWER_TINTS } from './colors.js';
import { toonMaterial } from '../render/toon.js';
import { pathClearance } from './variants.js';

const UP = new Vector3(0, 1, 0);

// A tuft = 5 thin open cones: one tall center blade + 4 tilted outward.
function tuftGeometry() {
  const blades = [];
  const mk = (h, r) => {
    const g = new ConeGeometry(r, h, 4, 1, true);
    g.translate(0, h / 2, 0);
    return g;
  };
  blades.push(mk(0.32, 0.045));
  for (let k = 0; k < 4; k++) {
    const b = mk(0.22, 0.038);
    b.rotateZ(0.42);
    const ang = (k * Math.PI) / 2 + 0.4;
    b.rotateY(ang);
    b.translate(Math.cos(ang) * 0.055, 0, Math.sin(ang) * 0.055);
    blades.push(b);
  }
  return mergeGeometries(blades);
}

function blockedBy(footprints, x, z) {
  for (let i = 0; i < footprints.length; i++) {
    const f = footprints[i];
    const dx = x - f.x;
    const dz = z - f.z;
    if (dx * dx + dz * dz < f.r * f.r) return true;
  }
  return false;
}

// Rejection-sample a spot: off the dirt path, out of every prop footprint,
// thinned toward the arena center so the combat read stays clean.
function sampleSpot(spec, cosmetic, footprints, tries = 28) {
  for (let i = 0; i < tries; i++) {
    const x = cosmetic.range(-ARENA.halfW + 0.35, ARENA.halfW - 0.35);
    const z = cosmetic.range(-ARENA.halfD + 0.35, ARENA.halfD - 0.35);
    if (pathClearance(spec, x, z) < 0.22) continue;
    if (blockedBy(footprints, x, z)) continue;
    const central = Math.abs(x) < ARENA.halfW * 0.58 && Math.abs(z) < ARENA.halfD * 0.56;
    if (central && !cosmetic.chance(0.8)) continue;
    return { x, z };
  }
  return null;
}

export function buildFoliage(root, spec, cosmetic, footprints = []) {
  const r = (a, b) => cosmetic.range(a, b);
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  const c = new Color();
  const g = spec.ground;
  const shH = g.shadeH ?? 170;
  const shS = g.shadeS ?? 0.26;
  const shL = g.shadeL ?? Math.max(0.05, g.l - 0.13);

  // --- Grass tufts.
  const grass = new InstancedMesh(tuftGeometry(), toonMaterial({ color: '#FFFFFF' }), spec.grass);
  grass.frustumCulled = false;
  let placed = 0;
  while (placed < spec.grass) {
    const spot = sampleSpot(spec, cosmetic, footprints);
    if (!spot) break;
    q.setFromAxisAngle(UP, r(0, Math.PI * 2));
    p.set(spot.x, 0, spot.z);
    const sc = r(0.7, 1.35);
    s.set(sc, sc * r(0.75, 1.3), sc);
    m.compose(p, q, s);
    grass.setMatrixAt(placed, m);
    // Blades ramp between the lit green and the cool shade end — the same ramp
    // the ground canvas paints, so tufts read as foliage silhouettes rather
    // than pale spikes. Authored in DISPLAY space (the linear-space default of
    // setHSL renders these ~2 value steps too bright, which is what turned an
    // earlier cut into yellow-white confetti).
    // The "cool" blades sit HALFWAY to the shade hue, not on it: a tuft
    // authored at the full indigo-teal shade hue renders as a navy speck on a
    // green field rather than as grass in shadow.
    const cool = cosmetic.chance(0.28);
    if (cool) {
      c.setHSL(
        (g.h * 0.45 + shH * 0.55 + r(-10, 10)) / 360,
        Math.min(1, shS + r(0.1, 0.22)),
        Math.max(0.03, shL + r(0.06, 0.13)),
        SRGBColorSpace
      );
    } else {
      c.setHSL(
        (g.h + r(-10, 8)) / 360,
        Math.min(1, g.s + r(0.02, 0.16)),
        Math.max(0.03, g.l + r(0.01, 0.1)),
        SRGBColorSpace
      );
    }
    grass.setColorAt(placed, c);
    placed += 1;
  }
  grass.count = placed;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  root.add(grass);

  // --- Flowers: warm-tinted blossoms in loose clusters. Small and muted (see
  // FLOWER_TINTS) — near-white blossoms read as scattered confetti.
  const flowerGeo = new IcosahedronGeometry(0.042, 0);
  flowerGeo.translate(0, 0.075, 0);
  const flowers = new InstancedMesh(flowerGeo, toonMaterial({ color: '#FFFFFF' }), spec.flowers);
  flowers.frustumCulled = false;
  const clusterN = Math.max(3, Math.round(spec.flowers / 14));
  const clusters = [];
  for (let i = 0; i < clusterN; i++) {
    const spot = sampleSpot(spec, cosmetic, footprints);
    if (spot) clusters.push(spot);
  }
  let placedF = 0;
  let guard = spec.flowers * 8;
  while (placedF < spec.flowers && clusters.length > 0 && guard-- > 0) {
    const cl = clusters[Math.floor(r(0, clusters.length))];
    const x = cl.x + r(-0.5, 0.5);
    const z = cl.z + r(-0.5, 0.5);
    if (Math.abs(x) > ARENA.halfW - 0.3 || Math.abs(z) > ARENA.halfD - 0.3) continue;
    if (pathClearance(spec, x, z) < 0.15) continue;
    if (blockedBy(footprints, x, z)) continue;
    q.setFromAxisAngle(UP, r(0, Math.PI * 2));
    p.set(x, 0, z);
    const sc = r(0.7, 1.25);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    flowers.setMatrixAt(placedF, m);
    flowers.setColorAt(placedF, FLOWER_TINTS[Math.floor(r(0, FLOWER_TINTS.length))]);
    placedF += 1;
  }
  flowers.count = placedF;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  root.add(flowers);

  return { grassCount: placed, flowerCount: placedF };
}
