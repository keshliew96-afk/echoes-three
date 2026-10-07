// Act IV boss rigs (docs/ACT_IV_BOSSES.md): the Hollow Cantor and the Geode
// Colossus. Same grammar and interface as render/boss/slice2.js — { group,
// mats, setYaw, setFlash, pose } — faces +Z, world-unit sizes, ink on the big
// masses, a contact shadow.
//
//   cantor    the singer under the Barrow, a god's echo: a tall hooded figure
//             of near-black plum cloth that floats above the floor, a blank
//             pale mask with an open singing mouth, an open rib cage with the
//             violet heart beating in it, long sleeves that lift as it sings,
//             and a halo of seven notes behind its head (the seven verses;
//             one lights for each verse it has taken). It is the only Act IV
//             body in God-stuff violet light rather than the Heart's purple
//             veins. On an Echo Step it folds into its own echo and is gone.
//   colossus  the body the Heart grows when the singer stays hidden: a
//             hunched giant of dark slate rock with pale glass crystal on its
//             shoulders and back, a geode split open in its chest where the
//             heart's violet beats, knuckle-walking on two huge fists. It
//             raises one fist overhead for a Fissure, spreads both arms and
//             lights its geode for a Geode Burst, and slumps dim while spent.
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
import { HEART } from '../enemies/style.js';

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

// -------------------------------------------------------------- CANTOR --
const VIOLET = new Color(PALETTE.godstuffViolet);
const VIOLET_PEAK = new Color(PALETTE.godstuffVioletPeak);
const ROBE = HEART.cloth.clone().lerp(new Color(PALETTE.voidCharcoal), 0.25);
const ROBE_LINING = HEART.flesh.clone().multiplyScalar(0.8);
const MASK = new Color(PALETTE.bone).lerp(new Color('#E9E2F6'), 0.55);
const NOTE_DIM = VIOLET.clone().multiplyScalar(0.28);

