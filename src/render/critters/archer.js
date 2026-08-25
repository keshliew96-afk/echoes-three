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
// Hems clear of the floor — see the note in healer.js (round-3 F10).
const HEM = 0.022;
const HEAD_C = 0.7458;
const HEAD_R = 0.2685;
const SX = 0.9, SY = 1.02, SZ = 0.94;
const EAR_TOP = 1.3;
// BOW GEOMETRY (round-3 F12: "the bow reads as a hoop/handbag and the arm
// impales it"). The riser used to sit at the arc's OUTBOARD extreme with the
// arc's opening facing the body, so the bow arm had to travel from the shoulder
// through the opening, across the interior, and out the far side — the paw
// poked out beyond the limbs and the whole thing read as a handbag with a
// skewer through it.
//
// The bow group's ORIGIN is now the riser, and the arc bulges OUTBOARD from it.
// The arm therefore stops dead at the grip and never enters the arc; the paw is
// pushed forward of the bow plane (+Z) so it visibly closes on the riser in
// front; and the plane is yawed so the C and its string chord both project as
// open shapes from the 3/4 camera instead of collapsing edge-on.
const ARC_R = 0.25;
const BOW_X = -0.29;
const BOW_Y = 0.44;
const BOW_Z = 0.15;
const BOW_TILT = 0.3; // yaw: keeps the C in the camera plane instead of edge-on

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
      [0, HEM],
      [0.135, HEM],
      [0.175, 0.045],
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

  // --- Bow: an open C hung off the riser, opening outboard.
  const bow = new Group();
  bow.position.set(BOW_X, BOW_Y, BOW_Z);
  bow.rotation.y = BOW_TILT;
  bow.rotation.z = 0.12;
  body.add(bow);
  const ARC_SPAN = (215 * Math.PI) / 180;
  const limb = part(new TorusGeometry(ARC_R, 0.021, 8, 44, ARC_SPAN), wood);
  // The arc's MIDPOINT lands on the group origin and the limbs sweep OUTBOARD
  // from it, so the whole bow lives on the far side of the grip from the
  // shoulder. That is the geometric reason the arm can no longer impale it:
  // there is nothing between the shoulder and the paw to pass through.
  limb.position.x = -ARC_R;
  limb.rotation.z = -ARC_SPAN / 2;
  bow.add(limb);
  // String: the chord closing the arc. Together with the limbs it encloses the
  // open negative space §19.2 asks the bow to make.
  const tipX = -ARC_R + Math.cos(ARC_SPAN / 2) * ARC_R;
  const tipY = Math.sin(ARC_SPAN / 2) * ARC_R;
  const string = new Mesh(
    new CylinderGeometry(0.0075, 0.0075, tipY * 2, 6),
    toonMaterial({ color: mix(PALETTE.bone, PALETTE.bruiseUmber, 0.25).getHex() })
  );
  string.position.set(tipX, 0, 0);
  bow.add(string);
  // Riser: the wrapped grip AT the origin — the point nearest the shoulder,
  // which is the only point an extended bow arm can actually close on.
  const riser = part(
    new CylinderGeometry(0.03, 0.03, 0.17, 10),
    mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.4).getHex()
  );
  bow.add(riser);
  // Paw IN FRONT of the arc (+Z in bow space), so from the play camera the
  // mitten visibly overlaps the riser rather than being skewered by it.
  const gripPaw = mitten(furHex, 0.06);
  gripPaw.position.set(0, 0, 0.062);
  bow.add(gripPaw);

  // Quiver on the back with two arrows. Round-3 F12 also found it clipping
  // INTO the skull with a stray green fletching nub emerging out of the head:
  // it is reseated lower and further back, and raked backwards rather than
  // upright, so the arrow tips clear the head sphere by ~0.09 u at rest.
  const quiver = new Group();
  quiver.position.set(0.155, 0.33, -0.185);
  quiver.rotation.set(-0.5, 0, -0.34);
  const tube = part(new CylinderGeometry(0.052, 0.046, 0.25, 10), wood);
  quiver.add(tube);
  for (const [ox, oz] of [[-0.016, 0.012], [0.021, -0.016]]) {
    const shaft = new Mesh(new CylinderGeometry(0.008, 0.008, 0.18, 6), toonMaterial({ color: PALETTE.bone }));
    shaft.position.set(ox, 0.185, oz);
    quiver.add(shaft);
    const fletch = new Mesh(new SphereGeometry(0.024, 8, 6), toonMaterial({ color: accent }));
    fletch.scale.set(0.7, 1.4, 0.7);
    fletch.position.set(ox, 0.265, oz);
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
  const gripLocal = new Vector3(0, 0, 0.03);
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
    bow.position.y = BOW_Y + 0.13 * draw + 0.04 * wind;
    bow.position.x = BOW_X - 0.05 * draw;
    bow.position.z = BOW_Z + 0.05 * draw;
    bow.rotation.y = BOW_TILT - 0.22 * draw;
    bow.rotation.z = 0.12 - 0.28 * draw;
    // Draw paw rides the string: pulled back to the cheek on the wind-up, snaps
    // forward on release.
    drawPaw.position.set(-0.11 + 0.03 * draw + 0.05 * wind, bow.position.y + 0.05 * draw, 0.02 - 0.16 * draw - 0.05 * wind);

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
      ringRadius: 0.44,
      hipY: HIP,
    },
  };
}
