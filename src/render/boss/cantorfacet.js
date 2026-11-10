// THE HOLLOW CANTOR, MODEL STANDARD (docs/MODEL_STANDARD.md). The Hollow
// Heart's final boss rebuilt in the faceted look of Kesh's sample video, on
// top of the chibi ink style, keeping the classic's identity (render/boss/
// heart.js): the singer under the Barrow, a god's echo, a tall hooded figure
// of near-black plum cloth that floats above the floor, a blank pale mask
// with an open singing mouth, an open rib cage with the violet heart beating
// in it, long sleeves that lift as it sings, a halo of seven notes behind its
// head. What the standard adds:
//
//   * the robe as faceted cloth panels laid in a brick pattern round a hanging
//     spine (pleats that narrow to the cowl), a dark lining inside the bell,
//     nine torn tatters off the hem that swing with the hover, a cowl of
//     plates over the shoulders, the rib cage as eight faceted ribs round a
//     sternum, the heart a faceted gem, the halo a ring of seven faceted notes
//     between seven runes, the hood a faceted shell, the mask faceted planes
//     with the mouth cut in it, sleeves of faceted cloth with a cuff of plates
//     and three crystal fingers;
//   * it has NO FEET: the legless rule is the floater's. The hem holds its
//     hover (it never touches the floor and never leaves its sway) while the
//     head, the chest and the sleeves drive; a strike is a lean and a reach
//     off the hover, never a jump;
//   * five ability timelines driven by the sim (sim/bosses/cantor.js):
//       Hollow Note  draw (the 48-tick ring warning less one strike: the head
//                    tips back, the mouth opens, the sleeves lift, the heart
//                    swells), sing (2.5 frames on the hit: the head thrown
//                    forward, the mouth wide, the sleeves flung out, the
//                    shooter's squash), held with a recoil (the note kicks it
//                    back), settle;
//       Sung Lance   gather (the 54-tick lane warning less one strike: the
//                    sleeves crossed over the chest, the body drawn back off
//                    the lane, the heart drawn in bright), lance (2.5 frames on
//                    the hit: the chest thrust down the lane, the sleeves flung
//                    back, the B9 lunge), held with a recoil, settle;
//       Heart Pulse  swell (the 60-tick ring warning less one strike: the
//                    sleeves spread wide, the ribs open, the heart grows, the
//                    body rises, the halo flares), pulse (2.5 frames on the
//                    hit: the body drops, the ribs snap shut, the squash),
//                    held with a recoil, settle;
//       Echo Step    fold (the sim's 18-tick fade: it folds into a sliver of
//                    light and sinks), gone (hidden while the sim moves it),
//                    rise (on the landing: it grows back out of the floor in
//                    seven frames, a tenth over), stand (settle);
//       Verse        flare (a verse taken: the halo blazes, a note lights, the
//                    sleeves rise and the mouth opens), held, settle; in a
//                    fight a verse taken mid-song only flares the halo;
//   * the [M] beats: a spawn-in grow, named points (mouth, chest, the lance's
//     `tip`, each hand, crown), the shared hit envelope (`react`).
//
// Same interface as the classic (group, mats, setYaw, setFlash, pose), plus
// `lab`, `points`, `react`. Faces +Z. Render only: it reads the sim entity
// (mode, telegraph, verse, hp) and never writes it.
import { BoxGeometry, Color, ConeGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { HEART } from '../enemies/style.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, instancedPart, placeRow, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';
import { lay } from '../facet/shapes.js';
import { HOLD_SEC, SPAWN_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, lunge, makePoints, recoil, settle, spawnGrow } from '../facet/beats.js';

// --- Colour: the classic Cantor's (heart.js), no new hues.
const VIOLET = new Color(PALETTE.godstuffViolet);
const VIOLET_PEAK = new Color(PALETTE.godstuffVioletPeak);
const ROBE = HEART.cloth.clone().lerp(new Color(PALETTE.voidCharcoal), 0.25);
const ROBE_LIGHT = ROBE.clone().lerp(HEART.flesh, 0.35); // a value step: the pleats' lit faces
const ROBE_LINING = HEART.flesh.clone().multiplyScalar(0.8);
const MASK = new Color(PALETTE.bone).lerp(new Color('#E9E2F6'), 0.55);
const BONE = HEART.bone.clone();
const NOTE_DIM = VIOLET.clone().multiplyScalar(0.28);
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });
const lit = (c) => new MeshBasicMaterial({ color: new Color(c), toneMapped: false });
function glow(color, size, opacity) {
  const g = makeGlowSprite({ color: '#FFFFFF', size, opacity });
  g.material.toneMapped = false;
  g.material.color.set(color);
  return g;
}

