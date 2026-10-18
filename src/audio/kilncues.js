// Act VI (the Ember Kiln, docs/KILN.md): the kiln's creatures' and its
// cinder vents' own voices — registered on the engine like the Spire's
// (engine.registerCue / registerEventCue): procedural voices on the
// engine's own kit, no files, spatial on the SFX bus. Listen-only: event
// payloads in, cues out, so the goldens cannot move.
//   kn_ncrouch  the Ember Newt crouching (its lane telegraph, with the
//               common tick): a coal-belly drawing breath, claws scrabbling
//   kn_lunge    newt_lunge: a quick hot dart, a sizzling scrape down the lane
//   kn_nstop    newt_stop: claws skidding on brick, a panting hiss
//   kn_srear    the Slag Golem rearing (its ring telegraph, with the common
//               tick): a molten groan rising under grinding slag
//   kn_slam     slag_slam: a heavy molten blow, a splash of slag sizzling
//   kn_crust    slag_crust: the crust knitting shut, slag ticking as it cools
//   kn_bpump    the Bellows Imp pumping (its cone telegraph, with the common
//               tick): two leather wheezes drawing in, rising
//   kn_fan      bellows_fan: a gust of breath and a spray of sparks
//   kn_bchoke   bellows_choke: the bellows coughing short, a sputter of ash
//   kn_mkindle  the Cinder Moth kindling (its ring telegraph, with the
//               common tick): ash catching, a crackle swelling to a flame
//   kn_flare    cindermoth_flare: a whoomph of fire
//   kn_snuff    cindermoth_snuff: a flame smothered, a soft puff of ash
//   kn_relight  cindermoth_relight: a small flame catching again
//   kn_vrumble  a cinder vent's telegraph: the furnace below rumbling up
//   kn_erupt    a cinder vent's eruption: a roaring column of fire
//   kn_vcool    vent_cool: the cinder bed cooling, a falling steam hiss
//   kn_hheave   the Coal Hurler heaving its sack (its ring telegraph, with
//               the common tick): a grunt, coals shifting in the sack
//   kn_hcoal    hurler_coal: a sack of coals bursting, a shower of embers
//   kn_hfumble  hurler_fumble: the sack dropped, coals spilling
//   kn_wgather  the Ash Wraith gathering (its ring telegraph, with the
//               common tick): a dry breath of ash drawn in
//   kn_wfade    ashwraith_fade: the wraith scattering into a whirl of ash
//   kn_wrake    ashwraith_rake: cinder claws raking out of the ash
//   kn_wrecover ashwraith_recover: its ember catching again
const P = (p, f) => f * (p && p.pitch ? p.pitch : 1);

// Measured design peaks (dBFS at unity gain, max of 3 takes) so each cue
// peaks at its levelDb — tools/smallfixes2-cuecal.mjs --only kilncues --write.
// Measured live (headless Chromium, the engine's measureCue hook, max of 3
// heard takes) against a production build.
export const KILN_CUE_CAL = {
  // @cal begin
  kn_ncrouch: -7.1,
  kn_lunge: -9.8,
  kn_nstop: -8.7,
  kn_srear: -4,
  kn_slam: 1.7,
  kn_crust: -12.2,
  kn_bpump: -12.1,
  kn_fan: -1.4,
  kn_bchoke: -8.7,
  kn_mkindle: -12.6,
  kn_flare: -2.1,
  kn_snuff: -5.3,
  kn_relight: -7.4,
  kn_vrumble: -2.5,
  kn_erupt: 1.5,
  kn_vcool: 1.3,
  kn_hheave: -8,
  kn_hcoal: 0,
  kn_hfumble: -6,
  kn_wgather: -10,
  kn_wfade: -6,
  kn_wrake: -3,
  kn_wrecover: -8,
  // @cal end
};

