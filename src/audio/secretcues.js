// SECRET ROOMS (docs/SECRET_ROOMS.md): the cracked wall and the hidden
// chamber, registered on the engine like the vault cues (engine.registerCue /
// registerEventCue): procedural, no files. Listen-only: event payloads in,
// cues out, so the goldens cannot move.
//   sr_draught  a wall is in the room: a thin cold whistle of air through the
//               crack, so an ear finds it too (spatial, quiet)
//   sr_knock    a light blow: a HOLLOW knock (a low body with a ringing
//               cavity behind it) and a trickle of grit (spatial)
//   sr_open     the wall breaks: a crack, the masonry falling in a rubble
//               cascade, then a cold glass shimmer opening out (SFX bus)
//   sr_enter    the chamber: a low hollow swell under glass bells in E aeolian
//               (the found light's own key) (music)
//   sr_pile     a hoard pile: a small cascade of coins (spatial)
//   sr_relic    the reliquary opens: a stone lid grinding, a rising glass peal
//   sr_cache    the cache: a creaking lid, two glass clinks
//   sr_page     the lectern: a page turning, a soft choir breath
import { UI_PEAK_DB } from './cues.js';
import { phrase } from './bosscues.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Design peaks (dBFS at unity gain) — measure with
// tools/smallfixes2-cuecal.mjs --only secretcues --write.
export const SECRET_CUE_CAL = {
  // @cal begin
  sr_draught: 0,
  sr_knock: 0,
  sr_open: 0,
  sr_enter: 0,
  sr_pile: 0,
  sr_relic: 0,
  sr_cache: 0,
  sr_page: 0,
  // @cal end
};

const sfx = (levelDb, fn, extra = {}) => ({ bus: 'sfx', levelDb, priority: 4, maxVoices: 2, cooldownMs: 80, ...extra, fn });
const ui = { bus: 'ui', slot: 'progress', priority: 3, maxVoices: 2, cooldownMs: 300, levelDb: UI_PEAK_DB };
const MUSIC = { bus: 'music', priority: 5, maxVoices: 1, cooldownMs: 800 };

// The chamber's swell and the reliquary's peal, in E aeolian.
const ENTER = [[0, 40, 'low', 0.55, 1.8], [0, 52, 'choir', 0.22, 1.8], [0.3, 76, 'glass', 0.28, 1.2], [0.6, 79, 'glass', 0.26, 1.2], [0.9, 83, 'glass', 0.24, 1.6], [1.2, 71, 'bell', 0.2, 1.6]];
const RELIC = [[0.2, 64, 'glass', 0.35, 0.8], [0.3, 67, 'glass', 0.35, 0.8], [0.4, 71, 'glass', 0.4, 0.9], [0.5, 76, 'bell', 0.45, 1.6], [0.5, 52, 'choir', 0.3, 1.6]];

