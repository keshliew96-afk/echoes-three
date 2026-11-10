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
import { PALETTE, VFX_BIOME } from '../../data/palette.js';
import {
  vfxClassStyle,
  vfxSkillClass,
  vfxEnemyStyle,
  vfxMatterColor,
  vfxBossStyle,
  isVfxBoss,
  vfxFoeShotColor,
  VFX_INTENSITY,
} from '../../data/vfx.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../enemies/style.js';
import { impactFx } from './hub.js';
import { SHARD_TILE } from './particles.js';
import { createVfxKit } from './kit.js';
import { createTemplateKit } from './tplkit.js';
import { createTemplateFx } from './templates.js';
import { heroRigPoint, heroRigCenter, heroRigMoving } from '../critters/rigs.js';
import { createFoeFx } from './foefx.js';
import { createBoltFx } from './boltfx.js';
import { createCameraFx } from './camerafx.js';
import { renderHold } from '../hold.js';
import { createTideFx } from './tidefx.js';
import { createBellFx } from './bellfx.js';
import { createDuskFx } from './duskfx.js';
import { createTonicFx } from './tonicfx.js';
import { createShrineFx } from './shrinefx.js';
import { createSecretFx } from './secretfx.js';
import { createRelic6Fx } from './relic6fx.js';
import { createAnimeFx } from './animefx.js';
import { createFlipbook } from './flipbook.js';
import { CHEST_BEAT } from '../interactables/chestbeat.js';
import { SKILLS } from '../../sim/skills.js';
import { isOwnBody } from './hitfeedback.js';

import { EMBER, PARCH, BONE, HEAL, INK, TAU, BOLT_Y, ESHOT_Y, TRAIL_SPEED, ENEMY_SHOT_TRAIL, CONTACT_FX, KILL_FX, ELEMENT_AIR, HEAL_SKILLS, SKILL_AREA } from './sig/common.js';
import { createSigRelics } from './sig/relics.js';
import { createSigAffixes } from './sig/affixes.js';
import { createSigLateBosses } from './sig/latebosses.js';
import { createSigThirdBosses } from './sig/thirdbosses.js';
import { createSigVaults } from './sig/vaults.js';
import { createSigChampions } from './sig/champions.js';
import { createSigBosses } from './sig/bosses.js';
import { createSigFoes4 } from './sig/foes4.js';
import { createSigFoes3 } from './sig/foes3.js';
import { createSigFoes2 } from './sig/foes2.js';
import { createSigFirstBosses } from './sig/firstbosses.js';

