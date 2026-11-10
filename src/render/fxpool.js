// Pooled sprite motes, glow flashes and expanding ground rings (AUDIT.md D4):
// the one implementation the skill, technique and ally render layers share.
// Each layer makes its own pool on its own root group and keeps its own look
// through the options below; sprites and meshes are reused once a pool is warm.
// Render only; randomness from the COSMETIC stream only.
//
//   const fx = createFxPool({ root, cosmetic, caps, defaults, ringMesh, ringEase, flashFade, moteFloor });
//   fx.motes(x, z, opts)        a few glow sprites drifting up (or down)
//   fx.flash(x, y, z, opts)     one glow sprite that grows and fades
//   fx.ring(x, z, opts)         a flat ring on the ground that widens and fades
//   fx.update(dt)               every frame
//   fx.clear()                  everything back to the pools (a level boundary, a load)
//   fx.counts()                 { motes, flashes, rings } live, plus pooled
import { makeGlowSprite } from './glow.js';

// Ring growth curves over the ring's life t in 0..1.
const EASE = Object.freeze({
  linear: (t) => t,
  quad: (t) => 1 - (1 - t) * (1 - t),
  cubic: (t) => 1 - (1 - t) * (1 - t) * (1 - t),
});

// caps: { motes, flashes, rings } (Infinity when left out). At the mote cap a
// burst stops early; at the flash and ring caps the oldest one is retired.
// ringMesh(width, color, opacity): a new ring Mesh lying on the ground, its
// outer edge at radius 1 (the pool scales it); rings are pooled per width.
// ringEase: 'linear' | 'quad' | 'cubic'. flashFade: 1 (linear) or 2 (square).
// moteFloor: a mote that sinks below this y is retired early (null: never).
// defaults: { motes, flash, ring } option objects, the layer's own look; a
// call's options win over them.
export function createFxPool({ root, cosmetic, caps = {}, defaults = {}, ringMesh = null, ringEase = 'quad', flashFade = 1, moteFloor = null }) {
  const MOTE_CAP = caps.motes ?? Infinity;
  const FLASH_CAP = caps.flashes ?? Infinity;
  const RING_CAP = caps.rings ?? Infinity;
  const ease = EASE[ringEase] ?? EASE.quad;
  const rnd = (a, b) => cosmetic.range(a, b);

  const motes = [];
  const motePool = [];
  const flashes = [];
  const flashPool = [];
  const rings = [];
  const ringPool = new Map(); // width -> [mesh]

  // opts: color, count, y, yJitter (extra random height), spread (radius of
  // the burst), size [min, max], life [min, max] s, vy [min, max] u/s (fall:
  // downwards), drift (± u/s sideways) or out (u/s radial from the centre) or
  // dir ({ x, z } u/s, every mote the same), gravity (u/s²), drag (1/s).
  function spawnMotes(x, z, opts) {
    const { color, count = 6, y = 0.3, yJitter = 0, spread = 0.3, size = [0.06, 0.14], life = [0.4, 0.8], vy = [0.5, 1.2], fall = false, drift = 0.15, out = 0, dir = null, gravity = 0, drag = 0 } = { ...defaults.motes, ...opts };
    for (let i = 0; i < count; i++) {
      if (motes.length >= MOTE_CAP) break;
      const s = motePool.pop() ?? makeGlowSprite({ color, size: 1, opacity: 0.9 });
      s.material.color.set(color);
      s.material.opacity = 0.9;
      const sz = size[0] === size[1] ? size[0] : rnd(size[0], size[1]);
      s.scale.set(sz, sz, 1);
      const a = rnd(0, Math.PI * 2);
      const r = rnd(0, spread);
      s.position.set(x + Math.cos(a) * r, y + (yJitter ? rnd(0, yJitter) : 0), z + Math.sin(a) * r);
      root.add(s);
      const up = rnd(vy[0], vy[1]);
      let vx;
      let vz;
      if (dir) {
        vx = dir.x;
        vz = dir.z;
      } else if (out) {
        vx = Math.cos(a) * rnd(0, out);
        vz = Math.sin(a) * rnd(0, out);
      } else {
        vx = rnd(-drift, drift);
        vz = rnd(-drift, drift);
      }
      motes.push({ s, age: 0, life: rnd(life[0], life[1]), vx, vy: fall ? -up : up, vz, gravity, drag });
    }
  }

  // opts: color, size, opacity, life, grow (size gain over the life).
  function spawnFlash(x, y, z, opts) {
    const { color, size = 0.5, opacity = 0.9, life = 0.3, grow = 0.4 } = { ...defaults.flash, ...opts };
    if (flashes.length >= FLASH_CAP) retire(flashes, flashPool, 0);
    const s = flashPool.pop() ?? makeGlowSprite({ color, size: 1, opacity });
    s.material.color.set(color);
    s.material.opacity = opacity;
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    root.add(s);
    flashes.push({ s, age: 0, life, size, grow, opacity });
  }

  // opts: color, from and to (radius, u), life, opacity, width (ring band as a
  // share of the radius), hold (share of the life at full opacity), y.
  function spawnRing(x, z, opts) {
    const { color, from = 0.3, to = 1.4, life = 0.4, opacity = 0.8, width = 0.14, hold = 0, y = 0.03 } = { ...defaults.ring, ...opts };
    if (!ringMesh) return;
    if (rings.length >= RING_CAP) retireRing(rings.length - 1);
    const list = ringPool.get(width);
    const m = (list && list.pop()) || ringMesh(width, color, opacity);
    m.material.color.set(color);
    m.material.opacity = opacity;
    m.position.set(x, y, z);
    m.scale.set(from, from, 1);
    root.add(m);
    rings.push({ s: m, width, age: 0, life, from, to, opacity, hold });
  }

  function retire(list, pool, i) {
    const rec = list[i];
    root.remove(rec.s);
    pool.push(rec.s);
    list.splice(i, 1);
  }
  function retireRing(i) {
    const rec = rings[i];
    root.remove(rec.s);
    let list = ringPool.get(rec.width);
    if (!list) ringPool.set(rec.width, (list = []));
    list.push(rec.s);
    rings.splice(i, 1);
  }

  function update(dt) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      const k = m.age / m.life;
      if (k >= 1 || (moteFloor !== null && m.s.position.y < moteFloor)) {
        retire(motes, motePool, i);
        continue;
      }
      m.s.position.x += m.vx * dt;
      m.s.position.y += m.vy * dt;
      m.s.position.z += m.vz * dt;
      if (m.gravity) m.vy -= m.gravity * dt;
      if (m.drag) {
        m.vx *= 1 - m.drag * dt;
        m.vz *= 1 - m.drag * dt;
      }
      m.s.material.opacity = 0.9 * (1 - k);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      const k = f.age / f.life;
      if (k >= 1) {
        retire(flashes, flashPool, i);
        continue;
      }
      const sz = f.size * (1 + f.grow * k);
      f.s.scale.set(sz, sz, 1);
      f.s.material.opacity = f.opacity * (1 - (flashFade === 2 ? k * k : k));
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      const k = r.age / r.life;
      if (k >= 1) {
        retireRing(i);
        continue;
      }
      const s = r.from + (r.to - r.from) * ease(k);
      r.s.scale.set(s, s, 1);
      r.s.material.opacity = r.opacity * (k <= r.hold ? 1 : 1 - (k - r.hold) / (1 - r.hold));
    }
  }

  function clear() {
    while (motes.length) retire(motes, motePool, motes.length - 1);
    while (flashes.length) retire(flashes, flashPool, flashes.length - 1);
    while (rings.length) retireRing(rings.length - 1);
  }

  const counts = () => ({
    motes: motes.length,
    flashes: flashes.length,
    rings: rings.length,
    pooled: { motes: motePool.length, flashes: flashPool.length, rings: [...ringPool.values()].reduce((n, l) => n + l.length, 0) },
  });

  return { motes: spawnMotes, flash: spawnFlash, ring: spawnRing, update, clear, counts };
}
