// Pooled particle bursts — the §9 juice contract #6 kill burst PLUS the
// REFERENCE_BAR check-5 layering the reference frames actually show:
// "white-hot core + orange glow + BLACK SMOKE CHUNKS + DEBRIS + lingering
// trail. A single hit reads as an event."
//
// Round-1 certification measured `state().vfx.particles === 0` through whole
// fights, because the only emitter was the kill burst (12 additive motes,
// ~0.5 s) — a mid-combat frame almost never lands on one. Every impact now
// throws particles, and each burst mixes THREE material families so it reads
// as matter, not as a light:
//
//   spark  — additive motes (the hot layer; colour per event family)
//   chunk  — normal-blended DARK debris shards that arc and land
//   smoke  — normal-blended dark soft puffs that rise, grow and fade
//
// DRAWN AS THREE `Points` CLOUDS, not as N sprites. The first cut of this
// system gave every particle its own Sprite + SpriteMaterial, i.e. one draw
// call and one material bind per particle: measured in the boss room with six
// adds, ~40 live particles cost **7.3 ms a frame** (96.9 fps -> 56.9, against
// the >= 55 fps bar). One Points object per material family is three draw
// calls no matter how many particles are alive; per-particle colour AND alpha
// ride a vec4 colour attribute (three's USE_COLOR_ALPHA path) and per-particle
// size rides an `aSize` attribute patched into the points vertex shader.
//
// All randomness comes from the COSMETIC stream (never the gameplay stream).
// Render-only: driven by events + render dt, touches no sim state.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  NormalBlending,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three';
import { getRadialTexture } from '../glow.js';
import { PALETTE } from '../../data/palette.js';
import { warmPark } from '../warmup.js';

// Render scaffold tunables (cosmetic, not brief numbers).
const GRAVITY = 8.5; // u/s^2
const START_Y = 0.45;
// Per-family live ceiling (§1 density): impacts are frequent, so each cloud is
// capped and the OLDEST particle is dropped rather than letting a wave stack.
const CAP = { spark: 160, chunk: 120, smoke: 56, shard: 96 };
// The points shader takes gl_PointSize in pixels before size attenuation; this
// converts the world-unit sizes the callers author into that scale so a
// particle authored at 0.2 u covers about 0.2 u of ground.
// 1 / tan(fov/2) at the §1 45-degree camera: makes an authored world-unit size
// cover the same ground a sprite of that scale used to.
const SIZE_SCALE = 2.41;

// --- Debris chunk texture: a hard-edged irregular shard (a chunk of matter,
// not a dot of light). Alpha-only; the vertex colour tints it.
let chunkTex = null;
function getChunkTexture() {
  if (chunkTex) return chunkTex;
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(S * 0.18, S * 0.3);
  ctx.lineTo(S * 0.76, S * 0.16);
  ctx.lineTo(S * 0.88, S * 0.62);
  ctx.lineTo(S * 0.44, S * 0.9);
  ctx.lineTo(S * 0.12, S * 0.64);
  ctx.closePath();
  ctx.fill();
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  chunkTex = tex;
  return tex;
}

