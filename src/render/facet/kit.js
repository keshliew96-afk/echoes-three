// THE PARTS KIT (docs/MODEL_STANDARD.md). The sample video's detail comes from
// repetition, not sculpting: hundreds of small box scales laid along a curve,
// a metal band every few segments, rows of thin wedges for spines, teeth, fin
// rays and claws. Each kind of part here is ONE InstancedMesh (one draw call
// for a whole row, plus one for its ink), faceted, with a per-instance value
// step so a row of identical plates still reads as separate pieces.
//
//   wedgeGeometry()            a thin faceted blade, base at y=0, tip at y=1
//   plateGeometry()            a faceted unit plate (a slab with a raised ridge)
//   instancedPart(...)         an InstancedMesh of one part, with thin ink
//   createPlateTube(...)       scales round a moving spine (plus metal bands)
//   createSpineRow(...)        wedges along the top of a moving spine
//   placeRow(...)              a fixed row of parts (teeth, a crest fan, claws)
//   createSpine(n)             a Catmull-Rom spine through n moving points
import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, Matrix4, Vector3 } from 'three';
import { sharedGeo } from '../geocache.js';
import { addInstancedInk } from '../critters/common.js';
import { facetize, hash01 } from './material.js';

// The ink a row of small parts carries: thinner than the 2.7 px silhouette
// line, so at play zoom the scales read as plates with dark seams, not as a
// black mesh (the video's dark gaps between scales).
export const PART_INK_PX = 1.35;

// Hand-built convex parts: wind every triangle to face away from the centre
// (so it is front-facing and its flat normal points out).
function outward(positions, cx, cy, cz) {
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
    const ux = positions[i + 3] - ax, uy = positions[i + 4] - ay, uz = positions[i + 5] - az;
    const vx = positions[i + 6] - ax, vy = positions[i + 7] - ay, vz = positions[i + 8] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (ax + positions[i + 3] + positions[i + 6]) / 3 - cx;
    const my = (ay + positions[i + 4] + positions[i + 7]) / 3 - cy;
    const mz = (az + positions[i + 5] + positions[i + 8]) / 3 - cz;
    if (nx * mx + ny * my + nz * mz < 0) {
      for (let k = 0; k < 3; k++) {
        const t = positions[i + 3 + k];
        positions[i + 3 + k] = positions[i + 6 + k];
        positions[i + 6 + k] = t;
      }
    }
  }
  return positions;
}

// A thin blade: a diamond cross-section (4 long faces) tapering to a point,
// so the light catches one flank and the other falls dark.
export function wedgeGeometry() {
  return sharedGeo('facet:wedge', () => {
    const w = 0.5;
    const d = 0.16;
    const v = [
      // base diamond (y = 0): +x, +z, -x, -z ; tip (y = 1)
      [w, 0, 0],
      [0, 0, d],
      [-w, 0, 0],
      [0, 0, -d],
      [0, 1, 0],
    ];
    const tri = [
      [0, 4, 1],
      [1, 4, 2],
      [2, 4, 3],
      [3, 4, 0],
      [0, 1, 2],
      [0, 2, 3],
    ];
    const pos = [];
    for (const t of tri) for (const i of t) pos.push(...v[i]);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(outward(pos, 0, 0.3, 0), 3));
    return facetize(g, { jitter: 0.08, seed: 3 });
  });
}

