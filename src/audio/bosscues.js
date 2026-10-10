// Boss identity: each of the six bosses' own stings and beat cues
// (docs/CONTENT_PLAN.md slice 3, "per-boss HUD medal and music stings").
// Registered on the engine like the M4b content cues (engine.registerCue /
// registerEventCue): procedural voices on the engine's own kit, no files.
//
// Per boss:
//   bx_<boss>_sting  its signature, on the MUSIC bus as its banner lands
//                    (boss_spawn), in the key and instruments of its act
//                    theme so the score still reads as one (wood: D phrygian,
//                    horn / lute / hand drum; mill: A phrygian, reed / drips /
//                    frame drum; barrow: E harmonic, choir / bells / taiko).
//   bx_<boss>_phase  a two-note rise on each add phase (boss_adds) and on the
//                    Wyrm's and Lich Ram's enrage.
//   bx_<boss>_fall   a falling cadence that lands on the major third, on its
//                    death (with the shared boss_death body thud).
//   beat cues        one spatial SFX per kit beat (spear, wingbeat, breath,
//                    grind, rush ...) and a boss-voiced tell in place of the
//                    generic telegraph tick on the five kit bosses.
// The Hollow Stag keeps every cue it had (roar, quake, trample, horn,
// boss_death, telegraph) and gains its sting, phase and fall on top. The five
// kit bosses used to fall to the plain enemy `kill` pop (death events carry
// their kind, not `stag`); they now get boss_death as well.
//
// Everything here is listen-only: no sim state is read except the event
// payloads and entity kinds, so the goldens cannot move.
import { midiHz } from './voices.js';

export const BOSS_IDS = Object.freeze(['stag', 'thornmother', 'heron', 'millwheel', 'wyrm', 'lichram', 'cantor', 'colossus', 'gloamwolf', 'mireking', 'ashraven', 'veinweaver']);
const KIT_BOSSES = new Set(['thornmother', 'heron', 'millwheel', 'wyrm', 'lichram', 'cantor', 'colossus', 'gloamwolf', 'mireking', 'ashraven', 'veinweaver']);

// Measured design peaks (dBFS at unity gain) — tools/boss-identity-cuecal.mjs.
export const BOSS_CUE_CAL = {
  // @cal begin
  bx_stag_sting: 6.1,
  bx_stag_phase: 6.3,
  bx_stag_fall: 7.2,
  bx_thornmother_sting: 3.5,
  bx_thornmother_phase: 5.5,
  bx_thornmother_fall: 4.9,
  bx_heron_sting: 4.5,
  bx_heron_phase: 5.3,
  bx_heron_fall: 4,
  bx_millwheel_sting: 4.5,
  bx_millwheel_phase: 6,
  bx_millwheel_fall: 4.3,
  bx_wyrm_sting: 9.5,
  bx_wyrm_phase: 5.9,
  bx_wyrm_fall: 6.7,
  bx_lichram_sting: 7.3,
  bx_lichram_phase: 6.6,
  bx_lichram_fall: 6.4,
  bx_cantor_sting: 3,
  bx_cantor_phase: 6.3,
  bx_cantor_fall: 4.1,
  bx_colossus_sting: 8.6,
  bx_colossus_phase: 8.2,
  bx_colossus_fall: 4.7,
  bx_heron_tell: -2.3,
  bx_heron_spear: 1.6,
  bx_heron_pierce: -2.4,
  bx_heron_wing: -4.5,
  bx_heron_dive: -5.2,
  bx_heron_surface: -2.2,
  bx_wyrm_tell: 0.3,
  bx_wyrm_breath: 0.1,
  bx_wyrm_burrow: -0.1,
  bx_wyrm_emerge: -1.4,
  bx_thornmother_tell: -6,
  bx_thornmother_charge: -1.3,
  bx_thornmother_stop: 1.4,
  bx_thornmother_volley: -3.9,
  bx_thornmother_burst: 4.3,
  bx_millwheel_tell: -5.9,
  bx_millwheel_saw: -3.2,
  bx_millwheel_clank: 2,
  bx_millwheel_grind: -1.3,
  bx_millwheel_shards: -0.8,
  bx_lichram_tell: -1.3,
  bx_lichram_rush: 0.3,
  bx_lichram_stuck: 2.3,
  bx_lichram_call: -0.9,
  bx_lichram_raise: -5.8,
  bx_cantor_tell: -14.5,
  bx_cantor_note: 1.4,
  bx_cantor_echo: -6.1,
  bx_cantor_lance: -1.3,
  bx_cantor_verse: -6.4,
  bx_cantor_fade: -1.7,
  bx_cantor_land: -7.3,
  bx_cantor_pulse: 1.2,
  bx_colossus_tell: -3,
  bx_colossus_fissure: 1.1,
  bx_colossus_rain: -5,
  bx_colossus_burst: 3.3,
  bx_gloamwolf_sting: 6.1,
  bx_gloamwolf_phase: 6.3,
  bx_gloamwolf_fall: 7.2,
  bx_mireking_sting: 4.5,
  bx_mireking_phase: 5.3,
  bx_mireking_fall: 4,
  bx_gloamwolf_tell: -3.8,
  bx_gloamwolf_pounce: 2.4,
  bx_gloamwolf_rend: 1.5,
  bx_gloamwolf_howl: -1.8,
  bx_mireking_tell: -2.5,
  bx_mireking_lash: 1.7,
  bx_mireking_flop: 3.2,
  bx_mireking_gape: -2.5,
  bx_mireking_swallow: 2.2,
  bx_ashraven_sting: 5.2,
  bx_ashraven_phase: 5.8,
  bx_ashraven_fall: 6.4,
  bx_veinweaver_sting: 4.8,
  bx_veinweaver_phase: 5.6,
  bx_veinweaver_fall: 5.9,
  bx_ashraven_tell: -3,
  bx_ashraven_dive: 2.4,
  bx_ashraven_gust: 1.6,
  bx_ashraven_omen: 2.6,
  bx_veinweaver_tell: -3,
  bx_veinweaver_bind: 1.4,
  bx_veinweaver_slam: 3.2,
  bx_veinweaver_brood: -1.5,
  // @cal end
};

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);
const H = (p, m) => P(p, midiHz(m));

