// A TELEGRAPHED STRIKE (docs/MODEL_STANDARD.md "The Level II foes"). The
// Level I wasp's dart, made a kit piece for every foe whose attack is one
// telegraphed blow: the sim's wind-up is the coil, the strike takes the last
// 2.5 frames of it, sampled on the shown sim tick so its contact lands on the
// release frame (§6.1 B1, B2), the contact holds for as long as the sim keeps
// the foe in its strike (a dive, a lunge, a leap) and at least 3 frames, then
// the body snaps back and settles into rest with one overshoot (B5). A
// telegraph the sim cancels (a stun, a blind, a room clear, landing even on
// the resolve tick) is an abort: the coil eases back to rest and any strike
// already begun is taken back. A strike the sim starts with no wind-up seen
// (the rig met it mid-attack, or an unwarned throw) snaps in from wherever
// the body is in one frame.
//
// A rig owns the watch (render/facet/foe.js createAttackWatch) and hands this
// clip each frame's beat, the sim's own word that the strike is under way
// (`holding`: a dive mode; `fired`: a new strike tick), and its pose objects:
// one variant { coil, strike, over } per blow, plain objects over the same
// fields as `rest`. Render only: nothing here reads the sim beyond the beat
// and the flags the rig passes, and nothing reads the wall clock.
import { kick } from './beats.js';
import { createTimeline, ease } from './timeline.js';
import { FRAME, lerpFields, settle } from './foe.js';

const TICK_HZ = 60;
// B2: the strike, 2.5 frames (5 sim ticks).
export const STRIKE_SEC = 2.5 * FRAME;
export const STRIKE_TICKS = STRIKE_SEC * TICK_HZ;
// B2: the contact held at least this long.
export const HOLD_SEC = 3 * FRAME;
export const SNAP_SEC = 2.5 * FRAME;
export const SETTLE_SEC = 6 * FRAME;

// The coil, k 0..1 across the wind-up: most of the way in its first 40%,
// then a slow deepening toward the release (the tell builds).
export function coilCurve(k) {
  const c = k < 0 ? 0 : k > 1 ? 1 : k;
  return 0.85 * ease.out(Math.min(1, c / 0.4)) + 0.15 * c;
}

// One strike on its lab timeline: the coil the length of the sim's telegraph
// less the strike, the strike, the held contact, the snap back, the settle and
// a short rest. `labels` names the phases for the lab's readout.
export function strikeTimeline(id, label, { tel, hold = HOLD_SEC, snap = SNAP_SEC, settle: st = SETTLE_SEC, rest = 0.15, labels = {} }) {
  return createTimeline(id, label, [
    { id: 'coil', label: labels.coil || 'coil (the telegraph)', dur: Math.max(FRAME, tel - STRIKE_SEC) },
    { id: 'strike', label: labels.strike || 'strike', dur: STRIKE_SEC },
    { id: 'hold', label: labels.hold || 'contact held', dur: hold },
    { id: 'snap', label: labels.snap || 'snap back', dur: snap },
    { id: 'settle', label: labels.settle || 'settle', dur: st },
    { id: 'rest', label: 'rest', dur: rest },
  ]);
}

// Pure: variant V on timeline tl at t. `held(V, age, out)` (optional) adds the
// held contact's own motion (a kick settling, a thrash) on top of V.strike.
export function strikePoseAt(tl, V, rest, fields, t, out, held = null) {
  const s = tl.sample(t);
  if (s.id === 'coil') return lerpFields(out, rest, V.coil, coilCurve(s.k), fields);
  if (s.id === 'strike') return lerpFields(out, V.coil, V.strike, kick(s.k), fields);
  if (s.id === 'hold') {
    Object.assign(out, V.strike);
    if (held) held(V, s.t - tl.startOf('hold'), out);
    return out;
  }
  if (s.id === 'snap') return lerpFields(out, V.strike, V.over, ease.out(s.k), fields);
  if (s.id === 'settle') return lerpFields(out, V.over, rest, 1 - settle(s.k), fields);
  return Object.assign(out, rest);
}

