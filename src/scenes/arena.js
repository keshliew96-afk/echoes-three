// Act-1 combat arena (?scene=arena&variant=1|2|3): the "uneasy pastoral
// woodland" of BUILD_BRIEF §19.3, wrapped AROUND the graybox scene so the
// exact same sim world / player controller / §9 juice pipeline plays inside
// unchanged. This scene only swaps the placeholder floor + walls for the
// dressed environment:
//   - canvas-painted ground (hue-noise cells, dirt path, moss/leaf/crack
//     decals) + dark surround apron (env/ground.js)
//   - instanced grass tufts + flowers (env/foliage.js)
//   - edge props with ink outlines + instanced contact blob shadows, and the
//     violet-veined corruption monolith (env/props.js)
//   - walls one value-step darker than the variant's floor (§19.3)
//   - emitter FX: torch flames / lantern glass / monolith all carry additive
//     glow sprites; 2 torches per variant carry real warm PointLights; warm
//     ground light pools (torch pools + mid-field canopy sun-dapples) keep the
//     70:30 warm:cool story in every frame
//   - drifting firefly motes (one Points draw, cosmetic stream)
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
import { buildProps, buildShadowInstances } from '../env/props.js';
import { mix } from '../env/colors.js';

// Render-cosmetic scaffold numbers (grouped; not brief-bound gameplay values).
const WALL_HEIGHT = 0.75; // §13 band: 70-80% of the 1.05 u standing height
const WALL_THICKNESS = 0.5;
const WALL_VALUE_STEP = 0.12; // §19.3: walls exactly one value step darker
const FIREFLY_COUNT = 56;
const TORCH_LIGHT = { intensity: 7, distance: 9, decay: 2 };

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
  return mesh;
}

