// SECOND CHAMPIONS (plan 4 slice 8, docs/CHAMPIONS.md "Second champions"):
// the second lord of each of Acts I to IV, and of the Still Spire (content
// plan 5 slice 2). Same grammar as the first four
// (render/enemies/champions.js): flat-faceted primitives, cool hides with a
// value structure, ink on the big masses, a contact shadow, ONE indigo
// corruption tell each, about twice a heavy's height; the crown, the sigil
// and the chest come from the shared presence layer.
//
//   moss_hart         a great hart of bark and moss, a mantle of moss on its
//                     back, branching antlers hung with moss and lit with pale
//                     lichen; an indigo crack in its brow. Antler Toss: head
//                     dropped, antlers levelled, then flung up. Hart's Leap:
//                     it crouches, bounds (~1.5 u up, legs tucked) and lands
//                     on its forelegs
//   lockkeeper        a gaunt keeper in a long sodden coat and a broad hat, a
//                     lock-box lantern at the hip and a great rusted key on a
//                     chain. Chain Hook: the key swung back, then thrown down
//                     the lane and reeled in. Lock Turn: the key raised in both
//                     hands, driven into the floor and turned
//   gravebell_ringer  a hunched hooded skeleton under a yoke; from the yoke's
//                     arch hangs a cracked grave bell with an indigo tongue.
//                     Death Knell: it heaves, the bell swings wide and back.
//                     Grave Call: a bone mallet raised, then struck down
//   vein_matron       a tall crystal matriarch on a skirt of violet vein-roots,
//                     a crown of crystal spines, a beating heart in her chest
//                     and two long vein whips. Vein Lash: one whip drawn back,
//                     then cracked out down the lane. Heart Pulse: the heart
//                     swells, the spines flare, the roots lift
//   bell_abbess       (content plan 5 slice 2, the Still Spire) a tall abbess
//                     in a pale habit and a winged wimple, a porcelain face
//                     with shut eyes, a bronze hand-bell and the great bell's
//                     rope rising out of sight; the rope's sally is the indigo
//                     tell. Rope Swing: both hands on the rope, a crouch, then
//                     she rides it down the lane and drops at its end. Vesper
//                     Peal: the hand-bell raised up and back, then rung out
//                     down the cone
//   furnace_knight    (content plan 5 slice 9, the Ember Kiln) a broad knight
//                     of riveted dark kiln iron, a furnace burning behind the
//                     barred grate of its breastplate, a founder's sledge in
//                     both fists, molten seams in its greaves; an indigo crack
//                     across its helm. Molten Rush: hunched, the sledge
//                     levelled, then it runs head down. Grate Blast: it rears
//                     back, the grate swings open and the core goes white-hot
//   glassblower       (content plan 5 slice 9) a lanky kiln imp in a scorched
//                     apron and goggles, an iron blowpipe as tall as itself
//                     with a gather of molten glass at its end; one goggle
//                     lens is the indigo tell. Glass Bubble: cheeks puffed,
//                     the gather swells into a glowing bubble and is let go.
//                     Glass Gout: the pipe levelled, its tip white-hot, a
//                     recoil on the spray
//
// Faces +Z; pose({ t, tick, walkPhase, moveK, telegraphK, e }) (e = the sim
// entity, READ ONLY). Render-only.
import {
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
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor, mix } from '../critters/common.js';
import { markShared } from '../geocache.js';
import { PALETTE, VFX_MATTER } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';

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
function softGlow(color, size, opacity) {
  const g = makeGlowSprite({ color, size, opacity });
  g.material.toneMapped = false;
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
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
const approach = (cur, to, rate, dt) => cur + (to - cur) * (1 - Math.exp(-rate * dt));
// Local hides (the same cool families as style.js HIDE).
const C = Object.freeze({
  hartHide: HIDE.boarDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.6).multiplyScalar(1.2),
  hartBelly: new Color(PALETTE.warmGrey).lerp(new Color(PALETTE.bruiseUmber), 0.55).multiplyScalar(0.9),
  hartBark: HIDE.quillDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.5).multiplyScalar(0.85),
  moss: new Color(VFX_MATTER.moss).lerp(new Color(PALETTE.signalBlue), 0.12),
  mossDark: new Color(VFX_MATTER.moss).multiplyScalar(0.62),
  antler: new Color(PALETTE.bone).lerp(new Color(PALETTE.bruiseUmber), 0.45).multiplyScalar(0.9),
  coat: slate(0.28, 0.2).lerp(new Color(VFX_MATTER.silt), 0.35),
  coatDark: slate(0.3, 0.12),
  keeperSkin: new Color(PALETTE.bone).lerp(new Color(VFX_MATTER.water), 0.4).multiplyScalar(0.72),
  rust: new Color(VFX_MATTER.rust).lerp(slate(0.2, 0.3), 0.2),
  rustDark: new Color(VFX_MATTER.rust).multiplyScalar(0.55),
  hat: slate(0.22, 0.14).lerp(new Color(PALETTE.bruiseUmber), 0.35),
  bone: new Color(PALETTE.bone).multiplyScalar(0.78),
  boneDark: new Color(PALETTE.bone).lerp(new Color(PALETTE.voidCharcoal), 0.5),
  shroud: slate(0.12, 0.15).lerp(new Color(VFX_MATTER.cinder), 0.4),
  yoke: new Color(VFX_MATTER.oak).multiplyScalar(0.7),
  bell: new Color(VFX_MATTER.gravebronze).lerp(slate(0.2, 0.3), 0.15).multiplyScalar(0.8),
  bellDark: new Color(VFX_MATTER.gravebronze).multiplyScalar(0.5),
  matron: new Color(VFX_MATTER.heartflesh).lerp(new Color(PALETTE.godstuffViolet), 0.18).multiplyScalar(1.15),
  matronDark: new Color(VFX_MATTER.heartflesh).multiplyScalar(0.62),
  root: new Color(VFX_MATTER.heartflesh).lerp(new Color(PALETTE.voidCharcoal), 0.35),
});
const LICHEN = VFX_MATTER.lichen;
const LANTERN = mix(PALETTE.hearthAmber, VFX_MATTER.water, 0.45);
const VEIN = VFX_MATTER.heartvein;
const VEIN_PEAK = VFX_MATTER.heartpeak;

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
// How far through its current warning (0..1) at the interpolated tick.
function progress(e, tick) {
  const tel = e && e.telegraph;
  if (!tel) return 0;
  const span = Math.max(1, (tel.resolveTick ?? 0) - (tel.startTick ?? 0));
  return clamp01((tick - (tel.startTick ?? 0)) / span);
}
// A leg of two segments hinged at the knee (hip pivot at the origin).
function leg(mat, upper, lower, r) {
  const hip = new Group();
  const thigh = new Mesh(shared(`leg-u-${upper}-${r}`, () => new CylinderGeometry(r, r * 1.25, upper, 6).translate(0, -upper / 2, 0)), mat);
  addInk(thigh);
  hip.add(thigh);
  const knee = new Group();
  knee.position.y = -upper;
  hip.add(knee);
  const shin = new Mesh(shared(`leg-l-${lower}-${r}`, () => new CylinderGeometry(r * 0.55, r * 0.8, lower, 5).translate(0, -lower / 2, 0)), mat);
  addInk(shin);
  knee.add(shin);
  const hoof = new Mesh(shared(`hoof-${r}`, () => new CylinderGeometry(r * 0.7, r * 0.85, 0.1, 6)), inkMat());
  hoof.position.y = -lower;
  knee.add(hoof);
  return { hip, knee };
}

