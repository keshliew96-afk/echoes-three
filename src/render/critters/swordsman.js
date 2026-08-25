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
import {
  bell,
  bodyPanel,
  brushTail,
  mix,
  part,
  faceDecal,
  faceMarkings,
  exactHex,
  makeSwingSmear,
  mitten,
  makeArm,
  aimArm,
} from './common.js';
import { FALL_ANGLE } from './index.js';

const HIP = 0.155;
// Every garment's bottom ring is lifted clear of the floor. The ink hull is
// expanded in CLIP space, so a hem sitting exactly at y=0 pushed its hull BELOW
// the ground plane, where the floor and the identity-ring decal clipped it —
// round-3 F10 measured the healer's hem ink simply stopping partway along.
const HEM = 0.022;
const HEAD_C = 0.659;
const HEAD_R = 0.238;
const SX = 0.95, SY = 0.97, SZ = 1.03;
const EAR_TOP = 1.11;
// rad — the party's only asymmetric rest lean. §19.2 says "~8°"; round 3 ran
// 0.2 here and the walk clip stacked another 0.19 on top for a 22° pitch that
// hid the face and folded both ears into one spike. index.js additionally
// hard-clamps the sum at 0.21 rad (12.0°).
const LEAN = 0.12;

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
      [0, HEM],
      [0.155, HEM],
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
    pivot.position.set(side * 0.142, 0.168, -0.03);
    const ear = part(new ConeGeometry(0.082, 0.3, 12), furHex);
    ear.position.y = 0.15;
    pivot.add(ear);
    // Slightly WIDER than the parent cone at the same height, so the dark tip
    // encloses the ear instead of z-fighting with it (matched radii speckled
    // dark streaks down the inside of both ears in the closeup capture).
    const tip = part(new ConeGeometry(0.034, 0.115, 10), mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.35).getHex());
    tip.position.y = 0.2425;
    pivot.add(tip);
    pivot.rotation.z = side * -0.27; // splayed: the pair stays two spikes
    pivot.rotation.x = -0.08;
    head.add(pivot);
    ears.push(pivot);
  }

  // --- Fox brush (round-3 F11: it read as a rigid traffic cone).
  // Three things make it a BRUSH now: the spine is an S — back, out, down, then
  // hooked UP at the tip — so the silhouette carries a curve instead of a
  // straight taper; the taper is halved (0.34, so the tip is 66% of the base
  // rather than 38%) so it stays fat like fur rather than narrowing to a point;
  // and the Bone tip is closed with a rounded cap placed at the hook, which is
  // the part of the tail the 3/4 camera can actually see against background.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.215, -0.07);
  body.add(tailPivot);
  const TAIL_R = 0.115;
  // The spine drops as it sweeps: under a 3/4 camera every unit of -Z lifts a
  // mass up the screen, so a level tail projects beside the shoulder and reads
  // as a raised paw (which is exactly what the first pass at this fix did).
  // Ending BELOW the root, out to the side and back, lands the brush at hip
  // height where a fox tail belongs, and the final control point hooks it up
  // again so the Bone tip is silhouetted against background.
  const tailCurve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(-0.16, -0.07, -0.03),
    new Vector3(-0.32, -0.13, -0.06),
    new Vector3(-0.45, -0.125, -0.09),
    new Vector3(-0.55, -0.03, -0.1), // the hook: lifts the Bone tip into view
  ]);
  // Bone, NOT Parchment: a near-Parchment tip on a LIT toon material clears the
  // composer's bloom threshold under the key light and the brush turned into a
  // glowing white blob beside the shoulder. Bone is the brightest palette value
  // that stays a solid colour here.
  const tipHex = mix(PALETTE.bone, PALETTE.parchment, 0.15).getHex();
  const brush = brushTail(tailCurve, {
      radius: TAIL_R,
      // Russet base, Bone tip: on the fox's pale tan fur a Bone tip alone has
      // barely two value steps of contrast and the "white-tipped tail" species
      // tell disappears. Darkening the base is what makes the tip read.
      colorA: mix(fur, PALETTE.bruiseUmber, 0.72).getHex(),
      colorB: tipHex,
      split: 0.56, // the last ~44% goes Bone — a TIP, not a white tail
      tubular: 34,
  });
  tailPivot.add(brush);
  tailPivot.add(brush.userData.cap);

  // --- Sword (round-3 F2: the blade vanished through most of the attack).
  // The cause was the swing rotating about Y and X, which aligned the blade
  // axis with the view vector on the release frames — a 4-sided flat blade seen
  // end-on is ~3 px of nothing. The swing is now confined to ONE axis, Z, which
  // is the axis whose arc lies in the camera plane at every gameplay elevation,
  // so the blade sweeps as a broad diagonal line and is never foreshortened
  // past its own width. Constant small X/Y tilts keep it from looking like a
  // flat cut-out without ever pointing it at the lens.
  const SWORD_REST_Z = -0.65;
  const SWORD_ARC = 1.5; // rad each way -> a 172° wind-up-to-release arc
  const sword = new Group();
  sword.position.set(0.26, 0.31, 0.08);
  sword.rotation.z = SWORD_REST_Z;
  sword.rotation.x = -0.15;
  sword.rotation.y = 0.12;
  body.add(sword);
  const blade = part(
    new CylinderGeometry(0.008, 0.046, 0.5, 4),
    // Steel, not light: mixed toward Parchment the LIT blade cleared the
    // composer's bloom threshold and the sword grew an emitter halo, which
    // REFERENCE_BAR reserves for actual light sources.
    mix(PALETTE.bone, PALETTE.warmGrey, 0.24).getHex()
  );
  // NO yaw on the blade: a 4-segment cylinder puts its vertices on +-X/+-Z, so
  // squashing Z alone gives a diamond section whose BROAD face is the XY plane
  // — the plane the swing lives in. Rotating it 45 degrees (as round 3 did)
  // turned the broad face diagonal and the blade measured ~2 px on screen.
  blade.scale.z = 0.34;
  blade.position.y = 0.28;
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

  // Swing smear: the release layer REFERENCE_BAR check 10 asks for. It shares
  // the sword's pivot and plane, so the arc it paints is exactly the arc the
  // blade travelled, with the leading edge welded to the blade.
  const smear = makeSwingSmear({ innerR: 0.13, outerR: 0.62, span: 1.7, color: PALETTE.parchment });
  smear.position.copy(sword.position);
  smear.rotation.x = sword.rotation.x;
  smear.rotation.y = sword.rotation.y;
  body.add(smear);
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

  function apply(P, t, fallSign = 1) {
    ears[0].rotation.z = -0.22 - P.ear - P.collapse * 0.45;
    ears[1].rotation.z = 0.22 + P.ear * 0.85 + P.collapse * 0.45;
    ears[0].rotation.x = -0.12 + 0.4 * Math.min(0, P.ear * 1.6);
    ears[1].rotation.x = ears[0].rotation.x;
    tailPivot.rotation.y = 0.3 * P.tail;
    tailPivot.rotation.x = 0.12 * P.tail - 0.45 * P.collapse;

    // Cast = slash: blade cocked back over the shoulder on the wind-up
    // (prop -1 -> z +0.85), then a 172° sweep down and across on the release
    // (prop +1 -> z -2.15). Pure Z, so the blade stays broadside to the camera
    // for every frame of the clip.
    // Downed (round-3 F8): counter-rotate the collapse so the blade lies FLAT
    // on the ground beside the fox, in front of the body, instead of being
    // flung behind it where the capture found nothing at all.
    const lay = P.collapse;
    const flat = -fallSign * (Math.PI / 2 + FALL_ANGLE) + 0.25;
    const swingZ = (SWORD_REST_Z - SWORD_ARC * P.prop) * (1 - lay) + flat * lay;
    sword.rotation.z = swingZ;
    sword.rotation.x = (-0.15 - 0.08 * Math.max(0, P.prop)) * (1 - lay);
    sword.rotation.y = 0.12 * (1 - lay);
    sword.position.set(0.26 * (1 - lay) + 0.04 * lay, 0.31 * (1 - lay) + 0.1 * lay, 0.08 + 0.3 * lay);
    // Smear trails the blade: its leading edge sits on the blade axis.
    smear.rotation.z = swingZ + Math.PI / 2;
    smear.material.uniforms.uOpacity.value = 0.85 * P.swing;
    smear.visible = P.swing > 0.02;

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
      ringRadius: 0.46,
      hipY: HIP,
    },
  };
}
