// Act IV (docs/ACT_IV.md): the Hollow Heart's creatures' own voices —
// registered on the engine like the boss cues (engine.registerCue /
// registerEventCue): procedural voices on the engine's own kit, no files,
// spatial on the SFX bus. Listen-only: event payloads in, cues out, so the
// goldens cannot move.
//   hx_surge   the husks' heartbeat surge: one chest-deep thump and a rasp
//              (many husks surge on the same tick; one voice, a cooldown)
//   hx_lance   the Vein Lancer's lance: a cracking zap that tears down the lane
//   hx_slam    the Geode Brute's slam: a stone boom with glass breaking in it
//   hx_shard   a crystal shard landing: a bright shatter
//   hx_gather  the Censer gathering: a rising, breathy glass whine
//   hx_mend    the Censer's mend: a soft, low chord swell (it heals THEM)
//   hx_spill   a stunned Censer spills its coals: a sputter
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

const CUES = {
  hx_surge: { levelDb: -12, priority: 2, maxVoices: 1, cooldownMs: 900, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 38), d: 0.3, gain: 1 }),
      k.tone(d, t + 0.22, { f0: P(p, 60), f1: P(p, 34), d: 0.26, gain: 0.6 }),
      k.noise(d, t + 0.02, { type: 'bandpass', f0: P(p, 700), f1: P(p, 1300), q: 2, a: 0.04, d: 0.3, gain: 0.25 })
    ) },
  hx_lance: { levelDb: -8, priority: 4, maxVoices: 2, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 1900), f1: P(p, 160), d: 0.22, gain: 0.5, filter: { f0: 3400, q: 1.2 } }),
      k.noise(d, t, { f0: P(p, 5200), f1: P(p, 1100), q: 1.6, d: 0.28, gain: 0.9 }),
      k.tone(d, t + 0.01, { f0: P(p, 140), f1: P(p, 60), d: 0.2, gain: 0.55 })
    ) },
  hx_slam: { levelDb: -7, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 96), f1: P(p, 36), d: 0.5, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 900, f1: 180, q: 0.8, d: 0.45, gain: 0.8 }),
      k.noise(d, t + 0.03, { f0: P(p, 6000), f1: P(p, 3000), q: 4, d: 0.4, gain: 0.35 }),
      k.bell(d, t + 0.02, { f: P(p, 1480), ratio: 5.04, index: 1.6, d: 0.6, gain: 0.25 })
    ) },
  hx_shard: { levelDb: -12, priority: 3, maxVoices: 3, cooldownMs: 40, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 6400), f1: P(p, 3600), q: 5, d: 0.22, gain: 1 }),
      k.bell(d, t, { f: P(p, 2200), ratio: 5.04, index: 1.2, d: 0.35, gain: 0.35 }),
      k.tone(d, t, { f0: P(p, 220), f1: P(p, 110), d: 0.08, gain: 0.3 })
    ) },
  hx_gather: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'triangle', f0: P(p, 440), f1: P(p, 990), a: 0.4, d: 0.8, gain: 0.45 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2600), f1: P(p, 4800), q: 6, a: 0.5, d: 0.8, gain: 0.35 })
    ) },
  hx_mend: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.pad(d, t, { notes: [P(p, 138.6), P(p, 207.7), P(p, 277.2)], dur: 0.6, a: 0.06, r: 0.8, gain: 0.6, formant: 640, type: 'sawtooth' }),
      k.bell(d, t, { f: P(p, 554), ratio: 5.04, index: 0.8, d: 1.0, gain: 0.3 })
    ) },
  hx_spill: { levelDb: -13, priority: 2, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2200), q: 0.9, d: 0.35, gain: 1 }),
      k.tone(d, t, { f0: P(p, 600), f1: P(p, 200), d: 0.2, gain: 0.35 })
    ) },
};

export const HEART_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];

export function createHeartEventCues() {
  return {
    husk_surge: (ev, h) => one('hx_surge', at(ev, h, ev.id)),
    lancer_lance: (ev, h) => one('hx_lance', at(ev, h, ev.id)),
    geode_slam: (ev, h) => one('hx_slam', at(ev, h, ev.id)),
    // A shard's landing replaces the generic splash; other globs fall through.
    enemy_glob_land: (ev, h) => (ev.shard ? one('hx_shard', at(ev, h)) : null),
    censer_gather: (ev, h) => one('hx_gather', at(ev, h, ev.id)),
    censer_mend: (ev, h) => one('hx_mend', at(ev, h, ev.id)),
    censer_spill: (ev, h) => one('hx_spill', at(ev, h, ev.id)),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerHeartCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createHeartEventCues())) engine.registerEventCue(type, fn);
  return HEART_CUE_IDS.length;
}
