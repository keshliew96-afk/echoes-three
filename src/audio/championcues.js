// CHAMPION ROOMS (docs/CHAMPIONS.md): the four champions' voices,
// registered on the engine like the boss and encounter cues
// (engine.registerCue / registerEventCue): procedural, no files. Listen-only:
// event payloads in, cues out, so the goldens cannot move.
//
// A champion is not a boss: its sting is a short phrase on the music bus
// over the act's track (the track itself never changes), in its act's key
// and with a boss of that act's instruments, but shorter and lighter.
//   ch_<id>_sting   its entrance (champion_spawn), ~1.2 s
//   ch_<id>_rage    below half health: the lead rises a half step
//   ch_fall         it falls: a falling fifth into a held bell
//   ch_chest        its chest opens: the lid's thud, then a rising peal
//   ch_crown        the crown door is taken: two soft gold bells (UI)
// Its moves (in the room: spatial on the SFX bus):
//   ch_tell         the wind-up of every move: a low gold shimmer that
//                   rises, under the generic telegraph tick it replaces
//   ch_<move>       each move's landing (bramble_charge, thorn_ring,
//                   floodgate, undertow, reaping_sweep, grave_lance,
//                   shard_hymn, discord)
//   ch_charge_stop  the Briar Knight's charge stops (a wall: a crash)
import { UI_PEAK_DB } from './cues.js';
import { phrase } from './bosscues.js';
import { CHAMPION_IDS, isChampionKind } from '../sim/champions.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) —
// tools/smallfixes2-cuecal.mjs --only championcues --write. UI-bus cues stay at 0 (the engine
// levels a UI cue by its baked sample's own peak).
export const CHAMPION_CUE_CAL = {
  // @cal begin
  ch_briar_knight_sting: 5.5,
  ch_briar_knight_rage: 6.5,
  ch_sluice_warden_sting: 5,
  ch_sluice_warden_rage: 3.8,
  ch_bone_reeve_sting: 6.3,
  ch_bone_reeve_rage: 6.6,
  ch_hollow_choir_sting: 4.4,
  ch_hollow_choir_rage: 4.7,
  ch_fall: 1.8,
  ch_chest: 0,
  ch_crown: 0,
  ch_tell: -4.6,
  ch_bramble_charge: -1,
  ch_thorn_ring: 1.1,
  ch_floodgate: 1.3,
  ch_undertow: -2.4,
  ch_reaping_sweep: -2.7,
  ch_grave_lance: -3.6,
  ch_shard_hymn: -1,
  ch_discord: 4.3,
  ch_charge_stop: -1.7,
  // @cal end
};

// Each champion's voice: its act's key (as that act's bosses) and a lead and
// drum borrowed from them.
const VOICE = {
  briar_knight: { root: 50, lead: 'horn', drum: 'hand' }, // Hollow Wood, D phrygian
  sluice_warden: { root: 57, lead: 'clank', drum: 'frame' }, // Sunken Mill, A phrygian
  bone_reeve: { root: 52, lead: 'toll', drum: 'taiko' }, // the Barrow, E harmonic minor
  hollow_choir: { root: 49, lead: 'choir', drum: 'heart' }, // the Heart, C# phrygian
};
const STINGS = {
  // A knight's horn: tonic, fifth, then the flat second held over a thorn pluck.
  briar_knight: [[0, 0, 'hand', 1], [0, 38, 'low', 0.8, 1.0], [0, 50, 'horn', 0.85, 0.22], [0.26, 57, 'horn', 0.9, 0.22], [0.52, 51, 'horn', 0.95, 0.7], [0.52, 0, 'hand', 0.9], [0.52, 63, 'lute', 0.5], [0.6, 62, 'lute', 0.45]],
  // The sluice gate: two iron clanks, a drop, a low reed under the water.
  sluice_warden: [[0, 57, 'clank', 0.9], [0.2, 58, 'clank', 0.9], [0, 0, 'frame', 0.8], [0.44, 0, 'frame', 1], [0.44, 33, 'low', 0.9, 1.0], [0.44, 45, 'reed', 0.6, 0.7], [0.44, 69, 'drip', 0.6], [0.56, 72, 'drip', 0.55]],
  // Two grave tolls a fifth apart over a held choir, ending on the raised seventh.
  bone_reeve: [[0, 40, 'toll', 1], [0.36, 47, 'toll', 0.85], [0, 0, 'taiko', 0.9], [0.1, 52, 'choir', 0.4, 1.1], [0.1, 55, 'choir', 0.35, 1.1], [0.72, 63, 'horn', 0.8, 0.5], [0.72, 0, 'taiko', 1], [0.72, 28, 'low', 0.9, 0.9]],
  // Three voices entering one by one on the hollow chord, glass on top.
  hollow_choir: [[0, 0, 'heart', 0.9], [0, 25, 'low', 0.9, 1.3], [0.1, 61, 'choir', 0.45, 1.1], [0.32, 62, 'choir', 0.45, 0.9], [0.54, 68, 'choir', 0.5, 0.8], [0.54, 85, 'glass', 0.4, 0.9], [0.54, 0, 'heart', 0.8]],
};
const rageNotes = (v) => [
  [0, 0, v.drum, 1],
  [0, v.root - 12, 'low', 0.8, 0.5],
  [0, v.root, v.lead, 0.85, 0.18],
  [0.16, v.root + 1, v.lead, 0.95, 0.4],
  [0.16, 0, v.drum, 0.8],
];
const FALL = [[0, 62, 'bell', 0.6, 0.6], [0.22, 55, 'bell', 0.6, 0.6], [0.44, 50, 'bell', 0.7, 1.4], [0.44, 38, 'low', 0.7, 1.2], [0.44, 74, 'bell', 0.3, 1.4]];

