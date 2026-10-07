// Shared foundation for the camp figures (story NPCs).
//
// The NPCs are drawn in the PARTY's grammar (BUILD_BRIEF §19.2): toon-banded
// primitives, the clip-space constant-width ink hull from critters/common.js
// (so `setInkViewport` from the critters module already sizes their outlines
// too — one shared uniform), painted/bean eyes with a Bone glint, and a soft
// indigo contact shadow. Nothing here is an emitter: every unlit colour is
// clamped under the composer's 0.68 linear bloom threshold.
//
// Determinism: no Math.random anywhere. Each figure's idle timing comes from a
// small PRNG seeded by its id (`seeded`), so two loads of the camp animate
// identically.
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  FrontSide,
  LessEqualDepth,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  ShaderMaterial,
  SpriteMaterial,
  Sprite,
  SphereGeometry,
  SRGBColorSpace,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, faceDecal, groundShadow, underBloom, getShadowTexture } from '../critters/common.js';
import { getRadialTexture } from '../glow.js';

// ---------------------------------------------------------------------------
// Determinism helpers
// ---------------------------------------------------------------------------
export function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — a tiny deterministic stream for idle schedules.
export function seeded(id) {
  let a = hashId(id) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// A repeating "event" schedule: fires every `min..max` seconds (deterministic
// gaps from the seeded stream) and reports, for any elapsed time, which event
// is current and how far into it we are. Used for blinks, head swivels, hops.
export function schedule(rand, minGap, maxGap, count = 24) {
  const starts = [];
  let t = minGap * 0.5 + rand() * (maxGap - minGap) * 0.5;
  for (let i = 0; i < count; i++) {
    starts.push(t);
    t += minGap + rand() * (maxGap - minGap);
  }
  const period = t; // the pattern loops after `count` events
  const extra = starts.map(() => rand()); // a per-event random for variety
  return {
    // -> { index, since } : the latest event at or before `time`
    at(time) {
      const tt = ((time % period) + period) % period;
      let idx = -1;
      for (let i = 0; i < starts.length; i++) {
        if (starts[i] <= tt) idx = i;
        else break;
      }
      if (idx < 0) return { index: starts.length - 1, since: tt + period - starts[starts.length - 1], r: extra[starts.length - 1] };
      return { index: idx, since: tt - starts[idx], r: extra[idx] };
    },
  };
}

// 0 -> 1 -> 0 envelope over `len` seconds with eased in/out (`hold` = the
// fraction of the event spent fully on).
export function pulse(since, len, hold = 0.4) {
  if (since < 0 || since > len) return 0;
  const k = since / len;
  const edge = (1 - hold) / 2;
  if (k < edge) return smooth(k / edge);
  if (k > 1 - edge) return smooth((1 - k) / edge);
  return 1;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
// Toon material with a small SELF-LIFT emissive (the boss Stag's trick, at a
// lower dose): the camp is a night scene lit by one fire, and an NPC standing
// at its edge would otherwise sink to near-black under the cool moon key. The
// lift is 0.12x the albedo — it keeps the toon bands, it is nowhere near the
// bloom threshold.
export function makeMaterialKit() {
  const mats = new Map();
  const all = [];
  function mat(hex, { lift = 0.12, map = null, side = FrontSide } = {}) {
    const c = new Color(hex);
    const key = `${c.getHexString()}:${lift}:${map ? map.uuid : ''}:${side}`;
    let m = mats.get(key);
    if (!m) {
      m = toonMaterial({ color: c, emissive: c.clone().multiplyScalar(lift), side });
      if (map) {
        m.map = map;
        m.emissiveMap = map; // the lift follows the painted pattern
      }
      mats.set(key, m);
      all.push(m);
    }
    return m;
  }
  function part(geo, hex, opts = {}) {
    const { ink = true, name = '', ...rest } = opts;
    const mesh = new Mesh(geo, mat(hex, rest));
    if (name) mesh.name = name;
    if (ink) addInk(mesh);
    return mesh;
  }
  return { mat, part, all };
}

// Unlit colour authored in display hex, converted to linear, clamped to sit
// under the bloom threshold (headroom 0.85 of 0.68).
export function unlitUnderBloom(hex, headroom = 0.85) {
  return underBloom(new Color(hex), headroom);
}

export function canvasTexture(size, paint, w = size) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  paint(ctx, w, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------
// Ghost material (the cleansed wardens)
// ---------------------------------------------------------------------------
// A view-facing FRESNEL translucency: the body's centre is a faint cool veil,
// its silhouette edge a brighter moonlight rim, so a freed spirit reads as a
// shape drawn in light without any ink. NORMAL blending (not additive) is
// deliberate: an alpha blend converges on its own colour no matter how many
// ghost layers overlap, so stacked parts (antlers over a skull) can never sum
// past the bloom threshold and turn the ghost into a light source.
const GHOST_CORE = '#8FBFCB'; // pale teal-blue (h192) — never violet, never ember
const GHOST_RIM = '#E2F1F3'; // cool moon-white

export function ghostUniforms() {
  return {
    uCore: { value: unlitUnderBloom(GHOST_CORE, 0.7) },
    uRim: { value: unlitUnderBloom(GHOST_RIM, 0.9) },
    uOpacity: { value: 0.8 },
  };
}

export function ghostMaterial(uniforms, { strength = 1, side = FrontSide } = {}) {
  return new ShaderMaterial({
    uniforms: { ...uniforms, uStrength: { value: strength } },
    transparent: true,
    depthWrite: false,
    depthFunc: LessEqualDepth,
    side,
    blending: NormalBlending,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        vN = normalize( normalMatrix * normal );
        vV = normalize( -mv.xyz );
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCore;
      uniform vec3 uRim;
      uniform float uOpacity;
      uniform float uStrength;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) );
        float rim = pow( f, 1.7 );
        // top-lit: faces turned up toward the moon read a touch brighter
        float up = 0.5 + 0.5 * normalize( vN ).y;
        vec3 c = mix( uCore * ( 0.78 + 0.22 * up ), uRim, rim );
        float a = ( 0.26 + 0.74 * rim ) * uOpacity * uStrength;
        gl_FragColor = vec4( c, clamp( a, 0.0, 1.0 ) );
      }
    `,
  });
}

// Small additive moonlight sprite (motes, the faint halo) — authored in
// linear at a fixed low value so even overlapping it stays under the bloom
// threshold.
export function softSprite(linearValue, tint = GHOST_RIM, size = 0.2, opacity = 1) {
  const c = new Color(tint);
  const lum = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  c.multiplyScalar(linearValue / Math.max(1e-4, lum));
  const m = new SpriteMaterial({
    map: getRadialTexture(),
    color: c,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  m.opacity = opacity;
  const s = new Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

// Flat moon-pool on the ground under a ghost: a faint additive ellipse that
// says "a cold light is here" without lighting anything.
export function moonPool(linearValue = 0.07) {
  const c = new Color(GHOST_RIM);
  c.multiplyScalar(linearValue);
  const m = new MeshBasicMaterial({
    map: getRadialTexture(),
    color: c,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  return m;
}

export { groundShadow };

// The critters' painted face decal, re-tessellated for an NPC budget: the
// party patch is 36x24 segments (1.7k triangles) for gallery close-ups; at the
// size these heads appear on screen 16x10 is indistinguishable. Same patch
// angles as critters/common.js faceDecal (phi 2.1 rad, theta 0.95 + 1.15).
export function npcFace(opts) {
  const face = faceDecal(opts);
  face.geometry.dispose();
  face.geometry = new SphereGeometry(opts.R * 1.012, 16, 10, Math.PI / 2 - 1.05, 2.1, 0.95, 1.15);
  return face;
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------
export function disposeTree(root) {
  const seenG = new Set();
  const seenM = new Set();
  root.traverse((o) => {
    const g = o.geometry;
    if (g && !o.isSprite && !g.userData?.shared && !seenG.has(g)) {
      seenG.add(g);
      g.dispose();
    }
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of list) {
      if (!m || m.userData?.shared || seenM.has(m)) continue;
      seenM.add(m);
      // The radial glow and the shadow ramp are cached game-wide; every other
      // map on an NPC (painted faces, shell, awning, belly) is its own.
      if (m.map && m.map !== getRadialTexture() && m.map !== getShadowTexture()) m.map.dispose();
      m.dispose();
    }
  });
}

