// Act V (the Still Spire): the belfry's creatures' and its gust vents' own
// voices — registered on the engine like the Heart's and the Wood and
// Mill's creatures (engine.registerCue / registerEventCue): procedural
// voices on the engine's own kit, no files, spatial on the SFX bus.
// Listen-only: event payloads in, cues out, so the goldens cannot move.
//   sp_kdive    the Gust Kite's dive: a whoosh down the lane, sailcloth ripping
//   sp_kland    the kite grounded: a soft thud and a flutter of cloth
//   sp_krise    the kite lifting off: a rising flap
//   sp_toll     the Chime Wraith's toll: a cracked bronze bell (detuned
//               partials beating, a rattle of the crack in the strike)
//   sp_choke    a stunned wraith's toll choked: a dull, damped clunk
//   sp_crack    the Gargoyle waking: stone grinding and cracking
//   sp_wake     the Gargoyle's wake: a burst of stone
//   sp_slam     the Gargoyle's slam: a heavy stone impact
//   sp_settle   the Gargoyle turning back to stone: a low grind
//   sp_swing    the Rope Hanger's swing: a rope creaking taut and a swoosh
//   sp_hland    the hanger at the lane's end: a creak and a thud
//   sp_gin      a gust vent's telegraph: wind drawn in, rising
//   sp_gust     the gust itself: a blast of wind down the lane
//   sp_calm     the gust dying away: a falling sigh
//   sp_vswing   the Vane Cock's wind-up: a rusty spindle creaking round into
//               the wind (with the common telegraph tick)
//   sp_vsnap    the vane's volley loosed: the brass cock snapping to a stop
//   sp_vdart    each gust dart (the vane's enemy_fire): a quick airy whip
//   sp_hush     the Sacristan's hush: a soft handbell, its ring drawn away
//               into a breathy hush
//   sp_rap      the Sacristan's rap: a small bell's bonk on a skull
//   sp_mute     a stunned Sacristan's hush choked: the clapper caught dead
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only spirecues --write.
// Shipped with an offline estimate: each recipe rendered (max of 5 takes) by
// the bake worker's DSP twin (src/audio/render.js), which lands within
// 0-1.7 dB of the live measurement on the Heart's and the Wood and Mill's
// cues (offline reads high on the loud, low recipes: those come out a
// touch quieter, never louder); re-measure live when the sandbox allows.
export const SPIRE_CUE_CAL = {
  // @cal begin
  sp_kdive: -10.2,
  sp_kland: -1.5,
  sp_krise: -12.2,
  sp_toll: 2.6,
  sp_choke: -1.7,
  sp_crack: -7.8,
  sp_wake: 2.9,
  sp_slam: 3.2,
  sp_settle: -7.2,
  sp_swing: -9.3,
  sp_hland: 1.9,
  sp_gin: -8.2,
  sp_gust: 0.7,
  sp_calm: -10.7,
  sp_vswing: -7.8,
  sp_vsnap: -4.5,
  sp_vdart: -8.9,
  sp_hush: -4.2,
  sp_rap: 0.8,
  sp_mute: -0.4,
  // @cal end
};

