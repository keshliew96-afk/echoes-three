// Tiny pub/sub event bus + the docs/TESTING.md ring buffer (last 200 sim
// events, each `{ tick, type, ...payload }`). Sim modules emit; render/HUD
// subscribe (sim never imports render — this bus is the bridge).
import { EVENT_RING_CAPACITY } from './constants.js';

export function createEventBus() {
  const ring = [];
  const listeners = new Map(); // type (or '*') -> Set<fn>

  function emit(tick, type, payload = {}) {
    const ev = { tick, type, ...payload };
    ring.push(ev);
    if (ring.length > EVENT_RING_CAPACITY) ring.shift();
    for (const key of [type, '*']) {
      const set = listeners.get(key);
      if (set) for (const fn of set) fn(ev);
    }
    return ev;
  }

  // on(type, fn) — subscribe; '*' hears everything. Returns an unsubscribe.
  function on(type, fn) {
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    set.add(fn);
    return () => set.delete(fn);
  }

  return {
    emit,
    on,
    buffer: () => ring.slice(), // copy — callers can't mutate history
  };
}
