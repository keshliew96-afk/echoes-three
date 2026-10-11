// Act V boss rigs (docs/ACT_V_BOSSES.md): the Hush and the Skyhorn. Same
// grammar and interface as render/boss/heart.js — { group, mats, setYaw,
// setFlash, pose } — faces +Z, world-unit sizes, ink on the big masses, a
// contact shadow.
//
//   hush     the silence that stopped the gods: a tall veil of grey
//            stillness, its hem dissolving into a low mist, a cowl, and for a
//            head an old bronze bell turned mouth-down with no clapper in it
//            and a crack down its face that leaks a cold lavender-white
//            light. One long sleeve is raised, a finger held where lips would
//            be. Five small bells circle it; each Stillness stops one, and it
//            hangs dead and grey. It rises and spreads its sleeves for the
//            Great Hush, then sinks drained, the veil slack and the crack dim.
//            The God-stuff violet is only a rim behind it: this is the quiet
//            the Hollow Cantor sang into, not the song.
//   skyhorn  the Spire's warden: a great ibex of pale ledge-goat hair, long
//            beard and lean legs, with two huge ridged horns of tarnished
//            bell bronze sweeping back over its shoulders, a small bell on a
//            rope round its neck, and the hollow song's violet in its eyes
//            and in the cracks of its horns. It rears and paws before a Horn
//            Rush, drops its head and gallops down the lane, staggers dazed
//            when it meets the wall, throws its head up and clashes its horns
//            for the Bell Toll, crouches and springs for the Sky Leap.
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE, VFX_MATTER } from '../../data/palette.js';
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
// A bell's half-profile (mouth at y 0, crown at y h), for a LatheGeometry.
function bellProfile(r, h) {
  return [
    new Vector2(r * 1.0, 0),
    new Vector2(r * 1.05, h * 0.06),
    new Vector2(r * 0.86, h * 0.2),
    new Vector2(r * 0.74, h * 0.5),
    new Vector2(r * 0.66, h * 0.82),
    new Vector2(r * 0.42, h * 0.98),
    new Vector2(0.001, h),
  ];
}

// ---------------------------------------------------------------- HUSH --
const VEIL = new Color(VFX_MATTER.hushveil);
const VEIL_DARK = VEIL.clone().lerp(new Color(PALETTE.voidCharcoal), 0.62);
const PALE = new Color(VFX_MATTER.hushpale);
const PALE_PEAK = new Color('#F6F7FF');
const BRONZE_GREY = new Color(VFX_MATTER.bellbronze).lerp(VEIL, 0.45);
const VIOLET = new Color(PALETTE.godstuffViolet);
const DEAD_BELL = VEIL.clone().multiplyScalar(0.55);

