// Procedural music (docs/gauntlet/PLAN.md §3.5 "Music state machine";
// BUILD_BRIEF §23.1 act themes). Owner: M3. No audio files: every state is a
// small step sequencer (16 steps per bar) playing kit instruments into
// per-layer gains, scheduled up to 0.5 s ahead of the audio clock inside the
// engine's frame budget (notes due within 0.12 s always schedule; 1.5 s ahead
// while the page is hidden, when timers are throttled). Notes play as baked
// samples once src/audio/bake.js has rendered them (G3.10: percussion, and
// every one-shot note of the combat / boss grooves).
//
// States: menu · camp · combat · boss · victory · defeat · lobby · silence.
// Themes (act identity, run states only): wood (D dorian, combat 104 bpm,
// lute + hand drum) · mill (A aeolian, 96 bpm, water-drip plucks, reeds,
// frame drum) · barrow (E phrygian, 88 bpm, bell tolls, choir pad, taiko).
// Tempo table (bpm) — every state differs from every other by >= 18 % inside
// a theme (G3.5 distinctness), boss = combat x 1.22:
//   defeat 44 · menu 56 · lobby 64 · camp 72 · combat 104/96/88 ·
//   boss 127/117/107 · victory 152
// Every state keeps a sustained pad/drone layer so the music tap never
// drops out between notes (G3.5 "never below -50 dBFS for > 1 s").
// Crossfades are equal-power (sin/cos gain curves). Intensity (0..1) opens
// the combat/boss layers (drums, ostinato, percussion, lead) with smooth
// 0.6 s ramps.
import { midiHz } from './voices.js';

export const MUSIC_STATES = Object.freeze(['menu', 'camp', 'combat', 'boss', 'victory', 'defeat', 'lobby', 'silence']);

const SCALES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

const THEMES = {
  wood: { id: 'wood', root: 50, scale: 'dorian', combatBpm: 104, prog: [0, 6, 5, 6], bossScale: 'phrygian', bossProg: [0, 1, 6, 0], ostinato: 'lute', drum: 'hand', lead: 'flute', padType: 'sawtooth', padCut: 1100 },
  mill: { id: 'mill', root: 45, scale: 'aeolian', combatBpm: 96, prog: [0, 5, 2, 6], bossScale: 'phrygian', bossProg: [0, 1, 5, 6], ostinato: 'drip', drum: 'frame', lead: 'reed', padType: 'square', padCut: 800 },
  barrow: { id: 'barrow', root: 52, scale: 'phrygian', combatBpm: 88, prog: [0, 1, 0, 6], bossScale: 'harmonic', bossProg: [0, 1, 4, 0], ostinato: 'bell', drum: 'taiko', lead: 'choir', padType: 'sawtooth', padCut: 700, formant: 750 },
};

// Per-state output trims (dB) that bring each state to about -18 dBFS RMS
// pre-bus (PLAN §3.5 gain staging), measured with tools/gntM3-probe.mjs.
export const MUSIC_TRIM = {
  // @trim begin
  'boss:barrow': -9.6,
  'boss:mill': -8.9,
  'boss:wood': -9.5,
  'camp': -7.6,
  'combat:barrow': -9.1,
  'combat:mill': -7.8,
  'combat:wood': -7.9,
  'defeat': -7,
  'lobby': -6.3,
  'menu': -6.8,
  'victory': -5.1,
  // @trim end
};

// Music content path (engine.js): per-state trims (MUSIC_TRIM) bring every
// state to -20 dBFS RMS at the glue compressor's input, the compressor
// narrows the crest factor, and postDb lands the score at the bus input at
// MUSIC_TARGET_DB (decision D18 in docs/gauntlet/build-M3.md: PLAN §3.5's
// -18 dBFS figure cannot meet gate G3.4's -24..-14 dBFS combat master window
// at the default sliders, so the score sits at -13.5 dBFS RMS pre-bus).
export const MUSIC_IN_DB = -20;
export const MUSIC_TARGET_DB = -13.5;
export const MUSIC_BUS = {
  compressor: { threshold: -24, knee: 10, ratio: 3, attack: 0.012, release: 0.25 },
  // @post begin
  postDb: 2.7,
  // @post end
};