const STING_DEF = { bus: 'music', priority: 5, maxVoices: 1, cooldownMs: 800 };
const sfx = (levelDb, fn, extra = {}) => ({ bus: 'sfx', levelDb, priority: 4, maxVoices: 2, cooldownMs: 80, ...extra, fn });
const ui = { bus: 'ui', slot: 'progress', priority: 3, maxVoices: 2, cooldownMs: 300, levelDb: UI_PEAK_DB };

const CUES = {};
for (const id of CHAMPION_IDS) {
  CUES[`ch_${id}_sting`] = { ...STING_DEF, levelDb: -10, fn: (k, t, d, p) => phrase(k, t, d, p, STINGS[id]) };
  CUES[`ch_${id}_rage`] = { ...STING_DEF, levelDb: -12, cooldownMs: 400, fn: (k, t, d, p) => phrase(k, t, d, p, rageNotes(VOICE[id])) };
}
Object.assign(CUES, {
  ch_fall: { ...STING_DEF, levelDb: -10, fn: (k, t, d, p) => phrase(k, t, d, p, FALL) },
  ch_chest: { ...ui, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 60), d: 0.16, gain: 0.8 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 600, q: 0.8, d: 0.12, gain: 0.5 }),
      ...[784, 987.8, 1174.7, 1568, 1975.5].map((f, i) => k.bell(d, t + 0.12 + i * 0.07, { f: P(p, f), ratio: 2, index: 0.7, d: 0.9, gain: 0.26 })),
      k.noise(d, t + 0.12, { type: 'highpass', f0: 6500, q: 0.7, hold: 0.3, d: 0.2, gain: 0.16 })
    ) },
  ch_crown: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 880), ratio: 2, index: 0.8, d: 0.9, gain: 0.32 }),
      k.bell(d, t + 0.14, { f: P(p, 1318.5), ratio: 2, index: 0.8, d: 1.0, gain: 0.3 })
    ) },
  // The wind-up: a low gold shimmer rising, so a champion's move is heard
  // as its own, not as a common enemy's tick.
  ch_tell: sfx(-12, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 110), f1: P(p, 165), glide: 0.35, a: 0.05, d: 0.4, gain: 0.45, filter: { f0: 900, q: 1.4 } }),
      k.bell(d, t, { f: P(p, 1760), ratio: 1.5, index: 0.6, d: 0.35, gain: 0.18 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 2400), q: 3, a: 0.2, d: 0.2, gain: 0.25 })
    ), { maxVoices: 1, cooldownMs: 150 }),
  ch_bramble_charge: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 45), d: 0.5, gain: 0.9 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 700), f1: P(p, 300), q: 0.8, a: 0.05, hold: 0.3, d: 0.3, gain: 0.7 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2600), q: 2, a: 0.02, hold: 0.25, d: 0.2, gain: 0.25 })
    )),
  ch_thorn_ring: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2200), q: 0.9, d: 0.35, gain: 0.8 }),
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 50), d: 0.3, gain: 0.8 }),
      ...[0, 0.04, 0.08].map((o, i) => k.noise(d, t + o, { type: 'highpass', f0: P(p, 3800 + i * 600), q: 1, d: 0.08, gain: 0.4 }))
    )),
  ch_floodgate: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 2400), f1: P(p, 500), q: 0.9, a: 0.02, d: 0.6, gain: 0.9 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 600), f1: P(p, 200), q: 0.8, d: 0.6, gain: 0.8 }),
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 40), d: 0.4, gain: 0.7 }),
      k.tone(d, t, { type: 'square', f0: P(p, 220), f1: P(p, 196), d: 0.12, gain: 0.25, filter: { f0: 1200, q: 2 } })
    )),
  ch_undertow: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 60), f1: P(p, 140), glide: 0.2, d: 0.3, gain: 0.8 }),
      k.noise(d, t + 0.05, { f0: P(p, 600), f1: P(p, 2600), q: 1.2, a: 0.05, d: 0.45, gain: 0.7 }),
      k.tone(d, t + 0.28, { f0: P(p, 520), f1: P(p, 180), d: 0.18, gain: 0.35 })
    )),
  ch_reaping_sweep: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 800), f1: P(p, 3200), q: 1.6, a: 0.04, d: 0.22, gain: 0.9 }),
      k.tone(d, t + 0.12, { type: 'triangle', f0: P(p, 1318.5), f1: P(p, 1244.5), d: 0.4, gain: 0.25 }),
      k.tone(d, t + 0.12, { f0: P(p, 110), f1: P(p, 60), d: 0.2, gain: 0.5 })
    )),
  ch_grave_lance: sfx(-9, (k, t, d, p) =>
    Math.max(
      ...[0, 0.05, 0.1, 0.15, 0.2].map((o, i) => k.noise(d, t + o, { src: 'crackle', type: 'bandpass', f0: P(p, 1500 + i * 200), q: 1.2, d: 0.1, gain: 0.6 })),
      k.tone(d, t, { f0: P(p, 160), f1: P(p, 55), d: 0.35, gain: 0.7 })
    )),
  ch_shard_hymn: sfx(-10, (k, t, d, p) =>
    Math.max(
      ...[73, 76, 80].map((m, i) => k.bell(d, t + i * 0.03, { f: P(p, 440 * Math.pow(2, (m - 69) / 12)), ratio: 2.76, index: 1, d: 0.5, gain: 0.3 })),
      k.noise(d, t, { type: 'highpass', f0: P(p, 4000), q: 0.8, d: 0.15, gain: 0.4 })
    )),
  ch_discord: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 554.4), ratio: 1.41, index: 2.4, d: 0.9, gain: 0.4 }),
      k.bell(d, t, { f: P(p, 587.3), ratio: 1.41, index: 2.4, d: 0.9, gain: 0.35 }),
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 35), d: 0.5, gain: 0.8 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), f1: P(p, 600), q: 1.2, d: 0.35, gain: 0.5 })
    )),
  ch_charge_stop: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 900), f1: P(p, 250), q: 0.8, d: 0.3, gain: 0.9 }),
      k.tone(d, t, { f0: P(p, 100), f1: P(p, 40), d: 0.3, gain: 0.8 })
    )),
});

