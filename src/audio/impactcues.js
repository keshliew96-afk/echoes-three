// THE CAST AND THE SHOT (VFX_HIT_RULES §6.2 g, docs/HIT_FEEDBACK.md): the
// sound families of a hit and a shot. Registered on the engine like the
// Tidecaller's (engine.registerCue / registerEventCue): procedural, no
// files, spatial on the SFX bus. Listen-only: event payloads in, cues out,
// so the goldens cannot move.
//   imp_boom   a spell landing on a foe: a sub thump and a body under a short
//              high crack, a 0.3 s tail (A3, v3 and v6)
//   imp_thunk  an arrow or bolt landing: a dull wooden knock (A3, A4)
//   imp_cut    a blade landing: a bright cut over a low boom that falls away
//              in about 240 ms (A3, v8)
//   cast_whoosh  a spell leaving the hand: a breathy low rush, gone by
//              mid-flight (A2, v3)
//   shot_whiz  a shot in flight, from 1 frame after it leaves: a falling air
//              whistle (A4). Only your own seat's shots and foe shots that
//              pass near your hero whiz, so a busy room does not hiss.
//   wall_ping  a shot stopping on a wall or a blocker (A4)
// The families replace the built-in `impact` snap on a party hit on a foe
// (they keep a snap of their own) and share its first-of-the-tick slot
// (engine FRAME_BUDGET.firstPerTick). Each plays with about ±6% pitch (A5).
// The Tidecaller keeps her own water voices (src/audio/tidecues.js).
import { vfxSpellHit, vfxSkillClass, vfxTemplateFor, VFX_HEAL_SKILLS } from '../data/vfx.js';
import { isOwnBody } from '../render/vfx/hitfeedback.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

export const IMPACT_SOUND = Object.freeze({
  jitter: 0.06, // A5: about ±1 semitone
  whizNear: 1.6, // u: a foe shot whizzes when its line passes this close to your hero
  whizReach: 10, // u: ...within this far of its shooter
});

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only impactcues --write.
export const IMPACT_CUE_CAL = {
  // @cal begin
  imp_boom: 5.1,
  imp_thunk: -0.6,
  imp_cut: 1.6,
  cast_whoosh: -6.8,
  shot_whiz: -6.9,
  wall_ping: -2.1,
  // @cal end
};

const CUES = {
  imp_boom: { slot: 'hit', levelDb: -7, priority: 2, maxVoices: 4, cooldownMs: 30, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 44), d: 0.32, gain: 1 }),
      k.tone(d, t, { type: 'triangle', f0: P(p, 122), f1: P(p, 96), d: 0.18, gain: 0.5 }),
      k.noise(d, t, { type: 'highpass', f0: P(p, 5200), q: 0.7, d: 0.045, gain: 0.55 }),
      k.noise(d, t + 0.01, { src: 'brown', type: 'lowpass', f0: 900, f1: 220, q: 0.8, d: 0.3, gain: 0.45 })
    ) },
  imp_thunk: { slot: 'hit', levelDb: -9, priority: 2, maxVoices: 4, cooldownMs: 30, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 190), f1: P(p, 92), d: 0.09, gain: 0.9 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 950), f1: P(p, 600), q: 2.2, d: 0.06, gain: 0.8 }),
      k.noise(d, t, { f0: P(p, 2600), q: 1.2, d: 0.025, gain: 0.35 })
    ) },
  imp_cut: { slot: 'hit', levelDb: -8, priority: 2, maxVoices: 4, cooldownMs: 30, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3400), f1: P(p, 1500), q: 1.6, d: 0.07, gain: 0.9 }),
      k.tone(d, t, { f0: P(p, 58), f1: P(p, 46), d: 0.24, gain: 0.85 }),
      k.tone(d, t, { type: 'square', f0: P(p, 260), f1: P(p, 160), d: 0.04, gain: 0.25 })
    ) },
  cast_whoosh: { slot: 'whoosh', levelDb: -16, priority: 1, maxVoices: 2, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 240), f1: P(p, 520), q: 0.6, a: 0.03, d: 0.33, gain: 1 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 1600), q: 0.9, a: 0.02, d: 0.16, gain: 0.35 })
    ) },
  shot_whiz: { slot: 'whoosh', levelDb: -20, priority: 1, maxVoices: 2, cooldownMs: 70, fn: (k, t, d, p) =>
    k.noise(d, t + 0.017, { type: 'bandpass', f0: P(p, 4200), f1: P(p, 2300), q: 3, a: 0.04, d: 0.2, gain: 1 }) },
  wall_ping: { slot: 'technique', levelDb: -16, priority: 1, maxVoices: 3, cooldownMs: 50, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 2400), f1: P(p, 2150), d: 0.12, gain: 0.7 }),
      k.noise(d, t, { f0: P(p, 3800), q: 2, d: 0.02, gain: 0.4 })
    ) },
};
export const IMPACT_CUE_IDS = Object.keys(CUES);

const PARTY = new Set(['player', 'ally']);