// Crossfade lengths (s). PLAN §3.5 names 2.0 default / 1.0 into combat / 2.5
// out of a stinger; gate G3.5 requires every transition in 1.5-2.5 s, so
// the combat entry uses 1.5 (the fastest the gate allows) — recorded in
// docs/gauntlet/build-M3.md.
export const CROSSFADE = { default: 2.0, toCombat: 1.5, toStinger: 1.5, fromStinger: 2.5 };
export const STINGER_SEC = { victory: 3.5, defeat: 4.0 };

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function degMidi(spec, deg, oct = 0) {
  const sc = SCALES[spec.scale];
  const n = sc.length;
  const o = Math.floor(deg / n);
  const d = ((deg % n) + n) % n;
  return spec.root + sc[d] + 12 * (o + oct);
}
const triad = (spec, deg, oct = 0) => [degMidi(spec, deg, oct), degMidi(spec, deg + 2, oct), degMidi(spec, deg + 4, oct)];

// ------------------------------------------------------------ instruments --
const INSTR = {
  lute: (k, d, t, f, v, len) => k.pluck(d, t, { f, d: Math.min(0.9, len * 1.6 + 0.25), gain: v, bright: 3200, dark: 700 }),
  harp: (k, d, t, f, v) => k.pluck(d, t, { f, d: 1.5, gain: v, bright: 5200, dark: 1600 }),
  bell: (k, d, t, f, v) => k.bell(d, t, { f, ratio: 3.5, index: 1.1, d: 1.4, gain: v }),
  drip: (k, d, t, f, v) => k.tone(d, t, { f0: f, f1: f * 1.5, glide: 0.035, a: 0.002, d: 0.2, gain: v }),
  flute: (k, d, t, f, v, len) =>
    Math.max(
      k.tone(d, t, { type: 'triangle', f0: f, a: 0.05, hold: Math.max(0, len - 0.1), d: 0.18, gain: v }),
      k.tone(d, t, { f0: f * 2, a: 0.06, hold: Math.max(0, len - 0.1), d: 0.15, gain: v * 0.18 })
    ),
  reed: (k, d, t, f, v, len) => k.tone(d, t, { type: 'square', f0: f, a: 0.07, hold: Math.max(0, len - 0.12), d: 0.2, gain: v * 0.6, filter: { f0: 1100, q: 0.8 } }),
  choir: (k, d, t, f, v, len) => k.pad(d, t, { notes: [f], dur: Math.max(0.2, len), a: 0.18, r: 0.4, gain: v, formant: 780, type: 'sawtooth' }),
  brass: (k, d, t, f, v) =>
    Math.max(
      k.tone(d, t, { type: 'sawtooth', f0: f, a: 0.02, d: 0.32, gain: v * 0.55, filter: { f0: 1800, f1: 500, q: 1.4, glide: 0.3 } }),
      k.tone(d, t, { type: 'sawtooth', f0: f * 1.5, a: 0.02, d: 0.28, gain: v * 0.3, filter: { f0: 1800, f1: 500, q: 1.4, glide: 0.3 } })
    ),
  bass: (k, d, t, f, v, len) => k.tone(d, t, { type: 'triangle', f0: f, a: 0.01, hold: Math.max(0, len * 0.6), d: len * 0.5 + 0.08, gain: v, filter: { f0: 700, q: 0.7 } }),
  hand: (k, d, t, f, v) =>
    Math.max(k.tone(d, t, { f0: 190, f1: 95, d: 0.13, gain: v }), k.noise(d, t, { f0: 1300, q: 1.2, d: 0.035, gain: v * 0.45 })),
  frame: (k, d, t, f, v) =>
    Math.max(k.tone(d, t, { f0: 125, f1: 68, d: 0.24, gain: v }), k.noise(d, t, { type: 'lowpass', f0: 950, q: 0.8, d: 0.09, gain: v * 0.5 })),
  taiko: (k, d, t, f, v) =>
    Math.max(k.tone(d, t, { f0: 72, f1: 42, d: 0.55, gain: v }), k.noise(d, t, { src: 'brown', type: 'lowpass', f0: 320, q: 0.7, d: 0.22, gain: v * 0.8 })),
  shaker: (k, d, t, f, v) => k.noise(d, t, { type: 'highpass', f0: 6500, q: 0.7, a: 0.004, d: 0.045, gain: v }),
};

