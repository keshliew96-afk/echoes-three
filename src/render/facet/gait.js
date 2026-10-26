// LOCKED FEET FOR LEGGED MODELS (docs/MODEL_STANDARD.md). Kesh's self-check
// for every animation: the root motion matches the legs' direction, a planted
// foot stays locked to the floor until the weight shifts, and the hips and
// legs carry each blow. The Tank pilot did this for two feet inline; this is
// the same rule for any number of legs, so the Level I bosses and champions
// (a stag, a sow, a wolf, a hart, a knight on root legs) walk on it:
//
//   * every foot is pinned to a WORLD point while it carries weight, and is
//     drawn exactly there (the leg reaches it by two-bone IK);
//   * a foot steps when the stance's home has drifted `trigger` away, its
//     whole gait group at once (the diagonal pairs of a trot, or one foot of
//     a biped), landing ahead along the body's real velocity, never both
//     groups at a walk; at a run (`flight` speed) the groups may overlap,
//     the flight phase of a gallop;
//   * a planted foot that the leg can no longer reach lifts at once (a
//     lunge, a charge): it never slides to keep up;
//   * `raise[i]` lifts a foot off the floor for a pose (a stag rearing, a
//     hoof pawing the ground), from where it stood toward a held point, and
//     sets it down again at its home (plus any lunge offset in the stance);
//   * `air` (a leap) carries every foot with the body; landing plants them
//     where they touch down;
//   * unlocked (a turntable, a spawn-in, a death) the feet stand on their
//     homes and the lock starts afresh.
//
// The rig owns the spaces: `space` is the Object3D whose frame the homes are
// in (the yaw group: world placement and facing, no pose), and the rig reads
// `foot.out` (that space) to draw each leg. Render only; pure in the dt it is
// given, so a held clock (hitstop) holds the feet too.
import { Quaternion, Vector3 } from 'three';
import { ease } from './timeline.js';

const _q = new Quaternion();

