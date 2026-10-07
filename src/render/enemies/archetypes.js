// Rigs for the five Gauntlet enemy archetypes (BUILD_BRIEF §23.5, M4b), in the
// Thorn Boar's grammar (render/enemies/boar.js): low-segment flat-faceted
// primitives (the angular anti-party language), cool desaturated hides with a
// real VALUE structure, angular charcoal eyes (never the party's round warm
// eyes), ink on the big masses, a contact shadow on the ground, and exactly ONE
// indigo corruption tell each. Every silhouette is built to read alone at 50%
// zoom — the brief's one-line identity per enemy:
//   quillback  a round dome wrapped in radial quills (a spiky ball) + a snout;
//              indigo quill tips. Rolls (spins) down its charge lane
//   toad       wide squat low mass with a big pale throat sac; indigo eye-glint.
//              The sac inflates through the throw
//   moth       tall V wings over a thin body — the ONLY vertical / flying
//              silhouette (hovers ~1 u up, its shadow on the floor); indigo
//              wing eyespots
//   ram        a blocky bighorn whose huge curled horns form a SHIELD DISC in
//              front; indigo horn rims (the guard reads from the front)
//   mole       a low wedge snout with oversized digging claws; indigo claw
//              tips. Burrowed it is only a moving earth mound + a dirt wake
//
// Faces +Z. The layer drives animation through `pose({ t, walkPhase, moveK,
// telegraphK, fireK, e })` (`e` = the sim entity, READ ONLY).
import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor } from '../critters/common.js';
import { markShared } from '../geocache.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_DIM, TELL_INDIGO_GLOW } from './style.js';
import { buildWasp, buildThornling, buildCrab, buildLamprey, buildGravewisp, buildKnight } from './slice2.js';
import { buildHusk, buildLancer, buildGeode, buildCenser } from './heart.js';

const flashable = (color) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 });
const inkMat = () => new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
const tellMat = (dim = false) => new MeshBasicMaterial({ color: dim ? TELL_INDIGO_DIM : TELL_INDIGO, toneMapped: false });

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

// Angular slit eyes: two thin charcoal bars, slanted (never round, never warm).
function slitEyes(parent, { x = 0.1, y = 0, z = 0.1, len = 0.08, slant = 0.4 } = {}) {
  const g = shared('eye-bar', () => new BoxGeometry(1, 0.022, 0.022));
  const m = inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, m);
    eye.scale.x = len;
    eye.position.set(side * x, y, z);
    eye.rotation.set(0, side * -0.3, side * slant);
    parent.add(eye);
  }
}

// ------------------------------------------------------------ QUILLBACK --
export function buildQuillback() {
  const group = new Group();
  group.name = 'quillback';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group(); // hop / squash target
  yaw.add(rig);
  const ball = new Group(); // spins while rolling
  ball.position.y = 0.34;
  rig.add(ball);
  const mats = [];
  const track = (m) => (mats.push(m), m);

  const dome = new Mesh(shared('q-dome', () => new IcosahedronGeometry(0.3, 1)), track(flashable(HIDE.quillBody)));
  dome.scale.set(1, 0.9, 1);
  addInk(dome);
  ball.add(dome);
  // Radial quills: one merged mesh for the shafts, one for the indigo tips.
  const quillGeo = shared('q-quills', () => {
    const shafts = [];
    const tips = [];
    const N = 16;
    for (let i = 0; i < N; i++) {
      // Golden-angle spread over the upper ~75% of the sphere.
      const u = (i + 0.5) / N;
      const phi = Math.acos(1 - 1.55 * u);
      const th = i * 2.399963;
      const dir = [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
      const s = new ConeGeometry(0.045, 0.26, 4).translate(0, 0.13, 0);
      const t = new ConeGeometry(0.03, 0.1, 4).translate(0, 0.3, 0);
      // +Y onto dir: pitch by phi about X, then yaw by (PI/2 - th) about Y.
      s.rotateX(phi).rotateY(Math.PI / 2 - th);
      t.rotateX(phi).rotateY(Math.PI / 2 - th);
      s.translate(dir[0] * 0.24, dir[1] * 0.22, dir[2] * 0.24);
      t.translate(dir[0] * 0.24, dir[1] * 0.22, dir[2] * 0.24);
      shafts.push(s);
      tips.push(t);
    }
    const g = mergeGeometries(shafts);
    g.userData.tips = mergeGeometries(tips);
    markShared(g.userData.tips);
    return g;
  });
  const quills = new Mesh(quillGeo, track(flashable(HIDE.quillSpine)));
  addInk(quills);
  ball.add(quills);
  const tipMesh = new Mesh(quillGeo.userData.tips, tellMat());
  ball.add(tipMesh);
  // Snout + slit eyes on the front of the dome (they roll with the ball).
  const snout = new Mesh(shared('q-snout', () => new ConeGeometry(0.075, 0.18, 5)), track(flashable(HIDE.quillDark)));
  snout.rotation.x = Math.PI / 2 + 0.25;
  snout.position.set(0, -0.08, 0.3);
  addInk(snout);
  ball.add(snout);
  slitEyes(ball, { x: 0.085, y: 0.02, z: 0.27, len: 0.07, slant: 0.35 });
  // Stub feet (under the ball, only visible walking).
  const footG = shared('q-foot', () => new CylinderGeometry(0.04, 0.05, 0.12, 5));
  const feet = [];
  const footMat = track(flashable(HIDE.quillDark));
  for (const [x, z] of [[-0.14, 0.12], [0.14, 0.12], [-0.14, -0.12], [0.14, -0.12]]) {
    const f = new Mesh(footG, footMat);
    f.position.set(x, 0.06, z);
    rig.add(f);
    feet.push(f);
  }
  const glow = tellGlow(0.7, 0.2);
  glow.position.set(0, 0.62, 0);
  rig.add(glow);
  group.add(groundShadow(0.42, 0.84, { forward: 0.28, wide: 1.1, deep: 0.94 }));
  let spin = 0;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const rolling = e && e.mode === 'charge';
      const stagger = e && e.mode === 'stagger';
      // Rolling: the ball spins at speed/radius; feet tuck.
      if (rolling) spin += dt * (6.0 / 0.34);
      else spin *= Math.exp(-6 * dt);
      ball.rotation.x = spin;
      for (const f of feet) f.visible = !rolling;
      const hop = Math.abs(Math.sin(walkPhase)) * 0.03 * moveK;
      // Wind-up: the ball presses DOWN and rocks back (the coil before the roll).
      rig.position.y = hop - 0.05 * telegraphK + (stagger ? 0.02 * Math.sin(t * 40) : 0);
      rig.scale.set(1 + 0.08 * telegraphK, 1 - 0.12 * telegraphK, 1 + 0.08 * telegraphK);
      yaw.rotation.z = stagger ? 0.12 * Math.sin(t * 30) : 0;
      if (!rolling) ball.rotation.x = -0.35 * telegraphK;
      glow.material.opacity = 0.16 + 0.06 * Math.sin(t * 2.4) + 0.25 * telegraphK;
    },
  };
}

