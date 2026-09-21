// Tiny pub/sub event bus + the docs/TESTING.md ring buffer (last 200 sim
// events, each `{ tick, type, ...payload }`). Sim modules emit; render/HUD
// subscribe (sim never imports render — this bus is the bridge).
//
// Two listener classes share ONE listener list (docs/gauntlet/PLAN.md §3.7
// "replica bus"), so single-player delivery order is exactly the v0.4.63
// order (registration order, type listeners then '*'):
//   - SIM listeners: registered through the `bus.sim()` view. createWorld()
//     swaps its `events` for that view, so every listener a sim module adds
//     (world room_cleared/defeat/hit hooks, nodes '*', boss telegraph_start)
//     is tagged SIM. They may mutate sim state and emit more sim events.
//   - PRESENTATION listeners: everything registered with `bus.on` (render
//     layers, HUD, run UI, scenes, audio). They never mutate sim state
//     (scene listeners that call world.cmd are refused on a network guest —
//     world replica mode, PLAN §3.7).
// emit()   = a sim emission: ring + every listener (SIM and PRESENTATION).
// replay() = a network guest re-emitting a HOST event: ring + PRESENTATION
//            listeners only. SIM listeners never run on a guest, so a replayed
//            room_cleared cannot re-run the run frame, gain Glint twice, roll a
//            draft on the guest RNG or grow the nodes continuation queue.
// setReplica(true) marks the bus as a guest replica: a sim-side emit() is
//            refused (dropped + counted in counters.refusedEmits — gate: 0),
//            because the replica is written only by snapshots, never stepped.
import { EVENT_RING_CAPACITY } from './constants.js';

export function createEventBus() {
  const ring = [];
  const listeners = new Map(); // type (or '*') -> Set<fn>
  const simFns = new WeakSet(); // listeners registered through the sim() view
  let replica = false;
  const counters = { emitted: 0, replayed: 0, simCalls: 0, presentationCalls: 0, refusedEmits: 0 };

  function deliver(ev, includeSim) {
    for (const key of [ev.type, '*']) {
      const set = listeners.get(key);
      if (!set) continue;
      for (const fn of set) {
        if (simFns.has(fn)) {
          if (!includeSim) continue;
          counters.simCalls += 1;
        } else counters.presentationCalls += 1;
        fn(ev);
      }
    }
  }

  function emit(tick, type, payload = {}) {
    const ev = { tick, type, ...payload };
    if (replica) {
      // `sound` is the one PRESENTATION-originated type (the audio engine's
      // observable contract): on a guest it is delivered like a replay.
      if (type === 'sound') return replay(ev);
      counters.refusedEmits += 1;
      return ev;
    }
    counters.emitted += 1;
    ring.push(ev);
    if (ring.length > EVENT_RING_CAPACITY) ring.shift();
    deliver(ev, true);
    return ev;
  }

  // replay(ev) — network guest only: `ev` is a host event ({ tick, type, ... })
  // delivered to PRESENTATION listeners (render, HUD, UI, audio) and the ring.
  function replay(ev) {
    counters.replayed += 1;
    ring.push(ev);
    if (ring.length > EVENT_RING_CAPACITY) ring.shift();
    deliver(ev, false);
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

  // The sim-side view handed to createWorld: same emit/buffer, but its on()
  // tags the listener SIM. Same Set, same registration order.
  const simView = Object.freeze({
    emit,
    on(type, fn) {
      simFns.add(fn);
      return on(type, fn);
    },
    buffer: () => ring.slice(),
    sim: () => simView,
    isSimView: true,
  });

  return {
    emit,
    on,
    replay,
    sim: () => simView,
    setReplica(v) {
      replica = !!v;
      return replica;
    },
    get replica() {
      return replica;
    },
    counters, // live object (debug / gates): simCalls must not grow on a guest
    buffer: () => ring.slice(), // copy — callers can't mutate history
  };
}
