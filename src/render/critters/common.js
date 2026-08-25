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
  BackSide,
  BufferAttribute,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../data/palette.js';
import { POST } from '../../core/constants.js';
import { toonMaterial } from '../toon.js';

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

function forwardPost(lin) {
  let c = mat3mul(ACES_IN, lin.map((v) => v / 0.6)).map(rrt);
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
  if (!cache.has(key)) cache.set(key, new SphereGeometry(r, w, h));
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

// Tapered brush tail: one TubeGeometry whose ring radii are scaled down along
// the path and whose vertex colours fade to the light tip. Built as one mesh on
// purpose — a chain of overlapping balls, or a tube plus a separate light cap,
// each carried their own ink and read as a segmented caterpillar / a detached
// cone rather than a fox brush.
export function brushTail(curve, { radius, colorA, colorB, split = 0.55, taper = 0.62, tubular = 28, radial = 12 }) {
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
    const k = 1 - taper * t * t;
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
  return mesh;
}

// ---------------------------------------------------------------------------
// Ink — inverted hull, constant screen-space width
// ---------------------------------------------------------------------------
export const INK_PX = 2.0; // storybook line, measured in PIXELS at any zoom

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
export function addInk(mesh) {
  let geo = mesh.geometry.clone();
  for (const name of Object.keys(geo.attributes)) if (name !== 'position') geo.deleteAttribute(name);
  geo = mergeVertices(geo);
  geo.computeVertexNormals();
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

export function faceDecal({
  R,
  sx = 1,
  sy = 1,
  sz = 1,
  eyeW = 0.098, //   eye radii as a fraction of the canvas
  eyeH = 0.125,
  spread = 0.205, // half the eye separation, fraction of canvas width
  drop = 0.66, //    eye centre, fraction down the patch (lower two-thirds)
  glint = 0.3, //    glint radius as a fraction of the eye radius
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
  const shine = exactHex(PALETTE.parchment);
  for (const side of [-1, 1]) {
    const cx = S * (0.5 + side * spread);
    const cy = S * drop;
    const rx = S * eyeW;
    const ry = S * eyeH;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // Glint: up-LEFT on both eyes (one light direction), sized to survive the
    // gallery/gameplay framing rather than only a closeup.
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.34, cy - ry * 0.4, rx * glint, ry * glint * 1.05, 0, 0, Math.PI * 2);
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

let ringTex = null;
function getRingTexture() {
  if (ringTex) return ringTex;
  // Pure alpha falloff — NO ink edge. The band peaks over 0.70-0.85 of the
  // radius and fades to nothing either side, so the ring reads as a soft light
  // drawn on the floor rather than a hoop the critter is standing inside.
  const A = (a) => `rgba(255,255,255,${a})`;
  // NOTE: no interior fill. An alpha wash across the middle turned the ring
  // into a dark disc under the critter — the Tank's warm-grey accent read as a
  // mud puddle rather than a marker drawn on the floor.
  ringTex = radialTexture([
    [0.0, A(0.0)],
    [0.55, A(0.0)],
    [0.63, A(0.35)],
    [0.72, A(1.0)],
    [0.85, A(1.0)],
    [0.92, A(0.45)],
    [0.985, A(0.0)],
    [1.0, A(0.0)],
  ]);
  return ringTex;
}

let shadowTex = null;
function getShadowTexture() {
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

// Identity ring (§17 Zone 3): soft ground ellipse in the EXACT class-accent hex
// (post-chain compensated), constant opacity, exempt from lighting. It is a
// DEPTH-TESTED decal at y=0.012 with depthWrite off and a negative renderOrder:
// it can never paint over the character standing in it, but two overlapping
// party members' rings still blend on the floor between them.
export function groundRing(accentHex, radius) {
  const mat = new MeshBasicMaterial({
    map: getRingTexture(),
    color: exactColor(accentHex),
    transparent: true,
    // Fully opaque inside the band: at 0.95 the ground bled ~5% through and the
    // sampled ring hex missed the class accent by 4-6 per channel.
    opacity: 1,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new Mesh(new PlaneGeometry(radius * 2, radius * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  mesh.renderOrder = -1;
  mesh.name = 'identity-ring';
  return mesh;
}

// Soft contact shadow (§19.2) — same decal rules, sorted below the ring.
export function groundShadow(radius, opacity = 0.34) {
  const mat = new MeshBasicMaterial({
    map: getShadowTexture(),
    color: exactColor(PALETTE.voidCharcoal),
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const mesh = new Mesh(new CircleGeometry(radius, 28), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.008;
  mesh.renderOrder = -2;
  mesh.name = 'contact-shadow';
  return mesh;
}
