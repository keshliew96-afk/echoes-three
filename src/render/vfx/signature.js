// VFX director (docs/gauntlet/design-VFX.md) — the one place that decides
// what a class, an enemy or the boss LOOKS like when it acts. It listens to
// the sim's events (casts, swings, dashes, hits, deaths, enemy attacks, boss
// beats), looks the actor's row up in data/vfx.js and plays that row's recipe
// on the pooled kit primitives (render/vfx/kit.js), the shared particle
// clouds (render/vfx/particles.js through the impact hub) and the camera FX
// (render/vfx/camerafx.js).
//
// What it replaced: the generic Parchment + Hearth Amber wedge / ring / spark
// every party member used to share (render/allies, skillfx/class), and the
// one-size debris on every hit and kill (scenes/graybox). What it leaves
// alone: heal grammar (Bright Heal + "+HP"), status glyphs, the mark reticle,
// revive rings and every enemy telegraph shape — gameplay truth stays put.
//
// Render-only: reads sim entities and events, never writes either; all
// randomness from the COSMETIC stream.
import { PALETTE } from '../../data/palette.js';
import {
  vfxClassStyle,
  vfxSkillClass,
  vfxEnemyStyle,
  vfxMatterColor,
  vfxBossStyle,
  isVfxBoss,
  VFX_INTENSITY,
} from '../../data/vfx.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../enemies/style.js';
import { impactFx } from './hub.js';
import { SHARD_TILE } from './particles.js';
import { createVfxKit } from './kit.js';
import { createCameraFx } from './camerafx.js';

const EMBER = PALETTE.emberDanger;
const PARCH = PALETTE.parchment;
const BONE = PALETTE.bone;
const HEAL = PALETTE.brightHeal;
const INK = PALETTE.voidCharcoal;
const TAU = Math.PI * 2;
const BOLT_Y = 0.55;
const ESHOT_Y = 0.5;

// Families whose bodies kick dust while they move fast (chargers, brutes) and
// the flyer's scale-dust wake. Speed in u/tick of sim travel.
const TRAIL_SPEED = 0.045;

// Enemy shots with their own trail (kind -> trail spec); the rest use the
// mantis's Ember sickle. The Barrow Crow's darts: thin, bone-cored, short.
const ENEMY_SHOT_TRAIL = Object.freeze({
  crow: Object.freeze({ y: ESHOT_Y, len: 0.55, width: 0.07, core: BONE, glow: EMBER, tailW: 0.05 }),
});

