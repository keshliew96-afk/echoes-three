// DUSKWING, MODEL STANDARD (docs/MODEL_STANDARD.md). The chibi fruit bat of
// duskwing.js (docs/DUSKWING.md) in the faceted look, laid ON TOP of him: the
// same plump pear body with its pale chest ruff, the two big leaf ears
// splayed wide, the pug nose and two small fangs, and the leather wings
// folded at his sides like a cloak (the party's only wings, and the only
// outline that changes width when he strikes). What changes:
//
//   * every mass is faceted (render/facet/material.js): a nine-sided body,
//     a faceted skull, ears and nose; the wing membranes faceted leather with
//     the finger bones a few-sided section over them;
//   * detail from the parts kit (render/facet/kit.js): a shag of ruff fur
//     fringing the bib, a crest on the crown, a mane of fur down the back and
//     knuckle claws at each wing's wrist and finger tips;
//   * a THREE-HIT WING COMBO on the basic attack (Kesh's animation template),
//     at his 0.3 s cadence, the fastest in the party: a forehand wing rake
//     from the side across the front, a rising backhand rake back out, then
//     the finisher, a leap with both wings beating down and a diving bite.
//     Each blow's follow-through settles into the next wind-up, the hips
//     lead and the wing trails a frame behind;
//   * nine ability timelines for his eleven skills: Dusk Dive, Bloodbite,
//     Nightfall, Echo Screech, Talon Rake, Bat Swarm, Shadow Veil, Flit and
//     Night Wings;
//   * LOCKED FEET on the hero core (render/facet/hero.js).
//
// Same contract as buildDuskwing (apply, torso, head, basePitch, metrics),
// plus `cue(kind, ev)`, `hold(dt)`, `comboHitOf(ev)`, `points` and `lab`.
// Render only: attack timing, damage and the sim are untouched.
import { ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry, Mesh, Shape, SphereGeometry, Vector2, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE, VFX_SIGNATURE } from '../../data/palette.js';
import { faceDecal, mix } from './common.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { placeRow, plateGeometry, setTRS, wedgeGeometry } from '../facet/kit.js';
import {
  createAttackClock,
  createCombo,
  createComboLab,
  createFootLock,
  createMove,
  fpart,
  FRAME,
  HIT_TIMING,
  leanOf,
  namedPoint,
  posePack,
  RECOIL,
  walkBody,
} from '../facet/hero.js';

// The classic bat's measures (duskwing.js), unchanged.
const HIP = 0.14;
const HEM = 0.02;
const HEAD_C = 0.56;
const HEAD_R = 0.215;
const SX = 1.05, SY = 0.95, SZ = 1.0;
const EAR_H = 0.27;
const SHOULDER_Y = 0.37;
const WING = 1.0; // membrane scale
const COAT = [
  [0, HEM],
  [0.15, HEM],
  [0.2, 0.06],
  [0.215, 0.15],
  [0.2, 0.26],
  [0.17, 0.35],
  [0.12, 0.42],
  [0.06, 0.46],
  [0, 0.47],
];
function coatR(y) {
  for (let i = 1; i < COAT.length; i++) {
    if (y <= COAT[i][1]) {
      const [r0, y0] = COAT[i - 1];
      const [r1, y1] = COAT[i];
      return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
    }
  }
  return 0;
}

// One wing's membrane in its own plane (x out from the shoulder, y up), as
// the classic: a leading bone up to the wrist, out to the tip, then three
// scalloped hollows back to the body. `side` mirrors it.
const FINGERS = [
  [0.4, 0.06], // the tip (third finger)
  [0.31, -0.11], // second finger
  [0.18, -0.17], // first finger
];
const WRIST = [0.15, 0.15];
function wingShape(side) {
  const s = new Shape();
  const X = (x) => x * side * WING;
  const Y = (y) => y * WING;
  s.moveTo(X(0), Y(0.05));
  s.lineTo(X(WRIST[0]), Y(WRIST[1]));
  s.lineTo(X(FINGERS[0][0]), Y(FINGERS[0][1]));
  s.quadraticCurveTo(X(0.32), Y(0.0), X(FINGERS[1][0]), Y(FINGERS[1][1]));
  s.quadraticCurveTo(X(0.22), Y(-0.06), X(FINGERS[2][0]), Y(FINGERS[2][1]));
  s.quadraticCurveTo(X(0.09), Y(-0.08), X(0.02), Y(-0.16));
  s.lineTo(X(0), Y(-0.08));
  s.lineTo(X(0), Y(0.05));
  return s;
}

// ALLY_CLASSES.duskwing.moveSpeed (u/s): full walk lean at full speed
const WALK_SPEED = 2.9;
// Basic attack: a blow inside this window of the last one is the next hit.
// He nips every 0.3 s (ALLY_CLASSES.duskwing.attackIntervalTicks, the
// fastest in the party), so the window is two blows.
export const COMBO_WINDOW = 0.6;
// Frame timing at 30 fps. A chained hit plays from its strike, so strike +
// overshoot + settle must land inside the 0.3 s cadence: 1.5 + 2 + 4 frames
// (0.25 s) for the two rakes, 2.5 + 2 + 4 (0.28 s) for the leaping bite.
const T_RAKE = Object.freeze({ ...HIT_TIMING, wind: FRAME, strike: 1.5 * FRAME, over: 2 * FRAME, settle: 4 * FRAME, recover: 0.3 });
const T_FINISH = Object.freeze({ ...T_RAKE, strike: 2.5 * FRAME });