// ----------------------------------------------------------------- layers --
// A layer: { id, gain, min? (intensity where it opens), play(k, dest, t, step, ctx) }
// ctx = { spec, bar, s, stepDur, barDur, rnd }
function padLayer(gain = 0.5, { oct = 0, every = 16 } = {}) {
  return {
    id: 'pad',
    gain,
    play(k, d, t, c) {
      if (c.step % every !== 0) return;
      const deg = c.spec.prog[Math.floor(c.step / 16) % c.spec.prog.length];
      k.pad(d, t, {
        notes: triad(c.spec, deg, oct).map(midiHz),
        dur: c.stepDur * every,
        a: Math.min(0.9, c.stepDur * every * 0.3),
        r: 1.8,
        gain: 1,
        cutoff: c.spec.padCut || 1000,
        type: c.spec.padType || 'sawtooth',
        formant: c.spec.formant || null,
      });
    },
  };
}
function droneLayer(gain = 0.5) {
  return {
    id: 'drone',
    gain,
    play(k, d, t, c) {
      if (c.step % 32 !== 0) return;
      const f = midiHz(c.spec.root - 12);
      k.pad(d, t, { notes: [f, f * 1.5], dur: c.stepDur * 32, a: 0.8, r: 2.2, gain: 1, cutoff: 420, type: 'sawtooth' });
    },
  };
}
function bassLayer(gain, steps, { lenSteps = 4 } = {}) {
  const set = new Set(steps);
  return {
    id: 'bass',
    gain,
    play(k, d, t, c) {
      if (!set.has(c.s)) return;
      const deg = c.spec.prog[c.bar % c.spec.prog.length];
      c.note('bass', k, d, t, midiHz(degMidi(c.spec, deg, -1)), 1, c.stepDur * lenSteps);
    },
  };
}
// Arpeggio over the bar's chord: pattern = indexes into [root, 3rd, 5th, 8ve, 10th].
function arpLayer(id, gain, instr, { every = 2, oct = 1, pattern = [0, 1, 2, 3, 2, 1, 0, 2], min, vary = true } = {}) {
  return {
    id,
    gain,
    min,
    play(k, d, t, c) {
      if (c.s % every !== 0) return;
      const deg = c.spec.prog[c.bar % c.spec.prog.length];
      const tones = [...triad(c.spec, deg, oct), degMidi(c.spec, deg, oct + 1), degMidi(c.spec, deg + 2, oct + 1)];
      const i = (c.s / every) % pattern.length;
      let idx = pattern[i];
      if (vary && c.bar % 4 === 3 && i >= pattern.length - 2) idx = Math.min(tones.length - 1, idx + 1);
      const v = c.s % 8 === 0 ? 1 : 0.72;
      c.note(instr, k, d, t, midiHz(tones[idx]), v, c.stepDur * every);
    },
  };
}
function drumLayer(id, gain, instr, hits, { min, fill = true } = {}) {
  return {
    id,
    gain,
    min,
    play(k, d, t, c) {
      let v = hits[c.s];
      if (fill && c.bar % 4 === 3 && c.s >= 12) v = Math.max(v || 0, c.s % 2 === 0 ? 0.7 : 0.45);
      if (!v) return;
      c.note(instr, k, d, t, 0, v, c.stepDur);
    },
  };
}
function shakerLayer(gain, { min, every = 1 } = {}) {
  return {
    id: 'shaker',
    gain,
    min,
    play(k, d, t, c) {
      if (c.s % every !== 0) return;
      const v = c.s % 4 === 2 ? 1 : c.s % 2 === 0 ? 0.55 : 0.35;
      c.note('shaker', k, d, t, 0, v, 0);
    },
  };
}
// Two-bar melodic motif in scale degrees relative to the tonic: [step, degree, lenSteps].
function leadLayer(gain, instr, motif, { min, oct = 1 } = {}) {
  return {
    id: 'lead',
    gain,
    min,
    play(k, d, t, c) {
      const pos = c.step % 32;
      for (const [st, deg, len] of motif) {
        if (st !== pos) continue;
        const chordDeg = c.spec.prog[c.bar % c.spec.prog.length];
        c.note(instr, k, d, t, midiHz(degMidi(c.spec, chordDeg + deg, oct)), 1, c.stepDur * len);
      }
    },
  };
}
function stabLayer(gain, steps, { min } = {}) {
  const set = new Set(steps);
  return {
    id: 'stab',
    gain,
    min,
    play(k, d, t, c) {
      if (!set.has(c.s)) return;
      const deg = c.spec.prog[c.bar % c.spec.prog.length];
      c.note('brass', k, d, t, midiHz(degMidi(c.spec, deg, 0)), 1, 0);
    },
  };
}
// Stinger phrase: plays the given [step, midiOffset, instr, v] list once.
function phraseLayer(gain, notes) {
  return {
    id: 'phrase',
    gain,
    play(k, d, t, c) {
      for (const [st, off, instr, v, len] of notes) {
        if (st === c.step) c.note(instr, k, d, t, midiHz(c.spec.root + off), v, (len || 2) * c.stepDur);
      }
    },
  };
}