export function buildHush() {
  const s = rigShell('boss-hush');
  const { rig, track } = s;
  const veil = track(flashable(VEIL));
  const lining = track(flashable(VEIL_DARK));
  const bronze = track(flashable(BRONZE_GREY));
  const crackMat = lit(PALE);
  const voidMat = lit(PALETTE.voidCharcoal);
  const float = new Group();
  rig.add(float);
  // The veil: a tall open bell of cloth, the hem cut into long tatters.
  const skirt = new Mesh(new ConeGeometry(0.86, 2.2, 10, 1, true), veil);
  skirt.position.y = 1.2;
  addInk(skirt);
  float.add(skirt);
  const inner = new Mesh(new ConeGeometry(0.78, 2.05, 10, 1, true), lining);
  inner.position.y = 1.16;
  inner.scale.x = -1;
  float.add(inner);
  const tatterG = new ConeGeometry(0.12, 0.8, 4);
  const tatters = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const tt = new Mesh(tatterG, veil);
    tt.position.set(Math.sin(a) * 0.78, 0.0, Math.cos(a) * 0.78);
    tt.rotation.set(Math.PI + Math.cos(a) * 0.22, 0, -Math.sin(a) * 0.22);
    float.add(tt);
    tatters.push({ m: tt, a });
  }
  // The mist the hem dissolves into.
  const mists = [];
  for (let i = 0; i < 5; i++) {
    const m = glow(PALE, 1.4, 0.16);
    rig.add(m);
    mists.push(m);
  }
  // Shoulders: a heavy cowl.
  const cowl = new Mesh(new SphereGeometry(0.58, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), veil);
  cowl.position.set(0, 2.38, -0.04);
  cowl.scale.set(1.15, 0.6, 0.92);
  addInk(cowl);
  float.add(cowl);
  // The head: an old bronze bell, mouth down, crown up; a crack down its face.
  const head = new Group();
  head.position.set(0, 2.5, 0.04);
  float.add(head);
  const bell = new Mesh(new LatheGeometry(bellProfile(0.4, 0.78), 14), bronze);
  addInk(bell);
  head.add(bell);
  const lip = new Mesh(new TorusGeometry(0.41, 0.035, 5, 18), bronze);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.02;
  head.add(lip);
  // No clapper: just the dark inside of the mouth.
  const mouth = new Mesh(new CylinderGeometry(0.36, 0.36, 0.02, 14), voidMat);
  mouth.position.y = 0.01;
  head.add(mouth);
  const crown = new Mesh(new TorusGeometry(0.1, 0.03, 5, 10), bronze);
  crown.position.y = 0.82;
  head.add(crown);
  // The crack: a jagged lit seam down the front of the bell.
  const crack = new Group();
  head.add(crack);
  const segG = new BoxGeometry(0.03, 0.2, 0.03);
  for (const [x, y, rz] of [[0.02, 0.66, 0.3], [-0.03, 0.48, -0.4], [0.03, 0.3, 0.35], [-0.01, 0.12, -0.2]]) {
    const c = new Mesh(segG, crackMat);
    const r = 0.4 * (0.7 + (0.66 - y) * 0.5);
    c.position.set(x, y, Math.min(0.42, r * 0.98));
    c.rotation.set(-0.35, 0, rz);
    crack.add(c);
  }
  const crackGlow = glow(PALE, 0.9, 0.35);
  crackGlow.position.set(0, 0.42, 0.42);
  head.add(crackGlow);
  // The sleeves: long thin cones; the right one rises, a finger at the bell.
  const arms = [];
  const sleeveG = new ConeGeometry(0.17, 1.3, 7, 1, true).translate(0, -0.65, 0);
  const fingerG = new ConeGeometry(0.03, 0.3, 4).translate(0, -0.15, 0);
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.55, 2.38, 0.02);
    float.add(p);
    const sl = new Mesh(sleeveG, veil);
    sl.rotation.x = Math.PI;
    sl.position.y = -1.3;
    addInk(sl);
    p.add(sl);
    const hand = new Group();
    hand.position.y = -1.28;
    p.add(hand);
    const finger = new Mesh(fingerG, lit(PALE));
    hand.add(finger);
    const hg = glow(PALE, 0.55, 0.25);
    hg.position.y = -0.15;
    hand.add(hg);
    arms.push({ p, side, hg });
  }
  // Five small bells circling it: each Stillness stops one.
  const ring = new Group();
  ring.position.y = 1.6;
  rig.add(ring);
  const smallBellG = new LatheGeometry(bellProfile(0.11, 0.2), 8);
  const bells = [];
  for (let i = 0; i < 5; i++) {
    const g = new Group();
    const m = new Mesh(smallBellG, flashable(new Color(VFX_MATTER.bellbronze)));
    s.mats.push(m.material);
    g.add(m);
    const bg = glow(PALE, 0.5, 0.3);
    bg.position.y = 0.08;
    g.add(bg);
    ring.add(g);
    bells.push({ g, m, bg, phase: (i / 5) * Math.PI * 2 });
  }
  // The violet rim behind it: the only God-stuff on its body.
  const rim = glow(VIOLET, 3.6, 0.1);
  rim.position.set(0, 1.8, -0.5);
  rig.add(rim);
  const pool = glow(PALE, 3.8, 0.16);
  pool.position.y = 0.06;
  rig.add(pool);
  const shadow = groundShadow(1.0, 0.36, { deep: 1.2 });
  s.group.add(shadow);
  let lastT = null;
  let noteK = 0;
  let laneK = 0;
  let riseK = 0;
  let drainK = 0;
  const bellAngle = [0, 0, 0, 0, 0];
  const _c = new Color();
  return iface(s, ({ t, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const still = e ? e.stillness | 0 : 0;
    noteK = ease(noteK, attack === 'note' ? telegraphK : 0, 12, dt);
    laneK = ease(laneK, attack === 'unring' ? telegraphK : 0, 12, dt);
    riseK = ease(riseK, attack === 'great' ? telegraphK : 0, 6, dt);
    drainK = ease(drainK, e && e.mode === 'drained' ? 1 : 0, 6, dt);
    // It floats; for the Great Hush it rises, drained it sinks to the floor.
    float.position.y = 0.28 + 0.08 * Math.sin(t * 1.1) + 0.7 * riseK - 0.24 * drainK;
    float.rotation.x = 0.06 * moveK + 0.32 * drainK - 0.1 * riseK;
    skirt.scale.set(1 + 0.25 * riseK - 0.12 * drainK, 1 - 0.1 * drainK, 1 + 0.25 * riseK - 0.12 * drainK);
    head.rotation.x = -0.15 * riseK + 0.5 * drainK + 0.04 * Math.sin(t * 0.7);
    for (const a of arms) {
      const right = a.side > 0;
      // The right sleeve holds a finger to the bell; it points for the note.
      const hush = right ? 1 - Math.max(noteK, laneK, riseK, drainK) : 0;
      a.p.rotation.x = -0.15 - 2.1 * hush - 1.2 * noteK * (right ? 1 : 0.3) - 1.35 * laneK + 0.25 * drainK;
      a.p.rotation.z = a.side * (0.1 + 0.25 * hush + 1.3 * riseK + 0.08 * Math.sin(t * 1.2 + a.side));
      a.hg.material.opacity = 0.2 + 0.55 * Math.max(noteK, laneK, riseK);
    }
    // The crack breathes a cold light; it blazes for the Great Hush and dies
    // down drained. As it weakens it breathes slower, not faster: stillness.
    const rate = 0.8 - 0.25 * (1 - hpFrac);
    const breath = 0.5 + 0.5 * Math.sin(t * rate * Math.PI);
    const crackK = Math.min(1, 0.35 + 0.25 * breath + 0.6 * Math.max(noteK, laneK) + 0.8 * riseK) * (1 - 0.75 * drainK);
    crackMat.color.copy(_c.copy(VEIL).lerp(riseK > 0.5 ? PALE_PEAK : PALE, crackK));
    crackGlow.material.opacity = 0.15 + 0.6 * crackK;
    crackGlow.scale.setScalar(0.9 + 1.6 * riseK);
    rim.material.opacity = 0.08 + 0.12 * riseK + 0.04 * still;
    pool.material.opacity = (0.12 + 0.06 * breath + 0.25 * riseK) * (1 - 0.6 * drainK);
    // The five bells: the live ones circle and sway; a stilled one hangs dead.
    ring.rotation.y = t * 0.35 * (1 - 0.8 * drainK);
    for (let i = 0; i < bells.length; i++) {
      const b = bells[i];
      const dead = i < still;
      const r = 1.25 + 0.6 * riseK;
      b.g.position.set(Math.cos(b.phase) * r, (dead ? -0.6 : 0.15 * Math.sin(t * 1.3 + b.phase)) + 0.7 * riseK, Math.sin(b.phase) * r);
      bellAngle[i] = ease(bellAngle[i], dead ? 0 : 0.35 * Math.sin(t * 3 + b.phase), 8, dt);
      b.m.rotation.z = bellAngle[i];
      b.m.material.color.copy(dead ? DEAD_BELL : _c.set(VFX_MATTER.bellbronze));
      b.bg.material.opacity = dead ? 0 : 0.2 + 0.3 * riseK;
    }
    for (let i = 0; i < tatters.length; i++) tatters[i].m.rotation.y = 0.2 * Math.sin(t * 1.4 + i) * (1 - drainK);
    for (let i = 0; i < mists.length; i++) {
      const a = t * 0.25 + (i / mists.length) * Math.PI * 2;
      const r = 0.7 + 0.3 * Math.sin(t * 0.6 + i) + 0.8 * riseK;
      mists[i].position.set(Math.cos(a) * r, 0.25 + 0.1 * Math.sin(t + i), Math.sin(a) * r);
      mists[i].material.opacity = 0.1 + 0.08 * riseK + 0.06 * drainK;
    }
  });
}

