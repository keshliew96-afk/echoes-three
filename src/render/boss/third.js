// Third boss rigs, Wood and Mill (content plan 3 slice 10;
// docs/THIRD_BOSSES.md). Same grammar and interface as render/boss/slice2.js
// and heart.js — { group, mats, setYaw, setFlash, pose } — faces +Z,
// world-unit sizes, ink on the big masses, a contact shadow, and violet
// God-stuff as the one boss tell.
//
//   gloamwolf  a long grey night wolf, deep in the chest, a mane of black
//              bramble down its neck and back and a pale moon streak along
//              its flank; violet eyes and a violet glow in its throat. It
//              crouches low for a Pounce and arcs through the air, drops its
//              head and lifts a forepaw for a Rend, and throws its head back
//              to the sky for the Moon Howl (the throat blazes).
//   mireking   a vast squat toad, mottled teal-slate with a pale belly, two
//              bulging eyes on top, a crown of rusted mill-grate bars, and a
//              throat sac that glows violet. It opens its wide mouth for a
//              Tongue Lash, swells the sac and gapes for a Swallow, and
//              heaves up on its hind legs to Belly Flop through the air.
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
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';

const flashable = (c) => toonMaterial({ color: c, emissive: '#FFFFFF', emissiveIntensity: 0 });
const lit = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}
function rigShell(name) {
  const group = new Group();
  group.name = name;
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  return { group, yaw, rig, mats, track };
}
const iface = (s, pose) => ({
  group: s.group,
  mats: s.mats,
  setYaw: (r) => {
    s.yaw.rotation.y = r;
  },
  setFlash(k) {
    const v = k < 0 ? 0 : k > 1 ? 1 : k;
    for (const m of s.mats) m.emissiveIntensity = v;
  },
  pose,
});
const ease = (cur, want, rate, dt) => cur + (want - cur) * (1 - Math.exp(-rate * dt));
const VIOLET = new Color(PALETTE.godstuffViolet);
const VIOLET_PEAK = new Color(PALETTE.godstuffVioletPeak);

// ------------------------------------------------------------ GLOAM WOLF --
// The wood's own greys pushed cool (the enemy rule), a near-black saddle and
// a pale moon-silver streak and belly so the shape reads at 50 % zoom.
const FUR = HIDE.boarBody.clone().lerp(new Color(PALETTE.warmGrey), 0.45).multiplyScalar(0.95);
const FUR_DARK = HIDE.boarDark.clone().multiplyScalar(0.7);
const FUR_PALE = new Color(PALETTE.bone).lerp(new Color(PALETTE.signalBlue), 0.18).multiplyScalar(0.95);
const MANE = HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.3).multiplyScalar(0.6);

