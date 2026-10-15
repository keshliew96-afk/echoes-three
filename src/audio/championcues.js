// CHAMPION ROOMS (docs/CHAMPIONS.md): the nine champions' voices,
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
//                   shard_hymn, discord, gale_call, stoop, and the second
//                   champions' antler_toss, harts_leap, chain_hook,
//                   lock_turn, death_knell, grave_call, vein_lash,
//                   heart_pulse)
//   ch_leap_gather  the Moss Hart gathering itself for the leap (with ch_tell)
//   ch_hook_whirl   the Lockkeeper's key whirling up for the hook (with ch_tell)
//   ch_stoop_rise   the Gale Herald's stoop taking wing (with ch_tell)
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
  ch_moss_hart_sting: 7.8,
  ch_moss_hart_rage: 6.8,
  ch_sluice_warden_sting: 5,
  ch_sluice_warden_rage: 3.8,
  ch_lockkeeper_sting: 5.9,
  ch_lockkeeper_rage: 4.1,
  ch_bone_reeve_sting: 6.3,
  ch_bone_reeve_rage: 6.6,
  ch_gravebell_ringer_sting: 7.7,
  ch_gravebell_ringer_rage: 9.2,
  ch_hollow_choir_sting: 4.4,
  ch_hollow_choir_rage: 4.7,
  ch_vein_matron_sting: 6.1,
  ch_vein_matron_rage: 6.6,
  ch_gale_herald_sting: 7.2,
  ch_gale_herald_rage: 7.3,
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
  ch_gale_call: 1.8,
  ch_stoop_rise: -8.2,
  ch_stoop: 2.6,
  ch_antler_toss: -0.8,
  ch_leap_gather: -7.9,
  ch_harts_leap: 2.7,
  ch_hook_whirl: -12.2,
  ch_chain_hook: -2,
  ch_lock_turn: 1.1,
  ch_death_knell: 2.9,
  ch_grave_call: -1.5,
  ch_vein_lash: 0.8,
  ch_heart_pulse: 0.9,
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
  gale_herald: { root: 53, lead: 'horn', drum: 'knell' }, // the Still Spire, F lydian
  // Second champions (plan 4 slice 8): each in its act's key, a second voice.
  moss_hart: { root: 50, lead: 'reed', drum: 'hand' }, // Hollow Wood, D phrygian
  lockkeeper: { root: 57, lead: 'clank', drum: 'frame' }, // Sunken Mill, A phrygian
  gravebell_ringer: { root: 52, lead: 'knell', drum: 'taiko' }, // the Barrow, E harmonic minor
  vein_matron: { root: 49, lead: 'glass', drum: 'heart' }, // the Heart, C# phrygian
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
  // A herald's bronze horn over the wind and a deep bell: F, C, F, then up
  // to the lydian raised fourth (B) held as the knell sounds again.
  gale_herald: [[0, 0, 'knell', 0.85], [0, 29, 'low', 0.9, 1.3], [0, 84, 'breath', 0.5, 1.0], [0.08, 53, 'horn', 0.85, 0.2], [0.3, 60, 'horn', 0.9, 0.2], [0.52, 65, 'horn', 0.95, 0.18], [0.72, 71, 'horn', 0.9, 0.55], [0.72, 0, 'knell', 0.7], [0.72, 89, 'bell', 0.25, 1.0]],
  // A hart's call over the Wood: a low reed bellow rising a fifth, two hand
  // drums like hooves, the flat second held with a lute's pluck of thorn.
  moss_hart: [[0, 0, 'hand', 0.9], [0.14, 0, 'hand', 0.8], [0, 38, 'low', 0.8, 1.2], [0, 50, 'reed', 0.8, 0.4], [0.36, 57, 'reed', 0.9, 0.3], [0.62, 51, 'reed', 0.95, 0.75], [0.62, 0, 'hand', 1], [0.62, 62, 'lute', 0.45], [0.7, 63, 'lute', 0.4]],
  // The lock: a key turning (three iron clanks climbing), a heavy bolt
  // shooting home, the mill's water dripping after.
  lockkeeper: [[0, 57, 'clank', 0.8], [0.12, 60, 'clank', 0.85], [0.24, 63, 'clank', 0.9], [0.5, 0, 'frame', 1], [0.5, 33, 'low', 0.9, 1.1], [0.5, 45, 'reed', 0.55, 0.8], [0.5, 58, 'clank', 1], [0.66, 69, 'drip', 0.55], [0.8, 72, 'drip', 0.5]],
  // A cracked grave bell: three tolls falling, the last off-true, a choir
  // breath under it ending on the raised seventh.
  gravebell_ringer: [[0, 52, 'knell', 0.9], [0, 0, 'taiko', 0.8], [0.32, 47, 'knell', 0.9], [0.64, 40, 'knell', 1], [0.64, 0, 'taiko', 1], [0.1, 52, 'choir', 0.35, 1.2], [0.64, 63, 'choir', 0.4, 0.8], [0.64, 28, 'low', 0.9, 1.0]],
  // The heart's own beat twice, then glass voices rising out of it to the
  // flat second, a low swell under.
  vein_matron: [[0, 0, 'heart', 1], [0.2, 0, 'heart', 0.8], [0, 25, 'low', 0.9, 1.3], [0.4, 61, 'glass', 0.5, 0.6], [0.52, 64, 'glass', 0.5, 0.6], [0.64, 68, 'glass', 0.55, 0.8], [0.64, 62, 'choir', 0.4, 0.8], [0.64, 0, 'heart', 0.9]],
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
  // The Gale Herald's horn blast with the gust it calls whooshing out.
  ch_gale_call: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 172), f1: P(p, 174.6), glide: 0.05, a: 0.03, hold: 0.25, d: 0.35, gain: 0.5, filter: { f0: 1900, f1: 700, q: 1.2, glide: 0.5 } }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 261.6), a: 0.04, hold: 0.22, d: 0.3, gain: 0.22, filter: { f0: 1600, f1: 650, q: 1.2, glide: 0.5 } }),
      k.tone(d, t, { f0: P(p, 87.3), a: 0.03, hold: 0.2, d: 0.4, gain: 0.4 }),
      k.noise(d, t + 0.06, { type: 'bandpass', f0: P(p, 500), f1: P(p, 2200), q: 1.1, a: 0.1, hold: 0.15, d: 0.45, gain: 0.8 }),
      k.noise(d, t + 0.08, { src: 'brown', type: 'lowpass', f0: 700, f1: 280, q: 0.8, a: 0.06, hold: 0.15, d: 0.4, gain: 0.55 })
    )),
  // The stoop's take-off (its wind-up): stone wings beating, rising and
  // quickening as it climbs over the mark.
  ch_stoop_rise: sfx(-11, (k, t, d, p) =>
    Math.max(
      ...[0, 0.24, 0.44, 0.6, 0.73].map((o, i) => k.noise(d, t + o, { type: 'bandpass', f0: P(p, 320 + i * 140), f1: P(p, 800 + i * 260), q: 1.4, a: 0.05, d: 0.14, gain: 0.5 + i * 0.1 })),
      ...[0, 0.24, 0.44].map((o) => k.tone(d, t + o, { f0: P(p, 70), f1: P(p, 50), d: 0.12, gain: 0.35 })),
      k.noise(d, t + 0.2, { type: 'highpass', f0: P(p, 1500), f1: P(p, 3200), q: 0.7, a: 0.5, d: 0.2, gain: 0.18 })
    ), { maxVoices: 1, cooldownMs: 300 }),
  // The stoop lands: a last rush of air, then the stone body's heavy thud
  // and the crack of a bell in it.
  ch_stoop: sfx(-7, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2200), f1: P(p, 700), q: 1.2, a: 0.04, d: 0.08, gain: 0.5 }),
      k.tone(d, t + 0.06, { f0: P(p, 92), f1: P(p, 34), d: 0.5, gain: 1 }),
      k.noise(d, t + 0.06, { src: 'brown', type: 'lowpass', f0: 1000, f1: 170, q: 0.8, d: 0.45, gain: 0.85 }),
      k.noise(d, t + 0.07, { src: 'crackle', type: 'bandpass', f0: P(p, 1700), q: 0.8, d: 0.3, gain: 0.45 }),
      k.bell(d, t + 0.07, { f: P(p, 349.2), ratio: 1.41, index: 2.8, d: 0.7, gain: 0.35 }),
      k.bell(d, t + 0.07, { f: P(p, 357), ratio: 2.93, index: 1.4, d: 0.45, gain: 0.2 })
    )),
  // SECOND CHAMPIONS (plan 4 slice 8).
  // The Moss Hart's toss: a heavy swish of the rack, the thud of it
  // catching, turf tearing.
  ch_antler_toss: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 500), f1: P(p, 2200), q: 1.2, a: 0.05, d: 0.22, gain: 0.8 }),
      k.tone(d, t + 0.1, { f0: P(p, 110), f1: P(p, 50), d: 0.35, gain: 0.85 }),
      k.noise(d, t + 0.1, { src: 'crackle', type: 'bandpass', f0: P(p, 1200), q: 0.8, d: 0.25, gain: 0.5 }),
      k.noise(d, t + 0.1, { src: 'brown', type: 'lowpass', f0: 800, f1: 250, q: 0.8, d: 0.35, gain: 0.6 })
    )),
  // Its gathering for the leap: a low snort and hooves scraping.
  ch_leap_gather: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 700), f1: P(p, 400), q: 2, a: 0.04, d: 0.25, gain: 0.6 }),
      ...[0.25, 0.42, 0.56].map((o) => k.noise(d, t + o, { src: 'brown', type: 'lowpass', f0: 900, f1: 300, q: 0.8, d: 0.12, gain: 0.5 })),
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 70), d: 0.3, gain: 0.4 })
    ), { maxVoices: 1, cooldownMs: 300 }),
  // The leap lands: a rush of air, then four hooves and a heavy body.
  ch_harts_leap: sfx(-7, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2000), f1: P(p, 700), q: 1.2, a: 0.03, d: 0.08, gain: 0.45 }),
      k.tone(d, t + 0.05, { f0: P(p, 85), f1: P(p, 32), d: 0.55, gain: 1 }),
      ...[0.05, 0.08].map((o) => k.noise(d, t + o, { src: 'brown', type: 'lowpass', f0: 1100, f1: 180, q: 0.8, d: 0.4, gain: 0.8 })),
      k.noise(d, t + 0.06, { src: 'crackle', type: 'bandpass', f0: P(p, 1400), q: 0.8, d: 0.3, gain: 0.4 })
    )),
  // The Lockkeeper's key whirling on its chain as it winds up.
  ch_hook_whirl: sfx(-12, (k, t, d, p) =>
    Math.max(
      ...[0, 0.18, 0.33, 0.45, 0.55, 0.63].map((o, i) => k.noise(d, t + o, { type: 'bandpass', f0: P(p, 600 + i * 120), f1: P(p, 1400 + i * 150), q: 1.6, a: 0.03, d: 0.1, gain: 0.45 + i * 0.05 })),
      ...[0.1, 0.4].map((o) => k.noise(d, t + o, { src: 'crackle', type: 'highpass', f0: P(p, 3000), q: 0.8, d: 0.08, gain: 0.25 }))
    ), { maxVoices: 1, cooldownMs: 300 }),
  // The throw: chain rattling out, the key biting, then reeled in.
  ch_chain_hook: sfx(-8, (k, t, d, p) =>
    Math.max(
      ...[0, 0.03, 0.06, 0.09, 0.12, 0.15].map((o, i) => k.noise(d, t + o, { src: 'crackle', type: 'bandpass', f0: P(p, 2600 - i * 150), q: 1.4, d: 0.06, gain: 0.5 })),
      k.tone(d, t + 0.16, { type: 'square', f0: P(p, 233), f1: P(p, 196), d: 0.14, gain: 0.3, filter: { f0: 1400, q: 2 } }),
      k.tone(d, t + 0.16, { f0: P(p, 120), f1: P(p, 55), d: 0.25, gain: 0.7 }),
      ...[0.3, 0.36, 0.42].map((o) => k.noise(d, t + o, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), q: 1.4, d: 0.06, gain: 0.35 }))
    )),
  // The lock turning in the floor: the key's grind, the bolt shooting home.
  ch_lock_turn: sfx(-7, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 400), q: 3, a: 0.02, hold: 0.12, d: 0.12, gain: 0.6 }),
      k.tone(d, t + 0.14, { type: 'square', f0: P(p, 196), f1: P(p, 98), d: 0.18, gain: 0.35, filter: { f0: 1100, q: 2 } }),
      k.tone(d, t + 0.14, { f0: P(p, 75), f1: P(p, 32), d: 0.55, gain: 1 }),
      k.noise(d, t + 0.14, { src: 'brown', type: 'lowpass', f0: 900, f1: 200, q: 0.8, d: 0.4, gain: 0.8 }),
      k.noise(d, t + 0.2, { f0: P(p, 2400), f1: P(p, 700), q: 0.9, d: 0.4, gain: 0.5 })
    )),
  // The Gravebell Ringer's knell: the cracked bell, a beating pair of tones
  // off true, a low thrum that rolls out.
  ch_death_knell: sfx(-7, (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 164.8), ratio: 2.4, index: 3, d: 1.6, gain: 0.5 }),
      k.bell(d, t, { f: P(p, 168.5), ratio: 2.95, index: 2.2, d: 1.4, gain: 0.4 }),
      k.bell(d, t, { f: P(p, 329.6), ratio: 1.41, index: 1.6, d: 0.9, gain: 0.25 }),
      k.tone(d, t, { f0: P(p, 55), f1: P(p, 41), d: 0.9, gain: 0.8 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2600), q: 1, d: 0.12, gain: 0.35 })
    )),
  // Grave Call: the mallet on the floor, then the grave cracking open in a
  // gasp of ash and coals.
  ch_grave_call: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 45), d: 0.35, gain: 0.9 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 1600), q: 0.8, d: 0.4, gain: 0.6 }),
      k.noise(d, t + 0.05, { src: 'brown', type: 'lowpass', f0: 700, f1: 1600, q: 0.8, a: 0.08, d: 0.6, gain: 0.7 }),
      k.noise(d, t + 0.1, { type: 'highpass', f0: P(p, 2500), q: 0.7, a: 0.1, d: 0.4, gain: 0.25 })
    )),
  // The Vein Matron's lash: a wet whip crack, a glassy ring off it.
  ch_vein_lash: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 400), f1: P(p, 3200), q: 1.4, a: 0.06, d: 0.06, gain: 0.6 }),
      k.noise(d, t + 0.08, { type: 'highpass', f0: P(p, 2800), q: 0.8, d: 0.06, gain: 0.8 }),
      k.tone(d, t + 0.08, { f0: P(p, 180), f1: P(p, 70), d: 0.2, gain: 0.5 }),
      k.bell(d, t + 0.09, { f: P(p, 1108.7), ratio: 2.76, index: 1, d: 0.4, gain: 0.22 })
    )),
  // Heart Pulse: a huge heartbeat (two thumps) and the glass shards singing
  // out of it.
  ch_heart_pulse: sfx(-7, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 38), d: 0.35, gain: 1 }),
      k.tone(d, t + 0.16, { f0: P(p, 62), f1: P(p, 34), d: 0.45, gain: 0.85 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 500, f1: 150, q: 0.8, d: 0.3, gain: 0.7 }),
      ...[68, 73, 76, 80].map((m, i) => k.bell(d, t + 0.18 + i * 0.025, { f: P(p, 440 * Math.pow(2, (m - 69) / 12)), ratio: 2.76, index: 1, d: 0.5, gain: 0.22 }))
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

