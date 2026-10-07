// Audio cues for the M4b world content (docs/gauntlet/PLAN.md §3.5 "M4a/M4b
// register cues for their new events with registerEventCue in their own
// files"). Procedural voices on the engine's own kit (src/audio/voices.js:
// tone / noise / bell), every one spatial at its event's position on the SFX
// bus, gain-staged under the engine's rules (SFX peaks <= -6 dBFS pre-bus:
// `calDb` = each recipe's measured design peak at unity, measured with
// __echoes.audio.measureCue — tools/gntM4b-cuecal.mjs).
//
// Existing events keep their built-in cues (telegraph_start / resolve, hit,
// broken, heal ...). New events get their own: charge roll + wall thud, lob +
// splash, swoop, the horn-guard TINK, burrow + erupt, slam, spore burst,
// millrace surge, rockfall, gravefire roar, keg fuse + blast, the Warding Bell
// toll, the sluice clunk, the dewfont draw, and a soft warning tick for the
// non-player-targeted hazard telegraphs (rockfall already rings the built-in
// telegraph cue through its `telegraph_start`).
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain) — tools/gntM4b-cuecal.mjs.
export const M4B_CUE_CAL = {
  // @cal begin
  m4b_roll: -1.2,
  m4b_thud: 0.4,
  m4b_lob: -2.9,
  m4b_splash: -2.5,
  m4b_swoop: -11,
  m4b_tink: 0.3,
  m4b_dig: -2.1,
  m4b_erupt: -1.6,
  m4b_spore: 3.8,
  m4b_surge: -0.1,
  m4b_rock: 1.7,
  m4b_vent: -6.1,
  m4b_fuse: -0.1,
  m4b_blast: 2.4,
  m4b_bell: 3,
  m4b_lever: -8.3,
  m4b_drink: -2.2,
  // @cal end
};

const CUES = {
  m4b_roll: { levelDb: -10, priority: 3, maxVoices: 3, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 520), f1: P(p, 260), q: 0.8, a: 0.03, hold: 0.25, d: 0.35, gain: 1 }),
      k.noise(d, t + 0.05, { type: 'bandpass', f0: P(p, 1400), q: 3, a: 0.01, hold: 0.3, d: 0.2, gain: 0.25, rate: 0.6 })
    ) },
  m4b_thud: { levelDb: -9, priority: 3, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 130), f1: P(p, 48), d: 0.22, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, q: 0.7, d: 0.18, gain: 0.7 })
    ) },
  m4b_lob: { levelDb: -12, priority: 2, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'triangle', f0: P(p, 260), f1: P(p, 540), d: 0.16, gain: 0.7 }),
      k.noise(d, t, { f0: P(p, 800), q: 2.2, d: 0.1, gain: 0.5 })
    ) },
  m4b_splash: { levelDb: -9, priority: 3, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 1500), f1: P(p, 420), q: 1.4, d: 0.28, gain: 1 }),
      k.tone(d, t, { f0: P(p, 190), f1: P(p, 90), d: 0.14, gain: 0.45 })
    ) },
  m4b_swoop: { levelDb: -12, priority: 3, maxVoices: 3, cooldownMs: 80, fn: (k, t, d, p) =>
    k.noise(d, t, { f0: P(p, 500), f1: P(p, 2600), q: 1.6, a: 0.08, d: 0.3, gain: 1 }) },
  m4b_tink: { levelDb: -9, priority: 3, maxVoices: 4, cooldownMs: 40, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1760), ratio: 2.76, index: 1.8, d: 0.35, gain: 0.8 }),
      k.tone(d, t, { type: 'triangle', f0: P(p, 3300), d: 0.06, gain: 0.35 })
    ) },
  m4b_dig: { levelDb: -15, priority: 1, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 650), q: 0.9, a: 0.02, hold: 0.1, d: 0.2, gain: 1 }) },
  m4b_erupt: { levelDb: -9, priority: 3, maxVoices: 2, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 900), f1: P(p, 300), q: 0.8, d: 0.3, gain: 1 }),
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 55), d: 0.2, gain: 0.6 })
    ) },
  m4b_spore: { levelDb: -10, priority: 3, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 2200), q: 0.7, a: 0.005, d: 0.4, gain: 0.8 }),
      k.tone(d, t, { f0: P(p, 240), f1: P(p, 120), d: 0.08, gain: 0.6 })
    ) },
  m4b_surge: { levelDb: -10, priority: 3, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 380), f1: P(p, 900), q: 0.7, a: 0.12, hold: 0.25, d: 0.45, gain: 1 }),
      k.noise(d, t + 0.1, { type: 'bandpass', f0: P(p, 2400), q: 1.2, a: 0.08, hold: 0.2, d: 0.35, gain: 0.3 })
    ) },
  m4b_rock: { levelDb: -8, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 100), f1: P(p, 38), d: 0.3, gain: 1 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), q: 0.8, d: 0.3, gain: 0.6 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 600, q: 0.7, d: 0.25, gain: 0.7 })
    ) },
  m4b_vent: { levelDb: -10, priority: 3, maxVoices: 3, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 700), f1: P(p, 1400), q: 0.9, a: 0.02, hold: 0.12, d: 0.25, gain: 1 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: 3000, q: 0.8, d: 0.3, gain: 0.3 })
    ) },
  m4b_fuse: { levelDb: -13, priority: 3, maxVoices: 3, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'highpass', f0: P(p, 3200), q: 0.7, a: 0.02, hold: 0.8, d: 0.2, gain: 0.8 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 5200), q: 2, a: 0.02, hold: 0.8, d: 0.2, gain: 0.35 })
    ) },
  m4b_blast: { levelDb: -7, priority: 4, maxVoices: 2, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 30), d: 0.6, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 1400), f1: P(p, 200), q: 0.7, d: 0.6, gain: 0.9 }),
      k.noise(d, t + 0.02, { src: 'crackle', type: 'bandpass', f0: 2600, q: 0.8, d: 0.5, gain: 0.4 })
    ) },
  m4b_bell: { levelDb: -8, priority: 4, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 392), ratio: 1.41, index: 2.4, d: 2.6, gain: 0.9 }),
      k.bell(d, t, { f: P(p, 784), ratio: 2.0, index: 1.2, d: 1.6, gain: 0.35 }),
      k.tone(d, t, { f0: P(p, 98), d: 0.4, gain: 0.3 })
    ) },
  m4b_lever: { levelDb: -10, priority: 3, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 420), q: 2.4, d: 0.12, gain: 1 }),
      k.tone(d, t + 0.06, { type: 'square', f0: P(p, 160), f1: P(p, 80), d: 0.14, gain: 0.35, filter: { f0: 1200, q: 0.7 } }),
      k.noise(d, t + 0.18, { f0: P(p, 900), f1: P(p, 300), q: 1.2, d: 0.35, gain: 0.5 })
    ) },
  m4b_drink: { levelDb: -9, priority: 3, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 660), ratio: 2.0, index: 0.9, d: 1.1, gain: 0.6 }),
      k.bell(d, t + 0.09, { f: P(p, 990), ratio: 2.0, index: 0.8, d: 0.9, gain: 0.45 }),
      k.noise(d, t, { f0: 1800, f1: 700, q: 1.1, d: 0.35, gain: 0.3 })
    ) },
};

