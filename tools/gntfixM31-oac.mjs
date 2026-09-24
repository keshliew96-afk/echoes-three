// Fix builder M3 round 1 — micro-benchmark of the Web Audio calls the engine's hot paths make, measured
// in the real page (GPU harness, autoplay flag): OfflineAudioContext construction, startRendering call,
// createBufferSource/connect/start, createGain, createPanner, a live cue voice. Median / p95 / max in us.
//   node tools/gntfixM31-oac.mjs
import { launchEchoes } from './gnt-arch-browser.mjs';

const browser = await launchEchoes({ gpu: true, autoplay: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5199/?menu=0&seed=17&fresh=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));
  const r = await page.evaluate(async () => {
    const ctx = new AudioContext();
    const out = {};
    const stat = (name, arr) => {
      const s = [...arr].sort((a, b) => a - b);
      out[name] = { n: s.length, p50us: Math.round(s[Math.floor(s.length / 2)] * 1000), p95us: Math.round(s[Math.floor(s.length * 0.95)] * 1000), maxUs: Math.round(s[s.length - 1] * 1000) };
    };
    // performance.now() is coarse (100 us) off cross-origin isolation: time N-call blocks and divide.
    const block = (n, fn) => {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) fn(i);
      return (performance.now() - t0) / n;
    };
    const oac = [];
    const rend = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      const off = new OfflineAudioContext({ numberOfChannels: 1, length: 48000 * 4, sampleRate: 48000 });
      oac.push(performance.now() - t0);
      const o = off.createOscillator();
      o.connect(off.destination);
      o.start(0);
      o.stop(0.1);
      const t1 = performance.now();
      const p = off.startRendering();
      rend.push(performance.now() - t1);
      await p;
    }
    stat('OfflineAudioContext_new', oac);
    // node-chain build cost: realtime context vs an offline context (osc -> biquad -> gain -> dest, 3 automation calls)
    const chain = (c, t) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      const f = c.createBiquadFilter();
      f.frequency.setValueAtTime(1200, t);
      const o = c.createOscillator();
      o.frequency.setValueAtTime(440, t);
      o.connect(f);
      f.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.25);
    };
    {
      const off = new OfflineAudioContext({ numberOfChannels: 1, length: 48000 * 10, sampleRate: 48000 });
      const a1 = [];
      for (let k = 0; k < 10; k++) a1.push(block(20, (i) => chain(off, (k * 20 + i) * 0.04)));
      stat('chain_in_offline', a1);
      const rt = new AudioContext();
      const a2 = [];
      for (let k = 0; k < 10; k++) a2.push(block(20, () => chain(rt, rt.currentTime + 1)));
      stat('chain_in_realtime', a2);
      rt.close();
    }
    stat('startRendering_call', rend);
    out.isolated = self.crossOriginIsolated;
    out.timerResUs = (() => {
      let min = 1e9;
      for (let i = 0; i < 2000; i++) {
        const a = performance.now();
        let b = performance.now();
        while (b === a) b = performance.now();
        min = Math.min(min, b - a);
      }
      return Math.round(min * 1000);
    })();
    if (ctx) {
      const buf = ctx.createBuffer(1, 4800, ctx.sampleRate);
      const sink = ctx.createGain();
      sink.gain.value = 0;
      sink.connect(ctx.destination);
      const per = [];
      for (let k = 0; k < 10; k++) per.push(block(50, () => {
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.connect(sink);
        s.start(ctx.currentTime + 0.01, 0, 0.05);
      }));
      stat('bufferSource_create_connect_start', per);
      const g = [];
      for (let k = 0; k < 10; k++) g.push(block(50, () => ctx.createGain()));
      stat('createGain', g);
      const pn = [];
      for (let k = 0; k < 10; k++) pn.push(block(50, () => ctx.createPanner()));
      stat('createPanner', pn);
      const a = window.__echoes.audio;
      a.bakeEnabled(false);
      const lv = [];
      for (let k = 0; k < 10; k++) lv.push(block(10, () => a.play('impact', { x: 1, z: 1, gainDb: -40 })));
      stat('play_impact_live', lv);
      a.bakeEnabled(true);
      await new Promise((r2) => setTimeout(r2, 3000));
      const bk = [];
      for (let k = 0; k < 10; k++) bk.push(block(10, () => a.play('impact', { x: 1, z: 1, gainDb: -40 })));
      stat('play_impact_baked', bk);
      out.bake = a.bake();
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
} finally {
  await browser.close();
}
