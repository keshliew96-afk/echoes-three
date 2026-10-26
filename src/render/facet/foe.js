// FOE KIT (docs/MODEL_STANDARD.md "Foes"). The pieces every model standard
// foe shares, on top of the faceted material, the parts kit and the ability
// timelines of the pilot:
//
//   * a crowd budget. A hero or a boss is one body on screen; a Level I room
//     holds a dozen foes at once. So a foe's fixed detail rows (quills, plates,
//     bristles, thorns, scales) are BAKED: merged once per kind into one
//     faceted geometry the whole crowd shares (`bakeParts`, `bakeRow`), one draw
//     call per material and no buffer per foe. Only the parts that move on
//     their own every frame (legs, wings, vines) are instanced rows per rig.
//     The probe holds every foe at or under its classic rig's draw calls;
//   * the rig frame: group (the enemy layer owns its position, scale and
//     matrix: the elite scale and the kill pop live there), yaw, spawn (the B7
//     grow from the floor) and body (the rig's own motion), so a rig never
//     writes the layer's group. The shared hit envelope (the VFX layer) wraps
//     the yaw node, which a rig returns as `body`: everything that moves sits
//     under it, and what lies on the floor (the contact shadow) sits on the
//     group beside it, so it stays down while the body squashes and hops;
//   * a clock on pose's `t` (the layer holds it through a hitstop), and the
//     sim's telegraph as the anticipation: a timeline's wind-up phase is sampled
//     by the telegraph's progress on the interpolated sim tick, so the strike
//     lands on the tick the sim resolves the attack;
//   * the [M] beats of VFX_HIT_RULES §6.1 as small pure curves: the spawn-in
//     (B7), the settle with one overshoot (B5), the lunge into contact with its
//     squash (B9), the shooter's squash (B3);
//   * named points (B8) for the effects to anchor to.
//
// Render only: nothing here reads or writes sim state beyond the entity fields
// a pose already receives, and nothing reads the wall clock.
import { ConeGeometry, CylinderGeometry, Group, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sharedGeo } from '../geocache.js';
import { addInk, addPartInk } from '../critters/common.js';
import { facetMaterial, facetize, hash01 } from './material.js';
import { PART_INK_PX } from './kit.js';

// One frame of Kesh's timing tables (30 fps).
export const FRAME = 1 / 30;
// The sim's tick rate (render reads the interpolated tick a pose receives).
const TICK_HZ = 60;

// A faceted, flashable foe material: the enemy hit flash drives emissive
// white (render/enemies/index.js), exactly as on the classic rigs.
export function foeMaterial(color, opts = {}) {
  return facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0, ...opts });
}

// ---------------------------------------------------------------------------
// Baked rows: one shared, faceted geometry per kind.
// ---------------------------------------------------------------------------
// build() returns [{ geo, m, tone }]: a faceted geometry (render/facet/
// material.js facetize: non-indexed, with its per-plane `color` steps), the
// matrix that places it, and a value step for that part (the per-part mottle
// an instanced row would carry in instanceColor). Built once for the session.
export function bakeParts(key, build) {
  return sharedGeo(`facet:bake:${key}`, () => {
    const geos = [];
    for (const { geo, m, tone = 1, tint = null } of build()) {
      const g = geo.clone();
      // a faceted part carries position, normal and its value steps; uvs
      // and the rest would stop the merge (and no foe part is textured)
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') g.deleteAttribute(name);
      if (m) g.applyMatrix4(m);
      // tint (a Color) multiplies the part's own colour in: an unlit row (an
      // indigo tell) can alternate bright and dim inside one draw call
      if ((tone !== 1 || tint) && g.attributes.color) {
        const c = g.attributes.color;
        const r = tone * (tint ? tint.r : 1);
        const gg = tone * (tint ? tint.g : 1);
        const b = tone * (tint ? tint.b : 1);
        for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * r, c.getY(i) * gg, c.getZ(i) * b);
      }
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    merged.userData.faceted = true;
    merged.userData.baked = geos.length;
    return merged;
  });
}

