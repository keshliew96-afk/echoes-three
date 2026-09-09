// Telegraph decals (BUILD_BRIEF §11): the Ember Danger ground decal + the shot
// lane under every telegraphed enemy attack (opacity pulse 2 Hz — §19.1
// colourblind fence: telegraphs PULSE, never shimmer; danger is decal +
// chevron, never colour alone), and the violet spawn shimmer (0.8 s, §11 —
// violet because a spawn IS corruption arriving, never Ember).
//
// The Ember decal is normal-blended (an additive red over a green floor would
// hue-shift toward yellow and out of the analyzer's danger band); its texture
// is alpha-only and the material carries the post-chain-exact Ember so the
// measured pixels land on #FF5A36.
import {
  BackSide,
  CanvasTexture,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
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
    ctx.lineWidth = S * 0.1;
    ctx.beginPath();
    ctx.arc(c, c, S * 0.425, 0, Math.PI * 2);
    ctx.stroke();
    // Hazard ticks around the rim (§19.1 fence: never colour alone).
    ctx.strokeStyle = A(0.95);
    ctx.lineWidth = S * 0.038;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 + 0.26;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a0) * S * 0.32, c + Math.sin(a0) * S * 0.32);
      ctx.lineTo(c + Math.cos(a0) * S * 0.47, c + Math.sin(a0) * S * 0.47);
      ctx.stroke();
    }
    ctx.fillStyle = A(0.95); // hot centre dot
    ctx.beginPath();
    ctx.arc(c, c, S * 0.1, 0, Math.PI * 2);
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

// Hazard chevron: double arrow pointing +X. Still the spawn shimmer's sibling
// art; the ATTACK telegraph draws its chevrons procedurally down the shot lane
// now (see makeLaneMaterial below).
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

// --- The SHOT LANE ----------------------------------------------------------
// Certification round 2 measured the WHOLE telegraph as 89-198 danger pixels in
// a frame that held a live telegraph 21 ticks from resolve, against the
// reference AoE's 13-14k: the impact zone is 1.1 u across (~89x67 screen px)
// and the mantis had aimed it at the archer, so all three melee bodies and
// their identity rings stood on top of it. A warning that exists only under the
// thing being warned is not a warning.
//
// The mantis telegraph is a SHOT, not an AoE — the sim locks a direction and
// fires along it (sim/enemies.js). So the honest big shape is the LANE: the
// path the shot has already committed to, drawn from the shooter to the aim
// point with hazard chevrons marching down it and a charge bead that reaches
// the impact ring exactly as the shot leaves. It is 3-6 u long, so it is never
// swallowed by the huddle, and it carries direction + source + time-to-impact
// at a glance. Procedural (ShaderMaterial) rather than a stretched texture: one
// shared quad, one uniform for the chevron cadence, and that cadence stays
// square at any shooting distance.
const LANE_W = 0.62; // u — lane width (shot radius + travel wobble)
function makeLaneMaterial(color) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uOpacity: { value: 1 },
      uRepeat: { value: 4 },
      uBead: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uRepeat;
      uniform float uBead;
      varying vec2 vUv;
      void main() {
        float u = vUv.x;                     // 0 = shooter, 1 = impact
        float v = abs( vUv.y - 0.5 ) * 2.0;  // 0 = centreline, 1 = lane edge
        // Rails: two Ember lines that fence the lane.
        float rail = smoothstep( 0.26, 0.05, abs( v - 0.78 ) );
        // Chevrons pointing at the impact, marching down the lane.
        float a = fract( u * uRepeat - uBead * uRepeat );
        float chev = smoothstep( 0.14, 0.0, abs( a - v * 0.34 - 0.05 ) );
        chev *= 1.0 - smoothstep( 0.84, 1.0, v );
        // Charge bead: the head of the shot, arriving as the telegraph ends.
        float bead = smoothstep( 0.09, 0.0, abs( u - uBead ) ) * ( 1.0 - v * 0.6 );
        // Faint wash so the lane reads as ground, not as three floating marks.
        float wash = ( 1.0 - smoothstep( 0.45, 1.0, v ) ) * 0.16;
        // Fade the ends so the lane grows out of the shooter and dies into the
        // impact ring instead of stopping on a hard edge.
        float ends = smoothstep( 0.0, 0.08, u ) * ( 1.0 - smoothstep( 0.94, 1.0, u ) );
        float o = clamp( rail * 0.8 + chev * 0.95 + bead * 0.95 + wash, 0.0, 1.0 ) * ends;
        gl_FragColor = vec4( uColor, o * uOpacity );
      }
    `,
  });
}

// The warning COLUMN. Depth-tested ground art cannot be seen through a body
// standing on it, so the telegraph also stands UP: a slim Ember cone over the
// impact point, drawn depth-independently above the actors (renderOrder 12,
// depthTest off) and NORMAL-blended so it keeps hue #FF5A36 over a pale critter
// instead of washing to amber the way an additive column would.
function makeColumn(color) {
  const mat = new ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uOpacity: { value: 0.7 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: BackSide,
    toneMapped: false,
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vY;
      void main() {
        float a = pow( clamp( 1.0 - vY, 0.0, 1.0 ), 1.5 );
        gl_FragColor = vec4( uColor, a * uOpacity );
      }
    `,
  });
  const mesh = new Mesh(
    sharedGeo('tele-column', () => new ConeGeometry(0.27, 1.4, 10, 1, true)),
    mat
  );
  mesh.position.y = 0.7;
  mesh.renderOrder = 12;
  return mesh;
}

