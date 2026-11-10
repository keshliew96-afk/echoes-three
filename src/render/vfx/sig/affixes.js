// THE ELITE AFFIX LOOKS (docs/ELITE_AFFIXES.md): the crown burst when an elite
// rolls its affixes, and each affix's proc.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { AFFIX_COLORS, VFX_MATTER } from '../../../data/palette.js';
import { BONE, EMBER, INK, PARCH, TAU } from './common.js';
import { AFFIX_RULES } from '../../../sim/affixes.js';
import { SHARD_TILE } from '../particles.js';

export function createSigAffixes(ctx) {
  const { SF, N, bus, camfx, kit, mark, rnd, spray } = ctx;

  // ------------------------------------------------------- ELITE AFFIXES --
  // docs/ELITE_AFFIXES.md. The bursts and beats of the eight powers (the
  // auras, shells and name plates that live on the elite are
  // render/enemies/affixes.js). Each colour is the power's own
  // (palette AFFIX_COLORS); the warning shape is always the Ember ring.
  const AC = AFFIX_COLORS;
  // An affixed elite arrives: one flare per power in its colour, a shock ring.
  bus.on('elite_affixes', (ev) => {
    mark('affix_reveal');
    const list = ev.affixes || [];
    list.forEach((id, i) => {
      const c = AC[id] ?? BONE;
      SF.flare(ev.x, 1.0 + i * 0.25, ev.z, c, 0.9, { kind: 'star', life: 0.32, delay: 0.1 + i * 0.12 });
      SF.shock(ev.x, ev.z, 1.5 + i * 0.4, c, { life: 0.45, width: 0.07, delay: 0.1 + i * 0.12 });
    });
  });
  // Frozen wind-up: frost drawn IN to the elite, a rising glacier light.
  bus.on('affix_frost', (ev) => {
    mark('affix_frost');
    const c = AC.frozen;
    const r = AFFIX_RULES.frozen.radius;
    for (let i = 0; i < N(10); i++) {
      const a = (i / 10) * TAU + rnd(-0.2, 0.2);
      const rr = r * rnd(0.9, 1.15);
      kit.streak({ a: { x: ev.x + Math.cos(a) * rr, y: 0.25, z: ev.z + Math.sin(a) * rr }, b: { x: ev.x + Math.cos(a) * (rr - 0.3), y: 0.3, z: ev.z + Math.sin(a) * (rr - 0.3) }, width: 0.05, tailW: 0, core: PARCH, glow: c, life: 0.6, delay: i * 0.03, travel: { x: -Math.cos(a) * rr * 1.4, y: 0.2, z: -Math.sin(a) * rr * 1.4 }, fall: 0.6 });
    }
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: c, opacity: 0.45, life: 1.1 });
    spray('spark', ev.x, 0.2, ev.z, 10, { color: c, speed: [0.05, 0.3], up: [0.4, 1.0], size: [0.04, 0.08], life: [0.6, 1.0], gravity: -0.3, drag: 1.4, jitter: r * 0.8, opacity: 0.85 });
  });
  // The two bursts that land as globs.
  function affixBurst(ev) {
    const x = ev.x;
    const z = ev.z;
    const r = ev.radius ?? 1.6;
    if (ev.affix === 'frozen') {
      mark('affix_frost_burst');
      const c = AC.frozen;
      SF.flare(x, 0.6, z, c, 1.6, { kind: 'star', life: 0.26 });
      kit.flash({ x, y: 0.5, z, color: c, size: r * 1.1, life: 0.3, opacity: 0.7 });
      SF.shock(x, z, r * 1.1, c, { life: 0.35, width: 0.14, jag: 0.3 });
      SF.shock(x, z, r * 0.7, PARCH, { life: 0.25, width: 0.06, delay: 0.04 });
      for (let i = 0; i < N(12); i++) {
        const a = (i / 12) * TAU + rnd(-0.15, 0.15);
        kit.streak({ a: { x, y: 0.3, z }, b: { x: x + Math.cos(a) * 0.3, y: 0.35, z: z + Math.sin(a) * 0.3 }, width: 0.06, tailW: 0, core: PARCH, glow: c, life: 0.28, travel: { x: Math.cos(a) * r * 3.2, y: 0, z: Math.sin(a) * r * 3.2 }, fall: 0.4 });
      }
      spray('shard', x, 0.4, z, 14, { color: c, tile: SHARD_TILE.drop, speed: [1.4, 3.0], up: [1.0, 2.4], size: [0.08, 0.16], life: [0.5, 0.9], gravity: 7, drag: 0.4, spin: [-4, 4] });
      spray('smoke', x, 0.2, z, 4, { color: c, speed: [0.6, 1.4], up: [0.1, 0.3], size: [0.4, 0.6], grow: 1.4, life: [0.7, 1.1], opacity: 0.3, gravity: -0.05, drag: 2.4, jitter: r * 0.5 });
      kit.mark({ x, z, radius: r * 1.2, kind: 'sigil', stain: c, glow: c, cool: 1.2, life: 1.6, opacity: 0.35 });
      kit.light({ x, z, radius: r * 1.6, color: c, opacity: 0.6, life: 0.6 });
      SF.elementAir(x, z, r * 0.8, c, PARCH);
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.05, 0.1);
      return;
    }
    // Batch two (content plan 5 slice 10).
    if (ev.affix === 'gusting') {
      // The gust breaks outward: a pale shock wall, wind streaks flung to the
      // rim and past it, dust kicked up in a ring.
      mark('affix_gust_burst');
      const c = AC.gusting;
      kit.flash({ x, y: 0.5, z, color: c, size: r * 0.9, life: 0.22, opacity: 0.55 });
      SF.shock(x, z, r * 1.15, c, { life: 0.4, width: 0.18 });
      SF.shock(x, z, r * 0.8, PARCH, { life: 0.3, width: 0.07, delay: 0.05 });
      kit.ring({ x, z, r0: r * 0.3, r1: r * 1.35, width: 0.12, life: 0.35, core: PARCH, glow: c, soft: 0.6, y: 0.08 });
      for (let i = 0; i < N(16); i++) {
        const a = (i / 16) * TAU + rnd(-0.12, 0.12);
        const r0 = r * rnd(0.2, 0.5);
        kit.streak({ a: { x: x + Math.cos(a) * r0, y: rnd(0.2, 0.9), z: z + Math.sin(a) * r0 }, b: { x: x + Math.cos(a) * (r0 + 0.5), y: rnd(0.2, 0.9), z: z + Math.sin(a) * (r0 + 0.5) }, width: 0.05, tailW: 0, core: PARCH, glow: c, life: 0.32, delay: rnd(0, 0.05), travel: { x: Math.cos(a) * r * 2.2, y: 0.1, z: Math.sin(a) * r * 2.2 }, fall: 0.5 });
      }
      spray('smoke', x, 0.15, z, 10, { color: VFX_MATTER.cinder, speed: [1.4, 2.6], up: [0.05, 0.3], size: [0.35, 0.6], grow: 1.6, life: [0.5, 0.8], opacity: 0.32, drag: 2.2, jitter: r * 0.3 });
      spray('spark', x, 0.3, z, 10, { color: c, speed: [2.0, 3.6], up: [0.2, 0.7], size: [0.03, 0.06], life: [0.3, 0.5], drag: 1.0, opacity: 0.9 });
      kit.light({ x, z, radius: r * 1.4, color: c, opacity: 0.45, life: 0.45 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.07, 0.12);
      return;
    }
    if (ev.affix === 'crystal') {
      // The spur erupts: a lance of rose quartz out of the floor, splinters
      // thrown up and out, a cracked star left in the stone.
      mark('affix_spur_burst');
      const c = AC.crystal;
      SF.flare(x, 0.8, z, c, 1.0, { kind: 'star', life: 0.22 });
      kit.flash({ x, y: 0.6, z, color: c, size: r * 0.8, life: 0.2, opacity: 0.35 });
      kit.pillar({ x, z, radius: 0.18, height: 1.9, color: c, life: 0.3, opacity: 0.35 });
      SF.shock(x, z, r * 1.1, c, { life: 0.32, width: 0.12, jag: 0.5 });
      kit.crack({ x, z, radius: r * 0.85, glow: c, life: 1.8, cool: 0.5 });
      spray('shard', x, 0.5, z, 16, { color: c, tile: SHARD_TILE.drop, speed: [1.2, 2.8], up: [1.6, 3.2], size: [0.07, 0.15], life: [0.5, 0.9], gravity: 7, drag: 0.4, spin: [-5, 5] });
      spray('spark', x, 0.6, z, 8, { color: PARCH, speed: [0.8, 2.0], up: [0.8, 1.8], size: [0.03, 0.05], life: [0.3, 0.5], drag: 1.0 });
      kit.light({ x, z, radius: r * 1.5, color: c, opacity: 0.32, life: 0.45 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.05, 0.1);
      return;
    }
    if (ev.affix === 'tolling') {
      // The toll rings out: three iron rings roll across the ring one after
      // another, a dull flash at the bell, the air shivering.
      mark('affix_toll_burst');
      const c = AC.tolling;
      SF.flare(x, 1.6, z, c, 1.2, { kind: 'star', life: 0.3 });
      for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.3, r1: r * (1.0 + i * 0.12), width: 0.1 - i * 0.02, life: 0.5 + i * 0.1, core: PARCH, glow: c, soft: 0.5, y: 0.06 + i * 0.01, delay: i * 0.12 });
      kit.mark({ x, z, radius: r * 0.9, kind: 'sigil', stain: c, glow: c, cool: 1.0, life: 1.4, opacity: 0.25 });
      spray('spark', x, 0.4, z, 8, { color: c, speed: [0.3, 0.8], up: [0.2, 0.6], size: [0.04, 0.07], life: [0.6, 1.0], drag: 1.6, jitter: r * 0.7, opacity: 0.8 });
      kit.light({ x, z, radius: r * 1.3, color: c, opacity: 0.4, life: 0.7 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.03, 0.08);
      return;
    }
    // Molten: the core bursts, lava thrown out, a burning pool left behind.
    mark('affix_molten_burst');
    const c = AC.molten;
    SF.flare(x, 0.5, z, c, 2.0, { kind: 'burst', life: 0.3 });
    kit.flash({ x, y: 0.6, z, color: EMBER, size: r * 1.3, life: 0.32, opacity: 0.8 });
    SF.shock(x, z, r * 1.2, c, { life: 0.38, width: 0.16, jag: 0.6 });
    SF.shock(x, z, r * 0.8, EMBER, { life: 0.3, width: 0.08, delay: 0.05 });
    kit.crack({ x, z, radius: r * 0.9, glow: c, life: 2.2, cool: 0.5 });
    kit.mark({ x, z, radius: r * 1.3, kind: 'scorch', stain: INK, glow: c, cool: 1.6, life: 4.0, opacity: 0.55 });
    spray('spark', x, 0.3, z, 22, { color: c, speed: [1.6, 3.6], up: [1.6, 3.4], size: [0.05, 0.1], life: [0.5, 0.9], gravity: 5, drag: 0.6, opacity: 0.95 });
    spray('chunk', x, 0.3, z, 8, { color: VFX_MATTER.ash, speed: [1.2, 2.6], up: [1.4, 2.8], size: [0.07, 0.14], life: [0.5, 0.8] });
    spray('smoke', x, 0.3, z, 5, { color: VFX_MATTER.cinder, speed: [0.4, 1.0], up: [0.4, 0.9], size: [0.45, 0.7], grow: 1.6, life: [0.9, 1.4], opacity: 0.4, gravity: -0.3, drag: 2.0, jitter: r * 0.4 });
    SF.embersUp(x, z, c, 12, { radius: r * 0.8, life: [1.0, 2.0] });
    kit.light({ x, z, radius: r * 2.0, color: c, opacity: 0.75, life: 0.8 });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.09, 0.14);
  }
  // Batch two wind-ups: the gust draws air in to the elite; the toll lifts
  // a cold flare over its bell; the spur glints where it is planted; a
  // Cinder patch catches with a little puff of sparks.
  bus.on('affix_gust', (ev) => {
    mark('affix_gust');
    const c = AC.gusting;
    const r = ev.radius ?? AFFIX_RULES.gusting.radius;
    for (let i = 0; i < N(12); i++) {
      const a = (i / 12) * TAU + rnd(-0.2, 0.2);
      const rr = r * rnd(0.95, 1.2);
      kit.streak({ a: { x: ev.x + Math.cos(a) * rr, y: rnd(0.2, 0.7), z: ev.z + Math.sin(a) * rr }, b: { x: ev.x + Math.cos(a + 0.3) * (rr - 0.4), y: 0.4, z: ev.z + Math.sin(a + 0.3) * (rr - 0.4) }, width: 0.04, tailW: 0, core: PARCH, glow: c, life: 0.7, delay: i * 0.035, travel: { x: -Math.cos(a) * rr * 1.2, y: 0.25, z: -Math.sin(a) * rr * 1.2 }, fall: 0.6 });
    }
    kit.light({ x: ev.x, z: ev.z, radius: r, color: c, opacity: 0.3, life: 0.9 });
  });
  bus.on('affix_toll', (ev) => {
    mark('affix_toll');
    const c = AC.tolling;
    SF.flare(ev.x, 1.7, ev.z, c, 0.9, { kind: 'star', life: 0.4 });
    kit.ring({ x: ev.x, z: ev.z, r0: (ev.radius ?? 3) * 1.05, r1: 0.4, width: 0.05, life: 0.9, core: c, glow: c, soft: 0.5, y: 0.05, opacity: 0.5 });
  });
  bus.on('affix_spur', (ev) => {
    mark('affix_spur');
    const c = AC.crystal;
    SF.flare(ev.x, 0.25, ev.z, c, 0.7, { kind: 'star', life: 0.3 });
    spray('shard', ev.x, 0.1, ev.z, 5, { color: c, tile: SHARD_TILE.drop, speed: [0.2, 0.6], up: [0.4, 0.9], size: [0.05, 0.09], life: [0.3, 0.5], gravity: 6, spin: [-3, 3] });
  });
  bus.on('affix_cinder', (ev) => {
    spray('spark', ev.x, 0.1, ev.z, 3, { color: AC.cinder, speed: [0.05, 0.25], up: [0.5, 1.0], size: [0.03, 0.06], life: [0.5, 0.9], gravity: -0.3, drag: 1.5, jitter: ev.radius ?? 0.5, opacity: 0.9 });
    spray('smoke', ev.x, 0.1, ev.z, 1, { color: VFX_MATTER.cinder, speed: [0.05, 0.2], up: [0.3, 0.6], size: [0.35, 0.55], grow: 1.5, life: [0.9, 1.4], opacity: 0.22, gravity: -0.2, drag: 2 });
  });
  // A molten core drops where the elite fell.
  bus.on('affix_core', (ev) => {
    mark('affix_core');
    SF.flare(ev.x, 0.35, ev.z, AC.molten, 0.8, { kind: 'burst', life: 0.25 });
    SF.embersUp(ev.x, ev.z, AC.molten, 6, { radius: 0.3 });
  });
  // Warded: a gold rune ring snaps shut when the ward goes up; it shatters
  // into gold flakes when it drops.
  bus.on('affix_ward', (ev) => {
    const c = AC.warded;
    if (ev.stage === 'on') {
      mark('affix_ward');
      SF.flare(ev.x, 0.9, ev.z, c, 1.2, { kind: 'star', life: 0.24 });
      kit.ring({ x: ev.x, z: ev.z, r0: 1.6, r1: 0.7, width: 0.09, life: 0.22, core: PARCH, glow: c, soft: 0.4, y: 0.06 });
      kit.light({ x: ev.x, z: ev.z, radius: 1.8, color: c, opacity: 0.4, life: 0.5 });
    } else if (ev.stage === 'off') {
      spray('shard', ev.x, 0.8, ev.z, 10, { color: c, tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [0.6, 1.6], size: [0.06, 0.12], life: [0.4, 0.7], gravity: 5, spin: [-5, 5] });
    }
  });
  // Blinking: the body implodes where it stood, a streak to the marked spot,
  // and arrives in a flare.
  bus.on('affix_blink', (ev) => {
    mark('affix_blink');
    const c = AC.blinking;
    kit.ring({ x: ev.fromX, z: ev.fromZ, r0: 1.0, r1: 0.1, width: 0.08, life: 0.18, core: PARCH, glow: c, soft: 0.4, y: 0.06 });
    kit.flash({ x: ev.fromX, y: 0.6, z: ev.fromZ, color: c, size: 0.9, life: 0.18, grow: -0.6, opacity: 0.8 });
    kit.streak({ a: { x: ev.fromX, y: 0.6, z: ev.fromZ }, b: { x: ev.x, y: 0.6, z: ev.z }, width: 0.12, tailW: 0.02, core: PARCH, glow: c, life: 0.2, fall: 1.0 });
    SF.flare(ev.x, 0.6, ev.z, c, 1.2, { kind: 'star', life: 0.22 });
    SF.shock(ev.x, ev.z, 1.2, c, { life: 0.3, width: 0.08 });
    spray('spark', ev.x, 0.5, ev.z, 10, { color: c, speed: [0.8, 2.0], up: [0.4, 1.4], size: [0.04, 0.08], life: [0.3, 0.5], drag: 1.0 });
  });
  // Splitting: the body cracks in two.
  bus.on('affix_split', (ev) => {
    mark('affix_split');
    const c = AC.splitting;
    SF.flare(ev.x, 0.6, ev.z, c, 1.3, { kind: 'burst', life: 0.26 });
    SF.shock(ev.x, ev.z, 1.4, c, { life: 0.35, width: 0.1, jag: 0.5 });
    kit.crack({ x: ev.x, z: ev.z, radius: 0.8, glow: c, life: 1.2, cool: 0.4 });
    spray('chunk', ev.x, 0.5, ev.z, 8, { color: c, speed: [1.0, 2.2], up: [1.2, 2.4], size: [0.06, 0.12], life: [0.4, 0.7] });
    for (const id of ev.brood || []) {
      const b = SF.byId(id);
      if (b) SF.flare(b.x, 0.5, b.z, c, 0.7, { kind: 'star', life: 0.2, delay: 0.05 });
    }
  });
  // Vampiric: a blood thread from the wound back to the elite.
  bus.on('affix_leech', (ev) => {
    const t = SF.byId(ev.target);
    if (!t) return;
    mark('affix_leech');
    const c = AC.vampiric;
    kit.streak({ a: { x: t.x, y: 0.7, z: t.z }, b: { x: ev.x, y: 0.8, z: ev.z }, width: 0.06, tailW: 0, core: c, glow: c, life: 0.3, fall: 0.8 });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: c, size: 0.6, life: 0.22, opacity: 0.7 });
    spray('spark', t.x, 0.6, t.z, 4, { color: c, speed: [0.3, 0.8], up: [0.4, 0.9], size: [0.04, 0.07], life: [0.3, 0.5], drag: 1.0 });
  });
  // Thorned: thorn splinters fly back at whoever struck it.
  bus.on('affix_thorns', (ev) => {
    const t = SF.byId(ev.target);
    if (!t) return;
    mark('affix_thorns');
    const dx = t.x - ev.x;
    const dz = t.z - ev.z;
    const l = Math.hypot(dx, dz) || 1;
    spray('shard', ev.x + (dx / l) * 0.4, 0.6, ev.z + (dz / l) * 0.4, 6, { color: BONE, tile: SHARD_TILE.drop, speed: [2.0, 3.4], up: [0.2, 0.6], size: [0.06, 0.1], life: [0.2, 0.35], dir: { x: dx / l, z: dz / l }, dirBias: 0.85, gravity: 3 });
    kit.flash({ x: t.x, y: 0.7, z: t.z, color: AC.thorned, size: 0.45, life: 0.15, opacity: 0.7 });
  });

  return { AC, affixBurst };
}
