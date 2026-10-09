// CHAMPIONS (docs/CHAMPIONS.md): the four champion rigs and what makes each
// one THE champion of its room. Same grammar as the other enemy rigs
// (render/enemies/slice2.js): flat-faceted primitives, cool hides with a value
// structure, ink on the big masses, a contact shadow, ONE indigo corruption
// tell each. What sets a champion apart is its size (about twice a heavy's
// height) and Pale Gold, the colour of what it guards: a crown over its head,
// a turning sigil under its feet, and the chest it leaves behind.
//
//   briar_knight   a knight grown out of the Wood: bark plates on root legs,
//                  a thorn-crested helm, a long briar lance and a moss cape.
//                  Bramble Charge: lance couched low, body cocked back.
//                  Thorn Ring: lance raised high to plant
//   sluice_warden  a hulking weir-keeper: a sluice-gate shield banded in
//                  iron and a millstone maul, a grated visor, water dripping.
//                  Floodgate: the gate thrust up and forward. Undertow: the
//                  maul raised overhead
//   bone_reeve     a tall cowled skeleton with a grave scythe and a bone
//                  lantern. Reaping Sweep: scythe drawn back to the side.
//                  Grave Lance: scythe raised, then driven into the floor
//   hollow_choir   three hollow choristers fused round a violet heart,
//                  floating; a halo of crystal. Discord: the singers spread.
//                  Shard Hymn: they turn as one and the heart brightens
//
// Faces +Z; the enemy layer drives pose({ t, walkPhase, moveK, telegraphK,
// fireK, e }) (e = the sim entity, READ ONLY). createChampionFx() is the
// presence layer the enemy layer mounts beside the rigs (render-only: it
// reads entities and events, never writes the sim).
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { markShared, sharedGeo, releaseTree } from '../geocache.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';
import { impactFx } from '../vfx/hub.js';

const flashable = (color) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0 });
const inkMat = () => new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
const tellMat = () => new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
const glowMat = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
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
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const GOLD = PALETTE.paleGold;
const GOLD_HOT = mix(PALETTE.paleGold, PALETTE.parchment, 0.55);
const HEARTV = '#9B6BE0';
// Local hides (the same cool families as style.js HIDE).
const C = Object.freeze({
  bark: HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.45).multiplyScalar(0.95),
  barkDark: HIDE.boarDark.clone().multiplyScalar(0.8),
  moss: new Color(PALETTE.sageCloak).lerp(new Color(PALETTE.signalBlue), 0.25).multiplyScalar(0.9),
  thorn: new Color(PALETTE.bone).lerp(new Color(PALETTE.sageCloak), 0.35).multiplyScalar(0.75),
  plank: slate(0.18, 0.34).lerp(new Color(PALETTE.bruiseUmber), 0.45),
  iron: HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.8),
  wardenHide: slate(0.3, 0.36),
  wardenDark: slate(0.34, 0.2),
  stone: new Color(PALETTE.warmGrey).lerp(new Color(PALETTE.signalBlue), 0.15).multiplyScalar(0.85),
  bone: new Color(PALETTE.bone).multiplyScalar(0.82),
  boneDark: new Color(PALETTE.bone).lerp(new Color(PALETTE.voidCharcoal), 0.45),
  cowl: slate(0.2, 0.17),
  choir: new Color(PALETTE.bone).lerp(new Color(PALETTE.godstuffViolet), 0.35).multiplyScalar(0.78),
  choirDark: slate(0.28, 0.16).lerp(new Color(PALETTE.godstuffViolet), 0.25),
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
function slitEyes(parent, { x = 0.08, y = 0, z = 0.12, len = 0.1, slant = 0.35, mat = null } = {}) {
  const g = shared('ch-eye', () => new BoxGeometry(1, 0.03, 0.03));
  const m = mat ?? inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, m);
    eye.scale.x = len;
    eye.position.set(side * x, y, z);
    eye.rotation.set(0, side * -0.3, side * slant);
    parent.add(eye);
  }
}
// A strike clip: 1 at the frame the move landed, easing to 0 over `dur` s.
function clip() {
  let last = -1;
  let age = 9;
  let lastT = null;
  return (t, moveTick, dur = 0.35) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    if (moveTick !== last && moveTick >= 0) {
      last = moveTick;
      age = 0;
    }
    age += dt;
    return age < dur ? 1 - age / dur : 0;
  };
}
const moving = (e, id) => !!(e && e.telegraph && e.telegraph.move === id);

