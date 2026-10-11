// TONICS AND BOMBS beats (docs/CONSUMABLES.md, content plan 4 slice 1). Each
// kind has its own colour, clear of the reserved hues (Ember is the enemy's
// threat, Violet the gods'): Bright Heal for the Mending Tonic (it heals),
// a quicksilver lime for the Haste Draught, a ward silver-blue for the Ward
// Flask, Hearth Amber flame for the Fire Bomb (party fire, never Ember), a
// glacier cyan for the Frost Bomb and Pale Gold for the Bell Charm. Every
// beat keeps the director's three movements: anticipation (energy drawn in),
// impact (white-hot core, flare, flash, light, shock ring, camera punch) and
// dissipation (embers, smoke or frost left behind, a ground mark cooling).
//
//   tonic_drop   a loot beam lands where an elite fell, in the item's colour
//   tonic_gain   the item flies into the hero who took it (or a chest's pay)
//   tonic_use    the drink: the flask is uncorked over the hero, then its
//                effect rises (green bloom / lime wind spiral / blue dome);
//                the bomb: a lit fuse leaves the hand; the charm: a bell toll
//                rings out, and every enemy shot it caught bursts in gold
//   tonic_burst  the bomb lands: the Fire Bomb's amber fireball and scorch,
//                the Frost Bomb's ice nova, shards and rime
//   tonic_fire   the patch burns: flames lick up off it until it goes out
//
// createTonicFx(h) takes the signature director's helpers and returns
// { frame(dt, entities) } for its per-frame loop (bomb trails, fire licks).
import { PALETTE, TONIC_COLORS } from '../../data/palette.js';
import { SHARD_TILE } from './particles.js';

export const TONIC_FX = TONIC_COLORS;
const INK = PALETTE.voidCharcoal;
const TAU = Math.PI * 2;

