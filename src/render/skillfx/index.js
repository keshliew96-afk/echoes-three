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
  Vector3,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { SKILLS } from '../../sim/skills.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { sharedGeo, markShared, releaseTree } from '../geocache.js';
import { warmPark } from '../warmup.js';
import { impactFx } from '../vfx/hub.js';
import { exactColor, underBloom, getShadowTexture } from '../critters/common.js';
// Gauntlet skills whose cast / zone reads live in ./content.js (a damage nova
// or a damage zone must never draw this layer's green heal grammar).
import { CONTENT_CAST_SKILLS } from './content.js';
import { vfxClassStyle, vfxSkillClass } from '../../data/vfx.js';

// Cosmetic scaffold tunables (render-only, not brief numbers).
const BOLT_Y = 0.55; // matches the basic bolt's flight height
const BOLT_SPARK_HZ = 13; // sparks/s shed by a bolt in flight (particle layer)
const TRAIL_FADE = 0.34; // s, bolt trail life (r2: 0.15 s was a smear the bolt's own body covered)
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
    // Shared per radius (F1): a bolt rig is built per shot and dropped when
    // the shot lands, so its shadow disc was one leaked geometry per cast.
    sharedGeo(`skillfx-shadow:${radius}`, () => new CircleGeometry(radius, 20)),
    new MeshBasicMaterial({
      // Contact-shadow ramp, not the bloom-halo ramp — see common.js.
      map: getShadowTexture(),
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

// ---------------------------------------------------------------------------
// BOND RIBBON RAILS (fix round 2)
//
// The bond's above-plane slice used the same additive `riseMat` as the wave
// curtain, and over the party's own CREAM FUR an additive green can only ever
// add toward white: measured on the bunched repro the ribbon landed on
// rgb(248,249,218) / (255,254,231) — luma 245-253, hue 51-68, saturation
// 0.09-0.13, i.e. a white blowout with no Bright Heal core in it at all
// (§19.4 "Player heals: Bright Heal core + green glow"). So the ribbon is now
// three rails with three different jobs:
//
//   glow  — additive, soft-edged, WIDE: the "+ green glow" halo. Feathered
//           with a cross-ribbon falloff so it ends on a gradient, not a line.
//   ink   — NON-additive Void Charcoal, mid width: the storybook rim. This is
//           the same trick that rescued the wave crest and the heal-bolt hull;
//           it gives the core something dark to be bright against, and it is
//           what stops the glow's own wash from touching the core.
//   core  — NON-additive Bright Heal, narrow: a REPLACEMENT, not an addition,
//           so a ribbon pixel over cream fur measures the authored hue instead
//           of the fur plus green. `underBloom` keeps it below the composer's
//           bloom threshold so it cannot blow itself back out to white.
let bandTexture = null;
function getBandTexture() {
  if (bandTexture) return bandTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.8)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  bandTexture = tex;
  return tex;
}

// depthTest is OFF on all three rails. The whole point of the above-plane
// slice is that four overlapping chibi silhouettes cannot eat the delivery
// shape (Round C F3); a depth-tested ribbon loses its two ENDS to the very
// bodies it is bonding, which is exactly the "not traceable end-to-end" read.
// The ribbon is a 0.42 s light-link in the air, not a ground decal, so it
// composites above the character plane by design (§19.4 keeps FRIENDLY GROUND
// VFX under the characters — the ground rails below still obey that).
function ribbonMat(color, opacity, { additive = false, feather = false } = {}) {
  const m = new MeshBasicMaterial({
    color: new Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    side: DoubleSide,
  });
  if (additive) m.blending = AdditiveBlending;
  if (feather) m.map = getBandTexture();
  return m;
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
      // fix-CAMPAIGN-r6 (GC.6): one shared unit ring — a pooled record adds no GL geometry
      m = new Mesh(sharedGeo('sfx-ring-unit', () => new RingGeometry(0.86, 1.0, 44)), groundMat(color, opacity));
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
  // FIX ROUND 2 — THE ARC'S SHAPE IS A FUNCTION OF LINK LENGTH.
  //
  // A fixed apex (1.55 u) with fixed ends (0.62 u) is a fixed 0.93 u of
  // VERTICAL bow whatever the link measures. Over a 2.2 u link that projects
  // as a wide bowed ribbon (verified). Over the 0.67-0.89 u links a RALLIED
  // party actually stands at, the same curve projects as a ~55 px near-
  // vertical loop standing inside the two silhouettes it connects — the
  // shape was verified in the one case the failure never existed in.
  //
  // So short links bow SIDEWAYS instead of straight up. The lateral bulge is
  // taken perpendicular to the link in the ground plane and always pushed
  // AWAY from the camera, because on a 3/4 top-down camera both "up" and
  // "away" project up-screen: the two add instead of cancelling, and the arc
  // leaves the huddle in the one direction that cannot land back on it.
  // The ends also rise to head height as the link shortens, so the ribbon
  // starts at the top of a silhouette rather than buried in its chest.
  const BOND_SHORT = 0.70; // u — fully bunched: a rallied party's link length
  const BOND_LONG = 1.55; // u — at/above this the over-the-head arc reads
  const BOND_BOW_MAX = 0.72; // u — ceiling on the lateral bulge
  const BOND_OPEN = 0.058; // target apex-to-chord standoff, as a fraction of
  // viewport height (~52 px at 900) — the arc has to be an OPEN shape on
  // screen, and screen space is the only place that can be decided.
  const BOND_SHORT_END = 0.92; // u — end height when fully bunched (head top)
  const BOND_SHORT_APEX = 1.26; // u — apex when fully bunched
  const camFwd = new Vector3();
  const projV = new Vector3();
  function projPx(x, y, z, w, h) {
    projV.set(x, y, z).project(stage.camera);
    return [(projV.x + 1) * 0.5 * w, (1 - projV.y) * 0.5 * h];
  }
  // Perpendicular standoff, in real screen pixels, of the arc's apex from the
  // chord joining its two ends. This is the number that decides whether the
  // ribbon reads as an ARC or as a line: a link pointing straight away from
  // the camera projects its whole vertical bow onto its own chord, which is
  // how a perfectly good 1.5 u arc still collapsed into a vertical band.
  function apexPx(x0, z0, x1, z1, endY, apexY, sx, sz, bow, w, h) {
    const a = projPx(x0, endY, z0, w, h);
    const b = projPx(x1, endY, z1, w, h);
    const m = projPx((x0 + x1) / 2 + sx * bow, apexY, (z0 + z1) / 2 + sz * bow, w, h);
    let ux = b[0] - a[0], uy = b[1] - a[1];
    const ul = Math.hypot(ux, uy);
    if (ul < 1e-3) return Math.hypot(m[0] - a[0], m[1] - a[1]);
    ux /= ul; uy /= ul;
    return Math.abs((m[0] - a[0]) * uy - (m[1] - a[1]) * ux);
  }
  function bondShape(x0, z0, x1, z1, taken) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const k = Math.max(0, Math.min(1, (BOND_LONG - len) / (BOND_LONG - BOND_SHORT)));
    const endY = BOND_END_Y + (BOND_SHORT_END - BOND_END_Y) * k;
    const apexY = BOND_LIFT + (BOND_SHORT_APEX - BOND_LIFT) * k;
    const el = stage.renderer.domElement;
    const w = el.clientWidth || el.width || 1600;
    const h = el.clientHeight || el.height || 900;
    const want = BOND_OPEN * h;
    // The projection is near-affine over a metre of ground, so one probe at
    // 1 u of bow linearises the solve exactly enough.
    const solve = (ax, az) => {
      const d0 = apexPx(x0, z0, x1, z1, endY, apexY, ax, az, 0, w, h);
      const d1 = apexPx(x0, z0, x1, z1, endY, apexY, ax, az, 1, w, h);
      let bow = 0;
      if (d0 < want && d1 > d0) bow = Math.min(BOND_BOW_MAX, (want - d0) / (d1 - d0));
      return { bow, open: d0 + bow * (d1 - d0) };
    };
    // Bow perpendicular to the link, on whichever side buys more screen — for
    // a 3/4 top-down camera that is the side AWAY from it, because "away" and
    // "up" both project up-screen and therefore add instead of cancelling.
    let sx = -dz / len, sz = dx / len;
    stage.camera.getWorldDirection(camFwd);
    if (sx * camFwd.x + sz * camFwd.z < 0) { sx = -sx; sz = -sz; }
    let best = { sx, sz, ...solve(sx, sz) };
    // Guardian Bond fires TWO links from one caster in the same tick. Both
    // taking the same side nests one arc inside the other and the pair reads
    // as one squiggle, so a second link that would bow within 60 degrees of a
    // live one takes the other side instead — as long as that side still
    // opens the arc up.
    if (taken && taken.some((d) => d[0] * sx + d[1] * sz > 0.5)) {
      const flip = solve(-sx, -sz);
      if (flip.open >= want * 0.7) best = { sx: -sx, sz: -sz, ...flip };
    }
    return { sx: best.sx, sz: best.sz, bow: best.bow, endY, apexY };
  }
  function makeBondRibbon(width, material) {
    const geo = new BufferGeometry();
    const pos = new Float32Array((BOND_SEG + 1) * 2 * 3);
    const uv = new Float32Array((BOND_SEG + 1) * 2 * 2);
    const idx = new Uint16Array(BOND_SEG * 6);
    for (let i = 0; i <= BOND_SEG; i++) {
      const t = i / BOND_SEG;
      // v runs ACROSS the ribbon now (0 on one rail, 1 on the other) so a
      // feathered rail fades out at both edges instead of ending on a line.
      uv[(i * 2) * 2] = t; uv[(i * 2) * 2 + 1] = 0;
      uv[(i * 2 + 1) * 2] = t; uv[(i * 2 + 1) * 2 + 1] = 1;
      if (i < BOND_SEG) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.set([a, b, c, b, d, c], i * 6);
      }
    }
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('uv', new BufferAttribute(uv, 2));
    geo.setIndex(new BufferAttribute(idx, 1));
    const m = new Mesh(geo, material);
    m.frustumCulled = false;
    m.userData.width = width;
    return m;
  }
  function aimBondRibbon(m, x0, z0, x1, z1, sh) {
    const pos = m.geometry.attributes.position.array;
    const dx = x1 - x0, dz = z1 - z0;
    const w = m.userData.width;
    const at = (t) => {
      const bulge = sh.bow * Math.sin(Math.PI * t);
      return [
        x0 + dx * t + sh.sx * bulge,
        sh.endY + 4 * (sh.apexY - sh.endY) * t * (1 - t),
        z0 + dz * t + sh.sz * bulge,
      ];
    };
    for (let i = 0; i <= BOND_SEG; i++) {
      const t = i / BOND_SEG;
      const p = at(t);
      // Rails ride the LOCAL tangent — a bowed centre line has no single
      // perpendicular, and offsetting every point by the chord's normal
      // pinches the ribbon at the bulge.
      const a = at(Math.max(0, t - 0.03));
      const b = at(Math.min(1, t + 0.03));
      const tx = b[0] - a[0], tz = b[2] - a[2];
      const tl = Math.hypot(tx, tz) || 1;
      const px = (-tz / tl) * w, pz = (tx / tl) * w;
      pos[(i * 2) * 3] = p[0] - px; pos[(i * 2) * 3 + 1] = p[1]; pos[(i * 2) * 3 + 2] = p[2] - pz;
      pos[(i * 2 + 1) * 3] = p[0] + px; pos[(i * 2 + 1) * 3 + 1] = p[1]; pos[(i * 2 + 1) * 3 + 2] = p[2] + pz;
    }
    m.geometry.attributes.position.needsUpdate = true;
    m.geometry.computeBoundingSphere();
  }
  // The bond's above-plane arc: three ribbons (glow / ink / core). Built on
  // demand and pooled; one is also parked at boot (prewarm below).
  function makeBondArc(color = HEAL) {
    const arc = new Group();
    // Widths are HALF-widths in world units; at gameplay zoom the ground
    // plane runs ~90-100 px/u, so this is an ~8 px Bright Heal line inside a
    // ~4 px charcoal rim inside a feathered ~36 px glow — the same
    // core/ink/halo proportion the heal bolt wears in flight.
    const arcGlow = makeBondRibbon(0.19, ribbonMat(color, 0.26, { additive: true, feather: true }));
    arcGlow.renderOrder = 11;
    arcGlow.name = 'arcGlow';
    const arcInk = makeBondRibbon(0.085, ribbonMat(PALETTE.voidCharcoal, 0.62));
    arcInk.renderOrder = 12;
    arcInk.name = 'arcInk';
    const arcCore = makeBondRibbon(0.042, ribbonMat('#ffffff', 0.94));
    arcCore.renderOrder = 13;
    arcCore.name = 'arcCore';
    arc.add(arcGlow);
    arc.add(arcInk);
    arc.add(arcCore);
    return arc;
  }
  function spawnBeam(x0, z0, x1, z1, color = HEAL) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) return;
    let b = beamPool.pop();
    if (!b) {
      const g = new Group();
      // fix-CAMPAIGN-r6 (GC.6): constant strips — shared, so the pool's high-water adds no GL geometry
      const core = new Mesh(sharedGeo('sfx-beam-core', () => new PlaneGeometry(1, 0.09)), groundMat(color, 0.85));
      core.rotation.x = -Math.PI / 2;
      core.renderOrder = -4;
      core.name = 'core';
      const glow = new Mesh(sharedGeo('sfx-beam-glow', () => new PlaneGeometry(1, 0.3)), groundMat(color, 0.35));
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
    const arc = arcPool.pop() || makeBondArc(color);
    const sh = bondShape(x0, z0, x1, z1, beams.filter((v) => v.age === 0).map((v) => v.dir));
    for (const name of ['arcGlow', 'arcInk', 'arcCore']) {
      const m = arc.getObjectByName(name);
      if (name === 'arcInk') m.material.color.copy(exactColor(PALETTE.voidCharcoal));
      // The core is a REPLACEMENT pixel, so it is authored through the post
      // chain's inverse and capped under the bloom threshold: what lands on
      // screen is the palette hex, and it cannot bloom itself back to white.
      else if (name === 'arcCore') m.material.color.copy(underBloom(exactColor(color === HEAL ? HEAL_CORE : color)));
      else m.material.color.set(color);
      aimBondRibbon(m, x0, z0, x1, z1, sh);
    }
    root.add(arc);
    beams.push({ g: b, arc, age: 0, life: 0.42, dir: [sh.sx, sh.sz] });
    // Motes strung along the link so the layer count holds everywhere — and
    // along the ARC itself, so the above-plane slice carries its own particle
    // layer instead of borrowing the ground rail's (§19.4 >=3 layers).
    const n = Math.max(2, Math.round(len * 2));
    for (let i = 1; i < n; i++) {
      spawnMotes(x0 + (dx * i) / n, z0 + (dz * i) / n, { color, count: 1, spread: 0.08 });
    }
    for (const t of [0.3, 0.5, 0.7]) {
      const bulge = sh.bow * Math.sin(Math.PI * t);
      spawnMotes(x0 + dx * t + sh.sx * bulge, z0 + dz * t + sh.sz * bulge, {
        color,
        count: 1,
        spread: 0.06,
        y: sh.endY + 4 * (sh.apexY - sh.endY) * t * (1 - t),
        riseMin: 0.25,
        riseMax: 0.6,
      });
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
      // fix-CAMPAIGN-r6 (GC.6): the wedge's five shapes are constants of the skill table — shared.
      const fill = new Mesh(
        sharedGeo('sfx-wave-fill', () => new CircleGeometry(WAVE.range, 26, -wedgeHalf, wedgeHalf * 2)),
        groundMat(HEAL, 0.3)
      );
      fill.rotation.x = -Math.PI / 2;
      fill.renderOrder = -5;
      fill.name = 'fill';
      const rim = new Mesh(
        sharedGeo('sfx-wave-rim', () => new RingGeometry(WAVE.range * 0.9, WAVE.range, 26, 1, -wedgeHalf, wedgeHalf * 2)),
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
        sharedGeo('sfx-wave-curtain', () => new CylinderGeometry(WAVE.range, WAVE.range, WAVE_WALL, 26, 1, true, -wedgeHalf, wedgeHalf * 2)),
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
      // FIX ROUND 2 — the crest is the wave's SIGNAL layer, so it is the one
      // layer that does not negotiate with the party's silhouettes. Two
      // changes, both borrowed from the bond ribbon that failed the same test:
      //   * NON-ADDITIVE Bright Heal. An additive green crest crossing the
      //     party's cream fur can only add toward white (the bond measured
      //     hue 51-68 / sat 0.09 doing exactly that); a replacement pixel
      //     authored through the post-chain inverse lands on the palette hex
      //     whatever it crosses, and `underBloom` stops it blowing itself out.
      //   * depthTest OFF, so the wave FRONT is one continuous line through
      //     the bunch instead of four disconnected slivers between bodies —
      //     which is the whole point of the above-plane slice (Round C F3).
      // The curtain body below it still depth-tests, so the volume of light
      // stays behind the characters and only the leading edge crosses them.
      const crest = new Mesh(
        sharedGeo('sfx-wave-crest', () => new CylinderGeometry(WAVE.range * 1.008, WAVE.range * 1.008, 0.06, 26, 1, true, -wedgeHalf, wedgeHalf * 2)),
        ribbonMat('#ffffff', 0.9)
      );
      crest.material.color.copy(underBloom(exactColor(HEAL_CORE)));
      crest.position.y = WAVE_WALL / 2;
      crest.renderOrder = 11;
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
        sharedGeo('sfx-wave-ink', () => new CylinderGeometry(WAVE.range * 1.004, WAVE.range * 1.004, 0.14, 26, 1, true, -wedgeHalf, wedgeHalf * 2)),
        ribbonMat('#ffffff', 0.55)
      );
      inkEdge.material.color.copy(exactColor(PALETTE.voidCharcoal));
      inkEdge.position.y = WAVE_WALL / 2 - 0.084;
      inkEdge.renderOrder = 10; // rides with the crest, under it
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
  const boltCoreGeo = markShared(new CapsuleGeometry(0.092, 0.20, 4, 10)); // +22% radius: the old core was ~10 px in flight, thin enough that FXAA blended its whole width into the grass
  // VFX redesign (docs/gauntlet/design-VFX.md): a damage bolt wears its
  // caster's class — the Healer's lantern orb stays Hearth Amber, an Archer
  // arrow is a long thin Wind Jade dart. The skill id names the class
  // (data/vfx.js vfxSkillClass); heal bolts keep Bright Heal for everyone.
  function makeBoltRig(heal, skill = null) {
    const vs = vfxClassStyle(vfxSkillClass(skill) ?? 'healer');
    const AMBER = heal ? HEAL : vs.glow;
    const arrow = !heal && vs.bolt.look === 'arrow';
    const g = new Group();
    const core = new Mesh(
      boltCoreGeo,
      new MeshBasicMaterial({
        // Authored through the post-chain inverse so the pixel that lands on
        // screen IS the palette hex (§19.1), not what ACES makes of it.
        // Certification fix round 1 (2026-09-09): a Volley fires three of these
        // at once and the party stands in the lane. At full Parchment the core
        // sits ABOVE the composer's 0.85 bloom threshold, so three overlapping
        // bolts summed into one blown white mass that swallowed the tank, the
        // swordsman and the archer (REFERENCE_BAR check 3, scored 1 by all
        // three scorers: "one bloom-blown white mass at 50%"). The damage core
        // is pushed just under the threshold — it is still the brightest thing
        // on the bolt and still reads Parchment, it just stops being its own
        // light source. The heal core keeps its solved value (its hue is the
        // thing being protected there, see the note above).
        color: heal ? exactColor(HEAL_CORE) : underBloom(exactColor(PARCH)),
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
    ink.scale.setScalar(1.46);
    ink.renderOrder = 4;
    g.add(ink);
    // COLOURED SHELL between the white core and the ink line. Round 2 measured
    // a bolt box as ">200 11.033% but amber 1 / danger 0 — a white pill plus
    // white bloom": the additive halo's bright middle sits BEHIND the pill and
    // its dark hull, so the only colour that escaped was a one-pixel fringe.
    // Colour now lives on the projectile itself — white-hot core, Hearth Amber
    // (or Bright Heal) shell, ink line, glow — which is reference D's
    // "white-hot core + orange glow" read at any zoom and does not add a single
    // photon to the bloom pass.
    const shell = new Mesh(
      boltCoreGeo,
      new MeshBasicMaterial({
        color: underBloom(exactColor(heal ? HEAL : AMBER)),
        side: BackSide,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: false,
      })
    );
    shell.rotation.z = Math.PI / 2;
    shell.position.y = BOLT_Y;
    shell.scale.set(1.3, 1.24, 1.3);
    shell.renderOrder = 5;
    g.add(shell);
    // Glow pulled down with the core: the halo is what actually stacked
    // between neighbouring bolts (additive), so it loses a third of its
    // strength and a fifth of its radius. Three bolts now read as three.
    // Wider but no brighter: the halo spreads past the ink line so it reads as
    // a light around the bolt, while its peak stays where round 1 put it (three
    // Volley bolts must not sum back into one blown white mass).
    const glow = makeGlowSprite({ color: heal ? HEAL : AMBER, size: arrow ? 0.62 : 0.86, opacity: arrow ? 0.42 : 0.5 });
    glow.position.y = BOLT_Y;
    glow.renderOrder = 3;
    g.add(glow);
    // An arrow: the capsule stretched long and thin (its axis is local y).
    if (arrow) for (const m of [core, ink, shell]) m.scale.set(m.scale.x * 0.55, m.scale.y * 2.1, m.scale.z * 0.55);
    // Contact shadow: wide + dark enough to survive the additive glow above it
    // (§19.2 / REFERENCE_BAR check 8: every flier is grounded). It has to beat
    // the glow it sits under, so it is wider than the glow's bright core.
    g.add(blobShadow(0.2, 0.45));
    return g;
  }

  // TRAIL. Round 2: "bolts are core + glow + shadow but have no trail". They
  // did have one — 0.15 s long at 0.4 opacity, i.e. a 0.8 u smear the bolt's
  // own body covered. It is twice as long and half again as strong now, and it
  // TAPERS: each dot shrinks as it fades, so the trail reads as a wake behind
  // the projectile instead of a row of equal blobs.
  let boltSparkDebt = 0;
  const trails = [];
  const trailPool = [];
  function spawnTrailDot(x, z, color) {
    let s = trailPool.pop();
    if (!s) s = makeGlowSprite({ color, size: 0.34, opacity: 0.62 });
    s.material.color.set(color);
    s.material.opacity = 0.62;
    s.scale.set(0.34, 0.34, 1);
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
    // Zone rigs are built per sim zone entity and dropped when it expires:
    // every disc, rim and wall below is shared per radius (F1).
    // fix-CAMPAIGN-r6 (GC.6): UNIT shapes scaled to the radius — keyed by
    // radius, every new zone radius a build reached (Reach nodes) minted four
    // GL geometries that were never released.
    const fill = new Mesh(sharedGeo('zone-fill:unit', () => new CircleGeometry(1, 40)), groundMat(HEAL, 0.13));
    fill.scale.set(radius, radius, 1);
    fill.rotation.x = -Math.PI / 2;
    fill.renderOrder = -6;
    g.add(fill);
    const inner = new Mesh(sharedGeo('zone-inner:unit', () => new CircleGeometry(1, 32)), groundMat(HEAL, 0.18));
    inner.scale.set(radius * 0.55, radius * 0.55, 1);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.004;
    inner.renderOrder = -6;
    g.add(inner);
    const rim = new Mesh(sharedGeo('zone-rim:unit', () => new RingGeometry(0.93, 1, 44)), groundMat(HEAL, 0.55));
    rim.scale.set(radius, radius, 1);
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
      sharedGeo('zone-wall:unit', () => new CylinderGeometry(1, 1, ZONE_WALL, 44, 1, true)),
      riseMat(HEAL, 0.20)
    );
    wall.scale.set(radius, 1, radius);
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
  bus.on('aura_pulse', (ev) => {
    if (ev && ev.skill && ev.skill !== 'warding_aura') return; // Quiet Hearth: ./content.js
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
    if (CONTENT_CAST_SKILLS.has(ev.skill)) return;
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
      const glow = vfxClassStyle(vfxSkillClass(ev.skill) ?? 'healer').glow;
      spawnFlash(ev.x, BOLT_Y, ev.z, { color: PARCH, size: 0.28, opacity: 0.95, life: 0.16, grow: 0.3 });
      spawnFlash(ev.x, BOLT_Y, ev.z, { color: glow, size: 0.55, opacity: 0.7, life: 0.25, grow: 0.5 });
      spawnMotes(ev.x, ev.z, { color: glow, count: 5, y: BOLT_Y - 0.15, riseMin: 0.3, riseMax: 0.8, lifeMin: 0.25, lifeMax: 0.45 });
    }
  });

  // ---------------------------------------------------------------- update --
  // --- first-draw warm-up (certification fix D-r1, see render/warmup.js): the
  // heal bolt, the damage bolt and a Sanctuary zone are drawn once at boot so
  // the first cast of a room does not pay the driver's first-draw cost.
  let warmFrames = 0;
  let warmed = false;
  function prewarm() {
    warmed = true;
    warmPark(root, makeBoltRig(true));
    warmPark(root, makeBoltRig(false));
    warmPark(root, makeZoneRig(SKILLS.sanctuary ? SKILLS.sanctuary.area : 1.5));
    // gauntlet r4 J4-F1 (INT): the Swift Mend bond arc — transparent,
    // double-sided ribbons, i.e. a back-face and a front-face program each —
    // linked 4 programs on the first Swift Mend of the first fight (a 55-109 ms
    // frame ~6 s into Level 1 room 1). Parked with a real bowed shape, then
    // handed to the arc pool.
    const warmArc = makeBondArc(HEAL);
    const wsh = bondShape(0, 0, 2, 0, []);
    for (const m of warmArc.children) aimBondRibbon(m, 0, 0, 2, 0, wsh);
    warmPark(root, warmArc, (g) => {
      for (const m of g.children) m.frustumCulled = false; // world-space ribbons (makeBondRibbon)
      arcPool.push(g);
    });
  }

  let lastElapsed = null;
  function update(tSec, alpha = 1) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastElapsed));
    lastElapsed = tSec;
    if (!warmed && ++warmFrames > 12) prewarm();
    // Skill bolts: sync to sim, orient along flight, leave a trail.
    const seen = new Set();
    const sparkAt = []; // bolt positions eligible for a spark this frame
    for (const e of world.entities()) {
      if (e.kind !== 'skillbolt') continue;
      seen.add(e.id);
      let g = boltRigs.get(e.id);
      if (!g) {
        g = makeBoltRig(e.heal, e.skill);
        g.userData.trail = e.heal ? HEAL : vfxClassStyle(vfxSkillClass(e.skill) ?? 'healer').glow;
        boltRigs.set(e.id, g);
        root.add(g);
      }
      const bx = e.px + (e.x - e.px) * alpha;
      const bz = e.pz + (e.z - e.pz) * alpha;
      g.position.set(bx, 0, bz);
      g.getObjectByName('core').rotation.y = Math.atan2(e.vz, -e.vx);
      spawnTrailDot(bx, bz, g.userData.trail);
      sparkAt.push({ x: bx, z: bz, heal: !!e.heal, color: g.userData.trail });
    }
    for (const [id, g] of boltRigs) {
      if (!seen.has(id)) {
        root.remove(g);
        releaseTree(g); // core capsule + shadow disc are shared; the materials are per-bolt
        boltRigs.delete(id);
      }
    }
    // The bolt's PARTICLE layer (REFERENCE_BAR check 5 wants core + glow +
    // particles on every attack effect, and round 2 read state().vfx.particles as
    // 3-6 through a whole fight). Rate-limited across all live bolts so a
    // Volley costs the same as a basic shot.
    if (sparkAt.length > 0) {
      boltSparkDebt += BOLT_SPARK_HZ * dt * sparkAt.length;
      let n = Math.min(4, Math.floor(boltSparkDebt));
      boltSparkDebt -= n;
      for (let i = 0; i < n; i++) {
        const b = sparkAt[i % sparkAt.length];
        impactFx.impact(b.x, b.z, { color: b.color, n: 1 });
      }
    } else boltSparkDebt = 0;
    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i];
      tr.age += dt;
      const k = 1 - tr.age / TRAIL_FADE;
      if (k <= 0) {
        root.remove(tr.s);
        trailPool.push(tr.s);
        trails.splice(i, 1);
      } else {
        tr.s.material.opacity = 0.62 * k * k;
        const w = 0.34 * (0.34 + 0.66 * k); // taper: a wake, not a bead chain
        tr.s.scale.set(w, w, 1);
      }
    }

    // Zones: sync rigs to sim zone entities; breathe; drip motes.
    const seenZones = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'zone' || e.damage) continue; // damage zones: ./content.js
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
        releaseTree(rig.g);
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
      // §19.4 "instant impacts hold >=3-5 frames". The old ribbon started
      // fading on frame 1, so the frame a critic freezes one tick after
      // skill_cast already had the core at 0.6 — the same hold envelope the
      // wave crest uses keeps the shape at full value for ~7 frames first.
      const HOLD = 0.4;
      const tail = t <= HOLD ? 1 : 1 - (t - HOLD) / (1 - HOLD);
      b.g.getObjectByName('core').material.opacity = 0.85 * (1 - t);
      b.g.getObjectByName('glow').material.opacity = 0.35 * (1 - t);
      b.arc.getObjectByName('arcCore').material.opacity = 0.94 * Math.pow(tail, 0.7);
      b.arc.getObjectByName('arcInk').material.opacity = 0.62 * Math.pow(tail, 0.7);
      b.arc.getObjectByName('arcGlow').material.opacity = 0.26 * Math.pow(tail, 1.4);
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

  // @gnt:M2 RESTORE-RESYNC begin — after a load the bolt / zone ids may name
  // other entities: drop those rigs silently (update() rebuilds them) and
  // re-read the two event-fed flags (aura owned, heal override) from the sim.
  bus.on('state_restored', () => {
    for (const g of boltRigs.values()) {
      root.remove(g);
      releaseTree(g);
    }
    boltRigs.clear();
    for (const rig of zoneRigs.values()) {
      root.remove(rig.g);
      releaseTree(rig.g);
    }
    zoneRigs.clear();
    const snap = world.snapshotState();
    auraOn = (snap.skills || []).some((s) => s && s.id === 'warding_aura');
    overrideIndex = snap.healOverride ?? null;
  });
  // @gnt:M2 RESTORE-RESYNC end
  // fix-CAMPAIGN-r6 (CR6-F2, PLAN §12.5 teardown): a level boundary returns
  // every in-flight flourish to its pool and the pooled bond arcs hand their
  // GL buffers back (the ribbons are per-record world-space geometry; the
  // record and its arrays are kept and three re-uploads them on the arc's
  // next use) — the pool's high-water mark follows frame timing, so without
  // this a later campaign could start a level with 3-6 more geometries
  // registered than an identical earlier one. Bolt / zone rigs are per entity
  // and already leave with their entities.
  function levelTeardown() {
    const back = (list, pool, key) => {
      for (const r of list.splice(0)) {
        const o = r[key];
        root.remove(o);
        pool.push(o);
      }
    };
    back(motes, motePool, 's');
    back(flashes, flashPool, 's');
    back(glyphs, glyphPool, 's');
    back(rings, ringPool, 'm');
    back(trails, trailPool, 's');
    back(wedges, wedgePool, 'g');
    for (const b of beams.splice(0)) {
      root.remove(b.g);
      beamPool.push(b.g);
      root.remove(b.arc);
      arcPool.push(b.arc);
    }
    for (const arc of arcPool) for (const m of arc.children) if (m.geometry) m.geometry.dispose();
  }
  bus.on('level_transit', levelTeardown);
  bus.on('run_end', levelTeardown);
  bus.on('return_to_camp', levelTeardown);
  return { update, debugCounts };
}
