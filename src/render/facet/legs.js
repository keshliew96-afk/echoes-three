// WORLD-LOCKED FEET (docs/MODEL_STANDARD.md "Foes"; Kesh's technical
// self-check, rule 2). The Tank pilot's locked feet, for any number of legs:
// each foot is pinned to the floor in world space while it carries weight and
// steps only when the stance needs it. Feet step in gait groups (a trot's
// diagonal pairs, an insect's tripods), one group at a time, landing ahead
// along the body's real travel at the home they lifted off for. So a foot
// never skates, a backpedal steps backward, a sidestep steps sideways, a turn
// on the spot shuffles round, and a lunge's front feet step into it.
//
// Everything works in the FLOOR FRAME: the group's position, the yaw angle and
// the scale, read from the rig every frame. Never from the group's matrix: the
// enemy layer composes its hit envelope (squash, hop, tilt) into that matrix,
// and a hopping body must carry its feet up with it, not leave them pinned in
// the air.
//
//   createLegs({ homes, groups, ... })  the planner
//   solveKnee(hip, foot, l1, l2, bend)  analytic two-bone leg IK
//   segmentMatrix(m, a, b, r)           a unit segment (y 0..1) from a to b
import { Quaternion, Vector3 } from 'three';
import { ease } from './timeline.js';

const UP = new Vector3(0, 1, 0);

function toWorld(fr, lx, lz, out) {
  const c = Math.cos(fr.yaw);
  const s = Math.sin(fr.yaw);
  out.x = fr.x + (c * lx + s * lz) * fr.s;
  out.z = fr.z + (-s * lx + c * lz) * fr.s;
  return out;
}
function toLocal(fr, wx, wz, out) {
  const c = Math.cos(fr.yaw);
  const s = Math.sin(fr.yaw);
  const dx = (wx - fr.x) / fr.s;
  const dz = (wz - fr.z) / fr.s;
  out.x = c * dx - s * dz;
  out.z = s * dx + c * dz;
  return out;
}

