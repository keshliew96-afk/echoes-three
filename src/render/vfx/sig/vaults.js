// THE VAULT AND CHEST LOOKS (docs/VAULTS.md): keys, vault chests, champion
// chests and the camera punch a chest snap gives.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { PALETTE } from '../../../data/palette.js';
import { INK, PARCH, TAU } from './common.js';
import { CHEST_BEAT } from '../../interactables/chestbeat.js';

export function createSigVaults(ctx) {
  const { SF, ANTICIP, after, bus, camfx, kit, mark, player, rnd, spray, world } = ctx;

  // ------------------------------------------------- KEYS AND VAULTS --
  // (docs/VAULTS.md) Pale Gold is the currency's colour, so it carries the
  // key, the hoard and the vault. A key's drop is a loot beam (it is the
  // room's prize); its pick-up flies it into the party; the vault's opening
  // is the slice's big beat: the lid, a gold geyser, the hoard pouring in.
  const VK_GOLD = PALETTE.paleGold;
  const VK_HOT = '#F7E7C0';
  bus.on('key_drop', (ev) => {
    mark('key_drop');
    const { x, z } = ev;
    // Anticipation: gold drawn down into the spot, then the beam lands.
    SF.anticipate(x, z, 1.4, VK_GOLD, { y: 0.4, lines: 8, core: VK_HOT });
    after(ANTICIP, () => {
      kit.pillar({ x, z, radius: 0.6, height: 7, color: VK_GOLD, life: 1.4, opacity: 0.5 });
      kit.pillar({ x, z, radius: 0.18, height: 8, color: VK_HOT, life: 1.1, opacity: 0.9 });
      SF.flare(x, 1.0, z, VK_GOLD, 1.8, { kind: 'burst', life: 0.3, core: VK_HOT });
      kit.flash({ x, y: 1.0, z, color: VK_GOLD, size: 1.6, life: 0.45, hold: 0.1 });
      kit.light({ x, z, radius: 3.6, color: VK_GOLD, opacity: 0.6, life: 1.2, attack: 0.03 });
      SF.shock(x, z, 2.6, VK_GOLD, { life: 0.5, width: 0.14, core: VK_HOT });
      kit.ring({ x, z, r0: 0.3, r1: 1.4, width: 0.08, life: 0.8, core: VK_HOT, glow: VK_GOLD, soft: 0.6, y: 0.05, delay: 0.1, opacity: 0.7 });
      spray('spark', x, 0.3, z, 22, { color: VK_GOLD, speed: [0.05, 0.4], up: [2.0, 3.8], size: [0.05, 0.1], life: [0.9, 1.5], gravity: -0.1, drag: 0.9, jitter: 0.35, opacity: 0.95 });
      kit.mark({ x, z, radius: 1.3, kind: 'sigil', stain: INK, glow: VK_GOLD, cool: 1.4, life: 3.0, opacity: 0.3 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.08, 0.12);
    });
  });
  bus.on('key_pickup', (ev) => {
    mark('key_pickup');
    const { x, z } = ev;
    const by = SF.byId(ev.by) ?? player();
    const tx = by ? by.x : x;
    const tz = by ? by.z : z;
    SF.flare(x, 1.0, z, VK_GOLD, 1.4, { kind: 'star', life: 0.22, core: VK_HOT });
    SF.shock(x, z, 1.6, VK_GOLD, { life: 0.35, width: 0.1, core: VK_HOT });
    // The key flies to whoever took it (to the party, on the clear's sweep):
    // three gold trails on a short arc, then a ring rises off the carrier.
    for (let i = 0; i < 3; i++) {
      const lift = 1.0 + i * 0.25;
      kit.streak({ a: { x, y: lift, z }, b: { x: (x + tx) / 2, y: lift + 0.8, z: (z + tz) / 2 }, width: 0.07, tailW: 0, core: VK_HOT, glow: VK_GOLD, life: 0.2, delay: i * 0.03, fall: 1.0 });
      kit.streak({ a: { x: (x + tx) / 2, y: lift + 0.8, z: (z + tz) / 2 }, b: { x: tx, y: 1.1, z: tz }, width: 0.07, tailW: 0, core: VK_HOT, glow: VK_GOLD, life: 0.2, delay: 0.09 + i * 0.03, fall: 1.0 });
    }
    after(0.2, () => {
      kit.ring({ x: tx, z: tz, r0: 0.3, r1: 1.8, width: 0.12, life: 0.6, core: VK_HOT, glow: VK_GOLD, soft: 0.5, y: 0.06 });
      kit.flash({ x: tx, y: 1.3, z: tz, color: VK_GOLD, size: 1.0, life: 0.4, hold: 0.08 });
      kit.light({ x: tx, z: tz, radius: 2.2, color: VK_GOLD, opacity: 0.5, life: 0.7 });
      SF.embersUp(tx, tz, VK_GOLD, 10, { radius: 0.4 });
    });
  });
  // The vault wakes as the party walks in: the braziers flare, a gold ring
  // runs out over the sanctum, dust lifts.
  bus.on('vault_enter', (ev) => {
    mark('vault_enter');
    const c = ev.chest;
    if (!c) return;
    after(0.25, () => {
      kit.ring({ x: c.x, z: c.z, r0: 0.4, r1: 3.0, width: 0.2, life: 0.9, core: VK_HOT, glow: VK_GOLD, soft: 0.6, y: 0.05 });
      kit.light({ x: c.x, z: c.z, radius: 4.2, color: VK_GOLD, opacity: 0.5, life: 1.6, attack: 0.2 });
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i / 4) * TAU;
        const bx = c.x + Math.cos(a) * 2.25;
        const bz = c.z + Math.sin(a) * 2.25;
        kit.flash({ x: bx, y: 1.2, z: bz, color: PALETTE.hearthAmber, size: 0.9, life: 0.4, delay: i * 0.08 });
        spray('spark', bx, 1.15, bz, 6, { color: PALETTE.hearthAmber, speed: [0.05, 0.3], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.6, 1.0], gravity: -0.2, drag: 1.4, jitter: 0.12 });
      }
    });
  });
  // A Glint pile taken: a fountain of coin-glints and a gold flare.
  bus.on('vault_pile', (ev) => {
    mark('vault_pile');
    const { x, z } = ev;
    SF.flare(x, 0.5, z, VK_GOLD, 1.5, { kind: 'burst', life: 0.25, core: VK_HOT });
    SF.shock(x, z, 1.5, VK_GOLD, { life: 0.35, width: 0.1, core: VK_HOT });
    kit.light({ x, z, radius: 2.2, color: VK_GOLD, opacity: 0.5, life: 0.6 });
    spray('chunk', x, 0.4, z, 16, { color: VK_GOLD, speed: [0.6, 1.6], up: [2.2, 3.6], size: [0.06, 0.1], life: [0.7, 1.1], jitter: 0.3 });
    spray('spark', x, 0.4, z, 14, { color: VK_HOT, speed: [0.2, 0.9], up: [1.4, 2.8], size: [0.04, 0.08], life: [0.6, 1.0], gravity: -0.2, drag: 1.2, jitter: 0.35 });
  });
  // The platter eaten: Bright Heal rising off every hero it fed.
  bus.on('vault_platter', (ev) => {
    mark('vault_platter');
    const { x, z } = ev;
    SF.flare(x, 0.6, z, PALETTE.hearthAmber, 1.3, { kind: 'burst', life: 0.25 });
    spray('smoke', x, 0.6, z, 4, { color: PARCH, speed: [0.2, 0.5], up: [0.4, 0.8], size: [0.3, 0.45], grow: 1.6, life: [0.8, 1.1], opacity: 0.22, gravity: -0.2, drag: 2.2, jitter: 0.3 });
    for (const e of world.entities()) {
      if (e.partyIndex === undefined || !(e.hp > 0)) continue;
      SF.healBloom(e.x, e.z, 0.6, false);
    }
  });
  // The chest opens: the vault's big beat.
  bus.on('vault_open', (ev) => {
    mark('vault_open');
    const x = ev.x ?? 0;
    const z = ev.z ?? -4.2;
    SF.anticipate(x, z, 1.8, VK_GOLD, { y: 0.6, lines: 10, core: VK_HOT });
    // i: the chest presses, then snaps open at CHEST_BEAT.snap (its rig plays
    // the hop, the lid, the light and the stars); the vault's burst and a 2%
    // zoom punch go off on the snap, the punch inside the hold at its top.
    SF.chestPunch();
    // The burst waits for the end of the hold at the top of the hop and is
    // softer than it was on the press (a 1.4 u flash, not a 2.6 u held
    // white-out), so the snap, the lid, the light sheet and the stars read.
    after(CHEST_BEAT.snap + CHEST_BEAT.rise + CHEST_BEAT.hold, () => {
      kit.pillar({ x, z, radius: 1.1, height: 8, color: VK_GOLD, life: 1.4, opacity: 0.22 });
      kit.pillar({ x, z, radius: 0.35, height: 9, color: VK_HOT, life: 1.1, opacity: 0.32 });
      SF.flare(x, 1.0, z, VK_GOLD, 1.6, { kind: 'burst', life: 0.4, core: VK_HOT, spin: 0.8 });
      kit.flash({ x, y: 1.1, z, color: VK_HOT, size: 1.2, life: 0.3, opacity: 0.6 });
      kit.light({ x, z, radius: 4.0, color: VK_GOLD, opacity: 0.4, life: 1.6, attack: 0.03 });
      SF.shock(x, z, 4.4, VK_GOLD, { life: 0.7, width: 0.22, core: VK_HOT });
      kit.ring({ x, z, r0: 0.5, r1: 2.6, width: 0.12, life: 1.0, core: VK_HOT, glow: VK_GOLD, soft: 0.6, y: 0.06, delay: 0.15, opacity: 0.8 });
      spray('chunk', x, 0.9, z, 18, { color: VK_GOLD, speed: [0.6, 2.0], up: [3.0, 5.0], size: [0.06, 0.11], life: [1.0, 1.5], jitter: 0.4 });
      spray('spark', x, 0.8, z, 24, { color: VK_HOT, speed: [0.1, 0.8], up: [2.0, 4.4], size: [0.05, 0.1], life: [1.2, 2.0], gravity: -0.15, drag: 0.9, jitter: 0.4, opacity: 0.8 });
      kit.mark({ x, z, radius: 2.4, kind: 'sigil', stain: INK, glow: VK_GOLD, cool: 2.0, life: 5, opacity: 0.35 });
      camfx.dolly(x, z, 0.5, 0.5);
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.2, 0.16);
    });
    // The rest of the hoard pours into the party: gold streaks to each hero.
    after(CHEST_BEAT.snap + 0.3, () => {
      for (const e of world.entities()) {
        if (e.partyIndex === undefined || !(e.hp > 0)) continue;
        kit.streak({ a: { x, y: 2.2, z }, b: { x: e.x, y: 1.1, z: e.z }, width: 0.06, tailW: 0, core: VK_HOT, glow: VK_GOLD, life: 0.3, fall: 1.0 });
        after(0.25, () => SF.embersUp(e.x, e.z, VK_GOLD, 6, { radius: 0.3 }));
      }
    });
  });

  return { VK_GOLD, VK_HOT };
}
