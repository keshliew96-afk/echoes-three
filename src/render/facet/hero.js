// HERO CORE (docs/MODEL_STANDARD.md). What every model-standard hero rig
// shares, lifted out of the Tank pilot so the Healer, the Swordsman and the
// heroes after them play by the same rules: Kesh's animation templates (the
// 3-hit combo and the technical self-check) and the [M] rules of the VFX/hit
// rules doc (/mnt/project-files/plan/VFX_HIT_RULES.md §6.1):
//
//   posePack(weapon)      a pose is a flat vector of numbers: the body fields
//                         every hero shares (BODY) plus the rig's own weapon
//                         fields; K() freezes a key pose, lerp() blends two
//   createMove(...)       a keyed move: a timeline whose phases each ease to
//                         a key pose (an ability, or one hit of the combo)
//   createCombo(...)      the three hits of the basic combo; each hit's
//                         overshoot and settle IS the next hit's wind-up
//   createAttackClock()   the combo counted on the render clock, the skills,
//                         the held contact on a hitstop (B2), the recoil off
//                         a connect (B3), the shooter's squash (B3, shots),
//                         the spawn grow-in (B7) and the hitstop hold of the
//                         whole rig, pure in time for the model lab
//   createComboLab(...)   the lab's three-swing combo, pure in t, holds and
//                         recoils included, so it rewinds
//   createFootLock(...)   planted feet pinned in world space, stepping along
//                         the travel, the lunge step, airborne on a hop or a
//                         dash (Kesh's self-check: no sliding, root motion
//                         matches the legs)
//   walkBody(...)         the walk's bob, roll, twist and travel lean, from
//                         the steps themselves
//
// Each hero rig module exports a SPEC (render/facet/heroes.js lists them):
//   { id, label, build(rig, trackAccent), hits, moves, skillAbility(ev),
//     swingSec, comboLab, ranged, walkSpeed, weaponField: the pose field of
//     the weapon's main swing, lab: { abilities: [[id, label]], frame,
//     cues: { strike, finisher, <move cue id>: { sound, pitch, fx } } } }
// and its build returns the critter contract (apply, torso, head, basePitch,
// metrics) plus cue, hold, comboHitOf, points { hand, tip } and lab (the
// lab's override, the clock, feet(), swing() and parts { torso, head,
// weapon }).
//
// Render only: nothing here reads or writes sim state or the wall clock.
import { CapsuleGeometry, Group, Mesh, Quaternion, Vector3 } from 'three';
import { addInk } from '../critters/common.js';
import { sharedGeo } from '../geocache.js';
import { facetize } from './material.js';
import { createTimeline, ease } from './timeline.js';

// One frame of Kesh's templates (30 fps): the rules doc counts in these.
export const FRAME = 1 / 30;
// §10 "collapses horizontal": the downed body's tilt (rad, ~78°); the
// critter factory re-exports it (render/critters/index.js).
export const FALL_ANGLE = 1.36;
// The steepest lean an attack may take toward its target at contact (B9:
// 20 to 25°). The walk and idle stay under the critter factory's 12° ceiling;
// the head counter-rotates so the face stays up through the lunge.
export const LUNGE_PITCH_MAX = 0.44;
// The hips lead the weapon (the body throws it) by half a frame, the weapon
// trails by a frame: sampled on one timeline, a frame apart.
export const LEAD = 0.017;
export const LAG = 0.034;

// The settle into idle (B5): ONE small overshoot (about 4.5%), never a plain
// blend.
export function settleEase(k) {
  const s = 1.1;
  const x = k - 1;
  return 1 + x * x * ((s + 1) * x + s);
}
const EASE = Object.freeze({
  out: ease.out,
  in: ease.in,
  inOut: ease.inOut,
  back: ease.back,
  settle: settleEase,
  linear: (k) => k,
  hold: () => 1,
});

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------
// The body fields every hero shares. yaw/pitch/roll: the torso (pitch > 0
// leans toward the facing); rx/ry/rz: the root's weight shift (z ahead);
// sw/sh: squash (width, height); hop: the whole body off the floor (u);
// step: 0..1 the lunge foot's reach; air: 0..1 both feet off the floor.
export const BODY = Object.freeze({ yaw: 0, pitch: 0, roll: 0, rx: 0, ry: 0, rz: 0, sw: 1, sh: 1, hop: 0, step: 0, air: 0 });

