// ARCHER, MODEL STANDARD (docs/MODEL_STANDARD.md). The chibi hare of
// archer.js (BUILD_BRIEF §19.2) in the faceted look, laid ON TOP of her: the
// same tallest, thinnest column, the same very long upright ears (the party's
// only vertical double-spike), the same olive tunic with its Bone bib, the
// same blaze and painted face, the puff tail, and the bow as an open C held
// off to the side with its opening outboard (no string at rest: the negative
// space reads through the arc). What changes:
//
//   * every mass is faceted (render/facet/material.js): a nine-sided tunic, a
//     low-poly skull, six-sided ears with their inner blades, a faceted
//     muzzle and puff tail; the bow's limbs a four-sided section;
//   * detail from the parts kit (render/facet/kit.js): a feathered mantle of
//     notched plates round the shoulders, a quiver of five fletched arrows,
//     leather lacing down the bib, wrapped bindings on the grip and horn nocks
//     on the limb tips;
//   * a THREE-SHOT BOW COMBO on the basic attack (Kesh's animation template),
//     at her 0.4 s cadence: a quick loose side-on, a canted shot from a
//     crouch with the bow laid over, then the finisher, a leaping power shot
//     loosed at the top of a hop back. Each shot's follow-through settles
//     into the next draw (the paw comes back to the string), the hips lead
//     and the bow trails a frame behind. While she draws, the string comes
//     back to her paw and an arrow lies on the bow; on the release the arrow
//     leaves (the sim's own arrow takes over) and the paw flies back past
//     the ear;
//   * six ability timelines for her eleven skills: Power Shot, Fan, Vault
//     Shot, Sky Shot, Set Trap and Kestrel Watch;
//   * LOCKED FEET on the hero core (render/facet/hero.js).
//
// Same contract as buildArcher (apply, torso, head, basePitch, metrics),
// plus `cue(kind, ev)`, `hold(dt)`, `comboHitOf(ev)`, `points` and `lab`.
// Render only: attack timing, damage and the sim are untouched.
import { BufferGeometry, CapsuleGeometry, CylinderGeometry, Euler, Float32BufferAttribute, Group, LatheGeometry, Mesh, OctahedronGeometry, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three';
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

// The classic hare's measures (archer.js), unchanged.
const HIP = 0.17;
const HEM = 0.022;
const HEAD_C = 0.7458;
const HEAD_R = 0.2685;
const SX = 0.9, SY = 1.02, SZ = 0.94;
const EAR_TOP = 1.3;
const TUNIC = [
  [0, HEM],
  [0.135, HEM],
  [0.175, 0.045],
  [0.185, 0.13],
  [0.175, 0.27],
  [0.155, 0.38],
  [0.125, 0.45],
  [0.095, 0.5],
  [0, 0.53],
];
const TUNIC_W = 0.94; // the classic's x scale (her column is narrower than deep)
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

// The bow (bow space: the riser at the origin, the C in the XY plane bulging
// to +X with its tips back at TIP_X; an arrow lies along +X, nocked on the
// string between the tips). The classic's 160° arc.
const ARC_R = 0.27;
const ARC_SPAN = (160 * Math.PI) / 180;
const TIP_X = -ARC_R + Math.cos(ARC_SPAN / 2) * ARC_R;
const TIP_Y = Math.sin(ARC_SPAN / 2) * ARC_R;
const DRAW_LEN = 0.2; // how far the string comes back at full draw
const ARROW_L = 0.48; // nock to point: at full draw the point sits just past the riser

// ALLY_CLASSES.archer.moveSpeed (u/s): full walk lean at full speed
const WALK_SPEED = 2.5;
// Basic attack: a shot inside this window of the last one is the next shot.
// She looses every 0.4 s (ALLY_CLASSES.archer.attackIntervalTicks), so the
// window is two and a half shots.
export const COMBO_WINDOW = 1.0;
// Her release is the press itself (the arrow leaves on the sim's tick): one
// frame to finish the draw from rest, the loose in 1.5 frames (B1, B2, B4);
// the follow-through and the settle back to the string fit the 0.4 s.
const TIMING = Object.freeze({ ...HIT_TIMING, wind: FRAME, strike: 1.5 * FRAME, over: 2 * FRAME, settle: 5 * FRAME, recover: 0.35 });

// --- Key poses (body space; -X is the bow side, +Z the facing). The body
// fields are the hero core's. The bow: bx, by, bz the grip (the bow paw);
// bry its yaw (body space: -PI/2 aims an arrow straight ahead of the body,
// so a pose aiming at the target while the hips turn side-on by `yaw` keys
// bry = -PI/2 - yaw); bp its tip up or down (+ raises the arrow's point);
// bc its cant about the arrow (+ lays the top limb outboard, away from the
// head). draw 0..1 the string drawn back; nock 0..1 the draw paw on the
// string (the arrow on the bow); ox, oy, oz the draw paw when free.
const PACK = posePack({ bx: -0.29, by: 0.44, bz: 0.15, bry: 0.3, bp: 0.12, bc: 0, draw: 0, nock: 0, ox: -0.11, oy: 0.44, oz: 0.02 });
const { REST, K } = PACK;
const AIM = -Math.PI / 2;
// Shot 1, QUICK LOOSE: side-on (the bow shoulder to the target), the bow out
// at arm's length and the string at full draw under the chin; the loose: the
// back shoulder pulls through and the hips turn on further side-on, the bow
// arm holds on the target and the draw paw flies back past the ear.
const A1 = K({ yaw: 0.12, pitch: -0.02, roll: 0.02, rx: 0.02, rz: -0.03, sw: 1.02, sh: 0.98, bx: -0.36, by: 0.46, bz: 0.36, bry: AIM - 0.12, bp: 0.04, bc: 0.32, draw: 1, nock: 1, ox: -0.05, oy: 0.5, oz: -0.06 });
const S1 = K({ yaw: 0.22, pitch: 0.1, roll: -0.02, rx: -0.02, rz: 0.03, bx: -0.36, by: 0.47, bz: 0.42, bry: AIM - 0.22, bp: 0.06, bc: 0.3, draw: 0, nock: 0, ox: 0.16, oy: 0.56, oz: -0.18 });
const O1 = K({ yaw: 0.2, pitch: 0.08, roll: -0.03, rx: -0.025, rz: 0.02, sw: 1.01, sh: 0.99, bx: -0.35, by: 0.48, bz: 0.43, bry: AIM - 0.12, bp: 0.1, bc: 0.28, draw: 0, nock: 0, ox: 0.19, oy: 0.58, oz: -0.2 });
// Shot 2, CANTED SHOT: down in a crouch with the bow laid over flat across
// the front (the top limb out to the bow side), drawn low; the legs drive
// up through the loose and the hips turn on hardest of the three.
const A2 = K({ yaw: 0.16, pitch: 0.06, roll: 0.04, rx: 0.02, ry: -0.03, rz: -0.03, sw: 1.05, sh: 0.95, bx: -0.36, by: 0.4, bz: 0.32, bry: AIM - 0.16, bp: 0.0, bc: 1.15, draw: 1, nock: 1, ox: -0.06, oy: 0.4, oz: -0.06 });
const S2 = K({ yaw: 0.3, pitch: 0.1, roll: -0.03, rx: -0.02, ry: 0.02, rz: 0.03, sw: 0.98, sh: 1.03, bx: -0.37, by: 0.45, bz: 0.4, bry: AIM - 0.3, bp: 0.05, bc: 1.05, draw: 0, nock: 0, ox: 0.18, oy: 0.46, oz: -0.2 });
const O2 = K({ yaw: 0.27, pitch: 0.06, roll: -0.04, rx: -0.025, ry: 0.02, rz: 0.02, sw: 0.99, sh: 1.02, bx: -0.36, by: 0.47, bz: 0.41, bry: AIM - 0.19, bp: 0.08, bc: 0.9, draw: 0, nock: 0, ox: 0.2, oy: 0.5, oz: -0.2 });
// Shot 3, LEAPING POWER SHOT (the finisher, the biggest: B6): up on the toes
// at the deepest draw, the bow raised; then a hop back and the loose at the
// top of it, stretched tall, landing squashed two frames later.
const A3 = K({ yaw: 0.14, pitch: -0.12, roll: 0.02, ry: 0.03, rz: -0.035, sw: 0.96, sh: 1.06, bx: -0.36, by: 0.5, bz: 0.36, bry: AIM - 0.14, bp: 0.14, bc: 0.34, draw: 1, nock: 1, ox: -0.06, oy: 0.54, oz: -0.08 });
const S3 = K({ yaw: 0.27, pitch: 0.14, roll: -0.02, rz: -0.06, hop: 0.13, sw: 0.93, sh: 1.12, bx: -0.37, by: 0.52, bz: 0.44, bry: AIM - 0.27, bp: 0.16, bc: 0.3, draw: 0, nock: 0, ox: 0.2, oy: 0.62, oz: -0.22 });
const O3 = K({ yaw: 0.24, pitch: 0.1, roll: -0.02, rz: -0.07, hop: 0, sw: 1.1, sh: 0.9, bx: -0.36, by: 0.47, bz: 0.42, bry: AIM - 0.16, bp: 0.1, bc: 0.3, draw: 0, nock: 0, ox: 0.2, oy: 0.56, oz: -0.2 });
// The finisher's flight: the hop and the stretch fall into the landing
// squash with gravity (accelerating), so she is airborne and stretched at
// the release and lands squashed at the end of the overshoot.
const LAND = ['hop', 'sw', 'sh'];
function landing(out, s) {
  if (s.id !== 'overshoot') return;
  const k = s.k * s.k;
  for (const f of LAND) out[f] = S3[f] + (O3[f] - S3[f]) * k;
}
const HITS = createCombo(
  PACK,
  [
    { label: 'quick loose', from: A1, strike: S1, over: O1 },
    { label: 'canted shot', from: A2, strike: S2, over: O2 },
    { label: 'leaping power shot', from: A3, strike: S3, over: O3, extra: landing },
  ],
  { window: COMBO_WINDOW, timing: TIMING, recoil: false }
);
export const ARCHER_HITS = HITS;

// --- Abilities. In game a skill enters its timeline one frame before its
// release (the press is instant, BUILD_BRIEF §6); the lab plays the whole
// draw. Each settles into the stance with one small overshoot.
const breathe = (out, s) => {
  if (s.id === 'hold') out.ry += -0.008 * Math.sin(s.k * Math.PI);
};
// Power Shot (Piercing Shot, Pinning Arrow, Hunter's Mark): a long full
// draw, side-on and leaning back into it, then the loose with the body
// driving forward and the bow arm pushing through.
const G_POWER = K({ yaw: 0.7, pitch: -0.1, rz: -0.05, ry: -0.02, sw: 1.04, sh: 0.96, bx: -0.37, by: 0.47, bz: 0.37, bry: AIM - 0.7, bp: 0.08, bc: 0.3, draw: 1, nock: 1, ox: -0.04, oy: 0.5, oz: -0.1 });
const S_POWER = K({ yaw: 0.4, pitch: 0.16, rz: 0.04, sw: 0.95, sh: 1.06, step: 0.6, bx: -0.36, by: 0.48, bz: 0.46, bry: AIM - 0.4, bp: 0.08, bc: 0.28, draw: 0, nock: 0, ox: 0.2, oy: 0.58, oz: -0.22 });
// Fan (Volley, Feather Fan): a quick draw, then arrows loosed in a fan, the
// bow sweeping across the front between them (the `fan` flourish rides the
// phase), and the last one through.
const G_FAN = K({ yaw: 0.55, pitch: 0.02, rz: -0.03, sw: 1.03, sh: 0.97, bx: -0.36, by: 0.45, bz: 0.36, bry: AIM - 0.55, bp: 0.04, bc: 0.4, draw: 1, nock: 1, ox: -0.05, oy: 0.48, oz: -0.06 });
const F_FAN = K({ yaw: 0.45, pitch: 0.06, rz: 0.02, sw: 1.02, sh: 0.98, bx: -0.36, by: 0.46, bz: 0.4, bry: AIM - 0.45, bp: 0.05, bc: 0.4, draw: 0.6, nock: 1, ox: 0.02, oy: 0.5, oz: -0.02 });
const S_FAN = K({ yaw: 0.35, pitch: 0.1, rz: 0.04, sw: 0.97, sh: 1.03, bx: -0.36, by: 0.47, bz: 0.43, bry: AIM - 0.35, bp: 0.06, bc: 0.35, draw: 0, nock: 0, ox: 0.18, oy: 0.56, oz: -0.18 });
const fan = (out, s) => {
  if (s.id === 'fan') {
    // three draws and looses, the bow swept across between them
    const w = Math.sin(3 * Math.PI * s.k);
    out.bry += 0.45 * Math.sin(2 * Math.PI * s.k);
    out.yaw += 0.12 * Math.sin(2 * Math.PI * s.k);
    out.draw = Math.max(0, out.draw - 0.4 * Math.abs(w));
    out.sw += 0.03 * Math.abs(w);
    out.sh -= 0.02 * Math.abs(w);
  }
  breathe(out, s);
};
// Vault Shot: a crouch with the draw, then a hop back (the sim carries the
// vault: the feet ride it), loosed at the top of it, and a landing.
const G_VAULT = K({ yaw: 0.6, pitch: 0.08, rz: 0.02, ry: -0.04, sw: 1.08, sh: 0.9, bx: -0.36, by: 0.42, bz: 0.34, bry: AIM - 0.6, bp: 0.06, bc: 0.35, draw: 1, nock: 1, ox: -0.05, oy: 0.44, oz: -0.06 });
const L_VAULT = K({ yaw: 0.5, pitch: -0.14, rz: -0.08, hop: 0.16, air: 1, sw: 0.94, sh: 1.1, bx: -0.36, by: 0.5, bz: 0.4, bry: AIM - 0.5, bp: 0.14, bc: 0.3, draw: 1, nock: 1, ox: -0.05, oy: 0.52, oz: -0.08 });
const S_VAULT = K({ yaw: 0.36, pitch: -0.08, rz: -0.1, hop: 0.18, air: 1, sw: 0.93, sh: 1.12, bx: -0.36, by: 0.51, bz: 0.44, bry: AIM - 0.36, bp: 0.16, bc: 0.3, draw: 0, nock: 0, ox: 0.2, oy: 0.6, oz: -0.22 });
const D_VAULT = K({ yaw: 0.3, pitch: 0.08, rz: -0.06, sw: 1.12, sh: 0.9, bx: -0.34, by: 0.45, bz: 0.4, bry: AIM - 0.25, bp: 0.08, bc: 0.25, draw: 0, nock: 0, ox: 0.16, oy: 0.5, oz: -0.14 });
// Sky Shot (Rain of Arrows, Sundering Nova): the bow raised and tipped up
// to the sky, the draw paw at the chin, then a loose straight up and the
// body stretching after it.
const G_SKY = K({ yaw: 0.5, pitch: -0.16, ry: 0.02, sw: 0.97, sh: 1.04, bx: -0.38, by: 0.56, bz: 0.26, bry: AIM - 0.5, bp: 1.05, bc: 0.45, draw: 1, nock: 1, ox: -0.1, oy: 0.44, oz: -0.02 });
const S_SKY = K({ yaw: 0.36, pitch: -0.2, ry: 0.035, sw: 0.94, sh: 1.08, bx: -0.38, by: 0.6, bz: 0.3, bry: AIM - 0.36, bp: 1.15, bc: 0.4, draw: 0, nock: 0, ox: 0.16, oy: 0.5, oz: -0.18 });
// Set Trap (Detonating Charge, Barbed Trap): the bow lowered to point at
// the floor, a crouch with a lunge step, the draw paw setting the trap on the
// floor ahead, then up.
const G_TRAP = K({ yaw: -0.2, pitch: 0.1, ry: -0.03, rz: -0.03, sw: 1.06, sh: 0.93, bx: -0.34, by: 0.42, bz: 0.28, bry: AIM + 0.5, bp: -0.55, bc: 0.2, ox: 0.12, oy: 0.36, oz: 0.2 });
const S_TRAP = K({ yaw: -0.1, pitch: 0.2, ry: -0.06, rz: 0.06, sw: 1.12, sh: 0.88, step: 0.8, bx: -0.34, by: 0.4, bz: 0.3, bry: AIM + 0.6, bp: -0.6, bc: 0.2, ox: 0.08, oy: 0.12, oz: 0.42 });
// Kestrel Watch (the aura): the bow brought up across the chest, the draw
// paw raised to shade the eyes, a slow look out, then down.
const G_WATCH = K({ yaw: 0.25, pitch: -0.06, sw: 0.98, sh: 1.03, bx: -0.2, by: 0.44, bz: 0.3, bry: 0.0, bp: 0.4, bc: 0, ox: 0.12, oy: 0.64, oz: 0.24 });
const S_WATCH = K({ yaw: -0.25, pitch: -0.04, sw: 0.98, sh: 1.03, bx: -0.2, by: 0.45, bz: 0.3, bry: 0.0, bp: 0.4, bc: 0, ox: 0.1, oy: 0.65, oz: 0.25 });

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
export const ARCHER_MOVES = Object.freeze({
  power: moveOf(
    'power',
    'Power Shot',
    [
      { id: 'draw', label: 'full draw', dur: 0.22, to: G_POWER, ease: 'out' },
      { id: 'release', label: 'loose', dur: 1.5 * FRAME, to: S_POWER, ease: 'in' },
      { id: 'hold', label: 'follow-through held', dur: 0.18, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.38, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'power']] }
  ),
  fan: moveOf(
    'fan',
    'Fan',
    [
      { id: 'draw', label: 'quick draw', dur: 0.1, to: G_FAN, ease: 'out' },
      { id: 'fan', label: 'three looses', dur: 0.3, to: F_FAN, ease: 'inOut' },
      { id: 'release', label: 'last loose', dur: 1.5 * FRAME, to: S_FAN, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.12, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'fan', entry: 'fan', extra: fan, cueAt: [['fan', 'fan'], ['hold', 'loose']] }
  ),
  vault: moveOf(
    'vault',
    'Vault Shot',
    [
      { id: 'crouch', label: 'crouch and draw', dur: 0.12, to: G_VAULT, ease: 'out' },
      { id: 'leap', label: 'hop back', dur: 0.08, to: L_VAULT, ease: 'out' },
      { id: 'release', label: 'loose in the air', dur: 1.5 * FRAME, to: S_VAULT, ease: 'in' },
      { id: 'land', label: 'land', dur: 0.1, to: D_VAULT, ease: 'in' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'land', entry: 'leap', cueAt: [['land', 'vault']] }
  ),
  sky: moveOf(
    'sky',
    'Sky Shot',
    [
      { id: 'raise', label: 'raise and draw', dur: 0.2, to: G_SKY, ease: 'out' },
      { id: 'release', label: 'loose skyward', dur: 1.5 * FRAME, to: S_SKY, ease: 'in' },
      { id: 'hold', label: 'watch it fall', dur: 0.22, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.4, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'sky']] }
  ),
  trap: moveOf(
    'trap',
    'Set Trap',
    [
      { id: 'reach', label: 'bow up, reach', dur: 0.16, to: G_TRAP, ease: 'out' },
      { id: 'set', label: 'set it down', dur: 2 * FRAME, to: S_TRAP, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.16, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'set', extra: breathe, cueAt: [['hold', 'trap']] }
  ),
  watch: moveOf(
    'watch',
    'Kestrel Watch',
    [
      { id: 'raise', label: 'shade the eyes', dur: 0.18, to: G_WATCH, ease: 'out' },
      { id: 'look', label: 'look out', dur: 0.3, to: S_WATCH, ease: 'inOut' },
      { id: 'hold', label: 'hold', dur: 0.12, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'look', entry: 'look', extra: breathe, cueAt: [['look', 'watch']] }
  ),
});
const MOVES = ARCHER_MOVES;
// Which ability an Archer skill plays: by the skill first (CLASS_SKILLS.
// archer, all eleven), then by its shape.
export const ARCHER_SKILL_ABILITY = Object.freeze({
  piercing_shot: 'power',
  pinning_arrow: 'power',
  hunters_mark: 'power',
  volley: 'fan',
  feather_fan: 'fan',
  vault_shot: 'vault',
  rain_of_arrows: 'sky',
  sundering_nova: 'sky',
  detonating_charge: 'trap',
  barbed_trap: 'trap',
  kestrel_watch: 'watch',
});
const SHAPE_ABILITY = Object.freeze({ projectile: 'power', direct: 'power', melee_arc: 'fan', nova: 'sky', ground_aoe: 'trap', aura: 'watch' });
const skillAbility = (ev) => (ev && (ARCHER_SKILL_ABILITY[ev.skill] || SHAPE_ABILITY[ev.shape])) || 'power';
export const ARCHER_REST = REST;

// ---------------------------------------------------------------------------
// The rig
// ---------------------------------------------------------------------------
export function buildArcherFacet(rig, trackAccent) {
  const accent = CLASS_ACCENTS.archer;
  const fur = mix(PALETTE.warmGrey, PALETTE.bone, 0.3); // the shared party base
  const furHex = fur.getHex();
  const furDarkHex = mix(fur, PALETTE.bruiseUmber, 0.35).getHex();
  const tunicHex = mix(accent, PALETTE.warmGrey, 0.16).getHex();
  const collarHex = mix(accent, PALETTE.voidCharcoal, 0.25).getHex();
  const mantleHex = mix(accent, PALETTE.voidCharcoal, 0.42).getHex();
  const beltHex = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.2).getHex();
  const leatherHex = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.45).getHex();
  // The classic's wood sits in the amber family; weathered toward the warm
  // grey it keeps its brown and leaves amber to the damage numbers.
  const woodHex = mix(PALETTE.bruiseUmber, PALETTE.warmGrey, 0.35).getHex();
  const gripHex = mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.4).getHex();
  const hornHex = mix(PALETTE.bone, PALETTE.warmGrey, 0.45).getHex();
  const pewterHex = mix(PALETTE.warmGrey, PALETTE.signalBlue, 0.12).multiplyScalar(0.95).getHex();
  const innerEarHex = mix(PALETTE.bone, PALETTE.bruiseUmber, 0.25).getHex();
  // Small parts face up into the key light, where full Bone sparkles: the
  // shafts and the fletching's pale vanes take Bone a step toward the fur.
  const shaftHex = mix(PALETTE.bone, PALETTE.warmGrey, 0.3).getHex();

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
  const collarMat = trackAccent(facetMaterial(collarHex));
  const mantleMat = trackAccent(facetMaterial(mantleHex));
  const fletchMat = trackAccent(facetMaterial(accent));
  const beltMat = facetMaterial(beltHex);
  const leatherMat = facetMaterial(leatherHex);
  const woodMat = facetMaterial(woodHex);
  const gripMat = facetMaterial(gripHex);
  const hornMat = facetMaterial(hornHex);
  const pewterMat = facetMaterial(pewterHex);
  const shaftMat = facetMaterial(shaftHex);
  const innerEarMat = facetMaterial(innerEarHex);

  // --- The tallest, thinnest tunic: nine sides.
  const tunicGeo = sharedGeo('facet:hare-tunic', () => facetize(new LatheGeometry(TUNIC.map(([x, y]) => new Vector2(x, y)), 9), { jitter: 0.14, seed: 201 }));
  const tunic = fpart(tunicGeo, tunicMat);
  tunic.scale.set(TUNIC_W, 1, 1.02);
  body.add(tunic);
  // The Bone bib, riding just outside the facets.
  const BIB = [
    [0.178, 0.26],
    [0.168, 0.33],
    [0.15, 0.39],
    [0.125, 0.45],
  ];
  const bibGeo = sharedGeo('facet:hare-bib', () => facetize(new LatheGeometry(BIB.map(([x, y]) => new Vector2(x * 1.04, y)), 3, -0.55, 1.1), { jitter: 0.06, seed: 203 }));
  const bib = new Mesh(bibGeo, boneMat);
  bib.scale.set(TUNIC_W, 1, 1.02);
  body.add(bib);
  const collarGeo = sharedGeo('facet:hare-collar', () => facetize(new CylinderGeometry(0.09, 0.12, 0.065, 8), { jitter: 0.08, seed: 205 }));
  const collar = fpart(collarGeo, collarMat);
  collar.position.y = 0.5;
  body.add(collar);
  const beltGeo = sharedGeo('facet:hare-belt', () => facetize(new CylinderGeometry(0.178, 0.183, 0.05, 10), { jitter: 0.08, seed: 207 }));
  const belt = fpart(beltGeo, beltMat);
  belt.position.y = 0.22;
  belt.scale.set(TUNIC_W * 1.03, 1, 1.05);
  body.add(belt);

  // Parts laid on the tunic at angle phi (0 = front) and height y.
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
    P.set(sx * r * TUNIC_W, y, cz * r * 1.02);
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
  // A feathered mantle: a ring of notched plates over the shoulders, hanging
  // down the back and sides (open at the front over the bib).
  const MANTLE = 12;
  const mantle = placeRow(wedge, mantleMat, MANTLE, (i, m) => {
    const phi = 0.75 + (i / (MANTLE - 1)) * (2 * Math.PI - 1.5);
    const y = 0.44 - 0.03 * Math.abs(Math.cos(phi / 2));
    const r = tunicR(y) * 1.12;
    P.set(Math.sin(phi) * r * TUNIC_W, y, Math.cos(phi) * r);
    const out = new Vector3(Math.sin(phi), 0, Math.cos(phi));
    Y.set(out.x * 0.55, -0.83, out.z * 0.55).normalize(); // hangs down and out
    X.set(Math.cos(phi), 0, -Math.sin(phi));
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.085, 0.13, 0.05);
  }, { name: 'hare-mantle', seed: 209, mottle: 0.06 });
  body.add(mantle);
  // Leather lacing down the bib: three rows of thin ties, a pair to a row.
  const lacing = placeRow(plate, leatherMat, 6, (i, m) => {
    const row = Math.floor(i / 2);
    const side = i % 2 ? 1 : -1;
    onTunic(m, side * 0.07, 0.42 - row * 0.055, 1.08, 0.05, 0.008, 0.012, 0.2);
  }, { name: 'hare-lacing', seed: 211 });
  body.add(lacing);
  // A pouch on the belt, on the draw side.
  const pouchGeo = sharedGeo('facet:hare-pouch', () => facetize(new CylinderGeometry(0.045, 0.05, 0.08, 6), { jitter: 0.1, seed: 213 }));
  const pouch = fpart(pouchGeo, leatherMat);
  pouch.position.set(0.15, 0.17, 0.09);
  pouch.rotation.set(0.1, 0.5, 0.15);
  body.add(pouch);

  // --- Head: a low-poly ball, the blaze and face riding outside its facets.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skullGeo = sharedGeo('facet:hare-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 221 }));
  const skull = fpart(skullGeo, furMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  const blaze = exactHex(mix(PALETTE.bone, PALETTE.parchment, 0.4).getHex());
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        ctx.fillStyle = blaze;
        ctx.beginPath();
        ctx.ellipse(S * 0.5, S * 0.82, S * 0.18, S * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(S * 0.47, S * 0.42);
        ctx.lineTo(S * 0.53, S * 0.42);
        ctx.quadraticCurveTo(S * 0.58, S * 0.7, S * 0.56, S * 0.86);
        ctx.lineTo(S * 0.44, S * 0.86);
        ctx.quadraticCurveTo(S * 0.42, S * 0.7, S * 0.47, S * 0.42);
        ctx.fill();
      },
    })
  );
  // The very long upright ears (six planes), their inner blades a step
  // darker: the silhouette signature.
  const earGeo = sharedGeo('facet:hare-ear', () => facetize(new CapsuleGeometry(0.048, 0.26, 2, 6), { jitter: 0.08, seed: 223 }));
  const innerGeo = sharedGeo('facet:hare-ear-inner', () => facetize(new CapsuleGeometry(0.026, 0.19, 2, 5), { jitter: 0.06, seed: 225 }));
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.082, 0.205, -0.02);
    const ear = fpart(earGeo, furMat);
    ear.scale.set(1, 1, 0.62);
    ear.position.y = 0.16;
    pivot.add(ear);
    const inner = new Mesh(innerGeo, innerEarMat);
    inner.scale.set(1, 1, 0.4);
    inner.position.set(0, 0.16, 0.032);
    pivot.add(inner);
    pivot.rotation.z = side * -0.075;
    pivot.rotation.x = -0.05;
    head.add(pivot);
    ears.push(pivot);
  }
  // The short soft muzzle and the ink nose.
  const snoutGeo = sharedGeo('facet:hare-snout', () => facetize(new SphereGeometry(0.072, 7, 5), { jitter: 0.08, seed: 227 }));
  const snout = fpart(snoutGeo, boneMat);
  snout.scale.set(0.9, 0.62, 0.85);
  snout.position.set(0, -0.115, SZ * HEAD_R * 0.8);
  head.add(snout);
  const noseGeo = sharedGeo('facet:hare-nose', () => facetize(new SphereGeometry(0.022, 6, 4), { jitter: 0.05, seed: 229 }));
  const nose = fpart(noseGeo, facetMaterial(PALETTE.voidCharcoal), false);
  nose.position.set(0, -0.088, SZ * HEAD_R * 0.8 + 0.055);
  head.add(nose);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.092, eyeH: 0.12, spread: 0.19, drop: 0.62 }));

  // The Bone puff tail.
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.2, -0.2);
  body.add(tailPivot);
  const tailGeo = sharedGeo('facet:hare-tail', () => facetize(new SphereGeometry(0.072, 7, 5), { jitter: 0.1, seed: 231 }));
  tailPivot.add(fpart(tailGeo, boneMat));

  // --- The quiver on the back, raked back and clear of the skull, with five
  // fletched arrows.
  const quiver = new Group();
  quiver.position.set(0.155, 0.33, -0.185);
  quiver.rotation.set(-0.5, 0, -0.34);
  body.add(quiver);
  const tubeGeo = sharedGeo('facet:hare-quiver', () => facetize(new CylinderGeometry(0.056, 0.048, 0.25, 7), { jitter: 0.1, seed: 233 }));
  quiver.add(fpart(tubeGeo, leatherMat));
  const rimGeo = sharedGeo('facet:hare-quiver-rim', () => facetize(new CylinderGeometry(0.062, 0.06, 0.026, 7), { jitter: 0.08, seed: 235 }));
  const rim = fpart(rimGeo, beltMat);
  rim.position.y = 0.118;
  quiver.add(rim);
  const QUIVER = [
    [-0.02, 0.015, 0.0],
    [0.022, -0.012, 0.1],
    [0.0, -0.028, -0.08],
    [-0.028, -0.01, 0.16],
    [0.026, 0.02, -0.12],
  ];
  const shafts = placeRow(plate, shaftMat, QUIVER.length, (i, m) => {
    const [ox, oz] = QUIVER[i];
    P.set(ox, 0.19, oz);
    setTRS(m, P, X.set(1, 0, 0), Y.set(0, 1, 0), Z.set(0, 0, 1), 0.014, 0.17, 0.014);
  }, { name: 'hare-shafts', seed: 237 });
  quiver.add(shafts);
  const fletching = placeRow(wedge, fletchMat, QUIVER.length * 2, (i, m) => {
    const [ox, oz, a] = QUIVER[i >> 1];
    const side = i & 1 ? 1 : -1;
    const ang = a + side * 0.9;
    P.set(ox + Math.sin(ang) * 0.012, 0.25, oz + Math.cos(ang) * 0.012);
    Y.set(Math.sin(ang) * 0.35, 1, Math.cos(ang) * 0.35).normalize();
    X.set(Math.cos(ang), 0, -Math.sin(ang));
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.036, 0.075, 0.03);
  }, { name: 'hare-fletching', seed: 239, mottle: 0.05 });
  quiver.add(fletching);

  // --- The bow: an open C off the riser (bow space, see above).
  const bow = new Group();
  bow.rotation.order = 'YZX';
  body.add(bow);
  const limbGeo = sharedGeo('facet:hare-limb', () => facetize(new TorusGeometry(ARC_R, 0.024, 4, 18, ARC_SPAN), { jitter: 0.06, seed: 241 }));
  const limb = fpart(limbGeo, woodMat);
  limb.position.x = -ARC_R;
  limb.rotation.z = -ARC_SPAN / 2;
  bow.add(limb);
  // Horn nocks on the limb tips.
  const nockGeo = sharedGeo('facet:hare-nock', () => facetize(new OctahedronGeometry(0.03, 0), { jitter: 0.1, seed: 243 }));
  for (const side of [-1, 1]) {
    const tipNock = fpart(nockGeo, hornMat, false);
    tipNock.scale.set(0.9, 1.3, 0.9);
    tipNock.position.set(TIP_X, side * TIP_Y, 0);
    bow.add(tipNock);
  }
  // The riser and its wrapped bindings.
  const riserGeo = sharedGeo('facet:hare-riser', () => facetize(new CylinderGeometry(0.03, 0.03, 0.17, 6), { jitter: 0.08, seed: 245 }));
  bow.add(fpart(riserGeo, gripMat));
  const bindings = placeRow(plate, leatherMat, 4, (i, m) => {
    P.set(0, -0.06 + i * 0.04, 0);
    setTRS(m, P, X.set(1, 0, 0), Y.set(0, 1, 0), Z.set(0, 0, 1), 0.07, 0.016, 0.07);
  }, { name: 'hare-bindings', seed: 247 });
  bow.add(bindings);
  // The string: two straight runs from the nocks to the draw paw, shown only
  // while she draws (the classic's open C keeps its negative space at rest).
  const stringGeo = sharedGeo('facet:hare-string', () => new CylinderGeometry(0.005, 0.005, 1, 4).translate(0, 0.5, 0));
  const stringMat = facetMaterial(hornHex);
  const strings = [0, 1].map(() => {
    const s = new Mesh(stringGeo, stringMat);
    s.visible = false;
    bow.add(s);
    return s;
  });
  // The arrow on the bow: a shaft from the nock, a pewter point and green
  // fletching, shown while the paw is on the string.
  const arrow = new Group();
  bow.add(arrow);
  const arrowShaftGeo = sharedGeo('facet:hare-arrow', () => facetize(new CylinderGeometry(0.008, 0.008, ARROW_L, 4), { jitter: 0.04, seed: 249 }));
  const arrowShaft = new Mesh(arrowShaftGeo, shaftMat);
  arrowShaft.rotation.z = -Math.PI / 2;
  arrowShaft.position.x = ARROW_L / 2;
  arrow.add(arrowShaft);
  const headGeo = sharedGeo('facet:hare-arrowhead', () => facetize(new OctahedronGeometry(0.026, 0), { jitter: 0.08, seed: 251 }));
  const arrowHead = fpart(headGeo, pewterMat, false);
  arrowHead.scale.set(1.6, 0.6, 0.6);
  arrowHead.position.x = ARROW_L;
  arrow.add(arrowHead);
  for (const side of [-1, 1]) {
    const vane = fpart(wedge, fletchMat, false);
    vane.scale.set(0.012, 0.06, 0.03);
    vane.rotation.set(side * 0.9, 0, Math.PI / 2);
    vane.position.set(0.04, 0, 0);
    arrow.add(vane);
  }
  // The bow paw on the riser, in front of it; the named points (B8): the
  // hand on the grip, and the tip where an arrow leaves the bow.
  const pawGeo = sharedGeo('facet:paw', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 91 }));
  const gripPaw = fpart(pawGeo, furDarkMat);
  gripPaw.scale.setScalar(0.06);
  gripPaw.position.set(0, 0, 0.062);
  bow.add(gripPaw);
  const hand = namedPoint(bow, 'hand', 0, 0, 0.04);
  const tip = namedPoint(bow, 'tip', 0.08, 0, 0);

  // --- Arms and paws, the feet.
  const armL = facetArm(furMat, 0.05, 0.2, 253);
  armL.position.set(-0.19, 0.4, 0.09);
  body.add(armL);
  const armR = facetArm(furMat, 0.05, 0.2, 255);
  armR.position.set(0.185, 0.4, 0.08);
  body.add(armR);
  const drawPaw = fpart(pawGeo, furDarkMat);
  drawPaw.scale.setScalar(0.052);
  body.add(drawPaw);
  const gripLocal = new Vector3(0, 0, 0.03);
  const gripBody = new Vector3();
  const nockLocal = new Vector3();
  const nockBody = new Vector3();
  const pawFree = new Vector3();
  const pawLocal = new Vector3();
  const tipLocal = new Vector3();

  const HOME = [new Vector3(-0.1, 0.048, 0.22), new Vector3(0.1, 0.048, 0.22)];
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(pawGeo, furDarkMat);
    foot.scale.set(0.058, 0.044, 0.07);
    foot.position.copy(HOME[i]);
    rig.add(foot); // feet stay planted: they do not inherit the torso lean
    feet.push(foot);
  }

  // ------------------------------------------------------------------------
  // Locked feet and the shots (the hero core: render/facet/hero.js). The
  // draw-side foot (+X) steps forward into a lunge.
  // ------------------------------------------------------------------------
  const lock = createFootLock({ rig, feet, home: HOME, lunge: { lead: 1, reach: 0.14, brace: 0.03 } });
  const atk = createAttackClock({ pack: PACK, hits: HITS, abilities: MOVES, skillAbility, window: COMBO_WINDOW, ranged: true });
  let lastT = null;
  const live = PACK.make();
  const lagged = PACK.make();
  const led = PACK.make();
  const idle = PACK.make();
  const walk = {};

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
    // the bow's aim (weaponField 'bry'), as drawn: it trails the hips
    swing: () => drawnBry,
    parts: { torso, head, weapon: bow, bow },
  };
  let drawnBry = REST.bry;
  const flatQ = new Quaternion();
  const flatE = new Euler();

  function apply(Pz, t, fallSign, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const upright = 1 - Pz.collapse;

    // COMMON-MODE ear sway (as archer.js): the pair sways as a unit with a
    // constant splay, so the two long ears never cross into one mass.
    ears[0].rotation.z = -0.075 + 0.45 * Pz.ear - Pz.collapse * 0.95;
    ears[1].rotation.z = 0.075 + 0.45 * Pz.ear + Pz.collapse * 0.95;
    ears[0].rotation.x = -0.05 + 0.3 * Math.min(0, Pz.ear * 1.6);
    ears[1].rotation.x = ears[0].rotation.x;
    tailPivot.rotation.y = Pz.tail * 0.6;

    // The body a shot takes over from and hands back to: the driver's clip
    // as the factory set it, or the walk (she shoots on the move).
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
    // The walk under everything: bob, roll, hip twist and the travel lean
    // from the steps themselves (she shoots on the move, so this stays on
    // under a shot and the hips still lead the bow).
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
    // The shooter's squash (B3, shots): 20/29/38% wider on steady fire and
    // a rig-only shove back off the bow, after the press.
    const shot = atk.shot();
    if (shot.sw !== 1 || shot.sh !== 1) {
      rig.scale.x *= shot.sw;
      rig.scale.y *= shot.sh;
      rig.scale.z *= shot.sw;
    }
    if (shot.shove > 0) rig.position.z -= SHOT.shove * shot.shove * upright;
    // The head counter-rotates so the face stays up through every lean.
    if (attacking || (locked && clip === 'walk')) {
      head.rotation.x = -torso.rotation.x * 0.88;
      head.rotation.y = -torso.rotation.y * 0.5 * upright;
    }
    head.rotation.z = -torso.rotation.z * 0.45 * upright;
    // The grow-in on the run's first room (B7).
    const sp = atk.spawn();
    if (sp !== 1) rig.scale.multiplyScalar(sp);

    // The bow: a shot places it (a frame behind the hips); otherwise the
    // stance, with the classic's generic cast (draw and loose) on top.
    let S;
    if (attacking) S = lagged;
    else {
      S = PACK.copy(idle, REST);
      const draw = Math.max(0, Pz.prop);
      const wind = Math.min(0, Pz.prop);
      S.by += 0.13 * draw + 0.04 * wind;
      S.bx -= 0.05 * draw;
      S.bz += 0.05 * draw;
      S.bry -= 0.22 * draw;
      S.bp -= 0.28 * draw;
      S.ox += 0.03 * draw + 0.05 * wind;
      S.oy += 0.05 * draw;
      S.oz += -0.16 * draw - 0.05 * wind;
    }
    drawnBry = S.bry;
    bow.position.set(S.bx, S.by, S.bz);
    bow.rotation.set(S.bc, S.bry, S.bp);
    // Downed (as archer.js keeps it clear of the body): the bow lies flat
    // beside her, in front, never under her.
    const lay = Pz.collapse;
    if (lay > 0) {
      flatQ.setFromEuler(flatE.set(Math.PI / 2, 0, -fallSign * FALL_ANGLE * 0.3));
      bow.quaternion.slerp(flatQ, lay);
      bow.position.lerp(pawFree.set(-0.3, 0.1, 0.3), lay);
    }
    bow.updateMatrix();
    aimArm(armL, gripBody.copy(gripLocal).applyMatrix4(bow.matrix));

    // The draw paw: on the string (nock) at its drawn point, or free.
    const onString = attacking ? Math.max(0, Math.min(1, S.nock)) * (1 - lay) : 0;
    const drawn = attacking ? Math.max(0, Math.min(1, S.draw)) : 0;
    nockLocal.set(TIP_X - DRAW_LEN * drawn, 0, 0);
    nockBody.copy(nockLocal).applyMatrix4(bow.matrix);
    pawFree.set(S.ox, S.oy, S.oz);
    drawPaw.position.lerpVectors(pawFree, nockBody, onString);
    aimArm(armR, drawPaw.position);
    // The string runs from each nock to where the paw holds it; the arrow
    // lies on it while the paw does.
    const showString = onString > 0.02;
    pawLocal.copy(nockLocal).lerp(nockLocal, 1);
    for (let i = 0; i < 2; i++) {
      const sN = strings[i];
      sN.visible = showString;
      if (!showString) continue;
      tipLocal.set(TIP_X, i ? TIP_Y : -TIP_Y, 0);
      sN.position.copy(tipLocal);
      Y.copy(pawLocal).sub(tipLocal);
      const len = Y.length();
      sN.quaternion.setFromUnitVectors(X.set(0, 1, 0), Y.normalize());
      sN.scale.set(1, len, 1);
    }
    arrow.visible = onString > 0.5;
    arrow.position.copy(nockLocal);

    // Feet last, once the rig is placed: locked to the floor, stepping on
    // their own; the grow-in carries them with the body; the lab's Still
    // stands them on the pose's homes.
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
    basePitch: 0,
    metrics: {
      standHeight: EAR_TOP,
      earTopY: EAR_TOP,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.2,
      ringRadius: 0.44,
      hipY: HIP,
    },
  };
}

