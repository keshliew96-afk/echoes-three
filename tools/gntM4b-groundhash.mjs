#!/usr/bin/env node
// M4b: hash the painted ground + apron canvases of layouts (FNV over the RGBA
// bytes) in the real page — proves a painter refactor leaves the certified
// Act-I floors byte-identical.   node tools/gntM4b-groundhash.mjs [1,2,3]
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';
const ids = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const WORKER = process.argv.includes('--worker'); // paint via env/biomes/paint-worker.js
const browser = await launchEchoes({ gpu: true });
try {
  const { page, errors } = await openEchoes(browser, 'http://127.0.0.1:5199/?scene=arena&seed=3');
  await waitReady(page, { minTick: 20 });
  const r = await page.evaluate(async (ids, WORKER) => {
    const G = await import('/src/env/ground.js');
    const L = await import('/src/env/layout.js');
    let specFor;
    try {
      const B = await import('/src/env/biomes/index.js');
      specFor = (id) => B.layoutSpec(id);
    } catch {
      const V = await import('/src/env/variants.js');
      specFor = (id) => V.VARIANTS[id];
    }
    const fnv = (data) => {
      let h1 = 0x811c9dc5;
      let h2 = 0x01000193;
      for (let i = 0; i < data.length; i += 1) {
        h1 = Math.imul(h1 ^ data[i], 16777619) >>> 0;
        if ((i & 3) === 0) h2 = Math.imul(h2 ^ data[i], 2246822519) >>> 0;
      }
      return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
    };
    const out = {};
    if (WORKER) {
      const PC = await import('/src/env/biomes/paint-client.js');
      for (const id of ids) {
        const req = PC.requestPaint(id);
        const t0 = performance.now();
        while (!req.done && performance.now() - t0 < 20000) await new Promise((res) => setTimeout(res, 20));
        if (!req.ok) { out[id] = { error: req.error }; continue; }
        // The stream draws the worker reports == a main-thread paint's.
        const spec = specFor(id);
        const rng = L.variantLayoutRng(spec.id);
        G.paintGroundCanvas(spec, rng);
        G.buildApronMesh(spec, rng);
        const probe = L.variantLayoutRng(spec.id);
        probe.skip(req.draws);
        const g = req.ground, a = req.apron;
        out[id] = {
          ground: fnv(g.getContext('2d').getImageData(0, 0, g.width, g.height).data),
          apron: fnv(a.getContext('2d').getImageData(0, 0, a.width, a.height).data),
          draws: req.draws,
          streamInSync: probe.float() === rng.float(),
          ms: req.ms,
        };
      }
      return out;
    }
    for (const id of ids) {
      const spec = specFor(id);
      const rng = L.variantLayoutRng(spec.id);
      const c = G.paintGroundCanvas(spec, rng);
      const ground = fnv(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
      const a = G.buildApronMesh(spec, rng).material.map.image;
      const apron = fnv(a.getContext('2d').getImageData(0, 0, a.width, a.height).data);
      out[id] = { ground, apron };
    }
    return out;
  }, ids, WORKER);
  console.log(JSON.stringify({ r, errors }));
} finally {
  await browser.close();
}
