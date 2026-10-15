// HAZARDS AND SHRINES beats (docs/SHRINES.md, content plan 4 slice 9).
//
//   crystal spurs (Act IV hazard; the rig in render/hazards/index.js draws
//   the Ember ring and the crystal tips cracking up through it)
//     hazard_resolve (spur)   the burst: energy drawn into the mark, then a
//                             violet-white crystal flare with an Ember edge
//                             (the hit), a jagged shock ring, floor cracks,
//                             needle shards and crystal dust thrown up, a
//                             light pool and a short camera punch
//     rubble_crumble (spur)   the pillar shatters: shards and dust fall
//   shrines
//     shrine_spawn            a soft beam settles where the shrine stands
//     shrine_offer            the price leaves (blood motes, Glint coins, a
//                             curse's smoke, the key, the tonic's colour)
//                             and rises into the shrine; the shrine answers
//                             with a beam, a flare and a ring, and a ribbon
//                             of light runs to every hero, who flares and
//                             wears the blessing's colour
//     shrine_denied           the shrine stays dark: a grey puff and a dull
//                             ring (the HUD toast names why)
//   blessings (frame)         a blessed hero sheds a few motes of the
//                             blessing's colour round the feet while it lasts
//
// createShrineFx(h) takes the signature director's helpers and returns
// { frame(dt, entities) } for its per-frame loop.
import { PALETTE, SHRINE_COLORS, BLESSING_COLORS, TONIC_COLORS, VFX_MATTER } from '../../data/palette.js';
import { SHARD_TILE } from './particles.js';

const PARCH = PALETTE.parchment;
const EMBER = PALETTE.emberDanger;
const INK = PALETTE.voidCharcoal;
const CRYSTAL = VFX_MATTER.heartcrystal;
const CRYSTAL_PEAK = '#E9DCFF';
const TAU = Math.PI * 2;