export function posePack(weapon = {}) {
  const REST = Object.freeze({ ...BODY, ...weapon });
  const FIELDS = Object.keys(REST);
  return {
    REST,
    FIELDS,
    K: (o) => Object.freeze({ ...REST, ...o }),
    make: () => ({ ...REST }),
    copy(out, a) {
      for (const f of FIELDS) out[f] = a[f];
      return out;
    },
    lerp(out, a, b, k) {
      for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * k;
      return out;
    },
  };
}

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------
// keys: [{ id, label, dur, to, ease }]: each phase eases from the last key
// (or the pose the move took over from) to its own `to`; `to: null` holds.
// contact: the phase id whose START is the blow (or seconds); entry: the
// phase id a game cast enters at, `lead` seconds before it (the press is
// instant, BUILD_BRIEF §6, so a skill enters just ahead of its release);
// recoil: whether a connect recoils the body off the target (B3, melee).
// extra(out, sample): a per-move flourish on top of the keyed blend.
export function createMove(pack, id, label, keys, { contact = null, entry = null, lead = 0.08, cues = [], recoil = false, extra = null } = {}) {
  const timeline = createTimeline(id, label, keys.map(({ id: pid, label: pl, dur }) => ({ id: pid, label: pl, dur })), { cues });
  const ends = [];
  let last = pack.REST;
  for (const k of keys) {
    last = k.to || last;
    ends.push(last);
  }
  const contactAt = typeof contact === 'number' ? contact : contact ? timeline.startOf(contact) : timeline.duration;
  const entryAt = entry === null ? 0 : Math.max(0, (typeof entry === 'number' ? entry : timeline.startOf(entry)) - lead);
  const move = {
    id,
    label,
    timeline,
    keys,
    ends,
    contact: contactAt,
    entry: entryAt,
    recoil,
    duration: timeline.duration,
    // The pose at t. `from`: the pose the move took over from; `startAt`:
    // the phase index that starts from `from` instead of the key before it
    // (0 for a fresh move; a chained hit's strike, so it strikes straight
    // from wherever the last hit held it). `t0`: the time the move was
    // entered at, when that is not a phase start (a game cast enters just
    // ahead of its release): the move holds `from` until t0, and the phase
    // t0 falls in eases from `from` over what is left of it, so an entry
    // mid-phase never pops.
    pose(t, from, out, startAt = 0, t0 = null) {
      let s;
      let start;
      let k;
      if (t0 !== null && t0 > 0) {
        s = timeline.sample(t < t0 ? t0 : t);
        const i0 = timeline.sample(t0).index;
        if (s.index === i0) {
          const end = timeline.startOf(keys[i0].id) + keys[i0].dur;
          k = end > t0 ? Math.min(1, Math.max(0, (s.t - t0) / (end - t0))) : 1;
          start = from;
        } else {
          k = s.k;
          start = ends[s.index - 1];
        }
      } else {
        s = timeline.sample(t);
        k = s.k;
        start = s.index <= startAt ? from : ends[s.index - 1];
      }
      const i = s.index;
      pack.lerp(out, start, ends[i], EASE[keys[i].ease || 'inOut'](k));
      if (extra) extra(out, s);
      return out;
    },
  };
  return move;
}

// The three hits of the basic combo (Kesh's template). hits: [{ label, from
// (wind-up), strike (contact), over (overshoot), timing?, strikeEase? }].
// Timing at 30 fps by default: 1.5 frames of wind (only from rest: a chained
// hit starts AT its wind-up, which the last hit's settle already holds), 2.5
// of strike, 2 of overshoot, 5 to settle into the next wind-up, held ready
// until the combo window lapses, then a recover to the stance with one small
// overshoot. The strike runs at full speed from the press frame (B4: the
// weapon kicks on the press, no ramp) and stops dead on the contact, which
// the hitstop then holds.
export const HIT_TIMING = Object.freeze({ wind: 0.05, strike: 0.083, over: 0.067, settle: 0.167, recover: 0.35 });
export function createCombo(pack, hits, { window = 1.0, timing = HIT_TIMING, recoil = true } = {}) {
  const n = hits.length;
  return hits.map((h, i) => {
    const T = { ...timing, ...(h.timing || {}) };
    const next = hits[(i + 1) % n].from;
    const after = (i + 1) % n + 1;
    const lead = T.wind + T.strike + T.over + T.settle;
    const move = createMove(
      pack,
      `hit${i + 1}`,
      `Hit ${i + 1}: ${h.label}`,
      [
        { id: 'wind', label: 'wind-up', dur: T.wind, to: h.from, ease: 'out' },
        { id: 'strike', label: 'strike', dur: T.strike, to: h.strike, ease: h.strikeEase || 'linear' },
        { id: 'overshoot', label: 'overshoot', dur: T.over, to: h.over, ease: 'out' },
        { id: 'settle', label: `settle into hit ${after}`, dur: T.settle, to: next, ease: 'inOut' },
        { id: 'ready', label: `hit ${after} wind-up held`, dur: Math.max(0.05, window - lead), to: null, ease: 'hold' },
        { id: 'recover', label: 'recover', dur: T.recover, to: pack.REST, ease: 'settle' },
      ],
      { contact: 'overshoot', recoil, extra: h.extra || null }
    );
    return Object.freeze({ ...h, next, move, timeline: move.timeline });
  });
}

