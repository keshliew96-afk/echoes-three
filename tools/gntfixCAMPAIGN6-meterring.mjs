// gntfixCAMPAIGN6 — equivalence test for the audio meter's window history ring (fix-CAMPAIGN-r6, CR6-F2):
// feeds IDENTICAL deterministic samples through the analyser fallback path of the committed (HEAD) meter.js
// and the working-tree meter.js, past the 12 000-window cap, and compares stats() / history() / longestBelow()
// after every phase (before the cap, after the cap, after reset()). Exit 1 on any difference.
// usage: node tools/gntfixCAMPAIGN6-meterring.mjs [--rev HEAD]
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
const rev = process.argv.includes('--rev') ? process.argv[process.argv.indexOf('--rev') + 1] : 'HEAD';
const tmp = path.join(os.tmpdir(), `gntfixCAMPAIGN6-meter-${rev.replace(/\W/g, '')}.mjs`);
fs.writeFileSync(tmp, execSync(`git show ${rev}:src/audio/meter.js`, { encoding: 'utf8', maxBuffer: 1 << 24 }));
const OLD = await import(pathToFileURL(tmp).href);
const NEW = await import(pathToFileURL(path.resolve('src/audio/meter.js')).href);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function makeCtx(seed) {
  const r = rng(seed);
  let amp = 0.3;
  const an = () => ({ fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0, connect() {}, getFloatTimeDomainData(b) { for (let i = 0; i < b.length; i++) b[i] = (r() * 2 - 1) * amp; }, getFloatFrequencyData(b) { for (let i = 0; i < b.length; i++) b[i] = -60 - r() * 40; } });
  return { sampleRate: 4800, createChannelSplitter: () => ({ connect() {} }), createAnalyser: an, setAmp: (a) => { amp = a; } };
}
const src = { connect() {} };
const mk = (M, seed) => { const ctx = makeCtx(seed); return { ctx, tap: M.createMeterTap(ctx, src, { name: 't', worklet: false, centroid: true }) }; };
const a = mk(OLD, 7), b = mk(NEW, 7);
let t = 0, fails = 0, checks = 0;
const J = (x) => JSON.stringify(x);
function step(nReads) {
  for (let i = 0; i < nReads; i++) {
    t += 0.4; // 1920 samples per read at 4800 Hz
    const amp = 0.05 + 0.9 * Math.abs(Math.sin(i / 97));
    a.ctx.setAmp(amp); b.ctx.setAmp(amp);
    a.tap.read(t); b.tap.read(t);
    if (i % 50 === 0) { a.tap.sampleCentroid(); b.tap.sampleCentroid(); }
  }
}
function compare(label) {
  const sa = a.tap.stats(), sb = b.tap.stats();
  for (const [k, va, vb] of [['stats', sa, sb], ['history50', a.tap.history(50), b.tap.history(50)], ['history0', a.tap.history(0), b.tap.history(0)], ['history13000', a.tap.history(13000), b.tap.history(13000)], ['below-30', a.tap.longestBelow(-30), b.tap.longestBelow(-30)]]) {
    checks++;
    if (J(va) !== J(vb)) { fails++; console.log('DIFF', label, k, J(va).slice(0, 200), '|', J(vb).slice(0, 200)); }
  }
  console.log(label, 'windows100', sa.windows100, '=', sb.windows100, 'median', sa.medianRms400Db, '=', sb.medianRms400Db, 'peakHold', sa.peakHoldDb, '=', sb.peakHoldDb);
}
step(1000); compare('phase1 (under the cap)');
step(12000); compare('phase2 (past the 12000-window cap)');
a.tap.reset(); b.tap.reset(); compare('phase3 (after reset, empty)');
step(300); compare('phase4 (after reset + 300 reads)');
console.log(fails ? `FAIL ${fails}/${checks}` : `PASS ${checks}/${checks} identical`);
fs.unlinkSync(tmp);
process.exit(fails ? 1 : 0);