// ---------------------------------------------------------- MOSS HART --
// Its height over the bound: it gathers itself through the first 45% of the
// warning, rises ~1.5 u in an arc and is down on the mark at 95%. 0 unless
// it is mid-leap (`e.flight`). Shared with the presence layer (the crown
// rides up with it).
export function hartLift(e, tick) {
  const tel = e && e.telegraph;
  if (!e || !e.flight || !tel || tel.move !== 'harts_leap') return 0;
  const q = (progress(e, tick) - 0.45) / 0.5;
  return q > 0 && q < 1 ? 1.5 * Math.sin(Math.PI * q) : 0;
}
export function buildMossHart() {
  const s = shell('moss_hart');
  const { rig, track } = s;
  const hide = track(flashable(C.hartHide));
  const belly = track(flashable(C.hartBelly));
  const bark = track(flashable(C.hartBark));
  const moss = track(flashable(C.moss));
  const mossDark = track(flashable(C.mossDark));
  const antlerM = track(flashable(C.antler));
  const lichenM = glowMat(LICHEN);
  const lift = new Group();
  rig.add(lift);
  const body = new Group();
  body.position.y = 1.35;
  lift.add(body);
  // A deep barrel of a body, shoulders high.
  const torso = new Mesh(shared('mh-torso', () => new SphereGeometry(0.6, 10, 8)), hide);
  torso.scale.set(0.78, 0.74, 1.45);
  addInk(torso);
  body.add(torso);
  const chest = new Mesh(shared('mh-chest', () => new SphereGeometry(0.5, 9, 7)), hide);
  chest.scale.set(0.85, 0.95, 0.8);
  chest.position.set(0, 0.12, 0.55);
  addInk(chest);
  body.add(chest);
  const under = new Mesh(shared('mh-under', () => new SphereGeometry(0.48, 8, 6)), belly);
  under.scale.set(0.8, 0.5, 1.4);
  under.position.y = -0.22;
  body.add(under);
  // Bark plates down the flanks (the Wood grew through its hide).
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const p = new Mesh(shared('mh-plate', () => new OctahedronGeometry(0.16, 0)), bark);
      p.scale.set(0.35, 1.2, 1.4 - i * 0.25);
      p.position.set(side * 0.43, 0.02 - i * 0.05, 0.3 - i * 0.4);
      p.rotation.set(0.2 + i * 0.15, side * 0.15, side * 0.25);
      body.add(p);
    }
  // The moss mantle: lumps over the back and shoulders, strands hanging.
  const mantle = new Group();
  body.add(mantle);
  const LUMPS = [[0, 0.42, 0.4, 0.34], [0.2, 0.38, 0.05, 0.3], [-0.22, 0.38, 0.0, 0.3], [0, 0.4, -0.4, 0.32], [0.15, 0.34, -0.72, 0.24], [-0.14, 0.33, -0.7, 0.24], [0, 0.5, 0.75, 0.26]];
  for (const [x, y, z, r] of LUMPS) {
    const m = new Mesh(shared('mh-lump', () => new IcosahedronGeometry(1, 0)), r > 0.28 ? moss : mossDark);
    m.scale.set(r, r * 0.6, r);
    m.position.set(x, y, z);
    addInk(m);
    mantle.add(m);
  }
  const strands = [];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const st = new Mesh(shared('mh-strand', () => new ConeGeometry(0.06, 0.5, 4).translate(0, -0.25, 0)), mossDark);
    st.position.set(side * (0.38 + (i % 3) * 0.04), 0.18, 0.6 - Math.floor(i / 2) * 0.38);
    mantle.add(st);
    strands.push({ m: st, ph: i * 0.9, side });
  }
  // Lichen motes in the moss (they glow faintly).
  for (let i = 0; i < 5; i++) {
    const g = new Mesh(shared('mh-lichen', () => new IcosahedronGeometry(0.045, 0)), lichenM);
    g.position.set(Math.sin(i * 2.1) * 0.25, 0.55, 0.6 - i * 0.32);
    mantle.add(g);
  }
  // Tail tuft.
  const tail = new Mesh(shared('mh-tail', () => new ConeGeometry(0.12, 0.34, 5).rotateX(-2.2)), moss);
  tail.position.set(0, 0.25, -0.9);
  body.add(tail);
  // Neck and head.
  const neck = new Group();
  neck.position.set(0, 0.3, 0.75);
  body.add(neck);
  const neckM = new Mesh(shared('mh-neck', () => new CylinderGeometry(0.2, 0.3, 0.75, 7).translate(0, 0.32, 0)), hide);
  neckM.rotation.x = 0.55;
  addInk(neckM);
  neck.add(neckM);
  const ruff = new Mesh(shared('mh-ruff', () => new ConeGeometry(0.34, 0.5, 7, 1, true).rotateX(Math.PI)), moss);
  ruff.material.side = DoubleSide;
  ruff.position.set(0, 0.2, 0.12);
  ruff.rotation.x = 0.6;
  neck.add(ruff);
  const head = new Group();
  head.position.set(0, 0.62, 0.38);
  head.scale.setScalar(1.3);
  neck.add(head);
  const skull = new Mesh(shared('mh-skull', () => new BoxGeometry(0.3, 0.3, 0.42)), hide);
  addInk(skull);
  head.add(skull);
  const muzzle = new Mesh(shared('mh-muzzle', () => new CylinderGeometry(0.08, 0.12, 0.36, 6).rotateX(Math.PI / 2)), belly);
  muzzle.position.set(0, -0.06, 0.32);
  addInk(muzzle);
  head.add(muzzle);
  const nose = new Mesh(shared('mh-nose', () => new BoxGeometry(0.12, 0.07, 0.05)), inkMat());
  nose.position.set(0, -0.04, 0.5);
  head.add(nose);
  for (const side of [-1, 1]) {
    const ear = new Mesh(shared('mh-ear', () => new ConeGeometry(0.07, 0.26, 4).translate(0, 0.13, 0)), hide);
    ear.position.set(side * 0.16, 0.12, -0.08);
    ear.rotation.set(-0.3, 0, side * -1.0);
    head.add(ear);
    const eye = new Mesh(shared('mh-eye', () => new BoxGeometry(0.02, 0.035, 0.08)), inkMat());
    eye.position.set(side * 0.155, 0.04, 0.1);
    head.add(eye);
  }
  // The tell: an indigo crack down the brow.
  const crack = new Mesh(shared('mh-crack', () => new BoxGeometry(0.035, 0.2, 0.02)), tellMat());
  crack.position.set(0, 0.08, 0.215);
  crack.rotation.z = 0.25;
  head.add(crack);
  const tg = tellGlow(0.55, 0.3);
  tg.position.set(0, 0.08, 0.26);
  head.add(tg);
  // Antlers: two branching racks, moss hanging, lichen lit at the tines.
  const antlers = new Group();
  antlers.position.set(0, 0.14, -0.05);
  head.add(antlers);
  const tines = [];
  const branch = (parent, len, r, x, y, z, rx, rz) => {
    const g = new Group();
    g.position.set(x, y, z);
    g.rotation.set(rx, 0, rz);
    parent.add(g);
    const m = new Mesh(shared(`mh-ant-${len}-${r}`, () => new CylinderGeometry(r * 0.6, r, len, 5).translate(0, len / 2, 0)), antlerM);
    addInk(m);
    g.add(m);
    return g;
  };
  for (const side of [-1, 1]) {
    const main = branch(antlers, 0.9, 0.06, side * 0.12, 0, 0, -0.35, side * -0.75);
    const upper = branch(main, 0.7, 0.045, 0, 0.88, 0, 0.25, side * 0.55);
    for (const [parent, y, len, rx, rz] of [[main, 0.32, 0.5, 0.9, side * 0.2], [main, 0.62, 0.45, 0.7, side * -0.35], [upper, 0.35, 0.4, 0.5, side * 0.6], [upper, 0.68, 0.32, -0.2, side * 0.2]]) {
      const tn = branch(parent, len, 0.03, 0, y, 0, rx, rz);
      const bud = new Mesh(shared('mh-bud', () => new IcosahedronGeometry(0.055, 0)), lichenM);
      bud.position.y = len;
      tn.add(bud);
      tines.push(bud);
    }
    const tip = new Mesh(shared('mh-bud', () => new IcosahedronGeometry(0.055, 0)), lichenM);
    tip.position.y = 0.7;
    upper.add(tip);
    tines.push(tip);
    // Moss hung across the rack.
    for (const y of [0.4, 0.75]) {
      const drape = new Mesh(shared('mh-drape', () => new ConeGeometry(0.07, 0.42, 4).translate(0, -0.21, 0)), mossDark);
      drape.position.set(0, y, 0.02);
      main.add(drape);
      strands.push({ m: drape, ph: y * 4 + side, side, antler: true });
    }
  }
  const rackGlow = softGlow(LICHEN, 1.6, 0.1);
  rackGlow.position.set(0, 1.0, -0.1);
  antlers.add(rackGlow);
  // Four legs.
  const legs = [];
  for (const [x, z, front] of [[-0.3, 0.6, 1], [0.3, 0.6, 1], [-0.3, -0.62, 0], [0.3, -0.62, 0]]) {
    const L = leg(hide, 0.62, 0.72, 0.11);
    L.hip.position.set(x, 1.15, z);
    lift.add(L.hip);
    legs.push({ ...L, front, side: x < 0 ? -1 : 1 });
  }
  const shadow = groundShadow(1.0, 0.8, { deep: 1.4 });
  s.group.add(shadow);
  const strike = clip();
  let lastT = null;
  let liftCur = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const k = strike(t, e ? e.moveTick : -1, 0.45);
      const last = e ? e.lastMove : null;
      const prog = progress(e, tick);
      const tossK = moving(e, 'antler_toss') ? telegraphK : 0;
      const leaping = moving(e, 'harts_leap') && !!(e && e.flight);
      const crouch = leaping ? smooth(prog / 0.4) * (1 - smooth((prog - 0.45) / 0.08)) : 0;
      const fling = last === 'antler_toss' ? k : 0;
      const land = last === 'harts_leap' ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      const want = hartLift(e, tick);
      liftCur = leaping ? want : approach(liftCur, 0, 16, dt);
      const air = clamp01(liftCur / 1.2);
      const rising = leaping && prog < 0.7;
      lift.position.y = liftCur - 0.32 * crouch - 0.22 * land;
      // Walk: a diagonal trot.
      const ph = walkPhase * 1.1;
      for (const L of legs) {
        const diag = (L.front ? 1 : -1) * L.side > 0 ? 0 : Math.PI;
        const sw = Math.sin(ph + diag) * 0.45 * moveK * (1 - air);
        // Aloft the forelegs reach forward and the hind kick back (rising),
        // then all four tuck (falling).
        const airRot = air * (rising ? (L.front ? -0.9 : 0.8) : L.front ? -0.4 : 0.4);
        L.hip.rotation.x = sw + airRot + (L.front ? 0.35 : -0.25) * crouch + (L.front ? -0.3 : 0.2) * land;
        L.knee.rotation.x = -Math.max(0, Math.sin(ph + diag)) * 0.7 * moveK * (1 - air) + (L.front ? 0.9 : -0.9) * air + (L.front ? -0.4 : 0.9) * crouch;
      }
      // Body: pitched down into the toss, up on the fling; the crouch sinks
      // the haunches; aloft it stretches out, nose up rising, down falling.
      body.rotation.x = 0.22 * tossK - 0.3 * fling + 0.12 * crouch + (leaping ? (rising ? -0.25 : 0.3) * air : 0) + 0.18 * land + 0.02 * Math.sin(t * 1.4);
      body.rotation.z = 0.04 * Math.sin(ph) * moveK + (rage ? 0.02 * Math.sin(t * 17) : 0);
      // The head drops and levels the rack, then flings it up and back.
      neck.rotation.x = 0.85 * tossK - 1.1 * fling + 0.3 * crouch - 0.2 * air + 0.04 * Math.sin(t * 0.9);
      head.rotation.x = 0.35 * tossK - 0.3 * fling;
      head.rotation.y = 0.12 * Math.sin(t * 0.6) * (1 - tossK);
      antlers.rotation.z = 0.06 * fling * Math.sin(t * 40);
      for (const sd of strands) sd.m.rotation.x = 0.25 * Math.sin(t * 2.2 + sd.ph) * (0.4 + moveK + air) + (sd.antler ? 0.5 * fling : 0.6 * air);
      const glow = 0.5 + 0.5 * Math.sin(t * 2.4);
      for (let i = 0; i < tines.length; i++) tines[i].scale.setScalar(1 + 0.25 * Math.sin(t * 3 + i) + 0.6 * tossK + 0.8 * fling);
      rackGlow.material.opacity = 0.06 + 0.04 * glow + 0.35 * tossK + 0.4 * fling + 0.12 * crouch;
      tg.material.opacity = 0.28 + 0.35 * Math.max(tossK, leaping ? 1 : 0) + (rage ? 0.22 + 0.12 * Math.sin(t * 9) : 0);
      tail.rotation.x = 0.4 * Math.sin(t * 3.1) * 0.3 + 0.5 * air;
      shadow.scale.setScalar(1 - 0.35 * air);
      shadow.material.opacity = 0.8 * (1 - 0.45 * air);
    },
  };
}

