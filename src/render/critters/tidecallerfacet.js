// TIDECALLER, MODEL STANDARD (docs/MODEL_STANDARD.md). The chibi river otter
// of tidecaller.js (docs/TIDECALLER.md) in the faceted look, laid ON TOP of
// her: the same long low body stretched front to back, the thick tapering
// tail trailing along the ground behind (the party's only mass that runs
// backwards), the tall reed staff topped with a shell standing taller than
// her head, the cream throat and muzzle, small low ears, the river-blue sash,
// the dripping satchel and the conch on its cord. What changes:
//
//   * every mass is faceted (render/facet/material.js): a nine-sided coat, a
//     low-poly skull, faceted ears, muzzle, tail and shell; the reed a
//     six-sided section;
//   * detail from the parts kit (render/facet/kit.js): a ruff of fur tufts at
//     the throat, a string of small shells along the sash, kelp streamers
//     hanging under the staff's shell, wrapped bindings on the grip, the
//     satchel's flap and toggles, fur ridges down the tail;
//   * a THREE-CAST STAFF COMBO on the basic attack (Kesh's animation
//     template), at her 0.35 s cadence: a thrust that flings the water off
//     the shell, a wide side sweep, then the finisher, a hop and an
//     overhead slam with the staff. Each cast's follow-through settles into
//     the next wind-up, the hips lead and the staff trails a frame behind,
//     and the free paw throws the water with the staff;
//   * eight ability timelines for her eleven skills: Bolt, Jet, Swirl,
//     Squall, Breaker, Tidepool, Ripple Step and Bubble Ward;
//   * LOCKED FEET on the hero core (render/facet/hero.js).
//
// Same contract as buildTidecaller (apply, torso, head, basePitch, metrics),
// plus `cue(kind, ev)`, `hold(dt)`, `comboHitOf(ev)`, `points` and `lab`.
// Render only: attack timing, damage and the sim are untouched.
import { CapsuleGeometry, ConeGeometry, CylinderGeometry, Euler, Group, LatheGeometry, Mesh, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { exactHex, faceDecal, faceMarkings, mix } from './common.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { placeRow, plateGeometry, setTRS, wedgeGeometry } from '../facet/kit.js';
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
  leanOf,
  namedPoint,
  posePack,
  SHOT,
  walkBody,
} from '../facet/hero.js';

// The classic otter's measures (tidecaller.js), unchanged.
const HIP = 0.15;
const HEM = 0.022;
const HEAD_C = 0.64;
const HEAD_R = 0.255;
const SX = 1.04, SY = 0.94, SZ = 0.98;
const STAFF_LEN = 1.02;
const COAT = [
  [0, HEM],
  [0.16, HEM],
  [0.2, 0.05],
  [0.215, 0.14],
  [0.205, 0.26],
  [0.18, 0.36],
  [0.14, 0.43],
  [0.1, 0.47],
  [0, 0.49],
];
const COAT_D = 1.14; // the coat stretched front to back: the long low body
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

// ALLY_CLASSES.tidecaller.moveSpeed (u/s): full walk lean at full speed
const WALK_SPEED = 2.5;
// Basic attack: a cast inside this window of the last one is the next cast.
// She casts every 0.35 s (ALLY_CLASSES.tidecaller.attackIntervalTicks), so
// the window is a little under three casts.
export const COMBO_WINDOW = 0.9;
// Her bolt leaves on the press (the sim's tick): one frame to cock the
// staff, the fling in 1.5 frames (B1, B2, B4); the follow-through and the
// settle into the next wind-up fit the 0.35 s.
const TIMING = Object.freeze({ ...HIT_TIMING, wind: FRAME, strike: 1.5 * FRAME, over: 2 * FRAME, settle: 4 * FRAME, recover: 0.35 });

