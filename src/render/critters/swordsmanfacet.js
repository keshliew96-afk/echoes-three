// SWORDSMAN, MODEL STANDARD (docs/MODEL_STANDARD.md). The chibi fox of
// swordsman.js (BUILD_BRIEF §19.2) in the faceted look, laid ON TOP of him:
// the same narrow forward-leaning wedge with its rest lean, the same long
// sharp snout and big pointed ears with dark tips, the same white-tipped
// brush sweeping back and up, the same plum-wine tunic (authored toward plum
// so tone mapping never pushes it into Ember), the same painted face and
// cheeks, and the sword as one clean diagonal line off the roundness. What
// changes:
//
//   * every mass is faceted (render/facet/material.js): a nine-sided tunic
//     with a ridge down the chest, a low-poly skull, five-sided ears, a six-
//     sided snout, a faceted brush with its russet-to-Bone steps per plane;
//   * detail from the parts kit (render/facet/kit.js): a lamellar skirt of
//     ridged plates, a baldric with pewter buckles, a three-plate pauldron
//     on the sword shoulder, a short scarf with notched tails, a cheek ruff
//     and fur tufts down the brush, the blade's crossguard quillons; the
//     blade itself is a hexagonal section with a dark fuller on each flat;
//   * a THREE-HIT SWORD COMBO on the basic attack (Kesh's animation
//     template), at the fastest cadence in the party (0.35 s): a forehand
//     slash right to left, a rising backhand low left to high right, then
//     the finisher, a leaping two-handed downward cut that lands in a lunge.
//     Each hit's overshoot and settle IS the next hit's wind-up, the hips
//     lead and the blade trails a frame behind;
//   * six ability timelines for his eleven skills: Lunge Strike (the dashing
//     thrusts), Flurry, Crescent Cut, Blade Storm (a spinning hop), Caltrops
//     (flung off the off paw) and Edge Draw (the auras);
//   * LOCKED FEET on the hero core (render/facet/hero.js): planted feet stay
//     pinned to the floor, step along the travel, the sword-side foot steps
//     into each lunge, and a hop or a dash lifts both;
//   * the blade keeps its broad face to the game camera about its own axis
//     (the classic's round-3 F2 lesson: a flat blade seen edge-on is three
//     pixels of nothing), and the classic's swing smear (makeSwingSmear) is
//     laid in the plane the blade actually swept, trailing it.
//
// Same contract as buildSwordsman (apply, torso, head, basePitch, metrics),
// plus `cue(kind, ev)`, `hold(dt)`, `comboHitOf(ev)`, `points` and `lab`.
// Render only: attack timing, damage and the sim are untouched.
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  NormalBlending,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { CLASS_ACCENTS, PALETTE, VFX_SIGNATURE } from '../../data/palette.js';
import { CAMERA } from '../../core/constants.js';
import { addInk, brushProfile, exactHex, faceDecal, faceMarkings, makeSwingSmear, mix } from './common.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial, hash01 } from '../facet/material.js';
import { placeRow, plateGeometry, setTRS, wedgeGeometry } from '../facet/kit.js';
import { ease } from '../facet/timeline.js';
import {
  aimLimb as aimArm,
  createAttackClock,
  createCombo,
  createComboLab,
  createFootLock,
  createMove,
  FALL_ANGLE,
  facetArm,
  fpart,
  FRAME,
  HIT_TIMING,
  LAG,
  LEAD,
  LUNGE_PITCH_MAX,
  namedPoint,
  posePack,
  RECOIL,
  walkBody,
} from '../facet/hero.js';

// The classic fox's measures (swordsman.js), unchanged.
const HIP = 0.155;
const HEM = 0.022;
const HEAD_C = 0.659;
const HEAD_R = 0.238;
const SX = 0.95, SY = 0.97, SZ = 1.03;
const EAR_TOP = 1.11;
// The rest lean (rad): the party's only asymmetric stance. The critter
// factory adds it to the driver's clips; an attack sets the torso itself and
// its stance pose carries the same lean, so the hand-off never pops.
const LEAN = 0.12;
// The critter factory's 12° ceiling for the walk and idle (critters/index.js).
const WALK_PITCH_MAX = 0.21;
const TUNIC = [
  [0, HEM],
  [0.155, HEM],
  [0.2, 0.04],
  [0.215, 0.12],
  [0.205, 0.22],
  [0.185, 0.3],
  [0.15, 0.375],
  [0.105, 0.44],
  [0.085, 0.468],
  [0, 0.48],
];
function tunicR(y) {
  for (let i = 1; i < TUNIC.length; i++) {
    if (y <= TUNIC[i][1]) {
      const [r0, y0] = TUNIC[i - 1];
      const [r1, y1] = TUNIC[i];
      return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
    }
  }
  return 0;
}

// The sword, built about the grip (the hand is its pivot): the blade runs
// up its local +Y from the guard, its broad faces in the local XY plane.
const GUARD_Y = 0.068;
const BLADE_Y = 0.078;
const BLADE_L = 0.5;
const TIP_Y = BLADE_Y + BLADE_L;

// ALLY_CLASSES.swordsman.moveSpeed (u/s): full walk lean at full speed
const WALK_SPEED = 2.65;
// Basic attack: a swing inside this window of the last one is the next hit.
// The fox swings every 0.35 s (ALLY_CLASSES.swordsman.attackIntervalTicks,
// 21 ticks: the fastest hero), so the window is two swings.
export const COMBO_WINDOW = 0.7;
// Frame timing at 30 fps. A chained hit plays from its strike, so strike +
// overshoot + settle must land inside the 0.35 s cadence: 2 + 2 + 4 frames
// (0.27 s) for the two cuts, 3 + 2 + 4 (0.3 s) for the leaping finisher.
const T_CUT = Object.freeze({ ...HIT_TIMING, wind: 1.5 * FRAME, strike: 2 * FRAME, over: 2 * FRAME, settle: 4 * FRAME, recover: 0.3 });
const T_FINISH = Object.freeze({ ...T_CUT, strike: 3 * FRAME });