// --------------------------------------------------------- LOCKKEEPER --
export function buildLockkeeper() {
  const s = shell('lockkeeper');
  const { rig, track } = s;
  const coat = track(flashable(C.coat));
  const coatDark = track(flashable(C.coatDark));
  const skin = track(flashable(C.keeperSkin));
  const rust = track(flashable(C.rust));
  const rustDark = track(flashable(C.rustDark));
  const hatM = track(flashable(C.hat));
  const body = new Group();
  rig.add(body);
  // A long coat to the floor, its tails torn, hunched at the shoulders.
  const skirt = new Mesh(shared('lk-skirt', () => new CylinderGeometry(0.32, 0.62, 1.55, 8, 1, true).translate(0, 0.78, 0)), coat);
  skirt.material.side = DoubleSide;
  addInk(skirt);
  body.add(skirt);
  const tails = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const tl = new Mesh(shared('lk-tail', () => new ConeGeometry(0.12, 0.36, 3).rotateX(Math.PI).translate(0, -0.12, 0)), coatDark);
    tl.position.set(Math.cos(a) * 0.56, 0.1, Math.sin(a) * 0.56);
    body.add(tl);
    tails.push(tl);
  }
  const torso = new Group();
  torso.position.y = 1.55;
  body.add(torso);
  const chest = new Mesh(shared('lk-chest', () => new CylinderGeometry(0.42, 0.33, 0.8, 8).translate(0, 0.38, 0)), coat);
  addInk(chest);
  torso.add(chest);
  const collar = new Mesh(shared('lk-collar', () => new CylinderGeometry(0.3, 0.46, 0.26, 8, 1, true).translate(0, 0.86, 0)), coatDark);
  collar.material.side = DoubleSide;
  torso.add(collar);
  for (const y of [0.18, 0.42]) {
    const strap = new Mesh(shared('lk-strap', () => new TorusGeometry(0.4, 0.025, 4, 16).rotateX(Math.PI / 2)), rustDark);
    strap.position.y = y;
    torso.add(strap);
  }
  // Head under a broad drooping hat; a long pale face; one indigo eye.
  const head = new Group();
  head.position.set(0, 1.0, 0.1);
  torso.add(head);
  const face = new Mesh(shared('lk-face', () => new BoxGeometry(0.26, 0.4, 0.26)), skin);
  addInk(face);
  head.add(face);
  const brim = new Mesh(shared('lk-brim', () => new CylinderGeometry(0.52, 0.56, 0.05, 12)), hatM);
  brim.position.y = 0.2;
  brim.rotation.x = 0.12;
  addInk(brim);
  head.add(brim);
  const crown = new Mesh(shared('lk-crown', () => new CylinderGeometry(0.22, 0.27, 0.3, 8).translate(0, 0.15, 0)), hatM);
  crown.position.y = 0.21;
  addInk(crown);
  head.add(crown);
  const eye = new Mesh(shared('lk-eye', () => new BoxGeometry(0.06, 0.035, 0.02)), tellMat());
  eye.position.set(0.06, 0.04, 0.135);
  head.add(eye);
  const eye2 = new Mesh(shared('lk-eye2', () => new BoxGeometry(0.06, 0.02, 0.02)), inkMat());
  eye2.position.set(-0.06, 0.04, 0.135);
  head.add(eye2);
  const tg = tellGlow(0.42, 0.3);
  tg.position.set(0.06, 0.04, 0.17);
  head.add(tg);
  // (From above the hat hides the eye: the tell also burns in the hat band's
  // keyhole buckle.)
  const buckle = new Mesh(shared('lk-buckle', () => new BoxGeometry(0.07, 0.1, 0.03)), tellMat());
  buckle.position.set(0, 0.27, 0.255);
  head.add(buckle);
  const tg2 = tellGlow(0.5, 0.3);
  tg2.position.set(0, 0.3, 0.28);
  head.add(tg2);
  const beard = new Mesh(shared('lk-beard', () => new ConeGeometry(0.12, 0.3, 5).rotateX(Math.PI).translate(0, -0.15, 0)), coatDark);
  beard.position.set(0, -0.18, 0.1);
  head.add(beard);
  // The lantern at the left hip: a lock-box with a pale flame.
  const lantern = new Group();
  lantern.position.set(-0.5, 1.15, 0.18);
  body.add(lantern);
  const box = new Mesh(shared('lk-box', () => new BoxGeometry(0.2, 0.26, 0.2)), rustDark);
  addInk(box);
  lantern.add(box);
  const pane = new Mesh(shared('lk-pane', () => new BoxGeometry(0.14, 0.18, 0.21)), glowMat(LANTERN));
  lantern.add(pane);
  const flame = softGlow(LANTERN, 0.9, 0.5);
  lantern.add(flame);
  // Arms: the left steadies the chain, the right carries the key.
  const armL = new Group();
  armL.position.set(-0.46, 0.72, 0.02);
  torso.add(armL);
  const armR = new Group();
  armR.position.set(0.46, 0.72, 0.02);
  torso.add(armR);
  for (const a of [armL, armR]) {
    const sleeve = new Mesh(shared('lk-sleeve', () => new CylinderGeometry(0.1, 0.14, 0.82, 6).translate(0, -0.41, 0)), coat);
    addInk(sleeve);
    a.add(sleeve);
    const hand = new Mesh(shared('lk-hand', () => new SphereGeometry(0.08, 6, 5)), skin);
    hand.position.y = -0.86;
    a.add(hand);
  }
  // The key: a ring bow, a long shaft, a toothed bit, as long as his arm.
  // It hangs from the right hand; on the hook a second copy flies out down
  // the lane (in the body's frame) while the hand's copy hides.
  function buildKey() {
    const g = new Group();
    const bow = new Mesh(shared('lk-bow', () => new TorusGeometry(0.22, 0.065, 5, 12)), rust);
    addInk(bow);
    g.add(bow);
    const hole = new Mesh(shared('lk-hole', () => new CircleGeometry(0.12, 10)), tellMat());
    g.add(hole);
    const shaft = new Mesh(shared('lk-shaft', () => new CylinderGeometry(0.06, 0.07, 1.15, 6).translate(0, -0.8, 0)), rust);
    addInk(shaft);
    g.add(shaft);
    const collarK = new Mesh(shared('lk-kcollar', () => new CylinderGeometry(0.1, 0.1, 0.08, 8)), rustDark);
    collarK.position.y = -0.3;
    g.add(collarK);
    for (const [y, w] of [[-1.2, 0.34], [-1.32, 0.24], [-1.08, 0.16]]) {
      const bit = new Mesh(shared(`lk-bit-${w}`, () => new BoxGeometry(w, 0.1, 0.08).translate(w / 2, 0, 0)), rust);
      bit.position.y = y;
      addInk(bit);
      g.add(bit);
    }
    const glow = softGlow(PALETTE.emberDanger, 0.9, 0);
    glow.position.y = -1.2;
    g.add(glow);
    return { g, glow };
  }
  const keyRoot = new Group();
  keyRoot.position.set(0, -0.86, 0);
  armR.add(keyRoot);
  const handKey = buildKey();
  const key = handKey.g;
  keyRoot.add(key);
  const keyGlow = handKey.glow;
  const thrownKey = buildKey();
  thrownKey.g.visible = false;
  s.yaw.add(thrownKey.g);
  // The chain from the left hand round to the key's bow: links that follow.
  const links = [];
  for (let i = 0; i < 9; i++) {
    const ln = new Mesh(shared('lk-link', () => new TorusGeometry(0.06, 0.016, 3, 8)), rustDark);
    s.yaw.add(ln);
    links.push(ln);
  }
  s.group.add(groundShadow(0.75, 0.82));
  const strike = clip();
  const reach = { len: 5 };
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const k = strike(t, e ? e.moveTick : -1, 0.6);
      const last = e ? e.lastMove : null;
      const hookK = moving(e, 'chain_hook') ? telegraphK : 0;
      const turnK = moving(e, 'lock_turn') ? telegraphK : 0;
      const prog = progress(e, tick);
      if (e && e.telegraph && e.telegraph.move === 'chain_hook') reach.len = e.telegraph.length ?? reach.len;
      const thrown = last === 'chain_hook' ? k : 0; // 1 at the throw, easing back in
      const turned = last === 'lock_turn' ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      // A slow loping stride; the coat sways.
      body.position.y = 0.03 * Math.abs(Math.sin(walkPhase * 1.2)) * moveK;
      body.rotation.z = 0.05 * Math.sin(walkPhase * 1.2) * moveK;
      for (let i = 0; i < tails.length; i++) tails[i].rotation.x = 0.25 * Math.sin(t * 2.6 + i * 1.3) * (0.3 + moveK);
      torso.rotation.x = 0.28 - 0.22 * hookK * prog + 0.3 * thrown * (1 - thrown * 0.5) + 0.35 * turnK + 0.25 * turned;
      torso.rotation.y = -0.45 * hookK + 0.4 * thrown;
      // Chain Hook: the key swung up behind the shoulder, whirling; then the
      // arm whips forward and the key flies. Lock Turn: both hands lift it
      // overhead, then drive it down into the floor before him and turn it.
      // (An arm hangs down -Y: rotation.x > 0 swings it back and up, < 0
      // forward and up.)
      const fly = last === 'chain_hook' ? Math.sin(Math.PI * clamp01(1 - k) * 0.999) : 0;
      armR.rotation.x = -0.15 + 2.3 * hookK - 1.5 * thrown - 2.7 * turnK - 0.85 * turned;
      armR.rotation.z = 0.15 + 0.25 * hookK - 0.45 * turnK - 0.3 * turned;
      armL.rotation.x = -0.4 - 0.3 * hookK - 2.5 * turnK - 0.75 * turned;
      armL.rotation.z = -0.25 + 0.5 * turnK + 0.35 * turned;
      key.rotation.x = hookK * t * 14 + 0.6 * turned;
      key.rotation.y = turned * 3.0;
      // Thrown: the hand's key hides and its copy flies down the lane at
      // chest height, bit first, then reels back.
      key.visible = fly < 0.05;
      thrownKey.g.visible = fly >= 0.05;
      thrownKey.g.position.set(0.35, 1.35 - 0.5 * fly, 0.5 + fly * Math.max(1, reach.len - 0.8));
      thrownKey.g.rotation.set(-Math.PI / 2, 0, t * 9);
      thrownKey.glow.material.opacity = 0.9 * fly;
      keyGlow.material.opacity = 0.55 * hookK * prog + 0.6 * turnK * prog + 0.8 * turned;
      head.rotation.x = -0.15 * turnK + 0.12 * Math.sin(t * 0.7);
      tg.material.opacity = 0.28 + 0.35 * Math.max(hookK, turnK) + (rage ? 0.22 + 0.12 * Math.sin(t * 9) : 0);
      tg2.material.opacity = tg.material.opacity;
      flame.material.opacity = 0.4 + 0.12 * Math.sin(t * 6.1) + 0.12 * Math.sin(t * 9.7);
      lantern.rotation.z = 0.25 * Math.sin(t * 1.9 + walkPhase * 0.5 * moveK);
      // The chain: a sagging line from the left hand to the key's bow
      // (positions in the yaw frame, so the chain swings with the body).
      armL.updateWorldMatrix(true, false);
      key.updateWorldMatrix(true, false);
      thrownKey.g.updateWorldMatrix(true, false);
      const a = armL.localToWorld(_a.set(0, -0.86, 0));
      const b = (fly >= 0.05 ? thrownKey.g : key).localToWorld(_b.set(0, 0.2, 0));
      s.yaw.worldToLocal(a);
      s.yaw.worldToLocal(b);
      const sag = 0.35 * (1 - fly) + 0.05;
      for (let i = 0; i < links.length; i++) {
        const u = (i + 0.5) / links.length;
        links[i].position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - sag * Math.sin(Math.PI * u), a.z + (b.z - a.z) * u);
        links[i].rotation.set(i % 2 ? Math.PI / 2 : 0, Math.atan2(b.x - a.x, b.z - a.z), 0);
      }
    },
  };
}
const _a = new Vector3();
const _b = new Vector3();