// --------------------------------------------------------------- TOAD --
export function buildToad() {
  const group = new Group();
  group.name = 'toad';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const body = new Mesh(shared('t-body', () => new IcosahedronGeometry(0.3, 1)), track(flashable(HIDE.toadBody)));
  body.scale.set(1.45, 0.62, 1.2);
  body.position.set(0, 0.24, -0.08);
  addInk(body);
  rig.add(body);
  const head = new Mesh(shared('t-head', () => new IcosahedronGeometry(0.2, 1)), track(flashable(HIDE.toadBody)));
  head.scale.set(1.6, 0.6, 1.05);
  head.position.set(0, 0.3, 0.24);
  addInk(head);
  rig.add(head);
  // A wide dark mouth line across the front of the head.
  const mouth = new Mesh(shared('t-mouth', () => new BoxGeometry(0.44, 0.025, 0.03)), inkMat());
  mouth.position.set(0, 0.25, 0.43);
  rig.add(mouth);
  // The throat sac: a big pale bulb hanging under the chin, in front.
  const sac = new Mesh(shared('t-sac', () => new SphereGeometry(0.19, 10, 7)), track(flashable(HIDE.toadSac)));
  sac.position.set(0, 0.15, 0.42);
  addInk(sac);
  rig.add(sac);
  // Big eye bulges on top of the head, with the indigo glint (the one tell).
  const bulgeG = shared('t-bulge', () => new IcosahedronGeometry(0.095, 0));
  const glints = [];
  for (const side of [-1, 1]) {
    const b = new Mesh(bulgeG, track(flashable(HIDE.toadDark)));
    b.position.set(side * 0.19, 0.45, 0.22);
    addInk(b);
    rig.add(b);
    const glint = new Mesh(shared('t-glint', () => new BoxGeometry(0.08, 0.028, 0.02)), tellMat());
    glint.position.set(side * 0.19, 0.47, 0.305);
    glint.rotation.z = side * 0.4;
    rig.add(glint);
    const gl = tellGlow(0.3, 0.32);
    gl.position.set(side * 0.19, 0.48, 0.32);
    rig.add(gl);
    glints.push(gl);
  }
  // Warts on the back (value breakers).
  const wartG = shared('t-wart', () => new IcosahedronGeometry(0.045, 0));
  const wartMat = track(flashable(HIDE.toadDark));
  for (const [x, y, z] of [[-0.14, 0.44, -0.08], [0.1, 0.46, -0.16], [0.2, 0.4, 0.02], [-0.22, 0.38, -0.2], [0.02, 0.47, 0.02]]) {
    const w = new Mesh(wartG, wartMat);
    w.position.set(x, y, z);
    rig.add(w);
  }
  // Folded hind legs + stubby fore legs.
  const legs = [];
  const hindG = shared('t-hind', () => new CylinderGeometry(0.07, 0.05, 0.3, 5));
  const foreG = shared('t-fore', () => new CylinderGeometry(0.04, 0.035, 0.2, 5));
  const legMat = track(flashable(HIDE.toadDark));
  for (const side of [-1, 1]) {
    const hind = new Mesh(hindG, legMat);
    hind.position.set(side * 0.34, 0.12, -0.2);
    hind.rotation.set(0.9, 0, side * 0.9);
    addInk(hind);
    rig.add(hind);
    const fore = new Mesh(foreG, legMat);
    fore.position.set(side * 0.22, 0.09, 0.26);
    fore.rotation.set(-0.3, 0, side * 0.35);
    rig.add(fore);
    legs.push(hind, fore);
  }
  group.add(groundShadow(0.5, 0.86, { forward: 0.26, wide: 1.3, deep: 0.9 }));
  let lastThrow = -1;
  let throwAge = 9;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, walkPhase, moveK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.throwTick !== lastThrow && e.throwTick >= 0) {
        lastThrow = e.throwTick;
        throwAge = 0;
      }
      throwAge += dt;
      // Throw: the sac swells then snaps (0.45 s), the head tips up.
      const k = throwAge < 0.45 ? Math.sin((throwAge / 0.45) * Math.PI) : 0;
      sac.scale.setScalar(1 + 0.55 * k + 0.05 * Math.sin(t * 2.2));
      head.rotation.x = -0.35 * k;
      // Hop-walk: squash and stretch on each hop.
      const hop = Math.max(0, Math.sin(walkPhase * 0.8)) * moveK;
      rig.position.y = 0.06 * hop + 0.006 * Math.sin(t * 1.8);
      rig.scale.set(1 + 0.05 * (1 - hop) * moveK, 1 - 0.06 * (1 - hop) * moveK + 0.05 * hop, 1);
      for (const g of glints) g.material.opacity = 0.24 + 0.08 * Math.sin(t * 3) + 0.3 * k;
      void legs;
    },
  };
}