// --- Key poses (body space). The body fields are the hero core's (yaw,
// pitch, roll: torso; rx, ry, rz: the root's weight shift; sw, sh: squash;
// hop; step: the sword-side foot's lunge; air: both feet up). The sword:
// hx, hy, hz the hand (the grip, the sword's pivot); ba the blade's azimuth
// (0 ahead, +PI/2 the sword side, -PI/2 across the body), be its elevation
// (0 level, PI/2 straight up; past PI/2 it tips back over the head); paw
// 0..1 the off paw on the grip; ox, oy, oz the off paw when free.
const PACK = posePack({ pitch: LEAN, hx: 0.29, hy: 0.27, hz: 0.1, ba: 1.88, be: 0.89, paw: 0, ox: -0.26, oy: 0.23, oz: 0.17 });
const { REST, K } = PACK;
// Each wind-up pulls the weight back (rz < 0) and sits up out of the rest
// lean; each contact lunges past rest (rz > 0), leans 20-25° into the target
// and holds the B9 squash (+19% wide, -10% tall) through the hitstop; the
// overshoot snaps it back in 2 frames.
//
// Hit 1, FOREHAND SLASH, right to left, level: the hips unwind from the
// sword side and the blade sweeps flat across the front (its broad face up
// to a camera above), past the target and out to the left.
const A1 = K({ yaw: 0.6, pitch: 0.02, roll: 0.03, rx: 0.03, rz: -0.05, sw: 1.04, sh: 0.97, hx: 0.31, hy: 0.33, hz: -0.08, ba: 2.3, be: 0.22, ox: -0.24, oy: 0.31, oz: 0.2 });
const S1 = K({ yaw: -0.45, pitch: 0.38, roll: -0.04, rx: -0.03, rz: 0.09, sw: 1.19, sh: 0.9, hx: 0.14, hy: 0.27, hz: 0.33, ba: 0.3, be: 0.06, ox: -0.25, oy: 0.28, oz: 0.0 });
const O1 = K({ yaw: -0.65, pitch: 0.24, roll: -0.05, rx: -0.04, rz: 0.07, sw: 1.03, sh: 0.98, hx: 0.0, hy: 0.31, hz: 0.24, ba: -0.8, be: 0.0, ox: -0.27, oy: 0.28, oz: -0.04 });
// Hit 2, RISING BACKHAND, low left to high right: the blade drops low on
// the far side as hit 1 settles, then the legs drive the body up and the
// hips turn back as it rises across the front.
const A2 = K({ yaw: -0.5, pitch: 0.06, roll: -0.03, rx: -0.02, ry: -0.03, rz: -0.04, sw: 1.06, sh: 0.95, hx: 0.04, hy: 0.2, hz: 0.2, ba: -1.1, be: -0.5, ox: -0.26, oy: 0.3, oz: 0.02 });
const S2 = K({ yaw: 0.3, pitch: 0.37, roll: 0.04, rx: 0.02, ry: 0.02, rz: 0.08, sw: 1.19, sh: 0.91, hx: 0.2, hy: 0.4, hz: 0.27, ba: 0.1, be: 0.4, ox: -0.27, oy: 0.26, oz: 0.06 });
const O2 = K({ yaw: 0.5, pitch: 0.18, roll: 0.05, rx: 0.03, ry: 0.03, rz: 0.05, sw: 1.0, sh: 1.03, hx: 0.28, hy: 0.5, hz: 0.16, ba: 0.75, be: 0.95, ox: -0.26, oy: 0.28, oz: 0.1 });
// Hit 3, LEAPING CUT (the finisher, the biggest: B6): as hit 2 settles the
// body crouches with the blade cocked up and back beside the head (the
// chibi head fills the space over the shoulders, so the hand stays on the
// sword side of it), the off paw points the way; it springs (the hop is the
// strike's own arc, `leap` below), the off paw takes the grip on the way
// down, and it lands on the contact in the deepest lunge and squash, the
// sword-side foot stepped in and the blade cutting down across the front
// (over the top: be passes PI/2).
const A3 = K({ yaw: 0.2, pitch: -0.1, roll: 0.04, ry: -0.05, rz: -0.06, sw: 1.08, sh: 0.9, hx: 0.3, hy: 0.47, hz: -0.02, ba: -0.64, be: 2.14, ox: -0.2, oy: 0.36, oz: 0.26 });
const S3 = K({ yaw: -0.08, pitch: 0.44, roll: -0.03, ry: -0.07, rz: 0.16, sw: 1.19, sh: 0.86, step: 1, paw: 1, hx: 0.05, hy: 0.26, hz: 0.34, ba: -0.4, be: -0.15 });
const O3 = K({ yaw: -0.12, pitch: 0.32, roll: -0.04, ry: -0.08, rz: 0.15, sw: 1.06, sh: 0.95, step: 1, paw: 0.4, hx: -0.02, hy: 0.25, hz: 0.27, ba: -0.5, be: -0.65, ox: -0.3, oy: 0.3, oz: 0.05 });
// The blade whips: through a blow the sword's fields run ahead of the
// body's ease (fast from the first frame, as a wrist snaps), so the blade
// drawn a frame behind the hips still meets the target on the contact frame
// (on the strike's plain linear run it was only halfway there when the
// hitstop froze it). Zero at both ends of the phase.
const SWORD_FIELDS = ['hx', 'hy', 'hz', 'ba', 'be'];
function whip(keys) {
  return (out, s) => {
    const key = keys[s.id];
    if (!key) return;
    const g = Math.sin((Math.PI / 2) * s.k);
    for (const f of SWORD_FIELDS) out[f] += (key[f] - out[f]) * g;
  };
}
const both = (...fns) => (out, s) => {
  for (const f of fns) f(out, s);
};
// The finisher's leap: an arc over its strike, stretched tall in the air
// (B6), landing on the contact frame. Zero at both ends of the phase, so the
// chain stays continuous.
const LEAP = 0.15;
const leap = (out, s) => {
  if (s.id !== 'strike') return;
  const a = Math.sin(Math.PI * s.k);
  out.hop += LEAP * a;
  out.sh += 0.12 * a;
  out.sw -= 0.06 * a;
};
const HITS = createCombo(
  PACK,
  [
    { label: 'forehand slash', from: A1, strike: S1, over: O1, timing: T_CUT, extra: whip({ strike: S1 }) },
    { label: 'rising backhand', from: A2, strike: S2, over: O2, timing: T_CUT, extra: whip({ strike: S2 }) },
    { label: 'leaping cut', from: A3, strike: S3, over: O3, timing: T_FINISH, extra: both(whip({ strike: S3 }), leap) },
  ],
  { window: COMBO_WINDOW, timing: T_CUT }
);
// (for the probes: the chain and its timelines)
export const SWORDSMAN_HITS = HITS;

// --- The abilities. In game a skill enters its timeline 0.08 s before its
// entry phase (the press is instant, BUILD_BRIEF §6), so the blow lands with
// the sim's hit while the wind-up still shows; the lab plays all of it. Each
// settles into the stance with one small overshoot.
const breathe = (out, s) => {
  if (s.id === 'hold') out.ry += -0.008 * Math.sin(s.k * Math.PI);
};
// Lunge Strike (Lunge Strike, Fox Step, Moonfang): the blade drawn back
// level at the hip, then a straight thrust at full stretch, the sword-side
// foot stepping in (the dashes carry the body; the feet ride it).
const G_LUNGE = K({ yaw: 0.55, pitch: 0.02, rz: -0.07, ry: -0.04, sw: 1.06, sh: 0.93, hx: 0.27, hy: 0.3, hz: -0.1, ba: 0.15, be: 0.08, ox: -0.2, oy: 0.36, oz: 0.26 });
const S_LUNGE = K({ yaw: -0.35, pitch: 0.42, rz: 0.17, ry: -0.06, sw: 1.19, sh: 0.88, step: 1, hx: 0.14, hy: 0.28, hz: 0.36, ba: 0.35, be: 0.02, ox: -0.3, oy: 0.3, oz: -0.1 });
// Flurry: six quick cuts back and forth across the front (the `cuts`
// flourish rides the phase), then a last cut through.
const G_FLURRY = K({ yaw: 0.35, pitch: 0.12, rz: -0.04, ry: -0.02, sw: 1.04, sh: 0.96, hx: 0.26, hy: 0.36, hz: 0.08, ba: 1.2, be: 0.3, ox: -0.24, oy: 0.3, oz: 0.16 });
const F_FLURRY = K({ yaw: 0.0, pitch: 0.36, rz: 0.08, sw: 1.1, sh: 0.93, step: 0.4, hx: 0.16, hy: 0.35, hz: 0.27, ba: 0.25, be: 0.2, ox: -0.27, oy: 0.32, oz: 0.02 });
const S_FLURRY = K({ yaw: -0.45, pitch: 0.42, rz: 0.13, sw: 1.19, sh: 0.9, step: 0.6, hx: 0.08, hy: 0.27, hz: 0.34, ba: -0.35, be: 0.05, ox: -0.3, oy: 0.3, oz: -0.06 });
const cuts = (out, s) => {
  if (s.id === 'flurry') {
    const w = Math.sin(6 * Math.PI * s.k);
    out.ba += 1.1 * w;
    out.be += 0.25 * w;
    out.yaw += 0.22 * w;
    out.hx += 0.05 * w;
    out.sw += 0.05 * Math.abs(w);
    out.sh -= 0.03 * Math.abs(w);
  }
  breathe(out, s);
};
// Crescent Cut (Crescent Finisher, Riposte): low on the sword side, a big
// rising forehand crescent up across the front to high on the far side,
// stretching up into the follow-through.
const G_CRES = K({ yaw: 0.6, pitch: 0.06, rz: -0.06, ry: -0.05, sw: 1.07, sh: 0.92, hx: 0.3, hy: 0.22, hz: -0.05, ba: 2.2, be: -0.45, ox: -0.18, oy: 0.36, oz: 0.27 });
const S_CRES = K({ yaw: -0.45, pitch: 0.4, rz: 0.12, ry: 0.02, sw: 1.19, sh: 0.9, step: 0.7, hx: 0.17, hy: 0.35, hz: 0.33, ba: 0.25, be: 0.45, ox: -0.3, oy: 0.28, oz: -0.04 });
const O_CRES = K({ yaw: -0.7, pitch: 0.24, rz: 0.1, ry: 0.05, sw: 0.97, sh: 1.06, step: 0.7, hx: -0.1, hy: 0.58, hz: 0.36, ba: -1.0, be: 1.05, ox: -0.3, oy: 0.26, oz: -0.06 });
// Blade Storm (Blade Storm, Blade Dance): the blade held out level on the
// sword side, a hop, one full turn in the air (the whole rig turns, feet
// and all: spinAt), and a landing cut.
const G_WHIRL = K({ yaw: 0.75, pitch: 0.06, rz: -0.04, ry: -0.06, sw: 1.08, sh: 0.9, hx: 0.32, hy: 0.33, hz: 0.04, ba: 1.7, be: 0.05, ox: -0.2, oy: 0.34, oz: 0.14 });
const L_WHIRL = K({ yaw: 0.15, pitch: 0.18, ry: 0.02, sw: 0.96, sh: 1.07, hop: 0.07, air: 1, hx: 0.35, hy: 0.36, hz: 0.1, ba: 1.55, be: 0.0, ox: -0.28, oy: 0.4, oz: 0.04 });
const SP_WHIRL = K({ yaw: -0.1, pitch: 0.22, sw: 0.97, sh: 1.05, hop: 0.1, air: 1, hx: 0.35, hy: 0.36, hz: 0.12, ba: 1.45, be: -0.02, ox: -0.3, oy: 0.4, oz: 0.02 });
const LD_WHIRL = K({ yaw: -0.25, pitch: 0.38, rz: 0.08, ry: -0.05, sw: 1.19, sh: 0.88, hx: 0.2, hy: 0.3, hz: 0.3, ba: 0.5, be: -0.2, ox: -0.28, oy: 0.3, oz: 0.0 });
// Caltrops: the off paw dips to the pouch at the hip and flings the
// caltrops ahead, low; the sword swings up and back out of the way.
const G_SCAT = K({ yaw: -0.4, pitch: 0.04, rz: -0.05, ry: -0.03, sw: 1.05, sh: 0.95, hx: 0.28, hy: 0.36, hz: 0.1, ba: 1.5, be: 1.0, ox: -0.2, oy: 0.18, oz: -0.1 });
const S_SCAT = K({ yaw: 0.35, pitch: 0.36, rz: 0.1, sw: 1.12, sh: 0.93, step: 0.5, hx: 0.3, hy: 0.33, hz: -0.04, ba: 2.2, be: 0.55, ox: -0.08, oy: 0.34, oz: 0.32 });
// Edge Draw (Razor Wake, Crimson Edge, the auras): the blade presented level
// across the front, the off paw drawn along its edge from guard to point,
// then flicked up into a salute.
const DRAW_DIR = new Vector3(Math.sin(-1.45) * Math.cos(0.06), Math.sin(0.06), Math.cos(-1.45) * Math.cos(0.06));
const G_DRAW = K({ yaw: -0.15, pitch: 0.06, rz: -0.03, hx: 0.2, hy: 0.38, hz: 0.22, ba: -1.45, be: 0.06, ox: 0.2 + DRAW_DIR.x * 0.12, oy: 0.41 + DRAW_DIR.y * 0.12, oz: 0.25 + DRAW_DIR.z * 0.12 });
const S_DRAW = K({ yaw: -0.25, pitch: 0.12, rz: 0.02, hx: 0.2, hy: 0.38, hz: 0.22, ba: -1.45, be: 0.06, ox: 0.2 + DRAW_DIR.x * 0.5, oy: 0.41 + DRAW_DIR.y * 0.5, oz: 0.25 + DRAW_DIR.z * 0.5 });
const F_DRAW = K({ yaw: 0.12, pitch: 0.14, sw: 0.97, sh: 1.04, hx: 0.24, hy: 0.42, hz: 0.18, ba: 0.25, be: 1.3, ox: -0.25, oy: 0.27, oz: 0.12 });

