// THE THIRD BOSS LOOKS (docs/THIRD_BOSSES.md): the Gloam Wolf, the Mire King,
// the Ash Raven, the Vein Weaver and the other third bosses, their wind-ups,
// enrages, frames and deaths.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxBossStyle, vfxMatterColor } from '../../../data/vfx.js';
import { EMBER, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';

export function createSigThirdBosses(ctx) {
  const { SF, DIRT, SILT, WATER, after, bus, camfx, faceOf, kit, mark, rnd, spray, unit2 } = ctx;

  // -------------------------------------------------------- third bosses --
  // (docs/THIRD_BOSSES.md) The same law as every boss: Ember on the frame
  // that hurts, the body's matter on what breaks, violet for the boss. The
  // Gloam Wolf is grey fur, torn earth and a pale moon light; the Mire King
  // is millpond water, black silt and green-black slime.
  const WOLF = vfxBossStyle('gloamwolf');
  const MIRE = vfxBossStyle('mireking');
  const FURC = vfxMatterColor('owlfeather');
  const MOON = '#DCE4F2';
  const SLIME = vfxMatterColor('slime');
  const RUSTC = vfxMatterColor('carapace');
  // The Pounce lands: an Ember ring (the hit), a moonlit shockwave, four
  // claw gouges torn out of the ring, earth and fur thrown up. In the Hunt
  // the landing leaves a violet afterimage streak.
  bus.on('boss_pounce', (ev) => {
    mark('gloamwolf_pounce');
    const r = ev.radius ?? 1.5;
    const P = WOLF.pounce;
    SF.flare(ev.x, 0.45, ev.z, EMBER, 1.7, { kind: 'burst', life: 0.24, core: PARCH });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: PARCH, size: 1.1, life: 0.12 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.26, width: 0.13, jag: 0.5 });
    SF.shock(ev.x, ev.z, r * 1.45, MOON, { life: 0.5, width: 0.2, core: WOLF.peak, delay: 0.03 });
    SF.shock(ev.x, ev.z, r * 1.9, WOLF.corruption, { life: 0.7, width: 0.1, core: WOLF.peak, delay: 0.08 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      kit.mark({ x: ev.x + Math.cos(a) * r * 0.45, z: ev.z + Math.sin(a) * r * 0.45, radius: r * 0.42, kind: 'gouge', angle: a, stretch: 2.4, stain: INK, glow: WOLF.corruption, glowOpacity: 0.4, cool: 0.8, life: 3.2, opacity: 0.45 });
    }
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.1, kind: 'crater', stain: DIRT, glow: null, life: 3.6, opacity: 0.4 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.75, glow: WOLF.corruption, life: 1.8, cool: 0.7 });
    spray('chunk', ev.x, 0.2, ev.z, P.chunk, { color: DIRT, speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.06, 0.13], life: [0.5, 0.85], jitter: r * 0.4 });
    spray('smoke', ev.x, 0.2, ev.z, P.dust, { color: FURC, speed: [0.8, 1.8], up: [0.1, 0.4], size: [0.4, 0.6], grow: 1.5, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4, jitter: r * 0.5 });
    spray('shard', ev.x, 0.6, ev.z, P.fur, { color: FURC, tile: SHARD_TILE.feather, speed: [0.6, 1.6], up: [1.0, 2.2], size: [0.08, 0.13], life: [0.7, 1.1], gravity: 1.2, drag: 1.6, spin: [-6, 6], jitter: 0.4 });
    spray('spark', ev.x, 0.3, ev.z, 10, { color: WOLF.corruption, speed: [0.4, 1.4], up: [0.8, 1.8], size: [0.05, 0.09], life: [0.6, 1.0], gravity: -0.3, drag: 1.4, jitter: r * 0.4 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.6, color: MOON, opacity: 0.45, life: 0.45, attack: 0.02 });
    if (ev.hunt > 0) kit.pillar({ x: ev.x, z: ev.z, radius: 0.5, height: 2.6, color: WOLF.corruption, life: 0.5, opacity: 0.45 });
    camfx.dolly(ev.x, ev.z, WOLF.camera.dolly, 0.3);
  });
  // The Rend: three claw arcs rake across the cone, Ember on the cut (the
  // hit), violet in the wake, three parallel gouges left in the floor.
  bus.on('boss_rend', (ev) => {
    mark('gloamwolf_rend');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const ang = Math.atan2(d.z, d.x);
    const reach = 2.6;
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.32;
      const a0 = ang - 0.95;
      const a1 = ang + 0.95;
      const rr = reach - Math.abs(off) * 0.6;
      const pts = [];
      for (let k = 0; k <= 4; k++) {
        const a = a0 + ((a1 - a0) * k) / 4;
        pts.push({ x: ev.x + Math.cos(a) * rr, y: 0.7 + off * 0.5, z: ev.z + Math.sin(a) * rr });
      }
      for (let k = 0; k < 4; k++) {
        kit.streak({ a: pts[k], b: pts[k + 1], width: 0.16, tailW: 0.04, core: i === 1 ? PARCH : WOLF.peak, glow: k % 2 ? WOLF.corruption : EMBER, life: 0.22, fall: 1.4, opacity: 1, delay: 0.02 * k + 0.03 * i });
      }
    }
    SF.flare(ev.x + d.x * 1.4, 0.8, ev.z + d.z * 1.4, EMBER, 1.5, { life: 0.18, core: PARCH, angle: ang + Math.PI / 2 });
    for (let i = -1; i <= 1; i++) {
      const px = ev.x + d.x * 1.7 - d.z * i * 0.4;
      const pz = ev.z + d.z * 1.7 + d.x * i * 0.4;
      kit.mark({ x: px, z: pz, radius: 0.7, kind: 'gouge', angle: ang + Math.PI / 2, stretch: 2.6, stain: INK, glow: EMBER, glowOpacity: 0.35, cool: 0.6, life: 2.4, opacity: 0.4 });
    }
    spray('spark', ev.x + d.x * 1.6, 0.6, ev.z + d.z * 1.6, 12, { color: EMBER, speed: [1.2, 2.6], up: [0.4, 1.2], size: [0.04, 0.08], life: [0.25, 0.45], dir: d, dirBias: 0.6, jitter: 0.6 });
    spray('chunk', ev.x + d.x * 1.6, 0.15, ev.z + d.z * 1.6, 5, { color: DIRT, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.05, 0.1], life: [0.4, 0.7], dir: d, dirBias: 0.5, jitter: 0.5 });
    camfx.kick(d.x, d.z, WOLF.camera.kick * 0.5, 0.1);
  });
  // The Moon Howl: the throat blazes, sound rings roll out moon-pale and
  // violet past the Ember edge (the hit), a column of light climbs from the
  // head, leaves and dust lift off the floor.
  bus.on('boss_howl', (ev) => {
    mark('gloamwolf_howl');
    const r = ev.radius ?? 3.2;
    const H = WOLF.howl;
    const b = SF.byId(ev.id);
    const f = faceOf(b);
    const hx = ev.x + f.x * 1.3;
    const hz = ev.z + f.z * 1.3;
    SF.flare(hx, 2.4, hz, WOLF.corruption, 2.6, { kind: 'burst', life: 0.36, core: WOLF.peak, spin: 0.6 });
    kit.pillar({ x: hx, z: hz, radius: 0.45, height: 4.4, color: MOON, life: 0.8, opacity: 0.5 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.14 });
    for (let i = 0; i < H.rings; i++) SF.shock(ev.x, ev.z, r * (1.15 + i * 0.35), i % 2 ? WOLF.corruption : MOON, { life: 0.55 + i * 0.12, width: 0.12, core: WOLF.peak, delay: 0.04 + i * 0.1, y: 0.1 + i * 0.35 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.05, kind: 'sigil', stain: INK, glow: WOLF.corruption, glowOpacity: 0.45, cool: 1.2, life: 3, opacity: 0.22 });
    spray('shard', ev.x, 0.2, ev.z, H.leaves, { color: vfxMatterColor('bramble'), tile: SHARD_TILE.petal, speed: [1.2, 2.6], up: [0.8, 1.8], size: [0.08, 0.13], life: [0.8, 1.3], gravity: 1.0, drag: 1.4, spin: [-8, 8], jitter: r * 0.5 });
    spray('spark', hx, 2.0, hz, 18, { color: WOLF.corruption, speed: [0.4, 1.6], up: [0.6, 1.8], size: [0.05, 0.1], life: [0.8, 1.3], gravity: -0.3, drag: 1.3, jitter: 0.4 });
    spray('smoke', ev.x, 0.2, ev.z, 6, { color: FURC, speed: [1.2, 2.2], up: [0.1, 0.3], size: [0.4, 0.6], grow: 1.6, life: [0.7, 1.0], opacity: 0.26, gravity: -0.1, drag: 2.2, jitter: r * 0.4 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: MOON, opacity: 0.55, life: 0.7, attack: 0.03 });
    camfx.dolly(ev.x, ev.z, WOLF.camera.dolly * 0.8, 0.4);
  });
  function wolfEnrage(ev) {
    mark('gloamwolf_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.6, height: 3.0, color: WOLF.corruption, life: 0.7, opacity: 0.5 });
    SF.flare(x, 1.8, z, WOLF.corruption, 2.2, { kind: 'burst', life: 0.3, core: WOLF.peak });
    kit.ring({ x, z, r0: 0.5, r1: 3.2, width: 0.2, life: 0.7, core: WOLF.peak, glow: MOON, soft: 0.5, y: 0.06 });
    spray('spark', x, 1.4, z, 22, { color: WOLF.corruption, speed: [0.3, 1.0], up: [0.8, 2.0], size: [0.05, 0.1], life: [0.9, 1.4], gravity: -0.3, drag: 1.4, jitter: 0.8 });
    kit.light({ x, z, radius: 3, color: WOLF.corruption, opacity: 0.5, life: 0.8 });
  }
  function gloamwolfDeath(x, z) {
    // It lies down and the hollow leaves it: a moonlit column, the violet
    // rising out of it as motes, fur and bramble falling away.
    mark('gloamwolf_death');
    kit.pillar({ x, z, radius: 1.0, height: 4.6, color: MOON, life: 1.6, opacity: 0.6 });
    SF.flare(x, 1.6, z, WOLF.corruption, 3.6, { kind: 'burst', life: 0.5, core: WOLF.peak, spin: 0.7 });
    kit.flash({ x, y: 1.2, z, color: PARCH, size: 2.0, life: 0.22 });
    for (let i = 0; i < 2; i++) kit.ring({ x, z, r0: 0.5, r1: 4 + i * 1.4, width: 0.3, life: 1.0 + i * 0.3, core: WOLF.peak, glow: i ? WOLF.corruption : MOON, soft: 0.5, y: 0.06 + i * 0.3, delay: i * 0.12 });
    kit.mark({ x, z, radius: 3.0, kind: 'crater', stain: DIRT, glow: WOLF.corruption, glowOpacity: 0.45, cool: 2.0, life: 6, opacity: 0.45 });
    spray('spark', x, 0.8, z, 40, { color: WOLF.corruption, speed: [0.2, 1.0], up: [1.2, 2.8], size: [0.06, 0.13], life: [1.6, 2.6], gravity: -0.35, drag: 1.2, jitter: 1.0 });
    spray('shard', x, 1.2, z, 22, { color: FURC, tile: SHARD_TILE.feather, speed: [0.6, 1.8], up: [1.0, 2.4], size: [0.09, 0.14], life: [1.0, 1.6], gravity: 0.9, drag: 1.6, spin: [-6, 6], jitter: 0.8 });
    spray('shard', x, 1.4, z, 14, { color: vfxMatterColor('bramble'), tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.2, 2.6], size: [0.1, 0.15], life: [0.7, 1.1], gravity: 4, spin: [-10, 10], jitter: 0.6 });
    spray('smoke', x, 0.4, z, 8, { color: FURC, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.7], grow: 1.6, life: [1.2, 1.8], opacity: 0.32, gravity: -0.2, drag: 2.0, jitter: 1.0 });
    kit.light({ x, z, radius: 4.4, color: MOON, opacity: 0.6, life: 1.6 });
    camfx.dolly(x, z, WOLF.camera.dolly * 1.2, 0.55);
  }

  // The Tongue Lash: a wet violet tongue shoots down the lane and snaps
  // back, the Ember lane flashing the full width (the hit), slime thrown
  // off its length, a splash where it strikes.
  bus.on('boss_tongue_lash', (ev) => {
    mark('mireking_lash');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const SPEED = MIRE.lash.speed;
    const out = len / SPEED;
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: 1.0, tailW: 0.8, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.5 });
    kit.streak({ a: { x: ev.x + d.x * 0.9, y: 0.95, z: ev.z + d.z * 0.9 }, b: { x: ex, y: 0.5, z: ez }, width: 0.28, tailW: 0.2, core: MIRE.peak, glow: MIRE.corruption, life: out + 0.18, fall: 3.0, opacity: 0.95 });
    kit.streak({ a: { x: ev.x + d.x * 0.9, y: 0.95, z: ev.z + d.z * 0.9 }, b: { x: ev.x + d.x * 1.5, y: 0.9, z: ev.z + d.z * 1.5 }, width: 0.34, tailW: 0.3, core: PARCH, glow: MIRE.corruption, life: out, travel: { x: d.x * SPEED, y: -1, z: d.z * SPEED }, fall: 0.3 });
    after(out, () => {
      SF.flare(ex, 0.5, ez, MIRE.corruption, 1.3, { kind: 'burst', life: 0.22, core: MIRE.peak });
      kit.ring({ x: ex, z: ez, r0: 0.2, r1: 1.2, width: 0.14, life: 0.4, core: WATER, glow: WATER, soft: 0.8, y: 0.04, opacity: 0.6 });
      spray('shard', ex, 0.4, ez, 10, { color: SLIME, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.2, 2.4], size: [0.09, 0.14], life: [0.45, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2] });
      kit.mark({ x: ex, z: ez, radius: 0.9, kind: 'splash', stain: SLIME, glow: null, life: 3, opacity: 0.45 });
    });
    const n = Math.max(2, Math.round(len / 1.6));
    for (let i = 1; i <= n; i++) {
      const k = i / (n + 1);
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      after(out * k, () => spray('shard', px, 0.7, pz, 2, { color: SLIME, tile: SHARD_TILE.drop, speed: [0.6, 1.4], up: [0.6, 1.4], size: [0.07, 0.11], life: [0.35, 0.55], gravity: 7, drag: 0.4, jitter: 0.2 }));
    }
    camfx.kick(d.x, d.z, MIRE.camera.kick * 0.5, 0.12);
  });
  // The Belly Flop: the body comes down on the ring — an Ember ring (the
  // hit), a crown of water and silt, foam rings rolling out, the mire it
  // leaves (the sim's slick) under a splash stain.
  bus.on('boss_belly_flop', (ev) => {
    mark('mireking_flop');
    const r = ev.radius ?? 2.0;
    const F = MIRE.flop;
    SF.flare(ev.x, 0.5, ev.z, EMBER, 2.0, { kind: 'burst', life: 0.26, core: PARCH });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: PARCH, size: 1.4, life: 0.12 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.28, width: 0.15 });
    for (let i = 0; i < F.ripples; i++) kit.ring({ x: ev.x, z: ev.z, r0: r * 0.4, r1: r * (1.4 + i * 0.4), width: 0.18 - i * 0.03, life: 0.55 + i * 0.15, core: PARCH, glow: WATER, soft: 0.8, y: 0.04, opacity: 0.7, delay: 0.04 + i * 0.1 });
    SF.shock(ev.x, ev.z, r * 1.7, MIRE.corruption, { life: 0.7, width: 0.1, core: MIRE.peak, delay: 0.08 });
    spray('shard', ev.x, 0.4, ev.z, F.drops, { color: WATER, tile: SHARD_TILE.drop, speed: [1.6, 3.4], up: [2.2, 4.0], size: [0.1, 0.17], life: [0.6, 1.0], gravity: 8, drag: 0.3, spin: [-2, 2], jitter: r * 0.5 });
    spray('chunk', ev.x, 0.3, ev.z, F.silt, { color: SILT, speed: [1.2, 2.6], up: [1.6, 3.0], size: [0.06, 0.12], life: [0.5, 0.85], jitter: r * 0.5 });
    spray('smoke', ev.x, 0.2, ev.z, 6, { color: SILT, speed: [1.0, 2.0], up: [0.1, 0.3], size: [0.45, 0.65], grow: 1.5, life: [0.7, 1.0], opacity: 0.3, gravity: -0.1, drag: 2.4, jitter: r * 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.25, kind: 'splash', stain: SLIME, glow: MIRE.corruption, glowOpacity: 0.3, cool: 1.2, life: 4.5, opacity: 0.5 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: MIRE.corruption, opacity: 0.45, life: 0.5, attack: 0.02 });
    camfx.dolly(ev.x, ev.z, MIRE.camera.dolly, 0.38);
  });
  // The Swallow: the jaws snap shut — an Ember ring (the hit), a violet
  // gulp out of the throat, slime sprayed from the lips.
  bus.on('boss_swallow', (ev) => {
    mark('mireking_swallow');
    const r = ev.radius ?? 1.9;
    const b = SF.byId(ev.id);
    const f = faceOf(b);
    const mx = ev.x + f.x * 1.1;
    const mz = ev.z + f.z * 1.1;
    SF.flare(mx, 1.0, mz, MIRE.corruption, 2.4, { kind: 'burst', life: 0.3, core: MIRE.peak, spin: 0.5 });
    kit.flash({ x: mx, y: 1.0, z: mz, color: PARCH, size: 1.2, life: 0.12 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.15 });
    SF.shock(ev.x, ev.z, r * 1.35, MIRE.corruption, { life: 0.5, width: 0.22, core: MIRE.peak, delay: 0.03 });
    spray('shard', mx, 0.9, mz, 14, { color: SLIME, tile: SHARD_TILE.drop, speed: [1.2, 2.6], up: [1.0, 2.2], size: [0.09, 0.14], life: [0.45, 0.75], gravity: 7, drag: 0.4, jitter: 0.5 });
    spray('spark', mx, 1.0, mz, 16, { color: MIRE.corruption, speed: [0.4, 1.4], up: [0.6, 1.6], size: [0.05, 0.1], life: [0.6, 1.0], gravity: -0.3, drag: 1.4, jitter: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.1, kind: 'splash', stain: SLIME, glow: MIRE.corruption, glowOpacity: 0.35, cool: 1.0, life: 3.2, opacity: 0.4 });
    kit.light({ x: mx, z: mz, radius: 2.6, color: MIRE.corruption, opacity: 0.55, life: 0.5, attack: 0.02 });
    camfx.dolly(ev.x, ev.z, MIRE.camera.dolly * 0.8, 0.3);
  });
  function mirekingEnrage(ev) {
    mark('mireking_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.7, height: 2.8, color: MIRE.corruption, life: 0.7, opacity: 0.5 });
    SF.flare(x, 1.2, z, MIRE.corruption, 2.4, { kind: 'burst', life: 0.32, core: MIRE.peak });
    kit.ring({ x, z, r0: 0.6, r1: 3.4, width: 0.2, life: 0.75, core: PARCH, glow: WATER, soft: 0.8, y: 0.04, opacity: 0.7 });
    spray('shard', x, 0.8, z, 18, { color: SLIME, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.4, 2.6], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.4, jitter: 0.8 });
    kit.light({ x, z, radius: 3, color: MIRE.corruption, opacity: 0.5, life: 0.8 });
  }
  function mirekingDeath(x, z) {
    // It sinks into its own pond: a great splash, the crown's bars fall, the
    // violet bubbles up out of the silt and is gone.
    mark('mireking_death');
    kit.pillar({ x, z, radius: 1.2, height: 3.6, color: MIRE.corruption, life: 1.4, opacity: 0.6 });
    SF.flare(x, 1.0, z, MIRE.corruption, 3.4, { kind: 'burst', life: 0.5, core: MIRE.peak, spin: 0.7 });
    for (let i = 0; i < 4; i++) kit.ring({ x, z, r0: 0.6, r1: 3 + i * 1.2, width: 0.26 - i * 0.04, life: 0.8 + i * 0.25, core: PARCH, glow: WATER, soft: 0.8, y: 0.04, opacity: 0.75, delay: i * 0.14 });
    spray('shard', x, 0.6, z, 40, { color: WATER, tile: SHARD_TILE.drop, speed: [1.6, 3.6], up: [2.4, 4.4], size: [0.1, 0.18], life: [0.7, 1.1], gravity: 8, drag: 0.3, jitter: 1.0 });
    spray('chunk', x, 1.2, z, 10, { color: RUSTC, speed: [0.8, 2.0], up: [1.6, 2.8], size: [0.07, 0.13], life: [0.7, 1.1], jitter: 0.5 });
    spray('spark', x, 0.3, z, 36, { color: MIRE.corruption, speed: [0.2, 0.9], up: [1.0, 2.4], size: [0.06, 0.12], life: [1.5, 2.4], gravity: -0.35, drag: 1.2, jitter: 1.2 });
    spray('smoke', x, 0.3, z, 10, { color: SILT, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.75], grow: 1.6, life: [1.2, 1.8], opacity: 0.34, gravity: -0.2, drag: 2.0, jitter: 1.2 });
    kit.mark({ x, z, radius: 3.4, kind: 'splash', stain: SLIME, glow: MIRE.corruption, glowOpacity: 0.45, cool: 2.0, life: 7, opacity: 0.55 });
    kit.light({ x, z, radius: 4.4, color: MIRE.corruption, opacity: 0.6, life: 1.5 });
    camfx.dolly(x, z, MIRE.camera.dolly * 1.2, 0.55);
  }
  // Wind-ups: the wolf scrapes the earth before a Pounce and fills its chest
  // for the Howl; the toad's sac swells for the Swallow and the pond stirs
  // under it before a Belly Flop.
  function thirdBossWindup(b, ev) {
    if (b.kind === 'gloamwolf') {
      if (ev.attack === 'pounce') {
        mark('gloamwolf_crouch');
        const f = faceOf(b);
        spray('chunk', b.x - f.x * 0.8, 0.1, b.z - f.z * 0.8, 5, { color: DIRT, speed: [0.6, 1.4], up: [0.8, 1.4], size: [0.05, 0.1], life: [0.4, 0.6], dir: { x: -f.x, z: -f.z }, dirBias: 0.7 });
        for (const s of [-1, 1]) SF.flare(b.x + f.x * 1.4 - f.z * 0.18 * s, 1.75, b.z + f.z * 1.4 + f.x * 0.18 * s, WOLF.corruption, 0.6, { life: 0.4, core: WOLF.peak });
      } else if (ev.attack === 'howl') {
        mark('gloamwolf_howl_windup');
        SF.anticipate(b.x, b.z, 2.4, WOLF.corruption, { y: 1.8, lines: 10, core: WOLF.peak });
      }
    } else if (b.kind === 'mireking') {
      if (ev.attack === 'swallow') {
        mark('mireking_gape');
        SF.anticipate(b.x, b.z, 2.0, MIRE.corruption, { y: 0.9, lines: 10, core: MIRE.peak });
      } else if (ev.attack === 'flop') {
        mark('mireking_heave');
        kit.ring({ x: b.x, z: b.z, r0: 0.6, r1: 1.8, width: 0.12, life: 0.6, core: PARCH, glow: WATER, soft: 0.8, y: 0.04, opacity: 0.5 });
      }
    }
  }
  // Per frame: the wolf's bound throws a streak of dust and moonlight under
  // it; while the toad gapes, mist and slime are drawn into its mouth.
  function thirdBossFrame(e, rec) {
    if (e.kind === 'gloamwolf') {
      if (e.mode === 'leap' && rec.clock >= 0.04) {
        rec.clock = 0;
        spray('smoke', e.x, 0.15, e.z, 1, { color: FURC, speed: [0.1, 0.3], up: [0.1, 0.3], size: [0.34, 0.48], grow: 1.3, life: [0.5, 0.8], opacity: 0.28, gravity: -0.1, drag: 2.4, jitter: 0.3 });
        spray('spark', e.x, 1.4, e.z, 1, { color: rnd(0, 1) < 0.5 ? MOON : WOLF.corruption, speed: [0.05, 0.2], up: [0.2, 0.5], size: [0.05, 0.09], life: [0.4, 0.7], gravity: -0.2, drag: 1.6, jitter: 0.4 });
      } else if (e.enraged && rec.clock >= 0.22) {
        rec.clock = 0;
        spray('spark', e.x, 1.8, e.z, 1, { color: WOLF.corruption, speed: [0.05, 0.2], up: [0.5, 0.9], size: [0.05, 0.09], life: [0.7, 1.0], gravity: -0.3, drag: 1.4, jitter: 0.6, opacity: 0.85 });
      }
    } else if (e.kind === 'mireking') {
      if (e.mode === 'gape' && rec.clock >= 0.05) {
        rec.clock = 0;
        const f = unit2(e.faceX ?? 0, e.faceZ ?? 1);
        const mx = e.x + f.x * 1.1;
        const mz = e.z + f.z * 1.1;
        const a = Math.atan2(f.z, f.x) + rnd(-1.1, 1.1);
        const dist = rnd(2.5, 5.5);
        const sx = e.x + Math.cos(a) * dist;
        const sz = e.z + Math.sin(a) * dist;
        const tt = 0.45;
        kit.streak({ a: { x: sx, y: 0.5, z: sz }, b: { x: sx + (mx - sx) * 0.12, y: 0.55, z: sz + (mz - sz) * 0.12 }, width: 0.06, tailW: 0, core: MIRE.peak, glow: MIRE.corruption, life: tt, travel: { x: (mx - sx) / tt, y: 0.8, z: (mz - sz) / tt }, fall: 1.0, opacity: 0.8 });
        if (rnd(0, 1) < 0.5) spray('smoke', sx, 0.3, sz, 1, { color: SILT, speed: [0.05, 0.1], up: [0.05, 0.15], size: [0.3, 0.42], grow: 0.6, life: [0.4, 0.6], opacity: 0.22, gravity: 0, drag: 2.4 });
      } else if (e.mode === 'wade' && rec.clock >= 0.6) {
        rec.clock = 0;
        kit.ring({ x: e.x, z: e.z, r0: 0.9, r1: 1.7, width: 0.06, life: 0.9, core: PARCH, glow: WATER, soft: 0.8, y: 0.03, opacity: 0.3 });
      }
    }
  }

  // ------------------------------------------- third bosses, slice 11 --
  // The Ash Raven is black feather, pyre ash and cinders under a cold bone
  // light; the Vein Weaver is the Heart's lit violet vein, its crystal and
  // its flesh. Ember stays on the frame that hurts.
  const RAVEN = vfxBossStyle('ashraven');
  const WEAVE = vfxBossStyle('veinweaver');
  const FEATHERC = vfxMatterColor('feather');
  const ASHC = vfxMatterColor('cinder');
  const BONEC = vfxMatterColor('boneplate');
  const VEINC = vfxMatterColor('heartvein');
  const VEINP = vfxMatterColor('heartpeak');
  const GEMC = vfxMatterColor('heartcrystal');
  const FLESHC = vfxMatterColor('heartflesh');
  // The Carrion Dive: the Ember lane flashes its whole length (the hit), a
  // furrow of embers tears down the middle behind the body, black feathers
  // and cinders peel off its wake, and the landing throws up ash.
  bus.on('boss_carrion_dive', (ev) => {
    mark('ashraven_dive');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const ang = Math.atan2(d.z, d.x);
    const D = RAVEN.dive;
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: 1.2, tailW: 0.9, core: EMBER, glow: EMBER, life: 0.26, fall: 2.2, opacity: 0.55 });
    kit.streak({ a: { x: ev.x, y: 0.9, z: ev.z }, b: { x: ex, y: 0.7, z: ez }, width: 0.5, tailW: 0.1, core: PARCH, glow: RAVEN.corruption, life: 0.3, fall: 1.6, opacity: 0.9 });
    kit.mark({ x: (ev.x + ex) / 2, z: (ev.z + ez) / 2, radius: len * 0.5, kind: 'gouge', angle: ang, stretch: Math.max(1.5, len / 0.9), stain: INK, glow: EMBER, glowOpacity: 0.4, cool: 0.9, life: 3.2, opacity: 0.4 });
    const n = Math.max(3, Math.round(len / 1.2));
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      after(0.02 * i, () => {
        spray('shard', px, 0.6, pz, Math.ceil(D.feathers / n), { color: FEATHERC, tile: SHARD_TILE.feather, speed: [0.4, 1.4], up: [0.6, 1.6], size: [0.1, 0.16], life: [0.8, 1.3], gravity: 0.9, drag: 1.6, spin: [-6, 6], jitter: 0.3 });
        spray('spark', px, 0.25, pz, Math.ceil(D.cinders / n), { color: i % 2 ? EMBER : RAVEN.corruption, speed: [0.3, 1.2], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.5, 0.9], gravity: -0.2, drag: 1.4, jitter: 0.4 });
      });
    }
    after(0.05, () => {
      SF.flare(ex, 0.5, ez, EMBER, 1.6, { kind: 'burst', life: 0.22, core: PARCH });
      SF.shock(ex, ez, 1.4, ASHC, { life: 0.45, width: 0.16, core: RAVEN.peak });
      spray('smoke', ex, 0.2, ez, 7, { color: ASHC, speed: [0.9, 2.0], up: [0.1, 0.4], size: [0.45, 0.65], grow: 1.6, life: [0.7, 1.0], opacity: 0.34, gravity: -0.1, drag: 2.2, jitter: 0.5 });
      kit.mark({ x: ex, z: ez, radius: 1.3, kind: 'scorch', stain: INK, glow: EMBER, glowOpacity: 0.35, cool: 1.0, life: 3.6, opacity: 0.45 });
    });
    kit.light({ x: ex, z: ez, radius: 2.6, color: EMBER, opacity: 0.4, life: 0.4, attack: 0.02 });
    camfx.kick(d.x, d.z, RAVEN.camera.kick, 0.14);
  });
  // The Wing Gust: two great wingbeats down the cone — an Ember arc on the
  // cut (the hit), a wall of ash and feathers driven outward, the floor's
  // dust swept into streaks.
  bus.on('boss_wing_gust', (ev) => {
    mark('ashraven_gust');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const ang = Math.atan2(d.z, d.x);
    const G = RAVEN.gust;
    const reach = 3.2;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const a = ang - 1.05 + (2.1 * k) / 6;
      pts.push({ x: ev.x + Math.cos(a) * reach, y: 0.35, z: ev.z + Math.sin(a) * reach });
    }
    for (let k = 0; k < 6; k++) kit.streak({ a: pts[k], b: pts[k + 1], width: 0.2, tailW: 0.08, core: PARCH, glow: EMBER, life: 0.24, fall: 1.4, opacity: 0.95, delay: 0.015 * k });
    for (let i = 0; i < 7; i++) {
      const a = ang - 0.9 + (1.8 * i) / 6;
      const ox = Math.cos(a);
      const oz = Math.sin(a);
      kit.streak({ a: { x: ev.x + ox * 0.9, y: 0.5 + 0.2 * (i % 2), z: ev.z + oz * 0.9 }, b: { x: ev.x + ox * 1.4, y: 0.5, z: ev.z + oz * 1.4 }, width: 0.14, tailW: 0, core: RAVEN.peak, glow: ASHC, life: 0.35, travel: { x: ox * 8, y: 0.4, z: oz * 8 }, fall: 0.6, opacity: 0.8 });
    }
    spray('shard', ev.x + d.x * 0.9, 1.0, ev.z + d.z * 0.9, G.feathers, { color: FEATHERC, tile: SHARD_TILE.feather, speed: [2.0, 4.0], up: [0.4, 1.2], size: [0.1, 0.16], life: [0.7, 1.1], gravity: 0.8, drag: 1.4, spin: [-8, 8], dir: d, dirBias: 0.75, jitter: 0.5 });
    spray('smoke', ev.x + d.x * 1.2, 0.3, ev.z + d.z * 1.2, G.ash, { color: ASHC, speed: [2.0, 3.4], up: [0.1, 0.4], size: [0.5, 0.75], grow: 1.8, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4, dir: d, dirBias: 0.8, jitter: 0.6 });
    for (let i = -1; i <= 1; i++) kit.mark({ x: ev.x + d.x * 2.0 - d.z * i * 0.8, z: ev.z + d.z * 2.0 + d.x * i * 0.8, radius: 0.8, kind: 'gouge', angle: ang, stretch: 3.0, stain: ASHC, glow: null, life: 2.6, opacity: 0.3 });
    camfx.kick(d.x, d.z, RAVEN.camera.kick * 0.7, 0.12);
  });
  // The Omen: the crows come down on the mark — an Ember ring (the hit),
  // black streaks falling out of the sky into it, a burst of feathers and a
  // bone-pale flash; the ash it leaves when enraged is the sim's slick.
  bus.on('boss_omen', (ev) => {
    mark('ashraven_omen');
    const r = ev.radius ?? 1.4;
    const O = RAVEN.omen;
    for (let i = 0; i < O.crows; i++) {
      const a = (i / O.crows) * TAU + 0.3;
      const sx = ev.x + Math.cos(a) * r * 2.2;
      const sz = ev.z + Math.sin(a) * r * 2.2;
      const tx = ev.x + Math.cos(a + 2.4) * r * 0.3;
      const tz = ev.z + Math.sin(a + 2.4) * r * 0.3;
      kit.streak({ a: { x: sx, y: 4.2, z: sz }, b: { x: tx, y: 0.2, z: tz }, width: 0.16, tailW: 0.02, core: FEATHERC, glow: RAVEN.corruption, life: 0.22, fall: 2.4, opacity: 0.95, delay: 0.015 * i });
    }
    after(0.08, () => {
      SF.flare(ev.x, 0.5, ev.z, EMBER, 1.8, { kind: 'burst', life: 0.24, core: PARCH });
      kit.flash({ x: ev.x, y: 0.7, z: ev.z, color: BONEC, size: 1.3, life: 0.14 });
      SF.shock(ev.x, ev.z, r, EMBER, { life: 0.28, width: 0.14, jag: 0.4 });
      SF.shock(ev.x, ev.z, r * 1.6, RAVEN.corruption, { life: 0.6, width: 0.12, core: RAVEN.peak, delay: 0.04 });
      spray('shard', ev.x, 0.8, ev.z, O.feathers, { color: FEATHERC, tile: SHARD_TILE.feather, speed: [0.8, 2.2], up: [1.2, 2.6], size: [0.1, 0.16], life: [0.8, 1.3], gravity: 0.9, drag: 1.5, spin: [-8, 8], jitter: r * 0.5 });
      spray('spark', ev.x, 0.4, ev.z, 12, { color: RAVEN.corruption, speed: [0.4, 1.4], up: [0.8, 1.8], size: [0.05, 0.09], life: [0.6, 1.0], gravity: -0.3, drag: 1.4, jitter: r * 0.4 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.1, kind: 'sigil', stain: INK, glow: RAVEN.corruption, glowOpacity: 0.4, cool: 1.0, life: 3.0, opacity: 0.3 });
      if (ev.ash != null) spray('smoke', ev.x, 0.2, ev.z, 6, { color: ASHC, speed: [0.5, 1.2], up: [0.1, 0.3], size: [0.45, 0.6], grow: 1.4, life: [0.8, 1.2], opacity: 0.32, gravity: -0.1, drag: 2.2, jitter: r * 0.5 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.6, color: BONEC, opacity: 0.45, life: 0.45, attack: 0.02 });
      camfx.dolly(ev.x, ev.z, RAVEN.camera.dolly, 0.3);
    });
  });
  function ravenEnrage(ev) {
    mark('ashraven_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.6, height: 3.4, color: RAVEN.corruption, life: 0.7, opacity: 0.5 });
    SF.flare(x, 2.0, z, RAVEN.corruption, 2.4, { kind: 'burst', life: 0.32, core: RAVEN.peak });
    kit.ring({ x, z, r0: 0.5, r1: 3.4, width: 0.2, life: 0.7, core: RAVEN.peak, glow: ASHC, soft: 0.5, y: 0.06 });
    spray('shard', x, 1.8, z, 24, { color: FEATHERC, tile: SHARD_TILE.feather, speed: [1.0, 2.4], up: [0.8, 2.0], size: [0.1, 0.16], life: [0.9, 1.4], gravity: 0.8, drag: 1.4, spin: [-8, 8], jitter: 0.6 });
    spray('spark', x, 1.6, z, 18, { color: EMBER, speed: [0.3, 1.0], up: [0.8, 2.0], size: [0.04, 0.08], life: [0.8, 1.2], gravity: -0.3, drag: 1.4, jitter: 0.8 });
    kit.light({ x, z, radius: 3, color: RAVEN.corruption, opacity: 0.5, life: 0.8 });
  }
  function ashravenDeath(x, z) {
    // It falls out of the air: the mask cracks off in a bone-pale flash, the
    // violet leaves through the eye holes, feathers fall like ash for a while.
    mark('ashraven_death');
    kit.pillar({ x, z, radius: 1.0, height: 4.8, color: BONEC, life: 1.5, opacity: 0.55 });
    SF.flare(x, 1.6, z, RAVEN.corruption, 3.6, { kind: 'burst', life: 0.5, core: RAVEN.peak, spin: 0.7 });
    kit.flash({ x, y: 1.4, z, color: PARCH, size: 2.0, life: 0.22 });
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.5, r1: 3.2 + i * 1.3, width: 0.28 - i * 0.05, life: 0.9 + i * 0.25, core: RAVEN.peak, glow: i ? RAVEN.corruption : ASHC, soft: 0.5, y: 0.06 + i * 0.25, delay: i * 0.12 });
    kit.mark({ x, z, radius: 3.0, kind: 'scorch', stain: INK, glow: RAVEN.corruption, glowOpacity: 0.4, cool: 2.0, life: 6, opacity: 0.5 });
    spray('shard', x, 2.2, z, 46, { color: FEATHERC, tile: SHARD_TILE.feather, speed: [0.6, 2.4], up: [0.8, 2.8], size: [0.1, 0.18], life: [1.6, 2.6], gravity: 0.5, drag: 1.8, spin: [-6, 6], jitter: 1.2 });
    spray('chunk', x, 1.6, z, 8, { color: BONEC, speed: [0.8, 2.0], up: [1.4, 2.6], size: [0.07, 0.13], life: [0.7, 1.1], jitter: 0.4 });
    spray('spark', x, 1.0, z, 40, { color: RAVEN.corruption, speed: [0.2, 1.0], up: [1.2, 2.8], size: [0.06, 0.12], life: [1.6, 2.6], gravity: -0.35, drag: 1.2, jitter: 1.0 });
    spray('smoke', x, 0.4, z, 10, { color: ASHC, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.75], grow: 1.6, life: [1.2, 1.8], opacity: 0.34, gravity: -0.2, drag: 2.0, jitter: 1.0 });
    kit.light({ x, z, radius: 4.4, color: BONEC, opacity: 0.6, life: 1.6 });
    camfx.dolly(x, z, RAVEN.camera.dolly * 1.2, 0.55);
  }

  // The Bind: a lit vein thread whips out down the lane — the Ember lane
  // flashes (the hit) — and a knot of violet tightens round each hero it
  // caught; the thread itself is drawn every frame while it holds.
  bus.on('boss_bind', (ev) => {
    mark('veinweaver_bind');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: 0.9, tailW: 0.7, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.5 });
    kit.streak({ a: { x: ev.x - d.x * 0.8, y: 1.3, z: ev.z - d.z * 0.8 }, b: { x: ex, y: 0.6, z: ez }, width: 0.1, tailW: 0.06, core: VEINP, glow: WEAVE.corruption, life: 0.35, fall: 2.4, opacity: 1 });
    const B = WEAVE.bind;
    for (let i = 1; i <= B.beads; i++) {
      const k = i / (B.beads + 1);
      after(0.02 * i, () => spray('spark', ev.x + d.x * len * k, 0.9 - 0.3 * k, ev.z + d.z * len * k, 1, { color: VEINC, speed: [0.05, 0.3], up: [0.1, 0.5], size: [0.05, 0.09], life: [0.4, 0.7], gravity: -0.2, drag: 1.6 }));
    }
    for (const id of ev.bound || []) {
      const p = SF.byId(id);
      if (!p) continue;
      kit.ring({ x: p.x, z: p.z, r0: 1.0, r1: 0.35, width: 0.1, life: 0.4, core: VEINP, glow: WEAVE.corruption, soft: 0.6, y: 0.5, opacity: 0.85 });
      SF.flare(p.x, 0.7, p.z, WEAVE.corruption, 1.0, { kind: 'star', life: 0.2, core: VEINP });
    }
    camfx.kick(d.x, d.z, WEAVE.camera.kick * 0.5, 0.1);
  });
  // A thread snaps: a spark of violet where it held.
  bus.on('boss_bind_break', (ev) => {
    const p = SF.byId(ev.target);
    if (!p) return;
    mark('veinweaver_bind_break');
    spray('spark', p.x, 0.7, p.z, 6, { color: VEINC, speed: [0.4, 1.0], up: [0.4, 1.0], size: [0.04, 0.08], life: [0.3, 0.5], gravity: 1, drag: 1.4, jitter: 0.2 });
  });
  // The Heartbeat Slam: it comes down flat — an Ember ring (the hit), two
  // beat-rings of violet light, the floor cracking into lit veins that run
  // out to the four patches it leaves, crystal splinters thrown up.
  bus.on('boss_vein_slam', (ev) => {
    mark('veinweaver_slam');
    const r = ev.radius ?? 2.8;
    const S = WEAVE.slam;
    SF.flare(ev.x, 0.5, ev.z, EMBER, 2.2, { kind: 'burst', life: 0.26, core: PARCH });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: VEINP, size: 1.6, life: 0.12 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.16 });
    for (let i = 0; i < 2; i++) SF.shock(ev.x, ev.z, r * (1.25 + i * 0.4), WEAVE.corruption, { life: 0.5 + i * 0.15, width: 0.16 - i * 0.04, core: VEINP, delay: 0.05 + i * 0.22, y: 0.08 });
    for (let i = 0; i < S.veins; i++) {
      const a = (i / S.veins) * TAU + 0.2;
      const l = r * (0.8 + 0.25 * ((i * 7) % 3));
      kit.streak({ a: { x: ev.x, y: 0.05, z: ev.z }, b: { x: ev.x + Math.cos(a) * l, y: 0.05, z: ev.z + Math.sin(a) * l }, width: 0.08, tailW: 0.03, core: VEINP, glow: VEINC, life: 0.9, fall: 0.6, opacity: 0.9, delay: 0.02 * i });
    }
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.85, glow: VEINC, life: 2.2, cool: 0.9 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.05, kind: 'crater', stain: FLESHC, glow: VEINC, glowOpacity: 0.4, cool: 1.4, life: 4.5, opacity: 0.45 });
    spray('shard', ev.x, 0.4, ev.z, S.shards, { color: GEMC, tile: SHARD_TILE.needle, speed: [1.4, 3.0], up: [1.6, 3.0], size: [0.08, 0.14], life: [0.6, 1.0], gravity: 6, spin: [-10, 10], jitter: r * 0.4 });
    spray('spark', ev.x, 0.3, ev.z, 14, { color: VEINC, speed: [0.5, 1.6], up: [0.8, 1.8], size: [0.05, 0.09], life: [0.6, 1.0], gravity: -0.3, drag: 1.4, jitter: r * 0.4 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.5, color: VEINC, opacity: 0.55, life: 0.55, attack: 0.02 });
    camfx.dolly(ev.x, ev.z, WEAVE.camera.dolly, 0.36);
  });
  // The Brood Sacs leave its spinnerets in a violet spit (each sac is a lob
  // the enemy layer draws, with its ring; its burst is the glob's own).
  bus.on('boss_brood_sacs', (ev) => {
    mark('veinweaver_brood');
    const b = SF.byId(ev.id);
    const f = faceOf(b);
    const sx = ev.x - f.x * 1.6;
    const sz = ev.z - f.z * 1.6;
    SF.flare(sx, 1.3, sz, WEAVE.corruption, 1.4, { kind: 'burst', life: 0.24, core: VEINP });
    spray('spark', sx, 1.3, sz, 10, { color: VEINC, speed: [0.4, 1.2], up: [0.6, 1.4], size: [0.05, 0.09], life: [0.5, 0.8], gravity: 0.6, drag: 1.4, jitter: 0.3 });
  });
  function weaverEnrage(ev) {
    mark('veinweaver_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.7, height: 3.0, color: WEAVE.corruption, life: 0.7, opacity: 0.5 });
    SF.flare(x, 1.4, z, WEAVE.corruption, 2.4, { kind: 'burst', life: 0.32, core: VEINP });
    for (let i = 0; i < 2; i++) kit.ring({ x, z, r0: 0.6, r1: 3.2 + i, width: 0.2, life: 0.7 + i * 0.2, core: VEINP, glow: VEINC, soft: 0.5, y: 0.06, delay: i * 0.22 });
    spray('shard', x, 1.2, z, 16, { color: GEMC, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.2, 2.4], size: [0.08, 0.13], life: [0.6, 1.0], gravity: 5, spin: [-10, 10], jitter: 0.6 });
    kit.light({ x, z, radius: 3, color: VEINC, opacity: 0.5, life: 0.8 });
  }
  function veinweaverDeath(x, z) {
    // Its threads go slack and its crystal goes dark: the abdomen bursts in
    // splinters, the veins in the floor flare once and fade, the violet
    // drains up out of it.
    mark('veinweaver_death');
    kit.pillar({ x, z, radius: 1.1, height: 4.2, color: WEAVE.corruption, life: 1.5, opacity: 0.6 });
    SF.flare(x, 1.2, z, WEAVE.corruption, 3.6, { kind: 'burst', life: 0.5, core: VEINP, spin: 0.7 });
    kit.flash({ x, y: 1.0, z, color: VEINP, size: 2.0, life: 0.22 });
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.6, r1: 3 + i * 1.3, width: 0.26 - i * 0.05, life: 0.8 + i * 0.25, core: VEINP, glow: VEINC, soft: 0.5, y: 0.06 + i * 0.2, delay: i * 0.18 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      kit.streak({ a: { x, y: 0.05, z }, b: { x: x + Math.cos(a) * 4.2, y: 0.05, z: z + Math.sin(a) * 4.2 }, width: 0.08, tailW: 0.02, core: VEINP, glow: VEINC, life: 1.4, fall: 0.4, opacity: 0.85, delay: 0.03 * i });
    }
    kit.mark({ x, z, radius: 3.2, kind: 'crater', stain: FLESHC, glow: VEINC, glowOpacity: 0.45, cool: 2.0, life: 7, opacity: 0.5 });
    spray('shard', x, 1.2, z, 40, { color: GEMC, tile: SHARD_TILE.needle, speed: [1.2, 3.2], up: [1.6, 3.4], size: [0.09, 0.16], life: [0.8, 1.3], gravity: 5, spin: [-10, 10], jitter: 0.8 });
    spray('spark', x, 0.6, z, 40, { color: VEINC, speed: [0.2, 1.0], up: [1.2, 2.8], size: [0.06, 0.12], life: [1.6, 2.6], gravity: -0.35, drag: 1.2, jitter: 1.2 });
    spray('smoke', x, 0.3, z, 8, { color: FLESHC, speed: [0.4, 1.2], up: [0.3, 0.8], size: [0.5, 0.7], grow: 1.6, life: [1.2, 1.8], opacity: 0.32, gravity: -0.2, drag: 2.0, jitter: 1.0 });
    kit.light({ x, z, radius: 4.4, color: VEINC, opacity: 0.6, life: 1.5 });
    camfx.dolly(x, z, WEAVE.camera.dolly * 1.2, 0.55);
  }
  // Wind-ups: the raven's wings throw ash as it rises, its mask's eyes burn
  // as it calls the Omen; the weaver's spinnerets gather light before a
  // Bind and the floor's veins draw in before the Slam.
  function slice11Windup(b, ev) {
    if (b.kind === 'ashraven') {
      if (ev.attack === 'dive') {
        mark('ashraven_rise');
        spray('smoke', b.x, 0.2, b.z, 6, { color: ASHC, speed: [1.0, 2.0], up: [0.1, 0.3], size: [0.45, 0.6], grow: 1.5, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4, jitter: 0.5 });
        kit.ring({ x: b.x, z: b.z, r0: 0.6, r1: 2.0, width: 0.12, life: 0.5, core: RAVEN.peak, glow: ASHC, soft: 0.6, y: 0.05, opacity: 0.5 });
      } else if (ev.attack === 'omen') {
        mark('ashraven_call');
        SF.anticipate(b.x, b.z, 2.2, RAVEN.corruption, { y: 2.6, lines: 10, core: RAVEN.peak });
      } else if (ev.attack === 'gust') {
        mark('ashraven_gust_windup');
        const f = faceOf(b);
        for (const s of [-1, 1]) SF.flare(b.x - f.z * 1.1 * s, 1.7, b.z + f.x * 1.1 * s, RAVEN.corruption, 0.7, { life: 0.35, core: RAVEN.peak });
      }
    } else if (b.kind === 'veinweaver') {
      if (ev.attack === 'bind') {
        mark('veinweaver_spin');
        const f = faceOf(b);
        SF.anticipate(b.x - f.x * 1.6, b.z - f.z * 1.6, 1.0, WEAVE.corruption, { y: 1.4, lines: 8, core: VEINP });
      } else if (ev.attack === 'slam') {
        mark('veinweaver_beat_windup');
        SF.anticipate(b.x, b.z, 2.6, VEINC, { y: 0.2, lines: 12, core: VEINP });
      }
    }
  }
  // Per frame: the Omen's crows circle above its ring and the dive throws
  // ash off its wake; each Bind thread is drawn from the weaver's
  // spinnerets to the hero it holds, beaded with light.
  function slice11Frame(e, rec) {
    if (e.kind === 'ashraven') {
      const t = e.telegraph;
      if (t && t.attack === 'omen' && rec.clock >= 0.06) {
        rec.clock = 0;
        const a = rnd(0, TAU);
        const rr = (t.radius ?? 1.4) * rnd(0.6, 1.1);
        spray('shard', t.x + Math.cos(a) * rr, rnd(2.2, 3.4), t.z + Math.sin(a) * rr, 1, { color: FEATHERC, tile: SHARD_TILE.feather, speed: [0.1, 0.4], up: [-0.4, 0.1], size: [0.14, 0.2], life: [0.4, 0.7], gravity: 0.2, drag: 1.2, spin: [-4, 4] });
        if (rnd(0, 1) < 0.4) spray('spark', t.x, 0.2, t.z, 1, { color: RAVEN.corruption, speed: [0.05, 0.2], up: [0.3, 0.7], size: [0.05, 0.08], life: [0.4, 0.7], gravity: -0.2, drag: 1.6, jitter: rr });
      } else if (e.mode === 'dive' && rec.clock >= 0.03) {
        rec.clock = 0;
        spray('shard', e.x, 0.9, e.z, 1, { color: FEATHERC, tile: SHARD_TILE.feather, speed: [0.1, 0.4], up: [0.3, 0.8], size: [0.1, 0.15], life: [0.7, 1.1], gravity: 0.9, drag: 1.6, spin: [-6, 6], jitter: 0.4 });
        spray('smoke', e.x, 0.2, e.z, 1, { color: ASHC, speed: [0.1, 0.3], up: [0.1, 0.3], size: [0.36, 0.5], grow: 1.3, life: [0.5, 0.8], opacity: 0.28, gravity: -0.1, drag: 2.4, jitter: 0.3 });
      } else if (e.enraged && rec.clock >= 0.25) {
        rec.clock = 0;
        spray('spark', e.x, 1.4, e.z, 1, { color: EMBER, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.04, 0.07], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.6, opacity: 0.85 });
      }
    } else if (e.kind === 'veinweaver') {
      const binds = Array.isArray(e.binds) ? e.binds : [];
      if (binds.length && rec.clock >= 0.05) {
        rec.clock = 0;
        const f = unit2(e.faceX ?? 0, e.faceZ ?? 1);
        const sx = e.x - f.x * 1.5;
        const sz = e.z - f.z * 1.5;
        for (const bd of binds) {
          const p = SF.byId(typeof bd === 'object' ? bd.id : bd);
          if (!p) continue;
          kit.streak({ a: { x: sx, y: 1.25, z: sz }, b: { x: p.x, y: 0.6, z: p.z }, width: 0.06, tailW: 0.05, core: VEINP, glow: WEAVE.corruption, life: 0.09, fall: 0, opacity: 0.9 });
          const k = rnd(0, 1);
          spray('spark', sx + (p.x - sx) * k, 1.25 + (0.6 - 1.25) * k, sz + (p.z - sz) * k, 1, { color: VEINC, speed: [0.02, 0.1], up: [0.05, 0.2], size: [0.05, 0.08], life: [0.3, 0.5], gravity: -0.1, drag: 1.6, opacity: 0.9 });
        }
      } else if (!binds.length && e.enraged && rec.clock >= 0.3) {
        rec.clock = 0;
        spray('spark', e.x, 1.6, e.z, 1, { color: VEINC, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.05, 0.08], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.6, opacity: 0.85 });
      }
    }
  }

  return { WOLF, MIRE, FURC, MOON, SLIME, RUSTC, wolfEnrage, gloamwolfDeath, mirekingEnrage, mirekingDeath, thirdBossWindup, thirdBossFrame, RAVEN, WEAVE, FEATHERC, ASHC, BONEC, VEINC, VEINP, GEMC, FLESHC, ravenEnrage, ashravenDeath, weaverEnrage, veinweaverDeath, slice11Windup, slice11Frame };
}
