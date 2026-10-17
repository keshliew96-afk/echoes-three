// Duskwing — chibi fruit bat, Sable (docs/DUSKWING.md).
// Class accent CLASS_ACCENTS.duskwing (dusk plum).
//
// Silhouette contract: two BIG LEAF EARS splayed wide (broad roots, pointed
// tips), and a pair of leather WINGS folded at his sides like a cloak that
// snap wide when he strikes. The party's other shapes are a tall thin column with ear
// spikes (the hare), a wide block (the badger), a pointed pair of ears close
// together (the fox), a round cloak (the mouse), a long low body with a tall
// staff (the otter) and a domed shell under a belfry (the beetle); the bat
// is the only one whose outline changes width on a cast, and the only one
// with wings.
//
// A plum-brown furry body with a pale chest ruff, a pug nose and two small
// fangs, rose ear linings, and wing membranes in a darker leather with the
// finger bones drawn over them. Cast = both wings flare out and beat once;
// the walk is a hop with the wings half open, beating.
import { ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, Mesh, Shape, SphereGeometry, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE, VFX_SIGNATURE } from '../../data/palette.js';
import { toonMaterial } from '../toon.js';
import { bell, bodyPanel, mix, part, faceDecal, mitten, addInk } from './common.js';

const HIP = 0.14;
const HEM = 0.02;
const HEAD_C = 0.56;
const HEAD_R = 0.215;
const SX = 1.05, SY = 0.95, SZ = 1.0;
const EAR_H = 0.27;
const SHOULDER_Y = 0.37;
const WING = 1.0; // membrane scale

// One wing's membrane in its own plane (x out from the shoulder, y up): a
// leading bone up to the wrist, out to the tip, then three scalloped
// hollows back to the body. `side` mirrors it (+1 his right, -1 his left).
const FINGERS = [
  [0.4, 0.06], // the tip (third finger)
  [0.31, -0.11], // second finger
  [0.18, -0.17], // first finger
];
function wingGeometry(side) {
  const s = new Shape();
  const X = (x) => x * side * WING;
  const Y = (y) => y * WING;
  s.moveTo(X(0), Y(0.05));
  s.lineTo(X(0.15), Y(0.15)); // the wrist
  s.lineTo(X(FINGERS[0][0]), Y(FINGERS[0][1]));
  s.quadraticCurveTo(X(0.32), Y(0.0), X(FINGERS[1][0]), Y(FINGERS[1][1]));
  s.quadraticCurveTo(X(0.22), Y(-0.06), X(FINGERS[2][0]), Y(FINGERS[2][1]));
  s.quadraticCurveTo(X(0.09), Y(-0.08), X(0.02), Y(-0.16));
  s.lineTo(X(0), Y(-0.08));
  s.lineTo(X(0), Y(0.05));
  const geo = new ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: false, curveSegments: 6 });
  geo.translate(0, 0, -0.007);
  return geo;
}

