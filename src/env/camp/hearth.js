// Camp emitter FX (BUILD_BRIEF §18 + §19.3 "every light emitter carries an
// additive radial glow sprite" + §19.4 "every effect is >=3 layers").
//
// One place that turns the camp's emitter list into light. Kinds:
//   hearth      the §18 Hearth-Fire — the camp's single warm SOURCE: painted
//               flame stack + white-hot core + halo + broad ground pool + hot
//               inner pool + a real PointLight + an ember column
//   forge       the smithy's coal bed — a second, smaller real light
//   flame       boundary torch (from the shared Act-1 prop set)
//   lantern     wall lantern (shared prop set)
//   poleLantern the camp's hanging lantern poles
//   tentglow    a tent lit from inside — glow only, no flame
//   relic       the weapon rack's glowing item (§18, verbatim)
//   portal      the run-gate's rune light: the camp's ONE violet-arcane locus
//
// LIGHT BUDGET (§18 "one Hearth-Fire as the SINGLE warm light source
// everything composes toward"): exactly two real lights exist — the hearth
// (dominant by a wide margin) and the forge (a quarter of it). Everything else
// is additive decals, so nothing can out-shine the centre no matter where the
// camera goes.
//
// VALUE NOTE: stage.js thresholds bloom at 0.68 LINEAR, so emitter cores are
// authored above it and bodies below it — env/flame.js GAIN_MAX exists because
// an over-gained flame body turns the whole sprite into bloom fuel and veils
// the frame (the Act-1 fix-round-2 finding). The same discipline holds here:
// the painted white core blooms, the amber body does not, and the FLOOR POOL
// carries the light that makes the camp bright.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DynamicDrawUsage,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three';
import { CAMERA, ARENA } from '../../core/constants.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../../render/glow.js';
import { makeFlameSprite, createEmberField } from '../flame.js';
import { EMBER_GLOW, mix } from '../colors.js';

// Camp pool/halo tint. The Act-1 EMBER_GLOW shares (0.26 pool / 0.20 parchment)
// were solved against a LIT GREEN floor; over the camp's indigo night ground
// the same addition sums to the h19-25 mauve-brown the analyzer counts as
// reserved Ember Danger — measured 11.6k px on the first lit camp frame. The
// camp therefore carries its own shares: more parchment = a higher BLUE channel
// in the addition, so dim pool-washed indigo lands above h25 and under the
// s0.35 gate, while the flame sprites keep the saturated amber that makes the
// fire read as fire.
// Parchment shares settled at 0.28 pool / 0.24 halo. The first cut ran 0.5 /
// 0.4 and cleared the danger band (11.6k -> 0.3k px) but bought it with the
// thing the pools exist for: sampled at the hearth the fire measured
// rgb(248,240,216) — hue 45 at SATURATION 0.13, a white stage spotlight, not
// firelight. These shares keep the addition's blue channel high enough to stay
// out of h5-25 while the pool still carries real gold.
const CAMP_GLOW = Object.freeze({
  pool: mix(PALETTE.paleGold, PALETTE.parchment, 0.28),
  halo: mix(mix(PALETTE.hearthAmber, PALETTE.paleGold, 0.7), PALETTE.parchment, 0.24),
});
import { ORDER } from '../props.js';
import { RUNE_VIOLET } from './props.js';

// Halos sort with the pools, UNDER the §17 identity rings (renderOrder -1) —
// the Act-1 fix-round-2 ruling: a glow halo is an additive light decal and
// §17 exempts identity rings from every lighting shift.
const HALO_ORDER = -1.5;

// The rig never rotates, so "toward the camera" is a constant world vector;
// lifting a billboard along it moves it closer to the camera with (by
// construction) zero screen displacement — the fix for a torch shaft depth-
// clipping its own flame.
const EL = (CAMERA.elevationDeg * Math.PI) / 180;
const TOWARD_CAM = { y: Math.sin(EL), z: Math.cos(EL) };

