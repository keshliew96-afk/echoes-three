// Shared chibi-critter foundation (BUILD_BRIEF §19.2).
//
// What lives here and WHY (each choice below answers a defect measured in a
// captured frame, not a preference):
//
// 1. `addInk` — inverted-hull ink whose thickness is CONSTANT IN SCREEN PIXELS.
//    The old hull displaced vertices a fixed 0.028 world units, so one and the
//    same character carried ~2.5 px of ink at the gameplay camera and 4-6 px in
//    the closer gallery capture, while environment props (which carry no hull)
//    show 0-1 px edges — the party pasted onto the arena as thick-outlined
//    stickers. The hull is now expanded in CLIP space along the projected
//    normal, so the line measures INK_PX pixels at every zoom in every scene.
// 2. `faceDecal` — eyes are painted into a CanvasTexture on a sphere patch
//    instead of built from geometry. Geometry eyes sat under their own ink and
//    the skull's ink; at gallery framing the two eyes, the head's lower ink
//    line and the muzzle fused into one black band ("bandit mask") and the
//    1-2 px glint vanished. Painted eyes are unlit, unhulled and exactly sized,
//    so the glint survives to the scale the player actually sees.
// 3. `groundRing` / `groundShadow` — DEPTH-TESTED ground decals. The previous
//    ring ran depthTest:false and painted its band plus a ~4 px ink line across
//    bellies, feet and a chest-height pauldron. Rings/shadows now sort behind
//    every character mass, and the ring is a soft alpha falloff with no ink
//    line at all: at 50% scale a hard-inked hoop read as "blob inside a hoop".
// 4. `exactColor`/`exactHex` — the post chain (ACES filmic + grade) is inverted
//    numerically so an authored UNLIT color lands on its exact palette hex in
//    the final frame. §17 specifies identity rings in "the exact class-accent
//    hex"; before this, #6B2E3A left the composer as #6f1723.
import {
  BufferGeometry,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../data/palette.js';
import { POST } from '../../core/constants.js';
import { BLOOM, EXPOSURE } from '../stage.js';
import { toonMaterial } from '../toon.js';
import { sharedGeo, markShared } from '../geocache.js';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
export function mix(hexA, hexB, t) {
  return new Color(hexA).lerp(new Color(hexB), t);
}

// Downed desaturation target (§10): the accent's luminance pulled toward Void
// Charcoal — "accent desaturates toward charcoal".
export function desatTarget(color) {
  const l = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  return new Color(l, l, l).lerp(new Color(PALETTE.voidCharcoal), 0.42);
}

// --- Post-chain inversion ---------------------------------------------------
// The composer runs RenderPass -> bloom -> OutputPass (ACES filmic + linear->
// sRGB) -> grade (S-curve, warm lift, +5% sat). An unlit material authored as
// hex X therefore does NOT appear as X on screen. `exactColor(X)` solves for
// the authored value whose final pixel IS X (frame centre; the vignette costs a
// few percent at the frame edges). Newton iteration over the forward chain.
const ACES_IN = [0.59719, 0.076, 0.0284, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777];
const ACES_OUT = [1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602];
const mat3mul = (m, v) => [
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];
const rrt = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lin2srgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// NOTE: the exposure and bloom numbers are READ FROM stage.js rather than
// copied, because the environment pass tunes them. If the stage re-exposes the
// scene, every exact palette hex and the identity ring's bloom headroom track
// it automatically instead of silently going off-palette.
function forwardPost(lin) {
  let c = mat3mul(ACES_IN, lin.map((v) => (v * EXPOSURE) / 0.6)).map(rrt);
  c = mat3mul(ACES_OUT, c).map(clamp01).map(lin2srgb);
  const s = c.map((v) => v * v * (3 - 2 * v));
  c = c.map((v, i) => v + (s[i] - v) * POST.gradeMix);
  c = [c[0] * 1.045 + 0.012, c[1] * 1.01 + 0.006, c[2] * 0.965];
  const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return c.map((v) => clamp01(luma + (v - luma) * POST.gradeSaturation));
}

function solve3(J, r) {
  const m = [[...J[0], r[0]], [...J[1], r[1]], [...J[2], r[2]]];
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(m[k][i]) > Math.abs(m[p][i])) p = k;
    [m[i], m[p]] = [m[p], m[i]];
    if (Math.abs(m[i][i]) < 1e-9) return [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      if (k === i) continue;
      const f = m[k][i] / m[i][i];
      for (let j = i; j < 4; j++) m[k][j] -= f * m[i][j];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

const exactCache = new Map();
export function exactColor(targetHex) {
  const key = String(targetHex);
  if (exactCache.has(key)) return exactCache.get(key).clone();
  const t = new Color(targetHex); // three converts sRGB -> linear working space
  const target = [lin2srgb(t.r), lin2srgb(t.g), lin2srgb(t.b)]; // back to display
  const lin = [t.r, t.g, t.b];
  let best = null;
  for (let it = 0; it < 120; it++) {
    const got = forwardPost(lin);
    const res = [target[0] - got[0], target[1] - got[1], target[2] - got[2]];
    const err = Math.max(Math.abs(res[0]), Math.abs(res[1]), Math.abs(res[2]));
    if (best === null || err < best.err) best = { err, lin: [...lin] };
    if (err < 0.0006) break;
    const h = 1e-4;
    const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let j = 0; j < 3; j++) {
      const l2 = [...lin];
      l2[j] += h;
      const g2 = forwardPost(l2);
      for (let i = 0; i < 3; i++) J[i][j] = (g2[i] - got[i]) / h;
    }
    const d = solve3(J, res);
    for (let i = 0; i < 3; i++) lin[i] = Math.max(0, Math.min(4, lin[i] + d[i] * 0.8));
  }
  const c = new Color(best.lin[0], best.lin[1], best.lin[2]);
  exactCache.set(key, c);
  return c.clone();
}

// GAMUT NOTE. ACES cannot reproduce every palette hex as an UNLIT colour: a
// saturated green at high value needs a negative red primary, which clamps, so
// solving for Bright Heal #5FE873 lands on hue 114 instead of 129 no matter how
// the solver is driven. `exactColorNearest` returns the BRIGHTEST in-gamut
// rendering of a hex — it walks the target's value down until the solve
// actually converges, which preserves hue and saturation exactly and gives up
// only the last few percent of value. Used for the heal gem; flat palette
// colours (rings, ink, bone) are all in gamut and use exactColor directly.
export function exactColorNearest(targetHex, floor = 0.5) {
  const key = `near:${targetHex}`;
  if (exactCache.has(key)) return exactCache.get(key).clone();
  const t = new Color(targetHex);
  const want = [lin2srgb(t.r), lin2srgb(t.g), lin2srgb(t.b)];
  let lo = floor;
  let hi = 1;
  let bestLin = null;
  const trial = (s) => {
    const scaled = want.map((v) => v * s);
    const lin = [...scaled];
    let out = null;
    for (let it = 0; it < 120; it++) {
      const got = forwardPost(lin);
      const res = [scaled[0] - got[0], scaled[1] - got[1], scaled[2] - got[2]];
      const err = Math.max(Math.abs(res[0]), Math.abs(res[1]), Math.abs(res[2]));
      if (out === null || err < out.err) out = { err, lin: [...lin] };
      if (err < 0.0015) break;
      const h = 1e-4;
      const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let j = 0; j < 3; j++) {
        const l2 = [...lin];
        l2[j] += h;
        const g2 = forwardPost(l2);
        for (let i = 0; i < 3; i++) J[i][j] = (g2[i] - got[i]) / h;
      }
      const d = solve3(J, res);
      for (let i = 0; i < 3; i++) lin[i] = Math.max(0, Math.min(4, lin[i] + d[i] * 0.8));
    }
    return out;
  };
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const r = trial(mid);
    if (r.err < 0.0015) {
      bestLin = r.lin;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (!bestLin) bestLin = trial(floor).lin;
  const c = new Color(bestLin[0], bestLin[1], bestLin[2]);
  exactCache.set(key, c);
  return c.clone();
}

// CSS hex for canvas drawing (canvas pixels are sampled through an sRGB
// texture, so the same inversion applies).
export function exactHex(targetHex) {
  const c = exactColor(targetHex);
  const b = (v) => Math.round(clamp01(lin2srgb(v)) * 255).toString(16).padStart(2, '0');
  return `#${b(c.r)}${b(c.g)}${b(c.b)}`;
}

// ---------------------------------------------------------------------------
// Cached geometry helpers
// ---------------------------------------------------------------------------
const cache = new Map();
export function cachedSphere(key, r, w = 18, h = 14) {
  if (!cache.has(key)) cache.set(key, markShared(new SphereGeometry(r, w, h)));
  return cache.get(key);
}

// Lathe bell profile: point pairs [radius, y], bottom -> top.
export function bell(pointPairs, segments = 32) {
  return new LatheGeometry(
    pointPairs.map(([x, y]) => new Vector2(x, y)),
    segments
  );
}

// Garment panel: a lathe ARC that rides just outside the body surface, taking
// the body's own profile. Embedding a squashed sphere in the torso instead (the
// obvious approach) leaves only a small cap poking through, which reads as a
// dark hole in the belly rather than a tabard or a bib.
export function bodyPanel(pointPairs, { color, phiLength = 1.0, grow = 1.022, segments = 18 }) {
  const geo = new LatheGeometry(
    pointPairs.map(([x, y]) => new Vector2(x * grow, y)),
    segments,
    -phiLength / 2, // lathe phi 0 faces +Z, so this centres the panel on the front
    phiLength
  );
  const mesh = new Mesh(geo, toonMaterial({ color }));
  mesh.name = 'panel';
  return mesh;
}

// Brush profile: NARROW at the root, FAT through the middle, tapered to a tip.
// A monotonically shrinking taper (what round 3 shipped) is a CONE, and a cone
// is exactly what the critic saw — "a rigid traffic cone... no curve, no
// fluff". Fur reads as fur only when the mass swells away from the root.
export const brushProfile = (t) => (0.42 + 0.58 * Math.sin(Math.PI * Math.pow(t, 0.72))) * (1 - 0.22 * t);

// Brush tail: one TubeGeometry whose ring radii follow `brushProfile` along the
// path and whose vertex colours fade to the light tip, plus a rounded cap so
// the open tube end cannot read as a cut-off cone. Built as one mesh on
// purpose — a chain of overlapping balls, or a tube plus a detached light cap,
// each carried their own ink and read as a segmented caterpillar.
export function brushTail(curve, { radius, colorA, colorB, split = 0.55, tubular = 28, radial = 12 }) {
  const geo = new TubeGeometry(curve, tubular, radius, radial, false);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cA = new Color(colorA);
  const cB = new Color(colorB);
  const tmp = new Color();
  const centre = new Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, centre);
    const k = brushProfile(t);
    const c = Math.min(1, Math.max(0, (t - split) / (1 - split)));
    tmp.copy(cA).lerp(cB, c * c);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      pos.setXYZ(
        idx,
        centre.x + (pos.getX(idx) - centre.x) * k,
        centre.y + (pos.getY(idx) - centre.y) * k,
        centre.z + (pos.getZ(idx) - centre.z) * k
      );
      colors[idx * 3] = tmp.r;
      colors[idx * 3 + 1] = tmp.g;
      colors[idx * 3 + 2] = tmp.b;
    }
  }
  pos.needsUpdate = true;
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new Mesh(geo, toonMaterial({ color: 0xffffff, vertexColors: true }));
  addInk(mesh);
  mesh.name = 'brush';
  // Rounded tip cap, welded at the curve end in the tip colour.
  const cap = part(cachedSphere('brushcap', 1, 16, 12), colorB);
  cap.scale.setScalar(radius * brushProfile(1) * 1.02);
  curve.getPointAt(1, cap.position);
  mesh.attach ? mesh.parent : null;
  mesh.userData.cap = cap;
  return mesh;
}

