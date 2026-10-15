// Act V enemy rigs (docs/ACT_V.md — The Still Spire): Gust Kite, Chime
// Wraith, Gargoyle, Rope Hanger. Same grammar as render/enemies/woodmill.js:
// flat-faceted toon primitives in cool families, angular charcoal eyes, ink
// on the big masses, a contact shadow, flashable materials in `mats`, shared
// geometry, and exactly ONE indigo corruption tell each. The Spire's matter
// (palette VFX_MATTER kitecloth / bellbronze / spirestone / hemp) is pulled a
// step toward the cool slate family so no body ever reads party-warm.
//   kite      a living kite of cane and weathered sailcloth: a diamond of two
//             tattered sails on a cane cross, a folded-cloth head, a tail of
//             rag bows and a snapped bridle string hanging below; an indigo
//             eye painted on its back. It glides ~1.6 u up; hanging for the
//             dive it folds its sails and tips its nose at the lane; the dive
//             is a streamlined drop; grounded it lies splayed on the floor,
//             struggling to lift; then it climbs back up beating hard
//   chime     a hooded grey shroud open at the front on a cracked bronze bell
//             where its body should be, an indigo clapper inside it. It
//             drifts a hand above the floor, its hem rippling and the bell
//             swaying; the toll wind-up lifts and swings the bell harder and
//             harder, and the toll strikes the clapper and shudders the shroud
//   gargoyle  a winged grotesque of pale limestone, horned and fanged, crouched
//             on its haunches with its knuckles on the ledge. As STONE it is a
//             statue: one flat matte grey, no motion at all, the indigo cracks
//             dark. The wake shakes it and the cracks glow; the burst throws
//             its wings open; awake it lumbers on two legs with the wings
//             half open, rears with both fists up for the slam and brings
//             them down. Settling, the grey creeps back over it
//   hanger    a lanky dead bell-ringer in a ragged smock, rope coiled round
//             its chest, both hands up on a belfry rope that rises ~6 u
//             straight up out of frame; indigo eyes in a hanging head. It
//             shuffles hunched (the rope slack and swaying), grips and leans
//             back (rope taut), swings out along the lane with its legs
//             trailing, then dangles slack and turning at the end
// Faces +Z; the layer drives `pose({ t, walkPhase, moveK, telegraphK, fireK,
// e })` (`e` = the sim entity, READ ONLY; the Journal's viewer passes an idle
// stand-in, so every field read here has a default).
import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { mergeGeometries as mergeRaw } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow, exactColor } from '../critters/common.js';
import { markShared } from '../geocache.js';
import { PALETTE, VFX_MATTER } from '../../data/palette.js';
import { makeGlowSprite, getRadialTexture } from '../glow.js';
import { TELL_INDIGO, TELL_INDIGO_DIM, TELL_INDIGO_GLOW } from './style.js';
import { TICK_HZ } from '../../core/constants.js';

const flashable = (color, extra = {}) => toonMaterial({ color, emissive: '#FFFFFF', emissiveIntensity: 0, ...extra });
const inkMat = () => new MeshBasicMaterial({ color: exactColor(PALETTE.voidCharcoal), toneMapped: false });
const tellMat = () => new MeshBasicMaterial({ color: TELL_INDIGO.clone(), toneMapped: false });
function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
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
// A thin rod from a to b (for merged crack / bone / cord geometry).
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
// A flat plate from an outline [[x, y], ...] (XY plane), extruded thin and
// centred on its depth.
function plate(points, depth = 0.025) {
  const sh = new Shape(points.map(([x, y]) => new Vector2(x, y)));
  const g = new ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}
function slitEyes(parent, { x = 0.1, y = 0, z = 0.1, len = 0.08, slant = 0.4 } = {}) {
  const g = shared('sp-eye', () => new BoxGeometry(1, 0.024, 0.024));
  const m = inkMat();
  for (const side of [-1, 1]) {
    const eye = new Mesh(g, m);
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
// One-shot clip clock off a sim tick field (landTick / tollTick / ...).
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
// Exponential approach of `cur` to `to` at `rate` per second.
const approach = (cur, to, rate, dt) => cur + (to - cur) * (1 - Math.exp(-rate * dt));
// A tiny deterministic generator for shared geometry (crack paths): shared
// meshes must come out the same in every rig, so no cosmetic stream here.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const cool = (hex, k, mul = 1) => new Color(hex).lerp(new Color(PALETTE.signalBlue), k).multiplyScalar(mul);
// Local hides: the Spire's matter, each pulled toward the cool slate family.
const C = Object.freeze({
  // Gust Kite: pale weathered sail, darker patched panels, grey cane.
  sail: cool(VFX_MATTER.kitecloth, 0.16, 0.95),
  sailPatch: cool(VFX_MATTER.kitecloth, 0.3, 0.62),
  rag: slate(0.2, 0.42),
  cane: new Color(VFX_MATTER.hemp).lerp(slate(0.2, 0.3), 0.55).multiplyScalar(0.8),
  // Chime Wraith: a grey shroud, a dark hood mouth; dark tarnished bronze
  // with a green-grey verdigris band (pulled toward slate, so it stays muted).
  shroud: slate(0.12, 0.44).lerp(new Color(PALETTE.warmGrey), 0.25),
  shroudDark: slate(0.16, 0.3),
  bronze: new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.3), 0.3).multiplyScalar(0.82),
  bronzeDark: new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.2), 0.55).multiplyScalar(0.55),
  verdigris: new Color(PALETTE.sageCloak).lerp(new Color(PALETTE.signalBlue), 0.3).lerp(new Color(PALETTE.bone), 0.3),
  bone: new Color(PALETTE.bone).lerp(new Color(PALETTE.warmGrey), 0.3).multiplyScalar(0.9),
  // Gargoyle: pale cool limestone with darker weathered wings and limbs;
  // the statue grey is one flat, desaturated value over all of it.
  lime: new Color(VFX_MATTER.spirestone).lerp(new Color(PALETTE.signalBlue), 0.12).multiplyScalar(0.84),
  limeDark: new Color(VFX_MATTER.spirestone).lerp(slate(0.25, 0.3), 0.6).multiplyScalar(0.62),
  limeHorn: new Color(PALETTE.bone).lerp(new Color(VFX_MATTER.spirestone), 0.5).multiplyScalar(0.92),
  statue: new Color().setHSL(0.6, 0.02, 0.3),
  crackDark: new Color().setHSL(0.6, 0.05, 0.2),
  // Rope Hanger: dark ragged smock, grey dead skin, old rope.
  smock: slate(0.2, 0.24).lerp(new Color(PALETTE.warmGrey), 0.15),
  smockDark: slate(0.26, 0.13),
  skin: slate(0.08, 0.58).lerp(new Color(PALETTE.bone), 0.25),
  rope: new Color(VFX_MATTER.hemp).lerp(new Color(PALETTE.warmGrey), 0.35).multiplyScalar(0.95),
  // Vane Cock: a brighter weathered brass than the bells (it caught the
  // sun on the steeple), its patina in verdigris; a black iron spindle.
  brass: new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.36), 0.12).multiplyScalar(1.02),
  brassDark: new Color(VFX_MATTER.bellbronze).lerp(slate(0.2, 0.2), 0.5).multiplyScalar(0.6),
  iron: slate(0.12, 0.17),
  lead: slate(0.1, 0.26),
  // Bell Sacristan: a cope of darker weathered stone over a pale stone
  // face and hands; a bronze hem like a bell's lip.
  cope: new Color(VFX_MATTER.spirestone).lerp(slate(0.24, 0.26), 0.7).multiplyScalar(0.62),
  copeDark: new Color(VFX_MATTER.spirestone).lerp(slate(0.28, 0.14), 0.8).multiplyScalar(0.5),
  face: new Color(VFX_MATTER.spirestone).lerp(new Color(PALETTE.bone), 0.25).multiplyScalar(0.92),
});

