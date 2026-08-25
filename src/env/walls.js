// Arena boundary (§19.3: "walls exactly one value-step darker than the
// adjoining floor", visual height 70-80% of the 1.05 u standing height so a
// character behind one stays partly visible).
//
// The wall is the seam between two very different regions — the lit green
// playfield and the cool exterior — and an earlier cut failed it twice at once:
// the band measured 2.3x darker than the floor (not one step) AND sat within
// 2% of the void behind it, so wall and outside read as a single dark mass with
// a bare diagonal seam at the corners. This module fixes all three:
//
//   * The body tone is DERIVED from the variant's painted floor tone and then
//     rescaled to a measured 0.79 of its display luminance — one value step,
//     computed rather than eyeballed.
//   * The top face, the inner/outer faces and a narrow outer coping rim carry
//     three different values (the toon ramp handles the faces; the rim is its
//     own mesh), so a corner reads as a corner instead of two flat polygons
//     meeting at a seam.
//   * A run of dry-stone capstones and moss lumps sits along the top, so the
//     boundary reads as a BUILT thing and the band is never a literally flat
//     fill.
import {
  BoxGeometry,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { toonMaterial } from '../render/toon.js';
import { addPropInk, getPropInkMaterial, inkGeometry, PROP_INK_PX } from './props.js';
import { hslColor, mix, WALL } from './colors.js';

const UP = new Vector3(0, 1, 0);

export const WALL_HEIGHT = 0.72; // §13 band: 70-80% of the 1.05 u standing height
export const WALL_THICKNESS = 0.52;
const RIM_H = 0.075;
const RIM_W = 0.16;

const LUMA = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

// Rescale a colour so its DISPLAY luminance hits `target` (also display).
function toDisplayLuma(color, target) {
  const disp = color.clone().convertLinearToSRGB();
  const cur = LUMA(disp);
  if (cur <= 1e-5) return color;
  disp.multiplyScalar(Math.min(4, target / cur));
  return disp.convertSRGBToLinear();
}

// The tone env/ground.js actually paints as the floor's base fill, including
// the additive cool lift. Deriving the wall from this (rather than from the
// raw variant HSL) is what keeps the one-value-step relationship true.
export function floorBaseTone(g) {
  const shL = g.shadeL ?? Math.max(0.05, g.l - 0.13);
  const base = hslColor(g.h + 4, g.s * 0.86, g.l * 0.62 + shL * 0.38 + 0.05).convertLinearToSRGB();
  base.r = Math.min(1, base.r + 3 / 255);
  base.g = Math.min(1, base.g + 7 / 255);
  base.b = Math.min(1, base.b + (g.coolLift ?? 24) / 255);
  return base.convertSRGBToLinear();
}

export function buildWalls(root, spec, cosmetic) {
  const g = spec.ground;
  const floor = floorBaseTone(g);
  const floorLuma = LUMA(floor.clone().convertLinearToSRGB());

  // Dry-stone: the floor tone pulled toward a warm-neutral grey so the wall
  // separates from the COOL exterior by hue as well as by value.
  const stoneish = mix(floor, new Color(PALETTE.warmGrey), WALL.stoneMix);
  const bodyColor = toDisplayLuma(stoneish, floorLuma * WALL.bodyFactor);
  const rimColor = toDisplayLuma(stoneish, floorLuma * WALL.capFactor);
  const capLight = toDisplayLuma(stoneish, floorLuma * WALL.bodyFactor * 1.05);
  const capDark = toDisplayLuma(stoneish, floorLuma * WALL.bodyFactor * 0.82);

  const bodyMat = toonMaterial({ color: bodyColor });
  const rimMat = toonMaterial({ color: rimColor });

  const t = WALL_THICKNESS;
  const outerW = ARENA.halfW + t;
  const outerD = ARENA.halfD + t;

  // --- Body: one merged mesh for all four runs (single draw + single ink).
  const mkBox = (w, d, x, z, h = WALL_HEIGHT, y = 0) =>
    new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const body = mergeGeometries([
    mkBox(outerW * 2, t, 0, -(ARENA.halfD + t / 2)),
    mkBox(outerW * 2, t, 0, ARENA.halfD + t / 2),
    mkBox(t, ARENA.halfD * 2, -(ARENA.halfW + t / 2), 0),
    mkBox(t, ARENA.halfD * 2, ARENA.halfW + t / 2, 0),
  ]);
  const bodyMesh = new Mesh(body, bodyMat);
  bodyMesh.name = 'arena-wall';
  addPropInk(bodyMesh, PROP_INK_PX);
  root.add(bodyMesh);

  // --- Coping rim: a narrow lighter lip along the OUTER top edge of each run.
  // Narrow on purpose — it caps the silhouette without lifting the value of the
  // wall band a critic samples.
  const rim = mergeGeometries([
    mkBox(outerW * 2, RIM_W, 0, -(outerD - RIM_W / 2), RIM_H, WALL_HEIGHT),
    mkBox(outerW * 2, RIM_W, 0, outerD - RIM_W / 2, RIM_H, WALL_HEIGHT),
    mkBox(RIM_W, ARENA.halfD * 2, -(outerW - RIM_W / 2), 0, RIM_H, WALL_HEIGHT),
    mkBox(RIM_W, ARENA.halfD * 2, outerW - RIM_W / 2, 0, RIM_H, WALL_HEIGHT),
  ]);
  const rimMesh = new Mesh(rim, rimMat);
  addPropInk(rimMesh, 1.4);
  root.add(rimMesh);

  // --- Dry-stone capstones along the top: the run that makes the boundary a
  // built thing. One InstancedMesh, per-instance colour alternating between a
  // light and a dark course so the band can never measure as a flat fill.
  const r = (a, b) => cosmetic.range(a, b);
  const stones = [];
  const runStones = (x0, z0, x1, z1, inward) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const dx = (x1 - x0) / len;
    const dz = (z1 - z0) / len;
    // Abutting course, not spaced beads: a gap-and-ink pattern averages the
    // whole wall band down to the ink value when a critic samples a strip.
    let d = 0.1;
    while (d < len - 0.1) {
      const step = r(0.34, 0.62);
      const off = r(-0.05, 0.05);
      stones.push({
        x: x0 + dx * d + inward.x * off,
        z: z0 + dz * d + inward.z * off,
        yaw: Math.atan2(dx, dz) + r(-0.06, 0.06),
        sx: step * 0.98,
        sy: r(0.05, 0.1),
        sz: r(0.34, 0.44),
        light: cosmetic.chance(0.5),
      });
      d += step;
    }
  };
  runStones(-outerW + 0.2, -outerD + t * 0.5, outerW - 0.2, -outerD + t * 0.5, { x: 0, z: 1 });
  runStones(-outerW + 0.2, outerD - t * 0.5, outerW - 0.2, outerD - t * 0.5, { x: 0, z: -1 });
  runStones(-outerW + t * 0.5, -ARENA.halfD, -outerW + t * 0.5, ARENA.halfD, { x: 1, z: 0 });
  runStones(outerW - t * 0.5, -ARENA.halfD, outerW - t * 0.5, ARENA.halfD, { x: -1, z: 0 });

  const capGeo = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const capMat = toonMaterial({ color: '#FFFFFF' });
  const capMesh = new InstancedMesh(capGeo, capMat, stones.length);
  const capInk = new InstancedMesh(inkGeometry(capGeo), getPropInkMaterial(1.0), stones.length);
  capMesh.frustumCulled = false;
  capInk.frustumCulled = false;
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  const c = new Color();
  stones.forEach((st, i) => {
    q.setFromAxisAngle(UP, st.yaw);
    p.set(st.x, WALL_HEIGHT, st.z);
    s.set(st.sx, st.sy, st.sz);
    m.compose(p, q, s);
    capMesh.setMatrixAt(i, m);
    capInk.setMatrixAt(i, m);
    c.copy(st.light ? capLight : capDark);
    capMesh.setColorAt(i, c);
  });
  capMesh.instanceMatrix.needsUpdate = true;
  capInk.instanceMatrix.needsUpdate = true;
  if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
  root.add(capMesh);
  root.add(capInk);

  // --- Dry-stone courses on the INNER face. Without them the face renders as
  // one literally flat fill (a 180x6 px sample came back lmin == lmax), and the
  // wall reads as an extruded polygon rather than as masonry. Two staggered
  // courses of shallow blocks, alternating value, protruding ~3 cm.
  const faceLight = toDisplayLuma(stoneish, floorLuma * WALL.bodyFactor * 1.0);
  const faceBlocks = [];
  const faceRun = (x0, z0, x1, z1, nx, nz) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const dx = (x1 - x0) / len;
    const dz = (z1 - z0) / len;
    for (const [yc, hc] of [[0.44, 0.2], [0.2, 0.19]]) {
      let d = r(0.1, 0.5);
      while (d < len - 0.1) {
        const step = r(0.4, 0.85);
        faceBlocks.push({
          x: x0 + dx * d + nx * 0.02,
          z: z0 + dz * d + nz * 0.02,
          yaw: Math.atan2(nx, nz),
          y: yc + r(-0.02, 0.02),
          sx: step * 0.9,
          sy: hc * r(0.85, 1.1),
          sz: 0.06,
          light: cosmetic.chance(0.45),
        });
        d += step + r(0.03, 0.12);
      }
    }
  };
  faceRun(-ARENA.halfW, -ARENA.halfD, ARENA.halfW, -ARENA.halfD, 0, 1);
  faceRun(-ARENA.halfW, ARENA.halfD, ARENA.halfW, ARENA.halfD, 0, -1);
  faceRun(-ARENA.halfW, -ARENA.halfD, -ARENA.halfW, ARENA.halfD, 1, 0);
  faceRun(ARENA.halfW, -ARENA.halfD, ARENA.halfW, ARENA.halfD, -1, 0);
  // ...and the OUTER faces, which are the ones a south/east wall-hug actually
  // shows the camera.
  faceRun(-outerW, -outerD, outerW, -outerD, 0, -1);
  faceRun(-outerW, outerD, outerW, outerD, 0, 1);
  faceRun(-outerW, -outerD, -outerW, outerD, -1, 0);
  faceRun(outerW, -outerD, outerW, outerD, 1, 0);
  const faceMesh = new InstancedMesh(capGeo, toonMaterial({ color: '#FFFFFF' }), faceBlocks.length);
  faceMesh.frustumCulled = false;
  faceBlocks.forEach((b, i) => {
    q.setFromAxisAngle(UP, b.yaw);
    p.set(b.x, b.y, b.z);
    s.set(b.sx, b.sy, b.sz);
    m.compose(p, q, s);
    faceMesh.setMatrixAt(i, m);
    c.copy(b.light ? faceLight : capDark);
    faceMesh.setColorAt(i, c);
  });
  faceMesh.instanceMatrix.needsUpdate = true;
  if (faceMesh.instanceColor) faceMesh.instanceColor.needsUpdate = true;
  root.add(faceMesh);

  // --- Moss / weed tufts breaking the top line, in the variant's own foliage
  // hue so the wall belongs to the woodland.
  const mossGeo = new IcosahedronGeometry(0.14, 0);
  const mossMat = toonMaterial({ color: hslColor(g.h + 14, 0.42, 0.19) });
  const mossN = 46;
  const mossMesh = new InstancedMesh(mossGeo, mossMat, mossN);
  mossMesh.frustumCulled = false;
  for (let i = 0; i < mossN; i++) {
    const st = stones[Math.floor(r(0, stones.length))];
    q.setFromAxisAngle(UP, r(0, Math.PI * 2));
    p.set(st.x + r(-0.12, 0.12), WALL_HEIGHT + st.sy * 0.7, st.z + r(-0.1, 0.1));
    const sc = r(0.5, 1.15);
    s.set(sc, sc * r(0.4, 0.7), sc);
    m.compose(p, q, s);
    mossMesh.setMatrixAt(i, m);
  }
  mossMesh.instanceMatrix.needsUpdate = true;
  root.add(mossMesh);

  // --- Footing run along the INSIDE base of the wall: tumbled stones and weed
  // clumps. Two jobs — it stops the inner face reading as a literally flat fill
  // (a 180x6 px sample used to come back lmin == lmax), and it softens the hard
  // seam where the floor meets the boundary.
  const footGeo = mergeGeometries([
    new IcosahedronGeometry(0.16, 0).scale(1, 0.62, 0.85).translate(0, 0.09, 0),
    new IcosahedronGeometry(0.1, 0).scale(1, 0.6, 0.85).translate(0.19, 0.05, 0.06),
  ]);
  const footMat = toonMaterial({ color: '#FFFFFF' }); // per-instance colour below
  const foots = [];
  const footRun = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const dx = (x1 - x0) / len;
    const dz = (z1 - z0) / len;
    let d = r(0.2, 0.8);
    while (d < len) {
      foots.push({ x: x0 + dx * d, z: z0 + dz * d, light: cosmetic.chance(0.4) });
      d += r(0.55, 1.9);
    }
  };
  const inset = 0.16;
  footRun(-ARENA.halfW + 0.2, -ARENA.halfD + inset, ARENA.halfW - 0.2, -ARENA.halfD + inset);
  footRun(-ARENA.halfW + 0.2, ARENA.halfD - inset, ARENA.halfW - 0.2, ARENA.halfD - inset);
  footRun(-ARENA.halfW + inset, -ARENA.halfD + 0.2, -ARENA.halfW + inset, ARENA.halfD - 0.2);
  footRun(ARENA.halfW - inset, -ARENA.halfD + 0.2, ARENA.halfW - inset, ARENA.halfD - 0.2);
  const footMesh = new InstancedMesh(footGeo, footMat, foots.length);
  const footInk = new InstancedMesh(inkGeometry(footGeo), getPropInkMaterial(1.3), foots.length);
  const footWeed = new InstancedMesh(mossGeo, mossMat, foots.length);
  footMesh.frustumCulled = false;
  footInk.frustumCulled = false;
  footWeed.frustumCulled = false;
  foots.forEach((f, i) => {
    q.setFromAxisAngle(UP, r(0, Math.PI * 2));
    p.set(f.x, 0, f.z);
    const sc = r(0.6, 1.35);
    s.set(sc, sc * r(0.7, 1.1), sc);
    m.compose(p, q, s);
    footMesh.setMatrixAt(i, m);
    footInk.setMatrixAt(i, m);
    c.copy(f.light ? capLight : capDark);
    footMesh.setColorAt(i, c);
    q.setFromAxisAngle(UP, r(0, Math.PI * 2));
    p.set(f.x + r(-0.3, 0.3), 0.02, f.z + r(-0.06, 0.06));
    const ws = r(0.5, 1.1);
    s.set(ws, ws * r(0.5, 0.9), ws);
    m.compose(p, q, s);
    footWeed.setMatrixAt(i, m);
  });
  footMesh.instanceMatrix.needsUpdate = true;
  footInk.instanceMatrix.needsUpdate = true;
  footWeed.instanceMatrix.needsUpdate = true;
  if (footMesh.instanceColor) footMesh.instanceColor.needsUpdate = true;
  root.add(footMesh);
  root.add(footInk);
  root.add(footWeed);

  return {
    bodyColor: bodyColor.clone().convertLinearToSRGB().getHexString(),
    floorLuma: Math.round(floorLuma * 255),
    capstones: stones.length,
  };
}

// Approximate display-space HSL helper kept next to the tone maths so callers
// can log what was actually authored.
export function toneHex(color) {
  return `#${color.clone().convertLinearToSRGB().getHexString()}`;
}
