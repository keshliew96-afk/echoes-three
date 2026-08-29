// Ally render layer (ally block) — the render side of §7 kits / §8 mark /
// §10 downed+revive / §12 ally AI, mounted from main.js beside the skill-FX
// and enemy layers:
//
//   - the three party critters ride their sim bodies (interpolated px/pz ->
//     x/z), yaw smoothly toward the AI facing, and arbitrate the existing
//     critter clips exactly like the Healer does: downed > hurt > attack
//     (cast) > walk > idle
//   - §17 Zone 3 Signal Blue mark reticle on the Tab-marked enemy: a GLYPH
//     (thin ring + four brackets + overhead caret), never a fill
//   - §10/§17 revive furniture on every Downed body: a hollow Bone ring with
//     the hold-E glyph while nobody is channelling, and a Parchment radial
//     fill on an OPAQUE Void Charcoal backing plate — clockwise from 12
//     o'clock, concentric OUTSIDE the (collapse-grown) identity ring — while
//     one is. An interrupt keeps the ring on screen and drains it backwards at
//     2x (the sim owns that value; this layer just draws it). The whole
//     instrument is drawn by InkOverlayPass below, AFTER UnrealBloomPass, so
//     the band lands on the exact §19.1 Parchment hex instead of clipping to
//     white and blooming the downed body out.
//   - ally kit ground_aoe zones (Ground Crack / Caltrops / Detonating Charge)
//     as layered discs + rim + motes, in the party's Parchment/Hearth Amber
//     damage family (§19.4 — never Ember, which is enemy-only, and never
//     Bright Heal, which is heal-only)
//   - melee-arc swipe wedges and nova rings for ally attacks, so every ally
//     hit is a >=3-layer event (core + glow + particles) like the player's
//
// Render-only: reads sim state and the event bus, never mutates either.
import {
  AdditiveBlending,
  Vector3,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PALETTE } from '../../data/palette.js';
import { TICK_HZ } from '../../core/constants.js';
import { makeGlowSprite } from '../glow.js';
import { createCritter, FALL_ANGLE } from '../critters/index.js';
import { exactColor, exactHex } from '../critters/common.js';
import { ALLY_CLASSES, REVIVE } from '../../sim/allies.js';

const PARCH = PALETTE.parchment;
const AMBER = PALETTE.hearthAmber;
const BONE = PALETTE.bone;
const CHARCOAL = PALETTE.voidCharcoal;
const SIGNAL = PALETTE.signalBlue; // §19.1: mark reticle glyph, glyph/ink only

// Clip arbitration (mirrors the Healer's in scenes/arena.js so the whole party
// reads with one grammar).
const CAST_PHASE = 0.45; // s into the cast clip = the release pop
const CAST_HOLD = 0.34; // s the attack pose holds
const HURT_HOLD = 0.62; // s — snap + held flinch
const MOVE_EPS = 0.3; // u/s of sim speed above which the walk clip drives
const YAW_RATE = 10; // 1/s exponential smoothing toward the AI facing

// §10/§17 revive furniture. The ring sits outside a DOWNED critter's identity
// ring (the collapse grows that ring to cover the horizontal silhouette), and
// at the 12 u / 52° gameplay rig a 1.1 u outer radius projects to ~180 px
// across — far over the §17 ">=48 px on screen" floor.
//
// PLATE GEOMETRY. §17 asks for the fill on "a charcoal backing disc,
// concentric OUTSIDE the downed ally's identity ring", and §10 also requires
// that "identity ring stays visible" on a downed body. Both hold only if the
// plate is an ANNULUS: opaque charcoal from just outside the (collapse-grown)
// identity ring out past the band, with a hole over the identity ring itself.
// The radii are measured, not guessed — `debugCounts().identityU` reports every
// critter's identity-ring outer radius in world units INCLUDING the collapse
// growth, and with all four down it reads healer 0.883 / tank 0.880 /
// swordsman 0.811 / archer 0.890. The old ring (inner 0.88) sat exactly ON
// that, so it was never "concentric OUTSIDE" anything; the plate now starts at
// 0.96 — a ~6 px ring of open ground clear of the widest identity ring — and
// the band sits outside that again.
// A second constraint sets the exact radii: the plate has to be opaque at
// 0.8x the band's mid radius, because that is where the ring's "backing disc"
// is sampled. 0.8 * 1.22 = 0.976 u, comfortably inside the opaque annulus
// (0.96 u outward) and still clear of the 0.890 u identity ring.
const REVIVE_RING = Object.freeze({
  inner: 1.14,
  outer: 1.30,
  plateInner: 0.94, // hole = the identity ring's own ground
  plateLip: 0.02, // inner ramp (u) — opaque from 0.96
  plateOpaque: 1.37, // opaque charcoal out to here...
  plateOuter: 1.46, // ...then a short feather to nothing
  bezelInner: 1.33, // §17 Warm Grey chrome hairline: the plate's bezel
  bezelOuter: 1.37,
  segments: 72,
});

