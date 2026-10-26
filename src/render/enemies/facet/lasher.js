// VINE LASHER, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic
// lasher of enemies/woodmill.js (docs/WOOD_MILL_ENEMIES.md, the Hollow Wood's
// puller, campaign-only from room 3) with the sample video's technique laid ON
// TOP of its chibi ink look: the same bramble seed pod on a splay of roots,
// the same lid split into two toothed jaws over the one indigo tell (the maw),
// the same long thorned whip-vine with a hooked bone tip, the same sage-slate
// hides and charcoal slit eyes. What it gains:
//
//   * faceted masses: the pod is cut into flat planes with a strong value step
//     and a darker underside; the jaws are faceted solid lids;
//   * detail by repetition, BAKED per kind (render/facet/foe.js) so a room of
//     lashers shares one buffer per material: six dark rind ridges at the
//     classic's angles, seven root knots, a band of low husk scales, angry brow plates,
//     ten bone bramble thorns on the ridges, indigo seed spikes in the maw;
//   * WORLD-LOCKED ROOTS (render/facet/foelegs.js): the pod drags itself along on
//     the classic's seven two-bone roots stepping in two sets, a low dark skirt (each drops
//     out of the pod's underside and runs out along the floor to a tip just
//     past the rim), each root tip pinned to the floor while it carries
//     weight, the lean following the real travel (a backpedal off a hero
//     leans back and steps backward);
//   * THE VINE as one instanced chain of eleven tapered segments laid every
//     frame by a forward chain (segmentMatrix with overlap, one draw call plus
//     its ink), a leaf and a thorn baked into each segment and rolled a
//     quarter turn per segment so they spiral, the hooked bone tip on its own;
//   * a 3-LASH CHAIN on its repeating lash (Kesh's combo template): a sweep
//     from its right, a low backhand from its left, then an overhead slam,
//     the biggest, with the highest rear, a stretch and the deepest squash
//     (§6.1 B6). Every coil braces: the two front roots step out while it
//     gathers, so all six are planted under the throw, and step home after
//     the reel. In the throw the hips lead (the pod's twist, shove and lean
//     on an ease-out), the vine's root a tick behind, the curl and the reach
//     last (Kesh's rule 3). Each lash's snap back settles INTO the next
//     lash's coil (the lab plays them back to back; the game cycles them
//     lash to lash);
//   * the spawn-in grow (B7), named points (B8: the hook tip, the vine's
//     root as the hand, the maw), the hit and death tuning (§6.1 items 9, 10).
//
// THE SIM'S LASH (sim/enemies/lasher.js): one attack. With its target inside
// 5 u (cooldown 220 ticks, first after 110) it sets `e.telegraph = { kind:
// 'lane', startTick, resolveTick: start + 48, fromX, fromZ, dirX, dirZ,
// length (<= 5.4, clipped at the walls), width 0.7 }`, holds still and faces
// the lane (`e.mode = 'coil'`); on the resolve tick it ends the telegraph,
// sets `e.lashTick`, emits `lasher_lash`, hits every body in the lane for 9
// and, when it caught a hero, sets `e.yank = { ids, ticksLeft: 12 }` and emits
// `lasher_yank` (each caught hero dragged 1.8 u toward the pod over 12 ticks).
// It never bites or fires (no enemy_bite / enemy_fire). Otherwise it creeps
// at 0.8 u/s, keeping 2.2 to 4.6 u from its target (it backs off a hero that
// comes close).
//
// SYNC. The coil IS the telegraph: sampled on the SHOWN tick (P.tick + 1, the
// tick the entity's fields belong to: the layer passes stateTick - 1 +
// alpha) against the telegraph's own start and resolve (B1). The fast strike
// runs in the telegraph's last 5 ticks (2.5 frames at 30 fps, B2), so the
// whole throw plays and its CONTACT lands on the release frame, the first
// whose state has the telegraph gone (the resolve tick's). It lands only on
// the sim's word: `e.lashTick` at the resolve tick (a stand-in with no
// lashTick: not held by a stun or blind). A stun, blind or retreat that ends
// the telegraph early, or on the resolve tick itself, aborts the throw from
// wherever it got to and takes back lab.lastStrike. Contact puts the vine
// dead straight along the live lane with its hook at the lane's end (the
// lane is read from the telegraph, in the rig's yaw frame, so a yaw still
// turning cannot throw it off the lane). The follow-through then runs on the
// render clock (it pauses in a hitstop): the contact held 2 frames while the
// reel starts with the sim's drag (0.15 u a tick from the contact to the
// last tick of the 12-tick yank: taut and hauling when `e.yank` says a hero
// was caught, the hook first whipping back from the lane's end onto the catch
// in 3 ticks; slack from the lane's end when it whiffed), the snap back in 2.5 frames and the
// settle with one overshoot (B5).
// `lab.lastStrike = { id: 'lash:N', tick }`: the resolve tick, the one the
// contact lands on.
//
// Faces +Z. Same contract as buildLasher (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage untouched.
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Euler, Float32BufferAttribute, IcosahedronGeometry, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, plateGeometry, setTRS, wedgeGeometry, PART_INK_PX } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createAttackWatch, createFoeClock, createFoeFrame, foeMaterial, foePart, heldBy, hornGeometry, lerpFields, namedPoint, placeBody, scaleGeometry, settle, spawnScale } from '../../facet/foe.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';

// --- The sim's numbers (sim/enemies/lasher.js S), read only for timing.
const TEL_TICKS = 48; // the lane telegraph
const YANK_TICKS = 12; // the drag
const YANK_DIST = 1.8; // u a caught hero is dragged
export const LANE_LEN = 5.4; // the lane at full length (the lab's lane)
const CREEP_SPEED = 0.8; // u/s

// --- The lash's timing (seconds). The strike is the last 5 ticks of the
// telegraph (2.5 frames at 30 fps); contact lands on the resolve tick.
const STRIKE_TICKS = 5;
const STRIKE_SEC = STRIKE_TICKS / 60;
const COIL_SEC = TEL_TICKS / 60;
const GATHER_SEC = 0.25; // the coil gathers, then tightens to the throw
const CONTACT_SEC = 2 * FRAME; // held contact (pauses in a hitstop)
const YANK_SEC = YANK_TICKS / 60;
const REEL_SEC = YANK_SEC - CONTACT_SEC; // the reel ends on the sim's yank's last tick
const SNAP_SEC = 2.5 * FRAME; // the snap back
const SETTLE_SEC = 6 * FRAME; // into the next coil, or idle, one overshoot
const FOLLOW_SEC = CONTACT_SEC + REEL_SEC + SNAP_SEC + SETTLE_SEC;
const ABORT_SEC = 0.35; // a cancelled coil falls back to idle
const ABORT_SNAP_SEC = 3 * FRAME; // ...and a cut-short throw's reach snaps back
// The lab plays the three lashes back to back (the sim's cooldown between
// lashes is 220 ticks; the lab skips the creep between them).
const LAB_PERIOD = COIL_SEC + FOLLOW_SEC;
const LAB_REST = 0.3;