export const CHAMPION_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};

export function createChampionEventCues() {
  return {
    champion_spawn: (ev, h) => [{ cue: 'roar', ...at(ev, h, ev.id), pitch: ev.champion === 'hollow_choir' ? 1.3 : 0.8 }, { cue: `ch_${ev.champion}_sting` }],
    champion_rage: (ev, h) => [{ cue: 'roar', ...at(ev, h, ev.id), pitch: 0.9, gainDb: -4 }, { cue: `ch_${ev.champion}_rage` }],
    champion_tell: (ev, h) => [{ cue: 'ch_tell', ...at(ev, h, ev.id) }],
    champion_move: (ev, h) => (CUES[`ch_${ev.move}`] ? [{ cue: `ch_${ev.move}`, ...at(ev, h, ev.id), ...(ev.rage ? { pitch: 1.05 } : {}) }] : null),
    champion_charge_end: (ev, h) => [{ cue: 'ch_charge_stop', ...at(ev, h, ev.id), gainDb: ev.cause === 'wall' ? 0 : -6 }],
    champion_fall: () => [{ cue: 'ch_fall' }],
    champion_chest: () => [{ cue: 'ch_chest' }],
    crown_door_taken: () => [{ cue: 'ch_crown' }],
    // A champion's own wind-up (champion_tell) replaces the common tick.
    telegraph_start: (ev, h) => {
      const k = ev.id != null ? h.kind(ev.id) : null;
      return k && isChampionKind(k) ? [] : null;
    },
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerChampionCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: CHAMPION_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createChampionEventCues())) engine.registerEventCue(type, fn);
  return CHAMPION_CUE_IDS.length;
}
