// Spitting Mantis rig (BUILD_BRIEF §11 ranged shooter / §19.2 "mantis
// stick"): a TALL thin upright insect on stilt legs — the vertical stick
// silhouette against the boar's low wedge — flat-shaded angular chitin,
// raptorial forearms that RAISE through the 0.7 s telegraph (the body is the
// wind-up), and exactly ONE corruption tell: the faint violet eye-glint (§11
// "angular growth / faint violet eye-glint" — this one takes the glint, the
// boar took the growth). Never the party's round warm eyes.
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
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_VIOLET } from './style.js';

const flashable = (color) =>
  toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0, flatShading: true });

let geoCache = null;
function geos() {
  if (geoCache) return geoCache;
  geoCache = {
    abdomen: new CapsuleGeometry(0.068, 0.34, 3, 7),
    thorax: new CapsuleGeometry(0.052, 0.26, 3, 7),
    head: new SphereGeometry(0.08, 6, 4),
    eye: new ConeGeometry(0.036, 0.07, 4),
    upperArm: new CylinderGeometry(0.02, 0.024, 0.2, 5),
    blade: new ConeGeometry(0.028, 0.26, 4),
    leg: new CylinderGeometry(0.016, 0.009, 0.62, 4),
    antenna: new CylinderGeometry(0.007, 0.004, 0.26, 3),
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
  const HIP_Y = 0.52;

  // Abdomen: raked up-and-back from the hip, tail high.
  const abdomen = new Mesh(G.abdomen, track(flashable(HIDE.mantisBody)));
  abdomen.rotation.x = -0.85; // top of the capsule tips backward
  abdomen.position.set(0, HIP_Y + 0.13, -0.2);
  addInk(abdomen);
  rig.add(abdomen);

  // Thorax: near-vertical forward segment rising to the head.
  const thorax = new Mesh(G.thorax, track(flashable(HIDE.mantisPale)));
  thorax.rotation.x = 0.3;
  thorax.position.set(0, HIP_Y + 0.15, 0.045);
  addInk(thorax);
  rig.add(thorax);

  // Head: flattened wedge, high, with the violet-glint eyes at its corners.
  const headPivot = new Group();
  headPivot.position.set(0, HIP_Y + 0.32, 0.1);
  rig.add(headPivot);
  const head = new Mesh(G.head, track(flashable(HIDE.mantisDark)));
  head.scale.set(1.5, 0.75, 0.95);
  addInk(head);
  headPivot.add(head);
  // THE corruption tell (§11, exactly one): faint violet eye-glint — angular
  // gem eyes + faint halos (§19.3 emitter rule).
  const eyeMat = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });
  const eyeGlows = [];
  for (const side of [-1, 1]) {
    const eye = new Mesh(G.eye, eyeMat);
    eye.position.set(side * 0.115, 0.015, 0.03);
    eye.rotation.set(0.35, 0, side * -1.25); // points up-out: angular, hostile
    headPivot.add(eye);
    const glow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.17, opacity: 0.35 });
    glow.material.toneMapped = false;
    glow.material.color.copy(TELL_VIOLET);
    glow.position.copy(eye.position);
    headPivot.add(glow);
    eyeGlows.push(glow);
  }
  // Antennae: swept-back threads.
  const antMat = track(flashable(HIDE.mantisDark));
  for (const side of [-1, 1]) {
    const ant = new Mesh(G.antenna, antMat);
    ant.position.set(side * 0.05, 0.12, -0.05);
    ant.rotation.set(0.95, 0, side * 0.35);
    headPivot.add(ant);
  }

  // Raptorial forearms: shoulder pivots in front — folded prayer pose at
  // rest, raised high through the telegraph wind-up.
  const armMat = track(flashable(HIDE.mantisPale));
  const bladeMat = track(flashable(HIDE.bone));
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.position.set(side * 0.08, HIP_Y + 0.16, 0.1);
    const upper = new Mesh(G.upperArm, armMat);
    upper.position.set(0, -0.08, 0.05);
    upper.rotation.x = 0.55;
    shoulder.add(upper);
    const blade = new Mesh(G.blade, bladeMat);
    blade.position.set(0, -0.1, 0.17);
    blade.rotation.x = -1.3; // folded back up (mantis prayer pose)
    shoulder.add(blade);
    rig.add(shoulder);
    arms.push(shoulder);
  }

  // Legs: 4 tall stilts from the hip down-out to the ground.
  const legMat = track(flashable(HIDE.mantisDark));
  const legs = [];
  for (const [sx, sz, splay] of [
    [-0.06, 0.05, 0.45],
    [0.06, 0.05, -0.45],
    [-0.06, -0.1, 0.6],
    [0.06, -0.1, -0.6],
  ]) {
    const pivot = new Group();
    pivot.position.set(sx, HIP_Y, sz);
    const leg = new Mesh(G.leg, legMat);
    leg.position.set(0, -0.28, 0);
    leg.rotation.z = splay; // stilts splay outward
    leg.rotation.x = sz > 0 ? -0.3 : 0.35;
    pivot.add(leg);
    rig.add(pivot);
    legs.push(pivot);
  }

  yaw.add(groundShadow(0.3, 0.4));

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
        // Arms raise high through the wind-up, lash down on the fire snap.
        arms[i].rotation.x = -1.2 * telegraphK + 1.55 * fireK;
        arms[i].rotation.z = (i === 0 ? 1 : -1) * 0.4 * telegraphK;
      }
      for (let i = 0; i < legs.length; i++) {
        legs[i].rotation.x = (i % 2 === 0 ? skitter : -skitter) * 0.24 * moveK;
      }
      // The tell breathes faintly (a glint, not a lamp) and flares in the
      // wind-up — one more non-colour channel for "shot incoming".
      const g = 0.3 + 0.12 * Math.sin(t * 3.1) + 0.35 * telegraphK;
      for (const glow of eyeGlows) glow.material.opacity = g;
    },
  };
}