const MOTIFS = {
  wood: [[0, 4, 3], [4, 2, 2], [6, 4, 2], [8, 5, 4], [12, 4, 4], [16, 2, 3], [20, 0, 2], [22, 1, 2], [24, 2, 8]],
  mill: [[0, 0, 6], [6, 2, 2], [8, 4, 6], [14, 3, 2], [16, 2, 8], [24, 1, 4], [28, 0, 4]],
  barrow: [[0, 4, 8], [8, 5, 4], [12, 4, 4], [16, 1, 8], [24, 0, 8]],
};

// --------------------------------------------------------- state specs --
export function stateSpec(state, themeId = 'wood') {
  const th = THEMES[themeId] || THEMES.wood;
  const base = { root: 50, scale: 'dorian', padType: 'sawtooth', padCut: 1000 };
  switch (state) {
    case 'menu':
      return {
        ...base, state, bpm: 56, prog: [0, 6, 3, 0],
        layers: [padLayer(0.55), arpLayer('harp', 0.5, 'harp', { every: 4, oct: 2, pattern: [0, 2, 1, 3] }), bassLayer(0.4, [0], { lenSteps: 14 })],
      };
    case 'camp':
      return {
        ...base, state, bpm: 72, prog: [0, 4, 6, 3],
        layers: [
          padLayer(0.4),
          arpLayer('lute', 0.55, 'lute', { every: 2, oct: 1, pattern: [0, 2, 1, 3, 2, 1, 4, 2] }),
          bassLayer(0.45, [0, 8], { lenSteps: 7 }),
          drumLayer('drum', 0.3, 'hand', { 0: 0.9, 6: 0.35, 8: 0.7, 11: 0.3 }, { fill: false }),
        ],
      };
    case 'lobby':
      return {
        ...base, state, scale: 'mixolydian', bpm: 64, prog: [0, 6, 3, 0],
        layers: [padLayer(0.45), arpLayer('bells', 0.4, 'bell', { every: 4, oct: 1, pattern: [0, 2, 1, 3] }), bassLayer(0.4, [0, 8], { lenSteps: 7 })],
      };
    case 'combat': {
      const ost = th.ostinato;
      return {
        ...base, ...th, state, bpm: th.combatBpm, prog: th.prog,
        layers: [
          padLayer(0.32, { oct: 0 }),
          bassLayer(0.5, [0, 3, 6, 8, 11, 14], { lenSteps: 2 }),
          drumLayer('drum', 0.55, th.drum, { 0: 1, 4: 0.5, 7: 0.6, 8: 0.85, 10: 0.4, 12: 0.55, 14: 0.45 }, { min: 0.12 }),
          arpLayer('ostinato', 0.45, ost, { every: 1, oct: 1, pattern: [0, 1, 2, 1, 3, 2, 1, 2], min: 0.32 }),
          shakerLayer(0.2, { min: 0.52 }),
          leadLayer(0.42, th.lead, MOTIFS[th.id], { min: 0.72 }),
        ],
      };
    }
    case 'boss': {
      return {
        ...base, ...th, state, scale: th.bossScale, prog: th.bossProg, bpm: Math.round(th.combatBpm * 1.22),
        layers: [
          droneLayer(0.4),
          padLayer(0.25, { oct: 0, every: 32 }),
          drumLayer('taiko', 0.62, 'taiko', { 0: 1, 3: 0.55, 6: 0.7, 8: 0.9, 11: 0.5, 12: 0.6, 14: 0.75 }),
          bassLayer(0.45, [0, 2, 4, 6, 8, 10, 12, 14], { lenSteps: 1.6 }),
          arpLayer('ostinato', 0.4, th.ostinato === 'bell' ? 'bell' : 'lute', { every: 1, oct: 1, pattern: [0, 1, 0, 2, 0, 1, 3, 2], min: 0.25 }),
          stabLayer(0.4, [0, 6, 12], { min: 0.5 }),
          leadLayer(0.38, th.lead, MOTIFS[th.id], { min: 0.75, oct: 1 }),
        ],
      };
    }
    case 'victory':
      return {
        ...base, state, scale: 'ionian', bpm: 152, prog: [0, 0, 4, 0],
        stinger: STINGER_SEC.victory,
        layers: [
          phraseLayer(0.7, [
            [0, 0, 'harp', 0.9], [1, 4, 'harp', 0.8], [2, 7, 'harp', 0.85], [3, 12, 'harp', 0.9], [4, 16, 'harp', 0.9], [5, 19, 'harp', 1],
            [6, 24, 'bell', 0.8, 8], [6, 12, 'brass', 0.8], [6, 7, 'brass', 0.6],
          ]),
          padLayer(0.5, { oct: 0 }),
          bassLayer(0.4, [6], { lenSteps: 12 }),
        ],
      };
    case 'defeat':
      return {
        ...base, state, scale: 'aeolian', bpm: 44, prog: [0, 0, 5, 0],
        stinger: STINGER_SEC.defeat,
        layers: [
          phraseLayer(0.65, [[0, 7, 'choir', 0.8, 3], [3, 5, 'choir', 0.75, 3], [6, 3, 'choir', 0.7, 3], [9, 0, 'choir', 0.8, 6], [0, -12, 'bass', 0.9, 12]]),
          droneLayer(0.45),
          padLayer(0.35, { oct: -1 }),
        ],
      };
    default:
      return null;
  }
}

