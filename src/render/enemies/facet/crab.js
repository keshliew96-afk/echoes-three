// WEIR CRAB, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level II foes").
// The classic crab of enemies/slice2.js (a wide low shell on six legs, the
// big right claw and the small left one held up in front as its guard, the
// indigo rims on the claws its one tell) with the sample video's technique
// laid ON TOP of its chibi ink look. What it gains:
//
//   * a faceted carapace cut into planes, with BAKED detail (render/facet/
//     foe.js, one draw call for the crowd): a ring of bone teeth round the
//     front rim, raised plates down the back in the crab's H pattern, a
//     notched brow between short eye stalks with charcoal slit eyes (never
//     round, never warm), mouthparts under the front;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): six jointed legs in two
//     tripods, each tip pinned to the floor while it carries weight, the
//     knees arched high and out the way a crab's are. The sim walks it
//     SIDEWAYS across its target's line (1.9 u/s) while it edges in: the
//     tips step sideways along the real travel, a turn on the spot shuffles
//     round, and the body leans into the scuttle (rule 1);
//   * the two CLAWS as arms of their own: a merus and a carpus to the palm,
//     the fixed finger and a hinged dactyl that opens and shuts, the big
//     claw half again the small one's size. The guard (the sim's
//     e.guard.active: projectiles from the front are blocked) holds both
//     claws up before the face; for the 45 ticks after a snap the guard is
//     down and so are the claws (the archers' window, read from the model);
//   * the SNAP on the sim's 42-tick cone telegraph (sim/enemies/crab.js): the
//     telegraph is the coil (the body rears back and crouches, the claws
//     drawn up and back and gaping), the strike takes its last 2.5 frames and
//     its contact lands on the resolve tick: the body lunged in with its full
//     lean and the contact squash (§6.1 B9, the tips planted), the claws
//     driven down and the dactyls slammed shut on the first frame (B4); held
//     3 frames, a recoil shove (B3), then the snap back and the settle with
//     one overshoot (B5). Repeat snaps cycle the big claw hooking in from its
//     right, the small claw's straight jab, then the finisher, both claws
//     scissoring down together off a hop (§6.1 B6);
//   * the spawn-in grow (B7), named points (B8: the big claw's tip, the
//     small claw's, the mouth), and the hit and death tuning.
//
// Faces +Z. Same contract as buildCrab (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and its guard
// untouched.
import { BoxGeometry, Color, CylinderGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry, PART_INK_PX } from '../../facet/kit.js';
import { ease } from '../../facet/timeline.js';
import { recoil } from '../../facet/beats.js';
import { SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, hornGeometry, namedPoint, placeBody, scaleGeometry, spawnScale } from '../../facet/foe.js';
import { HOLD_SEC, createStrikeClip, strikeAbility, strikePoseAt, strikeTimeline } from '../../facet/foestrike.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// The sim's crab (sim/enemies/crab.js S): scuttles 1.9 u/s sideways; the cone
// telegraph is 42 ticks; the guard is down 45 ticks after the snap.
const TICK_HZ = 60;
const SCUTTLE_SPEED = 1.9;
export const SNAP_TEL_SEC = 42 / TICK_HZ;

// The classic's hides (enemies/slice2.js C.crab, C.crabDark).
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const SHELL = slate(0.32, 0.36).lerp(new Color(PALETTE.bruiseUmber), 0.3);
const DARK = slate(0.36, 0.18);
const BONE = HIDE.bone.clone().multiplyScalar(0.92);

