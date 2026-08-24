// Pooled particle bursts (§9 juice contract #6: kill pop particle burst).
// Additive glow sprites fountain out and fall under gravity; all randomness
// comes from the COSMETIC stream (never the gameplay stream). Render-only:
// driven by events + render dt, touches no sim state.
import { makeGlowSprite } from '../glow.js';
import { PALETTE } from '../../data/palette.js';

// Render scaffold tunables (cosmetic, not brief numbers).
const BURST_COUNT = 12;
const SPEED_MIN = 1.1; // u/s radial
const SPEED_MAX = 2.6;
const UP_MIN = 1.2; // u/s initial vertical
const UP_MAX = 2.8;
const GRAVITY = 8.5; // u/s^2
const LIFE_MIN = 0.32; // s
const LIFE_MAX = 0.55;
const SIZE_MIN = 0.09; // u
const SIZE_MAX = 0.2;
const START_Y = 0.45;
const BASE_OPACITY = 0.9;

export function createParticlePool(parent, cosmetic) {
  const live = [];
  const pool = [];

  function burst(x, z, { color = PALETTE.bone, count = BURST_COUNT } = {}) {
    for (let i = 0; i < count; i++) {
      const s = pool.pop() ?? makeGlowSprite({ color, size: 1, opacity: BASE_OPACITY });
      s.material.color.set(color);
      s.material.opacity = BASE_OPACITY;
      const ang = cosmetic.range(0, Math.PI * 2);
      const sp = cosmetic.range(SPEED_MIN, SPEED_MAX);
      const size = cosmetic.range(SIZE_MIN, SIZE_MAX);
      s.scale.set(size, size, 1);
      s.position.set(x, START_Y, z);
      parent.add(s);
      live.push({
        s,
        x,
        y: START_Y,
        z,
        vx: Math.cos(ang) * sp,
        vz: Math.sin(ang) * sp,
        vy: cosmetic.range(UP_MIN, UP_MAX),
        age: 0,
        life: cosmetic.range(LIFE_MIN, LIFE_MAX),
      });
    }
  }

  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      if (p.age >= p.life) {
        parent.remove(p.s);
        pool.push(p.s);
        live.splice(i, 1);
        continue;
      }
      p.vy -= GRAVITY * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;
      if (p.y < 0.03) p.y = 0.03; // rest on the floor while fading
      p.s.position.set(p.x, p.y, p.z);
      p.s.material.opacity = BASE_OPACITY * (1 - p.age / p.life);
    }
  }

  return { burst, update, count: () => live.length };
}