// -------------------------------------------------------------- KITE --
// One sail of the diamond: outward +X, forward +Y in the outline (rotated
// flat below), a ragged trailing edge.
function kiteSail() {
  const g = plate(
    [
      [0, 0.44],
      [0.8, 0.04],
      [0.7, -0.06],
      [0.62, -0.02],
      [0.5, -0.16],
      [0.36, -0.14],
      [0.24, -0.32],
      [0.1, -0.36],
      [0, -0.5],
    ],
    0.02
  );
  g.rotateX(Math.PI / 2); // lay it flat: outline y -> +Z (forward)
  return g;
}
const KITE_TAIL = 6;
export function buildKite() {
  const s = shell('kite');
  const { rig, track } = s;
  const hover = new Group();
  hover.position.y = 1.6;
  rig.add(hover);
  const sailMat = track(flashable(C.sail, { side: DoubleSide }));
  const patchMat = track(flashable(C.sailPatch, { side: DoubleSide }));
  const caneMat = track(flashable(C.cane));
  const ragMat = track(flashable(C.rag, { side: DoubleSide }));
  // The cane spine down the middle, a knot of cloth for a chest.
  const spine = new Mesh(shared('kt-spine', () => new CylinderGeometry(0.018, 0.014, 1.0, 5).rotateX(Math.PI / 2)), caneMat);
  spine.position.set(0, 0.02, -0.04);
  hover.add(spine);
  const chest = new Mesh(shared('kt-chest', () => new IcosahedronGeometry(0.12, 1)), patchMat);
  chest.scale.set(0.95, 0.55, 1.6);
  chest.position.set(0, 0.0, 0.05);
  addInk(chest);
  hover.add(chest);
  // The folded-cloth head at the nose: a four-sided beak, charcoal slits.
  const head = new Group();
  head.position.set(0, 0.03, 0.42);
  hover.add(head);
  const beak = new Mesh(shared('kt-beak', () => new ConeGeometry(0.075, 0.26, 4).rotateX(Math.PI / 2).translate(0, 0, 0.08)), sailMat);
  beak.rotation.z = Math.PI / 4;
  addInk(beak);
  head.add(beak);
  slitEyes(head, { x: 0.035, y: 0.04, z: 0.06, len: 0.05, slant: 0.5 });
  // The tell: an indigo eye painted on its back, looking up at you.
  const eyeRing = new Mesh(shared('kt-eyering', () => new TorusGeometry(0.075, 0.016, 4, 14).rotateX(Math.PI / 2)), inkMat());
  eyeRing.position.set(0, 0.075, 0.02);
  hover.add(eyeRing);
  const eyeDisc = new Mesh(shared('kt-eye', () => new CylinderGeometry(0.058, 0.058, 0.01, 12)), tellMat());
  eyeDisc.position.set(0, 0.078, 0.02);
  eyeDisc.scale.set(1, 1, 0.62);
  hover.add(eyeDisc);
  const pupil = new Mesh(shared('kt-pupil', () => new CylinderGeometry(0.02, 0.02, 0.012, 8)), inkMat());
  pupil.position.set(0, 0.086, 0.02);
  pupil.scale.set(0.5, 1, 1.3);
  hover.add(pupil);
  const eyeGlow = tellGlow(0.45, 0.2);
  eyeGlow.position.set(0, 0.14, 0.02);
  hover.add(eyeGlow);
  // Sails: shoulder pivots on the spine (pivot -> mirror -> sail), each with
  // its half of the cross spar and a patched panel.
  const sails = [];
  const sailG = shared('kt-sail', kiteSail);
  const sparG = shared('kt-spar', () => new CylinderGeometry(0.014, 0.01, 0.8, 4).rotateZ(Math.PI / 2).translate(0.4, 0, 0));
  const patchG = shared('kt-patch', () => {
    const g = plate([[0.3, 0.1], [0.52, 0.0], [0.42, -0.14], [0.26, -0.08]], 0.024);
    g.rotateX(Math.PI / 2);
    return g;
  });
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.03, 0.01, 0);
    hover.add(pivot);
    const mirror = new Group();
    mirror.scale.x = side;
    pivot.add(mirror);
    const sail = new Mesh(sailG, sailMat);
    addInk(sail);
    mirror.add(sail);
    const spar = new Mesh(sparG, caneMat);
    spar.position.set(0, 0.02, 0.06);
    spar.rotation.y = 0.05;
    mirror.add(spar);
    const patch = new Mesh(patchG, patchMat);
    patch.position.y = 0.006;
    mirror.add(patch);
    sails.push({ pivot, side });
  }
  // Tail: a chain of cord joints from the spine's end, a rag bow at each.
  const tailRoot = new Group();
  tailRoot.position.set(0, 0, -0.52);
  hover.add(tailRoot);
  const cordG = shared('kt-cord', () => new CylinderGeometry(0.008, 0.008, 0.17, 3).rotateX(Math.PI / 2).translate(0, 0, -0.085));
  const bowG = shared('kt-bow', () => {
    const a = new BoxGeometry(0.16, 0.012, 0.06);
    a.rotateY(0.35);
    const b = new BoxGeometry(0.16, 0.012, 0.06);
    b.rotateY(-0.35);
    return mergeGeometries([a, b]);
  });
  const tail = [];
  let parent = tailRoot;
  for (let i = 0; i < KITE_TAIL; i++) {
    const j = new Group();
    if (i > 0) j.position.z = -0.17;
    parent.add(j);
    j.add(new Mesh(cordG, caneMat));
    const bow = new Mesh(bowG, i % 2 ? sailMat : ragMat);
    bow.position.z = -0.17;
    bow.scale.setScalar(1 - i * 0.08);
    j.add(bow);
    tail.push(j);
    parent = j;
  }
  // A snapped bridle string hanging from the chest.
  const bridle = new Group();
  bridle.position.set(0, -0.04, 0.04);
  hover.add(bridle);
  const bridleCord = new Mesh(shared('kt-bridle', () => new CylinderGeometry(0.006, 0.006, 0.7, 3).translate(0, -0.35, 0)), caneMat);
  bridle.add(bridleCord);
  const shadow = groundShadow(0.42, 0.36, { wide: 1.6 });
  s.group.add(shadow);
  const dtOf = clock();
  const landAge = clip();
  let hgt = 1.6;
  let hang = 0;
  let ground = 0;
  let lastMode = 'soar';
  let diveTicks = 23;
  let laneLen = 4.5;
  let rise = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'soar';
      if (e && e.telegraph && e.telegraph.length) laneLen = e.telegraph.length;
      // The drop's progress off the sim's own countdown (diveTicksLeft
      // against the lane's whole drop at 12 u/s), so a frozen or stepped
      // sim poses it exactly.
      if (mode === 'dive' && lastMode !== 'dive') diveTicks = Math.max(1, Math.ceil(laneLen / (12 / TICK_HZ)));
      if (lastMode === 'grounded' && mode !== 'grounded') rise = 1;
      lastMode = mode;
      const la = landAge(e ? e.landTick : -1, dt);
      const thump = la < 0.3 ? 1 - la / 0.3 : 0;
      const hanging = mode === 'hang' ? 1 : 0;
      hang = approach(hang, hanging, 8, dt);
      ground = approach(ground, mode === 'grounded' ? 1 : 0, 14, dt);
      rise = Math.max(0, rise - dt * 0.9);
      const tk = Math.max(telegraphK, hang * 0.8);
      const diving = mode === 'dive' ? 1 : 0;
      const left = e && e.diveTicksLeft != null ? e.diveTicksLeft : 0;
      const dp = diving ? smooth(1 - left / diveTicks) : 0;
      // Height: soar ~1.6 with a slow bob, hang a little higher, the dive a
      // straight drop to the floor, grounded flat on it.
      let want = 1.6 + 0.08 * Math.sin(t * 1.7 + id) + 0.18 * tk;
      if (mode === 'grounded') want = 0.07;
      if (diving) hgt = 1.78 - 1.6 * dp;
      else hgt = approach(hgt, want, mode === 'grounded' ? 16 : rise > 0 ? 2.2 : 4, dt);
      hover.position.y = hgt;
      // Struggle on the floor: feeble lifts and jerks; the climb beats hard.
      const strug = ground * Math.max(0, Math.sin(t * 7 + id)) * (0.5 + 0.5 * Math.sin(t * 1.9 + id));
      const climb = rise * (1 - ground);
      hover.rotation.x = 0.08 * (1 - tk) * (1 - ground) + 0.45 * tk * (1 - diving) + (0.35 + 0.15 * dp) * diving - 0.25 * climb + 0.1 * thump;
      hover.rotation.z = 0.12 * Math.sin(t * 1.1 + id) * (1 - tk) * (1 - ground) + ground * (0.22 + 0.08 * strug) + 0.03 * Math.sin(t * 31) * tk * (1 - diving);
      hover.position.x = 0.04 * Math.sin(t * 23 + id) * tk * (1 - diving);
      hover.scale.set(1 - 0.1 * diving, 1, 1 + 0.15 * diving);
      // Sails: lazy billow aloft, folded up and swept back for the dive,
      // splayed flat on the floor (lifting weakly), big beats on the climb.
      const beat = Math.sin(t * (climb > 0.05 ? 11 : 3.6) + id);
      const fold = Math.max(tk * 0.85, diving);
      for (const { pivot, side } of sails) {
        const free = (0.12 + 0.22 * beat) * (1 - ground) + climb * 0.4 * beat;
        pivot.rotation.z = side * (free * (1 - fold) + 1.05 * fold + ground * (-0.12 * (1 - fold) + 0.35 * strug) - thump * 0.2);
        pivot.rotation.y = side * (0.55 * fold);
      }
      eyeGlow.material.opacity = 0.18 + 0.35 * tk + 0.25 * diving + 0.2 * thump;
      head.rotation.x = 0.3 * tk * (1 - diving) - 0.2 * ground;
      // Tail: rags flutter aloft, stream straight in the dive, lie on the
      // floor grounded.
      for (let i = 0; i < tail.length; i++) {
        const j = tail[i];
        const flut = Math.sin(t * 5.5 - i * 0.9 + id);
        j.rotation.y = (0.32 * flut * (1 - diving * 0.8) + 0.08 * flut * ground) * (1 - 0.5 * ground);
        j.rotation.x = (0.16 + 0.05 * Math.sin(t * 3 - i)) * (1 - diving) * (1 - ground) - 0.06 * diving;
      }
      bridle.rotation.x = -hover.rotation.x + 0.15 * Math.sin(t * 2.3 + id) - 0.6 * diving;
      bridle.visible = ground < 0.5;
      // Shadow: tighter and darker as it comes down.
      const sk = 1 - 0.35 * clamp01(hgt / 1.8);
      shadow.scale.setScalar(sk);
      shadow.material.opacity = 0.22 + 0.2 * (1 - clamp01(hgt / 1.8));
    },
  };
}