// --- Key poses. push (u, +z), lift (u), pitch (front down +), roll (+ toward
// its right, -x), twist (+ toward its left), sx / sy (squash); per claw (r the
// big right claw, l the small left one): raise (rad, the arm lifted), reach
// (0..1 the arm thrust out), hook (rad, the claw swung across, + inward),
// open (rad, the dactyl's gape).
const REST = Object.freeze({ push: 0, lift: 0, pitch: 0, roll: 0, twist: 0, sx: 1, sy: 1, rRaise: 0, rReach: 0, rHook: 0, rOpen: 0.15, lRaise: 0, lReach: 0, lHook: 0, lOpen: 0.15 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, ...o });
// Snap 1, THE BIG CLAW HOOK: rears back with the big claw cocked high out to
// its right, gaping; it hooks in and down across the front and shuts.
const C1 = K({ push: -0.06, pitch: -0.12, roll: 0.06, twist: -0.18, sx: 0.97, sy: 1.05, rRaise: 0.3, rReach: -0.3, rHook: -0.5, rOpen: 0.45, lRaise: 0.15, lHook: 0.1, lOpen: 0.3 });
const S1 = K({ push: 0.14, pitch: 0.22, roll: -0.05, twist: 0.2, sx: 1.19, sy: 0.91, rRaise: -0.25, rReach: 1, rHook: 0.45, rOpen: -0.05, lRaise: -0.1, lHook: -0.05, lOpen: 0.15 });
const O1 = K({ push: 0.09, pitch: 0.18, twist: 0.26, sx: 1.04, sy: 0.98, rRaise: -0.3, rReach: 0.6, rHook: 0.6, rOpen: 0.1, lRaise: -0.05, lOpen: 0.2 });
// Snap 2, THE SMALL CLAW JAB: the small claw drawn straight back beside the
// eyes, the body turned to lead with it; a straight jab and a snip.
const C2 = K({ push: -0.05, pitch: -0.1, roll: -0.05, twist: 0.2, sx: 0.97, sy: 1.04, lRaise: 0.28, lReach: -0.4, lHook: 0.05, lOpen: 0.5, rRaise: 0.2, rHook: -0.15, rOpen: 0.25 });
const S2 = K({ push: 0.14, pitch: 0.22, roll: 0.04, twist: -0.18, sx: 1.19, sy: 0.91, lRaise: -0.2, lReach: 1, lHook: 0.12, lOpen: -0.05, rRaise: 0.05, rHook: -0.1, rOpen: 0.15 });
const O2 = K({ push: 0.09, pitch: 0.18, twist: -0.24, sx: 1.04, sy: 0.98, lRaise: -0.2, lReach: 0.6, lHook: 0.2, lOpen: 0.1, rRaise: 0.05 });
// Snap 3, THE SCISSOR SLAM (the biggest, §6.1 B6): both claws lifted high and
// wide, gaping, the body rearing off its back legs; it hops in and both
// claws scissor down and shut together.
const C3 = K({ push: -0.07, pitch: -0.14, sx: 0.96, sy: 1.07, rRaise: 0.35, rReach: -0.3, rHook: -0.35, rOpen: 0.45, lRaise: 0.35, lReach: -0.3, lHook: -0.35, lOpen: 0.45 });
const S3 = K({ push: 0.16, lift: 0.04, pitch: 0.26, sx: 1.19, sy: 0.91, rRaise: -0.35, rReach: 1, rHook: 0.55, rOpen: -0.08, lRaise: -0.35, lReach: 1, lHook: 0.55, lOpen: -0.08 });
const O3 = K({ push: 0.1, lift: 0.01, pitch: 0.2, sx: 1.05, sy: 0.97, rRaise: -0.35, rReach: 0.6, rHook: 0.45, rOpen: 0.1, lRaise: -0.35, lReach: 0.6, lHook: 0.45, lOpen: 0.1 });
const SNAPS = [
  { label: 'the big claw hooks in', coil: C1, strike: S1, over: O1 },
  { label: 'the small claw jabs', coil: C2, strike: S2, over: O2 },
  { label: 'scissor slam', coil: C3, strike: S3, over: O3 },
].map((v) => Object.freeze(v));
export const CRAB_REST = REST;
export const CRAB_SNAPS = Object.freeze(SNAPS);
// The guard down (after a snap): both claws lowered to the floor in front.
const GUARD_DOWN = { rRaise: -0.62, lRaise: -0.62, rReach: 0.2, lReach: 0.2, rOpen: 0.2, lOpen: 0.2 };

// The B3 recoil after the held contact: 0.1 u back along the facing.
const RECOIL_U = 0.1;
// a held contact runs this long after the strike lands, then the recoil
const HOLD_T = HOLD_SEC;
// The guard's 45 ticks down after the snap (the lab's stand-in).
const GUARD_OPEN_SEC = 45 / TICK_HZ;