// One attack telegraph: { group, setPulse(t, progress), aimAt(...) }.
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
  // Layer 2b: the shot lane, on a spinner so `aimAt` sets one rotation + one
  // scale.
  const laneSpin = new Group();
  laneSpin.position.y = 0.0205;
  group.add(laneSpin);
  const laneMat = makeLaneMaterial(EMBER_EXACT);
  const lane = new Mesh(sharedGeo('tele-lane-quad', () => new PlaneGeometry(1, 1)), laneMat);
  lane.rotation.x = -Math.PI / 2;
  lane.renderOrder = 3;
  laneSpin.add(lane);
  // Layer 3: the rim is a LIGHT, not a sticker (§19.3 — every emitter carries
  // an additive glow sprite).
  const halo = makeGlowSprite({ color: PALETTE.emberDanger, size: DECAL_RADIUS * 3.1, opacity: 0.24 });
  halo.material.color.copy(EMBER_EXACT);
  halo.material.toneMapped = false;
  halo.position.y = 0.1;
  group.add(halo);
  // Layer 4: the standing warning column (see makeColumn).
  const column = makeColumn(EMBER_EXACT);
  group.add(column);

  return {
    group,
    // Impact zone at (x, z); the lane runs from the shooter (fromX, fromZ) to
    // the rim of that zone.
    aimAt(x, z, fromX, fromZ) {
      group.position.set(x, 0, z);
      const dx = x - fromX;
      const dz = z - fromZ;
      const d = Math.max(0.6, Math.hypot(dx, dz));
      const near = Math.min(0.55, d * 0.18); // clear of the shooter's own body
      const len = Math.max(0.5, d - near - DECAL_RADIUS * 0.55);
      // The quad is centred: park it half a length back along the incoming ray.
      const mid = DECAL_RADIUS * 0.55 + len * 0.5;
      laneSpin.position.set((-dx / d) * mid, 0.0205, (-dz / d) * mid);
      laneSpin.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
      lane.scale.set(len, LANE_W, 1);
      laneMat.uniforms.uRepeat.value = Math.max(2, Math.round(len / 0.85));
    },
    // §11 2 Hz opacity pulse. `progress` (0 -> 1 across the wind-up) drives the
    // charge bead down the lane, so time-to-impact reads without a number.
    //
    // Tuning note (certification fix round 2, 2026-09-10): the Ember DECAL
    // layers pulse between 0.78 and 1.0 instead of 0.24 and 1.0. Normal-blended
    // Ember at 0.24 alpha over lit ground composites to hue ~35 — the
    // analyzer's AMBER band, the same hue as the torches and the road, which is
    // exactly what round 2 measured on the ring ("danger 0 / amber 15944"). The
    // pulse is carried by the halo and the column instead; those are lights, not
    // the hue-bearing decal, so they are free to swing hard. Logged in
    // BUILD_BRIEF §11.
    setPulse(tSec, progress = 0) {
      const k = 0.5 + 0.5 * Math.sin(Math.PI * 2 * PULSE_HZ * tSec);
      const emberA = 0.78 + 0.22 * k;
      impact.material.opacity = emberA;
      laneMat.uniforms.uOpacity.value = emberA;
      laneMat.uniforms.uBead.value = Math.min(1, Math.max(0, progress));
      halo.material.opacity = 0.12 + 0.24 * k;
      column.material.uniforms.uOpacity.value = (0.4 + 0.28 * k) * (0.6 + 0.4 * progress);
      core.material.opacity = 0.5;
    },
    // Dissolve (k: 1 -> 0) after the wind-up ends — the warning drawing back
    // into the impact point rather than blinking out. Multiplies whatever
    // `setPulse` last wrote, so the 2 Hz cadence keeps running as it goes.
    setFadeOut(k) {
      const e = Math.max(0, Math.min(1, k));
      impact.material.opacity *= e;
      laneMat.uniforms.uOpacity.value *= e * e; // the lane leaves first
      halo.material.opacity *= e;
      column.material.uniforms.uOpacity.value *= e;
      core.material.opacity *= e;
      group.scale.setScalar(0.86 + 0.14 * e);
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
  const chevron = flatDecal(getChevronTexture(), TELL_VIOLET.clone(), CHEVRON_SIZE, 0.021, 2);
  chevron.visible = false; // built so the shared quad + texture stay warm
  group.add(chevron);
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