// --------------------------------------------------------------- MOTH --
export function buildMoth() {
  const group = new Group();
  group.name = 'moth';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group(); // hover height lives here
  rig.position.y = 0.95;
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const bodyMat = track(flashable(HIDE.mothBody));
  const body = new Mesh(shared('m-body', () => new CylinderGeometry(0.06, 0.035, 0.46, 6)), bodyMat);
  body.rotation.x = Math.PI / 2 - 0.35;
  addInk(body);
  rig.add(body);
  const thorax = new Mesh(shared('m-thorax', () => new IcosahedronGeometry(0.085, 0)), bodyMat);
  thorax.position.set(0, 0.04, 0.12);
  addInk(thorax);
  rig.add(thorax);
  const head = new Mesh(shared('m-head', () => new IcosahedronGeometry(0.06, 0)), bodyMat);
  head.position.set(0, 0.07, 0.23);
  rig.add(head);
  slitEyes(head, { x: 0.035, y: 0.01, z: 0.045, len: 0.05, slant: 0.5 });
  // Feathered antennae.
  const antG = shared('m-ant', () => new ConeGeometry(0.03, 0.2, 3));
  for (const side of [-1, 1]) {
    const a = new Mesh(antG, bodyMat);
    a.position.set(side * 0.05, 0.16, 0.27);
    a.rotation.set(0.5, 0, side * -0.5);
    rig.add(a);
  }
  // Wings: broad moth fore + hind wings, sheets hinged along the body axis and
  // RAISED in a V (dihedral) — the only tall / flying silhouette in the roster.
  // Shapes are drawn span +x, chord +y, then laid into the XZ plane (chord ->
  // +z = forward) so the hinge rotation (about Z) lifts the tips.
  const foreShape = shared('m-fore', () => {
    const s = new Shape();
    s.moveTo(0, 0.1);
    s.bezierCurveTo(0.18, 0.32, 0.52, 0.34, 0.66, 0.16);
    s.bezierCurveTo(0.7, 0.02, 0.5, -0.12, 0.28, -0.1);
    s.bezierCurveTo(0.14, -0.08, 0.04, -0.02, 0, 0.1);
    return new ShapeGeometry(s, 10).rotateX(Math.PI / 2);
  });
  const hindShape = shared('m-hind', () => {
    const s = new Shape();
    s.moveTo(0, -0.02);
    s.bezierCurveTo(0.14, -0.06, 0.4, -0.12, 0.42, -0.3);
    s.bezierCurveTo(0.36, -0.44, 0.12, -0.36, 0, -0.16);
    s.lineTo(0, -0.02);
    return new ShapeGeometry(s, 8).rotateX(Math.PI / 2);
  });
  const wingMat = track(flashable(HIDE.mothWing));
  wingMat.side = 2; // DoubleSide
  const lowMat = track(flashable(HIDE.mothWingDark));
  lowMat.side = 2;
  const veinMat = new MeshBasicMaterial({ color: HIDE.mothBody, toneMapped: false, side: 2 });
  const veinG = shared('m-vein', () =>
    mergeGeometries([
      new BoxGeometry(0.5, 0.006, 0.014).translate(0.3, 0.004, 0.08),
      new BoxGeometry(0.3, 0.006, 0.012).rotateY(-0.5).translate(0.36, 0.004, 0.0),
    ])
  );
  const spotG = shared('m-spot', () => new CircleGeometry(0.075, 14).rotateX(-Math.PI / 2));
  const ringG = shared('m-spotring', () => new RingGeometry(0.075, 0.105, 16).rotateX(-Math.PI / 2));
  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new Group(); // hinge along the body
    pivot.position.set(side * 0.04, 0.05, 0.06);
    rig.add(pivot);
    const fw = new Mesh(foreShape, wingMat);
    fw.scale.set(side * 1.15, 1, 1.15);
    addInk(fw);
    pivot.add(fw);
    const hw = new Mesh(hindShape, lowMat);
    hw.scale.set(side * 1.1, 1, 1.1);
    hw.position.y = -0.004;
    addInk(hw);
    pivot.add(hw);
    const vein = new Mesh(veinG, veinMat);
    vein.scale.set(side * 1.15, 1, 1.15);
    pivot.add(vein);
    // The one tell: an indigo eyespot ringed in dark on each forewing.
    const spot = new Mesh(spotG, tellMat());
    spot.position.set(side * 0.44, 0.008, 0.16);
    pivot.add(spot);
    const ring = new Mesh(ringG, new MeshBasicMaterial({ color: HIDE.mothBody, toneMapped: false, side: 2 }));
    ring.position.set(side * 0.44, 0.007, 0.16);
    pivot.add(ring);
    wings.push({ pivot, side });
  }
  const glow = tellGlow(0.6, 0.18);
  glow.position.set(0, 0.5, 0.05);
  rig.add(glow);
  // The flier's shadow stays on the floor (it is what places the moth in space).
  const shadow = groundShadow(0.34, 0.62, { forward: 0.1, wide: 1.5, deep: 0.8 });
  group.add(shadow);
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, telegraphK, e }) {
      const swoop = e && e.mode === 'swoop';
      // Flap: fast shallow beats hovering, wings swept back and low in a dive.
      const beat = Math.sin(t * (swoop ? 10 : 17));
      for (const w of wings) {
        // Dihedral: hovering wings beat between a shallow and a steep V; the
        // wind-up holds them high; a dive sweeps them back and flat.
        const dihedral = swoop ? 0.22 : 0.5 + 0.55 * (0.5 + 0.5 * beat) + 0.25 * telegraphK;
        w.pivot.rotation.set(0, swoop ? w.side * 0.55 : 0, w.side * dihedral);
      }
      const h = swoop ? 0.45 : 0.95 + 0.06 * Math.sin(t * 2.3) + 0.12 * telegraphK;
      rig.position.y += (h - rig.position.y) * 0.25;
      rig.rotation.x = swoop ? 0.55 : -0.1 * telegraphK;
      // Shadow tightens as the moth drops.
      const s = 0.8 + 0.4 * (1 - (rig.position.y - 0.4) / 0.7);
      shadow.scale.set(1.5 * s, 0.8 * s, 1);
      glow.material.opacity = 0.14 + 0.06 * beat + 0.24 * telegraphK;
    },
  };
}

