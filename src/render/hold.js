// Render hold on hitstop (docs/HIT_FEEDBACK.md "The hit and the kill",
// VFX_HIT_RULES F1 / §6.2 b). The sim's hitstop freezes the world for 2 ticks
// on a melee connect and 3 on a kill, but the render kept every clock running
// through it, so the freeze read as a position stall. This module turns each
// `hitstop` event into the same length of render hold for the things that
// make up the hit's pose: the rig clips (foes, champions, bosses, heroes,
// dummies, the kill pop), the slash ribbons' sweep and the flare time. The
// particles, numbers, telegraphs, the camera and the audio keep running.
//
// A module-level singleton like vfx/hub.js. Pure: no DOM and no sim import,
// so Node probes import it as is. It only reads `hitstop` events, which co-op
// guests get replayed in host order, so a guest holds on the same frames.
//
//   wireRenderHold(bus)            once, from main.js
//   markRenderHold()               just before the frame steps the clock
//   frameRenderHold(nowSec, dt, before, after)
//                                  once per rendered frame, before the layers;
//                                  before/after: the local clock's pending
//                                  hitstop ticks around its step (null on a
//                                  co-op guest, whose clock never freezes)
//   renderHold.time(tSec)          the held clock to pose a rig with: tSec
//                                  minus every second held so far (monotonic)
//   renderHold.rigDt(dt)           a layer's frame dt minus this frame's hold
//   renderHold.due                 seconds that started holding this frame
//                                  (vfx/kit.js and vfx/tplkit.js owe it to
//                                  each live held slot)
//
// Solo and host: the hold pays the frozen ticks the clock really consumed
// this frame (its pending count before the step, plus this frame's grants,
// minus what is left), so it lines up with the freeze at any frame rate: at
// 60 fps the frame that steps the hit tick still plays (the swing's release
// lands, the slash draws its first head, the flare starts popping) and the
// next frames hold; at 20 fps a kill's frozen ticks inside the hit frame hold
// there. A co-op guest's clock never freezes (the host's snapshots carry the
// stall), so a guest pays each replayed `hitstop` from the frame after it.
import { HITSTOP, TICK_HZ } from '../core/constants.js';

// The most one window of hitstop can grant (4 ticks, 67 ms). A hidden host or
// a debug stepN can emit hitstop with no frame to pay it, so nothing banks
// more than this.
export const HOLD_CAP = HITSTOP.budgetTicks / TICK_HZ;

let fresh = 0; // granted by this frame's events, not yet queued
let queued = 0; // granted last frame, starts paying this frame
let owed = 0; // still to pay
let paid = 0; // paid this frame
let due = 0; // started holding this frame
let total = 0; // every second held since boot (the held clock's offset)
let events = 0; // hitstop events seen (probe)
let granted = 0; // ticks granted since markRenderHold (uncapped)
let restored = false; // a restore landed since the last frame
let wired = false;

export function wireRenderHold(bus) {
  if (wired || !bus) return;
  wired = true;
  bus.on('hitstop', (ev) => {
    events += 1;
    const n = Math.max(0, ev.ticks || 0);
    granted += n;
    fresh = Math.min(HOLD_CAP, fresh + n / TICK_HZ);
  });
  // A restore replaces the clock's pending freeze: start the count over (a
  // freeze it restores is paid from the next frame's step).
  bus.on('state_restored', () => {
    fresh = queued = owed = 0;
    restored = true;
  });
}

export function markRenderHold() {
  granted = 0;
  restored = false;
}

export function frameRenderHold(nowSec, frameDt, before = null, after = null) {
  const dt = Math.max(0, Number.isFinite(frameDt) ? frameDt : 0);
  if (Number.isFinite(before) && Number.isFinite(after)) {
    const frozen = restored ? 0 : Math.max(0, before + granted - after);
    due = frozen / TICK_HZ;
    owed = Math.min(HOLD_CAP, owed + due);
    fresh = queued = 0;
  } else {
    due = queued;
    owed = Math.min(HOLD_CAP, owed + queued);
    queued = fresh;
    fresh = 0;
  }
  granted = 0;
  restored = false;
  paid = Math.min(owed, dt);
  owed -= paid;
  total += paid;
}

export const renderHold = {
  // The held clock: wall seconds minus every second the hold has paid. It
  // never runs backwards (a frame pays at most its own dt), so a rig that
  // keys a reset on t < lastT (the faceted Wyrm's coil) never sees one. Every
  // caller that poses one rig must use this, never mix it with raw tSec.
  time: (tSec) => tSec - total,
  rigDt: (dt) => Math.max(0, dt - paid),
  get paid() {
    return paid;
  },
  get due() {
    return due;
  },
  get holding() {
    return paid > 0;
  },
  debug: () => ({ fresh, queued, owed, paid, due, total, events, granted, cap: HOLD_CAP }),
};

// Tests only: back to boot state.
export function resetRenderHold() {
  fresh = queued = owed = paid = due = total = events = granted = 0;
  restored = false;
}