// ------------------------------------------------------------ instruments --
// Small score voices (the act themes' instruments, voiced for one-shots).
const I = {
  horn: (k, d, t, f, v, len) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: f * 0.985, f1: f, glide: 0.06, a: 0.04, hold: len, d: 0.45, gain: v * 0.5, filter: { f0: 1700, f1: 650, q: 1.2, glide: len + 0.3 } }),
      k.tone(d, t, { type: 'sawtooth', f0: f * 1.5, a: 0.05, hold: len, d: 0.4, gain: v * 0.22, filter: { f0: 1500, f1: 600, q: 1.2, glide: len + 0.3 } }),
      k.tone(d, t, { f0: f * 0.5, a: 0.03, hold: len, d: 0.5, gain: v * 0.35 })
    ),
  lute: (k, d, t, f, v, len) => k.pluck(d, t, { f, d: Math.min(1.2, len + 0.35), gain: v, bright: 3400, dark: 700 }),
  bell: (k, d, t, f, v, len) => k.bell(d, t, { f, ratio: 3.5, index: 1.2, d: Math.max(0.6, len + 0.6), gain: v * 0.7 }),
  clank: (k, d, t, f, v) =>
    Math.max(k.bell(d, t, { f, ratio: 2.76, index: 2.2, d: 0.45, gain: v * 0.7 }), k.noise(d, t, { f0: 3200, q: 3, d: 0.03, gain: v * 0.4 })),
  toll: (k, d, t, f, v, len) =>
    Math.max(k.bell(d, t, { f, ratio: 1.4, index: 2.2, d: Math.max(1.4, len + 1), gain: v * 0.8 }), k.tone(d, t, { f0: f * 0.5, a: 0.01, d: 1.2, gain: v * 0.3 })),
  choir: (k, d, t, f, v, len) => k.pad(d, t, { notes: [f], dur: Math.max(0.3, len), a: 0.16, r: 0.6, gain: v, formant: 760, type: 'sawtooth' }),
  reed: (k, d, t, f, v, len) =>
    k.tone(d, t, { type: 'square', f0: f, a: 0.05, hold: Math.max(0, len), d: 0.25, gain: v * 0.55, filter: { f0: 1200, q: 0.9 } }),
  drip: (k, d, t, f, v) => k.tone(d, t, { f0: f, f1: f * 1.5, glide: 0.035, a: 0.002, d: 0.22, gain: v * 0.8 }),
  low: (k, d, t, f, v, len) =>
    k.tone(d, t, { type: 'triangle', f0: f, a: 0.02, hold: Math.max(0, len * 0.7), d: len * 0.4 + 0.2, gain: v, filter: { f0: 600, q: 0.7 } }),
  hand: (k, d, t, f, v) => Math.max(k.tone(d, t, { f0: 190, f1: 95, d: 0.14, gain: v }), k.noise(d, t, { f0: 1300, q: 1.2, d: 0.04, gain: v * 0.45 })),
  frame: (k, d, t, f, v) => Math.max(k.tone(d, t, { f0: 125, f1: 66, d: 0.26, gain: v }), k.noise(d, t, { type: 'lowpass', f0: 950, q: 0.8, d: 0.1, gain: v * 0.5 })),
  taiko: (k, d, t, f, v) =>
    Math.max(k.tone(d, t, { f0: 72, f1: 40, d: 0.6, gain: v }), k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 320, q: 0.7, d: 0.25, gain: v * 0.8 })),
  // Act IV (the heart theme's own): struck crystal and the heartbeat.
  glass: (k, d, t, f, v, len) =>
    Math.max(k.bell(d, t, { f, ratio: 5.04, index: 0.9, d: Math.max(0.8, len + 0.8), gain: v * 0.75 }), k.tone(d, t, { f0: f * 2, a: 0.003, d: 0.25, gain: v * 0.12 })),
  heart: (k, d, t, f, v) =>
    Math.max(
      k.tone(d, t, { f0: 62, f1: 36, d: 0.34, gain: v }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 200, q: 0.8, d: 0.16, gain: v * 0.75 }),
      k.tone(d, t + 0.2, { f0: 58, f1: 34, d: 0.3, gain: v * 0.7 })
    ),
};

// notes: [dt, midi, instr, velocity, len]; pitch scales every note (bake).
export function phrase(k, t, d, p, notes) {
  let end = t;
  for (const [dt, m, ins, v, len = 0.3] of notes) end = Math.max(end, I[ins](k, d, t + dt, H(p, m), v, len));
  return end;
}

// Each boss's musical identity: its act's key (root MIDI of the boss scale)
// and the two instruments it speaks with.
const VOICE = {
  stag: { root: 50, lead: 'horn', drum: 'taiko' }, // Hollow Wood, D phrygian
  thornmother: { root: 50, lead: 'lute', drum: 'hand' }, // Hollow Wood, D phrygian
  heron: { root: 57, lead: 'reed', drum: 'frame' }, // Sunken Mill, A phrygian
  millwheel: { root: 57, lead: 'clank', drum: 'frame' }, // Sunken Mill, A phrygian
  wyrm: { root: 52, lead: 'horn', drum: 'taiko' }, // the Barrow, E harmonic minor
  lichram: { root: 52, lead: 'toll', drum: 'taiko' }, // the Barrow, E harmonic minor
  cantor: { root: 49, lead: 'choir', drum: 'heart' }, // the Heart, C# phrygian
  colossus: { root: 49, lead: 'glass', drum: 'heart' }, // the Heart, C# phrygian
  gloamwolf: { root: 50, lead: 'horn', drum: 'hand' }, // Hollow Wood, D phrygian
  mireking: { root: 57, lead: 'reed', drum: 'frame' }, // Sunken Mill, A phrygian
  ashraven: { root: 52, lead: 'toll', drum: 'taiko' }, // the Barrow, E harmonic minor
  veinweaver: { root: 49, lead: 'choir', drum: 'heart' }, // the Heart, C# phrygian
};

