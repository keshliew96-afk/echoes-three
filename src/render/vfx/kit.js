// VFX kit (docs/gauntlet/design-VFX.md §7) — the pooled primitives every
// class, enemy and boss recipe is built from. Each primitive is ONE shared
// shader program over a fixed pool of meshes, so a four-class fight never
// allocates a material or a geometry after boot and never compiles a program
// mid-fight (all of them are warmed in camp, see prewarm()).
//
//   arc     a ribbon bent around a centre: a melee SLASH (a partial arc that
//           sweeps in, head first, and leaves a fading tail) or a SHOCKWAVE
//           (the full circle, growing). Jag > 0 roughens it into rock.
//   light   a fake light pool on the ground — an additive radial disc. The
//           game's light budget is the env rig; effects never add a real light
//           (a light count change recompiles every lit material).
//   flash   a hot sprite that HOLDS ~4 frames before fading (§19.4 "instant
//           impacts hold >= 3-5 frames").
//   streak  a camera-facing line between two 3D points with a bright head and
//           a tapered tail: arrow trails, dash lines, rain, wind, quill spray.
//   cracks  a radial ground fracture: dark ink with a glowing seam that cools.
//   pillar  a vertical column of light fading upward.
//   star    (AAA pass) an impact flare: a hot core with spikes that POPS in
//           over two frames, holds, then shrinks while its rays stretch — the
//           "this landed" frame of every hit, crit and boss beat.
//   mark    (AAA pass) a ground decal that lingers: a dark stain in the
//           matter's colour under an additive seam that cools (scorch,
//           crater, gouge, splash, sigil). Dissipation's last word.
//   glow    (AAA pass) a held, pulsing sprite that rides a projectile's
//           head (the orb in front of every trail).
//
// Colours come in already resolved (data/vfx.js rows -> palette.js hexes).
// Render-only; randomness from the COSMETIC stream only.
import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { getRadialTexture } from '../glow.js';
import { markShared } from '../geocache.js';
import { exactColor, underBloom } from '../critters/common.js';
import { warmPark } from '../warmup.js';
import { PALETTE } from '../../data/palette.js';
import { HOLD_CAP } from '../hold.js';

// flash 28 -> 64 and star 48 -> 64 with the held contact bloom (THE HIT AND
// THE KILL): every hit now keeps two flashes (the bloom and the class flash)
// and two stars about 0.22 s, and a kill one more flash 0.3 s. At 64 the
// flash pool keeps base's margin, so a busy fight never steals a live enemy
// tell flash it would not have stolen before.
export const KIT_CAPS = Object.freeze({ arc: 40, light: 16, flash: 64, streak: 64, cracks: 12, pillar: 8, star: 64, mark: 24, glow: 32 });
export const GLARE = Object.freeze({ light: 0.65, flash: 0.6, pillar: 0.65 });
const FLASH_HOLD = 0.066; // s — 4 frames at 60 fps at full strength
const STAR_HOLD = 0.05; // s — a star's default full-strength beat after its pop
const STAR_POP = 0.035; // s — a star's pop-in

// Resolved colours are cached per hex: exactColor runs an inverse of the post
// chain, so the hue that lands on screen is the authored one.
const colorCache = new Map();
function col(hex) {
  let c = colorCache.get(hex);
  if (!c) {
    c = exactColor(hex);
    colorCache.set(hex, c);
  }
  return c;
}
// Sprites and light pools stack additively where hits cluster (a six-target
// cleave), so their colour is held under the bloom threshold: they light the
// frame without summing into one blown white blob over the party.
const softCache = new Map();
function soft(hex) {
  let c = softCache.get(hex);
  if (!c) {
    c = underBloom(exactColor(hex), 0.8);
    softCache.set(hex, c);
  }
  return c;
}

