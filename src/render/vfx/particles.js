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
//   spark  — additive glow motes (the hot layer; colour per event family)
//   chunk  — normal-blended DARK debris quads that arc, spin and land
//   smoke  — normal-blended dark soft puffs that rise, grow and fade
//
// All randomness comes from the COSMETIC stream (never the gameplay stream).
// Render-only: driven by events + render dt, touches no sim state.
import {
  CanvasTexture,
  Color,
  NormalBlending,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { PALETTE } from '../../data/palette.js';

// Render scaffold tunables (cosmetic, not brief numbers).
const GRAVITY = 8.5; // u/s^2
const START_Y = 0.45;
// Hard live ceiling (§1 density): impacts are frequent, so the pool is capped
// and the OLDEST particle is recycled rather than letting a big wave stack.
const LIVE_CAP = 260;

// --- Debris chunk texture: a hard-edged irregular shard (a chunk of matter,
// not a dot of light). Alpha-only; the material tints it.
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
  ctx.moveTo(S * 0.16, S * 0.3);
  ctx.lineTo(S * 0.74, S * 0.14);
  ctx.lineTo(S * 0.88, S * 0.6);
  ctx.lineTo(S * 0.46, S * 0.9);
  ctx.lineTo(S * 0.12, S * 0.66);
  ctx.closePath();
  ctx.fill();
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  chunkTex = tex;
  return tex;
}

function makeFlatSprite(map, color, opacity) {
  const material = new SpriteMaterial({
    map,
    color: new Color(color),
    blending: NormalBlending,
    transparent: true,
    depthWrite: false,
    opacity,
  });
  return new Sprite(material);
}

// Palette-anchored particle colours (§19.1 — no invented hexes).
const DEBRIS_DARK = new Color(PALETTE.voidCharcoal);
const SMOKE_DARK = new Color(PALETTE.voidCharcoal).lerp(new Color(PALETTE.warmGrey), 0.22);

export function createParticlePool(parent, cosmetic) {
  const live = [];
  const sparkPool = [];
  const chunkPool = [];
  const smokePool = [];

  function poolFor(mode) {
    return mode === 'spark' ? sparkPool : mode === 'chunk' ? chunkPool : smokePool;
  }

  function retire(p) {
    parent.remove(p.s);
    poolFor(p.mode).push(p.s);
  }

  function push(rec) {
    if (live.length >= LIVE_CAP) retire(live.shift());
    live.push(rec);
  }

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
    } = opts;
    const pool = poolFor(mode);
    let s = pool.pop();
    if (!s) {
      s =
        mode === 'spark'
          ? makeGlowSprite({ color, size: 1, opacity })
          : makeFlatSprite(mode === 'chunk' ? getChunkTexture() : getRadialTexture(), color, opacity);
    }
    s.material.color.set(color);
    s.material.opacity = opacity;
    s.material.rotation = cosmetic.range(0, Math.PI * 2);
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    parent.add(s);
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
    push({
      s,
      mode,
      x,
      y,
      z,
      vx: ax * speed,
      vz: az * speed,
      vy: up,
      spin: cosmetic.range(-7, 7),
      age: 0,
      life,
      size,
      grow,
      opacity,
      drag,
      gravity,
    });
  }

  const rnd = (a, b) => cosmetic.range(a, b);

  // --- Event bursts ---------------------------------------------------------

  // §9 #6 kill burst: hot sparks + dark debris + a smoke puff. The debris and
  // smoke are what make a kill read as matter breaking rather than a flashbulb.
  function kill(x, z, { color = PALETTE.bone } = {}) {
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
        color: DEBRIS_DARK,
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
  function hit(x, z, { color = PALETTE.parchment, dir = null, scale = 1 } = {}) {
    const n = Math.max(2, Math.round(4 * scale));
    for (let i = 0; i < n; i++)
      emit('chunk', x, START_Y * 0.85, z, {
        color: DEBRIS_DARK,
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
  function embers(x, z, { color = PALETTE.emberDanger, n = 2, radius = 0.5 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const r = rnd(0.1, radius);
      emit('spark', x + Math.cos(a) * r, 0.06, z + Math.sin(a) * r, {
        color,
        speed: rnd(0.05, 0.25),
        up: rnd(0.5, 1.1),
        size: rnd(0.05, 0.12),
        life: rnd(0.5, 0.9),
        opacity: 0.8,
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

  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      if (p.age >= p.life) {
        retire(p);
        live.splice(i, 1);
        continue;
      }
      const k = p.age / p.life;
      if (p.drag > 0) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vz *= d;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;
      if (p.mode !== 'smoke' && p.y < 0.03) {
        p.y = 0.03; // debris and sparks rest on the floor while they fade
        p.vy = 0;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      p.s.position.set(p.x, p.y, p.z);
      const size = p.size * (1 + p.grow * k);
      p.s.scale.set(size, size, 1);
      if (p.mode === 'chunk') p.s.material.rotation += p.spin * dt;
      // Smoke fades in then out; everything else fades straight out.
      p.s.material.opacity =
        p.mode === 'smoke' ? p.opacity * Math.sin(Math.PI * k) : p.opacity * (1 - k);
    }
  }

  return { burst, kill, hit, embers, impact, update, count: () => live.length };
}
