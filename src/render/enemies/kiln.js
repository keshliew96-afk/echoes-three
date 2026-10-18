// The Ember Kiln's enemy rigs (docs/KILN.md): Ember Newt, Slag Golem,
// Bellows Imp, Cinder Moth. Same grammar as render/enemies/spire.js: flat-
// faceted toon primitives, charcoal ink on the big masses, a contact shadow,
// flashable materials in `mats`, shared geometry, and exactly ONE small
// indigo corruption tell each.
//
// THE KILN'S LIGHT. This is a fire land beside a red-orange threat colour, so
// nothing here glows Ember: the creatures' own heat is KILN GOLD (palette
// VFX_MATTER kilngold / kilnheat / sparks, hue 36-46) over banked COAL
// crimson (hue ~352). The ramp is coal -> gold -> white-hot; Ember stays the
// telegraphs' alone (drawn by the shared shapes, never here). The bodies are
// the Kiln's low-chroma matter (newthide / slag / bellows / mothash) pulled a
// step toward the cool slate family and lifted in value so they read off the
// smoke-dark brick floor; the glow parts are unlit (MeshBasic, never in
// `mats`, so the hit flash cannot wash them out).
//   newt        a small sooty fire lizard, a coal-bright belly showing as a
//               lit rim under its flanks, live coals down its spine, a glowing
//               tail tip; an indigo crown scale. Skitters with a lizard's S;
//               crouches for the lunge (belly heating white, tail raised and
//               whipping, haunches wiggling); the lunge is a stretched dart
//               with its legs swept back and a white-gold streak behind it;
//               resting at the lane's end its flanks heave and its jaw pants
//   slag        a hunched heap of cooled grey-black slag on stubby legs, long
//               arms ending in slag boulders; the molten core sits in a crater
//               in its back under five crust plates, dim crimson seams when it
//               is shut. Plods with a heavy sway; rears with both fists up for
//               the slam and brings them down. While its core is open (the
//               punish window) the crust plates are thrown back, the crater is
//               white-gold and lights the floor; the plates knit back down
//               over the last half second. An indigo shard in its back
//   bellows     a pot-bellied sooty imp with long ears and stub horns, a
//               leather bellows strapped to its back, its brass nozzle over
//               its right shoulder. It waddles; planted for the fan it pumps,
//               faster and faster, each squeeze puffing gold from the nozzle,
//               the nozzle heating to white; the fan slams the boards shut and
//               rocks it back. Indigo slit eyes
//   cindermoth  a moth with wings of glowing ash (pale ash panes, gold fire in
//               the veins and centre), a smouldering abdomen dripping cinders,
//               feathered antennae; an indigo mark on its back. It flutters on
//               fast beats; kindling it hangs still, wings spread flat and
//               trembling, heating to white; the flare flashes it open; spent
//               it is a dull grey husk sagging low on slow beats, until the
//               coals creep back into its veins just before it relights
//   hurler      (content plan 5 slice 9) a squat soot-black imp, a stockier
//               cousin of the Bellows Imp, with big hands and a lumpy sack of
//               live coals over its left shoulder, gold showing through the
//               holes in the sack. It sidles; for the throw it plants, heaves
//               the sack back over its head (the coals heating to white),
//               then hurls it forward on the throw; a fumble drops it. An
//               indigo stitch on the sack
//   ashwraith   (content plan 5 slice 9) a tall, thin, hunched shape of grey
//               ash round a last gold ember in its chest, long cinder claws,
//               a ragged ash skirt trailing where legs would be; it hovers.
//               Fading it collapses into a turning swirl of ash and is gone
//               (only a faint swirl where it went); it rises whole at the
//               mark, claws already raking; spent it slumps, the ember dim,
//               until the heat creeps back. Indigo pin-eyes
// Faces +Z; the layer drives `pose({ t, tick, walkPhase, moveK, telegraphK,
// fireK, e })` (`e` = the sim entity, READ ONLY; the Journal's viewer passes
// an idle stand-in, so every field read here has a default).
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  Vector2,
} from 'three';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor } from '../critters/common.js';
import { markShared } from '../geocache.js';
import { PALETTE, VFX_MATTER } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';

const flashable = (color, extra = {}) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0, ...extra });
const inkMat = () => new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
const tellMat = () => new MeshBasicMaterial({ color: TELL_INDIGO.clone(), toneMapped: false });
function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}
// Unlit heat: a solid lit part (belly, core, eyes, nozzle) and an additive
// one (wing fire, streaks, floor light).
const heatMat = (c) => new MeshBasicMaterial({ color: c.clone(), toneMapped: false });
const addMat = (c, opacity = 0, extra = {}) =>
  new MeshBasicMaterial({ color: c.clone(), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, ...extra });