// ---------------------------------------------------------------------------
// Ink — inverted hull, constant screen-space width
// ---------------------------------------------------------------------------
// Certification fix round 2 (2026-09-10): 2.0 -> 2.7 px. Two scorers read the
// party as "one beige mass" wherever the leash stacks three bodies inside one
// unit, and reference A's chibi cast is defined by THICK dark outlines. A 2 px
// line at 1600x900 is exactly the width FXAA blends away between two adjacent
// critters; 2.7 survives it and is what separates a body in front from the body
// behind it.
export const INK_PX = 2.7; // storybook line, measured in PIXELS at any zoom

const inkUniforms = {
  uPx: { value: INK_PX },
  uViewport: { value: new Vector2(1600, 900) },
  uColor: { value: exactColor(PALETTE.voidCharcoal) },
};

let inkMat = null;
function getInkMaterial() {
  if (inkMat) return inkMat;
  inkMat = new ShaderMaterial({
    uniforms: inkUniforms,
    side: BackSide,
    // Pushed back in depth so the hull only survives OUTSIDE a silhouette: a
    // half-buried mass (snout, tabard, pauldron) would otherwise paint its ink
    // across the body it is embedded in.
    polygonOffset: true,
    polygonOffsetFactor: 3,
    polygonOffsetUnits: 3,
    vertexShader: /* glsl */ `
      uniform float uPx;
      uniform vec2 uViewport;
      void main() {
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        vec4 clip = projectionMatrix * mv;
        vec2 np = ( projectionMatrix * vec4( normalize( normalMatrix * normal ), 0.0 ) ).xy;
        float l = length( np );
        if ( l > 1e-5 ) clip.xy += ( np / l ) * ( uPx * 2.0 / uViewport ) * clip.w;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4( uColor, 1.0 ); }
    `,
  });
  inkMat.userData.shared = true; // one ink material for the whole game — never disposed
  return inkMat;
}

