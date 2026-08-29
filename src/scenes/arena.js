// Act-1 combat arena (?scene=arena&variant=1|2|3): the "uneasy pastoral
// woodland" of BUILD_BRIEF §19.3, wrapped AROUND the graybox scene so the
// exact same sim world / player controller / §9 juice pipeline plays inside
// unchanged. This scene only swaps the placeholder floor + walls for the
// dressed environment:
//   - canvas-painted ground: lit green band vs a COOL blue-green shade ramp,
//     dirt path with ruts and pebbles, moss/leaf/crack decals, per-texel grain
//     (env/ground.js)
//   - a dressed exterior: cool indigo apron + mist band + instanced treeline,
//     scrub and boulder masses, so a wall-hug frame is never a dead void
//     (env/ground.js + env/treeline.js)
//   - instanced grass tufts + flowers, masked out of every prop footprint
//     (env/foliage.js)
//   - 12 edge prop types in authored CLUSTERS with ink outlines and centred
//     contact blob shadows, plus the violet-veined corruption monolith
//     (env/props.js)
//   - a built boundary: wall body one value step under the floor, lighter
//     coping rim, dry-stone capstone run (env/walls.js)
//   - emitter FX: painted flame sprites with ember layers, warm lantern glass,
//     violet monolith halo, additive ground pools, 2 real torch PointLights
//   - COOL ambient light so the warm pools have something to be warm against
//     (§19.3 warm:cool 70:30 — see tuneActOneLighting)
//   - drifting firefly motes (one Points draw, cosmetic stream)
//   - filled, hue-neutral contact shadows under the player and every entity
// Render-only: everything here reads the cosmetic stream, never sim state.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  Mesh,
  PointLight,
  Points,
  PointsMaterial,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
  LinearSRGBColorSpace,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ARENA, CAMERA, DODGE, DUMMY, TICK_HZ } from '../core/constants.js';
import { createCritter, setInkViewport } from '../render/critters/index.js';
import { PALETTE } from '../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../render/glow.js';
import { createGrayboxScene } from './graybox.js';
import { VARIANTS } from '../env/variants.js';
import { buildGroundMesh, buildApronMesh } from '../env/ground.js';
import { buildTreeline } from '../env/treeline.js';
import { buildWalls } from '../env/walls.js';
import { buildFoliage } from '../env/foliage.js';
import {
  buildProps,
  buildShadowInstances,
  makeShadowMaterial,
  setPropInkViewport,
  ORDER,
  VEIN_VIOLET,
} from '../env/props.js';
import { makeFlameSprite, createEmberField } from '../env/flame.js';
import { COOL, EMBER_GLOW, mix } from '../env/colors.js';
import { createAfterimages } from '../render/critters/afterimage.js';

// Render-cosmetic scaffold numbers (grouped; not brief-bound gameplay values).
const FIREFLY_COUNT = 120;
const TORCH_LIGHT = { intensity: 13.0, distance: 11, decay: 2 };
// Contact-shadow radius for sim bodies (training dummies / future enemies).
// The blob texture holds a near-solid core out to 50% of the radius and
// feathers to nothing at 100%. The PLAYER's grounding moved to the critter
// factory (v0.3.0): the chibi Healer carries her own §17 identity ring +
// contact shadow, engineered together so the shadow's falloff can never
// darken the ring band (the round-3 F1 defect).
const ENTITY_SHADOW_R = DUMMY.radius * 1.7;

// --- v0.3.0 party integration -----------------------------------------------
// The playable Healer renders as the chibi mouse critter; the other three
// party critters idle near spawn (no AI yet — idle clips only, per the
// integration scope). They are NON-COLLIDING sim-side: BUILD_BRIEF §12 gives
// allies only a 0.26 u soft separation push (no hard collider), A6 rules
// arenas open, and idle placement needs neither — bolts already pass allies
// (§7: the Healer's bolt passes non-hittable bodies; projectiles collide with
// `hittable` hostiles only).
const ALLY_SPOTS = [
  // [classId, x, z] — a loose camp arc just north of the (0,0) spawn, clear
  // of the midfield fight lanes and every variant's prop clusters.
  ['tank', -1.9, -1.0],
  ['swordsman', 1.8, -1.3],
  ['archer', -0.35, -2.2],
];
// Healer clip arbitration (downed > hurt > cast > walk/idle):
const CAST_PHASE = 0.45; // s into the cast clip = the release pop (§6 instant cast)
const CAST_HOLD_MOVING = 0.28; // s — short while kiting so runs still read as running
const CAST_HOLD_STILL = 0.5; // s — full pop + follow-through when standing
const HURT_HOLD = 0.62; // s — snap + held flinch (driver holds ~40% of the cycle)
const MOVE_EPS = 0.3; // u/s — sim speed above which the walk clip drives
const YAW_RATE = 10; // 1/s exponential smoothing toward aim (§3/A1 smooth yaw)