// --- Key poses (body space; +X his right, +Z the facing). The body fields
// are the hero core's. Each wing: s its sweep (0 straight out to the side,
// + forward round the front, - back), l its lift (0 level, + raised, -
// drooped), o how far it is spread (0 folded, 1 wide). r* the right wing,
// the one that rakes (the weapon); l* the left. bite: the head darting in
// (1) or drawn back (-); ear: the ears flaring.
const PACK = posePack({ rws: -0.8, rwl: -0.95, rwo: 0, lws: -0.8, lwl: -0.95, lwo: 0, bite: 0, ear: 0 });
const { REST, K } = PACK;
// Each wind-up pulls the weight back (rz < 0); each contact lunges past rest
// (rz > 0), leans into the target and holds the B9 squash (+19% wide, about
// -10% tall) through the hitstop; the overshoot snaps it back in 2 frames.
//
// Hit 1, FOREHAND WING RAKE, right to left: the right wing cocked open and
// back, the right shoulder turned away; the hips unwind and the wing claws
// sweep forward round the front to the target, the left wing tucked in.
const A1 = K({ yaw: 0.26, pitch: -0.02, roll: 0.03, rx: 0.02, rz: -0.05, sw: 1.04, sh: 0.97, rws: -0.55, rwl: 0.3, rwo: 0.9, lws: -0.6, lwl: -0.5, lwo: 0.35, ear: 0.3 });
const S1 = K({ yaw: -0.22, pitch: 0.32, roll: -0.03, rx: -0.02, rz: 0.09, sw: 1.19, sh: 0.9, rws: 1.4, rwl: -0.05, rwo: 1, lws: -0.4, lwl: -0.3, lwo: 0.5, ear: 0.5 });
const O1 = K({ yaw: -0.28, pitch: 0.22, roll: -0.04, rx: -0.03, rz: 0.07, sw: 1.03, sh: 0.98, rws: 1.6, rwl: -0.2, rwo: 0.9, lws: -0.4, lwl: -0.35, lwo: 0.5, ear: 0.4 });
// Hit 2, RISING BACKHAND RAKE, left to right: as hit 1 settles the right
// wing gathers low across the chest, the left shoulder back; then the legs
// drive up and the hips turn back as the wing rakes out and up to the side.
const A2 = K({ yaw: -0.3, pitch: 0.04, roll: -0.03, ry: -0.03, rz: -0.04, sw: 1.06, sh: 0.95, rws: 1.55, rwl: -0.45, rwo: 0.6, lws: -0.7, lwl: -0.4, lwo: 0.4, ear: 0.2 });
const S2 = K({ yaw: 0.2, pitch: 0.31, roll: 0.04, ry: 0.02, rz: 0.08, sw: 1.19, sh: 0.91, rws: 0.25, rwl: 0.3, rwo: 1, lws: -0.3, lwl: -0.2, lwo: 0.6, ear: 0.5 });
const O2 = K({ yaw: 0.26, pitch: 0.18, roll: 0.05, ry: 0.03, rz: 0.05, sw: 1.0, sh: 1.03, rws: 0.0, rwl: 0.42, rwo: 0.95, lws: -0.3, lwl: -0.15, lwo: 0.6, ear: 0.4 });
// Hit 3, DIVING BITE (the finisher, the biggest: B6): as hit 2 settles he
// crouches with both wings raised high and open; he springs (the leap is
// the strike's own arc, below), both wings beat down and forward, and he
// lands on the contact in the deepest lunge and squash, the head darting in
// for the bite.
const A3 = K({ yaw: 0.08, pitch: -0.1, roll: 0.02, ry: -0.05, rz: -0.06, sw: 1.08, sh: 0.9, rws: -0.25, rwl: 0.65, rwo: 1, lws: -0.25, lwl: 0.65, lwo: 1, bite: -0.3, ear: 0.8 });
const S3 = K({ yaw: -0.08, pitch: 0.36, roll: -0.02, ry: -0.07, rz: 0.16, sw: 1.19, sh: 0.86, step: 1, rws: 0.9, rwl: -0.4, rwo: 1, lws: 0.9, lwl: -0.4, lwo: 1, bite: 1, ear: 1 });
const O3 = K({ yaw: -0.12, pitch: 0.26, roll: -0.03, ry: -0.08, rz: 0.15, sw: 1.06, sh: 0.95, step: 1, rws: 1.05, rwl: -0.6, rwo: 0.85, lws: 1.05, lwl: -0.6, lwo: 0.85, bite: 0.6, ear: 0.7 });
// The wings whip: through a blow the wing fields run ahead of the body's
// ease (fast from the first frame, as a wrist snaps), so the wing drawn a
// frame behind the hips still meets the target on the contact frame. Zero
// at both ends of the phase.
const WING_FIELDS = ['rws', 'rwl', 'rwo', 'lws', 'lwl', 'lwo', 'bite'];
function whip(keys) {
  return (out, s) => {
    const key = keys[s.id];
    if (!key) return;
    const g = Math.sin((Math.PI / 2) * s.k);
    for (const f of WING_FIELDS) out[f] += (key[f] - out[f]) * g;
  };
}
const both = (...fns) => (out, s) => {
  for (const f of fns) f(out, s);
};
// The finisher's leap: an arc over its strike, stretched tall in the air
// (B6), landing on the contact frame. Zero at both ends of the phase.
const LEAP = 0.16;
const leap = (out, s) => {
  if (s.id !== 'strike') return;
  const a = Math.sin(Math.PI * s.k);
  out.hop += LEAP * a;
  out.sh += 0.14 * a;
  out.sw -= 0.07 * a;
};
const HITS = createCombo(
  PACK,
  [
    { label: 'forehand wing rake', from: A1, strike: S1, over: O1, timing: T_RAKE, extra: whip({ strike: S1 }) },
    { label: 'rising backhand rake', from: A2, strike: S2, over: O2, timing: T_RAKE, extra: whip({ strike: S2 }) },
    { label: 'diving bite', from: A3, strike: S3, over: O3, timing: T_FINISH, extra: both(whip({ strike: S3 }), leap) },
  ],
  { window: COMBO_WINDOW, timing: T_RAKE }
);
export const DUSKWING_HITS = HITS;