// The family for a hit (null: the built-in cue plays). atk is the attacker's
// body, or null.
export function impactFamily(ev, atk) {
  if (!ev || PARTY.has(ev.kind)) return null;
  if (ev.delivery !== 'basic' && ev.delivery !== 'skill') return null;
  if (atk && atk.faction === 'hostile') return null;
  if (ev.attacker == null) return null; // relic procs and hazards
  const cls = (atk && (atk.classId || (atk.kind === 'player' ? 'healer' : null))) ?? vfxSkillClass(ev.source);
  if (cls === 'tidecaller') return null; // her own water voices
  if (vfxSpellHit(ev, atk)) return 'imp_boom';
  if (ev.shape === 'projectile') return 'imp_thunk';
  const skill = ev.source && !/_basic$/.test(ev.source) ? ev.source : `${cls}_basic`;
  if (cls && vfxTemplateFor(cls, skill) === 'blade') return 'imp_cut';
  return null;
}

// A spell cast that whooshes (A2): a magic skill that is not a heal.
export function castWhooshes(classId, skill) {
  if (!skill || VFX_HEAL_SKILLS.has(skill) || classId === 'tidecaller') return false;
  const cls = classId ?? vfxSkillClass(skill);
  return !!cls && vfxTemplateFor(cls, skill) === 'magic';
}

// Does a foe shot's line from (x, z) along (dx, dz) pass near (hx, hz)?
export function passesNear(x, z, dx, dz, hx, hz, near = IMPACT_SOUND.whizNear, reach = IMPACT_SOUND.whizReach) {
  const l = Math.hypot(dx, dz);
  if (!(l > 1e-6)) return false;
  const ux = dx / l;
  const uz = dz / l;
  const along = (hx - x) * ux + (hz - z) * uz;
  if (along < 0 || along > reach) return false;
  return Math.abs((hx - x) * uz - (hz - z) * ux) <= near;
}

export function createImpactEventCues({ world, defaults }) {
  const byId = (id) => {
    if (id == null) return null;
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const ownHero = () => {
    for (const e of world.entities()) if (isOwnBody(e)) return e;
    return null;
  };
  const jit = IMPACT_SOUND.jitter;
  // A cast handler must return the built-in cue too: a non-null result
  // replaces it.
  const withWhoosh = (type, ev, h, classId, skill) => {
    if (!castWhooshes(classId, skill)) return null;
    const base = defaults && defaults[type] ? defaults[type](ev, h) : null;
    const out = Array.isArray(base) ? base.slice() : base ? [base] : [];
    const at = ev.x != null ? { x: ev.x, z: ev.z } : {};
    out.push({ cue: 'cast_whoosh', ...at, jitter: jit });
    return out;
  };
  return {
    hit: (ev) => {
      const fam = impactFamily(ev, byId(ev.attacker));
      if (!fam) return null;
      const boss = ev.kind === 'boss' || ev.kind === 'stag';
      const out = [{ cue: fam, x: ev.x, z: ev.z, pitch: boss ? 0.85 : 1, jitter: jit }];
      if (ev.crit) out.push({ cue: 'crit', x: ev.x, z: ev.z });
      return out;
    },
    skill_cast: (ev, h) => {
      let pl = null;
      for (const e of world.entities()) if (e.kind === 'player') pl = e;
      return withWhoosh('skill_cast', ev, h, pl ? pl.classId ?? 'healer' : null, ev.skill);
    },
    ally_cast: (ev, h) => withWhoosh('ally_cast', ev, h, ev.classId, ev.skill),
    basic_fire: () => {
      const me = ownHero();
      return me && me.kind === 'player' ? [{ cue: 'shot_whiz', x: me.x, z: me.z }] : null;
    },
    ally_basic: (ev, h) => {
      if (ev.shape === 'melee_arc' || ev.classId === 'tidecaller') return null;
      const a = byId(ev.id);
      if (!isOwnBody(a)) return null;
      const base = defaults && defaults.ally_basic ? defaults.ally_basic(ev, h) : null;
      return [...(Array.isArray(base) ? base : base ? [base] : []), { cue: 'shot_whiz', x: ev.x, z: ev.z }];
    },
    enemy_fire: (ev, h) => {
      const me = ownHero();
      if (!me || !passesNear(ev.x, ev.z, ev.dx, ev.dz, me.x, me.z)) return null;
      const base = defaults && defaults.enemy_fire ? defaults.enemy_fire(ev, h) : null;
      return [...(Array.isArray(base) ? base : base ? [base] : []), { cue: 'shot_whiz', x: me.x, z: me.z, pitch: 0.85 }];
    },
    projectile_despawn: (ev) => {
      if (ev.cause !== 'wall' && ev.cause !== 'blocked') return null;
      const b = byId(ev.id); // still in the registry as its event goes out
      return b ? [{ cue: 'wall_ping', x: b.x, z: b.z, jitter: jit }] : [{ cue: 'wall_ping', jitter: jit }];
    },
    skill_bolt_despawn: (ev) => (!ev.heal && (ev.cause === 'wall' || ev.cause === 'blocked') ? [{ cue: 'wall_ping', x: ev.x, z: ev.z, jitter: jit }] : null),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerImpactCues(engine, { world, defaults = null } = {}) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { calDb: IMPACT_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  if (world) for (const [type, fn] of Object.entries(createImpactEventCues({ world, defaults }))) engine.registerEventCue(type, fn);
  return IMPACT_CUE_IDS.length;
}
