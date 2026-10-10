// THE TIDECALLER's beats (docs/TIDECALLER.md, slice 3): Rill's whole kit in
// water. Deep Cobalt carries the body of every effect, Sea Foam its white
// edge, River Pebble the grit; the three movements are the same as every
// other class (anticipation, a foam-white impact, something wet left
// behind). The class's generic shape recipes in signature.js still play
// under these (her release, nova, swing and placement); this layer adds the
// water: twisting bolts with foam trails and splash crowns, caustic spirals
// in her zones, curling wave walls, a refracting bubble, streaking rain, and
// the Maelstrom's funnel and column.
//
// createTideFx(h) takes the signature director's helpers (its kit, bus,
// spray with the particle budget, flare/shock/after/anticipate, the camera)
// and returns { trail(e), bolt(e, dt), frame(dt) } for its per-frame loop.
import { PALETTE, VFX_SIGNATURE } from '../../data/palette.js';
import { SKILLS } from '../../sim/skills.js';
import { SHARD_TILE } from './particles.js';

const COBALT = VFX_SIGNATURE.tidecaller.glow;
const FOAM = VFX_SIGNATURE.tidecaller.second;
const PEBBLE = VFX_SIGNATURE.tidecaller.debris;
const PARCH = PALETTE.parchment;
const INK = PALETTE.voidCharcoal;
const DEEP = '#1C3F7A'; // the cobalt in shadow (vortex eyes, squall clouds)
const TAU = Math.PI * 2;
const BOLT_Y = 0.55;
const TICK = 1 / 60;
const TIDE_BOLTS = new Set(['riverbolt', 'torrent']);
const SPIRAL_ZONES = new Set(['undertow', 'whirlpool']);