// --- Abilities. In game a skill enters its timeline 0.08 s before its
// entry phase (the press is instant, BUILD_BRIEF §6); the lab plays all of
// it. Each settles into the stance with one small overshoot.
const breathe = (out, s) => {
  if (s.id === 'hold') out.ry += -0.008 * Math.sin(s.k * Math.PI);
};
// Dusk Dive: wings wrapped tight in a crouch, the drop out of the dark (the
// dash carries the body; the feet ride it), and the landing with the wings
// snapped wide.
const G_DIVE = K({ yaw: 0.04, pitch: 0.18, ry: -0.04, rz: -0.05, sw: 1.08, sh: 0.9, rws: 0.3, rwl: -0.7, rwo: 0.5, lws: 0.3, lwl: -0.7, lwo: 0.5, ear: -0.3 });
const L_DIVE = K({ pitch: 0.34, hop: 0.1, air: 1, sw: 0.94, sh: 1.08, rws: 0.5, rwl: -0.5, rwo: 0.6, lws: 0.5, lwl: -0.5, lwo: 0.6, bite: 0.3, ear: -0.4 });
const D_DIVE = K({ yaw: -0.06, pitch: 0.32, rz: 0.1, ry: -0.05, sw: 1.19, sh: 0.88, rws: 0.6, rwl: 0.3, rwo: 1, lws: 0.6, lwl: 0.3, lwo: 1, bite: 0.5, ear: 1 });
// Bloodbite: the wings cupped forward round the prey, the head drawn back,
// then the dart in and the bite held while it drinks.
const G_BITE = K({ yaw: 0.1, pitch: -0.04, rz: -0.05, sw: 1.05, sh: 0.96, rws: 0.9, rwl: 0.05, rwo: 0.85, lws: 0.9, lwl: 0.05, lwo: 0.85, bite: -0.35, ear: 0.5 });
const S_BITE = K({ yaw: -0.08, pitch: 0.36, rz: 0.14, ry: -0.04, sw: 1.19, sh: 0.88, step: 0.8, rws: 1.3, rwl: -0.15, rwo: 0.9, lws: 1.3, lwl: -0.15, lwo: 0.9, bite: 1, ear: 1 });
// Nightfall (Nightfall, Blood Moon): both wings raised high and wide, then
// one deep downbeat that throws the dark out round him.
const G_NIGHT = K({ pitch: -0.12, sw: 0.95, sh: 1.06, rws: 0.1, rwl: 0.7, rwo: 1, lws: 0.1, lwl: 0.7, lwo: 1, bite: -0.2, ear: 1 });
const S_NIGHT = K({ pitch: 0.16, ry: -0.03, sw: 1.12, sh: 0.9, rws: 0.25, rwl: -0.65, rwo: 1, lws: 0.25, lwl: -0.65, lwo: 1, bite: 0.2, ear: 0.6 });
// Echo Screech: the head drawn back and up, the wings swept back open; then
// the head thrust forward on the shriek, the ears flared.
const G_SCR = K({ pitch: -0.12, sw: 0.97, sh: 1.05, rws: 0.4, rwl: 0.15, rwo: 0.8, lws: -0.1, lwl: 0.15, lwo: 0.8, bite: -0.45, ear: 0.3 });
const S_SCR = K({ pitch: 0.26, rz: 0.08, sw: 1.1, sh: 0.93, rws: 0.15, rwl: 0.35, rwo: 1, lws: -0.2, lwl: 0.35, lwo: 1, bite: 0.9, ear: 1 });
// Talon Rake: both wings cocked back and up, then swept round the front
// together, the claws raking a wide arc.
const G_RAKE = K({ yaw: 0.18, pitch: -0.02, rz: -0.06, sw: 1.06, sh: 0.94, rws: -0.2, rwl: 0.35, rwo: 1, lws: -0.4, lwl: 0.35, lwo: 1, ear: 0.6 });
const S_RAKE = K({ yaw: -0.14, pitch: 0.34, rz: 0.13, sw: 1.19, sh: 0.89, step: 0.6, rws: 1.4, rwl: -0.05, rwo: 1, lws: 1.3, lwl: -0.05, lwo: 1, bite: 0.3, ear: 1 });
// Bat Swarm: the wings gathered low in front, then flung up and open to
// loose the swarm at the spot.
const G_SWARM = K({ pitch: 0.1, sw: 1.06, sh: 0.94, rws: 1.0, rwl: -0.55, rwo: 0.4, lws: 1.0, lwl: -0.55, lwo: 0.4, ear: 0.2 });
const S_SWARM = K({ pitch: -0.06, sw: 0.96, sh: 1.06, rws: 0.85, rwl: 0.5, rwo: 1, lws: 0.85, lwl: 0.5, lwo: 1, bite: 0.2, ear: 0.8 });
// Shadow Veil: the wings wrapped shut round him, then snapped open to cut
// the ring, the dark staying folded round him.
const G_VEIL = K({ pitch: 0.06, sw: 1.04, sh: 0.95, rws: 1.4, rwl: -0.35, rwo: 0.8, lws: 1.4, lwl: -0.35, lwo: 0.8, bite: -0.2, ear: -0.3 });
const S_VEIL = K({ pitch: 0.1, ry: -0.02, sw: 1.12, sh: 0.92, rws: 0.35, rwl: 0.3, rwo: 1, lws: 0.35, lwl: 0.3, lwo: 1, ear: 1 });
// Flit: the wings flick open, a hop away (the vault carries the body), and
// a landing with them half spread.
const G_FLIT = K({ pitch: 0.08, rz: -0.04, sw: 1.07, sh: 0.92, rws: 0.6, rwl: 0.35, rwo: 1, lws: 0.6, lwl: 0.35, lwo: 1, ear: 0.6 });
const L_FLIT = K({ pitch: -0.14, hop: 0.12, air: 1, sw: 0.94, sh: 1.08, rws: 0.5, rwl: -0.45, rwo: 1, lws: 0.5, lwl: -0.45, lwo: 1, ear: 0.8 });
const D_FLIT = K({ pitch: 0.1, sw: 1.1, sh: 0.92, rws: 0.2, rwl: 0.0, rwo: 0.6, lws: 0.2, lwl: 0.0, lwo: 0.6, ear: 0.4 });
// Night Wings (Night Wings, Blood Scent: the auras): the wings half open,
// the nose lifted on the scent, one slow beat.
const G_BEAT = K({ pitch: -0.06, sw: 0.98, sh: 1.03, rws: 0.3, rwl: 0.2, rwo: 0.7, lws: 0.3, lwl: 0.2, lwo: 0.7, bite: -0.15, ear: 0.6 });
const S_BEAT = K({ pitch: 0.04, sw: 1.03, sh: 0.97, rws: 0.35, rwl: -0.25, rwo: 0.8, lws: 0.35, lwl: -0.25, lwo: 0.8, bite: 0.1, ear: 0.4 });

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
export const DUSKWING_MOVES = Object.freeze({
  dive: moveOf(
    'dive',
    'Dusk Dive',
    [
      { id: 'fold', label: 'wings wrapped, crouch', dur: 0.14, to: G_DIVE, ease: 'out' },
      { id: 'drop', label: 'the drop', dur: 0.16, to: L_DIVE, ease: 'inOut' },
      { id: 'land', label: 'land, wings snap wide', dur: 1.5 * FRAME, to: D_DIVE, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.14, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'drop', recoil: true, extra: both(whip({ land: D_DIVE }), breathe), cueAt: [['hold', 'dive']] }
  ),
  bite: moveOf(
    'bite',
    'Bloodbite',
    [
      { id: 'gather', label: 'wings cupped, head back', dur: 0.14, to: G_BITE, ease: 'out' },
      { id: 'bite', label: 'bite', dur: 1.5 * FRAME, to: S_BITE, ease: 'in' },
      { id: 'hold', label: 'drink', dur: 0.18, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'bite', recoil: true, extra: both(whip({ bite: S_BITE }), breathe), cueAt: [['hold', 'bite']] }
  ),
  night: moveOf(
    'night',
    'Nightfall',
    [
      { id: 'raise', label: 'wings raised high', dur: 0.16, to: G_NIGHT, ease: 'out' },
      { id: 'release', label: 'the downbeat', dur: 2 * FRAME, to: S_NIGHT, ease: 'in' },
      { id: 'hold', label: 'the dark rolls out', dur: 0.2, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.4, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: both(whip({ release: S_NIGHT }), breathe), cueAt: [['hold', 'night']] }
  ),
  screech: moveOf(
    'screech',
    'Echo Screech',
    [
      { id: 'draw', label: 'head drawn back', dur: 0.14, to: G_SCR, ease: 'out' },
      { id: 'release', label: 'the shriek', dur: 1.5 * FRAME, to: S_SCR, ease: 'in' },
      { id: 'hold', label: 'the echo', dur: 0.22, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'screech']] }
  ),
  rake: moveOf(
    'rake',
    'Talon Rake',
    [
      { id: 'gather', label: 'wings cocked back', dur: 0.14, to: G_RAKE, ease: 'out' },
      { id: 'rake', label: 'rake round the front', dur: 2 * FRAME, to: S_RAKE, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.14, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'rake', recoil: true, extra: both(whip({ rake: S_RAKE }), breathe), cueAt: [['hold', 'rake']] }
  ),
  swarm: moveOf(
    'swarm',
    'Bat Swarm',
    [
      { id: 'gather', label: 'wings gathered low', dur: 0.14, to: G_SWARM, ease: 'out' },
      { id: 'release', label: 'fling them open', dur: 2 * FRAME, to: S_SWARM, ease: 'in' },
      { id: 'hold', label: 'the swarm pours out', dur: 0.2, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'swarm']] }
  ),
  veil: moveOf(
    'veil',
    'Shadow Veil',
    [
      { id: 'wrap', label: 'wings wrapped shut', dur: 0.16, to: G_VEIL, ease: 'out' },
      { id: 'release', label: 'snap open', dur: 2 * FRAME, to: S_VEIL, ease: 'in' },
      { id: 'hold', label: 'the veil holds', dur: 0.18, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'veil']] }
  ),
  flit: moveOf(
    'flit',
    'Flit',
    [
      { id: 'flick', label: 'wings flick open', dur: 0.08, to: G_FLIT, ease: 'out' },
      { id: 'hop', label: 'hop away', dur: 0.12, to: L_FLIT, ease: 'out' },
      { id: 'land', label: 'land', dur: 0.08, to: D_FLIT, ease: 'in' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'land', entry: 'hop', cueAt: [['hop', 'flit']] }
  ),
  beat: moveOf(
    'beat',
    'Night Wings',
    [
      { id: 'open', label: 'wings half open, nose up', dur: 0.16, to: G_BEAT, ease: 'out' },
      { id: 'beat', label: 'one slow beat', dur: 0.3, to: S_BEAT, ease: 'inOut' },
      { id: 'hold', label: 'hold', dur: 0.12, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'beat', entry: 'beat', extra: breathe, cueAt: [['beat', 'beat']] }
  ),
});
const MOVES = DUSKWING_MOVES;
// Which ability a Duskwing skill plays: by the skill first
// (CLASS_SKILLS.duskwing, all eleven), then by its shape.
export const DUSKWING_SKILL_ABILITY = Object.freeze({
  dusk_dive: 'dive',
  blood_bite: 'bite',
  nightfall: 'night',
  blood_moon: 'night',
  echo_screech: 'screech',
  talon_rake: 'rake',
  bat_swarm: 'swarm',
  shadow_veil: 'veil',
  flit: 'flit',
  night_wings: 'beat',
  blood_scent: 'beat',
});
const SHAPE_ABILITY = Object.freeze({ projectile: 'swarm', direct: 'bite', melee_arc: 'rake', nova: 'night', ground_aoe: 'swarm', aura: 'beat' });
const skillAbility = (ev) => (ev && (DUSKWING_SKILL_ABILITY[ev.skill] || SHAPE_ABILITY[ev.shape])) || 'rake';
export const DUSKWING_REST = REST;

// ---------------------------------------------------------------------------
// The rig
// ---------------------------------------------------------------------------
export function buildDuskwingFacet(rig, trackAccent) {
  const accent = CLASS_ACCENTS.duskwing;
  const fur = mix(mix(accent, PALETTE.bruiseUmber, 0.35), PALETTE.bone, 0.07);
  const furHex = fur.getHex();
  const furDarkHex = mix(fur, PALETTE.voidCharcoal, 0.4).getHex();
  const ruffHex = mix(PALETTE.bone, PALETTE.paleGold, 0.3).getHex();
  const leatherHex = mix(accent, PALETTE.voidCharcoal, 0.35).getHex();
  const roseHex = mix(VFX_SIGNATURE.duskwing.glow, accent, 0.35).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  const furMat = facetMaterial(furHex);
  const furDarkMat = facetMaterial(furDarkHex);
  const ruffMat = facetMaterial(ruffHex);
  const leatherMat = trackAccent(facetMaterial(leatherHex));
  const roseMat = facetMaterial(roseHex);
  const boneMat = facetMaterial(PALETTE.bone);
  const fangMat = facetMaterial(PALETTE.parchment);

  // --- The plump pear body: nine sides.
  const coatGeo = sharedGeo('facet:bat-coat', () => facetize(new LatheGeometry(COAT.map(([x, y]) => new Vector2(x, y)), 9), { jitter: 0.14, seed: 501 }));
  body.add(fpart(coatGeo, furMat));
  // The pale chest ruff riding just outside the facets, its lower edge a
  // shaggy fringe of tufts so it reads as fur, not a panel.
  const BIB = [
    [0.212, 0.17],
    [0.207, 0.26],
    [0.184, 0.34],
    [0.145, 0.41],
  ];
  const bibGeo = sharedGeo('facet:bat-bib', () => facetize(new LatheGeometry(BIB.map(([x, y]) => new Vector2(x * 1.04, y)), 4, -0.625, 1.25), { jitter: 0.06, seed: 503 }));
  body.add(new Mesh(bibGeo, ruffMat));
  const plate = plateGeometry();
  const wedge = wedgeGeometry();
  const P = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const SHAG = 9;
  const shag = placeRow(wedge, ruffMat, SHAG, (i, m) => {
    const a = -0.56 + (1.12 * i) / (SHAG - 1); // along the bib's lower edge
    const y = 0.19 + 0.012 * (i % 2);
    const r = coatR(y) * 1.065;
    P.set(Math.sin(a) * r, y, Math.cos(a) * r);
    Y.set(Math.sin(a) * 0.3, -0.95, Math.cos(a) * 0.3).normalize(); // hanging down
    X.set(Math.cos(a), 0, -Math.sin(a));
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.095, 0.05 + 0.02 * (i % 2), 0.045);
  }, { name: 'bat-shag', seed: 505, mottle: 0.06 });
  body.add(shag);
  // A mane of dark fur down the back, between the wings.
  const MANE = 6;
  const mane = placeRow(wedge, furDarkMat, MANE, (i, m) => {
    const y = 0.42 - i * 0.05;
    const r = coatR(y) * 0.98;
    P.set(0, y, -r);
    Y.set(0, 0.35, -1).normalize();
    X.set(1, 0, 0);
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.07 - i * 0.006, 0.06, 0.05);
  }, { name: 'bat-mane', seed: 507, mottle: 0.06 });
  body.add(mane);

  // --- Head: round, big eyes, a pug nose and two fangs, a crest of fur.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skullGeo = sharedGeo('facet:bat-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 511 }));
  const skull = fpart(skullGeo, furMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.115, eyeH: 0.13, spread: 0.2, drop: 0.52 }));
  const noseGeo = sharedGeo('facet:bat-nose', () => facetize(new SphereGeometry(0.036, 7, 5), { jitter: 0.08, seed: 513 }));
  const nose = fpart(noseGeo, roseMat);
  nose.scale.set(1.3, 0.8, 0.9);
  nose.position.set(0, -0.055, SZ * HEAD_R * 0.94);
  head.add(nose);
  const fangGeo = sharedGeo('facet:bat-fang', () => new ConeGeometry(0.012, 0.04, 4));
  for (const side of [-1, 1]) {
    const fang = new Mesh(fangGeo, fangMat);
    fang.rotation.x = Math.PI;
    fang.position.set(side * 0.032, -0.11, SZ * HEAD_R * 0.86);
    head.add(fang);
  }
  const crest = placeRow(wedge, furDarkMat, 4, (i, m) => {
    const a = -0.3 + i * 0.2;
    P.set(Math.sin(a) * 0.03, HEAD_R * SY * 0.94, 0.03 - i * 0.025);
    Y.set(Math.sin(a) * 0.4, 1, -0.45).normalize();
    X.set(1, 0, 0);
    Z.crossVectors(X, Y).normalize();
    X.crossVectors(Y, Z).normalize();
    setTRS(m, P, X, Y, Z, 0.07, 0.08 - 0.008 * Math.abs(i - 1.5), 0.05);
  }, { name: 'bat-crest', seed: 515, mottle: 0.05 });
  head.add(crest);

  // --- The ears: tall, wide-set, splayed, rose inside. His key.
  const earGeo = sharedGeo('facet:bat-ear', () => facetize(new ConeGeometry(0.09, EAR_H, 8, 1), { jitter: 0.06, seed: 517 }));
  const liningGeo = sharedGeo('facet:bat-lining', () => facetize(new ConeGeometry(0.062, EAR_H * 0.8, 6, 1), { jitter: 0.05, seed: 519 }));
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.13, 0.12, -0.01);
    head.add(pivot);
    const ear = fpart(earGeo, furMat);
    ear.scale.set(1, 1, 0.42);
    ear.position.y = EAR_H * 0.5;
    pivot.add(ear);
    const lining = new Mesh(liningGeo, roseMat);
    lining.scale.set(1, 1, 0.3);
    lining.position.set(0, EAR_H * 0.44, 0.022);
    pivot.add(lining);
    ears.push(pivot);
  }

  // --- The wings: faceted leather on the shoulders, the finger bones a
  // few-sided section over them, knuckle claws at the wrist and each finger
  // tip, and the hooked thumb. The right wing is the one that rakes (the
  // weapon the combo swings).
  const wings = [];
  const BONES = [
    [[0, 0.05], WRIST],
    [WRIST, FINGERS[0]],
    [WRIST, FINGERS[1]],
    [WRIST, FINGERS[2]],
  ];
  const thumbGeo = sharedGeo('facet:bat-thumb', () => new ConeGeometry(0.014, 0.04, 4));
  [-1, 1].forEach((side, wi) => {
    const shoulder = new Group();
    shoulder.position.set(side * 0.15, SHOULDER_Y, -0.05);
    body.add(shoulder);
    const flap = new Group();
    shoulder.add(flap);
    const memGeo = sharedGeo(`facet:bat-wing${side}`, () => {
      const g = new ExtrudeGeometry(wingShape(side), { depth: 0.014, bevelEnabled: false, curveSegments: 4 });
      g.translate(0, 0, -0.007);
      return facetize(g, { jitter: 0.1, seed: 521 + wi });
    });
    flap.add(fpart(memGeo, leatherMat));
    for (const [[x0, y0], [x1, y1]] of BONES) {
      const ax = x0 * side * WING;
      const ay = y0 * WING;
      const bx = x1 * side * WING;
      const by = y1 * WING;
      const len = Math.hypot(bx - ax, by - ay);
      const boneGeo = sharedGeo(`facet:bat-bone${len.toFixed(3)}`, () => facetize(new CylinderGeometry(0.008, 0.011, len, 4), { jitter: 0.04, seed: 525 }));
      const bone = new Mesh(boneGeo, furDarkMat);
      bone.position.set((ax + bx) / 2, (ay + by) / 2, 0.009);
      bone.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
      flap.add(bone);
    }
    const knuckles = placeRow(plate, boneMat, 4, (i, m) => {
      const [x, y] = i === 0 ? WRIST : FINGERS[i - 1];
      P.set(x * side * WING, y * WING, 0.01);
      X.set(1, 0, 0);
      Y.set(0, 0, 1);
      Z.set(0, -1, 0);
      setTRS(m, P, X, Y, Z, 0.028, 0.016, 0.022);
    }, { name: `bat-knuckles${wi}`, seed: 527 + wi });
    flap.add(knuckles);
    const thumb = new Mesh(thumbGeo, boneMat);
    thumb.position.set(WRIST[0] * side * WING, (WRIST[1] + 0.02) * WING, 0.01);
    thumb.rotation.z = -side * 0.5;
    flap.add(thumb);
    wings.push({ side, shoulder, flap });
  });
  const [wingL, wingR] = wings;
  // The named points (B8): the hand at the raking wing's wrist, the tip at
  // its wing tip, where the claws cut.
  const hand = namedPoint(wingR.flap, 'hand', WRIST[0] * WING, WRIST[1] * WING, 0);
  const tip = namedPoint(wingR.flap, 'tip', FINGERS[0][0] * WING, FINGERS[0][1] * WING, 0);

  // --- Little clawed feet.
  const pawGeo = sharedGeo('facet:paw', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 91 }));
  const HOME = [new Vector3(-0.1, 0.04, 0.13), new Vector3(0.1, 0.04, 0.13)];
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(pawGeo, furDarkMat);
    foot.scale.set(0.05, 0.035, 0.065);
    foot.position.copy(HOME[i]);
    rig.add(foot); // feet stay planted: they do not inherit the torso lean
    feet.push(foot);
  }

  // ------------------------------------------------------------------------
  // Locked feet and the blows (the hero core: render/facet/hero.js). The
  // raking side's foot (+X) leads every lunge.
  // ------------------------------------------------------------------------
  const lock = createFootLock({ rig, feet, home: HOME, lunge: { lead: 1, reach: 0.14, brace: 0.03 } });
  const atk = createAttackClock({ pack: PACK, hits: HITS, abilities: MOVES, skillAbility, window: COMBO_WINDOW });
  let lastT = null;
  const live = PACK.make();
  const lagged = PACK.make();
  const led = PACK.make();
  const idle = PACK.make();
  const walk = {};

  let drawnRws = REST.rws;
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
    // the raking wing's sweep (weaponField 'rws'), as drawn: it trails the hips
    swing: () => drawnRws,
    parts: { torso, head, weapon: wingR.shoulder, wing: wingR.shoulder },
  };

  // A wing: sweep s round the front, lift l, spread o (0 folded: smaller,
  // the membrane tipped in like a cloak), a beat on top. Euler XYZ: the
  // lift turns it in its own plane first, then the sweep.
  function setWing(w, s, l, o, beat, t) {
    w.shoulder.rotation.set(0, -w.side * s, w.side * (l + beat));
    w.flap.rotation.x = 0.15 * (1 - o) + 0.06 * Math.sin(t * 1.6 + w.side);
    w.flap.scale.setScalar(0.8 + 0.2 * Math.max(0, Math.min(1, o)));
  }

  function apply(Pz, t, fallSign, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const upright = 1 - Pz.collapse;

    const walking = Pz.collapse < 0.04 && clip === 'walk';
    atk.setBase({
      pitch: walking ? 0 : torso.rotation.x,
      yaw: walking ? 0.4 * (walk.twist || 0) * upright : torso.rotation.y,
      roll: walking ? 0 : torso.rotation.z,
      sw: rig.scale.x,
      sh: rig.scale.y,
    });
    atk.advance(dt, clip);
    const attacking = atk.active && clip !== 'downed';
    // The hips lead, the wings trail (sampled a frame apart on one timeline).
    if (attacking) atk.sample(live, led, lagged);

    const locked = Pz.collapse < 0.04;
    if (locked) walkBody(lock, { walkSpeed: WALK_SPEED }, walk);
    else walk.dy = walk.twist = walk.pitch = walk.roll = 0;
    const walkBob = clip === 'walk' ? Pz.bob * upright * 0.6 : 0;
    if (attacking) {
      torso.rotation.y = (led.yaw + walk.twist * 0.6) * upright;
      torso.rotation.x = leanOf(led.pitch + walk.pitch) * upright;
      torso.rotation.z = (led.roll + walk.roll) * upright;
      rig.position.x = live.rx * upright;
      rig.position.y += (live.ry + live.hop + walk.dy) * upright - walkBob;
      rig.position.z += live.rz * upright;
      rig.scale.set(live.sw, live.sh, live.sw);
    } else {
      rig.position.x = 0;
      if (locked && clip === 'walk') {
        rig.position.y += walk.dy * upright - walkBob;
        torso.rotation.x = walk.pitch * upright;
        torso.rotation.y = walk.twist * upright;
        torso.rotation.z = walk.roll * upright;
      }
    }
    // The recoil off a connect (B3): a rig-only shove and lean back after
    // the held contact; the body never moves.
    const rc = atk.recoil();
    if (rc > 0) {
      rig.position.z -= RECOIL.shove * rc * upright;
      torso.rotation.x -= RECOIL.lean * rc * upright;
    }
    if (attacking || rc > 0 || (locked && clip === 'walk')) {
      head.rotation.x = -torso.rotation.x * 0.88;
      head.rotation.y = -torso.rotation.y * 0.5 * upright;
    }
    head.rotation.z = -torso.rotation.z * 0.45 * upright;
    const sp = atk.spawn();
    if (sp !== 1) rig.scale.multiplyScalar(sp);

    // The wings and the head: a blow places them (a frame behind the hips);
    // otherwise the stance, half open and beating on the walk, flared with
    // one hard beat on the classic's generic cast, shut when he falls.
    let S;
    let beat = 0;
    if (attacking) S = lagged;
    else {
      S = PACK.copy(idle, REST);
      const lift = Math.max(0, Pz.prop);
      const wind = Math.min(0, Pz.prop);
      const stride = Math.min(1, Math.abs(Pz.stride) * 1.6);
      const open = Math.max(0, Math.min(1, lift * 1.15 + stride * 0.35 - wind * 0.4));
      for (const f of ['rws', 'lws']) S[f] += 0.7 * open;
      for (const f of ['rwl', 'lwl']) S[f] += 1.05 * open;
      S.rwo = S.lwo = open;
      beat = Math.sin(t * (lift > 0.1 ? 22 : 15)) * (0.32 * lift + 0.22 * stride);
      S.ear = 0;
    }
    drawnRws = S.rws;
    const shut = Pz.collapse;
    setWing(wingR, S.rws * (1 - shut) + REST.rws * shut, S.rwl * (1 - shut) + REST.rwl * shut, S.rwo * (1 - shut), beat * (1 - shut), t);
    setWing(wingL, S.lws * (1 - shut) + REST.lws * shut, S.lwl * (1 - shut) + REST.lwl * shut, S.lwo * (1 - shut), beat * (1 - shut), t);
    // the bite: the head darts in and dips its muzzle (drawn back: up)
    head.position.set(0, HEAD_C - 0.015 * S.bite * upright, 0.06 * S.bite * upright);
    head.rotation.x += 0.08 * S.bite * upright;

    // Ears prick with the idle sway, splay on the stride, flare on a blow.
    ears.forEach((e, k) => {
      const side = k === 0 ? -1 : 1;
      e.rotation.z = side * (-0.5 - 0.1 * Pz.ear - 0.05 * Math.abs(Pz.stride) - 0.18 * S.ear) + side * Pz.collapse * 0.5;
      e.rotation.x = -0.08 + 0.12 * Pz.ear - 0.15 * S.ear;
    });

    lock.step(dt, attacking ? live : REST, locked && sp === 1, !!atk.override && dt <= 0);
    if (locked && clip === 'walk' && sp === 1) lock.place();
    void fallSign;
  }

  return {
    apply,
    cue: atk.cue,
    hold: atk.hold,
    comboHitOf: atk.comboHitOf,
    atContact: atk.atContact,
    points: { hand, tip },
    tip,
    lab,
    torso,
    head,
    basePitch: 0.04,
    metrics: {
      standHeight: HEAD_C + 0.13 + EAR_H,
      earTopY: HEAD_C + 0.13 + EAR_H,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.24,
      ringRadius: 0.46,
      hipY: HIP,
    },
  };
}