// --- Key poses. Body: push (u along +z), pitch (+ leans in, rad), twist (+
// turns toward its left, +x), roll, sx / sy (squash wide / tall), hop (u),
// step (the front roots' brace, 0..1 of BRACE), jaw (the lid's gape,
// rad), tell (the maw's glow, 0..1). Vine: vy / vp (the vine root's yaw and
// pitch, + up), cy / cp (yaw and pitch curl per joint, heavier toward the
// tip; cp + curls up and back), ct (the tip's own curl), vl (length, u),
// reach (0..1: the vine laid dead straight to the lane's end), pull (0..1 of
// the 1.8 u reel), lw (0..1: the vine's frame follows the lane), sw (0..1
// the idle sway). At rest the vine arcs down off the pod's face and its hook
// rests on the floor about 1 u ahead (the classic's short whip).
const REST = Object.freeze({ push: 0, pitch: 0, twist: 0, roll: 0, sx: 1, sy: 1, hop: 0, step: 0, jaw: 0.1, tell: 0, vy: 0, vp: 0, cy: 0, cp: -0.2, ct: 0.5, vl: 0.93, reach: 0, pull: 0, lw: 0, sw: 1 });
const FIELDS = Object.keys(REST);
const K = (o) => Object.freeze({ ...REST, sw: 0, lw: 1, ...o });
// Every coil braces: the two front roots step out (step 1) while the coil
// gathers, so all six are planted under the throw.
// Lash 1, SWEEP: the vine drawn round to its right and wrapped back past the
// pod, raised a little; the pod twists right on its planted roots, rocks back.
const C1 = K({ twist: -0.3, roll: 0.04, pitch: -0.05, step: 1, jaw: 0.42, tell: 0.5, vy: -0.95, vp: 0.3, cy: -0.17, cp: 0.01, ct: 0.08, vl: 1.4 });
const D1 = K({ push: -0.03, twist: -0.46, roll: 0.06, pitch: -0.09, sx: 1.05, sy: 0.93, step: 1, jaw: 0.78, tell: 1, vy: -1.08, vp: 0.34, cy: -0.24, cp: 0.01, ct: 0.12, vl: 1.32 });
// contact: the hips (the pod's twist) carried the swing through to its left
const S1 = K({ push: 0.1, pitch: 0.38, twist: 0.24, roll: -0.05, sx: 1.19, sy: 0.91, step: 1, jaw: -0.06, tell: 0.6, vy: 0.4, vp: 0.05, vl: 1.6, reach: 1 });
// Lash 2, BACKHAND: from its left, low over the floor, back across to its right.
const C2 = K({ twist: 0.3, roll: -0.04, pitch: -0.03, step: 1, jaw: 0.42, tell: 0.5, vy: 0.95, vp: 0.2, cy: 0.17, cp: 0.0, ct: 0.18, vl: 1.4 });
const D2 = K({ push: -0.03, twist: 0.46, roll: -0.06, pitch: -0.06, sx: 1.06, sy: 0.92, step: 1, jaw: 0.78, tell: 1, vy: 1.08, vp: 0.14, cy: 0.24, cp: 0.01, ct: 0.25, vl: 1.32 });
const S2 = K({ push: 0.1, pitch: 0.38, twist: -0.24, roll: 0.05, sx: 1.19, sy: 0.91, step: 1, jaw: -0.06, tell: 0.6, vy: -0.4, vp: 0.02, vl: 1.6, reach: 1 });
// Lash 3, OVERHEAD SLAM (the biggest): the vine rears straight up over the
// pod, the highest wind-up of the three, its tip rolled into a tight
// fiddlehead well above the crown; the pod crouches low on its roots (the
// classic's sink: no daylight under it) and leans back, then slams the vine down the lane with the deepest squash and a drop.
const C3 = K({ pitch: -0.12, sx: 0.99, sy: 1.02, hop: -0.02, step: 1, jaw: 0.5, tell: 0.6, vy: 0, vp: 1.3, cp: 0.03, ct: 0.5, vl: 1.5 });
const D3 = K({ push: -0.03, pitch: -0.2, sx: 0.98, sy: 1.04, hop: -0.05, step: 1, jaw: 0.88, tell: 1, vy: 0, vp: 1.36, cp: 0.04, ct: 0.62, vl: 1.5 });
const S3 = K({ push: 0.12, pitch: 0.44, sx: 1.25, sy: 0.85, hop: -0.03, step: 1, jaw: -0.08, tell: 0.7, vy: 0, vp: -0.4, vl: 1.6, reach: 1 });
// The reel's end, taut (a hero caught: the pod hauls back, its front roots
// stepping back under it, and gapes to take it), and the snap back's
// overshoot (the vine whips up and off to the side the swing carried it to).
const H1 = K({ push: -0.05, pitch: -0.2, twist: 0.12, sx: 0.96, sy: 1.05, step: 0, jaw: 0.5, tell: 0.5, vy: 0.2, vp: 0.1, cp: -0.08, vl: 1.5, reach: 1, pull: 1 });
const H2 = K({ ...H1, twist: -0.12, vy: -0.2 });
const H3 = K({ ...H1, pitch: -0.24, sy: 1.07, hop: 0.02, twist: 0 , vy: 0 });
const O1 = K({ push: -0.02, pitch: -0.05, twist: 0.3, sx: 0.97, sy: 1.04, step: 0, jaw: 0.25, tell: 0.3, vy: 0.75, vp: 0.55, cy: 0.12, cp: 0.08, ct: 0.25, vl: 1.3 });
const O2 = K({ push: -0.02, pitch: -0.04, twist: -0.3, sx: 0.97, sy: 1.04, step: 0, jaw: 0.25, tell: 0.3, vy: -0.75, vp: 0.6, cy: -0.12, cp: 0.08, ct: 0.25, vl: 1.3 });
const O3 = K({ push: -0.03, pitch: -0.1, sx: 0.95, sy: 1.07, hop: 0.02, step: 0, jaw: 0.3, tell: 0.35, vy: 0, vp: 0.85, cp: 0.12, ct: 0.3, vl: 1.3 });
// A whiff's reel: no haul, the vine goes slack and drags back in.
const slack = (h) => K({ ...h, push: 0.05, pitch: 0.12, sx: 1.04, sy: 0.97, jaw: 0.05, tell: 0.3, reach: 0.5, pull: 0.55, cp: -0.12 });
const HITS = [
  { label: 'sweep', gather: C1, coil: D1, strike: S1, haul: H1, slack: slack(H1), over: O1 },
  { label: 'backhand', gather: C2, coil: D2, strike: S2, haul: H2, slack: slack(H2), over: O2 },
  { label: 'overhead slam', gather: C3, coil: D3, strike: S3, haul: H3, slack: slack(H3), over: O3 },
].map((h) => Object.freeze(h));
export const LASHER_REST = REST;
export const LASHER_HITS = HITS;

// The strike's fields ease apart, the way a whip throws (Kesh's rule 3: the
// hips drive the swing): the pod's twist, shove, lean and lift kick first on
// an ease-out; the vine's root follows about a tick behind (B4: the weapon
// kicks on the press frame); the curl unrolls late and the reach to the
// lane's end lands last; the squash and the jaws' clap land on the contact.
const LEAD = ['twist', 'push', 'pitch', 'roll', 'hop', 'step'];
const ROOTV = ['vy', 'vp'];
const LATE = ['cy', 'cp', 'ct', 'vl', 'reach'];
const SQUASH = ['sx', 'sy', 'jaw', 'tell'];
const REST_F = FIELDS.filter((f) => !LEAD.includes(f) && !ROOTV.includes(f) && !LATE.includes(f) && !SQUASH.includes(f));
const VINE_LAG = 0.2; // of the 5-tick throw: the vine's root a tick behind the hips
function strikeLerp(out, a, b, k) {
  const ko = 1 - (1 - k) * (1 - k);
  const kv = Math.max(0, (k - VINE_LAG) / (1 - VINE_LAG));
  const kvo = 1 - (1 - kv) * (1 - kv);
  const ki = k * k;
  const kl = k * k * k;
  for (const f of LEAD) out[f] = a[f] + (b[f] - a[f]) * ko;
  for (const f of ROOTV) out[f] = a[f] + (b[f] - a[f]) * kvo;
  for (const f of LATE) out[f] = a[f] + (b[f] - a[f]) * kl;
  for (const f of SQUASH) out[f] = a[f] + (b[f] - a[f]) * ki;
  for (const f of REST_F) out[f] = a[f] + (b[f] - a[f]) * k;
  return out;
}