function heatGlow(size, opacity = 0) {
  const g = makeGlowSprite({ color: VFX_MATTER.kilngold, size, opacity });
  g.material.toneMapped = false;
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
// A flat additive pool of light on the floor (radial falloff), 1 u across.
function floorLight(color, opacity = 0) {
  const m = new Mesh(
    shared('kn-floorlight', () => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
    addMat(color, opacity, { map: getRadialTexture(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  );
  m.position.y = 0.03;
  m.renderOrder = 2;
  return m;
}
function rod(a, b, r = 0.012, seg = 4) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1e-3;
  const g = new CylinderGeometry(r, r, len, seg);
  const pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  const yaw = Math.atan2(dx, dz);
  g.rotateX(pitch).rotateY(yaw);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}
function plate(points, depth = 0.025) {
  const sh = new Shape(points.map(([x, y]) => new Vector2(x, y)));
  const g = new ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
function slitEyes(parent, { x = 0.1, y = 0, z = 0.1, len = 0.08, slant = 0.4, mat = null, thick = 0.024 } = {}) {
  const g = shared(`kn-eye:${thick}`, () => new BoxGeometry(1, thick, thick));
  const m = mat ?? inkMat();
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, m);
    eye.scale.x = len;
    eye.position.set(side * x, y, z);
    eye.rotation.set(0, side * -0.3, side * slant);
    parent.add(eye);
    eyes.push(eye);
  }
  return eyes;
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
// One-shot clip clock off a sim tick field (lungeTick / slamTick / ...).
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
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const approach = (cur, to, rate, dt) => cur + (to - cur) * (1 - Math.exp(-rate * dt));
// Telegraph progress 0..1 off the sim's own clock.
function teleProg(e, tick) {
  const tg = e && e.telegraph;
  if (!tg || tick == null) return 0;
  const span = (tg.resolveTick ?? 0) - (tg.startTick ?? 0);
  return span > 0 ? clamp01((tick - tg.startTick) / span) : 0;
}
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const slate = new Color().setHSL(0.6, 0.18, 0.32);
// A Kiln body tone: the matter, a step toward slate, lifted in value.
const body = (hex, k, mul) => new Color(hex).lerp(slate, k).multiplyScalar(mul);
const C = Object.freeze({
  // Ember Newt: sooty hide, darker back plates and limbs.
  newtHide: body(VFX_MATTER.newthide, 0.22, 1.55),
  newtDark: body(VFX_MATTER.newthide, 0.3, 0.92),
  // Slag Golem: grey-black crust, ashen cooled edges on the plates.
  slag: body(VFX_MATTER.slag, 0.12, 1.75),
  slagDark: body(VFX_MATTER.slag, 0.1, 1.05),
  slagPale: new Color(VFX_MATTER.slag).lerp(new Color(PALETTE.bone), 0.3).lerp(slate, 0.1).multiplyScalar(1.35),
  // Bellows Imp: soot-umber skin, scorched leather, smoke-dark boards, brass.
  impSkin: body(VFX_MATTER.bellows, 0.3, 1.25),
  impDark: body(VFX_MATTER.bellows, 0.35, 0.72),
  leather: body(VFX_MATTER.bellows, 0.15, 0.8),
  board: body(VFX_MATTER.oak, 0.25, 1.05),
  brass: new Color(VFX_MATTER.bellbronze).lerp(slate, 0.15).multiplyScalar(1.05),
  horn: new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.4).multiplyScalar(0.85),
  // Cinder Moth: pale ash wings, a dark fuzzy body; spent, a dull grey husk.
  mothAsh: body(VFX_MATTER.mothash, 0.08, 1.02),
  mothSpent: new Color(VFX_MATTER.mothash).lerp(new Color(PALETTE.voidCharcoal), 0.5).lerp(slate, 0.15),
  mothBody: body(VFX_MATTER.mothash, 0.2, 0.42),
  mothBodySpent: new Color(VFX_MATTER.mothash).lerp(new Color(PALETTE.voidCharcoal), 0.72),
  // Coal Hurler: soot-black skin lifted off the floor, a sooty sack.
  hurlerSkin: body(VFX_MATTER.hurlerhide, 0.25, 1.18),
  hurlerDark: body(VFX_MATTER.hurlerhide, 0.3, 0.66),
  sack: body(VFX_MATTER.coalsack, 0.15, 1.1),
  // Ash Wraith: pale-grey ash, darker cinder claws.
  ash: body(VFX_MATTER.ashgrey, 0.1, 1.0),
  ashDark: body(VFX_MATTER.ashgrey, 0.2, 0.5),
  claw: new Color(VFX_MATTER.ashgrey).lerp(new Color(PALETTE.voidCharcoal), 0.55),
  // The heat ramp.
  coal: new Color(VFX_MATTER.coal),
  coalDim: new Color(VFX_MATTER.coal).multiplyScalar(0.55),
  gold: new Color(VFX_MATTER.kilngold),
  heat: new Color(VFX_MATTER.kilnheat),
  sparks: new Color(VFX_MATTER.sparks),
});
// coal (0) -> kiln gold (0.6) -> white-hot (1). Crimson and gold are never
// blended at full value (their mix is Ember's orange): the coal dims to a
// smoulder, the gold rises out of the dark, white-hot on top.
const _dk = new Color();
function heatColor(out, k) {
  const h = Math.max(0, k);
  if (h <= 0.22) return out.copy(C.coalDim).lerp(C.coal, clamp01(h / 0.22));
  if (h <= 0.34) {
    const u = (h - 0.22) / 0.12;
    return out.copy(C.coal).multiplyScalar(1 - 0.7 * u).lerp(_dk.copy(C.gold).multiplyScalar(0.3), u);
  }
  if (h <= 0.6) return out.copy(C.gold).multiplyScalar(0.3 + 0.7 * ((h - 0.34) / 0.26));
  return out.copy(C.gold).lerp(C.heat, clamp01((h - 0.6) / 0.4));
}

// --------------------------------------------------------------- NEWT --
const NEWT_TAIL = 5;
export function buildNewt() {
  const s = shell('newt');
  const { rig, track } = s;
  rig.scale.setScalar(1.2); // small, but it must read at play distance
  const hide = track(flashable(C.newtHide));
  const dark = track(flashable(C.newtDark));
  const bellyMat = heatMat(C.gold);
  const coalMat = heatMat(C.gold);
  const bodyG = new Group();
  bodyG.position.y = 0.17;
  rig.add(bodyG);
  // Torso: a low flat lozenge; the belly under it a touch wider, so its
  // coal-bright rim shows round the flanks from above.
  const torso = new Mesh(shared('nw-torso', () => new IcosahedronGeometry(0.13, 1)), hide);
  torso.scale.set(1.0, 0.6, 1.95);
  addInk(torso);
  bodyG.add(torso);
  const belly = new Mesh(shared('nw-belly', () => new SphereGeometry(0.13, 14, 8)), bellyMat);
  belly.scale.set(1.3, 0.46, 1.8);
  belly.position.y = -0.022;
  bodyG.add(belly);
  // Back plates down the spine with live coals between them.
  const plateG = shared('nw-plate', () => new BoxGeometry(0.1, 0.035, 0.07));
  const coalG = shared('nw-coal', () => new IcosahedronGeometry(0.036, 0));
  const coals = [];
  for (let i = 0; i < 4; i++) {
    const z = 0.15 - i * 0.1;
    const p = new Mesh(plateG, dark);
    p.position.set(0, 0.075 - Math.abs(z) * 0.08, z);
    p.rotation.x = 0.12;
    p.scale.x = 1 - i * 0.12;
    bodyG.add(p);
    const c = new Mesh(coalG, coalMat);
    c.position.set(0, 0.085 - Math.abs(z - 0.05) * 0.08, z - 0.05);
    c.scale.set(1.3, 0.8, 1);
    bodyG.add(c);
    coals.push(c);
  }
  // Head: a flat wedge skull, a hinged lower jaw with a lit mouth.
  const head = new Group();
  head.position.set(0, 0.015, 0.25);
  bodyG.add(head);
  const skull = new Mesh(shared('nw-skull', () => new IcosahedronGeometry(0.1, 1)), hide);
  skull.scale.set(0.95, 0.55, 1.35);
  skull.position.set(0, 0.012, 0.05);
  addInk(skull);
  head.add(skull);
  const mouthGlow = new Mesh(shared('nw-mouth', () => new BoxGeometry(0.1, 0.02, 0.12)), bellyMat);
  mouthGlow.position.set(0, -0.022, 0.07);
  head.add(mouthGlow);
  const jaw = new Group();
  jaw.position.set(0, -0.03, -0.01);
  head.add(jaw);
  const jawM = new Mesh(shared('nw-jaw', () => new BoxGeometry(0.13, 0.03, 0.17).translate(0, 0, 0.08)), dark);
  jaw.add(jawM);
  slitEyes(head, { x: 0.058, y: 0.04, z: 0.1, len: 0.05, slant: 0.35 });
  // The tell: one indigo scale on its crown.
  const crown = new Mesh(shared('nw-crown', () => new CylinderGeometry(0.024, 0.03, 0.014, 6)), tellMat());
  crown.position.set(0, 0.07, 0.02);
  head.add(crown);
  const crownGlow = tellGlow(0.26, 0.2);
  crownGlow.position.set(0, 0.1, 0.02);
  head.add(crownGlow);
  // Legs: four splayed limbs (hip -> mirror -> limb), elbows out.
  const legs = [];
  const upperG = shared('nw-upper', () => new CylinderGeometry(0.03, 0.026, 0.14, 5).rotateZ(Math.PI / 2).translate(0.07, 0, 0));
  const shinG = shared('nw-shin', () => new CylinderGeometry(0.024, 0.02, 0.13, 5).translate(0, -0.065, 0));
  const footG = shared('nw-foot', () => new BoxGeometry(0.07, 0.018, 0.06).translate(0.012, 0, 0.01));
  for (const front of [1, -1]) {
    for (const side of [-1, 1]) {
      const hip = new Group();
      hip.position.set(side * 0.09, -0.01, front * 0.12);
      bodyG.add(hip);
      const mirror = new Group();
      mirror.scale.x = side;
      hip.add(mirror);
      const limb = new Group();
      mirror.add(limb);
      limb.add(new Mesh(upperG, hide));
      const knee = new Group();
      knee.position.x = 0.135;
      limb.add(knee);
      knee.add(new Mesh(shinG, dark));
      const foot = new Mesh(footG, dark);
      foot.position.y = -0.13;
      knee.add(foot);
      legs.push({ limb, knee, side, front, ph: (front > 0 ? 0 : Math.PI) + (side > 0 ? 0 : Math.PI) });
    }
  }
  // Tail: a tapering chain with a glowing tip.
  const tail = [];
  let parent = new Group();
  parent.position.set(0, 0.0, -0.23);
  bodyG.add(parent);
  const tailG = shared('nw-tail', () => new CylinderGeometry(0.045, 0.06, 0.11, 6).rotateX(Math.PI / 2).translate(0, 0, -0.055));
  for (let i = 0; i < NEWT_TAIL; i++) {
    const j = new Group();
    if (i > 0) j.position.z = -0.1;
    parent.add(j);
    const m = new Mesh(tailG, i < 2 ? hide : dark);
    m.scale.set(1 - i * 0.17, 1 - i * 0.17, 1);
    j.add(m);
    tail.push(j);
    parent = j;
  }
  const tip = new Mesh(shared('nw-tip', () => new IcosahedronGeometry(0.03, 0)), coalMat);
  tip.position.z = -0.11;
  tip.scale.set(1, 1, 1.6);
  parent.add(tip);
  // Light: the belly's glow on the floor, a halo round it, the lunge streak.
  const floor = floorLight(C.gold, 0.2);
  floor.scale.set(0.9, 1, 1.25);
  rig.add(floor);
  const halo = heatGlow(0.75, 0.2);
  halo.position.set(0, 0.1, 0);
  bodyG.add(halo);
  const streakG = shared('kn-streak', () => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5));
  const streak = new Mesh(streakG, addMat(C.gold, 0, { map: getRadialTexture() }));
  streak.position.set(0, 0.14, -0.05);
  rig.add(streak);
  const streakCore = new Mesh(streakG, addMat(C.heat, 0, { map: getRadialTexture() }));
  streakCore.position.set(0, 0.15, -0.05);
  rig.add(streakCore);
  const shadow = groundShadow(0.26, 0.36, { deep: 1.6 });
  s.group.add(shadow);
  const dtOf = clock();
  const lungeAge = clip();
  let crouchK = 0;
  let lungeK = 0;
  let restK = 0;
  let heatK = 0.5;
  const _c = new Color();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, walkPhase = 0, moveK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'skitter';
      const la = lungeAge(e ? e.lungeTick : -1, dt);
      const prog = mode === 'crouch' ? teleProg(e, tick) : 0;
      crouchK = approach(crouchK, mode === 'crouch' ? 1 : 0, 12, dt);
      lungeK = approach(lungeK, mode === 'lunge' ? 1 : 0, 30, dt);
      restK = approach(restK, mode === 'rest' ? 1 : 0, 9, dt);
      // Breath at rest: fast, deep heaves that slow as it recovers.
      const breathRate = 9 - 3 * clamp01(la - 0.3);
      const breath = restK * Math.max(0, Math.sin(t * breathRate + id));
      // Heat: a steady coal glow, heating white through the crouch, white
      // on the lunge, pulsing with the breath at rest.
      const want = mode === 'lunge' ? 1.05 : mode === 'crouch' ? 0.55 + 0.5 * prog : mode === 'rest' ? 0.42 + 0.25 * breath : 0.5 + 0.06 * Math.sin(t * 2.3 + id);
      heatK = approach(heatK, want, mode === 'lunge' ? 30 : 6, dt);
      heatColor(bellyMat.color, heatK);
      heatColor(coalMat.color, heatK * 0.9 + 0.08 * Math.sin(t * 5 + id));
      for (let i = 0; i < coals.length; i++) coals[i].scale.setScalar(0.85 + 0.25 * clamp01(heatK - 0.4 + 0.1 * Math.sin(t * 4 - i)));
      halo.material.opacity = 0.2 + 0.45 * clamp01(heatK - 0.3);
      halo.scale.setScalar(0.6 + 0.6 * heatK);
      floor.material.opacity = 0.1 + 0.32 * clamp01(heatK - 0.3);
      floor.material.color.copy(heatColor(_c, Math.min(0.7, heatK)));
      // Gait: a lizard's diagonal trot with an S through the spine.
      const go = moveK * (1 - crouchK) * (1 - lungeK) * (1 - restK);
      const gp = walkPhase * 2.2;
      bodyG.position.y = 0.17 + 0.012 * Math.abs(Math.sin(gp)) * go - 0.075 * crouchK + 0.035 * lungeK - 0.06 * restK;
      // The crouch: front low, the haunches wiggling over the last half.
      const wig = crouchK * smooth((prog - 0.45) / 0.4);
      bodyG.rotation.x = 0.1 * crouchK - 0.05 * lungeK - 0.06 * restK;
      bodyG.rotation.y = 0.22 * Math.sin(gp) * go + 0.09 * Math.sin(t * 30) * wig;
      bodyG.rotation.z = 0.05 * Math.sin(t * 30 + 1) * wig;
      const heave = 1 + 0.14 * breath;
      torso.scale.set(1.0 * (1 - 0.14 * lungeK) * heave, 0.6 * (1 + 0.08 * breath), 1.95 * (1 + 0.24 * lungeK));
      belly.scale.set(1.3 * (1 - 0.14 * lungeK) * heave, 0.46, 1.8 * (1 + 0.24 * lungeK));
      // Legs: trot; coiled under it for the crouch; swept back flat in the
      // lunge; splayed out loose at rest.
      for (const L of legs) {
        const sw = Math.sin(gp + L.ph);
        const lift = Math.max(0, Math.cos(gp + L.ph));
        L.limb.rotation.y = 0.55 * sw * go + (L.front > 0 ? 0.25 : -0.15) * crouchK + 1.15 * lungeK;
        L.limb.rotation.z = 0.35 * lift * go + 0.45 * crouchK + 0.15 * lungeK - 0.2 * restK;
        L.knee.rotation.z = -0.2 * lift * go - 0.55 * crouchK + 0.9 * lungeK + 0.2 * restK;
      }
      // Head: aimed low through the crouch, jaws open on the lunge (the
      // bite), panting at rest.
      head.rotation.x = 0.16 * crouchK - 0.1 * lungeK - 0.18 * restK;
      head.rotation.y = -0.18 * Math.sin(gp) * go;
      jaw.rotation.x = 0.55 * lungeK + restK * (0.12 + 0.3 * breath) + 0.06 * crouchK;
      // Tail: an S trailing the trot; raised and whipping in the crouch;
      // straight out behind in the lunge; limp on the floor at rest.
      for (let i = 0; i < tail.length; i++) {
        const j = tail[i];
        const whip = crouchK * (i >= 2 ? 0.5 : 0.15) * Math.sin(t * (12 + 10 * prog) - i * 0.9);
        j.rotation.y = (-0.35 * Math.sin(gp - 1.1 - i * 0.7) * go + whip + 0.08 * Math.sin(t * 1.5 - i + id) * (1 - lungeK)) * (1 - lungeK);
        j.rotation.x = (i === 0 ? -0.25 : -0.22) * crouchK + 0.06 * restK + (i === 0 ? 0.1 : 0.03) * (1 - crouchK);
      }
      // The streak: a white-gold smear laid out behind it on the lunge,
      // fading out through the skid.
      const fade = mode === 'lunge' ? 1 : la < 0.9 && restK > 0.01 ? Math.max(0, 1 - la * 4) : 0;
      const sk = Math.max(lungeK, fade);
      const flick = 0.85 + 0.15 * Math.sin(t * 57);
      streak.material.opacity = 0.62 * sk * flick;
      streak.scale.set(0.42, 1, 0.2 + 1.5 * sk);
      streakCore.material.opacity = 0.75 * sk * flick;
      streakCore.scale.set(0.16, 1, 0.15 + 1.1 * sk);
      shadow.scale.set(1, 1, 1 + 0.25 * lungeK);
    },
  };
}

