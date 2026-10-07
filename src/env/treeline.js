// Exterior dressing: the 3D treeline that stands on the cool apron beyond the
// arena walls.
//
// WHY THIS EXISTS: the arena is only 24x16 u and the camera follows the player,
// so any wall-hug puts a third of the frame outside the playfield. Left bare
// that region is a dead flat void (reference-bar check 1 fails on ordinary
// combat frames, not just wall shots). The references never do that — Magicraft
// dresses its dark water, Pass the Fear dresses its violet void — so the strip
// beyond every wall gets: undergrowth lumps at the wall foot, a dense ring of
// canopy masses with real silhouette and scale variety, trunks, and scattered
// boulders, all in the COOL indigo-teal family so the exterior separates from
// both the warm-neutral wall stone and the green floor.
//
// SHAPE NOTE: a canopy is FIVE small lumps, not one big one. A single
// detail-0 icosahedron at tree scale renders, from a 3/4 top-down camera, as a
// flat hexagonal plate — an earlier cut paved the whole surround with them and
// it read as floating tiles on water. Small overlapping lobes at mixed heights
// give a lumpy crown that still costs 100 triangles.
//
// Everything is instanced (7 draw calls for the whole surround) and everything
// is placed from the COSMETIC stream (§1: foliage placement is cosmetic).
import {
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../core/constants.js';
import { toonMaterial } from '../render/toon.js';
import { COOL } from './colors.js';
import { inkGeometry, getPropInkMaterial } from './props.js';

const UP = new Vector3(0, 1, 0);

// Band of dressed exterior, in world units beyond the wall face. 11 u covers
// everything the follow camera can see past a wall at any player position
// (worst case is the north wall, where the frame looks ~9 u past the boundary).
const BAND_NEAR = 0.5;
const BAND_FAR = 11;
// How tall a tree may be at a given distance beyond the wall. Derived from the
// 52 deg / 12 u camera rig in core/constants.js: with the player flush against
// the south wall, the sight line from the camera to the top of their head
// passes y = 1.05 + 1.14*d at distance d in front of them, so anything under
// 0.9 + 1.05*offset can never occlude the player. Letting the far band grow to
// 4-5 u is what gives the surround a real vertical TREELINE silhouette instead
// of a carpet of flat crowns seen from above.
const treeCeiling = (offset) => 0.9 + 1.05 * offset;

const TREE_COUNT = 780;
const SCRUB_COUNT = 760;
const ROCK_COUNT = 90;

// Sample a point in the exterior band around the arena rect.
function sampleBand(cosmetic, far = BAND_FAR) {
  const side = Math.floor(cosmetic.range(0, 4));
  const d = BAND_NEAR + Math.pow(cosmetic.range(0, 1), 0.8) * (far - BAND_NEAR);
  if (side === 0) return { x: cosmetic.range(-ARENA.halfW - far, ARENA.halfW + far), z: -ARENA.halfD - d };
  if (side === 1) return { x: cosmetic.range(-ARENA.halfW - far, ARENA.halfW + far), z: ARENA.halfD + d };
  if (side === 2) return { x: -ARENA.halfW - d, z: cosmetic.range(-ARENA.halfD - far, ARENA.halfD + far) };
  return { x: ARENA.halfW + d, z: cosmetic.range(-ARENA.halfD - far, ARENA.halfD + far) };
}

const outside = (x, z, pad) =>
  Math.abs(x) > ARENA.halfW + pad || Math.abs(z) > ARENA.halfD + pad;

function place(root, layers, transforms) {
  const meshes = [];
  for (const layer of layers) {
    const im = new InstancedMesh(layer.geo, layer.mat, transforms.length);
    im.frustumCulled = false;
    meshes.push(im);
    if (layer.ink) {
      const hull = new InstancedMesh(inkGeometry(layer.geo, layer.ink), getPropInkMaterial(), transforms.length);
      hull.frustumCulled = false;
      meshes.push(hull);
    }
  }
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  transforms.forEach((t, i) => {
    q.setFromAxisAngle(UP, t.yaw);
    p.set(t.x, t.y ?? 0, t.z);
    s.set(t.s, t.sy ?? t.s, t.s);
    m.compose(p, q, s);
    for (const im of meshes) im.setMatrixAt(i, m);
  });
  for (const im of meshes) {
    im.instanceMatrix.needsUpdate = true;
    root.add(im);
  }
  return meshes;
}

export function buildTreeline(root, spec, cosmetic) {
  const r = (a, b) => cosmetic.range(a, b);
  // GAUNTLET biome surround (M4b): `spec.treeline = { style, crown, crownLit,
  // trunk, scrub, rock }`. Act I passes nothing and keeps the certified
  // woodland band exactly; 'mill' = dark willows over reed beds, 'barrow' =
  // bare dead trees over burial mounds.
  const TL = spec.treeline ?? {};
  const style = TL.style ?? 'wood';

  // --- Canopy masses. Base unit is 1 u tall so the per-instance scale reads
  // directly as a height.
  const crownGeo = mergeGeometries([
    new IcosahedronGeometry(0.33, 0).translate(0, 0.7, 0),
    new IcosahedronGeometry(0.27, 0).translate(0.26, 0.56, 0.08),
    new IcosahedronGeometry(0.24, 0).translate(-0.23, 0.52, -0.13),
    new IcosahedronGeometry(0.22, 0).translate(0.05, 0.44, 0.25),
    new IcosahedronGeometry(0.19, 0).translate(-0.13, 0.4, 0.2),
  ]);
  const capGeo = mergeGeometries([
    new IcosahedronGeometry(0.19, 0).translate(-0.05, 0.87, -0.04),
    new IcosahedronGeometry(0.13, 0).translate(0.17, 0.72, 0.12),
  ]);
  const trunkGeo = new CylinderGeometry(0.05, 0.085, 0.5, 5).translate(0, 0.25, 0);
  if (style === 'barrow') {
    // Bare dead trees: the crown and cap layers become forked branches.
    crownGeo.dispose();
    capGeo.dispose();
  }
  const deadCrown =
    style === 'barrow'
      ? mergeGeometries([
          new CylinderGeometry(0.02, 0.04, 0.42, 4).rotateZ(0.7).translate(0.13, 0.62, 0),
          new CylinderGeometry(0.02, 0.035, 0.38, 4).rotateZ(-0.8).translate(-0.12, 0.66, 0.02),
          new CylinderGeometry(0.015, 0.03, 0.3, 4).rotateX(0.7).translate(0, 0.74, 0.1),
          new CylinderGeometry(0.018, 0.028, 0.26, 4).rotateX(-0.9).translate(0.02, 0.56, -0.1),
        ])
      : null;
  const deadTwigs =
    style === 'barrow'
      ? mergeGeometries([
          new CylinderGeometry(0.01, 0.018, 0.2, 3).rotateZ(1.2).translate(0.27, 0.8, 0),
          new CylinderGeometry(0.01, 0.018, 0.18, 3).rotateZ(-1.1).translate(-0.26, 0.84, 0.02),
        ])
      : null;

  const mCrown = toonMaterial({ color: TL.crown ?? COOL.canopy });
  const mCap = toonMaterial({ color: TL.crownLit ?? COOL.canopyLit });
  const mTrunk = toonMaterial({ color: TL.trunk ?? COOL.trunk });

  const trees = [];
  for (let i = 0; i < TREE_COUNT; i++) {
    const spot = sampleBand(cosmetic);
    if (!outside(spot.x, spot.z, BAND_NEAR - 0.05)) continue;
    // Distance from the wall drives scale: low scrubby crowns hug the boundary,
    // the tall mass sits further out where it can never occlude the playfield.
    const dist = Math.max(Math.abs(spot.x) - ARENA.halfW, Math.abs(spot.z) - ARENA.halfD);
    const t = Math.min(1, dist / BAND_FAR);
    const height = Math.min(treeCeiling(dist), r(0.5, 0.9) + t * r(2.2, 4.4));
    trees.push({
      x: spot.x,
      z: spot.z,
      yaw: r(0, Math.PI * 2),
      s: Math.min(1.5, height * r(0.5, 0.72) + 0.25),
      sy: height,
    });
  }
  if (style === 'heart') {
    // The Hollow Heart: the band beyond the wall is the hollow's own rock —
    // black-violet columns with lit ledges, and among them (about one in
    // four) violet crystal stands that catch the cold light.
    crownGeo.dispose();
    capGeo.dispose();
    const column = mergeGeometries([
      new CylinderGeometry(0.05, 0.17, 1.0, 5).translate(0, 0.5, 0),
      new CylinderGeometry(0.03, 0.1, 0.62, 5).rotateZ(0.12).translate(0.15, 0.31, 0.06),
    ]);
    const ledge = mergeGeometries([
      new IcosahedronGeometry(0.15, 0).scale(1.2, 0.36, 1).translate(0.02, 0.42, 0.02),
      new IcosahedronGeometry(0.11, 0).scale(1.1, 0.4, 1).translate(-0.06, 0.7, -0.03),
    ]);
    const prism = (r, h, tz, tx, x, z) =>
      mergeGeometries([
        new CylinderGeometry(r, r * 1.12, h, 6).translate(0, h / 2, 0),
        new ConeGeometry(r, r * 2.4, 6).translate(0, h + r * 1.2, 0),
      ])
        .rotateZ(tz)
        .rotateX(tx)
        .translate(x, 0, z);
    const crystalGeo = mergeGeometries([
      prism(0.11, 0.62, 0.0, 0.05, 0, 0),
      prism(0.08, 0.42, 0.45, 0.1, 0.12, 0.04),
      prism(0.07, 0.36, -0.5, -0.2, -0.11, 0.05),
      prism(0.06, 0.26, 0.2, -0.6, 0.02, -0.12),
    ]);
    const mCrystal = toonMaterial({ color: TL.crystal, emissive: TL.crystal, emissiveIntensity: 0.32 });
    const mCrystalLit = toonMaterial({ color: TL.crystalLit, emissive: TL.crystal, emissiveIntensity: 0.22 });
    const cols = [];
    const crys = [];
    for (const t of trees) {
      if (cosmetic.chance(0.26)) crys.push({ ...t, s: t.s * 0.95, sy: Math.min(t.sy, 2.6) * 0.85 });
      else cols.push(t);
    }
    place(
      root,
      [
        { geo: column, mat: mTrunk, ink: true },
        { geo: ledge, mat: mCap },
      ],
      cols
    );
    // Crystal stands keep their proportion (a prism stretched 4x reads as a
    // needle): scale them uniformly from their height.
    place(
      root,
      [{ geo: crystalGeo, mat: mCrystal, ink: true }],
      crys.map((t) => ({ ...t, s: Math.min(1.9, t.sy * 0.75), sy: Math.min(1.9, t.sy * 0.75) }))
    );
    void mCrystalLit;
  } else place(
    root,
    style === 'barrow'
      ? [
          { geo: trunkGeo, mat: mTrunk },
          { geo: deadCrown, mat: mTrunk },
          { geo: deadTwigs, mat: mCap },
        ]
      : [
          { geo: trunkGeo, mat: mTrunk },
          { geo: crownGeo, mat: mCrown },
          { geo: capGeo, mat: mCap },
        ],
    trees
  );

  // --- Undergrowth scrub right at the wall foot: kills the hard seam where
  // the wall stops and the exterior starts.
  const scrubGeo =
    style === 'mill'
      ? mergeGeometries(
          // Reed beds: clumps of thin upright blades.
          [0, 1, 2, 3, 4, 5, 6].map((k) =>
            new CylinderGeometry(0.008, 0.026, 0.62 + (k % 3) * 0.16, 3)
              .rotateZ(((k % 5) - 2) * 0.12)
              .translate(Math.cos(k * 2.4) * 0.16, 0.32, Math.sin(k * 2.4) * 0.16)
          )
        )
      : style === 'heart'
        ? mergeGeometries([
            // Root-flesh humps: low swollen lobes with a root rope over them.
            new IcosahedronGeometry(0.42, 1).scale(1.3, 0.42, 0.95).translate(0, 0.1, 0),
            new IcosahedronGeometry(0.24, 0).scale(1, 0.6, 1).translate(0.46, 0.1, 0.18),
            new IcosahedronGeometry(0.16, 0).scale(1, 0.7, 1).translate(-0.42, 0.08, -0.16),
          ])
      : style === 'barrow'
        ? mergeGeometries([
            // Burial mounds: long low grassed humps.
            new IcosahedronGeometry(0.5, 1).scale(1.4, 0.34, 0.9).translate(0, 0.08, 0),
            new IcosahedronGeometry(0.22, 0).scale(1, 0.5, 1).translate(0.5, 0.12, 0.2),
          ])
        : mergeGeometries([
            new IcosahedronGeometry(0.3, 0).translate(0, 0.14, 0),
            new IcosahedronGeometry(0.22, 0).translate(0.26, 0.1, 0.12),
            new IcosahedronGeometry(0.18, 0).translate(-0.23, 0.09, -0.1),
            new IcosahedronGeometry(0.15, 0).translate(0.06, 0.08, -0.24),
          ]);
  const mScrub = toonMaterial({ color: TL.scrub ?? COOL.canopyLit });
  const scrub = [];
  for (let i = 0; i < SCRUB_COUNT; i++) {
    const side = Math.floor(r(0, 4));
    const d = 0.35 + Math.pow(r(0, 1), 1.35) * 4.4;
    let x;
    let z;
    if (side === 0) { x = r(-ARENA.halfW - 2.5, ARENA.halfW + 2.5); z = -ARENA.halfD - d; }
    else if (side === 1) { x = r(-ARENA.halfW - 2.5, ARENA.halfW + 2.5); z = ARENA.halfD + d; }
    else if (side === 2) { x = -ARENA.halfW - d; z = r(-ARENA.halfD - 2.5, ARENA.halfD + 2.5); }
    else { x = ARENA.halfW + d; z = r(-ARENA.halfD - 2.5, ARENA.halfD + 2.5); }
    if (!outside(x, z, 0.36)) continue;
    scrub.push({ x, z, yaw: r(0, Math.PI * 2), s: r(0.9, 2.0), sy: r(0.55, 1.25) });
  }
  place(root, [{ geo: scrubGeo, mat: mScrub, ink: 0.022 }], scrub);

  // --- Boulder masses: large dark shapes so the surround carries macro
  // contrast rather than one even carpet of crowns.
  const rockGeo = mergeGeometries([
    new IcosahedronGeometry(0.42, 0).scale(1, 0.62, 0.9).translate(0, 0.24, 0),
    new IcosahedronGeometry(0.2, 0).scale(1, 0.6, 0.9).translate(0.42, 0.11, -0.16),
  ]);
  const mRock = toonMaterial({ color: TL.rock ?? COOL.trunk });
  const rocks = [];
  for (let i = 0; i < ROCK_COUNT; i++) {
    const spot = sampleBand(cosmetic, 7);
    if (!outside(spot.x, spot.z, 0.5)) continue;
    rocks.push({ x: spot.x, z: spot.z, yaw: r(0, Math.PI * 2), s: r(0.6, 1.6), sy: r(0.5, 1.0) });
  }
  place(root, [{ geo: rockGeo, mat: mRock }], rocks);

  return { treeCount: trees.length, scrubCount: scrub.length, rockCount: rocks.length };
}
