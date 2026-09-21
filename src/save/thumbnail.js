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
// main thread) and TRANSFERS it to a worker (src/save/thumb-worker.js) that
// draws it into an OffscreenCanvas and encodes the JPEG there. Without
// Worker / OffscreenCanvas support the encode falls back to a CPU-backed
// canvas in a post-frame task.
export const THUMB_W = 256;
export const THUMB_H = 144;
const MAX_BYTES = 20 * 1024;

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

  function getWorker() {
    if (worker || workerFailed) return worker;
    try {
      if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') throw new Error('no OffscreenCanvas');
      worker = new Worker(new URL('./thumb-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const d = e.data || {};
        const res = waiting.get(d.id);
        if (!res) return;
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

  // One task right after the next rendered frame.
  const afterFrame = () =>
    new Promise((res) => {
      requestAnimationFrame(() => setTimeout(res, 0));
    });

  // Worker path: -> { url, drawMs (main-thread ms), quality, via }
  function encodeInWorker(bitmap) {
    const w = getWorker();
    if (!w) return null;
    const id = ++seq;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const timer = setTimeout(() => {
        waiting.delete(id);
        resolve(null);
      }, 3000);
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

  async function encode(bitmap) {
    const viaWorker = encodeInWorker(bitmap);
    if (viaWorker) {
      const r = await viaWorker;
      if (r) return r;
      return null; // the bitmap was transferred: no main-thread retry
    }
    return encodeOnMain(bitmap);
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
        p.then((bm) => encode(bm))
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

  return { next, last: () => last };
}
