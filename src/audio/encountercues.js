// Event rooms (docs/EVENT_ROOMS.md), room objectives (docs/ROOM_OBJECTIVES.md)
// and the slick floor slide (docs/SLICK_FLOOR.md): their own voices,
// registered on the engine like the boss and heart cues (engine.registerCue /
// registerEventCue): procedural, no files. Listen-only: event payloads in,
// cues out, so the goldens cannot move.
//
// Event rooms (the encounter card is a page: its cues sit on the UI bus):
//   ev_enter   a "?" room opens: a low hum under two far, unresolved bells
//   ev_open    the card opens: a parchment swish and a soft bell
//   ev_leave   walking on: two soft notes falling away
//   ev_shrine  Blood Shrine: a slow double heartbeat with a dark breath
//   ev_well    Wishing Well: a coin's plink, then the deep plop below
//   ev_ambush  Trapped Chest: the lid snaps and a brass stab
//   ev_pilgrim Lost Pilgrim: a warm plucked chord, rising
//   ev_altar   Corrupted Altar: a tritone of bells over a low drone
//   ev_spirit  Wandering Spirit: a breathy whisper with a ghost tone gliding
//   ev_cache   Forgotten Cache: coins rattling out of a box
//   ev_spring  Healing Spring: water and a rising shimmer of bells
//   ev_chest   the ambush beaten: the chest's coins pour out
// Room objectives (in the room: spatial on the SFX bus):
//   ob_horn    the quarry breaks cover: a two-note hunting horn
//   ob_winded  the quarry tires: two short pants
//   ob_escape  the quarry gets away: the horn falls and a rush of air
//   ob_purge   a purge starts: a low swell with a warning bell
//   ob_nest    a nest rises: a wet, earthy thrum
//   ob_pulse   a nest births: a short wet throb
//   ob_burst   a nest bursts: a stone crack and a wet splat
//   ob_rooted  the purge timer runs out: a long groan falling
//   ob_won     a hunt or purge won: a short horn triad (with the room clear)
// Slick floor (spatial, SFX bus; src/render/hazards/index.js calls slide()):
//   sl_wet / sl_frost / sl_glass  one grain of a body sliding on the patch;
//              grains overlap into a hiss while the slide lasts
import { UI_PEAK_DB } from './cues.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) —
// tools/smallfixes2-cuecal.mjs --write. The UI-bus cues (ev_*, ob_won) stay
// at 0: the engine levels a UI cue by its own baked sample's peak
// (engine.js, fix-M3-r5), so their measurement only ever reads levelDb back.
export const ENCOUNTER_CUE_CAL = {
  // @cal begin
  ev_enter: 0,
  ev_open: 0,
  ev_leave: 0,
  ev_shrine: 0,
  ev_well: 0,
  ev_ambush: 0,
  ev_pilgrim: 0,
  ev_altar: 0,
  ev_spirit: 0,
  ev_cache: 0,
  ev_spring: 0,
  ev_chest: 0,
  ob_horn: -3.6,
  ob_winded: -11.9,
  ob_escape: -5.8,
  ob_purge: -0.3,
  ob_nest: -1.9,
  ob_pulse: -1.7,
  ob_burst: -1,
  ob_rooted: -5,
  ob_won: 0,
  sl_wet: -5.4,
  sl_frost: 0.2,
  sl_glass: -9.5,
  // @cal end
};

const ui = { bus: 'ui', slot: 'progress', priority: 3, maxVoices: 2, cooldownMs: 200, levelDb: UI_PEAK_DB };

