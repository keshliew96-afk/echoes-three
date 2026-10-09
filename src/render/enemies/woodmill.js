// New enemy rigs, Wood and Mill (content plan 3 slice 3,
// docs/WOOD_MILL_ENEMIES.md): Shriek Owl, Vine Lasher, Mire Leech, Drowned
// Miller. Same grammar as render/enemies/slice2.js: flat-faceted toon
// primitives in the cool hide families, angular charcoal eyes, ink on the big
// masses, a contact shadow, flashable materials in `mats`, shared geometry,
// and exactly ONE indigo corruption tell each.
//   owl     a pale barn owl gliding ~1.5 u up on broad banded wings, a flat
//           heart-shaped facial disc, ear tufts, hooked beak, talons hung
//           below; indigo pupils. Hanging for the shriek it flares the disc,
//           throws its wings wide and back and rears; the shriek snaps the
//           head forward with the beak wide
//   lasher  a bramble seed pod on a splay of roots, its lid split into two
//           jaws round an indigo maw, a long jointed whip-vine with a hooked
//           thorn tip. Coiling, the vine curls back overhead and the jaws
//           gape; the lash snaps it straight out along the lane and back
//   leech   a fat segmented black-green leech with a round toothed sucker;
//           an indigo ring inside the sucker. It undulates as it slithers,
//           rears high on the wind-up, stretches straight for the leap,
//           clings upright to its host (pulsing on every drain) and lies
//           curled on its side when flopped
//   miller  a tall drowned miller in a sodden smock and flat cap, gaunt and
//           grey, a flour sack on his back and a small millstone on a chain
//           in his right hand; indigo eyes under the cap. Whirling, the
//           stone swings round him faster and faster; the toss heaves the
//           left arm overhead
// Faces +Z; the layer drives `pose({ t, walkPhase, moveK, telegraphK, fireK,
// e })` (`e` = the sim entity, READ ONLY; the Journal's viewer passes an idle
// stand-in, so every field read here has a default).
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor } from '../critters/common.js';
import { markShared } from '../geocache.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';

const flashable = (color) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 });
const inkMat = () => new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
const tellMat = () => new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}
const cache = {};
function shared(key, make) {
  if (!cache[key]) {
    cache[key] = make();
    markShared(cache[key]);
  }
  return cache[key];
}
function slitEyes(parent, { x = 0.1, y = 0, z = 0.1, len = 0.08, slant = 0.4 } = {}) {
  const g = shared('wm-eye', () => new BoxGeometry(1, 0.022, 0.022));
  const m = inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, m);
    eye.scale.x = len;
    eye.position.set(side * x, y, z);
    eye.rotation.set(0, side * -0.3, side * slant);
    parent.add(eye);
  }
}
function shell(name) {
  const group = new Group();
  group.name = name;
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  return { group, yaw, rig, mats, track, setYaw: (r) => (yaw.rotation.y = r) };
}
// One-shot clip clock off a sim tick field (shriekTick / lashTick / ...).
function clip() {
  let last = -1;
  let age = 9;
  return (tickField, dt) => {
    if (tickField != null && tickField >= 0 && tickField !== last) {
      last = tickField;
      age = 0;
    } else age += dt;
    return age;
  };
}
function clock() {
  let lastT = null;
  return (t) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    return dt;
  };
}
const smooth = (x) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
const slate = (h, l) => new Color().setHSL(0.6, h, l);
// Local hides (same cool families as style.js HIDE).
const C = Object.freeze({
  owl: new Color(PALETTE.bone).lerp(new Color(PALETTE.signalBlue), 0.18).multiplyScalar(0.86),
  owlBack: slate(0.22, 0.42),
  owlBand: slate(0.3, 0.22),
  owlFace: new Color(PALETTE.bone).lerp(new Color(PALETTE.parchment), 0.4).multiplyScalar(0.95),
  owlBeak: new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.5).multiplyScalar(0.75),
  pod: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.5).multiplyScalar(0.95),
  podDark: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.3).multiplyScalar(0.6),
  vine: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.55).multiplyScalar(1.05),
  root: HIDE.boarDark.clone().multiplyScalar(0.9),
  thorn: new Color(PALETTE.bone).multiplyScalar(0.72),
  leech: slate(0.26, 0.17).lerp(new Color(PALETTE.sageCloak), 0.3),
  leechBelly: slate(0.2, 0.36).lerp(new Color(PALETTE.sageCloak), 0.25),
  leechStripe: slate(0.3, 0.3),
  tooth: new Color(PALETTE.bone).multiplyScalar(0.8),
  smock: slate(0.22, 0.26).lerp(new Color(PALETTE.warmGrey), 0.2),
  smockDark: slate(0.3, 0.14),
  skin: slate(0.12, 0.6).lerp(new Color(PALETTE.bone), 0.3),
  cap: slate(0.3, 0.2),
  sack: new Color(PALETTE.bone).lerp(new Color(PALETTE.signalBlue), 0.12).multiplyScalar(0.8),
  stone: HIDE.ramBody.clone().multiplyScalar(0.95),
  chain: slate(0.18, 0.35),
});

