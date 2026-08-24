// Act-1 combat arena (?scene=arena&variant=1|2|3): the "uneasy pastoral
// woodland" of BUILD_BRIEF §19.3, wrapped AROUND the graybox scene so the
// exact same sim world / player controller / §9 juice pipeline plays inside
// unchanged. This scene only swaps the placeholder floor + walls for the
// dressed environment:
//   - canvas-painted ground (hue-noise cells, dirt path, moss/leaf/crack
//     decals) + dark woodland surround apron (env/ground.js)
//   - instanced grass tufts + flowers (env/foliage.js)
//   - 11 edge prop types with ink outlines + instanced contact blob shadows,
//     and the violet-veined corruption monolith (env/props.js)
//   - walls one value-step darker than the variant's floor (§19.3)
//   - emitter FX: torch flames / lantern glass / monolith all carry additive
//     glow sprites with live flicker; 2 torches per variant carry real warm
//     PointLights; warm ground light pools (torch pools + mid-field canopy
//     sun-dapples) keep the 70:30 warm:cool story in every frame
//   - drifting firefly motes (one Points draw, cosmetic stream)
//   - a soft contact shadow tracking the player capsule, under its identity ring
// Render-only: everything here reads the cosmetic stream, never sim state.
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Points,
  PointsMaterial,
} from 'three';
import { ARENA } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { toonMaterial, addOutline } from '../render/toon.js';
import { makeGlowSprite, getRadialTexture } from '../render/glow.js';
import { createGrayboxScene } from './graybox.js';
import { VARIANTS } from '../env/variants.js';
import { buildGroundMesh, buildApronMesh } from '../env/ground.js';
import { buildFoliage } from '../env/foliage.js';
import { buildProps, buildShadowInstances, getContactTexture, ORDER } from '../env/props.js';
import { mix, hslColor } from '../env/colors.js';

// Render-cosmetic scaffold numbers (grouped; not brief-bound gameplay values).
const WALL_HEIGHT = 0.75; // §13 band: 70-80% of the 1.05 u standing height
const WALL_THICKNESS = 0.5;
// §19.3 "walls exactly one value step darker than the adjoining floor". The
// wall albedo is the floor's base tone scaled in LINEAR space; 0.72 linear is
// ~0.86 of the displayed albedo. Both surfaces take the same key irradiance so
// the ratio holds, and the inner face additionally sits in the shadow toon band.
const WALL_VALUE_FACTOR = 0.72;
const FIREFLY_COUNT = 110;
const TORCH_LIGHT = { intensity: 7, distance: 9, decay: 2 };
const PLAYER_SHADOW_R = 0.66;

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