// --------------------------------------------------- GRAVEBELL RINGER --
export function buildGravebellRinger() {
  const s = shell('gravebell_ringer');
  const { rig, track } = s;
  const bone = track(flashable(C.bone));
  const dark = track(flashable(C.boneDark));
  const shroud = track(flashable(C.shroud));
  const yokeM = track(flashable(C.yoke));
  const bellM = track(flashable(C.bell));
  const bellDark = track(flashable(C.bellDark));
  const body = new Group();
  rig.add(body);
  // A ragged shroud skirt over bone legs.
  const robe = new Mesh(shared('gr-robe', () => new ConeGeometry(0.58, 1.3, 8, 1, true).translate(0, 0.65, 0)), shroud);
  robe.material.side = DoubleSide;
  addInk(robe);
  body.add(robe);
  const rags = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = new Mesh(shared('gr-rag', () => new ConeGeometry(0.1, 0.38, 3).rotateX(Math.PI)), shroud);
    r.position.set(Math.cos(a) * 0.52, 0.1, Math.sin(a) * 0.52);
    body.add(r);
    rags.push(r);
  }
  // Hunched spine and ribs, bowed under the yoke.
  const torso = new Group();
  torso.position.set(0, 1.25, -0.05);
  torso.rotation.x = 0.25;
  body.add(torso);
  const spine = new Mesh(shared('gr-spine', () => new CylinderGeometry(0.05, 0.06, 0.9, 5).translate(0, 0.45, 0)), bone);
  torso.add(spine);
  for (let i = 0; i < 4; i++) {
    const rib = new Mesh(shared('gr-rib', () => new TorusGeometry(0.24, 0.028, 4, 10, Math.PI * 1.25).rotateX(Math.PI / 2).rotateY(Math.PI * 0.87)), bone);
    rib.position.y = 0.2 + i * 0.15;
    rib.scale.setScalar(1 - i * 0.07);
    torso.add(rib);
  }
  // A ragged mantle over the shoulders, under the yoke.
  const mantleG = new Mesh(shared('gr-mantle', () => new ConeGeometry(0.5, 0.62, 7, 1, true).translate(0, 0.62, 0)), shroud);
  mantleG.material.side = DoubleSide;
  addInk(mantleG);
  torso.add(mantleG);
  const hoodG = new Group();
  hoodG.position.y = 1.0;
  torso.add(hoodG);
  const hood = new Mesh(shared('gr-hood', () => new ConeGeometry(0.3, 0.62, 6, 1, true).translate(0, 0.06, -0.02)), shroud);
  hood.material.side = DoubleSide;
  addInk(hood);
  hoodG.add(hood);
  const skull = new Mesh(shared('gr-skull', () => new SphereGeometry(0.15, 7, 6)), bone);
  skull.position.set(0, -0.06, 0.06);
  hoodG.add(skull);
  for (const side of [-1, 1]) {
    const socket = new Mesh(shared('gr-socket', () => new BoxGeometry(0.05, 0.04, 0.02)), inkMat());
    socket.position.set(side * 0.055, -0.04, 0.2);
    hoodG.add(socket);
  }
  // The yoke across the shoulders: a bell-cote carried on its back, two
  // posts up past the hood to a crossbeam with a little gable, the bell
  // hanging between them over its head.
  const yoke = new Group();
  yoke.position.set(0, 0.85, -0.05);
  torso.add(yoke);
  const beam = new Mesh(shared('gr-beam', () => new BoxGeometry(1.45, 0.12, 0.16)), yokeM);
  addInk(beam);
  yoke.add(beam);
  for (const side of [-1, 1]) {
    const post = new Mesh(shared('gr-post', () => new CylinderGeometry(0.055, 0.065, 1.85, 5).translate(0, 0.92, 0)), yokeM);
    post.position.set(side * 0.62, 0, 0);
    addInk(post);
    yoke.add(post);
    const brace = new Mesh(shared('gr-brace', () => new BoxGeometry(0.05, 0.42, 0.05)), yokeM);
    brace.position.set(side * 0.5, 0.2, 0);
    brace.rotation.z = side * 0.6;
    yoke.add(brace);
  }
  const cross = new Mesh(shared('gr-cross', () => new BoxGeometry(1.42, 0.13, 0.18)), yokeM);
  cross.position.y = 1.85;
  addInk(cross);
  yoke.add(cross);
  const gable = new Mesh(shared('gr-gable', () => new ConeGeometry(0.85, 0.36, 4, 1).rotateY(Math.PI / 4)), bellDark);
  gable.scale.set(1, 1, 0.3);
  gable.position.y = 2.08;
  addInk(gable);
  yoke.add(gable);
  // The bell hangs from the crossbeam on a pivot (it swings in its own
  // frame, kept plumb against the hunch).
  const pivot = new Group();
  pivot.position.set(0, 1.78, 0);
  yoke.add(pivot);
  const bellG = new Group();
  pivot.add(bellG);
  const bell = new Mesh(shared('gr-bell', () => new CylinderGeometry(0.16, 0.42, 0.62, 10, 1, true).translate(0, -0.42, 0)), bellM);
  bell.material.side = DoubleSide;
  addInk(bell);
  bellG.add(bell);
  const top = new Mesh(shared('gr-top', () => new SphereGeometry(0.17, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, -0.12, 0)), bellM);
  bellG.add(top);
  const lip = new Mesh(shared('gr-lip', () => new TorusGeometry(0.42, 0.04, 4, 16).rotateX(Math.PI / 2).translate(0, -0.73, 0)), bellDark);
  bellG.add(lip);
  const crackM = new Mesh(shared('gr-crack', () => new BoxGeometry(0.025, 0.36, 0.02)), inkMat());
  crackM.position.set(0.12, -0.45, 0.32);
  crackM.rotation.set(-0.35, 0, 0.3);
  bellG.add(crackM);
  // The tell: the bell's tongue, indigo, glowing.
  const tongue = new Group();
  tongue.position.y = -0.15;
  bellG.add(tongue);
  const clapper = new Mesh(shared('gr-clapper', () => new SphereGeometry(0.08, 6, 5).translate(0, -0.52, 0)), tellMat());
  tongue.add(clapper);
  const tg = tellGlow(0.9, 0.3);
  tg.position.y = -0.55;
  tongue.add(tg);
  // Arms: a rope in the left, a bone mallet in the right.
  const armL = new Group();
  armL.position.set(-0.32, 0.8, 0.08);
  torso.add(armL);
  const armR = new Group();
  armR.position.set(0.32, 0.8, 0.08);
  torso.add(armR);
  for (const a of [armL, armR]) {
    const arm = new Mesh(shared('gr-arm', () => new CylinderGeometry(0.03, 0.03, 0.7, 4).translate(0, -0.35, 0)), bone);
    a.add(arm);
  }
  const rope = new Mesh(shared('gr-rope', () => new CylinderGeometry(0.018, 0.018, 1.0, 4).translate(0, 0.5, 0)), track(flashable(new Color(VFX_MATTER.hemp))));
  rope.position.y = -0.7;
  armL.add(rope);
  const mallet = new Group();
  mallet.position.y = -0.7;
  armR.add(mallet);
  const haft = new Mesh(shared('gr-haft', () => new CylinderGeometry(0.03, 0.035, 0.8, 5).translate(0, -0.3, 0)), dark);
  mallet.add(haft);
  const mhead = new Mesh(shared('gr-mhead', () => new BoxGeometry(0.34, 0.18, 0.18).translate(0, -0.72, 0)), bone);
  addInk(mhead);
  mallet.add(mhead);
  const malletGlow = softGlow(PALETTE.emberDanger, 0.7, 0);
  malletGlow.position.y = -0.72;
  mallet.add(malletGlow);
  s.group.add(groundShadow(0.8, 0.82));
  const strike = clip();
  let swingV = 0;
  let swing = 0;
  let lastT = null;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const k = strike(t, e ? e.moveTick : -1, 0.5);
      const last = e ? e.lastMove : null;
      const knellK = moving(e, 'death_knell') ? telegraphK : 0;
      const callK = moving(e, 'grave_call') ? telegraphK : 0;
      const prog = progress(e, tick);
      const tolled = last === 'death_knell' ? k : 0;
      const slam = last === 'grave_call' ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      // A shuffling stoop.
      body.position.y = 0.04 * Math.abs(Math.sin(walkPhase * 1.0)) * moveK;
      body.rotation.z = 0.07 * Math.sin(walkPhase * 1.0) * moveK;
      for (let i = 0; i < rags.length; i++) rags[i].rotation.x = Math.PI + 0.3 * Math.sin(t * 2.8 + i) * (0.3 + moveK);
      // The bell is a damped pendulum: the knell's heave drives it wide.
      const drive = knellK * Math.sin(t * 6.0) * 2.4 * (0.4 + prog) + (tolled > 0.9 ? 30 : 0) + moveK * Math.sin(walkPhase) * 0.6;
      swingV += (drive - 18 * swing - 2.2 * swingV) * dt;
      swing += swingV * dt;
      swing = Math.max(-0.9, Math.min(0.9, swing));
      torso.rotation.x = 0.25 + 0.12 * knellK * Math.sin(t * 6) + 0.2 * tolled - 0.2 * callK + 0.25 * slam;
      bellG.rotation.x = swing;
      bellG.rotation.z = 0.3 * swing * Math.sin(t * 1.3);
      pivot.rotation.x = -torso.rotation.x; // it hangs plumb whatever the hunch
      tongue.rotation.x = -swing * 0.6;
      yoke.rotation.z = 0.08 * knellK * Math.sin(t * 6 + 1);
      // Grave Call: the mallet raised high, then struck into the floor.
      armR.rotation.x = -0.4 - 2.6 * callK - 0.55 * slam;
      armR.rotation.z = 0.2 + 0.3 * callK;
      armL.rotation.x = -1.2 - 0.6 * knellK * (0.5 + 0.5 * Math.sin(t * 6)) + 0.3 * tolled;
      malletGlow.material.opacity = 0.6 * callK * prog + 0.8 * slam;
      hoodG.rotation.x = -0.35 + 0.15 * knellK + 0.06 * Math.sin(t * 0.8);
      tg.material.opacity = 0.3 + 0.35 * knellK + 0.6 * tolled + (rage ? 0.22 + 0.12 * Math.sin(t * 9) : 0);
      tg.scale.setScalar(1 + 0.8 * tolled + 0.4 * knellK * prog);
    },
  };
}

