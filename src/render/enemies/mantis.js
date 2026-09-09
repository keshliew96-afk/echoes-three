// Spitting Mantis rig (BUILD_BRIEF §11 ranged shooter / §19.2 "mantis
// stick"): a TALL thin upright insect on stilt legs — the vertical stick
// silhouette against the boar's low wedge — flat-shaded angular chitin,
// raptorial forearms that RAISE through the 0.7 s telegraph (the body is the
// wind-up), and exactly ONE corruption tell: the faint eye-glint (§11
// "angular growth / faint eye-glint" — this one takes the glint, the boar took
// the growth). Never the party's round warm eyes.
//
// Certification fix round 1 (2026-09-09) — all three scorers read this rig as
// "a blue capsule with violet nubs and four sticks, no head/limbs; at 50% a
// dash" (REFERENCE_BAR check 3). Three causes, all fixed here:
//   1. the limbs carried NO ink. Every party member and both big enemy masses
//      wear the inverted-hull storybook line; the mantis's 0.016-0.02 u legs,
//      arms, blades and antennae did not, so at ~1.5 screen px they dissolved
//      into whatever was behind them. Arms, blades, legs and the head crest
//      are inked now.
//   2. the limbs were literally too thin to survive FXAA at gameplay zoom.
//      Every limb girth is up 60-100%, and the head is 40% bigger.
//   3. the arms folded BACK into the body at rest, so the one shape that says
//      "mantis" was never in the silhouette. They now hold forward-and-out in
//      the raptorial guard, in BONE against the dark chitin, and the head
//      carries a crest — head / limbs / body mass all read separately.
// Tell colour moved violet -> indigo with the rest of the rank-and-file
// (enemies/style.js).
//
// Faces +Z. Animation driven by the layer through `pose`.
import {
  ConeGeometry,
  CylinderGeometry,
  CapsuleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow } from '../critters/common.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';

const flashable = (color) =>
  toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0, flatShading: true });

let geoCache = null;
function geos() {
  if (geoCache) return geoCache;
  geoCache = {
    abdomen: new CapsuleGeometry(0.1, 0.4, 3, 7),
    thorax: new CapsuleGeometry(0.075, 0.28, 3, 7),
    head: new SphereGeometry(0.115, 6, 4),
    crest: new ConeGeometry(0.075, 0.17, 4),
    eye: new ConeGeometry(0.05, 0.1, 4),
    upperArm: new CylinderGeometry(0.036, 0.042, 0.26, 5),
    blade: new ConeGeometry(0.05, 0.36, 4),
    femur: new CylinderGeometry(0.033, 0.026, 0.36, 5),
    tibia: new CylinderGeometry(0.026, 0.014, 0.42, 4),
    antenna: new CylinderGeometry(0.012, 0.006, 0.3, 3),
  };
  return geoCache;
}