// --- Key poses (body space; +X is the staff side, +Z the facing). The body
// fields are the hero core's. The staff: px, py, pz its foot (where the reed
// starts, the grip paw a third of the way up); prx its pitch (+ tips the
// shell forward toward the aim), prz its side lean (- leans the shell out
// to the staff side; the keys keep it outboard of the face). ox, oy, oz the free paw, which
// throws the water with the staff. The hips turn the staff shoulder forward
// through a cast (their yaw goes negative), a small turn so a hit taken
// mid-cast lets go inside the no-cut bar.
const PACK = posePack({ px: 0.29, py: 0.12, pz: 0.1, prx: 0, prz: -0.12, ox: -0.17, oy: 0.34, oz: 0.12 });
const { REST, K } = PACK;
// Cast 1, STAFF FLING: the shell cocked back over the shoulder, then the
// staff swung forward and out to the staff side (clear of the face, Kesh's
// pick), the free paw pushing after the water.
const A1 = K({ yaw: -0.08, pitch: -0.04, rz: -0.02, sw: 0.98, sh: 1.03, px: 0.29, py: 0.2, pz: 0.02, prx: -0.3, prz: -0.25, ox: -0.12, oy: 0.38, oz: 0.2 });
const S1 = K({ yaw: -0.2, pitch: 0.1, rz: 0.03, sw: 1.02, sh: 0.98, px: 0.31, py: 0.2, pz: 0.2, prx: 0.55, prz: -0.6, ox: -0.05, oy: 0.42, oz: 0.34 });
const O1 = K({ yaw: -0.18, pitch: 0.08, rz: 0.02, px: 0.31, py: 0.19, pz: 0.19, prx: 0.5, prz: -0.55, ox: -0.06, oy: 0.4, oz: 0.3 });
// Cast 2, SIDE SWEEP: the staff laid out wide to the staff side, then swept
// up and forward past the shoulder (the shell kept outboard of the face),
// the tail swinging against it.
const A2 = K({ yaw: -0.1, pitch: 0.04, roll: 0.04, rx: 0.02, sw: 1.04, sh: 0.96, px: 0.3, py: 0.16, pz: 0.0, prx: -0.2, prz: -0.5, ox: -0.15, oy: 0.36, oz: 0.16 });
const S2 = K({ yaw: -0.26, pitch: 0.1, roll: -0.04, rx: -0.02, rz: 0.03, sw: 0.98, sh: 1.03, px: 0.26, py: 0.18, pz: 0.18, prx: 0.45, prz: -0.04, ox: -0.08, oy: 0.4, oz: 0.3 });
const O2 = K({ yaw: -0.24, pitch: 0.08, roll: -0.05, rx: -0.025, rz: 0.02, sw: 0.99, sh: 1.02, px: 0.26, py: 0.18, pz: 0.17, prx: 0.42, prz: -0.03, ox: -0.09, oy: 0.39, oz: 0.28 });
// Cast 3, OVERHEAD SLAM (the finisher, the biggest: B6): the staff raised
// back over the head, up on the toes; then a hop and the staff brought down
// forward and out on the staff side (clear of the face), stretched tall at
// the release, landing squashed.
const A3 = K({ yaw: -0.1, pitch: -0.14, rz: -0.03, sw: 0.96, sh: 1.06, px: 0.28, py: 0.3, pz: -0.04, prx: -0.55, prz: -0.3, ox: -0.1, oy: 0.5, oz: 0.1 });
const S3 = K({ yaw: -0.24, pitch: 0.16, rz: 0.06, hop: 0.13, sw: 0.93, sh: 1.12, px: 0.31, py: 0.24, pz: 0.22, prx: 0.95, prz: -0.7, ox: -0.04, oy: 0.44, oz: 0.34 });
const O3 = K({ yaw: -0.22, pitch: 0.12, rz: 0.07, hop: 0, sw: 1.1, sh: 0.9, px: 0.31, py: 0.16, pz: 0.2, prx: 0.85, prz: -0.62, ox: -0.05, oy: 0.4, oz: 0.3 });
// The finisher's flight: the hop and the stretch fall into the landing
// squash with gravity, so she is airborne and stretched at the release and
// lands squashed at the end of the overshoot.
const LAND = ['hop', 'sw', 'sh'];
function landing(out, s) {
  if (s.id !== 'overshoot') return;
  const k = s.k * s.k;
  for (const f of LAND) out[f] = S3[f] + (O3[f] - S3[f]) * k;
}
const HITS = createCombo(
  PACK,
  [
    { label: 'staff fling', from: A1, strike: S1, over: O1 },
    { label: 'side sweep', from: A2, strike: S2, over: O2 },
    { label: 'overhead slam', from: A3, strike: S3, over: O3, extra: landing },
  ],
  { window: COMBO_WINDOW, timing: TIMING, recoil: false }
);
export const TIDECALLER_HITS = HITS;