// -------------------------------------------------------- VEIN MATRON --
export function buildVeinMatron() {
  const s = shell('vein_matron');
  const { rig, track } = s;
  const flesh = track(flashable(C.matron));
  const dark = track(flashable(C.matronDark));
  const rootM = track(flashable(C.root));
  const crystal = glowMat(mix(VFX_MATTER.heartcrystal, PALETTE.parchment, 0.35));
  const veinM = glowMat(VEIN);
  const heartM = glowMat(mix(VEIN, VEIN_PEAK, 0.25));
  const body = new Group();
  rig.add(body);
  // The skirt of vein-roots: long curved roots splayed on the floor, each
  // with a lit vein along its back.
  const roots = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.17;
    const g = new Group();
    g.position.set(0, 0.95, 0);
    g.rotation.y = a;
    body.add(g);
    const r = new Mesh(shared('vm-root', () => new ConeGeometry(0.16, 1.4, 5).translate(0, -0.7, 0)), rootM);
    r.rotation.x = 0.95;
    addInk(r);
    g.add(r);
    const v = new Mesh(shared('vm-vein', () => new CylinderGeometry(0.018, 0.03, 1.2, 4).translate(0, -0.6, 0)), veinM);
    v.rotation.x = 0.95;
    v.position.y = 0.04;
    g.add(v);
    roots.push({ g, r, v, ph: i * 0.8 });
  }
  const hips = new Mesh(shared('vm-hips', () => new SphereGeometry(0.42, 9, 7)), dark);
  hips.scale.set(1.0, 0.6, 0.9);
  hips.position.y = 1.0;
  addInk(hips);
  body.add(hips);
  const torso = new Group();
  torso.position.y = 1.15;
  body.add(torso);
  const waist = new Mesh(shared('vm-waist', () => new CylinderGeometry(0.34, 0.22, 0.8, 8).translate(0, 0.4, 0)), flesh);
  addInk(waist);
  torso.add(waist);
  // Crystal plates over the breast; the heart lit through a split.
  for (const [x, y, rz] of [[-0.17, 0.75, 0.4], [0.17, 0.75, -0.4], [0, 0.5, 0]]) {
    const p = new Mesh(shared('vm-plate', () => new OctahedronGeometry(0.2, 0)), crystal);
    p.scale.set(0.9, 1.4, 0.45);
    p.position.set(x, y, 0.26);
    p.rotation.z = rz;
    torso.add(p);
  }
  const heart = new Mesh(shared('vm-heart', () => new IcosahedronGeometry(0.15, 1)), heartM);
  heart.position.set(0, 0.62, 0.24);
  torso.add(heart);
  const heartGlow = softGlow(VEIN, 1.6, 0.4);
  heartGlow.position.set(0, 0.62, 0.32);
  torso.add(heartGlow);
  const shoulders = new Mesh(shared('vm-sh', () => new BoxGeometry(0.8, 0.14, 0.26)), dark);
  shoulders.position.y = 0.95;
  addInk(shoulders);
  torso.add(shoulders);
  // Head: a long hooded face, its tell an indigo third eye; a crown of
  // crystal spines fanned behind it.
  const head = new Group();
  head.position.y = 1.25;
  torso.add(head);
  const skull = new Mesh(shared('vm-skull', () => new SphereGeometry(0.17, 8, 7)), flesh);
  skull.scale.set(0.85, 1.25, 0.9);
  addInk(skull);
  head.add(skull);
  const veil = new Mesh(shared('vm-veil', () => new ConeGeometry(0.26, 0.7, 7, 1, true).translate(0, -0.1, -0.06)), dark);
  veil.material.side = DoubleSide;
  head.add(veil);
  const third = new Mesh(shared('vm-third', () => new OctahedronGeometry(0.04, 0)), tellMat());
  third.scale.y = 1.8;
  third.position.set(0, 0.08, 0.15);
  head.add(third);
  const tg = tellGlow(0.45, 0.3);
  tg.position.set(0, 0.08, 0.19);
  head.add(tg);
  for (const side of [-1, 1]) {
    const eye = new Mesh(shared('vm-eye', () => new BoxGeometry(0.05, 0.015, 0.02)), glowMat(VEIN_PEAK));
    eye.position.set(side * 0.06, -0.02, 0.15);
    eye.rotation.z = side * 0.3;
    head.add(eye);
  }
  const spines = [];
  const crownG = new Group();
  crownG.position.set(0, 0.12, -0.08);
  head.add(crownG);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 2.2;
    const sp = new Mesh(shared('vm-spine', () => new ConeGeometry(0.045, 0.6, 4).translate(0, 0.3, 0)), crystal);
    sp.rotation.set(-0.35, 0, a);
    sp.scale.y = 1 - Math.abs(i - 3) * 0.13;
    crownG.add(sp);
    spines.push(sp);
  }
  const crownGlow = softGlow(VFX_MATTER.heartcrystal, 1.3, 0.2);
  crownGlow.position.y = 0.35;
  crownG.add(crownGlow);
  // Two whips: chains of tapering segments from the shoulders. Each is a
  // hand group that a pose bends link by link.
  const whips = [];
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.42, 0.92, 0.02);
    torso.add(sh);
    const segs = [];
    let parent = sh;
    for (let i = 0; i < 10; i++) {
      const g = new Group();
      g.position.y = i === 0 ? 0 : -0.24;
      parent.add(g);
      const r = 0.085 * (1 - i * 0.07);
      const m = new Mesh(shared(`vm-whip-${i}`, () => new CylinderGeometry(r * 0.85, r, 0.25, 5).translate(0, -0.12, 0)), i < 3 ? flesh : rootM);
      g.add(m);
      if (i % 2 === 1) {
        const lit = new Mesh(shared('vm-whipvein', () => new SphereGeometry(0.03, 4, 3)), veinM);
        lit.position.set(0, -0.12, 0.04);
        g.add(lit);
      }
      segs.push(g);
      parent = g;
    }
    const tip = softGlow(VEIN, 0.5, 0.0);
    tip.position.y = -0.24;
    segs[segs.length - 1].add(tip);
    whips.push({ sh, segs, side, tip });
  }
  s.group.add(groundShadow(0.95, 0.8));
  const strike = clip();
  const reach = { len: 5 };
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const k = strike(t, e ? e.moveTick : -1, 0.5);
      const last = e ? e.lastMove : null;
      const lashK = moving(e, 'vein_lash') ? telegraphK : 0;
      const pulseK = moving(e, 'heart_pulse') ? telegraphK : 0;
      const prog = progress(e, tick);
      if (e && e.telegraph && e.telegraph.move === 'vein_lash') reach.len = e.telegraph.length ?? reach.len;
      const cracked = last === 'vein_lash' ? k : 0;
      const beat = last === 'heart_pulse' ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      // She glides on her roots: a slow sway, the roots rippling.
      body.position.y = 0.03 * Math.sin(t * 1.3);
      body.rotation.z = 0.04 * Math.sin(walkPhase * 0.7) * moveK;
      for (const r of roots) {
        const lift = 0.22 * pulseK * prog + 0.4 * beat;
        r.g.rotation.x = 0.08 * Math.sin(t * 2 + r.ph + walkPhase * moveK) - lift;
        r.v.material.opacity = 1;
      }
      // The heart's beat: slow at rest, racing raged, swelling to the pulse.
      const hb = Math.pow(0.5 + 0.5 * Math.sin(t * (rage ? 7.5 : 3.6)), 4);
      heart.scale.setScalar(1 + 0.18 * hb + 0.7 * pulseK * prog + 0.9 * beat);
      heartGlow.material.opacity = 0.3 + 0.2 * hb + 0.5 * pulseK * prog + 0.6 * beat;
      heartGlow.scale.setScalar(1 + 0.8 * beat);
      torso.rotation.x = -0.12 * pulseK + 0.15 * beat + 0.12 * lashK - 0.2 * cracked + 0.03 * Math.sin(t * 1.1);
      torso.rotation.y = -0.35 * lashK + 0.5 * cracked;
      for (let i = 0; i < spines.length; i++) spines[i].rotation.x = -0.35 - 0.5 * pulseK * prog - 0.6 * beat + 0.05 * Math.sin(t * 2 + i);
      crownGlow.material.opacity = 0.18 + 0.4 * pulseK * prog + 0.5 * beat;
      head.rotation.x = 0.1 * Math.sin(t * 0.9) - 0.2 * pulseK;
      tg.material.opacity = 0.28 + 0.35 * Math.max(lashK, pulseK) + (rage ? 0.22 + 0.12 * Math.sin(t * 9) : 0);
      // Whips: hanging and coiling at rest; the right drawn back over the
      // warning, then cracked straight out down the lane.
      for (const w of whips) {
        const lashing = w.side > 0;
        const back = lashing ? lashK : 0;
        const out = lashing ? cracked : 0;
        w.sh.rotation.x = -0.25 - 1.8 * back + 0.25 * pulseK + (out > 0 ? -1.45 * out : 0);
        w.sh.rotation.z = w.side * (0.3 + 0.45 * pulseK) - (lashing ? 0.4 * back : 0);
        const segLen = out > 0 ? Math.min(0.8, (reach.len - 0.5) / 10) : 0.24;
        for (let i = 0; i < w.segs.length; i++) {
          const g = w.segs[i];
          if (i > 0) g.position.y = -(0.24 + (segLen - 0.24) * out);
          g.scale.y = 1 + ((segLen - 0.24) / 0.24) * out;
          const coil = 0.22 * Math.sin(t * 2.2 + i * 0.7 + w.side) * (1 - out);
          g.rotation.x = coil + back * 0.18 * Math.sin(t * 10 + i) - out * (i === 0 ? 0 : 0.02);
          g.rotation.z = w.side * 0.05 * (1 - out);
        }
        w.tip.material.opacity = 0.6 * back * prog + 0.9 * out;
      }
    },
  };
}

