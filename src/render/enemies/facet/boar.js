// THORN BOAR, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"). The classic
// boar of enemies/boar.js (BUILD_BRIEF §11 melee rusher, §19.2 boar wedge)
// with the sample video's technique laid ON TOP of its chibi ink look: the
// same charging wedge, slate hide, pale belly, bone tusks, charcoal slit eyes
// and the one indigo tell (the thorn ridge). What it gains:
//
//   * faceted masses: the hide is cut into flat planes, each with its own
//     value step, so the toon light bands plane by plane;
//   * detail by repetition, BAKED per kind (render/facet/foe.js) so a room of
//     boars shares one buffer and the draw calls stay under the classic rig's:
//     a bristle mane in two rows flanking the thorns, thick hide plates over
//     the shoulders and haunches, a brow ridge, curved two-piece tusks with
//     lower canines, split hooves, a tail tuft;
//   * WORLD-LOCKED FEET (render/facet/legs.js): a trot in diagonal pairs, each
//     hoof pinned to the floor while it carries weight, two-bone legs (front
//     knees forward, hocks back), the bob and roll from the steps, the lean
//     following the travel in the boar's own frame;
//   * a 3-HIT GORE on its repeating bite (Kesh's combo template): a hook from
//     its right across to its left, a backhand hook back across, then a low
//     scoop and a heaving toss with a stretch and a hop. Each hit's snap back
//     settles into the next hit's wind-up; the strike lunges into contact
//     (§6.1 B9: pull back, a lunge step the front hooves step into, the lean
//     and the contact squash), and a chained bite's pull-back starts four
//     frames before the bite is due (the sim's per-target cooldown says when);
//   * the spawn-in grow (B7), named points (B8: the tusk tip, the snout), and
//     the hit and death tuning the shared envelope reads (§6.1 items 9, 10).
//
// Faces +Z. Same contract as buildBoar (group, mats, setYaw, pose) plus lab,
// react, death, points. Render only: the sim, its timing and damage untouched.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Group, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import { PALETTE } from '../../../data/palette.js';
import { exactColor, groundShadow } from '../../critters/common.js';
import { makeGlowSprite } from '../../glow.js';
import { markShared } from '../../geocache.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM, TELL_INDIGO_GLOW } from '../style.js';
import { facetize } from '../../facet/material.js';
import { instancedPart, plateGeometry, setTRS, wedgeGeometry, PART_INK_PX } from '../../facet/kit.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { FRAME, SPAWN_SEC, bakeParts, hornGeometry, pullBack, scaleGeometry, createAttackWatch, createChain, createFoeClock, createFoeFrame, foeMaterial, foePart, hitPose, hitTimelines, namedPoint, placeBody, spawnScale } from '../../facet/foe.js';
import { createLegs, liftToReach, segmentMatrix, solveKnee } from '../../facet/legs.js';

// The sim's boar (sim/enemies.js ENEMY_STATS.boar): a bite every 48 ticks per
// target while in contact; 2.0 u/s.
export const BITE_SEC = 48 / 60;
const RUN_SPEED = 2.0;
// A bite inside this window of the last one is the next hit of the gore.
export const GORE_WINDOW = 1.25;

