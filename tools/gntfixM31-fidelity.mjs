// Fix builder M3 round 1 — fidelity of the worker DSP renderer (src/audio/render.js) against Web Audio
// itself: every built-in cue recipe (src/audio/cues.js) and a spread of music instrument notes are
// rendered twice — in an OfflineAudioContext with the live kit (the pre-fix live-synthesis maths) and by
// the render worker from the recorded score — and compared: peak dB, RMS dB, spectral centroid, and for
// recipes without noise the normalised waveform error (residual RMS relative to the signal RMS, in dB).
//   node tools/gntfixM31-fidelity.mjs [--out gntfixM31-fidelity.json]
import { launchEchoes } from './gnt-arch-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = arg('--out', 'gntfixM31-fidelity.json');
const browser = await launchEchoes({ gpu: true, autoplay: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto('http://127.0.0.1:5199/?menu=0&seed=7&fresh=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 30, { timeout: 120000 });
  const r = await page.evaluate(async () => {
    const V = await import('/src/audio/voices.js');
    const C = await import('/src/audio/cues.js');
    const R = await import('/src/audio/render.js');
    const sr = 48000;
    const liveKitCtx = new OfflineAudioContext({ numberOfChannels: 1, length: 128, sampleRate: sr });
    const liveKit = V.createVoiceKit(liveKitCtx);
    while (!liveKit.prewarm());
    const rec = R.createRecordKit();
    const renderer = R.createRenderer({ sampleRate: sr });
    for (let i = 0; i < 100 && !renderer.ok; i++) await new Promise((res) => setTimeout(res, 50));
    const db = (v) => (v > 0 ? Math.round(20 * Math.log10(v) * 100) / 100 : -999);
    function stats(d) {
      let pk = 0;
      let s = 0;
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > pk) pk = a;
        s += d[i] * d[i];
      }
      // spectral centroid over 2048-frame blocks (power weighted)
      const N = 2048;
      let pf = 0;
      let pw = 0;
      const re = new Float64Array(N);
      const im = new Float64Array(N);
      for (let b = 0; b + N <= d.length; b += N) {
        for (let i = 0; i < N; i++) {
          re[i] = d[b + i] * (0.42 - 0.5 * Math.cos((2 * Math.PI * i) / N) + 0.08 * Math.cos((4 * Math.PI * i) / N));
          im[i] = 0;
        }
        // naive DFT on 256 bins is too slow; use a small radix-2 FFT
        for (let i = 1, j = 0; i < N; i++) {
          let bit = N >> 1;
          for (; j & bit; bit >>= 1) j ^= bit;
          j ^= bit;
          if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
          }
        }
        for (let len = 2; len <= N; len <<= 1) {
          const ang = (-2 * Math.PI) / len;
          for (let i = 0; i < N; i += len) {
            for (let k = 0; k < len / 2; k++) {
              const c = Math.cos(ang * k);
              const sn = Math.sin(ang * k);
              const br = re[i + k + len / 2] * c - im[i + k + len / 2] * sn;
              const bi = re[i + k + len / 2] * sn + im[i + k + len / 2] * c;
              re[i + k + len / 2] = re[i + k] - br;
              im[i + k + len / 2] = im[i + k] - bi;
              re[i + k] += br;
              im[i + k] += bi;
            }
          }
        }
        for (let k = 1; k < N / 2; k++) {
          const p = re[k] * re[k] + im[k] * im[k];
          pw += p;
          pf += p * k * (sr / N);
        }
      }
      return { peakDb: db(pk), rmsDb: db(Math.sqrt(s / Math.max(1, d.length))), centroidHz: pw > 0 ? Math.round(pf / pw) : null };
    }
    async function compare(label, build) {
      const r = rec.record(build);
      const len = Math.ceil(r.dur * sr) + 1;
      const off = new OfflineAudioContext({ numberOfChannels: 1, length: len, sampleRate: sr });
      const k = V.createVoiceKit(off, { shared: liveKit.buffers });
      const g = off.createGain();
      g.connect(off.destination);
      build(k, 0, g);
      const wa = (await off.startRendering()).getChannelData(0);
      const res = await renderer.render([{ id: 1, dur: r.dur, score: r.score }]);
      const wk = res[0].data;
      const A = stats(wa);
      const B = stats(wk.subarray(0, wa.length));
      let err = null;
      if (!r.noise) {
        let e2 = 0;
        let s2 = 0;
        for (let i = 0; i < wa.length; i++) {
          const dlt = wa[i] - (wk[i] || 0);
          e2 += dlt * dlt;
          s2 += wa[i] * wa[i];
        }
        err = s2 > 0 ? Math.round(10 * Math.log10(e2 / s2) * 10) / 10 : null;
      }
      return { label, noise: r.noise, webaudio: A, worker: B, dPeakDb: Math.round((B.peakDb - A.peakDb) * 100) / 100, dRmsDb: Math.round((B.rmsDb - A.rmsDb) * 100) / 100, dCentroidPct: A.centroidHz ? Math.round(((B.centroidHz - A.centroidHz) / A.centroidHz) * 1000) / 10 : null, residualDb: err };
    }
    const out = [];
    for (const [id, def] of Object.entries(C.DEFAULT_CUES)) {
      try {
        out.push(await compare(`cue ${id}`, (kk, t, d) => def.voice(kk.ctx, t, d, { pitch: 1, kit: kk })));
      } catch (e) {
        out.push({ label: `cue ${id}`, error: String(e.message || e) });
      }
    }
    // Music instrument notes through the music.js note path (stateNotesJob collects them).
    const M = await import('/src/audio/music.js');
    const dry = V.createDryKit().kit;
    for (const [st, th] of [['boss', 'wood'], ['combat', 'mill'], ['combat', 'barrow'], ['boss', 'barrow']]) {
      const notes = [];
      const job = M.stateNotesJob(st, th, dry, (key, build) => notes.push([key, build]));
      while (job(Infinity) === false);
      for (const [key, build] of notes.slice(0, 60)) {
        try {
          out.push(await compare(`note ${st}:${th} ${key}`, build));
        } catch (e) {
          out.push({ label: key, error: String(e.message || e) });
        }
      }
    }
    return out;
  });
  const worst = (f) => r.filter((x) => !x.error).reduce((m, x) => (Math.abs(f(x) || 0) > Math.abs(f(m) || 0) ? x : m), r[0]);
  const summary = {
    n: r.length,
    errors: r.filter((x) => x.error).length,
    maxAbsPeakDb: Math.max(...r.filter((x) => !x.error).map((x) => Math.abs(x.dPeakDb))),
    maxAbsRmsDb: Math.max(...r.filter((x) => !x.error).map((x) => Math.abs(x.dRmsDb))),
    maxAbsCentroidPct: Math.max(...r.filter((x) => !x.error && x.dCentroidPct !== null).map((x) => Math.abs(x.dCentroidPct))),
    worstResidualDb: Math.max(...r.filter((x) => x.residualDb !== null && x.residualDb !== undefined).map((x) => x.residualDb)),
    worstPeak: worst((x) => x.dPeakDb).label,
    worstRms: worst((x) => x.dRmsDb).label,
    pageErrors: errors,
  };
  console.log('SUMMARY', JSON.stringify(summary));
  for (const x of r) if (x.error || Math.abs(x.dPeakDb) > 0.5 || Math.abs(x.dRmsDb) > 0.5 || (x.residualDb !== null && x.residualDb > -20)) console.log(JSON.stringify(x));
  const p = path.join(process.cwd(), 'captures', OUT);
  fs.writeFileSync(p, JSON.stringify({ summary, results: r }, null, 1));
  console.log('WROTE', p);
} finally {
  await browser.close();
}