export function createSignatureFx({ stage, world, bus, cosmetic, settings = null }) {
  const sv = {}; // the director's mutable state (one object, shared with its parts under vfx/sig/)
  const SF = {}; // the director's functions, shared with its parts (filled below)
  Object.assign(SF, { anticipate, byId, chestPunch, elementAir, embersUp, flare, healBloom, shock }); // the director's own functions its parts call
  const kit = createVfxKit({ stage, cosmetic });
  // Kesh's VFX templates (design-VFX.md §11): their own primitives.
  const tk = createTemplateKit({ stage, cosmetic });
  const rnd = (a, b) => cosmetic.range(a, b);

  // ------------------------------------------------------------ settings --
  sv.intensity = VFX_INTENSITY.full;
  const readSettings = () => {
    const v = settings?.get?.('gameplay.effects');
    sv.intensity = VFX_INTENSITY[v] ?? VFX_INTENSITY.full;
    kit.setIntensity(sv.intensity);
    tk.setIntensity(sv.intensity);
  };
  readSettings();
  settings?.subscribe?.('gameplay.effects', readSettings);
  const shakeGain = () => {
    const s = settings?.get?.('gameplay.screenshake');
    return (typeof s === 'number' ? s : 1) * sv.intensity.camera;
  };
  const camfx = createCameraFx({ camera: stage.camera, gain: shakeGain });
  // §6.2 k and o (VFX_HIT_RULES): the local anime frame and the camera punch.
  const animeFx = createAnimeFx({ root: kit.root, cosmetic });
  // l (L4): a crit's contact is drawn as a 5-drawing flipbook in pale gold.
  const flipbook = createFlipbook({ root: kit.root, cosmetic });
  const CRIT_BOOK = '#FFE7A8';
  const animeTick = new Map(); // attacker id -> the tick its finisher last played
  // Every combo finisher in the data (a skill with a combo bonus).
  const FINISHERS = new Set(Object.values(SKILLS).filter((d) => d.combo).map((d) => d.id));
  const CAM_PUNCH = Object.freeze({ bigKill: 0.06, chest: 0.02, sec: 0.12, shotKick: 0.015 });
  const NO_SHOT_KICK = new Set(['archer', 'healer']);
  const N = (k) => (k > 0 ? Math.max(1, Math.round(k * sv.intensity.particles)) : 0);
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
  sv.biomeAct = 1;
  sv.biomeClock = 0;
  const readBiome = () => {
    try {
      const a = world.runSystem?.()?.view?.()?.act;
      if (a) sv.biomeAct = a;
    } catch {
      /* the run system is optional (harness scenes) */
    }
  };
  const tintCache = new Map();
  const _ca = new Color();
  const _cb = new Color();
  function biomeTint(hex, k) {
    const air = VFX_BIOME[sv.biomeAct] ?? VFX_BIOME[1];
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
  // A delay counted in held render time (render/hold.js): it waits out a
  // hitstop with the rigs, so a kill's debris bursts as the body pops.
  const afterHeld = (sec, fn) => {
    if (sec <= 0) fn();
    else timers.push({ t: sec, fn, held: true });
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
  // hold: s at full strength after the pop (kit.star; default 0.05).
  function flare(x, y, z, color, size, { kind = 'star', life = 0.2, core = PARCH, spin = 0, angle, delay = 0, hold } = {}) {
    const ang = angle ?? rnd(0, Math.PI);
    kit.star({ x, y, z, color, size, life, kind, spin, angle: ang, delay, hold });
    kit.star({ x, y, z, color: core, size: size * 0.42, life: life * 0.7, kind, spin, angle: ang, delay, hold });
  }
  // order: the ring's draw order (kit.ring; default over the floor at 7).
  function shock(x, z, radius, color, { life = 0.3, width = 0.08, core = PARCH, y = 0.07, delay = 0, jag = 0, order } = {}) {
    kit.ring({ x, z, r0: 0.15, r1: radius, width, life, core, glow: color, soft: 0.35, y, delay, jag, thin: 0.6, order });
  }
  // A near-white bloom held at full strength (THE HIT AND THE KILL), fainter
  // where many glows already stack and under Effects: Reduced.
  function bloom(x, z, size, { hold, life, opacity, grow = CONTACT_FX.bloomGrow, y = 0.5 }) {
    const crowd = Math.max(0.35, 1 / (1 + CONTACT_FX.crowd * kit.liveNear(x, z, 2)));
    kit.flash({ x, y, z, color: PARCH, size, life, hold, grow, opacity: opacity * crowd * (sv.intensity.light ?? 1) });
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
  sv.cacheTick = -1;
  sv.rebuilds = 0;
  const byIdMap = new Map();
  function byId(id) {
    if (id == null) return null;
    const fresh = world.tick !== sv.cacheTick;
    // Rebuilt once per tick, and again (a few times at most) when an id
    // spawned after this tick's build.
    if (fresh || (!byIdMap.has(id) && sv.rebuilds < 4)) {
      sv.rebuilds = fresh ? 0 : sv.rebuilds + 1;
      sv.cacheTick = world.tick;
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
    // The contact (P3, L5): a near-white bloom about 2 body widths across,
    // held 100 ms at full strength. White, not the class glow: the Healer's
    // glow is your numbers' Hearth Amber, and a numeral must never sit on a
    // flat amber patch (§4.3).
    bloom(x, z, (big ? CONTACT_FX.bloomSkill : CONTACT_FX.bloom) * (crit ? CONTACT_FX.bloomCrit : 1), { hold: CONTACT_FX.hold, life: CONTACT_FX.life, opacity: CONTACT_FX.bloomOpacity });
    // The landing frame, every hit: a class-coloured flare with a hot core,
    // held 100 ms (L5); a crit adds a shockwave, rising embers and a little
    // camera punch.
    flare(x, 0.5, z, st.glow, (big ? 0.75 : 0.55) * (crit ? 1.6 : 1), { kind: flareKind(st), life: crit ? CONTACT_FX.critLife : CONTACT_FX.life, core: st.shape === 'sharp' ? st.second : PARCH, hold: CONTACT_FX.hold });
    if (crit) {
      shock(x, z, 1.0, st.glow, { life: 0.26, width: 0.07 });
      embersUp(x, z, st.glow, 4, { radius: 0.25, life: [0.6, 1.0] });
      if (dir) camfx.kick(dir.x, dir.z, 0.025, 0.08);
    }
    if (st.shape === 'blunt') {
      spray('spark', x, 0.45, z, Math.round(st.debris.spark * s), { color: st.glow, speed: [1.4, 3.0], up: [0.8, 2.0], size: [0.05, 0.1], life: [0.18, 0.32], dir, dirBias: 0.6 });
      spray('chunk', x, 0.38, z, Math.round((big ? 5 : 3) * s), { color: st.debrisColor, speed: [1.0, 2.4], up: [1.2, 2.6], size: [0.06, 0.12], life: [0.4, 0.7], dir, dirBias: 0.5 });
      spray('smoke', x, 0.3, z, 1, { color: st.second, speed: [0.2, 0.5], up: [0.3, 0.6], size: [0.28, 0.4], grow: 1, life: [0.5, 0.8], opacity: 0.28, gravity: -0.25, drag: 2.4 });
      kit.flash({ x, y: 0.45, z, color: st.glow, size: 0.3 * s, life: CONTACT_FX.life, hold: CONTACT_FX.hold, opacity: 0.6 });
    } else if (st.shape === 'sharp') {
      spray('spark', x, 0.5, z, Math.round(st.debris.spark * s), { color: st.second, speed: [1.8, 3.4], up: [0.3, 1.2], size: [0.04, 0.08], life: [0.15, 0.28], dir, dirBias: 0.75 });
      if (dir) {
        // A short cut line through the target, across the hit direction.
        const px = -dir.z;
        const pz = dir.x;
        const L = crit ? 0.42 : 0.3;
        kit.streak({ a: { x: x - px * L - dir.x * 0.1, y: 0.5, z: z - pz * L - dir.z * 0.1 }, b: { x: x + px * L + dir.x * 0.1, y: 0.56, z: z + pz * L + dir.z * 0.1 }, width: 0.06, tailW: 0.1, core: st.second, glow: st.glow, life: 0.16, fall: 0.6 });
      }
      kit.flash({ x, y: 0.5, z, color: st.glow, size: 0.3 * s, life: CONTACT_FX.life, hold: CONTACT_FX.hold });
    } else if (st.shape === 'line') {
      kit.flash({ x, y: BOLT_Y, z, color: st.glow, size: 0.4 * s, life: CONTACT_FX.life, hold: CONTACT_FX.hold });
      if (dir) kit.streak({ a: { x, y: BOLT_Y, z }, b: { x: x + dir.x * 0.6, y: BOLT_Y, z: z + dir.z * 0.6 }, width: 0.05, tailW: 0.3, core: PARCH, glow: st.glow, life: 0.15, fall: 0.5 });
      spray('shard', x, 0.55, z, st.debris.shard, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.5, 1.2], up: [0.6, 1.2], size: [0.1, 0.15], life: [0.7, 1.0], gravity: 1.1, drag: 1.6, spin: [-4, 4], flutter: 0.45, dir, dirBias: 0.4 });
      kit.light({ x, z, radius: 0.55, color: st.glow, opacity: st.light.opacity, life: st.light.life });
    } else {
      kit.flash({ x, y: 0.5, z, color: st.glow, size: 0.46 * s, life: CONTACT_FX.life, hold: CONTACT_FX.hold });
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
    gloamwolf: Object.freeze({ matter: 'owlfeather', family: 'brute', shard: 'feather', chunk: 3, dust: 2 }),
    mireking: Object.freeze({ matter: 'slime', family: 'brute', shard: 'drop', chunk: 3, dust: 1 }),
    ashraven: Object.freeze({ matter: 'feather', family: 'brute', shard: 'feather', chunk: 3, dust: 2 }),
    veinweaver: Object.freeze({ matter: 'heartcrystal', family: 'brute', shard: 'needle', chunk: 4, dust: 1 }),
  };

  // An enemy body breaking: what it was made of, scattered.
  // dir: the killing hit's direction ({ x, z }, unit) or null.
  function enemyDeath(kind, x, z, killerClass, dir = null) {
    const es = vfxEnemyStyle(kind);
    const matter = vfxMatterColor(es.matter);
    // K2: the debris bursts as the body pops, after its swell (counted in
    // held time, like the pop), leaning slightly along the killing hit (P1).
    afterHeld(KILL_FX.burstAt, () => {
      impactFx.kill(x, z, { color: BONE, debris: matter, dir, dirBias: dir ? KILL_FX.lean : 0 });
      if (es.shard) spray('shard', x, 0.45, z, 6, { color: matter, tile: SHARD_TILE[es.shard] ?? 0, speed: [1.2, 2.6], up: [1.0, 2.2], size: [0.11, 0.17], life: [0.5, 0.9], gravity: 4, drag: 0.6, spin: [-8, 8], dir, dirBias: dir ? KILL_FX.lean : 0 });
    });
    // The break: a bone-white burst held bright for 5 frames over a white
    // bloom twice a hit's (K1), a brief ring of the body's matter, the
    // corruption leaving as indigo motes, a stain that lingers.
    bloom(x, z, KILL_FX.bloom, { hold: KILL_FX.flareHold, life: KILL_FX.flareLife, opacity: KILL_FX.bloomOpacity });
    flare(x, 0.5, z, BONE, 1.0, { kind: 'burst', life: KILL_FX.flareLife, hold: KILL_FX.flareHold });
    shock(x, z, 1.0, matter, { life: KILL_FX.ringLife, width: 0.1, core: BONE, order: KILL_FX.ringOrder });
    spray('spark', x, 0.4, z, 6, { color: es.heart ? vfxMatterColor('heartvein') : TELL_INDIGO_GLOW, speed: [0.05, 0.3], up: [0.9, 1.6], size: [0.05, 0.09], life: [0.8, 1.3], gravity: -0.4, drag: 1.4, jitter: 0.25, opacity: 0.85 });
    const wet = es.matter === 'slime' || es.matter === 'ichor' || es.matter === 'water';
    kit.mark({ x, z, radius: 0.9, kind: wet ? 'splash' : 'scorch', stain: matter, glow: null, life: 3.5, opacity: 0.45 });
    if (es.dust) spray('smoke', x, 0.35, z, es.dust, { color: matter, speed: [0.4, 1.0], up: [0.2, 0.5], size: [0.34, 0.5], grow: 1.3, life: [0.7, 1.1], opacity: 0.3, gravity: -0.2, drag: 2.4 });
    if (es.matter === 'slime') kit.ring({ x, z, r0: 0.2, r1: 0.9, width: 0.12, life: KILL_FX.ringLife, core: matter, glow: matter, soft: 0.8, y: 0.03, opacity: 0.6, gain: 0.5, order: KILL_FX.ringOrder });
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
  // THE TIDECALLER's own beats (slice 3) live in tidefx.js; it borrows these
  // helpers and rides the per-frame loop below for trails, zones and bubbles.
  const tide = createTideFx({ kit, bus, byId, spray, flare, shock, after, anticipate, camfx, N, rnd, mark });
  // THE BELLWRIGHT (docs/BELLWRIGHT.md): her hung bells, the Peal and the
  // Clapper's ring hit live in bellfx.js.
  const bellFx = createBellFx({ kit, bus, byId, spray, flare, shock, after, anticipate, camfx, N, rnd, mark, stage });
  // THE DUSKWING (docs/DUSKWING.md): his dive, his bite, the dark of
  // Nightfall and the blind over each enemy live in duskfx.js.
  const duskFx = createDuskFx({ kit, bus, byId, spray, flare, shock, after, camfx, N, rnd, mark, world });
  // TONICS AND BOMBS (docs/CONSUMABLES.md): the carry slot's beats.
  // D3 (VFX_HIT_RULES §6.2 m): an element leaves its air behind. About 100
  // tiny twinkles and a faint mist hold the place 1 to 2 s after the Frost
  // Bomb and the Frozen elite's burst, so the cold stays where it landed.
  function elementAir(x, z, radius, color, core, n = ELEMENT_AIR.twinkles) {
    tk.dust(x, 0.45, z, n, { tex: 'star', color, color2: core, radius, speed: [0, 0.12], up: [0.02, 0.22], size: ELEMENT_AIR.size, life: ELEMENT_AIR.sec, gravity: 0, drag: 1.2, twinkle: 18, stagger: 0.25 });
    spray('smoke', x, 0.3, z, N(ELEMENT_AIR.mist), { color: core, speed: [0.02, 0.1], up: [0, 0.06], size: [radius * 0.7, radius * 1.0], grow: 1.25, life: ELEMENT_AIR.sec, opacity: ELEMENT_AIR.mistOpacity, gravity: 0, drag: 2, jitter: radius * 0.4 });
    mark('element_air');
  }
  // i (C2): the 2% zoom punch of a chest's snap, peaking inside the hold at
  // the top of the hop (S+5 on, easing out by about S+25). snapIn: seconds
  // from now to the snap.
  function chestPunch(snapIn = CHEST_BEAT.snap) {
    after(snapIn + 5 / 30, () => camfx.punch(CAM_PUNCH.chest, 0.6));
  }
  const tonicFx = createTonicFx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, N, rnd, mark, world, elementAir });
  // HAZARDS AND SHRINES (docs/SHRINES.md): crystal spurs, shrines, blessings.
  const shrineFx = createShrineFx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, N, rnd, mark, world });
  // SECRET ROOMS (docs/SECRET_ROOMS.md): the cracked wall and the chamber.
  createSecretFx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, rnd, mark, player, chestPunch });
  // RELICS batch 6 (docs/RELICS.md "Batch 6"): the lantern, the burning,
  // the dive, the crown, the lens, the veil, the heart, and the three
  // curses (the seal, the dark, the crowns).
  const relic6Fx = createRelic6Fx({ kit, bus, byId, spray, flare, shock, after, anticipate, embersUp, camfx, N, rnd, mark, player, world, stage });
  // THE VFX TEMPLATES (design-VFX.md §11): magic, blade and sci-fi, played
  // over every hero beat above (registered last, so they draw on top).
  bus.on('champion_chest', () => chestPunch(0));
  const tplFx = createTemplateFx({ kit, tk, bus, byId, spray, after, camfx, rnd, mark, player, classOf, area: (id) => SKILL_AREA.get(id) ?? null, rigPoint: heroRigPoint, rigCenter: heroRigCenter, rigMoving: heroRigMoving });
  // The same templates on the enemies, champions and bosses (foefx.js).
  const foeFx = createFoeFx({ kit, tk, bus, byId, spray, after, camfx, rnd, mark, ink: INK, player });
  // Every projectile in flight, party and foe, in its template (boltfx.js).
  const boltFx = createBoltFx({ kit, tk, bus, byId, after, rnd, mark, world, player, heroTone: tplFx.boltTone });
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
  // victim id -> { tick, x, z }: the direction it was last hit (unit), read by
  // its death on the same tick (the kill burst's lean; `death` carries none).
  const lastHitDir = new Map();
  bus.on('hit', (ev) => {
    const atk = byId(ev.attacker);
    {
      let dx = ev.dirX || 0;
      let dz = ev.dirZ || 0;
      if (Math.hypot(dx, dz) < 1e-4 && atk && ev.x != null) {
        dx = ev.x - atk.x;
        dz = ev.z - atk.z;
      }
      const l = Math.hypot(dx, dz);
      if (l > 1e-4) {
        if (lastHitDir.size > 256) lastHitDir.clear();
        lastHitDir.set(ev.target, { tick: ev.tick, x: dx / l, z: dz / l });
      } else lastHitDir.delete(ev.target);
    }
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
    // k: a combo finisher's contact plays the local anime frame (one a cast).
    if (FINISHERS.has(ev.source) && animeTick.get(ev.attacker) !== ev.tick && sv.intensity.camera > 0) {
      animeTick.set(ev.attacker, ev.tick);
      animeFx.play(ev.x, ev.z);
    }
    classImpact(vfxClassStyle(cls), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit, big: ev.delivery !== 'basic' });
    if (ev.crit) flipbook.play(ev.x, 0.8, ev.z, CRIT_BOOK, ev.kind === 'boss' || ev.kind === 'stag' ? 1.4 : 1);
    spatter(ev, atk);
  });

  // D2 (VFX_HIT_RULES §6.2 m): a hit leaves a mess, in the body's own matter
  // colour (never red: Ember and the crimsons are taken). A splash on the
  // floor behind the body 2 frames on, then droplets back toward the hitter
  // from +3 frames, landing short of the body on its side. The splash stays
  // a few seconds; one per body every SPATTER.every s keeps the marks pool
  // for the skills.
  const SPATTER = Object.freeze({ drops: [8, 14], splash: 0.34, life: 3.5, every: 0.45, behind: 0.35 });
  const spatterAt = new Map(); // body id -> the time of its last splash
  const SPATTER_SOFT = new Set(['aura', 'burn', 'molten', 'thorns', 'kindle', 'sear', 'hazard']); // ticks, not blows
  sv.fxClock = 0; // s since boot (update)
  function spatter(ev, atk) {
    if (SPATTER_SOFT.has(ev.shape) || !(ev.amount > 0)) return;
    let dx = ev.dirX || 0;
    let dz = ev.dirZ || 0;
    if (Math.hypot(dx, dz) < 1e-4 && atk) {
      dx = ev.x - atk.x;
      dz = ev.z - atk.z;
    }
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) return;
    dx /= l;
    dz /= l;
    const matter = vfxMatterColor(vfxEnemyStyle(ev.kind).matter);
    const now = sv.fxClock;
    if (now - (spatterAt.get(ev.target) ?? -9) >= SPATTER.every) {
      spatterAt.set(ev.target, now);
      if (spatterAt.size > 128) spatterAt.clear();
      kit.mark({ x: ev.x + dx * SPATTER.behind, z: ev.z + dz * SPATTER.behind, radius: SPATTER.splash, kind: 'splash', angle: Math.atan2(dz, dx), stretch: 1.3, stain: matter, glow: null, life: SPATTER.life, opacity: 0.45, delay: 2 / 60 });
    }
    const x = ev.x;
    const z = ev.z;
    const n = Math.round(rnd(...SPATTER.drops));
    after(3 / 60, () => spray('shard', x, 0.5, z, n, { color: matter, tile: SHARD_TILE.drop, dir: { x: -dx, z: -dz }, dirBias: 0.85, speed: [1.6, 2.6], up: [0.6, 1.2], size: [0.04, 0.07], life: [0.35, 0.55], gravity: 7 }));
  }
  bus.on('death', (ev) => {
    if (ev.kind === 'player' || ev.kind === 'ally') return;
    // k and o: an elite, champion or boss kill plays the local anime frame
    // and punches the camera in up to 6% (C2), sprung back in 4 frames.
    const dead = byId(ev.id);
    if (dead && (dead.elite || dead.champion || ev.kind === 'stag' || isVfxBoss(ev.kind)) && sv.intensity.camera > 0) {
      animeFx.play(ev.x, ev.z);
      camfx.punch(CAM_PUNCH.bigKill, CAM_PUNCH.sec);
    }
    const killer = lastClassHit.get(ev.id) ?? null;
    lastClassHit.delete(ev.id);
    const lh = lastHitDir.get(ev.id);
    lastHitDir.delete(ev.id);
    const dir = lh && lh.tick === ev.tick ? { x: lh.x, z: lh.z } : null;
    if (ev.kind === 'stag') bossDeath(ev.x, ev.z);
    else if (isVfxBoss(ev.kind)) SF.KIT_BOSS_DEATH[ev.kind](ev.x, ev.z);
    else enemyDeath(ev.kind, ev.x, ev.z, killer, dir);
  });

  // ------------------------------------------------------------ enemies --
  // Glob / shot id -> the kind that threw it: a Rotcap's spore glob outlives
  // its body, and a Barrow Crow's feather darts trail differently.
  const globKind = new Map();
  const shotKind = new Map();
  const shotHue = new Map(); // eshot id -> its shooter's template hue
  bus.on('enemy_fire', (ev) => {
    const owner = byId(ev.id);
    if (owner && ev.shot != null && ENEMY_SHOT_TRAIL[owner.kind]) shotKind.set(ev.shot, owner.kind);
    // A shot glows in its shooter's hue, never Ember (Kesh's "Crimson
    // cores" pick): Ember is for the floor warnings.
    const hue = vfxFoeShotColor(owner ? (owner.telegraph && owner.telegraph.champion) || owner.kind : null);
    if (ev.shot != null) shotHue.set(ev.shot, hue);
    // The crow's caw flash and the Millwheel's fan are their own recipes.
    if (owner?.kind !== 'crow' && owner?.kind !== 'millwheel') {
      kit.flash({ x: ev.x, y: ESHOT_Y, z: ev.z, color: hue, size: 0.34, life: 0.12 });
      flare(ev.x + (ev.dx ?? 0) * 0.3, ESHOT_Y, ev.z + (ev.dz ?? 0) * 0.3, hue, 0.5, { life: 0.12, angle: Math.atan2(ev.dz ?? 0, ev.dx ?? 1) });
    }
  });
  bus.on('enemy_lob', (ev) => {
    const owner = byId(ev.id);
    const kind = byId(ev.glob)?.ownerKind ?? owner?.kind ?? 'toad';
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
    flare(ev.x, 0.3, ev.z, EMBER, 1.0, { kind: 'burst', life: 0.22 });
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
    const e = byId(ev.id);
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

  Object.assign(SF, createSigFirstBosses({ SF, CINDER, EARTH, N, SILT, WATER, bus, camfx, kit, mark, rnd, spray, unit2 }));

  Object.assign(SF, createSigFoes2({ sv, SF, ANTICIP, CREATURE_DEATH, N, SILT, after, bus, kit, mark, rnd, spray, unit2 }));

  Object.assign(SF, createSigFoes3({ SF, BRAMBLE: SF.BRAMBLE, CREATURE_DEATH, CRYSTAL: SF.CRYSTAL, DIRT: SF.DIRT, EARTH, HFLESH: SF.HFLESH, HV: SF.HV, HVP: SF.HVP, IRON: SF.IRON, N, WATER, after, bus, kit, mark, rnd, spray, unit2, world }));

  Object.assign(SF, createSigFoes4({ SF, ANTICIP, CREATURE_DEATH, N, after, bus, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2, world }));

  Object.assign(SF, createSigBosses({ SF, ANTICIP, BONEPLATE: SF.BONEPLATE, BRAMBLE: SF.BRAMBLE, CRYSTAL: SF.CRYSTAL, DIRT: SF.DIRT, HV: SF.HV, HVP: SF.HVP, IRON: SF.IRON, N, OAK: SF.OAK, SILT, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2 }));
  Object.assign(SF, createSigChampions({ SF, BRONZE: SF.BRONZE, CREATURE_DEATH, GUST: SF.GUST, KBRICK: SF.KBRICK, KGOLD: SF.KGOLD, KHEAT: SF.KHEAT, KSPARK: SF.KSPARK, N, SLAGC: SF.SLAGC, SSTONE: SF.SSTONE, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2 }));

  Object.assign(SF, createSigVaults({ SF, ANTICIP, after, bus, camfx, kit, mark, player, rnd, spray, world }));

  Object.assign(SF, createSigThirdBosses({ SF, DIRT: SF.DIRT, SILT, WATER, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2 }));

  Object.assign(SF, createSigLateBosses({ SF, ANTICIP, BRONZE: SF.BRONZE, CINDER, EARTH, HERON: SF.HERON, N, WATER, WYRM: SF.WYRM, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, s2Clock: SF.s2Clock, spray, unit2, world }));

  // ----------------------------------------------------------- per frame --
  // Projectile trails (held streaks that follow each bolt) and movement wakes.
  const trails = new Map(); // entity id -> { s, kind }
  const wakeClock = new Map(); // enemy id -> s since the last wake puff
  const trailFor = (e) => {
    const tideTrail = tide.trail(e);
    if (tideTrail) return tideTrail;
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
    if (e.kind === 'eshot') {
      const glow = shotHue.get(e.id) ?? vfxFoeShotColor(null);
      return { ...(ENEMY_SHOT_TRAIL[shotKind.get(e.id)] ?? { y: ESHOT_Y, len: 0.75, width: 0.12, core: PARCH, tailW: 0.15 }), glow };
    }
    return null;
  };
  sv.last = null;
  sv.updateMs = 0; // EMA of this director's own per-frame CPU cost (probes)

  Object.assign(SF, createSigAffixes({ SF, N, bus, camfx, kit, mark, rnd, spray }));

  function update(tSec) {
    const t0 = performance.now();
    updateBody(tSec);
    sv.updateMs += (performance.now() - t0 - sv.updateMs) * 0.1;
  }
  function updateBody(tSec) {
    const dt = sv.last === null ? 1 / 60 : Math.min(0.1, Math.max(0, tSec - sv.last));
    sv.last = tSec;
    const rdt = renderHold.rigDt(dt);
    for (let i = timers.length - 1; i >= 0; i--) {
      const tm = timers[i];
      tm.t -= tm.held ? rdt : dt;
      if (tm.t <= 0) {
        timers.splice(i, 1);
        tm.fn();
      }
    }
    if ((sv.biomeClock -= dt) <= 0) {
      sv.biomeClock = 1;
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
        if (k === 'skillbolt') tide.bolt(e, dt);
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
    SF.bossFrame(dt);
    for (const [id, rec] of trails) {
      if (seen.has(id)) continue;
      shotKind.delete(id);
      shotHue.delete(id);
      if (rec.s.owner === id) kit.release(rec.s, 0.12);
      if (rec.g && rec.g.owner === id) {
        kit.release(rec.g, 0.14);
        rec.g.owner = null;
      }
      trails.delete(id);
    }
    if (wakeClock.size > 64) wakeClock.clear();
    if (shotKind.size > 64) shotKind.clear();
    if (shotHue.size > 64) shotHue.clear();
    if (globKind.size > 64) globKind.clear();
    tide.frame(dt, world.entities());
    bellFx.frame(dt);
    duskFx.frame(dt, world.entities());
    tonicFx.frame(dt, world.entities());
    shrineFx.frame(dt, world.entities());
    relic6Fx.frame(dt, world.entities());
    boltFx.frame(dt, world.entities());
    tplFx.frame(dt, world.entities()); // T1: the traced slashes read the rigs' tips; every zone's AOE circle
    // The slash sweeps, flashes, stars, blazes and blasts hold through the
    // hitstop (render/hold.js); timers, trails and particles run on.
    kit.update(dt, renderHold);
    tk.update(dt, renderHold);
    animeFx.update(dt);
    flipbook.update(dt);
    sv.fxClock += dt;
  }

  // C1: a small kick against the fire direction on your own seat's shots
  // (the Archer's and the Healer's wait for Kesh, §6.3 item 7).
  const ownShotKick = (shooter, dx, dz) => {
    if (!shooter || !isOwnBody(shooter) || NO_SHOT_KICK.has(classOf(shooter) ?? 'healer')) return;
    camfx.kick(-(dx || 0), -(dz || 0), CAM_PUNCH.shotKick, 0.08);
  };
  bus.on('ally_basic', (ev) => {
    if (ev.shape !== 'melee_arc') ownShotKick(byId(ev.id), ev.dx, ev.dz);
  });
  bus.on('skill_bolt_spawn', (ev) => {
    const b = byId(ev.id);
    if (b && !ev.heal) ownShotKick(byId(b.sourceId), ev.dx, ev.dz);
  });

  // After every layer placed the camera this frame.
  function applyCamera(tSec) {
    camfx.apply(tSec);
  }

  Object.assign(SF, createSigRelics({ SF, CINDER, N, after, bus, camfx, kit, mark, player, rnd, spray }));

  function levelTeardown() {
    trails.clear();
    wakeClock.clear();
    timers.length = 0;
    sv.biomeClock = 0;
    globKind.clear();
    shotKind.clear();
    SF.bossMode.clear();
    SF.s2Clock.clear();
    lastClassHit.clear();
    swingSide.clear();
    camfx.clear();
    animeFx.clear();
    flipbook.clear();
    animeTick.clear();
    spatterAt.clear();
    relic6Fx.teardown();
    tplFx.teardown();
    foeFx.teardown();
    boltFx.teardown();
    return kit.clear() + tk.clear();
  }
  bus.on('level_transit', levelTeardown);
  bus.on('run_end', levelTeardown);
  bus.on('return_to_camp', levelTeardown);
  bus.on('state_restored', levelTeardown);

  function prewarm() {
    kit.prewarm(stage.scene);
    tk.prewarm(stage.scene);
  }

  function debugCounts() {
    return { ...kit.counts(), tpl: tk.counts(), zoneCircles: tplFx.zoneCircles().length, zoneCircleList: tplFx.zoneCircles(), foe: foeFx.counts(), bolt: boltFx.counts(), recipes: { ...fired }, updateMs: Math.round(sv.updateMs * 1000) / 1000, trails: trails.size, tempered: shrineFx.debug(), camera: camfx.offset(), cameraLive: camfx.live(), effects: settings?.get?.('gameplay.effects') ?? 'full' };
  }

  return { update, applyCamera, prewarm, debugCounts, kit, camfx, showcase: (id, at) => tplFx.showcase(id, at), foeShowcase: (kind, at) => foeFx.showcase(kind, at), boltShowcase: (names, at) => boltFx.showcase(names, at) };
}