// Signatures (~1.6-2.4 s): a phrase in the boss's own act key.
const STINGS = {
  // A three-note horn call that lands on the phrygian flat second.
  stag: [[0, 38, 'low', 0.8, 1.6], [0, 0, 'taiko', 1], [0, 50, 'horn', 0.9, 0.3], [0.38, 57, 'horn', 0.9, 0.26], [0.72, 51, 'horn', 1, 0.9], [0.72, 0, 'taiko', 0.9], [0.72, 75, 'bell', 0.35, 1.2]],
  // A briar of plucks climbing into a held D / E-flat rub.
  thornmother: [[0, 0, 'hand', 1], [0, 50, 'lute', 0.8], [0.07, 51, 'lute', 0.75], [0.14, 53, 'lute', 0.75], [0.21, 57, 'lute', 0.8], [0.28, 58, 'lute', 0.85], [0.42, 50, 'choir', 0.55, 1.2], [0.42, 51, 'choir', 0.5, 1.2], [0.42, 38, 'low', 0.8, 1.3], [0.42, 0, 'hand', 0.9], [0.56, 0, 'hand', 0.6], [0.7, 62, 'lute', 0.6], [0.77, 63, 'lute', 0.7]],
  // Rising drips, then the heron's cry bending up a half step.
  heron: [[0, 0, 'frame', 1], [0, 69, 'drip', 0.8], [0.12, 72, 'drip', 0.8], [0.24, 76, 'drip', 0.85], [0.42, 69, 'reed', 0.9, 0.35], [0.82, 70, 'reed', 0.95, 0.7], [0.42, 0, 'frame', 0.8], [0.42, 33, 'low', 0.9, 1.3], [0.82, 45, 'low', 0.5, 0.8]],
  // The wheel turning: clanks on an even grid, A B-flat A E, then a heavy fall.
  millwheel: [[0, 57, 'clank', 0.9], [0.18, 58, 'clank', 0.85], [0.36, 57, 'clank', 0.85], [0.54, 52, 'clank', 0.9], [0, 0, 'frame', 0.7], [0.36, 0, 'frame', 0.6], [0.72, 0, 'frame', 1], [0.72, 33, 'low', 1, 1.2], [0.72, 45, 'reed', 0.6, 0.8], [0.72, 46, 'reed', 0.45, 0.8]],
  // A choir drone under a horn rising to the raised seventh (harmonic minor).
  wyrm: [[0, 40, 'choir', 0.6, 1.5], [0, 47, 'choir', 0.5, 1.5], [0, 0, 'taiko', 1], [0, 28, 'low', 1, 1.6], [0.5, 52, 'horn', 0.8, 0.3], [0.85, 63, 'horn', 0.9, 0.2], [1.05, 64, 'horn', 1, 0.8], [0.5, 0, 'taiko', 0.7], [1.05, 0, 'taiko', 1], [1.05, 76, 'bell', 0.3, 1.2]],
  // Three grave tolls, E F E, under a held choir.
  lichram: [[0, 40, 'toll', 1], [0.45, 41, 'toll', 0.9], [0.9, 40, 'toll', 1], [0.1, 52, 'choir', 0.45, 1.5], [0.1, 55, 'choir', 0.4, 1.5], [0.1, 59, 'choir', 0.35, 1.5], [0, 0, 'taiko', 0.9], [0.9, 0, 'taiko', 1], [0.9, 28, 'low', 0.9, 1.2]],
  // The final boss: one heartbeat, then a choir sings the whole hollow
  // chord (C# D E G#) as glass rings the tonic two octaves up.
  cantor: [[0, 0, 'heart', 1], [0, 25, 'low', 1, 2.0], [0.3, 61, 'choir', 0.5, 1.6], [0.45, 62, 'choir', 0.45, 1.5], [0.6, 64, 'choir', 0.45, 1.4], [0.75, 68, 'choir', 0.5, 1.3], [0.75, 85, 'glass', 0.4, 1.4], [1.2, 0, 'heart', 0.9], [1.2, 73, 'glass', 0.45, 1.2], [1.2, 37, 'low', 0.7, 1.0]],
  // Struck crystal falling C# G# D C#, under two heavy heartbeats.
  colossus: [[0, 0, 'heart', 1], [0, 25, 'low', 1, 1.6], [0, 73, 'glass', 0.85], [0.22, 68, 'glass', 0.8], [0.44, 62, 'glass', 0.8], [0.66, 61, 'glass', 0.9, 0.8], [0.66, 0, 'heart', 1], [0.66, 37, 'low', 0.9, 1.2], [0.66, 49, 'choir', 0.4, 1.0]],
  // Third bosses (docs/THIRD_BOSSES.md). The Gloam Wolf: a howl on the horn
  // that climbs D A D and bends down onto the flat second, over running hands.
  gloamwolf: [[0, 0, 'hand', 0.8], [0.12, 0, 'hand', 0.7], [0.24, 0, 'hand', 0.9], [0, 38, 'low', 0.8, 1.6], [0.3, 50, 'horn', 0.8, 0.3], [0.62, 57, 'horn', 0.85, 0.28], [0.95, 62, 'horn', 1, 0.6], [1.5, 63, 'horn', 0.8, 0.5], [0.95, 0, 'taiko', 1], [0.95, 74, 'bell', 0.3, 1.2], [0.95, 50, 'choir', 0.4, 1.2]],
  // The Mire King: two low croaks on the reed, A then B-flat, a frame-drum
  // splash and drips falling back into the pond.
  mireking: [[0, 0, 'frame', 1], [0, 33, 'low', 1, 1.4], [0, 45, 'reed', 0.95, 0.4], [0.5, 46, 'reed', 1, 0.6], [0.5, 0, 'frame', 0.9], [0.5, 21, 'low', 0.8, 1.2], [1.0, 76, 'drip', 0.6], [1.12, 72, 'drip', 0.55], [1.24, 69, 'drip', 0.5], [1.0, 57, 'choir', 0.35, 1.0]],
  // Slice 11. The Ash Raven: a caw on the toll falling a minor third, twice,
  // the second a half step higher, over taiko and a held choir.
  ashraven: [[0, 0, 'taiko', 1], [0, 28, 'low', 0.9, 1.6], [0, 55, 'toll', 0.9], [0.22, 52, 'toll', 0.85], [0.6, 56, 'toll', 1], [0.82, 53, 'toll', 0.95], [0.6, 0, 'taiko', 0.9], [0.1, 52, 'choir', 0.4, 1.6], [0.1, 59, 'choir', 0.35, 1.6], [1.1, 76, 'bell', 0.3, 1.2]],
  // The Vein Weaver: glass picking up a web, C# D E F#, a heartbeat, then
  // the thread snaps back down to the tonic under the choir.
  veinweaver: [[0, 0, 'heart', 1], [0, 25, 'low', 1, 1.8], [0.1, 61, 'glass', 0.7], [0.22, 62, 'glass', 0.7], [0.34, 64, 'glass', 0.75], [0.46, 66, 'glass', 0.8], [0.7, 0, 'heart', 0.9], [0.7, 73, 'glass', 0.85, 0.8], [0.7, 49, 'choir', 0.45, 1.2], [0.7, 50, 'choir', 0.4, 1.2], [1.1, 61, 'glass', 0.6, 1.0]],
};

// Add phase / enrage: the boss's lead rises a half step over its drum.
const phaseNotes = (v) => [
  [0, 0, v.drum, 1],
  [0, v.root - 12, 'low', 0.8, 0.6],
  [0, v.root, v.lead, 0.9, 0.22],
  [0.2, v.root + 1, v.lead, 1, 0.5],
  [0.2, 0, v.drum, 0.8],
];
// Death: fifth, fourth, flat second, tonic, then the major third rings out.
const fallNotes = (v) => [
  [0, v.root + 7, v.lead, 0.9, 0.3],
  [0.3, v.root + 5, v.lead, 0.85, 0.3],
  [0.6, v.root + 1, v.lead, 0.85, 0.3],
  [0.9, v.root, v.lead, 0.9, 0.8],
  [0.9, v.root - 12, 'low', 0.9, 1.4],
  [0.9, 0, v.drum, 1],
  [1.25, v.root + 16, 'bell', 0.4, 1.4],
  [1.25, v.root + 4, 'choir', 0.4, 1.2],
];

