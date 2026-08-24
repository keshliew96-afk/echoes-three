// Swordsman — chibi fox (BUILD_BRIEF §19.2): narrow forward-leaning wedge
// (~8° body lean — the party's only asymmetric lean), long sharp snout, big
// pointed ears, white-tipped tail, sword held as a diagonal line off the
// roundness. Class accent #6B2E3A (dusty wine — never Ember red-orange).
import {
  BoxGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial, addOutline } from '../toon.js';
import { bell, mix, addEyes, mitten } from './common.js';

export function buildSwordsman(rig, trackAccent) {
  const accent = CLASS_ACCENTS.swordsman;
  const fur = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.32);

  // Narrow bell tunic in wine accent (slim wedge silhouette).
  const tunicMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.warmGrey, 0.3).getHex() }));
  const tunic = new Mesh(
    bell([
      [0, 0],
      [0.19, 0],
      [0.25, 0.03],
      [0.265, 0.14],
      [0.24, 0.3],
      [0.185, 0.46],
      [0.13, 0.56],
      [0.08, 0.61],
      [0, 0.63],
    ]),
    tunicMat
  );
  tunic.scale.set(0.94, 1, 1);
  addOutline(tunic);
  rig.add(tunic);

  // Bone chest patch.
  const chest = new Mesh(new SphereGeometry(0.1, 14, 10), toonMaterial({ color: PALETTE.bone }));
  chest.scale.set(1, 1.5, 0.4);
  chest.position.set(0, 0.24, 0.185);
  rig.add(chest);

  // Head: fox skull with a long sharp muzzle.
  const headC = 0.815;
  const R = 0.222;
  const sx = 0.95, sy = 0.97, sz = 1.02;
  const head = new Group();
  head.position.y = headC;
  const skull = new Mesh(new SphereGeometry(R, 26, 20), toonMaterial({ color: fur.getHex() }));
  skull.scale.set(sx, sy, sz);
  addOutline(skull);
  head.add(skull);

  // Long sharp snout: bone cone + ink nose tip.
  const snout = new Mesh(new ConeGeometry(0.072, 0.2, 12), toonMaterial({ color: PALETTE.bone }));
  snout.rotation.x = Math.PI / 2; // point +Z
  snout.position.set(0, -0.06, sz * R * 0.78 + 0.08);
  addOutline(snout, { thickness: 0.014 });
  head.add(snout);
  const nose = new Mesh(new SphereGeometry(0.026, 10, 8), toonMaterial({ color: PALETTE.voidCharcoal }));
  nose.position.set(0, -0.06, sz * R * 0.78 + 0.185);
  head.add(nose);

  // Big pointed ears (cones), dark inner tips.
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.115, 0.16, -0.015);
    const ear = new Mesh(new ConeGeometry(0.075, 0.21, 10), toonMaterial({ color: fur.getHex() }));
    ear.position.y = 0.09;
    addOutline(ear, { thickness: 0.016 });
    pivot.add(ear);
    const tip = new Mesh(new ConeGeometry(0.028, 0.08, 8), toonMaterial({ color: PALETTE.voidCharcoal }));
    tip.position.y = 0.155;
    pivot.add(tip);
    pivot.rotation.z = side * -0.24;
    head.add(pivot);
    ears.push(pivot);
  }

  addEyes(head, { rx: R * sx, ry: R * sy, rz: R * sz, azimuthDeg: 26 });
  rig.add(head);

  // Big fox brush, white-tipped: a long curl that sweeps back, UP and out to
  // the off-sword side so the white tip breaks the silhouette from the 3/4
  // gallery/gameplay camera. (The first pass tucked a short capsule straight
  // behind the body — from the play camera the tail never read at all, and
  // when the hurt flinch swung it into view the tip sat in shadow, reading
  // dark maroon: BUILD_BRIEF §19.2's white-tipped tail was invisible.)
  const tailPivot = new Group();
  tailPivot.position.set(-0.05, 0.12, -0.2);
  const tailCurve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(-0.12, -0.01, 0.0),
    new Vector3(-0.24, 0.06, 0.03),
    new Vector3(-0.33, 0.17, 0.05),
  ]);
  // Heavy brush: at arm gauge (and with a round white ball on the end) the
  // curl read as a raised ARM waving a mitten — verified in capture. A fat
  // taper plus a lozenge tip aligned with the tail axis reads as fox brush.
  const tailBody = new Mesh(
    new TubeGeometry(tailCurve, 24, 0.105, 12),
    toonMaterial({ color: fur.getHex() })
  );
  addOutline(tailBody, { thickness: 0.016 });
  tailPivot.add(tailBody);
  // Near-white brush tip (Bone lifted toward Parchment): must stay clearly the
  // lightest mass on the fox even in the toon shadow band, and long enough to
  // read as "white-tipped tail" (§19.2) rather than a held prop.
  const tipColor = mix(PALETTE.bone, PALETTE.parchment, 0.85);
  const tailTip = new Mesh(
    new CapsuleGeometry(0.093, 0.12, 8, 14),
    toonMaterial({ color: tipColor.getHex() })
  );
  tailTip.position.set(-0.315, 0.145, 0.045);
  tailTip.rotation.z = 0.685; // align the capsule axis with the tail's end
  addOutline(tailTip, { thickness: 0.014 });
  tailPivot.add(tailTip);
  rig.add(tailPivot);

  // Sword: a clean diagonal off the round silhouette (bone blade, ink grip).
  const sword = new Group();
  sword.position.set(0.26, 0.4, 0.1);
  const blade = new Mesh(
    new BoxGeometry(0.035, 0.46, 0.014),
    toonMaterial({ color: mix(PALETTE.bone, PALETTE.parchment, 0.6).getHex() })
  );
  blade.position.y = 0.3;
  addOutline(blade, { thickness: 0.012 });
  sword.add(blade);
  const guard = new Mesh(
    new BoxGeometry(0.115, 0.026, 0.032),
    toonMaterial({ color: mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.3).getHex() })
  );
  guard.position.y = 0.07;
  sword.add(guard);
  const grip = new Mesh(new CylinderGeometry(0.018, 0.02, 0.09, 8), toonMaterial({ color: PALETTE.voidCharcoal }));
  grip.position.y = 0.015;
  sword.add(grip);
  sword.rotation.z = -0.72; // resting diagonal
  sword.rotation.x = -0.12;
  rig.add(sword);

  // Paws: dark fox mittens, BOTH stacked on the sword grip. A free paw on the
  // tail side was the other half of the "raised arm" read — with the left side
  // clear, the brush is unambiguous, and a two-handed grip suits the class.
  const pawSword = mitten(mix(fur, PALETTE.voidCharcoal, 0.55).getHex());
  pawSword.position.set(0, 0.045, 0.012);
  sword.add(pawSword);
  const pawFree = mitten(mix(fur, PALETTE.voidCharcoal, 0.55).getHex(), 0.05);
  pawFree.position.set(0, -0.02, 0.012);
  sword.add(pawFree);

  function apply(P) {
    ears[0].rotation.z = -0.24 - P.ear - P.collapse * 0.45;
    ears[1].rotation.z = 0.24 + P.ear * 0.85 + P.collapse * 0.45;
    ears[0].rotation.x = -0.3 * Math.min(0, P.ear * 2); // pin back on flinch
    ears[1].rotation.x = ears[0].rotation.x;
    // Swing the brush without letting the white tip duck behind the torso.
    tailPivot.rotation.y = 0.26 * P.tail;
    tailPivot.rotation.z = 0.14 * P.tail;
    tailPivot.rotation.x = 0.08 * P.tail - 0.5 * P.collapse;
    // Cast = slash: cock further back on wind-up, sweep down-forward on release.
    sword.rotation.z = -0.72 + 0.95 * P.prop;
    sword.rotation.x = -0.12 - 0.5 * Math.max(0, P.prop);
  }

  return {
    apply,
    metrics: { standHeight: headC + R * sy, headTopY: headC + R * sy, headBottomY: headC - R * sy },
    // The whole rig gets the signature 8° forward wedge lean.
    basePitch: 0.14,
    halfWidth: 0.27,
  };
}
