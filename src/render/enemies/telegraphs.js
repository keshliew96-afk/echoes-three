// Telegraph decals (BUILD_BRIEF §11): the Ember Danger ground decal + hazard
// chevron under every telegraphed enemy attack (opacity pulse 2 Hz — §19.1
// colourblind fence: telegraphs PULSE, never shimmer; danger is decal +
// chevron, never colour alone), and the violet spawn shimmer (0.8 s, §11 —
// violet because a spawn IS corruption arriving, never Ember).
//
// The Ember decal is normal-blended (an additive red over a green floor would
// hue-shift toward yellow and out of the analyzer's danger band); its texture
// is alpha-only and the material carries the post-chain-exact Ember so the
// measured pixels land on #FF5A36.
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
import { EMBER_EXACT, TELL_VIOLET } from './style.js';
import { exactColor } from '../critters/common.js';

// §11: opacity pulse 2 Hz (also under the §17 "<=3 Hz" Zone-3 ceiling).
export const PULSE_HZ = 2;
// Scaffold sizes (render-only): impact zone sized to shot + target footprint.
const DECAL_RADIUS = 0.55;
const CHEVRON_SIZE = 0.5;

function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// Impact-zone decal: hard outer ring + thin fill + hot centre dot. Round-1
// certification read this as "one thin red-orange arc ... no scorched core and
// no embers" against reference D's "dark scorched core + bright glowing red
// rim ring" (REFERENCE_BAR check 5). The Ember layer's fill is thinner now so
// the SCORCH layer below it (getScorchCoreTexture, a separate dark disc) is
// what the eye reads inside the ring, and the rim is heavier so the ring
// itself survives a body standing on top of it.
let impactTex = null;
function getImpactTexture() {
  if (impactTex) return impactTex;
  impactTex = canvasTexture((ctx, S) => {
    const c = S / 2;
    const A = (a) => `rgba(255,255,255,${a})`;
    ctx.fillStyle = A(0.13); // thin Ember wash over the scorched core
    ctx.beginPath();
    ctx.arc(c, c, S * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = A(1); // bright rim ring
    ctx.lineWidth = S * 0.075;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.435, 0, Math.PI * 2);
    ctx.stroke();
    // Hazard ticks around the rim (§19.1 fence: never colour alone).
    ctx.strokeStyle = A(0.95);
    ctx.lineWidth = S * 0.03;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 + 0.26;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0) * S * 0.35, c + Math.sin(a0) * S * 0.35);
      ctx.lineTo(c + Math.cos(a0) * S * 0.47, c + Math.sin(a0) * S * 0.47);
      ctx.stroke();
    }
    ctx.fillStyle = A(0.95); // hot centre dot
    ctx.beginPath();
    ctx.arc(c, c, S * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });
  return impactTex;
}

// The SCORCHED CORE the reference telegraph is built on: a dark burnt disc
// with radial cracks, drawn UNDER the Ember ring so the zone reads as ground
// that is about to be hit rather than as a red sticker on grass.
let coreTex = null;
function getScorchCoreTexture() {
  if (coreTex) return coreTex;
  coreTex = canvasTexture((ctx, S) => {
    const c = S / 2;
    const g = ctx.createRadialGradient(c, c, S * 0.03, c, c, S * 0.44);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a0 = (i / 9) * Math.PI * 2 + 0.4;
      ctx.lineWidth = S * (0.012 + 0.01 * ((i % 2)));
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0) * S * 0.04, c + Math.sin(a0) * S * 0.04);
      ctx.lineTo(c + Math.cos(a0 + 0.16) * S * 0.38, c + Math.sin(a0 + 0.16) * S * 0.38);
      ctx.stroke();
    }
  });
  return coreTex;
}

// Hazard chevron: double arrow pointing +X (rotated onto the shot lane).
let chevronTex = null;
function getChevronTexture() {
  if (chevronTex) return chevronTex;
  chevronTex = canvasTexture((ctx, S) => {
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = S * 0.11;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const ox of [0.18, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(S * ox, S * 0.16);
      ctx.lineTo(S * (ox + 0.3), S * 0.5);
      ctx.lineTo(S * ox, S * 0.84);
      ctx.stroke();
    }
  }, 128);
  return chevronTex;
}