// ---------------------------------------------------------------------------
// Envelopes (pure functions of the time since their cue)
// ---------------------------------------------------------------------------
// B3, melee: the body snaps back off the target in 2 frames and the shove
// fades over about 8 (the body never moves: a rig-only shove, 0.08-0.12 u).
export const RECOIL = Object.freeze({ shove: 0.1, lean: 0.1, rise: 2 * FRAME, fade: 8 * FRAME });
export function recoilAt(since) {
  if (!(since >= 0)) return 0;
  if (since < RECOIL.rise) return ease.out(since / RECOIL.rise);
  const k = (since - RECOIL.rise) / RECOIL.fade;
  return k >= 1 ? 0 : 1 - ease.inOut(k);
}
// B3, shots: the shooter squashes 20% wider on the first shot, 29% then 38%
// wider and 10% shorter by the third of steady fire; back in about 100 ms
// after the shot with a small stretch (4% taller) 4 to 5 frames after it.
// The shove (0.4 of its width, here 0.1 u, rig only) eases back over 0.45 s.
export const SHOT = Object.freeze({ wide: [0.2, 0.29, 0.38], short: [0, 0.05, 0.1], shove: 0.1, shoveBack: 0.45 });
export function shotAt(level, since, out = { sw: 1, sh: 1, shove: 0 }) {
  out.sw = 1;
  out.sh = 1;
  out.shove = 0;
  if (!(since >= 0) || level < 1) return out;
  const L = Math.min(3, level) - 1;
  const W = SHOT.wide[L];
  const H = SHOT.short[L];
  const f = since / FRAME;
  let k; // 1 = full squash, negative = the stretch overshoot
  if (f < 0.5) k = f / 0.5;
  else if (f < 1.5) k = 1;
  else if (f < 3) k = 1 - ease.out((f - 1.5) / 1.5);
  else if (f < 4.5) k = -Math.sin(((f - 3) / 1.5) * (Math.PI / 2));
  else if (f < 7) k = -1 + ease.inOut((f - 4.5) / 2.5);
  else k = 0;
  if (k >= 0) {
    out.sw = 1 + W * k;
    out.sh = 1 - H * k;
  } else {
    out.sh = 1 - 0.04 * k;
    out.sw = 1 + 0.02 * k;
  }
  out.shove = since < 2 * FRAME ? ease.out(since / (2 * FRAME)) : Math.max(0, 1 - ease.inOut(Math.min(1, (since - 2 * FRAME) / SHOT.shoveBack)));
  return out;
}
// B7: a new body grows from the floor in about 7 frames with about 10%
// overshoot (a hero arriving in a room).
export const SPAWN = Object.freeze({ grow: 5 * FRAME, settle: 2 * FRAME, over: 0.1 });
export function spawnAt(since) {
  if (!(since >= 0)) return 1;
  if (since < SPAWN.grow) return (1 + SPAWN.over) * ease.out(since / SPAWN.grow);
  const k = (since - SPAWN.grow) / SPAWN.settle;
  return k >= 1 ? 1 : 1 + SPAWN.over * (1 - ease.inOut(k));
}
export const SPAWN_SEC = SPAWN.grow + SPAWN.settle;
// The grow-in as a lab ability (the lab plays it as { kind: 'spawn', t }).
export const SPAWN_TIMELINE = createTimeline('spawn', 'Spawn', [
  { id: 'grow', label: 'grow from the floor', dur: SPAWN.grow },
  { id: 'settle', label: 'settle (10% overshoot)', dur: SPAWN.settle },
]);