// feet: [{ home: [x, z] (space units, on the floor), group: 0 | 1, hip(out)
// -> the hip in space units this frame (for the reach test), reach }]
export function createGait(feet, opts = {}) {
  const o = {
    trigger: 0.3, // u off home before a planted group steps (at rest)
    runTrigger: 0.55, // ...the share of it once the body is moving
    lift: 0.16, // u, the top of a step's arc at walking speed
    minDur: 0.12, // s, a step at a run
    maxDur: 0.3, // s, a step at a walk
    durPerSpeed: 0.05, // s shaved off a step per u/s
    lead: 0.55, // a landing leads the home by this share of the step's travel
    flight: 3.2, // u/s past which both groups may be in the air at once
    reachK: 0.97, // a planted foot lifts once its leg is stretched this far
    jump: 1.5, // u: a move larger than this in one frame is a teleport
    ...opts,
  };
  const F = feet.map((f, i) => ({
    i,
    group: f.group | 0,
    homeLocal: new Vector3(f.home[0], 0, f.home[1]),
    hip: f.hip || null,
    reach: f.reach || Infinity,
    planted: new Vector3(), // world
    from: new Vector3(), // world, lift-off point of the live step
    to: new Vector3(), // world, landing point of the live step
    aim: new Vector3(), // space, the home the live step lands on
    homeW: new Vector3(), // world, this frame's home
    out: new Vector3(), // space, where the foot is drawn this frame
    swing: -1, // 0..1 while stepping, -1 planted, -2 raised
    dur: 0.2,
    raiseFrom: new Vector3(), // world, where a raise lifted off
    raisePeak: 0,
    up: 0, // 0..1 how far off the floor (for the rig: hoof tilt, dust)
    steps: 0, // landings so far (probes)
  }));
  const vel = new Vector3();
  const lastPos = new Vector3();
  const tmp = new Vector3();
  const tmp2 = new Vector3();
  const hipTmp = new Vector3();
  let init = false;
  let bob = 0; // 0..1, the highest step arc this frame (the body rises over a passing foot)
  let lastSwingGroup = 1;

  const homeWorld = (space, f, stance, out) => {
    out.copy(f.homeLocal);
    if (stance) stance(f.i, out);
    out.y = 0;
    return space.localToWorld(out);
  };
  function reset(space, stance) {
    for (const f of F) {
      homeWorld(space, f, stance, f.planted);
      f.swing = -1;
      f.up = 0;
      space.worldToLocal(f.out.copy(f.planted));
    }
    init = true;
    bob = 0;
  }
  // How stretched the leg is if this foot stays where it is (1 = full reach).
  function stretch(space, f, world) {
    if (!f.hip || !Number.isFinite(f.reach)) return 0;
    f.hip(hipTmp);
    space.worldToLocal(tmp2.copy(world));
    return tmp2.distanceTo(hipTmp) / f.reach;
  }
  function startStep(space, f, stance, speed) {
    f.swing = 0;
    f.dur = Math.max(o.minDur, Math.min(o.maxDur, o.maxDur - speed * o.durPerSpeed));
    f.from.copy(f.planted);
    f.aim.copy(f.homeLocal);
    if (stance) stance(f.i, f.aim);
    f.aim.y = 0;
    space.localToWorld(f.to.copy(f.aim)).addScaledVector(vel, f.dur * o.lead);
  }

  return {
    feet: F,
    options: o,
    get velocity() {
      return vel;
    },
    get bob() {
      return bob;
    },
    reset,
    // dt: s; space: the frame of the homes; stance(i, out): add the pose's
    // offset to foot i's home (space units); locked: false stands the feet on
    // their homes; air: 0..1 the body is off the ground (a leap); raise(i):
    // 0..1 a held lift of foot i; raiseTo(i, out): where a raised foot is
    // held (space units, y up).
    update(dt, { space, stance = null, locked = true, air = 0, raise = null, raiseTo = null } = {}) {
      space.updateWorldMatrix(true, false);
      const gp = space.getWorldPosition(tmp);
      bob = 0;
      if (!init || !locked || air > 0.02) {
        if (dt > 0 || !init) lastPos.copy(gp);
        if (!locked || !init) {
          vel.set(0, 0, 0);
          reset(space, stance);
          return;
        }
        // airborne: the feet ride with the body on their homes; landing
        // plants them wherever they come down
        for (const f of F) {
          f.out.copy(f.homeLocal);
          if (stance) stance(f.i, f.out);
          f.out.y = 0;
          f.swing = -1;
          f.up = 1;
          space.localToWorld(f.planted.copy(f.out));
          f.planted.y = 0;
        }
        return;
      }
      if (dt > 0) {
        if (gp.distanceTo(lastPos) > o.jump) {
          reset(space, stance);
          lastPos.copy(gp);
          vel.set(0, 0, 0);
        } else {
          const k = Math.min(1, dt * 12);
          vel.x += ((gp.x - lastPos.x) / dt - vel.x) * k;
          vel.z += ((gp.z - lastPos.z) / dt - vel.z) * k;
          lastPos.copy(gp);
        }
      }
      const speed = Math.hypot(vel.x, vel.z);
      for (const f of F) homeWorld(space, f, stance, f.homeW);

      // Raised feet: held off the floor by the pose, set down on their home.
      for (const f of F) {
        const r = raise ? Math.max(0, Math.min(1, raise(f.i))) : 0;
        if (r > 0.001) {
          if (f.swing !== -2) {
            // lift off from wherever it is (a planted spot, or mid-step)
            f.raiseFrom.copy(f.swing >= 0 ? f.to : f.planted);
            f.swing = -2;
            f.raisePeak = r;
          }
          f.raisePeak = Math.max(f.raisePeak, r);
          // rising: from the lift-off spot; falling: the base walks to the
          // home it will land on, so it touches down exactly there
          const desc = r < f.raisePeak - 1e-4;
          const base = desc ? tmp2.copy(f.homeW).lerp(f.raiseFrom, r / f.raisePeak) : tmp2.copy(f.raiseFrom);
          const held = tmp.set(0, 0, 0);
          if (raiseTo) raiseTo(f.i, held);
          space.localToWorld(held);
          f.planted.copy(base).lerp(held, r);
          f.up = r;
        } else if (f.swing === -2) {
          // touched down: planted on its home
          f.planted.copy(f.homeW);
          f.swing = -1;
          f.up = 0;
          f.steps++;
        }
      }
      // Advance live steps, re-aiming the landing ahead along the travel.
      const swingingGroups = new Set();
      for (const f of F) {
        if (f.swing < 0) continue;
        f.swing += dt / f.dur;
        space.localToWorld(f.to.copy(f.aim)).addScaledVector(vel, f.dur * o.lead * Math.max(0, 1 - f.swing));
        if (f.swing >= 1) {
          f.swing = -1;
          f.planted.copy(f.to);
          f.planted.y = 0;
          f.steps++;
        } else swingingGroups.add(f.group);
      }
      // Forced lifts: a planted foot its leg can no longer reach.
      for (const f of F) {
        if (f.swing !== -1) continue;
        if (stretch(space, f, f.planted) > o.reachK) {
          startStep(space, f, stance, speed);
          swingingGroups.add(f.group);
        }
      }
      // Start the group that has drifted furthest, if no other group is in
      // the air (or the body runs fast enough for a flight phase).
      const trig = o.trigger * (speed > 0.3 ? o.runTrigger : 1);
      let best = -1;
      let bestErr = trig;
      for (const g of [0, 1]) {
        if (swingingGroups.has(g)) continue;
        if (swingingGroups.size && speed < o.flight) continue;
        let err = 0;
        for (const f of F) if (f.group === g && f.swing === -1) err = Math.max(err, Math.hypot(f.planted.x - f.homeW.x, f.planted.z - f.homeW.z));
        // a tie goes to the group that did not step last (the gait alternates)
        if (err > bestErr + (g === lastSwingGroup ? 1e-3 : 0)) {
          bestErr = err;
          best = g;
        }
      }
      if (best >= 0) {
        for (const f of F) {
          if (f.group !== best || f.swing !== -1) continue;
          if (Math.hypot(f.planted.x - f.homeW.x, f.planted.z - f.homeW.z) < trig * 0.2) continue;
          startStep(space, f, stance, speed);
        }
        lastSwingGroup = best;
      }
      // Draw: planted feet exactly on their spot; steps on an arc.
      const liftK = Math.min(1, 0.45 + speed * 0.35);
      for (const f of F) {
        if (f.swing >= 0) {
          const k = ease.inOut(f.swing);
          tmp.lerpVectors(f.from, f.to, k);
          tmp.y = o.lift * liftK * Math.sin(Math.PI * f.swing);
          f.up = Math.sin(Math.PI * f.swing);
          bob = Math.max(bob, f.up);
        } else {
          tmp.copy(f.planted);
          if (f.swing === -1) {
            tmp.y = 0;
            f.up = 0;
          }
        }
        space.worldToLocal(f.out.copy(tmp));
      }
    },
    // Probes: where each foot is held (world) and whether it carries weight.
    report(space) {
      space.updateWorldMatrix(true, false);
      return F.map((f) => {
        const w = space.localToWorld(tmp.copy(f.out));
        // a foot riding a leap (up 1) carries no weight
        return { planted: f.swing === -1 && f.up < 1e-3, x: f.planted.x, z: f.planted.z, drawnX: w.x, drawnY: w.y, drawnZ: w.z, steps: f.steps, group: f.group };
      });
    },
    // The travel in the space's own frame (+z ahead): the lean follows it.
    localVelocity(space, out) {
      out.copy(vel);
      return out.applyQuaternion(space.getWorldQuaternion(_q).invert());
    },
  };
}

