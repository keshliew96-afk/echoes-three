// KEYS AND VAULTS (docs/VAULTS.md): the key and the vault, registered on the
// engine like the champion and encounter cues (engine.registerCue /
// registerEventCue): procedural, no files. Listen-only: event payloads in,
// cues out, so the goldens cannot move.
//   vk_drop     a key falls: a bright falling-and-rising bell figure over a
//               shimmer, so it is heard across a fight (spatial, SFX bus)
//   vk_pickup   the party takes it: two gold bells and a small jingle (UI)
//   vk_unlock   the vault door is taken: the key turns (a ratchet), the bolt
//               drops (an iron clunk), a warm chord opens (UI)
//   vk_enter    the vault wakes: a low swell under three soft bells (music)
//   vk_pile     a Glint pile taken: a cascade of coins (spatial)
//   vk_platter  the platter: a warm chord and a crunch (spatial)
//   vk_open     the chest opens: the lid's thud, a rising gold peal, a long
//               shimmer (music)
//   vk_lapse    a key the level ended with crumbles: a soft falling figure (UI)
import { UI_PEAK_DB } from './cues.js';
import { phrase } from './bosscues.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Measured design peaks (dBFS at unity gain, max of 3 takes) —
// tools/smallfixes2-cuecal.mjs --only vaultcues --write.
export const VAULT_CUE_CAL = {
  // @cal begin
  vk_drop: -4.8,
  vk_pickup: -6.9,
  vk_unlock: -1.6,
  vk_enter: -1.1,
  vk_pile: -6.7,
  vk_platter: -5.8,
  vk_open: 3.4,
  vk_lapse: 0,
  // @cal end
};

const sfx = (levelDb, fn, extra = {}) => ({ bus: 'sfx', levelDb, priority: 4, maxVoices: 2, cooldownMs: 80, ...extra, fn });
const ui = { bus: 'ui', slot: 'progress', priority: 3, maxVoices: 2, cooldownMs: 300, levelDb: UI_PEAK_DB };
const MUSIC = { bus: 'music', priority: 5, maxVoices: 1, cooldownMs: 800 };

// The vault's swell and the chest's peal, in D major (the hoard's own key,
// bright against every act's minor).
const ENTER = [[0, 38, 'low', 0.6, 1.6], [0, 50, 'choir', 0.3, 1.5], [0.2, 74, 'bell', 0.35, 1.0], [0.45, 78, 'bell', 0.32, 1.0], [0.7, 81, 'bell', 0.3, 1.4]];
const OPEN = [[0, 0, 'hand', 0.9], [0, 38, 'low', 0.8, 1.4], [0.12, 62, 'bell', 0.45, 0.8], [0.22, 66, 'bell', 0.45, 0.8], [0.32, 69, 'bell', 0.5, 0.9], [0.42, 74, 'bell', 0.55, 1.6], [0.42, 50, 'choir', 0.35, 1.6], [0.42, 57, 'choir', 0.3, 1.6], [0.42, 86, 'glass', 0.35, 1.6]];

