// Tank — chibi badger (BUILD_BRIEF §19.2): widest stance, lowest centre,
// head-stripe two-tone, and the party's ONLY rectangular mass — a squared
// pauldron block at the shoulder in class accent #6B6157.
//
// Silhouette contract: a BLOCK. The body is scaled 1.35 on X and topped by a
// hard-edged shoulder box, so in greyscale he is the only critter with a
// straight vertical right edge and square corners.
//
// The block now STOPS AT SHOULDER HEIGHT (it used to hang to the ground and
// read as a crate bolted to a badger) and its accent sits two value steps below
// the warm-grey fur, so the "only rectangular mass" tell survives on all four
// edges instead of two.
import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { bell, bodyPanel, mix, exactHex, part, faceDecal, faceMarkings, mitten, makeArm, aimArm } from './common.js';

const HIP = 0.19;
const HEAD_C = 0.767;
const HEAD_R = 0.232;
const SX = 1.08, SY = 0.92, SZ = 1.0;
const EAR_TOP = 1.02;
const BODY_SCALE_X = 1.35;

export function buildTank(rig, trackAccent) {
  const accent = CLASS_ACCENTS.tank;
  const fur = mix(PALETTE.warmGrey, PALETTE.bone, 0.16); // shared party base
  const furHex = fur.getHex();
  const furDark = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.45).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  // --- Widest, lowest body.
  const coatMat = trackAccent(toonMaterial({ color: furHex }));
  const coat = part(
    bell([
      [0, 0.0],
      [0.23, 0.0],
      [0.31, 0.05],
      [0.335, 0.15],
      [0.325, 0.27],
      [0.295, 0.39],
      [0.24, 0.47],
      [0.165, 0.535],
      [0.115, 0.575],
      [0, 0.6],
    ]),
    furHex,
    { mat: coatMat }
  );
  coat.scale.set(BODY_SCALE_X, 1, 1.06);
  body.add(coat);

  // Accent tabard down the chest — class trim on the shared warm-grey base.
  const tabard = bodyPanel(
    [
      [0.325, 0.1],
      [0.335, 0.15],
      [0.325, 0.27],
      [0.295, 0.39],
      [0.24, 0.47],
      [0.185, 0.53],
    ],
    { color: accent, phiLength: 0.72 }
  );
  tabard.scale.set(BODY_SCALE_X, 1, 1.06);
  trackAccent(tabard.material);
  body.add(tabard);
  const buckle = part(new BoxGeometry(0.11, 0.08, 0.05), PALETTE.paleGold);
  buckle.position.set(0, 0.2, 0.35);
  body.add(buckle);
  // Narrow accent collar AT the chin: it separates fur from garment and puts
  // the neck pinch on the head-measurement line (proportion note in healer.js).
  const collar = part(new CylinderGeometry(0.125, 0.165, 0.075, 20), mix(accent, PALETTE.voidCharcoal, 0.2).getHex());
  collar.position.y = 0.552;
  body.add(collar);

  // --- Head: broad and low.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skull = part(new SphereGeometry(HEAD_R, 28, 22), furHex);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);

  // Badger head-stripe two-tone, painted as LIT markings so they band with the
  // key light like the fur: dark mask stripes through the eyes, light blaze
  // down the centre. (Geometry stripes on a light skull read PANDA.)
  const stripe = exactHex(mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.35).getHex());
  const blaze = exactHex(PALETTE.bone);
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        ctx.fillStyle = blaze;
        ctx.fillRect(S * 0.425, 0, S * 0.15, S);
        ctx.fillStyle = stripe;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(S * (0.5 + side * 0.215), S * 0.5, S * 0.075, S * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    })
  );

  // Small round dark ears set wide and low.
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.175, 0.14, -0.04);
    const ear = part(new SphereGeometry(0.075, 14, 10), furDark);
    ear.scale.set(1, 1, 0.5);
    ear.position.y = 0.05;
    pivot.add(ear);
    pivot.rotation.z = side * -0.18;
    head.add(pivot);
    ears.push(pivot);
  }

  // Broad snout + ink nose.
  const snout = part(new SphereGeometry(0.09, 16, 12), PALETTE.bone);
  snout.scale.set(1.0, 0.6, 0.95);
  snout.position.set(0, -0.108, SZ * HEAD_R * 0.78);
  head.add(snout);
  const nose = part(new SphereGeometry(0.023, 10, 8), PALETTE.voidCharcoal, { ink: false });
  nose.position.set(0, -0.072, SZ * HEAD_R * 0.78 + 0.07);
  head.add(nose);

  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.1, eyeH: 0.115, spread: 0.215, drop: 0.58 }));

  // --- THE squared mass: a shoulder block, ending well above the ground.
  const shield = new Group();
  shield.position.set(0.26, 0.53, 0.01);
  shield.rotation.z = -0.16;
  body.add(shield);
  const pauldronMat = trackAccent(toonMaterial({ color: accent }));
  const pauldron = part(new BoxGeometry(0.34, 0.16, 0.32), accent, { mat: pauldronMat });
  shield.add(pauldron);
  const slabMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.voidCharcoal, 0.22).getHex() }));
  const slab = part(new BoxGeometry(0.085, 0.22, 0.26), accent, { mat: slabMat });
  slab.position.set(0.13, -0.19, 0);
  shield.add(slab);
  const rivet = part(new BoxGeometry(0.055, 0.055, 0.055), PALETTE.paleGold);
  rivet.position.set(0.172, -0.19, 0);
  shield.add(rivet);

  // --- Arms + widest-stance feet.
  const armR = makeArm(furHex, 0.06, 0.22);
  armR.position.set(0.31, 0.46, 0.06);
  body.add(armR);
  const armL = makeArm(furHex, 0.06, 0.22);
  armL.position.set(-0.31, 0.46, 0.06);
  body.add(armL);
  const pawL = mitten(furHex, 0.07);
  pawL.position.set(-0.46, 0.29, 0.2);
  body.add(pawL);
  const shieldGripLocal = new Vector3(-0.02, -0.11, 0.16);
  const gripWorld = new Vector3();

  const feet = [];
  for (const side of [-1, 1]) {
    const foot = mitten(furDark, 0.078);
    foot.position.set(side * 0.235, 0.052, 0.33);
    foot.scale.y *= 0.72;
    rig.add(foot); // feet stay planted: they do not inherit the torso lean
    feet.push(foot);
  }

  // Stubby fluff tail.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.17, -0.36);
  const tail = part(new SphereGeometry(0.095, 14, 10), furHex);
  tail.scale.set(1, 0.85, 0.7);
  tailPivot.add(tail);
  body.add(tailPivot);

  function apply(P) {
    ears[0].rotation.z = -0.18 - P.ear * 0.6 - P.collapse * 0.4;
    ears[1].rotation.z = 0.18 + P.ear * 0.5 + P.collapse * 0.4;
    tailPivot.rotation.y = P.tail * 0.5;

    // Cast = shield bash: the block leads forward and up on the release while
    // the torso counter-rotates (driver `yaw`), so Heavy Slam reads as an
    // anticipation + impact pose instead of the idle stance.
    const thrust = Math.max(0, P.prop);
    const wind = Math.min(0, P.prop);
    shield.position.z = 0.28 * thrust + 0.14 * wind;
    shield.position.y = 0.53 + 0.1 * thrust;
    shield.position.x = 0.26 - 0.05 * thrust + 0.05 * wind;
    shield.rotation.x = -0.3 * thrust;
    shield.rotation.y = 0.5 * wind;

    // Walk: alternating planted feet.
    feet[0].position.z = 0.33 + 0.11 * P.stride;
    feet[1].position.z = 0.33 - 0.11 * P.stride;
    feet[0].position.y = 0.052 + 0.05 * Math.max(0, P.stride);
    feet[1].position.y = 0.052 + 0.05 * Math.max(0, -P.stride);

    shield.updateMatrix();
    aimArm(armR, gripWorld.copy(shieldGripLocal).applyMatrix4(shield.matrix));
    aimArm(armL, pawL.position);
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
      halfWidth: 0.335 * BODY_SCALE_X,
      hipY: HIP,
    },
  };
}
