// Autosave at safe points (docs/gauntlet/PLAN.md §3.4 "Autosave"). Owner: M2.
//
// Safe points: `room_enter` (the room's first tick), `shop_open`, `run_end`
// (the end card, the camp already behind it), `return_to_camp`,
// `level_transit` (CAMPAIGN: the level-clear card), and Save &
// Quit (the service calls autosave('quit') directly). Never during a
// transition fade, never as a network guest, never while a probe drives the
// sim, never outside app state `playing`.
//
// CAPTURE POINT (§3.4 rule 6): the listener only marks the safe point
// pending; the capture runs at the END of the event's own tick —
//   - an event emitted inside a sim step (the normal case): the next
//     clock.onTickEnd, i.e. the same tick once world.step has returned;
//   - an event emitted between frames (a UI / debug command such as
//     startRun or skipToRoom): a microtask, i.e. after the command's
//     synchronous code has finished and before the next tick.
// Either way captureTick === eventTick.
//
// Split across frames so no frame pays for more than one piece (G2.7):
//   capture (~0.5 ms) -> wait for calm frames (a room swap's own hitch passes
//   first) -> thumbnail snapshot on a rendered frame -> JPEG encode in a
//   post-frame task -> encode + verify + atomic write in another.
// The catalogue stamp (`savedAt`, what the slot list, Continue and the
// auto-slot rotation sort by) is the CAPTURE time, taken here the moment the
// tree is captured and handed to the writer as `capturedAt` — never the time
// the deferred write lands. Under load the write can trail the capture by
// seconds, and a room-enter autosave that landed after a later manual save
// used to outrank it and become Continue's target (gauntlet r1, J3).
// Throttle: >= 20 s of wall time between autosaves, except run end and quit.
// Slots: auto-1 / auto-2 alternate (the older one is overwritten), so a
// torn write can never cost the only autosave — PER GAME since gauntlet r3
// J3-F3: `pickSlot(tree)` spares another game's run in progress (a Save &
// Quit the player walked away from) while a slot of this game or a slot with
// no run in progress is available; that game then rotates in one slot, its
// torn-write safety carried by the atomic write's `.bak`.
// CAMPAIGN (PLAN §12.8): `level_transit` — the level-clear card (the cleared
// level torn down, the party restored, the carried build) is a safe point of
// its own, unthrottled like run end: every level transition is autosaved.
export const SAFE_POINTS = Object.freeze(['room_enter', 'shop_open', 'run_end', 'return_to_camp', 'level_transit']);
const UNTHROTTLED = new Set(['run_end', 'quit', 'level_transit']);

export function createAutosave({
  bus,
  clock,
  allowed,
  capture,
  pickSlot,
  write,
  isStepping = () => false,
  throttleMs = 20000,
  now = () => performance.now(),
}) {
  let pending = null; // { reasons[], eventTick, requestedAt }
  let lastAt = -Infinity;
  let busy = false;
  const log = []; // last 20 { reason, eventTick, captureTick, slot, ok, error, captureMs, thumbMs, writeMs, bytes } | { skipped }
  let enabled = true;
  let retries = 0;
  let microQueued = false;

  function push(rec) {
    log.push(rec);
    if (log.length > 20) log.shift();
  }

  function request(reason, eventTick = null) {
    if (!enabled) return false;
    const t = now();
    // Two safe points on one tick (room_enter + shop_open at the shop) are one
    // autosave: the pending capture records both reasons.
    if (pending && pending.eventTick === eventTick) {
      if (!pending.reasons.includes(reason)) pending.reasons.push(reason);
      return true;
    }
    if (!UNTHROTTLED.has(reason) && t - lastAt < throttleMs) {
      push({ reason, eventTick, skipped: 'throttle', sinceMs: Math.round(t - lastAt) });
      return false;
    }
    const why = allowed(reason);
    if (why !== true) {
      push({ reason, eventTick, skipped: why });
      return false;
    }
    if (pending) return true; // an earlier tick's capture is still due: it stands
    pending = { reasons: [reason], eventTick, requestedAt: t };
    // Emitted between frames (no step running): capture once the emitting
    // command has returned, still on this tick.
    if (!isStepping() && !microQueued) {
      microQueued = true;
      queueMicrotask(() => {
        microQueued = false;
        if (!isStepping()) atBoundary(clock.tick);
      });
    }
    return true;
  }

  for (const type of SAFE_POINTS) bus.on(type, (ev) => request(type, ev && ev.tick));

  function atBoundary(tick) {
    if (!pending) return;
    if (busy) {
      // A write is still in flight: a throttled safe point is dropped (the
      // capture must be ITS tick, not a later mid-room one); run end / quit
      // wait for the write and capture on the next free tick end.
      if (!pending.reasons.some((r) => UNTHROTTLED.has(r))) {
        push({ reason: pending.reasons.join('+'), eventTick: pending.eventTick, skipped: 'busy' });
        pending = null;
      }
      return;
    }
    const p = pending;
    const reason = p.reasons.join('+');
    const t0 = now();
    let tree;
    try {
      tree = capture();
    } catch (err) {
      if (err && err.name === 'CapturePointError' && retries < 30) {
        retries += 1; // queues still hold work: try the next tick end
        return;
      }
      pending = null;
      retries = 0;
      push({ reason, eventTick: p.eventTick, ok: false, error: String(err && err.message).slice(0, 160) });
      return;
    }
    pending = null;
    retries = 0;
    const capturedAt = new Date().toISOString();
    const captureMs = Math.round((now() - t0) * 10) / 10;
    lastAt = now();
    busy = true;
    const slot = pickSlot(tree); // per-game rotation (src/save/index.js pickAutoSlot, gauntlet r3 J3-F3)
    Promise.resolve()
      .then(() => write(slot, tree, { reason, calm: true, capturedAt }))
      .then((r) => {
        push({
          reason,
          eventTick: p.eventTick,
          captureTick: tick,
          slot,
          ok: !!(r && r.ok),
          error: r && !r.ok ? r.error : null,
          captureMs,
          thumbMs: r && r.thumbMs,
          writeMs: r && r.writeMs,
          calmMs: r && r.calmMs,
          capturedAt,
          pieces: r && r.pieces,
          bytes: r && r.bytes,
          at: Math.round(now()),
          startedAt: Math.round(t0),
        });
      })
      .catch((err) => push({ reason, eventTick: p.eventTick, ok: false, error: String(err && err.message).slice(0, 160) }))
      .finally(() => {
        busy = false;
      });
  }
  clock.onTickEnd(atBoundary);

  return {
    request,
    get pending() {
      return pending;
    },
    get busy() {
      return busy;
    },
    log: () => log.map((r) => ({ ...r })),
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) pending = null;
      return enabled;
    },
    resetThrottle() {
      lastAt = -Infinity;
    },
  };
}
