// LEGS ON LOCKED FEET (docs/MODEL_STANDARD.md). Two-bone legs that reach the
// feet of a gait (gait.js) by IK, for every legged model of the standard:
// the gait pins each foot to the floor while it carries weight, and this lays
// the thigh (or forearm), the shin (or cannon) and the foot onto it, so a
// planted foot never slides and the knee bends toward its pole.
//
//   legs: [{ home: [x, z], group (gait pair), hip(out) -> the hip in the
//            parent's space this frame, a, b (segment lengths), pole (the
//            knee's bend direction), upper, lower, foot (Object3Ds in the
//            parent: upper and lower run +Y from their joint), footH }]
//
// update(dt, opts) runs the gait (opts as gait.update) and lays every leg;
// `tuck(i, out, k)` (optional) moves foot i toward a held point by k while
// the body is in the air (a leap tucks the paws, which the gait leaves on
// their homes). `state[i]` holds this frame's hip, knee, ankle (end) and how
// far the foot is off the floor (up), for the rig's own dressing.
import { Vector3 } from 'three';
import { createGait, solveTwoBone, aimSegment } from './gait.js';

const _d = new Vector3();
const _t = new Vector3();

export function createLegs({ legs, gait: gaitOpts = {} }) {
  const gait = createGait(
    legs.map((L) => ({ home: L.home, group: L.group, reach: L.a + L.b, hip: L.hip })),
    gaitOpts
  );
  const state = legs.map(() => ({ hip: new Vector3(), knee: new Vector3(), foot: new Vector3(), end: new Vector3(), up: 0 }));
  function update(dt, { tuck = null, air = 0, ...opts }) {
    gait.update(dt, { ...opts, air });
    for (let i = 0; i < legs.length; i++) {
      const L = legs[i];
      const S = state[i];
      L.hip(S.hip);
      S.foot.copy(gait.feet[i].out);
      S.up = gait.feet[i].up;
      if (tuck && air > 0) {
        tuck(i, _t);
        S.foot.lerp(_t, Math.min(1, air));
        S.up = Math.max(S.up, air);
      }
      S.foot.y += L.footH;
      solveTwoBone(S.hip, S.foot, L.a, L.b, L.pole, S.knee);
      aimSegment(L.upper, S.hip, S.knee);
      // the lower segment ends on the foot's top, wherever the IK let it reach
      _d.subVectors(S.foot, S.knee);
      const len = Math.min(L.b, _d.length());
      S.end.copy(S.knee).addScaledVector(_d.normalize(), len);
      aimSegment(L.lower, S.knee, S.end);
      L.foot.position.set(S.end.x, S.end.y - L.footH, S.end.z);
    }
  }
  return { gait, state, update };
}
