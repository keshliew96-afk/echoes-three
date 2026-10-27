// SECRET ROOMS beats (docs/SECRET_ROOMS.md, content plan 5 slice 3).
//
//   secret_knock   a light blow on the cracked wall: grit spits out of the
//                  seam, a puff of dust rolls down the face, a thin silver
//                  ring (the rig flares the seam itself)
//   secret_open    the slice's big beat. Anticipation: the cold light is
//                  drawn into the seam. Impact: a silver-white flash and star
//                  at the crack, the masonry thrown into the room (stone
//                  chunks and shards along the wall's facing), a jagged shock
//                  ring, a light pillar out of the breach, a light pool and
//                  the camera's punch. Dissipation: a dust cloud rolling out
//                  across the floor, motes rising, a rubble mark.
//   secret_enter   the chamber wakes as the party steps in: a ring of silver
//                  light runs out over the old floor, the candles catch, dust
//                  lifts in the shaft
//   secret_pile    a hoard pile taken: a fountain of gold glints (the hoard
//                  is Glint, so Pale Gold)
//   secret_take    the chamber's body gives up what it held: the reliquary a
//                  silver geyser and star, the cache two tonic-coloured
//                  sparks rising to the party, the lectern its page flaring
//                  and a flutter of parchment motes
//
// createSecretFx(h) takes the signature director's helpers.
import { PALETTE, SECRET_COLORS, VFX_MATTER } from '../../data/palette.js';
import { SHARD_TILE } from './particles.js';
import { CHEST_BEAT } from '../interactables/chestbeat.js';

const GLOW = SECRET_COLORS.glow;
const CORE = SECRET_COLORS.core;
const DEEP = SECRET_COLORS.deep;
const PARCH = PALETTE.parchment;
const GOLD = PALETTE.paleGold;
const GOLD_HOT = '#F7E7C0';
const INK = PALETTE.voidCharcoal;
const TAU = Math.PI * 2;

