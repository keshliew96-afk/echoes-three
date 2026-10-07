// QUILL, THE CHRONICLER — a magpie perched on the map table, an inkpot with a
// quill at her side and a half-unrolled scroll at her feet.
//
// A black bird on a night ground is the hard case for legibility, so the read
// is built from VALUE, not hue: the magpie's own white belly and white
// shoulder patches (scapulars) are the brightest masses on the figure, the
// black is a cool charcoal one step above the ink so the outline still frames
// it, and the wings + long tail carry the blue-green sheen as a lit toon
// colour. From the 52-degree camera the long tilted tail and the two white
// shoulder flashes are what make it a magpie at a glance.
//
// Faces +Z. Origin at the feet (index.js lifts it by perchY).
import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  Vector2,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { bodyPanel, mix } from '../critters/common.js';
import { canvasTexture, npcFace, pulse, schedule, seeded, smooth } from './common.js';

const BLACK = '#2C3038'; // cool charcoal, one value step above the ink
const SHEEN = '#2F6670'; // blue-green iridescence (h189)
const SHEEN_TAIL = '#2E6A5E'; // greener on the tail (h168)
const WHITE = '#E8E4DA';
const BEAK = '#3A3D44';
const PAPER = '#E8DCC0';

const HEAD_Y = 0.43;
const HR = 0.105;

