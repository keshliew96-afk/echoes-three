// Act IV enemy rigs (docs/ACT_IV.md — The Hollow Heart): Hollow Husk, Vein
// Lancer, Geode Brute, Heart Censer. Same grammar as render/enemies/slice2.js
// (flat-faceted toon primitives, ink on the big masses, a contact shadow,
// flashable materials in `mats`, shared geometry), but where every older act
// wears exactly one indigo tell, the Heart's creatures are MADE of its violet:
// glowing veins and crystal over dark bruised flesh and old bone.
//   husk    a hunched, emaciated husk of a person, long arms dangling, a
//           violet heart glowing in an open rib cavity. Its veins swell
//           together with every husk in the room before the HEARTBEAT surge,
//           flare through it, and it leans into the run
//   lancer  a tall thin stilt-legged figure in a ragged mantle, holding a
//           long violet vein-spear. Aiming, the spear is drawn back over the
//           shoulder and brightens; on the throw it thrusts and the spear
//           reforms in its hand from the veins
//   geode   a wide hunched boulder-beast that knuckle-walks on two huge
//           forearms, violet crystal spires growing out of its back. The slam
//           raises both fists overhead and brings them down
//   censer  a floating bone censer on a chain that hangs from nothing, violet
//           coals inside its rib cage and a rose-violet halo around it. It
//           gathers (coals flare, halo widens, chain swings) and then mends
// Faces +Z; the layer drives `pose({ t, tick, walkPhase, moveK, lungeK,
// telegraphK, fireK, e })` (`e` = the sim entity, READ ONLY; `tick` = the
// interpolated sim tick, for the husks' shared heartbeat).
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
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow } from '../critters/common.js';
import { markShared } from '../geocache.js';
import { makeGlowSprite } from '../glow.js';
import { HEART } from './style.js';
import { HEARTBEAT, beatPhase } from '../../sim/enemies/husk.js';

const flashable = (color) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 });
// A vein / coal material: unlit, its colour driven per frame (one per rig).
const veinMat = (c = HEART.vein) => new MeshBasicMaterial({ color: c.clone(), toneMapped: false });
function heartGlow(size, opacity, color = HEART.glow) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(color);
  return g;
}
// Merge mixed primitives (polyhedra are non-indexed, the rest indexed).
const mergeGeometries = (list) => mergeRaw(list.map((g) => (g.index ? g.toNonIndexed() : g)));
const cache = {};
function shared(key, make) {
  if (!cache[key]) {
    cache[key] = make();
    markShared(cache[key]);
  }
  return cache[key];
}
// A thin rod from a to b (for merged vein / rib / chain geometry).
function rod(a, b, r = 0.012, seg = 4) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1e-3;
  const g = new CylinderGeometry(r, r, len, seg);
  // +Y onto (dx, dy, dz).
  const pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  const yaw = Math.atan2(dx, dz);
  g.rotateX(pitch).rotateY(yaw);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
// A crystal spire (a 4- or 5-sided cone) rooted at p, leaning along (lx, lz).
function spire(p, r, h, lx, lz, seg = 4) {
  const g = new ConeGeometry(r, h, seg).translate(0, h / 2, 0);
  g.rotateX(lz).rotateZ(-lx);
  g.translate(p[0], p[1], p[2]);
  return g;
}
function slitEyes(parent, mat, { x = 0.05, y = 0, z = 0.1, len = 0.06, slant = 0.4 } = {}) {
  const g = shared('h4-eye', () => new BoxGeometry(1, 0.026, 0.026));
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, mat);
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
// One-shot clip clock off a sim tick field (biteTick / lanceTick / ...).
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
const _c = new Color();
const veinColor = (k) => (k < 0.5 ? _c.copy(HEART.veinDim).lerp(HEART.vein, k * 2) : _c.copy(HEART.vein).lerp(HEART.veinHot, (k - 0.5) * 2));
const smooth = (x) => x * x * (3 - 2 * x);

