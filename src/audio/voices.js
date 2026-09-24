// Procedural voice kit (docs/gauntlet/PLAN.md §3.5, BUILD_BRIEF §21 / ruling
// A9: WebAudio synthesis only, no audio files). Owner: M3.
//
// createVoiceKit(ctx) -> kit: small, allocation-light building blocks that
// every SFX cue (cues.js), music instrument (music.js) and ambient bed
// (ambient.js) is written in. Each primitive schedules its own nodes at an
// absolute AudioContext time `t`, connects them into `dest`, stops its
// sources itself and returns the time its output has decayed to silence —
// the engine keeps a voice alive until the largest returned end time.
//
// Shared noise buffers are generated once per context (white, brown and a
// sparse "crackle" track) with Math.random — cosmetic, never the sim RNG.

const SILENT = 0.0005; // -66 dB: the exponential-decay floor

function makeBuffer(ctx, seconds, fill) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  fill(buf.getChannelData(0), ctx.sampleRate);
  return buf;
}

function normalise(d, peak = 0.98) {
  let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) {
    const k = peak / m;
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
}

export function createVoiceKit(ctx, { shared = null } = {}) {
  // Noise tables are generated lazily (first use) or by prewarm() in idle
  // slices after the unlock, so the unlock gesture never pays for them.
  // `shared` = another kit's `buffers` (AudioBuffers are context-independent):
  // an OfflineAudioContext kit (tools/gntfixM31-fidelity.mjs) reuses the live
  // kit's tables instead of generating its own.
  const GEN = {
    white: () => makeBuffer(ctx, 1.5, (d) => {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }),
    // Brown (integrated) noise: the body of wind, fire roar, rumbles.
    brown: () => makeBuffer(ctx, 3, (d) => {
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last;
      }
      normalise(d);
    }),
    // Sparse crackle: short decaying clicks at random intervals (camp fire).
    crackle: () => makeBuffer(ctx, 4, (d, sr) => {
      let i = 0;
      while (i < d.length) {
        i += Math.floor(sr * (0.02 + Math.random() * Math.random() * 0.35));
        const amp = 0.25 + Math.random() * 0.75;
        const len = Math.floor(sr * (0.001 + Math.random() * 0.004));
        for (let k = 0; k < len && i + k < d.length; k++) d[i + k] += amp * (Math.random() * 2 - 1) * (1 - k / len);
      }
      normalise(d);
    }),
  };
  const made = {};
  const buffers = shared || {};
  if (!shared) for (const k of Object.keys(GEN)) {
    Object.defineProperty(buffers, k, {
      enumerable: true,
      get: () => made[k] || (made[k] = GEN[k]()),
    });
  }
  // prewarm(): generate one missing table per call; returns true when all exist.
  function prewarm() {
    if (shared) return true;
    for (const k of Object.keys(GEN)) {
      if (!made[k]) {
        made[k] = GEN[k]();
        return false;
      }
    }
    return true;
  }

  // Gain envelope: 0 -> peak over `a`, (optional hold), exponential decay
  // over `d`. Returns { node, end }.
  function env(dest, t, { a = 0.002, peak = 1, hold = 0, d = 0.1 } = {}) {
    const g = ctx.createGain();
    const p = Math.max(SILENT * 2, peak);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(p, t + a);
    if (hold > 0) g.gain.setValueAtTime(p, t + a + hold);
    const end = t + a + hold + d;
    g.gain.exponentialRampToValueAtTime(SILENT, end);
    g.gain.setValueAtTime(0, end + 0.005);
    g.connect(dest);
    return { node: g, end: end + 0.01 };
  }

  // Oscillator with an exponential pitch glide f0 -> f1 over `glide` s.
  function tone(dest, t, { type = 'sine', f0 = 440, f1 = f0, glide, a = 0.002, hold = 0, d = 0.12, gain = 1, detune = 0, filter = null } = {}) {
    const e = env(dest, t, { a, peak: gain, hold, d });
    const o = ctx.createOscillator();
    o.type = type;
    if (detune) o.detune.setValueAtTime(detune, t);
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + (glide ?? a + hold + d));
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.setValueAtTime(filter.f0 ?? filter.freq ?? 2000, t);
      if (filter.f1) f.frequency.exponentialRampToValueAtTime(filter.f1, t + (filter.glide ?? a + hold + d));
      f.Q.value = filter.q ?? 0.7;
      o.connect(f);
      f.connect(e.node);
    } else o.connect(e.node);
    o.start(t);
    o.stop(e.end + 0.02);
    return e.end;
  }

  // Filtered noise burst; the filter centre glides f0 -> f1.
  function noise(dest, t, { src = 'white', type = 'bandpass', f0 = 1500, f1 = f0, glide, q = 1, a = 0.001, hold = 0, d = 0.08, gain = 1, rate = 1 } = {}) {
    const e = env(dest, t, { a, peak: gain, hold, d });
    const s = ctx.createBufferSource();
    s.buffer = buffers[src] || buffers.white;
    s.playbackRate.value = rate;
    // Random start offset so repeated bursts never share a waveform.
    const off = Math.random() * Math.max(0, s.buffer.duration - (a + hold + d) - 0.05);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + (glide ?? a + hold + d));
    f.Q.value = q;
    s.connect(f);
    f.connect(e.node);
    s.start(t, off);
    s.stop(e.end + 0.02);
    return e.end;
  }

  // Two-operator FM bell / metallic tone: modulator at f*ratio, index decays.
  function bell(dest, t, { f = 660, ratio = 2.76, index = 2.5, a = 0.003, d = 1.2, gain = 1 } = {}) {
    const e = env(dest, t, { a, peak: gain, d });
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const mg = ctx.createGain();
    car.frequency.setValueAtTime(f, t);
    mod.frequency.setValueAtTime(f * ratio, t);
    mg.gain.setValueAtTime(f * index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.05), t + a + d * 0.6);
    mod.connect(mg);
    mg.connect(car.frequency);
    car.connect(e.node);
    car.start(t);
    mod.start(t);
    car.stop(e.end + 0.02);
    mod.stop(e.end + 0.02);
    return e.end;
  }

  // Plucked string (lute / harp): detuned triangle + quiet saw through a
  // lowpass whose cutoff falls with the note — reads as a pluck, not a beep.
  function pluck(dest, t, { f = 330, d = 0.9, gain = 1, bright = 3200, dark = 600 } = {}) {
    const e = env(dest, t, { a: 0.003, peak: gain, d });
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(bright, t);
    lp.frequency.exponentialRampToValueAtTime(dark, t + Math.min(0.4, d));
    lp.Q.value = 1.2;
    lp.connect(e.node);
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(f, t);
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(f, t);
    o2.detune.setValueAtTime(7, t);
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    o1.start(t);
    o2.start(t);
    o1.stop(e.end + 0.02);
    o2.stop(e.end + 0.02);
    return e.end;
  }

  // Sustained pad chord: two detuned saws per note into one lowpass, slow
  // attack + long release so consecutive bars overlap into a continuous bed.
  function pad(dest, t, { notes = [220], dur = 2, a = 0.6, r = 1.4, gain = 1, cutoff = 900, q = 0.6, type = 'sawtooth', formant = null } = {}) {
    const g = ctx.createGain();
    const p = Math.max(SILENT * 2, gain);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(p, t + a);
    g.gain.setValueAtTime(p, t + Math.max(a, dur));
    const end = t + Math.max(a, dur) + r;
    g.gain.exponentialRampToValueAtTime(SILENT, end);
    g.gain.setValueAtTime(0, end + 0.005);
    g.connect(dest);
    const f = ctx.createBiquadFilter();
    f.type = formant ? 'bandpass' : 'lowpass';
    f.frequency.value = formant || cutoff;
    f.Q.value = formant ? 2.2 : q;
    f.connect(g);
    const per = 1 / Math.max(1, notes.length);
    const mix = ctx.createGain();
    mix.gain.value = per * 0.5;
    mix.connect(f);
    const oscs = [];
    for (const hz of notes) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(hz, t);
        o.detune.setValueAtTime(det, t);
        o.connect(mix);
        o.start(t);
        o.stop(end + 0.03);
        oscs.push(o);
      }
    }
    return end + 0.01;
  }

  return {
    ctx,
    buffers,
    prewarm,
    env,
    tone,
    noise,
    bell,
    pluck,
    pad,
  };
}

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Dry kit (G3.10): the same primitive API with NO nodes — every call only
// returns the end time the real primitive would return (the same default
// parameters and envelope arithmetic as above) and counts the noise bursts.
// measure(build) -> { dur, noise } for a recipe `build(kit, t, dest) -> end`
// started at t = 0. The engine hands its kit to the music sequencer's
// state-note enumeration (music.js stateNotesJob), which only needs the calls
// to be harmless. The bake itself records recipes with render.js's record kit
// (same arithmetic) and renders them in the worker.
export function createDryKit() {
  let noiseCalls = 0;
  const envEnd = (t, a, hold, d) => t + a + hold + d + 0.01;
  const kit = {
    ctx: null,
    buffers: {},
    prewarm: () => true,
    env: (dest, t, { a = 0.002, hold = 0, d = 0.1 } = {}) => ({ node: null, end: envEnd(t, a, hold, d) }),
    tone: (dest, t, { a = 0.002, hold = 0, d = 0.12 } = {}) => envEnd(t, a, hold, d),
    noise: (dest, t, { a = 0.001, hold = 0, d = 0.08 } = {}) => {
      noiseCalls += 1;
      return envEnd(t, a, hold, d);
    },
    bell: (dest, t, { a = 0.003, d = 1.2 } = {}) => envEnd(t, a, 0, d),
    pluck: (dest, t, { d = 0.9 } = {}) => envEnd(t, 0.003, 0, d),
    pad: (dest, t, { dur = 2, a = 0.6, r = 1.4 } = {}) => t + Math.max(a, dur) + r + 0.01,
  };
  function measure(build) {
    noiseCalls = 0;
    const end = build(kit, 0, null);
    return { dur: Number.isFinite(end) ? end : NaN, noise: noiseCalls };
  }
  return { kit, measure };
}
