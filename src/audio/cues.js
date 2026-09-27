// SFX / UI cue library + the sim-event -> cue map (docs/gauntlet/PLAN.md §3.5
// "Sim-event -> cue map"). Owner: M3. M4a / M4b add cues for THEIR new
// events from their own files with engine.registerCue / registerEventCue.
//
// A cue: { bus, slot, priority, maxVoices, cooldownMs, levelDb, voice }
//   voice(ctx, t, dest, params) builds the one-shot at AudioContext time t
//   into `dest` (the engine's per-voice gain, then a panner when the cue is
//   spatial) and returns its absolute end time. params = { pitch, kit, x, z,
//   ...request }, kit = src/audio/voices.js primitives.
//   levelDb is the cue's PEAK target pre-bus (gain staging, PLAN §3.5: SFX
//   <= -6 dBFS, UI <= -12 dBFS). CUE_CAL holds each recipe's measured design
//   peak (tools/gntM3-probe.mjs calibrate), so the engine plays every cue at
//   exactly levelDb regardless of how loud its recipe happens to sum.
//   slot: the family name carried by the `sound` event ({ slot, cue }); the
//   four legacy slots (shoot / hit / kill / heal) keep their v0.4.63 names.
//   priority: boss 5 > telegraph 4 > kill 3 > hit 2 > ambience 1 (voice
//   stealing order, PLAN §3.5); UI cues 3 so a menu click is never stolen.

const P = (p, hz) => hz * (p.pitch || 1);

function recipe(fn) {
  return (ctx, t, dest, p) => fn(p.kit, t, dest, p);
}

// Measured design peaks (dBFS at unity gain, non-spatial) — written by
// `node tools/gntM3-probe.mjs calibrate`. A missing entry means 0 dB.
export const CUE_CAL = {
  // @cal begin
  ally_cast_archer: -3.9,
  ally_cast_sword: -7.3,
  ally_cast_tank: -1.1,
  aura: -1.6,
  azone_pulse: -3.6,
  azone_spawn: -2.8,
  bite: -12.3,
  bolt: -7.5,
  boss_death: 1.9,
  bounce: -2,
  bow: -2.5,
  break: -3.7,
  camp_return: -5.8,
  cast_aura: -0.4,
  cast_damage: -6.3,
  cast_heal: -2.4,
  cast_nova: -4,
  cast_zone: -2.3,
  crit: -2.2,
  dash_end: -13.1,
  deny: -4.3,
  deny_cd: -3,
  deny_empty: -5.2,
  detonate: 1,
  detonate_heal: -1.8,
  dodge: -9.2,
  downed: -2.8,
  draft_decline: -3.6,
  draft_take: -5.7,
  echo: -2.7,
  echo_tick: -3.1,
  fizzle: -3.4,
  glint: -8,
  heal: -5.9,
  heal_crit: -5.4,
  horn: -1.2,
  hurt: -1.2,
  impact: -4.7,
  kill: -3.4,
  mark: -4.6,
  node_grant: -7.1,
  path: -5.3,
  purchase: -5.8,
  quake_hit: 2.6,
  quake_warn: 1.3,
  rally: -2.3,
  revive: -7.7,
  revive_hum: -1.5,
  revive_snap: 1.8,
  reward: -8.9,
  roar: 1.2,
  room_clear: 0,
  room_start: -12.2,
  run_end: -1.8,
  run_start: -4.7,
  shimmer: -6,
  shoot: -2.2,
  shop_open: -3.1,
  siphon: -6.8,
  siphon_heal: -3.1,
  socket: -6,
  soft_fail: -3.4,
  sparkle: -7.6,
  spit: -6.5,
  swing: -6.1,
  telegraph: -3.9,
  telegraph_hit: -3.9,
  test_ambient: -3.5,
  test_music: -4,
  test_sfx: -3.6,
  test_ui: -6,
  trample: -1.4,
  ui_back: -3.1,
  ui_blip: -3.5,
  ui_confirm: -5.3,
  ui_deny: -5.2,
  ui_move: -2.5,
  ui_slider: -2.3,
  ui_tab: -4.4,
  ui_toggle: -6.2,
  unsocket: -6.1,
  wave_start: -5.1,
  waystone: -2.6,
  whiff: -7.9,
  whoosh: -8.8,
  zone_pulse: -3.8,
  zone_spawn: -3.5,
  // @cal end
};

const C = {};
function cue(id, def, fn) {
  C[id] = { bus: 'sfx', slot: id, priority: 2, maxVoices: 6, cooldownMs: 30, levelDb: -12, ...def, voice: recipe(fn) };
}