// ------------------------------------------------------- BRIAR KNIGHT --
export function buildBriarKnight() {
  const s = shell('briar_knight');
  const { rig, track } = s;
  const bark = track(flashable(C.bark));
  const dark = track(flashable(C.barkDark));
  const moss = track(flashable(C.moss));
  const thorn = track(flashable(C.thorn));
  const body = new Group();
  rig.add(body);
  // Root legs: two twisted trunks splaying into toes.
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new Group();
    leg.position.set(side * 0.22, 0.86, 0);
    const shin = new Mesh(shared('bk-shin', () => new CylinderGeometry(0.1, 0.14, 0.86, 6).translate(0, -0.43, 0)), dark);
    addInk(shin);
    leg.add(shin);
    for (const a of [-0.5, 0.1, 0.7]) {
      const toe = new Mesh(shared('bk-toe', () => new ConeGeometry(0.05, 0.36, 4).rotateX(Math.PI / 2).translate(0, 0, 0.16)), dark);
      toe.position.set(0, -0.84, 0);
      toe.rotation.y = a;
      leg.add(toe);
    }
    rig.add(leg);
    legs.push(leg);
  }
  // The trunk: stacked bark plates, wider at the chest.
  const hip = new Mesh(shared('bk-hip', () => new CylinderGeometry(0.34, 0.28, 0.32, 7)), dark);
  hip.position.y = 0.98;
  addInk(hip);
  body.add(hip);
  const chest = new Mesh(shared('bk-chest', () => new CylinderGeometry(0.46, 0.34, 0.62, 7)), bark);
  chest.position.y = 1.42;
  addInk(chest);
  body.add(chest);
  for (let i = 0; i < 5; i++) {
    const plate = new Mesh(shared('bk-plate', () => new BoxGeometry(0.22, 0.34, 0.06)), dark);
    const a = -0.9 + i * 0.45;
    plate.position.set(Math.sin(a) * 0.42, 1.44, Math.cos(a) * 0.42);
    plate.rotation.y = a;
    body.add(plate);
  }
  // Pauldrons sprouting thorns.
  for (const side of [-1, 1]) {
    const p = new Mesh(shared('bk-paul', () => new IcosahedronGeometry(0.2, 0)), bark);
    p.scale.set(1.2, 0.8, 1);
    p.position.set(side * 0.52, 1.7, 0);
    addInk(p);
    body.add(p);
    for (let k = 0; k < 3; k++) {
      const th = new Mesh(shared('bk-thorn', () => new ConeGeometry(0.035, 0.22, 4)), thorn);
      th.position.set(side * (0.56 + k * 0.05), 1.86, -0.08 + k * 0.08);
      th.rotation.z = -side * (0.5 + k * 0.2);
      body.add(th);
    }
  }
  // Helm with a crest of antler thorns; the indigo slit.
  const head = new Group();
  head.position.y = 1.98;
  body.add(head);
  const helm = new Mesh(shared('bk-helm', () => new CylinderGeometry(0.17, 0.21, 0.38, 6)), dark);
  addInk(helm);
  head.add(helm);
  for (let k = 0; k < 5; k++) {
    const a = -0.8 + k * 0.4;
    const th = new Mesh(shared('bk-crest', () => new ConeGeometry(0.04, 0.42, 4).translate(0, 0.21, 0)), thorn);
    th.position.set(Math.sin(a) * 0.12, 0.16, -Math.cos(a) * 0.05);
    th.rotation.set(-0.35, 0, -a * 0.7);
    head.add(th);
  }
  const visor = new Mesh(shared('bk-visor', () => new BoxGeometry(0.24, 0.035, 0.02)), tellMat());
  visor.position.set(0, 0.02, 0.2);
  head.add(visor);
  const vg = tellGlow(0.45, 0.32);
  vg.position.set(0, 0.02, 0.22);
  head.add(vg);
  // Moss cape: two hanging panels behind.
  const cape = new Group();
  cape.position.set(0, 1.76, -0.32);
  body.add(cape);
  for (const side of [-1, 1]) {
    const panel = new Mesh(shared('bk-cape', () => new PlaneGeometry(0.42, 1.3, 1, 3).translate(0, -0.65, 0)), moss);
    panel.material.side = DoubleSide;
    panel.position.x = side * 0.2;
    panel.rotation.set(0.12, side * 0.14, 0);
    cape.add(panel);
  }
  // Briar lance (right) and a thorn buckler (left).
  const lanceArm = new Group();
  lanceArm.position.set(0.55, 1.6, 0.05);
  body.add(lanceArm);
  const shaft = new Mesh(shared('bk-shaft', () => new CylinderGeometry(0.045, 0.06, 2.1, 6).translate(0, 0.6, 0)), dark);
  addInk(shaft);
  lanceArm.add(shaft);
  const tip = new Mesh(shared('bk-tip', () => new ConeGeometry(0.11, 0.62, 5).translate(0, 1.95, 0)), thorn);
  addInk(tip);
  lanceArm.add(tip);
  for (let k = 0; k < 4; k++) {
    const b = new Mesh(shared('bk-barb', () => new ConeGeometry(0.03, 0.18, 4)), thorn);
    b.position.set(k % 2 ? 0.05 : -0.05, 0.4 + k * 0.32, 0);
    b.rotation.z = k % 2 ? -1 : 1;
    lanceArm.add(b);
  }
  const shieldArm = new Group();
  shieldArm.position.set(-0.56, 1.42, 0.18);
  body.add(shieldArm);
  const buckler = new Mesh(shared('bk-buck', () => new CylinderGeometry(0.34, 0.34, 0.08, 7).rotateX(Math.PI / 2)), bark);
  addInk(buckler);
  shieldArm.add(buckler);
  const boss = new Mesh(shared('bk-boss', () => new ConeGeometry(0.09, 0.26, 5).rotateX(Math.PI / 2).translate(0, 0, 0.14)), thorn);
  shieldArm.add(boss);
  s.group.add(groundShadow(0.75, 0.8));
  const strike = clip();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const k = strike(t, e ? e.moveTick : -1, 0.4);
      const charging = !!(e && e.charge);
      const couch = moving(e, 'bramble_charge') ? telegraphK : 0;
      const raise = moving(e, 'thorn_ring') ? telegraphK : 0;
      const sw = Math.sin(walkPhase * 1.6) * 0.4 * moveK;
      legs[0].rotation.x = sw + (charging ? 0.5 : 0);
      legs[1].rotation.x = -sw - (charging ? 0.4 : 0);
      // Couched: lance level and forward, body cocked back, then thrown in.
      lanceArm.rotation.x = 1.45 * Math.max(couch, charging ? 1 : 0) - 2.6 * raise + (e && e.lastMove === 'thorn_ring' ? 2.6 * k : 0);
      body.rotation.x = -0.22 * couch + (charging ? 0.32 : 0) + (e && e.lastMove === 'thorn_ring' ? 0.25 * k : 0);
      body.position.y = -0.08 * couch - 0.06 * raise;
      shieldArm.rotation.y = 0.5 * raise;
      cape.rotation.x = 0.12 + (charging ? 0.7 : 0) + Math.sin(t * 2.1) * 0.05 + 0.25 * moveK;
      head.rotation.x = 0.15 * couch;
      vg.material.opacity = 0.28 + 0.4 * Math.max(couch, raise) + (e && e.rage ? 0.15 + 0.1 * Math.sin(t * 9) : 0);
      // Breathing.
      chest.scale.set(1, 1 + 0.02 * Math.sin(t * 2.4), 1);
    },
  };
}