const STING_DEF = { bus: 'music', priority: 5, maxVoices: 1, cooldownMs: 800 };
const CUES = {};
for (const id of BOSS_IDS) {
  CUES[`bx_${id}_sting`] = { ...STING_DEF, levelDb: -8, fn: (k, t, d, p) => phrase(k, t, d, p, STINGS[id]) };
  CUES[`bx_${id}_phase`] = { ...STING_DEF, levelDb: -10, cooldownMs: 400, fn: (k, t, d, p) => phrase(k, t, d, p, phaseNotes(VOICE[id])) };
  CUES[`bx_${id}_fall`] = { ...STING_DEF, levelDb: -8, fn: (k, t, d, p) => phrase(k, t, d, p, fallNotes(VOICE[id])) };
}

// ------------------------------------------------------------ beat SFX --
const sfx = (levelDb, fn, extra = {}) => ({ bus: 'sfx', levelDb, priority: 4, maxVoices: 2, cooldownMs: 80, ...extra, fn });
Object.assign(CUES, {
  // --- The Drowned Heron (Act II): water, reed cry, the spear-bill.
  bx_heron_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'square', f0: P(p, 880), f1: P(p, 932), glide: 0.18, a: 0.02, hold: 0.12, d: 0.2, gain: 0.5, filter: { f0: 1500, q: 1 } }),
      k.tone(d, t, { f0: P(p, 1320), f1: P(p, 1980), glide: 0.04, d: 0.18, gain: 0.35 })
    )),
  bx_heron_spear: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 2400), f1: P(p, 5200), q: 0.8, a: 0.01, d: 0.14, gain: 0.9 }),
      k.tone(d, t, { type: 'triangle', f0: P(p, 1400), f1: P(p, 620), d: 0.1, gain: 0.5 })
    )),
  bx_heron_pierce: sfx(-12, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 1800), f1: P(p, 700), q: 2, d: 0.1, gain: 1 }),
      k.tone(d, t, { f0: P(p, 300), f1: P(p, 140), d: 0.07, gain: 0.5 })
    ), { priority: 3, maxVoices: 3, cooldownMs: 50 }),
  bx_heron_wing: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'lowpass', f0: P(p, 650), f1: P(p, 240), q: 0.9, a: 0.04, d: 0.18, gain: 1 }),
      k.noise(d, t + 0.15, { type: 'lowpass', f0: P(p, 650), f1: P(p, 240), q: 0.9, a: 0.04, d: 0.2, gain: 1 }),
      k.tone(d, t + 0.15, { f0: P(p, 92), f1: P(p, 58), d: 0.2, gain: 0.6 })
    )),
  bx_heron_dive: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 1500), f1: P(p, 380), q: 1.3, d: 0.34, gain: 1 }),
      k.tone(d, t + 0.05, { f0: P(p, 240), f1: P(p, 80), glide: 0.25, d: 0.3, gain: 0.5 }),
      k.tone(d, t + 0.28, { f0: P(p, 520), f1: P(p, 780), glide: 0.04, d: 0.12, gain: 0.25 })
    )),
  bx_heron_surface: sfx(-9.5, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 1000), f1: P(p, 280), q: 0.8, d: 0.45, gain: 1 }),
      k.noise(d, t + 0.02, { f0: P(p, 2600), f1: P(p, 1100), q: 1.2, a: 0.01, d: 0.55, gain: 0.55 }),
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 52), d: 0.35, gain: 0.6 })
    )),
  // --- The Barrow Wyrm (Act III): growl, fire, earth.
  bx_wyrm_tell: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 68), f1: P(p, 96), glide: 0.45, a: 0.06, hold: 0.2, d: 0.3, gain: 0.7, filter: { f0: 520, q: 1.4 } }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 380), q: 0.8, a: 0.08, hold: 0.2, d: 0.3, gain: 0.7 })
    )),
  bx_wyrm_breath: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 1500), f1: P(p, 520), q: 0.8, a: 0.05, hold: 0.45, d: 0.5, gain: 1 }),
      k.noise(d, t + 0.03, { f0: P(p, 950), f1: P(p, 1500), q: 0.9, a: 0.08, hold: 0.35, d: 0.4, gain: 0.5 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 62), f1: P(p, 44), a: 0.05, hold: 0.3, d: 0.4, gain: 0.35, filter: { f0: 400, q: 0.8 } })
    ), { maxVoices: 1, cooldownMs: 300 }),
  bx_wyrm_burrow: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 520), f1: P(p, 200), q: 0.9, a: 0.05, hold: 0.3, d: 0.4, gain: 1 }),
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 44), a: 0.04, hold: 0.25, d: 0.3, gain: 0.5 })
    )),
  bx_wyrm_emerge: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 1300), f1: P(p, 240), q: 0.8, d: 0.55, gain: 1 }),
      k.tone(d, t, { f0: P(p, 82), f1: P(p, 36), d: 0.5, gain: 0.8 }),
      k.noise(d, t + 0.04, { type: 'highpass', f0: P(p, 3000), q: 0.7, d: 0.3, gain: 0.3 })
    ), { maxVoices: 1, cooldownMs: 300 }),
  // --- The Thornmother (Act I): briar rustle, seed pops, a cracking burst.
  bx_thornmother_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 3000), q: 0.9, a: 0.03, hold: 0.15, d: 0.2, gain: 1 }),
      k.pluck(d, t, { f: P(p, midiHz(62)), d: 0.35, gain: 0.45, bright: 3600 }),
      k.pluck(d, t + 0.05, { f: P(p, midiHz(63)), d: 0.35, gain: 0.45, bright: 3600 })
    )),
  bx_thornmother_charge: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 600), q: 0.8, a: 0.05, hold: 0.3, d: 0.3, gain: 1 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2400), q: 0.8, a: 0.05, hold: 0.4, d: 0.2, gain: 0.8 })
    ), { maxVoices: 1 }),
  bx_thornmother_stop: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 125), f1: P(p, 48), d: 0.22, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, q: 0.7, d: 0.18, gain: 0.7 })
    )),
  bx_thornmother_volley: sfx(-11, (k, t, d, p) =>
    Math.max(
      ...[0, 0.05, 0.1, 0.15].map((dt, i) => k.tone(d, t + dt, { f0: P(p, 620 + i * 40), f1: P(p, 300), d: 0.06, gain: 0.6 })),
      k.noise(d, t, { f0: P(p, 1800), q: 1.5, d: 0.2, gain: 0.35 })
    )),
  bx_thornmother_burst: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 2000), q: 0.7, a: 0.003, d: 0.28, gain: 0.9 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2600), q: 0.8, d: 0.4, gain: 0.8 }),
      k.tone(d, t, { f0: P(p, 210), f1: P(p, 80), d: 0.2, gain: 0.6 })
    )),
  // --- The Millwheel (Act II): ratchet, saw whine, iron and oak.
  bx_millwheel_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      ...[0, 0.06, 0.12, 0.18].map((dt) => k.noise(d, t + dt, { f0: P(p, 3200), q: 4, d: 0.025, gain: 0.9 })),
      k.bell(d, t + 0.18, { f: P(p, 440), ratio: 2.76, index: 1.8, d: 0.3, gain: 0.5 })
    )),
  bx_millwheel_saw: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 700), f1: P(p, 1150), glide: 0.4, a: 0.02, hold: 0.3, d: 0.25, gain: 0.45, filter: { f0: 2600, q: 1.2 } }),
      k.noise(d, t, { f0: P(p, 3000), q: 2, a: 0.02, hold: 0.3, d: 0.2, gain: 0.45 })
    ), { maxVoices: 1, cooldownMs: 200 }),
  bx_millwheel_clank: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 220), ratio: 2.76, index: 2.2, d: 0.55, gain: 0.8 }),
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 60), d: 0.18, gain: 0.7 })
    )),
  bx_millwheel_grind: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 420), q: 0.9, a: 0.04, hold: 0.4, d: 0.3, gain: 1 }),
      k.tone(d, t, { type: 'square', f0: P(p, 55), a: 0.04, hold: 0.4, d: 0.3, gain: 0.3, filter: { f0: 320, q: 1 } }),
      ...[0, 0.1, 0.2, 0.3, 0.4].map((dt) => k.noise(d, t + dt, { f0: P(p, 2600), q: 4, d: 0.02, gain: 0.5 }))
    ), { maxVoices: 1, cooldownMs: 200 }),
  bx_millwheel_shards: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1760), ratio: 2.76, index: 1.6, d: 0.3, gain: 0.6 }),
      k.bell(d, t + 0.04, { f: P(p, 2093), ratio: 2.76, index: 1.6, d: 0.28, gain: 0.5 }),
      k.bell(d, t + 0.09, { f: P(p, 1568), ratio: 2.76, index: 1.6, d: 0.3, gain: 0.5 }),
      k.noise(d, t, { type: 'highpass', f0: 4000, q: 0.7, d: 0.08, gain: 0.4 })
    )),
  // --- The Lich Ram (Act III): hooves, bone, grave tolls.
  bx_lichram_tell: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 150), f1: P(p, 60), d: 0.14, gain: 0.9 }),
      k.tone(d, t + 0.16, { f0: P(p, 150), f1: P(p, 60), d: 0.14, gain: 0.9 }),
      k.noise(d, t + 0.2, { f0: P(p, 900), f1: P(p, 600), q: 2, a: 0.03, d: 0.22, gain: 0.6 })
    )),
  bx_lichram_rush: sfx(-9, (k, t, d, p) =>
    Math.max(
      ...[0, 0.1, 0.2, 0.3].map((dt) => k.tone(d, t + dt, { f0: P(p, 145), f1: P(p, 58), d: 0.12, gain: 0.85 })),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 600), q: 0.8, a: 0.04, hold: 0.3, d: 0.25, gain: 0.7 })
    ), { maxVoices: 1, cooldownMs: 200 }),
  bx_lichram_stuck: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 330), ratio: 1.4, index: 3, d: 0.7, gain: 0.8 }),
      k.noise(d, t, { f0: P(p, 2600), q: 1.4, d: 0.1, gain: 0.6 }),
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 50), d: 0.2, gain: 0.6 })
    )),
  bx_lichram_call: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, midiHz(40)), ratio: 1.4, index: 2.2, d: 1.6, gain: 0.9 }),
      k.pad(d, t + 0.05, { notes: [P(p, midiHz(52)), P(p, midiHz(55))], dur: 0.5, a: 0.15, r: 0.7, gain: 0.5, formant: 760, type: 'sawtooth' })
    ), { bus: 'sfx', maxVoices: 1, cooldownMs: 400 }),
  bx_lichram_raise: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 800), f1: P(p, 200), q: 0.8, d: 0.45, gain: 1 }),
      k.tone(d, t + 0.05, { f0: P(p, 330), f1: P(p, 294), a: 0.12, d: 0.6, gain: 0.35 })
    ), { maxVoices: 2 }),
  // --- The Hollow Cantor (Act IV): a choir, glass, the heartbeat.
  // Its tell is a breath drawn in: a rising choir vowel.
  bx_cantor_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.pad(d, t, { notes: [P(p, midiHz(61)), P(p, midiHz(62))], dur: 0.35, a: 0.2, r: 0.3, gain: 0.55, formant: 900, type: 'sawtooth' }),
      k.noise(d, t, { f0: P(p, 1800), f1: P(p, 3200), q: 3, a: 0.2, d: 0.15, gain: 0.25 })
    )),
  // The note: one sung tone with a glass strike on top.
  bx_cantor_note: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.pad(d, t, { notes: [P(p, midiHz(73))], dur: 0.25, a: 0.01, r: 0.6, gain: 0.6, formant: 700, type: 'sawtooth' }),
      k.bell(d, t, { f: P(p, midiHz(85)), ratio: 5.04, index: 0.9, d: 0.9, gain: 0.55 }),
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 60), d: 0.18, gain: 0.6 })
    ), { maxVoices: 2, cooldownMs: 120 }),
  bx_cantor_echo: sfx(-13, (k, t, d, p) =>
    Math.max(...[0, 0.09, 0.18].map((dt, i) => k.bell(d, t + dt, { f: P(p, midiHz(80 - i * 5)), ratio: 5.04, index: 0.8, d: 0.4, gain: 0.5 - i * 0.12 }))), { maxVoices: 1, cooldownMs: 150 }),
  bx_cantor_lance: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.pad(d, t, { notes: [P(p, midiHz(68)), P(p, midiHz(74))], dur: 0.35, a: 0.01, r: 0.4, gain: 0.55, formant: 1100, type: 'sawtooth' }),
      k.noise(d, t, { type: 'highpass', f0: P(p, 2600), f1: P(p, 6000), q: 0.8, a: 0.01, d: 0.25, gain: 0.6 })
    ), { maxVoices: 1, cooldownMs: 200 }),
  // A verse taken: a chord in the stolen land's own key swells and turns hollow.
  bx_cantor_verse: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.pad(d, t, { notes: [P(p, midiHz(50)), P(p, midiHz(57)), P(p, midiHz(62))], dur: 0.7, a: 0.15, r: 0.8, gain: 0.55, formant: 760, type: 'sawtooth' }),
      k.pad(d, t + 0.7, { notes: [P(p, midiHz(49)), P(p, midiHz(50)), P(p, midiHz(56))], dur: 0.6, a: 0.1, r: 0.9, gain: 0.5, formant: 620, type: 'sawtooth' }),
      k.bell(d, t + 0.7, { f: P(p, midiHz(85)), ratio: 5.04, index: 0.9, d: 1.4, gain: 0.4 })
    ), { bus: 'sfx', maxVoices: 1, cooldownMs: 600 }),
  bx_cantor_fade: sfx(-12, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 880), f1: P(p, 220), glide: 0.3, d: 0.35, gain: 0.45 }),
      k.noise(d, t, { type: 'highpass', f0: P(p, 4000), f1: P(p, 1500), q: 0.8, d: 0.3, gain: 0.35 })
    ), { maxVoices: 1, cooldownMs: 200 }),
  bx_cantor_land: sfx(-12, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 220), f1: P(p, 880), glide: 0.15, d: 0.25, gain: 0.45 }),
      k.bell(d, t + 0.08, { f: P(p, midiHz(73)), ratio: 5.04, index: 0.8, d: 0.6, gain: 0.4 })
    ), { maxVoices: 1, cooldownMs: 200 }),
  bx_cantor_pulse: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 32), d: 0.55, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 400), f1: P(p, 120), q: 0.8, d: 0.4, gain: 0.9 }),
      k.pad(d, t, { notes: [P(p, midiHz(37)), P(p, midiHz(38))], dur: 0.3, a: 0.01, r: 0.5, gain: 0.4, formant: 500, type: 'sawtooth' })
    ), { maxVoices: 1, cooldownMs: 300 }),
  // --- The Geode Colossus (Act IV): slate, glass, the heartbeat.
  bx_colossus_tell: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 500), f1: P(p, 900), q: 1, a: 0.15, d: 0.2, gain: 0.8 }),
      k.bell(d, t + 0.1, { f: P(p, midiHz(80)), ratio: 5.04, index: 0.9, d: 0.4, gain: 0.35 })
    )),
  bx_colossus_fissure: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 38), d: 0.4, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 900), f1: P(p, 250), q: 0.8, d: 0.5, gain: 0.9 }),
      ...[0.05, 0.12, 0.2, 0.3].map((dt, i) => k.bell(d, t + dt, { f: P(p, 1600 + i * 300), ratio: 5.04, index: 1, d: 0.25, gain: 0.3 }))
    ), { maxVoices: 1, cooldownMs: 200 }),
  bx_colossus_rain: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 300), f1: P(p, 700), q: 0.9, a: 0.25, d: 0.3, gain: 0.8 }),
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 70), a: 0.1, d: 0.5, gain: 0.5 })
    ), { maxVoices: 1, cooldownMs: 300 }),
  bx_colossus_burst: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 34), d: 0.5, gain: 1 }),
      k.noise(d, t, { f0: P(p, 3000), q: 1.2, d: 0.12, gain: 0.7 }),
      ...[0, 0.03, 0.07, 0.11].map((dt, i) => k.bell(d, t + dt, { f: P(p, 1400 + i * 420), ratio: 5.04, index: 1.2, d: 0.5, gain: 0.35 }))
    ), { maxVoices: 1, cooldownMs: 200 }),
  // --- The Gloam Wolf (Act I): breath, claws and the howl.
  // Its tell is a growl drawn in through the teeth.
  bx_gloamwolf_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 260), f1: P(p, 420), q: 2.2, a: 0.08, d: 0.35, gain: 0.9 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 70), f1: P(p, 82), a: 0.08, hold: 0.15, d: 0.25, gain: 0.35, filter: { f0: 500, q: 1.4 } })
    )),
  bx_gloamwolf_pounce: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 42), d: 0.35, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 900), f1: P(p, 220), q: 0.8, d: 0.32, gain: 0.9 }),
      k.noise(d, t, { f0: P(p, 2600), f1: P(p, 1200), q: 1.4, d: 0.08, gain: 0.45 })
    ), { maxVoices: 1, cooldownMs: 150 }),
  bx_gloamwolf_rend: sfx(-9, (k, t, d, p) =>
    Math.max(...[0, 0.05, 0.1].map((dt, i) => k.noise(d, t + dt, { type: 'highpass', f0: P(p, 3200 - i * 400), f1: P(p, 1400), q: 1.1, a: 0.004, d: 0.09, gain: 0.85 - i * 0.12 })),
      k.tone(d, t, { f0: P(p, 210), f1: P(p, 90), d: 0.12, gain: 0.45 })
    ), { maxVoices: 2, cooldownMs: 100 }),
  bx_gloamwolf_howl: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 330), f1: P(p, 620), glide: 0.45, a: 0.12, hold: 0.55, d: 0.6, gain: 0.5, filter: { f0: 1400, f1: 900, q: 2.4, glide: 1.0 } }),
      k.tone(d, t + 0.05, { type: 'sawtooth', f0: P(p, 495), f1: P(p, 930), glide: 0.45, a: 0.12, hold: 0.5, d: 0.6, gain: 0.25, filter: { f0: 1800, q: 2 } }),
      k.tone(d, t + 0.75, { type: 'sawtooth', f0: P(p, 620), f1: P(p, 440), glide: 0.5, hold: 0.1, d: 0.5, gain: 0.3, filter: { f0: 1200, q: 2 } })
    ), { maxVoices: 1, cooldownMs: 600 }),
  // --- The Mire King (Act II): croaks, a wet tongue, a heavy splash.
  bx_mireking_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'square', f0: P(p, 92), f1: P(p, 70), a: 0.02, hold: 0.08, d: 0.18, gain: 0.55, filter: { f0: 600, q: 3 } }),
      k.tone(d, t + 0.16, { type: 'square', f0: P(p, 98), f1: P(p, 74), a: 0.02, hold: 0.06, d: 0.16, gain: 0.5, filter: { f0: 600, q: 3 } })
    )),
  bx_mireking_lash: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 1800), f1: P(p, 4200), q: 0.9, a: 0.005, d: 0.1, gain: 0.8 }),
      k.tone(d, t + 0.08, { f0: P(p, 380), f1: P(p, 140), d: 0.14, gain: 0.5 }),
      k.noise(d, t + 0.1, { f0: P(p, 900), f1: P(p, 400), q: 2.2, d: 0.12, gain: 0.5 })
    ), { maxVoices: 1, cooldownMs: 150 }),
  bx_mireking_flop: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 85), f1: P(p, 34), d: 0.5, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 1100), f1: P(p, 260), q: 0.8, d: 0.5, gain: 1 }),
      k.noise(d, t + 0.03, { f0: P(p, 2400), f1: P(p, 900), q: 1.1, a: 0.01, d: 0.55, gain: 0.5 })
    ), { maxVoices: 1, cooldownMs: 200 }),
  bx_mireking_gape: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 300), f1: P(p, 900), q: 1.2, a: 0.4, d: 0.5, gain: 0.8 }),
      k.tone(d, t, { type: 'square', f0: P(p, 60), f1: P(p, 52), a: 0.3, hold: 0.4, d: 0.3, gain: 0.3, filter: { f0: 300, q: 2 } })
    ), { maxVoices: 1, cooldownMs: 400 }),
  bx_mireking_swallow: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 160), f1: P(p, 45), d: 0.3, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 700), f1: P(p, 180), q: 1, d: 0.3, gain: 0.9 }),
      k.tone(d, t + 0.22, { type: 'square', f0: P(p, 86), f1: P(p, 66), a: 0.02, hold: 0.1, d: 0.25, gain: 0.45, filter: { f0: 600, q: 3 } })
    ), { maxVoices: 1, cooldownMs: 200 }),
  // --- The Ash Raven (Act III): a caw, wings, the crows coming down.
  // Its tell is a rasping caw.
  bx_ashraven_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 620), f1: P(p, 380), a: 0.01, hold: 0.06, d: 0.2, gain: 0.5, filter: { f0: 1400, q: 3 } }),
      k.noise(d, t, { f0: P(p, 1500), f1: P(p, 900), q: 2.4, a: 0.01, d: 0.22, gain: 0.5 })
    )),
  // The dive: a rising rush of air that cracks on the landing.
  bx_ashraven_dive: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 600), f1: P(p, 2600), q: 0.9, a: 0.02, d: 0.3, gain: 0.9 }),
      k.tone(d, t + 0.18, { f0: P(p, 140), f1: P(p, 46), d: 0.32, gain: 0.9 }),
      k.noise(d, t + 0.18, { src: 'brown', type: 'lowpass', f0: P(p, 900), f1: P(p, 240), q: 0.8, d: 0.3, gain: 0.8 })
    ), { maxVoices: 1, cooldownMs: 150 }),
  // The gust: two heavy wingbeats.
  bx_ashraven_gust: sfx(-9, (k, t, d, p) =>
    Math.max(...[0, 0.16].map((dt, i) => k.noise(d, t + dt, { src: 'brown', type: 'lowpass', f0: P(p, 700 - i * 120), f1: P(p, 180), q: 0.7, a: 0.03, d: 0.24, gain: 1 - i * 0.15 })),
      k.noise(d, t + 0.05, { type: 'highpass', f0: P(p, 2200), q: 0.6, a: 0.02, d: 0.3, gain: 0.35 })
    ), { maxVoices: 1, cooldownMs: 150 }),
  // The omen lands: a flurry of beaks and wings on one spot.
  bx_ashraven_omen: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 40), d: 0.4, gain: 0.9 }),
      ...[0, 0.04, 0.09, 0.13, 0.18].map((dt, i) => k.noise(d, t + dt, { f0: P(p, 1800 + i * 300), f1: P(p, 900), q: 1.8, a: 0.004, d: 0.08, gain: 0.55 })),
      k.tone(d, t + 0.05, { type: 'sawtooth', f0: P(p, 700), f1: P(p, 420), hold: 0.04, d: 0.16, gain: 0.3, filter: { f0: 1600, q: 3 } })
    ), { maxVoices: 1, cooldownMs: 200 }),
  // --- The Vein Weaver (Act IV): a thread drawn taut, the Heart's beat.
  // Its tell is a glassy creak.
  bx_veinweaver_tell: sfx(-11, (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1100), ratio: 3.5, index: 1.4, d: 0.3, gain: 0.4 }),
      k.noise(d, t, { f0: P(p, 2600), f1: P(p, 3400), q: 6, a: 0.05, d: 0.25, gain: 0.4 })
    )),
  // The bind: a thread whipping out and pulling tight (a rising whine).
  bx_veinweaver_bind: sfx(-9, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 2000), f1: P(p, 5000), q: 0.9, a: 0.004, d: 0.1, gain: 0.8 }),
      k.tone(d, t + 0.06, { type: 'sawtooth', f0: P(p, 300), f1: P(p, 900), glide: 0.25, a: 0.02, hold: 0.1, d: 0.2, gain: 0.35, filter: { f0: 1800, q: 4 } })
    ), { maxVoices: 1, cooldownMs: 150 }),
  // The slam: two heartbeats from inside the floor, crystal ringing.
  bx_veinweaver_slam: sfx(-8, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 38), d: 0.3, gain: 1 }),
      k.tone(d, t + 0.22, { f0: P(p, 80), f1: P(p, 34), d: 0.36, gain: 0.95 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 800), f1: P(p, 200), q: 0.8, d: 0.4, gain: 0.8 }),
      ...[0, 0.05].map((dt, i) => k.bell(d, t + 0.22 + dt, { f: P(p, 1300 + i * 500), ratio: 5.04, index: 1.1, d: 0.5, gain: 0.3 }))
    ), { maxVoices: 1, cooldownMs: 200 }),
  // The sacs: soft wet lobs.
  bx_veinweaver_brood: sfx(-11, (k, t, d, p) =>
    Math.max(...[0, 0.08, 0.16].map((dt, i) => k.tone(d, t + dt, { f0: P(p, 260 + i * 40), f1: P(p, 120), d: 0.12, gain: 0.5 }))), { maxVoices: 1, cooldownMs: 200 }),
});

