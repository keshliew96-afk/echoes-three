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
  CircleGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  Mesh,
  PointLight,
  Points,
  PointsMaterial,
  MeshBasicMaterial,
  LinearSRGBColorSpace,
} from 'three';
import { ARENA, CAMERA, DUMMY } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../render/glow.js';
import { createGrayboxScene } from './graybox.js';
import { VARIANTS } from '../env/variants.js';
import { buildGroundMesh, buildApronMesh } from '../env/ground.js';
import { buildTreeline } from '../env/treeline.js';
import { buildWalls } from '../env/walls.js';
import { buildFoliage } from '../env/foliage.js';
import { buildProps, buildShadowInstances, makeShadowMaterial, ORDER, VEIN_VIOLET } from '../env/props.js';
import { makeFlameSprite, createEmberField } from '../env/flame.js';
import { COOL, mix } from '../env/colors.js';

// Render-cosmetic scaffold numbers (grouped; not brief-bound gameplay values).
const FIREFLY_COUNT = 120;
const TORCH_LIGHT = { intensity: 5.8, distance: 10, decay: 2 };
// Contact-shadow radii. The blob texture holds a near-solid core out to 50% of
// the radius and feathers to nothing at 100%, so a 0.54 u disc puts its SOLID
// part at ~0.27 u — the capsule footprint — with a soft edge past it. Sizing the
// whole disc to 1.05x the footprint (as a literal reading of the note would)
// hides the entire shadow under the capsule at this camera pitch: measured, only
// 10% darkening leaked out past the body.
const PLAYER_SHADOW_R = 0.5;
const ENTITY_SHADOW_R = DUMMY.radius * 1.7;

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

// §19.3 lighting for Act 1. The stage ships a generic warm key + warm-ish
// hemisphere; an arena needs the COOL half of the 70:30 ratio to actually be
// cool, or every shadow is just a darker warm and the amber pools have nothing
// to read against. Key stays the warm 70%; the hemisphere fill is pushed to
// indigo-teal and lifted so an unlit up-facing surface ends up blue-dominant.
// Measured luminance split of the two contributions on an up-facing surface:
// key 1.36 vs fill 0.61 = 69:31, i.e. the §19.3 warm:cool 70:30 ratio, with the
// fill's blue channel landing just above the key's red so unlit ground is
// blue-dominant.
const ACT1_LIGHT = {
  keyIntensity: 2.1,
  fillIntensity: 2.15,
  keyColor: new Color(PALETTE.hearthAmber).lerp(new Color('#FFFFFF'), 0.5),
  skyColor: new Color(COOL.sky),
  groundColor: new Color(COOL.ambient),
};

function tuneActOneLighting(scene) {
  let key = null;
  let fill = null;
  for (const obj of scene.children) {
    if (obj.isDirectionalLight && !key) key = obj;
    else if (obj.isHemisphereLight && !fill) fill = obj;
  }
  if (key) {
    key.color.copy(ACT1_LIGHT.keyColor);
    key.intensity = ACT1_LIGHT.keyIntensity;
  }
  if (fill) {
    fill.color.copy(ACT1_LIGHT.skyColor);
    fill.groundColor.copy(ACT1_LIGHT.groundColor);
    fill.intensity = ACT1_LIGHT.fillIntensity;
  }
  return { key: !!key, fill: !!fill };
}