// ---------------------------------------------------------------------------
// §17 WORLD-SPACE INSTRUMENT PASS  (round-2 fix, criterion 3)
//
// The revive ring is HUD ink rendered AT the thing (§17 Zone 3), not a light.
// Drawn inside the main RenderPass it CANNOT be both:
//
//   * on-hex — `exactColor('#F4EFE6')` inverts the ACES+grade chain and lands
//     on an authored LINEAR value of (0.914, 1.144, 1.382), luminance 1.112;
//   * non-blooming — stage.js runs UnrealBloomPass at threshold 0.68 linear
//     with a 0.01 smooth width, so anything over 0.69 is passed into the mip
//     chain at FULL colour and re-added at strength 1.15.
//
// 1.112 >> 0.69, so a correctly-valued Parchment arc necessarily blew a halo
// over the downed body (measured: 87.4% of a 150x110 box over the body above
// luma 200, band pixels clipped to #FFFFF2). Capping the arc under the
// threshold instead (the `underBloom` idiom used for identity rings) tops out
// at display luma ~224 — off the §19.1 hex the other way.
//
// So the ring is drawn in its own tiny scene by a pass inserted AFTER
// UnrealBloomPass and BEFORE OutputPass. That is the only seam where both
// hold: bloom has already run (the ring contributes zero energy to it), and
// ACES + the grade shader still run afterwards, so `exactColor` stays valid
// and the band lands on #F4EFE6 exactly. Both UnrealBloomPass and RenderPass
// have needsSwap=false and target `readBuffer`, so the buffer this pass draws
// into is the SAME render target RenderPass filled — its depth attachment
// still holds the scene depth, so the ring is depth-tested against the world
// exactly as it was before and can still be occluded by bodies and props.
class InkOverlayPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.needsSwap = false;
  }

  render(renderer, writeBuffer, readBuffer) {
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false; // additive over the composited frame + its depth
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
  }
}

let plateTex = null;
// Alpha mask for the charcoal plate: a hole for the identity ring, an opaque
// annulus under the whole band, and a short outer feather so the plate reads
// as an instrument seated on the ground instead of a punched-out black disc.
// Pure white RGB — the CHARCOAL comes from the material colour, so the plate
// is exactly the §19.1 Void Charcoal hex wherever alpha is 1.
function getPlateTexture() {
  if (plateTex) return plateTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const half = S / 2;
  const R = REVIVE_RING.plateOuter;
  const i0 = REVIVE_RING.plateInner;
  const fo = REVIVE_RING.plateOpaque;
  const feather = R - fo;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - half) / half;
      const dy = (y + 0.5 - half) / half;
      const r = Math.hypot(dx, dy) * R;
      let a = 0;
      if (r >= i0 && r <= R) {
        a = 1;
        if (r < i0 + REVIVE_RING.plateLip) a = (r - i0) / REVIVE_RING.plateLip;
        if (r > fo) a = Math.min(a, 1 - (r - fo) / feather);
      }
      const o = (y * S + x) * 4;
      img.data[o] = 255;
      img.data[o + 1] = 255;
      img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  plateTex = new CanvasTexture(c);
  plateTex.colorSpace = SRGBColorSpace;
  return plateTex;
}

// §8/§17 mark reticle sizing (glyph weights, not fills).
const MARK = Object.freeze({ inner: 0.5, outer: 0.58, bracket: 0.72, caretY: 1.35 });

let eTexture = null;
// §10 "hold-E glyph over the body": Parchment E on a Void Charcoal plate, the
// same charcoal-plate grammar §17 binds for all combat text.
function getHoldETexture() {
  if (eTexture) return eTexture;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = exactHex(CHARCOAL);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.roundRect(18, 18, 92, 92, 22);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = exactHex(PARCH);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.font = '900 74px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = exactHex(PARCH);
  ctx.fillText('E', 64, 68);
  eTexture = new CanvasTexture(c);
  eTexture.colorSpace = SRGBColorSpace;
  return eTexture;
}

let markCaretTex = null;
// Signal Blue chevron — the half of the mark that ground glow can never wash
// out. Charcoal-inked so it survives a bright floor.
function getMarkCaretTexture() {
  if (markCaretTex) return markCaretTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(18, 30);
  ctx.lineTo(64, 96);
  ctx.lineTo(110, 30);
  ctx.lineTo(90, 30);
  ctx.lineTo(64, 66);
  ctx.lineTo(38, 30);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = exactHex(CHARCOAL);
  ctx.stroke();
  ctx.fillStyle = exactHex(SIGNAL);
  ctx.fill();
  markCaretTex = new CanvasTexture(c);
  markCaretTex.colorSpace = SRGBColorSpace;
  return markCaretTex;
}

// Glyph/ring materials composite NORMALLY (never additive: an additive blue
// ring over a lit green floor washes to white) and are pre-inverted through
// the post chain by exactColor, so the pixels that land on screen ARE the
// §19.1 hex — Signal Blue #4FA3D9, Parchment #F4EFE6, Bone #C9C2B3.
function flatMat(color, opacity, additive = false, depthTest = true) {
  return new MeshBasicMaterial({
    color: additive ? new Color(color) : exactColor(color),
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest,
    toneMapped: false,
    side: DoubleSide,
    ...(additive ? { blending: AdditiveBlending } : {}),
  });
}