// ---------------------------------------------------------------------------
// The attack clock
// ---------------------------------------------------------------------------
// One per rig. The rig calls hold(dt) first (the critter factory does, before
// the driver), then advance(dt, clip) inside apply, then pose()/envelopes().
//   cue('basic', ev)    the next hit of the combo (idempotent per event)
//   cue('skill', ev)    the ability the skill plays (skillAbility(ev))
//   cue('connect', ev)  a sim `hit` this rig struck (B3 recoil; and the
//                       hitstop on the same tick becomes its contact hold)
//   cue('hitstop', ev)  the world froze for ev.ticks: the whole rig holds;
//                       the attacker plays its strike on to contact and holds
//                       the pose there instead (B2)
//   cue('spawn')        the grow-in (B7)
//   cue('reset')        forget every move and envelope (a rig that was not
//                       updated while cues arrived: a scene coming back)
// A hit taken (the hurt clip, or going down) lets go of the attack over a
// few frames (RELEASE_SEC) instead of dropping it, so nothing pops.
export const RELEASE_SEC = 4 * FRAME;
// A connect heard after the contact (a guest's own hero, one round trip
// late) still recoils, if it comes this soon after the contact.
const LATE_CONNECT = 0.25;
export function createAttackClock({ pack, hits, abilities, skillAbility, window = 1.0, ranged = false, lead = LEAD, lag = LAG }) {
  let clock = 0;
  // The move playing: { kind: 'hit' | 'ability' | 'release', mv, t, t0, n, id }.
  let cur = null;
  let lastBasicAt = -99;
  let lastClip = 'idle';
  let lastBasicEv = null;
  let lastHit = 0;
  const from = pack.make();
  const RELEASE = createMove(pack, 'release', 'Interrupted', [{ id: 'release', label: 'let go of the attack', dur: RELEASE_SEC, to: pack.REST, ease: 'out' }]);
  // holds: the world froze (holdLeft, the whole rig) or this rig's blow
  // landed (poseHold, the attack pose only: the world has moved on)
  let holdLeft = 0;
  let poseHold = 0;
  let contactOwed = 0;
  let stopTick = null;
  let stopBucket = null;
  let stopNow = 0; // the whole-rig hold this tick added so far
  // recoil (melee)
  let connectTick = null;
  let recoilArmed = false;
  let recoilSince = -1;
  // shots
  let shotLevel = 0;
  let shotSince = -1;
  let lastShotAt = -99;
  // spawn
  let spawnSince = -1;
  // the model lab's pure override
  let override = null;

  const move = () => (cur ? cur.mv : null);
  function poseNow(out, shift = 0) {
    if (!cur) return pack.copy(out, pack.REST);
    return cur.mv.pose(cur.t + shift, from, out, 0, cur.t0);
  }
  // Take over from wherever the rig is now.
  function start(kind, mv, t0, extra) {
    poseNow(from);
    cur = { kind, mv, t: t0, t0, n: 0, id: null, ...extra };
    poseHold = 0;
    contactOwed = 0;
    recoilArmed = false;
  }
  const blowAhead = () => cur && cur.kind !== 'release' && cur.t < cur.mv.contact;

  function cue(kind, ev) {
    if (kind === 'basic') {
      if (ev && ev === lastBasicEv) return lastHit;
      lastBasicEv = ev || null;
      const prev = cur && cur.kind === 'hit' ? cur.n : 0;
      const fresh = clock - lastBasicAt > window || prev === 0;
      const n = fresh ? 1 : (prev % hits.length) + 1;
      start('hit', hits[n - 1].move, fresh ? 0 : hits[n - 1].timeline.startOf('strike'), { n });
      lastBasicAt = clock;
      if (ranged) {
        shotLevel = clock - lastShotAt <= window ? Math.min(3, shotLevel + 1) : 1;
        lastShotAt = clock;
        // the finisher is a spell throw: it keeps its stretch, not the
        // shooter's squash (B3); steady fire squashes on the shots after it
        shotSince = n === hits.length ? -1 : 0;
      }
      lastHit = n;
      return n;
    }
    if (kind === 'skill') {
      const id = skillAbility(ev);
      const mv = abilities[id];
      if (!mv) return 0;
      start('ability', mv, mv.entry, { id }); // a skill breaks the combo: the next basic is hit 1
      return 0;
    }
    if (kind === 'connect') {
      const tick = ev && ev.tick !== undefined ? ev.tick : null;
      if (tick !== null) connectTick = tick;
      const mv = move();
      if (mv && mv.recoil && cur.kind !== 'release') {
        if (cur.t < mv.contact) recoilArmed = true;
        else if (cur.t < mv.contact + LATE_CONNECT) recoilSince = 0;
      }
      // An earlier blow on this tick already froze the world: this rig's
      // share of the stop waits for its own contact instead (B2).
      if (!ranged && tick !== null && tick === stopTick && stopBucket === 'now' && blowAhead()) {
        const moved = Math.min(holdLeft, stopNow);
        holdLeft -= moved;
        contactOwed += moved;
        stopNow = 0;
        stopBucket = 'contact';
      }
      return 0;
    }
    if (kind === 'hitstop') {
      const sec = Math.max(0, (ev && ev.ticks) || 0) / 60;
      const tick = ev && ev.tick !== undefined ? ev.tick : null;
      if (tick === null || tick !== stopTick) {
        stopTick = tick;
        stopNow = 0;
        // the attacker: its strike has not reached contact yet (the sim hits
        // on the press), so its hold waits for the contact pose (B2); every
        // other rig holds now. A shot has no contact to wait for (its
        // release is the press; the bolt lands later), so a shooter always
        // holds now.
        stopBucket = !ranged && tick !== null && tick === connectTick && blowAhead() ? 'contact' : 'now';
      }
      if (stopBucket === 'contact') contactOwed += sec;
      else {
        holdLeft += sec;
        stopNow += sec;
      }
      return 0;
    }
    if (kind === 'spawn') {
      spawnSince = 0;
      return 0;
    }
    if (kind === 'reset') {
      cur = null;
      holdLeft = poseHold = contactOwed = stopNow = 0;
      stopTick = stopBucket = connectTick = null;
      recoilArmed = false;
      recoilSince = shotSince = spawnSince = -1;
      shotLevel = 0;
      lastBasicAt = lastShotAt = -99;
      return 0;
    }
    return 0;
  }

  // The whole rig's dt through a hold (the critter factory calls this before
  // the driver, so the clip, the attack and the feet all freeze together).
  function hold(dt) {
    if (override || holdLeft <= 0) return dt;
    const used = Math.min(holdLeft, dt);
    holdLeft -= used;
    return dt - used;
  }

  function advance(dt, clip) {
    if (override) {
      lastClip = clip;
      return;
    }
    clock += dt;
    // a hit taken breaks the combo: let go of the attack, never a pop
    const hurt = (clip === 'hurt' && lastClip !== 'hurt') || clip === 'downed';
    lastClip = clip;
    if (hurt && cur && cur.kind !== 'release') start('release', RELEASE, 0, {});
    if (recoilSince >= 0) recoilSince = recoilSince > 1 ? -1 : recoilSince + dt;
    if (cur) {
      const mv = cur.mv;
      let step = dt;
      if (poseHold > 0) {
        const used = Math.min(poseHold, step);
        poseHold -= used;
        step -= used;
        if (poseHold <= 0 && recoilArmed) {
          // the recoil plays off the held contact (B3)
          recoilSince = step;
          recoilArmed = false;
        }
      }
      const before = cur.t;
      let t = before + step;
      if (before < mv.contact && t >= mv.contact) {
        // the blow: the contact pose holds through the owed hitstop (the
        // pose only: the world has moved on), then the recoil
        if (contactOwed > 0) {
          const over = t - mv.contact;
          poseHold = contactOwed;
          contactOwed = 0;
          const used = Math.min(poseHold, over);
          poseHold -= used;
          t = mv.contact + over - used;
        }
        if (recoilArmed && poseHold <= 0) {
          recoilSince = 0;
          recoilArmed = false;
        }
      }
      cur.t = t;
      if (t >= mv.duration) cur = null;
    }
    if (shotSince >= 0) shotSince = shotSince > 1.2 ? -1 : shotSince + dt;
    if (spawnSince >= 0) spawnSince = spawnSince > SPAWN_SEC + FRAME ? -1 : spawnSince + dt;
  }

  // Pure lab state: { kind: 'hit', n, t, fresh, from?, recoil?, shot? } |
  // { kind: 'ability', id, t, recoil? } | { kind: 'spawn', t } | null.
  function setOverride(o) {
    override = o || null;
    if (!o) return;
    cur = null;
    poseHold = 0;
    recoilSince = -1;
    shotSince = -1;
    spawnSince = -1;
    if (o.kind === 'ability') {
      pack.copy(from, o.from || pack.REST);
      cur = { kind: 'ability', id: o.id, n: 0, mv: abilities[o.id], t: o.t, t0: 0 };
    } else if (o.kind === 'hit') {
      const fresh = !!o.fresh;
      pack.copy(from, o.from || (fresh ? pack.REST : hits[o.n].from));
      cur = { kind: 'hit', id: null, n: o.n + 1, mv: hits[o.n].move, t: o.t, t0: fresh ? 0 : hits[o.n].timeline.startOf('strike') };
    } else if (o.kind === 'spawn') spawnSince = o.t;
    if (o.recoil !== undefined) recoilSince = o.recoil;
    if (o.shot) {
      shotLevel = o.shot.level;
      shotSince = o.shot.since;
    }
  }

  const shotOut = { sw: 1, sh: 1, shove: 0 };
  return {
    cue,
    hold,
    advance,
    setOverride,
    get override() {
      return override;
    },
    get active() {
      return !!cur;
    },
    // the move playing (a hit's, an ability's, or the let-go after a hit
    // taken), or null
    get move() {
      return cur ? cur.mv : null;
    },
    get ability() {
      return cur && cur.kind === 'ability' ? cur.id : null;
    },
    get comboHit() {
      return cur && cur.kind === 'hit' ? cur.n : 0;
    },
    get held() {
      return holdLeft > 0 || poseHold > 0;
    },
    // what the probes read: the time into the move and its contact
    get moveTime() {
      return cur ? cur.t : 0;
    },
    get moveContact() {
      return cur ? cur.mv.contact : null;
    },
    comboHitOf(ev) {
      if (ev && ev === lastBasicEv) return lastHit;
      return cue('basic', ev);
    },
    // the live pose, the hips half a frame ahead and the weapon a frame behind
    pose: (out, shift = 0) => poseNow(out, shift),
    sample(live, led, lagged) {
      poseNow(live, 0);
      poseNow(led, lead);
      poseNow(lagged, -lag);
    },
    // Where the current move releases: run `fn` with the move at its
    // contact (the rig posed there by the caller), then put it back. A
    // shooter's bolt leaves from here, not from the wind-up the press
    // caught the rig in.
    atContact(fn) {
      if (!cur || cur.kind === 'release' || cur.t >= cur.mv.contact) return fn(false);
      const t = cur.t;
      cur.t = cur.mv.contact;
      try {
        return fn(true);
      } finally {
        if (cur) cur.t = t;
      }
    },
    recoil: () => recoilAt(recoilSince),
    shot: () => shotAt(shotLevel, shotSince, shotOut),
    spawn: () => spawnAt(spawnSince),
  };
}