const at = (ev) => (Number.isFinite(ev.x) && Number.isFinite(ev.z) ? { x: ev.x, z: ev.z } : {});

const EVENT_CUES = {
  enemy_charge: (ev) => [{ cue: 'm4b_roll', ...at(ev) }],
  enemy_charge_end: (ev) => (ev.cause === 'wall' ? [{ cue: 'm4b_thud', ...at(ev) }] : null),
  // ELITE AFFIXES: a Molten / Frozen burst is not a lob (src/audio/cues.js).
  enemy_lob: (ev) => (ev.affix ? [] : [{ cue: 'm4b_lob', ...at(ev) }]),
  enemy_glob_land: (ev) => (ev.shard ? null : ev.affix === 'frozen' ? [{ cue: 'frost_burst', ...at(ev) }] : ev.affix === 'molten' ? [{ cue: 'molten_burst', ...at(ev) }] : [{ cue: 'm4b_splash', ...at(ev) }]),
  enemy_swoop: (ev) => [{ cue: 'm4b_swoop', ...at(ev) }],
  enemy_slam: (ev) => [{ cue: 'm4b_thud', ...at(ev), pitch: 0.85 }],
  enemy_burrow: (ev) => [{ cue: 'm4b_dig', ...at(ev) }],
  enemy_emerge: (ev) => [{ cue: 'm4b_erupt', ...at(ev) }],
  hit_blocked: (ev) => [{ cue: 'm4b_tink', ...at(ev) }],
  hazard_telegraph: (ev) => (ev.htype === 'rockfall' ? null : [{ cue: 'telegraph', ...at(ev), gainDb: -5, pitch: ev.htype === 'gravefire' ? 0.8 : ev.htype === 'millrace' ? 0.7 : 1.2 }]),
  hazard_resolve: (ev) => {
    if (ev.htype === 'puffcap') return [{ cue: 'm4b_spore', ...at(ev) }];
    if (ev.htype === 'millrace') return [{ cue: 'm4b_surge', ...at(ev) }];
    if (ev.htype === 'rockfall') return [{ cue: 'm4b_rock', ...at(ev) }];
    if (ev.htype === 'gravefire') return [{ cue: 'm4b_vent', ...at(ev), pitch: 1 + (ev.vent ?? 0) * 0.08 }];
    return null;
  },
  keg_ignite: (ev) => [{ cue: 'm4b_fuse', ...at(ev) }],
  keg_blast: (ev) => [{ cue: 'm4b_blast', ...at(ev) }],
  bell_ring: (ev) => [{ cue: 'm4b_bell', ...at(ev) }],
  sluice_toggle: (ev) => [{ cue: 'm4b_lever', ...at(ev), pitch: ev.closed ? 1 : 0.8 }],
  dewfont_drink: (ev) => [{ cue: 'm4b_drink', ...at(ev) }],
  interact_denied: () => [{ cue: 'deny', gainDb: -4 }],
  elite_spawn: (ev) => [{ cue: 'roar', ...at(ev), pitch: 1.7, gainDb: -8 }],
};

// Wire into the audio engine once it is provided (PLAN §3.2 services degrade
// honestly: no engine, no cues, nothing else changes).
export function registerContentCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  let n = 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, {
      bus: 'sfx',
      slot: id,
      calDb: M4B_CUE_CAL[id] ?? 0,
      ...rest,
      voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p),
    });
    n += 1;
  }
  for (const [type, fn] of Object.entries(EVENT_CUES)) engine.registerEventCue(type, fn);
  return n;
}

export const M4B_CUE_IDS = Object.freeze(Object.keys(CUES));
export const M4B_EVENT_CUE_TYPES = Object.freeze(Object.keys(EVENT_CUES));