export function buildGloamWolf() {
  const s = rigShell('boss-gloamwolf');
  const { rig, track } = s;
  const fur = track(flashable(FUR));
  const dark = track(flashable(FUR_DARK));
  const pale = track(flashable(FUR_PALE));
  const mane = track(flashable(MANE));
  const claw = track(flashable(HIDE.bone));
  const eyeMat = lit(PALETTE.godstuffVioletPeak);
  const throatMat = lit(PALETTE.godstuffViolet);
  // Everything above the legs rides `body`, so a crouch or a bound moves it
  // as one.
  const body = new Group();
  rig.add(body);
  // Deep chest, narrower loins: two masses.
  const chest = new Mesh(new IcosahedronGeometry(0.62, 1), fur);
  chest.scale.set(0.95, 1.05, 1.15);
  chest.position.set(0, 1.25, 0.45);
  addInk(chest);
  body.add(chest);
  const loins = new Mesh(new IcosahedronGeometry(0.5, 1), fur);
  loins.scale.set(0.85, 0.85, 1.3);
  loins.position.set(0, 1.18, -0.55);
  addInk(loins);
  body.add(loins);
  const saddle = new Mesh(new IcosahedronGeometry(0.5, 1), dark);
  saddle.scale.set(0.8, 0.45, 1.6);
  saddle.position.set(0, 1.52, -0.05);
  body.add(saddle);
  const belly = new Mesh(new IcosahedronGeometry(0.45, 1), pale);
  belly.scale.set(0.7, 0.5, 1.6);
  belly.position.set(0, 0.95, 0.05);
  body.add(belly);
  // The moon streak down each flank.
  for (const side of [-1, 1]) {
    const streak = new Mesh(new BoxGeometry(0.04, 0.12, 1.1), pale);
    streak.position.set(side * 0.52, 1.28, -0.05);
    streak.rotation.x = 0.12;
    body.add(streak);
  }
  // Neck and head; the head pivots for the howl and the rend.
  const neck = new Group();
  neck.position.set(0, 1.5, 0.9);
  body.add(neck);
  const neckM = new Mesh(new CylinderGeometry(0.3, 0.42, 0.7, 7), fur);
  neckM.rotation.x = -0.9;
  neckM.position.set(0, 0.1, 0.12);
  addInk(neckM);
  neck.add(neckM);
  const head = new Group();
  head.position.set(0, 0.3, 0.45);
  neck.add(head);
  const skull = new Mesh(new IcosahedronGeometry(0.34, 1), fur);
  skull.scale.set(1, 0.9, 1.1);
  addInk(skull);
  head.add(skull);
  const snout = new Mesh(new ConeGeometry(0.2, 0.62, 6), dark);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.05, 0.48);
  addInk(snout);
  head.add(snout);
  const nose = new Mesh(new SphereGeometry(0.07, 6, 4), lit(PALETTE.voidCharcoal));
  nose.position.set(0, -0.02, 0.78);
  head.add(nose);
  // The lower jaw drops for a howl or a rend; fangs on both.
  const jaw = new Group();
  jaw.position.set(0, -0.14, 0.12);
  head.add(jaw);
  const jawM = new Mesh(new ConeGeometry(0.15, 0.55, 5), dark);
  jawM.rotation.x = Math.PI / 2;
  jawM.position.set(0, -0.04, 0.3);
  jaw.add(jawM);
  for (const side of [-1, 1]) {
    const fang = new Mesh(new ConeGeometry(0.035, 0.16, 4), claw);
    fang.position.set(side * 0.08, -0.12, 0.62);
    fang.rotation.x = Math.PI;
    head.add(fang);
    const lowFang = new Mesh(new ConeGeometry(0.03, 0.12, 4), claw);
    lowFang.position.set(side * 0.07, 0.04, 0.48);
    jaw.add(lowFang);
    // Tall pointed ears.
    const ear = new Mesh(new ConeGeometry(0.11, 0.38, 4), dark);
    ear.position.set(side * 0.2, 0.32, -0.05);
    ear.rotation.set(-0.25, 0, side * -0.25);
    addInk(ear);
    head.add(ear);
    // Slanted violet eyes (the boss tell).
    const eye = new Mesh(new BoxGeometry(0.13, 0.035, 0.04), eyeMat);
    eye.position.set(side * 0.16, 0.08, 0.27);
    eye.rotation.z = side * -0.35;
    head.add(eye);
  }
  const throat = new Mesh(new SphereGeometry(0.1, 8, 6), throatMat);
  throat.position.set(0, -0.1, 0.35);
  head.add(throat);
  const throatGlow = glow(PALETTE.godstuffViolet, 1.2, 0.0);
  throatGlow.position.set(0, -0.1, 0.55);
  head.add(throatGlow);
  const eyeGlow = glow(PALETTE.godstuffViolet, 0.5, 0.2);
  eyeGlow.position.set(0, 0.12, 0.42);
  head.add(eyeGlow);
  // A mane of black bramble from the crown down the spine, buds of violet.
  const maneG = new ConeGeometry(0.09, 0.5, 4);
  const budMat = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });
  const buds = [];
  const spines = [];
  for (let i = 0; i < 12; i++) {
    const k = i / 11;
    const z = 1.05 - k * 1.7;
    const y = 1.85 - k * 0.25 - (k < 0.25 ? 0 : 0.12);
    const sp = new Mesh(maneG, mane);
    sp.position.set((i % 2 ? 0.1 : -0.1) * (1 - k * 0.5), y, z);
    sp.rotation.set(-0.7 - 0.3 * k, 0, (i % 2 ? -0.35 : 0.35));
    sp.scale.setScalar(1.2 - 0.5 * k);
    body.add(sp);
    spines.push(sp);
    if (i % 3 === 1) {
      const b = new Mesh(new SphereGeometry(0.06, 6, 4), budMat);
      b.position.set(0, y + 0.2, z - 0.05);
      body.add(b);
      buds.push(b);
    }
  }
  const maneGlow = glow(PALETTE.godstuffViolet, 1.3, 0.1);
  maneGlow.position.set(0, 1.9, 0.2);
  body.add(maneGlow);
  // A long bushy tail.
  const tail = new Group();
  tail.position.set(0, 1.35, -1.15);
  body.add(tail);
  const tailM = new Mesh(new ConeGeometry(0.2, 0.95, 6).translate(0, -0.48, 0), fur);
  tailM.rotation.x = -2.3;
  addInk(tailM);
  tail.add(tailM);
  const tailTip = new Mesh(new ConeGeometry(0.12, 0.3, 6).translate(0, -0.15, 0), pale);
  tailTip.position.set(0, -0.68, -0.55);
  tailTip.rotation.x = -2.3;
  tail.add(tailTip);
  // Four legs: upper and lower segments, pale paws, bone claws.
  const legs = [];
  const upG = new CylinderGeometry(0.15, 0.11, 0.62, 6).translate(0, -0.31, 0);
  const lowG = new CylinderGeometry(0.1, 0.08, 0.55, 6).translate(0, -0.27, 0);
  const pawG = new IcosahedronGeometry(0.13, 0);
  for (const [x, z, front] of [[-0.32, 0.62, true], [0.32, 0.62, true], [-0.3, -0.72, false], [0.3, -0.72, false]]) {
    const hip = new Group();
    hip.position.set(x, 1.15, z);
    rig.add(hip);
    const up = new Mesh(upG, front ? fur : dark);
    addInk(up);
    hip.add(up);
    const knee = new Group();
    knee.position.y = -0.6;
    hip.add(knee);
    const low = new Mesh(lowG, dark);
    knee.add(low);
    const paw = new Mesh(pawG, pale);
    paw.scale.set(1, 0.6, 1.3);
    paw.position.set(0, -0.55, 0.06);
    knee.add(paw);
    for (const cx of [-0.05, 0.05]) {
      const c = new Mesh(new ConeGeometry(0.02, 0.09, 3), claw);
      c.position.set(cx, -0.58, 0.2);
      c.rotation.x = 1.5;
      knee.add(c);
    }
    legs.push({ hip, knee, front, side: x > 0 ? 1 : -1 });
  }
  const shadow = groundShadow(1.15, 0.42, { deep: 1.6 });
  s.group.add(shadow);
  let lastT = null;
  let crouchK = 0;
  let howlK = 0;
  let rendK = 0;
  let rageK = 0;
  let leapT = -1;
  return iface(s, ({ t, walkPhase = 0, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const mode = e ? e.mode : null;
    crouchK = ease(crouchK, mode === 'crouch' ? 1 : 0, 10, dt);
    howlK = ease(howlK, attack === 'howl' ? Math.min(1, telegraphK * 1.3) : 0, 9, dt);
    rendK = ease(rendK, attack === 'rend' ? telegraphK : 0, 16, dt);
    rageK = ease(rageK, e && e.enraged ? 1 : 0, 3, dt);
    // The bound: an arc over the 16-tick leap (0.27 s).
    if (mode === 'leap') {
      if (leapT < 0) leapT = t;
    } else leapT = -1;
    const lk = leapT >= 0 ? Math.min(1, (t - leapT) / 0.27) : 0;
    const air = leapT >= 0 ? Math.sin(lk * Math.PI) : 0;
    rig.position.y = 1.1 * air;
    body.position.y = -0.32 * crouchK - 0.08 * rendK;
    body.rotation.x = 0.14 * crouchK - 0.35 * (leapT >= 0 ? Math.cos(lk * Math.PI) : 0) * air - 0.28 * howlK + 0.1 * rendK;
    shadow.scale.setScalar(1 - 0.35 * air);
    // Gait: a loping trot; legs tuck in the air and splay in the crouch.
    const step = walkPhase * 2.2;
    for (const L of legs) {
      const ph = step + (L.front ? 0 : Math.PI) + (L.side > 0 ? Math.PI * 0.5 : 0);
      const swing = Math.sin(ph) * 0.55 * moveK;
      const tuck = air * (L.front ? -1.1 : 0.9);
      L.hip.rotation.x = swing + tuck + (L.front ? -0.35 : 0.5) * crouchK - (L.front && L.side > 0 ? 1.1 * rendK : 0);
      L.knee.rotation.x = Math.max(0, -Math.sin(ph)) * 0.6 * moveK + (L.front ? 0.6 : -0.8) * crouchK + air * (L.front ? 1.2 : -1.0);
      L.hip.position.y = 1.15 - 0.3 * crouchK;
    }
    // Head: low and forward in the crouch, thrown to the sky in the howl,
    // lunging down in the rend; the jaw opens on both.
    neck.rotation.x = 0.35 * crouchK - 1.05 * howlK + 0.35 * rendK + 0.04 * Math.sin(t * 1.9);
    head.rotation.x = 0.15 * crouchK - 0.35 * howlK + 0.2 * rendK;
    jaw.rotation.x = 0.55 * Math.max(howlK, rendK) + 0.05 * Math.sin(t * 2.3);
    tail.rotation.x = -0.25 + 0.25 * air + 0.2 * Math.sin(t * 2.4) * (1 - crouchK) - 0.15 * crouchK;
    tail.rotation.y = 0.3 * Math.sin(t * 3.1) * (0.3 + moveK);
    const fever = 0.55 + 0.2 * Math.sin(t * 2.6) + (1 - hpFrac) * 0.3 + 0.3 * rageK;
    for (let i = 0; i < buds.length; i++) buds[i].scale.setScalar(1 + 0.3 * Math.sin(t * 3.2 + i) * fever);
    for (let i = 0; i < spines.length; i++) spines[i].rotation.x = -0.7 - 0.3 * (i / 11) - 0.35 * howlK - 0.2 * rageK;
    throatGlow.material.opacity = Math.min(0.9, 0.85 * howlK + 0.35 * rendK);
    throat.scale.setScalar(1 + howlK);
    eyeGlow.material.opacity = 0.18 + 0.22 * crouchK + 0.15 * rageK;
    maneGlow.material.opacity = Math.min(0.35, 0.08 * fever + 0.22 * howlK);
    eyeMat.color.copy(VIOLET).lerp(VIOLET_PEAK, 0.4 + 0.6 * Math.max(crouchK, howlK, rageK * 0.5));
  });
}