// ------------------------------------------------------------------ SFX --
// Healer basic bolt (legacy slot `shoot`).
cue('shoot', { slot: 'shoot', levelDb: -11, maxVoices: 4 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'triangle', f0: P(p, 880), f1: P(p, 420), d: 0.09, gain: 0.6 }),
    k.noise(d, t, { f0: 2600, q: 1.4, d: 0.05, gain: 0.5 })
  )
);
// Melee arc (swordsman / tank basic): an airy whoosh with a low thump.
cue('swing', { slot: 'swing', levelDb: -10, maxVoices: 4 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 700), f1: P(p, 2600), q: 1.2, a: 0.02, d: 0.13, gain: 1 }),
    k.tone(d, t + 0.03, { f0: P(p, 150), f1: P(p, 70), d: 0.07, gain: 0.45 })
  )
);
// Bow (archer basic): string twang + fletching hiss.
cue('bow', { slot: 'bow', levelDb: -11, maxVoices: 4 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'triangle', f0: P(p, 420), f1: P(p, 180), d: 0.12, gain: 0.55 }),
    k.noise(d, t, { type: 'highpass', f0: 3000, q: 0.7, d: 0.05, gain: 0.35 })
  )
);
// Enemy shot (mantis spit): a wet burst.
cue('spit', { slot: 'spit', levelDb: -9, maxVoices: 4 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 1100), f1: P(p, 500), q: 2, d: 0.12, gain: 1 }),
    k.tone(d, t, { type: 'square', f0: P(p, 330), f1: P(p, 160), d: 0.08, gain: 0.22 })
  )
);
cue('bite', { slot: 'bite', levelDb: -10, maxVoices: 3 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 650), q: 1.5, d: 0.05, gain: 1 }),
    k.noise(d, t + 0.07, { f0: P(p, 520), q: 1.5, d: 0.06, gain: 0.9 })
  )
);
// Impact on a hostile (legacy slot `hit`).
cue('impact', { slot: 'hit', levelDb: -8 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 1700), q: 1, d: 0.07, gain: 1 }),
    k.tone(d, t, { type: 'square', f0: P(p, 240), f1: P(p, 150), d: 0.05, gain: 0.35 })
  )
);
// Crit accent layered on top of an impact / heal.
cue('crit', { slot: 'hit', levelDb: -13, maxVoices: 3 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 1900), f1: P(p, 1300), d: 0.1, gain: 0.6 }),
    k.tone(d, t, { type: 'triangle', f0: P(p, 2850), d: 0.05, gain: 0.25 })
  )
);
// A party member takes damage: a body thud — the most important feedback.
cue('hurt', { slot: 'hit', levelDb: -6, priority: 3, maxVoices: 3, cooldownMs: 60 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 190), f1: P(p, 85), d: 0.13, gain: 0.85 }),
    k.noise(d, t, { type: 'lowpass', f0: 900, q: 0.8, d: 0.09, gain: 0.6 })
  )
);
cue('whiff', { slot: 'whiff', levelDb: -17, maxVoices: 3 }, (k, t, d) =>
  k.noise(d, t, { f0: 3500, f1: 1700, q: 3, a: 0.01, d: 0.11, gain: 1 })
);
// Kill pop (legacy slot `kill`).
cue('kill', { slot: 'kill', levelDb: -7, priority: 3, maxVoices: 4 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'square', f0: P(p, 210), f1: P(p, 58), d: 0.17, gain: 0.55, filter: { f0: 2400, q: 0.7 } }),
    k.noise(d, t, { f0: 900, q: 0.8, d: 0.14, gain: 0.5 })
  )
);
cue('boss_death', { slot: 'kill', levelDb: -6, priority: 5, maxVoices: 1, cooldownMs: 500 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 95), f1: P(p, 30), d: 1.6, gain: 1 }),
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 700, f1: 90, q: 0.7, d: 1.3, gain: 0.8 }),
    k.noise(d, t + 0.1, { f0: 5200, f1: 2600, q: 5, a: 0.2, d: 1.2, gain: 0.25 }),
    k.bell(d, t + 0.05, { f: P(p, 220), ratio: 1.5, index: 1.5, d: 2.2, gain: 0.3 })
  )
);
// Heal chime, soft major (legacy slot `heal`); crit adds the fifth + octave.
cue('heal', { slot: 'heal', levelDb: -10, maxVoices: 4 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 523.25), a: 0.004, d: 0.22, gain: 0.5 }),
    k.tone(d, t + 0.04, { f0: P(p, 659.25), a: 0.004, d: 0.22, gain: 0.42 })
  )
);
cue('heal_crit', { slot: 'heal', levelDb: -10, maxVoices: 3 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 523.25), a: 0.004, d: 0.26, gain: 0.45 }),
    k.tone(d, t + 0.035, { f0: P(p, 659.25), a: 0.004, d: 0.26, gain: 0.4 }),
    k.tone(d, t + 0.07, { f0: P(p, 783.99), a: 0.004, d: 0.3, gain: 0.35 }),
    k.tone(d, t + 0.1, { f0: P(p, 1046.5), a: 0.004, d: 0.32, gain: 0.25 })
  )
);
cue('sparkle', { slot: 'sparkle', levelDb: -15, maxVoices: 2, cooldownMs: 80 }, (k, t, d, p) =>
  Math.max(...[1046.5, 1318.5, 1568, 2093].map((f, i) => k.tone(d, t + i * 0.03, { f0: P(p, f), d: 0.18, gain: 0.3 })))
);
cue('aura', { slot: 'pulse', levelDb: -19, priority: 1, maxVoices: 2, cooldownMs: 120 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 392), a: 0.05, d: 0.35, gain: 0.6 }),
    k.tone(d, t, { f0: P(p, 588), a: 0.06, d: 0.3, gain: 0.3 })
  )
);
cue('zone_pulse', { slot: 'pulse', levelDb: -18, priority: 1, maxVoices: 3, cooldownMs: 90 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 330), a: 0.02, d: 0.32, gain: 0.55 }),
    k.tone(d, t + 0.02, { f0: P(p, 495), a: 0.02, d: 0.28, gain: 0.35 })
  )
);
cue('azone_pulse', { slot: 'pulse', levelDb: -16, priority: 1, maxVoices: 3, cooldownMs: 90 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 420, q: 0.7, d: 0.14, gain: 1 }),
    k.tone(d, t, { f0: P(p, 110), f1: P(p, 80), d: 0.13, gain: 0.5 })
  )
);
// Healer skill casts, one family each (PLAN §3.5 "per skill family").
cue('cast_heal', { slot: 'cast', levelDb: -10, maxVoices: 3 }, (k, t, d, p) =>
  Math.max(
    k.pluck(d, t, { f: P(p, 587.3), d: 0.35, gain: 0.55, bright: 4200 }),
    k.pluck(d, t + 0.055, { f: P(p, 880), d: 0.4, gain: 0.5, bright: 4200 }),
    k.noise(d, t, { f0: 5000, q: 2, a: 0.02, d: 0.15, gain: 0.12 })
  )
);
cue('cast_damage', { slot: 'cast', levelDb: -10, maxVoices: 3 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 660), f1: P(p, 1320), d: 0.12, gain: 0.45, filter: { f0: 3000, q: 1 } }),
    k.noise(d, t, { f0: 2200, q: 1.5, d: 0.06, gain: 0.4 })
  )
);
cue('cast_zone', { slot: 'zone', levelDb: -11, maxVoices: 2, cooldownMs: 120 }, (k, t, d, p) =>
  Math.max(
    k.bell(d, t, { f: P(p, 294), ratio: 2, index: 1.2, d: 0.9, gain: 0.6 }),
    k.bell(d, t + 0.03, { f: P(p, 588), ratio: 2.76, index: 0.8, d: 0.7, gain: 0.3 })
  )
);
cue('cast_nova', { slot: 'nova', levelDb: -10, maxVoices: 2, cooldownMs: 120 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: 400, f1: 3200, q: 1.1, a: 0.12, d: 0.28, gain: 0.8 }),
    k.tone(d, t, { f0: P(p, 440), f1: P(p, 880), a: 0.08, d: 0.3, gain: 0.4 })
  )
);
cue('cast_aura', { slot: 'cast', levelDb: -14, maxVoices: 2, cooldownMs: 200 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 220), a: 0.18, d: 0.5, gain: 0.5 }),
    k.tone(d, t, { f0: P(p, 330), a: 0.2, d: 0.45, gain: 0.35 }),
    k.tone(d, t, { f0: P(p, 440), a: 0.22, d: 0.4, gain: 0.2 })
  )
);
// Ally kit casts (by class).
cue('ally_cast_tank', { slot: 'cast', levelDb: -8, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 130), f1: P(p, 55), d: 0.18, gain: 0.9 }),
    k.noise(d, t, { type: 'lowpass', f0: 800, q: 0.8, d: 0.11, gain: 0.6 })
  )
);
cue('ally_cast_sword', { slot: 'cast', levelDb: -9, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 900), f1: P(p, 3000), q: 1.3, a: 0.015, d: 0.1, gain: 0.9 }),
    k.noise(d, t + 0.09, { f0: P(p, 1100), f1: P(p, 3400), q: 1.3, a: 0.015, d: 0.1, gain: 0.8 }),
    k.tone(d, t + 0.1, { type: 'triangle', f0: P(p, 1800), f1: P(p, 1500), d: 0.12, gain: 0.2 })
  )
);
cue('ally_cast_archer', { slot: 'cast', levelDb: -10, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    ...[0, 0.05, 0.1].map((o, i) =>
      k.tone(d, t + o, { type: 'triangle', f0: P(p, 440 + i * 30), f1: P(p, 190), d: 0.1, gain: 0.45 })
    ),
    k.noise(d, t, { type: 'highpass', f0: 3500, q: 0.7, d: 0.16, gain: 0.25 })
  )
);
// PARTY (BUILD_BRIEF §25.2): one procedural cue per new class skill, in its
// class's family (the Tank's low thud, the Swordsman's swish, the Archer's
// string); SFX bus, cast slot, <= 2 voices. Passive pulses <= -24 dB, 1 voice,
// and only when the pulse does something (the event map below).
// Tank: Taunting Roar — a low growl over a frame drum.
cue('tank_roar', { slot: 'cast', levelDb: -8, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: P(p, 420), q: 0.9, a: 0.04, hold: 0.18, d: 0.3, gain: 1 }),
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 95), f1: P(p, 70), a: 0.05, d: 0.45, gain: 0.35 }),
    k.tone(d, t + 0.02, { f0: P(p, 110), f1: P(p, 48), d: 0.2, gain: 0.8 })
  )
);
// Tank: Shield Wall — a wood knock and a soft bell.
cue('tank_shield', { slot: 'cast', levelDb: -9, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { type: 'bandpass', f0: P(p, 900), q: 3, d: 0.06, gain: 0.9 }),
    k.bell(d, t + 0.03, { f: P(p, 523), ratio: 2.4, index: 0.8, d: 0.6, gain: 0.35 })
  )
);
// Tank: Shoulder Charge — a whoosh into a thud.
cue('tank_charge', { slot: 'cast', levelDb: -8, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 500), f1: P(p, 1800), q: 1, a: 0.08, d: 0.18, gain: 0.7 }),
    k.tone(d, t + 0.2, { f0: P(p, 120), f1: P(p, 45), d: 0.2, gain: 1 })
  )
);
// Tank: Iron Stance — a soft low hum (only when a shield grows).
cue('tank_stance', { slot: 'aura', levelDb: -26, maxVoices: 1, cooldownMs: 400 }, (k, t, d, p) =>
  k.tone(d, t, { f0: P(p, 110), a: 0.12, d: 0.4, gain: 0.6 })
);
// Swordsman: Fox Step — a swish with a blade ring.
cue('sword_step', { slot: 'cast', levelDb: -9, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 1200), f1: P(p, 4200), q: 1.4, a: 0.01, d: 0.12, gain: 0.9 }),
    k.tone(d, t + 0.1, { type: 'triangle', f0: P(p, 2400), f1: P(p, 2200), d: 0.25, gain: 0.25 })
  )
);
// Swordsman: Crescent Finisher — a ring sweep (+3 semitones per combo stack).
cue('sword_finisher', { slot: 'cast', levelDb: -8, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: P(p, 600), f1: P(p, 3600), q: 1.1, a: 0.02, d: 0.22, gain: 0.9 }),
    k.tone(d, t + 0.05, { type: 'triangle', f0: P(p, 880), f1: P(p, 1320), d: 0.3, gain: 0.35 })
  )
);
// Swordsman: Riposte — a bell tink and a slash.
cue('sword_parry', { slot: 'cast', levelDb: -9, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.bell(d, t, { f: P(p, 1568), ratio: 3.1, index: 1.2, d: 0.35, gain: 0.45 }),
    k.noise(d, t + 0.04, { f0: P(p, 1500), f1: P(p, 4800), q: 1.3, a: 0.01, d: 0.09, gain: 0.7 })
  )
);
// Swordsman: Razor Wake — a soft whirr (only on a hit).
cue('sword_wake', { slot: 'aura', levelDb: -26, maxVoices: 1, cooldownMs: 400 }, (k, t, d, p) =>
  k.noise(d, t, { f0: P(p, 1800), f1: P(p, 2600), q: 2, a: 0.03, d: 0.14, gain: 0.8 })
);
// Archer: Vault Shot — a cloth flap and a twang.
cue('archer_vault', { slot: 'cast', levelDb: -9, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { type: 'lowpass', f0: P(p, 900), q: 0.8, a: 0.03, d: 0.12, gain: 0.8 }),
    k.tone(d, t + 0.15, { type: 'triangle', f0: P(p, 520), f1: P(p, 210), d: 0.14, gain: 0.5 })
  )
);
// Archer: Pinning Arrow — a heavy twang and a thunk.
cue('archer_pin', { slot: 'cast', levelDb: -9, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'triangle', f0: P(p, 330), f1: P(p, 140), d: 0.16, gain: 0.6 }),
    k.tone(d, t + 0.12, { f0: P(p, 180), f1: P(p, 70), d: 0.1, gain: 0.7 })
  )
);
// Archer: Rain of Arrows — rising whistles.
cue('archer_rain', { slot: 'cast', levelDb: -10, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    ...[0, 0.06, 0.12, 0.18].map((o, i) => k.tone(d, t + o, { type: 'sine', f0: P(p, 900 + i * 120), f1: P(p, 1800 + i * 160), d: 0.2, gain: 0.25 })),
    k.noise(d, t, { type: 'highpass', f0: 3000, q: 0.7, d: 0.3, gain: 0.2 })
  )
);
// Archer: Kestrel Watch — a tiny chirp and a hiss (only on a hit).
cue('archer_kestrel', { slot: 'aura', levelDb: -25, maxVoices: 1, cooldownMs: 400 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'sine', f0: P(p, 2600), f1: P(p, 3400), d: 0.06, gain: 0.5 }),
    k.noise(d, t + 0.04, { type: 'highpass', f0: 3800, q: 0.8, d: 0.08, gain: 0.4 })
  )
);
cue('bolt', { slot: 'cast', levelDb: -21, priority: 1, maxVoices: 3, cooldownMs: 50 }, (k, t, d) =>
  k.noise(d, t, { f0: 1800, f1: 2600, q: 1.5, a: 0.01, d: 0.07, gain: 1 })
);
cue('zone_spawn', { slot: 'zone', levelDb: -13, maxVoices: 2, cooldownMs: 100 }, (k, t, d, p) =>
  Math.max(
    k.bell(d, t, { f: P(p, 196), ratio: 2, index: 1, d: 0.8, gain: 0.6 }),
    k.tone(d, t, { f0: P(p, 392), a: 0.05, d: 0.6, gain: 0.3 })
  )
);
cue('azone_spawn', { slot: 'zone', levelDb: -12, maxVoices: 2, cooldownMs: 100 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 320, q: 0.8, a: 0.03, d: 0.4, gain: 1 }),
    k.tone(d, t, { f0: P(p, 82), f1: P(p, 60), d: 0.35, gain: 0.5 })
  )
);
// Techniques (nodes §15.3).
cue('echo', { slot: 'technique', levelDb: -13, maxVoices: 3 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 880), a: 0.12, d: 0.12, gain: 0.5 }),
    k.tone(d, t + 0.02, { f0: P(p, 1320), a: 0.13, d: 0.1, gain: 0.3 }),
    k.noise(d, t, { f0: 4000, q: 4, a: 0.1, d: 0.1, gain: 0.15 })
  )
);
cue('bounce', { slot: 'technique', levelDb: -15, maxVoices: 4, cooldownMs: 40 }, (k, t, d, p) =>
  k.tone(d, t, { f0: P(p, 1200), f1: P(p, 1500), d: 0.09, gain: 0.8 })
);
cue('siphon', { slot: 'technique', levelDb: -14, maxVoices: 2, cooldownMs: 80 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 110), f1: P(p, 140), a: 0.03, d: 0.25, gain: 0.6, filter: { f0: 450, q: 2 } }),
    k.tone(d, t, { f0: P(p, 220), f1: P(p, 280), a: 0.03, d: 0.22, gain: 0.3 })
  )
);
cue('siphon_heal', { slot: 'technique', levelDb: -15, maxVoices: 2, cooldownMs: 80 }, (k, t, d, p) =>
  k.tone(d, t, { f0: P(p, 660), f1: P(p, 990), d: 0.16, gain: 0.7 })
);
cue('fizzle', { slot: 'technique', levelDb: -16, maxVoices: 2, cooldownMs: 100 }, (k, t, d, p) =>
  k.tone(d, t, { type: 'square', f0: P(p, 200), f1: P(p, 110), d: 0.11, gain: 0.6, filter: { f0: 900, q: 0.7 } })
);
cue('detonate', { slot: 'technique', levelDb: -8, priority: 3, maxVoices: 2, cooldownMs: 60 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1500, f1: 180, q: 0.7, d: 0.4, gain: 1 }),
    k.tone(d, t, { f0: P(p, 75), f1: P(p, 38), d: 0.38, gain: 0.8 })
  )
);
cue('detonate_heal', { slot: 'technique', levelDb: -11, maxVoices: 2, cooldownMs: 60 }, (k, t, d, p) =>
  Math.max(...[392, 494, 587, 784].map((f, i) => k.tone(d, t + i * 0.012, { f0: P(p, f), a: 0.03, d: 0.4, gain: 0.3 })))
);
// Movement / input.
cue('dodge', { slot: 'whoosh', levelDb: -12, maxVoices: 2, cooldownMs: 60 }, (k, t, d, p) =>
  k.noise(d, t, { f0: P(p, 500), f1: P(p, 2100), q: 0.8, a: 0.03, d: 0.14, gain: 1 })
);
cue('dash_end', { slot: 'whoosh', levelDb: -21, priority: 1, maxVoices: 2 }, (k, t, d) =>
  k.noise(d, t, { type: 'lowpass', f0: 520, q: 0.7, d: 0.05, gain: 1 })
);
// Denials: an empty slot is a clear blip; on-cooldown is quieter (§17).
cue('deny_empty', { slot: 'blip', levelDb: -14, maxVoices: 2, cooldownMs: 80 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'square', f0: P(p, 185), d: 0.06, gain: 0.5, filter: { f0: 1400, q: 0.7 } }),
    k.tone(d, t + 0.08, { type: 'square', f0: P(p, 165), d: 0.07, gain: 0.5, filter: { f0: 1400, q: 0.7 } })
  )
);
cue('deny_cd', { slot: 'blip', levelDb: -20, maxVoices: 2, cooldownMs: 80 }, (k, t, d, p) =>
  k.tone(d, t, { f0: P(p, 240), d: 0.05, gain: 0.8 })
);
// Telegraphs and the boss.
cue('telegraph', { slot: 'warning', levelDb: -7, priority: 4, maxVoices: 4, cooldownMs: 40 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 1500), d: 0.025, gain: 0.6 }),
    k.noise(d, t, { f0: 2500, q: 3, d: 0.025, gain: 0.5 }),
    k.tone(d, t + 0.09, { f0: P(p, 1500), d: 0.025, gain: 0.6 }),
    k.noise(d, t + 0.09, { f0: 2500, q: 3, d: 0.025, gain: 0.5 })
  )
);
cue('telegraph_hit', { slot: 'impact', levelDb: -13, priority: 4, maxVoices: 4 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: 800, q: 1, d: 0.07, gain: 0.8 }),
    k.tone(d, t, { f0: P(p, 210), f1: P(p, 120), d: 0.08, gain: 0.5 })
  )
);
cue('quake_warn', { slot: 'rumble', levelDb: -8, priority: 5, maxVoices: 1, cooldownMs: 300 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 48), f1: P(p, 62), a: 0.5, d: 0.35, gain: 0.8 }),
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 180, f1: 320, q: 0.7, a: 0.55, d: 0.3, gain: 1 })
  )
);
cue('quake_hit', { slot: 'impact', levelDb: -6, priority: 5, maxVoices: 2, cooldownMs: 120 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 85), f1: P(p, 34), d: 0.6, gain: 1 }),
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 1600, f1: 150, q: 0.7, d: 0.5, gain: 0.9 })
  )
);
cue('trample', { slot: 'impact', levelDb: -7, priority: 5, maxVoices: 1, cooldownMs: 250 }, (k, t, d, p) =>
  Math.max(
    ...[0, 0.12, 0.24].map((o) =>
      Math.max(
        k.tone(d, t + o, { f0: P(p, 95), f1: P(p, 45), d: 0.16, gain: 0.8 }),
        k.noise(d, t + o, { src: 'brown', type: 'lowpass', f0: 500, q: 0.7, d: 0.1, gain: 0.7 })
      )
    )
  )
);
cue('horn', { slot: 'horn', levelDb: -9, priority: 5, maxVoices: 1, cooldownMs: 400 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 147), a: 0.15, hold: 0.35, d: 0.45, gain: 0.5, filter: { f0: 500, f1: 1100, q: 1 } }),
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 220), a: 0.18, hold: 0.3, d: 0.45, gain: 0.35, filter: { f0: 500, f1: 1100, q: 1 } })
  )
);
cue('roar', { slot: 'roar', levelDb: -6, priority: 5, maxVoices: 1, cooldownMs: 800 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 72), f1: P(p, 52), a: 0.12, hold: 0.5, d: 0.8, gain: 0.7, filter: { f0: 700, f1: 380, q: 3 } }),
    k.noise(d, t, { f0: 420, f1: 260, q: 2, a: 0.1, hold: 0.4, d: 0.8, gain: 0.7 }),
    k.noise(d, t + 0.05, { src: 'brown', type: 'lowpass', f0: 240, q: 0.7, a: 0.2, d: 1.1, gain: 0.6 })
  )
);
// Enemy spawn telegraph: the corruption's violet shimmer.
cue('shimmer', { slot: 'shimmer', levelDb: -17, priority: 3, maxVoices: 3, cooldownMs: 60 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: 3000, f1: 6200, q: 6, a: 0.2, d: 0.35, gain: 0.8 }),
    k.tone(d, t, { f0: P(p, 1760), f1: P(p, 2350), a: 0.2, d: 0.3, gain: 0.25 })
  )
);
// Downed / revive / party commands.
cue('downed', { slot: 'thud', levelDb: -8, priority: 3, maxVoices: 2, cooldownMs: 80 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 110), f1: P(p, 48), d: 0.3, gain: 0.8 }),
    k.tone(d, t + 0.05, { type: 'triangle', f0: P(p, 440), f1: P(p, 220), d: 0.38, gain: 0.35 })
  )
);
cue('revive_hum', { slot: 'hum', levelDb: -17, priority: 2, maxVoices: 2, cooldownMs: 200 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 220), a: 0.3, hold: 0.2, d: 0.35, gain: 0.5 }),
    k.tone(d, t, { f0: P(p, 330), a: 0.35, hold: 0.15, d: 0.35, gain: 0.35 })
  )
);
cue('revive', { slot: 'chime', levelDb: -10, priority: 3, maxVoices: 2, cooldownMs: 80 }, (k, t, d, p) =>
  Math.max(...[523.25, 659.25, 783.99, 1046.5].map((f, i) => k.tone(d, t + i * 0.08, { f0: P(p, f), d: 0.35, gain: 0.35 })))
);
cue('revive_snap', { slot: 'snap', levelDb: -13, priority: 3, maxVoices: 2 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { type: 'highpass', f0: 2500, q: 0.7, d: 0.03, gain: 0.8 }),
    k.tone(d, t, { type: 'square', f0: P(p, 400), f1: P(p, 190), d: 0.07, gain: 0.3, filter: { f0: 1600 } })
  )
);
cue('rally', { slot: 'horn', levelDb: -12, maxVoices: 1, cooldownMs: 200 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 294), a: 0.04, hold: 0.12, d: 0.2, gain: 0.45, filter: { f0: 1300, q: 1 } }),
    k.tone(d, t + 0.02, { type: 'sawtooth', f0: P(p, 440), a: 0.04, hold: 0.1, d: 0.2, gain: 0.3, filter: { f0: 1300, q: 1 } })
  )
);
cue('mark', { slot: 'tick', levelDb: -16, maxVoices: 2, cooldownMs: 60 }, (k, t, d, p) =>
  Math.max(k.tone(d, t, { f0: P(p, 1200), d: 0.035, gain: 0.6 }), k.tone(d, t + 0.04, { f0: P(p, 1800), d: 0.035, gain: 0.45 }))
);
cue('break', { slot: 'impact', levelDb: -10, priority: 3, maxVoices: 3 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: 1200, q: 1.2, d: 0.08, gain: 0.9 }),
    k.noise(d, t + 0.03, { f0: 600, q: 1, d: 0.12, gain: 0.6 }),
    k.tone(d, t, { f0: P(p, 180), f1: P(p, 90), d: 0.1, gain: 0.4 })
  )
);
cue('waystone', { slot: 'thud', levelDb: -12, maxVoices: 1 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { f0: P(p, 100), f1: P(p, 60), d: 0.3, gain: 0.8 }),
    k.bell(d, t + 0.02, { f: P(p, 392), ratio: 3.1, index: 0.8, d: 0.8, gain: 0.25 })
  )
);
cue('whoosh', { slot: 'whoosh', levelDb: -17, maxVoices: 2, cooldownMs: 120 }, (k, t, d, p) =>
  k.noise(d, t, { f0: P(p, 400), f1: P(p, 1400), q: 0.8, a: 0.08, d: 0.2, gain: 1 })
);
cue('echo_tick', { slot: 'technique', levelDb: -20, priority: 1, maxVoices: 2 }, (k, t, d, p) =>
  k.tone(d, t, { f0: P(p, 1760), a: 0.02, d: 0.08, gain: 0.7 })
);
cue('soft_fail', { slot: 'warning', levelDb: -11, priority: 4, maxVoices: 1, cooldownMs: 400 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'triangle', f0: P(p, 330), f1: P(p, 196), a: 0.02, d: 0.6, gain: 0.6 }),
    k.tone(d, t + 0.02, { type: 'triangle', f0: P(p, 311), f1: P(p, 185), a: 0.02, d: 0.6, gain: 0.4 })
  )
);