// --- Key poses. push: the body's shove along +z (u); pitch: nose down (+)
// or up (-), rad; twist: the body's turn (+ toward its left, +x); roll; hy /
// hp: the head's turn and dip; sx / sy: the body's squash (wide, tall); step:
// the front hooves' lunge step (0..1 of 0.16 u); hop: the body's lift (u).
// The lean toward the target is the body's pitch plus the head's dip (about
// 23° at the tusks on a hook).
const REST = Object.freeze({ push: 0, pitch: 0, twist: 0, roll: 0, hy: 0, hp: 0, sx: 1, sy: 1, step: 0, hop: 0 });
const K = (o) => Object.freeze({ ...REST, ...o });
// Hit 1, HOOK: tusks cocked to the boar's right (-x), ripped across to its left.
const A1 = K({ push: -0.04, pitch: 0.04, twist: -0.22, roll: 0.05, hy: -0.5, hp: 0.28, sx: 0.97, sy: 1.04 });
const P1 = K({ push: -0.07, pitch: 0.06, twist: -0.3, roll: 0.07, hy: -0.62, hp: 0.36, sx: 0.96, sy: 1.05 });
const S1 = K({ push: 0.16, pitch: 0.22, twist: 0.2, roll: -0.06, hy: 0.55, hp: 0.18, sx: 1.19, sy: 0.91, step: 1 });
const O1 = K({ push: 0.13, pitch: 0.18, twist: 0.3, roll: -0.08, hy: 0.72, hp: 0.06, sx: 1.06, sy: 0.97, step: 1 });
// Hit 2, BACKHAND: from its left, low, hooked back across to its right.
const A2 = K({ push: -0.03, pitch: 0.05, twist: 0.24, roll: -0.05, hy: 0.52, hp: 0.3, sx: 0.97, sy: 1.04, step: 0.4 });
const P2 = K({ push: -0.07, pitch: 0.07, twist: 0.3, roll: -0.07, hy: 0.62, hp: 0.38, sx: 0.96, sy: 1.05, step: 0.2 });
const S2 = K({ push: 0.16, pitch: 0.22, twist: -0.22, roll: 0.06, hy: -0.56, hp: 0.18, sx: 1.19, sy: 0.91, step: 1 });
const O2 = K({ push: 0.13, pitch: 0.18, twist: -0.32, roll: 0.08, hy: -0.72, hp: 0.06, sx: 1.06, sy: 0.97, step: 1 });
// Hit 3, TOSS: the head scoops low and square, then heaves up with a stretch
// and a hop that lifts the front hooves (the biggest hit, §6.1 B6).
const A3 = K({ push: -0.02, pitch: 0.16, twist: -0.04, hy: -0.06, hp: 0.5, sx: 1.04, sy: 0.94, step: 0.4 });
const P3 = K({ push: -0.07, pitch: 0.2, hy: 0, hp: 0.6, sx: 1.07, sy: 0.9, step: 0.2 });
const S3 = K({ push: 0.16, pitch: -0.24, hy: 0, hp: -0.55, sx: 0.9, sy: 1.14, step: 1, hop: 0.05 });
const O3 = K({ push: 0.14, pitch: -0.3, hy: 0, hp: -0.65, sx: 0.92, sy: 1.12, step: 1, hop: 0.065 });
// pull: the NEXT hit's pull-back from this hit's held wind-up
const HITS = [
  { label: 'hook', from: A1, pull: P2, strike: S1, over: O1, next: A2 },
  { label: 'backhand hook', from: A2, pull: P3, strike: S2, over: O2, next: A3 },
  { label: 'toss', from: A3, pull: P1, strike: S3, over: O3, next: A1 },
].map((h) => Object.freeze(h));
const HIT_TL = hitTimelines(HITS, GORE_WINDOW, createTimeline);
export const BOAR_REST = REST;
export const BOAR_HITS = Object.freeze(HITS.map((h, i) => Object.freeze({ ...h, timeline: HIT_TL[i] })));
// Pure: gore hit n at t (the probe and the lab).
export function boarHitPose(n, t, from, fresh, pull, out = { ...REST }) {
  return hitPose(HITS, HIT_TL, REST, n, t, from, fresh, pull, out, ease);
}

// The model lab's gore: three bites at the sim's 0.8 s cadence, as the game
// plays them. The first bite is unwarned: its contact lands 3.5 frames after
// it. The next two are predicted from the per-target cooldown: each pulls
// back over 4 frames, then strikes early, so its contact lands ON the bite
// (pure in t, so it rewinds).
const CONTACT_IN = 3.5 * FRAME;
const CONTACTS = [CONTACT_IN, BITE_SEC, 2 * BITE_SEC];
export const BOAR_GORE = Object.freeze({
  id: 'gore',
  label: 'Gore combo',
  duration: CONTACTS[2] - CONTACT_IN + HIT_TL[2].duration,
  at(t) {
    // a chained hit enters at its strike, 2.5 frames before its contact
    const n = t < CONTACTS[1] - (CONTACT_IN - FRAME) ? 0 : t < CONTACTS[2] - (CONTACT_IN - FRAME) ? 1 : 2;
    const tt = t - (CONTACTS[n] - CONTACT_IN);
    const due = n < 2 ? CONTACTS[n + 1] - t : null;
    const s = HIT_TL[n].sample(tt);
    const pull = s.id === 'ready' ? pullBack(due) : 0;
    return { n, t: tt, fresh: n === 0, pull, from: n === 0 ? REST : HITS[n - 1].pull, phase: s.id, label: `${HIT_TL[n].label}: ${s.label}` };
  },
  // seconds into the combo where each strike's contact lands (the lab's cues)
  strikes: CONTACTS,
});
export const BOAR_ABILITIES = Object.freeze({ gore: BOAR_GORE });

