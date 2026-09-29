// gntfixM35 — fix-M3-r5 helpers. A copy of the round-5 audio critic's helpers
// (tools/gntcaudio5-lib.mjs, same measurement logic: the independent
// destination tap, the 100 ms sampler) with the fixer's own base port (4303,
// PLAN port scheme M3) and outputs under captures/gntfixM35/<TAG>-<name>.json,
// so re-running a critic probe never overwrites the critic's evidence.
//   GNTFIXM35_BASE (default http://127.0.0.1:4303/) · GNTFIXM35_TAG (default run)
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
export const BASE = process.env.GNTFIXM35_BASE || 'http://127.0.0.1:4303/';
export const TAG = process.env.GNTFIXM35_TAG || 'run';
mkdirSync('captures/gntfixM35', { recursive: true });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function boot(params = '', { autoplay = true, gpu = true, width = 1600, height = 900 } = {}) {
  const browser = await launchEchoes({ gpu, autoplay, width, height });
  const url = BASE + (params ? (params.startsWith('?') ? params : '?' + params) : '');
  const o = await openEchoes(browser, url, { width, height });
  return { browser, ...o, url };
}
export function out(name, obj) {
  mkdirSync('captures/gntfixM35', { recursive: true });
  const f = `captures/gntfixM35/${TAG}-${name}.json`;
  writeFileSync(f, JSON.stringify(obj, null, 2));
  return f;
}
export const shotPath = (name) => `captures/gntfixM35/${TAG}-${name}.png`;
export async function ev(page, fn, ...args) { return page.evaluate(fn, ...args); }
export async function waitFor(page, fnStr, timeout = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { const v = await page.evaluate(fnStr); if (v) return v; } catch {}
    await sleep(150);
  }
  return null;
}
// Independent destination tap (same as the critic's): every connect() into an
// AudioContext's destination is mirrored into a ScriptProcessor that
// accumulates L/R power, peak and counts over thresholds per block.
export const TAP_SCRIPT = `(() => {
  const orig = AudioNode.prototype.connect;
  const taps = new WeakMap();
  const G = (window.__gntTap = { ctxs: [], connects: 0 });
  function getTap(ctx) {
    let t = taps.get(ctx); if (t) return t;
    const sp = ctx.createScriptProcessor(2048, 2, 2);
    const z = ctx.createGain(); z.gain.value = 0;
    orig.call(sp, z); orig.call(z, ctx.destination);
    const an = ctx.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0; t = { sp, an, n: 0, sl: 0, sr: 0, peak: 0, over0: 0, overM1: 0, blocks: [] };
    sp.onaudioprocess = (e) => {
      const ib = e.inputBuffer; const L = ib.getChannelData(0); const R = ib.numberOfChannels > 1 ? ib.getChannelData(1) : L;
      let sl = 0, sr = 0, pk = 0, o0 = 0, o1 = 0;
      for (let i = 0; i < L.length; i++) { const a = L[i], b = R[i]; sl += a * a; sr += b * b; const m = Math.max(a < 0 ? -a : a, b < 0 ? -b : b); if (m > pk) pk = m; if (m >= 1) o0++; if (m > 0.8913) o1++; }
      t.n += L.length; t.sl += sl; t.sr += sr; if (pk > t.peak) t.peak = pk; t.over0 += o0; t.overM1 += o1;
      t.blocks.push([Math.round(e.playbackTime * 1000) / 1000, sl / L.length, sr / L.length, pk]);
      if (t.blocks.length > 60000) t.blocks.splice(0, 10000);
    };
    taps.set(ctx, t); G.ctxs.push(t); return t;
  }
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    try { if (dest instanceof AudioDestinationNode && this.context instanceof AudioContext) { G.connects++; const tp = getTap(this.context); orig.call(this, tp.sp); orig.call(this, tp.an); } } catch (e) {}
    return r;
  };
  const db = (p) => p > 0 ? Math.round(10 * Math.log10(p) * 100) / 100 : -999;
  G.reset = () => { for (const t of G.ctxs) { t.n = 0; t.sl = 0; t.sr = 0; t.peak = 0; t.over0 = 0; t.overM1 = 0; t.blocks = []; } };
  G.read = () => { const t = G.ctxs[G.ctxs.length - 1]; if (!t || !t.n) return null; return { n: t.n, rmsDb: db((t.sl + t.sr) / (2 * t.n)), lDb: db(t.sl / t.n), rDb: db(t.sr / t.n), peakDb: t.peak > 0 ? Math.round(20 * Math.log10(t.peak) * 100) / 100 : -999, over0: t.over0, overM1: t.overM1, blocks: t.blocks.length }; };
  G.bin = async (hz, reads = 12) => { const t = G.ctxs[G.ctxs.length - 1]; const a = t.an; const buf = new Float32Array(a.frequencyBinCount); const k = Math.round(hz / (a.context.sampleRate / a.fftSize)); let acc = 0; for (let i = 0; i < reads; i++) { a.getFloatFrequencyData(buf); let m = -999; for (let j = k - 2; j <= k + 2; j++) m = Math.max(m, buf[j]); acc += Math.pow(10, m / 10); await new Promise(r => setTimeout(r, 60)); } return Math.round(10 * Math.log10(acc / reads) * 100) / 100; };
  G.series = (from = 0) => { const t = G.ctxs[G.ctxs.length - 1]; if (!t) return []; return t.blocks.slice(from).map(b => [b[0], db((b[1] + b[2]) / 2), b[3] > 0 ? Math.round(20 * Math.log10(b[3]) * 10) / 10 : -999]); };
})();`;
export async function bootTap(params = '', opts = {}) {
  const browser = await launchEchoes({ gpu: opts.gpu !== false, autoplay: opts.autoplay !== false, width: opts.width || 1600, height: opts.height || 900 });
  const page = await browser.newPage();
  const errors = []; const consoleLines = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  await page.setViewport({ width: opts.width || 1600, height: opts.height || 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(TAP_SCRIPT);
  const url = BASE + (params ? '?' + params.replace(/^\?/, '') : '');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout: 180000 });
  return { browser, page, errors, consoleLines, url };
}
// Background 100 ms sampler of the music/master taps + music/app/campaign state (page side).
export async function startSampler(page, periodMs = 100) {
  await page.evaluate((periodMs) => {
    const E = window.__echoes, A = E.audio;
    const S = (window.__gntSamp = { rows: [], t0: performance.now(), on: true });
    const tick = () => {
      if (!S.on) return;
      try {
        const m = A.meters(); A.meterReset();
        const mu = A.music(); const c = E.campaign ? E.campaign.state() : null;
        S.rows.push([Math.round(performance.now() - S.t0), m.music.rmsDb, m.master.rmsDb, mu.state, mu.theme, mu.crossfading ? 1 : 0, E.app.state, (E.app.stack() || []).join('>'), c ? c.transitionState + ':' + c.level + ':' + c.phase : '', m.music.centroidHz, mu.stinger ? 1 : 0, m.sfx.peakDb, m.ui.peakDb]);
      } catch (e) { S.rows.push([Math.round(performance.now() - S.t0), 'ERR ' + e.message]); }
      setTimeout(tick, periodMs);
    };
    tick();
  }, periodMs);
}
export async function stopSampler(page) {
  return page.evaluate(() => { const S = window.__gntSamp; S.on = false; return S.rows; });
}
// Longest run (ms) of consecutive samples with music tap below thr (dB), excluding rows whose music state is excluded.
export function gaps(rows, thr = -50, exclude = ['silence']) {
  let best = 0, cur = 0, start = null, bestAt = null; const runs = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; const dt = r[0] - rows[i - 1][0];
    if (typeof r[1] === 'number' && r[1] < thr && !exclude.includes(r[3])) { if (cur === 0) start = r[0]; cur += dt; if (cur > best) { best = cur; bestAt = start; } }
    else { if (cur > 300) runs.push([start, cur]); cur = 0; }
  }
  if (cur > 300) runs.push([start, cur]);
  return { longestMs: best, at: bestAt, runsOver300: runs };
}