// The model lab's basic combo: three blows at the Duskwing's real cadence
// (ALLY_CLASSES.duskwing.attackIntervalTicks in sim/allies.js: 0.3 s; the
// heroes probe checks the two agree), each contact held as the hitstop
// holds it. Pure in t, so it rewinds.
export const SWING_SEC = 0.3;
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC });

// The Duskwing in the model-standard registry (render/facet/heroes.js).
export const DUSKWING_SPEC = Object.freeze({
  id: 'duskwing',
  label: 'Duskwing',
  build: buildDuskwingFacet,
  hits: HITS,
  moves: MOVES,
  skillAbility,
  swingSec: SWING_SEC,
  comboLab: COMBO_LAB,
  ranged: false,
  walkSpeed: WALK_SPEED,
  weaponField: 'rws',
  lab: {
    abilities: [
      ['combo', 'Basic combo'],
      ['dive', 'Dusk Dive'],
      ['bite', 'Bloodbite'],
      ['night', 'Nightfall'],
      ['screech', 'Echo Screech'],
      ['rake', 'Talon Rake'],
      ['swarm', 'Bat Swarm'],
      ['veil', 'Shadow Veil'],
      ['flit', 'Flit'],
      ['beat', 'Night Wings'],
      ['spawn', 'Spawn'],
    ],
    frame: { y: 0.5, z: 0, dist: 3.4, speed: 2.9, loop: 2.2, side: 1.3 },
    cues: {
      strike: { sound: 'dk_nip', pitch: 1, fx: 'flash' },
      finisher: { sound: 'dk_bite', pitch: 1, fx: ['flash', 'star'], size: 1.5 },
      dive: { sound: 'dk_land', pitch: 1, fx: ['ring', 'star'], size: 1.3 },
      bite: { sound: 'dk_bite', pitch: 1, fx: ['flash', 'star'], size: 1.2 },
      night: { sound: 'dk_night', pitch: 1, fx: 'ring', size: 1.5 },
      screech: { sound: 'dk_screech', pitch: 1, fx: ['ring', 'flash'], size: 1.2 },
      rake: { sound: 'dk_rake', pitch: 1, fx: ['flash', 'star'], size: 1.3 },
      swarm: { sound: 'dk_swarm', pitch: 1, fx: 'star', size: 1.2 },
      veil: { sound: 'dk_veil', pitch: 1, fx: 'ring', size: 1.2 },
      flit: { sound: 'dk_flit', pitch: 1, fx: 'ring' },
      beat: { sound: 'dk_sip', pitch: 0.9, fx: 'ring', size: 1.3 },
    },
  },
});
