// THE ACT V AND KILN BOSS LOOKS (docs/ACT_V_BOSSES.md, docs/KILN_BOSSES.md):
// the Spire's bosses, the Hourwarden, the Kiln's bosses, their wind-ups,
// frames and deaths, and the per-frame boss pass (bossFrame).
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxBossStyle, vfxFoeShotColor, vfxMatterColor } from '../../../data/vfx.js';
import { EMBER, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';

export function createSigLateBosses(ctx) {
  const { SF, ANTICIP, BRONZE, CINDER, EARTH, HERON, N, WATER, WYRM, after, bus, camfx, faceOf, kit, mark, rnd, s2Clock, spray, unit2, world } = ctx;

  // ---------------------------------------------- Act V bosses --
  // (docs/ACT_V_BOSSES.md) The Hush is silence: what it touches is drained
  // of colour, so its light is a cold lavender-white over grey with the
  // God-stuff violet only at the rim, and its signature pulls light, dust and
  // sound IN before it lands. The Skyhorn is bell bronze and pale limestone
  // over the hollow song's violet. Ember stays on the frame that hurts.
  const HUSHS = vfxBossStyle('hush');
  const HORN = vfxBossStyle('skyhorn');
  const HVEIL = vfxMatterColor('hushveil');
  const HPALE = vfxMatterColor('hushpale');
  const LIMESTONE = vfxMatterColor('spirestone');
  const IBEX = vfxMatterColor('ibexfur');
  // The Still Note: the Ember ring bursts, then the note does not ring out
  // but falls IN: pale rings closing on the centre, grey dust settling, and
  // (from the Second Stillness) a patch of silence left on the floor.
  bus.on('boss_still_note', (ev) => {
    mark('hush_note');
    const r = ev.radius ?? 1.8;
    const C = HUSHS.note;
    SF.flare(ev.x, 0.5, ev.z, EMBER, 1.5, { kind: 'burst', life: 0.2, core: HUSHS.peak });
    kit.flash({ x: ev.x, y: 0.5, z: ev.z, color: HUSHS.peak, size: 1.0, life: 0.12 });
    SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.24, width: 0.1 });
    for (let i = 0; i < C.rings; i++) kit.ring({ x: ev.x, z: ev.z, r0: r * (1.5 + i * 0.4), r1: 0.1, width: 0.08, life: 0.45 + i * 0.1, core: HUSHS.peak, glow: HUSHS.corruption, soft: 0.5, y: 0.08 + i * 0.3, delay: 0.04 + i * 0.08, opacity: 0.8 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.25, kind: 'sigil', stain: HVEIL, glow: HUSHS.corruption, glowOpacity: 0.4, cool: 1.2, life: 2.8, opacity: 0.3 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: HUSHS.corruption, opacity: 0.4, life: 0.5, attack: 0.02 });
    spray('spark', ev.x, 1.4, ev.z, C.motes, { color: HPALE, speed: [0.05, 0.3], up: [-0.8, -0.3], size: [0.05, 0.09], life: [0.8, 1.3], gravity: 0.25, drag: 1.6, jitter: r * 0.8, opacity: 0.8 });
    spray('smoke', ev.x, 0.15, ev.z, 3, { color: HVEIL, speed: [0.3, 0.7], up: [0.0, 0.2], size: [0.4, 0.55], grow: 1.3, life: [0.8, 1.1], opacity: 0.26, gravity: 0, drag: 2.6, jitter: r * 0.4 });
    if (ev.patch != null) kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: r * 0.8, width: 0.05, life: 0.7, core: HUSHS.peak, glow: HVEIL, soft: 0.8, y: 0.03, opacity: 0.5 });
  });
  // The Unringing: a lane of sound unmade — a grey wedge of stillness runs
  // from its body with a pale core, the Ember edge flashing the full width.
  bus.on('boss_unring', (ev) => {
    mark('hush_unring');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ang = Math.atan2(d.z, d.x);
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const SPEED = 24;
    const sweep = len / SPEED;
    SF.flare(ev.x + d.x * 0.7, 1.9, ev.z + d.z * 0.7, HUSHS.corruption, 1.6, { life: 0.22, core: HUSHS.peak, angle: ang });
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: 1.3, tailW: 1.1, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.55 });
    kit.streak({ a: { x: ev.x + d.x * 0.5, y: 1.4, z: ev.z + d.z * 0.5 }, b: { x: ex, y: 0.45, z: ez }, width: 0.42, tailW: 0.3, core: HUSHS.peak, glow: HVEIL, life: sweep + 0.5, fall: 1.0, opacity: 0.85 });
    kit.streak({ a: { x: ev.x, y: 1.3, z: ev.z }, b: { x: ev.x + d.x, y: 1.2, z: ev.z + d.z }, width: 0.16, tailW: 0.5, core: PARCH, glow: HUSHS.corruption, life: sweep, travel: { x: d.x * SPEED, y: -2, z: d.z * SPEED }, fall: 0.3 });
    after(sweep, () => {
      SF.flare(ex, 0.5, ez, HUSHS.corruption, 1.2, { kind: 'burst', life: 0.22, core: HUSHS.peak });
      kit.ring({ x: ex, z: ez, r0: 1.3, r1: 0.1, width: 0.08, life: 0.35, core: HUSHS.peak, glow: HUSHS.corruption, soft: 0.5, y: 0.08 });
    });
    const marks = Math.max(2, Math.min(5, Math.round(len / 1.8)));
    for (let i = 1; i <= marks; i++) {
      const k = (i - 0.5) / marks;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      kit.mark({ x: px, z: pz, radius: (len / marks) * 0.6, kind: 'gouge', angle: ang, stretch: 2.2, stain: HVEIL, glow: HUSHS.corruption, glowOpacity: 0.35, cool: 0.8, life: 2.6, opacity: 0.35, delay: sweep * k });
      after(sweep * k, () => spray('smoke', px, 0.3, pz, 1, { color: HVEIL, speed: [0.2, 0.5], up: [0.1, 0.3], size: [0.36, 0.5], grow: 1.2, life: [0.6, 0.9], opacity: 0.24, gravity: 0, drag: 2.4 }));
    }
    kit.light({ x: (ev.x + ex) / 2, z: (ev.z + ez) / 2, radius: Math.min(2.8, len * 0.4), color: HUSHS.corruption, opacity: 0.35, life: 0.35, attack: 0.02 });
    camfx.kick(d.x, d.z, HUSHS.camera.kick * 0.5, 0.12);
  });
  // A Stillness: one of its little bells stops; a column of pale light, the
  // violet rim flaring once behind it, and the room's colour dips.
  bus.on('boss_stillness', (ev) => {
    mark('hush_stillness');
    SF.anticipate(ev.x, ev.z, 2.4, HUSHS.corruption, { y: 1.8, lines: 10, core: HUSHS.peak });
    after(ANTICIP, () => {
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.8, height: 4.4, color: HUSHS.corruption, life: 1.0, opacity: 0.55 });
      SF.flare(ev.x, 2.2, ev.z, HUSHS.rim, 2.4, { kind: 'burst', life: 0.35, core: HUSHS.peak, spin: 0.4 });
      kit.ring({ x: ev.x, z: ev.z, r0: 4.4, r1: 0.4, width: 0.22, life: 0.9, core: HUSHS.peak, glow: HUSHS.corruption, soft: 0.5, y: 0.06 });
      kit.mark({ x: ev.x, z: ev.z, radius: 3.0, kind: 'sigil', stain: HVEIL, glow: HUSHS.rim, glowOpacity: 0.35, cool: 1.6, life: 3.4, opacity: 0.26 });
      spray('shard', ev.x, 2.0, ev.z, 3, { color: BRONZE, tile: SHARD_TILE.needle, speed: [0.3, 0.8], up: [0.3, 0.8], size: [0.1, 0.14], life: [0.8, 1.1], gravity: 5, spin: [-6, 6], jitter: 0.6 });
      kit.light({ x: ev.x, z: ev.z, radius: 4.0, color: HUSHS.corruption, opacity: 0.5, life: 0.9, attack: 0.05 });
      camfx.dolly(ev.x, ev.z, HUSHS.camera.dolly * 0.6, 0.4);
    });
  });
  // The Great Hush lands: the Ember ring flashes its full radius (the hit),
  // then the silence goes out in a heavy pale wave that leaves the floor
  // grey, every mote in the room dropping still; the camera leans in.
  bus.on('boss_great_hush', (ev) => {
    mark('hush_great');
    const r = ev.radius ?? 4.6;
    const G = HUSHS.great;
    SF.flare(ev.x, 1.6, ev.z, HUSHS.corruption, 3.4, { kind: 'burst', life: 0.4, core: HUSHS.peak, spin: 0.5 });
    kit.flash({ x: ev.x, y: 1.0, z: ev.z, color: HUSHS.peak, size: 2.4, life: 0.18 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.32, width: 0.16 });
    for (let i = 0; i < G.rings; i++) SF.shock(ev.x, ev.z, r * (1.1 + i * 0.22), i % 2 ? HVEIL : HUSHS.corruption, { life: 0.6 + i * 0.12, width: 0.3 - i * 0.05, core: HUSHS.peak, delay: 0.03 + i * 0.07, y: 0.06 + i * 0.2 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.05, kind: 'sigil', stain: HVEIL, glow: HUSHS.corruption, glowOpacity: 0.4, cool: 2.4, life: 5, opacity: 0.4 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.55, glow: HUSHS.corruption, life: 2.4, cool: 1.0 });
    spray('spark', ev.x, 2.4, ev.z, G.motes, { color: HPALE, speed: [0.2, 1.4], up: [-1.2, -0.2], size: [0.05, 0.1], life: [1.0, 1.6], gravity: 0.6, drag: 1.4, jitter: r * 0.7, opacity: 0.85 });
    spray('smoke', ev.x, 0.2, ev.z, 10, { color: HVEIL, speed: [1.6, 3.2], up: [0.0, 0.3], size: [0.5, 0.7], grow: 1.6, life: [0.9, 1.3], opacity: 0.3, gravity: 0, drag: 2.0, jitter: 0.6 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: HUSHS.corruption, opacity: 0.7, life: 0.8, attack: 0.02 });
    camfx.dolly(ev.x, ev.z, HUSHS.camera.dolly * 1.2, 0.45);
  });
  bus.on('boss_hush_wake', (ev) => {
    mark('hush_wake');
    SF.flare(ev.x, 2.4, ev.z, HUSHS.corruption, 1.4, { kind: 'star', life: 0.3, core: HUSHS.peak });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: 1.8, width: 0.08, life: 0.5, core: HUSHS.peak, glow: HUSHS.corruption, soft: 0.5, y: 0.05, opacity: 0.6 });
  });
  function hushDeath(x, z) {
    // The silence breaks: its bell-head splits along the crack and RINGS for
    // the first time — warm parchment light (sound returning) bursts out of
    // the grey, the five little bells fly free, and colour floods back in.
    mark('hush_death');
    kit.pillar({ x, z, radius: 1.3, height: 5.4, color: HUSHS.corruption, life: 1.8, opacity: 0.75 });
    SF.flare(x, 2.6, z, PARCH, 4.6, { kind: 'burst', life: 0.6, core: HUSHS.peak, spin: 0.8 });
    kit.flash({ x, y: 2.0, z, color: PARCH, size: 2.8, life: 0.28 });
    for (let i = 0; i < 4; i++) kit.ring({ x, z, r0: 0.5, r1: 4 + i * 1.6, width: 0.3, life: 1.0 + i * 0.3, core: PARCH, glow: i % 2 ? HUSHS.rim : HUSHS.corruption, soft: 0.5, y: 0.06 + i * 0.5, delay: i * 0.14 });
    kit.mark({ x, z, radius: 3.8, kind: 'sigil', stain: INK, glow: HUSHS.corruption, glowOpacity: 0.5, cool: 2.4, life: 7, opacity: 0.32 });
    for (let i = 0; i < N(5); i++) {
      const a = (i / 5) * TAU;
      kit.streak({ a: { x, y: 1.8, z }, b: { x: x + Math.cos(a) * 0.3, y: 1.8, z: z + Math.sin(a) * 0.3 }, width: 0.12, tailW: 0, core: PARCH, glow: BRONZE, life: 0.7, travel: { x: Math.cos(a) * 5, y: 2.4, z: Math.sin(a) * 5 }, fall: 0.2 });
    }
    spray('shard', x, 2.6, z, 18, { color: BRONZE, tile: SHARD_TILE.needle, speed: [1.0, 2.8], up: [1.4, 3.2], size: [0.1, 0.17], life: [0.9, 1.3], gravity: 5, spin: [-10, 10], jitter: 0.5 });
    spray('spark', x, 0.6, z, 50, { color: PARCH, speed: [0.3, 1.6], up: [1.0, 3.0], size: [0.06, 0.13], life: [1.6, 2.6], gravity: -0.3, drag: 1.2, jitter: 1.4 });
    spray('spark', x, 0.6, z, 24, { color: HUSHS.rim, speed: [0.3, 1.2], up: [1.0, 2.4], size: [0.05, 0.11], life: [1.2, 2.0], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    spray('smoke', x, 0.5, z, 10, { color: HVEIL, speed: [0.6, 1.6], up: [0.4, 1.0], size: [0.5, 0.7], grow: 1.6, life: [1.4, 2.0], opacity: 0.34, gravity: -0.25, drag: 2.0, jitter: 1.2 });
    kit.light({ x, z, radius: 5.5, color: PARCH, opacity: 0.75, life: 1.8 });
    camfx.dolly(x, z, HUSHS.camera.dolly * 1.3, 0.65);
  }

  // The Skyhorn. The Horn Rush: grit and bronze sparks thrown off the horns
  // down the lane at its gallop, an Ember edge flashing the lane (the hit).
  bus.on('boss_horn_rush', (ev) => {
    mark('skyhorn_rush');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * len, y: 0.1, z: ev.z + d.z * len }, width: 1.3, tailW: 1.0, core: EMBER, glow: EMBER, life: len / 12 + 0.1, fall: 2.0, opacity: 0.5 });
    SF.laneDrive(ev.x, ev.z, d, len, 12, { wake: LIMESTONE, wakeW: 0.6, head: HORN.corruption, peak: HORN.peak, stain: LIMESTONE, glow: BRONZE, marks: 3, markKind: 'gouge' });
    spray('smoke', ev.x, 0.15, ev.z, 4, { color: LIMESTONE, speed: [0.8, 1.6], up: [0.1, 0.3], size: [0.4, 0.55], grow: 1.4, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4, dir: { x: -d.x, z: -d.z }, dirBias: 0.7 });
    camfx.kick(d.x, d.z, HORN.camera.kick * 0.6, 0.14);
  });
  // The rush ends: into a wall it is a horn-clang (bronze rings, a starburst
  // of sparks, limestone chips, a crack in the floor) and it stands dazed.
  bus.on('boss_horn_rush_end', (ev) => {
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    if (!ev.wall) {
      mark('skyhorn_rush_stop');
      spray('chunk', ev.x, 0.15, ev.z, 5, { color: LIMESTONE, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.7], dir: d, dirBias: 0.6 });
      return;
    }
    mark('skyhorn_wall');
    const hx = ev.x + d.x * 0.9;
    const hz = ev.z + d.z * 0.9;
    SF.flare(hx, 1.6, hz, BRONZE, 2.4, { kind: 'star', life: 0.3, core: PARCH, angle: Math.atan2(d.z, d.x) });
    kit.flash({ x: hx, y: 1.4, z: hz, color: PARCH, size: 1.4, life: 0.14 });
    for (let i = 0; i < 3; i++) kit.ring({ x: hx, z: hz, r0: 0.2, r1: 1.4 + i * 0.7, width: 0.08, life: 0.4 + i * 0.12, core: PARCH, glow: BRONZE, soft: 0.5, y: 1.2 + i * 0.15, delay: i * 0.08 });
    spray('spark', hx, 1.6, hz, 22, { color: BRONZE, speed: [1.4, 3.2], up: [0.6, 1.8], size: [0.03, 0.06], life: [0.25, 0.5], gravity: 3, drag: 0.6, dir: { x: -d.x, z: -d.z }, dirBias: 0.4 });
    spray('chunk', hx, 1.2, hz, 12, { color: LIMESTONE, speed: [1.0, 2.6], up: [1.0, 2.4], size: [0.07, 0.14], life: [0.6, 1.0], dir: { x: -d.x, z: -d.z }, dirBias: 0.5, jitter: 0.4 });
    spray('smoke', hx, 0.4, hz, 5, { color: LIMESTONE, speed: [0.6, 1.4], up: [0.2, 0.6], size: [0.45, 0.6], grow: 1.5, life: [0.9, 1.3], opacity: 0.32, gravity: -0.1, drag: 2.2, jitter: 0.5 });
    kit.crack({ x: hx, z: hz, radius: 1.0, glow: HORN.corruption, life: 1.8, cool: 0.7 });
    kit.light({ x: hx, z: hz, radius: 2.4, color: BRONZE, opacity: 0.5, life: 0.45, attack: 0.02 });
    camfx.dolly(hx, hz, HORN.camera.dolly, 0.3);
  });
  bus.on('boss_horn_recover', (ev) => {
    mark('skyhorn_recover');
    spray('chunk', ev.x, 0.2, ev.z, 4, { color: LIMESTONE, speed: [0.3, 0.8], up: [0.6, 1.2], size: [0.05, 0.09], life: [0.4, 0.6], jitter: 0.6 });
  });
  // The Bell Toll: its horns clash and the bell at its throat rings — an
  // Ember ring (the hit), bronze sound rings going out at head height, a
  // violet glint in the horns.
  bus.on('boss_horn_toll', (ev) => {
    mark('skyhorn_toll');
    const r = ev.radius ?? 2.9;
    SF.flare(ev.x, 2.2, ev.z, BRONZE, 2.2, { kind: 'star', life: 0.26, core: PARCH });
    kit.flash({ x: ev.x, y: 2.0, z: ev.z, color: PARCH, size: 1.1, life: 0.12 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.28, width: 0.14 });
    for (let i = 0; i < HORN.toll.rings; i++) kit.ring({ x: ev.x, z: ev.z, r0: 0.6, r1: r * (1.05 + i * 0.25), width: 0.07, life: 0.5 + i * 0.12, core: PARCH, glow: i % 2 ? HORN.corruption : BRONZE, soft: 0.6, y: 1.8 - i * 0.4, delay: i * 0.07 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 0.9, kind: 'crater', stain: LIMESTONE, glow: BRONZE, glowOpacity: 0.35, cool: 1.0, life: 3, opacity: 0.35 });
    spray('spark', ev.x, 2.0, ev.z, 14, { color: BRONZE, speed: [1.0, 2.4], up: [0.2, 0.8], size: [0.03, 0.06], life: [0.3, 0.55], gravity: 2, drag: 0.8 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: BRONZE, opacity: 0.45, life: 0.45, attack: 0.02 });
    camfx.kick(0, 1, HORN.camera.kick * 0.5, 0.1);
  });
  // The Sky Leap lands: a cratering stamp, limestone thrown up, the stone
  // shards it kicks out, dust rolling out flat.
  bus.on('boss_sky_leap', (ev) => {
    mark('skyhorn_leap');
    const r = ev.radius ?? 2.0;
    const L = HORN.leap;
    SF.flare(ev.x, 0.5, ev.z, EMBER, 2.4, { kind: 'burst', life: 0.26, core: PARCH });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: PARCH, size: 1.4, life: 0.14 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.16, jag: 0.6 });
    SF.shock(ev.x, ev.z, r * 1.5, LIMESTONE, { life: 0.55, width: 0.28, core: PARCH, delay: 0.03, jag: 0.9 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.9, glow: HORN.corruption, life: 2.2, cool: 0.8 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.2, kind: 'crater', stain: LIMESTONE, glow: HORN.corruption, glowOpacity: 0.35, cool: 1.4, life: 4.2, opacity: 0.55 });
    spray('chunk', ev.x, 0.3, ev.z, L.chunk, { color: LIMESTONE, speed: [1.2, 3.0], up: [1.6, 3.4], size: [0.08, 0.16], life: [0.6, 1.0], jitter: 0.5 });
    spray('smoke', ev.x, 0.2, ev.z, L.dust, { color: LIMESTONE, speed: [1.4, 2.6], up: [0.0, 0.3], size: [0.45, 0.65], grow: 1.6, life: [0.9, 1.3], opacity: 0.32, gravity: 0, drag: 2.2, jitter: 0.6 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.5, color: BRONZE, opacity: 0.5, life: 0.5, attack: 0.02 });
    camfx.dolly(ev.x, ev.z, HORN.camera.dolly, 0.35);
  });
  bus.on('boss_skyhorn_phase', (ev) => {
    mark('skyhorn_phase');
    SF.anticipate(ev.x, ev.z, 1.8, HORN.corruption, { y: 2.2, lines: 8, core: HORN.peak });
    after(ANTICIP, () => {
      SF.flare(ev.x, 2.4, ev.z, HORN.corruption, 2.0, { kind: 'burst', life: 0.32, core: HORN.peak });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: 3.6, width: 0.16, life: 0.8, core: PARCH, glow: BRONZE, soft: 0.5, y: 0.06 });
    });
  });
  function skyhornEnrage(ev) {
    mark('skyhorn_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.6, height: 3.2, color: HORN.corruption, life: 0.8, opacity: 0.5 });
    SF.flare(x, 2.2, z, HORN.corruption, 2.4, { kind: 'burst', life: 0.3, core: HORN.peak });
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.5, r1: 2.6 + i * 0.8, width: 0.12, life: 0.6 + i * 0.12, core: PARCH, glow: i % 2 ? HORN.corruption : BRONZE, soft: 0.5, y: 0.06 + i * 0.6, delay: i * 0.08 });
    kit.crack({ x, z, radius: 1.8, glow: HORN.corruption, life: 2.2, cool: 0.9 });
    kit.light({ x, z, radius: 3, color: HORN.corruption, opacity: 0.5, life: 0.8 });
  }
  function skyhornDeath(x, z) {
    // The warden kneels: its horns ring one clean note (bronze and parchment
    // rings), the violet goes out of them in a last spiral, pale fur and
    // limestone dust settle.
    mark('skyhorn_death');
    kit.pillar({ x, z, radius: 1.0, height: 4.2, color: HORN.corruption, life: 1.4, opacity: 0.65 });
    SF.flare(x, 2.2, z, BRONZE, 3.6, { kind: 'burst', life: 0.5, core: PARCH, spin: 0.8 });
    for (let i = 0; i < 4; i++) kit.ring({ x, z, r0: 0.5, r1: 3.6 + i * 1.3, width: 0.24, life: 0.9 + i * 0.25, core: PARCH, glow: i % 2 ? HORN.corruption : BRONZE, soft: 0.5, y: 0.06 + i * 0.6, delay: i * 0.1 });
    kit.mark({ x, z, radius: 3.2, kind: 'crater', stain: LIMESTONE, glow: BRONZE, glowOpacity: 0.45, cool: 2.0, life: 6, opacity: 0.5 });
    for (let i = 0; i < N(8); i++) {
      const a = (i / 8) * TAU;
      kit.streak({ a: { x: x + Math.cos(a) * 0.4, y: 2.2, z: z + Math.sin(a) * 0.4 }, b: { x: x + Math.cos(a) * 0.6, y: 2.4, z: z + Math.sin(a) * 0.6 }, width: 0.08, tailW: 0, core: HORN.peak, glow: HORN.corruption, life: 0.8, travel: { x: Math.cos(a + 1.2) * 2.4, y: 2.2, z: Math.sin(a + 1.2) * 2.4 }, fall: 0.2 });
    }
    spray('spark', x, 0.6, z, 36, { color: HORN.corruption, speed: [0.3, 1.2], up: [0.8, 2.4], size: [0.06, 0.12], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    spray('shard', x, 1.2, z, 16, { color: IBEX, tile: SHARD_TILE.feather, speed: [0.4, 1.2], up: [0.6, 1.4], size: [0.12, 0.18], life: [1.2, 1.8], gravity: 0.6, drag: 1.4, spin: [-5, 5], jitter: 0.8 });
    spray('smoke', x, 0.4, z, 8, { color: LIMESTONE, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.7], grow: 1.6, life: [1.3, 1.9], opacity: 0.34, gravity: -0.2, drag: 2.0, jitter: 1.0 });
    kit.light({ x, z, radius: 4.2, color: BRONZE, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, HORN.camera.dolly, 0.55);
  }
  // ------------------------------------- The Hourwarden (plan 5 slice 1) --
  // (docs/THIRD_BOSSES.md "The Spire") The gods' clock: bell bronze and the
  // pale light of its dial over the hollow song's violet. Ember stays on the
  // frame that hurts. The Pendulum carves a bronze arc down its lane and back;
  // the Hand Sweep throws two blade-arcs; the Toll of the Hours draws the dial
  // on the floor round it and each weight lands on its hour mark; run down,
  // cogs and spring-sparks spill off it.
  const HOUR = vfxBossStyle('hourwarden');
  const DIALC = HOUR.dial;
  // The Pendulum (out and back): a bronze-and-dial streak sweeps the lane at
  // waist height with the Ember edge flashing its full width (the hit),
  // sparks thrown off the bob, scuffed gouges where it grazed the floor.
  function pendulumPass(ev, back) {
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ang = Math.atan2(d.z, d.x);
    const SPEED = back ? 20 : 26;
    const sweep = len / SPEED;
    const [sx, sz, ex, ez] = back ? [ev.x + d.x * len, ev.z + d.z * len, ev.x, ev.z] : [ev.x, ev.z, ev.x + d.x * len, ev.z + d.z * len];
    const dx = ex - sx;
    const dz = ez - sz;
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * len, y: 0.1, z: ev.z + d.z * len }, width: 1.4, tailW: 1.1, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: back ? 0.4 : 0.55 });
    kit.streak({ a: { x: sx, y: 0.8, z: sz }, b: { x: sx + dx * 0.08, y: 0.8, z: sz + dz * 0.08 }, width: 0.5, tailW: 0.9, core: DIALC, glow: BRONZE, life: sweep + 0.05, travel: { x: dx / sweep, y: 0, z: dz / sweep }, fall: 0.4, opacity: 0.9 });
    kit.streak({ a: { x: sx, y: 0.85, z: sz }, b: { x: ex, y: 0.85, z: ez }, width: 0.3, tailW: 0.2, core: HOUR.peak, glow: HOUR.corruption, life: sweep + 0.35, fall: 1.2, opacity: 0.6, delay: sweep * 0.3 });
    const marks = Math.max(2, Math.min(HOUR.pendulum.marks, Math.round(len / 2)));
    for (let i = 1; i <= marks; i++) {
      const k = (i - 0.5) / marks;
      const px = sx + dx * k;
      const pz = sz + dz * k;
      after(sweep * k, () => {
        spray('spark', px, 0.5, pz, Math.round(HOUR.pendulum.sparks / marks), { color: BRONZE, speed: [1.0, 2.6], up: [0.4, 1.4], size: [0.03, 0.06], life: [0.25, 0.5], gravity: 3, drag: 0.6, dir: { x: dx / len, z: dz / len }, dirBias: 0.5, jitter: 0.3 });
        if (!back) kit.mark({ x: px, z: pz, radius: (len / marks) * 0.5, kind: 'gouge', angle: ang, stretch: 2.4, stain: INK, glow: BRONZE, glowOpacity: 0.3, cool: 0.7, life: 2.4, opacity: 0.35 });
      });
    }
    after(sweep, () => {
      SF.flare(ex, 0.8, ez, BRONZE, back ? 1.2 : 1.6, { kind: 'star', life: 0.22, core: PARCH, angle: ang });
      kit.ring({ x: ex, z: ez, r0: 0.2, r1: 1.2, width: 0.08, life: 0.35, core: DIALC, glow: BRONZE, soft: 0.5, y: 0.7 });
    });
    kit.light({ x: (sx + ex) / 2, z: (sz + ez) / 2, radius: Math.min(3, len * 0.4), color: BRONZE, opacity: 0.4, life: 0.35, attack: 0.02 });
    camfx.kick(dx / len, dz / len, HOUR.camera.kick * (back ? 0.35 : 0.6), 0.12);
  }
  bus.on('boss_pendulum', (ev) => {
    mark('hourwarden_pendulum');
    pendulumPass(ev, false);
  });
  bus.on('boss_pendulum_back', (ev) => {
    mark('hourwarden_backswing');
    pendulumPass(ev, true);
  });
  // The Hand Sweep: two bronze blade-arcs, the long hand wide and the short
  // one tight behind it, Ember on the cut, the violet edge in the wake.
  bus.on('boss_hand_sweep', (ev) => {
    mark('hourwarden_sweep');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const ang = Math.atan2(d.z, d.x);
    const r = ev.radius ?? 3.4;
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.9, width: 0.42, span: 2.44, sweep: 0.09, life: 0.32, core: PARCH, glow: EMBER, soft: 0.5, jag: 0.1, lift: 0.1, y: 0.9, gain: 1.1 });
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.62, width: 0.3, span: 2.2, sweep: 0.11, life: 0.3, core: DIALC, glow: BRONZE, soft: 0.6, jag: 0.15, lift: 0.06, y: 0.7, reverse: true, gain: 0.9, delay: 0.05 });
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.78, width: 0.16, span: 2.3, sweep: 0.1, life: 0.42, core: HOUR.peak, glow: HOUR.corruption, soft: 0.8, lift: 0.02, y: 0.5, gain: 0.6, opacity: 0.6, delay: 0.03 });
    SF.flare(ev.x + d.x * r * 0.7, 0.9, ev.z + d.z * r * 0.7, EMBER, 1.5, { life: 0.18, core: PARCH, angle: ang + Math.PI / 2 });
    spray('spark', ev.x + d.x * r * 0.7, 0.8, ev.z + d.z * r * 0.7, HOUR.sweep.sparks, { color: BRONZE, speed: [1.2, 2.8], up: [0.3, 1.0], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 2.5, drag: 0.6, dir: d, dirBias: 0.5, jitter: 0.8 });
    kit.mark({ x: ev.x + d.x * r * 0.55, z: ev.z + d.z * r * 0.55, radius: r * 0.5, kind: 'gouge', angle: ang + Math.PI / 2, stretch: 2.8, stain: INK, glow: EMBER, glowOpacity: 0.3, cool: 0.6, life: 2.2, opacity: 0.35 });
    camfx.kick(d.x, d.z, HOUR.camera.kick * 0.5, 0.1);
  });
  // The Toll of the Hours: it strikes its bell (a burst of bronze rings off
  // its head), and the dial is drawn on the floor round it — a pale chapter
  // ring through the weights' marks with a tick of light at each hour.
  bus.on('boss_toll_hours', (ev) => {
    mark('hourwarden_toll');
    SF.flare(ev.x, 3.3, ev.z, BRONZE, 2.4, { kind: 'star', life: 0.3, core: PARCH });
    kit.flash({ x: ev.x, y: 3.2, z: ev.z, color: DIALC, size: 1.2, life: 0.14 });
    for (let i = 0; i < HOUR.hours.rings; i++) kit.ring({ x: ev.x, z: ev.z, r0: 0.6, r1: 3.6 + i * 1.2, width: 0.08, life: 0.6 + i * 0.15, core: PARCH, glow: i % 2 ? HOUR.corruption : BRONZE, soft: 0.6, y: 2.8 - i * 0.6, delay: i * 0.08 });
    const spots = Array.isArray(ev.spots) ? ev.spots : [];
    const R = spots.length ? Math.hypot(spots[0][0] - ev.x, spots[0][1] - ev.z) : 3;
    kit.ring({ x: ev.x, z: ev.z, r0: R, r1: R + 0.05, width: 0.06, life: 1.2, core: DIALC, glow: HOUR.corruption, soft: 0.7, y: 0.04, opacity: 0.5, thin: 0 });
    spots.forEach(([sx, sz], i) => {
      kit.mark({ x: sx, z: sz, radius: 0.5, kind: 'sigil', stain: INK, glow: DIALC, glowOpacity: 0.4, cool: 0.8, life: 1.6 + i * 0.25, opacity: 0.3, delay: i * 0.05 });
      const a = Math.atan2(sz - ev.z, sx - ev.x);
      kit.streak({ a: { x: ev.x + Math.cos(a) * 0.9, y: 0.06, z: ev.z + Math.sin(a) * 0.9 }, b: { x: sx, y: 0.06, z: sz }, width: 0.05, tailW: 0.05, core: DIALC, glow: HOUR.corruption, life: 0.5, fall: 1, opacity: 0.45, delay: i * 0.06 });
    });
    kit.light({ x: ev.x, z: ev.z, radius: 3.5, color: BRONZE, opacity: 0.45, life: 0.5, attack: 0.02 });
    camfx.kick(0, 1, HOUR.camera.kick * 0.4, 0.1);
  });
  // A weight lands on its hour: the Ember ring flashes (the hit), a ring of
  // bronze rolls out, stone chips and dust, a dent left in the flags.
  function weightLand(ev) {
    mark('hourwarden_weight');
    const r = ev.radius ?? 1.3;
    // POLISH: the blow in the Hourwarden's template tone (foefx.js), not Ember
    // (Ember is the floor ring's warning before it lands).
    const hit = vfxFoeShotColor('hourwarden');
    SF.flare(ev.x, 0.4, ev.z, hit, 1.6, { kind: 'burst', life: 0.2, core: PARCH });
    SF.shock(ev.x, ev.z, r, hit, { life: 0.26, width: 0.12 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: r * 1.4, width: 0.1, life: 0.45, core: DIALC, glow: BRONZE, soft: 0.5, y: 0.06 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 0.8, kind: 'crater', stain: LIMESTONE, glow: BRONZE, glowOpacity: 0.3, cool: 1.0, life: 3.2, opacity: 0.45 });
    spray('chunk', ev.x, 0.2, ev.z, HOUR.hours.chunk, { color: LIMESTONE, speed: [0.8, 2.0], up: [1.0, 2.2], size: [0.05, 0.11], life: [0.5, 0.8], jitter: 0.3 });
    spray('spark', ev.x, 0.3, ev.z, 6, { color: BRONZE, speed: [0.8, 1.8], up: [0.4, 1.0], size: [0.03, 0.05], life: [0.2, 0.4], gravity: 3, drag: 0.6 });
    spray('smoke', ev.x, 0.15, ev.z, 2, { color: LIMESTONE, speed: [0.6, 1.2], up: [0.0, 0.2], size: [0.36, 0.5], grow: 1.3, life: [0.6, 0.9], opacity: 0.28, gravity: 0, drag: 2.4 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: BRONZE, opacity: 0.4, life: 0.3, attack: 0.02 });
  }
  // Run down: its spring lets go — a burst of little cogs and spring sparks,
  // the violet in its dial guttering out; wound again, a tick of dial light.
  bus.on('boss_run_down', (ev) => {
    mark('hourwarden_rundown');
    spray('shard', ev.x, 2.2, ev.z, 8, { color: BRONZE, tile: SHARD_TILE.needle, speed: [0.6, 1.6], up: [0.6, 1.6], size: [0.08, 0.12], life: [0.6, 0.9], gravity: 5, spin: [-10, 10], jitter: 0.4 });
    spray('spark', ev.x, 2.0, ev.z, 10, { color: HOUR.corruption, speed: [0.2, 0.8], up: [-0.6, 0.2], size: [0.04, 0.07], life: [0.5, 0.8], gravity: 1, drag: 1.2, jitter: 0.5 });
    kit.ring({ x: ev.x, z: ev.z, r0: 1.6, r1: 0.4, width: 0.06, life: 0.5, core: DIALC, glow: HOUR.corruption, soft: 0.6, y: 1.9, opacity: 0.6 });
  });
  bus.on('boss_wound', (ev) => {
    mark('hourwarden_wound');
    SF.flare(ev.x, 2.0, ev.z, HOUR.corruption, 1.2, { kind: 'star', life: 0.25, core: HOUR.peak });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: 1.6, width: 0.06, life: 0.4, core: DIALC, glow: HOUR.corruption, soft: 0.6, y: 1.9 });
  });
  bus.on('boss_hourwarden_phase', (ev) => {
    mark('hourwarden_phase');
    SF.anticipate(ev.x, ev.z, 1.8, HOUR.corruption, { y: 2.0, lines: 12, core: HOUR.peak });
    after(ANTICIP, () => {
      SF.flare(ev.x, 2.0, ev.z, HOUR.corruption, 2.0, { kind: 'burst', life: 0.32, core: HOUR.peak });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        kit.streak({ a: { x: ev.x + Math.cos(a) * 0.8, y: 0.06, z: ev.z + Math.sin(a) * 0.8 }, b: { x: ev.x + Math.cos(a) * 1.1, y: 0.06, z: ev.z + Math.sin(a) * 1.1 }, width: 0.06, tailW: 0.06, core: DIALC, glow: BRONZE, life: 0.6, travel: { x: Math.cos(a) * 3.4, y: 0, z: Math.sin(a) * 3.4 }, fall: 0.2, opacity: 0.8 });
      }
    });
  });
  function hourwardenEnrage(ev) {
    mark('hourwarden_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.6, height: 3.4, color: HOUR.corruption, life: 0.8, opacity: 0.5 });
    SF.flare(x, 2.0, z, HOUR.corruption, 2.4, { kind: 'burst', life: 0.3, core: HOUR.peak, spin: 1.2 });
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.5, r1: 2.6 + i * 0.8, width: 0.12, life: 0.6 + i * 0.12, core: DIALC, glow: i % 2 ? HOUR.corruption : BRONZE, soft: 0.5, y: 0.06 + i * 0.6, delay: i * 0.08 });
    kit.crack({ x, z, radius: 1.8, glow: HOUR.corruption, life: 2.2, cool: 0.9 });
    kit.light({ x, z, radius: 3, color: HOUR.corruption, opacity: 0.5, life: 0.8 });
  }
  function hourwardenDeath(x, z) {
    // The clock stops for good: its bell strikes one last clean hour (dial-
    // light and bronze rings climbing it), the case cracks open and its works
    // burst out — cogs, springs and hands — and the violet spirals away.
    mark('hourwarden_death');
    kit.pillar({ x, z, radius: 1.0, height: 4.6, color: HOUR.corruption, life: 1.4, opacity: 0.65 });
    SF.flare(x, 2.6, z, DIALC, 3.8, { kind: 'burst', life: 0.5, core: PARCH, spin: 0.8 });
    kit.flash({ x, y: 2.4, z, color: PARCH, size: 2.4, life: 0.24 });
    for (let i = 0; i < 4; i++) kit.ring({ x, z, r0: 0.5, r1: 3.6 + i * 1.3, width: 0.24, life: 0.9 + i * 0.25, core: DIALC, glow: i % 2 ? HOUR.corruption : BRONZE, soft: 0.5, y: 0.06 + i * 0.7, delay: i * 0.1 });
    kit.mark({ x, z, radius: 3.2, kind: 'sigil', stain: INK, glow: DIALC, glowOpacity: 0.45, cool: 2.0, life: 6, opacity: 0.4 });
    for (let i = 0; i < N(12); i++) {
      const a = (i / 12) * TAU;
      kit.streak({ a: { x: x + Math.cos(a) * 0.4, y: 2.0, z: z + Math.sin(a) * 0.4 }, b: { x: x + Math.cos(a) * 0.6, y: 2.1, z: z + Math.sin(a) * 0.6 }, width: 0.08, tailW: 0, core: DIALC, glow: i % 3 === 0 ? HOUR.corruption : BRONZE, life: 0.8, travel: { x: Math.cos(a) * 3.2, y: 2.0, z: Math.sin(a) * 3.2 }, fall: 0.25 });
    }
    spray('shard', x, 2.2, z, 22, { color: BRONZE, tile: SHARD_TILE.needle, speed: [1.0, 2.8], up: [1.4, 3.2], size: [0.1, 0.17], life: [0.9, 1.3], gravity: 5, spin: [-10, 10], jitter: 0.5 });
    spray('chunk', x, 1.2, z, 14, { color: LIMESTONE, speed: [0.8, 2.2], up: [1.0, 2.4], size: [0.07, 0.14], life: [0.7, 1.1], jitter: 0.6 });
    spray('spark', x, 0.6, z, 36, { color: HOUR.corruption, speed: [0.3, 1.2], up: [0.8, 2.4], size: [0.06, 0.12], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    spray('smoke', x, 0.4, z, 8, { color: LIMESTONE, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.7], grow: 1.6, life: [1.3, 1.9], opacity: 0.34, gravity: -0.2, drag: 2.0, jitter: 1.0 });
    kit.light({ x, z, radius: 4.4, color: BRONZE, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, HOUR.camera.dolly, 0.55);
  }
  // Wind-ups: the pendulum drawn back (bronze glints at its case and a tick
  // of dial-light), the hands raised (two glints at the blade tips).
  function hourwardenWindup(b, ev) {
    const f = faceOf(b);
    if (ev.attack === 'pendulum') {
      mark('hourwarden_swing_windup');
      SF.anticipate(b.x + f.x * 0.5, b.z + f.z * 0.5, 0.8, BRONZE, { y: 0.9, lines: 8, core: PARCH });
      SF.flare(b.x + f.x * 0.6, 1.0, b.z + f.z * 0.6, HOUR.corruption, 0.9, { life: 0.5, core: HOUR.peak });
    } else if (ev.attack === 'sweep') {
      mark('hourwarden_sweep_windup');
      for (const sd of [-1, 1]) SF.flare(b.x - f.z * 1.2 * sd, 2.6, b.z + f.x * 1.2 * sd, HOUR.corruption, 0.8, { life: 0.4, core: HOUR.peak });
    }
  }
  // Per frame: run down, a slow drip of spring sparks off its key; striking
  // the hour, dial-light motes rise off it; enraged, violet sparks off the
  // spinning hands.
  function hourwardenFrame(e, rec) {
    if (e.mode === 'rundown' && rec.clock >= 0.12) {
      rec.clock = 0;
      const f = unit2(e.faceX ?? 0, e.faceZ ?? 1);
      spray('spark', e.x - f.x * 0.8, 2.0, e.z - f.z * 0.8, 1, { color: BRONZE, speed: [0.1, 0.4], up: [0.2, 0.5], size: [0.04, 0.07], life: [0.4, 0.7], gravity: 1.5, drag: 1.0, opacity: 0.9 });
    } else if (e.mode === 'strike' && rec.clock >= 0.06) {
      rec.clock = 0;
      spray('spark', e.x, 2.6, e.z, 1, { color: DIALC, speed: [0.05, 0.3], up: [0.4, 0.9], size: [0.05, 0.08], life: [0.6, 0.9], gravity: -0.4, drag: 1.4, jitter: 0.6, opacity: 0.85 });
    } else if (e.enraged && rec.clock >= 0.25) {
      rec.clock = 0;
      spray('spark', e.x, 2.0, e.z, 1, { color: HOUR.corruption, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.05, 0.08], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.6, opacity: 0.85 });
    }
  }

  // ------------------------------- The Kiln's bosses (plan 5 slice 8) --
  // (docs/KILN_BOSSES.md) The Bellfounder and the Cinderback, in the Kiln's
  // light: KILN GOLD and white heat over COAL crimson, slag and soot after;
  // Ember only ever on the frame that hurts (the pour's lane, the bell's and
  // the Firing's rings, the surfacing ring, the lash's cone, each gobbet's
  // ring); the hollow song's violet a thread in each.
  const FOUND = vfxBossStyle('founder');
  const CBACK = vfxBossStyle('cinderback');
  const FBRONZE = vfxMatterColor('bellbronze');
  const FBRICK = vfxMatterColor('kilnbrick');
  const FGOLD = vfxMatterColor('kilngold');
  const FHEAT = vfxMatterColor('kilnheat');
  const FCOAL = vfxMatterColor('coal');
  const FSLAG = vfxMatterColor('slag');
  const FSPARK = vfxMatterColor('sparks');
  const FASH = vfxMatterColor('mothash');
  const FOUNDER_CHEST_Y = 1.45; // its kiln door (render/boss/kiln.js)
  const FOUNDER_HEAD_Y = 2.7;
  // The Molten Pour: the crucible tips (a white-hot gush at its lip), and a
  // river of molten bronze runs down the lane — a white-gold streak laid
  // fast along the floor with the Ember edge on the full lane (the hit),
  // drops splashing gold off it, the bronze cooling into gold-seamed slag
  // where the three pools settle, steam and soot rolling off.
  bus.on('boss_molten_pour', (ev) => {
    mark('founder_pour');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ang = Math.atan2(d.z, d.x);
    const SPEED = 16;
    const sweep = len / SPEED;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const lipX = ev.x + d.x * 1.1;
    const lipZ = ev.z + d.z * 1.1;
    SF.flare(lipX, 1.1, lipZ, FGOLD, 1.4, { kind: 'burst', life: 0.2, core: FHEAT });
    kit.streak({ a: { x: lipX, y: 1.1, z: lipZ }, b: { x: lipX + d.x * 0.6, y: 0.1, z: lipZ + d.z * 0.6 }, width: 0.5, tailW: 0.3, core: FHEAT, glow: FGOLD, life: sweep + 0.3, fall: 1.0, opacity: 0.9 });
    kit.streak({ a: { x: ev.x, y: 0.08, z: ev.z }, b: { x: ex, y: 0.08, z: ez }, width: 1.4, tailW: 1.2, core: EMBER, glow: EMBER, life: sweep + 0.16, fall: 2.2, opacity: 0.45 });
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: 0.8, tailW: 0.5, core: FHEAT, glow: FGOLD, life: sweep + 0.9, fall: 0.8, opacity: 0.8, delay: 0.02 });
    kit.streak({ a: { x: ev.x, y: 0.16, z: ev.z }, b: { x: ev.x + d.x * 0.6, y: 0.16, z: ev.z + d.z * 0.6 }, width: 0.3, tailW: 0.7, core: PARCH, glow: FGOLD, life: sweep, travel: { x: d.x * SPEED, y: 0, z: d.z * SPEED }, fall: 0.3 });
    const drops = FOUND.pour.drops;
    for (let i = 0; i < drops; i++) {
      const k = (i + 0.5) / drops;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      after(sweep * k, () => {
        spray('spark', px, 0.15, pz, Math.round(FOUND.pour.sparks / drops), { color: FSPARK, speed: [0.6, 1.8], up: [0.8, 2.0], size: [0.04, 0.07], life: [0.3, 0.6], gravity: 4, drag: 0.6, jitter: 0.4 });
        spray('shard', px, 0.2, pz, 2, { color: FHEAT, tile: SHARD_TILE.drop, speed: [0.3, 0.9], up: [1.0, 1.8], size: [0.08, 0.12], life: [0.35, 0.55], gravity: 6, spin: [-2, 2] });
        spray('smoke', px, 0.15, pz, 1, { color: FASH, speed: [0.1, 0.3], up: [0.3, 0.6], size: [0.4, 0.55], grow: 1.5, life: [0.9, 1.4], opacity: 0.22, gravity: -0.3, drag: 1.8, jitter: 0.4 });
      });
    }
    for (let k = 0; k < 3; k++) {
      const s = len * ((k + 0.5) / 3);
      kit.mark({ x: ev.x + d.x * s, z: ev.z + d.z * s, radius: 0.85, kind: 'splash', stain: FSLAG, glow: FGOLD, glowOpacity: 0.6, cool: 2.4, life: 3.4, opacity: 0.5, delay: sweep * ((k + 0.5) / 3) });
    }
    kit.mark({ x: (ev.x + ex) / 2, z: (ev.z + ez) / 2, radius: len * 0.45, kind: 'gouge', angle: ang, stretch: 3.2, stain: INK, glow: FGOLD, glowOpacity: 0.35, cool: 1.6, life: 3.0, opacity: 0.3 });
    kit.light({ x: (ev.x + ex) / 2, z: (ev.z + ez) / 2, radius: Math.min(3.4, len * 0.45), color: FGOLD, opacity: 0.5, life: 0.7, attack: 0.03 });
    camfx.kick(d.x, d.z, FOUND.camera.kick * 0.5, 0.12);
  });
  // The Bell Drop: a fresh-cast bell falls out of the dark (a gold streak
  // dropping onto the ring), lands — the Ember ring flashes (the hit), a ring
  // of bronze sound rolls out in waves, flagstone chips, a crater with a
  // ring-shaped gold seam — and the bell shatters into bronze shards.
  bus.on('boss_bell_drop', (ev) => {
    mark('founder_bell');
    const r = ev.radius ?? 1.9;
    kit.streak({ a: { x: ev.x, y: 5.5, z: ev.z }, b: { x: ev.x, y: 4.6, z: ev.z }, width: 0.5, tailW: 0.2, core: FHEAT, glow: FBRONZE, life: 0.12, travel: { x: 0, y: -36, z: 0 }, fall: 0.3 });
    SF.flare(ev.x, 0.5, ev.z, EMBER, 2.0, { kind: 'burst', life: 0.22, core: PARCH });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.14 });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: FHEAT, size: 1.4, life: 0.14 });
    for (let i = 0; i < FOUND.bell.rings; i++) kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: r * (1.3 + i * 0.5), width: 0.09, life: 0.5 + i * 0.14, core: PARCH, glow: i === 1 ? FOUND.corruption : FBRONZE, soft: 0.55, y: 0.5 + i * 0.35, delay: i * 0.09 });
    spray('shard', ev.x, 0.6, ev.z, 14, { color: FBRONZE, tile: SHARD_TILE.needle, speed: [1.0, 2.6], up: [1.2, 2.6], size: [0.09, 0.15], life: [0.6, 0.9], gravity: 6, spin: [-10, 10], jitter: 0.4 });
    spray('chunk', ev.x, 0.2, ev.z, FOUND.bell.chunk, { color: FBRICK, speed: [0.8, 2.0], up: [1.0, 2.2], size: [0.05, 0.11], life: [0.5, 0.8], jitter: r * 0.4 });
    spray('spark', ev.x, 0.3, ev.z, 10, { color: FSPARK, speed: [0.8, 2.2], up: [0.4, 1.2], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 3, drag: 0.6, jitter: 0.3 });
    spray('smoke', ev.x, 0.15, ev.z, 4, { color: FBRICK, speed: [0.6, 1.4], up: [0.05, 0.25], size: [0.4, 0.55], grow: 1.4, life: [0.7, 1.0], opacity: 0.3, gravity: 0, drag: 2.4, jitter: r * 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 0.9, kind: 'crater', stain: FBRICK, glow: FGOLD, glowOpacity: 0.4, cool: 1.4, life: 3.4, opacity: 0.5 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.5, color: FBRONZE, opacity: 0.5, life: 0.4, attack: 0.02 });
    camfx.kick(0, 1, FOUND.camera.kick * 0.6, 0.12);
  });
  // A Casting: a mould cracks open at its feet — gold light floods out of
  // the cracks, molten bronze spills, and the violet of the hollow song
  // flickers through it as the Kiln's creatures crawl out.
  bus.on('boss_casting', (ev) => {
    mark('founder_casting');
    const { x, z } = ev;
    SF.anticipate(x, z, 1.8, FGOLD, { y: 0.3, lines: 10, core: FHEAT });
    after(ANTICIP, () => {
      kit.crack({ x, z, radius: 2.4, glow: FGOLD, life: 2.6, cool: 1.4 });
      SF.flare(x, 0.4, z, FGOLD, 2.2, { kind: 'burst', life: 0.3, core: FHEAT });
      SF.flare(x, 1.2, z, FOUND.corruption, 1.4, { life: 0.3, core: FOUND.peak });
      SF.shock(x, z, 2.6, FGOLD, { life: 0.4, width: 0.1, core: FHEAT });
      spray('chunk', x, 0.2, z, 12, { color: FBRICK, speed: [0.8, 2.0], up: [1.0, 2.2], size: [0.06, 0.12], life: [0.5, 0.8], jitter: 1.0 });
      spray('spark', x, 0.2, z, 18, { color: FSPARK, speed: [0.6, 1.8], up: [0.8, 2.0], size: [0.04, 0.07], life: [0.4, 0.7], gravity: 3, drag: 0.6, jitter: 1.2 });
      SF.embersUp(x, z, FOUND.corruption, 8, { radius: 1.2 });
      kit.light({ x, z, radius: 3.2, color: FGOLD, opacity: 0.55, life: 0.7 });
    });
  });
  // The Firing: its chest doors fly open and the kiln's heat pours out — a
  // white-hot flash at the door, a dome of heat (gold rings climbing and
  // rolling out to the ring's edge), the Ember ring flashing (the hit), rays
  // of light thrown across the floor, sparks in a storm, a scorched floor.
  bus.on('boss_firing', (ev) => {
    mark('founder_firing');
    const { x, z } = ev;
    const r = ev.radius ?? 4.4;
    kit.flash({ x, y: FOUNDER_CHEST_Y, z, color: FHEAT, size: 3.0, life: 0.22 });
    SF.flare(x, FOUNDER_CHEST_Y, z, FGOLD, 3.6, { kind: 'burst', life: 0.36, core: FHEAT, spin: 0.6 });
    SF.shock(x, z, r, EMBER, { life: 0.36, width: 0.18 });
    for (let i = 0; i < 4; i++) kit.ring({ x, z, r0: 0.6, r1: r * (0.75 + i * 0.12), width: 0.14 - i * 0.02, life: 0.5 + i * 0.12, core: FHEAT, glow: i === 2 ? FOUND.corruption : FGOLD, soft: 0.5, y: 0.08 + i * 0.55, delay: i * 0.06 });
    for (let i = 0; i < N(FOUND.firing.rays); i++) {
      const a = (i / FOUND.firing.rays) * TAU + rnd(-0.1, 0.1);
      kit.streak({ a: { x: x + Math.cos(a) * 0.8, y: 0.1, z: z + Math.sin(a) * 0.8 }, b: { x: x + Math.cos(a) * r, y: 0.1, z: z + Math.sin(a) * r }, width: 0.18, tailW: 0.04, core: FHEAT, glow: FGOLD, life: 0.5, fall: 1.4, opacity: 0.6 });
    }
    spray('spark', x, FOUNDER_CHEST_Y, z, FOUND.firing.sparks, { color: FSPARK, speed: [1.5, 4.0], up: [0.2, 1.4], size: [0.04, 0.08], life: [0.4, 0.8], gravity: 2, drag: 0.6, jitter: 0.4 });
    spray('smoke', x, 0.3, z, 10, { color: FBRICK, speed: [1.0, 2.4], up: [0.1, 0.4], size: [0.5, 0.7], grow: 1.6, life: [0.8, 1.2], opacity: 0.3, gravity: -0.1, drag: 2.0, jitter: 1.0 });
    kit.mark({ x, z, radius: r * 0.85, kind: 'scorch', stain: INK, glow: FGOLD, glowOpacity: 0.35, cool: 1.8, life: 4.0, opacity: 0.4 });
    kit.light({ x, z, radius: r * 1.1, color: FGOLD, opacity: 0.75, life: 0.8, attack: 0.02 });
    camfx.dolly(x, z, FOUND.camera.dolly * 0.6, 0.35);
  });
  // Rekindled: the bellows draw breath, and its seams catch again from the
  // feet up — a gold ring climbing it, a puff of sparks off the flue.
  bus.on('boss_founder_rekindle', (ev) => {
    mark('founder_rekindle');
    const { x, z } = ev;
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 1.0, r1: 0.7, width: 0.07, life: 0.4, core: FHEAT, glow: FGOLD, soft: 0.6, y: 0.4 + i * 0.8, delay: i * 0.1 });
    spray('spark', x, FOUNDER_HEAD_Y + 0.2, z, 10, { color: FSPARK, speed: [0.2, 0.8], up: [1.0, 2.0], size: [0.04, 0.07], life: [0.5, 0.9], gravity: 0.5, drag: 1.0, jitter: 0.3 });
    SF.flare(x, FOUNDER_CHEST_Y, z, FGOLD, 1.4, { life: 0.3, core: FHEAT });
  });
  function founderDeath(x, z) {
    // Its last bell rings true: the fire inside it flares white and dies, its
    // brick courses burst outward, the crucible spills one last gold flood,
    // a clean bronze bell-ring rolls out, and the violet spirals away.
    mark('founder_death');
    kit.pillar({ x, z, radius: 1.0, height: 4.6, color: FOUND.corruption, life: 1.4, opacity: 0.6 });
    kit.flash({ x, y: FOUNDER_CHEST_Y, z, color: PARCH, size: 2.8, life: 0.26 });
    SF.flare(x, FOUNDER_CHEST_Y, z, FGOLD, 4.0, { kind: 'burst', life: 0.5, core: FHEAT, spin: 0.8 });
    for (let i = 0; i < 4; i++) kit.ring({ x, z, r0: 0.5, r1: 3.6 + i * 1.3, width: 0.22, life: 0.9 + i * 0.25, core: PARCH, glow: i % 2 ? FOUND.corruption : FBRONZE, soft: 0.5, y: 0.06 + i * 0.7, delay: i * 0.1 });
    kit.mark({ x, z, radius: 3.0, kind: 'splash', stain: FSLAG, glow: FGOLD, glowOpacity: 0.55, cool: 3.0, life: 6, opacity: 0.5 });
    kit.crack({ x, z, radius: 3.0, glow: FGOLD, life: 3.0, cool: 2.0 });
    for (let i = 0; i < N(12); i++) {
      const a = (i / 12) * TAU;
      kit.streak({ a: { x: x + Math.cos(a) * 0.4, y: 2.0, z: z + Math.sin(a) * 0.4 }, b: { x: x + Math.cos(a) * 0.6, y: 2.1, z: z + Math.sin(a) * 0.6 }, width: 0.08, tailW: 0, core: FHEAT, glow: i % 3 === 0 ? FOUND.corruption : FGOLD, life: 0.8, travel: { x: Math.cos(a) * 3.2, y: 2.0, z: Math.sin(a) * 3.2 }, fall: 0.25 });
    }
    spray('chunk', x, 1.4, z, 22, { color: FBRICK, speed: [1.0, 2.6], up: [1.2, 2.8], size: [0.08, 0.16], life: [0.8, 1.2], jitter: 0.6 });
    spray('shard', x, 1.2, z, 14, { color: FBRONZE, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.2, 2.6], size: [0.09, 0.15], life: [0.8, 1.2], gravity: 5, spin: [-10, 10], jitter: 0.5 });
    spray('spark', x, 0.6, z, 40, { color: FSPARK, speed: [0.4, 1.6], up: [0.8, 2.6], size: [0.05, 0.1], life: [1.2, 2.0], gravity: -0.2, drag: 1.2, jitter: 1.0 });
    SF.embersUp(x, z, FOUND.corruption, 24, { radius: 1.0, life: [1.4, 2.2] });
    spray('smoke', x, 0.4, z, 10, { color: FBRICK, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.7], grow: 1.6, life: [1.3, 1.9], opacity: 0.34, gravity: -0.2, drag: 2.0, jitter: 1.0 });
    kit.light({ x, z, radius: 4.6, color: FGOLD, opacity: 0.65, life: 1.4 });
    camfx.dolly(x, z, FOUND.camera.dolly, 0.55);
  }
  // Wind-ups: the crucible tipping (heat gathers at its lip), the bell
  // heaved up (gold motes rising to it), the Firing (heat drawn in from the
  // whole ring to its chest door).
  function founderWindup(b, ev) {
    const f = faceOf(b);
    if (ev.attack === 'pour') {
      mark('founder_pour_windup');
      SF.anticipate(b.x + f.x * 1.1, b.z + f.z * 1.1, 0.7, FGOLD, { y: 1.1, lines: 8, core: FHEAT });
      SF.flare(b.x + f.x * 1.1, 1.2, b.z + f.z * 1.1, FGOLD, 0.9, { life: 0.5, core: FHEAT });
    } else if (ev.attack === 'bell') {
      mark('founder_bell_windup');
      SF.flare(b.x, 3.0, b.z, FBRONZE, 1.1, { life: 0.5, core: PARCH });
      SF.embersUp(b.x, b.z, FGOLD, 6, { radius: 0.6, y: 1.6, life: [0.5, 0.8] });
    } else if (ev.attack === 'firing') {
      mark('founder_firing_windup');
      SF.anticipate(b.x, b.z, 4.4, FGOLD, { y: 0.4, lines: 16, core: FHEAT });
      SF.flare(b.x, FOUNDER_CHEST_Y, b.z + 0.8, FOUND.corruption, 1.2, { life: 0.5, core: FOUND.peak });
    }
  }
  // Per frame: stoking for the Firing, heat motes stream in from the ring's
  // edge to its chest door; quenched, grey steam and ash sift off it; at
  // rest, a slow thread of smoke and sparks rises from its flue.
  function founderFrame(e, rec) {
    const t = e.telegraph;
    if (e.mode === 'stoke' && t && rec.clock >= 0.04) {
      rec.clock = 0;
      const a = rnd(0, TAU);
      const r0 = (t.radius ?? 4.4) * rnd(0.85, 1.1);
      const sx = e.x + Math.cos(a) * r0;
      const sz = e.z + Math.sin(a) * r0;
      const tt = 0.45;
      kit.streak({ a: { x: sx, y: rnd(0.2, 1.2), z: sz }, b: { x: sx - Math.cos(a) * 0.4, y: 1.0, z: sz - Math.sin(a) * 0.4 }, width: 0.06, tailW: 0, core: FHEAT, glow: FGOLD, life: tt, travel: { x: (e.x - sx) / tt, y: 1.0, z: (e.z - sz) / tt }, fall: 0.6, opacity: 0.85 });
    } else if (e.mode === 'quenched' && rec.clock >= 0.07) {
      rec.clock = 0;
      spray('smoke', e.x + rnd(-0.6, 0.6), rnd(1.0, 2.4), e.z + rnd(-0.5, 0.5), 1, { color: FASH, speed: [0.05, 0.2], up: [0.6, 1.1], size: [0.4, 0.6], grow: 1.4, life: [1.0, 1.5], opacity: 0.26, gravity: -0.4, drag: 1.4, jitter: 0.3 });
    } else if (rec.clock >= 0.22) {
      rec.clock = 0;
      const f = unit2(e.faceX ?? 0, e.faceZ ?? 1);
      spray('smoke', e.x - f.x * 0.45, 3.0, e.z - f.z * 0.45, 1, { color: FBRICK, speed: [0.05, 0.15], up: [0.5, 0.9], size: [0.3, 0.45], grow: 1.6, life: [1.2, 1.6], opacity: 0.24, gravity: -0.3, drag: 1.2 });
      if (rnd(0, 1) < 0.4) spray('spark', e.x - f.x * 0.45, 3.0, e.z - f.z * 0.45, 1, { color: FSPARK, speed: [0.05, 0.25], up: [0.6, 1.2], size: [0.03, 0.06], life: [0.6, 1.0], gravity: -0.2, drag: 1.0, opacity: 0.9 });
    }
  }

  // The Magma Dive surfaces: the floor in the ring bursts up — the Ember
  // ring flashes (the hit), a crown of molten slag thrown up gold and raining
  // back, gold seams racing out through the flags, dark slag chunks, a pool
  // of slag left glowing (the slick), and the camera punches.
  bus.on('boss_magma_dive', (ev) => {
    mark('cinderback_surface');
    const r = ev.radius ?? 2.0;
    SF.flare(ev.x, 0.6, ev.z, EMBER, 2.2, { kind: 'burst', life: 0.24, core: PARCH });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.32, width: 0.16 });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: FHEAT, size: 1.8, life: 0.16 });
    for (let i = 0; i < 2; i++) kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: r * (1.2 + i * 0.4), width: 0.12, life: 0.45 + i * 0.12, core: FHEAT, glow: i ? CBACK.corruption : FGOLD, soft: 0.5, y: 0.08 + i * 0.4, delay: i * 0.06 });
    spray('shard', ev.x, 0.4, ev.z, 16, { color: FHEAT, tile: SHARD_TILE.drop, speed: [0.6, 1.8], up: [2.0, 3.6], size: [0.1, 0.16], life: [0.6, 0.9], gravity: 7, spin: [-2, 2], jitter: 0.4 });
    spray('chunk', ev.x, 0.3, ev.z, CBACK.dive.chunk, { color: FSLAG, speed: [0.8, 2.2], up: [1.2, 2.6], size: [0.07, 0.14], life: [0.6, 0.9], jitter: 0.5 });
    spray('spark', ev.x, 0.3, ev.z, CBACK.dive.sparks, { color: FSPARK, speed: [0.8, 2.6], up: [1.0, 2.6], size: [0.04, 0.08], life: [0.4, 0.8], gravity: 3, drag: 0.6, jitter: 0.5 });
    spray('smoke', ev.x, 0.2, ev.z, 5, { color: FBRICK, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.45, 0.6], grow: 1.5, life: [0.8, 1.2], opacity: 0.3, gravity: -0.2, drag: 2.2, jitter: 0.6 });
    for (let i = 0; i < N(CBACK.dive.seams); i++) {
      const a = (i / CBACK.dive.seams) * TAU + rnd(-0.2, 0.2);
      kit.streak({ a: { x: ev.x + Math.cos(a) * 0.5, y: 0.05, z: ev.z + Math.sin(a) * 0.5 }, b: { x: ev.x + Math.cos(a) * r * 1.3, y: 0.05, z: ev.z + Math.sin(a) * r * 1.3 }, width: 0.08, tailW: 0.02, core: FHEAT, glow: FGOLD, life: 0.9, fall: 1.2, opacity: 0.7 });
    }
    kit.crack({ x: ev.x, z: ev.z, radius: r * 1.2, glow: FGOLD, life: 2.4, cool: 1.4 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.6, color: FGOLD, opacity: 0.65, life: 0.6, attack: 0.02 });
    camfx.kick(0, 1, CBACK.camera.kick, 0.14);
  });
  // The Tail Lash: a gold arc whipped round through the cone with the Ember
  // edge on the cut, coals flung off the tail, grit sprayed with it.
  bus.on('boss_tail_lash', (ev) => {
    mark('cinderback_lash');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const ang = Math.atan2(d.z, d.x);
    const r = ev.radius ?? 3.2;
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.85, width: 0.5, span: 2.27, sweep: 0.1, life: 0.32, core: PARCH, glow: EMBER, soft: 0.5, jag: 0.12, lift: 0.08, y: 0.5, gain: 1.1 });
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.65, width: 0.28, span: 2.1, sweep: 0.12, life: 0.4, core: FHEAT, glow: FGOLD, soft: 0.6, lift: 0.04, y: 0.35, gain: 0.8, delay: 0.03 });
    spray('spark', ev.x + d.x * r * 0.7, 0.4, ev.z + d.z * r * 0.7, CBACK.lash.sparks, { color: FSPARK, speed: [1.2, 3.0], up: [0.3, 1.0], size: [0.04, 0.07], life: [0.3, 0.5], gravity: 3, drag: 0.6, dir: d, dirBias: 0.5, jitter: 0.8 });
    spray('chunk', ev.x + d.x * r * 0.5, 0.1, ev.z + d.z * r * 0.5, 6, { color: FBRICK, speed: [0.8, 1.8], up: [0.6, 1.2], size: [0.05, 0.09], life: [0.4, 0.6], dir: d, dirBias: 0.6, jitter: 0.6 });
    kit.mark({ x: ev.x + d.x * r * 0.55, z: ev.z + d.z * r * 0.55, radius: r * 0.5, kind: 'gouge', angle: ang + Math.PI / 2, stretch: 2.8, stain: INK, glow: FGOLD, glowOpacity: 0.35, cool: 0.8, life: 2.2, opacity: 0.35 });
    camfx.kick(d.x, d.z, CBACK.camera.kick * 0.5, 0.1);
  });
  // The Ember Spit: its throat flashes white and three gobbets arc out, each
  // trailing gold (the gobbets themselves are the globs); each lands in a
  // splash of molten slag on its Ember ring.
  bus.on('boss_ember_spit', (ev) => {
    mark('cinderback_spit');
    const b = SF.byId(ev.id);
    const f = faceOf(b);
    const mx = ev.x + f.x * 1.2;
    const mz = ev.z + f.z * 1.2;
    kit.flash({ x: mx, y: 1.2, z: mz, color: FHEAT, size: 1.0, life: 0.16 });
    SF.flare(mx, 1.2, mz, FGOLD, 1.3, { kind: 'burst', life: 0.2, core: FHEAT });
    const spots = Array.isArray(ev.spots) ? ev.spots : [];
    spots.forEach(([sx, sz], i) => {
      const dx = sx - mx;
      const dz = sz - mz;
      const tt = 0.9 + i * 0.2;
      kit.streak({ a: { x: mx, y: 1.2, z: mz }, b: { x: mx + dx * 0.05, y: 1.3, z: mz + dz * 0.05 }, width: 0.22, tailW: 0.4, core: FHEAT, glow: FGOLD, life: tt * 0.6, travel: { x: dx / tt, y: 0.6, z: dz / tt }, fall: 0.6, opacity: 0.8, delay: i * 0.04 });
    });
    spray('spark', mx, 1.2, mz, CBACK.spit.sparks, { color: FSPARK, speed: [0.6, 1.6], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 3, drag: 0.6, dir: f, dirBias: 0.6 });
  });
  function emberLand(ev) {
    mark('cinderback_gobbet');
    const r = ev.radius ?? 1.1;
    SF.flare(ev.x, 0.3, ev.z, EMBER, 1.4, { kind: 'burst', life: 0.18, core: PARCH });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.24, width: 0.1 });
    spray('shard', ev.x, 0.3, ev.z, 6, { color: FHEAT, tile: SHARD_TILE.drop, speed: [0.5, 1.4], up: [1.2, 2.2], size: [0.08, 0.12], life: [0.4, 0.6], gravity: 6, spin: [-2, 2] });
    spray('spark', ev.x, 0.2, ev.z, 8, { color: FSPARK, speed: [0.6, 1.6], up: [0.4, 1.2], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 3, drag: 0.6 });
    spray('smoke', ev.x, 0.15, ev.z, 2, { color: FASH, speed: [0.2, 0.5], up: [0.3, 0.6], size: [0.36, 0.5], grow: 1.4, life: [0.8, 1.1], opacity: 0.24, gravity: -0.3, drag: 2.0 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 0.85, kind: 'splash', stain: FSLAG, glow: FGOLD, glowOpacity: 0.5, cool: 1.6, life: 2.6, opacity: 0.45 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: FGOLD, opacity: 0.4, life: 0.3, attack: 0.02 });
  }
  // Spent and back: it shakes the ash off its gills and its coals catch.
  bus.on('boss_cinder_recover', (ev) => {
    mark('cinderback_recover');
    spray('smoke', ev.x, 0.6, ev.z, 4, { color: FASH, speed: [0.4, 1.0], up: [0.3, 0.7], size: [0.36, 0.5], grow: 1.4, life: [0.7, 1.0], opacity: 0.28, gravity: -0.2, drag: 2.0, jitter: 0.6 });
    SF.embersUp(ev.x, ev.z, FGOLD, 10, { radius: 0.8, life: [0.6, 1.0] });
  });
  bus.on('boss_cinderback_phase', (ev) => {
    mark('cinderback_phase');
    SF.anticipate(ev.x, ev.z, 1.8, CBACK.corruption, { y: 0.6, lines: 10, core: CBACK.peak });
    after(ANTICIP, () => {
      SF.flare(ev.x, 0.8, ev.z, FGOLD, 2.0, { kind: 'burst', life: 0.3, core: FHEAT });
      SF.flare(ev.x, 1.0, ev.z, CBACK.corruption, 1.4, { life: 0.3, core: CBACK.peak });
      SF.shock(ev.x, ev.z, 2.6, FGOLD, { life: 0.4, width: 0.1, core: FHEAT });
      SF.embersUp(ev.x, ev.z, FGOLD, 12, { radius: 1.0 });
    });
  });
  function cinderbackEnrage(ev) {
    mark('cinderback_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.7, height: 3.0, color: FGOLD, life: 0.8, opacity: 0.45 });
    SF.flare(x, 1.0, z, CBACK.corruption, 2.4, { kind: 'burst', life: 0.3, core: CBACK.peak, spin: 1.2 });
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.5, r1: 2.6 + i * 0.8, width: 0.12, life: 0.6 + i * 0.12, core: FHEAT, glow: i % 2 ? CBACK.corruption : FGOLD, soft: 0.5, y: 0.06 + i * 0.5, delay: i * 0.08 });
    kit.crack({ x, z, radius: 1.8, glow: FGOLD, life: 2.2, cool: 0.9 });
    spray('spark', x, 0.6, z, 24, { color: FSPARK, speed: [0.8, 2.2], up: [0.8, 2.0], size: [0.04, 0.08], life: [0.4, 0.8], gravity: 2, drag: 0.6, jitter: 0.6 });
    kit.light({ x, z, radius: 3, color: FGOLD, opacity: 0.55, life: 0.8 });
  }
  function cinderbackDeath(x, z) {
    // The warden sinks into the coals for good: a last gout of magma, its
    // coals flaring white and then going out one by one, a pool of cooling
    // slag where it lay, ash drifting up, and the violet spiralling away.
    mark('cinderback_death');
    kit.pillar({ x, z, radius: 0.9, height: 4.0, color: CBACK.corruption, life: 1.3, opacity: 0.6 });
    kit.flash({ x, y: 0.8, z, color: PARCH, size: 2.4, life: 0.24 });
    SF.flare(x, 0.8, z, FGOLD, 3.6, { kind: 'burst', life: 0.5, core: FHEAT, spin: 0.8 });
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.5, r1: 3.2 + i * 1.2, width: 0.2, life: 0.9 + i * 0.25, core: FHEAT, glow: i % 2 ? CBACK.corruption : FGOLD, soft: 0.5, y: 0.06 + i * 0.5, delay: i * 0.1 });
    kit.mark({ x, z, radius: 2.8, kind: 'splash', stain: FSLAG, glow: FGOLD, glowOpacity: 0.55, cool: 3.2, life: 6, opacity: 0.5 });
    kit.crack({ x, z, radius: 2.6, glow: FGOLD, life: 3.0, cool: 2.0 });
    for (let i = 0; i < N(10); i++) {
      const a = (i / 10) * TAU;
      const px = x + Math.cos(a) * rnd(0.4, 1.6);
      const pz = z + Math.sin(a) * rnd(0.4, 1.6);
      after(0.08 * i, () => SF.flare(px, 0.5, pz, FGOLD, 0.8, { life: 0.3, core: FHEAT }));
    }
    spray('shard', x, 0.5, z, 18, { color: FHEAT, tile: SHARD_TILE.drop, speed: [0.6, 1.8], up: [2.0, 3.4], size: [0.1, 0.16], life: [0.7, 1.0], gravity: 7, spin: [-2, 2], jitter: 0.6 });
    spray('chunk', x, 0.4, z, 16, { color: FSLAG, speed: [0.8, 2.2], up: [1.0, 2.4], size: [0.07, 0.14], life: [0.7, 1.1], jitter: 0.8 });
    spray('spark', x, 0.4, z, 36, { color: FSPARK, speed: [0.4, 1.6], up: [0.8, 2.4], size: [0.05, 0.1], life: [1.2, 2.0], gravity: -0.2, drag: 1.2, jitter: 1.0 });
    SF.embersUp(x, z, CBACK.corruption, 20, { radius: 1.0, life: [1.4, 2.2] });
    spray('smoke', x, 0.3, z, 10, { color: FASH, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.7], grow: 1.6, life: [1.3, 1.9], opacity: 0.32, gravity: -0.2, drag: 2.0, jitter: 1.0 });
    kit.light({ x, z, radius: 4.2, color: FGOLD, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, CBACK.camera.dolly, 0.55);
  }
  // Wind-ups: nosing down for the dive (gold seams start to glow in the
  // ring, the floor there going molten), coiling for the lash (coals flare
  // along its tail), rearing to spit (its throat lights).
  function cinderbackWindup(b, ev) {
    if (ev.attack === 'dive') {
      mark('cinderback_dive_windup');
      const t = b.telegraph;
      const tx = t?.x ?? b.x;
      const tz = t?.z ?? b.z;
      SF.anticipate(tx, tz, t?.radius ?? 2.0, FGOLD, { y: 0.1, lines: 10, core: FHEAT });
      kit.mark({ x: tx, z: tz, radius: (t?.radius ?? 2.0) * 0.9, kind: 'crater', stain: FCOAL, glow: FGOLD, glowOpacity: 0.5, cool: 1.6, life: 1.6, opacity: 0.35 });
      spray('chunk', b.x, 0.1, b.z, 5, { color: FBRICK, speed: [0.4, 1.0], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.6] });
    } else if (ev.attack === 'lash') {
      mark('cinderback_lash_windup');
      const f = faceOf(b);
      SF.flare(b.x - f.x * 1.6, 0.6, b.z - f.z * 1.6, FGOLD, 0.9, { life: 0.45, core: FHEAT });
    }
  }
  // Per frame: nosing and under, a trail of molten floor and sparks marks
  // where it swims (so the party can read it under the flags); spent, ash
  // sifts off its back; rearing, white heat drips from its jaw; at rest, a
  // slow drift of sparks off its coals.
  function cinderbackFrame(e, rec) {
    if ((e.mode === 'under' || e.mode === 'nose') && rec.clock >= 0.05) {
      rec.clock = 0;
      spray('spark', e.x + rnd(-0.4, 0.4), 0.08, e.z + rnd(-0.4, 0.4), 2, { color: FSPARK, speed: [0.2, 0.8], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.3, 0.6], gravity: 2, drag: 0.8 });
      if (e.mode === 'under') kit.mark({ x: e.x, z: e.z, radius: 0.7, kind: 'scorch', stain: FCOAL, glow: FGOLD, glowOpacity: 0.55, cool: 1.0, life: 1.6, opacity: 0.4 });
    } else if (e.mode === 'spent' && rec.clock >= 0.09) {
      rec.clock = 0;
      spray('smoke', e.x + rnd(-0.6, 0.6), 0.7, e.z + rnd(-0.6, 0.6), 1, { color: FASH, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.34, 0.5], grow: 1.3, life: [0.8, 1.2], opacity: 0.24, gravity: -0.3, drag: 1.4 });
    } else if (e.mode === 'rear' && rec.clock >= 0.05) {
      rec.clock = 0;
      const f = unit2(e.faceX ?? 0, e.faceZ ?? 1);
      spray('spark', e.x + f.x * 1.2, 1.1, e.z + f.z * 1.2, 1, { color: FHEAT, speed: [0.05, 0.2], up: [-0.4, 0.0], size: [0.05, 0.08], life: [0.3, 0.5], gravity: 3, drag: 0.6, opacity: 0.95 });
    } else if (rec.clock >= (e.enraged ? 0.12 : 0.28)) {
      rec.clock = 0;
      SF.embersUp(e.x, e.z, e.enraged ? FHEAT : FGOLD, 1, { radius: 0.6, y: 0.8, life: [0.6, 1.0] });
    }
  }

  // Wind-ups: the Hush's Great Hush draws the room in (handled per frame for
  // its whole warning); its note gathers at the raised finger. The Skyhorn
  // paws grit up before a rush and its horns glint before a toll.
  function spireWindup(b, ev) {
    if (b.kind === 'hush') {
      if (ev.attack === 'great') {
        mark('hush_great_windup');
        SF.anticipate(b.x, b.z, 4.6, HUSHS.corruption, { y: 0.4, lines: 16, core: HUSHS.peak });
        SF.flare(b.x, 2.8, b.z, HUSHS.rim, 1.6, { life: 0.5, core: HUSHS.peak });
      } else if (ev.attack === 'note') {
        mark('hush_note_windup');
        const f = faceOf(b);
        SF.anticipate(b.x + f.x * 0.6, b.z + f.z * 0.6, 0.6, HUSHS.corruption, { y: 2.4, lines: 6, core: HUSHS.peak });
      }
    } else if (b.kind === 'skyhorn') {
      if (ev.attack === 'rush') {
        mark('skyhorn_paw');
        const f = faceOf(b);
        spray('chunk', b.x + f.x * 0.6, 0.1, b.z + f.z * 0.6, 5, { color: LIMESTONE, speed: [0.4, 1.0], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.6], dir: { x: -f.x, z: -f.z }, dirBias: 0.6 });
        for (const sd of [-1, 1]) SF.flare(b.x + f.x * 0.9 - f.z * 0.4 * sd, 2.2, b.z + f.z * 0.9 + f.x * 0.4 * sd, HORN.corruption, 0.7, { life: 0.4, core: HORN.peak });
      } else if (ev.attack === 'toll') {
        mark('skyhorn_toll_windup');
        SF.anticipate(b.x, b.z, 2.9, BRONZE, { y: 2.0, lines: 10, core: PARCH });
      } else if (ev.attack === 'leap') {
        mark('skyhorn_crouch');
        spray('smoke', b.x, 0.15, b.z, 5, { color: LIMESTONE, speed: [1.0, 1.8], up: [0.1, 0.3], size: [0.4, 0.55], grow: 1.4, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4, jitter: 0.5 });
      }
    }
  }
  // Per frame: during the Great Hush's warning, light and motes stream in
  // from the ring's edge to the Hush (the sound being drawn out of the
  // room); drained, grey dust sifts off its veil; it sheds a slow pale mist.
  // The Skyhorn throws grit off its hooves at the gallop, and dazed it
  // shakes off bronze sparks and chips.
  function spireFrame(e, rec) {
    if (e.kind === 'hush') {
      const t = e.telegraph;
      if (t && t.attack === 'great' && rec.clock >= 0.035) {
        rec.clock = 0;
        const a = rnd(0, TAU);
        const r0 = (t.radius ?? 4.6) * rnd(0.9, 1.15);
        const sx = e.x + Math.cos(a) * r0;
        const sz = e.z + Math.sin(a) * r0;
        const tt = 0.5;
        kit.streak({ a: { x: sx, y: rnd(0.3, 1.6), z: sz }, b: { x: sx - Math.cos(a) * 0.4, y: 1.0, z: sz - Math.sin(a) * 0.4 }, width: 0.05, tailW: 0, core: HUSHS.peak, glow: HUSHS.corruption, life: tt, travel: { x: (e.x - sx) / tt, y: 1.2, z: (e.z - sz) / tt }, fall: 0.6, opacity: 0.85 });
        if (rnd(0, 1) < 0.5) spray('smoke', sx, 0.15, sz, 1, { color: HVEIL, speed: [0.0, 0.05], up: [0.0, 0.1], size: [0.36, 0.5], grow: 0.4, life: [0.5, 0.7], opacity: 0.2, gravity: 0, drag: 2 });
      } else if (e.mode === 'drained' && rec.clock >= 0.08) {
        rec.clock = 0;
        spray('spark', e.x, 2.4, e.z, 1, { color: HVEIL, speed: [0.02, 0.15], up: [-0.6, -0.2], size: [0.05, 0.09], life: [0.8, 1.2], gravity: 0.4, drag: 1.4, jitter: 0.6, opacity: 0.8 });
      } else if (rec.clock >= 0.3) {
        rec.clock = 0;
        spray('smoke', e.x, 0.2, e.z, 1, { color: HPALE, speed: [0.05, 0.2], up: [0.0, 0.1], size: [0.45, 0.6], grow: 0.8, life: [1.0, 1.4], opacity: 0.12, gravity: 0, drag: 2.0, jitter: 0.6 });
      }
    } else if (e.kind === 'skyhorn') {
      if (e.mode === 'rush' && rec.clock >= 0.04) {
        rec.clock = 0;
        const f = unit2(e.faceX ?? 0, e.faceZ ?? 1);
        spray('chunk', e.x - f.x * 0.6, 0.12, e.z - f.z * 0.6, 1, { color: LIMESTONE, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.05, 0.09], life: [0.35, 0.55], dir: { x: -f.x, z: -f.z }, dirBias: 0.6, jitter: 0.3 });
        if (rnd(0, 1) < 0.5) spray('smoke', e.x, 0.15, e.z, 1, { color: LIMESTONE, speed: [0.2, 0.5], up: [0.05, 0.2], size: [0.34, 0.48], grow: 1.2, life: [0.5, 0.7], opacity: 0.26, gravity: -0.1, drag: 2.4 });
      } else if (e.mode === 'dazed' && rec.clock >= 0.18) {
        rec.clock = 0;
        const a = rnd(0, TAU);
        spray('spark', e.x + Math.cos(a) * 0.4, 2.6, e.z + Math.sin(a) * 0.4, 1, { color: BRONZE, speed: [0.2, 0.5], up: [0.2, 0.5], size: [0.05, 0.08], life: [0.4, 0.6], gravity: 1.0, drag: 1.2, opacity: 0.9 });
      } else if (e.enraged && rec.clock >= 0.25) {
        rec.clock = 0;
        spray('spark', e.x, 2.2, e.z, 1, { color: HORN.corruption, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.05, 0.08], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.6, opacity: 0.85 });
      }
    }
  }

  const KIT_BOSS_DEATH = { heron: SF.heronDeath, wyrm: SF.wyrmDeath, thornmother: SF.thornmotherDeath, millwheel: SF.millwheelDeath, lichram: SF.lichramDeath, cantor: SF.cantorDeath, colossus: SF.colossusDeath, gloamwolf: SF.gloamwolfDeath, mireking: SF.mirekingDeath, ashraven: SF.ashravenDeath, veinweaver: SF.veinweaverDeath, hush: hushDeath, skyhorn: skyhornDeath, hourwarden: hourwardenDeath, founder: founderDeath, cinderback: cinderbackDeath };

  // Per frame: the Heron's drive throws spray off its legs and stops in a
  // splash; the burrowed Wyrm leaves a trail of turned earth so the party can
  // read where it is tunnelling.
  const bossMode = new Map(); // boss id -> { mode, clock }
  const S2_FRAME = new Set(['thornmother', 'millwheel', 'lichram', 'gravewisp', 'cantor', 'colossus', 'keener', 'sexton', 'bloom', 'siphon', 'gloamwolf', 'mireking', 'ashraven', 'veinweaver', 'hush', 'skyhorn', 'hourwarden', 'founder', 'cinderback']);
  function bossFrame(dt) {
    for (const e of world.entities()) {
      if (S2_FRAME.has(e.kind)) {
        SF.slice2Frame(e, dt);
        continue;
      }
      if (e.kind !== 'heron' && e.kind !== 'wyrm') continue;
      let rec = bossMode.get(e.id);
      if (!rec) {
        rec = { mode: e.mode, clock: 0 };
        bossMode.set(e.id, rec);
      }
      const was = rec.mode;
      rec.mode = e.mode;
      rec.clock += dt;
      if (e.kind === 'heron') {
        if (e.mode === 'dash' && rec.clock >= HERON.spear.every) {
          rec.clock = 0;
          const d = unit2(e.dashVx ?? 0, e.dashVz ?? 0);
          for (const s of [-1, 1]) spray('shard', e.x - d.z * 0.3 * s, 0.15, e.z + d.x * 0.3 * s, 1, { color: WATER, tile: SHARD_TILE.drop, speed: [0.8, 1.6], up: [1.2, 2.0], size: [0.09, 0.13], life: [0.35, 0.55], gravity: 7, drag: 0.4, dir: { x: -d.z * s, z: d.x * s }, dirBias: 0.7 });
        } else if (was === 'dash' && e.mode !== 'dash') {
          mark('heron_spear_stop');
          kit.ring({ x: e.x, z: e.z, r0: 0.3, r1: 1.4, width: 0.16, life: 0.45, core: WATER, glow: WATER, soft: 0.8, y: 0.04, opacity: 0.6 });
          spray('shard', e.x, 0.3, e.z, 10, { color: WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.0], up: [1.6, 2.8], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2] });
        }
      } else if (e.mode === 'burrowed' && rec.clock >= WYRM.tunnel.every) {
        rec.clock = 0;
        spray('chunk', e.x, 0.15, e.z, 2, { color: EARTH, speed: [0.3, 0.8], up: [1.0, 1.8], size: [0.05, 0.1], life: [0.35, 0.6], jitter: 0.3 });
        spray('smoke', e.x, 0.12, e.z, 1, { color: CINDER, speed: [0.1, 0.3], up: [0.1, 0.3], size: [0.34, 0.48], grow: 1.3, life: [0.7, 1.0], opacity: 0.32, gravity: -0.1, drag: 2.4, jitter: 0.2 });
        if (rnd(0, 1) < 0.35) spray('spark', e.x, 0.1, e.z, 1, { color: WYRM.corruption, speed: [0.05, 0.2], up: [0.5, 0.9], size: [0.05, 0.09], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.3 });
      }
    }
    if (bossMode.size > 8) bossMode.clear();
    if (s2Clock.size > 64) s2Clock.clear();
  }

  return { HUSHS, HORN, HVEIL, HPALE, LIMESTONE, IBEX, hushDeath, skyhornEnrage, skyhornDeath, HOUR, DIALC, pendulumPass, weightLand, hourwardenEnrage, hourwardenDeath, hourwardenWindup, hourwardenFrame, FOUND, CBACK, FBRONZE, FBRICK, FGOLD, FHEAT, FCOAL, FSLAG, FSPARK, FASH, FOUNDER_CHEST_Y, FOUNDER_HEAD_Y, founderDeath, founderWindup, founderFrame, emberLand, cinderbackEnrage, cinderbackDeath, cinderbackWindup, cinderbackFrame, spireWindup, spireFrame, KIT_BOSS_DEATH, bossMode, S2_FRAME, bossFrame };
}