// -------------------------------------------------------- BELL ABBESS --
// (content plan 5 slice 2) The Still Spire's second lord: a tall, still
// abbess in a pale belfry habit with a great winged wimple (the starched
// cornette spreads like the Spire's stone wings), a porcelain face with its
// eyes shut, a bronze hand-bell in her right hand and, in her left, the
// great bell's rope rising out of sight into the belfry. The tell is the
// rope's sally (its woven grip), indigo, glowing at her fist.
//
// Its height on the swing: she grips the rope and stands through the first
// half of the warning, then rides the rope up in an arc (~1.1 u at the top)
// and drops at the lane's end by 92%. 0 unless she is mid-swing
// (`e.flight`). Shared with the presence layer (the crown rides up too).
export function abbessLift(e, tick) {
  const tel = e && e.telegraph;
  if (!e || !e.flight || !tel || tel.move !== 'rope_swing') return 0;
  const q = (progress(e, tick) - 0.5) / 0.42;
  return q > 0 && q < 1 ? 1.1 * Math.sin(Math.PI * q) : 0;
}
const ROPE_TOP = 7.5; // where the rope's unseen anchor hangs (u above the floor)
export function buildBellAbbess() {
  const s = shell('bell_abbess');
  const { rig, track } = s;
  const habitC = new Color(VFX_MATTER.habit).lerp(new Color(PALETTE.signalBlue), 0.06);
  const habit = track(flashable(habitC));
  const habitDark = track(flashable(habitC.clone().lerp(slate(0.25, 0.22), 0.55)));
  const wimpleM = track(flashable(new Color(PALETTE.parchment).lerp(new Color(VFX_MATTER.gust), 0.25)));
  wimpleM.side = DoubleSide;
  const porcelain = track(flashable(new Color(PALETTE.bone).lerp(new Color(PALETTE.parchment), 0.4).multiplyScalar(0.92)));
  const bronzeC = new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.3), 0.2).multiplyScalar(0.9);
  const bronze = track(flashable(bronzeC));
  bronze.side = DoubleSide;
  const bronzeDark = track(flashable(bronzeC.clone().multiplyScalar(0.55)));
  const hemp = track(flashable(new Color(VFX_MATTER.hemp)));
  const body = new Group(); // the whole figure (crouches and tilts on the swing)
  rig.add(body);
  // The habit: a long fall from the shoulders to the floor, a darker
  // scapular down its front, a bronze-dark hem.
  const robe = new Group();
  body.add(robe);
  const skirt = new Mesh(shared('ba-skirt', () => new ConeGeometry(0.62, 1.7, 10, 1, true).translate(0, 0.85, 0)), habit);
  skirt.material.side = DoubleSide;
  addInk(skirt);
  robe.add(skirt);
  const hem = new Mesh(shared('ba-hem', () => new TorusGeometry(0.6, 0.035, 4, 22).rotateX(Math.PI / 2).translate(0, 0.04, 0)), bronzeDark);
  robe.add(hem);
  const scap = new Mesh(shared('ba-scap', () => new BoxGeometry(0.34, 1.45, 0.05).translate(0, -0.72, 0)), habitDark);
  scap.position.set(0, 1.95, 0.29);
  scap.rotation.x = -0.12;
  addInk(scap);
  body.add(scap);
  // The upper body: a narrow tapered torso and a short cape over it.
  const torso = new Group();
  torso.position.y = 1.62;
  body.add(torso);
  const chest = new Mesh(shared('ba-chest', () => new CylinderGeometry(0.24, 0.33, 0.62, 9).translate(0, 0.31, 0)), habit);
  addInk(chest);
  torso.add(chest);
  const cape = new Mesh(shared('ba-cape', () => new ConeGeometry(0.46, 0.56, 9, 1, true).translate(0, 0.32, 0)), habitDark);
  cape.material.side = DoubleSide;
  cape.position.y = 0.32;
  addInk(cape);
  torso.add(cape);
  // A bronze cord at the waist with a little bell knotted on it.
  const cord = new Mesh(shared('ba-cord', () => new TorusGeometry(0.31, 0.025, 4, 16).rotateX(Math.PI / 2)), bronze);
  cord.position.y = 0.02;
  torso.add(cord);
  // Head: a porcelain face under the wimple, its eyes shut (two ink lines).
  const head = new Group();
  head.position.set(0, 0.86, 0.02);
  torso.add(head);
  const face = new Mesh(shared('ba-face', () => new SphereGeometry(0.15, 10, 8)), porcelain);
  face.scale.set(0.9, 1.15, 0.9);
  head.add(face);
  for (const side of [-1, 1]) {
    const lid = new Mesh(shared('ba-lid', () => new BoxGeometry(0.06, 0.012, 0.02)), inkMat());
    lid.position.set(side * 0.055, 0.02, 0.13);
    lid.rotation.z = side * -0.25;
    head.add(lid);
  }
  const coif = new Mesh(shared('ba-coif', () => new SphereGeometry(0.19, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62)), wimpleM);
  coif.position.set(0, 0.03, -0.03);
  addInk(coif);
  head.add(coif);
  const bib = new Mesh(shared('ba-bib', () => new ConeGeometry(0.3, 0.3, 9, 1, true).translate(0, -0.15, 0)), wimpleM);
  bib.position.y = -0.12;
  head.add(bib);
  // The cornette: two great starched wings swept up and out from the coif,
  // each turned up again at its tip (the white V that reads from above).
  const wings = [];
  for (const side of [-1, 1]) {
    const w = new Group(); // animated (lift, shiver)
    w.position.set(side * 0.12, 0.1, -0.02);
    head.add(w);
    const base = new Group(); // the wing's set
    base.rotation.set(-0.15, side * 0.25, side * 0.32);
    w.add(base);
    const sheet = new Mesh(shared('ba-wing', () => new BoxGeometry(0.78, 0.035, 0.46).translate(0.39, 0, 0)), wimpleM);
    sheet.scale.x = side;
    addInk(sheet);
    base.add(sheet);
    const tipG = new Group();
    tipG.position.x = side * 0.76;
    tipG.rotation.z = side * 0.45;
    base.add(tipG);
    const tipM = new Mesh(shared('ba-wtip', () => new BoxGeometry(0.34, 0.035, 0.38).translate(0.17, 0, 0)), wimpleM);
    tipM.scale.x = side;
    addInk(tipM);
    tipG.add(tipM);
    wings.push({ g: w, side });
  }
  // Arms. Left: up at the rope. Right: the hand-bell.
  const armL = new Group();
  armL.position.set(-0.27, 0.52, 0.04);
  torso.add(armL);
  const armR = new Group();
  armR.position.set(0.27, 0.52, 0.04);
  torso.add(armR);
  for (const a of [armL, armR]) {
    const sleeve = new Mesh(shared('ba-sleeve', () => new CylinderGeometry(0.07, 0.12, 0.62, 6).translate(0, -0.31, 0)), habit);
    addInk(sleeve);
    a.add(sleeve);
    const hand = new Mesh(shared('ba-hand', () => new SphereGeometry(0.055, 6, 5)), porcelain);
    hand.position.y = -0.64;
    a.add(hand);
  }
  // The rope: from her left fist up into the belfry, on its own pivot so it
  // can lean to the anchor while she swings. Its sally (the woven grip) is
  // the indigo tell.
  const ropePivot = new Group();
  ropePivot.position.y = -0.64;
  ropePivot.rotation.order = 'ZYX'; // so the pose below is exactly the arm's inverse
  armL.add(ropePivot);
  // (Flagged transparent, so the Journal portrait frames her body, not the
  // rope's full height.)
  const ropeMat = flashable(new Color(VFX_MATTER.hemp));
  ropeMat.transparent = true;
  const rope = new Mesh(shared('ba-rope', () => new CylinderGeometry(0.022, 0.022, 1, 5).translate(0, 0.5, 0)), ropeMat);
  ropePivot.add(rope);
  const sally = new Mesh(shared('ba-sally', () => new CylinderGeometry(0.05, 0.05, 0.42, 7).translate(0, 0.28, 0)), tellMat());
  ropePivot.add(sally);
  const sg = tellGlow(0.8, 0.3);
  sg.position.y = 0.3;
  ropePivot.add(sg);
  const tail = new Mesh(shared('ba-tail', () => new CylinderGeometry(0.02, 0.015, 0.5, 4).translate(0, -0.25, 0)), hemp);
  ropePivot.add(tail);
  // The hand-bell: a bronze cup on a short haft, its clapper lit on the peal.
  const bellG = new Group();
  bellG.position.y = -0.64;
  armR.add(bellG);
  const haft = new Mesh(shared('ba-haft', () => new CylinderGeometry(0.025, 0.03, 0.22, 5).translate(0, -0.1, 0)), bronzeDark);
  bellG.add(haft);
  const cup = new Mesh(shared('ba-cup', () => new CylinderGeometry(0.09, 0.22, 0.3, 10, 1, true).translate(0, -0.36, 0)), bronze);
  addInk(cup);
  bellG.add(cup);
  const crownB = new Mesh(shared('ba-cupcrown', () => new SphereGeometry(0.095, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, -0.22, 0)), bronze);
  bellG.add(crownB);
  const clapper = new Mesh(shared('ba-clapper', () => new SphereGeometry(0.045, 6, 5).translate(0, -0.48, 0)), bronzeDark);
  bellG.add(clapper);
  const peal = softGlow(mix(VFX_MATTER.bellbronze, PALETTE.parchment, 0.55), 1.0, 0);
  peal.position.y = -0.46;
  bellG.add(peal);
  s.group.add(groundShadow(0.8, 0.8));
  const strike = clip();
  let lastT = null;
  let liftCur = 0;
  let sway = 0;
  let swayV = 0;
  let ringV = 0;
  let ring = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const k = strike(t, e ? e.moveTick : -1, 0.5);
      const last = e ? e.lastMove : null;
      const tel = e && e.telegraph;
      const swinging = moving(e, 'rope_swing');
      const swingK = swinging ? telegraphK : 0;
      const pealK = moving(e, 'vesper_peal') ? telegraphK : 0;
      const prog = progress(e, tick);
      const dropped = last === 'rope_swing' ? k : 0;
      const rung = last === 'vesper_peal' ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      const entering = e && e.mode === 'enter' ? 1 : 0;
      // Aloft: the sim's flight drives the height; a cut-short swing drops.
      const want = abbessLift(e, tick);
      liftCur = swinging ? want : approach(liftCur, 0, 16, dt);
      const ride = swinging && prog > 0.5 && prog < 0.92 ? 1 : 0;
      const grip = swinging ? smooth(prog / 0.3) * (prog < 0.5 ? 1 : 0) : 0; // the crouch before she rides
      body.position.y = liftCur + 0.03 * Math.sin(t * 1.1) - 0.22 * grip - 0.18 * dropped;
      // She glides rather than walks: a slow sway, the habit swinging.
      body.rotation.z = 0.03 * Math.sin(walkPhase * 0.6) * moveK + (rage ? 0.012 * Math.sin(t * 19) : 0);
      // On the rope: tilted back on the way up the arc, forward on the drop.
      const qa = swinging ? clamp01((prog - 0.5) / 0.42) : 0;
      body.rotation.x = 0.08 * grip + ride * (-0.35 + 0.7 * qa) + 0.25 * dropped - 0.06 * entering;
      // The habit trails the swing and flares on the landing.
      robe.rotation.x = ride * (-0.4 + 0.25 * qa) + 0.1 * dropped;
      skirt.scale.set(1 + 0.12 * ride + 0.14 * dropped, 1 - 0.06 * ride, 1 + 0.12 * ride + 0.14 * dropped);
      // The wimple's wings: still at rest, lifting on the swing, shivering raged.
      for (const w of wings) {
        w.g.rotation.z = w.side * (0.06 * ride + 0.12 * pealK * prog - 0.08 * rung) + (rage ? w.side * 0.02 * Math.sin(t * 23) : 0);
        w.g.rotation.x = -0.25 * ride + 0.1 * dropped;
      }
      head.rotation.x = 0.28 * entering + 0.06 * Math.sin(t * 0.7) - 0.15 * pealK + 0.1 * rung;
      // The rope arm: up at the rope always, both hands on it before the ride.
      armL.rotation.x = -2.6 - 0.25 * grip + 0.15 * Math.sin(t * 0.8) * (1 - swingK);
      armL.rotation.z = -0.25 + 0.15 * grip;
      // The rope leans to its anchor: over the middle of the lane on the
      // swing (she faces down it), straight up otherwise, swaying a little.
      let lean = 0;
      let len = ROPE_TOP - 2.6;
      if (swinging && tel && e) {
        const L = tel.length ?? 4;
        const along = (e.x - (tel.fromX ?? e.x)) * (tel.dirX ?? 0) + (e.z - (tel.fromZ ?? e.z)) * (tel.dirZ ?? 1);
        const ahead = L / 2 - along;
        const up = Math.max(1.5, ROPE_TOP - 2.6 - liftCur);
        lean = Math.atan2(ahead, up);
        len = Math.hypot(ahead, up);
      } else {
        swayV += (-9 * sway - 1.6 * swayV + (dropped > 0.9 ? -6 : 0)) * dt;
        sway += swayV * dt;
        lean = sway + 0.04 * Math.sin(t * 0.9);
      }
      // (The rope's pivot sits under the raised arm: undo the arm's tilt so
      // the lean is the rope's own, in the body's frame.)
      ropePivot.rotation.x = -armL.rotation.x - body.rotation.x + lean;
      ropePivot.rotation.z = -armL.rotation.z;
      rope.scale.y = len;
      tail.rotation.x = 0.2 * Math.sin(t * 1.3) - 0.5 * ride;
      sg.material.opacity = 0.3 + 0.4 * swingK + 0.5 * dropped + (rage ? 0.22 + 0.12 * Math.sin(t * 9) : 0);
      sg.scale.setScalar(1 + 0.6 * swingK * prog + 0.6 * dropped);
      // The bell arm: raised up and back through the peal's warning, rung
      // down and out at its end; the clapper swings on its own.
      armR.rotation.x = -0.35 - 2.2 * pealK * smooth(prog / 0.6) + 1.3 * rung;
      armR.rotation.z = 0.18 + 0.25 * pealK;
      ringV += (-40 * ring - 3 * ringV + pealK * 30 * Math.sin(t * 14) * prog + (rung > 0.9 ? 60 : 0)) * dt;
      ring += ringV * dt;
      ring = Math.max(-0.7, Math.min(0.7, ring));
      bellG.rotation.x = -armR.rotation.x * 0.5 + ring;
      clapper.rotation.x = -ring * 0.8;
      peal.material.opacity = 0.35 * pealK * prog + 0.9 * rung;
      peal.scale.setScalar(1 + 1.4 * rung);
    },
  };
}

// ================================================ THE EMBER KILN'S TWO --
// (content plan 5 slice 9) The Kiln's heat is KILN GOLD over banked COAL
// (palette.js "The Ember Kiln"), never Ember: the same coal -> gold ->
// white-hot ramp as render/enemies/kiln.js, the two never mixed at full
// value (their blend is Ember's orange).
const KC = Object.freeze({
  iron: new Color(VFX_MATTER.slag).lerp(slate(0.18, 0.3), 0.18).multiplyScalar(1.35),
  ironDark: new Color(VFX_MATTER.slag).lerp(slate(0.2, 0.2), 0.15).multiplyScalar(0.82),
  ironRim: new Color(VFX_MATTER.kilnbrick).lerp(new Color(PALETTE.warmGrey), 0.35).multiplyScalar(1.15),
  impSkin: new Color(VFX_MATTER.bellows).lerp(slate(0.18, 0.3), 0.3).multiplyScalar(1.15),
  impDark: new Color(VFX_MATTER.bellows).lerp(slate(0.2, 0.2), 0.35).multiplyScalar(0.62),
  leather: new Color(VFX_MATTER.bellows).lerp(new Color(VFX_MATTER.kilnbrick), 0.4).multiplyScalar(0.7),
  brass: new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.3), 0.15).multiplyScalar(0.95),
  coal: new Color(VFX_MATTER.coal),
  coalDim: new Color(VFX_MATTER.coal).multiplyScalar(0.55),
  gold: new Color(VFX_MATTER.kilngold),
  heat: new Color(VFX_MATTER.kilnheat),
});
const _hk = new Color();
// coal (0) -> kiln gold (0.6) -> white-hot (1).
function heatColor(out, k) {
  const h = Math.max(0, k);
  if (h <= 0.22) return out.copy(KC.coalDim).lerp(KC.coal, clamp01(h / 0.22));
  if (h <= 0.34) {
    const u = (h - 0.22) / 0.12;
    return out.copy(KC.coal).multiplyScalar(1 - 0.7 * u).lerp(_hk.copy(KC.gold).multiplyScalar(0.3), u);
  }
  if (h <= 0.6) return out.copy(KC.gold).multiplyScalar(0.3 + 0.7 * ((h - 0.34) / 0.26));
  return out.copy(KC.gold).lerp(KC.heat, clamp01((h - 0.6) / 0.4));
}
const heatMat = (k) => {
  const m = new MeshBasicMaterial({ color: new Color(), toneMapped: false });
  heatColor(m.color, k);
  return m;
};

