// THE LEVEL I TO IV BOSS LOOKS (docs/BOSS_IDENTITY.md, docs/ACT_IV_BOSSES.md):
// the Thornmother, the Millwheel, the Lich Ram and the Act IV bosses, their
// attacks, enrages and deaths, and the Level II and Heart boss frames.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxBossStyle, vfxMatterColor } from '../../../data/vfx.js';
import { BONE, EMBER, ESHOT_Y, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';
import { PALETTE } from '../../../data/palette.js';

export function createSigBosses(ctx) {
  const { SF, ANTICIP, BONEPLATE, BRAMBLE, CRYSTAL, DIRT, HV, HVP, IRON, N, OAK, SILT, after, bus, camfx, faceOf, kit, mark, rnd, spray, unit2 } = ctx;

  // ------------------------------------------------- the Thornmother --
  // "She fights the floor." Style: bramble over violet rot. Shapes: thorn
  // spikes punching up where her seed pods root, a torn-earth charge lane,
  // every patch she rips up bursting in a ring of needles. Light: violet at
  // her and in each rooting; Ember only on the threat edges. Debris: needles,
  // dirt, seed husks. Camera: a kick down the charge, a dolly on the stop
  // against the wall.
  const THORN = vfxBossStyle('thornmother');
  bus.on('boss_seed_volley', (ev) => {
    mark('thorn_seed_volley');
    const b = SF.byId(ev.id);
    const bx = b?.x ?? ev.x;
    const bz = b?.z ?? ev.z;
    kit.flash({ x: bx, y: 1.3, z: bz, color: THORN.peak, size: 1.0, life: 0.22 });
    SF.flare(bx, 1.3, bz, THORN.corruption, 1.5, { kind: 'burst', life: 0.24, core: THORN.peak });
    SF.shock(bx, bz, 1.6, BRAMBLE, { life: 0.35, width: 0.12, core: BONE, jag: 0.5 });
    spray('shard', bx, 1.2, bz, THORN.volley.seeds, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.6, 1.4], up: [1.6, 2.6], size: [0.09, 0.13], life: [0.6, 0.9], gravity: 5, spin: [-8, 8], jitter: 0.4 });
    for (const gid of ev.globs || []) {
      const g = SF.byId(gid);
      if (!g) continue;
      const d = unit2(g.tx - bx, g.tz - bz);
      kit.streak({ a: { x: bx, y: 1.3, z: bz }, b: { x: bx + d.x * 0.8, y: 1.7, z: bz + d.z * 0.8 }, width: 0.06, tailW: 0, core: PARCH, glow: THORN.corruption, life: 0.2, fall: 1.4 });
    }
  });
  function thornRoot(x, z, radius) {
    mark('thorn_seed_root');
    const T = THORN.root;
    kit.ring({ x, z, r0: 0.2, r1: radius, width: 0.08, life: 0.35, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.7, gain: 0.7 });
    SF.flare(x, 0.3, z, THORN.corruption, 1.2, { kind: 'burst', life: 0.22, core: THORN.peak });
    SF.shock(x, z, radius * 1.3, BRAMBLE, { life: 0.4, width: 0.14, core: BONE, jag: 0.8 });
    SF.spikes(x, z, radius * 0.95, T.spikes, BRAMBLE, { h: 0.7, life: 0.55 });
    kit.mark({ x, z, radius: radius * 1.5, kind: 'crater', stain: BRAMBLE, glow: THORN.corruption, glowOpacity: 0.3, cool: 1.0, life: 4, opacity: 0.45 });
    kit.light({ x, z, radius: radius * 1.4, color: THORN.corruption, opacity: 0.35, life: 0.45 });
    spray('shard', x, 0.25, z, T.needles, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.8, 1.8], up: [1.4, 2.6], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 5, spin: [-8, 8], jitter: radius * 0.5 });
    spray('chunk', x, 0.15, z, 5, { color: DIRT, speed: [0.5, 1.2], up: [1.4, 2.4], size: [0.06, 0.11], life: [0.5, 0.8], jitter: radius * 0.4 });
    spray('smoke', x, 0.15, z, 2, { color: DIRT, speed: [0.3, 0.7], up: [0.1, 0.3], size: [0.34, 0.48], grow: 1.3, life: [0.7, 1.0], opacity: 0.3, gravity: -0.1, drag: 2.4 });
  }
  bus.on('boss_telegraph_start', (ev) => {
    const b = SF.byId(ev.id);
    if (!b) return;
    // The wind-ups of the slice-2 bosses gather into the body (the lane or
    // cone itself stays the telegraph layer's).
    if (b.kind === 'thornmother' && ev.attack === 'charge') {
      mark('thorn_charge_windup');
      SF.anticipate(b.x, b.z, 1.2, THORN.corruption, { y: 0.4, lines: 8, core: THORN.peak });
      spray('chunk', b.x, 0.1, b.z, 4, { color: DIRT, speed: [0.3, 0.8], up: [0.8, 1.4], size: [0.05, 0.1], life: [0.4, 0.6] });
    } else if (b.kind === 'millwheel') {
      mark(ev.attack === 'shards' ? 'millwheel_spokes' : 'millwheel_crosscut_windup');
      SF.anticipate(b.x, b.z, 1.3, EMBER, { y: 0.9, lines: 8, core: PARCH });
      kit.flash({ x: b.x, y: 0.9, z: b.z, color: MILL.peak, size: 0.9, life: 0.3, hold: 0.1 });
    } else if (b.kind === 'lichram' && ev.attack === 'rush') {
      mark('lichram_rush_windup');
      SF.anticipate(b.x, b.z, 1.2, LICH.corruption, { y: 0.9, lines: 8, core: LICH.peak });
      const d = faceOf(b);
      for (const s of [-1, 1]) SF.flare(b.x + d.x * 0.7 - d.z * 0.35 * s, 1.0, b.z + d.z * 0.7 + d.x * 0.35 * s, LICH.corruption, 0.8, { life: 0.4, core: LICH.peak });
    } else if (b.kind === 'gloamwolf' || b.kind === 'mireking') SF.thirdBossWindup(b, ev);
    else if (b.kind === 'ashraven' || b.kind === 'veinweaver') SF.slice11Windup(b, ev);
    else if (b.kind === 'hush' || b.kind === 'skyhorn') SF.spireWindup(b, ev);
    else if (b.kind === 'hourwarden') SF.hourwardenWindup(b, ev);
    else if (b.kind === 'founder') SF.founderWindup(b, ev);
    else if (b.kind === 'cinderback') SF.cinderbackWindup(b, ev);
  });
  bus.on('boss_charge', (ev) => {
    mark('thorn_charge');
    const b = SF.byId(ev.id);
    const t = b?.chargeVx != null ? unit2(b.chargeVx, b.chargeVz) : faceOf(b);
    SF.laneDrive(ev.x, ev.z, t, ev.len ?? 6, 10, { wake: DIRT, wakeW: THORN.charge.wakeW, head: THORN.corruption, peak: THORN.peak, stain: DIRT, glow: THORN.corruption, marks: 3 });
    SF.shock(ev.x, ev.z, 1.4, DIRT, { life: 0.35, width: 0.14, core: BONE, jag: 0.6 });
    spray('chunk', ev.x, 0.15, ev.z, 6, { color: DIRT, speed: [0.8, 1.8], up: [1.2, 2.2], size: [0.06, 0.12], life: [0.5, 0.8], dir: { x: -t.x, z: -t.z }, dirBias: 0.6 });
    camfx.kick(t.x, t.z, THORN.camera.kick * 0.6, 0.14);
  });
  bus.on('boss_thorn_burst', (ev) => {
    mark('thorn_burst');
    const r = ev.radius ?? 1.1;
    const B = THORN.burst;
    SF.flare(ev.x, 0.4, ev.z, EMBER, 1.5, { kind: 'burst', life: 0.24, core: THORN.peak });
    SF.shock(ev.x, ev.z, r * 1.5, BRAMBLE, { life: 0.4, width: 0.16, core: BONE, jag: 0.8 });
    SF.shock(ev.x, ev.z, r * 1.1, EMBER, { life: 0.28, width: 0.08 });
    for (let i = 0; i < N(B.needles); i++) {
      const a = (i / B.needles) * TAU + rnd(-0.15, 0.15);
      kit.streak({ a: { x: ev.x, y: 0.35, z: ev.z }, b: { x: ev.x + Math.cos(a) * 0.3, y: 0.4, z: ev.z + Math.sin(a) * 0.3 }, width: 0.05, tailW: 0, core: BONE, glow: BRAMBLE, life: 0.3, travel: { x: Math.cos(a) * 5, y: 1, z: Math.sin(a) * 5 }, fall: 0.6 });
    }
    SF.spikes(ev.x, ev.z, r, B.spikes, BRAMBLE, { h: 0.6, life: 0.3 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.6, kind: 'gouge', angle: rnd(0, TAU), stretch: 1.3, stain: DIRT, glow: EMBER, cool: 0.6, life: 3.2, opacity: 0.5 });
    spray('shard', ev.x, 0.3, ev.z, 10, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [1.4, 2.8], up: [1.2, 2.4], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 5, spin: [-10, 10] });
    spray('chunk', ev.x, 0.2, ev.z, 6, { color: DIRT, speed: [1.0, 2.2], up: [1.6, 2.8], size: [0.06, 0.12], life: [0.5, 0.8], jitter: r * 0.4 });
  });
  bus.on('boss_charge_end', (ev) => {
    mark('thorn_charge_end');
    const big = !!ev.wall;
    SF.flare(ev.x, 0.5, ev.z, THORN.corruption, big ? 2.0 : 1.3, { kind: 'burst', life: 0.28, core: THORN.peak });
    SF.shock(ev.x, ev.z, big ? 2.2 : 1.5, DIRT, { life: 0.42, width: 0.2, core: BONE, jag: 0.8 });
    kit.crack({ x: ev.x, z: ev.z, radius: big ? 1.6 : 1.0, glow: THORN.corruption, life: 1.8, cool: 0.6 });
    kit.mark({ x: ev.x, z: ev.z, radius: big ? 2.4 : 1.6, kind: 'crater', stain: DIRT, glow: THORN.corruption, cool: 1.0, life: 4, opacity: 0.55 });
    spray('chunk', ev.x, 0.2, ev.z, big ? 14 : 8, { color: DIRT, speed: [0.8, 2.2], up: [1.8, 3.4], size: [0.07, 0.15], life: [0.6, 1.0], jitter: 0.5 });
    spray('smoke', ev.x, 0.2, ev.z, big ? 6 : 3, { color: DIRT, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.4, 0.58], grow: 1.5, life: [0.9, 1.3], opacity: 0.36, gravity: -0.12, drag: 2.4, jitter: 0.6 });
    if (big) camfx.dolly(ev.x, ev.z, THORN.camera.dolly, 0.3);
  });
  function thornmotherDeath(x, z) {
    // The thicket dies with her: a last ring of thorns, the brambles
    // withering into husks, violet draining out of the torn earth.
    mark('thornmother_death');
    kit.pillar({ x, z, radius: 0.9, height: 3.6, color: THORN.corruption, life: 1.3, opacity: 0.65 });
    SF.flare(x, 1.0, z, THORN.corruption, 3.2, { kind: 'burst', life: 0.45, core: THORN.peak, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: THORN.peak, glow: THORN.corruption, soft: 0.5, y: 0.06 });
    SF.spikes(x, z, 3.0, 18, BRAMBLE, { h: 0.9, life: 0.8, delay: 0.05 });
    kit.mark({ x, z, radius: 3.4, kind: 'crater', stain: BRAMBLE, glow: THORN.corruption, cool: 2.0, life: 6, opacity: 0.6 });
    kit.crack({ x, z, radius: 2.2, glow: THORN.corruption, life: 3, cool: 1.2 });
    spray('shard', x, 0.6, z, 24, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [1.2, 2.8], up: [1.6, 3.2], size: [0.1, 0.15], life: [0.7, 1.1], gravity: 5, spin: [-10, 10], jitter: 0.6 });
    spray('shard', x, 1.2, z, 12, { color: BRAMBLE, tile: SHARD_TILE.petal, speed: [0.4, 1.2], up: [0.4, 1.2], size: [0.1, 0.14], life: [1.6, 2.2], gravity: 0.5, drag: 1.8, spin: [-4, 4], flutter: 0.6 });
    spray('chunk', x, 0.4, z, 16, { color: DIRT, speed: [1.0, 2.6], up: [1.8, 3.6], size: [0.08, 0.17], life: [0.8, 1.2], jitter: 0.8 });
    spray('spark', x, 0.4, z, 28, { color: THORN.corruption, speed: [0.3, 1.2], up: [0.8, 2.0], size: [0.06, 0.13], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    kit.light({ x, z, radius: 4, color: THORN.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, THORN.camera.dolly, 0.5);
  }

  // ------------------------------------------------- the Millwheel --
  // "The mill's own wheel, turned." Style: oak and iron over violet rot, the
  // millrace still running off it. Shapes: a fan of five Ember muzzle lines
  // (the cog shards), a gouge torn down the crosscut lane with sparks off the
  // iron tyre, a rim of sparks and drips as it rolls. Light: Ember in the
  // spokes when it fires (the attack), violet at the hub. Debris: oak
  // splinters, iron sparks, water. Camera: a kick along the fan, a dolly
  // on the wall slam.
  const MILL = vfxBossStyle('millwheel');
  bus.on('boss_cog_shards', (ev) => {
    mark('millwheel_shards');
    const b = SF.byId(ev.id);
    const d = faceOf(b);
    const base = Math.atan2(d.z, d.x);
    kit.flash({ x: ev.x, y: 0.9, z: ev.z, color: EMBER, size: 1.0, life: 0.18 });
    SF.flare(ev.x, 0.9, ev.z, MILL.corruption, 1.6, { kind: 'burst', life: 0.24, core: MILL.peak });
    for (let k = 0; k < 5; k++) {
      const a = base + (k - 2) * 0.21;
      const mx = ev.x + Math.cos(a) * 0.9;
      const mz = ev.z + Math.sin(a) * 0.9;
      kit.streak({ a: { x: ev.x, y: ESHOT_Y, z: ev.z }, b: { x: mx, y: ESHOT_Y, z: mz }, width: 0.05, tailW: 0.06, core: PARCH, glow: EMBER, life: 0.16, fall: 1.4 });
      SF.flare(mx, ESHOT_Y, mz, EMBER, 0.55, { life: 0.12, angle: a });
    }
    SF.shock(ev.x, ev.z, 1.8, IRON, { life: 0.32, width: 0.1, core: PARCH });
    spray('spark', ev.x, 0.8, ev.z, MILL.shards.sparks, { color: PALETTE.hearthAmber, speed: [1.4, 3.0], up: [0.4, 1.4], size: [0.03, 0.07], life: [0.2, 0.4], dir: d, dirBias: 0.6 });
    spray('shard', ev.x, 0.8, ev.z, MILL.shards.splinters, { color: OAK, tile: SHARD_TILE.needle, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 5, spin: [-10, 10], dir: d, dirBias: 0.4 });
    camfx.kick(d.x, d.z, MILL.camera.kick * 0.5, 0.12);
  });
  bus.on('boss_crosscut', (ev) => {
    mark('millwheel_crosscut');
    const b = SF.byId(ev.id);
    const t = b?.cutVx != null ? unit2(b.cutVx, b.cutVz) : faceOf(b);
    SF.laneDrive(ev.x, ev.z, t, ev.len ?? 8, 9, { wake: vfxMatterColor('water'), wakeW: 0.7, head: MILL.corruption, peak: MILL.peak, stain: IRON, glow: EMBER, marks: 4 });
    SF.shock(ev.x, ev.z, 1.6, OAK, { life: 0.35, width: 0.14, core: PARCH, jag: 0.5 });
    camfx.kick(t.x, t.z, MILL.camera.kick * 0.6, 0.14);
  });
  bus.on('boss_grind', (ev) => {
    mark('millwheel_grind');
    SF.flare(ev.x, 0.4, ev.z, EMBER, 1.0, { kind: 'burst', life: 0.2, core: PARCH });
    spray('shard', ev.x, 0.4, ev.z, 8, { color: OAK, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.4, 2.6], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 5, spin: [-12, 12] });
    spray('chunk', ev.x, 0.3, ev.z, 6, { color: OAK, speed: [1.0, 2.0], up: [1.4, 2.4], size: [0.07, 0.13], life: [0.5, 0.8] });
    spray('spark', ev.x, 0.4, ev.z, 8, { color: PALETTE.hearthAmber, speed: [1.6, 3.0], up: [0.6, 1.4], size: [0.03, 0.06], life: [0.15, 0.3] });
  });
  bus.on('boss_cut_end', (ev) => {
    mark('millwheel_cut_end');
    SF.flare(ev.x, 0.8, ev.z, MILL.corruption, 2.2, { kind: 'burst', life: 0.3, core: MILL.peak });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: PARCH, size: 1.2, life: 0.16 });
    SF.shock(ev.x, ev.z, 2.4, IRON, { life: 0.45, width: 0.22, core: PARCH, jag: 0.8 });
    kit.crack({ x: ev.x, z: ev.z, radius: 1.6, glow: MILL.corruption, life: 2.0, cool: 0.7 });
    kit.mark({ x: ev.x, z: ev.z, radius: 2.4, kind: 'crater', stain: IRON, glow: EMBER, cool: 1.1, life: 4, opacity: 0.55 });
    kit.light({ x: ev.x, z: ev.z, radius: 2.6, color: MILL.corruption, opacity: 0.5, life: 0.6, attack: 0.03 });
    spray('shard', ev.x, 0.7, ev.z, 12, { color: OAK, tile: SHARD_TILE.needle, speed: [1.2, 2.6], up: [1.6, 3.0], size: [0.1, 0.16], life: [0.6, 1.0], gravity: 5, spin: [-12, 12] });
    spray('spark', ev.x, 0.7, ev.z, 16, { color: PALETTE.hearthAmber, speed: [1.8, 3.6], up: [0.8, 2.0], size: [0.03, 0.07], life: [0.2, 0.45] });
    spray('shard', ev.x, 0.4, ev.z, 10, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 2.0], up: [1.6, 2.8], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3 });
    camfx.dolly(ev.x, ev.z, MILL.camera.dolly, 0.3);
  });
  function millwheelDeath(x, z) {
    // The wheel comes apart: planks and iron fly, the millrace it carried
    // pours out, the violet hub burns out.
    mark('millwheel_death');
    kit.pillar({ x, z, radius: 0.9, height: 3.6, color: MILL.corruption, life: 1.3, opacity: 0.65 });
    SF.flare(x, 1.0, z, MILL.corruption, 3.2, { kind: 'burst', life: 0.45, core: MILL.peak, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: MILL.peak, glow: MILL.corruption, soft: 0.5, y: 0.06 });
    kit.mark({ x, z, radius: 3.4, kind: 'splash', stain: SILT, glow: vfxMatterColor('water'), glowOpacity: 0.4, cool: 1.5, life: 6, opacity: 0.5 });
    SF.ripples(x, z, 4, 3.0, 0.1);
    for (let i = 0; i < N(10); i++) {
      const a = (i / 10) * TAU + rnd(-0.15, 0.15);
      kit.streak({ a: { x, y: 0.8, z }, b: { x: x + Math.cos(a) * 0.4, y: 0.85, z: z + Math.sin(a) * 0.4 }, width: 0.09, tailW: 0, core: OAK, glow: PALETTE.hearthAmber, life: 0.4, travel: { x: Math.cos(a) * 5, y: 1.5, z: Math.sin(a) * 5 }, fall: 0.4 });
    }
    spray('chunk', x, 0.6, z, 18, { color: OAK, speed: [1.2, 3.0], up: [2.0, 4.0], size: [0.09, 0.18], life: [0.8, 1.2], jitter: 0.6 });
    spray('chunk', x, 0.6, z, 8, { color: IRON, speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.08, 0.15], life: [0.7, 1.1], jitter: 0.5 });
    spray('shard', x, 0.6, z, 24, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [1.0, 2.6], up: [2.0, 4.0], size: [0.1, 0.16], life: [0.8, 1.2], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.7 });
    spray('spark', x, 0.4, z, 24, { color: MILL.corruption, speed: [0.3, 1.0], up: [0.8, 2.0], size: [0.06, 0.12], life: [1.2, 2.0], gravity: -0.3, drag: 1.2, jitter: 0.8 });
    kit.light({ x, z, radius: 4, color: MILL.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, MILL.camera.dolly, 0.5);
  }

  // ------------------------------------------------- the Lich Ram --
  // "It stands its ground and the graves open." Style: bone and grave earth
  // over violet. Shapes: a horns-down rush lane, a violet sigil under it
  // when it calls the graves, each grave cracking open in a ring of earth
  // with a pillar of violet where the dead climb out. Light: violet. Debris:
  // grave earth, bone chips, motes. Camera: a kick down the rush, a dolly
  // when its horns bury in the wall.
  const LICH = vfxBossStyle('lichram');
  bus.on('boss_rush', (ev) => {
    mark('lichram_rush');
    const b = SF.byId(ev.id);
    const t = b?.rushVx != null ? unit2(b.rushVx, b.rushVz) : faceOf(b);
    SF.laneDrive(ev.x, ev.z, t, ev.len ?? 6, 11, { wake: vfxMatterColor('earth'), wakeW: LICH.rush.wakeW, head: LICH.corruption, peak: LICH.peak, stain: vfxMatterColor('earth'), glow: LICH.corruption, marks: 3 });
    SF.shock(ev.x, ev.z, 1.4, BONEPLATE, { life: 0.35, width: 0.14, core: BONE, jag: 0.5 });
    camfx.kick(t.x, t.z, LICH.camera.kick * 0.6, 0.14);
  });
  bus.on('boss_horns_stuck', (ev) => {
    mark('lichram_stuck');
    const b = SF.byId(ev.id);
    const d = faceOf(b);
    const hx = ev.x + d.x * 0.8;
    const hz = ev.z + d.z * 0.8;
    SF.flare(hx, 0.9, hz, LICH.corruption, 2.2, { kind: 'star', life: 0.3, core: LICH.peak, angle: Math.atan2(d.z, d.x) });
    kit.flash({ x: hx, y: 0.9, z: hz, color: PARCH, size: 1.1, life: 0.16 });
    SF.shock(hx, hz, 2.2, BONEPLATE, { life: 0.45, width: 0.2, core: BONE, jag: 0.9 });
    kit.crack({ x: hx, z: hz, radius: 1.5, glow: LICH.corruption, life: 2.2, cool: 0.8 });
    kit.mark({ x: hx, z: hz, radius: 2.2, kind: 'crater', stain: vfxMatterColor('earth'), glow: LICH.corruption, cool: 1.2, life: 4, opacity: 0.55 });
    spray('chunk', hx, 0.6, hz, 12, { color: vfxMatterColor('earth'), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.15], life: [0.6, 1.0], jitter: 0.4, dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
    spray('shard', hx, 0.9, hz, 6, { color: BONEPLATE, tile: SHARD_TILE.needle, speed: [1.0, 2.0], up: [1.0, 2.0], size: [0.1, 0.14], life: [0.5, 0.8], gravity: 5, spin: [-10, 10] });
    camfx.dolly(hx, hz, LICH.camera.dolly, 0.3);
  });
  bus.on('boss_grave_call', (ev) => {
    mark('lichram_grave_call');
    const b = SF.byId(ev.id);
    const bx = b?.x ?? ev.x;
    const bz = b?.z ?? ev.z;
    SF.anticipate(bx, bz, 1.6, LICH.corruption, { y: 0.6, lines: 8, core: LICH.peak });
    after(ANTICIP, () => {
      SF.flare(bx, 1.4, bz, LICH.corruption, 1.8, { kind: 'burst', life: 0.28, core: LICH.peak });
      kit.mark({ x: bx, z: bz, radius: 2.4, kind: 'sigil', stain: INK, glow: LICH.corruption, cool: 1.2, life: 2.2, opacity: 0.2 });
      SF.shock(bx, bz, 2.4, LICH.corruption, { life: 0.45, width: 0.12, core: LICH.peak });
      kit.light({ x: bx, z: bz, radius: 2.6, color: LICH.corruption, opacity: 0.45, life: 0.6 });
      for (const gid of ev.globs || []) {
        const g = SF.byId(gid);
        if (!g) continue;
        kit.streak({ a: { x: bx, y: 1.4, z: bz }, b: { x: g.tx, y: 0.1, z: g.tz }, width: 0.04, tailW: 0, core: LICH.peak, glow: LICH.corruption, life: 0.35, fall: 1.2, opacity: 0.6 });
      }
    });
  });
  function graveBurst(x, z, radius) {
    mark('lichram_grave_burst');
    const G = LICH.grave;
    kit.ring({ x, z, r0: 0.2, r1: radius, width: 0.08, life: 0.35, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.7, gain: 0.7 });
    SF.flare(x, 0.35, z, LICH.corruption, 1.3, { kind: 'burst', life: 0.24, core: LICH.peak });
    SF.shock(x, z, radius * 1.4, vfxMatterColor('earth'), { life: 0.4, width: 0.18, core: BONE, jag: 0.9 });
    kit.crack({ x, z, radius: radius * 1.1, glow: LICH.corruption, life: 1.6, cool: 0.6 });
    kit.mark({ x, z, radius: radius * 1.6, kind: 'crater', stain: vfxMatterColor('earth'), glow: LICH.corruption, cool: 1.0, life: 4, opacity: 0.55 });
    spray('chunk', x, 0.2, z, G.chunk, { color: vfxMatterColor('earth'), speed: [0.8, 2.0], up: [2.0, 3.4], size: [0.07, 0.15], life: [0.6, 1.0], jitter: radius * 0.4 });
    spray('shard', x, 0.3, z, G.bones, { color: BONEPLATE, tile: SHARD_TILE.needle, speed: [0.8, 1.6], up: [1.4, 2.4], size: [0.1, 0.14], life: [0.5, 0.8], gravity: 5, spin: [-10, 10] });
    spray('smoke', x, 0.2, z, 3, { color: vfxMatterColor('ash'), speed: [0.4, 1.0], up: [0.2, 0.5], size: [0.38, 0.52], grow: 1.4, life: [0.8, 1.2], opacity: 0.34, gravity: -0.15, drag: 2.4 });
  }
  bus.on('boss_grave_raise', (ev) => {
    mark('lichram_grave_raise');
    kit.pillar({ x: ev.x, z: ev.z, radius: 0.45, height: 2.4, color: LICH.corruption, life: 0.7, opacity: 0.55 });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: LICH.peak, size: 0.9, life: 0.24 });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.3, kind: 'sigil', stain: INK, glow: LICH.corruption, cool: 1.0, life: 2.0, opacity: 0.18 });
    spray('spark', ev.x, 0.2, ev.z, 12, { color: LICH.corruption, speed: [0.1, 0.5], up: [1.0, 2.0], size: [0.05, 0.1], life: [0.9, 1.4], gravity: -0.35, drag: 1.4, jitter: 0.4 });
  });
  function lichEnrage(ev) {
    mark('lichram_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.6, height: 3.0, color: LICH.corruption, life: 0.8, opacity: 0.55 });
    SF.flare(x, 1.6, z, LICH.corruption, 2.4, { kind: 'burst', life: 0.32, core: LICH.peak });
    kit.ring({ x, z, r0: 0.5, r1: 3.4, width: 0.2, life: 0.75, core: LICH.peak, glow: LICH.corruption, soft: 0.5, y: 0.06 });
    kit.mark({ x, z, radius: 2.8, kind: 'sigil', stain: INK, glow: LICH.corruption, cool: 1.4, life: 2.6, opacity: 0.22 });
    spray('spark', x, 0.3, z, 22, { color: LICH.corruption, speed: [0.2, 0.7], up: [1.0, 2.0], size: [0.06, 0.11], life: [1.0, 1.6], gravity: -0.35, drag: 1.4, jitter: 0.9 });
    kit.light({ x, z, radius: 3, color: LICH.corruption, opacity: 0.5, life: 0.8 });
    camfx.dolly(x, z, LICH.camera.dolly * 0.6, 0.3);
  }
  function lichramDeath(x, z) {
    // The bones come apart and the graves close: a bone burst, the violet
    // lich-light going up, earth falling back in.
    mark('lichram_death');
    kit.pillar({ x, z, radius: 1.0, height: 4.0, color: LICH.corruption, life: 1.4, opacity: 0.7 });
    SF.flare(x, 1.0, z, LICH.corruption, 3.2, { kind: 'burst', life: 0.45, core: LICH.peak, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: LICH.peak, glow: LICH.corruption, soft: 0.5, y: 0.06 });
    kit.mark({ x, z, radius: 3.4, kind: 'crater', stain: vfxMatterColor('earth'), glow: LICH.corruption, cool: 2.0, life: 6, opacity: 0.6 });
    kit.crack({ x, z, radius: 2.4, glow: LICH.corruption, life: 3, cool: 1.2 });
    spray('chunk', x, 0.6, z, 14, { color: BONEPLATE, speed: [1.2, 2.8], up: [1.8, 3.6], size: [0.09, 0.17], life: [0.8, 1.2], jitter: 0.6 });
    spray('shard', x, 0.8, z, 14, { color: BONEPLATE, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.4, 2.8], size: [0.1, 0.15], life: [0.7, 1.0], gravity: 5, spin: [-10, 10], jitter: 0.5 });
    spray('chunk', x, 0.3, z, 12, { color: vfxMatterColor('earth'), speed: [0.8, 2.2], up: [1.4, 2.8], size: [0.08, 0.15], life: [0.7, 1.1], jitter: 0.8 });
    spray('spark', x, 0.4, z, 30, { color: LICH.corruption, speed: [0.3, 1.2], up: [0.8, 2.2], size: [0.06, 0.13], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    kit.light({ x, z, radius: 4, color: LICH.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, LICH.camera.dolly, 0.5);
  }

  // ---------------------------------------------- Act IV bosses --
  // (docs/ACT_IV_BOSSES.md) Same law as every boss: Ember on the frame that
  // hurts, the body's matter on what breaks, violet for the boss. The
  // Cantor's violet is the God-stuff anchor itself (it is a god's echo), not
  // the Heart's purple veins; the Colossus is slate and pale glass over them.
  const CANT = vfxBossStyle('cantor');
  const COLO = vfxBossStyle('colossus');
  const GLASS = '#DCD6F2';
  const SLATE = vfxMatterColor('stone');
  // The Hollow Note: the Ember ring bursts and the note rings out as three
  // violet rings; from the Second Verse its echo throws crystal along the floor.
  bus.on('boss_note', (ev) => {
    mark('cantor_note');
    const r = ev.radius ?? 1.7;
    const C = CANT.note;
    SF.flare(ev.x, 0.5, ev.z, EMBER, 1.6, { kind: 'burst', life: 0.22, core: CANT.peak });
    kit.flash({ x: ev.x, y: 0.5, z: ev.z, color: PARCH, size: 1.0, life: 0.12 });
    SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.26, width: 0.1 });
    for (let i = 0; i < C.rings; i++) SF.shock(ev.x, ev.z, r * (1.3 + i * 0.45), CANT.corruption, { life: 0.5 + i * 0.12, width: 0.07, core: CANT.peak, delay: 0.05 + i * 0.09, y: 0.08 + i * 0.25 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.3, kind: 'sigil', stain: INK, glow: CANT.corruption, glowOpacity: 0.45, cool: 1.0, life: 2.6, opacity: 0.22 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.5, color: CANT.corruption, opacity: 0.45, life: 0.5, attack: 0.02 });
    spray('spark', ev.x, 0.3, ev.z, C.motes, { color: CANT.corruption, speed: [0.3, 1.2], up: [1.0, 2.2], size: [0.05, 0.1], life: [0.8, 1.3], gravity: -0.3, drag: 1.4, jitter: r * 0.6 });
    if (ev.echo > 0) {
      SF.spikes(ev.x, ev.z, r * 0.7, 6, CRYSTAL, { h: 0.55, life: 0.4, core: CANT.peak, delay: 0.03 });
      spray('shard', ev.x, 0.4, ev.z, 10, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.4, 3.0], up: [0.6, 1.4], size: [0.09, 0.14], life: [0.4, 0.7], gravity: 4, spin: [-10, 10] });
    }
  });
  // The Sung Lance: the lane fills from its chest in one breath — a violet
  // beam with a white core, the Ember edge flashing the full width (the hit).
  bus.on('boss_sung_lance', (ev) => {
    mark('cantor_lance');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ang = Math.atan2(d.z, d.x);
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const SPEED = 28;
    const sweep = len / SPEED;
    SF.flare(ev.x + d.x * 0.6, 2.0, ev.z + d.z * 0.6, CANT.corruption, 1.8, { life: 0.24, core: CANT.peak, angle: ang });
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: 1.2, tailW: 1.0, core: EMBER, glow: EMBER, life: 0.26, fall: 2.2, opacity: 0.55 });
    kit.streak({ a: { x: ev.x + d.x * 0.5, y: 1.6, z: ev.z + d.z * 0.5 }, b: { x: ex, y: 0.5, z: ez }, width: 0.34, tailW: 0.2, core: CANT.peak, glow: CANT.corruption, life: sweep + 0.45, fall: 1.2, opacity: 1 });
    kit.streak({ a: { x: ev.x, y: 1.5, z: ev.z }, b: { x: ev.x + d.x, y: 1.4, z: ev.z + d.z }, width: 0.16, tailW: 0.5, core: PARCH, glow: CANT.corruption, life: sweep, travel: { x: d.x * SPEED, y: -2.2, z: d.z * SPEED }, fall: 0.3 });
    after(sweep, () => {
      SF.flare(ex, 0.5, ez, CANT.corruption, 1.3, { kind: 'burst', life: 0.24, core: CANT.peak });
      SF.shock(ex, ez, 1.2, CANT.corruption, { life: 0.35, width: 0.1, core: CANT.peak });
    });
    const marks = Math.max(2, Math.min(5, Math.round(len / 1.8)));
    for (let i = 1; i <= marks; i++) {
      const k = (i - 0.5) / marks;
      kit.mark({ x: ev.x + d.x * len * k, z: ev.z + d.z * len * k, radius: (len / marks) * 0.6, kind: 'gouge', angle: ang, stretch: 2.2, stain: INK, glow: CANT.corruption, glowOpacity: 0.45, cool: 0.7, life: 2.6, opacity: 0.38, delay: sweep * k });
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      after(sweep * k, () => spray('spark', px, 0.5, pz, 3, { color: i % 2 ? EMBER : CANT.corruption, speed: [1.0, 2.2], up: [0.5, 1.4], size: [0.03, 0.07], life: [0.25, 0.45] }));
    }
    kit.light({ x: (ev.x + ex) / 2, z: (ev.z + ez) / 2, radius: Math.min(2.8, len * 0.4), color: CANT.corruption, opacity: 0.4, life: 0.35, attack: 0.02 });
    camfx.kick(d.x, d.z, CANT.camera.kick * 0.5, 0.12);
  });
  // A verse taken: a column of violet light, a sigil the size of the room's
  // heart, the verse's land in the motes (moss green, millrace blue, ash).
  const VERSE_TINT = [null, vfxMatterColor('bramble'), vfxMatterColor('water'), vfxMatterColor('ash')];
  bus.on('boss_verse', (ev) => {
    mark('cantor_verse');
    const V = CANT.verse;
    const tint = VERSE_TINT[ev.verse] ?? CANT.corruption;
    SF.anticipate(ev.x, ev.z, 2.2, CANT.corruption, { y: 1.6, lines: 10, core: CANT.peak });
    after(ANTICIP, () => {
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.8, height: V.pillar, color: CANT.corruption, life: 1.1, opacity: 0.6 });
      SF.flare(ev.x, 2.0, ev.z, CANT.corruption, 2.8, { kind: 'burst', life: 0.4, core: CANT.peak, spin: 0.6 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: 4.2, width: 0.24, life: 0.9, core: CANT.peak, glow: CANT.corruption, soft: 0.5, y: 0.06 });
      kit.mark({ x: ev.x, z: ev.z, radius: 3.2, kind: 'sigil', stain: INK, glow: CANT.corruption, glowOpacity: 0.5, cool: 1.6, life: 3.4, opacity: 0.26 });
      spray('spark', ev.x, 0.4, ev.z, V.motes, { color: CANT.corruption, speed: [0.2, 0.9], up: [1.2, 2.6], size: [0.06, 0.12], life: [1.2, 1.9], gravity: -0.35, drag: 1.3, jitter: 1.2 });
      spray('spark', ev.x, 0.4, ev.z, 14, { color: tint, speed: [0.3, 1.0], up: [1.0, 2.2], size: [0.05, 0.1], life: [1.0, 1.6], gravity: -0.3, drag: 1.3, jitter: 1.6 });
      kit.light({ x: ev.x, z: ev.z, radius: 4.2, color: CANT.corruption, opacity: 0.6, life: 1.0, attack: 0.05 });
      camfx.dolly(ev.x, ev.z, CANT.camera.dolly * 0.7, 0.4);
    });
  });
  // The Echo Step: it folds into a streak of light that runs to where it
  // will stand, and unfolds there.
  bus.on('boss_echo_step', (ev) => {
    mark('cantor_echo_step');
    kit.pillar({ x: ev.x, z: ev.z, radius: 0.5, height: 3.4, color: CANT.corruption, life: 0.45, opacity: 0.55 });
    SF.flare(ev.x, 1.6, ev.z, CANT.corruption, 1.8, { kind: 'star', life: 0.24, core: CANT.peak });
    spray('spark', ev.x, 1.2, ev.z, 16, { color: CANT.corruption, speed: [0.4, 1.4], up: [0.2, 1.2], size: [0.05, 0.1], life: [0.5, 0.9], gravity: -0.2, drag: 1.6, jitter: 0.6 });
    const d = unit2(ev.tx - ev.x, ev.tz - ev.z);
    const len = Math.hypot(ev.tx - ev.x, ev.tz - ev.z);
    kit.streak({ a: { x: ev.x, y: 1.6, z: ev.z }, b: { x: ev.tx, y: 1.6, z: ev.tz }, width: 0.12, tailW: 0, core: CANT.peak, glow: CANT.corruption, life: 0.45, fall: 1.4, opacity: 0.7 });
    kit.streak({ a: { x: ev.x, y: 1.6, z: ev.z }, b: { x: ev.x + d.x * 0.8, y: 1.6, z: ev.z + d.z * 0.8 }, width: 0.22, tailW: 0.6, core: PARCH, glow: CANT.corruption, life: 0.3, travel: { x: (d.x * len) / 0.3, y: 0, z: (d.z * len) / 0.3 }, fall: 0.3 });
    kit.mark({ x: ev.tx, z: ev.tz, radius: 1.6, kind: 'sigil', stain: INK, glow: CANT.corruption, glowOpacity: 0.5, cool: 0.8, life: 1.6, opacity: 0.25 });
  });
  bus.on('boss_echo_land', (ev) => {
    mark('cantor_echo_land');
    SF.flare(ev.x, 1.6, ev.z, CANT.corruption, 2.0, { kind: 'burst', life: 0.28, core: CANT.peak });
    SF.shock(ev.x, ev.z, 2.0, CANT.corruption, { life: 0.4, width: 0.1, core: CANT.peak });
    spray('spark', ev.x, 0.6, ev.z, 14, { color: CANT.corruption, speed: [0.3, 1.0], up: [0.8, 1.8], size: [0.05, 0.1], life: [0.7, 1.1], gravity: -0.3, drag: 1.4, jitter: 0.5 });
    kit.light({ x: ev.x, z: ev.z, radius: 2.4, color: CANT.corruption, opacity: 0.45, life: 0.5 });
  });
  // The Heart Pulse: the room's heart beats through it — an Ember ring the
  // full radius (the hit), a thick violet shockwave and the floor cracking.
  bus.on('boss_heart_pulse', (ev) => {
    mark('cantor_pulse');
    const r = ev.radius ?? 3.2;
    SF.flare(ev.x, 1.2, ev.z, CANT.corruption, 3.0, { kind: 'burst', life: 0.32, core: CANT.peak });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: PARCH, size: 1.6, life: 0.14 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.14 });
    SF.shock(ev.x, ev.z, r * 1.25, CANT.corruption, { life: 0.55, width: 0.3, core: CANT.peak, delay: 0.03 });
    SF.shock(ev.x, ev.z, r * 1.6, HV, { life: 0.75, width: 0.16, core: HVP, delay: 0.08 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: CANT.corruption, life: 2.2, cool: 0.8 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.1, kind: 'crater', stain: INK, glow: CANT.corruption, glowOpacity: 0.45, cool: 1.4, life: 4, opacity: 0.45 });
    spray('spark', ev.x, 0.3, ev.z, 24, { color: CANT.corruption, speed: [1.0, 2.6], up: [0.4, 1.4], size: [0.05, 0.1], life: [0.5, 0.9], drag: 1.2, jitter: 0.6 });
    spray('smoke', ev.x, 0.2, ev.z, 5, { color: vfxMatterColor('ash'), speed: [1.0, 2.0], up: [0.1, 0.3], size: [0.4, 0.58], grow: 1.5, life: [0.7, 1.0], opacity: 0.3, gravity: -0.1, drag: 2.4, jitter: 0.8 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: CANT.corruption, opacity: 0.65, life: 0.6, attack: 0.02 });
    camfx.dolly(ev.x, ev.z, CANT.camera.dolly, 0.35);
  });
  function cantorDeath(x, z) {
    // The last note: the singer unravels into a column of violet light, the
    // seven-note halo scatters, and the room's heart goes quiet.
    mark('cantor_death');
    kit.pillar({ x, z, radius: 1.2, height: 5.0, color: CANT.corruption, life: 1.8, opacity: 0.75 });
    SF.flare(x, 2.0, z, CANT.corruption, 4.2, { kind: 'burst', life: 0.6, core: CANT.peak, spin: 0.8 });
    kit.flash({ x, y: 1.6, z, color: PARCH, size: 2.4, life: 0.25 });
    for (let i = 0; i < 3; i++) kit.ring({ x, z, r0: 0.5, r1: 4 + i * 1.5, width: 0.3, life: 1.0 + i * 0.3, core: CANT.peak, glow: CANT.corruption, soft: 0.5, y: 0.06 + i * 0.4, delay: i * 0.12 });
    kit.mark({ x, z, radius: 3.6, kind: 'sigil', stain: INK, glow: CANT.corruption, glowOpacity: 0.6, cool: 2.4, life: 7, opacity: 0.35 });
    for (let i = 0; i < N(7); i++) {
      const a = (i / 7) * TAU;
      kit.streak({ a: { x, y: 2.8, z }, b: { x: x + Math.cos(a) * 0.3, y: 2.8, z: z + Math.sin(a) * 0.3 }, width: 0.1, tailW: 0, core: CANT.peak, glow: CANT.corruption, life: 0.6, travel: { x: Math.cos(a) * 4, y: 2, z: Math.sin(a) * 4 }, fall: 0.2 });
    }
    spray('spark', x, 0.6, z, 44, { color: CANT.corruption, speed: [0.3, 1.4], up: [1.0, 2.8], size: [0.06, 0.14], life: [1.6, 2.6], gravity: -0.3, drag: 1.2, jitter: 1.2 });
    spray('shard', x, 1.2, z, 18, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.0, 2.6], up: [1.4, 3.0], size: [0.1, 0.16], life: [0.8, 1.2], gravity: 4, spin: [-10, 10], jitter: 0.6 });
    kit.light({ x, z, radius: 5, color: CANT.corruption, opacity: 0.75, life: 1.8 });
    camfx.dolly(x, z, CANT.camera.dolly * 1.2, 0.6);
  }

  // The Geode Colossus. The Fissure: the fist lands, a white-hot crack runs
  // the lane at speed throwing slate and glass, its Ember edge the hit, and
  // the crystal patches the sim leaves grow along it.
  bus.on('boss_fissure', (ev) => {
    mark('colossus_fissure');
    const F = COLO.fissure;
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.len ?? 6;
    const ang = Math.atan2(d.z, d.x);
    const fx = ev.x + d.x * 1.3;
    const fz = ev.z + d.z * 1.3;
    SF.flare(fx, 0.4, fz, EMBER, 1.8, { kind: 'burst', life: 0.26, core: PARCH });
    SF.shock(fx, fz, 1.6, SLATE, { life: 0.4, width: 0.2, core: GLASS, jag: 0.9 });
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * len, y: 0.1, z: ev.z + d.z * len }, width: 1.0, tailW: 0.8, core: EMBER, glow: EMBER, life: 0.3, fall: 2.2, opacity: 0.55 });
    SF.laneDrive(ev.x, ev.z, d, len, F.speed, { wake: CRYSTAL, wakeW: 0.4, head: COLO.corruption, peak: COLO.peak, stain: SLATE, glow: HV, marks: 4, markKind: 'gouge' });
    const sweep = len / F.speed;
    const n = Math.max(3, Math.round(len / 1.4));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      after(sweep * k, () => {
        SF.spikes(px, pz, 0.5, F.spikes, CRYSTAL, { h: 0.6, life: 0.45, core: GLASS });
        spray('chunk', px, 0.2, pz, 3, { color: SLATE, speed: [0.6, 1.6], up: [1.4, 2.6], size: [0.07, 0.13], life: [0.5, 0.8], jitter: 0.3 });
      });
    }
    kit.crack({ x: fx, z: fz, radius: 1.4, glow: HV, life: 2.4, cool: 0.8 });
    kit.light({ x: ev.x + d.x * len * 0.5, z: ev.z + d.z * len * 0.5, radius: Math.min(3, len * 0.4), color: HV, opacity: 0.4, life: 0.45, attack: 0.02 });
    camfx.kick(d.x, d.z, COLO.camera.kick * 0.7, 0.16);
    void ang;
  });
  // Geode Rain: the chest flares as it calls them, and a glint marks each
  // geode's fall (they land as crystal shatters, below).
  bus.on('boss_geode_rain', (ev) => {
    mark('colossus_rain');
    const b = SF.byId(ev.id);
    const bx = b?.x ?? ev.x;
    const bz = b?.z ?? ev.z;
    SF.anticipate(bx, bz, 1.4, HV, { y: 1.8, lines: 8, core: GLASS });
    after(ANTICIP, () => {
      SF.flare(bx, 2.6, bz, HV, 1.8, { kind: 'burst', life: 0.3, core: HVP });
      kit.light({ x: bx, z: bz, radius: 2.4, color: HV, opacity: 0.4, life: 0.5 });
      for (const gid of ev.globs || []) {
        const g = SF.byId(gid);
        if (!g) continue;
        kit.streak({ a: { x: g.tx, y: 5.5, z: g.tz }, b: { x: g.tx, y: 4.6, z: g.tz }, width: 0.08, tailW: 0, core: GLASS, glow: HV, life: 0.5, fall: 1.2, opacity: 0.7 });
        spray('chunk', g.tx, 4.4, g.tz, 2, { color: SLATE, speed: [0.05, 0.2], up: [-0.6, -0.2], size: [0.05, 0.09], life: [0.6, 0.9], gravity: 6, jitter: 0.5 });
      }
    });
  });
  // The Geode Burst: the chest splits wide — an Ember ring (the hit), glass
  // spikes punched out round it, violet light out of the geode, debris.
  bus.on('boss_geode_burst', (ev) => {
    mark('colossus_burst');
    const B = COLO.burst;
    const r = ev.radius ?? 2.6;
    SF.flare(ev.x, 1.4, ev.z, HV, 3.0, { kind: 'burst', life: 0.32, core: HVP, spin: 0.5 });
    kit.flash({ x: ev.x, y: 1.0, z: ev.z, color: PARCH, size: 1.5, life: 0.14 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.14, jag: 0.6 });
    SF.shock(ev.x, ev.z, r * 1.3, CRYSTAL, { life: 0.55, width: 0.26, core: GLASS, delay: 0.03, jag: 0.9 });
    SF.spikes(ev.x, ev.z, r * 0.9, B.spikes, CRYSTAL, { h: 0.9, life: 0.6, core: GLASS, delay: 0.02 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: HV, life: 2.2, cool: 0.8 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.2, kind: 'crater', stain: SLATE, glow: CRYSTAL, glowOpacity: 0.45, cool: 1.4, life: 4.2, opacity: 0.55 });
    spray('shard', ev.x, 0.8, ev.z, B.shards, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.6, 3.4], up: [1.0, 2.6], size: [0.1, 0.17], life: [0.6, 1.0], gravity: 5, drag: 0.4, spin: [-10, 10], jitter: 0.5 });
    spray('chunk', ev.x, 0.6, ev.z, 10, { color: SLATE, speed: [1.2, 2.6], up: [1.6, 3.0], size: [0.08, 0.16], life: [0.6, 1.0], jitter: 0.6 });
    spray('smoke', ev.x, 0.3, ev.z, 5, { color: SLATE, speed: [0.8, 1.6], up: [0.1, 0.4], size: [0.4, 0.58], grow: 1.5, life: [0.8, 1.1], opacity: 0.32, gravity: -0.12, drag: 2.4, jitter: 0.6 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: HV, opacity: 0.6, life: 0.55, attack: 0.02 });
    camfx.dolly(ev.x, ev.z, COLO.camera.dolly, 0.35);
  });
  bus.on('boss_geode_recover', (ev) => {
    mark('colossus_recover');
    spray('chunk', ev.x, 0.4, ev.z, 5, { color: SLATE, speed: [0.3, 0.8], up: [0.8, 1.4], size: [0.05, 0.1], life: [0.4, 0.7], jitter: 0.8 });
    spray('spark', ev.x, 1.4, ev.z, 8, { color: HV, speed: [0.1, 0.4], up: [0.4, 0.9], size: [0.05, 0.09], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.6 });
  });
  function colossusEnrage(ev) {
    mark('colossus_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.7, height: 3.4, color: HV, life: 0.8, opacity: 0.5 });
    SF.flare(x, 1.6, z, HV, 2.6, { kind: 'burst', life: 0.32, core: HVP });
    kit.ring({ x, z, r0: 0.5, r1: 3.4, width: 0.2, life: 0.75, core: GLASS, glow: HV, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 2.0, glow: HV, life: 2.4, cool: 0.9 });
    SF.spikes(x, z, 1.8, 8, CRYSTAL, { h: 0.7, life: 0.5, core: GLASS });
    spray('shard', x, 1.4, z, 12, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [0.8, 2.0], up: [0.8, 2.0], size: [0.09, 0.14], life: [0.6, 0.9], gravity: 5, spin: [-10, 10], jitter: 0.6 });
    kit.light({ x, z, radius: 3, color: HV, opacity: 0.5, life: 0.8 });
  }
  function colossusDeath(x, z) {
    // The body breaks: slate falls away, the glass shatters outward, and the
    // geode's violet heart goes up in one last beat.
    mark('colossus_death');
    kit.pillar({ x, z, radius: 1.1, height: 4.2, color: HV, life: 1.5, opacity: 0.7 });
    SF.flare(x, 1.4, z, HV, 3.6, { kind: 'burst', life: 0.5, core: HVP, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4.4, width: 0.4, life: 1.0, core: GLASS, glow: HV, soft: 0.5, y: 0.06 });
    kit.mark({ x, z, radius: 3.6, kind: 'crater', stain: SLATE, glow: HV, glowOpacity: 0.5, cool: 2.2, life: 6, opacity: 0.6 });
    kit.crack({ x, z, radius: 2.6, glow: HV, life: 3, cool: 1.2 });
    SF.spikes(x, z, 2.2, 14, CRYSTAL, { h: 1.0, life: 0.7, core: GLASS });
    spray('chunk', x, 1.0, z, 26, { color: SLATE, speed: [1.2, 3.0], up: [1.8, 3.8], size: [0.1, 0.2], life: [0.9, 1.3], jitter: 0.8 });
    spray('shard', x, 1.2, z, 28, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 3.0], up: [1.4, 3.0], size: [0.1, 0.17], life: [0.8, 1.2], gravity: 5, spin: [-10, 10], jitter: 0.6 });
    spray('spark', x, 0.6, z, 30, { color: HV, speed: [0.3, 1.2], up: [0.8, 2.2], size: [0.06, 0.13], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    spray('smoke', x, 0.5, z, 10, { color: SLATE, speed: [0.4, 1.2], up: [0.4, 1.0], size: [0.5, 0.7], grow: 1.6, life: [1.4, 2.0], opacity: 0.38, gravity: -0.25, drag: 2.0, jitter: 1.2 });
    kit.light({ x, z, radius: 4.4, color: HV, opacity: 0.65, life: 1.5 });
    camfx.dolly(x, z, COLO.camera.dolly, 0.55);
  }
  // Per frame: the Cantor sheds violet motes as it floats (thicker with
  // each verse) and the Colossus drips glass dust while it is spent.
  function heartBossFrame(e, rec) {
    if (e.kind === 'cantor') {
      if (e.mode === 'fade' || rec.clock < 0.2 - 0.04 * (e.verse | 0)) return;
      rec.clock = 0;
      spray('spark', e.x, 0.5, e.z, 1, { color: rnd(0, 1) < 0.3 ? CANT.peak : CANT.corruption, speed: [0.05, 0.25], up: [0.4, 1.0], size: [0.05, 0.1], life: [0.8, 1.3], gravity: -0.25, drag: 1.4, jitter: 0.7, opacity: 0.85 });
    } else if (e.kind === 'colossus') {
      if (e.mode === 'spent' && rec.clock >= 0.12) {
        rec.clock = 0;
        spray('chunk', e.x, 1.6, e.z, 1, { color: SLATE, speed: [0.05, 0.3], up: [0.0, 0.3], size: [0.04, 0.08], life: [0.5, 0.8], jitter: 0.8 });
      } else if (e.enraged && rec.clock >= 0.25) {
        rec.clock = 0;
        spray('spark', e.x, 1.5, e.z, 1, { color: HV, speed: [0.05, 0.2], up: [0.5, 0.9], size: [0.05, 0.09], life: [0.7, 1.0], gravity: -0.3, drag: 1.4, jitter: 0.7, opacity: 0.85 });
      }
    }
  }

  // Per frame, slice-2 bodies: the Thornmother tears earth up as she
  // charges; the Millwheel drips and sparks on the rim, throws a fan of
  // sparks off its tyre down the crosscut and wobbles dizzy after; the Lich
  // Ram kicks grave dust on its rush and smoulders violet once enraged; a
  // tethered Grave Wisp runs motes down its thread.
  const s2Clock = new Map(); // id -> { clock, ring }
  function slice2Frame(e, dt) {
    let rec = s2Clock.get(e.id);
    if (!rec) s2Clock.set(e.id, (rec = { clock: 0 }));
    rec.clock += dt;
    if (e.kind === 'gravewisp') {
      if (e.tetherId != null && e.state === 'active') SF.wispFrame(e, rec);
      return;
    }
    if (e.kind === 'cantor' || e.kind === 'colossus') return heartBossFrame(e, rec);
    if (e.kind === 'gloamwolf' || e.kind === 'mireking') return SF.thirdBossFrame(e, rec);
    if (e.kind === 'ashraven' || e.kind === 'veinweaver') return SF.slice11Frame(e, rec);
    if (e.kind === 'hush' || e.kind === 'skyhorn') return SF.spireFrame(e, rec);
    if (e.kind === 'hourwarden') return SF.hourwardenFrame(e, rec);
    if (e.kind === 'founder') return SF.founderFrame(e, rec);
    if (e.kind === 'cinderback') return SF.cinderbackFrame(e, rec);
    if (e.kind === 'keener' || e.kind === 'sexton' || e.kind === 'bloom' || e.kind === 'siphon') return SF.barrowHeartFrame(e, rec);
    if (e.kind === 'thornmother') {
      if (e.mode !== 'charge' || rec.clock < THORN.charge.every) return;
      rec.clock = 0;
      const d = unit2(e.chargeVx ?? 0, e.chargeVz ?? 0);
      for (const s of [-1, 1]) spray('chunk', e.x - d.z * 0.4 * s, 0.15, e.z + d.x * 0.4 * s, 1, { color: DIRT, speed: [0.8, 1.6], up: [1.2, 2.0], size: [0.06, 0.11], life: [0.4, 0.6], dir: { x: -d.z * s - d.x, z: d.x * s - d.z }, dirBias: 0.6 });
      if (rnd(0, 1) < 0.4) spray('shard', e.x, 0.3, e.z, 1, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.5, 1.2], up: [1.0, 1.6], size: [0.09, 0.12], life: [0.4, 0.6], gravity: 5, spin: [-8, 8] });
      return;
    }
    if (e.kind === 'millwheel') {
      if (e.mode === 'cut') {
        if (rec.clock < MILL.cut.every) return;
        rec.clock = 0;
        const d = unit2(e.cutVx ?? 0, e.cutVz ?? 0);
        spray('spark', e.x - d.x * 0.6, 0.1, e.z - d.z * 0.6, MILL.cut.sparks, { color: PALETTE.hearthAmber, speed: [1.2, 2.6], up: [0.6, 1.4], size: [0.03, 0.06], life: [0.15, 0.3], dir: { x: -d.x, z: -d.z }, dirBias: 0.8 });
        spray('shard', e.x, 0.2, e.z, 1, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 1.6], up: [1.2, 2.0], size: [0.09, 0.13], life: [0.35, 0.55], gravity: 7, drag: 0.4 });
      } else if (e.mode === 'dizzy') {
        if (rec.clock < 0.14) return;
        rec.clock = 0;
        const a = (rec.spin = (rec.spin ?? 0) + 1.1);
        spray('spark', e.x + Math.cos(a) * 0.6, 2.1, e.z + Math.sin(a) * 0.6, 1, { color: BONE, speed: [0.05, 0.15], up: [0.0, 0.2], size: [0.06, 0.1], life: [0.4, 0.6], gravity: 0, drag: 1.6, opacity: 0.9 });
      } else if (e.mode === 'roll') {
        if (rec.clock < MILL.roll.every) return;
        rec.clock = 0;
        spray('shard', e.x, 0.9, e.z, 1, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.1, 0.4], up: [0.2, 0.6], size: [0.08, 0.12], life: [0.4, 0.6], gravity: 7, drag: 0.4 });
        if (rnd(0, 1) < 0.5) spray('spark', e.x, 0.1, e.z, 1, { color: PALETTE.hearthAmber, speed: [0.6, 1.2], up: [0.4, 0.8], size: [0.03, 0.05], life: [0.12, 0.22] });
      }
      return;
    }
    if (e.kind === 'lichram') {
      if (e.mode === 'rush' && rec.clock >= LICH.rush.every) {
        rec.clock = 0;
        spray('smoke', e.x, 0.15, e.z, 1, { color: vfxMatterColor('earth'), speed: [0.2, 0.5], up: [0.2, 0.4], size: [0.3, 0.42], grow: 1.2, life: [0.5, 0.8], opacity: 0.3, gravity: -0.15, drag: 2.4 });
      } else if (e.enraged && rec.clock >= 0.22) {
        rec.clock = 0;
        spray('spark', e.x, 1.2, e.z, 1, { color: LICH.corruption, speed: [0.05, 0.2], up: [0.6, 1.0], size: [0.05, 0.09], life: [0.7, 1.0], gravity: -0.3, drag: 1.4, jitter: 0.5, opacity: 0.85 });
      }
    }
  }

  return { THORN, thornRoot, thornmotherDeath, MILL, millwheelDeath, LICH, graveBurst, lichEnrage, lichramDeath, CANT, COLO, GLASS, SLATE, VERSE_TINT, cantorDeath, colossusEnrage, colossusDeath, heartBossFrame, s2Clock, slice2Frame };
}