const CUES = {
  sr_draught: sfx(-20, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2300), q: 9, a: 0.5, hold: 0.9, d: 1.0, gain: 0.3 }),
      k.noise(d, t + 0.4, { type: 'bandpass', f0: P(p, 3100), q: 12, a: 0.4, hold: 0.5, d: 0.9, gain: 0.18 }),
      k.noise(d, t, { src: 'pink', type: 'lowpass', f0: 700, q: 0.7, a: 0.6, hold: 0.8, d: 1.0, gain: 0.12 })
    ), { maxVoices: 1, cooldownMs: 2000 }),
  sr_knock: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 150), f1: P(p, 95), d: 0.12, gain: 0.8 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 800, q: 0.9, d: 0.08, gain: 0.55 }),
      // The cavity behind it rings: a hollow, slightly detuned pair.
      k.tone(d, t + 0.01, { type: 'triangle', f0: P(p, 210), d: 0.4, gain: 0.22 }),
      k.tone(d, t + 0.01, { type: 'triangle', f0: P(p, 316), d: 0.32, gain: 0.14 }),
      ...[0.06, 0.11, 0.17].map((o, i) => k.noise(d, t + o, { src: 'crackle', type: 'bandpass', f0: P(p, 3200 + i * 500), q: 2, d: 0.05, gain: 0.25 }))
    ), { maxVoices: 2, cooldownMs: 160 }),
  sr_open: sfx(-5, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: 2600, q: 0.8, d: 0.06, gain: 0.7 }),
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 48), d: 0.35, gain: 0.95 }),
      k.noise(d, t + 0.02, { src: 'brown', type: 'lowpass', f0: 1100, q: 0.7, hold: 0.3, d: 0.6, gain: 0.8 }),
      ...[0.12, 0.2, 0.27, 0.36, 0.44, 0.55, 0.66].map((o, i) => k.noise(d, t + o, { src: 'crackle', type: 'bandpass', f0: P(p, 900 + ((i * 437) % 1400)), q: 1.4, d: 0.1, gain: 0.5 - i * 0.04 })),
      ...[0.4, 0.52, 0.64].map((o, i) => k.bell(d, t + o, { f: P(p, hz([83, 88, 91][i])), ratio: 2.76, index: 0.6, d: 1.2, gain: 0.16 })),
      k.noise(d, t + 0.45, { type: 'highpass', f0: 7000, q: 0.7, a: 0.2, hold: 0.4, d: 0.8, gain: 0.12 })
    ), { maxVoices: 1, cooldownMs: 500 }),
  sr_enter: { ...MUSIC, levelDb: -12, fn: (k, t, d, p) => phrase(k, t, d, p, ENTER) },
  sr_pile: sfx(-10, (k, t, d, p) =>
    Math.max(
      ...[0, 0.05, 0.09, 0.14, 0.2, 0.27].map((o, i) => k.bell(d, t + o, { f: P(p, 2500 + ((i * 523) % 1500)), ratio: 1.47, index: 1.2, d: 0.16, gain: 0.2 })),
      k.noise(d, t, { type: 'highpass', f0: 6000, q: 0.7, hold: 0.2, d: 0.18, gain: 0.12 })
    ), { maxVoices: 2, cooldownMs: 120 }),
  sr_relic: { ...MUSIC, levelDb: -10, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 420), q: 1.6, a: 0.04, hold: 0.14, d: 0.12, gain: 0.6 }),
      phrase(k, t, d, p, RELIC)
    ) },
  sr_cache: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 700), q: 3, a: 0.03, hold: 0.12, d: 0.1, gain: 0.45 }),
      k.tone(d, t + 0.15, { f0: P(p, 120), f1: P(p, 80), d: 0.1, gain: 0.5 }),
      k.bell(d, t + 0.24, { f: P(p, hz(88)), ratio: 2.3, index: 0.9, d: 0.4, gain: 0.25 }),
      k.bell(d, t + 0.32, { f: P(p, hz(91)), ratio: 2.3, index: 0.9, d: 0.5, gain: 0.22 })
    ) },
  sr_page: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3800), q: 1.2, a: 0.02, hold: 0.06, d: 0.12, gain: 0.35 }),
      k.noise(d, t + 0.1, { type: 'bandpass', f0: P(p, 4400), q: 1.4, a: 0.02, hold: 0.04, d: 0.1, gain: 0.3 }),
      phrase(k, t + 0.12, d, p, [[0, 64, 'choir', 0.25, 0.9], [0, 71, 'choir', 0.18, 0.9], [0.1, 83, 'glass', 0.2, 0.9]])
    ) },
};

export const SECRET_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const TAKE_CUE = { relic: 'sr_relic', tonics: 'sr_cache', lore: 'sr_page' };

export function createSecretEventCues() {
  return {
    secret_wall: (ev, h) => [{ cue: 'sr_draught', ...at(ev, h) }],
    secret_knock: (ev, h) => [{ cue: 'sr_knock', ...at(ev, h) }],
    secret_open: (ev, h) => [{ cue: 'sr_open', ...at(ev, h) }],
    secret_enter: () => [{ cue: 'sr_enter' }],
    secret_pile: (ev, h) => [{ cue: 'sr_pile', ...at(ev, h) }],
    secret_take: (ev) => (TAKE_CUE[ev.content] ? [{ cue: TAKE_CUE[ev.content] }] : []),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerSecretCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: SECRET_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createSecretEventCues())) engine.registerEventCue(type, fn);
  return SECRET_CUE_IDS.length;
}
