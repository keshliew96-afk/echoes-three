// THE HOLLOW CHOIR, MODEL STANDARD (docs/MODEL_STANDARD.md "Level IV
// champions"). The Hollow Heart's first champion rebuilt in the faceted look
// of Kesh's sample video, on top of the chibi ink style, keeping the classic
// rig's identity (render/enemies/champions.js): three hollow choristers in
// bone-violet gowns fused back to back round a faceted violet heart, their
// mouths open and their arms raised to conduct, a halo of seven crystals
// turning over the whole, the ONE indigo tell at the heart. What the standard
// adds:
//
//   * a faceted gown of pleat plates on each chorister with torn tatters off
//     its hem, a cowl of hood plates, a boxed skull with a lit mouth and slit
//     eyes, arms of two faceted segments ending in three crystal fingers; a
//     cage of six bone ribs round the heart gem; the halo as seven faceted
//     crystals between seven runes on a thin ring; five motes drifting about
//     it;
//   * IT FLOATS (the floater's rule, the Hollow Cantor's): it has no feet;
//     the gowns' hems hold a hover of 0.55 u over the floor with a slow
//     breath, never touch it and never drag; a strike is a lean and a reach
//     off the hover, never a jump; the lean comes from its own velocity;
//   * two ability timelines driven by the sim:
//       Shard Hymn  gather (the warning less one strike: the three turn to
//                   face the lane together, the mouths open, the arms up,
//                   the heart swelling), sing (2.5 frames, landing on the
//                   cone's tick: the heads thrust forward, the mouths wide,
//                   the halo flung up), contact held, recoil, settle with
//                   one overshoot;
//       Discord     swell (the warning less one strike: the three drift out
//                   from the heart, which swells, the halo widening), burst
//                   (2.5 frames, on the ring's tick: the three flung out
//                   wide and down, the heart flaring), contact held, recoil,
//                   settle (they drift back in);
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the heart `tip`, the `heart`, the lead chorister's
//     `mouth`, the halo's `crown`), and the hit reaction is the shared
//     overlay's (render/react.js), tuned by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t.
import { BoxGeometry, Color, ConeGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { addInk, groundShadow } from '../../critters/common.js';
import { PALETTE } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { TELL_INDIGO_GLOW } from '../style.js';
import { facetize, facetMaterial, hash01 } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, placeRow, wedgeGeometry } from '../../facet/kit.js';
import { lay, limbBox, taperBox } from '../../facet/shapes.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Hollow Choir's (champions.js C), unchanged.
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const CHOIR = new Color(PALETTE.bone).lerp(new Color(PALETTE.godstuffViolet), 0.35).multiplyScalar(0.78);
const CHOIR_DARK = slate(0.28, 0.16).lerp(new Color(PALETTE.godstuffViolet), 0.25);
const HEARTV = new Color('#9B6BE0');
const CRYSTAL = new Color(PALETTE.godstuffViolet).lerp(new Color(PALETTE.parchment), 0.45);
// the standard's value steps: a lit pleat on the gown's crown, a shaded
// pleat in its fold, bone for the ribs
const CHOIR_LIT = CHOIR.clone().lerp(new Color(PALETTE.bone), 0.12);
const CHOIR_SHADE = CHOIR.clone().multiplyScalar(0.72);
const BONE = new Color(PALETTE.bone).multiplyScalar(0.82);
const RUNE = CRYSTAL.clone().multiplyScalar(0.55);

// The hit flash (the enemy layer lifts emissiveIntensity on every mat).
const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });
const lit = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}

// --- Body plan (yaw space, faces +Z). The whole floats on `float`.
const HOVER_Y = 0.55; // u, the hems' rest hover (the classic's)
const SWAY = 0.1; // u, the hover's breath
const HEART_Y = 1.15; // in float space (the classic's)
const RING = 0.42; // u, the choristers' rest radius from the heart
const HALO_Y = 2.05;
const SINGERS = 3;
const NOTES = 7;
const MOTES = 5;
const TATTERS = 4; // per gown
const FINGERS = 3; // per hand
export const CHOIR_WALK = 1.0; // u/s, HC.moveSpeed (sim/enemies/champions.js)
const GATHER_SEC = 60 / 60 - STRIKE_SEC; // the hymn cone's warning
const SWELL_SEC = 72 / 60 - STRIKE_SEC; // the discord ring's warning