// A unit plate (x 1, z 1, about 0.55 high before scaling): a thin slab with
// a raised ridge along z, so even a flat scale has a lit and a dark half.
export function plateGeometry() {
  return sharedGeo('facet:plate', () => {
    const box = new BoxGeometry(1, 1, 1);
    const ridge = new BufferGeometry();
    // top: two sloped faces meeting on a ridge at y = 0.5 along z
    const hx = 0.5;
    const top = [
      // left slope
      [-hx, 0.05, -0.5], [0, 0.5, -0.5], [0, 0.5, 0.5],
      [-hx, 0.05, -0.5], [0, 0.5, 0.5], [-hx, 0.05, 0.5],
      // right slope
      [0, 0.5, -0.5], [hx, 0.05, -0.5], [hx, 0.05, 0.5],
      [0, 0.5, -0.5], [hx, 0.05, 0.5], [0, 0.5, 0.5],
      // front gable
      [-hx, 0.05, 0.5], [0, 0.5, 0.5], [hx, 0.05, 0.5],
      // back gable
      [hx, 0.05, -0.5], [0, 0.5, -0.5], [-hx, 0.05, -0.5],
    ];
    const pos = [];
    for (const v of top) pos.push(...v);
    // the slab under it (from the box, non-indexed)
    const slab = box.toNonIndexed().attributes.position;
    // a thin slab under the ridge: y from -0.05 to 0.05
    for (let i = 0; i < slab.count; i++) pos.push(slab.getX(i), slab.getY(i) * 0.1, slab.getZ(i));
    ridge.setAttribute('position', new Float32BufferAttribute(outward(pos, 0, 0.1, 0), 3));
    return facetize(ridge, { jitter: 0.07, seed: 5 });
  });
}

// An InstancedMesh of one part, inked (thin) unless asked not to be. Moving
// rows switch frustum culling off: their bounds change every frame.
export function instancedPart(geometry, material, count, { ink = true, inkPx = PART_INK_PX, name = 'parts', moving = false } = {}) {
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.name = name;
  if (moving) mesh.frustumCulled = false;
  if (ink) addInstancedInk(mesh, inkPx);
  return mesh;
}

