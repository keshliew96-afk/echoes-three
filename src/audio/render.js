// Off-main-thread recipe renderer (gate G3.10, docs/gauntlet/fix-M3-r1.md).
// Owner: M3.
//
// The bake cache (bake.js) turns cue recipes and music notes into samples.
// Building a recipe in an OfflineAudioContext costs the MAIN thread the same
// node construction as playing it live (~0.1-1 ms per recipe, more in a
// fresh context) — so recipes are RECORDED on the main thread instead (a
// record kit with the voices.js primitive API that only notes each call: a
// few microseconds) and RENDERED in a Web Worker by a DSP twin of the
// primitives that follows the Web Audio maths the live path uses:
//
//   oscillators  Chrome's PeriodicWave construction for the built-in types —
//                4096-sample tables, 3 band-limited ranges per octave
//                (partials culled by 400 cents per range, range 0 = 2048
//                partials), every table scaled by the peak of range 0, the
//                two ranges around the instantaneous pitch cross-faded;
//                sine = the exact sine; detune in cents; FM (bell) adds the
//                modulator to the carrier frequency per sample.
//   biquads      the spec / Blink formulas (lowpass / highpass Q in dB,
//                bandpass Q linear), coefficients per sample while the
//                frequency automates.
//   AudioParams  setValueAtTime / linearRamp / exponentialRamp per sample
//                frame.
//   noise        the same white / brown / crackle tables (generated in the
//                worker), random start offset, playbackRate with linear
//                interpolation.
//
// Every primitive of a recipe sums into the recipe's destination, so a
// recipe is fully described by its list of primitive calls (the recipes use
// nothing but kit.tone / noise / bell / pluck / pad — the bake contract,
// engine.registerCue). A recipe the record kit cannot replay is refused by
// the baker and stays live-synthesised.

// ---------------------------------------------------------------- record --
// createRecordKit().record(build) -> { dur, noise, score: [[prim, t, opts]] }
export function createRecordKit() {
  let score = null;
  let noise = 0;
  const envEnd = (t, a, hold, d) => t + a + hold + d + 0.01;
  const kit = {
    ctx: null,
    buffers: {},
    prewarm: () => true,
    env() {
      throw new Error('record kit: env() is not a recordable primitive');
    },
    tone(dest, t, o = {}) {
      score.push(['tone', t, o]);
      return envEnd(t, o.a ?? 0.002, o.hold ?? 0, o.d ?? 0.12);
    },
    noise(dest, t, o = {}) {
      noise += 1;
      score.push(['noise', t, o]);
      return envEnd(t, o.a ?? 0.001, o.hold ?? 0, o.d ?? 0.08);
    },
    bell(dest, t, o = {}) {
      score.push(['bell', t, o]);
      return envEnd(t, o.a ?? 0.003, 0, o.d ?? 1.2);
    },
    pluck(dest, t, o = {}) {
      score.push(['pluck', t, o]);
      return envEnd(t, 0.003, 0, o.d ?? 0.9);
    },
    pad(dest, t, o = {}) {
      score.push(['pad', t, o]);
      return t + Math.max(o.a ?? 0.6, o.dur ?? 2) + (o.r ?? 1.4) + 0.01;
    },
  };
  function record(build) {
    score = [];
    noise = 0;
    const end = build(kit, 0, null);
    const out = { dur: Number.isFinite(end) ? end : NaN, noise, score };
    score = null;
    // Plain-data check: the score crosses to the worker by structured clone.
    const plain = (v) =>
      v === null || ['number', 'string', 'boolean', 'undefined'].includes(typeof v) || (Array.isArray(v) && v.every(plain)) || (typeof v === 'object' && v.constructor === Object && Object.values(v).every(plain));
    for (const [, , o] of out.score) if (!plain(o)) throw new Error('record kit: non-plain option');
    return out;
  }
  return { kit, record };
}