// ---------------------------------------------------------------------------
// The lab's combo: three swings at the class's real cadence, pure in t. Each
// contact holds as the hitstop would (2 ticks; the finisher 3, as a kill);
// the recoil (melee) or the shooter's squash (shots) plays from the cue.
// ---------------------------------------------------------------------------
export function createComboLab(hits, { swingSec, hold = 2 / 60, finisherHold = 3 / 60, ranged = false, label = 'Basic combo' }) {
  const starts = hits.map((_, n) => n * swingSec);
  const last = hits[hits.length - 1].move;
  const lastFrom = last.timeline.startOf('strike');
  const lastHold = finisherHold;
  return Object.freeze({
    id: 'combo',
    label,
    swingSec,
    duration: starts[starts.length - 1] + (last.duration - lastFrom) + lastHold,
    at(T) {
      let n = 0;
      for (let i = 0; i < starts.length; i++) if (T >= starts[i]) n = i;
      const mv = hits[n].move;
      const local = T - starts[n];
      const t0 = n === 0 ? 0 : mv.timeline.startOf('strike');
      const H = n === hits.length - 1 ? finisherHold : hold;
      const toContact = mv.contact - t0;
      let t;
      let since = -1;
      let held = false;
      if (ranged || local < toContact) t = t0 + local;
      else if (local < toContact + H) {
        t = mv.contact;
        held = true;
        since = 0;
      } else {
        t = t0 + local - H;
        since = local - toContact - H;
      }
      t = Math.min(mv.duration, t);
      const s = mv.timeline.sample(t);
      return {
        n,
        t,
        fresh: n === 0,
        held,
        recoil: ranged ? -1 : since,
        // the finisher is a spell throw: its stretch, not the squash (B3)
        shot: ranged && n < hits.length - 1 ? { level: n + 1, since: local } : null,
        phase: s.id,
        label: `${mv.timeline.label}: ${held ? 'contact held (hitstop)' : s.label}`,
      };
    },
    // seconds into the lab combo where each blow lands (the cues)
    strikes: hits.map((h, n) => starts[n] + (h.move.contact - (n === 0 ? 0 : h.move.timeline.startOf('strike')))),
  });
}