export function createSecretFx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, rnd, mark, player, chestPunch = null }) {
  // The wall's face, a step into the room, and its facing.
  const face = (ev, k = 0.35) => {
    const yaw = ev.yaw ?? 0;
    const dx = Math.sin(yaw);
    const dz = Math.cos(yaw);
    return { x: ev.x + dx * k, z: ev.z + dz * k, dx, dz };
  };
  const wallOf = (id) => {
    const e = byId(id);
    return e ? { x: e.x, z: e.z, yaw: e.yaw ?? 0 } : null;
  };

  bus.on('secret_knock', (ev) => {
    mark('secret_knock');
    const w = wallOf(ev.id) ?? ev;
    const f = face(w, 0.3);
    flare(f.x, 0.5, f.z, GLOW, 0.7, { kind: 'star', life: 0.14, core: CORE });
    spray('chunk', f.x, 0.55, f.z, 5, { color: VFX_MATTER.stone, dir: { x: f.dx, z: f.dz }, dirBias: 0.7, speed: [0.6, 1.4], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.4, 0.7], jitter: 0.25 });
    spray('smoke', f.x, 0.4, f.z, 3, { color: VFX_MATTER.dust, dir: { x: f.dx, z: f.dz }, dirBias: 0.6, speed: [0.3, 0.7], up: [0.05, 0.25], size: [0.3, 0.45], grow: 1.4, life: [0.6, 0.9], opacity: 0.32, drag: 2.4, jitter: 0.3 });
    shock(f.x, f.z, 0.9, GLOW, { life: 0.26, width: 0.05, core: CORE });
  });

  bus.on('secret_open', (ev) => {
    mark(`secret_open_${ev.how ?? 'hit'}`);
    const f = face(ev, 0.3);
    const dir = { x: f.dx, z: f.dz };
    // Anticipation: the light drains into the seam.
    anticipate(f.x, f.z, 1.4, GLOW, { y: 0.5, lines: 9, core: CORE });
    after(0.07, () => {
      flare(f.x, 0.55, f.z, GLOW, 2.0, { kind: 'star', life: 0.3, core: CORE });
      flare(f.x, 0.5, f.z, PARCH, 1.1, { kind: 'burst', life: 0.18, core: CORE });
      kit.flash({ x: f.x, y: 0.6, z: f.z, color: CORE, size: 2.0, life: 0.38, hold: 0.07 });
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.55, height: 5.5, color: GLOW, life: 1.2, opacity: 0.55 });
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.16, height: 6.5, color: CORE, life: 0.8, opacity: 0.85 });
      kit.light({ x: f.x, z: f.z, radius: 4.2, color: GLOW, opacity: 0.75, life: 1.4, attack: 0.02 });
      shock(f.x, f.z, 2.6, GLOW, { life: 0.45, width: 0.14, core: CORE, jag: 0.6 });
      kit.ring({ x: f.x, z: f.z, r0: 0.3, r1: 1.7, width: 0.08, life: 0.7, core: CORE, glow: GLOW, soft: 0.6, y: 0.05, delay: 0.06, opacity: 0.8 });
      // The masonry comes out into the room.
      spray('chunk', f.x, 0.5, f.z, 22, { color: VFX_MATTER.stone, dir, dirBias: 0.75, speed: [1.6, 4.0], up: [1.2, 3.2], size: [0.07, 0.16], life: [0.7, 1.2], jitter: 0.5 });
      spray('shard', f.x, 0.6, f.z, 12, { color: VFX_MATTER.stone, tile: SHARD_TILE.needle, dir, dirBias: 0.7, speed: [1.2, 3.0], up: [1.6, 3.6], size: [0.08, 0.16], life: [0.6, 1.0], gravity: 2.4, drag: 0.9, spin: [-9, 9], jitter: 0.45 });
      spray('spark', f.x, 0.55, f.z, 16, { color: GLOW, dir, dirBias: 0.5, speed: [0.6, 2.0], up: [1.0, 2.6], size: [0.04, 0.08], life: [0.5, 0.9], gravity: -0.1, drag: 1.1, jitter: 0.4 });
      kit.mark({ x: f.x + f.dx * 0.5, z: f.z + f.dz * 0.5, radius: 1.3, kind: 'crater', stain: INK, glow: GLOW, glowOpacity: 0.35, cool: 1.4, life: 6.0, opacity: 0.35 });
      camfx.kick(-f.dx, -f.dz, 0.16, 0.16);
    });
    // Dissipation: the dust rolls out over the floor; the cold light settles.
    after(0.22, () => {
      spray('smoke', f.x, 0.35, f.z, 9, { color: VFX_MATTER.dust, dir, dirBias: 0.7, speed: [0.8, 2.0], up: [0.1, 0.5], size: [0.5, 0.8], grow: 1.8, life: [1.1, 1.7], opacity: 0.34, gravity: -0.05, drag: 1.8, jitter: 0.5 });
      embersUp(f.x, f.z, CORE, 10, { radius: 0.7, life: [1.2, 2.0] });
    });
  });

  bus.on('secret_enter', (ev) => {
    mark(`secret_enter_${ev.content}`);
    const cx = 0;
    const cz = -2.4;
    after(0.2, () => {
      kit.ring({ x: cx, z: cz, r0: 0.4, r1: 3.4, width: 0.22, life: 1.0, core: CORE, glow: GLOW, soft: 0.6, y: 0.05 });
      kit.light({ x: cx, z: cz, radius: 4.4, color: GLOW, opacity: 0.55, life: 1.8, attack: 0.25 });
      kit.pillar({ x: cx, z: cz, radius: 1.2, height: 7, color: GLOW, life: 1.6, opacity: 0.22 });
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i / 4) * TAU;
        const bx = cx + Math.cos(a) * 2.9;
        const bz = cz + Math.sin(a) * 2.9;
        kit.flash({ x: bx, y: 0.45, z: bz, color: PALETTE.hearthAmber, size: 0.7, life: 0.35, delay: 0.1 + i * 0.07 });
      }
      spray('smoke', cx, 0.3, cz, 6, { color: VFX_MATTER.dust, speed: [0.3, 0.8], up: [0.2, 0.6], size: [0.5, 0.8], grow: 1.6, life: [1.2, 1.8], opacity: 0.18, drag: 2.0, jitter: 2.0 });
    });
  });

  bus.on('secret_pile', (ev) => {
    mark('secret_pile');
    const { x, z } = ev;
    flare(x, 0.5, z, GOLD, 1.3, { kind: 'burst', life: 0.24, core: GOLD_HOT });
    shock(x, z, 1.3, GOLD, { life: 0.32, width: 0.09, core: GOLD_HOT });
    kit.light({ x, z, radius: 2.0, color: GOLD, opacity: 0.5, life: 0.55 });
    spray('chunk', x, 0.4, z, 12, { color: GOLD, speed: [0.5, 1.4], up: [2.0, 3.2], size: [0.05, 0.09], life: [0.6, 1.0], jitter: 0.3 });
    spray('spark', x, 0.4, z, 10, { color: GOLD_HOT, speed: [0.2, 0.8], up: [1.2, 2.4], size: [0.04, 0.07], life: [0.5, 0.9], gravity: -0.2, drag: 1.2, jitter: 0.3 });
  });

  bus.on('secret_take', (ev) => {
    mark(`secret_take_${ev.content}`);
    const { x, z } = ev;
    const p = player();
    // i: the reliquary and the cache press, then snap open at
    // CHEST_BEAT.snap (their rigs play the hop, the lid, the light and the
    // stars); their burst and a 2% zoom punch go off on the snap.
    if ((ev.content === 'relic' || ev.content === 'tonics') && chestPunch) chestPunch();
    if (ev.content === 'relic') {
      anticipate(x, z, 1.0, GLOW, { y: 1.1, lines: 7, core: CORE });
      after(CHEST_BEAT.snap, () => {
        flare(x, 1.4, z, GLOW, 1.8, { kind: 'star', life: 0.3, core: CORE });
        kit.pillar({ x, z, radius: 0.5, height: 7, color: GLOW, life: 1.3, opacity: 0.5 });
        kit.pillar({ x, z, radius: 0.14, height: 7.5, color: CORE, life: 1.0, opacity: 0.9 });
        kit.flash({ x, y: 1.3, z, color: CORE, size: 1.6, life: 0.4, hold: 0.08 });
        kit.light({ x, z, radius: 3.4, color: GLOW, opacity: 0.6, life: 1.2 });
        shock(x, z, 2.0, GLOW, { life: 0.42, width: 0.12, core: CORE });
        spray('spark', x, 1.2, z, 20, { color: GLOW, speed: [0.1, 0.6], up: [2.0, 3.8], size: [0.05, 0.09], life: [0.8, 1.3], gravity: -0.1, drag: 0.9, jitter: 0.3 });
        camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.08, 0.12);
      });
    } else if (ev.content === 'tonics') {
      after(CHEST_BEAT.snap, () => {
        flare(x, 0.7, z, GLOW, 1.2, { kind: 'burst', life: 0.22, core: CORE });
        spray('chunk', x, 0.5, z, 8, { color: VFX_MATTER.oak, speed: [0.6, 1.4], up: [1.0, 2.0], size: [0.05, 0.09], life: [0.5, 0.8], jitter: 0.3 });
      });
      const tx = p ? p.x : x;
      const tz = p ? p.z : z;
      (ev.tonics ?? []).forEach((_id, i) => {
        const lift = 1.0 + i * 0.3;
        kit.streak({ a: { x: x + (i ? 0.2 : -0.2), y: lift, z }, b: { x: (x + tx) / 2, y: lift + 0.9, z: (z + tz) / 2 }, width: 0.07, tailW: 0, core: CORE, glow: GLOW, life: 0.24, delay: CHEST_BEAT.snap + 0.1 + i * 0.08, fall: 1.0 });
        kit.streak({ a: { x: (x + tx) / 2, y: lift + 0.9, z: (z + tz) / 2 }, b: { x: tx, y: 1.1, z: tz }, width: 0.07, tailW: 0, core: CORE, glow: GLOW, life: 0.24, delay: CHEST_BEAT.snap + 0.22 + i * 0.08, fall: 1.0 });
      });
      after(CHEST_BEAT.snap + 0.45, () => kit.ring({ x: tx, z: tz, r0: 0.3, r1: 1.6, width: 0.1, life: 0.55, core: CORE, glow: GLOW, soft: 0.5, y: 0.06 }));
    } else if (ev.content === 'lore') {
      flare(x, 1.5, z, PARCH, 1.4, { kind: 'star', life: 0.28, core: CORE });
      kit.flash({ x, y: 1.5, z, color: PARCH, size: 1.3, life: 0.35, hold: 0.06 });
      kit.light({ x, z, radius: 2.8, color: PARCH, opacity: 0.45, life: 1.1 });
      spray('shard', x, 1.5, z, 10, { color: PARCH, tile: SHARD_TILE.petal, speed: [0.3, 0.9], up: [0.6, 1.4], size: [0.08, 0.13], life: [1.0, 1.6], gravity: 0.6, drag: 1.6, spin: [-4, 4], flutter: [0.4, 0.9], jitter: 0.3 });
      embersUp(x, z, CORE, 8, { radius: 0.4, y: 1.2 });
    } else {
      // The hoard (the last pile walked over, or gathered by E).
      kit.ring({ x, z, r0: 0.3, r1: 2.2, width: 0.12, life: 0.6, core: GOLD_HOT, glow: GOLD, soft: 0.5, y: 0.06 });
    }
  });

  void DEEP;
  return { frame() {} };
}
