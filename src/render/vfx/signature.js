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
import { Color } from 'three';
import { PALETTE, VFX_BIOME, VFX_MATTER, AFFIX_COLORS } from '../../data/palette.js';
import { AFFIX_RULES } from '../../sim/affixes.js';
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
  // The Millwheel's cog shards: a hot iron splinter, short and bright.
  millwheel: Object.freeze({ y: ESHOT_Y, len: 0.6, width: 0.09, core: PARCH, glow: PALETTE.hearthAmber, tailW: 0.1 }),
  // Act IV: the Cantor's echo and the Colossus' burst throw crystal shards.
  cantor: Object.freeze({ y: ESHOT_Y, len: 0.7, width: 0.1, core: PARCH, glow: PALETTE.godstuffViolet, tailW: 0.1 }),
  colossus: Object.freeze({ y: ESHOT_Y, len: 0.6, width: 0.1, core: '#DCD6F2', glow: EMBER, tailW: 0.1 }),
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
    if (c <= 0) return;
    // Biome tint (AAA pass): smoke and dust take a quarter of the act's air
    // (moss in the Hollow Wood, cold slate in the Sunken Mill, ash in the
    // Barrow), so the same puff belongs to the room it is in.
    if ((mode === 'smoke' || mode === 'chunk') && opts && opts.color != null) opts = { ...opts, color: biomeTint(opts.color, mode === 'smoke' ? 0.28 : 0.15) };
    impactFx.spray(mode, x, y, z, c, opts);
  };

  // ------------------------------------------------------------ biome --
  let biomeAct = 1;
  let biomeClock = 0;
  const readBiome = () => {
    try {
      const a = world.runSystem?.()?.view?.()?.act;
      if (a) biomeAct = a;
    } catch {
      /* the run system is optional (harness scenes) */
    }
  };
  const tintCache = new Map();
  const _ca = new Color();
  const _cb = new Color();
  function biomeTint(hex, k) {
    const air = VFX_BIOME[biomeAct] ?? VFX_BIOME[1];
    const key = `${hex}|${air}|${k}`;
    let v = tintCache.get(key);
    if (v === undefined) {
      _ca.set(hex);
      _cb.set(air);
      v = '#' + _ca.lerp(_cb, k).getHexString();
      if (tintCache.size > 512) tintCache.clear();
      tintCache.set(key, v);
    }
    return v;
  }

  // ------------------------------------------- AAA layering helpers --
  // Every beat is built in three movements (design-VFX.md §10):
  //   anticipation  energy drawn IN (an imploding ring, motes and lines
  //                 rushing to the source) for the few frames before;
  //   impact        a white-hot core and a coloured flare that pop on the
  //                 frame it lands (kit.star), a flash, a light pool, a
  //                 shockwave ring, the camera's punch;
  //   dissipation   what is left: embers drifting up, smoke rolling out, a
  //                 ground mark whose seam cools over a second or two.
  // Delays below ~0.1 s are carried by a tiny timer list (after()).
  const timers = [];
  const after = (sec, fn) => {
    if (sec <= 0) fn();
    else timers.push({ t: sec, fn });
  };
  const ANTICIP = 0.06; // s — the gather before a big cast lands (~4 frames)
  function anticipate(x, z, radius, color, { y = 0.45, lines = 6, core = PARCH } = {}) {
    kit.ring({ x, z, r0: radius * 1.25, r1: 0.12, width: 0.07, life: ANTICIP + 0.04, core, glow: color, soft: 0.4, y: 0.06, opacity: 0.85 });
    for (let i = 0; i < N(lines); i++) {
      const a = (i / lines) * TAU + rnd(-0.25, 0.25);
      const r = radius * rnd(0.9, 1.3);
      const sp = r / (ANTICIP + 0.02);
      kit.streak({ a: { x: x + Math.cos(a) * (r + 0.3), y, z: z + Math.sin(a) * (r + 0.3) }, b: { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r }, width: 0.05, tailW: 0, core, glow: color, life: ANTICIP + 0.02, travel: { x: -Math.cos(a) * sp, y: 0, z: -Math.sin(a) * sp }, fall: 1.2 });
    }
    kit.flash({ x, y, z, color, size: 0.35, life: ANTICIP + 0.05, grow: -0.4, opacity: 0.6 });
  }
  // The landing frame: a coloured flare with a white-hot core over it.
  function flare(x, y, z, color, size, { kind = 'star', life = 0.2, core = PARCH, spin = 0, angle, delay = 0 } = {}) {
    const ang = angle ?? rnd(0, Math.PI);
    kit.star({ x, y, z, color, size, life, kind, spin, angle: ang, delay });
    kit.star({ x, y, z, color: core, size: size * 0.42, life: life * 0.7, kind, spin, angle: ang, delay });
  }
  function shock(x, z, radius, color, { life = 0.3, width = 0.08, core = PARCH, y = 0.07, delay = 0, jag = 0 } = {}) {
    kit.ring({ x, z, r0: 0.15, r1: radius, width, life, core, glow: color, soft: 0.35, y, delay, jag, thin: 0.6 });
  }
  function embersUp(x, z, color, n, { radius = 0.5, life = [1.0, 1.7], y = 0.3 } = {}) {
    spray('spark', x, y, z, n, { color, speed: [0.05, 0.35], up: [0.5, 1.2], size: [0.04, 0.08], life, gravity: -0.35, drag: 1.5, jitter: radius, opacity: 0.85 });
  }
  const flareKind = (st) => (st.shape === 'blunt' || st.shape === 'round' ? 'burst' : 'star');
  // Each class's floor mark: the Tank cratering, the Swordsman's cut, the
  // Archer's jade sigil, the Healer's lantern sigil.
  function classMark(st, x, z, radius, angle = undefined) {
    if (st.shape === 'blunt') kit.mark({ x, z, radius: radius * 1.5, kind: 'crater', stain: st.debrisColor, glow: st.glow, cool: 0.9, life: 3.2, opacity: 0.55 });
    else if (st.shape === 'sharp') kit.mark({ x, z, radius: radius * 1.4, kind: 'gouge', angle, stretch: 1.6, stain: INK, glow: st.glow, cool: 0.7, life: 2.4, opacity: 0.4 });
    else if (st.shape === 'line') kit.mark({ x, z, radius: radius * 1.6, kind: 'sigil', stain: INK, glow: st.glow, cool: 1.0, life: 1.8, opacity: 0.2 });
    else kit.mark({ x, z, radius: radius * 1.7, kind: 'sigil', stain: INK, glow: st.glow, cool: 1.2, life: 2.0, opacity: 0.15 });
  }

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
      flare(tipX, 0.4, tipZ, st.glow, big ? 1.1 : 0.55, { kind: 'burst', life: big ? 0.24 : 0.16 });
      if (big) {
        shock(tipX, tipZ, 0.9 + reach * 0.3, st.glow, { jag: 0.6, width: 0.12 });
        classMark(st, tipX, tipZ, 0.55 + reach * 0.2);
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
        flare(x + Math.cos(endA) * reach, 0.55, z + Math.sin(endA) * reach, st.glow, 0.9, { life: 0.2, core: st.second, delay: 0 });
        classMark(st, tipX, tipZ, 0.5 + reach * 0.25, angle + Math.PI / 2);
        embersUp(tipX, tipZ, st.glow, 5, { radius: reach * 0.4, life: [0.6, 1.0] });
        kit.light({ x: tipX, z: tipZ, radius: st.light.scale * reach, color: st.glow, opacity: st.light.opacity, life: st.light.life });
        camfx.kick(Math.cos(angle), Math.sin(angle), st.camera.kick, 0.08);
      }
    } else {
      // Healer / Archer / unknown: one soft sweep in the class glow.
      kit.slash({ x, z, angle, radius: reach * 0.9, width: sl.width, span: half * 2, sweep: sl.sweep, life: sl.life, core: st.core, glow: st.glow, soft: sl.soft, lift: 0.1, reverse: side });
      if (big) {
        flare(tipX, 0.5, tipZ, st.glow, 0.8, { kind: flareKind(st), life: 0.22 });
        classMark(st, tipX, tipZ, 0.6);
      }
      if (st.debris.shardKind) spray('shard', tipX, 0.5, tipZ, 3, { color: st.debrisColor, tile: SHARD_TILE[st.debris.shardKind] ?? 0, speed: [0.4, 1.0], up: [0.4, 1.0], size: [0.1, 0.16], life: [0.6, 1.0], gravity: 1.2, drag: 1.5, spin: [-4, 4], flutter: 0.4, opacity: 0.9 });
    }
  }

  // A burst around the caster (nova): energy gathers in, then it lands.
  function nova(st, x, z, radius, opts = {}) {
    anticipate(x, z, radius * 0.6, st.glow, { core: st.shape === 'sharp' ? st.second : PARCH });
    after(ANTICIP, () => {
      novaLand(st, x, z, radius, opts);
      flare(x, 0.55, z, st.glow, 1.2 + radius * 0.35, { kind: flareKind(st), life: 0.26, core: st.shape === 'sharp' ? st.second : PARCH });
      shock(x, z, radius * 1.25, st.glow, { life: 0.4, width: 0.06 });
      classMark(st, x, z, radius * 0.7);
      embersUp(x, z, st.glow, 10, { radius: radius * 0.6 });
    });
  }
  function novaLand(st, x, z, radius, { skill = null } = {}) {
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
    if (big) {
      kit.mark({ x, z, radius: radius * 1.6, kind: 'sigil', stain: INK, glow: HEAL, cool: 1.1, life: 1.6, opacity: 0.12 });
      flare(x, 0.6, z, HEAL, 1.0, { kind: 'burst', life: 0.28 });
      embersUp(x, z, HEAL, 8, { radius: radius * 0.5 });
    }
  }

  // Projectile release at the caster.
  function release(st, x, z, dx, dz, { count = 1 } = {}) {
    const mx = x + dx * 0.35;
    const mz = z + dz * 0.35;
    kit.flash({ x: mx, y: 0.6, z: mz, color: st.glow, size: count > 1 ? 0.5 : 0.36, life: 0.14 });
    flare(mx, 0.6, mz, st.glow, count > 1 ? 0.75 : 0.55, { kind: flareKind(st), life: 0.14, angle: Math.atan2(dz, dx) });
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
    // The landing frame, every hit: a class-coloured flare with a hot core;
    // a crit adds a shockwave, rising embers and a little camera punch.
    flare(x, 0.5, z, st.glow, (big ? 0.75 : 0.55) * (crit ? 1.6 : 1), { kind: flareKind(st), life: crit ? 0.24 : 0.16, core: st.shape === 'sharp' ? st.second : PARCH });
    if (crit) {
      shock(x, z, 1.0, st.glow, { life: 0.26, width: 0.07 });
      embersUp(x, z, st.glow, 4, { radius: 0.25, life: [0.6, 1.0] });
      if (dir) camfx.kick(dir.x, dir.z, 0.025, 0.08);
    }
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
    // Hurt frame: an Ember needle-flare on the body (a boss's is a violet
    // burst with a shockwave).
    if (boss) {
      flare(x, 0.55, z, vfxBossStyle(bossKind).corruption, 1.3, { kind: 'burst', life: 0.24, core: vfxBossStyle(bossKind).peak });
      shock(x, z, 1.1, vfxBossStyle(bossKind).corruption, { life: 0.3 });
    } else flare(x, 0.5, z, EMBER, 0.6, { life: 0.16 });
  }
  // A kit boss's hits throw its own matter (the Stag keeps its legacy row).
  const BOSS_HIT = {
    heron: Object.freeze({ matter: 'water', family: 'brute', shard: 'drop', chunk: 0, dust: 2 }),
    wyrm: Object.freeze({ matter: 'cinder', family: 'brute', shard: null, chunk: 6, dust: 3 }),
    thornmother: Object.freeze({ matter: 'bramble', family: 'brute', shard: 'needle', chunk: 5, dust: 2 }),
    millwheel: Object.freeze({ matter: 'oak', family: 'brute', shard: 'needle', chunk: 5, dust: 1 }),
    lichram: Object.freeze({ matter: 'boneplate', family: 'brute', shard: 'needle', chunk: 5, dust: 2 }),
  };

  // An enemy body breaking: what it was made of, scattered.
  function enemyDeath(kind, x, z, killerClass) {
    const es = vfxEnemyStyle(kind);
    const matter = vfxMatterColor(es.matter);
    impactFx.kill(x, z, { color: BONE, debris: matter });
    // The break: a bone-white burst, a ring of the body's matter, the
    // corruption leaving as indigo motes, a stain that lingers.
    flare(x, 0.5, z, BONE, 1.0, { kind: 'burst', life: 0.22 });
    shock(x, z, 1.0, matter, { life: 0.35, width: 0.1, core: BONE });
    spray('spark', x, 0.4, z, 6, { color: es.heart ? vfxMatterColor('heartvein') : TELL_INDIGO_GLOW, speed: [0.05, 0.3], up: [0.9, 1.6], size: [0.05, 0.09], life: [0.8, 1.3], gravity: -0.4, drag: 1.4, jitter: 0.25, opacity: 0.85 });
    const wet = es.matter === 'slime' || es.matter === 'ichor' || es.matter === 'water';
    kit.mark({ x, z, radius: 0.9, kind: wet ? 'splash' : 'scorch', stain: matter, glow: null, life: 3.5, opacity: 0.45 });
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
    anticipate(x, z, radius * 0.8, st.glow, { y: 0.15, lines: 8 });
    after(ANTICIP, () => {
      placeZoneLand(st, skill, x, z, radius, cx, cz);
      flare(x, 0.35, z, st.glow, 1.0 + radius * 0.3, { kind: flareKind(st), life: 0.22 });
      classMark(st, x, z, radius * 0.8);
    });
  }
  function placeZoneLand(st, skill, x, z, radius, cx, cz) {
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
    // Take-off and arrival frames.
    flare(x0, 0.45, z0, st.glow, 0.6, { kind: flareKind(st), life: 0.14 });
    flare(x1, 0.45, z1, st.glow, 0.8, { kind: flareKind(st), life: 0.2, core: st.shape === 'sharp' ? st.second : PARCH });
    if (st.shape === 'blunt' || st.shape === 'sharp') kit.mark({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, radius: Math.min(2.4, L) * 0.9, kind: 'gouge', angle: Math.atan2(dz, dx), stretch: 1.8, stain: st.shape === 'blunt' ? st.debrisColor : INK, glow: st.glow, cool: 0.5, life: 1.8, opacity: 0.35 });
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
    flare(x, 0.55, z, st.glow, 1.4, { life: 0.26, core: st.second, spin: 2 });
    shock(x, z, 1.2, st.glow, { life: 0.28 });
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

  // ------------------------------------------- MORE CLASS SKILLS (2026-10-08) --
  // docs/CLASS_SKILLS.md: each new skill's signature beat, layered over the
  // class's generic shape recipe above (which already plays its swing, burst,
  // release or placement). Anticipation, a white-hot impact, then something
  // left behind: the same three movements as every other class beat.
  const AMBER = PALETTE.hearthAmber;
  const lineAt = (x0, z0, dx, dz, k) => ({ x: x0 + dx * k, z: z0 + dz * k });
  const SKILL_SIG = {
    // Tank — a fault runs out along the line, earth heaving up segment by
    // segment, the far end bursting.
    earthshatter(st, ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const reach = (ev.reach ?? 1.8) + 0.4;
      const ang = Math.atan2(dz, dx);
      anticipate(ev.x + dx * 0.4, ev.z + dz * 0.4, 0.6, st.glow, { lines: 8 });
      const n = 5;
      for (let i = 1; i <= n; i++) {
        const k = (i / n) * reach;
        const p = lineAt(ev.x, ev.z, dx, dz, k);
        after(ANTICIP + i * 0.045, () => {
          kit.crack({ x: p.x, z: p.z, radius: 0.45 + i * 0.06, glow: st.glow, life: 1.6, cool: 0.45 });
          spray('chunk', p.x, 0.2, p.z, 4, { color: st.debrisColor, speed: [0.4, 1.4], up: [2.6, 4.2], size: [0.07, 0.16], life: [0.6, 1.0], jitter: 0.25 });
          spray('smoke', p.x, 0.15, p.z, 2, { color: st.second, speed: [0.3, 0.9], up: [0.3, 0.7], size: [0.34, 0.5], grow: 1.3, life: [0.6, 1.0], opacity: 0.3, gravity: -0.2, drag: 2.4, jitter: 0.2 });
          kit.flash({ x: p.x, y: 0.3, z: p.z, color: st.glow, size: 0.45, life: 0.14 });
        });
      }
      const end = lineAt(ev.x, ev.z, dx, dz, reach);
      after(ANTICIP + (n + 1) * 0.045, () => {
        flare(end.x, 0.5, end.z, st.glow, 1.5, { kind: 'burst', life: 0.28 });
        shock(end.x, end.z, 1.3, st.glow, { jag: 0.7, width: 0.12 });
        kit.mark({ x: (ev.x + end.x) / 2, z: (ev.z + end.z) / 2, radius: reach * 0.6, kind: 'gouge', angle: ang, stretch: 2.6, stain: st.debrisColor, glow: st.glow, cool: 1.0, life: 3.4, opacity: 0.55 });
        kit.light({ x: end.x, z: end.z, radius: 1.6, color: st.glow, opacity: st.light.opacity * 1.2, life: 0.4 });
        camfx.kick(dx, dz, st.camera.kick * 1.6, 0.16);
        camfx.dolly(end.x, end.z, st.camera.dolly, 0.22);
      });
    },
    // Tank — a war cry: a tall steel ring rolls out, amber chevrons rise
    // over every member it reaches.
    rallying_cry(st, ev) {
      const R = 3.5;
      anticipate(ev.x, ev.z, 0.8, AMBER, { core: PARCH });
      after(ANTICIP, () => {
        kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: R, width: 0.16, life: 0.55, core: PARCH, glow: st.glow, soft: 0.3, jag: 0.4, y: 0.06, gain: 1.2 });
        kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: R * 0.85, width: 0.08, life: 0.6, core: AMBER, glow: AMBER, soft: 0.5, y: 0.9, delay: 0.05, opacity: 0.6 });
        flare(ev.x, 1.0, ev.z, AMBER, 1.6, { kind: 'burst', life: 0.3 });
        kit.light({ x: ev.x, z: ev.z, radius: R * 0.8, color: AMBER, opacity: 0.4, life: 0.5 });
        camfx.dolly(ev.x, ev.z, st.camera.dolly, 0.24);
        for (const id of ev.targets || []) {
          const t = byId(id);
          if (!t) continue;
          kit.streak({ a: { x: ev.x, y: 0.8, z: ev.z }, b: { x: t.x, y: 0.9, z: t.z }, width: 0.06, tailW: 0.1, core: PARCH, glow: AMBER, life: 0.24, fall: 1.2 });
          embersUp(t.x, t.z, AMBER, 8, { radius: 0.3, life: [0.7, 1.1] });
          kit.flash({ x: t.x, y: 1.2, z: t.z, color: AMBER, size: 0.5, life: 0.22, delay: 0.08 });
        }
      });
    },
    // Tank — the ground grabs: a ring collapses inward, earth streaks drag
    // toward the badger, every caught enemy is hauled in on a line.
    earthen_grasp(st, ev) {
      const R = ev.radius ?? 2.3;
      kit.ring({ x: ev.x, z: ev.z, r0: R * 1.1, r1: 0.4, width: 0.18, life: 0.32, core: st.core, glow: st.glow, soft: 0.35, jag: 0.8, y: 0.06, gain: 1.2 });
      for (let i = 0; i < N(10); i++) {
        const a = (i / 10) * TAU + rnd(-0.2, 0.2);
        const r = R * rnd(0.8, 1.05);
        kit.streak({ a: { x: ev.x + Math.cos(a) * r, y: 0.12, z: ev.z + Math.sin(a) * r }, b: { x: ev.x + Math.cos(a) * (r - 0.5), y: 0.12, z: ev.z + Math.sin(a) * (r - 0.5) }, width: 0.14, tailW: 0.2, core: st.second, glow: st.glow, life: 0.3, travel: { x: -Math.cos(a) * r * 2.4, y: 0, z: -Math.sin(a) * r * 2.4 }, fall: 1.2 });
      }
      kit.crack({ x: ev.x, z: ev.z, radius: R * 0.7, glow: st.glow, life: 1.4, cool: 0.4 });
      for (const id of ev.targets || []) {
        const t = byId(id);
        if (!t) continue;
        kit.streak({ a: { x: t.x, y: 0.3, z: t.z }, b: { x: ev.x, y: 0.3, z: ev.z }, width: 0.1, tailW: 0.05, core: st.second, glow: st.glow, life: 0.3, fall: 1.4, opacity: 0.8 });
        spray('chunk', t.x, 0.15, t.z, 3, { color: st.debrisColor, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.7], dir: { x: ev.x - t.x, z: ev.z - t.z }, dirBias: 0.8 });
      }
      camfx.kick(rnd(-1, 1), rnd(-1, 1), st.camera.kick, 0.12);
    },
    // Swordsman — the moon's fang: one huge silver crescent over the swing
    // and a scatter of moon motes hanging after it.
    moonfang(st, ev) {
      const ang = Math.atan2(ev.dz ?? 0, ev.dx ?? 1);
      const tip = lineAt(ev.x, ev.z, ev.dx ?? 1, ev.dz ?? 0, 0.8);
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 1.25, width: 0.26, span: 2.2, sweep: 0.06, life: 0.34, core: PARCH, glow: st.second, soft: 0.1, lift: 0.3, y: 0.55, gain: 1.4, tail: 0.9 });
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 1.0, width: 0.12, span: 1.9, sweep: 0.07, life: 0.3, delay: 0.03, core: st.second, glow: st.glow, soft: 0.2, lift: 0.2, y: 0.5, gain: 1.1, reverse: true });
      flare(tip.x, 0.6, tip.z, st.second, 1.3, { life: 0.24, core: PARCH });
      for (let i = 0; i < N(10); i++) {
        const a = ang + rnd(-1, 1);
        const r = rnd(0.4, 1.3);
        spray('spark', ev.x + Math.cos(a) * r, 0.6, ev.z + Math.sin(a) * r, 1, { color: st.second, speed: [0.05, 0.2], up: [0.2, 0.5], size: [0.05, 0.09], life: [0.7, 1.2], gravity: -0.15, drag: 2, opacity: 0.9 });
      }
      kit.light({ x: tip.x, z: tip.z, radius: 1.2, color: st.second, opacity: 0.35, life: 0.3 });
    },
    // Swordsman — a dance of six cuts spiralling out, then wind at the heels.
    blade_dance(st, ev) {
      const R = ev.radius ?? 1.3;
      const a0 = rnd(0, TAU);
      for (let i = 0; i < 6; i++) {
        kit.slash({ x: ev.x, z: ev.z, angle: a0 + i * 1.15, radius: R * (0.55 + i * 0.09), width: st.slash.width * 1.3, span: 1.5, sweep: 0.05, life: 0.24, delay: i * 0.04, core: i % 2 ? st.second : PARCH, glow: st.glow, soft: 0.15, lift: 0.16, y: 0.42 + i * 0.03, gain: 1.2, reverse: i % 2 === 0 });
      }
      after(0.26, () => {
        kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: R * 1.2, width: 0.06, life: 0.3, core: st.second, glow: st.glow, soft: 0.2, y: 0.07 });
        for (let i = 0; i < 4; i++) {
          const a = rnd(0, TAU);
          kit.streak({ a: { x: ev.x, y: 0.3, z: ev.z }, b: { x: ev.x + Math.cos(a) * 0.8, y: 0.35, z: ev.z + Math.sin(a) * 0.8 }, width: 0.04, tailW: 0, core: PARCH, glow: st.glow, life: 0.22, fall: 1.4 });
        }
      });
    },
    // Archer — a long marking arrow: a jade rune where it leaves the bow.
    hunters_mark(st, ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const p = lineAt(ev.x, ev.z, dx, dz, 0.5);
      kit.ring({ x: p.x, z: p.z, r0: 0.5, r1: 0.15, width: 0.05, life: 0.2, core: PARCH, glow: st.glow, soft: 0.2, y: 0.6 });
      kit.streak({ a: { x: p.x, y: BOLT_Y, z: p.z }, b: { x: p.x + dx * 1.6, y: BOLT_Y, z: p.z + dz * 1.6 }, width: 0.04, tailW: 0, core: PARCH, glow: st.glow, life: 0.18, fall: 1.2 });
    },
    // Archer — a spray of five: a jade fan of wind and a burst of feathers.
    feather_fan(st, ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const base = Math.atan2(dz, dx);
      for (let i = -2; i <= 2; i++) {
        const a = base + (i * 12 * Math.PI) / 180;
        kit.streak({ a: { x: ev.x + Math.cos(a) * 0.3, y: 0.55, z: ev.z + Math.sin(a) * 0.3 }, b: { x: ev.x + Math.cos(a) * 1.6, y: 0.55, z: ev.z + Math.sin(a) * 1.6 }, width: 0.05, tailW: 0.12, core: PARCH, glow: st.glow, life: 0.2, delay: Math.abs(i) * 0.015, fall: 1.4 });
      }
      kit.slash({ x: ev.x, z: ev.z, angle: base, radius: 0.9, width: 0.08, span: 1.0, sweep: 0.05, life: 0.2, core: PARCH, glow: st.glow, soft: 0.3, y: 0.55, gain: 1 });
      spray('shard', ev.x, 0.6, ev.z, 8, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.8, 1.8], up: [0.6, 1.4], size: [0.11, 0.17], life: [0.8, 1.3], gravity: 0.9, drag: 1.8, spin: [-4, 4], flutter: 0.5, dir: { x: -dx, z: -dz }, dirBias: 0.5 });
      camfx.kick(-dx, -dz, st.camera.kick, 0.08);
    },
  };
  // Placement beats (ground_aoe) and the class passive pulse.
  const ZONE_SIG = {
    // Archer — iron jaws bloom open in jade, teeth pointing in.
    barbed_trap(st, x, z, r) {
      kit.ring({ x, z, r0: 0.15, r1: r, width: 0.07, life: 0.4, core: PARCH, glow: st.glow, soft: 0.25, y: 0.05 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        kit.streak({ a: { x: x + Math.cos(a) * r, y: 0.12, z: z + Math.sin(a) * r }, b: { x: x + Math.cos(a) * r * 0.55, y: 0.18, z: z + Math.sin(a) * r * 0.55 }, width: 0.05, tailW: 0, core: BONE, glow: st.glow, life: 0.9, fall: 0.6, opacity: 0.85 });
      }
      kit.mark({ x, z, radius: r * 1.3, kind: 'sigil', stain: INK, glow: st.glow, cool: 1.6, life: 3.2, opacity: 0.3 });
    },
  };
  bus.on('ally_cast', (ev) => {
    const fn = SKILL_SIG[ev.skill];
    if (!fn || ev.x == null) return;
    mark(`skill:${ev.skill}`);
    fn(vfxClassStyle(ev.classId), ev);
  });
  bus.on('azone_spawn', (ev) => {
    const fn = ZONE_SIG[ev.skill];
    if (!fn) return;
    mark(`zone:${ev.skill}`);
    const st = vfxClassStyle(ev.classId ?? vfxSkillClass(ev.skill));
    after(ANTICIP, () => fn(st, ev.x, ev.z, ev.radius ?? 0.75));
  });
  bus.on('azone_tick', (ev) => {
    if (ev.skill !== 'barbed_trap') return;
    const zEnt = byId(ev.id);
    if (!zEnt) return;
    const st = vfxClassStyle('archer');
    const { x, z } = zEnt;
    const r = zEnt.radius ?? 0.75;
    // The jaws snap shut: teeth slam to the centre, sparks and a bone flash.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + rnd(-0.1, 0.1);
      kit.streak({ a: { x: x + Math.cos(a) * r, y: 0.2, z: z + Math.sin(a) * r }, b: { x: x + Math.cos(a) * r * 0.7, y: 0.25, z: z + Math.sin(a) * r * 0.7 }, width: 0.06, tailW: 0.06, core: BONE, glow: st.glow, life: 0.12, travel: { x: -Math.cos(a) * r * 6, y: 0, z: -Math.sin(a) * r * 6 }, fall: 1.5 });
    }
    kit.flash({ x, y: 0.3, z, color: BONE, size: 0.55, life: 0.12, delay: 0.08 });
    spray('spark', x, 0.3, z, 7, { color: st.glow, speed: [1.4, 2.6], up: [0.6, 1.4], size: [0.04, 0.08], life: [0.18, 0.3] });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.02, 0.06);
  });
  bus.on('aura_pulse', (ev) => {
    if (ev.skill !== 'crimson_edge') return;
    if ((ev.hit || []).length) mark('skill:crimson_edge');
    const st = vfxClassStyle('swordsman');
    for (const id of ev.hit || []) {
      const e = byId(id);
      if (!e) continue;
      // A single crimson flick with a silver edge, and a drop of light.
      const a = rnd(0, TAU);
      kit.slash({ x: e.x, z: e.z, angle: a, radius: 0.45, width: 0.1, span: 2.0, sweep: 0.04, life: 0.2, core: st.second, glow: st.glow, soft: 0.1, lift: 0.12, y: 0.55, gain: 1.4, tail: 0.8 });
      kit.flash({ x: e.x, y: 0.55, z: e.z, color: st.glow, size: 0.32, life: 0.12 });
      spray('spark', e.x, 0.55, e.z, 3, { color: st.second, speed: [1.2, 2.2], up: [0.3, 0.9], size: [0.03, 0.06], life: [0.14, 0.24] });
    }
  });
  // A Hunter's Mark arrow lands: a jade target rune locks onto the enemy.
  bus.on('hit', (ev) => {
    if (ev.source !== 'hunters_mark') return;
    const st = vfxClassStyle('archer');
    const t = byId(ev.target);
    const x = t?.x ?? ev.x;
    const z = t?.z ?? ev.z;
    if (x == null) return;
    mark('skill:hunters_mark:hit');
    kit.ring({ x, z, r0: 1.0, r1: 0.42, width: 0.06, life: 0.3, core: PARCH, glow: st.glow, soft: 0.2, y: 0.06 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      kit.streak({ a: { x: x + Math.cos(a) * 0.75, y: 0.08, z: z + Math.sin(a) * 0.75 }, b: { x: x + Math.cos(a) * 0.45, y: 0.08, z: z + Math.sin(a) * 0.45 }, width: 0.06, tailW: 0, core: PARCH, glow: st.glow, life: 0.6, fall: 0.6 });
    }
    flare(x, 0.6, z, st.glow, 1.0, { life: 0.2 });
  });
  // The Healer's two: Lantern Ward lights a lantern over each ward; Dawn
  // Brand burns a sun sigil into the floor that flares on every tick.
  bus.on('skill_cast', (ev) => {
    if (ev.skill === 'lantern_ward' && Array.isArray(ev.targets)) {
      const st = vfxClassStyle('healer');
      mark('skill:lantern_ward');
      const p = player();
      if (p) {
        kit.ring({ x: p.x, z: p.z, r0: 0.3, r1: 3.8, width: 0.08, life: 0.5, core: PARCH, glow: st.glow, soft: 0.8, y: 0.05, opacity: 0.6 });
        flare(p.x, 0.9, p.z, st.glow, 1.2, { kind: 'burst', life: 0.28 });
      }
      for (const id of ev.targets) {
        const t = byId(id);
        if (!t) continue;
        if (p) kit.streak({ a: { x: p.x, y: 0.9, z: p.z }, b: { x: t.x, y: 1.0, z: t.z }, width: 0.05, tailW: 0.08, core: PARCH, glow: st.glow, life: 0.26, fall: 1.2 });
        kit.ring({ x: t.x, z: t.z, r0: 0.2, r1: 0.65, width: 0.07, life: 0.55, core: PARCH, glow: st.glow, soft: 0.6, y: 1.25, delay: 0.1 });
        kit.flash({ x: t.x, y: 1.25, z: t.z, color: st.glow, size: 0.5, life: 0.3, delay: 0.1 });
        embersUp(t.x, t.z, st.glow, 5, { radius: 0.3, life: [0.8, 1.3] });
      }
    }
  });
  const dawnZones = new Set();
  bus.on('zone_spawn', (ev) => {
    if (ev.skill !== 'dawn_brand') return;
    dawnZones.add(ev.id);
    mark('zone:dawn_brand');
    const st = vfxClassStyle('healer');
    const { x, z } = ev;
    const r = ev.radius ?? 1.2;
    anticipate(x, z, r * 0.8, st.glow, { y: 0.15, lines: 8 });
    after(ANTICIP, () => {
      kit.ring({ x, z, r0: 0.2, r1: r, width: 0.1, life: 0.5, core: PARCH, glow: st.glow, soft: 0.4, y: 0.05 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        kit.streak({ a: { x: x + Math.cos(a) * r * 0.25, y: 0.06, z: z + Math.sin(a) * r * 0.25 }, b: { x: x + Math.cos(a) * r * 0.95, y: 0.06, z: z + Math.sin(a) * r * 0.95 }, width: 0.07, tailW: 0, core: PARCH, glow: st.glow, life: 0.8, fall: 0.6, opacity: 0.8 });
      }
      kit.mark({ x, z, radius: r * 1.4, kind: 'sigil', stain: INK, glow: st.glow, cool: 2.4, life: 4.4, opacity: 0.35 });
      flare(x, 0.4, z, st.glow, 1.3, { kind: 'burst', life: 0.26 });
      kit.light({ x, z, radius: r * 1.6, color: st.glow, opacity: 0.45, life: 0.6 });
    });
  });
  bus.on('zone_tick', (ev) => {
    if (ev.skill !== 'dawn_brand' || !dawnZones.has(ev.id)) return;
    const zEnt = byId(ev.id);
    if (!zEnt) return;
    const st = vfxClassStyle('healer');
    const r = zEnt.radius ?? 1.2;
    kit.ring({ x: zEnt.x, z: zEnt.z, r0: r * 0.3, r1: r, width: 0.06, life: 0.35, core: PARCH, glow: st.glow, soft: 0.4, y: 0.06 });
    embersUp(zEnt.x, zEnt.z, st.glow, 6, { radius: r * 0.7, life: [0.6, 1.0] });
    kit.light({ x: zEnt.x, z: zEnt.z, radius: r * 1.3, color: st.glow, opacity: 0.3, life: 0.35 });
  });
  bus.on('zone_expire', (ev) => dawnZones.delete(ev.id));

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
    // The crow's caw flash and the Millwheel's fan are their own recipes.
    if (owner?.kind !== 'crow' && owner?.kind !== 'millwheel') {
      kit.flash({ x: ev.x, y: ESHOT_Y, z: ev.z, color: EMBER, size: 0.34, life: 0.12 });
      flare(ev.x + (ev.dx ?? 0) * 0.3, ESHOT_Y, ev.z + (ev.dz ?? 0) * 0.3, EMBER, 0.5, { life: 0.12, angle: Math.atan2(ev.dz ?? 0, ev.dx ?? 1) });
    }
  });
  bus.on('enemy_lob', (ev) => {
    const owner = byId(ev.id);
    const kind = byId(ev.glob)?.ownerKind ?? owner?.kind ?? 'toad';
    if (ev.glob != null) globKind.set(ev.glob, kind);
    if (ev.affix) return; // ELITE AFFIXES: no lob, the burst swells in place
    // The spore burst, the seed volley and the grave call are their own recipes.
    if (kind === 'rotcap' || kind === 'thornmother' || kind === 'lichram' || kind === 'geode') return; // (the geode's shards fly off its slam)
    const es = vfxEnemyStyle(owner?.kind ?? 'toad', 'lobber');
    spray('shard', ev.x, 0.55, ev.z, 3, { color: vfxMatterColor(es.matter), tile: SHARD_TILE.drop, speed: [0.4, 1.0], up: [1.2, 2.0], size: [0.1, 0.14], life: [0.4, 0.6], gravity: 6, spin: [-2, 2] });
  });
  bus.on('enemy_glob_land', (ev) => {
    const kind = globKind.get(ev.id);
    globKind.delete(ev.id);
    if (ev.affix) return affixBurst(ev); // ELITE AFFIXES: Molten / Frozen
    if (kind === 'rotcap') {
      sporeCloud(ev.x, ev.z, ev.radius ?? 1.2);
      return;
    }
    if (kind === 'thornmother') return thornRoot(ev.x, ev.z, ev.radius ?? 1.0);
    if (kind === 'lichram') return graveBurst(ev.x, ev.z, ev.radius ?? 1.0);
    if (kind === 'geode' || kind === 'colossus') return crystalShatter(ev.x, ev.z, ev.radius ?? 0.8);
    const owner = byId(ev.owner);
    const es = vfxEnemyStyle(owner?.kind ?? 'toad', 'lobber');
    const matter = vfxMatterColor(es.matter);
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.14, life: 0.4, core: EMBER, glow: EMBER, soft: 0.6, y: 0.04, opacity: 0.55, gain: 0.7 });
    flare(ev.x, 0.3, ev.z, EMBER, 0.9, { kind: 'burst', life: 0.2 });
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
    shock(ev.x, ev.z, 1.0, matter, { life: 0.35, width: 0.12, core: BONE });
    if (ev.cause === 'wall') flare(ev.x, 0.4, ev.z, EMBER, 0.8, { kind: 'burst', life: 0.2 });
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
    flare(ev.x, 0.35, ev.z, EMBER, 1.1, { kind: 'burst', life: 0.22 });
    shock(ev.x, ev.z, 1.3, EMBER, { life: 0.32, width: 0.1, jag: 0.6 });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.3, kind: 'crater', stain: matter, glow: EMBER, cool: 0.6, life: 3.0, opacity: 0.5 });
    spray('chunk', ev.x, 0.3, ev.z, es.chunk || 5, { color: matter, speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.14], life: [0.5, 0.8] });
    spray('spark', ev.x, 0.4, ev.z, 5, { color: PARCH, speed: [1.6, 3.0], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.28] });
  });
  bus.on('enemy_swoop', (ev) => {
    if (ev.etype === 'wasp') return waspDart(ev);
    const es = vfxEnemyStyle(ev.etype, 'flyer');
    spray('smoke', ev.x, 0.9, ev.z, 2, { color: vfxMatterColor(es.matter), speed: [0.2, 0.5], up: [-0.4, -0.1], size: [0.28, 0.4], grow: 1, life: [0.6, 0.9], opacity: 0.3, gravity: 0.3, drag: 2 });
  });
  bus.on('enemy_swoop_end', (ev) => {
    if (ev.etype === 'wasp') return waspDartEnd(ev);
    const es = vfxEnemyStyle(ev.etype, 'flyer');
    const matter = vfxMatterColor(es.matter);
    spray('smoke', ev.x, 0.4, ev.z, es.dust || 3, { color: matter, speed: [0.4, 1.0], up: [0.1, 0.4], size: [0.32, 0.46], grow: 1.3, life: [0.8, 1.2], opacity: 0.3, gravity: 0.15, drag: 2.2 });
    spray('spark', ev.x, 0.5, ev.z, 5, { color: matter, speed: [0.3, 0.8], up: [-0.2, 0.3], size: [0.04, 0.07], life: [0.7, 1.1], gravity: 0.3, drag: 1.5, opacity: 0.6 });
  });
  bus.on('enemy_emerge', (ev) => {
    if (ev.etype === 'lamprey') return lampreyRise(ev);
    const es = vfxEnemyStyle(ev.etype, 'burrower');
    const matter = vfxMatterColor(es.matter);
    kit.crack({ x: ev.x, z: ev.z, radius: 1.0, glow: EMBER, life: 1.2, cool: 0.3 });
    flare(ev.x, 0.3, ev.z, EMBER, 1.0, { kind: 'burst', life: 0.22 });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.4, kind: 'crater', stain: matter, glow: EMBER, cool: 0.5, life: 3.0, opacity: 0.55 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.2, life: 0.4, core: matter, glow: EMBER, soft: 0.5, jag: 0.8, y: 0.04, opacity: 0.7, gain: 0.6 });
    spray('chunk', ev.x, 0.15, ev.z, es.chunk || 6, { color: matter, speed: [0.6, 1.6], up: [2.4, 4.0], size: [0.07, 0.16], life: [0.6, 1.0], jitter: 0.25 });
    spray('smoke', ev.x, 0.2, ev.z, es.dust || 3, { color: matter, speed: [0.5, 1.2], up: [0.4, 0.9], size: [0.36, 0.52], grow: 1.3, life: [0.7, 1.1], opacity: 0.34, gravity: -0.15, drag: 2.4 });
  });
  bus.on('enemy_burrow', (ev) => {
    if (ev.etype === 'lamprey') return lampreyDive(ev);
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
    // Anticipation: a few Ember lines rush into the body as it winds up
    // (the telegraph shape on the floor stays the enemy layer's).
    for (let i = 0; i < 4; i++) {
      const a = rnd(0, TAU);
      kit.streak({ a: { x: e.x + Math.cos(a) * 1.1, y: 0.5, z: e.z + Math.sin(a) * 1.1 }, b: { x: e.x + Math.cos(a) * 0.8, y: 0.5, z: e.z + Math.sin(a) * 0.8 }, width: 0.04, tailW: 0, core: PARCH, glow: EMBER, life: 0.14, delay: i * 0.03, travel: { x: -Math.cos(a) * 5, y: 0, z: -Math.sin(a) * 5 }, fall: 1.2, opacity: 0.8 });
    }
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
    flare(ev.x, 0.6, ev.z, bs.corruption, 2.6, { kind: 'burst', life: 0.32, core: bs.peak });
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
    const b = byId(ev.id);
    const t = byId(ev.target);
    const bs = vfxBossStyle(b?.kind ?? 'stag');
    const ang = t ? Math.atan2(t.z - ev.z, t.x - ev.x) : 0;
    kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 1.5, width: 0.42, span: 1.5, sweep: 0.09, life: 0.4, core: bs.peak, glow: bs.corruption, soft: 0.4, jag: 0.5, lift: 0.05, y: 0.25 });
    kit.crack({ x: ev.x + Math.cos(ang) * 0.8, z: ev.z + Math.sin(ang) * 0.8, radius: 0.9, glow: bs.corruption, life: 1.2, cool: 0.4 });
    flare(ev.x + Math.cos(ang) * 0.9, 0.4, ev.z + Math.sin(ang) * 0.9, bs.corruption, 1.4, { kind: 'burst', life: 0.24, core: bs.peak });
    kit.mark({ x: ev.x + Math.cos(ang) * 0.9, z: ev.z + Math.sin(ang) * 0.9, radius: 1.3, kind: 'gouge', angle: ang, stretch: 1.6, stain: vfxMatterColor(bs.matter), glow: bs.corruption, cool: 0.7, life: 3, opacity: 0.5 });
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
    flare(x, 1.0, z, bs.corruption, 3.2, { kind: 'burst', life: 0.45, core: bs.peak, spin: 0.8 });
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
    flare(x, 0.55, z, SPORE, 0.9, { kind: 'burst', life: 0.22 });
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
    flare(x, 0.3, z, EMBER, 1.0, { kind: 'burst', life: 0.2, core: SPORE });
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
    flare(x, LANTERN_Y, z, TELL_INDIGO_GLOW, 1.0, { kind: 'burst', life: 0.3 });
    kit.mark({ x, z, radius: r * 0.9, kind: 'sigil', stain: INK, glow: TELL_INDIGO_GLOW, cool: 1.0, life: 1.5, opacity: 0.1 });
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
    flare(bx, 0.55, bz, EMBER, 0.8, { life: 0.16, angle: base });
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
    flare(x + d.x * 0.6, 0.75, z + d.z * 0.6, HERON.corruption, 1.4, { life: 0.22, core: HERON.peak, angle: Math.atan2(d.z, d.x) });
    // Wet stains laid down the lane as the drive passes over them.
    for (let i = 1; i <= 3; i++) kit.mark({ x: x + d.x * len * (i / 3.5), z: z + d.z * len * (i / 3.5), radius: 1.3, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.35, cool: 0.6, life: 2.8, opacity: 0.4, delay: (len * (i / 3.5)) / 11 });
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
    flare(t.x, 0.55, t.z, HERON.corruption, 1.5, { kind: 'burst', life: 0.24, core: HERON.peak });
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
    flare(x, 1.2, z, HERON.corruption, 1.8, { kind: 'burst', life: 0.26, core: HERON.peak });
    kit.mark({ x, z, radius: r * 1.6, kind: 'splash', stain: SILT, glow: null, life: 3, opacity: 0.35 });
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
    kit.mark({ x, z, radius: 2.4, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.3, cool: 0.8, life: 4, opacity: 0.45 });
  });
  bus.on('boss_surface', (ev) => {
    mark('heron_surface');
    const { x, z } = ev;
    const g = HERON.geyser;
    kit.pillar({ x, z, radius: 0.7, height: g.height, color: WATER, life: 0.8, opacity: 0.55 });
    kit.pillar({ x, z, radius: 0.3, height: g.height * 1.1, color: HERON.corruption, life: 0.7, opacity: 0.6 });
    kit.flash({ x, y: 1.6, z, color: HERON.peak, size: 1.4, life: 0.32, hold: 0.08 });
    flare(x, 1.2, z, HERON.corruption, 2.4, { kind: 'burst', life: 0.32, core: HERON.peak });
    kit.mark({ x, z, radius: 2.6, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.35, cool: 1.0, life: 4, opacity: 0.45 });
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
    flare(x, 1.0, z, HERON.corruption, 3.2, { kind: 'burst', life: 0.45, core: HERON.peak, spin: 0.8 });
    kit.mark({ x, z, radius: 3.4, kind: 'splash', stain: SILT, glow: WATER, glowOpacity: 0.4, cool: 1.5, life: 6, opacity: 0.5 });
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
    flare(x + d.x * 0.5, 0.6, z + d.z * 0.5, EMBER, 1.6, { kind: 'burst', life: 0.24, core: WYRM.peak });
    // The breath scorches the cone: burns that cool from Ember to ash.
    for (let i = 0; i < 4; i++) {
      const a = base + (i - 1.5) * half * 0.45;
      const r = R * (i % 2 ? 0.45 : 0.72);
      kit.mark({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, radius: 1.5, kind: 'scorch', stain: INK, glow: EMBER, cool: 1.1, life: 3.6, opacity: 0.55, delay: 0.04 + i * 0.03 });
    }
    camfx.kick(d.x, d.z, WYRM.camera.kick * 0.6, 0.16);
  });
  function moundBurst(x, z, big) {
    const e = WYRM.erupt;
    flare(x, 0.4, z, big ? EMBER : WYRM.corruption, big ? 2.2 : 1.2, { kind: 'burst', life: big ? 0.3 : 0.22, core: WYRM.peak });
    kit.mark({ x, z, radius: big ? 3 : 1.8, kind: 'crater', stain: EARTH, glow: big ? EMBER : WYRM.corruption, cool: big ? 1.3 : 0.8, life: big ? 4.5 : 3, opacity: 0.6 });
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
    if (byId(ev.id)?.kind === 'lichram') return lichEnrage(ev);
    if (byId(ev.id)?.kind === 'colossus') return colossusEnrage(ev);
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
    flare(x, 1.0, z, WYRM.corruption, 3.2, { kind: 'burst', life: 0.45, core: WYRM.peak, spin: 0.8 });
    kit.mark({ x, z, radius: 3.4, kind: 'crater', stain: INK, glow: WYRM.corruption, cool: 2.0, life: 6, opacity: 0.6 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: WYRM.peak, glow: WYRM.corruption, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 2.4, glow: WYRM.corruption, life: 3, cool: 1.2 });
    spray('smoke', x, 0.4, z, 14, { color: CINDER, speed: [0.3, 1.0], up: [0.5, 1.2], size: [0.5, 0.72], grow: 1.6, life: [1.6, 2.2], opacity: 0.42, gravity: -0.3, drag: 2.0, jitter: 1.2 });
    spray('chunk', x, 0.4, z, 16, { color: EARTH, speed: [1.0, 2.6], up: [1.8, 3.6], size: [0.08, 0.17], life: [0.8, 1.2], jitter: 0.8 });
    spray('spark', x, 0.4, z, 30, { color: WYRM.corruption, speed: [0.3, 1.2], up: [0.8, 2.0], size: [0.06, 0.13], life: [1.4, 2.2], gravity: -0.3, drag: 1.2, jitter: 1.0 });
    spray('spark', x, 0.3, z, 16, { color: EMBER, speed: [0.2, 0.8], up: [1.0, 2.2], size: [0.04, 0.08], life: [0.8, 1.3], gravity: -0.25, drag: 1.3, jitter: 1.0 });
    kit.light({ x, z, radius: 4, color: WYRM.corruption, opacity: 0.6, life: 1.4 });
    camfx.dolly(x, z, WYRM.camera.dolly, 0.5);
  }

  // ------------------------------------------------- content slice 2 --
  // (docs/CONTENT_PLAN.md §2.4 / §3, design-VFX.md §5c / §6c) The six
  // slice-2 enemies and each act's second boss, built to the AAA layering
  // above: anticipation drawn in, a white-hot landing frame, a shockwave
  // and a ground mark that cools. Same law: Ember only on the threat itself,
  // the body's own matter on what breaks, indigo for a rank-and-file ward,
  // violet for a boss; no camera on rank-and-file enemies.
  const BRAMBLE = vfxMatterColor('bramble');
  const WASP = vfxMatterColor('wasp');
  const CARAPACE = vfxMatterColor('carapace');
  const EEL = vfxMatterColor('eel');
  const WISP = vfxMatterColor('wisp');
  const BONEPLATE = vfxMatterColor('boneplate');
  const IRON = vfxMatterColor('iron');
  const OAK = vfxMatterColor('oak');
  const DIRT = vfxMatterColor('dirt');
  const faceOf = (e, fx = 0, fz = 1) => unit2(e?.faceX ?? fx, e?.faceZ ?? fz);
  // Thorns punching up out of the floor: short slanted streaks from the
  // ground to a tip, snapping in and falling back.
  function spikes(x, z, radius, n, color, { h = 0.55, delay = 0, life = 0.45, core = BONE } = {}) {
    for (let i = 0; i < N(n); i++) {
      const a = (i / n) * TAU + rnd(-0.3, 0.3);
      const r = radius * Math.sqrt(rnd(0.15, 1));
      const bx = x + Math.cos(a) * r;
      const bz = z + Math.sin(a) * r;
      const lean = rnd(0.1, 0.3);
      kit.streak({ a: { x: bx, y: 0.02, z: bz }, b: { x: bx + Math.cos(a) * lean, y: h * rnd(0.7, 1.2), z: bz + Math.sin(a) * lean }, width: 0.07, tailW: 0, core, glow: color, life, delay: delay + rnd(0, 0.06), fall: 2.2, opacity: 0.95 });
    }
  }
  // A body driving down a lane: a floor wake laid at the drive's own speed,
  // a spearhead running down it, and stains dropped as it passes.
  function laneDrive(x, z, d, len, speed, { wake, wakeW = 0.5, head, peak, stain, glow = null, marks = 3, markKind = 'gouge' }) {
    const sweep = len / speed;
    kit.streak({ a: { x, y: 0.06, z }, b: { x: x + d.x * len, y: 0.06, z: z + d.z * len }, width: wakeW, tailW: 0.35, core: wake, glow: wake, life: sweep + 0.5, fall: 0.8, opacity: 0.45 });
    kit.streak({ a: { x, y: 0.6, z }, b: { x: x + d.x * 0.9, y: 0.6, z: z + d.z * 0.9 }, width: 0.08, tailW: 0.55, core: PARCH, glow: head, life: sweep, travel: { x: d.x * speed, y: 0, z: d.z * speed }, fall: 0.4 });
    flare(x + d.x * 0.6, 0.6, z + d.z * 0.6, head, 1.3, { life: 0.2, core: peak, angle: Math.atan2(d.z, d.x) });
    for (let i = 1; i <= marks; i++) {
      const k = i / (marks + 0.5);
      kit.mark({ x: x + d.x * len * k, z: z + d.z * len * k, radius: 1.1, kind: markKind, angle: Math.atan2(d.z, d.x), stretch: 1.8, stain, glow, glowOpacity: 0.35, cool: 0.6, life: 2.8, opacity: 0.42, delay: (len * k) / speed });
    }
  }

  // Briar Wasp — "a string of stings". Each dart is a thin Ember needle that
  // runs the short lane at the dart's own speed with an ochre buzz of wing
  // dust behind it; a swarm reads as three quick stitches, never the moth's
  // one long smear.
  function waspDart(ev) {
    mark('wasp_dart');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 3.6;
    const ang = Math.atan2(d.z, d.x);
    anticipate(ev.x, ev.z, 0.45, EMBER, { y: 0.9, lines: 4 });
    kit.streak({ a: { x: ev.x, y: 0.9, z: ev.z }, b: { x: ev.x + d.x * 0.5, y: 0.85, z: ev.z + d.z * 0.5 }, width: 0.05, tailW: 0.3, core: PARCH, glow: EMBER, life: len / 9, travel: { x: d.x * 9, y: -0.1, z: d.z * 9 }, fall: 0.6 });
    kit.streak({ a: { x: ev.x, y: 0.88, z: ev.z }, b: { x: ev.x + d.x * len, y: 0.7, z: ev.z + d.z * len }, width: 0.035, tailW: 0, core: WASP, glow: WASP, life: len / 9 + 0.35, fall: 1.4, opacity: 0.5 });
    flare(ev.x + d.x * 0.3, 0.9, ev.z + d.z * 0.3, EMBER, 0.6, { life: 0.12, angle: ang });
    spray('spark', ev.x, 0.9, ev.z, 5, { color: WASP, speed: [0.2, 0.6], up: [-0.3, 0.2], size: [0.03, 0.06], life: [0.5, 0.8], gravity: 0.4, drag: 1.6, jitter: 0.2, opacity: 0.7, dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
  }
  function waspDartEnd(ev) {
    mark('wasp_dart_end');
    flare(ev.x, 0.6, ev.z, EMBER, 0.5, { kind: 'burst', life: 0.12 });
    spray('spark', ev.x, 0.6, ev.z, 4, { color: WASP, speed: [0.3, 0.8], up: [0.0, 0.4], size: [0.03, 0.06], life: [0.4, 0.7], gravity: 0.3, drag: 1.6, opacity: 0.7 });
  }

  // Thornling — "it plants a thicket". The planting is a little eruption of
  // brambles at its feet with the hazard's edge drawn thin in Ember; every
  // prick makes each of its live patches bristle.
  bus.on('thorn_plant', (ev) => {
    mark('thorn_plant');
    const r = ev.radius ?? 1.0;
    anticipate(ev.x, ev.z, r * 0.6, BRAMBLE, { y: 0.2, lines: 5, core: BONE });
    after(ANTICIP, () => {
      kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: r, width: 0.06, life: 0.4, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.7, gain: 0.7 });
      shock(ev.x, ev.z, r * 1.2, BRAMBLE, { life: 0.35, width: 0.12, core: BONE, jag: 0.7 });
      spikes(ev.x, ev.z, r * 0.9, 7, BRAMBLE, { h: 0.5 });
      flare(ev.x, 0.3, ev.z, BRAMBLE, 0.8, { kind: 'burst', life: 0.2, core: BONE });
      kit.mark({ x: ev.x, z: ev.z, radius: r * 1.4, kind: 'scorch', stain: BRAMBLE, glow: null, life: 4, opacity: 0.4 });
      spray('shard', ev.x, 0.2, ev.z, 6, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.6, 1.4], up: [1.2, 2.2], size: [0.09, 0.13], life: [0.5, 0.8], gravity: 5, spin: [-8, 8], jitter: r * 0.5 });
      spray('chunk', ev.x, 0.15, ev.z, 4, { color: DIRT, speed: [0.4, 1.0], up: [1.2, 2.0], size: [0.05, 0.1], life: [0.4, 0.7], jitter: r * 0.4 });
    });
  });
  bus.on('thorn_prick', (ev) => {
    mark('thorn_prick');
    const t = byId(ev.id);
    for (const pid of t?.patchIds || []) {
      const p = byId(pid);
      if (!p) continue;
      spikes(p.x, p.z, p.radius ?? 1, 4, BRAMBLE, { h: 0.4, life: 0.3 });
      spray('spark', p.x, 0.2, p.z, 3, { color: EMBER, speed: [0.2, 0.5], up: [0.6, 1.0], size: [0.03, 0.06], life: [0.2, 0.35], jitter: (p.radius ?? 1) * 0.6 });
    }
  });

  // Weir Crab — "the claws come down". Two short claw arcs scissor shut
  // across the cone with a white-hot pinch where they meet, weir water
  // thrown off the shell.
  bus.on('crab_snap', (ev) => {
    mark('crab_snap');
    const c = byId(ev.id);
    const d = faceOf(c);
    const ang = Math.atan2(d.z, d.x);
    const tipX = ev.x + d.x * 1.0;
    const tipZ = ev.z + d.z * 1.0;
    for (const s of [-1, 1]) kit.slash({ x: ev.x + -d.z * 0.35 * s, z: ev.z + d.x * 0.35 * s, angle: ang - s * 0.45, radius: 1.0, width: 0.18, span: 0.9, sweep: 0.06, life: 0.24, core: PARCH, glow: EMBER, soft: 0.3, jag: 0.3, lift: 0.04, y: 0.3, gain: 0.9 });
    flare(tipX, 0.35, tipZ, EMBER, 0.95, { kind: 'star', life: 0.18, angle: ang });
    shock(tipX, tipZ, 0.9, CARAPACE, { life: 0.28, width: 0.1, core: BONE });
    kit.mark({ x: tipX, z: tipZ, radius: 0.9, kind: 'splash', stain: vfxMatterColor('water'), glow: null, life: 2.4, opacity: 0.35 });
    spray('shard', tipX, 0.35, tipZ, 6, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.09, 0.13], life: [0.35, 0.6], gravity: 7, drag: 0.4, spin: [-2, 2], dir: d, dirBias: 0.5 });
    spray('spark', tipX, 0.4, tipZ, 4, { color: PARCH, speed: [1.2, 2.4], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.12, 0.22] });
  });

  // Bog Lamprey — "it comes out of the water". It breaks the surface in a
  // ring of foam, the lunge is a water wake ripping down the lane at 10 u/s
  // with a bite at its head, and the beaching is a slap of silt and spray.
  function lampreyRise(ev) {
    mark('lamprey_rise');
    kit.ring({ x: ev.x, z: ev.z, r0: 0.2, r1: 1.0, width: 0.14, life: 0.45, core: vfxMatterColor('water'), glow: vfxMatterColor('water'), soft: 0.8, y: 0.04, opacity: 0.65 });
    ripples(ev.x, ev.z, 2, 1.1, 0.05);
    spray('shard', ev.x, 0.2, ev.z, 8, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.5, 1.2], up: [1.6, 2.6], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2], jitter: 0.2 });
    kit.flash({ x: ev.x, y: 0.3, z: ev.z, color: EMBER, size: 0.35, life: 0.12 });
  }
  function lampreyDive(ev) {
    mark('lamprey_dive');
    kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: 0.9, width: 0.12, life: 0.4, core: vfxMatterColor('water'), glow: vfxMatterColor('water'), soft: 0.8, y: 0.04, opacity: 0.55 });
    ripples(ev.x, ev.z, 2, 0.9, 0.1);
    spray('shard', ev.x, 0.15, ev.z, 5, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.4, 1.0], up: [1.0, 1.8], size: [0.08, 0.12], life: [0.4, 0.6], gravity: 7, drag: 0.3 });
  }
  bus.on('lamprey_lunge', (ev) => {
    mark('lamprey_lunge');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 5;
    laneDrive(ev.x, ev.z, d, len, 10, { wake: vfxMatterColor('water'), wakeW: 0.45, head: EMBER, peak: PARCH, stain: SILT, glow: vfxMatterColor('water'), marks: 2, markKind: 'splash' });
    spray('shard', ev.x, 0.2, ev.z, 8, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [1.0, 2.2], up: [1.2, 2.2], size: [0.09, 0.14], life: [0.4, 0.7], gravity: 7, drag: 0.4, spin: [-2, 2], dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
  });
  bus.on('lamprey_beach', (ev) => {
    mark('lamprey_beach');
    flare(ev.x, 0.3, ev.z, EMBER, 0.8, { kind: 'burst', life: 0.18 });
    shock(ev.x, ev.z, 1.1, EEL, { life: 0.32, width: 0.12, core: vfxMatterColor('water') });
    kit.mark({ x: ev.x, z: ev.z, radius: 1.3, kind: 'splash', stain: SILT, glow: null, life: 3.2, opacity: 0.45 });
    spray('shard', ev.x, 0.3, ev.z, 10, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [1.4, 2.4], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2] });
    spray('chunk', ev.x, 0.2, ev.z, 4, { color: SILT, speed: [0.6, 1.2], up: [1.0, 1.8], size: [0.05, 0.1], life: [0.4, 0.7] });
  });

  // Grave Wisp — "it wards its friend". The tether takes with an indigo
  // flare at the wisp and a ward ring closing on the body it protects;
  // while it holds, motes run down the thread and the ward shimmers; a hit
  // the ward eats glints indigo; the snap scatters the thread.
  bus.on('wisp_tether', (ev) => {
    mark('wisp_tether');
    const w = byId(ev.id);
    const t = byId(ev.target);
    const tx = t?.x ?? ev.x;
    const tz = t?.z ?? ev.z;
    if (w) {
      flare(w.x, 0.9, w.z, TELL_INDIGO_GLOW, 0.9, { kind: 'burst', life: 0.24 });
      kit.streak({ a: { x: w.x, y: 0.9, z: w.z }, b: { x: tx, y: 0.6, z: tz }, width: 0.06, tailW: 0.06, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, life: 0.45, fall: 1.2, opacity: 0.85 });
    }
    kit.ring({ x: tx, z: tz, r0: 1.4, r1: 0.5, width: 0.1, life: 0.4, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, soft: 0.5, y: 0.06 });
    kit.mark({ x: tx, z: tz, radius: 1.0, kind: 'sigil', stain: INK, glow: TELL_INDIGO_GLOW, cool: 1.0, life: 1.6, opacity: 0.12 });
    kit.light({ x: tx, z: tz, radius: 1.4, color: TELL_INDIGO_GLOW, opacity: 0.35, life: 0.5 });
  });
  bus.on('wisp_tether_end', (ev) => {
    mark('wisp_tether_snap');
    const w = byId(ev.id);
    const t = byId(ev.target);
    if (!w && !t) return;
    const mx = ((w?.x ?? t.x) + (t?.x ?? w.x)) / 2;
    const mz = ((w?.z ?? t.z) + (t?.z ?? w.z)) / 2;
    kit.flash({ x: mx, y: 0.75, z: mz, color: TELL_INDIGO_GLOW, size: 0.45, life: 0.16 });
    spray('spark', mx, 0.75, mz, 8, { color: TELL_INDIGO_GLOW, speed: [0.6, 1.4], up: [0.0, 0.6], size: [0.04, 0.07], life: [0.3, 0.6], drag: 1.4, jitter: 0.5 });
  });
  bus.on('hit_immune', (ev) => {
    const t = byId(ev.target);
    if (!t || t.wardedBy == null) return;
    mark('wisp_ward_block');
    flare(ev.x, 0.55, ev.z, TELL_INDIGO_GLOW, 0.7, { kind: 'burst', life: 0.16 });
    kit.ring({ x: ev.x, z: ev.z, r0: 0.35, r1: 0.8, width: 0.07, life: 0.25, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, soft: 0.4, y: 0.5 });
  });
  function wispFrame(e, rec) {
    const t = byId(e.tetherId);
    if (!t || rec.clock < 0.12) return;
    rec.clock = 0;
    const k = rnd(0, 1);
    spray('spark', e.x + (t.x - e.x) * k, 0.75 + (0.6 - 0.75) * k, e.z + (t.z - e.z) * k, 1, { color: TELL_INDIGO_GLOW, speed: [0.02, 0.1], up: [0.1, 0.3], size: [0.04, 0.07], life: [0.4, 0.6], gravity: -0.2, drag: 1.6, opacity: 0.85 });
    if ((rec.ring = (rec.ring ?? 0) + 1) % 5 === 0) kit.ring({ x: t.x, z: t.z, r0: 0.5, r1: 0.75, width: 0.05, life: 0.5, core: TELL_INDIGO_GLOW, glow: TELL_INDIGO, soft: 0.6, y: 0.3, opacity: 0.6 });
  }

  // Bone Knight — "the overhead blow". The 66-tick wind-up gathers into the
  // raised blade; the slam is a falling Ember blade-line, a white-hot impact
  // star, a jagged ring the size of the telegraph, cracks and bone chips.
  bus.on('knight_slam', (ev) => {
    mark('knight_slam');
    const k = byId(ev.id);
    const r = ev.radius ?? 1.4;
    const d = faceOf(k);
    const sx = k ? k.x : ev.x - d.x * 1.1;
    const sz = k ? k.z : ev.z - d.z * 1.1;
    kit.streak({ a: { x: sx, y: 1.9, z: sz }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 0.12, tailW: 0.4, core: PARCH, glow: EMBER, life: 0.2, fall: 2.0 });
    flare(ev.x, 0.35, ev.z, EMBER, 1.5, { kind: 'star', life: 0.24, angle: Math.atan2(d.z, d.x) });
    kit.flash({ x: ev.x, y: 0.4, z: ev.z, color: PARCH, size: 0.8, life: 0.14 });
    shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.32, width: 0.12, jag: 0.7 });
    shock(ev.x, ev.z, r * 1.4, BONEPLATE, { life: 0.5, width: 0.2, core: BONE, delay: 0.04 });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.8, glow: EMBER, life: 1.4, cool: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.3, kind: 'crater', stain: vfxMatterColor('ash'), glow: EMBER, cool: 0.8, life: 3.4, opacity: 0.55 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.3, color: EMBER, opacity: 0.4, life: 0.35, attack: 0.02 });
    spray('chunk', ev.x, 0.3, ev.z, 7, { color: vfxMatterColor('earth'), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.14], life: [0.5, 0.8], jitter: 0.3 });
    spray('spark', ev.x, 0.4, ev.z, 7, { color: PARCH, speed: [1.6, 3.2], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.3] });
    spray('smoke', ev.x, 0.2, ev.z, 3, { color: vfxMatterColor('ash'), speed: [0.6, 1.2], up: [0.1, 0.4], size: [0.36, 0.5], grow: 1.4, life: [0.7, 1.0], opacity: 0.3, gravity: -0.15, drag: 2.4, jitter: 0.4 });
  });

  // Their deaths, on top of enemyDeath's shared break.
  Object.assign(CREATURE_DEATH, {
    wasp: (es, matter, x, z) => {
      mark('wasp_death');
      spray('shard', x, 0.9, z, 3, { color: PARCH, tile: SHARD_TILE.petal, speed: [0.3, 0.8], up: [0.2, 0.6], size: [0.08, 0.11], life: [0.8, 1.2], gravity: 0.5, drag: 1.8, spin: [-6, 6], flutter: 0.6, opacity: 0.6 });
      spray('spark', x, 0.9, z, 6, { color: WASP, speed: [0.3, 0.9], up: [0.0, 0.5], size: [0.03, 0.06], life: [0.5, 0.9], gravity: 0.6, drag: 1.4 });
    },
    thornling: (es, matter, x, z) => {
      mark('thornling_death');
      spikes(x, z, 0.5, 5, BRAMBLE, { h: 0.45, life: 0.35 });
      spray('shard', x, 0.35, z, 6, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.8, 1.6], up: [1.0, 1.8], size: [0.09, 0.13], life: [0.5, 0.8], gravity: 5, spin: [-8, 8] });
      spray('shard', x, 0.4, z, 3, { color: BRAMBLE, tile: SHARD_TILE.petal, speed: [0.2, 0.6], up: [0.4, 0.8], size: [0.09, 0.12], life: [1.0, 1.4], gravity: 0.6, drag: 1.8, spin: [-4, 4], flutter: 0.5 });
    },
    crab: (es, matter, x, z) => {
      mark('crab_death');
      spray('chunk', x, 0.35, z, 5, { color: CARAPACE, speed: [1.0, 2.0], up: [1.2, 2.2], size: [0.08, 0.14], life: [0.5, 0.8] });
      spray('shard', x, 0.3, z, 6, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.6, 1.4], up: [1.0, 1.8], size: [0.08, 0.12], life: [0.4, 0.6], gravity: 7, drag: 0.4 });
    },
    lamprey: (es, matter, x, z) => {
      mark('lamprey_death');
      ripples(x, z, 3, 1.2, 0);
      spray('shard', x, 0.3, z, 10, { color: vfxMatterColor('water'), tile: SHARD_TILE.drop, speed: [0.8, 1.8], up: [1.6, 2.8], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 7, drag: 0.3, spin: [-2, 2] });
    },
    gravewisp: (es, matter, x, z) => {
      // The ward light gutters out: an indigo pop and the grave mist sinks.
      mark('gravewisp_death');
      flare(x, 0.9, z, TELL_INDIGO_GLOW, 1.0, { kind: 'burst', life: 0.26 });
      kit.light({ x, z, radius: 1.4, color: TELL_INDIGO_GLOW, opacity: 0.45, life: 0.4 });
      shock(x, z, 1.3, TELL_INDIGO, { life: 0.4, width: 0.08, core: TELL_INDIGO_GLOW, y: 0.6 });
      spray('smoke', x, 0.9, z, 4, { color: WISP, speed: [0.2, 0.6], up: [-0.4, -0.1], size: [0.34, 0.48], grow: 1.5, life: [1.0, 1.4], opacity: 0.35, gravity: 0.25, drag: 2.2, jitter: 0.3 });
      spray('spark', x, 0.9, z, 10, { color: TELL_INDIGO_GLOW, speed: [0.4, 1.2], up: [0.2, 0.8], size: [0.04, 0.08], life: [0.6, 1.0], drag: 1.3 });
    },
    knight: (es, matter, x, z) => {
      // The armour falls apart: bone plates, the shield's iron, the crown's
      // last flash.
      mark('knight_death');
      flare(x, 1.3, z, PALETTE.hearthAmber, 0.9, { kind: 'star', life: 0.24 });
      spray('chunk', x, 0.5, z, 8, { color: BONEPLATE, speed: [1.0, 2.2], up: [1.4, 2.6], size: [0.09, 0.16], life: [0.6, 0.9] });
      spray('chunk', x, 0.5, z, 4, { color: IRON, speed: [0.8, 1.6], up: [1.2, 2.0], size: [0.1, 0.16], life: [0.6, 0.9] });
      spray('spark', x, 0.6, z, 8, { color: PARCH, speed: [1.4, 2.8], up: [0.6, 1.4], size: [0.04, 0.07], life: [0.15, 0.3] });
      kit.mark({ x, z, radius: 1.2, kind: 'crater', stain: vfxMatterColor('ash'), glow: null, life: 3.5, opacity: 0.4 });
    },
  });

  // ------------------------------------------------- the Hollow Heart --
  // Act IV (docs/ACT_IV.md). Down here the violet is the creatures' body, so
  // their beats wear it — but the law holds: whatever HURTS is Ember on the
  // frame it lands (the lance's edge, the slam ring, a shard's ring), the
  // violet only says what it was made of. No camera on rank-and-file.
  const HV = vfxMatterColor('heartvein');
  const HVP = vfxMatterColor('heartpeak');
  const CRYSTAL = vfxMatterColor('heartcrystal');
  const HFLESH = vfxMatterColor('heartflesh');
  const HBONE = vfxMatterColor('heartbone');
  const ROSE = vfxMatterColor('heartrose');
  const CENSER_Y = 1.25;

  // Hollow Husk — "the room's heart beats". Every husk surges on the same
  // tick, so this stays tiny per body (a vein flash at the chest and a scuff
  // of dust behind the feet) and drops the flash past the first few husks of
  // a beat: the rigs' own vein flare carries the rest.
  let surgeTick = -1;
  let surgeCount = 0;
  bus.on('husk_surge', (ev) => {
    mark('husk_surge');
    if (ev.tick !== surgeTick) {
      surgeTick = ev.tick;
      surgeCount = 0;
    }
    surgeCount += 1;
    const h = byId(ev.id);
    const d = faceOf(h);
    if (surgeCount <= 4) kit.flash({ x: ev.x + d.x * 0.15, y: 0.75, z: ev.z + d.z * 0.15, color: HV, size: 0.55, life: 0.18, opacity: 0.8 });
    if (surgeCount <= 8) spray('smoke', ev.x - d.x * 0.2, 0.1, ev.z - d.z * 0.2, 1, { color: HFLESH, speed: [0.3, 0.6], up: [0.1, 0.3], size: [0.22, 0.32], grow: 1.1, life: [0.35, 0.55], opacity: 0.28, gravity: -0.1, drag: 2.6, dir: { x: -d.x, z: -d.z }, dirBias: 0.7 });
    spray('spark', ev.x, 0.7, ev.z, 1, { color: HV, speed: [0.1, 0.3], up: [0.4, 0.8], size: [0.04, 0.07], life: [0.3, 0.5], gravity: -0.2, drag: 1.5, jitter: 0.15, opacity: 0.9 });
  });

  // Vein Lancer — "the lance". The lane IS the attack, so the release fills
  // it at once: a violet-cored beam from the lancer to the lane's end, a
  // white-hot head running down it, an Ember edge that flashes the full
  // width (that is what hit you), sparks thrown off along it and a scorched
  // line burned into the floor that cools from Ember to violet.
  bus.on('lancer_lance', (ev) => {
    mark('lancer_lance');
    const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
    const len = ev.length ?? 7;
    const w = ev.width ?? 0.8;
    const ang = Math.atan2(d.z, d.x);
    const ox = ev.x + d.x * 0.35;
    const oz = ev.z + d.z * 0.35;
    const ex = ev.x + d.x * len;
    const ez = ev.z + d.z * len;
    const SPEED = 34; // u/s — the head crosses a full lane in ~0.2 s
    const sweep = len / SPEED;
    // Release at the hand.
    flare(ox, 0.95, oz, HV, 1.2, { life: 0.2, core: HVP, angle: ang });
    kit.flash({ x: ox, y: 0.95, z: oz, color: HVP, size: 0.7, life: 0.12 });
    // The Ember edge: the full lane width, hot for a blink (the hit).
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: w, tailW: w * 0.85, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.55 });
    // The violet beam with its pale core.
    kit.streak({ a: { x: ox, y: 0.7, z: oz }, b: { x: ex, y: 0.6, z: ez }, width: 0.26, tailW: 0.16, core: HVP, glow: HV, life: sweep + 0.4, fall: 1.3, opacity: 1 });
    // The head: a short white-hot dart running the lane.
    kit.streak({ a: { x: ox, y: 0.68, z: oz }, b: { x: ox + d.x * 0.9, y: 0.66, z: oz + d.z * 0.9 }, width: 0.12, tailW: 0.4, core: PARCH, glow: HV, life: sweep, travel: { x: d.x * SPEED, y: -0.2, z: d.z * SPEED }, fall: 0.3 });
    // Where it stops: a violet star over an Ember burst.
    after(sweep, () => {
      flare(ex, 0.55, ez, HV, 1.0, { kind: 'burst', life: 0.22, core: HVP });
      kit.flash({ x: ex, y: 0.5, z: ez, color: EMBER, size: 0.5, life: 0.12 });
      spray('shard', ex, 0.5, ez, 4, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [0.8, 1.8], up: [0.6, 1.4], size: [0.09, 0.13], life: [0.4, 0.7], gravity: 4, spin: [-8, 8], dir: d, dirBias: 0.4 });
    });
    // Sparks off the lane edges and the scorched line it leaves.
    const steps = Math.max(2, Math.round(len / 1.6));
    for (let i = 0; i < steps; i++) {
      const k = (i + 0.5) / steps;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      const side = i % 2 ? 1 : -1;
      after(sweep * k, () => spray('spark', px, 0.5, pz, 2, { color: i % 2 ? EMBER : HV, speed: [1.0, 2.2], up: [0.5, 1.2], size: [0.03, 0.06], life: [0.2, 0.4], dir: { x: -d.z * side + d.x * 0.5, z: d.x * side + d.z * 0.5 }, dirBias: 0.7 }));
    }
    const marks = Math.max(2, Math.min(4, Math.round(len / 2)));
    for (let i = 1; i <= marks; i++) {
      const k = (i - 0.5) / marks;
      kit.mark({ x: ev.x + d.x * len * k, z: ev.z + d.z * len * k, radius: (len / marks) * 0.62, kind: 'gouge', angle: ang, stretch: 2.2, stain: INK, glow: EMBER, glowOpacity: 0.4, cool: 0.5, life: 2.6, opacity: 0.4, delay: sweep * k });
    }
    kit.light({ x: (ev.x + ex) / 2, z: (ev.z + ez) / 2, radius: Math.min(2.4, len * 0.35), color: HV, opacity: 0.3, life: 0.3, attack: 0.02 });
    // The vein-spear reforms in the lancer's hand (the rig regrows it).
    after(0.3, () => spray('spark', ev.x, 0.9, ev.z, 4, { color: HV, speed: [0.05, 0.2], up: [0.2, 0.6], size: [0.04, 0.07], life: [0.4, 0.6], gravity: -0.3, drag: 1.6, jitter: 0.2, opacity: 0.9 }));
  });

  // Geode Brute — "the crystal slam". The fists land in an Ember ring (the
  // hit) that cracks into a burst of violet crystal punched up through the
  // floor; stone and crystal chips fly. The three shards it throws are
  // their own recipe when they land (crystalShatter).
  bus.on('geode_slam', (ev) => {
    mark('geode_slam');
    const r = ev.radius ?? 1.5;
    const g = byId(ev.id);
    const d = faceOf(g);
    const sx = g ? g.x : ev.x - d.x * 0.9;
    const sz = g ? g.z : ev.z - d.z * 0.9;
    kit.streak({ a: { x: sx + d.x * 0.3, y: 1.8, z: sz + d.z * 0.3 }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 0.18, tailW: 0.45, core: PARCH, glow: EMBER, life: 0.16, fall: 2.2 });
    flare(ev.x, 0.35, ev.z, EMBER, 1.5, { kind: 'burst', life: 0.24 });
    kit.flash({ x: ev.x, y: 0.4, z: ev.z, color: PARCH, size: 0.85, life: 0.14 });
    shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.3, width: 0.12, jag: 0.7 });
    shock(ev.x, ev.z, r * 1.35, CRYSTAL, { life: 0.5, width: 0.22, core: HVP, delay: 0.04, jag: 0.9 });
    spikes(ev.x, ev.z, r * 0.95, 9, CRYSTAL, { h: 0.75, delay: 0.03, life: 0.55, core: HVP });
    kit.crack({ x: ev.x, z: ev.z, radius: r * 0.85, glow: EMBER, life: 1.4, cool: 0.4 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.3, kind: 'crater', stain: vfxMatterColor('stone'), glow: CRYSTAL, glowOpacity: 0.5, cool: 1.2, life: 3.4, opacity: 0.55 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.4, color: HV, opacity: 0.4, life: 0.45, attack: 0.02 });
    spray('chunk', ev.x, 0.3, ev.z, 6, { color: vfxMatterColor('stone'), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.14], life: [0.5, 0.8], jitter: 0.3 });
    spray('shard', ev.x, 0.35, ev.z, 10, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 2.8], up: [1.4, 2.8], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 5, drag: 0.5, spin: [-10, 10], jitter: 0.3 });
    spray('spark', ev.x, 0.4, ev.z, 6, { color: PARCH, speed: [1.6, 3.0], up: [0.6, 1.6], size: [0.04, 0.08], life: [0.15, 0.3] });
    spray('smoke', ev.x, 0.2, ev.z, 3, { color: vfxMatterColor('stone'), speed: [0.6, 1.2], up: [0.1, 0.4], size: [0.36, 0.5], grow: 1.4, life: [0.7, 1.0], opacity: 0.3, gravity: -0.15, drag: 2.4, jitter: 0.4 });
  });
  // A thrown shard lands: its Ember ring flashes (the hit), the crystal
  // shatters into needles and punches a small cluster up (the patch the
  // enemy layer then grows in its place).
  function crystalShatter(x, z, radius) {
    mark('geode_shard_land');
    kit.ring({ x, z, r0: 0.15, r1: radius, width: 0.08, life: 0.3, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.75, gain: 0.7 });
    flare(x, 0.3, z, CRYSTAL, 0.85, { kind: 'star', life: 0.18, core: HVP });
    spikes(x, z, radius * 0.6, 4, CRYSTAL, { h: 0.45, life: 0.4, core: HVP });
    spray('shard', x, 0.3, z, 7, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [1.0, 2.0], size: [0.08, 0.13], life: [0.4, 0.7], gravity: 5, drag: 0.5, spin: [-10, 10] });
    spray('spark', x, 0.3, z, 4, { color: PARCH, speed: [1.2, 2.4], up: [0.6, 1.2], size: [0.03, 0.06], life: [0.12, 0.24] });
    kit.mark({ x, z, radius: radius * 1.2, kind: 'scorch', stain: INK, glow: CRYSTAL, glowOpacity: 0.3, cool: 1.0, life: 3.0, opacity: 0.35 });
  }

  // Heart Censer — "it gathers, then it mends". Nothing here hurts the party,
  // so none of it is Ember: the gather draws the mend's whole reach in (a
  // rose ring closing from 4.2 u onto the censer, violet motes streaming to
  // its coals); the mend is a rose-violet pulse out to the same edge with a
  // streak to every body it healed and a glow on each. A stun mid-gather
  // spills the coals on the floor.
  bus.on('censer_gather', (ev) => {
    mark('censer_gather');
    const r = ev.radius ?? 4.2;
    const c = byId(ev.id);
    const cx = c?.x ?? ev.x;
    const cz = c?.z ?? ev.z;
    const life = ev.untilTick != null && ev.tick != null ? Math.max(0.3, (ev.untilTick - ev.tick) / 60) : 0.8;
    kit.ring({ x: cx, z: cz, r0: r, r1: 0.35, width: 0.07, life, core: ROSE, glow: HV, soft: 0.6, y: 0.05, opacity: 0.55, gain: 0.6 });
    kit.mark({ x: cx, z: cz, radius: r, kind: 'sigil', stain: INK, glow: HV, glowOpacity: 0.35, cool: life, life: life + 0.3, opacity: 0.1 });
    kit.flash({ x: cx, y: CENSER_Y, z: cz, color: HV, size: 0.8, life: 0.25 });
    const n = N(8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.3, 0.3);
      const rr = r * rnd(0.55, 0.95);
      const dl = rnd(0, life * 0.6);
      const fl = Math.min(0.45, life - dl);
      const px = cx + Math.cos(a) * rr;
      const pz = cz + Math.sin(a) * rr;
      kit.streak({ a: { x: px, y: 0.35, z: pz }, b: { x: px - Math.cos(a) * 0.4, y: 0.45, z: pz - Math.sin(a) * 0.4 }, width: 0.05, tailW: 0, core: HVP, glow: HV, life: fl, delay: dl, travel: { x: (-Math.cos(a) * rr) / fl, y: (CENSER_Y - 0.4) / fl, z: (-Math.sin(a) * rr) / fl }, fall: 1.0, opacity: 0.85 });
    }
  });
  bus.on('censer_mend', (ev) => {
    mark('censer_mend');
    const { x, z } = ev;
    const r = ev.radius ?? 4.2;
    flare(x, CENSER_Y, z, HV, 1.2, { kind: 'burst', life: 0.3, core: HVP });
    kit.flash({ x, y: CENSER_Y, z, color: ROSE, size: 1.0, life: 0.3, hold: 0.06 });
    kit.ring({ x, z, r0: 0.3, r1: r, width: 0.12, life: 0.6, core: ROSE, glow: HV, soft: 0.55, y: 0.05, opacity: 0.8 });
    kit.ring({ x, z, r0: 0.2, r1: r * 0.75, width: 0.3, life: 0.7, core: HV, glow: HV, soft: 0.9, y: 0.08, delay: 0.05, opacity: 0.35, gain: 0.4 });
    kit.light({ x, z, radius: r * 0.6, color: HV, opacity: 0.35, life: 0.55, attack: 0.05 });
    const healed = ev.healed || [];
    for (let i = 0; i < healed.length; i++) {
      const t = byId(healed[i].id);
      if (!t) continue;
      const dl = Math.min(0.2, i * 0.025);
      kit.streak({ a: { x, y: CENSER_Y, z }, b: { x: t.x, y: 0.55, z: t.z }, width: 0.05, tailW: 0.06, core: ROSE, glow: HV, life: 0.42, delay: dl, fall: 1.0, opacity: 0.85 });
      kit.flash({ x: t.x, y: 0.55, z: t.z, color: ROSE, size: 0.6, life: 0.3, delay: dl + 0.08 });
      spray('spark', t.x, 0.35, t.z, 3, { color: ROSE, speed: [0.05, 0.2], up: [0.7, 1.2], size: [0.04, 0.08], life: [0.6, 0.9], gravity: -0.3, drag: 1.6, jitter: 0.25, opacity: 0.9 });
    }
  });
  bus.on('censer_spill', (ev) => {
    mark('censer_spill');
    const { x, z } = ev;
    kit.flash({ x, y: CENSER_Y, z, color: HV, size: 0.5, life: 0.12 });
    spray('shard', x, CENSER_Y - 0.1, z, 6, { color: CRYSTAL, tile: SHARD_TILE.drop, speed: [0.3, 0.9], up: [0.2, 0.8], size: [0.08, 0.12], life: [0.6, 0.9], gravity: 6, drag: 0.4, spin: [-4, 4] });
    spray('smoke', x, CENSER_Y, z, 2, { color: HBONE, speed: [0.2, 0.5], up: [-0.2, 0.2], size: [0.3, 0.42], grow: 1.3, life: [0.6, 0.9], opacity: 0.3, gravity: 0.1, drag: 2.2 });
    after(0.32, () => {
      kit.mark({ x, z, radius: 0.7, kind: 'scorch', stain: INK, glow: HV, glowOpacity: 0.4, cool: 0.9, life: 2.4, opacity: 0.4 });
      spray('spark', x, 0.1, z, 6, { color: HV, speed: [0.4, 1.2], up: [0.4, 1.0], size: [0.03, 0.06], life: [0.3, 0.6], drag: 1.2 });
    });
  });

  // Their deaths, on top of enemyDeath's shared break (whose kill motes go
  // violet for a `heart` row).
  Object.assign(CREATURE_DEATH, {
    husk: (es, matter, x, z) => {
      // The heart in the rib cavity bursts. Cheap: husks die in numbers.
      mark('husk_death');
      flare(x, 0.65, z, HV, 0.8, { kind: 'burst', life: 0.2, core: HVP });
      spray('spark', x, 0.6, z, 5, { color: HV, speed: [0.6, 1.4], up: [0.4, 1.0], size: [0.04, 0.07], life: [0.3, 0.6], drag: 1.3 });
    },
    lancer: (es, matter, x, z) => {
      // The vein-spear shatters into violet needles.
      mark('lancer_death');
      flare(x, 0.95, z, HV, 0.9, { kind: 'star', life: 0.22, core: HVP });
      spray('shard', x, 0.9, z, 7, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [0.6, 1.6], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 4, spin: [-10, 10] });
      spray('smoke', x, 0.8, z, 2, { color: HFLESH, speed: [0.2, 0.5], up: [0.1, 0.4], size: [0.32, 0.44], grow: 1.3, life: [0.7, 1.0], opacity: 0.3, gravity: -0.15, drag: 2.2 });
    },
    geode: (es, matter, x, z) => {
      // The spires break off and the boulder cracks open: crystal and stone.
      mark('geode_death');
      flare(x, 0.9, z, HV, 1.4, { kind: 'burst', life: 0.28, core: HVP });
      shock(x, z, 1.6, CRYSTAL, { life: 0.45, width: 0.16, core: HVP, jag: 0.8 });
      spikes(x, z, 0.8, 6, CRYSTAL, { h: 0.6, life: 0.6, core: HVP });
      kit.light({ x, z, radius: 1.8, color: HV, opacity: 0.45, life: 0.5 });
      spray('chunk', x, 0.6, z, 8, { color: vfxMatterColor('stone'), speed: [1.0, 2.4], up: [1.6, 2.8], size: [0.1, 0.18], life: [0.6, 0.9] });
      spray('shard', x, 1.0, z, 8, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 2.6], up: [1.2, 2.4], size: [0.12, 0.18], life: [0.6, 1.0], gravity: 5, spin: [-10, 10] });
    },
    censer: (es, matter, x, z) => {
      // The chain lets go: the censer drops and its coals scatter.
      mark('censer_death');
      flare(x, CENSER_Y, z, HV, 1.1, { kind: 'burst', life: 0.26, core: HVP });
      kit.flash({ x, y: CENSER_Y, z, color: ROSE, size: 0.8, life: 0.2 });
      shock(x, z, 1.2, ROSE, { life: 0.4, width: 0.08, core: HVP, y: CENSER_Y - 0.2 });
      spray('chunk', x, CENSER_Y, z, 4, { color: HBONE, speed: [0.6, 1.4], up: [0.2, 1.0], size: [0.07, 0.12], life: [0.6, 0.9] });
      spray('shard', x, CENSER_Y, z, 6, { color: CRYSTAL, tile: SHARD_TILE.drop, speed: [0.6, 1.6], up: [0.4, 1.2], size: [0.08, 0.12], life: [0.6, 0.9], gravity: 6, spin: [-4, 4] });
      after(0.35, () => kit.mark({ x, z, radius: 0.8, kind: 'scorch', stain: INK, glow: HV, glowOpacity: 0.4, cool: 1.0, life: 2.6, opacity: 0.4 }));
    },
  });

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
    const b = byId(ev.id);
    const bx = b?.x ?? ev.x;
    const bz = b?.z ?? ev.z;
    kit.flash({ x: bx, y: 1.3, z: bz, color: THORN.peak, size: 1.0, life: 0.22 });
    flare(bx, 1.3, bz, THORN.corruption, 1.5, { kind: 'burst', life: 0.24, core: THORN.peak });
    shock(bx, bz, 1.6, BRAMBLE, { life: 0.35, width: 0.12, core: BONE, jag: 0.5 });
    spray('shard', bx, 1.2, bz, THORN.volley.seeds, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.6, 1.4], up: [1.6, 2.6], size: [0.09, 0.13], life: [0.6, 0.9], gravity: 5, spin: [-8, 8], jitter: 0.4 });
    for (const gid of ev.globs || []) {
      const g = byId(gid);
      if (!g) continue;
      const d = unit2(g.tx - bx, g.tz - bz);
      kit.streak({ a: { x: bx, y: 1.3, z: bz }, b: { x: bx + d.x * 0.8, y: 1.7, z: bz + d.z * 0.8 }, width: 0.06, tailW: 0, core: PARCH, glow: THORN.corruption, life: 0.2, fall: 1.4 });
    }
  });
  function thornRoot(x, z, radius) {
    mark('thorn_seed_root');
    const T = THORN.root;
    kit.ring({ x, z, r0: 0.2, r1: radius, width: 0.08, life: 0.35, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.7, gain: 0.7 });
    flare(x, 0.3, z, THORN.corruption, 1.2, { kind: 'burst', life: 0.22, core: THORN.peak });
    shock(x, z, radius * 1.3, BRAMBLE, { life: 0.4, width: 0.14, core: BONE, jag: 0.8 });
    spikes(x, z, radius * 0.95, T.spikes, BRAMBLE, { h: 0.7, life: 0.55 });
    kit.mark({ x, z, radius: radius * 1.5, kind: 'crater', stain: BRAMBLE, glow: THORN.corruption, glowOpacity: 0.3, cool: 1.0, life: 4, opacity: 0.45 });
    kit.light({ x, z, radius: radius * 1.4, color: THORN.corruption, opacity: 0.35, life: 0.45 });
    spray('shard', x, 0.25, z, T.needles, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [0.8, 1.8], up: [1.4, 2.6], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 5, spin: [-8, 8], jitter: radius * 0.5 });
    spray('chunk', x, 0.15, z, 5, { color: DIRT, speed: [0.5, 1.2], up: [1.4, 2.4], size: [0.06, 0.11], life: [0.5, 0.8], jitter: radius * 0.4 });
    spray('smoke', x, 0.15, z, 2, { color: DIRT, speed: [0.3, 0.7], up: [0.1, 0.3], size: [0.34, 0.48], grow: 1.3, life: [0.7, 1.0], opacity: 0.3, gravity: -0.1, drag: 2.4 });
  }
  bus.on('boss_telegraph_start', (ev) => {
    const b = byId(ev.id);
    if (!b) return;
    // The wind-ups of the slice-2 bosses gather into the body (the lane or
    // cone itself stays the telegraph layer's).
    if (b.kind === 'thornmother' && ev.attack === 'charge') {
      mark('thorn_charge_windup');
      anticipate(b.x, b.z, 1.2, THORN.corruption, { y: 0.4, lines: 8, core: THORN.peak });
      spray('chunk', b.x, 0.1, b.z, 4, { color: DIRT, speed: [0.3, 0.8], up: [0.8, 1.4], size: [0.05, 0.1], life: [0.4, 0.6] });
    } else if (b.kind === 'millwheel') {
      mark(ev.attack === 'shards' ? 'millwheel_spokes' : 'millwheel_crosscut_windup');
      anticipate(b.x, b.z, 1.3, EMBER, { y: 0.9, lines: 8, core: PARCH });
      kit.flash({ x: b.x, y: 0.9, z: b.z, color: MILL.peak, size: 0.9, life: 0.3, hold: 0.1 });
    } else if (b.kind === 'lichram' && ev.attack === 'rush') {
      mark('lichram_rush_windup');
      anticipate(b.x, b.z, 1.2, LICH.corruption, { y: 0.9, lines: 8, core: LICH.peak });
      const d = faceOf(b);
      for (const s of [-1, 1]) flare(b.x + d.x * 0.7 - d.z * 0.35 * s, 1.0, b.z + d.z * 0.7 + d.x * 0.35 * s, LICH.corruption, 0.8, { life: 0.4, core: LICH.peak });
    }
  });
  bus.on('boss_charge', (ev) => {
    mark('thorn_charge');
    const b = byId(ev.id);
    const t = b?.chargeVx != null ? unit2(b.chargeVx, b.chargeVz) : faceOf(b);
    laneDrive(ev.x, ev.z, t, ev.len ?? 6, 10, { wake: DIRT, wakeW: THORN.charge.wakeW, head: THORN.corruption, peak: THORN.peak, stain: DIRT, glow: THORN.corruption, marks: 3 });
    shock(ev.x, ev.z, 1.4, DIRT, { life: 0.35, width: 0.14, core: BONE, jag: 0.6 });
    spray('chunk', ev.x, 0.15, ev.z, 6, { color: DIRT, speed: [0.8, 1.8], up: [1.2, 2.2], size: [0.06, 0.12], life: [0.5, 0.8], dir: { x: -t.x, z: -t.z }, dirBias: 0.6 });
    camfx.kick(t.x, t.z, THORN.camera.kick * 0.6, 0.14);
  });
  bus.on('boss_thorn_burst', (ev) => {
    mark('thorn_burst');
    const r = ev.radius ?? 1.1;
    const B = THORN.burst;
    flare(ev.x, 0.4, ev.z, EMBER, 1.5, { kind: 'burst', life: 0.24, core: THORN.peak });
    shock(ev.x, ev.z, r * 1.5, BRAMBLE, { life: 0.4, width: 0.16, core: BONE, jag: 0.8 });
    shock(ev.x, ev.z, r * 1.1, EMBER, { life: 0.28, width: 0.08 });
    for (let i = 0; i < N(B.needles); i++) {
      const a = (i / B.needles) * TAU + rnd(-0.15, 0.15);
      kit.streak({ a: { x: ev.x, y: 0.35, z: ev.z }, b: { x: ev.x + Math.cos(a) * 0.3, y: 0.4, z: ev.z + Math.sin(a) * 0.3 }, width: 0.05, tailW: 0, core: BONE, glow: BRAMBLE, life: 0.3, travel: { x: Math.cos(a) * 5, y: 1, z: Math.sin(a) * 5 }, fall: 0.6 });
    }
    spikes(ev.x, ev.z, r, B.spikes, BRAMBLE, { h: 0.6, life: 0.3 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.6, kind: 'gouge', angle: rnd(0, TAU), stretch: 1.3, stain: DIRT, glow: EMBER, cool: 0.6, life: 3.2, opacity: 0.5 });
    spray('shard', ev.x, 0.3, ev.z, 10, { color: BRAMBLE, tile: SHARD_TILE.needle, speed: [1.4, 2.8], up: [1.2, 2.4], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 5, spin: [-10, 10] });
    spray('chunk', ev.x, 0.2, ev.z, 6, { color: DIRT, speed: [1.0, 2.2], up: [1.6, 2.8], size: [0.06, 0.12], life: [0.5, 0.8], jitter: r * 0.4 });
  });
  bus.on('boss_charge_end', (ev) => {
    mark('thorn_charge_end');
    const big = !!ev.wall;
    flare(ev.x, 0.5, ev.z, THORN.corruption, big ? 2.0 : 1.3, { kind: 'burst', life: 0.28, core: THORN.peak });
    shock(ev.x, ev.z, big ? 2.2 : 1.5, DIRT, { life: 0.42, width: 0.2, core: BONE, jag: 0.8 });
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
    flare(x, 1.0, z, THORN.corruption, 3.2, { kind: 'burst', life: 0.45, core: THORN.peak, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: THORN.peak, glow: THORN.corruption, soft: 0.5, y: 0.06 });
    spikes(x, z, 3.0, 18, BRAMBLE, { h: 0.9, life: 0.8, delay: 0.05 });
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
    const b = byId(ev.id);
    const d = faceOf(b);
    const base = Math.atan2(d.z, d.x);
    kit.flash({ x: ev.x, y: 0.9, z: ev.z, color: EMBER, size: 1.0, life: 0.18 });
    flare(ev.x, 0.9, ev.z, MILL.corruption, 1.6, { kind: 'burst', life: 0.24, core: MILL.peak });
    for (let k = 0; k < 5; k++) {
      const a = base + (k - 2) * 0.21;
      const mx = ev.x + Math.cos(a) * 0.9;
      const mz = ev.z + Math.sin(a) * 0.9;
      kit.streak({ a: { x: ev.x, y: ESHOT_Y, z: ev.z }, b: { x: mx, y: ESHOT_Y, z: mz }, width: 0.05, tailW: 0.06, core: PARCH, glow: EMBER, life: 0.16, fall: 1.4 });
      flare(mx, ESHOT_Y, mz, EMBER, 0.55, { life: 0.12, angle: a });
    }
    shock(ev.x, ev.z, 1.8, IRON, { life: 0.32, width: 0.1, core: PARCH });
    spray('spark', ev.x, 0.8, ev.z, MILL.shards.sparks, { color: PALETTE.hearthAmber, speed: [1.4, 3.0], up: [0.4, 1.4], size: [0.03, 0.07], life: [0.2, 0.4], dir: d, dirBias: 0.6 });
    spray('shard', ev.x, 0.8, ev.z, MILL.shards.splinters, { color: OAK, tile: SHARD_TILE.needle, speed: [0.8, 1.8], up: [1.0, 2.0], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 5, spin: [-10, 10], dir: d, dirBias: 0.4 });
    camfx.kick(d.x, d.z, MILL.camera.kick * 0.5, 0.12);
  });
  bus.on('boss_crosscut', (ev) => {
    mark('millwheel_crosscut');
    const b = byId(ev.id);
    const t = b?.cutVx != null ? unit2(b.cutVx, b.cutVz) : faceOf(b);
    laneDrive(ev.x, ev.z, t, ev.len ?? 8, 9, { wake: vfxMatterColor('water'), wakeW: 0.7, head: MILL.corruption, peak: MILL.peak, stain: IRON, glow: EMBER, marks: 4 });
    shock(ev.x, ev.z, 1.6, OAK, { life: 0.35, width: 0.14, core: PARCH, jag: 0.5 });
    camfx.kick(t.x, t.z, MILL.camera.kick * 0.6, 0.14);
  });
  bus.on('boss_grind', (ev) => {
    mark('millwheel_grind');
    flare(ev.x, 0.4, ev.z, EMBER, 1.0, { kind: 'burst', life: 0.2, core: PARCH });
    spray('shard', ev.x, 0.4, ev.z, 8, { color: OAK, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.4, 2.6], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 5, spin: [-12, 12] });
    spray('chunk', ev.x, 0.3, ev.z, 6, { color: OAK, speed: [1.0, 2.0], up: [1.4, 2.4], size: [0.07, 0.13], life: [0.5, 0.8] });
    spray('spark', ev.x, 0.4, ev.z, 8, { color: PALETTE.hearthAmber, speed: [1.6, 3.0], up: [0.6, 1.4], size: [0.03, 0.06], life: [0.15, 0.3] });
  });
  bus.on('boss_cut_end', (ev) => {
    mark('millwheel_cut_end');
    flare(ev.x, 0.8, ev.z, MILL.corruption, 2.2, { kind: 'burst', life: 0.3, core: MILL.peak });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: PARCH, size: 1.2, life: 0.16 });
    shock(ev.x, ev.z, 2.4, IRON, { life: 0.45, width: 0.22, core: PARCH, jag: 0.8 });
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
    flare(x, 1.0, z, MILL.corruption, 3.2, { kind: 'burst', life: 0.45, core: MILL.peak, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4, width: 0.4, life: 1.0, core: MILL.peak, glow: MILL.corruption, soft: 0.5, y: 0.06 });
    kit.mark({ x, z, radius: 3.4, kind: 'splash', stain: SILT, glow: vfxMatterColor('water'), glowOpacity: 0.4, cool: 1.5, life: 6, opacity: 0.5 });
    ripples(x, z, 4, 3.0, 0.1);
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
    const b = byId(ev.id);
    const t = b?.rushVx != null ? unit2(b.rushVx, b.rushVz) : faceOf(b);
    laneDrive(ev.x, ev.z, t, ev.len ?? 6, 11, { wake: vfxMatterColor('earth'), wakeW: LICH.rush.wakeW, head: LICH.corruption, peak: LICH.peak, stain: vfxMatterColor('earth'), glow: LICH.corruption, marks: 3 });
    shock(ev.x, ev.z, 1.4, BONEPLATE, { life: 0.35, width: 0.14, core: BONE, jag: 0.5 });
    camfx.kick(t.x, t.z, LICH.camera.kick * 0.6, 0.14);
  });
  bus.on('boss_horns_stuck', (ev) => {
    mark('lichram_stuck');
    const b = byId(ev.id);
    const d = faceOf(b);
    const hx = ev.x + d.x * 0.8;
    const hz = ev.z + d.z * 0.8;
    flare(hx, 0.9, hz, LICH.corruption, 2.2, { kind: 'star', life: 0.3, core: LICH.peak, angle: Math.atan2(d.z, d.x) });
    kit.flash({ x: hx, y: 0.9, z: hz, color: PARCH, size: 1.1, life: 0.16 });
    shock(hx, hz, 2.2, BONEPLATE, { life: 0.45, width: 0.2, core: BONE, jag: 0.9 });
    kit.crack({ x: hx, z: hz, radius: 1.5, glow: LICH.corruption, life: 2.2, cool: 0.8 });
    kit.mark({ x: hx, z: hz, radius: 2.2, kind: 'crater', stain: vfxMatterColor('earth'), glow: LICH.corruption, cool: 1.2, life: 4, opacity: 0.55 });
    spray('chunk', hx, 0.6, hz, 12, { color: vfxMatterColor('earth'), speed: [1.0, 2.4], up: [1.6, 3.0], size: [0.07, 0.15], life: [0.6, 1.0], jitter: 0.4, dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
    spray('shard', hx, 0.9, hz, 6, { color: BONEPLATE, tile: SHARD_TILE.needle, speed: [1.0, 2.0], up: [1.0, 2.0], size: [0.1, 0.14], life: [0.5, 0.8], gravity: 5, spin: [-10, 10] });
    camfx.dolly(hx, hz, LICH.camera.dolly, 0.3);
  });
  bus.on('boss_grave_call', (ev) => {
    mark('lichram_grave_call');
    const b = byId(ev.id);
    const bx = b?.x ?? ev.x;
    const bz = b?.z ?? ev.z;
    anticipate(bx, bz, 1.6, LICH.corruption, { y: 0.6, lines: 8, core: LICH.peak });
    after(ANTICIP, () => {
      flare(bx, 1.4, bz, LICH.corruption, 1.8, { kind: 'burst', life: 0.28, core: LICH.peak });
      kit.mark({ x: bx, z: bz, radius: 2.4, kind: 'sigil', stain: INK, glow: LICH.corruption, cool: 1.2, life: 2.2, opacity: 0.2 });
      shock(bx, bz, 2.4, LICH.corruption, { life: 0.45, width: 0.12, core: LICH.peak });
      kit.light({ x: bx, z: bz, radius: 2.6, color: LICH.corruption, opacity: 0.45, life: 0.6 });
      for (const gid of ev.globs || []) {
        const g = byId(gid);
        if (!g) continue;
        kit.streak({ a: { x: bx, y: 1.4, z: bz }, b: { x: g.tx, y: 0.1, z: g.tz }, width: 0.04, tailW: 0, core: LICH.peak, glow: LICH.corruption, life: 0.35, fall: 1.2, opacity: 0.6 });
      }
    });
  });
  function graveBurst(x, z, radius) {
    mark('lichram_grave_burst');
    const G = LICH.grave;
    kit.ring({ x, z, r0: 0.2, r1: radius, width: 0.08, life: 0.35, core: EMBER, glow: EMBER, soft: 0.5, y: 0.04, opacity: 0.7, gain: 0.7 });
    flare(x, 0.35, z, LICH.corruption, 1.3, { kind: 'burst', life: 0.24, core: LICH.peak });
    shock(x, z, radius * 1.4, vfxMatterColor('earth'), { life: 0.4, width: 0.18, core: BONE, jag: 0.9 });
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
    flare(x, 1.6, z, LICH.corruption, 2.4, { kind: 'burst', life: 0.32, core: LICH.peak });
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
    flare(x, 1.0, z, LICH.corruption, 3.2, { kind: 'burst', life: 0.45, core: LICH.peak, spin: 0.8 });
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
    flare(ev.x, 0.5, ev.z, EMBER, 1.6, { kind: 'burst', life: 0.22, core: CANT.peak });
    kit.flash({ x: ev.x, y: 0.5, z: ev.z, color: PARCH, size: 1.0, life: 0.12 });
    shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.26, width: 0.1 });
    for (let i = 0; i < C.rings; i++) shock(ev.x, ev.z, r * (1.3 + i * 0.45), CANT.corruption, { life: 0.5 + i * 0.12, width: 0.07, core: CANT.peak, delay: 0.05 + i * 0.09, y: 0.08 + i * 0.25 });
    kit.mark({ x: ev.x, z: ev.z, radius: r * 1.3, kind: 'sigil', stain: INK, glow: CANT.corruption, glowOpacity: 0.45, cool: 1.0, life: 2.6, opacity: 0.22 });
    kit.light({ x: ev.x, z: ev.z, radius: r * 1.5, color: CANT.corruption, opacity: 0.45, life: 0.5, attack: 0.02 });
    spray('spark', ev.x, 0.3, ev.z, C.motes, { color: CANT.corruption, speed: [0.3, 1.2], up: [1.0, 2.2], size: [0.05, 0.1], life: [0.8, 1.3], gravity: -0.3, drag: 1.4, jitter: r * 0.6 });
    if (ev.echo > 0) {
      spikes(ev.x, ev.z, r * 0.7, 6, CRYSTAL, { h: 0.55, life: 0.4, core: CANT.peak, delay: 0.03 });
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
    flare(ev.x + d.x * 0.6, 2.0, ev.z + d.z * 0.6, CANT.corruption, 1.8, { life: 0.24, core: CANT.peak, angle: ang });
    kit.streak({ a: { x: ev.x, y: 0.12, z: ev.z }, b: { x: ex, y: 0.12, z: ez }, width: 1.2, tailW: 1.0, core: EMBER, glow: EMBER, life: 0.26, fall: 2.2, opacity: 0.55 });
    kit.streak({ a: { x: ev.x + d.x * 0.5, y: 1.6, z: ev.z + d.z * 0.5 }, b: { x: ex, y: 0.5, z: ez }, width: 0.34, tailW: 0.2, core: CANT.peak, glow: CANT.corruption, life: sweep + 0.45, fall: 1.2, opacity: 1 });
    kit.streak({ a: { x: ev.x, y: 1.5, z: ev.z }, b: { x: ev.x + d.x, y: 1.4, z: ev.z + d.z }, width: 0.16, tailW: 0.5, core: PARCH, glow: CANT.corruption, life: sweep, travel: { x: d.x * SPEED, y: -2.2, z: d.z * SPEED }, fall: 0.3 });
    after(sweep, () => {
      flare(ex, 0.5, ez, CANT.corruption, 1.3, { kind: 'burst', life: 0.24, core: CANT.peak });
      shock(ex, ez, 1.2, CANT.corruption, { life: 0.35, width: 0.1, core: CANT.peak });
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
    anticipate(ev.x, ev.z, 2.2, CANT.corruption, { y: 1.6, lines: 10, core: CANT.peak });
    after(ANTICIP, () => {
      kit.pillar({ x: ev.x, z: ev.z, radius: 0.8, height: V.pillar, color: CANT.corruption, life: 1.1, opacity: 0.6 });
      flare(ev.x, 2.0, ev.z, CANT.corruption, 2.8, { kind: 'burst', life: 0.4, core: CANT.peak, spin: 0.6 });
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
    flare(ev.x, 1.6, ev.z, CANT.corruption, 1.8, { kind: 'star', life: 0.24, core: CANT.peak });
    spray('spark', ev.x, 1.2, ev.z, 16, { color: CANT.corruption, speed: [0.4, 1.4], up: [0.2, 1.2], size: [0.05, 0.1], life: [0.5, 0.9], gravity: -0.2, drag: 1.6, jitter: 0.6 });
    const d = unit2(ev.tx - ev.x, ev.tz - ev.z);
    const len = Math.hypot(ev.tx - ev.x, ev.tz - ev.z);
    kit.streak({ a: { x: ev.x, y: 1.6, z: ev.z }, b: { x: ev.tx, y: 1.6, z: ev.tz }, width: 0.12, tailW: 0, core: CANT.peak, glow: CANT.corruption, life: 0.45, fall: 1.4, opacity: 0.7 });
    kit.streak({ a: { x: ev.x, y: 1.6, z: ev.z }, b: { x: ev.x + d.x * 0.8, y: 1.6, z: ev.z + d.z * 0.8 }, width: 0.22, tailW: 0.6, core: PARCH, glow: CANT.corruption, life: 0.3, travel: { x: (d.x * len) / 0.3, y: 0, z: (d.z * len) / 0.3 }, fall: 0.3 });
    kit.mark({ x: ev.tx, z: ev.tz, radius: 1.6, kind: 'sigil', stain: INK, glow: CANT.corruption, glowOpacity: 0.5, cool: 0.8, life: 1.6, opacity: 0.25 });
  });
  bus.on('boss_echo_land', (ev) => {
    mark('cantor_echo_land');
    flare(ev.x, 1.6, ev.z, CANT.corruption, 2.0, { kind: 'burst', life: 0.28, core: CANT.peak });
    shock(ev.x, ev.z, 2.0, CANT.corruption, { life: 0.4, width: 0.1, core: CANT.peak });
    spray('spark', ev.x, 0.6, ev.z, 14, { color: CANT.corruption, speed: [0.3, 1.0], up: [0.8, 1.8], size: [0.05, 0.1], life: [0.7, 1.1], gravity: -0.3, drag: 1.4, jitter: 0.5 });
    kit.light({ x: ev.x, z: ev.z, radius: 2.4, color: CANT.corruption, opacity: 0.45, life: 0.5 });
  });
  // The Heart Pulse: the room's heart beats through it — an Ember ring the
  // full radius (the hit), a thick violet shockwave and the floor cracking.
  bus.on('boss_heart_pulse', (ev) => {
    mark('cantor_pulse');
    const r = ev.radius ?? 3.2;
    flare(ev.x, 1.2, ev.z, CANT.corruption, 3.0, { kind: 'burst', life: 0.32, core: CANT.peak });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: PARCH, size: 1.6, life: 0.14 });
    shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.14 });
    shock(ev.x, ev.z, r * 1.25, CANT.corruption, { life: 0.55, width: 0.3, core: CANT.peak, delay: 0.03 });
    shock(ev.x, ev.z, r * 1.6, HV, { life: 0.75, width: 0.16, core: HVP, delay: 0.08 });
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
    flare(x, 2.0, z, CANT.corruption, 4.2, { kind: 'burst', life: 0.6, core: CANT.peak, spin: 0.8 });
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
    flare(fx, 0.4, fz, EMBER, 1.8, { kind: 'burst', life: 0.26, core: PARCH });
    shock(fx, fz, 1.6, SLATE, { life: 0.4, width: 0.2, core: GLASS, jag: 0.9 });
    kit.streak({ a: { x: ev.x, y: 0.1, z: ev.z }, b: { x: ev.x + d.x * len, y: 0.1, z: ev.z + d.z * len }, width: 1.0, tailW: 0.8, core: EMBER, glow: EMBER, life: 0.3, fall: 2.2, opacity: 0.55 });
    laneDrive(ev.x, ev.z, d, len, F.speed, { wake: CRYSTAL, wakeW: 0.4, head: COLO.corruption, peak: COLO.peak, stain: SLATE, glow: HV, marks: 4, markKind: 'gouge' });
    const sweep = len / F.speed;
    const n = Math.max(3, Math.round(len / 1.4));
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      const px = ev.x + d.x * len * k;
      const pz = ev.z + d.z * len * k;
      after(sweep * k, () => {
        spikes(px, pz, 0.5, F.spikes, CRYSTAL, { h: 0.6, life: 0.45, core: GLASS });
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
    const b = byId(ev.id);
    const bx = b?.x ?? ev.x;
    const bz = b?.z ?? ev.z;
    anticipate(bx, bz, 1.4, HV, { y: 1.8, lines: 8, core: GLASS });
    after(ANTICIP, () => {
      flare(bx, 2.6, bz, HV, 1.8, { kind: 'burst', life: 0.3, core: HVP });
      kit.light({ x: bx, z: bz, radius: 2.4, color: HV, opacity: 0.4, life: 0.5 });
      for (const gid of ev.globs || []) {
        const g = byId(gid);
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
    flare(ev.x, 1.4, ev.z, HV, 3.0, { kind: 'burst', life: 0.32, core: HVP, spin: 0.5 });
    kit.flash({ x: ev.x, y: 1.0, z: ev.z, color: PARCH, size: 1.5, life: 0.14 });
    shock(ev.x, ev.z, r, EMBER, { life: 0.3, width: 0.14, jag: 0.6 });
    shock(ev.x, ev.z, r * 1.3, CRYSTAL, { life: 0.55, width: 0.26, core: GLASS, delay: 0.03, jag: 0.9 });
    spikes(ev.x, ev.z, r * 0.9, B.spikes, CRYSTAL, { h: 0.9, life: 0.6, core: GLASS, delay: 0.02 });
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
    flare(x, 1.6, z, HV, 2.6, { kind: 'burst', life: 0.32, core: HVP });
    kit.ring({ x, z, r0: 0.5, r1: 3.4, width: 0.2, life: 0.75, core: GLASS, glow: HV, soft: 0.5, y: 0.06 });
    kit.crack({ x, z, radius: 2.0, glow: HV, life: 2.4, cool: 0.9 });
    spikes(x, z, 1.8, 8, CRYSTAL, { h: 0.7, life: 0.5, core: GLASS });
    spray('shard', x, 1.4, z, 12, { color: CRYSTAL, tile: SHARD_TILE.needle, speed: [0.8, 2.0], up: [0.8, 2.0], size: [0.09, 0.14], life: [0.6, 0.9], gravity: 5, spin: [-10, 10], jitter: 0.6 });
    kit.light({ x, z, radius: 3, color: HV, opacity: 0.5, life: 0.8 });
  }
  function colossusDeath(x, z) {
    // The body breaks: slate falls away, the glass shatters outward, and the
    // geode's violet heart goes up in one last beat.
    mark('colossus_death');
    kit.pillar({ x, z, radius: 1.1, height: 4.2, color: HV, life: 1.5, opacity: 0.7 });
    flare(x, 1.4, z, HV, 3.6, { kind: 'burst', life: 0.5, core: HVP, spin: 0.8 });
    kit.ring({ x, z, r0: 0.5, r1: 4.4, width: 0.4, life: 1.0, core: GLASS, glow: HV, soft: 0.5, y: 0.06 });
    kit.mark({ x, z, radius: 3.6, kind: 'crater', stain: SLATE, glow: HV, glowOpacity: 0.5, cool: 2.2, life: 6, opacity: 0.6 });
    kit.crack({ x, z, radius: 2.6, glow: HV, life: 3, cool: 1.2 });
    spikes(x, z, 2.2, 14, CRYSTAL, { h: 1.0, life: 0.7, core: GLASS });
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
      if (e.tetherId != null && e.state === 'active') wispFrame(e, rec);
      return;
    }
    if (e.kind === 'cantor' || e.kind === 'colossus') return heartBossFrame(e, rec);
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
  // The wind-up: gold motes drawn into the champion, Ember lines into where
  // the move will land.
  bus.on('champion_tell', (ev) => {
    mark('champion_tell');
    const c = byId(ev.id);
    if (c) {
      spray('spark', c.x, 1.4, c.z, 6, { color: CH_GOLD, speed: [0.05, 0.2], up: [0.2, 0.6], size: [0.04, 0.08], life: [0.5, 0.8], gravity: -0.2, drag: 1.6, jitter: 0.9, opacity: 0.85 });
      kit.flash({ x: c.x, y: 1.5, z: c.z, color: CH_GOLD, size: 0.7, life: 0.25, grow: -0.3, opacity: 0.7 });
    }
    anticipate(ev.x, ev.z, 1.6, EMBER, { y: 0.3, lines: 8 });
  });
  bus.on('champion_spawn', (ev) => {
    mark('champion_spawn');
    kit.pillar({ x: ev.x, z: ev.z, radius: 1.0, height: 6, color: CH_GOLD, life: 1.1, opacity: 0.6 });
    kit.pillar({ x: ev.x, z: ev.z, radius: 0.4, height: 6.5, color: CH_GOLD_HOT, life: 0.8, opacity: 0.7 });
    flare(ev.x, 1.2, ev.z, CH_GOLD, 3.0, { kind: 'burst', life: 0.4, spin: 0.6 });
    kit.light({ x: ev.x, z: ev.z, radius: 3.4, color: CH_GOLD, opacity: 0.55, life: 1.0, attack: 0.05 });
    kit.mark({ x: ev.x, z: ev.z, radius: 2.4, kind: 'crater', stain: vfxMatterColor('ash'), glow: CH_GOLD, cool: 1.4, life: 5, opacity: 0.5 });
    kit.crack({ x: ev.x, z: ev.z, radius: 1.8, glow: CH_GOLD, life: 2.4, cool: 0.9 });
    spray('chunk', ev.x, 0.3, ev.z, 10, { color: vfxMatterColor('earth'), speed: [1.0, 2.6], up: [1.4, 3.0], size: [0.08, 0.16], life: [0.6, 1.0], jitter: 0.6 });
    camfx.dolly(ev.x, ev.z, 0.5, 0.45);
  });
  bus.on('champion_rage', (ev) => {
    mark('champion_rage');
    flare(ev.x, 1.4, ev.z, EMBER, 2.4, { kind: 'burst', life: 0.35, core: CH_GOLD_HOT });
    shock(ev.x, ev.z, 3.0, EMBER, { life: 0.45, width: 0.18, jag: 0.6 });
    kit.light({ x: ev.x, z: ev.z, radius: 3, color: EMBER, opacity: 0.45, life: 0.6 });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.6, 0.18);
  });
  // Each move's landing.
  const CHAMP_MOVE = {
    // Briar Knight: the charge sets off (its wake is laid as it runs) ...
    bramble_charge(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = byId(ev.id);
      const len = c && c.charge ? c.charge.left * Math.hypot(c.charge.vx, c.charge.vz) : 5;
      laneDrive(c ? c.x : ev.x, c ? c.z : ev.z, d, len, 9, { wake: CH_BRAMBLE, wakeW: 1.0, head: EMBER, peak: CH_GOLD_HOT, stain: vfxMatterColor('earth'), glow: EMBER, marks: 4 });
      spray('shard', c ? c.x : ev.x, 0.5, c ? c.z : ev.z, 8, { color: CH_BRAMBLE, tile: SHARD_TILE.needle, speed: [1.0, 2.2], up: [0.6, 1.4], size: [0.1, 0.15], life: [0.5, 0.8], gravity: 4, spin: [-8, 8], dir: { x: -d.x, z: -d.z }, dirBias: 0.5 });
    },
    // ... and the Thorn Ring bursts round it.
    thorn_ring(ev) {
      const r = 2.8;
      spikes(ev.x, ev.z, r, 18, CH_BRAMBLE, { h: 0.9, life: 0.6, core: PARCH });
      flare(ev.x, 0.5, ev.z, EMBER, 2.0, { kind: 'star', life: 0.26 });
      shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.35, width: 0.16, jag: 0.8 });
      shock(ev.x, ev.z, r * 1.35, CH_BRAMBLE, { life: 0.55, width: 0.24, core: PARCH, delay: 0.05 });
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
      flare(ev.x + d.x * 0.9, 0.6, ev.z + d.z * 0.9, CH_WATER, 2.0, { kind: 'burst', life: 0.25, angle: ang });
      spray('shard', ev.x + d.x * 1.6, 0.4, ev.z + d.z * 1.6, 22, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [1.6, 3.4], up: [1.2, 2.6], size: [0.1, 0.16], life: [0.5, 0.9], gravity: 7, drag: 0.3, dir: d, dirBias: 0.8, jitter: 0.5 });
      spray('smoke', ev.x + d.x * 2, 0.2, ev.z + d.z * 2, 4, { color: CH_SILT, speed: [0.6, 1.4], up: [0.05, 0.2], size: [0.5, 0.7], grow: 1.5, life: [1.0, 1.4], opacity: 0.35, drag: 2.4, dir: d, dirBias: 0.6, jitter: 0.6 });
      kit.mark({ x: ev.x + d.x * 2, z: ev.z + d.z * 2, radius: 2.4, kind: 'splash', angle: ang, stretch: 1.4, stain: CH_SILT, glow: CH_WATER, glowOpacity: 0.3, cool: 0.8, life: 4, opacity: 0.45 });
      camfx.kick(d.x, d.z, 0.55, 0.14);
    },
    // ... and the Undertow wells up under a hero.
    undertow(ev) {
      const r = 1.9;
      ripples(ev.x, ev.z, 3, r * 1.2, 0);
      kit.pillar({ x: ev.x, z: ev.z, radius: r * 0.6, height: 2.6, color: CH_WATER, life: 0.6, opacity: 0.55 });
      flare(ev.x, 0.4, ev.z, EMBER, 1.6, { kind: 'burst', life: 0.22 });
      shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.3, width: 0.12 });
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
      flare(ev.x + d.x * R * 0.8, 0.7, ev.z + d.z * R * 0.8, CH_BONE, 1.6, { kind: 'star', life: 0.2, angle: ang });
      spray('spark', ev.x + d.x * R * 0.7, 0.7, ev.z + d.z * R * 0.7, 10, { color: PARCH, speed: [1.4, 3.0], up: [0.3, 1.0], size: [0.04, 0.07], life: [0.15, 0.3], dir: d, dirBias: 0.6 });
      kit.mark({ x: ev.x + d.x * 1.4, z: ev.z + d.z * 1.4, radius: 2.0, kind: 'gouge', angle: ang + Math.PI / 2, stretch: 2.2, stain: INK, glow: EMBER, cool: 0.6, life: 2.6, opacity: 0.4 });
      camfx.kick(d.x, d.z, 0.4, 0.12);
    },
    // ... and the Grave Lance: bone spikes burst along the lane, one by one.
    grave_lance(ev) {
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      const c = byId(ev.id);
      const ox = c ? c.x : ev.x - d.x * 4;
      const oz = c ? c.z : ev.z - d.z * 4;
      const len = Math.hypot(ev.x - ox, ev.z - oz) || 8;
      kit.streak({ a: { x: ox, y: 0.1, z: oz }, b: { x: ev.x, y: 0.1, z: ev.z }, width: 1.1, tailW: 1.0, core: EMBER, glow: EMBER, life: 0.24, fall: 2.2, opacity: 0.5 });
      const n = Math.max(4, Math.round(len / 0.8));
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        spikes(ox + d.x * len * k, oz + d.z * len * k, 0.5, 4, CH_BONE, { h: 1.0, life: 0.55, delay: k * 0.22, core: PARCH });
      }
      after(0.22, () => {
        flare(ev.x, 0.5, ev.z, CH_BONE, 1.4, { kind: 'burst', life: 0.22 });
        spray('chunk', ev.x, 0.3, ev.z, 8, { color: CH_BONE, speed: [1.0, 2.4], up: [1.4, 2.8], size: [0.08, 0.15], life: [0.6, 0.9] });
      });
      for (let i = 1; i <= 3; i++) kit.mark({ x: ox + d.x * len * (i / 3.5), z: oz + d.z * len * (i / 3.5), radius: 1.0, kind: 'gouge', angle: Math.atan2(d.z, d.x), stretch: 1.8, stain: vfxMatterColor('earth'), glow: EMBER, glowOpacity: 0.3, cool: 0.6, life: 3, opacity: 0.4, delay: i * 0.07 });
      camfx.kick(d.x, d.z, 0.35, 0.12);
    },
    // Hollow Choir: the hymn's release, a violet flare at the heart, the
    // shards fly on their own (the enemy-shot layer draws them).
    shard_hymn(ev) {
      const c = byId(ev.id);
      const x = c ? c.x : ev.x;
      const z = c ? c.z : ev.z;
      const d = unit2(ev.dx ?? 0, ev.dz ?? 1);
      flare(x + d.x * 0.6, 1.7, z + d.z * 0.6, CH_VEIN, 2.0, { kind: 'star', life: 0.24, core: CH_PEAK, angle: Math.atan2(d.z, d.x) });
      kit.flash({ x, y: 1.7, z, color: CH_PEAK, size: 1.0, life: 0.15 });
      kit.ring({ x, z, r0: 0.5, r1: 1.6, width: 0.1, life: 0.35, core: CH_PEAK, glow: CH_VEIN, soft: 0.5, y: 1.7, opacity: 0.8 });
      spray('shard', x, 1.7, z, 8, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.6, 3.0], up: [0.2, 0.8], size: [0.09, 0.13], life: [0.4, 0.7], gravity: 3, spin: [-8, 8], dir: d, dirBias: 0.7 });
    },
    // ... and Discord: two rings of dissonance, Ember where it hurts.
    discord(ev) {
      const r = 3.2;
      flare(ev.x, 1.6, ev.z, CH_VEIN, 2.6, { kind: 'burst', life: 0.3, core: CH_PEAK, spin: 0.7 });
      shock(ev.x, ev.z, r * 1.05, EMBER, { life: 0.4, width: 0.18 });
      shock(ev.x, ev.z, r * 1.4, CH_VEIN, { life: 0.6, width: 0.26, core: CH_PEAK, delay: 0.08 });
      kit.ring({ x: ev.x, z: ev.z, r0: 0.6, r1: r, width: 0.14, life: 0.45, core: CH_PEAK, glow: CH_VEIN, soft: 0.5, y: 1.6, opacity: 0.7 });
      kit.light({ x: ev.x, z: ev.z, radius: r * 1.2, color: CH_VEIN, opacity: 0.5, life: 0.5 });
      spray('shard', ev.x, 1.2, ev.z, 18, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.6, 3.2], up: [0.4, 1.4], size: [0.09, 0.14], life: [0.5, 0.8], gravity: 4, spin: [-10, 10], jitter: 0.6 });
      kit.mark({ x: ev.x, z: ev.z, radius: r, kind: 'scorch', stain: INK, glow: CH_VEIN, cool: 1.0, life: 3, opacity: 0.3 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.5, 0.15);
    },
  };
  bus.on('champion_move', (ev) => {
    mark(`champion_${ev.move}`);
    const fn = CHAMP_MOVE[ev.move];
    if (fn) fn(ev);
  });
  // The Briar Knight's charge stopping: on a wall, a crash; spent, a skid.
  bus.on('champion_charge_end', (ev) => {
    mark('champion_charge_end');
    const c = byId(ev.id);
    const d = faceOf(c);
    const wall = ev.cause === 'wall';
    flare(ev.x + d.x * 0.6, 0.7, ev.z + d.z * 0.6, wall ? EMBER : CH_BRAMBLE, wall ? 2.0 : 1.2, { kind: 'star', life: 0.24, angle: Math.atan2(d.z, d.x) });
    shock(ev.x, ev.z, wall ? 2.2 : 1.4, wall ? EMBER : CH_BRAMBLE, { life: 0.35, width: 0.14, jag: wall ? 0.7 : 0 });
    spray('chunk', ev.x + d.x * 0.6, 0.3, ev.z + d.z * 0.6, wall ? 12 : 6, { color: vfxMatterColor('earth'), speed: [1.0, 2.6], up: [1.0, 2.6], size: [0.08, 0.15], life: [0.5, 0.9], dir: { x: -d.x, z: -d.z }, dirBias: 0.4, jitter: 0.4 });
    spray('smoke', ev.x, 0.2, ev.z, 4, { color: vfxMatterColor('earth'), speed: [0.6, 1.2], up: [0.1, 0.3], size: [0.4, 0.55], grow: 1.4, life: [0.8, 1.1], opacity: 0.32, drag: 2.4, jitter: 0.5 });
    if (wall) camfx.kick(d.x, d.z, 0.7, 0.16);
  });
  // Their deaths, on top of enemyDeath's break: a gold column, the body's
  // matter flying, the camera leaning in.
  function championDeath(matter, color, x, z) {
    kit.pillar({ x, z, radius: 0.9, height: 5, color: CH_GOLD, life: 1.2, opacity: 0.6 });
    flare(x, 1.2, z, CH_GOLD, 3.0, { kind: 'burst', life: 0.42, core: CH_GOLD_HOT, spin: 0.8 });
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
      spikes(x, z, 1.4, 10, CH_BRAMBLE, { h: 0.7, life: 0.6 });
    },
    sluice_warden: (es, matter, x, z) => {
      mark('sluice_warden_death');
      championDeath(vfxMatterColor('stone'), CH_GOLD, x, z);
      ripples(x, z, 4, 3.0, 0.1);
      spray('shard', x, 0.6, z, 20, { color: CH_WATER, tile: SHARD_TILE.drop, speed: [1.0, 2.4], up: [2.0, 3.6], size: [0.1, 0.16], life: [0.6, 1.0], gravity: 7, drag: 0.3, jitter: 0.6 });
    },
    bone_reeve: (es, matter, x, z) => {
      mark('bone_reeve_death');
      championDeath(CH_BONE, CH_GOLD, x, z);
      spray('shard', x, 1.2, z, 16, { color: CH_BONE, tile: SHARD_TILE.needle, speed: [1.0, 2.4], up: [1.4, 2.8], size: [0.1, 0.15], life: [0.7, 1.0], gravity: 5, spin: [-10, 10], jitter: 0.5 });
    },
    hollow_choir: (es, matter, x, z) => {
      mark('hollow_choir_death');
      championDeath(CH_CRYSTAL, CH_VEIN, x, z);
      flare(x, 1.7, z, CH_VEIN, 2.4, { kind: 'burst', life: 0.4, core: CH_PEAK });
      spray('shard', x, 1.6, z, 22, { color: CH_CRYSTAL, tile: SHARD_TILE.needle, speed: [1.2, 3.0], up: [1.0, 2.6], size: [0.1, 0.15], life: [0.7, 1.1], gravity: 4, spin: [-10, 10], jitter: 0.6 });
    },
  });

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
    anticipate(x, z, 1.4, VK_GOLD, { y: 0.4, lines: 8, core: VK_HOT });
    after(ANTICIP, () => {
      kit.pillar({ x, z, radius: 0.6, height: 7, color: VK_GOLD, life: 1.4, opacity: 0.5 });
      kit.pillar({ x, z, radius: 0.18, height: 8, color: VK_HOT, life: 1.1, opacity: 0.9 });
      flare(x, 1.0, z, VK_GOLD, 1.8, { kind: 'burst', life: 0.3, core: VK_HOT });
      kit.flash({ x, y: 1.0, z, color: VK_GOLD, size: 1.6, life: 0.45, hold: 0.1 });
      kit.light({ x, z, radius: 3.6, color: VK_GOLD, opacity: 0.6, life: 1.2, attack: 0.03 });
      shock(x, z, 2.6, VK_GOLD, { life: 0.5, width: 0.14, core: VK_HOT });
      kit.ring({ x, z, r0: 0.3, r1: 1.4, width: 0.08, life: 0.8, core: VK_HOT, glow: VK_GOLD, soft: 0.6, y: 0.05, delay: 0.1, opacity: 0.7 });
      spray('spark', x, 0.3, z, 22, { color: VK_GOLD, speed: [0.05, 0.4], up: [2.0, 3.8], size: [0.05, 0.1], life: [0.9, 1.5], gravity: -0.1, drag: 0.9, jitter: 0.35, opacity: 0.95 });
      kit.mark({ x, z, radius: 1.3, kind: 'sigil', stain: INK, glow: VK_GOLD, cool: 1.4, life: 3.0, opacity: 0.3 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.08, 0.12);
    });
  });
  bus.on('key_pickup', (ev) => {
    mark('key_pickup');
    const { x, z } = ev;
    const by = byId(ev.by) ?? player();
    const tx = by ? by.x : x;
    const tz = by ? by.z : z;
    flare(x, 1.0, z, VK_GOLD, 1.4, { kind: 'star', life: 0.22, core: VK_HOT });
    shock(x, z, 1.6, VK_GOLD, { life: 0.35, width: 0.1, core: VK_HOT });
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
      embersUp(tx, tz, VK_GOLD, 10, { radius: 0.4 });
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
    flare(x, 0.5, z, VK_GOLD, 1.5, { kind: 'burst', life: 0.25, core: VK_HOT });
    shock(x, z, 1.5, VK_GOLD, { life: 0.35, width: 0.1, core: VK_HOT });
    kit.light({ x, z, radius: 2.2, color: VK_GOLD, opacity: 0.5, life: 0.6 });
    spray('chunk', x, 0.4, z, 16, { color: VK_GOLD, speed: [0.6, 1.6], up: [2.2, 3.6], size: [0.06, 0.1], life: [0.7, 1.1], jitter: 0.3 });
    spray('spark', x, 0.4, z, 14, { color: VK_HOT, speed: [0.2, 0.9], up: [1.4, 2.8], size: [0.04, 0.08], life: [0.6, 1.0], gravity: -0.2, drag: 1.2, jitter: 0.35 });
  });
  // The platter eaten: Bright Heal rising off every hero it fed.
  bus.on('vault_platter', (ev) => {
    mark('vault_platter');
    const { x, z } = ev;
    flare(x, 0.6, z, PALETTE.hearthAmber, 1.3, { kind: 'burst', life: 0.25 });
    spray('smoke', x, 0.6, z, 4, { color: PARCH, speed: [0.2, 0.5], up: [0.4, 0.8], size: [0.3, 0.45], grow: 1.6, life: [0.8, 1.1], opacity: 0.22, gravity: -0.2, drag: 2.2, jitter: 0.3 });
    for (const e of world.entities()) {
      if (e.partyIndex === undefined || !(e.hp > 0)) continue;
      healBloom(e.x, e.z, 0.6, false);
    }
  });
  // The chest opens: the vault's big beat.
  bus.on('vault_open', (ev) => {
    mark('vault_open');
    const x = ev.x ?? 0;
    const z = ev.z ?? -4.2;
    anticipate(x, z, 1.8, VK_GOLD, { y: 0.6, lines: 10, core: VK_HOT });
    after(ANTICIP, () => {
      kit.pillar({ x, z, radius: 1.1, height: 8, color: VK_GOLD, life: 1.8, opacity: 0.6 });
      kit.pillar({ x, z, radius: 0.35, height: 9, color: VK_HOT, life: 1.4, opacity: 0.9 });
      flare(x, 1.0, z, VK_GOLD, 3.4, { kind: 'burst', life: 0.45, core: VK_HOT, spin: 0.8 });
      kit.flash({ x, y: 1.1, z, color: VK_HOT, size: 2.6, life: 0.5, hold: 0.12 });
      kit.light({ x, z, radius: 6.0, color: VK_GOLD, opacity: 0.7, life: 2.0, attack: 0.03 });
      shock(x, z, 4.4, VK_GOLD, { life: 0.7, width: 0.22, core: VK_HOT });
      kit.ring({ x, z, r0: 0.5, r1: 2.6, width: 0.12, life: 1.0, core: VK_HOT, glow: VK_GOLD, soft: 0.6, y: 0.06, delay: 0.15, opacity: 0.8 });
      spray('chunk', x, 0.9, z, 30, { color: VK_GOLD, speed: [0.6, 2.0], up: [3.0, 5.0], size: [0.06, 0.11], life: [1.0, 1.5], jitter: 0.4 });
      spray('spark', x, 0.8, z, 40, { color: VK_HOT, speed: [0.1, 0.8], up: [2.0, 4.4], size: [0.05, 0.1], life: [1.2, 2.0], gravity: -0.15, drag: 0.9, jitter: 0.4, opacity: 0.95 });
      kit.mark({ x, z, radius: 2.4, kind: 'sigil', stain: INK, glow: VK_GOLD, cool: 2.0, life: 5, opacity: 0.35 });
      camfx.dolly(x, z, 0.5, 0.5);
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.2, 0.16);
    });
    // The rest of the hoard pours into the party: gold streaks to each hero.
    after(0.35, () => {
      for (const e of world.entities()) {
        if (e.partyIndex === undefined || !(e.hp > 0)) continue;
        kit.streak({ a: { x, y: 2.2, z }, b: { x: e.x, y: 1.1, z: e.z }, width: 0.06, tailW: 0, core: VK_HOT, glow: VK_GOLD, life: 0.3, fall: 1.0 });
        after(0.25, () => embersUp(e.x, e.z, VK_GOLD, 6, { radius: 0.3 }));
      }
    });
  });

  const KIT_BOSS_DEATH = { heron: heronDeath, wyrm: wyrmDeath, thornmother: thornmotherDeath, millwheel: millwheelDeath, lichram: lichramDeath, cantor: cantorDeath, colossus: colossusDeath };

  // Per frame: the Heron's drive throws spray off its legs and stops in a
  // splash; the burrowed Wyrm leaves a trail of turned earth so the party can
  // read where it is tunnelling.
  const bossMode = new Map(); // boss id -> { mode, clock }
  const S2_FRAME = new Set(['thornmother', 'millwheel', 'lichram', 'gravewisp', 'cantor', 'colossus']);
  function bossFrame(dt) {
    for (const e of world.entities()) {
      if (S2_FRAME.has(e.kind)) {
        slice2Frame(e, dt);
        continue;
      }
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
    if (s2Clock.size > 64) s2Clock.clear();
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
  let updateMs = 0; // EMA of this director's own per-frame CPU cost (probes)

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
      flare(ev.x, 1.0 + i * 0.25, ev.z, c, 0.9, { kind: 'star', life: 0.32, delay: 0.1 + i * 0.12 });
      shock(ev.x, ev.z, 1.5 + i * 0.4, c, { life: 0.45, width: 0.07, delay: 0.1 + i * 0.12 });
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
      flare(x, 0.6, z, c, 1.6, { kind: 'star', life: 0.26 });
      kit.flash({ x, y: 0.5, z, color: c, size: r * 1.1, life: 0.3, opacity: 0.7 });
      shock(x, z, r * 1.1, c, { life: 0.35, width: 0.14, jag: 0.3 });
      shock(x, z, r * 0.7, PARCH, { life: 0.25, width: 0.06, delay: 0.04 });
      for (let i = 0; i < N(12); i++) {
        const a = (i / 12) * TAU + rnd(-0.15, 0.15);
        kit.streak({ a: { x, y: 0.3, z }, b: { x: x + Math.cos(a) * 0.3, y: 0.35, z: z + Math.sin(a) * 0.3 }, width: 0.06, tailW: 0, core: PARCH, glow: c, life: 0.28, travel: { x: Math.cos(a) * r * 3.2, y: 0, z: Math.sin(a) * r * 3.2 }, fall: 0.4 });
      }
      spray('shard', x, 0.4, z, 14, { color: c, tile: SHARD_TILE.drop, speed: [1.4, 3.0], up: [1.0, 2.4], size: [0.08, 0.16], life: [0.5, 0.9], gravity: 7, drag: 0.4, spin: [-4, 4] });
      spray('smoke', x, 0.2, z, 4, { color: c, speed: [0.6, 1.4], up: [0.1, 0.3], size: [0.4, 0.6], grow: 1.4, life: [0.7, 1.1], opacity: 0.3, gravity: -0.05, drag: 2.4, jitter: r * 0.5 });
      kit.mark({ x, z, radius: r * 1.2, kind: 'sigil', stain: c, glow: c, cool: 1.2, life: 1.6, opacity: 0.35 });
      kit.light({ x, z, radius: r * 1.6, color: c, opacity: 0.6, life: 0.6 });
      camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.05, 0.1);
      return;
    }
    // Molten: the core bursts, lava thrown out, a burning pool left behind.
    mark('affix_molten_burst');
    const c = AC.molten;
    flare(x, 0.5, z, c, 2.0, { kind: 'burst', life: 0.3 });
    kit.flash({ x, y: 0.6, z, color: EMBER, size: r * 1.3, life: 0.32, opacity: 0.8 });
    shock(x, z, r * 1.2, c, { life: 0.38, width: 0.16, jag: 0.6 });
    shock(x, z, r * 0.8, EMBER, { life: 0.3, width: 0.08, delay: 0.05 });
    kit.crack({ x, z, radius: r * 0.9, glow: c, life: 2.2, cool: 0.5 });
    kit.mark({ x, z, radius: r * 1.3, kind: 'scorch', stain: INK, glow: c, cool: 1.6, life: 4.0, opacity: 0.55 });
    spray('spark', x, 0.3, z, 22, { color: c, speed: [1.6, 3.6], up: [1.6, 3.4], size: [0.05, 0.1], life: [0.5, 0.9], gravity: 5, drag: 0.6, opacity: 0.95 });
    spray('chunk', x, 0.3, z, 8, { color: VFX_MATTER.ash, speed: [1.2, 2.6], up: [1.4, 2.8], size: [0.07, 0.14], life: [0.5, 0.8] });
    spray('smoke', x, 0.3, z, 5, { color: VFX_MATTER.cinder, speed: [0.4, 1.0], up: [0.4, 0.9], size: [0.45, 0.7], grow: 1.6, life: [0.9, 1.4], opacity: 0.4, gravity: -0.3, drag: 2.0, jitter: r * 0.4 });
    embersUp(x, z, c, 12, { radius: r * 0.8, life: [1.0, 2.0] });
    kit.light({ x, z, radius: r * 2.0, color: c, opacity: 0.75, life: 0.8 });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.09, 0.14);
  }
  // A molten core drops where the elite fell.
  bus.on('affix_core', (ev) => {
    mark('affix_core');
    flare(ev.x, 0.35, ev.z, AC.molten, 0.8, { kind: 'burst', life: 0.25 });
    embersUp(ev.x, ev.z, AC.molten, 6, { radius: 0.3 });
  });
  // Warded: a gold rune ring snaps shut when the ward goes up; it shatters
  // into gold flakes when it drops.
  bus.on('affix_ward', (ev) => {
    const c = AC.warded;
    if (ev.stage === 'on') {
      mark('affix_ward');
      flare(ev.x, 0.9, ev.z, c, 1.2, { kind: 'star', life: 0.24 });
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
    flare(ev.x, 0.6, ev.z, c, 1.2, { kind: 'star', life: 0.22 });
    shock(ev.x, ev.z, 1.2, c, { life: 0.3, width: 0.08 });
    spray('spark', ev.x, 0.5, ev.z, 10, { color: c, speed: [0.8, 2.0], up: [0.4, 1.4], size: [0.04, 0.08], life: [0.3, 0.5], drag: 1.0 });
  });
  // Splitting: the body cracks in two.
  bus.on('affix_split', (ev) => {
    mark('affix_split');
    const c = AC.splitting;
    flare(ev.x, 0.6, ev.z, c, 1.3, { kind: 'burst', life: 0.26 });
    shock(ev.x, ev.z, 1.4, c, { life: 0.35, width: 0.1, jag: 0.5 });
    kit.crack({ x: ev.x, z: ev.z, radius: 0.8, glow: c, life: 1.2, cool: 0.4 });
    spray('chunk', ev.x, 0.5, ev.z, 8, { color: c, speed: [1.0, 2.2], up: [1.2, 2.4], size: [0.06, 0.12], life: [0.4, 0.7] });
    for (const id of ev.brood || []) {
      const b = byId(id);
      if (b) flare(b.x, 0.5, b.z, c, 0.7, { kind: 'star', life: 0.2, delay: 0.05 });
    }
  });
  // Vampiric: a blood thread from the wound back to the elite.
  bus.on('affix_leech', (ev) => {
    const t = byId(ev.target);
    if (!t) return;
    mark('affix_leech');
    const c = AC.vampiric;
    kit.streak({ a: { x: t.x, y: 0.7, z: t.z }, b: { x: ev.x, y: 0.8, z: ev.z }, width: 0.06, tailW: 0, core: c, glow: c, life: 0.3, fall: 0.8 });
    kit.flash({ x: ev.x, y: 0.8, z: ev.z, color: c, size: 0.6, life: 0.22, opacity: 0.7 });
    spray('spark', t.x, 0.6, t.z, 4, { color: c, speed: [0.3, 0.8], up: [0.4, 0.9], size: [0.04, 0.07], life: [0.3, 0.5], drag: 1.0 });
  });
  // Thorned: thorn splinters fly back at whoever struck it.
  bus.on('affix_thorns', (ev) => {
    const t = byId(ev.target);
    if (!t) return;
    mark('affix_thorns');
    const dx = t.x - ev.x;
    const dz = t.z - ev.z;
    const l = Math.hypot(dx, dz) || 1;
    spray('shard', ev.x + (dx / l) * 0.4, 0.6, ev.z + (dz / l) * 0.4, 6, { color: BONE, tile: SHARD_TILE.drop, speed: [2.0, 3.4], up: [0.2, 0.6], size: [0.06, 0.1], life: [0.2, 0.35], dir: { x: dx / l, z: dz / l }, dirBias: 0.85, gravity: 3 });
    kit.flash({ x: t.x, y: 0.7, z: t.z, color: AC.thorned, size: 0.45, life: 0.15, opacity: 0.7 });
  });

  function update(tSec) {
    const t0 = performance.now();
    updateBody(tSec);
    updateMs += (performance.now() - t0 - updateMs) * 0.1;
  }
  function updateBody(tSec) {
    const dt = last === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - last));
    last = tSec;
    for (let i = timers.length - 1; i >= 0; i--) {
      const tm = timers[i];
      tm.t -= dt;
      if (tm.t <= 0) {
        timers.splice(i, 1);
        tm.fn();
      }
    }
    if ((biomeClock -= dt) <= 0) {
      biomeClock = 1;
      readBiome();
    }
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
          // The head: a pulsing orb in the trail's glow, the white-hot core
          // the eye follows (AAA pass).
          const g = kit.glow({ x: hx, y: spec.y, z: hz, color: spec.glow, size: spec.width * 4.2 + 0.12, owner: e.id, pulse: 8 });
          rec = { spec, g, s: kit.streak({ a: { x: hx, y: spec.y, z: hz }, b: { x: hx, y: spec.y, z: hz }, width: spec.width, tailW: spec.tailW, core: spec.core, glow: spec.glow, hold: true, owner: e.id, fall: 1.6, opacity: 0.9 }) };
          trails.set(e.id, rec);
        }
        if (rec.g && rec.g.owner === e.id) kit.setGlow(rec.g, hx, spec.y, hz);
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
        const every = es.wakeEvery ?? (flyer ? 0.35 : 0.09);
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
      if (rec.g && rec.g.owner === id) {
        kit.release(rec.g, 0.14);
        rec.g.owner = null;
      }
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
    flare(x, 1.1, z, c, 1.6, { kind: 'burst', life: 0.3 });
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
  // Batch 3 — the synergy relics. Each proc reads as its relic: the class
  // relics in that class's own hues, the rest in the relic's matter (coal,
  // sun, horn, lamp, coin), all short and light so a busy room stays legible.
  const RELIC3 = {
    tank: vfxClassStyle('tank'),
    swordsman: vfxClassStyle('swordsman'),
    archer: vfxClassStyle('archer'),
    healer: vfxClassStyle('healer'),
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
        flare(x, 0.6, z, st.glow, 0.8, { kind: 'star', life: 0.16 });
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
        flare(fx, 0.6, fz, st.glow, 0.7, { kind: 'burst', life: 0.14 });
        kit.streak({ a: { x: fx, y: 0.6, z: fz }, b: { x: (fx + x) / 2, y: 1.05, z: (fz + z) / 2 }, width: 0.06, tailW: 0, core: PARCH, glow: st.glow, life: 0.16, fall: 1.2 });
        kit.streak({ a: { x: (fx + x) / 2, y: 1.05, z: (fz + z) / 2 }, b: { x, y: 0.6, z }, width: 0.06, tailW: 0, core: PARCH, glow: st.glow, life: 0.16, delay: 0.06, fall: 1.2 });
        after(0.1, () => {
          flare(x, 0.6, z, st.second, 0.9, { kind: 'star', life: 0.18 });
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
        flare(x, 0.55, z, hot, ev.ember ? 1.3 : 1.0, { kind: 'burst', life: 0.2 });
        kit.ring({ x, z, r0: 0.2, r1: r, width: 0.14, life: 0.32, core: PARCH, glow: hot, soft: 0.45, y: 0.08, gain: 1.2 });
        kit.light({ x, z, radius: r + 0.6, color: hot, opacity: 0.5, life: 0.35 });
        for (const id of ev.hit ?? []) {
          const b = byId(id);
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
        flare(x, 0.8, z, GOLD, 1.0, { kind: 'burst', life: 0.2 });
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
      default:
        break;
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

  function levelTeardown() {
    trails.clear();
    wakeClock.clear();
    timers.length = 0;
    biomeClock = 0;
    globKind.clear();
    shotKind.clear();
    bossMode.clear();
    s2Clock.clear();
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
    return { ...kit.counts(), recipes: { ...fired }, updateMs: Math.round(updateMs * 1000) / 1000, trails: trails.size, camera: camfx.offset(), cameraLive: camfx.live(), effects: settings?.get?.('gameplay.effects') ?? 'full' };
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
