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
import { VFX_BIOME } from '../../data/palette.js';
import { vfxClassStyle, vfxSkillClass, vfxEnemyStyle, vfxMatterColor, vfxBossStyle, vfxFoeShotColor, VFX_INTENSITY } from '../../data/vfx.js';
import { TELL_INDIGO_GLOW } from '../enemies/style.js';
import { impactFx } from './hub.js';
import { SHARD_TILE } from './particles.js';
import { createVfxKit } from './kit.js';
import { createTemplateKit } from './tplkit.js';
import { createCameraFx } from './camerafx.js';
import { renderHold } from '../hold.js';
import { createAnimeFx } from './animefx.js';
import { createFlipbook } from './flipbook.js';
import { SKILLS } from '../../sim/skills.js';
import { isOwnBody } from './hitfeedback.js';

import { EMBER, PARCH, BONE, HEAL, INK, TAU, BOLT_Y, ESHOT_Y, TRAIL_SPEED, ENEMY_SHOT_TRAIL, CONTACT_FX, KILL_FX } from './sig/common.js';
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
import { createSigFoes } from './sig/foes.js';
import { createSigParty } from './sig/party.js';

export function createSignatureFx({ stage, world, bus, cosmetic, settings = null }) {
  const sv = {}; // the director's mutable state (one object, shared with its parts under vfx/sig/)
  const SF = {}; // the director's functions, shared with its parts (filled below)
  Object.assign(SF, { anticipate, byId, classImpact, classMark, classOf, embersUp, enemyDeath, enemyImpact, flare, healBloom, nova, release, shock, swing }); // the director's own functions its parts call
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
    if (SF.CREATURE_DEATH[kind]) SF.CREATURE_DEATH[kind](es, matter, x, z);
    // The finishing class leaves its signature on the kill.
    if (killerClass) {
      const st = vfxClassStyle(killerClass);
      kit.light({ x, z, radius: 0.8, color: st.glow, opacity: st.light.opacity, life: 0.3 });
      if (st.shape === 'sharp') kit.flash({ x, y: 0.55, z, color: st.second, size: 0.55, life: 0.16 });
    }
  }

  Object.assign(SF, createSigParty({ sv, SF, ANTICIP, BOSS_HIT, CAM_PUNCH, CRIT_BOOK, FINISHERS, N, after, animeFx, animeTick, bus, camfx, flareKind, flipbook, kit, mark, player, rnd, spray, stage, tk, world }));

  Object.assign(SF, createSigFoes({ SF, N, bus, camfx, kit, mark, rnd, spray, world }));

  Object.assign(SF, createSigFirstBosses({ SF, CINDER: SF.CINDER, EARTH: SF.EARTH, N, SILT: SF.SILT, WATER: SF.WATER, bus, camfx, kit, mark, rnd, spray, unit2: SF.unit2 }));

  Object.assign(SF, createSigFoes2({ sv, SF, ANTICIP, CREATURE_DEATH: SF.CREATURE_DEATH, N, SILT: SF.SILT, after, bus, kit, mark, rnd, spray, unit2: SF.unit2 }));

  Object.assign(SF, createSigFoes3({ SF, BRAMBLE: SF.BRAMBLE, CREATURE_DEATH: SF.CREATURE_DEATH, CRYSTAL: SF.CRYSTAL, DIRT: SF.DIRT, EARTH: SF.EARTH, HFLESH: SF.HFLESH, HV: SF.HV, HVP: SF.HVP, IRON: SF.IRON, N, WATER: SF.WATER, after, bus, kit, mark, rnd, spray, unit2: SF.unit2, world }));

  Object.assign(SF, createSigFoes4({ SF, ANTICIP, CREATURE_DEATH: SF.CREATURE_DEATH, N, after, bus, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2: SF.unit2, world }));

  Object.assign(SF, createSigBosses({ SF, ANTICIP, BONEPLATE: SF.BONEPLATE, BRAMBLE: SF.BRAMBLE, CRYSTAL: SF.CRYSTAL, DIRT: SF.DIRT, HV: SF.HV, HVP: SF.HVP, IRON: SF.IRON, N, OAK: SF.OAK, SILT: SF.SILT, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2: SF.unit2 }));
  Object.assign(SF, createSigChampions({ SF, BRONZE: SF.BRONZE, CREATURE_DEATH: SF.CREATURE_DEATH, GUST: SF.GUST, KBRICK: SF.KBRICK, KGOLD: SF.KGOLD, KHEAT: SF.KHEAT, KSPARK: SF.KSPARK, N, SLAGC: SF.SLAGC, SSTONE: SF.SSTONE, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2: SF.unit2 }));

  Object.assign(SF, createSigVaults({ SF, ANTICIP, after, bus, camfx, kit, mark, player, rnd, spray, world }));

  Object.assign(SF, createSigThirdBosses({ SF, DIRT: SF.DIRT, SILT: SF.SILT, WATER: SF.WATER, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, spray, unit2: SF.unit2 }));

  Object.assign(SF, createSigLateBosses({ SF, ANTICIP, BRONZE: SF.BRONZE, CINDER: SF.CINDER, EARTH: SF.EARTH, HERON: SF.HERON, N, WATER: SF.WATER, WYRM: SF.WYRM, after, bus, camfx, faceOf: SF.faceOf, kit, mark, rnd, s2Clock: SF.s2Clock, spray, unit2: SF.unit2, world }));

  // ----------------------------------------------------------- per frame --
  // Projectile trails (held streaks that follow each bolt) and movement wakes.
  const trails = new Map(); // entity id -> { s, kind }
  const wakeClock = new Map(); // enemy id -> s since the last wake puff
  const trailFor = (e) => {
    const tideTrail = SF.tide.trail(e);
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
      const glow = SF.shotHue.get(e.id) ?? vfxFoeShotColor(null);
      return { ...(ENEMY_SHOT_TRAIL[SF.shotKind.get(e.id)] ?? { y: ESHOT_Y, len: 0.75, width: 0.12, core: PARCH, tailW: 0.15 }), glow };
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
        if (k === 'skillbolt') SF.tide.bolt(e, dt);
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
      SF.shotKind.delete(id);
      SF.shotHue.delete(id);
      if (rec.s.owner === id) kit.release(rec.s, 0.12);
      if (rec.g && rec.g.owner === id) {
        kit.release(rec.g, 0.14);
        rec.g.owner = null;
      }
      trails.delete(id);
    }
    if (wakeClock.size > 64) wakeClock.clear();
    if (SF.shotKind.size > 64) SF.shotKind.clear();
    if (SF.shotHue.size > 64) SF.shotHue.clear();
    if (SF.globKind.size > 64) SF.globKind.clear();
    SF.tide.frame(dt, world.entities());
    SF.bellFx.frame(dt);
    SF.duskFx.frame(dt, world.entities());
    SF.tonicFx.frame(dt, world.entities());
    SF.shrineFx.frame(dt, world.entities());
    SF.relic6Fx.frame(dt, world.entities());
    SF.boltFx.frame(dt, world.entities());
    SF.tplFx.frame(dt, world.entities()); // T1: the traced slashes read the rigs' tips; every zone's AOE circle
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

  Object.assign(SF, createSigRelics({ SF, CINDER: SF.CINDER, N, after, bus, camfx, kit, mark, player, rnd, spray }));

  function levelTeardown() {
    trails.clear();
    wakeClock.clear();
    timers.length = 0;
    sv.biomeClock = 0;
    SF.globKind.clear();
    SF.shotKind.clear();
    SF.bossMode.clear();
    SF.s2Clock.clear();
    SF.lastClassHit.clear();
    swingSide.clear();
    camfx.clear();
    animeFx.clear();
    flipbook.clear();
    animeTick.clear();
    SF.spatterAt.clear();
    SF.relic6Fx.teardown();
    SF.tplFx.teardown();
    SF.foeFx.teardown();
    SF.boltFx.teardown();
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
    return { ...kit.counts(), tpl: tk.counts(), zoneCircles: SF.tplFx.zoneCircles().length, zoneCircleList: SF.tplFx.zoneCircles(), foe: SF.foeFx.counts(), bolt: SF.boltFx.counts(), recipes: { ...fired }, updateMs: Math.round(sv.updateMs * 1000) / 1000, trails: trails.size, tempered: SF.shrineFx.debug(), camera: camfx.offset(), cameraLive: camfx.live(), effects: settings?.get?.('gameplay.effects') ?? 'full' };
  }

  return { update, applyCamera, prewarm, debugCounts, kit, camfx, showcase: (id, at) => SF.tplFx.showcase(id, at), foeShowcase: (kind, at) => SF.foeFx.showcase(kind, at), boltShowcase: (names, at) => SF.boltFx.showcase(names, at) };
}