// The model lab's basic combo: three shots at the Archer's real cadence
// (ALLY_CLASSES.archer.attackIntervalTicks in sim/allies.js: 0.4 s; the
// heroes probe checks the two agree). Pure in t, so it rewinds.
export const SWING_SEC = 0.4;
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC, ranged: true, label: 'Basic combo' });

// The Archer in the model-standard registry (render/facet/heroes.js).
export const ARCHER_SPEC = Object.freeze({
  id: 'archer',
  label: 'Archer',
  build: buildArcherFacet,
  hits: HITS,
  moves: MOVES,
  skillAbility,
  swingSec: SWING_SEC,
  comboLab: COMBO_LAB,
  ranged: true,
  walkSpeed: WALK_SPEED,
  weaponField: 'bry',
  lab: {
    abilities: [
      ['combo', 'Basic combo'],
      ['power', 'Power Shot'],
      ['fan', 'Fan'],
      ['vault', 'Vault Shot'],
      ['sky', 'Sky Shot'],
      ['trap', 'Set Trap'],
      ['watch', 'Kestrel Watch'],
      ['spawn', 'Spawn'],
    ],
    frame: { y: 0.6, z: 0, dist: 3.6, speed: 2.5, loop: 2.2, side: 1.3 },
    cues: {
      strike: { sound: 'bow', pitch: 1.1, fx: 'flash' },
      finisher: { sound: 'bow', pitch: 0.85, fx: ['flash', 'star'], size: 1.5 },
      power: { sound: 'pinning_arrow', pitch: 1, fx: ['flash', 'star'], size: 1.2 },
      fan: { sound: 'bow', pitch: 1.3, fx: 'flash' },
      loose: { sound: 'bow', pitch: 1.2, fx: 'star' },
      vault: { sound: 'vault_shot', pitch: 1, fx: 'ring' },
      sky: { sound: 'rain_of_arrows', pitch: 1, fx: 'pillar', size: 1.1 },
      trap: { sound: 'barbed_trap', pitch: 1, fx: 'ring' },
      watch: { sound: 'cast_zone', pitch: 1.2, fx: 'ring', size: 1.4 },
    },
  },
});