// --- Body plan (yaw space, faces +Z).
const HOVER_Y = 0.32; // u, the hem's rest hover (the classic's)
const SWAY = 0.1; // u, the hover's breath
export const CANTOR_WALK = 1.35; // u/s, CANTOR.moveSpeed
const DRAW_SEC = 48 / 60 - STRIKE_SEC; // the note ring's warning
const GATHER_LANCE_SEC = 54 / 60 - STRIKE_SEC; // the lance lane's warning
const SWELL_SEC = 60 / 60 - STRIKE_SEC; // the pulse ring's warning
const FOLD_SEC = 18 / 60; // CANTOR.step.fadeTicks
const GONE_SEC = 0.4; // the lab's; in a fight the sim says
const LANCE_Z = 0.45; // u ahead of the body's centre, where the lance leaves
const CHEST_Y = 2.05;

export const CANTOR_ABILITIES = Object.freeze({
  note: createTimeline('note', 'Hollow Note', [
    { id: 'draw', label: 'draw breath', dur: DRAW_SEC },
    { id: 'sing', label: 'sing', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: DRAW_SEC, id: 'note' }] }),
  lance: createTimeline('lance', 'Sung Lance', [
    { id: 'gather', label: 'gather', dur: GATHER_LANCE_SEC },
    { id: 'lance', label: 'lance', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: GATHER_LANCE_SEC, id: 'lance' }] }),
  pulse: createTimeline('pulse', 'Heart Pulse', [
    { id: 'swell', label: 'swell', dur: SWELL_SEC },
    { id: 'pulse', label: 'pulse', dur: STRIKE_SEC },
    { id: 'hold', label: 'struck', dur: HOLD_SEC },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: SWELL_SEC, id: 'pulse' }] }),
  step: createTimeline('step', 'Echo Step', [
    { id: 'fold', label: 'fold away', dur: FOLD_SEC },
    { id: 'gone', label: 'gone', dur: GONE_SEC },
    { id: 'rise', label: 'rise again', dur: SPAWN_SEC },
    { id: 'stand', label: 'settle', dur: 0.4 },
  ], { cues: [{ at: 0, id: 'fade' }, { at: FOLD_SEC + GONE_SEC, id: 'land' }] }),
  verse: createTimeline('verse', 'Verse', [
    { id: 'flare', label: 'a verse taken', dur: 0.4 },
    { id: 'held', label: 'held', dur: 0.6 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0, id: 'verse' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (0 at rest):
//   hover  u the hem rises           lean   body pitch, + forward
//   reach  u the body moves forward  head   head pitch, + down
//   mouth  0..1 the mouth open       lift   0..1 the sleeves lifted out
//   spread 0..1 the sleeves wide     cross  0..1 the sleeves crossed on the chest
//   back   0..1 the sleeves flung back
//   chest  0..1 the ribs open, the heart swollen
//   halo   0..1 the halo flared      fold   0..1 folded into a sliver
//   squash 0..1 contact squash       shove  0..1 the recoil off a hit (B3)
const KEYS = ['hover', 'lean', 'reach', 'head', 'mouth', 'lift', 'spread', 'cross', 'back', 'chest', 'halo', 'fold', 'squash', 'shove'];
const restChannels = (C) => {
  for (const k of KEYS) C[k] = 0;
  return C;
};
const ZERO = restChannels({});
const pose = (o) => ({ ...ZERO, ...o });
const DRAWN = pose({ hover: 0.22, lean: -0.1, head: -0.32, mouth: 0.5, lift: 0.65, chest: 0.45, halo: 0.3 });
const SUNG = pose({ hover: 0.12, lean: 0.14, head: 0.26, mouth: 1, lift: 0.95, spread: 0.35, chest: 0.75, halo: 0.5, squash: 1 });
const GATHERED = pose({ hover: 0.1, lean: -0.16, reach: -0.15, head: -0.12, mouth: 0.3, cross: 1, chest: 0.35, halo: 0.2 });
const LANCED = pose({ hover: 0.05, lean: 0.3, head: 0.18, mouth: 0.7, back: 1, chest: 1, halo: 0.4, squash: 1 });
const SWOLLEN = pose({ hover: 0.5, lean: -0.08, head: -0.36, mouth: 0.7, lift: 0.55, spread: 1, chest: 1, halo: 1 });
const PULSED = pose({ hover: -0.14, lean: 0.16, head: 0.3, mouth: 0.4, lift: -0.15, spread: 0.8, chest: 0.2, halo: 0.6, squash: 1 });
const FOLDED = pose({ fold: 1, lift: -0.3, head: 0.4, halo: 0.6 });
const FLARED = pose({ hover: 0.3, head: -0.3, mouth: 0.8, lift: 0.8, chest: 0.6, halo: 1 });
const mix = (C, A, B, k) => {
  for (const key of KEYS) C[key] = A[key] + (B[key] - A[key]) * k;
  return C;
};

// `from` is the pose an ability starts out of (rest in the lab; in a fight
// whatever the Cantor was doing): every wind-up grows out of it (B1/B5).
export function abilityChannels(id, s, C = restChannels({}), from = ZERO) {
  restChannels(C);
  const k = s.k;
  if (id === 'note') {
    if (s.id === 'draw') mix(C, from, DRAWN, ease.inOut(Math.min(1, k * 1.4)));
    else if (s.id === 'sing') mix(C, DRAWN, SUNG, kick(k));
    else if (s.id === 'hold') {
      mix(C, SUNG, SUNG, 0);
      C.shove = recoil(k * HOLD_SEC); // B3: the note kicks it back
    } else {
      mix(C, ZERO, SUNG, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.5);
    }
  } else if (id === 'lance') {
    // B9: drawn back off the lane through the warning, driven past rest on the hit
    if (s.id === 'gather') {
      mix(C, from, GATHERED, ease.inOut(Math.min(1, k * 1.4)));
      C.reach = lunge('pull', k).reach * 0.6;
    } else if (s.id === 'lance') {
      mix(C, GATHERED, LANCED, kick(k));
      const L = lunge('drive', k);
      C.reach = L.reach * 0.6;
      C.squash = (L.sx - 1) / 0.19;
    } else if (s.id === 'hold') {
      mix(C, LANCED, LANCED, 0);
      C.reach = 0.88 * 0.6;
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, { ...LANCED, reach: 0.88 * 0.6 }, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.5);
    }
  } else if (id === 'pulse') {
    if (s.id === 'swell') mix(C, from, SWOLLEN, ease.inOut(Math.min(1, k * 1.3)));
    else if (s.id === 'pulse') mix(C, SWOLLEN, PULSED, kick(k));
    else if (s.id === 'hold') {
      mix(C, PULSED, PULSED, 0);
      C.shove = recoil(k * HOLD_SEC);
    } else {
      mix(C, ZERO, PULSED, settle(k));
      C.shove = recoil(HOLD_SEC + k * 0.6);
    }
  } else if (id === 'step') {
    if (s.id === 'fold') mix(C, from, FOLDED, ease.in(k));
    else if (s.id === 'gone') mix(C, FOLDED, FOLDED, 0);
    else if (s.id === 'rise') {
      // the grow back out of the floor: B7's curve, a tenth over
      const g = spawnGrow(k * SPAWN_SEC);
      mix(C, FOLDED, ZERO, Math.min(1, g));
      C.fold = Math.max(0, 1 - g);
      C.hover = 0.3 * Math.max(0, g - 1) * 10;
    } else {
      mix(C, ZERO, { ...ZERO, hover: 0.08, lift: 0.1 }, settle(k));
    }
  } else if (id === 'verse') {
    if (s.id === 'flare') mix(C, from, FLARED, ease.out(k));
    else if (s.id === 'held') mix(C, FLARED, FLARED, 0);
    else mix(C, ZERO, FLARED, settle(k));
  }
  return C;
}

// --- Geometry.
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:cantor-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  lining: () => geo('lining', () => new ConeGeometry(0.66, 1.75, 9, 1, true).scale(-1, 1, 1), 601),
  cowl: () => geo('cowl', () => new SphereGeometry(0.52, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), 603),
  hood: () => geo('hood', () => new SphereGeometry(0.34, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.72), 605),
  face: () => geo('face', () => new SphereGeometry(0.22, 9, 7), 607, 0.06),
  rib: () => geo('rib', () => new TorusGeometry(0.3, 0.035, 4, 10, Math.PI * 1.25), 609),
  sternum: () => geo('sternum', () => new BoxGeometry(0.07, 0.56, 0.05), 611),
  heart: () => geo('heart', () => new IcosahedronGeometry(0.15, 0), 613, 0.16),
  note: () => geo('note', () => new IcosahedronGeometry(0.06, 0), 615, 0.16),
  sleeve: () => geo('sleeve', () => new ConeGeometry(0.2, 1.15, 7, 1, true).translate(0, -0.57, 0), 617),
  cuff: () => geo('cuff', () => new BoxGeometry(0.09, 0.05, 0.06), 619),
  finger: () => geo('finger', () => new ConeGeometry(0.035, 0.32, 4).translate(0, -0.16, 0), 621, 0.14),
  mouth: () => geo('mouth', () => new SphereGeometry(0.06, 8, 6), 623, 0),
  mote: () => geo('mote', () => new IcosahedronGeometry(0.04, 0), 625, 0.12),
};

const _m = new Matrix4();
const _q = new Quaternion();
const TATTERS = 9;
const NOTES = 7;
const MOTES = 6;

export function buildCantorFacet() {
  const group = new Group();
  group.name = 'boss-cantor';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const grow = new Group();
  yaw.add(grow);
  // the floating body: everything above the floor hangs off `float`
  const float = new Group();
  grow.add(float);
  // the fold (an Echo Step) folds the body down about the hem
  const foldG = new Group();
  float.add(foldG);
  const squashG = new Group();
  squashG.position.set(0, 1.5, 0);
  foldG.add(squashG);
  const body = new Group();
  body.position.set(0, -1.5, 0);
  squashG.add(body);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const robe = track(flashable(ROBE));
  const robeLight = track(flashable(ROBE_LIGHT));
  const lining = track(flashable(ROBE_LINING));
  const bone = track(flashable(BONE));
  const mask = track(flashable(MASK));
  const heartMat = new MeshBasicMaterial({ color: VIOLET_PEAK.clone(), vertexColors: true, toneMapped: false });
  const noteMat = new MeshBasicMaterial({ color: VIOLET.clone(), vertexColors: true, toneMapped: false });
  const fingerMat = new MeshBasicMaterial({ color: VIOLET_PEAK.clone(), vertexColors: true, toneMapped: false });
  const mouthMat = lit(PALETTE.voidCharcoal);
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- The robe: a bell of cloth panels round a hanging spine, the lining inside.
  const spine = createSpine(5);
  const ROBE_PTS = [[0, 0.2, 0], [0, 0.65, 0], [0, 1.15, 0], [0, 1.7, 0.02], [0, 2.25, 0.03]];
  ROBE_PTS.forEach(([x, y, z], i) => spine.pts[i].set(x, y, z));
  const pleats = createPlateTube({ spine, rings: 9, around: 10, arc: Math.PI * 2, u0: 0.02, u1: 0.98, radius: (u) => 0.78 - 0.5 * u * u, plateMat: robe, bandMat: robeLight, bandEvery: 3, bandAround: 10, tilt: 0.06, thick: 0.07, name: 'cantor-pleats' });
  pleats.update();
  body.add(pleats.plates, pleats.bands);
  const inner = mesh(G.lining(), lining, body, false);
  inner.position.y = 1.12;
  // nine tatters off the hem, swinging with the hover (a moving row)
  const tatters = instancedPart(wedge, robe, TATTERS, { name: 'cantor-tatters', moving: true });
  body.add(tatters);
  // the cowl over the shoulders: a shell of plates
  const cowl = mesh(G.cowl(), robe, body);
  cowl.position.set(0, 2.32, -0.05);
  cowl.scale.set(1.15, 0.55, 0.9);
  body.add(placeRow(wedge, robeLight, 8, (i, m) => {
    const a = (i / 8) * Math.PI * 2;
    lay(m, Math.cos(a) * 0.5, 2.36, -0.05 + Math.sin(a) * 0.4, Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.4, 0.14, 0.26, 0.2);
  }, { name: 'cantor-cowl', inkPx: PART_INK_PX, mottle: 0.12, seed: 93 }));

  // --- The open chest: eight ribs round a sternum, the heart beating in it.
  const chest = new Group();
  chest.position.set(0, CHEST_Y, 0.12);
  body.add(chest);
  const ribsG = new Group();
  chest.add(ribsG);
  for (const side of [-1, 1]) {
    ribsG.add(placeRow(G.rib(), bone, 4, (i, m) => {
      const sc = 1 - Math.abs(i - 1.2) * 0.1;
      m.makeRotationX(Math.PI / 2).multiply(_m.makeRotationZ(side * Math.PI * 0.12)).scale(new Vector3(sc * side, sc, sc)).setPosition(0, 0.2 - i * 0.14, 0);
    }, { name: side < 0 ? 'cantor-ribs-l' : 'cantor-ribs-r', inkPx: PART_INK_PX, mottle: 0.1, seed: 95 }));
  }
  const sternum = mesh(G.sternum(), bone, chest);
  sternum.position.set(0, 0.02, 0.3);
  const heart = new Mesh(G.heart(), heartMat);
  chest.add(heart);
  const heartGlow = glow(VIOLET, 1.8, 0.4);
  chest.add(heartGlow);

  // --- The head: a hood of faceted planes round a blank mask with the mouth cut in it.
  const head = new Group();
  head.position.set(0, 2.72, 0.06);
  body.add(head);
  const hood = mesh(G.hood(), robe, head);
  hood.scale.set(1, 1.25, 1.05);
  hood.rotation.x = -0.35;
  head.add(placeRow(wedge, robeLight, 6, (i, m) => {
    const a = Math.PI * 0.55 + (i / 5) * Math.PI * 0.9;
    lay(m, Math.cos(a) * 0.3, 0.26, Math.sin(a) * 0.26 - 0.08, Math.cos(a) * 0.3, 0.9, Math.sin(a) * 0.2, 0.1, 0.22, 0.18);
  }, { name: 'cantor-hood', inkPx: PART_INK_PX, mottle: 0.12, seed: 97 }));
  const face = mesh(G.face(), mask, head);
  face.scale.set(0.9, 1.12, 0.55);
  face.position.set(0, -0.04, 0.18);
  const mouth = new Mesh(G.mouth(), mouthMat);
  mouth.position.set(0, -0.12, 0.29);
  mouth.scale.set(0.9, 1.2, 0.4);
  head.add(mouth);
  const mouthGlow = glow(VIOLET_PEAK, 0.5, 0);
  mouthGlow.position.set(0, -0.12, 0.34);
  head.add(mouthGlow);
  head.add(placeRow(sharedGeo('facet:cantor-eye', () => new BoxGeometry(0.09, 0.016, 0.02)), lit(VIOLET_PEAK), 2, (i, m) => {
    const side = i ? 1 : -1;
    m.makeRotationZ(side * -0.25).setPosition(side * 0.08, 0.04, 0.3);
  }, { name: 'cantor-eyes', ink: false, mottle: 0 }));

  // --- The halo: seven notes between seven runes on a thin ring behind the head.
  const halo = new Group();
  halo.position.set(0, 2.8, -0.32);
  body.add(halo);
  const haloRing = new Mesh(sharedGeo('facet:cantor-halo', () => new TorusGeometry(0.62, 0.018, 4, 40)), lit(VIOLET));
  halo.add(haloRing);
  const haloGlow = glow(VIOLET, 2.4, 0.18);
  halo.add(haloGlow);
  const noteAt = (i) => Math.PI / 2 + ((i - 3) / NOTES) * Math.PI * 1.6;
  const notes = placeRow(G.note(), noteMat, NOTES, (i, m) => {
    const a = noteAt(i);
    m.makeTranslation(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
  }, { name: 'cantor-notes', ink: false, mottle: 0 });
  halo.add(notes);
  halo.add(placeRow(wedge, bone, NOTES, (i, m) => {
    const a = noteAt(i) + (0.5 / NOTES) * Math.PI * 1.6;
    lay(m, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0, Math.cos(a), Math.sin(a), 0, 0.05, 0.12, 0.05);
  }, { name: 'cantor-runes', inkPx: PART_INK_PX, mottle: 0.1, seed: 99 }));
  const noteCol = new Color();

  // --- The sleeves: faceted cloth from the shoulders, a cuff of plates, crystal fingers.
  const arms = [];
  for (const side of [-1, 1]) {
    const p = new Group();
    p.position.set(side * 0.5, 2.35, 0.02);
    body.add(p);
    const sl = mesh(G.sleeve(), robe, p);
    sl.rotation.x = Math.PI; // the open cuff at the bottom
    sl.position.y = -1.15;
    p.add(placeRow(G.cuff(), robeLight, 7, (i, m) => {
      const a = (i / 7) * Math.PI * 2;
      m.makeRotationY(-a).setPosition(Math.cos(a) * 0.19, -1.1, Math.sin(a) * 0.19);
    }, { name: side < 0 ? 'cantor-cuff-l' : 'cantor-cuff-r', inkPx: PART_INK_PX, mottle: 0.1, seed: 101 }));
    const hand = new Group();
    hand.position.y = -1.12;
    p.add(hand);
    hand.add(placeRow(G.finger(), fingerMat, 3, (i, m) => {
      m.makeRotationZ((i - 1) * 0.3);
    }, { name: side < 0 ? 'cantor-fingers-l' : 'cantor-fingers-r', ink: false, mottle: 0 }));
    const hg = glow(VIOLET, 0.6, 0.35);
    hg.position.y = -0.15;
    hand.add(hg);
    arms.push({ p, side, hg, hand });
  }
  // a choir of motes circling it (faceted gems under glows)
  const motes = instancedPart(G.mote(), noteMat, MOTES, { name: 'cantor-motes', ink: false, moving: true });
  grow.add(motes);
  const moteGlows = [];
  for (let i = 0; i < MOTES; i++) {
    const m = glow(i % 2 ? VIOLET_PEAK : VIOLET, 0.32, 0.6);
    grow.add(m);
    moteGlows.push(m);
  }
  const pool = glow(VIOLET, 3.6, 0.22);
  pool.position.y = 0.06;
  group.add(pool);
  const shadow = groundShadow(0.9, 0.36, { deep: 1.2 });
  group.add(shadow);

  // --- Points (B8) and the hit envelope's tuning.
  const points = makePoints({
    mouth: [head, 0, -0.12, 0.34],
    chest: [chest, 0, 0, 0.2],
    tip: [body, 0, CHEST_Y, LANCE_Z],
    crown: [halo, 0, 0.62, 0],
    handL: [arms[0].hand, 0, -0.2, 0],
    handR: [arms[1].hand, 0, -0.2, 0],
  });
  const react = { squash: 1, flinch: 1, knock: 0, axis: 'y', midY: 1.5 };

  // --- Live state.
  const spawn = createSpawnClock();
  const C = restChannels({});
  let lastT = null;
  let lastX = 0;
  let lastZ = 0;
  let lastId = null;
  let idle = 0;
  let ab = null;
  let from = { ...ZERO };
  let tel = null;
  // a warning is known by its attack and start tick, never by object: a
  // co-op guest's snapshots hand the rig a fresh copy every few ticks
  let telKey = null;
  let telAge = 0;
  let lastMode = 'sing';
  let lastVerse = 0;
  let flareT = 99; // s since a verse was taken (the halo's flare in a fight)
  let verseShown = 0;
  let simYaw = 0;
  let shownYaw = null;
  let laneYaw = null;
  let leanF = 0;
  const lv = new Vector3();

  function reset() {
    lastT = null;
    ab = null;
    tel = null;
    telKey = null;
    lastMode = 'sing';
    laneYaw = null;
    shownYaw = null;
    flareT = 99;
    spawn.clear();
  }
  const begin = (id, t = 0) => {
    from = { ...C, squash: 0, shove: 0, fold: 0 };
    ab = { id, t };
  };

  // In game: each warning is its wind-up, stretched to the sim's ticks so the
  // strike lands on the resolve; the Echo Step follows the sim's mode.
  function drive(dt, e) {
    const T = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'sing' : 'sing';
    const verse = e ? e.verse | 0 : 0;
    const key = T ? `${T.attack}:${T.startTick}` : null;
    if (key && key !== telKey) {
      telAge = 0;
      const id = T.attack === 'note' ? 'note' : T.attack === 'lance' ? 'lance' : T.attack === 'pulse' ? 'pulse' : null;
      if (id) begin(id);
    }
    telKey = key;
    tel = T;
    if (tel) telAge += dt;
    if (T && T.attack === 'lance' && Number.isFinite(T.dirX)) laneYaw = Math.atan2(T.dirX, T.dirZ);
    else if (!(ab && ab.id === 'lance')) laneYaw = null;
    // the Echo Step: it folds as the sim fades it, stays gone, rises on the landing
    if (mode === 'fade' && lastMode !== 'fade') begin('step');
    if (mode !== 'fade' && lastMode === 'fade' && ab && ab.id === 'step') ab.t = Math.max(ab.t, CANTOR_ABILITIES.step.startOf('rise'));
    // a verse taken: the whole flare when it is idle, the halo alone mid-song
    if (verse > lastVerse && lastVerse >= 0 && lastT !== null) {
      flareT = 0;
      // the whole flare unless a blow is pending (a settle gives way to it)
      const busy = ab && !/settle|stand/.test(CANTOR_ABILITIES[ab.id].sample(ab.t).id);
      if (!busy) begin('verse');
    }
    lastVerse = verse;
    verseShown = verse;
    flareT += dt;
    if (ab) {
      const tl = CANTOR_ABILITIES[ab.id];
      if (ab.id === 'step') {
        const riseAt = tl.startOf('rise');
        if (mode === 'fade') ab.t = Math.min(riseAt - 1e-4, ab.t + dt);
        else ab.t = Math.max(ab.t, riseAt) + dt;
      } else if (ab.id === 'verse') ab.t += dt;
      else {
        const windEnd = tl.startOf(tl.phases[1].id);
        if (tel && ab.t < windEnd) {
          const span = Math.max(0.05, (tel.resolveTick - tel.startTick) / 60 - STRIKE_SEC);
          ab.t = telAge < span ? Math.min(windEnd - 1e-4, (windEnd * telAge) / span) : windEnd;
        } else {
          ab.t = Math.max(ab.t, windEnd) + dt;
          // the strike may land ahead of the resolve on a slow frame (a 1 fps
          // machine), but the contact holds until the warning is gone
          if (tel) ab.t = Math.min(ab.t, windEnd + STRIKE_SEC);
        }
      }
      if (ab.t >= tl.duration) {
        ab = null;
        laneYaw = null;
      }
    }
    lastMode = mode;
    if (ab) abilityChannels(ab.id, CANTOR_ABILITIES[ab.id].sample(ab.t), C, from);
    else restChannels(C);
    if (mode === 'fade' && !(ab && ab.id === 'step')) C.fold = 1;
    // the halo's flare after a verse, over whatever it is doing
    if (flareT < 1.2) C.halo = Math.max(C.halo, flareT < 0.3 ? flareT / 0.3 : 1 - (flareT - 0.3) / 0.9);
    return C;
  }

  function apply(dt, { hpFrac, hidden = false }) {
    // the hover: the hem holds its height (its own breath) while the head,
    // chest and sleeves drive; a strike leans and reaches, never jumps
    const sp = Math.min(2, Math.hypot(lv.x, lv.z) / CANTOR_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.08, (lv.z / CANTOR_WALK) * 0.08) : 0) - leanF) * k;
    float.position.set(0, HOVER_Y + SWAY * Math.sin(idle * 1.6) + C.hover, C.reach - 0.1 * C.shove);
    float.rotation.set(C.lean + leanF, 0, 0.03 * Math.sin(idle * 1.1));
    // the fold: into a sliver of light about the hem, then gone
    const fold = 1 - C.fold * 0.94;
    foldG.scale.set(1 - C.fold * 0.6, fold, 1 - C.fold * 0.6);
    foldG.visible = C.fold < 0.985 && !hidden;
    shadow.visible = C.fold < 0.5 && !hidden;
    pool.visible = !hidden;
    // the contact squash kept to a boss's size (Kesh's pick): +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    // the sleeves
    for (const a of arms) {
      a.p.rotation.z = a.side * (0.12 + 1.0 * C.lift + 1.25 * C.spread - 0.35 * C.cross + 0.05 * Math.sin(idle * 1.3 + a.side));
      a.p.rotation.x = -0.25 - 0.9 * C.lift + 0.2 * C.spread - 1.1 * C.cross + 1.3 * C.back;
      a.p.rotation.y = a.side * 0.9 * C.cross;
      a.hg.material.opacity = 0.3 + 0.5 * Math.max(C.lift, C.spread, C.cross);
    }
    head.rotation.x = C.head + 0.05 * Math.sin(idle * 0.9);
    mouth.scale.set(0.9, 1.2 + 1.6 * C.mouth, 0.4);
    mouthGlow.material.opacity = 0.75 * C.mouth;
    // the heart beats faster as it weakens and with each verse taken; the ribs open with the chest
    const rate = 2.2 + verseShown * 0.5 + (1 - hpFrac) * 1.5;
    const beat = Math.pow(Math.max(0, Math.sin(idle * rate * Math.PI)), 6);
    heart.scale.setScalar(1 + 0.35 * beat + 0.5 * C.chest);
    heartGlow.material.opacity = Math.min(0.85, 0.35 + 0.3 * beat + 0.4 * C.chest);
    ribsG.scale.set(1 + 0.18 * C.chest, 1, 1 + 0.12 * C.chest);
    pool.material.opacity = (0.16 + 0.1 * beat + 0.2 * C.chest) * (1 - C.fold);
    // the halo turns slowly; a note lights for each verse it has taken
    halo.rotation.z = Math.sin(idle * 0.35) * 0.15;
    haloGlow.material.opacity = Math.min(0.6, 0.14 + 0.06 * verseShown + 0.3 * C.halo);
    halo.scale.setScalar(1 + 0.1 * C.halo);
    for (let i = 0; i < NOTES; i++) {
      const on = i >= 2 && i < 2 + verseShown; // the middle three: Root, Water, Stone
      noteCol.copy(on ? VIOLET_PEAK : NOTE_DIM);
      if (C.halo > 0) noteCol.lerp(VIOLET_PEAK, 0.5 * C.halo);
      notes.setColorAt(i, noteCol);
      const sc = on ? 1.3 + 0.2 * Math.sin(idle * 4 + i) : 1 + 0.3 * C.halo;
      const a = noteAt(i);
      _m.makeScale(sc, sc, sc).setPosition(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
      notes.setMatrixAt(i, _m);
    }
    notes.instanceMatrix.needsUpdate = true;
    notes.instanceColor.needsUpdate = true;
    // the tatters swing off the hem
    for (let i = 0; i < TATTERS; i++) {
      const a = (i / TATTERS) * Math.PI * 2 + 0.17;
      const sw = 0.2 * Math.sin(idle * 2 + i) + 0.3 * C.hover;
      lay(_m, Math.sin(a) * 0.7, 0.22, Math.cos(a) * 0.7, Math.sin(a) * (0.25 + sw), -1, Math.cos(a) * (0.25 + sw), 0.2, 0.62, 0.2, a);
      tatters.setMatrixAt(i, _m);
    }
    tatters.instanceMatrix.needsUpdate = true;
    // the choir of motes
    for (let i = 0; i < MOTES; i++) {
      const a = idle * (0.6 + verseShown * 0.15) + (i / MOTES) * Math.PI * 2;
      const r = (1.1 + 0.15 * Math.sin(idle * 1.7 + i)) * (1 - C.fold);
      const y = 1.4 + 0.6 * Math.sin(idle * 0.8 + i * 1.3);
      moteGlows[i].position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      moteGlows[i].material.opacity = (0.35 + 0.35 * Math.max(C.mouth, C.halo)) * (1 - C.fold) * (hidden ? 0 : 1);
      _m.makeRotationY(a).setPosition(Math.cos(a) * r, y, Math.sin(a) * r);
      motes.setMatrixAt(i, _m);
    }
    motes.instanceMatrix.needsUpdate = true;
    motes.visible = !hidden && C.fold < 0.985;
  }

  return {
    group,
    mats,
    points,
    react,
    setYaw: (r) => {
      simYaw = r;
      yaw.rotation.y = shownYaw === null ? r : shownYaw;
    },
    setFlash(k) {
      const v = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) m.emissiveIntensity = v;
    },
    // A dying rig is posed with e = null: it collapses in the pose it died
    // in (no wind-up runs on into a strike).
    pose({ t, hpFrac = 1, e = null, turntable = false }) {
      const id = e ? e.id : lastId;
      // a new boss (or a rewound clock) spawns in; the Echo Step's landing is
      // the step's own jump, never a new boss
      const moved = Math.hypot(group.position.x - lastX, group.position.z - lastZ);
      const stepping = e && (e.mode === 'fade' || lastMode === 'fade');
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || (moved > 2.5 && !stepping);
      if (fresh) {
        reset();
        if (born && e && !turntable) spawn.restart(t);
        lastVerse = e ? e.verse | 0 : 0;
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
      // the facing eases to the lane while it gathers and lances, and back to
      // the sim's facing after (never a snap)
      const aim = laneYaw === null ? simYaw : laneYaw;
      if (shownYaw === null || turntable) shownYaw = aim;
      else {
        let d = aim - shownYaw;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        shownYaw += d * (1 - Math.exp(-14 * dt));
      }
      yaw.rotation.y = shownYaw;
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { hpFrac, hidden: !!e && e.mode === 'fade' && !(ab && ab.id === 'step') });
    },
    lab: {
      abilities: CANTOR_ABILITIES,
      reset() {
        reset();
        lv.set(0, 0, 0);
      },
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      // the hem's height over the floor (the floater's planted base)
      hem: () => float.position.y,
      verse: (v) => {
        verseShown = v;
      },
      pose({ dt, ability = null, abT = 0, hpFrac = 1 }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, CANTOR_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        apply(dt, { hpFrac });
      },
    },
  };
}