// Called once per frame (cheap) with the CSS pixel size of the canvas.
export function setInkViewport(width, height) {
  inkUniforms.uViewport.value.set(width, height);
}

// Inverted-hull ink child. Vertices are merged + re-normalled on the CPU (split
// normals would tear the hull open on a box's hard edges) and expanded in the
// shader, so the line is a constant INK_PX wide whatever the mesh size or
// camera distance. Returns the hull so callers can toggle `.visible`.
//
// The hull is a PURE FUNCTION of the source geometry (clone, strip everything
// but position, weld, re-normal), so every mesh built from the same cached
// primitive gets the same hull buffer. Before the D-r1 fix each spawned boar
// minted two fresh hulls and each mantis a dozen, none of which was ever
// disposed — the bulk of the +115 geometries per run (F1). The WeakMap is
// keyed by the SOURCE geometry, so a one-off shape (a lathe bell authored per
// critter) still gets its own hull and dies with it.
const inkHulls = new WeakMap();
function inkHullGeometry(source) {
  let geo = inkHulls.get(source);
  if (geo === undefined) {
    geo = source.clone();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position') geo.deleteAttribute(name);
    geo = mergeVertices(geo);
    geo.computeVertexNormals();
    markShared(geo);
    inkHulls.set(source, geo);
  }
  return geo;
}

export function addInk(mesh) {
  const geo = inkHullGeometry(mesh.geometry);
  const hull = new Mesh(geo, getInkMaterial());
  hull.name = `${mesh.name || 'mesh'}-ink`;
  mesh.add(hull);
  return hull;
}

// Toon mesh + ink in one call — the default body-part constructor.
export function part(geometry, colorHex, { ink = true, mat = null } = {}) {
  const m = new Mesh(geometry, mat || toonMaterial({ color: colorHex }));
  if (ink) addInk(m);
  return m;
}

// ---------------------------------------------------------------------------
// Face decal — painted eyes (party-exclusive treatment, §19.2)
// ---------------------------------------------------------------------------
// A sphere PATCH hugging the skull, carrying a canvas-painted face: two large
// dark bean eyes set in the lower half of the head plus a bright glint offset
// up-left. Unlit + unhulled, so nothing about the lighting, the toon banding or
// the ink can swallow them.
const FACE_PHI_LEN = 2.1; // rad of skull wrapped horizontally
const FACE_THETA_START = 0.95;
const FACE_THETA_LEN = 1.15;

// GLINT SIZING (round-3 F3). The glints used to read as glowing white slit-
// eyes — the treatment §19.2 reserves for ENEMIES — for two compounding
// reasons: they were 30% of the eye RADIUS (9% of its area, but drawn on a
// bean that the head-stripe had already eaten), and they were painted in
// Parchment, whose post-chain-compensated linear value sits far above the 0.85
// bloom threshold, so UnrealBloomPass grew each dot into a white crescent.
// They are now Bone #C9C2B3 — the brightest palette value that stays UNDER the
// bloom threshold — at 0.20 of the eye radius (4% of eye area), on a bean
// enlarged so the dark mass dominates.
const GLINT_R = 0.2;