// The shared heartbeat as two envelopes: swell (0..1 over the warn window
// before a surge) and surge (1 at the surge start, easing to 0).
export function heartbeatK(tick) {
  const ph = beatPhase(Math.floor(tick)) + (tick - Math.floor(tick));
  const warnStart = HEARTBEAT.period - HEARTBEAT.warn;
  const swell = ph >= warnStart ? smooth((ph - warnStart) / HEARTBEAT.warn) : 0;
  const surge = ph < HEARTBEAT.surge ? 1 - smooth(ph / HEARTBEAT.surge) * 0.6 : 0;
  return { swell, surge };
}

// -------------------------------------------------------------- HUSK --
export function buildHusk() {
  const s = shell('husk');
  const { rig, track } = s;
  const flesh = track(flashable(HEART.ash));
  const plum = track(flashable(HEART.flesh));
  const bone = track(flashable(HEART.bone));
  const veins = veinMat();
  rig.scale.setScalar(1.15); // a gaunt adult's height: it must out-read the party at zoom
  // Legs: thin, slightly bowed.
  const legs = [];
  const legG = shared('hk-leg', () => new CylinderGeometry(0.045, 0.03, 0.46, 5).translate(0, -0.23, 0));
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.1, 0.46, -0.02);
    rig.add(p);
    p.add(new Mesh(legG, plum));
    legs.push(p);
  }
  // Spine pivot at the hips: the whole upper body hunches forward from here.
  const spine = new Group();
  spine.position.set(0, 0.44, 0);
  rig.add(spine);
  const torso = new Mesh(shared('hk-torso', () => new IcosahedronGeometry(0.21, 0)), flesh);
  torso.scale.set(0.85, 1.4, 0.68);
  torso.position.set(0, 0.26, 0);
  addInk(torso);
  spine.add(torso);
  // The open cavity: a bone rib frame around a violet heart.
  const ribs = new Mesh(
    shared('hk-ribs', () =>
      mergeGeometries([
        new TorusGeometry(0.1, 0.024, 4, 9).translate(0, 0, 0),
        ...[-1, 1].flatMap((sd) => [rod([sd * 0.03, 0.06, 0.03], [sd * 0.17, 0.02, -0.04], 0.014), rod([sd * 0.03, -0.03, 0.03], [sd * 0.16, -0.08, -0.05], 0.014)]),
      ])
    ),
    bone
  );
  ribs.position.set(0, 0.34, 0.13);
  spine.add(ribs);
  const cavity = new Mesh(shared('hk-cavity', () => new SphereGeometry(0.085, 8, 6)), new MeshBasicMaterial({ color: HEART.fleshDark.clone().multiplyScalar(0.35) }));
  cavity.scale.z = 0.4;
  cavity.position.set(0, 0.34, 0.12);
  spine.add(cavity);
  const heart = new Mesh(shared('hk-heart', () => new IcosahedronGeometry(0.075, 0)), veins);
  heart.position.set(0, 0.34, 0.15);
  spine.add(heart);
  const hg = heartGlow(0.75, 0.5);
  hg.position.set(0, 0.36, 0.2);
  spine.add(hg);
  // Spine knobs (bone) and the veins over the back and shoulders (violet).
  const knobs = new Mesh(
    shared('hk-knobs', () => mergeGeometries([0, 1, 2, 3].map((i) => new ConeGeometry(0.035, 0.09, 4).rotateX(-0.5).translate(0, 0.14 + i * 0.09, -0.15 + i * 0.005)))),
    bone
  );
  spine.add(knobs);
  const veinMesh = new Mesh(
    shared('hk-veins', () =>
      mergeGeometries([
        rod([0, 0.06, -0.14], [0.09, 0.3, -0.13], 0.016),
        rod([0.09, 0.3, -0.13], [0.19, 0.42, -0.02], 0.014),
        rod([0, 0.1, -0.15], [-0.1, 0.34, -0.12], 0.016),
        rod([-0.1, 0.34, -0.12], [-0.2, 0.42, 0.0], 0.014),
        rod([0.04, 0.3, 0.16], [0.13, 0.45, 0.08], 0.012),
        rod([-0.04, 0.3, 0.16], [-0.14, 0.18, 0.12], 0.012),
      ])
    ),
    veins
  );
  spine.add(veinMesh);
  // Head: low and forward on a thin neck, slack jaw, violet eye slits.
  const neck = new Group();
  neck.position.set(0, 0.56, 0.05);
  spine.add(neck);
  const head = new Mesh(shared('hk-head', () => new IcosahedronGeometry(0.1, 0)), bone);
  head.scale.set(0.9, 0.95, 1.15);
  head.position.set(0, 0.06, 0.06);
  addInk(head);
  neck.add(head);
  const jaw = new Mesh(shared('hk-jaw', () => new BoxGeometry(0.12, 0.035, 0.12).translate(0, -0.02, 0.05)), plum);
  jaw.position.set(0, -0.01, 0.06);
  neck.add(jaw);
  slitEyes(neck, veins, { x: 0.042, y: 0.07, z: 0.16, len: 0.055, slant: 0.45 });
  // Arms: long and dangling, claw hands.
  const arms = [];
  const armG = shared('hk-arm', () =>
    mergeGeometries([new CylinderGeometry(0.035, 0.026, 0.56, 5).translate(0, -0.28, 0), new ConeGeometry(0.045, 0.12, 4).rotateX(Math.PI).translate(0, -0.6, 0.02)])
  );
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.18, 0.46, 0.02);
    spine.add(p);
    const a = new Mesh(armG, flesh);
    p.add(a);
    arms.push({ p, side });
  }
  s.group.add(groundShadow(0.3, 0.75, { forward: 0.12 }));
  const bite = clip();
  let lastT = null;
  let lean = 0.22;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, walkPhase, moveK, lungeK = 0, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const { swell, surge } = heartbeatK(tick ?? t * 60);
      const surging = e ? e.mode === 'surge' : surge > 0;
      const run = surging ? 1 : 0;
      const ba = bite(e?.biteTick, dt);
      const bk = ba < 0.22 ? Math.sin((ba / 0.22) * Math.PI) : lungeK;
      // Hunch: deeper into the surge, a shudder on the swell.
      const leanT = 0.22 + 0.33 * run + 0.1 * swell;
      lean += (leanT - lean) * (1 - Math.exp(-10 * dt));
      spine.rotation.x = lean + 0.25 * bk;
      spine.rotation.z = 0.06 * Math.sin(walkPhase) * moveK + 0.03 * swell * Math.sin(t * 40);
      const stride = (0.55 + 0.35 * run) * moveK;
      legs[0].rotation.x = Math.sin(walkPhase * 2) * stride;
      legs[1].rotation.x = -Math.sin(walkPhase * 2) * stride;
      rig.position.y = Math.abs(Math.sin(walkPhase * 2)) * 0.03 * moveK;
      // Arms hang (counter the hunch), swing loose; in the surge they trail back.
      for (const a of arms) {
        const swing = Math.sin(walkPhase * 2 + (a.side > 0 ? Math.PI : 0)) * 0.45 * moveK;
        a.p.rotation.x = -lean + 0.15 + swing * (1 - run) + run * 0.9 - bk * 1.3;
        a.p.rotation.z = a.side * (0.22 + 0.2 * run);
      }
      neck.rotation.x = -lean * 0.7 - 0.15 * bk;
      jaw.rotation.x = 0.25 + 0.5 * bk + 0.15 * swell;
      // The heartbeat on the body: veins swell, the heart throbs, then flares.
      const k = Math.min(1, 0.35 + 0.45 * swell + 0.65 * surge * (surging ? 1 : 0));
      veins.color.copy(veinColor(k));
      const throb = 1 + 0.35 * swell * (0.5 + 0.5 * Math.sin(t * 22)) + 0.5 * (surging ? surge : 0);
      heart.scale.setScalar(throb);
      hg.material.opacity = 0.3 + 0.35 * swell + 0.45 * (surging ? surge : 0);
      hg.scale.setScalar(0.75 * (1 + 0.5 * swell + 0.6 * (surging ? surge : 0)));
    },
  };
}