const SNAP_TL = strikeTimeline('snap', 'Snap', {
  tel: SNAP_TEL_SEC,
  rest: GUARD_OPEN_SEC,
  labels: { coil: 'coil (the cone telegraph)', strike: 'snap', hold: 'contact: claws shut', snap: 'snap back', settle: 'settle, guard down' },
});
const CONTACT_AT = SNAP_TL.startOf('hold');
function heldMotion(V, age, out) {
  // B3: a rig-only shove back off the hit, 2 frames out and ~8 back
  out.push -= RECOIL_U * recoil(age - HOLD_T);
}
export function crabSnapPose(v, t, out = { ...REST }) {
  return strikePoseAt(SNAP_TL, SNAPS[v] || SNAPS[0], REST, FIELDS, t, out, heldMotion);
}
const classicSnap = (tt, s) => ({ telegraphK: s.id === 'coil' || s.id === 'strike' ? 1 : 0, lungeK: 0, fireK: 0, e: { snapTick: tt >= CONTACT_AT ? 1 : -1, guard: { active: tt < SNAP_TL.startOf('strike') } } });
export const CRAB_SNAP = strikeAbility({ id: 'snap', label: 'Snap', tl: SNAP_TL, variants: SNAPS, classic: classicSnap });
export const CRAB_SNAPS_STRING = strikeAbility({ id: 'snaps', label: 'Snap string', tl: SNAP_TL, variants: SNAPS, n: 3, gap: SNAP_TL.duration - 0.2, classic: classicSnap });
export const CRAB_ABILITIES = Object.freeze({ snap: CRAB_SNAP, snaps: CRAB_SNAPS_STRING });
// The lab's guard: down from the snap back to the end of its 45 ticks, eased
// in and out (pure in t).
const LOWER_IN = SNAP_TL.startOf('snap');
const LOWER_OUT = SNAP_TL.startOf('strike') + GUARD_OPEN_SEC;
function labLower(t) {
  if (t < LOWER_IN) return 0;
  const up = ease.inOut(Math.min(1, (t - LOWER_IN) / 0.25));
  const back = t > LOWER_OUT ? ease.inOut(Math.min(1, (t - LOWER_OUT) / 0.25)) : 0;
  return up * (1 - back);
}

