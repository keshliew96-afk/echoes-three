// HIT FEEDBACK (docs/HIT_FEEDBACK.md): what a hit on the character YOU play
// sounds like. Registered on the engine like the boss and heart cues
// (engine.registerCue / registerEventCue): procedural, no files, spatial on
// the SFX bus. Listen-only: event payloads in, cues out, so the goldens
// cannot move.
//   hurt_heavy  a heavy blow: a deeper body thud with a crack of breath and a
//               low thump under it (a hit that takes HEAVY_FRAC of the bar)
//   hurt_soft   damage over time and the floor: a muffled, quiet tick that
//               never stacks into a rattle (long cooldown)
//   hurt_down   the hit that downs you: a falling heartbeat and a dull ring
// Light hits keep the built-in party thud (`hurt`, src/audio/cues.js), and
// an ally's hit keeps it too. With Settings ▸ Gameplay ▸ Hit feedback off
// every party hit plays the built-in thud, as before.
import { HIT_FEEDBACK_KEY, hitTier, isOwnBody } from '../render/vfx/hitfeedback.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only hitcues --write.
export const HIT_CUE_CAL = {
  // @cal begin
  hurt_heavy: 1,
  hurt_soft: -5,
  hurt_down: -1.5,
  // @cal end
};

const CUES = {
  hurt_heavy: { levelDb: -6, priority: 4, maxVoices: 2, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 150), f1: P(p, 52), d: 0.24, gain: 1 }),
      k.noise(d, t, { type: 'lowpass', f0: 1300, f1: 300, q: 0.9, d: 0.16, gain: 0.75 }),
      k.noise(d, t + 0.01, { type: 'bandpass', f0: P(p, 2600), f1: P(p, 900), q: 1.4, d: 0.07, gain: 0.45 }),
      k.tone(d, t + 0.03, { type: 'triangle', f0: P(p, 62), f1: P(p, 40), d: 0.3, gain: 0.55 })
    ) },
  hurt_soft: { levelDb: -16, priority: 2, maxVoices: 1, cooldownMs: 320, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 160), f1: P(p, 110), d: 0.08, gain: 0.6 }),
      k.noise(d, t, { type: 'lowpass', f0: 700, q: 0.7, d: 0.07, gain: 0.5 })
    ) },
  hurt_down: { levelDb: -6.5, priority: 5, maxVoices: 1, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 80), f1: P(p, 44), d: 0.22, gain: 0.85 }),
      k.tone(d, t + 0.32, { f0: P(p, 70), f1: P(p, 38), d: 0.26, gain: 0.7 }),
      k.tone(d, t + 0.05, { type: 'triangle', f0: P(p, 392), f1: P(p, 196), a: 0.02, d: 0.9, gain: 0.3 }),
      k.tone(d, t + 0.05, { type: 'triangle', f0: P(p, 466.2), f1: P(p, 233.1), a: 0.02, d: 0.9, gain: 0.2 }),
      k.noise(d, t, { type: 'lowpass', f0: 900, f1: 200, q: 0.8, a: 0.01, d: 0.4, gain: 0.4 })
    ) },
};
export const HIT_CUE_IDS = Object.keys(CUES);

// The tier's cue for a live hit on your own character, or null (the built-in
// party thud plays).
const TIER_CUE = { heavy: 'hurt_heavy', soft: 'hurt_soft', down: 'hurt_heavy' };

export function createHitEventCues({ world, settings = null }) {
  const byId = (id) => {
    if (id == null) return null;
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const on = () => settings?.get?.(HIT_FEEDBACK_KEY) !== false;
  return {
    hit: (ev) => {
      if (!ev || (ev.kind !== 'player' && ev.kind !== 'ally') || !on()) return null;
      const target = byId(ev.target);
      if (!isOwnBody(target)) return null;
      const cue = TIER_CUE[hitTier(ev, target, byId(ev.attacker))];
      if (!cue) return null;
      const out = [{ cue, x: ev.x, z: ev.z }];
      if (ev.crit) out.push({ cue: 'crit', x: ev.x, z: ev.z });
      return out;
    },
    // Your own fall adds its own sting over the built-in downed thud.
    downed: (ev) => {
      if (!on()) return null;
      const target = byId(ev.id);
      if (!isOwnBody(target)) return null;
      return [{ cue: 'downed', x: ev.x, z: ev.z }, { cue: 'hurt_down', x: ev.x, z: ev.z }];
    },
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerHitCues(engine, { world, settings = null } = {}) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: HIT_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  if (world) for (const [type, fn] of Object.entries(createHitEventCues({ world, settings }))) engine.registerEventCue(type, fn);
  return HIT_CUE_IDS.length;
}