// ------------------------------------------------------------ LANCER --
export function buildLancer() {
  const s = shell('lancer');
  const { rig, track } = s;
  const cloth = track(flashable(HEART.cloth));
  const flesh = track(flashable(HEART.flesh));
  const bone = track(flashable(HEART.bone));
  const veins = veinMat();
  // Stilt legs.
  const legs = [];
  const legG = shared('ln-leg', () => new CylinderGeometry(0.035, 0.022, 0.74, 5).translate(0, -0.37, 0));
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.08, 0.74, 0);
    rig.add(p);
    p.add(new Mesh(legG, flesh));
    legs.push(p);
  }
  const body = new Group();
  body.position.y = 0.74;
  rig.add(body);
  // Ragged skirt, narrow torso, a wide pointed mantle over the shoulders.
  const skirt = new Mesh(shared('ln-skirt', () => new ConeGeometry(0.2, 0.42, 5).translate(0, -0.08, 0)), cloth);
  skirt.position.y = 0.05;
  addInk(skirt);
  body.add(skirt);
  const torso = new Mesh(shared('ln-torso', () => new CylinderGeometry(0.1, 0.075, 0.5, 5)), flesh);
  torso.position.y = 0.38;
  addInk(torso);
  body.add(torso);
  const mantle = new Mesh(shared('ln-mantle', () => new ConeGeometry(0.27, 0.3, 5)), cloth);
  mantle.position.y = 0.56;
  mantle.rotation.y = Math.PI / 5;
  addInk(mantle);
  body.add(mantle);
  // Bone pauldrons: two hooked spikes off the mantle (the pale accent that
  // keeps a black-clad figure readable on a dark floor).
  const pauldrons = new Mesh(
    shared('ln-pauldrons', () => mergeGeometries([-1, 1].map((sd) => new ConeGeometry(0.06, 0.32, 4).translate(0, 0.16, 0).rotateZ(-sd * 0.55).translate(sd * 0.2, 0.62, -0.02)))),
    bone
  );
  addInk(pauldrons);
  body.add(pauldrons);
  const veinMesh = new Mesh(
    shared('ln-veins', () =>
      mergeGeometries([
        rod([0, 0.15, 0.08], [0.03, 0.42, 0.1], 0.014),
        rod([0.03, 0.42, 0.1], [-0.05, 0.6, 0.12], 0.012),
        rod([0.03, 0.42, 0.1], [0.12, 0.56, 0.1], 0.012),
        rod([0, 0.18, -0.08], [0, 0.55, -0.1], 0.014),
      ])
    ),
    veins
  );
  body.add(veinMesh);
  // Long skull with a violet crest seam.
  const head = new Mesh(shared('ln-head', () => new IcosahedronGeometry(0.1, 0)), bone);
  head.scale.set(0.78, 1.45, 0.95);
  head.position.set(0, 0.84, 0.02);
  addInk(head);
  body.add(head);
  const crest = new Mesh(shared('ln-crest', () => new BoxGeometry(0.022, 0.2, 0.05)), veins);
  crest.position.set(0, 0.9, 0.085);
  body.add(crest);
  slitEyes(body, veins, { x: 0.035, y: 0.83, z: 0.09, len: 0.05, slant: 0.55 });
  // Off arm (left) hangs; spear arm (right) carries the vein-spear.
  const armG = shared('ln-arm', () => new CylinderGeometry(0.028, 0.02, 0.5, 5).translate(0, -0.25, 0));
  const offArm = new Group();
  offArm.position.set(-0.17, 0.6, 0);
  body.add(offArm);
  offArm.add(new Mesh(armG, flesh));
  const spearArm = new Group();
  spearArm.position.set(0.18, 0.6, 0);
  body.add(spearArm);
  spearArm.add(new Mesh(armG, flesh));
  const grip = new Group();
  grip.position.set(0, -0.48, 0);
  spearArm.add(grip);
  const spear = new Group();
  grip.add(spear);
  const spearMat = veinMat(HEART.vein);
  const shaft = new Mesh(shared('ln-shaft', () => new CylinderGeometry(0.022, 0.016, 1.7, 5).rotateX(Math.PI / 2).translate(0, 0, 0.2)), spearMat);
  spear.add(shaft);
  const tip = new Mesh(shared('ln-tip', () => new ConeGeometry(0.055, 0.32, 4).rotateX(Math.PI / 2).translate(0, 0, 1.2)), spearMat);
  spear.add(tip);
  const barbs = new Mesh(
    shared('ln-barbs', () => mergeGeometries([rod([0, 0, 1.0], [0.07, 0, 0.9], 0.012), rod([0, 0, 1.0], [-0.07, 0, 0.9], 0.012), rod([0, 0, -0.55], [0.05, 0, -0.66], 0.01), rod([0, 0, -0.55], [-0.05, 0, -0.66], 0.01)])),
    spearMat
  );
  spear.add(barbs);
  const tipGlow = heartGlow(0.55, 0.3);
  tipGlow.position.set(0, 0, 1.2);
  spear.add(tipGlow);
  s.group.add(groundShadow(0.28, 0.7, { forward: 0.1 }));
  const lance = clip();
  let lastT = null;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const la = lance(e?.lanceTick, dt);
      // Throw clip: 0.14 s thrust, the spear gone, reforming by 0.7 s.
      const thrust = la < 0.14 ? Math.sin((la / 0.14) * (Math.PI / 2)) : la < 0.3 ? 1 - (la - 0.14) / 0.16 : 0;
      const reform = la < 0.12 ? 1 : la < 0.7 ? Math.max(0, (la - 0.3) / 0.4) : 1;
      const aim = telegraphK;
      const stride = 0.4 * moveK * (1 - aim);
      legs[0].rotation.x = Math.sin(walkPhase * 2) * stride;
      legs[1].rotation.x = -Math.sin(walkPhase * 2) * stride;
      body.position.y = 0.74 + Math.abs(Math.sin(walkPhase * 2)) * 0.025 * moveK;
      // Aim: plant, twist the spear shoulder back, lean away; thrust: lunge.
      body.rotation.y = -0.45 * aim + 0.3 * thrust;
      body.rotation.x = -0.12 * aim + 0.22 * thrust + 0.05 * moveK;
      legs[0].rotation.x += 0.35 * aim - 0.3 * thrust;
      legs[1].rotation.x += -0.3 * aim + 0.35 * thrust;
      offArm.rotation.x = -0.2 + Math.sin(walkPhase * 2) * 0.3 * moveK - 1.2 * aim * (1 - thrust);
      offArm.rotation.z = -0.15 - 0.3 * aim;
      // Spear arm: carried upright at rest, drawn back over the shoulder,
      // driven forward on the thrust.
      const armA = -0.35 + 2.9 * aim * (1 - thrust) - 1.5 * thrust;
      spearArm.rotation.x = armA;
      spearArm.rotation.z = 0.1;
      const pitch = -1.15 * (1 - aim) * (1 - thrust) + 0.12 * aim;
      grip.rotation.x = -armA + pitch;
      grip.rotation.y = 0.45 * aim * (1 - thrust);
      spear.position.z = -0.25 * aim * (1 - thrust) + 0.35 * thrust;
      spear.scale.set(1, 1, Math.max(0.001, reform));
      spear.visible = reform > 0.02;
      const k = Math.min(1, 0.45 + 0.55 * aim + 0.1 * Math.sin(t * 3));
      spearMat.color.copy(veinColor(k));
      veins.color.copy(veinColor(0.4 + 0.4 * aim));
      tipGlow.material.opacity = 0.2 + 0.6 * aim * (0.75 + 0.25 * Math.sin(t * 18));
      tipGlow.scale.setScalar(0.55 * (1 + 0.8 * aim));
    },
  };
}