function moveOf(id, label, keys, opts) {
  const tl = [];
  let t = 0;
  for (const k of keys) {
    tl.push([k.id, t]);
    t += k.dur;
  }
  const at = (pid) => tl.find(([p]) => p === pid)[1];
  const cues = (opts.cueAt || []).map(([pid, cue]) => ({ at: at(pid), id: cue }));
  return createMove(PACK, id, label, keys, { ...opts, cues });
}
export const SWORDSMAN_MOVES = Object.freeze({
  lunge: moveOf(
    'lunge',
    'Lunge Strike',
    [
      { id: 'gather', label: 'draw back', dur: 0.16, to: G_LUNGE, ease: 'out' },
      { id: 'thrust', label: 'thrust', dur: 2 * FRAME, to: S_LUNGE, ease: 'in' },
      { id: 'hold', label: 'held at full stretch', dur: 0.2, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'thrust', recoil: true, extra: both(whip({ thrust: S_LUNGE }), breathe), cueAt: [['hold', 'thrust']] }
  ),
  flurry: moveOf(
    'flurry',
    'Flurry',
    [
      { id: 'gather', label: 'gather', dur: 0.08, to: G_FLURRY, ease: 'out' },
      { id: 'flurry', label: 'six cuts', dur: 0.3, to: F_FLURRY, ease: 'inOut' },
      { id: 'finish', label: 'last cut', dur: 2 * FRAME, to: S_FLURRY, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.12, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.3, to: REST, ease: 'settle' },
    ],
    { contact: 'flurry', entry: 'flurry', recoil: true, extra: both(cuts, whip({ finish: S_FLURRY })), cueAt: [['flurry', 'cuts'], ['hold', 'strike']] }
  ),
  crescent: moveOf(
    'crescent',
    'Crescent Cut',
    [
      { id: 'guard', label: 'low guard', dur: 0.16, to: G_CRES, ease: 'out' },
      { id: 'cut', label: 'rising crescent', dur: 0.08, to: S_CRES, ease: 'in' },
      { id: 'follow', label: 'follow through', dur: 0.1, to: O_CRES, ease: 'out' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'follow', entry: 'cut', recoil: true, extra: whip({ cut: S_CRES }), cueAt: [['follow', 'crescent']] }
  ),
  whirl: moveOf(
    'whirl',
    'Blade Storm',
    [
      { id: 'gather', label: 'blade out', dur: 0.14, to: G_WHIRL, ease: 'out' },
      { id: 'leap', label: 'hop', dur: 0.05, to: L_WHIRL, ease: 'out' },
      { id: 'spin', label: 'full turn', dur: 0.26, to: SP_WHIRL, ease: 'inOut' },
      { id: 'land', label: 'landing cut', dur: 0.07, to: LD_WHIRL, ease: 'in' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'spin', entry: 'leap', recoil: true, extra: whip({ land: LD_WHIRL }), cueAt: [['spin', 'whirl']] }
  ),
  scatter: moveOf(
    'scatter',
    'Caltrops',
    [
      { id: 'reach', label: 'reach to the pouch', dur: 0.14, to: G_SCAT, ease: 'out' },
      { id: 'fling', label: 'fling', dur: 2 * FRAME, to: S_SCAT, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.14, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.3, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'fling', extra: breathe, cueAt: [['hold', 'fling']] }
  ),
  draw: moveOf(
    'draw',
    'Edge Draw',
    [
      { id: 'present', label: 'present the blade', dur: 0.16, to: G_DRAW, ease: 'out' },
      { id: 'draw', label: 'draw the edge', dur: 0.16, to: S_DRAW, ease: 'inOut' },
      { id: 'flourish', label: 'flourish', dur: 0.08, to: F_DRAW, ease: 'out' },
      { id: 'hold', label: 'salute', dur: 0.18, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.3, to: REST, ease: 'settle' },
    ],
    { contact: 'flourish', entry: 'draw', extra: both(whip({ flourish: F_DRAW }), breathe), cueAt: [['flourish', 'edge']] }
  ),
});
const MOVES = SWORDSMAN_MOVES;
// Which ability a Swordsman skill plays: by the skill first (CLASS_SKILLS.
// swordsman, all eleven), then by its shape.
export const SWORDSMAN_SKILL_ABILITY = Object.freeze({
  lunge_strike: 'lunge',
  fox_step: 'lunge',
  moonfang: 'lunge',
  flurry: 'flurry',
  crescent_finisher: 'crescent',
  riposte: 'crescent',
  blade_storm: 'whirl',
  blade_dance: 'whirl',
  caltrops: 'scatter',
  razor_wake: 'draw',
  crimson_edge: 'draw',
});
const SHAPE_ABILITY = Object.freeze({ melee_arc: 'crescent', nova: 'whirl', ground_aoe: 'scatter', aura: 'draw', direct: 'lunge' });
const skillAbility = (ev) => (ev && (SWORDSMAN_SKILL_ABILITY[ev.skill] || SHAPE_ABILITY[ev.shape])) || 'crescent';

// The spin of Blade Storm: the whole rig turns once in the air. Kept out of
// the pose vector (a turn of 2 PI is the same pose as none), read off the
// timeline at the same time as the move.
const WHIRL_TL = MOVES.whirl.timeline;
function spinAt(ability, t) {
  if (ability !== 'whirl') return 0;
  const s = WHIRL_TL.sample(t);
  return s.id === 'spin' ? -2 * Math.PI * ease.inOut(s.k) : 0;
}
const wrapPi = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

// The swing smear: which phases of each move draw it (full, then fading over
// `fade`), and how wide it is (the finisher's the widest).
const SMEAR_OPACITY = 0.5;
// [inner radius, outer radius, the widest arc] of each size; the arc drawn is
// the arc the blade really swept over the last few frames, up to that.
// `over` is the leaping cut's: it comes down over the head, so its band
// starts out along the blade, where it clears the face (a band from the grip
// laid additive light on the pale fur and bloomed over the face).
const SMEAR_SIZE = Object.freeze({ narrow: [0.3, 0.62, 1.2], mid: [0.28, 0.64, 1.8], wide: [0.22, 0.7, 2.6], over: [0.36, 0.72, 2.4] });
const SMEAR_SEG = 24;
const SMEAR = Object.freeze({
  hit1: { on: ['strike'], fade: 'overshoot', size: 'mid' },
  hit2: { on: ['strike'], fade: 'overshoot', size: 'mid' },
  hit3: { on: ['strike'], fade: 'overshoot', size: 'over' },
  lunge: { on: ['thrust'], fade: 'hold', size: 'narrow' },
  flurry: { on: ['flurry', 'finish'], fade: 'hold', size: 'narrow' },
  crescent: { on: ['cut'], fade: 'follow', size: 'wide' },
  whirl: { on: ['spin'], fade: 'land', size: 'wide' },
  scatter: { on: [], fade: null, size: 'mid' },
  draw: { on: ['flourish'], fade: 'hold', size: 'mid' },
});

// Pure: the pose of hit n at time t into it (see tankfacet.js hitPose).
export function hitPose(n, t, capture, fresh, out = PACK.make()) {
  return HITS[n].move.pose(t, capture, out, fresh ? 0 : 1);
}
// Pure: the pose of an ability at time t (from the stance).
export function abilityPose(id, t, out = PACK.make()) {
  return MOVES[id].pose(t, REST, out, 0);
}
export const SWORDSMAN_REST = REST;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
// Make a convex hand-built triangle list face outward (each triangle's flat
// normal away from the axis point at its own height).
function outward(pos) {
  for (let i = 0; i + 8 < pos.length; i += 9) {
    const ax = pos[i], ay = pos[i + 1], az = pos[i + 2];
    const ux = pos[i + 3] - ax, uy = pos[i + 4] - ay, uz = pos[i + 5] - az;
    const vx = pos[i + 6] - ax, vy = pos[i + 7] - ay, vz = pos[i + 8] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    // from the axis point just above the centroid's height (so the base cap
    // faces down)
    const mx = (ax + pos[i + 3] + pos[i + 6]) / 3;
    const my = -0.01;
    const mz = (az + pos[i + 5] + pos[i + 8]) / 3;
    if (nx * mx + ny * my + nz * mz < 0) {
      for (let k = 0; k < 3; k++) {
        const s = pos[i + 3 + k];
        pos[i + 3 + k] = pos[i + 6 + k];
        pos[i + 6 + k] = s;
      }
    }
  }
  return pos;
}
// The blade: a hexagonal section (two broad flats, bevelled to an edge each
// side), nearly parallel edges, then a point. Base at y = 0.
function bladeGeometry() {
  return sharedGeo('facet:fox-blade', () => {
    const w0 = 0.042;
    const w1 = 0.034;
    const th = 0.011;
    const sh = 0.8 * BLADE_L;
    const ring = (w, y) => [
      [w, y, 0],
      [w * 0.42, y, th],
      [-w * 0.42, y, th],
      [-w, y, 0],
      [-w * 0.42, y, -th],
      [w * 0.42, y, -th],
    ];
    const r0 = ring(w0, 0);
    const r1 = ring(w1, sh);
    const tip = [0, BLADE_L, 0];
    const pos = [];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      tri(r0[i], r0[j], r1[j]);
      tri(r0[i], r1[j], r1[i]);
      tri(r1[i], r1[j], tip);
      if (i > 0 && i < 5) tri(r0[0], r0[i], r0[i + 1]);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(outward(pos), 3));
    return facetize(g, { jitter: 0.05, seed: 141 });
  });
}
// The brush, faceted: the classic's swelling tube (brushProfile) with its
// russet-to-Bone gradient, cut into flat planes, each plane one tone (the
// gradient steps ring by ring) with the facet value step on top.
function facetBrush(curve, { radius, colorA, colorB, split, tubular = 12, radial = 7, jitter = 0.08, seed = 151 }) {
  const geo = new TubeGeometry(curve, tubular, radius, radial, false);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cA = new Color(colorA);
  const cB = new Color(colorB);
  const tmp = new Color();
  const centre = new Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, centre);
    const k = brushProfile(t);
    const c = Math.min(1, Math.max(0, (t - split) / (1 - split)));
    tmp.copy(cA).lerp(cB, c * c);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      pos.setXYZ(idx, centre.x + (pos.getX(idx) - centre.x) * k, centre.y + (pos.getY(idx) - centre.y) * k, centre.z + (pos.getZ(idx) - centre.z) * k);
      colors[idx * 3] = tmp.r;
      colors[idx * 3 + 1] = tmp.g;
      colors[idx * 3 + 2] = tmp.b;
    }
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  const g = geo.toNonIndexed();
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  const nor = g.attributes.normal;
  const col = g.attributes.color;
  for (let i = 0; i + 2 < col.count; i += 3) {
    const h = hash01(Math.round(nor.getX(i) * 50), Math.round(nor.getY(i) * 50), Math.round(nor.getZ(i) * 50), seed);
    const v = 1 + jitter * (2 * h - 1);
    for (let c = 0; c < 3; c++) {
      const m = ((col.getComponent(i, c) + col.getComponent(i + 1, c) + col.getComponent(i + 2, c)) / 3) * v;
      for (let j = 0; j < 3; j++) col.setComponent(i + j, c, m);
    }
  }
  g.userData.faceted = true;
  return g;
}

// ---------------------------------------------------------------------------
// The rig
// ---------------------------------------------------------------------------
export function buildSwordsmanFacet(rig, trackAccent) {
  const accent = CLASS_ACCENTS.swordsman;
  const fur = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.28); // the shared party base
  const furHex = fur.getHex();
  const furDarkHex = mix(fur, PALETTE.bruiseUmber, 0.45).getHex();
  const russetHex = mix(fur, PALETTE.bruiseUmber, 0.72).getHex();
  // The tunic a step toward plum, as swordsman.js (ACES turns saturated reds
  // toward orange; authored here it lands in the wine band, never Ember).
  const tunicHex = mix(accent, PALETTE.signalBlue, 0.07).getHex();
  const trimHex = mix(accent, PALETTE.voidCharcoal, 0.25).getHex();
  const leatherHex = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.3).getHex();
  const gripHex = mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.4).getHex();
  // Pewter for every fitting: the parts kit's gold accent sits in the
  // reserved amber family, so it goes cool and grey here (the Wyrm's bands).
  const pewterHex = mix(PALETTE.warmGrey, PALETTE.signalBlue, 0.12).multiplyScalar(0.95).getHex();
  // Moon Silver (the class's second VFX tone), held down toward the ink: its
  // broad flat faces the game camera, which sits within 30° of the key light
  // (stage.js), so a lighter steel lit full-on cleared the bloom threshold
  // and grew a halo REFERENCE_BAR keeps for real emitters.
  const moonSilver = VFX_SIGNATURE.swordsman.second;
  const bladeHex = mix(moonSilver, PALETTE.voidCharcoal, 0.44).getHex();
  const fullerHex = mix(moonSilver, PALETTE.voidCharcoal, 0.55).getHex();
  const earTipHex = mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.35).getHex();
  // Small tufts face up into the key light, where full Bone clears the bloom
  // threshold and sparkles: they take Bone a step toward the fur.
  const tuftHex = mix(PALETTE.bone, PALETTE.warmGrey, 0.28).getHex();
  // The scarf, a step darker than the collar, so it reads over the tunic.
  const scarfHex = mix(accent, PALETTE.voidCharcoal, 0.5).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  const furMat = facetMaterial(furHex);
  const furDarkMat = facetMaterial(furDarkHex);
  const boneMat = facetMaterial(PALETTE.bone);
  const tunicMat = trackAccent(facetMaterial(tunicHex));
  const trimMat = trackAccent(facetMaterial(trimHex));
  const leatherMat = trackAccent(facetMaterial(leatherHex));
  const pewterMat = trackAccent(facetMaterial(pewterHex));
  const gripMat = facetMaterial(gripHex);
  const bladeMat = facetMaterial(bladeHex);
  const fullerMat = facetMaterial(fullerHex);
  const earTipMat = facetMaterial(earTipHex);
  const tuftMat = facetMaterial(tuftHex);
  const scarfMat = trackAccent(facetMaterial(scarfHex));

  // --- The narrow wedge tunic: nine sides, a ridge down the chest.
  const tunicGeo = sharedGeo('facet:fox-tunic', () => facetize(new LatheGeometry(TUNIC.map(([x, y]) => new Vector2(x, y)), 9), { jitter: 0.14, seed: 101 }));
  const tunic = fpart(tunicGeo, tunicMat);
  body.add(tunic);
  // The Bone bib, riding just outside the facets.
  const BIB = [
    [0.207, 0.19],
    [0.195, 0.27],
    [0.17, 0.34],
    [0.13, 0.41],
  ];
  const bibGeo = sharedGeo('facet:fox-bib', () => facetize(new LatheGeometry(BIB.map(([x, y]) => new Vector2(x * 1.035, y)), 3, -0.45, 0.9), { jitter: 0.06, seed: 103 }));
  body.add(new Mesh(bibGeo, boneMat));
  // The belt (the classic's light leather), clear of the tunic's facets.
  const beltGeo = sharedGeo('facet:fox-belt', () => facetize(new CylinderGeometry(0.232, 0.236, 0.05, 10), { jitter: 0.08, seed: 105 }));
  const belt = fpart(beltGeo, leatherMat);
  belt.position.y = 0.165;
  body.add(belt);
  // The collar, tracked (the classic's downed-grey fix).
  const collarGeo = sharedGeo('facet:fox-collar', () => facetize(new CylinderGeometry(0.095, 0.13, 0.07, 8), { jitter: 0.08, seed: 107 }));
  const collar = fpart(collarGeo, trimMat);
  collar.position.y = 0.452;
  body.add(collar);

  // Plates on the tunic surface at angle phi (0 = front) and height y.
  const plate = plateGeometry();
  const wedge = wedgeGeometry();
  const P = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const onTunic = (m, phi, y, out, w, h, l, tilt) => {
    const r = tunicR(y) * out;
    const sx = Math.sin(phi);
    const cz = Math.cos(phi);
    P.set(sx * r, y, cz * r);
    Y.set(sx, 0.25, cz).normalize();
    X.set(cz, 0, -sx).normalize();
    Z.crossVectors(X, Y).normalize();
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const yx = Y.x * c - Z.x * s, yy = Y.y * c - Z.y * s, yz = Y.z * c - Z.z * s;
    Z.set(Z.x * c + Y.x * s, Z.y * c + Y.y * s, Z.z * c + Y.z * s);
    Y.set(yx, yy, yz);
    setTRS(m, P, X, Y, Z, w, h, l);
  };
  // A lamellar skirt: two brick-laid rows of ridged plates round the hem.
  const LAM_ROWS = [0.118, 0.066];
  const LAM_COLS = 12;
  const lamellar = placeRow(plate, trimMat, LAM_ROWS.length * LAM_COLS, (i, m) => {
    const row = Math.floor(i / LAM_COLS);
    const col = i % LAM_COLS;
    const phi = ((col + 0.5 * row) / LAM_COLS) * Math.PI * 2;
    onTunic(m, phi, LAM_ROWS[row], 1.04, 0.112, 0.032, 0.07, 0.28);
  }, { name: 'fox-lamellar', seed: 109 });
  body.add(lamellar);
  // The baldric: a strap of plates from the sword shoulder across the chest
  // to the far hip, with pewter buckles (and one on the belt).
  const strapAt = (s, out) => {
    const phi = 0.78 - 1.72 * s;
    const y = 0.425 - 0.245 * s;
    const r = tunicR(y) * 1.07;
    return out.set(Math.sin(phi) * r, y, Math.cos(phi) * r);
  };
  const BALDRIC = 6;
  const sa = new Vector3();
  const sb = new Vector3();
  const strapFrame = (s) => {
    strapAt(Math.max(0, s - 0.04), sa);
    strapAt(Math.min(1, s + 0.04), sb);
    Z.subVectors(sb, sa).normalize(); // along the strap
    strapAt(s, P);
    Y.set(P.x, 0, P.z).normalize(); // outward
    Y.addScaledVector(Z, -Y.dot(Z)).normalize();
    X.crossVectors(Y, Z).normalize();
  };
  const baldric = placeRow(plate, leatherMat, BALDRIC, (i, m) => {
    strapFrame((i + 0.5) / BALDRIC);
    setTRS(m, P, X, Y, Z, 0.05, 0.026, 0.085);
  }, { name: 'fox-baldric', seed: 111 });
  body.add(baldric);
  const buckles = placeRow(plate, pewterMat, 4, (i, m) => {
    if (i < 3) {
      strapFrame(0.22 + i * 0.28);
      P.addScaledVector(Y, 0.01);
      setTRS(m, P, X, Y, Z, 0.036, 0.03, 0.032);
    } else {
      // the belt buckle, front and centre
      P.set(0, 0.165, 0.236);
      setTRS(m, P, X.set(1, 0, 0), Y.set(0, 0, 1), Z.set(0, -1, 0), 0.06, 0.03, 0.045);
    }
  }, { name: 'fox-buckles', seed: 113 });
  body.add(buckles);
  // A three-plate pauldron on the sword shoulder: the party's fencer reads
  // armed even with the blade lowered.
  const pauldron = placeRow(plate, trimMat, 3, (i, m) => {
    const a = 0.45 + i * 0.38;
    P.set(0.125 + i * 0.032, 0.43 - i * 0.034, 0.06);
    Y.set(Math.sin(a), Math.cos(a), 0);
    Z.set(0, 0, 1);
    X.crossVectors(Y, Z).normalize();
    setTRS(m, P, X, Y, Z, 0.11, 0.05, 0.14 - i * 0.016);
  }, { name: 'fox-pauldron', seed: 115 });
  body.add(pauldron);
  // A short scarf knotted at the nape: two tails, each a notched pair of
  // strands, streaming back (they lift with speed and trail a swing).
  const scarfPivot = new Group();
  scarfPivot.position.set(0, 0.45, -0.075);
  body.add(scarfPivot);
  const scarf = placeRow(wedge, scarfMat, 4, (i, m) => {
    const side = i < 2 ? -1 : 1;
    const strand = i % 2 ? 1 : -1;
    P.set(side * 0.032 + strand * 0.011, 0, 0);
    Y.set(side * 0.33 + strand * 0.09, -0.42, -0.84).normalize();
    X.set(1, 0, 0).addScaledVector(Y, -Y.x).normalize();
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.042, 0.2 - (strand > 0 ? 0.02 : 0), 0.04);
  }, { name: 'fox-scarf', seed: 117 });
  scarfPivot.add(scarf);

  // --- Head, carried forward of the hips by the lean: a low-poly ball, the
  // painted cheeks and face riding just outside its facets.
  const head = new Group();
  head.position.set(0, HEAD_C, 0.035);
  body.add(head);
  const skullGeo = sharedGeo('facet:fox-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 121 }));
  const skull = fpart(skullGeo, furMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  const cheek = exactHex(mix(PALETTE.bone, PALETTE.parchment, 0.35).getHex());
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        ctx.fillStyle = cheek;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(S * (0.5 + side * 0.26), S * 0.72, S * 0.12, S * 0.16, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.83, S * 0.1, S * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    })
  );
  // The long sharp snout (six planes) and the ink nose.
  const snoutGeo = sharedGeo('facet:fox-snout', () => facetize(new ConeGeometry(0.072, 0.17, 6), { jitter: 0.08, seed: 123 }));
  const snout = fpart(snoutGeo, boneMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.062, SZ * HEAD_R * 0.76 + 0.06);
  head.add(snout);
  const noseGeo = sharedGeo('facet:fox-nose', () => facetize(new SphereGeometry(0.022, 6, 4), { jitter: 0.05, seed: 125 }));
  const nose = fpart(noseGeo, facetMaterial(PALETTE.voidCharcoal), false);
  nose.position.set(0, -0.055, SZ * HEAD_R * 0.76 + 0.145);
  head.add(nose);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeH: 0.115, spread: 0.215, drop: 0.53, glint: 0.28 }));
  // The cheek ruff: three Bone tufts a side, below and behind the eyes.
  const ruff = placeRow(wedge, tuftMat, 6, (i, m) => {
    const side = i < 3 ? -1 : 1;
    const j = i % 3;
    const phi = side * (1.18 + j * 0.2);
    const y = -0.06 - j * 0.035;
    P.set(Math.sin(phi) * HEAD_R * SX * 0.82, y, Math.cos(phi) * HEAD_R * SZ * 0.82);
    Y.set(Math.sin(phi) * 0.9, -0.35 - j * 0.12, Math.cos(phi) * 0.5 - 0.35).normalize();
    X.set(0, 0, 1).addScaledVector(Y, -Y.z).normalize();
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.062, 0.1 - j * 0.012, 0.08);
  }, { name: 'fox-ruff', seed: 127, mottle: 0.05 });
  head.add(ruff);
  // Big pointed ears (five planes), dark-tipped, splayed apart.
  const earGeo = sharedGeo('facet:fox-ear', () => facetize(new ConeGeometry(0.082, 0.3, 5), { jitter: 0.1, seed: 129 }));
  const earTipGeo = sharedGeo('facet:fox-ear-tip', () => facetize(new ConeGeometry(0.036, 0.12, 5), { jitter: 0.08, seed: 131 }));
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.142, 0.168, -0.03);
    const ear = fpart(earGeo, furMat);
    ear.position.y = 0.15;
    pivot.add(ear);
    const tip = fpart(earTipGeo, earTipMat);
    tip.position.y = 0.2425;
    pivot.add(tip);
    pivot.rotation.z = side * -0.27;
    pivot.rotation.x = -0.08;
    head.add(pivot);
    ears.push(pivot);
  }

  // --- The brush: the classic's S-curve, back, out, down and hooked up.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.215, -0.07);
  body.add(tailPivot);
  const TAIL_R = 0.115;
  const tailCurve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(-0.16, -0.07, -0.03),
    new Vector3(-0.32, -0.13, -0.06),
    new Vector3(-0.45, -0.125, -0.09),
    new Vector3(-0.55, -0.03, -0.1),
  ]);
  const brushGeo = sharedGeo('facet:fox-brush', () => facetBrush(tailCurve, { radius: TAIL_R, colorA: russetHex, colorB: tuftHex, split: 0.56 }));
  const brushMat = facetMaterial(0xffffff);
  const brush = fpart(brushGeo, brushMat);
  brush.name = 'brush';
  tailPivot.add(brush);
  const capGeo = sharedGeo('facet:fox-brush-cap', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.06, seed: 153 }));
  const cap = fpart(capGeo, tuftMat); // the white tip, in the tufts' cream (full Bone glinted)
  cap.scale.setScalar(TAIL_R * brushProfile(1) * 1.04);
  tailCurve.getPointAt(1, cap.position);
  tailPivot.add(cap);
  // Fur tufts down the brush: russet near the root, Bone at the tip.
  const TUFT_T = [0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.8, 0.88, 0.95];
  const TUFT_A = [0.7, -0.7, 1.9, -1.9, 0.1, 2.7, -1.1, 1.1, 3.0];
  const T = new Vector3();
  const N = new Vector3();
  const B = new Vector3();
  const D = new Vector3();
  const UPV = new Vector3(0, 1, 0);
  const tufts = placeRow(wedge, tuftMat, TUFT_T.length, (i, m) => {
    const t = TUFT_T[i];
    tailCurve.getPointAt(t, P);
    tailCurve.getTangentAt(t, T);
    N.copy(UPV).addScaledVector(T, -UPV.dot(T)).normalize();
    B.crossVectors(T, N);
    D.copy(N).multiplyScalar(Math.cos(TUFT_A[i])).addScaledVector(B, Math.sin(TUFT_A[i]));
    P.addScaledVector(D, TAIL_R * brushProfile(t) * 0.78);
    // laid back along the brush like layered fur, only lifting off it a
    // little (a steeper tuft read as a quill)
    Y.copy(D).multiplyScalar(0.36).addScaledVector(T, 0.93).normalize();
    X.crossVectors(Y, D).normalize();
    Z.crossVectors(X, Y).normalize();
    const s = 1 - (0.3 * Math.max(0, t - 0.75)) / 0.25;
    setTRS(m, P, X, Y, Z, 0.1 * s, 0.11 * s, 0.14 * s);
  }, { name: 'fox-tufts', mottle: 0 });
  {
    const bone = new Color(tuftHex);
    const rus = new Color(russetHex);
    const c = new Color();
    for (let i = 0; i < TUFT_T.length; i++) {
      const k = Math.min(1, Math.max(0, (TUFT_T[i] - 0.6) / 0.18));
      const v = 1 + 0.1 * (2 * hash01(i, 155) - 1);
      c.setRGB((rus.r + (bone.r - rus.r) * k) / bone.r, (rus.g + (bone.g - rus.g) * k) / bone.g, (rus.b + (bone.b - rus.b) * k) / bone.b).multiplyScalar(v);
      tufts.setColorAt(i, c);
    }
    tufts.instanceColor.needsUpdate = true;
  }
  tailPivot.add(tufts);

  // --- The sword, pivoting at the grip.
  const sword = new Group();
  body.add(sword);
  const blade = fpart(bladeGeometry(), bladeMat);
  blade.position.y = BLADE_Y;
  sword.add(blade);
  // the fuller: a dark groove down each flat (inside the ink, unlit by it)
  const fullerGeo = sharedGeo('facet:fox-fuller', () => facetize(new BoxGeometry(0.012, 0.29, 0.004), { jitter: 0.04, seed: 143 }));
  for (const s of [-1, 1]) {
    const f = new Mesh(fullerGeo, fullerMat);
    f.position.set(0, BLADE_Y + 0.035 + 0.145, s * 0.0115);
    sword.add(f);
  }
  const guardGeo = sharedGeo('facet:fox-guard', () => facetize(new BoxGeometry(0.05, 0.026, 0.036), { jitter: 0.08, seed: 145 }));
  const guard = fpart(guardGeo, pewterMat);
  guard.position.y = GUARD_Y;
  sword.add(guard);
  const quillons = placeRow(wedge, pewterMat, 2, (i, m) => {
    const side = i ? 1 : -1;
    P.set(side * 0.02, GUARD_Y, 0);
    Y.set(side, 0.42, 0).normalize();
    Z.set(0, 0, 1);
    X.crossVectors(Y, Z).normalize();
    setTRS(m, P, X, Y, Z, 0.034, 0.075, 0.09);
  }, { name: 'fox-guard', seed: 147 });
  sword.add(quillons);
  const gripGeo = sharedGeo('facet:fox-grip', () => facetize(new CylinderGeometry(0.019, 0.021, 0.13, 6), { jitter: 0.08, seed: 149 }));
  const grip = fpart(gripGeo, gripMat);
  grip.position.y = -0.005;
  sword.add(grip);
  const pommelGeo = sharedGeo('facet:fox-pommel', () => facetize(new OctahedronGeometry(0.03, 0), { jitter: 0.1, seed: 157 }));
  const pommel = fpart(pommelGeo, pewterMat);
  pommel.scale.set(1, 0.9, 1);
  pommel.position.y = -0.085;
  sword.add(pommel);
  const pawGeo = sharedGeo('facet:paw', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 91 }));
  const gripPaw = fpart(pawGeo, furDarkMat);
  gripPaw.scale.setScalar(0.058);
  sword.add(gripPaw);
  // The named points (B8): the hand on the grip and the blade's point.
  const hand = namedPoint(sword, 'hand', 0, 0, 0);
  const tip = namedPoint(sword, 'tip', 0, TIP_Y, 0);

  // The swing smear (the classic's makeSwingSmear, in its Parchment: never
  // Ember, and no lilac that could read as Violet over a dark floor), three
  // widths; each is a band traced by the outer blade, laid in the plane the
  // blade swept, its leading edge on the blade and its tail back along the
  // arc.
  const smear = makeSwingSmear({ segments: SMEAR_SEG });
  smear.frustumCulled = false; // its arc is rewritten every frame
  // Laid over, not added: this rig's blade crosses in front of the head (the
  // leaping cut comes down over it), and Parchment added onto the pale fur
  // cleared the bloom threshold by half again and whited the face out for the
  // whole strike. Over the floor the two blends read the same.
  smear.material.blending = NormalBlending;
  body.add(smear);
  const smearPos = smear.geometry.attributes.position;
  function smearArc(span, innerR, outerR) {
    for (let i = 0; i <= SMEAR_SEG; i++) {
      const a = -span * (1 - i / SMEAR_SEG);
      const c = Math.cos(a);
      const sn = Math.sin(a);
      smearPos.setXYZ(i * 2, c * innerR, sn * innerR, 0);
      smearPos.setXYZ(i * 2 + 1, c * outerR, sn * outerR, 0);
    }
    smearPos.needsUpdate = true;
  }

  // --- Arms and paws, the feet.
  const armR = facetArm(furMat, 0.052, 0.2, 159);
  armR.position.set(0.18, 0.365, 0.07);
  body.add(armR);
  const armL = facetArm(furMat, 0.052, 0.2, 161);
  armL.position.set(-0.18, 0.365, 0.07);
  body.add(armL);
  const pawL = fpart(pawGeo, furDarkMat);
  pawL.scale.setScalar(0.055);
  pawL.position.set(REST.ox, REST.oy, REST.oz);
  body.add(pawL);
  const offGripLocal = new Vector3(0, -0.05, 0.004); // the off paw below the hand
  const offGrip = new Vector3();
  const offFree = new Vector3();

  const HOME = [new Vector3(-0.115, 0.047, 0.24), new Vector3(0.115, 0.047, 0.24)];
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(pawGeo, furDarkMat);
    foot.scale.set(0.06, 0.046, 0.074);
    foot.position.copy(HOME[i]);
    rig.add(foot); // feet stay planted: they do not inherit the torso lean
    feet.push(foot);
  }

  // ------------------------------------------------------------------------
  // Locked feet and the attacks (the hero core: render/facet/hero.js). The
  // sword-side foot (+X) leads every lunge, as a fencer's does.
  // ------------------------------------------------------------------------
  const lock = createFootLock({ rig, feet, home: HOME, lunge: { lead: 1, reach: 0.16, brace: 0.03 } });
  const atk = createAttackClock({ pack: PACK, hits: HITS, abilities: MOVES, skillAbility, window: COMBO_WINDOW });
  let lastT = null;
  let spinHeld = 0; // the turn a hit taken let go of
  const live = PACK.make();
  const lagged = PACK.make();
  const led = PACK.make();
  const trail = PACK.make();
  const trailLed = PACK.make();
  const idle = PACK.make();
  const walk = {};

  const lab = {
    abilities: MOVES,
    hits: HITS.map((h) => h.timeline),
    get override() {
      return atk.override;
    },
    // { kind: 'hit', n, t, fresh, recoil? } | { kind: 'ability', id, t } |
    // { kind: 'spawn', t } | null
    set override(o) {
      atk.setOverride(o);
    },
    cue: atk.cue,
    clock: atk,
    feet: lock.report,
    // the weapon's swing (weaponField 'ba'), as drawn: it trails the hips
    swing: () => drawnBa,
    parts: { torso, head, weapon: sword, sword },
  };

  // The blade's frame: its axis along (ba, be), its broad faces turned to
  // the game camera about that axis (body space). `toCam` is the camera's
  // direction (world) brought into body space each frame.
  const CAM_E = (CAMERA.elevationDeg * Math.PI) / 180;
  const CAM_DIR = new Vector3(0, Math.sin(CAM_E), Math.cos(CAM_E));
  const toCam = new Vector3();
  const bodyQ = new Quaternion();
  const dir = new Vector3();
  const face = new Vector3();
  const edge = new Vector3();
  const basis = new Matrix4();
  const flatQ = new Quaternion();
  const flatE = new Euler();
  const dNow = new Vector3();
  const dTrail = new Vector3();
  const sY = new Vector3();
  const sZ = new Vector3();
  const dirOf = (ba, be, out) => out.set(Math.sin(ba) * Math.cos(be), Math.sin(be), Math.cos(ba) * Math.cos(be));
  function bodyToCam() {
    bodyQ.identity();
    for (let o = body; o; o = o.parent) bodyQ.premultiply(o.quaternion);
    return toCam.copy(CAM_DIR).applyQuaternion(bodyQ.invert());
  }
  function orientBlade(ba, be) {
    dirOf(ba, be, dir);
    // the bt = 0 face (edges level) as the fallback where the camera looks
    // straight down the blade
    const fb = edge.set(Math.sin(be) * Math.sin(ba), -Math.cos(be), Math.sin(be) * Math.cos(ba));
    face.copy(toCam).addScaledVector(dir, -toCam.dot(dir));
    const len = face.length();
    if (len < 0.3) face.addScaledVector(fb, (0.3 - len) * (fb.dot(face) >= 0 ? 1 : -1));
    face.addScaledVector(dir, -face.dot(dir)).normalize();
    edge.crossVectors(dir, face).normalize();
    basis.makeBasis(edge, dir, face);
    sword.quaternion.setFromRotationMatrix(basis);
  }
  let drawnBa = REST.ba;

  function apply(P, t, fallSign, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const upright = 1 - P.collapse;

    // COMMON-MODE ear sway (as swordsman.js): a constant splay, so the two
    // pointed ears can never fold into one spike.
    ears[0].rotation.z = -0.24 + 0.6 * P.ear - P.collapse * 0.45;
    ears[1].rotation.z = 0.24 + 0.6 * P.ear + P.collapse * 0.45;
    ears[0].rotation.x = -0.12 + 0.4 * Math.min(0, P.ear * 1.6);
    ears[1].rotation.x = ears[0].rotation.x;

    atk.advance(dt, clip);
    const attacking = atk.active && clip !== 'downed';
    // The hips lead, the blade trails (sampled a frame apart on one timeline).
    if (attacking) atk.sample(live, led, lagged);
    const ability = atk.ability;
    const mt = atk.moveTime;
    // Blade Storm's turn: the whole rig, feet included.
    let spin = attacking ? spinAt(ability, mt) : 0;
    // A hit taken mid-turn lets the turn go over the release (no pop).
    if (attacking && ability === 'whirl') spinHeld = spin;
    else if (attacking && atk.move && atk.move.id === 'release' && spinHeld !== 0) spin = spinHeld * (1 - ease.out(Math.min(1, mt / atk.move.duration)));
    else spinHeld = 0;
    rig.rotation.y = spin * upright;

    // Torso and root: an attack owns them; otherwise the driver's clip does
    // (with the rest lean, basePitch).
    if (attacking) {
      torso.rotation.y = led.yaw * upright;
      torso.rotation.x = Math.min(LUNGE_PITCH_MAX, led.pitch) * upright;
      torso.rotation.z = led.roll * upright;
      rig.position.x = live.rx * upright;
      rig.position.y += (live.ry + live.hop) * upright;
      rig.position.z += live.rz * upright;
      rig.scale.set(live.sw, live.sh, live.sw);
    } else {
      rig.position.x = 0;
    }
    // The recoil off a connect (B3): a rig-only shove and lean back after
    // the held contact; the body never moves.
    const rc = atk.recoil();
    if (rc > 0) {
      rig.position.z -= RECOIL.shove * rc * upright;
      torso.rotation.x -= RECOIL.lean * rc * upright;
    }
    if (attacking || rc > 0) {
      head.rotation.x = -torso.rotation.x * 0.88 - 0.18 * upright;
      head.rotation.y = -torso.rotation.y * 0.5 * upright;
    }
    // The grow-in on a room entry (B7).
    const sp = atk.spawn();
    if (sp !== 1) rig.scale.multiplyScalar(sp);

    // Feet: locked to the floor, stepping on their own; the walk's bob,
    // sway, twist and travel lean come from the steps, over the rest lean.
    const locked = P.collapse < 0.04;
    // The grow-in: the feet ride the body. The lab's Still stands them on
    // the pose's homes. After the bob the feet are set again (on the floor).
    lock.step(dt, attacking ? live : REST, locked && sp === 1, !!atk.override && dt <= 0);
    if (locked && clip === 'walk' && !attacking) {
      walkBody(lock, { walkSpeed: WALK_SPEED }, walk);
      rig.position.y += walk.dy - P.bob * upright * 0.6;
      torso.rotation.x = Math.min(WALK_PITCH_MAX, LEAN + walk.pitch) * upright;
      torso.rotation.y = walk.twist * upright;
      torso.rotation.z = walk.roll * upright;
      head.rotation.x = -torso.rotation.x * 0.88 - 0.18 * upright;
      head.rotation.y = -walk.twist * 0.55 * upright;
      if (sp === 1) lock.place();
    }

    // The brush counters the hips and lifts with the lean; the scarf tails
    // stream with speed and trail the swing.
    const yawNow = torso.rotation.y;
    tailPivot.rotation.y = 0.3 * P.tail - 0.55 * yawNow;
    tailPivot.rotation.x = 0.12 * P.tail - 0.45 * P.collapse + (attacking ? 0.3 * Math.max(0, led.pitch - LEAN) : 0);
    const run = Math.min(1, lock.state.speed / WALK_SPEED) * upright;
    scarfPivot.rotation.x = -0.45 * run + 0.06 * Math.sin(t * 11) * run - (attacking ? 0.35 * Math.max(0, live.pitch - LEAN) + 2 * live.hop : 0);
    scarfPivot.rotation.y = 0.25 * P.tail - (attacking ? Math.max(-0.6, Math.min(0.6, 1.5 * (led.yaw - lagged.yaw))) : 0);

    // The sword: an attack places it (a frame behind the hips); otherwise
    // the idle flourish and the generic cast swing it about the stance.
    let S;
    if (attacking) S = lagged;
    else {
      S = PACK.copy(idle, REST);
      const thrust = Math.max(0, P.prop);
      const wind = -Math.min(0, P.prop);
      S.ba += -1.9 * thrust + 0.4 * wind;
      S.be += -0.8 * thrust + 0.35 * wind;
      S.hx += -0.1 * thrust + 0.02 * wind;
      S.hy += 0.02 * thrust + 0.06 * wind;
      S.hz += 0.18 * thrust - 0.1 * wind;
    }
    // the blade trails the turn of a spin by the same frame it trails the hips
    drawnBa = S.ba + (attacking ? wrapPi(spinAt(ability, mt - LAG) - spin) : 0);
    sword.position.set(S.hx, S.hy, S.hz);
    bodyToCam();
    orientBlade(drawnBa, S.be);
    // Downed (round-3 F8, as swordsman.js): the blade lies flat beside the
    // fox, in front of the body, never flung behind it.
    const lay = P.collapse;
    if (lay > 0) {
      flatQ.setFromEuler(flatE.set(0, 0, -fallSign * (Math.PI / 2 + FALL_ANGLE) + 0.25));
      sword.quaternion.slerp(flatQ, lay);
      sword.position.lerp(offFree.set(0.04, 0.12, 0.38), lay);
    }
    sword.updateMatrix();
    aimArm(armR, sword.position);
    // the off paw: free (keyed), or on the grip below the hand (two hands:
    // the finisher's weight)
    const paw = attacking ? S.paw : 0;
    offFree.set(S.ox, S.oy, S.oz);
    if (paw > 0) offGrip.copy(offGripLocal).applyMatrix4(sword.matrix);
    pawL.position.lerpVectors(offFree, paw > 0 ? offGrip : offFree, paw);
    aimArm(armL, pawL.position);

    // The swing smear: on through each blow, laid in the plane the blade
    // swept over the last 0.05 s, faded by how fast it swept.
    let op = 0;
    let size = 'mid';
    if (attacking && lay === 0) {
      const id = ability || `hit${atk.comboHit}`;
      const rule = SMEAR[id];
      if (rule) {
        size = rule.size;
        const mv = atk.move;
        const s = mv.timeline.sample(Math.max(0, mt - LAG));
        const gate = rule.on.includes(s.id) ? 1 : s.id === rule.fade ? 1 - s.k : 0;
        if (gate > 0) {
          const TRAIL = 0.05;
          atk.pose(trail, -(LAG + TRAIL));
          atk.pose(trailLed, LEAD - TRAIL);
          const baT = trail.ba + wrapPi(spinAt(ability, mt - LAG - TRAIL) - spin) + (trailLed.yaw - led.yaw);
          dirOf(drawnBa, S.be, dNow);
          dirOf(baT, trail.be, dTrail);
          const swept = dNow.angleTo(dTrail);
          const k = Math.min(1, Math.max(0, (swept - 0.3) / 0.7));
          op = gate * k * k * (3 - 2 * k);
          if (op > 0) {
            sY.copy(dTrail).addScaledVector(dNow, -dTrail.dot(dNow)).normalize().negate();
            sZ.crossVectors(dNow, sY).normalize();
            basis.makeBasis(dNow, sY, sZ);
            smear.quaternion.setFromRotationMatrix(basis);
            smear.position.copy(sword.position);
            const [r0, r1, max] = SMEAR_SIZE[size];
            smearArc(Math.min(max, swept * 1.7), r0, r1);
          }
        }
      }
    }
    smear.visible = op > 0.01;
    smear.material.uniforms.uOpacity.value = smear.visible ? SMEAR_OPACITY * op : 0;
  }

  return {
    apply,
    cue: atk.cue,
    hold: atk.hold,
    comboHitOf: atk.comboHitOf,
    atContact: atk.atContact,
    points: { hand, tip },
    lab,
    torso,
    head,
    basePitch: LEAN,
    metrics: {
      standHeight: EAR_TOP,
      earTopY: EAR_TOP,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.24,
      ringRadius: 0.46,
      hipY: HIP,
    },
  };
}

