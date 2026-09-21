// Autosave at safe points (docs/gauntlet/PLAN.md §3.4 "Autosave"). Owner: M2.
//
// Safe points: `room_enter` (the room's first tick), `shop_open`, `run_end`
// (the end card, the camp already behind it), `return_to_camp`, and Save &
// Quit (the service calls autosave('quit') directly). Never during a
// transition fade, never as a network guest, never while a probe drives the
// sim, never outside app state `playing`.
//
// Split across frames so no frame pays for more than one piece (G2.7: no
// frame > 50 ms):
//   event (mid-tick) -> pending = reason
//   next clock.onTickEnd -> capture() (the only sim touch; ~1-3 ms)
//   next rendered frame  -> thumbnail (256 x 144 JPEG off the canvas)
//   idle callback        -> encode + verify + atomic write + index
// Throttle: >= 20 s of wall time between autosaves, except run end and quit.
// Slots: auto-1 / auto-2 alternate (the older one is overwritten), so a
// torn write can never cost the only autosave.
export const SAFE_POINTS = Object.freeze(['room_enter', 'shop_open', 'run_end', 'return_to_camp']);
const UNTHROTTLED = new Set(['run_end', 'quit']);

export function createAutosave({ bus, clock, allowed, capture, pickSlot, write, throttleMs = 20000, now = () => performance.now() }) {
  let pending = null; // { reason, eventTick, requestedAt }
  let lastAt = -Infinity;
  let busy = false;
  const log = []; // last 20 { reason, eventTick, captureTick, slot, ok, error, captureMs, thumbMs, writeMs, bytes }
  let enabled = true;

  function push(rec) {
    log.push(rec);
    if (log.length > 20) log.shift();
  }

  function request(reason, eventTick = null) {
    if (!enabled) return false;
    const t = now();
    if (!UNTHROTTLED.has(reason) && t - lastAt < throttleMs) {
      push({ reason, eventTick, skipped: 'throttle', sinceMs: Math.round(t - lastAt) });
      return false;
    }
    const why = allowed(reason);
    if (why !== true) {
      push({ reason, eventTick, skipped: why });
      return false;
    }
    // A later safe point in the same tick wins nothing: the first one stands.
    if (!pending) pending = { reason, eventTick, requestedAt: t };
    return true;
  }

  for (const type of SAFE_POINTS) bus.on(type, (ev) => request(type, ev && ev.tick));

  let retries = 0;
  clock.onTickEnd((tick) => {
    if (!pending || busy) return;
    const p = pending;
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
      push({ reason: p.reason, eventTick: p.eventTick, ok: false, error: String(err && err.message).slice(0, 160) });
      return;
    }
    pending = null;
    retries = 0;
    const captureMs = Math.round((now() - t0) * 10) / 10;
    lastAt = now();
    busy = true;
    const slot = pickSlot();
    Promise.resolve()
      .then(() => write(slot, tree, { reason: p.reason }))
      .then((r) => {
        push({
          reason: p.reason,
          eventTick: p.eventTick,
          captureTick: tick,
          slot,
          ok: !!(r && r.ok),
          error: r && !r.ok ? r.error : null,
          captureMs,
          thumbMs: r && r.thumbMs,
          writeMs: r && r.writeMs,
          bytes: r && r.bytes,
          at: Math.round(now()),
        });
      })
      .catch((err) => push({ reason: p.reason, eventTick: p.eventTick, ok: false, error: String(err && err.message).slice(0, 160) }))
      .finally(() => {
        busy = false;
      });
  });

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