// ------------------------------------------------ UI / progression (UI bus) --
function ui(id, def, fn) {
  cue(id, { bus: 'ui', slot: 'ui', priority: 3, maxVoices: 3, cooldownMs: 25, levelDb: -14, ...def }, fn);
}
ui('ui_move', { levelDb: -16 }, (k, t, d, p) =>
  Math.max(k.tone(d, t, { f0: P(p, 1400), d: 0.02, gain: 0.6 }), k.noise(d, t, { type: 'highpass', f0: 5000, d: 0.012, gain: 0.25 }))
);
ui('ui_confirm', { levelDb: -12 }, (k, t, d, p) =>
  Math.max(k.tone(d, t, { f0: P(p, 880), f1: P(p, 1320), d: 0.07, gain: 0.55 }), k.tone(d, t + 0.03, { f0: P(p, 1760), d: 0.08, gain: 0.3 }))
);
ui('ui_back', { levelDb: -14 }, (k, t, d, p) => k.tone(d, t, { f0: P(p, 660), f1: P(p, 440), d: 0.08, gain: 0.7 }));
ui('ui_tab', { levelDb: -14 }, (k, t, d, p) =>
  Math.max(k.noise(d, t, { f0: 2000, q: 1.2, d: 0.035, gain: 0.5 }), k.tone(d, t, { f0: P(p, 990), d: 0.035, gain: 0.45 }))
);
ui('ui_slider', { levelDb: -16, cooldownMs: 40 }, (k, t, d, p) => k.tone(d, t, { f0: P(p, 700), d: 0.025, gain: 0.8 }));
ui('ui_toggle', { levelDb: -14 }, (k, t, d, p) =>
  Math.max(k.tone(d, t, { f0: P(p, 1200), d: 0.02, gain: 0.5 }), k.tone(d, t + 0.05, { f0: P(p, 1600), d: 0.025, gain: 0.5 }))
);
ui('ui_deny', { levelDb: -15 }, (k, t, d, p) =>
  k.tone(d, t, { type: 'square', f0: P(p, 160), d: 0.1, gain: 0.5, filter: { f0: 1200, q: 0.7 } })
);
ui('room_start', { slot: 'progress', levelDb: -16 }, (k, t, d) =>
  Math.max(...[0, 0.06, 0.12, 0.18].map((o, i) => k.noise(d, t + o, { type: 'lowpass', f0: 600 + i * 150, q: 0.8, d: 0.05, gain: 0.4 + i * 0.15 })))
);
ui('wave_start', { slot: 'progress', levelDb: -14 }, (k, t, d, p) =>
  Math.max(
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 196), a: 0.02, d: 0.35, gain: 0.45, filter: { f0: 1200, q: 1 } }),
    k.tone(d, t, { type: 'sawtooth', f0: P(p, 294), a: 0.02, d: 0.3, gain: 0.3, filter: { f0: 1200, q: 1 } })
  )
);
ui('room_clear', { slot: 'progress', levelDb: -12, cooldownMs: 300 }, (k, t, d, p) =>
  Math.max(...[293.66, 369.99, 440, 587.33].map((f, i) => k.pluck(d, t + i * 0.05, { f: P(p, f), d: 1.0, gain: 0.35, bright: 3600 })))
);
ui('reward', { slot: 'progress', levelDb: -14, cooldownMs: 200 }, (k, t, d, p) =>
  Math.max(...[1174.7, 1568, 1760, 2349.3].map((f, i) => k.tone(d, t + i * 0.045, { f0: P(p, f), d: 0.2, gain: 0.3 })))
);
ui('draft_take', { slot: 'progress', levelDb: -12 }, (k, t, d, p) =>
  Math.max(k.bell(d, t, { f: P(p, 784), ratio: 2, index: 0.8, d: 0.4, gain: 0.5 }), k.bell(d, t + 0.05, { f: P(p, 1175), ratio: 2, index: 0.6, d: 0.45, gain: 0.35 }))
);
ui('draft_decline', { slot: 'progress', levelDb: -16 }, (k, t, d, p) => k.tone(d, t, { type: 'triangle', f0: P(p, 440), f1: P(p, 330), d: 0.13, gain: 0.7 }));
ui('path', { slot: 'progress', levelDb: -13 }, (k, t, d, p) =>
  Math.max(k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 320, q: 0.8, d: 0.12, gain: 0.8 }), k.tone(d, t, { f0: P(p, 150), f1: P(p, 90), d: 0.13, gain: 0.5 }))
);
ui('shop_open', { slot: 'progress', levelDb: -13 }, (k, t, d, p) => k.bell(d, t, { f: P(p, 880), ratio: 3.01, index: 1.2, d: 0.7, gain: 0.7 }));
ui('purchase', { slot: 'progress', levelDb: -11 }, (k, t, d, p) =>
  Math.max(
    ...[2093, 2637, 3136].map((f, i) => k.tone(d, t + i * 0.04, { f0: P(p, f), d: 0.1, gain: 0.3 })),
    k.noise(d, t, { type: 'highpass', f0: 6000, q: 0.7, d: 0.12, gain: 0.2 })
  )
);
ui('deny', { slot: 'progress', levelDb: -14 }, (k, t, d, p) =>
  k.tone(d, t, { type: 'square', f0: P(p, 150), d: 0.13, gain: 0.55, filter: { f0: 1200, q: 0.7 } })
);
ui('glint', { slot: 'progress', levelDb: -16 }, (k, t, d, p) =>
  Math.max(k.tone(d, t, { f0: P(p, 1568), d: 0.06, gain: 0.4 }), k.tone(d, t + 0.05, { f0: P(p, 2093), d: 0.08, gain: 0.35 }))
);
ui('socket', { slot: 'progress', levelDb: -12 }, (k, t, d, p) =>
  Math.max(k.noise(d, t, { f0: 3000, q: 2, d: 0.015, gain: 0.6 }), k.tone(d, t + 0.01, { f0: P(p, 660), f1: P(p, 880), d: 0.07, gain: 0.5 }))
);
ui('unsocket', { slot: 'progress', levelDb: -16 }, (k, t, d, p) =>
  Math.max(k.noise(d, t, { f0: 2400, q: 2, d: 0.015, gain: 0.6 }), k.tone(d, t + 0.01, { f0: P(p, 880), f1: P(p, 620), d: 0.07, gain: 0.5 }))
);
ui('node_grant', { slot: 'progress', levelDb: -14 }, (k, t, d, p) =>
  Math.max(k.tone(d, t, { f0: P(p, 1046.5), d: 0.12, gain: 0.45 }), k.tone(d, t + 0.06, { f0: P(p, 1318.5), d: 0.15, gain: 0.4 }))
);
ui('run_start', { slot: 'progress', levelDb: -10, cooldownMs: 500 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: 300, f1: 1500, q: 0.9, a: 0.3, d: 0.5, gain: 0.7 }),
    ...[293.66, 440, 587.33].map((f, i) => k.tone(d, t + 0.3 + i * 0.02, { f0: P(p, f), a: 0.03, d: 0.7, gain: 0.22 }))
  )
);
ui('run_end', { slot: 'progress', levelDb: -12, cooldownMs: 500 }, (k, t, d, p) =>
  Math.max(k.bell(d, t, { f: P(p, 196), ratio: 2, index: 1.5, d: 1.4, gain: 0.6 }), k.bell(d, t, { f: P(p, 392), ratio: 2.76, index: 0.7, d: 1.0, gain: 0.25 }))
);
ui('camp_return', { slot: 'progress', levelDb: -16, cooldownMs: 300 }, (k, t, d, p) =>
  k.noise(d, t, { f0: P(p, 1400), f1: P(p, 380), q: 0.8, a: 0.05, d: 0.3, gain: 1 })
);
ui('ui_blip', { levelDb: -18 }, (k, t, d, p) => k.tone(d, t, { f0: P(p, 1046.5), d: 0.04, gain: 0.7 }));

