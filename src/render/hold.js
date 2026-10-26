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
//   frameRenderHold(nowSec, dt)    once per rendered frame, before the layers
//   renderHold.time(tSec)          the held clock to pose a rig with: tSec
//                                  minus every second held so far (monotonic)
//   renderHold.rigDt(dt)           a layer's frame dt minus this frame's hold
//   renderHold.due                 seconds that started holding this frame
//                                  (vfx/kit.js and vfx/tplkit.js owe it to
//                                  each live held slot)
//
// The grant pays from the frame AFTER the hit: the frame that steps the hit
// tick still plays (the swing's release lands, the slash draws its first
// head, the flare starts popping), and the hold covers the frames the sim
// spends in the freeze. Paying on the hit frame would freeze the rig before
// its release.
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
let wired = false;

export function wireRenderHold(bus) {
  if (wired || !bus) return;
  wired = true;
  bus.on('hitstop', (ev) => {
    events += 1;
    fresh = Math.min(HOLD_CAP, fresh + Math.max(0, ev.ticks || 0) / TICK_HZ);
  });
  // A restored save drops the pending freeze with no event; nothing to pay.
  bus.on('state_restored', () => {
    fresh = queued = owed = 0;
  });
}

export function frameRenderHold(nowSec, frameDt) {
  const dt = Math.max(0, Number.isFinite(frameDt) ? frameDt : 0);
  due = queued;
  owed = Math.min(HOLD_CAP, owed + queued);
  queued = fresh;
  fresh = 0;
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
  debug: () => ({ fresh, queued, owed, paid, due, total, events, cap: HOLD_CAP }),
};

// Tests only: back to boot state.
export function resetRenderHold() {
  fresh = queued = owed = paid = due = total = events = 0;
}
