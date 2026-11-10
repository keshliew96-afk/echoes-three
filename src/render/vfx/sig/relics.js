// THE RELIC AND CURSE LOOKS (docs/RELICS.md): a relic's rise when gained,
// its drop, every relic's proc, and the curses' procs, applying and lifting.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { BONE, EMBER, HEAL, INK, PARCH, TAU } from './common.js';
import { PALETTE, TONIC_COLORS, VFX_MATTER } from '../../../data/palette.js';
import { vfxClassStyle, vfxMatterColor } from '../../../data/vfx.js';

export function createSigRelics(ctx) {
  const { SF, CINDER, N, after, bus, camfx, kit, mark, player, rnd, spray } = ctx;

  // ------------------------------------------------- relics and curses --
  // (sim/relics.js) A relic taken rises off the Healer in its rarity colour;
  // a proc marks the body it touched; a cursed room opens with a violet ring
  // closing on the party and lifts with one bursting outward.
  const RELIC_RARITY = { common: BONE, rare: PALETTE.signalBlue, legendary: PALETTE.hearthAmber };
  const VIOLET = PALETTE.godstuffViolet;
  const VIOLET_PEAK = PALETTE.godstuffVioletPeak;
  const bodyAt = (ev) => {
    const b = SF.byId(ev.target);
    return b ? { x: b.x, z: b.z } : { x: ev.x ?? player()?.x ?? 0, z: ev.z ?? player()?.z ?? 0 };
  };
  bus.on('relic_gain', (ev) => {
    // An elite's drop reaches the party after its loot beam (relic_drop).
    if (ev.source === 'elite') after(0.5, () => relicRise(ev));
    else relicRise(ev);
  });
  function relicRise(ev) {
    const p = player();
    const x = p ? p.x : ev.x ?? 0;
    const z = p ? p.z : ev.z ?? 0;
    const c = RELIC_RARITY[ev.rarity] ?? BONE;
    kit.ring({ x, z, r0: 0.3, r1: 2.2, width: 0.14, life: 0.7, core: PARCH, glow: c, soft: 0.5, y: 0.06 });
    kit.flash({ x, y: 1.4, z, color: c, size: 1.1, life: 0.5, hold: 0.12 });
    kit.light({ x, z, radius: 2.4, color: c, opacity: 0.55, life: 0.8 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      kit.streak({ a: { x: x + Math.cos(a) * 0.5, y: 0.1, z: z + Math.sin(a) * 0.5 }, b: { x: x + Math.cos(a) * 0.35, y: 1.9, z: z + Math.sin(a) * 0.35 }, width: 0.05, tailW: 0, core: PARCH, glow: c, life: 0.6, delay: i * 0.04, fall: 0.6 });
    }
    spray('spark', x, 0.4, z, ev.rarity === 'legendary' ? 18 : 10, { color: c, speed: [0.2, 0.7], up: [1.4, 2.6], size: [0.05, 0.1], life: [0.8, 1.3], gravity: -0.2, drag: 1.2, jitter: 0.5, opacity: 0.9 });
  }

  // Slice 2 — an ELITE'S RELIC DROP: the corpse throws up a loot beam in the
  // relic's rarity colour (hot core inside a wide glow column, a ground
  // shockwave, a light pool, sparks climbing the beam), then the relic arcs
  // to the party and rises off it (relic_gain, 0.5 s later).
  const SPORE_R = vfxMatterColor('spore');
  bus.on('relic_drop', (ev) => {
    mark('relic_drop');
    const { x, z } = ev;
    const c = RELIC_RARITY[ev.rarity] ?? BONE;
    kit.pillar({ x, z, radius: 0.55, height: 6.5, color: c, life: 1.6, opacity: 0.42 });
    kit.pillar({ x, z, radius: 0.16, height: 7.5, color: PARCH, life: 1.3, opacity: 0.9 });
    SF.flare(x, 1.1, z, c, 1.6, { kind: 'burst', life: 0.3 });
    kit.flash({ x, y: 1.2, z, color: c, size: 1.6, life: 0.5, hold: 0.12 });
    kit.light({ x, z, radius: 4.2, color: c, opacity: 0.65, life: 1.4 });
    kit.ring({ x, z, r0: 0.2, r1: 3.0, width: 0.18, life: 0.6, core: PARCH, glow: c, soft: 0.5, y: 0.05 });
    kit.ring({ x, z, r0: 0.3, r1: 1.6, width: 0.1, life: 0.9, core: c, glow: c, soft: 0.7, y: 0.05, delay: 0.12, opacity: 0.7 });
    spray('spark', x, 0.3, z, N(ev.rarity === 'legendary' ? 30 : 20), { color: c, speed: [0.05, 0.3], up: [2.2, 4.2], size: [0.05, 0.11], life: [0.9, 1.5], gravity: -0.1, drag: 0.9, jitter: 0.35, opacity: 0.95 });
    spray('smoke', x, 0.3, z, N(3), { color: c, speed: [0.2, 0.5], up: [0.2, 0.5], size: [0.5, 0.7], grow: 1.6, life: [0.9, 1.2], opacity: 0.25, gravity: -0.1, drag: 2.2, jitter: 0.3 });
    kit.mark({ x, z, radius: 1.4, kind: 'splash', stain: c, glow: c, life: 2.4, opacity: 0.3 });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.05, 0.12);
    // The relic's flight to the party: three trails along a shallow arc.
    after(0.32, () => {
      const p = player();
      if (!p) return;
      for (let i = 0; i < 3; i++) {
        const lift = 1.4 + i * 0.35;
        kit.streak({ a: { x, y: lift, z }, b: { x: (x + p.x) / 2, y: lift + 0.9, z: (z + p.z) / 2 }, width: 0.07, tailW: 0, core: PARCH, glow: c, life: 0.22, delay: i * 0.03, fall: 1.0 });
        kit.streak({ a: { x: (x + p.x) / 2, y: lift + 0.9, z: (z + p.z) / 2 }, b: { x: p.x, y: 1.0, z: p.z }, width: 0.07, tailW: 0, core: PARCH, glow: c, life: 0.22, delay: 0.1 + i * 0.03, fall: 1.0 });
      }
    });
  });

  // Spore Sac: a party kill's corpse puffs a low spore ring that slows what
  // it touches (pale spore green, soft and short — it fires on every kill).
  bus.on('relic_proc', (ev) => {
    if (ev.relic !== 'spore_sac') return;
    const { x, z } = ev;
    const r = ev.radius ?? 1.8;
    kit.ring({ x, z, r0: 0.2, r1: r, width: 0.32, life: 0.55, core: SPORE_R, glow: SPORE_R, soft: 0.9, y: 0.1, opacity: 0.5, gain: 0.5 });
    kit.ring({ x, z, r0: 0.1, r1: r * 0.9, width: 0.05, life: 0.4, core: PARCH, glow: SPORE_R, soft: 0.4, y: 0.05, opacity: 0.6 });
    for (let i = 0; i < N(5); i++) {
      const a = (i / 5) * TAU + rnd(-0.3, 0.3);
      spray('smoke', x, 0.25, z, 1, { color: SPORE_R, speed: r * 1.6, up: [0.05, 0.25], size: [0.3, 0.42], grow: 1.5, life: [0.7, 1.0], opacity: 0.3, gravity: -0.08, drag: 3.0, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 1 });
    }
    spray('spark', x, 0.2, z, N(ev.slowed > 0 ? 10 : 6), { color: SPORE_R, speed: [0.1, 0.5], up: [0.3, 0.9], size: [0.04, 0.07], life: [0.8, 1.3], gravity: -0.1, drag: 1.6, jitter: r * 0.6, opacity: 0.8 });
  });
  // A Rotcap smothered by Spore Sac: the cap sags shut, no burst.
  bus.on('hazard_smothered', (ev) => {
    const { x, z } = ev;
    spray('smoke', x, 0.35, z, N(2), { color: SPORE_R, speed: [0.05, 0.15], up: [0.1, 0.3], size: [0.25, 0.35], grow: 1.2, life: [0.6, 0.9], opacity: 0.25, gravity: 0.2, drag: 2.5, jitter: 0.15 });
    kit.ring({ x, z, r0: 0.9, r1: 0.15, width: 0.06, life: 0.3, core: SPORE_R, glow: SPORE_R, soft: 0.6, y: 0.05, opacity: 0.6 });
  });
  bus.on('relic_proc', (ev) => {
    const { x, z } = bodyAt(ev);
    if (ev.relic === 'last_light') {
      kit.flash({ x, y: 0.9, z, color: PARCH, size: 1.3, life: 0.45, hold: 0.15 });
      kit.ring({ x, z, r0: 1.6, r1: 0.4, width: 0.16, life: 0.5, core: PARCH, glow: PALETTE.hearthAmber, soft: 0.4, y: 0.08 });
      kit.light({ x, z, radius: 2.0, color: PALETTE.hearthAmber, opacity: 0.6, life: 0.6 });
    } else if (ev.relic === 'thorn_mail') {
      const from = SF.byId(ev.from);
      const ang = from ? Math.atan2(z - from.z, x - from.x) : rnd(0, TAU);
      for (const s of [-0.5, 0, 0.5]) {
        const a = ang + s;
        kit.streak({ a: { x: x - Math.cos(a) * 0.5, y: 0.5, z: z - Math.sin(a) * 0.5 }, b: { x: x + Math.cos(a) * 0.2, y: 0.55, z: z + Math.sin(a) * 0.2 }, width: 0.05, tailW: 0.05, core: PARCH, glow: PALETTE.signalBlue, life: 0.2, fall: 1.2 });
      }
    } else if (ev.relic === 'leech_fang' || ev.relic === 'hearthstone') {
      kit.ring({ x, z, r0: 0.2, r1: ev.relic === 'hearthstone' ? 2.6 : 0.9, width: 0.1, life: 0.5, core: PARCH, glow: HEAL, soft: 0.6, y: 0.06 });
      spray('spark', x, 0.3, z, ev.relic === 'hearthstone' ? 12 : 4, { color: HEAL, speed: [0.1, 0.4], up: [0.8, 1.6], size: [0.05, 0.09], life: [0.6, 1.0], gravity: -0.3, drag: 1.4, jitter: 0.6, opacity: 0.85 });
    } else if (ev.relic === 'heron_quill') {
      kit.ring({ x, z, r0: 0.3, r1: 1.6, width: 0.1, life: 0.45, core: PARCH, glow: PALETTE.signalBlue, soft: 0.5, y: 0.06 });
    }
  });
  // Batch 3 — the synergy relics. Each proc reads as its relic: the class
  // relics in that class's own hues, the rest in the relic's matter (coal,
  // sun, horn, lamp, coin), all short and light so a busy room stays legible.
  const RELIC3 = {
    tank: vfxClassStyle('tank'),
    swordsman: vfxClassStyle('swordsman'),
    archer: vfxClassStyle('archer'),
    healer: vfxClassStyle('healer'),
    tidecaller: vfxClassStyle('tidecaller'),
    bellwright: vfxClassStyle('bellwright'),
    duskwing: vfxClassStyle('duskwing'),
  };
  const GOLD = PALETTE.hearthAmber;
  bus.on('relic_proc', (ev) => {
    switch (ev.relic) {
      case 'wardens_oath': {
        // A Tank taunt pays: an amber tether runs from the taunted enemy to
        // the Tank, a heart-warm ring closes on the Tank, motes rise.
        mark('relic_wardens_oath');
        const st = RELIC3.tank;
        const { x, z } = bodyAt(ev);
        if (Number.isFinite(ev.fx)) kit.streak({ a: { x: ev.fx, y: 0.7, z: ev.fz }, b: { x, y: 0.9, z }, width: 0.06, tailW: 0.02, core: PARCH, glow: GOLD, life: 0.32, fall: 0.9 });
        kit.ring({ x, z, r0: 1.3, r1: 0.35, width: 0.12, life: 0.45, core: PARCH, glow: st.glow, soft: 0.5, y: 0.07 });
        kit.ring({ x, z, r0: 0.3, r1: 0.9, width: 0.06, life: 0.5, core: HEAL, glow: HEAL, soft: 0.6, y: 0.05, delay: 0.12, opacity: 0.7 });
        kit.light({ x, z, radius: 1.6, color: GOLD, opacity: 0.45, life: 0.5 });
        spray('spark', x, 0.4, z, N(6), { color: HEAL, speed: [0.1, 0.3], up: [0.9, 1.6], size: [0.05, 0.08], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.4, opacity: 0.85 });
        break;
      }
      case 'fox_ribbon': {
        // A Swordsman crit cuts again: a second, crossing crimson crescent a
        // beat after the first, with a ribbon of sparks along it.
        mark('relic_fox_ribbon');
        const st = RELIC3.swordsman;
        const { x, z } = bodyAt(ev);
        const ang = Math.atan2(ev.dz || 0.0001, ev.dx || 0.0001) + Math.PI / 2;
        kit.slash({ x, z, angle: ang, radius: 0.7, width: 0.16, span: 2.0, sweep: 0.05, life: 0.24, core: PARCH, glow: st.glow, soft: 0.12, lift: 0.18, y: 0.55, gain: 1.4, reverse: true });
        kit.slash({ x, z, angle: ang + 0.5, radius: 0.55, width: 0.07, span: 1.6, sweep: 0.06, life: 0.22, delay: 0.03, core: st.second, glow: st.glow, soft: 0.2, lift: 0.1, y: 0.5, gain: 1.0, opacity: 0.7 });
        SF.flare(x, 0.6, z, st.glow, 0.8, { kind: 'star', life: 0.16 });
        spray('spark', x, 0.55, z, N(7), { color: st.second, speed: [1.0, 2.2], up: [0.2, 0.8], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 0.8, drag: 1.8, jitter: 0.15, opacity: 0.95 });
        break;
      }
      case 'fletchers_knot': {
        // An Archer arrow glances off the exposed enemy: a jade streak arcs
        // to the next one, a knot flash where it turned, a pop where it lands.
        mark('relic_fletchers_knot');
        const st = RELIC3.archer;
        const { x, z } = bodyAt(ev);
        const fx = ev.fx ?? x;
        const fz = ev.fz ?? z;
        SF.flare(fx, 0.6, fz, st.glow, 0.7, { kind: 'burst', life: 0.14 });
        kit.streak({ a: { x: fx, y: 0.6, z: fz }, b: { x: (fx + x) / 2, y: 1.05, z: (fz + z) / 2 }, width: 0.06, tailW: 0, core: PARCH, glow: st.glow, life: 0.16, fall: 1.2 });
        kit.streak({ a: { x: (fx + x) / 2, y: 1.05, z: (fz + z) / 2 }, b: { x, y: 0.6, z }, width: 0.06, tailW: 0, core: PARCH, glow: st.glow, life: 0.16, delay: 0.06, fall: 1.2 });
        after(0.1, () => {
          SF.flare(x, 0.6, z, st.second, 0.9, { kind: 'star', life: 0.18 });
          kit.ring({ x, z, r0: 0.15, r1: 0.7, width: 0.06, life: 0.3, core: PARCH, glow: st.glow, soft: 0.4, y: 0.06 });
          spray('spark', x, 0.6, z, N(6), { color: st.second, speed: [0.6, 1.4], up: [0.3, 0.9], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 0.9, drag: 1.6, jitter: 0.1, opacity: 0.9 });
        });
        break;
      }
      case 'mercy_bell': {
        // The Healer's overheal rings into a shield: a bell-shaped dome of
        // light settles over the member with two chime rings.
        mark('relic_mercy_bell');
        const st = RELIC3.healer;
        const { x, z } = bodyAt(ev);
        kit.ring({ x, z, r0: 0.25, r1: 0.95, width: 0.07, life: 0.4, core: PARCH, glow: GOLD, soft: 0.5, y: 1.25 });
        kit.ring({ x, z, r0: 0.2, r1: 1.15, width: 0.05, life: 0.5, core: PARCH, glow: st.glow, soft: 0.6, y: 0.1, delay: 0.1, opacity: 0.8 });
        kit.pillar({ x, z, radius: 0.5, height: 1.6, color: GOLD, life: 0.45, opacity: 0.22 });
        spray('spark', x, 1.4, z, N(5), { color: GOLD, speed: [0.2, 0.5], up: [-0.6, -0.2], size: [0.04, 0.07], life: [0.5, 0.8], gravity: 0.4, drag: 1.6, jitter: 0.35, opacity: 0.85 });
        break;
      }
      case 'kindling_coal': {
        // A crit flares: a hot ember bloom, a cinder ring out to the flare's
        // reach, and a tongue of flame to every enemy it caught.
        mark('relic_kindling_coal');
        const { x, z } = ev;
        const r = ev.radius ?? 1.6;
        const hot = ev.ember ? PALETTE.hearthAmber : EMBER;
        SF.flare(x, 0.55, z, hot, ev.ember ? 1.3 : 1.0, { kind: 'burst', life: 0.2 });
        kit.ring({ x, z, r0: 0.2, r1: r, width: 0.14, life: 0.32, core: PARCH, glow: hot, soft: 0.45, y: 0.08, gain: 1.2 });
        kit.light({ x, z, radius: r + 0.6, color: hot, opacity: 0.5, life: 0.35 });
        for (const id of ev.hit ?? []) {
          const b = SF.byId(id);
          if (!b) continue;
          kit.streak({ a: { x, y: 0.5, z }, b: { x: b.x, y: 0.55, z: b.z }, width: 0.07, tailW: 0.02, core: PARCH, glow: hot, life: 0.16, fall: 1.3 });
          spray('spark', b.x, 0.5, b.z, N(4), { color: hot, speed: [0.3, 0.9], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.3, 0.55], gravity: 0.4, drag: 1.4, jitter: 0.15, opacity: 0.95 });
        }
        spray('spark', x, 0.4, z, N(ev.ember ? 12 : 8), { color: hot, speed: [0.8, 2.0], up: [0.6, 1.8], size: [0.03, 0.07], life: [0.3, 0.6], gravity: 0.7, drag: 1.2, jitter: 0.2, opacity: 0.95 });
        spray('smoke', x, 0.3, z, N(1), { color: CINDER, speed: [0.1, 0.2], up: [0.3, 0.6], size: [0.3, 0.45], grow: 1.4, life: [0.5, 0.8], opacity: 0.25, gravity: -0.2, drag: 2.4 });
        break;
      }
      case 'sun_chalice': {
        // A heal sears: a sun-gold beam drops from above onto the nearest
        // enemy, a burn ring and a scorch mark under it.
        mark('relic_sun_chalice');
        const { x, z } = bodyAt(ev);
        if (Number.isFinite(ev.fx)) kit.streak({ a: { x: ev.fx, y: 1.1, z: ev.fz }, b: { x, y: 2.6, z }, width: 0.04, tailW: 0, core: PARCH, glow: GOLD, life: 0.2, fall: 1.0, opacity: 0.6 });
        kit.pillar({ x, z, radius: 0.22, height: 3.2, color: PARCH, life: 0.32, opacity: 0.85, delay: 0.08 });
        kit.pillar({ x, z, radius: 0.5, height: 2.8, color: GOLD, life: 0.42, opacity: 0.35, delay: 0.08 });
        kit.ring({ x, z, r0: 0.15, r1: 0.9, width: 0.1, life: 0.35, core: PARCH, glow: GOLD, soft: 0.4, y: 0.06, delay: 0.1 });
        kit.light({ x, z, radius: 1.8, color: GOLD, opacity: 0.6, life: 0.45, delay: 0.08 });
        kit.mark({ x, z, radius: 0.6, kind: 'scorch', stain: INK, glow: GOLD, life: 1.6, opacity: 0.3 });
        after(0.1, () => spray('spark', x, 0.4, z, N(8), { color: GOLD, speed: [0.3, 1.0], up: [0.8, 1.8], size: [0.04, 0.08], life: [0.4, 0.7], gravity: 0.3, drag: 1.3, jitter: 0.2, opacity: 0.95 }));
        break;
      }
      case 'cinder_pact': {
        // A cursed room with the pact: the violet ring is answered by an
        // ember one burning outward from the party, and cinders spiral up.
        mark('relic_cinder_pact');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        kit.ring({ x, z, r0: 0.5, r1: 4.6, width: 0.2, life: 0.9, core: PARCH, glow: EMBER, soft: 0.5, y: 0.07, delay: 0.5 });
        kit.ring({ x, z, r0: 0.3, r1: 3.2, width: 0.08, life: 0.8, core: VIOLET_PEAK, glow: EMBER, soft: 0.6, y: 0.05, delay: 0.62, opacity: 0.75 });
        kit.light({ x, z, radius: 3.6, color: EMBER, opacity: 0.5, life: 0.9, delay: 0.5 });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          after(0.5 + i * 0.03, () => spray('spark', x + Math.cos(a) * 0.6, 0.2, z + Math.sin(a) * 0.6, N(2), { color: i % 2 ? EMBER : VIOLET, speed: [0.2, 0.5], up: [1.2, 2.4], size: [0.05, 0.09], life: [0.8, 1.2], gravity: -0.2, drag: 1.0, dir: { x: -Math.sin(a), z: Math.cos(a) }, dirBias: 0.7, opacity: 0.9 }));
        }
        break;
      }
      case 'bounty_writ': {
        // An elite's bounty: coins burst from the corpse and arc to the
        // party, one more for each affix it carried.
        mark('relic_bounty_writ');
        const { x, z } = ev;
        const n = 3 + (ev.affixes ?? 0);
        SF.flare(x, 0.8, z, GOLD, 1.0, { kind: 'burst', life: 0.2 });
        spray('spark', x, 0.6, z, N(6 + 3 * n), { color: GOLD, speed: [0.4, 1.2], up: [1.4, 2.6], size: [0.06, 0.1], life: [0.6, 0.9], gravity: 2.4, drag: 0.6, jitter: 0.2, opacity: 1 });
        const p = player();
        if (p) {
          for (let i = 0; i < Math.min(6, n); i++) {
            kit.streak({ a: { x, y: 0.9, z }, b: { x: (x + p.x) / 2, y: 1.8, z: (z + p.z) / 2 }, width: 0.05, tailW: 0, core: PARCH, glow: GOLD, life: 0.2, delay: 0.25 + i * 0.05, fall: 1.0 });
            kit.streak({ a: { x: (x + p.x) / 2, y: 1.8, z: (z + p.z) / 2 }, b: { x: p.x, y: 1.0, z: p.z }, width: 0.05, tailW: 0, core: PARCH, glow: GOLD, life: 0.2, delay: 0.33 + i * 0.05, fall: 1.0 });
          }
        }
        break;
      }
      case 'huntsmans_horn': {
        // The horn: on a Hunt or Purge room's first tick a long low wave
        // rolls out across the room; on the win, a bright amber burst.
        mark('relic_huntsmans_horn');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        if (ev.stage === 'won') {
          kit.flash({ x, y: 1.3, z, color: GOLD, size: 1.2, life: 0.45, hold: 0.1 });
          kit.ring({ x, z, r0: 0.3, r1: 3.0, width: 0.14, life: 0.6, core: PARCH, glow: GOLD, soft: 0.5, y: 0.06 });
          spray('spark', x, 0.6, z, N(14), { color: GOLD, speed: [0.3, 0.9], up: [1.6, 2.8], size: [0.05, 0.09], life: [0.8, 1.2], gravity: 1.2, drag: 0.8, jitter: 0.4, opacity: 1 });
        } else {
          for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.6, r1: 7 + i * 1.5, width: 0.16 - i * 0.03, life: 1.1, core: i ? GOLD : PARCH, glow: GOLD, soft: 0.6, y: 0.06, delay: i * 0.18, opacity: 0.8 - i * 0.2 });
          kit.light({ x, z, radius: 3.0, color: GOLD, opacity: 0.4, life: 0.8 });
          camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.03, 0.12);
        }
        break;
      }
      case 'pilgrims_lamp': {
        // The lamp lights the event room: a warm pool spreads from the
        // party, a lantern glow over each member, healing motes drift up.
        mark('relic_pilgrims_lamp');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        kit.light({ x, z, radius: 4.0, color: GOLD, opacity: 0.55, life: 1.4 });
        kit.ring({ x, z, r0: 0.4, r1: 3.6, width: 0.18, life: 1.0, core: PARCH, glow: GOLD, soft: 0.6, y: 0.06 });
        kit.flash({ x, y: 1.6, z, color: GOLD, size: 1.0, life: 0.6, hold: 0.2 });
        spray('spark', x, 0.3, z, N(16), { color: HEAL, speed: [0.1, 0.4], up: [0.6, 1.2], size: [0.05, 0.09], life: [1.2, 1.8], gravity: -0.15, drag: 1.6, jitter: 2.2, opacity: 0.85 });
        break;
      }
      // THE TIDECALLER (docs/TIDECALLER.md): her two class relics.
      case 'otters_pearl': {
        // A crash pays her back: a pearl-white bead streaks from the crashed
        // enemy to Rill, a cobalt ring closes on her, droplets rise.
        mark('relic_otters_pearl');
        const st = RELIC3.tidecaller;
        const { x, z } = bodyAt(ev);
        const from = ev.from !== undefined ? SF.byId(ev.from) : null;
        if (from) kit.streak({ a: { x: from.x, y: 0.6, z: from.z }, b: { x, y: 0.9, z }, width: 0.05, tailW: 0.01, core: PARCH, glow: st.second, life: 0.3, fall: 0.8 });
        kit.ring({ x, z, r0: 0.9, r1: 0.3, width: 0.08, life: 0.38, core: st.second, glow: st.glow, soft: 0.5, y: 0.07 });
        SF.flare(x, 0.9, z, st.second, 0.5, { kind: 'star', life: 0.16 });
        spray('spark', x, 0.4, z, N(5), { color: st.second, speed: [0.1, 0.3], up: [0.8, 1.4], size: [0.04, 0.07], life: [0.5, 0.8], gravity: -0.2, drag: 1.5, jitter: 0.3, opacity: 0.85 });
        break;
      }
      case 'millrace_charm': {
        // The soak spreads: a thin cobalt rivulet arcs to the next enemy and
        // splashes a foam ring round it.
        mark('relic_millrace_charm');
        const st = RELIC3.tidecaller;
        const { x, z } = bodyAt(ev);
        const fx = ev.fx ?? x;
        const fz = ev.fz ?? z;
        kit.streak({ a: { x: fx, y: 0.5, z: fz }, b: { x: (fx + x) / 2, y: 0.85, z: (fz + z) / 2 }, width: 0.05, tailW: 0, core: st.second, glow: st.glow, life: 0.18, fall: 1.0 });
        kit.streak({ a: { x: (fx + x) / 2, y: 0.85, z: (fz + z) / 2 }, b: { x, y: 0.45, z }, width: 0.05, tailW: 0, core: st.second, glow: st.glow, life: 0.18, delay: 0.07, fall: 1.0 });
        after(0.12, () => {
          kit.ring({ x, z, r0: 0.15, r1: 0.75, width: 0.07, life: 0.34, core: st.second, glow: st.glow, soft: 0.45, y: 0.06 });
          spray('spark', x, 0.5, z, N(6), { color: st.second, speed: [0.5, 1.2], up: [0.6, 1.3], size: [0.03, 0.06], life: [0.3, 0.5], gravity: 2.2, drag: 1.2, jitter: 0.15, opacity: 0.9 });
        });
        break;
      }
      // THE BELLWRIGHT (docs/BELLWRIGHT.md "Tolly in the world"): her two
      // class relics.
      case 'bell_rope': {
        // The rope pays her back: a thin brass column drops onto Tolly, then
        // one verdigris ring closes on her for every bell the Peal rang, a
        // beat apart like a peal, and warm motes rise off her shell.
        mark('relic_bell_rope');
        const st = RELIC3.bellwright;
        const { x, z } = bodyAt(ev);
        const n = Math.max(1, Math.min(4, ev.bells ?? 1));
        kit.pillar({ x, z, radius: 0.22, height: 2.6, color: st.glow, life: 0.42, opacity: 0.5 });
        SF.flare(x, 1.25, z, st.glow, 0.6, { kind: 'star', life: 0.18 });
        for (let i = 0; i < n; i++) {
          after(0.09 * i, () => {
            kit.ring({ x, z, r0: 0.95 - i * 0.08, r1: 0.25, width: 0.07, life: 0.34, core: st.glow, glow: st.second, soft: 0.5, y: 0.07 + i * 0.01 });
          });
        }
        kit.light({ x, z, radius: 1.4, color: st.glow, opacity: 0.35, life: 0.4 });
        spray('spark', x, 0.45, z, N(4 + 2 * n), { color: st.glow, speed: [0.1, 0.35], up: [0.7, 1.3], size: [0.04, 0.07], life: [0.6, 0.9], gravity: -0.25, drag: 1.5, jitter: 0.35, opacity: 0.85 });
        break;
      }
      // THE DUSKWING (docs/DUSKWING.md "Sable in the world"): his two class
      // relics.
      case 'ripe_fig': {
        // The fig splits over him: a rose burst at his chest, one pale ring
        // closing on him per enemy the dive struck, a beat apart, and juice
        // drops falling off his ruff in his rose.
        mark('relic_ripe_fig');
        const st = RELIC3.duskwing;
        const { x, z } = bodyAt(ev);
        const n = Math.max(1, Math.min(4, ev.struck ?? 1));
        SF.flare(x, 0.75, z, st.glow, 0.7, { kind: 'burst', life: 0.2 });
        for (let i = 0; i < n; i++) {
          after(0.07 * i, () => {
            kit.ring({ x, z, r0: 0.9 - i * 0.08, r1: 0.22, width: 0.07, life: 0.32, core: st.second, glow: st.glow, soft: 0.5, y: 0.07 + i * 0.01 });
          });
        }
        kit.light({ x, z, radius: 1.3, color: st.glow, opacity: 0.35, life: 0.38 });
        spray('spark', x, 0.8, z, N(4 + 2 * n), { color: st.glow, speed: [0.3, 0.9], up: [0.2, 0.8], size: [0.04, 0.07], life: [0.45, 0.7], gravity: 2.2, drag: 1.0, jitter: 0.25, opacity: 0.9 });
        spray('spark', x, 0.5, z, N(4), { color: st.second, speed: [0.1, 0.3], up: [0.6, 1.1], size: [0.03, 0.05], life: [0.5, 0.8], gravity: -0.3, drag: 1.5, jitter: 0.3, opacity: 0.8 });
        break;
      }
      case 'moonless_fang': {
        // A second bite out of the dark: two pale crescents cross over the
        // blinded enemy, a rose flash where they meet, and a puff of ink.
        mark('relic_moonless_fang');
        const st = RELIC3.duskwing;
        const { x, z } = ev;
        const s = 0.42;
        kit.streak({ a: { x: x - s, y: 1.0, z: z - s }, b: { x: x + s, y: 0.35, z: z + s }, width: 0.07, tailW: 0.012, core: PARCH, glow: st.glow, life: 0.14, fall: 1.4 });
        after(0.05, () => kit.streak({ a: { x: x + s, y: 1.0, z: z - s }, b: { x: x - s, y: 0.35, z: z + s }, width: 0.07, tailW: 0.012, core: PARCH, glow: st.glow, life: 0.14, fall: 1.4 }));
        SF.flare(x, 0.65, z, st.glow, 0.55, { kind: 'star', life: 0.14, delay: 0.05 });
        kit.ring({ x, z, r0: 0.15, r1: 0.7, width: 0.06, life: 0.24, core: st.second, glow: st.glow, soft: 0.5, y: 0.08 });
        spray('spark', x, 0.6, z, N(6), { color: st.second, speed: [0.5, 1.3], up: [0.3, 1.0], size: [0.03, 0.06], life: [0.25, 0.45], gravity: 1.6, drag: 1.2, jitter: 0.15, opacity: 0.95 });
        spray('spark', x, 0.5, z, N(5), { color: st.debris, speed: [0.1, 0.4], up: [0.2, 0.6], size: [0.06, 0.1], life: [0.5, 0.8], gravity: -0.15, drag: 1.8, jitter: 0.3, opacity: 0.6 });
        break;
      }
      case 'verdigris_clapper': {
        // The bell rings again in green: a struck flash at its mouth, a
        // double verdigris shock ring out to its rim, a crack of green light
        // to every enemy it caught and green-bronze chips off each.
        mark('relic_verdigris_clapper');
        const st = RELIC3.bellwright;
        const { x, z } = ev;
        const r = ev.radius ?? 1.3;
        SF.flare(x, 1.0, z, st.second, 1.0, { kind: 'burst', life: 0.18 });
        kit.ring({ x, z, r0: 0.2, r1: r, width: 0.12, life: 0.3, core: PARCH, glow: st.second, soft: 0.45, y: 0.08, gain: 1.15 });
        after(0.08, () => kit.ring({ x, z, r0: 0.15, r1: r * 0.8, width: 0.06, life: 0.3, core: st.second, glow: st.glow, soft: 0.5, y: 0.09 }));
        kit.light({ x, z, radius: r + 0.5, color: st.second, opacity: 0.45, life: 0.32 });
        for (const id of ev.hit ?? []) {
          const b = SF.byId(id);
          if (!b) continue;
          kit.streak({ a: { x, y: 0.9, z }, b: { x: b.x, y: 0.55, z: b.z }, width: 0.06, tailW: 0.015, core: PARCH, glow: st.second, life: 0.15, fall: 1.2 });
          SF.flare(b.x, 0.6, b.z, st.glow, 0.45, { kind: 'star', life: 0.12 });
          spray('spark', b.x, 0.5, b.z, N(4), { color: st.second, speed: [0.4, 1.0], up: [0.5, 1.2], size: [0.03, 0.06], life: [0.3, 0.5], gravity: 1.6, drag: 1.2, jitter: 0.15, opacity: 0.95 });
        }
        spray('spark', x, 0.9, z, N(8), { color: st.glow, speed: [0.8, 1.8], up: [0.3, 1.2], size: [0.03, 0.06], life: [0.3, 0.55], gravity: 1.4, drag: 1.2, jitter: 0.2, opacity: 0.9 });
        break;
      }
      // Batch 4 (docs/RELICS.md "Batch 4"): the relics of the new rooms.
      case 'shepherds_crook': {
        mark('relic_shepherds_crook');
        const { x, z } = bodyAt(ev);
        if (ev.stage === 'home') {
          // Home safe: a warm column over the pilgrim, coins arc to the party.
          kit.pillar({ x, z, radius: 0.5, height: 3.0, color: GOLD, life: 0.9, opacity: 0.55 });
          kit.ring({ x, z, r0: 0.3, r1: 2.6, width: 0.14, life: 0.7, core: PARCH, glow: GOLD, soft: 0.5, y: 0.06 });
          spray('spark', x, 0.6, z, N(12), { color: PALETTE.paleGold, speed: [0.3, 0.9], up: [1.4, 2.6], size: [0.05, 0.09], life: [0.7, 1.1], gravity: 2.2, drag: 0.6, jitter: 0.3, opacity: 1 });
        } else {
          // The crook's blessing: a shepherd-green hoop settles on the pilgrim.
          kit.ring({ x, z, r0: 1.4, r1: 0.5, width: 0.1, life: 0.6, core: PARCH, glow: HEAL, soft: 0.5, y: 0.08 });
          kit.flash({ x, y: 1.0, z, color: HEAL, size: 0.8, life: 0.4, hold: 0.1 });
          spray('spark', x, 0.3, z, N(10), { color: HEAL, speed: [0.1, 0.3], up: [0.8, 1.4], size: [0.04, 0.07], life: [0.8, 1.2], gravity: -0.2, drag: 1.5, jitter: 0.5, opacity: 0.85 });
        }
        break;
      }
      case 'vigil_candle': {
        // A candle-flame ward: a tall pale flame over the party, a wide
        // amber ring that settles round it and holds a moment.
        mark('relic_vigil_candle');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        kit.light({ x, z, radius: 3.2, color: GOLD, opacity: 0.5, life: 1.4 });
        kit.ring({ x, z, r0: 3.4, r1: 2.2, width: 0.16, life: 1.2, core: PARCH, glow: GOLD, soft: 0.6, y: 0.06 });
        kit.pillar({ x, z, radius: 0.18, height: 2.4, color: PARCH, life: 0.8, opacity: 0.7 });
        SF.flare(x, 2.2, z, GOLD, 0.9, { kind: 'star', life: 0.4 });
        spray('spark', x, 1.8, z, N(8), { color: GOLD, speed: [0.05, 0.2], up: [0.3, 0.7], size: [0.04, 0.06], life: [1.0, 1.5], gravity: -0.1, drag: 1.8, jitter: 0.25, opacity: 0.9 });
        break;
      }
      case 'warding_chalk': {
        mark('relic_warding_chalk');
        const x = ev.x ?? 0;
        const z = ev.z ?? 0;
        const r = ev.radius ?? 2.6;
        if (ev.stage === 'drawn') {
          // The chalk line is drawn: a white ring traced round the sigil,
          // dust kicked up along it.
          kit.ring({ x, z, r0: r, r1: r + 0.05, width: 0.12, life: 1.2, core: PARCH, glow: BONE, soft: 0.3, y: 0.05, opacity: 0.9 });
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            after(i * 0.05, () => spray('smoke', x + Math.cos(a) * r, 0.1, z + Math.sin(a) * r, 1, { color: BONE, speed: [0.05, 0.15], up: [0.1, 0.3], size: [0.2, 0.3], grow: 1.3, life: [0.6, 0.9], opacity: 0.3, gravity: -0.05, drag: 2.5 }));
          }
        } else {
          // Once a second: a soft green pulse rises inside the ring.
          kit.ring({ x, z, r0: 0.3, r1: r * 0.95, width: 0.06, life: 0.5, core: HEAL, glow: HEAL, soft: 0.6, y: 0.05, opacity: 0.45 });
          for (const id of ev.healed ?? []) {
            const b = SF.byId(id);
            if (b) spray('spark', b.x, 0.3, b.z, N(3), { color: HEAL, speed: [0.05, 0.2], up: [0.6, 1.0], size: [0.04, 0.06], life: [0.5, 0.8], gravity: -0.2, drag: 1.5, jitter: 0.25, opacity: 0.8 });
          }
        }
        break;
      }
      case 'champions_laurel': {
        // The laurel crowns the win: a gold wreath ring rises off the party
        // and a shower of leaves and coins falls through it.
        mark('relic_champions_laurel');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        kit.ring({ x, z, r0: 1.0, r1: 1.4, width: 0.16, life: 0.9, core: PARCH, glow: GOLD, soft: 0.4, y: 2.0 });
        kit.flash({ x, y: 2.0, z, color: GOLD, size: 1.3, life: 0.5, hold: 0.15 });
        spray('spark', x, 2.4, z, N(16), { color: GOLD, speed: [0.2, 0.7], up: [0.2, 0.8], size: [0.05, 0.09], life: [0.9, 1.3], gravity: 1.6, drag: 0.8, jitter: 0.8, opacity: 1 });
        spray('spark', x, 2.4, z, N(8), { color: PALETTE.sageCloak, speed: [0.1, 0.4], up: [0.1, 0.4], size: [0.06, 0.1], life: [1.0, 1.5], gravity: 0.8, drag: 1.4, jitter: 0.9, opacity: 0.9 });
        break;
      }
      case 'jailers_ring': {
        // The key rings home: iron sparks snap round the picker, a cool
        // keyed chime-ring, then a heal wash over the party.
        mark('relic_jailers_ring');
        const by = ev.by != null ? SF.byId(ev.by) : null;
        const x = by ? by.x : ev.x ?? 0;
        const z = by ? by.z : ev.z ?? 0;
        kit.ring({ x, z, r0: 0.4, r1: 1.6, width: 0.1, life: 0.45, core: PARCH, glow: PALETTE.signalBlue, soft: 0.4, y: 0.08 });
        SF.flare(x, 1.0, z, PALETTE.paleGold, 0.8, { kind: 'star', life: 0.25 });
        spray('spark', x, 0.8, z, N(10), { color: PALETTE.paleGold, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.03, 0.06], life: [0.3, 0.5], gravity: 2.4, drag: 0.8, jitter: 0.2, opacity: 1 });
        if (ev.healed) after(0.15, () => kit.ring({ x, z, r0: 0.3, r1: 3.2, width: 0.14, life: 0.7, core: PARCH, glow: HEAL, soft: 0.6, y: 0.06 }));
        break;
      }
      case 'vault_ledger': {
        // The ledger counts twice: the pile's coins jump a second time.
        mark('relic_vault_ledger');
        const x = ev.x ?? 0;
        const z = ev.z ?? 0;
        after(0.18, () => {
          SF.flare(x, 0.7, z, PALETTE.paleGold, 0.8, { kind: 'burst', life: 0.2 });
          spray('spark', x, 0.5, z, N(14), { color: PALETTE.paleGold, speed: [0.3, 1.0], up: [1.6, 2.8], size: [0.06, 0.1], life: [0.6, 0.9], gravity: 2.6, drag: 0.6, jitter: 0.3, opacity: 1 });
          kit.ring({ x, z, r0: 0.2, r1: 1.2, width: 0.08, life: 0.35, core: PARCH, glow: GOLD, soft: 0.4, y: 0.05 });
        });
        break;
      }
      case 'banner_pennant': {
        // Victory pennant: a tall amber banner-light over the party, a
        // rippling heal ring.
        mark('relic_banner_pennant');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        kit.pillar({ x, z, radius: 0.3, height: 3.4, color: GOLD, life: 0.8, opacity: 0.6 });
        for (let i = 0; i < 2; i++) kit.ring({ x, z, r0: 0.4, r1: 3.6, width: 0.16 - i * 0.05, life: 0.8, core: PARCH, glow: HEAL, soft: 0.6, y: 0.06, delay: i * 0.16 });
        spray('spark', x, 3.0, z, N(10), { color: GOLD, speed: [0.3, 0.8], up: [0.1, 0.5], size: [0.05, 0.08], life: [0.8, 1.2], gravity: 1.4, drag: 0.8, jitter: 0.5, opacity: 1 });
        break;
      }
      case 'wanderers_token': {
        // The token flips: a spinning coin glint over the party.
        mark('relic_wanderers_token');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        SF.flare(x, 1.9, z, PALETTE.paleGold, 0.9, { kind: 'star', life: 0.35, spin: 6 });
        kit.ring({ x, z, r0: 0.3, r1: 1.8, width: 0.1, life: 0.5, core: PARCH, glow: PALETTE.paleGold, soft: 0.4, y: 0.06 });
        spray('spark', x, 1.6, z, N(8), { color: PALETTE.paleGold, speed: [0.3, 0.8], up: [0.8, 1.6], size: [0.05, 0.08], life: [0.5, 0.8], gravity: 2.4, drag: 0.6, jitter: 0.2, opacity: 1 });
        break;
      }
      case 'geode_heart': {
        // The curse crystallises: violet shards burst outward and turn
        // amber as they fall.
        mark('relic_geode_heart');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        kit.flash({ x, y: 1.2, z, color: VIOLET, size: 1.2, life: 0.4, hold: 0.1 });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + 0.5;
          kit.streak({ a: { x, y: 1.0, z }, b: { x: x + Math.cos(a) * 1.8, y: 1.6, z: z + Math.sin(a) * 1.8 }, width: 0.07, tailW: 0, core: VIOLET_PEAK, glow: VIOLET, life: 0.3, delay: i * 0.03, fall: 1.0 });
        }
        after(0.3, () => {
          kit.flash({ x, y: 1.4, z, color: GOLD, size: 1.0, life: 0.45, hold: 0.1 });
          spray('spark', x, 1.4, z, N(14), { color: GOLD, speed: [0.4, 1.2], up: [0.6, 1.6], size: [0.05, 0.09], life: [0.7, 1.0], gravity: 2.0, drag: 0.7, jitter: 0.3, opacity: 1 });
        });
        break;
      }
      default:
        break;
    }
  });
  // Batch 5 (docs/RELICS.md "Batch 5"): the relics of content plan 4. Each
  // reads as its matter: brewed green and tonic hues for the satchel and the
  // flask, fuse orange for the second burst, votive gold and silk for the
  // shrine ribbon, storm cyan down the gust lane, trophy bone and gold for
  // the cord, a branded ember-gold oath, and the tenor bell's brass and
  // verdigris rolling across the whole room.
  const TONIC5 = TONIC_COLORS;
  const STORM = PALETTE.signalBlue;
  bus.on('relic_proc', (ev) => {
    switch (ev.relic) {
      case 'brewers_satchel': {
        // The brew is shared: a green bubble pops off the drinker, then a
        // droplet arcs to every other hero and splashes a heal ring there.
        mark('relic_brewers_satchel');
        const { x, z } = bodyAt(ev);
        const c = (TONIC5[ev.item] ?? TONIC5.mend_tonic).glow;
        SF.flare(x, 1.3, z, c, 0.9, { kind: 'burst', life: 0.22 });
        kit.ring({ x, z, r0: 0.2, r1: 1.1, width: 0.08, life: 0.35, core: PARCH, glow: c, soft: 0.5, y: 0.07 });
        (ev.healed ?? []).forEach((id, i) => {
          const b = SF.byId(id);
          if (!b) return;
          const mx = (x + b.x) / 2;
          const mz = (z + b.z) / 2;
          kit.streak({ a: { x, y: 1.3, z }, b: { x: mx, y: 2.3, z: mz }, width: 0.08, tailW: 0, core: PARCH, glow: c, life: 0.2, delay: 0.04 * i, fall: 1.0 });
          kit.streak({ a: { x: mx, y: 2.3, z: mz }, b: { x: b.x, y: 0.9, z: b.z }, width: 0.08, tailW: 0, core: PARCH, glow: HEAL, life: 0.2, delay: 0.12 + 0.04 * i, fall: 1.0 });
          after(0.3 + 0.04 * i, () => {
            const t = SF.byId(id) ?? b;
            kit.ring({ x: t.x, z: t.z, r0: 0.2, r1: 0.9, width: 0.08, life: 0.4, core: PARCH, glow: HEAL, soft: 0.6, y: 0.06 });
            spray('spark', t.x, 0.5, t.z, N(5), { color: HEAL, speed: [0.1, 0.4], up: [0.8, 1.4], size: [0.04, 0.07], life: [0.5, 0.8], gravity: -0.2, drag: 1.5, jitter: 0.3, opacity: 0.9 });
          });
        });
        break;
      }
      case 'bottomless_flask': {
        const { x, z } = bodyAt(ev);
        const c = (TONIC5[ev.item] ?? TONIC5.mend_tonic).glow;
        if (ev.stage === 'pour') {
          // The flask keeps pouring: a slow spiral of the item's colour
          // rises off the hero and hangs, a promise of the refill.
          mark('relic_bottomless_flask');
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            after(i * 0.05, () => spray('spark', x + Math.cos(a) * 0.45, 0.4, z + Math.sin(a) * 0.45, N(2), { color: c, speed: [0.05, 0.15], up: [0.9, 1.4], size: [0.05, 0.08], life: [0.8, 1.2], gravity: -0.15, drag: 1.4, dir: { x: -Math.sin(a), z: Math.cos(a) }, dirBias: 0.6, opacity: 0.9 }));
          }
          kit.ring({ x, z, r0: 0.9, r1: 0.4, width: 0.05, life: 0.6, core: c, glow: c, soft: 0.6, y: 0.06, opacity: 0.6 });
        } else {
          // Refilled: a column of the item's colour drops into the hero, a
          // tight ring snaps shut and a bright cork-pop flash.
          mark('relic_bottomless_flask_refill');
          kit.pillar({ x, z, radius: 0.25, height: 2.6, color: c, life: 0.5, opacity: 0.6 });
          kit.ring({ x, z, r0: 1.3, r1: 0.25, width: 0.1, life: 0.35, core: PARCH, glow: c, soft: 0.4, y: 0.08 });
          kit.flash({ x, y: 1.1, z, color: c, size: 0.9, life: 0.35, hold: 0.08, delay: 0.25 });
          after(0.25, () => spray('spark', x, 1.1, z, N(10), { color: c, speed: [0.5, 1.2], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.4, 0.7], gravity: 1.8, drag: 0.9, jitter: 0.15, opacity: 1 }));
        }
        break;
      }
      case 'twin_fuse': {
        const x = ev.x ?? 0;
        const z = ev.z ?? 0;
        const r = ev.radius ?? 2.4;
        const c = (TONIC5[ev.item] ?? TONIC5.fire_bomb).glow;
        if (ev.stage === 'lit') {
          // A second fuse fizzes in the crater: a sputtering orange spark
          // runs round the rim while a thin ring closes on the centre.
          mark('relic_twin_fuse');
          const live = 0.6;
          kit.ring({ x, z, r0: r, r1: 0.3, width: 0.06, life: live, core: EMBER, glow: c, soft: 0.4, y: 0.06, opacity: 0.85 });
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU;
            after(i * (live / 8), () => spray('spark', x + Math.cos(a) * r * (1 - i / 9), 0.2, z + Math.sin(a) * r * (1 - i / 9), N(3), { color: i % 2 ? EMBER : c, speed: [0.3, 0.8], up: [0.8, 1.6], size: [0.03, 0.05], life: [0.25, 0.45], gravity: 1.2, drag: 0.8, jitter: 0.1, opacity: 1 }));
          }
          kit.light({ x, z, radius: 1.4, color: EMBER, opacity: 0.35, life: live });
        } else {
          // The echo: a sharper, hotter blast than the first, a double shock
          // ring and a short kick.
          mark('relic_twin_fuse_burst');
          SF.flare(x, 0.8, z, c, 1.6, { kind: 'burst', life: 0.22 });
          kit.flash({ x, y: 0.9, z, color: c, size: 1.4, life: 0.3, hold: 0.06 });
          kit.ring({ x, z, r0: 0.3, r1: r, width: 0.2, life: 0.35, core: PARCH, glow: c, soft: 0.45, y: 0.07, gain: 1.2 });
          after(0.06, () => kit.ring({ x, z, r0: 0.2, r1: r * 0.75, width: 0.08, life: 0.3, core: c, glow: EMBER, soft: 0.5, y: 0.08 }));
          kit.light({ x, z, radius: r + 1, color: c, opacity: 0.6, life: 0.4 });
          spray('spark', x, 0.4, z, N(18), { color: c, speed: [1.2, 2.6], up: [0.6, 1.8], size: [0.03, 0.07], life: [0.3, 0.6], gravity: 2.0, drag: 1.0, jitter: 0.2, opacity: 1 });
          spray('smoke', x, 0.3, z, N(4), { color: PALETTE.warmGrey, speed: [0.4, 0.9], up: [0.3, 0.6], size: [0.5, 0.8], grow: 1.6, life: [0.7, 1.0], opacity: 0.3, gravity: -0.1, drag: 2.0, jitter: 0.5 });
          kit.mark({ x, z, radius: r * 0.7, kind: 'scorch', stain: PALETTE.voidCharcoal, glow: EMBER, life: 2.0, opacity: 0.3 });
          camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.05, 0.1);
        }
        break;
      }
      case 'votive_ribbon': {
        // The ribbon is tied: two gold silk streams spiral up from the
        // shrine, then a warm heal wash rolls out over the party.
        mark('relic_votive_ribbon');
        const x = ev.x ?? 0;
        const z = ev.z ?? 0;
        for (let k = 0; k < 2; k++) {
          for (let i = 0; i < 6; i++) {
            const a0 = (i / 6) * TAU + k * Math.PI;
            const a1 = a0 + TAU / 6;
            const y0 = 0.3 + i * 0.35;
            kit.streak({ a: { x: x + Math.cos(a0) * 0.6, y: y0, z: z + Math.sin(a0) * 0.6 }, b: { x: x + Math.cos(a1) * 0.6, y: y0 + 0.35, z: z + Math.sin(a1) * 0.6 }, width: 0.06, tailW: 0.02, core: PARCH, glow: PALETTE.paleGold, life: 0.5, delay: i * 0.05, fall: 0.6 });
          }
        }
        SF.flare(x, 2.6, z, PALETTE.paleGold, 1.0, { kind: 'star', life: 0.35, delay: 0.3 });
        kit.light({ x, z, radius: 3.0, color: GOLD, opacity: 0.5, life: 1.0 });
        const p = player();
        const px = p ? p.x : x;
        const pz = p ? p.z : z;
        after(0.35, () => {
          kit.ring({ x: px, z: pz, r0: 0.4, r1: 3.4, width: 0.16, life: 0.7, core: PARCH, glow: HEAL, soft: 0.6, y: 0.06 });
          spray('spark', px, 0.4, pz, N(12), { color: HEAL, speed: [0.1, 0.4], up: [0.8, 1.5], size: [0.04, 0.08], life: [0.7, 1.1], gravity: -0.25, drag: 1.4, jitter: 1.6, opacity: 0.9 });
        });
        break;
      }
      case 'stormglass': {
        // The gust turns blue: lightning-white wind streaks race down the
        // lane, every enemy caught in it flashes with a crackle of sparks.
        const L = ev.lane;
        if (!L) break;
        const len = Math.hypot(L.x1 - L.x0, L.z1 - L.z0) || 1;
        const dx = (L.x1 - L.x0) / len;
        const dz = (L.z1 - L.z0) / len;
        const nx = -dz;
        const nz = dx;
        if (ev.stage === 'gather') {
          // The glass draws its own gust (a room with no vent): the lane's
          // two edges trace out in pale blue on the floor, wind wisps race
          // back up it into the carrier, and the glass glows as it fills.
          mark('relic_stormglass_gather');
          const live = Math.max(0.3, ((ev.resolveTick ?? 0) - (ev.tick ?? 0)) / 60 || 0.66);
          const half = (L.w ?? 1.6) / 2;
          for (const sgn of [-1, 1]) {
            const ax = L.x0 + nx * half * sgn;
            const az = L.z0 + nz * half * sgn;
            kit.streak({ a: { x: ax, y: 0.05, z: az }, b: { x: ax + dx * len, y: 0.05, z: az + dz * len }, width: 0.05, tailW: 0.05, core: PARCH, glow: STORM, life: live, delay: 0, fall: 0 });
          }
          for (let i = 0; i < 6; i++) {
            const off = ((i % 3) / 2 - 0.5) * half;
            const t0 = 1 - i / 7;
            const ax = L.x0 + dx * len * t0 + nx * off;
            const az = L.z0 + dz * len * t0 + nz * off;
            kit.streak({ a: { x: ax, y: 0.5 + (i % 2) * 0.35, z: az }, b: { x: L.x0 + nx * off * 0.3, y: 0.9, z: L.z0 + nz * off * 0.3 }, width: 0.035, tailW: 0, core: PARCH, glow: STORM, life: 0.3, delay: (i / 6) * live * 0.8, fall: 0.6 });
          }
          after(live * 0.5, () => SF.flare(L.x0, 1.1, L.z0, STORM, 0.7, { kind: 'star', life: live * 0.5, spin: 6 }));
          kit.light({ x: L.x0, z: L.z0, radius: 1.6, color: STORM, opacity: 0.3, life: live });
          break;
        }
        mark('relic_stormglass');
        for (let i = 0; i < 5; i++) {
          const off = ((i / 4) - 0.5) * (L.w ?? 1.6) * 0.8;
          const ax = L.x0 + nx * off;
          const az = L.z0 + nz * off;
          kit.streak({ a: { x: ax, y: 0.4 + (i % 2) * 0.3, z: az }, b: { x: ax + dx * len, y: 0.5 + (i % 2) * 0.3, z: az + dz * len }, width: 0.06, tailW: 0.0, core: PARCH, glow: STORM, life: 0.28, delay: i * 0.035, fall: 0.8 });
        }
        kit.light({ x: (L.x0 + L.x1) / 2, z: (L.z0 + L.z1) / 2, radius: len / 2 + 1, color: STORM, opacity: 0.45, life: 0.5 });
        for (const id of ev.hit ?? []) {
          const b = SF.byId(id);
          if (!b) continue;
          kit.flash({ x: b.x, y: 0.8, z: b.z, color: STORM, size: 0.8, life: 0.22, hold: 0.04 });
          for (let j = 0; j < 3; j++) {
            const a = rnd(0, TAU);
            kit.streak({ a: { x: b.x, y: 1.6, z: b.z }, b: { x: b.x + Math.cos(a) * 0.5, y: 0.6, z: b.z + Math.sin(a) * 0.5 }, width: 0.04, tailW: 0.01, core: PARCH, glow: STORM, life: 0.12, delay: 0.03 * j, fall: 1.4 });
          }
          spray('spark', b.x, 0.7, b.z, N(6), { color: STORM, speed: [0.6, 1.4], up: [0.3, 1.0], size: [0.03, 0.05], life: [0.2, 0.4], gravity: 1.0, drag: 1.0, dir: { x: dx, z: dz }, dirBias: 0.7, opacity: 1 });
        }
        break;
      }
      case 'founders_ingot': {
        // THE EMBER KILN (content plan 5 slice 9): the ingot takes another
        // room's heat. A Kiln Gold bar-glow flares at the hero's belt, heat
        // shimmers up off it, and the hotter it runs the more sparks it
        // throws (heat 1 to 5). Kiln Gold, never Ember.
        mark('relic_founders_ingot');
        const p = player();
        if (!p) break;
        const h = Math.max(1, Math.min(5, ev.heat ?? 1));
        const gold = VFX_MATTER.kilngold;
        const white = VFX_MATTER.kilnheat;
        SF.flare(p.x, 0.9, p.z, gold, 0.6 + 0.15 * h, { kind: 'burst', life: 0.3, core: white });
        kit.ring({ x: p.x, z: p.z, r0: 0.3, r1: 0.9 + 0.2 * h, width: 0.08, life: 0.45, core: white, glow: gold, soft: 0.5, y: 0.08 });
        spray('spark', p.x, 0.9, p.z, N(4 + 3 * h), { color: gold, speed: [0.3, 1.0], up: [1.0, 2.2], size: [0.03, 0.06], life: [0.5, 0.9], gravity: -0.4, drag: 1.2, jitter: 0.25, opacity: 1 });
        spray('smoke', p.x, 1.1, p.z, N(2), { color: white, speed: [0.05, 0.2], up: [0.6, 1.0], size: [0.25, 0.4], grow: 1.6, life: [0.6, 0.9], opacity: 0.12, drag: 2.0, jitter: 0.2 });
        break;
      }
      case 'trophy_cord': {
        // A trophy knotted on: a bone-gold token rises off the fallen
        // champion and arcs to the party, which flares gold for a beat.
        mark('relic_trophy_cord');
        const x = ev.x ?? 0;
        const z = ev.z ?? 0;
        const p = player();
        SF.flare(x, 1.6, z, GOLD, 1.2, { kind: 'star', life: 0.4, spin: 4 });
        kit.ring({ x, z, r0: 0.3, r1: 1.8, width: 0.12, life: 0.5, core: PARCH, glow: BONE, soft: 0.45, y: 0.06 });
        if (p) {
          kit.streak({ a: { x, y: 1.6, z }, b: { x: (x + p.x) / 2, y: 2.8, z: (z + p.z) / 2 }, width: 0.08, tailW: 0, core: PARCH, glow: GOLD, life: 0.3, delay: 0.2, fall: 1.0 });
          kit.streak({ a: { x: (x + p.x) / 2, y: 2.8, z: (z + p.z) / 2 }, b: { x: p.x, y: 1.2, z: p.z }, width: 0.08, tailW: 0, core: PARCH, glow: GOLD, life: 0.3, delay: 0.38, fall: 1.0 });
          after(0.6, () => {
            const q = player() ?? p;
            const n = Math.max(1, Math.min(5, ev.trophies ?? 1));
            for (let i = 0; i < n; i++) kit.ring({ x: q.x, z: q.z, r0: 0.5 + i * 0.15, r1: 0.9 + i * 0.25, width: 0.06, life: 0.5, core: GOLD, glow: GOLD, soft: 0.4, y: 1.9 - i * 0.18, delay: i * 0.06 });
            kit.flash({ x: q.x, y: 1.4, z: q.z, color: GOLD, size: 1.0, life: 0.35, hold: 0.08 });
          });
        }
        break;
      }
      case 'oathkeepers_brand': {
        // The oath burns in at the room's start: an ember-gold sigil ring on
        // the floor round the party, one notch flaring for each Vow level.
        mark('relic_oathkeepers_brand');
        const p = player();
        const x = p ? p.x : ev.x ?? 0;
        const z = p ? p.z : ev.z ?? 0;
        const n = Math.max(1, Math.min(10, ev.level ?? 1));
        kit.ring({ x, z, r0: 2.4, r1: 2.0, width: 0.12, life: 1.0, core: GOLD, glow: EMBER, soft: 0.4, y: 0.05 });
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU - Math.PI / 2;
          after(0.05 * i, () => {
            SF.flare(x + Math.cos(a) * 2.2, 0.3, z + Math.sin(a) * 2.2, GOLD, 0.5, { kind: 'star', life: 0.3 });
            spray('spark', x + Math.cos(a) * 2.2, 0.2, z + Math.sin(a) * 2.2, N(3), { color: EMBER, speed: [0.05, 0.2], up: [0.8, 1.4], size: [0.04, 0.06], life: [0.5, 0.8], gravity: -0.2, drag: 1.5, opacity: 0.95 });
          });
        }
        kit.light({ x, z, radius: 3.0, color: GOLD, opacity: 0.4, life: 1.0 });
        break;
      }
      case 'tenor_bell': {
        // The great bell tolls over the room: a brass bell-light high over
        // the party, a slow deep shock ring that rolls to the walls, a
        // verdigris after-ring, a hit flash on every enemy and a heavy kick.
        mark('relic_tenor_bell');
        const st = RELIC3.bellwright;
        const p = player();
        const x = p ? p.x : ev.px ?? ev.x ?? 0;
        const z = p ? p.z : ev.pz ?? ev.z ?? 0;
        kit.pillar({ x, z, radius: 0.5, height: 4.5, color: st.glow, life: 0.6, opacity: 0.45 });
        SF.flare(x, 3.6, z, st.glow, 2.2, { kind: 'burst', life: 0.35 });
        kit.flash({ x, y: 3.4, z, color: st.glow, size: 2.0, life: 0.5, hold: 0.1 });
        kit.ring({ x, z, r0: 0.6, r1: 11, width: 0.3, life: 0.9, core: PARCH, glow: st.glow, soft: 0.5, y: 0.06, gain: 1.1 });
        after(0.15, () => kit.ring({ x, z, r0: 0.4, r1: 9, width: 0.12, life: 0.9, core: st.second, glow: st.second, soft: 0.6, y: 0.07, opacity: 0.8 }));
        kit.light({ x, z, radius: 7, color: st.glow, opacity: 0.55, life: 0.8 });
        for (const id of ev.hit ?? []) {
          const b = SF.byId(id);
          if (!b) continue;
          const d = Math.hypot(b.x - x, b.z - z);
          after(Math.min(0.6, d / 14), () => {
            const t = SF.byId(id) ?? b;
            SF.flare(t.x, 0.7, t.z, st.second, 0.6, { kind: 'star', life: 0.16 });
            kit.ring({ x: t.x, z: t.z, r0: 0.2, r1: 0.8, width: 0.06, life: 0.3, core: st.second, glow: st.glow, soft: 0.5, y: 0.06 });
          });
        }
        camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.08, 0.2);
        break;
      }
      default:
        break;
    }
  });
  // Batch 5: Tolling Dead, a knell over the fallen. Its warning is an Ember
  // ring closing on the spot with a ghost bell above it; the strike is a
  // dark shock ring, a violet bell-light and a short kick.
  bus.on('curse_proc', (ev) => {
    if (ev.curse !== 'tolling_dead') return;
    const x = ev.x ?? 0;
    const z = ev.z ?? 0;
    const r = ev.radius ?? 1.6;
    if (ev.stage === 'toll') {
      mark('curse_tolling_dead');
      kit.ring({ x, z, r0: r, r1: r * 0.98, width: 0.08, life: 0.8, core: EMBER, glow: EMBER, soft: 0.3, y: 0.05, opacity: 0.9 });
      kit.ring({ x, z, r0: r, r1: 0.2, width: 0.05, life: 0.8, core: EMBER, glow: VIOLET, soft: 0.5, y: 0.06, opacity: 0.8 });
      kit.mark({ x, z, radius: r, kind: 'splash', stain: VIOLET, glow: EMBER, life: 0.9, opacity: 0.22 });
      SF.flare(x, 1.6, z, VIOLET, 0.7, { kind: 'star', life: 0.8 });
      for (let i = 0; i < 3; i++) after(0.25 * i, () => kit.ring({ x, z, r0: 0.3, r1: 0.7, width: 0.05, life: 0.25, core: VIOLET_PEAK, glow: VIOLET, soft: 0.5, y: 1.5 }));
    } else {
      mark('curse_tolling_dead_strike');
      kit.flash({ x, y: 1.0, z, color: VIOLET, size: 1.2, life: 0.3, hold: 0.06 });
      kit.ring({ x, z, r0: 0.2, r1: r + 0.2, width: 0.2, life: 0.32, core: PARCH, glow: EMBER, soft: 0.4, y: 0.07, gain: 1.15 });
      kit.light({ x, z, radius: r + 1, color: VIOLET, opacity: 0.5, life: 0.35 });
      spray('spark', x, 0.4, z, N(10), { color: EMBER, speed: [0.8, 1.6], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.3, 0.5], gravity: 1.4, drag: 1.0, jitter: 0.2, opacity: 1 });
      for (const id of ev.struck ?? []) {
        const b = SF.byId(id);
        if (b) kit.streak({ a: { x, y: 0.6, z }, b: { x: b.x, y: 0.8, z: b.z }, width: 0.05, tailW: 0.01, core: PARCH, glow: EMBER, life: 0.14, fall: 1.2 });
      }
      if ((ev.struck ?? []).length) camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.04, 0.1);
    }
  });
  // Batch 5: Dulled Edge, a blunted crit. The crit's bright edge chips and
  // goes grey: a broken blade of tarnished iron over the target whose tip
  // snaps off and drops, a dull grey flash that dims the hit's light, a
  // violet tarnish stain and ring, and heavy iron flecks that fall instead
  // of fly.
  const DULL_IRON = vfxMatterColor('iron');
  bus.on('curse_proc', (ev) => {
    if (ev.curse !== 'dulled_edge') return;
    const b = SF.byId(ev.target);
    const x = b ? b.x : ev.x ?? 0;
    const z = b ? b.z : ev.z ?? 0;
    mark('curse_dulled_edge');
    kit.flash({ x, y: 1.0, z, color: DULL_IRON, size: 1.1, life: 0.2, hold: 0.04 });
    kit.light({ x, z, radius: 2.2, color: VIOLET, opacity: 0.35, life: 0.4 });
    // The blade: a long edge across the target, broken in the middle.
    const a = rnd(0, TAU);
    const ux = Math.cos(a);
    const uz = Math.sin(a);
    kit.streak({ a: { x: x - ux * 1.1, y: 1.25, z: z - uz * 1.1 }, b: { x: x - ux * 0.08, y: 1.1, z: z - uz * 0.08 }, width: 0.11, tailW: 0.05, core: PARCH, glow: DULL_IRON, life: 0.32, fall: 0.6 });
    kit.streak({ a: { x: x + ux * 0.12, y: 1.05, z: z + uz * 0.12 }, b: { x: x + ux * 0.8, y: 0.85, z: z + uz * 0.8 }, width: 0.09, tailW: 0.02, core: DULL_IRON, glow: VIOLET, life: 0.4, fall: 3.2 });
    // The chips off the break, a little star of grey at the notch.
    SF.flare(x, 1.1, z, DULL_IRON, 0.55, { kind: 'star', life: 0.3 });
    kit.ring({ x, z, r0: 0.3, r1: 1.25, width: 0.09, life: 0.45, core: DULL_IRON, glow: VIOLET, soft: 0.5, y: 0.06, opacity: 0.85 });
    kit.mark({ x, z, radius: 0.9, kind: 'splash', stain: VIOLET, glow: DULL_IRON, life: 0.8, opacity: 0.25 });
    spray('spark', x, 1.05, z, N(10), { color: DULL_IRON, speed: [0.4, 1.0], up: [0.1, 0.5], size: [0.05, 0.09], life: [0.4, 0.6], gravity: 4.5, drag: 0.6, jitter: 0.15, opacity: 0.95 });
    spray('spark', x, 0.9, z, N(4), { color: VIOLET, speed: [0.05, 0.2], up: [0.3, 0.6], size: [0.05, 0.07], life: [0.6, 0.9], gravity: -0.2, drag: 1.5, jitter: 0.25, opacity: 0.75 });
  });
  // Batch 4: Kindred Blood, a dark thread from the fallen to each kin it heals.
  bus.on('curse_proc', (ev) => {
    if (ev.curse !== 'kindred_blood') return;
    const x = ev.x ?? 0;
    const z = ev.z ?? 0;
    kit.ring({ x, z, r0: 0.3, r1: ev.radius ?? 2.5, width: 0.08, life: 0.45, core: VIOLET, glow: EMBER, soft: 0.5, y: 0.05, opacity: 0.6 });
    for (const id of ev.healed ?? []) {
      const b = SF.byId(id);
      if (!b) continue;
      kit.streak({ a: { x, y: 0.4, z }, b: { x: b.x, y: 0.8, z: b.z }, width: 0.05, tailW: 0, core: EMBER, glow: VIOLET, life: 0.28, fall: 0.9 });
      after(0.2, () => spray('spark', b.x, 0.7, b.z, N(4), { color: EMBER, speed: [0.05, 0.2], up: [0.4, 0.8], size: [0.04, 0.06], life: [0.4, 0.6], gravity: -0.2, drag: 1.5, jitter: 0.2, opacity: 0.85 }));
    }
  });
  bus.on('curse_apply', (ev) => {
    const p = player();
    const x = p ? p.x : ev.x ?? 0;
    const z = p ? p.z : ev.z ?? 0;
    kit.ring({ x, z, r0: 5.5, r1: 0.6, width: 0.22, life: 0.9, core: VIOLET_PEAK, glow: VIOLET, soft: 0.5, y: 0.06 });
    kit.light({ x, z, radius: 3.4, color: VIOLET, opacity: 0.45, life: 1.0 });
    spray('spark', x, 0.1, z, 16, { color: VIOLET, speed: [0.1, 0.5], up: [0.6, 1.4], size: [0.06, 0.12], life: [1.0, 1.6], gravity: -0.35, drag: 1.4, jitter: 3.0, opacity: 0.85 });
    if (ev.major) {
      // A MAJOR curse binds: a second, slower ring, six violet chains that
      // drop around the party and snap inward, a deep pulse and a shove.
      mark('curse_major');
      kit.ring({ x, z, r0: 7.5, r1: 1.2, width: 0.32, life: 1.3, core: VIOLET, glow: VIOLET, soft: 0.7, y: 0.07, delay: 0.15, opacity: 0.8 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        const px = x + Math.cos(a) * 3.2;
        const pz = z + Math.sin(a) * 3.2;
        kit.pillar({ x: px, z: pz, radius: 0.12, height: 3.2, color: VIOLET, life: 0.9, opacity: 0.8, delay: 0.05 * i });
        kit.streak({ a: { x: px, y: 2.4, z: pz }, b: { x: x + Math.cos(a) * 0.7, y: 0.6, z: z + Math.sin(a) * 0.7 }, width: 0.06, tailW: 0.02, core: VIOLET_PEAK, glow: VIOLET, life: 0.35, delay: 0.35 + 0.04 * i, fall: 1.1 });
      }
      kit.flash({ x, y: 1.0, z, color: VIOLET, size: 1.4, life: 0.5, hold: 0.1, delay: 0.6 });
      after(0.6, () => camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.06, 0.16));
    } else if (ev.curse === 'restless') {
      // Restless: the edge of the room shivers, four quick pulses inward.
      for (let i = 0; i < 4; i++) kit.ring({ x, z, r0: 6.5, r1: 4.0, width: 0.07, life: 0.35, core: VIOLET_PEAK, glow: VIOLET, soft: 0.4, y: 0.05, delay: i * 0.12, opacity: 0.7 });
    } else if (ev.curse === 'kindred_blood') {
      // Kindred Blood: dark red veins run across the floor.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.2;
        kit.streak({ a: { x: x + Math.cos(a) * 1.0, y: 0.05, z: z + Math.sin(a) * 1.0 }, b: { x: x + Math.cos(a) * 5.0, y: 0.05, z: z + Math.sin(a) * 5.0 }, width: 0.06, tailW: 0.02, core: EMBER, glow: VIOLET, life: 0.7, delay: i * 0.05, fall: 0.3 });
      }
    } else if (ev.curse === 'corked') {
      // Corked: wax seals drop round the party and stamp the floor.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.4;
        const px = x + Math.cos(a) * 3.0;
        const pz = z + Math.sin(a) * 3.0;
        after(0.06 * i, () => {
          SF.flare(px, 0.4, pz, VIOLET, 0.7, { kind: 'burst', life: 0.2 });
          kit.mark({ x: px, z: pz, radius: 0.45, kind: 'splash', stain: VIOLET, glow: VIOLET_PEAK, life: 1.6, opacity: 0.45 });
        });
      }
    } else if (ev.curse === 'tolling_dead') {
      // Tolling Dead: one deep toll over the room, dark rings rolling out.
      for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.6, r1: 6.5, width: 0.12, life: 0.9, core: VIOLET, glow: EMBER, soft: 0.5, y: 0.05, delay: i * 0.3, opacity: 0.7 });
      SF.flare(x, 2.6, z, VIOLET, 1.1, { kind: 'star', life: 0.6 });
    } else if (ev.curse === 'short_fuse') {
      // Short Fuse: ember sparks fizz round the ring like a lit fuse.
      kit.ring({ x, z, r0: 4.2, r1: 4.6, width: 0.06, life: 1.0, core: EMBER, glow: EMBER, soft: 0.4, y: 0.05, opacity: 0.8 });
      spray('spark', x, 0.15, z, N(22), { color: EMBER, speed: [0.4, 1.2], up: [0.6, 1.6], size: [0.03, 0.06], life: [0.4, 0.8], gravity: 0.6, drag: 0.8, jitter: 4.2, opacity: 0.95 });
    }
  });
  bus.on('curse_lift', (ev) => {
    if (ev.forfeited) return;
    const p = player();
    if (!p) return;
    kit.ring({ x: p.x, z: p.z, r0: 0.6, r1: 6.0, width: 0.2, life: 0.8, core: VIOLET_PEAK, glow: VIOLET, soft: 0.6, y: 0.06 });
    kit.flash({ x: p.x, y: 1.2, z: p.z, color: VIOLET_PEAK, size: 1.0, life: 0.4 });
  });

  return { RELIC_RARITY, VIOLET, VIOLET_PEAK, bodyAt, relicRise, SPORE_R, RELIC3, GOLD, TONIC5, STORM, DULL_IRON };
}