const CUES = {
  // ---------------------------------------------------------- event rooms --
  ev_enter: { ...ui, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.pad(d, t, { notes: [P(p, 110), P(p, 164.8)], dur: 0.9, a: 0.25, r: 0.9, gain: 0.45, cutoff: 700, type: 'triangle' }),
      k.bell(d, t + 0.15, { f: P(p, 622.3), ratio: 2.76, index: 0.9, d: 1.3, gain: 0.32 }),
      k.bell(d, t + 0.55, { f: P(p, 830.6), ratio: 2.76, index: 0.9, d: 1.2, gain: 0.26 })
    ) },
  ev_open: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), f1: P(p, 4200), q: 0.9, a: 0.03, d: 0.16, gain: 0.45 }),
      k.bell(d, t + 0.08, { f: P(p, 1046.5), ratio: 2, index: 0.6, d: 0.6, gain: 0.4 })
    ) },
  ev_leave: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'triangle', f0: P(p, 587.3), d: 0.18, gain: 0.5 }),
      k.tone(d, t + 0.12, { type: 'triangle', f0: P(p, 440), d: 0.26, gain: 0.45 })
    ) },
  ev_shrine: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 72), f1: P(p, 44), d: 0.24, gain: 1 }),
      k.tone(d, t + 0.28, { f0: P(p, 64), f1: P(p, 40), d: 0.3, gain: 0.8 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 500), f1: P(p, 220), q: 0.8, a: 0.12, d: 0.7, gain: 0.35 }),
      k.tone(d, t + 0.05, { type: 'sawtooth', f0: P(p, 146.8), f1: P(p, 138.6), a: 0.1, d: 0.7, gain: 0.18, filter: { f0: 600, q: 1.2 } })
    ) },
  ev_well: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 2637), ratio: 2.76, index: 1, d: 0.3, gain: 0.45 }),
      k.tone(d, t + 0.42, { f0: P(p, 420), f1: P(p, 140), d: 0.22, gain: 0.6 }),
      k.noise(d, t + 0.42, { f0: P(p, 1300), f1: P(p, 380), q: 1.3, d: 0.3, gain: 0.35 })
    ) },
  ev_ambush: { ...ui, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), q: 2.2, d: 0.07, gain: 0.8 }),
      k.tone(d, t, { f0: P(p, 160), f1: P(p, 70), d: 0.12, gain: 0.6 }),
      k.tone(d, t + 0.08, { type: 'sawtooth', f0: P(p, 233.1), a: 0.01, d: 0.4, gain: 0.35, filter: { f0: 1600, q: 1 } }),
      k.tone(d, t + 0.08, { type: 'sawtooth', f0: P(p, 329.6), a: 0.01, d: 0.4, gain: 0.3, filter: { f0: 1600, q: 1 } })
    ) },
  ev_pilgrim: { ...ui, fn: (k, t, d, p) =>
    Math.max(...[261.6, 329.6, 392, 523.3].map((f, i) => k.pluck(d, t + i * 0.07, { f: P(p, f), d: 1.0, gain: 0.32, bright: 2800 }))) },
  ev_altar: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.pad(d, t, { notes: [P(p, 55), P(p, 77.8)], dur: 0.8, a: 0.2, r: 1, gain: 0.5, cutoff: 500, type: 'sawtooth' }),
      k.bell(d, t + 0.05, { f: P(p, 440), ratio: 1.41, index: 2.2, d: 1.4, gain: 0.35 }),
      k.bell(d, t + 0.05, { f: P(p, 622.3), ratio: 1.41, index: 2.2, d: 1.4, gain: 0.3 })
    ) },
  ev_spirit: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 2600), q: 4, a: 0.3, d: 0.8, gain: 0.5 }),
      k.tone(d, t, { f0: P(p, 784), f1: P(p, 523.3), a: 0.2, d: 0.9, gain: 0.3, detune: 12 }),
      k.tone(d, t + 0.1, { f0: P(p, 788), f1: P(p, 520), a: 0.2, d: 0.9, gain: 0.22 })
    ) },
  ev_cache: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 500, q: 0.8, d: 0.1, gain: 0.5 }),
      ...[2093, 2794, 2349, 3136, 2637].map((f, i) => k.tone(d, t + 0.05 + i * 0.055, { f0: P(p, f), d: 0.08, gain: 0.26 })),
      k.noise(d, t + 0.05, { type: 'highpass', f0: 6500, q: 0.7, hold: 0.2, d: 0.12, gain: 0.18 })
    ) },
  ev_spring: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 2400), f1: P(p, 1200), q: 1.1, a: 0.15, d: 0.6, gain: 0.3 }),
      ...[659.3, 784, 987.8, 1318.5].map((f, i) => k.bell(d, t + i * 0.09, { f: P(p, f), ratio: 2, index: 0.7, d: 0.8, gain: 0.3 }))
    ) },
  ev_chest: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      ...[1568, 2093, 2637, 2349, 3136, 2794, 3520].map((f, i) => k.tone(d, t + i * 0.045, { f0: P(p, f), d: 0.09, gain: 0.26 })),
      k.noise(d, t, { type: 'highpass', f0: 6000, q: 0.7, hold: 0.3, d: 0.15, gain: 0.2 })
    ) },
  // ------------------------------------------------------- room objectives --
  ob_horn: { levelDb: -10, priority: 4, maxVoices: 1, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 220), a: 0.04, hold: 0.22, d: 0.12, gain: 0.55, filter: { f0: 1400, q: 1.1 } }),
      k.tone(d, t + 0.36, { type: 'sawtooth', f0: P(p, 329.6), a: 0.04, hold: 0.4, d: 0.3, gain: 0.6, filter: { f0: 1600, q: 1.1 } }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1200), q: 2, a: 0.04, hold: 0.6, d: 0.3, gain: 0.08 })
    ) },
  ob_winded: { levelDb: -15, priority: 2, maxVoices: 1, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1100), q: 1.6, a: 0.03, d: 0.14, gain: 0.8 }),
      k.noise(d, t + 0.24, { type: 'bandpass', f0: P(p, 950), q: 1.6, a: 0.03, d: 0.18, gain: 0.7 })
    ) },
  ob_escape: { levelDb: -10, priority: 4, maxVoices: 1, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 329.6), f1: P(p, 196), a: 0.03, d: 0.6, gain: 0.5, filter: { f0: 1300, q: 1 } }),
      k.noise(d, t + 0.1, { f0: P(p, 2400), f1: P(p, 500), q: 1.4, a: 0.05, d: 0.5, gain: 0.55 })
    ) },
  ob_purge: { levelDb: -11, priority: 3, maxVoices: 1, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 55), f1: P(p, 82.4), a: 0.4, d: 0.6, gain: 0.8 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 260), f1: P(p, 700), q: 0.8, a: 0.4, d: 0.5, gain: 0.5 }),
      k.bell(d, t + 0.45, { f: P(p, 523.3), ratio: 1.41, index: 1.4, d: 0.9, gain: 0.35 })
    ) },
  ob_nest: { levelDb: -13, priority: 2, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 60), a: 0.08, d: 0.4, gain: 0.8 }),
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 380), q: 1.4, a: 0.1, d: 0.35, gain: 0.6 })
    ) },
  ob_pulse: { levelDb: -15, priority: 2, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 70), d: 0.16, gain: 0.8 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 700), f1: P(p, 300), q: 2, d: 0.14, gain: 0.45 })
    ) },
  ob_burst: { levelDb: -8, priority: 4, maxVoices: 2, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), q: 0.9, d: 0.25, gain: 0.7 }),
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 40), d: 0.3, gain: 0.9 }),
      k.noise(d, t + 0.04, { f0: P(p, 900), f1: P(p, 260), q: 1.2, d: 0.3, gain: 0.6 })
    ) },
  ob_rooted: { levelDb: -10, priority: 4, maxVoices: 1, cooldownMs: 800, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 98), f1: P(p, 49), a: 0.1, d: 1.1, gain: 0.5, filter: { f0: 500, q: 1 } }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 400), f1: P(p, 150), q: 0.8, a: 0.15, d: 1, gain: 0.6 })
    ) },
  ob_won: { ...ui, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(...[[293.7, 0], [370, 0.1], [440, 0.2]].map(([f, o]) => k.tone(d, t + o, { type: 'sawtooth', f0: P(p, f), a: 0.02, hold: 0.12, d: 0.35, gain: 0.3, filter: { f0: 1800, q: 1 } }))) },
  // ----------------------------------------------------------- slick floor --
  sl_wet: { levelDb: -17, priority: 1, maxVoices: 3, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1500), f1: P(p, 1100), q: 1.1, a: 0.06, hold: 0.06, d: 0.16, gain: 0.8 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 520), q: 0.7, a: 0.06, hold: 0.06, d: 0.16, gain: 0.4 })
    ) },
  sl_frost: { levelDb: -17, priority: 1, maxVoices: 3, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 3800), q: 0.8, a: 0.05, hold: 0.06, d: 0.16, gain: 0.6 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2200), f1: P(p, 1700), q: 2.2, a: 0.05, hold: 0.06, d: 0.16, gain: 0.45 })
    ) },
  sl_glass: { levelDb: -17, priority: 1, maxVoices: 3, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3000), f1: P(p, 2400), q: 3, a: 0.05, hold: 0.06, d: 0.16, gain: 0.6 }),
      k.tone(d, t, { type: 'triangle', f0: P(p, 1760), f1: P(p, 1700), a: 0.05, hold: 0.04, d: 0.14, gain: 0.12 })
    ) },
};

