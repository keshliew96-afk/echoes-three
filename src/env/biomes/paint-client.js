// Main-thread side of the dressing paint worker (paint-worker.js). The
// background dressing builder asks for a layout's floor + apron here and keeps
// yielding (the WAIT token) until the bitmaps land; each lands as an ordinary
// <canvas> (one GPU blit), so everything downstream — CanvasTexture, the
// capture harness's window.__groundCanvas — sees exactly what a main-thread
// paint produces. No worker / OffscreenCanvas support, or a worker error, and
// the request resolves `ok: false`: the caller paints on the main thread.
import { PAINT_CTX } from '../ground.js';

let worker = null;
let broken = false;
let seq = 0;
const pending = new Map();
export const stats = { requests: 0, ok: 0, failed: 0, lastMs: 0, maxMs: 0 };

// A CPU-backed canvas (ground.js PAINT_CTX): the worker's bitmap is already in
// CPU memory, so this is a memcpy and the CanvasTexture upload a plain CPU ->
// GPU copy — no GPU-process readback stalling the game's frames.
function toCanvas(bitmap) {
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  c.getContext('2d', PAINT_CTX).drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return c;
}

function ensureWorker() {
  if (worker || broken) return worker;
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    broken = true;
    return null;
  }
  try {
    worker = new Worker(new URL('./paint-worker.js', import.meta.url), { type: 'module' });
  } catch {
    broken = true;
    return null;
  }
  worker.onmessage = (ev) => {
    const m = ev.data || {};
    const req = pending.get(m.reqId);
    if (!req) return;
    pending.delete(m.reqId);
    if (m.error || !m.ground || !m.apron) {
      stats.failed += 1;
      req.error = m.error || 'no bitmaps';
      req.done = true;
      return;
    }
    req.ground = toCanvas(m.ground);
    req.apron = toCanvas(m.apron);
    req.draws = m.draws;
    req.ms = m.ms;
    req.ok = true;
    req.done = true;
    stats.ok += 1;
    stats.lastMs = m.ms;
    if (m.ms > stats.maxMs) stats.maxMs = m.ms;
  };
  worker.onerror = (e) => {
    // A worker that cannot even load (module error) fails every request.
    broken = true;
    for (const req of pending.values()) {
      req.error = String((e && e.message) || 'worker error');
      req.done = true;
    }
    pending.clear();
    try {
      worker.terminate();
    } catch {
      /* already gone */
    }
    worker = null;
  };
  return worker;
}

// -> { done, ok, ground, apron, draws, error } (filled in when it lands).
export function requestPaint(layoutId) {
  const req = { id: layoutId, done: false, ok: false, ground: null, apron: null, draws: 0, error: null };
  const w = ensureWorker();
  if (!w) {
    req.done = true;
    req.error = 'no worker';
    return req;
  }
  stats.requests += 1;
  const reqId = ++seq;
  pending.set(reqId, req);
  w.postMessage({ reqId, id: layoutId });
  return req;
}

export function paintWorkerAvailable() {
  return !broken && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}
