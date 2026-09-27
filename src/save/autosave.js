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
// Throttle: >= 20 s of wall time between autosave WRITES, except run end,
// level transit and quit. A safe point inside the window is NEVER dropped
// (gauntlet r4 J4-F2, INT — the old rule dropped it: a room-2 entry 14.8 s
// after the room-1 autosave was never written, and closing the tab in room 2
// cost the cleared room 1, the drafted skill and the Glint). It is captured at
// its own tick like any other (captureTick === eventTick, rule 6 holds) and
// HELD — the newest held capture wins, an older one is superseded — then
// written when the window ends. A capture not yet on disk (held, or still in
// the async writer) is written AT ONCE, synchronously, when the page is hidden
// or closed (`flushNow`: visibilitychange hidden / pagehide — the browser may
// never run the async pieces again), and handed to the writer at once when the
// sim pauses or the app leaves play (`flushSoon`: the pause menu, the title),
// so Save / Load / Continue always see it. A write that finds a newer capture
// already on disk is superseded, never written over it. The log keeps the old
// `skipped: 'throttle' | 'busy'` wording for the write the window postponed,
// with `deferred: true` (nothing is dropped).
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
  // writeNow(slot, tree, { reason, capturedAt, shot, shotP }) -> { ok, ... }:
  // the synchronous writer the hidden / pagehide / load flush uses.
  writeNow = null,
  // snapshot() -> Promise<shot|null>: a held capture's picture, taken on a
  // calm frame right after its capture (the room as it was entered).
  snapshot = null,
  // holdWhile() -> true: a due held write waits (a probe drives the sim).
  holdWhile = () => false,
  isStepping = () => false,
  throttleMs = 20000,
  now = () => performance.now(),
}) {
  let pending = null; // { reasons[], eventTick, requestedAt }
  let lastAt = -Infinity;
  let busy = false;
  const log = []; // last 20 { reason, eventTick, captureTick, slot, ok, error, captureMs, thumbMs, writeMs, bytes } | { skipped[, deferred] } | { sync }
  let enabled = true;
  let retries = 0;
  let microQueued = false;
  // Captures in hand: `held` waits for the throttle window (or a flush);
  // `inflight` is with the async writer. `seq` orders captures; `written` is
  // the newest seq on disk. A held capture is always newer than the inflight.
  let seq = 0;
  let written = 0;
  let held = null; // { seq, tree, reason, eventTick, captureTick, capturedAt, captureMs, startedAt, shot: { p, v } | null }
  let inflight = null; // the same shape + slot
  let heldSoon = false; // flushSoon while busy: write the held capture right after the write in flight
  let timer = null;

  function push(rec) {
    log.push(rec);
    if (log.length > 20) log.shift();
  }

  function request(reason, eventTick = null) {
    if (!enabled) return false;
    // Two safe points on one tick (room_enter + shop_open at the shop) are one
    // autosave: the pending capture records both reasons.
    if (pending && pending.eventTick === eventTick) {
      if (!pending.reasons.includes(reason)) pending.reasons.push(reason);
      return true;
    }
    const why = allowed(reason);
    if (why !== true) {
      push({ reason, eventTick, skipped: why });
      return false;
    }
    if (pending) return true; // an earlier tick's capture is still due: it stands
    pending = { reasons: [reason], eventTick, requestedAt: now() };
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

  // Captures the pending safe point: a record, null (failed, logged) or
  // undefined (queues still hold work — retried at the next tick end).
  function captureRec(tick) {
    const p = pending;
    const reason = p.reasons.join('+');
    const t0 = now();
    let tree;
    try {
      tree = capture();
    } catch (err) {
      if (err && err.name === 'CapturePointError' && retries < 30) {
        retries += 1;
        return undefined;
      }
      pending = null;
      retries = 0;
      push({ reason, eventTick: p.eventTick, ok: false, error: String(err && err.message).slice(0, 160) });
      return null;
    }
    pending = null;
    retries = 0;
    return {
      seq: ++seq,
      tree,
      reason,
      urgent: p.reasons.some((r) => UNTHROTTLED.has(r)),
      eventTick: p.eventTick,
      captureTick: tick,
      capturedAt: new Date().toISOString(),
      captureMs: Math.round((now() - t0) * 10) / 10,
      startedAt: Math.round(t0),
      shot: null,
    };
  }

  function takeShot() {
    if (typeof snapshot !== 'function') return null;
    const s = { p: null, v: undefined };
    try {
      s.p = Promise.resolve(snapshot()).then(
        (v) => (s.v = v || null),
        () => (s.v = null)
      );
    } catch {
      return null;
    }
    return s;
  }

  function hold(rec, why) {
    if (held) push({ reason: held.reason, eventTick: held.eventTick, captureTick: held.captureTick, skipped: 'superseded' });
    if (!rec.shot) rec.shot = takeShot();
    held = rec;
    push({ reason: rec.reason, eventTick: rec.eventTick, captureTick: rec.captureTick, skipped: why, deferred: true, dueInMs: Math.max(0, Math.round(lastAt + throttleMs - now())) });
    schedule();
  }

  function atBoundary(tick) {
    if (!pending) return;
    // Run end / quit / level transit wait for a write in flight and capture on
    // the next free tick end (their state is a calm page: the camp, a card).
    if (busy && pending.reasons.some((r) => UNTHROTTLED.has(r))) return;
    const rec = captureRec(tick);
    if (!rec) return;
    if (rec.urgent || (!busy && now() - lastAt >= throttleMs)) {
      if (held) push({ reason: held.reason, eventTick: held.eventTick, captureTick: held.captureTick, skipped: 'superseded' });
      held = null; // this capture is newer: it goes to disk now
      clearTimer();
      startWrite(rec);
      return;
    }
    // Inside the throttle window, or a write is in flight: HOLD it — never drop it.
    hold(rec, busy ? 'busy' : 'throttle');
  }
  clock.onTickEnd(atBoundary);

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }
  function schedule(delayMs = null) {
    if (!held || busy) return; // a write in flight re-schedules when it ends
    clearTimer();
    const wait = delayMs ?? (heldSoon ? 0 : Math.max(0, lastAt + throttleMs - now()));
    timer = setTimeout(() => {
      timer = null;
      if (!held || busy) return;
      if (holdWhile()) {
        schedule(1000);
        return;
      }
      const h = held;
      held = null;
      startWrite(h);
    }, wait);
  }

  function logWrite(rec, slot, r, extra = {}) {
    push({
      reason: rec.reason,
      eventTick: rec.eventTick,
      captureTick: rec.captureTick,
      slot,
      ok: !!(r && r.ok),
      error: r && !r.ok ? r.error : null,
      captureMs: rec.captureMs,
      thumbMs: r && r.thumbMs,
      writeMs: r && r.writeMs,
      calmMs: r && r.calmMs,
      capturedAt: rec.capturedAt,
      pieces: r && r.pieces,
      bytes: r && r.bytes,
      at: Math.round(now()),
      startedAt: rec.startedAt,
      ...extra,
    });
  }

  function startWrite(rec) {
    heldSoon = false;
    lastAt = now();
    busy = true;
    const slot = pickSlot(rec.tree); // per-game rotation (src/save/index.js pickAutoSlot, gauntlet r3 J3-F3)
    rec.slot = slot;
    inflight = rec;
    Promise.resolve()
      .then(() =>
        write(slot, rec.tree, {
          reason: rec.reason,
          calm: true,
          capturedAt: rec.capturedAt,
          shotP: rec.shot ? rec.shot.p : null,
          superseded: () => written >= rec.seq,
        })
      )
      .then((r) => {
        if (r && r.ok) written = Math.max(written, rec.seq);
        if (r && r.error === 'superseded') push({ reason: rec.reason, eventTick: rec.eventTick, captureTick: rec.captureTick, slot, skipped: 'superseded' });
        else logWrite(rec, slot, r);
      })
      .catch((err) => push({ reason: rec.reason, eventTick: rec.eventTick, ok: false, error: String(err && err.message).slice(0, 160) }))
      .finally(() => {
        busy = false;
        if (inflight === rec) inflight = null;
        schedule();
      });
  }

  // flushNow(why, { avoid }) — SYNCHRONOUS: the newest capture not yet on disk
  // (held, or the one the async writer has not landed; a safe point marked but
  // not yet captured is captured first) is written before this returns. For
  // visibilitychange hidden / pagehide (the page may never run again) and for
  // a Load / New Game about to replace the state. `avoid`: the slot a Load is
  // about to read is never written over — a capture that would go there is
  // dropped instead (the player chose that save).
  function flushNow(why = 'hidden', { avoid = null } = {}) {
    if (!enabled) return { ok: false, skipped: 'disabled' };
    if (pending && !isStepping()) {
      const rec = captureRec(clock.tick);
      if (rec) {
        if (held) push({ reason: held.reason, eventTick: held.eventTick, captureTick: held.captureTick, skipped: 'superseded' });
        held = rec;
      }
    }
    const target = held || (inflight && inflight.seq > written ? inflight : null);
    if (!target) return { ok: true, skipped: 'nothing' };
    clearTimer();
    if (typeof writeNow !== 'function') return { ok: false, skipped: 'no-sync-writer' };
    const slot = target === inflight ? inflight.slot : pickSlot(target.tree);
    if (avoid && slot === avoid) {
      if (target === held) held = null;
      else written = Math.max(written, target.seq); // the async writer finds it superseded
      push({ reason: target.reason, eventTick: target.eventTick, captureTick: target.captureTick, slot, skipped: `avoid:${why}` });
      if (held) schedule();
      return { ok: false, skipped: 'avoid' };
    }
    const t0 = now();
    let r;
    try {
      r = writeNow(slot, target.tree, {
        reason: target.reason,
        capturedAt: target.capturedAt,
        shot: target.shot ? target.shot.v : null,
        shotP: target.shot ? target.shot.p : null,
      });
    } catch (err) {
      r = { ok: false, error: String(err && err.message).slice(0, 160) };
    }
    if (r && r.ok) {
      written = Math.max(written, target.seq);
      lastAt = now();
    }
    if (target === held) held = null;
    logWrite(target, slot, r, { sync: why, syncMs: Math.round((now() - t0) * 10) / 10 });
    if (held) schedule();
    return { ok: !!(r && r.ok), slot, reason: target.reason, error: r && !r.ok ? r.error : null };
  }

  // flushSoon(why) — the held capture goes to the async writer NOW (the sim
  // paused: a pause menu, the title), without waiting out the throttle window.
  function flushSoon(why = 'pause') {
    if (!held || !enabled) return false;
    push({ reason: held.reason, eventTick: held.eventTick, captureTick: held.captureTick, flush: why });
    if (busy) {
      heldSoon = true; // written the moment the write in flight ends
      return true;
    }
    clearTimer();
    const h = held;
    held = null;
    startWrite(h);
    return true;
  }

  // supersedeAll(why) — a newer capture is about to be written outside this
  // writer (Save & Quit): the held capture is dropped and one still in the
  // async writer never lands over it.
  function supersedeAll(why = 'quit') {
    if (held) push({ reason: held.reason, eventTick: held.eventTick, captureTick: held.captureTick, skipped: `superseded:${why}` });
    held = null;
    heldSoon = false;
    clearTimer();
    written = Math.max(written, seq);
  }

  return {
    request,
    flushNow,
    flushSoon,
    supersedeAll,
    get pending() {
      return pending;
    },
    get busy() {
      return busy;
    },
    // the capture waiting for its write (debug / probes)
    get held() {
      return held
        ? { reason: held.reason, eventTick: held.eventTick, captureTick: held.captureTick, capturedAt: held.capturedAt, dueInMs: heldSoon ? 0 : Math.max(0, Math.round(lastAt + throttleMs - now())) }
        : null;
    },
    log: () => log.map((r) => ({ ...r })),
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) {
        pending = null;
        held = null;
        heldSoon = false;
        clearTimer();
      }
      return enabled;
    },
    resetThrottle() {
      lastAt = -Infinity;
      if (held) schedule();
    },
  };
}