// Analytic two-bone IK in the plane of the hip, the foot and a pole: writes
// the knee into `knee` and returns how much of the reach the leg needed (1 =
// straight). If the foot is out of reach the knee lies on the straight line.
export function solveTwoBone(hip, foot, a, b, pole, knee) {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const dz = foot.z - hip.z;
  let L = Math.hypot(dx, dy, dz);
  const ux = L > 1e-6 ? dx / L : 0;
  const uy = L > 1e-6 ? dy / L : -1;
  const uz = L > 1e-6 ? dz / L : 0;
  const used = L / (a + b);
  L = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, L));
  const x = (a * a - b * b + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  // bend toward the pole, square to the hip-foot line
  let px = pole.x, py = pole.y, pz = pole.z;
  const d = px * ux + py * uy + pz * uz;
  px -= ux * d;
  py -= uy * d;
  pz -= uz * d;
  const pl = Math.hypot(px, py, pz);
  if (pl < 1e-6) {
    px = 0;
    py = 0;
    pz = 1;
  } else {
    px /= pl;
    py /= pl;
    pz /= pl;
  }
  knee.set(hip.x + ux * x + px * h, hip.y + uy * x + py * h, hip.z + uz * x + pz * h);
  return used;
}

// Point a segment (a mesh group whose part runs up +Y from its origin) from
// one point to another, both in its parent's space. The segment keeps its
// built length; `stretch` (default false) scales it to fit instead.
const _up = new Vector3(0, 1, 0);
const _d = new Vector3();
export function aimSegment(seg, from, to, stretch = false) {
  _d.subVectors(to, from);
  const len = _d.length();
  seg.position.copy(from);
  if (len > 1e-6) seg.quaternion.setFromUnitVectors(_up, _d.multiplyScalar(1 / len));
  if (stretch && seg.userData.len) seg.scale.y = len / seg.userData.len;
  return len;
}
