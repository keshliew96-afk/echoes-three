// THE LOCKKEEPER, MODEL STANDARD (docs/MODEL_STANDARD.md "Level II
// champions"). The Sunken Mill's second champion rebuilt in the faceted look
// of Kesh's sample video, on top of the chibi ink style, keeping the classic
// rig's identity (render/enemies/champions2.js): a gaunt keeper in a long
// sodden coat and a broad drooping hat, a long pale face with the ONE indigo
// tell in its eye (and in the hat band's keyhole buckle, seen from above), a
// lock-box lantern at the left hip, and a great rusted key on a chain, as
// long as his arm, in the right hand. What the standard adds:
//
//   * a coat of six faceted panels hung from the belt that swing on their
//     own, torn tails off every hem, a riveted collar and two strapped
//     bands, a row of lock-buttons down the chest, a boxed face with a
//     hollow cheek either side, a hat of a faceted crown and a sagging brim
//     with its edge torn, the keyhole buckle in the band, a lantern of
//     riveted iron with a pale flame, a key of a faceted bow, a collared
//     shaft and three bits, and a chain of fourteen links laid link by link from
//     the left hand to the key's bow;
//   * TWO LOCKED FEET (render/facet/gait.js): the coat stops at the shin, so
//     the boots show: each is pinned to the floor while it carries weight and
//     the legs reach it by two-bone IK; it lopes along the real travel, and a
//     foot the leg can no longer reach lifts, never slides; both arms reach
//     their hands by the same IK;
//   * two ability timelines driven by the sim:
//       Chain Hook  whirl (the warning less one strike: the key swung up
//                   behind the shoulder, whirling on its chain, the body
//                   turned away on the right foot), throw (2.5 frames,
//                   landing on the lane's tick: the arm whips forward on a
//                   long lead step and the key leaves the hand), fly (the
//                   contact held: the key out at the lane's end, the chain
//                   taut), reel (the key hauled back to the hand, the body
//                   rocking back), settle with one overshoot;
//       Lock Turn   lift (the warning less one strike: the key raised
//                   overhead in both hands, the stance wide), drive (2.5
//                   frames, on the ring's tick: the key driven into the
//                   floor before him, the knees deep), turn (the contact
//                   held, the key turned a quarter), recoil, settle;
//   * the [M] beats (render/facet/beats.js): a spawn-in grow from the floor,
//     named points (the key's `tip` in the hand, the flying key's `hook`,
//     the `hand`, the `lantern`, the `eye`, each foot), and the hit reaction
//     is the shared overlay's (render/react.js), tuned by `react`.
//
// Same interface as the classic (group, mats, setYaw, pose), plus `lab`,
// `points`, `react`. Faces +Z. Render only: it reads the sim entity and never
// writes it; every clip runs off pose's t. The thrown key flies down the
// sim's lane (telegraph.length), as the classic's does.
import { BoxGeometry, CircleGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, TorusGeometry, Vector3 } from 'three';
import { addInk, groundShadow, mix } from '../../critters/common.js';
import { PALETTE, VFX_MATTER } from '../../../data/palette.js';
import { makeGlowSprite } from '../../glow.js';
import { sharedGeo } from '../../geocache.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from '../style.js';
import { facetize, facetMaterial, hash01 } from '../../facet/material.js';
import { PART_INK_PX, instancedPart, mottle, placeRow, wedgeGeometry } from '../../facet/kit.js';
import { lay, limbBox, taperBox } from '../../facet/shapes.js';
import { createLegs } from '../../facet/legs.js';
import { aimSegment, solveTwoBone } from '../../facet/gait.js';
import { createTimeline, ease } from '../../facet/timeline.js';
import { HOLD_SEC, SPAWN_TIMELINE, STRIKE_SEC, createSpawnClock, kick, makePoints, recoil, settle, spawnGrow } from '../../facet/beats.js';

// --- Colour: the classic Lockkeeper's hides (champions2.js C), unchanged.
const slate = (h, l) => new Color().setHSL(0.6, h, l);
const COAT = slate(0.28, 0.2).lerp(new Color(VFX_MATTER.silt), 0.35);
const COAT_DARK = slate(0.3, 0.12);
const SKIN = new Color(PALETTE.bone).lerp(new Color(VFX_MATTER.water), 0.4).multiplyScalar(0.72);
const RUST = new Color(VFX_MATTER.rust).lerp(slate(0.2, 0.3), 0.2);
const RUST_DARK = new Color(VFX_MATTER.rust).multiplyScalar(0.55);
const HAT = slate(0.22, 0.14).lerp(new Color(PALETTE.bruiseUmber), 0.35);
const LANTERN = mix(PALETTE.hearthAmber, VFX_MATTER.water, 0.45);
// the standard's value steps: a lit coat over the shoulders, a dark skin in
// the hollow of the cheeks, a lit rust on the key's bow
const COAT_LIT = COAT.clone().lerp(new Color(PALETTE.bone), 0.12);
const SKIN_DARK = SKIN.clone().multiplyScalar(0.74);
const RUST_LIT = RUST.clone().lerp(new Color(PALETTE.bone), 0.15);
const BOOT = COAT_DARK.clone().multiplyScalar(0.8);

// The hit flash (the enemy layer lifts emissiveIntensity on every mat).
const flashable = (color) => facetMaterial(color, { emissive: '#FFFFFF', emissiveIntensity: 0 });