export function createAllyLayer({ stage, world, bus, cosmetic, scene = null }) {
  const root = new Group();
  root.name = 'allyfx';
  stage.scene.add(root);

  // Post-bloom ink scene (see InkOverlayPass above): the §17 revive
  // instrument lives here so it lands on its exact palette hex without
  // feeding UnrealBloomPass. Inserted immediately BEFORE OutputPass, found by
  // type so a concurrently-added pass cannot shift the index out from under
  // it. Everything else this layer draws stays in the main scene.
  const inkScene = new Scene();
  const inkRoot = new Group();
  inkRoot.name = 'allyfx-ink';
  inkScene.add(inkRoot);
  let inkPass = null;
  // ?ink=0 removes the pass entirely (A/B knob for measuring its cost; the
  // instrument then falls back into the main scene and blooms again, so it is
  // a profiling toggle, not a shipping mode).
  const inkEnabled =
    typeof location === 'undefined' || new URLSearchParams(location.search).get('ink') !== '0';
  if (inkEnabled && stage.composer?.passes) {
    inkPass = new InkOverlayPass(inkScene, stage.camera);
    // COST GATE. Every renderer.render() that ends on a multisampled target
    // makes three.js resolve the whole 4x MSAA buffer, and on the capture
    // harness's software GL that blit is ~8 fps of a 41 fps frame. Measured:
    // al-fps6 (full party + 6 enemies) ran 40.7 mean before this pass existed
    // and 33.1 with it running unconditionally. Nobody is downed in a normal
    // fight, so the pass stays DISABLED until a revive rig actually exists and
    // the composer skips it entirely (EffectComposer honours pass.enabled).
    inkPass.enabled = false;
    const at = stage.composer.passes.findIndex((p) => p instanceof OutputPass);
    if (at >= 0) stage.composer.insertPass(inkPass, at);
    else stage.composer.addPass(inkPass);
  } else {
    // No composer (unit harness): fall back to the main scene.
    stage.scene.add(inkRoot);
  }

  const allySys = world.allySystem();

  // --- Rigs. The arena scene already builds the three party critters at their
  // camp spots; adopt those (one factory instance per character, never two)
  // and let the scene keep driving their pose clocks. Anywhere else (graybox
  // probes) this layer builds its own and drives them itself.
  const adopted = Array.isArray(scene?.allies) && scene.allies.length === 3;
  const critters = new Map(); // classId -> critter
  if (adopted) {
    for (const c of scene.allies) critters.set(c.classId, c);
  } else {
    for (const classId of ['tank', 'swordsman', 'archer']) {
      const c = createCritter(classId, { cosmetic });
      root.add(c.group);
      critters.set(classId, c);
    }
  }
  const rigState = new Map(); // classId -> { yaw, castLeft, hurtLeft }
  for (const classId of critters.keys()) rigState.set(classId, { yaw: 0, castLeft: 0, hurtLeft: 0 });

  const allyEntities = () => world.entities().filter((e) => e.kind === 'ally');
  const byId = (id) => world.entities().find((e) => e.id === id) ?? null;

  // ------------------------------------------------------------ bus wiring --
  bus.on('ally_basic', (ev) => {
    const st = rigState.get(ev.classId);
    if (st) st.castLeft = CAST_HOLD;
    if (ev.shape === 'melee_arc') spawnWedge(ev, ev.reach, ev.halfAngle, 0.28);
  });
  bus.on('ally_cast', (ev) => {
    const st = rigState.get(ev.classId);
    if (st) st.castLeft = CAST_HOLD;
    if (ev.shape === 'melee_arc') spawnWedge(ev, ev.reach, ev.halfAngle, 0.4);
    else if (ev.shape === 'nova') {
      spawnRing(ev.x, ev.z, { from: 0.25, to: ev.radius, life: 0.4, opacity: 0.85 });
      spawnFlash(ev.x, 0.5, ev.z, { color: PARCH, size: 0.4, opacity: 0.95, life: 0.2, grow: 0.4 });
      spawnFlash(ev.x, 0.5, ev.z, { color: AMBER, size: 0.85, opacity: 0.6, life: 0.32, grow: 0.7 });
      spawnMotes(ev.x, ev.z, { count: 9, spread: ev.radius * 0.8 });
    }
  });
  bus.on('hit', (ev) => {
    const a = byId(ev.target);
    if (a && a.kind === 'ally') {
      const st = rigState.get(a.classId);
      if (st) st.hurtLeft = HURT_HOLD;
    }
  });
  // §17 "interrupt = reverse drain at 2x speed". The SIM's drain record is the
  // only arc when nothing restarts (a reviver forced to walk away), but a
  // reviver that is merely flinched is still holding E and standing still, so
  // §10 lets it open a FRESH channel on the very next tick — which replaced the
  // draining record and made the ring snap 0.56 -> 0 with no visible unwind.
  // The reset is therefore also tracked here, render-side: one drain per body,
  // seeded from the event's own progress and unwound at the sim's own rate
  // (drainMult ticks per tick => 2 * TICK_HZ / channelTicks of the ring per
  // second). The arc drawn is max(live channel, drain), so in the move case it
  // is identical to the sim's own arc and in the flinch case the ring runs
  // backwards at 2x and is overtaken by the restarted fill.
  const DRAIN_PCT_PER_SEC = (REVIVE.drainMult * TICK_HZ) / REVIVE.channelTicks;
  const drains = new Map(); // body id -> remaining ring fraction
  bus.on('revive_break', (ev) => {
    const pct = typeof ev.pct === 'number' ? ev.pct : 0;
    if (pct > 0) drains.set(ev.target, Math.max(drains.get(ev.target) ?? 0, pct));
  });
  bus.on('revive', (ev) => drains.delete(ev.target));
  bus.on('azone_tick', (ev) => {
    const rig = zoneRigs.get(ev.id);
    if (!rig) return;
    rig.pulseT = 0.35;
    spawnRing(rig.g.position.x, rig.g.position.z, {
      from: 0.25,
      to: rig.radius,
      life: 0.3,
      opacity: 0.6,
    });
    spawnMotes(rig.g.position.x, rig.g.position.z, { count: 5, spread: rig.radius * 0.8 });
  });
  bus.on('revive', (ev) => {
    const m = byId(ev.target);
    if (!m) return;
    spawnRing(m.x, m.z, { from: REVIVE_RING.outer, to: 0.3, life: 0.5, opacity: 0.9, color: PARCH });
    spawnFlash(m.x, 0.6, m.z, { color: PARCH, size: 0.8, opacity: 0.95, life: 0.4, grow: 0.6 });
    spawnMotes(m.x, m.z, { count: 12, spread: 0.5, color: PARCH });
  });

  // ------------------------------------------------------------ mark glyph --
  // §17 Zone 3: "Signal Blue mark reticle on the Tab-marked enemy (glyph,
  // never a fill)". Ring outline + four corner brackets + overhead chevron;
  // the shape channel (brackets) carries the state, not the colour alone.
  const markGroup = new Group();
  markGroup.name = 'mark-reticle';
  const markRing = new Mesh(
    new RingGeometry(MARK.inner, MARK.outer, 48),
    flatMat(SIGNAL, 0.95)
  );
  markRing.rotation.x = -Math.PI / 2;
  markRing.renderOrder = -3;
  markGroup.add(markRing);
  const bracketGeo = new PlaneGeometry(0.1, 0.3);
  for (let i = 0; i < 4; i++) {
    const b = new Mesh(bracketGeo, flatMat(SIGNAL, 1));
    b.rotation.x = -Math.PI / 2;
    b.rotation.z = -(Math.PI / 4 + (i * Math.PI) / 2);
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    b.position.set(Math.cos(a) * MARK.bracket, 0.004, Math.sin(a) * MARK.bracket);
    b.renderOrder = -3;
    markGroup.add(b);
  }
  const markCaret = new Sprite(
    new SpriteMaterial({
      map: getMarkCaretTexture(),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
  );
  markCaret.scale.set(0.44, 0.44, 1);
  markCaret.position.set(0, MARK.caretY, 0);
  markCaret.renderOrder = 21;
  markGroup.add(markCaret);
  markGroup.position.y = 0.034;
  markGroup.visible = false;
  root.add(markGroup);

  // --------------------------------------------------------- revive rings --
  // One record per downed body: charcoal backing disc, hollow Bone ring, the
  // clockwise Parchment progress arc, and the hold-E glyph.
  const reviveRigs = new Map(); // entity id -> record
  const revivePool = [];

  function makeReviveRig() {
    const g = new Group();
    // §17: "Parchment radial fill on a charcoal backing disc". OPAQUE (round-2
    // fix): the plate is the instrument's dark ground, so the Parchment band
    // reads as ink drawn ON something rather than as a light hanging in the
    // grass. Painted through an alpha mask with a hole over the identity ring
    // (§10 "identity ring stays visible") and a short outer feather.
    const backing = new Mesh(
      new PlaneGeometry(REVIVE_RING.plateOuter * 2, REVIVE_RING.plateOuter * 2),
      new MeshBasicMaterial({
        map: getPlateTexture(),
        color: exactColor(CHARCOAL),
        transparent: true,
        opacity: 1,
        depthWrite: false,
        toneMapped: false,
      })
    );
    backing.rotation.x = -Math.PI / 2;
    backing.position.y = 0.024;
    backing.renderOrder = -5;
    backing.name = 'backing';
    g.add(backing);
    // §17 HUD chrome: a Warm Grey #9C9186 hairline bezel around the plate, so
    // the charcoal reads as an instrument plate seated on the ground rather
    // than a hole punched in it.
    const bezel = new Mesh(
      new RingGeometry(REVIVE_RING.bezelInner, REVIVE_RING.bezelOuter, 60),
      flatMat(PALETTE.warmGrey, 0.6, false, false)
    );
    bezel.rotation.x = -Math.PI / 2;
    bezel.position.y = 0.026;
    bezel.renderOrder = -4;
    g.add(bezel);
    // Charcoal TRACK: the band's own ink plate, a hair wider than the band on
    // both sides. The big plate above is depth-tested so it stays a decal on
    // the ground and is correctly hidden by the kneeling reviver — but the
    // band itself must never lose its dark ground, so from here down the
    // instrument is depth-INDEPENDENT (§17 Zone 3 rings are read "under
    // occlusion") and carries this track with it.
    const track = new Mesh(
      new RingGeometry(REVIVE_RING.inner - 0.055, REVIVE_RING.outer + 0.055, 60),
      flatMat(CHARCOAL, 0.96, false, false)
    );
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.027;
    track.renderOrder = -4;
    g.add(track);
    // 12 o'clock start notch, inked into the plate: the fixed datum the fill
    // sweeps away from, so "clockwise from 12" is legible in one still frame.
    const notch = new Mesh(
      new PlaneGeometry(0.05, REVIVE_RING.outer - REVIVE_RING.inner + 0.16),
      flatMat(BONE, 0.85, false, false)
    );
    notch.rotation.x = -Math.PI / 2;
    notch.position.set(0, 0.028, -(REVIVE_RING.inner + REVIVE_RING.outer) / 2);
    notch.renderOrder = -3.5;
    g.add(notch);
    // §10: hollow BONE ring — the "nobody is reviving me" readout. Lifted to
    // 0.9 now that it sits on an opaque charcoal plate instead of lit grass.
    const hollow = new Mesh(
      new RingGeometry(REVIVE_RING.inner, REVIVE_RING.outer, 56),
      flatMat(BONE, 0.9, false, false)
    );
    hollow.rotation.x = -Math.PI / 2;
    hollow.position.y = 0.03;
    hollow.renderOrder = -3;
    hollow.name = 'hollow';
    g.add(hollow);
    // Clockwise-from-12 progress arc: thetaStart = +Y (which maps to world -Z
    // = screen up after the -90° X rotation) and a NEGATIVE sweep, so
    // revealing index segments walks 12 -> 3 -> 6 o'clock.
    const fillGeo = new RingGeometry(
      REVIVE_RING.inner,
      REVIVE_RING.outer,
      REVIVE_RING.segments,
      1,
      Math.PI / 2,
      -Math.PI * 2
    );
    // Flat, opaque, unlit Parchment. Nothing is stacked on top of it: the
    // previous additive twin (and the additive head bead below) is exactly
    // what clipped the band to #FFFFF2 and blew the halo. Rendered by
    // InkOverlayPass after bloom, so this material's on-screen value is
    // whatever `exactColor` solves for — #F4EFE6, measured.
    const fill = new Mesh(fillGeo, flatMat(PARCH, 1, false, false));
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.034;
    fill.renderOrder = -2;
    fill.name = 'fill';
    fill.geometry.setDrawRange(0, 0);
    g.add(fill);
    // Head-of-arc needle: the moving "now" marker that makes the sweep
    // DIRECTION legible in a single still frame. A radial Parchment tick —
    // ink on the plate, NOT an additive glow bead.
    const head = new Mesh(
      new PlaneGeometry(0.06, REVIVE_RING.outer - REVIVE_RING.inner + 0.18),
      flatMat(PARCH, 1, false, false)
    );
    head.rotation.x = -Math.PI / 2;
    head.position.y = 0.038;
    head.renderOrder = -1;
    head.name = 'head';
    head.visible = false;
    g.add(head);
    const glyph = new Sprite(
      new SpriteMaterial({
        map: getHoldETexture(),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      })
    );
    glyph.scale.set(0.42, 0.42, 1);
    glyph.position.set(0, 1.05, 0);
    glyph.renderOrder = 22;
    glyph.name = 'glyph';
    g.add(glyph);
    return g;
  }

  function acquireReviveRig() {
    const g = revivePool.pop() ?? makeReviveRig();
    inkRoot.add(g);
    return g;
  }

  // ----------------------------------------------------------- ally zones --
  // §19.4 AoE grammar: layered translucent discs + rim + particles. Party
  // damage family = Parchment core over a Hearth Amber glow.
  const zoneRigs = new Map(); // azone id -> { g, radius, pulseT, moteClock }
  function makeZoneRig(radius) {
    const g = new Group();
    const fill = new Mesh(new CircleGeometry(radius, 36), flatMat(AMBER, 0.14, true));
    fill.rotation.x = -Math.PI / 2;
    fill.renderOrder = -6;
    g.add(fill);
    const inner = new Mesh(new CircleGeometry(radius * 0.5, 28), flatMat(PARCH, 0.16, true));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.004;
    inner.renderOrder = -6;
    g.add(inner);
    const rim = new Mesh(new RingGeometry(radius * 0.9, radius, 40), flatMat(AMBER, 0.6, true));
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.006;
    rim.renderOrder = -5;
    rim.name = 'rim';
    g.add(rim);
    const halo = makeGlowSprite({ color: AMBER, size: radius * 2.2, opacity: 0.22 });
    halo.position.y = 0.22;
    g.add(halo);
    return g;
  }

  // -------------------------------------------------------------- FX pools --
  const flashes = [];
  const flashPool = [];
  function spawnFlash(x, y, z, { color = PARCH, size = 0.4, opacity = 0.9, life = 0.24, grow = 0.4 } = {}) {
    const s = flashPool.pop() ?? makeGlowSprite({ color, size: 1, opacity });
    s.material.color.set(color);
    s.material.opacity = opacity;
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    flashes.push({ s, age: 0, life, size, grow, opacity });
  }

  const motes = [];
  const motePool = [];
  function spawnMotes(x, z, { color = AMBER, count = 6, spread = 0.35, y = 0.3 } = {}) {
    for (let i = 0; i < count; i++) {
      const s = motePool.pop() ?? makeGlowSprite({ color, size: 0.16, opacity: 0.9 });
      s.material.color.set(color);
      s.material.opacity = 0.9;
      s.scale.set(0.16, 0.16, 1);
      const a = cosmetic.range(0, Math.PI * 2);
      const r = cosmetic.range(0, spread);
      s.position.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
      root.add(s);
      motes.push({
        s,
        age: 0,
        life: cosmetic.range(0.28, 0.6),
        vy: cosmetic.range(0.4, 0.95),
        vx: cosmetic.range(-0.2, 0.2),
        vz: cosmetic.range(-0.2, 0.2),
      });
    }
  }

  const rings = [];
  const ringPool = [];
  function spawnRing(x, z, { from = 0.25, to = 1.2, life = 0.34, opacity = 0.75, color = AMBER } = {}) {
    const m = ringPool.pop() ?? (() => {
      const mm = new Mesh(new RingGeometry(0.87, 1.0, 40), flatMat(AMBER, opacity, true));
      mm.rotation.x = -Math.PI / 2;
      mm.renderOrder = -4;
      return mm;
    })();
    m.material.color.set(color);
    m.material.opacity = opacity;
    m.position.set(x, 0.032, z);
    m.scale.set(from, from, 1);
    root.add(m);
    rings.push({ m, age: 0, life, from, to, opacity });
  }

  // Melee-arc swipe: a wedge sized from the EVENT's reach/half-angle (the sim
  // sends the §7 table row, so nothing is re-typed here), plus a core flash
  // and motes = the three layers §19.4 requires of every attack effect.
  const wedges = [];
  const wedgePool = new Map(); // shape key -> [group, ...]
  const wedgeGeo = new Map(); // shape key -> { fill, rim }
  function wedgeGeometry(key, reach, half) {
    let g = wedgeGeo.get(key);
    if (!g) {
      g = {
        fill: new CircleGeometry(reach, 24, -half, half * 2),
        rim: new RingGeometry(reach * 0.86, reach, 24, 1, -half, half * 2),
      };
      wedgeGeo.set(key, g);
    }
    return g;
  }
  function spawnWedge(ev, reach, halfAngleDeg, opacity) {
    if (!reach || !halfAngleDeg) return;
    const key = `${reach}/${halfAngleDeg}`;
    const half = (halfAngleDeg * Math.PI) / 180;
    // Geometry per distinct §7 arc row is built ONCE and the groups are
    // pooled: three allies swinging several times a second would otherwise
    // allocate and dispose two buffer geometries per swing.
    let pool = wedgePool.get(key);
    if (!pool) {
      pool = [];
      wedgePool.set(key, pool);
    }
    let g = pool.pop();
    if (!g) {
      const geo = wedgeGeometry(key, reach, half);
      g = new Group();
      const fill = new Mesh(geo.fill, flatMat(AMBER, opacity, true));
      fill.rotation.x = -Math.PI / 2;
      fill.renderOrder = -5;
      fill.name = 'fill';
      const rim = new Mesh(geo.rim, flatMat(PARCH, 1, true));
      rim.rotation.x = -Math.PI / 2;
      rim.renderOrder = -4;
      rim.name = 'rim';
      g.add(fill);
      g.add(rim);
    }
    const fill = g.getObjectByName('fill');
    const rim = g.getObjectByName('rim');
    const yaw = Math.atan2(ev.dz, ev.dx);
    fill.rotation.z = -yaw;
    rim.rotation.z = -yaw;
    const rimO = Math.min(1, opacity * 2.1);
    fill.material.opacity = opacity;
    rim.material.opacity = rimO;
    g.position.set(ev.x, 0.038, ev.z);
    root.add(g);
    wedges.push({ g, key, age: 0, life: 0.26, mats: [fill.material, rim.material], o: [opacity, rimO] });
    for (let i = 0; i < 3; i++) {
      const a = yaw + cosmetic.range(-half, half);
      const r = cosmetic.range(0.15, reach);
      spawnMotes(ev.x + Math.cos(a) * r, ev.z + Math.sin(a) * r, { count: 1, spread: 0.05 });
    }
  }

  // ----------------------------------------------------------------- update --
  let lastElapsed = null;
  function update(tSec, alpha = 1) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - lastElapsed));
    lastElapsed = tSec;

    // --- ally rigs ride their sim bodies.
    for (const a of allyEntities()) {
      const c = critters.get(a.classId);
      if (!c) continue;
      const st = rigState.get(a.classId);
      const ix = a.px + (a.x - a.px) * alpha;
      const iz = a.pz + (a.z - a.pz) * alpha;
      c.group.position.set(ix, 0, iz);

      if (a.hp > 0 && (a.faceX !== undefined)) {
        let dy = Math.atan2(a.faceX, a.faceZ) - st.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        st.yaw += dy * (1 - Math.exp(-YAW_RATE * dt));
        c.setYaw(st.yaw);
      }

      st.castLeft = Math.max(0, st.castLeft - dt);
      st.hurtLeft = Math.max(0, st.hurtLeft - dt);
      const simSpeed = Math.hypot(a.x - a.px, a.z - a.pz) * TICK_HZ;
      if (a.hp <= 0) c.setAnim('downed');
      else if (st.hurtLeft > 0) c.setAnim('hurt');
      else if (st.castLeft > 0) c.setAnim('cast', st.castLeft > CAST_HOLD - dt * 2 ? CAST_PHASE : undefined);
      else c.setAnim(simSpeed > MOVE_EPS ? 'walk' : 'idle');

      if (!adopted) c.update(dt);
    }

    // --- §8 mark reticle on the marked enemy.
    const markId = allySys.getMark();
    const marked = markId != null ? byId(markId) : null;
    if (marked) {
      markGroup.visible = true;
      const mx = marked.px + (marked.x - marked.px) * alpha;
      const mz = marked.pz + (marked.z - marked.pz) * alpha;
      markGroup.position.set(mx, 0.034, mz);
      markGroup.rotation.y = tSec * 0.8;
      markCaret.position.y = MARK.caretY + 0.08 * Math.sin(tSec * 3.2);
    } else {
      markGroup.visible = false;
    }

    // --- §10 revive furniture on every Downed body.
    const channels = allySys.getChannels();
    const seenRevive = new Set();
    for (const m of world.entities()) {
      if (m.partyIndex === undefined || m.hp > 0) continue;
      seenRevive.add(m.id);
      let g = reviveRigs.get(m.id);
      if (!g) {
        g = acquireReviveRig();
        reviveRigs.set(m.id, g);
      }
      const bx = m.px + (m.x - m.px) * alpha;
      const bz = m.pz + (m.z - m.pz) * alpha;
      g.position.set(bx, 0, bz);
      const ch = channels.get(m.id);
      const live = ch ? Math.max(0, Math.min(1, ch.progress / REVIVE.channelTicks)) : 0;
      const drain = drains.get(m.id) ?? 0;
      const frac = Math.max(live, drain);
      const draining = (ch && ch.draining) || drain > live;
      const fill = g.getObjectByName('fill');
      const segs = Math.round(frac * REVIVE_RING.segments);
      fill.geometry.setDrawRange(0, segs * 6);
      // Opacity stays 1 in BOTH states so the band's measured hex is the §19.1
      // Parchment at every progress value, draining included. The interrupt
      // reads from the arc running backwards at 2x plus the §17 2 px lateral
      // shake below — never from a value change that would take the ink
      // off-hex.
      fill.material.color.copy(exactColor(PARCH));
      // Needle at the head of the arc, clockwise from 12 o'clock: world +X is
      // 3 o'clock and world -Z is 12 o'clock, so the head sits at
      // (sin phi, -cos phi) * midRadius, and its long (local +Y) axis points
      // radially when rotation.z = PI/2 - phi.
      const head = g.getObjectByName('head');
      const phi = frac * Math.PI * 2;
      const midR = (REVIVE_RING.inner + REVIVE_RING.outer) / 2;
      head.visible = frac > 0.005;
      head.position.set(Math.sin(phi) * midR, 0.038, -Math.cos(phi) * midR);
      head.rotation.z = Math.PI / 2 - phi;
      // Draining reads from the arc running backwards at 2x plus the needle
      // dropping to Bone. (§17 scopes the "2 px shake" to the PORTRAIT, not to
      // this world instrument — and a shaking world ring would also desync the
      // screen-space anchor `reviveRingScreen` hands the critics.)
      head.material.color.copy(exactColor(draining ? BONE : PARCH));
      const hollow = g.getObjectByName('hollow');
      hollow.material.opacity = ch && !draining ? 0.55 : 0.9;
      const glyph = g.getObjectByName('glyph');
      // The hold-E prompt is the "nobody is reviving me yet" state; once a
      // channel runs, the filling ring IS the readout.
      glyph.visible = !ch || draining;
      glyph.position.y = 1.05 + 0.06 * Math.sin(tSec * 2.6);
    }
    for (const [id, v] of drains) {
      const next = v - DRAIN_PCT_PER_SEC * dt;
      if (next <= 0 || !seenRevive.has(id)) drains.delete(id);
      else drains.set(id, next);
    }
    for (const [id, g] of reviveRigs) {
      if (!seenRevive.has(id)) {
        inkRoot.remove(g);
        revivePool.push(g);
        reviveRigs.delete(id);
      }
    }
    if (inkPass) inkPass.enabled = reviveRigs.size > 0;

    // --- ally kit zones synced to sim `azone` entities.
    const seenZones = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'azone') continue;
      seenZones.add(e.id);
      let rig = zoneRigs.get(e.id);
      if (!rig) {
        rig = { g: makeZoneRig(e.radius), radius: e.radius, pulseT: 0, moteClock: 0 };
        rig.g.position.set(e.x, 0.012, e.z);
        root.add(rig.g);
        zoneRigs.set(e.id, rig);
      }
      rig.pulseT = Math.max(0, rig.pulseT - dt);
      const flare = rig.pulseT / 0.35;
      const rim = rig.g.getObjectByName('rim');
      rim.material.opacity = 0.45 + 0.4 * flare + 0.08 * Math.sin(tSec * 3.1);
      rig.moteClock += dt;
      if (rig.moteClock > 0.35) {
        rig.moteClock = 0;
        spawnMotes(e.x, e.z, { count: 2, spread: rig.radius * 0.85 });
      }
    }
    for (const [id, rig] of zoneRigs) {
      if (!seenZones.has(id)) {
        root.remove(rig.g);
        zoneRigs.delete(id);
      }
    }

    // --- pools tick down.
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      const k = f.age / f.life;
      if (k >= 1) {
        root.remove(f.s);
        flashPool.push(f.s);
        flashes.splice(i, 1);
        continue;
      }
      const s = f.size * (1 + f.grow * k);
      f.s.scale.set(s, s, 1);
      f.s.material.opacity = f.opacity * (1 - k * k);
    }
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
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      const k = r.age / r.life;
      if (k >= 1) {
        root.remove(r.m);
        ringPool.push(r.m);
        rings.splice(i, 1);
        continue;
      }
      const s = r.from + (r.to - r.from) * k;
      r.m.scale.set(s, s, 1);
      r.m.material.opacity = r.opacity * (1 - k);
    }
    for (let i = wedges.length - 1; i >= 0; i--) {
      const w = wedges[i];
      w.age += dt;
      const k = w.age / w.life;
      if (k >= 1) {
        root.remove(w.g);
        wedgePool.get(w.key).push(w.g);
        wedges.splice(i, 1);
        continue;
      }
      for (let j = 0; j < w.mats.length; j++) w.mats[j].opacity = w.o[j] * (1 - k);
    }
  }

  // Screen-space anchor for the §17 revive ring, so a capture can measure the
  // arc against exact pixels instead of a hand-computed projection. Returns
  // the ring centre in canvas px plus the band's horizontal/vertical radii
  // (the ground plane is foreshortened by the 52° rig, so the ring is an
  // ellipse on screen).
  const _v = new Vector3();
  function projectPx(x, y, z) {
    _v.set(x, y, z).project(stage.camera);
    const el = stage.renderer.domElement;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    return [Math.round(((_v.x + 1) / 2) * w), Math.round(((1 - _v.y) / 2) * h)];
  }

  // Screen-space anchor for the §17 revive ring (see projectPx above).
  //
  // A ground CIRCLE under a perspective camera projects to an ellipse whose
  // centre is NOT the projection of the circle's centre — the far half is
  // foreshortened harder than the near half. The first version of this helper
  // reported `project(centre)` plus two half-axes, which put the sampling
  // ellipse ~a full band-width high at 12 o'clock, so an angular scan read the
  // BEZEL (#9C9186) at the top of a ring that is drawn correctly. Fit the
  // ellipse from its four projected extremes instead: centre = the midpoint of
  // the projected +/-X and +/-Z points, radii = half their separations. Every
  // px radius below is a multiple of that fitted mid ellipse, so
  // `node tools/qv-arc.mjs <png> cx cy rx ry` lands on the band all the way
  // round.
  function fitEllipse(x, z, r) {
    const l = projectPx(x - r, 0.034, z);
    const rt = projectPx(x + r, 0.034, z);
    const t = projectPx(x, 0.034, z - r);
    const b = projectPx(x, 0.034, z + r);
    return {
      cx: Math.round((l[0] + rt[0]) / 2),
      cy: Math.round((t[1] + b[1]) / 2),
      rx: Math.round((rt[0] - l[0]) / 2),
      ry: Math.round((b[1] - t[1]) / 2),
    };
  }

  function reviveRingScreen() {
    const midR = (REVIVE_RING.inner + REVIVE_RING.outer) / 2;
    const out = [];
    for (const [id, g] of reviveRigs) {
      const p = g.position;
      const e = fitEllipse(p.x, p.z, midR);
      const outE = fitEllipse(p.x, p.z, REVIVE_RING.outer);
      // 0.8x the mid ellipse — the radius the §17 "charcoal backing disc"
      // behind the fill is sampled at. Inside the opaque annulus by design
      // (0.8 * 1.22 = 0.976 u, plate opaque from 0.96 u).
      const inE = fitEllipse(p.x, p.z, midR * 0.8);
      // The plate's own outer track, between the band and the bezel.
      const trE = fitEllipse(p.x, p.z, midR * 1.09);
      out.push({
        id,
        cx: e.cx,
        cy: e.cy,
        rx: e.rx,
        ry: e.ry,
        innerU: REVIVE_RING.inner,
        outerU: REVIVE_RING.outer,
        plateInnerU: REVIVE_RING.plateInner,
        plateOpaqueU: REVIVE_RING.plateOpaque,
        plateOuterU: REVIVE_RING.plateOuter,
        // qv-arc argument sets, ready to paste.
        band: [e.cx, e.cy, e.rx, e.ry],
        plateInnerBand: [inE.cx, inE.cy, inE.rx, inE.ry],
        plateOuterBand: [trE.cx, trE.cy, trE.rx, trE.ry],
        outerPx: outE.rx * 2,
      });
    }
    return out;
  }

  function identityU() {
    const out = {};
    // Walk the whole stage, not just this layer's adopted critters: the
    // Healer's rig belongs to the scene, and the player is the character the
    // revive ring is drawn around most often.
    stage.scene.traverse((o) => {
      if (o.name !== 'identity-ring') return;
      const band = o.children.find((m) => m.geometry?.parameters?.width);
      if (!band) return;
      const outFrac = band.material?.uniforms?.uBandB?.value?.y ?? 1;
      let owner = o.parent;
      while (owner && !String(owner.name).startsWith('critter-')) owner = owner.parent;
      const key = owner ? owner.name.slice('critter-'.length) : `ring${Object.keys(out).length}`;
      out[key] =
        Math.round((band.geometry.parameters.width / 2) * outFrac * o.scale.x * 1000) / 1000;
    });
    return out;
  }

  // Round-3 probe (BLOCKING critic finding): the collapse latch. A critter's
  // fall is ONE rotation on its fallPivot (`group > yawGroup > fallPivot`,
  // critters/index.js), so `|rot.z| / FALL_ANGLE` IS the pose's collapse value
  // — 1 = lying flat, 0 = upright — readable for every party member without a
  // new accessor on the shared factory. `__echoes.state().allyfx.collapse`
  // therefore proves from the sim side what the frames show: a revived body
  // rises instead of staying pinned in the downed pose.
  function collapseOf(group) {
    const yawG = group?.children?.[0];
    const fallPivot = yawG?.children?.[0];
    if (!fallPivot) return null;
    return Math.round((Math.abs(fallPivot.rotation.z) / FALL_ANGLE) * 1000) / 1000;
  }

  function collapseMap() {
    const out = {};
    for (const [classId, c] of critters) out[classId] = collapseOf(c.group);
    // The Healer rig belongs to the scene, not this layer; it is found by the
    // factory's own group name so the probe covers the whole party.
    const healer = stage.scene?.getObjectByName?.('critter-healer');
    if (healer) out.healer = collapseOf(healer);
    return out;
  }

  function debugCounts() {
    return {
      mark: allySys.getMark(),
      collapse: collapseMap(),
      reviveRings: reviveRigs.size,
      // Drawn ring fraction per downed body (live channel vs the §17 reverse
      // drain), so a capture can measure the unwind instead of eyeballing it.
      reviveDrawn: [...reviveRigs.keys()].map((id) => ({
        id,
        drain: Math.round((drains.get(id) ?? 0) * 1000) / 1000,
      })),
      reviveRingScreen: reviveRingScreen(),
      identityU: identityU(),
      // Post-bloom instrument pass: present => the revive ring is drawn after
      // UnrealBloomPass and before OutputPass (see InkOverlayPass).
      inkPass: inkPass ? stage.composer.passes.indexOf(inkPass) : -1,
      inkPassEnabled: inkPass ? inkPass.enabled : false,
      inkPasses: stage.composer?.passes?.map((p) => p.constructor.name) ?? [],
      zones: zoneRigs.size,
      wedges: wedges.length,
      motes: motes.length,
      adopted,
      rigs: [...critters.keys()],
      anims: [...critters.entries()].map(([k, c]) => `${k}:${c.getAnim()}`),
    };
  }

  return { root, update, debugCounts };
}
