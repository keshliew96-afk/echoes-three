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
import { FLOWER_TINTS, hslColor } from './colors.js';
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
// GAUNTLET (M4b): distance outside a biome's water channels (spec.water:
// [{ pts, w }]) — nothing grows on the race. Act I specs have no water.
function waterClearance(spec, x, z) {
  let best = Infinity;
  for (const ch of spec.water ?? []) {
    const pts = ch.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const len2 = dx * dx + dz * dz;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2)) : 0;
      best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)) - ch.w / 2);
    }
  }
  return best;
}

function sampleSpot(spec, cosmetic, footprints, tries = 28) {
  for (let i = 0; i < tries; i++) {
    const x = cosmetic.range(-ARENA.halfW + 0.35, ARENA.halfW - 0.35);
    const z = cosmetic.range(-ARENA.halfD + 0.35, ARENA.halfD - 0.35);
    if (pathClearance(spec, x, z) < 0.22) continue;
    if (spec.water && waterClearance(spec, x, z) < 0.12) continue;
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
  // GAUNTLET (M4b): a biome may tint its blades apart from the floor's lit
  // hue (mossy reeds on wet slate, dead ochre grass on ash). Act I: the floor.
  const bl = g.blade ?? g;

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
    // FIX ROUND 2: 0.38 on the night-floor arenas (0.28 elsewhere). With the
    // floor painted night-first the shade blades are the ones that sit on the
    // majority of the field, and a tuft lit like noon on an indigo floor reads
    // as a decal.
    const cool = cosmetic.chance(g.nightBase ? 0.38 : 0.28);
    if (cool && g.bladeCool === 'shade') {
      // Fix round 1: the halfway blend (g.h*0.45 + shH*0.55) lands at h~135
      // — the reserved heal band. Shade blades go to the shade hue itself,
      // dark and blue-green, so they read as grass in shadow and count cool.
      c.setHSL(
        (shH + 8 + r(-8, 8)) / 360,
        Math.min(1, shS + r(0.08, 0.16)),
        // GAUNTLET: a paved biome floor is lighter than the Act-I night
        // field, so its shade blades sit nearer the paving (`bladeShadeL`)
        // instead of reading as black specks. Act I: unset -> the floor's.
        Math.max(0.03, (g.bladeShadeL ?? shL) + r(0.05, 0.1)),
        SRGBColorSpace
      );
    } else if (cool) {
      c.setHSL(
        (g.h * 0.45 + shH * 0.55 + r(-10, 10)) / 360,
        Math.min(1, shS + r(0.1, 0.2)),
        Math.max(0.03, shL + r(0.05, 0.11)),
        SRGBColorSpace
      );
    } else {
      c.setHSL(
        (bl.h + r(-10, 8)) / 360,
        Math.min(1, bl.s + r(0.0, 0.12)),
        // Blades sit a step UNDER the lit floor value. Round 3's floor was so
        // dark that grass authored at floor value read fine; with the floor
        // lifted to its §19.3 value the same numbers turn the tufts into
        // yellow-white confetti, so they are keyed off the floor, not fixed.
        Math.max(0.03, bl.l * 0.78 + r(-0.01, 0.07)),
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
  // FLOWER_TINTS) — near-white blossoms read as scattered confetti. Each
  // blossom sits on a visible green STEM (a second instanced layer sharing the
  // same transforms): baseline-v030 F7 measured the bare floating blossoms as
  // detached orange berries hovering in mid-air.
  const flowerGeo = new IcosahedronGeometry(0.042, 0);
  flowerGeo.translate(0, 0.1, 0);
  const flowers = new InstancedMesh(flowerGeo, toonMaterial({ color: '#FFFFFF' }), spec.flowers);
  flowers.frustumCulled = false;
  const stemGeo = mergeGeometries([
    new ConeGeometry(0.014, 0.115, 5, 1, true).translate(0, 0.0575, 0),
    // A pair of tiny leaf cones so the stem reads as a plant, not a pin.
    new ConeGeometry(0.02, 0.055, 4, 1, true).rotateZ(1.05).translate(0.026, 0.038, 0),
    new ConeGeometry(0.017, 0.05, 4, 1, true).rotateZ(-1.15).translate(-0.024, 0.05, 0.008),
  ]);
  const stems = new InstancedMesh(
    stemGeo,
    toonMaterial({ color: hslColor(bl.h + 8, Math.min(1, bl.s + 0.05), Math.max(0.05, bl.l * 0.72)) }),
    spec.flowers
  );
  stems.frustumCulled = false;
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
    if (spec.water && waterClearance(spec, x, z) < 0.12) continue;
    if (blockedBy(footprints, x, z)) continue;
    q.setFromAxisAngle(UP, r(0, Math.PI * 2));
    p.set(x, 0, z);
    const sc = r(0.7, 1.25);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    flowers.setMatrixAt(placedF, m);
    stems.setMatrixAt(placedF, m);
    const tints = spec.flowerTints ?? FLOWER_TINTS;
    flowers.setColorAt(placedF, tints[Math.floor(r(0, tints.length))]);
    placedF += 1;
  }
  flowers.count = placedF;
  stems.count = placedF;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  stems.instanceMatrix.needsUpdate = true;
  root.add(stems);
  root.add(flowers);

  return { grassCount: placed, flowerCount: placedF };
}