// --- Body plan (yaw space, faces +Z). The body pivots at the hips.
const HIP_Y = 1.0;
const UPPER = 0.6;
const LOWER = 0.54;
const FOOT_H = 0.07;
// [hip x, home x, home z, gait group]
const LEGS = [
  [-0.15, -0.19, 0.02, 0],
  [0.15, 0.19, -0.02, 1],
];
const ARM_A = 0.48;
const ARM_B = 0.5;
const TORSO_Y = 1.55; // the classic's torso root
const SHOULDER_L = [-0.46, TORSO_Y + 0.72, 0.02];
const SHOULDER_R = [0.46, TORSO_Y + 0.72, 0.02];
// the key (its own space: the bow at the origin, -Y down the shaft to the bit)
const KEY_LEN = 1.25;
const CHAIN_LINKS = 14;
export const KEEPER_WALK = 1.05; // u/s, LK.moveSpeed (sim/enemies/champions.js)
export const LAB_HOOK = 5; // u, the lane the lab's hook flies down

// --- Ability timelines (render only; the sim's numbers: a 58-tick lane, a
// 70-tick ring; the hooked hero is dragged in over 10 ticks).
export const KEEPER_ABILITIES = Object.freeze({
  hook: createTimeline('hook', 'Chain Hook', [
    { id: 'whirl', label: 'whirl the key', dur: 0.75 },
    { id: 'throw', label: 'throw', dur: STRIKE_SEC },
    { id: 'fly', label: 'the key hooks', dur: HOLD_SEC + 0.06 },
    { id: 'reel', label: 'reel in', dur: 0.32 },
    { id: 'settle', label: 'settle', dur: 0.45 },
  ], { cues: [{ at: 0.75 + STRIKE_SEC, id: 'hook' }] }),
  turn: createTimeline('turn', 'Lock Turn', [
    { id: 'lift', label: 'lift the key', dur: 0.85 },
    { id: 'drive', label: 'drive', dur: STRIKE_SEC },
    { id: 'turn', label: 'turned, held', dur: HOLD_SEC + 0.14 },
    { id: 'recoil', label: 'recoil', dur: 0.2 },
    { id: 'settle', label: 'settle', dur: 0.5 },
  ], { cues: [{ at: 0.85 + STRIKE_SEC, id: 'turn' }] }),
  spawn: SPAWN_TIMELINE,
});

// The pose channels (all 0 at rest):
//   whirl  0..1 the key up behind the shoulder   throw  0..1 the arm whipped forward
//   fly    0..1 the key's travel down the lane    haul   0..1 the left arm hauling the chain
//   lift   0..1 the key overhead in both hands    drive  0..1 the key driven into the floor
//   turn   0..1 the key turned a quarter          lean   body pitch, + forward
//   twist  body yaw, + turned away (the right shoulder back)
//   crouch 0..1 the knees bend, the hips sink     step   0..1 the left foot leads
//   brace  0..1 the right foot leads, the left sets back
//   wide   0..1 the feet set apart                squash 0..1 the contact squash (B9)
//   shove  0..1 the recoil (B3)                   fever  0..1 the eye flares
const KEYS = ['whirl', 'throw', 'fly', 'haul', 'lift', 'drive', 'turn', 'lean', 'twist', 'crouch', 'step', 'brace', 'wide', 'squash', 'shove', 'fever'];
function restChannels(C) {
  for (const k of KEYS) C[k] = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;
const ZERO = restChannels({});
const WHIRLED = { ...ZERO, whirl: 1, lean: -0.14, twist: 0.5, crouch: 0.22, brace: 1, wide: 0.3, fever: 1 };
const THROWN = { ...ZERO, throw: 1, fly: 1, lean: 0.34, twist: -0.3, crouch: 0.3, step: 1, wide: 0.2, squash: 1, fever: 1 };
const REELED = { ...ZERO, throw: 0.3, fly: 0, haul: 1, lean: -0.18, twist: 0.15, crouch: 0.26, step: 0.4, wide: 0.2, fever: 0.7 };
const LIFTED = { ...ZERO, lift: 1, lean: -0.22, crouch: 0.12, wide: 1, brace: 0.3, fever: 1 };
const DRIVEN = { ...ZERO, drive: 1, lean: 0.4, crouch: 0.66, step: 0.5, wide: 1, squash: 1, fever: 1 };
const TURNED = { ...DRIVEN, turn: 1 };
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
  if (id === 'hook') {
    if (s.id === 'whirl') mixPose(C, from, WHIRLED, ease.inOut(Math.min(1, k * 1.15)));
    else if (s.id === 'throw') mixPose(C, WHIRLED, THROWN, kick(k)); // B4: off on the press frame
    else if (s.id === 'fly') mixPose(C, THROWN, THROWN, 0);
    else if (s.id === 'reel') {
      mixPose(C, THROWN, REELED, ease.inOut(k));
      C.fly = 1 - ease.in(k);
      C.squash = 0;
      C.shove = recoil(k * 0.32);
    } else {
      mixPose(C, ZERO, REELED, settle(k));
      C.fly = 0;
      C.shove = recoil(0.32 + k * 0.45);
    }
  } else if (id === 'turn') {
    if (s.id === 'lift') mixPose(C, from, LIFTED, ease.inOut(Math.min(1, k * 1.15)));
    else if (s.id === 'drive') mixPose(C, LIFTED, DRIVEN, kick(k));
    else if (s.id === 'turn') mixPose(C, DRIVEN, TURNED, ease.out(Math.min(1, k * 1.6)));
    else if (s.id === 'recoil') {
      mixPose(C, TURNED, TURNED, 0);
      C.squash = 1 - ease.out(k);
      C.shove = recoil(k * 0.2);
    } else {
      mixPose(C, ZERO, TURNED, settle(k));
      C.squash = 0;
      C.shove = recoil(0.2 + k * 0.5);
    }
  }
  return C;
}

