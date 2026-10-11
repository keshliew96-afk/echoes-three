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
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain) so each cue peaks at its
// levelDb. Shipped as offline estimates from the bake worker's DSP twin
// (src/audio/render.js), like the Spire's cues; re-measure live with
// tools/smallfixes2-cuecal.mjs --only bellcues --write.
export const BELL_CUE_CAL = {
  // @cal begin
  bw_ding: -4,
  bw_hang: -1,
  bw_toll: 1,
  bw_peal: 3,
  bw_clap: -3,
  bw_ring: -2,
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
};

export const BELL_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];
const bellZones = new Map(); // hung bells: azone id -> where (tolls speak from there)

export function createBellEventCues() {
  return {
    ally_basic: (ev, h) => (ev.classId === 'bellwright' ? one('bw_ding', at(ev, h, ev.id)) : null),
    ally_cast: (ev, h) => {
      if (ev.classId !== 'bellwright') return null;
      if (ev.skill === 'hang_bell') return one('bw_hang', at({ x: ev.zx, z: ev.zz }, h, ev.id));
      if (ev.skill === 'peal') return one('bw_peal', at(ev, h, ev.id));
      if (ev.skill === 'clapper') return one('bw_clap', at(ev, h, ev.id));
      return null;
    },
    azone_spawn: (ev) => {
      if (!ev.bell) return null;
      bellZones.set(ev.id, { x: ev.x, z: ev.z });
      if (bellZones.size > 16) bellZones.delete(bellZones.keys().next().value);
      return []; // the cast's thunk speaks for it
    },
    azone_tick: (ev) => {
      const where = bellZones.get(ev.id);
      // Alternate tolls a step apart so three bells read as a peal, not a drone.
      return where ? one('bw_toll', where, { pitch: ev.n % 2 === 0 ? 1 : 1.122 }) : null;
    },
    azone_expire: (ev) => {
      bellZones.delete(ev.id);
      return null;
    },
    bell_ring_hit: (ev, h) => one('bw_ring', at(ev, h, ev.target)),
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