export function createTideFx({ kit, bus, byId, spray, flare, shock, after, anticipate, camfx, N, rnd, mark }) {
  // A drop-shaped spray in her colours (the splash grammar of every beat).
  const drops = (x, y, z, n, o = {}) =>
    spray('shard', x, y, z, n, { color: o.color ?? FOAM, tile: SHARD_TILE.drop, speed: o.speed ?? [0.8, 1.8], up: o.up ?? [1.4, 2.6], size: o.size ?? [0.09, 0.14], life: o.life ?? [0.45, 0.75], gravity: 7, drag: 0.4, spin: [-2, 2], jitter: o.jitter ?? 0.15, dir: o.dir, dirBias: o.dirBias ?? 0 });
  const mist = (x, z, n, o = {}) =>
    spray('smoke', x, o.y ?? 0.2, z, n, { color: o.color ?? FOAM, speed: o.speed ?? [0.2, 0.6], up: o.up ?? [0.1, 0.35], size: o.size ?? [0.32, 0.48], grow: 1.4, life: o.life ?? [0.6, 1.0], opacity: o.opacity ?? 0.22, gravity: -0.1, drag: 2.6, jitter: o.jitter ?? 0.3 });
  const wet = (x, z, radius, o = {}) =>
    kit.mark({ x, z, radius, kind: 'splash', angle: o.angle, stretch: o.stretch ?? 1, stain: o.stain ?? DEEP, glow: COBALT, glowOpacity: o.glowOpacity ?? 0.28, cool: o.cool ?? 0.9, life: o.life ?? 3.4, opacity: o.opacity ?? 0.42, delay: o.delay ?? 0 });
  const ripples = (x, z, n, r1, { delay = 0, life = 0.9, width = 0.05, opacity = 0.55 } = {}) => {
    for (let i = 0; i < n; i++) kit.ring({ x, z, r0: 0.15, r1: r1 * (1 + i * 0.3), width, life, core: FOAM, glow: COBALT, soft: 0.6, y: 0.03, delay: delay + i * 0.16, opacity, gain: 0.6 });
  };
  // The splash crown: a foam ring standing up off the hit, drops thrown in a
  // circle, a cobalt flare with a white core.
  function crown(x, z, { size = 1, dir = null } = {}) {
    kit.flash({ x, y: 0.5, z, color: FOAM, size: 0.45 * size, life: 0.14 });
    flare(x, 0.5, z, COBALT, 0.8 * size, { kind: 'burst', life: 0.2, core: FOAM });
    kit.ring({ x, z, r0: 0.1, r1: 0.55 * size, width: 0.07, life: 0.28, core: FOAM, glow: COBALT, soft: 0.4, y: 0.32, opacity: 0.85 });
    for (let i = 0; i < N(7); i++) {
      const a = (i / 7) * TAU + rnd(-0.2, 0.2);
      drops(x + Math.cos(a) * 0.12, 0.3, z + Math.sin(a) * 0.12, 1, { speed: [0.6 * size, 1.3 * size], up: [1.8, 2.8], dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.85 });
    }
    if (dir) drops(x, 0.45, z, 3, { speed: [1.2, 2.2], up: [0.6, 1.2], dir, dirBias: 0.7 });
    ripples(x, z, 1, 0.5 * size, { life: 0.6 });
    kit.light({ x, z, radius: 0.7 * size, color: COBALT, opacity: 0.35, life: 0.22 });
  }

  // ------------------------------------------------------------ casts --
  const CAST = {
    // A river bolt leaves her paws: a foam ring at the muzzle, a cobalt
    // flare, spray thrown back.
    riverbolt(ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const mx = ev.x + dx * 0.4;
      const mz = ev.z + dz * 0.4;
      kit.ring({ x: mx, z: mz, r0: 0.08, r1: 0.42, width: 0.05, life: 0.18, core: FOAM, glow: COBALT, soft: 0.3, y: BOLT_Y, opacity: 0.85 });
      drops(mx, BOLT_Y, mz, 4, { speed: [0.6, 1.2], up: [0.6, 1.2], dir: { x: dx, z: dz }, dirBias: 0.6 });
    },
    // The Torrent: a muzzle shock ring and a hard white blast, the jet's
    // whole line flashing cobalt as it leaves.
    torrent(ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const ang = Math.atan2(dz, dx);
      const mx = ev.x + dx * 0.45;
      const mz = ev.z + dz * 0.45;
      const reach = SKILLS.torrent.range;
      shock(mx, mz, 0.9, COBALT, { life: 0.22, width: 0.09, core: FOAM, y: BOLT_Y });
      kit.ring({ x: mx, z: mz, r0: 0.6, r1: 0.12, width: 0.06, life: 0.12, core: FOAM, glow: COBALT, soft: 0.3, y: BOLT_Y });
      flare(mx, BOLT_Y, mz, COBALT, 1.3, { kind: 'burst', life: 0.2, core: FOAM, angle: ang });
      kit.streak({ a: { x: mx, y: 0.12, z: mz }, b: { x: ev.x + dx * reach, y: 0.12, z: ev.z + dz * reach }, width: 0.5, tailW: 0.3, core: FOAM, glow: COBALT, life: 0.3, fall: 1.8, opacity: 0.45 });
      drops(mx, BOLT_Y, mz, 10, { speed: [1.6, 3.0], up: [0.4, 1.2], dir: { x: dx, z: dz }, dirBias: 0.85, jitter: 0.1 });
      mist(mx, mz, 2, { y: BOLT_Y, speed: [0.6, 1.4], opacity: 0.25 });
      kit.light({ x: mx, z: mz, radius: 1.1, color: COBALT, opacity: 0.45, life: 0.2 });
      camfx.kick(-dx, -dz, 0.035, 0.1);
    },
    // Breaker: a curling wall of water rises round the otter and breaks
    // outward, foam riding its crest, the floor left dark and wet.
    breaker(ev) {
      waveRing(ev.x, ev.z, ev.radius ?? SKILLS.breaker.area);
    },
    // Crashing Wave: a wave rolls out across the arc, crest curling over in
    // foam, and breaks at its far edge.
    crashing_wave(ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const ang = Math.atan2(dz, dx);
      const reach = ev.reach ?? SKILLS.crashing_wave.range;
      const half = ((ev.halfAngle ?? SKILLS.crashing_wave.area) * Math.PI) / 180;
      anticipate(ev.x + dx * 0.3, ev.z + dz * 0.3, 0.5, COBALT, { core: FOAM, lines: 6 });
      // Four rows of wave rolling out (arcs, so the streak pool stays free):
      // a wide cobalt body low down and a thin foam crest curling over it,
      // rising toward the middle of the roll and breaking at the far edge.
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        const rad = 0.5 + ((reach - 0.5) * (r + 1)) / rows;
        const delay = 0.05 + r * 0.05;
        const hgt = 0.3 + Math.sin(((r + 1) / rows) * Math.PI * 0.8) * 0.6;
        kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: rad, width: 0.36, span: half * 2, sweep: 0.06, life: 0.3, delay, core: COBALT, glow: COBALT, soft: 0.7, lift: 0.1, y: hgt * 0.4, gain: 0.8, opacity: 0.65 });
        kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: rad + 0.08, width: 0.1, span: half * 2, sweep: 0.06, life: 0.26, delay: delay + 0.02, core: FOAM, glow: COBALT, soft: 0.3, lift: 0.18, y: hgt, gain: 1.3, reverse: r % 2 === 1 });
      }
      const far = { x: ev.x + dx * reach, z: ev.z + dz * reach };
      after(0.05 + rows * 0.05, () => {
        flare(far.x, 0.6, far.z, COBALT, 1.6, { kind: 'burst', life: 0.26, core: FOAM, angle: ang });
        for (let i = 0; i < N(14); i++) {
          const a = ang + rnd(-half, half);
          const px = ev.x + Math.cos(a) * reach;
          const pz = ev.z + Math.sin(a) * reach;
          drops(px, 0.6, pz, 1, { speed: [1.0, 2.2], up: [1.6, 3.0], dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.7 });
        }
        mist(far.x, far.z, 4, { speed: [0.6, 1.2], jitter: reach * 0.3, opacity: 0.26 });
        kit.light({ x: far.x, z: far.z, radius: reach * 0.9, color: COBALT, opacity: 0.45, life: 0.35 });
        camfx.kick(dx, dz, 0.05, 0.14);
      });
      wet((ev.x + far.x) / 2, (ev.z + far.z) / 2, reach * 0.75, { angle: ang, stretch: 1.6, delay: 0.2 });
    },
    // Bubble Ward: a bubble swells round its bearer (the held one is drawn
    // every frame below).
    bubble_ward(ev) {
      for (const id of ev.targets || []) {
        const t = byId(id);
        if (!t) continue;
        kit.ring({ x: t.x, z: t.z, r0: 1.1, r1: 0.55, width: 0.06, life: 0.26, core: FOAM, glow: COBALT, soft: 0.3, y: 0.55 });
        kit.streak({ a: { x: ev.x, y: 0.6, z: ev.z }, b: { x: t.x, y: 0.6, z: t.z }, width: 0.05, tailW: 0.1, core: FOAM, glow: COBALT, life: 0.2, fall: 1.4 });
        kit.flash({ x: t.x, y: 0.6, z: t.z, color: FOAM, size: 0.9, life: 0.24, delay: 0.12 });
        for (let i = 0; i < N(6); i++) {
          const a = rnd(0, TAU);
          spray('spark', t.x + Math.cos(a) * 0.5, 0.3, t.z + Math.sin(a) * 0.5, 1, { color: FOAM, speed: [0.05, 0.15], up: [0.4, 0.8], size: [0.05, 0.09], life: [0.6, 1.0], gravity: -0.3, drag: 1.6, opacity: 0.8 });
        }
      }
    },
    // The Maelstrom's draw: a funnel spins up where she cast it, streams of
    // water rush in across the whole draw area, every caught enemy is hauled
    // in on a foam line. The column comes on the burst (its zone's tick).
    maelstrom(ev) {
      const R = ev.drawArea ?? SKILLS.maelstrom.drawArea;
      const cx = ev.zx ?? ev.x;
      const cz = ev.zz ?? ev.z;
      const sec = (ev.delayTicks ?? 60) * TICK;
      funnels.push({ x: cx, z: cz, R, t: 0, life: sec, clock: 0 });
      kit.ring({ x: cx, z: cz, r0: R * 1.1, r1: 0.3, width: 0.12, life: sec * 0.8, core: FOAM, glow: COBALT, soft: 0.5, y: 0.05, opacity: 0.7 });
      for (const id of ev.drawn || []) {
        const t = byId(id);
        if (!t) continue;
        kit.streak({ a: { x: t.x, y: 0.3, z: t.z }, b: { x: cx, y: 0.25, z: cz }, width: 0.08, tailW: 0.04, core: FOAM, glow: COBALT, life: 0.3, fall: 1.4, opacity: 0.85 });
        drops(t.x, 0.3, t.z, 3, { speed: [0.8, 1.4], up: [0.6, 1.0], dir: { x: cx - t.x, z: cz - t.z }, dirBias: 0.8 });
      }
      wet(cx, cz, R * 0.9, { life: 4.5, opacity: 0.38, cool: 1.4 });
      camfx.dolly(cx, cz, 0.06, sec);
    },
  };
  function waveRing(x, z, R) {
    anticipate(x, z, R * 0.5, COBALT, { core: FOAM, lines: 8 });
    after(0.06, () => {
      // The wall: a wide cobalt ring rolling out low, two foam crests riding
      // above it (the higher one a beat late, curling over), and a few spray
      // lines thrown up and out of the break.
      kit.ring({ x, z, r0: R * 0.25, r1: R * 1.05, width: 0.42, life: 0.36, core: COBALT, glow: COBALT, soft: 0.8, y: 0.2, opacity: 0.7, gain: 0.8 });
      kit.ring({ x, z, r0: R * 0.2, r1: R * 1.0, width: 0.12, life: 0.32, core: FOAM, glow: COBALT, soft: 0.3, y: 0.55, delay: 0.02, gain: 1.3 });
      kit.ring({ x, z, r0: R * 0.15, r1: R * 0.85, width: 0.08, life: 0.3, core: FOAM, glow: COBALT, soft: 0.3, y: 0.85, delay: 0.06, opacity: 0.8 });
      for (let i = 0; i < N(8); i++) {
        const a = (i / 8) * TAU + rnd(-0.2, 0.2);
        kit.streak({ a: { x: x + Math.cos(a) * R * 0.7, y: 0.5, z: z + Math.sin(a) * R * 0.7 }, b: { x: x + Math.cos(a) * R * 1.05, y: 0.95, z: z + Math.sin(a) * R * 1.05 }, width: 0.06, tailW: 0.12, core: FOAM, glow: COBALT, life: 0.26, delay: 0.1, fall: 1.6, opacity: 0.85 });
      }
      flare(x, 0.6, z, COBALT, 1.4 + R * 0.4, { kind: 'burst', life: 0.28, core: FOAM });
      shock(x, z, R * 1.2, COBALT, { life: 0.38, width: 0.1, core: FOAM });
      after(0.12, () => {
        for (let i = 0; i < N(16); i++) {
          const a = (i / 16) * TAU + rnd(-0.15, 0.15);
          drops(x + Math.cos(a) * R, 0.6, z + Math.sin(a) * R, 1, { speed: [0.8, 1.8], up: [1.8, 3.0], dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.8 });
        }
        mist(x, z, 4, { jitter: R * 0.7, opacity: 0.25 });
      });
      wet(x, z, R * 1.2, { delay: 0.12 });
      kit.light({ x, z, radius: R * 1.3, color: COBALT, opacity: 0.5, life: 0.38 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.04, 0.12);
    });
  }

  bus.on('ally_cast', (ev) => {
    const fn = CAST[ev.skill];
    if (!fn || ev.x == null) return;
    mark(`tide:${ev.skill}`);
    fn(ev);
  });

  // ------------------------------------------------------------ zones --
  const zoneAt = new Map(); // azone id -> { x, z, r, skill, burst } (a burst zone ends on its tick)
  bus.on('azone_spawn', (ev) => {
    if (ev.classId !== 'tidecaller') return;
    zoneAt.set(ev.id, { x: ev.x, z: ev.z, r: ev.radius ?? 1, skill: ev.skill, burst: !!ev.burst });
    if (zoneAt.size > 64) zoneAt.delete(zoneAt.keys().next().value);
    const { x, z } = ev;
    const r = ev.radius ?? 1;
    if (ev.puddle) {
      // A Deluge puddle (and the Dive's): a little splash, then still water.
      mark(`tide:puddle:${ev.skill}`);
      crown(x, z, { size: 0.7 });
      wet(x, z, r * 1.5, { life: ev.skill === 'deluge' ? 2.4 : 1.4, opacity: 0.36 });
      return;
    }
    if (ev.burst) return; // the Maelstrom: its cast drew the funnel
    mark(`tide:zone:${ev.skill}`);
    if (SPIRAL_ZONES.has(ev.skill)) {
      after(0.06, () => {
        ripples(x, z, 3, r, { life: 1.0 });
        kit.ring({ x, z, r0: r * 1.2, r1: r * 0.2, width: 0.1, life: 0.35, core: FOAM, glow: COBALT, soft: 0.5, y: 0.04 });
        drops(x, 0.2, z, 10, { speed: [0.5, 1.2], up: [1.8, 3.0], jitter: r * 0.6 });
        wet(x, z, r * 1.3, { life: 2 + (SKILLS[ev.skill]?.durationSec ?? 4), opacity: 0.4 });
        if (ev.skill === 'whirlpool') kit.mark({ x, z, radius: r * 0.7, kind: 'splash', stain: INK, glow: COBALT, glowOpacity: 0.35, cool: 1.2, life: 6.2, opacity: 0.5 });
      });
    } else if (ev.skill === 'rain_squall') {
      // The squall rolls in: dark cloud puffs gather over the ring.
      for (let i = 0; i < N(7); i++) {
        const a = rnd(0, TAU);
        const rr = rnd(0, r * 0.8);
        spray('smoke', x + Math.cos(a) * rr, 2.7, z + Math.sin(a) * rr, 1, { color: DEEP, speed: [0.05, 0.2], up: [-0.05, 0.05], size: [0.9, 1.3], grow: 1.3, life: [1.2, 1.8], opacity: 0.4, gravity: 0, drag: 2 });
      }
      kit.light({ x, z, radius: r * 1.4, color: DEEP, opacity: 0.35, life: 0.8, attack: 0.2 });
      ripples(x, z, 2, r * 0.9, { delay: 0.2 });
    } else if (ev.skill === 'ripple_step') {
      ripples(x, z, 3, r * 1.2, { life: 0.9 });
      wet(x, z, r * 1.4, { life: 4, opacity: 0.4 });
    }
  });
  bus.on('azone_tick', (ev) => {
    const at = zoneAt.get(ev.id);
    if (!at) return;
    const { x, z, r } = at;
    if (at.burst) {
      // The Maelstrom bursts: a column of water where the funnel stood.
      zoneAt.delete(ev.id);
      mark('tide:maelstrom:burst');
      kit.pillar({ x, z, radius: r * 0.75, height: 3.4, color: COBALT, life: 0.7, opacity: 0.6 });
      kit.pillar({ x, z, radius: r * 0.32, height: 3.8, color: FOAM, life: 0.55, opacity: 0.7 });
      kit.flash({ x, y: 1.2, z, color: FOAM, size: 1.6, life: 0.24, hold: 0.04 });
      flare(x, 0.8, z, COBALT, 2.6, { kind: 'burst', life: 0.34, core: FOAM, spin: 0.6 });
      shock(x, z, r * 1.5, COBALT, { life: 0.42, width: 0.16, core: FOAM });
      shock(x, z, r * 2.1, FOAM, { life: 0.6, width: 0.1, core: FOAM, delay: 0.06 });
      drops(x, 0.4, z, 30, { speed: [0.8, 2.4], up: [3.0, 5.0], size: [0.1, 0.17], life: [0.7, 1.1], jitter: r * 0.4 });
      mist(x, z, 6, { jitter: r * 0.8, speed: [0.6, 1.4], opacity: 0.3 });
      wet(x, z, r * 1.8, { life: 5, opacity: 0.5 });
      for (const id of ev.hit || []) {
        const t = byId(id);
        if (t) crown(t.x, t.z, { size: 0.8 });
      }
      kit.light({ x, z, radius: r * 2.2, color: COBALT, opacity: 0.6, life: 0.5, attack: 0.02 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.08, 0.18);
      camfx.dolly(x, z, 0.1, 0.3);
      return;
    }
    if (SPIRAL_ZONES.has(at.skill)) {
      ripples(x, z, 1, r * 0.9, { life: 0.5 });
      for (const id of ev.hit || []) {
        const t = byId(id);
        if (t) drops(t.x, 0.25, t.z, 2, { speed: [0.4, 0.9], up: [0.8, 1.4], dir: { x: x - t.x, z: z - t.z }, dirBias: 0.6 });
      }
    } else if (at.skill === 'rain_squall' || at.skill === 'ripple_step') {
      for (const id of ev.hit || []) {
        const t = byId(id);
        if (t) crown(t.x, t.z, { size: 0.5 });
      }
    }
  });
  bus.on('azone_expire', (ev) => {
    if (!zoneAt.has(ev.id)) return;
    const at = zoneAt.get(ev.id);
    zoneAt.delete(ev.id);
    if (SPIRAL_ZONES.has(at.skill)) ripples(at.x, at.z, 2, at.r * 1.1, { life: 0.7, opacity: 0.4 });
  });

  // ------------------------------------------------------- hits and pops --
  bus.on('hit', (ev) => {
    if (!TIDE_BOLTS.has(ev.source)) return;
    const t = byId(ev.target);
    const x = t?.x ?? ev.x;
    const z = t?.z ?? ev.z;
    if (x == null) return;
    mark(`tide:hit:${ev.source}`);
    const dir = Number.isFinite(ev.dirX) ? { x: ev.dirX, z: ev.dirZ } : null;
    crown(x, z, { size: ev.source === 'torrent' ? 1.15 : 0.9, dir });
  });
  bus.on('crash', (ev) => {
    if (!Number.isFinite(ev.x)) return;
    mark('tide:crash');
    // The soak bursts off in a foam ring (the white flash is skillfx's).
    shock(ev.x, ev.z, 0.95, COBALT, { life: 0.3, width: 0.1, core: FOAM, y: 0.3 });
    drops(ev.x, 0.5, ev.z, 6, { speed: [1.0, 2.0], up: [1.4, 2.4] });
    if (ev.stun) {
      // Riptide: a foam star spins over the dazed enemy.
      flare(ev.x, 1.05, ev.z, FOAM, 0.9, { kind: 'star', life: 0.4, core: PARCH, spin: 3 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.25, r1: 0.45, width: 0.05, life: 0.4, core: FOAM, glow: COBALT, soft: 0.3, y: 1.0 });
    }
  });
  bus.on('bubble_burst', (ev) => {
    mark('tide:bubble_burst');
    const { x, z } = ev;
    // The pop: a foam flash, a ring rushing to 1 u, drops in every direction.
    kit.flash({ x, y: 0.6, z, color: FOAM, size: 1.3, life: 0.16 });
    flare(x, 0.6, z, COBALT, 1.2, { kind: 'burst', life: 0.22, core: FOAM });
    kit.ring({ x, z, r0: 0.5, r1: 1.05, width: 0.08, life: 0.3, core: FOAM, glow: COBALT, soft: 0.3, y: 0.55 });
    shock(x, z, 1.1, COBALT, { life: 0.3, width: 0.08, core: FOAM });
    for (let i = 0; i < N(12); i++) {
      const a = (i / 12) * TAU;
      drops(x + Math.cos(a) * 0.45, 0.6, z + Math.sin(a) * 0.45, 1, { speed: [1.2, 2.0], up: [0.6, 1.4], dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.9 });
    }
    for (const id of ev.hit || []) {
      const t = byId(id);
      if (t) kit.flash({ x: t.x, y: 0.5, z: t.z, color: COBALT, size: 0.5, life: 0.2, delay: 0.06 });
    }
    wet(x, z, 1.1, { life: 2.4, opacity: 0.32 });
    const b = bubbles.get(ev.id);
    if (b) {
      if (b.g.owner === ev.id) kit.release(b.g, 0.1);
      bubbles.delete(ev.id);
    }
  });
  // Ripple Step's vault: a spray arc along the leap, a splash where she lands.
  bus.on('ally_dash', (ev) => {
    if (ev.skill !== 'ripple_step') return;
    mark('tide:ripple_step:vault');
    const { x0, z0, x1, z1 } = ev;
    for (let i = 1; i <= 6; i++) {
      const k = i / 7;
      const h = Math.sin(k * Math.PI) * 0.9;
      const px = x0 + (x1 - x0) * k;
      const pz = z0 + (z1 - z0) * k;
      after(k * 0.2, () => {
        kit.flash({ x: px, y: 0.4 + h, z: pz, color: FOAM, size: 0.22, life: 0.18 });
        drops(px, 0.4 + h, pz, 1, { speed: [0.1, 0.3], up: [0, 0.3], life: [0.35, 0.55] });
      });
    }
    after(0.23, () => crown(x1, z1, { size: 0.8 }));
  });
  bus.on('technique_pulse', (ev) => {
    if (ev.node !== 'confluence' && ev.node !== 'ebb') return;
    const a = byId(ev.id) ?? (ev.targets && byId(ev.targets[0]));
    if (!a) return;
    // Her cooldowns run on: a thin foam ring round her and a rising mote.
    kit.ring({ x: a.x, z: a.z, r0: 0.25, r1: 0.6, width: 0.04, life: 0.3, core: FOAM, glow: COBALT, soft: 0.3, y: 0.05, opacity: 0.7 });
    spray('spark', a.x, 0.6, a.z, 2, { color: FOAM, speed: [0.05, 0.15], up: [0.6, 1.0], size: [0.04, 0.07], life: [0.5, 0.8], gravity: -0.3, drag: 1.6 });
  });

  // ------------------------------------------------------------ per frame --
  // Bolt trails: Torrent a thick jet, Riverbolt the class orb plus two foam
  // ribbons twisting round its path.
  function trail(e) {
    if (e.kind !== 'skillbolt' || !TIDE_BOLTS.has(e.skill)) return null;
    if (e.skill === 'torrent') return { y: BOLT_Y, len: 1.8, width: 0.24, core: FOAM, glow: COBALT, tailW: 0.55 };
    return { y: BOLT_Y, len: 1.1, width: 0.13, core: FOAM, glow: COBALT, tailW: 0.4 };
  }
  const twist = new Map(); // bolt id -> { phase, x, z, clock }
  function bolt(e, dt) {
    if (e.kind !== 'skillbolt' || !TIDE_BOLTS.has(e.skill)) return;
    let s = twist.get(e.id);
    if (!s) {
      s = { phase: rnd(0, TAU), x: e.x, z: e.z, clock: 0, seen: 0 };
      twist.set(e.id, s);
    }
    s.seen = frameNo;
    const vx = e.vx ?? 0;
    const vz = e.vz ?? 0;
    const vl = Math.hypot(vx, vz) || 1;
    const px = -vz / vl;
    const pz = vx / vl;
    const torrent = e.skill === 'torrent';
    const amp = torrent ? 0.17 : 0.11;
    s.phase += dt * (torrent ? 30 : 22);
    // Two foam ribbons twisting round the path: motes left at the helix
    // points every frame (the particle layer, so no trail slot is taken).
    for (const k of [0, Math.PI]) {
      const a1 = s.phase + k;
      spray('spark', e.x + px * Math.sin(a1) * amp, BOLT_Y + Math.cos(a1) * amp, e.z + pz * Math.sin(a1) * amp, 1, { color: k ? COBALT : FOAM, speed: [0, 0.05], up: [0, 0.05], size: [0.05, 0.08], life: [0.2, 0.3], gravity: 0, drag: 3, opacity: 0.9 });
    }
    s.clock += dt;
    if (s.clock >= (torrent ? 0.03 : 0.05)) {
      s.clock = 0;
      drops(e.x, BOLT_Y, e.z, 1, { speed: [0.1, 0.4], up: [0.1, 0.5], life: [0.3, 0.5], size: [0.07, 0.11], dir: { x: -vx / vl, z: -vz / vl }, dirBias: 0.4 });
    }
    s.x = e.x;
    s.z = e.z;
  }

  const funnels = []; // live Maelstrom funnels
  const bubbles = new Map(); // bearer id -> { g, clock }
  const zoneClock = new Map(); // azone id -> s since the last swirl
  let frameNo = 0;
  function frame(dt, entities) {
    frameNo++;
    for (const [id, s] of twist) if (s.seen < frameNo - 1) twist.delete(id);
    const seenBubble = new Set();
    for (const e of entities) {
      if (e.kind === 'azone' && e.classId === 'tidecaller') {
        const c = (zoneClock.get(e.id) ?? 0) + dt;
        if (SPIRAL_ZONES.has(e.skill) && c >= (e.skill === 'whirlpool' ? 0.08 : 0.12)) {
          zoneClock.set(e.id, 0);
          spiral(e, e.skill === 'whirlpool');
        } else if (e.skill === 'rain_squall' && c >= 0.045) {
          zoneClock.set(e.id, 0);
          rain(e);
        } else if (e.puddle && c >= 0.5) {
          zoneClock.set(e.id, 0);
          kit.ring({ x: e.x + rnd(-0.2, 0.2), z: e.z + rnd(-0.2, 0.2), r0: 0.05, r1: e.radius * 0.8, width: 0.03, life: 0.6, core: FOAM, glow: COBALT, soft: 0.6, y: 0.03, opacity: 0.4 });
        } else if (e.skill === 'ripple_step' && c >= 0.3) {
          zoneClock.set(e.id, 0);
          kit.ring({ x: e.x, z: e.z, r0: 0.1, r1: e.radius, width: 0.04, life: 0.7, core: FOAM, glow: COBALT, soft: 0.6, y: 0.03, opacity: 0.45 });
        } else zoneClock.set(e.id, c);
      } else if (e.bubble && e.hp > 0) {
        seenBubble.add(e.id);
        let b = bubbles.get(e.id);
        if (!b) {
          b = { g: kit.glow({ x: e.x, y: 0.62, z: e.z, color: COBALT, size: 1.25, opacity: 0.26, owner: e.id, pulse: 1.4 }), clock: 0, phase: rnd(0, TAU) };
          bubbles.set(e.id, b);
        }
        if (b.g.owner === e.id) kit.setGlow(b.g, e.x, 0.62, e.z);
        b.clock += dt;
        b.phase += dt * 2.2;
        if (b.clock >= 0.12) {
          b.clock = 0;
          // The bubble's skin: a thin foam equator, a tilted cobalt band,
          // and a highlight that slides over its top (the refraction).
          kit.ring({ x: e.x, z: e.z, r0: 0.5, r1: 0.52, width: 0.03, life: 0.16, core: FOAM, glow: COBALT, soft: 0.2, y: 0.62, opacity: 0.55 });
          kit.ring({ x: e.x, z: e.z, r0: 0.36, r1: 0.38, width: 0.025, life: 0.16, core: FOAM, glow: COBALT, soft: 0.3, y: 0.98, opacity: 0.4 });
          kit.flash({ x: e.x + Math.cos(b.phase) * 0.22, y: 0.92, z: e.z + Math.sin(b.phase) * 0.22, color: FOAM, size: 0.16, life: 0.16, opacity: 0.8 });
        }
      }
    }
    for (const [id, b] of bubbles) {
      if (seenBubble.has(id)) continue;
      if (b.g.owner === id) kit.release(b.g, 0.12);
      bubbles.delete(id);
    }
    if (zoneClock.size > 64) zoneClock.clear();
    for (let i = funnels.length - 1; i >= 0; i--) {
      const f = funnels[i];
      f.t += dt;
      f.clock += dt;
      if (f.t >= f.life) {
        funnels.splice(i, 1);
        continue;
      }
      if (f.clock < 0.06) continue;
      f.clock = 0;
      f.n = (f.n ?? 0) + 1;
      const k = f.t / f.life; // the funnel tightens and rises as the burst nears
      // Stacked rings narrowing upward (the funnel), each a short life so
      // the stack reads as a spinning column of water ...
      for (let j = 0; j < 3; j++) {
        const y = 0.12 + j * (0.38 + k * 0.3);
        const r = Math.max(0.15, f.R * 0.5 * (1 - j * 0.28) * (1 - k * 0.45));
        kit.ring({ x: f.x, z: f.z, r0: r * 1.15, r1: r, width: 0.06 + (2 - j) * 0.02, life: 0.12, core: j === 1 ? FOAM : COBALT, glow: COBALT, soft: 0.4, y, opacity: 0.75, jag: 0.15 });
      }
      // ... foam motes whirling round it ...
      for (let j = 0; j < 2; j++) {
        const a = f.t * 9 + j * Math.PI;
        const r = f.R * 0.4 * (1 - k * 0.4);
        spray('spark', f.x + Math.cos(a) * r, 0.3 + j * 0.5, f.z + Math.sin(a) * r, 1, { color: FOAM, speed: [0.6, 1.0], up: [0.4, 0.8], size: [0.05, 0.08], life: [0.25, 0.4], gravity: 0, drag: 1.5, dir: { x: -Math.sin(a), z: Math.cos(a) }, dirBias: 0.9 });
      }
      // ... and water streaming in along the floor from the draw's edge.
      if (f.n % 2 === 0) {
        const a = rnd(0, TAU);
        const r0 = f.R * rnd(0.7, 1.0);
        kit.streak({ a: { x: f.x + Math.cos(a) * r0, y: 0.06, z: f.z + Math.sin(a) * r0 }, b: { x: f.x + Math.cos(a + 0.5) * r0 * 0.55, y: 0.06, z: f.z + Math.sin(a + 0.5) * r0 * 0.55 }, width: 0.09, tailW: 0.14, core: FOAM, glow: COBALT, life: 0.28, fall: 1.4, opacity: 0.7 });
      }
      if (k > 0.75) kit.flash({ x: f.x, y: 0.4, z: f.z, color: COBALT, size: 0.6 + k, life: 0.08, opacity: 0.5 });
    }
  }
  // Caustic spirals: short curved streaks running inward round the centre.
  function spiral(e, strong) {
    const r = e.radius ?? 1;
    const n = 1;
    for (let i = 0; i < N(n); i++) {
      const a = rnd(0, TAU);
      const r0 = r * rnd(0.55, 0.95);
      const turn = strong ? 0.9 : 0.6;
      kit.streak({ a: { x: e.x + Math.cos(a) * r0, y: 0.05, z: e.z + Math.sin(a) * r0 }, b: { x: e.x + Math.cos(a + turn) * r0 * 0.62, y: 0.05, z: e.z + Math.sin(a + turn) * r0 * 0.62 }, width: strong ? 0.08 : 0.06, tailW: 0.1, core: FOAM, glow: COBALT, life: 0.4, fall: 1.2, opacity: 0.7 });
    }
    if (strong && rnd(0, 1) < 0.35) {
      const a = rnd(0, TAU);
      drops(e.x + Math.cos(a) * r * 0.9, 0.1, e.z + Math.sin(a) * r * 0.9, 1, { speed: [0.3, 0.6], up: [0.6, 1.0], life: [0.3, 0.5], dir: { x: -Math.sin(a), z: Math.cos(a) }, dirBias: 0.8 });
    }
  }
  // Rain: streaks falling through the ring, a ripple where each lands.
  function rain(e) {
    const r = e.radius ?? 1.5;
    for (let i = 0; i < N(1); i++) {
      const a = rnd(0, TAU);
      const rr = Math.sqrt(rnd(0, 1)) * r * 0.95;
      const px = e.x + Math.cos(a) * rr;
      const pz = e.z + Math.sin(a) * rr;
      kit.streak({ a: { x: px + 0.25, y: 2.6, z: pz }, b: { x: px + 0.2, y: 2.15, z: pz }, width: 0.025, tailW: 0.025, core: FOAM, glow: COBALT, life: 0.26, travel: { x: -0.9, y: -9, z: 0 }, fall: 1.1, opacity: 0.75 });
      after(0.24, () => kit.ring({ x: px, z: pz, r0: 0.03, r1: 0.22, width: 0.025, life: 0.35, core: FOAM, glow: COBALT, soft: 0.5, y: 0.03, opacity: 0.55 }));
    }
  }

  return { trail, bolt, frame };
}
