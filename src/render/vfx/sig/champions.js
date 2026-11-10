// THE CHAMPION LOOKS (docs/CHAMPIONS.md): every champion's attacks, its
// entrance and its death.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { PALETTE } from '../../../data/palette.js';
import { vfxMatterColor } from '../../../data/vfx.js';
import { BONE, EMBER, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';

export function createSigChampions(ctx) {
  const { SF, BRONZE, CREATURE_DEATH, GUST, KBRICK, KGOLD, KHEAT, KSPARK, N, SLAGC, SSTONE, after, bus, camfx, faceOf, kit, mark, rnd, spray, unit2 } = ctx;

  // ---------------------------------------------------- CHAMPIONS --
  // (docs/CHAMPIONS.md) A champion is a heavy grown into a lord: its beats
  // are a heavy's (Ember on the frame that hurts, its matter on what breaks)
  // at a mini-boss's weight, with Pale Gold for the crown it wears. No
  // violet: that is the bosses' and the corruption's alone.
  const CH_GOLD = PALETTE.paleGold;
  const CH_GOLD_HOT = '#F7E7C0';
  const CH_WATER = vfxMatterColor('water');
  const CH_SILT = vfxMatterColor('silt');
  const CH_BRAMBLE = vfxMatterColor('bramble');
  const CH_BONE = vfxMatterColor('boneplate');
  const CH_CRYSTAL = vfxMatterColor('heartcrystal');
  const CH_VEIN = vfxMatterColor('heartvein');
  const CH_PEAK = vfxMatterColor('heartpeak');
  // The Ember Kiln's two (content plan 5 slice 9): kiln iron, molten glass.
  const KIRON = vfxMatterColor('kilniron');
  const GLASSC = vfxMatterColor('moltenglass');
  const FK_GRATE_Y = 1.6; // the Furnace Knight's grate (render/enemies/champions2.js)
  const GB_PIPE = 1.3; // the Glassblower's pipe reaches this far ahead...
  const GB_TIP_Y = 1.25; // ...at this height
  // The wind-up: gold motes drawn into the champion, Ember lines into where
  // the move will land.
  bus.on('champion_tell', (ev) => {
    mark('champion_tell');
    const c = SF.byId(ev.id);
    if (c) {
      spray('spark', c.x, 1.4, c.z, 6, { color: CH_GOLD, speed: [0.05, 0.2], up: [0.2, 0.6], size: [0.04, 0.08], life: [0.5, 0.8], gravity: -0.2, drag: 1.6, jitter: 0.9, opacity: 0.85 });
      kit.flash({ x: c.x, y: 1.5, z: c.z, color: CH_GOLD, size: 0.7, life: 0.25, grow: -0.3, opacity: 0.7 });
    }
    SF.anticipate(ev.x, ev.z, 1.6, EMBER, { y: 0.3, lines: 8 });
    // The Moss Hart gathers itself for the Leap: dust pushed out from its
    // hooves, moss shaken loose, lichen motes lifting off the rack.
    if (ev.champion === 'moss_hart' && ev.move === 'harts_leap' && c) {
      SF.shock(c.x, c.z, 1.6, vfxMatterColor('earth'), { life: 0.5, width: 0.2, core: BONE, delay: 0.1 });
      spray('smoke', c.x, 0.15, c.z, 6, { color: vfxMatterColor('earth'), speed: [0.8, 1.6], up: [0.05, 0.3], size: [0.36, 0.5], grow: 1.5, life: [0.6, 0.95], opacity: 0.26, gravity: -0.05, drag: 2.4, jitter: 0.4 });
      spray('spark', c.x, 2.4, c.z, 8, { color: vfxMatterColor('lichen'), speed: [0.1, 0.4], up: [0.4, 1.0], size: [0.04, 0.07], life: [0.8, 1.2], gravity: -0.3, drag: 1.4, jitter: 0.8 });
    }
    // The Gale Herald takes wing for the Stoop: its first beats blast the
    // floor — a pale ring of air thrown out, dust rolled away, stone
    // feathers shaken loose.
    if (ev.champion === 'gale_herald' && ev.move === 'stoop' && c) {
      kit.ring({ x: c.x, z: c.z, r0: 0.4, r1: 2.4, width: 0.12, life: 0.55, core: PARCH, glow: GUST, soft: 0.6, y: 0.05, opacity: 0.6, gain: 0.6 });
      SF.shock(c.x, c.z, 1.8, SSTONE, { life: 0.5, width: 0.2, core: BONE, delay: 0.05 });
      spray('smoke', c.x, 0.15, c.z, 6, { color: SSTONE, speed: [1.0, 2.0], up: [0.05, 0.3], size: [0.36, 0.5], grow: 1.5, life: [0.6, 0.95], opacity: 0.28, gravity: -0.05, drag: 2.4, jitter: 0.4 });
      spray('shard', c.x, 1.6, c.z, 5, { color: SSTONE, tile: SHARD_TILE.feather, speed: [0.4, 1.2], up: [0.2, 0.8], size: [0.12, 0.18], life: [1.2, 1.8], gravity: 0.5, drag: 1.7, spin: [-5, 5], flutter: 0.8, jitter: 0.6 });
      for (let i = 0; i < N(6); i++) {
        const a = (i / 6) * TAU + rnd(-0.3, 0.3);
        const px = c.x + Math.cos(a) * 0.7;
        const pz = c.z + Math.sin(a) * 0.7;
        kit.streak({ a: { x: px, y: 1.8, z: pz }, b: { x: px, y: 1.2, z: pz }, width: 0.05, tailW: 0, core: PARCH, glow: GUST, life: 0.35, delay: i * 0.025, travel: { x: Math.cos(a) * 2.5, y: -3.2, z: Math.sin(a) * 2.5 }, fall: 1.0, opacity: 0.7 });
      }
    }
    // The Bell Abbess grips the rope for the Swing: the great bell high in
    // the belfry answers (a bronze ring far overhead), a pale line runs up the
    // rope into the dark, and the dust is pressed out from her crouch.
    if (ev.champion === 'bell_abbess' && ev.move === 'rope_swing' && c) {
      kit.ring({ x: c.x, z: c.z, r0: 0.3, r1: 1.8, width: 0.08, life: 0.7, core: PARCH, glow: BRONZE, soft: 0.6, y: 4.6, opacity: 0.5, thin: 0.5 });
      kit.streak({ a: { x: c.x, y: 2.4, z: c.z }, b: { x: c.x, y: 6.5, z: c.z }, width: 0.06, tailW: 0.02, core: PARCH, glow: GUST, life: 0.45, fall: 1.2, opacity: 0.55 });
      SF.shock(c.x, c.z, 1.4, SSTONE, { life: 0.45, width: 0.16, core: BONE, delay: 0.08 });
      spray('smoke', c.x, 0.15, c.z, 5, { color: SSTONE, speed: [0.7, 1.4], up: [0.05, 0.25], size: [0.34, 0.48], grow: 1.5, life: [0.6, 0.9], opacity: 0.24, gravity: -0.05, drag: 2.4, jitter: 0.4 });
    }
    // ... and lifts the hand-bell for the Peal: bronze glints off its lip.
    if (ev.champion === 'bell_abbess' && ev.move === 'vesper_peal' && c) {
      const d = faceOf(c);
      spray('spark', c.x + d.x * 0.3 + 0.3, 2.2, c.z + d.z * 0.3, 8, { color: BRONZE, speed: [0.1, 0.4], up: [0.2, 0.6], size: [0.04, 0.07], life: [0.5, 0.8], gravity: -0.2, drag: 1.6, jitter: 0.7 });
    }
    // THE EMBER KILN's two (content plan 5 slice 9). The Furnace Knight
    // digs in for the Rush: its greaves' seams flare gold, slag spits from
    // under its feet and the floor scorches where it stands.
    if (ev.champion === 'furnace_knight' && ev.move === 'molten_rush' && c) {
      const d = faceOf(c);
      kit.flash({ x: c.x, y: 0.4, z: c.z, color: KGOLD, size: 1.1, life: 0.5, hold: 0.15, opacity: 0.55 });
      spray('spark', c.x - d.x * 0.3, 0.15, c.z - d.z * 0.3, 10, { color: KGOLD, speed: [0.6, 1.6], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.4, 0.7], gravity: 5, drag: 0.7, dir: { x: -d.x, z: -d.z }, dirBias: 0.6 });
      kit.mark({ x: c.x, z: c.z, radius: 1.0, kind: 'scorch', stain: INK, glow: KGOLD, glowOpacity: 0.5, cool: 1.0, life: 2.4, opacity: 0.35 });
    }
    // ... and opens its grate for the Blast: heat pours out of the bars, a
    // shimmer of sparks pulled in through them, gold light on the floor.
    if (ev.champion === 'furnace_knight' && ev.move === 'grate_blast' && c) {
      const d = faceOf(c);
      const gx = c.x + d.x * 0.45;
      const gz = c.z + d.z * 0.45;
      kit.flash({ x: gx, y: FK_GRATE_Y, z: gz, color: KGOLD, size: 1.2, life: 0.9, hold: 0.4, opacity: 0.6 });
      kit.light({ x: gx, z: gz, radius: 2.2, color: KGOLD, opacity: 0.4, life: 1.0, attack: 0.3 });
      for (let i = 0; i < N(8); i++) {
        const a = Math.atan2(d.z, d.x) + rnd(-0.8, 0.8);
        kit.streak({ a: { x: gx + Math.cos(a) * 1.4, y: FK_GRATE_Y + rnd(-0.3, 0.3), z: gz + Math.sin(a) * 1.4 }, b: { x: gx + Math.cos(a) * 1.1, y: FK_GRATE_Y, z: gz + Math.sin(a) * 1.1 }, width: 0.04, tailW: 0, core: KHEAT, glow: KGOLD, life: 0.2, delay: i * 0.04, travel: { x: -Math.cos(a) * 5, y: 0, z: -Math.sin(a) * 5 }, fall: 1.0, opacity: 0.8 });
      }
    }
    // The Glassblower sets its lips to the pipe for the Bubble: the gather
    // swells and glows, a ring of heat-haze round the pipe's end.
    if (ev.champion === 'glassblower' && ev.move === 'glass_bubble' && c) {
      const d = faceOf(c);
      const tx = c.x + d.x * GB_PIPE;
      const tz = c.z + d.z * GB_PIPE;
      kit.flash({ x: tx, y: GB_TIP_Y, z: tz, color: GLASSC, size: 0.9, life: 1.1, hold: 0.6, grow: 0.8, opacity: 0.55 });
      kit.ring({ x: tx, z: tz, r0: 0.2, r1: 0.9, width: 0.05, life: 0.8, core: KHEAT, glow: GLASSC, soft: 0.6, y: GB_TIP_Y, opacity: 0.5, thin: 0.5 });
    }
    // ... and takes a breath for the Gout: the pipe's mouth goes white-hot.
    if (ev.champion === 'glassblower' && ev.move === 'glass_gout' && c) {
      const d = faceOf(c);
      const tx = c.x + d.x * GB_PIPE;
      const tz = c.z + d.z * GB_PIPE;
      kit.flash({ x: tx, y: GB_TIP_Y, z: tz, color: KHEAT, size: 0.6, life: 0.8, hold: 0.4, opacity: 0.7 });
      spray('spark', tx, GB_TIP_Y, tz, 6, { color: GLASSC, speed: [0.1, 0.4], up: [0.1, 0.4], size: [0.04, 0.07], life: [0.4, 0.7], gravity: 2, drag: 1.2 });
    }
  });
  bus.on('champion_spawn', (ev) => {
    mark('champion_spawn');
    kit.pillar({ x: ev.x, z: ev.z, radius: 1.0, height: 6, color: CH_GOLD, life: 1.1, opacity: 0.6 });
    kit.pillar({ x: ev.x, z: ev.z, radius: 0.4, height: 6.5, color: CH_GOLD_HOT, life: 0.8, opacity: 0.7 });
    SF.flare(ev.x, 1.2, ev.z, CH_GOLD, 3.0, { kind: 'burst', life: 0.4, spin: 0.6 });
    kit.light({ x: ev.x, z: ev.z, radius: 3.4, color: CH_GOLD, opacity: 0.55, life: 1.0, attack: 0.05 });
    kit.mark({ x: ev.x, z: ev.z, radius: 2.4, kind: 'crater', stain: vfxMatterColor('ash'), glow: CH_GOLD, cool: 1.4, life: 5, opacity: 0.5 });
    kit.crack({ x: ev.x, z: ev.z, radius: 1.8, glow: CH_GOLD, life: 2.4, cool: 0.9 });
    spray('chunk', ev.x, 0.3, ev.z, 10, { color: vfxMatterColor('earth'), speed: [1.0, 2.6], up: [1.4, 3.0], size: [0.08, 0.16], life: [0.6, 1.0], jitter: 0.6 });
    camfx.dolly(ev.x, ev.z, 0.5, 0.45);
  });
  bus.on('champion_rage', (ev) => {
    mark('champion_rage');
    SF.flare(ev.x, 1.4, ev.z, EMBER, 2.4, { kind: 'burst', life: 0.35, core: CH_GOLD_HOT });
    SF.shock(ev.x, ev.z, 3.0, EMBER, { life: 0.45, width: 0.18, jag: 0.6 });
    kit.light({ x: ev.x, z: ev.z, radius: 3, color: EMBER, opacity: 0.45, life: 0.6 });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.6, 0.18);
  });
  // Each move's landing.
  const CHAMP_MOVE = {
    // Briar Knight: the charge sets off (its wake is laid as it runs) ...
    bramble_charge(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = SF.byId(ev.id);
      const len = c && c.charge ? c.charge.left * Math.hypot(c.charge.vx, c.charge.vz) : 5;
      SF.laneDrive(c ? c.x : ev.x, c ? c.z : ev.z, d, len, 9, { wake: CH_BRAMBLE, wakeW: 1.0, head: EMBER, peak: CH_GOLD_HOT, stain: vfxMatterColor('earth'), glow: EMBER, marks: 4 });
      spray('shard', c ? c.x : ev.x, 0.5, c ? c.z : ev.z, 8, { color: CH_BRAMBLE, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [0.6, 1.4], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 4, spin: [-8, 8], dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
    },
    // ... and the Thorn Ring bursts round it.
    thorn_ring(ev) {
      const r = 2.8;
      SF.spikes(ev.x, ev.z, r, 18, CH_BRAMBLE, { h: 0.9, life: 0.6, core: PARCH });
      SF.flare(ev.x, 0.5, ev.z, EMBER, 2.0, { kind: 'star', life: 0.26 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.35, width: 0.16, jag: 0.8 });
      SF.shock(ev.x, ev.z, r * 1.35, CH_BRAMBLE, { life: 0.55, width: 0.24, core: PARCH, delay: 0.05 });
      kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: EMBER, life: 1.6, cool: 0.5 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: EMBER, opacity: 0.45, life: 0.4, attack: 0.02 });
      spray('shard', ev.x, 0.4, ev.z, 16, { color: CH_BRAMBLE, tile: SHARD_TILE.needle, speed: [1.2, 3.0], up: [1.0, 2.4], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 4, spin: [-10, 10], jitter: 0.6 });
      spray('shard', ev.x, 0.6, ev.z, 8, { color: CH_BRAMBLE, tile: SHARD_TILE.petal, speed: [0.3, 0.9], up: [0.6, 1.2], size: [0.1, 0.13], life: [1.2, 1.8], gravity: 0.5, drag: 1.8, spin: [-4, 4], flutter: 0.6 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.5, 0.14);
    },
    // Sluice Warden: the gate drives a wall of water down the cone.
    floodgate(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const ang = Math.atan2(d.z, d.x);
      const R = 3.4;
      for (let i = 0; i < N(7); i++) {
        const a = ang + (i / 6 - 0.5) * 2 * 0.73;
        kit.streak({ a: { x: ev.x + Math.cos(a) * 0.6, y: 0.3, z: ev.z + Math.sin(a) * 0.6 }, b: { x: ev.x + Math.cos(a) * R, y: 0.15, z: ev.z + Math.sin(a) * R }, width: 0.28, tailW: 0.5, core: PARCH, glow: CH_WATER, life: 0.35, fall: 1.6, opacity: 0.8, delay: Math.abs(i / 6 - 0.5) * 0.06 });
      }
      kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * R, y: 0.1, z: ev.z + d.z * R }, width: R * 1.2, tailW: R * 1.1, core: EMBER, glow: EMBER, life: 0.22, fall: 2.2, opacity: 0.4 });
      SF.flare(ev.x + d.x * 0.9, 0.6, ev.z + d.z * 0.9, CH_WATER, 2.0, { kind: 'burst', life: 0.25, angle: ang });
      spray('shard', ev.x + d.x * 1.6, 0.4, ev.z + d.z * 1.6, 22, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [1.6, 3.4], up: [1.2, 2.6], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 7, drag: 0.3, dir: d, dirBias: 0.8, jitter: 0.5 });
      spray('smoke', ev.x + d.x * 2, 0.2, ev.z + d.z * 2, 4, { color: CH_SILT, speed: [0.6, 1.4], up: [0.05, 0.2], size: [0.5, 0.7], grow: 1.5, life: [1.0, 1.4], opacity: 0.35, drag: 2.4, dir: d, dirBias: 0.6, jitter: 0.6 });
      kit.mark({ x: ev.x + d.x * 2, z: ev.z + d.z * 2, radius: 2.4, kind: 'splash', angle: ang, stretch: 1.4, stain: CH_SILT, glow: CH_WATER, glowOpacity: 0.3, cool: 0.8, life: 4, opacity: 0.45 });
      camfx.kick(d.x, d.z, 0.55, 0.14);
    },
    // ... and the Undertow wells up under a hero.
    undertow(ev) {
      const r = 1.9;
      SF.ripples(ev.x, ev.z, 3, r * 1.2, 0);
      kit.pillar({ x: ev.x, z: ev.z, radius: r * 0.6, height: 2.6, color: CH_WATER, life: 0.6, opacity: 0.55 });
      SF.flare(ev.x, 0.4, ev.z, EMBER, 1.6, { kind: 'burst', life: 0.22 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.3, width: 0.12 });
      spray('shard', ev.x, 0.3, ev.z, 22, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [0.6, 1.6], up: [2.4, 4.0], size: [0.1, 0.16], life: [0.7, 1.0], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.5 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.2, kind: 'splash', stain: CH_SILT, glow: CH_WATER, glowOpacity: 0.3, cool: 0.8, life: 5, opacity: 0.45 });
    },
    // Bone Reeve: a scythe arc of bone-white light with an Ember edge.
    reaping_sweep(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const ang = Math.atan2(d.z, d.x);
      const R = 2.7;
      const half = 75 * (Math.PI / 180);
      const segs = 9;
      for (let i = 0; i < segs; i++) {
        const a0 = ang + half - (i / segs) * 2 * half;
        const a1 = ang + half - ((i + 1) / segs) * 2 * half;
        kit.streak({ a: { x: ev.x + Math.cos(a0) * R, y: 0.7, z: ev.z + Math.sin(a0) * R }, b: { x: ev.x + Math.cos(a1) * R, y: 0.7, z: ev.z + Math.sin(a1) * R }, width: 0.22, tailW: 0.1, core: PARCH, glow: CH_BONE, life: 0.28, fall: 1.4, delay: i * 0.012 });
        kit.streak({ a: { x: ev.x + Math.cos(a0) * R * 0.95, y: 0.08, z: ev.z + Math.sin(a0) * R * 0.95 }, b: { x: ev.x + Math.cos(a1) * R * 0.95, y: 0.08, z: ev.z + Math.sin(a1) * R * 0.95 }, width: 0.3, tailW: 0.3, core: EMBER, glow: EMBER, life: 0.2, fall: 2, opacity: 0.6, delay: i * 0.012 });
      }
      SF.flare(ev.x + d.x * R * 0.8, 0.7, ev.z + d.z * R * 0.8, CH_BONE, 1.6, { kind: 'star', life: 0.2, angle: ang });
      spray('spark', ev.x + d.x * R * 0.7, 0.7, ev.z + d.z * R * 0.7, 10, { color: PARCH, speed: [1.4, 3.0], up: [0.3, 1.0], size: [0.04, 0.07], life: [0.15, 0.3], dir: d, dirBias: 0.6 });
      kit.mark({ x: ev.x + d.x * 1.4, z: ev.z + d.z * 1.4, radius: 2.0, kind: 'gouge', angle: ang + Math.PI / 2, stretch: 2.2, stain: INK, glow: EMBER, cool: 0.6, life: 2.6, opacity: 0.4 });
      camfx.kick(d.x, d.z, 0.4, 0.12);
    },
    // ... and the Grave Lance: bone spikes burst along the lane, one by one.
    grave_lance(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = SF.byId(ev.id);
      const ox = c ? c.x : ev.x - d.x * 4;
      const oz = c ? c.z : ev.z - d.z * 4;
      const len = Math.hypot(ev.x - ox, ev.z - oz) || 8;
      kit.streak({ a: { x: ox, y: 0.1, z: oz }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 1.1, tailW: 1.0, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.5 });
      const n = Math.max(4, Math.round(len / 0.8));
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        SF.spikes(ox + d.x * len * k, oz + d.z * len * k, 0.5, 4, CH_BONE, { h: 1.0, life: 0.55, delay: k * 0.22, core: PARCH });
      }
      after(0.22, () => {
        SF.flare(ev.x, 0.5, ev.z, CH_BONE, 1.4, { kind: 'burst', life: 0.22 });
        spray('chunk', ev.x, 0.3, ev.z, 8, { color: CH_BONE, speed: [1.0, 2.4], up: [1.4, 2.8], size: [0.08, 0.15], life: [0.6, 0.9] });
      });
      for (let i = 1; i <= 3; i++) kit.mark({ x: ox + d.x * len * (i / 3.5), z: oz + d.z * len * (i / 3.5), radius: 1.0, kind: 'gouge', angle: Math.atan2(d.z, d.x), stretch: 1.8, stain: vfxMatterColor('earth'), glow: EMBER, glowOpacity: 0.3, cool: 0.6, life: 3, opacity: 0.4, delay: i * 0.07 });
      camfx.kick(d.x, d.z, 0.35, 0.12);
    },
    // Hollow Choir: the hymn's release, a violet flare at the heart, the
    // shards fly on their own (the enemy-shot layer draws them).
    shard_hymn(ev) {
      const c = SF.byId(ev.id);
      const x = c ? c.x : ev.x;
      const z = c ? c.z : ev.z;
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      SF.flare(x + d.x * 0.6, 1.7, z + d.z * 0.6, CH_VEIN, 2.0, { kind: 'star', life: 0.24, core: CH_PEAK, angle: Math.atan2(d.z, d.x) });
      kit.flash({ x, y: 1.7, z, color: CH_PEAK, size: 1.0, life: 0.15 });
      kit.ring({ x, z, r0: 0.5, r1: 1.6, width: 0.1, life: 0.35, core: CH_PEAK, glow: CH_VEIN, soft: 0.5, y: 1.7, opacity: 0.8 });
      spray('shard', x, 1.7, z, 8, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.6, 3.0], up: [0.2, 0.8], size: [0.09, 0.13], life: [0.4, 0.7], gravity: 3, spin: [-8, 8], dir: d, dirBias: 0.7 });
    },
    // ... and Discord: two rings of dissonance, Ember where it hurts.
    discord(ev) {
      const r = 3.2;
      SF.flare(ev.x, 1.6, ev.z, CH_VEIN, 2.6, { kind: 'burst', life: 0.3, core: CH_PEAK, spin: 0.7 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.4, width: 0.18 });
      SF.shock(ev.x, ev.z, r * 1.4, CH_VEIN, { life: 0.6, width: 0.26, core: CH_PEAK, delay: 0.08 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.6, r1: r, width: 0.14, life: 0.45, core: CH_PEAK, glow: CH_VEIN, soft: 0.5, y: 1.6, opacity: 0.7 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: CH_VEIN, opacity: 0.5, life: 0.5 });
      spray('shard', ev.x, 1.2, ev.z, 18, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.6, 3.2], up: [0.4, 1.4], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 4, spin: [-10, 10], jitter: 0.6 });
      kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'scorch', stain: INK, glow: CH_VEIN, cool: 1.0, life: 3, opacity: 0.3 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.5, 0.15);
    },
  };
  // Gale Herald (the Still Spire): the horn's blast and the stoop's landing.
  // Pale wind and limestone; Ember only on the ground that hurts.
  Object.assign(CHAMP_MOVE, {
    // Gale Call: a white-hot blast at the horn's bell, a wall of cold wind
    // streaming down the cone (streaks at several heights, scouring dust
    // along the floor), the Ember edge over the cone's ground for a beat.
    gale_call(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const ang = Math.atan2(d.z, d.x);
      const R = 5.2;
      const half = 34 * (Math.PI / 180);
      const c = SF.byId(ev.id);
      const ox = c ? c.x : ev.x;
      const oz = c ? c.z : ev.z;
      const hx = ox + d.x * 1.7;
      const hz = oz + d.z * 1.7;
      SF.flare(hx, 1.9, hz, GUST, 2.2, { kind: 'burst', life: 0.28, angle: ang });
      SF.flare(hx, 1.9, hz, BRONZE, 1.2, { kind: 'star', life: 0.2, angle: ang });
      kit.flash({ x: hx, y: 1.9, z: hz, color: PARCH, size: 1.1, life: 0.14 });
      kit.ring({ x: hx, z: hz, r0: 0.3, r1: 1.6, width: 0.08, life: 0.4, core: PARCH, glow: GUST, soft: 0.5, y: 1.9, opacity: 0.75, thin: 0.5 });
      // The Ember edge on the cone's ground.
      for (let i = 0; i < 5; i++) {
        const a = ang + (i / 4 - 0.5) * 2 * half;
        kit.streak({ a: { x: ox + Math.cos(a) * 0.6, y: 0.1, z: oz + Math.sin(a) * 0.6 }, b: { x: ox + Math.cos(a) * R, y: 0.1, z: oz + Math.sin(a) * R }, width: 0.9, tailW: 1.1, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.32 });
      }
      // The wind: streaks thrown down the cone at several heights.
      for (let i = 0; i < N(14); i++) {
        const a = ang + rnd(-half, half) * 0.95;
        const r0 = rnd(0.8, 1.8);
        const y = rnd(0.25, 1.9);
        const sp = rnd(9, 14);
        const px = ox + Math.cos(a) * r0;
        const pz = oz + Math.sin(a) * r0;
        kit.streak({ a: { x: px, y, z: pz }, b: { x: px + Math.cos(a) * 0.9, y: y - 0.05, z: pz + Math.sin(a) * 0.9 }, width: rnd(0.04, 0.09), tailW: 0, core: PARCH, glow: GUST, life: (R - r0) / sp, delay: rnd(0, 0.12), travel: { x: Math.cos(a) * sp, y: -y * 0.3, z: Math.sin(a) * sp }, fall: 0.8, opacity: 0.8 });
      }
      kit.streak({ a: { x: hx, y: 1.9, z: hz }, b: { x: ox + d.x * R, y: 0.6, z: oz + d.z * R }, width: 0.5, tailW: 1.8, core: PARCH, glow: GUST, life: 0.4, fall: 1.4, opacity: 0.4 });
      for (let i = 0; i < 3; i++) {
        const k = 0.35 + i * 0.25;
        spray('smoke', ox + d.x * R * k, 0.2, oz + d.z * R * k, 2, { color: SSTONE, speed: [1.6, 3.2], up: [0.05, 0.3], size: [0.4, 0.55], grow: 1.6, life: [0.6, 0.9], opacity: 0.26, drag: 2.0, dir: d, dirBias: 0.85, jitter: 0.5 });
      }
      spray('spark', hx, 1.9, hz, 10, { color: GUST, speed: [2.0, 4.0], up: [-0.4, 0.3], size: [0.04, 0.07], life: [0.3, 0.55], drag: 1.0, dir: d, dirBias: 0.8 });
      kit.mark({ x: ox + d.x * 2.4, z: oz + d.z * 2.4, radius: 2.4, kind: 'gouge', angle: ang, stretch: 1.6, stain: SSTONE, glow: GUST, glowOpacity: 0.2, cool: 0.6, life: 2.6, opacity: 0.28 });
      camfx.kick(d.x, d.z, 0.5, 0.14);
    },
    // Stoop: it comes down on the mark — a white-hot impact, the Ember ring,
    // a ring of air slammed out across the floor, a limestone crater, stone
    // feathers and chips flung, dust rolling out.
    stoop(ev) {
      const r = 2.1;
      kit.streak({ a: { x: ev.x, y: 2.6, z: ev.z }, b: { x: ev.x, y: 0.2, z: ev.z }, width: 0.5, tailW: 0.9, core: PARCH, glow: GUST, life: 0.18, fall: 2.0, opacity: 0.7 });
      SF.flare(ev.x, 0.45, ev.z, EMBER, 2.0, { kind: 'burst', life: 0.26 });
      kit.flash({ x: ev.x, y: 0.5, z: ev.z, color: PARCH, size: 1.2, life: 0.14 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.32, width: 0.16, jag: 0.6 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.5, r1: r * 2.0, width: 0.14, life: 0.6, core: PARCH, glow: GUST, soft: 0.6, y: 0.06, delay: 0.03, opacity: 0.7, gain: 0.7 });
      SF.shock(ev.x, ev.z, r * 1.4, SSTONE, { life: 0.55, width: 0.26, core: BONE, delay: 0.05, jag: 0.9 });
      kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: EMBER, life: 1.6, cool: 0.5 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.2, kind: 'crater', stain: SSTONE, glow: EMBER, glowOpacity: 0.4, cool: 0.9, life: 4, opacity: 0.5 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: EMBER, opacity: 0.4, life: 0.4, attack: 0.02 });
      spray('chunk', ev.x, 0.3, ev.z, 12, { color: SSTONE, speed: [1.2, 2.8], up: [1.6, 3.2], size: [0.08, 0.16], life: [0.55, 0.9], jitter: 0.4 });
      spray('shard', ev.x, 1.0, ev.z, 8, { color: SSTONE, tile: SHARD_TILE.feather, speed: [0.8, 1.8], up: [0.8, 1.6], size: [0.12, 0.18], life: [1.2, 1.8], gravity: 0.6, drag: 1.6, spin: [-6, 6], flutter: 0.8, jitter: 0.5 });
      spray('smoke', ev.x, 0.2, ev.z, 7, { color: SSTONE, speed: [1.4, 2.6], up: [0.05, 0.3], size: [0.42, 0.6], grow: 1.6, life: [0.7, 1.1], opacity: 0.32, gravity: -0.05, drag: 2.2, jitter: 0.6 });
      spray('spark', ev.x, 0.4, ev.z, 8, { color: PARCH, speed: [1.8, 3.4], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.3] });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.65, 0.16);
    },
  });
  // SECOND CHAMPIONS (plan 4 slice 8): Acts I to IV's second lords. Their
  // own matter on what breaks, Ember only on the ground that hurts.
  const CH_MOSS = vfxMatterColor('moss');
  const CH_LICHEN = vfxMatterColor('lichen');
  const CH_RUST = vfxMatterColor('rust');
  const CH_GBRONZE = vfxMatterColor('gravebronze');
  const CH_CINDER = vfxMatterColor('cinder');
  Object.assign(CHAMP_MOVE, {
    // Moss Hart: the rack flung up through the cone — a lichen-lit arc along
    // the cone's rim, the Ember edge on its ground, torn moss and turf
    // thrown down the cone, a pale sweep at antler height.
    antler_toss(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const ang = Math.atan2(d.z, d.x);
      const R = 3.0;
      const half = 55 * (Math.PI / 180);
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const a0 = ang - half + (i / segs) * 2 * half;
        const a1 = ang - half + ((i + 1) / segs) * 2 * half;
        kit.streak({ a: { x: ev.x + Math.cos(a0) * R, y: 1.6, z: ev.z + Math.sin(a0) * R }, b: { x: ev.x + Math.cos(a1) * R, y: 1.9, z: ev.z + Math.sin(a1) * R }, width: 0.2, tailW: 0.08, core: PARCH, glow: CH_LICHEN, life: 0.3, fall: 1.4, delay: i * 0.014 });
        kit.streak({ a: { x: ev.x + Math.cos(a0) * R * 0.95, y: 0.08, z: ev.z + Math.sin(a0) * R * 0.95 }, b: { x: ev.x + Math.cos(a1) * R * 0.95, y: 0.08, z: ev.z + Math.sin(a1) * R * 0.95 }, width: 0.32, tailW: 0.32, core: EMBER, glow: EMBER, life: 0.22, fall: 2, opacity: 0.6, delay: i * 0.014 });
      }
      kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * R, y: 0.1, z: ev.z + d.z * R }, width: R * 1.4, tailW: R * 1.2, core: EMBER, glow: EMBER, life: 0.2, fall: 2.2, opacity: 0.35 });
      SF.flare(ev.x + d.x * 1.2, 1.4, ev.z + d.z * 1.2, CH_LICHEN, 2.0, { kind: 'burst', life: 0.26, angle: ang });
      spray('shard', ev.x + d.x * 1.0, 0.6, ev.z + d.z * 1.0, 18, { color: CH_MOSS, tile: SHARD_TILE.petal, speed: [1.6, 3.4], up: [1.2, 2.6], size: [0.12, 0.18], life: [0.9, 1.4], gravity: 1.6, drag: 1.2, spin: [-6, 6], flutter: 0.5, dir: d, dirBias: 0.75, jitter: 0.5 });
      spray('chunk', ev.x + d.x * 1.4, 0.3, ev.z + d.z * 1.4, 10, { color: vfxMatterColor('earth'), speed: [1.4, 3.0], up: [1.4, 2.6], size: [0.07, 0.14], life: [0.5, 0.9], dir: d, dirBias: 0.7, jitter: 0.5 });
      spray('spark', ev.x + d.x * 1.0, 1.6, ev.z + d.z * 1.0, 10, { color: CH_LICHEN, speed: [0.6, 1.8], up: [0.4, 1.4], size: [0.04, 0.08], life: [0.6, 1.0], gravity: -0.2, drag: 1.4, dir: d, dirBias: 0.6, jitter: 0.6 });
      kit.mark({ x: ev.x + d.x * 1.6, z: ev.z + d.z * 1.6, radius: 2.0, kind: 'gouge', angle: ang + Math.PI / 2, stretch: 2.0, stain: vfxMatterColor('earth'), glow: EMBER, cool: 0.6, life: 2.6, opacity: 0.4 });
      camfx.kick(d.x, d.z, 0.45, 0.13);
    },
    // ... and Hart's Leap landing: a heavy crash of hooves — white-hot
    // impact, the Ember ring, a crater of turf, a ring of moss torn up and
    // lichen motes rising, the dust rolling out.
    harts_leap(ev) {
      const r = 2.0;
      SF.flare(ev.x, 0.45, ev.z, EMBER, 2.0, { kind: 'burst', life: 0.26 });
      kit.flash({ x: ev.x, y: 0.5, z: ev.z, color: PARCH, size: 1.2, life: 0.14 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.32, width: 0.16, jag: 0.6 });
      SF.shock(ev.x, ev.z, r * 1.5, CH_MOSS, { life: 0.6, width: 0.26, core: CH_LICHEN, delay: 0.05, jag: 0.8 });
      SF.spikes(ev.x, ev.z, r * 0.9, 12, CH_MOSS, { h: 0.5, life: 0.55, core: CH_LICHEN, delay: 0.03 });
      kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: EMBER, life: 1.6, cool: 0.5 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.2, kind: 'crater', stain: vfxMatterColor('earth'), glow: EMBER, glowOpacity: 0.4, cool: 0.9, life: 4, opacity: 0.5 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: EMBER, opacity: 0.4, life: 0.4, attack: 0.02 });
      spray('chunk', ev.x, 0.3, ev.z, 14, { color: vfxMatterColor('earth'), speed: [1.2, 2.8], up: [1.6, 3.2], size: [0.08, 0.16], life: [0.55, 0.9], jitter: 0.4 });
      spray('shard', ev.x, 0.5, ev.z, 16, { color: CH_MOSS, tile: SHARD_TILE.petal, speed: [1.0, 2.4], up: [1.2, 2.4], size: [0.12, 0.18], life: [1.0, 1.6], gravity: 1.2, drag: 1.3, spin: [-6, 6], flutter: 0.6, jitter: 0.6 });
      spray('spark', ev.x, 0.4, ev.z, 12, { color: CH_LICHEN, speed: [0.2, 0.8], up: [0.8, 1.8], size: [0.04, 0.08], life: [1.0, 1.6], gravity: -0.3, drag: 1.4, jitter: 0.9 });
      spray('smoke', ev.x, 0.2, ev.z, 7, { color: vfxMatterColor('earth'), speed: [1.4, 2.6], up: [0.05, 0.3], size: [0.42, 0.6], grow: 1.6, life: [0.7, 1.1], opacity: 0.3, gravity: -0.05, drag: 2.2, jitter: 0.6 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.65, 0.16);
    },
    // Lockkeeper: the key flies down the lane trailing its chain — a rust
    // streak with sparks off the links, the Ember lane, a splash where the
    // key bites; then the chain reels back in.
    chain_hook(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = SF.byId(ev.id);
      const ox = c ? c.x : ev.x - d.x * 5;
      const oz = c ? c.z : ev.z - d.z * 5;
      const len = Math.hypot(ev.x - ox, ev.z - oz) || 6;
      kit.streak({ a: { x: ox, y: 0.1, z: oz }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 0.9, tailW: 0.8, core: EMBER, glow: EMBER, life: 0.22, fall: 2.2, opacity: 0.5 });
      kit.streak({ a: { x: ox + d.x * 0.6, y: 1.3, z: oz + d.z * 0.6 }, b: { x: ev.x, y: 0.9, z: ev.z }, width: 0.12, tailW: 0.05, core: PARCH, glow: CH_RUST, life: 0.4, fall: 1.2, opacity: 0.85 });
      const n = Math.max(4, Math.round(len / 0.7));
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        after(k * 0.12, () => spray('spark', ox + d.x * len * k, 1.1 - 0.2 * k, oz + d.z * len * k, 1, { color: CH_RUST, speed: [0.4, 1.2], up: [0.2, 0.8], size: [0.04, 0.07], life: [0.3, 0.5], jitter: 0.2 }));
      }
      SF.flare(ev.x, 0.8, ev.z, EMBER, 1.6, { kind: 'star', life: 0.2, angle: Math.atan2(d.z, d.x) });
      spray('shard', ev.x, 0.5, ev.z, 12, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.0, 2.2], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3, jitter: 0.5 });
      spray('chunk', ev.x, 0.4, ev.z, 5, { color: CH_RUST, speed: [0.8, 1.6], up: [0.8, 1.6], size: [0.05, 0.09], life: [0.5, 0.8] });
      // The reel: a second streak back toward the keeper.
      after(0.18, () => {
        kit.streak({ a: { x: ev.x, y: 0.9, z: ev.z }, b: { x: ox + d.x * 0.8, y: 1.2, z: oz + d.z * 0.8 }, width: 0.09, tailW: 0.03, core: PARCH, glow: CH_RUST, life: 0.3, fall: 1.4, opacity: 0.7 });
        if ((ev.hooked ?? 0) > 0) spray('smoke', ev.x, 0.15, ev.z, 4, { color: CH_SILT, speed: [0.6, 1.4], up: [0.05, 0.2], size: [0.4, 0.55], grow: 1.4, life: [0.7, 1.0], opacity: 0.3, drag: 2.4, dir: { x: -d.x, z: -d.z }, dirBias: 0.7 });
      });
      camfx.kick(-d.x, -d.z, 0.4, 0.12);
    },
    // ... and Lock Turn: the key driven into the floor and turned — a ring
    // of iron teeth bursting up, the Ember ring, a turning gold-less ring of
    // rust sparks, the floor's water thrown up.
    lock_turn(ev) {
      const r = 2.5;
      SF.spikes(ev.x, ev.z, r, 14, CH_RUST, { h: 0.7, life: 0.55, core: PARCH });
      SF.flare(ev.x, 0.5, ev.z, EMBER, 2.0, { kind: 'star', life: 0.26, spin: 0.8 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.35, width: 0.16, jag: 0.5 });
      SF.shock(ev.x, ev.z, r * 1.3, CH_RUST, { life: 0.55, width: 0.22, core: PARCH, delay: 0.06 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: r * 0.9, width: 0.1, life: 0.5, core: PARCH, glow: CH_RUST, soft: 0.5, y: 0.08, opacity: 0.7 });
      kit.crack({ x: ev.x, z: ev.z, radius: r * 0.75, glow: EMBER, life: 1.6, cool: 0.5 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: EMBER, opacity: 0.45, life: 0.4, attack: 0.02 });
      for (let i = 0; i < N(10); i++) {
        const a = (i / 10) * TAU;
        spray('spark', ev.x + Math.cos(a) * r * 0.85, 0.3, ev.z + Math.sin(a) * r * 0.85, 1, { color: CH_RUST, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.04, 0.07], life: [0.4, 0.7], dir: { x: -Math.sin(a), z: Math.cos(a) }, dirBias: 0.8 });
      }
      spray('shard', ev.x, 0.3, ev.z, 18, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [0.8, 2.0], up: [1.6, 3.0], size: [0.1, 0.15], life: [0.6, 0.9], gravity: 7, drag: 0.3, jitter: 0.8 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.1, kind: 'splash', stain: CH_SILT, glow: EMBER, glowOpacity: 0.25, cool: 0.8, life: 3, opacity: 0.4 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.55, 0.15);
    },
    // Gravebell Ringer: the knell — rings of sound off the bell's mouth at
    // its height, the Ember edge on the floor, ash shaken out of the
    // ground in a ring, a low violet-free grey light.
    death_knell(ev) {
      const r = 3.6;
      const c = SF.byId(ev.id);
      const x = c ? c.x : ev.x;
      const z = c ? c.z : ev.z;
      SF.flare(x, 2.6, z, CH_GBRONZE, 2.4, { kind: 'burst', life: 0.32, core: PARCH });
      for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.4, r1: r * (0.7 + 0.25 * i), width: 0.1, life: 0.55 + 0.12 * i, core: PARCH, glow: CH_GBRONZE, soft: 0.6, y: 2.4 - i * 0.7, delay: i * 0.08, opacity: 0.6, thin: 0.5 });
      SF.shock(ev.x, ev.z, r * 1.02, EMBER, { life: 0.4, width: 0.18 });
      SF.shock(ev.x, ev.z, r * 1.35, CH_CINDER, { life: 0.65, width: 0.28, core: BONE, delay: 0.08 });
      for (let i = 0; i < N(12); i++) {
        const a = (i / 12) * TAU + rnd(-0.2, 0.2);
        spray('smoke', ev.x + Math.cos(a) * r * 0.8, 0.15, ev.z + Math.sin(a) * r * 0.8, 1, { color: CH_CINDER, speed: [0.3, 0.8], up: [0.2, 0.6], size: [0.4, 0.55], grow: 1.5, life: [0.8, 1.2], opacity: 0.3, gravity: -0.1, drag: 2.0, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.6 });
      }
      spray('spark', x, 2.4, z, 14, { color: CH_GBRONZE, speed: [1.0, 2.4], up: [-0.2, 0.6], size: [0.04, 0.08], life: [0.4, 0.7], drag: 1.2, jitter: 0.4 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: BONE, opacity: 0.3, life: 0.5 });
      kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'scorch', stain: INK, glow: EMBER, glowOpacity: 0.2, cool: 0.8, life: 3, opacity: 0.25 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.45, 0.16);
    },
    // ... and Grave Call: the grave opens under the mark — an ash geyser
    // with Ember coals in it, bone chips, the smouldering bed left behind.
    grave_call(ev) {
      const r = 1.8;
      kit.pillar({ x: ev.x, z: ev.z, radius: r * 0.55, height: 2.8, color: CH_CINDER, life: 0.7, opacity: 0.55 });
      SF.flare(ev.x, 0.4, ev.z, EMBER, 1.8, { kind: 'burst', life: 0.24 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.3, width: 0.14, jag: 0.7 });
      kit.crack({ x: ev.x, z: ev.z, radius: r * 0.9, glow: EMBER, life: 2.0, cool: 0.6 });
      spray('smoke', ev.x, 0.3, ev.z, 10, { color: CH_CINDER, speed: [0.3, 0.9], up: [1.6, 3.0], size: [0.45, 0.65], grow: 1.7, life: [1.0, 1.5], opacity: 0.4, gravity: -0.2, drag: 1.4, jitter: 0.5 });
      spray('spark', ev.x, 0.4, ev.z, 16, { color: EMBER, speed: [0.4, 1.2], up: [1.6, 3.2], size: [0.04, 0.08], life: [0.6, 1.1], gravity: 2, drag: 0.8, jitter: 0.5 });
      spray('chunk', ev.x, 0.3, ev.z, 10, { color: CH_BONE, speed: [0.8, 2.0], up: [1.6, 3.0], size: [0.06, 0.12], life: [0.6, 0.9], jitter: 0.4 });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.15, kind: 'crater', stain: INK, glow: EMBER, glowOpacity: 0.45, cool: 1.2, life: 5, opacity: 0.5 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.4, 0.12);
    },
    // Vein Matron: the whip cracks down the lane — a violet streak with a
    // white-hot crack at its tip, the Ember lane; what she drinks streams
    // back to her heart as violet motes.
    vein_lash(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = SF.byId(ev.id);
      const ox = c ? c.x : ev.x - d.x * 5;
      const oz = c ? c.z : ev.z - d.z * 5;
      kit.streak({ a: { x: ox, y: 0.1, z: oz }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 1.0, tailW: 0.9, core: EMBER, glow: EMBER, life: 0.22, fall: 2.2, opacity: 0.5 });
      kit.streak({ a: { x: ox + d.x * 0.5, y: 1.9, z: oz + d.z * 0.5 }, b: { x: ev.x, y: 0.6, z: ev.z }, width: 0.16, tailW: 0.06, core: CH_PEAK, glow: CH_VEIN, life: 0.32, fall: 1.4, opacity: 0.9 });
      SF.flare(ev.x, 0.6, ev.z, CH_PEAK, 1.6, { kind: 'star', life: 0.18, angle: Math.atan2(d.z, d.x) });
      spray('shard', ev.x, 0.5, ev.z, 10, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 2.6], up: [0.4, 1.2], size: [0.08, 0.12], life: [0.4, 0.7], gravity: 3, spin: [-8, 8], dir: d, dirBias: 0.5 });
      kit.mark({ x: (ox + ev.x) / 2, z: (oz + ev.z) / 2, radius: 1.2, kind: 'gouge', angle: Math.atan2(d.z, d.x), stretch: 3.0, stain: INK, glow: CH_VEIN, glowOpacity: 0.3, cool: 0.8, life: 2.4, opacity: 0.35 });
      if ((ev.drank ?? 0) > 0 && c) {
        for (let i = 0; i < N(8); i++) {
          const k = rnd(0.3, 1);
          const px = ox + (ev.x - ox) * k;
          const pz = oz + (ev.z - oz) * k;
          kit.streak({ a: { x: px, y: 0.8, z: pz }, b: { x: px, y: 0.95, z: pz }, width: 0.05, tailW: 0, core: CH_PEAK, glow: CH_VEIN, life: 0.45, delay: 0.1 + i * 0.03, travel: { x: (c.x - px) * 2, y: 2.0, z: (c.z - pz) * 2 }, fall: 0, opacity: 0.85 });
        }
        after(0.4, () => {
          const m = SF.byId(ev.id);
          if (m) kit.flash({ x: m.x, y: 1.8, z: m.z, color: CH_VEIN, size: 1.2, life: 0.25 });
        });
      }
      camfx.kick(d.x, d.z, 0.35, 0.12);
    },
    // ... and Heart Pulse: the heart beats — a violet burst at the chest,
    // two rings of the beat, Ember where it hurts, the floor's veins lit.
    heart_pulse(ev) {
      const r = 2.8;
      const c = SF.byId(ev.id);
      const x = c ? c.x : ev.x;
      const z = c ? c.z : ev.z;
      SF.flare(x, 1.8, z, CH_VEIN, 2.6, { kind: 'burst', life: 0.32, core: CH_PEAK, spin: 0.6 });
      kit.flash({ x, y: 1.8, z, color: CH_PEAK, size: 1.3, life: 0.16 });
      SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.36, width: 0.18 });
      SF.shock(ev.x, ev.z, r * 1.45, CH_VEIN, { life: 0.6, width: 0.26, core: CH_PEAK, delay: 0.08 });
      kit.ring({ x, z, r0: 0.4, r1: r, width: 0.12, life: 0.4, core: CH_PEAK, glow: CH_VEIN, soft: 0.5, y: 1.8, opacity: 0.75 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: CH_VEIN, opacity: 0.5, life: 0.5 });
      kit.crack({ x: ev.x, z: ev.z, radius: r * 0.9, glow: CH_VEIN, life: 2.0, cool: 0.7 });
      spray('shard', x, 1.4, z, 14, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.4, 3.0], up: [0.4, 1.4], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 4, spin: [-10, 10], jitter: 0.6 });
      kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'scorch', stain: INK, glow: CH_VEIN, cool: 1.0, life: 3, opacity: 0.3 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.5, 0.15);
    },
  });
  // THE BELL ABBESS (content plan 5 slice 2): the Spire's bronze and pale
  // air on what she moves, Ember only on the ground that hurts, and the
  // Hush's drained lavender on what her peal stills.
  const CH_LINEN = GUST; // her wimple's starched linen
  const CH_STILL = vfxMatterColor('hushpale');
  Object.assign(CHAMP_MOVE, {
    // Rope Swing: she has ridden the rope down the lane — the great bell
    // tolls far overhead, a pale ribbon of cut air hangs along her arc, the
    // Ember lane flashes under it, and she drops at its end in a burst of
    // dust and stone; the heroes in it are knocked out to the sides.
    rope_swing(ev) {
      const c = SF.byId(ev.id);
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const ex = c ? c.x : ev.x;
      const ez = c ? c.z : ev.z;
      // (ev.x, ev.z is the lane's end; the lane ran back from it along -d.)
      const len = ev.len ?? 5;
      const ox = ev.x - d.x * len;
      const oz = ev.z - d.z * len;
      const ang = Math.atan2(d.z, d.x);
      kit.streak({ a: { x: ox, y: 0.1, z: oz }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 1.2, tailW: 1.0, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.5 });
      // The arc of her ride: a pale ribbon rising over the lane and down.
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const k0 = i / segs;
        const k1 = (i + 1) / segs;
        const y0 = 1.3 + 1.1 * Math.sin(Math.PI * k0);
        const y1 = 1.3 + 1.1 * Math.sin(Math.PI * k1);
        kit.streak({ a: { x: ox + d.x * len * k0, y: y0, z: oz + d.z * len * k0 }, b: { x: ox + d.x * len * k1, y: y1, z: oz + d.z * len * k1 }, width: 0.16, tailW: 0.06, core: PARCH, glow: GUST, life: 0.45, fall: 1.1, delay: i * 0.012, opacity: 0.7 });
      }
      // The great bell's toll overhead, at the rope's anchor.
      const mx = (ox + ev.x) / 2;
      const mz = (oz + ev.z) / 2;
      SF.flare(mx, 5.2, mz, BRONZE, 2.2, { kind: 'burst', life: 0.35, core: PARCH });
      for (let i = 0; i < 2; i++) kit.ring({ x: mx, z: mz, r0: 0.4, r1: 2.6 + i * 1.2, width: 0.08, life: 0.7 + 0.15 * i, core: PARCH, glow: BRONZE, soft: 0.6, y: 5.0 - i * 0.6, delay: i * 0.1, opacity: 0.5, thin: 0.5 });
      // The drop at the lane's end.
      SF.flare(ex, 0.5, ez, EMBER, 1.8, { kind: 'burst', life: 0.24 });
      kit.flash({ x: ex, y: 0.6, z: ez, color: PARCH, size: 1.0, life: 0.12 });
      SF.shock(ex, ez, 1.5, EMBER, { life: 0.3, width: 0.14, jag: 0.5 });
      SF.shock(ex, ez, 2.1, SSTONE, { life: 0.55, width: 0.22, core: BONE, delay: 0.05 });
      kit.light({ x: ex, z: ez, radius: 2.2, color: EMBER, opacity: 0.35, life: 0.35, attack: 0.02 });
      spray('chunk', ex, 0.3, ez, 10, { color: SSTONE, speed: [1.0, 2.4], up: [1.2, 2.6], size: [0.07, 0.14], life: [0.5, 0.85], jitter: 0.4 });
      spray('smoke', ex, 0.2, ez, 6, { color: SSTONE, speed: [1.2, 2.2], up: [0.05, 0.3], size: [0.4, 0.56], grow: 1.6, life: [0.7, 1.0], opacity: 0.28, gravity: -0.05, drag: 2.2, jitter: 0.6 });
      // Linen and dust thrown out to both sides of the lane (the knock).
      for (const side of [-1, 1]) {
        const sx = -d.z * side;
        const sz = d.x * side;
        spray('smoke', mx, 0.2, mz, 3, { color: SSTONE, speed: [1.4, 2.4], up: [0.05, 0.2], size: [0.36, 0.5], grow: 1.5, life: [0.6, 0.9], opacity: 0.22, drag: 2.4, dir: { x: sx, z: sz }, dirBias: 0.85 });
        spray('shard', mx, 1.0, mz, 4, { color: CH_LINEN, tile: SHARD_TILE.feather, speed: [1.0, 2.0], up: [0.4, 1.0], size: [0.1, 0.15], life: [1.0, 1.5], gravity: 0.6, drag: 1.6, spin: [-6, 6], flutter: 0.8, dir: { x: sx, z: sz }, dirBias: 0.7 });
      }
      kit.mark({ x: mx, z: mz, radius: 1.2, kind: 'gouge', angle: ang, stretch: Math.max(1.5, len / 1.6), stain: INK, glow: EMBER, glowOpacity: 0.25, cool: 0.7, life: 2.4, opacity: 0.3 });
      camfx.kick(d.x, d.z, 0.55, 0.15);
    },
    // Vesper Peal: the hand-bell rings out down the cone — bronze arcs of
    // sound rolling out one after another, the Ember edge on the ground, and
    // where it lands the air goes still: drained lavender motes hang and
    // sink instead of flying.
    vesper_peal(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const ang = Math.atan2(d.z, d.x);
      const R = 4.4;
      const half = 36 * (Math.PI / 180);
      const c = SF.byId(ev.id);
      SF.flare(ev.x + d.x * 0.5, 2.0, ev.z + d.z * 0.5, BRONZE, 2.2, { kind: 'burst', life: 0.3, core: PARCH, angle: ang });
      kit.flash({ x: ev.x + d.x * 0.5, y: 2.0, z: ev.z + d.z * 0.5, color: PARCH, size: 1.0, life: 0.14 });
      // Three arcs of the peal, each wider and later, rolling down the cone.
      const segs = 7;
      for (let w = 0; w < 3; w++) {
        const r = R * (0.45 + 0.27 * w);
        for (let i = 0; i < segs; i++) {
          const a0 = ang - half + (i / segs) * 2 * half;
          const a1 = ang - half + ((i + 1) / segs) * 2 * half;
          kit.streak({ a: { x: ev.x + Math.cos(a0) * r, y: 1.2 - 0.25 * w, z: ev.z + Math.sin(a0) * r }, b: { x: ev.x + Math.cos(a1) * r, y: 1.2 - 0.25 * w, z: ev.z + Math.sin(a1) * r }, width: 0.14, tailW: 0.1, core: PARCH, glow: BRONZE, life: 0.35, fall: 1.2, delay: 0.06 * w + i * 0.008, opacity: 0.75 - 0.15 * w });
        }
      }
      // The Ember rim and floor of the cone.
      for (let i = 0; i < segs; i++) {
        const a0 = ang - half + (i / segs) * 2 * half;
        const a1 = ang - half + ((i + 1) / segs) * 2 * half;
        kit.streak({ a: { x: ev.x + Math.cos(a0) * R * 0.97, y: 0.08, z: ev.z + Math.sin(a0) * R * 0.97 }, b: { x: ev.x + Math.cos(a1) * R * 0.97, y: 0.08, z: ev.z + Math.sin(a1) * R * 0.97 }, width: 0.3, tailW: 0.3, core: EMBER, glow: EMBER, life: 0.22, fall: 2, opacity: 0.55, delay: 0.1 });
      }
      kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * R, y: 0.1, z: ev.z + d.z * R }, width: R * 1.1, tailW: R * 1.0, core: EMBER, glow: EMBER, life: 0.2, fall: 2.2, opacity: 0.3 });
      // The stilled air: motes that hang, then sink slowly.
      for (let i = 0; i < N(14); i++) {
        const a = ang + rnd(-half, half);
        const r = rnd(1.0, R * 0.95);
        spray('spark', ev.x + Math.cos(a) * r, rnd(0.6, 1.8), ev.z + Math.sin(a) * r, 1, { color: CH_STILL, speed: [0.0, 0.06], up: [-0.15, 0.0], size: [0.05, 0.09], life: [1.0, 1.5], gravity: 0.15, drag: 3, opacity: 0.85 });
      }
      kit.light({ x: ev.x + d.x * 2, z: ev.z + d.z * 2, radius: R * 0.8, color: CH_STILL, opacity: 0.3, life: 0.6 });
      if (c && (ev.victims ?? 0) > 0) after(0.12, () => kit.ring({ x: c.x + d.x * 2.2, z: c.z + d.z * 2.2, r0: 0.6, r1: 2.0, width: 0.06, life: 0.8, core: PARCH, glow: CH_STILL, soft: 0.7, y: 0.06, opacity: 0.45 }));
      camfx.kick(d.x, d.z, 0.35, 0.12);
    },
    // THE EMBER KILN (content plan 5 slice 9). Molten Rush: the Furnace
    // Knight sets off down the lane (its slag is the slicks it drops), a
    // gold-hot wake behind it, the Ember head on the rush.
    molten_rush(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = SF.byId(ev.id);
      const len = c && c.charge ? c.charge.left * Math.hypot(c.charge.vx, c.charge.vz) : 5;
      SF.laneDrive(c ? c.x : ev.x, c ? c.z : ev.z, d, len, 8.6, { wake: KGOLD, wakeW: 1.0, head: EMBER, peak: KHEAT, stain: SLAGC, glow: KGOLD, marks: 4 });
      spray('spark', c ? c.x : ev.x, 0.3, c ? c.z : ev.z, 12, { color: KSPARK, speed: [1.0, 2.4], up: [0.5, 1.2], size: [0.03, 0.06], life: [0.3, 0.55], gravity: 4, drag: 0.8, dir: { x: -d.x, z: -d.z }, dirBias: 0.6 });
      spray('chunk', c ? c.x : ev.x, 0.2, c ? c.z : ev.z, 5, { color: SLAGC, speed: [0.8, 1.8], up: [0.6, 1.4], size: [0.06, 0.12], life: [0.4, 0.7], dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
      camfx.kick(d.x, d.z, 0.4, 0.14);
    },
    // Grate Blast: the furnace roars out of the grate — the Ember edge over
    // the cone (the hit), gold fire fronts rolling out, white-gold cinders
    // racing down it, a scorched fan and the heat-light under it.
    grate_blast(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const ang = Math.atan2(d.z, d.x);
      const R = 3.8;
      const half = 40 * (Math.PI / 180);
      const gx = ev.x + d.x * 0.45;
      const gz = ev.z + d.z * 0.45;
      SF.flare(gx, FK_GRATE_Y, gz, KGOLD, 2.2, { kind: 'burst', life: 0.28, core: KHEAT, angle: ang });
      kit.flash({ x: gx, y: FK_GRATE_Y, z: gz, color: KHEAT, size: 1.2, life: 0.16 });
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: R * 0.55, width: R * 0.9, span: half * 2, sweep: 0.05, life: 0.26, core: EMBER, glow: EMBER, soft: 0.8, y: 0.12, lift: 0, grow: 0.3, gain: 0.5, opacity: 0.45 });
      for (let i = 0; i < 5; i++) {
        kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 0.6 + i * 0.7, width: 0.22 - i * 0.03, span: half * 2 * (0.75 + i * 0.07), sweep: 0.04, life: 0.36, core: i < 2 ? KHEAT : KSPARK, glow: KGOLD, soft: 0.55, y: FK_GRATE_Y * 0.7 - 0.18 * i, lift: 0, grow: 1.3, delay: i * 0.05, gain: 1.0 - i * 0.15, opacity: 0.95 - i * 0.15 });
      }
      for (let i = 0; i < N(12); i++) {
        const a = ang + rnd(-half, half) * 0.95;
        const ux = Math.cos(a);
        const uz = Math.sin(a);
        const sp = rnd(7, 11);
        const reach = R * rnd(0.75, 1.0);
        const y0 = rnd(0.6, FK_GRATE_Y);
        kit.streak({ a: { x: gx, y: y0, z: gz }, b: { x: gx + ux * 0.4, y: y0, z: gz + uz * 0.4 }, width: 0.06, tailW: 0, core: KHEAT, glow: KGOLD, life: reach / sp, delay: rnd(0, 0.08), travel: { x: ux * sp, y: -y0 * 0.5 * (sp / reach), z: uz * sp }, fall: 1.0, opacity: 0.9 });
      }
      spray('spark', gx, FK_GRATE_Y - 0.2, gz, 26, { color: KSPARK, speed: [3.0, 6.0], up: [-0.2, 0.8], size: [0.03, 0.07], life: [0.35, 0.65], gravity: 1.5, drag: 1.4, dir: d, dirBias: 0.9 });
      spray('smoke', ev.x + d.x * R * 0.6, 0.3, ev.z + d.z * R * 0.6, 5, { color: KBRICK, speed: [0.5, 1.0], up: [0.3, 0.7], size: [0.36, 0.52], grow: 1.5, life: [0.8, 1.2], opacity: 0.28, gravity: -0.25, drag: 2.0, dir: d, dirBias: 0.6, jitter: R * 0.15 });
      kit.mark({ x: ev.x + d.x * R * 0.55, z: ev.z + d.z * R * 0.55, radius: R * 0.6, kind: 'gouge', angle: ang, stretch: 1.6, stain: INK, glow: KGOLD, glowOpacity: 0.45, cool: 1.0, life: 3.0, opacity: 0.3 });
      kit.light({ x: ev.x + d.x * R * 0.5, z: ev.z + d.z * R * 0.5, radius: R * 0.7, color: KGOLD, opacity: 0.5, life: 0.5, attack: 0.02 });
      camfx.kick(d.x, d.z, 0.5, 0.14);
    },
    // Glass Bubble: the bubble drifts off the pipe over the mark and bursts
    // — a white-gold pop, the Ember ring (the hit), a sphere of glittering
    // glass needles flung out and falling, a ring of heat. The shards left
    // behind are the slick (extras.js, variant 'glass').
    glass_bubble(ev) {
      const c = SF.byId(ev.id);
      const d = faceOf(c);
      const r = 2.1;
      if (c) {
        // The bubble's drift, seen as a glowing orb sliding from the pipe to
        // the mark just before it bursts.
        const tx = c.x + d.x * GB_PIPE;
        const tz = c.z + d.z * GB_PIPE;
        kit.streak({ a: { x: tx, y: GB_TIP_Y + 0.4, z: tz }, b: { x: ev.x, y: 1.2, z: ev.z }, width: 0.3, tailW: 0.05, core: KHEAT, glow: GLASSC, life: 0.18, fall: 1.4, opacity: 0.5 });
      }
      SF.flare(ev.x, 1.0, ev.z, GLASSC, 1.8, { kind: 'burst', life: 0.26, core: PARCH });
      kit.flash({ x: ev.x, y: 1.0, z: ev.z, color: KHEAT, size: 1.4, life: 0.16 });
      SF.shock(ev.x, ev.z, r * 1.02, EMBER, { life: 0.3, width: 0.12, jag: 0.4 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: r * 1.4, width: 0.12, life: 0.5, core: KHEAT, glow: GLASSC, soft: 0.55, y: 0.9, opacity: 0.55, thin: 0.5 });
      spray('shard', ev.x, 1.0, ev.z, 26, { color: GLASSC, tile: SHARD_TILE.needle, speed: [1.4, 3.2], up: [0.6, 2.4], size: [0.08, 0.13], life: [0.6, 1.0], gravity: 6, spin: [-12, 12], jitter: 0.4 });
      spray('spark', ev.x, 1.0, ev.z, 14, { color: PARCH, speed: [0.6, 1.8], up: [0.4, 1.6], size: [0.03, 0.05], life: [0.4, 0.8], gravity: 3, drag: 1.0, jitter: 0.5 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: GLASSC, opacity: 0.45, life: 0.5, attack: 0.02 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.35, 0.12);
    },
    // Glass Gout: a rope of molten glass sprays down the lane, the Ember
    // edge on it (the hit), gold beads spattering off and cooling.
    glass_gout(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = SF.byId(ev.id);
      const len = 6.5;
      const x0 = (c ? c.x : ev.x) + d.x * GB_PIPE;
      const z0 = (c ? c.z : ev.z) + d.z * GB_PIPE;
      const ang = Math.atan2(d.z, d.x);
      const SPEED = 16;
      kit.streak({ a: { x: x0, y: 0.1, z: z0 }, b: { x: x0 + d.x * len, y: 0.1, z: z0 + d.z * len }, width: 1.0, tailW: 0.9, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.4 });
      kit.streak({ a: { x: x0, y: GB_TIP_Y, z: z0 }, b: { x: x0 + d.x * len, y: 0.5, z: z0 + d.z * len }, width: 0.28, tailW: 0.14, core: KHEAT, glow: GLASSC, life: len / SPEED + 0.3, fall: 1.2, opacity: 0.9 });
      SF.flare(x0, GB_TIP_Y, z0, GLASSC, 1.2, { kind: 'burst', life: 0.2, core: KHEAT, angle: ang });
      const steps = 5;
      for (let i = 0; i < steps; i++) {
        const k = (i + 0.7) / steps;
        const px = x0 + d.x * len * k;
        const pz = z0 + d.z * len * k;
        after((len * k) / SPEED, () => {
          spray('spark', px, 0.4, pz, 4, { color: GLASSC, speed: [0.6, 1.6], up: [0.6, 1.4], size: [0.04, 0.08], life: [0.4, 0.7], gravity: 6, drag: 0.6 });
          kit.mark({ x: px, z: pz, radius: 0.6, kind: 'scorch', stain: INK, glow: GLASSC, glowOpacity: 0.5, cool: 1.2, life: 2.6, opacity: 0.3 });
        });
      }
    },
  });
  bus.on('champion_move', (ev) => {
    mark(`champion_${ev.move}`);
    const fn = CHAMP_MOVE[ev.move];
    if (fn) fn(ev);
  });
  // The Briar Knight's charge stopping: on a wall, a crash; spent, a skid.
  bus.on('champion_charge_end', (ev) => {
    mark('champion_charge_end');
    const c = SF.byId(ev.id);
    const d = faceOf(c);
    const wall = ev.cause === 'wall';
    // The Furnace Knight's rush (content plan 5 slice 9): slag and gold
    // sparks instead of bramble and earth.
    if (ev.champion === 'furnace_knight') {
      SF.flare(ev.x + d.x * 0.6, 0.8, ev.z + d.z * 0.6, wall ? EMBER : KGOLD, wall ? 2.0 : 1.3, { kind: 'star', life: 0.24, angle: Math.atan2(d.z, d.x), core: KHEAT });
      SF.shock(ev.x, ev.z, wall ? 2.2 : 1.4, wall ? EMBER : KGOLD, { life: 0.35, width: 0.14, jag: wall ? 0.7 : 0 });
      spray('spark', ev.x + d.x * 0.5, 0.3, ev.z + d.z * 0.5, wall ? 20 : 12, { color: KSPARK, speed: [1.4, 3.0], up: [0.3, 1.2], size: [0.03, 0.06], life: [0.25, 0.5], gravity: 5, drag: 0.7, dir: d, dirBias: 0.7 });
      spray('chunk', ev.x + d.x * 0.6, 0.3, ev.z + d.z * 0.6, wall ? 10 : 5, { color: SLAGC, speed: [1.0, 2.4], up: [1.0, 2.2], size: [0.07, 0.13], life: [0.5, 0.85], dir: { x: -d.x, z: -d.z }, dirBias: 0.4, jitter: 0.4 });
      spray('smoke', ev.x, 0.2, ev.z, 3, { color: KBRICK, speed: [0.5, 1.1], up: [0.1, 0.3], size: [0.38, 0.52], grow: 1.4, life: [0.8, 1.1], opacity: 0.3, drag: 2.4, jitter: 0.5 });
      if (wall) camfx.kick(d.x, d.z, 0.7, 0.16);
      return;
    }
    SF.flare(ev.x + d.x * 0.6, 0.7, ev.z + d.z * 0.6, wall ? EMBER : CH_BRAMBLE, wall ? 2.0 : 1.2, { kind: 'star', life: 0.24, angle: Math.atan2(d.z, d.x) });
    SF.shock(ev.x, ev.z, wall ? 2.2 : 1.4, wall ? EMBER : CH_BRAMBLE, { life: 0.35, width: 0.14, jag: wall ? 0.7 : 0 });
    spray('chunk', ev.x + d.x * 0.6, 0.3, ev.z + d.z * 0.6, wall ? 12 : 6, { color: vfxMatterColor('earth'), speed: [1.0, 2.6], up: [1.0, 2.6], size: [0.08, 0.15], life: [0.5, 0.9], dir: { x: -d.x, z: -d.z }, dirBias: 0.4, jitter: 0.4 });
    spray('smoke', ev.x, 0.2, ev.z, 4, { color: vfxMatterColor('earth'), speed: [0.6, 1.2], up: [0.1, 0.3], size: [0.4, 0.55], grow: 1.4, life: [0.8, 1.1], opacity: 0.32, drag: 2.4, jitter: 0.5 });
    if (wall) camfx.kick(d.x, d.z, 0.7, 0.16);
  });
  // Their deaths, on top of enemyDeath's break: a gold column, the body's
  // matter flying, the camera leaning in.
  function championDeath(matter, color, x, z) {
    kit.pillar({ x, z, radius: 0.9, height: 5, color: CH_GOLD, life: 1.2, opacity: 0.6 });
    SF.flare(x, 1.2, z, CH_GOLD, 3.0, { kind: 'burst', life: 0.42, core: CH_GOLD_HOT, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4.2, width: 0.36, life: 0.9, core: CH_GOLD_HOT, glow: CH_GOLD, soft: 0.5, y: 0.06 });
    kit.light({ x, z, radius: 3.6, color: CH_GOLD, opacity: 0.6, life: 1.2 });
    kit.mark({ x, z, radius: 2.6, kind: 'crater', stain: vfxMatterColor('ash'), glow: CH_GOLD, cool: 1.6, life: 6, opacity: 0.55 });
    spray('chunk', x, 0.6, z, 14, { color: matter, speed: [1.2, 2.8], up: [1.8, 3.4], size: [0.1, 0.18], life: [0.7, 1.1], jitter: 0.6 });
    spray('spark', x, 0.8, z, 24, { color, speed: [0.4, 1.6], up: [0.8, 2.4], size: [0.05, 0.11], life: [1.0, 1.8], gravity: -0.3, drag: 1.2, jitter: 0.8 });
    camfx.dolly(x, z, 0.6, 0.5);
  }
  Object.assign(CREATURE_DEATH, {
    briar_knight: (es, matter, x, z) => {
      mark('briar_knight_death');
      championDeath(CH_BRAMBLE, CH_GOLD, x, z);
      SF.spikes(x, z, 1.4, 10, CH_BRAMBLE, { h: 0.7, life: 0.6 });
    },
    sluice_warden: (es, matter, x, z) => {
      mark('sluice_warden_death');
      championDeath(vfxMatterColor('stone'), CH_GOLD, x, z);
      SF.ripples(x, z, 4, 3.0, 0.1);
      spray('shard', x, 0.6, z, 20, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.4], up: [2.0, 3.6], size: [0.1, 0.16], life: [0.6, 1.0], gravity: 7, drag: 0.3, jitter: 0.6 });
    },
    bone_reeve: (es, matter, x, z) => {
      mark('bone_reeve_death');
      championDeath(CH_BONE, CH_GOLD, x, z);
      spray('shard', x, 1.2, z, 16, { color: CH_BONE, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.4, 2.8], size: [0.1, 0.15], life: [0.7, 1.0], gravity: 5, spin: [-10, 10], jitter: 0.5 });
    },
    gale_herald: (es, matter, x, z) => {
      // It falls off its own wind: the horn's last note (a bronze ring), the
      // great wings breaking into a storm of stone feathers, a cold gust out.
      mark('gale_herald_death');
      championDeath(SSTONE, CH_GOLD, x, z);
      SF.flare(x, 1.9, z, GUST, 2.2, { kind: 'burst', life: 0.4, core: PARCH });
      kit.ring({ x, z, r0: 0.3, r1: 3.4, width: 0.08, life: 0.7, core: BRONZE, glow: BRONZE, soft: 0.6, y: 1.9, opacity: 0.6, thin: 0.5 });
      kit.ring({ x, z, r0: 0.6, r1: 5.0, width: 0.14, life: 0.8, core: PARCH, glow: GUST, soft: 0.6, y: 0.08, delay: 0.06, opacity: 0.55 });
      spray('shard', x, 1.8, z, 24, { color: SSTONE, tile: SHARD_TILE.feather, speed: [0.8, 2.4], up: [0.6, 2.0], size: [0.14, 0.22], life: [1.6, 2.4], gravity: 0.5, drag: 1.5, spin: [-6, 6], flutter: 0.85, jitter: 0.8 });
      spray('chunk', x, 1.6, z, 6, { color: BRONZE, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.06, 0.1], life: [0.6, 0.9] });
    },
    // SECOND CHAMPIONS (plan 4 slice 8).
    moss_hart: (es, matter, x, z) => {
      // It folds into the clearing: the rack's lichen goes out in a last
      // pale burst, the moss mantle tears loose in a storm of moss.
      mark('moss_hart_death');
      championDeath(vfxMatterColor('moss'), CH_GOLD, x, z);
      SF.flare(x, 2.2, z, vfxMatterColor('lichen'), 2.4, { kind: 'burst', life: 0.4, core: PARCH });
      spray('shard', x, 1.4, z, 26, { color: vfxMatterColor('moss'), tile: SHARD_TILE.petal, speed: [0.8, 2.4], up: [1.0, 2.4], size: [0.12, 0.2], life: [1.4, 2.2], gravity: 0.8, drag: 1.4, spin: [-6, 6], flutter: 0.7, jitter: 0.8 });
      spray('spark', x, 2.0, z, 18, { color: vfxMatterColor('lichen'), speed: [0.2, 0.8], up: [0.6, 1.6], size: [0.04, 0.08], life: [1.2, 2.0], gravity: -0.3, drag: 1.3, jitter: 1.0 });
    },
    lockkeeper: (es, matter, x, z) => {
      // The key drops and the chain goes slack: rust and links, his lantern
      // breaking in a pale splash.
      mark('lockkeeper_death');
      championDeath(vfxMatterColor('rust'), CH_GOLD, x, z);
      SF.ripples(x, z, 3, 2.6, 0.1);
      spray('chunk', x, 1.2, z, 12, { color: vfxMatterColor('rust'), speed: [0.8, 2.0], up: [1.0, 2.2], size: [0.05, 0.1], life: [0.6, 1.0], jitter: 0.5 });
      spray('shard', x, 0.8, z, 16, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.6, 3.0], size: [0.1, 0.15], life: [0.6, 0.9], gravity: 7, drag: 0.3, jitter: 0.6 });
    },
    gravebell_ringer: (es, matter, x, z) => {
      // The bell's last toll and its crack splitting: bronze shards, a ring
      // of sound, the bones going to ash.
      mark('gravebell_ringer_death');
      championDeath(CH_BONE, CH_GOLD, x, z);
      kit.ring({ x, z, r0: 0.4, r1: 4.2, width: 0.1, life: 0.8, core: PARCH, glow: vfxMatterColor('gravebronze'), soft: 0.6, y: 2.4, opacity: 0.6, thin: 0.5 });
      spray('chunk', x, 2.4, z, 10, { color: vfxMatterColor('gravebronze'), speed: [0.8, 2.0], up: [0.6, 1.6], size: [0.08, 0.14], life: [0.7, 1.0] });
      spray('smoke', x, 0.5, z, 8, { color: vfxMatterColor('cinder'), speed: [0.4, 1.0], up: [0.6, 1.4], size: [0.45, 0.65], grow: 1.6, life: [1.0, 1.6], opacity: 0.35, gravity: -0.2, drag: 1.6, jitter: 0.6 });
    },
    bell_abbess: (es, matter, x, z) => {
      // The rope parts and falls, the great bell's last toll rolls out over
      // the room, and her wimple's wings break into linen on the air.
      mark('bell_abbess_death');
      championDeath(vfxMatterColor('habit'), CH_GOLD, x, z);
      kit.streak({ a: { x, y: 6.5, z }, b: { x, y: 2.2, z }, width: 0.06, tailW: 0.02, core: PARCH, glow: vfxMatterColor('hemp'), life: 0.6, fall: 1.0, opacity: 0.7, travel: { x: 0, y: -2.0, z: 0 } });
      SF.flare(x, 5.0, z, BRONZE, 2.4, { kind: 'burst', life: 0.42, core: PARCH });
      for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.4, r1: 3.2 + i * 1.4, width: 0.08, life: 0.8 + 0.15 * i, core: PARCH, glow: BRONZE, soft: 0.6, y: 4.8 - i * 1.4, delay: i * 0.12, opacity: 0.55, thin: 0.5 });
      spray('shard', x, 2.6, z, 22, { color: GUST, tile: SHARD_TILE.feather, speed: [0.6, 2.0], up: [0.6, 1.8], size: [0.14, 0.22], life: [1.6, 2.4], gravity: 0.5, drag: 1.5, spin: [-6, 6], flutter: 0.85, jitter: 0.8 });
      spray('chunk', x, 1.4, z, 6, { color: BRONZE, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.06, 0.1], life: [0.6, 0.9] });
      spray('spark', x, 1.6, z, 14, { color: vfxMatterColor('hushpale'), speed: [0.1, 0.4], up: [0.2, 0.6], size: [0.05, 0.08], life: [1.4, 2.0], gravity: -0.1, drag: 2, jitter: 0.9 });
    },
    // THE EMBER KILN (content plan 5 slice 9).
    furnace_knight: (es, matter, x, z) => {
      // The furnace goes out of it: a last roar through the grate, the
      // riveted plates bursting off, the fire spilling out across the floor
      // in a gold crater that cools to iron-grey.
      mark('furnace_knight_death');
      championDeath(KIRON, KGOLD, x, z);
      SF.flare(x, FK_GRATE_Y, z, KGOLD, 2.6, { kind: 'burst', life: 0.42, core: KHEAT });
      SF.shock(x, z, 3.0, KGOLD, { life: 0.55, width: 0.22, core: KHEAT, jag: 0.6 });
      spray('chunk', x, 1.6, z, 12, { color: KIRON, speed: [1.0, 2.6], up: [1.2, 2.6], size: [0.1, 0.18], life: [0.7, 1.1], jitter: 0.5 });
      spray('spark', x, 1.4, z, 22, { color: KSPARK, speed: [1.0, 2.6], up: [1.4, 3.0], size: [0.04, 0.08], life: [0.6, 1.0], gravity: 5, drag: 0.6, jitter: 0.4 });
      kit.crack({ x, z, radius: 1.8, glow: KGOLD, life: 2.6, cool: 1.8 });
      spray('smoke', x, 1.2, z, 6, { color: SLAGC, speed: [0.4, 1.0], up: [0.6, 1.4], size: [0.45, 0.65], grow: 1.6, life: [1.0, 1.6], opacity: 0.35, gravity: -0.3, drag: 1.6, jitter: 0.6 });
    },
    glassblower: (es, matter, x, z) => {
      // The pipe drops and the gather shatters: a gold burst, a storm of
      // glass needles glittering as they fall, the pipe's last bubble
      // popping above.
      mark('glassblower_death');
      championDeath(vfxMatterColor('bellows'), GLASSC, x, z);
      SF.flare(x, GB_TIP_Y, z, GLASSC, 2.4, { kind: 'burst', life: 0.4, core: PARCH });
      kit.ring({ x, z, r0: 0.4, r1: 3.6, width: 0.1, life: 0.7, core: KHEAT, glow: GLASSC, soft: 0.6, y: 1.2, opacity: 0.55, thin: 0.5 });
      spray('shard', x, 1.4, z, 30, { color: GLASSC, tile: SHARD_TILE.needle, speed: [1.2, 3.0], up: [1.0, 2.6], size: [0.08, 0.14], life: [0.7, 1.2], gravity: 5, spin: [-12, 12], jitter: 0.6 });
      spray('spark', x, 1.4, z, 16, { color: PARCH, speed: [0.4, 1.4], up: [0.6, 1.8], size: [0.03, 0.05], life: [0.6, 1.1], gravity: 2, drag: 1.0, jitter: 0.6 });
      after(0.25, () => SF.flare(x, 2.6, z, GLASSC, 1.0, { kind: 'burst', life: 0.2, core: PARCH }));
    },
    vein_matron: (es, matter, x, z) => {
      // Her heart bursts: violet light out through the roots, crystal
      // spines flying.
      mark('vein_matron_death');
      championDeath(CH_CRYSTAL, CH_VEIN, x, z);
      SF.flare(x, 1.8, z, CH_VEIN, 2.6, { kind: 'burst', life: 0.42, core: CH_PEAK });
      SF.shock(x, z, 3.2, CH_VEIN, { life: 0.6, width: 0.24, core: CH_PEAK });
      spray('shard', x, 1.8, z, 24, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 3.0], up: [1.0, 2.6], size: [0.1, 0.15], life: [0.7, 1.1], gravity: 4, spin: [-10, 10], jitter: 0.6 });
    },
    hollow_choir: (es, matter, x, z) => {
      mark('hollow_choir_death');
      championDeath(CH_CRYSTAL, CH_VEIN, x, z);
      SF.flare(x, 1.7, z, CH_VEIN, 2.4, { kind: 'burst', life: 0.4, core: CH_PEAK });
      spray('shard', x, 1.6, z, 22, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 3.0], up: [1.0, 2.6], size: [0.1, 0.15], life: [0.7, 1.1], gravity: 4, spin: [-10, 10], jitter: 0.6 });
    },
  });

  return { CH_GOLD, CH_GOLD_HOT, CH_WATER, CH_SILT, CH_BRAMBLE, CH_BONE, CH_CRYSTAL, CH_VEIN, CH_PEAK, KIRON, GLASSC, FK_GRATE_Y, GB_PIPE, GB_TIP_Y, CHAMP_MOVE, CH_MOSS, CH_LICHEN, CH_RUST, CH_GBRONZE, CH_CINDER, CH_LINEN, CH_STILL, championDeath };
}