// ------------------------------------------------------- SLUICE WARDEN --
export function buildSluiceWarden() {
  const s = shell('sluice_warden');
  const { rig, track } = s;
  const hide = track(flashable(C.wardenHide));
  const dark = track(flashable(C.wardenDark));
  const plank = track(flashable(C.plank));
  const iron = track(flashable(C.iron));
  const stone = track(flashable(C.stone));
  const body = new Group();
  rig.add(body);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new Mesh(shared('sw-leg', () => new CylinderGeometry(0.16, 0.2, 0.78, 6).translate(0, -0.39, 0)), dark);
    leg.position.set(side * 0.34, 0.78, 0);
    addInk(leg);
    rig.add(leg);
    legs.push(leg);
  }
  // A barrel of a body, hunched forward.
  const gut = new Mesh(shared('sw-gut', () => new SphereGeometry(0.62, 9, 7)), hide);
  gut.scale.set(1.15, 0.9, 0.95);
  gut.position.y = 1.2;
  addInk(gut);
  body.add(gut);
  const back = new Mesh(shared('sw-back', () => new SphereGeometry(0.5, 8, 6)), dark);
  back.scale.set(1.3, 0.75, 0.9);
  back.position.set(0, 1.62, -0.18);
  addInk(back);
  body.add(back);
  // Iron hoops round the gut (the weir's bands).
  for (const y of [1.0, 1.36]) {
    const hoop = new Mesh(shared('sw-hoop', () => new TorusGeometry(0.66, 0.035, 4, 18).rotateX(Math.PI / 2)), iron);
    hoop.position.y = y;
    hoop.scale.set(1.1, 1, 0.95);
    body.add(hoop);
  }
  // Small head under a grated visor.
  const head = new Group();
  head.position.set(0, 1.86, 0.3);
  body.add(head);
  const skull = new Mesh(shared('sw-head', () => new BoxGeometry(0.34, 0.3, 0.32)), dark);
  addInk(skull);
  head.add(skull);
  for (let i = 0; i < 4; i++) {
    const bar = new Mesh(shared('sw-bar', () => new BoxGeometry(0.03, 0.3, 0.03)), iron);
    bar.position.set(-0.11 + i * 0.075, 0, 0.17);
    head.add(bar);
  }
  const eye = new Mesh(shared('sw-eye', () => new BoxGeometry(0.22, 0.04, 0.02)), tellMat());
  eye.position.set(0, 0.02, 0.165);
  head.add(eye);
  const eg = tellGlow(0.5, 0.3);
  eg.position.set(0, 0.02, 0.2);
  head.add(eg);
  // The sluice-gate shield (left): planks in an iron frame.
  const gateArm = new Group();
  gateArm.position.set(-0.78, 1.4, 0.28);
  body.add(gateArm);
  const gate = new Group();
  gate.position.set(0.05, -0.18, 0.12);
  gateArm.add(gate);
  for (let i = 0; i < 4; i++) {
    const p = new Mesh(shared('sw-plank', () => new BoxGeometry(0.26, 1.2, 0.08)), plank);
    p.position.x = -0.39 + i * 0.26;
    addInk(p);
    gate.add(p);
  }
  for (const y of [-0.42, 0.42]) {
    const band = new Mesh(shared('sw-band', () => new BoxGeometry(1.1, 0.1, 0.12)), iron);
    band.position.y = y;
    gate.add(band);
  }
  gate.position.x = -0.1;
  gate.scale.setScalar(0.95);
  // The millstone maul (right).
  const maulArm = new Group();
  maulArm.position.set(0.78, 1.5, 0.05);
  body.add(maulArm);
  const haft = new Mesh(shared('sw-haft', () => new CylinderGeometry(0.05, 0.06, 1.4, 6).translate(0, -0.55, 0)), iron);
  maulArm.add(haft);
  const stoneHead = new Mesh(shared('sw-stone', () => new CylinderGeometry(0.42, 0.42, 0.24, 10).rotateZ(Math.PI / 2).translate(0, -1.25, 0)), stone);
  addInk(stoneHead);
  maulArm.add(stoneHead);
  const hole = new Mesh(shared('sw-hole', () => new CylinderGeometry(0.09, 0.09, 0.26, 6).rotateZ(Math.PI / 2).translate(0, -1.25, 0)), inkMat());
  maulArm.add(hole);
  // Drips off the gate (pale water beads, bobbing).
  const dripMat = new MeshBasicMaterial({ color: new Color(PALETTE.parchment).lerp(new Color(PALETTE.signalBlue), 0.45), transparent: true, opacity: 0.8, toneMapped: false });
  const drips = [];
  for (let i = 0; i < 4; i++) {
    const d = new Mesh(shared('sw-drip', () => new SphereGeometry(0.035, 5, 4)), dripMat);
    d.scale.y = 1.6;
    gate.add(d);
    drips.push({ m: d, x: -0.4 + i * 0.27, ph: i * 0.7 });
  }
  s.group.add(groundShadow(0.9, 0.85));
  const strike = clip();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const k = strike(t, e ? e.moveTick : -1, 0.45);
      const gateK = moving(e, 'floodgate') ? telegraphK : 0;
      const maulK = moving(e, 'undertow') ? telegraphK : 0;
      const last = e ? e.lastMove : null;
      const sw = Math.sin(walkPhase * 1.3) * 0.3 * moveK;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      body.rotation.z = Math.sin(walkPhase * 1.3) * 0.05 * moveK;
      // Floodgate: the gate rises and comes forward, then slams down.
      gateArm.rotation.x = -1.1 * gateK + (last === 'floodgate' ? 0.6 * k : 0);
      gateArm.position.z = 0.28 + 0.4 * gateK;
      gateArm.rotation.y = 0.9 * gateK;
      // Undertow: the maul rises overhead, then comes down.
      maulArm.rotation.x = -2.9 * maulK + (last === 'undertow' ? 2.6 * k - 0.4 * k * k : 0);
      maulArm.rotation.z = 0.25 * maulK;
      body.rotation.x = 0.18 + 0.1 * maulK - 0.15 * gateK + (k > 0 ? 0.2 * k : 0);
      head.rotation.y = 0.06 * Math.sin(t * 0.9);
      eg.material.opacity = 0.26 + 0.4 * Math.max(gateK, maulK) + (e && e.rage ? 0.2 : 0);
      gut.scale.set(1.15, 0.9 + 0.025 * Math.sin(t * 1.8), 0.95);
      for (const d of drips) {
        const p = (t * 0.8 + d.ph) % 1;
        d.m.position.set(d.x, -0.62 - p * 0.55, 0.06);
        d.m.material.opacity = 0.8 * (1 - p);
      }
    },
  };
}

