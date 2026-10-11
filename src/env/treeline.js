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
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from '../core/constants.js';
import { toonMaterial } from '../render/toon.js';
import { COOL, mix } from './colors.js';
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
  if (style === 'spire') {
    crownGeo.dispose();
    capGeo.dispose();
    trunkGeo.dispose();
    return buildSpireBand(root, TL, cosmetic, trees);
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

// ---------------------------------------------------------------------------
// Act V — The Still Spire (env/biomes/spire.js): there is no forest beyond the
// wall, the room is a platform open to the sky. The band carries, inside out:
//   * a limestone BALUSTRADE ringing the platform just past the parapet wall
//     (vase balusters between pedestal posts, a few runs broken open with the
//     rail fallen), rime on the rail, gargoyles crouched on the corner posts
//   * BROKEN ARCHES standing on the north and side terraces (an arcade whose
//     arches open onto nothing), timber BELL-CAGES with tarnished bells and
//     WIND-TORN BANNERS streaming one way
//   * fallen masonry blocks on the terrace
//   * far below, CLOUD BANKS (dark undersides, lilac-lit crowns) with the
//     other SPIRES of the belfry standing out of them
// The cloud and spire samples are the woodland's tree samples (same cosmetic
// draws), re-dressed; everything else is laid along the four sides.
// ---------------------------------------------------------------------------
function placeXf(root, layers, list) {
  // Like place(), with a per-axis scale (rails are stretched along x only).
  if (list.length === 0) return [];
  const meshes = [];
  for (const layer of layers) {
    const im = new InstancedMesh(layer.geo, layer.mat, list.length);
    im.frustumCulled = false;
    meshes.push(im);
    if (layer.ink) {
      const hull = new InstancedMesh(inkGeometry(layer.geo), getPropInkMaterial(layer.ink === true ? undefined : layer.ink), list.length);
      hull.frustumCulled = false;
      meshes.push(hull);
    }
  }
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  list.forEach((t, i) => {
    q.setFromAxisAngle(UP, t.yaw ?? 0);
    p.set(t.x, t.y ?? 0, t.z);
    s.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1);
    m.compose(p, q, s);
    for (const im of meshes) im.setMatrixAt(i, m);
  });
  for (const im of meshes) {
    im.instanceMatrix.needsUpdate = true;
    root.add(im);
  }
  return meshes;
}