// Broad pool falloff: a wide plateau then a fast fall. The shared glow texture
// is a bloom halo (already 55% alpha a quarter of the way out) and reads as
// fog; this ramp is what puts a real >200-luma region of LIT FLOOR under a
// fire instead of a needle-thin hot point.
let shaftTex = null;
function getPoolTexture() {
  if (shaftTex) return shaftTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const h = size / 2;
  const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.94)');
  grad.addColorStop(0.34, 'rgba(255,255,255,0.62)');
  grad.addColorStop(0.52, 'rgba(255,255,255,0.28)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.1)');
  grad.addColorStop(0.86, 'rgba(255,255,255,0.025)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  shaftTex = tex;
  return tex;
}

let poolSeq = 0;
function groundPool(root, color, radius, opacity, x, z, broad = true, linear = null) {
  const mesh = new Mesh(
    new CircleGeometry(1, 30),
    new MeshBasicMaterial({
      map: broad ? getPoolTexture() : getRadialTexture(),
      color: new Color(color),
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  if (linear) mesh.material.color.setRGB(linear[0], linear[1], linear[2], LinearSRGBColorSpace);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(radius, radius, 1);
  mesh.position.set(x, 0.011 + poolSeq++ * 0.0007, z);
  mesh.renderOrder = ORDER.pool;
  root.add(mesh);
  return mesh;
}

function halo(root, color, size, opacity, x, y, z, linear = null) {
  const g = makeGlowSprite({ color, size, opacity });
  g.renderOrder = HALO_ORDER;
  g.material.toneMapped = false;
  if (linear) g.material.color.setRGB(linear[0], linear[1], linear[2], LinearSRGBColorSpace);
  g.position.set(x, y, z);
  root.add(g);
  return g;
}

// ---------------------------------------------------------------------------
export function createCampEmitters(root, emitters, cosmetic) {
  const flames = []; // { body, glow, pool, ... } — flicker on a fast clock
  const pulses = []; // { glow, base, amp, rate } — slow breathers
  const lights = []; // real PointLights (hearth + forge only)
  const fireSources = []; // ember spawn points
  const motes = []; // violet gate motes
  const trails = []; // hearth spark columns

  let hearthLight = null;
  let hearthFlame = null;

  for (const em of emitters) {
    const s = em.s ?? 1;
    switch (em.kind) {
      // ---------------------------------------------------------- HEARTH --
      case 'hearth': {
        const lift = 0.05;
        const fy = 0.34 * s + TOWARD_CAM.y * lift;
        const fz = em.z + TOWARD_CAM.z * lift;
        // Three stacked flame billboards at different sizes/phases: one sprite
        // reads as a decal, a stack reads as fire (§19.4 "core + glow +
        // particles" is the floor, not the ceiling).
        const big = makeFlameSprite(1.18 * s, 1, 0.84);
        big.position.set(em.x, fy + 0.34 * s, fz);
        big.renderOrder = 8;
        root.add(big);
        const mid = makeFlameSprite(0.86 * s, 0.95, 0.8);
        mid.position.set(em.x - 0.19 * s, fy + 0.2 * s, fz + 0.06);
        mid.renderOrder = 8;
        root.add(mid);
        const small = makeFlameSprite(0.6 * s, 0.9, 0.76);
        small.position.set(em.x + 0.24 * s, fy + 0.12 * s, fz + 0.1);
        small.renderOrder = 8;
        root.add(small);
        // Round D (camp critic A4): next to the reference's fires — each a
        // white-hot core + orange body + rising trail — the hearth read as ONE
        // bloomed blob. Three additions inside the same stack: an additive
        // parchment CORE low in the fire (the only new bloom source, and a
        // near-neutral one, so its skirt is cream and can never rotate a
        // neighbour into Ember), two small fast TONGUES licking above the body
        // so the silhouette breaks, and a tall spark column (createHearthTrail)
        // that carries embers past the tripod instead of dying at the pot.
        const hot = halo(
          root,
          mix(PALETTE.parchment, PALETTE.paleGold, 0.3),
          0.5 * s,
          0.9,
          em.x,
          fy + 0.08 * s,
          fz + 0.14
        );
        hot.renderOrder = 9;
        const tongueA = makeFlameSprite(0.4 * s, 0.92, 0.9);
        tongueA.position.set(em.x - 0.08 * s, fy + 0.7 * s, fz + 0.12);
        tongueA.renderOrder = 9;
        root.add(tongueA);
        const tongueB = makeFlameSprite(0.3 * s, 0.88, 0.9);
        tongueB.position.set(em.x + 0.17 * s, fy + 0.62 * s, fz + 0.12);
        tongueB.renderOrder = 9;
        root.add(tongueB);
        trails.push(createHearthTrail(root, { x: em.x, y: fy + 0.5 * s, z: fz + 0.1 }, cosmetic));
        const gl = halo(root, CAMP_GLOW.halo, 1.6 * s, 0.3, em.x, fy + 0.32 * s, fz);
        // The camp's principal light on the FLOOR: broad, hot at the centre.
        const pool = groundPool(root, CAMP_GLOW.pool, 3.8 * s, 0.46, em.x, em.z);
        // Fix round 1 (A-world, check 1 "value range"): the hot core is what
        // puts the camp frame in the TOP luma bucket at all, and at 1.3/0.20
        // it sat at 0.044-0.076% of the frame across captures — straddling the
        // analyzer's 0.05% "bucket used" threshold, so the same scene scored
        // 15/16 or 16/16 depending on where the flicker happened to be. 1.5 /
        // 0.26 clears it with margin and is what the references do with a
        // fire anyway (blown-out centre, not a hot needle).
        const core = groundPool(root, CAMP_GLOW.pool, 1.5 * s, 0.26, em.x, em.z);
        flames.push({
          body: big,
          extra: [mid, small],
          extraBase: [0.86 * s, 0.6 * s],
          glow: gl,
          glowS: 1.6 * s,
          glowO: 0.3,
          pool,
          poolO: 0.46,
          core,
          coreO: 0.26,
          hot,
          hotO: 0.9,
          hotS: 0.5 * s,
          tongues: [tongueA, tongueB],
          tongueBase: [0.4 * s, 0.3 * s],
          tongueY: [fy + 0.7 * s, fy + 0.62 * s],
          base: 1.18 * s,
          x: em.x,
          y: fy + 0.34 * s,
          z: fz,
          phase: cosmetic.range(0, Math.PI * 2),
          amp: 0.2,
        });
        hearthFlame = flames[flames.length - 1];
        fireSources.push({ x: em.x, y: 0.34, z: fz });
        fireSources.push({ x: em.x - 0.18, y: 0.3, z: fz });
        // The one real warm light. Gold-white rather than raw amber: it
        // MULTIPLIES nearby timber/canvas albedo and an amber-heavy product
        // lands lit surfaces in the reserved h5-25 Ember band.
        hearthLight = new PointLight(
          new Color(PALETTE.hearthAmber)
            .lerp(new Color(PALETTE.paleGold), 0.5)
            .lerp(new Color('#FFFFFF'), 0.42),
          13,
          13,
          2
        );
        // HEIGHT IS THE TUNING KNOB, not intensity alone. three.js point lights
        // fall off as intensity/d^2, so a lamp parked 0.75 u over the coals put
        // ~12 units of irradiance on the hearth's own ring stones (the arena's
        // whole key rig lands 1.27) and blew the fire, the cook pot and the
        // Archer behind it to featureless white — measured rgb(248,248,232) at
        // saturation 0.06. Lifting the source to 1.9 u puts the nearest stone
        // at d ~ 2.0 (irradiance 2.25: bright, not clipped) and still leaves
        // the party ring at ~1.3, i.e. warmer than a lit Act-1 surface.
        hearthLight.position.set(em.x, 1.9, em.z);
        root.add(hearthLight);
        lights.push({ light: hearthLight, base: 13, phase: cosmetic.range(0, Math.PI * 2) });
        break;
      }

      // ----------------------------------------------------------- FORGE --
      case 'forge': {
        const fy = 0.62;
        const fz = em.z + TOWARD_CAM.z * 0.04;
        const body = makeFlameSprite(0.5, 0.95, 0.9);
        body.position.set(em.x, fy + 0.1, fz + 0.06);
        body.renderOrder = 8;
        root.add(body);
        const gl = halo(root, CAMP_GLOW.halo, 1.05, 0.3, em.x, fy + 0.08, fz + 0.06);
        const pool = groundPool(root, CAMP_GLOW.pool, 2.4, 0.36, em.x, em.z + 0.15);
        flames.push({
          body,
          glow: gl,
          glowS: 1.05,
          glowO: 0.3,
          pool,
          poolO: 0.36,
          base: 0.5,
          x: em.x,
          y: fy + 0.1,
          z: fz + 0.06,
          phase: cosmetic.range(0, Math.PI * 2),
          amp: 0.24,
        });
        fireSources.push({ x: em.x, y: fy, z: fz });
        const l = new PointLight(
          new Color(PALETTE.hearthAmber).lerp(new Color('#FFFFFF'), 0.5),
          4.6,
          7,
          2
        );
        l.position.set(em.x, 1.5, em.z + 0.25);
        root.add(l);
        lights.push({ light: l, base: 4.6, phase: cosmetic.range(0, Math.PI * 2) });
        break;
      }

      // --------------------------------------------- BOUNDARY TORCH -------
      case 'flame': {
        const lift = 0.26;
        const fy = em.y + 0.13 + TOWARD_CAM.y * lift;
        const fz = em.z + TOWARD_CAM.z * lift;
        const body = makeFlameSprite(0.7, 1, 0.82);
        body.position.set(em.x, fy, fz);
        body.renderOrder = 8;
        root.add(body);
        const gl = halo(root, CAMP_GLOW.halo, 0.95, 0.3, em.x, em.y + 0.08 + TOWARD_CAM.y * lift, fz);
        const pool = groundPool(root, CAMP_GLOW.pool, 2.3, 0.36, em.x, em.z);
        flames.push({
          body,
          glow: gl,
          glowS: 0.95,
          glowO: 0.3,
          pool,
          poolO: 0.36,
          base: 0.7,
          x: em.x,
          y: fy,
          z: fz,
          phase: cosmetic.range(0, Math.PI * 2),
          amp: 0.22,
        });
        fireSources.push({ x: em.x, y: em.y + 0.2, z: fz });
        break;
      }

      // ------------------------------------------------------- LANTERNS --
      case 'lantern':
      case 'poleLantern': {
        const wick = makeFlameSprite(0.26, 0.95, 0.78);
        const wx = em.kind === 'poleLantern' ? em.x + Math.cos(em.yaw ?? 0) * 0.36 : em.x;
        const wz = em.kind === 'poleLantern' ? em.z - Math.sin(em.yaw ?? 0) * 0.36 : em.z;
        wick.position.set(wx, em.y + 0.01 + TOWARD_CAM.y * 0.1, wz + TOWARD_CAM.z * 0.1);
        wick.renderOrder = 8;
        root.add(wick);
        const gl = halo(root, CAMP_GLOW.halo, 1.0, 0.32, wx, em.y, wz);
        const pool = groundPool(root, CAMP_GLOW.pool, 1.85, 0.3, wx, wz);
        pulses.push({
          glow: gl,
          base: 0.32,
          amp: 0.08,
          rate: 3.1,
          jitter: 0.05,
          phase: cosmetic.range(0, Math.PI * 2),
          wick,
          wickBase: 0.26,
          pool,
          poolBase: 0.3,
        });
        fireSources.push({ x: wx, y: em.y + 0.06, z: wz });
        break;
      }

      // ------------------------------------------------------- TENT GLOW --
      case 'tentglow': {
        // Light spilling out of a tent door: a warm halo at the mouth plus a
        // small floor pool. No flame sprite — the fire is inside the canvas.
        const dx = Math.sin(em.yaw ?? 0) * 0.85 * s;
        const dz = Math.cos(em.yaw ?? 0) * 0.85 * s;
        const gl = halo(root, CAMP_GLOW.halo, 1.0 * s, 0.36, em.x + dx, em.y, em.z + dz);
        const pool = groundPool(root, CAMP_GLOW.pool, 1.7 * s, 0.34, em.x + dx * 1.2, em.z + dz * 1.2);
        pulses.push({
          glow: gl,
          base: 0.36,
          amp: 0.06,
          rate: 1.7,
          jitter: 0.02,
          phase: cosmetic.range(0, Math.PI * 2),
          pool,
          poolBase: 0.34,
        });
        break;
      }

      // ----------------------------------------------------------- RELIC --
      case 'relic': {
        const gl = halo(root, CAMP_GLOW.halo, 0.62, 0.55, em.x, em.y, em.z);
        const pool = groundPool(root, CAMP_GLOW.pool, 0.95, 0.24, em.x, em.z, false);
        pulses.push({
          glow: gl,
          base: 0.55,
          amp: 0.14,
          rate: 1.35,
          jitter: 0,
          phase: cosmetic.range(0, Math.PI * 2),
          pool,
          poolBase: 0.24,
        });
        break;
      }

      // ---------------------------------------------------------- PORTAL --
      case 'portal': {
        // The camp's ONE arcane light. Blue-leaning violet, pre-compensated in
        // LINEAR space: an ACES-flattened violet sprite renders neutral dark
        // teal, and a red-heavier violet blends to rose over warm-lit stone —
        // inside the reserved h5-25 Ember band. Kept tight so the violet never
        // reaches the camp's warm core.
        const gl = halo(root, PALETTE.godstuffViolet, 2.1, 0.6, em.x, em.y + 0.15, em.z, RUNE_VIOLET);
        const spark = halo(
          root,
          PALETTE.godstuffViolet,
          0.85,
          0.6,
          em.x,
          em.y + 0.62,
          em.z,
          RUNE_VIOLET
        );
        const pool = groundPool(
          root,
          PALETTE.godstuffViolet,
          1.9,
          0.42,
          em.x,
          em.z + 0.45,
          true,
          [RUNE_VIOLET[0] * 0.6, RUNE_VIOLET[1], RUNE_VIOLET[2]]
        );
        pulses.push({
          glow: gl,
          base: 0.6,
          amp: 0.13,
          rate: 0.85,
          jitter: 0,
          phase: 0,
          spark,
          sparkBase: 0.6,
          pool,
          poolBase: 0.42,
        });
        // Rising gate motes: the portal's particle layer (§19.4 >=3 layers).
        motes.push({ x: em.x, z: em.z, y: 0.1 });
        break;
      }
      default:
        break;
    }
  }

  const embers = createEmberField(root, fireSources, cosmetic, 10);

  // --- Gate motes: violet sparks drifting up through the arch.
  let gate = null;
  if (motes.length > 0) {
    const N = 34;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const data = [];
    for (let i = 0; i < N; i++) {
      const src = motes[i % motes.length];
      data.push({
        src,
        t: cosmetic.range(0, 1),
        life: cosmetic.range(1.6, 3.4),
        ox: cosmetic.range(-0.62, 0.62),
        oz: cosmetic.range(-0.2, 0.2),
        rise: cosmetic.range(1.3, 2.1),
        wob: cosmetic.range(0.04, 0.14),
        rate: cosmetic.range(1.2, 2.6),
        phase: cosmetic.range(0, Math.PI * 2),
      });
    }
    const geo = new BufferGeometry();
    const pa = new BufferAttribute(pos, 3);
    pa.setUsage(DynamicDrawUsage);
    geo.setAttribute('position', pa);
    const ca = new BufferAttribute(col, 3);
    ca.setUsage(DynamicDrawUsage);
    geo.setAttribute('color', ca);
    const pts = new Points(
      geo,
      new PointsMaterial({
        map: getRadialTexture(),
        size: 0.13,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    pts.frustumCulled = false;
    pts.renderOrder = 7;
    root.add(pts);
    gate = { data, pos, col, pa, ca, n: N };
  }

  let last = null;
  function update(tSec) {
    const dt = last === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - last));
    last = tSec;

    for (const f of flames) {
      const n =
        Math.sin(tSec * 13 + f.phase) * 0.5 +
        Math.sin(tSec * 29 + f.phase * 2.7) * 0.3 +
        Math.sin(tSec * 6.3 + f.phase * 0.6) * 0.2;
      const jit = cosmetic.range(-0.05, 0.05);
      const h = f.base * (1 + f.amp * n + jit);
      f.body.scale.set(h * 0.66 * (1 - 0.1 * n), h, 1);
      f.body.position.x = f.x + Math.sin(tSec * 5.1 + f.phase) * 0.02;
      f.body.position.y = f.y + 0.03 * n;
      if (f.extra) {
        for (let i = 0; i < f.extra.length; i++) {
          const m = Math.sin(tSec * (15 + i * 7) + f.phase * (1.4 + i)) * 0.6 + n * 0.4;
          const hh = f.extraBase[i] * (1 + 0.26 * m);
          f.extra[i].scale.set(hh * 0.66, hh, 1);
          f.extra[i].position.y = f.y - 0.12 + 0.04 * m;
        }
      }
      f.glow.material.opacity = Math.max(0.16, f.glowO + f.glowO * 0.2 * n + jit);
      f.glow.scale.setScalar(f.glowS * (1 + 0.09 * n));
      f.pool.material.opacity = Math.max(0.2, f.poolO + 0.05 * n);
      if (f.core) f.core.material.opacity = Math.max(0.16, f.coreO + 0.07 * n);
      if (f.hot) {
        const hn = Math.sin(tSec * 21 + f.phase * 1.3) * 0.5 + Math.sin(tSec * 47 + f.phase) * 0.5;
        f.hot.material.opacity = Math.max(0.5, f.hotO + 0.12 * hn + jit);
        f.hot.scale.setScalar(f.hotS * (1 + 0.12 * hn));
      }
      if (f.tongues) {
        for (let i = 0; i < f.tongues.length; i++) {
          const m = Math.sin(tSec * (19 + i * 9) + f.phase * (2.1 + i)) * 0.7 + n * 0.3;
          const hh = f.tongueBase[i] * (1 + 0.42 * m);
          f.tongues[i].scale.set(hh * 0.62, hh, 1);
          f.tongues[i].position.y = f.tongueY[i] + 0.06 * m;
          f.tongues[i].material.opacity = Math.max(0.3, 0.75 + 0.25 * m);
        }
      }
    }

    for (const p of pulses) {
      const j = p.jitter ? cosmetic.range(-p.jitter, p.jitter) : 0;
      const k = p.base + p.amp * Math.sin(tSec * p.rate + p.phase) + j;
      p.glow.material.opacity = Math.max(0.08, k);
      if (p.spark)
        p.spark.material.opacity = Math.max(0.18, p.sparkBase + 0.2 * Math.sin(tSec * 1.6 + 1.1));
      if (p.pool)
        p.pool.material.opacity = Math.max(0.1, p.poolBase + 0.06 * Math.sin(tSec * p.rate * 0.8 + p.phase));
      if (p.wick) {
        const w = p.wickBase * (1 + 0.18 * Math.sin(tSec * 9.4 + p.phase));
        p.wick.scale.set(w * 0.66, w, 1);
      }
    }

    for (const l of lights) {
      l.light.intensity =
        l.base * (1 + 0.1 * Math.sin(tSec * 11 + l.phase) + 0.05 * Math.sin(tSec * 23 + l.phase));
    }

    embers.update(tSec);
    for (const t of trails) t.update(tSec);

    if (gate) {
      const violet = RUNE_VIOLET;
      for (let i = 0; i < gate.n; i++) {
        const d = gate.data[i];
        d.t += dt / d.life;
        if (d.t > 1) d.t -= Math.floor(d.t);
        const f = d.t;
        gate.pos[i * 3] = d.src.x + d.ox + Math.sin(tSec * d.rate + d.phase) * d.wob;
        gate.pos[i * 3 + 1] = d.src.y + d.rise * f;
        gate.pos[i * 3 + 2] = d.src.z + d.oz + Math.cos(tSec * d.rate * 0.7 + d.phase) * d.wob;
        const k = Math.sin(Math.PI * f) * 0.9;
        gate.col[i * 3] = violet[0] * k;
        gate.col[i * 3 + 1] = violet[1] * k;
        gate.col[i * 3 + 2] = violet[2] * k;
      }
      gate.pa.needsUpdate = true;
      gate.ca.needsUpdate = true;
    }
  }

  return {
    update,
    hearthLight,
    hearthFlame,
    counts: {
      flames: flames.length,
      pulses: pulses.length,
      lights: lights.length,
      embers: embers.count,
      gateMotes: gate ? gate.n : 0,
      trailSparks: trails.reduce((n, t) => n + t.count, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Hearth spark column (Round D A4): the reference's fires each trail embers
// well above the flame. The shared Act-1 ember field tops out ~0.85 u over
// its source (right for a torch); the hearth is the camp's ONE fire and its
// column rises 0.9-1.7 u, drifting with the flame's own sway. Cosmetic stream.
// ---------------------------------------------------------------------------
function createHearthTrail(root, src, cosmetic, n = 44) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const hot = new Color(PALETTE.parchment).lerp(new Color(PALETTE.hearthAmber), 0.35).multiplyScalar(2.0);
  const cool = new Color(PALETTE.hearthAmber).lerp(new Color(PALETTE.bruiseUmber), 0.45);
  const data = [];
  for (let i = 0; i < n; i++) {
    data.push({
      t: cosmetic.range(0, 1),
      life: cosmetic.range(1.1, 2.2),
      ox: cosmetic.range(-0.22, 0.22),
      oz: cosmetic.range(-0.12, 0.12),
      rise: cosmetic.range(0.9, 1.7),
      drift: cosmetic.range(-0.16, 0.16),
      wob: cosmetic.range(0.03, 0.1),
      rate: cosmetic.range(2.5, 6),
      phase: cosmetic.range(0, Math.PI * 2),
    });
  }
  const geo = new BufferGeometry();
  const pa = new BufferAttribute(pos, 3);
  pa.setUsage(DynamicDrawUsage);
  geo.setAttribute('position', pa);
  const ca = new BufferAttribute(col, 3);
  ca.setUsage(DynamicDrawUsage);
  geo.setAttribute('color', ca);
  const pts = new Points(
    geo,
    new PointsMaterial({
      map: getRadialTexture(),
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  pts.frustumCulled = false;
  pts.renderOrder = 9;
  root.add(pts);

  let last = null;
  function update(tSec) {
    const dt = last === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - last));
    last = tSec;
    for (let i = 0; i < n; i++) {
      const d = data[i];
      d.t += dt / d.life;
      if (d.t > 1) d.t -= Math.floor(d.t);
      const f = d.t;
      pos[i * 3] = src.x + d.ox * (1 - f * 0.3) + d.drift * f + Math.sin(tSec * d.rate + d.phase) * d.wob * f;
      pos[i * 3 + 1] = src.y + d.rise * f;
      pos[i * 3 + 2] = src.z + d.oz + Math.cos(tSec * d.rate * 0.7 + d.phase) * d.wob * f;
      // Hot and small at birth, umber and fading at the top of the column.
      const k = (1 - f) * (0.35 + 0.65 * (1 - f));
      col[i * 3] = (hot.r * (1 - f) + cool.r * f) * k;
      col[i * 3 + 1] = (hot.g * (1 - f) + cool.g * f) * k;
      col[i * 3 + 2] = (hot.b * (1 - f) + cool.b * f) * k;
    }
    pa.needsUpdate = true;
    ca.needsUpdate = true;
  }
  return { update, count: n };
}

// ---------------------------------------------------------------------------
// Firefly / mote field (§18 "campfire with glow halo + fireflies/motes").
// Cosmetic stream: these must be alive frame to frame.
// ---------------------------------------------------------------------------
export function createCampFireflies(root, cosmetic, count = 150) {
  const data = [];
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const tint = mix(PALETTE.paleGold, PALETTE.parchment, 0.32);
  for (let i = 0; i < count; i++) {
    data.push({
      x: cosmetic.range(-ARENA.halfW + 0.6, ARENA.halfW - 0.6),
      z: cosmetic.range(-ARENA.halfD + 0.6, ARENA.halfD - 0.6),
      y: cosmetic.range(0.25, 1.5),
      vx: cosmetic.range(-0.42, 0.42),
      vz: cosmetic.range(-0.42, 0.42),
      ax: cosmetic.range(0.35, 0.85),
      az: cosmetic.range(0.35, 0.85),
      rx: cosmetic.range(0.6, 1.5),
      rz: cosmetic.range(0.6, 1.5),
      by: cosmetic.range(0.12, 0.32),
      ry: cosmetic.range(0.8, 2.0),
      fadeRate: cosmetic.range(0.7, 2.1),
      phase: cosmetic.range(0, Math.PI * 2),
    });
  }
  const geo = new BufferGeometry();
  const pa = new BufferAttribute(pos, 3);
  pa.setUsage(DynamicDrawUsage);
  geo.setAttribute('position', pa);
  const ca = new BufferAttribute(col, 3);
  ca.setUsage(DynamicDrawUsage);
  geo.setAttribute('color', ca);
  const pts = new Points(
    geo,
    new PointsMaterial({
      map: getRadialTexture(),
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  pts.frustumCulled = false;
  pts.renderOrder = 6;
  root.add(pts);

  let last = null;
  function update(tSec) {
    const dt = last === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - last));
    last = tSec;
    for (let i = 0; i < count; i++) {
      const d = data[i];
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      if (d.x < -ARENA.halfW + 0.4) d.x = ARENA.halfW - 0.4;
      else if (d.x > ARENA.halfW - 0.4) d.x = -ARENA.halfW + 0.4;
      if (d.z < -ARENA.halfD + 0.4) d.z = ARENA.halfD - 0.4;
      else if (d.z > ARENA.halfD - 0.4) d.z = -ARENA.halfD + 0.4;
      pos[i * 3] = d.x + Math.sin(tSec * d.rx + d.phase) * d.ax;
      pos[i * 3 + 1] = d.y + Math.sin(tSec * d.ry + d.phase * 1.7) * d.by;
      pos[i * 3 + 2] = d.z + Math.cos(tSec * d.rz + d.phase) * d.az;
      const f = 0.45 + 0.55 * Math.sin(tSec * d.fadeRate + d.phase * 2.3);
      col[i * 3] = tint.r * f;
      col[i * 3 + 1] = tint.g * f;
      col[i * 3 + 2] = tint.b * f;
    }
    pa.needsUpdate = true;
    ca.needsUpdate = true;
  }

  return { update, count, sample: () => [pos[0], pos[1], pos[2]] };
}
