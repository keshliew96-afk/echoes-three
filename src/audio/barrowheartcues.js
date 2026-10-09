// New enemies, Barrow and Heart (docs/NEW_ENEMIES_BARROW_HEART.md): the Ash
// Keener's, the Barrow Sexton's, the Heart Bloom's and the Vein Siphon's own
// voices — registered on the engine like the Heart's cues (heartcues.js):
// procedural voices on the engine's kit, no files, spatial on the SFX bus.
// Listen-only: event payloads in, cues out, so the goldens cannot move.
//   bh_keen     the Keener's wail: a hollow, falling, breathy keen
//   bh_dig      the Sexton's spade going into grave dirt: a dull chunk
//   bh_bury     a snare laid: earth patted down over a bone rattle
//   bh_trip     a snare springing: bone teeth ratcheting up out of the floor
//   bh_snap     the jaws closing: a hard bone clack and a crunch
//   bh_crumble  a snare crumbling to ash: a soft dry sift
//   bh_open     a Bloom opening: a glassy breath drawn in
//   bh_pulse    a Bloom snapping shut: a crystal chime over a thump
//   bh_lash     the Siphon's tendril lashing down its lane: a wet whip crack
//   bh_latch    a tendril taking hold: a sucking pop
//   bh_drink    a drink: a low gulp (one voice, paced)
//   bh_unlatch  the tether snapping: a wet snap
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only barrowheartcues.
export const BH_CUE_CAL = {
  // @cal begin
  bh_keen: -0.5,
  bh_dig: -0.3,
  bh_bury: -8.2,
  bh_trip: -4.2,
  bh_snap: 0.1,
  bh_crumble: -6.2,
  bh_open: -6.9,
  bh_pulse: 1.7,
  bh_lash: -6.1,
  bh_latch: -1.4,
  bh_drink: -0.9,
  bh_unlatch: -4.4,
  // @cal end
};

