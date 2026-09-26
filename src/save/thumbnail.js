// Save thumbnails (docs/gauntlet/PLAN.md §3.4 "Thumbnail"). Owner: M2.
// 256 x 144 JPEG (quality 0.7, <= 20 KB) of the game view, taken from the
// WebGL canvas IMMEDIATELY after composer.render() (stage.js @gnt:M2
// THUMBNAIL runs the queued hooks there), so no preserveDrawingBuffer is
// needed and the menus (DOM) never appear in it.
//
// Frame cost (G2.7, no frame > 50 ms during a save): reading the WebGL
// buffer back and encoding a JPEG on the main thread stalls it on the GPU
// (a synchronous toDataURL measured 26-133 ms; the async toBlob ~1 s of wall
// time on a continuously rendering page). So the render hook only takes a
// cropped, downscaled ImageBitmap snapshot (< 1 ms; the resize runs off the
// main thread) and TRANSFERS it to a worker (THUMB_WORKER_SRC below) that
// draws it into an OffscreenCanvas and encodes the JPEG there. Without
// Worker / OffscreenCanvas support the encode falls back to a CPU-backed
// canvas in a post-frame task.
//
// Latency (gauntlet r3, F3): the worker used to be a separate module
// (src/save/thumb-worker.js) created lazily AT the first save, so its fetch +
// start sat on the save's critical path (seconds on a busy dev server or a
// slow network — measured up to 8 s; a 3 s bound, then no picture at all).
// Now (1) the worker is an inline Blob source (like src/net/metronome.js and
// the audio render worker): no network fetch at all, it starts in
// milliseconds; prewarm() starts it at boot idle with a tiny encode, so the
// JPEG encoder is ready long before a save; (2) a SPARE copy of every snapshot stays on the main thread, and a
// worker that has not answered within WORKER_WAIT_MS is bypassed — the spare
// is encoded on the main thread instead (a CPU canvas, a few ms), so a picture
// always lands; (3) the save service no longer waits on the picture beyond a
// short budget (src/save/index.js THUMB_WAIT_MS) — a late picture is attached
// to the slot when it arrives.
export const THUMB_W = 256;
export const THUMB_H = 144;
const MAX_BYTES = 20 * 1024;
const WORKER_WAIT_MS = 900; // a worker slower than this is bypassed (main-thread encode of the spare)

// The encoder worker (was src/save/thumb-worker.js): receives a transferred,
// already-downscaled ImageBitmap and returns a JPEG (quality 0.7, stepped
// down until it fits the byte cap) as a transferred ArrayBuffer. The GPU
// readback and the JPEG encode both happen on the worker thread. Plain ES2017
// in a string: no bundler transform can reach it.
const THUMB_WORKER_SRC = `
self.onmessage = async (e) => {
  const { id, bitmap, w, h, quality = 0.7, maxBytes = 20480 } = e.data || {};
  try {
    const c = new OffscreenCanvas(w, h);
    const g = c.getContext('2d', { alpha: false });
    g.drawImage(bitmap, 0, 0, w, h);
    if (typeof bitmap.close === 'function') bitmap.close();
    let q = quality;
    let blob = await c.convertToBlob({ type: 'image/jpeg', quality: q });
    while (blob.size > maxBytes && q > 0.35) {
      q -= 0.1;
      blob = await c.convertToBlob({ type: 'image/jpeg', quality: q });
    }
    const buf = await blob.arrayBuffer();
    self.postMessage({ id, ok: true, buf, quality: Math.round(q * 10) / 10 }, [buf]);
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
`;

function bufToDataUrl(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return `data:image/jpeg;base64,${btoa(bin)}`;
}