export function createArenaScene(stage, toggles, ctx) {
  const { cosmetic } = ctx;
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
  // ARENA half-extents; visuals just dress that rect), tinted one value step
  // below the variant's ground lightness so each variant's walls track ITS
  // floor (§19.3), ink-outlined like every hero prop.
  const g = spec.ground;
  const wallColor = new Color().setHSL(g.h / 360, g.s, Math.max(0.06, g.l - WALL_VALUE_STEP));
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
  const { emitters, shadows } = buildProps(root, spec, cosmetic);
  buildShadowInstances(root, shadows);

  // --- Emitter FX layer (§19.3: every light emitter carries a glow sprite).
  const flames = []; // torch fire: { core, glow, phase }
  const pulses = []; // lantern/monolith: { glow, base, rate, phase }
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
      const glow = makeGlowSprite({ color: PALETTE.hearthAmber, size: 0.85, opacity: 0.55 });
      glow.position.set(em.x, em.y + 0.04, em.z);
      root.add(glow);
      const pool = groundPool(PALETTE.hearthAmber, 1.7, 0.3, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      flames.push({ core, glow, pool, phase: cosmetic.range(0, Math.PI * 2) });
    } else if (em.kind === 'lantern') {
      const glow = makeGlowSprite({ color: PALETTE.paleGold, size: 0.6, opacity: 0.6 });
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const pool = groundPool(PALETTE.paleGold, 1.15, 0.26, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      pulses.push({ glow, base: 0.6, rate: 2.1, amp: 0.08, phase: cosmetic.range(0, Math.PI * 2) });
    } else if (em.kind === 'monolith') {
      // Subtle God-stuff glow — the ONLY violet in the frame rides this prop.
      const glow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 1.35, opacity: 0.42 });
      glow.position.set(em.x, em.y, em.z);
      root.add(glow);
      const pool = groundPool(PALETTE.godstuffViolet, 0.85, 0.16, poolY());
      pool.position.x = em.x;
      pool.position.z = em.z;
      root.add(pool);
      pulses.push({ glow, base: 0.42, rate: 0.7, amp: 0.08, phase: cosmetic.range(0, Math.PI * 2) });
    }
  }

  // Mid-field warm canopy dapples: guarantee >=2 warm pools in any gameplay
  // frame (torches hug the walls and can sit outside the camera rect).
  const dappleColor = mix(PALETTE.hearthAmber, PALETTE.parchment, 0.35);
  for (const [px, pz, pr] of spec.sunPools ?? []) {
    const pool = groundPool(dappleColor, pr, 0.13, poolY());
    pool.position.x = px;
    pool.position.z = pz;
    root.add(pool);
  }

  // Real warm light: 2 torches per variant (spec.lightIdx) carry PointLights.
  const flameEmitters = emitters.filter((e) => e.kind === 'flame');
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
  }

  // --- Firefly motes (one Points draw call, cosmetic drift + gentle blink).
  const flyData = [];
  const flyPos = new Float32Array(FIREFLY_COUNT * 3);
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    flyData.push({
      x: cosmetic.range(-ARENA.halfW + 0.6, ARENA.halfW - 0.6),
      z: cosmetic.range(-ARENA.halfD + 0.6, ARENA.halfD - 0.6),
      y: cosmetic.range(0.35, 1.1),
      vx: cosmetic.range(-0.14, 0.14),
      vz: cosmetic.range(-0.14, 0.14),
      ax: cosmetic.range(0.25, 0.6), // wander sinusoid amplitudes/rates
      az: cosmetic.range(0.25, 0.6),
      rx: cosmetic.range(0.3, 0.9),
      rz: cosmetic.range(0.3, 0.9),
      ry: cosmetic.range(0.4, 1.1),
      phase: cosmetic.range(0, Math.PI * 2),
    });
  }
  const flyGeo = new BufferGeometry();
  const flyAttr = new BufferAttribute(flyPos, 3);
  flyAttr.setUsage(DynamicDrawUsage);
  flyGeo.setAttribute('position', flyAttr);
  const flyMat = new PointsMaterial({
    map: getRadialTexture(),
    color: mix(PALETTE.paleGold, PALETTE.parchment, 0.3),
    size: 0.19,
    transparent: true,
    opacity: 0.85,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const flies = new Points(flyGeo, flyMat);
  flies.frustumCulled = false;
  root.add(flies);

  let lastElapsed = null;

  function update(elapsedSec, alpha = 1) {
    // The graybox inside runs first: player rig, bolts, dummies, juice, camera.
    inner.update(elapsedSec, alpha);

    const dt =
      lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsedSec - lastElapsed));
    lastElapsed = elapsedSec;
    const tSec = elapsedSec;

    // Torch flames: fast flicker on core scale + glow opacity + pool breath.
    for (const f of flames) {
      const n = Math.sin(tSec * 13 + f.phase) * 0.5 + Math.sin(tSec * 29 + f.phase * 2.7) * 0.3;
      const jit = cosmetic.range(-0.05, 0.05);
      f.core.scale.set(0.17 * (1 + 0.14 * n + jit), 0.27 * (1 + 0.2 * n + jit), 1);
      f.glow.material.opacity = 0.55 + 0.1 * n + jit * 0.6;
      f.pool.material.opacity = 0.3 + 0.045 * n;
    }
    // Lanterns + monolith: slow soft pulses (monolith "subtle glow" §19.3).
    for (const p of pulses) {
      p.glow.material.opacity = p.base + p.amp * Math.sin(tSec * p.rate + p.phase);
    }

    // Fireflies: slow wander + sinusoid drift; wrap at the walls.
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const d = flyData[i];
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      if (d.x < -ARENA.halfW + 0.4) d.x = ARENA.halfW - 0.4;
      else if (d.x > ARENA.halfW - 0.4) d.x = -ARENA.halfW + 0.4;
      if (d.z < -ARENA.halfD + 0.4) d.z = ARENA.halfD - 0.4;
      else if (d.z > ARENA.halfD - 0.4) d.z = -ARENA.halfD + 0.4;
      flyPos[i * 3] = d.x + Math.sin(tSec * d.rx + d.phase) * d.ax;
      flyPos[i * 3 + 1] = d.y + Math.sin(tSec * d.ry + d.phase * 1.7) * 0.16;
      flyPos[i * 3 + 2] = d.z + Math.cos(tSec * d.rz + d.phase) * d.az;
    }
    flyAttr.needsUpdate = true;
    flyMat.opacity = 0.78 + 0.18 * Math.sin(tSec * 1.3); // gentle group blink
  }

  function debugState() {
    return {
      ...(inner.debugState ? inner.debugState() : {}),
      variant: spec.id,
      grass: foliage.grassCount,
      flowers: foliage.flowerCount,
      emitters: emitters.length,
      propShadows: shadows.length,
    };
  }

  return { name: `arena-v${spec.id}`, root, update, debugState };
}
