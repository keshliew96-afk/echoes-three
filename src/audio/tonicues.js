// TONICS AND BOMBS (docs/CONSUMABLES.md): the carry slot's sounds, registered
// on the engine like the vault cues (engine.registerCue / registerEventCue):
// procedural, no files. Listen-only: event payloads in, cues out, so the
// goldens cannot move.
//   tn_drop    one falls where an elite fell: a glassy chime over a shimmer
//              (spatial, SFX bus)
//   tn_gain    a hero takes one: a cork pop and two bright notes (UI)
//   tn_mend / tn_haste / tn_ward   a drink: the cork, a gulp, then a rising
//              figure in the kind's own interval (heal a major triad, haste a
//              fast run, ward open fifths)
//   tn_throw   a bomb leaves the hand: a fuse hiss and a whoosh (spatial)
//   tn_fire    the Fire Bomb bursts: a deep thump, a roar of brown noise and
//              crackle (spatial)
//   tn_frost   the Frost Bomb bursts: a glassy crack, a cold shimmer and
//              tinkling shards (spatial)
//   tn_bell    the Bell Charm tolls: a deep bell with a long ring and a
//              bright partial over it (UI, heard wherever the camera is)
//   tn_buy     the stand sells one: the cork pop and a coin (UI)
//   tn_deny    the slot is empty / full / the purse short: a dull double tap
import { UI_PEAK_DB } from './cues.js';

const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Measured design peaks (dBFS at unity gain, max of 3 takes) —
// tools/smallfixes2-cuecal.mjs --only tonicues --write.
export const TONIC_CUE_CAL = {
  // @cal begin
  tn_drop: -5.2,
  tn_gain: -6.1,
  tn_mend: 0,
  tn_haste: 0,
  tn_ward: 0,
  tn_throw: -7.3,
  tn_fire: 1.3,
  tn_frost: 2.1,
  tn_bell: 0,
  tn_buy: 0,
  tn_deny: 0,
  // @cal end
};

const sfx = (levelDb, fn, extra = {}) => ({ bus: 'sfx', levelDb, priority: 4, maxVoices: 2, cooldownMs: 80, ...extra, fn });
const ui = { bus: 'ui', slot: 'progress', priority: 3, maxVoices: 2, cooldownMs: 200, levelDb: UI_PEAK_DB };

// The rising figure each drink plays after the gulp (midi steps).
const DRINK_FIG = {
  mend_tonic: [72, 76, 79], // a major triad, the heal's warmth
  haste_draught: [76, 79, 83, 88], // a fast run up
  ward_flask: [67, 74, 79], // open fifths, a wall
};

const pop = (k, d, t, p, gain = 0.5) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 900), f1: P(p, 260), glide: 0.05, d: 0.06, gain }),
    k.noise(d, t, { type: 'bandpass', f0: P(p, 2400), q: 3, d: 0.04, gain: gain * 0.6 })
  );

// A drink: the cork, a gulp (a short low glide twice), then the figure.
const drink = (k, t, d, p, fig, step) =>
  Math.max(
    pop(k, d, t, p, 0.5),
    k.tone(d, t + 0.1, { type: 'sine', f0: 220, f1: 150, glide: 0.08, d: 0.09, gain: 0.45 }),
    k.tone(d, t + 0.22, { type: 'sine', f0: 230, f1: 150, glide: 0.08, d: 0.09, gain: 0.4 }),
    ...fig.map((m, i) => k.bell(d, t + 0.34 + i * step, { f: P(p, hz(m)), ratio: 2, index: 0.7, d: 0.7, gain: 0.24 })),
    k.noise(d, t + 0.34, { type: 'highpass', f0: 6000, q: 0.7, a: 0.05, hold: 0.2, d: 0.4, gain: 0.1 })
  );