export function themeIds() {
  return Object.keys(THEMES);
}

export function registerMusicTheme(id, params) {
  THEMES[id] = { ...THEMES.wood, ...params, id };
  if (params.motif) MOTIFS[id] = params.motif;
  return THEMES[id];
}

const smooth = (v, a, b) => (v <= a ? 0 : v >= b ? 1 : ((v - a) / (b - a)) ** 2 * (3 - 2 * ((v - a) / (b - a))));

function eqCurve(n, from, to, kind) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const w = kind === 'in' ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2);
    c[i] = kind === 'in' ? from + (to - from) * w : to + (from - to) * w;
  }
  return c;
}

// Note counters (debug: music().notes) — baked sample plays vs live synthesis.
const noteStats = { baked: 0, live: 0 };
export const musicNoteStats = () => ({ ...noteStats });

// Instruments whose sound depends on the note length (the rest ignore it).
const LEN_INSTR = new Set(['lute', 'flute', 'reed', 'choir', 'bass']);
// Notes played as baked samples (G3.10): the percussion everywhere (a few
// velocity keys per state), and EVERY one-shot note of the busy states —
// combat and boss play 150-200 notes per 4-bar cycle from only 32-48 distinct
// pitch x velocity x length keys (~2.5-3 MB of samples per state). The calm
// states (menu, camp, lobby, stingers: 5-56 notes per cycle, long harp/bell
// tails) stay live; pads and drones always do (long, rare).
const BAKED_INSTR = new Set(['hand', 'frame', 'taiko', 'shaker']);
const BAKED_STATES = new Set(['combat', 'boss']);
const bakesNote = (state, instr) => BAKED_INSTR.has(instr) || BAKED_STATES.has(state);
const noteKey = (instr, f, v, len) => `n:${instr}:${Math.round(f * 100)}:${Math.round(v * 100)}:${LEN_INSTR.has(instr) ? Math.round(len * 1000) : 0}`;
const noteBuild = (instr, f, v, len) => (kk, tt, dd) => INSTR[instr](kk, dd, tt, f, v, len);