// --------------------------------------------------------------- SLAG --
// Crack seams wandering over an ellipsoid (centre c, radii r).
function crackSeams(seed, c, r, paths, { steps = 4, front = 0, spread = 1.7, r0 = 0.016 } = {}) {
  const rand = lcg(seed);
  const parts = [];
  for (let p = 0; p < paths; p++) {
    let th = (rand() - 0.5) * Math.PI * spread + front;
    let ph = 0.5 + rand() * 1.4;
    const at = () => [c[0] + r[0] * 1.03 * Math.sin(ph) * Math.sin(th), c[1] + r[1] * 1.03 * Math.cos(ph), c[2] + r[2] * 1.03 * Math.sin(ph) * Math.cos(th)];
    let prev = at();
    for (let s = 0; s < steps; s++) {
      th += (rand() - 0.5) * 0.8;
      ph += 0.15 + rand() * 0.25;
      const next = at();
      parts.push(rod(prev, next, r0 - s * 0.0025));
      prev = next;
    }
  }
  return mergeGeometries(parts);
}
const SLAG_PLATES = 5;
export function buildSlag() {
  const s = shell('slag');
  const { rig, track } = s;
  const crust = track(flashable(C.slag));
  const crustDark = track(flashable(C.slagDark));
  const crustPale = track(flashable(C.slagPale));
  const coreMat = heatMat(C.gold);
  const seamMat = heatMat(C.coal);
  const eyeMat = heatMat(C.gold);
  const hips = new Group();
  hips.position.y = 0.4;
  rig.add(hips);
  // Stubby pillar legs, blocky feet.
  const legs = [];
  const legG = shared('sg-leg', () => new CylinderGeometry(0.13, 0.11, 0.3, 6).translate(0, -0.15, 0));
  const footG = shared('sg-foot', () => new DodecahedronGeometry(0.12, 0));
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.22, 0, -0.02);
    hips.add(hip);
    const leg = new Mesh(legG, crustDark);
    addInk(leg);
    hip.add(leg);
    const foot = new Mesh(footG, crust);
    foot.scale.set(1.15, 0.6, 1.4);
    foot.position.set(0, -0.33, 0.04);
    hip.add(foot);
    legs.push({ hip, side });
  }
  // The heap: a hunched hump of slag, a crater of molten core in its back
  // under five crust plates, shoulders like boulders, a head sunk between.
  const torso = new Group();
  torso.position.set(0, 0.0, 0);
  hips.add(torso);
  const hump = new Mesh(shared('sg-hump', () => new DodecahedronGeometry(0.42, 0)), crust);
  hump.scale.set(1.18, 0.9, 1.0);
  hump.position.set(0, 0.32, -0.04);
  addInk(hump);
  torso.add(hump);
  const belly = new Mesh(shared('sg-belly', () => new DodecahedronGeometry(0.3, 0)), crustDark);
  belly.scale.set(1.1, 0.8, 0.9);
  belly.position.set(0, 0.1, 0.12);
  belly.rotation.y = 0.5;
  torso.add(belly);
  const seams = new Mesh(shared('sg-seams', () => crackSeams(11, [0, 0.32, -0.04], [0.47, 0.36, 0.4], 7, { front: Math.PI, spread: 1.9 })), seamMat);
  torso.add(seams);
  // The core: a molten ball in the crater.
  const CORE = [0, 0.74, -0.04];
  const core = new Mesh(shared('sg-core', () => new IcosahedronGeometry(0.21, 1)), coreMat);
  core.position.set(CORE[0], CORE[1] - 0.06, CORE[2]);
  core.scale.set(1.1, 0.75, 1.1);
  torso.add(core);
  const plates = [];
  const plateG = shared('sg-plate', () => new DodecahedronGeometry(0.17, 0).scale(1.25, 0.42, 1.1).translate(0, 0.03, -0.13));
  for (let i = 0; i < SLAG_PLATES; i++) {
    const a = (i / SLAG_PLATES) * Math.PI * 2 + 0.3;
    const yawP = new Group();
    yawP.position.set(CORE[0], CORE[1] - 0.06, CORE[2]);
    yawP.rotation.y = a;
    torso.add(yawP);
    const hinge = new Group();
    hinge.position.set(0, -0.02, 0.27);
    yawP.add(hinge);
    const pl = new Mesh(plateG, i % 2 ? crustPale : crust);
    pl.rotation.y = (i * 0.37) % 0.6;
    addInk(pl);
    hinge.add(pl);
    plates.push({ hinge, i });
  }
  // The tell: one indigo shard jutting from the back of the hump.
  const shard = new Mesh(shared('sg-shard', () => new ConeGeometry(0.05, 0.26, 4).translate(0, 0.13, 0)), tellMat());
  shard.position.set(-0.2, 0.42, -0.36);
  shard.rotation.set(-0.9, 0.3, 0.35);
  torso.add(shard);
  const shardGlow = tellGlow(0.4, 0.2);
  shardGlow.position.set(-0.24, 0.55, -0.46);
  torso.add(shardGlow);
  // Shoulders and arms: boulder shoulders, long arms, slag-boulder fists.
  const arms = [];
  const upperG = shared('sg-upper', () => new CylinderGeometry(0.11, 0.09, 0.34, 6).translate(0, -0.17, 0));
  const foreG = shared('sg-fore', () => new CylinderGeometry(0.09, 0.12, 0.3, 6).translate(0, -0.15, 0));
  const fistG = shared('sg-fist', () => new DodecahedronGeometry(0.17, 0));
  const drip = shared('sg-drip', () => new ConeGeometry(0.035, 0.12, 4).rotateX(Math.PI));
  for (const side of [-1, 1]) {
    const boulder = new Mesh(shared('sg-shoulder', () => new DodecahedronGeometry(0.2, 0)), crustPale);
    boulder.position.set(side * 0.42, 0.5, 0.08);
    boulder.scale.set(1.0, 0.85, 1.05);
    addInk(boulder);
    torso.add(boulder);
    for (const dz of [-0.05, 0.08]) {
      const d = new Mesh(drip, crustDark);
      d.position.set(side * (0.5 + dz * 0.3), 0.34, 0.08 + dz);
      torso.add(d);
    }
    const sh = new Group();
    sh.position.set(side * 0.46, 0.46, 0.12);
    torso.add(sh);
    const upper = new Mesh(upperG, crust);
    addInk(upper);
    sh.add(upper);
    const elbow = new Group();
    elbow.position.y = -0.34;
    sh.add(elbow);
    elbow.add(new Mesh(foreG, crustDark));
    const fist = new Mesh(fistG, crustPale);
    fist.position.y = -0.36;
    fist.scale.set(1.05, 0.95, 1.15);
    addInk(fist);
    elbow.add(fist);
    const knuckle = new Mesh(shared('sg-knuckle', () => crackSeams(5, [0, 0, 0], [0.17, 0.16, 0.19], 2, { steps: 3, spread: 2.0, r0: 0.012 })), seamMat);
    knuckle.position.y = -0.36;
    elbow.add(knuckle);
    arms.push({ sh, elbow, side });
  }
  // Head: a low lump sunk between the shoulders, gold slit eyes.
  const head = new Group();
  head.position.set(0, 0.48, 0.36);
  torso.add(head);
  const skull = new Mesh(shared('sg-skull', () => new DodecahedronGeometry(0.15, 0)), crust);
  skull.scale.set(1.15, 0.85, 1.0);
  addInk(skull);
  head.add(skull);
  const brow = new Mesh(shared('sg-brow', () => new BoxGeometry(0.28, 0.06, 0.1)), crustDark);
  brow.position.set(0, 0.06, 0.1);
  brow.rotation.x = 0.3;
  head.add(brow);
  slitEyes(head, { x: 0.06, y: 0.0, z: 0.14, len: 0.07, slant: -0.3, mat: eyeMat, thick: 0.03 });
  // Light: the core's halo, its pool on the floor.
  const coreGlow = heatGlow(0.8, 0.1);
  coreGlow.position.set(CORE[0], CORE[1] + 0.02, CORE[2]);
  torso.add(coreGlow);
  const floor = floorLight(C.gold, 0);
  floor.scale.setScalar(2.4);
  rig.add(floor);
  const shadow = groundShadow(0.6, 0.42);
  s.group.add(shadow);
  const dtOf = clock();
  const slamAge = clip();
  let openK = 0;
  let wasOpen = false;
  let crackT0 = -9;
  const _c = new Color();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'plod';
      const sa = slamAge(e ? e.slamTick : -1, dt);
      // The core: open from the slam until coreUntil; the plates knit back
      // over its last 30 ticks so the shut reads coming.
      const coreUntil = e && e.coreUntil > 0 ? e.coreUntil : 0;
      const open = coreUntil > 0;
      if (open && !wasOpen) crackT0 = t;
      wasOpen = open;
      const left = open && tick != null ? coreUntil - tick : 0;
      const want = open ? clamp01(left / 30) : 0;
      openK = approach(openK, want, open && left > 30 ? 16 : 7, dt);
      const pop = Math.exp(-Math.max(0, t - crackT0) * 6) * (open ? 1 : 0); // the crack bursting
      // Slam: rear up with both fists overhead through the wind-up, down
      // hard on the beat, a slow straighten after.
      const down = sa < 0.1 ? smooth(sa / 0.1) : sa < 0.7 ? 1 - smooth((sa - 0.1) / 0.6) : 0;
      const raise = (mode === 'slam' ? 1 : 0) * telegraphK * (1 - down);
      const prog = mode === 'slam' ? teleProg(e, tick) : 0;
      // Heat: dim crimson seams shut; straining gold through the wind-up;
      // open, a white-gold crater that flickers.
      const flick = 0.06 * Math.sin(t * 13 + id) + 0.04 * Math.sin(t * 23);
      heatColor(coreMat.color, 0.08 + 0.3 * raise * prog + openK * (0.75 + flick) + 0.3 * pop);
      heatColor(seamMat.color, 0.1 + 0.05 * Math.sin(t * 1.7 + id) + 0.35 * raise * prog + 0.55 * openK);
      heatColor(eyeMat.color, 0.55 + 0.3 * raise + 0.25 * openK);
      core.scale.set(1.1 * (1 + 0.15 * openK), 0.75 * (1 + 0.4 * openK), 1.1 * (1 + 0.15 * openK));
      core.position.y = CORE[1] - 0.14 + 0.13 * openK;
      coreGlow.material.opacity = 0.08 + 0.12 * raise * prog + 0.75 * openK + 0.3 * pop;
      coreGlow.scale.setScalar(0.7 + 1.6 * openK + 0.8 * pop + 0.3 * raise * prog);
      floor.material.opacity = 0.45 * openK + 0.2 * pop;
      floor.material.color.copy(heatColor(_c, 0.6 + 0.1 * openK));
      // The plates: shut over the crater (a slight tremble while straining),
      // thrown back on the crack, settling back down as it knits.
      for (const { hinge, i } of plates) {
        const jit = 0.04 * raise * prog * Math.sin(t * 40 + i * 2);
        hinge.rotation.x = 0.12 + 1.0 * openK + 0.35 * pop * (1 - 0.2 * (i % 2)) + jit;
        hinge.position.y = -0.02 + 0.04 * openK;
      }
      // Gait: a slow heavy sway, legs barely lifting, arms knuckling along.
      const go = moveK * (1 - raise);
      const step = Math.sin(walkPhase * 1.2) * go;
      const breathe = Math.sin(t * 1.1 + id);
      rig.rotation.z = 0.07 * step;
      rig.position.x = 0.02 * down * Math.sin(sa * 70);
      hips.position.y = 0.4 + 0.025 * Math.abs(step) + 0.07 * raise - 0.09 * down;
      for (const { hip, side } of legs) hip.rotation.x = side * 0.35 * step - 0.15 * raise + 0.12 * down;
      torso.rotation.x = 0.16 + 0.02 * breathe - 0.5 * raise + 0.5 * down - 0.08 * pop;
      torso.rotation.y = 0.08 * step;
      head.rotation.x = -0.15 * raise + 0.1 * down;
      for (const { sh, elbow, side } of arms) {
        sh.rotation.x = -side * 0.35 * step - 0.15 - 2.75 * raise - 0.9 * down * (1 - raise) + 0.04 * breathe;
        sh.rotation.z = side * (0.12 + 0.18 * raise - 0.08 * down);
        elbow.rotation.x = -0.25 - 0.45 * raise + 0.1 * down;
      }
      shardGlow.material.opacity = 0.16 + 0.06 * Math.sin(t * 2 + id);
      shadow.material.opacity = 0.42 - 0.12 * openK;
    },
  };
}