// --- Ability timelines (render only; the sim's numbers: a 60-tick cone, a
// 72-tick ring).
export const CHOIR_ABILITIES = Object.freeze({
  hymn: createTimeline('hymn', 'Shard Hymn', [
    { id: 'gather', label: 'gather the hymn', dur: GATHER_SEC },
    { id: 'sing', label: 'sing', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: GATHER_SEC + STRIKE_SEC, id: 'hymn' }] }),
  discord: createTimeline('discord', 'Discord', [
    { id: 'swell', label: 'swell', dur: SWELL_SEC },
    { id: 'burst', label: 'burst', dur: STRIKE_SEC },
    { id: 'hold', label: 'contact held', dur: HOLD_SEC },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: SWELL_SEC + STRIKE_SEC, id: 'discord' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   hover  u the hems rise             lean   body pitch, + forward
//   reach  u the body moves forward    turn   0..1 the three face the lane
//   spread u the three out from the heart   drop  0..1 the three tipped down and out
//   mouth  0..1 the mouths open        arms   0..1 the arms raised
//   heart  0..1 the heart swollen      halo   0..1 the halo flared
//   squash 0..1 contact squash         shove  0..1 the recoil (B3)
//   fever  0..1 the tell flares
const KEYS = ['hover', 'lean', 'reach', 'turn', 'spread', 'drop', 'mouth', 'arms', 'heart', 'halo', 'squash', 'shove', 'fever'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const ZERO = restChannels({});
const pose = (p) => ({ ...ZERO, ...p });
const GATHERED = pose({ hover: 0.18, lean: -0.1, reach: -0.08, turn: 1, mouth: 0.6, arms: 0.9, heart: 0.5, halo: 0.3, fever: 1 });
const SUNG = pose({ hover: 0.08, lean: 0.22, reach: 0.3, turn: 1, mouth: 1, arms: 0.7, heart: 0.8, halo: 0.8, squash: 1, fever: 1 });
const SWOLLEN = pose({ hover: 0.3, lean: -0.06, spread: 0.3, mouth: 0.6, arms: 0.6, heart: 1, halo: 0.6, fever: 1 });
const BURST = pose({ hover: -0.08, lean: 0.08, spread: 0.65, drop: 1, mouth: 1, arms: 1, heart: 1, halo: 1, squash: 1, fever: 1 });
function mixPose(C, A, B, k) {
  for (const key of KEYS) C[key] = lerp(A[key], B[key], k);
  return C;
}

// Pure: the channels of an ability at a timeline sample. `from` is the pose
// the ability starts out of (B1/B5: a wind-up grows out of the last move's
// tail, never a snap from rest); the lab passes none.
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id !== 'hymn' && id !== 'discord') return C;
  const wind = id === 'hymn' ? GATHERED : SWOLLEN;
  const struck = id === 'hymn' ? SUNG : BURST;
  if (s.id === 'gather' || s.id === 'swell') mixPose(C, from, wind, ease.inOut(Math.min(1, k * 1.15)));
  else if (s.id === 'sing' || s.id === 'burst') mixPose(C, wind, struck, kick(k)); // B4: off on the press frame
  else if (s.id === 'hold') mixPose(C, struck, struck, 0);
  else if (s.id === 'recoil') {
    mixPose(C, struck, struck, 0);
    C.squash = 1 - ease.out(k);
    C.shove = recoil(k * 0.2);
  } else {
    mixPose(C, ZERO, struck, settle(k));
    C.squash = 0;
    C.shove = recoil(0.2 + k * 0.5);
  }
  return C;
}

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:choir-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  gown: () => geo('gown', () => new ConeGeometry(0.28, 1.4, 7, 1, false).translate(0, 0.7, 0), 401, 0.06),
  skull: () => geo('skull', () => taperBox(0.26, 0.32, 0.26, 0.8, 0.85, 0.02), 403),
  hood: () => geo('hood', () => new ConeGeometry(0.2, 0.42, 6, 1, true).translate(0, 0.1, -0.04), 405, 0.08),
  upper: () => geo('upper', () => limbBox(0.07, 0.07, 0.3, 0.85, 0.85), 407),
  fore: () => geo('fore', () => limbBox(0.06, 0.06, 0.3, 0.8, 0.8), 409),
  hand: () => geo('hand', () => new IcosahedronGeometry(0.05, 0), 411, 0.1),
  heart: () => geo('heart', () => new IcosahedronGeometry(0.28, 1), 413, 0.08),
  rib: () => geo('rib', () => new TorusGeometry(0.4, 0.028, 4, 10, Math.PI * 0.85), 415, 0.05),
  crystal: () => geo('crystal', () => new OctahedronGeometry(0.09, 0).scale(1, 2.2, 1), 417, 0.1),
  rune: () => geo('rune', () => new OctahedronGeometry(0.035, 0).scale(1, 1.2, 0.5), 419, 0.08),
  ring: () => sharedGeo('choir-ring', () => new TorusGeometry(0.62, 0.012, 4, 36)),
  mouth: () => sharedGeo('choir-mouth', () => new SphereGeometry(0.05, 6, 5).scale(0.9, 1.2, 0.4)),
  eye: () => sharedGeo('choir-eye', () => new BoxGeometry(0.06, 0.012, 0.012)),
  mote: () => sharedGeo('choir-mote', () => new IcosahedronGeometry(0.03, 0)),
};

const _m = new Matrix4();
const _q = new Quaternion();

function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}

