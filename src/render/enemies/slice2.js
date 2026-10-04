// Content slice 2 enemy rigs (docs/CONTENT_PLAN.md §3): Briar Wasp,
// Thornling, Weir Crab, Bog Lamprey, Grave Wisp, Bone Knight. Same grammar as
// render/enemies/archetypes.js: flat-faceted primitives, cool hides with a
// value structure, angular charcoal eyes, ink on the big masses, a contact
// shadow, and exactly ONE indigo corruption tell each.
//   wasp       a small striped flier with a long stinger and blurred wings,
//              hovering ~0.9 u up; indigo stinger tip. Tucks into the dart
//   thornling  a knee-high knot of bramble on two root legs; an indigo bud
//              crown that blooms as it roots to plant
//   crab       a wide, low shell on six legs with one oversized claw held up
//              in front (the guard); indigo claw rims. The claws drop to snap
//   lamprey    a long low eel with a round toothed mouth; indigo gill dots.
//              Submerged it is only a ripple ring
//   gravewisp  a hooded flame-shape with a trailing wisp tail, no body
//              beneath; its indigo core brightens while it wards
//   knight     an armoured skeleton behind a tall tower shield; an indigo
//              visor slit. The shield swings aside and the sword rises for
//              the overhead slam
// Faces +Z; the layer drives `pose({ t, walkPhase, moveK, telegraphK, fireK,
// e })` (`e` = the sim entity, READ ONLY).
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
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
  const g = shared('s2-eye', () => new BoxGeometry(1, 0.022, 0.022));
  const m = inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, m);
    eye.scale.x = len;
    eye.position.set(side * x, y, z);
    eye.rotation.set(0, side * -0.3, side * slant);
    parent.add(eye);
  }
}
const slate = (h, l) => new Color().setHSL(0.6, h, l);
// Local hides (same cool families as style.js HIDE).
const C = Object.freeze({
  wasp: slate(0.3, 0.3),
  waspBand: new Color(PALETTE.bone).multiplyScalar(0.7),
  briar: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.4).multiplyScalar(0.85),
  root: HIDE.boarDark.clone().multiplyScalar(0.9),
  crab: slate(0.32, 0.36).lerp(new Color(PALETTE.bruiseUmber), 0.3),
  crabDark: slate(0.36, 0.18),
  eel: slate(0.28, 0.24).lerp(new Color(PALETTE.sageCloak), 0.25),
  eelBelly: new Color(PALETTE.bone).multiplyScalar(0.62),
  wisp: slate(0.25, 0.7),
  bone: new Color(PALETTE.bone).multiplyScalar(0.8),
  iron: HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.25).multiplyScalar(0.75),
});
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

// ------------------------------------------------------------- WASP --
export function buildWasp() {
  const s = shell('wasp');
  const { rig, track } = s;
  const hover = new Group();
  hover.position.y = 0.9;
  rig.add(hover);
  const thorax = new Mesh(shared('wa-th', () => new IcosahedronGeometry(0.1, 0)), track(flashable(C.wasp)));
  addInk(thorax);
  hover.add(thorax);
  const abd = new Mesh(shared('wa-ab', () => new IcosahedronGeometry(0.12, 1)), track(flashable(C.waspBand)));
  abd.scale.set(0.8, 0.8, 1.5);
  abd.position.z = -0.2;
  addInk(abd);
  hover.add(abd);
  const band = new Mesh(shared('wa-band', () => new TorusGeometry(0.1, 0.025, 4, 10)), track(flashable(C.wasp)));
  band.position.z = -0.2;
  hover.add(band);
  const sting = new Mesh(shared('wa-st', () => new ConeGeometry(0.03, 0.16, 4)), tellMat());
  sting.rotation.x = -Math.PI / 2;
  sting.position.z = -0.42;
  hover.add(sting);
  const head = new Mesh(shared('wa-hd', () => new IcosahedronGeometry(0.075, 0)), track(flashable(C.wasp)));
  head.position.z = 0.13;
  hover.add(head);
  slitEyes(head, { x: 0.04, y: 0.02, z: 0.05, len: 0.05, slant: 0.5 });
  const wings = [];
  const wingG = shared('wa-wing', () => waspWing());
  for (const side of [-1, 1]) {
    const w = new Mesh(wingG, new MeshBasicMaterial({ color: new Color(PALETTE.parchment), transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    w.position.set(side * 0.12, 0.08, 0);
    hover.add(w);
    wings.push({ w, side });
  }
  s.group.add(groundShadow(0.18, 0.5));
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, telegraphK, e }) {
      const dart = e && e.mode === 'dart' ? 1 : 0;
      hover.position.y = 0.9 + 0.06 * Math.sin(t * 7 + (e ? e.id : 0)) - 0.25 * dart;
      hover.rotation.x = 0.4 * telegraphK + 0.5 * dart;
      abd.rotation.x = -0.5 * telegraphK;
      for (const { w, side } of wings) w.rotation.z = side * (0.3 + 0.5 * Math.sin(t * 60));
    },
  };
}
// A flat teardrop wing (built once).
function waspWing() {
  const g = new SphereGeometry(0.14, 6, 2);
  g.scale(1, 0.05, 0.55);
  g.translate(0.07, 0, 0);
  return g;
}