// ---------------------------------------------------------- BONE REEVE --
export function buildBoneReeve() {
  const s = shell('bone_reeve');
  const { rig, track } = s;
  const bone = track(flashable(C.bone));
  const dark = track(flashable(C.boneDark));
  const cowl = track(flashable(C.cowl));
  const body = new Group();
  rig.add(body);
  // Robe skirt: a tattered cone (no legs show; it glides and strides).
  const robe = new Mesh(shared('br-robe', () => new ConeGeometry(0.55, 1.5, 8, 1, true).translate(0, 0.75, 0)), cowl);
  robe.material.side = DoubleSide;
  addInk(robe);
  body.add(robe);
  const hem = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = new Mesh(shared('br-rag', () => new ConeGeometry(0.1, 0.34, 3).rotateX(Math.PI)), cowl);
    r.position.set(Math.cos(a) * 0.5, 0.12, Math.sin(a) * 0.5);
    body.add(r);
    hem.push(r);
  }
  // Ribcage and spine above the robe.
  const spine = new Mesh(shared('br-spine', () => new CylinderGeometry(0.05, 0.06, 0.9, 5)), bone);
  spine.position.y = 1.8;
  body.add(spine);
  for (let i = 0; i < 4; i++) {
    const rib = new Mesh(shared('br-rib', () => new TorusGeometry(0.26, 0.03, 4, 10, Math.PI * 1.3).rotateX(Math.PI / 2).rotateY(Math.PI * 0.85)), bone);
    rib.position.y = 1.62 + i * 0.16;
    rib.scale.setScalar(1 - i * 0.08);
    body.add(rib);
  }
  const shoulders = new Mesh(shared('br-sh', () => new BoxGeometry(0.86, 0.1, 0.16)), bone);
  shoulders.position.y = 2.25;
  addInk(shoulders);
  body.add(shoulders);
  // Cowl and skull; a lantern of bone at the belt.
  const head = new Group();
  head.position.y = 2.5;
  body.add(head);
  const hood = new Mesh(shared('br-hood', () => new ConeGeometry(0.28, 0.6, 6, 1, true).translate(0, 0.08, -0.03)), cowl);
  hood.material.side = DoubleSide;
  addInk(hood);
  head.add(hood);
  const skull = new Mesh(shared('br-skull', () => new SphereGeometry(0.16, 7, 6)), bone);
  skull.scale.set(0.9, 1.05, 1);
  skull.position.set(0, -0.04, 0.04);
  head.add(skull);
  const jaw = new Mesh(shared('br-jaw', () => new BoxGeometry(0.16, 0.06, 0.12)), dark);
  jaw.position.set(0, -0.17, 0.08);
  head.add(jaw);
  slitEyes(head, { x: 0.06, y: -0.02, z: 0.17, len: 0.06, slant: 0.2, mat: tellMat() });
  const eg = tellGlow(0.4, 0.34);
  eg.position.set(0, -0.02, 0.2);
  head.add(eg);
  // Scythe (both hands, carried diagonally).
  const scytheArm = new Group();
  scytheArm.position.set(0.42, 2.05, 0.12);
  body.add(scytheArm);
  const pole = new Mesh(shared('br-pole', () => new CylinderGeometry(0.035, 0.045, 2.6, 5).translate(0, 0.2, 0)), dark);
  addInk(pole);
  scytheArm.add(pole);
  const blade = new Mesh(
    shared('br-blade', () => new TorusGeometry(0.62, 0.05, 3, 14, Math.PI * 0.7).rotateY(Math.PI / 2).scale(1, 1, 0.35).translate(0, 1.2, 0.5)),
    bone
  );
  addInk(blade);
  scytheArm.add(blade);
  scytheArm.rotation.z = -0.45;
  for (const side of [-1, 1]) {
    const arm = new Mesh(shared('br-arm', () => new CylinderGeometry(0.03, 0.03, 0.62, 4).translate(0, -0.31, 0)), bone);
    arm.position.set(side * 0.42, 2.25, 0);
    arm.rotation.set(-0.7, 0, side * 0.25);
    body.add(arm);
  }
  const lantern = new Group();
  lantern.position.set(-0.36, 1.32, 0.12);
  body.add(lantern);
  const cage = new Mesh(shared('br-lant', () => new OctahedronGeometry(0.12, 0)), bone);
  cage.scale.y = 1.4;
  lantern.add(cage);
  const flame = makeGlowSprite({ color: TELL_INDIGO_GLOW, size: 0.5, opacity: 0.55 });
  flame.material.toneMapped = false;
  flame.material.color.copy(TELL_INDIGO_GLOW);
  lantern.add(flame);
  s.group.add(groundShadow(0.7, 0.8));
  const strike = clip();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase, moveK, telegraphK, e }) {
      const k = strike(t, e ? e.moveTick : -1, 0.4);
      const sweepK = moving(e, 'reaping_sweep') ? telegraphK : 0;
      const lanceK = moving(e, 'grave_lance') ? telegraphK : 0;
      const last = e ? e.lastMove : null;
      // It glides: a slow bob and a sway in place of steps.
      body.position.y = 0.04 * Math.sin(walkPhase * 1.2) * moveK + 0.03 * Math.sin(t * 1.4);
      body.rotation.z = 0.05 * Math.sin(walkPhase * 0.6) * moveK;
      for (let i = 0; i < hem.length; i++) hem[i].rotation.x = Math.PI + 0.25 * Math.sin(t * 3 + i) * (0.4 + moveK);
      // Reaping Sweep: drawn back across the body, then a full swing.
      const swing = last === 'reaping_sweep' ? k : 0;
      // (the swing carries the blade from the drawn-back side across the front)
      scytheArm.rotation.y = 1.4 * sweepK - 1.4 * swing;
      // Grave Lance: raised high, then driven down into the floor.
      const drive = last === 'grave_lance' ? k : 0;
      scytheArm.rotation.x = -1.1 * lanceK + 1.0 * drive;
      scytheArm.rotation.z = -0.45 + 0.35 * lanceK;
      body.rotation.y = 0.35 * sweepK - 0.5 * swing;
      body.rotation.x = 0.12 * lanceK + 0.22 * drive;
      head.rotation.x = -0.1 * lanceK;
      jaw.position.y = -0.17 - 0.05 * Math.max(sweepK, lanceK);
      eg.material.opacity = 0.3 + 0.4 * Math.max(sweepK, lanceK) + (e && e.rage ? 0.2 : 0);
      flame.material.opacity = 0.45 + 0.15 * Math.sin(t * 7.3) + 0.2 * Math.max(sweepK, lanceK);
      lantern.rotation.z = 0.2 * Math.sin(t * 1.7);
    },
  };
}