// ------------------------------------------------------------- SKYHORN --
const FUR = new Color(VFX_MATTER.ibexfur);
const FUR_DARK = FUR.clone().lerp(new Color(PALETTE.voidCharcoal), 0.55);
const HORN = new Color(VFX_MATTER.bellbronze).lerp(new Color(VFX_MATTER.spirestone), 0.15);
const HOOF = new Color(PALETTE.voidCharcoal).lerp(FUR, 0.2);

// One horn: a thick ridged sweep back from the brow and down round the ear.
function hornCurve(side) {
  return new CatmullRomCurve3([
    new Vector3(side * 0.12, 0.0, 0.05),
    new Vector3(side * 0.24, 0.42, -0.05),
    new Vector3(side * 0.34, 0.72, -0.42),
    new Vector3(side * 0.42, 0.62, -0.9),
    new Vector3(side * 0.5, 0.22, -1.08),
    new Vector3(side * 0.52, -0.08, -0.86),
  ]);
}

export function buildSkyhorn() {
  const s = rigShell('boss-skyhorn');
  const { rig, track } = s;
  const fur = track(flashable(FUR));
  const furDark = track(flashable(FUR_DARK));
  const horn = track(flashable(HORN));
  const hoof = track(flashable(HOOF));
  const veinMat = lit(HEART.vein);
  const eyeMat = lit(HEART.veinHot);
  // Everything above the hooves hangs off `body` (the leap lifts it).
  const body = new Group();
  rig.add(body);
  // Legs: four lean legs from the barrel, each a thigh and a shank.
  const legs = [];
  const thighG = new CylinderGeometry(0.13, 0.09, 0.62, 6).translate(0, -0.31, 0);
  const shankG = new CylinderGeometry(0.075, 0.06, 0.62, 6).translate(0, -0.31, 0);
  const hoofG = new CylinderGeometry(0.07, 0.09, 0.1, 6);
  for (const [x, z, front] of [[-0.3, 0.55, true], [0.3, 0.55, true], [-0.3, -0.55, false], [0.3, -0.55, false]]) {
    const hip = new Group();
    hip.position.set(x, 1.24, z);
    body.add(hip);
    const th = new Mesh(thighG, fur);
    addInk(th);
    hip.add(th);
    const knee = new Group();
    knee.position.y = -0.6;
    hip.add(knee);
    const sh = new Mesh(shankG, furDark);
    knee.add(sh);
    const h = new Mesh(hoofG, hoof);
    h.position.y = -0.62;
    knee.add(h);
    legs.push({ hip, knee, front, side: Math.sign(x) });
  }
  // The barrel: a long body, a deep chest, a short tail.
  const torso = new Mesh(new SphereGeometry(0.52, 12, 9), fur);
  torso.scale.set(0.95, 0.9, 1.6);
  torso.position.set(0, 1.42, 0);
  addInk(torso);
  body.add(torso);
  const chest = new Mesh(new SphereGeometry(0.42, 10, 8), fur);
  chest.position.set(0, 1.42, 0.55);
  chest.scale.set(1, 1.08, 0.9);
  body.add(chest);
  const ruff = new Mesh(new SphereGeometry(0.36, 9, 7), furDark);
  ruff.position.set(0, 1.62, 0.78);
  ruff.scale.set(1.05, 0.9, 0.8);
  body.add(ruff);
  const tail = new Mesh(new ConeGeometry(0.08, 0.28, 5), furDark);
  tail.position.set(0, 1.62, -0.88);
  tail.rotation.x = -2.2;
  body.add(tail);
  // A dark stripe down the spine.
  const stripe = new Mesh(new BoxGeometry(0.08, 0.04, 1.4), furDark);
  stripe.position.set(0, 1.9, -0.05);
  body.add(stripe);
  // Neck and head pivot at the shoulders.
  const neck = new Group();
  neck.position.set(0, 1.72, 0.72);
  body.add(neck);
  const neckM = new Mesh(new CylinderGeometry(0.17, 0.26, 0.62, 8).translate(0, 0.3, 0), fur);
  neckM.rotation.x = 0.55;
  addInk(neckM);
  neck.add(neckM);
  const head = new Group();
  head.position.set(0, 0.52, 0.32);
  neck.add(head);
  const skull = new Mesh(new SphereGeometry(0.2, 10, 8), fur);
  skull.scale.set(0.9, 0.95, 1.1);
  addInk(skull);
  head.add(skull);
  const muzzle = new Mesh(new CylinderGeometry(0.09, 0.14, 0.42, 8).translate(0, 0.21, 0), fur);
  muzzle.rotation.x = 1.9;
  muzzle.position.set(0, -0.02, 0.1);
  head.add(muzzle);
  const nose = new Mesh(new SphereGeometry(0.06, 6, 5), furDark);
  nose.position.set(0, -0.17, 0.48);
  head.add(nose);
  const beard = new Mesh(new ConeGeometry(0.08, 0.36, 5), furDark);
  beard.position.set(0, -0.32, 0.36);
  beard.rotation.x = 0.25;
  head.add(beard);
  for (const side of [-1, 1]) {
    const ear = new Mesh(new ConeGeometry(0.05, 0.22, 4), furDark);
    ear.position.set(side * 0.2, 0.06, -0.06);
    ear.rotation.set(0, 0, side * -1.2);
    head.add(ear);
    const eye = new Mesh(new BoxGeometry(0.07, 0.025, 0.02), eyeMat);
    eye.position.set(side * 0.13, 0.04, 0.15);
    eye.rotation.set(0, side * 0.6, side * -0.25);
    head.add(eye);
  }
  const eyeGlow = glow(HEART.glow, 0.6, 0.2);
  eyeGlow.position.set(0, 0.04, 0.2);
  head.add(eyeGlow);
  // The horns: bronze sweeps with ridges and the song's violet in a crack.
  const horns = [];
  for (const side of [-1, 1]) {
    const curve = hornCurve(side);
    const hm = new Mesh(new TubeGeometry(curve, 24, 0.075, 7), horn);
    hm.position.y = 0.1;
    addInk(hm);
    head.add(hm);
    // A taper toward the tip: the base is thicker.
    const base = new Mesh(new SphereGeometry(0.11, 8, 6), horn);
    base.position.set(side * 0.12, 0.12, 0.05);
    head.add(base);
    for (let k = 1; k < 9; k++) {
      const p = curve.getPoint(k / 10);
      const tan = curve.getTangent(k / 10);
      const ridge = new Mesh(new TorusGeometry(0.08 - k * 0.004, 0.018, 4, 10), horn);
      ridge.position.set(p.x, p.y + 0.1, p.z);
      ridge.lookAt(p.x + tan.x, p.y + 0.1 + tan.y, p.z + tan.z);
      head.add(ridge);
    }
    const vp = curve.getPoint(0.45);
    const vein = new Mesh(new BoxGeometry(0.025, 0.025, 0.28), veinMat);
    vein.position.set(vp.x + side * 0.06, vp.y + 0.12, vp.z);
    vein.lookAt(vp.x + side * 0.06 + curve.getTangent(0.45).x, vp.y + 0.12 + curve.getTangent(0.45).y, vp.z + curve.getTangent(0.45).z);
    head.add(vein);
    const hg = glow(HEART.glow, 0.7, 0);
    hg.position.set(curve.getPoint(0.55).x, curve.getPoint(0.55).y + 0.1, curve.getPoint(0.55).z);
    head.add(hg);
    horns.push({ side, hg });
  }
  // The bell on a rope at its throat.
  const collar = new Mesh(new TorusGeometry(0.21, 0.025, 4, 12), lit('#5A4A36'));
  collar.position.set(0, 0.12, 0.08);
  collar.rotation.x = 1.2;
  neck.add(collar);
  const bellPivot = new Group();
  bellPivot.position.set(0, -0.04, 0.3);
  neck.add(bellPivot);
  const bellM = new Mesh(new LatheGeometry(bellProfile(0.1, 0.18), 8), horn);
  bellM.position.y = -0.2;
  bellPivot.add(bellM);
  const pool = glow(HEART.glow, 3.0, 0.1);
  pool.position.set(0, 0.06, 0.2);
  rig.add(pool);
  const shadow = groundShadow(1.05, 0.4, { deep: 1.3 });
  s.group.add(shadow);
  let lastT = null;
  let pawK = 0;
  let rushK = 0;
  let dazeK = 0;
  let tollK = 0;
  let crouchK = 0;
  let airK = 0;
  let rageK = 0;
  return iface(s, ({ t, walkPhase = 0, moveK = 0, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const mode = e ? e.mode : 'stalk';
    pawK = ease(pawK, attack === 'rush' ? telegraphK : 0, 12, dt);
    rushK = ease(rushK, mode === 'rush' ? 1 : 0, 18, dt);
    dazeK = ease(dazeK, mode === 'dazed' ? 1 : 0, 8, dt);
    tollK = ease(tollK, attack === 'toll' ? telegraphK : 0, 12, dt);
    crouchK = ease(crouchK, mode === 'crouch' ? 1 : 0, 10, dt);
    airK = ease(airK, mode === 'air' ? 1 : 0, mode === 'air' ? 5 : 16, dt);
    rageK = ease(rageK, e && e.enraged ? 1 : 0, 3, dt);
    // Gait: a walk, a gallop on the rush (fast phase), a paw while it waits.
    const gait = rushK > 0.5 ? t * 14 : walkPhase * 1.6;
    const swing = Math.max(moveK, rushK);
    for (const l of legs) {
      const ph = gait + (l.front ? 0 : Math.PI) + (l.side > 0 ? Math.PI / 2 : 0);
      let a = Math.sin(ph) * 0.5 * swing;
      // The right foreleg paws the floor before a rush.
      if (l.front && l.side > 0) a += pawK * (0.6 * Math.max(0, Math.sin(t * 9)) - 0.2);
      a += crouchK * (l.front ? -0.5 : 0.7) - airK * (l.front ? 1.0 : -1.0);
      l.hip.rotation.x = a;
      l.knee.rotation.x = Math.max(0, -Math.sin(ph) * 0.6 * swing) + crouchK * (l.front ? 0.9 : -0.9) + airK * (l.front ? 1.6 : -1.5);
    }
    // Body: lifted for the leap, lowered into a crouch, swaying dazed.
    body.position.y = -0.32 * crouchK + 2.3 * airK + 0.06 * Math.abs(Math.sin(gait)) * swing;
    body.rotation.x = 0.12 * pawK - 0.08 * rushK + 0.1 * crouchK - 0.25 * airK;
    body.rotation.z = 0.12 * dazeK * Math.sin(t * 5);
    // Head: down for the rush, rearing up and snapping down for the toll,
    // wobbling dazed.
    const clash = tollK > 0.85 ? 1 : 0;
    neck.rotation.x = 0.55 * Math.max(pawK, rushK) - 0.7 * tollK + 0.9 * clash * Math.sin(t * 18) * 0.1 + 0.3 * dazeK;
    neck.rotation.y = 0.35 * dazeK * Math.sin(t * 3.2);
    head.rotation.z = 0.25 * dazeK * Math.sin(t * 4.1);
    bellPivot.rotation.x = 0.4 * Math.sin(t * 6) * Math.max(swing, tollK) + 0.2 * Math.sin(t * 2.2);
    // The song in its horns: it burns brighter as it weakens and when enraged.
    const beat = Math.pow(Math.max(0, Math.sin(t * (1.6 + rageK) * Math.PI)), 4);
    const hot = Math.min(1, 0.2 * beat + 0.5 * tollK + 0.5 * rushK + 0.35 * rageK + 0.2 * (1 - hpFrac));
    for (const h of horns) h.hg.material.opacity = 0.6 * hot;
    eyeGlow.material.opacity = 0.18 + 0.35 * Math.max(rageK, pawK) * (1 - 0.6 * dazeK);
    pool.material.opacity = 0.06 + 0.08 * hot;
    shadow.scale.setScalar(1 - 0.5 * airK);
  });
}