export function buildHollowChoirFacet() {
  const group = new Group();
  group.name = 'hollow_choir';
  group.userData.modelStandard = true;
  const yaw = new Group(); // the root's first child: the hit overlay wraps it
  group.add(yaw);
  const grow = new Group(); // B7 spawn-in scale
  yaw.add(grow);
  const float = new Group(); // the hover: the whole rides on it
  float.position.set(0, HOVER_Y, 0);
  grow.add(float);
  const squashG = new Group(); // the contact squash, about the heart
  squashG.position.set(0, HEART_Y, 0);
  float.add(squashG);
  const body = new Group(); // body space = the classic's float space
  body.position.set(0, -HEART_Y, 0);
  squashG.add(body);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const robe = track(flashable(CHOIR));
  const robeLit = track(flashable(CHOIR_LIT));
  const robeShade = track(flashable(CHOIR_SHADE));
  const dark = track(flashable(CHOIR_DARK));
  const bone = track(flashable(BONE));
  const crystal = track(facetMaterial(CRYSTAL, { emissive: CRYSTAL, emissiveIntensity: 0.12 }));
  const runeMat = track(flashable(RUNE));
  const heartMat = lit(HEARTV);
  const mouthMat = lit(HEARTV);
  const inkMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- The heart: a faceted violet gem in a cage of six bone ribs, the ONE
  // indigo tell behind it.
  const heartG = new Group();
  heartG.position.y = HEART_Y;
  body.add(heartG);
  const heart = mesh(G.heart(), heartMat, heartG, false);
  const heartGlow = glow(HEARTV, 1.7, 0.55);
  heartG.add(heartGlow);
  const ribsG = new Group();
  heartG.add(ribsG);
  const ribs = placeRow(G.rib(), bone, 6, (i, m) => {
    const a = (i / 6) * Math.PI * 2;
    lay(m, 0, 0, 0, Math.cos(a), 0, Math.sin(a), 1, 1, 1, Math.PI / 2 + 0.2 * (i % 2));
  }, { name: 'choir-ribs', inkPx: PART_INK_PX, mottle: 0.06, seed: 71 });
  ribsG.add(ribs);
  const tell = tellGlow(0.6, 0.28);
  tell.name = 'tell';
  heartG.add(tell);

  // --- Three choristers, back to the heart: a gown of pleat plates with
  // tatters off its hem, a cowl of hood plates over a boxed skull, a lit
  // mouth, slit eyes, two arms raised to conduct, three crystal fingers on
  // each hand.
  const singers = [];
  const PLEATS = 6;
  // a pleat runs up the gown's slope from the hem (a thin wedge laid on the
  // cone), a shaded fold between each pair, a hood plate draped down the skull
  const pleatAt = (m, j) => {
    const a = (j / PLEATS) * Math.PI * 2 + 0.3;
    lay(m, Math.sin(a) * 0.27, 0.04, Math.cos(a) * 0.27, -Math.sin(a) * 0.19, 1, -Math.cos(a) * 0.19, 0.1, 1.25, 0.05, 0);
  };
  const foldAt = (m, j) => {
    const a = ((j + 0.5) / PLEATS) * Math.PI * 2 + 0.3;
    lay(m, Math.sin(a) * 0.26, 0.02, Math.cos(a) * 0.26, -Math.sin(a) * 0.19, 1, -Math.cos(a) * 0.19, 0.07, 0.8 + 0.2 * hash01(j, 9), 0.05, 0);
  };
  const hoodAt = (m, j) => {
    const a = (j / 4) * Math.PI * 2 + Math.PI / 4;
    lay(m, Math.sin(a) * 0.1, 0.2, Math.cos(a) * 0.1 - 0.03, Math.sin(a) * 0.45, -1, Math.cos(a) * 0.45, 0.13, 0.32, 0.04, 0);
  };
  const pleats = placeRow(wedge, robeLit, SINGERS * PLEATS, (i, m) => pleatAt(m, i % PLEATS), { name: 'choir-pleats', inkPx: PART_INK_PX, mottle: 0.1, seed: 73 });
  const folds = placeRow(wedge, robeShade, SINGERS * PLEATS, (i, m) => foldAt(m, i % PLEATS), { name: 'choir-folds', inkPx: PART_INK_PX * 0.8, mottle: 0.08, seed: 75 });
  const hoods = placeRow(wedge, dark, SINGERS * 4, (i, m) => hoodAt(m, i % 4), { name: 'choir-hoods', inkPx: PART_INK_PX, mottle: 0.1, seed: 77 });
  const tatters = instancedPart(wedge, robeShade, SINGERS * TATTERS, { name: 'choir-tatters', inkPx: PART_INK_PX * 0.8, moving: true });
  const fingers = instancedPart(wedge, crystal, SINGERS * 2 * FINGERS, { name: 'choir-fingers', ink: false, moving: true });
  const singersG = new Group();
  body.add(singersG, tatters, fingers);
  for (let i = 0; i < SINGERS; i++) {
    const g = new Group(); // turns about the heart
    singersG.add(g);
    const inner = new Group(); // the chorister, at its radius
    inner.position.z = RING;
    g.add(inner);
    const gown = mesh(G.gown(), robe, inner);
    const hd = new Group();
    hd.position.y = 1.62;
    inner.add(hd);
    mesh(G.skull(), dark, hd);
    const hood = mesh(G.hood(), dark, hd);
    hood.position.y = 0.1;
    const mouth = mesh(G.mouth(), mouthMat, hd, false);
    mouth.position.set(0, -0.08, 0.13);
    const mouthGlow = glow(HEARTV, 0.35, 0);
    mouthGlow.position.set(0, -0.08, 0.18);
    hd.add(mouthGlow);
    for (const side of [-1, 1]) {
      const eye = new Mesh(G.eye(), inkMat);
      eye.position.set(side * 0.06, 0.04, 0.13);
      eye.rotation.set(0, side * -0.3, side * -0.3);
      hd.add(eye);
    }
    const arms = [];
    for (const side of [-1, 1]) {
      const sh = new Group();
      sh.position.set(side * 0.16, 1.3, 0.04);
      inner.add(sh);
      mesh(G.upper(), dark, sh);
      const el = new Group();
      el.position.y = 0.3;
      sh.add(el);
      mesh(G.fore(), dark, el);
      const hand = mesh(G.hand(), dark, el);
      hand.position.y = 0.3;
      arms.push({ side, sh, el, hand });
    }
    singers.push({ g, inner, gown, hd, mouth, mouthGlow, arms, base: (i / SINGERS) * Math.PI * 2 });
  }
  // the pleat, fold and hood rows ride their choristers (re-laid each frame)
  singersG.add(pleats, folds, hoods);

  // --- The halo: seven faceted crystals between seven runes on a thin ring.
  const halo = new Group();
  halo.position.y = HALO_Y;
  body.add(halo);
  const ring = new Mesh(G.ring(), lit(RUNE));
  ring.rotation.x = Math.PI / 2;
  halo.add(ring);
  const crystals = placeRow(G.crystal(), crystal, NOTES, (i, m) => {
    const a = (i / NOTES) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62, 0, 1, 0, 1, 1, 1, a);
  }, { name: 'choir-crystals', ink: false, mottle: 0 });
  halo.add(crystals);
  const runes = placeRow(G.rune(), runeMat, NOTES, (i, m) => {
    const a = ((i + 0.5) / NOTES) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62, Math.cos(a), 0, Math.sin(a), 1, 1, 1);
  }, { name: 'choir-runes', inkPx: PART_INK_PX * 0.7, mottle: 0.08, seed: 79 });
  halo.add(runes);
  const haloGlow = glow(CRYSTAL, 1.6, 0.16);
  halo.add(haloGlow);
  // five motes drifting about the whole
  const motes = instancedPart(G.mote(), heartMat, MOTES, { name: 'choir-motes', ink: false, moving: true });
  body.add(motes);

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(0.85, 0.55);
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9: a
  // champion takes half the squash and flinch and keeps a small hop).
  const points = makePoints({
    tip: [heartG, 0, 0, 0.3],
    heart: [heartG, 0, 0, 0],
    mouth: [singers[0].hd, 0, -0.08, 0.18],
    crown: [halo, 0, 0, 0],
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: HOVER_Y + HEART_Y };

  // --- Live state.
  const C = restChannels({});
  const spawn = createSpawnClock();
  let lastT = null;
  let lastX = 0;
  let lastZ = 0;
  let lastId = null;
  let idle = 0;
  let ab = null; // { id, t }
  let telKey = null;
  let telAge = 0;
  let teleSpan = 0.8;
  let from = { ...ZERO };
  const lv = new Vector3();
  let leanF = 0;
  let leanS = 0;
  let turnPh = 0; // the slow turn of the three about the heart
  let hem = HOVER_Y;

  function reset() {
    lastT = null;
    ab = null;
    telKey = null;
    from = { ...ZERO };
    spawn.clear();
  }
  function begin(id) {
    from = { ...C, squash: 0, shove: 0 };
    ab = { id, t: 0 };
  }
  const strikeOf = (id) => CHOIR_ABILITIES[id].startOf(id === 'hymn' ? 'sing' : 'burst');

  // In game: the sim's warning IS the wind-up (B1), stretched over the
  // telegraph and ending one strike before it resolves, so the sing and the
  // burst land on the sim's tick. On a slow frame the strike may run ahead
  // of the resolve, but the contact holds until the warning is gone.
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const move = tel ? tel.move : null;
    const id = move === 'shard_hymn' ? 'hymn' : move === 'discord' ? 'discord' : null;
    const key = id ? `${move}:${tel.startTick}` : null;
    if (key && key !== telKey) {
      telKey = key;
      telAge = 0;
      const W = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 1;
      teleSpan = Math.max(0.05, W - STRIKE_SEC);
      begin(id);
    } else if (!key && telKey) {
      telKey = null;
      if (ab && ab.t < strikeOf(ab.id)) ab.t = strikeOf(ab.id);
    }
    if (!ab) return restChannels(C);
    const tl = CHOIR_ABILITIES[ab.id];
    const windEnd = strikeOf(ab.id);
    if (telKey && ab.t < windEnd) {
      telAge += dt;
      ab.t = telAge < teleSpan ? Math.min(windEnd - 1e-4, (telAge / teleSpan) * windEnd) : windEnd;
    } else {
      ab.t += dt;
      if (telKey) ab.t = Math.min(ab.t, windEnd + STRIKE_SEC);
    }
    abilityChannels(ab.id, tl.sample(ab.t), C, from);
    if (ab.t >= tl.duration) ab = null;
    return C;
  }

  // Lay the hover, the heart, the three, the halo and the motes for this frame.
  function apply(dt, { rage = 0 }) {
    // the hover: the hems hold their height (their own breath) while the
    // three and the heart drive; a strike leans and reaches, never jumps
    const sp = Math.min(2, Math.hypot(lv.x, lv.z) / CHOIR_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.08, (lv.z / CHOIR_WALK) * 0.08) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / CHOIR_WALK) * 0.04 : 0) - leanS) * k;
    float.position.set(0, HOVER_Y + SWAY * Math.sin(idle * 1.6) + C.hover, C.reach - 0.1 * C.shove);
    float.rotation.set(C.lean + leanF, 0, leanS + 0.03 * Math.sin(idle * 1.1));
    hem = float.position.y - 0.05 * C.drop; // the lowest hem (a dropped gown tips its hem a little)
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    // the heart beats, faster raged, swelling to a move; the ribs open with it
    const beat = 0.5 + 0.5 * Math.sin(idle * (rage ? 7 : 4.2));
    heart.scale.setScalar(1 + 0.08 * beat + 0.3 * C.heart);
    heartGlow.material.opacity = Math.min(0.9, 0.45 + 0.2 * beat + 0.35 * C.heart);
    ribsG.scale.setScalar(1 + 0.2 * C.heart);
    ribsG.rotation.y = idle * 0.2;
    tell.material.opacity = Math.min(0.85, 0.25 + 0.05 * Math.sin(idle * 2.2) + 0.35 * C.fever + (rage ? 0.2 + 0.1 * Math.sin(idle * 9) : 0));
    // the three: a slow turn about the heart at rest; a hymn turns them to
    // the lane together, a discord drifts them out and flings them wide
    turnPh += dt * 0.35 * (1 - C.turn);
    for (let i = 0; i < SINGERS; i++) {
      const sg = singers[i];
      const base = sg.base + turnPh;
      const fan = (i - 1) * 0.6; // the hymn's fan: the lead centred, the two beside
      sg.g.rotation.y = base * (1 - C.turn) + fan * C.turn;
      sg.inner.position.z = RING + C.spread;
      sg.inner.rotation.x = -0.25 * C.turn + 0.55 * C.drop + 0.1 * Math.sin(idle * 2 + i);
      sg.mouth.scale.setScalar(1 + 0.8 * C.mouth);
      sg.mouthGlow.material.opacity = 0.6 * C.mouth;
      sg.hd.rotation.x = -0.15 * C.turn + 0.2 * C.mouth;
      for (const a of sg.arms) {
        a.sh.rotation.set(0.4 - 1.2 * C.arms, 0, a.side * (0.6 + 0.5 * C.arms));
        a.el.rotation.set(-0.5 - 0.6 * C.arms, 0, a.side * 0.2);
      }
    }
    // the pleats, folds and hoods ride their choristers
    singersG.updateMatrixWorld(true);
    for (let i = 0; i < SINGERS; i++) {
      const sg = singers[i];
      sg.inner.updateMatrixWorld(true);
      for (let j = 0; j < PLEATS; j++) {
        pleatAt(_m, j);
        _m.premultiply(sg.inner.matrix).premultiply(sg.g.matrix);
        pleats.setMatrixAt(i * PLEATS + j, _m);
        foldAt(_m, j);
        _m.premultiply(sg.inner.matrix).premultiply(sg.g.matrix);
        folds.setMatrixAt(i * PLEATS + j, _m);
      }
      for (let j = 0; j < 4; j++) {
        hoodAt(_m, j);
        _m.premultiply(sg.hd.matrix).premultiply(sg.inner.matrix).premultiply(sg.g.matrix);
        hoods.setMatrixAt(i * 4 + j, _m);
      }
      // the tatters swing with the hover off the hem
      for (let j = 0; j < TATTERS; j++) {
        const a = (j / TATTERS) * Math.PI * 2 + 0.6;
        const sw = 0.2 * Math.sin(idle * 2 + i + j) + 0.25 * C.drop;
        lay(_m, Math.sin(a) * 0.24, 0.04, Math.cos(a) * 0.24, Math.sin(a) * sw, -1, Math.cos(a) * sw, 0.07, 0.18 + 0.06 * hash01(i, j), 0.05, 0.4 * (j % 2));
        _m.premultiply(sg.inner.matrix).premultiply(sg.g.matrix);
        tatters.setMatrixAt(i * TATTERS + j, _m);
      }
      // the fingers off each hand
      sg.arms.forEach((a, h) => {
        a.el.updateMatrixWorld(true);
        for (let f = 0; f < FINGERS; f++) {
          const spreadF = (f - 1) * (0.25 + 0.3 * C.arms);
          lay(_m, a.hand.position.x + spreadF * 0.03, a.hand.position.y + 0.03, a.hand.position.z, Math.sin(spreadF), 1, 0.3, 0.05, 0.1, 0.04, 0);
          _m.premultiply(a.el.matrix).premultiply(a.sh.matrix).premultiply(sg.inner.matrix).premultiply(sg.g.matrix);
          fingers.setMatrixAt(i * 2 * FINGERS + h * FINGERS + f, _m);
        }
      });
    }
    pleats.instanceMatrix.needsUpdate = true;
    folds.instanceMatrix.needsUpdate = true;
    hoods.instanceMatrix.needsUpdate = true;
    tatters.instanceMatrix.needsUpdate = true;
    fingers.instanceMatrix.needsUpdate = true;
    // the halo turns slowly, flares and widens on a move
    halo.rotation.y = idle * 0.6 + 2 * C.turn * C.halo;
    halo.scale.setScalar(1 + 0.3 * C.halo);
    halo.position.y = HALO_Y + 0.15 * C.halo;
    haloGlow.material.opacity = Math.min(0.6, 0.16 + 0.35 * C.halo);
    // the motes drift round the whole
    for (let i = 0; i < MOTES; i++) {
      const a = idle * 0.5 + (i / MOTES) * Math.PI * 2;
      const r = 0.9 + 0.2 * Math.sin(idle * 0.9 + i) + 0.4 * C.halo;
      _m.makeScale(1 + 0.5 * C.heart, 1 + 0.5 * C.heart, 1 + 0.5 * C.heart).setPosition(Math.cos(a) * r, 1.0 + 0.5 * Math.sin(idle * 0.7 + i * 1.3) + 0.3 * C.halo, Math.sin(a) * r);
      motes.setMatrixAt(i, _m);
    }
    motes.instanceMatrix.needsUpdate = true;
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    // pose: { t, e (the sim entity, read only), turntable }. A dying rig is
    // never posed again (the enemy layer's kill takes it), so it freezes in
    // the pose it died in.
    pose({ t, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      const moved = Math.hypot(group.position.x - lastX, group.position.z - lastZ);
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || moved > 2.5;
      if (fresh) {
        reset();
        if (born && e && !turntable) spawn.restart(t);
      }
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      // the velocity for the lean (its own: it has no gait)
      if (dt > 0 && moved < 2.5) {
        lv.set((group.position.x - lastX) / dt, 0, (group.position.z - lastZ) / dt);
        yaw.updateWorldMatrix(true, false);
        lv.applyQuaternion(yaw.getWorldQuaternion(_q).invert());
      } else lv.set(0, 0, 0);
      lastX = group.position.x;
      lastZ = group.position.z;
      lastId = id;
      idle += dt;
      if (e || turntable) drive(dt, e);
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { rage: e && e.rage ? 1 : 0 });
    },
    // The model lab: pose an ability at any time (play, scrub, rewind). The
    // channels are pure in abT.
    lab: {
      abilities: CHOIR_ABILITIES,
      reset,
      feet: () => [], // a floater: no feet (the hem is the rule instead)
      hem: () => hem,
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      parts: { float, heartG, halo, singers },
      pose({ dt, ability = null, abT = 0 }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, CHOIR_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        apply(dt, {});
      },
    },
  };
}
