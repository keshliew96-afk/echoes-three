// Archer — chibi hare (BUILD_BRIEF §19.2): tallest, thinnest vertical mass,
// very long upright ears, bow held to one side forming an open negative-space
// arc. Class accent #6E7A3F.
//
// Silhouette contract: TALL EARS on a thin column. She is 24% taller than the
// Tank and less than half his width, and the ear pair is the only vertical
// double-spike in the party.
//
// The bow is pushed outboard: its arc used to pass INSIDE the torso with the
// string drawn as a hard line across the chest, and on walk frames the lower
// limb sank through the identity ring into the ground. The arc now clears the
// body on X, its opening faces AWAY from the torso (so the negative space falls
// on background, which is the whole point of the shape), the riser sits at the
// point nearest the shoulder where the grip paw can actually close on it, and
// the lowest limb point stays 0.26 u above the floor at full stride.
import {
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { bell, bodyPanel, mix, part, faceDecal, faceMarkings, exactHex, mitten, makeArm, aimArm } from './common.js';

const HIP = 0.17;
const HEAD_C = 0.7458;
const HEAD_R = 0.2685;
const SX = 0.9, SY = 1.02, SZ = 0.94;
const EAR_TOP = 1.3;
const ARC_R = 0.225;
const BOW_X = -0.3;
const BOW_Y = 0.38;
const BOW_TILT = 0.25; // yaw: rakes the string plane back so it never crosses
//                        the chest as a hard line (the rejected build drew it
//                        straight over the torso)

export function buildArcher(rig, trackAccent) {
  const accent = CLASS_ACCENTS.archer;
  const fur = mix(PALETTE.warmGrey, PALETTE.bone, 0.3); // shared party base
  const furHex = fur.getHex();
  const wood = mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.4).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  // --- Tallest, thinnest tunic.
  const tunicMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.warmGrey, 0.16).getHex() }));
  const tunic = part(
    bell([
      [0, 0.0],
      [0.135, 0.0],
      [0.175, 0.04],
      [0.185, 0.13],
      [0.175, 0.27],
      [0.155, 0.38],
      [0.125, 0.45],
      [0.095, 0.5],
      [0, 0.53],
    ]),
    accent,
    { mat: tunicMat }
  );
  tunic.scale.set(0.94, 1, 1.02);
  body.add(tunic);

  const bib = bodyPanel(
    [
      [0.178, 0.26],
      [0.168, 0.33],
      [0.15, 0.39],
      [0.125, 0.45],
    ],
    { color: PALETTE.bone, phiLength: 1.1 }
  );
  body.add(bib);
  const collar = part(new CylinderGeometry(0.09, 0.12, 0.065, 18), mix(accent, PALETTE.voidCharcoal, 0.25).getHex());
  collar.position.y = 0.5;
  body.add(collar);
  // Warm-grey belt (the shared party base showing as trim on every class).
  const belt = part(new CylinderGeometry(0.178, 0.183, 0.05, 22), mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.2).getHex());
  belt.position.y = 0.22;
  body.add(belt);

  // --- Head.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skull = part(new SphereGeometry(HEAD_R, 28, 22), furHex);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);

  const blaze = exactHex(mix(PALETTE.bone, PALETTE.parchment, 0.4).getHex());
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        ctx.fillStyle = blaze;
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.82, S * 0.18, S * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tapered blaze up the muzzle — a hard-edged rectangle read as a
        // sticker stuck on the face in the closeup capture.
        ctx.beginPath();
        ctx.moveTo(S * 0.47, S * 0.42);
        ctx.lineTo(S * 0.53, S * 0.42);
        ctx.quadraticCurveTo(S * 0.58, S * 0.7, S * 0.56, S * 0.86);
        ctx.lineTo(S * 0.44, S * 0.86);
        ctx.quadraticCurveTo(S * 0.42, S * 0.7, S * 0.47, S * 0.42);
        ctx.fill();
      },
    })
  );

  // Very long upright ears — the silhouette signature.
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.082, 0.205, -0.02);
    const ear = part(new CapsuleGeometry(0.048, 0.26, 6, 14), furHex);
    ear.scale.set(1, 1, 0.62);
    ear.position.y = 0.16;
    pivot.add(ear);
    const inner = new Mesh(
      new CapsuleGeometry(0.026, 0.19, 6, 10),
      toonMaterial({ color: mix(PALETTE.bone, PALETTE.bruiseUmber, 0.25).getHex() })
    );
    inner.scale.set(1, 1, 0.4);
    inner.position.set(0, 0.16, 0.032);
    pivot.add(inner);
    pivot.rotation.z = side * -0.075;
    pivot.rotation.x = -0.05;
    head.add(pivot);
    ears.push(pivot);
  }

  // Short soft muzzle + ink nose.
  const snout = part(new SphereGeometry(0.072, 14, 10), PALETTE.bone);
  snout.scale.set(0.9, 0.62, 0.85);
  snout.position.set(0, -0.115, SZ * HEAD_R * 0.8);
  head.add(snout);
  const nose = part(new SphereGeometry(0.022, 10, 8), PALETTE.voidCharcoal, { ink: false });
  nose.position.set(0, -0.088, SZ * HEAD_R * 0.8 + 0.055);
  head.add(nose);

  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.092, eyeH: 0.12, spread: 0.19, drop: 0.62 }));

  // Bone puff tail.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.2, -0.2);
  const tail = part(new SphereGeometry(0.072, 12, 10), PALETTE.bone);
  tailPivot.add(tail);
  body.add(tailPivot);

  // --- Bow: open C arc clear of the torso, opening facing outboard.
  const bow = new Group();
  bow.position.set(BOW_X, BOW_Y, 0.05);
  bow.rotation.y = BOW_TILT;
  body.add(bow);
  const ARC_SPAN = (220 * Math.PI) / 180;
  const limb = part(new TorusGeometry(ARC_R, 0.021, 8, 40, ARC_SPAN), wood);
  limb.rotation.z = Math.PI - ARC_SPAN / 2; // arc centred on -X: the convex
  bow.add(limb); //                            limbs face outboard, away from
  //                                           the body, like a real bow
  // String: the chord closing the arc on the BODY side. Together with the limbs
  // it encloses the open negative space the art bible asks the bow to make.
  const tipX = -Math.cos(ARC_SPAN / 2) * ARC_R;
  const tipY = Math.sin(ARC_SPAN / 2) * ARC_R;
  const string = new Mesh(
    new CylinderGeometry(0.0075, 0.0075, tipY * 2, 6),
    toonMaterial({ color: mix(PALETTE.bone, PALETTE.bruiseUmber, 0.25).getHex() })
  );
  string.position.set(tipX, 0, 0);
  bow.add(string);
  // Riser: the wrapped grip at the arc's midpoint — the outermost point, which
  // is exactly where an extended bow arm puts the paw.
  const riser = part(
    new CylinderGeometry(0.03, 0.03, 0.15, 10),
    mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.4).getHex()
  );
  riser.position.set(-ARC_R, 0, 0);
  bow.add(riser);
  const gripPaw = mitten(furHex, 0.058);
  gripPaw.position.set(-ARC_R, 0, 0.02);
  bow.add(gripPaw);

  // Quiver on the back with two arrows.
  const quiver = new Group();
  quiver.position.set(0.15, 0.4, -0.16);
  quiver.rotation.z = -0.32;
  const tube = part(new CylinderGeometry(0.052, 0.046, 0.25, 10), wood);
  quiver.add(tube);
  for (const [ox, oz] of [[-0.016, 0.012], [0.021, -0.016]]) {
    const shaft = new Mesh(new CylinderGeometry(0.008, 0.008, 0.2, 6), toonMaterial({ color: PALETTE.bone }));
    shaft.position.set(ox, 0.2, oz);
    quiver.add(shaft);
    const fletch = new Mesh(new SphereGeometry(0.024, 8, 6), toonMaterial({ color: accent }));
    fletch.scale.set(0.7, 1.4, 0.7);
    fletch.position.set(ox, 0.29, oz);
    quiver.add(fletch);
  }
  body.add(quiver);

  // --- Arms + feet.
  const armL = makeArm(furHex, 0.05, 0.2);
  armL.position.set(-0.19, 0.4, 0.09);
  body.add(armL);
  const armR = makeArm(furHex, 0.05, 0.2);
  armR.position.set(0.185, 0.4, 0.08);
  body.add(armR);
  const drawPaw = mitten(furHex, 0.052);
  body.add(drawPaw);
  const gripLocal = new Vector3(-ARC_R, 0, 0.02);
  const gripWorld = new Vector3();

  const feet = [];
  for (const side of [-1, 1]) {
    const foot = mitten(mix(fur, PALETTE.bruiseUmber, 0.35).getHex(), 0.058);
    foot.position.set(side * 0.1, 0.048, 0.22);
    foot.scale.y *= 0.75;
    rig.add(foot);
    feet.push(foot);
  }

  function apply(P) {
    // Long ears sway in counter-phase; droop when downed.
    ears[0].rotation.z = -0.075 - P.ear * 0.55 - P.collapse * 0.95;
    ears[1].rotation.z = 0.075 + P.ear * 0.45 + P.collapse * 0.95;
    ears[0].rotation.x = -0.05 + 0.3 * Math.min(0, P.ear * 1.6);
    ears[1].rotation.x = ears[0].rotation.x;
    tailPivot.rotation.y = P.tail * 0.6;

    // Cast = draw and loose: the bow rises and cants, the free paw pulls the
    // string back on the wind-up and snaps forward on the release.
    const draw = Math.max(0, P.prop);
    const wind = Math.min(0, P.prop);
    bow.position.y = BOW_Y + 0.15 * draw + 0.05 * wind;
    bow.position.x = BOW_X - 0.07 * draw;
    bow.rotation.y = BOW_TILT - 0.2 * draw;
    bow.rotation.z = -0.2 * draw;
    // Draw paw rides the string: pulled back to the cheek on the wind-up, snaps
    // forward on release.
    drawPaw.position.set(-0.09 + 0.02 * draw + 0.05 * wind, bow.position.y + 0.06 * draw, 0.05 - 0.17 * draw - 0.05 * wind);

    feet[0].position.z = 0.22 + 0.095 * P.stride;
    feet[1].position.z = 0.22 - 0.095 * P.stride;
    feet[0].position.y = 0.048 + 0.05 * Math.max(0, P.stride);
    feet[1].position.y = 0.048 + 0.05 * Math.max(0, -P.stride);

    bow.updateMatrix();
    aimArm(armL, gripWorld.copy(gripLocal).applyMatrix4(bow.matrix));
    aimArm(armR, drawPaw.position);
  }

  return {
    apply,
    torso,
    head,
    basePitch: 0,
    metrics: {
      standHeight: EAR_TOP,
      earTopY: EAR_TOP,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.2,
      ringRadius: 0.4,
      hipY: HIP,
    },
  };
}