// ------------------------------------------------------------- CHIME --
function bellGeometry() {
  // A bell profile (radius, height), crown at the top, flared lip at y 0.
  const pts = [
    [0.0, 0.42],
    [0.11, 0.42],
    [0.15, 0.39],
    [0.16, 0.3],
    [0.18, 0.18],
    [0.22, 0.08],
    [0.28, 0.02],
    [0.3, 0.0],
    [0.27, -0.01],
    [0.23, 0.04],
  ].map(([r, y]) => new Vector2(r, y));
  const g = new LatheGeometry(pts, 12);
  g.translate(0, -0.42, 0); // hung from the crown
  return g;
}
const HEM = 9;
export function buildChime() {
  const s = shell('chime');
  const { rig, track } = s;
  const hover = new Group();
  hover.position.y = 0.16;
  rig.add(hover);
  const shroudMat = track(flashable(C.shroud, { side: DoubleSide }));
  const darkMat = track(flashable(C.shroudDark, { side: DoubleSide }));
  const bronzeMat = track(flashable(C.bronze, { side: DoubleSide }));
  const bronzeDark = track(flashable(C.bronzeDark));
  const verdMat = track(flashable(C.verdigris));
  const boneMat = track(flashable(C.bone));
  // The shroud: an open cone from the hood down, parted at the front so the
  // bell shows where a body would be.
  const drape = new Group();
  drape.position.y = 1.5;
  hover.add(drape);
  const cloak = new Mesh(shared('ch-cloak', () => new CylinderGeometry(0.17, 0.44, 0.78, 11, 2, true, Math.PI * 0.2, Math.PI * 1.6).translate(0, -0.39, 0)), shroudMat);
  addInk(cloak);
  drape.add(cloak);
  const lining = new Mesh(shared('ch-lining', () => new CylinderGeometry(0.155, 0.41, 0.74, 11, 1, true, Math.PI * 0.24, Math.PI * 1.52).translate(0, -0.38, 0)), darkMat);
  drape.add(lining);
  // Torn hem strips round the bottom (they ripple).
  const hem = [];
  const hemG = shared('ch-hem', () => new BoxGeometry(0.13, 0.16, 0.018).translate(0, -0.08, 0));
  for (let i = 0; i < HEM; i++) {
    const a = Math.PI * 0.26 + (i / (HEM - 1)) * Math.PI * 1.48;
    const p = new Group();
    p.position.set(Math.sin(a) * 0.43, -0.76, Math.cos(a) * 0.43);
    p.rotation.y = a;
    drape.add(p);
    const strip = new Mesh(hemG, i % 3 === 1 ? darkMat : shroudMat);
    strip.scale.y = 0.7 + ((i * 37) % 10) / 20;
    p.add(strip);
    hem.push({ p, i });
  }
  // Hood: a peaked cowl over a black face hollow, two charcoal slits deep in.
  const hood = new Group();
  hood.position.set(0, 0.06, 0.02);
  drape.add(hood);
  const cowl = new Mesh(shared('ch-cowl', () => new IcosahedronGeometry(0.2, 1)), shroudMat);
  cowl.scale.set(1.0, 1.1, 1.05);
  addInk(cowl);
  hood.add(cowl);
  const peak = new Mesh(shared('ch-peak', () => new ConeGeometry(0.12, 0.26, 5)), shroudMat);
  peak.position.set(0, 0.2, -0.08);
  peak.rotation.x = -0.55;
  hood.add(peak);
  const hollow = new Mesh(shared('ch-hollow', () => new SphereGeometry(0.13, 10, 6)), inkMat());
  hollow.scale.set(0.95, 1.05, 0.5);
  hollow.position.set(0, -0.02, 0.14);
  hood.add(hollow);
  slitEyes(hood, { x: 0.045, y: 0.0, z: 0.19, len: 0.045, slant: -0.35 });
  // Sleeves: two ragged cones from the shoulders with bony fingers, holding
  // the yoke the bell hangs from.
  const sleeves = [];
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.2, -0.16, 0.02);
    drape.add(sh);
    const sleeve = new Mesh(shared('ch-sleeve', () => new ConeGeometry(0.1, 0.5, 6, 1, true).translate(0, -0.25, 0)), shroudMat);
    sleeve.rotation.x = Math.PI;
    sleeve.position.y = -0.5;
    sh.add(sleeve);
    const hand = new Mesh(shared('ch-hand', () => new IcosahedronGeometry(0.045, 0)), boneMat);
    hand.position.set(0, -0.5, 0);
    hand.scale.set(0.8, 1.3, 0.8);
    sh.add(hand);
    sleeves.push({ sh, side });
  }
  // The bell: a yoke beam the sleeves hold, the bell on a pivot under it.
  const yoke = new Mesh(shared('ch-yoke', () => new BoxGeometry(0.44, 0.06, 0.07)), bronzeDark);
  yoke.position.set(0, -0.6, 0.05);
  drape.add(yoke);
  const bellPivot = new Group();
  bellPivot.position.set(0, -0.62, 0.05);
  drape.add(bellPivot);
  const bellBody = new Group();
  bellBody.scale.setScalar(1.45); // the bell IS the body: big, hung below the shroud
  bellPivot.add(bellBody);
  const bell = new Mesh(shared('ch-bell', bellGeometry), bronzeMat);
  addInk(bell);
  bellBody.add(bell);
  const crown = new Mesh(shared('ch-crown', () => new TorusGeometry(0.05, 0.018, 4, 8)), bronzeDark);
  crown.position.y = 0.02;
  bellBody.add(crown);
  const lip = new Mesh(shared('ch-lip', () => new TorusGeometry(0.29, 0.022, 4, 16).rotateX(Math.PI / 2)), bronzeDark);
  lip.position.y = -0.42;
  bellBody.add(lip);
  const band = new Mesh(shared('ch-band', () => new TorusGeometry(0.226, 0.014, 3, 14).rotateX(Math.PI / 2)), verdMat);
  band.position.y = -0.33;
  bellBody.add(band);
  // The crack: a jagged charcoal seam up the bell's face, a chipped lip.
  const crack = new Mesh(
    shared('ch-crack', () =>
      mergeGeometries([
        rod([0.02, -0.41, 0.285], [0.06, -0.33, 0.24], 0.011),
        rod([0.06, -0.33, 0.24], [0.02, -0.25, 0.2], 0.01),
        rod([0.02, -0.25, 0.2], [0.05, -0.16, 0.172], 0.009),
        rod([0.06, -0.33, 0.24], [0.12, -0.3, 0.22], 0.008),
      ])
    ),
    inkMat()
  );
  bellBody.add(crack);
  // The clapper (the tell): an indigo ball on a short rod inside the bell.
  const clapPivot = new Group();
  clapPivot.position.y = -0.06;
  bellBody.add(clapPivot);
  const clapRod = new Mesh(shared('ch-claprod', () => new CylinderGeometry(0.012, 0.012, 0.28, 4).translate(0, -0.14, 0)), bronzeDark);
  clapPivot.add(clapRod);
  const clapper = new Mesh(shared('ch-clapper', () => new IcosahedronGeometry(0.06, 1)), tellMat());
  clapper.position.y = -0.3;
  clapPivot.add(clapper);
  const bellGlow = tellGlow(0.75, 0.24);
  bellGlow.position.y = -0.36;
  bellBody.add(bellGlow);
  s.group.add(groundShadow(0.4, 0.3));
  const dtOf = clock();
  const tollAge = clip();
  let swingPh = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const ta = tollAge(e ? e.tollTick : -1, dt);
      // The strike: a sharp hit decaying over ~0.7 s.
      const hit = ta < 0.7 ? Math.exp(-ta * 6) : 0;
      const tk = telegraphK;
      // Drift: a slow bob a hand off the floor, leaning into its drift.
      hover.position.y = 0.16 + 0.05 * Math.sin(t * 1.6 + id) + 0.2 * tk;
      hover.rotation.x = 0.1 * moveK - 0.12 * tk + 0.08 * hit;
      drape.rotation.z = 0.04 * Math.sin(t * 0.9 + id) * (1 - tk);
      // The shroud flares out on the strike, gathers in on the wind-up.
      const flare = 1 + 0.22 * hit - 0.05 * tk;
      cloak.scale.set(flare, 1, flare);
      lining.scale.set(flare, 1, flare);
      for (const { p, i } of hem) p.rotation.x = -(0.12 + 0.14 * Math.sin(t * 3.1 - i * 0.8 + id)) * (1 + 0.6 * moveK) - 0.7 * hit - 0.15 * tk;
      // Hood: bowed while drifting, thrown back for the toll.
      hood.rotation.x = 0.18 - 0.5 * tk + 0.3 * hit;
      for (const { sh, side } of sleeves) {
        sh.rotation.x = -0.25 - 0.9 * tk + 0.4 * hit;
        sh.rotation.z = side * (0.12 + 0.18 * tk);
      }
      // The bell: a lazy sway while drifting; the wind-up lifts it and
      // swings it ever harder; the toll is a hard swing with the clapper
      // slamming the far wall.
      swingPh += dt * (2.2 + 5 * tk);
      const amp = 0.1 + 0.55 * tk;
      const sw = Math.sin(swingPh + id) * amp;
      bellPivot.position.y = -0.62 + 0.12 * tk;
      bellPivot.rotation.x = sw + 0.5 * hit * Math.sin(ta * 22);
      bellPivot.rotation.z = 0.05 * Math.sin(t * 1.3 + id) + 0.2 * hit * Math.sin(ta * 17);
      clapPivot.rotation.x = -sw * 1.4 + 0.6 * hit * Math.cos(ta * 30);
      bellBody.scale.setScalar(1.45 * (1 + 0.1 * hit));
      bellBody.position.x = 0.025 * hit * Math.sin(ta * 70);
      bellGlow.material.opacity = 0.2 + 0.35 * tk + 0.55 * hit;
      bellGlow.scale.setScalar(0.75 * (1 + 0.6 * hit));
    },
  };
}