// ---------------------------------------------------------------------------
// Locked feet (Kesh's self-check). Each foot is pinned to the floor in world
// space while it carries weight; it steps when it falls too far from where
// the stance wants it, one foot at a time, landing ahead along the body's
// real velocity at the home it lifted off for (so a lunge lands). A step
// that would cut through the body (a turn on the spot) swings round it. On a
// hop, a dash or any travel too fast to walk, both feet lift off from where
// they stand, ride the body at their stance home, and plant where they come
// down. A held frame (a hitstop) leaves planted feet where they are.
// Disabled while the body falls or lies downed.
//   feet: the foot meshes (children of rig); home: their rest positions in
//   rig space (y = the foot's rest height); lunge: { lead, reach, brace }:
//   the lead foot's home moves `reach` ahead at step 1, the other `brace`
//   back.
//   step(dt, stance, locked, still): `still` (the lab's Still) stands the
//   feet on the stance's homes, so a scrubbed lunge shows its step.
//   place(): set the feet again after the rig moved (a walk bob applied
//   after step), so planted feet stay on the floor.
// ---------------------------------------------------------------------------
export function createFootLock({ rig, feet, home, trigger = 0.085, lift = 0.07, lunge = null, airSpeed = 4.2, tuck = 0.05, liftOff = 3 * FRAME }) {
  const yawGroup = () => rig.parent && rig.parent.parent;
  const foot = feet.map((f, i) => ({
    planted: new Vector3(), // world
    from: new Vector3(),
    to: new Vector3(),
    swing: -1, // 0..1 while stepping, -1 planted
    dur: 0.2,
    arc: 0, // a step round the body: the turn's sign; 0 = straight
    side: home[i].x < 0 ? -1 : 1,
    home: new Vector3(),
    aim: new Vector3(), // the home it steps for (yaw space), fixed at lift-off
    airFrom: new Vector3(), // rig space, where it stood when the feet lifted
  }));
  const vel = new Vector3();
  const lastPos = new Vector3();
  const w = new Vector3();
  const c = new Vector3();
  const yawQ = new Quaternion();
  let init = false;
  let air = false;
  let airT = 0;
  let liftH = lift;
  const state = { bobLift: 0, plantSide: 0, swingSide: 0, speed: 0, airborne: false };

  function homeLocalOf(i, stance, out) {
    out.copy(home[i]);
    if (lunge && stance.step > 0) out.z += (i === lunge.lead ? lunge.reach : -lunge.brace) * stance.step;
    out.y = 0;
    return out;
  }
  function homeWorld(i, stance, out) {
    return yawGroup().localToWorld(homeLocalOf(i, stance, out));
  }
  function plantAll(stance) {
    for (let i = 0; i < foot.length; i++) {
      homeWorld(i, stance, foot[i].planted);
      foot[i].swing = -1;
    }
    init = true;
    air = false;
  }
  function localVelocity(out) {
    const yg = yawGroup();
    out.copy(vel);
    if (yg) out.applyQuaternion(yg.getWorldQuaternion(yawQ).invert());
    return out;
  }
  const wrapPi = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

  // Draw each foot on the floor: planted where it stands, a stepping foot on
  // its way (straight, or round the body when the step would cut through it).
  function place() {
    const yg = yawGroup();
    if (!yg || !init || air) return;
    yg.getWorldPosition(c);
    rig.updateWorldMatrix(true, false);
    for (let i = 0; i < foot.length; i++) {
      const f = foot[i];
      if (f.swing >= 0) {
        const k = ease.inOut(f.swing);
        if (f.arc !== 0) {
          const ax = f.from.x - c.x;
          const az = f.from.z - c.z;
          const bx = f.to.x - c.x;
          const bz = f.to.z - c.z;
          const a0 = Math.atan2(az, ax);
          let d = wrapPi(Math.atan2(bz, bx) - a0);
          if (Math.sign(d) !== f.arc && d !== 0) d += f.arc * Math.PI * 2;
          const r = Math.hypot(ax, az) + (Math.hypot(bx, bz) - Math.hypot(ax, az)) * k;
          w.set(c.x + r * Math.cos(a0 + d * k), 0, c.z + r * Math.sin(a0 + d * k));
        } else w.lerpVectors(f.from, f.to, k);
        w.y = liftH * Math.sin(Math.PI * f.swing);
      } else {
        w.copy(f.planted);
        w.y = 0;
      }
      rig.worldToLocal(w);
      feet[i].position.set(w.x, w.y + home[i].y, w.z);
    }
  }

  function step(dt, stance, locked, still = false) {
    const yg = yawGroup();
    if (!yg) return state;
    yg.updateWorldMatrix(true, false);
    const gp = yg.getWorldPosition(w);
    state.bobLift = 0;
    if (!init || !locked || still) {
      lastPos.copy(gp);
      vel.set(0, 0, 0);
      plantAll(stance);
      state.airborne = false;
      if (!locked) for (let i = 0; i < feet.length; i++) feet[i].position.copy(home[i]);
      else place();
      return state;
    }
    // A teleport or a new room: stand afresh where the body is now. A held
    // frame (no time passed) leaves planted feet where they stand, whatever
    // the body did.
    const jump = gp.distanceTo(lastPos);
    let inst = 0;
    if (jump > 1.0) {
      plantAll(stance);
      vel.set(0, 0, 0);
    } else if (dt > 0) {
      inst = jump / dt;
      const k = Math.min(1, dt * 12);
      vel.x += ((gp.x - lastPos.x) / dt - vel.x) * k;
      vel.z += ((gp.z - lastPos.z) / dt - vel.z) * k;
    }
    lastPos.copy(gp);
    const speed = Math.hypot(vel.x, vel.z);
    state.speed = speed;
    // Airborne: a hop, a dash, or travel faster than any walk can step (the
    // frame's own speed too, so a dash lifts the feet on its first frame).
    const airborne = stance.air > 0.5 || stance.hop > 0.015 || Math.max(speed, inst) > airSpeed;
    state.airborne = airborne;
    if (airborne) {
      if (!air) {
        // lift-off: each foot leaves from where it stands now
        rig.updateWorldMatrix(true, false);
        for (let i = 0; i < foot.length; i++) {
          const f = foot[i];
          if (f.swing < 0) {
            w.copy(f.planted);
            w.y = 0;
            rig.worldToLocal(w);
            f.airFrom.set(w.x, w.y + home[i].y, w.z);
          } else f.airFrom.copy(feet[i].position);
          f.swing = -1;
        }
        air = true;
        airT = 0;
      }
      airT += dt;
      const k = ease.out(Math.min(1, airT / liftOff));
      for (let i = 0; i < feet.length; i++) {
        homeLocalOf(i, stance, w);
        w.y = home[i].y + (stance.hop > 0.015 ? 0 : tuck);
        feet[i].position.lerpVectors(foot[i].airFrom, w, k);
      }
      return state;
    }
    if (air) {
      // landed: each foot plants where it came down (never a pop by the
      // root's attack shift)
      air = false;
      rig.updateWorldMatrix(true, false);
      for (let i = 0; i < foot.length; i++) {
        feet[i].getWorldPosition(foot[i].planted);
        foot[i].planted.y = 0;
        foot[i].swing = -1;
      }
    }
    for (let i = 0; i < foot.length; i++) homeWorld(i, stance, foot[i].home);
    // advance a swing
    let swinging = -1;
    for (let i = 0; i < foot.length; i++) {
      const f = foot[i];
      if (f.swing < 0) continue;
      f.swing += dt / f.dur;
      // keep re-aiming the landing while it flies (the body keeps moving),
      // at the home it lifted off for: a lunge lands even if the stance
      // has already begun to settle back
      yg.localToWorld(f.to.copy(f.aim)).addScaledVector(vel, f.dur * 0.55);
      if (f.swing >= 1) {
        f.swing = -1;
        f.planted.copy(f.to);
      } else swinging = i;
    }
    // start a step: the foot furthest from home, if it is too far
    if (swinging < 0) {
      let best = -1;
      let bestErr = trigger * (speed > 0.3 ? 0.6 : 1);
      for (let i = 0; i < foot.length; i++) {
        const err = Math.hypot(foot[i].planted.x - foot[i].home.x, foot[i].planted.z - foot[i].home.z);
        if (err > bestErr) {
          bestErr = err;
          best = i;
        }
      }
      if (best >= 0) {
        const f = foot[best];
        f.swing = 0;
        f.dur = Math.max(0.12, Math.min(0.2, 0.2 - speed * 0.03));
        f.from.copy(f.planted);
        homeLocalOf(best, stance, f.aim);
        f.to.copy(f.home).addScaledVector(vel, f.dur * 0.55);
        // a step that would pass through the body (a turn on the spot, the
        // feet changing sides) swings round it instead
        const d = wrapPi(Math.atan2(f.to.z - gp.z, f.to.x - gp.x) - Math.atan2(f.from.z - gp.z, f.from.x - gp.x));
        f.arc = Math.abs(d) > Math.PI / 2 ? Math.sign(d) || 1 : 0;
        swinging = best;
      }
    }
    liftH = lift * Math.min(1, 0.4 + speed * 0.5);
    for (let i = 0; i < foot.length; i++) {
      const f = foot[i];
      if (f.swing < 0) continue;
      state.bobLift = Math.sin(Math.PI * f.swing);
      state.plantSide = -f.side;
      state.swingSide = f.side;
    }
    place();
    return state;
  }

  return {
    step,
    place,
    state,
    localVelocity,
    // where each foot is (world), whether it carries weight, and where its
    // mesh actually drew (probes)
    report: () =>
      foot.map((f, i) => {
        const at = feet[i].getWorldPosition(new Vector3());
        return { planted: f.swing < 0 && !air, x: f.planted.x, z: f.planted.z, drawnX: at.x, drawnZ: at.z, drawnY: at.y };
      }),
  };
}