// --- Shard atlas (VFX redesign, docs/gauntlet/design-VFX.md): the class and
// enemy debris that has a SHAPE — Healer petals, Archer feathers, quills /
// mantis needles, toad droplets. A 2x2 atlas so one Points cloud draws all
// four; each particle picks its tile and spins (aTile / aRot below).
// Tiles: 0 petal, 1 feather, 2 needle, 3 drop.
export const SHARD_TILE = Object.freeze({ petal: 0, feather: 1, needle: 2, drop: 3 });
let shardTex = null;
function getShardTexture() {
  if (shardTex) return shardTex;
  const S = 128;
  const H = S / 2;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  // petal: a soft almond
  ctx.save();
  ctx.translate(H * 0.5, H * 0.5);
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(15, -4, 0, 24);
  ctx.quadraticCurveTo(-15, -4, 0, -24);
  ctx.fill();
  ctx.restore();
  // feather: a vane with a quill line
  ctx.save();
  ctx.translate(H * 1.5, H * 0.5);
  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.quadraticCurveTo(11, -8, 3, 22);
  ctx.lineTo(-3, 22);
  ctx.quadraticCurveTo(-11, -8, 0, -27);
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(0, 28);
  ctx.stroke();
  ctx.restore();
  // needle: a long thin spike
  ctx.save();
  ctx.translate(H * 0.5, H * 1.5);
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(4, 10);
  ctx.lineTo(0, 28);
  ctx.lineTo(-4, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // drop: a teardrop
  ctx.save();
  ctx.translate(H * 1.5, H * 1.5);
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.quadraticCurveTo(16, 8, 0, 18);
  ctx.quadraticCurveTo(-16, 8, 0, -22);
  ctx.fill();
  ctx.restore();
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  shardTex = tex;
  return tex;
}

const ROLLED = ['speed', 'up', 'size', 'life', 'opacity', 'spin', 'flutter', 'grow', 'drag', 'gravity'];

// Palette-anchored particle colours (§19.1 — no invented hexes).
const DEBRIS_DARK = new Color(PALETTE.voidCharcoal);
const SMOKE_DARK = new Color(PALETTE.voidCharcoal).lerp(new Color(PALETTE.warmGrey), 0.22);
const _c = new Color();

function makeCloud(map, blending, cap, renderOrder, { atlas = false } = {}) {
  const geo = new BufferGeometry();
  const position = new Float32Array(cap * 3);
  const color = new Float32Array(cap * 4); // vec4 => USE_COLOR_ALPHA
  const aSize = new Float32Array(cap);
  // Atlas clouds only: per-particle spin (radians) and atlas tile (0..3).
  const aRot = atlas ? new Float32Array(cap) : null;
  const aTile = atlas ? new Float32Array(cap) : null;
  geo.setAttribute('position', new BufferAttribute(position, 3));
  geo.setAttribute('color', new BufferAttribute(color, 4));
  geo.setAttribute('aSize', new BufferAttribute(aSize, 1));
  if (atlas) {
    geo.setAttribute('aRot', new BufferAttribute(aRot, 1));
    geo.setAttribute('aTile', new BufferAttribute(aTile, 1));
  }
  geo.setDrawRange(0, 0);
  const material = new PointsMaterial({
    map,
    transparent: true,
    depthWrite: false,
    blending,
    vertexColors: true,
    sizeAttenuation: true,
    size: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'attribute float aSize;\n' +
      shader.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = aSize;');
    if (atlas) {
      // Spin the sprite and pick its quarter of the 2x2 atlas.
      shader.vertexShader =
        'attribute float aRot;\nattribute float aTile;\nvarying float vRot;\nvarying vec2 vTile;\n' +
        shader.vertexShader.replace(
          'gl_PointSize = aSize;',
          'gl_PointSize = aSize;\n\tvRot = aRot;\n\tvTile = vec2( mod( aTile, 2.0 ), floor( aTile / 2.0 ) ) * 0.5;'
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vRot;\nvarying vec2 vTile;')
        .replace(
          '#include <map_particle_fragment>',
          [
            'vec2 pc = gl_PointCoord - 0.5;',
            'float cr = cos( vRot ), sr = sin( vRot );',
            'vec2 ruv = clamp( vec2( cr * pc.x - sr * pc.y, sr * pc.x + cr * pc.y ) + 0.5, 0.0, 1.0 );',
            'diffuseColor *= texture2D( map, vTile + vec2( ruv.x, 1.0 - ruv.y ) * 0.5 );',
          ].join('\n')
        );
    }
  };
  // Distinct cache key: the atlas cloud's program differs from the plain ones.
  if (atlas) material.customProgramCacheKey = () => 'echoes-particles-atlas';
  const points = new Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = renderOrder;
  return { geo, points, position, color, aSize, aRot, aTile, list: [], cap, atlas };
}

export function createParticlePool(parent, cosmetic) {
  const clouds = {
    // Smoke behind, then debris, then the hot sparks on top.
    smoke: makeCloud(getRadialTexture(), NormalBlending, CAP.smoke, 7),
    chunk: makeCloud(getChunkTexture(), NormalBlending, CAP.chunk, 8),
    spark: makeCloud(getRadialTexture(), AdditiveBlending, CAP.spark, 9),
    // Shaped debris (petals, feathers, needles, drops) between the dark
    // debris and the hot sparks.
    shard: makeCloud(getShardTexture(), NormalBlending, CAP.shard, 8, { atlas: true }),
  };
  for (const key of Object.keys(clouds)) parent.add(clouds[key].points);

  // One particle. mode: 'spark' | 'chunk' | 'smoke'.
  function emit(mode, x, y, z, opts) {
    const {
      color = PALETTE.bone,
      speed = 1.6,
      up = 2.0,
      size = 0.14,
      grow = 0,
      life = 0.45,
      opacity = 0.9,
      drag = 0,
      gravity = GRAVITY,
      dir = null, // { x, z } biases the spray along an axis
      dirBias = 0,
      tile = 0, // shard cloud: atlas tile (SHARD_TILE)
      spin = 0, // shard cloud: rad/s
      flutter = 0, // shard cloud: sideways sway (u/s) for petals / feathers
      floor = 0.03, // rest height (sparks / debris)
    } = opts;
    const cloud = clouds[mode];
    if (cloud.list.length >= cloud.cap) cloud.list.shift(); // oldest out
    const ang = cosmetic.range(0, Math.PI * 2);
    let ax = Math.cos(ang);
    let az = Math.sin(ang);
    if (dir && dirBias > 0) {
      ax = ax * (1 - dirBias) + dir.x * dirBias;
      az = az * (1 - dirBias) + dir.z * dirBias;
      const l = Math.hypot(ax, az) || 1;
      ax /= l;
      az /= l;
    }
    _c.set(color);
    cloud.list.push({
      x,
      y,
      z,
      vx: ax * speed,
      vz: az * speed,
      vy: up,
      r: _c.r,
      g: _c.g,
      b: _c.b,
      age: 0,
      life,
      size,
      grow,
      opacity,
      drag,
      gravity,
      smoke: mode === 'smoke',
      tile,
      rot: mode === 'shard' ? cosmetic.range(0, Math.PI * 2) : 0,
      spin,
      flutter,
      floor,
    });
  }

  const rnd = (a, b) => cosmetic.range(a, b);

  // --- Event bursts ---------------------------------------------------------

  // §9 #6 kill burst: hot sparks + dark debris + a smoke puff. The debris and
  // smoke are what make a kill read as matter breaking rather than a flashbulb.
  // VFX redesign: `debris` tints the chunks with what the body was made of.
  function kill(x, z, { color = PALETTE.bone, debris = DEBRIS_DARK } = {}) {
    for (let i = 0; i < 10; i++)
      emit('spark', x, START_Y, z, {
        color,
        speed: rnd(1.1, 2.6),
        up: rnd(1.2, 2.8),
        size: rnd(0.09, 0.2),
        life: rnd(0.32, 0.55),
        opacity: 0.9,
      });
    for (let i = 0; i < 8; i++)
      emit('chunk', x, START_Y * 0.8, z, {
        color: debris,
        speed: rnd(1.4, 3.2),
        up: rnd(1.6, 3.4),
        size: rnd(0.07, 0.15),
        life: rnd(0.45, 0.8),
        opacity: 0.95,
      });
    for (let i = 0; i < 4; i++)
      emit('smoke', x, START_Y, z, {
        color: SMOKE_DARK,
        speed: rnd(0.2, 0.7),
        up: rnd(0.5, 1.0),
        size: rnd(0.3, 0.5),
        grow: 0.9,
        life: rnd(0.7, 1.15),
        opacity: 0.42,
        gravity: -0.35, // smoke rises
        drag: 2.2,
      });
  }

  // Every ordinary hit (REFERENCE_BAR check 5: "a single hit reads as an
  // event"). Small, cheap, and biased along the impact direction.
  function hit(x, z, { color = PALETTE.parchment, dir = null, scale = 1, debris = DEBRIS_DARK } = {}) {
    const n = Math.max(2, Math.round(4 * scale));
    for (let i = 0; i < n; i++)
      emit('chunk', x, START_Y * 0.85, z, {
        color: debris,
        speed: rnd(1.0, 2.4) * scale,
        up: rnd(0.9, 2.2),
        size: rnd(0.05, 0.11) * scale,
        life: rnd(0.28, 0.5),
        opacity: 0.9,
        dir,
        dirBias: 0.55,
      });
    for (let i = 0; i < 3; i++)
      emit('spark', x, START_Y, z, {
        color,
        speed: rnd(1.2, 2.8) * scale,
        up: rnd(1.0, 2.4),
        size: rnd(0.06, 0.13) * scale,
        life: rnd(0.2, 0.36),
        opacity: 0.85,
        dir,
        dirBias: 0.5,
      });
    emit('smoke', x, START_Y, z, {
      color: SMOKE_DARK,
      speed: rnd(0.15, 0.5),
      up: rnd(0.4, 0.8),
      size: rnd(0.2, 0.34) * scale,
      grow: 0.8,
      life: rnd(0.4, 0.7),
      opacity: 0.3,
      gravity: -0.3,
      drag: 2.4,
    });
  }

  // Ember motes for a live enemy telegraph / a burning scorch decal: slow,
  // rising, Ember-coloured. `n` per call — callers rate-limit.
  // `tall` raises the column: an enemy telegraph often lands UNDER the party
  // (round 1: "a thin red-orange arc mostly hidden behind the party"), and a
  // 1 u ember column standing over the impact point is the part of the warning
  // that survives a body parked on top of the decal.
  function embers(x, z, { color = PALETTE.emberDanger, n = 2, radius = 0.5, tall = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const r = rnd(0.1, radius);
      emit('spark', x + Math.cos(a) * r, 0.06, z + Math.sin(a) * r, {
        color,
        speed: rnd(0.05, 0.25),
        up: rnd(0.5, 1.1) * tall,
        size: rnd(0.06, 0.14),
        life: rnd(0.5, 0.9) * (tall > 1 ? 1.25 : 1),
        opacity: 0.85,
        gravity: -0.5,
        drag: 1.4,
      });
    }
  }

  // Projectile impact / muzzle spit: a tight directional spray.
  function impact(x, z, { color = PALETTE.parchment, dir = null, n = 5 } = {}) {
    for (let i = 0; i < n; i++)
      emit('spark', x, START_Y, z, {
        color,
        speed: rnd(1.0, 2.2),
        up: rnd(0.6, 1.6),
        size: rnd(0.05, 0.11),
        life: rnd(0.18, 0.32),
        opacity: 0.85,
        dir,
        dirBias: 0.6,
      });
  }

  // Legacy entry point (graybox dummies): a kill burst.
  function burst(x, z, opts = {}) {
    kill(x, z, opts);
  }

  function updateCloud(cloud, dt) {
    const { list, position, color, aSize } = cloud;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) {
        list.splice(i, 1);
        continue;
      }
      if (p.drag > 0) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vz *= d;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;
      if (p.spin) p.rot += p.spin * dt;
      if (p.flutter) p.x += Math.sin(p.age * 7 + p.rot) * p.flutter * dt;
      if (!p.smoke && p.y < p.floor) {
        p.y = p.floor; // debris and sparks rest on the floor while they fade
        p.vy = 0;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
    }
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const k = p.age / p.life;
      const o = p.smoke ? p.opacity * Math.sin(Math.PI * k) : p.opacity * (1 - k);
      position[i * 3] = p.x;
      position[i * 3 + 1] = p.y;
      position[i * 3 + 2] = p.z;
      color[i * 4] = p.r;
      color[i * 4 + 1] = p.g;
      color[i * 4 + 2] = p.b;
      color[i * 4 + 3] = o;
      aSize[i] = p.size * (1 + p.grow * k) * SIZE_SCALE;
      if (cloud.atlas) {
        cloud.aRot[i] = p.rot;
        cloud.aTile[i] = p.tile;
      }
    }
    cloud.geo.setDrawRange(0, list.length);
    if (list.length > 0) {
      cloud.geo.attributes.position.needsUpdate = true;
      cloud.geo.attributes.color.needsUpdate = true;
      cloud.geo.attributes.aSize.needsUpdate = true;
      if (cloud.atlas) {
        cloud.geo.attributes.aRot.needsUpdate = true;
        cloud.geo.attributes.aTile.needsUpdate = true;
      }
    }
  }

  function update(dt) {
    updateCloud(clouds.smoke, dt);
    updateCloud(clouds.chunk, dt);
    updateCloud(clouds.shard, dt);
    updateCloud(clouds.spark, dt);
  }

  const count = () =>
    clouds.spark.list.length + clouds.chunk.list.length + clouds.smoke.list.length + clouds.shard.list.length;

  // VFX redesign: the styled emitter the class / enemy recipes use
  // (render/vfx/signature.js). `n` particles of one family at (x, y, z);
  // every other option is emit()'s, with `[min, max]` pairs rolled per
  // particle from the cosmetic stream.
  const roll = (v) => (Array.isArray(v) ? rnd(v[0], v[1]) : v);
  function spray(mode, x, y, z, n, opts = {}) {
    if (!clouds[mode] || !(n > 0)) return;
    const o = { ...opts };
    for (let i = 0; i < n; i++) {
      for (const k of ROLLED) if (k in opts) o[k] = roll(opts[k]);
      const jx = opts.jitter ? rnd(-opts.jitter, opts.jitter) : 0;
      const jz = opts.jitter ? rnd(-opts.jitter, opts.jitter) : 0;
      emit(mode, x + jx, y, z + jz, o);
    }
  }

  // First-draw warm-up (certification fix D-r3 S1, see render/warmup.js).
  // A cloud with a draw range of 0 is submitted every frame, which links its
  // program at boot — but ANGLE skips a zero-count draw, so the D3D vertex
  // and pixel executables were still compiled on the FIRST real burst of a
  // session. Each cloud is parked in a root that is visible in camp (its own
  // parent is the hidden arena) with one invisible particle written straight
  // into its buffers, so that first burst has already been drawn.
  function prewarm(visibleRoot) {
    for (const key of Object.keys(clouds)) {
      const cloud = clouds[key];
      cloud.position[0] = 0;
      cloud.position[1] = 0;
      cloud.position[2] = 0;
      cloud.color[0] = 0;
      cloud.color[1] = 0;
      cloud.color[2] = 0;
      cloud.color[3] = 0;
      cloud.aSize[0] = 1;
      cloud.geo.attributes.position.needsUpdate = true;
      cloud.geo.attributes.color.needsUpdate = true;
      cloud.geo.attributes.aSize.needsUpdate = true;
      cloud.geo.setDrawRange(0, 1);
      parent.remove(cloud.points);
      warmPark(visibleRoot, cloud.points, (pts) => {
        cloud.geo.setDrawRange(0, cloud.list.length);
        parent.add(pts);
      });
    }
  }

  // CAMPAIGN (PLAN §12.3 resetPresentation): a level transition returns every
  // live particle to the pool — nothing drifts into the next level.
  function clear() {
    let n = 0;
    for (const key of Object.keys(clouds)) {
      const cloud = clouds[key];
      n += cloud.list.length;
      cloud.list.length = 0;
      cloud.geo.setDrawRange(0, 0);
    }
    return n;
  }

  return { burst, kill, hit, embers, impact, spray, update, count, prewarm, clear };
}