// --- Abilities. In game a skill enters its timeline one frame before its
// release (the press is instant, BUILD_BRIEF §6); the lab plays the whole
// gather. Each settles into the stance with one small overshoot.
const breathe = (out, s) => {
  if (s.id === 'hold') out.ry += -0.008 * Math.sin(s.k * Math.PI);
};
// Bolt (Riverbolt): the staff drawn back with both paws, then thrust at the
// target.
const G_BOLT = K({ yaw: -0.06, pitch: -0.06, sw: 1.03, sh: 0.97, px: 0.28, py: 0.2, pz: 0.0, prx: -0.25, prz: -0.12, ox: 0.06, oy: 0.4, oz: 0.12 });
const S_BOLT = K({ yaw: -0.2, pitch: 0.14, sw: 0.96, sh: 1.05, step: 0.5, px: 0.3, py: 0.22, pz: 0.24, prx: 0.7, prz: -0.5, ox: 0.08, oy: 0.44, oz: 0.36 });
// Jet (Torrent): braced wide, the staff levelled at the target and held
// while the jet runs, the body shuddering with it.
const G_JET = K({ yaw: -0.08, pitch: -0.04, sw: 1.06, sh: 0.94, px: 0.28, py: 0.2, pz: 0.08, prx: 0.2, prz: -0.12, ox: -0.06, oy: 0.4, oz: 0.2 });
const S_JET = K({ yaw: -0.18, pitch: 0.1, sw: 1.08, sh: 0.93, step: 0.4, px: 0.26, py: 0.24, pz: 0.22, prx: 1.15, prz: -0.04, ox: 0.04, oy: 0.46, oz: 0.34 });
const jet = (out, s) => {
  if (s.id === 'hold') {
    const w = Math.sin(18 * Math.PI * s.k) * (1 - s.k);
    out.prx += 0.03 * w;
    out.sw += 0.012 * w;
    out.rz -= 0.01 * Math.abs(w);
  }
};
// Swirl (Undertow, Whirlpool): the staff dipped and stirred in a circle
// over the spot, then planted.
const G_SWIRL = K({ yaw: 0.04, pitch: 0.06, sw: 1.02, sh: 0.98, px: 0.28, py: 0.18, pz: 0.12, prx: 0.4, prz: -0.25, ox: -0.12, oy: 0.36, oz: 0.2 });
const F_SWIRL = K({ yaw: -0.06, pitch: 0.1, sw: 1.03, sh: 0.97, px: 0.27, py: 0.18, pz: 0.16, prx: 0.5, prz: -0.15, ox: -0.1, oy: 0.36, oz: 0.24 });
const S_SWIRL = K({ yaw: -0.12, pitch: 0.12, sw: 1.08, sh: 0.92, step: 0.4, px: 0.26, py: 0.14, pz: 0.22, prx: 0.6, prz: -0.1, ox: -0.12, oy: 0.34, oz: 0.24 });
const swirl = (out, s) => {
  if (s.id === 'stir') {
    const a = 2 * Math.PI * 1.5 * s.k;
    const env = Math.sin(Math.PI * s.k);
    out.prx += 0.18 * Math.sin(a) * env;
    out.prz += 0.18 * Math.cos(a) * env - 0.18 * env;
    out.yaw += 0.05 * Math.sin(a) * env;
  }
  breathe(out, s);
};
// Squall (Rain Squall): the staff raised high beside her to the sky, the free
// paw up with it, then brought down to the side.
const G_SQUALL = K({ yaw: -0.06, pitch: -0.05, sw: 0.96, sh: 1.06, px: 0.3, py: 0.26, pz: 0.17, prx: 0.3, prz: -0.17, ox: -0.14, oy: 0.6, oz: 0.12 });
const S_SQUALL = K({ yaw: -0.08, pitch: -0.08, sw: 0.94, sh: 1.08, px: 0.3, py: 0.3, pz: 0.18, prx: 0.34, prz: -0.19, ox: -0.14, oy: 0.64, oz: 0.14 });
// Breaker (Breaker, Crashing Wave, Maelstrom): a crouch with the staff
// swung back low, then a wide sweep up and over as the wave breaks.
const G_BREAK = K({ yaw: 0.06, pitch: 0.12, rz: -0.03, sw: 1.1, sh: 0.9, px: 0.3, py: 0.14, pz: -0.02, prx: -0.3, prz: -0.45, ox: -0.14, oy: 0.3, oz: 0.14 });
const S_BREAK = K({ yaw: -0.22, pitch: -0.08, rz: 0.04, hop: 0.06, sw: 0.94, sh: 1.08, step: 0.6, px: 0.3, py: 0.24, pz: 0.22, prx: 0.8, prz: -0.5, ox: -0.04, oy: 0.46, oz: 0.34 });
// Tidepool (the aura): the staff planted upright beside her, the free paw
// spread low over the water, a slow breath.
const G_POOL = K({ yaw: 0.04, pitch: 0.06, sw: 1.02, sh: 0.98, px: 0.3, py: 0.08, pz: 0.12, prx: 0.06, prz: -0.06, ox: -0.2, oy: 0.26, oz: 0.24 });
const S_POOL = K({ yaw: -0.04, pitch: 0.04, sw: 1.03, sh: 0.97, px: 0.3, py: 0.06, pz: 0.12, prx: 0.04, prz: -0.06, ox: -0.24, oy: 0.24, oz: 0.26 });
// Ripple Step (the vault): a crouch, a hop off the water with the staff
// trailing, and a landing.
const G_STEP = K({ yaw: 0.02, pitch: 0.12, sw: 1.1, sh: 0.9, px: 0.28, py: 0.14, pz: 0.06, prx: 0.15, prz: -0.15, ox: -0.14, oy: 0.32, oz: 0.14 });
const L_STEP = K({ yaw: -0.04, pitch: -0.12, rz: -0.06, hop: 0.16, air: 1, sw: 0.93, sh: 1.1, px: 0.28, py: 0.22, pz: 0.0, prx: -0.25, prz: -0.2, ox: -0.16, oy: 0.42, oz: 0.06 });
const D_STEP = K({ yaw: -0.04, pitch: 0.1, rz: -0.04, sw: 1.12, sh: 0.9, px: 0.28, py: 0.14, pz: 0.12, prx: 0.1, prz: -0.12, ox: -0.14, oy: 0.32, oz: 0.16 });
// Bubble Ward: the staff held upright at the shoulder, the free paw out flat
// as the bubble rises off it.
const G_WARD = K({ yaw: 0.02, pitch: -0.04, sw: 0.98, sh: 1.03, px: 0.29, py: 0.18, pz: 0.14, prx: 0.1, prz: -0.06, ox: -0.08, oy: 0.4, oz: 0.3 });
const S_WARD = K({ yaw: -0.06, pitch: -0.06, sw: 0.97, sh: 1.04, px: 0.29, py: 0.2, pz: 0.15, prx: 0.12, prz: -0.05, ox: -0.04, oy: 0.52, oz: 0.36 });