// --------------------------------------------- sim-event -> cue map --
const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};

// The boss's voice on its own spawn (the banner lands with it).
const SPAWN_VOICE = {
  stag: [{ cue: 'roar' }],
  thornmother: [{ cue: 'roar', pitch: 1.22 }, { cue: 'bx_thornmother_charge', gainDb: -4 }],
  heron: [{ cue: 'bx_heron_surface' }, { cue: 'bx_heron_tell', pitch: 0.75 }],
  millwheel: [{ cue: 'bx_millwheel_grind' }, { cue: 'bx_millwheel_clank', pitch: 0.75 }],
  wyrm: [{ cue: 'roar', pitch: 0.72 }, { cue: 'bx_wyrm_emerge', gainDb: -3 }],
  lichram: [{ cue: 'roar', pitch: 0.88 }, { cue: 'bx_lichram_call' }],
  cantor: [{ cue: 'bx_cantor_land' }, { cue: 'bx_cantor_tell', pitch: 0.75 }],
  colossus: [{ cue: 'roar', pitch: 0.62 }, { cue: 'bx_colossus_burst', gainDb: -4 }],
  gloamwolf: [{ cue: 'bx_gloamwolf_howl' }, { cue: 'bx_gloamwolf_tell', pitch: 0.8 }],
  mireking: [{ cue: 'bx_mireking_flop', gainDb: -3 }, { cue: 'bx_mireking_tell', pitch: 0.8 }],
  ashraven: [{ cue: 'bx_ashraven_gust' }, { cue: 'bx_ashraven_tell', pitch: 0.85 }],
  veinweaver: [{ cue: 'bx_veinweaver_slam', gainDb: -3 }, { cue: 'bx_veinweaver_tell', pitch: 0.8 }],
};
// Per-attack tell pitch (boss_telegraph_start.attack).
const TELL_PITCH = { spear: 1.12, wingbeat: 0.9, surface: 0.8, emerge: 0.8, breath: 1, charge: 1, crosscut: 1, shards: 1.25, rush: 1, note: 1, lance: 1.19, pulse: 0.75, fissure: 1, burst: 0.8, pounce: 1, rend: 1.2, howl: 0.8, lash: 1.1, flop: 0.85, swallow: 1, dive: 1, gust: 0.85, omen: 1.2, bind: 1.1, slam: 0.8 };