// -------------------------------------------------------- HOLLOW CHOIR --
export function buildHollowChoir() {
  const s = shell('hollow_choir');
  const { rig, track } = s;
  const robe = track(flashable(C.choir));
  const dark = track(flashable(C.choirDark));
  const heartMat = glowMat(HEARTV);
  const crystal = glowMat(mix(PALETTE.godstuffViolet, PALETTE.parchment, 0.45));
  const float = new Group();
  float.position.y = 0.55;
  rig.add(float);
  // The heart: a faceted violet core in a cage of bone-white ribs.
  const heart = new Mesh(shared('hc-heart', () => new IcosahedronGeometry(0.28, 1)), heartMat);
  heart.position.y = 1.15;
  float.add(heart);
  const heartGlow = makeGlowSprite({ color: HEARTV, size: 1.7, opacity: 0.55 });
  heartGlow.material.toneMapped = false;
  heartGlow.position.y = 1.15;
  float.add(heartGlow);
  // Three choristers, back to the heart, mouths open.
  const singers = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const g = new Group();
    g.rotation.y = a;
    float.add(g);
    const inner = new Group();
    inner.position.z = 0.42;
    g.add(inner);
    const gown = new Mesh(shared('hc-gown', () => new ConeGeometry(0.28, 1.4, 6, 1, true).translate(0, 0.7, 0)), robe);
    gown.material.side = DoubleSide;
    addInk(gown);
    inner.add(gown);
    const hd = new Mesh(shared('hc-head', () => new SphereGeometry(0.15, 7, 6)), dark);
    hd.position.y = 1.62;
    hd.scale.set(0.9, 1.15, 0.9);
    addInk(hd);
    inner.add(hd);
    const mouth = new Mesh(shared('hc-mouth', () => new CircleGeometry(0.055, 8)), heartMat);
    mouth.position.set(0, 1.56, 0.14);
    inner.add(mouth);
    slitEyes(hd, { x: 0.05, y: 0.04, z: 0.13, len: 0.05, slant: -0.3 });
    // Arms raised as if to conduct.
    for (const side of [-1, 1]) {
      const arm = new Mesh(shared('hc-arm', () => new CylinderGeometry(0.025, 0.03, 0.6, 4).translate(0, 0.3, 0)), dark);
      arm.position.set(side * 0.16, 1.3, 0.04);
      arm.rotation.set(0.4, 0, side * 0.6);
      inner.add(arm);
    }
    singers.push({ g, inner, mouth });
  }
  // Crystal halo over the whole.
  const halo = new Group();
  halo.position.y = 2.05;
  float.add(halo);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const c = new Mesh(shared('hc-crys', () => new OctahedronGeometry(0.09, 0)), crystal);
    c.scale.y = 2.2;
    c.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
    halo.add(c);
  }
  const tell = tellGlow(0.6, 0.28);
  tell.position.y = 1.15;
  float.add(tell);
  s.group.add(groundShadow(0.85, 0.55));
  const strike = clip();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, moveK, telegraphK, e }) {
      const k = strike(t, e ? e.moveTick : -1, 0.5);
      const ringK = moving(e, 'discord') ? telegraphK : 0;
      const hymnK = moving(e, 'shard_hymn') ? telegraphK : 0;
      const last = e ? e.lastMove : null;
      float.position.y = 0.55 + 0.1 * Math.sin(t * 1.6);
      // Discord: the singers spread out from the heart, then snap back.
      const spread = 0.42 + 0.35 * ringK + (last === 'discord' ? 0.5 * k : 0);
      // The Hymn: they turn to face forward together.
      singers.forEach((sg, i) => {
        sg.inner.position.z = spread;
        const base = (i / 3) * Math.PI * 2 + t * 0.35 * (1 - hymnK);
        sg.g.rotation.y = base * (1 - hymnK) + (i - 1) * 0.35 * hymnK;
        sg.inner.rotation.x = -0.25 * hymnK + 0.1 * Math.sin(t * 2 + i);
        sg.mouth.scale.setScalar(1 + 0.8 * Math.max(ringK, hymnK) + 0.6 * k);
      });
      const beat = 0.5 + 0.5 * Math.sin(t * (e && e.rage ? 7 : 4.2));
      heart.scale.setScalar(1 + 0.08 * beat + 0.25 * Math.max(ringK, hymnK) + 0.3 * k);
      heartGlow.material.opacity = 0.45 + 0.2 * beat + 0.35 * Math.max(ringK, hymnK);
      halo.rotation.y = t * 0.6 + hymnK * 2;
      halo.scale.setScalar(1 + 0.3 * ringK);
      tell.material.opacity = 0.25 + 0.3 * Math.max(ringK, hymnK);
      float.rotation.x = 0.05 * moveK;
    },
  };
}