// Channel test phrases (Audio tab "Test"), one per bus.
cue('test_sfx', { slot: 'test', levelDb: -8, priority: 3, maxVoices: 3, cooldownMs: 0 }, (k, t, d, p) =>
  Math.max(
    k.noise(d, t, { f0: 1700, q: 1, d: 0.07, gain: 1 }),
    k.tone(d, t, { type: 'square', f0: P(p, 240), f1: P(p, 150), d: 0.05, gain: 0.35 })
  )
);
ui('test_ui', { slot: 'test', levelDb: -12, cooldownMs: 0 }, (k, t, d, p) =>
  Math.max(...[880, 1108.7, 1318.5].map((f, i) => k.tone(d, t + i * 0.09, { f0: P(p, f), d: 0.1, gain: 0.5 })))
);
cue('test_music', { bus: 'music', slot: 'test', levelDb: -10, priority: 3, maxVoices: 1, cooldownMs: 0 }, (k, t, d, p) =>
  Math.max(...[293.66, 349.23, 440, 523.25, 587.33].map((f, i) => k.pluck(d, t + i * 0.16, { f: P(p, f), d: 0.9, gain: 0.45 })))
);
cue('test_ambient', { bus: 'ambient', slot: 'test', levelDb: -14, priority: 3, maxVoices: 1, cooldownMs: 0 }, (k, t, d) =>
  Math.max(
    k.noise(d, t, { src: 'crackle', type: 'bandpass', f0: 2200, q: 0.8, a: 0.1, hold: 0.8, d: 0.3, gain: 1 }),
    k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 380, q: 0.7, a: 0.2, hold: 0.7, d: 0.4, gain: 0.6 })
  )
);