// A row of one part, `place(i, m)` writing instance i's matrix, with a
// per-part value step (deterministic, so every foe of a kind matches).
export function bakeRow(key, geo, count, place, { mottle = 0.1, seed = 17 } = {}) {
  return bakeParts(key, () => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const m = new Matrix4();
      place(i, m);
      out.push({ geo, m, tone: 1 + mottle * (2 * hash01(i, seed, 11) - 1) });
    }
    return out;
  });
}

// A faceted part: ink 'full' (the 2.7 px silhouette line), 'part' (the kit's
// thinner seam) or false.
// A curved, tapering horn (a tusk, a claw, a stinger, a thorn): `seg`
// faceted frustums along an arc from the base (the origin, pointing +y),
// bending toward +z by `bend` rad over its length, the last closing to a
// point. Faceted, so it bakes into a row like any part.
export function hornGeometry({ len = 1, r = 0.12, bend = 0.8, seg = 3, sides = 5, jitter = 0.1, seed = 41 } = {}) {
  const pieces = [];
  const p = new Vector3();
  const step = len / seg;
  for (let i = 0; i < seg; i++) {
    const r0 = r * (1 - i / seg);
    const r1 = r * (1 - (i + 1) / seg);
    const a = (bend * (i + 0.5)) / seg;
    const g = new CylinderGeometry(r1, r0, step * 1.04, sides).translate(0, step / 2, 0).rotateX(a).translate(p.x, p.y, p.z);
    g.deleteAttribute('uv');
    pieces.push(g);
    p.y += Math.cos(a) * step;
    p.z += Math.sin(a) * step;
  }
  const merged = mergeGeometries(pieces);
  for (const g of pieces) g.dispose();
  return facetize(merged, { jitter, seed });
}

// A low faceted scale (a hide plate, a carapace shard): a six-sided shield
// that rises to a ridge, its base at y 0 so it can sit half sunk in a hide.
export function scaleGeometry({ sides = 6, jitter = 0.12, seed = 43 } = {}) {
  const g = new ConeGeometry(0.5, 1, sides, 1).translate(0, 0.5, 0);
  g.deleteAttribute('uv');
  return facetize(g, { jitter, seed });
}

export function foePart(geo, mat, ink = 'full', name = '') {
  const m = new Mesh(geo, mat);
  if (name) m.name = name;
  if (ink === 'full') addInk(m);
  else if (ink === 'part') addPartInk(m, PART_INK_PX);
  else if (typeof ink === 'number') addPartInk(m, ink);
  return m;
}

// ---------------------------------------------------------------------------
// The rig frame.
// ---------------------------------------------------------------------------
export function createFoeFrame(name) {
  const group = new Group();
  group.name = name;
  const yaw = new Group();
  yaw.name = `${name}-yaw`;
  group.add(yaw);
  const spawn = new Group(); // B7: grows from the floor
  spawn.name = `${name}-spawn`;
  yaw.add(spawn);
  const body = new Group(); // the rig's own motion (lunge, crouch, squash)
  body.name = `${name}-body`;
  spawn.add(body);
  const mats = [];
  const track = (m) => {
    mats.push(m);
    return m;
  };
  return { group, yaw, spawn, body, mats, track };
}

