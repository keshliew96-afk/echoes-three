// Edge props (§19.3: 6-10 distinct silhouettes ringing the arena, none taller
// than the Tank, center readable). Every prop type is built from primitive
// layers that share ONE per-instance transform, rendered as InstancedMesh per
// layer (one draw call per layer regardless of count) with an instanced
// inverted-hull ink outline (§19.2) and a blob contact shadow (reference bar
// check 8) via the shared shadow instancer.
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { OUTLINE } from '../core/constants.js';
import { toonMaterial, getOutlineMaterial, addOutline } from '../render/toon.js';
import { getRadialTexture } from '../render/glow.js';
import { PALETTE } from '../data/palette.js';
import { ENV, hslColor } from './colors.js';

// Ground-plane render order band. The additive warm light pools draw FIRST, the
// contact shadows draw on top of them: a black alpha-blended blob under an
// additive pool gets its darkening added straight back, which is why the first
// cut measured no shadow under anything. Everything the graybox scene owns
// (identity rings, kill decals, its own blobs) sits at the default 0 and so
// still composites above both.
export const ORDER = Object.freeze({ pool: -12, shadow: -8 });

const UP = new Vector3(0, 1, 0);

// Same smoothed-normal displacement as render/toon.js addOutline, but
// returning a geometry so it can back an InstancedMesh hull (children of an
// InstancedMesh don't inherit instancing, so the per-mesh helper can't serve
// instanced props).
export function inkGeometry(source, thickness = OUTLINE.thickness) {
  let geo = source.clone();
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position') geo.deleteAttribute(name);
  }
  geo = mergeVertices(geo);
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + nor.getX(i) * thickness,
      pos.getY(i) + nor.getY(i) * thickness,
      pos.getZ(i) + nor.getZ(i) * thickness
    );
  }
  pos.needsUpdate = true;
  return geo;
}

// layers: [{ geo, mat, ink: false | true | thickness }] — geo pre-translated
// so y=0 is the ground plane. transforms: [{ x, z, yaw, s, sy }].
function addInstancedProp(root, layers, transforms) {
  const meshes = [];
  for (const layer of layers) {
    const im = new InstancedMesh(layer.geo, layer.mat, transforms.length);
    im.frustumCulled = false; // instances span the arena; geometry bounds don't
    meshes.push(im);
    if (layer.ink) {
      const t = layer.ink === true ? OUTLINE.thickness : layer.ink;
      const hull = new InstancedMesh(inkGeometry(layer.geo, t), getOutlineMaterial(), transforms.length);
      hull.frustumCulled = false;
      meshes.push(hull);
    }
  }
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  transforms.forEach((t, i) => {
    q.setFromAxisAngle(UP, t.yaw ?? 0);
    p.set(t.x, 0, t.z);
    const sc = t.s ?? 1;
    s.set(sc, t.sy ?? sc, sc);
    m.compose(p, q, s);
    for (const im of meshes) im.setMatrixAt(i, m);
  });
  for (const im of meshes) {
    im.instanceMatrix.needsUpdate = true;
    root.add(im);
  }
}

// Contact-shadow falloff. The shared glow texture is a bloom halo — it is 55%
// transparent a quarter of the way out, so a blob using it reads as a diffuse
// smudge rather than a grounded shadow. This one keeps a solid core out to ~45%
// of the radius and then falls off, which is what makes a prop sit ON the floor.
let sharedContactTexture = null;
export function getContactTexture() {
  if (sharedContactTexture) return sharedContactTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.72, 'rgba(255,255,255,0.42)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  sharedContactTexture = tex;
  return tex;
}

