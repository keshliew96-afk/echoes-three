// Skill-delivery VFX (skills block) — the render side of every §6 shape, on
// the §19.4 layering contract: EVERY effect ≥3 layers (core + glow +
// particles) and every physical flier casts a contact shadow.
//
// Color law (§19.1, binding):
//   ALL heal output = Bright Heal #5FE873 — core, glow, motes, "+HP" glyph.
//   Player damage (Spirit Bolt) = parchment-white core + Hearth Amber glow.
//   Never Ember, never violet, and heal green never appears on damage.
//
// Pieces:
//   - heal bursts on every `heal` event: green core flash + glow + rising
//     motes + a rising "+HP" glyph sprite (§17 Zone 3 heal grammar)
//   - skill bolts (sim kind 'skillbolt'): core capsule + glow + trail motes +
//     ground blob shadow, colored by heal/damage; impact flash on despawn
//   - Sanctuary zones (sim kind 'zone'): layered translucent discs + rim ring
//     + drifting motes, tick pulse ring on `zone_tick`
//   - Warding Aura: 0.9 u field ring + soft disc riding the Healer, breathing;
//     bright pulse on every `aura_pulse` (§7: visibly pulse-heals 1/s)
//   - Nova Bloom: expanding ring burst to the 1.4 u area radius
//   - Restorative Wave: 55°-half-angle arc wedge flash on the live aim
//   - direct heals (Swift Mend / Guardian Bond): ground link streak from the
//     caster to each recipient
//   - §8 heal-override mark: Hearth Amber reticle ring + notch glyphs on the
//     overridden party member (color + shape channel, never color alone)
//
// Render-only: reads sim state (entities, positions) read-only, subscribes to
// the event bus, consumes the COSMETIC stream exclusively.
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { SKILLS } from '../../sim/skills.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { exactColor } from '../critters/common.js';

// Cosmetic scaffold tunables (render-only, not brief numbers).
const BOLT_Y = 0.55; // matches the basic bolt's flight height
const TRAIL_FADE = 0.15;
const MOTE_CAP = 240;
const HEAL = PALETTE.brightHeal;
const AMBER = PALETTE.hearthAmber;
const PARCH = PALETTE.parchment;

// ACES cannot render Bright Heal #5FE873 at full value: a saturated green that
// bright needs a NEGATIVE red primary, the solve clamps, and the pixel that
// actually lands is hue 107 with the red channel pinned — which is how a heal
// bolt ended up the same hue as ACT1_GROUND #548C38 (h100) and read only by
// luma. Solved offline against the shipped post chain (tools/zk-solve.mjs),
// 95% of Bright Heal's DISPLAY value is inside the gamut and converges to
// residual 0.0004: it renders as rgb(90,220,109) = hue 128.7, saturation 0.59
// against the palette's hue 128.8 / saturation 0.59. So the heal core gives up
// 5% of value and keeps the colour exactly. Its linear luminance (0.419) also
// lands under the bloom threshold, so the core cannot wash itself out either.
function dimHex(hex, k) {
  const s = new Color(hex).getHexString(SRGBColorSpace);
  const v = parseInt(s, 16);
  return (
    '#' +
    [(v >> 16) & 255, (v >> 8) & 255, v & 255]
      .map((x) => Math.round(x * k).toString(16).padStart(2, '0'))
      .join('')
  );
}
const HEAL_CORE = dimHex(PALETTE.brightHeal, 0.95);

// ---------------------------------------------------------------- textures --
let glyphTexture = null;
function getGlyphTexture() {
  if (glyphTexture) return glyphTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = '900 88px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.voidCharcoal;
  ctx.lineWidth = 14;
  ctx.strokeText('+HP', 128, 68);
  ctx.fillStyle = HEAL; // §17: the heal glyph IS Bright Heal
  ctx.fillText('+HP', 128, 68);
  glyphTexture = new CanvasTexture(canvas);
  glyphTexture.colorSpace = SRGBColorSpace;
  return glyphTexture;
}

