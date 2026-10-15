// HAZARDS AND SHRINES (docs/SHRINES.md, content plan 4 slice 9): the crystal
// spurs' and the shrines' own voices, registered on the engine like the
// Spire's and the vault's (engine.registerCue / registerEventCue):
// procedural, no files. Listen-only: event payloads in, cues out, so the
// goldens cannot move.
//   hz_spur_in   a spur's wind-up (with the common telegraph tick): crystal
//                creaking up through stone, a thin rising glass whine
//   hz_spur      the burst: a glassy shatter-upward over a low stone thud
//   hz_spur_go   a pillar shattering: a short fall of glass tinkles
//   sh_offer_*   a shrine answers: a soft gong, a rising bell figure in its
//                land's key and a long shimmer (music bus, so it sits over
//                the fight)
//   sh_denied    the shrine stays dark: a dull stone knock (UI)
//   sh_curse     the Grave Shrine's curse lands on the fight: a low falling
//                toll (UI)
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Measured design peaks (dBFS at unity gain) so each cue peaks at its
// levelDb — tools/smallfixes2-cuecal.mjs --only shrinecues --write. Shipped
// as estimates (0 = unmeasured); re-measure live when the sandbox allows.
export const SHRINE_CUE_CAL = {
  // @cal begin
  hz_spur_in: 0,
  hz_spur: 0,
  hz_spur_go: 0,
  sh_offer_wood: 0,
  sh_offer_mill: 0,
  sh_offer_barrow: 0,
  sh_offer_heart: 0,
  sh_offer_spire: 0,
  sh_denied: 0,
  sh_curse: 0,
  // @cal end
};

// Each land's figure (MIDI), rising: the Wood's open fifths, the Mill's
// plain major, the Barrow's minor, the Heart's whole-tone, the Spire's high
// lydian.
const FIGURES = {
  wood: [62, 69, 74, 81],
  mill: [60, 64, 67, 72],
  barrow: [57, 60, 64, 69],
  heart: [61, 65, 69, 73],
  spire: [67, 71, 73, 78],
};

const CUES = {
  hz_spur_in: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 160, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2400), q: 2.5, a: 0.25, hold: 0.4, d: 0.25, gain: 0.35 }),
      k.tone(d, t + 0.1, { f0: P(p, 1800), f1: P(p, 3600), glide: 0.75, a: 0.3, d: 0.6, gain: 0.12 }),
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 70), a: 0.2, d: 0.6, gain: 0.25 })
    ) },
  hz_spur: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 55), d: 0.22, gain: 0.85 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, q: 0.8, d: 0.18, gain: 0.5 }),
      ...[0, 0.015, 0.03, 0.05, 0.08].map((o, i) => k.bell(d, t + o, { f: P(p, 2600 + i * 830), ratio: 1.41, index: 1.6, d: 0.25 + i * 0.05, gain: 0.22 })),
      k.noise(d, t, { type: 'highpass', f0: 5000, q: 0.7, d: 0.3, gain: 0.3 })
    ) },
  hz_spur_go: { levelDb: -16, priority: 2, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(...[0, 0.05, 0.09, 0.14, 0.2, 0.27].map((o, i) => k.bell(d, t + o, { f: P(p, 3200 + ((i * 977) % 2200)), ratio: 1.41, index: 1.2, d: 0.14, gain: 0.2 })))
  },
  sh_denied: { bus: 'ui', levelDb: -14, priority: 3, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 160), f1: P(p, 110), d: 0.12, gain: 0.7 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 900, q: 0.8, d: 0.08, gain: 0.5 })
    ) },
  sh_curse: { bus: 'ui', levelDb: -12, priority: 3, maxVoices: 1, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.bell(d, t, { f: P(p, hz(45)), ratio: 1.41, index: 1.4, d: 1.8, gain: 0.4 }),
      k.bell(d, t + 0.35, { f: P(p, hz(44)), ratio: 1.41, index: 1.4, d: 1.8, gain: 0.32 })
    ) },
};

// One answer per land (a baked voice carries no land, so each is its own cue).
for (const [land, fig] of Object.entries(FIGURES)) {
  CUES[`sh_offer_${land}`] = { bus: 'music', levelDb: -10, priority: 5, maxVoices: 1, cooldownMs: 600, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, hz(fig[0] - 24)), a: 0.01, d: 1.6, gain: 0.5 }),
      k.bell(d, t, { f: P(p, hz(fig[0] - 12)), ratio: 1.4, index: 1.2, d: 1.8, gain: 0.3 }),
      ...fig.map((m, i) => k.bell(d, t + 0.12 + i * 0.11, { f: P(p, hz(m)), ratio: 2, index: 0.7, d: 1.2 + i * 0.2, gain: 0.26 })),
      k.noise(d, t + 0.3, { type: 'highpass', f0: 6500, q: 0.7, a: 0.2, hold: 0.5, d: 0.9, gain: 0.1 })
    ) };
}

export const SHRINE_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];

export function createShrineEventCues() {
  return {
    // The crystal spurs; other hazards fall through to their own cues.
    telegraph_start: (ev, h) => (ev.etype === 'spur' ? [...one('telegraph', at(ev, h, ev.id)), ...one('hz_spur_in', at(ev, h, ev.id))] : null),
    hazard_resolve: (ev, h) => (ev.htype === 'spur' ? one('hz_spur', at(ev, h, ev.id)) : null),
    rubble_crumble: (ev, h) => (ev.skin === 'spur' && ev.cause !== 'room_exit' ? one('hz_spur_go', at(ev, h, ev.id)) : null),
    // The shrines.
    shrine_offer: (ev) => one(`sh_offer_${FIGURES[ev.shrine] ? ev.shrine : 'wood'}`, {}),
    shrine_denied: () => one('sh_denied', {}),
    shrine_curse: () => one('sh_curse', {}),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerShrineCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: SHRINE_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createShrineEventCues())) engine.registerEventCue(type, fn);
  return SHRINE_CUE_IDS.length;
}
