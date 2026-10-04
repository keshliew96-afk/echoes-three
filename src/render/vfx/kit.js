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

export const KIT_CAPS = Object.freeze({ arc: 40, light: 16, flash: 28, streak: 64, cracks: 12, pillar: 8 });
const FLASH_HOLD = 0.066; // s — 4 frames at 60 fps at full strength

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
            return s;
          }
        }
        // Held streaks (live projectile trails) are stolen last.
        let oldest = null;
        for (const s of slots) if (!s.hold && (!oldest || s.age - s.delay > oldest.age - oldest.delay)) oldest = s;
        oldest ??= slots[cursor];
        oldest.owner = null;
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
  function ring(o) {
    const s = arcs.take();
    const u = s.u;
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
  // opts: x, z, radius, color, opacity, life, attack (s), y.
  function light(o) {
    if (lightGain <= 0) return null;
    const s = lights.take();
    s.live = true;
    s.age = 0;
    s.delay = o.delay ?? 0;
    s.life = o.life ?? 0.35;
    s.attack = o.attack ?? 0.03;
    s.op = (o.opacity ?? 0.5) * 0.75 * lightGain;
    s.r = o.radius ?? 1;
    s.mat.color.copy(soft(o.color ?? PALETTE.hearthAmber));
    s.mat.opacity = 0;
    s.obj.position.set(o.x, o.y ?? 0.025, o.z);
    s.obj.scale.set(s.r, s.r, 1);
    s.obj.visible = s.delay <= 0;
    return s;
  }
  function stepLight(s, t) {
    const a = t < s.attack ? t / s.attack : Math.pow(1 - (t - s.attack) / Math.max(0.01, s.life - s.attack), 2);
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
    s.op = (o.opacity ?? 0.75) * 0.8;
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
    s.op = o.opacity ?? 0.7;
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

  // --------------------------------------------------------------- update --
  const POOLS = [
    [arcs, stepArc],
    [lights, stepLight],
    [flashes, stepFlash],
    [streaks, stepStreak],
    [cracks, stepCrack],
    [pillars, stepPillar],
  ];
  function update(dt) {
    for (const [pool, step] of POOLS) {
      for (const s of pool.slots) {
        if (!s.live) continue;
        s.age += dt;
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
        step(s, t, dt);
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
        s.obj.visible = false;
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

  return { root, slash, ring, light, flash, streak, setStreak, release, crack, pillar, update, clear, counts, prewarm, setIntensity };
}