export const CHAMPION_BUILDERS = Object.freeze({
  briar_knight: buildBriarKnight,
  sluice_warden: buildSluiceWarden,
  bone_reeve: buildBoneReeve,
  hollow_choir: buildHollowChoir,
});
// Crown height per champion (world u above the ground).
export const CHAMPION_CROWN_Y = Object.freeze({ briar_knight: 2.75, sluice_warden: 2.45, bone_reeve: 3.05, hollow_choir: 3.05 });

// ------------------------------------------------------------ presence --
const flat = (color, opacity) =>
  new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
const soft = (color, opacity) =>
  new MeshBasicMaterial({ map: getRadialTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const onGround = (mesh, y) => {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = 3;
  return mesh;
};
const RAGE = mix(PALETTE.emberDanger, PALETTE.godstuffViolet, 0.35);

// The crown: a gold band of five points with a gem, turning slowly.
function buildCrown() {
  const g = new Group();
  const gold = new MeshBasicMaterial({ color: exactColor(GOLD), toneMapped: false });
  const band = new Mesh(sharedGeo('ch-crown-band', () => new CylinderGeometry(0.2, 0.17, 0.1, 10, 1, true)), gold);
  band.material.side = DoubleSide;
  g.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new Mesh(sharedGeo('ch-crown-pt', () => new ConeGeometry(0.05, 0.2, 4)), gold);
    p.position.set(Math.cos(a) * 0.19, 0.14, Math.sin(a) * 0.19);
    g.add(p);
  }
  const gem = new Mesh(sharedGeo('ch-crown-gem', () => new OctahedronGeometry(0.06, 0)), new MeshBasicMaterial({ color: new Color(GOLD_HOT), toneMapped: false }));
  gem.position.y = 0.04;
  gem.position.z = 0.2;
  g.add(gem);
  const glow = makeGlowSprite({ color: GOLD, size: 1.0, opacity: 0.45 });
  glow.material.toneMapped = false;
  g.add(glow);
  return { g, glow };
}
// The sigil under its feet: two gold rings, eight ticks, a soft pool.
function buildSigil(r) {
  const g = new Group();
  const ringMat = flat(GOLD, 0.55);
  const outer = onGround(new Mesh(sharedGeo('ch-sig-out', () => new RingGeometry(0.92, 1.0, 64)), ringMat), 0.032);
  const inner = onGround(new Mesh(sharedGeo('ch-sig-in', () => new RingGeometry(0.7, 0.74, 48)), ringMat), 0.031);
  const ticks = new Group();
  const tickMat = flat(GOLD_HOT, 0.6);
  for (let i = 0; i < 8; i++) {
    const tk = onGround(new Mesh(sharedGeo('ch-sig-tick', () => new RingGeometry(0.76, 0.9, 2, 1, -0.06, 0.12)), tickMat), 0.033);
    tk.rotation.z = (i / 8) * Math.PI * 2;
    ticks.add(tk);
  }
  const poolMat = soft(GOLD, 0.2);
  const pool = onGround(new Mesh(sharedGeo('ch-sig-pool', () => new CircleGeometry(1.25, 28)), poolMat), 0.02);
  pool.renderOrder = 2;
  g.add(outer, inner, ticks, pool);
  g.scale.setScalar(r);
  return { g, ticks, ringMat, tickMat, poolMat };
}
// The relic chest: a banded box, a lid on a hinge, a crown on the lid.
function buildChest() {
  const g = new Group();
  const wood = toonMaterial({ color: mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.2) });
  const goldM = new MeshBasicMaterial({ color: exactColor(GOLD), toneMapped: false });
  const box = new Mesh(sharedGeo('ch-chest-box', () => new BoxGeometry(0.9, 0.5, 0.6)), wood);
  box.position.y = 0.25;
  addInk(box);
  g.add(box);
  for (const x of [-0.36, 0, 0.36]) {
    const band = new Mesh(sharedGeo('ch-chest-band', () => new BoxGeometry(0.07, 0.52, 0.62)), goldM);
    band.position.set(x, 0.25, 0);
    g.add(band);
  }
  const hinge = new Group();
  hinge.position.set(0, 0.5, -0.3);
  g.add(hinge);
  const lid = new Mesh(sharedGeo('ch-chest-lid', () => new CylinderGeometry(0.3, 0.3, 0.9, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, 0.3)), wood);
  addInk(lid);
  hinge.add(lid);
  const crown = new Mesh(sharedGeo('ch-chest-crown', () => new ConeGeometry(0.1, 0.16, 5)), goldM);
  crown.position.set(0, 0.32, 0.3);
  hinge.add(crown);
  const seamMat = new MeshBasicMaterial({ color: new Color(GOLD_HOT), transparent: true, opacity: 0.0, toneMapped: false, blending: AdditiveBlending, depthWrite: false });
  const seam = new Mesh(sharedGeo('ch-chest-seam', () => new BoxGeometry(0.92, 0.04, 0.62)), seamMat);
  seam.position.y = 0.5;
  g.add(seam);
  const glow = makeGlowSprite({ color: GOLD, size: 2.2, opacity: 0.0 });
  glow.material.toneMapped = false;
  glow.position.y = 0.6;
  g.add(glow);
  const beam = makeGlowSprite({ color: GOLD_HOT, size: 1, opacity: 0 });
  beam.material.toneMapped = false;
  beam.scale.set(0.8, 6, 1);
  beam.position.y = 3;
  g.add(beam);
  g.add(groundShadow(0.6, 0.6));
  return { g, hinge, seamMat, glow, beam, mats: [wood] };
}