// ------------------------------------------------------------------ arc --
const ARC_VERT = /* glsl */ `
uniform float uRadius;
uniform float uWidth;
uniform float uStart;
uniform float uSpan;
uniform float uY;
uniform float uLift;
uniform float uJag;
uniform float uSeed;
uniform float uTaper;
varying vec2 vUv;
void main() {
  vUv = uv;
  float a = uStart + uv.x * uSpan;
  float taper = mix( 1.0, pow( max( sin( 3.14159265 * uv.x ), 0.0 ), 0.55 ), uTaper );
  float jag = uJag * ( sin( a * 7.0 + uSeed ) * 0.5 + sin( a * 13.0 + uSeed * 1.7 ) * 0.33 + sin( a * 29.0 + uSeed * 2.3 ) * 0.17 );
  float r = uRadius + jag * uWidth * 0.9 + ( uv.y - 1.0 ) * uWidth * taper;
  // uLift tips the ribbon up toward its outer (hot) edge, so a swing reads as
  // a blade path in the air rather than a decal.
  vec3 p = vec3( cos( a ) * r, uY + uLift * uv.y, sin( a ) * r );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}
`;
const ARC_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uGlow;
uniform float uOpacity;
uniform float uHead;
uniform float uTail;
uniform float uSoft;
uniform float uCoreGain;
varying vec2 vUv;
void main() {
  float u = vUv.x;
  float lead = 1.0 - smoothstep( uHead - 0.05, uHead, u );
  float trail = smoothstep( uHead - uTail, uHead - uTail * 0.25, u );
  float along = lead * trail;
  float v = vUv.y;
  float edge = smoothstep( mix( 0.6, 0.25, uSoft ), 1.0, v );
  float body = pow( v, mix( 2.6, 0.9, uSoft ) );
  float rim = smoothstep( 0.0, 0.22, v ) * ( 1.0 - smoothstep( 0.97, 1.0, v ) * 0.35 );
  vec3 c = mix( uGlow, uCore * uCoreGain, edge * edge );
  float a = along * rim * ( body * 0.7 + edge * 0.65 ) * uOpacity;
  gl_FragColor = vec4( c, clamp( a, 0.0, 1.0 ) );
}
`;

// --------------------------------------------------------------- streak --
const STREAK_VERT = /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform float uWidth;
uniform float uTailW;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 a = viewMatrix * vec4( uA, 1.0 );
  vec4 b = viewMatrix * vec4( uB, 1.0 );
  vec3 p = mix( a.xyz, b.xyz, uv.x );
  vec2 d = b.xy - a.xy;
  float l = length( d );
  d = l > 1e-5 ? d / l : vec2( 1.0, 0.0 );
  vec2 n = vec2( -d.y, d.x );
  float w = uWidth * mix( uTailW, 1.0, uv.x );
  p.xy += n * ( uv.y - 0.5 ) * w;
  gl_Position = projectionMatrix * vec4( p, 1.0 );
}
`;
const STREAK_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uGlow;
uniform float uOpacity;
uniform float uFall;
varying vec2 vUv;
void main() {
  float across = 1.0 - abs( vUv.y - 0.5 ) * 2.0;
  float core = smoothstep( 0.45, 1.0, across );
  float along = pow( vUv.x, uFall );
  vec3 c = mix( uGlow, uCore, core * core * along );
  float a = smoothstep( 0.0, 0.5, across ) * along * uOpacity;
  gl_FragColor = vec4( c, clamp( a, 0.0, 1.0 ) );
}
`;

// --------------------------------------------------------------- cracks --
// A few jagged radial fractures drawn once (white on transparent); the
// material tints them. Rotated per use, so one texture reads as many.
let crackTex = null;
function getCrackTexture(cosmetic) {
  if (crackTex) return crackTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const branches = 9;
  for (let i = 0; i < branches; i++) {
    let a = (i / branches) * Math.PI * 2 + cosmetic.range(-0.25, 0.25);
    let x = S / 2;
    let y = S / 2;
    let w = 7;
    const steps = 6;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < steps; k++) {
      const len = cosmetic.range(14, 22);
      a += cosmetic.range(-0.5, 0.5);
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      g.lineTo(x, y);
    }
    g.lineWidth = w;
    g.stroke();
    // a side twig
    w = 3;
    g.beginPath();
    const t = cosmetic.range(0.3, 0.6);
    const bx = S / 2 + (x - S / 2) * t;
    const by = S / 2 + (y - S / 2) * t;
    g.moveTo(bx, by);
    g.lineTo(bx + Math.cos(a + 0.9) * 22, by + Math.sin(a + 0.9) * 22);
    g.lineWidth = w;
    g.stroke();
  }
  crackTex = new CanvasTexture(c);
  crackTex.colorSpace = SRGBColorSpace;
  return crackTex;
}

// Vertical fade for pillars (opaque at the base, gone at the top).
let riseTex = null;
function getRiseTexture() {
  if (riseTex) return riseTex;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.08, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  riseTex = new CanvasTexture(c);
  riseTex.colorSpace = SRGBColorSpace;
  return riseTex;
}

// ----------------------------------------------------------------- star --
// Impact flare textures (white on transparent, tinted by the material):
//   'star'   four long needle spikes + four short diagonals over a hot core
//            (sharp classes, crits, enemy hits)
//   'burst'  eight soft rays over a fat core (blunt / round classes, bosses)
const starTex = {};
function getStarTexture(kind) {
  if (starTex[kind]) return starTex[kind];
  const S = 256;
  const H = S / 2;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  const core = g.createRadialGradient(H, H, 0, H, H, S * (kind === 'burst' ? 0.24 : 0.17));
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, S, S);
  const spike = (a, len, w, alpha) => {
    g.save();
    g.translate(H, H);
    g.rotate(a);
    const grad = g.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -w);
    g.lineTo(len, 0);
    g.lineTo(0, w);
    g.lineTo(-len * 0.02, 0);
    g.closePath();
    g.fill();
    g.restore();
  };
  if (kind === 'burst') {
    for (let i = 0; i < 8; i++) spike((i / 8) * Math.PI * 2, H * (i % 2 ? 0.62 : 0.92), S * 0.035, 0.75);
  } else {
    for (let i = 0; i < 4; i++) spike((i / 4) * Math.PI * 2, H * 0.98, S * 0.022, 1);
    for (let i = 0; i < 4; i++) spike((i / 4) * Math.PI * 2 + Math.PI / 4, H * 0.45, S * 0.016, 0.7);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  starTex[kind] = t;
  return t;
}

// ----------------------------------------------------------------- mark --
// Ground decal textures (white on transparent). Drawn once each.
const markTex = {};
function getMarkTexture(kind, cosmetic) {
  if (markTex[kind]) return markTex[kind];
  const S = 256;
  const H = S / 2;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const R = (a, b) => cosmetic.range(a, b);
  const blob = (x, y, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,255,255,${a})`);
    gr.addColorStop(0.7, `rgba(255,255,255,${a * 0.6})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  if (kind === 'gouge') {
    // A long tapered cut, brightest at its middle (a blade or claw scar).
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * S * 0.09;
      g.beginPath();
      g.moveTo(S * 0.06, H + off);
      g.quadraticCurveTo(H, H + off - S * 0.06, S * 0.94, H + off);
      g.quadraticCurveTo(H, H + off + S * 0.025, S * 0.06, H + off);
      g.fillStyle = `rgba(255,255,255,${k === 1 ? 0.95 : 0.55})`;
      g.fill();
    }
  } else if (kind === 'splash') {
    blob(H, H, S * 0.3, 0.8);
    for (let i = 0; i < 16; i++) {
      const a = R(0, Math.PI * 2);
      const d = R(S * 0.22, S * 0.46);
      blob(H + Math.cos(a) * d, H + Math.sin(a) * d, R(S * 0.02, S * 0.06), 0.85);
    }
  } else if (kind === 'sigil') {
    // A drawn circle with ticks: the trace a spell leaves on the floor.
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = S * 0.025;
    g.beginPath();
    g.arc(H, H, S * 0.44, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = S * 0.012;
    g.beginPath();
    g.arc(H, H, S * 0.34, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(H + Math.cos(a) * S * 0.34, H + Math.sin(a) * S * 0.34);
      g.lineTo(H + Math.cos(a) * S * (i % 3 ? 0.4 : 0.44), H + Math.sin(a) * S * (i % 3 ? 0.4 : 0.44));
      g.stroke();
    }
  } else {
    // scorch / crater: a mottled burn, with radial fractures for a crater.
    for (let i = 0; i < 14; i++) {
      const a = R(0, Math.PI * 2);
      const d = R(0, S * 0.2);
      blob(H + Math.cos(a) * d, H + Math.sin(a) * d, R(S * 0.14, S * 0.26), 0.35);
    }
    if (kind === 'crater') {
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        let a = (i / 9) * Math.PI * 2 + R(-0.2, 0.2);
        let x = H;
        let y = H;
        g.lineWidth = S * 0.02;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          a += R(-0.45, 0.45);
          x += Math.cos(a) * S * 0.09;
          y += Math.sin(a) * S * 0.09;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  markTex[kind] = t;
  return t;
}

let arcGeo = null;
let streakGeo = null;
let discGeo = null;
let quadGeo = null;
let tubeGeo = null;

export function createVfxKit({ stage, cosmetic }) {
  const root = new Group();
  root.name = 'vfxkit';
  stage.scene.add(root);
  const rnd = (a, b) => cosmetic.range(a, b);

  arcGeo ??= markShared(new PlaneGeometry(1, 1, 48, 1));
  streakGeo ??= markShared(new PlaneGeometry(1, 1, 1, 1));
  discGeo ??= markShared(new CircleGeometry(1, 40));
  quadGeo ??= markShared(new PlaneGeometry(2, 2));
  tubeGeo ??= markShared(new CylinderGeometry(1, 1, 1, 20, 1, true));
  // Draw every flare / decal texture now (in camp), never mid-fight.
  for (const k of ['star', 'burst']) getStarTexture(k);
  for (const k of ['scorch', 'crater', 'gouge', 'splash', 'sigil']) getMarkTexture(k, cosmetic);

  // Each pool slot: { obj, live, age, life, delay, step(rec, k, dt) }.
  function makePool(cap, build) {
    const slots = [];
    for (let i = 0; i < cap; i++) {
      const s = build();
      s.live = false;
      s.obj.visible = false;
      root.add(s.obj);
      slots.push(s);
    }
    let cursor = 0;
    return {
      slots,
      // A free slot, else the oldest one (recycled mid-flight: the newest
      // effect always wins, the pool never grows).
      take() {
        for (let i = 0; i < cap; i++) {
          const s = slots[(cursor + i) % cap];
          if (!s.live) {
            cursor = (cursor + i + 1) % cap;
            s.owe = 0;
            return s;
          }
        }
        // Held streaks (live projectile trails) are stolen last.
        let oldest = null;
        for (const s of slots) if (!s.hold && (!oldest || s.age - s.delay > oldest.age - oldest.delay)) oldest = s;
        oldest ??= slots[cursor];
        oldest.owner = null;
        oldest.owe = 0;
        return oldest;
      },
      live: () => slots.reduce((n, s) => n + (s.live ? 1 : 0), 0),
    };
  }

  // ------------------------------------------------------------------ arc --
  const arcs = makePool(KIT_CAPS.arc, () => {
    const u = {
      uRadius: { value: 1 },
      uWidth: { value: 0.2 },
      uStart: { value: 0 },
      uSpan: { value: 1 },
      uY: { value: 0.4 },
      uLift: { value: 0 },
      uJag: { value: 0 },
      uSeed: { value: 0 },
      uTaper: { value: 1 },
      uCore: { value: new Color() },
      uGlow: { value: new Color() },
      uOpacity: { value: 0 },
      uHead: { value: 0 },
      uTail: { value: 1 },
      uSoft: { value: 0.5 },
      uCoreGain: { value: 1 },
    };
    const mat = new ShaderMaterial({
      uniforms: u,
      vertexShader: ARC_VERT,
      fragmentShader: ARC_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const mesh = new Mesh(arcGeo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 7;
    return { obj: mesh, u };
  });

  // opts: x, z, angle (rad, XZ: dir = (cos, sin)), radius, width, span (rad),
  // sweep (s for the head to cross), life (s), core, glow (hex), soft (0..1),
  // y, lift, jag, taper (0 full width .. 1 pointed ends), tail (0..1 of the
  // arc left glowing behind the head), delay (s), grow (radius gain over life),
  // gain (core brightness), opacity.
  function slash(o) {
    const s = arcs.take();
    const u = s.u;
    const span = o.span ?? Math.PI * 0.6;
    s.obj.renderOrder = 7;
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.3;
    s.kind = 'slash';
    s.sweep = Math.max(0.01, o.sweep ?? 0.08);
    s.r0 = o.radius ?? 1;
    s.grow = o.grow ?? 0.06;
    s.w0 = o.width ?? 0.2;
    s.op = o.opacity ?? 1;
    s.tail = o.tail ?? 0.85;
    s.obj.position.set(o.x, 0, o.z);
    u.uStart.value = (o.angle ?? 0) - span / 2;
    u.uSpan.value = span;
    // Reverse sweep: start from the other end so alternating swings mirror.
    if (o.reverse) {
      u.uStart.value = (o.angle ?? 0) + span / 2;
      u.uSpan.value = -span;
    }
    u.uY.value = o.y ?? 0.42;
    u.uLift.value = o.lift ?? 0.12;
    u.uJag.value = o.jag ?? 0;
    u.uSeed.value = rnd(0, 100);
    u.uTaper.value = o.taper ?? 1;
    u.uCore.value.copy(col(o.core ?? PALETTE.parchment));
    u.uGlow.value.copy(col(o.glow ?? PALETTE.hearthAmber));
    u.uSoft.value = o.soft ?? 0.5;
    u.uCoreGain.value = o.gain ?? 1;
    u.uRadius.value = s.r0;
    u.uWidth.value = s.w0;
    u.uHead.value = 0;
    u.uTail.value = s.tail;
    u.uOpacity.value = 0;
    s.obj.visible = s.delay <= 0;
    return s;
  }

  // A full-circle shockwave: r0 -> r1 over life, thinning as it goes.
  // order: draw order (default 7, over the floor); a kill ring passes a low
  // one so any Ember telegraph ring (1-3) draws over it (VFX_HIT_RULES K1).
  function ring(o) {
    const s = arcs.take();
    const u = s.u;
    s.obj.renderOrder = o.order ?? 7;
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.45;
    s.kind = 'ring';
    s.r0 = o.r0 ?? 0.2;
    s.r1 = o.r1 ?? 1.2;
    s.w0 = o.width ?? 0.2;
    s.op = o.opacity ?? 1;
    s.thin = o.thin ?? 0.6;
    s.obj.position.set(o.x, 0, o.z);
    u.uStart.value = rnd(0, Math.PI * 2);
    u.uSpan.value = Math.PI * 2;
    u.uY.value = o.y ?? 0.05;
    u.uLift.value = o.lift ?? 0;
    u.uJag.value = o.jag ?? 0;
    u.uSeed.value = rnd(0, 100);
    u.uTaper.value = 0;
    u.uCore.value.copy(col(o.core ?? PALETTE.parchment));
    u.uGlow.value.copy(col(o.glow ?? PALETTE.hearthAmber));
    u.uSoft.value = o.soft ?? 0.5;
    u.uCoreGain.value = o.gain ?? 1;
    u.uHead.value = 2;
    u.uTail.value = 3;
    u.uRadius.value = s.r0;
    u.uWidth.value = s.w0;
    u.uOpacity.value = 0;
    s.obj.visible = s.delay <= 0;
    return s;
  }

  function stepArc(s, t) {
    const u = s.u;
    const k = Math.min(1, t / s.life);
    if (s.kind === 'slash') {
      // Head crosses the arc in `sweep` s (ease-out), the tail then burns off.
      const h = Math.min(1, t / s.sweep);
      u.uHead.value = 1 - (1 - h) * (1 - h) + (t > s.sweep ? ((t - s.sweep) / Math.max(0.01, s.life - s.sweep)) * s.tail : 0);
      u.uRadius.value = s.r0 * (1 + s.grow * k);
      u.uWidth.value = s.w0 * (1 - 0.35 * k);
      u.uOpacity.value = s.op * (t < s.sweep ? 1 : Math.pow(1 - k, 1.3));
    } else {
      const e = 1 - Math.pow(1 - k, 3); // fast out, slow settle
      u.uRadius.value = s.r0 + (s.r1 - s.r0) * e;
      u.uWidth.value = s.w0 * (1 - s.thin * k);
      u.uOpacity.value = s.op * (k < 0.08 ? k / 0.08 : Math.pow(1 - (k - 0.08) / 0.92, 1.4));
    }
  }

  // ---------------------------------------------------------------- light --
  const lights = makePool(KIT_CAPS.light, () => {
    const mat = new MeshBasicMaterial({
      map: getRadialTexture(),
      color: new Color(),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new Mesh(discGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = -6; // under the bodies: it is light ON the ground
    return { obj: mesh, mat };
  });
  let lightGain = 1;
  // The glare budget (Kesh, 10-27: "too bright, can't see anything"): every
  // additive light, flash and pillar the kit draws is scaled down so a busy
  // fight keeps its bodies, numbers and floor warnings readable. Shapes,
  // slashes, rings and stars keep their strength; only the wash dims.
  // opts: x, z, radius, color, opacity, life, attack (s), y.
  let lightTokens = 0;
  // A light the caller moves (S7: the floor under a shot in flight): it
  // lives until endLight; follow it only while slot.token matches.
  function moveLight(s, token, x, z) {
    if (!s || s.token !== token || !s.live) return false;
    s.obj.position.x = x;
    s.obj.position.z = z;
    return true;
  }
  function endLight(s, token, fade = 0.08) {
    if (!s || s.token !== token || !s.live) return;
    const t = Math.max(0, s.age - s.delay);
    s.endAt = t;
    s.endFade = fade;
    s.life = t + fade;
  }
  function light(o) {
    if (lightGain <= 0) return null;
    const s = lights.take();
    s.token = ++lightTokens;
    s.endAt = -1;
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.35;
    s.attack = o.attack ?? 0.03;
    s.op = (o.opacity ?? 0.5) * 0.75 * GLARE.light * lightGain;
    s.r = o.radius ?? 1;
    s.mat.color.copy(soft(o.color ?? PALETTE.hearthAmber));
    s.mat.opacity = 0;
    s.obj.position.set(o.x, o.y ?? 0.025, o.z);
    s.obj.scale.set(s.r, s.r, 1);
    s.obj.visible = s.delay <= 0;
    return s;
  }
  function stepLight(s, t) {
    const a = s.endAt >= 0 ? (s.endAt < s.attack ? Math.min(1, s.endAt / s.attack) : 1) * Math.pow(Math.max(0, 1 - (t - s.endAt) / s.endFade), 2) : t < s.attack ? t / s.attack : Math.pow(1 - (t - s.attack) / Math.max(0.01, s.life - s.attack), 2);
    s.mat.opacity = s.op * Math.max(0, a);
    const sc = s.r * (0.85 + 0.15 * Math.min(1, t / Math.max(0.01, s.attack * 3)));
    s.obj.scale.set(sc, sc, 1);
  }

  // ---------------------------------------------------------------- flash --
  const flashes = makePool(KIT_CAPS.flash, () => {
    const mat = new SpriteMaterial({
      map: getRadialTexture(),
      color: new Color(),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const sp = new Sprite(mat);
    sp.renderOrder = 9;
    return { obj: sp, mat };
  });
  // opts: x, y, z, color, size, life, grow, opacity, hold (s at full strength).
  function flash(o) {
    const s = flashes.take();
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.2;
    s.holdT = Math.min(s.life * 0.6, o.hold ?? FLASH_HOLD);
    s.size = o.size ?? 0.5;
    s.grow = o.grow ?? 0.4;
    s.op = (o.opacity ?? 0.75) * 0.8 * GLARE.flash;
    s.mat.color.copy(soft(o.color ?? PALETTE.parchment));
    s.obj.position.set(o.x, o.y ?? 0.45, o.z);
    s.obj.scale.set(s.size, s.size, 1);
    s.obj.visible = s.delay <= 0;
    return s;
  }
  function stepFlash(s, t) {
    const k = Math.min(1, t / s.life);
    const f = t < s.holdT ? 1 : Math.pow(1 - (t - s.holdT) / Math.max(0.01, s.life - s.holdT), 1.6);
    s.mat.opacity = s.op * f;
    const sc = s.size * (1 + s.grow * k);
    s.obj.scale.set(sc, sc, 1);
  }

  // --------------------------------------------------------------- streak --
  const streaks = makePool(KIT_CAPS.streak, () => {
    const u = {
      uA: { value: new Vector3() },
      uB: { value: new Vector3() },
      uWidth: { value: 0.1 },
      uTailW: { value: 0.2 },
      uCore: { value: new Color() },
      uGlow: { value: new Color() },
      uOpacity: { value: 0 },
      uFall: { value: 1.4 },
    };
    const mat = new ShaderMaterial({
      uniforms: u,
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });
    const mesh = new Mesh(streakGeo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 8;
    return { obj: mesh, u };
  });
  // opts: a {x,y,z} tail, b {x,y,z} head, width, tailW (0..1), core, glow,
  // life, opacity, fall (along-fade power), travel {x,y,z} (u/s both ends
  // move — falling rain, flung quills), stretch (u/s the tail lags behind).
  // `hold: true` keeps it alive until release() (projectile trails).
  function streak(o) {
    const s = streaks.take();
    const u = s.u;
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.25;
    s.op = o.opacity ?? 1;
    s.hold = !!o.hold;
    s.owner = o.owner ?? null;
    s.travel = o.travel ?? null;
    s.a = { x: o.a.x, y: o.a.y, z: o.a.z };
    s.b = { x: o.b.x, y: o.b.y, z: o.b.z };
    u.uA.value.x = s.a.x;
    u.uA.value.y = s.a.y;
    u.uA.value.z = s.a.z;
    u.uB.value.x = s.b.x;
    u.uB.value.y = s.b.y;
    u.uB.value.z = s.b.z;
    u.uWidth.value = o.width ?? 0.1;
    u.uTailW.value = o.tailW ?? 0.2;
    u.uFall.value = o.fall ?? 1.4;
    u.uCore.value.copy(col(o.core ?? PALETTE.parchment));
    u.uGlow.value.copy(col(o.glow ?? PALETTE.hearthAmber));
    u.uOpacity.value = s.hold ? s.op : 0;
    s.obj.visible = s.delay <= 0;
    return s;
  }
  // Move a held streak (projectile trails): head at b, tail at a.
  function setStreak(s, ax, ay, az, bx, by, bz) {
    const u = s.u;
    u.uA.value.x = ax;
    u.uA.value.y = ay;
    u.uA.value.z = az;
    u.uB.value.x = bx;
    u.uB.value.y = by;
    u.uB.value.z = bz;
    s.a.x = ax;
    s.a.y = ay;
    s.a.z = az;
    s.b.x = bx;
    s.b.y = by;
    s.b.z = bz;
  }
  // A held streak lets go: it fades over `life` from here.
  function release(s, life = 0.12) {
    if (!s || !s.live) return;
    s.hold = false;
    s.age = 0;
    s.delay = 0;
    s.life = life;
  }
  function stepStreak(s, t, dt) {
    const u = s.u;
    if (s.hold) {
      u.uOpacity.value = s.op;
      return;
    }
    if (s.travel) {
      const tr = s.travel;
      u.uA.value.x = s.a.x += tr.x * dt;
      u.uA.value.y = s.a.y += tr.y * dt;
      u.uA.value.z = s.a.z += tr.z * dt;
      u.uB.value.x = s.b.x += tr.x * dt;
      u.uB.value.y = s.b.y += tr.y * dt;
      u.uB.value.z = s.b.z += tr.z * dt;
    }
    const k = Math.min(1, t / s.life);
    u.uOpacity.value = s.op * (k < 0.1 ? k / 0.1 : Math.pow(1 - (k - 0.1) / 0.9, 1.2));
  }

  // --------------------------------------------------------------- cracks --
  const cracks = makePool(KIT_CAPS.cracks, () => {
    const tex = getCrackTexture(cosmetic);
    const ink = new MeshBasicMaterial({ map: tex, color: col(PALETTE.voidCharcoal), transparent: true, opacity: 0, depthWrite: false, blending: NormalBlending });
    const seam = new MeshBasicMaterial({ map: tex, color: new Color(), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
    const g = new Group();
    const a = new Mesh(quadGeo, ink);
    a.rotation.x = -Math.PI / 2;
    a.renderOrder = -7;
    const b = new Mesh(quadGeo, seam);
    b.rotation.x = -Math.PI / 2;
    b.position.y = 0.004;
    b.scale.setScalar(0.94);
    b.renderOrder = -6;
    g.add(a);
    g.add(b);
    return { obj: g, ink, seam };
  });
  // opts: x, z, radius, glow, life, cool (s the seam glows), opacity.
  function crack(o) {
    const s = cracks.take();
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 1.4;
    s.cool = Math.min(s.life, o.cool ?? 0.45);
    s.op = o.opacity ?? 0.85;
    s.r = o.radius ?? 1;
    s.seam.color.copy(col(o.glow ?? PALETTE.hearthAmber));
    s.obj.position.set(o.x, 0.03, o.z);
    s.obj.rotation.y = rnd(0, Math.PI * 2);
    s.obj.scale.set(0.2 * s.r, 1, 0.2 * s.r);
    s.obj.visible = s.delay <= 0;
    return s;
  }
  function stepCrack(s, t) {
    const grow = Math.min(1, t / 0.07); // fractures race out in ~4 frames
    const sc = s.r * (0.25 + 0.75 * (1 - Math.pow(1 - grow, 2)));
    s.obj.scale.set(sc, 1, sc);
    const k = Math.min(1, t / s.life);
    s.ink.opacity = s.op * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
    s.seam.opacity = t < s.cool ? 1 - t / s.cool : 0;
  }

  // --------------------------------------------------------------- pillar --
  const pillars = makePool(KIT_CAPS.pillar, () => {
    const mat = new MeshBasicMaterial({
      map: getRiseTexture(),
      color: new Color(),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const mesh = new Mesh(tubeGeo, mat);
    mesh.renderOrder = 8;
    return { obj: mesh, mat };
  });
  // opts: x, z, radius, height, color, life, opacity.
  function pillar(o) {
    const s = pillars.take();
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.5;
    s.op = (o.opacity ?? 0.7) * GLARE.pillar;
    s.r = o.radius ?? 0.4;
    s.h = o.height ?? 1.6;
    s.mat.color.copy(col(o.color ?? PALETTE.parchment));
    s.obj.position.set(o.x, s.h / 2, o.z);
    s.obj.scale.set(s.r, s.h, s.r);
    s.obj.visible = s.delay <= 0;
    return s;
  }
  function stepPillar(s, t) {
    const k = Math.min(1, t / s.life);
    s.mat.opacity = s.op * (k < 0.12 ? k / 0.12 : Math.pow(1 - (k - 0.12) / 0.88, 1.5));
    const r = s.r * (1 - 0.5 * k);
    s.obj.scale.set(r, s.h * (0.7 + 0.3 * Math.min(1, k * 4)), r);
  }

  // ----------------------------------------------------------------- star --
  const stars = makePool(KIT_CAPS.star, () => {
    const mat = new SpriteMaterial({
      map: getStarTexture('star'),
      color: new Color(),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const sp = new Sprite(mat);
    sp.renderOrder = 10;
    return { obj: sp, mat };
  });
  // opts: x, y, z, color, size, life, kind ('star' | 'burst'), spin (rad/s),
  // opacity, delay, hold (s at full strength after the pop; default 0.05).
  // Pops in over ~2 frames, holds ~3, then shrinks while the rays stretch out.
  function star(o) {
    const s = stars.take();
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.2;
    // A longer hold (the contact bloom, the kill flare: VFX_HIT_RULES L5, K1)
    // keeps a fade of at least 40% of the life after it.
    s.holdT = o.hold != null ? Math.max(STAR_HOLD, Math.min(o.hold, s.life * 0.6)) : STAR_HOLD;
    s.size = o.size ?? 0.8;
    s.op = (o.opacity ?? 1) * 0.9;
    s.spin = o.spin ?? 0;
    s.mat.map = getStarTexture(o.kind ?? 'star');
    s.mat.rotation = o.angle ?? rnd(0, Math.PI);
    s.mat.color.copy(soft(o.color ?? PALETTE.parchment));
    s.mat.opacity = 0;
    s.obj.position.set(o.x, o.y ?? 0.5, o.z);
    s.obj.scale.set(0.01, 0.01, 1);
    s.obj.visible = s.delay <= 0;
    return s;
  }
  function stepStar(s, t, dt) {
    const pop = Math.min(1, t / STAR_POP);
    const hold = s.holdT ?? STAR_HOLD;
    const k = t < hold ? 0 : (t - hold) / Math.max(0.01, s.life - hold);
    s.mat.opacity = s.op * pop * Math.pow(1 - Math.min(1, k), 1.4);
    const sc = s.size * (0.55 + 0.45 * pop) * (1 + 0.35 * k);
    s.obj.scale.set(sc * (1 + 0.25 * k), sc * (1 - 0.35 * k), 1);
    s.mat.rotation += s.spin * dt;
  }

  // ----------------------------------------------------------------- mark --
  const marks = makePool(KIT_CAPS.mark, () => {
    const stain = new MeshBasicMaterial({ map: getMarkTexture('scorch', cosmetic), color: new Color(), transparent: true, opacity: 0, depthWrite: false, blending: NormalBlending });
    const seam = new MeshBasicMaterial({ map: getMarkTexture('scorch', cosmetic), color: new Color(), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
    const g = new Group();
    const a = new Mesh(quadGeo, stain);
    a.rotation.x = -Math.PI / 2;
    a.renderOrder = -8;
    const b = new Mesh(quadGeo, seam);
    b.rotation.x = -Math.PI / 2;
    b.position.y = 0.003;
    b.renderOrder = -6;
    g.add(a);
    g.add(b);
    return { obj: g, stain, seam };
  });
  // opts: x, z, radius, kind ('scorch' | 'crater' | 'gouge' | 'splash' |
  // 'sigil'), angle (rad, gouge direction), stain (hex, the matter), glow
  // (hex, the hot seam; null = none), cool (s the seam takes to go out), life
  // (s to fully fade), opacity, stretch (x scale for gouges), delay.
  function mark(o) {
    const s = marks.take();
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 2.6;
    s.cool = Math.min(s.life, o.cool ?? 0.6);
    s.op = o.opacity ?? 0.6;
    s.gop = o.glow ? (o.glowOpacity ?? 0.9) * lightGain + 0.25 * (1 - lightGain) : 0;
    s.r = o.radius ?? 0.8;
    const tex = getMarkTexture(o.kind ?? 'scorch', cosmetic);
    s.stain.map = tex;
    s.seam.map = tex;
    s.stain.color.copy(col(o.stain ?? PALETTE.voidCharcoal));
    if (o.glow) s.seam.color.copy(col(o.glow));
    s.obj.position.set(o.x, 0.02 + (marks.slots.indexOf(s) % 8) * 0.0015, o.z);
    s.obj.rotation.y = o.angle !== undefined ? -o.angle : rnd(0, Math.PI * 2);
    s.sx = o.stretch ?? 1;
    s.obj.scale.set(s.r * 0.6 * s.sx, 1, s.r * 0.6);
    s.obj.visible = s.delay <= 0;
    return s;
  }
  function stepMark(s, t) {
    const grow = 1 - Math.pow(1 - Math.min(1, t / 0.08), 2);
    const sc = s.r * (0.6 + 0.4 * grow) * 0.5;
    s.obj.scale.set(sc * s.sx, 1, sc);
    const k = t / s.life;
    s.stain.opacity = s.op * Math.min(1, t / 0.05) * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    s.seam.opacity = s.gop * (t < s.cool ? Math.pow(1 - t / s.cool, 1.5) : 0);
  }

  // ----------------------------------------------------------------- glow --
  const glows = makePool(KIT_CAPS.glow, () => {
    const mat = new SpriteMaterial({
      map: getRadialTexture(),
      color: new Color(),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const sp = new Sprite(mat);
    sp.renderOrder = 9;
    return { obj: sp, mat };
  });
  // A held orb (projectile head): opts x, y, z, color, size, opacity, owner,
  // pulse (Hz). Moved with setGlow, let go with release().
  function glow(o) {
    const s = glows.take();
    s.live = true;
    s.age = 0;
    s.delay = 0;
    s.life = 0.12;
    s.hold = true;
    s.owner = o.owner ?? null;
    s.size = o.size ?? 0.4;
    s.op = (o.opacity ?? 0.9) * 0.85;
    s.pulse = o.pulse ?? 9;
    s.phase = rnd(0, 6.28);
    s.mat.color.copy(soft(o.color ?? PALETTE.parchment));
    s.mat.opacity = s.op;
    s.obj.position.set(o.x, o.y ?? 0.5, o.z);
    s.obj.scale.set(s.size, s.size, 1);
    s.obj.visible = true;
    return s;
  }
  function setGlow(s, x, y, z) {
    s.obj.position.set(x, y, z);
  }
  function stepGlow(s, t) {
    if (s.hold) {
      const w = 1 + 0.14 * Math.sin(s.age * s.pulse * 6.283 + s.phase);
      s.obj.scale.set(s.size * w, s.size * w, 1);
      s.mat.opacity = s.op;
      return;
    }
    // Released: a last bloom, then gone.
    const k = Math.min(1, t / s.life);
    s.mat.opacity = s.op * (1 - k);
    const sc = s.size * (1 + 0.8 * k);
    s.obj.scale.set(sc, sc, 1);
  }

  // --------------------------------------------------------------- update --
  const POOLS = [
    [arcs, stepArc],
    [lights, stepLight],
    [flashes, stepFlash],
    [streaks, stepStreak],
    [cracks, stepCrack],
    [pillars, stepPillar],
    [stars, stepStar],
    [marks, stepMark],
    [glows, stepGlow],
  ];
  // Render hold on hitstop (render/hold.js, VFX_HIT_RULES F1): a slash's
  // sweep, a flash and a star pause for the hold's seconds; rings, lights,
  // streaks, cracks, pillars, marks and glows run on. A star finishes its
  // pop first, so a flare born on the hit frame holds at full size, not half.
  // Returns the floor (s of its own time) from which a slot may pause, or -1.
  const holdFloor = (pool, s) => (pool === arcs ? (s.kind === 'slash' ? 0 : -1) : pool === flashes ? 0 : pool === stars ? STAR_POP : -1);
  let heldSlots = 0;
  // hold: the render hold (render/hold.js renderHold), or null for none —
  // the model lab and the harness scenes drive their own kit without one.
  function update(dt, hold = null) {
    const due = hold ? hold.due : 0;
    const dueBorn = hold ? hold.dueBorn || 0 : 0;
    heldSlots = 0;
    for (const [pool, step] of POOLS) {
      for (const s of pool.slots) {
        if (!s.live) continue;
        let d = dt;
        if (hold && !s.hold) {
          const floor = holdFloor(pool, s);
          if (floor >= 0) {
            // Born before this frame, it was on screen for the whole freeze;
            // born this frame, only for what froze after this frame's hits.
            const add = s.age > 0 ? due : dueBorn;
            if (add > 0) s.owe = Math.min(HOLD_CAP, (s.owe || 0) + add);
            const t0 = s.age - s.delay;
            if (s.owe > 0 && (t0 < 0 || t0 >= floor)) {
              const h = Math.min(s.owe, d);
              s.owe -= h;
              d -= h;
              heldSlots += 1;
            }
          }
        }
        s.age += d;
        if (s.hold) {
          step(s, 0, dt);
          continue;
        }
        const t = s.age - s.delay;
        if (t < 0) continue;
        if (!s.obj.visible) s.obj.visible = true;
        if (t >= s.life) {
          s.live = false;
          s.obj.visible = false;
          continue;
        }
        step(s, t, d);
      }
    }
  }

  function clear() {
    let n = 0;
    for (const [pool] of POOLS)
      for (const s of pool.slots) {
        if (s.live) n += 1;
        s.live = false;
        s.hold = false;
        s.owe = 0;
        s.obj.visible = false;
      }
    return n;
  }

  // How many live arcs, flashes and stars sit within r of (x, z): the Tempered
  // look's crowd read (shrinefx.js, Small fixes 9), so a fight off screen
  // never counts.
  function liveNear(x, z, r) {
    let n = 0;
    const rr = r * r;
    for (const p of [arcs, flashes, stars]) {
      for (const s of p.slots) {
        if (!s.live) continue;
        const dx = s.obj.position.x - x;
        const dz = s.obj.position.z - z;
        if (dx * dx + dz * dz <= rr) n += 1;
      }
    }
    return n;
  }
  function counts() {
    return {
      arcs: arcs.live(),
      lights: lights.live(),
      flashes: flashes.live(),
      streaks: streaks.live(),
      cracks: cracks.live(),
      pillars: pillars.live(),
      stars: stars.live(),
      marks: marks.live(),
      glows: glows.live(),
      held: heldSlots,
    };
  }

  // First-draw warm-up (render/warmup.js): one slot of each pool is drawn in
  // camp for a few frames so the first slash of a fight pays no compile.
  function prewarm(visibleRoot) {
    for (const [pool] of POOLS) {
      const s = pool.slots[0];
      root.remove(s.obj);
      s.obj.visible = true;
      warmPark(visibleRoot, s.obj, (o) => {
        o.visible = false;
        o.frustumCulled = false;
        root.add(o);
      });
    }
  }

  function setIntensity({ light: l = 1 } = {}) {
    lightGain = l;
  }

  return { root, slash, ring, light, moveLight, endLight, flash, streak, setStreak, release, crack, pillar, star, mark, glow, setGlow, update, clear, counts, liveNear, prewarm, setIntensity };
}