// --------------------------------------------------------- THORNLING --
export function buildThornling() {
  const s = shell('thornling');
  const { rig, track } = s;
  const body = new Mesh(shared('th-body', () => new IcosahedronGeometry(0.24, 0)), track(flashable(C.briar)));
  body.scale.set(1, 1.15, 0.9);
  body.position.y = 0.4;
  addInk(body);
  rig.add(body);
  const spikeG = shared('th-spike', () => new ConeGeometry(0.05, 0.24, 4));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sp = new Mesh(spikeG, track(flashable(C.briar)));
    sp.position.set(Math.cos(a) * 0.2, 0.42 + Math.sin(i * 1.7) * 0.12, Math.sin(a) * 0.18);
    sp.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
    rig.add(sp);
  }
  slitEyes(rig, { x: 0.07, y: 0.46, z: 0.21, len: 0.06, slant: 0.45 });
  const crown = new Group();
  crown.position.y = 0.7;
  rig.add(crown);
  const buds = [];
  for (let i = 0; i < 3; i++) {
    const b = new Mesh(shared('th-bud', () => new IcosahedronGeometry(0.05, 0)), tellMat());
    const a = (i / 3) * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07);
    crown.add(b);
    buds.push(b);
  }
  const cg = tellGlow(0.4, 0.2);
  crown.add(cg);
  const legs = [];
  for (const side of [-1, 1]) {
    const l = new Mesh(shared('th-leg', () => new CylinderGeometry(0.035, 0.05, 0.26, 4)), track(flashable(C.root)));
    l.position.set(side * 0.1, 0.13, 0);
    rig.add(l);
    legs.push(l);
  }
  s.group.add(groundShadow(0.28, 0.75));
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, e }) {
      const rooted = e && e.mode === 'root' ? 1 : 0;
      legs[0].rotation.x = Math.sin(walkPhase * 2) * 0.5 * moveK;
      legs[1].rotation.x = -Math.sin(walkPhase * 2) * 0.5 * moveK;
      rig.position.y = -0.06 * rooted;
      crown.scale.setScalar(1 + 0.9 * rooted + 0.08 * Math.sin(t * 3));
      for (let i = 0; i < buds.length; i++) buds[i].position.y = 0.04 * rooted * (1 + i * 0.3);
      cg.material.opacity = 0.18 + 0.3 * rooted;
    },
  };
}

// -------------------------------------------------------------- CRAB --
export function buildCrab() {
  const s = shell('crab');
  const { rig, track } = s;
  const carapace = new Mesh(shared('cb-shell', () => new IcosahedronGeometry(0.34, 1)), track(flashable(C.crab)));
  carapace.scale.set(1.35, 0.48, 1);
  carapace.position.y = 0.26;
  addInk(carapace);
  rig.add(carapace);
  slitEyes(rig, { x: 0.08, y: 0.38, z: 0.3, len: 0.06, slant: 0.3 });
  const legs = [];
  const legG = shared('cb-leg', () => new CylinderGeometry(0.025, 0.018, 0.34, 4).translate(0, -0.17, 0));
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const p = new Group();
      p.position.set(side * 0.38, 0.24, 0.12 - i * 0.16);
      rig.add(p);
      const l = new Mesh(legG, track(flashable(C.crabDark)));
      l.rotation.z = side * -0.9;
      p.add(l);
      legs.push({ p, phase: (i + (side > 0 ? 1 : 0)) % 2 });
    }
  }
  // The guard: two claws up in front, the right one oversized.
  const claws = [];
  for (const side of [-1, 1]) {
    const big = side > 0 ? 1.35 : 0.9;
    const arm = new Group();
    arm.position.set(side * 0.22, 0.34, 0.3);
    rig.add(arm);
    const claw = new Mesh(shared('cb-claw', () => new IcosahedronGeometry(0.15, 0)), track(flashable(C.crab)));
    claw.scale.set(0.8 * big, 1.1 * big, 0.55 * big);
    claw.position.set(0, 0.14, 0.12);
    addInk(claw);
    arm.add(claw);
    const rim = new Mesh(shared('cb-rim', () => new TorusGeometry(0.12, 0.016, 4, 10)), tellMat());
    rim.scale.setScalar(big);
    rim.position.set(0, 0.14, 0.2);
    arm.add(rim);
    claws.push(arm);
  }
  s.group.add(groundShadow(0.46, 0.8, { wide: 1.3 }));
  let lastSnap = -1;
  let snapAge = 9;
  let lastT = null;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.snapTick !== lastSnap && e.snapTick >= 0) {
        lastSnap = e.snapTick;
        snapAge = 0;
      }
      snapAge += dt;
      const k = snapAge < 0.25 ? Math.sin((snapAge / 0.25) * Math.PI) : 0;
      const open = e && e.guard && !e.guard.active ? 1 : 0;
      for (const l of legs) l.p.rotation.x = Math.sin(walkPhase * 3 + l.phase * Math.PI) * 0.4 * Math.max(moveK, 0.4);
      // Guard up: claws raised in front; wind-up: claws drawn back; snap: thrust.
      for (const c of claws) {
        c.rotation.x = -0.25 + 0.5 * telegraphK - 0.6 * open * (1 - k) - 0.9 * k;
        c.position.z = 0.3 - 0.12 * telegraphK + 0.18 * k;
      }
      carapace.rotation.z = 0.05 * Math.sin(walkPhase * 3) * moveK;
    },
  };
}