export const ENCOUNTER_CUE_IDS = Object.freeze(Object.keys(CUES));
export const ENCOUNTER_UI_CUE_IDS = Object.freeze(Object.keys(CUES).filter((id) => CUES[id].bus === 'ui'));

const TAKE = {
  blood_shrine: 'ev_shrine',
  wishing_well: 'ev_well',
  trapped_chest: 'ev_ambush',
  lost_pilgrim: 'ev_pilgrim',
  corrupted_altar: 'ev_altar',
  wandering_spirit: 'ev_spirit',
  forgotten_cache: 'ev_cache',
  healing_spring: 'ev_spring',
};
export const ENCOUNTER_TAKE_CUES = Object.freeze({ ...TAKE });

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];

export function createEncounterEventCues() {
  return {
    event_enter: () => [{ cue: 'ev_enter' }],
    event_open: () => [{ cue: 'ev_open' }],
    event_leave: () => [{ cue: 'ev_leave' }],
    event_take: (ev) => (TAKE[ev.encounter] ? [{ cue: TAKE[ev.encounter] }] : null),
    event_chest: () => [{ cue: 'ev_chest' }],
    // The quarry's mark keeps its built-in ping under the new horn.
    quarry_spawn: (ev, h) => [...one('ob_horn', at({}, h)), ...one('mark', at(ev, h, ev.id), { pitch: 1.2 })],
    quarry_winded: (ev, h) => one('ob_winded', at(ev, h, ev.id)),
    quarry_escape: (ev, h) => one('ob_escape', at(ev, h, ev.id)),
    purge_start: (ev, h) => one('ob_purge', at({}, h)),
    nest_spawn: (ev, h) => one('ob_nest', at(ev, h, ev.id)),
    nest_pulse: (ev, h) => one('ob_pulse', at(ev, h, ev.id)),
    purge_rooted: (ev, h) => one('ob_rooted', at({}, h)),
    // A nest's death is its burst; every other death keeps the built-in cue.
    death: (ev, h) => (ev.kind === 'nest' ? one('ob_burst', at(ev, h)) : null),
    // A won hunt or purge adds the horn triad to the room-clear chord.
    room_cleared: (ev) => (ev.objective && ev.won ? [{ cue: 'room_clear' }, { cue: 'ob_won' }] : null),
  };
}

