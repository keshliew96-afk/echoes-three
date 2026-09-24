// Level meters (docs/gauntlet/PLAN.md §3.5 / §6.4 `__echoes.audio.meter`).
// Owner: M3. Headless Chrome renders Web Audio to a null sink, but every
// sample still flows through the graph, so these taps are how critics
// measure balance, decoupling and clipping without ears.
//
// Primary path: an AudioWorklet ("echoes-meter", source inlined below as a
// Blob module) accumulates every sample ON THE AUDIO THREAD and posts one
// summary per 100 ms window — sum of squares L/R, peak, samples over -1 dBFS,
// samples at/over 0 dBFS. The main thread only files those windows, so the
// meters cost ~nothing per frame (gate G3.10) and keep exact sample coverage
// even while rAF is throttled.
// Fallback (no AudioWorklet): ChannelSplitter + AnalyserNodes read once per
// rendered frame, counting only the samples that arrived since the last read.
// Spectral centroid (music / sfx / master taps): computed IN THE WORKLET
// too (G3.10, docs/gauntlet/fix-M3-r1.md) — every 2048-sample block of the
// left channel gets the AnalyserNode's own analysis (Blackman window, FFT,
// power per bin |X_k/N|^2, bins > -140 dB), and the power-weighted mean
// frequency rides the 100 ms window message. Zero main-thread cost and
// every block counted (the old path sampled an AnalyserNode FFT on the main
// thread a few times per second; it remains only as the no-worklet fallback).

const DB = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const R2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : v === Infinity ? 999 : -999);
const OVER_M1 = Math.pow(10, -1 / 20); // 0.891
const HISTORY_MAX = 12000; // 100 ms windows = 20 minutes

export const METER_WORKLET_SOURCE = `
const OVER = ${OVER_M1};
const FFT_N = 2048;
class EchoesMeter extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.win = Math.max(128, Math.round(sampleRate / 10));
    this.cent = !!(options && options.processorOptions && options.processorOptions.centroid);
    if (this.cent) {
      const N = FFT_N;
      this.blk = new Float32Array(N);
      this.bi = 0;
      this.re = new Float64Array(N);
      this.im = new Float64Array(N);
      this.wnd = new Float64Array(N);
      for (let n = 0; n < N; n++) this.wnd[n] = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / N) + 0.08 * Math.cos((4 * Math.PI * n) / N);
      this.rev = new Uint32Array(N);
      const bits = Math.log2(N);
      for (let i = 0; i < N; i++) {
        let r = 0;
        for (let k = 0; k < bits; k++) r |= ((i >> k) & 1) << (bits - 1 - k);
        this.rev[i] = r;
      }
      this.cos = new Float64Array(N / 2);
      this.sin = new Float64Array(N / 2);
      for (let i = 0; i < N / 2; i++) {
        this.cos[i] = Math.cos((2 * Math.PI * i) / N);
        this.sin[i] = -Math.sin((2 * Math.PI * i) / N);
      }
    }
    this.clear();
    this.port.onmessage = (e) => { if (e.data === 'reset') this.clear(); };
  }
  clear() { this.sl = 0; this.sr = 0; this.pk = 0; this.ov = 0; this.cl = 0; this.n = 0; this.cs = 0; this.cw = 0; }
  // Spectral centroid of one block, weighted by its power (AnalyserNode maths).
  centroid() {
    const N = FFT_N, re = this.re, im = this.im, rev = this.rev, blk = this.blk, wnd = this.wnd;
    for (let i = 0; i < N; i++) { const j = rev[i]; re[j] = blk[i] * wnd[i]; im[j] = 0; }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let st = 0; st < N; st += size) {
        for (let k = 0; k < half; k++) {
          const c = this.cos[k * step], s = this.sin[k * step];
          const a = st + k, b = a + half;
          const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    const binHz = sampleRate / N, inv = 1 / (N * N);
    let pw = 0, pf = 0;
    for (let k = 1; k < N / 2; k++) {
      const p = (re[k] * re[k] + im[k] * im[k]) * inv;
      if (!(p > 1e-14)) continue;
      pw += p;
      pf += p * k * binHz;
    }
    if (pw > 1e-12) { this.cs += pf; this.cw += pw; }
  }
  process(inputs) {
    const inp = inputs[0];
    const L = inp && inp[0];
    if (L) {
      const R = inp[1] || L;
      let sl = this.sl, sr = this.sr, pk = this.pk, ov = this.ov, cl = this.cl;
      for (let i = 0; i < L.length; i++) {
        const l = L[i], r = R[i];
        const al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
        sl += l * l; sr += r * r;
        if (al > pk) pk = al;
        if (ar > pk) pk = ar;
        if (al > OVER) ov++;
        if (ar > OVER) ov++;
        if (al >= 1) cl++;
        if (ar >= 1) cl++;
      }
      this.sl = sl; this.sr = sr; this.pk = pk; this.ov = ov; this.cl = cl;
      this.n += L.length;
      if (this.cent) {
        for (let i = 0; i < L.length; i++) {
          this.blk[this.bi++] = L[i];
          if (this.bi === FFT_N) { this.bi = 0; this.centroid(); }
        }
      }
    } else this.n += 128;
    if (this.n >= this.win) {
      this.port.postMessage([this.sl, this.sr, this.pk, this.ov, this.cl, this.n, this.cs, this.cw]);
      this.clear();
    }
    return true;
  }
}
registerProcessor('echoes-meter', EchoesMeter);
`;