// Follow-camera focus clamp. The arena is 24x16 u and the rig looks ~9 u past
// the far edge of frame, so an unclamped wall-hug puts ~48% of the screen
// outside the playfield. Dressing the exterior handles the rest, but capping
// the focus keeps the out-of-bounds band around a fifth of the frame in the
// worst case and near zero in ordinary combat. Margins chosen against the
// 52 deg / 12 u rig so the player capsule is always well inside frame even
// flush against a wall (checked: worst case ~75% down the screen, never off).
const CAM_OFF_Z = CAMERA.distance * Math.cos((CAMERA.elevationDeg * Math.PI) / 180);
const CAM_CLAMP = { x: 7.0, zMin: -4.0, zMax: 5.0 };
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// §19.3 lighting for Act 1 (round-4 remediation, critique F2 + F3).
//
// three.js is physically lit: a DirectionalLight of intensity I lands on an
// up-facing surface as I/PI, and a HemisphereLight the same way. Round 3 shipped
// key 2.1 + fill 2.15, i.e. a TOTAL irradiance of ~0.75 on flat ground — every
// albedo in the arena was multiplied DOWN before ACES compressed it again. That
// is why 99.8% of the frame measured below luma 144.
//
// Solved rather than eyeballed (see render/stage.js for the ACES inverse):
//   key  4.0 warm  -> direct irradiance 4.0/PI * keyColor  = lum 0.86
//   fill 1.9 cool  -> indirect          1.9/PI * skyColor  = lum 0.20
// which is a warm:cool luminance split of 81:19 at the light rig; the painted
// cool shade in the floor texture and the cool apron carry the rest of the
// 70:30 story, and F3's inverted warm:cool pixel ratio flips with it.
const ACT1_LIGHT = {
  keyIntensity: 4.0,
  // Fill 2.35 (was 1.9): the grade's S-curve collapses the blue channel of
  // any dim warm surface (display L 40-70) ~2x harder than its red, which is
  // what kept landing toon SHADE faces of timber and dirt at h20-24 / s>0.4 —
  // the reserved Ember Danger band. The extra indigo fill is the blue floor
  // under exactly those faces; the warm pools still dominate the lit story.
  // ...but 2.35 (a first cut) is too much of it: with the ground canvas's own
  // cool lift it desaturated the whole floor (measured SAT mean 0.32 against
  // the docs/TESTING.md Act-1 bar of 0.55-0.65) and flipped cool above warm.
  // 2.0 keeps the blue floor under the dim warm faces without bleaching the
  // grass.
  // 2.15: the cool fill is ALSO the blue floor under every dim warm prop
  // face, so it is the one lever that lowers the reserved-band count and
  // raises the cool counterweight at once. The painted grass saturation in
  // env/variants.js was raised +0.06 per variant to pay for it.
  // Settled at 2.3. This one lever moves BOTH remaining weak numbers in the
  // right direction, because it is the only light that reaches a surface's
  // shaded side: it puts a blue floor under exactly the dark warm faces that
  // were still landing in the reserved h5-25 band (edge props, the fox's
  // wine cloak in shade) AND it is the frame's cool counterweight. The cost
  // is frame saturation, which is why it is not higher — 2.35 measured SAT
  // 0.32 in an earlier pass against the docs/TESTING.md Act-1 bar.
  fillIntensity: 2.3,
  // Key hue biased from Hearth Amber toward Pale Gold before the white lerp:
  // the pure-amber key, multiplied into warm-grey fur and umber timber and then
  // red-lifted by the grade, measured whole surfaces at hue 16-25 — inside the
  // reserved Ember Danger band (baseline-v030 F2). The gold bias lifts every
  // lit warm surface ~4 hue degrees while keeping the same warm read.
  // The white lerp is 0.52 (was 0.42) for one measured reason: the key's low
  // BLUE channel flipped the Swordsman's wine cloak (#6B2E3A, hue 348) across
  // the 0-degree boundary into h6-12 — the Ember Danger band — because the lit
  // green channel edged past the lit blue. More white in the key keeps the
  // wine on the wine side of 0 while the pools/braziers carry the warmth.
  // White lerp 0.58 (was 0.52): a SIDE face sees the key alone (no sky fill to
  // speak of), so the key's own saturation is the floor under every neutral
  // prop's lit-side saturation — at 0.52 the key-only product measured
  // s0.36-0.42 at h20-24 on grey boulders and wall brick, inside the reserved
  // Ember Danger band once the grade's red lift landed. 0.58 keeps the same
  // warm hue at a saturation that leaves lit neutrals under the s0.35 gate.
  // Pale Gold share 0.62 (was 0.45): the residual danger-band murk sat at
  // h23-25 — one to two degrees under the band's top — across walls and
  // props; the extra gold in the key is the +2-3 degree global hue lift that
  // clears it while keeping the same warm read.
  // White lerp 0.44, not 0.58: hue is what the reserved Ember band actually
  // gates on (h5-25 AND s>0.35), and the Pale Gold share above already does
  // the hue work. Bleaching the key on top of it is what dropped the frame's
  // saturation to 0.32 and turned the fire pools into white spotlights. 0.44
  // holds the wine cloak on the wine side of 0 degrees (the reason the lerp
  // was raised at all) while the grass keeps its colour.
  // Pale Gold share 0.9 (was 0.62): every remaining reserved-band pixel in
  // the frame measured h20.7-24.8 — one to four degrees under the ceiling —
  // on dark surfaces where the KEY's own hue is most of what is left after
  // the albedo goes dark. Rotating the key itself up ~3 degrees and dropping
  // its saturation from 0.40 to 0.37 moves every one of them at once, which
  // no per-material tweak can.
  // ...and the white lerp settles at 0.52. Attribution runs kept landing the
  // last few hundred reserved-band pixels on DARK painted ground (the beaten
  // track's shaded edge, prop-shadowed grass) whose canvas texels are all
  // hue >= 40 — the band membership is created by the light, not the albedo:
  // at a key ratio of r:g = 1:0.83 a dark olive with g/r ~ 1.05 comes out
  // red-dominant. Whitening the key raises that ratio and drops the key's own
  // saturation, which moves every such pixel at once. It costs frame
  // saturation, so it is balanced against the fill above rather than pushed
  // further.
  keyColor: new Color(PALETTE.hearthAmber)
    .lerp(new Color(PALETTE.paleGold), 0.9)
    .lerp(new Color('#FFFFFF'), 0.52),
  skyColor: new Color(COOL.sky),
  groundColor: new Color(COOL.ambient),
};

// `mood` is the per-variant light multiplier (env/variants.js): a clearing at
// noon, a dry crossroads under a hard sun and a shaded hollow are three
// different rooms even before the props differ (critique F8).
function tuneActOneLighting(scene, mood = {}) {
  let key = null;
  let fill = null;
  for (const obj of scene.children) {
    if (obj.isDirectionalLight && !key) key = obj;
    else if (obj.isHemisphereLight && !fill) fill = obj;
  }
  const kMul = mood.key ?? 1;
  const fMul = mood.fill ?? 1;
  if (key) {
    key.color.copy(ACT1_LIGHT.keyColor);
    if (mood.warmth) key.color.lerp(new Color(PALETTE.hearthAmber), mood.warmth);
    // `keyWhite` bleaches the key per variant. The hollow (v3) runs a stop
    // dimmer, and at display L 40-70 the grade red-lifts every key-warmed
    // bark/dirt/stone face to h22-25 at s just over the reserved-band gate —
    // measured as a 500-1600 px danger-band count that swung with every
    // cosmetic roll. A whiter key cuts the multiplier's chroma so those
    // surfaces land under s0.35; the fires and pools still carry the warmth.
    if (mood.keyWhite) key.color.lerp(new Color('#FFFFFF'), mood.keyWhite);
    key.intensity = ACT1_LIGHT.keyIntensity * kMul;
  }
  if (fill) {
    fill.color.copy(ACT1_LIGHT.skyColor);
    fill.groundColor.copy(ACT1_LIGHT.groundColor);
    fill.intensity = ACT1_LIGHT.fillIntensity * fMul;
  }
  return { key: !!key, fill: !!fill, keyIntensity: key ? key.intensity : 0 };
}

