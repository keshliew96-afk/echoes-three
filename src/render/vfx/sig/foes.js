// THE ENEMY LOOKS: enemy attacks, shots and deaths, the Hollow Stag's, and the
// content slice 1 creatures (the spore cloud and its kin).
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxBossStyle, vfxEnemyStyle, vfxFoeShotColor, vfxMatterColor } from '../../../data/vfx.js';
import { BONE, EMBER, ENEMY_SHOT_TRAIL, ESHOT_Y, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../../enemies/style.js';

export function createSigFoes(ctx) {
  const { SF, N, bus, camfx, kit, mark, rnd, spray, world } = ctx;

  // ------------------------------------------------------------ enemies --
  // Glob / shot id -> the kind that threw it: a Rotcap's spore glob outlives
  // its body, and a Barrow Crow's feather darts trail differently.
  const globKind = new Map();
  const shotKind = new Map();
  const shotHue = new Map(); // eshot id -> its shooter's template hue
  bus.on('enemy_fire', (ev) => {
    const owner = SF.byId(ev.id);
    if (owner && ev.shot != null && ENEMY_SHOT_TRAIL[owner.kind]) shotKind.set(ev.shot, owner.kind);
    // A shot glows in its shooter's hue, never Ember (Kesh's "Crimson
    // cores" pick): Ember is for the floor warnings.
    const hue = vfxFoeShotColor(owner ? (owner.telegraph && owner.telegraph.champion) || owner.kind : null);
    if (ev.shot != null) shotHue.set(ev.shot, hue);
    // The crow's caw flash and the Millwheel's fan are their own recipes.
    if (owner?.kind !== 'crow' && owner?.kind !== 'millwheel') {
      kit.flash({ x: ev.x, y: ESHOT_Y, z: ev.z, color: hue, size: 0.34, life: 0.12 });
      SF.flare(ev.x + (ev.dx ?? 0) * 0.3, ESHOT_Y, ev.z + (ev.dz ?? 0) * 0.3, hue, 0.5, { life: 0.12, angle: Math.atan2(ev.dz ?? 0, ev.dx ?? 1) });
    }
  });
  bus.on('enemy_lob', (ev) => {
    const owner = SF.byId(ev.id);
    const kind = SF.byId(ev.glob)?.ownerKind ?? owner?.kind ?? 'toad';
    if (ev.glob != null) globKind.set(ev.glob, kind);
    if (ev.affix) return; // ELITE AFFIXES: no lob, the burst swells in place
    if (ev.sack) return SF.millerToss(ev); // the Drowned Miller's flour sack
    if (ev.weight) return; // the Hourwarden's weights fall, they are not thrown
    if (ev.ember) return; // the Cinderback's gobbets fly off its spit
    // The spore burst, the seed volley and the grave call are their own recipes.
    if (kind === 'rotcap' || kind === 'thornmother' || kind === 'lichram' || kind === 'geode') return; // (the geode's shards fly off its slam)
    const es = vfxEnemyStyle(owner?.kind ?? 'toad', 'lobber');
    spray('shard', ev.x, 0.55, ev.z, 3, { color: vfxMatterColor(es.matter), tile: SHARD_TILE.drop, speed: [0.4, 1.0], up: [1.2, 2.0], size: [0.1, 0.14], life: [0.4, 0.6], gravity: 6, spin: [-2, 2] });
  });
  bus.on('enemy_glob_land', (ev) => {
    const kind = globKind.get(ev.id);
    globKind.delete(ev.id);
    if (ev.affix) return SF.affixBurst(ev); // ELITE AFFIXES: Molten / Frozen / batch two
    if (ev.sack) return SF.sackLand(ev);
    if (ev.weight) return SF.weightLand(ev); // the Hourwarden's clock weights
    if (ev.ember) return SF.emberLand(ev); // the Cinderback's gobbets
    if (kind === 'rotcap') {
      sporeCloud(ev.x, ev.z, ev.radius ?? 1.2);
      return;
    }
    if (kind === 'thornmother') return SF.thornRoot(ev.x, ev.z, ev.radius ?? 1.0);
    if (kind === 'lichram') return SF.graveBurst(ev.x, ev.z, ev.radius ?? 1.0);
    if (kind === 'geode' || kind === 'colossus') return SF.crystalShatter(ev.x, ev.z, ev.radius ?? 0.8);
    const owner = SF.byId(ev.owner);
    const es = vfxEnemyStyle(owner?.kind ?? 'toad', 'lobber');
    const matter = vfxMatterColor(es.matter);
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.14, life: 0.4, core: EMBER, glow: EMBER, soft: 0.6, y: 0.04, opacity: 0.55, gain: 0.7 });
    SF.flare(ev.x, 0.3, ev.z, EMBER, 0.9, { kind: 'burst', life: 0.2 });
    kit.mark({ x: ev.x, z: ev.z, radius: (ev.radius ?? 1) * 1.3, kind: 'splash', stain: matter, glow: EMBER, cool: 0.4, life: 3.0, opacity: 0.5 });
    spray('shard', ev.x, 0.3, ev.z, 8, { color: matter, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.4, 2.6], size: [0.1, 0.16], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2] });
    spray('smoke', ev.x, 0.2, ev.z, 2, { color: matter, speed: [0.3, 0.7], up: [0.2, 0.4], size: [0.32, 0.45], grow: 1, life: [0.5, 0.8], opacity: 0.35, gravity: -0.1, drag: 2.4 });
  });
  bus.on('enemy_charge_end', (ev) => {
    const es = vfxEnemyStyle(ev.etype, 'charger');
    const matter = vfxMatterColor(es.matter);
    if (es.shard) {
      // Quillback: quills fly off radially where the roll stops.
      for (let i = 0; i < N(8); i++) {
        const a = (i / 8) * TAU + rnd(-0.15, 0.15);
        kit.streak({ a: { x: ev.x, y: 0.4, z: ev.z }, b: { x: ev.x + Math.cos(a) * 0.25, y: 0.42, z: ev.z + Math.sin(a) * 0.25 }, width: 0.05, tailW: 0, core: matter, glow: EMBER, life: 0.24, travel: { x: Math.cos(a) * 4, y: 0, z: Math.sin(a) * 4 }, fall: 0.5 });
      }
    }
    spray('smoke', ev.x, 0.2, ev.z, es.dust || 2, { color: matter, speed: [0.5, 1.2], up: [0.2, 0.5], size: [0.32, 0.48], grow: 1.2, life: [0.6, 0.9], opacity: 0.32, gravity: -0.2, drag: 2.6 });
    SF.shock(ev.x, ev.z, 1.0, matter, { life: 0.35, width: 0.12, core: BONE });
    if (ev.cause === 'wall') SF.flare(ev.x, 0.4, ev.z, EMBER, 0.8, { kind: 'burst', life: 0.2 });
    if (ev.cause === 'wall') spray('chunk', ev.x, 0.3, ev.z, 4, { color: matter, speed: [1.0, 2.0], up: [1.2, 2.2], size: [0.06, 0.12], life: [0.4, 0.7] });
  });
  bus.on('enemy_slam', (ev) => {
    const owner = SF.byId(ev.id);
    const es = vfxEnemyStyle(ev.etype ?? owner?.kind, 'brute');
    const matter = vfxMatterColor(es.matter);
    const ang = owner ? Math.atan2(ev.z - owner.z, ev.x - owner.x) : 0;
    const ox = owner ? owner.x : ev.x;
    const oz = owner ? owner.z : ev.z;
    kit.slash({ x: ox, z: oz, angle: ang, radius: Math.max(0.8, Math.hypot(ev.x - ox, ev.z - oz) + 0.3), width: 0.36, span: 1.3, sweep: 0.08, life: 0.35, core: PARCH, glow: EMBER, soft: 0.4, jag: 0.5, lift: 0.04, y: 0.2, gain: 0.9 });
    kit.crack({ x: ev.x, z: ev.z, radius: 0.8, glow: EMBER, life: 1.0, cool: 0.3 });
    SF.flare(ev.x, 0.35, ev.z, EMBER, 1.1, { kind: 'burst', life: 0.22 });
    SF.shock(ev.x, ev.z, 1.3, EMBER, { life: 0.32, width: 0.1, jag: 0.6 });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.3, kind: 'crater', stain: matter, glow: EMBER, cool: 0.6, life: 3.0, opacity: 0.5 });
    spray('chunk', ev.x, 0.3, ev.z, es.chunk || 5, { color: matter, speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.14], life: [0.5, 0.8] });
    spray('spark', ev.x, 0.4, ev.z, 5, { color: PARCH, speed: [1.6, 3.0], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.28] });
  });
  bus.on('enemy_swoop', (ev) => {
    if (ev.etype === 'wasp') return SF.waspDart(ev);
    const es = vfxEnemyStyle(ev.etype, 'flyer');
    spray('smoke', ev.x, 0.9, ev.z, 2, { color: vfxMatterColor(es.matter), speed: [0.2, 0.5], up: [-0.4, -0.1], size: [0.28, 0.4], grow: 1, life: [0.6, 0.9], opacity: 0.3, gravity: 0.3, drag: 2 });
  });
  bus.on('enemy_swoop_end', (ev) => {
    if (ev.etype === 'wasp') return SF.waspDartEnd(ev);
    const es = vfxEnemyStyle(ev.etype, 'flyer');
    const matter = vfxMatterColor(es.matter);
    spray('smoke', ev.x, 0.4, ev.z, es.dust || 3, { color: matter, speed: [0.4, 1.0], up: [0.1, 0.4], size: [0.32, 0.46], grow: 1.3, life: [0.8, 1.2], opacity: 0.3, gravity: 0.15, drag: 2.2 });
    spray('spark', ev.x, 0.5, ev.z, 5, { color: matter, speed: [0.3, 0.8], up: [-0.2, 0.3], size: [0.04, 0.07], life: [0.7, 1.1], gravity: 0.3, drag: 1.5, opacity: 0.6 });
  });
  bus.on('enemy_emerge', (ev) => {
    if (ev.etype === 'lamprey') return SF.lampreyRise(ev);
    const es = vfxEnemyStyle(ev.etype, 'burrower');
    const matter = vfxMatterColor(es.matter);
    kit.crack({ x: ev.x, z: ev.z, radius: 1.0, glow: EMBER, life: 1.2, cool: 0.3 });
    SF.flare(ev.x, 0.3, ev.z, EMBER, 1.0, { kind: 'burst', life: 0.22 });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.4, kind: 'crater', stain: matter, glow: EMBER, cool: 0.5, life: 3.0, opacity: 0.55 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.2, life: 0.4, core: matter, glow: EMBER, soft: 0.5, jag: 0.8, y: 0.04, opacity: 0.7, gain: 0.6 });
    spray('chunk', ev.x, 0.15, ev.z, es.chunk || 6, { color: matter, speed: [0.6, 1.6], up: [2.4, 4.0], size: [0.07, 0.16], life: [0.6, 1.0], jitter: 0.25 });
    spray('smoke', ev.x, 0.2, ev.z, es.dust || 3, { color: matter, speed: [0.5, 1.2], up: [0.4, 0.9], size: [0.36, 0.52], grow: 1.3, life: [0.7, 1.1], opacity: 0.34, gravity: -0.15, drag: 2.4 });
  });
  bus.on('enemy_burrow', (ev) => {
    if (ev.etype === 'lamprey') return SF.lampreyDive(ev);
    const es = vfxEnemyStyle(ev.etype, 'burrower');
    const matter = vfxMatterColor(es.matter);
    spray('smoke', ev.x, 0.15, ev.z, 3, { color: matter, speed: [0.4, 0.9], up: [0.2, 0.5], size: [0.3, 0.45], grow: 1.2, life: [0.6, 0.9], opacity: 0.32, gravity: -0.15, drag: 2.4 });
    spray('chunk', ev.x, 0.15, ev.z, 4, { color: matter, speed: [0.5, 1.2], up: [1.2, 2.0], size: [0.06, 0.12], life: [0.4, 0.7] });
  });
  bus.on('telegraph_start', (ev) => {
    // The wind-up gathers: a few Ember motes drawn in to the body. (The
    // telegraph SHAPE itself is the enemy layer's and unchanged.)
    const e = SF.byId(ev.id);
    if (!e) return;
    // The Bell Sacristan's hush is a ward, not a threat: pale, never Ember.
    if (e.telegraph && e.telegraph.hush) return SF.sacristanGather(e);
    spray('spark', e.x, 0.25, e.z, 3, { color: EMBER, speed: [0.05, 0.2], up: [0.6, 1.1], size: [0.05, 0.1], life: [0.35, 0.55], gravity: -0.4, drag: 1.4, jitter: 0.35, opacity: 0.8 });
    // Anticipation: a few Ember lines rush into the body as it winds up
    // (the telegraph shape on the floor stays the enemy layer's).
    for (let i = 0; i < 4; i++) {
      const a = rnd(0, TAU);
      kit.streak({ a: { x: e.x + Math.cos(a) * 1.1, y: 0.5, z: e.z + Math.sin(a) * 1.1 }, b: { x: e.x + Math.cos(a) * 0.8, y: 0.5, z: e.z + Math.sin(a) * 0.8 }, width: 0.04, tailW: 0, core: PARCH, glow: EMBER, life: 0.14, delay: i * 0.03, travel: { x: -Math.cos(a) * 5, y: 0, z: -Math.sin(a) * 5 }, fall: 1.2, opacity: 0.8 });
    }
  });

  // -------------------------------------------------------------- boss --
  bus.on('boss_quake_start', (ev) => {
    const b = SF.byId(ev.id);
    const bs = vfxBossStyle(b?.kind ?? 'stag');
    if (!b) return;
    kit.pillar({ x: b.x, z: b.z, radius: 0.5, height: 2.6, color: bs.corruption, life: 0.6, opacity: 0.4 });
    kit.flash({ x: b.x, y: 2.2, z: b.z, color: bs.peak, size: 1.0, life: 0.3 });
  });
  bus.on('boss_quake_resolve', (ev) => {
    const b = SF.byId(ev.id);
    const bs = vfxBossStyle(b?.kind ?? 'stag');
    const q = bs.quake;
    const r = ev.radius ?? 1.6;
    const matter = vfxMatterColor(bs.matter);
    kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: r * 1.15, width: 0.36, life: 0.6, core: bs.peak, glow: bs.corruption, soft: 0.4, jag: 0.9, y: 0.05 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: r * 0.85, width: 0.2, life: 0.45, core: PARCH, glow: bs.threat, soft: 0.3, y: 0.08, delay: 0.04 });
    kit.ring({ x: ev.x, z: ev.z, r0: r * 0.5, r1: r * 1.5, width: 0.5, life: 0.9, core: matter, glow: matter, soft: 0.95, y: 0.2, delay: 0.06, opacity: 0.45, gain: 0.5 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 1.25, glow: bs.corruption, life: 2.4, cool: 0.9 });
    SF.flare(ev.x, 0.6, ev.z, bs.corruption, 2.6, { kind: 'burst', life: 0.32, core: bs.peak });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.6, kind: 'crater', stain: vfxMatterColor(bs.matter), glow: bs.corruption, cool: 1.4, life: 4.5, opacity: 0.6 });
    kit.pillar({ x: ev.x, z: ev.z, radius: r * 0.45, height: q.pillarH, color: bs.corruption, life: q.life, opacity: 0.65 });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: bs.peak, size: 1.6, life: 0.3, hold: 0.1 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.7, color: bs.corruption, opacity: 0.6, life: 0.9, attack: 0.04 });
    spray('chunk', ev.x, 0.2, ev.z, q.chunk, { color: matter, speed: [1.0, 2.6], up: [2.4, 4.4], size: [0.08, 0.18], life: [0.7, 1.1], jitter: r * 0.4 });
    for (let i = 0; i < N(q.dust); i++) {
      const a = (i / q.dust) * TAU + rnd(-0.2, 0.2);
      spray('smoke', ev.x + Math.cos(a) * r * 0.5, 0.2, ev.z + Math.sin(a) * r * 0.5, 1, { color: matter, speed: r * 1.6, up: [0.1, 0.4], size: [0.45, 0.65], grow: 1.5, life: [0.9, 1.3], opacity: 0.34, gravity: -0.12, drag: 2.6, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 1 });
    }
    spray('spark', ev.x, 0.1, ev.z, q.embers, { color: bs.corruption, speed: [0.1, 0.5], up: [0.6, 1.4], size: [0.06, 0.12], life: [1.0, 1.6], gravity: -0.35, drag: 1.4, jitter: r * 0.7, opacity: 0.85 });
    camfx.dolly(ev.x, ev.z, bs.camera.dolly, 0.32);
  });
  bus.on('boss_trample', (ev) => {
    const b = SF.byId(ev.id);
    const t = SF.byId(ev.target);
    const bs = vfxBossStyle(b?.kind ?? 'stag');
    const ang = t ? Math.atan2(t.z - ev.z, t.x - ev.x) : 0;
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 1.5, width: 0.42, span: 1.5, sweep: 0.09, life: 0.4, core: bs.peak, glow: bs.corruption, soft: 0.4, jag: 0.5, lift: 0.05, y: 0.25 });
    kit.crack({ x: ev.x + Math.cos(ang) * 0.8, z: ev.z + Math.sin(ang) * 0.8, radius: 0.9, glow: bs.corruption, life: 1.2, cool: 0.4 });
    SF.flare(ev.x + Math.cos(ang) * 0.9, 0.4, ev.z + Math.sin(ang) * 0.9, bs.corruption, 1.4, { kind: 'burst', life: 0.24, core: bs.peak });
    kit.mark({ x: ev.x + Math.cos(ang) * 0.9, z: ev.z + Math.sin(ang) * 0.9, radius: 1.3, kind: 'gouge', angle: ang, stretch: 1.6, stain: vfxMatterColor(bs.matter), glow: bs.corruption, cool: 0.7, life: 3, opacity: 0.5 });
    spray('chunk', ev.x, 0.2, ev.z, bs.trample.chunk, { color: vfxMatterColor(bs.matter), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.15], life: [0.5, 0.9], dir: { x: Math.cos(ang), z: Math.sin(ang) }, dirBias: 0.5 });
    camfx.kick(Math.cos(ang), Math.sin(ang), 0.05, 0.16);
  });
  bus.on('boss_adds', (ev) => {
    const b = SF.byId(ev.id) ?? world.entities().find((e) => e.kind === 'stag');
    if (!b) return;
    const bs = vfxBossStyle(b.kind);
    kit.flash({ x: b.x, y: 2.3, z: b.z, color: bs.peak, size: 1.4, life: 0.4, hold: 0.1 });
    kit.ring({ x: b.x, z: b.z, r0: 0.6, r1: 3.2, width: 0.18, life: 0.7, core: bs.peak, glow: bs.corruption, soft: 0.5, y: 0.06 });
    kit.light({ x: b.x, z: b.z, radius: 3, color: bs.corruption, opacity: 0.45, life: 0.8 });
  });
  function bossDeath(x, z) {
    const bs = vfxBossStyle('stag');
    kit.pillar({ x, z, radius: 1.0, height: 4, color: bs.corruption, life: 1.4, opacity: 0.7 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: bs.peak, glow: bs.corruption, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 2.2, glow: bs.corruption, life: 3, cool: 1.2 });
    SF.flare(x, 1.0, z, bs.corruption, 3.2, { kind: 'burst', life: 0.45, core: bs.peak, spin: 0.8 });
    kit.mark({ x, z, radius: 3.2, kind: 'crater', stain: vfxMatterColor(bs.matter), glow: bs.corruption, cool: 2.0, life: 6, opacity: 0.6 });
    kit.light({ x, z, radius: 4, color: bs.corruption, opacity: 0.6, life: 1.4 });
    spray('spark', x, 0.4, z, 30, { color: bs.corruption, speed: [0.3, 1.2], up: [0.8, 2.0], size: [0.06, 0.13], life: [1.2, 2.0], gravity: -0.3, drag: 1.2, jitter: 0.8 });
    spray('chunk', x, 0.5, z, 18, { color: vfxMatterColor(bs.matter), speed: [1.2, 3.0], up: [2.0, 4.0], size: [0.08, 0.18], life: [0.8, 1.2], jitter: 0.6 });
    camfx.dolly(x, z, bs.camera.dolly, 0.5);
  }

  // ------------------------------------------------- content slice 1 --
  // (docs/CONTENT_PLAN.md §2-3, design-VFX.md §5b / §6b) The Sunken Mill and
  // Ashen Barrow creatures. Same law as the first seven: Ember only on the
  // threat itself, the body's own matter on what breaks, no camera on
  // rank-and-file enemies; the bosses keep violet as their corruption and
  // get the dolly on their biggest beats. Every telegraph shape stays the
  // sim's: these play at the resolve, never over the warning.
  const SPORE = vfxMatterColor('spore');
  const SHELL = vfxMatterColor('shell');
  const FEATHER = vfxMatterColor('feather');
  const ICHOR = vfxMatterColor('ichor');
  const WATER = vfxMatterColor('water');
  const SILT = vfxMatterColor('silt');
  const CINDER = vfxMatterColor('cinder');
  const EARTH = vfxMatterColor('earth');
  const CHITIN = vfxMatterColor('chitin');
  const unit2 = (dx, dz) => {
    const l = Math.hypot(dx, dz);
    return l > 1e-5 ? { x: dx / l, z: dz / l } : { x: 0, z: 1 };
  };

  // Rotcap — "the cap that bursts". The kill pops the cap (pale spore puff,
  // cap fragments); the landing 48 ticks later is a spore cloud that rolls
  // out to the ring's edge and hangs over the slick.
  bus.on('rotcap_burst', (ev) => {
    mark('rotcap_burst');
    const { x, z } = ev;
    spray('chunk', x, 0.5, z, 4, { color: SPORE, speed: [0.6, 1.4], up: [1.6, 2.6], size: [0.07, 0.12], life: [0.5, 0.8], jitter: 0.15 });
    spray('smoke', x, 0.45, z, 4, { color: SPORE, speed: [0.1, 0.35], up: [0.4, 0.8], size: [0.36, 0.5], grow: 1.7, life: [1.0, 1.4], opacity: 0.4, gravity: -0.25, drag: 2.2, jitter: 0.2 });
    spray('spark', x, 0.5, z, 8, { color: SPORE, speed: [0.1, 0.4], up: [0.3, 0.8], size: [0.04, 0.07], life: [1.2, 1.8], gravity: -0.15, drag: 1.6, jitter: 0.3, opacity: 0.8 });
    kit.flash({ x, y: 0.55, z, color: SPORE, size: 0.6, life: 0.2 });
    SF.flare(x, 0.55, z, SPORE, 0.9, { kind: 'burst', life: 0.22 });
  });
  function sporeCloud(x, z, radius) {
    mark('rotcap_spore_cloud');
    // The threat edge (Ember, thin) under a soft spore wave rolling out.
    kit.ring({ x, z, r0: 0.2, r1: radius, width: 0.08, life: 0.35, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.7, gain: 0.7 });
    kit.ring({ x, z, r0: 0.3, r1: radius * 1.15, width: 0.45, life: 0.8, core: SPORE, glow: SPORE, soft: 0.95, y: 0.12, delay: 0.03, opacity: 0.45, gain: 0.4 });
    for (let i = 0; i < N(8); i++) {
      const a = (i / 8) * TAU + rnd(-0.2, 0.2);
      spray('smoke', x + Math.cos(a) * 0.25, 0.25, z + Math.sin(a) * 0.25, 1, { color: SPORE, speed: radius * 1.8, up: [0.1, 0.35], size: [0.4, 0.56], grow: 1.6, life: [1.1, 1.5], opacity: 0.36, gravity: -0.12, drag: 2.8, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 1 });
    }
    SF.flare(x, 0.3, z, EMBER, 1.0, { kind: 'burst', life: 0.2, core: SPORE });
    kit.mark({ x, z, radius: radius * 1.5, kind: 'splash', stain: SPORE, glow: null, life: 3.5, opacity: 0.35 });
    // Motes that hang over the slick: the "don't stand here" afterglow.
    spray('spark', x, 0.15, z, 16, { color: SPORE, speed: [0.05, 0.25], up: [0.2, 0.6], size: [0.04, 0.08], life: [1.8, 2.6], gravity: -0.08, drag: 1.8, jitter: radius * 0.8, opacity: 0.75 });
  }

  // Lantern Snail — "a cold lamp that mends". The mend is not an attack and
  // not party healing, so it is neither Ember nor Bright Heal: an indigo
  // (the rank-and-file corruption tell) pulse off the shell-lantern, a tether
  // to each body it mended and indigo motes rising off them.
  const LANTERN_Y = 0.78;
  bus.on('snail_mend', (ev) => {
    mark('snail_mend');
    const { x, z } = ev;
    const r = ev.radius ?? 3.2;
    kit.flash({ x, y: LANTERN_Y, z, color: TELL_INDIGO_GLOW, size: 0.9, life: 0.35, hold: 0.08 });
    kit.ring({ x, z, r0: 0.3, r1: r, width: 0.1, life: 0.7, core: TELL_INDIGO, glow: TELL_INDIGO_GLOW, soft: 0.6, y: 0.05, opacity: 0.7 });
    kit.light({ x, z, radius: r * 0.7, color: TELL_INDIGO_GLOW, opacity: 0.35, life: 0.6, attack: 0.06 });
    SF.flare(x, LANTERN_Y, z, TELL_INDIGO_GLOW, 1.0, { kind: 'burst', life: 0.3 });
    kit.mark({ x, z, radius: r * 0.9, kind: 'sigil', stain: INK, glow: TELL_INDIGO_GLOW, cool: 1.0, life: 1.5, opacity: 0.1 });
    for (const h of ev.healed || []) {
      const t = SF.byId(h.id);
      if (!t) continue;
      kit.streak({ a: { x, y: LANTERN_Y, z }, b: { x: t.x, y: 0.5, z: t.z }, width: 0.05, tailW: 0.05, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, life: 0.4, fall: 1.0, opacity: 0.8 });
      spray('spark', t.x, 0.3, t.z, 4, { color: TELL_INDIGO_GLOW, speed: [0.05, 0.25], up: [0.8, 1.4], size: [0.05, 0.09], life: [0.6, 0.9], gravity: -0.3, drag: 1.6, jitter: 0.25, opacity: 0.85 });
    }
  });

  // Barrow Crow — "a caw and three darts". At the release: an Ember beak
  // flash, a short caw arc across the fan, three muzzle lines on the three
  // headings, black feathers shaken off its back. Its shots trail as thin
  // bone-cored darts (ENEMY_SHOT_TRAIL), not the mantis's fat sickle.
  bus.on('crow_volley', (ev) => {
    mark('crow_volley');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const base = Math.atan2(d.z, d.x);
    const bx = ev.x + d.x * 0.3;
    const bz = ev.z + d.z * 0.3;
    kit.flash({ x: bx, y: 0.55, z: bz, color: EMBER, size: 0.4, life: 0.12 });
    SF.flare(bx, 0.55, bz, EMBER, 0.8, { life: 0.16, angle: base });
    kit.slash({ x: ev.x, z: ev.z, angle: base, radius: 0.7, width: 0.07, span: 0.6, sweep: 0.05, life: 0.2, core: PARCH, glow: EMBER, soft: 0.3, lift: 0.1, y: 0.5, gain: 0.8 });
    for (const k of [-1, 0, 1]) {
      const a = base + k * 0.26;
      kit.streak({ a: { x: bx, y: 0.52, z: bz }, b: { x: bx + Math.cos(a) * 0.6, y: 0.52, z: bz + Math.sin(a) * 0.6 }, width: 0.04, tailW: 0.05, core: BONE, glow: EMBER, life: 0.14, fall: 1.4 });
    }
    spray('shard', ev.x - d.x * 0.15, 0.7, ev.z - d.z * 0.15, 3, { color: FEATHER, tile: SHARD_TILE.feather, speed: [0.3, 0.8], up: [0.5, 1.0], size: [0.12, 0.16], life: [0.8, 1.2], gravity: 0.8, drag: 1.8, spin: [-3, 3], flutter: 0.5, dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
  });

  // Brood Spider — "the sac splits". The mother's corpse bursts: a wet ichor
  // ring, ichor drops, and pale web strands thrown to each Broodling.
  bus.on('brood_split', (ev) => {
    mark('brood_split');
    const { x, z } = ev;
    kit.ring({ x, z, r0: 0.2, r1: 1.0, width: 0.16, life: 0.45, core: ICHOR, glow: ICHOR, soft: 0.8, y: 0.03, opacity: 0.6, gain: 0.5 });
    kit.flash({ x, y: 0.4, z, color: BONE, size: 0.55, life: 0.16 });
    kit.mark({ x, z, radius: 1.3, kind: 'splash', stain: ICHOR, glow: null, life: 3.5, opacity: 0.45 });
    spray('shard', x, 0.4, z, 10, { color: ICHOR, tile: SHARD_TILE.drop, speed: [0.8, 2.0], up: [1.2, 2.4], size: [0.1, 0.15], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2] });
    for (const id of ev.brood || []) {
      const b = SF.byId(id);
      if (!b) continue;
      kit.streak({ a: { x, y: 0.35, z }, b: { x: b.x, y: 0.2, z: b.z }, width: 0.025, tailW: 0, core: BONE, glow: BONE, life: 0.6, fall: 0.6, opacity: 0.7 });
      spray('spark', b.x, 0.2, b.z, 2, { color: ICHOR, speed: [0.2, 0.5], up: [0.4, 0.8], size: [0.04, 0.07], life: [0.3, 0.5] });
    }
  });

  // Deaths: each body breaks into what it is made of (on top of the shared
  // kill puff in enemyDeath).
  const CREATURE_DEATH = {
    rotcap: (es, matter, x, z) => {
      mark('rotcap_death');
      spray('smoke', x, 0.4, z, 2, { color: SPORE, speed: [0.2, 0.5], up: [0.3, 0.6], size: [0.34, 0.46], grow: 1.5, life: [0.9, 1.2], opacity: 0.32, gravity: -0.2, drag: 2.4 });
    },
    snail: (es, matter, x, z) => {
      // The lantern pops and goes out; the shell cracks into slate shards.
      mark('snail_death');
      kit.flash({ x, y: LANTERN_Y, z, color: TELL_INDIGO_GLOW, size: 0.75, life: 0.22 });
      kit.light({ x, z, radius: 1.2, color: TELL_INDIGO_GLOW, opacity: 0.4, life: 0.35 });
      spray('chunk', x, 0.45, z, es.chunk, { color: SHELL, speed: [1.0, 2.2], up: [1.4, 2.6], size: [0.07, 0.14], life: [0.5, 0.8] });
      spray('spark', x, LANTERN_Y, z, 6, { color: TELL_INDIGO_GLOW, speed: [0.3, 0.9], up: [0.2, 0.8], size: [0.04, 0.08], life: [0.4, 0.7], drag: 1.4 });
      kit.ring({ x, z, r0: 0.2, r1: 0.8, width: 0.12, life: 0.4, core: vfxMatterColor('slime'), glow: vfxMatterColor('slime'), soft: 0.8, y: 0.03, opacity: 0.55, gain: 0.5 });
    },
    crow: (es, matter, x, z) => {
      // A burst of black feathers that drift down slowly.
      mark('crow_death');
      spray('shard', x, 0.7, z, es.feathers ?? 9, { color: FEATHER, tile: SHARD_TILE.feather, speed: [0.6, 1.6], up: [0.8, 1.8], size: [0.13, 0.19], life: [1.3, 1.9], gravity: 0.6, drag: 1.9, spin: [-3, 3], flutter: 0.6 });
      spray('shard', x, 0.6, z, 2, { color: BONE, tile: SHARD_TILE.needle, speed: [0.6, 1.2], up: [0.8, 1.4], size: [0.08, 0.11], life: [0.5, 0.8], gravity: 4, spin: [-8, 8] });
    },
    brood: (es, matter, x, z) => {
      mark('brood_death');
      spray('shard', x, 0.35, z, es.legs ?? 8, { color: CHITIN, tile: SHARD_TILE.needle, speed: [1.0, 2.0], up: [0.8, 1.6], size: [0.11, 0.15], life: [0.5, 0.8], gravity: 5, drag: 0.6, spin: [-10, 10] });
    },
    broodling: (es, matter, x, z) => {
      mark('broodling_death');
      spray('shard', x, 0.25, z, es.legs ?? 3, { color: CHITIN, tile: SHARD_TILE.needle, speed: [0.8, 1.5], up: [0.6, 1.2], size: [0.08, 0.11], life: [0.4, 0.6], gravity: 5, spin: [-10, 10] });
      kit.ring({ x, z, r0: 0.1, r1: 0.45, width: 0.08, life: 0.3, core: ICHOR, glow: ICHOR, soft: 0.8, y: 0.03, opacity: 0.5, gain: 0.4 });
    },
  };

  return { globKind, shotKind, shotHue, bossDeath, SPORE, SHELL, FEATHER, ICHOR, WATER, SILT, CINDER, EARTH, CHITIN, unit2, sporeCloud, LANTERN_Y, CREATURE_DEATH };
}