// ---------------------------------------------------------------- RAM --
export function buildRam() {
  const group = new Group();
  group.name = 'ram';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const body = new Mesh(shared('r-body', () => new BoxGeometry(0.62, 0.44, 0.86, 1, 1, 1)), track(flashable(HIDE.ramBody)));
  body.position.set(0, 0.52, -0.1);
  addInk(body);
  rig.add(body);
  // Shaggy fleece chunks on the back (breaks the box into a mass with texture).
  const fleeceG = shared('r-fleece', () => new IcosahedronGeometry(0.16, 0));
  const fleeceMat = track(flashable(HIDE.ramBody));
  for (const [x, z] of [[-0.16, 0.08], [0.16, -0.06], [-0.1, -0.3], [0.14, 0.22]]) {
    const f = new Mesh(fleeceG, fleeceMat);
    f.scale.set(1.2, 0.6, 1.1);
    f.position.set(x, 0.76, z - 0.1);
    rig.add(f);
  }
  const head = new Mesh(shared('r-head', () => new BoxGeometry(0.3, 0.3, 0.34)), track(flashable(HIDE.ramDark)));
  head.position.set(0, 0.58, 0.42);
  addInk(head);
  rig.add(head);
  const muzzle = new Mesh(shared('r-muzzle', () => new BoxGeometry(0.2, 0.16, 0.16)), track(flashable(HIDE.ramDark)));
  muzzle.position.set(0, 0.5, 0.62);
  rig.add(muzzle);
  slitEyes(head, { x: 0.1, y: 0.03, z: 0.175, len: 0.08, slant: 0.35 });
  // THE HORNS: two thick curls sweeping forward and meeting in a shield disc.
  const hornMat = track(flashable(HIDE.ramHorn));
  const curlG = shared('r-curl', () => new TorusGeometry(0.2, 0.075, 6, 12, Math.PI * 1.4));
  for (const side of [-1, 1]) {
    const curl = new Mesh(curlG, hornMat);
    curl.position.set(side * 0.2, 0.66, 0.46);
    curl.rotation.set(0, side * 1.25, side > 0 ? 0.6 : Math.PI - 0.6);
    addInk(curl);
    rig.add(curl);
  }
  const shieldG = shared('r-shield', () => new CylinderGeometry(0.36, 0.36, 0.08, 10));
  const shield = new Mesh(shieldG, hornMat);
  shield.rotation.x = Math.PI / 2;
  shield.position.set(0, 0.58, 0.8);
  addInk(shield);
  rig.add(shield);
  // Indigo horn rims (the one tell) on the shield's face + ridge.
  const rimG = shared('r-rim', () => new TorusGeometry(0.33, 0.028, 5, 20));
  const rim = new Mesh(rimG, tellMat());
  rim.position.set(0, 0.58, 0.846);
  rig.add(rim);
  const ridgeG = shared('r-ridge', () => new BoxGeometry(0.05, 0.5, 0.03));
  const ridge = new Mesh(ridgeG, tellMat(true));
  ridge.position.set(0, 0.58, 0.848);
  rig.add(ridge);
  const guardGlow = tellGlow(1.0, 0.18);
  guardGlow.position.set(0, 0.6, 0.9);
  rig.add(guardGlow);
  // Stout legs.
  const legG = shared('r-leg', () => new CylinderGeometry(0.075, 0.065, 0.34, 6));
  const legMat = track(flashable(HIDE.ramDark));
  const legs = [];
  for (const [x, z] of [[-0.2, 0.18], [0.2, 0.18], [-0.2, -0.36], [0.2, -0.36]]) {
    const p = new Group();
    p.position.set(x, 0.34, z);
    const l = new Mesh(legG, legMat);
    l.position.y = -0.17;
    addInk(l);
    p.add(l);
    rig.add(p);
    legs.push(p);
  }
  group.add(groundShadow(0.66, 0.9, { forward: 0.34, wide: 1.1, deep: 0.96 }));
  let flare = 0;
  let lastBlock = -1;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    blocked() {
      flare = 1;
    },
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.lastBlockedTick !== undefined && e.lastBlockedTick !== lastBlock) {
        lastBlock = e.lastBlockedTick;
        flare = 1;
      }
      flare = Math.max(0, flare - dt * 3.5);
      const trot = Math.sin(walkPhase);
      legs[0].rotation.x = trot * 0.45 * moveK;
      legs[3].rotation.x = trot * 0.45 * moveK;
      legs[1].rotation.x = -trot * 0.45 * moveK;
      legs[2].rotation.x = -trot * 0.45 * moveK;
      // Slam wind-up: rear back and raise the shield, then drive down.
      rig.rotation.x = -0.28 * telegraphK;
      rig.position.z = -0.1 * telegraphK;
      rig.position.y = 0.02 * Math.abs(trot) * moveK + 0.05 * telegraphK;
      guardGlow.material.opacity = 0.14 + 0.05 * Math.sin(t * 2) + 0.5 * flare + 0.2 * telegraphK;
      guardGlow.scale.setScalar(1.0 + 0.5 * flare);
    },
  };
}