// Every note a state plays in one 4-bar cycle (all layers, any intensity):
// the layers are pure functions of the step, so a dry pass with a collecting
// `note` enumerates them. Pads / drones call the kit directly (the dry kit
// swallows them); they stay live-synthesised. Returns an incremental job
// (deadline) -> done that hands each new note to `onNote(key, build)` — the
// engine runs it inside its frame budget (src/audio/bake.js addJob).
export function stateNotesJob(state, themeId, dryKit, onNote) {
  const spec = stateSpec(state, themeId);
  if (!spec) return null;
  const seen = new Set();
  const stepDur = 60 / spec.bpm / 4;
  const note = (instr, k, d, t, f, v, len) => {
    if (!bakesNote(state, instr)) return t;
    const key = noteKey(instr, f, v, len);
    if (!seen.has(key)) {
      seen.add(key);
      onNote(key, noteBuild(instr, f, v, len));
    }
    return t;
  };
  const steps = spec.stinger ? Math.ceil((spec.stinger + 1) / stepDur) : 64;
  let step = 0;
  return (deadline) => {
    while (step < steps) {
      if (performance.now() > deadline) return false;
      const c = { spec, step, s: step % 16, bar: Math.floor(step / 16), stepDur, barDur: stepDur * 16, rnd: Math.random, note };
      for (const l of spec.layers) {
        try {
          l.play(dryKit, null, step * stepDur, c);
        } catch {
          /* a layer the dry pass cannot run just stays live */
        }
      }
      step += 1;
    }
    return true;
  };
}

