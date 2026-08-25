// Swordsman — chibi fox (BUILD_BRIEF §19.2): narrow FORWARD-LEANING WEDGE, long
// sharp snout, big pointed ears, white-tipped brush, sword as a diagonal line
// off the roundness. Class accent #6B2E3A.
//
// Silhouette contract: a WEDGE. Three things carry it, because a pitch rotation
// alone barely projects under a 3/4 camera (the rejected build had the lean in
// code and measured 0° of visible tilt in the capture):
//   1. a rest-pose torso lean (basePitch) — always on, not just in the attack
//      clip,
//   2. the body geometry itself tapers: narrow base, chest thrust forward, so
//      the mass sits ahead of the feet,
//   3. the brush sweeps back and UP while the muzzle drops forward, giving the
//      silhouette one clear diagonal axis instead of the healer's symmetry.
//
// Palette note: the tunic albedo is authored a step toward plum. ACES filmic
// rotates saturated reds ~15° toward orange, and the rejected build's torso
// measured hue 8 (sat 0.6) — inside the Ember Danger telegraph family. Authored
// at ~334 it lands back in the wine/plum band the accent specifies.
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
import { toonMaterial } from '../toon.js';
import { bell, bodyPanel, brushTail, mix, part, faceDecal, faceMarkings, exactHex, mitten, makeArm, aimArm } from './common.js';

const HIP = 0.155;
const HEAD_C = 0.659;
const HEAD_R = 0.238;
const SX = 0.95, SY = 0.97, SZ = 1.03;
const EAR_TOP = 1.11;
const LEAN = 0.2; // rad — the party's only asymmetric rest lean