// --------------------------------------------------------------- MOLE --
export function buildMole() {
  const group = new Group();
  group.name = 'mole';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group(); // the surfaced body (pops out of the ground)
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const body = new Mesh(shared('o-body', () => new IcosahedronGeometry(0.27, 1)), track(flashable(HIDE.moleBody)));
  body.scale.set(1.0, 0.62, 1.3);
  body.position.set(0, 0.2, -0.04);
  addInk(body);
  rig.add(body);
  const snout = new Mesh(shared('o-snout', () => new ConeGeometry(0.12, 0.34, 6)), track(flashable(HIDE.moleSnout)));
  snout.rotation.x = Math.PI / 2 + 0.18;
  snout.position.set(0, 0.2, 0.36);
  addInk(snout);
  rig.add(snout);
  const nose = new Mesh(shared('o-nose', () => new IcosahedronGeometry(0.04, 0)), new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false }));
  nose.position.set(0, 0.17, 0.54);
  rig.add(nose);
  slitEyes(rig, { x: 0.09, y: 0.3, z: 0.22, len: 0.05, slant: 0.2 });
  // Oversized digging claws (bone) with indigo tips (the one tell).
  const pawG = shared('o-paw', () => new BoxGeometry(0.2, 0.05, 0.16));
  const clawG = shared('o-claw', () => mergeGeometries([-0.07, 0, 0.07].map((x) => new ConeGeometry(0.028, 0.14, 4).rotateX(Math.PI / 2).translate(x, 0, 0.12))));
  const tipG = shared('o-cliptip', () => mergeGeometries([-0.07, 0, 0.07].map((x) => new ConeGeometry(0.018, 0.06, 4).rotateX(Math.PI / 2).translate(x, 0, 0.2))));
  const clawMat = track(flashable(HIDE.moleClaw));
  const paws = [];
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.26, 0.1, 0.2);
    p.rotation.y = side * -0.35;
    const paw = new Mesh(pawG, clawMat);
    addInk(paw);
    p.add(paw);
    const claws = new Mesh(clawG, clawMat);
    addInk(claws);
    p.add(claws);
    p.add(new Mesh(tipG, tellMat()));
    rig.add(p);
    paws.push(p);
  }
  const glow = tellGlow(0.5, 0.2);
  glow.position.set(0, 0.2, 0.34);
  rig.add(glow);
  const bodyShadow = groundShadow(0.42, 0.84, { forward: 0.24, wide: 1.1, deep: 1.0 });
  group.add(bodyShadow);
  // The burrow mound: a low earth hump that rides the sim body underground.
  const mound = new Group();
  const moundMat = toonMaterial({ color: HIDE.earth });
  const hump = new Mesh(shared('o-hump', () => new SphereGeometry(0.3, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2)), moundMat);
  hump.scale.set(1, 0.42, 1.25);
  addInk(hump);
  mound.add(hump);
  const clodG = shared('o-clod', () => new IcosahedronGeometry(0.07, 0));
  const clodMat = toonMaterial({ color: HIDE.earthDark });
  const clods = [];
  for (let i = 0; i < 6; i++) {
    const c = new Mesh(clodG, clodMat);
    const a = (i / 6) * Math.PI * 2;
    c.position.set(Math.cos(a) * 0.27, 0.03, Math.sin(a) * 0.3);
    mound.add(c);
    clods.push(c);
  }
  mound.add(groundShadow(0.36, 0.5, { forward: 0.1, wide: 1.1, deep: 1.1 }));
  group.add(mound);
  let pop = 1; // 0 = underground, 1 = fully out
  let lastT = null;
  return {
    group,
    mats,
    mound,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const under = e && (e.burrowed || e.mode === 'emerging');
      pop += ((under ? 0 : 1) - pop) * (1 - Math.exp(-(under ? 14 : 10) * dt));
      rig.visible = pop > 0.04;
      rig.position.y = -0.35 * (1 - pop);
      rig.scale.set(1, 0.2 + 0.8 * pop, 1);
      bodyShadow.visible = pop > 0.3;
      mound.visible = pop < 0.96;
      // The mound churns while tunnelling and QUAKES through the emergence.
      const churn = Math.sin(walkPhase * 1.4) * 0.06 * moveK;
      const quake = telegraphK > 0.01 ? Math.sin(t * 46) * 0.05 * telegraphK : 0;
      mound.scale.set(1 + churn + quake, 1 + 0.4 * telegraphK, 1 - churn + quake);
      for (let i = 0; i < clods.length; i++) clods[i].position.y = 0.03 + Math.max(0, Math.sin(t * 9 + i * 1.7)) * 0.05 * (moveK + telegraphK);
      for (const p of paws) p.rotation.x = Math.sin(walkPhase * 2) * 0.3 * moveK;
      glow.material.opacity = (0.16 + 0.06 * Math.sin(t * 3)) * pop;
    },
  };
}

// ======================================================================
// Content slice 1 (docs/CONTENT_PLAN.md §3): Rotcap, Lantern Snail, Barrow
// Crow, Brood Spider + Broodling. Same grammar: flat-faceted primitives, cool
// hides with a value structure, ink on the big masses, a contact shadow, and
// ONE indigo tell each.
//   rotcap     a fat toadstool on a stubby stalk; indigo spots on the cap.
//              The cap swells before a bite and pulses as it shuffles
//   snail      a big coiled shell on a low slug foot; an indigo LANTERN bulb
//              on an eyestalk that swells through the mend wind-up
//   crow       a hunched black bird, bone beak; indigo eye glint. Hops; the
//              wings fan out through the caw (cone telegraph)
//   brood      a bloated round abdomen on eight angular legs; an indigo
//              hourglass on the back
//   broodling  the brood in miniature (no hourglass — a single indigo dot)