export function createSignatureFx({ stage, world, bus, cosmetic, settings = null }) {
  const kit = createVfxKit({ stage, cosmetic });
  const rnd = (a, b) => cosmetic.range(a, b);

  // ------------------------------------------------------------ settings --
  let intensity = VFX_INTENSITY.full;
  const readSettings = () => {
    const v = settings?.get?.('gameplay.effects');
    intensity = VFX_INTENSITY[v] ?? VFX_INTENSITY.full;
    kit.setIntensity(intensity);
  };
  readSettings();
  settings?.subscribe?.('gameplay.effects', readSettings);
  const shakeGain = () => {
    const s = settings?.get?.('gameplay.screenshake');
    return (typeof s === 'number' ? s : 1) * intensity.camera;
  };
  const camfx = createCameraFx({ camera: stage.camera, gain: shakeGain });
  const N = (k) => (k > 0 ? Math.max(1, Math.round(k * intensity.particles)) : 0);
  // Recipe counters for probes (__echoes.content.vfx().recipes): how many
  // times each creature-specific recipe has played this session.
  const fired = {};
  const mark = (name) => {
    fired[name] = (fired[name] ?? 0) + 1;
  };
  const spray = (mode, x, y, z, n, opts) => {
    const c = N(n);
    if (c > 0) impactFx.spray(mode, x, y, z, c, opts);
  };

  // ------------------------------------------------------------ entities --
  let cacheTick = -1;
  let rebuilds = 0;
  const byIdMap = new Map();
  function byId(id) {
    if (id == null) return null;
    const fresh = world.tick !== cacheTick;
    // Rebuilt once per tick, and again (a few times at most) when an id
    // spawned after this tick's build.
    if (fresh || (!byIdMap.has(id) && rebuilds < 4)) {
      rebuilds = fresh ? 0 : rebuilds + 1;
      cacheTick = world.tick;
      byIdMap.clear();
      for (const e of world.entities()) byIdMap.set(e.id, e);
    }
    return byIdMap.get(id) ?? null;
  }
  const player = () => world.player;
  // A party body's class: the player is the Healer seat unless it says
  // otherwise; allies carry classId.
  function classOf(e) {
    if (!e) return null;
    if (e.classId) return e.classId;
    if (e.kind === 'player') return 'healer';
    return null;
  }

  // ----------------------------------------------------------- recipes --
  // Every class recipe takes (style, ...) so a new class only needs a row.

  // A melee arc (basic swing or arc skill). angle = facing (rad), half =
  // half-angle (rad), big = a skill rather than a basic.
  const swingSide = new Map(); // id -> alternating slash direction
  function swing(st, id, x, z, angle, reach, half, { big = false, skill = null, combo = 0 } = {}) {
    const side = !swingSide.get(id);
    swingSide.set(id, side);
    const tipX = x + Math.cos(angle) * reach * 0.75;
    const tipZ = z + Math.sin(angle) * reach * 0.75;
    const sl = st.slash;
    if (st.shape === 'blunt') {
      // Tank: one thick rough crescent with a hard steel edge, earth thrown
      // off its leading edge, a crack where a skill lands.
      kit.slash({ x, z, angle, radius: reach * 0.95, width: sl.width * (big ? 1.2 : 0.85), span: half * 2, sweep: sl.sweep, life: sl.life, core: st.core, glow: st.glow, soft: sl.soft, jag: 0.22, lift: 0.06, y: 0.36, reverse: side, gain: 1.05 });
      kit.slash({ x, z, angle, radius: reach * 0.72, width: sl.width * 0.7, span: half * 1.7, sweep: sl.sweep * 1.3, life: sl.life * 0.9, core: st.second, glow: st.second, soft: 0.8, jag: 0.4, lift: 0.02, y: 0.18, reverse: side, gain: 0.6, opacity: 0.55 });
      spray('chunk', tipX, 0.3, tipZ, big ? st.debris.chunk : 3, { color: st.debrisColor, speed: [1.2, 2.8], up: [1.4, 3.0], size: [0.06, 0.14], life: [0.45, 0.8], dir: { x: Math.cos(angle), z: Math.sin(angle) }, dirBias: 0.6, jitter: reach * 0.25 });
      spray('smoke', tipX, 0.2, tipZ, big ? st.debris.dust : 1, { color: st.second, speed: [0.5, 1.2], up: [0.2, 0.5], size: [0.32, 0.5], grow: 1.3, life: [0.6, 0.95], opacity: 0.32, gravity: -0.2, drag: 2.6, jitter: reach * 0.3 });
      if (big) {
        kit.crack({ x: tipX, z: tipZ, radius: 0.55 + reach * 0.25, glow: st.glow, life: 1.3, cool: 0.35 });
        kit.light({ x: tipX, z: tipZ, radius: st.light.scale * reach, color: st.glow, opacity: st.light.opacity, life: st.light.life });
        camfx.kick(Math.cos(angle), Math.sin(angle), st.camera.kick, 0.13);
      } else camfx.kick(Math.cos(angle), Math.sin(angle), st.camera.kick * 0.35, 0.09);
    } else if (st.shape === 'sharp') {
      // Swordsman: thin crimson strokes with a silver edge; skills stack more
      // strokes (Flurry three, Crescent Finisher one per combo stack), a white
      // glint pops at the far tip.
      const strokes = skill === 'flurry' ? 3 : skill === 'crescent_finisher' ? 1 + Math.min(2, combo) : big ? sl.arcs : 1;
      for (let i = 0; i < strokes; i++) {
        const wide = skill === 'crescent_finisher';
        kit.slash({
          x,
          z,
          angle: angle + (i % 2 ? 0.12 : -0.08) * (strokes > 1 ? 1 : 0),
          radius: reach * (wide ? 0.85 + i * 0.22 : 0.9 - i * 0.12),
          width: sl.width * (wide ? 1.5 : 1),
          span: half * 2 * (wide ? 1.15 : 1),
          sweep: sl.sweep,
          life: sl.life,
          delay: i * 0.055,
          core: st.second,
          glow: st.glow,
          soft: sl.soft,
          lift: 0.18,
          y: 0.48 + i * 0.03,
          reverse: (i % 2 === 0) === side,
          gain: 1.1,
          tail: 0.7,
        });
      }
      const endA = angle + (side ? -half : half);
      kit.flash({ x: x + Math.cos(endA) * reach, y: 0.55, z: z + Math.sin(endA) * reach, color: st.second, size: big ? 0.42 : 0.26, life: 0.16, delay: st.slash.sweep * 0.9 });
      spray('spark', tipX, 0.5, tipZ, big ? st.debris.spark : 3, { color: st.second, speed: [1.6, 3.2], up: [0.4, 1.4], size: [0.04, 0.09], life: [0.16, 0.3], dir: { x: Math.cos(angle), z: Math.sin(angle) }, dirBias: 0.7 });
      if (big) {
        kit.light({ x: tipX, z: tipZ, radius: st.light.scale * reach, color: st.glow, opacity: st.light.opacity, life: st.light.life });
        camfx.kick(Math.cos(angle), Math.sin(angle), st.camera.kick, 0.08);
      }
    } else {
      // Healer / Archer / unknown: one soft sweep in the class glow.
      kit.slash({ x, z, angle, radius: reach * 0.9, width: sl.width, span: half * 2, sweep: sl.sweep, life: sl.life, core: st.core, glow: st.glow, soft: sl.soft, lift: 0.1, reverse: side });
      if (st.debris.shardKind) spray('shard', tipX, 0.5, tipZ, 3, { color: st.debrisColor, tile: SHARD_TILE[st.debris.shardKind] ?? 0, speed: [0.4, 1.0], up: [0.4, 1.0], size: [0.1, 0.16], life: [0.6, 1.0], gravity: 1.2, drag: 1.5, spin: [-4, 4], flutter: 0.4, opacity: 0.9 });
    }
  }

  // A burst around the caster (nova).
  function nova(st, x, z, radius, { skill = null } = {}) {
    if (st.shape === 'blunt') {
      // Tank: a jagged steel shockwave + an ochre ground wave behind it,
      // cracks, a ring of dust rolling out, rock thrown up.
      kit.ring({ x, z, r0: 0.3, r1: radius * 1.05, width: st.ring.width * 1.3, life: st.ring.life, core: st.core, glow: st.glow, soft: st.ring.soft, jag: st.ring.jag, y: 0.06, gain: 1.3, thin: 0.35 });
      kit.ring({ x, z, r0: 0.2, r1: radius * 0.8, width: st.ring.width * 1.6, life: st.ring.life * 1.3, core: st.second, glow: st.second, soft: 0.9, jag: 0.5, y: 0.03, delay: 0.05, opacity: 0.5, gain: 0.6 });
      kit.crack({ x, z, radius: radius * 0.85, glow: st.glow, life: 1.5, cool: 0.4 });
      for (let i = 0; i < N(8); i++) {
        const a = (i / 8) * TAU + rnd(-0.2, 0.2);
        spray('smoke', x + Math.cos(a) * 0.4, 0.15, z + Math.sin(a) * 0.4, 1, { color: st.second, speed: radius * 2.2, up: [0.1, 0.3], size: [0.3, 0.44], grow: 1.3, life: [0.5, 0.8], opacity: 0.2, gravity: -0.15, drag: 3.2, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 1 });
      }
      spray('chunk', x, 0.25, z, st.debris.chunk, { color: st.debrisColor, speed: [1.0, 2.6], up: [2.0, 3.6], size: [0.06, 0.15], life: [0.55, 0.9], jitter: radius * 0.5 });
      kit.light({ x, z, radius: radius * st.light.scale * 1.3, color: st.glow, opacity: st.light.opacity, life: st.light.life * 1.4 });
      if (skill === 'taunting_roar') kit.ring({ x, z, r0: 0.4, r1: radius * 1.2, width: 0.09, life: 0.5, core: PARCH, glow: PARCH, soft: 0.2, y: 0.9, delay: 0.04, opacity: 0.7 });
      camfx.dolly(x, z, st.camera.dolly, 0.2);
    } else if (st.shape === 'sharp') {
      // Swordsman: a spinning ring of slashes + one thin crimson ring.
      const n = 4;
      const a0 = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        kit.slash({ x, z, angle: a0 + (i / n) * TAU, radius: radius * 0.85, width: st.slash.width * 1.2, span: TAU / n + 0.5, sweep: 0.08, life: 0.3, delay: i * 0.035, core: st.second, glow: st.glow, soft: 0.15, lift: 0.14, y: 0.45, gain: 1.2 });
      }
      kit.ring({ x, z, r0: 0.3, r1: radius, width: st.ring.width, life: st.ring.life, core: st.second, glow: st.glow, soft: 0.2, y: 0.08 });
      spray('spark', x, 0.5, z, st.debris.spark + 4, { color: st.second, speed: [2, 3.6], up: [0.3, 1.0], size: [0.04, 0.09], life: [0.2, 0.34] });
      kit.light({ x, z, radius: radius * 1.1, color: st.glow, opacity: st.light.opacity, life: 0.25 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), st.camera.kick * 0.6, 0.1);
    } else if (st.shape === 'line') {
      // Archer: a star of short jade lines + a thin ring + feathers.
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rnd(-0.1, 0.1);
        const r0 = radius * 0.25;
        const r1 = radius * rnd(0.85, 1.05);
        kit.streak({ a: { x: x + Math.cos(a) * r0, y: 0.35, z: z + Math.sin(a) * r0 }, b: { x: x + Math.cos(a) * r1, y: 0.35, z: z + Math.sin(a) * r1 }, width: 0.07, tailW: 0.1, core: PARCH, glow: st.glow, life: 0.3, fall: 2 });
      }
      kit.ring({ x, z, r0: 0.2, r1: radius, width: st.ring.width, life: st.ring.life, core: PARCH, glow: st.glow, soft: 0.3, y: 0.06 });
      kit.flash({ x, y: 0.5, z, color: st.glow, size: 0.7, life: 0.22 });
      spray('shard', x, 0.6, z, st.debris.shard + 2, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.8, 1.6], up: [0.6, 1.4], size: [0.12, 0.18], life: [0.8, 1.2], gravity: 1.0, drag: 1.8, spin: [-3, 3], flutter: 0.5 });
      kit.light({ x, z, radius: radius * 1.1, color: st.glow, opacity: st.light.opacity, life: 0.3 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), st.camera.kick, 0.1);
    } else {
      // Healer: a soft bloom — petals opening outward, a breathing light.
      kit.ring({ x, z, r0: 0.25, r1: radius, width: st.ring.width, life: st.ring.life, core: st.core, glow: st.glow, soft: st.ring.soft, y: 0.05 });
      spray('shard', x, 0.35, z, st.debris.shard + 4, { color: st.second, tile: SHARD_TILE.petal, speed: [0.8, 1.7], up: [0.7, 1.3], size: [0.1, 0.16], life: [0.9, 1.3], gravity: 0.5, drag: 1.6, spin: [-3, 3], flutter: 0.35 });
      kit.light({ x, z, radius: radius * st.light.scale, color: st.glow, opacity: st.light.opacity, life: st.light.life });
      camfx.dolly(x, z, st.camera.dolly, 0.3);
    }
  }

  // A heal landing (Healer shapes that restore): petals in Bright Heal.
  function healBloom(x, z, radius = 0.6, big = false) {
    spray('shard', x, 0.3, z, big ? 9 : 3, { color: HEAL, tile: SHARD_TILE.petal, speed: [0.3, 0.9], up: [0.8, 1.4], size: [0.09, 0.14], life: [0.8, 1.2], gravity: 0.25, drag: 1.4, spin: [-3, 3], flutter: 0.4, jitter: radius * 0.4 });
    kit.light({ x, z, radius: radius * 1.5, color: HEAL, opacity: big ? 0.45 : 0.25, life: big ? 0.6 : 0.4, attack: 0.06 });
  }

  // Projectile release at the caster.
  function release(st, x, z, dx, dz, { count = 1 } = {}) {
    const mx = x + dx * 0.35;
    const mz = z + dz * 0.35;
    kit.flash({ x: mx, y: 0.6, z: mz, color: st.glow, size: count > 1 ? 0.5 : 0.36, life: 0.14 });
    if (st.shape === 'line') {
      // Wind lines blow back off the bow.
      for (let i = 0; i < 2; i++) {
        const side = i ? 1 : -1;
        const ox = -dz * 0.18 * side;
        const oz = dx * 0.18 * side;
        kit.streak({ a: { x: mx + ox - dx * 0.7, y: 0.55, z: mz + oz - dz * 0.7 }, b: { x: mx + ox, y: 0.58, z: mz + oz }, width: 0.05, tailW: 0, core: PARCH, glow: st.glow, life: 0.2, fall: 1, travel: { x: -dx * 1.5, y: 0, z: -dz * 1.5 } });
      }
    }
    kit.light({ x: mx, z: mz, radius: 0.6, color: st.glow, opacity: st.light.opacity * 0.8, life: 0.16 });
  }

  // A hit landing on a hostile, by the attacker's class.
  function classImpact(st, x, z, dx, dz, { crit = false, big = false } = {}) {
    const dir = Math.hypot(dx, dz) > 1e-4 ? { x: dx, z: dz } : null;
    const s = crit ? 1.4 : 1;
    if (st.shape === 'blunt') {
      spray('spark', x, 0.45, z, Math.round(st.debris.spark * s), { color: st.glow, speed: [1.4, 3.0], up: [0.8, 2.0], size: [0.05, 0.1], life: [0.18, 0.32], dir, dirBias: 0.6 });
      spray('chunk', x, 0.38, z, Math.round((big ? 5 : 3) * s), { color: st.debrisColor, speed: [1.0, 2.4], up: [1.2, 2.6], size: [0.06, 0.12], life: [0.4, 0.7], dir, dirBias: 0.5 });
      spray('smoke', x, 0.3, z, 1, { color: st.second, speed: [0.2, 0.5], up: [0.3, 0.6], size: [0.28, 0.4], grow: 1, life: [0.5, 0.8], opacity: 0.28, gravity: -0.25, drag: 2.4 });
      kit.flash({ x, y: 0.45, z, color: st.glow, size: 0.3 * s, life: 0.14, opacity: 0.6 });
    } else if (st.shape === 'sharp') {
      spray('spark', x, 0.5, z, Math.round(st.debris.spark * s), { color: st.second, speed: [1.8, 3.4], up: [0.3, 1.2], size: [0.04, 0.08], life: [0.15, 0.28], dir, dirBias: 0.75 });
      if (dir) {
        // A short cut line through the target, across the hit direction.
        const px = -dir.z;
        const pz = dir.x;
        const L = crit ? 0.42 : 0.3;
        kit.streak({ a: { x: x - px * L - dir.x * 0.1, y: 0.5, z: z - pz * L - dir.z * 0.1 }, b: { x: x + px * L + dir.x * 0.1, y: 0.56, z: z + pz * L + dir.z * 0.1 }, width: 0.06, tailW: 0.1, core: st.second, glow: st.glow, life: 0.16, fall: 0.6 });
      }
      kit.flash({ x, y: 0.5, z, color: st.glow, size: 0.3 * s, life: 0.12 });
    } else if (st.shape === 'line') {
      kit.flash({ x, y: BOLT_Y, z, color: st.glow, size: 0.4 * s, life: 0.18 });
      if (dir) kit.streak({ a: { x, y: BOLT_Y, z }, b: { x: x + dir.x * 0.6, y: BOLT_Y, z: z + dir.z * 0.6 }, width: 0.05, tailW: 0.3, core: PARCH, glow: st.glow, life: 0.15, fall: 0.5 });
      spray('shard', x, 0.55, z, st.debris.shard, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.5, 1.2], up: [0.6, 1.2], size: [0.1, 0.15], life: [0.7, 1.0], gravity: 1.1, drag: 1.6, spin: [-4, 4], flutter: 0.45, dir, dirBias: 0.4 });
      kit.light({ x, z, radius: 0.55, color: st.glow, opacity: st.light.opacity, life: st.light.life });
    } else {
      kit.flash({ x, y: 0.5, z, color: st.glow, size: 0.46 * s, life: 0.18 });
      spray('spark', x, 0.5, z, st.debris.spark, { color: st.glow, speed: [0.8, 1.8], up: [0.6, 1.4], size: [0.05, 0.1], life: [0.25, 0.45], dir, dirBias: 0.4 });
      spray('shard', x, 0.5, z, 2, { color: st.second, tile: SHARD_TILE.petal, speed: [0.4, 0.9], up: [0.6, 1.1], size: [0.08, 0.12], life: [0.6, 0.9], gravity: 0.4, drag: 1.5, spin: [-3, 3], flutter: 0.3 });
      kit.light({ x, z, radius: 0.7, color: st.glow, opacity: st.light.opacity * 0.7, life: 0.3 });
    }
  }

  // A hit landing on the party, by the enemy's style (Ember + its matter).
  function enemyImpact(es, x, z, dx, dz, { boss = false, bossKind = 'stag' } = {}) {
    const dir = Math.hypot(dx, dz) > 1e-4 ? { x: dx, z: dz } : null;
    const matter = vfxMatterColor(es.matter);
    spray('spark', x, 0.5, z, boss ? 7 : 4, { color: EMBER, speed: [1.2, 2.8], up: [0.8, 2.0], size: [0.05, 0.11], life: [0.2, 0.35], dir, dirBias: 0.5 });
    if (es.chunk) spray('chunk', x, 0.45, z, Math.min(5, Math.ceil(es.chunk / 2)) + (boss ? 3 : 0), { color: matter, speed: [1.0, 2.2], up: [1.0, 2.2], size: [0.05, 0.11], life: [0.35, 0.6], dir, dirBias: 0.5 });
    if (es.shard) spray('shard', x, 0.5, z, 3, { color: matter, tile: SHARD_TILE[es.shard] ?? 0, speed: [1.0, 2.0], up: [0.6, 1.4], size: [0.1, 0.15], life: [0.4, 0.7], gravity: 3, drag: 0.8, spin: [-6, 6], dir, dirBias: 0.5 });
    if (es.dust) spray('smoke', x, 0.4, z, 1, { color: matter, speed: [0.2, 0.5], up: [0.3, 0.6], size: [0.3, 0.42], grow: 1, life: [0.5, 0.8], opacity: 0.3, gravity: -0.25, drag: 2.4 });
    kit.flash({ x, y: 0.5, z, color: boss ? vfxBossStyle(bossKind).corruption : EMBER, size: boss ? 0.6 : 0.4, life: 0.14 });
  }
  // A kit boss's hits throw its own matter (the Stag keeps its legacy row).
  const BOSS_HIT = {
    heron: Object.freeze({ matter: 'water', family: 'brute', shard: 'drop', chunk: 0, dust: 2 }),
    wyrm: Object.freeze({ matter: 'cinder', family: 'brute', shard: null, chunk: 6, dust: 3 }),
  };

  // An enemy body breaking: what it was made of, scattered.
  function enemyDeath(kind, x, z, killerClass) {
    const es = vfxEnemyStyle(kind);
    const matter = vfxMatterColor(es.matter);
    impactFx.kill(x, z, { color: BONE, debris: matter });
    if (es.shard) spray('shard', x, 0.45, z, 6, { color: matter, tile: SHARD_TILE[es.shard] ?? 0, speed: [1.2, 2.6], up: [1.0, 2.2], size: [0.11, 0.17], life: [0.5, 0.9], gravity: 4, drag: 0.6, spin: [-8, 8] });
    if (es.dust) spray('smoke', x, 0.35, z, es.dust, { color: matter, speed: [0.4, 1.0], up: [0.2, 0.5], size: [0.34, 0.5], grow: 1.3, life: [0.7, 1.1], opacity: 0.3, gravity: -0.2, drag: 2.4 });
    if (es.matter === 'slime') kit.ring({ x, z, r0: 0.2, r1: 0.9, width: 0.12, life: 0.4, core: matter, glow: matter, soft: 0.8, y: 0.03, opacity: 0.6, gain: 0.5 });
    if (CREATURE_DEATH[kind]) CREATURE_DEATH[kind](es, matter, x, z);
    // The finishing class leaves its signature on the kill.
    if (killerClass) {
      const st = vfxClassStyle(killerClass);
      kit.light({ x, z, radius: 0.8, color: st.glow, opacity: st.light.opacity, life: 0.3 });
      if (st.shape === 'sharp') kit.flash({ x, y: 0.55, z, color: st.second, size: 0.55, life: 0.16 });
    }
  }

  // ----------------------------------------------------------- party wiring --
  bus.on('ally_basic', (ev) => {
    const st = vfxClassStyle(ev.classId);
    const a = byId(ev.id);
    const x = ev.x ?? a?.x;
    const z = ev.z ?? a?.z;
    if (x == null) return;
    if (ev.shape === 'melee_arc') swing(st, ev.id, x, z, Math.atan2(ev.dz, ev.dx), ev.reach ?? 0.9, ((ev.halfAngle ?? 50) * Math.PI) / 180);
    else release(st, x, z, ev.dx ?? 0, ev.dz ?? 1);
  });

  bus.on('ally_cast', (ev) => {
    const st = vfxClassStyle(ev.classId);
    const x = ev.x;
    const z = ev.z;
    const angle = Math.atan2(ev.dz ?? 0, ev.dx ?? 1);
    if (ev.shape === 'melee_arc') {
      swing(st, ev.id, x, z, angle, ev.reach ?? 1, ((ev.halfAngle ?? 50) * Math.PI) / 180, { big: true, skill: ev.skill, combo: ev.combo || 0 });
    } else if (ev.shape === 'nova') {
      nova(st, x, z, ev.radius ?? 1.2, { skill: ev.skill });
    } else if (ev.shape === 'projectile') {
      release(st, x, z, ev.dx ?? 0, ev.dz ?? 1, { count: ev.count ?? 1 });
    } else if (ev.shape === 'ground_aoe') {
      placeZone(st, ev.skill, ev.zx ?? x, ev.zz ?? z, ev.radius ?? 1, x, z);
    } else if (ev.shape === 'direct' && Array.isArray(ev.targets)) {
      // Shield Wall: a steel flare on each recipient (the plate glyph flight
      // is the class layer's).
      for (const id of ev.targets) {
        const t = byId(id);
        if (!t) continue;
        kit.flash({ x: t.x, y: 0.6, z: t.z, color: st.glow, size: 0.6, life: 0.3, delay: 0.24 });
        kit.ring({ x: t.x, z: t.z, r0: 0.6, r1: 0.35, width: 0.08, life: 0.3, core: st.core, glow: st.glow, soft: 0.3, y: 0.05, delay: 0.24 });
      }
      kit.flash({ x, y: 0.6, z, color: st.glow, size: 0.5, life: 0.2 });
    }
  });

  // Ground-placed class skills: the moment of placement.
  function placeZone(st, skill, x, z, radius, cx, cz) {
    if (skill === 'rain_of_arrows' || (st.shape === 'line' && skill !== 'detonating_charge')) {
      // Arrows rain down into the ring over half a second.
      kit.ring({ x, z, r0: radius * 0.4, r1: radius, width: 0.08, life: 0.5, core: PARCH, glow: st.glow, soft: 0.3, y: 0.05 });
      for (let i = 0; i < N(10); i++) {
        const a = rnd(0, TAU);
        const r = rnd(0, radius * 0.9);
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        kit.streak({ a: { x: px, y: 3.2, z: pz }, b: { x: px, y: 2.4, z: pz }, width: 0.05, tailW: 0.2, core: PARCH, glow: st.glow, life: 0.28, delay: i * 0.045, travel: { x: 0, y: -8.5, z: 0 }, fall: 1.2 });
      }
    } else if (st.shape === 'line') {
      // Detonating Charge: a planted point that pulses.
      kit.flash({ x, y: 0.3, z, color: st.glow, size: 0.6, life: 0.3 });
      kit.ring({ x, z, r0: 0.1, r1: radius, width: 0.06, life: 0.35, core: PARCH, glow: st.glow, soft: 0.3, y: 0.05 });
      kit.streak({ a: { x: cx, y: 0.6, z: cz }, b: { x, y: 0.35, z }, width: 0.04, tailW: 0.1, core: PARCH, glow: st.glow, life: 0.2, fall: 1.5 });
    } else if (st.shape === 'blunt') {
      // Ground Crack: the ground splits where the Tank points.
      kit.crack({ x, z, radius: radius * 1.35, glow: st.glow, life: 2.2, cool: 0.6 });
      kit.ring({ x, z, r0: 0.2, r1: radius * 1.1, width: st.ring.width, life: 0.45, core: st.core, glow: st.glow, soft: st.ring.soft, jag: st.ring.jag, y: 0.05 });
      spray('chunk', x, 0.2, z, st.debris.chunk + 3, { color: st.debrisColor, speed: [0.6, 1.8], up: [2.2, 3.8], size: [0.07, 0.16], life: [0.6, 1.0], jitter: radius * 0.6 });
      spray('smoke', x, 0.15, z, st.debris.dust + 2, { color: st.second, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.38, 0.55], grow: 1.3, life: [0.7, 1.1], opacity: 0.32, gravity: -0.2, drag: 2.6, jitter: radius * 0.4 });
      kit.light({ x, z, radius: radius * 1.4, color: st.glow, opacity: st.light.opacity, life: 0.4 });
      camfx.dolly(x, z, st.camera.dolly, 0.22);
    } else if (st.shape === 'sharp') {
      // Caltrops: a scatter of silver blades flicked into the ring.
      kit.ring({ x, z, r0: radius * 0.3, r1: radius, width: st.ring.width, life: 0.35, core: st.second, glow: st.glow, soft: 0.2, y: 0.05 });
      spray('shard', x, 0.5, z, 10, { color: st.second, tile: SHARD_TILE.needle, speed: [0.6, 1.4], up: [1.0, 1.8], size: [0.12, 0.16], life: [0.6, 0.9], gravity: 5, drag: 0.8, spin: [-10, 10], jitter: radius * 0.3, floor: 0.04 });
      kit.streak({ a: { x: cx, y: 0.6, z: cz }, b: { x, y: 0.4, z }, width: 0.05, tailW: 0.1, core: st.second, glow: st.glow, life: 0.2, fall: 1.5 });
    } else {
      kit.ring({ x, z, r0: 0.2, r1: radius, width: st.ring.width, life: 0.5, core: st.core, glow: st.glow, soft: 0.9, y: 0.05 });
      kit.light({ x, z, radius: radius * 1.3, color: st.glow, opacity: st.light.opacity * 0.6, life: 0.5 });
    }
  }

  // Ally zone ticks: each class pulses its zone its own way.
  bus.on('azone_tick', (ev) => {
    const zEnt = byId(ev.id);
    if (!zEnt) return;
    const st = vfxClassStyle(zEnt.classId ?? vfxSkillClass(ev.skill));
    const { x, z } = zEnt;
    const r = zEnt.radius ?? 0.9;
    if (st.shape === 'blunt') {
      kit.crack({ x: x + rnd(-r, r) * 0.4, z: z + rnd(-r, r) * 0.4, radius: r * 0.7, glow: st.glow, life: 0.9, cool: 0.25, opacity: 0.6 });
      spray('smoke', x, 0.15, z, 2, { color: st.second, speed: [0.3, 0.8], up: [0.2, 0.5], size: [0.3, 0.42], grow: 1.1, life: [0.5, 0.8], opacity: 0.25, gravity: -0.2, drag: 2.4, jitter: r * 0.5 });
      spray('chunk', x, 0.15, z, 3, { color: st.debrisColor, speed: [0.3, 0.9], up: [1.4, 2.4], size: [0.05, 0.1], life: [0.4, 0.7], jitter: r * 0.6 });
    } else if (st.shape === 'sharp') {
      for (let i = 0; i < 2; i++) {
        const a = rnd(0, TAU);
        const rr = rnd(0, r * 0.8);
        kit.flash({ x: x + Math.cos(a) * rr, y: 0.12, z: z + Math.sin(a) * rr, color: st.second, size: 0.28, life: 0.14, delay: i * 0.05 });
      }
      spray('spark', x, 0.1, z, 3, { color: st.glow, speed: [0.3, 0.8], up: [0.6, 1.2], size: [0.04, 0.08], life: [0.2, 0.35], jitter: r * 0.6 });
    } else if (st.shape === 'line') {
      if (ev.skill === 'rain_of_arrows') {
        for (let i = 0; i < N(3); i++) {
          const a = rnd(0, TAU);
          const rr = rnd(0, r * 0.9);
          const px = x + Math.cos(a) * rr;
          const pz = z + Math.sin(a) * rr;
          kit.streak({ a: { x: px, y: 3.0, z: pz }, b: { x: px, y: 2.3, z: pz }, width: 0.05, tailW: 0.2, core: PARCH, glow: st.glow, life: 0.26, delay: i * 0.06, travel: { x: 0, y: -8.5, z: 0 }, fall: 1.2 });
        }
      } else {
        // Detonating Charge: a star of short lines bursts off the point.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + rnd(-0.2, 0.2);
          kit.streak({ a: { x, y: 0.3, z }, b: { x: x + Math.cos(a) * r, y: 0.3, z: z + Math.sin(a) * r }, width: 0.06, tailW: 0.1, core: PARCH, glow: st.glow, life: 0.22, fall: 2 });
        }
        kit.flash({ x, y: 0.35, z, color: st.glow, size: 0.6, life: 0.18 });
        kit.light({ x, z, radius: r * 1.2, color: st.glow, opacity: st.light.opacity, life: 0.25 });
      }
    }
  });

  bus.on('ally_dash', (ev) => {
    const a = byId(ev.id);
    const st = vfxClassStyle(classOf(a) ?? vfxSkillClass(ev.skill));
    const { x0, z0, x1, z1 } = ev;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz) || 1;
    if (st.shape === 'blunt') {
      // Shoulder Charge: a wide steel wake and dust boiling off the path.
      kit.streak({ a: { x: x0, y: 0.3, z: z0 }, b: { x: x1, y: 0.35, z: z1 }, width: 0.34, tailW: 0.3, core: st.core, glow: st.glow, life: 0.3, fall: 1.2, opacity: 0.7 });
      for (let i = 0; i < N(5); i++) {
        const k = i / 5;
        spray('smoke', x0 + dx * k, 0.12, z0 + dz * k, 1, { color: st.second, speed: [0.2, 0.6], up: [0.2, 0.5], size: [0.3, 0.45], grow: 1.2, life: [0.5, 0.85], opacity: 0.3, gravity: -0.2, drag: 2.4 });
      }
      spray('chunk', x1, 0.2, z1, 4, { color: st.debrisColor, speed: [1.0, 2.2], up: [1.5, 2.6], size: [0.06, 0.12], life: [0.4, 0.7], dir: { x: dx / L, z: dz / L }, dirBias: 0.6 });
      camfx.kick(dx / L, dz / L, st.camera.kick, 0.14);
    } else if (st.shape === 'sharp') {
      // Fox Step / Lunge: one silver line and a crimson afterimage beside it.
      kit.streak({ a: { x: x0, y: 0.5, z: z0 }, b: { x: x1, y: 0.5, z: z1 }, width: 0.08, tailW: 0.05, core: st.second, glow: st.glow, life: 0.24, fall: 0.8 });
      kit.streak({ a: { x: x0, y: 0.32, z: z0 }, b: { x: x1, y: 0.32, z: z1 }, width: 0.24, tailW: 0.2, core: st.glow, glow: st.glow, life: 0.3, fall: 1.4, opacity: 0.5 });
      kit.flash({ x: x0, y: 0.5, z: z0, color: st.second, size: 0.4, life: 0.14 });
      kit.flash({ x: x1, y: 0.5, z: z1, color: st.second, size: 0.32, life: 0.14, delay: 0.08 });
      spray('spark', x1, 0.45, z1, 4, { color: st.second, speed: [1.2, 2.4], up: [0.3, 1.0], size: [0.04, 0.08], life: [0.15, 0.28], dir: { x: dx / L, z: dz / L }, dirBias: 0.7 });
    } else if (st.shape === 'line') {
      // Vault: wind lines streaming off the take-off point, feathers left behind.
      for (let i = 0; i < 3; i++) {
        const o = (i - 1) * 0.16;
        kit.streak({ a: { x: x0 - dz / L * o, y: 0.25 + i * 0.1, z: z0 + dx / L * o }, b: { x: x1 - dz / L * o, y: 0.35 + i * 0.1, z: z1 + dx / L * o }, width: 0.045, tailW: 0, core: PARCH, glow: st.glow, life: 0.26, delay: i * 0.03, fall: 1.4 });
      }
      spray('shard', x0, 0.5, z0, 4, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.3, 0.8], up: [0.6, 1.2], size: [0.11, 0.16], life: [0.8, 1.2], gravity: 0.9, drag: 1.8, spin: [-3, 3], flutter: 0.5 });
    } else {
      kit.streak({ a: { x: x0, y: 0.35, z: z0 }, b: { x: x1, y: 0.35, z: z1 }, width: 0.2, tailW: 0.3, core: st.core, glow: st.glow, life: 0.3, fall: 1.2, opacity: 0.6 });
    }
  });

  bus.on('parry_counter', (ev) => {
    const a = byId(ev.id);
    const st = vfxClassStyle(classOf(a) ?? 'swordsman');
    const t = byId(ev.attackerId);
    const x = t ? t.x : ev.x + (ev.dx ?? 0) * 0.6;
    const z = t ? t.z : ev.z + (ev.dz ?? 0) * 0.6;
    // An X cut across the attacker.
    for (const s of [-1, 1]) {
      const a0 = Math.PI / 4 * s + Math.atan2(ev.dz ?? 0, ev.dx ?? 1);
      kit.streak({ a: { x: x - Math.cos(a0) * 0.45, y: 0.4, z: z - Math.sin(a0) * 0.45 }, b: { x: x + Math.cos(a0) * 0.45, y: 0.65, z: z + Math.sin(a0) * 0.45 }, width: 0.09, tailW: 0.1, core: st.second, glow: st.glow, life: 0.24, delay: s > 0 ? 0.05 : 0, fall: 0.7 });
    }
    kit.flash({ x, y: 0.55, z, color: st.second, size: 0.6, life: 0.18 });
    kit.light({ x, z, radius: 0.8, color: st.glow, opacity: 0.4, life: 0.22 });
    camfx.kick(ev.dx ?? 0, ev.dz ?? 0, st.camera.kick, 0.09);
  });

  bus.on('scatter_burst', (ev) => {
    const st = vfxClassStyle(vfxSkillClass(ev.skill) ?? 'archer');
    for (let i = 0; i < 5; i++) {
      const a = rnd(0, TAU);
      kit.streak({ a: { x: ev.x, y: BOLT_Y, z: ev.z }, b: { x: ev.x + Math.cos(a) * 0.6, y: BOLT_Y, z: ev.z + Math.sin(a) * 0.6 }, width: 0.04, tailW: 0.1, core: PARCH, glow: st.glow, life: 0.18, fall: 1.5 });
    }
    kit.flash({ x: ev.x, y: BOLT_Y, z: ev.z, color: st.glow, size: 0.45, life: 0.16 });
  });

  bus.on('aura_pulse', (ev) => {
    if (ev.seat === undefined) return; // the Healer's auras: skillfx / content
    const body = byId(ev.id) ?? null;
    const st = vfxClassStyle(classOf(body) ?? vfxSkillClass(ev.skill));
    const x = ev.x ?? body?.x;
    const z = ev.z ?? body?.z;
    if (ev.skill === 'iron_stance' && x != null) {
      kit.ring({ x, z, r0: 1.3, r1: 1.0, width: 0.1, life: 0.35, core: st.core, glow: st.glow, soft: 0.3, y: 0.05, opacity: 0.7 });
    } else if (ev.skill === 'razor_wake') {
      for (const id of ev.hit || []) {
        const e = byId(id);
        if (e) kit.slash({ x: e.x, z: e.z, angle: rnd(0, TAU), radius: 0.35, width: 0.08, span: 1.6, sweep: 0.05, life: 0.18, core: st.second, glow: st.glow, soft: 0.1, lift: 0.1, y: 0.5, gain: 1.2 });
      }
    } else if (ev.skill === 'kestrel_watch' && x != null) {
      for (const id of ev.hit || []) {
        const e = byId(id);
        if (!e) continue;
        kit.streak({ a: { x, y: 1.4, z }, b: { x: e.x, y: 0.5, z: e.z }, width: 0.05, tailW: 0.05, core: PARCH, glow: st.glow, life: 0.22, fall: 1.2 });
        spray('shard', e.x, 0.6, e.z, 1, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.3, 0.6], up: [0.4, 0.8], size: [0.1, 0.14], life: [0.7, 1.0], gravity: 0.9, drag: 1.8, spin: [-3, 3], flutter: 0.5 });
      }
    }
  });

  // The Healer (seat 0) casts through skill_cast; its own heal grammar stays
  // in skillfx / content — this adds the lantern light and the petals.
  bus.on('skill_cast', (ev) => {
    const p = player();
    if (!p) return;
    const st = vfxClassStyle(classOf(p));
    const heal = HEAL_SKILLS.has(ev.skill);
    if (ev.shape === 'projectile') {
      const d = p.lastAimDir ?? { x: 1, z: 0 };
      release(st, p.x, p.z, d.x ?? 1, d.z ?? 0, { count: ev.count ?? 1 });
    } else if (ev.shape === 'nova') {
      const r = SKILL_AREA.get(ev.skill) ?? 1.4;
      if (heal) {
        healBloom(p.x, p.z, r, true);
        camfx.dolly(p.x, p.z, st.camera.dolly, 0.3);
      } else nova(st, p.x, p.z, r, { skill: ev.skill });
    } else if (ev.shape === 'melee_arc' && heal) {
      const d = p.lastAimDir ?? { x: 1, z: 0 };
      healBloom(p.x + (d.x ?? 0) * 0.8, p.z + (d.z ?? 0) * 0.8, 0.9, true);
    } else if (ev.shape === 'direct' && Array.isArray(ev.targets)) {
      for (const id of ev.targets) {
        const t = byId(id);
        if (t) healBloom(t.x, t.z, 0.5, false);
      }
    } else if (ev.shape === 'ground_aoe' && ev.x != null) {
      kit.light({ x: ev.x, z: ev.z, radius: 1.6, color: heal ? HEAL : st.glow, opacity: 0.35, life: 0.6, attack: 0.08 });
    }
  });

  // ------------------------------------------------------------ hits --
  const lastClassHit = new Map(); // victim id -> class id of the last party hit
  bus.on('hit', (ev) => {
    const atk = byId(ev.attacker);
    const victimParty = ev.kind === 'player' || ev.kind === 'ally' || atk?.faction === 'hostile';
    if (victimParty) {
      if (!atk) {
        enemyImpact(vfxEnemyStyle(null), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0);
        return;
      }
      if (atk.kind === 'stag') enemyImpact(vfxEnemyStyle('stag', 'brute'), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { boss: true });
      else if (BOSS_HIT[atk.kind]) enemyImpact(BOSS_HIT[atk.kind], ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { boss: true, bossKind: atk.kind });
      else enemyImpact(vfxEnemyStyle(atk.kind), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0);
      return;
    }
    const cls = classOf(atk) ?? vfxSkillClass(ev.source) ?? 'healer';
    lastClassHit.set(ev.target, cls);
    classImpact(vfxClassStyle(cls), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit, big: ev.delivery !== 'basic' });
  });
  bus.on('death', (ev) => {
    if (ev.kind === 'player' || ev.kind === 'ally') return;
    const killer = lastClassHit.get(ev.id) ?? null;
    lastClassHit.delete(ev.id);
    if (ev.kind === 'stag') bossDeath(ev.x, ev.z);
    else if (isVfxBoss(ev.kind)) KIT_BOSS_DEATH[ev.kind](ev.x, ev.z);
    else enemyDeath(ev.kind, ev.x, ev.z, killer);
  });

  // ------------------------------------------------------------ enemies --
  // Glob / shot id -> the kind that threw it: a Rotcap's spore glob outlives
  // its body, and a Barrow Crow's feather darts trail differently.
  const globKind = new Map();
  const shotKind = new Map();
  bus.on('enemy_fire', (ev) => {
    const owner = byId(ev.id);
    if (owner && ev.shot != null && ENEMY_SHOT_TRAIL[owner.kind]) shotKind.set(ev.shot, owner.kind);
    // The crow's caw flash is its own recipe (crow_volley).
    if (owner?.kind !== 'crow') kit.flash({ x: ev.x, y: ESHOT_Y, z: ev.z, color: EMBER, size: 0.34, life: 0.12 });
  });
  bus.on('enemy_lob', (ev) => {
    const owner = byId(ev.id);
    const kind = byId(ev.glob)?.ownerKind ?? owner?.kind ?? 'toad';
    if (ev.glob != null) globKind.set(ev.glob, kind);
    if (kind === 'rotcap') return; // the spore burst is its own recipe (rotcap_burst)
    const es = vfxEnemyStyle(owner?.kind ?? 'toad', 'lobber');
    spray('shard', ev.x, 0.55, ev.z, 3, { color: vfxMatterColor(es.matter), tile: SHARD_TILE.drop, speed: [0.4, 1.0], up: [1.2, 2.0], size: [0.1, 0.14], life: [0.4, 0.6], gravity: 6, spin: [-2, 2] });
  });
  bus.on('enemy_glob_land', (ev) => {
    const kind = globKind.get(ev.id);
    globKind.delete(ev.id);
    if (kind === 'rotcap') {
      sporeCloud(ev.x, ev.z, ev.radius ?? 1.2);
      return;
    }
    const owner = byId(ev.owner);
    const es = vfxEnemyStyle(owner?.kind ?? 'toad', 'lobber');
    const matter = vfxMatterColor(es.matter);
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.14, life: 0.4, core: EMBER, glow: EMBER, soft: 0.6, y: 0.04, opacity: 0.55, gain: 0.7 });
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
    if (ev.cause === 'wall') spray('chunk', ev.x, 0.3, ev.z, 4, { color: matter, speed: [1.0, 2.0], up: [1.2, 2.2], size: [0.06, 0.12], life: [0.4, 0.7] });
  });
  bus.on('enemy_slam', (ev) => {
    const owner = byId(ev.id);
    const es = vfxEnemyStyle(ev.etype ?? owner?.kind, 'brute');
    const matter = vfxMatterColor(es.matter);
    const ang = owner ? Math.atan2(ev.z - owner.z, ev.x - owner.x) : 0;
    const ox = owner ? owner.x : ev.x;
    const oz = owner ? owner.z : ev.z;
    kit.slash({ x: ox, z: oz, angle: ang, radius: Math.max(0.8, Math.hypot(ev.x - ox, ev.z - oz) + 0.3), width: 0.36, span: 1.3, sweep: 0.08, life: 0.35, core: PARCH, glow: EMBER, soft: 0.4, jag: 0.5, lift: 0.04, y: 0.2, gain: 0.9 });
    kit.crack({ x: ev.x, z: ev.z, radius: 0.8, glow: EMBER, life: 1.0, cool: 0.3 });
    spray('chunk', ev.x, 0.3, ev.z, es.chunk || 5, { color: matter, speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.14], life: [0.5, 0.8] });
    spray('spark', ev.x, 0.4, ev.z, 5, { color: PARCH, speed: [1.6, 3.0], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.28] });
  });
  bus.on('enemy_swoop', (ev) => {
    const es = vfxEnemyStyle(ev.etype, 'flyer');
    spray('smoke', ev.x, 0.9, ev.z, 2, { color: vfxMatterColor(es.matter), speed: [0.2, 0.5], up: [-0.4, -0.1], size: [0.28, 0.4], grow: 1, life: [0.6, 0.9], opacity: 0.3, gravity: 0.3, drag: 2 });
  });
  bus.on('enemy_swoop_end', (ev) => {
    const es = vfxEnemyStyle(ev.etype, 'flyer');
    const matter = vfxMatterColor(es.matter);
    spray('smoke', ev.x, 0.4, ev.z, es.dust || 3, { color: matter, speed: [0.4, 1.0], up: [0.1, 0.4], size: [0.32, 0.46], grow: 1.3, life: [0.8, 1.2], opacity: 0.3, gravity: 0.15, drag: 2.2 });
    spray('spark', ev.x, 0.5, ev.z, 5, { color: matter, speed: [0.3, 0.8], up: [-0.2, 0.3], size: [0.04, 0.07], life: [0.7, 1.1], gravity: 0.3, drag: 1.5, opacity: 0.6 });
  });
  bus.on('enemy_emerge', (ev) => {
    const es = vfxEnemyStyle(ev.etype, 'burrower');
    const matter = vfxMatterColor(es.matter);
    kit.crack({ x: ev.x, z: ev.z, radius: 1.0, glow: EMBER, life: 1.2, cool: 0.3 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.2, life: 0.4, core: matter, glow: EMBER, soft: 0.5, jag: 0.8, y: 0.04, opacity: 0.7, gain: 0.6 });
    spray('chunk', ev.x, 0.15, ev.z, es.chunk || 6, { color: matter, speed: [0.6, 1.6], up: [2.4, 4.0], size: [0.07, 0.16], life: [0.6, 1.0], jitter: 0.25 });
    spray('smoke', ev.x, 0.2, ev.z, es.dust || 3, { color: matter, speed: [0.5, 1.2], up: [0.4, 0.9], size: [0.36, 0.52], grow: 1.3, life: [0.7, 1.1], opacity: 0.34, gravity: -0.15, drag: 2.4 });
  });
  bus.on('enemy_burrow', (ev) => {
    const es = vfxEnemyStyle(ev.etype, 'burrower');
    const matter = vfxMatterColor(es.matter);
    spray('smoke', ev.x, 0.15, ev.z, 3, { color: matter, speed: [0.4, 0.9], up: [0.2, 0.5], size: [0.3, 0.45], grow: 1.2, life: [0.6, 0.9], opacity: 0.32, gravity: -0.15, drag: 2.4 });
    spray('chunk', ev.x, 0.15, ev.z, 4, { color: matter, speed: [0.5, 1.2], up: [1.2, 2.0], size: [0.06, 0.12], life: [0.4, 0.7] });
  });
  bus.on('telegraph_start', (ev) => {
    // The wind-up gathers: a few Ember motes drawn in to the body. (The
    // telegraph SHAPE itself is the enemy layer's and unchanged.)
    const e = byId(ev.id);
    if (!e) return;
    spray('spark', e.x, 0.25, e.z, 3, { color: EMBER, speed: [0.05, 0.2], up: [0.6, 1.1], size: [0.05, 0.1], life: [0.35, 0.55], gravity: -0.4, drag: 1.4, jitter: 0.35, opacity: 0.8 });
  });

  // -------------------------------------------------------------- boss --
  bus.on('boss_quake_start', (ev) => {
    const b = byId(ev.id);
    const bs = vfxBossStyle(b?.kind ?? 'stag');
    if (!b) return;
    kit.pillar({ x: b.x, z: b.z, radius: 0.5, height: 2.6, color: bs.corruption, life: 0.6, opacity: 0.4 });
    kit.flash({ x: b.x, y: 2.2, z: b.z, color: bs.peak, size: 1.0, life: 0.3 });
  });
  bus.on('boss_quake_resolve', (ev) => {
    const b = byId(ev.id);
    const bs = vfxBossStyle(b?.kind ?? 'stag');
    const q = bs.quake;
    const r = ev.radius ?? 1.6;
    const matter = vfxMatterColor(bs.matter);
    kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: r * 1.15, width: 0.36, life: 0.6, core: bs.peak, glow: bs.corruption, soft: 0.4, jag: 0.9, y: 0.05 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: r * 0.85, width: 0.2, life: 0.45, core: PARCH, glow: bs.threat, soft: 0.3, y: 0.08, delay: 0.04 });
    kit.ring({ x: ev.x, z: ev.z, r0: r * 0.5, r1: r * 1.5, width: 0.5, life: 0.9, core: matter, glow: matter, soft: 0.95, y: 0.2, delay: 0.06, opacity: 0.45, gain: 0.5 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 1.25, glow: bs.corruption, life: 2.4, cool: 0.9 });
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
    const b = byId(ev.id);
    const t = byId(ev.target);
    const bs = vfxBossStyle(b?.kind ?? 'stag');
    const ang = t ? Math.atan2(t.z - ev.z, t.x - ev.x) : 0;
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 1.5, width: 0.42, span: 1.5, sweep: 0.09, life: 0.4, core: bs.peak, glow: bs.corruption, soft: 0.4, jag: 0.5, lift: 0.05, y: 0.25 });
    kit.crack({ x: ev.x + Math.cos(ang) * 0.8, z: ev.z + Math.sin(ang) * 0.8, radius: 0.9, glow: bs.corruption, life: 1.2, cool: 0.4 });
    spray('chunk', ev.x, 0.2, ev.z, bs.trample.chunk, { color: vfxMatterColor(bs.matter), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.15], life: [0.5, 0.9], dir: { x: Math.cos(ang), z: Math.sin(ang) }, dirBias: 0.5 });
    camfx.kick(Math.cos(ang), Math.sin(ang), 0.05, 0.16);
  });
  bus.on('boss_adds', (ev) => {
    const b = byId(ev.id) ?? world.entities().find((e) => e.kind === 'stag');
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
    for (const h of ev.healed || []) {
      const t = byId(h.id);
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
    spray('shard', x, 0.4, z, 10, { color: ICHOR, tile: SHARD_TILE.drop, speed: [0.8, 2.0], up: [1.2, 2.4], size: [0.1, 0.15], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2] });
    for (const id of ev.brood || []) {
      const b = byId(id);
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

  // ------------------------------------------------- the Drowned Heron --
  // "The mill's drowned spear." Style: cold water over violet rot. Shapes:
  // long straight wakes (the spear), feather gusts (the wings), rings and a
  // geyser (the millrace). Light: violet at the bill and core, never warm.
  // Debris: foam droplets and silt. Camera: a kick along the spear when it
  // connects, a dolly on the surfacing.
  const HERON = vfxBossStyle('heron');
  bus.on('boss_spear', (ev) => {
    mark('heron_spear');
    const b = byId(ev.id);
    const d = b ? unit2(b.dashVx ?? b.faceX ?? 0, b.dashVz ?? b.faceZ ?? 1) : { x: 0, z: 1 };
    const len = ev.len ?? 6;
    const { x, z } = ev;
    // The lane's floor foams white behind the drive, laid down at the dash's
    // own speed (11 u/s) so it reads as the bird ploughing the water.
    const sweep = len / 11;
    kit.streak({ a: { x, y: 0.08, z }, b: { x: x + d.x * len, y: 0.08, z: z + d.z * len }, width: HERON.spear.wakeW, tailW: 0.4, core: WATER, glow: WATER, life: sweep + 0.6, fall: 0.8, opacity: 0.55 });
    // The bill itself: a violet-edged spearhead running down the lane.
    kit.streak({ a: { x, y: 0.75, z }, b: { x: x + d.x * 0.9, y: 0.75, z: z + d.z * 0.9 }, width: 0.08, tailW: 0.6, core: PARCH, glow: HERON.corruption, life: sweep, travel: { x: d.x * 11, y: 0, z: d.z * 11 }, fall: 0.4 });
    kit.flash({ x: x + d.x * 0.6, y: 0.75, z: z + d.z * 0.6, color: HERON.peak, size: 0.6, life: 0.16 });
    spray('shard', x, 0.2, z, 8, { color: WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.4, 2.4], size: [0.1, 0.15], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2], dir: { x: -d.x, z: -d.z }, dirBias: 0.4 });
  });
  bus.on('boss_spear_hit', (ev) => {
    mark('heron_spear_hit');
    const t = byId(ev.target);
    const b = byId(ev.id);
    if (!t) return;
    const d = b ? unit2(b.dashVx ?? 0, b.dashVz ?? 0) : { x: 0, z: 1 };
    spray('shard', t.x, 0.45, t.z, 7, { color: WATER, tile: SHARD_TILE.drop, speed: [1.2, 2.6], up: [1.0, 2.0], size: [0.1, 0.15], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2], dir: d, dirBias: 0.6 });
    kit.flash({ x: t.x, y: 0.55, z: t.z, color: HERON.corruption, size: 0.7, life: 0.16 });
    camfx.kick(d.x, d.z, HERON.camera.kick, 0.14);
  });
  bus.on('boss_wingbeat', (ev) => {
    mark('heron_wingbeat');
    const { x, z } = ev;
    const r = ev.radius ?? 2.2;
    const w = HERON.wing;
    for (let i = 0; i < N(w.gusts); i++) {
      const a = (i / w.gusts) * TAU + rnd(-0.12, 0.12);
      kit.streak({ a: { x: x + Math.cos(a) * 0.5, y: 0.45, z: z + Math.sin(a) * 0.5 }, b: { x: x + Math.cos(a) * r * rnd(0.9, 1.1), y: 0.3, z: z + Math.sin(a) * r * rnd(0.9, 1.1) }, width: 0.06, tailW: 0, core: PARCH, glow: WATER, life: 0.3, delay: rnd(0, 0.05), fall: 1.6 });
    }
    kit.ring({ x, z, r0: 0.5, r1: r * 1.1, width: 0.14, life: 0.45, core: HERON.peak, glow: HERON.corruption, soft: 0.5, y: 0.06 });
    spray('shard', x, 1.2, z, w.feathers, { color: WATER, tile: SHARD_TILE.feather, speed: [1.2, 2.4], up: [0.4, 1.0], size: [0.13, 0.18], life: [1.0, 1.5], gravity: 0.7, drag: 1.6, spin: [-4, 4], flutter: 0.55 });
    spray('shard', x, 0.2, z, w.spray, { color: WATER, tile: SHARD_TILE.drop, speed: [1.8, 3.0], up: [0.8, 1.6], size: [0.1, 0.14], life: [0.4, 0.6], gravity: 7, drag: 0.5, spin: [-2, 2], jitter: r * 0.4 });
    kit.light({ x, z, radius: r * 1.2, color: HERON.corruption, opacity: 0.4, life: 0.4 });
  });
  function ripples(x, z, n, r1, delay0 = 0) {
    for (let i = 0; i < n; i++) kit.ring({ x, z, r0: 0.3, r1: r1 * (1 + i * 0.25), width: 0.06, life: 1.1, core: WATER, glow: WATER, soft: 0.7, y: 0.03, delay: delay0 + i * 0.22, opacity: 0.5, gain: 0.5 });
  }
  bus.on('boss_submerge', (ev) => {
    mark('heron_submerge');
    const { x, z } = ev;
    kit.ring({ x, z, r0: 0.3, r1: 1.8, width: 0.22, life: 0.5, core: WATER, glow: WATER, soft: 0.8, y: 0.05, opacity: 0.7 });
    ripples(x, z, 3, 2.0, 0.15);
    spray('shard', x, 0.3, z, 16, { color: WATER, tile: SHARD_TILE.drop, speed: [0.8, 2.0], up: [2.0, 3.4], size: [0.1, 0.16], life: [0.6, 0.9], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.4 });
    spray('smoke', x, 0.15, z, 5, { color: SILT, speed: [0.4, 1.0], up: [0.05, 0.2], size: [0.45, 0.62], grow: 1.5, life: [1.2, 1.7], opacity: 0.4, gravity: 0, drag: 2.4, jitter: 0.5 });
    kit.flash({ x, y: 0.4, z, color: HERON.corruption, size: 1.0, life: 0.3 });
  });
  bus.on('boss_surface', (ev) => {
    mark('heron_surface');
    const { x, z } = ev;
    const g = HERON.geyser;
    kit.pillar({ x, z, radius: 0.7, height: g.height, color: WATER, life: 0.8, opacity: 0.55 });
    kit.pillar({ x, z, radius: 0.3, height: g.height * 1.1, color: HERON.corruption, life: 0.7, opacity: 0.6 });
    kit.flash({ x, y: 1.6, z, color: HERON.peak, size: 1.4, life: 0.32, hold: 0.08 });
    ripples(x, z, g.ripples, (ev.radius ?? 1.8) * 1.2);
    spray('shard', x, 1.2, z, g.drops, { color: WATER, tile: SHARD_TILE.drop, speed: [0.6, 1.8], up: [3.0, 5.0], size: [0.11, 0.17], life: [0.8, 1.2], gravity: 7, drag: 0.2, spin: [-2, 2], jitter: 0.4 });
    spray('chunk', x, 0.2, z, 6, { color: SILT, speed: [0.8, 1.8], up: [1.6, 2.8], size: [0.06, 0.12], life: [0.5, 0.8] });
    kit.light({ x, z, radius: 3, color: HERON.corruption, opacity: 0.5, life: 0.8, attack: 0.04 });
    camfx.dolly(x, z, HERON.camera.dolly, 0.3);
  });
  function heronDeath(x, z) {
    // It falls into the millrace: the largest splash of the act, violet
    // draining out of it, feathers left on the water.
    mark('heron_death');
    kit.pillar({ x, z, radius: 0.9, height: 3.6, color: HERON.corruption, life: 1.3, opacity: 0.65 });
    kit.ring({ x, z, r0: 0.5, r1: 3.6, width: 0.32, life: 0.9, core: HERON.peak, glow: HERON.corruption, soft: 0.5, y: 0.06 });
    ripples(x, z, 4, 3.0, 0.1);
    spray('shard', x, 0.6, z, 28, { color: WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.6], up: [2.4, 4.4], size: [0.11, 0.17], life: [0.8, 1.2], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.7 });
    spray('shard', x, 1.4, z, 14, { color: WATER, tile: SHARD_TILE.feather, speed: [0.6, 1.6], up: [0.6, 1.4], size: [0.14, 0.2], life: [1.6, 2.2], gravity: 0.5, drag: 1.8, spin: [-3, 3], flutter: 0.6 });
    spray('smoke', x, 0.2, z, 8, { color: SILT, speed: [0.5, 1.3], up: [0.05, 0.25], size: [0.5, 0.7], grow: 1.6, life: [1.4, 2.0], opacity: 0.4, drag: 2.4, jitter: 0.8 });
    spray('spark', x, 0.4, z, 24, { color: HERON.corruption, speed: [0.3, 1.0], up: [0.8, 2.0], size: [0.06, 0.12], life: [1.2, 2.0], gravity: -0.3, drag: 1.2, jitter: 0.8 });
    kit.light({ x, z, radius: 4, color: HERON.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, HERON.camera.dolly, 0.5);
  }

  // ------------------------------------------------- the Barrow Wyrm --
  // "Ash breath, then the ground opens." Style: a furnace under the grave —
  // ash and cinders over violet cracks. Shapes: a fan of streaking cinders
  // that fills the cone, jagged earth rings, a violet pillar out of the
  // mound. Light: Ember down the breath (it is the attack), violet from
  // the cracks. Debris: ash smoke, earth chunks, hanging cinders. Camera:
  // a kick down the breath, a dolly on the eruption.
  const WYRM = vfxBossStyle('wyrm');
  bus.on('boss_breath', (ev) => {
    mark('wyrm_breath');
    const b = byId(ev.id);
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const base = Math.atan2(d.z, d.x);
    const R = b?.telegraph?.radius ?? 4.2;
    const half = ((b?.telegraph?.halfAngleDeg ?? 32) * Math.PI) / 180;
    const { x, z } = ev;
    const br = WYRM.breath;
    // Throat flare (violet) and the front of the breath sweeping to the cone's rim.
    kit.flash({ x: x + d.x * 0.4, y: 0.6, z: z + d.z * 0.4, color: WYRM.peak, size: 0.9, life: 0.2 });
    kit.slash({ x, z, angle: base, radius: R * 0.92, width: 0.32, span: half * 2, sweep: 0.12, life: 0.45, core: PARCH, glow: EMBER, soft: 0.6, jag: 0.35, lift: 0.04, y: 0.25, gain: 0.9, grow: 0.15 });
    for (let i = 0; i < N(br.streaks); i++) {
      const a = base + rnd(-half, half) * 0.9;
      const r1 = R * rnd(0.55, 1.0);
      kit.streak({ a: { x: x + Math.cos(a) * 0.5, y: 0.45, z: z + Math.sin(a) * 0.5 }, b: { x: x + Math.cos(a) * r1, y: 0.3, z: z + Math.sin(a) * r1 }, width: 0.06, tailW: 0.15, core: PARCH, glow: EMBER, life: 0.3, delay: rnd(0, 0.12), fall: 1.6 });
    }
    for (let i = 0; i < N(br.smoke); i++) {
      const a = base + rnd(-half, half) * 0.8;
      const r = R * rnd(0.25, 0.8);
      spray('smoke', x + Math.cos(a) * r, 0.35, z + Math.sin(a) * r, 1, { color: CINDER, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.45, 0.65], grow: 1.6, life: [1.0, 1.5], opacity: 0.4, gravity: -0.15, drag: 2.2, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 0.8 });
    }
    spray('spark', x + d.x * 0.6, 0.45, z + d.z * 0.6, br.cinders, { color: EMBER, speed: [2.0, 4.2], up: [0.2, 1.0], size: [0.04, 0.09], life: [0.5, 0.9], gravity: -0.2, drag: 1.0, dir: d, dirBias: 0.85 });
    kit.light({ x: x + d.x * R * 0.5, z: z + d.z * R * 0.5, radius: R * 0.8, color: EMBER, opacity: 0.4, life: 0.45, attack: 0.04 });
    camfx.kick(d.x, d.z, WYRM.camera.kick * 0.6, 0.16);
  });
  function moundBurst(x, z, big) {
    const e = WYRM.erupt;
    kit.crack({ x, z, radius: big ? 2.0 : 1.2, glow: WYRM.corruption, life: big ? 2.2 : 1.4, cool: big ? 0.8 : 0.4 });
    kit.ring({ x, z, r0: 0.2, r1: big ? 2.1 : 1.3, width: big ? 0.32 : 0.2, life: 0.5, core: EARTH, glow: big ? EMBER : WYRM.corruption, soft: 0.4, jag: 0.9, y: 0.05, opacity: 0.8 });
    spray('chunk', x, 0.2, z, big ? e.chunk : 8, { color: EARTH, speed: [0.8, 2.4], up: [2.4, 4.4], size: [0.08, 0.17], life: [0.7, 1.1], jitter: 0.4 });
    for (let i = 0; i < N(big ? e.dust : 4); i++) {
      const a = (i / (big ? e.dust : 4)) * TAU + rnd(-0.2, 0.2);
      spray('smoke', x + Math.cos(a) * 0.5, 0.2, z + Math.sin(a) * 0.5, 1, { color: CINDER, speed: big ? 2.6 : 1.4, up: [0.1, 0.4], size: [0.45, 0.65], grow: 1.5, life: [0.9, 1.3], opacity: 0.38, gravity: -0.12, drag: 2.6, dir: { x: Math.cos(a), z: Math.sin(a) }, dirBias: 1 });
    }
  }
  bus.on('boss_burrow', (ev) => {
    mark('wyrm_burrow');
    moundBurst(ev.x, ev.z, false);
  });
  bus.on('boss_emerge', (ev) => {
    mark('wyrm_emerge');
    const { x, z } = ev;
    const e = WYRM.erupt;
    moundBurst(x, z, true);
    kit.pillar({ x, z, radius: (ev.radius ?? 1.9) * 0.4, height: e.pillarH, color: WYRM.corruption, life: 0.85, opacity: 0.6 });
    kit.flash({ x, y: 0.7, z, color: WYRM.peak, size: 1.5, life: 0.3, hold: 0.08 });
    spray('spark', x, 0.2, z, e.cinders, { color: EMBER, speed: [0.2, 0.8], up: [1.2, 2.4], size: [0.05, 0.1], life: [0.9, 1.4], gravity: -0.3, drag: 1.3, jitter: 0.8 });
    spray('spark', x, 0.2, z, 10, { color: WYRM.corruption, speed: [0.1, 0.5], up: [0.6, 1.4], size: [0.06, 0.12], life: [1.2, 1.8], gravity: -0.35, drag: 1.4, jitter: 1.0, opacity: 0.85 });
    kit.light({ x, z, radius: 3.2, color: WYRM.corruption, opacity: 0.55, life: 0.9, attack: 0.04 });
    camfx.dolly(x, z, WYRM.camera.dolly, 0.32);
  });
  bus.on('boss_enrage', (ev) => {
    mark('wyrm_enrage');
    const { x, z } = ev;
    kit.pillar({ x, z, radius: 0.5, height: 2.6, color: WYRM.corruption, life: 0.7, opacity: 0.5 });
    kit.ring({ x, z, r0: 0.5, r1: 3.0, width: 0.18, life: 0.7, core: WYRM.peak, glow: WYRM.corruption, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 1.6, glow: WYRM.corruption, life: 2.0, cool: 0.8 });
    spray('spark', x, 0.3, z, 20, { color: WYRM.corruption, speed: [0.2, 0.7], up: [1.0, 2.0], size: [0.06, 0.11], life: [1.0, 1.6], gravity: -0.35, drag: 1.4, jitter: 0.9 });
    kit.light({ x, z, radius: 3, color: WYRM.corruption, opacity: 0.45, life: 0.8 });
  });
  function wyrmDeath(x, z) {
    // It crumbles to ash: the body's cinders rise, the cracks go cold.
    mark('wyrm_death');
    kit.pillar({ x, z, radius: 1.0, height: 3.8, color: WYRM.corruption, life: 1.4, opacity: 0.65 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: WYRM.peak, glow: WYRM.corruption, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 2.4, glow: WYRM.corruption, life: 3, cool: 1.2 });
    spray('smoke', x, 0.4, z, 14, { color: CINDER, speed: [0.3, 1.0], up: [0.5, 1.2], size: [0.5, 0.72], grow: 1.6, life: [1.6, 2.2], opacity: 0.42, gravity: -0.3, drag: 2.0, jitter: 1.2 });
    spray('chunk', x, 0.4, z, 16, { color: EARTH, speed: [1.0, 2.6], up: [1.8, 3.6], size: [0.08, 0.17], life: [0.8, 1.2], jitter: 0.8 });
    spray('spark', x, 0.4, z, 30, { color: WYRM.corruption, speed: [0.3, 1.2], up: [0.8, 2.0], size: [0.06, 0.13], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    spray('spark', x, 0.3, z, 16, { color: EMBER, speed: [0.2, 0.8], up: [1.0, 2.2], size: [0.04, 0.08], life: [0.8, 1.3], gravity: -0.25, drag: 1.3, jitter: 1.0 });
    kit.light({ x, z, radius: 4, color: WYRM.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, WYRM.camera.dolly, 0.5);
  }
  const KIT_BOSS_DEATH = { heron: heronDeath, wyrm: wyrmDeath };

  // Per frame: the Heron's drive throws spray off its legs and stops in a
  // splash; the burrowed Wyrm leaves a trail of turned earth so the party can
  // read where it is tunnelling.
  const bossMode = new Map(); // boss id -> { mode, clock }
  function bossFrame(dt) {
    for (const e of world.entities()) {
      if (e.kind !== 'heron' && e.kind !== 'wyrm') continue;
      let rec = bossMode.get(e.id);
      if (!rec) {
        rec = { mode: e.mode, clock: 0 };
        bossMode.set(e.id, rec);
      }
      const was = rec.mode;
      rec.mode = e.mode;
      rec.clock += dt;
      if (e.kind === 'heron') {
        if (e.mode === 'dash' && rec.clock >= HERON.spear.every) {
          rec.clock = 0;
          const d = unit2(e.dashVx ?? 0, e.dashVz ?? 0);
          for (const s of [-1, 1]) spray('shard', e.x - d.z * 0.3 * s, 0.15, e.z + d.x * 0.3 * s, 1, { color: WATER, tile: SHARD_TILE.drop, speed: [0.8, 1.6], up: [1.2, 2.0], size: [0.09, 0.13], life: [0.35, 0.55], gravity: 7, drag: 0.4, dir: { x: -d.z * s, z: d.x * s }, dirBias: 0.7 });
        } else if (was === 'dash' && e.mode !== 'dash') {
          mark('heron_spear_stop');
          kit.ring({ x: e.x, z: e.z, r0: 0.3, r1: 1.4, width: 0.16, life: 0.45, core: WATER, glow: WATER, soft: 0.8, y: 0.04, opacity: 0.6 });
          spray('shard', e.x, 0.3, e.z, 10, { color: WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.0], up: [1.6, 2.8], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2] });
        }
      } else if (e.mode === 'burrowed' && rec.clock >= WYRM.tunnel.every) {
        rec.clock = 0;
        spray('chunk', e.x, 0.15, e.z, 2, { color: EARTH, speed: [0.3, 0.8], up: [1.0, 1.8], size: [0.05, 0.1], life: [0.35, 0.6], jitter: 0.3 });
        spray('smoke', e.x, 0.12, e.z, 1, { color: CINDER, speed: [0.1, 0.3], up: [0.1, 0.3], size: [0.34, 0.48], grow: 1.3, life: [0.7, 1.0], opacity: 0.32, gravity: -0.1, drag: 2.4, jitter: 0.2 });
        if (rnd(0, 1) < 0.35) spray('spark', e.x, 0.1, e.z, 1, { color: WYRM.corruption, speed: [0.05, 0.2], up: [0.5, 0.9], size: [0.05, 0.09], life: [0.6, 0.9], gravity: -0.3, drag: 1.4, jitter: 0.3 });
      }
    }
    if (bossMode.size > 8) bossMode.clear();
  }

  // ----------------------------------------------------------- per frame --
  // Projectile trails (held streaks that follow each bolt) and movement wakes.
  const trails = new Map(); // entity id -> { s, kind }
  const wakeClock = new Map(); // enemy id -> s since the last wake puff
  const trailFor = (e) => {
    if (e.kind === 'skillbolt') {
      const cls = vfxSkillClass(e.skill) ?? 'healer';
      const st = vfxClassStyle(cls);
      const heal = !!e.heal;
      return { y: BOLT_Y, len: st.bolt.trail * 3.2, width: st.bolt.width, core: PARCH, glow: heal ? HEAL : st.glow, tailW: st.shape === 'line' ? 0.05 : 0.4 };
    }
    if (e.kind === 'bolt') {
      const st = vfxClassStyle('healer');
      return { y: BOLT_Y, len: 0.9, width: 0.14, core: PARCH, glow: st.glow, tailW: 0.45 };
    }
    if (e.kind === 'eshot') return ENEMY_SHOT_TRAIL[shotKind.get(e.id)] ?? { y: ESHOT_Y, len: 0.75, width: 0.12, core: PARCH, glow: EMBER, tailW: 0.15 };
    return null;
  };
  let last = null;
  function update(tSec) {
    const dt = last === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - last));
    last = tSec;
    const seen = new Set();
    for (const e of world.entities()) {
      const k = e.kind;
      if (k === 'skillbolt' || k === 'bolt' || k === 'eshot') {
        seen.add(e.id);
        let rec = trails.get(e.id);
        const spec = rec ? rec.spec : trailFor(e);
        if (!spec) continue;
        const vx = e.vx ?? 0;
        const vz = e.vz ?? 0;
        const vl = Math.hypot(vx, vz) || 1;
        const len = Math.min(spec.len, (e.traveled ?? spec.len) + 0.05);
        const hx = e.x;
        const hz = e.z;
        if (!rec) {
          rec = { spec, s: kit.streak({ a: { x: hx, y: spec.y, z: hz }, b: { x: hx, y: spec.y, z: hz }, width: spec.width, tailW: spec.tailW, core: spec.core, glow: spec.glow, hold: true, owner: e.id, fall: 1.6, opacity: 0.9 }) };
          trails.set(e.id, rec);
        }
        if (rec.s.owner !== e.id) continue; // its slot was recycled
        kit.setStreak(rec.s, hx - (vx / vl) * len, spec.y, hz - (vz / vl) * len, hx, spec.y, hz);
        continue;
      }
      // Movement wakes: chargers / brutes kick dust when moving fast, flyers
      // shed scale dust.
      if (e.faction === 'hostile' && e.hp > 0 && e.px !== undefined) {
        const sp = Math.hypot(e.x - e.px, e.z - e.pz);
        const es = vfxEnemyStyle(k);
        const flyer = es.family === 'flyer';
        if (!flyer && sp < TRAIL_SPEED) continue;
        if (!flyer && es.family !== 'charger' && es.family !== 'brute') continue;
        const c = (wakeClock.get(e.id) ?? 0) + dt;
        const every = flyer ? 0.35 : 0.09;
        if (c < every) {
          wakeClock.set(e.id, c);
          continue;
        }
        wakeClock.set(e.id, 0);
        const matter = vfxMatterColor(es.matter);
        if (flyer) spray('spark', e.x, 0.9, e.z, 1, { color: matter, speed: [0.05, 0.2], up: [-0.4, -0.1], size: [0.04, 0.07], life: [0.8, 1.2], gravity: 0.2, drag: 1.5, opacity: 0.55 });
        else spray('smoke', e.x, 0.12, e.z, 1, { color: matter, speed: [0.1, 0.3], up: [0.2, 0.4], size: [0.24, 0.36], grow: 1.1, life: [0.45, 0.7], opacity: 0.28, gravity: -0.15, drag: 2.6 });
      }
    }
    bossFrame(dt);
    for (const [id, rec] of trails) {
      if (seen.has(id)) continue;
      shotKind.delete(id);
      if (rec.s.owner === id) kit.release(rec.s, 0.12);
      trails.delete(id);
    }
    if (wakeClock.size > 64) wakeClock.clear();
    if (shotKind.size > 64) shotKind.clear();
    if (globKind.size > 64) globKind.clear();
    kit.update(dt);
  }

  // After every layer placed the camera this frame.
  function applyCamera(tSec) {
    camfx.apply(tSec);
  }

  // ------------------------------------------------- relics and curses --
  // (sim/relics.js) A relic taken rises off the Healer in its rarity colour;
  // a proc marks the body it touched; a cursed room opens with a violet ring
  // closing on the party and lifts with one bursting outward.
  const RELIC_RARITY = { common: BONE, rare: PALETTE.signalBlue, legendary: PALETTE.hearthAmber };
  const VIOLET = PALETTE.godstuffViolet;
  const VIOLET_PEAK = PALETTE.godstuffVioletPeak;
  const bodyAt = (ev) => {
    const b = byId(ev.target);
    return b ? { x: b.x, z: b.z } : { x: ev.x ?? player()?.x ?? 0, z: ev.z ?? player()?.z ?? 0 };
  };
  bus.on('relic_gain', (ev) => {
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
  });
  bus.on('relic_proc', (ev) => {
    const { x, z } = bodyAt(ev);
    if (ev.relic === 'last_light') {
      kit.flash({ x, y: 0.9, z, color: PARCH, size: 1.3, life: 0.45, hold: 0.15 });
      kit.ring({ x, z, r0: 1.6, r1: 0.4, width: 0.16, life: 0.5, core: PARCH, glow: PALETTE.hearthAmber, soft: 0.4, y: 0.08 });
      kit.light({ x, z, radius: 2.0, color: PALETTE.hearthAmber, opacity: 0.6, life: 0.6 });
    } else if (ev.relic === 'thorn_mail') {
      const from = byId(ev.from);
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
  bus.on('curse_apply', (ev) => {
    const p = player();
    const x = p ? p.x : ev.x ?? 0;
    const z = p ? p.z : ev.z ?? 0;
    kit.ring({ x, z, r0: 5.5, r1: 0.6, width: 0.22, life: 0.9, core: VIOLET_PEAK, glow: VIOLET, soft: 0.5, y: 0.06 });
    kit.light({ x, z, radius: 3.4, color: VIOLET, opacity: 0.45, life: 1.0 });
    spray('spark', x, 0.1, z, 16, { color: VIOLET, speed: [0.1, 0.5], up: [0.6, 1.4], size: [0.06, 0.12], life: [1.0, 1.6], gravity: -0.35, drag: 1.4, jitter: 3.0, opacity: 0.85 });
  });
  bus.on('curse_lift', (ev) => {
    if (ev.forfeited) return;
    const p = player();
    if (!p) return;
    kit.ring({ x: p.x, z: p.z, r0: 0.6, r1: 6.0, width: 0.2, life: 0.8, core: VIOLET_PEAK, glow: VIOLET, soft: 0.6, y: 0.06 });
    kit.flash({ x: p.x, y: 1.2, z: p.z, color: VIOLET_PEAK, size: 1.0, life: 0.4 });
  });

  function levelTeardown() {
    trails.clear();
    wakeClock.clear();
    globKind.clear();
    shotKind.clear();
    bossMode.clear();
    lastClassHit.clear();
    swingSide.clear();
    camfx.clear();
    return kit.clear();
  }
  bus.on('level_transit', levelTeardown);
  bus.on('run_end', levelTeardown);
  bus.on('return_to_camp', levelTeardown);
  bus.on('state_restored', levelTeardown);

  function prewarm() {
    kit.prewarm(stage.scene);
  }

  function debugCounts() {
    return { ...kit.counts(), recipes: { ...fired }, trails: trails.size, camera: camfx.offset(), cameraLive: camfx.live(), effects: settings?.get?.('gameplay.effects') ?? 'full' };
  }

  return { update, applyCamera, prewarm, debugCounts, kit, camfx };
}

// Healer skills that restore (their casts get petals + light, never damage FX).
const HEAL_SKILLS = new Set(['mending_bolt', 'swift_mend', 'nova_bloom', 'sanctuary', 'guardian_bond', 'restorative_wave', 'dewfall', 'kindred_shield', 'mending_tide', 'hearthsong']);
// Nova radii by skill for skill_cast (the Healer's cast payload carries no
// radius); filled from sim/skills.js at module load by the main wiring.
const SKILL_AREA = new Map();
export function registerSkillAreas(skills) {
  for (const id of Object.keys(skills)) if (skills[id].shape === 'nova') SKILL_AREA.set(id, skills[id].area);
}
