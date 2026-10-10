// Tidecaller — chibi river otter, Rill (docs/TIDECALLER.md, the plan's §1).
// Class accent CLASS_ACCENTS.tidecaller (river blue).
//
// Silhouette contract: a LONG LOW BODY with a thick tapering TAIL behind and
// a tall reed staff on one side topped with a shell. The party's other
// shapes are a tall thin column with ear spikes (the hare), a wide block (the
// badger), a pointed pair of ears (the fox) and a round cloak (the mouse);
// the otter is the only one whose mass runs backwards along the ground, and
// the only one whose prop stands taller than her head.
//
// A dark-brown otter with a cream throat and muzzle, small round ears, a
// dripping satchel on the hip and a conch on a cord. Cast = the staff rises
// and dips toward the aim; the tail sweeps on the walk.
import { CapsuleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { bell, bodyPanel, mix, part, faceDecal, faceMarkings, exactHex, mitten, makeArm, aimArm } from './common.js';

const HIP = 0.15;
const HEM = 0.022;
const HEAD_C = 0.64;
const HEAD_R = 0.255;
const SX = 1.04, SY = 0.94, SZ = 0.98;
const STAFF_X = 0.27;
const STAFF_Y = 0.12;
const STAFF_Z = 0.1;
const STAFF_LEN = 1.02;

export function buildTidecaller(rig, trackAccent) {
  const accent = CLASS_ACCENTS.tidecaller;
  const fur = mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.16);
  const furHex = fur.getHex();
  const furDark = mix(fur, PALETTE.voidCharcoal, 0.3).getHex();
  const cream = PALETTE.bone; // Bone stays under the bloom threshold (Parchment glared)
  const reed = mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.5).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  // --- Long low body: a broad bell, stretched front to back.
  const coat = part(
    bell([
      [0, HEM],
      [0.16, HEM],
      [0.2, 0.05],
      [0.215, 0.14],
      [0.205, 0.26],
      [0.18, 0.36],
      [0.14, 0.43],
      [0.1, 0.47],
      [0, 0.49],
    ]),
    furHex
  );
  coat.scale.set(1, 1, 1.14);
  body.add(coat);

  // Cream throat and belly panel.
  const belly = bodyPanel(
    [
      [0.21, 0.1],
      [0.212, 0.2],
      [0.195, 0.3],
      [0.165, 0.38],
      [0.13, 0.44],
    ],
    { color: cream, phiLength: 1.25 }
  );
  belly.scale.z = 1.14;
  body.add(belly);

  // River-blue sash across the chest (the class accent) with a shell clasp.
  const sashMat = trackAccent(toonMaterial({ color: accent }));
  const sash = part(new TorusGeometry(0.2, 0.026, 8, 30), accent, { mat: sashMat });
  sash.rotation.set(Math.PI / 2 - 0.15, 0.55, 0);
  sash.position.y = 0.3;
  sash.scale.set(1, 1.14, 1);
  body.add(sash);

  // Satchel on the left hip, accent-dark, with a drip of water under it.
  const satchelMat = trackAccent(toonMaterial({ color: mix(accent, PALETTE.voidCharcoal, 0.3).getHex() }));
  const satchel = part(new CapsuleGeometry(0.07, 0.06, 4, 10), accent, { mat: satchelMat });
  satchel.scale.set(1, 0.9, 0.62);
  satchel.position.set(-0.2, 0.2, 0.06);
  satchel.rotation.z = 0.2;
  body.add(satchel);
  const drip = new Mesh(new SphereGeometry(0.018, 8, 6), toonMaterial({ color: mix(PALETTE.signalBlue, PALETTE.parchment, 0.4).getHex() }));
  drip.scale.set(1, 1.5, 1);
  drip.position.set(-0.21, 0.11, 0.07);
  body.add(drip);

  // --- Head: round and a touch wide, small ears set low.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skull = part(new SphereGeometry(HEAD_R, 28, 22), furHex);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);

  const creamHex = exactHex(cream);
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        // The otter's pale muzzle and chin, wide and low.
        ctx.fillStyle = creamHex;
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.8, S * 0.26, S * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.95, S * 0.2, S * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    })
  );

  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.19, 0.13, -0.04);
    const ear = part(new SphereGeometry(0.058, 12, 10), furDark);
    ear.scale.set(1, 0.85, 0.55);
    pivot.add(ear);
    head.add(pivot);
    ears.push(pivot);
  }

  // Broad whiskered muzzle and a big dark nose.
  const snout = part(new SphereGeometry(0.095, 16, 12), cream);
  snout.scale.set(1.15, 0.66, 0.8);
  snout.position.set(0, -0.11, SZ * HEAD_R * 0.78);
  head.add(snout);
  const nose = part(new SphereGeometry(0.03, 10, 8), PALETTE.voidCharcoal, { ink: false });
  nose.scale.set(1.3, 0.8, 1);
  nose.position.set(0, -0.075, SZ * HEAD_R * 0.78 + 0.07);
  head.add(nose);
  for (const side of [-1, 1]) {
    for (const k of [0, 1]) {
      const wh = new Mesh(new CylinderGeometry(0.0045, 0.0045, 0.13, 4), toonMaterial({ color: PALETTE.bone }));
      wh.rotation.z = Math.PI / 2 + side * (0.12 + k * 0.16);
      wh.position.set(side * 0.13, -0.11 - k * 0.02, SZ * HEAD_R * 0.78 + 0.02);
      head.add(wh);
    }
  }

  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.088, eyeH: 0.11, spread: 0.2, drop: 0.55 }));

  // Conch on a cord at the throat.
  const conch = part(new ConeGeometry(0.04, 0.09, 10), PALETTE.bone);
  conch.rotation.set(0.3, 0, 2.2);
  conch.position.set(0.04, 0.42, 0.205);
  body.add(conch);

  // --- The tail: three tapering segments trailing behind along the ground,
  // the otter's signature mass.
  const tailRoot = new Group();
  tailRoot.position.set(0, 0.13, -0.2);
  body.add(tailRoot);
  const tailSegs = [];
  let parent = tailRoot;
  for (const [r, len] of [[0.075, 0.13], [0.06, 0.12], [0.042, 0.11]]) {
    const pivot = new Group();
    parent.add(pivot);
    const seg = part(new CapsuleGeometry(r, len, 4, 10), furHex);
    seg.rotation.x = Math.PI / 2 + 0.25;
    seg.position.set(0, -0.02, -len * 0.55);
    pivot.add(seg);
    const next = new Group();
    next.position.set(0, -0.045, -len * 0.95);
    pivot.add(next);
    tailSegs.push(pivot);
    parent = next;
  }

  // --- Staff: a tall reed with a cupped shell and a bead of water on top.
  const staff = new Group();
  staff.position.set(STAFF_X, STAFF_Y, STAFF_Z);
  body.add(staff);
  const shaft = part(new CylinderGeometry(0.018, 0.022, STAFF_LEN, 8), reed);
  shaft.position.y = STAFF_LEN / 2;
  staff.add(shaft);
  for (const y of [0.32, 0.58, 0.82]) {
    const node = part(new CylinderGeometry(0.026, 0.026, 0.025, 8), mix(reed, PALETTE.voidCharcoal, 0.25).getHex(), { ink: false });
    node.position.y = y;
    staff.add(node);
  }
  const shellMat = trackAccent(toonMaterial({ color: mix(PALETTE.parchment, accent, 0.25).getHex() }));
  const shell = part(new SphereGeometry(0.07, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), PALETTE.parchment, { mat: shellMat });
  shell.rotation.x = Math.PI;
  shell.position.y = STAFF_LEN + 0.05;
  staff.add(shell);
  const bead = new Mesh(new SphereGeometry(0.04, 12, 10), toonMaterial({ color: mix(PALETTE.signalBlue, PALETTE.parchment, 0.35).getHex() }));
  bead.position.y = STAFF_LEN + 0.07;
  staff.add(bead);
  const gripPaw = mitten(furHex, 0.056);
  gripPaw.position.set(0, 0.36, 0.035);
  staff.add(gripPaw);
  const gripLocal = new Vector3(0, 0.36, 0.02);
  const gripWorld = new Vector3();

  // --- Arms + webbed feet.
  const armL = makeArm(furHex, 0.05, 0.19);
  armL.position.set(-0.2, 0.36, 0.08);
  body.add(armL);
  const armR = makeArm(furHex, 0.05, 0.19);
  armR.position.set(0.2, 0.36, 0.07);
  body.add(armR);
  const freePaw = mitten(furHex, 0.05);
  body.add(freePaw);

  const feet = [];
  for (const side of [-1, 1]) {
    const foot = mitten(furDark, 0.064);
    foot.position.set(side * 0.11, 0.046, 0.21);
    foot.scale.multiply(new Vector3(1.15, 0.7, 1.15));
    rig.add(foot);
    feet.push(foot);
  }

  function apply(P, t = 0, fallSign = 1) {
    ears[0].rotation.z = 0.25 * P.ear;
    ears[1].rotation.z = 0.25 * P.ear;
    // The tail sweeps side to side with the stride and the idle sway, each
    // segment a little later than the one before.
    const sway = P.tail * 0.5 + P.stride * 0.18;
    tailSegs.forEach((s, i) => {
      s.rotation.y = sway * (0.6 + i * 0.35);
      s.rotation.x = -0.08 * i + P.collapse * 0.3;
    });

    // Cast = the staff lifts and leans toward the aim, the free paw pushes
    // forward as if throwing the water.
    const lift = Math.max(0, P.prop);
    const wind = Math.min(0, P.prop);
    staff.position.y = STAFF_Y + 0.12 * lift + 0.03 * wind;
    staff.position.z = STAFF_Z + 0.08 * lift;
    staff.rotation.x = 0.42 * lift - 0.1 * wind;
    staff.rotation.z = -0.1 - 0.12 * lift + P.collapse * fallSign * 0.6;
    freePaw.position.set(-0.17 + 0.06 * lift, 0.34 + 0.1 * lift, 0.12 + 0.16 * lift + 0.04 * wind);

    feet[0].position.z = 0.21 + 0.09 * P.stride;
    feet[1].position.z = 0.21 - 0.09 * P.stride;
    feet[0].position.y = 0.046 + 0.045 * Math.max(0, P.stride);
    feet[1].position.y = 0.046 + 0.045 * Math.max(0, -P.stride);

    drip.position.y = 0.11 - ((t * 0.6) % 1) * 0.06;

    staff.updateMatrix();
    aimArm(armR, gripWorld.copy(gripLocal).applyMatrix4(staff.matrix));
    aimArm(armL, freePaw.position);
  }

  return {
    apply,
    torso,
    head,
    basePitch: 0.03,
    metrics: {
      standHeight: STAFF_Y + STAFF_LEN + 0.11,
      earTopY: HEAD_C + 0.2,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.25,
      ringRadius: 0.47,
      hipY: HIP,
    },
  };
}