export function createThumbnailer({ stage }) {
  const renderer = stage && stage.renderer;
  let canvas = null;
  let ctx2d = null;
  let last = null; // { dataUrl, at, snapMs, drawMs, ms, bytes, quality, via }
  let worker = null;
  let workerFailed = false;
  let seq = 0;
  const waiting = new Map(); // id -> resolve
  let warm = null; // { startedAt, ms, ok, error } — prewarm() result (debug: save.thumbWarm())
  let lateWorker = 0; // worker answers that arrived after the bypass

  function getWorker() {
    if (worker || workerFailed) return worker;
    try {
      if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') throw new Error('no OffscreenCanvas');
      if (typeof Blob !== 'function' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') throw new Error('no Blob URL');
      const url = URL.createObjectURL(new Blob([THUMB_WORKER_SRC], { type: 'text/javascript' }));
      worker = new Worker(url, { name: 'echoes-thumb' });
      worker.onmessage = (e) => {
        const d = e.data || {};
        const res = waiting.get(d.id);
        if (!res) {
          lateWorker += 1;
          return;
        }
        waiting.delete(d.id);
        res(d);
      };
      worker.onerror = () => {
        workerFailed = true;
        for (const res of waiting.values()) res({ ok: false, error: 'worker error' });
        waiting.clear();
        worker = null;
      };
    } catch {
      workerFailed = true;
      worker = null;
    }
    return worker;
  }

  function crop(src) {
    const sw = src.width;
    const sh = src.height;
    const want = THUMB_W / THUMB_H;
    let cw = sw;
    let ch = Math.round(sw / want);
    if (ch > sh) {
      ch = sh;
      cw = Math.round(sh * want);
    }
    return { sx: Math.round((sw - cw) / 2), sy: Math.round((sh - ch) / 2), cw, ch };
  }

  // One task right after the next rendered frame — bounded (a hidden or
  // occluded page stops requestAnimationFrame; the encode must still finish).
  const afterFrame = () =>
    new Promise((res) => {
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        res();
      };
      requestAnimationFrame(() => setTimeout(fire, 0));
      setTimeout(fire, 100);
    });

  // Worker path: -> { url, drawMs (main-thread ms), quality, via } | null
  // (null: the worker failed or did not answer within WORKER_WAIT_MS).
  function encodeInWorker(bitmap) {
    const w = getWorker();
    if (!w) return null;
    const id = ++seq;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const timer = setTimeout(() => {
        waiting.delete(id);
        resolve(null);
      }, WORKER_WAIT_MS);
      waiting.set(id, (d) => {
        clearTimeout(timer);
        if (!d.ok) return resolve(null);
        const t1 = performance.now();
        const url = bufToDataUrl(d.buf);
        resolve({ url, drawMs: performance.now() - t1, quality: d.quality, via: 'worker', workerMs: Math.round(t1 - t0) });
      });
      try {
        w.postMessage({ id, bitmap, w: THUMB_W, h: THUMB_H, quality: 0.7, maxBytes: MAX_BYTES }, [bitmap]);
      } catch {
        waiting.delete(id);
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  // Fallback: a CPU-backed canvas in a post-frame task.
  async function encodeOnMain(bitmap) {
    await afterFrame();
    const t0 = performance.now();
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = THUMB_W;
      canvas.height = THUMB_H;
      ctx2d = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    }
    ctx2d.drawImage(bitmap, 0, 0, THUMB_W, THUMB_H);
    if (typeof bitmap.close === 'function') bitmap.close();
    let q = 0.7;
    let url = canvas.toDataURL('image/jpeg', q);
    while ((url.length - 23) * 0.75 > MAX_BYTES && q > 0.35) {
      q -= 0.1;
      url = canvas.toDataURL('image/jpeg', q);
    }
    return { url, drawMs: performance.now() - t0, quality: Math.round(q * 10) / 10, via: 'main' };
  }

  // spare: a main-thread copy of the snapshot (the worker gets `bitmap`
  // transferred); used when the worker is missing, fails or is too slow.
  async function encode(bitmap, spare) {
    const viaWorker = encodeInWorker(bitmap);
    if (viaWorker) {
      const r = await viaWorker;
      if (r) {
        if (spare && typeof spare.close === 'function') spare.close();
        return r;
      }
      if (!spare) return null; // transferred and no copy: nothing left to encode
      const m = await encodeOnMain(spare);
      return m ? { ...m, via: 'main-fallback', workerMs: Math.round(WORKER_WAIT_MS) } : null;
    }
    return encodeOnMain(spare || bitmap);
  }

  // prewarm() — start the worker now (boot idle) and run one tiny encode, so
  // the first real save never pays for the module fetch / worker start / JPEG
  // encoder init. Safe to call more than once.
  function prewarm() {
    if (warm || typeof document === 'undefined') return warm;
    warm = { startedAt: Math.round(performance.now()), ms: null, ok: null, error: null };
    try {
      if (typeof OffscreenCanvas !== 'function') throw new Error('no OffscreenCanvas');
      const c = new OffscreenCanvas(16, 9);
      const g = c.getContext('2d');
      g.fillStyle = '#231F1B';
      g.fillRect(0, 0, 16, 9);
      const bm = c.transferToImageBitmap();
      const w = getWorker();
      if (!w) throw new Error('no worker');
      const id = ++seq;
      const t0 = performance.now();
      waiting.set(id, (d) => {
        warm.ms = Math.round(performance.now() - t0);
        warm.ok = !!d.ok;
        if (!d.ok) warm.error = d.error || 'failed';
      });
      w.postMessage({ id, bitmap: bm, w: 16, h: 9, quality: 0.7, maxBytes: MAX_BYTES }, [bm]);
    } catch (err) {
      warm.ok = false;
      warm.error = String((err && err.message) || err);
    }
    return warm;
  }

  // next() -> Promise<{ dataUrl, ... } | null> — snapshots the next rendered
  // frame (render never stops, even behind a pause menu), or null after
  // 500 ms without a frame (a hidden tab).
  function next() {
    if (!renderer || typeof document === 'undefined' || typeof createImageBitmap !== 'function') return Promise.resolve(null);
    return new Promise((resolve) => {
      let done = false;
      const q = (renderer.__echoesNextRender = renderer.__echoesNextRender || []);
      const fn = (src) => {
        if (done) return;
        done = true;
        const t0 = performance.now();
        let p;
        try {
          const c = crop(src);
          p = createImageBitmap(src, c.sx, c.sy, c.cw, c.ch, { resizeWidth: THUMB_W, resizeHeight: THUMB_H, resizeQuality: 'medium' });
        } catch (err) {
          console.warn('[save] thumbnail snapshot failed', err);
          resolve(null);
          return;
        }
        const snapMs = performance.now() - t0;
        // A spare copy (GPU-side, async) for the main-thread fallback.
        p.then((bm) =>
          (typeof createImageBitmap === 'function' ? createImageBitmap(bm).catch(() => null) : Promise.resolve(null)).then((spare) => encode(bm, spare))
        )
          .then((r) => {
            if (!r || !r.url) return resolve(null);
            last = {
              dataUrl: r.url,
              at: Date.now(),
              snapMs: Math.round(snapMs * 10) / 10,
              drawMs: Math.round(r.drawMs * 10) / 10,
              ms: Math.round((snapMs + r.drawMs) * 10) / 10, // main-thread work
              workerMs: r.workerMs ?? null,
              via: r.via,
              bytes: Math.round((r.url.length - 23) * 0.75),
              quality: r.quality,
            };
            resolve(last);
          })
          .catch((err) => {
            console.warn('[save] thumbnail encode failed', err);
            resolve(null);
          });
      };
      q.push(fn);
      setTimeout(() => {
        if (done) return;
        done = true;
        const i = q.indexOf(fn);
        if (i >= 0) q.splice(i, 1);
        resolve(null);
      }, 500);
    });
  }

  return {
    next,
    prewarm,
    last: () => last,
    warm: () => (warm ? { ...warm, lateWorkerAnswers: lateWorker, worker: !!worker, workerFailed } : null),
  };
}