// An attack with a tell of its own (the Mire King's gape draws breath in).
const TELL_CUE = { swallow: 'bx_mireking_gape' };

export function createBossEventCues() {
  // The boss in the room (boss_adds carries no id; there is one boss a room).
  let current = 'stag';
  const kindOf = (ev, h) => {
    const k = ev.kind || (ev.id != null ? h.kind(ev.id) : null);
    return k && VOICE[k] ? k : null;
  };
  const beat = (cue) => (ev, h) => [{ cue, ...at(ev, h, ev.id) }];
  return {
    boss_spawn: (ev, h) => {
      current = ev.kind && VOICE[ev.kind] ? ev.kind : 'stag';
      const where = at(ev, h, ev.id);
      return [...SPAWN_VOICE[current].map((c) => ({ ...c, ...where })), { cue: `bx_${current}_sting` }];
    },
    boss_adds: (ev, h) => [{ cue: 'horn', ...at({}, h) }, { cue: `bx_${current}_phase` }],
    boss_enrage: (ev, h) => {
      const k = kindOf(ev, h) || current;
      return [{ cue: 'roar', ...at(ev, h, ev.id), pitch: k === 'wyrm' ? 0.72 : k === 'colossus' ? 0.62 : 0.88 }, { cue: `bx_${k}_phase` }];
    },
    death: (ev, h) => {
      const k = kindOf(ev, h);
      if (!k) return null; // not a boss: the built-in kill pop
      return [{ cue: 'boss_death', ...at(ev, h, ev.id) }, { cue: `bx_${k}_fall` }];
    },
    // The five kit bosses speak their own tell instead of the generic tick.
    boss_telegraph_start: (ev, h) => {
      const k = kindOf(ev, h);
      if (!k || !KIT_BOSSES.has(k)) return null;
      return [{ cue: TELL_CUE[ev.attack] ?? `bx_${k}_tell`, ...at(ev, h, ev.id), pitch: TELL_PITCH[ev.attack] ?? 1 }];
    },
    telegraph_start: (ev, h) => {
      const k = ev.id != null ? h.kind(ev.id) : null;
      return k && KIT_BOSSES.has(k) ? [] : null;
    },
    boss_spear: beat('bx_heron_spear'),
    boss_spear_hit: (ev, h) => [{ cue: 'bx_heron_pierce', ...at({}, h, ev.target) }],
    boss_wingbeat: beat('bx_heron_wing'),
    boss_submerge: beat('bx_heron_dive'),
    boss_surface: beat('bx_heron_surface'),
    boss_breath: beat('bx_wyrm_breath'),
    boss_burrow: beat('bx_wyrm_burrow'),
    boss_emerge: beat('bx_wyrm_emerge'),
    boss_charge: beat('bx_thornmother_charge'),
    boss_charge_end: beat('bx_thornmother_stop'),
    boss_seed_volley: beat('bx_thornmother_volley'),
    boss_thorn_burst: beat('bx_thornmother_burst'),
    boss_crosscut: beat('bx_millwheel_saw'),
    boss_cut_end: beat('bx_millwheel_clank'),
    boss_grind: beat('bx_millwheel_grind'),
    boss_cog_shards: beat('bx_millwheel_shards'),
    boss_rush: beat('bx_lichram_rush'),
    boss_horns_stuck: beat('bx_lichram_stuck'),
    boss_grave_call: beat('bx_lichram_call'),
    boss_grave_raise: beat('bx_lichram_raise'),
    boss_note: (ev, h) => [{ cue: 'bx_cantor_note', ...at(ev, h, ev.id) }, ...(ev.echo > 0 ? [{ cue: 'bx_cantor_echo', ...at(ev, h, ev.id) }] : [])],
    boss_sung_lance: beat('bx_cantor_lance'),
    boss_verse: beat('bx_cantor_verse'),
    boss_echo_step: beat('bx_cantor_fade'),
    boss_echo_land: beat('bx_cantor_land'),
    boss_heart_pulse: beat('bx_cantor_pulse'),
    boss_fissure: beat('bx_colossus_fissure'),
    boss_geode_rain: beat('bx_colossus_rain'),
    boss_geode_burst: beat('bx_colossus_burst'),
    boss_pounce: beat('bx_gloamwolf_pounce'),
    boss_rend: beat('bx_gloamwolf_rend'),
    boss_howl: beat('bx_gloamwolf_howl'),
    boss_tongue_lash: beat('bx_mireking_lash'),
    boss_belly_flop: beat('bx_mireking_flop'),
    boss_swallow: beat('bx_mireking_swallow'),
    boss_carrion_dive: beat('bx_ashraven_dive'),
    boss_wing_gust: beat('bx_ashraven_gust'),
    boss_omen: beat('bx_ashraven_omen'),
    boss_bind: beat('bx_veinweaver_bind'),
    boss_vein_slam: beat('bx_veinweaver_slam'),
    boss_brood_sacs: beat('bx_veinweaver_brood'),
  };
}

export const BOSS_CUE_IDS = Object.freeze(Object.keys(CUES));
export const BOSS_CUE_LEVELS = Object.freeze(Object.fromEntries(Object.entries(CUES).map(([id, c]) => [id, c.levelDb])));

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerBossCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: BOSS_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createBossEventCues())) engine.registerEventCue(type, fn);
  return BOSS_CUE_IDS.length;
}