const CUES = {
  // THE EMBER NEWT.
  kn_ncrouch: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1800), f1: P(p, 3400), q: 2, a: 0.25, d: 0.15, gain: 0.6 }),
      k.noise(d, t, { src: 'crackle', type: 'highpass', f0: P(p, 3200), q: 0.8, a: 0.05, hold: 0.15, d: 0.12, gain: 0.45, rate: 2.4 }),
      k.tone(d, t + 0.05, { f0: P(p, 180), f1: P(p, 140), a: 0.1, d: 0.2, gain: 0.18 })
    ) },
  kn_lunge: { levelDb: -11, priority: 4, maxVoices: 3, cooldownMs: 80, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 900), f1: P(p, 3200), q: 1.6, a: 0.015, d: 0.22, gain: 0.8 }),
      k.noise(d, t + 0.03, { src: 'crackle', type: 'highpass', f0: P(p, 4000), q: 0.7, d: 0.3, gain: 0.55, rate: 2 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 520), f1: P(p, 260), a: 0.01, d: 0.14, gain: 0.1, filter: { f0: 2000, q: 3 } })
    ) },
  kn_nstop: { levelDb: -15, priority: 2, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2200), f1: P(p, 1100), q: 1.4, a: 0.01, d: 0.16, gain: 0.7, rate: 3 }),
      k.tone(d, t, { f0: P(p, 210), f1: P(p, 120), d: 0.08, gain: 0.4 }),
      k.noise(d, t + 0.14, { type: 'bandpass', f0: P(p, 2600), q: 2.5, a: 0.04, d: 0.12, gain: 0.3 }),
      k.noise(d, t + 0.32, { type: 'bandpass', f0: P(p, 2400), q: 2.5, a: 0.04, d: 0.12, gain: 0.22 })
    ) },
  // THE SLAG GOLEM.
  kn_srear: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 250, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 48), f1: P(p, 72), a: 0.3, d: 0.6, gain: 0.35, filter: { f0: 380, q: 4 } }),
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 180), f1: P(p, 420), q: 1.4, a: 0.35, d: 0.5, gain: 0.85 }),
      k.noise(d, t + 0.1, { src: 'crackle', type: 'bandpass', f0: P(p, 1400), q: 1.2, a: 0.2, d: 0.5, gain: 0.45, rate: 0.8 })
    ) },
  kn_slam: { levelDb: -7, priority: 4, maxVoices: 2, cooldownMs: 120, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 80), f1: P(p, 32), d: 0.55, gain: 1 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1100, f1: 180, q: 0.8, d: 0.5, gain: 0.85 }),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'highpass', f0: P(p, 2800), q: 0.7, a: 0.03, d: 0.7, gain: 0.5, rate: 1.4 }),
      k.noise(d, t + 0.08, { type: 'highpass', f0: P(p, 5000), f1: P(p, 3000), q: 0.7, a: 0.05, d: 0.55, gain: 0.18 })
    ) },
  kn_crust: { levelDb: -16, priority: 2, maxVoices: 1, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'bandpass', f0: P(p, 360), f1: P(p, 200), q: 1.4, a: 0.08, d: 0.45, gain: 0.8 }),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'bandpass', f0: P(p, 2600), q: 1.2, d: 0.4, gain: 0.5, rate: 1.2 }),
      k.bell(d, t + 0.2, { f: P(p, 1760), ratio: 2.76, index: 0.8, d: 0.12, gain: 0.12 })
    ) },
  // THE BELLOWS IMP.
  kn_bpump: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 380), f1: P(p, 760), q: 1.6, a: 0.22, d: 0.12, gain: 0.75 }),
      k.noise(d, t + 0.4, { type: 'bandpass', f0: P(p, 460), f1: P(p, 980), q: 1.6, a: 0.22, d: 0.14, gain: 0.85 }),
      k.tone(d, t + 0.02, { type: 'sawtooth', f0: P(p, 150), f1: P(p, 190), a: 0.05, d: 0.18, gain: 0.12, filter: { f0: 900, q: 6 } }),
      k.tone(d, t + 0.42, { type: 'sawtooth', f0: P(p, 165), f1: P(p, 215), a: 0.05, d: 0.18, gain: 0.12, filter: { f0: 900, q: 6 } })
    ) },
  kn_fan: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 1100), f1: P(p, 450), q: 0.9, a: 0.03, hold: 0.12, d: 0.4, gain: 0.9 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 600, f1: 250, q: 0.8, a: 0.03, hold: 0.1, d: 0.35, gain: 0.6 }),
      k.noise(d, t + 0.04, { src: 'crackle', type: 'highpass', f0: P(p, 3500), q: 0.7, a: 0.02, hold: 0.1, d: 0.45, gain: 0.7, rate: 2.6 })
    ) },
  kn_bchoke: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 700), f1: P(p, 300), q: 1.4, a: 0.01, d: 0.1, gain: 0.8 }),
      k.noise(d, t + 0.12, { type: 'bandpass', f0: P(p, 600), f1: P(p, 260), q: 1.4, a: 0.01, d: 0.08, gain: 0.5 }),
      k.tone(d, t, { f0: P(p, 160), f1: P(p, 90), d: 0.1, gain: 0.35 }),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'bandpass', f0: P(p, 2000), q: 1, d: 0.2, gain: 0.3, rate: 0.9 })
    ) },
  // THE CINDER MOTH.
  kn_mkindle: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 2200), f1: P(p, 3600), q: 0.9, a: 0.45, d: 0.2, gain: 0.65, rate: 1.6 }),
      k.noise(d, t + 0.1, { src: 'brown', type: 'bandpass', f0: P(p, 300), f1: P(p, 700), q: 1.2, a: 0.4, d: 0.2, gain: 0.55 }),
      k.tone(d, t + 0.2, { type: 'triangle', f0: P(p, 620), f1: P(p, 880), a: 0.3, d: 0.15, gain: 0.06 })
    ) },
  kn_flare: { levelDb: -10, priority: 4, maxVoices: 2, cooldownMs: 100, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1600, f1: 300, q: 0.9, a: 0.02, d: 0.45, gain: 0.9 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 800), f1: P(p, 2400), q: 0.8, a: 0.03, d: 0.3, gain: 0.55 }),
      k.noise(d, t + 0.03, { src: 'crackle', type: 'highpass', f0: P(p, 3000), q: 0.7, d: 0.45, gain: 0.6, rate: 1.8 }),
      k.tone(d, t, { f0: P(p, 120), f1: P(p, 60), d: 0.2, gain: 0.35 })
    ) },
  kn_snuff: { levelDb: -15, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'lowpass', f0: 1400, f1: 300, q: 0.8, a: 0.01, d: 0.18, gain: 0.8 }),
      k.noise(d, t + 0.02, { type: 'highpass', f0: P(p, 4200), f1: P(p, 2400), q: 0.7, a: 0.02, d: 0.3, gain: 0.25 }),
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 80), d: 0.08, gain: 0.3 })
    ) },
  kn_relight: { levelDb: -17, priority: 2, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'highpass', f0: P(p, 2800), q: 0.7, a: 0.01, d: 0.12, gain: 0.6, rate: 2.2 }),
      k.noise(d, t + 0.04, { type: 'bandpass', f0: P(p, 500), f1: P(p, 1300), q: 1, a: 0.08, d: 0.22, gain: 0.6 })
    ) },
  // THE CINDER VENT.
  kn_vrumble: { levelDb: -12, priority: 3, maxVoices: 2, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 140), f1: P(p, 420), q: 1.4, a: 0.75, d: 0.25, gain: 0.95 }),
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 38), f1: P(p, 55), a: 0.7, d: 0.25, gain: 0.25, filter: { f0: 260, q: 2 } }),
      k.noise(d, t + 0.3, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), f1: P(p, 3200), q: 1, a: 0.5, d: 0.15, gain: 0.4, rate: 1.4 })
    ) },
  kn_erupt: { levelDb: -8, priority: 4, maxVoices: 2, cooldownMs: 300, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1800, f1: 260, q: 0.9, a: 0.02, hold: 0.2, d: 0.6, gain: 1 }),
      k.noise(d, t, { type: 'bandpass', f0: P(p, 600), f1: P(p, 1800), q: 0.8, a: 0.04, hold: 0.15, d: 0.45, gain: 0.6 }),
      k.noise(d, t + 0.05, { src: 'crackle', type: 'highpass', f0: P(p, 2600), q: 0.7, a: 0.03, hold: 0.2, d: 0.6, gain: 0.55, rate: 1.5 }),
      k.tone(d, t, { f0: P(p, 70), f1: P(p, 36), d: 0.5, gain: 0.6 })
    ) },
  kn_vcool: { levelDb: -18, priority: 2, maxVoices: 1, cooldownMs: 400, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'highpass', f0: P(p, 5200), f1: P(p, 2200), q: 0.7, a: 0.06, hold: 0.15, d: 0.7, gain: 0.7 }),
      k.noise(d, t + 0.1, { src: 'crackle', type: 'bandpass', f0: P(p, 2000), q: 1, d: 0.5, gain: 0.3, rate: 0.7 })
    ) },

  // THE COAL HURLER (content plan 5 slice 9).
  kn_hheave: { levelDb: -14, priority: 3, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: P(p, 110), f1: P(p, 150), glide: 0.4, a: 0.05, d: 0.25, gain: 0.3, filter: { f0: 700, q: 1.5 } }),
      ...[0.05, 0.16, 0.27].map((o) => k.noise(d, t + o, { src: 'crackle', type: 'bandpass', f0: P(p, 1400), q: 1.2, d: 0.1, gain: 0.4 })),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 500, q: 0.8, a: 0.1, d: 0.2, gain: 0.35 })
    ) },
  kn_hcoal: { levelDb: -8, priority: 4, maxVoices: 3, cooldownMs: 100, fn: (k, t, d, p) =>
    Math.max(
      k.tone(d, t, { f0: P(p, 90), f1: P(p, 40), d: 0.3, gain: 0.85 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1400, f1: 300, q: 0.8, d: 0.35, gain: 0.7 }),
      k.noise(d, t + 0.03, { src: 'crackle', type: 'highpass', f0: P(p, 2600), q: 0.8, a: 0.02, hold: 0.2, d: 0.4, gain: 0.5 })
    ) },
  kn_hfumble: { levelDb: -15, priority: 2, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, q: 0.8, d: 0.15, gain: 0.6 }),
      ...[0.06, 0.12, 0.2].map((o) => k.noise(d, t + o, { src: 'crackle', type: 'bandpass', f0: P(p, 1800), q: 1, d: 0.08, gain: 0.35 }))
    ) },
  // THE ASH WRAITH.
  kn_wgather: { levelDb: -15, priority: 3, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 600), f1: P(p, 1800), q: 1.5, a: 0.35, d: 0.15, gain: 0.55 }),
      k.tone(d, t + 0.1, { type: 'triangle', f0: P(p, 233), f1: P(p, 220), a: 0.25, d: 0.3, gain: 0.12 })
    ) },
  kn_wfade: { levelDb: -13, priority: 3, maxVoices: 2, cooldownMs: 150, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { type: 'bandpass', f0: P(p, 2400), f1: P(p, 500), q: 1.2, a: 0.02, d: 0.5, gain: 0.6 }),
      k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 600, q: 0.8, d: 0.3, gain: 0.3 })
    ) },
  kn_wrake: { levelDb: -9, priority: 4, maxVoices: 2, cooldownMs: 100, fn: (k, t, d, p) =>
    Math.max(
      ...[0, 0.05, 0.1].map((o, i) => k.noise(d, t + o, { type: 'bandpass', f0: P(p, [3800, 3200, 2600][i]), f1: P(p, 1200), q: 2, d: 0.12, gain: 0.55 })),
      k.noise(d, t, { src: 'crackle', type: 'highpass', f0: P(p, 2800), q: 0.8, d: 0.3, gain: 0.35 }),
      k.tone(d, t, { f0: P(p, 140), f1: P(p, 70), d: 0.2, gain: 0.4 })
    ) },
  kn_wrecover: { levelDb: -17, priority: 2, maxVoices: 2, cooldownMs: 200, fn: (k, t, d, p) =>
    Math.max(
      k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: P(p, 1600), f1: P(p, 2400), q: 1, a: 0.1, d: 0.25, gain: 0.45 }),
      k.tone(d, t, { type: 'triangle', f0: P(p, 466), f1: P(p, 440), a: 0.08, d: 0.3, gain: 0.1 })
    ) },
};