// One playing state instance.
// G3.10 (docs/gauntlet/fix-M3-r1.md): notes go through `note()`, which plays
// a baked sample (src/audio/bake.js: ONE AudioBufferSourceNode into the layer
// gain) once the instrument/pitch/velocity/length has been baked, and
// synthesises live (and queues the bake) until then. Pads and drones stay
// live (long, rare). schedule() is resumable per layer so the engine can
// spread a step's notes over several frames inside its frame budget.
function createPlayer(ctx, kit, dest, spec, { trimDb = 0, intensity = 0, baker = null }) {
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(dest);
  const stepDur = 60 / spec.bpm / 4;
  const target = Math.pow(10, trimDb / 20);
  const rnd = mulberry((Math.random() * 1e9) | 0);
  const layers = spec.layers.map((l) => {
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(out);
    return { ...l, g, level: 0 };
  });
  function note(instr, k, d, t, f, v, len) {
    if (baker && bakesNote(spec.state, instr)) {
      const key = noteKey(instr, f, v, len);
      const r = baker.get(key);
      if (r && r.buffer) {
        const s = ctx.createBufferSource();
        s.buffer = r.buffer;
        s.connect(d);
        s.start(t, r.o, r.d);
        noteStats.baked += 1;
        return t + r.d;
      }
      baker.request(key, noteBuild(instr, f, v, len), { hi: true, variants: 1 });
    }
    noteStats.live += 1;
    return INSTR[instr](k, d, t, f, v, len);
  }

  let step = 0;
  let li = 0; // next layer of the current step (schedule() resumes here)
  let cur = null; // the current step's context
  let nextTime = ctx.currentTime + 0.06;
  const startTime = nextTime;
  let stopAt = Infinity;
  let notes = 0;

  function layerTarget(l, v) {
    return l.min === undefined ? l.gain : l.gain * smooth(v, l.min, l.min + 0.16);
  }
  function setIntensity(v, tau = 0.6) {
    const now = ctx.currentTime;
    for (const l of layers) {
      const tg = layerTarget(l, v);
      l.level = tg;
      l.g.gain.setTargetAtTime(tg, now, tau);
    }
  }
  // Initial layer levels land immediately (no ramp from silence inside the fade).
  for (const l of layers) {
    l.level = layerTarget(l, intensity);
    l.g.gain.setValueAtTime(l.level, ctx.currentTime);
  }

  // schedule(until, deadline, hardUntil): play every layer note starting
  // before `until`; once performance.now() passes `deadline` only notes
  // starting before `hardUntil` (the must-lead window) are still scheduled
  // and the rest wait for the next call (returns false when it stopped early).
  function schedule(until, deadline = Infinity, hardUntil = until) {
    const barSteps = 16;
    while (nextTime < until && nextTime < stopAt) {
      if (spec.stinger && nextTime - startTime > spec.stinger + 6) break; // stingers hold, then the engine moves on
      if (li === 0 || !cur) cur = { spec, step, s: step % barSteps, bar: Math.floor(step / barSteps), stepDur, barDur: stepDur * barSteps, rnd, note };
      for (; li < layers.length; li++) {
        if (nextTime >= hardUntil && performance.now() > deadline) return false;
        const l = layers[li];
        if (l.level < 0.002 && l.id !== 'pad' && l.id !== 'drone') continue;
        try {
          l.play(kit, l.g, nextTime, cur);
          notes += 1;
        } catch {
          /* an instrument must never stop the sequencer */
        }
      }
      li = 0;
      step += 1;
      nextTime += stepDur;
    }
    return true;
  }

  function fade(kind, sec) {
    const now = ctx.currentTime;
    const p = out.gain;
    const cur = p.value;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
    else {
      p.cancelScheduledValues(now);
      p.setValueAtTime(cur, now);
    }
    const n = 48;
    try {
      p.setValueCurveAtTime(kind === 'in' ? eqCurve(n, cur, target, 'in') : eqCurve(n, cur, 0, 'out'), now + 0.001, Math.max(0.05, sec));
    } catch {
      p.setTargetAtTime(kind === 'in' ? target : 0, now, sec / 3);
    }
    if (kind === 'out') stopAt = now + sec + 0.05;
  }

  function dispose() {
    try {
      out.disconnect();
    } catch {
      /* already gone */
    }
  }

  return {
    spec,
    out,
    schedule,
    setIntensity,
    fade,
    dispose,
    get stopAt() {
      return stopAt;
    },
    get startedAt() {
      return startTime;
    },
    get notes() {
      return notes;
    },
  };
}

