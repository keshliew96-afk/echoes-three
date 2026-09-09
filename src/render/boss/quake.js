// Antler Quake telegraph ring (BUILD_BRIEF §11 boss primary + §11 telegraph
// grammar + REFERENCE_BAR reference D: "large AoE telegraph = dark scorched
// core + bright glowing red rim ring").
//
// Radius 1.6 u Ember Danger ground decal at the locked impact point, visible
// for the full 0.7 s warning, opacity pulse 2 Hz (§11; also under the §17
// Zone-3 <=3 Hz ceiling) + hazard chevrons on the rim (§19.1 colourblind
// fence: danger is decal + chevron, never colour alone). A fill sweep winds
// the ring in over the warning window so time-to-impact reads without a
// number, and the resolve leaves a one-shot burst flash.
//
// Normal-blended over the floor with the post-chain-exact Ember, exactly like
// the enemy-block decals — an additive red over green would hue-shift out of
// the analyzer's danger band.
import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { EMBER_EXACT } from '../enemies/style.js';
import { exactColor } from '../critters/common.js';

// Scorched ground: Void Charcoal, post-chain-exact so the burn measures dark.
const SCORCH_DARK = exactColor(PALETTE.voidCharcoal);

export const PULSE_HZ = 2;

function canvasTexture(draw, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

let ringTex = null;
function getRingTexture() {
  if (ringTex) return ringTex;
  ringTex = canvasTexture((ctx, S) => {
    const c = S / 2;
    const A = (a) => `rgba(255,255,255,${a})`;
    // Ember wash over the scorched core below — thin, so the burn reads dark.
    ctx.fillStyle = A(0.1);
    ctx.beginPath();
    ctx.arc(c, c, S * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Bright rim ring.
    ctx.strokeStyle = A(1);
    ctx.lineWidth = S * 0.05;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    // Inner witness ring.
    ctx.strokeStyle = A(0.5);
    ctx.lineWidth = S * 0.018;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    // Cracked-ground spokes: the quake is a ground event.
    ctx.strokeStyle = A(0.42);
    ctx.lineWidth = S * 0.012;
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 + 0.2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0) * S * 0.07, c + Math.sin(a0) * S * 0.07);
      ctx.lineTo(c + Math.cos(a0 + 0.14) * S * 0.4, c + Math.sin(a0 + 0.14) * S * 0.4);
      ctx.stroke();
    }
    // Hazard chevrons on the rim (8, pointing inward).
    ctx.strokeStyle = A(1);
    ctx.lineWidth = S * 0.022;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2;
      const rOut = S * 0.485;
      const rIn = S * 0.4;
      const w = 0.075;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0 - w) * rOut, c + Math.sin(a0 - w) * rOut);
      ctx.lineTo(c + Math.cos(a0) * rIn, c + Math.sin(a0) * rIn);
      ctx.lineTo(c + Math.cos(a0 + w) * rOut, c + Math.sin(a0 + w) * rOut);
      ctx.stroke();
    }
  });
  return ringTex;
}

// Wind-in sweep: the ground BURNING outward as the warning runs out. Round 1
// drew this as a bright orange disc, which (a) contradicted reference D's
// "dark scorched core + bright glowing red rim ring" and (b) flooded the whole
// impact zone — the Stag's contact shadow measured as a 5% dip because it sat
// inside a blown Ember disc that the bloom pass then spread over it. The sweep
// is a DARK scorch now; the bright layer is the rim + the thin ember edge that
// travels with it.
let sweepTex = null;
function getSweepTexture() {
  if (sweepTex) return sweepTex;
  sweepTex = canvasTexture((ctx, S) => {
    const c = S / 2;
    const grad = ctx.createRadialGradient(c, c, S * 0.05, c, c, S * 0.44);
    grad.addColorStop(0, 'rgba(255,255,255,0.92)');
    grad.addColorStop(0.72, 'rgba(255,255,255,0.78)');
    grad.addColorStop(1, 'rgba(255,255,255,0.1)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.43, 0, Math.PI * 2);
    ctx.fill();
    // Cracks: the quake is a ground event, not a paint job.
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2 + 0.25;
      ctx.lineWidth = S * 0.014;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0) * S * 0.04, c + Math.sin(a0) * S * 0.04);
      ctx.lineTo(c + Math.cos(a0 + 0.18) * S * 0.4, c + Math.sin(a0 + 0.18) * S * 0.4);
      ctx.stroke();
    }
  }, 256);
  return sweepTex;
}

// The travelling ember edge of the burn front.
let edgeTex = null;
function getEdgeTexture() {
  if (edgeTex) return edgeTex;
  edgeTex = canvasTexture((ctx, S) => {
    const c = S / 2;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = S * 0.03;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }, 256);
  return edgeTex;
}