const CUES = {
  sp_kdive: { levelDb: -10, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 600), f1: P(p, 2400), q: 1.3, a: 0.08, d: 0.35, gain: 0.8 }),
      k.noise(d, t + 0.12, { src: 'crackle', type: 'highpass', f0: P(p, 2600), q: 0.7, d: 0.28, gain: 0.6, rate: 1.6 }),
      k.tone(d, t + 0.05, { type: 'sawtooth', f0: P(p, 340), f1: P(p, 180), a: 0.03, d: 0.3, gain: 0.12, filter: { f0: 1400, q: 2 } })
    ) },
  sp_kland: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 70), d: 0.18, gain: 0.8 }),
      k.noise(d, t, { type: 'lowpass', f0: 900, f1: 300, q: 0.8, d: 0.12, gain: 0.5 }),
      k.noise(d, t + 0.06, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), q: 0.9, d: 0.35, gain: 0.5, rate: 2.2 })
    ) },
  sp_krise: { levelDb: -15, priority: 2, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 500), f1: P(p, 1600), q: 1.5, a: 0.06, d: 0.18, gain: 0.7 }),
      k.noise(d, t + 0.16, { type: 'bandpass', f0: P(p, 700), f1: P(p, 2100), q: 1.5, a: 0.05, d: 0.16, gain: 0.55 })
    ) },
  sp_toll: { levelDb: -8, priority: 4, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 262), ratio: 1.41, index: 2.6, d: 1.6, gain: 0.7 }),
      k.bell(d, t, { f: P(p, 268), ratio: 2.93, index: 1.2, d: 1.2, gain: 0.35 }),
      k.tone(d, t, { f0: P(p, 131), a: 0.01, d: 1.4, gain: 0.3 }),
      k.tone(d, t, { f0: P(p, 318), a: 0.004, d: 0.7, gain: 0.12 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 3200), q: 1.4, d: 0.22, gain: 0.35, rate: 1.5 })
    ) },
  sp_choke: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 262), ratio: 1.41, index: 1.4, d: 0.16, gain: 0.6 }),
      k.tone(d, t, { f0: P(p, 180), f1: P(p, 110), d: 0.12, gain: 0.6 }),
      k.noise(d, t, { type: 'lowpass', f0: 1200, q: 0.8, d: 0.06, gain: 0.4 })
    ) },
  sp_crack: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 250, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 260), f1: P(p, 420), q: 1.2, a: 0.1, d: 0.6, gain: 0.8 }),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'bandpass', f0: P(p, 2400), q: 1, a: 0.05, d: 0.55, gain: 0.7 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 55), f1: P(p, 70), a: 0.1, d: 0.5, gain: 0.25, filter: { f0: 400, q: 3 } })
    ) },
  sp_wake: { levelDb: -8, priority: 4, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 45), d: 0.4, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1400, f1: 220, q: 0.8, d: 0.4, gain: 0.8 }),
      k.noise(d, t, { src: 'crackle', type: 'highpass', f0: P(p, 2000), q: 0.7, d: 0.45, gain: 0.6, rate: 1.3 })
    ) },
  sp_slam: { levelDb: -7, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 34), d: 0.5, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 900, f1: 160, q: 0.8, d: 0.45, gain: 0.85 }),
      k.noise(d, t + 0.02, { src: 'crackle', type: 'bandpass', f0: P(p, 1600), q: 0.8, d: 0.3, gain: 0.45 })
    ) },
  sp_settle: { levelDb: -16, priority: 2, maxVoices: 1, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 320), f1: P(p, 160), q: 1.4, a: 0.15, d: 0.7, gain: 0.9 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 62), f1: P(p, 48), a: 0.15, d: 0.6, gain: 0.2, filter: { f0: 300, q: 2 } })
    ) },
  sp_swing: { levelDb: -10, priority: 4, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 190), f1: P(p, 260), a: 0.05, d: 0.25, gain: 0.25, filter: { f0: 1100, q: 5 } }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 1500), q: 2, a: 0.04, d: 0.25, gain: 0.35, rate: 3 }),
      k.noise(d, t + 0.15, { type: 'bandpass', f0: P(p, 400), f1: P(p, 1500), q: 1.3, a: 0.12, d: 0.35, gain: 0.8 })
    ) },
  sp_hland: { levelDb: -11, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 230), f1: P(p, 170), a: 0.03, d: 0.22, gain: 0.25, filter: { f0: 1000, q: 5 } }),
      k.tone(d, t + 0.08, { f0: P(p, 120), f1: P(p, 50), d: 0.28, gain: 1 }),
      k.noise(d, t + 0.08, { src: 'brown', type: 'lowpass', f0: 800, f1: 200, q: 0.8, d: 0.25, gain: 0.7 })
    ) },
  sp_gin: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 300), f1: P(p, 1400), q: 1.8, a: 0.7, d: 0.3, gain: 0.8 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), f1: P(p, 4200), q: 6, a: 0.75, d: 0.25, gain: 0.25 })
    ) },
  sp_gust: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1400), f1: P(p, 500), q: 0.9, a: 0.03, hold: 0.25, d: 0.45, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, f1: 260, q: 0.8, a: 0.03, hold: 0.2, d: 0.4, gain: 0.7 }),
      k.noise(d, t + 0.02, { type: 'highpass', f0: P(p, 4200), f1: P(p, 2600), q: 0.7, a: 0.04, d: 0.4, gain: 0.2 })
    ) },
  sp_calm: { levelDb: -17, priority: 2, maxVoices: 1, cooldownMs: 400, fn: (k, t, d, p) =>
    k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 320), q: 1.4, a: 0.04, d: 0.6, gain: 0.8 }) },
  sp_vswing: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 410), f1: P(p, 520), glide: 0.3, a: 0.04, hold: 0.18, d: 0.18, gain: 0.22, filter: { f0: 1800, q: 7 } }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2600), q: 3, a: 0.04, hold: 0.2, d: 0.15, gain: 0.35, rate: 3.5 }),
      k.noise(d, t + 0.1, { type: 'bandpass', f0: P(p, 500), f1: P(p, 1300), q: 1.4, a: 0.12, d: 0.3, gain: 0.45 })
    ) },
  sp_vsnap: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 740), ratio: 2.76, index: 1.8, d: 0.22, gain: 0.45 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3000), q: 2.5, d: 0.04, gain: 0.5 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 560), f1: P(p, 430), a: 0.005, d: 0.1, gain: 0.15, filter: { f0: 1600, q: 6 } })
    ) },
  sp_vdart: { levelDb: -12, priority: 3, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1200), f1: P(p, 3800), q: 2.2, a: 0.015, d: 0.16, gain: 0.8 }),
      k.noise(d, t + 0.02, { type: 'highpass', f0: P(p, 4500), q: 0.7, d: 0.1, gain: 0.25 }),
      k.tone(d, t, { f0: P(p, 900), f1: P(p, 1500), a: 0.01, d: 0.1, gain: 0.08 })
    ) },
  sp_hush: { levelDb: -11, priority: 4, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1396.9), ratio: 2.0, index: 0.9, d: 0.45, gain: 0.45 }),
      k.bell(d, t + 0.1, { f: P(p, 1396.9), ratio: 2.0, index: 0.7, d: 0.3, gain: 0.25 }),
      k.tone(d, t + 0.05, { f0: P(p, 698.5), f1: P(p, 349.2), glide: 0.5, a: 0.02, d: 0.5, gain: 0.12 }),
      k.noise(d, t + 0.12, { type: 'highpass', f0: P(p, 5200), f1: P(p, 2600), q: 0.7, a: 0.3, d: 0.55, gain: 0.45 }),
      k.noise(d, t + 0.15, { type: 'bandpass', f0: P(p, 2400), f1: P(p, 600), q: 1, a: 0.25, d: 0.5, gain: 0.3 })
    ) },
  sp_rap: { levelDb: -11, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1046.5), ratio: 1.41, index: 1.6, d: 0.3, gain: 0.5 }),
      k.tone(d, t, { f0: P(p, 240), f1: P(p, 120), d: 0.1, gain: 0.6 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), q: 1.5, d: 0.04, gain: 0.35 })
    ) },
  sp_mute: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1396.9), ratio: 2.0, index: 0.9, d: 0.07, gain: 0.35 }),
      k.tone(d, t, { f0: P(p, 210), f1: P(p, 120), d: 0.1, gain: 0.6 }),
      k.noise(d, t, { type: 'lowpass', f0: 1000, q: 0.8, d: 0.05, gain: 0.4 })
    ) },
};