// ------------------------------------------------------------ BELLOWS --
const BOARD = [
  [0, 0.26],
  [0.09, 0.22],
  [0.16, 0.08],
  [0.19, -0.08],
  [0.15, -0.2],
  [0.06, -0.26],
  [-0.06, -0.26],
  [-0.15, -0.2],
  [-0.19, -0.08],
  [-0.16, 0.08],
  [-0.09, 0.22],
];
export function buildBellows() {
  const s = shell('bellows');
  const { rig, track } = s;
  const skin = track(flashable(C.impSkin));
  const dark = track(flashable(C.impDark));
  const leather = track(flashable(C.leather, { side: DoubleSide }));
  const board = track(flashable(C.board));
  const brass = track(flashable(C.brass));
  const horn = track(flashable(C.horn));
  const nozzleHot = heatMat(C.coal);
  const bodyG = new Group();
  bodyG.position.y = 0.26;
  rig.add(bodyG);
  // Legs: short and bowed, wide flat feet.
  const legs = [];
  const thighG = shared('bl-thigh', () => new CylinderGeometry(0.055, 0.045, 0.16, 5).translate(0, -0.08, 0));
  const footG = shared('bl-foot', () => new BoxGeometry(0.1, 0.04, 0.16).translate(0, -0.02, 0.04));
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.1, 0.02, 0);
    bodyG.add(hip);
    hip.add(new Mesh(thighG, dark));
    const foot = new Mesh(footG, dark);
    foot.position.y = -0.2;
    hip.add(foot);
    legs.push({ hip, side });
  }
  // The pot belly, a small chest over it.
  const torso = new Group();
  bodyG.add(torso);
  const belly = new Mesh(shared('bl-belly', () => new IcosahedronGeometry(0.22, 1)), skin);
  belly.scale.set(1.08, 0.95, 1.05);
  belly.position.set(0, 0.17, 0.04);
  addInk(belly);
  torso.add(belly);
  const chest = new Mesh(shared('bl-chest', () => new IcosahedronGeometry(0.15, 1)), skin);
  chest.position.set(0, 0.38, -0.01);
  torso.add(chest);
  const strap = new Mesh(shared('bl-strap', () => new BoxGeometry(0.05, 0.36, 0.42)), leather);
  strap.position.set(0, 0.34, -0.02);
  strap.rotation.z = 0.55;
  torso.add(strap);
  // Head: a round sooty head, long ears out to the sides, stub horns, a
  // wide grin; the tell: indigo slit eyes.
  const head = new Group();
  head.position.set(0, 0.6, 0.04);
  torso.add(head);
  const skull = new Mesh(shared('bl-skull', () => new IcosahedronGeometry(0.15, 1)), skin);
  skull.scale.set(1.08, 0.92, 1.0);
  addInk(skull);
  head.add(skull);
  const ears = [];
  const earG = shared('bl-ear', () => new ConeGeometry(0.05, 0.3, 4).translate(0, 0.15, 0));
  for (const side of [-1, 1]) {
    const ear = new Mesh(earG, dark);
    ear.position.set(side * 0.13, 0.02, -0.02);
    ear.rotation.set(-0.25, 0, side * -1.25);
    ear.scale.set(1, 1, 0.45);
    head.add(ear);
    ears.push({ ear, side });
    const hn = new Mesh(shared('bl-horn', () => new ConeGeometry(0.028, 0.11, 4).translate(0, 0.055, 0)), horn);
    hn.position.set(side * 0.06, 0.12, -0.01);
    hn.rotation.set(-0.5, 0, side * -0.3);
    head.add(hn);
  }
  const grin = new Mesh(shared('bl-grin', () => new BoxGeometry(0.15, 0.03, 0.04)), inkMat());
  grin.position.set(0, -0.055, 0.135);
  head.add(grin);
  const nose = new Mesh(shared('bl-nose', () => new ConeGeometry(0.03, 0.07, 4).rotateX(Math.PI / 2)), dark);
  nose.position.set(0, 0.0, 0.16);
  head.add(nose);
  slitEyes(head, { x: 0.055, y: 0.04, z: 0.135, len: 0.055, slant: -0.4, mat: tellMat(), thick: 0.028 });
  const eyeGlow = tellGlow(0.32, 0.2);
  eyeGlow.position.set(0, 0.05, 0.17);
  head.add(eyeGlow);
  // Arms: short, elbows out (they flap the bellows' straps).
  const arms = [];
  const armG = shared('bl-arm', () => new CylinderGeometry(0.04, 0.034, 0.2, 5).translate(0, -0.1, 0));
  const handG = shared('bl-hand', () => new IcosahedronGeometry(0.045, 0));
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.2, 0.42, 0.0);
    torso.add(sh);
    sh.add(new Mesh(armG, skin));
    const fore = new Group();
    fore.position.y = -0.2;
    sh.add(fore);
    fore.add(new Mesh(armG, dark));
    const hand = new Mesh(handG, dark);
    hand.position.y = -0.21;
    fore.add(hand);
    arms.push({ sh, fore, side });
  }
  // The bellows on its back, hinged at the top: the inner board against
  // its back, the outer board on a hinge, two pleats of leather between,
  // and the brass nozzle over its right shoulder pointing forward.
  const bell = new Group();
  bell.position.set(0, 0.5, -0.24);
  bell.rotation.x = -0.42;
  bell.scale.setScalar(1.3);
  torso.add(bell);
  const boardG = shared('bl-board', () => plate(BOARD, 0.03).translate(0, -0.26, 0));
  const pleatG = shared('bl-pleat', () => plate(BOARD.map(([x, y]) => [x * 0.94, y * 0.96]), 0.012).translate(0, -0.25, 0));
  const hingeY = 0.25;
  const inner = new Mesh(boardG, board);
  inner.position.y = hingeY;
  addInk(inner);
  bell.add(inner);
  const pleats = [];
  for (const f of [0.33, 0.66]) {
    const p = new Group();
    p.position.y = hingeY;
    bell.add(p);
    p.add(new Mesh(pleatG, leather));
    pleats.push({ p, f });
  }
  const outerP = new Group();
  outerP.position.y = hingeY;
  bell.add(outerP);
  const outer = new Mesh(boardG, board);
  addInk(outer);
  outerP.add(outer);
  const studG = shared('bl-stud', () => new IcosahedronGeometry(0.022, 0));
  for (const [x, y] of [[0, -0.1], [-0.1, -0.3], [0.1, -0.3]]) {
    const st = new Mesh(studG, brass);
    st.position.set(x, y, -0.02);
    outerP.add(st);
  }
  const handle = new Mesh(shared('bl-handle', () => new BoxGeometry(0.06, 0.12, 0.04).translate(0, -0.06, 0)), board);
  handle.position.set(0, -0.5, -0.015);
  outerP.add(handle);
  // The nozzle: a brass cone from the hinge over the shoulder, its mouth lit.
  const noz = new Group();
  noz.position.set(0.12, hingeY + 0.02, 0.02);
  noz.rotation.set(-0.3, 0.12, 0);
  bell.add(noz);
  const nozzle = new Mesh(shared('bl-nozzle', () => new CylinderGeometry(0.028, 0.06, 0.5, 6).rotateX(Math.PI / 2).translate(0, 0, 0.25)), brass);
  addInk(nozzle);
  noz.add(nozzle);
  const mouth = new Mesh(shared('bl-mouth', () => new CylinderGeometry(0.03, 0.03, 0.02, 8).rotateX(Math.PI / 2)), nozzleHot);
  mouth.position.z = 0.505;
  noz.add(mouth);
  const tipGlow = heatGlow(0.3, 0.2);
  tipGlow.position.z = 0.56;
  noz.add(tipGlow);
  const puff = heatGlow(0.6, 0);
  puff.material.color.copy(C.sparks);
  puff.position.z = 0.7;
  noz.add(puff);
  const shadow = groundShadow(0.34, 0.38);
  s.group.add(shadow);
  const dtOf = clock();
  const fanAge = clip();
  let pumpPh = 0;
  let pumpK = 0;
  let lastSqueeze = 0;
  let squeeze = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'sidle';
      const fa = fanAge(e ? e.fanTick : -1, dt);
      const blast = fa < 0.6 ? Math.exp(-fa * 6) : 0;
      const pumping = mode === 'pump';
      const prog = pumping ? teleProg(e, tick) : 0;
      pumpK = approach(pumpK, pumping ? 1 : 0, 10, dt);
      // The pump: faster and harder as the fan fills; idle, a slow wheeze.
      pumpPh += dt * (pumping ? 5 + 9 * prog : 1.4);
      const cyc = 0.5 + 0.5 * Math.cos(pumpPh);
      // Each squeeze (the boards closing) puffs gold from the nozzle.
      const sq = Math.sin(pumpPh);
      if (pumping && sq > 0 && lastSqueeze <= 0) squeeze = 1;
      lastSqueeze = sq;
      squeeze = Math.max(0, squeeze - dt * 5);
      const openA = blast > 0.05 ? 0.04 * (1 - blast) : pumping ? 0.06 + (0.3 + 0.12 * prog) * cyc : 0.14 + 0.06 * cyc;
      outerP.rotation.x = openA;
      for (const { p, f } of pleats) p.rotation.x = openA * f;
      // Heat at the nozzle: coal at rest, gold to white-hot through the pump,
      // a flash on the fan.
      const hot = 0.2 + pumpK * (0.35 + 0.55 * prog) + 0.6 * blast;
      heatColor(nozzleHot.color, hot);
      heatColor(tipGlow.material.color, Math.min(1, hot));
      tipGlow.material.opacity = 0.12 + 0.45 * pumpK * prog + 0.25 * squeeze * pumpK + 0.6 * blast;
      tipGlow.scale.setScalar(0.25 + 0.4 * pumpK * prog + 0.2 * squeeze + 1.2 * blast);
      puff.material.opacity = 0.5 * squeeze * pumpK * (0.4 + 0.6 * prog) + 0.85 * blast;
      puff.scale.setScalar(0.35 + 0.3 * (1 - squeeze) + 1.4 * blast);
      puff.position.z = 0.62 + 0.25 * (1 - squeeze) + 0.6 * (1 - blast) * (blast > 0.02 ? 1 : 0);
      // Body: a waddle; planted and bobbing with each squeeze; rocked back
      // by the fan.
      const go = moveK * (1 - pumpK);
      const wad = Math.sin(walkPhase * 1.6);
      bodyG.position.y = 0.26 + 0.03 * Math.abs(wad) * go - 0.03 * pumpK * (1 - cyc) - 0.02 * blast;
      rig.rotation.z = 0.14 * wad * go;
      rig.rotation.x = 0.1 * pumpK - 0.22 * blast;
      rig.position.z = -0.08 * blast;
      belly.scale.set(1.08 * (1 + 0.04 * Math.sin(t * 9) * go + 0.04 * pumpK * (1 - cyc)), 0.95 * (1 - 0.04 * pumpK * (1 - cyc)), 1.05);
      for (const { hip, side } of legs) {
        hip.rotation.x = side * 0.5 * wad * go;
        hip.rotation.z = side * (0.08 + 0.12 * pumpK);
      }
      // Arms: swinging; elbows flapping with the pump (out on the fill, in
      // on the squeeze); thrown out on the fan.
      for (const { sh, fore, side } of arms) {
        sh.rotation.x = side * 0.4 * wad * go - 0.2 * pumpK - 0.5 * blast;
        sh.rotation.z = side * (0.25 + pumpK * (0.25 + 0.5 * cyc) + 0.8 * blast);
        fore.rotation.x = -0.6 - 0.5 * pumpK * (1 - cyc);
      }
      head.rotation.x = 0.1 * pumpK - 0.3 * blast;
      head.rotation.z = 0.08 * Math.sin(t * 2.1 + id) * (1 - pumpK);
      for (const { ear, side } of ears) ear.rotation.x = -0.25 + 0.25 * Math.sin(walkPhase * 1.6 + side) * go + 0.35 * blast;
      eyeGlow.material.opacity = 0.16 + 0.2 * pumpK;
    },
  };
}

