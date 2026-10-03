// Dressing paint worker (M4b). A room's floor + apron canvases are the one
// expensive part of a dressing build: ~250 draws-worth of Canvas 2D work whose
// rasterisation Chrome defers to the first readback / upload, so on the main
// thread one slice of the background builder cost 100-250 ms however finely
// the painter yields (measured, tools/gntM4b-slices.mjs). Here the SAME painter
// (env/ground.js, drained on an OffscreenCanvas) runs off the main thread; the
// bitmaps come back transferred, plus the number of layout-stream draws the
// painting consumed, so the main thread can advance its own copy of the stream
// and build the rest of the dressing (treeline, props, foliage) exactly as a
// main-thread paint would have.
import { paintGroundSteps, paintApronSteps, drain } from '../ground.js';
import { variantLayoutRng } from '../layout.js';
import { layoutSpec } from './index.js';

// A layout stream that counts its draws. Every helper routes through float(),
// which is exactly one step of the underlying mulberry32 — so `count` draws
// here == `count` calls of float() on a fresh copy of the same stream.
function countedStream(id) {
  const base = variantLayoutRng(id);
  let count = 0;
  const float = () => {
    count += 1;
    return base.float();
  };
  return {
    rng: {
      stream: 'layout',
      seed: base.seed,
      float,
      range: (a, b) => a + float() * (b - a),
      int: (n) => Math.floor(float() * n),
      chance: (p) => float() < p,
      pick: (arr) => arr[Math.floor(float() * arr.length)],
    },
    count: () => count,
  };
}

self.onmessage = (ev) => {
  const { reqId, id } = ev.data || {};
  try {
    const spec = layoutSpec(id);
    if (!spec) throw new Error(`no layout spec ${id}`);
    const t0 = performance.now();
    const { rng, count } = countedStream(spec.id);
    const ground = drain(paintGroundSteps(spec, rng));
    const apron = drain(paintApronSteps(spec, rng));
    const draws = count();
    const gb = ground.transferToImageBitmap();
    const ab = apron.transferToImageBitmap();
    self.postMessage({ reqId, id, ground: gb, apron: ab, draws, ms: Math.round(performance.now() - t0) }, [gb, ab]);
  } catch (err) {
    self.postMessage({ reqId, id, error: String((err && err.message) || err) });
  }
};