export const DEFAULT_CUES = C;

// ------------------------------------------------ sim-event -> cue map --
// Each handler: (ev, h) -> [{ cue, x?, z?, gainDb?, pitch? }] | null, where h
// = { pos(id) -> {x,z}|null, player() -> {x,z}|null, kind(id) }.
// Position rule: world-anchored gameplay cues are spatial (x/z); UI and
// progression cues are not (PLAN §3.5 "Music/UI/ambient are non-spatial").
const at = (ev, h, id) => {
  if (Number.isFinite(ev.x) && Number.isFinite(ev.z)) return { x: ev.x, z: ev.z };
  const p = id != null ? h.pos(id) : null;
  return p || h.player() || {};
};
const one = (cue, where, extra) => [{ cue, ...where, ...extra }];
const PARTY_KINDS = new Set(['player', 'ally']);
// Boss bodies: the Hollow Stag's entity kind is 'stag'; later bosses may set
// `boss: true` on their events (or register their own death cue).
const isBoss = (ev) => ev.kind === 'stag' || ev.kind === 'boss' || ev.boss === true;

const HEAL_SKILLS = new Set(['mending_bolt', 'swift_mend', 'restorative_wave', 'guardian_bond']);
// PARTY: the new class skills' own cues (BUILD_BRIEF §25.2 audio column).
export const CLASS_SKILL_CUE = Object.freeze({
  taunting_roar: 'tank_roar',
  shield_wall: 'tank_shield',
  shoulder_charge: 'tank_charge',
  fox_step: 'sword_step',
  crescent_finisher: 'sword_finisher',
  riposte: 'sword_parry',
  vault_shot: 'archer_vault',
  pinning_arrow: 'archer_pin',
  rain_of_arrows: 'archer_rain',
});
function skillFamily(ev) {
  const s = ev.skill;
  if (s === 'sanctuary') return 'cast_zone';
  if (s === 'nova_bloom') return 'cast_nova';
  if (s === 'warding_aura') return 'cast_aura';
  if (s === 'spirit_bolt') return 'cast_damage';
  if (HEAL_SKILLS.has(s)) return 'cast_heal';
  // Skills added later (M4a): by delivery shape / archetype.
  if (ev.shape === 'ground_aoe') return 'cast_zone';
  if (ev.shape === 'nova') return 'cast_nova';
  if (ev.heal === false || ev.archetype === 'damage') return 'cast_damage';
  return 'cast_heal';
}