// Flat additive radial disc lying on the ground — the "pool of light" read.
function groundPool(color, radius, opacity, y) {
  const mesh = new Mesh(
    new CircleGeometry(1, 28),
    new MeshBasicMaterial({
      map: getRadialTexture(),
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
  const { cosmetic, world } = ctx;
  const params = new URLSearchParams(window.location.search);
  const vParam = parseInt(params.get('variant') ?? '1', 10);
  const spec = VARIANTS[vParam] ?? VARIANTS[1];

  const lightsTuned = tuneActOneLighting(stage.scene);

  // --- The playable inside: same world/player/juice as ?scene=graybox. Its
  // placeholder floor + walls are the only top-level Plane/Box meshes in the
  // graybox root at build time — strip them, keep everything else (player rig,
  // bolts, dummies, smear, particles, decals, camera, screenshake).
  const inner = createGrayboxScene(stage, toggles, ctx);
  const placeholders = inner.root.children.filter(
    (c) => c.isMesh && (c.geometry?.type === 'PlaneGeometry' || c.geometry?.type === 'BoxGeometry')
  );
  for (const p of placeholders) inner.root.remove(p);

  // The graybox player rig carries a placeholder grounding treatment: a very
  // soft wide glow-textured blob plus a bright class-accent identity ring at
  // 0.9 opacity. Over dressed ground that composite reads as a hollow teal
  // selection ring — brighter than the dirt it stands on — not as a shadow.
  // Retune it here (the arena owns its grounding look; graybox.js is another
  // builder's file and stays untouched): the identity ring keeps its Sage
  // accent but tightens onto the capsule base at a calm opacity, the soft blob
  // drops to a faint ambient occlusion, and a filled neutral-dark contact
  // shadow is added underneath.
  let identityRing = null;
  inner.root.traverse((o) => {
    if (!identityRing && o.isMesh && o.geometry?.type === 'RingGeometry') identityRing = o;
  });
  const playerRig = identityRing ? identityRing.parent : null;
  if (identityRing) {
    identityRing.scale.setScalar(1.0);
    identityRing.material.opacity = 0.5;
    identityRing.renderOrder = 1;
  }
  if (playerRig) {
    for (const child of playerRig.children) {
      if (child.isMesh && child.geometry?.type === 'CircleGeometry') child.material.opacity = 0.16;
    }
  }

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

  // --- Player contact shadow (reference bar check 8): a FILLED soft-edged
  // ellipse, pure black over the composited ground (dest*(1-a) — a darken with
  // no hue of its own), sized to the capsule footprint. No ring, no hole.
  const playerShadow = contactBlob(PLAYER_SHADOW_R, 0.6);
  root.add(playerShadow);

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
      const body = makeFlameSprite(0.46);
      body.position.set(em.x, em.y + 0.11, em.z);
      body.renderOrder = 8;
      root.add(body);
      const glow = makeGlowSprite({ color: PALETTE.hearthAmber, size: 1.0, opacity: 0.42 });
      glow.position.set(em.x, em.y + 0.06, em.z);
      root.add(glow);
      const pool = groundPool(PALETTE.hearthAmber, 2.05, 0.33, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      flames.push({ body, glow, pool, x: em.x, y: em.y, z: em.z, phase: cosmetic.range(0, Math.PI * 2) });
      fireSources.push({ x: em.x, y: em.y + 0.2, z: em.z });
    } else if (em.kind === 'lantern') {
      // A lantern is a FIRE, not a cold lamp: a small flame inside the glass
      // plus a warm halo, so it registers as the same emitter family as the
      // torches beside it.
      const wick = makeFlameSprite(0.16, 0.95);
      wick.position.set(em.x, em.y + 0.01, em.z);
      wick.renderOrder = 8;
      root.add(wick);
      const glow = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.8, opacity: 0.55 });
      glow.material.color.copy(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.35));
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const pool = groundPool(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.4), 1.55, 0.22, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      pulses.push({ glow, base: 0.52, rate: 3.1, amp: 0.18, jitter: 0.05, phase: cosmetic.range(0, Math.PI * 2), wick });
      fireSources.push({ x: em.x, y: em.y + 0.08, z: em.z });
    } else if (em.kind === 'monolith') {
      // God-stuff Violet halo — the ONLY violet in the frame rides this prop.
      // toneMapped:false keeps the halo CHROMATIC: an ACES-compressed violet
      // sprite over dark stone measured as neutral dark teal last round, i.e.
      // the "subtle glow" carried none of the accent colour.
      const glow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 1.8, opacity: 0.42 });
      glow.material.toneMapped = false;
      // Same pre-compensated violet as the veins so the HALO carries the accent
      // hue too (an ACES-flattened violet sprite measured as neutral dark teal).
      glow.material.color.setRGB(VEIN_VIOLET[0], VEIN_VIOLET[1], VEIN_VIOLET[2], LinearSRGBColorSpace);
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const spark = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.42, opacity: 0.3 });
      spark.material.toneMapped = false;
      spark.material.color.setRGB(VEIN_VIOLET[0], VEIN_VIOLET[1], VEIN_VIOLET[2], LinearSRGBColorSpace);
      spark.position.set(em.x, em.y + 0.18, em.z);
      root.add(spark);
      const pool = groundPool(PALETTE.godstuffViolet, 1.15, 0.3, poolY());
      pool.material.color.setRGB(VEIN_VIOLET[0], VEIN_VIOLET[1], VEIN_VIOLET[2], LinearSRGBColorSpace);
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      pulses.push({ glow, base: 0.42, rate: 0.9, amp: 0.12, jitter: 0, phase: cosmetic.range(0, Math.PI * 2), spark });
    }
  }

  const embers = createEmberField(root, fireSources, cosmetic, 9);

  // Mid-field warm canopy dapples: guarantee >=2 warm pools in any gameplay
  // frame (torches hug the walls and can sit outside the camera rect).
  const dappleColor = mix(PALETTE.hearthAmber, PALETTE.parchment, 0.18);
  const dapples = [];
  for (const [px, pz, pr] of spec.sunPools ?? []) {
    const pool = groundPool(dappleColor, pr, 0.17, poolY());
    pool.position.x = px;
    pool.position.z = pz;
    root.add(pool);
    dapples.push({
      pool,
      base: 0.17,
      x: px,
      z: pz,
      phase: cosmetic.range(0, Math.PI * 2),
      drift: cosmetic.range(0.1, 0.22),
    });
  }

  // Real warm light: 2 torches per variant (spec.lightIdx) carry PointLights.
  const flameEmitters = emitters.filter((e) => e.kind === 'flame');
  const torchLights = [];
  for (const idx of spec.lightIdx ?? []) {
    const em = flameEmitters[idx];
    if (!em) continue;
    const light = new PointLight(
      new Color(PALETTE.hearthAmber).lerp(new Color('#FFFFFF'), 0.2),
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

    // Player contact shadow follows the interpolated capsule position.
    const p = world.player;
    playerShadow.position.x = p.px + (p.x - p.px) * alpha;
    playerShadow.position.z = p.pz + (p.z - p.pz) * alpha;

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
      const h = 0.46 * (1 + 0.24 * n + jit);
      f.body.scale.set(h * 0.66 * (1 - 0.1 * n), h, 1);
      f.body.position.x = f.x + Math.sin(tSec * 5.1 + f.phase) * 0.014;
      f.body.position.y = f.y + 0.11 + 0.02 * n;
      f.glow.material.opacity = Math.max(0.14, 0.44 + 0.2 * n + jit);
      f.glow.scale.setScalar(1.0 * (1 + 0.1 * n));
      f.pool.material.opacity = Math.max(0.12, 0.33 + 0.11 * n);
    }
    // Lanterns + monolith halos: soft pulses (monolith "subtle glow" §19.3).
    for (const pu of pulses) {
      const j = pu.jitter ? cosmetic.range(-pu.jitter, pu.jitter) : 0;
      const k = pu.base + pu.amp * Math.sin(tSec * pu.rate + pu.phase) + j;
      pu.glow.material.opacity = Math.max(0.1, k);
      if (pu.wick) {
        const w = 0.16 * (1 + 0.16 * Math.sin(tSec * 9.4 + pu.phase));
        pu.wick.scale.set(w * 0.66, w, 1);
      }
      if (pu.spark) pu.spark.material.opacity = Math.max(0.1, 0.26 + 0.14 * Math.sin(tSec * 1.7 + pu.phase));
    }
    // The monolith's own veins breathe with the halo (capped well below the
    // clipping point so the vein cores stay violet instead of blowing white).
    if (monolithMat) {
      monolithMat.emissiveIntensity = 1.5 + 0.28 * Math.sin(tSec * 0.9);
    }
    // Canopy dapples breathe AND creep, like sunlight through moving leaves —
    // the one large-area motion in the frame, kept slow so it never wobbles.
    for (const d of dapples) {
      d.pool.material.opacity = d.base * (1 + 0.32 * Math.sin(tSec * 0.7 + d.phase));
      d.pool.position.x = d.x + Math.sin(tSec * 0.33 + d.phase) * d.drift;
      d.pool.position.z = d.z + Math.cos(tSec * 0.27 + d.phase * 1.4) * d.drift;
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

  function debugState() {
    return {
      ...(inner.debugState ? inner.debugState() : {}),
      variant: spec.id,
      variantName: spec.name,
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

  return { name: `arena-v${spec.id}`, root, update, debugState };
}