// ------------------------------------------------------ FURNACE KNIGHT --
export function buildFurnaceKnight() {
  const s = shell('furnace_knight');
  const { rig, track } = s;
  const iron = track(flashable(KC.iron));
  const ironDark = track(flashable(KC.ironDark));
  const rim = track(flashable(KC.ironRim));
  const core = heatMat(0.55); // the furnace behind the grate (animated)
  const seam = heatMat(0.4); // the molten seams in its greaves and helm slit
  const body = new Group();
  rig.add(body);
  // Legs: thick greaves on short thighs, a molten seam round each knee.
  const legs = [];
  for (const side of [-1, 1]) {
    const L = leg(ironDark, 0.62, 0.66, 0.2);
    L.hip.position.set(side * 0.34, 1.32, 0);
    body.add(L.hip);
    const greave = new Mesh(shared('fk-greave', () => new CylinderGeometry(0.2, 0.27, 0.5, 7).translate(0, -0.3, 0)), iron);
    addInk(greave);
    L.knee.add(greave);
    const ring = new Mesh(shared('fk-seam', () => new TorusGeometry(0.2, 0.03, 4, 12).rotateX(Math.PI / 2)), seam);
    ring.position.y = -0.04;
    L.knee.add(ring);
    const boot = new Mesh(shared('fk-boot', () => new BoxGeometry(0.34, 0.16, 0.5).translate(0, 0, 0.06)), ironDark);
    boot.position.y = -0.62;
    addInk(boot);
    L.knee.add(boot);
    legs.push({ ...L, side });
  }
  const hips = new Mesh(shared('fk-hips', () => new BoxGeometry(0.86, 0.34, 0.56)), ironDark);
  hips.position.y = 1.36;
  addInk(hips);
  body.add(hips);
  // Torso: a broad barrel chest, top-heavy, the grate in front.
  const torso = new Group();
  torso.position.y = 1.5;
  body.add(torso);
  const chest = new Mesh(shared('fk-chest', () => new CylinderGeometry(0.66, 0.48, 0.95, 8).translate(0, 0.48, 0)), iron);
  chest.scale.z = 0.78;
  addInk(chest);
  torso.add(chest);
  const gorget = new Mesh(shared('fk-gorget', () => new CylinderGeometry(0.36, 0.5, 0.18, 8)), rim);
  gorget.position.y = 1.0;
  torso.add(gorget);
  // The furnace: a glowing core box set into the chest, its light spilling.
  const furnace = new Group();
  furnace.position.set(0, 0.5, 0.42);
  torso.add(furnace);
  const coreM = new Mesh(shared('fk-core', () => new BoxGeometry(0.5, 0.46, 0.08)), core);
  furnace.add(coreM);
  const frame = new Mesh(shared('fk-frame', () => new TorusGeometry(0.33, 0.05, 4, 4).rotateZ(Math.PI / 4)), rim);
  frame.scale.set(1, 0.95, 1);
  frame.position.z = 0.04;
  furnace.add(frame);
  // The grate: two doors of bars, hinged at the sides (they swing open).
  const doors = [];
  for (const side of [-1, 1]) {
    const hinge = new Group();
    hinge.position.set(side * 0.26, 0, 0.06);
    furnace.add(hinge);
    for (let b = 0; b < 3; b++) {
      const bar = new Mesh(shared('fk-bar', () => new BoxGeometry(0.045, 0.5, 0.05)), ironDark);
      bar.position.x = -side * (0.04 + b * 0.085);
      hinge.add(bar);
    }
    const cross = new Mesh(shared('fk-cross', () => new BoxGeometry(0.26, 0.05, 0.05).translate(0.13, 0, 0)), ironDark);
    cross.scale.x = -side;
    hinge.add(cross);
    doors.push({ hinge, side });
  }
  const glow = softGlow(VFX_MATTER.kilngold, 1.6, 0.35);
  glow.position.z = 0.16;
  furnace.add(glow);
  // Pauldrons: great riveted domes, the bulk of the silhouette.
  const arms = [];
  for (const side of [-1, 1]) {
    const pa = new Mesh(shared('fk-pauldron', () => new SphereGeometry(0.34, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58)), iron);
    pa.position.set(side * 0.68, 0.92, 0);
    pa.scale.set(1.15, 0.9, 1.05);
    addInk(pa);
    torso.add(pa);
    const lip = new Mesh(shared('fk-plip', () => new TorusGeometry(0.33, 0.035, 4, 12).rotateX(Math.PI / 2)), rim);
    lip.position.set(side * 0.68, 0.92, 0);
    lip.scale.set(1.15, 1, 1.05);
    torso.add(lip);
    const arm = new Group();
    arm.position.set(side * 0.66, 0.82, 0.04);
    torso.add(arm);
    const upper = new Mesh(shared('fk-arm', () => new CylinderGeometry(0.15, 0.13, 0.6, 6).translate(0, -0.3, 0)), ironDark);
    addInk(upper);
    arm.add(upper);
    const elbow = new Group();
    elbow.position.y = -0.58;
    arm.add(elbow);
    const fore = new Mesh(shared('fk-fore', () => new CylinderGeometry(0.17, 0.14, 0.5, 6).translate(0, -0.25, 0)), iron);
    addInk(fore);
    elbow.add(fore);
    const fist = new Mesh(shared('fk-fist', () => new BoxGeometry(0.22, 0.2, 0.22)), ironDark);
    fist.position.y = -0.54;
    elbow.add(fist);
    arms.push({ arm, elbow, side });
  }
  // Head: a squat bucket helm sunk between the pauldrons, a glowing slit,
  // and the indigo crack across its brow (the tell).
  const head = new Group();
  head.position.set(0, 1.18, 0.04);
  torso.add(head);
  const helm = new Mesh(shared('fk-helm', () => new CylinderGeometry(0.25, 0.28, 0.42, 8)), iron);
  addInk(helm);
  head.add(helm);
  const dome = new Mesh(shared('fk-dome', () => new SphereGeometry(0.25, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), rim);
  dome.position.y = 0.2;
  head.add(dome);
  const slit = new Mesh(shared('fk-slit', () => new BoxGeometry(0.34, 0.045, 0.04)), seam);
  slit.position.set(0, 0.02, 0.26);
  head.add(slit);
  const crack = new Mesh(shared('fk-crack', () => new BoxGeometry(0.035, 0.22, 0.03)), tellMat());
  crack.position.set(0.07, 0.14, 0.255);
  crack.rotation.z = 0.5;
  head.add(crack);
  const cg = tellGlow(0.55, 0.32);
  cg.position.set(0.07, 0.14, 0.3);
  head.add(cg);
  // The sledge: a long iron haft held across the body in both fists, a
  // great anvil-faced head with a molten face.
  const sledge = new Group();
  sledge.position.set(0, -0.1, 0.5);
  torso.add(sledge);
  const haft = new Mesh(shared('fk-haft', () => new CylinderGeometry(0.06, 0.07, 2.1, 6).translate(0, 0.45, 0)), ironDark);
  addInk(haft);
  sledge.add(haft);
  const hammer = new Group();
  hammer.position.y = 1.5;
  sledge.add(hammer);
  const block = new Mesh(shared('fk-block', () => new BoxGeometry(0.72, 0.36, 0.36)), iron);
  addInk(block);
  hammer.add(block);
  for (const side of [-1, 1]) {
    const face = new Mesh(shared('fk-face', () => new BoxGeometry(0.06, 0.3, 0.3)), seam);
    face.position.x = side * 0.38;
    hammer.add(face);
  }
  s.group.add(groundShadow(1.0, 0.9));
  const strike = clip();
  let lastT = null;
  let open = 0;
  let heat = 0.55;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const k = strike(t, e ? e.moveTick : -1, 0.5);
      const last = e ? e.lastMove : null;
      const prog = progress(e, tick);
      const rushK = moving(e, 'molten_rush') ? telegraphK : 0;
      const blastK = moving(e, 'grate_blast') ? telegraphK : 0;
      const charging = !!(e && (e.charge || e.mode === 'charge'));
      const blasted = last === 'grate_blast' ? k : 0;
      const ran = last === 'molten_rush' && !charging ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      const entering = e && e.mode === 'enter' ? 1 : 0;
      const run = charging ? 1 : 0;
      const gait = charging ? t * 14 : walkPhase;
      const walk = charging ? 1 : moveK;
      // Heavy plod: the whole mass drops on each step.
      for (const L of legs) {
        const ph = gait + (L.side > 0 ? Math.PI : 0);
        L.hip.rotation.x = Math.sin(ph) * (0.42 + 0.25 * run) * walk - 0.3 * rushK * smooth(prog / 0.5);
        L.knee.rotation.x = Math.max(0, -Math.cos(ph)) * 0.7 * walk + 0.4 * rushK * smooth(prog / 0.5);
      }
      const bob = 0.05 * Math.abs(Math.sin(gait)) * walk;
      body.position.y = -bob - 0.16 * rushK * smooth(prog / 0.5) + 0.02 * Math.sin(t * 1.2) - 0.1 * blasted;
      // Hunched over the sledge for the rush, head down on the run; reared
      // back for the blast, then thrown forward as the furnace roars.
      body.rotation.x = 0.3 * rushK * smooth(prog / 0.6) + 0.42 * run + 0.18 * ran - 0.26 * blastK * smooth(prog / 0.7) + 0.2 * blasted + 0.06 * entering;
      body.rotation.z = rage ? 0.015 * Math.sin(t * 17) : 0.03 * Math.sin(walkPhase * 0.5) * moveK;
      torso.rotation.y = 0.06 * Math.sin(t * 0.6) * (1 - rushK);
      head.rotation.x = -0.25 * run - 0.15 * rushK + 0.12 * blastK - 0.3 * entering;
      // Arms carry the sledge: across the chest at rest, levelled forward
      // like a ram for the rush, lifted clear of the grate for the blast.
      const levelled = Math.max(rushK * smooth(prog / 0.5), run);
      const lifted = blastK * smooth(prog / 0.4);
      for (const A of arms) {
        A.arm.rotation.x = -0.45 - 0.5 * levelled - 1.7 * lifted + 0.8 * blasted;
        A.arm.rotation.z = A.side * (0.25 * (1 - lifted) + 0.3 * lifted);
        A.elbow.rotation.x = -0.9 + 0.3 * levelled - 0.3 * lifted;
      }
      // (At rest the haft crosses the body low, head up by its left
      // shoulder; levelled, it points ahead like a ram; lifted, up and back.)
      sledge.rotation.z = 0.75 * (1 - levelled) * (1 - lifted) + 0.05 * Math.sin(t * 0.8);
      sledge.rotation.x = 0.25 * (1 - levelled) * (1 - lifted) + 1.25 * levelled - 0.3 * lifted;
      sledge.position.y = -0.1 + 0.2 * levelled + 1.0 * lifted;
      sledge.position.z = 0.5 + 0.1 * levelled;
      // The grate swings open through the blast's warning, slams shut after.
      const wantOpen = blastK ? smooth((prog - 0.25) / 0.6) : blasted;
      open = approach(open, wantOpen, wantOpen > open ? 14 : 5, dt);
      for (const d of doors) d.hinge.rotation.y = -d.side * 1.6 * open;
      // The furnace: banked gold at rest, breathing; white-hot as the grate
      // opens; a flare on the blast; brighter raged, and on the run.
      const want = 0.5 + 0.06 * Math.sin(t * 2.3) + 0.45 * open + 0.4 * blasted + 0.12 * rage + 0.1 * run;
      heat = approach(heat, want, 12, dt);
      heatColor(core.color, heat);
      heatColor(seam.color, 0.4 + 0.15 * run + 0.1 * rage + 0.05 * Math.sin(t * 3.1));
      glow.material.opacity = 0.25 + 0.5 * open + 0.5 * blasted + 0.1 * rage;
      glow.scale.setScalar(1 + 0.9 * open + 1.2 * blasted);
      cg.material.opacity = 0.3 + 0.25 * (rushK + blastK) + (rage ? 0.25 + 0.12 * Math.sin(t * 9) : 0);
    },
  };
}