export const DEFAULT_EVENT_CUES = {
  basic_fire: (ev, h) => one('shoot', at(ev, h)),
  ally_basic: (ev, h) =>
    one(ev.shape === 'melee_arc' ? 'swing' : 'bow', at(ev, h, ev.id), { pitch: ev.classId === 'tank' ? 0.8 : 1 }),
  enemy_fire: (ev, h) => one('spit', at(ev, h, ev.id)),
  enemy_bite: (ev, h) => one('bite', at({}, h, ev.id)),
  hit: (ev, h) => {
    const where = at(ev, h, ev.target);
    const party = PARTY_KINDS.has(ev.kind);
    const heavy = isBoss(ev) ? 0.7 : ev.shape === 'melee_arc' ? 0.85 : 1;
    const out = [{ cue: party ? 'hurt' : 'impact', ...where, pitch: party ? 1 : heavy }];
    if (ev.crit) out.push({ cue: 'crit', ...where });
    return out;
  },
  hit_immune: (ev, h) => one('whiff', at(ev, h, ev.target)),
  death: (ev, h) => one(isBoss(ev) ? 'boss_death' : 'kill', at(ev, h, ev.id)),
  heal: (ev, h) => one(ev.crit ? 'heal_crit' : 'heal', at(ev, h, ev.target)),
  full_heal: (ev, h) => one('sparkle', at(ev, h, ev.target)),
  // PARTY: a class passive pulse (ev.seat) plays its own quiet cue only when
  // it did something; the Healer's aura keeps its cue.
  aura_pulse: (ev, h) => {
    if (ev.seat === undefined) return one('aura', at({}, h));
    const did = (ev.hit && ev.hit.length) || (ev.shielded && ev.shielded.length);
    if (!did) return null;
    const c = ev.skill === 'iron_stance' ? 'tank_stance' : ev.skill === 'razor_wake' ? 'sword_wake' : 'archer_kestrel';
    return one(c, at(ev, h));
  },
  zone_tick: (ev, h) => one('zone_pulse', at(ev, h, ev.id)),
  azone_tick: (ev, h) => one('azone_pulse', at(ev, h, ev.id)),
  skill_cast: (ev, h) => one(skillFamily(ev), at({}, h)),
  ally_cast: (ev, h) => {
    // PARTY: a new class skill's own cue (Crescent Finisher +3 semitones per
    // combo stack); the starting kit keeps its class family.
    const own = CLASS_SKILL_CUE[ev.skill];
    if (own) return one(own, at(ev, h, ev.id), ev.combo ? { pitch: Math.pow(2, (3 * ev.combo) / 12) } : undefined);
    return one(ev.classId === 'tank' ? 'ally_cast_tank' : ev.classId === 'archer' ? 'ally_cast_archer' : 'ally_cast_sword', at(ev, h, ev.id));
  },
  ally_dash: (ev, h) => one('whoosh', { x: ev.x0, z: ev.z0 }, { pitch: ev.cause === 'dash' ? 0.9 : 1.1 }),
  parry_counter: (ev, h) => one('sword_parry', at(ev, h, ev.id), { pitch: 1.25 }),
  skill_bolt_spawn: (ev, h) => one('bolt', at(ev, h, ev.id)),
  zone_spawn: (ev, h) => one('zone_spawn', at(ev, h, ev.id)),
  azone_spawn: (ev, h) => one('azone_spawn', at(ev, h, ev.id)),
  echo_recast: (ev, h) => one('echo', at(ev, h)),
  echo_armed: (ev, h) => one('echo_tick', at({}, h)),
  bounce_hop: (ev, h) => one('bounce', at(ev, h, ev.target), { pitch: 1 + Math.min(6, ev.hop || 1) * 0.12 }),
  siphon_drain: (ev, h) => one('siphon', at(ev, h, ev.target)),
  siphon_selfheal: (ev, h) => one('siphon_heal', at(ev, h)),
  siphon_fizzle: (ev, h) => one('fizzle', at(ev, h, ev.ally)),
  detonate: (ev, h) => one(ev.mode === 'heal' ? 'detonate_heal' : 'detonate', at(ev, h)),
  intent: (ev, h) => (ev.kind === 'dodge' ? one('dodge', at({}, h)) : null),
  dash_end: (ev, h) => one('dash_end', at({}, h)),
  intent_denied: (ev) => [{ cue: ev.reason === 'empty_slot' ? 'deny_empty' : 'deny_cd' }],
  telegraph_start: (ev, h) => one('telegraph', at(ev, h, ev.id)),
  telegraph_resolve: (ev, h) => one('telegraph_hit', at({}, h, ev.id)),
  boss_quake_start: (ev, h) => one('quake_warn', at(ev, h, ev.id)),
  boss_quake_resolve: (ev, h) => one('quake_hit', at(ev, h, ev.id)),
  boss_trample: (ev, h) => one('trample', at(ev, h, ev.id)),
  boss_adds: (ev, h) => one('horn', at({}, h)),
  boss_spawn: (ev, h) => one('roar', at(ev, h, ev.id)),
  spawn_telegraph: (ev, h) => one('shimmer', at(ev, h)),
  downed: (ev, h) => one('downed', at(ev, h, ev.id)),
  revive_start: (ev, h) => one('revive_hum', at({}, h, ev.target)),
  revive: (ev, h) => one('revive', at({}, h, ev.target)),
  revive_break: (ev, h) => one('revive_snap', at({}, h, ev.target)),
  rally: (ev, h) => one('rally', at(ev, h)),
  mark: (ev, h) => (ev.id != null ? one('mark', at(ev, h, ev.id)) : ev.reason === 'no_enemies' ? [{ cue: 'deny_cd' }] : null),
  ally_rescue: (ev, h) => one('whoosh', at(ev, h, ev.id)),
  waystone_spawn: (ev, h) => one('waystone', at(ev, h, ev.id)),
  broken: (ev, h) => one('break', at(ev, h, ev.id)),
  room_soft_fail: () => [{ cue: 'soft_fail' }],
  // Progression / UI bus (non-spatial).
  room_start: () => [{ cue: 'room_start' }],
  wave_start: (ev) => (ev.index > 0 ? [{ cue: 'wave_start' }] : [{ cue: 'wave_start', gainDb: -3 }]),
  room_cleared: () => [{ cue: 'room_clear' }],
  reward_offer: () => [{ cue: 'reward' }],
  reward_forfeited: () => [{ cue: 'draft_decline' }],
  draft_taken: () => [{ cue: 'draft_take' }],
  draft_declined: () => [{ cue: 'draft_decline' }],
  path_chosen: () => [{ cue: 'path' }],
  shop_open: () => [{ cue: 'shop_open' }],
  shop_purchase: () => [{ cue: 'purchase' }],
  currency_denied: () => [{ cue: 'deny' }],
  glint_gain: () => [{ cue: 'glint' }],
  node_socketed: () => [{ cue: 'socket' }],
  node_unsocketed: () => [{ cue: 'unsocket' }],
  node_granted: () => [{ cue: 'node_grant' }],
  skill_equip: () => [{ cue: 'node_grant', pitch: 0.84 }],
  socket_denied: () => [{ cue: 'deny' }],
  heal_override: (ev) => (ev.index != null ? [{ cue: 'ui_blip' }] : null),
  run_start: () => [{ cue: 'run_start' }],
  run_end: () => [{ cue: 'run_end' }],
  return_to_camp: () => [{ cue: 'camp_return' }],
};