export const KILN_CUE_IDS = Object.freeze(Object.keys(CUES));

const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];

// Each creature's own wind-up, riding on the common telegraph tick. The
// tick sits where the telegraph is drawn (the target); the wind-up sits on
// the creature.
const WINDUP = { newt: 'kn_ncrouch', slag: 'kn_srear', bellows: 'kn_bpump', cindermoth: 'kn_mkindle', hurler: 'kn_hheave', ashwraith: 'kn_wgather' };

export function createKilnEventCues() {
  return {
    telegraph_start: (ev, h) => {
      const w = ev.id != null ? WINDUP[ev.etype] : null;
      return w ? [...one('telegraph', at(ev, h, ev.id)), ...one(w, at({}, h, ev.id))] : null;
    },
    newt_lunge: (ev, h) => one('kn_lunge', at(ev, h, ev.id)),
    newt_stop: (ev, h) => one('kn_nstop', at(ev, h, ev.id)),
    slag_slam: (ev, h) => one('kn_slam', at(ev, h, ev.id)),
    slag_crust: (ev, h) => one('kn_crust', at(ev, h, ev.id)),
    bellows_fan: (ev, h) => one('kn_fan', at({}, h, ev.id)),
    bellows_choke: (ev, h) => one('kn_bchoke', at(ev, h, ev.id)),
    cindermoth_flare: (ev, h) => one('kn_flare', at(ev, h, ev.id)),
    cindermoth_snuff: (ev, h) => one('kn_snuff', at(ev, h, ev.id)),
    cindermoth_relight: (ev, h) => one('kn_relight', at(ev, h, ev.id)),
    // The cinder vent; other hazards fall through to their own cues.
    hazard_telegraph: (ev, h) => (ev.htype === 'vent' ? one('kn_vrumble', at(ev, h, ev.id)) : null),
    hazard_resolve: (ev, h) => (ev.htype === 'vent' && ev.erupt ? one('kn_erupt', at(ev, h, ev.id)) : null),
    vent_cool: (ev, h) => one('kn_vcool', at(ev, h, ev.id)),
    hurler_coal: (ev, h) => one('kn_hcoal', at(ev, h, ev.id)),
    hurler_fumble: (ev, h) => one('kn_hfumble', at(ev, h, ev.id)),
    ashwraith_fade: (ev, h) => one('kn_wfade', at(ev, h, ev.id)),
    ashwraith_rake: (ev, h) => one('kn_wrake', at(ev, h, ev.id)),
    ashwraith_recover: (ev, h) => one('kn_wrecover', at(ev, h, ev.id)),
  };
}

// Wire into the audio engine (no engine, no cues, nothing else changes).
export function registerKilnCues(engine) {
  if (!engine || typeof engine.registerCue !== 'function') return 0;
  for (const [id, def] of Object.entries(CUES)) {
    const { fn, ...rest } = def;
    engine.registerCue(id, { slot: id, calDb: KILN_CUE_CAL[id] ?? 0, ...rest, voice: (ctx, t, dest, p) => fn(p.kit, t, dest, p) });
  }
  for (const [type, fn] of Object.entries(createKilnEventCues())) engine.registerEventCue(type, fn);
  return KILN_CUE_IDS.length;
}