// --------------------------------------------------------- GLASSBLOWER --
export function buildGlassblower() {
  const s = shell('glassblower');
  const { rig, track } = s;
  const skin = track(flashable(KC.impSkin));
  const dark = track(flashable(KC.impDark));
  const leather = track(flashable(KC.leather));
  const brass = track(flashable(KC.brass));
  const pipeM = track(flashable(KC.ironDark));
  const gatherM = heatMat(0.62); // the molten gather (animated)
  rig.scale.setScalar(1.12); // lanky, but it must hold its own beside the others
  const tipM = heatMat(0.3); // the pipe's end, hot on the gout
  const body = new Group();
  rig.add(body);
  // Long backward-jointed legs, splayed toes.
  const legs = [];
  for (const side of [-1, 1]) {
    const L = leg(dark, 0.78, 0.86, 0.1);
    L.hip.position.set(side * 0.2, 1.62, 0);
    body.add(L.hip);
    const toe = new Mesh(shared('gb-toe', () => new ConeGeometry(0.09, 0.32, 5).rotateX(Math.PI / 2).translate(0, 0, 0.12)), dark);
    toe.position.y = -0.86;
    L.knee.add(toe);
    legs.push({ ...L, side });
  }
  // A hunched narrow torso; the scorched apron hangs down its front.
  const torso = new Group();
  torso.position.y = 1.62;
  body.add(torso);
  const trunk = new Mesh(shared('gb-trunk', () => new CylinderGeometry(0.28, 0.2, 0.74, 7).translate(0, 0.37, 0)), skin);
  addInk(trunk);
  torso.add(trunk);
  const apron = new Mesh(shared('gb-apron', () => new BoxGeometry(0.56, 1.1, 0.06).translate(0, -0.44, 0)), leather);
  apron.position.set(0, 0.62, 0.25);
  addInk(apron);
  torso.add(apron);
  const strap = new Mesh(shared('gb-strap', () => new TorusGeometry(0.21, 0.025, 4, 12).rotateX(Math.PI / 2)), brass);
  strap.position.y = 0.3;
  torso.add(strap);
  // Head: a long imp head with swept ears, goggles pushed down over the eyes
  // (one lens the indigo tell), cheeks that puff when it blows.
  const head = new Group();
  head.position.set(0, 0.84, 0.08);
  torso.add(head);
  const skull = new Mesh(shared('gb-skull', () => new SphereGeometry(0.2, 9, 7)), skin);
  skull.scale.set(1, 0.95, 1.2);
  addInk(skull);
  head.add(skull);
  const snout = new Mesh(shared('gb-snout', () => new ConeGeometry(0.1, 0.22, 6).rotateX(Math.PI / 2).translate(0, 0, 0.1)), skin);
  snout.position.set(0, -0.06, 0.18);
  head.add(snout);
  const cheeks = [];
  for (const side of [-1, 1]) {
    const ear = new Mesh(shared('gb-ear', () => new ConeGeometry(0.07, 0.4, 4).translate(0, 0.2, 0)), dark);
    ear.position.set(side * 0.16, 0.1, -0.06);
    ear.rotation.set(-0.7, 0, -side * 0.9);
    head.add(ear);
    const cheek = new Mesh(shared('gb-cheek', () => new SphereGeometry(0.075, 6, 5)), skin);
    cheek.position.set(side * 0.1, -0.08, 0.16);
    head.add(cheek);
    cheeks.push(cheek);
    const lens = new Mesh(shared('gb-lens', () => new CylinderGeometry(0.07, 0.07, 0.06, 8).rotateX(Math.PI / 2)), side > 0 ? tellMat() : brass);
    lens.position.set(side * 0.09, 0.05, 0.21);
    head.add(lens);
    const rimL = new Mesh(shared('gb-lrim', () => new TorusGeometry(0.075, 0.018, 4, 10)), brass);
    rimL.position.set(side * 0.09, 0.05, 0.245);
    head.add(rimL);
  }
  const lg = tellGlow(0.45, 0.3);
  lg.position.set(0.09, 0.05, 0.3);
  head.add(lg);
  const band = new Mesh(shared('gb-band', () => new TorusGeometry(0.2, 0.02, 4, 14)), leather);
  band.rotation.x = 0.25;
  band.position.y = 0.05;
  head.add(band);
  // Arms: long and thin, both hands on the pipe.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new Group();
    arm.position.set(side * 0.24, 0.6, 0.04);
    torso.add(arm);
    const upper = new Mesh(shared('gb-arm', () => new CylinderGeometry(0.055, 0.05, 0.62, 5).translate(0, -0.31, 0)), skin);
    addInk(upper);
    arm.add(upper);
    const elbow = new Group();
    elbow.position.y = -0.6;
    arm.add(elbow);
    const fore = new Mesh(shared('gb-fore', () => new CylinderGeometry(0.05, 0.04, 0.58, 5).translate(0, -0.29, 0)), skin);
    addInk(fore);
    elbow.add(fore);
    const glove = new Mesh(shared('gb-glove', () => new SphereGeometry(0.075, 6, 5)), leather);
    glove.position.y = -0.6;
    elbow.add(glove);
    arms.push({ arm, elbow, side });
  }
  // The blowpipe: from its lips out and down, the gather on its far end.
  const pipe = new Group();
  pipe.position.set(0, -0.08, 0.22); // at the mouth
  head.add(pipe);
  const tube = new Mesh(shared('gb-tube', () => new CylinderGeometry(0.035, 0.04, 1.6, 6).rotateX(Math.PI / 2).translate(0, 0, 0.8)), pipeM);
  addInk(tube);
  pipe.add(tube);
  const tip = new Mesh(shared('gb-tip', () => new CylinderGeometry(0.055, 0.045, 0.24, 6).rotateX(Math.PI / 2).translate(0, 0, 1.5)), tipM);
  pipe.add(tip);
  const gather = new Group();
  gather.position.z = 1.72;
  pipe.add(gather);
  const blob = new Mesh(shared('gb-gather', () => new IcosahedronGeometry(0.19, 1)), gatherM);
  gather.add(blob);
  // The bubble: a glassy shell blown round the gather on the warning.
  const bubbleM = new MeshBasicMaterial({ color: new Color(VFX_MATTER.kilngold).multiplyScalar(0.5), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const bubble = new Mesh(shared('gb-bubble', () => new SphereGeometry(0.3, 12, 9)), bubbleM);
  gather.add(bubble);
  const ggl = softGlow(VFX_MATTER.kilngold, 0.9, 0.4);
  gather.add(ggl);
  s.group.add(groundShadow(0.7, 0.7));
  const strike = clip();
  let lastT = null;
  let swell = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick = 0, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const k = strike(t, e ? e.moveTick : -1, 0.45);
      const last = e ? e.lastMove : null;
      const prog = progress(e, tick);
      const bubK = moving(e, 'glass_bubble') ? telegraphK : 0;
      const goutK = moving(e, 'glass_gout') ? telegraphK : 0;
      const loosed = last === 'glass_bubble' ? k : 0;
      const sprayed = last === 'glass_gout' ? k : 0;
      const rage = e && e.rage ? 1 : 0;
      const entering = e && e.mode === 'enter' ? 1 : 0;
      // A loping, springy gait on its long legs.
      for (const L of legs) {
        const ph = walkPhase + (L.side > 0 ? Math.PI : 0);
        L.hip.rotation.x = -0.25 + Math.sin(ph) * 0.5 * moveK;
        L.knee.rotation.x = 0.55 + Math.max(0, Math.cos(ph)) * 0.5 * moveK;
      }
      body.position.y = -0.1 + 0.07 * Math.abs(Math.sin(walkPhase)) * moveK + 0.025 * Math.sin(t * 1.6);
      // Hunched over the pipe; it leans into a blow and rocks back on the
      // gout's recoil.
      body.rotation.x = 0.22 + 0.12 * bubK * prog - 0.25 * sprayed + 0.08 * goutK - 0.1 * entering;
      body.rotation.z = rage ? 0.02 * Math.sin(t * 21) : 0.04 * Math.sin(walkPhase * 0.5) * moveK;
      head.rotation.x = 0.1 * Math.sin(t * 0.9) - 0.1 * goutK + 0.05 * bubK - 0.3 * entering;
      // The pipe: tilted down at rest (the gather near the floor, turning so
      // it never drips), raised up and out for the bubble, levelled at the
      // mark for the gout.
      const raise = bubK * smooth(prog / 0.5);
      const level = goutK * smooth(prog / 0.4);
      pipe.rotation.x = 0.6 * (1 - raise) * (1 - level) - 0.55 * raise + 0.38 * level + 0.25 * loosed - 0.18 * sprayed + 0.04 * Math.sin(t * 1.3);
      pipe.rotation.z = 0.25 * Math.sin(t * 2.2) * (1 - raise) * (1 - level);
      tube.rotation.z = t * 3; // the pipe is always turning
      // Both arms reach straight along the pipe (hands on it, under it).
      const along = pipe.rotation.x + head.rotation.x - Math.PI / 2;
      for (const A of arms) {
        A.arm.rotation.x = along;
        A.arm.rotation.z = -A.side * 0.16;
        A.elbow.rotation.x = -0.12;
      }
      // Cheeks puff as it blows; the gather swells into a bubble and is let
      // go at the end (the VFX carries it to the mark).
      const want = bubK ? smooth(prog / 0.85) : 0;
      swell = approach(swell, want, want > swell ? 10 : 22, dt);
      for (const c of cheeks) c.scale.setScalar(1 + 0.6 * swell + 0.3 * goutK * prog);
      blob.scale.setScalar(1 + 0.5 * swell - 0.5 * loosed + 0.12 * Math.sin(t * 4));
      bubble.scale.setScalar(0.4 + 1.8 * swell);
      bubbleM.opacity = 0.28 * swell;
      heatColor(gatherM.color, 0.6 + 0.18 * swell + 0.08 * Math.sin(t * 3) + 0.1 * rage);
      heatColor(tipM.color, 0.3 + 0.65 * goutK * smooth(prog / 0.6) + 0.5 * sprayed);
      ggl.material.opacity = 0.32 + 0.18 * swell + 0.4 * sprayed + 0.1 * rage;
      ggl.scale.setScalar(1 + 0.7 * swell + 0.6 * sprayed);
      lg.material.opacity = 0.3 + 0.3 * (bubK + goutK) + (rage ? 0.25 + 0.12 * Math.sin(t * 9) : 0);
    },
  };
}

export const SECOND_CHAMPION_BUILDERS = Object.freeze({
  moss_hart: buildMossHart,
  lockkeeper: buildLockkeeper,
  gravebell_ringer: buildGravebellRinger,
  vein_matron: buildVeinMatron,
  bell_abbess: buildBellAbbess,
  furnace_knight: buildFurnaceKnight,
  glassblower: buildGlassblower,
});
// Crown height per champion (world u above the ground at rest).
export const SECOND_CHAMPION_CROWN_Y = Object.freeze({ moss_hart: 3.55, lockkeeper: 3.25, gravebell_ringer: 3.6, vein_matron: 3.3, bell_abbess: 3.45, furnace_knight: 3.35, glassblower: 3.15 });
