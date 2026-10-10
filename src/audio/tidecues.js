// THE TIDECALLER (docs/TIDECALLER.md, slice 3): Rill's own voices —
// registered on the engine like the creatures' (engine.registerCue /
// registerEventCue): procedural water on the engine's own kit, no files,
// spatial on the SFX bus. Listen-only: event payloads in, cues out, so the
// goldens cannot move. Her placeholders in cues.js (Spit on the bolt, her
// casts on the shape families, the Crash on impact + zone) step aside for
// these: a registered handler that returns cues replaces the default.
//   td_spit    Spit: a small wet plip
//   td_bolt    Riverbolt leaving her paws: a watery swish and a bubble blip
//   td_jet     Torrent: a hard pressurised hiss over a low rush
//   td_splash  a tide bolt landing: a bright splash
//   td_wave    Breaker / Crashing Wave: a swell rising and breaking
//   td_swirl   Undertow / Whirlpool placed: a gurgling swirl
//   td_rain    Rain Squall: a rain hiss rolling in, a soft far rumble
//   td_vault   Ripple Step: a plunk off the water and a quick whoosh
//   td_bubble  Bubble Ward: bubbles rising round its bearer
//   td_pop     the bubble bursting: a round pop and a spatter
//   td_draw    Maelstrom's draw: a deep swirl winding up
//   td_burst   Maelstrom's burst: a column of water crashing down
//   td_crash   a Crash on a soaked enemy: a heavy splash-thump
//   td_puddle  a Deluge or Dive puddle: a drip and a plop
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only tidecues --write.
export const TIDE_CUE_CAL = {
  // @cal begin
  td_spit: -4.6,
  td_bolt: -5.5,
  td_jet: 1.1,
  td_splash: -0.3,
  td_wave: 1.7,
  td_swirl: -8.5,
  td_rain: -2.4,
  td_vault: -3.6,
  td_bubble: -6.4,
  td_pop: -2.2,
  td_draw: -7.9,
  td_burst: 1.4,
  td_crash: 1,
  td_puddle: -6,
  // @cal end
};

const CUES = {
  td_spit: { levelDb: -21, priority: 1, maxVoices: 3, cooldownMs: 50, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 900), f1: P(p, 1500), d: 0.06, gain: 0.5 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3000), f1: P(p, 1800), q: 2, d: 0.07, gain: 0.5 })
    ) },
  td_bolt: { levelDb: -17, priority: 2, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 2600), q: 1.4, a: 0.02, d: 0.18, gain: 0.7 }),
      k.tone(d, t + 0.03, { type: 'sine', f0: P(p, 500), f1: P(p, 1100), d: 0.07, gain: 0.45 }),
      k.tone(d, t + 0.09, { type: 'sine', f0: P(p, 700), f1: P(p, 1400), d: 0.05, gain: 0.3 })
    ) },
  td_jet: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 2600), f1: P(p, 1800), q: 0.8, a: 0.01, d: 0.4, gain: 0.7 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, f1: 300, q: 1, a: 0.02, d: 0.42, gain: 0.9 }),
      k.tone(d, t, { type: 'triangle', f0: P(p, 160), f1: P(p, 90), d: 0.25, gain: 0.4 })
    ) },
  td_splash: { levelDb: -16, priority: 2, maxVoices: 4, cooldownMs: 40, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2400), f1: P(p, 900), q: 1.1, d: 0.22, gain: 0.8 }),
      k.tone(d, t, { type: 'sine', f0: P(p, 420), f1: P(p, 160), d: 0.08, gain: 0.5 })
    ) },
  td_wave: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 300, f1: 1400, q: 1, a: 0.12, d: 0.2, gain: 0.45 }),
      k.noise(d, t + 0.12, { type: 'bandpass', f0: P(p, 1600), f1: P(p, 600), q: 0.9, d: 0.5, gain: 0.5 }),
      k.tone(d, t + 0.12, { f0: P(p, 110), f1: P(p, 45), d: 0.4, gain: 1 })
    ) },
  td_swirl: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 500), f1: P(p, 1500), q: 4, a: 0.08, d: 0.5, gain: 0.7 }),
      k.tone(d, t, { type: 'sine', f0: P(p, 220), f1: P(p, 140), a: 0.04, d: 0.45, gain: 0.35 }),
      k.tone(d, t + 0.18, { type: 'sine', f0: P(p, 380), f1: P(p, 620), d: 0.06, gain: 0.25 })
    ) },
  td_rain: { levelDb: -13, priority: 3, maxVoices: 1, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 3400), f1: P(p, 4200), q: 0.6, a: 0.3, d: 1.1, gain: 0.55 }),
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2600), q: 1, a: 0.2, d: 1.0, gain: 0.45 }),
      k.noise(d, t + 0.1, { src: 'brown', type: 'lowpass', f0: 220, f1: 120, q: 0.7, a: 0.2, d: 0.9, gain: 0.6 })
    ) },
  td_vault: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 260), f1: P(p, 640), d: 0.1, gain: 0.7 }),
      k.noise(d, t + 0.04, { type: 'bandpass', f0: P(p, 700), f1: P(p, 2000), q: 1.2, a: 0.04, d: 0.2, gain: 0.6 })
    ) },
  td_bubble: { levelDb: -15, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 500), f1: P(p, 900), d: 0.08, gain: 0.5 }),
      k.tone(d, t + 0.07, { type: 'sine', f0: P(p, 650), f1: P(p, 1150), d: 0.07, gain: 0.45 }),
      k.tone(d, t + 0.13, { type: 'sine', f0: P(p, 800), f1: P(p, 1500), d: 0.08, gain: 0.4 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), q: 3, a: 0.05, d: 0.25, gain: 0.25 })
    ) },
  td_pop: { levelDb: -13, priority: 3, maxVoices: 3, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 1300), f1: P(p, 380), d: 0.06, gain: 0.8 }),
      k.noise(d, t + 0.01, { type: 'bandpass', f0: P(p, 3200), f1: P(p, 1400), q: 1.2, d: 0.2, gain: 0.55 })
    ) },
  td_draw: { levelDb: -12, priority: 4, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: 200, f1: 900, q: 2.5, a: 0.5, d: 0.5, gain: 0.9 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 60), f1: P(p, 140), a: 0.6, d: 0.4, gain: 0.3, filter: { f0: 500, q: 3 } }),
      k.noise(d, t + 0.2, { type: 'bandpass', f0: P(p, 600), f1: P(p, 2200), q: 5, a: 0.4, d: 0.4, gain: 0.35 })
    ) },
  td_burst: { levelDb: -8, priority: 5, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 32), d: 0.6, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1200, f1: 200, q: 0.8, d: 0.7, gain: 0.5 }),
      k.noise(d, t + 0.05, { type: 'bandpass', f0: P(p, 1800), f1: P(p, 500), q: 0.8, d: 0.9, gain: 0.45 }),
      k.noise(d, t + 0.3, { type: 'highpass', f0: P(p, 3000), q: 0.6, a: 0.1, d: 0.8, gain: 0.2 })
    ) },
  td_crash: { levelDb: -11, priority: 4, maxVoices: 2, cooldownMs: 70, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 55), d: 0.22, gain: 0.9 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1500), f1: P(p, 600), q: 1, d: 0.3, gain: 0.8 })
    ) },
  td_puddle: { levelDb: -20, priority: 1, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 1200), f1: P(p, 1900), d: 0.05, gain: 0.5 }),
      k.tone(d, t + 0.08, { type: 'sine', f0: P(p, 300), f1: P(p, 180), d: 0.1, gain: 0.5 })
    ) },
};