// ----------------------------------------------------------- LAMPREY --
export function buildLamprey() {
  const s = shell('lamprey');
  const { rig, track } = s;
  const segs = [];
  const segG = shared('lp-seg', () => new IcosahedronGeometry(0.16, 1));
  for (let i = 0; i < 5; i++) {
    const m = new Mesh(segG, track(flashable(i === 0 ? C.eel : C.eel)));
    const k = 1 - i * 0.13;
    m.scale.set(k, k * 0.8, 1.3);
    m.position.set(0, 0.16, 0.18 - i * 0.24);
    addInk(m);
    rig.add(m);
    segs.push(m);
  }
  const mouth = new Mesh(shared('lp-mouth', () => new TorusGeometry(0.1, 0.04, 5, 10)), track(flashable(C.eelBelly)));
  mouth.position.set(0, 0.16, 0.38);
  rig.add(mouth);
  const throat = new Mesh(shared('lp-throat', () => new CylinderGeometry(0.07, 0.07, 0.02, 10)), inkMat());
  throat.rotation.x = Math.PI / 2;
  throat.position.set(0, 0.16, 0.39);
  rig.add(throat);
  for (let i = 0; i < 4; i++) {
    const g = new Mesh(shared('lp-gill', () => new IcosahedronGeometry(0.022, 0)), tellMat());
    g.position.set(i % 2 ? 0.13 : -0.13, 0.2, 0.08 - Math.floor(i / 2) * 0.07);
    rig.add(g);
  }
  const ripple = new Mesh(
    shared('lp-ripple', () => new RingGeometry(0.4, 0.48, 28)),
    new MeshBasicMaterial({ color: new Color(PALETTE.bone).multiplyScalar(0.8), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  );
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.02;
  s.group.add(ripple);
  const shadow = groundShadow(0.34, 0.7, { deep: 1.8 });
  s.group.add(shadow);
  let sink = 1;
  let lastT = null;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const under = !!(e && e.burrowed);
      sink += ((under ? 1 : 0) - sink) * (1 - Math.exp(-9 * dt));
      rig.position.y = -0.45 * sink;
      rig.visible = sink < 0.95;
      shadow.visible = sink < 0.5;
      const ph = (t * 1.6) % 1;
      ripple.scale.setScalar(0.7 + 0.6 * ph);
      ripple.material.opacity = sink * 0.45 * (1 - ph);
      const flop = e && e.mode === 'beached' ? 1 : 0;
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.x = Math.sin(walkPhase * 1.5 - i * 0.9) * 0.08 * (moveK + flop * 2) + Math.sin(t * 11 - i) * 0.05 * flop;
        segs[i].position.y = 0.16 + 0.14 * telegraphK * (i === 0 ? 1 : 0.4 / i);
      }
      mouth.scale.setScalar(1 + 0.5 * telegraphK);
    },
  };
}