function flatDecal(tex, color, size, y, renderOrder) {
  const mesh = new Mesh(
    // One quad per authored size for the whole game (F1): a telegraph is built
    // and thrown away on every enemy wind-up, so a fresh PlaneGeometry here was
    // three leaked geometries per telegraph.
    sharedGeo(`decal-quad:${size}`, () => new PlaneGeometry(size, size)),
    new MeshBasicMaterial({
      map: tex,
      color,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = renderOrder;
  return mesh;
}

// One attack telegraph: { group, impact, chevron, setPulse(t), aimAt(...) }.
export function makeAttackTelegraph() {
  const group = new Group();
  group.name = 'telegraph';
  // Layer 1 (bottom): the scorched core — dark, normal-blended, so the zone
  // darkens the ground it sits on instead of tinting it red.
  const core = flatDecal(
    getScorchCoreTexture(),
    exactColor(PALETTE.voidCharcoal),
    DECAL_RADIUS * 2 * 0.98,
    0.019,
    1
  );
  core.material.opacity = 0.5;
  group.add(core);
  // Layer 2: the bright Ember rim + wash.
  const impact = flatDecal(getImpactTexture(), EMBER_EXACT.clone(), DECAL_RADIUS * 2, 0.022, 2);
  group.add(impact);
  const chevron = flatDecal(getChevronTexture(), EMBER_EXACT.clone(), CHEVRON_SIZE, 0.021, 2);
  group.add(chevron);
  // Layer 3: the rim is a LIGHT, not a sticker (§19.3 — every emitter carries
  // an additive glow sprite).
  const halo = makeGlowSprite({ color: PALETTE.emberDanger, size: DECAL_RADIUS * 2.6, opacity: 0.24 });
  halo.material.color.copy(EMBER_EXACT);
  halo.material.toneMapped = false;
  halo.position.y = 0.1;
  group.add(halo);

  return {
    group,
    // impact zone at (x, z); chevron sits on the lane toward the shooter,
    // pointing INTO the impact (the incoming direction reads at a glance).
    aimAt(x, z, fromX, fromZ) {
      group.position.set(x, 0, z);
      const dx = x - fromX;
      const dz = z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      const back = Math.min(1.5, d * 0.6);
      chevron.position.set((-dx / d) * (DECAL_RADIUS + back * 0.75), 0.021, (-dz / d) * (DECAL_RADIUS + back * 0.75));
      // Plane +X (texture arrow) -> world (dx, dz) after the flat rotation.
      chevron.rotation.z = Math.atan2(-dz, dx);
    },
    // §11 2 Hz opacity pulse; the chevron pulses in the same phase. The
    // scorched core does NOT pulse — burnt ground is not a warning light, and
    // holding it steady is what lets the pulsing rim read as the alarm.
    setPulse(tSec) {
      const k = 0.62 + 0.38 * Math.sin(Math.PI * 2 * PULSE_HZ * tSec);
      impact.material.opacity = k;
      chevron.material.opacity = Math.min(1, k + 0.15);
      halo.material.opacity = 0.14 + 0.16 * k;
      core.material.opacity = 0.5;
    },
  };
}

// Violet spawn shimmer (§11: 0.8 s, "violet shimmer, not Ember"): a pulsing
// violet ground sigil + soft additive halo + rising corruption motes.
export function makeSpawnShimmer(cosmetic) {
  const group = new Group();
  group.name = 'spawn-shimmer';
  const sigil = flatDecal(getImpactTexture(), TELL_VIOLET.clone(), 1.1, 0.02, 2);
  group.add(sigil);
  const halo = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 1.4, opacity: 0.45 });
  halo.material.toneMapped = false;
  halo.material.color.copy(TELL_VIOLET);
  halo.position.y = 0.35;
  group.add(halo);
  const motes = [];
  for (let i = 0; i < 4; i++) {
    const m = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.16, opacity: 0.8 });
    m.material.toneMapped = false;
    m.material.color.copy(TELL_VIOLET);
    group.add(m);
    motes.push({
      sprite: m,
      ang: cosmetic.range(0, Math.PI * 2),
      r: cosmetic.range(0.15, 0.42),
      speed: cosmetic.range(0.8, 1.6),
      phase: cosmetic.range(0, 1),
    });
  }

  return {
    group,
    update(tSec) {
      // Telegraphs pulse (§19.1 fence) — a touch faster than attacks so the
      // two cadences read apart.
      const k = 0.55 + 0.45 * Math.sin(Math.PI * 2 * 3 * tSec);
      sigil.material.opacity = 0.5 + 0.35 * k;
      halo.material.opacity = 0.3 + 0.25 * k;
      for (const m of motes) {
        const u = (tSec * m.speed + m.phase) % 1;
        m.sprite.position.set(Math.cos(m.ang) * m.r, 0.1 + u * 0.9, Math.sin(m.ang) * m.r);
        m.sprite.material.opacity = 0.8 * (1 - u);
      }
    },
  };
}

export { DECAL_RADIUS };
