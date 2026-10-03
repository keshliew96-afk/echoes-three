#!/usr/bin/env node
// M4b: time every generator step of a dressing's canvas painters in the real
// page (ground + apron), plus the GPU texture upload — the numbers behind the
// background builder's per-frame slice (no frame > 100 ms, G4b.5).
//   node tools/gntM4b-slices.mjs [ids comma list]
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';
const WRF = process.argv.includes("--wrf");
const FLUSH = process.argv.includes("--flush");
const ids = (process.argv[2] ?? "4,7").split(',').map(Number);
const browser = await launchEchoes({ gpu: true });
try {
  const { page, errors } = await openEchoes(browser, 'http://127.0.0.1:5199/?scene=arena&seed=3');
  await waitReady(page, { minTick: 30 });
  const r = await page.evaluate(async (ids, WRF, FLUSH) => {
    let lastCtx = null;
    {
      const orig0 = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, o) { const c = orig0.call(this, t, o); if (t === '2d') lastCtx = c; return c; };
    }
    const hashCanvas = (cv) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h1 = 0x811c9dc5, h2 = 7; for (let i = 0; i < d.length; i += 1) { h1 = Math.imul(h1 ^ d[i], 16777619); if ((i & 1023) === 0) h2 = (h2 * 31 + h1) | 0; } return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16); };
    if (WRF) {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, o) { return orig.call(this, t, t === '2d' ? { ...(o || {}), willReadFrequently: true } : o); };
    }
    const G = await import('/src/env/ground.js');
    const L = await import('/src/env/layout.js');
    const B = await import('/src/env/biomes/index.js');
    const out = [];
    const timeGen = (gen) => {
      const steps = [];
      let r;
      for (;;) {
        const t0 = performance.now();
        r = gen.next();
        if (FLUSH && !r.done && lastCtx) lastCtx.getImageData(0, 0, 1, 1);
        steps.push(performance.now() - t0);
        if (r.done) break;
      }
      return { value: r.value, steps };
    };
    for (const id of ids) {
      const spec = B.layoutSpec(id);
      const rng = L.variantLayoutRng(spec.id);
      const g = timeGen(G.paintGroundSteps(spec, rng));
      const a = timeGen(G.paintApronSteps(spec, rng));
      const top = (s) => s.map((ms, i) => [i, Math.round(ms * 10) / 10]).sort((x, y) => y[1] - x[1]).slice(0, 6);
      let t0 = performance.now();
      const gm = G.groundMeshFromCanvas(g.value);
      const am = G.apronMeshFromCanvas(a.value);
      const meshMs = performance.now() - t0;
      const R = window.__arenaProbe && window.__arenaProbe.stage && window.__arenaProbe.stage.renderer;
      t0 = performance.now();
      if (R) { R.initTexture(gm.material.map); R.initTexture(am.material.map); }
      const gpuMs = performance.now() - t0;
      const hashes = [hashCanvas(g.value), hashCanvas(a.value)];
      out.push({ id, hashes, ground: { n: g.steps.length, total: Math.round(g.steps.reduce((x, y) => x + y, 0)), top: top(g.steps) }, apron: { n: a.steps.length, total: Math.round(a.steps.reduce((x, y) => x + y, 0)), top: top(a.steps) }, meshMs: Math.round(meshMs), gpuMs: Math.round(gpuMs) });
    }
    return out;
  }, ids, WRF, FLUSH);
  for (const x of r) console.log(JSON.stringify(x));
  if (errors.length) console.log('errors', errors);
} finally {
  await browser.close();
}
