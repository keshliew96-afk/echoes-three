// Instanced foliage (§19.3: instanced grass tufts >=300 + small flowers).
// One InstancedMesh for grass, one for flowers — two draw calls total, with
// per-instance color from the cosmetic stream (hue jitter inside the green
// band; blossoms in warm family tints).
import {
  Color,
  ConeGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../core/constants.js';
import { toonMaterial } from '../render/toon.js';
import { FLOWER_TINTS } from './colors.js';
import { pathClearance } from './variants.js';

const UP = new Vector3(0, 1, 0);

// A tuft = 5 thin open cones: one tall center blade + 4 tilted outward.
function tuftGeometry() {
  const blades = [];
  const mk = (h) => {
    const g = new ConeGeometry(0.045, h, 4, 1, true);
    g.translate(0, h / 2, 0);
    return g;
  };
  blades.push(mk(0.3));
  for (let k = 0; k < 4; k++) {
    const b = mk(0.22);
    b.rotateZ(0.38);
    const ang = (k * Math.PI) / 2 + 0.4;
    b.rotateY(ang);
    b.translate(Math.cos(ang) * 0.055, 0, Math.sin(ang) * 0.055);
    blades.push(b);
  }
  return mergeGeometries(blades);
}

// Rejection-sample a spot: off the dirt path, thinned toward the arena center
// so the combat read stays clean (props+foliage concentrate at the edges).
function sampleSpot(spec, cosmetic, tries = 24) {
  for (let i = 0; i < tries; i++) {
    const x = cosmetic.range(-ARENA.halfW + 0.35, ARENA.halfW - 0.35);
    const z = cosmetic.range(-ARENA.halfD + 0.35, ARENA.halfD - 0.35);
    if (pathClearance(spec, x, z) < 0.22) continue;
    const central = Math.abs(x) < ARENA.halfW * 0.58 && Math.abs(z) < ARENA.halfD * 0.56;
    if (central && !cosmetic.chance(0.45)) continue;
    return { x, z };
  }
  return null;
}

export function buildFoliage(root, spec, cosmetic) {
  const r = (a, b) => cosmetic.range(a, b);
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  const c = new Color();
  const g = spec.ground;

  // --- Grass tufts.
  const grass = new InstancedMesh(tuftGeometry(), toonMaterial({ color: '#FFFFFF' }), spec.grass);
  grass.frustumCulled = false;
  let placed = 0;
  while (placed < spec.grass) {
    const spot = sampleSpot(spec, cosmetic);
    if (!spot) break;
    q.setFromAxisAngle(UP, r(0, Math.PI * 2));
    p.set(spot.x, 0, spot.z);
    const sc = r(0.75, 1.3);
    s.set(sc, sc * r(0.8, 1.25), sc);
    m.compose(p, q, s);
    grass.setMatrixAt(placed, m);
    // Blades sit mostly DARKER + more saturated than the ground so tufts read
    // as foliage, not pale spikes (the lit-side toon band lifts them ~1 step).
    c.setHSL(
      (g.h + r(-12, 10)) / 360,
      Math.min(1, g.s + r(0.06, 0.22)),
      Math.max(0.1, g.l + r(-0.14, 0.01))
    );
    grass.setColorAt(placed, c);
    placed += 1;
  }
  grass.count = placed;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  root.add(grass);

  // --- Flowers: warm-tinted blossoms in loose clusters.
  const flowerGeo = new IcosahedronGeometry(0.05, 0);
  flowerGeo.translate(0, 0.08, 0);
  const flowers = new InstancedMesh(flowerGeo, toonMaterial({ color: '#FFFFFF' }), spec.flowers);
  flowers.frustumCulled = false;
  const clusterN = Math.max(4, Math.round(spec.flowers / 8));
  const clusters = [];
  for (let i = 0; i < clusterN; i++) {
    const spot = sampleSpot(spec, cosmetic);
    if (spot) clusters.push(spot);
  }
  let placedF = 0;
  while (placedF < spec.flowers && clusters.length > 0) {
    const cl = clusters[Math.floor(r(0, clusters.length))];
    const x = cl.x + r(-0.9, 0.9);
    const z = cl.z + r(-0.9, 0.9);
    if (Math.abs(x) > ARENA.halfW - 0.3 || Math.abs(z) > ARENA.halfD - 0.3) continue;
    if (pathClearance(spec, x, z) < 0.15) continue;
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
