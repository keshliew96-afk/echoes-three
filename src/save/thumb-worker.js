// Save-thumbnail encoder worker (docs/gauntlet/PLAN.md §3.4 "Thumbnail",
// gate G2.7). Owner: M2. Receives a transferred, already-downscaled
// ImageBitmap of the game view and returns a JPEG (quality 0.7, stepped down
// until it fits the byte cap) as a transferred ArrayBuffer. The GPU readback
// and the JPEG encode both happen on THIS thread, so the game's main thread
// never waits on either (measured 26-133 ms on the main thread otherwise).
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
