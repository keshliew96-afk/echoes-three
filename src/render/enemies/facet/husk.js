// HOLLOW HUSK, MODEL STANDARD (docs/MODEL_STANDARD.md "The Level IV foes").
// The classic husk of enemies/heart.js (a hunched, emaciated husk of a person
// in pale bloodless skin, long arms dangling to its knees, a violet heart
// glowing in an open rib cavity, veins over its back that swell with the
// room's HEARTBEAT) with the sample video's technique laid ON TOP of its
// chibi ink look. What it gains:
//
//   * faceted masses with BAKED detail (render/facet/foe.js, one draw call
//     for the crowd, every tone in one white material's vertex colours): the
//     gaunt torso with its rib cage of bone round the dark cavity, the spine
//     knobs and the hip bones showing through, the collar bones, rags of
//     grave-cloth at the waist; the skull with its slack jaw on its own
//     hinge; bone feet and claw hands;
//   * WORLD-LOCKED FEET (render/facet/foelegs.js): two thin bowed legs laid by
//     two-bone IK onto feet pinned to the floor while they carry weight,
//     stepping along the real travel (the sim's 1.6 u/s stalk, x2.2 in the
//     surge), the hips bobbing on each step and the body leaning into the
//     travel (rule 1);
//   * the ARMS by IK from the shoulders to the claws (rule 3): the claws go
//     where the swipe needs them and the hunched spine twists to drive it;
//   * the HEARTBEAT on the body (sim/enemies/husk.js HEARTBEAT, read off the
//     interpolated tick as the classic does): the veins swell and brighten
//     over the warn window, the heart throbs and the body shudders; through
//     the surge the hunch deepens into the run and the arms trail back;
//   * the BITE on Kesh's 3-hit template (§6.1 B1, B2, B5, B6; the boar's
//     chain, render/facet/foe.js createChain): a contact bite every 48 ticks
//     per target. Hit 1 is a claw swipe cocked to its right and ripped across
//     to its left, hit 2 the backhand from its left, hit 3 the finisher: both
//     claws drawn back high and driven down and forward together, the whole
//     body thrown into it with the deepest squash. An unwarned bite strikes
//     quick (its claw lands 2.5 frames after the damage); once the per-target
//     cooldown says when the next bite comes, the held wind-up pulls back and
//     the chained strike lands ON that tick;
//   * the spawn-in grow (B7), named points (B8: the claws, the mouth, the
//     heart), and the hit and death tuning.
//
// Faces +Z. Same contract as buildHusk (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage untouched.
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Mesh, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { groundShadow } from '../../critters/common.js';
import { markShared } from '../../geocache.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, setTRS, wedgeGeometry } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, createAttackWatch, createChain, createFoeClock, createFoeFrame, foeMaterial, foePart, freshWarp, heldBy, hitPose, hitTimelines, namedPoint, pullBack, spawnScale } from '../../facet/foe.js';
import { clampReach, createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/foelegs.js';
import { HEARTBEAT } from '../../../sim/enemies/husk.js';
import { M, TINT, clamp1, heartGlow, heartbeatK, qa, rodM, veinColor, veinMat } from './heartfoe.js';

// The sim's husk (sim/enemies/husk.js S): 1.6 u/s, x2.2 through the surge;
// a bite every 48 ticks per target while in contact.
const TICK_HZ = 60;
const STALK_SPEED = 1.6;
export const BITE_SEC = 48 / TICK_HZ;
// A bite inside this window of the last one is the next hit of the chain.
export const BITE_WINDOW = 1.25;

// --- Key poses. push: the body's shove along +z (u); crouch: the hips sunk
// (u); lean: the spine's hunch beyond its rest (rad, + forward); twist (+
// toward its left, +x); roll; head: the neck's pitch (+ down); jaw: the jaw
// dropped (0..1); sx / sy: the squash (wide, tall); lx / ly / lz and rx /
// ry / rz: the left and the right claw in yaw space (u).
const REST = Object.freeze({ push: 0, crouch: 0, lean: 0, twist: 0, roll: 0, head: 0, jaw: 0, sx: 1, sy: 1, lx: 0.21, ly: 0.42, lz: 0.2, rx: -0.21, ry: 0.42, rz: 0.2 });
const K = (o) => Object.freeze({ ...REST, ...o });
// Hit 1, THE CLAW SWIPE: the right claw cocked back to its right, ripped
// across the front to its left.
const A1 = K({ push: -0.04, lean: -0.05, twist: -0.25, roll: 0.05, head: -0.1, jaw: 0.3, sx: 0.97, sy: 1.04, lx: 0.22, ly: 0.5, lz: 0.3, rx: -0.4, ry: 0.72, rz: -0.22 });
const P1 = K({ push: -0.07, lean: -0.08, twist: -0.32, roll: 0.07, head: -0.14, jaw: 0.35, sx: 0.96, sy: 1.05, lx: 0.24, ly: 0.52, lz: 0.32, rx: -0.46, ry: 0.8, rz: -0.3 });
const S1 = K({ push: 0.16, lean: 0.3, twist: 0.3, roll: -0.06, head: 0.15, jaw: 0.85, sx: 1.19, sy: 0.91, lx: 0.1, ly: 0.48, lz: 0.08, rx: 0.3, ry: 0.55, rz: 0.6 });
const O1 = K({ push: 0.13, lean: 0.25, twist: 0.36, roll: -0.08, head: 0.1, jaw: 0.5, sx: 1.06, sy: 0.97, lx: 0.12, ly: 0.46, lz: 0.1, rx: 0.4, ry: 0.5, rz: 0.5 });
// Hit 2, THE BACKHAND: the mirror, from its left across to its right.
const A2 = K({ push: -0.04, lean: -0.05, twist: 0.25, roll: -0.05, head: -0.1, jaw: 0.3, sx: 0.97, sy: 1.04, rx: -0.22, ry: 0.5, rz: 0.3, lx: 0.4, ly: 0.72, lz: -0.22 });
const P2 = K({ push: -0.07, lean: -0.08, twist: 0.32, roll: -0.07, head: -0.14, jaw: 0.35, sx: 0.96, sy: 1.05, rx: -0.24, ry: 0.52, rz: 0.32, lx: 0.46, ly: 0.8, lz: -0.3 });
const S2 = K({ push: 0.16, lean: 0.3, twist: -0.3, roll: 0.06, head: 0.15, jaw: 0.85, sx: 1.19, sy: 0.91, rx: -0.1, ry: 0.48, rz: 0.08, lx: -0.3, ly: 0.55, lz: 0.6 });
const O2 = K({ push: 0.13, lean: 0.25, twist: -0.36, roll: 0.08, head: 0.1, jaw: 0.5, sx: 1.06, sy: 0.97, rx: -0.12, ry: 0.46, rz: 0.1, lx: -0.4, ly: 0.5, lz: 0.5 });
// Hit 3, THE DOUBLE RAKE (the biggest, §6.1 B6): both claws drawn back
// high, the spine reared; driven down and forward together, the whole body
// thrown into it, the jaw wide.
const A3 = K({ push: -0.03, crouch: -0.02, lean: -0.15, head: -0.2, jaw: 0.5, sx: 1.04, sy: 0.94, lx: 0.3, ly: 0.86, lz: -0.2, rx: -0.3, ry: 0.86, rz: -0.2 });
const P3 = K({ push: -0.07, crouch: -0.03, lean: -0.22, head: -0.25, jaw: 0.55, sx: 1.07, sy: 0.9, lx: 0.34, ly: 0.92, lz: -0.28, rx: -0.34, ry: 0.92, rz: -0.28 });
const S3 = K({ push: 0.2, crouch: 0.06, lean: 0.6, head: 0.2, jaw: 1, sx: 1.22, sy: 0.88, lx: 0.18, ly: 0.26, lz: 0.64, rx: -0.18, ry: 0.26, rz: 0.64 });
const O3 = K({ push: 0.16, crouch: 0.04, lean: 0.5, head: 0.12, jaw: 0.7, sx: 1.08, sy: 0.96, lx: 0.2, ly: 0.24, lz: 0.56, rx: -0.2, ry: 0.24, rz: 0.56 });
// pull: the NEXT hit's pull-back from this hit's held wind-up
const HITS = [
  { label: 'claw swipe', from: A1, pull: P2, strike: S1, over: O1, next: A2 },
  { label: 'backhand claw', from: A2, pull: P3, strike: S2, over: O2, next: A3 },
  { label: 'the double rake', from: A3, pull: P1, strike: S3, over: O3, next: A1 },
].map((h) => Object.freeze(h));
const HIT_TL = hitTimelines(HITS, BITE_WINDOW, createTimeline);
export const HUSK_REST = REST;
export const HUSK_HITS = Object.freeze(HITS.map((h, i) => Object.freeze({ ...h, timeline: HIT_TL[i] })));
// Pure: bite hit n at t (the probe and the lab).
export function huskHitPose(n, t, from, fresh, pull, out = { ...REST }) {
  return hitPose(HITS, HIT_TL, REST, n, t, from, fresh, pull, out, ease);
}
// An unwarned bite strikes quick: wind-back and strike squeezed into 2.5
// frames, so the claw lands about 1.5 ticks after the damage.
export const HUSK_FRESH_LEAD = 2.5 * FRAME;
// The model lab's bite chain: three bites at the sim's 0.8 s cadence, as the
// game plays them (the boar's shape: the first unwarned, the next two
// predicted from the per-target cooldown, pure in t).
const CONTACT_IN = 3.5 * FRAME;
const CONTACTS = [HUSK_FRESH_LEAD, BITE_SEC, 2 * BITE_SEC];
export const HUSK_BITES = Object.freeze({
  id: 'bites',
  label: 'Bite chain',
  duration: CONTACTS[2] - CONTACT_IN + HIT_TL[2].duration,
  at(t) {
    const n = t < CONTACTS[1] - (CONTACT_IN - FRAME) ? 0 : t < CONTACTS[2] - (CONTACT_IN - FRAME) ? 1 : 2;
    const tt = n === 0 ? freshWarp(t, HUSK_FRESH_LEAD) : t - (CONTACTS[n] - CONTACT_IN);
    const due = n < 2 ? CONTACTS[n + 1] - t : null;
    const s = HIT_TL[n].sample(tt);
    const pull = s.id === 'ready' ? pullBack(due) : 0;
    return { n, t: tt, fresh: n === 0, pull, from: n === 0 ? REST : HITS[n - 1].pull, phase: s.id, label: `${HIT_TL[n].label}: ${s.label}` };
  },
  strikes: CONTACTS,
});
// The lab's heartbeat: one beat of the room's clock, the swell then the
// surge (pure in t; the classic twin is fed the surge mode).
const SWELL_SEC = HEARTBEAT.warn / TICK_HZ;
const SURGE_SEC = HEARTBEAT.surge / TICK_HZ;
const BEAT_TL = createTimeline('beat', 'Heartbeat', [
  { id: 'swell', label: 'the swell: veins brighten, the heart throbs', dur: SWELL_SEC },
  { id: 'surge', label: 'the surge: the run', dur: SURGE_SEC },
  { id: 'rest', label: 'between beats', dur: 0.5 },
], { cues: [{ at: SWELL_SEC, id: 'surge' }] });
export function huskBeatAt(t) {
  const s = BEAT_TL.sample(t);
  if (s.id === 'swell') return { swell: s.k * s.k * (3 - 2 * s.k), surge: 0 };
  if (s.id === 'surge') return { swell: 0, surge: 1 - s.k * s.k * (3 - 2 * s.k) * 0.6 };
  return { swell: 0, surge: 0 };
}
export const HUSK_BEAT = Object.freeze({
  id: 'beat',
  label: 'Heartbeat',
  duration: BEAT_TL.duration,
  sample: (t) => BEAT_TL.sample(t),
  readout: (t) => BEAT_TL.readout(t),
  cues: BEAT_TL.cues,
  classicAt: (t) => ({ telegraphK: 0, lungeK: 0, fireK: 0, e: { mode: BEAT_TL.sample(t).id === 'surge' ? 'surge' : 'stalk', biteTick: -1 } }),
});
export const HUSK_ABILITIES = Object.freeze({ bites: HUSK_BITES, beat: HUSK_BEAT });

// --- Geometry (built once for the session, shared by every husk) -----------
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
const HIP_Y = 0.5;
// the spine's hinge at the hips; the neck in spine space; the shoulders
const NECK_AT = new Vector3(0, 0.57, 0.06);
const SHOULDERS = [new Vector3(0.19, 0.49, 0.02), new Vector3(-0.19, 0.49, 0.02)]; // left (+x), right
const ARM = [0.29, 0.29];
const ELBOW = [new Vector3(1, -0.3, -0.6).normalize(), new Vector3(-1, -0.3, -0.6).normalize()];
const HUNCH = 0.22;
let SET = null;
function geos() {
  if (SET) return SET;
  const set = {};
  const rod = fz(new CylinderGeometry(1, 1, 1, 4).translate(0, 0.5, 0), 0, 1);
  // The torso (about the hips): the gaunt chest, the rib cage of bone round
  // the dark cavity, the spine knobs, the hip and collar bones, the rags.
  set.torso = bakeParts('husk:torso', () => {
    const out = [
      { geo: fz(new IcosahedronGeometry(0.21, 0), 0.14, 1401), m: M(0, 0.27, 0, 0.85, 1.4, 0.68), tint: TINT.ash },
      { geo: fz(new SphereGeometry(0.085, 8, 6), 0.05, 1403), m: M(0, 0.34, 0.12, 1, 1, 0.4), tint: TINT.cavity },
      { geo: fz(new TorusGeometry(0.1, 0.024, 4, 9), 0.08, 1405), m: M(0, 0.34, 0.13), tint: TINT.bone },
      { geo: fz(new CylinderGeometry(0.03, 0.045, 0.12, 5), 0.1, 1407), m: M(0, 0.0, -0.01, 1, 1, 1), tint: TINT.flesh },
    ];
    for (const sd of [-1, 1]) {
      // the ribs off the ring, the hip bones, the collar bones
      out.push({ geo: rod, m: rodM([sd * 0.03, 0.4, 0.16], [sd * 0.17, 0.36, 0.09], 0.014), tint: TINT.bone });
      out.push({ geo: rod, m: rodM([sd * 0.03, 0.31, 0.16], [sd * 0.16, 0.26, 0.08], 0.014), tint: TINT.bone });
      out.push({ geo: rod, m: rodM([sd * 0.04, 0.24, 0.15], [sd * 0.14, 0.2, 0.08], 0.012), tint: TINT.bone });
      out.push({ geo: wedgeGeometry(), m: M(sd * 0.15, 0.04, -0.02, 0.07, 0.1, 0.06, qa(0, 0, 1, sd * 0.4)), tint: TINT.bone, tone: 0.92 });
      out.push({ geo: rod, m: rodM([sd * 0.02, 0.47, 0.1], [sd * 0.17, 0.5, 0.05], 0.012), tint: TINT.bone });
      // rags of grave-cloth hanging from the waist
      for (let i = 0; i < 2; i++) {
        const a = sd * (0.5 + i * 0.9) + 0.3;
        out.push({ geo: wedgeGeometry(), m: M(Math.sin(a) * 0.16, -0.02 - i * 0.03, Math.cos(a) * 0.12, 0.07, 0.16 + 0.04 * i, 0.04, qa(1, 0, 0, Math.PI).multiply(qa(0, 1, 0, a))), tint: TINT.cloth, tone: 1 + 0.1 * i });
      }
    }
    // the spine knobs up the back
    for (let i = 0; i < 4; i++) out.push({ geo: fz(new ConeGeometry(0.035, 0.09, 4), 0.1, 1409 + i), m: M(0, 0.13 + i * 0.09, -0.15 + i * 0.005, 1, 1, 1, qa(1, 0, 0, -0.5)), tint: TINT.bone });
    return out;
  });
  // The skull (about the neck), the slack jaw on its own hinge.
  set.head = bakeParts('husk:head', () => [
    { geo: fz(new IcosahedronGeometry(0.1, 0), 0.12, 1421), m: M(0, 0.06, 0.06, 0.9, 0.95, 1.15), tint: TINT.bone },
    { geo: fz(new BoxGeometry(0.05, 0.03, 0.05), 0.1, 1423), m: M(0, 0.035, 0.16, 1, 1, 1, qa(1, 0, 0, -0.3)), tint: TINT.bone, tone: 0.88 }, // the nose hole's bridge
    { geo: fz(new SphereGeometry(0.028, 5, 4), 0.1, 1425), m: M(0.055, 0.07, 0.14, 1, 1, 0.6), tint: TINT.cavity }, // the sockets
    { geo: fz(new SphereGeometry(0.028, 5, 4), 0.1, 1427), m: M(-0.055, 0.07, 0.14, 1, 1, 0.6), tint: TINT.cavity },
  ]);
  set.jaw = bakeParts('husk:jaw', () => [
    { geo: fz(new BoxGeometry(0.12, 0.035, 0.12), 0.1, 1431), m: M(0, -0.02, 0.05), tint: TINT.flesh },
    { geo: fz(new BoxGeometry(0.1, 0.02, 0.02), 0, 1), m: M(0, 0.0, 0.1), tint: TINT.bone, tone: 0.9 }, // a row of teeth
  ]);
  // The veins (unlit, driven): over the back and the shoulders.
  set.veins = bakeParts('husk:veins', () => [
    { geo: rod, m: rodM([0, 0.06, -0.14], [0.09, 0.3, -0.13], 0.016) },
    { geo: rod, m: rodM([0.09, 0.3, -0.13], [0.19, 0.42, -0.02], 0.014) },
    { geo: rod, m: rodM([0, 0.1, -0.15], [-0.1, 0.34, -0.12], 0.016) },
    { geo: rod, m: rodM([-0.1, 0.34, -0.12], [-0.2, 0.42, 0.0], 0.014) },
    { geo: rod, m: rodM([0.04, 0.3, 0.16], [0.13, 0.45, 0.08], 0.012) },
    { geo: rod, m: rodM([-0.04, 0.3, 0.16], [-0.14, 0.18, 0.12], 0.012) },
    { geo: rod, m: rodM([0.19, 0.42, -0.02], [0.24, 0.3, 0.02], 0.01) },
  ]);
  // The eye slits (unlit, driven; neck space).
  set.eyes = bakeParts('husk:eyes', () => {
    const bar = fz(new BoxGeometry(0.055, 0.026, 0.026), 0, 1);
    return [-1, 1].map((s) => ({ geo: bar, m: M(s * 0.042, 0.075, 0.16, 1, 1, 1, qa(0, 1, 0, s * -0.3).multiply(qa(0, 0, 1, s * 0.45))) }));
  });
  set.heart = fz(new IcosahedronGeometry(0.075, 0), 0.1, 1441);
  // A limb bone (y 0..1, tapering), a bone foot, a claw hand.
  set.bone = fz(new CylinderGeometry(0.78, 1, 1, 5).translate(0, 0.5, 0), 0.08, 1451);
  set.foot = bakeParts('husk:foot', () => {
    const out = [{ geo: fz(new BoxGeometry(0.08, 0.04, 0.14), 0.1, 1453), m: M(0, 0.02, 0.03), tint: TINT.ash, tone: 0.9 }];
    for (let i = -1; i <= 1; i++) out.push({ geo: fz(new ConeGeometry(0.016, 0.07, 4), 0.1, 1455), m: M(i * 0.026, 0.015, 0.12, 1, 1, 1, qa(1, 0, 0, Math.PI / 2)), tint: TINT.bone });
    return out;
  });
  set.hand = bakeParts('husk:hand', () => {
    const out = [{ geo: fz(new IcosahedronGeometry(0.045, 0), 0.1, 1457), m: M(0, -0.02, 0, 1, 0.8, 1.2), tint: TINT.ash, tone: 0.92 }];
    for (let i = -1; i <= 1; i++) out.push({ geo: fz(new ConeGeometry(0.014, 0.1, 4), 0.1, 1459), m: M(i * 0.028, -0.07, 0.03 - Math.abs(i) * 0.02, 1, 1, 1, qa(1, 0, 0, Math.PI + 0.3 * 0)), tint: TINT.bone });
    return out;
  });
  for (const g of Object.values(set)) markShared(g);
  SET = set;
  return set;
}

// Legs: 0 left (+x), 1 right. Hips in body space, feet homes on the floor.
const HIPS = [new Vector3(0.1, HIP_Y, 0), new Vector3(-0.1, HIP_Y, 0)];
const HOMES = [new Vector3(0.11, 0, 0.0), new Vector3(-0.11, 0, 0.0)];
const KNEE = [new Vector3(0.12, 0, 1).normalize(), new Vector3(-0.12, 0, 1).normalize()];
const LEG = [0.27, 0.26];
const ANKLE_Y = 0.04;

export function buildHuskFacet() {
  const G = geos();
  const F = createFoeFrame('husk');
  const { body, spawn, track } = F;
  const mat = track(foeMaterial('#FFFFFF'));
  const veins = veinMat();
  const spine = foePart(G.torso, mat, 'full', 'husk-torso');
  spine.position.set(0, HIP_Y, 0);
  body.add(spine);
  const neck = foePart(G.head, mat, 'full', 'husk-head');
  neck.position.copy(NECK_AT);
  spine.add(neck);
  const jaw = foePart(G.jaw, mat, false, 'husk-jaw');
  jaw.position.set(0, -0.005, 0.06);
  neck.add(jaw);
  const eyes = new Mesh(G.eyes, veins);
  eyes.name = 'husk-eyes';
  neck.add(eyes);
  const veinMesh = new Mesh(G.veins, veins);
  veinMesh.name = 'husk-veins';
  spine.add(veinMesh);
  const heart = new Mesh(G.heart, veins);
  heart.name = 'husk-heart';
  heart.position.set(0, 0.34, 0.15);
  spine.add(heart);
  const glow = heartGlow(0.7, 0.4);
  glow.name = 'husk-heart-glow';
  glow.position.set(0, 0.36, 0.2);
  spine.add(glow);
  // the rows: 8 limb bones (the legs, the arms), 2 feet, 2 claws
  const bones = instancedPart(G.bone, mat, 8, { name: 'husk-bones', moving: true, inkPx: 1.8 });
  for (let i = 0; i < 8; i++) bones.setColorAt(i, i < 4 ? TINT.flesh : TINT.ash);
  const feet = instancedPart(G.foot, mat, 2, { name: 'husk-feet', moving: true, inkPx: 1.5 });
  const hands = instancedPart(G.hand, mat, 2, { name: 'husk-claws', moving: true, inkPx: 1.5 });
  for (const o of [bones, feet, hands]) spawn.add(o);
  F.group.add(groundShadow(0.3, 0.75, { forward: 0.12 }));

  // Named points (B8): the claws, the mouth, the heart.
  const clawL = namedPoint(spawn, 'husk-claw-left', 0.2, 0.4, 0.2);
  const clawR = namedPoint(spawn, 'husk-claw-right', -0.2, 0.4, 0.2);
  const mouth = namedPoint(neck, 'husk-mouth', 0, 0.01, 0.16);
  const heartPt = namedPoint(spine, 'husk-heart-point', 0, 0.34, 0.18);

  const gait = createLegs({ homes: HOMES, groups: [[0], [1]], trigger: 0.08, reach: 0.24, lift: 0.07, durMin: 0.1, durMax: 0.2 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const chain = createChain({ hits: HITS, tls: HIT_TL, rest: REST, window: BITE_WINDOW, ease, freshLead: HUSK_FRESH_LEAD });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const m = new Matrix4();
  const sm = new Matrix4();
  const A = new Vector3();
  const B = new Vector3();
  const C = new Vector3();
  const D = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const strike = { id: '', tick: 0 };
  let age = -1;
  let yawNow = 0;
  let lastBiteAt = -99;
  let lastBiteTick = null;
  let seenContact = null;
  let prevStrike = null;
  let leanW = 1;
  let runK = 0;
  let lean = HUNCH;
  const lifted = [0, 0];
  const gaitOpts = { locked: true };

  const lab = {
    abilities: HUSK_ABILITIES,
    override: null,
    lastStrike: null,
    feet: () => gait.feet().map((p, i) => ({ ...p, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur, run: runK, hunch: lean }),
    get hit() {
      return chain.current;
    },
    parts: { body, spine, neck, jaw, heart, glow, bones },
  };

  // an arm: two-bone IK from the shoulder (spine space) to the claw (yaw space)
  function arm(i, hand, row) {
    C.copy(hand);
    A.copy(SHOULDERS[i]).applyMatrix4(sm);
    D.subVectors(C, A);
    const far = (ARM[0] + ARM[1]) * 0.985;
    if (D.length() > far) C.copy(A).addScaledVector(D.normalize(), far);
    solveKnee(A, C, ARM[0], ARM[1], ELBOW[i], B);
    bones.setMatrixAt(row, segmentMatrix(m, A, B, 0.036, 0.036, 0.015));
    bones.setMatrixAt(row + 1, segmentMatrix(m, B, C, 0.03, 0.03, 0.015));
    // the claw hangs from the wrist, its fingers down the forearm's line
    D.subVectors(C, B).normalize();
    Y.copy(D).negate();
    X.crossVectors(Y, Z.set(0, 0, 1));
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    X.normalize();
    Z.crossVectors(X, Y);
    setTRS(m, C, X, Y, Z, 1, 1, 1);
    hands.setMatrixAt(i, m);
    return C;
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

    // --- the heartbeat: the room's clock on the interpolated tick (the lab's
    // beat tab plays one beat pure in t)
    let swell;
    let surge;
    let surging;
    if (lab.override && lab.override.id === 'beat') {
      const b = huskBeatAt(lab.override.t);
      swell = b.swell;
      surge = b.surge;
      surging = surge > 0;
    } else {
      const b = heartbeatK(Number.isFinite(P.tick) ? tick : tt * TICK_HZ);
      swell = b.swell;
      surge = b.surge;
      surging = e ? e.mode === 'surge' : surge > 0;
    }
    runK += ((surging ? 1 : 0) - runK) * Math.min(1, dt * 10);

    // --- the bites: the lab's pure chain, or the live bites
    let active;
    if (lab.override && lab.override.id === 'bites') {
      const h = HUSK_BITES.at(lab.override.t);
      huskHitPose(h.n, h.t, h.from, h.fresh, h.pull, cur);
      active = true;
      watch.reset();
    } else if (lab.override) {
      Object.assign(cur, REST);
      active = false;
      watch.reset();
      chain.reset();
    } else {
      const beat = watch.update(P);
      // a bite: the layer's lunge pulse, or a new biteTick, whichever first
      let bite = !!(beat && beat.type === 'bite');
      if (e) {
        const bt = Number.isFinite(e.biteTick) ? e.biteTick : -1;
        if (lastBiteTick === null) lastBiteTick = bt;
        else if (bt !== lastBiteTick) {
          if (bt >= 0) bite = true;
          lastBiteTick = bt;
        }
      }
      if (bite && now - lastBiteAt > 3 * FRAME) {
        chain.hit(now);
        lastBiteAt = now;
      }
      const moving = e && Number.isFinite(e.px) ? Math.hypot(e.x - e.px, e.z - e.pz) > 0.01 : (P.moveK ?? 0) > 0.35;
      let due = null;
      if (e && e.cdByTarget && e.targetId != null && now - lastBiteAt < BITE_WINDOW && !moving && !heldBy(e, tick)) {
        const next = e.cdByTarget[e.targetId];
        if (next != null && next > tick) due = (next - tick) / TICK_HZ;
      }
      if (moving && (P.moveK ?? 0) > 0.5) chain.recover(now);
      if (e && heldBy(e, tick) && chain.abort(now)) lab.lastStrike = prevStrike;
      active = chain.pose(now, cur, due);
      if (!active) Object.assign(cur, REST);
      const c = chain.contactAt;
      if (c !== null && c !== seenContact && c >= now - 1e-6) {
        prevStrike = lab.lastStrike ? { ...lab.lastStrike } : null;
        seenContact = c;
        strike.id = `bite:${chain.current + 1}`;
        strike.tick = tick + (c - now) * TICK_HZ;
        lab.lastStrike = strike;
      }
    }

    // --- feet: locked to the floor, a stalk that becomes a run in the surge
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    gaitOpts.locked = !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override);
    gait.update(dt, fr, gaitOpts);
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = clamp1(lv.z / STALK_SPEED);
    const side = clamp1(lv.x / STALK_SPEED);
    leanW += ((!active && !lab.override ? 1 : 0) - leanW) * Math.min(1, dt * 10);

    // --- the hips and the hunch: deeper into the surge, a shudder on the
    // swell; the body leans into the travel (rule 1) and bobs on each step
    const id = e && Number.isFinite(e.id) ? e.id : 0;
    const hunchT = HUNCH + 0.33 * runK + 0.1 * swell;
    lean += (hunchT - lean) * Math.min(1, dt * 10);
    body.position.set(0, -cur.crouch - 0.03 * bob, cur.push);
    body.rotation.set(0.1 * fwd * leanW, 0, -0.06 * side * leanW + cur.roll + 0.03 * swell * Math.sin(tt * 40));
    body.scale.set(cur.sx, cur.sy, cur.sx);
    body.updateMatrix();
    spine.rotation.set(lean + cur.lean, cur.twist, 0.05 * Math.sin(tt * 2.2 + id) * leanW);
    spine.updateMatrix();
    sm.multiplyMatrices(body.matrix, spine.matrix);
    neck.rotation.set(-lean * 0.7 + cur.head, -0.4 * cur.twist, 0);
    jaw.rotation.x = 0.2 + 0.45 * cur.jaw + 0.15 * swell;

    // --- legs: the hips ride the body, the feet stand where the gait put them
    for (let i = 0; i < 2; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += ANKLE_Y;
      lifted[i] = liftToReach(hipW, foot, LEG[0], LEG[1]);
      if (clampReach(hipW, foot, LEG[0], LEG[1]) > 1e-4) {
        gait.release(i);
        lifted[i] = Math.max(lifted[i], 1e-3);
      }
      solveKnee(hipW, foot, LEG[0], LEG[1], KNEE[i], knee);
      bones.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, 0.042, 0.042, 0.015));
      bones.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, 0.032, 0.032, 0.015));
      C.set(foot.x, foot.y - ANKLE_Y, foot.z);
      X.set(1, 0, 0);
      Y.set(0, 1, 0);
      Z.set(0, 0, 1);
      setTRS(m, C, X, Y, Z, 1, 1, 1);
      feet.setMatrixAt(i, m);
    }

    // --- the arms: dangling and swinging loose at rest, trailing back in
    // the surge, driven by the chain's claws
    const swing = 0.12 * Math.min(1, gait.speed / STALK_SPEED) * leanW;
    const sw0 = Math.sin(tt * 4.6) * swing;
    D.set(cur.lx, cur.ly + 0.12 * runK - cur.crouch, cur.lz + sw0 - 0.38 * runK);
    clawL.position.copy(arm(0, D, 4));
    D.set(cur.rx, cur.ry + 0.12 * runK - cur.crouch, cur.rz - sw0 - 0.38 * runK);
    clawR.position.copy(arm(1, D, 6));
    bones.instanceMatrix.needsUpdate = true;
    feet.instanceMatrix.needsUpdate = true;
    hands.instanceMatrix.needsUpdate = true;

    // --- the heartbeat on the body: veins swell, the heart throbs, then flares
    const k = Math.min(1, 0.35 + 0.45 * swell + 0.65 * surge * (surging ? 1 : 0));
    veinColor(veins.color, k);
    const throb = 1 + 0.35 * swell * (0.5 + 0.5 * Math.sin(tt * 22)) + 0.5 * (surging ? surge : 0);
    heart.scale.setScalar(throb);
    glow.material.opacity = 0.28 + 0.35 * swell + 0.42 * (surging ? surge : 0);
    glow.scale.setScalar(0.7 * (1 + 0.5 * swell + 0.6 * (surging ? surge : 0)));
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
    points: { clawL, clawR, mouth, heart: heartPt },
    // §6.1 item 9: a gaunt biped: a full squash and flinch, a long knock
    // (there is nothing to it); the flinch bulges at the chest.
    react: { squash: 1, flinch: 1.1, knock: 1.2, axis: 'y', midY: HIP_Y + 0.4 },
    death: { swell: 0.9, throw: 1.1 },
  };
}
