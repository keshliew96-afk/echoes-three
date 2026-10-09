// New enemies, Wood and Mill (docs/WOOD_MILL_ENEMIES.md): the Shriek Owl's,
// the Vine Lasher's, the Mire Leech's and the Drowned Miller's own voices —
// registered on the engine like the Heart's creatures (engine.registerCue /
// registerEventCue): procedural voices on the engine's own kit, no files,
// spatial on the SFX bus. Listen-only: event payloads in, cues out, so the
// goldens cannot move.
//   wm_shriek  the owl's shriek: a raw falling screech with a hiss in it
//   wm_lash    the lasher's whip: a hard crack over a green swish
//   wm_yank    the drag: vines creaking taut and earth scraping
//   wm_latch   the leech latching on: a wet slap and a suck
//   wm_drain   a drain: a small low gulp
//   wm_shed    the leech thrown off: a wet pop and a splash
//   wm_sweep   the miller's sweep: a heavy whoosh round and a stone thud
//   wm_toss    the sack leaving his hand: a grunt of air
//   wm_sack    the sack landing: a soft heavy thump and a flour hiss
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only woodmillcues --write.
export const WOODMILL_CUE_CAL = {
  // @cal begin
  wm_shriek: -3.2,
  wm_lash: 1.9,
  wm_yank: -3.7,
  wm_latch: 0,
  wm_drain: -2.1,
  wm_shed: -3.4,
  wm_sweep: 1.2,
  wm_toss: -9.8,
  wm_sack: 1.2,
  // @cal end
};

const CUES = {
  wm_shriek: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 2900), f1: P(p, 1250), a: 0.02, d: 0.55, gain: 0.45, filter: { f0: 4200, q: 3 } }),
      k.tone(d, t + 0.01, { type: 'square', f0: P(p, 2100), f1: P(p, 980), a: 0.03, d: 0.5, gain: 0.18, filter: { f0: 3000, q: 2 } }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 5200), f1: P(p, 2600), q: 3, a: 0.02, d: 0.5, gain: 0.5 })
    ) },
  wm_lash: { levelDb: -8, priority: 4, maxVoices: 2, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 700), f1: P(p, 2600), q: 1.2, a: 0.06, d: 0.12, gain: 0.45 }),
      k.noise(d, t + 0.1, { type: 'highpass', f0: P(p, 3800), f1: P(p, 2200), q: 0.8, d: 0.07, gain: 1 }),
      k.tone(d, t + 0.1, { f0: P(p, 1400), f1: P(p, 400), d: 0.05, gain: 0.5 })
    ) },
  wm_yank: { levelDb: -14, priority: 2, maxVoices: 1, cooldownMs: 250, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 500, f1: 1100, q: 1, a: 0.04, d: 0.32, gain: 0.8 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 140), f1: P(p, 210), a: 0.05, d: 0.28, gain: 0.25, filter: { f0: 900, q: 4 } }),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), q: 1.2, d: 0.25, gain: 0.35 })
    ) },
  wm_latch: { levelDb: -10, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'lowpass', f0: P(p, 1800), f1: P(p, 400), q: 1.5, d: 0.16, gain: 0.9 }),
      k.tone(d, t, { f0: P(p, 340), f1: P(p, 110), d: 0.14, gain: 0.6 }),
      k.tone(d, t + 0.12, { type: 'triangle', f0: P(p, 180), f1: P(p, 420), a: 0.03, d: 0.18, gain: 0.3 })
    ) },
  wm_drain: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 190), f1: P(p, 85), d: 0.16, gain: 0.8 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 600), f1: P(p, 300), q: 3, d: 0.14, gain: 0.4 })
    ) },
  wm_shed: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 520), f1: P(p, 180), d: 0.09, gain: 0.7 }),
      k.noise(d, t + 0.02, { type: 'bandpass', f0: P(p, 2400), f1: P(p, 900), q: 1.2, d: 0.3, gain: 0.6 })
    ) },
  wm_sweep: { levelDb: -7, priority: 4, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 300), f1: P(p, 1300), q: 1.4, a: 0.12, d: 0.3, gain: 0.7 }),
      k.tone(d, t + 0.2, { f0: P(p, 95), f1: P(p, 38), d: 0.45, gain: 1 }),
      k.noise(d, t + 0.2, { src: 'brown', type: 'lowpass', f0: 800, f1: 160, q: 0.8, d: 0.4, gain: 0.7 })
    ) },
  wm_toss: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 380), q: 1.4, a: 0.03, d: 0.22, gain: 0.8 }),
      k.tone(d, t, { type: 'triangle', f0: P(p, 140), f1: P(p, 95), d: 0.16, gain: 0.3 })
    ) },
  wm_sack: { levelDb: -9, priority: 3, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 46), d: 0.32, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, f1: 200, q: 0.8, d: 0.3, gain: 0.7 }),
      k.noise(d, t + 0.04, { type: 'highpass', f0: P(p, 3200), f1: P(p, 5200), q: 0.7, a: 0.05, d: 0.6, gain: 0.25 })
    ) },
};

export const WOODMILL_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];

export function createWoodMillEventCues() {
  return {
    owl_shriek: (ev, h) => one('wm_shriek', at(ev, h, ev.id)),
    lasher_lash: (ev, h) => one('wm_lash', at(ev, h, ev.id)),
    lasher_yank: (ev, h) => one('wm_yank', at(ev, h, ev.id)),
    leech_latch: (ev, h) => one('wm_latch', at(ev, h, ev.id)),
    leech_drain: (ev, h) => one('wm_drain', at(ev, h, ev.id)),
    leech_shed: (ev, h) => one('wm_shed', at(ev, h, ev.id)),
    miller_sweep: (ev, h) => one('wm_sweep', at(ev, h, ev.id)),
    // The sack replaces the generic lob and splash; other globs fall through.
    enemy_lob: (ev, h) => (ev.sack ? one('wm_toss', at(ev, h, ev.id)) : null),
    enemy_glob_land: (ev, h) => (ev.sack ? one('wm_sack', at(ev, h)) : null),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerWoodMillCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: WOODMILL_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createWoodMillEventCues())) engine.registerEventCue(type, fn);
  return WOODMILL_CUE_IDS.length;
}