function buildSpireBand(root, TL, cosmetic, samples) {
  const r = (a, b) => cosmetic.range(a, b);
  const mStone = toonMaterial({ color: TL.scrub });
  const mStoneDark = toonMaterial({ color: TL.stoneDark ?? TL.rock });
  const mBlock = toonMaterial({ color: TL.rock });
  const mRime = toonMaterial({ color: TL.rime });
  const mSpire = toonMaterial({ color: TL.trunk });
  const mSpireLit = toonMaterial({ color: TL.crownLit });
  const mCloud = toonMaterial({ color: TL.cloud });
  const mCloudLit = toonMaterial({ color: TL.cloudLit });
  const mBronze = toonMaterial({ color: TL.bronze });
  const mTimber = toonMaterial({ color: TL.timber });
  const mCloth = toonMaterial({ color: mix(TL.cloud, TL.trunk, 0.4) });
  const mSail = toonMaterial({ color: mix(TL.scrub, TL.cloudLit, 0.3) });

  // ---- Balustrade ring. Centre line BAL beyond the playfield edge (the wall
  // is 0.52 thick); posts every ~2 u, balusters between them.
  const BAL = 0.52 + 0.72;
  const W = ARENA.halfW + BAL;
  const D = ARENA.halfD + BAL;
  const sides = [
    { ax: -W, az: -D, bx: W, bz: -D, yaw: 0 }, // north
    { ax: -W, az: D, bx: W, bz: D, yaw: 0 }, // south
    { ax: -W, az: -D, bx: -W, bz: D, yaw: Math.PI / 2 }, // west
    { ax: W, az: -D, bx: W, bz: D, yaw: Math.PI / 2 }, // east
  ];
  const balProfile = [
    [0.001, 0], [0.07, 0], [0.07, 0.06], [0.045, 0.1], [0.075, 0.3], [0.05, 0.56], [0.038, 0.66], [0.07, 0.72], [0.07, 0.78], [0.001, 0.78],
  ].map(([x, y]) => new Vector2(x, y));
  const balGeo = new LatheGeometry(balProfile, 7).translate(0, 0.14, 0);
  const postGeo = mergeGeometries([
    new BoxGeometry(0.42, 0.14, 0.42).translate(0, 0.07, 0),
    new BoxGeometry(0.32, 1.0, 0.32).translate(0, 0.62, 0),
    new BoxGeometry(0.44, 0.1, 0.44).translate(0, 1.17, 0),
  ]);
  const postCap = new IcosahedronGeometry(0.15, 0).scale(1, 0.62, 1).translate(0, 1.28, 0);
  const railGeo = new BoxGeometry(1, 0.1, 0.3).translate(0, 0.97, 0);
  const plinthGeo = new BoxGeometry(1, 0.14, 0.34).translate(0, 0.07, 0);
  const rimeGeo = new BoxGeometry(1, 0.025, 0.2).translate(0, 1.033, 0);
  const balusters = [];
  const posts = [];
  const rails = [];
  const plinths = [];
  const rimes = [];
  const fallen = [];
  const cornerPosts = [];
  for (const sd of sides) {
    const len = Math.hypot(sd.bx - sd.ax, sd.bz - sd.az);
    const dx = (sd.bx - sd.ax) / len;
    const dz = (sd.bz - sd.az) / len;
    const nSeg = Math.max(1, Math.round(len / 2.1));
    const seg = len / nSeg;
    for (let k = 0; k <= nSeg; k++) {
      const x = sd.ax + dx * seg * k;
      const z = sd.az + dz * seg * k;
      posts.push({ x, z, yaw: sd.yaw, s: 1 });
      if (k === 0 || k === nSeg) cornerPosts.push({ x, z });
      if (k === nSeg) break;
      const broken = cosmetic.chance(0.13);
      const mx = x + dx * seg * 0.5;
      const mz = z + dz * seg * 0.5;
      const inner = seg - 0.36;
      plinths.push({ x: mx, z: mz, yaw: sd.yaw, sx: seg - 0.2, sy: 1, sz: 1 });
      if (!broken) {
        rails.push({ x: mx, z: mz, yaw: sd.yaw, sx: inner, sy: 1, sz: 1 });
        rimes.push({ x: mx + r(-0.05, 0.05), z: mz, yaw: sd.yaw, sx: inner * r(0.5, 0.9), sy: 1, sz: 1 });
      } else {
        // The rail lies fallen on the terrace, outside the run.
        fallen.push({ x: mx - dz * 0.55, z: mz + dx * 0.55, y: -0.86, yaw: sd.yaw + r(-0.3, 0.3), sx: inner * 0.7, sy: 1, sz: 1 });
      }
      const nb = Math.max(2, Math.floor(inner / 0.25));
      for (let b = 0; b < nb; b++) {
        if (broken && b > nb * 0.25 && b < nb * 0.8) continue;
        const t = (b + 0.5) / nb - 0.5;
        balusters.push({ x: mx + dx * t * inner, z: mz + dz * t * inner, yaw: 0, s: 1, sy: r(0.98, 1.02) });
      }
    }
  }
  placeXf(root, [{ geo: balGeo, mat: mStone, ink: 1.4 }], balusters);
  placeXf(root, [
    { geo: postGeo, mat: mStone, ink: true },
    { geo: postCap, mat: mRime },
  ], posts);
  placeXf(root, [{ geo: railGeo, mat: mStone, ink: 1.6 }], rails.concat(fallen));
  placeXf(root, [{ geo: plinthGeo, mat: mStoneDark, ink: 1.4 }], plinths);
  placeXf(root, [{ geo: rimeGeo, mat: mRime }], rimes);

  // ---- Gargoyles crouched on the corner posts (and a few on north posts),
  // facing out over the drop.
  const garg = spireGargoyleGeo();
  const gargs = cornerPosts.map((c) => ({ x: c.x, z: c.z, y: 1.22, yaw: Math.atan2(c.x, c.z), s: 1.15 }));
  const north = posts.filter((p) => p.z < -ARENA.halfD - 0.5 && Math.abs(p.x) < W - 1);
  for (let i = 1; i < north.length; i += 3) gargs.push({ x: north[i].x, z: north[i].z, y: 1.22, yaw: Math.PI + r(-0.4, 0.4), s: 1.0 });
  placeXf(root, [
    { geo: garg.body, mat: mStone, ink: true },
    { geo: garg.wing, mat: mStoneDark, ink: 1.4 },
    { geo: garg.rime, mat: mRime },
  ], gargs);

  // ---- Broken arches on the north and side terraces (none south: they
  // would stand between the camera and the play).
  const archFull = mergeGeometries([
    new BoxGeometry(0.42, 1.9, 0.5).translate(-1.0, 0.95, 0),
    new BoxGeometry(0.42, 1.9, 0.5).translate(1.0, 0.95, 0),
    new TorusGeometry(1.0, 0.21, 5, 12, Math.PI).scale(1, 1, 1.15).translate(0, 1.9, 0),
    new BoxGeometry(0.26, 0.32, 0.52).translate(0, 3.0, 0),
    new BoxGeometry(0.56, 0.16, 0.6).translate(-1.0, 0.08, 0),
    new BoxGeometry(0.56, 0.16, 0.6).translate(1.0, 0.08, 0),
  ]);
  const archBroken = mergeGeometries([
    new BoxGeometry(0.42, 1.9, 0.5).translate(-1.0, 0.95, 0),
    new BoxGeometry(0.42, 1.05, 0.5).rotateZ(0.06).translate(1.0, 0.52, 0),
    new TorusGeometry(1.0, 0.21, 5, 7, Math.PI * 0.55).rotateZ(Math.PI * 0.45).scale(1, 1, 1.15).translate(0, 1.9, 0),
    new BoxGeometry(0.56, 0.16, 0.6).translate(-1.0, 0.08, 0),
    new BoxGeometry(0.56, 0.16, 0.6).translate(1.0, 0.08, 0),
    new BoxGeometry(0.4, 0.3, 0.44).rotateY(0.5).rotateZ(0.3).translate(1.55, 0.14, 0.35),
  ]);
  const archRime = mergeGeometries([
    new BoxGeometry(0.44, 0.04, 0.4).translate(-1.0, 1.92, 0),
    new BoxGeometry(0.3, 0.04, 0.4).translate(0, 3.17, 0),
  ]);
  const arches = [];
  const archesB = [];
  const OFF = 3.0;
  for (let x = -ARENA.halfW + 1.5; x <= ARENA.halfW - 1.0; x += r(4.6, 6.2)) {
    const t = { x: x + r(-0.4, 0.4), z: -ARENA.halfD - OFF - r(0, 0.6), yaw: r(-0.08, 0.08), s: r(0.9, 1.08) };
    (cosmetic.chance(0.45) ? archesB : arches).push(t);
  }
  for (const sx of [-1, 1]) {
    for (let z = -ARENA.halfD + 1.0; z <= ARENA.halfD - 3.0; z += r(5.0, 6.6)) {
      const t = { x: sx * (ARENA.halfW + OFF + r(0, 0.6)), z: z + r(-0.4, 0.4), yaw: Math.PI / 2 + r(-0.08, 0.08), s: r(0.88, 1.0) };
      (cosmetic.chance(0.5) ? archesB : arches).push(t);
    }
  }
  placeXf(root, [
    { geo: archFull, mat: mStone, ink: true },
    { geo: archRime, mat: mRime },
  ], arches);
  placeXf(root, [{ geo: archBroken, mat: mStone, ink: true }], archesB);

  // ---- Timber bell-cages with tarnished bells, and wind-torn banners, on
  // the north and side terraces between the arches.
  const cage = spireBellCageGeo();
  const cages = [];
  for (const [x, z, yaw] of [
    [-ARENA.halfW + 4.2, -ARENA.halfD - 2.1, 0],
    [ARENA.halfW - 3.6, -ARENA.halfD - 2.2, 0],
    [-ARENA.halfW - 2.1, 3.8, Math.PI / 2],
    [ARENA.halfW + 2.1, -3.4, Math.PI / 2],
  ]) cages.push({ x: x + r(-0.6, 0.6), z: z + r(-0.3, 0.3), yaw: yaw + r(-0.2, 0.2), s: r(1.0, 1.15) });
  placeXf(root, [
    { geo: cage.frame, mat: mTimber, ink: true },
    { geo: cage.bell, mat: mBronze, ink: true },
    { geo: cage.roof, mat: mStoneDark, ink: 1.4 },
  ], cages);
  const flag = spireBannerGeo();
  const flags = [];
  for (const [x, z] of [
    [-ARENA.halfW + 1.0, -ARENA.halfD - 1.9],
    [1.8, -ARENA.halfD - 2.0],
    [ARENA.halfW - 0.6, -ARENA.halfD - 1.9],
    [-ARENA.halfW - 1.9, -2.2],
    [ARENA.halfW + 1.9, 2.4],
    [-ARENA.halfW - 1.9, ARENA.halfD - 0.6],
  ]) flags.push({ x: x + r(-0.4, 0.4), z: z + r(-0.3, 0.3), yaw: r(-0.25, 0.25), s: r(1.0, 1.25) });
  placeXf(root, [
    { geo: flag.pole, mat: mTimber, ink: true },
    { geo: flag.cloth, mat: mCloth, ink: 1.4 },
    { geo: flag.trim, mat: mSail },
  ], flags);

  // ---- Fallen masonry on the terraces.
  const blockGeo = mergeGeometries([
    new BoxGeometry(0.62, 0.36, 0.44).rotateY(0.3).rotateZ(0.12).translate(0, 0.14, 0),
    new BoxGeometry(0.34, 0.24, 0.3).rotateY(-0.5).rotateX(0.4).translate(0.42, 0.08, 0.2),
  ]);
  const blockRime = new BoxGeometry(0.5, 0.03, 0.3).rotateY(0.3).rotateZ(0.12).translate(0, 0.33, 0);
  const blocks = [];
  for (let i = 0; i < 70; i++) {
    const spot = sampleBand(cosmetic, 6);
    if (!outside(spot.x, spot.z, 0.75)) continue;
    const dist = Math.max(Math.abs(spot.x) - ARENA.halfW, Math.abs(spot.z) - ARENA.halfD);
    if (dist > 4.5) continue;
    if (Math.abs(dist - BAL) < 0.4) continue; // not inside the balustrade run
    blocks.push({ x: spot.x, z: spot.z, yaw: r(0, Math.PI * 2), s: r(0.6, 1.3), sy: r(0.6, 1.1) });
  }
  placeXf(root, [
    { geo: blockGeo, mat: mBlock, ink: 1.4 },
    { geo: blockRime, mat: mRime },
  ], blocks);

  // ---- Far below: cloud banks, and the belfry's other spires standing out
  // of them. The cloud sits under the platform's floor level (it draws over
  // the painted apron, which writes no depth), so it parallaxes as the
  // camera moves: the drop reads as a drop.
  const cloudGeo = mergeGeometries([
    new IcosahedronGeometry(0.5, 1).scale(1.4, 0.42, 1).translate(0, 0, 0),
    new IcosahedronGeometry(0.36, 1).scale(1.3, 0.5, 1).translate(0.55, 0.06, 0.2),
    new IcosahedronGeometry(0.32, 1).scale(1.3, 0.5, 1).translate(-0.6, 0.04, -0.15),
  ]);
  const cloudTop = mergeGeometries([
    new IcosahedronGeometry(0.34, 1).scale(1.3, 0.4, 1).translate(-0.12, 0.16, -0.06),
    new IcosahedronGeometry(0.24, 1).scale(1.2, 0.45, 1).translate(0.5, 0.18, 0.08),
  ]);
  const spireGeo = mergeGeometries([
    new BoxGeometry(0.5, 3.0, 0.5).translate(0, 1.5, 0),
    new BoxGeometry(0.62, 0.12, 0.62).translate(0, 3.0, 0),
    new BoxGeometry(0.44, 0.7, 0.44).translate(0, 3.41, 0),
    new BoxGeometry(0.58, 0.1, 0.58).translate(0, 3.8, 0),
  ]);
  const spireRoof = mergeGeometries([
    new ConeGeometry(0.4, 1.3, 4).rotateY(Math.PI / 4).translate(0, 4.5, 0),
    new BoxGeometry(0.46, 0.06, 0.46).translate(0, 1.6, 0),
  ]);
  const spireDark = mergeGeometries([
    // The belfry's open arches: dark slots on each face.
    new BoxGeometry(0.2, 0.42, 0.46).translate(0, 3.42, 0),
    new BoxGeometry(0.46, 0.42, 0.2).translate(0, 3.42, 0),
  ]);
  const clouds = [];
  const spires = [];
  for (const t of samples) {
    const dist = Math.max(Math.abs(t.x) - ARENA.halfW, Math.abs(t.z) - ARENA.halfD);
    if (dist < 1.9) continue;
    if (dist > 3.6 && cosmetic.chance(0.05)) {
      const h = Math.min(treeCeiling(dist) + 2.6, r(4.6, 7.4));
      spires.push({ x: t.x, z: t.z, y: -2.6, yaw: r(-0.2, 0.2), s: h / 5.2 });
      continue;
    }
    if (clouds.length >= 280 || !cosmetic.chance(0.5)) continue;
    const sc = r(1.4, 3.2) * (0.7 + Math.min(1, dist / 8) * 0.5);
    clouds.push({ x: t.x, z: t.z, y: r(-2.2, -0.5), yaw: r(-0.4, 0.4), sx: sc * r(1.0, 1.5), sy: sc * r(0.7, 1.0), sz: sc });
  }
  placeXf(root, [
    { geo: cloudGeo, mat: mCloud },
    { geo: cloudTop, mat: mCloudLit },
  ], clouds);
  placeXf(root, [
    { geo: spireGeo, mat: mSpire, ink: true },
    { geo: spireRoof, mat: mSpireLit, ink: 1.4 },
    { geo: spireDark, mat: toonMaterial({ color: mix(TL.trunk, COOL.trunk, 0.6).multiplyScalar(0.4) }) },
  ], spires);

  return { treeCount: spires.length + clouds.length, scrubCount: balusters.length, rockCount: blocks.length, arches: arches.length + archesB.length, gargoyles: gargs.length };
}

