#!/usr/bin/env node
// Fix builder M1 r1 (MENU-R1-F1) — what the CPU-backed worker canvases (env/ground.js PAINT_CTX) change in
// the painted floors. In one page (GPU harness), paints every layout's floor + apron twice on the main thread
// with the SAME layout stream: once in software (willReadFrequently, the worker's path since the fix) and once
// on Chrome's accelerated canvas (the main-thread path, and the worker's before the fix), then compares the pixels: share of differing texels, max / mean channel delta,
// and the mean colour of each (so a palette-level shift would show). Also paints each layout in the real
// paint worker (env/biomes/paint-client.js) and compares it with both main-thread rasters.
//   node tools/gntfixM11-rasterdiff.mjs [--ids 1,2,3]
import { launchEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const idsArg = argv.includes('--ids') ? argv[argv.indexOf('--ids') + 1] : '';
const browser = await launchEchoes({ gpu: true, width: 1280, height: 720 });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto('http://127.0.0.1:5199/?menu=0&seed=7', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 30, { timeout: 180000 });
  const out = await page.evaluate(async (idsArg, withWorker) => {
    const G = await import('/src/env/ground.js');
    const B = await import('/src/env/biomes/index.js');
    const L = await import('/src/env/layout.js');
    const ids = idsArg ? idsArg.split(',').map(Number) : B.LAYOUT_SPEC_IDS.slice();
    const orig = HTMLCanvasElement.prototype.getContext;
    // 'cpu' = the worker's raster path (software, PAINT_CTX), 'gpu' = Chrome's accelerated canvas.
    const paint = (id, gpu) => {
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        return orig.call(this, type, gpu ? undefined : { ...(attrs || {}), willReadFrequently: true });
      };
      try {
        const spec = B.layoutSpec(id);
        const rng = L.variantLayoutRng(spec.id);
        const ground = G.drain(G.paintGroundSteps(spec, rng));
        const apron = G.drain(G.paintApronSteps(spec, rng));
        return { ground, apron };
      } finally {
        HTMLCanvasElement.prototype.getContext = orig;
      }
    };
    const pixels = (c) => {
      const k = document.createElement('canvas');
      k.width = c.width;
      k.height = c.height;
      const x = k.getContext('2d', { willReadFrequently: true });
      x.drawImage(c, 0, 0);
      return x.getImageData(0, 0, c.width, c.height).data;
    };
    const cmp = (a, b) => {
      const A = pixels(a);
      const Bp = pixels(b);
      let diff = 0;
      let max = 0;
      let sum = 0;
      const meanA = [0, 0, 0];
      const meanB = [0, 0, 0];
      const n = A.length / 4;
      for (let i = 0; i < A.length; i += 4) {
        let px = 0;
        for (let c = 0; c < 3; c++) {
          const d = Math.abs(A[i + c] - Bp[i + c]);
          if (d > px) px = d;
          sum += d;
          meanA[c] += A[i + c];
          meanB[c] += Bp[i + c];
        }
        const da = Math.abs(A[i + 3] - Bp[i + 3]);
        if (da > px) px = da;
        if (px > 0) diff++;
        if (px > max) max = px;
      }
      return {
        size: `${a.width}x${a.height}`,
        differingPct: +((100 * diff) / n).toFixed(2),
        maxDelta: max,
        meanAbsDelta: +(sum / (n * 3)).toFixed(3),
        meanCpu: meanA.map((v) => +(v / n).toFixed(2)),
        meanGpu: meanB.map((v) => +(v / n).toFixed(2)),
      };
    };
    const res = [];
    for (const id of ids) {
      const t0 = performance.now();
      const cpu = paint(id, false);
      const t1 = performance.now();
      const gpu = paint(id, true);
      const t2 = performance.now();
      let worker = null;
      if (withWorker) {
        const PC = await import('/src/env/biomes/paint-client.js');
        const req = PC.requestPaint(id);
        const tw = performance.now();
        while (!req.done && performance.now() - tw < 20000) await new Promise((r) => setTimeout(r, 20));
        worker = req.ok ? { vsCpuGround: cmp(req.ground, cpu.ground), vsCpuApron: cmp(req.apron, cpu.apron), vsGpuGround: cmp(req.ground, gpu.ground) } : { error: req.error };
      }
      res.push({ id, worker, biome: B.biomeOfLayout ? B.biomeOfLayout(id) : null, cpuMs: Math.round(t1 - t0), gpuMs: Math.round(t2 - t1), ground: cmp(cpu.ground, gpu.ground), apron: cmp(cpu.apron, gpu.apron) });
    }
    return res;
  }, idsArg, true);
  for (const r of out) console.log('NDJSON ' + JSON.stringify({ tag: 'layout', v: r }));
  console.log('NDJSON ' + JSON.stringify({ tag: 'errors', v: errors }));
} finally {
  await browser.close();
}