// One InstancedMesh of soft dark ellipses = every prop's contact shadow
// (reference bar check 8: grounding). Sized to each footprint and centred on
// the prop BASE, so nothing floats.
export function buildShadowInstances(root, shadows) {
  if (shadows.length === 0) return;
  const geo = new CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const mat = new MeshBasicMaterial({
    map: getContactTexture(),
    color: new Color('#000000'),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const im = new InstancedMesh(geo, mat, shadows.length);
  im.renderOrder = ORDER.shadow;
  im.frustumCulled = false;
  const m = new Matrix4();
  const q = new Quaternion();
  const p = new Vector3();
  const s = new Vector3();
  shadows.forEach((sh, i) => {
    q.setFromAxisAngle(UP, sh.yaw ?? 0);
    p.set(sh.x, 0.0075, sh.z);
    s.set(sh.rx, 1, sh.rz ?? sh.rx);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);
  });
  im.instanceMatrix.needsUpdate = true;
  root.add(im);
}

// Violet vein emissive map for the monolith (canvas: jagged branching strokes).
function veinTexture(cosmetic) {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#FFFFFF';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 3;
  const r = (a, b) => cosmetic.range(a, b);
  const vein = (x, y, ang, len, width) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x;
    let cy = y;
    let a = ang;
    const steps = Math.ceil(len / 12);
    for (let i = 0; i < steps; i++) {
      a += r(-0.55, 0.55);
      cx += Math.cos(a) * r(8, 14);
      cy += Math.sin(a) * r(8, 14);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    return { x: cx, y: cy, a };
  };
  for (let i = 0; i < 4; i++) {
    const end = vein(r(10, w - 10), h - r(5, 30), -Math.PI / 2 + r(-0.3, 0.3), r(120, 200), 3.2);
    if (cosmetic.chance(0.8)) vein(end.x, end.y, end.a + r(-1, 1), r(40, 80), 1.8);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// The act's corruption tell: a leaning 4-sided obelisk of dark stone with
// God-stuff Violet veins (emissiveMap) — the ONLY violet in an Act-1 frame.
function buildMonolith(root, [x, z, yaw], shadows, emitters, cosmetic) {
  const geo = new CylinderGeometry(0.26, 0.46, 1.05, 4, 1);
  geo.translate(0, 0.525, 0);
  const mat = toonMaterial({
    color: ENV.monolith,
    emissive: new Color(PALETTE.godstuffViolet),
    emissiveMap: veinTexture(cosmetic),
    emissiveIntensity: 2.6, // veins have to survive the dark-woodland grade
  });
  const mesh = new Mesh(geo, mat);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = yaw;
  mesh.rotation.z = 0.05; // slight corrupted lean
  addOutline(mesh);
  root.add(mesh);

  const base = new Mesh(new BoxGeometry(0.85, 0.12, 0.7), toonMaterial({ color: ENV.stoneCool }));
  base.position.set(x, 0.06, z);
  base.rotation.y = yaw;
  addOutline(base);
  root.add(base);

  shadows.push({ x, z, rx: 0.62, rz: 0.55 });
  emitters.push({ kind: 'monolith', x, y: 0.66, z });
}

// Build every placed prop for a variant. Returns { emitters, shadows } for
// the emitter/FX layer (flames, glows, pools) and the shadow instancer.
export function buildProps(root, spec, cosmetic) {
  const shadows = [];
  const emitters = [];
  const r = (a, b) => cosmetic.range(a, b);

  // Shared materials (one per tone).
  const mBark = toonMaterial({ color: ENV.bark });
  const mPlank = toonMaterial({ color: ENV.plank });
  const mTop = toonMaterial({ color: ENV.stumpTop });
  const mStone = toonMaterial({ color: ENV.stone });
  const mStoneCool = toonMaterial({ color: ENV.stoneCool });
  const mIron = toonMaterial({ color: ENV.iron });
  const mGlass = new MeshBasicMaterial({ color: ENV.glassLit, toneMapped: false });

  const place = (list, mapFn) => (list ?? []).map(mapFn);

  // --- Stone slabs.
  const slabGeo = new BoxGeometry(0.85, 0.13, 0.6);
  slabGeo.translate(0, 0.065, 0);
  const slabT = place(spec.slabs, ([x, z, yaw = 0]) => ({ x, z, yaw, s: r(0.85, 1.15) }));
  if (slabT.length) {
    addInstancedProp(root, [{ geo: slabGeo, mat: mStone, ink: true }], slabT);
    for (const t of slabT) shadows.push({ x: t.x, z: t.z, rx: 0.56 * t.s, rz: 0.44 * t.s, yaw: t.yaw });
  }

  // --- Stumps (trunk + pale cut top).
  const trunkGeo = new CylinderGeometry(0.26, 0.33, 0.36, 10);
  trunkGeo.translate(0, 0.18, 0);
  const topGeo = new CylinderGeometry(0.245, 0.245, 0.05, 10);
  topGeo.translate(0, 0.375, 0);
  const stumpT = place(spec.stumps, ([x, z]) => ({ x, z, yaw: r(0, Math.PI * 2), s: r(0.85, 1.2) }));
  if (stumpT.length) {
    addInstancedProp(
      root,
      [
        { geo: trunkGeo, mat: mBark, ink: true },
        { geo: topGeo, mat: mTop, ink: false },
      ],
      stumpT
    );
    for (const t of stumpT) shadows.push({ x: t.x, z: t.z, rx: 0.44 * t.s });
  }

  // --- Fence segments (2 posts + 2 rails, merged per layer).
  const postGeo = mergeGeometries([
    new CylinderGeometry(0.045, 0.06, 0.55, 6).translate(-0.45, 0.275, 0),
    new CylinderGeometry(0.045, 0.06, 0.55, 6).translate(0.45, 0.275, 0),
  ]);
  const railGeo = mergeGeometries([
    new BoxGeometry(1.05, 0.055, 0.045).translate(0, 0.42, 0),
    new BoxGeometry(1.05, 0.055, 0.045).translate(0, 0.235, 0),
  ]);
  const fenceT = place(spec.fences, ([x, z, yaw = 0]) => ({ x, z, yaw }));
  if (fenceT.length) {
    addInstancedProp(
      root,
      [
        { geo: postGeo, mat: mBark, ink: 0.018 },
        { geo: railGeo, mat: mPlank, ink: 0.014 },
      ],
      fenceT
    );
    for (const t of fenceT) shadows.push({ x: t.x, z: t.z, rx: 0.58, rz: 0.16, yaw: t.yaw });
  }

  // --- Crates.
  const crateGeo = new BoxGeometry(0.44, 0.44, 0.44);
  crateGeo.translate(0, 0.22, 0);
  const crateT = place(spec.crates, ([x, z, yaw = 0]) => ({ x, z, yaw, s: r(0.85, 1.1) }));
  if (crateT.length) {
    addInstancedProp(root, [{ geo: crateGeo, mat: mPlank, ink: true }], crateT);
    for (const t of crateT) shadows.push({ x: t.x, z: t.z, rx: 0.36 * t.s });
  }

  // --- Barrels (staved body + two iron hoops).
  const barrelGeo = new CylinderGeometry(0.2, 0.235, 0.52, 12);
  barrelGeo.translate(0, 0.26, 0);
  const hoopGeo = mergeGeometries([
    new TorusGeometry(0.218, 0.017, 6, 18).rotateX(Math.PI / 2).translate(0, 0.135, 0),
    new TorusGeometry(0.208, 0.017, 6, 18).rotateX(Math.PI / 2).translate(0, 0.4, 0),
  ]);
  const barrelT = place(spec.barrels, ([x, z]) => ({ x, z, yaw: r(0, Math.PI * 2), s: r(0.9, 1.1) }));
  if (barrelT.length) {
    addInstancedProp(
      root,
      [
        { geo: barrelGeo, mat: mBark, ink: true },
        { geo: hoopGeo, mat: mIron, ink: false },
      ],
      barrelT
    );
    for (const t of barrelT) shadows.push({ x: t.x, z: t.z, rx: 0.3 * t.s });
  }

  // --- Torch posts (pole + iron cup; the flame/pool sprites ride the emitter
  // list — §19.3 every light emitter carries a glow).
  const poleGeo = new CylinderGeometry(0.035, 0.05, 0.85, 7);
  poleGeo.translate(0, 0.425, 0);
  const cupGeo = new ConeGeometry(0.085, 0.12, 7).rotateX(Math.PI);
  cupGeo.translate(0, 0.87, 0);
  const torchT = place(spec.torches, ([x, z]) => ({ x, z, yaw: r(0, Math.PI * 2) }));
  if (torchT.length) {
    addInstancedProp(
      root,
      [
        { geo: poleGeo, mat: mBark, ink: 0.018 },
        { geo: cupGeo, mat: mIron, ink: 0.018 },
      ],
      torchT
    );
    for (const t of torchT) {
      shadows.push({ x: t.x, z: t.z, rx: 0.22 });
      emitters.push({ kind: 'flame', x: t.x, y: 0.97, z: t.z });
    }
  }

  // --- Hanging lanterns (pole + arm + glowing glass + cap).
  const lPole = new CylinderGeometry(0.03, 0.045, 0.8, 6);
  lPole.translate(0, 0.4, 0);
  const lArm = new BoxGeometry(0.34, 0.04, 0.04);
  lArm.translate(0.14, 0.77, 0);
  const lGlass = new BoxGeometry(0.11, 0.14, 0.11);
  lGlass.translate(0.28, 0.63, 0);
  const lCap = new ConeGeometry(0.1, 0.08, 4);
  lCap.translate(0.28, 0.74, 0);
  const lanternT = place(spec.lanterns, ([x, z, yaw = 0]) => ({ x, z, yaw }));
  if (lanternT.length) {
    addInstancedProp(
      root,
      [
        { geo: lPole, mat: mIron, ink: 0.016 },
        { geo: lArm, mat: mIron, ink: false },
        { geo: lGlass, mat: mGlass, ink: 0.012 },
        { geo: lCap, mat: mIron, ink: 0.012 },
      ],
      lanternT
    );
    for (const t of lanternT) {
      const ex = t.x + Math.cos(t.yaw) * 0.28;
      const ez = t.z - Math.sin(t.yaw) * 0.28;
      shadows.push({ x: t.x + Math.cos(t.yaw) * 0.14, z: t.z - Math.sin(t.yaw) * 0.14, rx: 0.3, rz: 0.18, yaw: t.yaw });
      emitters.push({ kind: 'lantern', x: ex, y: 0.63, z: ez });
    }
  }

  // --- Fallen logs (lying trunk + a mossy cap so it isn't a bare tube).
  const logGeo = new CylinderGeometry(0.19, 0.22, 1.5, 9).rotateZ(Math.PI / 2);
  logGeo.translate(0, 0.19, 0);
  const logMossGeo = new CylinderGeometry(0.2, 0.2, 0.34, 9, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
  logMossGeo.translate(0.24, 0.19, 0);
  const mMoss = toonMaterial({ color: hslColor(spec.ground.h + 18, 0.44, 0.19) });
  const logT = place(spec.logs, ([x, z, yaw = 0]) => ({ x, z, yaw, s: r(0.85, 1.15) }));
  if (logT.length) {
    addInstancedProp(
      root,
      [
        { geo: logGeo, mat: mBark, ink: true },
        { geo: logMossGeo, mat: mMoss, ink: false },
      ],
      logT
    );
    for (const t of logT) shadows.push({ x: t.x, z: t.z, rx: 0.9 * t.s, rz: 0.3 * t.s, yaw: t.yaw });
  }

  // --- Bushes / ferns (3 squashed lobes of dark foliage; edge silhouette
  // breakers per reference C, never taller than a character).
  const bushGeo = mergeGeometries([
    new IcosahedronGeometry(0.3, 0).translate(0, 0.2, 0),
    new IcosahedronGeometry(0.22, 0).translate(0.26, 0.13, 0.1),
    new IcosahedronGeometry(0.2, 0).translate(-0.2, 0.12, -0.14),
  ]);
  const mBush = toonMaterial({ color: hslColor(spec.ground.h + 8, 0.48, 0.17) });
  const bushT = place(spec.bushes, ([x, z]) => ({
    x,
    z,
    yaw: r(0, Math.PI * 2),
    s: r(0.85, 1.35),
    sy: r(0.7, 1.0),
  }));
  if (bushT.length) {
    addInstancedProp(root, [{ geo: bushGeo, mat: mBush, ink: true }], bushT);
    for (const t of bushT) shadows.push({ x: t.x, z: t.z, rx: 0.5 * t.s, rz: 0.42 * t.s });
  }

  // --- Boulders (squashed icosahedra, mossy-cool stone).
  const boulderGeo = new IcosahedronGeometry(0.32, 0);
  boulderGeo.translate(0, 0.21, 0);
  const boulderT = place(spec.boulders, ([x, z]) => ({
    x,
    z,
    yaw: r(0, Math.PI * 2),
    s: r(0.8, 1.25),
    sy: r(0.55, 0.75),
  }));
  if (boulderT.length) {
    addInstancedProp(root, [{ geo: boulderGeo, mat: mStoneCool, ink: true }], boulderT);
    for (const t of boulderT) shadows.push({ x: t.x, z: t.z, rx: 0.38 * t.s });
  }

  // --- Corruption monolith (single hero prop).
  if (spec.monolith) buildMonolith(root, spec.monolith, shadows, emitters, cosmetic);

  // Widen every footprint, and nudge it a little toward the camera (+z). Props
  // ring the arena EDGES, so a perfectly centred blob hides behind its own prop
  // at the far wall and the prop reads as floating; the offset guarantees a
  // visible crescent of contact shadow in front of every base.
  for (const sh of shadows) {
    sh.rx *= 1.35;
    if (sh.rz !== undefined) sh.rz *= 1.35;
    sh.z += 0.13;
  }

  // Prop types placed (reference bar check 4 counts distinct silhouettes):
  // slab, stump, fence, crate, barrel, torch post, lantern, log, bush, boulder,
  // monolith = 11.
  return { emitters, shadows, mats: { glass: mGlass } };
}