// Slick floor: the hazard layer reports, per frame, the bodies sliding on a
// slip patch ({ x, z, speed, fast }) and the patch's skin. One grain at a time
// per skin every SLIDE_GRAIN_MS; the fastest slider is heard, a
// little louder and brighter the faster it goes.
const SLIDE_CUE = { wet: 'sl_wet', frost: 'sl_frost', glass: 'sl_glass' };
export const SLIDE_GRAIN_MS = 110;
export function createSlideSound(getEngine, now = () => performance.now()) {
  const last = {};
  return function slide(sliders, skin) {
    const eng = getEngine();
    if (!eng || !sliders || sliders.length === 0) return;
    const t = now();
    if (t - (last[skin] ?? -1e9) < SLIDE_GRAIN_MS) return; // the grain rate (no cooldown spam in the cue log)
    last[skin] = t;
    let b = sliders[0];
    for (const s of sliders) if (s.speed > b.speed) b = s;
    const k = Math.min(1, b.speed / 4);
    eng.play(SLIDE_CUE[skin] || 'sl_wet', { x: b.x, z: b.z, gainDb: b.fast ? 0 : -9 + 9 * k, pitch: Math.round((0.9 + 0.25 * k) * 20) / 20 }); // pitch in steps: one baked sample each
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerEncounterCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: ENCOUNTER_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createEncounterEventCues())) engine.registerEventCue(type, fn);
  return ENCOUNTER_CUE_IDS.length;
}