// --- Geometry (built once for the session, shared by every boar) ------------
const BODY_C = new Vector3(0, 0.4, -0.04);
const BODY_R = 0.3;
const BODY_S = new Vector3(1.0, 0.78, 1.5);
const tiltM = new Matrix4().makeRotationX(-0.09); // shoulders up, rump down
// A point on the hide (and its outward normal): u -1 (rump) .. 1 (shoulder),
// v round from the top (0) to the flank (±π/2).
function hide(u, v, out, nrm, lift = 1) {
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  const a = BODY_R * BODY_S.x;
  const b = BODY_R * BODY_S.y;
  const c = BODY_R * BODY_S.z;
  const lx = a * Math.sin(v) * r;
  const ly = b * Math.cos(v) * r;
  const lz = c * u;
  out.set(lx * lift, ly * lift, lz * lift).applyMatrix4(tiltM).add(BODY_C);
  if (nrm) nrm.set(lx / (a * a), ly / (b * b), lz / (c * c)).applyMatrix4(tiltM).normalize();
  return out;
}
const fz = (g, jitter, seed) => facetize(g, { jitter, seed });
// An orthonormal frame: Y along `up`, Z as near `fwd` as it can be.
function basis(up, fwd, X, Y, Z) {
  Y.copy(up).normalize();
  Z.copy(fwd).addScaledVector(Y, -fwd.dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(0, 0, 1);
  Z.normalize();
  X.crossVectors(Y, Z).normalize();
}
// Tip Y toward Z by angle a (a plate's trailing edge lifts, a bristle rakes).
function tip(X, Y, Z, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const yx = Y.x * c + Z.x * s, yy = Y.y * c + Z.y * s, yz = Y.z * c + Z.z * s;
  Z.set(Z.x * c - Y.x * s, Z.y * c - Y.y * s, Z.z * c - Y.z * s);
  Y.set(yx, yy, yz);
  X.crossVectors(Y, Z).normalize();
}

let SET = null;
function geos() {
  if (SET) return SET;
  {
    const P = new Vector3();
    const N = new Vector3();
    const X = new Vector3();
    const Y = new Vector3();
    const Z = new Vector3();
    const H = new Vector3();
    const m = new Matrix4();
    const wedge = wedgeGeometry();
    const plate = plateGeometry();
    const scale = scaleGeometry({ seed: 115 });
    const tusk = hornGeometry({ len: 1, r: 0.2, bend: 1.15, seg: 3, sides: 5, seed: 117 });
    const at = (pos, up, fwd, sx, sy, sz) => {
      basis(H.copy(up), fwd, X, Y, Z);
      return setTRS(m, pos, X, Y, Z, sx, sy, sz).clone();
    };
    const set = {};
    // Hide: the wedge mass, cut into planes with a strong value step.
    set.body = fz(new SphereGeometry(BODY_R, 9, 6).scale(BODY_S.x, BODY_S.y, BODY_S.z).applyMatrix4(tiltM).translate(BODY_C.x, BODY_C.y, BODY_C.z), 0.16, 101);
    // Dark hide: the chest, the bristle mane, the shoulder and haunch plates,
    // the tail tuft (one draw call for the crowd).
    set.dark = bakeParts('boar:dark', () => {
      const out = [];
      out.push({ geo: fz(new SphereGeometry(0.2, 7, 5), 0.12, 103), m: new Matrix4().compose(new Vector3(0, 0.42, 0.28), new Quaternion(), new Vector3(1.05, 1, 1.05)) });
      // bristle mane: two rows flanking the thorn ridge, raked toward the
      // rump, the tallest over the shoulders
      const BR = 13;
      for (let i = 0; i < BR; i++) {
        const u = 0.78 - (1.5 * i) / (BR - 1);
        for (const side of [-1, 1]) {
          hide(u, side * (0.2 + 0.04 * (i % 2)), P, N, 0.97);
          basis(N, H.set(0, -0.35, -1), X, Y, Z);
          tip(X, Y, Z, 0.75);
          const h = (0.075 + 0.05 * Math.max(0, u)) * (1 - 0.15 * (i % 2));
          setTRS(m, P, X, Y, Z, h * 0.42, h, h * 0.55);
          out.push({ geo: wedge, m: m.clone(), tone: 0.9 + 0.05 * ((i * 7 + (side > 0 ? 3 : 0)) % 5) });
        }
      }
      // hide plates: low six-sided scales, two over each shoulder and two
      // over each haunch, half sunk in the hide, the trailing edge lifting
      const PL = [
        [0.46, 0.98, 0.17, 0.19],
        [0.18, 1.12, 0.15, 0.17],
        [-0.36, 1.06, 0.15, 0.16],
        [-0.6, 0.92, 0.12, 0.13],
      ];
      PL.forEach(([u, v, w, l], j) => {
        for (const side of [-1, 1]) {
          hide(u, side * v, P, N, 0.985);
          basis(N, H.set(0, 0, 1), X, Y, Z);
          tip(X, Y, Z, -0.22);
          setTRS(m, P, X, Y, Z, w, 0.05, l);
          out.push({ geo: scale, m: m.clone(), tone: j % 2 ? 0.92 : 1.0 });
        }
      });
      // a stub tail tuft at the rump
      hide(-0.98, 0.5, P, N, 1.0);
      out.push({ geo: wedge, m: at(P, new Vector3(0, 0.45, -1), new Vector3(0, 1, 0), 0.05, 0.12, 0.04) });
      return out;
    });
    // Belly: the pale cool underside (its value break reads at play zoom).
    set.belly = fz(new SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45).scale(1.15, 0.8, 1.9).translate(0, 0.36, -0.02), 0.08, 105);
    // Head: the skull wedge, a brow plate over each eye, the notched ears.
    set.skull = bakeParts('boar:skull', () => {
      const out = [];
      out.push({ geo: fz(new ConeGeometry(0.19, 0.5, 6), 0.12, 107), m: new Matrix4().compose(new Vector3(0, -0.08, 0.14), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2 + 0.5), new Vector3(1, 1, 0.92)) });
      for (const side of [-1, 1]) {
        out.push({ geo: plate, m: at(P.set(side * 0.085, 0.045, 0.1), new Vector3(side * 0.35, 1, 0.45), new Vector3(0, -0.45, 1), 0.11, 0.04, 0.09), tone: 0.9 });
        out.push({ geo: wedge, m: at(P.set(side * 0.13, 0.11, -0.06), new Vector3(side * 0.6, 1, -0.35), new Vector3(0, 0.3, 1), 0.12, 0.14, 0.1), tone: 1.04 });
      }
      return out;
    });
    // Snout disc (belly tone).
    set.snout = fz(new CylinderGeometry(0.08, 0.098, 0.08, 8).rotateX(Math.PI / 2 + 0.5).translate(0, -0.2, 0.36), 0.08, 109);
    // Bone: two curved two-piece tusks and two lower canines.
    set.bone = bakeParts('boar:bone', () => {
      const out = [];
      for (const side of [-1, 1]) {
        // each tusk leaves the jaw outward and forward and hooks up and back
        // toward the eye (one curved, tapering horn)
        out.push({ geo: tusk, m: at(P.set(side * 0.085, -0.17, 0.3), new Vector3(side * 0.85, 0.15, 0.5), new Vector3(0, 1, -0.2), 0.16, 0.16, 0.16) });
        out.push({ geo: wedge, m: at(P.set(side * 0.045, -0.2, 0.37), new Vector3(side * 0.2, 1, 0.25), new Vector3(0, 0, 1), 0.035, 0.055, 0.03), tone: 0.94 });
      }
      return out;
    });
    // Slit eyes and nostrils (unlit charcoal: never round, never warm).
    set.eyes = bakeParts('boar:eyes', () => {
      const out = [];
      const bar = fz(new BoxGeometry(0.09, 0.022, 0.022), 0, 1);
      const dot = fz(new BoxGeometry(0.022, 0.016, 0.012), 0, 1);
      for (const side of [-1, 1]) {
        out.push({ geo: bar, m: new Matrix4().compose(new Vector3(side * 0.11, 0, 0.16), new Quaternion().setFromEuler(new Euler(0, side * -0.35, side * 0.45)), new Vector3(1, 1, 1)) });
        out.push({ geo: dot, m: new Matrix4().compose(new Vector3(side * 0.03, -0.215, 0.405), new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.5), new Vector3(1, 1, 1)) });
      }
      return out;
    });
    // THE corruption tell: the indigo thorn ridge, five faceted blades raked
    // back, bright and dim alternating, four small shards between them (one
    // unlit draw call where the classic ridge took five).
    set.thorns = bakeParts('boar:thorns', () => {
      const out = [];
      const bright = new Color(TELL_INDIGO);
      const dim = new Color(TELL_INDIGO_DIM);
      const T = [
        [0.68, 0.2, 0.26],
        [0.72, 0.02, 0.32],
        [0.68, -0.16, 0.28],
        [0.6, -0.32, 0.21],
        [0.5, -0.44, 0.16],
      ];
      for (let i = 0; i < T.length; i++) {
        const [ty, tz, h] = T[i];
        const a = -0.5 - i * 0.14;
        setTRS(m, P.set(0, ty - 0.02, tz), X.set(1, 0, 0), Y.set(0, Math.cos(a), Math.sin(a)), Z.set(0, -Math.sin(a), Math.cos(a)), h * 0.34, h, h * 0.42);
        out.push({ geo: wedge, m: m.clone(), tint: i % 2 === 0 ? bright : dim });
        if (i < T.length - 1) {
          const [ny, nz, nh] = T[i + 1];
          const b = a - 0.1;
          setTRS(m, P.set(0, (ty + ny) / 2 - 0.035, (tz + nz) / 2), X.set(1, 0, 0), Y.set(0, Math.cos(b), Math.sin(b)), Z.set(0, -Math.sin(b), Math.cos(b)), nh * 0.2, nh * 0.42, nh * 0.25);
          out.push({ geo: wedge, m: m.clone(), tint: dim });
        }
      }
      return out;
    });
    // A leg bone: a faceted tapered unit segment (y 0..1); a hoof: split.
    set.leg = fz(new CylinderGeometry(0.8, 1, 1, 5).translate(0, 0.5, 0), 0.1, 111);
    set.hoof = bakeParts('boar:hoof', () => {
      const out = [];
      const toe = fz(new BoxGeometry(0.042, 0.05, 0.075), 0.12, 113);
      for (const side of [-1, 1]) out.push({ geo: toe, m: new Matrix4().compose(new Vector3(side * 0.024, 0.025, 0.012), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), side * 0.12), new Vector3(1, 1, 1)) });
      return out;
    });
    // one buffer per part for the whole game (never disposed, geocache.js)
    for (const g of Object.values(set)) markShared(g);
    SET = set;
    return set;
  }
}

