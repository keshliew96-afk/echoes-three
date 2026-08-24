// Chibi party critter factory (BUILD_BRIEF §19.2) — the public API the
// integrator attaches to sim entities:
//
//   const critter = createCritter('healer', { cosmetic });
//   scene.add(critter.group);            // position critter.group per tick
//   critter.setYaw(rad);                 // aim facing (§3: yaw follows aim)
//   critter.setAnim('walk');             // idle|walk|cast|hurt|downed
//   critter.update(dt);                  // render dt seconds — pose + clips
//
// group's origin is the feet on the ground plane. The identity ring + contact
// shadow live outside the animated rig, so they stay grounded through every
// clip (incl. the §10 horizontal collapse, where cloak/prop accents
// desaturate toward charcoal but the ring keeps its exact class hex).
import { Group } from 'three';
import { CLASS_ACCENTS } from '../../data/palette.js';
import { blobShadow, identityRing, desatTarget } from './common.js';
import { createPoseDriver, CLIPS } from './driver.js';
import { buildHealer } from './healer.js';
import { buildTank } from './tank.js';
import { buildSwordsman } from './swordsman.js';
import { buildArcher } from './archer.js';

export { CLIPS };
export const CRITTER_CLASSES = ['healer', 'tank', 'swordsman', 'archer'];

const BUILDERS = {
  healer: buildHealer,
  tank: buildTank,
  swordsman: buildSwordsman,
  archer: buildArcher,
};

const RING_RADIUS = { healer: 0.44, tank: 0.6, swordsman: 0.42, archer: 0.4 };
const FALL_ANGLE = Math.PI / 2 - 0.1; // §10: collapse to horizontal
const FALL_LIFT = 0.22; // keeps the lying body resting on (not in) the ground

export function createCritter(classId, { cosmetic = null } = {}) {
  const build = BUILDERS[classId];
  if (!build) throw new Error(`unknown critter class: ${classId}`);
  const accent = CLASS_ACCENTS[classId];

  const group = new Group();
  group.name = `critter-${classId}`;
  group.add(identityRing(accent, RING_RADIUS[classId]));
  // Blob kept INSIDE the bell footprint: a wider blob's near half sits closer
  // to the camera than the body and renders over the belly at low camera
  // elevations (verified in capture — the Tank read as "inside a dark bowl").
  group.add(blobShadow(RING_RADIUS[classId] * 0.55));

  const yawGroup = new Group();
  group.add(yawGroup);
  const rig = new Group();
  yawGroup.add(rig);

  // Accent-material tracker: every material registered here desaturates
  // toward charcoal while downed (§10) and restores on revive.
  const accentMats = [];
  const trackAccent = (mat) => {
    accentMats.push({ mat, orig: mat.color.clone(), target: desatTarget(mat.color) });
    return mat;
  };

  const built = build(rig, trackAccent);
  const basePitch = built.basePitch ?? 0;
  const driver = createPoseDriver(cosmetic);
  // Fall side alternates so a downed party doesn't stack identically.
  const fallSign = (cosmetic ? cosmetic.chance(0.5) : Math.random() < 0.5) ? 1 : -1;

  let t = 0;
  let lastDesat = -1;

  function update(dt) {
    t += dt;
    const P = driver.update(dt);
    const c = P.collapse;
    const upright = 1 - c;

    rig.scale.set(P.squash, P.breathe, P.squash);
    rig.position.y = P.bob * upright + FALL_LIFT * c;
    rig.rotation.x = (basePitch + P.pitch) * upright;
    rig.rotation.z = P.roll * upright + fallSign * FALL_ANGLE * c;

    built.apply(P, t);

    if (Math.abs(P.desat - lastDesat) > 0.002) {
      lastDesat = P.desat;
      for (const a of accentMats) a.mat.color.copy(a.orig).lerp(a.target, P.desat);
    }
  }

  return {
    classId,
    accent,
    group,
    metrics: built.metrics,
    setAnim: driver.setAnim,
    getAnim: () => driver.anim,
    setYaw: (rad) => {
      yawGroup.rotation.y = rad;
    },
    update,
  };
}