// ------------------------------------------------------------ ROTCAP --
export function buildRotcap() {
  const group = new Group();
  group.name = 'rotcap';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const stalk = new Mesh(shared('rc-stalk', () => new CylinderGeometry(0.15, 0.19, 0.34, 7)), track(flashable(HIDE.rotStalk)));
  stalk.position.y = 0.17;
  addInk(stalk);
  rig.add(stalk);
  const capPivot = new Group();
  capPivot.position.y = 0.36;
  rig.add(capPivot);
  const cap = new Mesh(shared('rc-cap', () => new SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), track(flashable(HIDE.rotCap)));
  cap.scale.set(1, 0.7, 1);
  addInk(cap);
  capPivot.add(cap);
  const gills = new Mesh(shared('rc-gill', () => new CircleGeometry(0.33, 12)), track(flashable(HIDE.rotGill)));
  gills.rotation.x = Math.PI / 2;
  gills.position.y = 0.005;
  capPivot.add(gills);
  // Indigo spots on the cap (the tell) + a faint spore glow.
  const spotG = shared('rc-spot', () => new IcosahedronGeometry(0.045, 0));
  for (const [x, y, z] of [[0.12, 0.2, 0.1], [-0.15, 0.18, 0.04], [0.02, 0.23, -0.12], [-0.05, 0.15, 0.2], [0.2, 0.12, -0.08]]) {
    const sp = new Mesh(spotG, tellMat());
    sp.position.set(x, y, z);
    capPivot.add(sp);
  }
  const spore = tellGlow(0.7, 0.18);
  spore.position.y = 0.3;
  capPivot.add(spore);
  slitEyes(rig, { x: 0.07, y: 0.24, z: 0.16, len: 0.07, slant: 0.35 });
  const feet = [];
  const footG = shared('rc-foot', () => new IcosahedronGeometry(0.07, 0));
  for (const side of [-1, 1]) {
    const f = new Mesh(footG, track(flashable(HIDE.rotStalk)));
    f.position.set(side * 0.12, 0.04, 0.04);
    rig.add(f);
    feet.push(f);
  }
  group.add(groundShadow(0.42, 0.8));
  let lastBite = -1;
  let biteAge = 9;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, walkPhase, moveK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.biteTick !== lastBite && e.biteTick >= 0) {
        lastBite = e.biteTick;
        biteAge = 0;
      }
      biteAge += dt;
      const k = biteAge < 0.3 ? Math.sin((biteAge / 0.3) * Math.PI) : 0;
      const sway = Math.sin(walkPhase) * moveK;
      rig.rotation.z = 0.12 * sway;
      rig.position.y = 0.03 * Math.abs(sway);
      capPivot.rotation.x = 0.5 * k;
      capPivot.scale.setScalar(1 + 0.05 * Math.sin(t * 2.6) + 0.12 * k);
      feet[0].position.z = 0.04 + 0.06 * sway;
      feet[1].position.z = 0.04 - 0.06 * sway;
      spore.material.opacity = 0.14 + 0.06 * Math.sin(t * 2.6);
    },
  };
}

// ------------------------------------------------------------- SNAIL --
export function buildSnail() {
  const group = new Group();
  group.name = 'snail';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const foot = new Mesh(shared('sn-foot', () => new IcosahedronGeometry(0.3, 1)), track(flashable(HIDE.snailBody)));
  foot.scale.set(0.85, 0.32, 1.7);
  foot.position.set(0, 0.1, 0.05);
  addInk(foot);
  rig.add(foot);
  const head = new Mesh(shared('sn-head', () => new IcosahedronGeometry(0.15, 1)), track(flashable(HIDE.snailBody)));
  head.position.set(0, 0.2, 0.5);
  addInk(head);
  rig.add(head);
  // Shell: two stacked tori read as a coil, a dark core.
  const shell = new Group();
  shell.position.set(0, 0.42, -0.1);
  rig.add(shell);
  const coilA = new Mesh(shared('sn-coilA', () => new TorusGeometry(0.24, 0.13, 6, 12)), track(flashable(HIDE.snailShell)));
  addInk(coilA);
  shell.add(coilA);
  const coilB = new Mesh(shared('sn-coilB', () => new TorusGeometry(0.11, 0.08, 6, 10)), track(flashable(HIDE.snailShellDark)));
  coilB.position.z = 0.1;
  shell.add(coilB);
  const core = new Mesh(shared('sn-core', () => new IcosahedronGeometry(0.1, 0)), track(flashable(HIDE.snailShellDark)));
  core.position.z = 0.04;
  shell.add(core);
  // Eyestalk + the LANTERN bulb (the tell, and the mend read).
  const stalk = new Mesh(shared('sn-stalk', () => new CylinderGeometry(0.025, 0.03, 0.36, 5)), track(flashable(HIDE.snailBody)));
  stalk.position.set(0, 0.36, 0.56);
  stalk.rotation.x = 0.35;
  rig.add(stalk);
  const bulb = new Mesh(shared('sn-bulb', () => new SphereGeometry(0.07, 8, 6)), tellMat());
  bulb.position.set(0, 0.54, 0.63);
  rig.add(bulb);
  const lantern = tellGlow(0.6, 0.35);
  lantern.position.copy(bulb.position);
  rig.add(lantern);
  const pulse = new Mesh(
    shared('sn-pulse', () => new RingGeometry(0.92, 1.0, 40)),
    new MeshBasicMaterial({ color: TELL_INDIGO, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  );
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.y = 0.02;
  group.add(pulse);
  group.add(groundShadow(0.5, 0.86, { forward: 0.05, wide: 1.0, deep: 1.5 }));
  let lastMend = -1;
  let mendAge = 9;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, walkPhase, moveK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.mendTick !== lastMend && e.mendTick >= 0) {
        lastMend = e.mendTick;
        mendAge = 0;
      }
      mendAge += dt;
      const windup = e && e.mendStartTick >= 0 ? 1 : 0;
      const creep = Math.sin(walkPhase * 0.6) * moveK;
      foot.scale.z = 1.7 + 0.12 * creep;
      head.position.z = 0.5 + 0.05 * creep;
      bulb.scale.setScalar(1 + 0.6 * windup + 0.1 * Math.sin(t * 3));
      lantern.material.opacity = 0.3 + 0.35 * windup + 0.06 * Math.sin(t * 3);
      // The mend pulse: an indigo ring that sweeps out to the 3.2 u radius.
      const k = mendAge / 0.6;
      if (k < 1) {
        const r = 0.6 + 2.6 * k;
        pulse.scale.set(r, r, 1);
        pulse.material.opacity = 0.7 * (1 - k);
      } else pulse.material.opacity = 0;
    },
  };
}