// Hips (body space at rest), hoof homes (yaw-space floor), the leg bones.
const HIPS = [new Vector3(-0.15, 0.31, 0.27), new Vector3(0.15, 0.31, 0.27), new Vector3(-0.15, 0.31, -0.29), new Vector3(0.15, 0.31, -0.29)];
const HOMES = [new Vector3(-0.17, 0, 0.3), new Vector3(0.17, 0, 0.3), new Vector3(-0.17, 0, -0.31), new Vector3(0.17, 0, -0.31)];
const L1 = 0.17;
const L2 = 0.15;
const ANKLE = 0.045;
const BEND = [new Vector3(0, 0, 1), new Vector3(0, 0, 1), new Vector3(0, 0, -1), new Vector3(0, 0, -1)];
const LEG_R = [0.066, 0.04];
const PIVOT = new Vector3(0, 0.34, -0.05);
const YAXIS = new Vector3(0, 1, 0);

export function buildBoarFacet() {
  const G = geos();
  const F = createFoeFrame('boar');
  const { body, spawn, track } = F;
  const hideMat = track(foeMaterial(HIDE.boarBody));
  const darkMat = track(foeMaterial(HIDE.boarDark));
  const bellyMat = track(foeMaterial(HIDE.boarBelly));
  const boneMat = track(foeMaterial(HIDE.bone));
  const hoofMat = track(foeMaterial(HIDE.boarDark.clone().multiplyScalar(0.62)));
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  const thornMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

  body.add(foePart(G.body, hideMat, 'full', 'boar-hide'));
  body.add(foePart(G.dark, darkMat, 'part', 'boar-dark'));
  body.add(foePart(G.belly, bellyMat, false, 'boar-belly'));
  body.add(foePart(G.thorns, thornMat, false, 'boar-thorns'));
  const head = new Group();
  head.name = 'boar-head';
  head.position.set(0, 0.46, 0.44);
  body.add(head);
  head.add(foePart(G.skull, darkMat, 'full', 'boar-skull'));
  head.add(foePart(G.snout, bellyMat, false, 'boar-snout'));
  head.add(foePart(G.bone, boneMat, 'part', 'boar-tusks'));
  head.add(foePart(G.eyes, eyeMat, false, 'boar-eyes'));
  const tellGlow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.6, opacity: 0.26 });
  tellGlow.material.toneMapped = false;
  tellGlow.material.color.copy(TELL_INDIGO_GLOW);
  tellGlow.position.set(0, 0.78, -0.04);
  body.add(tellGlow);

  // Legs: eight bones on one instanced row, four hooves on another, placed by
  // the leg IK every frame (two draw calls each with their ink).
  const legs = instancedPart(G.leg, darkMat, 8, { name: 'boar-legs', moving: true, inkPx: 2.0 });
  const hooves = instancedPart(G.hoof, hoofMat, 4, { name: 'boar-hooves', moving: true, inkPx: PART_INK_PX });
  spawn.add(legs);
  spawn.add(hooves);
  // The contact shadow belongs to the floor (the group, not the yaw).
  F.group.add(groundShadow(0.52, 0.86, { forward: 0.34, wide: 1.2, deep: 0.94 }));

  // Named points (B8): the tusk tip (the weapon), the snout (the mouth).
  const tipPt = namedPoint(head, 'boar-tip', 0.13, -0.05, 0.36);
  const mouth = namedPoint(head, 'boar-mouth', 0, -0.21, 0.42);

  const gait = createLegs({ homes: HOMES, groups: [[0, 3], [1, 2]], trigger: 0.085, reach: 0.22, lift: 0.07, durMin: 0.085, durMax: 0.16 });
  const clock = createFoeClock();
  const watch = createAttackWatch();
  const chain = createChain({ hits: HITS, tls: HIT_TL, rest: REST, window: GORE_WINDOW, ease });
  const cur = { ...REST };
  const fr = { x: 0, z: 0, yaw: 0, s: 1 };
  const lv = { x: 0, z: 0 };
  const hipW = new Vector3();
  const foot = new Vector3();
  const knee = new Vector3();
  const hoofQ = new Quaternion();
  const ONE = new Vector3(1, 1, 1);
  const m = new Matrix4();
  let age = -1;
  let lastBiteAt = -99;
  let seenContact = null;
  const strike = { id: '', tick: 0 };
  let yawNow = 0;
  const lifted = [0, 0, 0, 0];

  // The model lab drives the gore instead of the live events (pure in t).
  const lab = {
    abilities: BOAR_ABILITIES,
    override: null, // { id: 'gore', t } | null
    lastStrike: null, // { id, tick }: the sim tick the latest live strike's contact lands on
    feet: () => gait.feet().map((q, i) => ({ ...q, drawnX: gait.out[i].x, drawnZ: gait.out[i].z, drawnY: gait.out[i].y + lifted[i] })),
    pose: () => ({ ...cur }),
    get hit() {
      return chain.current;
    },
    parts: { body, head, legs, hooves },
  };

  function frontShift(i, o) {
    if (i < 2) o.z += 0.16 * cur.step; // the lunge: the front hooves step in
    else o.z -= 0.03 * cur.step; // the hind pair braces back
    return o;
  }

  function pose(P) {
    const dt = clock.step(P.t ?? 0);
    const now = clock.now;
    const e = P.e || null;
    const tick = P.tick ?? 0;
    const turntable = !!P.turntable;
    // B7: grow from the floor (not on the Journal's turntable, nor where the
    // caller says the foe stands grown: the lab)
    if (age < 0) age = turntable || P.grown || lab.override ? SPAWN_SEC : 0;
    else age += dt;
    spawn.scale.setScalar(spawnScale(age));

    // --- the gore: the lab's pure override, or the live bites
    let active;
    if (lab.override) {
      const h = BOAR_GORE.at(lab.override.t);
      boarHitPose(h.n, h.t, h.from, h.fresh, h.pull, cur);
      active = true;
    } else {
      const beat = watch.update(P);
      if (beat && beat.type === 'bite') {
        chain.hit(now);
        lastBiteAt = now;
      }
      // the next bite is due when this target's cooldown lapses (the sim's
      // per-target clock), while the boar stays pressed against it
      let due = null;
      if (e && e.cdByTarget && e.targetId != null && now - lastBiteAt < GORE_WINDOW && (P.moveK ?? 0) < 0.35) {
        const next = e.cdByTarget[e.targetId];
        // (a cooldown already lapsed says nothing: the boar is out of reach)
        if (next != null && next > tick) due = (next - tick) / 60;
      }
      active = chain.pose(now, cur, due);
      if (!active) Object.assign(cur, REST);
      // a new strike (on the bite, or started early on the predicted bite):
      // the tick its contact lands, for the probe
      const c = chain.contactAt;
      if (c !== null && c !== seenContact) {
        seenContact = c;
        strike.id = `gore:${chain.current + 1}`;
        strike.tick = tick + (c - now) * 60;
        lab.lastStrike = strike;
      }
    }

    // --- feet: locked to the floor, stepping on their own
    fr.x = F.group.position.x;
    fr.z = F.group.position.z;
    fr.yaw = yawNow;
    fr.s = F.group.scale.x || 1;
    // a lab scrub (no time passing) stands the feet on their homes: a still
    // frame has no step history to show
    gait.update(dt, fr, { locked: !turntable && age >= SPAWN_SEC && !(dt <= 0 && lab.override), shift: frontShift });
    const bob = gait.bob;
    gait.localVelocity(fr, lv);
    const fwd = Math.max(-1, Math.min(1, lv.z / RUN_SPEED));
    const side = Math.max(-1, Math.min(1, lv.x / RUN_SPEED));

    // --- the body: the attack's pose, the gait's bob and roll, the lean along
    // the travel (a trot leans in, a shove back leans back), a slow breath
    const breath = Math.sin(now * 2.1);
    body.rotation.set(cur.pitch + 0.07 * fwd, cur.twist, cur.roll - 0.06 * side + 0.03 * bob * (lv.x >= 0 ? 1 : -1));
    body.scale.set(cur.sx, cur.sy * (1 + 0.012 * breath), 1 + (cur.sx - 1) * 0.3);
    placeBody(body, PIVOT, cur.push, cur.hop + 0.022 * bob + 0.004 * breath);
    head.rotation.set(cur.hp + (active ? 0 : 0.05 * Math.sin(now * 1.3) - 0.04 * bob), cur.hy, 0);
    tellGlow.material.opacity = 0.2 + 0.08 * Math.sin((P.t ?? 0) * 2.6);

    // --- legs: the hips ride the body, the hooves stand where the gait put
    // them (a hoof the body rears out of reach of lifts straight up)
    body.updateMatrix();
    for (let i = 0; i < 4; i++) {
      hipW.copy(HIPS[i]).applyMatrix4(body.matrix);
      foot.copy(gait.out[i]);
      foot.y += ANKLE;
      lifted[i] = liftToReach(hipW, foot, L1, L2);
      solveKnee(hipW, foot, L1, L2, BEND[i], knee);
      legs.setMatrixAt(i * 2, segmentMatrix(m, hipW, knee, LEG_R[0], LEG_R[0], 0.03));
      legs.setMatrixAt(i * 2 + 1, segmentMatrix(m, knee, foot, LEG_R[1], LEG_R[1], 0.02));
      foot.y -= ANKLE;
      hoofQ.setFromAxisAngle(YAXIS, i < 2 ? cur.twist * 0.3 : 0);
      hooves.setMatrixAt(i, m.compose(foot, hoofQ, ONE));
    }
    legs.instanceMatrix.needsUpdate = true;
    hooves.instanceMatrix.needsUpdate = true;
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
    // the whole moving body, the node the shared hit envelope wraps (the
    // contact shadow stays on the group, down on the floor)
    body: F.yaw,
    points: { tip: tipPt, hand: tipPt, mouth },
    // The shared hit envelope's tuning (§6.1 item 9): a stocky quadruped
    // takes the full squash and flinch; the flinch bulges at mid-body.
    react: { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 0.42 },
    death: { swell: 1, throw: 1 },
  };
}
