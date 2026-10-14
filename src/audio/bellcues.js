// THE BELLWRIGHT (docs/BELLWRIGHT.md): Tolly's own voices — registered on
// the engine like Rill's (engine.registerCue / registerEventCue):
// procedural bronze on the engine's own kit, no files, spatial on the SFX
// bus. Listen-only: event payloads in, cues out, so the goldens cannot move.
// A registered handler that returns cues replaces the default one.
//   bw_ding   Ding (her basic): a small bright handbell tap
//   bw_hang   Hang Bell: a wooden thunk as the frame lands, then a chime
//   bw_toll   a hung bell's toll: a clean bronze bell (inharmonic partials)
//   bw_peal   the Peal: every bell struck at once, a bright cluster over a hum
//   bw_clap   the Clapper leaving her paw: a short wooden clack and a ping
//   bw_ring   the Clapper landing inside a ring: a struck rim, high and hard
// Her whole kit (content plan 4, slice 5):
//   bw_great  the Great Bell landing: a heavy timber drop and a low bourdon
//             (its tolls are bw_toll a fourth lower)
//   bw_knell  the Knell: one deep struck note that bends down as it travels
//   bw_swing  Bell Swing: the chain's whoosh and the clang at the bottom
//   bw_hop    Wing Hop: a flutter of wing cases and a handbell's tink
//   bw_vesper Vesper Chime: two soft high chimes a fifth apart
//   bw_fork   Tuning Fork: a pure A ringing on with its faint octave
//   bw_carillon the Carillon: a falling run of bells over a low bourdon
//   bw_answer Sympathy: the bell answering at once, bright and short
//   bw_after  the Carillon or Aftertone starting a bell's time again: a shimmer
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain) so each cue peaks at its
// levelDb. Shipped as offline estimates from the bake worker's DSP twin
// (src/audio/render.js), like the Spire's cues; re-measure live with
// tools/smallfixes2-cuecal.mjs --only bellcues --write.
export const BELL_CUE_CAL = {
  // @cal begin
  bw_ding: -3.7,
  bw_hang: -2.6,
  bw_toll: -0.7,
  bw_peal: 2,
  bw_clap: -11.6,
  bw_ring: -2.6,
  bw_great: -0.9,
  bw_knell: -2.2,
  bw_swing: -2.3,
  bw_hop: -9.1,
  bw_vesper: -5.6,
  bw_fork: -4.4,
  bw_carillon: 0.5,
  bw_answer: -5.7,
  bw_after: -11,
  // @cal end
};

const CUES = {
  bw_ding: { levelDb: -21, priority: 1, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1320), ratio: 2.76, index: 1.1, d: 0.32, gain: 0.5 }),
      k.tone(d, t, { type: 'sine', f0: P(p, 2640), a: 0.002, d: 0.12, gain: 0.18 })
    ) },
  bw_hang: { levelDb: -15, priority: 2, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 150), f1: P(p, 80), d: 0.14, gain: 0.7 }),
      k.noise(d, t, { type: 'lowpass', f0: 1100, f1: 400, q: 0.8, d: 0.09, gain: 0.5 }),
      k.bell(d, t + 0.05, { f: P(p, 660), ratio: 2.76, index: 1.4, d: 0.9, gain: 0.45 })
    ) },
  bw_toll: { levelDb: -16, priority: 2, maxVoices: 4, cooldownMs: 90, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 523), ratio: 2.0, index: 1.6, d: 1.3, gain: 0.55 }),
      k.bell(d, t, { f: P(p, 523 * 2.4), ratio: 1.5, index: 0.8, d: 0.7, gain: 0.22 }),
      k.tone(d, t, { f0: P(p, 261), a: 0.006, d: 1.1, gain: 0.18 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 4200), q: 2, d: 0.04, gain: 0.2 })
    ) },
  bw_peal: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 392), ratio: 2.0, index: 2.0, d: 1.8, gain: 0.5 }),
      k.bell(d, t + 0.03, { f: P(p, 523), ratio: 2.0, index: 1.8, d: 1.6, gain: 0.45 }),
      k.bell(d, t + 0.06, { f: P(p, 659), ratio: 2.4, index: 1.4, d: 1.4, gain: 0.4 }),
      k.tone(d, t, { f0: P(p, 98), a: 0.01, d: 1.4, gain: 0.35 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3600), q: 1.5, d: 0.08, gain: 0.3 })
    ) },
  bw_clap: { levelDb: -19, priority: 2, maxVoices: 3, cooldownMs: 60, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), q: 3, d: 0.05, gain: 0.7 }),
      k.tone(d, t + 0.01, { type: 'triangle', f0: P(p, 880), f1: P(p, 990), d: 0.1, gain: 0.25 })
    ) },
  bw_ring: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 988), ratio: 2.76, index: 2.2, d: 0.6, gain: 0.55 }),
      k.noise(d, t, { type: 'highpass', f0: P(p, 3000), q: 0.9, d: 0.05, gain: 0.35 })
    ) },
  bw_great: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 110), f1: P(p, 55), d: 0.22, gain: 0.8 }),
      k.noise(d, t, { type: 'lowpass', f0: 900, f1: 250, q: 0.8, d: 0.14, gain: 0.6 }),
      k.bell(d, t + 0.06, { f: P(p, 330), ratio: 2.0, index: 1.8, d: 1.8, gain: 0.5 }),
      k.tone(d, t + 0.06, { f0: P(p, 165), a: 0.01, d: 1.6, gain: 0.25 })
    ) },
  bw_knell: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 294), ratio: 2.0, index: 2.2, d: 1.4, gain: 0.55 }),
      k.tone(d, t, { f0: P(p, 588), f1: P(p, 520), a: 0.004, d: 0.6, gain: 0.2 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2600), f1: P(p, 900), q: 1.6, d: 0.35, gain: 0.28 })
    ) },
  bw_swing: { levelDb: -15, priority: 2, maxVoices: 2, cooldownMs: 100, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 500), f1: P(p, 2200), q: 1.2, d: 0.2, gain: 0.5 }),
      k.bell(d, t + 0.17, { f: P(p, 440), ratio: 2.4, index: 2.0, d: 0.8, gain: 0.5 }),
      k.noise(d, t + 0.17, { type: 'highpass', f0: P(p, 2500), q: 0.9, d: 0.05, gain: 0.35 })
    ) },
  bw_hop: { levelDb: -19, priority: 2, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1400), q: 2.5, d: 0.04, gain: 0.5 }),
      k.noise(d, t + 0.05, { type: 'bandpass', f0: P(p, 1700), q: 2.5, d: 0.04, gain: 0.45 }),
      k.noise(d, t + 0.1, { type: 'bandpass', f0: P(p, 2000), q: 2.5, d: 0.04, gain: 0.4 }),
      k.bell(d, t + 0.12, { f: P(p, 1760), ratio: 2.76, index: 1.0, d: 0.5, gain: 0.35 })
    ) },
  bw_vesper: { levelDb: -18, priority: 2, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 1047), ratio: 2.0, index: 0.8, d: 1.1, gain: 0.4 }),
      k.bell(d, t + 0.12, { f: P(p, 1568), ratio: 2.0, index: 0.7, d: 1.0, gain: 0.35 })
    ) },
  bw_fork: { levelDb: -19, priority: 2, maxVoices: 1, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 440), a: 0.003, d: 1.6, gain: 0.5 }),
      k.tone(d, t, { type: 'sine', f0: P(p, 880), a: 0.003, d: 0.5, gain: 0.12 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3000), q: 3, d: 0.02, gain: 0.25 })
    ) },
  bw_carillon: { levelDb: -8, priority: 4, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      ...[784, 659, 523, 440, 392].map((f, i) => k.bell(d, t + i * 0.07, { f: P(p, f), ratio: 2.0, index: 1.8, d: 1.6 - i * 0.1, gain: 0.42 })),
      k.tone(d, t, { f0: P(p, 98), a: 0.02, d: 2.0, gain: 0.35 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 3800), q: 1.5, d: 0.1, gain: 0.3 })
    ) },
  bw_answer: { levelDb: -17, priority: 2, maxVoices: 3, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, 784), ratio: 2.0, index: 1.4, d: 0.6, gain: 0.5 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 4800), q: 2, d: 0.03, gain: 0.2 })
    ) },
  bw_after: { levelDb: -22, priority: 1, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sine', f0: P(p, 1320), f1: P(p, 1760), a: 0.05, d: 0.5, gain: 0.25 }),
      k.tone(d, t + 0.05, { type: 'sine', f0: P(p, 1980), f1: P(p, 2640), a: 0.05, d: 0.45, gain: 0.15 })
    ) },
};