// The rig never rotates (fixed 3/4 top-down), so "toward the camera" is a
// constant world vector. Offsetting a billboard along it moves the sprite
// CLOSER to the camera with (by construction) zero screen displacement — the
// fix for F7, where the south torch's flame was depth-clipped by its own post.
const EL = (CAMERA.elevationDeg * Math.PI) / 180;
const TOWARD_CAM = { y: Math.sin(EL), z: Math.cos(EL) };
const FLAME_LIFT = 0.26; // world u along the view axis

// Canopy sun-shaft falloff. The shared glow texture is a bloom halo — it is
// already down to 55% alpha a QUARTER of the way out — so a light pool built on
// it has a needle-thin bright centre and reads as fog, never as a patch of sun
// on the grass. This ramp holds a broad plateau and then falls, which is what
// puts a real >200-luma region on the floor (critique F2's value range) and
// what makes the pool read as light rather than haze.
let sharedShaftTexture = null;
function getShaftTexture() {
  if (sharedShaftTexture) return sharedShaftTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  // INVERSE-SQUARE-ish falloff, not a soft linear ramp. Attribution runs
  // (raycast pick + a pool-hidden capture) put ~80% of the frame's reserved
  // Ember-band pixels in ONE place: the broad mid-alpha ANNULUS of these
  // pools where a warm addition lands on cool shade ground and the two sum
  // to h19-25 mauve-brown. The old ramp held alpha 0.27-0.6 across radius
  // 0.45-0.75 (36% of the disc's area); this one holds the same alpha range
  // across 0.32-0.55 (20% of the area) while the CORE stays just as hot, so
  // the pool reads brighter and the marginal ring nearly halves.
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.32, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.26)');
  grad.addColorStop(0.68, 'rgba(255,255,255,0.09)');
  grad.addColorStop(0.85, 'rgba(255,255,255,0.02)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  sharedShaftTexture = tex;
  return tex;
}

