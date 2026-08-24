// Tank — chibi badger (BUILD_BRIEF §19.2): widest stance, lowest center,
// two-tone head stripes, and the party's ONLY rectangular mass — a squared
// pauldron + shield block at the shoulder, in class accent #6B6157.
import { BoxGeometry, CapsuleGeometry, Group, Mesh, SphereGeometry } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial, addOutline } from '../toon.js';
import { bell, mix, addEyes, mitten } from './common.js';

export function buildTank(rig, trackAccent) {
  const accent = CLASS_ACCENTS.tank;
  const coat = mix(PALETTE.warmGrey, accent, 0.5);

  // Widest, lowest bell — scaled out on X so the silhouette squats.
  const cloakMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.warmGrey, 0.25).getHex() }));
  const cloak = new Mesh(
    bell([
      [0, 0],
      [0.24, 0],
      [0.325, 0.03],
      [0.34, 0.14],
      [0.315, 0.27],
      [0.25, 0.42],
      [0.17, 0.52],
      [0.1, 0.565],
      [0, 0.58],
    ]),
    cloakMat
  );
  cloak.scale.set(1.28, 1, 1.1);
  addOutline(cloak);
  rig.add(cloak);

  // Bone chest plate stripe on the front.
  const chest = new Mesh(new SphereGeometry(0.13, 16, 12), toonMaterial({ color: PALETTE.bone }));
  chest.scale.set(1.15, 1.3, 0.4);
  chest.position.set(0, 0.2, 0.27);
  rig.add(chest);

  // Head: broad and low. GREY fur skull with a bone blaze running snout ->
  // crown = the badger "head-stripe two-tone" (§19.2). A bone-white skull
  // with dark ears + dark eye patches read unmistakably PANDA in capture —
  // flipping the base to grey with a light center blaze is what makes it a
  // badger. R sized so the projected head lands inside the 40-45% band
  // (measured 45.8% at R=0.225 — perspective favors the head; 0.21 ≈ 43%).
  const headC = 0.72;
  const R = 0.21;
  const sx = 1.08, sy = 0.9, sz = 1.0;
  const headFur = mix(PALETTE.warmGrey, accent, 0.45);
  const head = new Group();
  head.position.y = headC;
  const skull = new Mesh(new SphereGeometry(R, 26, 20), toonMaterial({ color: headFur.getHex() }));
  skull.scale.set(sx, sy, sz);
  addOutline(skull);
  head.add(skull);

  // Bone blaze: one light capsule chord from brow to crown (a short stub on
  // the crown didn't read as a stripe — verified in capture).
  const blaze = new Mesh(new CapsuleGeometry(0.045, 0.17, 6, 12), toonMaterial({ color: PALETTE.bone }));
  blaze.position.set(0, 0.12, 0.125);
  blaze.rotation.x = -0.82; // chord: brow (low front) -> crown (high back)
  head.add(blaze);
  const stripeMat = toonMaterial({ color: mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.45).getHex() });

  // Small round dark ears, set wide and low (tall centered dark ears were
  // half the panda read).
  const earGeo = new SphereGeometry(0.052, 14, 10);
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.155, 0.125, -0.035);
    const ear = new Mesh(earGeo, stripeMat);
    ear.scale.set(1, 1, 0.5);
    ear.position.y = 0.028;
    addOutline(ear, { thickness: 0.014 });
    pivot.add(ear);
    pivot.rotation.z = side * -0.2;
    head.add(pivot);
    ears.push(pivot);
  }

  // Broad snout + ink nose.
  const snout = new Mesh(new SphereGeometry(0.085, 14, 10), toonMaterial({ color: PALETTE.bone }));
  snout.scale.set(1.0, 0.6, 0.95);
  snout.position.set(0, -0.085, sz * R * 0.8);
  addOutline(snout, { thickness: 0.016 });
  head.add(snout);
  const nose = new Mesh(new SphereGeometry(0.03, 10, 8), toonMaterial({ color: PALETTE.voidCharcoal }));
  nose.position.set(0, -0.06, sz * R * 0.8 + 0.07);
  head.add(nose);

  addEyes(head, { rx: R * sx, ry: R * sy, rz: R * sz, eyeR: 0.06, azimuthDeg: 20 });
  rig.add(head);

  // THE squared mass: accent pauldron block + hanging shield slab (right arm).
  const shield = new Group();
  shield.position.set(0.36, 0.46, 0.02);
  const pauldronMat = trackAccent(toonMaterial({ color: accent }));
  const pauldron = new Mesh(new BoxGeometry(0.3, 0.19, 0.3), pauldronMat);
  addOutline(pauldron);
  shield.add(pauldron);
  const slabMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.voidCharcoal, 0.18).getHex() }));
  const slab = new Mesh(new BoxGeometry(0.1, 0.36, 0.3), slabMat);
  slab.position.set(0.09, -0.24, 0);
  addOutline(slab);
  shield.add(slab);
  rig.add(shield);

  // Left paw + two forward feet selling the widest stance.
  const paw = mitten(coat.getHex(), 0.062);
  paw.position.set(-0.36, 0.32, 0.14);
  rig.add(paw);
  for (const side of [-1, 1]) {
    const foot = mitten(mix(coat, PALETTE.voidCharcoal, 0.3).getHex(), 0.072);
    foot.position.set(side * 0.24, 0.045, 0.24);
    foot.scale.y *= 0.75;
    rig.add(foot);
  }

  // Stubby fluff tail.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.16, -0.36);
  const tail = new Mesh(new SphereGeometry(0.085, 12, 10), toonMaterial({ color: coat.getHex() }));
  tail.scale.set(1, 0.85, 0.7);
  addOutline(tail, { thickness: 0.014 });
  tailPivot.add(tail);
  rig.add(tailPivot);

  function apply(P) {
    ears[0].rotation.z = -0.2 - P.ear * 0.6 - P.collapse * 0.4;
    ears[1].rotation.z = 0.2 + P.ear * 0.5 + P.collapse * 0.4;
    tailPivot.rotation.y = P.tail * 0.5;
    // Cast = shield block thrust forward + up.
    const thrust = Math.max(0, P.prop);
    shield.position.z = 0.02 + 0.2 * thrust;
    shield.position.y = 0.46 + 0.08 * thrust + 0.05 * Math.min(0, P.prop);
    shield.rotation.x = -0.25 * thrust;
  }

  return {
    apply,
    metrics: { standHeight: headC + R * sy, headTopY: headC + R * sy, headBottomY: headC - R * sy },
    halfWidth: 0.46,
  };
}