export const BELL_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];
const bellZones = new Map(); // hung bells: azone id -> { x, z, size } (tolls speak from there)
// Her casts with a voice of their own (the Peal family is handled apart).
const CAST_CUE = { hang_bell: 'bw_hang', great_bell: 'bw_great', clapper: 'bw_clap', knell: 'bw_knell', bell_swing: 'bw_swing', wing_hop: 'bw_hop', vesper_chime: 'bw_vesper', tuning_fork: 'bw_fork' };

export function createBellEventCues() {
  return {
    ally_basic: (ev, h) => (ev.classId === 'bellwright' ? one('bw_ding', at(ev, h, ev.id)) : null),
    ally_cast: (ev, h) => {
      if (ev.classId !== 'bellwright') return null;
      if (ev.skill === 'peal') return one('bw_peal', at(ev, h, ev.id));
      if (ev.skill === 'carillon') return one('bw_carillon', at(ev, h, ev.id));
      const cue = CAST_CUE[ev.skill];
      if (!cue) return null;
      // A placed bell speaks from where it lands; the rest from her paws.
      const where = ev.skill === 'hang_bell' || ev.skill === 'great_bell' ? at({ x: ev.zx, z: ev.zz }, h, ev.id) : at(ev, h, ev.id);
      return one(cue, where);
    },
    azone_spawn: (ev) => {
      if (!ev.bell) return null;
      bellZones.set(ev.id, { x: ev.x, z: ev.z, size: ev.bellSize ?? 1 });
      if (bellZones.size > 16) bellZones.delete(bellZones.keys().next().value);
      return []; // the cast's thunk speaks for it
    },
    azone_tick: (ev) => {
      const b = bellZones.get(ev.id);
      if (!b) return null;
      // Alternate tolls a step apart so three bells read as a peal, not a
      // drone; a great bell tolls a fourth lower, a handbell an octave up.
      const base = b.size > 1.1 ? 0.75 : b.size < 0.9 ? 2 : 1;
      return one('bw_toll', { x: b.x, z: b.z }, { pitch: base * (ev.n % 2 === 0 ? 1 : 1.122) });
    },
    azone_expire: (ev) => {
      bellZones.delete(ev.id);
      return null;
    },
    bell_ring_hit: (ev, h) => one('bw_ring', at(ev, h, ev.target)),
    bell_sympathy: (ev, h) => one('bw_answer', at(ev, h, ev.id)),
    bell_rehang: (ev, h) => one('bw_after', at(ev, h, ev.id)),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerBellCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: BELL_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createBellEventCues())) engine.registerEventCue(type, fn);
  return BELL_CUE_IDS.length;
}
