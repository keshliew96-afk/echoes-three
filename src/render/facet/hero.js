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
    // from wherever the last hit held it).
    pose(t, from, out, startAt = 0) {
      const s = timeline.sample(t);
      const i = s.index;
      const start = i <= startAt ? from : ends[i - 1];
      pack.lerp(out, start, ends[i], EASE[keys[i].ease || 'inOut'](s.k));
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
  out.shove = since < 2 * FRAME ? ease.out(since / (2 * FRAME)) : Math.max(0, 1 - ease.inOut((since - 2 * FRAME) / SHOT.shoveBack));
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
//                       the attacker plays its strike to contact and holds
//                       there instead (B2)
//   cue('spawn')        the grow-in (B7)
export function createAttackClock({ pack, hits, abilities, skillAbility, window = 1.0, ranged = false, lead = LEAD, lag = LAG }) {
  let clock = 0;
  let combo = 0; // 1..3 = the hit playing
  let hitT = 0;
  let fresh = true;
  let lastBasicAt = -99;
  let ab = null; // { id, t }
  let lastClip = 'idle';
  let lastBasicEv = null;
  let lastHit = 0;
  const from = pack.make();
  // holds
  let holdLeft = 0;
  let contactOwed = 0;
  let stopTick = null;
  let stopBucket = null;
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

  const move = () => (ab ? abilities[ab.id] : combo > 0 ? hits[combo - 1].move : null);
  const moveT = () => (ab ? ab.t : hitT);
  function setMoveT(t) {
    if (ab) ab.t = t;
    else hitT = t;
  }
  function poseNow(out, shift = 0) {
    if (ab) return abilities[ab.id].pose(Math.max(0, ab.t + shift), from, out, 0);
    if (combo > 0) return hits[combo - 1].move.pose(Math.max(0, hitT + shift), from, out, fresh ? 0 : 1);
    return pack.copy(out, pack.REST);
  }
  function breakChain() {
    combo = 0;
    ab = null;
    contactOwed = 0;
    recoilArmed = false;
  }

  function cue(kind, ev) {
    if (kind === 'basic') {
      if (ev && ev === lastBasicEv) return lastHit;
      lastBasicEv = ev || null;
      poseNow(from);
      fresh = clock - lastBasicAt > window || combo === 0 || !!ab;
      combo = fresh ? 1 : (combo % hits.length) + 1;
      hitT = fresh ? 0 : hits[combo - 1].timeline.startOf('strike');
      ab = null;
      lastBasicAt = clock;
      contactOwed = 0;
      recoilArmed = false;
      if (ranged) {
        shotLevel = clock - lastShotAt <= window ? Math.min(3, shotLevel + 1) : 1;
        shotSince = 0;
        lastShotAt = clock;
      }
      lastHit = combo;
      return combo;
    }
    if (kind === 'skill') {
      const id = skillAbility(ev);
      const mv = abilities[id];
      if (!mv) return 0;
      poseNow(from);
      ab = { id, t: mv.entry };
      combo = 0; // a skill breaks the combo: the next basic is hit 1
      contactOwed = 0;
      recoilArmed = false;
      return 0;
    }
    if (kind === 'connect') {
      connectTick = ev && ev.tick !== undefined ? ev.tick : connectTick;
      const mv = move();
      if (mv && mv.recoil && moveT() < mv.contact) recoilArmed = true;
      return 0;
    }
    if (kind === 'hitstop') {
      const sec = Math.max(0, (ev && ev.ticks) || 0) / 60;
      const tick = ev && ev.tick !== undefined ? ev.tick : null;
      if (tick === null || tick !== stopTick) {
        stopTick = tick;
        const mv = move();
        // the attacker: its strike has not reached contact yet, so the hold
        // waits for the contact pose (B2); every other rig holds now. A shot
        // has no contact to wait for (its release is the press; the bolt
        // lands later), so a shooter always holds now.
        stopBucket = !ranged && tick !== null && tick === connectTick && mv && moveT() < mv.contact ? 'contact' : 'now';
      }
      if (stopBucket === 'contact') contactOwed += sec;
      else holdLeft += sec;
      return 0;
    }
    if (kind === 'spawn') {
      spawnSince = 0;
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
    if ((clip === 'hurt' && lastClip !== 'hurt') || clip === 'downed') breakChain(); // a hit taken breaks the combo
    lastClip = clip;
    const mv = move();
    if (mv) {
      const before = moveT();
      let t = before + dt;
      if (before < mv.contact && t >= mv.contact) {
        // the blow: the contact pose holds through the owed hitstop, and the
        // recoil starts on the first moving frame after it
        if (contactOwed > 0) {
          t = mv.contact;
          holdLeft += contactOwed;
          contactOwed = 0;
        }
        if (recoilArmed) {
          recoilSince = 0;
          recoilArmed = false;
        }
      }
      setMoveT(t);
      if (ab && ab.t >= mv.duration) ab = null;
      else if (!ab && combo > 0 && hitT >= mv.duration) combo = 0;
    }
    if (recoilSince >= 0) recoilSince = recoilSince > 1 ? -1 : recoilSince + dt;
    if (shotSince >= 0) shotSince = shotSince > 1.2 ? -1 : shotSince + dt;
    if (spawnSince >= 0) spawnSince = spawnSince > SPAWN_SEC + FRAME ? -1 : spawnSince + dt;
  }

  // Pure lab state: { kind: 'hit', n, t, fresh, from?, recoil?, shot? } |
  // { kind: 'ability', id, t, recoil? } | { kind: 'spawn', t } | null.
  function setOverride(o) {
    override = o || null;
    if (!o) return;
    ab = null;
    combo = 0;
    recoilSince = -1;
    shotSince = -1;
    spawnSince = -1;
    if (o.kind === 'ability') {
      ab = { id: o.id, t: o.t };
      pack.copy(from, o.from || pack.REST);
    } else if (o.kind === 'hit') {
      combo = o.n + 1;
      hitT = o.t;
      fresh = !!o.fresh;
      pack.copy(from, o.from || (fresh ? pack.REST : hits[o.n].from));
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
      return !!(ab || combo > 0);
    },
    get ability() {
      return ab ? ab.id : null;
    },
    get comboHit() {
      return combo;
    },
    get held() {
      return holdLeft > 0;
    },
    // what the probes read: the time into the move and its contact
    get moveTime() {
      return moveT();
    },
    get moveContact() {
      const mv = move();
      return mv ? mv.contact : null;
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
        shot: ranged ? { level: n + 1, since: local } : null,
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
// real velocity at the home it lifted off for (so a lunge lands). On a hop, a
// dash or any travel too fast to walk, both feet leave the floor and ride the
// body at their stance home, and plant where they land. Disabled while the
// body falls or lies downed.
//   feet: the foot meshes (children of rig); home: their rest positions in
//   rig space (y = the foot's rest height); lunge: { lead, reach, brace }:
//   the lead foot's home moves `reach` ahead at step 1, the other `brace`
//   back.
// ---------------------------------------------------------------------------
export function createFootLock({ rig, feet, home, trigger = 0.085, lift = 0.07, lunge = null, airSpeed = 4.2, tuck = 0.05 }) {
  const yawGroup = () => rig.parent && rig.parent.parent;
  const foot = feet.map((f, i) => ({
    planted: new Vector3(), // world
    from: new Vector3(),
    to: new Vector3(),
    swing: -1, // 0..1 while stepping, -1 planted
    dur: 0.2,
    side: home[i].x < 0 ? -1 : 1,
    home: new Vector3(),
    aim: new Vector3(), // the home it steps for (yaw space), fixed at lift-off
  }));
  const vel = new Vector3();
  const lastPos = new Vector3();
  const w = new Vector3();
  const yawQ = new Quaternion();
  let init = false;
  let air = false;
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
  }
  function localVelocity(out) {
    const yg = yawGroup();
    out.copy(vel);
    if (yg) out.applyQuaternion(yg.getWorldQuaternion(yawQ).invert());
    return out;
  }

  function step(dt, stance, locked) {
    const yg = yawGroup();
    if (!yg) return state;
    yg.updateWorldMatrix(true, false);
    const gp = yg.getWorldPosition(w);
    state.bobLift = 0;
    if (!init || !locked) {
      if (dt > 0) lastPos.copy(gp);
      plantAll(stance);
      if (!locked) for (let i = 0; i < feet.length; i++) feet[i].position.copy(home[i]);
      state.airborne = false;
      return state;
    }
    // A teleport, a new room, or the body moved while no time passed (a
    // held frame, the lab's Still): stand afresh where it is now.
    const jump = gp.distanceTo(lastPos);
    if (jump > 1.0 || (dt <= 0 && jump > 0.01)) {
      plantAll(stance);
      lastPos.copy(gp);
      vel.set(0, 0, 0);
    } else if (dt > 0) {
      const k = Math.min(1, dt * 12);
      vel.x += ((gp.x - lastPos.x) / dt - vel.x) * k;
      vel.z += ((gp.z - lastPos.z) / dt - vel.z) * k;
      lastPos.copy(gp);
    }
    const speed = Math.hypot(vel.x, vel.z);
    state.speed = speed;
    // Airborne: a hop, a dash, or travel faster than any walk can step.
    const airborne = stance.air > 0.5 || stance.hop > 0.015 || speed > airSpeed;
    state.airborne = airborne;
    if (airborne) {
      air = true;
      for (let i = 0; i < feet.length; i++) {
        homeLocalOf(i, stance, w);
        feet[i].position.set(w.x, home[i].y + (stance.hop > 0.015 ? 0 : tuck), w.z);
        foot[i].swing = -1;
      }
      return state;
    }
    if (air) {
      air = false;
      plantAll(stance); // landed: plant where the stance put the feet
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
        swinging = best;
      }
    }
    // place the feet (world -> rig space)
    rig.updateWorldMatrix(true, false);
    for (let i = 0; i < foot.length; i++) {
      const f = foot[i];
      if (f.swing >= 0) {
        const k = ease.inOut(f.swing);
        w.lerpVectors(f.from, f.to, k);
        w.y = lift * Math.sin(Math.PI * f.swing) * Math.min(1, 0.4 + speed * 0.5);
        state.bobLift = Math.sin(Math.PI * f.swing);
        state.plantSide = -f.side;
        state.swingSide = f.side;
      } else {
        w.copy(f.planted);
        w.y = 0;
      }
      rig.worldToLocal(w);
      feet[i].position.set(w.x, w.y + home[i].y, w.z);
    }
    return state;
  }

  return {
    step,
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