export function faceDecal({
  R,
  sx = 1,
  sy = 1,
  sz = 1,
  eyeW = 0.112, //   eye radii as a fraction of the canvas
  eyeH = 0.142,
  spread = 0.205, // half the eye separation, fraction of canvas width
  drop = 0.66, //    eye centre, fraction down the patch (lower two-thirds)
  glint = GLINT_R, // glint radius as a fraction of the eye radius
  sclera = 0, //     light fur ring painted behind the bean (badger stripe fix)
  paint = null, //   optional extra canvas art (species markings)
}) {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  if (paint) paint(ctx, S);

  const ink = exactHex(PALETTE.voidCharcoal);
  const shine = exactHex(PALETTE.bone);
  for (const side of [-1, 1]) {
    const cx = S * (0.5 + side * spread);
    const cy = S * drop;
    const rx = S * eyeW;
    const ry = S * eyeH;
    // Optional light fur ring: separates the dark bean from a dark species
    // marking crossing the eye, so the EYE MASS is what the viewer reads.
    if (sclera > 0) {
      ctx.fillStyle = exactHex(mix(PALETTE.bone, PALETTE.warmGrey, 0.25).getHex());
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * (1 + sclera), ry * (1 + sclera * 0.85), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Glint: a TINY specular dot, up-LEFT on both eyes (one light direction).
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.36, cy - ry * 0.42, rx * glint, ry * glint, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  const geo = new SphereGeometry(
    R * 1.012,
    36,
    24,
    Math.PI / 2 - FACE_PHI_LEN / 2,
    FACE_PHI_LEN,
    FACE_THETA_START,
    FACE_THETA_LEN
  );
  const mesh = new Mesh(
    geo,
    new MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  mesh.scale.set(sx, sy, sz);
  mesh.renderOrder = 3;
  mesh.name = 'face';
  return mesh;
}

// Species markings (badger head-stripe, fox cheeks, hare blaze) painted on the
// same patch shape but with a LIT toon material, so a marking bands with the
// key light exactly like the fur around it. Eyes stay on the unlit decal above.
export function faceMarkings({ R, sx = 1, sy = 1, sz = 1, paint }) {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  paint(ctx, S);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  const geo = new SphereGeometry(
    R * 1.006,
    36,
    24,
    Math.PI / 2 - FACE_PHI_LEN / 2,
    FACE_PHI_LEN,
    FACE_THETA_START - 0.5,
    FACE_THETA_LEN + 0.7
  );
  const mat = toonMaterial({ color: PALETTE.parchment });
  mat.map = tex;
  mat.transparent = true;
  mat.depthWrite = false;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -1;
  const mesh = new Mesh(geo, mat);
  mesh.scale.set(sx, sy, sz);
  mesh.renderOrder = 2;
  mesh.name = 'markings';
  return mesh;
}

// ---------------------------------------------------------------------------
// Paws and stubby arms
// ---------------------------------------------------------------------------
// §19.2: "Paws = single rounded mitten spheres, no digits". Arms exist so props
// are visibly HELD: a mitten floating beside a sword grip is what made every
// prop read as unattached in the previous captures.
export function mitten(colorHex, r = 0.055) {
  const m = new Mesh(cachedSphere('paw', 1, 14, 10), toonMaterial({ color: colorHex }));
  m.scale.setScalar(r);
  addInk(m);
  return m;
}

const UP = new Vector3(0, 1, 0);
const armTmp = new Vector3();

// Stubby limb pivoting at the shoulder; `aimArm` re-points and stretches it at
// whatever the paw is holding, every frame, so the chain shoulder->arm->paw->
// prop can never come apart while a clip moves the prop.
export function makeArm(colorHex, radius = 0.052, baseLen = 0.24) {
  const pivot = new Group();
  const m = new Mesh(new CapsuleGeometry(radius, baseLen - radius * 2, 5, 12), toonMaterial({ color: colorHex }));
  m.position.y = baseLen / 2;
  addInk(m);
  pivot.add(m);
  pivot.userData.baseLen = baseLen;
  return pivot;
}

// target: a position in the arm pivot's PARENT space.
export function aimArm(pivot, target) {
  armTmp.copy(target).sub(pivot.position);
  const len = Math.max(0.02, armTmp.length());
  pivot.quaternion.setFromUnitVectors(UP, armTmp.normalize());
  pivot.scale.set(1, len / pivot.userData.baseLen, 1);
}

// ---------------------------------------------------------------------------
// Ground decals — identity ring + contact shadow
// ---------------------------------------------------------------------------
function radialTexture(stops, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [at, css] of stops) grad.addColorStop(at, css);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// --- Identity ring: a LIT ring, not a tinted one -----------------------------
// Round 3 rejected the Tank ring three times in a row for the same reason:
// #6B6157 is a low-chroma mid-value grey-brown, so a hue-correct ring lands
// within a few percent luminance of both its own contact shadow and the floor.
// Measured: ring #6B6157 (luma 98) on ground #8F8780 (luma 136) — the ring was
// DARKER than the floor it was supposed to mark. Hue can never fix that.
//
// The ring is therefore rebuilt around VALUE and EDGE, in four concentric
// bands painted into one mask texture (R/G/B channels select the band, so a
// single draw carries three independently tintable colours):
//
//   [bone rim]  gap  [ value-lifted accent core ]  gap  [exact accent stroke]
//
//   * `core` is the accent pushed to HSL lightness 0.93 — a pastel of the class
//     hue. It is the band that carries legibility: it measures ~2.0x the
//     ground luma, so the ring reads as light drawn on the floor at any camera,
//     from behind, and through another body's silhouette.
//   * `rim` is the Bone #C9C2B3 inner stroke — a crisp bright edge on the
//     inside so the ring can never blur into the contact shadow.
//   * `acc` is the EXACT class-accent hex (§17 "identity rings ... in the exact
//     class-accent hex"), kept as the outer stroke and separated from the core
//     by a dark gap so bloom off the bright band cannot lift it off-hex.
//   * the gaps are ground showing through: two hard value steps per edge is
//     what makes the shape read as an ELLIPSE rather than a haze.
// Band radii are fractions of the ring plane's half-size. The core is authored
// to land just UNDER the composer's bloom threshold: measured against this post
// chain, linear 0.85 tonemaps to display luma 232, so a non-blooming band can
// still be twice the ground's value. Pushing past it (the first attempt did)
// makes UnrealBloomPass wash the entire frame and destroys every class hue.
// RING REDESIGN (baseline-v030 F5). The previous ring carried its legibility in
// a value-lifted PASTEL core (L 0.85) with the exact accent as a thin outer
// stroke — measured on captures, the pastel dominated and the rings read
// off-palette (Swordsman #EEC6CD "pink", Healer "mint-cyan"). The advisory asks
// for the CLASS HUE back with legibility kept, and its own fallback names the
// mechanism: a >=2px dark rim stroke. So the ring is now
//
//   [ink stroke]  [ accent band — hue-true, value-lifted to L~0.54 ]  [ink stroke]
//
// The band is the accent's own hue at (near) its own saturation, lifted only in
// VALUE, so its measured hue sits within a couple of degrees of the class hex
// (`ringBand` below + exactColor's post-chain inversion). Legibility rides the
// two cool-dark ink strokes (INK_COOL below): ~3-5px each at the gameplay
// camera, a hard dark edge against both the band and any ground. The Healer's band keeps her own
// low saturation (HSV sat ~0.33) ON PURPOSE — Sage's hue 138 lives inside the
// reserved Bright Heal analyzer band (h110-150, s>0.35), and staying under the
// 0.35 sat gate is what keeps her ring from ever counting as heal output.
const RING = Object.freeze({
  // Strokes widened (0.076 -> 0.104/0.094 of the half-size) so that at the
  // ellipse's foreshortened top/bottom FXAA can never blend the accent band
  // and the lit ground inside one filter neighbourhood: measured on captures,
  // the thin-stroke rings smeared band+ink+gold-grass into 2-3 px fringes at
  // h5-25 / s0.35-0.49 — the reserved Ember Danger band — and the party's four
  // rings were the single largest danger-band contributor in a no-enemy frame
  // (368 px -> 139 with rings hidden). Wider ink = every FXAA gradient is
  // band<->ink or ink<->ground, and INK_COOL below keeps both of those safe.
  // Strokes widened once more (inner 0.104 -> 0.116, outer 0.094 -> 0.110 of
  // the half-size): measured on a ring scan, the Swordsman's OUTER stroke fell
  // to ~1.5 px on the side that sits inside a brazier pool, where the bright
  // ground and FXAA eat into it. The §17 legibility fallback is a >=2 px dark
  // rim, so it has to survive the brightest ground in the arena.
  // FIX ROUND 2 — the BAND is widened from 0.172 to 0.228 of the half-size
  // (+33%) and the strokes trimmed to pay for it. Reason, measured: the shipped
  // post stack ends in an FXAA pass (main.js defaults msaa=0), and at the
  // Archer's ring radius the old band was 4.7 screen px across on its major
  // axis and under 3 px on the foreshortened bottom arc — narrow enough that
  // FXAA blended ink into the band's own interior and the ring's measured hue
  // moved 5-13 degrees off the class accent depending on which arc was
  // sampled. A wider band is measurably its authored colour; both strokes stay
  // over the §17 >=2 px legibility floor (3.5-4.1 px on the major axis,
  // 2.2-2.5 px foreshortened, measured with tools/qp-ring2.mjs).
  // Widths are chosen so BOTH strokes clear the §17 >=2 px legibility floor on
  // the ring's FORESHORTENED bottom arc (cos 52 deg = 0.6155 of the major-axis
  // width) at the smallest ring in the party, after the shipped FXAA pass has
  // eaten ~0.4 px off each edge. Archer ring radius 35.8 px on screen ->
  // half 36.5 px -> stroke 0.125 * 36.5 = 4.6 px major / 2.8 px minor.
  // ROUND D — the band takes another 14% of the ring's width from the two ink
  // strokes (band 0.220 -> 0.250 of the half-size; inner ink 0.125 -> 0.110,
  // outer 0.125 -> 0.100). Measured cause: at the gameplay camera the shipped
  // FXAA pass (main.js defaults msaa=0) blends ~1.5 px into EVERY boundary the
  // band has — its own two edges, and every grass blade, paw and staff that
  // crosses the ring. On a foreshortened arc the old band was ~5.5 screen px
  // across, so more than half of it was blend rather than band, and a ring
  // measured over the whole annulus drifted up to 14 deg toward whatever stood
  // in front of it (worst case the Healer's low-chroma Sage against bright
  // grass: h124 against her accent's h138). Both strokes stay well over the
  // §17 >=2 px legibility floor — measured with tools/zd-ringdiff.js they run
  // 3.2-6.5 px on the major axis and 2.0-4.0 px foreshortened.
  inkInA: 0.52, // inner ink stroke
  inkOutA: 0.63,
  bandIn: 0.63, // hue-true accent band
  bandOut: 0.88,
  inkInB: 0.88, // outer ink stroke
  inkOutB: 0.98,
  edge: 0.009, // antialias width, fraction of the plane half-size
  outer: 0.98, // where the ring's outermost pixel sits; sets the plane size
});

// Ring ink tone: Void Charcoal pulled toward the deep-indigo contact-shadow
// family (env/props.js uses #101A2C for the same measured reason). Charcoal
// itself is a WARM dark (h~17): its FXAA blend with gold-lit grass lands at
// h22-25 / s0.36-0.38 — inside the reserved danger gate once the grade's
// red-lift does its work. The indigo bias makes every ink<->warm-ground and
// ink<->band gradient pass through neutral instead. Still reads as the same
// storybook dark rim (§17's >=2 px legibility stroke).
const INK_COOL = mix(PALETTE.voidCharcoal, '#101A2C', 0.55).getHex();

// Hue-true band tone: the accent's own hue, saturation clamped into a readable
// band (floor lifts the Tank's near-neutral 0.10 so its hue is measurable at
// all; ceiling keeps every band under the analyzer's reserved-hue sat gates),
// value lifted to sit above the ground.
export function ringBand(hex) {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(hex).getHSL(hsl, SRGBColorSpace);
  // PRE-COMPENSATION. The advisory asks the rings to measure back on their
  // class-accent hexes, and the band is authored at the accent's own hue — but
  // the post chain (warm gold key x albedo, ACES, then the grade's
  // `c *= vec3(1.045,1.010,0.965)` red lift) rotates what actually reaches the
  // screen. Measured on ring scans of a spawn frame, the rotation is roughly
  // PROPORTIONAL to hue over the green/gold range and reversed near the red
  // end, because there it is the key's missing blue that moves the hue:
  //     Tank  #6B6157 h30   painted 30  -> measured 30.0  (deficit  0.0)
  //     Archer#6E7A3F h72   painted 72  -> measured 63.8  (deficit  8.4)
  //     Healer#33513C h138  painted 138 -> measured 123.1 (deficit 14.9)
  //     Sword #6B2E3A h348  painted 340 -> measured 353.7 (SURPLUS 13.7)
  // So the band is painted at hue + 0.11*hue over 20-200 degrees, and the
  // wine-family accents keep a NEGATIVE rotation (-14, was -8) away from the
  // 0-degree boundary — which is also what holds their antialias fringe against
  // gold-lit grass out of the reserved h5-25 Ember band at the s>0.35 gate.
  // FIX ROUND 2 — the pre-compensation is GONE, and the saturation clamp is
  // now hue-aware.
  //
  // The rotation table above was measured on frames the arena fires' bloom
  // overflow was warming by ~(+45,+25,+7) everywhere (env/flame.js GAIN_MAX);
  // it was correcting for the veil, not for the post chain. Re-measured on the
  // capped build with tools/qp-ring2.mjs, the pre-compensated bands came out
  // Healer 154 vs accent 138 and Archer 67 vs 72 — the compensation itself was
  // now the error. `exactColor` already inverts ACES + the grade exactly, so
  // the band is authored at the accent's OWN hue and renders there.
  //
  // Saturation: §17 wants the class accent, and the advisory's note is that a
  // hue-correct-but-washed band still reads pastel ("pastel pink rather than
  // wine"). So a band whose hue sits clear of every reserved analyzer band
  // (Ember h5-25, Bright Heal h110-150, God-stuff h245-285, all gated at
  // s > 0.35) now carries a real chroma; a band inside or within 10 degrees of
  // one stays under the gate so a ring can never be counted as heal output or
  // as an enemy telegraph. Healer Sage (h138) and Tank (h30, ten degrees off
  // the Ember ceiling) take the low clamp; Swordsman wine (h348) and Archer
  // olive (h72) take the high one.
  const deg = hsl.h * 360;
  const near = (lo, hi) => deg >= lo - 10 && deg <= hi + 10;
  const heal = near(110, 150);
  const reserved = near(5, 25) || heal || near(245, 285);

  // FIX ROUND 2b — CHROMA IS HUE ARMOUR, and only the Healer needed armour.
  //
  // Nothing drawn before UnrealBloomPass is bloom-exempt, and the party's own
  // lit bodies bloom: attributed on one frozen frame with tools/xe-ringwho.js,
  // hiding the Healer's garment `panel` alone moved her band's mean rgb from
  // (133,176,142) to (126,173,139) and hiding every mesh drawn after the band
  // put it exactly on (124,172,138) = the authored h137.5, WITH BLOOM STILL ON.
  // So the veil landing on a ring is a small warm addition of about
  // (+9,+4,+4) — and how many DEGREES that costs depends entirely on how much
  // absolute chroma the band has to start with. For a green-max band the hue
  // is 120 + 60*(b-r)/d, so the rotation from a fixed (dr, db) shrinks like
  // 1/d. Measured per class on the arena's own frames:
  //     Swordsman wine  d 93  -> 348.9-351.0 vs 348.2  (<= 1.6 deg)
  //     Archer olive    d 93  ->  71.7- 72.3 vs  72.2  (<= 0.5 deg)
  //     Tank ochre      d 39  ->  30.0- 30.2 vs  30.0  (<= 0.2 deg: a WARM
  //                                band, and the veil is warm, so it moves
  //                                along the band's own axis, not across it)
  //     Healer sage     d 48  -> 125.3-135.1 vs 138.0  (up to 12.7 deg)
  // Only the cool low-chroma band drifts, so only it is re-authored — in HSV,
  // which is the space the frame analyzer actually gates on. HSL trades chroma
  // away as lightness rises (HSL 138/0.24/0.70 gives d 37, WORSE than the
  // shipped d 48); HSV holds saturation while value buys absolute chroma, so
  // HSV(138, 0.34, 0.845) lands d 73 (+52%) and cuts the same veil to ~3 deg.
  // The 0.34 is the ceiling that matters: the analyzer counts Bright Heal at
  // h110-150 AND s > 0.35, and this band's pixels measure ~0.32 on screen, so
  // a Healer ring still cannot be counted as heal output. The Tank keeps the
  // old low clamp deliberately — h30 sits ten degrees off the Ember ceiling,
  // its band is provably stable at 0.2 deg, and giving it chroma would push
  // its antialias fringe against gold-lit grass INTO the h5-25 danger band
  // that criterion 1 reserves for enemy threats.
  if (heal) {
    // FIX ROUND 2 measured this ceiling again and left it alone. Raising it
    // to 0.40 was tried against the one arc that still drifts (variant 3's
    // Healer E arc, band core h123.8-125.3 against her 138.0 accent): the
    // authored chroma went g-min 68 -> 80 and that arc moved 125.3 -> 123.8,
    // i.e. not at all, because the addition landing on it grew with it. The
    // drift there is bloom, not chroma starvation, so the 0.34 that keeps the
    // band under the analyzer's h110-150 / s>0.35 gate is kept.
    const sv = 0.34;
    const vv = 0.845; // just under the underBloom() ceiling; see groundRing
    const l = vv * (1 - sv / 2);
    const sl = (vv - l) / Math.min(l, 1 - l);
    return new Color().setHSL(hsl.h, sl, l, SRGBColorSpace).getHex();
  }
  const sat = reserved
    ? Math.min(0.24, Math.max(0.18, hsl.s))
    : Math.min(0.40, Math.max(0.30, hsl.s * 1.6));
  // Reserved-hue bands buy back in VALUE what they give up in chroma: at HSL
  // L 0.58 the Tank's band measures ~1.7x the adjacent ground luma (the §17
  // legibility ratio) while its HSV saturation drops to ~0.23, well under the
  // analyzer's 0.35 reserved-hue gate.
  const light = reserved ? 0.58 : 0.54;
  return new Color().setHSL(hsl.h, sat, light, SRGBColorSpace).getHex();
}

// Additive halo shaped like the ring, peaking over the bright core and dying
// out before the exact-accent stroke (so the stroke stays measurable). This is
// what turns the ring from "a painted band" into "a light on the floor" and
// carries the bloom bleed that makes it survive at play distance.
let ringGlowTex = null;
function getRingGlowTexture() {
  if (ringGlowTex) return ringGlowTex;
  const A = (a) => `rgba(255,255,255,${a})`;
  // Peak at 0.68 of ITS OWN radius, dead by 0.76: with the glow plane scaled
  // 1.162x the band plane, that puts the peak over the bright core (band 0.79)
  // and zero before the exact-accent stroke (band 0.898), so the stroke's
  // measured hex can never be lifted off-palette by its own ring's halo.
  // Re-aimed for the widened band (fix round 2). In glow-plane fractions the
  // inner ink now ends at 0.546, the band spans 0.546-0.736 and the outer ink
  // starts at 0.736, so the halo is zero until 0.545, peaks at 0.635 (band
  // centre) and is dead by 0.735. It can neither wash the inner stroke — which
  // is one of the two legibility rims — nor lift the outer one off-hue.
  // ROUND D re-aim. With the band + both ink strokes now composited AFTER
  // bloom (see the overlay pass above), the old halo — which peaked under the
  // band at 0.635 and died at 0.735 — was drawn entirely UNDER an opaque ring
  // and could no longer be seen at all. The halo's job (§19.3 "every light
  // emitter carries a glow"; the ring reading as light on the floor rather
  // than a sticker) now happens OUTSIDE the ring: it holds a broad plateau
  // under the ring (still feeding bloom with a NEUTRAL white, which is what
  // keeps warm-lit party pixels off the analyzer's s>0.35 danger gate) and
  // feathers out past the outer ink stroke, which at glowHalf = 1.34x the
  // band plane sits at 0.98 / 1.34 = 0.731 of this texture's radius.
  ringGlowTex = radialTexture([
    [0.0, A(0.0)],
    [0.30, A(0.30)],
    [0.58, A(0.92)],
    [0.70, A(1.0)],
    [0.86, A(0.30)],
    [0.95, A(0.06)],
    [1.0, A(0.0)],
  ]);
  return ringGlowTex;
}

let shadowTex = null;
// Exported (certification fix round 1): every contact shadow in the game must
// use THIS ramp — solid to a third of the radius, feathered only at the edge.
// The bloom-halo ramp from render/glow.js is already down to 0.16 alpha by 60%
// of its radius, so a "0.7 opacity" shadow built on it is ~90% transparent over
// most of its area, which is how projectile and boss shadows measured absent.
export function getShadowTexture() {
  if (shadowTex) return shadowTex;
  const A = (a) => `rgba(255,255,255,${a})`;
  shadowTex = radialTexture([
    [0.0, A(1.0)],
    [0.34, A(0.86)],
    [0.62, A(0.4)],
    [0.85, A(0.08)],
    [1.0, A(0.0)],
  ]);
  return shadowTex;
}

// Value-lifted derivative of a class accent: same hue, pushed to a near-white
// pastel. Saturation is deliberately taken DOWN as lightness goes up — a
// lifted-and-saturated Sage would land inside the Bright Heal reserved band
// (hue 133, sat >0.35) and a lifted Swordsman wine inside Ember Danger.
// Pastels sit under the analyzer's 0.35 saturation gate, so no ring can ever
// contaminate a reserved hue count.
// L/S chosen against measured pixels, not taste: L 0.85 puts the band at
// display luma 205-233 (about 2.1x the Act-1 floor) while S 0.52 keeps a
// visible class tint whose HSV saturation lands ~0.21-0.26 — under the frame
// analyzer's 0.35 reserved-hue gate, so a lifted Sage ring can never be
// counted as Bright Heal, nor a lifted wine ring as Ember Danger. `underBloom`
// then caps whichever hue lands hottest (olive) below the bloom threshold.
export function liftAccent(hex, lightness = 0.85, sat = 0.52) {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(hex).getHSL(hsl, SRGBColorSpace);
  return new Color().setHSL(hsl.h, sat, lightness, SRGBColorSpace).getHex();
}

// Clamp an AUTHORED (pre-tonemap, linear) colour to just under the composer's
// bloom threshold. The identity ring has to be the brightest thing on the floor
// WITHOUT becoming an emitter: the first attempt at this fix authored the core
// above the threshold and UnrealBloomPass washed the entire frame white, taking
// every class hue with it.
export function underBloom(color, headroom = 0.92) {
  const cap = BLOOM.threshold * headroom;
  const lum = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  if (lum > cap) color.multiplyScalar(cap / lum);
  return color;
}

// ---------------------------------------------------------------------------
// §17 IDENTITY-RING LIGHTING EXEMPTION  (Round D fix 2)
//
// §17 Zone 3 binds identity rings to "class-accent hex, constant opacity,
// EXEMPT FROM ALL PALETTE/LIGHTING SHIFTS". Round D first shipped that
// exemption as a compositor pass inserted AFTER UnrealBloomPass, and that was
// the wrong instrument: post-bloom, the only depth such a pass can test
// against is OPAQUE scene depth, so the ring got painted over every
// TRANSPARENT thing it overlapped — including the enemy Ember telegraph decal,
// which §19.4 deliberately puts ABOVE friendly ground VFX and which §11
// requires legible for >=0.7 s. Measured on one frozen frame with a mantis
// telegraph live, shipped vs the four band materials hidden, the reserved
// h5-25 count read 515 vs 872 px on variant 1 (-41%), 594 vs 673 on variant 2,
// 597 vs 817 on variant 3 — the rings were erasing 12-41% of the danger cue on
// every telegraphed attack, and since every enemy targets the NEAREST party
// member (§11) the decal is always centred on a ring.
//
// The exemption never needed z-order supremacy, because both things that were
// landing on the band after it drew are gone at their source:
//
//   * the additive brazier/lantern ground pools (src/scenes/arena.js
//     groundPool) sort at ORDER.pool = -12 — they draw BEFORE the band at
//     renderOrder -1 and so cannot add into it; and
//   * the fires' bloom skirt, which src/env/flame.js now caps at GAIN_MAX 0.96
//     so only the near-neutral (sat 0.13) white core clears the 0.68
//     threshold. An equal addition to all three channels cannot rotate a hue.
//
// So the band is just an UNLIT ShaderMaterial sitting at its authored place in
// the ground-decal stack: above the environment pools and contact shadows,
// below the character mass that occludes it, and far below the telegraph
// group at renderOrder 2. Measured per arc with the pass removed
// (tools/xe-ringarc.js) the pool-facing and away arcs agree to a fraction of a
// degree on all four classes. History: docs/critiques/polish-roundC.md F1/F2.
// Identity ring (§17 Zone 3): concentric ground ellipse — a hue-true class-
// accent band between two Void Charcoal ink strokes (see the RING note above:
// the strokes carry legibility, the band carries the class hue). DEPTH-TESTED
// decal at y=0.012 with
// depthWrite off and a negative renderOrder: it can never paint over the
// character standing in it, but two overlapping party members' rings still
// blend on the floor between them.
//
// Returns a Group whose `userData.setDesat(t)` lerps every band toward Bone
// (§19.1: Bone #C9C2B3 is the "downed/neutral ring" colour) on the same curve
// that desaturates the body.
export function groundRing(accentHex, radius) {
  const group = new Group();
  group.name = 'identity-ring';

  // Strokes are cool-dark ink (INK_COOL — the §17 legibility fallback: >=2px
  // dark rim, indigo-biased so its blends with warm-lit ground never land in
  // the reserved danger band); the band is the hue-true value-lifted accent.
  // Downed: the band goes to Bone (§19.1 "downed/neutral rings"), strokes ink.
  const rim = exactColor(INK_COOL);
  const core = underBloom(exactColor(ringBand(accentHex)));
  const acc = exactColor(INK_COOL);
  const downRim = exactColor(INK_COOL);
  const downCore = exactColor(PALETTE.bone);
  const downAcc = exactColor(INK_COOL);

  const uniforms = {
    uRim: { value: rim.clone() },
    uCore: { value: core.clone() },
    uAcc: { value: acc.clone() },
    // xy = inner-stroke in/out, zw = band in/out
    uBandA: { value: new Vector4(RING.inkInA, RING.inkOutA, RING.bandIn, RING.bandOut) },
    // xy = outer-stroke in/out
    uBandB: { value: new Vector2(RING.inkInB, RING.inkOutB) },
  };
  const mat = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    // The bands are evaluated PROCEDURALLY from the fragment's radius, not
    // sampled from a mask texture. A texture mask is minified hard at the front
    // of the ellipse (one screen pixel covers ~4 texels there), so its mip
    // filter blended the 220-luma core into the exact-accent stroke and the
    // Swordsman's ring measured #6C303B instead of #6B2E3A. Solving the bands
    // in the shader with an fwidth-sized antialias keeps every band's interior
    // pixel-exact at any zoom and any camera elevation, which is what §17's
    // "the exact class-accent hex" actually requires.
    fragmentShader: /* glsl */ `
      uniform vec3 uRim;
      uniform vec3 uCore;
      uniform vec3 uAcc;
      uniform vec4 uBandA;
      uniform vec2 uBandB;
      varying vec2 vUv;
      float band( float r, float w, float lo, float hi ) {
        return smoothstep( lo - w, lo + w, r ) * ( 1.0 - smoothstep( hi - w, hi + w, r ) );
      }
      void main() {
        float r = length( vUv - 0.5 ) * 2.0;
        float w = max( fwidth( r ) * 0.45, 0.0010 );
        float mr = band( r, w, uBandA.x, uBandA.y );
        float mc = band( r, w, uBandA.z, uBandA.w );
        float ma = band( r, w, uBandB.x, uBandB.y );
        float a = clamp( mr + mc + ma, 0.0, 1.0 );
        if ( a < 0.004 ) discard;
        vec3 c = ( uRim * mr + uCore * mc + uAcc * ma ) / max( a, 1e-4 );
        gl_FragColor = vec4( c, a );
      }
    `,
  });
  // Plane sized so the outermost band lands exactly on `radius`.
  const half = radius / RING.outer;
  const band = new Mesh(sharedGeo(`ring-plane:${half}`, () => new PlaneGeometry(half * 2, half * 2)), mat);
  band.rotation.x = -Math.PI / 2;
  band.position.y = 0.012;
  // renderOrder -1: AFTER the environment ground stack (pools ORDER.pool
  // -12, contact shadows -8/-2) so nothing warm can add into the band, and
  // FAR BELOW the `telegraph` group's 2 — §19.4's z-order, restored.
  band.renderOrder = -1;
  group.add(band);

  // Additive halo under the core band (rendered BEFORE it, so the opaque
  // exact-accent stroke is never lifted off-hex by its own ring).
  // The halo's ADDITION is desaturated almost all the way to parchment (0.86).
  // Measured by hiding layers on the same frame: with everything else
  // unchanged the arena's reserved Ember-band count went 539 px (as shipped)
  // -> 241 px (halos hidden) -> 72 px (whole rings hidden). The four ring
  // HALOS were the single largest contributor in the frame — an additive tint
  // that still carries an accent (the Swordsman's wine especially) lands
  // h5-20 wherever it feathers over warm-lit grass. The class hue is the
  // BAND's job; the halo only has to say "there is a light on the floor here",
  // so it is now essentially cream. Same brightness, same read.
  // ...and 0.86 toward Parchment was still not enough, because PARCHMENT
  // ITSELF is a warm white (#F4EFE6, r/b = 1.06) and `exactColor` inverts the
  // post chain, which warms the linear value further. Re-measured by layer on
  // one frame: base 785 px in the reserved band, 129 px with the four halos
  // hidden. So the halo addition is NEUTRAL — a plain white light, no accent
  // at all. An additive neutral over grass raises every channel together and
  // cannot rotate the ground's hue; the class identity is the BAND's job and
  // the band is measurably on-hex (within 2-11 degrees of every accent).
  const glowTint = new Color(1, 1, 1);
  const glowMat = new MeshBasicMaterial({
    map: getRingGlowTexture(),
    color: glowTint.clone().multiplyScalar(0.24),
    toneMapped: false,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const glowHalf = half * 1.10; // peak under the band, a thin spill past the outer ink
  const glow = new Mesh(sharedGeo(`ring-glow-plane:${glowHalf}`, () => new PlaneGeometry(glowHalf * 2, glowHalf * 2)), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.011;
  glow.renderOrder = -2;
  group.add(glow);

  let last = -1;
  group.userData.setDesat = (t) => {
    if (Math.abs(t - last) < 0.004) return;
    last = t;
    uniforms.uRim.value.copy(rim).lerp(downRim, t);
    uniforms.uCore.value.copy(core).lerp(downCore, t);
    uniforms.uAcc.value.copy(acc).lerp(downAcc, t);
    // Downed rings keep the same neutral halo (the state reads from the band
    // going Bone and the pose collapsing, never from the halo's hue).
    glowMat.color.setRGB(0.3, 0.3, 0.3);
  };
  return group;
}

// Soft contact shadow (§19.2) — same decal rules, sorted below the ring.
// Deep-indigo dark (the env prop-shadow family), not warm charcoal: a warm
// dark feathering over warm-lit grass is another danger-band gradient.
// `opts.forward` pushes the disc toward the camera (+z) and `opts.wide` /
// `opts.deep` shape it into an ellipse. Certification fix round 2: at the §1
// 52-degree elevation a body stands IN FRONT OF its own footprint on screen, so
// a disc centred under the feet renders almost entirely behind the body and
// measures as absent — round 2 found the boar's belly only 8-16% darker than
// open ground, and the Stag needed the same offset in round 1. A shadow that
// peeks out past the near edge of the body is the one the camera can see.
export function groundShadow(radius, opacity = 0.34, opts = {}) {
  const { forward = 0, wide = 1, deep = 1 } = opts;
  const mat = new MeshBasicMaterial({
    map: getShadowTexture(),
    color: exactColor('#141B29'),
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  // One disc per radius for the whole game (F1): a contact shadow is the one
  // mesh EVERY entity carries, so a fresh CircleGeometry per rig was a
  // geometry per spawned enemy, per projectile and per bolt.
  const mesh = new Mesh(
    sharedGeo(`shadow-disc:${radius}`, () => new CircleGeometry(radius, 28)),
    mat
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.008, forward);
  mesh.scale.set(wide, deep, 1); // local y maps to world z after the flat rotation
  mesh.renderOrder = -2;
  mesh.name = 'contact-shadow';
  return mesh;
}

// ---------------------------------------------------------------------------
// Swing smear — the attack's "this was an event" layer (REFERENCE_BAR check 10)
// ---------------------------------------------------------------------------
// An annulus sector swept along the blade's arc: opaque at the leading edge
// (where the blade is now), fading to nothing at the trailing edge, with a soft
// radial falloff so it reads as motion and not as a plate. Additive, unlit, and
// authored in Parchment/Bone so it can never be mistaken for Ember Danger.
export function makeSwingSmear({ innerR = 0.12, outerR = 0.5, span = 1.5, color = PALETTE.parchment, segments = 24 } = {}) {
  const pos = new Float32Array((segments + 1) * 2 * 3);
  const fade = new Float32Array((segments + 1) * 2);
  const side = new Float32Array((segments + 1) * 2);
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = -span * (1 - t); // leading edge (t=1) at angle 0
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (let j = 0; j < 2; j++) {
      const r = j === 0 ? innerR : outerR;
      const k = (i * 2 + j) * 3;
      pos[k] = c * r;
      pos[k + 1] = s * r;
      pos[k + 2] = 0;
      fade[i * 2 + j] = t;
      side[i * 2 + j] = j;
    }
    if (i < segments) {
      const b = i * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aFade', new BufferAttribute(fade, 1));
  geo.setAttribute('aSide', new BufferAttribute(side, 1));
  geo.setIndex(idx);
  const mat = new ShaderMaterial({
    uniforms: {
      uColor: { value: exactColor(color) },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aFade;
      attribute float aSide;
      varying float vFade;
      varying float vSide;
      void main() {
        vFade = aFade;
        vSide = aSide;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      varying float vSide;
      void main() {
        float tail = pow( vFade, 2.0 );          // fades back along the arc
        float band = 1.0 - abs( vSide * 2.0 - 1.0 ) * 0.55; // soft radial edges
        gl_FragColor = vec4( uColor, tail * band * uOpacity );
      }
    `,
  });
  const mesh = new Mesh(geo, mat);
  mesh.name = 'swing-smear';
  mesh.renderOrder = 4;
  mesh.visible = false;
  return mesh;
}