export function createTonicFx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, N, rnd, mark }) {
  const fx = (id) => TONIC_FX[id] ?? TONIC_FX.mend_tonic;

  // ------------------------------------------------------------ floor --
  bus.on('tonic_drop', (ev) => {
    mark('tonic_drop');
    const c = fx(ev.item);
    const { x, z } = ev;
    anticipate(x, z, 1.0, c.glow, { y: 0.35, lines: 6, core: c.core });
    after(0.06, () => {
      kit.pillar({ x, z, radius: 0.45, height: 5, color: c.glow, life: 1.2, opacity: 0.45 });
      kit.pillar({ x, z, radius: 0.12, height: 6, color: c.core, life: 0.9, opacity: 0.85 });
      flare(x, 0.8, z, c.glow, 1.3, { kind: 'burst', life: 0.26, core: c.core });
      kit.flash({ x, y: 0.8, z, color: c.glow, size: 1.2, life: 0.35, hold: 0.06 });
      kit.light({ x, z, radius: 2.6, color: c.glow, opacity: 0.5, life: 0.9, attack: 0.03 });
      shock(x, z, 1.8, c.glow, { life: 0.42, width: 0.1, core: c.core });
      spray('spark', x, 0.3, z, 14, { color: c.glow, speed: [0.05, 0.35], up: [1.6, 3.0], size: [0.04, 0.08], life: [0.7, 1.2], gravity: -0.1, drag: 0.9, jitter: 0.3, opacity: 0.9 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.05, 0.1);
    });
  });
  bus.on('tonic_gain', (ev) => {
    mark('tonic_gain');
    const c = fx(ev.item);
    const to = byId(ev.to ?? ev.by);
    if (ev.x === undefined || !to) return;
    const { x, z } = ev;
    const tx = to.x;
    const tz = to.z;
    flare(x, 0.9, z, c.glow, 1.0, { kind: 'star', life: 0.2, core: c.core });
    for (let i = 0; i < 2; i++) {
      const lift = 0.9 + i * 0.2;
      kit.streak({ a: { x, y: lift, z }, b: { x: (x + tx) / 2, y: lift + 0.7, z: (z + tz) / 2 }, width: 0.06, tailW: 0, core: c.core, glow: c.glow, life: 0.18, delay: i * 0.03, fall: 1.0 });
      kit.streak({ a: { x: (x + tx) / 2, y: lift + 0.7, z: (z + tz) / 2 }, b: { x: tx, y: 1.1, z: tz }, width: 0.06, tailW: 0, core: c.core, glow: c.glow, life: 0.18, delay: 0.08 + i * 0.03, fall: 1.0 });
    }
    after(0.18, () => {
      kit.ring({ x: tx, z: tz, r0: 0.25, r1: 1.3, width: 0.1, life: 0.5, core: c.core, glow: c.glow, soft: 0.5, y: 0.06 });
      kit.flash({ x: tx, y: 1.2, z: tz, color: c.glow, size: 0.8, life: 0.32, hold: 0.06 });
      embersUp(tx, tz, c.glow, 8, { radius: 0.35 });
    });
  });

  // ------------------------------------------------------------- uses --
  // The uncorking over the drinker: a pop of glass-light, a spiral of motes
  // drawn into the body, then the effect's own bloom.
  function uncork(b, c) {
    const y = 1.35;
    kit.flash({ x: b.x, y, z: b.z, color: c.core, size: 0.5, life: 0.12 });
    flare(b.x, y, b.z, c.glow, 0.9, { kind: 'star', life: 0.18, core: c.core });
    for (let i = 0; i < N(8); i++) {
      const a = (i / 8) * TAU;
      const r = 1.1;
      kit.streak({ a: { x: b.x + Math.cos(a) * r, y: 0.4 + (i % 3) * 0.3, z: b.z + Math.sin(a) * r }, b: { x: b.x + Math.cos(a + 0.6) * 0.3, y: 1.0, z: b.z + Math.sin(a + 0.6) * 0.3 }, width: 0.05, tailW: 0, core: c.core, glow: c.glow, life: 0.22, delay: i * 0.012, fall: 1.2 });
    }
  }
  const DRINK = {
    mend_tonic(b, c) {
      after(0.12, () => {
        kit.pillar({ x: b.x, z: b.z, radius: 0.55, height: 3.2, color: c.glow, life: 0.8, opacity: 0.45 });
        kit.ring({ x: b.x, z: b.z, r0: 0.2, r1: 1.6, width: 0.14, life: 0.6, core: c.core, glow: c.glow, soft: 0.5, y: 0.06 });
        kit.light({ x: b.x, z: b.z, radius: 2.4, color: c.glow, opacity: 0.55, life: 0.8, attack: 0.04 });
        kit.flash({ x: b.x, y: 1.0, z: b.z, color: c.glow, size: 1.6, life: 0.4, hold: 0.08 });
        // Leaves of light spiral up off the hero.
        for (let i = 0; i < N(16); i++) {
          const a = (i / 16) * TAU;
          spray('shard', b.x + Math.cos(a) * 0.5, 0.2, b.z + Math.sin(a) * 0.5, 1, { color: i % 3 ? c.glow : c.core, tile: SHARD_TILE.feather, speed: [0.1, 0.3], up: [1.4, 2.4], size: [0.1, 0.15], life: [0.8, 1.2], gravity: -0.4, drag: 1.4, spin: [-3, 3], flutter: 0.6 });
        }
        embersUp(b.x, b.z, c.glow, 12, { radius: 0.5 });
      });
    },
    haste_draught(b, c) {
      after(0.1, () => {
        // Wind wraps the hero: three tilted rings sweep round and up.
        for (let i = 0; i < 3; i++) kit.slash({ x: b.x, z: b.z, angle: rnd(0, TAU), radius: 0.7 + i * 0.12, width: 0.08, span: 4.2, sweep: 0.08, life: 0.38, delay: i * 0.07, core: c.core, glow: c.glow, soft: 0.3, lift: 0.5, y: 0.25 + i * 0.35, gain: 1.2 });
        shock(b.x, b.z, 2.0, c.glow, { life: 0.35, width: 0.09, core: c.core });
        kit.flash({ x: b.x, y: 1.0, z: b.z, color: c.glow, size: 1.3, life: 0.32 });
        kit.light({ x: b.x, z: b.z, radius: 2.0, color: c.glow, opacity: 0.45, life: 0.6 });
        for (let i = 0; i < N(10); i++) {
          const a = rnd(0, TAU);
          kit.streak({ a: { x: b.x + Math.cos(a) * 0.3, y: 0.3, z: b.z + Math.sin(a) * 0.3 }, b: { x: b.x + Math.cos(a) * 1.6, y: 0.4, z: b.z + Math.sin(a) * 1.6 }, width: 0.04, tailW: 0, core: c.core, glow: c.glow, life: 0.22, delay: rnd(0, 0.1), fall: 1.5 });
        }
        camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.04, 0.08);
      });
    },
    ward_flask(b, c) {
      after(0.1, () => {
        // A dome of silver-blue rises round the hero: stacked rings climbing
        // and narrowing, a bright rim, shards of light sliding over it.
        for (let i = 0; i < 5; i++) {
          const h = i / 4;
          kit.ring({ x: b.x, z: b.z, r0: 0.3, r1: 1.15 * Math.cos(h * 1.2), width: 0.07, life: 0.55, core: c.core, glow: c.glow, soft: 0.4, y: 0.1 + h * 1.2, delay: i * 0.04, opacity: 0.85 - h * 0.3 });
        }
        flare(b.x, 1.3, b.z, c.glow, 1.5, { kind: 'burst', life: 0.28, core: c.core });
        kit.light({ x: b.x, z: b.z, radius: 2.2, color: c.glow, opacity: 0.5, life: 0.7 });
        kit.mark({ x: b.x, z: b.z, radius: 1.2, kind: 'sigil', stain: INK, glow: c.glow, cool: 1.0, life: 2.0, opacity: 0.25 });
        spray('shard', b.x, 0.8, b.z, 10, { color: c.glow, tile: SHARD_TILE.drop, speed: [0.6, 1.2], up: [0.6, 1.4], size: [0.07, 0.12], life: [0.5, 0.8], gravity: 3, drag: 0.8, jitter: 0.3 });
      });
    },
  };

  bus.on('tonic_use', (ev) => {
    mark(`tonic_use:${ev.item}`);
    const c = fx(ev.item);
    const b = byId(ev.by) ?? { x: ev.x, z: ev.z };
    if (DRINK[ev.item]) {
      uncork(b, c);
      DRINK[ev.item](b, c);
      return;
    }
    if (ev.item === 'bell_charm') {
      const R = ev.radius ?? 8;
      // The toll: a gold bell-flare over the ringer, then three rings of
      // sound running out to the charm's reach; each shot it caught bursts.
      flare(b.x, 1.6, b.z, c.glow, 1.8, { kind: 'burst', life: 0.3, core: c.core });
      kit.flash({ x: b.x, y: 1.4, z: b.z, color: c.core, size: 1.4, life: 0.25, hold: 0.06 });
      for (let i = 0; i < 3; i++) kit.ring({ x: b.x, z: b.z, r0: 0.4, r1: R * (0.7 + i * 0.15), width: 0.16 - i * 0.03, life: 0.6 + i * 0.12, core: c.core, glow: c.glow, soft: 0.5, y: 0.5 - i * 0.12, delay: i * 0.1, opacity: 0.85 - i * 0.2 });
      kit.light({ x: b.x, z: b.z, radius: R * 0.6, color: c.glow, opacity: 0.5, life: 0.8, attack: 0.02 });
      kit.mark({ x: b.x, z: b.z, radius: 1.6, kind: 'sigil', stain: INK, glow: c.glow, cool: 1.4, life: 2.6, opacity: 0.3 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.08, 0.14);
      // Warded heroes take a silver-gold ring at their feet.
      for (const id of ev.warded ?? []) {
        const h = byId(id);
        if (h) kit.ring({ x: h.x, z: h.z, r0: 0.2, r1: 0.9, width: 0.07, life: 0.5, core: c.core, glow: c.glow, soft: 0.4, y: 0.06, delay: 0.12 });
      }
      return;
    }
    // A bomb leaves the hand: a spark at the fuse and a short muzzle puff.
    const hx = b.x + ((ev.toX ?? b.x) - b.x) * 0.08;
    const hz = b.z + ((ev.toZ ?? b.z) - b.z) * 0.08;
    flare(hx, 1.1, hz, c.glow, 0.7, { kind: 'star', life: 0.16, core: c.core });
    spray('spark', hx, 1.1, hz, 6, { color: c.glow, speed: [0.3, 0.8], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 2, drag: 1 });
    // A ground ring where it will land (the throw reads before it bursts).
    if (ev.toX !== undefined) kit.ring({ x: ev.toX, z: ev.toZ, r0: 1.6, r1: 0.4, width: 0.06, life: 0.4, core: c.core, glow: c.glow, soft: 0.4, y: 0.05, opacity: 0.6 });
  });
  // A charm-shattered shot: a gold pop where it hung in the air.
  bus.on('eshot_despawn', (ev) => {
    if (ev.cause !== 'charm' || ev.x === undefined) return;
    const c = fx('bell_charm');
    after(rnd(0.05, 0.18), () => {
      flare(ev.x, 0.55, ev.z, c.glow, 0.6, { kind: 'star', life: 0.16, core: c.core });
      spray('spark', ev.x, 0.55, ev.z, 4, { color: c.glow, speed: [0.4, 1.0], up: [0.3, 0.8], size: [0.03, 0.06], life: [0.3, 0.5], gravity: 1.5, drag: 1 });
    });
  });
  bus.on('eglob_despawn', (ev) => {
    if (ev.cause !== 'charm' || ev.x === undefined) return;
    const c = fx('bell_charm');
    flare(ev.x, 0.4, ev.z, c.glow, 0.8, { kind: 'burst', life: 0.18, core: c.core });
  });

  // ------------------------------------------------------------ bursts --
  bus.on('tonic_burst', (ev) => {
    mark(`tonic_burst:${ev.item}`);
    const c = fx(ev.item);
    const { x, z } = ev;
    const R = ev.radius ?? 2.4;
    if (ev.item === 'fire_bomb') {
      // A white-hot core, an amber fireball rolling up, a shock ring at the
      // radius, burning debris thrown out, black smoke, a scorched floor.
      kit.flash({ x, y: 0.7, z, color: c.core, size: R * 1.1, life: 0.2, hold: 0.04 });
      flare(x, 0.8, z, c.glow, R * 1.2, { kind: 'burst', life: 0.32, core: c.core });
      shock(x, z, R * 1.1, c.glow, { life: 0.4, width: 0.18, core: c.core, jag: 0.25 });
      kit.ring({ x, z, r0: 0.3, r1: R * 0.8, width: 0.3, life: 0.3, core: c.core, glow: c.deep, soft: 0.6, y: 0.4, delay: 0.03 });
      kit.light({ x, z, radius: R * 2.0, color: c.glow, opacity: 0.8, life: 0.7, attack: 0.02 });
      kit.pillar({ x, z, radius: R * 0.35, height: 3, color: c.glow, life: 0.45, opacity: 0.55 });
      spray('spark', x, 0.4, z, 30, { color: c.glow, speed: [1.2, 3.2], up: [1.0, 3.0], size: [0.05, 0.1], life: [0.5, 1.0], gravity: 4, drag: 0.6, jitter: 0.3 });
      spray('chunk', x, 0.3, z, 10, { color: c.deep, speed: [1.0, 2.4], up: [1.2, 2.4], size: [0.06, 0.12], life: [0.6, 0.9], gravity: 7, drag: 0.4 });
      spray('smoke', x, 0.5, z, 10, { color: INK, speed: [0.3, 0.8], up: [0.5, 1.0], size: [0.6, 0.9], grow: 1.6, life: [1.0, 1.6], opacity: 0.35, gravity: -0.3, drag: 1.8, jitter: R * 0.4 });
      kit.mark({ x, z, radius: R * 1.1, kind: 'scorch', stain: INK, glow: c.glow, cool: 2.6, life: 5.0, opacity: 0.6 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.22, 0.2);
    } else {
      // The Frost Bomb: an ice nova (a hard white ring, a cyan bloom), shards
      // and snow thrown up, a rime mark, and frost crystals on every foe hit.
      kit.flash({ x, y: 0.6, z, color: c.core, size: R * 1.0, life: 0.2, hold: 0.05 });
      flare(x, 0.7, z, c.glow, R * 1.1, { kind: 'star', life: 0.3, core: c.core });
      shock(x, z, R * 1.15, c.glow, { life: 0.45, width: 0.2, core: c.core, jag: 0.4 });
      kit.ring({ x, z, r0: R * 1.1, r1: R * 0.3, width: 0.08, life: 0.5, core: c.core, glow: c.glow, soft: 0.3, y: 0.08, delay: 0.12, opacity: 0.6 });
      kit.light({ x, z, radius: R * 1.8, color: c.glow, opacity: 0.7, life: 0.8, attack: 0.02 });
      kit.crack({ x, z, radius: R * 0.9, glow: c.glow, life: 1.6, cool: 0.5 });
      for (let i = 0; i < N(12); i++) {
        const a = (i / 12) * TAU + rnd(-0.2, 0.2);
        spray('shard', x, 0.3, z, 1, { color: i % 2 ? c.glow : c.core, tile: SHARD_TILE.drop, speed: [1.6, 3.0], up: [1.0, 2.0], size: [0.1, 0.16], life: [0.5, 0.8], gravity: 6, drag: 0.4, spin: [-6, 6], dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.9 });
      }
      spray('smoke', x, 0.2, z, 8, { color: c.core, speed: [0.4, 1.0], up: [0.1, 0.3], size: [0.5, 0.8], grow: 1.5, life: [0.8, 1.3], opacity: 0.3, gravity: -0.05, drag: 2.4, jitter: R * 0.4 });
      kit.mark({ x, z, radius: R * 1.1, kind: 'splash', stain: c.deep, glow: c.glow, glowOpacity: 0.5, cool: 3.0, life: 5.0, opacity: 0.45 });
      for (const id of ev.hit ?? []) {
        const t = byId(id);
        if (!t) continue;
        kit.star({ x: t.x, y: 0.7, z: t.z, color: c.glow, size: 0.9, life: 0.4, kind: 'star', angle: rnd(0, Math.PI) });
        spray('shard', t.x, 0.6, t.z, 3, { color: c.core, tile: SHARD_TILE.drop, speed: [0.3, 0.8], up: [0.5, 1.0], size: [0.06, 0.1], life: [0.5, 0.8], gravity: 5, drag: 0.6 });
      }
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.16, 0.18);
    }
  });
  bus.on('tonic_fire', (ev) => {
    const c = fx('fire_bomb');
    kit.mark({ x: ev.x, z: ev.z, radius: (ev.radius ?? 2.1) * 1.05, kind: 'scorch', stain: INK, glow: c.glow, glowOpacity: 0.95, cool: 3.4, life: 4.4, opacity: 0.5 });
  });

  // ------------------------------------------------------- per frame --
  // A bomb in the air trails fire or frost; a burning patch licks flames up.
  const clocks = new Map();
  function frame(dt, entities) {
    for (const e of entities) {
      if (e.kind !== 'tonic_bomb' && e.kind !== 'tonic_fire') continue;
      const c = fx(e.item);
      const t = (clocks.get(e.id) ?? 0) + dt;
      const every = e.kind === 'tonic_bomb' ? 0.03 : 0.07;
      if (t < every) {
        clocks.set(e.id, t);
        continue;
      }
      clocks.set(e.id, 0);
      if (e.kind === 'tonic_bomb') {
        spray('spark', e.x, 1.1, e.z, 2, { color: c.glow, speed: [0.05, 0.3], up: [0.1, 0.5], size: [0.04, 0.07], life: [0.25, 0.45], gravity: 1, drag: 1.5, opacity: 0.95 });
        if (e.item === 'fire_bomb') spray('smoke', e.x, 1.1, e.z, 1, { color: INK, speed: [0.05, 0.15], up: [0.2, 0.4], size: [0.18, 0.26], grow: 1.3, life: [0.4, 0.6], opacity: 0.25, drag: 2 });
      } else {
        const r = e.radius ?? 2.1;
        const a = rnd(0, TAU);
        const d = Math.sqrt(rnd(0, 1)) * r * 0.9;
        const fx0 = e.x + Math.cos(a) * d;
        const fz0 = e.z + Math.sin(a) * d;
        spray('spark', fx0, 0.1, fz0, 3, { color: c.glow, speed: [0.05, 0.2], up: [1.0, 2.0], size: [0.06, 0.11], life: [0.35, 0.6], gravity: -0.6, drag: 1.4, opacity: 0.95 });
        kit.flash({ x: fx0, y: 0.35, z: fz0, color: c.glow, size: 0.7, life: 0.22, opacity: 0.7 });
        if (Math.random() < 0.3) spray('smoke', fx0, 0.6, fz0, 1, { color: INK, speed: [0.05, 0.2], up: [0.5, 0.9], size: [0.4, 0.6], grow: 1.5, life: [0.8, 1.2], opacity: 0.22, gravity: -0.2, drag: 1.8 });
        if (Math.random() < 0.2) kit.light({ x: e.x, z: e.z, radius: r * 1.4, color: c.glow, opacity: 0.35, life: 0.3 });
      }
    }
    if (clocks.size > 32) {
      const live = new Set();
      for (const e of entities) live.add(e.id);
      for (const id of clocks.keys()) if (!live.has(id)) clocks.delete(id);
    }
  }
  return { frame };
}