const CUES = {
  bh_keen: { levelDb: -10, priority: 4, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 620), f1: P(p, 300), a: 0.05, hold: 0.18, d: 0.55, gain: 0.45, filter: { f0: 1400, q: 4 } }),
      k.tone(d, t + 0.01, { type: 'triangle', f0: P(p, 930), f1: P(p, 452), a: 0.06, hold: 0.16, d: 0.5, gain: 0.35, detune: 18 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1700), f1: P(p, 700), q: 3, a: 0.05, hold: 0.15, d: 0.5, gain: 0.4 }),
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 70), d: 0.3, gain: 0.3 })
    ) },
  bh_dig: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 160, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1100, f1: 300, q: 0.8, d: 0.18, gain: 1 }),
      k.tone(d, t, { f0: P(p, 150), f1: P(p, 70), d: 0.12, gain: 0.5 }),
      k.noise(d, t + 0.01, { f0: P(p, 3200), q: 3, d: 0.05, gain: 0.25 })
    ) },
  bh_bury: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 800, f1: 260, q: 0.7, d: 0.22, gain: 0.9 }),
      k.noise(d, t + 0.08, { src: 'crackle', type: 'bandpass', f0: P(p, 2600), q: 1.2, d: 0.2, gain: 0.5 }),
      k.pluck(d, t + 0.1, { f: P(p, 420), d: 0.25, gain: 0.3, bright: 2400, dark: 500 })
    ) },
  bh_trip: { levelDb: -10, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), f1: P(p, 3600), q: 1.4, a: 0.02, d: 0.5, gain: 0.9 }),
      k.tone(d, t, { type: 'square', f0: P(p, 180), f1: P(p, 360), a: 0.05, d: 0.55, gain: 0.25, filter: { f0: 1200, q: 2 } }),
      k.pluck(d, t + 0.05, { f: P(p, 520), d: 0.2, gain: 0.3 }),
      k.pluck(d, t + 0.18, { f: P(p, 610), d: 0.2, gain: 0.3 }),
      k.pluck(d, t + 0.31, { f: P(p, 700), d: 0.2, gain: 0.3 })
    ) },
  bh_snap: { levelDb: -7, priority: 4, maxVoices: 2, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 4200), f1: P(p, 1600), q: 2.5, d: 0.08, gain: 1 }),
      k.tone(d, t, { f0: P(p, 240), f1: P(p, 80), d: 0.16, gain: 0.7 }),
      k.noise(d, t + 0.02, { src: 'crackle', type: 'bandpass', f0: P(p, 1400), q: 1, d: 0.3, gain: 0.5 })
    ) },
  bh_crumble: { levelDb: -18, priority: 1, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(k.noise(d, t, { src: 'crackle', type: 'highpass', f0: P(p, 2400), q: 0.7, a: 0.03, d: 0.45, gain: 0.8 }), k.noise(d, t, { src: 'pink', type: 'lowpass', f0: 900, q: 0.6, a: 0.05, d: 0.4, gain: 0.4 })) },
  bh_open: { levelDb: -15, priority: 3, maxVoices: 2, cooldownMs: 250, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'triangle', f0: P(p, 520), f1: P(p, 1240), a: 0.5, d: 0.85, gain: 0.4 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3000), f1: P(p, 6200), q: 7, a: 0.6, d: 0.85, gain: 0.35 })
    ) },
  bh_pulse: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 88), f1: P(p, 40), d: 0.35, gain: 0.9 }),
      k.bell(d, t, { f: P(p, 1760), ratio: 5.04, index: 1.4, d: 0.7, gain: 0.35 }),
      k.bell(d, t + 0.015, { f: P(p, 2637), ratio: 3.5, index: 1.0, d: 0.5, gain: 0.2 }),
      k.noise(d, t, { f0: P(p, 5600), f1: P(p, 2800), q: 4, d: 0.25, gain: 0.3 })
    ) },
  bh_lash: { levelDb: -10, priority: 4, maxVoices: 2, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { f0: P(p, 900), f1: P(p, 4600), q: 1.4, a: 0.01, d: 0.16, gain: 0.9 }),
      k.tone(d, t + 0.1, { f0: P(p, 300), f1: P(p, 90), d: 0.12, gain: 0.5 }),
      k.noise(d, t + 0.1, { src: 'pink', type: 'lowpass', f0: 1400, q: 1, d: 0.12, gain: 0.4 })
    ) },
  bh_latch: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(k.tone(d, t, { f0: P(p, 140), f1: P(p, 420), d: 0.12, gain: 0.8 }), k.noise(d, t, { src: 'pink', type: 'bandpass', f0: P(p, 700), f1: P(p, 1500), q: 2, d: 0.15, gain: 0.5 })) },
  bh_drink: { levelDb: -18, priority: 2, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(k.tone(d, t, { f0: P(p, 190), f1: P(p, 110), a: 0.02, d: 0.16, gain: 0.8 }), k.noise(d, t, { src: 'pink', type: 'lowpass', f0: 600, f1: 300, q: 1.5, a: 0.02, d: 0.18, gain: 0.4 })) },
  bh_unlatch: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(k.noise(d, t, { f0: P(p, 2600), f1: P(p, 900), q: 2, d: 0.1, gain: 0.8 }), k.tone(d, t, { f0: P(p, 500), f1: P(p, 160), d: 0.1, gain: 0.45 })) },
};

export const BH_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];

export function createBarrowHeartEventCues() {
  return {
    keener_wail: (ev, h) => one('bh_keen', at(ev, h, ev.id)),
    sexton_dig: (ev, h) => one('bh_dig', at(ev, h, ev.id)),
    sexton_bury: (ev, h) => one('bh_bury', at(ev, h, ev.id)),
    sexton_snare_trip: (ev, h) => one('bh_trip', at(ev, h)),
    sexton_snare_snap: (ev, h) => one('bh_snap', at(ev, h)),
    sexton_snare_crumble: (ev, h) => one('bh_crumble', at(ev, h)),
    bloom_open: (ev, h) => one('bh_open', at(ev, h, ev.id)),
    bloom_pulse: (ev, h) => one('bh_pulse', at(ev, h, ev.id)),
    siphon_lash: (ev, h) => one('bh_lash', at(ev, h, ev.id)),
    siphon_latch: (ev, h) => one('bh_latch', at(ev, h, ev.target)),
    siphon_drink: (ev, h) => one('bh_drink', at(ev, h, ev.id)),
    siphon_unlatch: (ev, h) => one('bh_unlatch', at({}, h, ev.id)),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerBarrowHeartCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: BH_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createBarrowHeartEventCues())) engine.registerEventCue(type, fn);
  return BH_CUE_IDS.length;
}