const LEAD_IN = FRAME; // a skill enters one frame before its release
function moveOf(id, label, keys, opts) {
  const tl = [];
  let t = 0;
  for (const k of keys) {
    tl.push([k.id, t]);
    t += k.dur;
  }
  const at = (pid) => tl.find(([p]) => p === pid)[1];
  const cues = (opts.cueAt || []).map(([pid, cue]) => ({ at: at(pid), id: cue }));
  return createMove(PACK, id, label, keys, { lead: LEAD_IN, ...opts, cues });
}
export const TIDECALLER_MOVES = Object.freeze({
  bolt: moveOf(
    'bolt',
    'Bolt',
    [
      { id: 'gather', label: 'draw the staff back', dur: 0.16, to: G_BOLT, ease: 'out' },
      { id: 'release', label: 'thrust', dur: 1.5 * FRAME, to: S_BOLT, ease: 'in' },
      { id: 'hold', label: 'follow-through held', dur: 0.14, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'bolt']] }
  ),
  jet: moveOf(
    'jet',
    'Jet',
    [
      { id: 'gather', label: 'brace and level', dur: 0.14, to: G_JET, ease: 'out' },
      { id: 'release', label: 'the jet', dur: 1.5 * FRAME, to: S_JET, ease: 'in' },
      { id: 'hold', label: 'held through the jet', dur: 0.3, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: jet, cueAt: [['hold', 'jet']] }
  ),
  swirl: moveOf(
    'swirl',
    'Swirl',
    [
      { id: 'dip', label: 'dip the staff', dur: 0.12, to: G_SWIRL, ease: 'out' },
      { id: 'stir', label: 'stir', dur: 0.3, to: F_SWIRL, ease: 'inOut' },
      { id: 'release', label: 'plant', dur: 2 * FRAME, to: S_SWIRL, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.12, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'stir', extra: swirl, cueAt: [['hold', 'swirl']] }
  ),
  squall: moveOf(
    'squall',
    'Squall',
    [
      { id: 'raise', label: 'staff to the sky', dur: 0.2, to: G_SQUALL, ease: 'out' },
      { id: 'release', label: 'call the rain', dur: 2 * FRAME, to: S_SQUALL, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.22, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.4, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'squall']] }
  ),
  breaker: moveOf(
    'breaker',
    'Breaker',
    [
      { id: 'gather', label: 'crouch, staff back low', dur: 0.16, to: G_BREAK, ease: 'out' },
      { id: 'release', label: 'sweep up and over', dur: 2 * FRAME, to: S_BREAK, ease: 'in' },
      { id: 'hold', label: 'the wave breaks', dur: 0.16, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.38, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'breaker']] }
  ),
  pool: moveOf(
    'pool',
    'Tidepool',
    [
      { id: 'plant', label: 'plant the staff', dur: 0.16, to: G_POOL, ease: 'out' },
      { id: 'spread', label: 'spread the water', dur: 0.3, to: S_POOL, ease: 'inOut' },
      { id: 'hold', label: 'hold', dur: 0.12, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'spread', entry: 'spread', extra: breathe, cueAt: [['spread', 'pool']] }
  ),
  step: moveOf(
    'step',
    'Ripple Step',
    [
      { id: 'crouch', label: 'crouch', dur: 0.1, to: G_STEP, ease: 'out' },
      { id: 'leap', label: 'hop off the water', dur: 0.1, to: L_STEP, ease: 'out' },
      { id: 'land', label: 'land', dur: 0.1, to: D_STEP, ease: 'in' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'land', entry: 'leap', cueAt: [['leap', 'step']] }
  ),
  ward: moveOf(
    'ward',
    'Bubble Ward',
    [
      { id: 'gather', label: 'staff up', dur: 0.14, to: G_WARD, ease: 'out' },
      { id: 'release', label: 'lift the bubble', dur: 2 * FRAME, to: S_WARD, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.16, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'ward']] }
  ),
});
const MOVES = TIDECALLER_MOVES;
// Which ability a Tidecaller skill plays: by the skill first
// (CLASS_SKILLS.tidecaller, all eleven), then by its shape.
export const TIDECALLER_SKILL_ABILITY = Object.freeze({
  riverbolt: 'bolt',
  torrent: 'jet',
  undertow: 'swirl',
  whirlpool: 'swirl',
  rain_squall: 'squall',
  breaker: 'breaker',
  crashing_wave: 'breaker',
  maelstrom: 'breaker',
  tidepool: 'pool',
  ripple_step: 'step',
  bubble_ward: 'ward',
});
const SHAPE_ABILITY = Object.freeze({ projectile: 'bolt', direct: 'ward', melee_arc: 'breaker', nova: 'breaker', ground_aoe: 'swirl', aura: 'pool' });
const skillAbility = (ev) => (ev && (TIDECALLER_SKILL_ABILITY[ev.skill] || SHAPE_ABILITY[ev.shape])) || 'bolt';
export const TIDECALLER_REST = REST;