// Baked at unlock, in this order (G3.10, src/audio/bake.js): every cue a
// fight fires often or that a boss room adds, at the pitches this map (and
// the M4a / M4b handlers) actually request — [cueId, pitch]. Anything else is
// baked from its second live play.
export const PREBAKE = [
  ...['impact', 'hurt', 'shoot', 'swing', 'bow', 'spit', 'bite', 'kill', 'crit', 'heal', 'heal_crit', 'bolt', 'whiff', 'telegraph', 'telegraph_hit', 'shimmer'].map((c) => [c, 1]),
  ['impact', 0.7], // hits on the boss
  ['impact', 0.85], // melee-arc hits
  ['swing', 0.8], // the tank's basic
  ['bow', 0.8],
  ...['zone_pulse', 'azone_pulse', 'aura', 'sparkle', 'dodge', 'dash_end', 'mark', 'downed', 'deny_empty', 'deny_cd'].map((c) => [c, 1]),
  ...['cast_heal', 'cast_damage', 'cast_zone', 'cast_nova', 'cast_aura', 'ally_cast_tank', 'ally_cast_sword', 'ally_cast_archer', 'zone_spawn', 'azone_spawn'].map((c) => [c, 1]),
  // PARTY class skill cues (+ the finisher's combo pitches, the counter).
  ...['tank_roar', 'tank_shield', 'tank_charge', 'tank_stance', 'sword_step', 'sword_finisher', 'sword_parry', 'sword_wake', 'archer_vault', 'archer_pin', 'archer_rain', 'archer_kestrel'].map((c) => [c, 1]),
  ['sword_finisher', Math.pow(2, 3 / 12)], ['sword_finisher', Math.pow(2, 6 / 12)], ['sword_parry', 1.25], ['whoosh', 0.9], ['whoosh', 1.1],
  ...['quake_warn', 'quake_hit', 'trample', 'horn', 'roar', 'boss_death', 'revive_hum', 'revive', 'revive_snap', 'rally'].map((c) => [c, 1]),
  ...[1.12, 1.24, 1.36, 1.48, 1.6, 1.72].map((p) => ['bounce', p]), // bounce_hop 1..6
  ...['echo', 'echo_tick', 'siphon', 'siphon_heal', 'fizzle', 'detonate', 'detonate_heal', 'break', 'whoosh'].map((c) => [c, 1]),
  // pitches the M4a / M4b event handlers request of built-in cues
  ['cast_damage', 1.12], ['cast_damage', 0.86], ['cast_nova', 0.7], ['cast_zone', 0.82], ['telegraph_hit', 1.3], ['impact', 1.2],
  ['sparkle', 0.85], ['sparkle', 0.8], ['sparkle', 1.2], ['sparkle', 0.9], ['echo', 0.75], ['echo_tick', 1.3], ['mark', 0.8],
  ['bounce', 1.1], ['bounce', 1.35], ['bounce', 1.7], ['roar', 1.7], ['node_grant', 0.84],
];
// Every other registered cue is baked at pitch 1 after these (engine prebake).

// App navigation -> UI cue (PLAN §3.5 last row; the engine subscribes to the
// app `nav` events, never the other way round).
export const NAV_CUES = {
  up: 'ui_move',
  down: 'ui_move',
  left: 'ui_move',
  right: 'ui_move',
  confirm: 'ui_confirm',
  back: 'ui_back',
  tabPrev: 'ui_tab',
  tabNext: 'ui_tab',
  secondary: 'ui_toggle',
  tertiary: 'ui_toggle',
};