export const SPIRE_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];

export function createSpireEventCues() {
  return {
    kite_dive: (ev, h) => one('sp_kdive', at(ev, h, ev.id)),
    kite_land: (ev, h) => one('sp_kland', at(ev, h, ev.id)),
    kite_rise: (ev, h) => one('sp_krise', at(ev, h, ev.id)),
    chime_toll: (ev, h) => one('sp_toll', at(ev, h, ev.id)),
    chime_choke: (ev, h) => one('sp_choke', at(ev, h, ev.id)),
    gargoyle_crack: (ev, h) => one('sp_crack', at(ev, h, ev.id)),
    gargoyle_wake: (ev, h) => one('sp_wake', at(ev, h, ev.id)),
    gargoyle_slam: (ev, h) => one('sp_slam', at(ev, h, ev.id)),
    gargoyle_settle: (ev, h) => one('sp_settle', at(ev, h, ev.id)),
    hanger_swing: (ev, h) => one('sp_swing', at(ev, h, ev.id)),
    hanger_land: (ev, h) => one('sp_hland', at(ev, h, ev.id)),
    // The gust vent; other hazards fall through to their own cues.
    hazard_telegraph: (ev, h) => (ev.htype === 'gust' ? one('sp_gin', at(ev, h, ev.id)) : null),
    hazard_resolve: (ev, h) => (ev.gust ? one('sp_gust', at(ev, h, ev.id)) : null),
    gust_calm: (ev, h) => one('sp_calm', at(ev, h, ev.id)),
    // THE VANE COCK: its wind-up creak rides on the common tick; each dart
    // whips instead of the common spit.
    telegraph_start: (ev, h) => (ev.id != null && h.kind(ev.id) === 'vane' ? [...one('telegraph', at(ev, h, ev.id)), ...one('sp_vswing', at({}, h, ev.id))] : null),
    vane_volley: (ev, h) => one('sp_vsnap', at(ev, h, ev.id)),
    enemy_fire: (ev, h) => (ev.id != null && h.kind(ev.id) === 'vane' ? one('sp_vdart', at(ev, h, ev.id)) : null),
    // THE SACRISTAN.
    sacristan_hush: (ev, h) => one('sp_hush', at(ev, h, ev.id)),
    sacristan_rap: (ev, h) => one('sp_rap', at(ev, h, ev.id)),
    sacristan_choke: (ev, h) => one('sp_mute', at(ev, h, ev.id)),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerSpireCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: SPIRE_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createSpireEventCues())) engine.registerEventCue(type, fn);
  return SPIRE_CUE_IDS.length;
}