// --------------------------------------------------------- GRAVE WISP --
export function buildGravewisp() {
  const s = shell('gravewisp');
  const { rig, track } = s;
  const hover = new Group();
  hover.position.y = 1.0;
  rig.add(hover);
  const hood = new Mesh(shared('gw-hood', () => new ConeGeometry(0.2, 0.5, 6, 1, true)), track(flashable(C.wisp)));
  hood.position.y = 0.05;
  hover.add(hood);
  const tail = new Mesh(shared('gw-tail', () => new ConeGeometry(0.12, 0.55, 5)), new MeshBasicMaterial({ color: C.wisp, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }));
  tail.rotation.x = Math.PI;
  tail.position.y = -0.38;
  hover.add(tail);
  const core = new Mesh(shared('gw-core', () => new SphereGeometry(0.08, 8, 6)), tellMat());
  core.position.set(0, -0.02, 0.06);
  hover.add(core);
  const cg = tellGlow(0.7, 0.35);
  cg.position.copy(core.position);
  hover.add(cg);
  slitEyes(hover, { x: 0.05, y: 0.08, z: 0.15, len: 0.05, slant: 0.5 });
  s.group.add(groundShadow(0.2, 0.4));
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, e }) {
      const warding = e && e.tetherId != null ? 1 : 0;
      hover.position.y = 1.0 + 0.08 * Math.sin(t * 2.2 + (e ? e.id : 0));
      tail.rotation.z = Math.sin(t * 3.1) * 0.25;
      core.scale.setScalar(1 + 0.6 * warding + 0.1 * Math.sin(t * 5));
      cg.material.opacity = 0.3 + 0.35 * warding;
    },
  };
}

// ------------------------------------------------------------ KNIGHT --
export function buildKnight() {
  const s = shell('knight');
  const { rig, track } = s;
  const iron = track(flashable(C.iron));
  const bone = track(flashable(C.bone));
  const torso = new Mesh(shared('kn-torso', () => new BoxGeometry(0.42, 0.5, 0.28)), iron);
  torso.position.y = 0.82;
  addInk(torso);
  rig.add(torso);
  const helm = new Mesh(shared('kn-helm', () => new CylinderGeometry(0.15, 0.17, 0.26, 6)), iron);
  helm.position.y = 1.22;
  addInk(helm);
  rig.add(helm);
  const visor = new Mesh(shared('kn-visor', () => new BoxGeometry(0.2, 0.03, 0.02)), tellMat());
  visor.position.set(0, 1.24, 0.16);
  rig.add(visor);
  const vg = tellGlow(0.35, 0.3);
  vg.position.copy(visor.position);
  rig.add(vg);
  const legs = [];
  for (const side of [-1, 1]) {
    const l = new Mesh(shared('kn-leg', () => new CylinderGeometry(0.06, 0.05, 0.56, 5)), bone);
    l.position.set(side * 0.12, 0.29, 0);
    rig.add(l);
    legs.push(l);
  }
  // Tower shield on the left arm, sword on the right.
  const shieldArm = new Group();
  shieldArm.position.set(-0.18, 0.85, 0.22);
  rig.add(shieldArm);
  const shield = new Mesh(shared('kn-shield', () => new BoxGeometry(0.55, 0.82, 0.07)), iron);
  shield.position.set(0.12, -0.08, 0.06);
  addInk(shield);
  shieldArm.add(shield);
  const boss = new Mesh(shared('kn-boss', () => new IcosahedronGeometry(0.06, 0)), bone);
  boss.position.set(0.12, -0.04, 0.11);
  shieldArm.add(boss);
  const swordArm = new Group();
  swordArm.position.set(0.25, 1.0, 0.05);
  rig.add(swordArm);
  const blade = new Mesh(shared('kn-blade', () => new BoxGeometry(0.06, 0.8, 0.02)), bone);
  blade.position.y = 0.42;
  addInk(blade);
  swordArm.add(blade);
  s.group.add(groundShadow(0.5, 0.85));
  let lastSlam = -1;
  let slamAge = 9;
  let lastT = null;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      if (e && e.slamTick !== lastSlam && e.slamTick >= 0) {
        lastSlam = e.slamTick;
        slamAge = 0;
      }
      slamAge += dt;
      const k = slamAge < 0.3 ? 1 - slamAge / 0.3 : 0;
      const open = e && e.guard && !e.guard.active ? 1 : 0;
      legs[0].rotation.x = Math.sin(walkPhase * 2) * 0.35 * moveK;
      legs[1].rotation.x = -Math.sin(walkPhase * 2) * 0.35 * moveK;
      // Guard: shield square in front; open: swung out to the side.
      shieldArm.rotation.y = 0.9 * open;
      shieldArm.position.x = -0.18 - 0.12 * open;
      // Wind-up: the sword rises overhead; the slam brings it down.
      swordArm.rotation.x = -2.6 * telegraphK + 1.2 * k;
      torso.rotation.x = -0.12 * telegraphK + 0.2 * k;
      vg.material.opacity = 0.28 + 0.3 * telegraphK;
    },
  };
}