// --------------------------------------------------------------- OWL --
function owlWing() {
  // A broad flat wing: a squashed sphere fanned out sideways (+X), with a
  // trailing-edge notch read by the banded tips.
  const g = new SphereGeometry(0.34, 8, 3);
  g.scale(1.25, 0.06, 0.55);
  g.translate(0.4, 0, -0.04);
  return g;
}
export function buildOwl() {
  const s = shell('owl');
  const { rig, track } = s;
  const hover = new Group();
  hover.position.y = 1.5;
  rig.add(hover);
  const bodyMat = track(flashable(C.owl));
  const backMat = track(flashable(C.owlBack));
  const body = new Mesh(shared('ow-body', () => new IcosahedronGeometry(0.22, 1)), bodyMat);
  body.scale.set(0.95, 1.05, 1.15);
  addInk(body);
  hover.add(body);
  const mantle = new Mesh(shared('ow-mantle', () => new IcosahedronGeometry(0.2, 1)), backMat);
  mantle.scale.set(1.0, 0.7, 1.1);
  mantle.position.set(0, 0.08, -0.06);
  hover.add(mantle);
  // Head: a round skull with the flat heart-shaped facial disc in front.
  const head = new Group();
  head.position.set(0, 0.2, 0.12);
  hover.add(head);
  const skull = new Mesh(shared('ow-skull', () => new IcosahedronGeometry(0.15, 1)), backMat);
  addInk(skull);
  head.add(skull);
  const disc = new Group();
  disc.position.set(0, -0.01, 0.1);
  head.add(disc);
  const faceMat = track(flashable(C.owlFace));
  for (const side of [-1, 1]) {
    const lobe = new Mesh(shared('ow-lobe', () => new SphereGeometry(0.09, 10, 6)), faceMat);
    lobe.scale.set(1.0, 1.15, 0.32);
    lobe.position.set(side * 0.06, 0.0, 0);
    lobe.rotation.z = side * -0.25;
    disc.add(lobe);
  }
  const rim = new Mesh(shared('ow-rim', () => new TorusGeometry(0.13, 0.016, 4, 16)), backMat);
  rim.scale.set(1.05, 1.05, 0.5);
  rim.position.z = -0.01;
  disc.add(rim);
  // Eyes: dark sockets with indigo pupils (the tell).
  const pupils = [];
  for (const side of [-1, 1]) {
    const sock = new Mesh(shared('ow-sock', () => new SphereGeometry(0.035, 8, 6)), inkMat());
    sock.position.set(side * 0.055, 0.02, 0.03);
    disc.add(sock);
    const pu = new Mesh(shared('ow-pupil', () => new SphereGeometry(0.014, 6, 4)), tellMat());
    pu.position.set(side * 0.055, 0.02, 0.06);
    disc.add(pu);
    pupils.push(pu);
  }
  const eyeGlow = tellGlow(0.32, 0.18);
  eyeGlow.position.set(0, 0.02, 0.08);
  disc.add(eyeGlow);
  const beakMat = track(flashable(C.owlBeak));
  const beakTop = new Mesh(shared('ow-beak', () => new ConeGeometry(0.025, 0.08, 4)), beakMat);
  beakTop.rotation.x = Math.PI * 0.62;
  beakTop.position.set(0, -0.04, 0.07);
  disc.add(beakTop);
  const beakLow = new Mesh(shared('ow-beak2', () => new ConeGeometry(0.018, 0.05, 4)), beakMat);
  beakLow.rotation.x = Math.PI * 0.7;
  beakLow.position.set(0, -0.06, 0.05);
  disc.add(beakLow);
  for (const side of [-1, 1]) {
    const tuft = new Mesh(shared('ow-tuft', () => new ConeGeometry(0.035, 0.12, 4)), backMat);
    tuft.position.set(side * 0.09, 0.14, -0.01);
    tuft.rotation.z = side * -0.45;
    head.add(tuft);
  }
  // Wings: shoulder pivots, each wing with three dark bands on its tip.
  const wings = [];
  const wingG = shared('ow-wing', owlWing);
  const bandG = shared('ow-band', () => new BoxGeometry(0.05, 0.03, 0.34));
  const bandMat = track(flashable(C.owlBand));
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.16, 0.08, -0.02);
    pivot.scale.x = side;
    hover.add(pivot);
    const w = new Mesh(wingG, backMat);
    addInk(w);
    pivot.add(w);
    for (let i = 0; i < 3; i++) {
      const b = new Mesh(bandG, bandMat);
      b.position.set(0.5 + i * 0.13, 0.02, -0.04);
      pivot.add(b);
    }
    wings.push({ pivot, side });
  }
  const tail = new Mesh(shared('ow-tail', () => new ConeGeometry(0.14, 0.26, 5, 1, true)), backMat);
  tail.rotation.x = -Math.PI / 2 - 0.25;
  tail.scale.set(1, 1, 0.3);
  tail.position.set(0, -0.06, -0.3);
  hover.add(tail);
  const talons = [];
  for (const side of [-1, 1]) {
    const leg = new Group();
    leg.position.set(side * 0.07, -0.2, 0.04);
    hover.add(leg);
    const shin = new Mesh(shared('ow-shin', () => new CylinderGeometry(0.02, 0.016, 0.14, 4).translate(0, -0.07, 0)), beakMat);
    leg.add(shin);
    for (const a of [-0.5, 0, 0.5]) {
      const claw = new Mesh(shared('ow-claw', () => new ConeGeometry(0.012, 0.07, 3)), inkMat());
      claw.position.set(Math.sin(a) * 0.03, -0.15, Math.cos(a) * 0.03);
      claw.rotation.x = Math.PI * 0.75;
      claw.rotation.z = a;
      leg.add(claw);
    }
    talons.push(leg);
  }
  s.group.add(groundShadow(0.3, 0.42));
  const dtOf = clock();
  const shriekAge = clip();
  let hang = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id : 0;
      const hanging = e && e.mode === 'hang' ? 1 : 0;
      hang += (hanging - hang) * (1 - Math.exp(-8 * dt));
      const age = shriekAge(e ? e.shriekTick : -1, dt);
      const k = age < 0.35 ? Math.sin((age / 0.35) * Math.PI) : 0; // the shriek snap
      const tk = Math.max(telegraphK, hang * 0.6);
      // Glide: slow beats with a held glide; hang: fast shallow treading.
      const beat = Math.sin(t * (tk > 0.3 ? 13 : 5.2) + id);
      const glideHold = tk > 0.3 ? 1 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.9 + id));
      hover.position.y = 1.5 + 0.07 * Math.sin(t * 2.1 + id) + 0.12 * tk;
      hover.rotation.x = -0.35 * tk + 0.45 * k;
      for (const { pivot } of wings) {
        // Hang: wings thrown wide and swept back (the threat display).
        pivot.rotation.z = (0.18 + 0.55 * beat * glideHold) * (1 - tk * 0.7) + 0.5 * tk - 0.6 * k;
        pivot.rotation.y = -0.55 * tk + 0.35 * k;
      }
      head.position.z = 0.12 + 0.1 * k;
      head.rotation.x = -0.15 * tk + 0.25 * k;
      disc.scale.setScalar(1 + 0.28 * tk + 0.2 * k);
      beakLow.rotation.x = Math.PI * 0.7 + 0.5 * k + 0.2 * tk;
      eyeGlow.material.opacity = 0.16 + 0.4 * tk + 0.3 * k;
      for (const p of pupils) p.scale.setScalar(1 + 0.8 * tk);
      tail.rotation.y = 0.15 * Math.sin(t * 1.3 + id);
      for (let i = 0; i < talons.length; i++) talons[i].rotation.x = 0.3 * tk + 0.08 * Math.sin(t * 3 + i);
    },
  };
}

