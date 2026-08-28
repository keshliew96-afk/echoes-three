// Thorn Boar rig (BUILD_BRIEF §11 "melee rusher" / §19.2 "boar wedge"):
// low-poly quadruped wedge built from FLAT-SHADED primitives — the faceted
// angular read is the anti-party language (§19.2: party = soft smooth bells,
// enemies = angular corrupted beasts). Cool desaturated slate hide, ANGULAR
// charcoal slit eyes (never the party's round warm bean eyes), and exactly
// ONE corruption tell: the violet thorn ridge along the spine (§11 "angular
// growth"). Ink on the two big masses only.
//
// Faces +Z. All animation is driven per-frame by the layer through `pose`.
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_VIOLET, TELL_VIOLET_DIM } from './style.js';

const flashable = (color) =>
  toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0, flatShading: true });

// Low-seg geometry shared across every boar (facets ARE the design).
let geoCache = null;
function geos() {
  if (geoCache) return geoCache;
  geoCache = {
    body: new SphereGeometry(0.3, 7, 5),
    chest: new SphereGeometry(0.2, 6, 4),
    skull: new ConeGeometry(0.19, 0.5, 5),
    snout: new CylinderGeometry(0.075, 0.095, 0.09, 5),
    tusk: new ConeGeometry(0.038, 0.16, 4),
    ear: new ConeGeometry(0.055, 0.12, 4),
    leg: new CylinderGeometry(0.055, 0.04, 0.3, 5),
    eye: new BoxGeometry(0.09, 0.022, 0.022),
    spike: new ConeGeometry(0.062, 1, 4), // height set per-spike via scale
  };
  return geoCache;
}

export function buildBoar() {
  const G = geos();
  const group = new Group();
  group.name = 'boar';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group(); // bob/lunge target
  yaw.add(rig);

  const mats = [];
  const track = (m) => {
    mats.push(m);
    return m;
  };

  // Body: faceted wedge mass, shoulders high, rump low.
  const body = new Mesh(G.body, track(flashable(HIDE.boarBody)));
  body.scale.set(1.0, 0.78, 1.5);
  body.position.set(0, 0.4, -0.04);
  body.rotation.x = -0.09; // shoulders up, rump down — the charging wedge
  addInk(body);
  rig.add(body);
  const chest = new Mesh(G.chest, track(flashable(HIDE.boarDark)));
  chest.scale.set(1.05, 1.0, 1.05);
  chest.position.set(0, 0.42, 0.28);
  rig.add(chest);

  // Head: forward-down cone wedge with a flat snout cap.
  const head = new Group();
  head.position.set(0, 0.46, 0.44);
  rig.add(head);
  const skull = new Mesh(G.skull, track(flashable(HIDE.boarDark)));
  skull.rotation.x = Math.PI / 2 + 0.5; // snout dipped for the charge
  skull.position.set(0, -0.08, 0.14);
  addInk(skull);
  head.add(skull);
  const snout = new Mesh(G.snout, track(flashable(HIDE.boarBelly)));
  snout.rotation.x = Math.PI / 2 + 0.5;
  snout.position.set(0, -0.2, 0.36);
  head.add(snout);
  // Tusks (bone — warm-NEUTRAL, under the analyzer's colour gate).
  const tuskMat = track(flashable(HIDE.bone));
  for (const side of [-1, 1]) {
    const tusk = new Mesh(G.tusk, tuskMat);
    tusk.position.set(side * 0.12, -0.14, 0.3);
    tusk.rotation.set(-0.55, 0, side * -0.6);
    head.add(tusk);
  }
  // Angular ears.
  const earMat = track(flashable(HIDE.boarDark));
  for (const side of [-1, 1]) {
    const ear = new Mesh(G.ear, earMat);
    ear.position.set(side * 0.13, 0.13, -0.06);
    ear.rotation.z = side * -0.6;
    head.add(ear);
  }
  // ANGULAR SLIT EYES (§11: never round warm party eyes): thin charcoal bars
  // slanted down-out — unlit, ink-dark, no glint.
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
  for (const side of [-1, 1]) {
    const eye = new Mesh(G.eye, eyeMat);
    eye.position.set(side * 0.11, 0.0, 0.16);
    eye.rotation.set(0, side * -0.35, side * 0.45);
    head.add(eye);
  }

  // Legs: 4 tapered stubs, visible gap under the belly (trot pairs).
  const legMat = track(flashable(HIDE.boarDark));
  const legs = [];
  for (const [sx, sz] of [
    [-0.16, 0.28],
    [0.16, 0.28],
    [-0.16, -0.3],
    [0.16, -0.3],
  ]) {
    const pivot = new Group();
    pivot.position.set(sx, 0.28, sz);
    const leg = new Mesh(G.leg, legMat);
    leg.position.y = -0.14;
    pivot.add(leg);
    rig.add(pivot);
    legs.push(pivot);
  }

  // THE corruption tell (§11, exactly one): violet thorn ridge along the
  // spine — angular growths raked backward, bright/dim alternating, plus one
  // faint violet halo (§19.3: every emitter carries a glow sprite).
  const thornDark = new MeshBasicMaterial({ color: TELL_VIOLET_DIM, toneMapped: false });
  const thornBright = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });
  const thorns = [
    [0.68, 0.2, 0.24],
    [0.72, 0.02, 0.3],
    [0.68, -0.16, 0.26],
    [0.6, -0.32, 0.2],
    [0.5, -0.44, 0.15],
  ];
  for (let i = 0; i < thorns.length; i++) {
    const [ty, tz, h] = thorns[i];
    const spike = new Mesh(G.spike, i % 2 === 0 ? thornBright : thornDark);
    spike.scale.set(1, h, 1);
    spike.position.set(0, ty, tz);
    spike.rotation.x = -0.5 - i * 0.14; // raked backward
    rig.add(spike);
  }
  const tellGlow = makeGlowSprite({ color: PALETTE.godstuffViolet, size: 0.6, opacity: 0.3 });
  tellGlow.material.toneMapped = false;
  tellGlow.material.color.copy(TELL_VIOLET);
  tellGlow.position.set(0, 0.78, -0.04);
  rig.add(tellGlow);

  // Grounding (§19.2): contact shadow; NO identity ring — rings are
  // party-exclusive (§17), an enemy is identity-free.
  yaw.add(groundShadow(0.42, 0.42));

  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    // pose: { t, walkPhase, moveK (0..1), lungeK (0..1) }
    pose({ t, walkPhase, moveK, lungeK }) {
      const trot = Math.sin(walkPhase);
      rig.position.y = 0.025 * Math.abs(trot) * moveK + 0.008 * Math.sin(t * 2.1);
      rig.position.z = 0.11 * lungeK;
      rig.rotation.x = 0.18 * lungeK + 0.025 * trot * moveK;
      rig.rotation.z = 0.045 * trot * moveK;
      // Diagonal trot pairs.
      legs[0].rotation.x = trot * 0.6 * moveK;
      legs[3].rotation.x = trot * 0.6 * moveK;
      legs[1].rotation.x = -trot * 0.6 * moveK;
      legs[2].rotation.x = -trot * 0.6 * moveK;
      head.rotation.x = 0.26 * lungeK - 0.035 * trot * moveK;
      tellGlow.material.opacity = 0.24 + 0.1 * Math.sin(t * 2.6);
    },
  };
}