const CUES = {
  vk_drop: sfx(-8, (k, t, d, p) =>
    Math.max(
      ...[86, 81, 86, 90].map((m, i) => k.bell(d, t + i * 0.07, { f: P(p, hz(m)), ratio: 2, index: 0.7, d: 0.7, gain: 0.3 })),
      k.noise(d, t, { type: 'highpass', f0: 5200, q: 0.7, a: 0.05, hold: 0.25, d: 0.4, gain: 0.18 }),
      k.tone(d, t, { f0: P(p, 220), f1: P(p, 440), glide: 0.25, d: 0.35, gain: 0.25 })
    ), { maxVoices: 1, cooldownMs: 300 }),
  vk_pickup: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, hz(81)), ratio: 2, index: 0.8, d: 0.8, gain: 0.32 }),
      k.bell(d, t + 0.1, { f: P(p, hz(86)), ratio: 2, index: 0.8, d: 1.0, gain: 0.32 }),
      ...[0, 0.03, 0.06, 0.1].map((o, i) => k.noise(d, t + 0.12 + o, { type: 'bandpass', f0: P(p, 5200 + i * 700), q: 6, d: 0.06, gain: 0.25 }))
    ) },
  vk_unlock: { ...ui, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      ...[0, 0.05, 0.1, 0.15].map((o, i) => k.noise(d, t + o, { type: 'bandpass', f0: P(p, 2600 - i * 200), q: 5, d: 0.04, gain: 0.45 })),
      k.tone(d, t + 0.22, { f0: P(p, 140), f1: P(p, 70), d: 0.18, gain: 0.8 }),
      k.noise(d, t + 0.22, { src: 'brown', type: 'lowpass', f0: 900, q: 0.8, d: 0.14, gain: 0.55 }),
      ...[62, 66, 69, 74].map((m, i) => k.bell(d, t + 0.32 + i * 0.03, { f: P(p, hz(m)), ratio: 2, index: 0.5, d: 1.1, gain: 0.2 }))
    ) },
  vk_enter: { ...MUSIC, levelDb: -12, fn: (k, t, d, p) => phrase(k, t, d, p, ENTER) },
  vk_pile: sfx(-9, (k, t, d, p) =>
    Math.max(
      ...[0, 0.04, 0.07, 0.11, 0.16, 0.2, 0.26, 0.31, 0.38].map((o, i) => k.bell(d, t + o, { f: P(p, 2400 + ((i * 523) % 1700)), ratio: 1.47, index: 1.2, d: 0.18, gain: 0.22 })),
      k.noise(d, t, { type: 'highpass', f0: 6000, q: 0.7, hold: 0.3, d: 0.2, gain: 0.15 })
    ), { maxVoices: 2, cooldownMs: 120 }),
  vk_platter: sfx(-10, (k, t, d, p) =>
    Math.max(
      ...[62, 66, 69].map((m) => k.tone(d, t, { type: 'triangle', f0: P(p, hz(m)), a: 0.04, d: 0.7, gain: 0.22 })),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), q: 1.2, d: 0.12, gain: 0.5 }),
      k.noise(d, t + 0.2, { src: 'crackle', type: 'bandpass', f0: P(p, 1600), q: 1.2, d: 0.1, gain: 0.4 })
    ), { maxVoices: 1, cooldownMs: 300 }),
  vk_open: { ...MUSIC, levelDb: -9, fn: (k, t, d, p) =>
    Math.max(
      phrase(k, t, d, p, OPEN),
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 55), d: 0.2, gain: 0.8 }),
      k.noise(d, t + 0.42, { type: 'highpass', f0: 6500, q: 0.7, a: 0.1, hold: 0.6, d: 0.8, gain: 0.14 })
    ) },
  vk_lapse: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, hz(74)), ratio: 2, index: 0.5, d: 0.6, gain: 0.22 }),
      k.bell(d, t + 0.16, { f: P(p, hz(69)), ratio: 2, index: 0.5, d: 0.6, gain: 0.2 }),
      k.bell(d, t + 0.32, { f: P(p, hz(62)), ratio: 2, index: 0.5, d: 0.9, gain: 0.18 })
    ) },
};

export const VAULT_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};

export function createVaultEventCues() {
  return {
    key_drop: (ev, h) => [{ cue: 'vk_drop', ...at(ev, h) }],
    key_pickup: () => [{ cue: 'vk_pickup' }],
    vault_door_taken: () => [{ cue: 'vk_unlock' }],
    vault_enter: () => [{ cue: 'vk_enter' }],
    vault_pile: (ev, h) => [{ cue: 'vk_pile', ...at(ev, h) }],
    vault_platter: (ev, h) => [{ cue: 'vk_platter', ...at(ev, h) }],
    vault_open: () => [{ cue: 'vk_open' }],
    key_lapse: () => [{ cue: 'vk_lapse' }],
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerVaultCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: VAULT_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createVaultEventCues())) engine.registerEventCue(type, fn);
  return VAULT_CUE_IDS.length;
}