// ------------------------------------------------------------ LASHER --
const VINE_SEGS = 9;
const VINE_LEN = 0.17;
export function buildLasher() {
  const s = shell('lasher');
  const { rig, track } = s;
  const podMat = track(flashable(C.pod));
  const darkMat = track(flashable(C.podDark));
  const body = new Group();
  body.position.y = 0.42;
  rig.add(body);
  const pod = new Mesh(shared('la-pod', () => new IcosahedronGeometry(0.3, 1)), podMat);
  pod.scale.set(1, 0.85, 1);
  addInk(pod);
  body.add(pod);
  // Rind ridges down the pod.
  const ridgeG = shared('la-ridge', () => new BoxGeometry(0.035, 0.42, 0.05));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = new Mesh(ridgeG, darkMat);
    r.position.set(Math.sin(a) * 0.27, -0.02, Math.cos(a) * 0.27);
    r.rotation.y = a;
    r.rotation.x = Math.cos(a) * 0.2;
    r.rotation.z = -Math.sin(a) * 0.2;
    body.add(r);
  }
  // The lid: two jaws hinged at the back over an indigo maw (the tell).
  const maw = new Mesh(shared('la-maw', () => new SphereGeometry(0.17, 10, 6)), tellMat());
  maw.scale.set(1, 0.4, 1);
  maw.position.y = 0.2;
  body.add(maw);
  const mawGlow = tellGlow(0.6, 0.22);
  mawGlow.position.y = 0.3;
  body.add(mawGlow);
  const jaws = [];
  for (const side of [-1, 1]) {
    const hinge = new Group();
    hinge.position.set(side * 0.02, 0.2, 0);
    body.add(hinge);
    const jaw = new Mesh(shared('la-jaw', () => new SphereGeometry(0.24, 10, 5, 0, Math.PI, 0, Math.PI / 2)), podMat);
    jaw.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    jaw.scale.set(1, 0.55, 1);
    addInk(jaw);
    hinge.add(jaw);
    const thornG = shared('la-tooth', () => new ConeGeometry(0.022, 0.09, 3));
    for (let i = 0; i < 4; i++) {
      const th = new Mesh(thornG, track(flashable(C.thorn)));
      const z = -0.15 + i * 0.1;
      th.position.set(side * 0.18, -0.02, z);
      th.rotation.z = Math.PI + side * 0.3;
      hinge.add(th);
    }
    jaws.push({ hinge, side });
  }
  slitEyes(body, { x: 0.09, y: 0.06, z: 0.27, len: 0.08, slant: 0.5 });
  // Roots: a splay of tapering roots round the base.
  const roots = [];
  const rootG = shared('la-root', () => new ConeGeometry(0.06, 0.48, 4).translate(0, -0.24, 0));
  const rootMat = track(flashable(C.root));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const p = new Group();
    p.position.set(Math.sin(a) * 0.18, 0.2, Math.cos(a) * 0.18);
    rig.add(p);
    const r = new Mesh(rootG, rootMat);
    r.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9);
    p.add(r);
    roots.push({ p, a, phase: i });
  }
  // The whip-vine: a chain of jointed segments from the pod's front, a hooked
  // thorn at the tip. Each joint is a child of the last, so bending them all
  // curls the whole vine.
  const vineMat = track(flashable(C.vine));
  const segG = shared('la-seg', () => new CylinderGeometry(0.03, 0.04, VINE_LEN, 5).rotateX(Math.PI / 2).translate(0, 0, VINE_LEN / 2));
  const spurG = shared('la-spur', () => new ConeGeometry(0.014, 0.06, 3));
  const joints = [];
  let parent = new Group();
  parent.position.set(0, 0.05, 0.26);
  body.add(parent);
  const vineRoot = parent;
  for (let i = 0; i < VINE_SEGS; i++) {
    const j = new Group();
    if (i > 0) j.position.z = VINE_LEN;
    parent.add(j);
    const seg = new Mesh(segG, vineMat);
    const taper = 1 - i * 0.07;
    seg.scale.set(taper, taper, 1);
    j.add(seg);
    if (i % 2 === 1) {
      const spur = new Mesh(spurG, track(flashable(C.thorn)));
      spur.position.set(i % 4 === 1 ? 0.035 : -0.035, 0.02, VINE_LEN * 0.5);
      spur.rotation.z = i % 4 === 1 ? -1.2 : 1.2;
      j.add(spur);
    }
    joints.push(j);
    parent = j;
  }
  const hook = new Mesh(shared('la-hook', () => new ConeGeometry(0.045, 0.16, 4)), track(flashable(C.thorn)));
  hook.position.z = VINE_LEN + 0.05;
  hook.rotation.x = Math.PI / 2 + 0.6;
  joints[joints.length - 1].add(hook);
  s.group.add(groundShadow(0.42, 0.75));
  const dtOf = clock();
  const lashAge = clip();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id : 0;
      const age = lashAge(e ? e.lashTick : -1, dt);
      // The lash: 0..0.12 s snap out, hold, 0.12..0.5 s recoil.
      const out = age < 0.12 ? smooth(age / 0.12) : age < 0.5 ? 1 - smooth((age - 0.12) / 0.38) : 0;
      const coil = telegraphK * (1 - out);
      // Idle: the vine sways low in front; coiled: curled up and back over
      // the pod (each joint bends back); lash: dead straight and stretched.
      const sway = Math.sin(t * 1.7 + id);
      vineRoot.rotation.x = 0.55 * (1 - coil) * (1 - out) - 1.5 * coil - 0.08 * out;
      vineRoot.rotation.y = 0.18 * sway * (1 - coil) * (1 - out);
      for (let i = 0; i < joints.length; i++) {
        if (i === 0) continue;
        const idle = 0.12 + 0.06 * Math.sin(t * 2.3 - i * 0.7 + id);
        joints[i].rotation.x = idle * (1 - coil) * (1 - out) - 0.42 * coil + 0.03 * Math.sin(t * 9 - i) * coil;
        joints[i].rotation.y = 0.05 * Math.sin(t * 1.9 - i * 0.5 + id) * (1 - out);
        joints[i].scale.z = 1 + 1.4 * out; // the lash reaches the lane
      }
      // Jaws gape on the wind-up, clap on the lash.
      for (const { hinge, side } of jaws) hinge.rotation.z = side * (0.08 + 0.75 * coil - 0.1 * out);
      mawGlow.material.opacity = 0.18 + 0.4 * coil + 0.2 * out;
      body.rotation.x = -0.18 * coil + 0.22 * out;
      body.position.y = 0.42 + 0.03 * Math.sin(t * 2 + id) - 0.05 * coil;
      body.scale.set(1 + 0.06 * coil, 1 - 0.05 * coil, 1 + 0.06 * coil);
      for (const r of roots) r.p.rotation.y = Math.sin(walkPhase * 2 + r.phase * 1.3) * 0.35 * moveK;
    },
  };
}