// homes: [Vector3] each foot's rest spot in yaw space (y is ignored, feet
// stand on the floor). groups: [[leg indices], ...] that step together, in
// alternation. trigger: u off home before a planted foot steps (scaled down
// while moving, so a walk keeps its rhythm). reach: u off home at which a
// planted foot steps even while another group is in the air (a body that
// outruns its gait). lead: how far ahead along the travel a step lands, in
// step durations.
export function createLegs({ homes, groups, trigger = 0.09, reach = 0.24, lift = 0.06, durMin = 0.09, durMax = 0.18, lead = 0.55 }) {
  const n = homes.length;
  const feet = homes.map(() => ({
    planted: { x: 0, z: 0 },
    from: { x: 0, z: 0 },
    to: { x: 0, z: 0 },
    aim: { x: 0, z: 0 }, // the home it steps for (yaw space), fixed at lift-off
    home: { x: 0, z: 0 },
    swing: -1, // 0..1 while stepping, -1 planted
    dur: durMax,
  }));
  const groupOf = new Array(n).fill(0);
  groups.forEach((g, gi) => g.forEach((i) => (groupOf[i] = gi)));
  const out = homes.map((h) => new Vector3(h.x, 0, h.z));
  const vel = { x: 0, z: 0 };
  const last = { x: 0, z: 0 };
  const tmp = { x: 0, z: 0 };
  let init = false;
  let lastGroup = -1;
  let bob = 0;
  let speed = 0;
  let free = false; // the last update stood the feet on their homes (unlocked)

  function homeLocal(i, shift, o) {
    o.x = homes[i].x;
    o.z = homes[i].z;
    if (shift) shift(i, o);
    return o;
  }
  function reset(fr, shift) {
    for (let i = 0; i < n; i++) {
      homeLocal(i, shift, tmp);
      toWorld(fr, tmp.x, tmp.z, feet[i].planted);
      feet[i].swing = -1;
    }
    vel.x = 0;
    vel.z = 0;
    last.x = fr.x;
    last.z = fr.z;
    init = true;
  }
  function stepGroup(gi, fr, shift) {
    for (let i = 0; i < n; i++) {
      if (groupOf[i] !== gi || feet[i].swing >= 0) continue;
      startStep(i, fr, shift);
    }
    lastGroup = gi;
  }
  function startStep(i, fr, shift) {
    const f = feet[i];
    f.swing = 0;
    f.dur = Math.max(durMin, Math.min(durMax, durMax - speed * 0.035));
    f.from.x = f.planted.x;
    f.from.z = f.planted.z;
    homeLocal(i, shift, f.aim);
    toWorld(fr, f.aim.x, f.aim.z, f.to);
    f.to.x += vel.x * f.dur * lead;
    f.to.z += vel.z * f.dur * lead;
  }

  const api = {
    out, // each foot in yaw space (y = its lift), written by update
    get bob() {
      return bob; // 0..1: how high the stepping feet are (the body's bob)
    },
    get speed() {
      return speed;
    },
    // fr: { x, z, yaw, s } the floor frame. locked: false stands the feet on
    // their homes (a collapse, the Journal turntable, a spawn-in). shift(i, o)
    // moves foot i's home (a lunge steps the front feet in).
    update(dt, fr, { locked = true, shift = null } = {}) {
      free = !locked;
      if (!init || !locked) {
        reset(fr, shift);
        bob = 0;
        speed = 0;
        for (let i = 0; i < n; i++) {
          homeLocal(i, shift, tmp);
          out[i].set(tmp.x, 0, tmp.z);
        }
        return api;
      }
      const jump = Math.hypot(fr.x - last.x, fr.z - last.z);
      // moved with no time passing (a scrub, a still, a placement): stand afresh
      if (dt <= 0 && jump > 1e-4) reset(fr, shift);
      if (dt > 0) {
        if (jump > 1.5) reset(fr, shift); // a teleport or a new room: stand afresh
        else {
          const k = Math.min(1, dt * 12);
          vel.x += ((fr.x - last.x) / dt - vel.x) * k;
          vel.z += ((fr.z - last.z) / dt - vel.z) * k;
          last.x = fr.x;
          last.z = fr.z;
        }
      }
      speed = Math.hypot(vel.x, vel.z);
      for (let i = 0; i < n; i++) {
        homeLocal(i, shift, tmp);
        toWorld(fr, tmp.x, tmp.z, feet[i].home);
      }
      // advance the swings, re-aiming each landing while it flies (the body
      // keeps moving), at the home it lifted off for
      let flying = -1;
      for (let i = 0; i < n; i++) {
        const f = feet[i];
        if (f.swing < 0) continue;
        f.swing += dt / f.dur;
        toWorld(fr, f.aim.x, f.aim.z, f.to);
        f.to.x += vel.x * f.dur * lead;
        f.to.z += vel.z * f.dur * lead;
        if (f.swing >= 1) {
          f.swing = -1;
          f.planted.x = f.to.x;
          f.planted.z = f.to.z;
        } else flying = groupOf[i];
      }
      // start a group's step: the group furthest from home, if too far (a
      // moving body alternates groups)
      const err = (i) => Math.hypot(feet[i].planted.x - feet[i].home.x, feet[i].planted.z - feet[i].home.z);
      if (flying < 0) {
        const limit = trigger * (speed > 0.3 ? 0.6 : 1);
        let best = -1;
        let bestErr = limit;
        for (let gi = 0; gi < groups.length; gi++) {
          let e = 0;
          for (const i of groups[gi]) e = Math.max(e, err(i));
          // while walking, the group that did not step last goes first on a tie
          const bias = speed > 0.3 && gi !== lastGroup ? 1.15 : 1;
          if (e * bias > bestErr) {
            bestErr = e * bias;
            best = gi;
          }
        }
        if (best >= 0) stepGroup(best, fr, shift);
      } else {
        // a planted foot left at full reach steps anyway
        for (let i = 0; i < n; i++) if (feet[i].swing < 0 && groupOf[i] !== flying && err(i) > reach) startStep(i, fr, shift);
      }
      // place the feet (world -> yaw space)
      bob = 0;
      const liftK = Math.min(1, 0.4 + speed * 0.5);
      for (let i = 0; i < n; i++) {
        const f = feet[i];
        if (f.swing >= 0) {
          const k = ease.inOut(f.swing);
          toLocal(fr, f.from.x + (f.to.x - f.from.x) * k, f.from.z + (f.to.z - f.from.z) * k, tmp);
          const h = Math.sin(Math.PI * f.swing);
          out[i].set(tmp.x, (lift * h * liftK) / fr.s, tmp.z);
          bob = Math.max(bob, h);
        } else {
          toLocal(fr, f.planted.x, f.planted.z, tmp);
          out[i].set(tmp.x, 0, tmp.z);
        }
      }
      return api;
    },
    // The travel in the rig's own frame (+z ahead, +x to its left), u/s.
    localVelocity(fr, o) {
      const c = Math.cos(fr.yaw);
      const s = Math.sin(fr.yaw);
      o.x = c * vel.x - s * vel.z;
      o.z = s * vel.x + c * vel.z;
      return o;
    },
    // For probes: each foot's planted world spot and whether it carries weight
    // (unlocked feet, a spawn-in or the turntable, stand on their homes: none
    // carries weight).
    feet() {
      return feet.map((f) => ({ planted: !free && f.swing < 0, x: f.planted.x, z: f.planted.z }));
    },
  };
  return api;
}