// --- Geometry (built once for the session, shared by every crab) ------------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const M = (x, y, z, sx = 1, sy = 1, sz = 1, q = new Quaternion()) => new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(sx, sy, sz));
const qa = (ax, ay, az, a) => new Quaternion().setFromAxisAngle(new Vector3(ax, ay, az).normalize(), a);
const SHELL_Y = 0.26;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  // The carapace: the classic's wide low dome, cut into planes, and its
  // flat underside.
  set.shell = bakeParts('crab:shell', () => [
    { geo: fz(new SphereGeometry(0.34, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), 0.16, 601), m: M(0, SHELL_Y - 0.05, 0, 1.35, 0.6, 1) },
    { geo: fz(new SphereGeometry(0.3, 8, 3, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), 0.1, 603), m: M(0, SHELL_Y - 0.02, 0, 1.38, 0.35, 1.02), tone: 0.72 },
  ]);
  // The dark detail: the back's plates in an H, the front rim's teeth (bone
  // tone), the brow notch, the mouthparts.
  set.dark = bakeParts('crab:dark', () => {
    const out = [];
    const plate = scaleGeometry({ sides: 6, seed: 605 });
    const P = [
      [0, 0.12, 0.16, 0.16, 0],
      [-0.17, 0.05, 0.12, 0.15, 0.3],
      [0.17, 0.05, 0.12, 0.15, -0.3],
      [0, -0.08, 0.18, 0.13, 0],
      [-0.2, -0.12, 0.1, 0.12, 0.45],
      [0.2, -0.12, 0.1, 0.12, -0.45],
    ];
    for (const [x, z, w, l, tilt] of P) {
      const y = SHELL_Y + 0.1 - 0.4 * (x * x + z * z);
      out.push({ geo: plate, m: M(x, y, z, w, 0.03, l, qa(z, 0, -x - 1e-3, 0.25 + Math.abs(tilt) * 0.3)), tone: 0.95 });
    }
    // the rim's spines: small wedges round the front edge, raked out
    const wedge = wedgeGeometry();
    for (let i = 0; i < 6; i++) {
      const a = -1.05 + (i / 5) * 2.1;
      const dir = new Vector3(Math.sin(a), 0.25, Math.cos(a) * 0.8).normalize();
      out.push({ geo: wedge, m: new Matrix4().compose(new Vector3(Math.sin(a) * 0.44, SHELL_Y - 0.02, Math.cos(a) * 0.29), new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir), new Vector3(0.07, 0.07, 0.05)), tone: 0.85 });
    }
    // the brow between the eye stalks, the eye stalks, the mouthparts
    out.push({ geo: fz(new BoxGeometry(0.16, 0.05, 0.06), 0.1, 607), m: M(0, SHELL_Y + 0.05, 0.3), tone: 1.1 });
    const stalk = fz(new CylinderGeometry(0.018, 0.024, 0.11, 5).translate(0, 0.055, 0), 0.08, 609);
    for (const s of [-1, 1]) out.push({ geo: stalk, m: M(s * 0.06, SHELL_Y + 0.04, 0.31, 1, 1, 1, qa(0.4, 0, -s * 0.5, 0.35)), tone: 1.2 });
    out.push({ geo: fz(new BoxGeometry(0.12, 0.05, 0.05), 0.12, 611), m: M(0, SHELL_Y - 0.08, 0.3), tone: 0.8 });
    return out;
  });
  // Eyes: slit bars on the stalk tips (unlit charcoal).
  set.eyes = bakeParts('crab:eyes', () => {
    const out = [];
    const bar = fz(new BoxGeometry(0.055, 0.02, 0.02), 0, 1);
    for (const s of [-1, 1]) out.push({ geo: bar, m: M(s * 0.085, SHELL_Y + 0.15, 0.34, 1, 1, 1, qa(0, 0, 1, s * 0.35)) });
    return out;
  });
  // A leg or arm bone: a faceted tapered unit segment (y 0..1).
  set.bone = fz(new CylinderGeometry(0.6, 1, 1, 5).translate(0, 0.5, 0), 0.1, 621);
  // The claw: the palm (its fixed finger forward and down), along +z from
  // the wrist; the dactyl, hinged at the palm's top front, along +z.
  set.palm = bakeParts('crab:palm', () => [
    { geo: fz(new SphereGeometry(0.5, 7, 5), 0.14, 631), m: M(0, 0, 0.36, 0.78, 0.92, 0.95) },
    // the fixed finger: forward off the palm's lower front, curving up
    { geo: hornGeometry({ len: 1, r: 0.22, bend: -0.6, seg: 3, sides: 5, seed: 633 }), m: M(0, -0.1, 0.72, 0.5, 0.55, 0.5, qa(1, 0, 0, Math.PI / 2)), tone: 0.88 },
  ]);
  set.dactyl = hornGeometry({ len: 1, r: 0.22, bend: 0.6, seg: 3, sides: 5, seed: 635 });
  // The tell: an indigo band round each wrist (unlit, bright and dim facets).
  set.band = fz(new TorusGeometry(1, 0.16, 4, 10), 0.25, 641);
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: three each side; 0..2 its left (+x), 3..5 its right. Hips in body
// space, tip homes on the floor (yaw space), the knee's pole (up and out).
const HIPS = [];
const HOMES = [];
const BEND = [];
for (const s of [1, -1]) {
  for (let i = 0; i < 3; i++) {
    const z = 0.12 - i * 0.16;
    HIPS.push(new Vector3(s * 0.34, 0.2, z));
    HOMES.push(new Vector3(s * 0.6, 0, z * 1.3 - 0.02));
    BEND.push(new Vector3(s, 0.7, 0).normalize());
  }
}
const L1 = 0.2;
const L2 = 0.25;
const PIVOT = new Vector3(0, 0.22, 0);
// Arms: shoulders in body space; merus and carpus lengths; size per claw.
const SHOULDER = [new Vector3(-0.2, 0.24, 0.26), new Vector3(0.2, 0.24, 0.26)]; // right (big), left
const BIG = [1.4, 0.95];
const ARM_L = [0.13, 0.11];
const UP = new Vector3(0, 1, 0);
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function buildCrabFacet() {
  const G = geos();
  const F = createFoeFrame('crab');
  const { body, spawn, track } = F;
  const shellMat = track(foeMaterial(SHELL));
  const darkMat = track(foeMaterial(DARK));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
  const bandTint = new Color(TELL_INDIGO);
  void TELL_INDIGO_DIM;
  tellMat.color.copy(bandTint);

  body.add(foePart(G.shell, shellMat, 'full', 'crab-shell'));
  body.add(foePart(G.dark, darkMat, 'part', 'crab-detail'));
  body.add(foePart(G.eyes, eyeMat, false, 'crab-eyes'));
  // the legs (12 bones) and the arms (4 bones) on one row; the palms and the
  // dactyls on rows of two; the wrist bands (the tell) on a row of two
  const bones = instancedPart(G.bone, darkMat, 16, { name: 'crab-bones', moving: true, inkPx: 1.8 });
  const palms = instancedPart(G.palm, shellMat, 2, { name: 'crab-palms', moving: true, inkPx: 2.2 });
  const dactyls = instancedPart(G.dactyl, shellMat, 2, { name: 'crab-dactyls', moving: true, inkPx: PART_INK_PX });
  const bands = instancedPart(G.band, tellMat, 2, { name: 'crab-bands', moving: true, ink: false });
  spawn.add(bones);
  spawn.add(palms);
  spawn.add(dactyls);
  spawn.add(bands);
  F.group.add(groundShadow(0.46, 0.8, { wide: 1.3 }));

  // Named points (B8): the claws' tips, the mouth.
  const tips = [namedPoint(spawn, 'crab-tip', 0, 0.3, 0.6), namedPoint(spawn, 'crab-hand', 0, 0.3, 0.6)];
  const mouth = namedPoint(body, 'crab-mouth', 0, SHELL_Y - 0.08, 0.34);

  const gait = createLegs({ homes: HOMES, groups: [[0, 2, 4], [1, 3, 5]], trigger: 0.09, reach: 0.22, lift: 0.08, durMin: 0.07, durMax: 0.13 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const clip = createStrikeClip({ rest: REST, fields: FIELDS, held: heldMotion });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const m = new Matrix4();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const A = new Vector3();
  const B = new Vector3();
  const C = new Vector3();
  const D = new Vector3();
  const q = new Quaternion();
  const W = new Vector3();
  const H = new Vector3();
  const Zd = new Vector3();
  const Yd = new Vector3();
  const pole = new Vector3();
  let age = -1;
  let yawNow = 0;
  let snaps = 0;
  let lastSnap = null;
  let lowerK = 0; // the claws lowered: the guard down
  let leanW = 1;
  const lifted = [0, 0, 0, 0, 0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: CRAB_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return clip.state === 'rest' ? -1 : (snaps - 1) % 3;
    },
    parts: { body, bones, palms, dactyls },
  };

  function liveSnap(P, now, tick, e) {
    let fired = false;
    if (e) {
      const st = Number.isFinite(e.snapTick) ? e.snapTick : -1;
      if (lastSnap === null) lastSnap = st;
      else if (st !== lastSnap) {
        fired = st >= 0;
        lastSnap = st;
      }
    }
    const beat = watch.update(P);
    clip.update({
      beat,
      tel: watch.telegraph,
      now,
      tick,
      fired,
      pick: () => SNAPS[snaps++ % 3],
      name: () => `snap:${((snaps - 1) % 3) + 1}`,
      out: cur,
    });
    lab.lastStrike = clip.lastStrike;
  }

  // An arm: the wrist placed by the pose (the guard holds it up before the
  // face), the merus and carpus laid by two-bone IK from the shoulder with
  // the elbow out to its side, the palm along its own heading, the dactyl
  // hinged on its top. a 0 the big right claw (-x), 1 the small left.
  function arm(a, raise, reach, hook, open) {
    const s = a === 0 ? -1 : 1;
    const big = BIG[a];
    const l1 = ARM_L[0] * big;
    const l2 = ARM_L[1] * big;
    // the wrist, in body space
    // a reach below 0 draws the claw straight back (never up)
    const out = reach > 0 ? reach : 0;
    W.set(s * 0.25 - s * 0.16 * hook, 0.3 + 0.08 * raise - 0.08 * out, 0.36 - 0.06 * raise + 0.12 * reach + 0.04 * hook);
    A.copy(SHOULDER[a]);
    D.subVectors(W, A);
    const far = (l1 + l2) * 0.97;
    if (D.length() > far) W.copy(A).addScaledVector(D.normalize(), far);
    pole.set(s, -0.35, 0.1);
    solveKnee(A, W, l1, l2, pole, B);
    A.applyMatrix4(body.matrix);
    B.applyMatrix4(body.matrix);
    C.copy(W).applyMatrix4(body.matrix);
    bones.setMatrixAt(12 + a * 2, segmentMatrix(m, A, B, 0.04 * big, 0.04 * big, 0.02));
    bones.setMatrixAt(13 + a * 2, segmentMatrix(m, B, C, 0.036 * big, 0.036 * big, 0.02));
    // the palm's heading: raised up before the face on guard, driven down
    // and forward on the strike, turned in by the hook
    const el = 0.4 + 0.22 * raise - 0.85 * out;
    const hd = -s * (0.12 + 0.55 * hook);
    Z.set(Math.sin(hd) * Math.cos(el), Math.sin(el), Math.cos(hd) * Math.cos(el)).transformDirection(body.matrix);
    X.crossVectors(UP, Z);
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    X.normalize();
    Y.crossVectors(Z, X);
    const sz = 0.23 * big;
    setTRS(m, C, X, Y, Z, sz, sz, sz);
    palms.setMatrixAt(a, m);
    // the dactyl: opened up about the hinge's X
    q.setFromAxisAngle(X, -open);
    Zd.copy(Z).applyQuaternion(q);
    Yd.copy(Y).applyQuaternion(q).negate();
    H.copy(C).addScaledVector(Z, 0.62 * sz).addScaledVector(Y, 0.2 * sz);
    setTRS(m, H, X, Zd, Yd, sz * 0.5, sz * 0.62, sz * 0.5);
    dactyls.setMatrixAt(a, m);
    // the ring round the palm's base (the tell)
    H.copy(C).addScaledVector(Z, 0.16 * sz);
    setTRS(m, H, X, Y, Z, sz * 0.4, sz * 0.4, sz * 0.4);
    bands.setMatrixAt(a, m);
    tips[a].position.copy(C).addScaledVector(Z, 1.0 * sz);
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const tt = P.t ?? 0;
    const e = P.e || null;
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const turntable = !!P.turntable;
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the snap: the lab's pure override, or the live telegraph. The
    // guard down (the sim's 45 ticks after a snap) lowers both claws; it
    // eases in through the snap back and the settle, never a pop
    if (lab.override) {
      const ab = CRAB_ABILITIES[lab.override.id] || CRAB_SNAP;
      const h = ab.at(lab.override.t);
      crabSnapPose(h.v, h.t, cur);
      lowerK = labLower(h.t);
      watch.reset();
      clip.reset();
    } else {
      liveSnap(P, now, tick, e);
      const st = clip.state;
      const busy = st === 'coil' || st === 'strike' || st === 'held' || st === 'snapin';
      const open = !!(e && e.guard && e.guard.active === false);
      const want = !busy && (open || st === 'pull') ? 1 : 0;
      lowerK += (want - lowerK) * Math.min(1, dt * (want ? 7 : 5));
      if (busy) lowerK *= Math.exp(-dt * 20);
    }
    const lower = lowerK;

    // --- feet: locked to the floor, stepping on their own
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / SCUTTLE_SPEED);
    const side = clamp1(lv.x / SCUTTLE_SPEED);

    // --- the body: the snap's pose, the scuttle's bob and its lean (into a
    // sidestep, a touch forward on an advance), a slow breath
    const breath = Math.sin(tt * 2.4);
    leanW += ((clip.state === 'rest' && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 12);
    body.rotation.set(cur.pitch + 0.08 * fwd * leanW, cur.twist, cur.roll - 0.14 * side * leanW + 0.03 * bob * (side >= 0 ? 1 : -1));
    body.scale.set(cur.sx, cur.sy * (1 + 0.012 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, cur.lift + 0.02 * bob);
    body.updateMatrix();

    // --- legs: the hips ride the body, the tips stand where the gait put them
    for (let i = 0; i < 6; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      lifted[i] = liftToReach(hipW, foot, L1, L2);
      if (clampReach(hipW, foot, L1, L2) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, L1, L2, BEND[i], knee);
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.03, 0.03, 0.015));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.024, 0.024, 0.01));
    }
    // --- the claws (the guard's lowering on top of the pose)
    const tremble = 0.03 * Math.sin(tt * 3.1);
    arm(0, cur.rRaise + GUARD_DOWN.rRaise * lower + tremble, cur.rReach + GUARD_DOWN.rReach * lower, cur.rHook, cur.rOpen + (GUARD_DOWN.rOpen - REST.rOpen) * lower + 0.05 * Math.max(0, Math.sin(tt * 1.7)));
    arm(1, cur.lRaise + GUARD_DOWN.lRaise * lower - tremble, cur.lReach + GUARD_DOWN.lReach * lower, cur.lHook, cur.lOpen + (GUARD_DOWN.lOpen - REST.lOpen) * lower + 0.05 * Math.max(0, Math.sin(tt * 1.3 + 1)));
    bones.instanceMatrix.needsUpdate = true;
    palms.instanceMatrix.needsUpdate = true;
    dactyls.instanceMatrix.needsUpdate = true;
    bands.instanceMatrix.needsUpdate = true;
  }
  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    lab,
    modelStandard: true,
    body: F.yaw,
    points: { tip: tips[0], hand: tips[1], mouth },
    // §6.1 item 9: a low wide shell squashes along its height; the flinch
    // bulges at the carapace.
    react: { squash: 1, flinch: 0.9, knock: 0.9, axis: 'y', midY: 0.26 },
    death: { swell: 1, throw: 1 },
  };
}