export function buildChronicler(rig, kit) {
  const { part, mat } = kit;
  const rand = seeded('chronicler');

  const hop = new Group();
  rig.add(hop);
  const torso = new Group();
  hop.add(torso);

  // Body: a small egg tilted forward a touch (alert bird posture).
  const body = part(
    new LatheGeometry(
      [
        [0, 0.07],
        [0.07, 0.075],
        [0.115, 0.12],
        [0.135, 0.2],
        [0.125, 0.28],
        [0.095, 0.34],
        [0.06, 0.375],
        [0, 0.385],
      ].map(([x, y]) => new Vector2(x, y)),
      14
    ),
    BLACK,
    { name: 'magpie-body' }
  );
  torso.add(body);
  torso.rotation.x = 0.12;
  // White belly: the bird's brightest mass.
  const belly = bodyPanel(
    [
      [0.1, 0.1],
      [0.13, 0.16],
      [0.135, 0.22],
      [0.12, 0.28],
    ],
    { color: WHITE, phiLength: 2.4, grow: 1.03, segments: 12 }
  );
  belly.material.emissive = mix(WHITE, '#000000', 0.86);
  torso.add(belly);

  // Wings folded on the flanks, sheen colour, with the white scapular flash
  // on the shoulder of each.
  const wingGeo = new SphereGeometry(1, 10, 7);
  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.11, 0.27, 0.0);
    torso.add(pivot);
    const w = part(wingGeo, SHEEN, { name: 'wing' });
    w.scale.set(0.045, 0.1, 0.17);
    w.position.set(side * 0.01, -0.06, -0.06);
    w.rotation.x = 0.55;
    pivot.add(w);
    const scap = part(wingGeo, WHITE, { ink: false });
    scap.scale.set(0.04, 0.05, 0.075);
    scap.position.set(side * 0.022, -0.01, 0.0);
    scap.rotation.x = 0.4;
    pivot.add(scap);
    // dark primary tips past the tail root
    const tip = part(new ConeGeometry(0.035, 0.12, 6), BLACK, { ink: false });
    tip.rotation.x = -Math.PI / 2 - 0.5;
    tip.position.set(side * 0.012, -0.12, -0.2);
    pivot.add(tip);
    wings.push({ pivot, side });
  }

  // Tail: a long flattened wedge raised up-and-back — THE magpie feature.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.13, -0.1);
  torso.add(tailPivot);
  const tail = part(new ConeGeometry(0.065, 0.36, 4), SHEEN_TAIL, { name: 'tail' });
  tail.scale.set(1, 1, 0.3);
  tail.rotation.x = -Math.PI / 2 + 0.5; // cone +Y swung to point back and up
  tail.position.set(0, 0.086, -0.158);
  tailPivot.add(tail);

  // Legs + feet.
  const legGeo = new CylinderGeometry(0.01, 0.01, 0.08, 5);
  const toeGeo = new ConeGeometry(0.014, 0.06, 5);
  for (const side of [-1, 1]) {
    const leg = new Mesh(legGeo, mat(BEAK));
    leg.position.set(side * 0.045, 0.04, 0.0);
    hop.add(leg);
    const toe = new Mesh(toeGeo, mat(BEAK));
    toe.rotation.x = Math.PI / 2;
    toe.position.set(side * 0.045, 0.008, 0.025);
    hop.add(toe);
  }

  // Head
  const neck = new Group();
  neck.position.set(0, HEAD_Y, 0.03);
  hop.add(neck);
  const head = new Group();
  neck.add(head);
  const skull = part(new SphereGeometry(HR, 14, 10), BLACK, { name: 'skull' });
  skull.scale.set(1, 0.95, 1.05);
  head.add(skull);
  // Painted eyes with a light ring (sclera) so the dark bean still reads on
  // a black head, plus the Bone glint.
  head.add(npcFace({ R: HR, sy: 0.95, sz: 1.05, drop: 0.5, spread: 0.24, eyeW: 0.1, eyeH: 0.11, sclera: 0.45 }));
  // Beak: a straight dark wedge; the lower half hinges for talking.
  const beak = part(new ConeGeometry(0.03, 0.1, 6), BEAK);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.005, HR * 1.0 + 0.04);
  head.add(beak);
  const jaw = new Group();
  jaw.position.set(0, -0.02, HR * 0.95);
  head.add(jaw);
  const mand = part(new ConeGeometry(0.022, 0.075, 6), mix(BEAK, BLACK, 0.5).getHex(), { ink: false });
  mand.rotation.x = Math.PI / 2;
  mand.position.set(0, -0.004, 0.04);
  jaw.add(mand);

  // --- Props: scroll at the feet, inkpot + quill beside her.
  const props = new Group();
  rig.add(props); // not on the hop: the props stay on the table
  const sheetTex = canvasTexture(64, (ctx, w, h) => {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = mix(PAPER, PALETTE.voidCharcoal, 0.55).getStyle();
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const y = h * (0.18 + i * 0.16);
      ctx.beginPath();
      ctx.moveTo(w * 0.12, y);
      ctx.lineTo(w * (i === 4 ? 0.55 : 0.88), y);
      ctx.stroke();
    }
  }, 64);
  const sheet = new Mesh(new PlaneGeometry(0.16, 0.13), mat('#FFFFFF', { map: sheetTex, lift: 0.18 }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(-0.04, 0.006, 0.17);
  sheet.rotation.z = 0.15;
  props.add(sheet);
  const rollGeo = new CylinderGeometry(0.022, 0.022, 0.18, 10);
  const roll = part(rollGeo, PAPER, { lift: 0.18 });
  roll.rotation.z = Math.PI / 2;
  roll.rotation.y = 0.15;
  roll.position.set(-0.03, 0.022, 0.245);
  props.add(roll);
  const knob = part(new SphereGeometry(0.018, 8, 6), PALETTE.paleGold, { ink: false });
  knob.position.set(-0.12, 0.022, 0.26);
  props.add(knob);

  const pot = part(new CylinderGeometry(0.04, 0.05, 0.07, 10), '#30343C');
  pot.position.set(0.17, 0.035, 0.07);
  props.add(pot);
  const neckRing = part(new CylinderGeometry(0.025, 0.03, 0.02, 10), '#30343C', { ink: false });
  neckRing.position.set(0.17, 0.08, 0.07);
  props.add(neckRing);
  // The quill: a cream vane leaning out of the pot, dark nib inside.
  const quill = new Group();
  quill.position.set(0.17, 0.08, 0.07);
  quill.rotation.set(-0.25, 0, -0.42);
  props.add(quill);
  const shaft = new Mesh(new CylinderGeometry(0.005, 0.005, 0.22, 4), mat(PAPER));
  shaft.position.y = 0.08;
  quill.add(shaft);
  const vane = part(new SphereGeometry(1, 10, 8), WHITE);
  vane.scale.set(0.028, 0.1, 0.008);
  vane.position.y = 0.13;
  quill.add(vane);

  // --- Idle schedules
  const tilts = schedule(rand, 0.9, 2.6, 40);
  const flicks = schedule(rand, 2.0, 4.5);
  const hops = schedule(rand, 5, 10);

  let curTilt = 0;
  let curTurn = 0;
  function update(dt, t, talk) {
    const br = Math.sin(t * 2.2);
    torso.scale.set(1 + 0.015 * br, 1 + 0.02 * br, 1 + 0.015 * br);

    // Quick head tilts: SNAP to a new tilt (fast ease, ~0.08 s) and hold —
    // birds do not drift, they cut between poses.
    const T = tilts.at(t);
    const pick = T.r;
    const tgtTilt = (pick - 0.5) * 0.9;
    const tgtTurn = ((T.index * 0.618) % 1 - 0.5) * 1.0;
    const k = 1 - Math.exp(-28 * Math.max(dt, 0.016));
    curTilt += (tgtTilt - curTilt) * k;
    curTurn += (tgtTurn - curTurn) * k;
    head.rotation.z = curTilt;
    neck.rotation.y = curTurn;
    head.rotation.x = -0.18 + 0.12 * talk * Math.max(0, Math.sin(t * 10));

    // Tail flick: a quick up-pump.
    const F = flicks.at(t);
    const fk = pulse(F.since, 0.28, 0.1);
    tailPivot.rotation.x = -0.35 * fk + 0.03 * br;

    // Hop in place: a little crouch, an arc, a landing squash.
    const H = hops.at(t);
    const hs = H.since;
    let y = 0;
    let sq = 1;
    if (hs < 0.12) sq = 1 - 0.12 * smooth(hs / 0.12);
    else if (hs < 0.42) {
      const a = (hs - 0.12) / 0.3;
      y = 0.07 * Math.sin(Math.PI * a);
      sq = 1 + 0.08 * Math.sin(Math.PI * a);
    } else if (hs < 0.54) sq = 1 - 0.1 * Math.sin(Math.PI * ((hs - 0.42) / 0.12));
    hop.position.y = y;
    hop.scale.set(2 - sq, sq, 2 - sq);
    for (const w of wings) w.pivot.rotation.z = w.side * (0.25 * Math.max(0, sq - 1) * 8 * (y > 0 ? 1 : 0));

    // Talking: beak chatter.
    jaw.rotation.x = 0.5 * talk * Math.max(0, Math.sin(t * 16));
    quill.rotation.z = -0.42 + 0.02 * Math.sin(t * 0.7);
  }

  return { update, head, metrics: { height: HEAD_Y + HR * 0.95 + 0.01, radius: 0.16 } };
}