// ------------------------------------------------------------- MIRE KING --
const TOAD = HIDE.toadBody.clone().multiplyScalar(0.95);
const TOAD_DARK = HIDE.toadDark.clone();
const TOAD_BELLY = HIDE.toadSac.clone().multiplyScalar(0.92);
const RUST = HIDE.ramDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.45).multiplyScalar(1.05);

export function buildMireKing() {
  const s = rigShell('boss-mireking');
  const { rig, track } = s;
  const hide = track(flashable(TOAD));
  const dark = track(flashable(TOAD_DARK));
  const belly = track(flashable(TOAD_BELLY));
  const rust = track(flashable(RUST));
  const sacMat = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false, transparent: true, opacity: 0.85 });
  const mouthMat = lit(PALETTE.godstuffViolet);
  const body = new Group();
  rig.add(body);
  // A wide, low, lumpy body.
  const trunk = new Mesh(new IcosahedronGeometry(1.0, 2), hide);
  trunk.scale.set(1.35, 0.75, 1.15);
  trunk.position.set(0, 0.95, -0.15);
  addInk(trunk);
  body.add(trunk);
  const under = new Mesh(new IcosahedronGeometry(0.95, 1), belly);
  under.scale.set(1.25, 0.5, 1.05);
  under.position.set(0, 0.65, 0.05);
  body.add(under);
  // Warts and dark mottling over the back.
  const wartG = new IcosahedronGeometry(0.11, 0);
  const warts = [[0.55, 1.55, -0.3], [-0.6, 1.5, -0.1], [0.2, 1.65, -0.6], [-0.25, 1.6, -0.75], [0.85, 1.25, -0.6], [-0.9, 1.2, -0.55], [0.0, 1.62, -0.25], [0.45, 1.45, 0.25], [-0.45, 1.42, 0.3]];
  for (const [x, y, z] of warts) {
    const w = new Mesh(wartG, dark);
    w.position.set(x, y, z);
    w.scale.setScalar(0.8 + ((x * 7 + z * 3) % 1 + 1) % 1 * 0.6);
    body.add(w);
  }
  // The head is the front of the body: the upper lip and lower jaw part.
  const head = new Group();
  head.position.set(0, 1.05, 0.75);
  body.add(head);
  const upper = new Mesh(new SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hide);
  upper.scale.set(1.25, 0.45, 0.75);
  addInk(upper);
  head.add(upper);
  const jaw = new Group();
  head.add(jaw);
  const lower = new Mesh(new SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), belly);
  lower.scale.set(1.2, 0.35, 0.72);
  jaw.add(lower);
  // The mouth's violet inside (seen when it gapes) and the tongue.
  const maw = new Mesh(new SphereGeometry(0.6, 10, 6), mouthMat);
  maw.scale.set(1.3, 0.25, 0.8);
  maw.position.set(0, -0.02, 0.1);
  head.add(maw);
  const tongue = new Mesh(new CylinderGeometry(0.11, 0.14, 1, 7).translate(0, 0.5, 0), track(flashable(HIDE.toadSac.clone().lerp(new Color(PALETTE.godstuffViolet), 0.35))));
  tongue.rotation.x = Math.PI / 2;
  tongue.position.set(0, -0.05, 0.25);
  tongue.scale.set(1, 0.01, 1);
  head.add(tongue);
  const mawGlow = glow(PALETTE.godstuffViolet, 1.8, 0);
  mawGlow.position.set(0, 0.05, 0.6);
  head.add(mawGlow);
  // The throat sac swells under the jaw.
  const sac = new Mesh(new SphereGeometry(0.42, 10, 8), sacMat);
  sac.position.set(0, -0.32, 0.45);
  sac.scale.set(1, 0.7, 0.8);
  head.add(sac);
  const sacGlow = glow(PALETTE.godstuffViolet, 1.6, 0.2);
  sacGlow.position.set(0, -0.3, 0.75);
  head.add(sacGlow);
  // Bulging eyes on top, violet-slit.
  const eyes = [];
  for (const side of [-1, 1]) {
    const bulb = new Mesh(new SphereGeometry(0.24, 10, 8), hide);
    bulb.position.set(side * 0.55, 0.42, -0.05);
    addInk(bulb);
    head.add(bulb);
    const iris = new Mesh(new SphereGeometry(0.13, 8, 6), lit(PALETTE.godstuffVioletPeak));
    iris.position.set(side * 0.62, 0.48, 0.12);
    head.add(iris);
    const slit = new Mesh(new BoxGeometry(0.16, 0.03, 0.03), lit(PALETTE.voidCharcoal));
    slit.position.set(side * 0.64, 0.49, 0.24);
    head.add(slit);
    eyes.push(iris);
  }
  // The crown: a ring of rusted mill-grate bars between the eyes.
  const crown = new Group();
  crown.position.set(0, 0.62, -0.25);
  head.add(crown);
  const band = new Mesh(new TorusGeometry(0.42, 0.05, 5, 14), rust);
  band.rotation.x = Math.PI / 2;
  addInk(band);
  crown.add(band);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const bar = new Mesh(new BoxGeometry(0.06, 0.38 + (i % 2) * 0.16, 0.06), rust);
    bar.position.set(Math.cos(a) * 0.42, 0.2 + (i % 2) * 0.08, Math.sin(a) * 0.42);
    bar.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
    crown.add(bar);
    if (i % 2 === 0) {
      const gem = new Mesh(new IcosahedronGeometry(0.05, 0), lit(PALETTE.godstuffViolet));
      gem.position.set(Math.cos(a) * 0.44, 0.44, Math.sin(a) * 0.44);
      crown.add(gem);
    }
  }
  // Weed trailing off the back.
  for (const [x, z, rz] of [[0.5, -1.0, 0.4], [-0.4, -1.05, -0.3], [0.05, -1.15, 0.05]]) {
    const weed = new Mesh(new BoxGeometry(0.08, 0.7, 0.03), dark);
    weed.position.set(x, 1.0, z);
    weed.rotation.set(0.6, 0, rz);
    body.add(weed);
  }
  // Front legs splayed forward; huge hind legs folded at the sides.
  const fronts = [];
  const hinds = [];
  for (const side of [-1, 1]) {
    const f = new Group();
    f.position.set(side * 0.8, 0.75, 0.55);
    rig.add(f);
    const arm = new Mesh(new CylinderGeometry(0.17, 0.12, 0.75, 6).translate(0, -0.37, 0), hide);
    arm.rotation.set(0.35, 0, side * 0.35);
    addInk(arm);
    f.add(arm);
    const hand = new Mesh(new IcosahedronGeometry(0.18, 0), dark);
    hand.scale.set(1.4, 0.4, 1.3);
    hand.position.set(side * 0.25, -0.68, 0.28);
    f.add(hand);
    fronts.push(f);
    const h = new Group();
    h.position.set(side * 1.05, 0.7, -0.6);
    rig.add(h);
    const thigh = new Mesh(new IcosahedronGeometry(0.48, 1), hide);
    thigh.scale.set(0.7, 0.7, 1.25);
    thigh.position.set(0, 0, 0.1);
    addInk(thigh);
    h.add(thigh);
    const shin = new Group();
    shin.position.set(side * 0.1, -0.2, 0.55);
    h.add(shin);
    const shinM = new Mesh(new CylinderGeometry(0.14, 0.1, 0.8, 6).translate(0, 0, -0.4), dark);
    shinM.rotation.x = Math.PI / 2 - 0.2;
    shin.add(shinM);
    const foot = new Mesh(new IcosahedronGeometry(0.22, 0), dark);
    foot.scale.set(1.3, 0.35, 1.6);
    foot.position.set(0, -0.42, -0.2);
    shin.add(foot);
    hinds.push({ h, shin, side });
  }
  const pool = glow(PALETTE.godstuffViolet, 3.0, 0.1);
  pool.position.set(0, 0.06, 0.4);
  rig.add(pool);
  const shadow = groundShadow(1.5, 0.45, { deep: 1.3, wide: 1.1 });
  s.group.add(shadow);
  let lastT = null;
  let heaveK = 0;
  let gapeK = 0;
  let lashK = 0;
  let rageK = 0;
  let tongueK = 0;
  let flopT = -1;
  let prevAttack = null;
  return iface(s, ({ t, walkPhase = 0, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const mode = e ? e.mode : null;
    // The lash resolves on the frame its telegraph ends: shoot the tongue.
    if (prevAttack === 'lash' && attack !== 'lash') tongueK = 1;
    prevAttack = attack;
    heaveK = ease(heaveK, mode === 'heave' ? 1 : 0, 7, dt);
    gapeK = ease(gapeK, attack === 'swallow' ? Math.min(1, telegraphK * 1.4) : 0, 8, dt);
    lashK = ease(lashK, attack === 'lash' ? telegraphK : 0, 14, dt);
    rageK = ease(rageK, e && e.enraged ? 1 : 0, 3, dt);
    tongueK = Math.max(0, tongueK - dt * 3.2);
    if (mode === 'flop') {
      if (flopT < 0) flopT = t;
    } else flopT = -1;
    const fk = flopT >= 0 ? Math.min(1, (t - flopT) / 0.33) : 0;
    const air = flopT >= 0 ? Math.sin(fk * Math.PI) : 0;
    // Hop-waddle; a heave lifts the front and crouches the hind legs; the
    // flop arcs the whole body through the air.
    const hop = Math.abs(Math.sin(walkPhase * 1.6)) * moveK;
    rig.position.y = 1.4 * air + 0.12 * hop;
    body.rotation.x = -0.28 * heaveK + 0.25 * (flopT >= 0 ? Math.cos(fk * Math.PI) : 0) * air * -1 + 0.08 * lashK - 0.1 * gapeK;
    body.position.y = -0.12 * heaveK + 0.04 * Math.sin(t * 1.6);
    body.scale.set(1 + 0.04 * Math.sin(t * 1.6) + 0.08 * gapeK, 1 - 0.03 * Math.sin(t * 1.6) + 0.06 * gapeK, 1);
    shadow.scale.setScalar(1 - 0.3 * air);
    for (const H of hinds) {
      H.h.rotation.x = -0.5 * heaveK + 0.9 * air;
      H.shin.rotation.x = 0.6 * heaveK - 0.6 * air + 0.2 * hop;
    }
    for (let i = 0; i < fronts.length; i++) fronts[i].rotation.x = -0.25 * heaveK + 0.6 * air - 0.3 * hop * (i ? 1 : -1);
    // The mouth: open for the lash and the gape; the tongue shoots out.
    jaw.rotation.x = 0.32 * lashK + 0.65 * gapeK + 0.4 * tongueK;
    head.rotation.x = -0.12 * gapeK;
    maw.scale.set(1.3, 0.25 + 0.9 * Math.max(gapeK, lashK * 0.6, tongueK * 0.6), 0.8);
    tongue.scale.set(1, Math.max(0.01, 3.6 * Math.sin(Math.min(1, tongueK) * Math.PI) ** 0.6), 1);
    mawGlow.material.opacity = Math.min(0.9, 0.75 * gapeK + 0.4 * lashK + 0.3 * tongueK);
    // The sac breathes, swells with the gape and the heave, beats with rage.
    const breath = 0.5 + 0.5 * Math.sin(t * (1.8 + 1.4 * rageK + (1 - hpFrac)));
    sac.scale.setScalar(0.85 + 0.12 * breath + 0.7 * gapeK + 0.3 * heaveK);
    sacMat.opacity = 0.7 + 0.25 * Math.max(breath * 0.6, gapeK);
    sacGlow.material.opacity = Math.min(0.85, 0.18 + 0.1 * breath + 0.5 * gapeK + 0.15 * rageK);
    crown.rotation.z = 0.04 * Math.sin(t * 1.3);
    for (const iris of eyes) iris.material.color.copy(VIOLET).lerp(VIOLET_PEAK, 0.5 + 0.5 * Math.max(gapeK, heaveK, rageK * 0.6));
    pool.material.opacity = 0.08 + 0.05 * breath + 0.2 * gapeK;
  });
}