// The music controller: owns the players and the crossfades.
export function createMusic({ ctx, kit, dest, trims = MUSIC_TRIM, baker = null, dryKit = null }) {
  let theme = 'wood';
  let state = null;
  let intensity = 0;
  let current = null;
  const fading = [];
  const transitions = [];
  let lastTransitionMs = 0;
  let lastTransitionAt = 0;

  function trimFor(st, th) {
    return trims[`${st}:${th}`] ?? trims[st] ?? 0;
  }

  function setState(next, { crossfadeSec } = {}) {
    if (!MUSIC_STATES.includes(next)) return state;
    const themed = next === 'combat' || next === 'boss';
    if (next === state && (next === 'silence' || (current && current.spec.state === next && (!themed || current.spec.themeKey === theme)))) return state;
    const prev = state;
    const sec = crossfadeSec ?? (next === 'combat' ? CROSSFADE.toCombat : next === 'victory' || next === 'defeat' ? CROSSFADE.toStinger : prev === 'victory' || prev === 'defeat' ? CROSSFADE.fromStinger : CROSSFADE.default);
    state = next;
    if (current) {
      current.fade('out', sec);
      fading.push(current);
      current = null;
    }
    const spec = stateSpec(next, theme);
    if (spec) {
      spec.themeKey = theme;
      current = createPlayer(ctx, kit, dest, spec, { trimDb: trimFor(next, theme), intensity, baker });
      current.fade('in', sec);
      // Only the must-lead notes now; engine.update spreads the rest.
      current.schedule(ctx.currentTime + 0.25, 0, ctx.currentTime + 0.12);
    }
    lastTransitionMs = Math.round(sec * 1000);
    lastTransitionAt = ctx.currentTime;
    transitions.push({ from: prev, to: next, theme, at: Math.round(ctx.currentTime * 1000) / 1000, crossfadeMs: lastTransitionMs });
    if (transitions.length > 40) transitions.shift();
    return state;
  }

  // Queue the bakes of a state's notes (engine: the current state and the one
  // most likely next, so a fight's first bars are already samples).
  function prebake(st, th = theme) {
    if (!baker || !dryKit) return false;
    const job = stateNotesJob(st, th, dryKit, (key, build) => baker.request(key, build, { variants: 1 }));
    if (job) baker.addJob(job);
    return !!job;
  }

  function setTheme(id) {
    if (!THEMES[id] || id === theme) return theme;
    theme = id;
    // A theme only colours run states; re-enter the current one if it is themed.
    if (state === 'combat' || state === 'boss') {
      const st = state;
      state = null;
      setState(st, { crossfadeSec: CROSSFADE.default });
    }
    return theme;
  }

  function setIntensity(v) {
    const n = Math.max(0, Math.min(1, Number(v) || 0));
    if (Math.abs(n - intensity) < 0.01) return intensity;
    intensity = n;
    if (current) current.setIntensity(intensity);
    return intensity;
  }

  // update(lookahead, deadline, lead): see createPlayer().schedule — the
  // engine passes its frame-budget deadline and a 0.12 s must-lead window;
  // the hidden-tab timer passes neither (schedule everything).
  function update(lookahead = 0.2, deadline = Infinity, lead = lookahead) {
    const now = ctx.currentTime;
    if (current) current.schedule(now + lookahead, deadline, now + lead);
    for (let i = fading.length - 1; i >= 0; i--) {
      const p = fading[i];
      if (now >= p.stopAt + 0.5) {
        p.dispose();
        fading.splice(i, 1);
      } else p.schedule(Math.min(now + lookahead, p.stopAt), deadline, Math.min(now + lead, p.stopAt));
    }
  }

  // Seconds the current stinger has been playing (null outside stingers).
  function stingerElapsed() {
    if (!current || !current.spec.stinger) return null;
    return ctx.currentTime - current.startedAt;
  }

  function debug() {
    return {
      state,
      theme,
      intensity: Math.round(intensity * 100) / 100,
      crossfading: fading.length > 0 && ctx.currentTime - lastTransitionAt < lastTransitionMs / 1000,
      lastTransitionMs,
      sinceTransitionMs: Math.round((ctx.currentTime - lastTransitionAt) * 1000),
      bpm: current ? current.spec.bpm : null,
      scale: current ? current.spec.scale : null,
      layers: current ? current.spec.layers.map((l) => l.id) : [],
      players: (current ? 1 : 0) + fading.length,
      notes: { ...noteStats },
      transitions: transitions.slice(-12),
    };
  }

  return {
    setState,
    setTheme,
    setIntensity,
    update,
    prebake,
    stingerElapsed,
    debug,
    get state() {
      return state;
    },
    get theme() {
      return theme;
    },
    get intensity() {
      return intensity;
    },
  };
}
