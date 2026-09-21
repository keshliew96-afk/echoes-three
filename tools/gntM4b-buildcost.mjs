#!/usr/bin/env node
// M4b: measure the cost of each arena-dressing build step in the real page
// (ground canvas, apron, treeline, props, foliage, walls, whole dressing) —
// the numbers that decide how the background dressing builder slices work.
//   node tools/gntM4b-buildcost.mjs [ids comma list]
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';
const ids = (process.argv[2] ?? '1,2,3').split(',').map(Number);
const browser = await launchEchoes({ gpu: true });
try {
  const { page, errors } = await openEchoes(browser, 'http://127.0.0.1:5199/?scene=arena&seed=3');
  await waitReady(page, { minTick: 30 });
  const r = await page.evaluate(async (ids) => {
    const G = await import('/src/env/ground.js');
    const T = await import('/src/env/treeline.js');
    const P = await import('/src/env/props.js');
    const F = await import('/src/env/foliage.js');
    const Wl = await import('/src/env/walls.js');
    const L = await import('/src/env/layout.js');
    let specFor;
    try {
      const B = await import('/src/env/biomes/index.js');
      specFor = (id) => B.layoutSpec(id);
    } catch {
      const V = await import('/src/env/variants.js');
      specFor = (id) => V.VARIANTS[id];
    }
    const out = [];
    for (const id of ids) {
      const spec = specFor(id);
      if (!spec) continue;
      const rng = L.variantLayoutRng(spec.id);
      const t = {};
      let t0 = performance.now();
      const canvas = G.paintGroundCanvas(spec, rng);
      t.groundPaint = performance.now() - t0;
      t0 = performance.now();
      G.buildApronMesh(spec, rng);
      t.apron = performance.now() - t0;
      const grp = { children: [], add(o) { this.children.push(o); } };
      t0 = performance.now();
      T.buildTreeline(grp, spec, rng);
      t.treeline = performance.now() - t0;
      t0 = performance.now();
      const pr = P.buildProps(grp, spec, rng);
      t.props = performance.now() - t0;
      t0 = performance.now();
      F.buildFoliage(grp, spec, rng, pr.footprints);
      t.foliage = performance.now() - t0;
      t0 = performance.now();
      Wl.buildWalls(grp, spec, rng);
      t.walls = performance.now() - t0;
      for (const k of Object.keys(t)) t[k] = Math.round(t[k]);
      out.push({ id, ...t, canvas: [canvas.width, canvas.height] });
    }
    return out;
  }, ids);
  console.log(JSON.stringify({ r, errors }, null, 1));
} finally {
  await browser.close();
}