// ---------------------------------------------------------------------------
// The rig
// ---------------------------------------------------------------------------
export function buildTidecallerFacet(rig, trackAccent) {
  const accent = CLASS_ACCENTS.tidecaller;
  const fur = mix(PALETTE.bruiseUmber, PALETTE.paleGold, 0.16);
  const furHex = fur.getHex();
  const furDarkHex = mix(fur, PALETTE.voidCharcoal, 0.3).getHex();
  const cream = PALETTE.bone; // Bone stays under the bloom threshold (Parchment glared)
  // The classic's reed leaned toward Pale Gold; weathered toward the warm
  // grey it keeps its brown and leaves amber to the damage numbers.
  const reedHex = mix(PALETTE.bruiseUmber, PALETTE.warmGrey, 0.42).getHex();
  const reedDarkHex = mix(reedHex, PALETTE.voidCharcoal, 0.25).getHex();
  const satchelHex = mix(accent, PALETTE.voidCharcoal, 0.3).getHex();
  const shellHex = mix(PALETTE.parchment, accent, 0.25).getHex();
  const kelpHex = mix(accent, PALETTE.voidCharcoal, 0.45).getHex();
  const waterHex = mix(PALETTE.signalBlue, PALETTE.parchment, 0.35).getHex();
  const cordHex = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.4).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  const furMat = facetMaterial(furHex);
  const furDarkMat = facetMaterial(furDarkHex);
  const creamMat = facetMaterial(cream);
  const sashMat = trackAccent(facetMaterial(accent));
  const satchelMat = trackAccent(facetMaterial(satchelHex));
  const shellMat = trackAccent(facetMaterial(shellHex));
  const kelpMat = trackAccent(facetMaterial(kelpHex));
  const reedMat = facetMaterial(reedHex);
  const reedDarkMat = facetMaterial(reedDarkHex);
  const cordMat = facetMaterial(cordHex);
  const waterMat = facetMaterial(waterHex);

  // --- The long low coat: nine sides, stretched front to back.
  const coatGeo = sharedGeo('facet:otter-coat', () => facetize(new LatheGeometry(COAT.map(([x, y]) => new Vector2(x, y)), 9), { jitter: 0.14, seed: 301 }));
  const coat = fpart(coatGeo, furMat);
  coat.scale.set(1, 1, COAT_D);
  body.add(coat);
  // The cream throat and belly, riding just outside the facets.
  const BELLY = [
    [0.212, 0.1],
    [0.214, 0.2],
    [0.198, 0.3],
    [0.168, 0.38],
    [0.133, 0.44],
  ];
  const bellyGeo = sharedGeo('facet:otter-belly', () => facetize(new LatheGeometry(BELLY.map(([x, y]) => new Vector2(x * 1.04, y)), 3, -0.62, 1.25), { jitter: 0.06, seed: 303 }));
  const belly = new Mesh(bellyGeo, creamMat);
  belly.scale.set(1, 1, COAT_D);
  body.add(belly);
  // The river-blue sash across the chest.
  const sashGeo = sharedGeo('facet:otter-sash', () => facetize(new TorusGeometry(0.205, 0.028, 4, 16), { jitter: 0.06, seed: 305 }));
  const sash = fpart(sashGeo, sashMat);
  sash.rotation.set(Math.PI / 2 - 0.15, 0.55, 0);
  sash.position.y = 0.3;
  sash.scale.set(1, COAT_D, 1);
  body.add(sash);
  sash.updateMatrix();

  const plate = plateGeometry();
  const wedge = wedgeGeometry();
  const P = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  // A string of small shells along the sash (sash space: on the ring).
  const SHELLS = 8;
  const sashShells = placeRow(plate, shellMat, SHELLS, (i, m) => {
    const a = -0.9 + (i / (SHELLS - 1)) * 1.8; // across the front half
    const ca = Math.cos(a + Math.PI / 2);
    const sa = Math.sin(a + Math.PI / 2);
    P.set(ca * 0.205, sa * 0.205, 0.03).applyMatrix4(sash.matrix);
    Y.set(ca, sa, 0).transformDirection(sash.matrix).normalize();
    Z.set(0, 0, 1).transformDirection(sash.matrix).normalize();
    X.crossVectors(Y, Z).normalize();
    setTRS(m, P, X, Z, Y, 0.042, 0.03, 0.02);
  }, { name: 'otter-shells', seed: 307, mottle: 0.05 });
  body.add(sashShells);
  // A ruff of fur tufts at the throat and nape.
  const RUFF = 10;
  const ruff = placeRow(wedge, furDarkMat, RUFF, (i, m) => {
    const phi = (i / RUFF) * 2 * Math.PI + 0.3;
    const y = 0.46;
    const r = coatR(y) * 1.18;
    P.set(Math.sin(phi) * r, y, Math.cos(phi) * r * COAT_D);
    Y.set(Math.sin(phi) * 0.6, -0.8, Math.cos(phi) * 0.6).normalize();
    X.set(Math.cos(phi), 0, -Math.sin(phi));
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.07, 0.085, 0.04);
  }, { name: 'otter-ruff', seed: 309, mottle: 0.06 });
  body.add(ruff);

  // The satchel on the left hip, with its flap and two toggles, and the
  // drip of water under it.
  const satchel = new Group();
  satchel.position.set(-0.2, 0.2, 0.06);
  satchel.rotation.z = 0.2;
  body.add(satchel);
  const bagGeo = sharedGeo('facet:otter-satchel', () => facetize(new CapsuleGeometry(0.07, 0.06, 2, 6), { jitter: 0.1, seed: 311 }));
  const bag = fpart(bagGeo, satchelMat);
  bag.scale.set(1, 0.9, 0.62);
  satchel.add(bag);
  const flap = placeRow(plate, satchelMat, 3, (i, m) => {
    P.set(-0.03 + i * 0.03, 0.04 - Math.abs(i - 1) * 0.008, 0.046);
    setTRS(m, P, X.set(1, 0, 0), Y.set(0, 1, 0), Z.set(0, 0, 1), 0.034, 0.05, 0.012);
  }, { name: 'otter-flap', seed: 313 });
  satchel.add(flap);
  const dripGeo = sharedGeo('facet:otter-drip', () => facetize(new SphereGeometry(0.018, 6, 4), { jitter: 0.06, seed: 315 }));
  const drip = new Mesh(dripGeo, waterMat);
  drip.scale.set(1, 1.5, 1);
  drip.position.set(-0.21, 0.11, 0.07);
  body.add(drip);

  // --- Head: round and a touch wide, small ears set low.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skullGeo = sharedGeo('facet:otter-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 321 }));
  const skull = fpart(skullGeo, furMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  const creamHex = exactHex(cream);
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        // the otter's pale muzzle and chin, wide and low
        ctx.fillStyle = creamHex;
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.8, S * 0.26, S * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.95, S * 0.2, S * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    })
  );
  const earGeo = sharedGeo('facet:otter-ear', () => facetize(new SphereGeometry(0.058, 7, 5), { jitter: 0.08, seed: 323 }));
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.19, 0.13, -0.04);
    const ear = fpart(earGeo, furDarkMat);
    ear.scale.set(1, 0.85, 0.55);
    pivot.add(ear);
    head.add(pivot);
    ears.push(pivot);
  }
  // The broad whiskered muzzle and the big dark nose.
  const snoutGeo = sharedGeo('facet:otter-snout', () => facetize(new SphereGeometry(0.095, 8, 6), { jitter: 0.08, seed: 325 }));
  const snout = fpart(snoutGeo, creamMat);
  snout.scale.set(1.15, 0.66, 0.8);
  snout.position.set(0, -0.11, SZ * HEAD_R * 0.78);
  head.add(snout);
  const noseGeo = sharedGeo('facet:otter-nose', () => facetize(new SphereGeometry(0.03, 6, 4), { jitter: 0.05, seed: 327 }));
  const nose = fpart(noseGeo, facetMaterial(PALETTE.voidCharcoal), false);
  nose.scale.set(1.3, 0.8, 1);
  nose.position.set(0, -0.075, SZ * HEAD_R * 0.78 + 0.07);
  head.add(nose);
  const whiskerGeo = sharedGeo('facet:otter-whisker', () => new CylinderGeometry(0.0045, 0.0045, 0.13, 4));
  for (const side of [-1, 1]) {
    for (const k of [0, 1]) {
      const wh = new Mesh(whiskerGeo, creamMat);
      wh.rotation.z = Math.PI / 2 + side * (0.12 + k * 0.16);
      wh.position.set(side * 0.13, -0.11 - k * 0.02, SZ * HEAD_R * 0.78 + 0.02);
      head.add(wh);
    }
  }
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.088, eyeH: 0.11, spread: 0.2, drop: 0.55 }));

  // The conch on its cord at the throat.
  const conchGeo = sharedGeo('facet:otter-conch', () => facetize(new ConeGeometry(0.04, 0.09, 6), { jitter: 0.1, seed: 329 }));
  const conch = fpart(conchGeo, creamMat);
  conch.rotation.set(0.3, 0, 2.2);
  conch.position.set(0.04, 0.42, 0.205);
  body.add(conch);

  // --- The tail: three tapering faceted segments trailing along the ground,
  // each with a pair of fur ridges along its back.
  const tailRoot = new Group();
  tailRoot.position.set(0, 0.13, -0.2);
  body.add(tailRoot);
  const tailSegs = [];
  let parent = tailRoot;
  const TAIL = [
    [0.075, 0.13],
    [0.06, 0.12],
    [0.042, 0.11],
  ];
  TAIL.forEach(([r, len], i) => {
    const pivot = new Group();
    parent.add(pivot);
    const segGeo = sharedGeo(`facet:otter-tail${i}`, () => facetize(new CapsuleGeometry(r, len, 2, 6), { jitter: 0.08, seed: 331 + i }));
    const seg = fpart(segGeo, furMat);
    seg.rotation.x = Math.PI / 2 + 0.25;
    seg.position.set(0, -0.02, -len * 0.55);
    pivot.add(seg);
    const ridges = placeRow(wedge, furDarkMat, 3, (j, m) => {
      const z = -len * (0.2 + 0.35 * j);
      P.set(0, -0.02 + r * 0.92 - 0.03 * (j / 2), z);
      Y.set(0, 0.85, -0.5).normalize();
      X.set(1, 0, 0);
      Z.crossVectors(X, Y).normalize();
      setTRS(m, P, X, Y, Z, r * 0.9, 0.05, 0.035);
    }, { name: `otter-tail-ridge${i}`, seed: 335 + i, mottle: 0.05 });
    pivot.add(ridges);
    const next = new Group();
    next.position.set(0, -0.045, -len * 0.95);
    pivot.add(next);
    tailSegs.push(pivot);
    parent = next;
  });

  // --- The staff: a tall six-sided reed with three nodes, the cupped shell
  // and the bead of water on top, kelp streamers under the shell and a
  // bound grip.
  const staff = new Group();
  body.add(staff);
  const shaftGeo = sharedGeo('facet:otter-reed', () => facetize(new CylinderGeometry(0.019, 0.023, STAFF_LEN, 6), { jitter: 0.06, seed: 341 }));
  const shaft = fpart(shaftGeo, reedMat);
  shaft.position.y = STAFF_LEN / 2;
  staff.add(shaft);
  const nodeGeo = sharedGeo('facet:otter-node', () => facetize(new CylinderGeometry(0.028, 0.028, 0.026, 6), { jitter: 0.06, seed: 343 }));
  for (const y of [0.58, 0.82]) {
    const node = fpart(nodeGeo, reedDarkMat, false);
    node.position.y = y;
    staff.add(node);
  }
  const bindings = placeRow(plate, cordMat, 4, (i, m) => {
    P.set(0, 0.29 + i * 0.045, 0);
    setTRS(m, P, X.set(1, 0, 0), Y.set(0, 1, 0), Z.set(0, 0, 1), 0.056, 0.014, 0.056);
  }, { name: 'otter-bindings', seed: 345 });
  staff.add(bindings);
  const shellGeo = sharedGeo('facet:otter-shell', () => facetize(new SphereGeometry(0.075, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), { jitter: 0.08, seed: 347 }));
  const shell = fpart(shellGeo, shellMat);
  shell.rotation.x = Math.PI;
  shell.position.y = STAFF_LEN + 0.05;
  staff.add(shell);
  const beadGeo = sharedGeo('facet:otter-bead', () => facetize(new SphereGeometry(0.042, 7, 5), { jitter: 0.06, seed: 349 }));
  const bead = new Mesh(beadGeo, waterMat);
  bead.position.y = STAFF_LEN + 0.07;
  staff.add(bead);
  const KELP = 5;
  const kelp = placeRow(wedge, kelpMat, KELP, (i, m) => {
    const a = (i / KELP) * 2 * Math.PI;
    P.set(Math.sin(a) * 0.05, STAFF_LEN - 0.03 - 0.02 * (i % 2), Math.cos(a) * 0.05);
    Y.set(Math.sin(a) * 0.25, -1, Math.cos(a) * 0.25).normalize();
    X.set(Math.cos(a), 0, -Math.sin(a));
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.03, 0.12 + 0.03 * (i % 2), 0.014);
  }, { name: 'otter-kelp', seed: 351, mottle: 0.05 });
  staff.add(kelp);
  const pawGeo = sharedGeo('facet:paw', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 91 }));
  const gripPaw = fpart(pawGeo, furDarkMat);
  gripPaw.scale.setScalar(0.056);
  gripPaw.position.set(0, 0.36, 0.035);
  staff.add(gripPaw);
  // The named points (B8): the hand on the grip, the tip at the shell
  // where the water leaves the staff.
  const hand = namedPoint(staff, 'hand', 0, 0.36, 0.03);
  const tip = namedPoint(staff, 'tip', 0, STAFF_LEN + 0.07, 0);
  const gripLocal = new Vector3(0, 0.36, 0.02);
  const gripBody = new Vector3();

  // --- Arms, the free paw and the webbed feet.
  const armL = facetArm(furMat, 0.05, 0.19, 353);
  armL.position.set(-0.2, 0.36, 0.08);
  body.add(armL);
  const armR = facetArm(furMat, 0.05, 0.19, 355);
  armR.position.set(0.2, 0.36, 0.07);
  body.add(armR);
  const freePaw = fpart(pawGeo, furDarkMat);
  freePaw.scale.setScalar(0.05);
  body.add(freePaw);

  const HOME = [new Vector3(-0.11, 0.046, 0.21), new Vector3(0.11, 0.046, 0.21)];
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(pawGeo, furDarkMat);
    foot.scale.set(0.074, 0.045, 0.074);
    foot.position.copy(HOME[i]);
    rig.add(foot); // feet stay planted: they do not inherit the torso lean
    feet.push(foot);
  }

  // ------------------------------------------------------------------------
  // Locked feet and the casts (the hero core: render/facet/hero.js). The
  // staff-side foot (+X) steps forward into a lunge.
  // ------------------------------------------------------------------------
  const lock = createFootLock({ rig, feet, home: HOME, lunge: { lead: 1, reach: 0.14, brace: 0.03 } });
  const atk = createAttackClock({ pack: PACK, hits: HITS, abilities: MOVES, skillAbility, window: COMBO_WINDOW, ranged: true });
  let lastT = null;
  const live = PACK.make();
  const lagged = PACK.make();
  const led = PACK.make();
  const idle = PACK.make();
  const walk = {};

  let drawnPrx = REST.prx;
  const lab = {
    abilities: MOVES,
    hits: HITS.map((h) => h.timeline),
    get override() {
      return atk.override;
    },
    // { kind: 'hit', n, t, fresh, shot? } | { kind: 'ability', id, t } |
    // { kind: 'spawn', t } | null
    set override(o) {
      atk.setOverride(o);
    },
    cue: atk.cue,
    clock: atk,
    feet: lock.report,
    // the staff's pitch (weaponField 'prx'), as drawn: it trails the hips
    swing: () => drawnPrx,
    parts: { torso, head, weapon: staff, staff },
  };
  const flatQ = new Quaternion();
  const flatE = new Euler();
  const flatP = new Vector3();

  function apply(Pz, t, fallSign, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const upright = 1 - Pz.collapse;

    ears[0].rotation.z = 0.25 * Pz.ear;
    ears[1].rotation.z = 0.25 * Pz.ear;

    // The body a cast takes over from and hands back to: the driver's clip
    // as the factory set it, or the walk (she casts on the move).
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
    // The caster's squash (B3, shots): 20/29/38% wider on steady fire and a
    // rig-only shove back off the cast, after the press.
    const shot = atk.shot();
    if (shot.sw !== 1 || shot.sh !== 1) {
      rig.scale.x *= shot.sw;
      rig.scale.y *= shot.sh;
      rig.scale.z *= shot.sw;
    }
    if (shot.shove > 0) rig.position.z -= SHOT.shove * shot.shove * upright;
    if (attacking || (locked && clip === 'walk')) {
      head.rotation.x = -torso.rotation.x * 0.88;
      head.rotation.y = -torso.rotation.y * 0.5 * upright;
    }
    head.rotation.z = -torso.rotation.z * 0.45 * upright;
    const sp = atk.spawn();
    if (sp !== 1) rig.scale.multiplyScalar(sp);

    // The tail sweeps side to side with the stride and the idle sway, each
    // segment a little later than the one before, and swings against the
    // hips' turn in a cast.
    const sway = Pz.tail * 0.5 + Pz.stride * 0.18 - (attacking ? torso.rotation.y * 0.8 : 0);
    tailSegs.forEach((s, i) => {
      s.rotation.y = sway * (0.6 + i * 0.35);
      s.rotation.x = -0.08 * i + Pz.collapse * 0.3;
    });

    // The staff: a cast places it (a frame behind the hips); otherwise the
    // stance, with the classic's generic cast (lift and lean) on top.
    let S;
    if (attacking) S = lagged;
    else {
      S = PACK.copy(idle, REST);
      const lift = Math.max(0, Pz.prop);
      const wind = Math.min(0, Pz.prop);
      S.py += 0.12 * lift + 0.03 * wind;
      S.pz += 0.08 * lift;
      S.prx += 0.42 * lift - 0.1 * wind;
      S.prz += -0.12 * lift;
      S.ox += 0.06 * lift;
      S.oy += 0.1 * lift;
      S.oz += 0.16 * lift + 0.04 * wind;
    }
    drawnPrx = S.prx;
    staff.position.set(S.px, S.py, S.pz);
    staff.rotation.set(S.prx, 0, S.prz);
    // Downed: the staff falls with her, lying beside her and never under her.
    const lay = Pz.collapse;
    if (lay > 0) {
      flatQ.setFromEuler(flatE.set(Math.PI / 2 - 0.2, 0, fallSign * 0.6));
      staff.quaternion.slerp(flatQ, lay);
      staff.position.lerp(flatP.set(0.32, 0.06, 0.1), lay);
    }
    staff.updateMatrix();
    aimArm(armR, gripBody.copy(gripLocal).applyMatrix4(staff.matrix));
    freePaw.position.set(S.ox, S.oy, S.oz);
    aimArm(armL, freePaw.position);

    drip.position.y = 0.11 - ((t * 0.6) % 1) * 0.06;

    lock.step(dt, attacking ? live : REST, locked && sp === 1, !!atk.override && dt <= 0);
    if (locked && clip === 'walk' && sp === 1) lock.place();
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
    basePitch: 0.03,
    metrics: {
      standHeight: REST.py + STAFF_LEN + 0.11,
      earTopY: HEAD_C + 0.2,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.25,
      ringRadius: 0.47,
      hipY: HIP,
    },
  };
}

