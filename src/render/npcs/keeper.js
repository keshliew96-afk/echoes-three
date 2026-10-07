// WICK, THE HEARTH-KEEPER — an old owl perched on the camp's woodpile.
//
// Silhouette contract (52-degree camera): the read is a big round HEAD with two
// EAR TUFTS on a short egg body — the only figure in camp with horns on a
// circle. Value structure carries the face from above: a pale heart-shaped
// facial disc framed by the brown head, two big bean eyes behind thin brass
// spectacles, and a teal knitted shawl that separates head from body the way
// the critters' collars do. Folded wings are a darker brown step so the body
// is not one blob.
//
// Faces +Z. Origin at the feet (the perch point); index.js lifts it by perchY.
import {
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { PALETTE } from '../../data/palette.js';
import { bodyPanel, exactColor, mix } from '../critters/common.js';
import { canvasTexture, pulse, schedule, seeded } from './common.js';

const FEATHER = '#8A6744'; // warm brown, h31 (clear of the h5-25 Ember band)
const FEATHER_DARK = '#6B5139'; // wings, tufts
const CREAM = '#E6D7B6'; // facial disc, belly
const SHAWL = '#4B7370'; // muted teal knit
const SHAWL_DARK = '#37585A';
const BEAK = '#CDBB8A';

const HEAD_Y = 0.86;
const HEAD_R = 0.29;
const HSX = 1.1;
const HSY = 0.93;

export function buildKeeper(rig, kit) {
  const { part, mat } = kit;
  const rand = seeded('keeper');

  // --- Body: an egg, widest low (a settled, heavy old bird).
  const bodyProfile = [
    [0, 0.05],
    [0.17, 0.06],
    [0.27, 0.12],
    [0.315, 0.22],
    [0.31, 0.34],
    [0.27, 0.46],
    [0.2, 0.56],
    [0.12, 0.62],
    [0, 0.65],
  ];
  const torso = new Group();
  rig.add(torso);
  const body = part(new LatheGeometry(bodyProfile.map(([x, y]) => new Vector2(x, y)), 16), FEATHER, { name: 'owl-body' });
  torso.add(body);

  // Cream belly with painted brown chevrons (barred owl breast). The lathe
  // panel's UV u runs around, v up the profile.
  const chevrons = canvasTexture(128, (ctx, w, h) => {
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = mix(FEATHER, PALETTE.voidCharcoal, 0.25).getStyle();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let row = 0; row < 4; row++) {
      const y = h * (0.2 + row * 0.2);
      const n = row % 2 === 0 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const x = w * ((i + (row % 2 === 0 ? 0.5 : 1)) / (n + (row % 2 === 0 ? 0 : 1)));
        ctx.beginPath();
        ctx.moveTo(x - 9, y - 6);
        ctx.lineTo(x, y + 3);
        ctx.lineTo(x + 9, y - 6);
        ctx.stroke();
      }
    }
  });
  const belly = bodyPanel(
    [
      [0.27, 0.12],
      [0.315, 0.22],
      [0.31, 0.34],
      [0.27, 0.46],
      [0.21, 0.54],
    ],
    { color: CREAM, phiLength: 1.5, grow: 1.02, segments: 14 }
  );
  belly.material.map = chevrons;
  belly.material.emissive = mix(CREAM, '#000000', 0.88);
  torso.add(belly);

  // Folded wings: long flattened ovals hugging the flanks, tips sweeping
  // back-down past the tail. Darker brown + their own ink line.
  const wingGeo = new SphereGeometry(1, 10, 8);
  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.255, 0.44, -0.02);
    torso.add(pivot);
    const w = part(wingGeo, FEATHER_DARK, { name: 'wing' });
    w.scale.set(0.085, 0.26, 0.2);
    w.position.set(side * 0.03, -0.12, -0.04);
    w.rotation.set(0.32, 0, side * 0.12);
    pivot.add(w);
    wings.push({ pivot, side });
  }
  // Tail stub behind.
  const tail = part(new ConeGeometry(0.12, 0.2, 10), FEATHER_DARK);
  tail.rotation.x = -Math.PI / 2 - 0.9;
  tail.position.set(0, 0.12, -0.27);
  torso.add(tail);

  // Talons gripping the perch.
  const talonGeo = new SphereGeometry(1, 8, 6);
  for (const side of [-1, 1]) {
    const t = part(talonGeo, PALETTE.paleGold);
    t.scale.set(0.06, 0.035, 0.075);
    t.position.set(side * 0.1, 0.035, 0.12);
    torso.add(t);
  }

  // --- Shawl: a knitted band round the shoulders, knotted at the front with
  // two short tails. Its lathe sits just outside the body profile.
  const shawl = part(
    new LatheGeometry(
      [
        [0.2, 0.43],
        [0.3, 0.46],
        [0.33, 0.52],
        [0.29, 0.6],
        [0.2, 0.655],
        [0.15, 0.665],
      ].map(([x, y]) => new Vector2(x, y)),
      16
    ),
    SHAWL,
    { name: 'shawl' }
  );
  torso.add(shawl);
  const knot = part(new SphereGeometry(0.06, 8, 6), SHAWL_DARK);
  knot.scale.set(1.2, 0.85, 0.8);
  knot.position.set(0, 0.5, 0.31);
  torso.add(knot);
  const tailGeo = new CapsuleGeometry(0.035, 0.12, 2, 6);
  for (const side of [-1, 1]) {
    const t = part(tailGeo, SHAWL);
    t.position.set(side * 0.05, 0.4, 0.3);
    t.rotation.set(0.25, 0, side * 0.3);
    t.scale.set(1, 1, 0.55);
    torso.add(t);
  }

  // --- Head
  const neck = new Group(); // swivel pivot
  neck.position.y = HEAD_Y;
  torso.add(neck);
  const head = new Group(); // tilt pivot
  neck.add(head);
  const skull = part(new SphereGeometry(HEAD_R, 16, 12), FEATHER, { name: 'skull' });
  skull.scale.set(HSX, HSY, 1);
  head.add(skull);

  // Ear tufts: the silhouette's horns. Splayed outward and back so they stay
  // two distinct spikes in plan view.
  const tuftGeo = new ConeGeometry(0.075, 0.24, 6);
  const tufts = [];
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.2, 0.19, -0.02);
    head.add(p);
    const t = part(tuftGeo, FEATHER_DARK);
    t.position.y = 0.1;
    t.scale.set(1, 1, 0.6);
    p.add(t);
    p.rotation.set(-0.2, 0, side * -0.55);
    tufts.push({ p, side });
  }

  // Facial disc: two pale overlapping ovals (a heart-shaped face) on the
  // skull front. Lifted pale (cream) — the value step the face reads by.
  const discGeo = new SphereGeometry(1, 12, 8);
  const FZ = HEAD_R * 0.8;
  for (const side of [-1, 1]) {
    const d = part(discGeo, CREAM, { ink: false });
    d.scale.set(0.135, 0.15, 0.06);
    d.position.set(side * 0.105, -0.015, FZ);
    d.rotation.y = side * 0.38;
    head.add(d);
  }
  // A brown brow V between the discs gives the face its "wise" frown-less
  // ridge and keeps the two discs from merging into one plate.
  const brow = part(new ConeGeometry(0.045, 0.2, 6), FEATHER, { ink: false });
  brow.rotation.x = Math.PI;
  brow.scale.set(1, 1, 0.5);
  brow.position.set(0, 0.04, FZ + 0.03);
  head.add(brow);

  // Eyes: big dark beans + Bone glint, unlit (party/friendly grammar).
  const eyeMat = new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal) });
  const glintMat = new MeshBasicMaterial({ color: exactColor(PALETTE.bone) });
  const eyeGeo = new SphereGeometry(1, 10, 7);
  const lidMat = mat(mix(FEATHER, CREAM, 0.35).getHex());
  const lids = [];
  const EYE_R = 0.066;
  for (const side of [-1, 1]) {
    const eg = new Group();
    eg.position.set(side * 0.112, -0.02, FZ + 0.05);
    eg.rotation.y = side * 0.3;
    head.add(eg);
    const eye = new Mesh(eyeGeo, eyeMat);
    eye.scale.set(EYE_R, EYE_R * 1.08, EYE_R * 0.55);
    eg.add(eye);
    const glint = new Mesh(eyeGeo, glintMat);
    glint.scale.setScalar(EYE_R * 0.24);
    glint.position.set(-EYE_R * 0.35, EYE_R * 0.42, EYE_R * 0.45);
    eg.add(glint);
    // Eyelid: a feather-coloured cap that scales DOWN over the eye (blink).
    const lid = new Mesh(eyeGeo, lidMat);
    lid.position.z = 0.006;
    eg.add(lid);
    lids.push(lid);
    // Spectacles: thin brass rim, no ink (a hulled 1 cm wire turns into a
    // black ring that hides the eye).
    const rim = new Mesh(new TorusGeometry(EYE_R * 1.32, 0.011, 4, 16), mat(PALETTE.paleGold, { lift: 0.25 }));
    rim.position.z = EYE_R * 0.62;
    eg.add(rim);
  }
  const bridge = new Mesh(new CylinderGeometry(0.009, 0.009, 0.07, 5), mat(PALETTE.paleGold, { lift: 0.25 }));
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.0, FZ + 0.1);
  head.add(bridge);

  // Beak: a short hooked cone pointing down-forward between the discs; the
  // lower mandible is its own hinge for talking.
  const beak = part(new ConeGeometry(0.042, 0.13, 8), BEAK);
  beak.rotation.x = Math.PI - 0.5;
  beak.position.set(0, -0.1, FZ + 0.08);
  head.add(beak);
  const jaw = new Group();
  jaw.position.set(0, -0.12, FZ + 0.06);
  head.add(jaw);
  const mandible = part(new ConeGeometry(0.03, 0.07, 6), mix(BEAK, FEATHER, 0.3).getHex(), { ink: false });
  mandible.rotation.x = Math.PI - 1.1;
  mandible.position.set(0, -0.02, 0.01);
  jaw.add(mandible);

  function setLids(k) {
    // k = 0 open .. 1 closed. The open lid keeps a heavy-lidded sliver
    // (old, sleepy, kind) instead of vanishing.
    const c = 0.28 + 0.72 * k;
    for (const lid of lids) {
      lid.scale.set(EYE_R * 1.1, EYE_R * 1.12 * c, EYE_R * 0.62);
      lid.position.y = EYE_R * 1.1 * (1 - c);
    }
  }
  setLids(0);

  // --- Idle schedules (deterministic per id).
  const blinks = schedule(rand, 2.8, 5.5);
  const looks = schedule(rand, 4.5, 8.5);
  const ruffles = schedule(rand, 9, 15);

  function update(_dt, t, talk) {
    // Slow breathing: the body swells, the head rides it.
    const br = Math.sin(t * 1.25);
    torso.scale.set(1 + 0.012 * br, 1 + 0.02 * br, 1 + 0.012 * br);

    // Head swivel / tilt: ease to a look target, hold, ease back.
    const L = looks.at(t);
    const lk = pulse(L.since, 2.6, 0.45);
    const dir = L.r < 0.5 ? -1 : 1;
    const big = L.index % 3 === 2; // every third look is the owl's big swivel
    neck.rotation.y = dir * (big ? 0.95 : 0.45) * lk;
    head.rotation.z = -dir * (big ? 0.08 : 0.22) * lk + 0.03 * Math.sin(t * 0.7);
    head.rotation.x = -0.12 + 0.03 * Math.sin(t * 0.9) - 0.05 * talk * Math.abs(Math.sin(t * 9));

    // Blink: a slow lid close (eyelid scale), with an occasional double blink.
    const B = blinks.at(t);
    let lid = pulse(B.since, 0.32, 0.25);
    if (B.r > 0.7) lid = Math.max(lid, pulse(B.since - 0.42, 0.28, 0.2));
    setLids(lid);

    // Wing ruffle: a brief shrug-out every ~12 s.
    const R = ruffles.at(t);
    const rk = pulse(R.since, 0.9, 0.2);
    for (const w of wings) w.pivot.rotation.z = w.side * (0.04 + 0.22 * rk * Math.abs(Math.sin(R.since * 14)));
    for (const tf of tufts) tf.p.rotation.z = tf.side * (-0.55 - 0.08 * rk);

    // Talking: beak chatter + a little head bob.
    const chat = talk * Math.max(0, Math.sin(t * 13));
    jaw.rotation.x = 0.45 * chat;
    neck.position.y = HEAD_Y + 0.012 * talk * Math.sin(t * 7) + 0.006 * br;
  }

  const height = HEAD_Y + 0.19 + 0.2; // tuft tips
  return { update, head, metrics: { height, radius: 0.32 } };
}