export function buildCantor() {
  const s = rigShell('boss-cantor');
  const { rig, track } = s;
  const robe = track(flashable(ROBE));
  const lining = track(flashable(ROBE_LINING));
  const bone = track(flashable(HEART.bone));
  const mask = track(flashable(MASK));
  const heartMat = lit(VIOLET_PEAK);
  const mouthMat = lit(PALETTE.voidCharcoal);
  // The floating body: everything above the floor hangs off `float`.
  const float = new Group();
  rig.add(float);
  // The robe: a long open bell, hem cut into tatters that trail the floor.
  const skirt = new Mesh(new ConeGeometry(0.78, 1.9, 9, 1, true), robe);
  skirt.position.y = 1.15;
  addInk(skirt);
  float.add(skirt);
  const inner = new Mesh(new ConeGeometry(0.7, 1.75, 9, 1, true), lining);
  inner.position.y = 1.12;
  inner.scale.x = -1; // back faces out: the dark lining under the hem
  float.add(inner);
  const tatterG = new ConeGeometry(0.11, 0.62, 4);
  const tatters = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.17;
    const tt = new Mesh(tatterG, robe);
    tt.position.set(Math.sin(a) * 0.7, 0.18, Math.cos(a) * 0.7);
    tt.rotation.set(Math.PI + Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25);
    float.add(tt);
    tatters.push({ m: tt, a });
  }
  // The open chest: a rib cage round the beating heart.
  const chest = new Group();
  chest.position.set(0, 2.05, 0.12);
  float.add(chest);
  const ribG = new TorusGeometry(0.3, 0.035, 4, 10, Math.PI * 1.25);
  for (let i = 0; i < 4; i++) {
    const r = new Mesh(ribG, bone);
    r.position.set(0, 0.2 - i * 0.14, 0);
    r.rotation.set(Math.PI / 2, 0, Math.PI * 0.12);
    r.scale.setScalar(1 - Math.abs(i - 1.2) * 0.1);
    chest.add(r);
  }
  const heart = new Mesh(new IcosahedronGeometry(0.15, 0), heartMat);
  chest.add(heart);
  const heartGlow = glow(VIOLET, 1.8, 0.4);
  chest.add(heartGlow);
  // Shoulders: a cowl over the cage.
  const cowl = new Mesh(new SphereGeometry(0.52, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), robe);
  cowl.position.set(0, 2.32, -0.05);
  cowl.scale.set(1.15, 0.55, 0.9);
  addInk(cowl);
  float.add(cowl);
  // The head: a deep hood round a blank mask with an open mouth.
  const head = new Group();
  head.position.set(0, 2.72, 0.06);
  float.add(head);
  const hood = new Mesh(new SphereGeometry(0.34, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.72), robe);
  hood.scale.set(1, 1.25, 1.05);
  hood.rotation.x = -0.35;
  addInk(hood);
  head.add(hood);
  const face = new Mesh(new SphereGeometry(0.22, 9, 7), mask);
  face.scale.set(0.9, 1.12, 0.55);
  face.position.set(0, -0.04, 0.18);
  head.add(face);
  const mouth = new Mesh(new SphereGeometry(0.06, 8, 6), mouthMat);
  mouth.position.set(0, -0.12, 0.29);
  mouth.scale.set(0.9, 1.2, 0.4);
  head.add(mouth);
  const mouthGlow = glow(VIOLET_PEAK, 0.5, 0);
  mouthGlow.position.set(0, -0.12, 0.34);
  head.add(mouthGlow);
  for (const side of [-1, 1]) {
    // Eyes: two thin violet slits, barely there.
    const eye = new Mesh(new BoxGeometry(0.09, 0.016, 0.02), heartMat);
    eye.position.set(side * 0.08, 0.04, 0.3);
    eye.rotation.z = side * -0.25;
    head.add(eye);
  }
  // The halo: seven notes on a thin ring behind the head.
  const halo = new Group();
  halo.position.set(0, 2.8, -0.32);
  float.add(halo);
  const haloRing = new Mesh(new TorusGeometry(0.62, 0.018, 4, 40), lit(VIOLET));
  halo.add(haloRing);
  const haloGlow = glow(VIOLET, 2.4, 0.18);
  halo.add(haloGlow);
  const notes = [];
  const noteG = new IcosahedronGeometry(0.06, 0);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + ((i - 3) / 7) * Math.PI * 1.6;
    const n = new Mesh(noteG, lit(NOTE_DIM));
    n.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
    halo.add(n);
    notes.push(n);
  }
  // The sleeves: long cones from the shoulders, crystal fingers at the cuff.
  const arms = [];
  const sleeveG = new ConeGeometry(0.2, 1.15, 7, 1, true).translate(0, -0.57, 0);
  const fingerG = new ConeGeometry(0.035, 0.32, 4).translate(0, -0.16, 0);
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.5, 2.35, 0.02);
    float.add(p);
    const sl = new Mesh(sleeveG, robe);
    sl.rotation.x = Math.PI; // the open cuff at the bottom
    sl.position.y = -1.15;
    addInk(sl);
    p.add(sl);
    const hand = new Group();
    hand.position.y = -1.12;
    p.add(hand);
    for (let f = -1; f <= 1; f++) {
      const fm = new Mesh(fingerG, heartMat);
      fm.rotation.set(0, 0, f * 0.3);
      hand.add(fm);
    }
    const hg = glow(VIOLET, 0.6, 0.35);
    hg.position.y = -0.15;
    hand.add(hg);
    arms.push({ p, side, hg });
  }
  // A choir of motes circling it.
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const m = glow(i % 2 ? VIOLET_PEAK : VIOLET, 0.32, 0.6);
    rig.add(m);
    motes.push(m);
  }
  const pool = glow(VIOLET, 3.6, 0.22);
  pool.position.y = 0.06;
  rig.add(pool);
  const shadow = groundShadow(0.9, 0.36, { deep: 1.2 });
  s.group.add(shadow);
  let lastT = null;
  let fadeK = 0;
  let singK = 0;
  let pulseK = 0;
  const _col = new Color();
  return iface(s, ({ t, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const verse = e ? e.verse | 0 : 0;
    fadeK = ease(fadeK, e && e.mode === 'fade' ? 1 : 0, 14, dt);
    singK = ease(singK, attack === 'note' || attack === 'lance' ? telegraphK : 0, 12, dt);
    pulseK = ease(pulseK, attack === 'pulse' ? telegraphK : 0, 12, dt);
    // Float and bob; on an Echo Step it folds down into a sliver of light.
    float.position.y = 0.32 + 0.1 * Math.sin(t * 1.6) + 0.25 * singK;
    const fold = 1 - fadeK * 0.94;
    rig.scale.set(1 - fadeK * 0.6, fold, 1 - fadeK * 0.6);
    shadow.visible = fadeK < 0.5;
    // Lean into its walk; sleeves lift as it sings, spread wide for the pulse.
    float.rotation.x = 0.08 * moveK;
    for (const a of arms) {
      a.p.rotation.z = a.side * (0.12 + 0.9 * singK + 1.25 * pulseK + 0.05 * Math.sin(t * 1.3 + a.side));
      a.p.rotation.x = -0.25 - 0.9 * singK + 0.2 * pulseK;
      a.hg.material.opacity = 0.3 + 0.5 * Math.max(singK, pulseK);
    }
    head.rotation.x = -0.35 * singK + 0.05 * Math.sin(t * 0.9);
    mouth.scale.set(0.9, 1.2 + 1.6 * Math.max(singK, pulseK), 0.4);
    mouthGlow.material.opacity = 0.75 * Math.max(singK, pulseK);
    // The heart beats faster as it weakens and with each verse taken.
    const rate = 2.2 + verse * 0.5 + (1 - hpFrac) * 1.5;
    const beat = Math.pow(Math.max(0, Math.sin(t * rate * Math.PI)), 6);
    heart.scale.setScalar(1 + 0.35 * beat + 0.5 * pulseK);
    heartGlow.material.opacity = Math.min(0.85, 0.35 + 0.3 * beat + 0.4 * pulseK);
    pool.material.opacity = 0.16 + 0.1 * beat + 0.2 * pulseK;
    // The halo turns slowly; a note lights for each verse it has taken.
    halo.rotation.z = Math.sin(t * 0.35) * 0.15;
    haloGlow.material.opacity = 0.14 + 0.06 * verse + 0.2 * singK;
    for (let i = 0; i < notes.length; i++) {
      const on = i >= 2 && i < 2 + verse; // the middle three: Root, Water, Stone
      notes[i].material.color.copy(on ? _col.copy(VIOLET_PEAK) : NOTE_DIM);
      notes[i].scale.setScalar(on ? 1.3 + 0.2 * Math.sin(t * 4 + i) : 1);
    }
    for (let i = 0; i < tatters.length; i++) tatters[i].m.rotation.y = 0.2 * Math.sin(t * 2 + i);
    for (let i = 0; i < motes.length; i++) {
      const a = t * (0.6 + verse * 0.15) + (i / motes.length) * Math.PI * 2;
      const r = 1.1 + 0.15 * Math.sin(t * 1.7 + i);
      motes[i].position.set(Math.cos(a) * r, 1.4 + 0.6 * Math.sin(t * 0.8 + i * 1.3), Math.sin(a) * r);
      motes[i].material.opacity = (0.35 + 0.35 * singK) * (1 - fadeK);
    }
  });
}

