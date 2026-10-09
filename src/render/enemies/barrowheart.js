// New enemies, Barrow and Heart (docs/NEW_ENEMIES_BARROW_HEART.md): rigs for
// the Ash Keener and the Barrow Sexton (the Ashen Barrow's grammar,
// render/enemies/slice2.js: cool hides with a value structure, ink on the
// big masses, exactly ONE indigo corruption tell each) and for the Heart
// Bloom and the Vein Siphon (the Hollow Heart's, render/enemies/heart.js:
// made of the Heart's violet, glowing veins and crystal over dark flesh).
//   keener  a tall shrouded mourner in pale grave-cloth that glides without
//           feet, a bone mask deep in its hood and long hanging sleeves; the
//           indigo tell is its open mouth. Keening, it throws its hood back
//           and spreads its arms, the mouth-light swelling; the wail snaps
//           its head forward and flares the hem
//   sexton  a hunched gravedigger under a wide hat, a long coat, a spade
//           over one shoulder and a lantern in the other hand whose indigo
//           flame is its tell. Digging, it kneels and chops the spade down
//   bloom   a crystal flower on a knot of vein-roots: five violet crystal
//           petals closed round a beating core. It creeps on its roots, then
//           drives them into the floor; opening, the petals splay and the
//           core flares; the pulse snaps them shut
//   siphon  a floating sac of bruised flesh netted in glowing veins, a
//           toothed mouth beneath and four vein tendrils hanging from it. It
//           draws the tendrils up to cast, whips them out on the lash, and
//           gulps while it drinks (the tether itself is the enemy layer's,
//           render/enemies/extras.js)
// Faces +Z; the layer drives `pose({ t, tick, walkPhase, moveK, lungeK,
// telegraphK, fireK, e })` (`e` = the sim entity, READ ONLY). Rigs are shared
// with the Journal's turning model: never release their geometry.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry } from 'three';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor } from '../critters/common.js';
import { markShared } from '../geocache.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW, HEART } from './style.js';
import { heartbeatK } from './heart.js';

const flashable = (color) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 });
const inkMat = () => new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
const tellMat = () => new MeshBasicMaterial({ color: TELL_INDIGO.clone(), toneMapped: false });
const veinMat = (c = HEART.vein) => new MeshBasicMaterial({ color: c.clone(), toneMapped: false });
function glowOf(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(color);
  return g;
}
const mergeGeometries = (list) => mergeRaw(list.map((g) => (g.index ? g.toNonIndexed() : g)));
const cache = {};
function shared(key, make) {
  if (!cache[key]) {
    cache[key] = make();
    markShared(cache[key]);
  }
  return cache[key];
}
// A thin rod from a to b (merged root / vein / tendril geometry).
function rod(a, b, r = 0.012, seg = 4) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1e-3;
  const g = new CylinderGeometry(r, r * 0.8, len, seg);
  const pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  const yaw = Math.atan2(dx, dz);
  g.rotateX(pitch).rotateY(yaw);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
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
// One-shot clip clock off a sim tick field (wailTick / digTick / ...).
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
const frameDt = () => {
  let lastT = null;
  return (t) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    return dt;
  };
};
const smooth = (x) => x * x * (3 - 2 * x);
const ease = (cur, want, rate, dt) => cur + (want - cur) * (1 - Math.exp(-rate * dt));
const _c = new Color();
const veinColor = (k) => (k < 0.5 ? _c.copy(HEART.veinDim).lerp(HEART.vein, k * 2) : _c.copy(HEART.vein).lerp(HEART.veinHot, (k - 0.5) * 2));
const _t = new Color();
const tellColor = (k) => _t.copy(TELL_INDIGO).lerp(TELL_INDIGO_GLOW, 0.3 * k).multiplyScalar(1 + 0.6 * k);

