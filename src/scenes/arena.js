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
//
// GAUNTLET (M4b, BUILD_BRIEF §23.1): the arena now holds one DRESSING per room
// layout (1-3 Hollow Wood = the certified variants, 4-6 Sunken Mill, 7-9 Ashen
// Barrow). Each dressing is a hidden group (ground, apron, surround, props,
// foliage, walls, fire/lantern FX, 2 torch PointLights, its own boss/shop room
// sets) built once — the boot layout synchronously, the rest in ~8 ms slices by
// a background builder (env/biomes/builder.js, pumped from main.js's M4b
// RENDER-TICK) — and swapped by `applyLayout(layoutId)` on the run's
// `layout_enter` (under the §13 transition fade), by M2's restoreScene and by
// the ?variant= / ?layout= harness. Each swap applies that biome's light rig.
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
import { layoutSpec, biomeInfo, biomeOfLayout, LAYOUT_SPEC_IDS } from '../env/biomes/index.js';
import { registerDressingPump, pumpStatsDebug } from '../env/biomes/builder.js';
import { requestPaint, stats as paintStats } from '../env/biomes/paint-client.js';
import { paintGroundSteps, groundMeshFromCanvas, paintApronSteps, apronMeshFromCanvas, drain } from '../env/ground.js';
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
import { variantLayoutRng } from '../env/layout.js';
import { createAfterimages } from '../render/critters/afterimage.js';
import { installBandGuard, bandGuardInfo, guardSubtree } from '../env/bandguard.js';
import { compileAsyncSafe } from '../render/precompile.js';

// Yielded by a dressing build that is waiting on the paint worker: the
// background pump stops for the frame instead of spinning on it.
const WAIT = Symbol('dressing-wait');