// ---------------------------------------------------------------- worker --
// Self-contained: stringified into a Blob worker (no module-scope refs).
function workerMain() {
  const SILENT = 0.0005;
  let SR = 48000;
  let NOISE = null;
  const TABLE_N = 4096;
  const RANGES = 36; // 3 per octave x log2(4096)
  const CENTS_PER_RANGE = 400;
  const tables = {}; // type -> Float32Array[] (lazy per range)
  const scale = {}; // type -> normalisation (1 / peak of range 0)

  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = ((inverse ? 2 : -2) * Math.PI) / len;
      const wr = Math.cos(ang);
      const wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1;
        let ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ar = re[i + k];
          const ai = im[i + k];
          const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ar + br;
          im[i + k] = ai + bi;
          re[i + k + len / 2] = ar - br;
          im[i + k + len / 2] = ai - bi;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
  }
  function coef(type, n) {
    const pf = 2 / (n * Math.PI);
    if (type === 'square') return n & 1 ? 2 * pf : 0;
    if (type === 'sawtooth') return pf * (n & 1 ? 1 : -1);
    if (type === 'triangle') return n & 1 ? 4 * pf * pf * (((n - 1) >> 1) & 1 ? -1 : 1) : 0;
    return n === 1 ? 1 : 0;
  }
  function partialsFor(range) {
    return Math.floor(Math.pow(2, (-range * CENTS_PER_RANGE) / 1200) * (TABLE_N / 2));
  }
  function buildTable(type, range) {
    const re = new Float64Array(TABLE_N);
    const im = new Float64Array(TABLE_N);
    const P = Math.min(TABLE_N / 2 - 1, partialsFor(range));
    for (let n = 1; n <= P; n++) {
      const b = coef(type, n);
      im[n] = -b / 2;
      im[TABLE_N - n] = b / 2;
    }
    fft(re, im, true); // x[k] = sum b_n sin(2 pi n k / N)
    const t = new Float32Array(TABLE_N + 1);
    for (let k = 0; k < TABLE_N; k++) t[k] = re[k];
    t[TABLE_N] = t[0];
    return t;
  }
  function table(type, range) {
    let list = tables[type];
    if (!list) {
      list = tables[type] = new Array(RANGES).fill(null);
      const t0 = buildTable(type, 0);
      let peak = 0;
      for (let k = 0; k < TABLE_N; k++) peak = Math.max(peak, Math.abs(t0[k]));
      scale[type] = peak > 0 ? 1 / peak : 1;
      for (let k = 0; k <= TABLE_N; k++) t0[k] *= scale[type];
      list[0] = t0;
    }
    if (!list[range]) {
      const t = buildTable(type, range);
      for (let k = 0; k <= TABLE_N; k++) t[k] *= scale[type];
      list[range] = t;
    }
    return list[range];
  }
  const lowestF = () => SR / TABLE_N;

  // AudioParam timeline: events [[kind, value, time]] kind 0 set / 1 lin / 2 exp.
  function paramCurve(events, def, f0, f1) {
    // values for frames [f0, f1)
    const out = new Float64Array(f1 - f0);
    let ei = 0;
    let v0 = def;
    let t0 = 0;
    for (let i = 0; i < out.length; i++) {
      const tt = (f0 + i) / SR;
      while (ei < events.length && events[ei][2] <= tt) {
        v0 = events[ei][1];
        t0 = events[ei][2];
        ei += 1;
      }
      let v = v0;
      if (ei < events.length) {
        const [k, v1, t1] = events[ei];
        if (k === 1 && t1 > t0) v = v0 + ((v1 - v0) * (tt - t0)) / (t1 - t0);
        else if (k === 2 && t1 > t0 && v0 * v1 > 0) v = v0 * Math.pow(v1 / v0, (tt - t0) / (t1 - t0));
      }
      out[i] = v;
    }
    return out;
  }
  function envEvents(t, a, peak, hold, d) {
    const p = Math.max(SILENT * 2, peak);
    const ev = [[0, 0, t], [1, p, t + a]];
    if (hold > 0) ev.push([0, p, t + a + hold]);
    const end = t + a + hold + d;
    ev.push([2, SILENT, end]);
    ev.push([0, 0, end + 0.005]);
    return { ev, end: end + 0.01 };
  }

  // Oscillator into dst (Float64Array) over frames [s, e) of the output.
  function osc(dst, s, e, type, freq, detuneCents, fm) {
    const n = e - s;
    const dmul = detuneCents ? Math.pow(2, detuneCents / 1200) : 1;
    if (type === 'sine') {
      let ph = 0;
      for (let i = 0; i < n; i++) {
        dst[i] += Math.sin(ph);
        const f = freq[i] * dmul + (fm ? fm[i] : 0);
        ph += (2 * Math.PI * f) / SR;
        if (ph > 1e6) ph %= 2 * Math.PI;
      }
      return;
    }
    let idx = 0;
    const lf = lowestF();
    let lastF = NaN;
    let fac = 0;
    let hiT = null;
    let loT = null;
    for (let i = 0; i < n; i++) {
      const f = Math.abs(freq[i] * dmul + (fm ? fm[i] : 0));
      if (f !== lastF) {
        lastF = f;
        const ratio = f > 0 ? f / lf : 0.5;
        let pr = 1 + (Math.log2(ratio) * 1200) / CENTS_PER_RANGE;
        pr = Math.max(0, Math.min(RANGES - 1, pr));
        const r1 = pr | 0;
        const r2 = r1 < RANGES - 1 ? r1 + 1 : r1;
        fac = pr - r1;
        hiT = table(type, r1);
        loT = table(type, r2);
      }
      const ip = idx | 0;
      const fr = idx - ip;
      const a = hiT[ip] + (hiT[ip + 1] - hiT[ip]) * fr;
      const b = loT[ip] + (loT[ip + 1] - loT[ip]) * fr;
      dst[i] += (1 - fac) * a + fac * b;
      idx += (f * TABLE_N) / SR;
      while (idx >= TABLE_N) idx -= TABLE_N;
    }
  }

  // Biquad in place over x (frames [s, e)); freq = per-frame Hz, q scalar.
  function biquad(x, type, freq, q) {
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    let lastF = NaN;
    let b0 = 1;
    let b1 = 0;
    let b2 = 0;
    let a1 = 0;
    let a2 = 0;
    const nyq = SR / 2;
    for (let i = 0; i < x.length; i++) {
      const f = freq[i];
      if (f !== lastF) {
        lastF = f;
        const c = Math.max(0, Math.min(1, f / nyq));
        const w0 = Math.PI * c;
        if (type === 'bandpass') {
          const Q = Math.max(0, q);
          if (c > 0 && c < 1 && Q > 0) {
            const alpha = Math.sin(w0) / (2 * Q);
            const k = Math.cos(w0);
            const a0 = 1 + alpha;
            b0 = alpha / a0;
            b1 = 0;
            b2 = -alpha / a0;
            a1 = (-2 * k) / a0;
            a2 = (1 - alpha) / a0;
          } else if (c > 0 && c < 1) {
            b0 = 1;
            b1 = b2 = a1 = a2 = 0;
          } else {
            b0 = b1 = b2 = a1 = a2 = 0;
          }
        } else if (type === 'highpass') {
          if (c >= 1) {
            b0 = b1 = b2 = a1 = a2 = 0;
          } else if (c > 0) {
            const g = Math.pow(10, -0.05 * q);
            const cw = Math.cos(w0);
            const alpha = 0.5 * Math.sin(w0) * g;
            const a0 = 1 + alpha;
            b0 = (0.5 * (1 + cw)) / a0;
            b1 = -(1 + cw) / a0;
            b2 = (0.5 * (1 + cw)) / a0;
            a1 = (-2 * cw) / a0;
            a2 = (1 - alpha) / a0;
          } else {
            b0 = 1;
            b1 = b2 = a1 = a2 = 0;
          }
        } else {
          // lowpass
          if (c >= 1) {
            b0 = 1;
            b1 = b2 = a1 = a2 = 0;
          } else if (c > 0) {
            const g = Math.pow(10, -0.05 * q);
            const cw = Math.cos(w0);
            const alpha = 0.5 * Math.sin(w0) * g;
            const a0 = 1 + alpha;
            b0 = (0.5 * (1 - cw)) / a0;
            b1 = (1 - cw) / a0;
            b2 = (0.5 * (1 - cw)) / a0;
            a1 = (-2 * cw) / a0;
            a2 = (1 - alpha) / a0;
          } else {
            b0 = b1 = b2 = a1 = a2 = 0;
          }
        }
      }
      const x0 = x[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
      x[i] = y0;
    }
  }

  function frames(t) {
    return Math.max(0, Math.ceil(t * SR - 1e-9));
  }

  // Each primitive renders into `out` (Float32Array) — the recipe's dest.
  function renderTone(out, t, o) {
    const type = o.type || 'sine';
    const f0 = o.f0 ?? 440;
    const f1 = o.f1 ?? f0;
    const a = o.a ?? 0.002;
    const hold = o.hold ?? 0;
    const d = o.d ?? 0.12;
    const E = envEvents(t, a, o.gain ?? 1, hold, d);
    const s = frames(t);
    const e = Math.min(out.length, frames(E.end + 0.02));
    if (e <= s) return;
    const fev = [[0, Math.max(1, f0), t]];
    if (f1 !== f0) fev.push([2, Math.max(1, f1), t + (o.glide ?? a + hold + d)]);
    const freq = paramCurve(fev, 440, s, e);
    const sig = new Float64Array(e - s);
    osc(sig, s, e, type, freq, o.detune || 0, null);
    if (o.filter) {
      const fl = o.filter;
      const qev = [[0, fl.f0 ?? fl.freq ?? 2000, t]];
      if (fl.f1) qev.push([2, fl.f1, t + (fl.glide ?? a + hold + d)]);
      biquad(sig, fl.type || 'lowpass', paramCurve(qev, 350, s, e), fl.q ?? 0.7);
    }
    const g = paramCurve(E.ev, 1, s, e);
    for (let i = 0; i < sig.length; i++) out[s + i] += sig[i] * g[i];
  }

  function renderNoise(out, t, o) {
    const a = o.a ?? 0.001;
    const hold = o.hold ?? 0;
    const d = o.d ?? 0.08;
    const E = envEvents(t, a, o.gain ?? 1, hold, d);
    const s = frames(t);
    const e = Math.min(out.length, frames(E.end + 0.02));
    if (e <= s) return;
    const buf = NOISE[o.src] || NOISE.white;
    const rate = o.rate ?? 1;
    const off = Math.random() * Math.max(0, buf.length / SR - (a + hold + d) - 0.05);
    const sig = new Float64Array(e - s);
    if (rate === 1) {
      // AudioBufferSourceNode's unity-rate path copies frames from the
      // truncated start index (no interpolation).
      const p0 = Math.floor(off * SR);
      for (let i = 0; i < sig.length && p0 + i < buf.length; i++) sig[i] = buf[p0 + i];
    } else {
      let pos = off * SR;
      for (let i = 0; i < sig.length; i++) {
        const ip = pos | 0;
        if (ip + 1 >= buf.length) break;
        sig[i] = buf[ip] + (buf[ip + 1] - buf[ip]) * (pos - ip);
        pos += rate;
      }
    }
    const f0 = o.f0 ?? 1500;
    const f1 = o.f1 ?? f0;
    const fev = [[0, f0, t]];
    if (f1 !== f0) fev.push([2, Math.max(20, f1), t + (o.glide ?? a + hold + d)]);
    biquad(sig, o.type || 'bandpass', paramCurve(fev, 350, s, e), o.q ?? 1);
    const g = paramCurve(E.ev, 1, s, e);
    for (let i = 0; i < sig.length; i++) out[s + i] += sig[i] * g[i];
  }

  function renderBell(out, t, o) {
    const f = o.f ?? 660;
    const ratio = o.ratio ?? 2.76;
    const index = o.index ?? 2.5;
    const a = o.a ?? 0.003;
    const d = o.d ?? 1.2;
    const E = envEvents(t, a, o.gain ?? 1, 0, d);
    const s = frames(t);
    const e = Math.min(out.length, frames(E.end + 0.02));
    if (e <= s) return;
    const n = e - s;
    const modF = new Float64Array(n).fill(f * ratio);
    const mod = new Float64Array(n);
    osc(mod, s, e, 'sine', modF, 0, null);
    const mg = paramCurve([[0, f * index, t], [2, Math.max(1, f * 0.05), t + a + d * 0.6]], 1, s, e);
    for (let i = 0; i < n; i++) mod[i] *= mg[i];
    const car = new Float64Array(n);
    const carF = new Float64Array(n).fill(f);
    osc(car, s, e, 'sine', carF, 0, mod);
    const g = paramCurve(E.ev, 1, s, e);
    for (let i = 0; i < n; i++) out[s + i] += car[i] * g[i];
  }

  function renderPluck(out, t, o) {
    const f = o.f ?? 330;
    const d = o.d ?? 0.9;
    const bright = o.bright ?? 3200;
    const dark = o.dark ?? 600;
    const E = envEvents(t, 0.003, o.gain ?? 1, 0, d);
    const s = frames(t);
    const e = Math.min(out.length, frames(E.end + 0.02));
    if (e <= s) return;
    const n = e - s;
    const fq = new Float64Array(n).fill(f);
    const sig = new Float64Array(n);
    osc(sig, s, e, 'triangle', fq, 0, null);
    const saw = new Float64Array(n);
    osc(saw, s, e, 'sawtooth', fq, 7, null);
    for (let i = 0; i < n; i++) sig[i] += saw[i] * 0.35;
    biquad(sig, 'lowpass', paramCurve([[0, bright, t], [2, dark, t + Math.min(0.4, d)]], 350, s, e), 1.2);
    const g = paramCurve(E.ev, 1, s, e);
    for (let i = 0; i < n; i++) out[s + i] += sig[i] * g[i];
  }

  function renderPad(out, t, o) {
    const notes = o.notes || [220];
    const dur = o.dur ?? 2;
    const a = o.a ?? 0.6;
    const r = o.r ?? 1.4;
    const p = Math.max(SILENT * 2, o.gain ?? 1);
    const end = t + Math.max(a, dur) + r;
    const s = frames(t);
    const e = Math.min(out.length, frames(end + 0.03));
    if (e <= s) return;
    const n = e - s;
    const sig = new Float64Array(n);
    const type = o.type || 'sawtooth';
    for (const hz of notes) {
      const fq = new Float64Array(n).fill(hz);
      for (const det of [-6, 6]) osc(sig, s, e, type, fq, det, null);
    }
    const per = 1 / Math.max(1, notes.length);
    for (let i = 0; i < n; i++) sig[i] *= per * 0.5;
    const formant = o.formant || null;
    const fq = new Float64Array(n).fill(formant || o.cutoff || 900);
    biquad(sig, formant ? 'bandpass' : 'lowpass', fq, formant ? 2.2 : o.q ?? 0.6);
    const g = paramCurve([[0, 0, t], [1, p, t + a], [0, p, t + Math.max(a, dur)], [2, SILENT, end], [0, 0, end + 0.005]], 1, s, e);
    for (let i = 0; i < n; i++) out[s + i] += sig[i] * g[i];
  }

  const PRIMS = { tone: renderTone, noise: renderNoise, bell: renderBell, pluck: renderPluck, pad: renderPad };

  function makeNoise() {
    const white = new Float32Array(Math.floor(SR * 1.5));
    for (let i = 0; i < white.length; i++) white[i] = Math.random() * 2 - 1;
    const norm = (d) => {
      let m = 0;
      for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
      if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.98 / m;
    };
    const brown = new Float32Array(Math.floor(SR * 3));
    let last = 0;
    for (let i = 0; i < brown.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      brown[i] = last;
    }
    norm(brown);
    const crackle = new Float32Array(Math.floor(SR * 4));
    let i = 0;
    while (i < crackle.length) {
      i += Math.floor(SR * (0.02 + Math.random() * Math.random() * 0.35));
      const amp = 0.25 + Math.random() * 0.75;
      const len = Math.floor(SR * (0.001 + Math.random() * 0.004));
      for (let k = 0; k < len && i + k < crackle.length; k++) crackle[i + k] += amp * (Math.random() * 2 - 1) * (1 - k / len);
    }
    norm(crackle);
    return { white, brown, crackle };
  }

  self.onmessage = (ev) => {
    const m = ev.data;
    if (!m) return;
    if (m.t === 'init') {
      SR = m.sr;
      NOISE = makeNoise();
      self.postMessage({ t: 'ready' });
      return;
    }
    if (m.t !== 'render') return;
    const results = [];
    const transfer = [];
    for (const job of m.jobs) {
      try {
        const len = Math.max(1, Math.ceil(job.dur * SR)) + 1; // +1 guard frame for interpolation
        const out = new Float32Array(len);
        for (const [prim, t, o] of job.score) PRIMS[prim](out, t, o);
        out[len - 1] = 0;
        results.push({ id: job.id, data: out });
        transfer.push(out.buffer);
      } catch (err) {
        results.push({ id: job.id, error: String((err && err.message) || err) });
      }
    }
    self.postMessage({ t: 'done', results }, transfer);
  };
}