// Barrow hides (the cool families of style.js HIDE).
const slate = (s, l) => new Color().setHSL(0.6, s, l);
const C = Object.freeze({
  shroud: slate(0.12, 0.62), // pale grave-cloth, a breath of blue
  shroudDark: slate(0.16, 0.34),
  mask: new Color(PALETTE.bone).multiplyScalar(0.92),
  coat: HIDE.ramDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.25).multiplyScalar(1.1),
  coatPale: slate(0.18, 0.42),
  hat: slate(0.22, 0.14),
  skin: HIDE.moleSnout.clone().multiplyScalar(0.85),
  iron: HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.35).multiplyScalar(0.9),
  wood: new Color(PALETTE.bruiseUmber).lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.7),
  bone: new Color(PALETTE.bone).multiplyScalar(0.8),
});

// ------------------------------------------------------------ KEENER --
export function buildKeener() {
  const s = shell('keener');
  const { rig, track } = s;
  const cloth = track(flashable(C.shroud));
  const clothDark = track(flashable(C.shroudDark));
  const mask = track(flashable(C.mask));
  const mouthMat = tellMat();
  // It glides: the whole figure floats a hand above the floor.
  const body = new Group();
  body.position.y = 0.08;
  rig.add(body);
  // The robe: a long fluted cone, its hem a ring of ragged points.
  const robe = new Mesh(shared('kn2-robe', () => new ConeGeometry(0.34, 1.12, 8).translate(0, 0.56, 0)), cloth);
  addInk(robe);
  body.add(robe);
  const hem = new Group();
  hem.position.y = 0.06;
  body.add(hem);
  const hemMesh = new Mesh(
    shared('kn2-hem', () =>
      mergeGeometries(
        Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          const g = new ConeGeometry(0.07, 0.24, 4).rotateX(Math.PI).translate(0, -0.06, 0);
          g.rotateZ(Math.sin(a) * 0.25).rotateX(-Math.cos(a) * 0.25);
          return g.translate(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3);
        })
      )
    ),
    clothDark
  );
  hem.add(hemMesh);
  // Shoulders: a short mantle over the robe.
  const mantle = new Mesh(shared('kn2-mantle', () => new ConeGeometry(0.27, 0.32, 8)), clothDark);
  mantle.position.y = 1.08;
  addInk(mantle);
  body.add(mantle);
  // The head pivot: the hood throws back from here when it keens.
  const neck = new Group();
  neck.position.set(0, 1.2, 0.02);
  body.add(neck);
  const hood = new Mesh(shared('kn2-hood', () => new ConeGeometry(0.17, 0.42, 7, 1, true).translate(0, 0.16, 0)), cloth);
  hood.rotation.x = 0.35;
  hood.position.set(0, 0.04, -0.04);
  neck.add(hood);
  const hoodBack = new Mesh(shared('kn2-hoodback', () => new SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)), clothDark);
  hoodBack.position.set(0, 0.06, -0.06);
  hoodBack.rotation.x = -0.4;
  neck.add(hoodBack);
  const face = new Mesh(shared('kn2-face', () => new IcosahedronGeometry(0.1, 0)), mask);
  face.scale.set(0.8, 1.15, 0.55);
  face.position.set(0, 0.08, 0.06);
  addInk(face);
  neck.add(face);
  // Hollow eyes (ink) and the open mouth: the indigo tell.
  const eyeG = shared('kn2-eye', () => new BoxGeometry(0.04, 0.018, 0.02));
  const ink = inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(eyeG, ink);
    eye.position.set(side * 0.035, 0.12, 0.115);
    eye.rotation.z = side * -0.35;
    neck.add(eye);
  }
  const mouth = new Mesh(shared('kn2-mouth', () => new SphereGeometry(0.03, 8, 6)), mouthMat);
  mouth.scale.set(0.8, 1.6, 0.4);
  mouth.position.set(0, 0.03, 0.115);
  neck.add(mouth);
  const mouthGlow = glowOf(TELL_INDIGO_GLOW, 0.5, 0.3);
  mouthGlow.position.set(0, 0.04, 0.16);
  neck.add(mouthGlow);
  // Long sleeves with bone hands.
  const arms = [];
  const sleeveG = shared('kn2-sleeve', () => mergeGeometries([new ConeGeometry(0.075, 0.6, 6).rotateX(Math.PI).translate(0, -0.3, 0), new ConeGeometry(0.03, 0.12, 4).rotateX(Math.PI).translate(0, -0.64, 0)]));
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.2, 1.1, 0.02);
    body.add(p);
    const sl = new Mesh(sleeveG, cloth);
    addInk(sl);
    p.add(sl);
    arms.push({ p, side });
  }
  const shadow = groundShadow(0.32, 0.55);
  s.group.add(shadow);
  const wail = clip();
  const step = frameDt();
  let keen = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, moveK, telegraphK, e }) {
      const dt = step(t);
      const wa = wail(e?.wailTick, dt);
      // The wail: a 0.12 s snap forward, then it settles over 0.6 s.
      const snap = wa < 0.12 ? smooth(wa / 0.12) : wa < 0.7 ? 1 - smooth((wa - 0.12) / 0.58) : 0;
      keen = ease(keen, telegraphK, 12, dt);
      const ph = (e ? e.id : 0) * 1.3;
      body.position.y = 0.08 + 0.04 * Math.sin(t * 1.6 + ph) + 0.12 * keen - 0.04 * snap;
      body.rotation.x = 0.06 * moveK - 0.18 * keen + 0.28 * snap;
      body.rotation.z = 0.05 * Math.sin(t * 1.1 + ph);
      // The hood falls back, the head tips up; the wail throws it forward.
      neck.rotation.x = -0.75 * keen + 0.55 * snap + 0.05 * Math.sin(t * 1.6 + ph);
      hood.rotation.x = 0.35 - 1.2 * keen * (1 - snap);
      hood.position.z = -0.04 - 0.07 * keen * (1 - snap);
      // Arms: hanging in grief; spread wide to keen; flung forward to wail.
      for (const a of arms) {
        a.p.rotation.x = -0.05 + 0.15 * Math.sin(t * 1.4 + ph + a.side) - 0.4 * keen - 1.5 * snap;
        a.p.rotation.z = a.side * (0.1 + 1.25 * keen * (1 - snap) + 0.3 * snap);
      }
      // The hem flares on the wail and trails behind the glide.
      const flare = 1 + 0.35 * snap + 0.06 * Math.sin(t * 2.3 + ph);
      hem.scale.set(flare, 1, flare);
      hem.rotation.x = -0.12 * moveK;
      robe.scale.set(1 + 0.1 * snap, 1, 1 + 0.1 * snap);
      // The tell: the mouth-light swells through the keen and peaks on the wail.
      const k = Math.min(1, 0.25 + 0.75 * keen + snap);
      mouthMat.color.copy(tellColor(k));
      mouth.scale.set(0.8 + 0.5 * keen, 1.6 + 1.4 * keen + 0.8 * snap, 0.4);
      mouthGlow.material.opacity = 0.22 + 0.45 * keen + 0.4 * snap;
      mouthGlow.scale.setScalar(0.5 * (1 + 1.2 * keen + 1.4 * snap));
      shadow.material.opacity = 0.42 - 0.08 * keen;
    },
  };
}