export function buildDuskwing(rig, trackAccent) {
  const accent = CLASS_ACCENTS.duskwing;
  const fur = mix(mix(accent, PALETTE.bruiseUmber, 0.35), PALETTE.bone, 0.07);
  const furHex = fur.getHex();
  const furDark = mix(fur, PALETTE.voidCharcoal, 0.4).getHex();
  const ruff = mix(PALETTE.bone, PALETTE.paleGold, 0.3).getHex();
  const leather = mix(accent, PALETTE.voidCharcoal, 0.35).getHex();
  const rose = mix(VFX_SIGNATURE.duskwing.glow, accent, 0.35).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  // --- Plump furry body: a pear, narrower at the shoulders than the fox's.
  const coat = part(
    bell([
      [0, HEM],
      [0.15, HEM],
      [0.2, 0.06],
      [0.215, 0.15],
      [0.2, 0.26],
      [0.17, 0.35],
      [0.12, 0.42],
      [0.06, 0.46],
      [0, 0.47],
    ]),
    furHex
  );
  body.add(coat);
  // The pale chest ruff, a shaggy bib under the chin.
  const bib = bodyPanel(
    [
      [0.205, 0.17],
      [0.2, 0.26],
      [0.178, 0.34],
      [0.14, 0.41],
    ],
    { color: ruff, phiLength: 1.25, grow: 1.08 }
  );
  body.add(bib);

  // --- Head: round, big eyes, a pug nose and two fangs.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skull = part(new SphereGeometry(HEAD_R, 26, 20), furHex);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.115, eyeH: 0.13, spread: 0.2, drop: 0.52 }));
  const nose = part(new SphereGeometry(0.036, 12, 10), rose);
  nose.scale.set(1.3, 0.8, 0.9);
  nose.position.set(0, -0.055, SZ * HEAD_R * 0.94);
  head.add(nose);
  for (const side of [-1, 1]) {
    const fang = part(new ConeGeometry(0.012, 0.04, 6), PALETTE.parchment, { ink: false });
    fang.rotation.x = Math.PI;
    fang.position.set(side * 0.032, -0.11, SZ * HEAD_R * 0.86);
    head.add(fang);
  }
  // A tuft of fur on the crown.
  const tuft = part(new ConeGeometry(0.035, 0.07, 8), furDark);
  tuft.position.set(0, HEAD_R * SY * 0.98, 0.02);
  tuft.rotation.x = 0.4;
  head.add(tuft);

  // --- The ears: tall, wide-set, splayed, rose inside. His key.
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.13, 0.12, -0.01);
    head.add(pivot);
    // A broad leaf: a cone with a rounded root, flattened front to back,
    // so the tip is a point (a bat's) and not a disc (the mouse's).
    const ear = part(new ConeGeometry(0.09, EAR_H, 16, 1), furHex);
    ear.scale.set(1, 1, 0.42);
    ear.position.y = EAR_H * 0.5;
    pivot.add(ear);
    const lining = part(new ConeGeometry(0.062, EAR_H * 0.8, 14, 1), rose, { ink: false });
    lining.scale.set(1, 1, 0.3);
    lining.position.set(0, EAR_H * 0.44, 0.022);
    pivot.add(lining);
    ears.push(pivot);
  }

  // --- The wings: leather membranes on the shoulders, finger bones over
  // them. Folded they hang at his sides; spread they open wide.
  const wingMat = trackAccent(toonMaterial({ color: leather, side: DoubleSide }));
  const wings = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.position.set(side * 0.15, SHOULDER_Y, -0.05);
    body.add(shoulder);
    const flap = new Group();
    shoulder.add(flap);
    const membrane = new Mesh(wingGeometry(side), wingMat);
    addInk(membrane);
    flap.add(membrane);
    // The arm and finger bones, drawn in the darker fur over the membrane.
    const boneHex = furDark;
    const bones = [
      [[0, 0.05], [0.15, 0.15]],
      [[0.15, 0.15], FINGERS[0]],
      [[0.15, 0.15], FINGERS[1]],
      [[0.15, 0.15], FINGERS[2]],
    ];
    for (const [[x0, y0], [x1, y1]] of bones) {
      const ax = x0 * side * WING;
      const ay = y0 * WING;
      const bx = x1 * side * WING;
      const by = y1 * WING;
      const len = Math.hypot(bx - ax, by - ay);
      const bone = new Mesh(new CylinderGeometry(0.008, 0.011, len, 5), toonMaterial({ color: boneHex }));
      bone.position.set((ax + bx) / 2, (ay + by) / 2, 0.009);
      bone.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
      flap.add(bone);
    }
    // A small hooked thumb claw at the wrist.
    const thumb = part(new ConeGeometry(0.014, 0.04, 6), PALETTE.bone, { ink: false });
    thumb.position.set(0.15 * side * WING, 0.17 * WING, 0.01);
    thumb.rotation.z = -side * 0.5;
    flap.add(thumb);
    wings.push({ side, shoulder, flap });
  }

  // --- Little clawed feet.
  const feet = [];
  for (const side of [-1, 1]) {
    const foot = mitten(furDark, 0.05);
    foot.position.set(side * 0.1, 0.04, 0.13);
    foot.scale.multiply(new Vector3(1.0, 0.7, 1.3));
    rig.add(foot);
    feet.push(foot);
  }

  function apply(P, t = 0, fallSign = 1) {
    // Ears prick with the idle sway, splay a touch on the stride.
    ears.forEach((e, k) => {
      const side = k === 0 ? -1 : 1;
      e.rotation.z = side * (-0.5 - 0.1 * P.ear - 0.05 * Math.abs(P.stride)) + side * P.collapse * 0.5;
      e.rotation.x = -0.08 + 0.12 * P.ear;
    });

    // Wings: folded at his sides at rest; half open and beating on the
    // walk; flared wide with one hard beat on a cast; shut when he falls.
    const lift = Math.max(0, P.prop);
    const wind = Math.min(0, P.prop);
    const walk = Math.min(1, Math.abs(P.stride) * 1.6);
    const open = Math.max(0, Math.min(1, lift * 1.15 + walk * 0.35 - wind * 0.4)) * (1 - P.collapse);
    const beat = Math.sin(t * (lift > 0.1 ? 22 : 15)) * (0.32 * lift + 0.22 * walk);
    for (const w of wings) {
      // yaw: folded = swung half back beside him; open = out to his sides.
      w.shoulder.rotation.y = w.side * (0.7 * (1 - open) + 0.1);
      // droop: folded hangs down; open lifts to the horizontal, then beats.
      w.shoulder.rotation.z = w.side * (-0.95 * (1 - open) + 0.1 * open + beat);
      w.flap.rotation.x = 0.15 * (1 - open) + 0.06 * Math.sin(t * 1.6 + w.side);
      w.flap.scale.setScalar(0.8 + 0.2 * open);
    }

    feet[0].position.z = 0.13 + 0.08 * P.stride;
    feet[1].position.z = 0.13 - 0.08 * P.stride;
    feet[0].position.y = 0.04 + 0.05 * Math.max(0, P.stride);
    feet[1].position.y = 0.04 + 0.05 * Math.max(0, -P.stride);
    void fallSign;
  }

  return {
    apply,
    torso,
    head,
    basePitch: 0.04,
    metrics: {
      standHeight: HEAD_C + 0.13 + EAR_H,
      earTopY: HEAD_C + 0.13 + EAR_H,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.24,
      ringRadius: 0.46,
      hipY: HIP,
    },
  };
}