// ------------------------------------------------------------- GEODE --
export function buildGeode() {
  const s = shell('geode');
  const { rig, track } = s;
  const stone = track(flashable(HEART.stone));
  const dark = track(flashable(HEART.stoneDark));
  const crystalMat = toonMaterial({ color: HEART.crystal, emissive: HEART.vein, emissiveIntensity: 0.6 });
  const veins = veinMat();
  // Stubby hind legs.
  const legs = [];
  const legG = shared('gd-leg', () => new CylinderGeometry(0.11, 0.13, 0.36, 6).translate(0, -0.18, 0));
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.26, 0.36, -0.22);
    rig.add(p);
    p.add(new Mesh(legG, dark));
    legs.push(p);
  }
  // The mass: a hunched boulder pivoting forward from the hips.
  const body = new Group();
  body.position.set(0, 0.36, -0.2);
  rig.add(body);
  const boulder = new Mesh(shared('gd-boulder', () => new IcosahedronGeometry(0.5, 0)), stone);
  boulder.scale.set(1.3, 0.92, 1.05);
  boulder.position.set(0, 0.36, 0.22);
  boulder.rotation.set(0.2, 0.3, 0);
  addInk(boulder);
  body.add(boulder);
  // Crystal seams on the boulder (violet cracks).
  const seams = new Mesh(
    shared('gd-seams', () =>
      mergeGeometries([
        rod([-0.35, 0.3, 0.55], [-0.12, 0.52, 0.6], 0.02),
        rod([-0.12, 0.52, 0.6], [0.05, 0.42, 0.66], 0.018),
        rod([0.4, 0.22, 0.5], [0.52, 0.42, 0.28], 0.02),
        rod([-0.52, 0.36, 0.2], [-0.46, 0.6, -0.02], 0.018),
      ])
    ),
    veins
  );
  body.add(seams);
  // Spires out of the back: one merged crystal mesh.
  const spires = new Mesh(
    shared('gd-spires', () =>
      mergeGeometries([
        spire([0, 0.66, 0.08], 0.13, 0.78, 0, -0.25, 5),
        spire([0.24, 0.6, 0.0], 0.1, 0.56, 0.45, -0.2),
        spire([-0.26, 0.6, 0.02], 0.11, 0.62, -0.5, -0.15),
        spire([0.12, 0.58, -0.22], 0.08, 0.44, 0.25, -0.55),
        spire([-0.14, 0.56, -0.24], 0.09, 0.5, -0.25, -0.6),
        spire([0.42, 0.44, 0.18], 0.07, 0.32, 0.9, 0.1),
        spire([-0.42, 0.46, 0.22], 0.06, 0.28, -0.9, 0.2),
      ])
    ),
    crystalMat
  );
  addInk(spires);
  body.add(spires);
  const sg = heartGlow(1.2, 0.3);
  sg.position.set(0, 1.0, -0.05);
  body.add(sg);
  // Head: a low blunt wedge under the brow of the boulder.
  const head = new Mesh(shared('gd-head', () => new IcosahedronGeometry(0.17, 0)), dark);
  head.scale.set(1.15, 0.8, 1.0);
  head.position.set(0, 0.3, 0.68);
  addInk(head);
  body.add(head);
  slitEyes(body, veins, { x: 0.075, y: 0.33, z: 0.83, len: 0.08, slant: 0.35 });
  // The forearms: huge, knuckle-walking, crystal knuckles.
  const arms = [];
  const armG = shared('gd-arm', () =>
    mergeGeometries([new CylinderGeometry(0.13, 0.1, 0.5, 6).translate(0, -0.25, 0), new IcosahedronGeometry(0.17, 0).scale(1.1, 0.9, 1.15).translate(0, -0.56, 0.03)])
  );
  const knuckleG = shared('gd-knuckle', () => mergeGeometries([spire([0, -0.52, 0.12], 0.05, 0.2, 0, 0.9), spire([0.08, -0.5, 0.08], 0.04, 0.16, 0.5, 0.7), spire([-0.08, -0.5, 0.08], 0.04, 0.16, -0.5, 0.7)]));
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.58, 0.55, 0.42);
    body.add(p);
    const a = new Mesh(armG, stone);
    addInk(a);
    p.add(a);
    p.add(new Mesh(knuckleG, crystalMat));
    arms.push({ p, side });
  }
  s.group.add(groundShadow(0.62, 0.85, { forward: 0.22, wide: 1.25 }));
  const slam = clip();
  let lastT = null;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const sa = slam(e?.slamTick, dt);
      // Impact: the fists come down in 0.08 s, hold, recover by 0.6 s.
      const hit = sa < 0.08 ? sa / 0.08 : sa < 0.6 ? 1 - smooth((sa - 0.08) / 0.52) : 0;
      const up = telegraphK * (1 - (sa < 0.6 ? 1 : 0));
      // Knuckle-walk: arms and legs in a heavy diagonal gait.
      const g = Math.sin(walkPhase * 1.6);
      legs[0].rotation.x = g * 0.35 * moveK;
      legs[1].rotation.x = -g * 0.35 * moveK;
      body.rotation.x = 0.08 + 0.04 * Math.abs(g) * moveK - 0.5 * up + 0.32 * hit;
      body.rotation.z = 0.05 * g * moveK;
      body.position.y = 0.36 + 0.08 * up - 0.06 * hit;
      for (const a of arms) {
        const walk = (a.side > 0 ? g : -g) * 0.45 * moveK;
        // Rest: arms hang down to the floor; wind-up: both fists overhead
        // (through forward); slam: driven into the ground in front.
        a.p.rotation.x = -0.25 + walk * (1 - up) - 2.75 * up - 0.6 * hit;
        a.p.rotation.z = a.side * (0.1 - 0.25 * up);
      }
      rig.position.y = 0.02 * Math.abs(g) * moveK;
      const k = Math.min(1, 0.4 + 0.6 * up + 0.5 * hit);
      crystalMat.emissiveIntensity = 0.55 + 0.6 * up + 0.4 * hit + 0.06 * Math.sin(t * 2);
      veins.color.copy(veinColor(k));
      sg.material.opacity = 0.22 + 0.45 * up + 0.3 * hit;
    },
  };
}