// --------------------------------------------------------- CINDERMOTH --
const FORE = [
  [0, 0.05],
  [0.16, 0.2],
  [0.4, 0.27],
  [0.55, 0.2],
  [0.56, 0.06],
  [0.44, -0.04],
  [0.24, -0.07],
  [0.06, -0.04],
];
const HIND = [
  [0, -0.02],
  [0.14, -0.04],
  [0.3, -0.1],
  [0.38, -0.22],
  [0.3, -0.33],
  [0.15, -0.3],
  [0.04, -0.16],
];
// The wing's fire: its outline drawn in toward its centre, flat on the pane.
function inset(points, k) {
  const cx = points.reduce((a, p) => a + p[0], 0) / points.length;
  const cy = points.reduce((a, p) => a + p[1], 0) / points.length;
  return points.map(([x, y]) => [x + (cx - x) * k, y + (cy - y) * k]);
}
function wingPane(points, depth) {
  const g = plate(points, depth);
  g.rotateX(Math.PI / 2);
  return g;
}
// Veins: rods from the root out to the rim points, flat on the pane.
function wingVeins(points) {
  const parts = [];
  const n = points.length;
  for (let i = 1; i < n - 1; i++) {
    const [x, y] = points[i];
    parts.push(rod([0.02, 0.012, 0], [x * 0.88, 0.012, y * 0.88], 0.008, 3));
  }
  return mergeGeometries(parts);
}
const DRIPS = 3;
export function buildCindermoth() {
  const s = shell('cindermoth');
  const { rig, track } = s;
  const hover = new Group();
  hover.position.y = 1.25;
  rig.add(hover);
  const ash = track(flashable(C.mothAsh, { side: DoubleSide }));
  const fur = track(flashable(C.mothBody));
  const fire = addMat(C.gold, 0.6, { side: DoubleSide });
  const veinMat = addMat(C.heat, 0.8);
  const tipMat = heatMat(C.gold);
  // Body: a furred thorax, a long smouldering abdomen, a small head with
  // feathered antennae.
  const thorax = new Mesh(shared('cm-thorax', () => new IcosahedronGeometry(0.075, 1)), fur);
  thorax.scale.set(1, 0.9, 1.25);
  addInk(thorax);
  hover.add(thorax);
  const abdomen = new Group();
  abdomen.position.set(0, -0.01, -0.08);
  hover.add(abdomen);
  const abd = new Mesh(shared('cm-abd', () => new CylinderGeometry(0.06, 0.03, 0.26, 7).rotateX(-Math.PI / 2).translate(0, 0, -0.13)), fur);
  addInk(abd);
  abdomen.add(abd);
  const bandG = shared('cm-band', () => new CylinderGeometry(0.058, 0.058, 0.018, 7).rotateX(Math.PI / 2));
  const bands = [];
  for (let i = 0; i < 3; i++) {
    const b = new Mesh(bandG, tipMat);
    b.position.z = -0.06 - i * 0.065;
    b.scale.setScalar(1.02 - i * 0.18);
    abdomen.add(b);
    bands.push(b);
  }
  const tip = new Mesh(shared('cm-tip', () => new IcosahedronGeometry(0.032, 0)), tipMat);
  tip.position.z = -0.27;
  abdomen.add(tip);
  const headM = new Mesh(shared('cm-head', () => new IcosahedronGeometry(0.05, 1)), fur);
  headM.position.set(0, 0.01, 0.1);
  hover.add(headM);
  slitEyes(headM, { x: 0.026, y: 0.012, z: 0.04, len: 0.03, slant: 0.4 });
  const antG = shared('cm-ant', () =>
    mergeGeometries([
      rod([0, 0, 0], [0.09, 0.08, 0.2], 0.006, 3),
      rod([0.03, 0.027, 0.067], [0.07, 0.03, 0.08], 0.005, 3),
      rod([0.05, 0.045, 0.11], [0.1, 0.045, 0.12], 0.005, 3),
      rod([0.07, 0.062, 0.155], [0.12, 0.065, 0.16], 0.005, 3),
    ])
  );
  for (const side of [-1, 1]) {
    const ant = new Mesh(antG, fur);
    ant.position.set(side * 0.02, 0.03, 0.12);
    ant.scale.x = side;
    hover.add(ant);
  }
  // The tell: an indigo mark on its back, between the wings.
  const mark = new Mesh(shared('cm-mark', () => new CylinderGeometry(0.03, 0.03, 0.012, 4)), tellMat());
  mark.position.set(0, 0.066, 0.0);
  mark.scale.set(0.8, 1, 1.3);
  hover.add(mark);
  const markGlow = tellGlow(0.3, 0.2);
  markGlow.position.set(0, 0.1, 0);
  hover.add(markGlow);
  // Wings: shoulder pivots (pivot -> mirror -> pane, fire, veins).
  const wings = [];
  const foreG = shared('cm-fore', () => wingPane(FORE, 0.016));
  const hindG = shared('cm-hind', () => wingPane(HIND, 0.016));
  const foreFireG = shared('cm-fore-fire', () => wingPane(inset(FORE, 0.3), 0.004).translate(0, 0.013, 0));
  const hindFireG = shared('cm-hind-fire', () => wingPane(inset(HIND, 0.3), 0.004).translate(0, 0.013, 0));
  const foreVeinG = shared('cm-fore-vein', () => wingVeins(FORE));
  const hindVeinG = shared('cm-hind-vein', () => wingVeins(HIND));
  for (const [hind, paneG, fireG, veinG] of [[0, foreG, foreFireG, foreVeinG], [1, hindG, hindFireG, hindVeinG]]) {
    for (const side of [-1, 1]) {
      const pivot = new Group();
      pivot.position.set(side * 0.04, 0.02, hind ? -0.04 : 0.02);
      hover.add(pivot);
      const mirror = new Group();
      mirror.scale.x = side;
      pivot.add(mirror);
      const pane = new Mesh(paneG, ash);
      addInk(pane);
      mirror.add(pane);
      const f = new Mesh(fireG, fire);
      f.renderOrder = 3;
      mirror.add(f);
      const v = new Mesh(veinG, veinMat);
      v.renderOrder = 4;
      mirror.add(v);
      wings.push({ pivot, side, hind });
    }
  }
  // Light: a halo round the body, its pool on the floor, cinders dripping
  // off the abdomen while it burns.
  const halo = heatGlow(1.0, 0.3);
  hover.add(halo);
  const floor = floorLight(C.gold, 0.15);
  floor.scale.setScalar(1.5);
  rig.add(floor);
  const drips = [];
  for (let i = 0; i < DRIPS; i++) {
    const d = heatGlow(0.1, 0);
    d.material.color.copy(C.sparks);
    rig.add(d);
    drips.push(d);
  }
  const shadow = groundShadow(0.3, 0.28, { wide: 1.6 });
  s.group.add(shadow);
  const dtOf = clock();
  const flareAge = clip();
  let litK = 1;
  let kindleK = 0;
  let hgt = 1.25;
  const _col = new Color();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, moveK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'flutter';
      const fa = flareAge(e ? e.flareTick : -1, dt);
      const burst = fa < 0.5 ? Math.exp(-fa * 7) : 0;
      const spent = mode === 'spent';
      // Spent it is out; the coals creep back into its veins over the last
      // 40 ticks before it relights.
      const until = e && e.spentUntil ? e.spentUntil : 0;
      const creep = spent && tick != null && until > 0 ? 0.35 * clamp01(1 - (until - tick) / 40) : 0;
      litK = approach(litK, spent ? creep : 1, spent ? 7 : 3, dt);
      kindleK = approach(kindleK, mode === 'kindle' ? 1 : 0, 9, dt);
      const prog = mode === 'kindle' ? teleProg(e, tick) : 0;
      const flick = 0.08 * Math.sin(t * 11 + id) + 0.05 * Math.sin(t * 27 + id * 3);
      const heat = litK * (0.62 + flick + kindleK * (0.1 + 0.4 * prog) + 0.12 * kindleK * prog * Math.sin(t * 40)) + 1.2 * burst;
      // Height: a bobbing flutter; hung still a little higher to kindle; a
      // husk sagging low.
      const want = spent ? 0.78 + 0.05 * Math.sin(t * 1.3 + id) : mode === 'kindle' ? 1.38 : 1.25 + 0.12 * Math.sin(t * 2.3 + id);
      hgt = approach(hgt, want, spent ? 2.5 : 5, dt);
      hover.position.y = hgt + 0.025 * Math.sin(t * 16 + id) * (1 - kindleK) * litK;
      hover.rotation.x = 0.22 * moveK * (1 - kindleK) - 0.12 * kindleK;
      hover.rotation.z = spent ? 0.18 * Math.sin(t * 1.1 + id) : 0.05 * Math.sin(t * 3.1 + id);
      // Wings: fast beats lit; spread flat and trembling through the kindle;
      // snapped wide on the flare; slow sagging beats spent.
      const lit = 1 - (spent ? 1 : 0);
      for (const { pivot, side, hind } of wings) {
        const ph = t * 16 + id - hind * 0.6;
        const flap = (0.3 + 0.75 * Math.sin(ph)) * lit * (1 - kindleK);
        const tremble = kindleK * (0.04 + 0.05 * Math.sin(t * 38 + hind)) * (1 + prog);
        const sag = spent ? -0.3 + 0.32 * Math.sin(t * 4.2 + id - hind * 0.5) : 0;
        pivot.rotation.z = side * (flap + tremble + 0.08 * kindleK + sag - 0.1 * burst);
        pivot.rotation.y = side * ((hind ? -0.25 : 0.12) * (1 - 0.6 * kindleK) - 0.15 * burst);
      }
      // Colour: pale ash lit, dull grey spent; the fire in the panes and the
      // veins follow the heat.
      ash.color.copy(_col.copy(C.mothSpent).lerp(C.mothAsh, clamp01(litK * 1.4)));
      fur.color.copy(_col.copy(C.mothBodySpent).lerp(C.mothBody, clamp01(litK * 1.4)));
      heatColor(fire.color, Math.min(0.75, heat * 0.8));
      fire.opacity = clamp01(0.55 * heat);
      heatColor(veinMat.color, Math.min(1, heat + 0.15));
      veinMat.opacity = clamp01(heat * 0.85);
      heatColor(tipMat.color, spent ? 0.05 + creep : Math.min(1, heat));
      for (let i = 0; i < bands.length; i++) bands[i].visible = heat > 0.1 + i * 0.12;
      halo.material.opacity = clamp01(0.05 + 0.25 * heat * litK + 0.5 * burst);
      halo.scale.setScalar(0.5 + 0.35 * heat + 0.6 * kindleK * prog + 2.4 * burst);
      heatColor(halo.material.color, Math.min(0.9, heat));
      floor.material.opacity = clamp01(0.06 + 0.22 * heat * litK + 0.4 * burst);
      floor.scale.setScalar(1.2 + 0.8 * kindleK * prog + 2.0 * burst);
      // Cinders falling off the abdomen tip (a cycle each), only while lit.
      for (let i = 0; i < drips.length; i++) {
        const u = (t * 0.9 + i / DRIPS + id * 0.13) % 1;
        const d = drips[i];
        d.position.set(0.04 * Math.sin(i * 2.1 + id), hover.position.y - 0.05 - u * (hover.position.y - 0.1), -0.25 + 0.05 * Math.cos(i * 1.7));
        d.material.opacity = clamp01(litK * 2 - 0.4) * (1 - u) * 0.9;
        d.scale.setScalar(0.12 * (1 - 0.5 * u));
      }
      markGlow.material.opacity = 0.16 + 0.06 * Math.sin(t * 2 + id);
      const sk = 1 - 0.3 * clamp01(hgt / 1.4);
      shadow.scale.setScalar(sk);
      shadow.material.opacity = 0.18 + 0.14 * (1 - clamp01(hgt / 1.4));
    },
  };
}