// ------------------------------------------------------------- LEECH --
const LEECH_SEGS = 6;
export function buildLeech() {
  const s = shell('leech');
  const { rig, track } = s;
  const hideMat = track(flashable(C.leech));
  const bellyMat = track(flashable(C.leechBelly));
  const stripeMat = track(flashable(C.leechStripe));
  // The body is a chain from the TAIL (at the origin's back) forward to the
  // head, so rearing lifts the front and clinging stands it up.
  const segG = shared('lc-seg', () => new IcosahedronGeometry(0.15, 1));
  const segs = [];
  const base = new Group();
  base.position.set(0, 0.13, -0.42);
  rig.add(base);
  let parent = base;
  const SEG = 0.16;
  for (let i = 0; i < LEECH_SEGS; i++) {
    const j = new Group();
    if (i > 0) j.position.z = SEG;
    parent.add(j);
    const k = 0.62 + 0.38 * Math.sin(((i + 0.5) / LEECH_SEGS) * Math.PI) + (i === LEECH_SEGS - 1 ? -0.12 : 0);
    const m = new Mesh(segG, hideMat);
    m.scale.set(k * 1.05, k * 0.72, 0.85);
    addInk(m);
    j.add(m);
    const belly = new Mesh(shared('lc-belly', () => new SphereGeometry(0.12, 8, 4)), bellyMat);
    belly.scale.set(k * 1.05, k * 0.35, 0.75);
    belly.position.y = -0.05 * k;
    j.add(belly);
    const stripe = new Mesh(shared('lc-stripe', () => new BoxGeometry(0.03, 0.02, 0.14)), stripeMat);
    stripe.position.y = 0.105 * k;
    j.add(stripe);
    segs.push({ j, k });
    parent = j;
  }
  const head = segs[segs.length - 1].j;
  const sucker = new Mesh(shared('lc-sucker', () => new TorusGeometry(0.085, 0.035, 6, 14)), bellyMat);
  sucker.position.z = 0.12;
  head.add(sucker);
  const maw = new Mesh(shared('lc-maw', () => new CylinderGeometry(0.06, 0.06, 0.02, 12).rotateX(Math.PI / 2)), inkMat());
  maw.position.z = 0.125;
  head.add(maw);
  const ringTell = new Mesh(shared('lc-ring', () => new TorusGeometry(0.052, 0.012, 4, 14)), tellMat());
  ringTell.position.z = 0.13;
  head.add(ringTell);
  const mawGlow = tellGlow(0.34, 0.2);
  mawGlow.position.z = 0.17;
  head.add(mawGlow);
  const teeth = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const th = new Mesh(shared('lc-tooth', () => new ConeGeometry(0.01, 0.04, 3)), track(flashable(C.tooth)));
    th.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.13);
    th.rotation.z = a - Math.PI / 2;
    th.rotation.x = Math.PI / 2;
    head.add(th);
    teeth.push(th);
  }
  slitEyes(head, { x: 0.06, y: 0.07, z: 0.08, len: 0.045, slant: 0.4 });
  const shadow = groundShadow(0.3, 0.7, { deep: 2.1, forward: 0 });
  s.group.add(shadow);
  const dtOf = clock();
  let latch = 0;
  let flop = 0;
  let rear = 0;
  let lastDrain = -1;
  let drainAge = 9;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id : 0;
      const mode = e ? e.mode : 'idle';
      latch += ((mode === 'latched' ? 1 : 0) - latch) * (1 - Math.exp(-14 * dt));
      flop += ((mode === 'flop' ? 1 : 0) - flop) * (1 - Math.exp(-12 * dt));
      rear += ((telegraphK > 0.05 ? 1 : 0) - rear) * (1 - Math.exp(-10 * dt));
      const leaping = mode === 'leap' ? 1 : 0;
      // A drain pulse: the sim's drain clock moves on every drain.
      const nd = e && e.nextDrainTick != null ? e.nextDrainTick : -1;
      if (mode === 'latched' && nd !== lastDrain) {
        if (lastDrain >= 0) drainAge = 0;
        lastDrain = nd;
      }
      drainAge += dt;
      const gulp = drainAge < 0.3 ? Math.sin((drainAge / 0.3) * Math.PI) : 0;
      // Crawl: a vertical travelling wave; rear: the front three lift up;
      // leap: straight; latched: the tail at the host's flank, standing up.
      const crawl = (1 - latch) * (1 - leaping) * (1 - flop);
      for (let i = 0; i < segs.length; i++) {
        const { j, k } = segs[i];
        const wave = Math.sin(walkPhase * 1.4 - i * 1.1 + t * 2) * 0.22 * Math.max(moveK, 0.25) * crawl;
        const front = i >= segs.length - 3 ? 1 : 0;
        j.rotation.x = wave - 0.55 * rear * front * crawl - 0.12 * latch + 0.05 * Math.sin(t * 6 - i) * latch;
        j.rotation.y = Math.sin(t * 7 - i) * 0.45 * flop;
        const sw = 1 + 0.18 * gulp * Math.max(0, 1 - Math.abs(i - (segs.length - 1 - drainAge * 14)) / 2);
        j.scale.set(sw, sw, 1 + 0.25 * leaping);
      }
      // Clinging: stand the body up against the host (front pointing up and
      // in), lifted off the floor.
      base.rotation.x = -1.25 * latch;
      base.position.set(0, 0.13 + 0.25 * latch, -0.42 + 0.3 * latch);
      // Flopped: rolled on its side.
      rig.rotation.z = 1.3 * flop * Math.sin(1 + id);
      rig.position.y = 0.05 * flop;
      sucker.scale.setScalar(1 + 0.45 * rear + 0.3 * latch + 0.3 * gulp);
      for (const th of teeth) th.scale.setScalar(1 + 0.5 * rear);
      mawGlow.material.opacity = 0.16 + 0.35 * rear + 0.3 * gulp;
      shadow.visible = latch < 0.5;
    },
  };
}