export function buildSwordsman(rig, trackAccent) {
  const accent = CLASS_ACCENTS.swordsman;
  const fur = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.28); // shared party base
  const furHex = fur.getHex();
  const tunicHex = mix(accent, PALETTE.signalBlue, 0.07).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  // --- Narrow wedge tunic.
  const tunicMat = trackAccent(toonMaterial({ color: tunicHex }));
  const tunic = part(
    bell([
      [0, 0.0],
      [0.155, 0.0],
      [0.2, 0.04],
      [0.215, 0.12],
      [0.205, 0.22],
      [0.185, 0.3],
      [0.15, 0.375],
      [0.105, 0.44],
      [0.085, 0.468],
      [0, 0.48],
    ]),
    tunicHex,
    { mat: tunicMat }
  );
  body.add(tunic);

  const bib = bodyPanel(
    [
      [0.207, 0.19],
      [0.195, 0.27],
      [0.17, 0.34],
      [0.13, 0.41],
    ],
    { color: PALETTE.bone, phiLength: 0.9 }
  );
  body.add(bib);
  const belt = part(new CylinderGeometry(0.19, 0.205, 0.055, 20), mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.2).getHex());
  belt.position.y = 0.165;
  body.add(belt);
  const collar = part(new CylinderGeometry(0.095, 0.13, 0.07, 18), mix(accent, PALETTE.voidCharcoal, 0.25).getHex());
  collar.position.y = 0.452;
  body.add(collar);

  // --- Head, carried forward of the hips by the lean.
  const head = new Group();
  head.position.set(0, HEAD_C, 0.035);
  body.add(head);
  const skull = part(new SphereGeometry(HEAD_R, 28, 22), furHex);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);

  // Light cheek/brow markings (lit, so they band with the fur).
  const cheek = exactHex(mix(PALETTE.bone, PALETTE.parchment, 0.35).getHex());
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        ctx.fillStyle = cheek;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(S * (0.5 + side * 0.26), S * 0.72, S * 0.12, S * 0.16, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.83, S * 0.1, S * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    })
  );

  // Long sharp snout + ink nose tip.
  const snout = part(new ConeGeometry(0.072, 0.17, 14), PALETTE.bone);
  snout.rotation.x = Math.PI / 2; // point +Z
  snout.position.set(0, -0.062, SZ * HEAD_R * 0.76 + 0.06);
  head.add(snout);
  const nose = part(new SphereGeometry(0.021, 10, 8), PALETTE.voidCharcoal, { ink: false });
  nose.position.set(0, -0.055, SZ * HEAD_R * 0.76 + 0.145);
  head.add(nose);

  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeH: 0.115, spread: 0.215, drop: 0.53, glint: 0.28 }));

  // Big pointed ears, swept back along the wedge axis.
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.115, 0.175, -0.035);
    const ear = part(new ConeGeometry(0.082, 0.3, 12), furHex);
    ear.position.y = 0.15;
    pivot.add(ear);
    // Slightly WIDER than the parent cone at the same height, so the dark tip
    // encloses the ear instead of z-fighting with it (matched radii speckled
    // dark streaks down the inside of both ears in the closeup capture).
    const tip = part(new ConeGeometry(0.034, 0.115, 10), mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.35).getHex());
    tip.position.y = 0.2425;
    pivot.add(tip);
    pivot.rotation.z = side * -0.22;
    pivot.rotation.x = -0.12;
    head.add(pivot);
    ears.push(pivot);
  }

  // --- Fox brush: sweeps back and UP, white-tipped, rooted inside the tunic so
  // a collapsed body can never leave it floating clear with a closed outline.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.24, -0.06);
  body.add(tailPivot);
  // The brush sweeps BACK AND OUT TO THE SIDE, and is built as a chain of
  // overlapping, shrinking balls that ends in the white tip. Two earlier shapes
  // failed on captures: swept UP, the light tip projected above the shoulders
  // from the 3/4 camera and read as a raised paw waving a mitten; as a tube
  // plus a separate light cap, the cap detached and read as a traffic cone. An
  // overlapping chain cannot come apart and tapers on its own.
  // The brush sweeps BACK, OUT TO THE SIDE and DOWN. Under a 3/4 camera every
  // unit of depth lifts a mass ~0.55 u of screen height, so a level tail
  // projects above the shoulders and reads as a raised paw; sloping it down
  // lands the white tip below the chin where a fox brush belongs.
  const tailCurve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(-0.15, -0.06, -0.07),
    new Vector3(-0.28, -0.14, -0.11),
    new Vector3(-0.38, -0.2, -0.13),
  ]);
  tailPivot.add(
    brushTail(tailCurve, {
      radius: 0.12,
      colorA: furHex,
      colorB: mix(PALETTE.bone, PALETTE.parchment, 0.8).getHex(),
      split: 0.42,
      taper: 0.62,
    })
  );

  // --- Sword: a real blade (tapered point + crossguard + wrapped grip), held
  // as a clean diagonal that breaks the body outline. The rejected build had a
  // square-ended board floating with no paw anywhere near the grip.
  const sword = new Group();
  sword.position.set(0.26, 0.3, 0.07);
  sword.rotation.z = -0.85;
  sword.rotation.x = -0.22;
  body.add(sword);
  const blade = part(
    new CylinderGeometry(0.006, 0.032, 0.44, 4),
    mix(PALETTE.bone, PALETTE.parchment, 0.65).getHex()
  );
  blade.rotation.y = Math.PI / 4;
  blade.scale.z = 0.42;
  blade.position.y = 0.245;
  sword.add(blade);
  const guard = part(
    new BoxGeometry(0.17, 0.032, 0.05),
    mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.45).getHex()
  );
  guard.position.y = 0.02;
  sword.add(guard);
  const grip = part(new CylinderGeometry(0.021, 0.023, 0.11, 8), mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.4).getHex());
  grip.position.y = -0.055;
  sword.add(grip);
  const pommel = part(new SphereGeometry(0.032, 10, 8), mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.45).getHex());
  pommel.position.y = -0.118;
  sword.add(pommel);
  const gripPaw = mitten(mix(fur, PALETTE.bruiseUmber, 0.45).getHex(), 0.058);
  gripPaw.position.set(0, -0.05, 0.0);
  sword.add(gripPaw);

  // --- Arms + feet.
  const armR = makeArm(furHex, 0.052, 0.2);
  armR.position.set(0.18, 0.365, 0.07);
  body.add(armR);
  const armL = makeArm(furHex, 0.052, 0.2);
  armL.position.set(-0.18, 0.365, 0.07);
  body.add(armL);
  const pawL = mitten(mix(fur, PALETTE.bruiseUmber, 0.45).getHex(), 0.055);
  pawL.position.set(-0.26, 0.23, 0.17);
  body.add(pawL);
  const gripLocal = new Vector3(0, -0.05, 0);
  const gripWorld = new Vector3();

  const feet = [];
  for (const side of [-1, 1]) {
    const foot = mitten(mix(fur, PALETTE.bruiseUmber, 0.45).getHex(), 0.062);
    foot.position.set(side * 0.115, 0.05, 0.24);
    foot.scale.y *= 0.75;
    rig.add(foot);
    feet.push(foot);
  }

  function apply(P) {
    ears[0].rotation.z = -0.22 - P.ear - P.collapse * 0.45;
    ears[1].rotation.z = 0.22 + P.ear * 0.85 + P.collapse * 0.45;
    ears[0].rotation.x = -0.12 + 0.4 * Math.min(0, P.ear * 1.6);
    ears[1].rotation.x = ears[0].rotation.x;
    tailPivot.rotation.y = 0.3 * P.tail;
    tailPivot.rotation.x = 0.12 * P.tail - 0.45 * P.collapse;

    // Cast = slash: cock back on the wind-up, sweep down-forward on release.
    // Slash sweeps mostly in Z (screen plane) — swinging it hard about X tipped
    // the blade at the camera and the sword vanished on the release frame.
    sword.rotation.z = -0.9 + 1.35 * P.prop;
    sword.rotation.x = -0.22 - 0.2 * Math.max(0, P.prop) + 0.4 * Math.min(0, P.prop);
    sword.rotation.y = 0.45 * P.prop;

    feet[0].position.z = 0.24 + 0.1 * P.stride;
    feet[1].position.z = 0.24 - 0.1 * P.stride;
    feet[0].position.y = 0.05 + 0.05 * Math.max(0, P.stride);
    feet[1].position.y = 0.05 + 0.05 * Math.max(0, -P.stride);

    sword.updateMatrix();
    aimArm(armR, gripWorld.copy(gripLocal).applyMatrix4(sword.matrix));
    aimArm(armL, pawL.position);
  }

  return {
    apply,
    torso,
    head,
    basePitch: LEAN,
    metrics: {
      standHeight: EAR_TOP,
      earTopY: EAR_TOP,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.24,
      ringRadius: 0.42,
      hipY: HIP,
    },
  };
}