// A gargoyle crouched on a post top, facing +z: hunched body, horned head
// thrust forward, folded wings, a rime cap on the head and wing tips.
function spireGargoyleGeo() {
  const mergeMixed = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
  const body = mergeMixed([
    new IcosahedronGeometry(0.16, 1).scale(1, 1.15, 0.9).rotateX(0.4).translate(0, 0.2, -0.02),
    new IcosahedronGeometry(0.08, 0).translate(0.11, 0.08, 0.02),
    new IcosahedronGeometry(0.08, 0).translate(-0.11, 0.08, 0.02),
    new IcosahedronGeometry(0.1, 1).scale(1, 0.9, 1.15).translate(0, 0.33, 0.15),
    new BoxGeometry(0.08, 0.06, 0.1).translate(0, 0.3, 0.26),
    new ConeGeometry(0.025, 0.14, 4).rotateX(-0.6).rotateZ(0.4).translate(0.06, 0.43, 0.1),
    new ConeGeometry(0.025, 0.14, 4).rotateX(-0.6).rotateZ(-0.4).translate(-0.06, 0.43, 0.1),
    new BoxGeometry(0.05, 0.17, 0.05).translate(0.07, 0.06, 0.15),
    new BoxGeometry(0.05, 0.17, 0.05).translate(-0.07, 0.06, 0.15),
  ]);
  const wing = mergeGeometries([
    new BoxGeometry(0.04, 0.38, 0.24).rotateZ(-0.45).rotateX(-0.25).translate(0.16, 0.3, -0.1),
    new BoxGeometry(0.04, 0.38, 0.24).rotateZ(0.45).rotateX(-0.25).translate(-0.16, 0.3, -0.1),
    new ConeGeometry(0.05, 0.16, 4).rotateZ(-0.5).translate(0.27, 0.5, -0.14),
    new ConeGeometry(0.05, 0.16, 4).rotateZ(0.5).translate(-0.27, 0.5, -0.14),
  ]);
  const rime = mergeGeometries([
    new IcosahedronGeometry(0.06, 0).scale(1.2, 0.35, 1.2).translate(0, 0.42, 0.12),
    new IcosahedronGeometry(0.06, 0).scale(1, 0.35, 1.4).translate(0.24, 0.5, -0.1),
    new IcosahedronGeometry(0.06, 0).scale(1, 0.35, 1.4).translate(-0.24, 0.5, -0.1),
  ]);
  return { body, wing, rime };
}