// ------------------------------------------------------------ COLOSSUS --
const GLASS = HEART.crystal.clone().lerp(new Color('#EEF2FF'), 0.55);
const GLASS_EMIT = HEART.crystal.clone().lerp(new Color('#FFFFFF'), 0.3);

export function buildColossus() {
  const s = rigShell('boss-colossus');
  const { rig, track } = s;
  const stone = track(flashable(HEART.stone));
  const dark = track(flashable(HEART.stoneDark));
  const glass = toonMaterial({ color: GLASS, emissive: GLASS_EMIT, emissiveIntensity: 0.35 });
  const cracks = lit(HEART.vein);
  const core = lit(HEART.veinHot);
  // Stubby legs.
  const legs = [];
  const legG = new CylinderGeometry(0.24, 0.3, 0.8, 7).translate(0, -0.4, 0);
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.45, 0.82, -0.35);
    rig.add(p);
    const l = new Mesh(legG, dark);
    addInk(l);
    p.add(l);
    legs.push(p);
  }
  // The hunched torso pivots forward from the hips.
  const body = new Group();
  body.position.set(0, 0.85, -0.3);
  rig.add(body);
  const torso = new Mesh(new IcosahedronGeometry(0.95, 1), stone);
  torso.scale.set(1.25, 1.0, 0.95);
  torso.position.set(0, 0.9, 0.35);
  torso.rotation.set(0.25, 0.4, 0);
  addInk(torso);
  body.add(torso);
  // The split geode in the chest: a dark cavity lined with inward crystal,
  // the violet heart at its centre.
  const geode = new Group();
  geode.position.set(0, 0.85, 1.12);
  body.add(geode);
  const cavity = new Mesh(new SphereGeometry(0.42, 9, 7), dark);
  cavity.scale.set(1, 1.2, 0.45);
  geode.add(cavity);
  const lining = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sp = new Mesh(new ConeGeometry(0.07, 0.3, 5), glass);
    sp.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.36, 0.08);
    sp.rotation.set(0, 0, a + Math.PI / 2);
    sp.rotateX(0.5);
    geode.add(sp);
    lining.push(sp);
  }
  const heart = new Mesh(new IcosahedronGeometry(0.17, 0), core);
  heart.position.z = 0.12;
  geode.add(heart);
  const heartGlow = glow(HEART.glow, 2.0, 0.45);
  heartGlow.position.z = 0.25;
  geode.add(heartGlow);
  // Violet cracks over the rock (they burn once enraged).
  const crackG = new BoxGeometry(0.035, 0.5, 0.035);
  const crackList = [];
  for (const [x, y, z, rz] of [[-0.75, 1.2, 0.85, 0.5], [0.8, 0.7, 0.8, -0.6], [-0.4, 0.3, 1.05, 1.1], [0.55, 1.45, 0.6, 0.2], [-0.95, 0.65, 0.4, -0.3]]) {
    const c = new Mesh(crackG, cracks);
    c.position.set(x, y, z);
    c.rotation.z = rz;
    body.add(c);
    crackList.push(c);
  }
  // Pale glass crystal out of the shoulders and back.
  const spireAt = [[0.85, 1.6, 0.25, 0.32, 0.9, -0.7, -0.2], [-0.9, 1.55, 0.2, 0.3, 0.85, 0.7, -0.25], [0.2, 1.85, -0.2, 0.36, 1.2, -0.15, -0.5], [-0.3, 1.8, -0.35, 0.28, 0.95, 0.25, -0.6], [0.6, 1.4, -0.45, 0.22, 0.7, -0.6, -0.8], [-0.65, 1.3, -0.5, 0.2, 0.62, 0.6, -0.8], [0.0, 1.5, -0.6, 0.24, 0.8, 0, -1.0]];
  for (const [x, y, z, r, h, lx, lz] of spireAt) {
    const sp = new Mesh(new ConeGeometry(r, h, 5).translate(0, h / 2, 0), glass);
    sp.position.set(x, y, z);
    sp.rotation.set(lz, 0, lx);
    addInk(sp);
    body.add(sp);
  }
  const backGlow = glow(GLASS_EMIT, 2.4, 0.16);
  backGlow.position.set(0, 2.2, -0.3);
  body.add(backGlow);
  // The head: a low blunt wedge sunk between the shoulders.
  const head = new Mesh(new IcosahedronGeometry(0.3, 0), dark);
  head.scale.set(1.2, 0.8, 1.05);
  head.position.set(0, 1.55, 1.1);
  addInk(head);
  body.add(head);
  for (const side of [-1, 1]) {
    const eye = new Mesh(new BoxGeometry(0.14, 0.03, 0.03), cracks);
    eye.position.set(side * 0.13, 1.58, 1.38);
    eye.rotation.z = side * 0.3;
    body.add(eye);
  }
  // The arms: huge, knuckle-walking, fists studded with glass.
  const arms = [];
  const upperG = new CylinderGeometry(0.26, 0.22, 1.05, 7).translate(0, -0.52, 0);
  const fistG = new IcosahedronGeometry(0.36, 0);
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 1.15, 1.35, 0.55);
    body.add(p);
    const up = new Mesh(upperG, stone);
    addInk(up);
    p.add(up);
    const fist = new Mesh(fistG, dark);
    fist.position.y = -1.18;
    fist.scale.set(1.1, 0.95, 1.2);
    addInk(fist);
    p.add(fist);
    for (let k = 0; k < 3; k++) {
      const st = new Mesh(new ConeGeometry(0.07, 0.3, 4), glass);
      st.position.set((k - 1) * 0.15, -1.28, 0.3);
      st.rotation.x = 1.2;
      p.add(st);
    }
    const fg = glow(HEART.glow, 0.9, 0);
    fg.position.y = -1.18;
    p.add(fg);
    arms.push({ p, side, fg });
  }
  const pool = glow(HEART.glow, 3.4, 0.16);
  pool.position.set(0, 0.06, 0.5);
  rig.add(pool);
  s.group.add(groundShadow(1.25, 0.42, { deep: 1.4 }));
  let lastT = null;
  let fissK = 0;
  let burstK = 0;
  let spentK = 0;
  let rageK = 0;
  return iface(s, ({ t, walkPhase = 0, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    fissK = ease(fissK, attack === 'fissure' ? telegraphK : 0, 14, dt);
    burstK = ease(burstK, attack === 'burst' ? telegraphK : 0, 12, dt);
    spentK = ease(spentK, e && e.mode === 'spent' ? 1 : 0, 8, dt);
    rageK = ease(rageK, e && e.enraged ? 1 : 0, 3, dt);
    // A heavy rolling gait.
    const step = Math.sin(walkPhase * 2) * moveK;
    for (let i = 0; i < legs.length; i++) legs[i].rotation.x = (i ? -1 : 1) * 0.35 * step;
    body.rotation.z = 0.05 * step;
    body.rotation.x = 0.18 + 0.1 * moveK + 0.3 * spentK - 0.25 * burstK;
    body.position.y = 0.85 - 0.12 * spentK + 0.03 * Math.abs(step);
    for (const a of arms) {
      // Knuckle-walk swing; the right fist rises overhead for the Fissure,
      // both spread wide for the Burst, both hang slack while spent.
      const right = a.side > 0;
      const lift = right ? fissK : 0;
      a.p.rotation.x = -0.35 * a.side * step * moveK - 2.6 * lift + 0.25 * spentK;
      a.p.rotation.z = a.side * (0.12 + 0.9 * burstK);
      a.fg.material.opacity = 0.6 * Math.max(lift, burstK);
    }
    // The geode beats with the Heart; it blazes for the Burst and dims spent.
    const rate = 1.6 + (1 - hpFrac) * 1.4 + rageK * 0.8;
    const beat = Math.pow(Math.max(0, Math.sin(t * rate * Math.PI)), 6);
    heart.scale.setScalar((1 + 0.3 * beat + 0.6 * burstK) * (1 - 0.4 * spentK));
    heartGlow.material.opacity = Math.max(0.08, Math.min(0.9, 0.35 + 0.25 * beat + 0.45 * burstK - 0.3 * spentK));
    glass.emissiveIntensity = 0.3 + 0.35 * burstK + 0.2 * rageK - 0.2 * spentK;
    for (const sp of lining) sp.scale.setScalar(1 + 0.25 * burstK);
    for (const c of crackList) c.scale.set(1 + rageK, 1 + 0.6 * rageK, 1 + rageK);
    cracks.color.copy(HEART.veinDim).lerp(HEART.veinHot, 0.35 + 0.65 * Math.max(rageK * (0.6 + 0.4 * beat), burstK));
    pool.material.opacity = 0.12 + 0.08 * beat + 0.25 * burstK;
    backGlow.material.opacity = 0.12 + 0.1 * rageK;
  });
}