export function createChampionFx({ root, world, bus, cosmetic }) {
  const marks = new Map(); // champion id -> { crown, sigil, aura, kind }
  let chest = null; // { rec, x, z, age, open, openAge }
  const waves = []; // { mesh, mat, age, dur, reach }
  const counts = { spawned: 0, felled: 0, chests: 0, opened: 0 };

  function wave(x, z, color, reach, dur) {
    const mat = flat(color, 0.9);
    const mesh = onGround(new Mesh(sharedGeo('ch-wave', () => new RingGeometry(0.86, 1.0, 64)), mat), 0.06);
    mesh.position.x = x;
    mesh.position.z = z;
    root.add(mesh);
    waves.push({ mesh, mat, age: 0, dur, reach });
  }
  function addMark(e) {
    const crown = buildCrown();
    const sigil = buildSigil((e.radius ?? 0.6) + 0.55);
    const aura = makeGlowSprite({ color: RAGE, size: 3.2, opacity: 0 });
    aura.material.toneMapped = false;
    aura.position.y = 1.2;
    root.add(crown.g, sigil.g, aura);
    marks.set(e.id, { crown, sigil, aura, kind: e.kind, rageAge: 9 });
  }
  function dropMark(id) {
    const m = marks.get(id);
    if (!m) return;
    root.remove(m.crown.g, m.sigil.g, m.aura);
    releaseTree(m.crown.g);
    releaseTree(m.sigil.g);
    marks.delete(id);
  }
  function dropChest() {
    if (!chest) return;
    root.remove(chest.rec.g);
    releaseTree(chest.rec.g);
    chest = null;
  }

  bus.on('champion_spawn', (ev) => {
    counts.spawned += 1;
    // The entrance: a gold column drops, the ground rings twice, dust rolls.
    wave(ev.x, ev.z, GOLD, 4.2, 0.6);
    wave(ev.x, ev.z, GOLD_HOT, 2.4, 0.35);
    impactFx.spray('smoke', ev.x, 0.2, ev.z, 10, { color: PALETTE.warmGrey, speed: [0.8, 2.0], up: [0.1, 0.5], size: [0.4, 0.6], grow: 1.5, life: [0.8, 1.3], opacity: 0.32, gravity: -0.15, drag: 2.2, jitter: 0.6 });
    impactFx.spray('spark', ev.x, 0.6, ev.z, 18, { color: GOLD, speed: [0.3, 1.2], up: [1.0, 2.6], size: [0.05, 0.1], life: [0.9, 1.5], gravity: -0.3, drag: 1.3, jitter: 0.7 });
  });
  bus.on('champion_rage', (ev) => {
    const m = marks.get(ev.id);
    if (m) m.rageAge = 0;
    wave(ev.x, ev.z, RAGE, 3.0, 0.5);
    impactFx.spray('spark', ev.x, 1.0, ev.z, 16, { color: RAGE, speed: [0.6, 1.8], up: [0.6, 1.8], size: [0.05, 0.1], life: [0.5, 0.9], gravity: -0.2, drag: 1.4, jitter: 0.5 });
  });
  bus.on('champion_fall', (ev) => {
    counts.felled += 1;
    dropMark(ev.id);
    wave(ev.x, ev.z, GOLD, 5.0, 0.8);
    wave(ev.x, ev.z, PALETTE.parchment, 2.6, 0.4);
    impactFx.spray('spark', ev.x, 0.8, ev.z, 30, { color: GOLD, speed: [0.6, 2.4], up: [1.2, 3.2], size: [0.06, 0.12], life: [1.0, 1.8], gravity: -0.25, drag: 1.2, jitter: 0.8 });
    // The chest rises out of the floor where it fell.
    dropChest();
    const rec = buildChest();
    rec.g.position.set(ev.x, -0.6, ev.z);
    root.add(rec.g);
    chest = { rec, x: ev.x, z: ev.z, age: 0, open: false, openAge: 0 };
    counts.chests += 1;
  });
  bus.on('champion_chest', () => {
    if (!chest) return;
    chest.open = true;
    chest.openAge = 0;
    counts.opened += 1;
    wave(chest.x, chest.z, GOLD_HOT, 3.0, 0.5);
    impactFx.spray('spark', chest.x, 0.7, chest.z, 26, { color: GOLD_HOT, speed: [0.2, 0.9], up: [1.6, 3.4], size: [0.05, 0.1], life: [1.2, 2.0], gravity: -0.4, drag: 1.0, jitter: 0.3 });
  });
  // A new room, the end of the run or camp: the chest stays behind.
  for (const type of ['room_enter', 'run_end', 'run_wiped', 'return_to_camp', 'level_transit']) bus.on(type, () => dropChest());

  function update(tSec, dt) {
    const seen = new Set();
    for (const e of world.entities()) {
      if (!CHAMPION_BUILDERS[e.kind] || e.state !== 'active') continue;
      seen.add(e.id);
      if (!marks.has(e.id)) addMark(e);
      const m = marks.get(e.id);
      const ix = e.x;
      const iz = e.z;
      m.crown.g.position.set(ix, (CHAMPION_CROWN_Y[e.kind] ?? 2.6) + 0.06 * Math.sin(tSec * 2), iz);
      m.crown.g.rotation.y = tSec * 0.9;
      m.sigil.g.position.set(ix, 0, iz);
      m.sigil.ticks.rotation.z = -tSec * 0.5;
      const wind = e.telegraph ? 1 : 0;
      const rage = e.rage ? 1 : 0;
      m.sigil.ringMat.opacity = 0.45 + 0.25 * wind + 0.1 * Math.sin(tSec * 3);
      m.sigil.tickMat.opacity = 0.5 + 0.4 * wind;
      m.sigil.ringMat.color.set(rage ? RAGE : GOLD);
      m.rageAge += dt;
      m.aura.position.set(ix, 1.2, iz);
      m.aura.material.opacity = rage ? 0.28 + 0.12 * Math.sin(tSec * 8) + (m.rageAge < 0.4 ? 0.5 * (1 - m.rageAge / 0.4) : 0) : 0;
      m.crown.glow.material.opacity = 0.4 + 0.2 * wind;
    }
    for (const id of [...marks.keys()]) if (!seen.has(id)) dropMark(id);
    if (chest) {
      chest.age += dt;
      const rise = Math.min(1, chest.age / 0.7);
      chest.rec.g.position.y = -0.6 + 0.6 * (1 - (1 - rise) * (1 - rise));
      chest.rec.g.rotation.y = 0.15 * Math.sin(chest.age * 0.8);
      chest.rec.seamMat.opacity = chest.open ? 0.9 : 0.35 + 0.25 * Math.sin(chest.age * 3);
      if (chest.open) {
        chest.openAge += dt;
        const o = Math.min(1, chest.openAge / 0.45);
        chest.rec.hinge.rotation.x = -1.9 * (1 - (1 - o) * (1 - o) * (1 - o));
        chest.rec.glow.material.opacity = 0.75 + 0.15 * Math.sin(chest.openAge * 4);
        chest.rec.beam.material.opacity = Math.max(0.18, 0.7 * (1 - chest.openAge / 1.6));
        if (cosmetic.range(0, 1) < dt * 10) impactFx.spray('spark', chest.x, 0.6, chest.z, 1, { color: GOLD, speed: [0.05, 0.3], up: [0.8, 1.6], size: [0.04, 0.08], life: [0.8, 1.3], gravity: -0.4, drag: 1.4, jitter: 0.3 });
      } else {
        chest.rec.glow.material.opacity = 0.3 + 0.15 * Math.sin(chest.age * 3);
      }
    }
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.age += dt;
      const k = Math.min(1, w.age / w.dur);
      const sc = 0.3 + w.reach * (1 - (1 - k) * (1 - k));
      w.mesh.scale.set(sc, sc, 1);
      w.mat.opacity = 0.9 * (1 - k);
      if (w.age >= w.dur) {
        root.remove(w.mesh);
        w.mat.dispose();
        waves.splice(i, 1);
      }
    }
  }

  function clear() {
    for (const id of [...marks.keys()]) dropMark(id);
    dropChest();
  }

  return {
    update,
    clear,
    prewarm(park) {
      park(root, buildCrown().g);
      park(root, buildSigil(1).g);
      park(root, buildChest().g);
    },
    debug: () => ({ marks: marks.size, chest: chest ? { x: chest.x, z: chest.z, open: chest.open } : null, ...counts }),
  };
}