// Render-cosmetic scaffold numbers (grouped; not brief-bound gameplay values).
const FIREFLY_COUNT = 120;
const TORCH_LIGHT = { intensity: 13.0, distance: 11, decay: 2 };
// Room 8 (run block, §11 "room a stop darker", "boss = brightest emitter"):
// while the Hollow Stag lives every FIRE emitter — wall torch AND brazier
// bowl: painted flame, halo, pool and the torch PointLights — runs one
// photographic stop (0.5x) down. Round D F5a measured the fires at 7.8-10.9%
// LUMA >200 against the Stag's 0.45%; the boss layer's light dim never
// reached them because the flicker loop below rewrites the torch intensity
// every frame and the sprites are not lights. (The critic's "torches" are the
// mid-field brazier bowls — the wall torches project off-frame in room 8.)
const BOSS_TORCH_DIM = 0.5;
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
function tuneActOneLighting(scene, mood = {}, biomeLight = null) {
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
    // Biome rig (M4b): a colder moon over the barrow, a whiter key over the mill.
    if (biomeLight && biomeLight.keyTint) key.color.lerp(new Color(biomeLight.keyTint), 0.55);
    if (biomeLight && biomeLight.keyWhite) key.color.lerp(new Color('#FFFFFF'), biomeLight.keyWhite * 0.5);
    key.intensity = ACT1_LIGHT.keyIntensity * kMul;
  }
  if (fill) {
    fill.color.copy(biomeLight && biomeLight.sky ? new Color(biomeLight.sky) : ACT1_LIGHT.skyColor);
    fill.groundColor.copy(biomeLight && biomeLight.ground ? new Color(biomeLight.ground) : ACT1_LIGHT.groundColor);
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

// FIX ROUND 2 — EMITTER HALOS SORT UNDER THE IDENTITY RINGS.
//
// A glow halo is an ADDITIVE LIGHT DECAL, the same family as `groundPool`, and
// §17 Zone 3 makes identity rings "exempt from all palette/lighting shifts".
// Drawn at renderOrder 6-8 the halos were painting over the ring bands of any
// party member leashed near a fire: measured per arc on variant 3 with the party
// at (8.6,-3.8) (tools/zd-ringdiff.js), the Swordsman stands 0.66 u from a
// brazier and his fire-facing arc read h3.8 rgb(205,124,114) against his h348.2
// accent — salmon, inside the h5-25 Ember band criterion 1 reserves for enemy
// threats — with the ring's own dark ink stroke lifted from luma ~45 to 107.
// With bloom disabled the same arc still read 14 deg off, so it was never the
// bloom skirt: it was these sprites. HALO_ORDER puts them where the pools
// already are relative to the ring — after the ground and the contact shadows,
// BEFORE the band at renderOrder -1 — which is the z-order the critic's fix
// direction (a) names: the ring above the additive light decals, and far below
// the `telegraph` group's 2. Nothing else changes: the halos are depthTest'd
// sprites, so a body in front of a fire still occludes its glow, and the flame
// sprites themselves stay at renderOrder 8.
const HALO_ORDER = -1.5;
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
  // ?layout=N (M4b content harness) wins over ?variant=N; both pick the boot
  // dressing (1-9). Default: layout 1, the certified clearing.
  const vParam = parseInt(params.get('layout') ?? params.get('variant') ?? '1', 10);
  const spec = layoutSpec(vParam) ?? layoutSpec(1);

  let lightsTuned = tuneActOneLighting(stage.scene, spec.mood, biomeInfo(spec.id)?.light ?? null);

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

  // --- Room DRESSING runs off the per-variant LAYOUT stream, not the cosmetic
  // one (env/layout.js). Fix-round-2 finding: the floor's shade pockets are the
  // frame's cool counterweight and the grass/prop scatter is most of its
  // coloured-pixel denominator, so drawing them from an unseeded stream made
  // the frame's measured cool share swing 6.8%-30.7% and its reserved-band
  // count 59-760 px on the SAME variant, load to load. The dressing of a room
  // is a property of the room; only things that must be alive frame to frame
  // (flame flicker, embers, motes, particle spread, idle sway) keep the
  // cosmetic stream below.
  // --- DRESSINGS (M4b): one per layout, built by `buildDressingSteps` (a
  // generator — yields between the heavy canvas passes so the background
  // builder can slice it). Same build ORDER as the certified single-variant
  // arena (ground -> apron -> surround -> props -> shadows -> foliage -> walls
  // on the per-layout LAYOUT stream), so layouts 1-3 are unchanged.
  const dressings = new Map(); // layoutId -> dressing
  let active = null;
  // @gnt:CAMPAIGN RESIDENCY-STATE begin — PLAN §12.5: exactly one level's
  // dressings resident (null = the legacy keep-everything rule, until the
  // campaign level manager sets a level). `preloadAct` = the next level being
  // built under the level-transition card.
  let residentAct = null;
  let preloadAct = null;
  const actOf = (id) => biomeInfo(id)?.act ?? null;
  const wantedId = (id) => residentAct === null || actOf(id) === residentAct || actOf(id) === preloadAct;
  const residencyLog = { disposals: 0, disposedIds: [], lastMs: 0, maxMs: 0, freed: { geometries: 0, materials: 0, textures: 0 } };
  // @gnt:CAMPAIGN RESIDENCY-STATE end
  let mountEmitters = null; // bound below (needs the emitter FX helpers)
  // `offThread`: the background builder paints the two canvases in the paint
  // worker (env/biomes/paint-worker.js) and yields WAIT until they land; the
  // synchronous path (boot, a room entered before its build finished) paints
  // here. Either way the layout stream ends in the same state before the
  // treeline / props / foliage draw from it.
  function* buildDressingSteps(dspec, offThread = false) {
    const group = new Group();
    group.name = `dressing-L${dspec.id}`;
    group.visible = false;
    const layout = variantLayoutRng(dspec.id);
    // --- Ground + dressed exterior.
    let groundCanvas = null;
    let apronCanvas = null;
    if (offThread) {
      // CAMPAIGN: a paint prefetched when the level was queued (the worker
      // paints the next layouts while this thread builds the current one).
      const req = takePrefetch(dspec.id) ?? requestPaint(dspec.id);
      while (!req.done) yield WAIT;
      if (req.ok) {
        groundCanvas = req.ground;
        apronCanvas = req.apron;
        layout.skip(req.draws);
      }
    }
    if (!groundCanvas) groundCanvas = yield* paintGroundSteps(dspec, layout);
    const ground = groundMeshFromCanvas(groundCanvas);
    group.add(ground);
    yield;
    if (!apronCanvas) apronCanvas = yield* paintApronSteps(dspec, layout);
    const apron = apronMeshFromCanvas(apronCanvas);
    group.add(apron);
    yield;
    const treeline = buildTreeline(group, dspec, layout);
    yield; // (each big step its own slice: gauntlet MENU-R1-F1)
    // --- Props first: their footprints mask the foliage scatter, so a blade
    // of grass can never grow through a crate face.
    const { emitters, shadows, footprints, mats, typeCount, monolithMat, dressing, roomDressingDispose } = buildProps(group, dspec, layout);
    buildShadowInstances(group, shadows);
    yield;
    const foliage = buildFoliage(group, dspec, layout, footprints);
    const glassBase = mats?.glass ? mats.glass.color.clone() : null;
    yield;
    // --- The built boundary (walls + coping + capstone run).
    const wallInfo = buildWalls(group, dspec, layout);
    yield;
    const fx = mountEmitters(group, emitters, dspec);
    root.add(group);
    // gauntlet r4 J4-F1 (INT): band-guard the dressing BEFORE its programs are
    // precompiled / warm-drawn, so the variant it warms is the one it draws with
    // (the 30-frame rescan used to patch it 0.2 s into the room: one relink).
    guardSubtree(group);
    return {
      id: dspec.id,
      spec: dspec,
      group,
      groundCanvas,
      textures: [ground.material.map, apron.material.map].filter(Boolean),
      treeline,
      emitters,
      shadows,
      mats,
      typeCount,
      monolithMat,
      roomDressing: dressing,
      roomDressingDispose,
      foliage,
      glassBase,
      wallInfo,
      ...fx,
      gpuReady: false,
    };
  }

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
  // at each SMEAR_TICK_OFFSETS entry of dash travel — up to 6 over the 15-tick
  // dash, each fading on its own clock — and §5's contract holds: every ghost
  // is hard-cleared the frame the dash ends.
  // Uniform 2-tick spacing was measured as unreachable in practice when the
  // trail was ACCUMULATED one ghost per render frame: a capture-harness frame
  // can swallow the whole dash (logged: dashTicksLeft 15 -> 14 -> 13, then one
  // 216 ms hitch and the dash was over), so a mid-dash frame showed one ghost,
  // not a trail. The schedule below is REBUILT from dash state every frame
  // instead of accumulated, so the trail is identical at any render rate.
  //
  // FIX ROUND 2 (C5 advisory) — the offsets are a LADDER, not a constant
  // spacing. The dash is 1.8 u in 15 ticks (§5) and a chibi body is ~0.55 u
  // across: at a flat 2 ticks the silhouettes sat 0.24 u apart, i.e. every
  // point of the trail was covered by 2-3 ghosts and the frozen row measured
  // L 184-206 across ~90 continuous px — one pale slab. Widening the flat
  // spacing to 3 would have fixed the density but broken the count (only two
  // ghosts exist until tick 9 of 15, and criterion 5 wants >=3 in a MID-dash
  // frame), so the ladder keeps the first two offsets tight — 3 ghosts exist
  // from tick 6, exactly as before — and spreads everything older to 3 ticks
  // (0.36 u, ~33 screen px at gameplay zoom, against a ~50 px body), which is
  // where the separation actually has to appear. The 15-tick offset is the
  // dash's own length: it exists so the trail still reaches the dash origin,
  // and it lands at 0.25 s of a 0.26 s fade, i.e. essentially zero alpha.
  const SMEAR_TICK_OFFSETS = [1.5, 3, 6, 9, 12, 15];
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
  mountEmitters = function mountEmittersImpl(dRoot, emitters, spec) {
  const flames = []; // { body, glow, pool, phase }
  const pulses = []; // lantern/monolith halos
  const fireSources = []; // ember spawn points
  let poolSeq = 0;
  const poolY = () => 0.011 + poolSeq++ * 0.0008; // stagger, never z-fight
  // GAUNTLET biome floors (wet slate, grave paving) are two value steps
  // lighter than the Act-I night field, and an ADDITIVE pool on a light floor
  // reads as cream haze, not firelight: `mood.poolGain` scales every fire
  // pool's opacity for such a biome. Act I: unset = 1.
  const poolGain = spec.mood?.poolGain ?? 1;
  // ...and a biome may tint its pools deeper amber (`mood.poolTint`): the
  // Act-I pale-gold pool summed over blue-grey paving is cream, not fire.
  const poolColor = spec.mood?.poolTint ? new Color(spec.mood.poolTint) : EMBER_GLOW.pool;

  for (const em of emitters) {
    if (em.kind === 'flame') {
      // Flame billboard, pushed FLAME_LIFT along the view axis so the torch
      // shaft can never depth-clip its own fire (F7), and authored above 1.0 in
      // linear so its core clears the bloom threshold and reads as a LIGHT
      // SOURCE with a white-hot centre rather than a painted decal (F2).
      const fy = em.y + 0.13 + TOWARD_CAM.y * FLAME_LIFT;
      const fz = em.z + TOWARD_CAM.z * FLAME_LIFT;
      // Gain 1.55 (was 2.15) and a tighter halo (a first cut ran 2.6 / size
      // 1.3 / 0.55): above ~2.2 the painted flame clips to featureless white
      // and the bloom skirt swallows the torch stake, so the pool loses the
      // very thing that attributes it. The flame has to stay a readable SHAPE.
      // 1.55 is the fix-round-2 cap (env/flame.js GAIN_MAX): it holds the
      // AMBER BODY under the bloom threshold so only the painted white core
      // blooms. Above it the whole orange flame is a bloom source and
      // UnrealBloomPass spreads that orange over the frame as the veil that
      // was putting the party's own ink strokes in the reserved h5-25 band.
      const body = makeFlameSprite(0.7, 1, 1.55);
      body.position.set(em.x, fy, fz);
      body.renderOrder = 8;
      dRoot.add(body);
      // Halo 0.85 / 0.30 (was 1.05 / 0.45), i.e. the brazier bowl's proportions
      // (0.8 / 0.42) rather than a third again as wide. Fix-round-2 C1 quality
      // advisory: the wall torches read as near-white COLUMNS instead of fire —
      // sampled down the v2 north torch's axis the sprite measured hue 36-50 at
      // saturation 0.15-0.22, against hue 39-49 at saturation 0.32-0.55 for a
      // brazier bowl in the same frame. The cause is the additive cream halo
      // sitting ON the flame over a PALE STONE WALL: the bowls fire over dark
      // ground, where the same halo has somewhere to fall off to, but on the
      // north wall the halo, the wall and the flame's own bloom skirt all sum
      // in one bright neighbourhood and wash the painted amber out of the fire.
      // Trimming the halo hands the emitter's colour back to the flame sprite.
      const glow = makeGlowSprite({ color: EMBER_GLOW.halo, size: 0.85, opacity: 0.3 });
      glow.renderOrder = HALO_ORDER;
      glow.position.set(em.x, em.y + 0.08 + TOWARD_CAM.y * FLAME_LIFT, fz);
      dRoot.add(glow);
      // Pool footprint kept TIGHT (radius 2.0): the broad shaft texture's
      // mid-alpha feather over cool shade ground is exactly the mauve murk
      // that lands in the h5-25 danger band, and it also washes the painted
      // shade pockets out of the frame's cool share.
      // Opacity 0.46 (a first cut ran 0.58 on a near-white tint): additive
      // strength and tint saturation trade off against the same danger gate,
      // and a slightly dimmer pool of REAL amber reads as firelight where a
      // brighter pool of cream read as a stage spotlight.
      // Radius 2.4 at opacity 0.40 (was 2.0 at 0.48): with the tint back on
      // real gold, a BROADER, dimmer pool puts more chromatic warm on the
      // floor than a tighter, hotter one — the hot version clipped its core
      // to a desaturated near-white that the analyzer does not count as warm
      // at all, and that reads as a spotlight rather than as firelight.
      // ROUND D — pool opacities raised (torch 0.40 -> 0.66, brazier
      // 0.42 -> 0.72, lantern 0.38 -> 0.58). Capping the flame gain at
      // env/flame.js GAIN_MAX 0.96 (so only the near-NEUTRAL white core is a
      // bloom source) removed the fires' blown-out skirt, and with it ~7000 px
      // of the frame's LUMA >200 (variant 1 spawn measured 1.14% -> 0.55%).
      // That light has to come back from a source that cannot re-create the
      // problem, and the POOL is it: at 0.72 its core composites to ~0.57
      // linear — display ~206, i.e. inside the >200 bucket — while staying
      // clear of the 0.68 bloom threshold, so it brightens the floor without
      // smearing anything over the party. It is also the physically right
      // place for the light: a fire on a floor makes a hot floor.
      // FIX ROUND 2 — pool opacities trimmed back (torch 0.66 -> 0.44,
      // brazier 0.72 -> 0.46, lantern 0.58 -> 0.34). The Round-D note above
      // solved the pool's core against the 0.68 bloom threshold ON ITS OWN, but
      // the pool is ADDITIVE: what UnrealBloomPass thresholds is pool + the lit
      // ground under it + a PointLight that sits at the same emitter, and that
      // sum cleared 0.68 comfortably. So the POOLED GROUND became a bloom
      // source, and its skirt is warm gold. Measured on variant 3 with the
      // party leashed at (8.6,-3.8), per-arc with tools/zd-ringdiff.js: the
      // Healer's brazier-facing arc read h124.6 against her h138.0 accent
      // (13.4 deg) as shipped and h138.1 (0.1 deg) with bloom disabled — i.e.
      // every degree of that drift was the pooled ground's own bloom landing on
      // an unlit decal, which is exactly the §17 exemption criterion 2 asks
      // for. The frame can afford it: the >200 gate is 0.4% and the three
      // variants were measuring 2.96-3.58%.
      const pool = groundPool(poolColor, 2.4, 0.44 * poolGain, poolY(), true);
      pool.position.x = em.x;
      pool.position.z = em.z;
      dRoot.add(pool);
      flames.push({ body, glow, pool, poolO: 0.44 * poolGain, poolGain, glowS: 0.85, glowO: 0.3, x: em.x, y: fy, z: fz, torch: true, phase: cosmetic.range(0, Math.PI * 2) });
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
      // 0.03, effectively zero (fix round 2). The view-axis lift magnifies a
      // sprite's distance from screen centre, and at 0.10 the bowl fires were
      // measuring 13-20 px off their own bowls at gameplay zoom — a flame
      // beside a dark lump rather than a flame IN it. A squat bowl cannot
      // depth-clip its own billboard the way a tall torch stake can (that is
      // what FLAME_LIFT is for), so the brazier needs almost none.
      const BRAZIER_LIFT = 0.03;
      // FIX ROUND 2 — the fire has to clear its own bowl.
      //
      // The flame billboard is 0.95 u tall and the shared texture paints its
      // white-hot core LOW, 24% up from the sprite's base (env/flame.js), so
      // at the old +0.06 the core sat at world y 0.67 — under the bowl's rim
      // at 0.858, i.e. behind the iron the camera is looking down at. What
      // survived was the transparent TIP of the teardrop, which is why a 4x
      // crop read "a gold dome with a soft warm bleed and no flame tongue, no
      // white-hot core" (Round D advisory) and the emitter's fire-ness was
      // carried by the pool decal alone. +0.32 puts the painted core at
      // y 0.95, about 0.09 clear of the rim, while the sprite's own base
      // (0.72) stays INSIDE the bowl so the flame still reads as rising out
      // of the coals rather than hovering over them. This is geometry only —
      // the gain (and therefore what the bloom pass sees) is untouched, so it
      // cannot re-create the warm veil that criterion 1 is about.
      const fy = em.y + 0.30 + TOWARD_CAM.y * BRAZIER_LIFT;
      const fz = em.z + TOWARD_CAM.z * BRAZIER_LIFT;
      // Flame 0.95: the bowl fire is the emitter's whole tell and at 0.72 it
      // was smaller than the pool's blown core, so it read as part of the
      // glow instead of as the thing making it.
      // Gain 1.6 — the highest in the scene, but only just, and now capped at
      // env/flame.js GAIN_MAX so the amber body stays under the bloom
      // threshold. The fire still has to be the brightest thing in its own
      // pool or the emitter reads as a dark object sitting in someone else's
      // light; the white-hot painted core does that job at 1.39 linear while
      // the body sits at 0.638. The old 2.35 put the BODY at 0.94 — the whole
      // orange teardrop became bloom fuel, which is what blew the bowl out to
      // a featureless white blob (the F1 advisory's re-raise) and veiled the
      // frame warm. Torches run 1.55, the lantern wick 1.5.
      const body = makeFlameSprite(0.8, 1, 1.6);
      body.position.set(em.x, fy, fz);
      body.renderOrder = 8;
      dRoot.add(body);
      // Halo 0.8 / 0.42: measured on a 4x crop, the wider halo's bloom skirt
      // ate the right half of the bowl, leaving a bright blob with a dark
      // smudge in it. A tighter halo keeps the whole pedestal-column-bowl
      // silhouette readable against its own pool, which IS the F1 fix.
      const glow = makeGlowSprite({ color: EMBER_GLOW.halo, size: 0.8, opacity: 0.42 });
      glow.renderOrder = HALO_ORDER;
      glow.position.set(em.x, em.y + 0.1 + TOWARD_CAM.y * BRAZIER_LIFT, fz);
      dRoot.add(glow);
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
      const pool = groundPool(poolColor, 3.0 * poolR, 0.46 * poolGain, poolY(), true);
      pool.position.x = em.x;
      pool.position.z = em.z;
      dRoot.add(pool);
      // Core 0.30 at radius 1.05 (a first cut ran 0.50 at 1.20): stacked on
      // the pool below it, the fat bright core clipped to featureless white —
      // measured rgb(255,242,208) at saturation 0.18 dead centre — which is
      // exactly the "sourceless white blob" read the F1 advisory is about. A
      // smaller, dimmer core keeps a hot centre that still carries hue.
      // (No second "hot core" pool. It stacked on the pool above and clipped
      // the ground around the pedestal to featureless white, which is exactly
      // what turned the emitter into a backlit smudge — the F1 defect this
      // whole prop exists to fix. The FLAME is the hot centre now.)
      flames.push({ body, glow, pool, poolO: 0.46 * poolGain, poolGain, glowS: 0.8, glowO: 0.42, x: em.x, y: fy, z: fz, scale: 0.8, torch: true, phase: cosmetic.range(0, Math.PI * 2) });
      fireSources.push({ x: em.x, y: em.y + 0.12, z: fz });
    } else if (em.kind === 'lantern') {
      // A lantern is a FIRE, not a cold lamp: a small flame inside the glass
      // plus a warm halo, so it registers as the same emitter family as the
      // torches beside it.
      const wick = makeFlameSprite(0.24, 0.95, 1.5);
      wick.position.set(em.x, em.y + 0.01 + TOWARD_CAM.y * 0.1, em.z + TOWARD_CAM.z * 0.1);
      wick.renderOrder = 8;
      dRoot.add(wick);
      // Halo trimmed 1.15/0.80 -> 0.82/0.34 (and the pulse base 0.70 -> 0.32,
      // amp 0.16 -> 0.07, below). A lantern hangs at chest height, so its halo
      // sprite is a camera-facing disc that covers the FLOOR around it, and at
      // 0.8 additive amber it was washing every ground decal within about a
      // metre: on variant 3 the party leashes either side of this prop, and the
      // Swordsman's and Archer's brazier-facing arcs measured h3.4 / h52.6
      // against their h348.2 / h72.2 accents, with the ring's own dark ink
      // stroke lifted to luma 154 against ground 192. The halo still reads as a
      // halo (it is the same 0.42-0.46 family as the brazier's) — it just stops
      // being a second, unattributed light source on the floor.
      const glow = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.82, opacity: 0.34 });
      glow.renderOrder = HALO_ORDER;
      glow.material.color.copy(EMBER_GLOW.halo);
      glow.position.set(em.x, em.y, em.z);
      dRoot.add(glow);
      const pool = groundPool(EMBER_GLOW.pool, 1.9, 0.34, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      dRoot.add(pool);
      pulses.push({ glow, base: 0.32, rate: 3.1, amp: 0.07, jitter: 0.05, phase: cosmetic.range(0, Math.PI * 2), wick });
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
      glow.renderOrder = HALO_ORDER;
      glow.material.toneMapped = false;
      // Same pre-compensated violet family as the veins so the HALO carries the
      // accent hue too (an ACES-flattened violet sprite measured as neutral
      // dark teal).
      glow.material.color.setRGB(HALO_VIOLET[0], HALO_VIOLET[1], HALO_VIOLET[2], LinearSRGBColorSpace);
      glow.position.set(em.x, em.y, em.z);
      dRoot.add(glow);
      const spark = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.6, opacity: 0.55 });
      spark.renderOrder = HALO_ORDER;
      spark.material.toneMapped = false;
      spark.material.color.setRGB(HALO_VIOLET[0], HALO_VIOLET[1], HALO_VIOLET[2], LinearSRGBColorSpace);
      spark.position.set(em.x, em.y + 0.18, em.z);
      dRoot.add(spark);
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
      dRoot.add(pool);
      pulses.push({ glow, base: 0.6, rate: 0.9, amp: 0.12, jitter: 0, phase: cosmetic.range(0, Math.PI * 2), spark });
    }
  }

  const embers = createEmberField(dRoot, fireSources, cosmetic, 9);

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
    dRoot.add(light);
    torchLights.push({ light, phase: cosmetic.range(0, Math.PI * 2) });
  }
  return { flames, pulses, fireSources, torchLights, embers };
  };
  let torchDim = 1; // room-8 torch stop-down, eased (see BOSS_TORCH_DIM)

  // --- Layout activation (M4b). Swaps the visible dressing and its light rig;
  // dressing only — no sim writes, no seating (PLAN §3.6 (a)).
  let lightExpect = null;
  function applyLight(d) {
    lightsTuned = tuneActOneLighting(stage.scene, d.spec.mood, biomeInfo(d.spec.id)?.light ?? null);
    let key = null;
    let fill = null;
    for (const obj of stage.scene.children) {
      if (obj.isDirectionalLight && !key) key = obj;
      else if (obj.isHemisphereLight && !fill) fill = obj;
    }
    lightExpect = key && fill ? { key, fill, ki: key.intensity, fi: fill.intensity, kc: key.color.getHex(), fc: fill.color.getHex() } : null;
  }
  function activate(d) {
    if (active !== d) {
      const prev = active;
      if (active) active.group.visible = false;
      active = d;
      d.group.visible = true;
      if (root.visible) d.drawnOnce = true;
      root.name = `arena-v${d.id}`;
      if (typeof window !== 'undefined') window.__groundCanvas = d.groundCanvas;
      // @gnt:CAMPAIGN ACTIVATE begin — the finished level's last dressing (the
      // one still drawn under the level-clear card) goes the moment the next
      // level's first room is on screen (PLAN §12.5 residency).
      if (prev && residentAct !== null && !prev.disposed && actOf(prev.id) !== residentAct) disposeDressings([prev], 'replaced');
      // @gnt:CAMPAIGN ACTIVATE end
    }
    applyLight(d);
    return d;
  }
  // Background builder: every other layout, ~8 ms of generator steps per
  // frame (the title / camp have that to spare), then the GPU upload of its
  // two canvases and a 3-frame parked draw that links its programs.
  const queue = [];
  let job = null;
  let uploading = null; // { d, i } — a built dressing's textures still to upload
  let warmDraw = null; // { d, frames, culled: Map }
  const buildStats = { built: [], syncBuilds: [], slices: 0, maxSliceMs: 0, failed: {}, timeline: [] };
  // CAMPAIGN (PLAN §12.5): paint prefetch for the queued layouts of the
  // resident level + a per-layout timeline (probe: where preload time goes).
  const prefetched = new Map(); // layoutId -> paint request
  function prefetchPaints(ids) {
    for (const id of ids) {
      if (prefetched.has(id) || dressings.has(id) || (job && job.id === id)) continue;
      prefetched.set(id, requestPaint(id));
    }
  }
  function takePrefetch(id) {
    const r = prefetched.get(id) ?? null;
    prefetched.delete(id);
    return r;
  }
  const tl = (id, key) => {
    let rec = buildStats.timeline.find((x) => x.id === id && x.warm === undefined);
    if (!rec) {
      rec = { id, at: Math.round(performance.now()) };
      buildStats.timeline.push(rec);
      if (buildStats.timeline.length > 24) buildStats.timeline.shift();
    }
    rec[key] = Math.round(performance.now() - rec.at);
  };
  // A dressing whose build throws is never retried and never breaks the frame
  // loop: the room keeps the dressing it has (reported in debugState().layout).
  const fail = (id, err) => {
    buildStats.failed[id] = String((err && err.message) || err);
    console.error(`[arena] dressing ${id} failed to build:`, err);
  };
  function enqueueAll(firstAct = null) {
    const order = LAYOUT_SPEC_IDS.slice().sort((x, y) => {
      const ax = firstAct && biomeInfo(x)?.act === firstAct ? 0 : 1;
      const ay = firstAct && biomeInfo(y)?.act === firstAct ? 0 : 1;
      return ax - ay || x - y;
    });
    queue.length = 0;
    // CAMPAIGN residency (PLAN §12.5): only the resident level's layouts are
    // ever built in the background.
    for (const id of order) if (wantedId(id) && !dressings.has(id) && !buildStats.failed[id] && (!job || job.id !== id)) queue.push(id);
  }
  function finishGpu(d) {
    for (const t of d.textures) {
      try {
        stage.renderer.initTexture(t);
      } catch {
        /* initTexture is best effort */
      }
    }
    d.gpuReady = true;
  }
  function beginWarmDraw(d) {
    if (d === active && root.visible) return;
    const culled = new Map();
    const lights = [];
    d.group.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isSprite) {
        culled.set(o, o.frustumCulled);
        o.frustumCulled = false;
      }
      // Its torch lights stay OFF while parked: two extra PointLights change
      // NUM_POINT_LIGHTS, and three.js then relinks EVERY lit program in the
      // scene (measured: a 626 ms frame at a room clear, all of it
      // getProgramInfoLog) — and relinks them again when the park ends. With
      // the lights off the parked meshes link against the live light count,
      // which is exactly the variant they will draw with once active.
      if (o.isLight && o.visible) {
        lights.push(o);
        o.visible = false;
      }
    });
    d.group.scale.setScalar(0.001);
    d.group.position.set(0, -60, 0);
    d.group.visible = true;
    // gauntlet r4 J4-F1 (INT): the camp hides the whole arena root
    // (camp.js setMode), so a dressing parked under it was never DRAWN — its
    // programs met the GPU in the first room that showed them (measured: the
    // monolith's first use on the run's first frame, 17 ms of
    // getProgramInfoLog plus the lazy executable compile). While the root is
    // hidden the parked dressing hangs off the scene itself for its frames.
    const host = root.visible ? null : d.group.parent;
    if (host) stage.scene.add(d.group);
    warmDraw = { d, frames: 3, culled, lights, host };
  }
  function endWarmDraw() {
    const { d, culled, lights, host } = warmDraw;
    tl(d.id, 'warm');
    for (const [o, v] of culled) o.frustumCulled = v;
    for (const l of lights) l.visible = true;
    if (host) host.add(d.group);
    d.drawnOnce = true;
    d.group.scale.setScalar(1);
    d.group.position.set(0, 0, 0);
    d.group.visible = d === active;
    warmDraw = null;
  }
  // budgetMs 0 (live combat): nothing runs on this thread — a paint already
  // in the worker keeps going there, and its continuation waits for a calm
  // frame (the next room's dressing is always ready long before it is needed:
  // reward / path / camp frames run the full budget).
  // A finished background dressing first LINKS its programs off the main
  // thread (compileAsync over KHR_parallel_shader_compile, against the live
  // lights and the composer's render target so the variants match what will
  // draw), and only then takes its parked warm draw — which is left with the
  // GPU-side executable compile alone. Measured before: a 154 ms frame at a
  // room clear, 73% of it getProgramInfoLog waiting on links.
  // gauntlet r5 CAMPAIGN F2: through compileAsyncSafe — a level change that
  // disposes this dressing while its links are pending (Level Select -> III
  // during the camp's Level-1 preload, a ?level=3 boot) used to throw
  // "reading 'isReady'" from three's poll timer and leave the promise hanging.
  let compiling = null; // { d, ready }
  const compileLog = { runs: 0, dropped: 0, timedOut: 0, maxMs: 0 };
  function precompile(d) {
    const R = stage.renderer;
    if (typeof R.compile !== 'function' || !R.properties || !stage.composer) return beginWarmDraw(d);
    const job2 = { d, ready: false };
    compiling = job2;
    const prevRT = R.getRenderTarget();
    try {
      R.setRenderTarget(stage.composer.readBuffer);
      compileLog.runs++;
      compileAsyncSafe(R, d.group, stage.camera, stage.scene).then(
        (r) => {
          compileLog.dropped += r.dropped;
          if (r.timedOut) compileLog.timedOut++;
          compileLog.maxMs = Math.max(compileLog.maxMs, r.ms);
          job2.ready = true;
        },
        () => {
          job2.ready = true;
        }
      );
    } catch {
      job2.ready = true;
    } finally {
      R.setRenderTarget(prevRT);
    }
    return null;
  }
  const stepCost = []; // gauntlet r4 J4-F1: learned ms per build step index (see pump)
  function pump(budgetMs = 8) {
    if (warmDraw) {
      if (--warmDraw.frames <= 0) endWarmDraw();
      return;
    }
    if (!(budgetMs > 0)) return;
    // A finished background dressing uploads ONE texture per pump call (floor
    // 2048 px, apron 1600 px: 10-35 ms of texSubImage2D each on the main
    // thread), so no single frame carries both (gauntlet MENU-R1-F1).
    if (uploading) {
      const u = uploading;
      const t = u.d.textures[u.i++];
      if (t) {
        const tu = performance.now();
        try {
          stage.renderer.initTexture(t);
        } catch {
          /* initTexture is best effort */
        }
        const um = Math.round((performance.now() - tu) * 10) / 10;
        buildStats.maxUploadMs = Math.max(buildStats.maxUploadMs ?? 0, um);
        (buildStats.uploads ||= []).push({ id: u.d.id, i: u.i - 1, ms: um, w: t.image ? t.image.width : null, at: Math.round(tu) });
        if (buildStats.uploads.length > 24) buildStats.uploads.shift();
      }
      if (u.i >= u.d.textures.length) {
        uploading = null;
        u.d.gpuReady = true;
        tl(u.d.id, 'uploaded');
        precompile(u.d);
      }
      return;
    }
    if (compiling) {
      if (!compiling.ready) return;
      const d = compiling.d;
      compiling = null;
      beginWarmDraw(d);
      return;
    }
    // gauntlet r4 J4-F1 (INT): in the camp (arena root hidden) a built
    // dressing that has never been drawn — the boot's own layout, built
    // synchronously and never parked — takes one parked draw too.
    if (!job && !root.visible) {
      for (const x of dressings.values()) {
        if (x.drawnOnce || x.disposed || !x.gpuReady) continue;
        beginWarmDraw(x);
        return;
      }
    }
    const t0 = performance.now();
    if (!job) {
      while (queue.length && dressings.has(queue[0])) queue.shift();
      // Inside a run only the run's own act is built: another act's floor
      // upload + parked draw costs a GPU-side 150-180 ms frame (measured on
      // the reward / path screens with the builder on; none with it paused
      // during the run), and nothing in this run can need it. The camp picks
      // the rest up after the run.
      const pick =
        residentAct !== null
          ? queue.findIndex((i) => !dressings.has(i) && wantedId(i))
          : runAct
            ? queue.findIndex((i) => !dressings.has(i) && biomeInfo(i)?.act === runAct)
            : 0;
      if (!queue.length || pick < 0) return;
      const id = queue.splice(pick, 1)[0];
      job = { id, gen: buildDressingSteps(layoutSpec(id), true), t0, waiting: false, step: 0 };
      tl(id, 'start');
    }
    let ran = 0;
    try {
      while (performance.now() - t0 < budgetMs) {
        // gauntlet r4 J4-F1 (INT, GI.6): every layout runs the same step order,
        // so each step's cost is learned (EMA); a step predicted to overrun the
        // slice waits for the next frame unless nothing ran yet (progress) —
        // the level-clear card used to chain treeline + props (13 + 65 ms).
        const est = stepCost[job.step];
        if (ran > 0 && est !== undefined && performance.now() - t0 + est > budgetMs) break;
        const s0 = performance.now();
        const r = job.gen.next();
        if (r.value === WAIT) {
          job.waiting = true;
          break;
        }
        const sm = performance.now() - s0;
        stepCost[job.step] = est === undefined ? sm : est * 0.6 + sm * 0.4;
        job.step += 1;
        ran += 1;
        job.waiting = false;
        if (r.done) {
          dressings.set(job.id, r.value);
          buildStats.built.push(job.id);
          job = null;
          uploading = { d: r.value, i: 0 }; // next pump calls: textures, then precompile
          tl(r.value.id, 'built');
          break;
        }
      }
    } catch (err) {
      fail(job.id, err);
      job = null;
    }
    const ms = performance.now() - t0;
    buildStats.slices += 1;
    if (ms > buildStats.maxSliceMs) buildStats.maxSliceMs = Math.round(ms * 10) / 10;
    (buildStats.sliceLog ||= []).push([Math.round(t0), Math.round(ms * 10) / 10, ran, budgetMs]);
    if (buildStats.sliceLog.length > 32) buildStats.sliceLog.shift();
  }
  function ensureDressing(id) {
    let d = dressings.get(id);
    if (d) return d;
    if (buildStats.failed[id]) return null;
    const t0 = performance.now();
    try {
      // A job past its paint wait can be finished here; one still waiting on
      // the worker is dropped and the room painted on this thread (a drain can
      // never wait for a message).
      if (job && job.id === id && !job.waiting) {
        const gen = job.gen;
        job = null;
        d = drain(gen);
      } else {
        if (job && job.id === id) job = null;
        d = drain(buildDressingSteps(layoutSpec(id)));
      }
    } catch (err) {
      fail(id, err);
      return null;
    }
    dressings.set(id, d);
    finishGpu(d);
    buildStats.syncBuilds.push({ id, ms: Math.round(performance.now() - t0) });
    return d;
  }
  function applyLayout(arg) {
    const id = typeof arg === 'number' ? arg : arg && (arg.layoutId ?? arg.id);
    if (!layoutSpec(id)) return null;
    if (warmDraw && warmDraw.d.id === id) endWarmDraw();
    if (compiling && compiling.d.id === id) compiling = null; // it draws for real now
    if (uploading && uploading.d.id === id) uploading = null; // first draw uploads the rest
    const ta = performance.now();
    const built = ensureDressing(id);
    if (!built) return null;
    const d = activate(built);
    buildStats.lastApplyMs = Math.round((performance.now() - ta) * 10) / 10;
    buildStats.maxApplyMs = Math.max(buildStats.maxApplyMs ?? 0, buildStats.lastApplyMs);
    return { layoutId: d.id, biome: biomeOfLayout(d.id), name: d.spec.name };
  }
  // @gnt:CAMPAIGN LEVEL-RESIDENCY begin — the level manager's arena half
  // (docs/gauntlet/PLAN.md §12.5; driven by src/campaign/manager.js through
  // the camp's `@gnt:CAMPAIGN CAMP-CMD`):
  //   setResidentLevel(act, { keepActive })  exactly one level resident: every
  //     built dressing of another level is removed from the scene and its
  //     geometries / materials / textures disposed — only those no other
  //     object in stage.scene still references (a scene-wide reference sweep,
  //     so a shared cache is never freed under a live mesh); its paint
  //     canvases are released, its build job / upload / link / parked draw
  //     cancelled. `keepActive` keeps the dressing on screen (the one under
  //     the level-clear card) until the next level's first room replaces it.
  //   levelStatus(act) -> { ready, built, total, pending }  ready = every
  //     layout of that level built, uploaded, linked and warm-drawn.
  function collectResources(obj, into) {
    const out = into ?? { geometries: new Set(), materials: new Set(), textures: new Set(), instanced: new Set() };
    const addTex = (v) => {
      if (v && v.isTexture) out.textures.add(v);
    };
    obj.traverse((o) => {
      if (o.geometry) out.geometries.add(o.geometry);
      if (o.isInstancedMesh) out.instanced.add(o);
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        // gauntlet r4 J4-F1 (INT): a material shared by many meshes is scanned
        // once (same result; the level-clear teardown walks the whole scene).
        if (out.materials.has(m)) continue;
        out.materials.add(m);
        for (const k of Object.keys(m)) addTex(m[k]);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u) addTex(u.value);
      }
    });
    return out;
  }
  const DISPOSED_STUB = (d) => ({
    id: d.id,
    spec: d.spec,
    group: new Group(),
    disposed: true,
    emitters: [],
    flames: [],
    pulses: [],
    torchLights: [],
    fireSources: [],
    embers: { count: 0, update() {} },
    mats: null,
    monolithMat: null,
    glassBase: null,
    shadows: [],
    foliage: { grassCount: 0, flowerCount: 0 },
    typeCount: 0,
    treeline: null,
    wallInfo: null,
    textures: [],
    groundCanvas: null,
  });
  function disposeDressings(list, why = 'residency') {
    const doomed = list.filter((d) => d && !d.disposed);
    if (doomed.length === 0) return 0;
    const t0 = performance.now();
    for (const d of doomed) {
      if (warmDraw && warmDraw.d === d) endWarmDraw();
      if (compiling && compiling.d === d) compiling = null;
      if (uploading && uploading.d === d) uploading = null;
      d.group.visible = false;
      if (d.group.parent) d.group.parent.remove(d.group);
    }
    // Everything still in the scene keeps its resources.
    const keep = collectResources(stage.scene);
    let g = 0;
    let m = 0;
    let t = 0;
    for (const d of doomed) {
      const mine = collectResources(d.group);
      for (const x of mine.instanced) if (typeof x.dispose === 'function') x.dispose();
      for (const x of mine.geometries) if (!keep.geometries.has(x)) {
        x.dispose();
        g += 1;
      }
      for (const x of mine.materials) if (!keep.materials.has(x)) {
        x.dispose();
        m += 1;
      }
      for (const x of mine.textures) if (!keep.textures.has(x)) {
        x.dispose();
        t += 1;
        // Release the paint canvas's backing store at once (the dressing owns it).
        const img = x.image;
        if (img && (img === d.groundCanvas || d.textures.includes(x)) && typeof img.width === 'number') {
          try {
            img.width = 0;
            img.height = 0;
          } catch {
            /* ImageBitmap-like sources */
          }
        }
      }
      if (typeof window !== 'undefined' && window.__groundCanvas === d.groundCanvas) window.__groundCanvas = null;
      // Its room-dressing groups stop watching the run (env/dressing.js).
      if (typeof d.roomDressingDispose === 'function') d.roomDressingDispose();
      dressings.delete(d.id);
      d.disposed = true;
      if (active === d) active = DISPOSED_STUB(d);
      if (job && job.id === d.id) job = null;
      residencyLog.disposedIds.push(d.id);
      if (residencyLog.disposedIds.length > 32) residencyLog.disposedIds.shift();
    }
    residencyLog.disposals += doomed.length;
    residencyLog.freed.geometries += g;
    residencyLog.freed.materials += m;
    residencyLog.freed.textures += t;
    residencyLog.lastMs = Math.round((performance.now() - t0) * 10) / 10;
    residencyLog.maxMs = Math.max(residencyLog.maxMs, residencyLog.lastMs);
    residencyLog.lastWhy = why;
    if (buildStats.built.length > 32) buildStats.built.splice(0, buildStats.built.length - 32);
    return doomed.length;
  }
  function setResidentLevel(act, { keepActive = true } = {}) {
    const a = Number(act);
    residentAct = Number.isFinite(a) && a > 0 ? a : null;
    preloadAct = null;
    if (residentAct === null) return { resident: null, disposed: 0 };
    const doomed = [...dressings.values()].filter((d) => actOf(d.id) !== residentAct && !(keepActive && d === active));
    // A layout of another level still being built or waiting on the worker is dropped too.
    if (job && actOf(job.id) !== residentAct) job = null;
    const n = disposeDressings(doomed, 'residency');
    if (!keepActive && active && !active.disposed && actOf(active.id) !== residentAct) disposeDressings([active], 'residency');
    for (const id of [...prefetched.keys()]) if (actOf(id) !== residentAct) prefetched.delete(id);
    enqueueAll(residentAct);
    prefetchPaints(queue);
    return { resident: residentAct, disposed: n, queued: [...queue] };
  }
  // Paint the next level's floors in the worker ahead of its card (called
  // when a campaign enters a Stag room): off the main thread, so the card
  // only has the sliced main-thread steps and uploads left to do.
  function prefetchLevel(act) {
    const a = Number(act);
    const ids = LAYOUT_SPEC_IDS.filter((id) => actOf(id) === a && !dressings.has(id));
    prefetchPaints(ids);
    return { level: a, prefetched: ids };
  }
  function levelStatus(act) {
    const a = Number(act);
    const ids = LAYOUT_SPEC_IDS.filter((id) => actOf(id) === a);
    let built = 0;
    const pending = [];
    for (const id of ids) {
      const d = dressings.get(id);
      const busy = !d || !d.gpuReady || (uploading && uploading.d.id === id) || (compiling && compiling.d.id === id) || (warmDraw && warmDraw.d.id === id);
      if (busy) pending.push(id);
      else built += 1;
    }
    return { level: a, ready: ids.length > 0 && built === ids.length, built, total: ids.length, pending, failed: ids.filter((id) => buildStats.failed[id]) };
  }
  function residencyState() {
    return {
      timeline: buildStats.timeline.slice(-6),
      perf: { uploads: (buildStats.uploads || []).slice(-12), stepMs: stepCost.map((x) => Math.round(x * 10) / 10), slices: (buildStats.sliceLog || []).slice(), pump: pumpStatsDebug(), maxSliceMs: buildStats.maxSliceMs, maxUploadMs: buildStats.maxUploadMs ?? 0, lastApplyMs: buildStats.lastApplyMs ?? 0, maxApplyMs: buildStats.maxApplyMs ?? 0, syncBuilds: buildStats.syncBuilds.slice(-4) },
      prefetched: [...prefetched.keys()],
      resident: residentAct,
      dressings: [...dressings.keys()].sort((x, y) => x - y),
      active: active ? { id: active.id, disposed: !!active.disposed } : null,
      queued: [...queue],
      building: job ? job.id : null,
      compile: { ...compileLog, pending: compiling ? compiling.d.id : null },
      ...residencyLog,
      disposedIds: [...residencyLog.disposedIds],
      freed: { ...residencyLog.freed },
    };
  }
  // @gnt:CAMPAIGN LEVEL-RESIDENCY end

  // The run swaps dressing at each room's `layout_enter` (M4a's run.js emits it
  // right before `room_enter`, under the transition fade); run_start re-queues
  // the act's layouts first.
  bus.on('layout_enter', (ev) => {
    if (ev && ev.layoutId !== undefined) applyLayout(ev.layoutId);
  });
  let runAct = null;
  bus.on('run_start', (ev) => {
    runAct = ev && Number.isFinite(ev.act) ? ev.act : null;
    if (runAct) enqueueAll(runAct);
  });
  const endRun = () => {
    runAct = null;
    enqueueAll(null);
  };
  bus.on('run_end', endRun);
  bus.on('return_to_camp', endRun);
  registerDressingPump((budgetMs) => pump(budgetMs));
  // The boot dressing, synchronously (it is the first frame).
  activate(ensureDressing(spec.id) ?? ensureDressing(1));
  buildStats.syncBuilds.length = 0;
  // Pre-build order: a menu-skip boot's ?act=N first (its portal starts that
  // act), else the boot dressing's own act; run_start re-sorts for the act.
  {
    let bootAct = null;
    try {
      const a = Number(new URLSearchParams(window.location.search).get('act'));
      if (a >= 1 && a <= 3) bootAct = a;
    } catch {
      /* no location (tests) */
    }
    enqueueAll(bootAct ?? biomeInfo(spec.id)?.act ?? 1);
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

    // Dash afterimages: one ghost per SMEAR_TICK_OFFSETS entry of dash travel
    // (staggered silhouettes, not a per-frame slab); hard-clear at dash
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
      // `elapsed` ticks travelled, silhouettes are frozen at elapsed minus each
      // SMEAR_TICK_OFFSETS entry, back along the locked dash direction, each
      // pre-aged by exactly the sim time it is behind the body. Rebuilding it every frame (rather than
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
      for (const back of SMEAR_TICK_OFFSETS) {
        // `back` = sim ticks behind the body. Fractional offsets are fine: it
        // only ever scales a distance and an age, never indexes a tick.
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

    // The camp restores its own snapshot of the arena's light rig on every
    // camp -> run swap; re-assert this dressing's biome rig if anything moved it.
    if (lightExpect && (lightExpect.key.intensity !== lightExpect.ki || lightExpect.fill.intensity !== lightExpect.fi || lightExpect.key.color.getHex() !== lightExpect.kc || lightExpect.fill.color.getHex() !== lightExpect.fc)) {
      applyLight(active);
    }
    const { flames, pulses, torchLights, monolithMat, glassBase, mats, embers } = active;
    // Room-8 torch stop-down (BOSS_TORCH_DIM): keyed off the live Stag body,
    // eased over ~0.25 s so the step hides inside the §13 transition fade and
    // the death collapse. Braziers, lanterns and the monolith are untouched.
    let stagAlive = false;
    for (const e of world.entities()) {
      if ((e.kind === 'stag' || e.boss === true) && e.hp > 0) {
        stagAlive = true;
        break;
      }
    }
    torchDim += ((stagAlive ? BOSS_TORCH_DIM : 1) - torchDim) * (1 - Math.exp(-12 * dt));

    // Torch flames: fast flicker on the painted flame sprite (scale + a touch
    // of lateral sway) plus glow/pool breath, so a torch never reads as a
    // painted-on sticker.
    for (const f of flames) {
      const dim = f.torch ? torchDim : 1;
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
      // Breath amplitudes trimmed (halo 0.18 -> 0.09, pool 0.14 -> 0.05). The
      // pool is the frame's warm AREA, so a +-0.14 swing on a 0.42 base was a
      // +-33% modulation of how much floor reads warm — measured, it moved the
      // same variant's warm/cool split by 3-4 points between two frames of the
      // same load, which is variance the §19.3 warm-dominant gate should not
      // have to absorb. The FLICKER still reads: the flame sprite's scale
      // (0.22 n), its sway, the halo's scale and the torch PointLights all keep
      // their full amplitude — only the two big soft AREAS are damped.
      f.glow.material.opacity = Math.max(0.16, (f.glowO ?? 0.45) + 0.09 * n + jit) * dim;
      f.glow.scale.setScalar((f.glowS ?? 1.05) * (1 + 0.1 * n)); // braziers ride a tighter halo
      f.pool.material.opacity = Math.max(0.24 * (f.poolGain ?? 1), (f.poolO ?? 0.6) + 0.05 * n) * dim;
      f.body.material.opacity = dim;
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
        TORCH_LIGHT.intensity *
        torchDim *
        (1 + 0.13 * Math.sin(tSec * 11 + tl.phase) + 0.07 * Math.sin(tSec * 23));
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

    // §19.1 reserved-band guard (src/env/bandguard.js): rigs and props built
    // after this scene (party critters, hot-added dressing) pick the guard up
    // on a 30-frame cadence. Already-guarded materials are a WeakSet hit.
    bandGuard.rescan();
  }

  // §19.1: Ember Danger belongs to enemy threats alone. The arena's warm key +
  // torch/brazier PointLights were rotating saturated party albedo (worst case
  // the Swordsman's wine tunic) straight into the reserved h5-25 band whenever
  // the party stood in a pool. The guard makes that impossible at the material
  // stage, for LIT non-threat surfaces only (src/env/bandguard.js).
  const bandGuard = installBandGuard(stage.scene);

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
    get emitters() {
      return active.emitters;
    },
    applyLayout,
    layoutState: () => layoutState(),
    // §19.1 band-guard knob: lets a capture sweep the guard edges inside ONE
    // page session instead of one build per candidate value.
    setGuard: bandGuard.setGuard,
    guardInfo: bandGuardInfo,
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

  function layoutState() {
    return {
      layoutId: active.id,
      biome: biomeOfLayout(active.id),
      name: active.spec.name,
      built: [...dressings.keys()].sort((a, b) => a - b),
      queued: [...queue],
      building: job ? job.id : null,
      syncBuilds: buildStats.syncBuilds.slice(-6),
      slices: buildStats.slices,
      maxSliceMs: buildStats.maxSliceMs,
      failed: { ...buildStats.failed },
      worker: { ...paintStats },
    };
  }

  function debugState() {
    const { foliage, typeCount, shadows, emitters, embers, treeline, wallInfo } = active;
    return {
      ...(inner.debugState ? inner.debugState() : {}),
      variant: active.id,
      variantName: active.spec.name,
      layout: layoutState(),
      // §19.1 reserved-band guard (lit non-threat materials).
      bandGuard: bandGuardInfo(),
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

  return {
    get name() {
      return `arena-v${active.id}`;
    },
    root,
    update,
    debugState,
    allies,
    applyLayout,
    layoutState,
    // @gnt:CAMPAIGN ARENA-API begin (PLAN §12.5 level manager)
    setResidentLevel,
    prefetchLevel,
    levelStatus,
    residencyState,
    bootResidency: () => setResidentLevel(active ? actOf(active.id) ?? 1 : 1, { keepActive: true }),
    clearVfx: () => (inner.clearVfx ? inner.clearVfx() : null),
    vfxCounts: () => {
      const d = inner.debugState ? inner.debugState() : null;
      return d ? { decals: d.decals, scorches: d.scorch, particles: d.particles, numerals: d.numerals } : null;
    },
    // @gnt:CAMPAIGN ARENA-API end
  };
}