// --- The hands' key poses (body space): the key hand [x, y, z, key pitch,
// key yaw] (pitch 0 the bit hanging down, -PI/2 the bit forward) and the
// chain hand [x, y, z].
const KEY_REST = [0.5, 1.42, 0.12, 0.12, 0];
const KEY_WHIRL = [0.56, 2.42, -0.5, -1.35, 0.3];
const KEY_THROW = [0.36, 1.78, 0.78, -Math.PI / 2 + 0.1, 0];
const KEY_REEL = [0.52, 1.6, -0.1, -0.6, 0.2];
const KEY_LIFT = [0.14, 2.86, 0.14, 0.0, 0];
const KEY_DRIVE = [0.16, 1.52, 0.5, -0.08, 0];
const HAND_REST = [-0.5, 1.42, 0.1];
const HAND_WHIRL = [-0.44, 1.72, 0.22];
const HAND_THROW = [-0.4, 1.8, 0.5];
const HAND_HAUL = [-0.62, 1.52, -0.26];
const HAND_LIFT = [-0.14, 2.86, 0.14];
const HAND_DRIVE = [-0.16, 1.52, 0.5];
// the walk's arm swing (u, the hands' z, opposite to the feet)
const SWING = 0.07;

// --- Geometry (shared, faceted once).
const geo = (key, make, seed, jitter = 0.09) => sharedGeo(`facet:keeper-${key}`, () => facetize(make(), { jitter, seed }));
const G = {
  belt: () => geo('belt', () => new CylinderGeometry(0.36, 0.3, 0.2, 8), 401),
  chest: () => geo('chest', () => new CylinderGeometry(0.42, 0.33, 0.8, 8).translate(0, 0.38, 0), 403),
  collar: () => geo('collar', () => new CylinderGeometry(0.3, 0.47, 0.26, 8).translate(0, 0.86, 0), 405),
  panel: (len, seed) => sharedGeo(`facet:keeper-panel-${len}-${seed}`, () => facetize(taperBox(0.3, len, 0.06, 1.15, 1).translate(0, -len / 2, 0), { jitter: 0.1, seed })),
  face: () => geo('face', () => taperBox(0.26, 0.42, 0.26, 0.85, 0.9, 0.03), 407),
  brim: () => geo('brim', () => new CylinderGeometry(0.54, 0.58, 0.05, 12), 409, 0.06),
  crown: () => geo('crown', () => new CylinderGeometry(0.21, 0.28, 0.32, 8).translate(0, 0.16, 0), 411),
  beard: () => geo('beard', () => new CylinderGeometry(0.0, 0.12, 0.3, 5).translate(0, -0.15, 0), 413, 0.12),
  thigh: () => geo('thigh', () => limbBox(0.17, 0.17, UPPER, 0.8, 0.8), 415),
  shin: () => geo('shin', () => limbBox(0.14, 0.14, LOWER, 0.85, 0.85), 417),
  foot: () => geo('foot', () => taperBox(0.17, FOOT_H, 0.36, 0.75, 0.6).translate(0, FOOT_H / 2, 0.06), 419, 0.12),
  upperArm: () => geo('upper-arm', () => limbBox(0.15, 0.15, ARM_A, 0.85, 0.85), 421),
  foreArm: () => geo('fore-arm', () => limbBox(0.13, 0.13, ARM_B, 0.8, 0.8), 423),
  fist: () => geo('fist', () => new IcosahedronGeometry(0.085, 0), 425, 0.1),
  box: () => geo('box', () => new BoxGeometry(0.2, 0.26, 0.2), 427, 0.05),
  bow: () => geo('bow', () => new TorusGeometry(0.22, 0.065, 5, 12), 429, 0.05),
  shaft: () => geo('shaft', () => new CylinderGeometry(0.06, 0.07, KEY_LEN - 0.1, 6).translate(0, -(KEY_LEN - 0.1) / 2 - 0.1, 0), 431),
  kcollar: () => geo('kcollar', () => new CylinderGeometry(0.1, 0.1, 0.08, 8), 433, 0.05),
  bit: () => geo('bit', () => new BoxGeometry(1, 0.1, 0.08).translate(0.5, 0, 0), 435, 0.05),
  link: () => geo('link', () => new TorusGeometry(0.06, 0.016, 3, 8), 477, 0.03),
  button: () => geo('button', () => new IcosahedronGeometry(0.035, 0), 437, 0.1),
  rivet: () => geo('rivet', () => new IcosahedronGeometry(0.028, 0), 439, 0.1),
  eye: () => sharedGeo('keeper-eye', () => new BoxGeometry(0.06, 0.035, 0.02)),
  eye2: () => sharedGeo('keeper-eye2', () => new BoxGeometry(0.06, 0.02, 0.02)),
  buckle: () => sharedGeo('keeper-buckle', () => new BoxGeometry(0.07, 0.1, 0.03)),
  hole: () => sharedGeo('keeper-hole', () => new CircleGeometry(0.12, 10)),
  pane: () => sharedGeo('keeper-pane', () => new BoxGeometry(0.14, 0.18, 0.21)),
};