// ---------------------------------------------------------- GARGOYLE --
function gargWing() {
  // A bat wing of stone: a bony leading edge out and up, scalloped below.
  return plate(
    [
      [0, 0.04],
      [0.2, 0.3],
      [0.46, 0.5],
      [0.7, 0.62],
      [0.66, 0.42],
      [0.62, 0.22],
      [0.52, 0.24],
      [0.46, 0.04],
      [0.34, 0.12],
      [0.26, -0.1],
      [0.14, 0.0],
      [0.04, -0.12],
    ],
    0.04
  );
}
// Crack seams wandering over an ellipsoid (centre c, radii r): a handful of
// short zigzag polylines, merged into one mesh.
function crackSeams(seed, c, r, paths, { steps = 4, front = 0 } = {}) {
  const rand = lcg(seed);
  const parts = [];
  for (let p = 0; p < paths; p++) {
    let th = (rand() - 0.5) * Math.PI * 1.7 + front; // around Y, 0 = +Z
    let ph = 0.6 + rand() * 1.6; // from +Y down
    const at = () => [c[0] + r[0] * 1.03 * Math.sin(ph) * Math.sin(th), c[1] + r[1] * 1.03 * Math.cos(ph), c[2] + r[2] * 1.03 * Math.sin(ph) * Math.cos(th)];
    let prev = at();
    for (let s = 0; s < steps; s++) {
      th += (rand() - 0.5) * 0.7;
      ph += 0.15 + rand() * 0.25;
      const next = at();
      parts.push(rod(prev, next, 0.014 - s * 0.002));
      if (s === 1 && rand() < 0.6) {
        // a short branch
        const th2 = th + (rand() < 0.5 ? -0.4 : 0.4);
        const b = [c[0] + r[0] * 1.03 * Math.sin(ph + 0.1) * Math.sin(th2), c[1] + r[1] * 1.03 * Math.cos(ph + 0.1), c[2] + r[2] * 1.03 * Math.sin(ph + 0.1) * Math.cos(th2)];
        parts.push(rod(next, b, 0.009));
      }
      prev = next;
    }
  }
  return mergeGeometries(parts);
}
export function buildGargoyle() {
  const s = shell('gargoyle');
  const { rig, track } = s;
  rig.scale.setScalar(1.08);
  const lime = track(flashable(C.lime));
  const dark = track(flashable(C.limeDark, { side: DoubleSide }));
  const horn = track(flashable(C.limeHorn));
  const body = [
    [lime, C.lime],
    [dark, C.limeDark],
    [horn, C.limeHorn],
  ];
  // The cracks (the tell): unlit, dark seams in stone, indigo when awake.
  const crackMat = new MeshBasicMaterial({ color: C.crackDark.clone(), toneMapped: false });
  const hips = new Group();
  hips.position.y = 0.42;
  rig.add(hips);
  // Hind legs: thigh -> knee -> shin -> clawed foot.
  const legs = [];
  const thighG = shared('gg-thigh', () => new CylinderGeometry(0.1, 0.075, 0.38, 6).translate(0, -0.19, 0));
  const shinG = shared('gg-shin', () => new CylinderGeometry(0.07, 0.055, 0.35, 5).translate(0, -0.175, 0));
  const footG = shared('gg-foot', () => new BoxGeometry(0.14, 0.06, 0.2).translate(0, 0, 0.05));
  const clawG = shared('gg-claw', () => new ConeGeometry(0.022, 0.08, 3).rotateX(Math.PI / 2));
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.2, 0, -0.04);
    hips.add(hip);
    const thigh = new Mesh(thighG, lime);
    addInk(thigh);
    hip.add(thigh);
    const knee = new Group();
    knee.position.y = -0.38;
    hip.add(knee);
    knee.add(new Mesh(shinG, dark));
    const foot = new Group();
    foot.position.y = -0.35;
    knee.add(foot);
    foot.add(new Mesh(footG, dark));
    for (const dx of [-0.045, 0, 0.045]) {
      const cl = new Mesh(clawG, horn);
      cl.position.set(dx, -0.01, 0.17);
      foot.add(cl);
    }
    legs.push({ hip, knee, foot, side });
  }
  // Torso: a heavy hunched chest leaning out over the knees.
  const torso = new Group();
  torso.position.set(0, 0.02, 0.0);
  hips.add(torso);
  const belly = new Mesh(shared('gg-belly', () => new IcosahedronGeometry(0.22, 1)), lime);
  belly.scale.set(1.1, 1.0, 0.95);
  belly.position.set(0, 0.08, 0.02);
  torso.add(belly);
  const chest = new Mesh(shared('gg-chest', () => new IcosahedronGeometry(0.28, 1)), lime);
  chest.scale.set(1.15, 0.95, 0.95);
  chest.position.set(0, 0.36, 0.1);
  addInk(chest);
  torso.add(chest);
  // Spine ridge knobs down the back.
  const knobG = shared('gg-knob', () => new ConeGeometry(0.04, 0.1, 4));
  for (let i = 0; i < 4; i++) {
    const k = new Mesh(knobG, dark);
    k.position.set(0, 0.5 - i * 0.13, -0.17 + i * 0.01);
    k.rotation.x = -0.9;
    torso.add(k);
  }
  const torsoCracks = new Mesh(shared('gg-cracks-t', () => crackSeams(7, [0, 0.36, 0.1], [0.32, 0.27, 0.27], 6, { front: 0 })), crackMat);
  torso.add(torsoCracks);
  // Head: low and forward, a heavy brow, back-swept horns, a fanged jaw.
  const neck = new Group();
  neck.position.set(0, 0.56, 0.3);
  torso.add(neck);
  const skull = new Mesh(shared('gg-skull', () => new IcosahedronGeometry(0.15, 1)), lime);
  skull.scale.set(1.1, 0.9, 1.1);
  skull.position.set(0, 0.04, 0.06);
  addInk(skull);
  neck.add(skull);
  const brow = new Mesh(shared('gg-brow', () => new BoxGeometry(0.26, 0.06, 0.09)), dark);
  brow.position.set(0, 0.1, 0.16);
  brow.rotation.x = 0.35;
  neck.add(brow);
  const snout = new Mesh(shared('gg-snout', () => new BoxGeometry(0.16, 0.09, 0.14)), lime);
  snout.position.set(0, 0.0, 0.2);
  neck.add(snout);
  const jaw = new Group();
  jaw.position.set(0, -0.05, 0.12);
  neck.add(jaw);
  const jawM = new Mesh(shared('gg-jaw', () => new BoxGeometry(0.15, 0.05, 0.16).translate(0, 0, 0.07)), dark);
  jaw.add(jawM);
  const fangG = shared('gg-fang', () => new ConeGeometry(0.018, 0.07, 3));
  for (const dx of [-0.05, 0.05]) {
    const f = new Mesh(fangG, horn);
    f.position.set(dx, 0.05, 0.13);
    jaw.add(f);
  }
  const mouth = new Mesh(shared('gg-mouth', () => new BoxGeometry(0.13, 0.04, 0.1)), inkMat());
  mouth.position.set(0, -0.035, 0.2);
  neck.add(mouth);
  slitEyes(neck, { x: 0.06, y: 0.065, z: 0.205, len: 0.06, slant: -0.45 });
  const hornG = shared('gg-horn', () => new ConeGeometry(0.045, 0.3, 5).translate(0, 0.15, 0));
  for (const side of [-1, 1]) {
    const h = new Mesh(hornG, horn);
    h.position.set(side * 0.1, 0.12, 0.0);
    h.rotation.set(-0.95, 0, side * -0.45);
    addInk(h);
    neck.add(h);
    const ear = new Mesh(shared('gg-ear', () => new ConeGeometry(0.035, 0.12, 3)), dark);
    ear.position.set(side * 0.15, 0.04, 0.02);
    ear.rotation.z = side * -1.1;
    neck.add(ear);
  }
  const headCracks = new Mesh(shared('gg-cracks-h', () => crackSeams(23, [0, 0.04, 0.06], [0.165, 0.135, 0.165], 2, { steps: 3 })), crackMat);
  neck.add(headCracks);
  // Arms: long, knuckles down; shoulder -> elbow -> clawed hand.
  const arms = [];
  const upperG = shared('gg-upper', () => new CylinderGeometry(0.08, 0.065, 0.34, 6).translate(0, -0.17, 0));
  const foreG = shared('gg-fore', () => new CylinderGeometry(0.065, 0.06, 0.32, 5).translate(0, -0.16, 0));
  const fistG = shared('gg-fist', () => new IcosahedronGeometry(0.075, 0));
  for (const side of [-1, 1]) {
    const sh = new Group();
    sh.position.set(side * 0.33, 0.42, 0.14);
    torso.add(sh);
    const upper = new Mesh(upperG, lime);
    addInk(upper);
    sh.add(upper);
    const elbow = new Group();
    elbow.position.y = -0.34;
    sh.add(elbow);
    elbow.add(new Mesh(foreG, dark));
    const fist = new Mesh(fistG, dark);
    fist.position.y = -0.34;
    fist.scale.set(1.1, 0.9, 1.2);
    elbow.add(fist);
    for (const dx of [-0.04, 0.0, 0.04]) {
      const cl = new Mesh(clawG, horn);
      cl.position.set(dx, -0.39, 0.06);
      cl.rotation.x = 0.6;
      elbow.add(cl);
    }
    arms.push({ sh, elbow, side });
  }
  // Wings: pivots behind the shoulders (pivot -> mirror -> wing).
  const wings = [];
  const wingG = shared('gg-wing', gargWing);
  const boneG = shared('gg-wbone', () => mergeGeometries([rod([0, 0.04, 0], [0.46, 0.5, 0], 0.028, 5), rod([0.46, 0.5, 0], [0.7, 0.62, 0], 0.02, 4)]));
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.16, 0.5, -0.14);
    torso.add(pivot);
    const mirror = new Group();
    mirror.scale.x = side;
    pivot.add(mirror);
    const w = new Mesh(wingG, dark);
    w.scale.setScalar(1.15);
    addInk(w);
    mirror.add(w);
    const b = new Mesh(boneG, lime);
    b.scale.setScalar(1.15);
    mirror.add(b);
    wings.push({ pivot, side });
  }
  // Tail: three stone segments curling round the haunch, a spade tip.
  const tail = [];
  let parent = new Group();
  parent.position.set(0, 0.02, -0.2);
  hips.add(parent);
  const tailG = shared('gg-tail', () => new CylinderGeometry(0.035, 0.05, 0.22, 5).rotateX(Math.PI / 2).translate(0, 0, -0.11));
  for (let i = 0; i < 4; i++) {
    const j = new Group();
    if (i > 0) j.position.z = -0.22;
    parent.add(j);
    const m = new Mesh(tailG, dark);
    m.scale.setScalar(1 - i * 0.15);
    j.add(m);
    tail.push(j);
    parent = j;
  }
  const spade = new Mesh(shared('gg-spade', () => new ConeGeometry(0.07, 0.14, 3).rotateX(-Math.PI / 2)), horn);
  spade.position.z = -0.24;
  tail[tail.length - 1].add(spade);
  const glow = tellGlow(0.9, 0);
  glow.position.set(0, 0.42, 0.34);
  torso.add(glow);
  // A low plinth of rubble it crouches on? No: the Spire's ledges are the
  // room's own. Just the shadow.
  s.group.add(groundShadow(0.55, 0.42));
  const dtOf = clock();
  const wakeAge = clip();
  const slamAge = clip();
  let stoneK = 1;
  let stand = 0;
  let lastMode = 'stone';
  let wakeT0 = -9;
  let crackK = 0;
  const _col = new Color();
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      // The Journal's stand-in ('idle') shows it awake.
      const mode = e && e.mode ? e.mode : 'stalk';
      if (mode === 'wake' && lastMode !== 'wake') wakeT0 = t;
      lastMode = mode;
      const wa = wakeAge(e ? e.wakeTick : -1, dt);
      const sa = slamAge(e ? e.slamTick : -1, dt);
      const burst = wa < 0.6 ? Math.exp(-wa * 5) : 0; // just broke free
      const stone = mode === 'stone';
      const waking = mode === 'wake';
      const wp = waking ? clamp01((t - wakeT0) / 0.8) : 0;
      // The grey: snaps off on the burst, creeps back slowly on the settle.
      stoneK = stone ? approach(stoneK, 1, 1.6, dt) : waking ? approach(stoneK, 0.75, 1.2, dt) : approach(stoneK, 0, 7, dt);
      const awake = 1 - stoneK;
      for (const [m, c] of body) m.color.copy(_col.copy(c).lerp(C.statue, stoneK));
      // The cracks: dark in stone, glowing up through the wake, a steady
      // low glow awake (brighter on the slam wind-up).
      const crackWant = stone ? 0 : waking ? 0.3 + 0.7 * wp : 0.45 + 0.4 * telegraphK;
      crackK = approach(crackK, crackWant, stone ? 1.6 : 10, dt);
      const cg = Math.min(1, crackK + 0.6 * burst);
      crackMat.color.copy(C.crackDark).lerp(TELL_INDIGO_DIM, Math.min(1, cg * 2)).lerp(TELL_INDIGO, Math.max(0, cg * 2 - 1));
      glow.material.opacity = 0.42 * cg;
      // Stance: crouched on its haunches as stone, up on two legs awake.
      stand = approach(stand, stone ? 0 : waking ? 0.1 : 1, stone ? 1.6 : 6, dt);
      const st = stand;
      // The slam: up during the wind-up, down hard on the beat.
      const down = sa < 0.1 ? smooth(sa / 0.1) : sa < 0.55 ? 1 - smooth((sa - 0.1) / 0.45) : 0;
      const raise = mode === 'stalk' ? telegraphK * (1 - down) : 0;
      // Motion is gated by `live`: a statue does not breathe.
      const live = awake * (stone ? 0 : 1);
      const step = Math.sin(walkPhase * 1.4) * moveK * live;
      const breathe = Math.sin(t * 1.4 + id) * live;
      // Shaking through the wake, a judder on the slam.
      const shake = waking ? 0.012 + 0.03 * wp : 0;
      rig.position.x = shake * (Math.sin(t * 71 + id) + Math.sin(t * 53)) * 0.5 + 0.015 * down * Math.sin(sa * 60);
      rig.position.z = shake * Math.sin(t * 64 + 1.3) * 0.5;
      hips.position.y = 0.42 + 0.26 * st + 0.03 * Math.abs(step) - 0.08 * down + 0.06 * raise;
      hips.rotation.z = 0.07 * step;
      for (const { hip, knee, foot, side } of legs) {
        const sw = side * step * 0.5;
        const hx = -1.2 + 0.7 * st + sw - 0.25 * down;
        const kx = 2.0 - 1.1 * st + Math.max(0, -sw) * 0.6 + 0.4 * down;
        hip.rotation.x = hx;
        knee.rotation.x = kx;
        foot.rotation.x = -(hx + kx);
        hip.rotation.z = side * (0.12 - 0.06 * st);
      }
      // Torso: leaning out over the ledge as stone, hunched forward awake,
      // rearing back for the slam and pitching down on it.
      torso.rotation.x = 0.5 - 0.15 * st + 0.02 * breathe - 0.55 * raise + 0.5 * down;
      torso.rotation.y = 0.06 * step;
      neck.rotation.x = -0.25 + 0.1 * st - 0.25 * raise + 0.15 * down + 0.03 * breathe;
      jaw.rotation.x = 0.1 + 0.35 * raise + 0.3 * burst + 0.15 * down;
      // Arms: knuckles on the ledge as stone, swinging awake, both fists
      // overhead for the slam, crashing down in front.
      for (const { sh, elbow, side } of arms) {
        const swingA = -side * step * 0.6;
        sh.rotation.x = -0.15 - 0.15 * st + swingA - 2.6 * raise + 1.1 * down * (1 - raise) - 0.6 * burst;
        sh.rotation.z = side * (0.18 + 0.1 * st + 0.25 * raise + 0.4 * burst);
        elbow.rotation.x = -0.3 - 0.25 * st - 0.5 * raise + 0.2 * down;
      }
      // Wings: folded up behind as stone, half open stalking, thrown wide on
      // the burst and the slam wind-up, beating once on the slam.
      const open = Math.min(1, 0.45 * st + 0.55 * raise + 0.8 * burst + 0.3 * down);
      // (Folded they droop out and back along the flanks — a perched
      // gargoyle's mantle, never two upright ears; open they spread level
      // and wide.)
      for (const { pivot, side } of wings) {
        pivot.rotation.y = side * (0.85 - 0.75 * open);
        pivot.rotation.z = side * (-0.6 + 0.8 * open + 0.06 * breathe - 0.45 * down);
        pivot.rotation.x = -0.4 * (1 - open);
      }
      for (let i = 0; i < tail.length; i++) tail[i].rotation.y = (0.45 + 0.12 * Math.sin(t * 1.3 - i + id) * live) * (i === 0 ? 0.6 : 1);
      tail[0].rotation.x = -0.4 + 0.3 * st;
    },
  };
}