// Two-bone IK: the knee for a hip and a foot, with segment lengths l1 (hip to
// knee) and l2 (knee to foot), bent toward `bend` (a direction: out, back or
// forward). A foot past full reach straightens the leg toward it.
const ikD = new Vector3();
const ikP = new Vector3();
export function solveKnee(hip, foot, l1, l2, bend, out) {
  ikD.subVectors(foot, hip);
  let d = ikD.length();
  if (d < 1e-6) {
    ikD.set(0, -1, 0);
    d = 1e-6;
  } else ikD.multiplyScalar(1 / d);
  const dc = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d));
  const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  ikP.copy(bend).addScaledVector(ikD, -bend.dot(ikD));
  if (ikP.lengthSq() < 1e-8) ikP.set(0, 0, 1).addScaledVector(ikD, -ikD.z);
  ikP.normalize();
  return out.copy(hip).addScaledVector(ikD, a).addScaledVector(ikP, h);
}

// A matrix that lays a unit segment (y from 0 to 1, radius 1) from a to b
// with radius r (an instanced leg bone, a vine link). `over` runs it past
// both ends by that much, so two bones meeting at a joint close over it.
const segQ = new Quaternion();
const segV = new Vector3();
const segS = new Vector3();
const segA = new Vector3();
export function segmentMatrix(m, a, b, r, rz = r, over = 0) {
  segV.subVectors(b, a);
  const len = Math.max(1e-4, segV.length());
  segV.multiplyScalar(1 / len);
  segQ.setFromUnitVectors(UP, segV);
  segA.copy(a).addScaledVector(segV, -over);
  return m.compose(segA, segQ, segS.set(r, len + 2 * over, rz));
}

// A planted foot the body has risen out of reach of (a rear, a toss) lifts
// straight up off its spot until the leg can reach it: the weight leaves it,
// it never slides (rule 2). Returns how far it lifted.
export function liftToReach(hip, foot, l1, l2) {
  const reach = (l1 + l2) * 0.995;
  const dx = foot.x - hip.x;
  const dz = foot.z - hip.z;
  const h2 = dx * dx + dz * dz;
  const dy = hip.y - foot.y;
  if (h2 + dy * dy <= reach * reach || h2 >= reach * reach) return 0;
  const want = hip.y - Math.sqrt(reach * reach - h2);
  const lift = Math.max(0, want - foot.y);
  foot.y += lift;
  return lift;
}