// Lash n at a phase: pure (the lab and the live rig share it). `tau` is the
// seconds into the coil (the tremble); `from` the pose the gather starts
// from; `to` where the settle lands (the next lash's coil, or idle).
export function lashPose(n, phase, k, tau, from, to, hauled, out) {
  const H = HITS[n];
  const reelTo = hauled ? H.haul : H.slack;
  switch (phase) {
    case 'gather':
      return lerpFields(out, from, H.gather, ease.inOut(k), FIELDS);
    case 'coil': {
      lerpFields(out, H.gather, H.coil, ease.inOut(k), FIELDS);
      // the coil tightens and trembles with the strain as the throw nears
      const s = k * k;
      out.vy += 0.035 * s * Math.sin(tau * 41);
      out.vp += 0.025 * s * Math.sin(tau * 37 + 1);
      out.jaw += 0.05 * s * Math.sin(tau * 33);
      return out;
    }
    case 'strike':
      return strikeLerp(out, H.coil, H.strike, k);
    case 'contact':
      // held, but the reel starts with the sim's drag on the contact tick:
      // 1.8 u over its 12 ticks, a steady 0.15 u a tick
      lerpFields(out, H.strike, H.strike, 0, FIELDS);
      out.pull = (reelTo.pull * k * CONTACT_SEC) / YANK_SEC;
      return out;
    case 'reel': {
      lerpFields(out, H.strike, reelTo, ease.out(k), FIELDS);
      out.pull = (reelTo.pull * (CONTACT_SEC + k * REEL_SEC)) / YANK_SEC;
      return out;
    }
    case 'snap':
      return lerpFields(out, reelTo, H.over, ease.out(k), FIELDS);
    case 'settle':
      return lerpFields(out, H.over, to, 1 - settle(k), FIELDS);
    default:
      return lerpFields(out, to, to, 0, FIELDS);
  }
}

// The coil's phases for a telegraph `coilSec` long, at `tau` seconds into it.
function coilPhase(tau, coilSec, o) {
  const strikeAt = Math.max(0, coilSec - STRIKE_SEC);
  const gather = Math.min(GATHER_SEC, 0.35 * strikeAt);
  if (tau < gather) {
    o.phase = 'gather';
    o.k = tau / gather;
  } else if (tau < strikeAt) {
    o.phase = 'coil';
    o.k = (tau - gather) / Math.max(1e-6, strikeAt - gather);
  } else {
    o.phase = 'strike';
    o.k = Math.min(1, (tau - strikeAt) / STRIKE_SEC);
  }
  return o;
}
// How far the hook has whipped back onto a catch, `tf` seconds after contact:
// none in the contact's hold, all of it CATCH_SEC into the reel.
function catchAt(tf) {
  const k = Math.min(1, Math.max(0, (tf - CONTACT_SEC) / CATCH_SEC));
  return k * k * (3 - 2 * k);
}
// The follow-through's phases, `tf` seconds after contact.
function followPhase(tf, o) {
  if (tf < CONTACT_SEC) {
    o.phase = 'contact';
    o.k = tf / CONTACT_SEC;
  } else if (tf < CONTACT_SEC + REEL_SEC) {
    o.phase = 'reel';
    o.k = (tf - CONTACT_SEC) / REEL_SEC;
  } else if (tf < CONTACT_SEC + REEL_SEC + SNAP_SEC) {
    o.phase = 'snap';
    o.k = (tf - CONTACT_SEC - REEL_SEC) / SNAP_SEC;
  } else if (tf < FOLLOW_SEC) {
    o.phase = 'settle';
    o.k = (tf - CONTACT_SEC - REEL_SEC - SNAP_SEC) / SETTLE_SEC;
  } else {
    o.phase = 'rest';
    o.k = 1;
  }
  return o;
}

// The lab's readout labels, one timeline per lash.
const LASH_TL = HITS.map((h, n) =>
  createTimeline(`lash${n + 1}`, `Lash ${n + 1}: ${h.label}`, [
    { id: 'gather', label: 'coil gathers (the telegraph)', dur: GATHER_SEC },
    { id: 'coil', label: 'coil tightens (the telegraph)', dur: COIL_SEC - STRIKE_SEC - GATHER_SEC },
    { id: 'strike', label: 'throw', dur: STRIKE_SEC },
    { id: 'contact', label: 'contact on the resolve tick', dur: CONTACT_SEC },
    { id: 'reel', label: 'reel (the yank)', dur: REEL_SEC },
    { id: 'snap', label: 'snap back', dur: SNAP_SEC },
    { id: 'settle', label: n < 2 ? `settle into lash ${n + 2}'s coil` : 'settle into idle', dur: SETTLE_SEC },
  ])
);
const PH_LABEL = { gather: 0, coil: 1, strike: 2, contact: 3, reel: 4, snap: 5, settle: 6 };

// The model lab's lash chain: three lashes, each with its full 48-tick coil,
// back to back (each snap back settles into the next coil), the haul on each.
// Pure in t, so it rewinds.
const STRIKES = [0, 1, 2].map((n) => n * LAB_PERIOD + COIL_SEC);
export const LASHER_LASH = Object.freeze({
  id: 'lash',
  label: 'Lash chain',
  duration: 2 * LAB_PERIOD + COIL_SEC + FOLLOW_SEC + LAB_REST,
  at(t) {
    const n = Math.max(0, Math.min(2, Math.floor(t / LAB_PERIOD)));
    const tau = t - n * LAB_PERIOD;
    const o = { phase: '', k: 0 };
    if (tau < COIL_SEC) coilPhase(tau, COIL_SEC, o);
    else followPhase(tau - COIL_SEC, o);
    const label = o.phase === 'rest' ? 'rest' : `${LASH_TL[n].label}: ${LASH_TL[n].phases[PH_LABEL[o.phase]].label}`;
    return { n, phase: o.phase, k: o.k, tau, from: n === 0 ? 'rest' : `lash${n + 1}`, to: n < 2 ? `lash${n + 2}` : 'rest', label };
  },
  // seconds into the chain where each contact lands (the lab's cues)
  strikes: STRIKES,
  // the game plays wm_lash on lasher_lash and wm_yank on lasher_yank, both on
  // the resolve tick
  cues: STRIKES.flatMap((at) => [
    { at, id: 'strike' },
    { at, id: 'yank' },
  ]),
  // the classic twin's inputs at t: coiled through each telegraph, its lash
  // clip restarted on each contact (a fresh lashTick)
  classicAt(t) {
    const n = Math.max(0, Math.min(2, Math.floor(t / LAB_PERIOD)));
    const tau = t - n * LAB_PERIOD;
    let lashTick = -1;
    for (let i = 0; i < 3; i++) if (t >= STRIKES[i]) lashTick = 1000 + i;
    return { telegraphK: tau < COIL_SEC ? 1 : 0, lungeK: 0, fireK: 0, e: { lashTick, mode: tau < COIL_SEC ? 'coil' : 'creep' } };
  },
});
export const LASHER_ABILITIES = Object.freeze({ lash: LASHER_LASH });
const fromPose = (n) => (n === 0 ? REST : HITS[n].gather);
const toPose = (n) => (n < 2 ? HITS[n + 1].gather : REST);

// --- The classic's hides (enemies/woodmill.js C: same derivation).
const COL = Object.freeze({
  pod: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.5).multiplyScalar(0.95),
  podDark: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.3).multiplyScalar(0.6),
  vine: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.55).multiplyScalar(1.05),
  root: HIDE.boarDark.clone().multiplyScalar(0.9),
  thorn: new Color(PALETTE.bone).multiplyScalar(0.72),
});