export function createShrineFx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, N, rnd, mark, world }) {
  // ------------------------------------------------------ crystal spurs --
  bus.on('hazard_resolve', (ev) => {
    if (ev.htype !== 'spur') return;
    mark('spur_burst');
    const { x, z } = ev;
    const r = ev.radius ?? 0.75;
    anticipate(x, z, r, CRYSTAL, { y: 0.2, lines: 5, core: CRYSTAL_PEAK });
    after(0.05, () => {
      flare(x, 0.7, z, CRYSTAL, 1.5, { kind: 'star', life: 0.24, core: CRYSTAL_PEAK });
      flare(x, 0.35, z, EMBER, 0.8, { kind: 'burst', life: 0.16, core: PARCH });
      kit.flash({ x, y: 0.6, z, color: CRYSTAL_PEAK, size: 1.4, life: 0.3, hold: 0.06 });
      kit.pillar({ x, z, radius: 0.35, height: 2.6, color: CRYSTAL, life: 0.45, opacity: 0.7 });
      shock(x, z, r * 1.7, CRYSTAL, { life: 0.38, width: 0.12, core: CRYSTAL_PEAK, jag: 0.7 });
      shock(x, z, r * 1.05, EMBER, { life: 0.22, width: 0.07, core: PARCH });
      kit.crack({ x, z, radius: r * 1.5, glow: CRYSTAL, life: 2.2, cool: 0.6 });
      kit.mark({ x, z, radius: r * 1.4, kind: 'crater', stain: INK, glow: CRYSTAL, glowOpacity: 0.45, cool: 1.1, life: 4.0, opacity: 0.45 });
      kit.light({ x, z, radius: 2.4, color: CRYSTAL, opacity: 0.6, life: 0.6, attack: 0.02 });
      spray('shard', x, 0.4, z, 16, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.4, 3.4], up: [2.0, 4.2], size: [0.1, 0.2], life: [0.6, 1.1], gravity: 2.4, drag: 1.0, spin: [-8, 8], jitter: r * 0.4 });
      spray('shard', x, 0.6, z, 6, { color: CRYSTAL_PEAK, tile: SHARD_TILE.needle, speed: [0.8, 2.0], up: [2.6, 4.8], size: [0.08, 0.14], life: [0.5, 0.9], gravity: 2.0, drag: 1.2, spin: [-10, 10], jitter: 0.2 });
      spray('chunk', x, 0.2, z, 6, { color: VFX_MATTER.stone, speed: [1.0, 2.4], up: [1.2, 2.6], size: [0.06, 0.12], life: [0.5, 0.8], jitter: r * 0.5 });
      spray('smoke', x, 0.15, z, 5, { color: VFX_MATTER.dust, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.4, 0.6], grow: 1.5, life: [0.7, 1.1], opacity: 0.3, gravity: -0.1, drag: 2.4, jitter: r * 0.6 });
      embersUp(x, z, CRYSTAL_PEAK, 6, { radius: r * 0.6 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.09, 0.12);
    });
  });
  bus.on('rubble_crumble', (ev) => {
    if (ev.skin !== 'spur' || ev.x === undefined) return;
    mark('spur_shatter');
    const { x, z } = ev;
    flare(x, 0.9, z, CRYSTAL, 0.8, { kind: 'star', life: 0.18, core: CRYSTAL_PEAK });
    spray('shard', x, 1.0, z, 12, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [0.5, 1.6], up: [0.4, 1.4], size: [0.1, 0.18], life: [0.6, 1.0], gravity: 2.6, drag: 1.2, spin: [-6, 6], jitter: 0.35 });
    spray('smoke', x, 0.3, z, 3, { color: VFX_MATTER.dust, speed: [0.3, 0.8], up: [0.1, 0.4], size: [0.35, 0.5], grow: 1.4, life: [0.6, 0.9], opacity: 0.28, drag: 2.2, jitter: 0.3 });
    shock(x, z, 0.9, CRYSTAL, { life: 0.3, width: 0.06, core: CRYSTAL_PEAK });
  });

  // ------------------------------------------------------------ shrines --
  const colOf = (id) => SHRINE_COLORS[id] ?? SHRINE_COLORS.wood;
  bus.on('shrine_spawn', (ev) => {
    const c = colOf(ev.shrine);
    kit.pillar({ x: ev.x, z: ev.z, radius: 0.5, height: 4, color: c.glow, life: 1.4, opacity: 0.35 });
    kit.light({ x: ev.x, z: ev.z, radius: 2.4, color: c.glow, opacity: 0.35, life: 1.2, attack: 0.1 });
  });
  bus.on('shrine_offer', (ev) => {
    mark(`shrine_${ev.shrine}`);
    const c = colOf(ev.shrine);
    const { x, z } = ev;
    const by = byId(ev.by);
    // The price leaves the party and rises into the shrine.
    const price = ev.hp
      ? { color: '#C8483C', tile: SHARD_TILE.drop }
      : ev.glint
        ? { color: PALETTE.paleGold, tile: SHARD_TILE.petal }
        : ev.curse
          ? { color: INK, tile: SHARD_TILE.feather }
          : ev.pick
            ? { color: PALETTE.paleGold, tile: SHARD_TILE.needle }
            : { color: (TONIC_COLORS[ev.tonic] ?? TONIC_COLORS.mend_tonic).glow, tile: SHARD_TILE.drop };
    const from = ev.hp ? (world?.entities?.() ?? []).filter((e) => e.partyIndex !== undefined && e.hp > 0) : by ? [by] : [];
    for (const h of from) {
      kit.streak({ a: { x: h.x, y: 0.9, z: h.z }, b: { x, y: 1.3, z }, width: 0.08, tailW: 0.02, core: PARCH, glow: price.color, life: 0.35, fall: 1.4, opacity: 0.85 });
      spray('shard', h.x, 0.9, h.z, 4, { color: price.color, tile: price.tile, speed: [0.3, 0.8], up: [0.8, 1.6], size: [0.08, 0.13], life: [0.5, 0.8], gravity: -0.4, drag: 1.4, jitter: 0.3 });
    }
    if (ev.curse) spray('smoke', x, 0.4, z, 8, { color: INK, speed: [0.2, 0.6], up: [0.6, 1.2], size: [0.45, 0.7], grow: 1.5, life: [0.9, 1.4], opacity: 0.4, gravity: -0.3, drag: 1.8, jitter: 0.5 });
    anticipate(x, z, 1.4, c.glow, { y: 0.9, lines: 8, core: c.core });
    after(0.22, () => {
      // The shrine answers.
      kit.pillar({ x, z, radius: 0.6, height: 6, color: c.glow, life: 1.4, opacity: 0.5 });
      kit.pillar({ x, z, radius: 0.16, height: 7, color: c.core, life: 1.0, opacity: 0.9 });
      flare(x, 1.3, z, c.glow, 2.0, { kind: 'star', life: 0.3, core: c.core });
      kit.flash({ x, y: 1.1, z, color: c.glow, size: 1.8, life: 0.4, hold: 0.08 });
      kit.light({ x, z, radius: 3.6, color: c.glow, opacity: 0.6, life: 1.2, attack: 0.04 });
      shock(x, z, 3.2, c.glow, { life: 0.6, width: 0.14, core: c.core });
      shock(x, z, 1.8, c.core, { life: 0.4, width: 0.06, core: PARCH, delay: 0.06 });
      kit.mark({ x, z, radius: 1.6, kind: 'sigil', stain: INK, glow: c.glow, glowOpacity: 0.55, cool: 1.6, life: 4.5, opacity: 0.25 });
      spray('spark', x, 0.6, z, 22, { color: c.glow, speed: [0.2, 0.9], up: [1.4, 3.0], size: [0.05, 0.1], life: [0.9, 1.5], gravity: -0.2, drag: 1.0, jitter: 0.5, opacity: 0.95 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.06, 0.14);
      // A ribbon of light to every hero; each flares in the blessing.
      if (!ev.blessing && !ev.pick) return;
      const bc = ev.blessing ? BLESSING_COLORS[ev.blessing] ?? c : c;
      const heroes = (world?.entities?.() ?? []).filter((e) => e.partyIndex !== undefined);
      heroes.forEach((h, i) => {
        after(0.06 + i * 0.05, () => {
          kit.streak({ a: { x, y: 1.4, z }, b: { x: h.x, y: 0.9, z: h.z }, width: 0.12, tailW: 0.04, core: bc.core, glow: bc.glow, life: 0.4, fall: 1.2, opacity: 0.9 });
          if (ev.pick) return;
          flare(h.x, 0.9, h.z, bc.glow, 1.1, { kind: 'burst', life: 0.24, core: bc.core });
          kit.ring({ x: h.x, z: h.z, r0: 0.2, r1: 1.2, width: 0.1, life: 0.5, core: bc.core, glow: bc.glow, soft: 0.5, y: 0.06 });
          spray('spark', h.x, 0.3, h.z, 8, { color: bc.glow, speed: [0.1, 0.4], up: [0.9, 1.8], size: [0.04, 0.08], life: [0.7, 1.1], gravity: -0.3, drag: 1.4, jitter: 0.4, opacity: 0.9 });
        });
      });
    });
  });
  bus.on('shrine_denied', (ev) => {
    if (ev.x === undefined) return;
    spray('smoke', ev.x, 0.6, ev.z, 3, { color: PALETTE.warmGrey, speed: [0.1, 0.4], up: [0.3, 0.7], size: [0.3, 0.45], grow: 1.3, life: [0.5, 0.8], opacity: 0.3, drag: 2.0, jitter: 0.3 });
    kit.ring({ x: ev.x, z: ev.z, r0: 1.0, r1: 0.3, width: 0.06, life: 0.35, core: PALETTE.bone, glow: PALETTE.warmGrey, soft: 0.6, y: 0.06, opacity: 0.6 });
  });

  // --------------------------------------------------------- blessings --
  let acc = 0;
  function frame(dt, entities) {
    acc += dt;
    if (acc < 0.12) return;
    acc = 0;
    const tick = world?.tick ?? 0;
    for (const e of entities) {
      if (e.partyIndex === undefined || !e.blessing || !(e.blessing.untilTick > tick) || !(e.hp > 0)) continue;
      const bc = BLESSING_COLORS[e.blessing.id];
      if (!bc) continue;
      // The last 5 s flicker thinner so the end reads before it comes.
      const left = (e.blessing.untilTick - tick) / 60;
      if (left < 5 && rnd(0, 1) < 0.5) continue;
      const a = rnd(0, TAU);
      spray('spark', e.x + Math.cos(a) * 0.35, 0.12, e.z + Math.sin(a) * 0.35, 1, { color: bc.glow, speed: [0.02, 0.12], up: [0.5, 1.1], size: [0.04, 0.07], life: [0.6, 1.0], gravity: -0.25, drag: 1.4, jitter: 0.1, opacity: 0.85 });
      if (e.blessing.haste && (Math.abs(e.x - (e.px ?? e.x)) + Math.abs(e.z - (e.pz ?? e.z)) > 0.02)) {
        const vx = e.x - e.px;
        const vz = e.z - e.pz;
        const l = Math.hypot(vx, vz) || 1;
        kit.streak({ a: { x: e.x - (vx / l) * 0.9, y: 0.5, z: e.z - (vz / l) * 0.9 }, b: { x: e.x - (vx / l) * 0.2, y: 0.55, z: e.z - (vz / l) * 0.2 }, width: 0.05, tailW: 0, core: bc.core, glow: bc.glow, life: 0.22, fall: 1.4, opacity: 0.6 });
      }
    }
  }
  return { frame };
}