// ------------------------------------------------------------ SEXTON --
export function buildSexton() {
  const s = shell('sexton');
  const { rig, track } = s;
  const coat = track(flashable(C.coat));
  const coatPale = track(flashable(C.coatPale));
  const hatMat = track(flashable(C.hat));
  const skin = track(flashable(C.skin));
  const iron = track(flashable(C.iron));
  const wood = track(flashable(C.wood));
  const flame = tellMat();
  // Short bowed legs.
  const legs = [];
  const legG = shared('sx-leg', () => new CylinderGeometry(0.055, 0.045, 0.4, 5).translate(0, -0.2, 0));
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.11, 0.4, 0);
    rig.add(p);
    p.add(new Mesh(legG, coat));
    const boot = new Mesh(shared('sx-boot', () => new BoxGeometry(0.1, 0.07, 0.18).translate(0, -0.4, 0.04)), hatMat);
    p.add(boot);
    legs.push(p);
  }
  // The hunched upper body pivots at the hips.
  const spine = new Group();
  spine.position.set(0, 0.4, 0);
  rig.add(spine);
  const torso = new Mesh(shared('sx-torso', () => new CylinderGeometry(0.17, 0.25, 0.62, 7).translate(0, 0.3, 0)), coat);
  addInk(torso);
  spine.add(torso);
  // Coat tails and a pale scarf.
  const tails = new Mesh(shared('sx-tails', () => new ConeGeometry(0.28, 0.36, 7, 1, true).translate(0, -0.02, 0)), coat);
  spine.add(tails);
  const scarf = new Mesh(shared('sx-scarf', () => new TorusGeometry(0.13, 0.045, 5, 10).rotateX(Math.PI / 2)), coatPale);
  scarf.position.set(0, 0.6, 0.02);
  spine.add(scarf);
  // A hump of shoulders, the head low and forward.
  const hump = new Mesh(shared('sx-hump', () => new IcosahedronGeometry(0.17, 0)), coat);
  hump.scale.set(1.25, 0.8, 1.0);
  hump.position.set(0, 0.6, -0.06);
  addInk(hump);
  spine.add(hump);
  const head = new Group();
  head.position.set(0, 0.7, 0.12);
  spine.add(head);
  const face = new Mesh(shared('sx-face', () => new IcosahedronGeometry(0.1, 0)), skin);
  face.scale.set(0.9, 1.0, 0.95);
  addInk(face);
  head.add(face);
  const nose = new Mesh(shared('sx-nose', () => new ConeGeometry(0.025, 0.09, 4).rotateX(Math.PI / 2)), skin);
  nose.position.set(0, -0.01, 0.1);
  head.add(nose);
  const ink = inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(shared('sx-eye', () => new BoxGeometry(0.035, 0.016, 0.02)), ink);
    eye.position.set(side * 0.04, 0.03, 0.085);
    head.add(eye);
  }
  // The wide hat: the silhouette people will remember.
  const hat = new Mesh(shared('sx-hat', () => mergeGeometries([new CylinderGeometry(0.27, 0.28, 0.025, 12), new CylinderGeometry(0.11, 0.13, 0.16, 8).translate(0, 0.09, 0)])), hatMat);
  hat.position.set(0, 0.1, -0.01);
  hat.rotation.x = 0.18;
  addInk(hat);
  head.add(hat);
  // Spade arm (right) and lantern arm (left).
  const armG = shared('sx-arm', () => new CylinderGeometry(0.045, 0.035, 0.42, 5).translate(0, -0.21, 0));
  const spadeArm = new Group();
  spadeArm.position.set(0.22, 0.58, 0.02);
  spine.add(spadeArm);
  spadeArm.add(new Mesh(armG, coat));
  const spade = new Group();
  spade.position.set(0, -0.4, 0.02);
  spadeArm.add(spade);
  const shaft = new Mesh(shared('sx-shaft', () => new CylinderGeometry(0.02, 0.02, 1.0, 5).translate(0, 0.2, 0)), wood);
  spade.add(shaft);
  const blade = new Mesh(shared('sx-blade', () => mergeGeometries([new BoxGeometry(0.16, 0.2, 0.025).translate(0, -0.38, 0), new ConeGeometry(0.08, 0.08, 4).rotateZ(Math.PI).rotateY(Math.PI / 4).scale(1, 1, 0.3).translate(0, -0.51, 0)])), iron);
  addInk(blade);
  spade.add(blade);
  const grip = new Mesh(shared('sx-grip', () => new BoxGeometry(0.12, 0.03, 0.03).translate(0, 0.7, 0)), wood);
  spade.add(grip);
  const lampArm = new Group();
  lampArm.position.set(-0.22, 0.58, 0.04);
  spine.add(lampArm);
  lampArm.add(new Mesh(armG, coat));
  const lantern = new Group();
  lantern.position.set(0, -0.44, 0.02);
  lampArm.add(lantern);
  const cage = new Mesh(
    shared('sx-cage', () =>
      mergeGeometries([
        new CylinderGeometry(0.06, 0.07, 0.025, 6).translate(0, -0.13, 0),
        new ConeGeometry(0.07, 0.06, 6).translate(0, 0.03, 0),
        new TorusGeometry(0.025, 0.006, 3, 8).translate(0, 0.075, 0),
        ...[0, 1, 2, 3].map((i) => rod([Math.cos((i * Math.PI) / 2) * 0.06, -0.12, Math.sin((i * Math.PI) / 2) * 0.06], [Math.cos((i * Math.PI) / 2) * 0.06, 0.0, Math.sin((i * Math.PI) / 2) * 0.06], 0.007)),
      ])
    ),
    iron
  );
  cage.position.y = -0.04;
  lantern.add(cage);
  const fl = new Mesh(shared('sx-flame', () => new ConeGeometry(0.035, 0.1, 5).translate(0, 0.02, 0)), flame);
  fl.position.y = -0.12;
  lantern.add(fl);
  const lampGlow = glowOf(TELL_INDIGO_GLOW, 0.7, 0.35);
  lampGlow.position.y = -0.1;
  lantern.add(lampGlow);
  s.group.add(groundShadow(0.32, 0.7, { forward: 0.08 }));
  const dig = clip();
  const step = frameDt();
  let kneel = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, e }) {
      const dt = step(t);
      const digging = e && e.mode === 'dig' ? 1 : 0;
      kneel = ease(kneel, digging, 9, dt);
      const da = dig(e?.digTick, dt);
      const pat = da < 0.3 ? Math.sin((da / 0.3) * Math.PI) : 0;
      const ph = (e ? e.id : 0) * 0.9;
      // Walk: a short shuffling stride under the hunch.
      const stride = 0.45 * moveK * (1 - kneel);
      legs[0].rotation.x = Math.sin(walkPhase * 2) * stride - 1.0 * kneel;
      legs[1].rotation.x = -Math.sin(walkPhase * 2) * stride + 0.5 * kneel;
      rig.position.y = Math.abs(Math.sin(walkPhase * 2)) * 0.025 * moveK - 0.16 * kneel;
      spine.rotation.x = 0.3 + 0.05 * moveK + 0.45 * kneel + 0.15 * pat;
      spine.rotation.z = 0.05 * Math.sin(walkPhase) * moveK;
      head.rotation.x = -0.25 - 0.25 * kneel;
      // The spade: carried on the shoulder; chopping down while it digs.
      const chop = kneel * (0.5 + 0.5 * Math.sin(t * 11 + ph));
      spadeArm.rotation.x = -0.3 * (1 - kneel) - 0.2 * kneel - 0.9 * chop + 0.4 * pat;
      spadeArm.rotation.z = 0.12;
      spade.rotation.x = 0.55 * (1 - kneel) + 0.2 * chop;
      // The lantern swings on its bail; held out low while it kneels.
      lampArm.rotation.x = -0.15 - 0.5 * kneel + 0.12 * Math.sin(walkPhase * 2) * moveK;
      lantern.rotation.x = -lampArm.rotation.x - spine.rotation.x + 0.15 * Math.sin(t * 2.2 + ph);
      lantern.rotation.z = 0.12 * Math.sin(t * 1.7 + ph);
      const k = Math.min(1, 0.45 + 0.1 * Math.sin(t * 9 + ph) + 0.35 * kneel + 0.4 * pat);
      flame.color.copy(tellColor(k));
      fl.scale.set(1, 1 + 0.3 * Math.sin(t * 13 + ph) + 0.5 * pat, 1);
      lampGlow.material.opacity = 0.26 + 0.2 * kneel + 0.25 * pat + 0.05 * Math.sin(t * 9 + ph);
    },
  };
}