// The live strike. update() each frame with:
//   beat      the watch's beat this frame (or null)
//   tel       the watch's live telegraph { startTick, resolveTick } (or null)
//   now       the rig clock's seconds; tick: its held sim tick
//   holding   the sim keeps the foe in its strike (a dive mode), or false
//   fired     the sim's own strike signal is new this frame (a strike tick)
//   pick()    the variant for a new strike (called once per strike)
//   name(V)   its id for lab.lastStrike
//   out       the pose to write
// Returns the clip's state: 'rest', 'coil', 'strike', 'held', 'snapin',
// 'pull' or 'abort'.
export function createStrikeClip({ rest, fields, strikeTicks = STRIKE_TICKS, minHold = HOLD_SEC, maxHold = 1.5, snapSec = SNAP_SEC, settleSec = SETTLE_SEC, held = null }) {
  let state = 'rest';
  let V = null;
  let telStart = 0;
  let telResolve = 0;
  let released = false;
  let shownMax = -1e9;
  let t0 = 0;
  let offAt = null;
  let wasHolding = false;
  const capture = { ...rest };
  const strike = { id: '', tick: 0 };
  const prev = { had: false, id: '', tick: 0 };
  const api = {
    lastStrike: null, // { id, tick }: the sim tick the latest strike's contact lands on
    get state() {
      return state;
    },
    get variant() {
      return V;
    },
    // how far into its state the clip is: the coil's and the strike's k
    // (0..1), the held contact's seconds, the pull's and the abort's seconds
    get progress() {
      return prog;
    },
    // seconds the contact has held (0 outside it)
    get heldAge() {
      return state === 'held' ? heldNow - t0 : 0;
    },
    // seconds since the contact landed (the recoil's clock), or null
    get sinceContact() {
      return contactAt === null ? null : heldNow - contactAt;
    },
    reset() {
      state = 'rest';
      V = null;
      offAt = null;
      wasHolding = false;
      contactAt = null;
    },
    update({ beat, tel, now, tick, holding = false, fired = false, pick, name = () => 'strike', out }) {
      heldNow = now;
      if (beat && beat.type === 'wind' && tel) {
        Object.assign(capture, out);
        V = pick();
        telStart = tel.startTick;
        telResolve = tel.resolveTick;
        released = false;
        shownMax = -1e9;
        state = 'coil';
      } else if (beat && beat.type === 'release' && (state === 'coil' || state === 'strike')) released = true;
      else if (beat && beat.type === 'cancel' && (state === 'coil' || state === 'strike')) {
        if (state === 'strike') unStrike();
        Object.assign(capture, out);
        state = 'abort';
        t0 = now;
      }
      // the sim struck with no wind-up seen: one frame from wherever the body
      // is into the contact (B1)
      const begun = (holding && !wasHolding) || fired;
      if (begun && state !== 'coil' && state !== 'strike' && state !== 'held' && state !== 'snapin') {
        Object.assign(capture, out);
        V = pick();
        state = 'snapin';
        t0 = now;
        note(name(V), tick + 1 + FRAME * TICK_HZ);
      }
      wasHolding = holding;
      if (state === 'coil' || state === 'strike') {
        // sampled on the SHOWN tick (the layer poses at state tick - 1 +
        // alpha): the whole strike plays and its contact lands on the release
        // frame; it never runs backward (a hitstop saw-tooths the tick)
        const shown = Math.min(telResolve, Math.max(shownMax, tick + 1));
        shownMax = shown;
        const span = Math.max(1, telResolve - telStart);
        const sTicks = Math.min(strikeTicks, span * 0.5);
        const strikeAt = telResolve - sTicks;
        // the strike's first frame is already on its way (B4): the coil
        // owns the frame on strikeAt itself
        if (shown <= strikeAt) {
          const kc = (shown - telStart) / (strikeAt - telStart);
          prog = kc;
          lerpFields(out, capture, V.coil, coilCurve(kc), fields);
        } else {
          if (state === 'coil') {
            state = 'strike';
            note(name(V), telResolve);
          }
          const ks = (shown - strikeAt) / sTicks;
          prog = ks > 1 ? 1 : ks;
          lerpFields(out, V.coil, V.strike, kick(ks > 1 ? 1 : ks), fields);
          // the contact only on the sim's own word: the watch's release (a
          // held resolve is a cancel), the strike mode, or its strike tick
          if (shown >= telResolve && (released || holding || fired)) {
            state = 'held';
            t0 = now;
            contactAt = now;
            offAt = null;
          }
        }
      }
      if (state === 'snapin') {
        const k = (now - t0) / FRAME;
        prog = k;
        if (k >= 1 - 1e-6) {
          state = 'held';
          t0 = now;
          contactAt = now;
          offAt = null;
        } else lerpFields(out, capture, V.strike, kick(k), fields);
      }
      if (state === 'held') {
        const age = now - t0;
        prog = age;
        Object.assign(out, V.strike);
        if (held) held(V, age, out);
        // the contact ends a tick after the sim lets the strike go (the layer
        // draws its last step then), never before it has held 3 frames (B2)
        if (holding) offAt = null;
        else if (offAt === null) offAt = tick;
        if ((offAt !== null && tick >= offAt + 1 && age >= minHold) || age > maxHold) {
          Object.assign(capture, out);
          state = 'pull';
          t0 = now;
        }
      }
      if (state === 'pull') {
        const tp = now - t0;
        prog = tp;
        if (tp < snapSec) lerpFields(out, capture, V.over, ease.out(tp / snapSec), fields);
        else if (tp < snapSec + settleSec) lerpFields(out, V.over, rest, 1 - settle((tp - snapSec) / settleSec), fields);
        else state = 'rest';
      }
      if (state === 'abort') {
        const k = (now - t0) / settleSec;
        prog = now - t0;
        if (k >= 1) state = 'rest';
        else lerpFields(out, capture, rest, 1 - settle(k), fields);
      }
      if (state === 'rest') Object.assign(out, rest);
      return state;
    },
  };
  let heldNow = 0;
  let prog = 0;
  let contactAt = null;
  function note(id, tick) {
    prev.had = api.lastStrike !== null;
    prev.id = strike.id;
    prev.tick = strike.tick;
    strike.id = id;
    strike.tick = tick;
    api.lastStrike = strike;
  }
  // a telegraph cancelled inside its strike frames never struck
  function unStrike() {
    if (prev.had) {
      strike.id = prev.id;
      strike.tick = prev.tick;
    } else api.lastStrike = null;
  }
  return api;
}

// A lab ability over one strike timeline: `n` blows in turn (variant k of
// `variants` for blow k), `gap` seconds apart, pure in t. `classic(tt, s)`
// gives the classic twin's stand-in inputs at tt into the blow.
export function strikeAbility({ id, label, tl, variants, n = 1, gap = tl.duration, classic = null }) {
  const which = (t) => (n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.floor(t / gap))));
  return Object.freeze({
    id,
    label,
    duration: (n - 1) * gap + tl.duration,
    at(t) {
      const k = which(t);
      const tt = t - k * gap;
      const s = tl.sample(tt);
      const V = variants[k % variants.length];
      return { v: k % variants.length, k, t: tt, phase: s.id, label: `${n > 1 ? `${k + 1}, ` : ''}${V.label}: ${s.label}` };
    },
    // the contacts (the lab's cues)
    strikes: Array.from({ length: n }, (_, k) => k * gap + tl.startOf('hold')),
    classicAt: classic ? (t) => {
      const k = which(t);
      const tt = t - k * gap;
      return classic(tt, tl.sample(tt), k);
    } : undefined,
  });
}