export const RENDER_WORKER_SOURCE = `(${workerMain.toString()})();`;

// createRenderer({ sampleRate }) -> { ok, render(jobs) -> Promise<results> }
// jobs: [{ id, dur, score }]. One request in flight at a time is enough (the
// baker batches); results arrive as transferred Float32Arrays.
export function createRenderer({ sampleRate }) {
  let worker = null;
  let ok = false;
  let dead = false;
  const waiting = [];
  try {
    const url = URL.createObjectURL(new Blob([RENDER_WORKER_SOURCE], { type: 'application/javascript' }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.t === 'ready') {
        ok = true;
        return;
      }
      if (m.t === 'done') {
        const w = waiting.shift();
        if (w) w.resolve(m.results);
      }
    };
    worker.onerror = () => {
      dead = true;
      ok = false;
      while (waiting.length) waiting.shift().reject(new Error('render worker failed'));
    };
    worker.postMessage({ t: 'init', sr: sampleRate });
  } catch {
    dead = true;
  }
  function render(jobs) {
    if (!worker || dead) return Promise.reject(new Error('render worker unavailable'));
    return new Promise((resolve, reject) => {
      waiting.push({ resolve, reject });
      worker.postMessage({ t: 'render', jobs });
    });
  }
  return {
    render,
    get ok() {
      return ok && !dead;
    },
    get dead() {
      return dead;
    },
    get inFlight() {
      return waiting.length;
    },
  };
}