// ------------------------------------------------------------ MILLER --
export function buildMiller() {
  const s = shell('miller');
  const { rig, track } = s;
  const smock = track(flashable(C.smock));
  const smockDark = track(flashable(C.smockDark));
  const skin = track(flashable(C.skin));
  const body = new Group();
  rig.add(body);
  // Legs: long, under a hanging smock.
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.13, 0.66, 0);
    body.add(hip);
    const leg = new Mesh(shared('ml-leg', () => new CylinderGeometry(0.06, 0.05, 0.62, 5).translate(0, -0.31, 0)), smockDark);
    hip.add(leg);
    const boot = new Mesh(shared('ml-boot', () => new BoxGeometry(0.13, 0.08, 0.22)), smockDark);
    boot.position.set(0, -0.62, 0.04);
    hip.add(boot);
    legs.push(hip);
  }
  const torso = new Group();
  torso.position.y = 0.66;
  body.add(torso);
  const skirt = new Mesh(shared('ml-skirt', () => new CylinderGeometry(0.24, 0.34, 0.5, 7, 1, true)), smock);
  skirt.position.y = 0.05;
  torso.add(skirt);
  const chest = new Mesh(shared('ml-chest', () => new CylinderGeometry(0.27, 0.22, 0.5, 7)), smock);
  chest.position.set(0, 0.42, -0.02);
  chest.rotation.x = 0.18;
  addInk(chest);
  torso.add(chest);
  // Torn hem strips and an apron.
  const hemG = shared('ml-hem', () => new BoxGeometry(0.08, 0.16, 0.02));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    const h = new Mesh(hemG, smockDark);
    h.position.set(Math.sin(a) * 0.32, -0.24, Math.cos(a) * 0.32);
    h.rotation.y = a;
    torso.add(h);
  }
  const apron = new Mesh(shared('ml-apron', () => new BoxGeometry(0.3, 0.55, 0.02)), track(flashable(C.sack)));
  apron.position.set(0, 0.2, 0.25);
  apron.rotation.x = 0.1;
  torso.add(apron);
  // The flour sack on his back (pale, tied at the neck).
  const sack = new Mesh(shared('ml-sack', () => new IcosahedronGeometry(0.2, 1)), track(flashable(C.sack)));
  sack.scale.set(1.1, 1.25, 0.8);
  sack.position.set(0.04, 0.5, -0.26);
  addInk(sack);
  torso.add(sack);
  const neck = new Group();
  neck.position.set(0, 0.7, 0.06);
  torso.add(neck);
  const head = new Mesh(shared('ml-head', () => new IcosahedronGeometry(0.13, 1)), skin);
  head.scale.set(0.9, 1.15, 0.95);
  head.position.set(0, 0.08, 0.06);
  addInk(head);
  neck.add(head);
  const cap = new Mesh(shared('ml-cap', () => new CylinderGeometry(0.17, 0.16, 0.06, 8)), track(flashable(C.cap)));
  cap.position.set(0, 0.2, 0.08);
  cap.rotation.x = 0.15;
  neck.add(cap);
  const capTop = new Mesh(shared('ml-captop', () => new SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), track(flashable(C.cap)));
  capTop.scale.y = 0.6;
  capTop.position.set(0, 0.22, 0.06);
  neck.add(capTop);
  // Indigo eyes in dark sockets (the tell), a slack jaw.
  for (const side of [-1, 1]) {
    const sock = new Mesh(shared('ml-sock', () => new SphereGeometry(0.03, 6, 4)), inkMat());
    sock.position.set(side * 0.045, 0.1, 0.16);
    neck.add(sock);
    const eye = new Mesh(shared('ml-eye', () => new SphereGeometry(0.014, 6, 4)), tellMat());
    eye.position.set(side * 0.045, 0.1, 0.18);
    neck.add(eye);
  }
  const eyeGlow = tellGlow(0.36, 0.2);
  eyeGlow.position.set(0, 0.1, 0.2);
  neck.add(eyeGlow);
  const jaw = new Mesh(shared('ml-jaw', () => new BoxGeometry(0.09, 0.03, 0.05)), inkMat());
  jaw.position.set(0, 0.0, 0.17);
  neck.add(jaw);
  // Arms: the right holds the chain, the left is the thrower.
  const arms = {};
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.3, 0.6, 0);
    torso.add(sh);
    const upper = new Mesh(shared('ml-arm', () => new CylinderGeometry(0.055, 0.045, 0.62, 5).translate(0, -0.31, 0)), smock);
    sh.add(upper);
    const hand = new Mesh(shared('ml-hand', () => new IcosahedronGeometry(0.06, 0)), skin);
    hand.position.y = -0.64;
    sh.add(hand);
    arms[side > 0 ? 'right' : 'left'] = { sh, hand };
  }
  // Chain and millstone: a pivot at the right hand; the chain hangs from it
  // and the stone at its end. Whirling, the pivot spins round the miller.
  const swing = new Group();
  swing.position.set(0.3, 1.26 - 0.64, 0);
  body.add(swing);
  const chainMat = track(flashable(C.chain));
  const linkG = shared('ml-link', () => new TorusGeometry(0.035, 0.012, 4, 8));
  const chain = new Group();
  swing.add(chain);
  const LINKS = 7;
  for (let i = 0; i < LINKS; i++) {
    const l = new Mesh(linkG, chainMat);
    l.position.y = -0.06 - i * 0.07;
    l.rotation.y = i % 2 ? Math.PI / 2 : 0;
    chain.add(l);
  }
  const stone = new Group();
  stone.position.y = -0.06 - LINKS * 0.07 - 0.1;
  chain.add(stone);
  const disc = new Mesh(shared('ml-stone', () => new CylinderGeometry(0.17, 0.17, 0.09, 10)), track(flashable(C.stone)));
  disc.rotation.z = Math.PI / 2;
  addInk(disc);
  stone.add(disc);
  const hole = new Mesh(shared('ml-hole', () => new CylinderGeometry(0.04, 0.04, 0.1, 8)), inkMat());
  hole.rotation.z = Math.PI / 2;
  stone.add(hole);
  const groove = new Mesh(shared('ml-groove', () => new TorusGeometry(0.12, 0.008, 3, 14)), smockDark);
  groove.rotation.y = Math.PI / 2;
  groove.position.x = 0.047;
  stone.add(groove);
  s.group.add(groundShadow(0.5, 0.85));
  const dtOf = clock();
  const sweepAge = clip();
  const tossAge = clip();
  let spin = 0;
  let spinRate = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id : 0;
      const sa = sweepAge(e ? e.sweepTick : -1, dt);
      const ta = tossAge(e ? e.tossTick : -1, dt);
      const whirl = e && e.mode === 'whirl' ? 1 : 0;
      const slam = sa < 0.35 ? 1 - sa / 0.35 : 0;
      // Heavy plod: a bob and a sway, the legs long and slow.
      const step = Math.sin(walkPhase * 1.6);
      legs[0].rotation.x = step * 0.45 * moveK;
      legs[1].rotation.x = -step * 0.45 * moveK;
      body.position.y = Math.abs(step) * 0.04 * moveK;
      torso.rotation.z = step * 0.06 * moveK;
      torso.rotation.x = 0.12 + 0.05 * Math.sin(t * 1.3 + id) - 0.15 * telegraphK;
      neck.rotation.x = 0.25 - 0.2 * telegraphK;
      jaw.position.y = -0.02 * telegraphK - 0.03 * slam;
      eyeGlow.material.opacity = 0.18 + 0.4 * telegraphK;
      // The stone: idle it hangs and sways; whirling it spins up (rate grows
      // with the wind-up) and flies out level; the sweep is the fastest turn.
      const want = whirl ? 3 + 16 * telegraphK : slam > 0 ? 14 * slam : 0;
      spinRate += (want - spinRate) * (1 - Math.exp(-6 * dt));
      spin += spinRate * dt;
      const fly = Math.min(1, Math.max(telegraphK, slam));
      swing.rotation.y = whirl || slam > 0 ? spin : 0.2 * Math.sin(t * 1.1 + id);
      chain.rotation.z = (0.08 * Math.sin(t * 1.8 + id) + 0.2 * step * moveK) * (1 - fly) + 1.35 * fly;
      swing.position.set(0.3 - 0.3 * fly, 0.62 + 0.45 * fly, 0);
      disc.rotation.x = spin * 2;
      // Arms: the right follows the chain (raised out when whirling); the
      // left swings overhead on the toss.
      arms.right.sh.rotation.z = -0.15 - 1.2 * fly;
      arms.right.sh.rotation.x = -0.1 * step * moveK;
      const toss = ta < 0.45 ? Math.sin((ta / 0.45) * Math.PI) : 0;
      arms.left.sh.rotation.x = 0.1 * step * moveK - 2.6 * toss;
      arms.left.sh.rotation.z = 0.15 + 0.4 * fly;
      sack.position.y = 0.5 - 0.05 * toss;
    },
  };
}