// A tall timber bell-cage (outside the playfield it may stand 1.9 u): four
// posts, braces, a headstock, a slate cap roof and a bronze bell.
function spireBellCageGeo() {
  const frame = mergeGeometries([
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new BoxGeometry(0.09, 1.6, 0.09).translate(sx * 0.42, 0.8, sz * 0.3))),
    new BoxGeometry(1.0, 0.1, 0.1).translate(0, 1.55, 0.3),
    new BoxGeometry(1.0, 0.1, 0.1).translate(0, 1.55, -0.3),
    new BoxGeometry(0.12, 0.12, 0.74).translate(0, 1.5, 0),
    new BoxGeometry(0.06, 0.6, 0.06).rotateZ(0.7).translate(0.25, 1.25, 0.3),
    new BoxGeometry(0.06, 0.6, 0.06).rotateZ(-0.7).translate(-0.25, 1.25, 0.3),
    new BoxGeometry(1.0, 0.08, 0.7).translate(0, 0.04, 0),
  ]);
  const prof = [
    [0.001, 0], [0.3, 0], [0.27, 0.06], [0.21, 0.24], [0.19, 0.44], [0.13, 0.54], [0.001, 0.57],
  ].map(([x, y]) => new Vector2(x, y));
  const bell = mergeGeometries([new LatheGeometry(prof, 12).translate(0, 0.86, 0), new BoxGeometry(0.1, 0.1, 0.1).translate(0, 1.46, 0)]);
  const roof = mergeGeometries([new ConeGeometry(0.78, 0.42, 4).rotateY(Math.PI / 4).scale(1, 1, 0.75).translate(0, 1.82, 0)]);
  return { frame, bell, roof };
}

// A tall pole with a cloth torn to streamers, all blown the same way (+x).
function spireBannerGeo() {
  const pole = mergeGeometries([
    new CylinderGeometry(0.035, 0.05, 2.2, 6).translate(0, 1.1, 0),
    new BoxGeometry(0.28, 0.12, 0.28).translate(0, 0.06, 0),
    new BoxGeometry(0.06, 0.06, 0.6).translate(0, 2.0, 0),
  ]);
  const strips = [];
  const trims = [];
  [[0.9, 2.02, 0.0, 0.08], [0.7, 1.86, 0.12, -0.1], [0.55, 1.7, -0.08, 0.15], [0.38, 1.56, 0.05, -0.05]].forEach(([len, y, z, tilt]) => {
    strips.push(new BoxGeometry(len, 0.16, 0.02).rotateY(0.25).rotateZ(-0.14 + tilt).translate(len / 2 + 0.04, y - len * 0.08, z));
    trims.push(new BoxGeometry(0.1, 0.17, 0.025).rotateY(0.25).translate(len + 0.02, y - len * 0.14, z + 0.01));
  });
  return { pole, cloth: mergeGeometries(strips), trim: mergeGeometries(trims) };
}
