// THE NEW WOOD, MILL, BARROW AND HEART FOE LOOKS (docs/WOOD_MILL_ENEMIES.md,
// docs/NEW_ENEMIES_BARROW_HEART.md): their attacks, frames and deaths.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { vfxMatterColor } from '../../../data/vfx.js';
import { BONE, EMBER, INK, PARCH, TAU } from './common.js';
import { SHARD_TILE } from '../particles.js';
import { TELL_INDIGO_GLOW } from '../../enemies/style.js';

export function createSigFoes3(ctx) {
  const { SF, BRAMBLE, CREATURE_DEATH, CRYSTAL, DIRT, EARTH, HFLESH, HV, HVP, IRON, N, WATER, after, bus, kit, mark, rnd, spray, unit2, world } = ctx;

  // ------------------------------------------ new enemies, Wood and Mill --
  // (docs/WOOD_MILL_ENEMIES.md) Same grammar as the slices before them: the
  // body's own matter on what breaks, Ember only on what hurts, indigo where
  // the corruption leaves, no camera on rank-and-file enemies.
  const OWLF = vfxMatterColor('owlfeather');
  const LEECH = vfxMatterColor('leech');
  const FLOUR = vfxMatterColor('flour');
  const STONE = vfxMatterColor('stone');
  const OWL_Y = 1.5;

  // Shriek Owl — "the scream you can see". The shriek leaves the beak as a
  // bright Ember edge filling the cone (that is what hit you), then three
  // pale sound fronts roll down it, each wider and fainter; the floor under
  // the cone is scoured pale, and down drifts off the owl.
  bus.on('owl_shriek', (ev) => {
    mark('owl_shriek');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const ang = Math.atan2(d.z, d.x);
    const r = ev.radius ?? 3.8;
    const span = ((ev.halfAngleDeg ?? 30) * 2 * Math.PI) / 180;
    const bx = ev.x + d.x * 0.25;
    const bz = ev.z + d.z * 0.25;
    SF.flare(bx, OWL_Y, bz, EMBER, 0.8, { kind: 'burst', life: 0.18, angle: ang });
    kit.flash({ x: bx, y: OWL_Y, z: bz, color: PARCH, size: 0.55, life: 0.12 });
    // The hit: the Ember edge sweeping the full cone at once.
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.55, width: r * 0.9, span, sweep: 0.05, life: 0.22, core: EMBER, glow: EMBER, soft: 0.8, y: 0.12, lift: 0, grow: 0.3, gain: 0.5, opacity: 0.45 });
    // The sound fronts: arcs travelling out from the beak, pale and thin.
    for (let i = 0; i < 4; i++) {
      const dl = i * 0.07;
      const rr = 0.6 + i * 0.85;
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: rr, width: 0.12 - i * 0.015, span: span * (0.85 + i * 0.06), sweep: 0.04, life: 0.3, core: i === 0 ? PARCH : OWLF, glow: i === 0 ? EMBER : OWLF, soft: 0.5, y: OWL_Y - 0.25 * i, lift: 0, grow: 1.4, delay: dl, gain: 0.9 - i * 0.15, opacity: 0.95 - i * 0.18 });
    }
    kit.mark({ x: ev.x + d.x * r * 0.55, z: ev.z + d.z * r * 0.55, radius: r * 0.5, kind: 'gouge', angle: ang, stretch: 1.8, stain: OWLF, glow: EMBER, glowOpacity: 0.25, cool: 0.4, life: 2.2, opacity: 0.22 });
    kit.light({ x: ev.x + d.x * r * 0.5, z: ev.z + d.z * r * 0.5, radius: r * 0.55, color: EMBER, opacity: 0.25, life: 0.25, attack: 0.02 });
    spray('shard', ev.x, OWL_Y, ev.z, 5, { color: OWLF, tile: SHARD_TILE.feather, speed: [0.2, 0.6], up: [-0.1, 0.3], size: [0.1, 0.15], life: [1.0, 1.6], gravity: 0.6, drag: 1.8, spin: [-3, 3], flutter: 0.6, jitter: 0.2 });
    spray('smoke', ev.x + d.x * r * 0.6, 0.15, ev.z + d.z * r * 0.6, 3, { color: OWLF, speed: [0.6, 1.2], up: [0.1, 0.3], size: [0.3, 0.42], grow: 1.3, life: [0.5, 0.8], opacity: 0.22, gravity: -0.1, drag: 2.2, dir: d, dirBias: 0.7, jitter: r * 0.2 });
  });

  // Vine Lasher — "the whip and the drag". The lash is a vine snapping down
  // the lane at whip speed with a white crack where its hook lands and an
  // Ember line torn into the floor; every hero it catches is dragged home
  // along a taut green line with the ground skidding up under their feet.
  bus.on('lasher_lash', (ev) => {
    mark('lasher_lash');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 5;
    const ang = Math.atan2(d.z, d.x);
    const SPEED = 40;
    const sweep = len / SPEED;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: ev.width ?? 0.7, tailW: (ev.width ?? 0.7) * 0.8, core: EMBER, glow: EMBER, life: 0.2, fall: 2.4, opacity: 0.45 });
    kit.streak({ a: { x: ev.x + d.x * 0.3, y: 0.5, z: ev.z + d.z * 0.3 }, b: { x: ex, y: 0.35, z: ez }, width: 0.1, tailW: 0.07, core: BRAMBLE, glow: BRAMBLE, life: sweep + 0.3, fall: 1.6, opacity: 0.95 });
    kit.streak({ a: { x: ev.x, y: 0.5, z: ev.z }, b: { x: ev.x + d.x * 0.7, y: 0.45, z: ev.z + d.z * 0.7 }, width: 0.08, tailW: 0.3, core: PARCH, glow: EMBER, life: sweep, travel: { x: d.x * SPEED, y: -0.3, z: d.z * SPEED }, fall: 0.3 });
    after(sweep, () => {
      mark('lasher_crack');
      SF.flare(ex, 0.4, ez, EMBER, 0.95, { kind: 'star', life: 0.16, angle: ang });
      kit.flash({ x: ex, y: 0.4, z: ez, color: PARCH, size: 0.55, life: 0.1 });
      SF.shock(ex, ez, 0.8, BRAMBLE, { life: 0.26, width: 0.08, core: BONE });
      spray('shard', ex, 0.4, ez, 6, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [0.6, 1.4], size: [0.09, 0.13], life: [0.4, 0.7], gravity: 5, spin: [-8, 8], dir: d, dirBias: 0.4 });
    });
    const marks = Math.max(2, Math.min(4, Math.round(len / 1.6)));
    for (let i = 1; i <= marks; i++) {
      const k = (i - 0.5) / marks;
      kit.mark({ x: ev.x + d.x * len * k, z: ev.z + d.z * len * k, radius: (len / marks) * 0.6, kind: 'gouge', angle: ang, stretch: 2.0, stain: BRAMBLE, glow: EMBER, glowOpacity: 0.3, cool: 0.5, life: 2.6, opacity: 0.38, delay: sweep * k });
    }
  });
  bus.on('lasher_yank', (ev) => {
    mark('lasher_yank');
    for (const id of ev.ids || []) {
      const t = SF.byId(id);
      if (!t) continue;
      const d = unit2(ev.x - t.x, ev.z - t.z);
      const dist = Math.hypot(ev.x - t.x, ev.z - t.z);
      // The taut vine, reeling in.
      kit.streak({ a: { x: t.x, y: 0.55, z: t.z }, b: { x: ev.x, y: 0.5, z: ev.z }, width: 0.07, tailW: 0.05, core: BONE, glow: BRAMBLE, life: 0.24, fall: 1.4, opacity: 0.9 });
      kit.flash({ x: t.x, y: 0.55, z: t.z, color: EMBER, size: 0.4, life: 0.12 });
      // The skid: dust and torn earth thrown up as the feet drag.
      spray('smoke', t.x, 0.1, t.z, 3, { color: DIRT, speed: [0.3, 0.7], up: [0.2, 0.5], size: [0.26, 0.38], grow: 1.3, life: [0.5, 0.8], opacity: 0.3, gravity: -0.1, drag: 2.4, dir: { x: -d.x, z: -d.z }, dirBias: 0.6 });
      spray('chunk', t.x, 0.1, t.z, 3, { color: DIRT, speed: [0.5, 1.0], up: [0.8, 1.4], size: [0.04, 0.08], life: [0.4, 0.6], dir: { x: -d.x, z: -d.z }, dirBias: 0.6 });
      kit.mark({ x: t.x + d.x * Math.min(1.8, dist) * 0.5, z: t.z + d.z * Math.min(1.8, dist) * 0.5, radius: 0.8, kind: 'gouge', angle: Math.atan2(d.z, d.x), stretch: 2.2, stain: DIRT, glow: null, life: 2.4, opacity: 0.35, delay: 0.1 });
    }
  });

  // Mire Leech — "it gets on you". The leap is a wet black smear with an
  // Ember head; the latch is a slap of water and a bite flash on the host;
  // every drain pulls a thread of Ember motes off the host into the leech
  // while its indigo ring pulses; a hit or a dodge flings it off in a spray.
  bus.on('leech_leap', (ev) => {
    mark('leech_leap');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 3;
    SF.laneDrive(ev.x, ev.z, d, len, 11, { wake: LEECH, wakeW: 0.35, head: EMBER, peak: PARCH, stain: LEECH, glow: null, marks: 2, markKind: 'splash' });
    spray('shard', ev.x, 0.2, ev.z, 5, { color: WATER, tile: SHARD_TILE.drop, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.08, 0.12], life: [0.35, 0.6], gravity: 7, dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
  });
  bus.on('leech_latch', (ev) => {
    mark('leech_latch');
    SF.flare(ev.x, 0.6, ev.z, EMBER, 0.75, { kind: 'burst', life: 0.16 });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: TELL_INDIGO_GLOW, size: 0.5, life: 0.2 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 0.9, width: 0.1, life: 0.35, core: WATER, glow: LEECH, soft: 0.7, y: 0.04, opacity: 0.6 });
    spray('shard', ev.x, 0.6, ev.z, 8, { color: LEECH, tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [0.6, 1.6], size: [0.08, 0.13], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2] });
    kit.mark({ x: ev.x, z: ev.z, radius: 0.7, kind: 'splash', stain: LEECH, glow: null, life: 2.6, opacity: 0.4 });
  });
  bus.on('leech_drain', (ev) => {
    mark('leech_drain');
    const l = SF.byId(ev.id);
    const lx = l ? l.x : ev.x;
    const lz = l ? l.z : ev.z;
    for (let i = 0; i < N(4); i++) {
      const a = rnd(0, TAU);
      const sx = ev.x + Math.cos(a) * 0.22;
      const sz = ev.z + Math.sin(a) * 0.22;
      const fl = 0.28;
      kit.streak({ a: { x: sx, y: 0.5, z: sz }, b: { x: sx, y: 0.56, z: sz }, width: 0.04, tailW: 0, core: PARCH, glow: EMBER, life: fl, delay: i * 0.04, travel: { x: (lx - sx) / fl, y: 0.5, z: (lz - sz) / fl }, fall: 1.0, opacity: 0.85 });
    }
    kit.flash({ x: lx, y: 0.7, z: lz, color: TELL_INDIGO_GLOW, size: 0.42, life: 0.22, delay: 0.18 });
  });
  bus.on('leech_shed', (ev) => {
    mark('leech_shed');
    SF.shock(ev.x, ev.z, 0.8, LEECH, { life: 0.3, width: 0.1, core: WATER });
    SF.ripples(ev.x, ev.z, 1, 0.9, 0.05);
    spray('shard', ev.x, 0.3, ev.z, 7, { color: WATER, tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.08, 0.12], life: [0.4, 0.7], gravity: 7, drag: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: 0.8, kind: 'splash', stain: LEECH, glow: null, life: 2.8, opacity: 0.4 });
  });
  bus.on('leech_miss', (ev) => {
    mark('leech_miss');
    kit.ring({ x: ev.x, z: ev.z, r0: 0.15, r1: 0.7, width: 0.1, life: 0.3, core: WATER, glow: LEECH, soft: 0.7, y: 0.04, opacity: 0.5 });
    spray('shard', ev.x, 0.15, ev.z, 5, { color: LEECH, tile: SHARD_TILE.drop, speed: [0.5, 1.2], up: [0.6, 1.2], size: [0.07, 0.11], life: [0.35, 0.55], gravity: 7 });
  });

  // Drowned Miller — "the stone comes round". The sweep is a heavy grey arc
  // of the millstone's path all the way round him with an Ember edge out to
  // the ring (the hit), stone chips and a cloud of old flour knocked loose;
  // a groove is ground into the floor. The sack bursts where it lands in a
  // white-grey flour cloud over the Ember ring, leaving the paste.
  bus.on('miller_sweep', (ev) => {
    mark('miller_sweep');
    const r = ev.radius ?? 2.2;
    const m = SF.byId(ev.id);
    const start = m ? Math.atan2(m.faceZ ?? 1, m.faceX ?? 0) : rnd(0, TAU);
    kit.slash({ x: ev.x, z: ev.z, angle: start, radius: r * 0.82, width: 0.42, span: TAU * 0.95, sweep: 0.14, life: 0.4, core: BONE, glow: STONE, soft: 0.5, jag: 0.4, lift: 0.04, y: 0.5, gain: 0.8 });
    SF.shock(ev.x, ev.z, r * 1.02, EMBER, { life: 0.3, width: 0.12, jag: 0.5 });
    SF.flare(ev.x, 0.5, ev.z, EMBER, 0.9, { kind: 'burst', life: 0.18 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.05, kind: 'sigil', stain: INK, glow: EMBER, glowOpacity: 0.3, cool: 0.6, life: 2.6, opacity: 0.18 });
    kit.light({ x: ev.x, z: ev.z, radius: r, color: EMBER, opacity: 0.25, life: 0.3, attack: 0.02 });
    for (let i = 0; i < 5; i++) {
      const a = start + (i / 5) * TAU;
      const px = ev.x + Math.cos(a) * r * 0.85;
      const pz = ev.z + Math.sin(a) * r * 0.85;
      after(0.03 * i, () => spray('chunk', px, 0.3, pz, 2, { color: STONE, speed: [0.8, 1.6], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.6], dir: { x: -Math.sin(a), z: Math.cos(a) }, dirBias: 0.6 }));
    }
    spray('smoke', ev.x, 0.4, ev.z, 4, { color: FLOUR, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.36, 0.5], grow: 1.4, life: [0.7, 1.1], opacity: 0.26, gravity: -0.12, drag: 2.2, jitter: r * 0.4 });
  });
  function millerToss(ev) {
    mark('miller_toss');
    spray('smoke', ev.x, 1.6, ev.z, 2, { color: FLOUR, speed: [0.2, 0.5], up: [0.1, 0.4], size: [0.24, 0.34], grow: 1.3, life: [0.5, 0.8], opacity: 0.25, gravity: -0.1, drag: 2.4 });
    spray('spark', ev.x, 1.6, ev.z, 4, { color: FLOUR, speed: [0.2, 0.6], up: [0.2, 0.6], size: [0.03, 0.05], life: [0.5, 0.9], gravity: 0.3, drag: 1.6, opacity: 0.7 });
  }
  function sackLand(ev) {
    mark('miller_sack_land');
    const r = ev.radius ?? 1.1;
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: r, width: 0.12, life: 0.36, core: EMBER, glow: EMBER, soft: 0.6, y: 0.04, opacity: 0.6, gain: 0.7 });
    SF.flare(ev.x, 0.3, ev.z, EMBER, 0.85, { kind: 'burst', life: 0.18 });
    kit.flash({ x: ev.x, y: 0.4, z: ev.z, color: FLOUR, size: 0.9, life: 0.2 });
    SF.shock(ev.x, ev.z, r * 1.3, FLOUR, { life: 0.45, width: 0.22, core: PARCH, delay: 0.03 });
    spray('smoke', ev.x, 0.3, ev.z, 6, { color: FLOUR, speed: [0.8, 1.8], up: [0.3, 0.9], size: [0.4, 0.6], grow: 1.6, life: [0.9, 1.4], opacity: 0.32, gravity: -0.12, drag: 2.0, jitter: 0.2 });
    spray('chunk', ev.x, 0.3, ev.z, 5, { color: FLOUR, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.05, 0.1], life: [0.4, 0.7] });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.2, kind: 'splash', stain: FLOUR, glow: EMBER, cool: 0.4, life: 3.0, opacity: 0.4 });
  }

  Object.assign(CREATURE_DEATH, {
    owl: (es, matter, x, z) => {
      // A burst of down that floats slowly to the floor.
      mark('owl_death');
      spray('shard', x, OWL_Y, z, 12, { color: OWLF, tile: SHARD_TILE.feather, speed: [0.4, 1.4], up: [0.2, 0.9], size: [0.12, 0.18], life: [1.4, 2.2], gravity: 0.5, drag: 1.6, spin: [-4, 4], flutter: 0.8 });
      SF.flare(x, OWL_Y, z, OWLF, 0.8, { kind: 'burst', life: 0.2 });
    },
    lasher: (es, matter, x, z) => {
      // The pod splits and its indigo maw goes out.
      mark('lasher_death');
      SF.spikes(x, z, 0.7, 6, BRAMBLE, { h: 0.5, life: 0.4 });
      kit.flash({ x, y: 0.6, z, color: TELL_INDIGO_GLOW, size: 0.6, life: 0.2 });
      spray('chunk', x, 0.5, z, 5, { color: BRAMBLE, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.06, 0.12], life: [0.5, 0.8] });
    },
    leech: (es, matter, x, z) => {
      // It bursts like a full skin of black water.
      mark('leech_death');
      kit.ring({ x, z, r0: 0.2, r1: 1.0, width: 0.14, life: 0.4, core: WATER, glow: LEECH, soft: 0.7, y: 0.04, opacity: 0.6 });
      spray('shard', x, 0.3, z, 9, { color: LEECH, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.0, 2.0], size: [0.08, 0.14], life: [0.4, 0.7], gravity: 7, drag: 0.4 });
    },
    miller: (es, matter, x, z) => {
      // The stone drops and cracks; the sack splits; old flour hangs.
      mark('miller_death');
      after(0.12, () => {
        kit.crack({ x, z, radius: 0.7, glow: null, life: 1.2, cool: 0.3 });
        SF.shock(x, z, 1.1, STONE, { life: 0.35, width: 0.12, core: BONE });
        spray('chunk', x, 0.2, z, 6, { color: STONE, speed: [0.6, 1.6], up: [1.0, 2.0], size: [0.07, 0.13], life: [0.5, 0.8] });
      });
      spray('smoke', x, 0.8, z, 5, { color: FLOUR, speed: [0.4, 1.0], up: [0.2, 0.6], size: [0.42, 0.6], grow: 1.5, life: [1.0, 1.5], opacity: 0.3, gravity: -0.1, drag: 2.0, jitter: 0.3 });
    },
  });

  // ------------------------------------- new enemies, Barrow and Heart --
  // docs/NEW_ENEMIES_BARROW_HEART.md. The law holds: what hurts is Ember on
  // the frame it lands (the keen's cone, the snare's jaws, the bloom's ring,
  // the siphon's lash); the Barrow pair wear their one indigo tell, the
  // Heart pair the Heart's violet. No camera on rank-and-file.
  const KASH = vfxMatterColor('cinder');
  const SHROUD = '#9AA3B0';

  // Ash Keener — "the keen". The wail leaves its mouth as an indigo flare;
  // the cone it fills flashes Ember edge to edge (the hit) while three pale
  // sound-arcs roll out down it and grave ash is blown along the floor.
  bus.on('keener_wail', (ev) => {
    mark('keener_wail');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const ang = Math.atan2(d.z, d.x);
    const r = ev.radius ?? 4.2;
    const span = ((ev.halfAngleDeg ?? 28) * 2 * Math.PI) / 180;
    const mx = ev.x + d.x * 0.25;
    const mz = ev.z + d.z * 0.25;
    SF.flare(mx, 1.3, mz, TELL_INDIGO_GLOW, 1.1, { kind: 'burst', life: 0.24, angle: ang });
    kit.flash({ x: mx, y: 1.3, z: mz, color: TELL_INDIGO_GLOW, size: 0.7, life: 0.18 });
    // The Ember fill: the whole cone, hot for a blink (that is what hit you).
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r * 0.55, width: r * 0.9, span, sweep: 0.04, life: 0.26, core: EMBER, glow: EMBER, soft: 0.9, lift: 0, y: 0.08, opacity: 0.42, tail: 1, gain: 0.6 });
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: r, width: 0.12, span, sweep: 0.05, life: 0.3, core: PARCH, glow: EMBER, soft: 0.4, lift: 0, y: 0.1, gain: 0.9 });
    // The keen itself: pale arcs of sound rolling out down the cone.
    for (let i = 0; i < 3; i++) {
      const rr = r * (0.3 + 0.28 * i);
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: rr, width: 0.09, span: span * (0.85 + 0.1 * i), sweep: 0.06, life: 0.42, delay: i * 0.08, core: SHROUD, glow: TELL_INDIGO_GLOW, soft: 0.7, lift: 0.25, y: 0.9 - 0.15 * i, opacity: 0.75, gain: 0.5 });
    }
    // Grave ash blown down the cone, and a fan of it settling on the floor.
    spray('smoke', ev.x + d.x * 0.8, 0.5, ev.z + d.z * 0.8, 6, { color: KASH, speed: [1.6, 3.2], up: [-0.1, 0.3], size: [0.3, 0.46], grow: 1.6, life: [0.6, 0.9], opacity: 0.35, gravity: -0.1, drag: 2.2, dir: d, dirBias: 0.85, jitter: 0.3 });
    spray('spark', ev.x + d.x * 0.6, 0.9, ev.z + d.z * 0.6, 8, { color: SHROUD, speed: [1.4, 3.0], up: [0.0, 0.5], size: [0.03, 0.06], life: [0.4, 0.7], drag: 1.2, dir: d, dirBias: 0.8 });
    kit.mark({ x: ev.x + d.x * r * 0.5, z: ev.z + d.z * r * 0.5, radius: r * 0.55, kind: 'gouge', angle: ang, stretch: 1.6, stain: vfxMatterColor('ash'), glow: EMBER, glowOpacity: 0.25, cool: 0.4, life: 2.4, opacity: 0.3 });
  });

  // Barrow Sexton — "it digs your grave". The spade throws grave dirt while
  // it kneels (per frame); the snare goes in under a pat of earth with a
  // bone glint; sprung, bone teeth punch up round an Ember ring; the jaws
  // close in an Ember star with bone splinters; an old snare sifts to ash.
  bus.on('sexton_bury', (ev) => {
    mark('sexton_bury');
    const r = ev.radius ?? 0.55;
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: r * 1.6, width: 0.1, life: 0.35, core: EARTH, glow: EARTH, soft: 0.8, y: 0.03, opacity: 0.55, gain: 0.4 });
    spray('chunk', ev.x, 0.15, ev.z, 6, { color: EARTH, speed: [0.5, 1.2], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.6], jitter: 0.25 });
    spray('spark', ev.x, 0.1, ev.z, 4, { color: BONE, speed: [0.2, 0.6], up: [0.4, 0.8], size: [0.03, 0.05], life: [0.3, 0.5] });
    kit.flash({ x: ev.x, y: 0.15, z: ev.z, color: TELL_INDIGO_GLOW, size: 0.4, life: 0.2, delay: 0.1 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 2, kind: 'crater', stain: EARTH, glow: null, life: 3.0, opacity: 0.35 });
  });
  bus.on('sexton_snare_trip', (ev) => {
    mark('sexton_snare_trip');
    const r = ev.radius ?? 0.95;
    kit.flash({ x: ev.x, y: 0.2, z: ev.z, color: EMBER, size: 0.5, life: 0.14 });
    SF.spikes(ev.x, ev.z, r * 0.7, 6, EMBER, { h: 0.4, life: 0.4, core: BONE });
    spray('chunk', ev.x, 0.1, ev.z, 5, { color: vfxMatterColor('ash'), speed: [0.4, 1.0], up: [0.6, 1.2], size: [0.05, 0.09], life: [0.3, 0.5] });
    kit.ring({ x: ev.x, z: ev.z, r0: r * 1.6, r1: r, width: 0.06, life: 0.5, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.5, gain: 0.5 });
  });
  bus.on('sexton_snare_snap', (ev) => {
    mark('sexton_snare_snap');
    const r = ev.radius ?? 0.95;
    SF.flare(ev.x, 0.3, ev.z, EMBER, 1.1, { kind: 'star', life: 0.2 });
    kit.flash({ x: ev.x, y: 0.3, z: ev.z, color: PARCH, size: 0.6, life: 0.12 });
    SF.shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.26, width: 0.1, jag: 0.8 });
    // The jaws: bone teeth slashing in from the rim to the middle.
    const n = N(8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      kit.streak({ a: { x: ev.x + Math.cos(a) * r, y: 0.35, z: ev.z + Math.sin(a) * r }, b: { x: ev.x + Math.cos(a) * 0.15, y: 0.2, z: ev.z + Math.sin(a) * 0.15 }, width: 0.06, tailW: 0, core: BONE, glow: EMBER, life: 0.18, fall: 2.4 });
    }
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: EMBER, life: 1.2, cool: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.4, kind: 'crater', stain: vfxMatterColor('ash'), glow: EMBER, cool: 0.6, life: 3.0, opacity: 0.45 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.5, color: EMBER, opacity: 0.35, life: 0.3, attack: 0.02 });
    spray('shard', ev.x, 0.3, ev.z, 8, { color: BONE, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [1.0, 2.0], size: [0.07, 0.11], life: [0.4, 0.7], gravity: 5, spin: [-10, 10] });
    spray('smoke', ev.x, 0.2, ev.z, 2, { color: KASH, speed: [0.4, 0.9], up: [0.1, 0.4], size: [0.3, 0.42], grow: 1.4, life: [0.6, 0.9], opacity: 0.3, gravity: -0.1, drag: 2.4 });
  });
  bus.on('sexton_snare_crumble', (ev) => {
    mark('sexton_snare_crumble');
    spray('smoke', ev.x, 0.1, ev.z, 3, { color: KASH, speed: [0.2, 0.5], up: [0.2, 0.5], size: [0.26, 0.38], grow: 1.3, life: [0.6, 0.9], opacity: 0.3, gravity: -0.15, drag: 2.2 });
    spray('spark', ev.x, 0.1, ev.z, 5, { color: BONE, speed: [0.1, 0.4], up: [0.3, 0.7], size: [0.03, 0.05], life: [0.4, 0.7], drag: 1.4 });
  });
  bus.on('sexton_spoil', (ev) => {
    mark('sexton_spoil');
    spray('chunk', ev.x, 0.2, ev.z, 4, { color: EARTH, speed: [0.6, 1.2], up: [0.6, 1.2], size: [0.05, 0.09], life: [0.4, 0.6] });
  });

  // Heart Bloom — "it beats with the room". Roots driven in through cracked
  // floor; the opening draws the ring's whole reach in (a violet ring closing
  // on it, motes streaming to its core); the pulse is an Ember ring the size
  // of the warning, crystal punched up round its rim, a violet star at the
  // core.
  bus.on('bloom_root', (ev) => {
    mark('bloom_root');
    SF.spikes(ev.x, ev.z, 0.7, 6, HV, { h: 0.3, life: 0.35, core: HFLESH });
    kit.crack({ x: ev.x, z: ev.z, radius: 0.9, glow: HV, life: 2.2, cool: 1.2 });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.4, kind: 'crater', stain: HFLESH, glow: HV, glowOpacity: 0.4, cool: 1.5, life: 4.0, opacity: 0.4 });
    spray('chunk', ev.x, 0.15, ev.z, 5, { color: vfxMatterColor('stone'), speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.6] });
    kit.light({ x: ev.x, z: ev.z, radius: 1.2, color: HV, opacity: 0.3, life: 0.4 });
  });
  bus.on('bloom_open', (ev) => {
    mark('bloom_open');
    const r = ev.radius ?? 2.3;
    const life = ev.resolveTick != null && ev.tick != null ? Math.max(0.3, (ev.resolveTick - ev.tick) / 60) : 0.9;
    kit.ring({ x: ev.x, z: ev.z, r0: r, r1: 0.4, width: 0.06, life, core: HVP, glow: HV, soft: 0.6, y: 0.05, opacity: 0.5, gain: 0.5 });
    kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'sigil', stain: INK, glow: HV, glowOpacity: 0.3, cool: life, life: life + 0.2, opacity: 0.08 });
    const n = N(7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.3, 0.3);
      const rr = r * rnd(0.6, 0.95);
      const dl = rnd(0, life * 0.55);
      const fl = Math.min(0.4, life - dl);
      const px = ev.x + Math.cos(a) * rr;
      const pz = ev.z + Math.sin(a) * rr;
      kit.streak({ a: { x: px, y: 0.2, z: pz }, b: { x: px - Math.cos(a) * 0.35, y: 0.25, z: pz - Math.sin(a) * 0.35 }, width: 0.05, tailW: 0, core: HVP, glow: HV, life: fl, delay: dl, travel: { x: (-Math.cos(a) * rr) / fl, y: 0.45 / fl, z: (-Math.sin(a) * rr) / fl }, fall: 1.0, opacity: 0.85 });
    }
  });
  bus.on('bloom_pulse', (ev) => {
    mark('bloom_pulse');
    const r = ev.radius ?? 2.3;
    SF.flare(ev.x, 0.7, ev.z, HV, 1.4, { kind: 'burst', life: 0.26, core: HVP });
    kit.flash({ x: ev.x, y: 0.6, z: ev.z, color: PARCH, size: 0.7, life: 0.12 });
    SF.shock(ev.x, ev.z, r, EMBER, { life: 0.28, width: 0.12, jag: 0.5 });
    SF.shock(ev.x, ev.z, r * 1.2, CRYSTAL, { life: 0.45, width: 0.18, core: HVP, delay: 0.04, jag: 0.8 });
    SF.spikes(ev.x, ev.z, r * 0.95, 8, CRYSTAL, { h: 0.5, life: 0.45, core: HVP, delay: 0.03 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: HV, opacity: 0.38, life: 0.4, attack: 0.02 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.1, kind: 'scorch', stain: INK, glow: EMBER, glowOpacity: 0.35, cool: 0.6, life: 2.2, opacity: 0.25 });
    spray('shard', ev.x, 0.6, ev.z, 8, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.4, 3.0], up: [0.6, 1.4], size: [0.08, 0.13], life: [0.4, 0.7], gravity: 4, drag: 0.5, spin: [-10, 10] });
    spray('spark', ev.x, 0.6, ev.z, 6, { color: PARCH, speed: [1.6, 3.0], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.15, 0.3] });
  });

  // Vein Siphon — "it drinks". The lash is a violet tendril cracking down
  // its lane over an Ember edge (the hit); taking hold flares on the prey;
  // every drink pulls a bead of the prey's light up the tether into the sac
  // (an Ember nick on the prey, a violet swell on the sac); the snap
  // scatters the tether.
  bus.on('siphon_lash', (ev) => {
    mark('siphon_lash');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 5;
    const w = ev.width ?? 0.7;
    const prey = ev.target != null ? SF.byId(ev.target) : null;
    const reach = prey ? Math.max(0.6, Math.min(len, (prey.x - ev.x) * d.x + (prey.z - ev.z) * d.z)) : len;
    const ex = ev.x + d.x * reach;
    const ez = ev.z + d.z * reach;
    const SPEED = 28;
    const sweep = reach / SPEED;
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * len, y: 0.1, z: ev.z + d.z * len }, width: w, tailW: w * 0.85, core: EMBER, glow: EMBER, life: 0.2, fall: 2.4, opacity: 0.45 });
    kit.streak({ a: { x: ev.x, y: 1.0, z: ev.z }, b: { x: ex, y: 0.55, z: ez }, width: 0.12, tailW: 0.08, core: HVP, glow: HV, life: sweep + 0.25, fall: 1.4, opacity: 1 });
    kit.streak({ a: { x: ev.x, y: 1.0, z: ev.z }, b: { x: ev.x + d.x * 0.6, y: 0.95, z: ev.z + d.z * 0.6 }, width: 0.08, tailW: 0.3, core: PARCH, glow: HV, life: sweep, travel: { x: d.x * SPEED, y: -0.45 / Math.max(0.05, sweep), z: d.z * SPEED }, fall: 0.3 });
    SF.flare(ev.x, 1.0, ev.z, HV, 0.9, { life: 0.18, core: HVP, angle: Math.atan2(d.z, d.x) });
    after(sweep, () => {
      if (prey) return;
      // A miss: the tendril slaps the floor at the lane's end.
      kit.flash({ x: ex, y: 0.3, z: ez, color: HV, size: 0.4, life: 0.12 });
      spray('shard', ex, 0.3, ez, 4, { color: HFLESH, tile: SHARD_TILE.drop, speed: [0.4, 1.0], up: [0.6, 1.2], size: [0.07, 0.1], life: [0.3, 0.5], gravity: 6 });
      kit.mark({ x: ex, z: ez, radius: 0.6, kind: 'splash', stain: HFLESH, glow: HV, glowOpacity: 0.3, cool: 0.8, life: 2.2, opacity: 0.35 });
    });
  });
  bus.on('siphon_latch', (ev) => {
    mark('siphon_latch');
    const t = SF.byId(ev.target);
    const x = t?.x ?? ev.x;
    const z = t?.z ?? ev.z;
    SF.flare(x, 0.6, z, HV, 1.0, { kind: 'burst', life: 0.22, core: HVP });
    kit.ring({ x, z, r0: 0.9, r1: 0.35, width: 0.07, life: 0.3, core: HVP, glow: HV, soft: 0.5, y: 0.5 });
    spray('spark', x, 0.6, z, 6, { color: HV, speed: [0.4, 1.0], up: [0.2, 0.7], size: [0.03, 0.06], life: [0.3, 0.5], drag: 1.3 });
  });
  bus.on('siphon_drink', (ev) => {
    mark('siphon_drink');
    const sp = SF.byId(ev.id);
    kit.flash({ x: ev.x, y: 0.55, z: ev.z, color: EMBER, size: 0.32, life: 0.1 });
    spray('spark', ev.x, 0.55, ev.z, 3, { color: EMBER, speed: [0.3, 0.8], up: [0.2, 0.6], size: [0.03, 0.05], life: [0.2, 0.35] });
    if (!sp) return;
    kit.streak({ a: { x: ev.x, y: 0.55, z: ev.z }, b: { x: ev.x + (sp.x - ev.x) * 0.12, y: 0.6, z: ev.z + (sp.z - ev.z) * 0.12 }, width: 0.09, tailW: 0.05, core: HVP, glow: HV, life: 0.3, travel: { x: (sp.x - ev.x) / 0.3, y: 0.4 / 0.3, z: (sp.z - ev.z) / 0.3 }, fall: 0.8 });
    after(0.3, () => {
      const s2 = SF.byId(ev.id);
      if (!s2) return;
      kit.flash({ x: s2.x, y: 1.15, z: s2.z, color: HV, size: 0.6, life: 0.18 });
      kit.ring({ x: s2.x, z: s2.z, r0: 0.25, r1: 0.6, width: 0.05, life: 0.3, core: HVP, glow: HV, soft: 0.6, y: 1.15, opacity: 0.6 });
    });
  });
  bus.on('siphon_unlatch', (ev) => {
    mark('siphon_unlatch');
    const sp = SF.byId(ev.id);
    const t = SF.byId(ev.target);
    if (!sp && !t) return;
    const mx = ((sp?.x ?? t.x) + (t?.x ?? sp.x)) / 2;
    const mz = ((sp?.z ?? t.z) + (t?.z ?? sp.z)) / 2;
    const big = ev.cause === 'stretched' || ev.cause === 'stun';
    kit.flash({ x: mx, y: 0.8, z: mz, color: HV, size: big ? 0.55 : 0.35, life: 0.14 });
    spray('spark', mx, 0.8, mz, big ? 10 : 5, { color: HV, speed: [0.6, 1.6], up: [0.0, 0.6], size: [0.04, 0.07], life: [0.3, 0.6], drag: 1.4, jitter: 0.5 });
    spray('shard', mx, 0.8, mz, big ? 4 : 2, { color: HFLESH, tile: SHARD_TILE.drop, speed: [0.3, 0.8], up: [0.2, 0.6], size: [0.06, 0.09], life: [0.4, 0.6], gravity: 6 });
  });

  // Per frame: grave dirt off the Sexton's spade while it digs, ash rising
  // off a keening Keener (and off the heroes its grief still slows), a gulp
  // of violet motes round a drinking Siphon, and vein motes off a Bloom as
  // the room's heart swells.
  function barrowHeartFrame(e, rec) {
    if (e.kind === 'sexton') {
      if (e.mode !== 'dig' || rec.clock < 0.14) return;
      rec.clock = 0;
      spray('chunk', e.digX ?? e.x, 0.15, e.digZ ?? e.z, 2, { color: EARTH, speed: [0.5, 1.1], up: [1.0, 1.8], size: [0.05, 0.09], life: [0.35, 0.55], jitter: 0.2 });
      return;
    }
    if (e.kind === 'keener') {
      if (rec.clock < 0.16) return;
      rec.clock = 0;
      if (e.mode === 'keen') spray('smoke', e.x, 1.3, e.z, 1, { color: KASH, speed: [0.05, 0.25], up: [0.3, 0.6], size: [0.2, 0.3], grow: 1.5, life: [0.6, 0.9], opacity: 0.3, gravity: -0.2, drag: 2.0, jitter: 0.2 });
      for (const t of world.entities()) {
        if (t.partyIndex === undefined || !t.status || !t.status.slow || t.status.slow.src !== e.id || t.status.slow.untilTick <= world.tick) continue;
        spray('spark', t.x, 0.9, t.z, 1, { color: SHROUD, speed: [0.02, 0.1], up: [-0.3, -0.1], size: [0.04, 0.07], life: [0.5, 0.8], gravity: 0.6, drag: 1.6, jitter: 0.3, opacity: 0.8 });
      }
      return;
    }
    if (e.kind === 'siphon') {
      if (e.latchId == null || rec.clock < 0.1) return;
      rec.clock = 0;
      const a = rnd(0, TAU);
      spray('spark', e.x + Math.cos(a) * 0.35, 1.1, e.z + Math.sin(a) * 0.35, 1, { color: HV, speed: [0.05, 0.2], up: [-0.1, 0.2], size: [0.04, 0.07], life: [0.3, 0.5], gravity: -0.2, drag: 1.5, opacity: 0.9 });
      return;
    }
    if (e.kind === 'bloom') {
      if (e.mode !== 'rooted' || rec.clock < 0.3) return;
      rec.clock = 0;
      spray('spark', e.x, 0.6, e.z, 1, { color: rnd(0, 1) < 0.3 ? HVP : HV, speed: [0.05, 0.2], up: [0.3, 0.7], size: [0.04, 0.07], life: [0.6, 1.0], gravity: -0.2, drag: 1.4, jitter: 0.4, opacity: 0.85 });
    }
  }

  // Their deaths, on top of enemyDeath's shared break.
  Object.assign(CREATURE_DEATH, {
    keener: (es, matter, x, z) => {
      // The shroud empties: the mouth-light gutters, the cloth falls, ash sinks.
      mark('keener_death');
      SF.flare(x, 1.3, z, TELL_INDIGO_GLOW, 1.0, { kind: 'burst', life: 0.26 });
      kit.light({ x, z, radius: 1.3, color: TELL_INDIGO_GLOW, opacity: 0.4, life: 0.4 });
      spray('shard', x, 1.0, z, 6, { color: SHROUD, tile: SHARD_TILE.petal, speed: [0.3, 0.9], up: [0.2, 0.7], size: [0.1, 0.15], life: [0.9, 1.3], gravity: 0.7, drag: 1.8, spin: [-4, 4], flutter: 0.6, opacity: 0.8 });
      spray('smoke', x, 0.9, z, 4, { color: KASH, speed: [0.2, 0.6], up: [-0.4, -0.1], size: [0.34, 0.48], grow: 1.5, life: [1.0, 1.4], opacity: 0.35, gravity: 0.25, drag: 2.2, jitter: 0.3 });
      kit.mark({ x, z, radius: 1.0, kind: 'scorch', stain: vfxMatterColor('ash'), glow: null, life: 3.0, opacity: 0.35 });
    },
    sexton: (es, matter, x, z) => {
      // The lantern drops and breaks: an indigo pop, glass and iron, the
      // spade's clatter of dirt.
      mark('sexton_death');
      SF.flare(x, 0.6, z, TELL_INDIGO_GLOW, 1.0, { kind: 'burst', life: 0.24 });
      kit.light({ x, z, radius: 1.4, color: TELL_INDIGO_GLOW, opacity: 0.45, life: 0.45 });
      spray('chunk', x, 0.5, z, 5, { color: IRON, speed: [0.8, 1.6], up: [1.0, 1.8], size: [0.06, 0.11], life: [0.5, 0.8] });
      spray('chunk', x, 0.3, z, 5, { color: EARTH, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.7] });
      spray('spark', x, 0.5, z, 8, { color: TELL_INDIGO_GLOW, speed: [0.6, 1.6], up: [0.3, 1.0], size: [0.03, 0.06], life: [0.4, 0.8], drag: 1.3 });
    },
    bloom: (es, matter, x, z) => {
      // The petals shatter off the core; the roots go dark.
      mark('bloom_death');
      SF.flare(x, 0.6, z, HV, 1.2, { kind: 'burst', life: 0.26, core: HVP });
      SF.shock(x, z, 1.2, CRYSTAL, { life: 0.4, width: 0.14, core: HVP, jag: 0.8 });
      SF.spikes(x, z, 0.6, 5, CRYSTAL, { h: 0.45, life: 0.5, core: HVP });
      kit.light({ x, z, radius: 1.5, color: HV, opacity: 0.4, life: 0.45 });
      spray('shard', x, 0.7, z, 10, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.0, 2.2], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 5, spin: [-10, 10] });
    },
    siphon: (es, matter, x, z) => {
      // The sac bursts: what it drank rains down.
      mark('siphon_death');
      SF.flare(x, 1.15, z, HV, 1.1, { kind: 'burst', life: 0.24, core: HVP });
      kit.flash({ x, y: 1.15, z, color: HVP, size: 0.7, life: 0.16 });
      spray('shard', x, 1.15, z, 12, { color: HV, tile: SHARD_TILE.drop, speed: [0.8, 2.0], up: [0.4, 1.2], size: [0.08, 0.13], life: [0.6, 0.9], gravity: 6, drag: 0.4, spin: [-3, 3] });
      spray('chunk', x, 1.1, z, 3, { color: HFLESH, speed: [0.6, 1.4], up: [0.4, 1.0], size: [0.06, 0.1], life: [0.6, 0.9] });
      after(0.4, () => kit.mark({ x, z, radius: 1.1, kind: 'splash', stain: HFLESH, glow: HV, glowOpacity: 0.4, cool: 1.0, life: 3.0, opacity: 0.45 }));
    },
  });

  return { OWLF, LEECH, FLOUR, STONE, OWL_Y, millerToss, sackLand, KASH, SHROUD, barrowHeartFrame };
}