// ------------------------------------------------------------ HANGER --
const ROPE_SEGS = 12;
const ROPE_SEG = 0.5; // 6 u of rope up out of frame
export function buildHanger() {
  const s = shell('hanger');
  const { rig, track } = s;
  const smock = track(flashable(C.smock, { side: DoubleSide }));
  const smockDark = track(flashable(C.smockDark));
  const skin = track(flashable(C.skin));
  const ropeMat = track(flashable(C.rope));
  // The swing pivot (hip height): the whole body leans and swings about it.
  rig.scale.setScalar(1.1); // lanky: it must stand a head over the party
  const pivot = new Group();
  pivot.position.y = 0.92;
  rig.add(pivot);
  // Legs: long and thin, bare bony feet.
  const legs = [];
  const thighG = shared('hg-thigh', () => new CylinderGeometry(0.055, 0.045, 0.46, 5).translate(0, -0.23, 0));
  const shinG = shared('hg-shin', () => new CylinderGeometry(0.045, 0.035, 0.44, 5).translate(0, -0.22, 0));
  const footG = shared('hg-foot', () => new BoxGeometry(0.08, 0.04, 0.17).translate(0, -0.02, 0.05));
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.1, 0, 0);
    pivot.add(hip);
    hip.add(new Mesh(thighG, smockDark));
    const knee = new Group();
    knee.position.y = -0.46;
    hip.add(knee);
    knee.add(new Mesh(shinG, skin));
    const foot = new Group();
    foot.position.y = -0.44;
    knee.add(foot);
    foot.add(new Mesh(footG, skin));
    legs.push({ hip, knee, foot, side });
  }
  // Torso: a narrow ragged smock, hunched forward from the hips.
  const torso = new Group();
  pivot.add(torso);
  const skirt = new Mesh(shared('hg-skirt', () => new CylinderGeometry(0.17, 0.26, 0.42, 7, 1, true).translate(0, -0.08, 0)), smock);
  torso.add(skirt);
  const hemG = shared('hg-hem', () => new BoxGeometry(0.07, 0.2, 0.018).translate(0, -0.1, 0));
  const hems = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const p = new Group();
    p.position.set(Math.sin(a) * 0.25, -0.28, Math.cos(a) * 0.25);
    p.rotation.y = a;
    torso.add(p);
    p.add(new Mesh(hemG, i % 2 ? smockDark : smock));
    hems.push({ p, i });
  }
  const chest = new Mesh(shared('hg-chest', () => new CylinderGeometry(0.2, 0.16, 0.5, 7)), smock);
  chest.position.set(0, 0.36, 0);
  addInk(chest);
  torso.add(chest);
  // Rope coiled round the chest and over a shoulder (tangled in it).
  const coilG = shared('hg-coil', () => new TorusGeometry(0.205, 0.022, 4, 14).rotateX(Math.PI / 2));
  for (const [y, rx, rz] of [[0.26, 0.15, 0.1], [0.42, -0.1, -0.15]]) {
    const c = new Mesh(coilG, ropeMat);
    c.position.y = y;
    c.rotation.set(rx, 0, rz);
    torso.add(c);
  }
  const sash = new Mesh(shared('hg-sash', () => new TorusGeometry(0.24, 0.02, 4, 14)), ropeMat);
  sash.position.set(0, 0.42, 0);
  sash.rotation.set(0, Math.PI / 2, 0.75);
  sash.scale.set(1, 1.15, 0.85);
  torso.add(sash);
  // Head: gaunt grey, hanging forward on a long neck; indigo eyes (the tell).
  const neck = new Group();
  neck.position.set(0, 0.62, 0.02);
  torso.add(neck);
  const neckM = new Mesh(shared('hg-neck', () => new CylinderGeometry(0.04, 0.045, 0.14, 5).translate(0, 0.06, 0)), skin);
  neck.add(neckM);
  const head = new Mesh(shared('hg-head', () => new IcosahedronGeometry(0.12, 1)), skin);
  head.scale.set(0.85, 1.15, 0.95);
  head.position.set(0, 0.2, 0.04);
  addInk(head);
  neck.add(head);
  const cap = new Mesh(shared('hg-cap', () => new SphereGeometry(0.125, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), smockDark);
  cap.scale.set(1, 0.7, 1.05);
  cap.position.set(0, 0.25, 0.02);
  cap.rotation.x = -0.2;
  neck.add(cap);
  for (const side of [-1, 1]) {
    const sock = new Mesh(shared('hg-sock', () => new SphereGeometry(0.03, 6, 4)), inkMat());
    sock.position.set(side * 0.042, 0.2, 0.135);
    neck.add(sock);
    const eye = new Mesh(shared('hg-eye', () => new SphereGeometry(0.014, 6, 4)), tellMat());
    eye.position.set(side * 0.042, 0.2, 0.158);
    neck.add(eye);
  }
  const eyeGlow = tellGlow(0.4, 0.2);
  eyeGlow.position.set(0, 0.2, 0.19);
  neck.add(eyeGlow);
  const jaw = new Mesh(shared('hg-jaw', () => new BoxGeometry(0.07, 0.035, 0.05)), inkMat());
  jaw.position.set(0, 0.09, 0.13);
  neck.add(jaw);
  // Arms: both up on the rope above the head (static in torso space: the
  // grip point is fixed, so the arms are rods shoulder -> grip).
  const GRIP = [0, 1.18, 0.1];
  const armG = shared('hg-arms', () =>
    mergeGeometries([
      rod([-0.22, 0.55, 0], [-0.14, 0.88, 0.06], 0.045, 5),
      rod([-0.14, 0.88, 0.06], [-0.035, 1.12, 0.1], 0.038, 5),
      rod([0.22, 0.55, 0], [0.15, 0.9, 0.08], 0.045, 5),
      rod([0.15, 0.9, 0.08], [0.035, 1.24, 0.1], 0.038, 5),
    ])
  );
  const arms = new Mesh(armG, smock);
  addInk(arms);
  torso.add(arms);
  const sleeveG = shared('hg-sleeve', () => new ConeGeometry(0.075, 0.22, 6, 1, true).translate(0, -0.11, 0));
  for (const side of [-1, 1]) {
    const sl = new Mesh(sleeveG, smockDark);
    sl.position.set(side * 0.19, 0.84, 0.05);
    sl.rotation.z = side * -0.5;
    sl.rotation.x = Math.PI;
    torso.add(sl);
  }
  const handG = shared('hg-hand', () => new IcosahedronGeometry(0.05, 0));
  for (const [x, y] of [[-0.03, GRIP[1] - 0.06], [0.03, GRIP[1] + 0.06]]) {
    const h = new Mesh(handG, skin);
    h.position.set(x, y, GRIP[2]);
    h.scale.set(1, 1.2, 1);
    torso.add(h);
  }
  // The rope: from the hands straight up out of frame, a chain of joints so
  // it can hang slack (bowed) or pull taut (straight). Its root sits at the
  // grip and is counter-rotated so the rope's lean is set in world space.
  const grip = new Group();
  grip.position.set(GRIP[0], GRIP[1] - 0.2, GRIP[2]);
  torso.add(grip);
  const ropeRoot = new Group();
  grip.add(ropeRoot);
  const ropeG = shared('hg-rope', () => new CylinderGeometry(0.022, 0.022, ROPE_SEG + 0.01, 5).translate(0, ROPE_SEG / 2, 0));
  const ropeJ = [];
  let parent = ropeRoot;
  for (let i = 0; i < ROPE_SEGS; i++) {
    const j = new Group();
    if (i > 0) j.position.y = ROPE_SEG;
    parent.add(j);
    j.add(new Mesh(ropeG, ropeMat));
    ropeJ.push(j);
    parent = j;
  }
  // A frayed tail below the hands.
  const tailEnd = new Mesh(shared('hg-ropetail', () => new CylinderGeometry(0.02, 0.012, 0.42, 4).translate(0, -0.21, 0)), ropeMat);
  tailEnd.position.y = 0;
  grip.add(tailEnd);
  const shadow = groundShadow(0.42, 0.4);
  s.group.add(shadow);
  const dtOf = clock();
  let grip0 = 0;
  let dangleK = 0;
  let laneLen = 6;
  let spin = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'creep';
      if (e && e.telegraph && e.telegraph.length) laneLen = e.telegraph.length;
      const swinging = mode === 'swing';
      // The swing's progress off the sim's countdown (swingTicksLeft against
      // the lane's whole run at 10 u/s).
      const total = Math.max(1, Math.ceil(laneLen / (10 / TICK_HZ)));
      const p = swinging ? clamp01(1 - (e.swingTicksLeft ?? 0) / total) : 0;
      grip0 = approach(grip0, mode === 'grip' ? 1 : 0, 9, dt);
      const gk = Math.max(telegraphK * (swinging ? 0 : 1), grip0);
      dangleK = approach(dangleK, mode === 'dangle' ? 1 : 0, 8, dt);
      const creep = (1 - gk) * (1 - dangleK) * (swinging ? 0 : 1);
      const step = Math.sin(walkPhase * 1.5);
      // Swing: the body pendulums about the hips along the lane (+Z is the
      // lane), legs trailing, lifted off the floor mid-swing.
      const swingTilt = swinging ? 0.75 - 1.15 * smooth(p) : 0;
      const lift = swinging ? 0.12 + 0.38 * Math.sin(Math.PI * p) : 0;
      // Grip: lean back on the rope, braced; creep: hunched forward.
      const lean = 0.42 * creep - 0.4 * gk + 0.08 * Math.sin(t * 1.2 + id) * creep;
      pivot.position.y = 0.92 + lift + 0.04 * dangleK + 0.025 * Math.abs(step) * moveK * creep;
      pivot.rotation.x = swingTilt;
      // Dangle: slack and turning on the rope.
      spin = dangleK > 0.02 ? spin + dt * 1.1 : spin * Math.exp(-4 * dt);
      pivot.rotation.y = dangleK * 0.9 * Math.sin(spin + id);
      pivot.rotation.z = 0.06 * step * moveK * creep + 0.05 * Math.sin(t * 2.6 + id) * dangleK;
      torso.rotation.x = lean + 0.08 * dangleK + (swinging ? 0.15 : 0);
      neck.rotation.x = 0.55 * creep + 0.15 * gk + 0.7 * dangleK + (swinging ? -0.2 : 0) + 0.05 * Math.sin(t * 0.9 + id);
      neck.rotation.z = 0.25 * dangleK * Math.sin(spin * 0.7 + id) + 0.08 * creep;
      eyeGlow.material.opacity = 0.18 + 0.4 * gk + 0.2 * (swinging ? 1 : 0);
      // Legs: a slow shuffle; braced on the grip; trailing on the swing;
      // hanging straight with the toes down when it dangles.
      for (const { hip, knee, foot, side } of legs) {
        const sw = side * step * 0.35 * moveK * creep;
        const trail = swinging ? 0.55 + 0.25 * Math.sin(Math.PI * p) : 0;
        hip.rotation.x = sw + 0.15 * creep + side * 0.25 * gk + trail - 0.06 * dangleK;
        knee.rotation.x = 0.25 * creep + 0.05 * gk + Math.max(0, -sw) * 0.6 + 0.35 * trail * (1 - p) + 0.15 * dangleK + 0.06 * Math.sin(t * 1.7 + side) * dangleK;
        foot.rotation.x = -(hip.rotation.x + knee.rotation.x) * (1 - dangleK) + 0.9 * dangleK + 0.5 * trail;
        hip.rotation.z = side * (0.04 + 0.04 * dangleK);
      }
      for (const { p: hp, i } of hems) hp.rotation.x = -0.1 - 0.08 * Math.sin(t * 2.4 - i + id) - (swinging ? 0.5 : 0);
      // The rope: its lean in the world (forward when gripping for the
      // swing, sweeping over the top as it swings, plumb when dangling);
      // the root cancels the body's own pitch so the rope never bends with
      // the torso. Slack: a lazy wave up its length; taut: dead straight.
      const ropeLean = 0.32 * gk + (swinging ? 0.9 - 1.25 * smooth(p) : 0) + 0.04 * Math.sin(t * 0.7 + id) * creep;
      ropeRoot.rotation.x = ropeLean - (pivot.rotation.x + torso.rotation.x);
      ropeRoot.rotation.z = -pivot.rotation.z;
      const slack = creep * (1 - dangleK);
      for (let i = 0; i < ropeJ.length; i++) {
        if (i === 0) continue;
        ropeJ[i].rotation.x = slack * (0.14 * Math.sin(t * 1.3 - i * 0.55 + id) + (i < 4 ? 0.1 : -0.03));
        ropeJ[i].rotation.z = slack * 0.08 * Math.sin(t * 1.1 - i * 0.7 + id * 2);
      }
      tailEnd.rotation.x = 0.2 * Math.sin(t * 1.9 + id) + (swinging ? -0.6 : 0);
      shadow.scale.setScalar(1 - 0.25 * clamp01(lift / 0.5));
    },
  };
}