// The walk's body from the steps themselves: the body rises as a foot
// passes, rolls over the foot that carries it, turns the stepping hip
// forward, and leans into the TRAVEL in the rig's own frame (the driver's
// walk lean assumes forward): a backpedal leans back, a sidestep leans aside,
// so the root motion matches the legs.
const lv = new Vector3();
export function walkBody(lock, { walkSpeed, bob = 0.035, lean = 0.1, roll = 0.06, sideLean = 0.07, twist = 0.1 }, out = {}) {
  const s = lock.state;
  lock.localVelocity(lv);
  const fwd = Math.max(-1, Math.min(1, lv.z / walkSpeed));
  const side = Math.max(-1, Math.min(1, lv.x / walkSpeed));
  out.dy = bob * s.bobLift;
  out.twist = -s.swingSide * twist * s.bobLift;
  out.pitch = Math.max(-0.08, Math.min(0.12, lean * fwd));
  out.roll = roll * s.plantSide * s.bobLift - sideLean * side;
  return out;
}

// ---------------------------------------------------------------------------
// Faceted part helpers shared by the hero rigs.
// ---------------------------------------------------------------------------
export function fpart(geo, mat, ink = true) {
  const m = new Mesh(geo, mat);
  if (ink) addInk(m);
  return m;
}
// A stubby faceted limb pivoting at the shoulder; aimLimb re-points and
// stretches it at whatever the paw holds, every frame.
export function facetArm(mat, radius, baseLen, seed = 51) {
  const pivot = new Group();
  const geo = sharedGeo(`facet:arm:${radius}:${baseLen}`, () => facetize(new CapsuleGeometry(radius, baseLen - radius * 2, 2, 6), { jitter: 0.08, seed }));
  const m = fpart(geo, mat);
  m.position.y = baseLen / 2;
  pivot.add(m);
  pivot.userData.baseLen = baseLen;
  return pivot;
}
const UPV = new Vector3(0, 1, 0);
const limbTmp = new Vector3();
export function aimLimb(pivot, target) {
  limbTmp.copy(target).sub(pivot.position);
  const len = Math.max(0.02, limbTmp.length());
  pivot.quaternion.setFromUnitVectors(UPV, limbTmp.normalize());
  pivot.scale.set(1, len / pivot.userData.baseLen, 1);
}
// A named point on the rig (B8): an empty Object3D the VFX layer reads.
export function namedPoint(parent, name, x, y, z) {
  const p = new Group();
  p.name = name;
  p.position.set(x, y, z);
  parent.add(p);
  return p;
}