// Flat additive radial disc lying on the ground — the "pool of light" read.
function groundPool(color, radius, opacity, y, broad = false) {
  const mesh = new Mesh(
    new CircleGeometry(1, 28),
    new MeshBasicMaterial({
      map: broad ? getShaftTexture() : getRadialTexture(),
      color: new Color(color),
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(radius, radius, 1);
  mesh.position.y = y;
  mesh.renderOrder = ORDER.pool; // pools first, contact shadows on top
  return mesh;
}

// Contact blob for a standing body. Stretched 1.3x along Z (still CENTRED on
// the footprint — no directional offset) because at the rig's 52 deg pitch a
// circular blob sized to the footprint hides almost entirely behind the body it
// belongs to; the elongation is what puts a readable crescent in front of the
// feet, and it reads as a low-sun shadow rather than a decal.
function contactBlob(radius, opacity) {
  const mesh = new Mesh(new CircleGeometry(radius, 24), makeShadowMaterial(opacity));
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(1, 1.3, 1);
  mesh.position.y = 0.008;
  mesh.renderOrder = ORDER.shadow;
  return mesh;
}

export function createArenaScene(stage, toggles, ctx) {
  const { cosmetic, world, bus } = ctx;
  const params = new URLSearchParams(window.location.search);
  const vParam = parseInt(params.get('variant') ?? '1', 10);
  const spec = VARIANTS[vParam] ?? VARIANTS[1];

  const lightsTuned = tuneActOneLighting(stage.scene, spec.mood);

  // --- The playable inside: same world/player/juice as ?scene=graybox. Its
  // placeholder floor + walls are the only top-level Plane/Box meshes in the
  // graybox root at build time — strip them, keep everything else (player rig,
  // bolts, dummies, smear, particles, decals, camera, screenshake).
  const inner = createGrayboxScene(stage, toggles, ctx);
  const placeholders = inner.root.children.filter(
    (c) => c.isMesh && (c.geometry?.type === 'PlaneGeometry' || c.geometry?.type === 'BoxGeometry')
  );
  for (const p of placeholders) inner.root.remove(p);

  // The graybox player rig (capsule + placeholder ring + blob shadow) is the
  // scaffold the chibi Healer replaces (v0.3.0): hide the whole rig — its sim
  // wiring (movement, dash, smear ghosts, bolts, camera) keeps running — and
  // mount the critter-factory mouse on the same sim state below. The critter
  // brings its own §17 identity ring (constant opacity, exact class accent)
  // and contact shadow, so no rig retune is needed any more.
  let identityRing = null;
  inner.root.traverse((o) => {
    if (!identityRing && o.isMesh && o.geometry?.type === 'RingGeometry') identityRing = o;
  });
  const capsuleRig = identityRing ? identityRing.parent : null;
  if (capsuleRig) capsuleRig.visible = false;

  const root = new Group();
  root.name = `arena-v${spec.id}`;
  stage.scene.add(root);

  // --- Ground + dressed exterior.
  root.add(buildGroundMesh(spec, cosmetic));
  root.add(buildApronMesh(spec, cosmetic));
  const treeline = buildTreeline(root, spec, cosmetic);

  // --- Props first: their footprints mask the foliage scatter, so a blade of
  // grass can never grow through a crate face.
  const { emitters, shadows, footprints, mats, typeCount, monolithMat } = buildProps(
    root,
    spec,
    cosmetic
  );
  buildShadowInstances(root, shadows);
  const foliage = buildFoliage(root, spec, cosmetic, footprints);
  const glassBase = mats?.glass ? mats.glass.color.clone() : null;

  // --- The built boundary (walls + coping + capstone run).
  const wallInfo = buildWalls(root, spec, cosmetic);

  // --- The playable Healer: chibi mouse from the critter factory, riding the
  // graybox sim (position/aim/dash/hp are read-only; clips are render state).
  const healerRig = createCritter('healer', { cosmetic });
  root.add(healerRig.group);

  // Bolts leave the staff-gem tip (§19.2: the gem brightens on cast) — hand
  // the graybox bolt renderer the live gem world position as its muzzle.
  const muzzleV = new Vector3();
  if (inner.setBoltOrigin && healerRig.tipWorld) {
    inner.setBoltOrigin(() => healerRig.tipWorld(muzzleV));
  }

  // Dash smear (baseline-v030 F6): staggered silhouette afterimages of the
  // posed chibi Healer replace the graybox capsule ghosts, which composited
  // into one solid slab (and were the wrong body besides). One ghost is frozen
  // every SMEAR_TICK_SPACING sim ticks of dash travel — 4 over the 15-tick
  // dash, each fading on its own clock — and §5's contract holds: every ghost
  // is hard-cleared the frame the dash ends.
  // 2 sim ticks between afterimages over the 15-tick dash. Spacing 4 was
  // measured as unreachable in practice: the trail was ACCUMULATED one ghost
  // per render frame, and a capture-harness frame can swallow the whole dash
  // (logged: dashTicksLeft 15 -> 14 -> 13, then one 216 ms hitch and the dash
  // was over), so a mid-dash frame showed one ghost, not a trail. The schedule
  // below is now REBUILT from dash state every frame instead of accumulated,
  // so the trail is identical at any render rate.
  const SMEAR_TICK_SPACING = 2;
  if (inner.setSmearEnabled) inner.setSmearEnabled(false);
  const afterimages = createAfterimages(healerRig, root);
  let lastGhostTick = -1;
  // Pipeline warm-up (see afterimage.js `warmup`): the ghosts render at ~0
  // opacity for the first two frames so the first real dash never pays a
  // shader-compile stall.
  afterimages.warmup();
  let smearWarmFrames = 2;

  // --- Idle party members near spawn (badger Tank, fox Swordsman, hare
  // Archer): idle clips only, facing loosely back toward the spawn point.
  const allies = ALLY_SPOTS.map(([classId, ax, az]) => {
    const c = createCritter(classId, { cosmetic });
    c.group.position.set(ax, 0, az);
    c.setYaw(Math.atan2(-ax, -az));
    c.setAnim('idle');
    root.add(c.group);
    return c;
  });

  // Healer clip state (event flags consumed by the per-frame arbitration).
  let castLeft = 0;
  let hurtLeft = 0;
  let firedFlag = false;
  let hurtFlag = false;
  let healerYaw = 0;
  bus.on('basic_fire', () => {
    firedFlag = true;
  });
  bus.on('hit', (ev) => {
    if (ev.target === world.player.id) hurtFlag = true;
  });

  // --- Entity contact shadows: same treatment for every sim body in the arena
  // (training dummies today, enemies when they land), so nothing ever floats.
  const entityShadows = new Map();
  const entityShadowPool = [];
  function acquireEntityShadow() {
    const m = entityShadowPool.pop() ?? contactBlob(ENTITY_SHADOW_R, 0.46);
    root.add(m);
    return m;
  }

  // --- Emitter FX layer (§19.3: every light emitter carries a glow sprite;
  // §19.4: every effect is >=3 layers — core + glow + particles).
  const flames = []; // { body, glow, pool, phase }
  const pulses = []; // lantern/monolith halos
  const fireSources = []; // ember spawn points
  let poolSeq = 0;
  const poolY = () => 0.011 + poolSeq++ * 0.0008; // stagger, never z-fight

  for (const em of emitters) {
    if (em.kind === 'flame') {
      // Flame billboard, pushed FLAME_LIFT along the view axis so the torch
      // shaft can never depth-clip its own fire (F7), and authored above 1.0 in
      // linear so its core clears the bloom threshold and reads as a LIGHT
      // SOURCE with a white-hot centre rather than a painted decal (F2).
      const fy = em.y + 0.13 + TOWARD_CAM.y * FLAME_LIFT;
      const fz = em.z + TOWARD_CAM.z * FLAME_LIFT;
      // Gain 2.15 and a tighter halo (a first cut ran 2.6 / size 1.3 / 0.55):
      // above ~2.2 the painted flame clips to featureless white and the bloom
      // skirt swallows the torch stake, so the pool loses the very thing that
      // attributes it. The flame has to stay a readable SHAPE.
      const body = makeFlameSprite(0.7, 1, 2.15);
      body.position.set(em.x, fy, fz);
      body.renderOrder = 8;
      root.add(body);
      const glow = makeGlowSprite({ color: EMBER_GLOW.halo, size: 1.05, opacity: 0.45 });
      glow.position.set(em.x, em.y + 0.08 + TOWARD_CAM.y * FLAME_LIFT, fz);
      root.add(glow);
      // Pool footprint kept TIGHT (radius 2.0): the broad shaft texture's
      // mid-alpha feather over cool shade ground is exactly the mauve murk
      // that lands in the h5-25 danger band, and it also washes the painted
      // shade pockets out of the frame's cool share.
      // Opacity 0.46 (a first cut ran 0.58 on a near-white tint): additive
      // strength and tint saturation trade off against the same danger gate,
      // and a slightly dimmer pool of REAL amber reads as firelight where a
      // brighter pool of cream read as a stage spotlight.
      const pool = groundPool(EMBER_GLOW.pool, 2.0, 0.48, poolY(), true);
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      flames.push({ body, glow, pool, poolO: 0.48, glowS: 1.05, glowO: 0.45, x: em.x, y: fy, z: fz, phase: cosmetic.range(0, Math.PI * 2) });
      fireSources.push({ x: em.x, y: em.y + 0.2, z: fz });
    } else if (em.kind === 'brazier') {
      // Mid-field fire bowl (baseline-v030 F1): the emitter that OWNS the
      // mid-field warm pool. Same flame family as the torches — painted flame
      // sprite + gold halo + broad additive ground pool + ember column — so
      // every pool in the frame traces to a visible fire.
      // Flame 0.72 (was 0.56) riding clearly ABOVE the rim, and the halo
      // lifted to flame height at a tighter size: the first cut centred the
      // halo ON the bowl, which washed the prop into a featureless glowing
      // lump — the pool needs a readable dark bowl under a visible flame to
      // count as attributed (F1).
      // The brazier's flame gets a MUCH smaller view-axis lift than a torch's
      // (0.10 u vs 0.26) and sits 0.06 u over the rim rather than 0.20. Reason,
      // measured by projecting the sprite: the camera is above and behind, so
      // lifting a point toward it magnifies its offset from screen centre —
      // the old offsets put the fire 50 px left and 55 px above its own bowl at
      // gameplay zoom, i.e. a bright blob NEXT TO a dark lump instead of a lit
      // brazier. A torch needs the big lift (its tall shaft would depth-clip
      // the sprite); a squat bowl does not.
      const BRAZIER_LIFT = 0.1;
      const fy = em.y + 0.06 + TOWARD_CAM.y * BRAZIER_LIFT;
      const fz = em.z + TOWARD_CAM.z * BRAZIER_LIFT;
      // Flame 0.95: the bowl fire is the emitter's whole tell and at 0.72 it
      // was smaller than the pool's blown core, so it read as part of the
      // glow instead of as the thing making it.
      // Gain 2.35 — the highest in the scene, but only just. The fire has to
      // be the brightest thing in its own pool or the emitter reads as a dark
      // object sitting in someone else's light; push it further (2.9 was
      // tried) and the bloom skirt washes the whole frame, measured as warm
      // 36-43% against cool 2.7-6.6% and the reserved-band count back over
      // 1000 px. Torches keep 2.15 — their pool is smaller and their dark
      // stake already carries the attribution.
      const body = makeFlameSprite(0.95, 1, 2.35);
      body.position.set(em.x, fy, fz);
      body.renderOrder = 8;
      root.add(body);
      // Halo 0.8 / 0.42: measured on a 4x crop, the wider halo's bloom skirt
      // ate the right half of the bowl, leaving a bright blob with a dark
      // smudge in it. A tighter halo keeps the whole pedestal-column-bowl
      // silhouette readable against its own pool, which IS the F1 fix.
      const glow = makeGlowSprite({ color: EMBER_GLOW.halo, size: 0.8, opacity: 0.42 });
      glow.position.set(em.x, em.y + 0.1 + TOWARD_CAM.y * BRAZIER_LIFT, fz);
      root.add(glow);
      // The bowl pool is the broadest in the frame — it replaces the old
      // sourceless canopy dapple as the mid-field warmth. Radius 2.5 is safe
      // now that EMBER_GLOW carries a heavy parchment share (the addition sits
      // well under the danger gate even over mauve/indigo shade); it is
      // also part of the warm side of the §19.3 70:30 story.
      // `mood.poolR` shrinks the bowl pools per variant: the hollow (v3) runs
      // its ground darkest, and the broad pool's MID feather over dark tuft
      // silhouettes is where FXAA blends kept landing h20-25/s0.35-0.38 —
      // a tighter pool keeps the bright attributed core and cuts the marginal
      // annulus.
      const poolR = spec.mood?.poolR ?? 1;
      // Pool opacity 0.56 (was 0.46) once the halos were tightened for
      // emitter readability: the tighter halos cost ~5 points of the frame's
      // warm share and variant 3 measured warm 21.6% against cool 21.0%,
      // which is the §19.3 warm-dominant story on a coin flip. The warmth
      // moves from the bloom skirt (which hid the emitter) into the POOL
      // (which is what a fire on a floor actually does).
      const pool = groundPool(EMBER_GLOW.pool, 2.5 * poolR, 0.5, poolY(), true);
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      // Core 0.30 at radius 1.05 (a first cut ran 0.50 at 1.20): stacked on
      // the pool below it, the fat bright core clipped to featureless white —
      // measured rgb(255,242,208) at saturation 0.18 dead centre — which is
      // exactly the "sourceless white blob" read the F1 advisory is about. A
      // smaller, dimmer core keeps a hot centre that still carries hue.
      // (No second "hot core" pool. It stacked on the pool above and clipped
      // the ground around the pedestal to featureless white, which is exactly
      // what turned the emitter into a backlit smudge — the F1 defect this
      // whole prop exists to fix. The FLAME is the hot centre now.)
      flames.push({ body, glow, pool, poolO: 0.5, glowS: 0.8, glowO: 0.42, x: em.x, y: fy, z: fz, scale: 0.95, phase: cosmetic.range(0, Math.PI * 2) });
      fireSources.push({ x: em.x, y: em.y + 0.12, z: fz });
    } else if (em.kind === 'lantern') {
      // A lantern is a FIRE, not a cold lamp: a small flame inside the glass
      // plus a warm halo, so it registers as the same emitter family as the
      // torches beside it.
      const wick = makeFlameSprite(0.24, 0.95, 2.3);
      wick.position.set(em.x, em.y + 0.01 + TOWARD_CAM.y * 0.1, em.z + TOWARD_CAM.z * 0.1);
      wick.renderOrder = 8;
      root.add(wick);
      const glow = makeGlowSprite({ color: PALETTE.hearthAmber, size: 1.15, opacity: 0.8 });
      glow.material.color.copy(EMBER_GLOW.halo);
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const pool = groundPool(EMBER_GLOW.pool, 1.65, 0.44, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      pulses.push({ glow, base: 0.7, rate: 3.1, amp: 0.16, jitter: 0.05, phase: cosmetic.range(0, Math.PI * 2), wick });
      fireSources.push({ x: em.x, y: em.y + 0.08, z: em.z });
    } else if (em.kind === 'monolith') {
      // God-stuff Violet halo — the ONLY violet in the frame rides this prop.
      // toneMapped:false keeps the halo CHROMATIC: an ACES-compressed violet
      // sprite over dark stone measured as neutral dark teal last round, i.e.
      // the "subtle glow" carried none of the accent colour.
      // Size 1.9 (was 2.3): the violet halo riding over a neighbouring tan
      // stump blends to rose — inside the h5-25 danger band. Tighter halo,
      // same pulse.
      // Halo/pool violet rides the veins' pre-compensated tone with the RED
      // trimmed 18%: the untrimmed halo washing the monolith's own warm-key-lit
      // bevels blended to rose streaks measured at h8-16 / s0.38-0.48 — inside
      // the reserved Ember band. Blue-leaning violet stays firmly in the
      // analyzer's violet band (245-285) while its warm-surface blends fall
      // toward neutral mauve instead of rose. (Vein emissive keeps the full
      // VEIN_VIOLET — the streak cores are what carry the accent.)
      // [0.66, 0.5, 1.95]: deep blue-violet (post-chain hue ~247, inside the
      // violet band) whose warm-surface blends can never be red-lifted into
      // the reserved Ember band — the older red-heavier halo painted the
      // monolith's own key-lit face maroon in vignette-dim frames.
      const HALO_VIOLET = [0.66, 0.5, 1.95];
      const glow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 1.9, opacity: 0.6 });
      glow.material.toneMapped = false;
      // Same pre-compensated violet family as the veins so the HALO carries the
      // accent hue too (an ACES-flattened violet sprite measured as neutral
      // dark teal).
      glow.material.color.setRGB(HALO_VIOLET[0], HALO_VIOLET[1], HALO_VIOLET[2], LinearSRGBColorSpace);
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const spark = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.6, opacity: 0.55 });
      spark.material.toneMapped = false;
      spark.material.color.setRGB(HALO_VIOLET[0], HALO_VIOLET[1], HALO_VIOLET[2], LinearSRGBColorSpace);
      spark.position.set(em.x, em.y + 0.18, em.z);
      root.add(spark);
      // Radius 1.2 keeps the violet wash off the neighbouring warm-lit stone:
      // violet + amber additive overlap lands rose-brown INSIDE h5-25.
      // The GROUND pool goes bluer and softer still (red x0.62, opacity 0.34):
      // over vignette-dark ground the grade crushes the addition's blue and the
      // old pool measured a maroon slick around the plinth; the vein cores and
      // halo carry the violet tell, the pool only has to read as underglow.
      const pool = groundPool(PALETTE.godstuffViolet, 1.2, 0.34, poolY());
      pool.material.color.setRGB(HALO_VIOLET[0] * 0.62, HALO_VIOLET[1], HALO_VIOLET[2], LinearSRGBColorSpace);
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      pulses.push({ glow, base: 0.6, rate: 0.9, amp: 0.12, jitter: 0, phase: cosmetic.range(0, Math.PI * 2), spark });
    }
  }

  const embers = createEmberField(root, fireSources, cosmetic, 9);

  // (The old mid-field "canopy dapple" pools are gone: baseline-v030 F1 ruled
  // every warm pool needs a visible emitter, so the mid-field warmth now comes
  // from the brazier fire bowls handled in the emitter loop above.)

  // Real warm light: 2 torches per variant (spec.lightIdx) carry PointLights.
  const flameEmitters = emitters.filter((e) => e.kind === 'flame');
  const torchLights = [];
  for (const idx of spec.lightIdx ?? []) {
    const em = flameEmitters[idx];
    if (!em) continue;
    const light = new PointLight(
      // Gold-white, not raw amber: the torch light MULTIPLIES nearby wall and
      // stone albedo, and an amber-heavy product lands lit masonry in h5-25.
      // White lerp 0.78 (was 0.7; before that 0.55): the brick strip behind
      // each LIT torch kept measuring h24-25/s0.35-0.40 in the DIM hollow
      // variant (~150-200 px per torch there). The whiter multiplier keeps
      // the pool warm (the flame + halo carry the color) while lit brick
      // stays above h25 / under s0.35 in all three variants.
      // White lerp 0.60 (a first cut ran 0.78): the Pale Gold half already
      // carries the hue lift that keeps lit masonry above h25, and the extra
      // white only bleached the torch pools.
      new Color(PALETTE.hearthAmber).lerp(new Color(PALETTE.paleGold), 0.5).lerp(new Color('#FFFFFF'), 0.6),
      TORCH_LIGHT.intensity,
      TORCH_LIGHT.distance,
      TORCH_LIGHT.decay
    );
    light.position.set(em.x, em.y + 0.3, em.z);
    root.add(light);
    torchLights.push({ light, phase: cosmetic.range(0, Math.PI * 2) });
  }

  // --- Firefly motes. Per-mote colour drives a slow fade in/out (additive
  // blending + vertex colours = a free alpha channel), and each mote carries
  // its own drift velocity plus two wander sinusoids and a vertical bob, so
  // positions visibly MOVE frame to frame instead of reading as fixed specks.
  const flyData = [];
  const flyPos = new Float32Array(FIREFLY_COUNT * 3);
  const flyCol = new Float32Array(FIREFLY_COUNT * 3);
  const moteColor = mix(PALETTE.paleGold, PALETTE.parchment, 0.3);
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    flyData.push({
      x: cosmetic.range(-ARENA.halfW + 0.6, ARENA.halfW - 0.6),
      z: cosmetic.range(-ARENA.halfD + 0.6, ARENA.halfD - 0.6),
      y: cosmetic.range(0.3, 1.35),
      vx: cosmetic.range(-0.55, 0.55), // u/s base drift
      vz: cosmetic.range(-0.55, 0.55),
      ax: cosmetic.range(0.4, 0.9), // wander sinusoid amplitudes (u)
      az: cosmetic.range(0.4, 0.9),
      rx: cosmetic.range(0.7, 1.6), // ...and their rates (rad/s)
      rz: cosmetic.range(0.7, 1.6),
      by: cosmetic.range(0.14, 0.34), // vertical bob amplitude
      ry: cosmetic.range(0.9, 2.1),
      fadeRate: cosmetic.range(0.8, 2.2), // individual blink cycle
      phase: cosmetic.range(0, Math.PI * 2),
    });
  }
  const flyGeo = new BufferGeometry();
  const flyPosAttr = new BufferAttribute(flyPos, 3);
  flyPosAttr.setUsage(DynamicDrawUsage);
  flyGeo.setAttribute('position', flyPosAttr);
  const flyColAttr = new BufferAttribute(flyCol, 3);
  flyColAttr.setUsage(DynamicDrawUsage);
  flyGeo.setAttribute('color', flyColAttr);
  const flyMat = new PointsMaterial({
    map: getRadialTexture(),
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const flies = new Points(flyGeo, flyMat);
  flies.frustumCulled = false;
  flies.renderOrder = 6;
  root.add(flies);

  let lastElapsed = null;

  function update(elapsedSec, alpha = 1) {
    // The graybox inside runs first: player rig, bolts, dummies, juice, camera.
    inner.update(elapsedSec, alpha);

    // Prop/wall ink is expanded in clip space, so it needs the live canvas size
    // to stay a constant 2 px (same contract as the critters' ink).
    setPropInkViewport(window.innerWidth, window.innerHeight);

    const dt =
      lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsedSec - lastElapsed));
    lastElapsed = elapsedSec;
    const tSec = elapsedSec;

    // Focus clamp (see CAM_CLAMP). Applied only when it actually bites, so the
    // §9 screenshake offset the graybox added is left untouched everywhere else.
    const fx = stage.camera.position.x;
    const fz = stage.camera.position.z - CAM_OFF_Z;
    const cxp = clamp(fx, -CAM_CLAMP.x, CAM_CLAMP.x);
    const czp = clamp(fz, CAM_CLAMP.zMin, CAM_CLAMP.zMax);
    if (cxp !== fx || czp !== fz) {
      stage.camera.position.x = cxp;
      stage.camera.position.z = czp + CAM_OFF_Z;
      stage.camera.lookAt(cxp, 0, czp);
    }

    // --- The Healer rig rides the sim body (same interpolation the capsule
    // used); ring + shadow are children of the rig and ride along.
    const p = world.player;
    const ix = p.px + (p.x - p.px) * alpha;
    const iz = p.pz + (p.z - p.pz) * alpha;
    healerRig.group.position.set(ix, 0, iz);

    // §3/A1: yaw turns smoothly toward aim (shortest arc). Frozen while downed.
    if (p.hp > 0) {
      let tx = p.lastAimDir?.x ?? 1;
      let tz = p.lastAimDir?.z ?? 0;
      if (p.aim) {
        const adx = p.aim.x - ix;
        const adz = p.aim.z - iz;
        const al = Math.hypot(adx, adz);
        if (al > 1e-3) {
          tx = adx / al;
          tz = adz / al;
        }
      }
      let dy = Math.atan2(tx, tz) - healerYaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      healerYaw += dy * (1 - Math.exp(-YAW_RATE * dt));
      healerRig.setYaw(healerYaw);
    }

    // Clip arbitration: downed > hurt > cast > walk/idle. Event flags were
    // raised during this frame's sim ticks; holds are wall-clock render state.
    const simSpeed = Math.hypot(p.x - p.px, p.z - p.pz) * TICK_HZ;
    const moving = simSpeed > MOVE_EPS;
    if (firedFlag) {
      firedFlag = false;
      castLeft = moving ? CAST_HOLD_MOVING : CAST_HOLD_STILL;
      healerRig.setAnim('cast', CAST_PHASE); // re-trigger AT the release pop
    }
    if (hurtFlag) {
      hurtFlag = false;
      hurtLeft = HURT_HOLD;
      healerRig.setAnim('hurt', 0); // hurt beats a cast raised the same frame
    }
    castLeft = Math.max(0, castLeft - dt);
    hurtLeft = Math.max(0, hurtLeft - dt);
    if (p.hp <= 0) healerRig.setAnim('downed');
    else if (hurtLeft > 0) healerRig.setAnim('hurt');
    else if (castLeft > 0) healerRig.setAnim('cast');
    else healerRig.setAnim(moving ? 'walk' : 'idle');

    healerRig.update(dt);
    for (const a of allies) a.update(dt);

    // Dash afterimages: one ghost per SMEAR_TICK_SPACING sim ticks of dash
    // travel (staggered silhouettes, not a per-frame slab); hard-clear at dash
    // end (§5). The schedule runs on SIM TICKS and CATCHES UP: a slow render
    // loop (headless captures run ~4-10 fps while the 60 Hz accumulator
    // bursts) would otherwise realize only one ghost per rendered frame —
    // missed spawn ticks are back-dated along the locked dash direction, each
    // placed where the body was on its spawn tick and pre-aged on its own
    // fade clock, so a mid-dash frame shows the same >=3-ghost trail at any
    // render rate.
    if (smearWarmFrames > 0 && --smearWarmFrames === 0) afterimages.clear();
    if (p.dashTicksLeft > 0) {
      // The trail is a pure FUNCTION of how far into the dash the body is: at
      // `elapsed` ticks travelled, silhouettes are frozen at elapsed-2, -4, -6…
      // back along the locked dash direction, each pre-aged by exactly the sim
      // time it is behind the body. Rebuilding it every frame (rather than
      // accumulating one ghost per rendered frame) is what makes a mid-dash
      // capture show the same >=3-ghost staggered trail whether the page is
      // running at 165 fps or hitching through the whole dash in one frame.
      const elapsed = DODGE.durationTicks - p.dashTicksLeft;
      const stepU = DODGE.distance / DODGE.durationTicks; // u per dash tick
      let mvx = p.x - p.px;
      let mvz = p.z - p.pz;
      const mvl = Math.hypot(mvx, mvz);
      if (mvl > 1e-6) {
        mvx /= mvl;
        mvz /= mvl;
      } else {
        mvx = 0;
        mvz = 0;
      }
      afterimages.clear();
      for (let k = 1; k <= 7; k++) {
        const back = k * SMEAR_TICK_SPACING; // sim ticks behind the body
        if (back > elapsed) break;
        afterimages.spawn(-mvx * stepU * back, -mvz * stepU * back, back / TICK_HZ);
      }
      lastGhostTick = world.tick;
    } else if (lastGhostTick >= 0) {
      afterimages.clear();
      lastGhostTick = -1;
    }
    // Critter ink is clip-space-expanded; it needs the live canvas size (same
    // contract as the prop ink above).
    setInkViewport(window.innerWidth, window.innerHeight);

    // Entity contact shadows: one per live sim body, recycled on despawn.
    const seen = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'dummy') continue;
      seen.add(e.id);
      let m = entityShadows.get(e.id);
      if (!m) {
        m = acquireEntityShadow();
        entityShadows.set(e.id, m);
      }
      m.position.x = e.px + (e.x - e.px) * alpha;
      m.position.z = e.pz + (e.z - e.pz) * alpha;
    }
    for (const [id, m] of entityShadows) {
      if (!seen.has(id)) {
        root.remove(m);
        entityShadowPool.push(m);
        entityShadows.delete(id);
      }
    }

    // Torch flames: fast flicker on the painted flame sprite (scale + a touch
    // of lateral sway) plus glow/pool breath, so a torch never reads as a
    // painted-on sticker.
    for (const f of flames) {
      const n =
        Math.sin(tSec * 13 + f.phase) * 0.5 +
        Math.sin(tSec * 29 + f.phase * 2.7) * 0.3 +
        Math.sin(tSec * 6.3 + f.phase * 0.6) * 0.2;
      const jit = cosmetic.range(-0.05, 0.05);
      const base = f.scale ?? 0.7; // torches 0.7, brazier bowls 0.56
      const h = base * (1 + 0.22 * n + jit);
      f.body.scale.set(h * 0.66 * (1 - 0.1 * n), h, 1);
      f.body.position.x = f.x + Math.sin(tSec * 5.1 + f.phase) * 0.014;
      f.body.position.y = f.y + 0.02 * n;
      f.glow.material.opacity = Math.max(0.16, (f.glowO ?? 0.45) + 0.18 * n + jit);
      f.glow.scale.setScalar((f.glowS ?? 1.05) * (1 + 0.1 * n)); // braziers ride a tighter halo
      f.pool.material.opacity = Math.max(0.24, (f.poolO ?? 0.6) + 0.14 * n);
      if (f.core) f.core.material.opacity = Math.max(0.08, (f.coreO ?? 0.16) + 0.05 * n);
    }
    // Lanterns + monolith halos: soft pulses (monolith "subtle glow" §19.3).
    for (const pu of pulses) {
      const j = pu.jitter ? cosmetic.range(-pu.jitter, pu.jitter) : 0;
      const k = pu.base + pu.amp * Math.sin(tSec * pu.rate + pu.phase) + j;
      pu.glow.material.opacity = Math.max(0.1, k);
      if (pu.wick) {
        const w = 0.24 * (1 + 0.16 * Math.sin(tSec * 9.4 + pu.phase));
        pu.wick.scale.set(w * 0.66, w, 1);
      }
      if (pu.spark) pu.spark.material.opacity = Math.max(0.2, 0.5 + 0.2 * Math.sin(tSec * 1.7 + pu.phase));
    }
    // The monolith's own veins breathe with the halo (capped well below the
    // clipping point so the vein cores stay violet instead of blowing white).
    if (monolithMat) {
      monolithMat.emissiveIntensity = 1.9 + 0.35 * Math.sin(tSec * 0.9);
    }
    // The real torch PointLights flicker with their flames.
    for (const tl of torchLights) {
      tl.light.intensity =
        TORCH_LIGHT.intensity * (1 + 0.13 * Math.sin(tSec * 11 + tl.phase) + 0.07 * Math.sin(tSec * 23));
    }
    // Lantern glass itself breathes (shared instanced material, so one value
    // drives every lantern — the offsets live on their glow sprites).
    if (glassBase) {
      const gk = 1 + 0.14 * Math.sin(tSec * 2.6) + 0.05 * Math.sin(tSec * 7.1);
      mats.glass.color.copy(glassBase).multiplyScalar(gk);
    }

    embers.update(tSec);

    // Fireflies: base drift + two wander sinusoids + vertical bob; wrap at the
    // walls; per-mote fade in/out through the vertex colour.
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const d = flyData[i];
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      if (d.x < -ARENA.halfW + 0.4) d.x = ARENA.halfW - 0.4;
      else if (d.x > ARENA.halfW - 0.4) d.x = -ARENA.halfW + 0.4;
      if (d.z < -ARENA.halfD + 0.4) d.z = ARENA.halfD - 0.4;
      else if (d.z > ARENA.halfD - 0.4) d.z = -ARENA.halfD + 0.4;
      flyPos[i * 3] = d.x + Math.sin(tSec * d.rx + d.phase) * d.ax;
      flyPos[i * 3 + 1] = d.y + Math.sin(tSec * d.ry + d.phase * 1.7) * d.by;
      flyPos[i * 3 + 2] = d.z + Math.cos(tSec * d.rz + d.phase) * d.az;
      // Fade: mostly-on with slow dips to near-zero (a firefly blink).
      const f = 0.5 + 0.5 * Math.sin(tSec * d.fadeRate + d.phase * 2.3);
      flyCol[i * 3] = moteColor.r * f;
      flyCol[i * 3 + 1] = moteColor.g * f;
      flyCol[i * 3 + 2] = moteColor.b * f;
    }
    flyPosAttr.needsUpdate = true;
    flyColAttr.needsUpdate = true;
  }

  // Render-side probe handle for capture-harness evals (tools/capture.mjs
  // `eval` actions): lets a verification script project prop instances to
  // screen space and attribute a pixel region to the mesh that owns it.
  // Read-only debug aid — nothing in the scene reads it.
  // `pick(sx, sy)` raycasts a SCREEN pixel and names the mesh + material colour
  // that owns it — the attribution step behind "which prop is putting pixels in
  // the reserved Ember band". Cheap and read-only; built lazily on first use.
  const pickRay = new Raycaster();
  const pickNdc = new Vector2();
  window.__arenaProbe = {
    stage,
    root,
    emitters,
    pick(sx, sy, depth = 3) {
      pickNdc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
      pickRay.setFromCamera(pickNdc, stage.camera);
      return pickRay
        .intersectObjects([root], true)
        .filter((h) => h.object.visible && h.object.material && h.object.type !== 'Points')
        .slice(0, depth)
        .map((h) => ({
          name: h.object.name || h.object.parent?.name || h.object.geometry?.type || '?',
          type: h.object.type,
          dist: Math.round(h.distance * 100) / 100,
          color: h.object.material.color ? '#' + h.object.material.color.getHexString() : null,
        }));
    },
  };

  function debugState() {
    return {
      ...(inner.debugState ? inner.debugState() : {}),
      variant: spec.id,
      variantName: spec.name,
      // v0.3.0 party integration — lets captures assert clip state + presence.
      party: {
        healerAnim: healerRig.getAnim(),
        healerYaw: Math.round(healerYaw * 100) / 100,
        smearGhosts: afterimages.count(),
        allies: allies.map((a) => ({
          classId: a.classId,
          anim: a.getAnim(),
          x: a.group.position.x,
          z: a.group.position.z,
        })),
      },
      grass: foliage.grassCount,
      flowers: foliage.flowerCount,
      propTypes: typeCount,
      propShadows: shadows.length,
      emitters: emitters.length,
      embers: embers.count,
      treeline,
      wall: wallInfo,
      lightsTuned,
      // Sampled mote position — lets a capture prove the motes actually move.
      mote0: [
        Math.round(flyPos[0] * 1000) / 1000,
        Math.round(flyPos[1] * 1000) / 1000,
        Math.round(flyPos[2] * 1000) / 1000,
      ],
    };
  }

  return { name: `arena-v${spec.id}`, root, update, debugState, allies };
}
