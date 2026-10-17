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
// His whole kit (content plan 5, slice 5):
//   dk_screech Echo Screech: a falling shriek with two thin echoes behind it
//   dk_rake    Talon Rake: three quick claw scrapes, high to low
//   dk_swarm   Bat Swarm: a rush of many small wings pouring in
//   dk_nibble  Bat Swarm biting: a soft patter of tiny teeth
//   dk_veil    Shadow Veil: wings wrapping shut, a low hush and a soft tone
//   dk_flit    Flit: a flick of wings and a short rising whoosh
//   dk_moon    Blood Moon: a deep swell under a cold high dyad, three chirps
//   dk_eclipse Eclipse: a hollow dark thud that swallows its own tail
//   dk_frenzy  Frenzy: a quick fluttering rise
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only duskcues --write.
export const DUSK_CUE_CAL = {
  // @cal begin
  dk_nip: -12.3,
  dk_dive: -7.9,
  dk_land: -2.3,
  dk_bite: -4.6,
  dk_sip: -9.6,
  dk_night: -1.1,
  dk_screech: -13.6,
  dk_rake: -10.2,
  dk_swarm: -13.7,
  dk_nibble: -4,
  dk_veil: -10.4,
  dk_flit: -13.8,
  dk_moon: -1.2,
  dk_eclipse: -1.6,
  dk_frenzy: -13.7,
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
  dk_screech: { levelDb: -15, priority: 2, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 4200), f1: P(p, 1800), a: 0.005, d: 0.22, gain: 0.16 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3600), f1: P(p, 1600), q: 4, d: 0.2, gain: 0.35 }),
      ...[0.16, 0.3].map((dt, i) => k.tone(d, t + dt, { type: 'sine', f0: P(p, 3400 - i * 400), f1: P(p, 1700 - i * 200), d: 0.12, gain: 0.1 - i * 0.04 }))
    ) },
  dk_rake: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      ...[0, 0.035, 0.07].map((dt, i) => k.noise(d, t + dt, { type: 'bandpass', f0: P(p, 3200 - i * 700), f1: P(p, 1400 - i * 300), q: 2.4, d: 0.06, gain: 0.55 })),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, q: 0.8, d: 0.12, gain: 0.3 })
    ) },
  dk_swarm: { levelDb: -15, priority: 3, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      ...Array.from({ length: 10 }, (_, i) => k.noise(d, t + i * 0.035, { type: 'bandpass', f0: P(p, 900 + (i % 3) * 260), q: 1.8, d: 0.03, gain: 0.35 + 0.03 * i })),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), f1: P(p, 700), q: 0.9, a: 0.08, d: 0.35, gain: 0.35 }),
      ...[0.12, 0.24].map((dt) => k.tone(d, t + dt, { type: 'sine', f0: P(p, 5600), f1: P(p, 4400), d: 0.025, gain: 0.08 }))
    ) },
  dk_nibble: { levelDb: -25, priority: 1, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      ...[0, 0.04, 0.09].map((dt) => k.noise(d, t + dt, { type: 'highpass', f0: P(p, 3000), q: 1.4, d: 0.018, gain: 0.5 }))
    ) },
  dk_veil: { levelDb: -17, priority: 2, maxVoices: 1, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 600), f1: P(p, 1400), q: 1.2, a: 0.06, d: 0.25, gain: 0.5 }),
      k.noise(d, t + 0.22, { type: 'lowpass', f0: 900, q: 1, d: 0.06, gain: 0.4 }),
      k.tone(d, t + 0.2, { type: 'sine', f0: P(p, 440), f1: P(p, 330), a: 0.02, d: 0.4, gain: 0.2 })
    ) },
  dk_flit: { levelDb: -18, priority: 2, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 800), q: 1.6, d: 0.035, gain: 0.5 }),
      k.noise(d, t + 0.045, { type: 'bandpass', f0: P(p, 950), q: 1.6, d: 0.035, gain: 0.45 }),
      k.noise(d, t + 0.06, { type: 'bandpass', f0: P(p, 600), f1: P(p, 2800), q: 1, a: 0.02, d: 0.18, gain: 0.5 })
    ) },
  dk_moon: { levelDb: -10, priority: 4, maxVoices: 1, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 55), f1: P(p, 82), a: 0.15, d: 0.9, gain: 0.7 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 300, f1: 900, q: 1, a: 0.2, d: 0.6, gain: 0.6 }),
      k.tone(d, t + 0.1, { type: 'sine', f0: P(p, 1320), a: 0.1, d: 0.8, gain: 0.08 }),
      k.tone(d, t + 0.1, { type: 'sine', f0: P(p, 1980), a: 0.12, d: 0.8, gain: 0.06 }),
      ...[0.5, 0.62, 0.74].map((dt, i) => k.tone(d, t + dt, { type: 'sine', f0: P(p, 5000 - i * 300), f1: P(p, 3600 - i * 300), d: 0.03, gain: 0.14 - i * 0.04 }))
    ) },
  dk_eclipse: { levelDb: -15, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 45), d: 0.3, gain: 0.7 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 800, f1: 150, q: 1, d: 0.35, gain: 0.45 })
    ) },
  dk_frenzy: { levelDb: -21, priority: 1, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      ...[0, 0.03, 0.06, 0.09].map((dt, i) => k.noise(d, t + dt, { type: 'bandpass', f0: P(p, 900 + i * 350), q: 2, d: 0.025, gain: 0.45 })),
      k.tone(d, t + 0.05, { type: 'sine', f0: P(p, 700), f1: P(p, 1400), d: 0.1, gain: 0.12 })
    ) },
};

export const DUSK_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];
const CAST_CUE = { dusk_dive: 'dk_land', blood_bite: 'dk_bite', nightfall: 'dk_night', echo_screech: 'dk_screech', talon_rake: 'dk_rake', shadow_veil: 'dk_veil', blood_moon: 'dk_moon' };
// His zones: Bat Swarm's spawn and bites (Flit's puff is quiet; the flit itself sounds).
const swarmZones = new Set();

export function createDuskEventCues() {
  return {
    ally_basic: (ev, h) => (ev.classId === 'duskwing' ? one('dk_nip', at(ev, h, ev.id), { pitch: 0.94 + 0.12 * ((ev.id ?? 0) % 2) }) : null),
    ally_dash: (ev, h) => (ev.skill === 'dusk_dive' ? one('dk_dive', at({ x: ev.x0, z: ev.z0 }, h, ev.id)) : ev.skill === 'flit' ? one('dk_flit', at({ x: ev.x0, z: ev.z0 }, h, ev.id)) : null),
    azone_spawn: (ev, h) => {
      if (ev.skill !== 'bat_swarm') return null;
      swarmZones.add(ev.id);
      return one('dk_swarm', at(ev, h, null));
    },
    azone_tick: (ev, h) => (swarmZones.has(ev.id) && ev.hit && ev.hit.length ? one('dk_nibble', at({}, h, ev.hit[0])) : null),
    azone_expire: (ev) => {
      swarmZones.delete(ev.id);
      return null;
    },
    dusk_eclipse: (ev, h) => one('dk_eclipse', at(ev, h, null)),
    dusk_frenzy: (ev, h) => one('dk_frenzy', at(ev, h, ev.id)),
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