// The entrance roar's pitch: the choir's is high and glassy, the Gale
// Herald's (a carved stone crier, wings and all) deep and heavy.
const ROAR_PITCH = { hollow_choir: 1.3, gale_herald: 0.7, moss_hart: 0.75, lockkeeper: 0.9, gravebell_ringer: 0.85, vein_matron: 1.15 };

// A move whose wind-up has its own sound under the shared tell.
const TELL_EXTRA = { stoop: 'ch_stoop_rise', harts_leap: 'ch_leap_gather', chain_hook: 'ch_hook_whirl' };

export function createChampionEventCues() {
  return {
    champion_spawn: (ev, h) => [{ cue: 'roar', ...at(ev, h, ev.id), pitch: ROAR_PITCH[ev.champion] ?? 0.8 }, { cue: `ch_${ev.champion}_sting` }],
    champion_rage: (ev, h) => [{ cue: 'roar', ...at(ev, h, ev.id), pitch: 0.9, gainDb: -4 }, { cue: `ch_${ev.champion}_rage` }],
    // The Gale Herald's stoop also takes wing where it stands.
    champion_tell: (ev, h) => [{ cue: 'ch_tell', ...at(ev, h, ev.id) }, ...(TELL_EXTRA[ev.move] ? [{ cue: TELL_EXTRA[ev.move], ...at({}, h, ev.id) }] : [])],
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