export const TIDE_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];
// Each of her skills' cast voice (Tidepool pulses quietly through the
// default aura path; Ripple Step's is its vault, below).
const CAST_CUE = {
  riverbolt: 'td_bolt',
  torrent: 'td_jet',
  undertow: 'td_swirl',
  whirlpool: 'td_swirl',
  breaker: 'td_wave',
  crashing_wave: 'td_wave',
  rain_squall: 'td_rain',
  bubble_ward: 'td_bubble',
  maelstrom: 'td_draw',
};
const TIDE_BOLTS = new Set(['riverbolt', 'torrent']);
const burstZones = new Map(); // Maelstrom burst zones: id -> where, until they burst

export function createTideEventCues() {
  return {
    ally_basic: (ev, h) => (ev.classId === 'tidecaller' ? one('td_spit', at(ev, h, ev.id)) : null),
    ally_cast: (ev, h) => {
      if (ev.classId !== 'tidecaller') return null;
      if (ev.skill === 'ripple_step') return []; // the vault speaks for it
      const c = CAST_CUE[ev.skill];
      const where = ev.skill === 'rain_squall' || ev.skill === 'undertow' || ev.skill === 'whirlpool' ? at({ x: ev.zx, z: ev.zz }, h, ev.id) : at(ev, h, ev.id);
      return c ? one(c, where, ev.skill === 'whirlpool' ? { pitch: 0.85 } : ev.skill === 'crashing_wave' ? { pitch: 0.9 } : undefined) : null;
    },
    ally_dash: (ev) => (ev.skill === 'ripple_step' ? one('td_vault', { x: ev.x0, z: ev.z0 }) : null),
    // A tide bolt's landing: the impact plus a splash over it.
    hit: (ev, h) => {
      if (!TIDE_BOLTS.has(ev.source)) return null;
      const where = at(ev, h, ev.target);
      const out = [{ cue: 'impact', ...where }, { cue: 'td_splash', ...where, pitch: ev.source === 'torrent' ? 0.85 : 1 }];
      if (ev.crit) out.push({ cue: 'crit', ...where });
      return out;
    },
    crash: (ev) => [{ cue: 'td_crash', x: ev.x, z: ev.z, pitch: ev.stun ? 0.9 : 1 }],
    bubble_burst: (ev, h) => one('td_pop', at(ev, h, ev.id)),
    azone_spawn: (ev, h) => {
      if (ev.classId !== 'tidecaller') return null;
      if (ev.burst) {
        burstZones.set(ev.id, { x: ev.x, z: ev.z });
        if (burstZones.size > 16) burstZones.delete(burstZones.keys().next().value);
        return [];
      }
      if (ev.puddle) return one('td_puddle', at(ev, h));
      return []; // her placements' voice is their cast's
    },
    azone_tick: (ev, h) => {
      const where = burstZones.get(ev.id);
      if (!where) return null;
      burstZones.delete(ev.id);
      return one('td_burst', where);
    },
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerTideCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: TIDE_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createTideEventCues())) engine.registerEventCue(type, fn);
  return TIDE_CUE_IDS.length;
}