// -------------------------------------------------------------- VANE --
// Block letters for the compass arms (XY plane, facing +Z, ~0.16 tall).
function letterGeo(ch) {
  const w = 0.045;
  const bar = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0) + w;
    const g = new BoxGeometry(len, w, 0.03);
    g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
    return g;
  };
  const L = {
    N: [[-0.05, -0.08, -0.05, 0.08], [0.05, -0.08, 0.05, 0.08], [-0.05, 0.08, 0.05, -0.08]],
    E: [[-0.05, -0.08, -0.05, 0.08], [-0.05, 0.08, 0.05, 0.08], [-0.05, 0, 0.03, 0], [-0.05, -0.08, 0.05, -0.08]],
    S: [[0.05, 0.08, -0.05, 0.08], [-0.05, 0.08, -0.05, 0], [-0.05, 0, 0.05, 0], [0.05, 0, 0.05, -0.08], [0.05, -0.08, -0.05, -0.08]],
    W: [[-0.065, 0.08, -0.035, -0.08], [-0.035, -0.08, 0, 0.03], [0, 0.03, 0.035, -0.08], [0.035, -0.08, 0.065, 0.08]],
  }[ch];
  return mergeGeometries(L.map((b) => bar(...b)));
}
// The weathercock's silhouette: forward +X, up +Y in the outline, its feet
// at y 0; rotated so forward is +Z.
function cockGeometry() {
  const g = plate(
    [
      [0.38, 0.43], [0.29, 0.39], [0.28, 0.33], [0.24, 0.34], [0.22, 0.28], [0.16, 0.18], [0.04, 0.1], [-0.14, 0.1],
      [-0.3, 0.14], [-0.48, 0.24], [-0.4, 0.3], [-0.54, 0.42], [-0.44, 0.44], [-0.5, 0.6], [-0.38, 0.52], [-0.36, 0.7],
      [-0.26, 0.52], [-0.18, 0.34], [-0.02, 0.32], [0.1, 0.4], [0.12, 0.5], [0.13, 0.57], [0.17, 0.54], [0.2, 0.62],
      [0.23, 0.56], [0.27, 0.6], [0.28, 0.5], [0.31, 0.47],
    ],
    0.075
  );
  g.rotateY(-Math.PI / 2);
  return g;
}
function cockWing() {
  const g = plate([[-0.14, 0.31], [0.08, 0.3], [0.06, 0.2], [-0.04, 0.15], [-0.2, 0.2]], 0.02);
  g.rotateY(-Math.PI / 2);
  return g;
}
const VANE_TOP = 1.22;
export function buildVane() {
  const s = shell('vane');
  const { rig, track } = s;
  // The hop moves spindle, compass and cock together; only the cock turns.
  const hop = new Group();
  s.group.remove(s.yaw);
  hop.add(s.yaw);
  s.group.add(hop);
  const brass = track(flashable(C.brass, { side: DoubleSide }));
  const brassDark = track(flashable(C.brassDark));
  const verd = track(flashable(C.verdigris, { side: DoubleSide }));
  const iron = track(flashable(C.iron));
  const lead = track(flashable(C.lead));
  // The torn-off base: a lead roof cap and a ragged collar of flashing.
  const cap = new Mesh(shared('vn-cap', () => new CylinderGeometry(0.14, 0.24, 0.12, 7).translate(0, 0.06, 0)), lead);
  addInk(cap);
  hop.add(cap);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const tab = new Mesh(shared('vn-tab', () => new BoxGeometry(0.1, 0.05, 0.12).translate(0, 0, 0.06)), lead);
    tab.position.set(Math.sin(a) * 0.2, 0.03, Math.cos(a) * 0.2);
    tab.rotation.set(0.35 + (i % 2) * 0.3, a, 0);
    hop.add(tab);
  }
  // The iron spindle, a brass orb finial on it.
  const spindle = new Mesh(shared('vn-spindle', () => new CylinderGeometry(0.036, 0.046, VANE_TOP, 6).translate(0, VANE_TOP / 2 + 0.08, 0)), iron);
  addInk(spindle);
  hop.add(spindle);
  const orb = new Mesh(shared('vn-orb', () => new IcosahedronGeometry(0.075, 1)), brass);
  orb.position.y = 0.98;
  addInk(orb);
  hop.add(orb);
  // The compass: fixed to the world (it never turns), letters facing out
  // toward the camera so they read.
  const compass = new Group();
  compass.position.y = 0.7;
  hop.add(compass);
  const armG = shared('vn-arm', () => mergeGeometries([new BoxGeometry(1.0, 0.035, 0.035), new BoxGeometry(0.035, 0.035, 1.0)]));
  compass.add(new Mesh(armG, iron));
  const hub = new Mesh(shared('vn-hub', () => new CylinderGeometry(0.05, 0.05, 0.06, 6)), brassDark);
  compass.add(hub);
  for (const [ch, x, z] of [['N', 0, -0.52], ['E', 0.52, 0], ['S', 0, 0.52], ['W', -0.52, 0]]) {
    const l = new Mesh(shared(`vn-l${ch}`, () => letterGeo(ch)), brassDark);
    l.scale.setScalar(1.45);
    l.position.set(x * 1.1, 0.0, z * 1.1);
    compass.add(l);
    const tip = new Mesh(shared('vn-tip', () => new IcosahedronGeometry(0.025, 0)), brassDark);
    tip.position.set(x * 0.85, 0, z * 0.85);
    compass.add(tip);
  }
  // The cock on its pivot at the top: an arrow under its feet.
  const head = new Group();
  head.position.y = VANE_TOP + 0.08;
  rig.add(head);
  const collar = new Mesh(shared('vn-collar', () => new CylinderGeometry(0.045, 0.045, 0.08, 6)), brassDark);
  head.add(collar);
  const arrow = new Mesh(shared('vn-arrow', () => new CylinderGeometry(0.016, 0.016, 1.05, 4).rotateX(Math.PI / 2).translate(0, 0.05, 0.02)), iron);
  head.add(arrow);
  const point = new Mesh(shared('vn-point', () => new ConeGeometry(0.055, 0.18, 4).rotateX(Math.PI / 2).translate(0, 0.05, 0.62)), brassDark);
  addInk(point);
  head.add(point);
  const fletch = new Mesh(
    shared('vn-fletch', () => {
      const g = plate([[0, 0], [-0.16, 0.12], [-0.22, 0.12], [-0.14, 0], [-0.22, -0.12], [-0.16, -0.12]], 0.02);
      g.rotateY(-Math.PI / 2);
      g.translate(0, 0.05, -0.46);
      return g;
    }),
    brass
  );
  head.add(fletch);
  // The cock itself: the brass silhouette with a little body, patina wings.
  const cock = new Group();
  cock.position.y = 0.06;
  head.scale.setScalar(1.3);
  head.add(cock);
  const sil = new Mesh(shared('vn-cock', cockGeometry), brass);
  addInk(sil);
  cock.add(sil);
  const belly = new Mesh(shared('vn-belly', () => new SphereGeometry(0.12, 8, 6)), brass);
  belly.scale.set(0.8, 0.95, 1.6);
  belly.position.set(0, 0.24, -0.02);
  cock.add(belly);
  for (const side of [-1, 1]) {
    const w = new Mesh(shared('vn-wing', cockWing), verd);
    w.position.x = side * 0.05;
    cock.add(w);
  }
  for (const dz of [-0.06, 0.06]) {
    const leg = new Mesh(shared('vn-leg', () => new CylinderGeometry(0.012, 0.012, 0.1, 4).translate(0, 0.05, 0)), brassDark);
    leg.position.set(0, 0.0, dz);
    cock.add(leg);
  }
  // The tell: an indigo eye on each side of the head.
  for (const side of [-1, 1]) {
    const eye = new Mesh(shared('vn-eye', () => new CylinderGeometry(0.026, 0.026, 0.012, 8).rotateZ(Math.PI / 2)), tellMat());
    eye.position.set(side * 0.042, 0.47, 0.24);
    cock.add(eye);
  }
  const eyeGlow = tellGlow(0.4, 0.26);
  eyeGlow.position.set(0, 0.48, 0.25);
  cock.add(eyeGlow);
  // A pale gust puff at the beak (each dart).
  const puff = makeGlowSprite({ color: VFX_MATTER.gust, size: 0.45, opacity: 0 });
  puff.material.toneMapped = false;
  puff.position.set(0, 0.42, 0.5);
  cock.add(puff);
  const shadow = groundShadow(0.3, 0.38);
  s.group.add(shadow);
  const dtOf = clock();
  let hopPh = 0;
  let lastMode = 'hop';
  let spinT0 = -9;
  let spinDir = 1;
  let aimK = 0;
  let volleyK = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, moveK = 0, telegraphK = 0, fireK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'hop';
      if (mode === 'aim' && lastMode !== 'aim') {
        spinT0 = t;
        spinDir = id % 2 ? 1 : -1;
      }
      lastMode = mode;
      aimK = approach(aimK, mode === 'aim' ? 1 : 0, 10, dt);
      volleyK = approach(volleyK, mode === 'volley' ? 1 : 0, 12, dt);
      // Hops on the spindle while it travels (and a restless one at rest).
      const travel = clamp01(moveK * 1.5) * (1 - aimK) * (1 - volleyK);
      hopPh += dt * (travel > 0.05 ? 2.4 : 0.35) * (1 - aimK);
      const ph = hopPh % 1;
      const air = ph < 0.55 ? Math.sin((ph / 0.55) * Math.PI) : 0;
      const amp = travel > 0.05 ? 0.26 * travel : 0.06;
      const squash = ph >= 0.55 && ph < 0.72 ? Math.sin(((ph - 0.55) / 0.17) * Math.PI) : 0;
      hop.position.y = air * amp - 0.03 * aimK;
      hop.scale.set(1 + 0.08 * squash * amp * 4, 1 - 0.12 * squash * amp * 4 - 0.04 * aimK, 1 + 0.08 * squash * amp * 4);
      hop.rotation.z = 0.06 * Math.sin(hopPh * Math.PI * 2 + id) * travel;
      // Aim: it swings round a full turn into the wind, overshoots and
      // settles shivering on the line; the volley jerks it back each dart.
      const sa = t - spinT0;
      let spin = 0;
      if (sa < 0.5) spin = spinDir * Math.PI * 2 * (1 - smooth(sa / 0.5));
      else if (sa < 1.6) spin = 0.32 * Math.exp(-(sa - 0.5) * 5) * Math.sin((sa - 0.5) * 20) * spinDir;
      const idleTurn = (1 - aimK) * (1 - volleyK) * 0.22 * Math.sin(t * 0.7 + id) * Math.sin(t * 0.31 + id * 2);
      head.rotation.y = spin + idleTurn + 0.03 * Math.sin(t * 37) * aimK;
      cock.rotation.x = -0.18 * aimK - 0.3 * fireK + 0.08 * volleyK;
      cock.position.z = -0.08 * fireK;
      cock.scale.set(1, 1 + 0.06 * telegraphK, 1 + 0.08 * fireK);
      eyeGlow.material.opacity = 0.22 + 0.4 * aimK + 0.3 * volleyK;
      puff.material.opacity = 0.55 * fireK;
      puff.scale.setScalar(0.3 + 0.4 * fireK);
      shadow.scale.setScalar(1 - 0.25 * clamp01(hop.position.y / 0.26));
    },
  };
}

