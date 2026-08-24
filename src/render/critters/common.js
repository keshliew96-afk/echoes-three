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

// --- Contact shadow: soft dark blob under every entity (§19.2). Kept small
// and light on purpose — a wide dark disc filling the identity ring turned the
// pair into a "dinner plate" (dark well + bright rim) under the low gallery
// camera; leaving plain ground between shadow and ring keeps the ring reading
// as a marker drawn ON the floor.
export function blobShadow(radius, opacity = 0.26) {
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

// --- Identity ring: a band in the EXACT class-accent hex, INKED ON BOTH EDGES
// with Void Charcoal, over a faint interior wash — a marker drawn on the floor
// in the same storybook ink language as the character outlines. toneMapped
// false keeps the hex from being lifted; a depthTest:false overlay keeps it
// visible when characters overlap (§17 Zone 3).
//
// The double ink edge exists because an accent band alone is not enough: the
// Tank accent #6B6157 is a low-chroma warm grey that lands within ~10% value of
// both the contact shadow and typical ground, so its ring read as a mud puddle
// rather than a marker (pixel-probed in captures/crit5-idle.png and
// crit5-overlap.png). Ink at ~12% luminance separates the band from ANY ground
// value while the identifying hue stays exactly the class accent.
//
// A Bone/Parchment highlight rim (the other contrast option) was built and
// rejected on captures: a bright complete ellipse around a darker interior
// turned every ring into a dinner plate with the critter sitting in it —
// worst on the Tank, whose coat is the same warm grey as its accent.
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

// Ink stops are near-black in the texture, so the material tint (the class
// accent) only ever darkens them further — one texture carries both the
// tintable band and its untintable-in-practice ink edges.
const INK = (a) => `rgba(18,16,14,${a})`;
const ACC = (a) => `rgba(255,255,255,${a})`;

let accentTex = null;
function getAccentTexture() {
  if (accentTex) return accentTex;
  // Radii are fractions of the ring's half-size: faint wash -> inner ink edge
  // -> accent band -> outer ink edge -> soft fade. The band sits far out so it
  // circles AROUND the bell cloak instead of crossing the body — ring radii are
  // sized so cloakHalfWidth stays under ~0.72 * radius.
  accentTex = radialTexture([
    [0.0, ACC(0.05)],
    [0.6, ACC(0.07)],
    [0.645, ACC(0.08)],
    [0.672, INK(0.82)],
    [0.696, INK(0.82)],
    [0.72, ACC(1.0)],
    [0.848, ACC(1.0)],
    [0.871, INK(0.88)],
    [0.897, INK(0.82)],
    [0.928, INK(0.14)],
    [0.965, INK(0)],
  ]);
  return accentTex;
}

// Two layers. The depth-tested base lets the far arc hide behind the critter's
// OWN body (a single depthTest:false ring painted a full-strength "bowl" across
// the squat Tank — verified in capture); the faint depth-ignoring overlay keeps
// every ring readable when critters overlap or walls occlude them (§17 Zone 3:
// visible under occlusion, constant opacity).
export function identityRing(accentHex, radius) {
  const geo = new PlaneGeometry(radius * 2, radius * 2);
  const group = new Group();
  const layer = (opacity, depthTest, y, order) => {
    const m = new Mesh(
      geo,
      new MeshBasicMaterial({
        map: getAccentTexture(),
        color: new Color(accentHex),
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest,
        toneMapped: false, // exact class-accent hex, exempt from palette shifts
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.renderOrder = order;
    group.add(m);
  };
  layer(1.0, true, 0.01, 2);
  layer(0.34, false, 0.012, 6);
  return group;
}