// The model lab's basic combo: three casts at the Tidecaller's real cadence
// (ALLY_CLASSES.tidecaller.attackIntervalTicks in sim/allies.js: 0.35 s; the
// heroes probe checks the two agree). Pure in t, so it rewinds.
export const SWING_SEC = 0.35;
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC, ranged: true, label: 'Basic combo' });

// The Tidecaller in the model-standard registry (render/facet/heroes.js).
export const TIDECALLER_SPEC = Object.freeze({
  id: 'tidecaller',
  label: 'Tidecaller',
  build: buildTidecallerFacet,
  hits: HITS,
  moves: MOVES,
  skillAbility,
  swingSec: SWING_SEC,
  comboLab: COMBO_LAB,
  ranged: true,
  walkSpeed: WALK_SPEED,
  weaponField: 'prx',
  lab: {
    abilities: [
      ['combo', 'Basic combo'],
      ['bolt', 'Bolt'],
      ['jet', 'Jet'],
      ['swirl', 'Swirl'],
      ['squall', 'Squall'],
      ['breaker', 'Breaker'],
      ['pool', 'Tidepool'],
      ['step', 'Ripple Step'],
      ['ward', 'Bubble Ward'],
      ['spawn', 'Spawn'],
    ],
    frame: { y: 0.6, z: 0, dist: 3.6, speed: 2.5, loop: 2.2, side: 1.3 },
    cues: {
      strike: { sound: 'td_spit', pitch: 1, fx: 'flash' },
      finisher: { sound: 'td_splash', pitch: 0.9, fx: ['flash', 'star'], size: 1.5 },
      bolt: { sound: 'td_bolt', pitch: 1, fx: ['flash', 'star'], size: 1.2 },
      jet: { sound: 'td_jet', pitch: 1, fx: 'flash', size: 1.3 },
      swirl: { sound: 'td_swirl', pitch: 1, fx: 'ring' },
      squall: { sound: 'td_rain', pitch: 1, fx: 'pillar', size: 1.1 },
      breaker: { sound: 'td_wave', pitch: 1, fx: ['ring', 'star'], size: 1.3 },
      pool: { sound: 'td_puddle', pitch: 1, fx: 'ring', size: 1.4 },
      step: { sound: 'td_vault', pitch: 1, fx: 'ring' },
      ward: { sound: 'td_bubble', pitch: 1, fx: 'star', size: 1.2 },
    },
  },
});
