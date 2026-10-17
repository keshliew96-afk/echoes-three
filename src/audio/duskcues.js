// THE DUSKWING (docs/DUSKWING.md): Sable's voices, registered on the engine
// like Rill's and Tolly's (engine.registerCue / registerEventCue):
// procedural wings and teeth on the engine's own kit, no files, spatial on
// the SFX bus. Listen-only: event payloads in, cues out, so the goldens
// cannot move. His placeholders in cues.js (the basic on the swing, his
// casts on the shape families) step aside for these: a registered handler
// that returns cues replaces the default. First pass (content plan 5,
// slice 4); slice 5 brings the rest of his set.
//   dk_nip     Nip: a quick leathery flick and a tiny squeak
//   dk_dive    Dusk Dive leaving: wings folding, a falling whoosh
//   dk_land    Dusk Dive landing: a soft thump, a shriek and a wing snap
//   dk_bite    Bloodbite: a wet snap of teeth over a low hiss
//   dk_sip     Night Hunger: a breath of stolen life, soft and rising
//   dk_night   Nightfall: a deep wing-beat, a downward sweep and three
//              echo-location chirps fading into the dark
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only duskcues --write.
export const DUSK_CUE_CAL = {
  // @cal begin
  dk_nip: -13.6,
  dk_dive: -7.6,
  dk_land: -2.2,
  dk_bite: -4.9,
  dk_sip: -9.2,
  dk_night: -3.2,
  // @cal end
};

const CUES = {
  dk_nip: { levelDb: -22, priority: 1, maxVoices: 3, cooldownMs: 50, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2400), f1: P(p, 1200), q: 2.2, d: 0.05, gain: 0.6 }),
      k.tone(d, t + 0.01, { type: 'sine', f0: P(p, 3200), f1: P(p, 4200), d: 0.04, gain: 0.18 })
    ) },
  dk_dive: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 700), q: 1.6, d: 0.05, gain: 0.55 }),
      k.noise(d, t + 0.07, { type: 'bandpass', f0: P(p, 800), q: 1.6, d: 0.05, gain: 0.5 }),
      k.noise(d, t + 0.1, { type: 'bandpass', f0: P(p, 2600), f1: P(p, 500), q: 0.9, a: 0.03, d: 0.28, gain: 0.7 })
    ) },
  dk_land: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 60), d: 0.16, gain: 0.75 }),
      k.noise(d, t, { type: 'lowpass', f0: 1200, f1: 300, q: 0.8, d: 0.12, gain: 0.5 }),
      k.tone(d, t + 0.02, { type: 'sawtooth', f0: P(p, 2600), f1: P(p, 1700), d: 0.1, gain: 0.12 }),
      k.noise(d, t + 0.05, { type: 'bandpass', f0: P(p, 1100), q: 2, d: 0.04, gain: 0.45 })
    ) },
  dk_bite: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 2800), q: 1.2, d: 0.03, gain: 0.6 }),
      k.noise(d, t + 0.025, { type: 'bandpass', f0: P(p, 900), f1: P(p, 500), q: 1.8, d: 0.09, gain: 0.55 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 500, q: 1, a: 0.02, d: 0.25, gain: 0.35 })
    ) },
  dk_sip: { levelDb: -24, priority: 1, maxVoices: 2, cooldownMs: 160, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 660), f1: P(p, 990), a: 0.04, d: 0.32, gain: 0.3 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), f1: P(p, 3200), q: 3, a: 0.05, d: 0.3, gain: 0.2 })
    ) },
  dk_night: { levelDb: -11, priority: 4, maxVoices: 1, cooldownMs: 250, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 600, f1: 180, q: 1, a: 0.02, d: 0.5, gain: 0.8 }),
      k.tone(d, t, { type: 'sine', f0: P(p, 220), f1: P(p, 70), a: 0.02, d: 0.7, gain: 0.45 }),
      ...[0.18, 0.3, 0.42].map((dt, i) => k.tone(d, t + dt, { type: 'sine', f0: P(p, 5200 - i * 300), f1: P(p, 3800 - i * 300), d: 0.03, gain: 0.16 - i * 0.04 }))
    ) },
};

export const DUSK_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];
const CAST_CUE = { dusk_dive: 'dk_land', blood_bite: 'dk_bite', nightfall: 'dk_night' };

export function createDuskEventCues() {
  return {
    ally_basic: (ev, h) => (ev.classId === 'duskwing' ? one('dk_nip', at(ev, h, ev.id), { pitch: 0.94 + 0.12 * ((ev.id ?? 0) % 2) }) : null),
    ally_dash: (ev, h) => (ev.skill === 'dusk_dive' ? one('dk_dive', at({ x: ev.x0, z: ev.z0 }, h, ev.id)) : null),
    ally_cast: (ev, h) => {
      if (ev.classId !== 'duskwing') return null;
      const cue = CAST_CUE[ev.skill];
      return cue ? one(cue, at(ev, h, ev.id)) : null;
    },
    heal: (ev, h) => (ev.source === 'night_hunger' ? one('dk_sip', at(ev, h, ev.target)) : null),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerDuskCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: DUSK_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createDuskEventCues())) engine.registerEventCue(type, fn);
  return DUSK_CUE_IDS.length;
}