// -------------------------------------------------------------- CROW --
export function buildCrow() {
  const group = new Group();
  group.name = 'crow';
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const body = new Mesh(shared('cr-body', () => new IcosahedronGeometry(0.22, 1)), track(flashable(HIDE.crowBody)));
  body.scale.set(0.9, 0.95, 1.35);
  body.position.set(0, 0.36, -0.02);
  body.rotation.x = -0.35;
  addInk(body);
  rig.add(body);
  const head = new Group();
  head.position.set(0, 0.6, 0.2);
  rig.add(head);
  const skull = new Mesh(shared('cr-head', () => new IcosahedronGeometry(0.13, 0)), track(flashable(HIDE.crowBody)));
  addInk(skull);
  head.add(skull);
  const beak = new Mesh(shared('cr-beak', () => new ConeGeometry(0.055, 0.24, 4)), track(flashable(HIDE.bone)));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.02, 0.18);
  head.add(beak);
  const glints = [];
  for (const side of [-1, 1]) {
    const g = new Mesh(shared('cr-eye', () => new BoxGeometry(0.05, 0.02, 0.02)), tellMat());
    g.position.set(side * 0.08, 0.03, 0.08);
    g.rotation.z = side * 0.4;
    head.add(g);
    const gl = tellGlow(0.22, 0.3);
    gl.position.copy(g.position);
    head.add(gl);
    glints.push(gl);
  }
  const wings = [];
  const wingG = shared('cr-wing', () => new ConeGeometry(0.16, 0.5, 3));
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.17, 0.44, 0.02);
    rig.add(pivot);
    const w = new Mesh(wingG, track(flashable(HIDE.crowWing)));
    w.scale.set(0.45, 1, 1);
    w.rotation.x = -Math.PI / 2 - 0.3;
    w.position.z = -0.2;
    addInk(w);
    pivot.add(w);
    wings.push({ pivot, side });
  }
  const tail = new Mesh(shared('cr-tail', () => new ConeGeometry(0.12, 0.3, 3)), track(flashable(HIDE.crowWing)));
  tail.rotation.x = -Math.PI / 2 - 0.6;
  tail.position.set(0, 0.28, -0.32);
  rig.add(tail);
  const legG = shared('cr-leg', () => new CylinderGeometry(0.018, 0.018, 0.2, 4));
  for (const side of [-1, 1]) {
    const l = new Mesh(legG, inkMat());
    l.position.set(side * 0.08, 0.1, 0.02);
    rig.add(l);
  }
  group.add(groundShadow(0.32, 0.8));
  let lastFire = -1;
  let fireAge = 9;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.fireTick !== lastFire && e.fireTick >= 0) {
        lastFire = e.fireTick;
        fireAge = 0;
      }
      fireAge += dt;
      const snap = fireAge < 0.25 ? Math.sin((fireAge / 0.25) * Math.PI) : 0;
      // Hop-walk; fan the wings through the caw; the head thrusts on the volley.
      rig.position.y = Math.max(0, Math.sin(walkPhase * 1.2)) * 0.08 * moveK;
      for (const w of wings) {
        w.pivot.rotation.z = w.side * (0.15 + 1.0 * telegraphK + 0.3 * snap);
      }
      head.rotation.x = -0.35 * telegraphK + 0.4 * snap;
      head.position.z = 0.2 + 0.08 * snap;
      for (const g of glints) g.material.opacity = 0.25 + 0.4 * telegraphK + 0.06 * Math.sin(t * 3);
    },
  };
}

