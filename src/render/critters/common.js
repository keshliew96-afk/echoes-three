// Shared chibi-critter builders (BUILD_BRIEF §19.2): lathe bell profiles,
// party-exclusive eye treatment (big dark low-set bean eyes + white glint),
// mitten paws, blob contact shadow, and the soft class-accent identity ring
// (§17 Zone 3: constant opacity, exempt from lighting, visible under
// occlusion). Geometries for repeated small parts are module-cached and shared
// across all four critters (the render-side instancing economy for characters;
// InstancedMesh stays for grass/prop counts in the env block).
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { getRadialTexture } from '../glow.js';

// --- Color helpers (all critter tints are derived from palette anchors —
// no invented hexes; class accents come in verbatim via CLASS_ACCENTS).
export function mix(hexA, hexB, t) {
  return new Color(hexA).lerp(new Color(hexB), t);
}

// Downed desaturation target (§10): the accent's grey (luminance) pulled
// toward Void Charcoal — "accent desaturates toward charcoal".
export function desatTarget(color) {
  const l = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  return new Color(l, l, l).lerp(new Color(PALETTE.voidCharcoal), 0.55);
}

// --- Cached small-part geometry (shared across every critter instance).
const cache = new Map();
export function cachedSphere(key, r, w = 18, h = 14) {
  if (!cache.has(key)) cache.set(key, new SphereGeometry(r, w, h));
  return cache.get(key);
}

// --- Lathe bell profile: point pairs [radius, y] bottom -> top.
export function bell(pointPairs, segments = 30) {
  return new LatheGeometry(
    pointPairs.map(([x, y]) => new Vector2(x, y)),
    segments
  );
}

// Flat ink material (eyes, noses): never toon-banded, never tone-lifted —
// reads as pure storybook ink like the outlines.
let inkMat = null;
export function getInkMaterial() {
  if (!inkMat) {
    inkMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  }
  return inkMat;
}
let glintMat = null;
export function getGlintMaterial() {
  if (!glintMat) glintMat = new MeshBasicMaterial({ color: new Color('#FFFFFF'), toneMapped: false });
  return glintMat;
}

// --- Eyes (§19.2, party-exclusive): large dark bean eyes set in the LOWER
// two-thirds of the head + tiny white glint. headGroup's origin must be the
// head sphere's center; rx/ry/rz are the head's scaled radii.
export function addEyes(headGroup, { rx, ry, rz, eyeR = 0.058, azimuthDeg = 24, dropDeg = 18 }) {
  const az = (azimuthDeg * Math.PI) / 180;
  const drop = (dropDeg * Math.PI) / 180;
  const eyeGeo = cachedSphere('eye', 1, 16, 12); // unit sphere, scaled per use
  const glintGeo = cachedSphere('glint', 1, 8, 6);
  for (const side of [-1, 1]) {
    // Unit direction low-front on the head sphere, then mapped through the
    // head's per-axis radii so eyes hug any squash/stretch of the skull.
    const ux = Math.sin(az) * Math.cos(drop) * side;
    const uy = -Math.sin(drop);
    const uz = Math.cos(az) * Math.cos(drop);
    const eye = new Mesh(eyeGeo, getInkMaterial());
    eye.scale.set(eyeR, eyeR * 1.3, eyeR * 0.55);
    eye.position.set(ux * rx, uy * ry, uz * rz);
    eye.lookAt(ux * rx * 2, uy * ry * 2, uz * rz * 2); // flatten along the outward normal
    headGroup.add(eye);
    const glint = new Mesh(glintGeo, getGlintMaterial());
    glint.scale.setScalar(0.018);
    glint.position.set(
      ux * rx - side * eyeR * 0.28,
      uy * ry + eyeR * 0.45,
      uz * rz + eyeR * 0.42
    );
    headGroup.add(glint);
  }
}

// Mitten paw (§19.2: single rounded spheres, no digits).
export function mitten(color, r = 0.055) {
  const m = new Mesh(cachedSphere('paw', 1, 14, 10), toonMaterial({ color }));
  m.scale.setScalar(r);
  return m;
}

// --- Contact shadow: soft dark blob under every entity (§19.2).
export function blobShadow(radius, opacity = 0.33) {
  const mat = new MeshBasicMaterial({
    map: getRadialTexture(),
    color: new Color('#000000'),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const blob = new Mesh(new CircleGeometry(radius, 24), mat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.006;
  return blob;
}

// --- Identity ring: soft-edged annulus texture (faint interior fill + strong
// rim) so it reads as a "soft ground ellipse" under the 3/4 camera, in the
// EXACT class-accent hex (toneMapped:false keeps the hex from being lifted by
// the grade). depthTest:false + a high renderOrder keep it visible when
// characters overlap (§17: visible under occlusion, constant opacity).
let ringTexture = null;
function getRingTexture() {
  if (ringTexture) return ringTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  // White rim = the exact accent hex after the material tint; the soft dark
  // outer stop tints to a faint charcoal ink edge, so even a grey accent
  // (Tank #6B6157) separates from any ground tone — same ink language as the
  // character outlines. (Verified: without it the Tank ring vanished on the
  // neutral gallery ground.) The rim band sits far out (0.72+) so it circles
  // AROUND the bell cloak instead of crossing the body silhouette — critter
  // ring radii are sized so cloakHalfWidth < 0.75 * radius.
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.13)');
  grad.addColorStop(0.72, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.86, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.93, 'rgba(24,22,19,0.5)');
  grad.addColorStop(1.0, 'rgba(24,22,19,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ringTexture = new CanvasTexture(canvas);
  ringTexture.colorSpace = SRGBColorSpace;
  return ringTexture;
}

// Two layers: a depth-tested base ring (so the rim's far arc hides behind
// the critter's OWN body instead of painting a band across it — a single
// depthTest:false ring drew a full-strength "bowl" over the squat Tank,
// verified in capture) + a faint depth-ignoring overlay that keeps every
// ring readable when critters overlap or walls occlude them (§17 Zone 3).
export function identityRing(accentHex, radius) {
  const geo = new PlaneGeometry(radius * 2, radius * 2);
  const group = new Group();
  const base = new Mesh(
    geo,
    new MeshBasicMaterial({
      map: getRingTexture(),
      color: new Color(accentHex),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false, // exact class-accent hex, exempt from palette shifts
    })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.01;
  base.renderOrder = 2;
  group.add(base);
  const overlay = new Mesh(
    geo,
    new MeshBasicMaterial({
      map: getRingTexture(),
      color: new Color(accentHex),
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      depthTest: false, // survives occlusion by other critters/walls
      toneMapped: false,
    })
  );
  overlay.rotation.x = -Math.PI / 2;
  overlay.position.y = 0.012;
  overlay.renderOrder = 6;
  group.add(overlay);
  return group;
}