const CUES = {
  tn_drop: sfx(-9, (k, t, d, p) =>
    Math.max(
      ...[84, 91, 88].map((m, i) => k.bell(d, t + i * 0.06, { f: P(p, hz(m)), ratio: 2.76, index: 0.6, d: 0.6, gain: 0.26 })),
      k.noise(d, t, { type: 'highpass', f0: 5600, q: 0.7, a: 0.04, hold: 0.18, d: 0.3, gain: 0.14 })
    ), { maxVoices: 1, cooldownMs: 250 }),
  tn_gain: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      pop(k, d, t, p, 0.45),
      k.bell(d, t + 0.06, { f: P(p, hz(84)), ratio: 2, index: 0.6, d: 0.5, gain: 0.26 }),
      k.bell(d, t + 0.14, { f: P(p, hz(91)), ratio: 2, index: 0.6, d: 0.7, gain: 0.24 })
    ) },
  tn_mend: { ...ui, cooldownMs: 120, fn: (k, t, d, p) => drink(k, t, d, p, DRINK_FIG.mend_tonic, 0.08) },
  tn_haste: { ...ui, cooldownMs: 120, fn: (k, t, d, p) => drink(k, t, d, p, DRINK_FIG.haste_draught, 0.045) },
  tn_ward: { ...ui, cooldownMs: 120, fn: (k, t, d, p) => drink(k, t, d, p, DRINK_FIG.ward_flask, 0.08) },
  tn_throw: sfx(-10, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 4200), q: 0.8, a: 0.01, hold: 0.25, d: 0.15, gain: 0.25 }),
      k.noise(d, t + 0.05, { type: 'bandpass', f0: P(p, 700), f1: P(p, 1400), q: 1.2, a: 0.06, d: 0.3, gain: 0.35 })
    ), { maxVoices: 2, cooldownMs: 120 }),
  tn_fire: sfx(-5, (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 40), glide: 0.3, d: 0.4, gain: 0.95 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1400, q: 0.7, a: 0.005, hold: 0.15, d: 0.9, gain: 0.8 }),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'bandpass', f0: P(p, 2200), q: 1, hold: 0.4, d: 0.6, gain: 0.45 })
    ), { maxVoices: 2, cooldownMs: 150 }),
  tn_frost: sfx(-6, (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 3000), q: 0.9, d: 0.08, gain: 0.7 }),
      k.tone(d, t, { f0: P(p, 160), f1: P(p, 70), glide: 0.2, d: 0.25, gain: 0.6 }),
      ...[96, 100, 103, 98, 105].map((m, i) => k.bell(d, t + 0.06 + i * 0.05, { f: P(p, hz(m)), ratio: 3.1, index: 0.9, d: 0.35, gain: 0.16 })),
      k.noise(d, t + 0.05, { type: 'highpass', f0: 7000, q: 0.7, a: 0.08, hold: 0.3, d: 0.6, gain: 0.16 })
    ), { maxVoices: 2, cooldownMs: 150 }),
  tn_bell: { ...ui, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, hz(50)), ratio: 2.76, index: 1.4, d: 2.6, gain: 0.55 }),
      k.bell(d, t, { f: P(p, hz(74)), ratio: 2, index: 0.8, d: 1.8, gain: 0.3 }),
      k.bell(d, t + 0.02, { f: P(p, hz(81)), ratio: 3.5, index: 0.5, d: 1.2, gain: 0.18 })
    ) },
  tn_buy: { ...ui, fn: (k, t, d, p) =>
    Math.max(
      pop(k, d, t, p, 0.45),
      k.bell(d, t + 0.08, { f: P(p, 2600), ratio: 1.47, index: 1.1, d: 0.25, gain: 0.3 }),
      k.bell(d, t + 0.16, { f: P(p, hz(88)), ratio: 2, index: 0.6, d: 0.6, gain: 0.22 })
    ) },
  tn_deny: { ...ui, cooldownMs: 250, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'triangle', f0: P(p, 196), d: 0.08, gain: 0.4 }),
      k.tone(d, t + 0.1, { type: 'triangle', f0: P(p, 165), d: 0.1, gain: 0.35 })
    ) },
};

export const TONIC_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};

export function createTonicEventCues() {
  return {
    tonic_drop: (ev, h) => [{ cue: 'tn_drop', ...at(ev, h) }],
    tonic_gain: (ev) => (ev.from === 'shop' ? [] : [{ cue: 'tn_gain' }]),
    tonic_use: (ev, h) => {
      if (ev.item === 'bell_charm') return [{ cue: 'tn_bell' }];
      if (ev.item === 'fire_bomb' || ev.item === 'frost_bomb') return [{ cue: 'tn_throw', ...at(ev, h) }];
      return [{ cue: ev.item === 'haste_draught' ? 'tn_haste' : ev.item === 'ward_flask' ? 'tn_ward' : 'tn_mend' }];
    },
    tonic_burst: (ev, h) => [{ cue: ev.item === 'frost_bomb' ? 'tn_frost' : 'tn_fire', ...at(ev, h) }],
    tonic_buy: () => [{ cue: 'tn_buy' }],
    tonic_denied: () => [{ cue: 'tn_deny' }],
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerTonicCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: TONIC_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createTonicEventCues())) engine.registerEventCue(type, fn);
  return TONIC_CUE_IDS.length;
}