// radiusU = §11 ring radius 1.6 u.
export function makeQuakeRing(radiusU = 1.6) {
  const group = new Group();
  group.name = 'antler-quake';

  const ring = new Mesh(
    sharedGeo(`quake-quad:${radiusU}`, () => new PlaneGeometry(radiusU * 2, radiusU * 2)),
    new MeshBasicMaterial({
      map: getRingTexture(),
      color: EMBER_EXACT.clone(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.renderOrder = 2;
  group.add(ring);

  // Burn sweep — a DARK scorch disc scaled from 0 to full over the warning
  // window (reference D's "dark scorched core"), drawn UNDER the Ember rim.
  const sweep = new Mesh(
    sharedGeo(`quake-quad:${radiusU}`, () => new PlaneGeometry(radiusU * 2, radiusU * 2)),
    new MeshBasicMaterial({
      map: getSweepTexture(),
      color: SCORCH_DARK,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    })
  );
  sweep.rotation.x = -Math.PI / 2;
  sweep.position.y = 0.018;
  sweep.renderOrder = 1;
  sweep.scale.set(0.001, 0.001, 1);
  group.add(sweep);

  // ...and the bright ember EDGE that travels with the burn front.
  const edge = new Mesh(
    sharedGeo(`quake-quad:${radiusU}`, () => new PlaneGeometry(radiusU * 2, radiusU * 2)),
    new MeshBasicMaterial({
      map: getEdgeTexture(),
      color: EMBER_EXACT.clone(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    })
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = 0.026;
  edge.renderOrder = 3;
  edge.scale.set(0.001, 0.001, 1);
  group.add(edge);

  // Rim halo so the ring is a light, not a sticker (§19.3).
  const halo = makeGlowSprite({ color: PALETTE.emberDanger, size: radiusU * 2.1, opacity: 0.22 });
  halo.material.color.copy(EMBER_EXACT);
  halo.material.toneMapped = false;
  halo.position.y = 0.12;
  group.add(halo);

  return {
    group,
    at(x, z) {
      group.position.set(x, 0, z);
    },
    // k = 0..1 progress through the 0.7 s warning.
    update(tSec, k) {
      const pulse = 0.72 + 0.28 * Math.sin(tSec * Math.PI * 2 * PULSE_HZ); // 2 Hz
      ring.material.opacity = 0.55 + 0.35 * pulse;
      const s = Math.max(0.001, Math.min(1, k));
      sweep.scale.set(s, s, 1);
      sweep.material.opacity = 0.3 + 0.32 * k; // the burn deepens, it never brightens
      edge.scale.set(s, s, 1);
      edge.material.opacity = 0.55 + 0.4 * pulse;
      halo.material.opacity = 0.16 + 0.22 * pulse * (0.4 + 0.6 * k);
    },
  };
}

// One-shot burst left where a quake resolved: a hot ring that expands and
// fades (core + glow + the ring texture = the >=3 VFX layers of §19.4).
export function makeQuakeBurst(radiusU = 1.6) {
  const group = new Group();
  const disc = new Mesh(
    sharedGeo(`quake-quad:${radiusU}`, () => new PlaneGeometry(radiusU * 2, radiusU * 2)),
    new MeshBasicMaterial({
      map: getRingTexture(),
      color: EMBER_EXACT.clone(),
      transparent: true,
      opacity: 1,
      depthWrite: false,
      toneMapped: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.03;
  disc.renderOrder = 4;
  group.add(disc);
  const flash = makeGlowSprite({ color: PALETTE.parchment, size: radiusU * 1.4, opacity: 0.9 });
  flash.material.toneMapped = false;
  flash.position.y = 0.3;
  group.add(flash);
  const glow = makeGlowSprite({ color: PALETTE.emberDanger, size: radiusU * 2.6, opacity: 0.8 });
  glow.material.color.copy(EMBER_EXACT);
  glow.material.toneMapped = false;
  glow.position.y = 0.2;
  group.add(glow);

  return {
    group,
    at(x, z) {
      group.position.set(x, 0, z);
    },
    // age 0..1 of the burst life
    update(age) {
      const s = 1 + age * 0.5;
      disc.scale.set(s, s, 1);
      disc.material.opacity = Math.max(0, 1 - age);
      flash.material.opacity = Math.max(0, 0.9 - age * 2.4);
      flash.scale.setScalar(radiusU * (1.4 + age * 1.2));
      glow.material.opacity = Math.max(0, 0.8 - age * 1.1);
      glow.scale.setScalar(radiusU * (2.6 + age * 1.4));
    },
  };
}
