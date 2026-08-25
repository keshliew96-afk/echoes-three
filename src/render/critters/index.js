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

export const FALL_ANGLE = 1.36; // rad (~78°) — §10 "collapses horizontal"
const LIE_HEIGHT = 0.19; // height of a lying body's long axis
// §19.2 "~8° body lean". 0.21 rad = 12.0° is the hard ceiling for any clip on
// any class (basePitch included); the flinch may rock further BACK, which tips
// the face UP toward the camera and is therefore never a legibility problem.
const PITCH_MAX = 0.21;
const PITCH_MIN = -0.36;
const HEAD_COUNTER = 0.88; // fraction of torso pitch cancelled at the neck
const CHIN_UP = 0.18; // rad (~10.3°) — presents the face to a 52° top-down cam

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
  // Shadow pulled in to 0.60 of the ring radius: the ring's Bone inner rim
  // starts at 0.632, so the shadow's falloff can no longer sit ON the ring and
  // darken the identical footprint (round-3 F1 measured exactly that on the
  // Tank, whose accent luma was already below the ground's).
  const shadow = groundShadow(Math.min(M.halfWidth * 0.78, ringRadius * 0.56), 0.44);
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

    // LEAN (round-3 F4). The walk/attack lean measured 35-45° of visible pitch
    // and hid every face behind the crown at the gameplay camera, folding the
    // fox's ear pair into one dark spike. §19.2 specs "~8° body lean". The
    // torso pitch is therefore hard-clamped here — one place, all classes, all
    // clips, so no clip can ever re-introduce the defect — and the head is
    // counter-rotated to stay near-vertical with a small chin-up bias, which is
    // what keeps eyes and ears readable at the 52° gameplay elevation.
    const torso = built.torso;
    const pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, built.basePitch + P.pitch * upright));
    torso.rotation.x = pitch;
    torso.rotation.z = P.roll * upright;
    torso.rotation.y = P.yaw * upright;
    built.head.rotation.x = -pitch * HEAD_COUNTER - CHIN_UP * upright;
    // Shoulder counter-rotation carries the walk instead of the lean.
    built.head.rotation.y = -P.yaw * 0.55 * upright;

    // fallSign is handed to the class rig so a DOWNED critter can counter-rotate
    // its prop flat against the ground instead of letting the collapse fling it
    // behind the body (round-3 F8: the healer's staff and the fox's sword both
    // vanished at the exact moment the player needs to identify who went down).
    built.apply(P, t, fallSign);

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
    // §19.1 assigns Bone #C9C2B3 to "downed/neutral rings": the ring lerps to
    // Bone on the same curve that drives the body to charcoal (round-3 F7 —
    // downed rings were staying as saturated as the standing party's).
    ring.userData.setDesat(P.desat);
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