// --------------------------------------------------------- SACRISTAN --
// A bell profile for the cope: [radius, height] pairs, lip at y 0.
const lathe = (pts, seg = 12) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);
export function buildSacristan() {
  const s = shell('sacristan');
  const { rig, track } = s;
  rig.scale.setScalar(1.1);
  const cope = track(flashable(C.cope, { side: DoubleSide }));
  const copeDark = track(flashable(C.copeDark, { side: DoubleSide }));
  const face = track(flashable(C.face));
  const bronze = track(flashable(C.bronze, { side: DoubleSide }));
  const bronzeDark = track(flashable(C.bronzeDark));
  const rope = track(flashable(C.rope));
  // The skirt of the cope: the lower half of a bell, a bronze lip at the hem.
  const skirt = new Group();
  rig.add(skirt);
  const skirtM = new Mesh(shared('sc-skirt', () => lathe([[0.45, 0.0], [0.43, 0.07], [0.37, 0.2], [0.32, 0.4], [0.3, 0.6]])), cope);
  addInk(skirtM);
  skirt.add(skirtM);
  const lip = new Mesh(shared('sc-lip', () => new TorusGeometry(0.44, 0.03, 4, 18).rotateX(Math.PI / 2)), bronzeDark);
  lip.position.y = 0.035;
  skirt.add(lip);
  const band = new Mesh(shared('sc-band', () => new TorusGeometry(0.36, 0.016, 3, 16).rotateX(Math.PI / 2)), bronze);
  band.position.y = 0.22;
  skirt.add(band);
  // Stone feet shuffling under the hem.
  const feet = [];
  for (const side of [-1, 1]) {
    const f = new Mesh(shared('sc-foot', () => new BoxGeometry(0.1, 0.07, 0.18).translate(0, 0.035, 0.05)), copeDark);
    f.position.set(side * 0.13, 0, 0.2);
    rig.add(f);
    feet.push({ f, side });
  }
  // The stoop: everything above the waist pitches forward from here.
  const waist = new Group();
  waist.position.y = 0.58;
  rig.add(waist);
  const mantle = new Mesh(shared('sc-mantle', () => lathe([[0.31, 0.0], [0.3, 0.16], [0.27, 0.32], [0.2, 0.46], [0.1, 0.53], [0.0, 0.55]])), cope);
  addInk(mantle);
  waist.add(mantle);
  // The hump of the back under the mantle.
  const hump = new Mesh(shared('sc-hump', () => new SphereGeometry(0.22, 8, 6)), copeDark);
  hump.scale.set(1.1, 0.8, 0.9);
  hump.position.set(0, 0.42, -0.1);
  waist.add(hump);
  // A hemp cord round the waist, its tassel hanging.
  const cord = new Mesh(shared('sc-cord', () => new TorusGeometry(0.305, 0.014, 3, 16).rotateX(Math.PI / 2)), rope);
  cord.position.y = 0.04;
  waist.add(cord);
  const tassel = new Group();
  tassel.position.set(0.16, 0.02, 0.25);
  waist.add(tassel);
  const tasselM = new Mesh(shared('sc-tassel', () => new CylinderGeometry(0.01, 0.01, 0.3, 3).translate(0, -0.15, 0)), rope);
  tassel.add(tasselM);
  const knot = new Mesh(shared('sc-knot', () => new ConeGeometry(0.035, 0.08, 4).translate(0, -0.32, 0)), rope);
  tassel.add(knot);
  // The tell: an indigo clasp on the breast of the cope.
  const clasp = new Mesh(shared('sc-clasp', () => new IcosahedronGeometry(0.045, 0)), tellMat());
  clasp.scale.set(1, 1.3, 0.6);
  clasp.position.set(0, 0.36, 0.25);
  waist.add(clasp);
  const claspGlow = tellGlow(0.5, 0.26);
  claspGlow.position.set(0, 0.36, 0.3);
  waist.add(claspGlow);
  // The hooded head, low and forward: a peaked cowl, a pale stone face.
  const neck = new Group();
  neck.position.set(0, 0.52, 0.1);
  waist.add(neck);
  const cowl = new Mesh(shared('sc-cowl', () => new IcosahedronGeometry(0.19, 1)), cope);
  cowl.scale.set(1.0, 1.08, 1.1);
  cowl.position.set(0, 0.06, -0.02);
  addInk(cowl);
  neck.add(cowl);
  const peak = new Mesh(shared('sc-peak', () => new ConeGeometry(0.11, 0.22, 5)), cope);
  peak.position.set(0, 0.24, -0.1);
  peak.rotation.x = -0.6;
  neck.add(peak);
  const hollow = new Mesh(shared('sc-hollow', () => new SphereGeometry(0.13, 10, 6)), inkMat());
  hollow.scale.set(0.95, 1.0, 0.5);
  hollow.position.set(0, 0.03, 0.13);
  neck.add(hollow);
  const mask = new Mesh(shared('sc-mask', () => new SphereGeometry(0.1, 8, 6)), face);
  mask.scale.set(0.85, 1.05, 0.55);
  mask.position.set(0, 0.02, 0.15);
  neck.add(mask);
  slitEyes(neck, { x: 0.035, y: 0.05, z: 0.2, len: 0.04, slant: 0.15 });
  // Arms: right rings the hand bell, left hushes (a finger to the mouth).
  const armG = shared('sc-sleeve', () => new ConeGeometry(0.085, 0.42, 6, 1, true).rotateX(Math.PI).translate(0, -0.21, 0));
  const handG = shared('sc-hand', () => new IcosahedronGeometry(0.045, 0));
  const right = new Group();
  right.position.set(0.27, 0.36, 0.06);
  waist.add(right);
  const rSleeve = new Mesh(armG, cope);
  right.add(rSleeve);
  const rHand = new Mesh(handG, face);
  rHand.position.y = -0.44;
  right.add(rHand);
  // The hand bell hangs from the fist on its wooden grip.
  const bellPivot = new Group();
  bellPivot.position.y = -0.46;
  bellPivot.scale.setScalar(1.35);
  right.add(bellPivot);
  const grip = new Mesh(shared('sc-grip', () => new CylinderGeometry(0.016, 0.02, 0.12, 5).translate(0, -0.06, 0)), bronzeDark);
  bellPivot.add(grip);
  const bell = new Mesh(shared('sc-bell', () => lathe([[0.0, 0.0], [0.05, -0.005], [0.07, -0.04], [0.08, -0.1], [0.1, -0.17], [0.13, -0.21], [0.11, -0.215], [0.09, -0.19]], 10).translate(0, -0.11, 0)), bronze);
  addInk(bell);
  bellPivot.add(bell);
  const clap = new Mesh(shared('sc-clap', () => new IcosahedronGeometry(0.03, 0)), bronzeDark);
  clap.position.y = -0.31;
  bellPivot.add(clap);
  const left = new Group();
  left.position.set(-0.27, 0.36, 0.06);
  waist.add(left);
  const lSleeve = new Mesh(armG, cope);
  left.add(lSleeve);
  const lHand = new Mesh(handG, face);
  lHand.position.y = -0.44;
  left.add(lHand);
  const finger = new Mesh(shared('sc-finger', () => new CylinderGeometry(0.012, 0.012, 0.1, 4).translate(0, -0.05, 0)), face);
  finger.position.y = -0.47;
  left.add(finger);
  const shadow = groundShadow(0.46, 0.4);
  s.group.add(shadow);
  const dtOf = clock();
  const ringAge = clip();
  const rapAge = clip();
  let hushK = 0;
  let rapK = 0;
  let ringPh = 0;
  return {
    group: s.group,
    mats: s.mats,
    setYaw: s.setYaw,
    pose({ t, walkPhase = 0, moveK = 0, telegraphK = 0, e }) {
      const dt = dtOf(t);
      const id = e ? e.id ?? 0 : 0;
      const mode = e && e.mode ? e.mode : 'tend';
      hushK = approach(hushK, mode === 'hush' ? telegraphK : 0, 7, dt);
      rapK = approach(rapK, mode === 'rap' ? telegraphK : 0, 12, dt);
      const ra = ringAge(e ? e.ringTick : -1, dt);
      const ka = rapAge(e ? e.rapTick : -1, dt);
      // The ring that rang: a shudder that ebbs over ~0.9 s, the bell brought down.
      const rung = ra < 0.9 ? Math.exp(-ra * 4) : 0;
      // The rap: the bell swung down hard, then back.
      const rap = ka < 0.45 ? (ka < 0.08 ? smooth(ka / 0.08) : 1 - smooth((ka - 0.08) / 0.37)) : 0;
      const step = Math.sin(walkPhase * 1.4);
      const tend = 1 - Math.max(hushK, rapK);
      // A shuffling stoop; the hush draws it up straight, the rap leans in.
      waist.rotation.x = 0.42 * tend + 0.08 * hushK + 0.25 * rapK - 0.15 * rapK * (1 - rap) + 0.55 * rap + 0.04 * Math.sin(t * 1.3 + id);
      waist.rotation.y = -0.35 * rapK * (1 - rap) + 0.2 * rap;
      waist.rotation.z = 0.05 * step * moveK;
      rig.position.y = 0.02 * Math.abs(step) * moveK;
      for (const { f, side } of feet) {
        f.position.z = 0.2 + side * step * 0.1 * moveK;
        f.position.y = Math.max(0, side * step) * 0.04 * moveK;
      }
      skirt.rotation.z = 0.03 * step * moveK;
      skirtM.scale.set(1 + 0.05 * rung, 1, 1 + 0.05 * rung);
      neck.rotation.x = 0.25 * tend - 0.45 * hushK + 0.2 * rap + 0.05 * Math.sin(t * 0.8 + id);
      // The bell arm: carried low and tinkling; up over the head for the
      // hush, ringing slow wide arcs; back for the rap, then down on you.
      ringPh += dt * (3.0 + 4.5 * hushK);
      const swing = Math.sin(ringPh + id);
      right.rotation.x = -0.35 * tend - 3.0 * hushK + 0.6 * rung * hushK - 2.1 * rapK * (1 - rap) + 1.0 * rap - 0.1 * moveK * step;
      right.rotation.z = 0.15 - 0.1 * hushK + 0.25 * hushK * swing - 0.1 * rapK;
      bellPivot.rotation.x = (0.18 + 0.6 * hushK) * swing + 0.4 * rung * Math.sin(ra * 28) - 0.6 * rap;
      bellPivot.rotation.z = 0.12 * Math.sin(t * 1.7 + id) * tend;
      clap.position.x = 0.04 * Math.sin(ringPh * 2 + id) * (0.3 + hushK);
      // The hushing hand: a finger to the mouth for the hush.
      left.rotation.x = -0.5 * tend - 2.25 * hushK - 0.4 * rapK;
      left.rotation.z = -0.15 + 0.6 * hushK;
      left.rotation.y = 0;
      finger.visible = hushK > 0.25;
      tassel.rotation.x = -waist.rotation.x * 0.8 + 0.1 * Math.sin(t * 2 + id);
      claspGlow.material.opacity = 0.24 + 0.45 * hushK + 0.4 * rung + 0.2 * rapK;
      claspGlow.scale.setScalar(0.5 * (1 + 0.5 * rung + 0.3 * hushK));
    },
  };
}

