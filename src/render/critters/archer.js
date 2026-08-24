// Archer — chibi hare (BUILD_BRIEF §19.2): tallest thinnest vertical mass,
// very long upright ears, bow held to one side forming an open negative-space
// arc. Class accent #6E7A3F (olive).
import { CapsuleGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial, addOutline } from '../toon.js';
import { bell, mix, addEyes, mitten } from './common.js';

export function buildArcher(rig, trackAccent) {
  const accent = CLASS_ACCENTS.archer;
  const fur = mix(PALETTE.warmGrey, PALETTE.bone, 0.3).lerp(mix(PALETTE.paleGold, PALETTE.paleGold, 0), 0.12);
  const wood = mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.42);

  // Tallest, thinnest bell tunic in olive accent.
  const tunicMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.warmGrey, 0.28).getHex() }));
  const tunic = new Mesh(
    bell([
      [0, 0],
      [0.175, 0],
      [0.235, 0.03],
      [0.25, 0.16],
      [0.225, 0.34],
      [0.175, 0.52],
      [0.125, 0.62],
      [0.075, 0.665],
      [0, 0.68],
    ]),
    tunicMat
  );
  tunic.scale.set(0.85, 1, 1);
  addOutline(tunic);
  rig.add(tunic);

  const chest = new Mesh(new SphereGeometry(0.09, 14, 10), toonMaterial({ color: PALETTE.bone }));
  chest.scale.set(1, 1.6, 0.4);
  chest.position.set(0, 0.26, 0.165);
  rig.add(chest);

  // Head: slightly tall skull, high on the body.
  const headC = 0.855;
  const R = 0.215;
  const sx = 0.9, sy = 1.02, sz = 0.95;
  const head = new Group();
  head.position.y = headC;
  const skull = new Mesh(new SphereGeometry(R, 26, 20), toonMaterial({ color: fur.getHex() }));
  skull.scale.set(sx, sy, sz);
  addOutline(skull);
  head.add(skull);

  // Very long upright ears — the silhouette signature. Bone inner faces.
  const earGeo = new CapsuleGeometry(0.048, 0.3, 6, 12);
  const innerGeo = new CapsuleGeometry(0.026, 0.2, 6, 10);
  const innerMat = toonMaterial({ color: PALETTE.bone });
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.078, 0.16, -0.02);
    const ear = new Mesh(earGeo, skull.material);
    ear.scale.set(1, 1.22, 0.62);
    ear.position.y = 0.24;
    addOutline(ear, { thickness: 0.016 });
    pivot.add(ear);
    const inner = new Mesh(innerGeo, innerMat);
    inner.scale.set(1, 1.2, 0.4);
    inner.position.set(0, 0.24, 0.035);
    pivot.add(inner);
    pivot.rotation.z = side * -0.1;
    pivot.rotation.x = -0.06;
    head.add(pivot);
    ears.push(pivot);
  }

  // Short soft muzzle + ink nose.
  const snout = new Mesh(new SphereGeometry(0.065, 14, 10), toonMaterial({ color: PALETTE.bone }));
  snout.scale.set(0.9, 0.62, 0.85);
  snout.position.set(0, -0.07, sz * R * 0.82);
  addOutline(snout, { thickness: 0.014 });
  head.add(snout);
  const nose = new Mesh(new SphereGeometry(0.02, 10, 8), toonMaterial({ color: PALETTE.voidCharcoal }));
  nose.position.set(0, -0.048, sz * R * 0.82 + 0.052);
  head.add(nose);

  addEyes(head, { rx: R * sx, ry: R * sy, rz: R * sz, eyeR: 0.054 });
  rig.add(head);

  // Bone puff tail.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.18, -0.26);
  const tail = new Mesh(new SphereGeometry(0.065, 12, 10), toonMaterial({ color: PALETTE.bone }));
  addOutline(tail, { thickness: 0.012 });
  tailPivot.add(tail);
  rig.add(tailPivot);

  // Bow held out to the left: open C arc (torus segment) + chord string — the
  // negative-space read. The arc's belly faces the body and its opening faces
  // AWAY, so the enclosed negative space falls on background rather than on the
  // torso, and the riser (mid-limb) lands at a natural arm reach where the grip
  // paw can actually touch it. (Mirrored from the first pass, where the riser
  // sat 0.56 u out and the paw hung in mid-arc with nothing to hold — the
  // floating-prop finding in captures/crit5-close3.png.)
  const bow = new Group();
  const arcR = 0.255;
  bow.position.set(-0.255, 0.485, 0.09);
  const arcStart = (70 * Math.PI) / 180;
  const arcLen = (220 * Math.PI) / 180;
  const limb = new Mesh(
    new TorusGeometry(arcR, 0.021, 8, 34, arcLen),
    toonMaterial({ color: wood.getHex() })
  );
  limb.rotation.z = arcStart; // spans 70°..290°: the belly faces the body, so
  addOutline(limb, { thickness: 0.014 }); // the outer silhouette stays a clean
  bow.add(limb); //                          open arc against the background
  // String: vertical chord between the two limb tips, tucked at the torso.
  const tipX = Math.cos(arcStart) * arcR;
  const tipY = Math.sin(arcStart) * arcR;
  const string = new Mesh(
    new CylinderGeometry(0.007, 0.007, tipY * 2, 6),
    toonMaterial({ color: PALETTE.parchment })
  );
  string.position.set(tipX, 0, 0);
  bow.add(string);
  // Riser: a wrapped grip ON the limb centerline at the arc apex — the visible
  // contact point the grip paw closes around (the first pass parked the paw in
  // mid-arc, touching nothing: the floating-prop finding in crit5-close3.png).
  const riser = new Mesh(
    new CylinderGeometry(0.029, 0.029, 0.155, 10),
    toonMaterial({ color: mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.45).getHex() })
  );
  riser.position.set(-arcR, 0, 0);
  addOutline(riser, { thickness: 0.012 });
  bow.add(riser);
  rig.add(bow);

  // Quiver on the back with two arrow shafts.
  const quiver = new Group();
  quiver.position.set(0.13, 0.42, -0.2);
  quiver.rotation.z = -0.35;
  const tube = new Mesh(new CylinderGeometry(0.05, 0.045, 0.24, 10), toonMaterial({ color: wood.getHex() }));
  addOutline(tube, { thickness: 0.014 });
  quiver.add(tube);
  for (const [ox, oz] of [[-0.015, 0.01], [0.02, -0.015]]) {
    const shaft = new Mesh(new CylinderGeometry(0.008, 0.008, 0.2, 6), toonMaterial({ color: PALETTE.parchment }));
    shaft.position.set(ox, 0.19, oz);
    quiver.add(shaft);
    const fletch = new Mesh(new SphereGeometry(0.022, 8, 6), toonMaterial({ color: accent }));
    fletch.scale.set(0.7, 1.4, 0.7);
    fletch.position.set(ox, 0.28, oz);
    quiver.add(fletch);
  }
  rig.add(quiver);

  // Grip paw: parented to the bow and sitting ON the riser (limb centerline),
  // so it stays welded to the grip through every clip.
  const paw = mitten(fur.getHex(), 0.058);
  paw.position.set(-arcR, 0, 0.016); // concentric with the riser, so the grip
  //                                    reads as contact from any camera
  bow.add(paw);
  // Free paw tucked at the hip on the quiver side (the party's mitten idiom —
  // no arms, just contact points).
  const pawFree = mitten(fur.getHex(), 0.052);
  pawFree.position.set(0.18, 0.33, 0.12);
  rig.add(pawFree);

  function apply(P) {
    // Long ears sway in counter-phase; droop when downed.
    ears[0].rotation.z = -0.1 - P.ear * 0.9 - P.collapse * 0.9;
    ears[1].rotation.z = 0.1 + P.ear * 0.7 + P.collapse * 0.9;
    ears[0].rotation.x = -0.06 + 0.35 * Math.min(0, P.ear * 1.6);
    ears[1].rotation.x = ears[0].rotation.x;
    tailPivot.rotation.y = P.tail * 0.6;
    // Cast = raise the bow to aim height, slight cant. The grip paw rides the
    // bow group, so it never leaves the riser.
    const draw = Math.max(0, P.prop);
    bow.position.y = 0.485 + 0.16 * draw + 0.06 * Math.min(0, P.prop);
    bow.rotation.z = -0.18 * draw;
    pawFree.position.y = 0.33 + 0.05 * draw;
  }

  return {
    apply,
    metrics: { standHeight: headC + R * sy, headTopY: headC + R * sy, headBottomY: headC - R * sy },
    halfWidth: 0.24,
  };
}