// ------------------------------------------------------------- BROOD --
function spiderRig(name, { size, hourglass }) {
  const group = new Group();
  group.name = name;
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const abdomen = new Mesh(shared('br-abd', () => new IcosahedronGeometry(0.3, 1)), track(flashable(HIDE.broodBody)));
  abdomen.scale.set(1.05 * size, 0.85 * size, 1.15 * size);
  abdomen.position.set(0, 0.34 * size, -0.16 * size);
  addInk(abdomen);
  rig.add(abdomen);
  const thorax = new Mesh(shared('br-thx', () => new IcosahedronGeometry(0.16, 0)), track(flashable(HIDE.broodDark)));
  thorax.scale.setScalar(size);
  thorax.position.set(0, 0.22 * size, 0.18 * size);
  addInk(thorax);
  rig.add(thorax);
  if (hourglass) {
    const hg = new Mesh(
      shared('br-hg', () => mergeGeometries([new ConeGeometry(0.07, 0.12, 4).translate(0, 0.06, 0), new ConeGeometry(0.07, 0.12, 4).rotateX(Math.PI).translate(0, -0.06, 0)])),
      tellMat()
    );
    hg.rotation.x = -Math.PI / 2 + 0.35;
    hg.position.set(0, 0.6 * size, -0.12 * size);
    rig.add(hg);
    const gl = tellGlow(0.45, 0.22);
    gl.position.copy(hg.position);
    rig.add(gl);
  } else {
    const dot = new Mesh(shared('br-dot', () => new IcosahedronGeometry(0.05, 0)), tellMat());
    dot.position.set(0, 0.6 * size, -0.12 * size);
    rig.add(dot);
  }
  slitEyes(thorax, { x: 0.06, y: 0.04, z: 0.13, len: 0.06, slant: 0.5 });
  // Eight angular legs: two-part bent shafts, phase-alternated.
  const legs = [];
  const legG = shared('br-leg', () => new CylinderGeometry(0.022, 0.016, 0.34, 4).translate(0, -0.17, 0));
  const legMat = track(flashable(HIDE.broodDark));
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const pivot = new Group();
      pivot.position.set(side * 0.1 * size, 0.24 * size, (0.26 - i * 0.12) * size);
      rig.add(pivot);
      const upper = new Mesh(legG, legMat);
      upper.scale.setScalar(size);
      upper.rotation.z = side * -1.1;
      pivot.add(upper);
      const lower = new Mesh(legG, legMat);
      lower.scale.setScalar(size);
      lower.position.set(side * 0.3 * size, 0.12 * size, 0);
      lower.rotation.z = side * 0.35;
      pivot.add(lower);
      pivot.rotation.y = side * (0.5 - i * 0.33);
      legs.push({ pivot, phase: (i % 2 ? 1 : 0) ^ (side > 0 ? 1 : 0) });
    }
  }
  group.add(groundShadow(0.48 * size, 0.8));
  let lastBite = -1;
  let biteAge = 9;
  let lastT = null;
  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    pose({ t, walkPhase, moveK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.biteTick !== lastBite && e.biteTick >= 0) {
        lastBite = e.biteTick;
        biteAge = 0;
      }
      biteAge += dt;
      const k = biteAge < 0.22 ? Math.sin((biteAge / 0.22) * Math.PI) : 0;
      for (const l of legs) l.pivot.rotation.x = Math.sin(walkPhase * 2 + l.phase * Math.PI) * 0.35 * moveK;
      rig.position.y = Math.abs(Math.sin(walkPhase * 2)) * 0.02 * moveK;
      thorax.position.z = (0.18 + 0.06 * k) * size;
      abdomen.scale.y = 0.85 * size * (1 + 0.04 * Math.sin(t * 2.2));
    },
  };
}
export const buildBrood = () => spiderRig('brood', { size: 1, hourglass: true });
export const buildBroodling = () => spiderRig('broodling', { size: 0.5, hourglass: false });

// ------------------------------------------------------------ ELITE --
// §23.5 Elite: an indigo crown glyph above the head + a second, outer indigo
// ring on the ground (never violet). Attached to any rig by the layer.
export function makeEliteMark(height = 1.0, ringR = 0.62) {
  const g = new Group();
  g.name = 'elite-mark';
  const crownG = shared('elite-crown', () =>
    mergeGeometries([
      new CylinderGeometry(0.13, 0.13, 0.05, 10, 1, true).translate(0, 0, 0),
      ...[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return new ConeGeometry(0.035, 0.12, 4).translate(Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.12);
      }),
    ])
  );
  const crown = new Mesh(crownG, new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false }));
  crown.position.y = height;
  g.add(crown);
  const glow = tellGlow(0.55, 0.32);
  glow.position.y = height + 0.04;
  g.add(glow);
  const ring = new Mesh(
    shared(`elite-ring:${ringR}`, () => new RingGeometry(ringR - 0.05, ringR, 40)),
    new MeshBasicMaterial({ color: TELL_INDIGO, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.014;
  ring.renderOrder = -1;
  g.add(ring);
  return {
    group: g,
    update(t) {
      crown.rotation.y = t * 1.2;
      crown.position.y = height + 0.04 * Math.sin(t * 2.2);
      glow.material.opacity = 0.26 + 0.08 * Math.sin(t * 2.2);
    },
  };
}

export const ARCH_BUILDERS = Object.freeze({
  quillback: buildQuillback,
  toad: buildToad,
  moth: buildMoth,
  ram: buildRam,
  mole: buildMole,
  rotcap: buildRotcap,
  snail: buildSnail,
  crow: buildCrow,
  brood: buildBrood,
  broodling: buildBroodling,
  // Content slice 2 (render/enemies/slice2.js).
  wasp: buildWasp,
  thornling: buildThornling,
  crab: buildCrab,
  lamprey: buildLamprey,
  gravewisp: buildGravewisp,
  knight: buildKnight,
  // Act IV, the Hollow Heart (render/enemies/heart.js).
  husk: buildHusk,
  lancer: buildLancer,
  geode: buildGeode,
  censer: buildCenser,
});
// Crown height per kind (world u above the ground at scale 1).
export const CROWN_Y = Object.freeze({ boar: 0.95, mantis: 1.35, quillback: 0.95, toad: 0.72, moth: 1.75, ram: 1.12, mole: 0.62, rotcap: 0.78, snail: 0.92, crow: 0.92, brood: 0.85, broodling: 0.45, wasp: 1.2, thornling: 0.95, crab: 0.72, lamprey: 0.55, gravewisp: 1.55, knight: 1.55, husk: 1.3, lancer: 1.9, geode: 1.6, censer: 1.9 });
