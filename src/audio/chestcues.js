// THE CHEST BEAT'S SOUNDS (VFX_HIT_RULES §6.2 i, render/interactables/
// chestbeat.js): one sound per layer of a reward chest's opening, on the
// beat's own clock. Registered on the engine like the impact families
// (engine.registerCue / registerEventCue): procedural, no files, spatial on
// the SFX bus. Listen-only: event payloads in, cues out, so the goldens
// cannot move. They play beside each chest's own cue (vk_open, sr_relic,
// sr_cache, ch_chest), which stays as it is.
//   cb_tremble  the press: a creak and a rattle that tighten into the snap
//   cb_snap     the snap: a hard wooden clack, the lid flung back
//   cb_shine    the light from inside: a soft rising shimmer
//   cb_lock     the padlock hits the floor (CHEST_BEAT.lockLand) and settles
//   cb_stars    the stars popping one at a time (STAR_POP_TIMES): small tings
// A press chest (the vault chest, the reliquary, the cache) snaps
// CHEST_BEAT.snap after its event; the champion chest snaps on its event, so
// its layers are their own cue ids with no lead (the `_now` set). The
// Trapped Chest is not a reward: it keeps its own sounds.
import { CHEST_BEAT, STAR_POP_TIMES } from '../render/interactables/chestbeat.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only chestcues --write.
// A press chest's layer is its `_now` layer CHEST_BEAT.snap later (past the
// measuring window), so it takes the `_now` layer's figure.
export const CHEST_CUE_CAL = {
  // @cal begin
  cb_tremble: -16.8,
  cb_snap_now: -0.6,
  cb_shine_now: -1.6,
  cb_lock_now: -7.3,
  cb_stars_now: -6.1,
  // @cal end
};

// Each layer: (k, t, d, p) at the snap time t (the lead is added per id).
const LAYERS = {
  snap: { levelDb: -8, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2100), f1: P(p, 1300), q: 2.4, d: 0.05, gain: 1 }),
      k.tone(d, t, { f0: P(p, 150), f1: P(p, 82), d: 0.16, gain: 0.8 }),
      k.noise(d, t + 0.03, { src: 'brown', type: 'lowpass', f0: 700, f1: 260, q: 0.7, d: 0.14, gain: 0.4 })
    ) },
  shine: { levelDb: -14, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t + 0.04, { type: 'triangle', f0: P(p, 880), f1: P(p, 1320), a: 0.08, d: 0.7, gain: 0.6 }),
      k.tone(d, t + 0.1, { type: 'triangle', f0: P(p, 1320), f1: P(p, 1980), a: 0.1, d: 0.6, gain: 0.4, detune: 9 }),
      k.noise(d, t + 0.05, { type: 'highpass', f0: P(p, 6200), q: 0.6, a: 0.1, d: 0.8, gain: 0.25 })
    ) },
  lock: { levelDb: -15, fn: (k, t, d, p) => {
    const t0 = t + CHEST_BEAT.lockLand;
    return Math.max(
      k.tone(d, t0, { type: 'square', f0: P(p, 1850), f1: P(p, 1700), d: 0.05, gain: 0.35 }),
      k.noise(d, t0, { type: 'bandpass', f0: P(p, 3600), q: 3, d: 0.03, gain: 0.6 }),
      k.tone(d, t0 + CHEST_BEAT.lockSettle * 0.6, { type: 'square', f0: P(p, 1900), f1: P(p, 1750), d: 0.03, gain: 0.18 })
    );
  } },
  stars: { levelDb: -17, fn: (k, t, d, p) => {
    let end = t;
    STAR_POP_TIMES.forEach((at, i) => {
      const f = 1568 * Math.pow(2, ((i * 5) % 12) / 12);
      end = Math.max(end, k.tone(d, t + at + CHEST_BEAT.popSwell, { type: 'sine', f0: P(p, f), f1: P(p, f * 1.01), d: 0.14, gain: 0.5 }));
    });
    return end;
  } },
};
const TREMBLE = { levelDb: -18, fn: (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 320), f1: P(p, 620), q: 3, a: 0.06, d: CHEST_BEAT.snap, gain: 0.8 }),
    k.noise(d, t + CHEST_BEAT.finish, { type: 'bandpass', f0: P(p, 1400), f1: P(p, 2200), q: 5, a: 0.2, d: CHEST_BEAT.snap - CHEST_BEAT.finish, gain: 0.4 })
  ) };

const CUES = { cb_tremble: TREMBLE };
for (const [name, def] of Object.entries(LAYERS)) {
  CUES[`cb_${name}`] = { ...def, fn: (k, t, d, p) => def.fn(k, t + CHEST_BEAT.snap, d, p) };
  CUES[`cb_${name}_now`] = def;
}
export const CHEST_CUE_IDS = Object.keys(CUES);
const PRESS_SET = ['cb_tremble', 'cb_snap', 'cb_shine', 'cb_lock', 'cb_stars'];
const NOW_SET = ['cb_snap_now', 'cb_shine_now', 'cb_lock_now', 'cb_stars_now'];

const at = (ev) => (Number.isFinite(ev.x) ? { x: ev.x, z: ev.z } : {});
export const CHEST_EVENT_CUES = {
  vault_open: (ev) => PRESS_SET.map((cue) => ({ cue, ...at(ev) })),
  secret_take: (ev) => (ev.content === 'relic' || ev.content === 'tonics' ? PRESS_SET.map((cue) => ({ cue, ...at(ev) })) : null),
  champion_chest: (ev) => NOW_SET.map((cue) => ({ cue, ...at(ev) })),
};

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerChestCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { bus: 'sfx', priority: 3, maxVoices: 2, cooldownMs: 200, calDb: CHEST_CUE_CAL[id] ?? CHEST_CUE_CAL[`${id}_now`] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(CHEST_EVENT_CUES)) engine.registerEventCue(type, fn);
  return CHEST_CUE_IDS.length;
}