const _m = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();
const POLE_KNEE = new Vector3(0, 0.05, 1);
const POLE_ELBOW_R = new Vector3(0.7, -0.3, -1);
const POLE_ELBOW_L = new Vector3(-0.7, -0.3, -1);

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

export function buildLockkeeperFacet() {
  const group = new Group();
  group.name = 'lockkeeper';
  group.userData.modelStandard = true;
  const yaw = new Group(); // the root's first child: the hit overlay wraps it
  group.add(yaw);
  const grow = new Group(); // B7 spawn-in scale
  yaw.add(grow);
  const pivot = new Group(); // the body, pivoting at the hips
  pivot.position.set(0, HIP_Y, 0);
  grow.add(pivot);
  const squashG = new Group(); // the contact squash, about the hips
  pivot.add(squashG);
  const torso = new Group(); // body space = the classic rig's space
  torso.position.set(0, -HIP_Y, 0);
  squashG.add(torso);

  const mats = [];
  const track = (m) => (mats.push(m), m);
  const coat = track(flashable(COAT));
  const coatLit = track(flashable(COAT_LIT));
  const coatDark = track(flashable(COAT_DARK));
  const skin = track(flashable(SKIN));
  const skinDark = track(flashable(SKIN_DARK));
  const rust = track(flashable(RUST));
  const rustLit = track(flashable(RUST_LIT));
  const rustDark = track(flashable(RUST_DARK));
  const hatM = track(flashable(HAT));
  const boot = track(flashable(BOOT));
  const inkMat = new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
  const tellMat = new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false });
  const paneMat = new MeshBasicMaterial({ color: new Color(LANTERN), toneMapped: false });
  const mesh = (g, mat, parent, ink = true) => {
    const m = new Mesh(g, mat);
    if (ink) addInk(m);
    if (parent) parent.add(m);
    return m;
  };
  const wedge = wedgeGeometry();

  // --- The coat: a belt at the hip with six panels hung from it, each
  // swinging on its own, torn tails off every hem; the chest and collar above.
  const belt = mesh(G.belt(), coatDark, torso);
  belt.position.y = 1.08;
  const panels = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const g = new Group();
    g.position.set(Math.sin(a) * 0.3, 1.02, Math.cos(a) * 0.28);
    g.rotation.y = a;
    torso.add(g);
    const len = 0.74 + 0.05 * (i % 2);
    const p = new Mesh(G.panel(len, 441 + i), i % 2 ? coatDark : coat);
    addInk(p);
    g.add(p);
    const tails = placeRow(wedge, coatDark, 2, (j, m) => lay(m, j ? 0.09 : -0.08, -len + 0.02, 0.0, j ? 0.2 : -0.15, -1, 0.05, 0.12, 0.2 + 0.06 * j, 0.4), { name: 'keeper-tails', inkPx: PART_INK_PX, mottle: 0.1, seed: 451 + i });
    g.add(tails);
    panels.push({ g, ph: i * 1.1, a, i });
  }
  const chestG = new Group();
  chestG.position.y = TORSO_Y;
  torso.add(chestG);
  mesh(G.chest(), coat, chestG);
  mesh(G.collar(), coatDark, chestG);
  const shoulderLit = placeRow(wedge, coatLit, 6, (i, m) => {
    const a = -1.2 + (i / 5) * 2.4;
    lay(m, Math.sin(a) * 0.38, 0.7, Math.cos(a) * 0.3, Math.sin(a) * 0.4, 1, Math.cos(a) * 0.4, 0.16, 0.14, 0.3, 0.2 * (i % 2));
  }, { name: 'keeper-shoulders', inkPx: PART_INK_PX, mottle: 0.1, seed: 461 });
  chestG.add(shoulderLit);
  const straps = placeRow(wedge, rustDark, 16, (i, m) => {
    const row = i < 8 ? 0 : 1;
    const a = ((i % 8) / 8) * Math.PI * 2 + row * 0.3;
    const r = row ? 0.36 : 0.4;
    lay(m, Math.sin(a) * r, row ? 0.44 : 0.18, Math.cos(a) * r, Math.sin(a), 0, Math.cos(a), 0.18, 0.03, 0.05, Math.PI / 2);
  }, { name: 'keeper-straps', inkPx: PART_INK_PX * 0.8, mottle: 0.08, seed: 463 });
  chestG.add(straps);
  const buttons = placeRow(G.button(), rust, 4, (i, m) => lay(m, 0.04, 0.12 + i * 0.16, 0.39 - i * 0.02, 0, 0, 1, 1, 1, 1), { name: 'keeper-buttons', inkPx: PART_INK_PX, mottle: 0.1, seed: 465 });
  chestG.add(buttons);

  // --- The head: a long boxed face, hollow cheeks, one indigo eye (the ONE
  // tell, also burning in the hat band's keyhole buckle), a beard, and the
  // broad hat with its sagging, torn brim.
  const head = new Group();
  head.position.set(0, 1.0, 0.1);
  chestG.add(head);
  mesh(G.face(), skin, head);
  const cheeks = placeRow(wedge, skinDark, 2, (i, m) => lay(m, i ? 0.1 : -0.1, -0.06, 0.1, i ? 0.3 : -0.3, -1, 0.2, 0.08, 0.16, 0.5), { name: 'keeper-cheeks', inkPx: PART_INK_PX * 0.7, mottle: 0 });
  head.add(cheeks);
  const beard = mesh(G.beard(), coatDark, head);
  beard.position.set(0, -0.18, 0.1);
  const hat = new Group();
  hat.position.y = 0.2;
  head.add(hat);
  const brim = mesh(G.brim(), hatM, hat);
  brim.rotation.x = 0.12;
  const crown = mesh(G.crown(), hatM, hat);
  crown.position.y = 0.01;
  const brimTears = placeRow(wedge, hatM, 7, (i, m) => {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    lay(m, Math.sin(a) * 0.55, -0.02 - 0.12 * Math.cos(a) * 0.1, Math.cos(a) * 0.55, Math.sin(a), -0.35, Math.cos(a), 0.12, 0.12 + 0.05 * hash01(i, 5), 0.3, 0.4);
  }, { name: 'keeper-brim', inkPx: PART_INK_PX, mottle: 0.1, seed: 467 });
  hat.add(brimTears);
  const band = placeRow(wedge, rustDark, 8, (i, m) => {
    const a = (i / 8) * Math.PI * 2;
    lay(m, Math.sin(a) * 0.26, 0.08, Math.cos(a) * 0.26, Math.sin(a), 0, Math.cos(a), 0.14, 0.03, 0.06, Math.PI / 2);
  }, { name: 'keeper-band', inkPx: PART_INK_PX * 0.8, mottle: 0.06, seed: 469 });
  hat.add(band);
  const eye = new Mesh(G.eye(), tellMat);
  eye.position.set(0.06, 0.04, 0.135);
  head.add(eye);
  const eye2 = new Mesh(G.eye2(), inkMat);
  eye2.position.set(-0.06, 0.04, 0.135);
  head.add(eye2);
  const eyeGlow = tellGlow(0.42, 0.3);
  eyeGlow.position.set(0.06, 0.04, 0.17);
  head.add(eyeGlow);
  const buckle = new Mesh(G.buckle(), tellMat);
  buckle.position.set(0, 0.07, 0.27);
  hat.add(buckle);
  const buckleGlow = tellGlow(0.5, 0.3);
  buckleGlow.position.set(0, 0.1, 0.3);
  hat.add(buckleGlow);

  // --- The lantern at the left hip: a riveted lock-box with a pale flame.
  const lantern = new Group();
  lantern.position.set(-0.5, 1.15, 0.18);
  torso.add(lantern);
  mesh(G.box(), rustDark, lantern);
  const pane = new Mesh(G.pane(), paneMat);
  lantern.add(pane);
  const lanternRivets = placeRow(G.rivet(), rust, 4, (i, m) => lay(m, i % 2 ? 0.1 : -0.1, i < 2 ? 0.13 : -0.13, 0.1, 0, 0, 1, 1, 1, 1), { name: 'keeper-lantern-rivets', inkPx: PART_INK_PX, mottle: 0.1, seed: 471 });
  lantern.add(lanternRivets);
  const flame = softGlow(LANTERN, 0.9, 0.5);
  lantern.add(flame);

  // --- Arms: upper arm and forearm reaching the hands by IK.
  const arms = [SHOULDER_L, SHOULDER_R].map((sh, i) => {
    const upper = new Group();
    mesh(G.upperArm(), coat, upper);
    const fore = new Group();
    mesh(G.foreArm(), coatDark, fore);
    const fist = mesh(G.fist(), skin, torso);
    torso.add(upper, fore);
    return { side: i ? 1 : -1, shoulder: new Vector3(...sh), elbow: new Vector3(), hand: new Vector3(), upper, fore, fist, pole: i ? POLE_ELBOW_R : POLE_ELBOW_L };
  });

  // --- The key: a faceted bow with the indigo hole, a collared shaft, three
  // bits, a dim glow at the bit. One in the hand; on the hook a second copy
  // flies down the lane (in yaw space) while the hand's copy hides.
  function buildKey() {
    const g = new Group();
    mesh(G.bow(), rustLit, g);
    const hole = new Mesh(G.hole(), tellMat);
    g.add(hole);
    mesh(G.shaft(), rust, g);
    const kc = mesh(G.kcollar(), rustDark, g);
    kc.position.y = -0.34;
    const bits = placeRow(G.bit(), rust, 3, (i, m) => {
      const [y, w] = [[-KEY_LEN + 0.05, 0.34], [-KEY_LEN - 0.07, 0.24], [-KEY_LEN + 0.17, 0.16]][i];
      lay(m, 0, y, 0, 1, 0, 0, w, 1, 1);
    }, { name: 'keeper-bits', inkPx: PART_INK_PX, mottle: 0.08, seed: 473 });
    g.add(bits);
    const glow = softGlow(PALETTE.emberDanger, 0.9, 0);
    glow.position.y = -KEY_LEN;
    g.add(glow);
    return { g, glow };
  }
  const handKey = buildKey();
  const key = handKey.g;
  torso.add(key);
  const thrownKey = buildKey();
  thrownKey.g.visible = false;
  grow.add(thrownKey.g);
  // the chain: links laid link by link from the left hand to the key's bow
  const links = instancedPart(G.link(), rustDark, CHAIN_LINKS, { name: 'keeper-chain', inkPx: PART_INK_PX * 0.7, moving: true });
  mottle(links, 0.08, 475);
  grow.add(links);

  // --- Legs: thigh and shin reaching the locked boots by IK.
  const legs = LEGS.map(([hx, fx, fz, grp], i) => {
    const upper = new Group();
    mesh(G.thigh(), coatDark, upper);
    const lower = new Group();
    mesh(G.shin(), boot, lower);
    const foot = new Group();
    mesh(G.foot(), boot, foot);
    grow.add(upper, lower, foot);
    return { i, hipLocal: new Vector3(hx, HIP_Y, 0), home: [fx, fz], group: grp, upper, lower, foot, a: UPPER, b: LOWER, pole: POLE_KNEE, footH: FOOT_H * 0.8, hip: null };
  });

  // --- Ground: the contact shadow, a root child (never under the hit
  // overlay's node, so it stays on the floor).
  const shadow = groundShadow(0.75, 0.82);
  group.add(shadow);

  // --- Named points (B8) and the shared overlay's tuning (§6.1 item 9: a
  // champion takes half the squash and flinch and keeps a small hop).
  const points = makePoints({
    tip: [key, 0, -KEY_LEN, 0],
    hook: [thrownKey.g, 0, -KEY_LEN, 0],
    hand: [key, 0, 0, 0],
    lantern: [lantern, 0, 0, 0.1],
    eye: [head, 0.06, 0.04, 0.16],
  });
  const footPts = legs.map((L) => {
    const name = L.i ? 'footR' : 'footL';
    const p = makePoints({ [name]: [grow, 0, 0, 0] })[name];
    points[name] = p;
    return p;
  });
  const react = { squash: 1, flinch: 1, knock: 1, axis: 'y', midY: 1.45 };

  // --- Locked feet.
  pivot.updateMatrix();
  squashG.updateMatrix();
  torso.updateMatrix();
  const hipOf = (L, out) => out.copy(L.hipLocal).applyMatrix4(_m.makeTranslation(0, -HIP_Y, 0)).applyMatrix4(pivot.matrix);
  for (const L of legs) L.hip = (out) => hipOf(L, out);
  const legRig = createLegs({ legs, gait: { trigger: 0.32, lift: 0.2, minDur: 0.14, maxDur: 0.36, durPerSpeed: 0.03, lead: 0.6, flight: 3.4 } });
  const { gait } = legRig;
  const C = restChannels({});
  // stance: the left foot leads on a throw or a drive, the right on a whirl
  const stance = (i, out) => {
    const side = i ? 1 : -1;
    out.z += i ? -0.16 * C.step + 0.3 * C.brace : 0.36 * C.step - 0.2 * C.brace;
    out.x += side * 0.14 * C.wide;
    return out;
  };

  // --- Live state.
  const spawn = createSpawnClock();
  let lastT = null;
  let lastX = 0;
  let lastZ = 0;
  let lastId = null;
  let idle = 0;
  let ab = null; // { id, t }
  let telKey = null;
  let telAge = 0;
  let teleSpan = 0.75;
  let from = { ...ZERO };
  let replantPending = false;
  let reach = LAB_HOOK; // the lane the key flies down
  let spin = 0;
  const lv = new Vector3();
  let leanF = 0;
  let leanS = 0;
  let walkPh = 0;

  function reset() {
    lastT = null;
    ab = null;
    telKey = null;
    from = { ...ZERO };
    spawn.clear();
  }
  // a new ability starts out of this frame's pose (its contact beats spent)
  function begin(id) {
    from = { ...C, squash: 0, shove: 0, fly: 0 };
    ab = { id, t: 0 };
  }
  const strikeOf = (id) => KEEPER_ABILITIES[id].startOf(id === 'hook' ? 'throw' : 'drive');

  // In game: the sim's warning IS the wind-up (B1), stretched over the
  // telegraph and ending one strike before it resolves, so the throw and the
  // drive land on the sim's tick. On a slow frame the strike may run ahead
  // of the resolve, but the contact holds until the warning is gone.
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const move = tel ? tel.move : null;
    const id = move === 'chain_hook' ? 'hook' : move === 'lock_turn' ? 'turn' : null;
    const key = id ? `${move}:${tel.startTick}` : null;
    if (key && key !== telKey) {
      telKey = key;
      telAge = 0;
      const W = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 1;
      teleSpan = Math.max(0.05, W - STRIKE_SEC);
      if (id === 'hook') reach = tel.length ?? reach;
      begin(id);
    } else if (!key && telKey) {
      telKey = null;
      // the warning resolved: on to the strike if the wind-up is still going
      if (ab && ab.t < strikeOf(ab.id)) ab.t = strikeOf(ab.id);
    }
    if (!ab) return restChannels(C);
    const tl = KEEPER_ABILITIES[ab.id];
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
  // a held contact: the throw, the hook and the drive are taken on planted feet
  function holding() {
    if (!ab) return false;
    const ph = KEEPER_ABILITIES[ab.id].sample(ab.t).id;
    return ph === 'throw' || ph === 'fly' || ph === 'drive' || ph === 'turn';
  }

  const keyPose = (out) => {
    const w = [C.whirl, C.throw, C.haul, C.lift, C.drive];
    const P = [KEY_WHIRL, KEY_THROW, KEY_REEL, KEY_LIFT, KEY_DRIVE];
    let sum = Math.max(0, 1 - w.reduce((s, v) => s + v, 0));
    for (let j = 0; j < 5; j++) out[j] = KEY_REST[j] * sum;
    for (let i = 0; i < 5; i++) {
      sum += w[i];
      for (let j = 0; j < 5; j++) out[j] += P[i][j] * w[i];
    }
    for (let j = 0; j < 5; j++) out[j] /= sum || 1;
    return out;
  };
  const handPose = (out) => {
    const w = [C.whirl, C.throw, C.haul, C.lift, C.drive];
    const P = [HAND_WHIRL, HAND_THROW, HAND_HAUL, HAND_LIFT, HAND_DRIVE];
    let sum = Math.max(0, 1 - w.reduce((s, v) => s + v, 0));
    for (let j = 0; j < 3; j++) out[j] = HAND_REST[j] * sum;
    for (let i = 0; i < 5; i++) {
      sum += w[i];
      for (let j = 0; j < 3; j++) out[j] += P[i][j] * w[i];
    }
    for (let j = 0; j < 3; j++) out[j] /= sum || 1;
    return out;
  };
  const kp = [0, 0, 0, 0, 0];
  const hp = [0, 0, 0];

  // Lay the body, the arms, the key, the chain and the legs for this frame.
  function apply(dt, { locked, hold = false, rage = 0 }) {
    // the walk: a slow loping stride, the coat swinging, leaning into the travel
    gait.localVelocity(yaw, lv);
    const speed = Math.hypot(lv.x, lv.z);
    const sp = Math.min(1.6, speed / KEEPER_WALK);
    const k = 1 - Math.exp(-8 * dt);
    leanF += ((sp > 0.05 ? Math.min(0.1, (lv.z / KEEPER_WALK) * 0.05) : 0) - leanF) * k;
    leanS += ((sp > 0.05 ? (-lv.x / KEEPER_WALK) * 0.03 : 0) - leanS) * k;
    walkPh += speed * dt * 2.2;
    const wound = Math.min(1, C.whirl + C.throw + C.haul + C.lift + C.drive);
    const walkK = Math.min(1, sp) * (1 - wound);
    const bobY = 0.04 * gait.bob * Math.min(1, sp);
    const breathe = 0.01 * Math.sin(idle * 2.2);
    pivot.position.set(0, HIP_Y + breathe + bobY - 0.22 * C.crouch, -0.1 * C.shove);
    pivot.rotation.set(0.28 + C.lean + leanF - 0.12 * C.shove, 0.05 * Math.sin(walkPh) * walkK - C.twist, leanS + 0.05 * Math.sin(walkPh) * walkK);
    // the contact squash kept to a champion's size: +11% wide, -5% tall
    squashG.scale.set(1 + 0.11 * C.squash, 1 - 0.05 * C.squash, 1 + 0.04 * C.squash);
    head.rotation.set(-0.15 * C.lift + 0.1 * C.drive - 0.1 * C.whirl + 0.12 * Math.sin(idle * 0.7), 0.06 * Math.sin(idle * 0.5) * (1 - C.fever) + 0.3 * C.twist, 0.05 * C.whirl);
    hat.rotation.set(0.04 * Math.sin(idle * 0.7) + 0.08 * C.drive, 0, 0.02 * Math.sin(idle * 0.9));
    // the coat: the panels sway with the stride, lift with the lean and
    // stream back off a throw
    for (const p of panels) {
      const fwd = Math.cos(p.a);
      p.g.rotation.x = 0.06 + 0.12 * Math.sin(walkPh * 2 + p.ph) * Math.min(1, sp) + 0.05 * Math.sin(idle * 2.6 + p.ph) + 0.35 * Math.max(0, C.lean) * fwd + 0.25 * C.shove * fwd + 0.3 * C.crouch * Math.abs(fwd);
      p.g.rotation.z = 0.04 * Math.sin(idle * 1.7 + p.ph) + 0.08 * Math.sin(walkPh + p.ph) * Math.min(1, sp);
    }
    lantern.rotation.z = 0.25 * Math.sin(idle * 1.9 + walkPh * 0.5) + 0.2 * C.shove;
    pivot.updateMatrix();
    squashG.updateMatrix();

    // the key hand and the key
    keyPose(kp);
    handPose(hp);
    const swing = SWING * Math.sin(walkPh) * walkK;
    const R = arms[1];
    R.hand.set(kp[0], kp[1], kp[2] - swing);
    const L = arms[0];
    L.hand.set(hp[0], hp[1], hp[2] + swing);
    spin += dt * (14 * C.whirl + 9 * C.fly);
    key.position.copy(R.hand);
    // the whirl swings the key round on its chain about the hand
    key.rotation.set(kp[3] + 0.05 * Math.sin(walkPh) * walkK + 0.9 * C.whirl * Math.sin(spin), kp[4] + (Math.PI / 2) * C.turn, 0.08 * Math.sin(idle * 1.3) * (1 - wound));
    // thrown: the hand's key hides and its copy flies down the lane at chest
    // height, bit first, then reels back
    const fly = C.fly;
    key.visible = fly < 0.05;
    thrownKey.g.visible = fly >= 0.05;
    thrownKey.g.position.set(0.35, 1.45 - 0.55 * fly, 0.6 + fly * Math.max(1, reach - 0.8));
    thrownKey.g.rotation.set(-Math.PI / 2, 0, spin);
    thrownKey.glow.material.opacity = 0.9 * fly;
    handKey.glow.material.opacity = Math.min(0.85, 0.55 * C.whirl + 0.6 * C.lift + 0.8 * C.drive);
    for (const A of arms) {
      solveTwoBone(A.shoulder, A.hand, ARM_A, ARM_B, A.pole, A.elbow);
      aimSegment(A.upper, A.shoulder, A.elbow);
      _b.subVectors(A.hand, A.elbow);
      _c.copy(A.elbow).addScaledVector(_b.normalize(), Math.min(ARM_B, A.hand.distanceTo(A.elbow)));
      aimSegment(A.fore, A.elbow, _c);
      A.fist.position.copy(_c);
    }
    // the chain: a sagging line from the left hand to the live key's bow,
    // laid in yaw space (grow) so it swings with the body
    torso.updateMatrixWorld(true);
    const live = fly >= 0.05 ? thrownKey.g : key;
    live.updateMatrixWorld(true);
    grow.updateWorldMatrix(true, false);
    torso.localToWorld(_a.copy(arms[0].fist.position));
    grow.worldToLocal(_a);
    live.localToWorld(_b.set(0, 0.2, 0));
    grow.worldToLocal(_b);
    const sag = 0.35 * (1 - fly) + 0.05;
    _d.subVectors(_b, _a);
    for (let i = 0; i < CHAIN_LINKS; i++) {
      const u = (i + 0.5) / CHAIN_LINKS;
      const u1 = (i + 1) / CHAIN_LINKS;
      _c.set(_a.x + _d.x * u, _a.y + _d.y * u - sag * Math.sin(Math.PI * u), _a.z + _d.z * u);
      // the link lies along the chord, turned a quarter every other link
      lay(_m, _c.x, _c.y, _c.z, _d.x, _d.y - sag * Math.PI * Math.cos(Math.PI * u1) * 0.3, _d.z, 1, 1, 1, i % 2 ? Math.PI / 2 : 0);
      links.setMatrixAt(i, _m);
    }
    links.instanceMatrix.needsUpdate = true;

    // the feet
    legRig.update(dt, { space: yaw, stance, locked, hold });
    for (const Lg of legs) {
      const S = legRig.state[Lg.i];
      // a lifted foot tips its toes down
      Lg.foot.rotation.set(0.5 * S.up, 0, 0);
      footPts[Lg.i].position.copy(Lg.foot.position);
    }

    // the tell: the eye and the buckle breathe, flare with the wind-up,
    // burn in rage; the lantern gutters
    const tell = Math.min(0.85, 0.28 + 0.06 * Math.sin(idle * 2.2) + 0.35 * C.fever + (rage ? 0.22 + 0.12 * Math.sin(idle * 9) : 0));
    eyeGlow.material.opacity = tell;
    buckleGlow.material.opacity = tell;
    flame.material.opacity = 0.4 + 0.12 * Math.sin(idle * 6.1) + 0.12 * Math.sin(idle * 9.7);
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
      // a new champion (or a rewound clock) spawns in; a jump in place only
      // re-plants the feet
      const born = lastT === null || t < lastT || (e && id !== lastId);
      const fresh = born || Math.hypot(group.position.x - lastX, group.position.z - lastZ) > 2.5;
      if (fresh) {
        reset();
        if (born && e && !turntable) spawn.restart(t);
      }
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      lastX = group.position.x;
      lastZ = group.position.z;
      lastId = id;
      idle += dt;
      if (e || turntable) drive(dt, e);
      const g = turntable ? 1 : spawn.scale(t);
      grow.scale.setScalar(g);
      apply(dt, { locked: !turntable && g === 1 && !!e, hold: holding(), rage: e && e.rage ? 1 : 0 });
    },
    // The model lab: pose an ability at any time (play, scrub, rewind) while
    // the lab walks the rig along its path. The channels are pure in abT.
    lab: {
      abilities: KEEPER_ABILITIES,
      // the feet re-plant on the next pose's stance, once its channels are set
      reset() {
        reset();
        reach = LAB_HOOK;
        replantPending = true;
      },
      feet: () => gait.report(yaw),
      grow: () => grow.scale.x,
      channels: () => ({ ...C }),
      gait,
      legs: legRig, // probes: where each leg's IK reached
      arms, // probes: where each hand reached
      parts: { pivot, chest: chestG, head, hat, key, thrownKey: thrownKey.g, links, lantern, legs, panels },
      reach: () => reach,
      pose({ dt, ability = null, abT = 0, rigid = false }) {
        if (lastT === null) lastT = 0;
        idle += dt;
        if (ability && ability !== 'spawn') abilityChannels(ability, KEEPER_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        const g = ability === 'spawn' ? spawnGrow(abT) : 1;
        grow.scale.setScalar(g);
        if (replantPending) {
          replantPending = false;
          pivot.updateMatrix();
          gait.reset(yaw, stance);
        }
        apply(dt, { locked: !rigid && g === 1, hold: holding() });
      },
    },
  };
}