// The model lab's basic combo: three swings at the Swordsman's real cadence
// (ALLY_CLASSES.swordsman.attackIntervalTicks in sim/allies.js: 21 ticks =
// 0.35 s; the heroes probe checks the two agree), each contact held as the
// hitstop holds it. Pure in t, so it rewinds.
export const SWING_SEC = 0.35;
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC });

// The Swordsman in the model-standard registry (render/facet/heroes.js).
export const SWORDSMAN_SPEC = Object.freeze({
  id: 'swordsman',
  label: 'Swordsman',
  build: buildSwordsmanFacet,
  hits: HITS,
  moves: MOVES,
  skillAbility,
  swingSec: SWING_SEC,
  comboLab: COMBO_LAB,
  ranged: false,
  walkSpeed: WALK_SPEED,
  weaponField: 'ba',
  lab: {
    abilities: [
      ['combo', 'Basic combo'],
      ['lunge', 'Lunge Strike'],
      ['flurry', 'Flurry'],
      ['crescent', 'Crescent Cut'],
      ['whirl', 'Blade Storm'],
      ['scatter', 'Caltrops'],
      ['draw', 'Edge Draw'],
      ['spawn', 'Spawn'],
    ],
    frame: { y: 0.55, z: 0, dist: 3.4, speed: 2.65, loop: 2.2, side: 1.3 },
    cues: {
      strike: { sound: 'swing', pitch: 1.2, fx: 'flash' },
      finisher: { sound: 'sword_finisher', pitch: 1, fx: ['star', 'crack'], size: 1.5 },
      thrust: { sound: 'sword_step', pitch: 1, fx: 'star' },
      cuts: { sound: 'swing', pitch: 1.45, fx: ['flash', 'star'] },
      crescent: { sound: 'sword_finisher', pitch: 1.15, fx: ['flash', 'ring'], size: 1.2 },
      whirl: { sound: 'whoosh', pitch: 1.1, fx: 'ring', size: 1.2 },
      fling: { sound: 'cast_zone', pitch: 1.1, fx: 'star' },
      edge: { sound: 'sword_parry', pitch: 1.2, fx: 'flash' },
    },
  },
});
