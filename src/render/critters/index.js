// Chibi party critter factory (BUILD_BRIEF §19.2) — the public API the
// integrator attaches to sim entities:
//
//   const critter = createCritter('healer', { cosmetic });
//   scene.add(critter.group);          // position critter.group per tick
//   critter.setYaw(rad);               // aim facing (§3: yaw follows aim)
//   critter.setAnim('walk');           // idle|walk|cast|hurt|downed
//   critter.update(dt);                // render dt seconds — pose + clips
//   setInkViewport(w, h);              // once per frame/resize, whole party
//
// RIG LAYOUT (the shape of this tree is the fix for two rejected captures):
//
//   group            entity origin, feet on the ground plane
//    └ yawGroup      aim facing
//       ├ decals     identity ring + contact shadow — OUTSIDE the animated rig
//       │            so they stay welded to the ground through every clip, and
//       │            depth-tested so they can never paint over a body
//       └ fallPivot  §10 collapse. Sits at the body's MID-HEIGHT, so the
//          │         horizontal collapse rotates about the body centre and the
//          │         downed critter stays inside its own identity ring (the old
//          │         rig pivoted at the feet and threw the head 140 px clear of
//          │         the ring, i.e. clear of the revive target)
//          └ rig     bob / breathe / squash / feet (feet stay planted flat)
//             └ torso  THE single lean pivot at hip height: pitch, roll, yaw.
//                      Head, arms and props are all children, so a lean can
//                      never separate the head from the shoulders.
import { Group, Vector3 } from 'three';
import { CLASS_ACCENTS } from '../../data/palette.js';
import { groundRing, groundShadow, desatTarget, setInkViewport } from './common.js';
import { createPoseDriver, CLIPS } from './driver.js';
import { buildHealer } from './healer.js';
import { buildTank } from './tank.js';
import { buildSwordsman } from './swordsman.js';
import { buildArcher } from './archer.js';

export { CLIPS, setInkViewport };
export const CRITTER_CLASSES = ['healer', 'tank', 'swordsman', 'archer'];

const BUILDERS = {
  healer: buildHealer,
  tank: buildTank,
  swordsman: buildSwordsman,
  archer: buildArcher,
};

const FALL_ANGLE = 1.36; // rad (~78°) — §10 "collapses horizontal"
const LIE_HEIGHT = 0.19; // height of a lying body's long axis

export function createCritter(classId, { cosmetic = null } = {}) {
  const build = BUILDERS[classId];
  if (!build) throw new Error(`unknown critter class: ${classId}`);
  const accent = CLASS_ACCENTS[classId];

  const group = new Group();
  group.name = `critter-${classId}`;
  const yawGroup = new Group();
  group.add(yawGroup);

  const fallPivot = new Group();
  yawGroup.add(fallPivot);
  const rig = new Group();
  fallPivot.add(rig);

  // Accent-material tracker: everything registered here desaturates toward
  // charcoal while downed (§10) and restores on revive.
  const accentMats = [];
  const trackAccent = (mat) => {
    accentMats.push({ mat, orig: mat.color.clone(), target: desatTarget(mat.color) });
    return mat;
  };

  const built = build(rig, trackAccent);
  const M = built.metrics;

  // Ring sized so its bright band (0.74-0.85 of the radius) clears the widest
  // body mass — the band circles the critter on the floor instead of cutting
  // across it.
  const ringRadius = M.ringRadius ?? M.halfWidth / 0.7;
  const ring = groundRing(accent, ringRadius);
  const shadow = groundShadow(M.halfWidth * 0.78);
  const decals = new Group();
  decals.add(ring);
  decals.add(shadow);
  yawGroup.add(decals);

  // Collapse geometry: pivot at the body's mid-height keeps the centroid over
  // the entity position; the ring grows to cover the horizontal silhouette so
  // the revive target still sits under the body.
  const pivotH = M.domeTopY * 0.5;
  // Margin covers the props that swing out with the body (the healer's staff
  // reaches further than her head does).
  const lyingReach = Math.max(pivotH, M.domeTopY - pivotH) * Math.sin(FALL_ANGLE) + M.headR;
  const ringDownScale = Math.max(1, (lyingReach + 0.15) / ringRadius);

  const driver = createPoseDriver(cosmetic);
  // Fall side alternates so a downed party does not stack identically.
  const fallSign = (cosmetic ? cosmetic.chance(0.5) : Math.random() < 0.5) ? 1 : -1;

  let t = 0;
  let lastDesat = -1;

  function update(dt) {
    t += dt;
    const P = driver.update(dt);
    const c = P.collapse;
    const upright = 1 - c;

    // Collapse about the body centre (see header).
    fallPivot.position.y = pivotH * upright + LIE_HEIGHT * c;
    fallPivot.rotation.z = fallSign * FALL_ANGLE * c;

    rig.position.set(0, -pivotH + P.bob * upright, -0.11 * P.recoil * upright);
    rig.scale.set(P.squash, P.breathe, P.squash);

    const torso = built.torso;
    torso.rotation.x = built.basePitch + P.pitch * upright;
    torso.rotation.z = P.roll * upright;
    torso.rotation.y = P.yaw * upright;

    built.apply(P, t);

    // Decals: ring grows to fit the collapsed silhouette, shadow stretches
    // along the fall axis so a downed body is still grounded.
    const rs = 1 + (ringDownScale - 1) * c;
    ring.scale.set(rs, rs, 1);
    shadow.scale.set(1 + 1.9 * c, 1 + 0.25 * c, 1);
    shadow.position.x = fallSign * 0.06 * c;

    if (Math.abs(P.desat - lastDesat) > 0.002) {
      lastDesat = P.desat;
      for (const a of accentMats) a.mat.color.copy(a.orig).lerp(a.target, P.desat);
    }
  }

  update(0); // rest pose before the first frame

  return {
    classId,
    accent,
    group,
    metrics: { ...M, ringRadius },
    setAnim: driver.setAnim,
    getAnim: () => driver.anim,
    setYaw: (rad) => {
      yawGroup.rotation.y = rad;
    },
    // World-space helper for the integrator (portrait render targets, VFX
    // anchors): the head centre of the posed model.
    headWorld: (out = new Vector3()) => {
      built.head.getWorldPosition(out);
      return out;
    },
    update,
  };
}
