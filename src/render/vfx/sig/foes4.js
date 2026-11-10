// THE SPIRE AND KILN FOE LOOKS (docs/ACT_V.md, docs/KILN.md): the Still
// Spire's and the Ember Kiln's creatures, their attacks and deaths.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxMatterColor } from '../../../data/vfx.js';
import { BONE, EMBER, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';
import { TELL_INDIGO_GLOW } from '../../enemies/style.js';

export function createSigFoes4(ctx) {
  const { SF, ANTICIP, CREATURE_DEATH, N, after, bus, faceOf, kit, mark, rnd, spray, unit2, world } = ctx;

  // ------------------------------------------ Act V, the Still Spire --
  // (docs/ACT_V.md) The Spire's four in the same three movements: a gather
  // or a snap of wind before, a white-hot landing frame with the Ember edge
  // ONLY on what hurts (the dive's lane, the toll's ring, the wake and slam
  // rings, the swing's lane), then what is left: cloth, bronze motes, stone
  // dust, rope fibre. The body's own matter on what breaks, the indigo where
  // the corruption leaves, no camera on rank-and-file enemies.
  const KCLOTH = vfxMatterColor('kitecloth');
  const BRONZE = vfxMatterColor('bellbronze');
  const SSTONE = vfxMatterColor('spirestone');
  const HEMP = vfxMatterColor('hemp');
  const GUST = vfxMatterColor('gust');
  const KITE_Y = 1.7;
  const BELL_Y = 0.85; // the Chime's bell, lifted for the toll

  // Gust Kite — "the drop". The snap of the folded sails (a white gust flash
  // and lines drawn in), then a pale wind streak laid down the lane as it
  // falls, a white-hot head riding the kite, an Ember edge over the lane's
  // full width for the length of the drop (the hit), torn sailcloth shed
  // along the way and wind-scoured gouges where it passed low.
  bus.on('kite_dive', (ev) => {
    mark('kite_dive');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = Math.max(0.5, ev.length ?? 5);
    const ang = Math.atan2(d.z, d.x);
    const SPEED = 12;
    const sweep = len / SPEED;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const nx = -d.z;
    const nz = d.x;
    SF.anticipate(ev.x, ev.z, 0.55, GUST, { y: KITE_Y, lines: 5 });
    kit.flash({ x: ev.x, y: KITE_Y, z: ev.z, color: GUST, size: 0.7, life: 0.16 });
    // The Ember edge: the lane's width, live for the drop.
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ex, y: 0.1, z: ez }, width: 0.8, tailW: 0.7, core: EMBER, glow: EMBER, life: sweep + 0.16, fall: 2.0, opacity: 0.42 });
    // The wind streak: aloft down to the lane's end, with two thin side
    // lines riding beside it.
    kit.streak({ a: { x: ev.x, y: KITE_Y, z: ev.z }, b: { x: ex, y: 0.3, z: ez }, width: 0.24, tailW: 0.06, core: PARCH, glow: GUST, life: sweep + 0.4, fall: 1.3, opacity: 0.7 });
    for (const side of [-1, 1]) {
      const ox = nx * side * 0.32;
      const oz = nz * side * 0.32;
      kit.streak({ a: { x: ev.x + ox, y: KITE_Y + 0.1, z: ev.z + oz }, b: { x: ev.x + ox + d.x * 1.1, y: KITE_Y - 0.15, z: ev.z + oz + d.z * 1.1 }, width: 0.05, tailW: 0, core: PARCH, glow: GUST, life: sweep + 0.1, delay: 0.02, travel: { x: d.x * SPEED * 0.95, y: -(KITE_Y - 0.4) / sweep, z: d.z * SPEED * 0.95 }, fall: 0.8, opacity: 0.75 });
    }
    // The head: a white-hot dart riding down with the kite.
    kit.streak({ a: { x: ev.x, y: KITE_Y, z: ev.z }, b: { x: ev.x + d.x * 0.8, y: KITE_Y - 0.15, z: ev.z + d.z * 0.8 }, width: 0.11, tailW: 0.4, core: PARCH, glow: EMBER, life: sweep, travel: { x: d.x * SPEED, y: -(KITE_Y - 0.35) / sweep, z: d.z * SPEED }, fall: 0.3 });
    // Torn sailcloth shed down the drop.
    const steps = Math.max(2, Math.round(len / 1.5));
    for (let i = 0; i < steps; i++) {
      const k = (i + 0.5) / steps;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      const py = KITE_Y - (KITE_Y - 0.35) * k;
      after(sweep * k, () => spray('shard', px, py, pz, 2, { color: KCLOTH, tile: SHARD_TILE.feather, speed: [0.3, 0.9], up: [0.1, 0.5], size: [0.1, 0.16], life: [1.0, 1.5], gravity: 0.5, drag: 1.7, spin: [-5, 5], flutter: 0.75, dir: { x: -d.x, z: -d.z }, dirBias: 0.4, jitter: 0.15 }));
    }
    // Where it skimmed low: wind-scoured gouges, the last ones hot.
    for (let i = 1; i <= 2; i++) {
      const k = 0.55 + i * 0.2;
      kit.mark({ x: ev.x + d.x * len * k, z: ev.z + d.z * len * k, radius: 0.7, kind: 'gouge', angle: ang, stretch: 2.0, stain: SSTONE, glow: EMBER, glowOpacity: 0.3, cool: 0.4, life: 2.4, opacity: 0.32, delay: sweep * k });
    }
  });
  // It comes down: a thump of dust, a pale ring, cloth flapping loose. The
  // landing does not hurt, so no Ember here.
  bus.on('kite_land', (ev) => {
    mark('kite_land');
    const { x, z } = ev;
    SF.flare(x, 0.25, z, KCLOTH, 0.8, { kind: 'burst', life: 0.18, core: PARCH });
    SF.shock(x, z, 1.0, KCLOTH, { life: 0.35, width: 0.1, core: BONE });
    spray('smoke', x, 0.15, z, 4, { color: SSTONE, speed: [0.6, 1.3], up: [0.1, 0.4], size: [0.3, 0.44], grow: 1.4, life: [0.6, 0.95], opacity: 0.32, gravity: -0.1, drag: 2.4, jitter: 0.2 });
    spray('chunk', x, 0.15, z, 3, { color: SSTONE, speed: [0.5, 1.2], up: [0.8, 1.6], size: [0.04, 0.08], life: [0.35, 0.6] });
    spray('shard', x, 0.35, z, 5, { color: KCLOTH, tile: SHARD_TILE.feather, speed: [0.3, 0.9], up: [0.6, 1.2], size: [0.1, 0.15], life: [1.0, 1.5], gravity: 0.6, drag: 1.8, spin: [-6, 6], flutter: 0.8 });
    kit.mark({ x, z, radius: 0.8, kind: 'scorch', stain: SSTONE, glow: null, life: 2.6, opacity: 0.3 });
  });
  // It climbs back up: the wind catches it from below — a pale ring pushed
  // out across the floor, lines of air rising round it, dust lifted.
  bus.on('kite_rise', (ev) => {
    mark('kite_rise');
    const { x, z } = ev;
    kit.ring({ x, z, r0: 0.2, r1: 1.3, width: 0.08, life: 0.45, core: PARCH, glow: GUST, soft: 0.6, y: 0.05, opacity: 0.6, gain: 0.6 });
    for (let i = 0; i < N(5); i++) {
      const a = (i / 5) * TAU + rnd(-0.3, 0.3);
      const r = rnd(0.25, 0.55);
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      kit.streak({ a: { x: px, y: 0.15, z: pz }, b: { x: px, y: 0.65, z: pz }, width: 0.05, tailW: 0, core: PARCH, glow: GUST, life: 0.4, delay: i * 0.03, travel: { x: Math.cos(a) * 0.4, y: 2.8, z: Math.sin(a) * 0.4 }, fall: 1.0, opacity: 0.7 });
    }
    spray('smoke', x, 0.1, z, 3, { color: SSTONE, speed: [0.4, 0.9], up: [0.4, 0.9], size: [0.26, 0.38], grow: 1.3, life: [0.5, 0.8], opacity: 0.26, gravity: -0.3, drag: 2.2, jitter: 0.25 });
    spray('shard', x, 0.3, z, 3, { color: KCLOTH, tile: SHARD_TILE.feather, speed: [0.2, 0.6], up: [0.8, 1.4], size: [0.09, 0.13], life: [0.9, 1.3], gravity: 0.4, drag: 1.8, spin: [-5, 5], flutter: 0.8 });
  });

  // Chime Wraith — "the toll". The clapper strikes: a bronze flash and a
  // white-hot star at the bell, an Ember edge thrown out to the ring's
  // radius (what hurts), and over it the sound itself — bronze rings rolling
  // out in a stack, some at the bell's height and some along the floor —
  // then bronze motes hanging in the air where the note died.
  bus.on('chime_toll', (ev) => {
    mark('chime_toll');
    const r = ev.radius ?? 2.8;
    const c = SF.byId(ev.id);
    const bx = c ? c.x : ev.x;
    const bz = c ? c.z : ev.z;
    SF.anticipate(bx, bz, 0.5, BRONZE, { y: BELL_Y, lines: 4 });
    after(ANTICIP, () => {
      SF.flare(bx, BELL_Y, bz, BRONZE, 1.3, { kind: 'burst', life: 0.28 });
      kit.flash({ x: bx, y: BELL_Y, z: bz, color: PARCH, size: 0.9, life: 0.12 });
      kit.flash({ x: bx, y: BELL_Y, z: bz, color: BRONZE, size: 1.5, life: 0.4, hold: 0.05, opacity: 0.6 });
      // The hit: the Ember edge out to the radius, and its rim.
      SF.shock(ev.x, ev.z, r, EMBER, { life: 0.26, width: 0.12 });
      kit.ring({ x: ev.x, z: ev.z, r0: r * 0.96, r1: r * 1.02, width: 0.1, life: 0.32, core: EMBER, glow: EMBER, soft: 0.5, y: 0.05, opacity: 0.8, delay: 0.18 });
      // The sound: concentric bronze rings, two in the air, three on the floor.
      for (let i = 0; i < 2; i++) kit.ring({ x: bx, z: bz, r0: 0.3, r1: r * (0.8 + 0.25 * i), width: 0.06, life: 0.6, core: i === 0 ? PARCH : BRONZE, glow: BRONZE, soft: 0.6, y: BELL_Y - 0.1 * i, delay: 0.02 + i * 0.12, opacity: 0.75 - i * 0.2, thin: 0.5 });
      for (let i = 0; i < 3; i++) kit.ring({ x: ev.x, z: ev.z, r0: 0.25, r1: r * (0.55 + 0.2 * i), width: 0.07 - i * 0.012, life: 0.5 + i * 0.1, core: BRONZE, glow: BRONZE, soft: 0.65, y: 0.07, delay: 0.06 + i * 0.1, opacity: 0.7 - i * 0.15, gain: 0.7 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.02, kind: 'sigil', stain: INK, glow: EMBER, glowOpacity: 0.3, cool: 0.5, life: 2.2, opacity: 0.15 });
      kit.light({ x: bx, z: bz, radius: r * 0.7, color: BRONZE, opacity: 0.35, life: 0.45, attack: 0.02 });
      spray('spark', bx, BELL_Y, bz, 6, { color: PARCH, speed: [1.2, 2.4], up: [0.2, 0.8], size: [0.03, 0.06], life: [0.15, 0.3] });
      // The note dying: bronze motes hanging round the ring.
      spray('spark', ev.x, 0.5, ev.z, 12, { color: BRONZE, speed: [0.05, 0.25], up: [0.2, 0.6], size: [0.04, 0.07], life: [1.0, 1.6], gravity: -0.12, drag: 1.6, jitter: r * 0.7, opacity: 0.75 });
    });
  });
  // A stun chokes the toll: a dull bronze spark puff, the clapper caught —
  // no ring, nothing thrown out.
  bus.on('chime_choke', (ev) => {
    mark('chime_choke');
    const c = SF.byId(ev.id);
    const bx = c ? c.x : ev.x;
    const bz = c ? c.z : ev.z;
    kit.flash({ x: bx, y: BELL_Y, z: bz, color: BRONZE, size: 0.5, life: 0.14, opacity: 0.6 });
    spray('spark', bx, BELL_Y - 0.2, bz, 7, { color: BRONZE, speed: [0.4, 1.0], up: [0.1, 0.5], size: [0.03, 0.05], life: [0.3, 0.55], gravity: 3.5, drag: 0.8 });
    spray('smoke', bx, BELL_Y - 0.3, bz, 2, { color: SSTONE, speed: [0.2, 0.4], up: [-0.1, 0.2], size: [0.24, 0.34], grow: 1.2, life: [0.5, 0.8], opacity: 0.26, gravity: 0.1, drag: 2.4 });
    kit.ring({ x: bx, z: bz, r0: 0.2, r1: 0.6, width: 0.05, life: 0.25, core: BRONZE, glow: BRONZE, soft: 0.7, y: BELL_Y - 0.35, opacity: 0.4, gain: 0.4 });
  });

  // Gargoyle — "the statue wakes". The crack: stone chips and dust shaken
  // off, a seam opening at its feet with the indigo showing through. The
  // wake: the stone shell bursts outward in chunks of the Spire's limestone
  // over an Ember ring (when the burst is live; a held wake breaks the shell
  // without the ring). The slam: fists into the floor — Ember ring, crater,
  // chips, dust. The settle: the dust sinks back and a grey ripple goes out.
  bus.on('gargoyle_crack', (ev) => {
    mark('gargoyle_crack');
    const { x, z } = ev;
    kit.crack({ x, z, radius: 0.75, glow: TELL_INDIGO_GLOW, life: 1.6, cool: 1.0 });
    spray('chunk', x, 0.7, z, 5, { color: SSTONE, speed: [0.3, 0.9], up: [0.2, 0.8], size: [0.04, 0.09], life: [0.4, 0.7], jitter: 0.3 });
    spray('smoke', x, 0.5, z, 3, { color: SSTONE, speed: [0.2, 0.5], up: [-0.2, 0.2], size: [0.3, 0.44], grow: 1.3, life: [0.8, 1.2], opacity: 0.28, gravity: 0.15, drag: 2.4, jitter: 0.3 });
    spray('spark', x, 0.6, z, 3, { color: TELL_INDIGO_GLOW, speed: [0.05, 0.2], up: [0.3, 0.6], size: [0.04, 0.06], life: [0.6, 0.9], gravity: -0.2, drag: 1.5, jitter: 0.3, opacity: 0.8 });
    if (ev.hit) SF.flare(x, 0.6, z, BONE, 0.6, { kind: 'star', life: 0.14 });
  });
  bus.on('gargoyle_wake', (ev) => {
    mark('gargoyle_wake');
    const r = ev.radius ?? 0;
    const { x, z } = ev;
    SF.flare(x, 0.7, z, r > 0 ? EMBER : SSTONE, 1.3, { kind: 'burst', life: 0.26 });
    kit.flash({ x, y: 0.7, z, color: PARCH, size: 0.8, life: 0.12 });
    kit.flash({ x, y: 0.7, z, color: TELL_INDIGO_GLOW, size: 0.9, life: 0.3, delay: 0.04, opacity: 0.6 });
    if (r > 0) {
      SF.shock(x, z, r, EMBER, { life: 0.3, width: 0.12, jag: 0.5 });
      kit.mark({ x, z, radius: r * 1.1, kind: 'crater', stain: SSTONE, glow: EMBER, glowOpacity: 0.35, cool: 0.6, life: 3.0, opacity: 0.45 });
      kit.light({ x, z, radius: r * 1.2, color: EMBER, opacity: 0.25, life: 0.3, attack: 0.02 });
    }
    // The shell: limestone chunks and plates flung out, a dust ring.
    SF.shock(x, z, Math.max(1.4, r * 1.3), SSTONE, { life: 0.5, width: 0.22, core: BONE, delay: 0.03, jag: 0.9 });
    spray('chunk', x, 0.7, z, 10, { color: SSTONE, speed: [1.6, 3.2], up: [1.4, 2.8], size: [0.08, 0.18], life: [0.55, 0.9], jitter: 0.3 });
    spray('shard', x, 0.8, z, 6, { color: SSTONE, tile: SHARD_TILE.needle, speed: [1.4, 2.8], up: [1.0, 2.2], size: [0.1, 0.16], life: [0.5, 0.8], gravity: 6, spin: [-10, 10] });
    spray('smoke', x, 0.4, z, 5, { color: SSTONE, speed: [0.8, 1.6], up: [0.2, 0.6], size: [0.38, 0.54], grow: 1.5, life: [0.8, 1.2], opacity: 0.32, gravity: -0.1, drag: 2.2, jitter: 0.3 });
  });
  bus.on('gargoyle_slam', (ev) => {
    mark('gargoyle_slam');
    const r = ev.radius ?? 1.3;
    const g = SF.byId(ev.id);
    const d = faceOf(g);
    const sx = g ? g.x : ev.x - d.x * 0.9;
    const sz = g ? g.z : ev.z - d.z * 0.9;
    kit.streak({ a: { x: sx + d.x * 0.3, y: 1.7, z: sz + d.z * 0.3 }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 0.18, tailW: 0.45, core: PARCH, glow: EMBER, life: 0.16, fall: 2.2 });
    SF.flare(ev.x, 0.35, ev.z, EMBER, 1.4, { kind: 'burst', life: 0.24 });
    kit.flash({ x: ev.x, y: 0.4, z: ev.z, color: PARCH, size: 0.8, life: 0.13 });
    SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.3, width: 0.12, jag: 0.7 });
    SF.shock(ev.x, ev.z, r * 1.4, SSTONE, { life: 0.5, width: 0.24, core: BONE, delay: 0.04, jag: 0.9 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.85, glow: EMBER, life: 1.4, cool: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.3, kind: 'crater', stain: SSTONE, glow: EMBER, glowOpacity: 0.4, cool: 0.8, life: 3.4, opacity: 0.55 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: EMBER, opacity: 0.28, life: 0.35, attack: 0.02 });
    spray('chunk', ev.x, 0.3, ev.z, 8, { color: SSTONE, speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.15], life: [0.5, 0.85], jitter: 0.3 });
    spray('spark', ev.x, 0.4, ev.z, 6, { color: PARCH, speed: [1.6, 3.0], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.3] });
    spray('smoke', ev.x, 0.2, ev.z, 4, { color: SSTONE, speed: [0.6, 1.3], up: [0.1, 0.4], size: [0.38, 0.52], grow: 1.4, life: [0.7, 1.05], opacity: 0.32, gravity: -0.15, drag: 2.4, jitter: 0.4 });
  });
  bus.on('gargoyle_settle', (ev) => {
    mark('gargoyle_settle');
    const { x, z } = ev;
    kit.ring({ x, z, r0: 0.3, r1: 1.8, width: 0.1, life: 1.1, core: SSTONE, glow: SSTONE, soft: 0.8, y: 0.04, opacity: 0.45, gain: 0.4 });
    spray('smoke', x, 1.2, z, 5, { color: SSTONE, speed: [0.1, 0.35], up: [-0.5, -0.2], size: [0.34, 0.5], grow: 1.5, life: [1.2, 1.7], opacity: 0.26, gravity: 0.35, drag: 2.0, jitter: 0.45 });
    spray('spark', x, 0.9, z, 4, { color: TELL_INDIGO_GLOW, speed: [0.02, 0.1], up: [-0.4, -0.15], size: [0.03, 0.05], life: [0.8, 1.2], gravity: 0.2, drag: 1.6, jitter: 0.3, opacity: 0.6 });
    kit.mark({ x, z, radius: 0.9, kind: 'scorch', stain: SSTONE, glow: null, life: 3.0, opacity: 0.28 });
  });

  // Rope Hanger — "the pendulum". The swing lays a hemp-coloured arc that
  // follows the body down the lane — lifting off the floor and riding high
  // through the middle —
  // over an Ember edge on the lane (what hits you), dust kicked off where its
  // feet leave the floor, and fibres and grit shaken out of the rope overhead
  // as it takes the weight (the creak). The landing is a puff of dust.
  bus.on('hanger_swing', (ev) => {
    mark('hanger_swing');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = Math.max(0.5, ev.length ?? 6);
    const SPEED = 10;
    const sweep = len / SPEED;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ex, y: 0.1, z: ez }, width: 1.1, tailW: 0.85, core: EMBER, glow: EMBER, life: sweep + 0.12, fall: 2.2, opacity: 0.38 });
    // The arc: short hemp segments laid behind the body as it passes.
    const segs = Math.max(4, Math.round(len / 0.7));
    const yAt = (k) => 1.05 + 0.38 * Math.sin(Math.PI * k); // the body's own lift (render/enemies/spire.js)
    for (let i = 0; i < segs; i++) {
      const k0 = i / segs;
      const k1 = (i + 1) / segs;
      kit.streak({
        a: { x: ev.x + d.x * len * k0, y: yAt(k0), z: ev.z + d.z * len * k0 },
        b: { x: ev.x + d.x * len * k1, y: yAt(k1), z: ev.z + d.z * len * k1 },
        width: 0.2,
        tailW: 0.7,
        core: i === segs - 1 ? PARCH : BONE,
        glow: HEMP,
        life: 0.42,
        delay: sweep * k0,
        fall: 1.0,
        opacity: 0.8,
      });
    }
    // The head riding with it: white-hot, an Ember glow.
    kit.streak({ a: { x: ev.x, y: 1.0, z: ev.z }, b: { x: ev.x + d.x * 0.6, y: 0.95, z: ev.z + d.z * 0.6 }, width: 0.1, tailW: 0.35, core: PARCH, glow: EMBER, life: sweep, travel: { x: d.x * SPEED, y: 0, z: d.z * SPEED }, fall: 0.3, opacity: 0.85 });
    // The push-off: dust behind the feet.
    spray('smoke', ev.x - d.x * 0.2, 0.1, ev.z - d.z * 0.2, 3, { color: SSTONE, speed: [0.4, 0.9], up: [0.1, 0.3], size: [0.28, 0.4], grow: 1.3, life: [0.5, 0.8], opacity: 0.3, gravity: -0.1, drag: 2.4, dir: { x: -d.x, z: -d.z }, dirBias: 0.7 });
    // The rope creaks: fibres and grit shaken loose high on the rope.
    const mx = ev.x + d.x * len * 0.5;
    const mz = ev.z + d.z * len * 0.5;
    spray('spark', mx, 3.2, mz, 8, { color: HEMP, speed: [0.05, 0.3], up: [-0.6, -0.2], size: [0.03, 0.05], life: [1.0, 1.5], gravity: 0.5, drag: 1.4, jitter: 0.6, opacity: 0.8 });
    spray('smoke', mx, 3.4, mz, 2, { color: SSTONE, speed: [0.1, 0.3], up: [-0.3, -0.1], size: [0.26, 0.36], grow: 1.3, life: [1.0, 1.4], opacity: 0.18, gravity: 0.3, drag: 2.0, jitter: 0.4 });
  });
  bus.on('hanger_land', (ev) => {
    mark('hanger_land');
    const { x, z } = ev;
    SF.shock(x, z, 0.8, SSTONE, { life: 0.32, width: 0.09, core: BONE });
    spray('smoke', x, 0.12, z, 4, { color: SSTONE, speed: [0.5, 1.1], up: [0.1, 0.35], size: [0.28, 0.42], grow: 1.4, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4, jitter: 0.2 });
    spray('spark', x, 1.6, z, 4, { color: HEMP, speed: [0.05, 0.2], up: [-0.4, -0.1], size: [0.03, 0.05], life: [0.8, 1.2], gravity: 0.5, drag: 1.4, jitter: 0.3, opacity: 0.7 });
  });

  // Vane Cock — "the volley". The cock swings into the wind and lets fly:
  // a snap of cold air at its beak (a pale flash, wind lines streaming off
  // down the lane), a gust puff and a brass glint with each dart (the darts
  // themselves are enemy shots with their own long gust trail), grit shaken
  // off the spindle.
  const VANE_Y = 1.75; // the cock's head on its spindle (render/enemies/spire.js)
  bus.on('vane_volley', (ev) => {
    mark('vane_volley');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const v = SF.byId(ev.id);
    const vx = v ? v.x : ev.x;
    const vz = v ? v.z : ev.z;
    const ang = Math.atan2(d.z, d.x);
    const n = ev.darts ?? 3;
    for (let i = 0; i < n; i++) {
      after(i * (9 / 60), () => {
        const bx = vx + d.x * 0.45;
        const bz = vz + d.z * 0.45;
        kit.flash({ x: bx, y: VANE_Y - 0.2, z: bz, color: GUST, size: 0.55, life: 0.12 });
        SF.flare(bx, VANE_Y - 0.25, bz, BRONZE, 0.55, { life: 0.12, angle: ang });
        // The gust leaving the beak, dropping to the darts' flight height.
        kit.streak({ a: { x: bx, y: VANE_Y - 0.25, z: bz }, b: { x: bx + d.x * 0.5, y: 0.9, z: bz + d.z * 0.5 }, width: 0.06, tailW: 0.02, core: PARCH, glow: GUST, life: 0.22, travel: { x: d.x * 5, y: -2.4, z: d.z * 5 }, fall: 0.8, opacity: 0.75 });
        for (const side of [-1, 1]) {
          const ox = -d.z * side * 0.18;
          const oz = d.x * side * 0.18;
          kit.streak({ a: { x: bx + ox, y: 0.6, z: bz + oz }, b: { x: bx + ox + d.x * 0.6, y: 0.55, z: bz + oz + d.z * 0.6 }, width: 0.03, tailW: 0, core: PARCH, glow: GUST, life: 0.3, delay: 0.02, travel: { x: d.x * 7, y: 0, z: d.z * 7 }, fall: 0.8, opacity: 0.6 });
        }
        spray('smoke', bx, VANE_Y - 0.3, bz, 1, { color: GUST, speed: [0.4, 0.9], up: [-0.1, 0.1], size: [0.22, 0.32], grow: 1.4, life: [0.35, 0.55], opacity: 0.22, gravity: 0, drag: 2.4, dir: d, dirBias: 0.8 });
      });
    }
    spray('chunk', vx, 0.1, vz, 2, { color: SSTONE, speed: [0.4, 0.9], up: [0.6, 1.2], size: [0.03, 0.06], life: [0.3, 0.5], dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
  });

  // Bell Sacristan — "the warder". Its Vesper Hush is a WARD, not a hit, so
  // nothing here is Ember: the hand bell rings and its note falls pale and
  // slow (lavender-white rings rolling out to the ring's edge, motes drifting
  // DOWN), a thread of pale light runs from the bell to each enemy it hushed
  // and a soft bloom settles on each (render/enemies/spire.js veils them for
  // as long as it lasts). The rap is a hit: a bronze clang, an Ember edge on
  // the short cone. A choke is the note dying in the bell.
  const SAC_BELL_Y = 1.95; // the hand bell, raised overhead for the hush
  function sacristanGather(e) {
    const t = e.telegraph;
    kit.ring({ x: e.x, z: e.z, r0: (t.radius ?? 3.6) * 0.9, r1: 0.3, width: 0.06, life: 0.6, core: SF.HPALE, glow: SF.HVEIL, soft: 0.6, y: 0.06, opacity: 0.55 });
    spray('spark', e.x, 1.4, e.z, 6, { color: SF.HPALE, speed: [0.05, 0.2], up: [0.3, 0.7], size: [0.04, 0.07], life: [0.7, 1.1], gravity: -0.25, drag: 1.6, jitter: 0.7, opacity: 0.8 });
  }
  bus.on('sacristan_hush', (ev) => {
    mark('sacristan_hush');
    const r = ev.radius ?? 3.6;
    const sc = SF.byId(ev.id);
    const bx = sc ? sc.x : ev.x;
    const bz = sc ? sc.z : ev.z;
    kit.flash({ x: bx, y: SAC_BELL_Y, z: bz, color: SF.HPALE, size: 1.1, life: 0.3, opacity: 0.8 });
    SF.flare(bx, SAC_BELL_Y, bz, SF.HVEIL, 1.1, { kind: 'burst', life: 0.3, core: SF.HPALE });
    // The note, falling pale: rings in the air and on the floor.
    for (let i = 0; i < 2; i++) kit.ring({ x: bx, z: bz, r0: 0.3, r1: r * (0.7 + 0.25 * i), width: 0.06, life: 0.9, core: SF.HPALE, glow: SF.HVEIL, soft: 0.7, y: SAC_BELL_Y - 0.3 - 0.5 * i, delay: i * 0.14, opacity: 0.6 - i * 0.15, thin: 0.5 });
    for (let i = 0; i < 3; i++) kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: r * (0.6 + 0.2 * i), width: 0.07, life: 0.9 + i * 0.15, core: SF.HPALE, glow: SF.HVEIL, soft: 0.75, y: 0.05, delay: 0.1 + i * 0.14, opacity: 0.55 - i * 0.12, gain: 0.5 });
    kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'sigil', stain: SF.HVEIL, glow: SF.HPALE, glowOpacity: 0.25, cool: 1.6, life: 3.2, opacity: 0.16 });
    kit.light({ x: bx, z: bz, radius: r * 0.8, color: SF.HPALE, opacity: 0.3, life: 0.8, attack: 0.08 });
    spray('spark', ev.x, 2.0, ev.z, 14, { color: SF.HPALE, speed: [0.05, 0.25], up: [-0.6, -0.2], size: [0.04, 0.08], life: [1.2, 1.8], gravity: 0.15, drag: 1.8, jitter: r * 0.7, opacity: 0.8 });
    // A thread to each enemy it hushed, and a bloom settling on it.
    let i = 0;
    for (const kid of ev.kin || []) {
      const k = SF.byId(kid);
      if (!k) continue;
      const delay = 0.08 + 0.06 * i++;
      kit.streak({ a: { x: bx, y: SAC_BELL_Y, z: bz }, b: { x: k.x, y: 1.2, z: k.z }, width: 0.05, tailW: 0.05, core: SF.HPALE, glow: SF.HVEIL, life: 0.55, delay, fall: 1.0, opacity: 0.75 });
      after(delay + 0.12, () => {
        kit.flash({ x: k.x, y: 1.0, z: k.z, color: SF.HPALE, size: 1.0, life: 0.4, opacity: 0.6 });
        kit.ring({ x: k.x, z: k.z, r0: 1.0, r1: 0.4, width: 0.05, life: 0.45, core: SF.HPALE, glow: SF.HVEIL, soft: 0.6, y: 0.05, opacity: 0.6 });
        spray('spark', k.x, 1.8, k.z, 4, { color: SF.HPALE, speed: [0.02, 0.12], up: [-0.5, -0.2], size: [0.04, 0.06], life: [0.8, 1.2], gravity: 0.1, drag: 1.8, jitter: 0.4, opacity: 0.8 });
      });
    }
  });
  bus.on('sacristan_rap', (ev) => {
    mark('sacristan_rap');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const hx = ev.x + d.x * 0.75;
    const hz = ev.z + d.z * 0.75;
    SF.flare(hx, 0.7, hz, BRONZE, 1.1, { kind: 'burst', life: 0.2 });
    kit.flash({ x: hx, y: 0.7, z: hz, color: PARCH, size: 0.6, life: 0.1 });
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * 1.6, y: 0.1, z: ev.z + d.z * 1.6 }, width: 1.5, tailW: 1.2, core: EMBER, glow: EMBER, life: 0.2, fall: 2.2, opacity: 0.4 });
    SF.shock(hx, hz, 0.9, EMBER, { life: 0.22, width: 0.08 });
    kit.ring({ x: hx, z: hz, r0: 0.2, r1: 1.2, width: 0.05, life: 0.4, core: BRONZE, glow: BRONZE, soft: 0.6, y: 0.7, opacity: 0.6, thin: 0.5 });
    spray('spark', hx, 0.7, hz, 6, { color: PARCH, speed: [1.2, 2.4], up: [0.2, 0.8], size: [0.03, 0.06], life: [0.15, 0.3], dir: d, dirBias: 0.6 });
    spray('chunk', hx, 0.2, hz, 3, { color: SSTONE, speed: [0.6, 1.4], up: [0.8, 1.4], size: [0.04, 0.08], life: [0.35, 0.6] });
  });
  bus.on('sacristan_choke', (ev) => {
    mark('sacristan_choke');
    const sc = SF.byId(ev.id);
    const bx = sc ? sc.x : ev.x;
    const bz = sc ? sc.z : ev.z;
    kit.flash({ x: bx, y: SAC_BELL_Y, z: bz, color: BRONZE, size: 0.5, life: 0.14, opacity: 0.6 });
    kit.ring({ x: bx, z: bz, r0: 1.4, r1: 0.1, width: 0.05, life: 0.35, core: SF.HPALE, glow: SF.HVEIL, soft: 0.7, y: 0.05, opacity: 0.45 });
    spray('spark', bx, SAC_BELL_Y - 0.2, bz, 6, { color: BRONZE, speed: [0.3, 0.9], up: [0.0, 0.4], size: [0.03, 0.05], life: [0.3, 0.5], gravity: 3.5, drag: 0.8 });
    spray('smoke', bx, SAC_BELL_Y - 0.3, bz, 2, { color: SF.HVEIL, speed: [0.1, 0.3], up: [-0.1, 0.1], size: [0.24, 0.34], grow: 1.2, life: [0.5, 0.8], opacity: 0.22, gravity: 0.1, drag: 2.4 });
  });

  // Their deaths, on top of enemyDeath's shared break.
  Object.assign(CREATURE_DEATH, {
    kite: (es, matter, x, z) => {
      // The sails tear apart: cloth drifting down, cane splinters snapping.
      mark('kite_death');
      SF.flare(x, 1.0, z, KCLOTH, 0.9, { kind: 'burst', life: 0.22 });
      spray('shard', x, 1.1, z, 12, { color: KCLOTH, tile: SHARD_TILE.feather, speed: [0.5, 1.4], up: [0.3, 1.0], size: [0.12, 0.2], life: [1.4, 2.2], gravity: 0.45, drag: 1.6, spin: [-5, 5], flutter: 0.85 });
      spray('shard', x, 1.0, z, 5, { color: HEMP, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [0.6, 1.4], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 5, spin: [-10, 10] });
      spray('smoke', x, 1.0, z, 2, { color: GUST, speed: [0.3, 0.7], up: [0.1, 0.4], size: [0.3, 0.42], grow: 1.4, life: [0.6, 0.9], opacity: 0.22, gravity: -0.1, drag: 2.2 });
    },
    chime: (es, matter, x, z) => {
      // The shroud empties and the bell drops: a last cracked clang on the
      // floor, bronze shards, the indigo going out.
      mark('chime_death');
      kit.flash({ x, y: BELL_Y, z, color: TELL_INDIGO_GLOW, size: 0.8, life: 0.24 });
      spray('shard', x, 1.4, z, 6, { color: SSTONE, tile: SHARD_TILE.petal, speed: [0.3, 0.9], up: [0.2, 0.7], size: [0.1, 0.15], life: [0.9, 1.3], gravity: 0.7, drag: 1.8, spin: [-4, 4], flutter: 0.6, opacity: 0.8 });
      after(0.3, () => {
        SF.flare(x, 0.3, z, BRONZE, 1.0, { kind: 'burst', life: 0.22 });
        kit.ring({ x, z, r0: 0.2, r1: 1.4, width: 0.07, life: 0.5, core: BRONZE, glow: BRONZE, soft: 0.6, y: 0.06, opacity: 0.6 });
        spray('chunk', x, 0.3, z, 5, { color: BRONZE, speed: [0.8, 1.8], up: [1.0, 1.8], size: [0.05, 0.1], life: [0.5, 0.8] });
        spray('spark', x, 0.4, z, 8, { color: BRONZE, speed: [0.05, 0.3], up: [0.3, 0.7], size: [0.04, 0.06], life: [0.9, 1.4], gravity: -0.15, drag: 1.6, jitter: 0.5, opacity: 0.75 });
      });
    },
    gargoyle: (es, matter, x, z) => {
      // It crumbles to rubble where it stands.
      mark('gargoyle_death');
      kit.crack({ x, z, radius: 0.9, glow: TELL_INDIGO_GLOW, life: 1.4, cool: 0.5 });
      SF.shock(x, z, 1.4, SSTONE, { life: 0.45, width: 0.18, core: BONE, jag: 0.9 });
      spray('chunk', x, 0.8, z, 12, { color: SSTONE, speed: [0.8, 2.2], up: [0.8, 2.2], size: [0.09, 0.2], life: [0.6, 1.0], jitter: 0.35 });
      spray('smoke', x, 0.6, z, 5, { color: SSTONE, speed: [0.4, 1.0], up: [0.2, 0.6], size: [0.42, 0.6], grow: 1.5, life: [1.0, 1.5], opacity: 0.34, gravity: -0.1, drag: 2.0, jitter: 0.4 });
      kit.mark({ x, z, radius: 1.2, kind: 'crater', stain: SSTONE, glow: null, life: 3.6, opacity: 0.45 });
    },
    hanger: (es, matter, x, z) => {
      // The rope lets go: it falls out of the dark onto the body in a heap.
      mark('hanger_death');
      kit.streak({ a: { x, y: 4.2, z }, b: { x, y: 2.4, z }, width: 0.06, tailW: 0.8, core: BONE, glow: HEMP, life: 0.45, travel: { x: 0, y: -5, z: 0 }, fall: 0.6, opacity: 0.85 });
      after(0.35, () => {
        SF.shock(x, z, 0.9, HEMP, { life: 0.35, width: 0.1, core: BONE });
        spray('smoke', x, 0.2, z, 3, { color: SSTONE, speed: [0.4, 0.9], up: [0.1, 0.3], size: [0.3, 0.42], grow: 1.3, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4 });
      });
      spray('spark', x, 1.5, z, 6, { color: HEMP, speed: [0.1, 0.4], up: [-0.2, 0.3], size: [0.03, 0.05], life: [0.9, 1.3], gravity: 0.4, drag: 1.4, jitter: 0.3, opacity: 0.75 });
    },
    vane: (es, matter, x, z) => {
      // The cock snaps off its spindle and spins away: brass plates and a
      // last gust, the iron letters clattering down.
      mark('vane_death');
      SF.flare(x, VANE_Y, z, BRONZE, 1.0, { kind: 'burst', life: 0.22 });
      kit.flash({ x, y: VANE_Y, z, color: GUST, size: 0.8, life: 0.18 });
      kit.ring({ x, z, r0: 0.2, r1: 1.4, width: 0.06, life: 0.4, core: PARCH, glow: GUST, soft: 0.6, y: VANE_Y - 0.3, opacity: 0.6, thin: 0.5 });
      spray('shard', x, VANE_Y, z, 8, { color: BRONZE, tile: SHARD_TILE.petal, speed: [0.8, 2.0], up: [1.2, 2.4], size: [0.1, 0.16], life: [0.7, 1.1], gravity: 5, spin: [-14, 14] });
      spray('chunk', x, 0.7, z, 5, { color: vfxMatterColor('iron'), speed: [0.6, 1.4], up: [0.6, 1.4], size: [0.05, 0.09], life: [0.5, 0.8] });
      spray('spark', x, VANE_Y, z, 6, { color: TELL_INDIGO_GLOW, speed: [0.3, 0.9], up: [0.2, 0.7], size: [0.03, 0.06], life: [0.4, 0.8], drag: 1.3 });
    },
    sacristan: (es, matter, x, z) => {
      // It crumbles where it stoops; the hand bell drops and rings once,
      // clear, the hush it held lifting in a last pale sigh.
      mark('sacristan_death');
      kit.crack({ x, z, radius: 0.8, glow: TELL_INDIGO_GLOW, life: 1.2, cool: 0.5 });
      SF.shock(x, z, 1.2, SSTONE, { life: 0.4, width: 0.16, core: BONE, jag: 0.8 });
      spray('chunk', x, 0.8, z, 9, { color: SSTONE, speed: [0.6, 1.8], up: [0.6, 1.8], size: [0.08, 0.16], life: [0.6, 0.95], jitter: 0.3 });
      spray('smoke', x, 0.5, z, 4, { color: SSTONE, speed: [0.3, 0.8], up: [0.2, 0.5], size: [0.36, 0.5], grow: 1.4, life: [0.9, 1.3], opacity: 0.3, gravity: -0.1, drag: 2.2, jitter: 0.3 });
      after(0.28, () => {
        SF.flare(x, 0.25, z, BRONZE, 0.9, { kind: 'burst', life: 0.22 });
        kit.ring({ x, z, r0: 0.2, r1: 1.6, width: 0.06, life: 0.6, core: BRONZE, glow: BRONZE, soft: 0.6, y: 0.06, opacity: 0.6 });
        kit.ring({ x, z, r0: 0.4, r1: 2.6, width: 0.05, life: 0.9, core: SF.HPALE, glow: SF.HVEIL, soft: 0.8, y: 0.3, delay: 0.1, opacity: 0.45, thin: 0.5 });
        spray('spark', x, 0.6, z, 8, { color: SF.HPALE, speed: [0.05, 0.3], up: [0.4, 0.9], size: [0.04, 0.07], life: [1.0, 1.5], gravity: -0.2, drag: 1.6, jitter: 0.6, opacity: 0.75 });
      });
      kit.mark({ x, z, radius: 1.0, kind: 'crater', stain: SSTONE, glow: null, life: 3.2, opacity: 0.4 });
    },
  });

  // ------------------------------------------- the Ember Kiln --
  // (docs/KILN.md) The Kiln's four in the same three movements, with one
  // rule above the rest: a fire land beside a red-orange threat. The Ember
  // edge is ONLY on what hurts (the lunge's lane, the slam's ring, the fan's
  // cone, the flare's ring); everything else the Kiln burns with is its own
  // KILN GOLD (kilngold / kilnheat / sparks) over crimson COAL, so the floor
  // never carries a second red-orange. Then what is left: slag, soot, ash.
  const KGOLD = vfxMatterColor('kilngold');
  const KHEAT = vfxMatterColor('kilnheat');
  const KSPARK = vfxMatterColor('sparks');
  const KCOAL = vfxMatterColor('coal');
  const SLAGC = vfxMatterColor('slag');
  const NHIDE = vfxMatterColor('newthide');
  const LEATHER = vfxMatterColor('bellows');
  const MASH = vfxMatterColor('mothash');
  const KBRICK = vfxMatterColor('kilnbrick');
  const NEWT_Y = 0.2;
  const SLAG_CORE_Y = 1.15; // the Golem's crater (render/enemies/kiln.js)
  const NOZZLE_Y = 1.0; // the Imp's nozzle over its shoulder
  const MOTH_Y = 1.35; // a kindling Moth

  // Ember Newt — "the dart". A scrabble of grit and gold sparks kicked out
  // behind it, an Ember edge down the lane for the length of the dart (the
  // bite), a white-gold heat streak riding with it and a gold scorch laid
  // down the lane that cools behind it.
  bus.on('newt_lunge', (ev) => {
    mark('newt_lunge');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = Math.max(0.3, ev.length ?? 3.6);
    const ang = Math.atan2(d.z, d.x);
    const SPEED = 13;
    const sweep = len / SPEED;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    // The push-off: grit and sparks thrown back off its feet.
    SF.flare(ev.x, NEWT_Y, ev.z, KGOLD, 0.55, { kind: 'burst', life: 0.14, core: KHEAT });
    spray('spark', ev.x, 0.12, ev.z, 8, { color: KSPARK, speed: [1.2, 2.6], up: [0.3, 1.0], size: [0.03, 0.06], life: [0.2, 0.4], gravity: 4, drag: 0.8, dir: { x: -d.x, z: -d.z }, dirBias: 0.75 });
    spray('smoke', ev.x - d.x * 0.15, 0.1, ev.z - d.z * 0.15, 2, { color: KBRICK, speed: [0.4, 0.9], up: [0.1, 0.3], size: [0.22, 0.32], grow: 1.3, life: [0.4, 0.65], opacity: 0.3, gravity: -0.1, drag: 2.6, dir: { x: -d.x, z: -d.z }, dirBias: 0.7 });
    // The hit: the lane's Ember edge, live for the dart.
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ex, y: 0.1, z: ez }, width: 0.7, tailW: 0.6, core: EMBER, glow: EMBER, life: sweep + 0.14, fall: 2.2, opacity: 0.4 });
    // The heat streak: a gold smear laid behind it, a white-hot head riding
    // with it.
    kit.streak({ a: { x: ev.x, y: 0.16, z: ev.z }, b: { x: ex, y: 0.16, z: ez }, width: 0.22, tailW: 0.1, core: KHEAT, glow: KGOLD, life: sweep + 0.32, fall: 1.4, opacity: 0.75 });
    kit.streak({ a: { x: ev.x, y: NEWT_Y, z: ev.z }, b: { x: ev.x + d.x * 0.5, y: NEWT_Y, z: ev.z + d.z * 0.5 }, width: 0.12, tailW: 0.3, core: PARCH, glow: KGOLD, life: sweep, travel: { x: d.x * SPEED, y: 0, z: d.z * SPEED }, fall: 0.3 });
    // The scorch: claw-raked gouges down the lane, gold seams cooling.
    const steps = Math.max(1, Math.round(len / 1.2));
    for (let i = 0; i < steps; i++) {
      const k = (i + 0.6) / steps;
      kit.mark({ x: ev.x + d.x * len * k, z: ev.z + d.z * len * k, radius: 0.55, kind: 'gouge', angle: ang, stretch: 2.2, stain: INK, glow: KGOLD, glowOpacity: 0.55, cool: 0.9, life: 2.0, opacity: 0.3, delay: sweep * k });
      after(sweep * k, () => spray('spark', ev.x + d.x * len * k, 0.1, ev.z + d.z * len * k, 2, { color: KSPARK, speed: [0.3, 0.8], up: [0.4, 1.0], size: [0.03, 0.05], life: [0.25, 0.45], gravity: 3, drag: 1.0 }));
    }
  });
  // The skid: it plants its claws at the lane's end — a fan of gold sparks
  // and grit sprayed ahead off its feet, a dragged scorch, a puff of soot.
  bus.on('newt_stop', (ev) => {
    mark('newt_stop');
    const n = SF.byId(ev.id);
    const d = faceOf(n);
    const ang = Math.atan2(d.z, d.x);
    const { x, z } = ev;
    kit.flash({ x, y: 0.15, z, color: KGOLD, size: 0.55, life: 0.16, opacity: 0.7 });
    spray('spark', x + d.x * 0.15, 0.08, z + d.z * 0.15, 12, { color: KSPARK, speed: [1.4, 3.0], up: [0.2, 0.9], size: [0.03, 0.06], life: [0.2, 0.42], gravity: 5, drag: 0.7, dir: d, dirBias: 0.8, jitter: 0.08 });
    spray('spark', x, 0.08, z, 4, { color: KHEAT, speed: [0.8, 1.8], up: [0.3, 0.8], size: [0.04, 0.07], life: [0.15, 0.3], gravity: 4, dir: d, dirBias: 0.6 });
    spray('smoke', x, 0.1, z, 3, { color: KBRICK, speed: [0.4, 1.0], up: [0.1, 0.35], size: [0.24, 0.36], grow: 1.4, life: [0.5, 0.8], opacity: 0.3, gravity: -0.1, drag: 2.4, dir: d, dirBias: 0.5 });
    kit.mark({ x: x - d.x * 0.25, z: z - d.z * 0.25, radius: 0.6, kind: 'gouge', angle: ang, stretch: 1.8, stain: INK, glow: KGOLD, glowOpacity: 0.5, cool: 0.7, life: 2.2, opacity: 0.32 });
    if (ev.hits > 0) SF.flare(x, NEWT_Y, z, EMBER, 0.45, { kind: 'star', life: 0.12, angle: ang });
  });

  // Slag Golem — "the furnace blow". Both fists down through a gold smear,
  // the Ember ring at the slam's radius (the hit), a white-gold splash of
  // molten slag thrown up and raining back, dark slag chunks, a crater with
  // a gold seam that cools as the slag pool spreads (the pool itself is the
  // slick, render/enemies/extras.js). On the golem itself: the crust bursts
  // off its back and the core's light floods out (the punish window).
  bus.on('slag_slam', (ev) => {
    mark('slag_slam');
    const r = ev.radius ?? 1.4;
    const g = SF.byId(ev.id);
    const d = faceOf(g);
    const sx = g ? g.x : ev.x - d.x;
    const sz = g ? g.z : ev.z - d.z;
    // The fists coming down.
    for (const side of [-1, 1]) {
      const ox = -d.z * side * 0.35;
      const oz = d.x * side * 0.35;
      kit.streak({ a: { x: sx + ox, y: 1.9, z: sz + oz }, b: { x: ev.x + ox * 0.6, y: 0.15, z: ev.z + oz * 0.6 }, width: 0.16, tailW: 0.4, core: KHEAT, glow: KGOLD, life: 0.16, fall: 2.2, opacity: 0.85 });
    }
    // The hit: Ember out to the radius.
    SF.flare(ev.x, 0.35, ev.z, EMBER, 1.3, { kind: 'burst', life: 0.22 });
    kit.flash({ x: ev.x, y: 0.4, z: ev.z, color: KHEAT, size: 0.9, life: 0.14 });
    SF.shock(ev.x, ev.z, r * 1.02, EMBER, { life: 0.3, width: 0.12, jag: 0.6 });
    // The splash: molten slag thrown up in a crown and raining back gold,
    // a gold shockwave of heat rolling out under it, dark slag chunks.
    SF.shock(ev.x, ev.z, r * 1.35, KGOLD, { life: 0.45, width: 0.2, core: KHEAT, delay: 0.03, jag: 0.8 });
    spray('spark', ev.x, 0.25, ev.z, 18, { color: KGOLD, speed: [1.0, 2.6], up: [2.0, 3.8], size: [0.06, 0.12], life: [0.55, 0.9], gravity: 7.5, drag: 0.4, jitter: 0.3 });
    spray('spark', ev.x, 0.25, ev.z, 8, { color: KHEAT, speed: [1.6, 3.2], up: [1.2, 2.4], size: [0.05, 0.09], life: [0.3, 0.55], gravity: 6, drag: 0.5, jitter: 0.2 });
    spray('chunk', ev.x, 0.3, ev.z, 8, { color: SLAGC, speed: [1.0, 2.4], up: [1.4, 2.8], size: [0.07, 0.15], life: [0.5, 0.85], jitter: 0.3 });
    spray('smoke', ev.x, 0.25, ev.z, 5, { color: SLAGC, speed: [0.5, 1.2], up: [0.3, 0.8], size: [0.4, 0.58], grow: 1.5, life: [0.9, 1.4], opacity: 0.36, gravity: -0.3, drag: 2.2, jitter: 0.4 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: KGOLD, life: 1.8, cool: 1.2 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.2, kind: 'crater', stain: SLAGC, glow: KGOLD, glowOpacity: 0.5, cool: 1.4, life: 3.6, opacity: 0.5 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.5, color: KGOLD, opacity: 0.45, life: 0.6, attack: 0.02 });
    // The crust cracking off its back: slag plates flung up, the core's
    // light and heat bursting out of the crater.
    after(0.05, () => {
      mark('slag_crack');
      SF.flare(sx, SLAG_CORE_Y, sz, KGOLD, 1.1, { kind: 'burst', life: 0.3, core: KHEAT });
      kit.flash({ x: sx, y: SLAG_CORE_Y, z: sz, color: KGOLD, size: 1.6, life: 0.5, hold: 0.06, opacity: 0.55 });
      spray('chunk', sx, SLAG_CORE_Y, sz, 6, { color: SLAGC, speed: [0.6, 1.5], up: [1.6, 2.6], size: [0.06, 0.11], life: [0.5, 0.8], jitter: 0.2 });
      spray('spark', sx, SLAG_CORE_Y, sz, 10, { color: KSPARK, speed: [0.4, 1.4], up: [1.0, 2.2], size: [0.04, 0.07], life: [0.5, 0.9], gravity: 1.2, drag: 1.0, jitter: 0.2 });
      kit.light({ x: sx, z: sz, radius: 1.6, color: KGOLD, opacity: 0.4, life: 1.2, attack: 0.05 });
    });
  });
  // The crust knits: a ring of heat drawn in over its back, the glow
  // swallowed, a hiss of pale steam and the last sparks falling dark.
  bus.on('slag_crust', (ev) => {
    mark('slag_crust');
    const g = SF.byId(ev.id);
    const x = g ? g.x : ev.x;
    const z = g ? g.z : ev.z;
    kit.ring({ x, z, r0: 0.95, r1: 0.15, width: 0.08, life: 0.32, core: KGOLD, glow: KCOAL, soft: 0.5, y: SLAG_CORE_Y - 0.05, opacity: 0.75 });
    kit.flash({ x, y: SLAG_CORE_Y, z, color: KCOAL, size: 0.8, life: 0.3, grow: -0.5, opacity: 0.6 });
    spray('smoke', x, SLAG_CORE_Y + 0.1, z, 4, { color: BONE, speed: [0.1, 0.35], up: [0.6, 1.1], size: [0.24, 0.36], grow: 1.6, life: [0.7, 1.1], opacity: 0.22, gravity: -0.5, drag: 2.2, jitter: 0.2 });
    spray('smoke', x, SLAG_CORE_Y, z, 2, { color: SLAGC, speed: [0.1, 0.3], up: [0.3, 0.6], size: [0.3, 0.42], grow: 1.4, life: [0.8, 1.2], opacity: 0.3, gravity: -0.3, drag: 2.2 });
    spray('spark', x, SLAG_CORE_Y, z, 6, { color: KCOAL, speed: [0.2, 0.6], up: [0.2, 0.6], size: [0.03, 0.05], life: [0.5, 0.8], gravity: 3, drag: 1.0, jitter: 0.25 });
  });

  // Bellows Imp — "the fan". The squeeze: a gold flash at the nozzle, then a
  // SHEET of sparks down the cone — the Ember edge over the full cone (the
  // hit) under gold fronts rolling out, streaks of white-gold cinders racing
  // along it, a cloud of sparks that drifts down after, a scorched fan on
  // the floor and the heat-light under it.
  bus.on('bellows_fan', (ev) => {
    mark('bellows_fan');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const ang = Math.atan2(d.z, d.x);
    const r = ev.radius ?? 3.4;
    const half = ((ev.halfAngleDeg ?? 30) * Math.PI) / 180;
    const span = half * 2;
    const nx = ev.x + d.x * 0.35;
    const nz = ev.z + d.z * 0.35;
    SF.flare(nx, NOZZLE_Y, nz, KGOLD, 0.8, { kind: 'burst', life: 0.16, core: KHEAT, angle: ang });
    kit.flash({ x: nx, y: NOZZLE_Y, z: nz, color: KHEAT, size: 0.6, life: 0.12 });
    // The hit: the Ember edge over the full cone at once.
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.55, width: r * 0.9, span, sweep: 0.05, life: 0.24, core: EMBER, glow: EMBER, soft: 0.8, y: 0.12, lift: 0, grow: 0.3, gain: 0.5, opacity: 0.42 });
    // The sheet: gold fronts rolling down the cone, each wider and fainter.
    for (let i = 0; i < 4; i++) {
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 0.5 + i * 0.75, width: 0.16 - i * 0.02, span: span * (0.8 + i * 0.07), sweep: 0.04, life: 0.32, core: i === 0 ? KHEAT : KSPARK, glow: KGOLD, soft: 0.55, y: 0.55 - 0.1 * i, lift: 0, grow: 1.3, delay: i * 0.06, gain: 0.9 - i * 0.15, opacity: 0.9 - i * 0.17 });
    }
    // Cinders racing down the cone, fanned across it.
    for (let i = 0; i < N(9); i++) {
      const a = ang + rnd(-half, half) * 0.95;
      const ux = Math.cos(a);
      const uz = Math.sin(a);
      const sp = rnd(7, 11);
      const reach = r * rnd(0.75, 1.0);
      const y0 = rnd(0.35, NOZZLE_Y);
      kit.streak({ a: { x: nx, y: y0, z: nz }, b: { x: nx + ux * 0.35, y: y0, z: nz + uz * 0.35 }, width: 0.05, tailW: 0, core: KHEAT, glow: KGOLD, life: reach / sp, delay: rnd(0, 0.08), travel: { x: ux * sp, y: -y0 * 0.6 * (sp / reach), z: uz * sp }, fall: 1.0, opacity: 0.9 });
    }
    spray('spark', nx, NOZZLE_Y - 0.1, nz, 22, { color: KSPARK, speed: [3.0, 6.0], up: [-0.2, 0.6], size: [0.03, 0.06], life: [0.35, 0.6], gravity: 1.5, drag: 1.4, dir: d, dirBias: 0.92 });
    spray('spark', ev.x + d.x * r * 0.7, 0.5, ev.z + d.z * r * 0.7, 10, { color: KGOLD, speed: [0.05, 0.3], up: [-0.3, 0.1], size: [0.03, 0.05], life: [0.8, 1.3], gravity: 0.6, drag: 1.6, jitter: r * 0.3, opacity: 0.75 });
    spray('smoke', ev.x + d.x * r * 0.6, 0.2, ev.z + d.z * r * 0.6, 3, { color: KBRICK, speed: [0.5, 1.0], up: [0.2, 0.5], size: [0.32, 0.46], grow: 1.4, life: [0.7, 1.0], opacity: 0.24, gravity: -0.2, drag: 2.2, dir: d, dirBias: 0.7, jitter: r * 0.15 });
    kit.mark({ x: ev.x + d.x * r * 0.55, z: ev.z + d.z * r * 0.55, radius: r * 0.55, kind: 'gouge', angle: ang, stretch: 1.6, stain: INK, glow: KGOLD, glowOpacity: 0.4, cool: 0.8, life: 2.4, opacity: 0.25 });
    kit.light({ x: ev.x + d.x * r * 0.5, z: ev.z + d.z * r * 0.5, radius: r * 0.6, color: KGOLD, opacity: 0.4, life: 0.4, attack: 0.02 });
  });
  // A stun chokes the fan: the bellows wheeze empty — a cough of soot from
  // the nozzle, a dribble of dull sparks falling straight down, nothing
  // thrown out.
  bus.on('bellows_choke', (ev) => {
    mark('bellows_choke');
    const b = SF.byId(ev.id);
    const d = faceOf(b);
    const x = (b ? b.x : ev.x) + d.x * 0.35;
    const z = (b ? b.z : ev.z) + d.z * 0.35;
    kit.flash({ x, y: NOZZLE_Y, z, color: KCOAL, size: 0.45, life: 0.16, opacity: 0.6 });
    spray('smoke', x, NOZZLE_Y, z, 3, { color: LEATHER, speed: [0.2, 0.6], up: [0.0, 0.3], size: [0.2, 0.32], grow: 1.5, life: [0.6, 0.9], opacity: 0.4, gravity: -0.2, drag: 2.4, dir: d, dirBias: 0.6 });
    spray('spark', x, NOZZLE_Y, z, 6, { color: KCOAL, speed: [0.1, 0.4], up: [-0.2, 0.2], size: [0.03, 0.05], life: [0.35, 0.6], gravity: 4, drag: 0.8 });
    spray('spark', x, NOZZLE_Y, z, 3, { color: KGOLD, speed: [0.2, 0.6], up: [0.0, 0.3], size: [0.03, 0.04], life: [0.2, 0.35], gravity: 4, drag: 0.8, dir: d, dirBias: 0.5 });
  });

  // Cinder Moth — "the flare". The ash catches all at once: a white-gold
  // star in the air, the Ember ring at the flare's radius (the hit), a
  // burst of cinders thrown out in a sphere and falling slow, gold rings,
  // ash flakes drifting down where it burnt out, a scorched ring.
  bus.on('cindermoth_flare', (ev) => {
    mark('cindermoth_flare');
    const r = ev.radius ?? 1.2;
    const m = SF.byId(ev.id);
    const mx = m ? m.x : ev.x;
    const mz = m ? m.z : ev.z;
    SF.anticipate(mx, mz, 0.45, KGOLD, { y: MOTH_Y, lines: 5, core: KHEAT });
    after(ANTICIP, () => {
      SF.flare(mx, MOTH_Y, mz, KGOLD, 1.4, { kind: 'burst', life: 0.28, core: PARCH });
      kit.flash({ x: mx, y: MOTH_Y, z: mz, color: KHEAT, size: 1.2, life: 0.16 });
      kit.flash({ x: mx, y: MOTH_Y, z: mz, color: KGOLD, size: 2.0, life: 0.45, hold: 0.04, opacity: 0.5 });
      // The hit: Ember out to the radius on the floor.
      SF.shock(ev.x, ev.z, r, EMBER, { life: 0.28, width: 0.12 });
      kit.ring({ x: ev.x, z: ev.z, r0: r * 0.95, r1: r * 1.02, width: 0.09, life: 0.3, core: EMBER, glow: EMBER, soft: 0.5, y: 0.05, opacity: 0.75, delay: 0.14 });
      // The heat: gold rings, one in the air and one rolling on the floor.
      kit.ring({ x: mx, z: mz, r0: 0.2, r1: r * 1.1, width: 0.07, life: 0.4, core: KHEAT, glow: KGOLD, soft: 0.6, y: MOTH_Y - 0.1, opacity: 0.8, thin: 0.5 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: r * 1.3, width: 0.12, life: 0.5, core: KGOLD, glow: KGOLD, soft: 0.7, y: 0.07, delay: 0.05, opacity: 0.6, gain: 0.7 });
      spray('spark', mx, MOTH_Y, mz, 18, { color: KSPARK, speed: [1.2, 2.8], up: [-0.6, 1.2], size: [0.04, 0.07], life: [0.5, 0.9], gravity: 1.0, drag: 1.3 });
      spray('spark', mx, MOTH_Y, mz, 6, { color: KHEAT, speed: [0.8, 1.8], up: [-0.3, 0.8], size: [0.05, 0.08], life: [0.2, 0.4], drag: 1.0 });
      spray('shard', mx, MOTH_Y, mz, 7, { color: MASH, tile: SHARD_TILE.petal, speed: [0.3, 0.9], up: [0.2, 0.7], size: [0.08, 0.13], life: [1.4, 2.0], gravity: 0.35, drag: 1.8, spin: [-4, 4], flutter: 0.8, opacity: 0.85 });
      spray('smoke', mx, MOTH_Y - 0.1, mz, 3, { color: MASH, speed: [0.2, 0.5], up: [0.2, 0.5], size: [0.3, 0.42], grow: 1.5, life: [0.9, 1.3], opacity: 0.24, gravity: -0.2, drag: 2.2 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.05, kind: 'scorch', stain: INK, glow: KGOLD, glowOpacity: 0.4, cool: 0.8, life: 2.6, opacity: 0.28 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: KGOLD, opacity: 0.5, life: 0.5, attack: 0.02 });
    });
  });
  // A stun snuffs it mid-kindle: the glow pinched out — a dark puff of ash
  // smoke, a few dying cinders falling, no ring.
  bus.on('cindermoth_snuff', (ev) => {
    mark('cindermoth_snuff');
    const m = SF.byId(ev.id);
    const x = m ? m.x : ev.x;
    const z = m ? m.z : ev.z;
    kit.flash({ x, y: MOTH_Y, z, color: KCOAL, size: 0.6, life: 0.22, grow: -0.5, opacity: 0.7 });
    spray('smoke', x, MOTH_Y, z, 3, { color: INK, speed: [0.1, 0.35], up: [0.2, 0.5], size: [0.24, 0.36], grow: 1.6, life: [0.7, 1.1], opacity: 0.32, gravity: -0.3, drag: 2.4 });
    spray('spark', x, MOTH_Y - 0.1, z, 6, { color: KCOAL, speed: [0.05, 0.3], up: [-0.3, 0.1], size: [0.03, 0.05], life: [0.6, 1.0], gravity: 1.2, drag: 1.4, jitter: 0.15 });
    spray('shard', x, MOTH_Y, z, 3, { color: MASH, tile: SHARD_TILE.petal, speed: [0.1, 0.4], up: [0.0, 0.3], size: [0.07, 0.1], life: [1.2, 1.7], gravity: 0.35, drag: 1.8, spin: [-3, 3], flutter: 0.8, opacity: 0.8 });
  });
  // It catches light again: gold motes drawn in, a soft bloom, cinders
  // lifting off it.
  bus.on('cindermoth_relight', (ev) => {
    mark('cindermoth_relight');
    const m = SF.byId(ev.id);
    const x = m ? m.x : ev.x;
    const z = m ? m.z : ev.z;
    const y = 0.9;
    for (let i = 0; i < N(5); i++) {
      const a = (i / 5) * TAU + rnd(-0.3, 0.3);
      const rr = rnd(0.45, 0.7);
      kit.streak({ a: { x: x + Math.cos(a) * rr, y: y + rnd(-0.2, 0.2), z: z + Math.sin(a) * rr }, b: { x: x + Math.cos(a) * (rr - 0.12), y, z: z + Math.sin(a) * (rr - 0.12) }, width: 0.04, tailW: 0, core: KHEAT, glow: KGOLD, life: 0.18, travel: { x: -Math.cos(a) * rr * 4.5, y: 0, z: -Math.sin(a) * rr * 4.5 }, fall: 1.0, opacity: 0.85 });
    }
    after(0.16, () => {
      kit.flash({ x, y, z, color: KGOLD, size: 0.9, life: 0.35, opacity: 0.6 });
      kit.light({ x, z, radius: 1.0, color: KGOLD, opacity: 0.35, life: 0.45, attack: 0.05 });
      SF.embersUp(x, z, KSPARK, 5, { radius: 0.2, y });
    });
  });

  // Their deaths, on top of enemyDeath's shared break.
  Object.assign(CREATURE_DEATH, {
    newt: (es, matter, x, z) => {
      // Its belly bursts like a coal: a gold pop, cinders, hide flakes.
      mark('newt_death');
      SF.flare(x, NEWT_Y, z, KGOLD, 0.8, { kind: 'burst', life: 0.2, core: KHEAT });
      spray('spark', x, NEWT_Y, z, 10, { color: KSPARK, speed: [0.8, 2.0], up: [0.8, 1.8], size: [0.04, 0.07], life: [0.4, 0.8], gravity: 3, drag: 0.9 });
      SF.embersUp(x, z, KGOLD, 4, { radius: 0.25, y: 0.15 });
      kit.mark({ x, z, radius: 0.6, kind: 'scorch', stain: INK, glow: KGOLD, glowOpacity: 0.5, cool: 1.0, life: 2.6, opacity: 0.35 });
      spray('chunk', x, NEWT_Y, z, 3, { color: NHIDE, speed: [0.6, 1.4], up: [0.8, 1.5], size: [0.04, 0.07], life: [0.4, 0.7] });
    },
    slag: (es, matter, x, z) => {
      // The crust falls apart in slabs and the core spills out across the
      // floor, glows, and goes dark.
      mark('slag_death');
      SF.flare(x, 0.9, z, KGOLD, 1.3, { kind: 'burst', life: 0.28, core: KHEAT });
      SF.shock(x, z, 1.5, SLAGC, { life: 0.5, width: 0.22, core: BONE, jag: 0.9 });
      spray('chunk', x, 0.9, z, 12, { color: SLAGC, speed: [0.8, 2.2], up: [0.8, 2.2], size: [0.1, 0.2], life: [0.6, 1.0], jitter: 0.35 });
      spray('spark', x, 0.8, z, 14, { color: KGOLD, speed: [0.6, 1.8], up: [1.2, 2.6], size: [0.06, 0.1], life: [0.5, 0.9], gravity: 6, drag: 0.5, jitter: 0.25 });
      spray('smoke', x, 0.6, z, 5, { color: SLAGC, speed: [0.4, 1.0], up: [0.3, 0.7], size: [0.42, 0.6], grow: 1.5, life: [1.0, 1.5], opacity: 0.36, gravity: -0.2, drag: 2.0, jitter: 0.4 });
      kit.crack({ x, z, radius: 1.0, glow: KGOLD, life: 2.0, cool: 1.5 });
      kit.mark({ x, z, radius: 1.3, kind: 'crater', stain: SLAGC, glow: KGOLD, glowOpacity: 0.6, cool: 2.0, life: 4.0, opacity: 0.5 });
      kit.light({ x, z, radius: 1.6, color: KGOLD, opacity: 0.5, life: 1.4, attack: 0.03 });
    },
    bellows: (es, matter, x, z) => {
      // The bellows burst: a gasp of soot and sparks out of the split
      // leather, scraps of it flapping down.
      mark('bellows_death');
      kit.flash({ x, y: 0.8, z, color: KGOLD, size: 0.8, life: 0.2, opacity: 0.7 });
      spray('smoke', x, 0.8, z, 5, { color: LEATHER, speed: [0.6, 1.4], up: [0.3, 0.8], size: [0.3, 0.44], grow: 1.6, life: [0.7, 1.1], opacity: 0.4, gravity: -0.2, drag: 2.2 });
      spray('spark', x, 0.8, z, 12, { color: KSPARK, speed: [1.0, 2.4], up: [0.4, 1.4], size: [0.03, 0.06], life: [0.3, 0.6], gravity: 2.5, drag: 1.0 });
      spray('shard', x, 0.8, z, 6, { color: LEATHER, tile: SHARD_TILE.petal, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.1, 0.15], life: [0.8, 1.2], gravity: 2.5, drag: 1.2, spin: [-8, 8], flutter: 0.4 });
    },
    cindermoth: (es, matter, x, z) => {
      // It crumbles to ash in the air: flakes drifting down, the last
      // cinders winking out as they fall.
      mark('cindermoth_death');
      kit.flash({ x, y: 1.1, z, color: KGOLD, size: 0.7, life: 0.2, opacity: 0.6 });
      spray('shard', x, 1.15, z, 12, { color: MASH, tile: SHARD_TILE.petal, speed: [0.2, 0.8], up: [0.0, 0.5], size: [0.08, 0.14], life: [1.5, 2.3], gravity: 0.3, drag: 1.8, spin: [-4, 4], flutter: 0.85 });
      spray('spark', x, 1.1, z, 8, { color: KSPARK, speed: [0.1, 0.5], up: [-0.4, 0.2], size: [0.03, 0.05], life: [0.7, 1.2], gravity: 0.6, drag: 1.4, jitter: 0.2 });
      spray('smoke', x, 1.1, z, 2, { color: MASH, speed: [0.1, 0.3], up: [0.1, 0.3], size: [0.3, 0.42], grow: 1.5, life: [0.9, 1.3], opacity: 0.22, gravity: -0.1, drag: 2.2 });
    },
  });

  // ... and its two more (content plan 5 slice 9, docs/KILN.md "Two more
  // creatures"), in the same rule: Ember only on the ring that hurts, the
  // rest Kiln Gold over soot and ash.
  const SACK = vfxMatterColor('coalsack');
  const ASHG = vfxMatterColor('ashgrey');
  const HURL_Y = 1.5; // the sack over the Hurler's head at the top of the swing
  const WRAITH_Y = 1.3; // the Wraith's ember heart

  // Coal Hurler — "the mortar". The swing: the sack goes back over its head
  // and the live coal leaves it on a high arc, a gold head with a smoking
  // trail, landing as the warning closes. Timed off the telegraph so the
  // coal is seen in the air over the ring.
  const HURL_FLIGHT = 0.42; // s in the air, the last part of the 66-tick warning
  bus.on('telegraph_start', (ev) => {
    if (ev.etype !== 'hurler') return;
    const h = SF.byId(ev.id);
    if (!h) return;
    const lead = Math.max(0, (ev.resolveTick - (world.tick ?? 0)) / 60 - HURL_FLIGHT);
    const x0 = h.x;
    const z0 = h.z;
    // The sack glows as it is swung back.
    spray('spark', x0, 1.0, z0, 4, { color: KGOLD, speed: [0.05, 0.25], up: [0.4, 0.9], size: [0.03, 0.06], life: [0.4, 0.7], gravity: -0.2, drag: 1.4, jitter: 0.3 });
    after(lead, () => {
      mark('hurler_flight');
      const x1 = ev.x;
      const z1 = ev.z;
      const steps = N(9);
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const x = x0 + (x1 - x0) * k;
        const z = z0 + (z1 - z0) * k;
        const y = HURL_Y + (0.2 - HURL_Y) * k + 2.4 * k * (1 - k) * 2;
        after(HURL_FLIGHT * k, () => {
          kit.flash({ x, y, z, color: KHEAT, size: 0.32, life: 0.09, opacity: 0.95 });
          spray('spark', x, y, z, 1, { color: KGOLD, speed: [0.05, 0.25], up: [-0.3, 0.1], size: [0.04, 0.07], life: [0.25, 0.45], gravity: 2, drag: 1.2 });
          if (i % 2 === 0) spray('smoke', x, y, z, 1, { color: KBRICK, speed: [0.05, 0.15], up: [0.1, 0.3], size: [0.14, 0.22], grow: 1.6, life: [0.45, 0.7], opacity: 0.28, gravity: -0.2, drag: 2.2 });
        });
      }
    });
  });
  // The landing: the Ember ring at the coal's radius (the hit), the coal
  // bursting into a fan of gold cinders that bounce and settle, a scorch and
  // the cinder bed glowing (the bed itself is the slick, extras.js).
  bus.on('hurler_coal', (ev) => {
    mark('hurler_coal');
    const r = ev.radius ?? 1.3;
    SF.flare(ev.x, 0.3, ev.z, EMBER, 1.1, { kind: 'burst', life: 0.2, core: KHEAT });
    SF.shock(ev.x, ev.z, r * 1.02, EMBER, { life: 0.28, width: 0.11, jag: 0.5 });
    kit.flash({ x: ev.x, y: 0.3, z: ev.z, color: KHEAT, size: 0.8, life: 0.14 });
    spray('spark', ev.x, 0.2, ev.z, 16, { color: KGOLD, speed: [1.2, 2.8], up: [1.4, 3.0], size: [0.05, 0.1], life: [0.5, 0.85], gravity: 7, drag: 0.5, jitter: 0.2 });
    spray('spark', ev.x, 0.2, ev.z, 8, { color: KSPARK, speed: [0.6, 1.6], up: [0.4, 1.2], size: [0.03, 0.06], life: [0.3, 0.6], gravity: 4, drag: 0.8, jitter: 0.25 });
    spray('chunk', ev.x, 0.2, ev.z, 5, { color: KCOAL, speed: [0.8, 1.8], up: [0.8, 1.8], size: [0.05, 0.09], life: [0.5, 0.8], jitter: 0.2 });
    spray('smoke', ev.x, 0.2, ev.z, 3, { color: KBRICK, speed: [0.3, 0.8], up: [0.3, 0.7], size: [0.32, 0.46], grow: 1.5, life: [0.8, 1.2], opacity: 0.3, gravity: -0.25, drag: 2.2, jitter: 0.3 });
    kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'scorch', stain: INK, glow: KGOLD, glowOpacity: 0.55, cool: 1.4, life: 3.0, opacity: 0.4 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: KGOLD, opacity: 0.4, life: 0.5, attack: 0.02 });
  });
  // A stun makes it fumble: the sack drops, a cough of soot and a spill of
  // dull coals at its own feet, nothing thrown.
  bus.on('hurler_fumble', (ev) => {
    mark('hurler_fumble');
    const h = SF.byId(ev.id);
    const x = h ? h.x : ev.x;
    const z = h ? h.z : ev.z;
    spray('smoke', x, 1.0, z, 3, { color: SACK, speed: [0.2, 0.5], up: [0.1, 0.4], size: [0.22, 0.34], grow: 1.5, life: [0.6, 0.9], opacity: 0.4, gravity: -0.2, drag: 2.4 });
    spray('chunk', x, 1.0, z, 4, { color: KCOAL, speed: [0.2, 0.6], up: [0.2, 0.6], size: [0.04, 0.07], life: [0.4, 0.6] });
    spray('spark', x, 0.9, z, 5, { color: KCOAL, speed: [0.1, 0.4], up: [-0.1, 0.2], size: [0.03, 0.05], life: [0.35, 0.6], gravity: 4, drag: 0.8 });
  });

  // Ash Wraith — "the step behind you". The fade: it comes apart into a
  // twist of grey ash that spirals up and away, its ember winking out; a
  // thin ash wisp runs low over the floor toward the mark, and at the mark
  // the ash gathers (grey motes drawn in, a faint gold heart kindling) until
  // it rises.
  bus.on('ashwraith_fade', (ev) => {
    mark('ashwraith_fade');
    const { x, z } = ev;
    for (let i = 0; i < N(10); i++) {
      const a = (i / 10) * TAU;
      spray('smoke', x + Math.cos(a) * 0.25, 0.4 + i * 0.12, z + Math.sin(a) * 0.25, 1, { color: ASHG, speed: [0.3, 0.6], up: [0.6, 1.2], size: [0.26, 0.4], grow: 1.6, life: [0.7, 1.1], opacity: 0.4, gravity: -0.4, drag: 1.8, dir: { x: -Math.sin(a), z: Math.cos(a) }, dirBias: 0.7 });
    }
    kit.flash({ x, y: WRAITH_Y, z, color: KGOLD, size: 0.5, life: 0.22, grow: -0.6, opacity: 0.7 });
    spray('spark', x, WRAITH_Y, z, 6, { color: KCOAL, speed: [0.1, 0.4], up: [0.2, 0.6], size: [0.03, 0.05], life: [0.4, 0.7], gravity: 1.5, drag: 1.2 });
    if (Number.isFinite(ev.toX)) {
      const d = unit2(ev.toX - x, ev.toZ - z);
      const len = Math.hypot(ev.toX - x, ev.toZ - z);
      kit.streak({ a: { x, y: 0.12, z }, b: { x: x + d.x * 0.6, y: 0.12, z: z + d.z * 0.6 }, width: 0.18, tailW: 0.4, core: ASHG, glow: ASHG, life: 0.5, travel: { x: d.x * (len / 0.5), y: 0, z: d.z * (len / 0.5) }, fall: 0.6, opacity: 0.35 });
      after(0.35, () => {
        for (let i = 0; i < N(8); i++) {
          const a = rnd(0, TAU);
          kit.streak({ a: { x: ev.toX + Math.cos(a) * 1.2, y: 0.4, z: ev.toZ + Math.sin(a) * 1.2 }, b: { x: ev.toX + Math.cos(a) * 0.9, y: 0.45, z: ev.toZ + Math.sin(a) * 0.9 }, width: 0.06, tailW: 0, core: BONE, glow: ASHG, life: 0.3, delay: i * 0.05, travel: { x: -Math.cos(a) * 3, y: 0.6, z: -Math.sin(a) * 3 }, fall: 1.0, opacity: 0.6 });
        }
        kit.flash({ x: ev.toX, y: 0.5, z: ev.toZ, color: KCOAL, size: 0.7, life: 0.5, hold: 0.2, opacity: 0.45 });
      });
    }
  });
  // The rise and the rake: a column of ash bursts up on the mark, three
  // claw strokes rake across the ring (Ember: the hit), sparks off the
  // claws, and ash raining back.
  bus.on('ashwraith_rake', (ev) => {
    mark('ashwraith_rake');
    const r = ev.radius ?? 1.3;
    const w = SF.byId(ev.id);
    const d = faceOf(w);
    const ang = Math.atan2(d.z, d.x);
    kit.pillar({ x: ev.x, z: ev.z, radius: 0.5, height: 2.6, color: ASHG, life: 0.5, opacity: 0.45 });
    spray('smoke', ev.x, 0.3, ev.z, 6, { color: ASHG, speed: [0.6, 1.4], up: [0.8, 1.8], size: [0.32, 0.48], grow: 1.6, life: [0.8, 1.2], opacity: 0.42, gravity: -0.2, drag: 2.0, jitter: 0.3 });
    SF.flare(ev.x, WRAITH_Y, ev.z, KGOLD, 0.9, { kind: 'burst', life: 0.2, core: KHEAT });
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.35;
      kit.slash({ x: ev.x - d.x * 0.3 - d.z * off, z: ev.z - d.z * 0.3 + d.x * off, angle: ang, radius: r * 0.8, width: 0.12, span: 1.6, sweep: 0.08, life: 0.22, core: PARCH, glow: EMBER, soft: 0.6, y: 0.9 - i * 0.15, lift: 0.2, delay: i * 0.04, gain: 0.8, opacity: 0.85 });
    }
    SF.shock(ev.x, ev.z, r * 1.02, EMBER, { life: 0.28, width: 0.1, jag: 0.5 });
    spray('spark', ev.x, 0.9, ev.z, 10, { color: KSPARK, speed: [1.0, 2.4], up: [0.2, 1.0], size: [0.03, 0.06], life: [0.25, 0.5], gravity: 3, drag: 0.9, dir: d, dirBias: 0.5 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 0.9, kind: 'gouge', angle: ang, stretch: 1.4, stain: INK, glow: KGOLD, glowOpacity: 0.35, cool: 0.8, life: 2.2, opacity: 0.3 });
    after(0.15, () => spray('shard', ev.x, 2.0, ev.z, 8, { color: ASHG, tile: SHARD_TILE.petal, speed: [0.2, 0.7], up: [-0.2, 0.3], size: [0.08, 0.13], life: [1.2, 1.8], gravity: 0.3, drag: 1.8, spin: [-4, 4], flutter: 0.8, jitter: 0.5 }));
  });
  // Spent no longer: the ember catches again.
  bus.on('ashwraith_recover', (ev) => {
    mark('ashwraith_recover');
    const w = SF.byId(ev.id);
    const x = w ? w.x : ev.x;
    const z = w ? w.z : ev.z;
    kit.flash({ x, y: WRAITH_Y, z, color: KGOLD, size: 0.45, life: 0.3, opacity: 0.6 });
    SF.embersUp(x, z, KSPARK, 3, { radius: 0.15, y: WRAITH_Y });
  });
  Object.assign(CREATURE_DEATH, {
    hurler: (es, matter, x, z) => {
      // The sack splits: live coals spilled across the floor, soot.
      mark('hurler_death');
      SF.flare(x, 0.9, z, KGOLD, 0.9, { kind: 'burst', life: 0.22, core: KHEAT });
      spray('chunk', x, 0.9, z, 8, { color: KCOAL, speed: [0.8, 2.0], up: [0.8, 1.8], size: [0.05, 0.09], life: [0.5, 0.9], jitter: 0.25 });
      spray('spark', x, 0.9, z, 12, { color: KGOLD, speed: [0.8, 2.0], up: [0.8, 2.0], size: [0.04, 0.08], life: [0.5, 0.9], gravity: 5, drag: 0.6 });
      spray('smoke', x, 0.8, z, 4, { color: SACK, speed: [0.4, 1.0], up: [0.3, 0.8], size: [0.3, 0.44], grow: 1.6, life: [0.8, 1.2], opacity: 0.4, gravity: -0.2, drag: 2.2 });
      kit.mark({ x, z, radius: 0.9, kind: 'scorch', stain: INK, glow: KGOLD, glowOpacity: 0.5, cool: 1.4, life: 3.0, opacity: 0.4 });
    },
    ashwraith: (es, matter, x, z) => {
      // It falls to ash where it stands: a collapse of grey, the last
      // ember dropping to the floor and going out.
      mark('ashwraith_death');
      spray('smoke', x, 1.0, z, 7, { color: ASHG, speed: [0.3, 0.9], up: [-0.2, 0.4], size: [0.34, 0.5], grow: 1.5, life: [0.9, 1.4], opacity: 0.42, gravity: 0.2, drag: 2.0, jitter: 0.35 });
      spray('shard', x, 1.4, z, 12, { color: ASHG, tile: SHARD_TILE.petal, speed: [0.2, 0.8], up: [0.0, 0.5], size: [0.08, 0.14], life: [1.4, 2.0], gravity: 0.4, drag: 1.8, spin: [-4, 4], flutter: 0.8 });
      kit.streak({ a: { x, y: WRAITH_Y, z }, b: { x, y: 0.1, z }, width: 0.08, tailW: 0, core: KHEAT, glow: KGOLD, life: 0.3, fall: 1.0, opacity: 0.8 });
      after(0.3, () => {
        kit.flash({ x, y: 0.1, z, color: KGOLD, size: 0.5, life: 0.4, grow: -0.5, opacity: 0.7 });
        spray('spark', x, 0.1, z, 6, { color: KCOAL, speed: [0.2, 0.6], up: [0.3, 0.8], size: [0.03, 0.05], life: [0.4, 0.8], gravity: 2, drag: 1.0 });
      });
    },
  });

  return { KCLOTH, BRONZE, SSTONE, HEMP, GUST, KITE_Y, BELL_Y, VANE_Y, SAC_BELL_Y, sacristanGather, KGOLD, KHEAT, KSPARK, KCOAL, SLAGC, NHIDE, LEATHER, MASH, KBRICK, NEWT_Y, SLAG_CORE_Y, NOZZLE_Y, MOTH_Y, SACK, ASHG, HURL_Y, WRAITH_Y, HURL_FLIGHT };
}