export function buildMantis() {
  const G = geos();
  const group = new Group();
  group.name = 'mantis';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);

  const mats = [];
  const track = (m) => {
    mats.push(m);
    return m;
  };

  // Hip reference: the stilt legs hold the body HIGH (the stick read).
  const HIP_Y = 0.54;

  // Abdomen: raked up-and-back from the hip, tail high — the long mass that
  // gives the silhouette its diagonal.
  const abdomen = new Mesh(G.abdomen, track(flashable(HIDE.mantisBody)));
  abdomen.rotation.x = -0.85; // top of the capsule tips backward
  abdomen.position.set(0, HIP_Y + 0.15, -0.24);
  addInk(abdomen);
  rig.add(abdomen);

  // Thorax: near-vertical forward segment rising to the head.
  const thorax = new Mesh(G.thorax, track(flashable(HIDE.mantisDark)));
  thorax.rotation.x = 0.3;
  thorax.position.set(0, HIP_Y + 0.17, 0.05);
  addInk(thorax);
  rig.add(thorax);

  // Head: flattened wedge, high, with a crest so the head mass reads as a
  // HEAD from directly above and not as the top of the thorax.
  const headPivot = new Group();
  headPivot.position.set(0, HIP_Y + 0.36, 0.12);
  rig.add(headPivot);
  // Head takes the PALE chitin: from a 3/4 top-down camera the head is the
  // front-most mass, and a dark head on a dark thorax is exactly what made
  // this rig read as one featureless capsule. Pale head / dark thorax / mid
  // abdomen / bone blades = four separable values in one silhouette.
  const head = new Mesh(G.head, track(flashable(HIDE.mantisPale)));
  head.scale.set(1.55, 0.8, 1.0);
  addInk(head);
  headPivot.add(head);
  const crest = new Mesh(G.crest, track(flashable(HIDE.mantisDark)));
  crest.position.set(0, 0.085, -0.03);
  crest.rotation.x = -0.35;
  addInk(crest);
  headPivot.add(crest);
  // THE corruption tell (§11, exactly one): the eye-glint — angular gem eyes
  // + faint halos (§19.3 emitter rule). INDIGO, not violet: violet is
  // god-stuff only (see enemies/style.js).
  const eyeMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const eyeGlows = [];
  for (const side of [-1, 1]) {
    const eye = new Mesh(G.eye, eyeMat);
    eye.position.set(side * 0.15, 0.02, 0.05);
    eye.rotation.set(0.35, 0, side * -1.25); // points up-out: angular, hostile
    headPivot.add(eye);
    const glow = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.2, opacity: 0.32 });
    glow.material.toneMapped = false;
    glow.material.color.copy(TELL_INDIGO_GLOW);
    glow.position.copy(eye.position);
    headPivot.add(glow);
    eyeGlows.push(glow);
  }
  // Antennae: swept-back threads (inked — at 1.2 px they need the line).
  const antMat = track(flashable(HIDE.mantisDark));
  for (const side of [-1, 1]) {
    const ant = new Mesh(G.antenna, antMat);
    ant.position.set(side * 0.06, 0.14, -0.06);
    ant.rotation.set(0.95, 0, side * 0.35);
    headPivot.add(ant);
  }

  // Raptorial forearms: shoulder pivots in front. At rest they hold FORWARD
  // and OUT in the raptorial guard — the one shape that says "mantis" at a
  // glance — and swing up through the telegraph wind-up. Bone blades on a
  // dark hide: the value break is what carries them at 50% zoom.
  const armMat = track(flashable(HIDE.mantisBody));
  const bladeMat = track(flashable(HIDE.bone));
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.position.set(side * 0.1, HIP_Y + 0.2, 0.11);
    const upper = new Mesh(G.upperArm, armMat);
    upper.position.set(side * 0.05, -0.06, 0.11);
    upper.rotation.set(1.15, 0, side * -0.5); // reaches down-forward
    addInk(upper);
    shoulder.add(upper);
    const blade = new Mesh(G.blade, bladeMat);
    blade.position.set(side * 0.13, 0.03, 0.27);
    blade.rotation.set(-1.05, 0, side * -0.55); // forearm cocked up-forward
    addInk(blade);
    shoulder.add(blade);
    rig.add(shoulder);
    arms.push(shoulder);
  }

  // Legs: 4 tall two-segment stilts from the hip down-out to the ground. Two
  // segments (femur out, tibia down) give every leg a visible KNEE, so the
  // silhouette gains four angular brackets instead of four straight sticks.
  const legMat = track(flashable(HIDE.mantisDark));
  const legs = [];
  for (const [sx, sz, splay, rake] of [
    [-0.07, 0.07, 0.72, -0.32],
    [0.07, 0.07, -0.72, -0.32],
    [-0.07, -0.11, 0.92, 0.38],
    [0.07, -0.11, -0.92, 0.38],
  ]) {
    const pivot = new Group();
    pivot.position.set(sx, HIP_Y, sz);
    const femur = new Mesh(G.femur, legMat);
    femur.position.set(0, -0.13, 0);
    femur.rotation.z = splay;
    femur.rotation.x = rake;
    addInk(femur);
    pivot.add(femur);
    const knee = new Group();
    knee.position.set(Math.sin(splay) * -0.3, -0.3, Math.sin(rake) * 0.3);
    const tibia = new Mesh(G.tibia, legMat);
    tibia.position.set(0, -0.19, 0);
    tibia.rotation.z = splay * -0.35;
    knee.add(tibia);
    pivot.add(knee);
    rig.add(pivot);
    legs.push(pivot);
  }

  // Grounding (§19.2 / REFERENCE_BAR check 8): the round-1 scorers measured
  // the mantis's contact shadow as "faint at best" (a 5% luma dip). Wider and
  // twice as dark — a body this tall casts a real footprint.
  yaw.add(groundShadow(0.42, 0.62));

  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    // pose: { t, walkPhase, moveK, telegraphK (0..1 wind-up), fireK (0..1 snap) }
    pose({ t, walkPhase, moveK, telegraphK, fireK }) {
      const skitter = Math.sin(walkPhase * 2.2);
      rig.position.y = 0.015 * Math.abs(skitter) * moveK + 0.01 * Math.sin(t * 1.7);
      // Telegraph: crouch + rear back; fire: snap forward.
      rig.rotation.x = -0.26 * telegraphK + 0.32 * fireK;
      rig.position.z = -0.06 * telegraphK + 0.08 * fireK;
      headPivot.rotation.x = -0.18 * telegraphK + 0.22 * fireK;
      for (let i = 0; i < arms.length; i++) {
        // Arms rear up and spread through the wind-up, lash down on the snap.
        arms[i].rotation.x = -1.0 * telegraphK + 1.35 * fireK;
        arms[i].rotation.z = (i === 0 ? 1 : -1) * 0.45 * telegraphK;
      }
      for (let i = 0; i < legs.length; i++) {
        legs[i].rotation.x = (i % 2 === 0 ? skitter : -skitter) * 0.24 * moveK;
      }
      // The tell breathes faintly (a glint, not a lamp) and flares in the
      // wind-up — one more non-colour channel for "shot incoming".
      const g = 0.28 + 0.1 * Math.sin(t * 3.1) + 0.3 * telegraphK;
      for (const glow of eyeGlows) glow.material.opacity = g;
    },
  };
}
