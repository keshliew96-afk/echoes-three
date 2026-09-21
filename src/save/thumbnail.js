// Save thumbnails (docs/gauntlet/PLAN.md §3.4 "Thumbnail"). Owner: M2.
// 256 x 144 JPEG (quality 0.7, <= 20 KB) of the game view, taken from the
// WebGL canvas IMMEDIATELY after composer.render() (stage.js @gnt:M2
// THUMBNAIL runs the queued hooks there), so no preserveDrawingBuffer is
// needed and the menus (DOM) never appear in it.
//
// Frame cost (G2.7, no frame > 50 ms during a save): a synchronous
// toDataURL() on a canvas fed by the WebGL buffer stalls the main thread on
// the GPU (measured 30-50 ms at 1600 x 900), and the async toBlob() takes
// ~1 s of wall time on a continuously rendering page. So the hook only takes
// a cropped, downscaled ImageBitmap snapshot (< 1 ms; the resize runs off
// the main thread), and the 256 x 144 JPEG is encoded on a CPU-backed
// canvas in its own task right after a frame (measured 10-27 ms).
export const THUMB_W = 256;
export const THUMB_H = 144;
const MAX_BYTES = 20 * 1024;

export function createThumbnailer({ stage }) {
  const renderer = stage && stage.renderer;
  let canvas = null;
  let ctx2d = null;
  let last = null; // { dataUrl, at, snapMs, encodeMs, bytes, quality }

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

  // One task right after the next rendered frame (the frame's own work is
  // done, the next one is ~a refresh away).
  const afterFrame = () =>
    new Promise((res) => {
      requestAnimationFrame(() => setTimeout(res, 0));
    });

  async function encode(bitmap) {
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
    return { url, drawMs: performance.now() - t0, quality: Math.round(q * 10) / 10 };
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
              ms: Math.round((snapMs + r.drawMs) * 10) / 10, // main-thread work (snapshot + encode task)
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
