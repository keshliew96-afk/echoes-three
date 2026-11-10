// THE CONTENT SLICE 2 AND HOLLOW HEART FOE LOOKS: the wasp, the lamprey, the
// wisp and the other slice 2 creatures, and the Heart's crystal foes.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxMatterColor } from '../../../data/vfx.js';
import { BONE, EMBER, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../../enemies/style.js';
import { PALETTE } from '../../../data/palette.js';

export function createSigFoes2(ctx) {
  const { sv, SF, ANTICIP, CREATURE_DEATH, N, SILT, after, bus, kit, mark, rnd, spray, unit2 } = ctx;

  // ------------------------------------------------- content slice 2 --
  // (docs/CONTENT_PLAN.md §2.4 / §3, design-VFX.md §5c / §6c) The six
  // slice-2 enemies and each act's second boss, built to the AAA layering
  // above: anticipation drawn in, a white-hot landing frame, a shockwave
  // and a ground mark that cools. Same law: Ember only on the threat itself,
  // the body's own matter on what breaks, indigo for a rank-and-file ward,
  // violet for a boss; no camera on rank-and-file enemies.
  const BRAMBLE = vfxMatterColor('bramble');
  const WASP = vfxMatterColor('wasp');
  const CARAPACE = vfxMatterColor('carapace');
  const EEL = vfxMatterColor('eel');
  const WISP = vfxMatterColor('wisp');
  const BONEPLATE = vfxMatterColor('boneplate');
  const IRON = vfxMatterColor('iron');
  const OAK = vfxMatterColor('oak');
  const DIRT = vfxMatterColor('dirt');
  const faceOf = (e, fx = 0, fz = 1) => unit2(e?.faceX ?? fx, e?.faceZ ?? fz);
  // Thorns punching up out of the floor: short slanted streaks from the
  // ground to a tip, snapping in and falling back.
  function spikes(x, z, radius, n, color, { h = 0.55, delay = 0, life = 0.45, core = BONE } = {}) {
    for (let i = 0; i < N(n); i++) {
      const a = (i / n) * TAU + rnd(-0.3, 0.3);
      const r = radius * Math.sqrt(rnd(0.15, 1));
      const bx = x + Math.cos(a) * r;
      const bz = z + Math.sin(a) * r;
      const lean = rnd(0.1, 0.3);
      kit.streak({ a: { x: bx, y: 0.02, z: bz }, b: { x: bx + Math.cos(a) * lean, y: h * rnd(0.7, 1.2), z: bz + Math.sin(a) * lean }, width: 0.07, tailW: 0, core, glow: color, life, delay: delay + rnd(0, 0.06), fall: 2.2, opacity: 0.95 });
    }
  }
  // A body driving down a lane: a floor wake laid at the drive's own speed,
  // a spearhead running down it, and stains dropped as it passes.
  function laneDrive(x, z, d, len, speed, { wake, wakeW = 0.5, head, peak, stain, glow = null, marks = 3, markKind = 'gouge' }) {
    const sweep = len / speed;
    kit.streak({ a: { x, y: 0.06, z }, b: { x: x + d.x * len, y: 0.06, z: z + d.z * len }, width: wakeW, tailW: 0.35, core: wake, glow: wake, life: sweep + 0.5, fall: 0.8, opacity: 0.45 });
    kit.streak({ a: { x, y: 0.6, z }, b: { x: x + d.x * 0.9, y: 0.6, z: z + d.z * 0.9 }, width: 0.08, tailW: 0.55, core: PARCH, glow: head, life: sweep, travel: { x: d.x * speed, y: 0, z: d.z * speed }, fall: 0.4 });
    SF.flare(x + d.x * 0.6, 0.6, z + d.z * 0.6, head, 1.3, { life: 0.2, core: peak, angle: Math.atan2(d.z, d.x) });
    for (let i = 1; i <= marks; i++) {
      const k = i / (marks + 0.5);
      kit.mark({ x: x + d.x * len * k, z: z + d.z * len * k, radius: 1.1, kind: markKind, angle: Math.atan2(d.z, d.x), stretch: 1.8, stain, glow, glowOpacity: 0.35, cool: 0.6, life: 2.8, opacity: 0.42, delay: (len * k) / speed });
    }
  }

  // Briar Wasp — "a string of stings". Each dart is a thin Ember needle that
  // runs the short lane at the dart's own speed with an ochre buzz of wing
  // dust behind it; a swarm reads as three quick stitches, never the moth's
  // one long smear.
  function waspDart(ev) {
    mark('wasp_dart');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 3.6;
    const ang = Math.atan2(d.z, d.x);
    SF.anticipate(ev.x, ev.z, 0.45, EMBER, { y: 0.9, lines: 4 });
    kit.streak({ a: { x: ev.x, y: 0.9, z: ev.z }, b: { x: ev.x + d.x * 0.5, y: 0.85, z: ev.z + d.z * 0.5 }, width: 0.05, tailW: 0.3, core: PARCH, glow: EMBER, life: len / 9, travel: { x: d.x * 9, y: -0.1, z: d.z * 9 }, fall: 0.6 });
    kit.streak({ a: { x: ev.x, y: 0.88, z: ev.z }, b: { x: ev.x + d.x * len, y: 0.7, z: ev.z + d.z * len }, width: 0.035, tailW: 0, core: WASP, glow: WASP, life: len / 9 + 0.35, fall: 1.4, opacity: 0.5 });
    SF.flare(ev.x + d.x * 0.3, 0.9, ev.z + d.z * 0.3, EMBER, 0.6, { life: 0.12, angle: ang });
    spray('spark', ev.x, 0.9, ev.z, 5, { color: WASP, speed: [0.2, 0.6], up: [-0.3, 0.2], size: [0.03, 0.06], life: [0.5, 0.8], gravity: 0.4, drag: 1.6, jitter: 0.2, opacity: 0.7, dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
  }
  function waspDartEnd(ev) {
    mark('wasp_dart_end');
    SF.flare(ev.x, 0.6, ev.z, EMBER, 0.5, { kind: 'burst', life: 0.12 });
    spray('spark', ev.x, 0.6, ev.z, 4, { color: WASP, speed: [0.3, 0.8], up: [0.0, 0.4], size: [0.03, 0.06], life: [0.4, 0.7], gravity: 0.3, drag: 1.6, opacity: 0.7 });
  }

  // Thornling — "it plants a thicket". The planting is a little eruption of
  // brambles at its feet with the hazard's edge drawn thin in Ember; every
  // prick makes each of its live patches bristle.
  bus.on('thorn_plant', (ev) => {
    mark('thorn_plant');
    const r = ev.radius ?? 1.0;
    SF.anticipate(ev.x, ev.z, r * 0.6, BRAMBLE, { y: 0.2, lines: 5, core: BONE });
    after(ANTICIP, () => {
      kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: r, width: 0.06, life: 0.4, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.7, gain: 0.7 });
      SF.shock(ev.x, ev.z, r * 1.2, BRAMBLE, { life: 0.35, width: 0.12, core: BONE, jag: 0.7 });
      spikes(ev.x, ev.z, r * 0.9, 7, BRAMBLE, { h: 0.5 });
      SF.flare(ev.x, 0.3, ev.z, BRAMBLE, 0.8, { kind: 'burst', life: 0.2, core: BONE });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.4, kind: 'scorch', stain: BRAMBLE, glow: null, life: 4, opacity: 0.4 });
      spray('shard', ev.x, 0.2, ev.z, 6, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.6, 1.4], up: [1.2, 2.2], size: [0.09, 0.13], life: [0.5, 0.8], gravity: 5, spin: [-8, 8], jitter: r * 0.5 });
      spray('chunk', ev.x, 0.15, ev.z, 4, { color: DIRT, speed: [0.4, 1.0], up: [1.2, 2.0], size: [0.05, 0.1], life: [0.4, 0.7], jitter: r * 0.4 });
    });
  });
  bus.on('thorn_prick', (ev) => {
    mark('thorn_prick');
    const t = SF.byId(ev.id);
    for (const pid of t?.patchIds || []) {
      const p = SF.byId(pid);
      if (!p) continue;
      spikes(p.x, p.z, p.radius ?? 1, 4, BRAMBLE, { h: 0.4, life: 0.3 });
      spray('spark', p.x, 0.2, p.z, 3, { color: EMBER, speed: [0.2, 0.5], up: [0.6, 1.0], size: [0.03, 0.06], life: [0.2, 0.35], jitter: (p.radius ?? 1) * 0.6 });
    }
  });

  // Weir Crab — "the claws come down". Two short claw arcs scissor shut
  // across the cone with a white-hot pinch where they meet, weir water
  // thrown off the shell.
  bus.on('crab_snap', (ev) => {
    mark('crab_snap');
    const c = SF.byId(ev.id);
    const d = faceOf(c);
    const ang = Math.atan2(d.z, d.x);
    const tipX = ev.x + d.x * 1.0;
    const tipZ = ev.z + d.z * 1.0;
    for (const s of [-1, 1]) kit.slash({ x: ev.x + -d.z * 0.35 * s, z: ev.z + d.x * 0.35 * s, angle: ang - s * 0.45, radius: 1.0, width: 0.18, span: 0.9, sweep: 0.06, life: 0.24, core: PARCH, glow: EMBER, soft: 0.3, jag: 0.3, lift: 0.04, y: 0.3, gain: 0.9 });
    SF.flare(tipX, 0.35, tipZ, EMBER, 0.95, { kind: 'star', life: 0.18, angle: ang });
    SF.shock(tipX, tipZ, 0.9, CARAPACE, { life: 0.28, width: 0.1, core: BONE });
    kit.mark({ x: tipX, z: tipZ, radius: 0.9, kind: 'splash', stain: vfxMatterColor('water'), glow: null, life: 2.4, opacity: 0.35 });
    spray('shard', tipX, 0.35, tipZ, 6, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.09, 0.13], life: [0.35, 0.6], gravity: 7, drag: 0.4, spin: [-2, 2], dir: d, dirBias: 0.5 });
    spray('spark', tipX, 0.4, tipZ, 4, { color: PARCH, speed: [1.2, 2.4], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.12, 0.22] });
  });

  // Bog Lamprey — "it comes out of the water". It breaks the surface in a
  // ring of foam, the lunge is a water wake ripping down the lane at 10 u/s
  // with a bite at its head, and the beaching is a slap of silt and spray.
  function lampreyRise(ev) {
    mark('lamprey_rise');
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.14, life: 0.45, core: vfxMatterColor('water'), glow: vfxMatterColor('water'), soft: 0.8, y: 0.04, opacity: 0.65 });
    SF.ripples(ev.x, ev.z, 2, 1.1, 0.05);
    spray('shard', ev.x, 0.2, ev.z, 8, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.5, 1.2], up: [1.6, 2.6], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.2 });
    kit.flash({ x: ev.x, y: 0.3, z: ev.z, color: EMBER, size: 0.35, life: 0.12 });
  }
  function lampreyDive(ev) {
    mark('lamprey_dive');
    kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: 0.9, width: 0.12, life: 0.4, core: vfxMatterColor('water'), glow: vfxMatterColor('water'), soft: 0.8, y: 0.04, opacity: 0.55 });
    SF.ripples(ev.x, ev.z, 2, 0.9, 0.1);
    spray('shard', ev.x, 0.15, ev.z, 5, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.4, 1.0], up: [1.0, 1.8], size: [0.08, 0.12], life: [0.4, 0.6], gravity: 7, drag: 0.3 });
  }
  bus.on('lamprey_lunge', (ev) => {
    mark('lamprey_lunge');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 5;
    laneDrive(ev.x, ev.z, d, len, 10, { wake: vfxMatterColor('water'), wakeW: 0.45, head: EMBER, peak: PARCH, stain: SILT, glow: vfxMatterColor('water'), marks: 2, markKind: 'splash' });
    spray('shard', ev.x, 0.2, ev.z, 8, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.2, 2.2], size: [0.09, 0.14], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2], dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
  });
  bus.on('lamprey_beach', (ev) => {
    mark('lamprey_beach');
    SF.flare(ev.x, 0.3, ev.z, EMBER, 0.8, { kind: 'burst', life: 0.18 });
    SF.shock(ev.x, ev.z, 1.1, EEL, { life: 0.32, width: 0.12, core: vfxMatterColor('water') });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.3, kind: 'splash', stain: SILT, glow: null, life: 3.2, opacity: 0.45 });
    spray('shard', ev.x, 0.3, ev.z, 10, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [1.4, 2.4], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2] });
    spray('chunk', ev.x, 0.2, ev.z, 4, { color: SILT, speed: [0.6, 1.2], up: [1.0, 1.8], size: [0.05, 0.1], life: [0.4, 0.7] });
  });

  // Grave Wisp — "it wards its friend". The tether takes with an indigo
  // flare at the wisp and a ward ring closing on the body it protects;
  // while it holds, motes run down the thread and the ward shimmers; a hit
  // the ward eats glints indigo; the snap scatters the thread.
  bus.on('wisp_tether', (ev) => {
    mark('wisp_tether');
    const w = SF.byId(ev.id);
    const t = SF.byId(ev.target);
    const tx = t?.x ?? ev.x;
    const tz = t?.z ?? ev.z;
    if (w) {
      SF.flare(w.x, 0.9, w.z, TELL_INDIGO_GLOW, 0.9, { kind: 'burst', life: 0.24 });
      kit.streak({ a: { x: w.x, y: 0.9, z: w.z }, b: { x: tx, y: 0.6, z: tz }, width: 0.06, tailW: 0.06, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, life: 0.45, fall: 1.2, opacity: 0.85 });
    }
    kit.ring({ x: tx, z: tz, r0: 1.4, r1: 0.5, width: 0.1, life: 0.4, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, soft: 0.5, y: 0.06 });
    kit.mark({ x: tx, z: tz, radius: 1.0, kind: 'sigil', stain: INK, glow: TELL_INDIGO_GLOW, cool: 1.0, life: 1.6, opacity: 0.12 });
    kit.light({ x: tx, z: tz, radius: 1.4, color: TELL_INDIGO_GLOW, opacity: 0.35, life: 0.5 });
  });
  bus.on('wisp_tether_end', (ev) => {
    mark('wisp_tether_snap');
    const w = SF.byId(ev.id);
    const t = SF.byId(ev.target);
    if (!w && !t) return;
    const mx = ((w?.x ?? t.x) + (t?.x ?? w.x)) / 2;
    const mz = ((w?.z ?? t.z) + (t?.z ?? w.z)) / 2;
    kit.flash({ x: mx, y: 0.75, z: mz, color: TELL_INDIGO_GLOW, size: 0.45, life: 0.16 });
    spray('spark', mx, 0.75, mz, 8, { color: TELL_INDIGO_GLOW, speed: [0.6, 1.4], up: [0.0, 0.6], size: [0.04, 0.07], life: [0.3, 0.6], drag: 1.4, jitter: 0.5 });
  });
  bus.on('hit_immune', (ev) => {
    const t = SF.byId(ev.target);
    if (!t || t.wardedBy == null) return;
    mark('wisp_ward_block');
    SF.flare(ev.x, 0.55, ev.z, TELL_INDIGO_GLOW, 0.7, { kind: 'burst', life: 0.16 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.35, r1: 0.8, width: 0.07, life: 0.25, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, soft: 0.4, y: 0.5 });
  });
  function wispFrame(e, rec) {
    const t = SF.byId(e.tetherId);
    if (!t || rec.clock < 0.12) return;
    rec.clock = 0;
    const k = rnd(0, 1);
    spray('spark', e.x + (t.x - e.x) * k, 0.75 + (0.6 - 0.75) * k, e.z + (t.z - e.z) * k, 1, { color: TELL_INDIGO_GLOW, speed: [0.02, 0.1], up: [0.1, 0.3], size: [0.04, 0.07], life: [0.4, 0.6], gravity: -0.2, drag: 1.6, opacity: 0.85 });
    if ((rec.ring = (rec.ring ?? 0) + 1) % 5 === 0) kit.ring({ x: t.x, z: t.z, r0: 0.5, r1: 0.75, width: 0.05, life: 0.5, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, soft: 0.6, y: 0.3, opacity: 0.6 });
  }

  // Bone Knight — "the overhead blow". The 66-tick wind-up gathers into the
  // raised blade; the slam is a falling Ember blade-line, a white-hot impact
  // star, a jagged ring the size of the telegraph, cracks and bone chips.
  bus.on('knight_slam', (ev) => {
    mark('knight_slam');
    const k = SF.byId(ev.id);
    const r = ev.radius ?? 1.4;
    const d = faceOf(k);
    const sx = k ? k.x : ev.x - d.x * 1.1;
    const sz = k ? k.z : ev.z - d.z * 1.1;
    kit.streak({ a: { x: sx, y: 1.9, z: sz }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 0.12, tailW: 0.4, core: PARCH, glow: EMBER, life: 0.2, fall: 2.0 });
    SF.flare(ev.x, 0.35, ev.z, EMBER, 1.5, { kind: 'star', life: 0.24, angle: Math.atan2(d.z, d.x) });
    kit.flash({ x: ev.x, y: 0.4, z: ev.z, color: PARCH, size: 0.8, life: 0.14 });
    SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.32, width: 0.12, jag: 0.7 });
    SF.shock(ev.x, ev.z, r * 1.4, BONEPLATE, { life: 0.5, width: 0.2, core: BONE, delay: 0.04 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: EMBER, life: 1.4, cool: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.3, kind: 'crater', stain: vfxMatterColor('ash'), glow: EMBER, cool: 0.8, life: 3.4, opacity: 0.55 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: EMBER, opacity: 0.4, life: 0.35, attack: 0.02 });
    spray('chunk', ev.x, 0.3, ev.z, 7, { color: vfxMatterColor('earth'), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.14], life: [0.5, 0.8], jitter: 0.3 });
    spray('spark', ev.x, 0.4, ev.z, 7, { color: PARCH, speed: [1.6, 3.2], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.3] });
    spray('smoke', ev.x, 0.2, ev.z, 3, { color: vfxMatterColor('ash'), speed: [0.6, 1.2], up: [0.1, 0.4], size: [0.36, 0.5], grow: 1.4, life: [0.7, 1.0], opacity: 0.3, gravity: -0.15, drag: 2.4, jitter: 0.4 });
  });

  // Their deaths, on top of enemyDeath's shared break.
  Object.assign(CREATURE_DEATH, {
    wasp: (es, matter, x, z) => {
      mark('wasp_death');
      spray('shard', x, 0.9, z, 3, { color: PARCH, tile: SHARD_TILE.petal, speed: [0.3, 0.8], up: [0.2, 0.6], size: [0.08, 0.11], life: [0.8, 1.2], gravity: 0.5, drag: 1.8, spin: [-6, 6], flutter: 0.6, opacity: 0.6 });
      spray('spark', x, 0.9, z, 6, { color: WASP, speed: [0.3, 0.9], up: [0.0, 0.5], size: [0.03, 0.06], life: [0.5, 0.9], gravity: 0.6, drag: 1.4 });
    },
    thornling: (es, matter, x, z) => {
      mark('thornling_death');
      spikes(x, z, 0.5, 5, BRAMBLE, { h: 0.45, life: 0.35 });
      spray('shard', x, 0.35, z, 6, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.8, 1.6], up: [1.0, 1.8], size: [0.09, 0.13], life: [0.5, 0.8], gravity: 5, spin: [-8, 8] });
      spray('shard', x, 0.4, z, 3, { color: BRAMBLE, tile: SHARD_TILE.petal, speed: [0.2, 0.6], up: [0.4, 0.8], size: [0.09, 0.12], life: [1.0, 1.4], gravity: 0.6, drag: 1.8, spin: [-4, 4], flutter: 0.5 });
    },
    crab: (es, matter, x, z) => {
      mark('crab_death');
      spray('chunk', x, 0.35, z, 5, { color: CARAPACE, speed: [1.0, 2.0], up: [1.2, 2.2], size: [0.08, 0.14], life: [0.5, 0.8] });
      spray('shard', x, 0.3, z, 6, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.6, 1.4], up: [1.0, 1.8], size: [0.08, 0.12], life: [0.4, 0.6], gravity: 7, drag: 0.4 });
    },
    lamprey: (es, matter, x, z) => {
      mark('lamprey_death');
      SF.ripples(x, z, 3, 1.2, 0);
      spray('shard', x, 0.3, z, 10, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [1.6, 2.8], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2] });
    },
    gravewisp: (es, matter, x, z) => {
      // The ward light gutters out: an indigo pop and the grave mist sinks.
      mark('gravewisp_death');
      SF.flare(x, 0.9, z, TELL_INDIGO_GLOW, 1.0, { kind: 'burst', life: 0.26 });
      kit.light({ x, z, radius: 1.4, color: TELL_INDIGO_GLOW, opacity: 0.45, life: 0.4 });
      SF.shock(x, z, 1.3, TELL_INDIGO, { life: 0.4, width: 0.08, core: TELL_INDIGO_GLOW, y: 0.6 });
      spray('smoke', x, 0.9, z, 4, { color: WISP, speed: [0.2, 0.6], up: [-0.4, -0.1], size: [0.34, 0.48], grow: 1.5, life: [1.0, 1.4], opacity: 0.35, gravity: 0.25, drag: 2.2, jitter: 0.3 });
      spray('spark', x, 0.9, z, 10, { color: TELL_INDIGO_GLOW, speed: [0.4, 1.2], up: [0.2, 0.8], size: [0.04, 0.08], life: [0.6, 1.0], drag: 1.3 });
    },
    knight: (es, matter, x, z) => {
      // The armour falls apart: bone plates, the shield's iron, the crown's
      // last flash.
      mark('knight_death');
      SF.flare(x, 1.3, z, PALETTE.hearthAmber, 0.9, { kind: 'star', life: 0.24 });
      spray('chunk', x, 0.5, z, 8, { color: BONEPLATE, speed: [1.0, 2.2], up: [1.4, 2.6], size: [0.09, 0.16], life: [0.6, 0.9] });
      spray('chunk', x, 0.5, z, 4, { color: IRON, speed: [0.8, 1.6], up: [1.2, 2.0], size: [0.1, 0.16], life: [0.6, 0.9] });
      spray('spark', x, 0.6, z, 8, { color: PARCH, speed: [1.4, 2.8], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.15, 0.3] });
      kit.mark({ x, z, radius: 1.2, kind: 'crater', stain: vfxMatterColor('ash'), glow: null, life: 3.5, opacity: 0.4 });
    },
  });

  // ------------------------------------------------- the Hollow Heart --
  // Act IV (docs/ACT_IV.md). Down here the violet is the creatures' body, so
  // their beats wear it — but the law holds: whatever HURTS is Ember on the
  // frame it lands (the lance's edge, the slam ring, a shard's ring), the
  // violet only says what it was made of. No camera on rank-and-file.
  const HV = vfxMatterColor('heartvein');
  const HVP = vfxMatterColor('heartpeak');
  const CRYSTAL = vfxMatterColor('heartcrystal');
  const HFLESH = vfxMatterColor('heartflesh');
  const HBONE = vfxMatterColor('heartbone');
  const ROSE = vfxMatterColor('heartrose');
  const CENSER_Y = 1.25;

  // Hollow Husk — "the room's heart beats". Every husk surges on the same
  // tick, so this stays tiny per body (a vein flash at the chest and a scuff
  // of dust behind the feet) and drops the flash past the first few husks of
  // a beat: the rigs' own vein flare carries the rest.
  sv.surgeTick = -1;
  sv.surgeCount = 0;
  bus.on('husk_surge', (ev) => {
    mark('husk_surge');
    if (ev.tick !== sv.surgeTick) {
      sv.surgeTick = ev.tick;
      sv.surgeCount = 0;
    }
    sv.surgeCount += 1;
    const h = SF.byId(ev.id);
    const d = faceOf(h);
    if (sv.surgeCount <= 4) kit.flash({ x: ev.x + d.x * 0.15, y: 0.75, z: ev.z + d.z * 0.15, color: HV, size: 0.55, life: 0.18, opacity: 0.8 });
    if (sv.surgeCount <= 8) spray('smoke', ev.x - d.x * 0.2, 0.1, ev.z - d.z * 0.2, 1, { color: HFLESH, speed: [0.3, 0.6], up: [0.1, 0.3], size: [0.22, 0.32], grow: 1.1, life: [0.35, 0.55], opacity: 0.28, gravity: -0.1, drag: 2.6, dir: { x: -d.x, z: -d.z }, dirBias: 0.7 });
    spray('spark', ev.x, 0.7, ev.z, 1, { color: HV, speed: [0.1, 0.3], up: [0.4, 0.8], size: [0.04, 0.07], life: [0.3, 0.5], gravity: -0.2, drag: 1.5, jitter: 0.15, opacity: 0.9 });
  });

  // Vein Lancer — "the lance". The lane IS the attack, so the release fills
  // it at once: a violet-cored beam from the lancer to the lane's end, a
  // white-hot head running down it, an Ember edge that flashes the full
  // width (that is what hit you), sparks thrown off along it and a scorched
  // line burned into the floor that cools from Ember to violet.
  bus.on('lancer_lance', (ev) => {
    mark('lancer_lance');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 7;
    const w = ev.width ?? 0.8;
    const ang = Math.atan2(d.z, d.x);
    const ox = ev.x + d.x * 0.35;
    const oz = ev.z + d.z * 0.35;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const SPEED = 34; // u/s — the head crosses a full lane in ~0.2 s
    const sweep = len / SPEED;
    // Release at the hand.
    SF.flare(ox, 0.95, oz, HV, 1.2, { life: 0.2, core: HVP, angle: ang });
    kit.flash({ x: ox, y: 0.95, z: oz, color: HVP, size: 0.7, life: 0.12 });
    // The Ember edge: the full lane width, hot for a blink (the hit).
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: w, tailW: w * 0.85, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.55 });
    // The violet beam with its pale core.
    kit.streak({ a: { x: ox, y: 0.7, z: oz }, b: { x: ex, y: 0.6, z: ez }, width: 0.26, tailW: 0.16, core: HVP, glow: HV, life: sweep + 0.4, fall: 1.3, opacity: 1 });
    // The head: a short white-hot dart running the lane.
    kit.streak({ a: { x: ox, y: 0.68, z: oz }, b: { x: ox + d.x * 0.9, y: 0.66, z: oz + d.z * 0.9 }, width: 0.12, tailW: 0.4, core: PARCH, glow: HV, life: sweep, travel: { x: d.x * SPEED, y: -0.2, z: d.z * SPEED }, fall: 0.3 });
    // Where it stops: a violet star over an Ember burst.
    after(sweep, () => {
      SF.flare(ex, 0.55, ez, HV, 1.0, { kind: 'burst', life: 0.22, core: HVP });
      kit.flash({ x: ex, y: 0.5, z: ez, color: EMBER, size: 0.5, life: 0.12 });
      spray('shard', ex, 0.5, ez, 4, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [0.8, 1.8], up: [0.6, 1.4], size: [0.09, 0.13], life: [0.4, 0.7], gravity: 4, spin: [-8, 8], dir: d, dirBias: 0.4 });
    });
    // Sparks off the lane edges and the scorched line it leaves.
    const steps = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i < steps; i++) {
      const k = (i + 0.5) / steps;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      const side = i % 2 ? 1 : -1;
      after(sweep * k, () => spray('spark', px, 0.5, pz, 2, { color: i % 2 ? EMBER : HV, speed: [1.0, 2.2], up: [0.5, 1.2], size: [0.03, 0.06], life: [0.2, 0.4], dir: { x: -d.z * side + d.x * 0.5, z: d.x * side + d.z * 0.5 }, dirBias: 0.7 }));
    }
    const marks = Math.max(2, Math.min(4, Math.round(len / 2)));
    for (let i = 1; i <= marks; i++) {
      const k = (i - 0.5) / marks;
      kit.mark({ x: ev.x + d.x * len * k, z: ev.z + d.z * len * k, radius: (len / marks) * 0.62, kind: 'gouge', angle: ang, stretch: 2.2, stain: INK, glow: EMBER, glowOpacity: 0.4, cool: 0.5, life: 2.6, opacity: 0.4, delay: sweep * k });
    }
    kit.light({ x: (ev.x + ex) / 2, z: (ev.z + ez) / 2, radius: Math.min(2.4, len * 0.35), color: HV, opacity: 0.3, life: 0.3, attack: 0.02 });
    // The vein-spear reforms in the lancer's hand (the rig regrows it).
    after(0.3, () => spray('spark', ev.x, 0.9, ev.z, 4, { color: HV, speed: [0.05, 0.2], up: [0.2, 0.6], size: [0.04, 0.07], life: [0.4, 0.6], gravity: -0.3, drag: 1.6, jitter: 0.2, opacity: 0.9 }));
  });

  // Geode Brute — "the crystal slam". The fists land in an Ember ring (the
  // hit) that cracks into a burst of violet crystal punched up through the
  // floor; stone and crystal chips fly. The three shards it throws are
  // their own recipe when they land (crystalShatter).
  bus.on('geode_slam', (ev) => {
    mark('geode_slam');
    const r = ev.radius ?? 1.5;
    const g = SF.byId(ev.id);
    const d = faceOf(g);
    const sx = g ? g.x : ev.x - d.x * 0.9;
    const sz = g ? g.z : ev.z - d.z * 0.9;
    kit.streak({ a: { x: sx + d.x * 0.3, y: 1.8, z: sz + d.z * 0.3 }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 0.18, tailW: 0.45, core: PARCH, glow: EMBER, life: 0.16, fall: 2.2 });
    SF.flare(ev.x, 0.35, ev.z, EMBER, 1.5, { kind: 'burst', life: 0.24 });
    kit.flash({ x: ev.x, y: 0.4, z: ev.z, color: PARCH, size: 0.85, life: 0.14 });
    SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.3, width: 0.12, jag: 0.7 });
    SF.shock(ev.x, ev.z, r * 1.35, CRYSTAL, { life: 0.5, width: 0.22, core: HVP, delay: 0.04, jag: 0.9 });
    spikes(ev.x, ev.z, r * 0.95, 9, CRYSTAL, { h: 0.75, delay: 0.03, life: 0.55, core: HVP });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.85, glow: EMBER, life: 1.4, cool: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.3, kind: 'crater', stain: vfxMatterColor('stone'), glow: CRYSTAL, glowOpacity: 0.5, cool: 1.2, life: 3.4, opacity: 0.55 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: HV, opacity: 0.4, life: 0.45, attack: 0.02 });
    spray('chunk', ev.x, 0.3, ev.z, 6, { color: vfxMatterColor('stone'), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.14], life: [0.5, 0.8], jitter: 0.3 });
    spray('shard', ev.x, 0.35, ev.z, 10, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 2.8], up: [1.4, 2.8], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 5, drag: 0.5, spin: [-10, 10], jitter: 0.3 });
    spray('spark', ev.x, 0.4, ev.z, 6, { color: PARCH, speed: [1.6, 3.0], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.3] });
    spray('smoke', ev.x, 0.2, ev.z, 3, { color: vfxMatterColor('stone'), speed: [0.6, 1.2], up: [0.1, 0.4], size: [0.36, 0.5], grow: 1.4, life: [0.7, 1.0], opacity: 0.3, gravity: -0.15, drag: 2.4, jitter: 0.4 });
  });
  // A thrown shard lands: its Ember ring flashes (the hit), the crystal
  // shatters into needles and punches a small cluster up (the patch the
  // enemy layer then grows in its place).
  function crystalShatter(x, z, radius) {
    mark('geode_shard_land');
    kit.ring({ x, z, r0: 0.15, r1: radius, width: 0.08, life: 0.3, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.75, gain: 0.7 });
    SF.flare(x, 0.3, z, CRYSTAL, 0.85, { kind: 'star', life: 0.18, core: HVP });
    spikes(x, z, radius * 0.6, 4, CRYSTAL, { h: 0.45, life: 0.4, core: HVP });
    spray('shard', x, 0.3, z, 7, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [1.0, 2.0], size: [0.08, 0.13], life: [0.4, 0.7], gravity: 5, drag: 0.5, spin: [-10, 10] });
    spray('spark', x, 0.3, z, 4, { color: PARCH, speed: [1.2, 2.4], up: [0.6, 1.2], size: [0.03, 0.06], life: [0.12, 0.24] });
    kit.mark({ x, z, radius: radius * 1.2, kind: 'scorch', stain: INK, glow: CRYSTAL, glowOpacity: 0.3, cool: 1.0, life: 3.0, opacity: 0.35 });
  }

  // Heart Censer — "it gathers, then it mends". Nothing here hurts the party,
  // so none of it is Ember: the gather draws the mend's whole reach in (a
  // rose ring closing from 4.2 u onto the censer, violet motes streaming to
  // its coals); the mend is a rose-violet pulse out to the same edge with a
  // streak to every body it healed and a glow on each. A stun mid-gather
  // spills the coals on the floor.
  bus.on('censer_gather', (ev) => {
    mark('censer_gather');
    const r = ev.radius ?? 4.2;
    const c = SF.byId(ev.id);
    const cx = c?.x ?? ev.x;
    const cz = c?.z ?? ev.z;
    const life = ev.untilTick != null && ev.tick != null ? Math.max(0.3, (ev.untilTick - ev.tick) / 60) : 0.8;
    kit.ring({ x: cx, z: cz, r0: r, r1: 0.35, width: 0.07, life, core: ROSE, glow: HV, soft: 0.6, y: 0.05, opacity: 0.55, gain: 0.6 });
    kit.mark({ x: cx, z: cz, radius: r, kind: 'sigil', stain: INK, glow: HV, glowOpacity: 0.35, cool: life, life: life + 0.3, opacity: 0.1 });
    kit.flash({ x: cx, y: CENSER_Y, z: cz, color: HV, size: 0.8, life: 0.25 });
    const n = N(8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.3, 0.3);
      const rr = r * rnd(0.55, 0.95);
      const dl = rnd(0, life * 0.6);
      const fl = Math.min(0.45, life - dl);
      const px = cx + Math.cos(a) * rr;
      const pz = cz + Math.sin(a) * rr;
      kit.streak({ a: { x: px, y: 0.35, z: pz }, b: { x: px - Math.cos(a) * 0.4, y: 0.45, z: pz - Math.sin(a) * 0.4 }, width: 0.05, tailW: 0, core: HVP, glow: HV, life: fl, delay: dl, travel: { x: (-Math.cos(a) * rr) / fl, y: (CENSER_Y - 0.4) / fl, z: (-Math.sin(a) * rr) / fl }, fall: 1.0, opacity: 0.85 });
    }
  });
  bus.on('censer_mend', (ev) => {
    mark('censer_mend');
    const { x, z } = ev;
    const r = ev.radius ?? 4.2;
    SF.flare(x, CENSER_Y, z, HV, 1.2, { kind: 'burst', life: 0.3, core: HVP });
    kit.flash({ x, y: CENSER_Y, z, color: ROSE, size: 1.0, life: 0.3, hold: 0.06 });
    kit.ring({ x, z, r0: 0.3, r1: r, width: 0.12, life: 0.6, core: ROSE, glow: HV, soft: 0.55, y: 0.05, opacity: 0.8 });
    kit.ring({ x, z, r0: 0.2, r1: r * 0.75, width: 0.3, life: 0.7, core: HV, glow: HV, soft: 0.9, y: 0.08, delay: 0.05, opacity: 0.35, gain: 0.4 });
    kit.light({ x, z, radius: r * 0.6, color: HV, opacity: 0.35, life: 0.55, attack: 0.05 });
    const healed = ev.healed || [];
    for (let i = 0; i < healed.length; i++) {
      const t = SF.byId(healed[i].id);
      if (!t) continue;
      const dl = Math.min(0.2, i * 0.025);
      kit.streak({ a: { x, y: CENSER_Y, z }, b: { x: t.x, y: 0.55, z: t.z }, width: 0.05, tailW: 0.06, core: ROSE, glow: HV, life: 0.42, delay: dl, fall: 1.0, opacity: 0.85 });
      kit.flash({ x: t.x, y: 0.55, z: t.z, color: ROSE, size: 0.6, life: 0.3, delay: dl + 0.08 });
      spray('spark', t.x, 0.35, t.z, 3, { color: ROSE, speed: [0.05, 0.2], up: [0.7, 1.2], size: [0.04, 0.08], life: [0.6, 0.9], gravity: -0.3, drag: 1.6, jitter: 0.25, opacity: 0.9 });
    }
  });
  bus.on('censer_spill', (ev) => {
    mark('censer_spill');
    const { x, z } = ev;
    kit.flash({ x, y: CENSER_Y, z, color: HV, size: 0.5, life: 0.12 });
    spray('shard', x, CENSER_Y - 0.1, z, 6, { color: CRYSTAL, tile: SHARD_TILE.drop, speed: [0.3, 0.9], up: [0.2, 0.8], size: [0.08, 0.12], life: [0.6, 0.9], gravity: 6, drag: 0.4, spin: [-4, 4] });
    spray('smoke', x, CENSER_Y, z, 2, { color: HBONE, speed: [0.2, 0.5], up: [-0.2, 0.2], size: [0.3, 0.42], grow: 1.3, life: [0.6, 0.9], opacity: 0.3, gravity: 0.1, drag: 2.2 });
    after(0.32, () => {
      kit.mark({ x, z, radius: 0.7, kind: 'scorch', stain: INK, glow: HV, glowOpacity: 0.4, cool: 0.9, life: 2.4, opacity: 0.4 });
      spray('spark', x, 0.1, z, 6, { color: HV, speed: [0.4, 1.2], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.3, 0.6], drag: 1.2 });
    });
  });

  // Their deaths, on top of enemyDeath's shared break (whose kill motes go
  // violet for a `heart` row).
  Object.assign(CREATURE_DEATH, {
    husk: (es, matter, x, z) => {
      // The heart in the rib cavity bursts. Cheap: husks die in numbers.
      mark('husk_death');
      SF.flare(x, 0.65, z, HV, 0.8, { kind: 'burst', life: 0.2, core: HVP });
      spray('spark', x, 0.6, z, 5, { color: HV, speed: [0.6, 1.4], up: [0.4, 1.0], size: [0.04, 0.07], life: [0.3, 0.6], drag: 1.3 });
    },
    lancer: (es, matter, x, z) => {
      // The vein-spear shatters into violet needles.
      mark('lancer_death');
      SF.flare(x, 0.95, z, HV, 0.9, { kind: 'star', life: 0.22, core: HVP });
      spray('shard', x, 0.9, z, 7, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [0.6, 1.6], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 4, spin: [-10, 10] });
      spray('smoke', x, 0.8, z, 2, { color: HFLESH, speed: [0.2, 0.5], up: [0.1, 0.4], size: [0.32, 0.44], grow: 1.3, life: [0.7, 1.0], opacity: 0.3, gravity: -0.15, drag: 2.2 });
    },
    geode: (es, matter, x, z) => {
      // The spires break off and the boulder cracks open: crystal and stone.
      mark('geode_death');
      SF.flare(x, 0.9, z, HV, 1.4, { kind: 'burst', life: 0.28, core: HVP });
      SF.shock(x, z, 1.6, CRYSTAL, { life: 0.45, width: 0.16, core: HVP, jag: 0.8 });
      spikes(x, z, 0.8, 6, CRYSTAL, { h: 0.6, life: 0.6, core: HVP });
      kit.light({ x, z, radius: 1.8, color: HV, opacity: 0.45, life: 0.5 });
      spray('chunk', x, 0.6, z, 8, { color: vfxMatterColor('stone'), speed: [1.0, 2.4], up: [1.6, 2.8], size: [0.1, 0.18], life: [0.6, 0.9] });
      spray('shard', x, 1.0, z, 8, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 2.6], up: [1.2, 2.4], size: [0.12, 0.18], life: [0.6, 1.0], gravity: 5, spin: [-10, 10] });
    },
    censer: (es, matter, x, z) => {
      // The chain lets go: the censer drops and its coals scatter.
      mark('censer_death');
      SF.flare(x, CENSER_Y, z, HV, 1.1, { kind: 'burst', life: 0.26, core: HVP });
      kit.flash({ x, y: CENSER_Y, z, color: ROSE, size: 0.8, life: 0.2 });
      SF.shock(x, z, 1.2, ROSE, { life: 0.4, width: 0.08, core: HVP, y: CENSER_Y - 0.2 });
      spray('chunk', x, CENSER_Y, z, 4, { color: HBONE, speed: [0.6, 1.4], up: [0.2, 1.0], size: [0.07, 0.12], life: [0.6, 0.9] });
      spray('shard', x, CENSER_Y, z, 6, { color: CRYSTAL, tile: SHARD_TILE.drop, speed: [0.6, 1.6], up: [0.4, 1.2], size: [0.08, 0.12], life: [0.6, 0.9], gravity: 6, spin: [-4, 4] });
      after(0.35, () => kit.mark({ x, z, radius: 0.8, kind: 'scorch', stain: INK, glow: HV, glowOpacity: 0.4, cool: 1.0, life: 2.6, opacity: 0.4 }));
    },
  });

  return { BRAMBLE, WASP, CARAPACE, EEL, WISP, BONEPLATE, IRON, OAK, DIRT, faceOf, spikes, laneDrive, waspDart, waspDartEnd, lampreyRise, lampreyDive, wispFrame, HV, HVP, CRYSTAL, HFLESH, HBONE, ROSE, CENSER_Y, crystalShatter };
}