// ------------------------------------------------------------- BLOOM --
export function buildBloom() {
  const s = shell('bloom');
  const { rig, track } = s;
  const flesh = track(flashable(HEART.fleshDark));
  const plum = track(flashable(HEART.flesh));
  const crystalMat = toonMaterial({ color: HEART.crystal, emissive: HEART.vein, emissiveIntensity: 0.5 });
  const core = veinMat(HEART.veinHot);
  const veins = veinMat();
  // The root knot: dark roots splayed over the floor, lit veins along them.
  const roots = new Group();
  rig.add(roots);
  const rootPts = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const r = 0.55 + 0.12 * ((i * 37) % 3);
    return [a, r];
  });
  const rootMesh = new Mesh(
    shared('bl-roots', () =>
      mergeGeometries(
        rootPts.flatMap(([a, r]) => [rod([0, 0.18, 0], [Math.sin(a) * r * 0.55, 0.07, Math.cos(a) * r * 0.55], 0.045), rod([Math.sin(a) * r * 0.55, 0.07, Math.cos(a) * r * 0.55], [Math.sin(a + 0.25) * r, 0.0, Math.cos(a + 0.25) * r], 0.03)])
      )
    ),
    flesh
  );
  addInk(rootMesh);
  roots.add(rootMesh);
  const rootVeins = new Mesh(
    shared('bl-rootveins', () => mergeGeometries(rootPts.map(([a, r]) => rod([Math.sin(a) * r * 0.2, 0.17, Math.cos(a) * r * 0.2], [Math.sin(a + 0.2) * r * 0.9, 0.035, Math.cos(a + 0.2) * r * 0.9], 0.012)))),
    veins
  );
  roots.add(rootVeins);
  // The stem and the bulb the petals hinge from.
  const stem = new Mesh(shared('bl-stem', () => new CylinderGeometry(0.07, 0.13, 0.42, 6).translate(0, 0.21, 0)), plum);
  addInk(stem);
  rig.add(stem);
  const head = new Group();
  head.position.y = 0.42;
  rig.add(head);
  const bulb = new Mesh(shared('bl-bulb', () => new IcosahedronGeometry(0.16, 0)), plum);
  bulb.scale.set(1, 0.7, 1);
  head.add(bulb);
  const heart = new Mesh(shared('bl-core', () => new IcosahedronGeometry(0.11, 1)), core);
  heart.position.y = 0.16;
  head.add(heart);
  const coreGlow = glowOf(HEART.glow, 1.1, 0.4);
  coreGlow.position.y = 0.2;
  head.add(coreGlow);
  // Five crystal petals on hinges round the core.
  const petals = [];
  const petalG = shared('bl-petal', () => new ConeGeometry(0.11, 0.62, 4).scale(1, 1, 0.45).translate(0, 0.31, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const hinge = new Group();
    hinge.position.set(Math.sin(a) * 0.12, 0.05, Math.cos(a) * 0.12);
    hinge.rotation.y = a;
    head.add(hinge);
    const leaf = new Mesh(petalG, crystalMat);
    addInk(leaf);
    hinge.add(leaf);
    petals.push(hinge);
  }
  const shadow = groundShadow(0.55, 0.6);
  s.group.add(shadow);
  const pulse = clip();
  const rooted = clip();
  const step = frameDt();
  let open = 0;
  let sink = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, moveK, telegraphK, e }) {
      const dt = step(t);
      const { swell, surge } = heartbeatK(tick ?? t * 60);
      const pa = pulse(e?.pulseTick, dt);
      const snap = pa < 0.1 ? 1 - pa / 0.1 : 0;
      const after = pa < 0.6 ? 1 - smooth(pa / 0.6) : 0;
      const ra = rooted(e?.rootTick, dt);
      const drive = ra < 0.35 ? Math.sin((ra / 0.35) * Math.PI) : 0;
      const isRooted = e ? e.mode === 'rooted' : true;
      sink = ease(sink, isRooted ? 1 : 0, 6, dt);
      // Petals: closed and breathing; splayed through the opening; slammed
      // shut on the pulse (they close faster than they opened).
      const want = telegraphK > 0.02 ? Math.min(1, telegraphK * 1.15) : 0;
      open = want > open ? ease(open, want, 5, dt) : ease(open, want, 22, dt);
      for (let i = 0; i < petals.length; i++) {
        const breathe = 0.12 * swell + 0.04 * Math.sin(t * 1.5 + i);
        petals[i].children[0].rotation.x = 0.2 + breathe + 1.15 * open - 0.25 * snap;
      }
      // Creeping: the knot shuffles and the roots writhe; rooted, it sinks a
      // touch and the roots spread (driven in with a jolt).
      const ph = (e ? e.id : 0) * 1.1;
      roots.rotation.y = (1 - sink) * 0.25 * Math.sin(t * 5 + ph) * moveK;
      roots.scale.set(1 + 0.18 * sink + 0.15 * drive, 1, 1 + 0.18 * sink + 0.15 * drive);
      rig.position.y = -0.05 * sink - 0.05 * drive + (1 - sink) * 0.03 * Math.abs(Math.sin(t * 6 + ph)) * moveK;
      head.rotation.z = (1 - sink) * 0.1 * Math.sin(t * 3 + ph) * moveK;
      head.scale.setScalar(1 + 0.06 * swell + 0.12 * snap);
      // The core beats with the room's heart and flares through the opening.
      const k = Math.min(1, 0.35 + 0.35 * swell + 0.3 * surge + 0.5 * open + 0.6 * after);
      core.color.copy(veinColor(k));
      veins.color.copy(veinColor(Math.min(1, 0.3 + 0.4 * swell + 0.3 * open)));
      heart.scale.setScalar(1 + 0.25 * swell + 0.45 * open + 0.6 * snap);
      crystalMat.emissiveIntensity = 0.45 + 0.35 * swell + 0.7 * open + 0.6 * after;
      coreGlow.material.opacity = 0.25 + 0.25 * swell + 0.45 * open + 0.5 * after;
      coreGlow.scale.setScalar(1.1 * (1 + 0.6 * open + 0.9 * after));
      shadow.material.opacity = 0.5;
    },
  };
}