// Loads the worklet module once per context. Resolves true when available.
export function loadMeterWorklet(ctx) {
  if (!ctx.audioWorklet || typeof Blob === 'undefined' || typeof URL === 'undefined') return Promise.resolve(false);
  const url = URL.createObjectURL(new Blob([METER_WORKLET_SOURCE], { type: 'application/javascript' }));
  return ctx.audioWorklet
    .addModule(url)
    .then(
      () => true,
      () => false
    )
    .finally(() => URL.revokeObjectURL(url));
}

function fresh() {
  return { sumL: 0, sumR: 0, n: 0, peak: 0, over: 0, clips: 0, hist: [], centSum: 0, centW: 0, lostSamples: 0 };
}

// createMeterTap(ctx, source, { name, worklet, centroid, sink })
//   worklet: true when loadMeterWorklet resolved true
//   sink: a node the worklet's silent output can feed (keeps it pulled)
//   onCost: (ms) => void — main-thread time spent filing worklet windows is
//   reported to the engine's per-frame cost accounting (G3.10)
export function createMeterTap(ctx, source, { name, worklet = false, centroid = false, sink = null, onCost = null } = {}) {
  let acc = fresh();
  let uiPeak = 0;
  let node = null;
  let aL = null;
  let aR = null;
  let bufL = null;
  let bufR = null;
  let lastT = null;
  const fft = 2048;

  function fileWindow(sl, sr, pk, ov, cl, n, cs = 0, cw = 0) {
    acc.centSum += cs;
    acc.centW += cw;
    acc.sumL += sl;
    acc.sumR += sr;
    acc.n += n;
    if (pk > acc.peak) acc.peak = pk;
    acc.over += ov;
    acc.clips += cl;
    acc.hist.push([Math.sqrt((sl + sr) / (2 * Math.max(1, n))), pk]);
    if (acc.hist.length > HISTORY_MAX) acc.hist.shift();
    uiPeak = Math.max(pk, uiPeak * 0.6);
  }

  if (worklet && typeof AudioWorkletNode !== 'undefined') {
    try {
      node = new AudioWorkletNode(ctx, 'echoes-meter', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
        processorOptions: { centroid: !!centroid },
      });
      node.port.onmessage = (e) => {
        const t0 = performance.now();
        const d = e.data;
        fileWindow(d[0], d[1], d[2], d[3], d[4], d[5], d[6] || 0, d[7] || 0);
        if (onCost) onCost(performance.now() - t0);
      };
      source.connect(node);
      // The processor writes nothing to its output (silence); connecting it
      // keeps it in the rendered graph on every browser.
      if (sink) node.connect(sink);
    } catch {
      node = null;
    }
  }
  if (!node) {
    const split = ctx.createChannelSplitter(2);
    source.connect(split);
    aL = ctx.createAnalyser();
    aL.fftSize = fft;
    aL.smoothingTimeConstant = 0;
    split.connect(aL, 0);
    if (!node) {
      aR = ctx.createAnalyser();
      aR.fftSize = fft;
      aR.smoothingTimeConstant = 0;
      split.connect(aR, 1);
      bufL = new Float32Array(fft);
      bufR = new Float32Array(fft);
    }
  }
  const freq = centroid && aL ? new Float32Array(aL.frequencyBinCount) : null;
  const winSamples = Math.round(ctx.sampleRate / 10);
  let pend = { sl: 0, sr: 0, pk: 0, ov: 0, cl: 0, n: 0 };

  // Fallback per-frame read (analyser path only).
  function read(now) {
    if (node || !aR) return;
    const sr = ctx.sampleRate;
    let n = lastT === null ? 0 : Math.round((now - lastT) * sr);
    lastT = now;
    if (n <= 0) return;
    if (n > fft) {
      acc.lostSamples += n - fft;
      n = fft;
    }
    aL.getFloatTimeDomainData(bufL);
    aR.getFloatTimeDomainData(bufR);
    for (let i = fft - n; i < fft; i++) {
      const l = bufL[i];
      const r = bufR[i];
      const al = l < 0 ? -l : l;
      const ar = r < 0 ? -r : r;
      pend.sl += l * l;
      pend.sr += r * r;
      if (al > pend.pk) pend.pk = al;
      if (ar > pend.pk) pend.pk = ar;
      if (al > OVER_M1) pend.ov += 1;
      if (ar > OVER_M1) pend.ov += 1;
      if (al >= 1) pend.cl += 1;
      if (ar >= 1) pend.cl += 1;
      pend.n += 1;
      if (pend.n >= winSamples) {
        fileWindow(pend.sl, pend.sr, pend.pk, pend.ov, pend.cl, pend.n);
        pend = { sl: 0, sr: 0, pk: 0, ov: 0, cl: 0, n: 0 };
      }
    }
  }

  // Fallback path only (no AudioWorklet); the worklet computes it itself.
  function sampleCentroid() {
    if (!freq || node) return;
    aL.getFloatFrequencyData(freq);
    const binHz = ctx.sampleRate / fft;
    let pw = 0;
    let pf = 0;
    for (let k = 1; k < freq.length; k++) {
      const db = freq[k];
      if (!(db > -140)) continue;
      const p = Math.pow(10, db / 10);
      pw += p;
      pf += p * k * binHz;
    }
    if (pw > 1e-12) {
      acc.centSum += (pf / pw) * pw;
      acc.centW += pw;
    }
  }

  function reset() {
    acc = fresh();
    pend = { sl: 0, sr: 0, pk: 0, ov: 0, cl: 0, n: 0 };
    lastT = null;
    if (node) node.port.postMessage('reset');
  }

  function longestBelow(dbfs) {
    const lim = Math.pow(10, dbfs / 20);
    let best = 0;
    let cur = 0;
    for (const w of acc.hist) {
      if (w[0] < lim) {
        cur += 1;
        if (cur > best) best = cur;
      } else cur = 0;
    }
    return best * 100;
  }

  function rms400() {
    const out = [];
    const h = acc.hist;
    for (let i = 0; i + 3 < h.length; i += 4) {
      const s = (h[i][0] ** 2 + h[i + 1][0] ** 2 + h[i + 2][0] ** 2 + h[i + 3][0] ** 2) / 4;
      out.push(DB(Math.sqrt(s)));
    }
    return out;
  }

  function quantile(arr, q) {
    if (!arr.length) return -Infinity;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
  }

  function stats() {
    const n = Math.max(1, acc.n);
    const lr = Math.sqrt(acc.sumL / n);
    const rr = Math.sqrt(acc.sumR / n);
    const h = acc.hist;
    const recent = h.slice(-15);
    const short = h.slice(-4);
    const shortRms = short.length ? Math.sqrt(short.reduce((s, w) => s + w[0] * w[0], 0) / short.length) : 0;
    const w400 = rms400();
    return {
      tap: name,
      source: node ? 'worklet' : 'analyser',
      centroidSource: node ? 'worklet-fft' : 'analyser-fft',
      rmsDb: R2(DB(Math.sqrt((lr * lr + rr * rr) / 2))),
      lRmsDb: R2(DB(lr)),
      rRmsDb: R2(DB(rr)),
      peakDb: R2(DB(acc.peak)),
      peakHoldDb: R2(DB(recent.reduce((m, w) => Math.max(m, w[1]), 0))),
      shortRmsDb: R2(DB(shortRms)),
      clipCount: acc.clips,
      overMinus1Pct: Math.round(((acc.over / (2 * n)) * 100) * 10000) / 10000,
      samples: acc.n,
      seconds: Math.round((acc.n / ctx.sampleRate) * 100) / 100,
      lostSamples: acc.lostSamples,
      windows100: h.length,
      medianRms400Db: R2(quantile(w400, 0.5)),
      p10Rms400Db: R2(quantile(w400, 0.1)),
      p90Rms400Db: R2(quantile(w400, 0.9)),
      longestBelowMinus50Ms: longestBelow(-50),
      centroidHz: acc.centW > 0 ? Math.round(acc.centSum / acc.centW) : null,
    };
  }

  function history(nWin = 50) {
    return acc.hist.slice(-nWin).map(([r, p]) => [R2(DB(r)), R2(DB(p))]);
  }

  return {
    name,
    read,
    sampleCentroid,
    reset,
    stats,
    history,
    longestBelow,
    get uiLevel() {
      return uiPeak;
    },
    get worklet() {
      return !!node;
    },
  };
}