// ------------------------------------------------------------- HURLER --
const SACK_HOLES = [
  [0.1, 0.05, 0.11],
  [-0.08, 0.1, 0.1],
  [0.02, -0.06, 0.13],
  [0.12, -0.04, -0.04],
  [-0.1, -0.02, -0.08],
];
export function buildHurler() {
  const s = shell('hurler');
  const { rig, track } = s;
  const skin = track(flashable(C.hurlerSkin));
  const dark = track(flashable(C.hurlerDark));
  const sackM = track(flashable(C.sack));
  const holeHot = heatMat(C.coal);
  const bodyG = new Group();
  bodyG.position.y = 0.24;
  rig.add(bodyG);
  // Legs: short, thick, bowed; broad feet.
  const legs = [];
  const thighG = shared('hu-thigh', () => new CylinderGeometry(0.07, 0.055, 0.15, 5).translate(0, -0.075, 0));
  const footG = shared('hu-foot', () => new BoxGeometry(0.12, 0.05, 0.17).translate(0, -0.02, 0.04));
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.12, 0.02, 0);
    bodyG.add(hip);
    hip.add(new Mesh(thighG, dark));
    const foot = new Mesh(footG, dark);
    foot.position.y = -0.19;
    hip.add(foot);
    legs.push({ hip, side });
  }
  // A barrel body, a hunched neck, a broad head sunk in the shoulders.
  const torso = new Group();
  bodyG.add(torso);
  const trunk = new Mesh(shared('hu-trunk', () => new IcosahedronGeometry(0.24, 1)), skin);
  trunk.scale.set(1.15, 1.0, 0.95);
  trunk.position.set(0, 0.2, 0);
  addInk(trunk);
  torso.add(trunk);
  const head = new Group();
  head.position.set(0, 0.47, 0.07);
  torso.add(head);
  const skull = new Mesh(shared('hu-skull', () => new IcosahedronGeometry(0.14, 1)), skin);
  skull.scale.set(1.2, 0.85, 1.0);
  addInk(skull);
  head.add(skull);
  const brow = new Mesh(shared('hu-brow', () => new BoxGeometry(0.22, 0.045, 0.06)), dark);
  brow.position.set(0, 0.04, 0.11);
  head.add(brow);
  const jaw = new Mesh(shared('hu-jaw', () => new BoxGeometry(0.2, 0.06, 0.12)), dark);
  jaw.position.set(0, -0.07, 0.07);
  head.add(jaw);
  for (const side of [-1, 1]) {
    const hn = new Mesh(shared('hu-horn', () => new ConeGeometry(0.03, 0.12, 4).translate(0, 0.06, 0)), dark);
    hn.position.set(side * 0.1, 0.07, -0.01);
    hn.rotation.set(-0.3, 0, side * -0.7);
    head.add(hn);
  }
  slitEyes(head, { x: 0.05, y: 0.012, z: 0.125, len: 0.05, slant: -0.3, mat: heatMat(C.gold), thick: 0.022 });
  // Arms: long and heavy, hands like shovels. The left holds the sack's
  // neck over the shoulder; the right swings free (both heave on the throw).
  const arms = [];
  const upperG = shared('hu-upper', () => new CylinderGeometry(0.055, 0.045, 0.2, 5).translate(0, -0.1, 0));
  const handG = shared('hu-hand', () => new IcosahedronGeometry(0.075, 0));
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.25, 0.33, 0);
    torso.add(sh);
    sh.add(new Mesh(upperG, skin));
    const fore = new Group();
    fore.position.y = -0.2;
    sh.add(fore);
    fore.add(new Mesh(upperG, dark));
    const hand = new Mesh(handG, dark);
    hand.scale.set(1.1, 0.8, 1.2);
    hand.position.y = -0.22;
    addInk(hand);
    fore.add(hand);
    arms.push({ sh, fore, side });
  }
  // The sack: a lumpy bag pivoting on the left shoulder, coals glowing
  // through its holes; the tell an indigo stitch across its mouth.
  const sackP = new Group();
  sackP.position.set(-0.12, 0.44, -0.04);
  torso.add(sackP);
  const sackG = new Group();
  sackG.position.set(0, 0.02, -0.26);
  sackP.add(sackG);
  const bag = new Mesh(shared('hu-bag', () => new DodecahedronGeometry(0.2, 0)), sackM);
  bag.scale.set(1.0, 0.88, 1.1);
  addInk(bag);
  sackG.add(bag);
  const lump = new Mesh(shared('hu-lump', () => new DodecahedronGeometry(0.12, 0)), sackM);
  lump.position.set(0.08, -0.08, -0.1);
  sackG.add(lump);
  const neck = new Mesh(shared('hu-neck', () => new CylinderGeometry(0.04, 0.07, 0.12, 5)), sackM);
  neck.position.set(0, 0.18, 0.07);
  neck.rotation.x = 0.5;
  sackG.add(neck);
  const holeG = shared('hu-hole', () => new IcosahedronGeometry(0.035, 0));
  const holes = SACK_HOLES.map(([x, y, z]) => {
    const h = new Mesh(holeG, holeHot);
    h.position.set(x * 1.45, y * 1.3, z * 1.5);
    sackG.add(h);
    return h;
  });
  const stitch = new Mesh(shared('hu-stitch', () => new BoxGeometry(0.12, 0.02, 0.02)), tellMat());
  stitch.position.set(0, 0.22, 0.1);
  stitch.rotation.x = 0.5;
  sackG.add(stitch);
  const stitchGlow = tellGlow(0.26, 0.18);
  stitchGlow.position.set(0, 0.24, 0.12);
  sackG.add(stitchGlow);
  const sackGlow = heatGlow(0.7, 0.2);
  sackG.add(sackGlow);
  const floor = floorLight(C.gold, 0.08);
  floor.scale.setScalar(1.1);
  rig.add(floor);
  const shadow = groundShadow(0.38, 0.4);
  s.group.add(shadow);
  const dtOf = clock();
  const throwAge = clip();
  let windK = 0;
  const _sp = new Color();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, walkPhase = 0, moveK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'sidle';
      const winding = mode === 'wind';
      const prog = winding ? teleProg(e, tick) : 0;
      const ta = throwAge(e ? e.throwTick : -1, dt);
      // The hurl: a fast forward heave and a slow recovery.
      const hurl = ta < 0.7 ? (ta < 0.12 ? ta / 0.12 : Math.exp(-(ta - 0.12) * 5)) : 0;
      windK = approach(windK, winding ? 1 : 0, 12, dt);
      const back = windK * smooth(prog * 1.6);
      // Sack: on the shoulder at rest, heaved back over the head through the
      // wind-up (trembling at the top), flung forward on the throw.
      // (+x swings the sack up over the head from behind the shoulder; past
      // ~1.6 rad it comes over the top and forward.)
      sackP.rotation.x = 0.1 + 0.08 * Math.sin(walkPhase * 1.4) * moveK + 1.25 * back + 1.5 * hurl * (1 - 0.3 * back);
      sackP.rotation.z = -0.15 + 0.15 * back;
      sackG.position.y = -0.04 + 0.04 * back * Math.sin(t * 30) * prog;
      // After the throw the sack is empty: limp and dim for a beat.
      const empty = ta < 1.6 ? 1 - smooth((ta - 0.4) / 1.2) : 0;
      sackG.scale.set(1, 1 - 0.3 * empty, 1 - 0.15 * empty);
      // Heat in the holes: banked coal, gold through the wind-up, white at
      // the top; out while the sack is empty.
      const flick = 0.07 * Math.sin(t * 9 + id) + 0.05 * Math.sin(t * 23 + id * 2);
      const hot = (0.3 + flick + back * 0.7) * (1 - 0.85 * empty);
      heatColor(holeHot.color, Math.min(1, hot));
      for (let i = 0; i < holes.length; i++) holes[i].scale.setScalar(0.85 + 0.25 * Math.sin(t * 7 + i * 1.9 + id) * 0.5 + 0.3 * back);
      heatColor(_sp, Math.min(0.9, hot));
      sackGlow.material.color.copy(_sp);
      sackGlow.material.opacity = clamp01(0.1 + 0.4 * hot);
      sackGlow.scale.setScalar(0.5 + 0.5 * hot);
      floor.material.opacity = clamp01(0.04 + 0.16 * hot);
      floor.position.set(-0.15 * (1 - back), 0.03, -0.25 + 0.2 * back);
      // Body: a heavy sidle; leaning back into the heave, pitching forward
      // on the hurl.
      const go = moveK * (1 - windK);
      const wad = Math.sin(walkPhase * 1.5);
      bodyG.position.y = 0.24 + 0.03 * Math.abs(wad) * go - 0.03 * windK;
      rig.rotation.x = -0.25 * back + 0.35 * hurl;
      rig.rotation.z = 0.12 * wad * go;
      rig.position.z = 0.08 * hurl;
      for (const { hip, side } of legs) {
        hip.rotation.x = side * 0.5 * wad * go + 0.2 * hurl * side;
        hip.rotation.z = side * (0.08 + 0.12 * windK);
      }
      // Arms: both hands up over the head on the sack through the wind-up,
      // thrown forward together on the hurl.
      for (const { sh, fore, side } of arms) {
        const holder = side < 0;
        // At rest the left hand steadies the sack from behind, the right
        // swings; both go up over the head for the heave and come
        // down forward on the hurl.
        let x = holder ? 0.7 : side * 0.35 * wad * go - 0.15;
        x += (-3.3 - x) * back;
        x += (-1.3 - x) * hurl;
        sh.rotation.x = x;
        sh.rotation.z = side * (holder ? 0.15 : 0.3) * (1 - back) + side * 0.12 * back;
        fore.rotation.x = holder ? -1.0 * (1 - back) * (1 - hurl) - 0.2 : -0.5 * (1 - back) - 0.2;
      }
      head.rotation.x = -0.25 * back + 0.25 * hurl;
      stitchGlow.material.opacity = 0.14 + 0.06 * Math.sin(t * 2 + id);
    },
  };
}