// --- Geometry (built once for the session, shared by every lasher) ---------
// The pod: the classic's icosahedron (r 0.3, squashed 0.85 tall) centred
// 0.42 up. A point on it: th from the top (0) to the bottom (π), a round from
// the front (+z) toward its left (+x).
const POD_C = new Vector3(0, 0.42, 0);
const POD_R = new Vector3(0.3, 0.255, 0.3);
function podPoint(th, a, out, nrm, lift = 1) {
  const lx = Math.sin(th) * Math.sin(a);
  const ly = Math.cos(th);
  const lz = Math.sin(th) * Math.cos(a);
  out.set(POD_R.x * lx * lift, POD_R.y * ly * lift, POD_R.z * lz * lift).add(POD_C);
  if (nrm) nrm.set(lx / POD_R.x, ly / POD_R.y, lz / POD_R.z).normalize();
  return out;
}
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1).addScaledVector(Y, -Y.z);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
// A raised rind ridge along a path on a surface (local helper: a triangular
// section, base sunk a hair, crest out along the normal, tapering to points
// at both ends): pts / nrms (Vector3), w(u) half-width, h(u) crest height.
function ridgeGeometry(pts, nrms, w, h) {
  const n = pts.length;
  const L = [];
  const R = [];
  const C = [];
  const T = new Vector3();
  const B = new Vector3();
  for (let j = 0; j < n; j++) {
    T.subVectors(pts[Math.min(n - 1, j + 1)], pts[Math.max(0, j - 1)]).normalize();
    B.crossVectors(nrms[j], T).normalize();
    const u = j / (n - 1);
    const ww = w(u);
    const hh = h(u);
    L.push(pts[j].clone().addScaledVector(B, -ww).addScaledVector(nrms[j], -0.008));
    R.push(pts[j].clone().addScaledVector(B, ww).addScaledVector(nrms[j], -0.008));
    C.push(pts[j].clone().addScaledVector(nrms[j], hh));
  }
  const pos = [];
  const fN = new Vector3();
  const e1 = new Vector3();
  const e2 = new Vector3();
  const tri = (a, b, c, nrm) => {
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    fN.crossVectors(e1, e2);
    if (fN.dot(nrm) < 0) pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    else pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  for (let j = 0; j < n - 1; j++) {
    const nm = nrms[j];
    tri(L[j], C[j], C[j + 1], nm);
    tri(L[j], C[j + 1], L[j + 1], nm);
    tri(C[j], R[j], R[j + 1], nm);
    tri(C[j], R[j + 1], C[j + 1], nm);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}
// A leaf blade (local helper): base at the origin, tip at y 1, width 1 along
// x, a midrib fold raised toward +z so the two halves catch the light apart.
function leafGeometry() {
  const B = [0, 0, 0];
  const T = [0, 1, 0];
  const Lp = [-0.5, 0.42, 0];
  const Rp = [0.5, 0.42, 0];
  const M = [0, 0.45, 0.14];
  const U = [0, 0.45, -0.06];
  const tris = [
    [B, Rp, M], [M, Rp, T], [B, M, Lp], [Lp, M, T],
    [B, Lp, U], [Lp, T, U], [B, U, Rp], [U, T, Rp],
  ];
  const pos = [];
  for (const t of tris) for (const v of t) pos.push(...v);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

// Root angles (from the front toward its left): the classic's seven, set
// symmetric about the vine: one straight back, none straight ahead, a pair
// either side of the vine (roots 0 and 6, the brace).
const ROOT_N = 7;
const ROOT_A = Array.from({ length: ROOT_N }, (_, i) => Math.PI / ROOT_N + (i * 2 * Math.PI) / ROOT_N);
// The rind ridges at the classic's angles: six, one straight down the face
// (it stops above the vine's root), the rest every 60 degrees.
const RIDGE_N = 6;
const RIDGE_A = Array.from({ length: RIDGE_N }, (_, i) => (i * Math.PI) / 3);
// Hips on the pod's underside (body space), root tips on the floor (yaw
// space) just past the pod's rim: a low skirt of roots under the pod, the
// classic's footprint. Each knee bends down and in, under the pod (never out
// and up, so the roots never arch into spider legs), and never below
// KNEE_MIN.
const HIPS = ROOT_A.map((a) => new Vector3(Math.sin(a) * 0.15, 0.21, Math.cos(a) * 0.15));
const HOMES = ROOT_A.map((a) => new Vector3(Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32));
const RL1 = 0.09; // short: the upper bone stays tucked under the pod
const RL2 = 0.27;
const FRONT_ROOTS = [0, ROOT_N - 1]; // the two either side of the vine
const BRACE = 0.04; // u the front roots step out to brace a lash (the coil)
const BRACE_STEP = 0.15; // s: that quick step
const ROOT_R = [0.055, 0.035];
const KNEE_MIN = 0.06; // u: a knee lies on the floor, never in it
const TIP_SINK = 0.015; // a planted root tip sits a hair into the floor
// The vine: eleven links from its root in the pod's face.
const VINE_N = 11;
const VINE_ROOT = new Vector3(0, 0.47, 0.25);
const VINE_R = 0.042;
const VINE_REF = 1.25; // u: the vine's length at its nominal thickness (it thins as it stretches)
const VINE_OVER = 0.012;
const AIM_Y = 0.1; // contact: the hook lands on the floor at the lane's end
// A catch: after the contact's hold at the lane's end the hook whips back
// onto the caught hero and drags from there. The rig cannot see the hero, so
// it takes `P.catchDist` (u from the pod) when the layer gives one, else the
// middle of the band the lasher keeps from its target (2.2 to 4.6 u).
const CATCH_D = 3.4;
const CATCH_SEC = 3 * (1 / 60); // the whip back onto the catch, in the reel's first ticks
const FLOOR_Y = 0.035;
// The jaws' hinges (body space) and the pod's turn pivot.
const JAW_Y = 0.62;
const JAW_SEAM = 0.012; // the lids' hinges, either side of the seam (the classic's)
const PIVOT = new Vector3(0, 0.25, 0);

let SET = null;
function geos() {
  if (SET) return SET;
  const P = new Vector3();
  const N = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const H = new Vector3();
  const m = new Matrix4();
  const wedge = wedgeGeometry();
  const plate = plateGeometry();
  const at = (pos, up, fwd, sx, sy, sz) => {
    basis(H.copy(up), fwd, X, Y, Z);
    return setTRS(m, pos, X, Y, Z, sx, sy, sz).clone();
  };
  const set = {};
  // The pod: the classic's icosahedron, faceted, its underside a value step
  // darker (the roots' shade) and its crown a touch lit.
  {
    const g = fz(new IcosahedronGeometry(0.3, 1).scale(1, 0.85, 1).translate(0, 0.42, 0), 0.14, 301);
    const pos = g.attributes.position;
    const col = g.attributes.color;
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const k = cy < 0.31 ? 0.7 : cy < 0.4 ? 0.84 : cy > 0.6 ? 1.06 : 1;
      for (let j = 0; j < 3; j++) col.setXYZ(i + j, col.getX(i + j) * k, col.getY(i + j) * k, col.getZ(i + j) * k);
    }
    set.pod = g;
  }
  // Dark rind: six ridges down the pod, seven root knots, a band of low
  // husk scales between the ridges, and the brow plates (one draw call).
  set.dark = bakeParts('lasher:dark', () => {
    const out = [];
    for (let i = 0; i < RIDGE_N; i++) {
      const a = RIDGE_A[i];
      const pts = [];
      const nrms = [];
      // the face's ridge runs from the lid down to the brows only
      const span = i === 0 ? 0.1 : 0.6;
      for (let j = 0; j < 6; j++) {
        const th = Math.PI * (0.27 + (span * j) / 5);
        const nrm = new Vector3();
        pts.push(podPoint(th, a, new Vector3(), nrm, 0.995));
        nrms.push(nrm);
      }
      // the classic's six dark stripes, read at play zoom: proud of the rind
      // (crest 0.055 u), 0.07 u across and a value step darker than the rind
      const ridge = ridgeGeometry(pts, nrms, (u) => 0.006 + 0.032 * Math.sin(Math.PI * Math.min(1, u * 1.08)), (u) => 0.006 + 0.052 * Math.sin(Math.PI * Math.min(1, u * 1.08)));
      out.push({ geo: fz(ridge, 0.1, 303 + i), m: null, tone: i % 2 ? 0.66 : 0.72 });
    }
    // a knot where each root leaves the pod (it closes the root's joint)
    for (let i = 0; i < ROOT_N; i++) {
      podPoint(Math.PI * 0.86, ROOT_A[i], P, N, 0.97);
      basis(N, H.set(0, -1, 0), X, Y, Z);
      setTRS(m, P, X, Y, Z, 0.12, 0.075, 0.13);
      out.push({ geo: scaleGeometry({ seed: 311 }), m: m.clone(), tone: 1.05 });
    }
    // husk scales: two rows in each gap, tipped down like a cone's scales
    const husk = scaleGeometry({ sides: 5, seed: 313 });
    for (let i = 0; i < RIDGE_N; i++) {
      const a = RIDGE_A[i] + Math.PI / 6;
      for (const [th, s, tone] of [
        [0.62, 0.11, 1.32],
        [0.76, 0.1, 1.2],
      ]) {
        podPoint(Math.PI * th, a + (th > 0.7 ? 0.08 : -0.08), P, N, 0.975);
        basis(N, H.set(0, -1, 0), X, Y, Z);
        // tip the plate so its lower edge lifts off the rind
        const c = Math.cos(-0.3);
        const sn = Math.sin(-0.3);
        const yx = Y.x * c + Z.x * sn, yy = Y.y * c + Z.y * sn, yz = Y.z * c + Z.z * sn;
        Z.set(Z.x * c - Y.x * sn, Z.y * c - Y.y * sn, Z.z * c - Y.z * sn);
        Y.set(yx, yy, yz);
        X.crossVectors(Y, Z).normalize();
        setTRS(m, P, X, Y, Z, s, 0.04, s * 1.15);
        out.push({ geo: husk, m: m.clone(), tone: tone * (1 + 0.05 * ((i * 3) % 3 - 1)) });
      }
    }
    // brow plates: angled down toward the vine root over each slit eye
    for (const side of [-1, 1]) {
      out.push({ geo: plate, m: at(P.set(side * 0.1, 0.535, 0.262), new Vector3(side * 0.25, 1, 0.9), new Vector3(side * -1, -0.55, 0.3), 0.045, 0.03, 0.11), tone: 0.95 });
    }
    return out;
  });
  // Bone bramble thorns on the ridges, raked up toward the lid.
  set.thorns = bakeParts('lasher:thorns', () => {
    const out = [];
    // (none on the face's short ridge: the vine grows out there)
    for (let i = 1; i < RIDGE_N; i++) {
      for (const [th, h] of [
        [0.45, 0.075],
        [0.64, 0.06],
      ]) {
        podPoint(Math.PI * th, RIDGE_A[i], P, N, 1.06);
        basis(H.copy(N).addScaledVector(new Vector3(0, 1, 0), 0.7), new Vector3(Math.cos(RIDGE_A[i]), 0, -Math.sin(RIDGE_A[i])), X, Y, Z);
        setTRS(m, P, Z, Y, X, h * 0.42, h, h * 0.5);
        out.push({ geo: wedge, m: m.clone(), tone: 0.92 + 0.08 * ((i + (th > 0.5 ? 1 : 0)) % 2) });
      }
    }
    return out;
  });
  // THE corruption tell: the indigo maw between the jaws (bright), with five
  // seed spikes standing in it, bright and dim alternating (one unlit call).
  set.maw = bakeParts('lasher:maw', () => {
    const out = [];
    const bright = new Color(TELL_INDIGO);
    const dim = new Color(TELL_INDIGO_DIM);
    out.push({ geo: fz(new SphereGeometry(0.17, 8, 4), 0.1, 321), m: new Matrix4().compose(new Vector3(0, JAW_Y, 0), new Quaternion(), new Vector3(1.22, 0.4, 1.22)), tint: bright });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      out.push({ geo: wedge, m: at(P.set(Math.sin(a) * 0.075, JAW_Y + 0.03, Math.cos(a) * 0.075), new Vector3(Math.sin(a) * 0.45, 1, Math.cos(a) * 0.45), new Vector3(Math.cos(a), 0, -Math.sin(a)), 0.035, 0.075, 0.04), tint: i % 2 ? dim : bright });
    }
    return out;
  });
  // Charcoal slit eyes (the classic's, unlit: never round, never warm).
  set.eyes = bakeParts('lasher:eyes', () => {
    const out = [];
    const bar = fz(new BoxGeometry(0.08, 0.022, 0.022), 0, 1);
    for (const side of [-1, 1]) out.push({ geo: bar, m: new Matrix4().compose(new Vector3(side * 0.09, 0.48, 0.272), new Quaternion().setFromEuler(new Euler(0, side * -0.3, side * 0.5)), new Vector3(1, 1, 1)) });
    return out;
  });
  // A jaw: a faceted solid lid over its half of the pod's crown (the +x
  // half; the other jaw is the same lid turned half round, the lid being
  // symmetric front to back). It hinges at the SEAM, the classic's way (the
  // lid spans x -0.24..0 locally, the seam at x -0.24), so a gape lifts the
  // outer rims and bares the indigo maw all round under them; the teeth hang
  // from the outer rim, sunk in the crown when shut.
  {
    const pts = [];
    for (let ti = 0; ti <= 3; ti++) {
      const th = (ti / 3) * (Math.PI / 2);
      const ring = ti === 0 ? 1 : 6;
      for (let pi = 0; pi <= ring; pi++) {
        const ph = ti === 0 ? 0 : (pi / ring) * Math.PI;
        pts.push(new Vector3(0.24 * Math.sin(th) * Math.sin(ph) - 0.24, 0.135 * Math.cos(th), 0.24 * Math.sin(th) * Math.cos(ph)));
      }
    }
    for (let pi = 0; pi <= 6; pi++) {
      const ph = (pi / 6) * Math.PI;
      pts.push(new Vector3(0.225 * Math.sin(ph) - 0.24, -0.028, 0.225 * Math.cos(ph)));
    }
    set.jaw = fz(new ConvexGeometry(pts), 0.12, 331);
    set.teeth = bakeParts('lasher:teeth', () => {
      const out = [];
      for (let i = 0; i < 4; i++) {
        // off centre front to back, so the turned jaw's teeth fall between
        const z = -0.15 + i * 0.1;
        const x = -0.24 + Math.sqrt(Math.max(0, 0.225 * 0.225 - z * z)) - 0.012;
        out.push({ geo: wedge, m: at(P.set(x, -0.02, z), new Vector3(-0.35, -1, 0), new Vector3(0, 0, 1), 0.028, 0.06 + 0.014 * (i % 2), 0.032), tone: 0.95 + 0.06 * (i % 2) });
      }
      return out;
    });
  }
  // A root bone: a faceted tapering unit segment (y 0..1), open ended (the
  // joints overlap; the tip stands in the floor, the top in its knot).
  set.root = fz(new CylinderGeometry(0.58, 1, 1, 5, 1, true).translate(0, 0.5, 0), 0.1, 341);
  // A vine link (y 0..1 along the link, radius 1): a tapering five-sided
  // stem with a leaf on one side and a hooked-back thorn on the other, baked
  // in (each link is rolled a quarter turn on the last, so they spiral).
  set.link = bakeParts('lasher:link', () => {
    const out = [];
    out.push({ geo: fz(new CylinderGeometry(0.74, 1, 1, 5, 1, true).translate(0, 0.5, 0), 0.1, 351), m: null });
    // the leaf (local units: x in stem radii, y in link lengths)
    const leaf = new Matrix4().set(0, 2.1, -0.5, 0.92, 0, 0.62, 0.12, 0.3, 1.45, 0, 0, 0, 0, 0, 0, 1);
    out.push({ geo: fz(leafGeometry(), 0.12, 353), m: leaf, tone: 1.18 });
    // the thorn: out the other side, raked back toward the vine's root
    const thorn = new Matrix4().set(0, -1.7, 0, -0.9, 0, -0.32, 0.25, 0.62, 0.75, 0, 0, 0, 0, 0, 0, 1);
    out.push({ geo: wedge, m: thorn, tone: 0.82 });
    return out;
  });
  // The hooked bone tip: a curved, tapering hook with two barbs at its base.
  set.hook = bakeParts('lasher:hook', () => {
    const out = [];
    out.push({ geo: hornGeometry({ len: 1, r: 0.2, bend: 1.7, seg: 3, sides: 4, seed: 361 }), m: new Matrix4().makeScale(0.17, 0.17, 0.17) });
    for (const side of [-1, 1]) out.push({ geo: wedge, m: at(P.set(side * 0.018, 0.02, -0.01), new Vector3(side * 0.9, 0.35, -0.5), new Vector3(0, 1, 0), 0.03, 0.07, 0.035), tone: 0.92 });
    return out;
  });
  // one buffer per part for the whole game (never disposed, geocache.js)
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

const YAXIS = new Vector3(0, 1, 0);
const ZAXIS = new Vector3(0, 0, 1);
const PI_Y = new Quaternion().setFromAxisAngle(YAXIS, Math.PI);
// a quarter roll per vine link about its own axis (the leaves spiral)
const ROLL = [0, 1, 2, 3].map((i) => new Matrix4().makeRotationY((i * Math.PI) / 2));
const wrapPi = (a) => {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};
const smooth01 = (x) => {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
};

export function buildLasherFacet() {
  const G = geos();
  const F = createFoeFrame('lasher');
  const { body, spawn, track } = F;
  const podMat = track(foeMaterial(COL.pod));
  const darkMat = track(foeMaterial(COL.podDark));
  const vineMat = track(foeMaterial(COL.vine));
  // the roots in the pod's underside value (the classic's root hue, darker),
  // so they read as a shadowed skirt, never the brightest mass
  const rootMat = track(foeMaterial(COL.root.clone().multiplyScalar(0.55)));
  const thornMat = track(foeMaterial(COL.thorn));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const mawMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

  body.add(foePart(G.pod, podMat, 'full', 'lasher-pod'));
  body.add(foePart(G.dark, darkMat, 'part', 'lasher-rind'));
  body.add(foePart(G.thorns, thornMat, 'part', 'lasher-thorns'));
  body.add(foePart(G.maw, mawMat, false, 'lasher-maw'));
  body.add(foePart(G.eyes, eyeMat, false, 'lasher-eyes'));
  const tellGlow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.6, opacity: 0.22 });
  tellGlow.material.toneMapped = false;
  tellGlow.material.color.copy(TELL_INDIGO_GLOW);
  tellGlow.position.set(0, 0.72, 0);
  body.add(tellGlow);
  // The jaws (two lids on one instanced row, inked) and their teeth.
  const jaws = instancedPart(G.jaw, podMat, 2, { name: 'lasher-jaws', moving: true, inkPx: 2.4 });
  const teeth = instancedPart(G.teeth, thornMat, 2, { name: 'lasher-teeth', moving: true, inkPx: PART_INK_PX });
  body.add(jaws);
  body.add(teeth);
  // The roots: fourteen bones on one instanced row placed by the root IK.
  const roots = instancedPart(G.root, rootMat, ROOT_N * 2, { name: 'lasher-roots', moving: true, inkPx: 2.0 });
  spawn.add(roots);
  // The vine: eleven links on one instanced row, laid by the chain each frame.
  const vine = instancedPart(G.link, vineMat, VINE_N, { name: 'lasher-vine', moving: true, inkPx: 1.8 });
  spawn.add(vine);
  const hook = foePart(G.hook, thornMat, 'part', 'lasher-hook');
  hook.matrixAutoUpdate = false;
  hook.frustumCulled = false;
  spawn.add(hook);
  // The contact shadow belongs to the floor (the group, not the yaw).
  F.group.add(groundShadow(0.42, 0.75));

  // Named points (B8): the hook's tip (the weapon), the vine's root in the
  // pod's face (the hand that throws it), the maw (the mouth).
  const tipPt = namedPoint(spawn, 'lasher-tip', 0, AIM_Y, 1.6);
  const hand = namedPoint(body, 'lasher-hand', VINE_ROOT.x, VINE_ROOT.y, VINE_ROOT.z);
  const mouth = namedPoint(body, 'lasher-mouth', 0, JAW_Y + 0.02, 0);

  const gait = createLegs({ homes: HOMES, groups: [[0, 2, 5], [1, 3, 4, 6]], trigger: 0.07, reach: 0.18, lift: 0.07, durMin: 0.1, durMax: 0.22 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const cur = { ...REST };
  const capture = { ...REST };
  const abortFrom = { ...REST };
  const ph = { phase: '', k: 0 };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  // the live lash
  let state = 'idle'; // idle | coil | strike | follow | abort
  let lashN = -1; // the lash playing (0..2)
  let lashCount = 0;
  let catchK = 0; // 0..1: the hook moved from the lane's end onto the catch
  let idStart = -1; // the cycle's start (from the entity's id), latched
  function idPhase(e) {
    if (idStart < 0) {
      const id = e && e.id !== undefined && e.id !== null ? String(e.id) : '';
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      idStart = h % 3;
    }
    return idStart;
  }
  let hauled = false;
  let contactNow = 0;
  let abortNow = 0;
  const tel = { start: 0, resolve: 0, dirX: 0, dirZ: 1, length: LANE_LEN };
  const strike = { id: '', tick: 0 };
  const prevStrike = { id: '', tick: 0, set: false };
  let struck = false; // this lash has set lastStrike
  let age = -1;
  let yawNow = 0;
  const lifted = new Array(ROOT_N).fill(0);
  const clamped = new Array(ROOT_N).fill(false); // drawn in to its reach this frame: no weight
  let braced = false; // the front roots stand stepped out for a lash
  // the planner's options, one object for the rig's life
  const gaitOpts = { locked: true, shift: null };
  // scratch
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const bend = new Vector3();
  const root = new Vector3();
  const a0 = new Vector3();
  const a1 = new Vector3();
  const dir = new Vector3();
  const hx = new Vector3();
  const hy = new Vector3();
  const hz = new Vector3();
  const qz = new Quaternion();
  const ONE = new Vector3(1, 1, 1);
  const pos = new Vector3();
  const m = new Matrix4();

  // The model lab drives the lash chain instead of the live telegraph.
  const lab = {
    abilities: LASHER_ABILITIES,
    override: null, // { id: 'lash', t } | null
    lastStrike: null, // { id, tick }: the sim tick the latest live strike's contact lands on
    feet: () => gait.feet().map((f, i) => ({ ...f, planted: f.planted && !clamped[i], drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return state === 'idle' ? -1 : lashN;
    },
    get state() {
      return state;
    },
    parts: { body, jaws, roots, vine, hook },
  };

  // The brace: the two front roots stand stepped out while a lash coils and
  // throws (step 1), and back home for the haul and the creep (step 0).
  function rootShift(i, o) {
    if (i === FRONT_ROOTS[0] || i === FRONT_ROOTS[1]) o.z += BRACE * cur.step;
    return o;
  }
  gaitOpts.shift = rootShift;
  // The front roots step when the brace changes, as a quick step of their own:
  // out once the coil has gathered (they land long before the throw, so all
  // six are planted under it), home once the haul has let go of it.
  function braceSteps() {
    if (!braced && cur.step > 0.95) {
      braced = true;
      for (const i of FRONT_ROOTS) gait.release(i, BRACE_STEP);
    } else if (braced && cur.step < 0.05) {
      braced = false;
      for (const i of FRONT_ROOTS) gait.release(i, BRACE_STEP);
    }
  }

  function setStrike(id, tick) {
    prevStrike.set = lab.lastStrike !== null;
    prevStrike.id = strike.id;
    prevStrike.tick = strike.tick;
    strike.id = id;
    strike.tick = tick;
    lab.lastStrike = strike;
    struck = true;
  }
  function revertStrike() {
    if (!struck) return;
    if (prevStrike.set) {
      strike.id = prevStrike.id;
      strike.tick = prevStrike.tick;
    } else lab.lastStrike = null;
    struck = false;
  }

  // The sim confirms a lash on its resolve tick (`e.lashTick`). A stun, a
  // blind or a room clear landing on that very tick ends the telegraph with no
  // lash (sim/enemies.js resolveEnemies cancels before the lasher resolves),
  // so the rig strikes only on the confirmation; a stand-in with no lashTick
  // (the generic probes) strikes unless the sim holds it.
  function confirmed(e) {
    if (!e) return false;
    if (e.lashTick !== undefined && e.lashTick !== null) return e.lashTick >= tel.resolve;
    return !heldBy(e, tel.resolve);
  }
  function abort(now) {
    revertStrike();
    Object.assign(abortFrom, cur);
    abortNow = now;
    state = 'abort';
  }

  // The live lash from the telegraph and the clock; writes cur.
  function liveLash(P, now, tick, e) {
    const beat = watch.update(P);
    const live = e && e.telegraph;
    if (beat && beat.type === 'wind' && live) {
      // a new lash: the next of the three, from wherever the rig is now.
      // The cycle is the rig's own, started at a place set by the entity's
      // id, so a room of lashers never sweeps in step
      Object.assign(capture, cur);
      lashN = (idPhase(e) + lashCount) % 3;
      lashCount++;
      tel.start = live.startTick ?? tick;
      tel.resolve = live.resolveTick ?? tick + TEL_TICKS;
      const dl = Math.hypot(live.dirX ?? 0, live.dirZ ?? 0);
      tel.dirX = dl > 1e-6 ? live.dirX / dl : Math.sin(yawNow);
      tel.dirZ = dl > 1e-6 ? live.dirZ / dl : Math.cos(yawNow);
      tel.length = live.length ?? LANE_LEN;
      hauled = false;
      struck = false;
      state = 'coil';
    } else if (beat && beat.type === 'cancel' && (state === 'coil' || state === 'strike')) {
      // stunned out of the coil: no strike, fall back to idle
      abort(now);
    }
    if (state === 'coil' || state === 'strike') {
      if (live && live.startTick === tel.start && heldBy(e, tel.resolve)) {
        // a stun or blind the rig can already see (status lands after the
        // enemy phase, the telegraph still up): the lash will not resolve, so
        // stop the whip now rather than throw on into it
        abort(now);
      } else if (!live || live.startTick !== tel.start) {
        // the telegraph is gone: the lash, on the sim's word, or nothing.
        // Contact on the release frame (the part of a tick already past the
        // resolve counts); the follow-through runs on the sim's clock.
        if (confirmed(e)) {
          if (!struck) setStrike(`lash:${lashN + 1}`, tel.resolve);
          contactNow = now - Math.min(FRAME, Math.max(0, tick + 1 - tel.resolve) / 60);
          state = 'follow';
        } else abort(now);
      } else {
        // sampled on the SHOWN tick: the entity is the state one tick past
        // the interpolated tick the layer passes, so the whole 5-tick throw
        // plays and its contact lands on the release frame (on resolveTick)
        const span = Math.max(STRIKE_TICKS + 1, tel.resolve - tel.start);
        const tau = Math.min(span, Math.max(0, tick + 1 - tel.start)) / 60;
        coilPhase(tau, span / 60, ph);
        if (ph.phase === 'strike' && !struck) {
          // the contact's tick: the resolve tick (the throw lands on it)
          setStrike(`lash:${lashN + 1}`, tel.resolve);
          state = 'strike';
        }
        lashPose(lashN, ph.phase, ph.k, tau, capture, REST, false, cur);
        return true;
      }
    }
    if (state === 'follow') {
      if (e && e.yank) hauled = true; // the sim caught a hero: the haul
      followPhase(now - contactNow, ph);
      catchK = hauled ? catchAt(now - contactNow) : 0;
      if (ph.phase === 'rest') state = 'idle';
      else {
        lashPose(lashN, ph.phase, ph.k, 0, capture, REST, hauled, cur);
        return true;
      }
    }
    if (state === 'abort') {
      const k = (now - abortNow) / ABORT_SEC;
      if (k >= 1) state = 'idle';
      else {
        lerpFields(cur, abortFrom, REST, 1 - settle(k), FIELDS);
        // a throw cut short snaps its reach back in 3 frames (a whip that
        // stopped, never a lash that eases home)
        const kr = Math.min(1, (now - abortNow) / ABORT_SNAP_SEC);
        cur.reach = abortFrom.reach * (1 - kr) * (1 - kr);
        return true;
      }
    }
    Object.assign(cur, REST);
    return false;
  }

  function pose(P) {
    const dt = clock.step(P);
    const now = clock.now;
    const e = P.e || null;
    // the sim tick, held through a hitstop (never the raw saw-tooth)
    const tick = Number.isFinite(P.tick) && !P.turntable ? clock.tick : (P.tick ?? 0);
    const turntable = !!P.turntable;
    // B7: grow from the floor (not on the Journal's turntable, nor where the
    // caller says the foe stands grown: the lab)
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));
    const s = F.group.scale.x || 1;

    // --- the lash: the lab's pure override, or the live telegraph
    let laneYaw = 0;
    let laneLen = LANE_LEN / s;
    let swayT = now;
    catchK = 0;
    if (lab.override) {
      const h = LASHER_LASH.at(lab.override.t);
      catchK = h.phase === 'reel' || h.phase === 'snap' || h.phase === 'settle' ? catchAt(CONTACT_SEC + (h.phase === 'reel' ? h.k * REEL_SEC : REEL_SEC)) : 0;
      lashPose(h.n, h.phase, h.k, h.tau, fromPose(h.n), toPose(h.n), true, cur);
      swayT = lab.override.t;
      state = 'idle';
      watch.reset();
    } else {
      liveLash(P, now, tick, e);
      if (state !== 'follow') catchK = 0;
      if (state !== 'idle') {
        laneYaw = wrapPi(Math.atan2(tel.dirX, tel.dirZ) - yawNow);
        laneLen = tel.length / s;
      }
    }

    // --- roots: locked to the floor, stepping on their own
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = s;
    // a lab scrub (no time passing) stands the roots on their homes
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    braceSteps();
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = Math.max(-1, Math.min(1, lv.z / CREEP_SPEED));
    const side = Math.max(-1, Math.min(1, lv.x / CREEP_SPEED));

    // --- the pod: the lash's pose, the roots' bob, the lean along the real
    // travel (it leans into a creep and back off a backpedal), a slow breath
    const ph0 = (e ? e.id : 0) * 1.7;
    const breath = Math.sin(swayT * 2 + ph0);
    const idle = cur.sw;
    body.rotation.set(cur.pitch + 0.1 * fwd * idle, cur.twist, cur.roll - 0.07 * side * idle + 0.03 * bob * (lv.x > 0.05 ? 1 : lv.x < -0.05 ? -1 : 0));
    body.scale.set(cur.sx, cur.sy * (1 + 0.018 * breath * idle), 1 + (cur.sx - 1) * 0.6);
    placeBody(body, PIVOT, cur.push, cur.hop + 0.02 * bob + 0.006 * breath * idle);
    tellGlow.material.opacity = 0.18 + 0.4 * cur.tell + 0.03 * Math.sin(swayT * 2.6);
    body.updateMatrix();

    // --- the jaws: two lids hinged at the seam, the outer rims lifting on
    // a gape (the maw bared round them), clapped shut past zero
    const gape = cur.jaw + 0.03 * idle * Math.sin(swayT * 1.6 + ph0);
    for (let i = 0; i < 2; i++) {
      const sd = i === 0 ? 1 : -1;
      qz.setFromAxisAngle(ZAXIS, sd * gape);
      if (sd < 0) qz.multiply(PI_Y);
      // turn the lid about its seam edge (local x -0.24): place its origin
      // so that edge stays at x = sd * JAW_SEAM
      pos.set(-0.24, 0, 0).applyQuaternion(qz);
      pos.set(sd * JAW_SEAM - pos.x, JAW_Y - pos.y, -pos.z);
      m.compose(pos, qz, ONE);
      jaws.setMatrixAt(i, m);
      teeth.setMatrixAt(i, m);
    }
    jaws.instanceMatrix.needsUpdate = true;
    teeth.instanceMatrix.needsUpdate = true;

    // --- roots: the hips ride the pod, the tips stand where the gait put
    // them (a tip the pod rears out of reach of lifts straight up; one still
    // past its reach is drawn in along the floor and steps at once)
    for (let i = 0; i < ROOT_N; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y -= TIP_SINK;
      lifted[i] = liftToReach(hipW, foot, RL1, RL2);
      clamped[i] = clampReach(hipW, foot, RL1, RL2) > 1e-4;
      if (clamped[i]) gait.release(i);
      // the knee bends down and in, under the pod: each root drops out of
      // the pod's underside and runs out along the floor to its tip (the
      // classic's root fan, a low skirt, never an arched leg)
      bend.set(foot.x - hipW.x, 0, foot.z - hipW.z);
      const bl = bend.length();
      if (bl > 1e-5) bend.multiplyScalar(1 / bl);
      else bend.set(Math.sin(ROOT_A[i]), 0, Math.cos(ROOT_A[i]));
      bend.multiplyScalar(-0.35);
      bend.y = -1;
      solveKnee(hipW, foot, RL1, RL2, bend, knee);
      if (knee.y < KNEE_MIN) knee.y = KNEE_MIN;
      roots.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, ROOT_R[0], ROOT_R[0], 0.02));
      // the lower bone is laid from the floor up: it flares where it grips
      // the ground (the classic's flared root ends) and pinches at the arch
      roots.setMatrixAt(i * 2 + 1, segmentMatrix(m, foot, knee, ROOT_R[1], ROOT_R[1], 0.015));
    }
    roots.instanceMatrix.needsUpdate = true;

    // --- the vine: a chain from its root in the pod's face. Its own shape
    // (root yaw and pitch, the curls) blended by `reach` into the straight
    // line to the lane's end (reeled in by the pull); the pod's twist turns
    // its root (the hips drive the swing), the idle sway rides on top.
    root.copy(VINE_ROOT).applyMatrix4(body.matrix);
    const free = 1 - cur.reach;
    const yaw0 = cur.vy + cur.twist + laneYaw * cur.lw - 0.4 * side * idle;
    const pitch0 = cur.vp - 0.8 * cur.pitch + 0.08 * Math.abs(fwd) * idle;
    const catchLen = Math.min(laneLen, (P.catchDist > 0 ? P.catchDist : CATCH_D) / s);
    const hookLen = laneLen + (catchLen - laneLen) * catchK;
    const aimD = Math.max(0.9 / s, hookLen - (YANK_DIST / s) * cur.pull) - 0.06;
    const ax = Math.sin(laneYaw) * aimD - root.x;
    const ay = AIM_Y - root.y;
    const az = Math.cos(laneYaw) * aimD - root.z;
    const ahd = Math.hypot(ax, az);
    const aimYaw = Math.atan2(ax, az);
    const aimPitch = Math.atan2(ay, ahd);
    const aimLen = Math.hypot(ahd, ay);
    let yw = yaw0 + wrapPi(aimYaw - yaw0) * cur.reach;
    let pt = pitch0 + (aimPitch - pitch0) * cur.reach;
    const len = cur.vl + (aimLen - cur.vl) * cur.reach;
    const seg = len / VINE_N;
    const thin = Math.max(0.55, Math.min(1.1, Math.pow(VINE_REF / Math.max(0.05, len), 0.3)));
    a0.copy(root);
    for (let i = 0; i < VINE_N; i++) {
      if (i > 0) {
        const u = i / (VINE_N - 1);
        const w = 0.55 + 0.9 * u;
        const tipW = smooth01((u - 0.55) / 0.45);
        yw += free * (cur.cy * w + idle * 0.07 * Math.sin(swayT * 1.9 - i * 0.55 + ph0));
        pt += free * (cur.cp * w + cur.ct * tipW + idle * 0.05 * Math.sin(swayT * 2.3 - i * 0.7 + ph0));
      }
      const c = Math.cos(pt);
      dir.set(c * Math.sin(yw), Math.sin(pt), c * Math.cos(yw));
      a1.copy(a0).addScaledVector(dir, seg);
      if (a1.y < FLOOR_Y) a1.y = FLOOR_Y; // it lies along the floor, never under it
      const r = VINE_R * (1 - (0.45 * i) / (VINE_N - 1)) * thin;
      segmentMatrix(m, a0, a1, r, r, VINE_OVER);
      m.multiply(ROLL[i % 4]);
      vine.setMatrixAt(i, m);
      if (i < VINE_N - 1) a0.copy(a1);
    }
    vine.instanceMatrix.needsUpdate = true;
    // the hook: on along the last link, curling toward the floor
    hy.subVectors(a1, a0);
    if (hy.lengthSq() < 1e-10) hy.copy(dir);
    hy.normalize();
    basis(hy, hz.set(0, -1, 0).addScaledVector(dir, 0.0001), hx, hy, hz);
    setTRS(hook.matrix, a1, hx, hy, hz, thin * 0.95 + 0.05, thin * 0.95 + 0.05, thin * 0.95 + 0.05);
    hook.matrixWorldNeedsUpdate = true;
    tipPt.position.copy(a1).addScaledVector(hy, 0.1).addScaledVector(hz, 0.06);
  }

  return {
    group: F.group,
    mats: F.mats,
    setYaw: (r) => {
      yawNow = r;
      F.yaw.rotation.y = r;
    },
    pose,
    // the node the shared hit envelope wraps: everything that moves (spawn >
    // pod, roots, vine); the contact shadow stays on the group, on the floor
    body: F.yaw,
    lab,
    modelStandard: true,
    points: { tip: tipPt, hand, mouth },
    // The shared hit envelope's tuning (§6.1 item 9): a pod on planted roots
    // squashes along its upright axis, flinches a touch less than a beast and
    // barely knocks back (its roots hold it); the flinch bulges mid-pod.
    react: { squash: 0.9, flinch: 0.85, knock: 0.5, axis: 'y', midY: 0.42 },
    // §6.1 item 10: the seed pod swells before it bursts; rooted, it is
    // thrown less far than a beast.
    death: { swell: 1.15, throw: 0.55 },
  };
}