// ------------------------------------------------------------ SIPHON --
const SAC_Y = 1.15;
export function buildSiphon() {
  const s = shell('siphon');
  const { rig, track } = s;
  const flesh = track(flashable(HEART.flesh));
  const dark = track(flashable(HEART.fleshDark));
  const bone = track(flashable(HEART.bone));
  const veins = veinMat();
  const tendrilMat = veinMat(HEART.vein);
  const hover = new Group();
  hover.position.y = SAC_Y;
  rig.add(hover);
  const sacG = new Group();
  hover.add(sacG);
  const sac = new Mesh(shared('sp-sac', () => new IcosahedronGeometry(0.28, 1)), flesh);
  sac.scale.set(1, 1.12, 0.95);
  addInk(sac);
  sacG.add(sac);
  // The vein net over the sac.
  const net = new Mesh(
    shared('sp-net', () => {
      const parts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const pts = [0.95, 0.6, 0.0, -0.6].map((y) => {
          const r = Math.sqrt(Math.max(0, 1 - y * y * 0.8)) * 0.285;
          const w = a + y * 0.5;
          return [Math.sin(w) * r, y * 0.3, Math.cos(w) * r];
        });
        for (let j = 0; j < pts.length - 1; j++) parts.push(rod(pts[j], pts[j + 1], 0.013));
      }
      return mergeGeometries(parts);
    }),
    veins
  );
  sacG.add(net);
  const innerGlow = glowOf(HEART.glow, 1.0, 0.35);
  sacG.add(innerGlow);
  // The mouth beneath: a dark ring with bone teeth.
  const mouth = new Group();
  mouth.position.y = -0.3;
  hover.add(mouth);
  mouth.add(new Mesh(shared('sp-lip', () => new TorusGeometry(0.11, 0.035, 5, 12).rotateX(Math.PI / 2)), dark));
  const teeth = new Mesh(shared('sp-teeth', () => mergeGeometries(Array.from({ length: 8 }, (_, i) => new ConeGeometry(0.018, 0.07, 3).rotateX(Math.PI).translate(Math.sin((i / 8) * Math.PI * 2) * 0.09, -0.03, Math.cos((i / 8) * Math.PI * 2) * 0.09)))), bone);
  mouth.add(teeth);
  // Four tendrils of three segments each, hanging from under the sac.
  const tendrils = [];
  const segG = shared('sp-seg', () => new CylinderGeometry(0.022, 0.014, 0.28, 4).translate(0, -0.14, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    let parent = new Group();
    parent.position.set(Math.sin(a) * 0.12, -0.26, Math.cos(a) * 0.12);
    hover.add(parent);
    const segs = [parent];
    parent.add(new Mesh(segG, tendrilMat));
    for (let j = 1; j < 3; j++) {
      const g = new Group();
      g.position.y = -0.27;
      parent.add(g);
      g.add(new Mesh(segG, tendrilMat));
      segs.push(g);
      parent = g;
    }
    tendrils.push({ segs, a });
  }
  const shadow = groundShadow(0.26, 0.45);
  s.group.add(shadow);
  const lash = clip();
  const step = frameDt();
  let draw = 0;
  let drinkK = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, moveK, telegraphK, e }) {
      const dt = step(t);
      const la = lash(e?.castTick, dt);
      const whip = la < 0.18 ? Math.sin((la / 0.18) * Math.PI) : 0;
      draw = ease(draw, telegraphK, 10, dt);
      drinkK = ease(drinkK, e && e.mode === 'drink' ? 1 : 0, 8, dt);
      const ph = (e ? e.id : 0) * 1.7;
      hover.position.y = SAC_Y + 0.07 * Math.sin(t * 1.9 + ph) + 0.08 * draw;
      hover.rotation.x = -0.12 * moveK - 0.2 * draw + 0.35 * whip + 0.25 * drinkK;
      // The sac: a slow breath; contracts to cast; gulps while it drinks.
      const gulp = drinkK * Math.max(0, Math.sin(t * Math.PI * 4 + ph)) ** 3;
      const sq = 1 + 0.05 * Math.sin(t * 2.4 + ph) - 0.12 * draw + 0.18 * gulp + 0.1 * whip;
      sacG.scale.set(sq, 2 - sq, sq);
      // Tendrils: a lazy sway; drawn up and back to cast; whipped forward on
      // the lash; reaching forward, taut, while it drinks.
      for (const td of tendrils) {
        const front = Math.cos(td.a);
        for (let j = 0; j < td.segs.length; j++) {
          const g = td.segs[j];
          const sway = 0.22 * Math.sin(t * 2.2 + ph + td.a * 2 + j * 0.9) * (1 - drinkK);
          g.rotation.x = sway - 0.9 * draw * (j === 0 ? 1 : 0.6) + 1.1 * whip * (j === 0 ? 1 : 0.4) + 0.75 * drinkK * (j === 0 ? 1 : 0.25) * (0.6 + 0.4 * front);
          g.rotation.z = 0.18 * Math.sin(t * 1.7 + ph + td.a + j) * (1 - drinkK) + Math.sin(td.a) * 0.2 * draw;
        }
      }
      const k = Math.min(1, 0.35 + 0.1 * Math.sin(t * 3 + ph) + 0.5 * draw + 0.6 * whip + 0.4 * drinkK + 0.3 * gulp);
      veins.color.copy(veinColor(k));
      tendrilMat.color.copy(veinColor(Math.min(1, k + 0.15)));
      innerGlow.material.opacity = 0.25 + 0.35 * draw + 0.3 * drinkK + 0.3 * gulp;
      innerGlow.scale.setScalar(1 + 0.4 * gulp + 0.3 * whip);
      shadow.material.opacity = 0.4 + 0.05 * Math.sin(t * 1.9 + ph);
    },
  };
}