export function createArenaScene(stage, toggles, ctx) {
  const { cosmetic, world } = ctx;
  const params = new URLSearchParams(window.location.search);
  const vParam = parseInt(params.get('variant') ?? '1', 10);
  const spec = VARIANTS[vParam] ?? VARIANTS[1];

  // --- The playable inside: same world/player/juice as ?scene=graybox. Its
  // placeholder floor + walls are the only top-level Plane/Box meshes in the
  // graybox root at build time — strip them, keep everything else (player rig,
  // bolts, dummies, smear, particles, decals, camera, screenshake).
  const inner = createGrayboxScene(stage, toggles, ctx);
  const placeholders = inner.root.children.filter(
    (c) => c.isMesh && (c.geometry?.type === 'PlaneGeometry' || c.geometry?.type === 'BoxGeometry')
  );
  for (const p of placeholders) inner.root.remove(p);

  const root = new Group();
  root.name = `arena-v${spec.id}`;
  stage.scene.add(root);

  // --- Ground + dark surround.
  root.add(buildGroundMesh(spec, cosmetic));
  root.add(buildApronMesh(spec, cosmetic));

  // --- Walls: same collision rect the sim clamps to (sim/movement.js uses
  // ARENA half-extents; visuals just dress that rect), one value step below the
  // variant's floor tone (§19.3), ink-outlined like every hero prop.
  //
  // NOTE (regression guard): the wall tone MUST be derived through the display
  // -space helper. Color.setHSL defaults to the linear working space, so the
  // previous `setHSL(h, s, l - 0.12)` produced a wall that rendered ~50%
  // BRIGHTER than the sRGB-authored floor canvas it was supposed to sit under.
  const g = spec.ground;
  const wallColor = hslColor(g.h, g.s, g.l)
    .lerp(new Color(PALETTE.voidCharcoal), 0.18)
    .multiplyScalar(WALL_VALUE_FACTOR);
  const wallMat = toonMaterial({ color: wallColor });
  const floorW = ARENA.halfW * 2;
  const floorD = ARENA.halfD * 2;
  const t = WALL_THICKNESS;
  const mkWall = (w, d, x, z) => {
    const wall = new Mesh(new BoxGeometry(w, WALL_HEIGHT, d), wallMat);
    wall.position.set(x, WALL_HEIGHT / 2, z);
    addOutline(wall);
    root.add(wall);
  };
  mkWall(floorW + 2 * t, t, 0, -(ARENA.halfD + t / 2)); // north
  mkWall(floorW + 2 * t, t, 0, ARENA.halfD + t / 2); // south
  mkWall(t, floorD, -(ARENA.halfW + t / 2), 0); // west
  mkWall(t, floorD, ARENA.halfW + t / 2, 0); // east

  // --- Foliage + props (+ per-prop contact shadows via one instancer).
  const foliage = buildFoliage(root, spec, cosmetic);
  const { emitters, shadows, mats } = buildProps(root, spec, cosmetic);
  buildShadowInstances(root, shadows);
  const glassBase = mats?.glass ? mats.glass.color.clone() : null;

  // --- Player contact shadow (reference bar check 8). The graybox rig carries
  // its own tight blob; this is the wider soft one that reads as grounding at
  // gameplay zoom, drawn UNDER the sage identity ring but OVER the warm pools.
  const playerShadow = new Mesh(
    new CircleGeometry(PLAYER_SHADOW_R, 24),
    new MeshBasicMaterial({
      map: getContactTexture(),
      color: new Color('#000000'),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    })
  );
  playerShadow.rotation.x = -Math.PI / 2;
  playerShadow.position.y = 0.007;
  playerShadow.renderOrder = ORDER.shadow;
  root.add(playerShadow);

  // --- Emitter FX layer (§19.3: every light emitter carries a glow sprite).
  const flames = []; // torch fire: { core, glow, pool, phase }
  const pulses = []; // lantern/monolith: { glow, base, rate, amp, phase }
  let poolSeq = 0;
  const poolY = () => 0.011 + poolSeq++ * 0.0008; // stagger, never z-fight

  const flameCoreColor = mix(PALETTE.parchment, PALETTE.hearthAmber, 0.45).multiplyScalar(1.7);
  for (const em of emitters) {
    if (em.kind === 'flame') {
      const core = makeGlowSprite({ color: '#FFFFFF', size: 0.2, opacity: 0.95 });
      core.material.color.copy(flameCoreColor);
      core.material.toneMapped = false; // stays hot for the bloom pass
      core.scale.set(0.17, 0.27, 1);
      core.position.set(em.x, em.y + 0.05, em.z);
      root.add(core);
      const glow = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.9, opacity: 0.55 });
      glow.position.set(em.x, em.y + 0.04, em.z);
      root.add(glow);
      const pool = groundPool(PALETTE.hearthAmber, 1.8, 0.3, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      flames.push({ core, glow, pool, x: em.x, y: em.y, z: em.z, phase: cosmetic.range(0, Math.PI * 2) });
    } else if (em.kind === 'lantern') {
      const glow = makeGlowSprite({ color: PALETTE.paleGold, size: 0.66, opacity: 0.6 });
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const pool = groundPool(PALETTE.paleGold, 1.25, 0.28, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      // Lanterns breathe faster and deeper than the monolith so a paused frame
      // pair still shows them changing (reference bar check 2 / motion).
      pulses.push({ glow, base: 0.58, rate: 3.1, amp: 0.2, jitter: 0.06, phase: cosmetic.range(0, Math.PI * 2) });
    } else if (em.kind === 'monolith') {
      // Subtle God-stuff glow — the ONLY violet in the frame rides this prop.
      const glow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 1.5, opacity: 0.5 });
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const pool = groundPool(PALETTE.godstuffViolet, 0.95, 0.2, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      pulses.push({ glow, base: 0.5, rate: 0.9, amp: 0.12, jitter: 0, phase: cosmetic.range(0, Math.PI * 2) });
    }
  }

  // Mid-field warm canopy dapples: guarantee >=2 warm pools in any gameplay
  // frame (torches hug the walls and can sit outside the camera rect).
  const dappleColor = mix(PALETTE.hearthAmber, PALETTE.parchment, 0.35);
  const dapples = [];
  for (const [px, pz, pr] of spec.sunPools ?? []) {
    const pool = groundPool(dappleColor, pr, 0.2, poolY());
    pool.position.x = px;
    pool.position.z = pz;
    root.add(pool);
    dapples.push({
      pool,
      base: 0.2,
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
      new Color(PALETTE.hearthAmber).lerp(new Color('#FFFFFF'), 0.25),
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
      y: cosmetic.range(0.3, 1.25),
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
    size: 0.32,
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

    // Player contact shadow follows the interpolated capsule position.
    const p = world.player;
    playerShadow.position.x = p.px + (p.x - p.px) * alpha;
    playerShadow.position.z = p.pz + (p.z - p.pz) * alpha;

    // Torch flames: fast flicker on core scale/position + glow opacity + pool
    // breath, so a torch never reads as a painted-on sticker.
    for (const f of flames) {
      const n =
        Math.sin(tSec * 13 + f.phase) * 0.5 +
        Math.sin(tSec * 29 + f.phase * 2.7) * 0.3 +
        Math.sin(tSec * 6.3 + f.phase * 0.6) * 0.2;
      const jit = cosmetic.range(-0.06, 0.06);
      f.core.scale.set(0.17 * (1 + 0.3 * n + jit), 0.27 * (1 + 0.42 * n + jit), 1);
      f.core.position.x = f.x + cosmetic.range(-0.012, 0.012);
      f.core.position.y = f.y + 0.05 + 0.02 * n;
      f.glow.material.opacity = Math.max(0.15, 0.58 + 0.28 * n + jit);
      f.glow.scale.setScalar(0.9 * (1 + 0.1 * n));
      f.pool.material.opacity = Math.max(0.1, 0.3 + 0.11 * n);
    }
    // Lanterns + monolith: soft pulses (monolith "subtle glow" §19.3).
    for (const pu of pulses) {
      const j = pu.jitter ? cosmetic.range(-pu.jitter, pu.jitter) : 0;
      pu.glow.material.opacity = Math.max(0.1, pu.base + pu.amp * Math.sin(tSec * pu.rate + pu.phase) + j);
    }
    // Canopy dapples breathe AND creep, like sunlight through moving leaves —
    // the one large-area motion in the frame, kept slow so it never wobbles.
    for (const d of dapples) {
      d.pool.material.opacity = d.base * (1 + 0.36 * Math.sin(tSec * 0.7 + d.phase));
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
      const gk = 1 + 0.16 * Math.sin(tSec * 2.6) + 0.06 * Math.sin(tSec * 7.1);
      mats.glass.color.copy(glassBase).multiplyScalar(gk);
    }

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
      grass: foliage.grassCount,
      flowers: foliage.flowerCount,
      emitters: emitters.length,
      propShadows: shadows.length,
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