// ---------------------------------------------------------- ASH WRAITH --
const WRAITH_SKIRT = 8;
const WRAITH_MOTES = 4;
const SWIRL = 6;
export function buildAshWraith() {
  const s = shell('ashwraith');
  const { rig, track } = s;
  const ashM = track(flashable(C.ash));
  const darkM = track(flashable(C.ashDark));
  const clawM = track(flashable(C.claw));
  const emberM = heatMat(C.gold);
  const hover = new Group();
  hover.position.y = 0.35;
  rig.add(hover);
  const form = new Group(); // everything that collapses into the ash
  hover.add(form);
  // The ragged skirt: tattered ash strips hanging from the hips to the floor.
  const skirt = [];
  // A cone of ash for the mass of it, torn strips flaring off it.
  const core = new Mesh(shared('aw-core', () => new ConeGeometry(0.22, 0.6, 7).rotateX(Math.PI).translate(0, -0.08, 0)), darkM);
  core.position.y = 0.25;
  core.scale.set(1, 1, 0.85);
  addInk(core);
  form.add(core);
  const stripG = shared('aw-strip', () => new ConeGeometry(0.09, 0.6, 3).translate(0, -0.3, 0));
  for (let i = 0; i < WRAITH_SKIRT; i++) {
    const a = (i / WRAITH_SKIRT) * Math.PI * 2;
    const p = new Group();
    p.position.set(Math.sin(a) * 0.13, 0.27, Math.cos(a) * 0.11);
    form.add(p);
    const m = new Mesh(stripG, i % 2 ? darkM : ashM);
    m.scale.set(1, 0.75 + 0.3 * (((i * 7) % 3) / 2), 0.5);
    p.add(m);
    skirt.push({ p, a, i });
  }
  // Torso: a long, hunched column of ash leaning forward.
  const spine = new Group();
  spine.position.y = 0.25;
  form.add(spine);
  const chest = new Mesh(shared('aw-chest', () => new CylinderGeometry(0.2, 0.12, 0.58, 6).translate(0, 0.29, 0)), ashM);
  chest.scale.set(1.15, 1, 0.8);
  addInk(chest);
  spine.add(chest);
  // A hunched back: a hump of ash over the shoulders, the head slung low
  // in front of it.
  const shoulders = new Mesh(shared('aw-shoulders', () => new IcosahedronGeometry(0.17, 1)), darkM);
  shoulders.scale.set(1.7, 0.55, 1.05);
  shoulders.position.set(0, 0.56, -0.05);
  addInk(shoulders);
  spine.add(shoulders);
  // The last ember, deep in the chest, seen through a crack.
  const ember = new Mesh(shared('aw-ember', () => new IcosahedronGeometry(0.06, 0)), emberM);
  ember.position.set(0, 0.36, 0.15);
  spine.add(ember);
  const crack = new Mesh(shared('aw-crack', () => mergeGeometries([rod([0, 0.27, 0.16], [0.03, 0.36, 0.17], 0.01, 3), rod([0.0, 0.36, 0.17], [-0.035, 0.45, 0.15], 0.01, 3)])), emberM);
  spine.add(crack);
  const emberGlow = heatGlow(0.8, 0.35);
  emberGlow.position.set(0, 0.36, 0.22);
  spine.add(emberGlow);
  // Head: a hooded skull-shape of ash, jutting forward; indigo pin-eyes.
  const head = new Group();
  head.position.set(0, 0.62, 0.2);
  spine.add(head);
  // A cowl of darker ash, open at the front, a pale ash face sunk in it.
  const hood = new Mesh(shared('aw-hood', () => new IcosahedronGeometry(0.13, 0)), darkM);
  hood.scale.set(1.0, 1.15, 1.2);
  hood.position.set(0, 0.03, -0.03);
  addInk(hood);
  head.add(hood);
  const face = new Mesh(shared('aw-face', () => new IcosahedronGeometry(0.085, 0)), ashM);
  face.scale.set(0.85, 1.1, 0.8);
  face.position.set(0, -0.02, 0.07);
  head.add(face);
  const eyeG = shared('aw-eye', () => new IcosahedronGeometry(0.016, 0));
  const eyeM = tellMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(eyeG, eyeM);
    eye.position.set(side * 0.032, 0.0, 0.135);
    head.add(eye);
  }
  const eyeGlow = tellGlow(0.24, 0.2);
  eyeGlow.position.set(0, 0.0, 0.16);
  head.add(eyeGlow);
  // Arms: long and thin, hanging, three cinder claws each.
  const arms = [];
  const armG = shared('aw-arm', () => new CylinderGeometry(0.04, 0.026, 0.38, 4).translate(0, -0.19, 0));
  const clawG = shared('aw-claw', () => new ConeGeometry(0.024, 0.3, 3).translate(0, -0.15, 0));
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.27, 0.56, 0.02);
    spine.add(sh);
    sh.add(new Mesh(armG, ashM));
    const fore = new Group();
    fore.position.y = -0.38;
    sh.add(fore);
    fore.add(new Mesh(armG, darkM));
    const hand = new Group();
    hand.position.y = -0.38;
    fore.add(hand);
    for (let k = -1; k <= 1; k++) {
      const c = new Mesh(clawG, clawM);
      c.position.x = k * 0.025;
      c.rotation.set(0.25, 0, k * 0.18);
      hand.add(c);
    }
    arms.push({ sh, fore, side });
  }
  // Ash drifting off it (pale motes rising); and the swirl it leaves.
  const ashCol = new Color(C.ash).multiplyScalar(0.55);
  const motes = [];
  for (let i = 0; i < WRAITH_MOTES; i++) {
    const m = makeGlowSprite({ color: ashCol, size: 0.12, opacity: 0 });
    m.material.toneMapped = false;
    rig.add(m);
    motes.push(m);
  }
  const swirl = [];
  for (let i = 0; i < SWIRL; i++) {
    const m = makeGlowSprite({ color: ashCol, size: 0.32, opacity: 0 });
    m.material.toneMapped = false;
    rig.add(m);
    swirl.push(m);
  }
  const floor = floorLight(C.gold, 0.06);
  floor.scale.setScalar(0.9);
  rig.add(floor);
  const shadow = groundShadow(0.3, 0.3, { wide: 1.2 });
  s.group.add(shadow);
  const dtOf = clock();
  const rakeAge = clip();
  let goneK = 0; // 0 whole -> 1 gone into the ash
  let spentK = 0;
  let wasGone = false;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, tick, moveK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'drift';
      const gone = !!(e && e.veiled) || mode === 'gone';
      const ra = rakeAge(e ? e.rakeTick : -1, dt);
      const rake = ra < 0.5 ? Math.exp(-ra * 6) : 0;
      // Fading: it collapses into the ash over a few frames; rising, it is
      // back whole at once (the rake reads as a surprise).
      if (gone) goneK = Math.min(1, goneK + dt * 5);
      else goneK = 0;
      if (wasGone && !gone) goneK = 0;
      wasGone = gone;
      const spent = mode === 'spent';
      const until = e && e.spentUntil ? e.spentUntil : 0;
      const creep = spent && tick != null && until > 0 ? clamp01(1 - (until - tick) / 40) : 1;
      spentK = approach(spentK, spent ? 1 - creep : 0, 8, dt);
      const g = smooth(goneK);
      form.scale.set(1 - 0.85 * g, 1 - 0.95 * g, 1 - 0.85 * g);
      form.rotation.y = g * 5.0;
      form.visible = g < 0.97;
      // Hover: a slow drifting bob; low and sagging spent.
      hover.position.y = 0.35 + 0.06 * Math.sin(t * 1.7 + id) * (1 - spentK) - 0.12 * spentK;
      spine.rotation.x = 0.18 + 0.15 * moveK + 0.4 * spentK - 0.15 * rake;
      spine.rotation.z = 0.06 * Math.sin(t * 1.3 + id);
      for (const { p, a, i } of skirt) {
        // Flared out round the hips, trailing back as it drifts.
        p.rotation.x = -0.3 * moveK + 0.12 * Math.sin(t * 3 + i * 1.3 + id) - 0.32 * Math.cos(a);
        p.rotation.z = 0.12 * Math.sin(t * 2.5 + i * 2.1) + 0.32 * Math.sin(a);
      }
      // Arms: hanging and swaying; the rake swings both claws across; spent
      // they dangle.
      for (const { sh, fore, side } of arms) {
        sh.rotation.x = -0.35 - 0.2 * Math.sin(t * 1.9 + side + id) * (1 - spentK) + 0.3 * spentK - 1.6 * rake;
        sh.rotation.z = side * (0.25 + 0.6 * rake * (side > 0 ? 1 : 0.6)) - side * 0.1 * spentK;
        fore.rotation.x = -0.4 - 0.5 * rake + 0.3 * spentK;
      }
      head.rotation.x = -0.15 + 0.3 * spentK;
      // The ember: a steady smoulder, white-hot on the rake, dim spent.
      const flick = 0.06 * Math.sin(t * 8 + id) + 0.04 * Math.sin(t * 19 + id * 2);
      const heat = (0.55 + flick) * (1 - 0.8 * spentK) + 0.5 * rake;
      heatColor(emberM.color, Math.min(1, heat));
      heatColor(emberGlow.material.color, Math.min(0.9, heat));
      emberGlow.material.opacity = clamp01(0.12 + 0.35 * heat) * (1 - g);
      emberGlow.scale.setScalar(0.45 + 0.4 * heat);
      floor.material.opacity = clamp01(0.03 + 0.1 * heat) * (1 - g);
      eyeGlow.material.opacity = (0.16 + 0.06 * Math.sin(t * 2 + id)) * (1 - g);
      // Motes rising off it while it is whole.
      for (let i = 0; i < motes.length; i++) {
        const u = (t * 0.45 + i / WRAITH_MOTES + id * 0.17) % 1;
        const m = motes[i];
        m.position.set(0.18 * Math.sin(i * 2.3 + t * 0.6), 0.4 + u * 1.4, -0.1 + 0.15 * Math.cos(i * 1.9 + t * 0.5));
        m.material.opacity = 0.35 * (1 - u) * (1 - g) * (1 - 0.6 * spentK);
      }
      // The swirl: a turning column of ash, thick as it fades, thinning to a
      // faint wisp while it is gone; a burst of it when it rises.
      const sw = gone ? 0.25 + 0.75 * (1 - g) * g * 4 : 0.9 * rake;
      for (let i = 0; i < swirl.length; i++) {
        const a = t * 4.5 + (i / SWIRL) * Math.PI * 2;
        const h = (i / SWIRL + t * 0.35) % 1;
        const r = 0.18 + 0.2 * h + 0.3 * rake;
        const m = swirl[i];
        m.position.set(Math.cos(a) * r, 0.1 + h * 0.9, Math.sin(a) * r);
        m.material.opacity = clamp01(sw * (1 - h) * 0.55);
        m.scale.setScalar(0.25 + 0.25 * h);
      }
      shadow.material.opacity = 0.22 * (1 - g);
    },
  };
}