function blobShadow(radius, opacity = 0.25) {
  const m = new Mesh(
    new CircleGeometry(radius, 20),
    new MeshBasicMaterial({
      map: getRadialTexture(),
      color: new Color('#000000'),
      transparent: true,
      opacity,
      depthWrite: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.008;
  return m;
}

function groundMat(color, opacity) {
  return new MeshBasicMaterial({
    color: new Color(color),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false, // stays chromatic — ACES would grey the accent out
    side: DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// ABOVE-THE-PLANE SLICES (Round D, skills criterion 3)
//
// Restorative Wave, Guardian Bond and Sanctuary are the three party-TARGETED
// shapes, so they are cast exactly when the party is bunched — and all three
// drew on the ground plane only, where four overlapping chibi silhouettes and
// their contact shadows cover the delivery shape completely (Round C: "the
// sim-side effect exists but is almost entirely hidden under the ally
// bodies"). Each therefore grows a slice that stands ABOVE the character
// plane: a standing arc curtain on the wave, a bowed ribbon over the heads on
// the bond, a standing wall of light on the sanctuary. Chibi standing height
// is ~1.05 u (§19.2), so the slices run to ~1.0-1.6 u — high enough that a
// body cannot hide them, low enough that they never cover a face.
//
// All three fade OUT with height so nothing reads as a solid box: one shared
// vertical gradient, opaque at the ground, gone at the top.
let riseTexture = null;
function getRiseTexture() {
  if (riseTexture) return riseTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 64, 0, 0); // v=0 is the TOP of the map
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.16, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.16)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  riseTexture = tex;
  return tex;
}

// Additive standing-light material: the same chromatic contract as groundMat
// (never tone-mapped, so Bright Heal stays Bright Heal) plus the height fade.
function riseMat(color, opacity) {
  return new MeshBasicMaterial({
    map: getRiseTexture(),
    color: new Color(color),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
  });
}

// Non-additive mark material. Additive amber over the aura's green glow washes
// out to near-white; the §8 override mark must stay Hearth Amber and stay
// readable on top of friendly ground VFX, so it composites normally.
function markMat(color, opacity) {
  return new MeshBasicMaterial({
    color: new Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
  });
}

// Hearth Amber caret (shape channel), charcoal-inked so it reads against the
// party bodies and the heal glow it floats over.
let caretTexture = null;
function getCaretTexture() {
  if (caretTexture) return caretTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(20, 22);
  ctx.lineTo(108, 22);
  ctx.lineTo(64, 106);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = PALETTE.voidCharcoal;
  ctx.stroke();
  ctx.fillStyle = AMBER;
  ctx.fill();
  caretTexture = new CanvasTexture(canvas);
  caretTexture.colorSpace = SRGBColorSpace;
  return caretTexture;
}

export function createSkillFx({ stage, world, bus, cosmetic }) {
  const root = new Group();
  root.name = 'skillfx';
  stage.scene.add(root);

  const partyByIndex = () => {
    const map = new Map();
    for (const e of world.entities()) {
      if (e.partyIndex !== undefined) map.set(e.partyIndex, e);
    }
    return map;
  };

  // ------------------------------------------------------------- mote pool --
  // Rising particles — the third layer of every effect here.
  const motes = [];
  const motePool = [];
  function spawnMotes(x, z, { color = HEAL, count = 7, y = 0.2, spread = 0.28, riseMin = 0.7, riseMax = 1.5, lifeMin = 0.45, lifeMax = 0.85 } = {}) {
    for (let i = 0; i < count; i++) {
      if (motes.length >= MOTE_CAP) break;
      const s = motePool.pop() ?? makeGlowSprite({ color, size: 1, opacity: 0.9 });
      s.material.color.set(color);
      s.material.opacity = 0.9;
      const size = cosmetic.range(0.06, 0.15);
      s.scale.set(size, size, 1);
      const a = cosmetic.range(0, Math.PI * 2);
      const r = cosmetic.range(0, spread);
      s.position.set(x + Math.cos(a) * r, y + cosmetic.range(0, 0.25), z + Math.sin(a) * r);
      root.add(s);
      motes.push({
        s,
        age: 0,
        life: cosmetic.range(lifeMin, lifeMax),
        vy: cosmetic.range(riseMin, riseMax),
        vx: cosmetic.range(-0.12, 0.12),
        vz: cosmetic.range(-0.12, 0.12),
      });
    }
  }

  // ------------------------------------------------------------ flash pool --
  // Short-lived sprite flashes (cores, glows, impact pops).
  const flashes = [];
  const flashPool = [];
  function spawnFlash(x, y, z, { color = HEAL, size = 0.5, opacity = 0.9, life = 0.3, grow = 0.4 } = {}) {
    const s = flashPool.pop() ?? makeGlowSprite({ color, size: 1, opacity });
    s.material.color.set(color);
    s.material.opacity = opacity;
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    flashes.push({ s, age: 0, life, size, grow, opacity });
  }

  // ------------------------------------------------------------ glyph pool --
  const glyphs = [];
  const glyphPool = [];
  function spawnGlyph(x, z) {
    let s = glyphPool.pop();
    if (!s) {
      s = new Sprite(
        new SpriteMaterial({
          map: getGlyphTexture(),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        })
      );
    }
    s.material.opacity = 1;
    s.scale.set(0.58, 0.29, 1);
    s.position.set(x, 0.95, z);
    root.add(s);
    glyphs.push({ s, age: 0, life: 0.8 });
  }

  // The full §17 heal read at one point: core + glow + motes + glyph.
  // §19.4 "instant impacts hold >=3-5 frames": the core alone is a 60 Hz
  // blink, so the burst is a 3-stage read - a hard core, a HOLD core that
  // keeps bright (v>0.75) Bright Heal pixels on screen for ~0.4 s (24 frames),
  // and a wide soft glow - then motes + glyph carry the tail.
  function healBurst(x, z) {
    spawnFlash(x, 0.5, z, { color: HEAL, size: 0.34, opacity: 0.95, life: 0.36, grow: 0.3 }); // core
    spawnFlash(x, 0.5, z, { color: HEAL, size: 0.52, opacity: 0.85, life: 0.5, grow: 0.45 }); // hold core
    spawnFlash(x, 0.5, z, { color: HEAL, size: 0.95, opacity: 0.55, life: 0.62, grow: 0.7 }); // glow
    spawnMotes(x, z, { color: HEAL, count: 10, lifeMin: 0.6, lifeMax: 1.05 });
    spawnGlyph(x, z);
  }

  // ------------------------------------------------------- expanding rings --
  const rings = [];
  const ringPool = [];
  function spawnRing(x, z, { color = HEAL, from = 0.3, to = 1.4, life = 0.35, opacity = 0.7 } = {}) {
    let m = ringPool.pop();
    if (!m) {
      m = new Mesh(new RingGeometry(0.86, 1.0, 44), groundMat(color, opacity));
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = -4;
    }
    m.material.color.set(color);
    m.material.opacity = opacity;
    m.position.set(x, 0.03, z);
    m.scale.set(from, from, 1);
    root.add(m);
    rings.push({ m, age: 0, life, from, to, opacity });
  }

  // ------------------------------------------------------------ link beams --
  // Ground streak caster→target for `direct` heals: thin bright core strip +
  // wide soft glow strip (motes ride the heal burst at the recipient).
  const beams = [];
  const beamPool = [];
  const arcPool = [];
  // The bond ARC: a ribbon that leaves the caster's staff, bows over the
  // party's heads and lands on the recipient. Built once with a fixed segment
  // count and re-pointed per cast (no per-cast geometry churn); the two rails
  // are offset in the XZ plane, so the ribbon lies FLAT to a 3/4 top-down
  // camera and reads as a band of light rather than as an edge-on line.
  const BOND_SEG = 18;
  const BOND_LIFT = 1.55; // u at the apex — well clear of the ~1.05 u party
  const BOND_END_Y = 0.62; // u — leaves and lands at chest/staff height
  function makeBondRibbon(width, color, opacity) {
    const geo = new BufferGeometry();
    const pos = new Float32Array((BOND_SEG + 1) * 2 * 3);
    const uv = new Float32Array((BOND_SEG + 1) * 2 * 2);
    const idx = new Uint16Array(BOND_SEG * 6);
    for (let i = 0; i <= BOND_SEG; i++) {
      const t = i / BOND_SEG;
      uv[(i * 2) * 2] = t; uv[(i * 2) * 2 + 1] = 0.22;
      uv[(i * 2 + 1) * 2] = t; uv[(i * 2 + 1) * 2 + 1] = 0.22;
      if (i < BOND_SEG) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.set([a, b, c, b, d, c], i * 6);
      }
    }
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('uv', new BufferAttribute(uv, 2));
    geo.setIndex(new BufferAttribute(idx, 1));
    const m = new Mesh(geo, riseMat(color, opacity));
    m.frustumCulled = false;
    m.userData.width = width;
    return m;
  }
  function aimBondRibbon(m, x0, z0, x1, z1) {
    const pos = m.geometry.attributes.position.array;
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const px = (-dz / len) * m.userData.width;
    const pz = (dx / len) * m.userData.width;
    for (let i = 0; i <= BOND_SEG; i++) {
      const t = i / BOND_SEG;
      const x = x0 + dx * t;
      const z = z0 + dz * t;
      const y = BOND_END_Y + 4 * (BOND_LIFT - BOND_END_Y) * t * (1 - t);
      pos[(i * 2) * 3] = x - px; pos[(i * 2) * 3 + 1] = y; pos[(i * 2) * 3 + 2] = z - pz;
      pos[(i * 2 + 1) * 3] = x + px; pos[(i * 2 + 1) * 3 + 1] = y; pos[(i * 2 + 1) * 3 + 2] = z + pz;
    }
    m.geometry.attributes.position.needsUpdate = true;
    m.geometry.computeBoundingSphere();
  }
  function spawnBeam(x0, z0, x1, z1, color = HEAL) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) return;
    let b = beamPool.pop();
    if (!b) {
      const g = new Group();
      const core = new Mesh(new PlaneGeometry(1, 0.09), groundMat(color, 0.85));
      core.rotation.x = -Math.PI / 2;
      core.renderOrder = -4;
      core.name = 'core';
      const glow = new Mesh(new PlaneGeometry(1, 0.3), groundMat(color, 0.35));
      glow.rotation.x = -Math.PI / 2;
      glow.renderOrder = -5;
      glow.name = 'glow';
      g.add(core);
      g.add(glow);
      b = g;
    }
    for (const name of ['core', 'glow']) {
      const m = b.getObjectByName(name);
      m.material.color.set(color);
      m.scale.set(len, 1, 1);
    }
    b.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2);
    b.rotation.y = -Math.atan2(dz, dx);
    root.add(b);
    // Above-plane slice: a wide dim rail with a bright thin rail inside it,
    // both bowing over the party's heads. They carry WORLD-space vertices, so
    // they hang off `root` directly instead of the beam's rotated group.
    let arc = arcPool.pop();
    if (!arc) {
      arc = new Group();
      const arcGlow = makeBondRibbon(0.14, color, 0.42);
      arcGlow.renderOrder = 2;
      arcGlow.name = 'arcGlow';
      const arcCore = makeBondRibbon(0.05, color, 0.95);
      arcCore.renderOrder = 3;
      arcCore.name = 'arcCore';
      arc.add(arcGlow);
      arc.add(arcCore);
    }
    for (const name of ['arcGlow', 'arcCore']) {
      const m = arc.getObjectByName(name);
      m.material.color.set(color);
      aimBondRibbon(m, x0, z0, x1, z1);
    }
    root.add(arc);
    beams.push({ g: b, arc, age: 0, life: 0.3 });
    // Motes strung along the link so the layer count holds everywhere.
    const n = Math.max(2, Math.round(len * 2));
    for (let i = 1; i < n; i++) {
      spawnMotes(x0 + (dx * i) / n, z0 + (dz * i) / n, { color, count: 1, spread: 0.08 });
    }
  }

  // -------------------------------------------------------------- arc wedge --
  // Restorative Wave: 55° half-angle, reach 1.1 (geometry generated from the
  // skill table, never re-typed here).
  const WAVE = SKILLS.restorative_wave;
  const wedgeHalf = (WAVE.area * Math.PI) / 180;
  const WAVE_WALL = 1.15; // u — clears the ~1.05 u chibi standing height (§19.2)
  const wedges = [];
  const wedgePool = [];
  function spawnWedge(x, z, dirX, dirZ) {
    let g = wedgePool.pop();
    if (!g) {
      g = new Group();
      const fill = new Mesh(
        new CircleGeometry(WAVE.range, 26, -wedgeHalf, wedgeHalf * 2),
        groundMat(HEAL, 0.3)
      );
      fill.rotation.x = -Math.PI / 2;
      fill.renderOrder = -5;
      fill.name = 'fill';
      const rim = new Mesh(
        new RingGeometry(WAVE.range * 0.9, WAVE.range, 26, 1, -wedgeHalf, wedgeHalf * 2),
        groundMat(HEAL, 0.75)
      );
      rim.rotation.x = -Math.PI / 2;
      rim.renderOrder = -4;
      rim.name = 'rim';
      g.add(fill);
      g.add(rim);
      // Standing arc curtain at the wedge's outer edge. Geometry is authored
      // centred on +Z (three's CylinderGeometry theta 0 points +Z and grows
      // toward +X), so aiming is one rotation.y = PI/2 - yaw.
      const curtain = new Mesh(
        new CylinderGeometry(WAVE.range, WAVE.range, WAVE_WALL, 26, 1, true, -wedgeHalf, wedgeHalf * 2),
        riseMat(HEAL, 0.5)
      );
      curtain.position.y = WAVE_WALL / 2 - 0.035;
      curtain.renderOrder = 2; // above the ground VFX and the bodies' shadows
      curtain.name = 'curtain';
      // Bright leading edge along the top of the curtain. The height-faded
      // wall alone reads as a soft green area behind the party; a hard bright
      // line at its crest is what makes it read as a WAVE FRONT sweeping
      // through them. It is a child of the curtain, so it rides the curtain's
      // rise (scale.y) for free.
      const crest = new Mesh(
        new CylinderGeometry(WAVE.range * 1.008, WAVE.range * 1.008, 0.055, 26, 1, true, -wedgeHalf, wedgeHalf * 2),
        groundMat(HEAL, 0.9)
      );
      crest.position.y = WAVE_WALL / 2;
      crest.renderOrder = 3;
      crest.name = 'crest';
      // FIX ROUND 2 — dark inner edge under the crest. The curtain is an
      // ADDITIVE Bright-Heal green standing on Act-1 grass, which is itself
      // green (ACT1_GROUND h100, and an open-grass box measures 86% of its
      // pixels inside the analyzer's h110-150 band), so the curtain's own
      // fill has almost no hue contrast with what it sweeps over and the
      // whole read hung on one bright line. A NON-additive Void Charcoal
      // band immediately under the crest gives that line something to be
      // bright against — the same trick the heal bolt got with its ink hull.
      // Drawn after the curtain (renderOrder 2.5) so it actually darkens it,
      // and before the crest (3) so the crest stays the top layer.
      const inkEdge = new Mesh(
        new CylinderGeometry(WAVE.range * 1.004, WAVE.range * 1.004, 0.14, 26, 1, true, -wedgeHalf, wedgeHalf * 2),
        markMat(PALETTE.voidCharcoal, 0.55)
      );
      inkEdge.position.y = WAVE_WALL / 2 - 0.083;
      inkEdge.renderOrder = 2.5;
      inkEdge.name = 'inkEdge';
      curtain.add(inkEdge);
      curtain.add(crest);
      g.add(curtain);
    }
    g.position.set(x, 0.035, z);
    // Geometry is centered on local +X; Euler order XYZ applies Rz first, so
    // rotation.z = -worldYaw aims the wedge at the live aim direction.
    const yaw = Math.atan2(dirZ, dirX);
    g.getObjectByName('fill').rotation.z = -yaw;
    g.getObjectByName('rim').rotation.z = -yaw;
    g.getObjectByName('curtain').rotation.y = Math.PI / 2 - yaw;
    root.add(g);
    wedges.push({ g, age: 0, life: 0.32 });
    // Motes sprayed through the arc.
    for (let i = 0; i < 8; i++) {
      const a = yaw + cosmetic.range(-wedgeHalf, wedgeHalf);
      const r = cosmetic.range(0.2, WAVE.range);
      spawnMotes(x + Math.cos(a) * r, z + Math.sin(a) * r, { color: HEAL, count: 1, spread: 0.05 });
    }
  }

  // ------------------------------------------------------------ skill bolts --
  // Sync render rigs to sim 'skillbolt' entities (§19.4 3-layer + shadow).
  const boltRigs = new Map(); // id -> group
  const boltCoreGeo = new CapsuleGeometry(0.092, 0.20, 4, 10); // +22% radius: the old core was ~10 px in flight, thin enough that FXAA blended its whole width into the grass
  function makeBoltRig(heal) {
    const g = new Group();
    const core = new Mesh(
      boltCoreGeo,
      new MeshBasicMaterial({
        // Authored through the post-chain inverse so the pixel that lands on
        // screen IS the palette hex (§19.1), not what ACES makes of it.
        color: heal ? exactColor(HEAL_CORE) : exactColor(PARCH),
        toneMapped: false,
        // The core joins the TRANSPARENT pass (opacity 1, no depth write) only
        // so renderOrder can put it ON TOP of its own additive glow. Drawn
        // under the glow it composites to the ground hue (a Bright Heal bolt
        // over lit grass measured h~96 = foliage, not the authored h129);
        // drawn over it, the core keeps its §19.1 hue and the glow stays the
        // halo around it. depthTest off = §19.4 z-order "projectiles always
        // render above" characters and environment.
        transparent: true,
        opacity: 1,
        depthWrite: false,
        depthTest: false,
      })
    );
    core.rotation.z = Math.PI / 2;
    core.position.y = BOLT_Y;
    core.name = 'core';
    core.renderOrder = 6;
    g.add(core);
    // §19.2 ink line on the projectile. Round C measured the Mending Bolt's
    // in-flight core at hue 101 / sat 0.37 against Bright Heal's authored
    // hue 129 / sat 0.59 — the SAME hue as ACT1_GROUND #548C38 (h100), so the
    // heal bolt only read by luma over grass. Two causes, both fixed here:
    //   * `toneMapped: false` does nothing in this pipeline. The composer
    //     renders to a HalfFloat target, so materials never tonemap; ACES runs
    //     later in OutputPass over the whole frame and rotates the authored hex
    //     on its way to the screen. The core is now authored through
    //     `exactColorNearest` (render/critters/common.js), which inverts ACES +
    //     the grade — the same solver the Healer's staff gem uses, and the
    //     `Nearest` variant because a saturated Bright Heal at full value is
    //     outside the ACES gamut and would clamp its hue away.
    //   * the core is only ~10 px across in flight, so the shipped FXAA pass
    //     blended its edge straight into the grass behind it. A Void Charcoal
    //     inverted hull gives every one of those blends a DARK partner instead
    //     of a green one, which is what keeps the core's own hue measurable —
    //     and it is the storybook ink line the rest of the game already wears.
    const ink = new Mesh(
      boltCoreGeo,
      new MeshBasicMaterial({
        color: exactColor(PALETTE.voidCharcoal),
        side: BackSide,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: false,
      })
    );
    ink.rotation.z = Math.PI / 2;
    ink.position.y = BOLT_Y;
    ink.scale.setScalar(1.34);
    ink.renderOrder = 5;
    g.add(ink);
    const glow = makeGlowSprite({ color: heal ? HEAL : AMBER, size: 0.55, opacity: 0.85 });
    glow.position.y = BOLT_Y;
    glow.renderOrder = 4;
    g.add(glow);
    // Contact shadow: wide + dark enough to survive the additive glow above it
    // (§19.2 / REFERENCE_BAR check 8: every flier is grounded). It has to beat
    // the glow it sits under, so it is wider than the glow's bright core.
    g.add(blobShadow(0.26, 0.7));
    return g;
  }

  const trails = [];
  const trailPool = [];
  function spawnTrailDot(x, z, color) {
    let s = trailPool.pop();
    if (!s) s = makeGlowSprite({ color, size: 0.24, opacity: 0.4 });
    s.material.color.set(color);
    s.material.opacity = 0.4;
    s.scale.set(0.24, 0.24, 1);
    s.position.set(x, BOLT_Y, z);
    root.add(s);
    trails.push({ s, age: 0 });
  }

  // ------------------------------------------------------------------ zones --
  // Sanctuary: layered translucent discs + rim + motes (§19.4 AoE grammar).
  const zoneRigs = new Map(); // id -> { g, radius, emit }
  const ZONE_WALL = 1.25; // u — clears the ~1.05 u chibi standing height (§19.2)
  function makeZoneRig(radius) {
    const g = new Group();
    const fill = new Mesh(new CircleGeometry(radius, 40), groundMat(HEAL, 0.13));
    fill.rotation.x = -Math.PI / 2;
    fill.renderOrder = -6;
    g.add(fill);
    const inner = new Mesh(new CircleGeometry(radius * 0.55, 32), groundMat(HEAL, 0.18));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.004;
    inner.renderOrder = -6;
    g.add(inner);
    const rim = new Mesh(new RingGeometry(radius * 0.93, radius, 44), groundMat(HEAL, 0.55));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.006;
    rim.renderOrder = -5;
    rim.name = 'rim';
    g.add(rim);
    const halo = makeGlowSprite({ color: HEAL, size: radius * 2.4, opacity: 0.2 });
    halo.position.y = 0.25;
    g.add(halo);
    // Above-plane slice: a standing wall of light around the zone edge. The
    // Sanctuary disc is the shape the party stands INSIDE, so on the ground
    // plane alone it is exactly what four bunched bodies cover; the wall is
    // what still says "you are in the zone" when they do. Fades out with
    // height (getRiseTexture), so it reads as light rising off the rim.
    // Opacity 0.20 (a first cut ran 0.42): a Sanctuary lives 4 s (§7), and at
    // 0.42 the near half of the wall sat over the party for all four of them —
    // measured on a bunched capture, the four bodies washed to near-white and
    // lost the REFERENCE_BAR check-3 silhouette read. At 0.20 the wall is a
    // veil in front and a clear standing rim behind, and the zone still reads
    // from above the bodies.
    const wall = new Mesh(
      new CylinderGeometry(radius, radius, ZONE_WALL, 44, 1, true),
      riseMat(HEAL, 0.20)
    );
    wall.position.y = ZONE_WALL / 2;
    wall.renderOrder = 2;
    wall.name = 'wall';
    g.add(wall);
    return g;
  }

  // ------------------------------------------------------------------- aura --
  // Warding Aura field: radius from the skill table (0.9 u), rides the player.
  const AURA = SKILLS.warding_aura;
  const auraGroup = new Group();
  const auraRing = new Mesh(new RingGeometry(AURA.area * 0.93, AURA.area, 44), groundMat(HEAL, 0.3));
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.028;
  auraRing.renderOrder = -5;
  auraGroup.add(auraRing);
  const auraDisc = new Mesh(new CircleGeometry(AURA.area, 40), groundMat(HEAL, 0.07));
  auraDisc.rotation.x = -Math.PI / 2;
  auraDisc.position.y = 0.024;
  auraDisc.renderOrder = -6;
  auraGroup.add(auraDisc);
  auraGroup.visible = false;
  root.add(auraGroup);
  let auraOn = false;
  let auraPulseT = 0;
  let auraMoteClock = 0;

  // ------------------------------------------------------ override reticle --
  // §8/§17: Hearth Amber mark on the F1–F4 override target — ring + 4 notch
  // wedges (shape channel), gently spinning so it reads as a MARK, not a ring.
  // The ring sits CONCENTRIC OUTSIDE the class identity ring (§17's revive-ring
  // grammar) and paints AFTER it: the identity ring is an opaque charcoal plate
  // (allies block) and friendly ground VFX are additive, so at a negative
  // renderOrder the amber ring was drawn first and both washed it out — only
  // the notches survived. renderOrder 1 is still below every character mesh
  // (opaque pass) and the ring stays depth-tested, so bodies occlude it.
  const reticle = new Group();
  const RET_ORDER = 1;
  const retRing = new Mesh(new RingGeometry(0.54, 0.7, 44), markMat(AMBER, 0.95));
  retRing.rotation.x = -Math.PI / 2;
  retRing.renderOrder = RET_ORDER;
  reticle.add(retRing);
  const notchGeo = new PlaneGeometry(0.14, 0.24);
  for (let i = 0; i < 4; i++) {
    const n = new Mesh(notchGeo, markMat(AMBER, 1));
    n.rotation.x = -Math.PI / 2;
    n.rotation.z = -(i * Math.PI) / 2;
    n.position.set(Math.cos((i * Math.PI) / 2) * 0.82, 0, Math.sin((i * Math.PI) / 2) * 0.82);
    n.renderOrder = RET_ORDER;
    reticle.add(n);
  }
  // Overhead caret: the half of the mark that CANNOT be washed out by ground
  // glow (aura ring, Sanctuary disc, heal bursts all live on the floor).
  const retCaret = new Sprite(
    new SpriteMaterial({
      map: getCaretTexture(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
  );
  retCaret.scale.set(0.42, 0.42, 1);
  retCaret.position.set(0, 1.42, 0);
  retCaret.renderOrder = 20;
  reticle.add(retCaret);
  reticle.position.y = 0.032;
  reticle.visible = false;
  root.add(reticle);
  let overrideIndex = null;

  // ----------------------------------------------------------- bus wiring --
  bus.on('heal', (ev) => healBurst(ev.x, ev.z));
  bus.on('heal_override', (ev) => {
    overrideIndex = ev.index;
  });
  bus.on('skill_equip', (ev) => {
    if (ev.skill === 'warding_aura') auraOn = true;
  });
  bus.on('skills_restored', (ev) => {
    auraOn = ev.slots.includes('warding_aura');
  });
  bus.on('aura_pulse', () => {
    auraPulseT = 0.45;
    spawnRing(world.player.x, world.player.z, { color: HEAL, from: 0.25, to: AURA.area, life: 0.4, opacity: 0.55 });
  });
  bus.on('zone_tick', (ev) => {
    const rig = zoneRigs.get(ev.id);
    if (!rig) return;
    rig.pulseT = 0.35;
    spawnRing(rig.g.position.x, rig.g.position.z, { color: HEAL, from: 0.3, to: rig.radius, life: 0.3, opacity: 0.5 });
    spawnMotes(rig.g.position.x, rig.g.position.z, { color: HEAL, count: 6, spread: rig.radius * 0.8 });
  });
  bus.on('skill_cast', (ev) => {
    const p = world.player;
    if (ev.shape === 'nova') {
      const def = SKILLS[ev.skill];
      spawnFlash(p.x, 0.45, p.z, { color: HEAL, size: 0.5, opacity: 0.9, life: 0.25, grow: 0.5 });
      spawnRing(p.x, p.z, { color: HEAL, from: 0.3, to: def.area, life: 0.38, opacity: 0.8 });
      spawnMotes(p.x, p.z, { color: HEAL, count: 10, spread: def.area * 0.7 });
    } else if (ev.shape === 'melee_arc') {
      spawnWedge(p.x, p.z, ev.dx, ev.dz);
      spawnFlash(p.x, 0.4, p.z, { color: HEAL, size: 0.4, opacity: 0.7, life: 0.2, grow: 0.3 });
    } else if (ev.shape === 'direct' && Array.isArray(ev.targets)) {
      const members = partyByIndex();
      for (const id of ev.targets) {
        for (const m of members.values()) {
          if (m.id === id && m.id !== p.id) spawnBeam(p.x, p.z, m.x, m.z, HEAL);
        }
      }
      spawnFlash(p.x, 0.45, p.z, { color: HEAL, size: 0.3, opacity: 0.6, life: 0.18, grow: 0.2 });
    }
  });
  bus.on('skill_bolt_despawn', (ev) => {
    if (ev.cause !== 'impact') return;
    // Impact pop, colored by the instance family (§19.4): heal = Bright Heal,
    // damage = parchment core + amber glow.
    if (ev.heal) {
      spawnFlash(ev.x, BOLT_Y, ev.z, { color: HEAL, size: 0.4, opacity: 0.95, life: 0.2, grow: 0.4 });
    } else {
      spawnFlash(ev.x, BOLT_Y, ev.z, { color: PARCH, size: 0.28, opacity: 0.95, life: 0.16, grow: 0.3 });
      spawnFlash(ev.x, BOLT_Y, ev.z, { color: AMBER, size: 0.55, opacity: 0.7, life: 0.25, grow: 0.5 });
      spawnMotes(ev.x, ev.z, { color: AMBER, count: 5, y: BOLT_Y - 0.15, riseMin: 0.3, riseMax: 0.8, lifeMin: 0.25, lifeMax: 0.45 });
    }
  });

  // ---------------------------------------------------------------- update --
  let lastElapsed = null;
  function update(tSec, alpha = 1) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastElapsed));
    lastElapsed = tSec;
    // Skill bolts: sync to sim, orient along flight, leave a trail.
    const seen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'skillbolt') continue;
      seen.add(e.id);
      let g = boltRigs.get(e.id);
      if (!g) {
        g = makeBoltRig(e.heal);
        boltRigs.set(e.id, g);
        root.add(g);
      }
      const bx = e.px + (e.x - e.px) * alpha;
      const bz = e.pz + (e.z - e.pz) * alpha;
      g.position.set(bx, 0, bz);
      g.getObjectByName('core').rotation.y = Math.atan2(e.vz, -e.vx);
      spawnTrailDot(bx, bz, e.heal ? HEAL : AMBER);
    }
    for (const [id, g] of boltRigs) {
      if (!seen.has(id)) {
        root.remove(g);
        boltRigs.delete(id);
      }
    }
    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      tr.age += dt;
      const o = 0.4 * (1 - tr.age / TRAIL_FADE);
      if (o <= 0) {
        root.remove(tr.s);
        trailPool.push(tr.s);
        trails.splice(i, 1);
      } else {
        tr.s.material.opacity = o;
      }
    }

    // Zones: sync rigs to sim zone entities; breathe; drip motes.
    const seenZones = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'zone') continue;
      seenZones.add(e.id);
      let rig = zoneRigs.get(e.id);
      if (!rig) {
        rig = { g: makeZoneRig(e.radius), radius: e.radius, pulseT: 0, moteClock: 0 };
        rig.g.position.set(e.x, 0.012, e.z);
        zoneRigs.set(e.id, rig);
        root.add(rig.g);
      }
      rig.pulseT = Math.max(0, rig.pulseT - dt);
      const breathe = 1 + 0.06 * Math.sin(tSec * 2.2 + e.id);
      rig.g.scale.set(breathe, 1, breathe);
      const rim = rig.g.getObjectByName('rim');
      rim.material.opacity = 0.55 + 0.35 * (rig.pulseT / 0.35) + 0.08 * Math.sin(tSec * 3 + e.id);
      // The wall breathes with the rim and flares on every zone tick, so the
      // 1.0 s cadence (§6) is legible from above the bodies too.
      const wall = rig.g.getObjectByName('wall');
      wall.material.opacity = 0.17 + 0.20 * (rig.pulseT / 0.35) + 0.03 * Math.sin(tSec * 2.2 + e.id);
      rig.moteClock += dt;
      if (rig.moteClock > 0.22) {
        rig.moteClock = 0;
        spawnMotes(
          rig.g.position.x + cosmetic.range(-rig.radius * 0.7, rig.radius * 0.7),
          rig.g.position.z + cosmetic.range(-rig.radius * 0.7, rig.radius * 0.7),
          { color: HEAL, count: 1, spread: 0.05 }
        );
      }
    }
    for (const [id, rig] of zoneRigs) {
      if (!seenZones.has(id)) {
        root.remove(rig.g);
        zoneRigs.delete(id);
      }
    }

    // Aura field rides the player; breathes; flares on pulses.
    if (auraOn !== auraGroup.visible) auraGroup.visible = auraOn;
    if (auraOn) {
      const p = world.player;
      const ix = p.px + (p.x - p.px) * alpha;
      const iz = p.pz + (p.z - p.pz) * alpha;
      auraGroup.position.set(ix, 0, iz);
      auraPulseT = Math.max(0, auraPulseT - dt);
      const flare = auraPulseT / 0.45;
      auraRing.material.opacity = 0.28 + 0.45 * flare + 0.06 * Math.sin(tSec * 2.4);
      auraDisc.material.opacity = 0.07 + 0.16 * flare;
      const s = 1 + 0.05 * Math.sin(tSec * 2.4) + 0.1 * flare;
      auraGroup.scale.set(s, 1, s);
      auraMoteClock += dt;
      if (auraMoteClock > 0.5) {
        auraMoteClock = 0;
        spawnMotes(ix, iz, { color: HEAL, count: 1, spread: AURA.area * 0.8, riseMin: 0.3, riseMax: 0.7 });
      }
    }

    // Override reticle follows its party member (player included: F1 self).
    if (overrideIndex !== null) {
      const m = partyByIndex().get(overrideIndex);
      if (m) {
        reticle.visible = true;
        const mx = m.px !== undefined ? m.px + (m.x - m.px) * alpha : m.x;
        const mz = m.pz !== undefined ? m.pz + (m.z - m.pz) * alpha : m.z;
        reticle.position.set(mx, 0.032, mz);
        reticle.rotation.y = tSec * 0.9;
        retCaret.position.y = 1.42 + 0.09 * Math.sin(tSec * 3.4);
      } else {
        reticle.visible = false;
      }
    } else {
      reticle.visible = false;
    }

    // Pools tick down.
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      if (m.age >= m.life) {
        root.remove(m.s);
        motePool.push(m.s);
        motes.splice(i, 1);
        continue;
      }
      m.s.position.x += m.vx * dt;
      m.s.position.y += m.vy * dt;
      m.s.position.z += m.vz * dt;
      m.s.material.opacity = 0.9 * (1 - m.age / m.life);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      if (f.age >= f.life) {
        root.remove(f.s);
        flashPool.push(f.s);
        flashes.splice(i, 1);
        continue;
      }
      const t = f.age / f.life;
      const sz = f.size * (1 + f.grow * t);
      f.s.scale.set(sz, sz, 1);
      f.s.material.opacity = f.opacity * (1 - t);
    }
    for (let i = glyphs.length - 1; i >= 0; i--) {
      const g = glyphs[i];
      g.age += dt;
      if (g.age >= g.life) {
        root.remove(g.s);
        glyphPool.push(g.s);
        glyphs.splice(i, 1);
        continue;
      }
      const t = g.age / g.life;
      g.s.position.y += 0.7 * dt;
      g.s.material.opacity = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      if (r.age >= r.life) {
        root.remove(r.m);
        ringPool.push(r.m);
        rings.splice(i, 1);
        continue;
      }
      const t = r.age / r.life;
      const s = r.from + (r.to - r.from) * (1 - (1 - t) * (1 - t));
      r.m.scale.set(s, s, 1);
      r.m.material.opacity = r.opacity * (1 - t);
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.age += dt;
      if (b.age >= b.life) {
        root.remove(b.g);
        beamPool.push(b.g);
        root.remove(b.arc);
        arcPool.push(b.arc);
        beams.splice(i, 1);
        continue;
      }
      const t = b.age / b.life;
      b.g.getObjectByName('core').material.opacity = 0.85 * (1 - t);
      b.g.getObjectByName('glow').material.opacity = 0.35 * (1 - t);
      b.arc.getObjectByName('arcCore').material.opacity = 0.95 * (1 - t);
      b.arc.getObjectByName('arcGlow').material.opacity = 0.45 * (1 - t * t);
    }
    for (let i = wedges.length - 1; i >= 0; i--) {
      const w = wedges[i];
      w.age += dt;
      if (w.age >= w.life) {
        root.remove(w.g);
        wedgePool.push(w.g);
        wedges.splice(i, 1);
        continue;
      }
      const t = w.age / w.life;
      // §19.4 "instant impacts hold >=3-5 frames": the wave used to start
      // fading on frame 1, so by 280 ms (t 0.875) the crest was at opacity
      // 0.12 and the curtain fill at 0.009 — a faint thin arc, which is what
      // Round C measured. The crest and the curtain now HOLD at full value
      // through t <= HOLD (0.35 of a 0.32 s life = 112 ms = ~7 frames at 60
      // Hz) and then fade on a tail that is deliberately slower than linear,
      // so the shape is still readable at the end of the sweep instead of
      // gone. The rise (scale.y) is untouched — that is what makes it read as
      // a wave FRONT passing through the party rather than a fence.
      const HOLD = 0.35;
      const tail = t <= HOLD ? 1 : 1 - (t - HOLD) / (1 - HOLD);
      w.g.getObjectByName('fill').material.opacity = 0.3 * tail;
      w.g.getObjectByName('rim').material.opacity = 0.75 * tail;
      const cur = w.g.getObjectByName('curtain');
      cur.material.opacity = 0.55 * Math.pow(tail, 1.4);
      cur.getObjectByName('crest').material.opacity = 0.95 * Math.pow(tail, 0.7);
      cur.getObjectByName('inkEdge').material.opacity = 0.55 * Math.pow(tail, 0.7);
      cur.scale.y = 0.55 + 0.75 * t;
      cur.position.y = (WAVE_WALL * cur.scale.y) / 2 - 0.035;
      const s = 1 + 0.18 * t;
      w.g.scale.set(s, 1, s);
    }
  }

  // Live element counts for captures (parallels scene.debugState().vfx).
  function debugCounts() {
    return {
      motes: motes.length,
      flashes: flashes.length,
      glyphs: glyphs.length,
      rings: rings.length,
      beams: beams.length,
      wedges: wedges.length,
      boltRigs: boltRigs.size,
      zoneRigs: zoneRigs.size,
      auraOn,
      overrideIndex,
    };
  }

  return { update, debugCounts };
}