// ------------------------------------------------------------ CENSER --
const CHAIN_TOP = 2.35; // the chain hangs from nothing above the censer
const CENSER_Y = 1.25;
export function buildCenser() {
  const s = shell('censer');
  const { rig, track } = s;
  const bone = track(flashable(HEART.bone));
  const dark = track(flashable(HEART.fleshDark));
  const coals = veinMat(HEART.veinHot);
  // Pendulum pivot at the top of the chain.
  const pivot = new Group();
  pivot.position.y = CHAIN_TOP;
  rig.add(pivot);
  const chainLen = CHAIN_TOP - CENSER_Y - 0.36;
  const chain = new Mesh(
    shared('cn-chain', () => {
      const parts = [];
      const n = 7;
      for (let i = 0; i < n; i++) {
        const tor = new TorusGeometry(0.05, 0.013, 4, 8);
        if (i % 2) tor.rotateY(Math.PI / 2);
        tor.scale(1, 1.5, 1);
        tor.translate(0, -(i + 0.5) * (chainLen / n), 0);
        parts.push(tor);
      }
      return mergeGeometries(parts);
    }),
    dark
  );
  pivot.add(chain);
  // The censer itself.
  const pot = new Group();
  pot.position.y = -(CHAIN_TOP - CENSER_Y);
  pot.scale.setScalar(1.35);
  pivot.add(pot);
  const bowl = new Mesh(shared('cn-bowl', () => new SphereGeometry(0.21, 7, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), bone);
  bowl.scale.y = 0.9;
  addInk(bowl);
  pot.add(bowl);
  const rim = new Mesh(shared('cn-rim', () => new TorusGeometry(0.21, 0.025, 4, 12).rotateX(Math.PI / 2)), dark);
  pot.add(rim);
  // Rib cage over the coals: curved bone ribs meeting at a top knob.
  const cage = new Mesh(
    shared('cn-cage', () => {
      const parts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        parts.push(rod([c * 0.2, 0.0, sn * 0.2], [c * 0.17, 0.13, sn * 0.17], 0.016));
        parts.push(rod([c * 0.17, 0.13, sn * 0.17], [c * 0.04, 0.26, sn * 0.04], 0.014));
      }
      parts.push(new ConeGeometry(0.05, 0.12, 5).translate(0, 0.3, 0));
      parts.push(new ConeGeometry(0.04, 0.16, 4).rotateX(Math.PI).translate(0, -0.26, 0)); // the drip spike
      return mergeGeometries(parts);
    }),
    bone
  );
  pot.add(cage);
  const coalMesh = new Mesh(
    shared('cn-coals', () =>
      mergeGeometries([new IcosahedronGeometry(0.075, 0).translate(0.04, 0.03, 0), new IcosahedronGeometry(0.06, 0).translate(-0.06, 0.02, 0.03), new IcosahedronGeometry(0.055, 0).translate(0.0, 0.06, -0.05)])
    ),
    coals
  );
  pot.add(coalMesh);
  const cg = heartGlow(0.8, 0.45);
  cg.position.y = 0.08;
  pot.add(cg);
  // Halo: a thin rose-violet ring, tilted toward the camera.
  const haloMat = new MeshBasicMaterial({ color: HEART.rose.clone(), transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false });
  const halo = new Mesh(shared('cn-halo', () => new TorusGeometry(0.38, 0.014, 3, 36)), haloMat);
  const haloTilt = new Group();
  haloTilt.rotation.x = Math.PI / 2 - 0.5;
  haloTilt.position.y = 0.1;
  pot.add(haloTilt);
  haloTilt.add(halo);
  const shadow = groundShadow(0.26, 0.5);
  s.group.add(shadow);
  const mend = clip();
  let lastT = null;
  let swingX = 0;
  let swingZ = 0;
  let gatherK = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, moveK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const gathering = e && e.mode === 'gather' ? 1 : 0;
      gatherK += (gathering - gatherK) * (1 - Math.exp(-8 * dt));
      const ma = mend(e?.mendTick, dt);
      const pulse = ma < 0.45 ? 1 - ma / 0.45 : 0;
      const ph = (e ? e.id : 0) * 1.7;
      rig.position.y = 0.06 * Math.sin(t * 1.8 + ph);
      // Chain swing: a lazy drift, a lag behind travel, a wild swing gathering.
      const amp = 0.07 + 0.16 * gatherK;
      const sp = 1.4 + 2.6 * gatherK;
      const tx = -0.22 * moveK + amp * Math.sin(t * sp + ph);
      const tz = amp * 0.7 * Math.sin(t * sp * 0.77 + ph + 1);
      swingX += (tx - swingX) * (1 - Math.exp(-5 * dt));
      swingZ += (tz - swingZ) * (1 - Math.exp(-5 * dt));
      pivot.rotation.x = swingX;
      pivot.rotation.z = swingZ;
      pot.rotation.y = t * (0.5 + 2.5 * gatherK);
      // Coals: a slow breathing glow that flares through the gather.
      const k = Math.min(1, 0.5 + 0.1 * Math.sin(t * 2.5 + ph) + 0.5 * gatherK * (0.8 + 0.2 * Math.sin(t * 16)) + 0.4 * pulse);
      coals.color.copy(veinColor(k));
      cg.material.opacity = 0.3 + 0.45 * gatherK + 0.35 * pulse;
      cg.scale.setScalar(0.8 * (1 + 0.6 * gatherK + 0.9 * pulse));
      halo.rotation.z = t * (0.6 + 3.0 * gatherK);
      halo.scale.setScalar(1 + 0.45 * gatherK + 0.8 * pulse);
      haloMat.opacity = 0.55 + 0.35 * gatherK + 0.2 * Math.sin(t * 3 + ph) * (1 - gatherK) - 0.4 * pulse * (pulse > 0.5 ? 0 : 1);
      shadow.material.opacity = 0.45 + 0.06 * Math.sin(t * 1.8 + ph);
    },
  };
}