// Limiter gain-reduction monitor (G3.3): DynamicsCompressorNode.reduction is
// sampled once per rendered frame; the audio-clock delta between samples
// weights each reading, so window/excursion durations are real time.
export function createReductionMonitor(ctx, comp) {
  let acc;
  function reset() {
    acc = { win: { max: 0, dur: 0 }, windows: 0, under6: 0, maxDb: 0, overRun: 0, excursions: 0, longestOverMs: 0, lastT: null };
  }
  reset();
  function read(now) {
    const red = Math.abs(Number(comp.reduction) || 0);
    if (acc.lastT === null) {
      acc.lastT = now;
      return;
    }
    const dt = Math.max(0, now - acc.lastT);
    acc.lastT = now;
    if (red > acc.maxDb) acc.maxDb = red;
    const w = acc.win;
    if (red > w.max) w.max = red;
    w.dur += dt;
    if (w.dur >= 0.1) {
      acc.windows += 1;
      if (w.max <= 6) acc.under6 += 1;
      w.max = 0;
      w.dur = 0;
    }
    if (red > 10) {
      acc.overRun += dt;
    } else if (acc.overRun > 0) {
      if (acc.overRun > 0.05) acc.excursions += 1;
      acc.longestOverMs = Math.max(acc.longestOverMs, acc.overRun * 1000);
      acc.overRun = 0;
    }
  }
  function stats() {
    return {
      reductionDb: Math.round((Number(comp.reduction) || 0) * 100) / 100,
      maxReductionDb: Math.round(acc.maxDb * 100) / 100,
      windows100: acc.windows,
      pctWindowsUnder6dB: acc.windows ? Math.round((acc.under6 / acc.windows) * 10000) / 100 : 100,
      excursionsOver10dB: acc.excursions + (acc.overRun > 0.05 ? 1 : 0),
      longestOver10dBMs: Math.round(Math.max(acc.longestOverMs, acc.overRun * 1000)),
    };
  }
  return { read, reset, stats };
}