// ------------------------------------------------------- HUSH VEILS --
// A hushed enemy (sim `hushUntil > tick`: the Bell Sacristan's Vesper Hush,
// 40 % less damage taken) wears a soft pale veil for as long as it lasts:
// a cold lavender-white column over it, a still halo over its head with
// three motes hanging round it, a thin ring at its feet. Pale, slow and
// NEVER Ember (it is a ward, not a threat); it fades in, breathes slowly and
// fades out over the last ~0.8 s. Render-only: reads entities, never writes.
const HUSH_PALE = new Color(VFX_MATTER.hushpale);
const HUSH_VEIL = new Color(VFX_MATTER.hushveil).lerp(new Color(VFX_MATTER.hushpale), 0.45);
export function createHushVeils({ root, world, crownY = () => 1.2 }) {
  const live = new Map(); // enemy id -> rec
  const pool = [];
  const add = (c, o) => new MeshBasicMaterial({ color: c.clone(), transparent: true, opacity: o, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
  function build() {
    const g = new Group();
    g.name = 'hush-veil';
    const column = makeGlowSprite({ color: VFX_MATTER.hushpale, size: 1, opacity: 0 });
    column.material.toneMapped = false;
    g.add(column);
    const haloG = new Group();
    g.add(haloG);
    const haloMat = add(HUSH_PALE, 0);
    const halo = new Mesh(shared('hv-halo', () => new TorusGeometry(0.26, 0.022, 4, 28).rotateX(Math.PI / 2)), haloMat);
    haloG.add(halo);
    const haloGlow = makeGlowSprite({ color: VFX_MATTER.hushpale, size: 0.9, opacity: 0 });
    haloGlow.material.toneMapped = false;
    haloGlow.scale.set(0.95, 0.4, 1);
    haloG.add(haloGlow);
    const motes = [];
    const moteMat = add(HUSH_PALE, 0);
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(shared('hv-mote', () => new IcosahedronGeometry(0.035, 0)), moteMat);
      haloG.add(m);
      motes.push(m);
    }
    const ringMat = add(HUSH_VEIL, 0);
    const ring = new Mesh(shared('hv-ring', () => new RingGeometry(0.9, 1.0, 40).rotateX(-Math.PI / 2)), ringMat);
    ring.position.y = 0.035;
    ring.renderOrder = 3;
    g.add(ring);
    const poolMat = new MeshBasicMaterial({ map: getRadialTexture(), color: HUSH_VEIL.clone(), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    const floor = new Mesh(shared('hv-pool', () => new CircleGeometry(1, 24).rotateX(-Math.PI / 2)), poolMat);
    floor.position.y = 0.025;
    floor.renderOrder = 2;
    g.add(floor);
    return { g, column, haloG, haloMat, haloGlow, motes, moteMat, ring, ringMat, poolMat, floor, age: 0 };
  }
  function drop(id) {
    const r = live.get(id);
    if (!r) return;
    live.delete(id);
    r.g.visible = false;
    pool.push(r);
  }
  function update(tSec, dt, alpha = 1) {
    const tick = world.tick;
    const seen = new Set();
    for (const e of world.entities()) {
      if (!(e.hushUntil > tick) || !(e.hp > 0) || e.faction !== 'hostile') continue;
      seen.add(e.id);
      let r = live.get(e.id);
      if (!r) {
        r = pool.pop() || build();
        if (!r.g.parent) root.add(r.g);
        r.g.visible = true;
        r.age = 0;
        live.set(e.id, r);
      }
      r.age += dt;
      const left = (e.hushUntil - tick) / 48; // the last 0.8 s fade it out
      const k = Math.min(1, r.age / 0.3) * Math.min(1, Math.max(0, left));
      const sc = e.elite ? e.scale ?? 1.2 : e.scale ?? 1;
      const top = (crownY(e.kind) ?? 1.2) * sc;
      const rad = (e.radius ?? 0.4) + 0.22;
      const breathe = 0.5 + 0.5 * Math.sin(tSec * 2.2 + e.id);
      r.g.position.set(e.px != null ? e.px + (e.x - e.px) * alpha : e.x, 0, e.pz != null ? e.pz + (e.z - e.pz) * alpha : e.z);
      r.column.position.y = top * 0.5;
      r.column.scale.set(rad * 2.6, top * 1.5, 1);
      r.column.material.opacity = (0.07 + 0.04 * breathe) * k;
      r.haloG.position.y = top + 0.16 + 0.04 * Math.sin(tSec * 1.4 + e.id);
      r.haloG.rotation.y = tSec * 0.5;
      r.haloG.scale.setScalar(0.9 + 0.25 * sc + 0.15 * (1 - Math.min(1, r.age / 0.3)));
      r.haloMat.opacity = (0.7 + 0.2 * breathe) * k;
      r.haloGlow.material.opacity = 0.45 * k;
      r.moteMat.opacity = 0.85 * k;
      for (let i = 0; i < r.motes.length; i++) {
        const a = tSec * 0.6 + (i / r.motes.length) * Math.PI * 2;
        r.motes[i].position.set(Math.cos(a) * 0.34, -0.1 - 0.06 * Math.sin(tSec * 1.1 + i * 2), Math.sin(a) * 0.34);
      }
      r.ring.scale.set(rad, 1, rad);
      r.ringMat.opacity = (0.4 + 0.15 * breathe) * k;
      r.floor.scale.set(rad * 1.25, 1, rad * 1.25);
      r.poolMat.opacity = 0.22 * k;
    }
    for (const id of [...live.keys()]) if (!seen.has(id)) drop(id);
  }
  function clear() {
    for (const id of [...live.keys()]) drop(id);
  }
  return {
    update,
    clear,
    prewarm(park) {
      park(root, build().g);
    },
    debug: () => ({ veils: live.size }),
  };
}
