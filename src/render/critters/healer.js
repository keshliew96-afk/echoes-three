// Healer — chibi mouse (BUILD_BRIEF §19.2): softest CLOSED bell cloak in Sage
// #33513C, small round ears, short snout, staff held center-low/vertical with
// a glowing Bright Heal gem that brightens on cast.
import { CylinderGeometry, Group, Mesh, OctahedronGeometry, QuadraticBezierCurve3, SphereGeometry, TubeGeometry, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { toonMaterial, addOutline } from '../toon.js';
import { makeGlowSprite } from '../glow.js';
import { bell, mix, addEyes, mitten } from './common.js';

export function buildHealer(rig, trackAccent) {
  const accent = CLASS_ACCENTS.healer;
  const fur = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.22).lerp(mix(PALETTE.bone, PALETTE.bone, 0), 0.15);

  // Closed bell cloak — the softest, roundest profile of the party.
  const cloakMat = trackAccent(toonMaterial({ color: accent }));
  const cloak = new Mesh(
    bell([
      [0, 0],
      [0.21, 0],
      [0.29, 0.03],
      [0.305, 0.15],
      [0.275, 0.3],
      [0.21, 0.46],
      [0.15, 0.56],
      [0.09, 0.62],
      [0, 0.64],
    ]),
    cloakMat
  );
  addOutline(cloak);
  rig.add(cloak);

  // Bone belly panel on the cloak front (storybook trim).
  const belly = new Mesh(new SphereGeometry(0.115, 16, 12), toonMaterial({ color: PALETTE.bone }));
  belly.scale.set(1, 1.45, 0.42);
  belly.position.set(0, 0.22, 0.215);
  rig.add(belly);

  // Head: big soft ball, ~42% of standing height.
  const headC = 0.8;
  const R = 0.22;
  const sx = 1.02, sy = 0.96, sz = 0.98;
  const head = new Group();
  head.position.y = headC;
  const skull = new Mesh(new SphereGeometry(R, 26, 20), toonMaterial({ color: fur.getHex() }));
  skull.scale.set(sx, sy, sz);
  addOutline(skull);
  head.add(skull);

  // Small round mouse ears + inner-ear blush.
  const earGeo = new SphereGeometry(0.088, 16, 12);
  const innerGeo = new SphereGeometry(0.052, 12, 10);
  const innerMat = toonMaterial({ color: mix(PALETTE.bone, CLASS_ACCENTS.swordsman, 0.3).getHex() });
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.145, 0.135, -0.02);
    const ear = new Mesh(earGeo, skull.material);
    ear.scale.set(1, 1, 0.45);
    ear.position.y = 0.05;
    addOutline(ear);
    pivot.add(ear);
    const inner = new Mesh(innerGeo, innerMat);
    inner.scale.set(1, 1, 0.3);
    inner.position.set(0, 0.05, 0.045);
    pivot.add(inner);
    pivot.rotation.z = side * -0.28;
    head.add(pivot);
    ears.push(pivot);
  }

  // Short snout + ink nose.
  const snout = new Mesh(new SphereGeometry(0.075, 14, 10), toonMaterial({ color: PALETTE.bone }));
  snout.scale.set(0.85, 0.62, 0.95);
  snout.position.set(0, -0.075, sz * R * 0.82);
  addOutline(snout, { thickness: 0.016 });
  head.add(snout);
  const nose = new Mesh(new SphereGeometry(0.024, 10, 8), toonMaterial({ color: PALETTE.voidCharcoal }));
  nose.position.set(0, -0.055, sz * R * 0.82 + 0.062);
  head.add(nose);

  addEyes(head, { rx: R * sx, ry: R * sy, rz: R * sz });
  rig.add(head);

  // Thin curled mouse tail.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.1, -0.24);
  const tailCurve = new QuadraticBezierCurve3(
    new Vector3(0, 0, 0),
    new Vector3(0.06, -0.06, -0.16),
    new Vector3(0.2, 0.02, -0.26)
  );
  const tail = new Mesh(new TubeGeometry(tailCurve, 12, 0.018, 6), toonMaterial({ color: fur.getHex() }));
  tailPivot.add(tail);
  rig.add(tailPivot);

  // Staff held vertical, center-low, with the Bright Heal gem + glow halo.
  // Offset far enough off the face centerline that the gem glow never washes
  // over the near eye (at x=0.15 it swallowed one eye — verified in capture).
  const staff = new Group();
  staff.position.set(0.22, 0, 0.27);
  const shaft = new Mesh(
    new CylinderGeometry(0.022, 0.028, 0.88, 10),
    toonMaterial({ color: mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.35).getHex() })
  );
  shaft.position.y = 0.48;
  addOutline(shaft, { thickness: 0.014 });
  staff.add(shaft);
  const gemMat = toonMaterial({ color: PALETTE.brightHeal });
  gemMat.emissive.set(PALETTE.brightHeal);
  gemMat.emissiveIntensity = 0.5;
  const gem = new Mesh(new OctahedronGeometry(0.062), gemMat);
  gem.position.y = 0.96;
  addOutline(gem, { thickness: 0.014 });
  staff.add(gem);
  const glow = makeGlowSprite({ color: PALETTE.brightHeal, size: 0.34, opacity: 0.45 });
  glow.position.y = 0.96;
  staff.add(glow);
  rig.add(staff);

  // Mitten paws gripping the shaft.
  const pawA = mitten(fur.getHex());
  pawA.position.set(0.17, 0.38, 0.26);
  rig.add(pawA);
  const pawB = mitten(fur.getHex());
  pawB.position.set(0.25, 0.3, 0.275);
  rig.add(pawB);

  const staffRestY = 0;
  function apply(P, t) {
    ears[0].rotation.z = -0.28 - P.ear - P.collapse * 0.5;
    ears[1].rotation.z = 0.28 + P.ear * 0.8 + P.collapse * 0.5;
    tailPivot.rotation.y = P.tail;
    staff.position.y = staffRestY + 0.24 * P.prop;
    staff.rotation.x = -0.12 * Math.max(0, P.prop);
    const heat = P.gem * (1 - P.desat);
    gemMat.emissiveIntensity = 0.25 + 1.3 * heat;
    gemMat.color.set(PALETTE.brightHeal).lerp(mix('#FFFFFF', '#FFFFFF', 0), heat * 0.55);
    glow.material.opacity = 0.2 + 0.65 * heat;
    const gs = 0.34 * (1 + 0.5 * heat);
    glow.scale.set(gs, gs, 1);
    gem.rotation.y = t * 1.2;
  }

  return {
    apply,
    metrics: { standHeight: headC + R * sy, headTopY: headC + R * sy, headBottomY: headC - R * sy },
    halfWidth: 0.31,
  };
}