// A named point (B8): an empty the effects read with getWorldPosition.
export function namedPoint(parent, name, x, y, z) {
  const o = new Object3D();
  o.name = name;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

// ---------------------------------------------------------------------------
// The clock and the sim's telegraph.
// ---------------------------------------------------------------------------
// A clock on the sim's time. step(P) takes the pose input: while the sim's
// interpolated tick is known (the game, the lab) the clock runs on it, so a
// hitstop (the tick frozen while frames go on) pauses every clip and a
// contact holds through it (§6.1 B2), and a clip stays on the tick the sim
// resolves the attack; without one (the Journal's turntable) it runs on `t`.
// dt is clamped so a dropped frame or a tab switch never fast-forwards a
// clip; `now` only ever runs forward. A tick that jumps back more than two
// ticks (a lab rewind, a new run) restarts the clock without a step.
export function createFoeClock() {
  let last = null;
  let now = 0;
  let simT = null;
  return {
    step(P) {
      let t;
      if (typeof P === 'number') t = P;
      else if (P && Number.isFinite(P.tick) && !P.turntable) {
        const st = P.tick / TICK_HZ;
        // inside a hitstop the interpolated tick saw-tooths below the last
        // one: hold; a real jump back restarts
        if (simT === null || st < simT - 2 / TICK_HZ) {
          simT = st;
          last = null;
        } else if (st > simT) simT = st;
        t = simT;
      } else t = (P && P.t) ?? 0;
      const dt = last === null ? 0 : Math.min(0.1, Math.max(0, t - last));
      last = t;
      now += dt;
      return dt;
    },
    get now() {
      return now;
    },
    // The interpolated sim tick, held through a hitstop (it never runs back
    // inside one; a real rewind restarts it). Sample telegraph wind-ups and
    // strikes on `clock.tick + 1` (the shown tick), never on the raw P.tick.
    get tick() {
      return simT === null ? 0 : simT * TICK_HZ;
    },
  };
}

// Whether the sim holds the entity from attacking on this tick: a stun or a
// blind (sim/enemies.js resolveEnemies skips it and cancels its wind-up), or
// it is no longer active (dying, gone with the room).
export function heldBy(e, tick) {
  if (!e) return false;
  if (e.state && e.state !== 'active') return true;
  if (!(e.hp > 0) && e.hp !== undefined) return true;
  const st = e.status;
  if (!st) return false;
  return !!((st.stun && st.stun.untilTick > tick) || (st.blind && st.blind.untilTick > tick));
}

// The live telegraph's progress, 0..1 from its start to its resolve, on the
// interpolated sim tick (null when the entity has none).
export function telegraphProgress(e, tick) {
  const tel = e && e.telegraph;
  if (!tel) return null;
  const span = (tel.resolveTick ?? 0) - (tel.startTick ?? 0);
  if (!(span > 0)) return 1;
  const k = (tick - tel.startTick) / span;
  return k < 0 ? 0 : k > 1 ? 1 : k;
}

// Watches one entity's attacks from what a pose receives. Each update returns
// the beat that began this frame, if any:
//   { type: 'wind', kind, span }   a telegraph started (its kind: the
//                                  telegraph's own `kind`/`attack` field)
//   { type: 'release', kind }      the telegraph ended on (or past) its
//                                  resolve tick: the strike
//   { type: 'cancel', kind }       it ended early, or on its resolve tick
//                                  while the sim held the entity (a stun or a
//                                  blind landing on that tick, a death, a room
//                                  clear): the sim cancelled it, no attack
//   { type: 'bite' }               the layer's lunge pulse began (enemy_bite)
//   { type: 'fire' }               the layer's fire pulse began (enemy_fire)
// `key(tel)` names a telegraph (default: its kind, attack or shape).
export function createAttackWatch({ key = (tel) => tel.attack || tel.kind || 'attack' } = {}) {
  let tel = null; // { kind, startTick, resolveTick }
  let lastLunge = 0;
  let lastFire = 0;
  return {
    get telegraph() {
      return tel;
    },
    update({ e, tick, lungeK = 0, fireK = 0 }) {
      let beat = null;
      const live = e && e.telegraph;
      if (live && (!tel || tel.startTick !== live.startTick || tel.kind !== key(live))) {
        tel = { kind: key(live), startTick: live.startTick ?? tick, resolveTick: live.resolveTick ?? tick };
        beat = { type: 'wind', kind: tel.kind, span: (tel.resolveTick - tel.startTick) / TICK_HZ };
      } else if (!live && tel) {
        const ended = tick >= tel.resolveTick - 1.01 && !heldBy(e, tel.resolveTick) ? 'release' : 'cancel';
        beat = { type: ended, kind: tel.kind };
        tel = null;
      }
      if (!beat && lungeK > 0 && lastLunge === 0) beat = { type: 'bite' };
      if (!beat && fireK > 0 && lastFire === 0) beat = { type: 'fire' };
      lastLunge = lungeK;
      lastFire = fireK;
      return beat;
    },
    reset() {
      tel = null;
      lastLunge = 0;
      lastFire = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// The [M] beats (VFX_HIT_RULES §6.1), as pure curves.
// ---------------------------------------------------------------------------
// B7 spawn-in: the body grows from the floor in about 7 frames, with about
// 10% overshoot (up to 1.1 by frame 5, back to 1 by frame 7).
export const SPAWN_SEC = 7 * FRAME;
export function spawnScale(age) {
  if (age >= SPAWN_SEC) return 1;
  if (age <= 0) return 0.001;
  const up = 5 * FRAME;
  if (age < up) {
    const k = age / up;
    return 0.001 + 1.099 * (1 - (1 - k) * (1 - k));
  }
  const k = (age - up) / (SPAWN_SEC - up);
  return 1.1 - 0.1 * k * k * (3 - 2 * k);
}

// B5 follow-through: settle from 1 to 0 with ONE small overshoot (never a
// plain blend). k 0..1 across the settle; returns the remaining offset as a
// fraction of where it started (crosses 0 at k = 0.38, dips about 9% past it
// around k = 0.6, then lands).
export function settle(k) {
  if (k <= 0) return 1;
  if (k >= 1) return 0;
  const a = 1 - k;
  return a * a * (1 - 2.6 * k);
}

// B9 lunge into contact (melee). Phases over the strike: pull back, lunge,
// contact squash, snap back (2 to 3 frames), settle. Returns the body's
// forward shove (u), lean toward the target (rad) and squash (sx wide, sy tall)
// for a phase id and its 0..1 progress. `reach` caps the shove at a lunge
// step that passes the root-motion check (the feet step it in; the body never
// moves). The squash and the lean keep their full size (§6.1 item 2).
export function lungePose(phase, k, { reach = 0.16, pull = 0.07, lean = 0.4 } = {}) {
  const out = { push: 0, lean: 0, sx: 1, sy: 1 };
  if (phase === 'pull') {
    const e = 1 - (1 - k) * (1 - k);
    out.push = -pull * e;
    out.lean = -0.08 * e;
    out.sx = 1 - 0.04 * e;
    out.sy = 1 + 0.05 * e;
  } else if (phase === 'strike') {
    const e = k * k;
    out.push = -pull + (reach + pull) * e;
    out.lean = -0.08 + (lean + 0.08) * e;
    out.sx = 0.96 + (1.19 - 0.96) * e;
    out.sy = 1.05 + (0.91 - 1.05) * e;
  } else if (phase === 'contact') {
    out.push = reach;
    out.lean = lean;
    out.sx = 1.19;
    out.sy = 0.91;
  } else if (phase === 'snap') {
    const e = 1 - (1 - k) * (1 - k);
    out.push = reach * (1 - 0.35 * e);
    out.lean = lean * (1 - 0.5 * e);
    out.sx = 1.19 + (0.97 - 1.19) * e; // the snap overshoots a touch tall
    out.sy = 0.91 + (1.04 - 0.91) * e;
  } else if (phase === 'settle') {
    const s = settle(k);
    out.push = reach * 0.65 * s;
    out.lean = lean * 0.5 * s;
    out.sx = 1 - 0.03 * s;
    out.sy = 1 + 0.04 * s;
  }
  return out;
}

// B3 a shot squashes its shooter: about 20% wider on the shot, back in about
// 3 frames with a small stretch overshoot (about 4% taller) 4 to 5 frames
// after it. `age` is seconds since the shot left.
export function shotSquash(age, depth = 1) {
  const out = { sx: 1, sy: 1, shove: 0 };
  if (age < 0 || age > 0.5) return out;
  const f = age / FRAME;
  if (f < 1) {
    out.sx = 1 + 0.2 * depth * f;
    out.sy = 1 - 0.06 * depth * f;
  } else if (f < 3) {
    const k = (f - 1) / 2;
    out.sx = 1 + 0.2 * depth * (1 - k);
    out.sy = 1 - 0.06 * depth * (1 - k);
  } else if (f < 6) {
    const k = (f - 3) / 3;
    const b = Math.sin(Math.PI * k);
    out.sx = 1 - 0.02 * depth * b;
    out.sy = 1 + 0.04 * depth * b;
  }
  // the shove back off the shot eases out over about 0.45 s
  out.shove = -0.1 * depth * Math.max(0, 1 - age / 0.45) * Math.min(1, f / 2);
  return out;
}

// ---------------------------------------------------------------------------
// A 3-hit chain on a repeating attack (Kesh's combo template, §6.1 B1, B2,
// B5, B6). A foe that strikes again and again (a boar's gore, a lasher's whip)
// varies each hit's direction, and its third hit is the biggest. Each hit's
// overshoot settles INTO the next hit's wind-up, held ready for the chain
// window; a chained hit strikes straight from wherever the last one is, so the
// chain never pops; from rest the wind-back is one frame inside the strike.
// The sim's timing is untouched: a hit starts on the attack's own event.
//
// hits: [{ label, from, strike, over, next }] key poses (plain objects over the
// rig's own fields, every field present in `rest`).
// ---------------------------------------------------------------------------
export function hitTimelines(hits, window, createTimeline) {
  return hits.map((h, n) =>
    createTimeline(`hit${n + 1}`, `Hit ${n + 1}: ${h.label}`, [
      { id: 'wind', label: 'wind-back', dur: FRAME },
      { id: 'strike', label: 'strike', dur: 2.5 * FRAME },
      { id: 'contact', label: 'contact', dur: 2 * FRAME },
      { id: 'snap', label: 'snap back', dur: 2.5 * FRAME },
      { id: 'settle', label: `settle into hit ${((n + 1) % hits.length) + 1}`, dur: 5 * FRAME },
      { id: 'ready', label: `hit ${((n + 1) % hits.length) + 1} wind-up held`, dur: Math.max(FRAME, window - 13 * FRAME) },
      { id: 'recover', label: 'recover', dur: 0.35 },
    ])
  );
}

export function lerpFields(out, a, b, k, fields) {
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    out[f] = a[f] + (b[f] - a[f]) * k;
  }
  return out;
}

// A pose object's field names, listed once per object (no array per frame).
const FIELDS = new WeakMap();
function fieldsOf(rest) {
  let f = FIELDS.get(rest);
  if (!f) FIELDS.set(rest, (f = Object.keys(rest)));
  return f;
}
const hitS = {};

// Pure: hit n's pose at t seconds into it. `capture` is the pose it started
// from (a chained hit strikes from it; a fresh one winds from it); `pull`
// (0..1) deepens the held wind-up into the next hit's pull-back when the next
// strike is due (§6.1 B9).
export function hitPose(hits, tls, rest, n, t, capture, fresh, pull, out, ease) {
  const fields = fieldsOf(rest);
  const H = hits[n];
  const s = tls[n].sample(t, hitS); // a chained hit enters at its strike (t >= FRAME)
  const k = s.k;
  if (s.id === 'wind') return lerpFields(out, capture, H.from, ease.out(k), fields);
  if (s.id === 'strike') return lerpFields(out, fresh ? H.from : capture, H.strike, ease.in(k), fields);
  if (s.id === 'contact') return lerpFields(out, H.strike, H.strike, 0, fields);
  if (s.id === 'snap') return lerpFields(out, H.strike, H.over, ease.out(k), fields);
  if (s.id === 'settle') {
    // into the next wind-up with one small overshoot past it (B5)
    lerpFields(out, H.over, H.next, 1 - settle(k), fields);
    return out;
  }
  if (s.id === 'ready') {
    lerpFields(out, H.next, H.next, 0, fields);
    if (pull > 0 && H.pull) lerpFields(out, H.next, H.pull, ease.out(pull), fields);
    return out;
  }
  const from = pull > 0 && H.pull ? H.pull : H.next;
  return lerpFields(out, from, rest, 1 - settle(k), fields);
}

// The live chain: hit() on each attack event, pose() every frame. `due`
// (optional, seconds until the next strike is expected: a bite's per-target
// cooldown) lets the held wind-up pull back into it (`pullBack`), and when the strike is
// that close the chain starts the next hit itself, timed so its contact lands
// ON the expected tick; the real event then confirms it instead of starting
// another. Without a prediction a fresh hit's contact lands 3.5 frames after
// its event (one frame of wind-back inside the strike, B1), a chained hit's
// 2.5 frames after.
const STRIKE_IN = FRAME; // a timeline's strike phase starts here
const CONTACT_IN = 3.5 * FRAME; // and its contact here
// the held wind-up pulls back over the 4 frames before a predicted strike
// starts (B9: the pull-back peaks about 3 frames before the contact)
export const PULL_IN = CONTACT_IN - STRIKE_IN + 4 * FRAME;
export function pullBack(due) {
  if (due === null || due >= PULL_IN) return 0;
  return Math.min(1, (PULL_IN - due) / (4 * FRAME));
}
export function createChain({ hits, tls, rest, window, ease }) {
  let n = -1; // the hit playing (0..2), -1 at rest
  let t0 = 0;
  let lastHit = -99;
  let fresh = true;
  let pullK = 0;
  let lastNow = 0;
  let predicted = null; // when the early-started hit's contact is due
  const capture = { ...rest };
  const scratch = { ...rest };
  const smp = {};
  function start(now, chained, contactAt, out) {
    // the pose the new hit starts from: wherever the chain is right now
    if (n >= 0) hitPose(hits, tls, rest, n, now - t0, capture, fresh, pullK, out, ease);
    else Object.assign(out, rest);
    Object.assign(capture, out);
    fresh = !chained;
    n = fresh ? 0 : (n + 1) % hits.length;
    // a chained hit skips the wind-back (it strikes from where it is)
    t0 = contactAt - CONTACT_IN;
    pullK = 0;
  }
  const api = {
    // the hit playing (0..2), -1 at rest
    get current() {
      return n;
    },
    get fresh() {
      return fresh;
    },
    // when the playing hit's contact lands (the clock's seconds), or null
    get contactAt() {
      return n >= 0 ? t0 + CONTACT_IN : null;
    },
    // An attack event at `now`. Returns true when it started a hit, false when
    // it confirmed the one the prediction already started.
    hit(now, out = scratch) {
      if (predicted !== null && Math.abs(now - predicted) <= 3 * FRAME) {
        predicted = null;
        lastHit = now;
        return false;
      }
      predicted = null;
      const chained = n >= 0 && now - lastHit <= window;
      start(now, chained, now + (chained ? CONTACT_IN - STRIKE_IN : CONTACT_IN), out);
      lastHit = now;
      return true;
    },
    // Writes the pose into out; false when the chain is at rest.
    pose(now, out, due = null) {
      const dt = Math.max(0, now - lastNow);
      lastNow = now;
      if (n < 0) return false;
      let t = now - t0;
      if (predicted === null && due !== null && due <= CONTACT_IN - STRIKE_IN && t < tls[n].duration && tls[n].sample(t, smp).id === 'ready') {
        start(now, true, now + due, scratch);
        predicted = now + due;
        lastHit = predicted;
        t = now - t0;
      }
      if (predicted !== null && now - predicted > 3 * FRAME) predicted = null; // the event never came: it was a whiff
      if (t >= tls[n].duration) {
        n = -1;
        return false;
      }
      const s = tls[n].sample(t, smp);
      // the pull-back follows the prediction at its own pace: it never jumps
      // in when the wind-up is reached late, and a prediction that drops (the
      // target left, a stun) eases it out over about 5 frames
      if (s.id === 'ready') {
        const want = due !== null ? pullBack(due) : 0;
        if (want > pullK) pullK = Math.min(want, pullK + dt / (4 * FRAME));
        else {
          pullK = Math.max(want, pullK * Math.exp(-dt / (1.5 * FRAME)));
          if (pullK - want < 0.01) pullK = want;
        }
      }
      hitPose(hits, tls, rest, n, t, capture, fresh, pullK, out, ease);
      return true;
    },
    // The foe gave up the chain (it chases off): a held wind-up goes straight
    // to its recover, from the pose it holds.
    recover(now) {
      if (n < 0) return;
      const t = now - t0;
      if (t >= tls[n].duration || tls[n].sample(t, smp).id !== 'ready') return;
      t0 = now - tls[n].startOf('recover');
      predicted = null;
    },
    reset() {
      n = -1;
      pullK = 0;
      predicted = null;
    },
  };
  return api;
}

// Turn and squash the body about a pivot (its middle, not the floor under
// it), then add the shove (+z) and the lift: a nose-down gore drops the head
// without throwing the rump into the air.
const pivTmp = new Vector3();
export function placeBody(body, pivot, push = 0, lift = 0) {
  pivTmp.copy(pivot).multiply(body.scale).applyQuaternion(body.quaternion);
  body.position.set(pivot.x - pivTmp.x, pivot.y - pivTmp.y + lift, pivot.z - pivTmp.z + push);
  return body;
}