// Per-instance value steps (the mottled read of the video's scales).
const tmpC = new Color();
export function mottle(mesh, amount = 0.12, seed = 1) {
  for (let i = 0; i < mesh.count; i++) {
    const v = 1 + amount * (2 * hash01(i, seed, 11) - 1);
    mesh.setColorAt(i, tmpC.setRGB(v, v, v));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// Write a basis + scale + position straight into a matrix (no allocation).
// X, Y, Z are unit axes; the part's local axes map onto them.
export function setTRS(m, P, X, Y, Z, sx, sy, sz) {
  const e = m.elements;
  e[0] = X.x * sx; e[1] = X.y * sx; e[2] = X.z * sx; e[3] = 0;
  e[4] = Y.x * sy; e[5] = Y.y * sy; e[6] = Y.z * sy; e[7] = 0;
  e[8] = Z.x * sz; e[9] = Z.y * sz; e[10] = Z.z * sz; e[11] = 0;
  e[12] = P.x; e[13] = P.y; e[14] = P.z; e[15] = 1;
  return m;
}

// ---------------------------------------------------------------------------
// A moving spine: n control points (set every frame by the rig), sampled as a
// centripetal-ish Catmull-Rom curve with a parallel-transport-free frame
// (world up projected off the tangent: the coil lies on the ground, so up is
// never along it for long; a vertical tangent falls back to +Z).
// ---------------------------------------------------------------------------
export function createSpine(n) {
  const pts = Array.from({ length: n }, () => new Vector3());
  const a = new Vector3();
  const b = new Vector3();
  const UP = new Vector3(0, 1, 0);
  function cr(out, p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    out.set(0, 0, 0);
    out.addScaledVector(p0, -0.5 * t3 + t2 - 0.5 * t);
    out.addScaledVector(p1, 1.5 * t3 - 2.5 * t2 + 1);
    out.addScaledVector(p2, -1.5 * t3 + 2 * t2 + 0.5 * t);
    out.addScaledVector(p3, 0.5 * t3 - 0.5 * t2);
    return out;
  }
  const spine = {
    pts,
    // u in 0..1 from the first point to the last.
    point(u, out) {
      const f = Math.min(n - 1 - 1e-6, Math.max(0, u * (n - 1)));
      const i = Math.floor(f);
      const t = f - i;
      return cr(out, pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(n - 1, i + 2)], t);
    },
    // The frame at u: P, T (toward the tail), N (up-ish), B (side).
    frame(u, P, T, N, B) {
      spine.point(u, P);
      const du = 0.5 / (n - 1);
      spine.point(Math.min(1, u + du), a);
      spine.point(Math.max(0, u - du), b);
      T.subVectors(a, b);
      if (T.lengthSq() < 1e-10) T.set(0, 0, -1);
      T.normalize();
      N.copy(UP).addScaledVector(T, -UP.dot(T));
      if (N.lengthSq() < 1e-6) N.set(0, 0, 1).addScaledVector(T, -T.z);
      N.normalize();
      B.crossVectors(T, N);
    },
  };
  return spine;
}

// ---------------------------------------------------------------------------
// Scales round a spine. `rings` rings from u0 to u1; each ring lays `around`
// plates over the top arc (the belly is on the ground), each plate facing out
// and tipped back along the body so it overlaps the one behind like a scale.
// Every `bandEvery`-th ring is a metal band instead (its own material).
// radius(u) gives the body's radius along it.
// ---------------------------------------------------------------------------
export function createPlateTube({
  spine,
  rings,
  around,
  arc = Math.PI * 1.25,
  u0 = 0,
  u1 = 1,
  radius,
  plateMat,
  bandMat = null,
  bandEvery = 0,
  bandAround = 0,
  tilt = 0.32,
  thick = 0.09,
  name = 'scales',
}) {
  const bandRings = [];
  const plateRings = [];
  for (let r = 0; r < rings; r++) (bandEvery > 0 && r % bandEvery === bandEvery - 1 ? bandRings : plateRings).push(r);
  const bAround = bandAround || around + 2;
  const plates = instancedPart(plateGeometry(), plateMat, plateRings.length * around, { name, moving: true });
  mottle(plates, 0.14, 7);
  const bands = bandMat && bandRings.length ? instancedPart(plateGeometry(), bandMat, bandRings.length * bAround, { name: `${name}-bands`, moving: true }) : null;
  if (bands) mottle(bands, 0.08, 9);
  const P = new Vector3();
  const T = new Vector3();
  const N = new Vector3();
  const B = new Vector3();
  const out = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const m = new Matrix4();
  const step = (u1 - u0) / rings;

  function layRing(mesh, idx, r, count, scaleW, metal) {
    const u = u0 + (r + 0.5) * step;
    spine.frame(u, P, T, N, B);
    const R = radius(u);
    // the LOCAL arc length of this ring: a stretched stretch of spine (a
    // reared neck) gets longer plates, so a bend never opens a gap
    spine.point(Math.max(0, u - step * 0.5), sa);
    spine.point(Math.min(1, u + step * 0.5), sb);
    const segLen = Math.max(step * spineLength() * 0.6, sa.distanceTo(sb));
    // every other ring shifts half a plate: the scales lie in a brick
    // pattern, the way a snake's do (and the video's)
    const shift = metal || r % 2 === 0 ? 0.5 : 0.0;
    for (let j = 0; j < count; j++) {
      const th = -arc / 2 + (arc * (j + shift)) / count;
      // outward normal of this plate
      Y.copy(N).multiplyScalar(Math.cos(th)).addScaledVector(B, Math.sin(th));
      out.copy(P).addScaledVector(Y, R * (metal ? 1.02 : 0.96));
      // along the body, tipped back so the trailing edge lifts
      Z.copy(T);
      const c = Math.cos(metal ? 0 : tilt);
      const s = Math.sin(metal ? 0 : tilt);
      // rotate (Y, Z) about X by the tilt
      X.crossVectors(Y, Z).normalize();
      const yx = Y.x * c + Z.x * s, yy = Y.y * c + Z.y * s, yz = Y.z * c + Z.z * s;
      const zx = Z.x * c - Y.x * s, zy = Z.y * c - Y.y * s, zz = Z.z * c - Y.z * s;
      Y.set(yx, yy, yz);
      Z.set(zx, zy, zz);
      const w = ((arc * R) / count) * scaleW;
      // thin parts of the body (the tail) get shorter plates, so the scales
      // stay scales instead of bristling out like a brush
      const lenK = Math.min(1, 0.35 + R / 0.42);
      setTRS(m, out, X, Y, Z, w, metal ? thick * 1.6 : thick * 1.4, segLen * (metal ? 0.62 : 1.38) * lenK);
      mesh.setMatrixAt(idx + j, m);
    }
  }
  // Arc length of the spine (sampled; cheap at these sizes).
  const sa = new Vector3();
  const sb = new Vector3();
  let length = 1;
  function spineLength() {
    return length;
  }
  function update() {
    length = 0;
    spine.point(0, sa);
    for (let k = 1; k <= 16; k++) {
      spine.point(k / 16, sb);
      length += sa.distanceTo(sb);
      sa.copy(sb);
    }
    let i = 0;
    for (const r of plateRings) {
      layRing(plates, i, r, around, 1.18, false);
      i += around;
    }
    plates.instanceMatrix.needsUpdate = true;
    if (bands) {
      let k = 0;
      for (const r of bandRings) {
        layRing(bands, k, r, bAround, 1.08, true);
        k += bAround;
      }
      bands.instanceMatrix.needsUpdate = true;
    }
  }
  return { plates, bands, update };
}

// ---------------------------------------------------------------------------
// A row of wedges along the top of a spine (dorsal spikes). height(u) gives
// the spike height; tips lean back along the body. `tip` adds a second row
// in another material over the top `frac` of each blade (the video's gold
// tips); `offset` shifts the row along the spine (a row between the spikes).
// ---------------------------------------------------------------------------
export function createSpineRow({ spine, count, u0 = 0, u1 = 1, height, radius, mat, lean = 0.55, name = 'spikes', ink = true, tip = null, offset = 0 }) {
  const mesh = instancedPart(wedgeGeometry(), mat, count, { name, moving: true, ink });
  mottle(mesh, 0.1, 13);
  const tips = tip ? instancedPart(wedgeGeometry(), tip.mat, count, { name: `${name}-tips`, moving: true, ink: false }) : null;
  const P = new Vector3();
  const T = new Vector3();
  const N = new Vector3();
  const B = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const pos = new Vector3();
  const m = new Matrix4();
  function update() {
    for (let i = 0; i < count; i++) {
      const u = Math.min(1, u0 + ((u1 - u0) * (i + 0.5)) / count + offset);
      spine.frame(u, P, T, N, B);
      const h = height(u, i);
      pos.copy(P).addScaledVector(N, radius(u) * 0.9);
      // blade up the normal, leaning back toward the tail
      Y.copy(N).multiplyScalar(Math.cos(lean)).addScaledVector(T, Math.sin(lean));
      Z.copy(T).multiplyScalar(Math.cos(lean)).addScaledVector(N, -Math.sin(lean));
      setTRS(m, pos, B, Y, Z, h * 0.42, h, h * 0.9);
      mesh.setMatrixAt(i, m);
      if (tips) {
        // the tip: the top `frac` of the same blade, a hair proud of it
        const f = tip.frac;
        pos.addScaledVector(Y, h * (1 - f));
        setTRS(m, pos, B, Y, Z, h * 0.42 * f * 1.08, h * f * 1.02, h * 0.9 * f * 1.08);
        tips.setMatrixAt(i, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (tips) tips.instanceMatrix.needsUpdate = true;
  }
  return { mesh, tips, update };
}

// ---------------------------------------------------------------------------
// A fixed row of parts: `place(i, m)` writes instance i's matrix once.
// ---------------------------------------------------------------------------
export function placeRow(geometry, mat, count, place, opts = {}) {
  const mesh = instancedPart(geometry, mat, count, opts);
  const m = new Matrix4();
  for (let i = 0; i < count; i++) {
    place(i, m.identity());
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (opts.mottle !== 0) mottle(mesh, opts.mottle ?? 0.1, opts.seed ?? 17);
  return mesh;
}
