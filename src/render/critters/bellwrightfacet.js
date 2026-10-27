// BELLWRIGHT, MODEL STANDARD (docs/MODEL_STANDARD.md). The chibi bell beetle
// of bellwright.js (docs/BELLWRIGHT.md) in the faceted look, laid ON TOP of
// her: the same round domed shell split down the back, the two long curling
// antennae, the little belfry on her back with its bell hanging over her
// head (the only prop in the party that rides above the head), the pale
// belly plate, the tuning fork at her belt and the short bell mallet in her
// right hand. What changes:
//
//   * every mass is faceted (render/facet/material.js): a nine-sided body,
//     faceted wing cases and skull, a faceted bell and mallet head; the
//     belfry posts and the antennae a few-sided section;
//   * detail from the parts kit (render/facet/kit.js): ridge plates down the
//     wing-case seam, chitin studs on the cases, the belly plate's segments,
//     a shingled roof on the belfry and wrapped bindings on the mallet;
//   * a THREE-STRIKE MALLET COMBO on the basic attack (Kesh's animation
//     template), at her 0.4 s cadence: a downward tap, a backhand ring swung
//     out from the side, then the finisher, a hop and a two-handed overhead
//     strike. Each strike's follow-through settles into the next wind-up, the
//     hips lead and the mallet trails a frame behind; the belfry bell rocks
//     with every strike;
//   * seven ability timelines for her eleven skills: Hang Bell, Peal,
//     Clapper, Hum, Bell Swing, Wing Hop and Chime (the wing cases open on
//     the hop);
//   * LOCKED FEET on the hero core (render/facet/hero.js).
//
// Same contract as buildBellwright (apply, torso, head, basePitch, metrics),
// plus `cue(kind, ev)`, `hold(dt)`, `comboHitOf(ev)`, `points` and `lab`.
// Render only: attack timing, damage and the sim are untouched.
import { CapsuleGeometry, CylinderGeometry, Euler, Group, LatheGeometry, Mesh, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { faceDecal, mix } from './common.js';
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

// The classic beetle's measures (bellwright.js), unchanged.
const HIP = 0.15;
const HEM = 0.022;
const HEAD_C = 0.6;
const HEAD_R = 0.22;
const SX = 1.06, SY = 0.92, SZ = 1.0;
const BELFRY_Y = 1.14; // the belfry crossbar, clear above her head
const COAT = [
  [0, HEM],
  [0.17, HEM],
  [0.215, 0.06],
  [0.235, 0.16],
  [0.228, 0.27],
  [0.2, 0.37],
  [0.15, 0.44],
  [0.09, 0.48],
  [0, 0.495],
];
const COAT_W = 1.04, COAT_D = 1.02;
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

// ALLY_CLASSES.bellwright.moveSpeed (u/s): full walk lean at full speed
const WALK_SPEED = 2.35;
// Basic attack: a strike inside this window of the last one is the next
// strike. She throws a Ding every 0.4 s (ALLY_CLASSES.bellwright.
// attackIntervalTicks), so the window is two and a half strikes.
export const COMBO_WINDOW = 1.0;
// Her chime leaves on the press (the sim's tick): one frame to raise the
// mallet, the strike in 1.5 frames (B1, B2, B4); the follow-through and the
// settle into the next wind-up fit the 0.4 s.
const TIMING = Object.freeze({ ...HIT_TIMING, wind: FRAME, strike: 1.5 * FRAME, over: 2 * FRAME, settle: 5 * FRAME, recover: 0.35 });

// --- Key poses (body space; +X is the mallet side, +Z the facing). The body
// fields are the hero core's. The mallet: mx, my, mz its grip; mrx its pitch
// (- raises the head up and back, + brings it down and forward); mrz its
// side lean (- out to the mallet side; the keys keep the head outboard of
// the face). ox, oy, oz the free paw; wing 0..1 the wing cases opening.
// The hips turn the mallet shoulder forward through a strike (their yaw goes
// negative), a small turn so a hit taken mid-strike lets go inside the
// no-cut bar.
const PACK = posePack({ mx: 0.24, my: 0.3, mz: 0.1, mrx: -0.15, mrz: -0.25, ox: -0.19, oy: 0.33, oz: 0.11, wing: 0 });
const { REST, K } = PACK;
// Strike 1, DOWNWARD TAP: the mallet raised up and back, then brought down
// in front, the free paw up as if holding the note.
const A1 = K({ yaw: -0.08, pitch: -0.05, sw: 0.98, sh: 1.03, mx: 0.25, my: 0.36, mz: 0.06, mrx: -0.95, mrz: -0.3, ox: -0.17, oy: 0.38, oz: 0.16 });
const S1 = K({ yaw: -0.2, pitch: 0.1, rz: 0.03, sw: 1.02, sh: 0.98, mx: 0.25, my: 0.3, mz: 0.2, mrx: 0.6, mrz: -0.3, ox: -0.15, oy: 0.42, oz: 0.2 });
const O1 = K({ yaw: -0.18, pitch: 0.08, rz: 0.02, mx: 0.25, my: 0.29, mz: 0.19, mrx: 0.52, mrz: -0.3, ox: -0.16, oy: 0.41, oz: 0.19 });
// Strike 2, BACKHAND RING: the mallet laid out wide to the mallet side,
// then swung in and down across the front, the shell rocking with it.
const A2 = K({ yaw: -0.1, pitch: 0.04, roll: 0.04, rx: 0.02, sw: 1.04, sh: 0.96, mx: 0.27, my: 0.34, mz: 0.04, mrx: -0.45, mrz: -0.95, ox: -0.18, oy: 0.36, oz: 0.14 });
const S2 = K({ yaw: -0.26, pitch: 0.1, roll: -0.04, rx: -0.02, rz: 0.03, sw: 0.98, sh: 1.03, mx: 0.23, my: 0.3, mz: 0.22, mrx: 0.5, mrz: -0.2, ox: -0.14, oy: 0.4, oz: 0.2 });
const O2 = K({ yaw: -0.24, pitch: 0.08, roll: -0.05, rx: -0.025, rz: 0.02, sw: 0.99, sh: 1.02, mx: 0.23, my: 0.29, mz: 0.21, mrx: 0.45, mrz: -0.22, ox: -0.15, oy: 0.39, oz: 0.19 });
// Strike 3, OVERHEAD STRIKE (the finisher, the biggest: B6): the mallet
// raised high over the shoulder in both paws, up on the toes; then a hop
// and the mallet brought down hard in front, stretched tall at the strike,
// landing squashed.
const A3 = K({ yaw: -0.1, pitch: -0.14, rz: -0.03, sw: 0.96, sh: 1.06, mx: 0.24, my: 0.44, mz: 0.0, mrx: -1.35, mrz: -0.35, ox: 0.1, oy: 0.46, oz: 0.04 });
const S3 = K({ yaw: -0.24, pitch: 0.16, rz: 0.06, hop: 0.13, sw: 0.93, sh: 1.12, mx: 0.22, my: 0.32, mz: 0.24, mrx: 0.95, mrz: -0.3, ox: 0.1, oy: 0.36, oz: 0.24 });
const O3 = K({ yaw: -0.22, pitch: 0.12, rz: 0.07, hop: 0, sw: 1.1, sh: 0.9, mx: 0.22, my: 0.27, mz: 0.23, mrx: 0.85, mrz: -0.3, ox: 0.09, oy: 0.32, oz: 0.23 });
// The finisher's flight: the hop and the stretch fall into the landing
// squash with gravity, so she is airborne and stretched at the strike and
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
    { label: 'downward tap', from: A1, strike: S1, over: O1 },
    { label: 'backhand ring', from: A2, strike: S2, over: O2 },
    { label: 'overhead strike', from: A3, strike: S3, over: O3, extra: landing },
  ],
  { window: COMBO_WINDOW, timing: TIMING, recoil: false }
);
export const BELLWRIGHT_HITS = HITS;

// --- Abilities. In game a skill enters its timeline one frame before its
// release (the press is instant, BUILD_BRIEF §6); the lab plays the whole
// gather. Each settles into the stance with one small overshoot.
const breathe = (out, s) => {
  if (s.id === 'hold') out.ry += -0.008 * Math.sin(s.k * Math.PI);
};
// Hang Bell (Hang Bell, Great Bell): the free paw reaching up and out to
// hang the bell ahead, the mallet raised to strike it, then the strike.
const G_HANG = K({ yaw: -0.04, pitch: -0.1, sw: 0.97, sh: 1.04, mx: 0.25, my: 0.38, mz: 0.08, mrx: -0.7, mrz: -0.3, ox: -0.12, oy: 0.56, oz: 0.3 });
const S_HANG = K({ yaw: -0.16, pitch: 0.08, sw: 1.04, sh: 0.97, step: 0.5, mx: 0.24, my: 0.32, mz: 0.22, mrx: 0.55, mrz: -0.28, ox: -0.1, oy: 0.5, oz: 0.34 });
// Peal (Peal, Carillon): the mallet swung up and back into her own belfry
// bell, the body arching under it, then the ring rolling out.
const G_PEAL = K({ yaw: 0.04, pitch: 0.1, sw: 1.06, sh: 0.94, mx: 0.25, my: 0.32, mz: 0.12, mrx: 0.3, mrz: -0.3, ox: -0.2, oy: 0.32, oz: 0.14 });
const S_PEAL = K({ yaw: -0.06, pitch: -0.12, sw: 0.94, sh: 1.08, mx: 0.24, my: 0.46, mz: 0.0, mrx: -1.45, mrz: -0.3, ox: -0.22, oy: 0.4, oz: 0.12 });
// Clapper (Clapper, Knell): a throw: the mallet cocked back and snapped
// forward, the clapper leaving off its head.
const G_CLAP = K({ yaw: -0.06, pitch: -0.06, sw: 1.03, sh: 0.97, mx: 0.26, my: 0.38, mz: -0.02, mrx: -1.1, mrz: -0.3, ox: -0.16, oy: 0.4, oz: 0.2 });
const S_CLAP = K({ yaw: -0.22, pitch: 0.14, sw: 0.96, sh: 1.05, step: 0.6, mx: 0.24, my: 0.34, mz: 0.26, mrx: 0.75, mrz: -0.3, ox: -0.14, oy: 0.36, oz: 0.16 });
// Hum (the aura): the mallet lowered, the free paw at the chest feeling the
// note, a slow sway.
const G_HUM = K({ yaw: 0.04, pitch: 0.04, sw: 1.02, sh: 0.98, mx: 0.24, my: 0.28, mz: 0.1, mrx: 0.1, mrz: -0.3, ox: -0.08, oy: 0.36, oz: 0.24 });
const S_HUM = K({ yaw: -0.04, pitch: 0.02, sw: 1.03, sh: 0.97, mx: 0.24, my: 0.28, mz: 0.1, mrx: 0.12, mrz: -0.3, ox: -0.06, oy: 0.38, oz: 0.25 });
// Bell Swing: the mallet swung wide and round on its chain, out to the side
// and through the front.
const G_SWING = K({ yaw: -0.02, pitch: 0.06, roll: 0.05, sw: 1.06, sh: 0.94, mx: 0.28, my: 0.32, mz: -0.02, mrx: -0.3, mrz: -1.1, ox: -0.2, oy: 0.34, oz: 0.12 });
const S_SWING = K({ yaw: -0.24, pitch: 0.12, roll: -0.05, sw: 0.96, sh: 1.05, step: 0.6, mx: 0.24, my: 0.3, mz: 0.24, mrx: 0.6, mrz: -0.3, ox: -0.16, oy: 0.36, oz: 0.16 });
// Wing Hop: the wing cases snap open, a hop with the mallet tucked, and a
// landing with the cases closing.
const G_HOP = K({ yaw: 0.02, pitch: 0.12, sw: 1.1, sh: 0.9, mx: 0.24, my: 0.28, mz: 0.08, mrx: 0.0, mrz: -0.3, ox: -0.2, oy: 0.3, oz: 0.12, wing: 0.4 });
const L_HOP = K({ yaw: -0.04, pitch: -0.12, rz: -0.06, hop: 0.16, air: 1, sw: 0.93, sh: 1.1, mx: 0.25, my: 0.34, mz: 0.06, mrx: -0.4, mrz: -0.35, ox: -0.22, oy: 0.4, oz: 0.08, wing: 1 });
const D_HOP = K({ yaw: -0.04, pitch: 0.1, rz: -0.04, sw: 1.12, sh: 0.9, mx: 0.24, my: 0.28, mz: 0.12, mrx: 0.0, mrz: -0.28, ox: -0.2, oy: 0.3, oz: 0.14, wing: 0.25 });
// Chime (Vesper Chime, Tuning Fork): the fork lifted in the free paw and
// tapped on the mallet's head, held up between them to ring.
const G_CHIME = K({ yaw: 0.02, pitch: -0.04, sw: 0.98, sh: 1.03, mx: 0.2, my: 0.36, mz: 0.2, mrx: 0.2, mrz: -0.3, ox: -0.04, oy: 0.44, oz: 0.28 });
const S_CHIME = K({ yaw: -0.06, pitch: -0.08, sw: 0.97, sh: 1.04, mx: 0.2, my: 0.4, mz: 0.22, mrx: 0.3, mrz: -0.3, ox: -0.02, oy: 0.5, oz: 0.3 });

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
export const BELLWRIGHT_MOVES = Object.freeze({
  hang: moveOf(
    'hang',
    'Hang Bell',
    [
      { id: 'reach', label: 'reach up, mallet raised', dur: 0.18, to: G_HANG, ease: 'out' },
      { id: 'release', label: 'strike', dur: 1.5 * FRAME, to: S_HANG, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.16, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'hang']] }
  ),
  peal: moveOf(
    'peal',
    'Peal',
    [
      { id: 'gather', label: 'crouch, mallet low', dur: 0.14, to: G_PEAL, ease: 'out' },
      { id: 'release', label: 'strike her own bell', dur: 2 * FRAME, to: S_PEAL, ease: 'in' },
      { id: 'hold', label: 'the peal rolls out', dur: 0.2, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.4, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'peal']] }
  ),
  clap: moveOf(
    'clap',
    'Clapper',
    [
      { id: 'gather', label: 'cock the mallet', dur: 0.14, to: G_CLAP, ease: 'out' },
      { id: 'release', label: 'snap it forward', dur: 1.5 * FRAME, to: S_CLAP, ease: 'in' },
      { id: 'hold', label: 'follow-through held', dur: 0.14, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'clap']] }
  ),
  hum: moveOf(
    'hum',
    'Hum',
    [
      { id: 'lower', label: 'paw to the chest', dur: 0.16, to: G_HUM, ease: 'out' },
      { id: 'sway', label: 'feel the note', dur: 0.3, to: S_HUM, ease: 'inOut' },
      { id: 'hold', label: 'hold', dur: 0.12, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'sway', entry: 'sway', extra: breathe, cueAt: [['sway', 'hum']] }
  ),
  swing: moveOf(
    'swing',
    'Bell Swing',
    [
      { id: 'gather', label: 'mallet out wide', dur: 0.16, to: G_SWING, ease: 'out' },
      { id: 'release', label: 'swing through', dur: 2 * FRAME, to: S_SWING, ease: 'in' },
      { id: 'hold', label: 'the clang', dur: 0.14, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'swing']] }
  ),
  hop: moveOf(
    'hop',
    'Wing Hop',
    [
      { id: 'crouch', label: 'cases open', dur: 0.1, to: G_HOP, ease: 'out' },
      { id: 'leap', label: 'hop', dur: 0.1, to: L_HOP, ease: 'out' },
      { id: 'land', label: 'land', dur: 0.1, to: D_HOP, ease: 'in' },
      { id: 'settle', label: 'cases close', dur: 0.34, to: REST, ease: 'settle' },
    ],
    { contact: 'land', entry: 'leap', cueAt: [['leap', 'hop']] }
  ),
  chime: moveOf(
    'chime',
    'Chime',
    [
      { id: 'gather', label: 'fork to the mallet', dur: 0.16, to: G_CHIME, ease: 'out' },
      { id: 'release', label: 'tap and lift', dur: 2 * FRAME, to: S_CHIME, ease: 'in' },
      { id: 'hold', label: 'let it ring', dur: 0.2, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.36, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'release', extra: breathe, cueAt: [['hold', 'chime']] }
  ),
});
const MOVES = BELLWRIGHT_MOVES;
// Which ability a Bellwright skill plays: by the skill first
// (CLASS_SKILLS.bellwright, all eleven), then by its shape.
export const BELLWRIGHT_SKILL_ABILITY = Object.freeze({
  hang_bell: 'hang',
  great_bell: 'hang',
  peal: 'peal',
  carillon: 'peal',
  clapper: 'clap',
  knell: 'clap',
  hum: 'hum',
  bell_swing: 'swing',
  wing_hop: 'hop',
  vesper_chime: 'chime',
  tuning_fork: 'chime',
});
const SHAPE_ABILITY = Object.freeze({ projectile: 'clap', direct: 'chime', melee_arc: 'swing', nova: 'peal', ground_aoe: 'hang', aura: 'hum' });
const skillAbility = (ev) => (ev && (BELLWRIGHT_SKILL_ABILITY[ev.skill] || SHAPE_ABILITY[ev.shape])) || 'clap';
export const BELLWRIGHT_REST = REST;

// ---------------------------------------------------------------------------
// The rig
// ---------------------------------------------------------------------------
export function buildBellwrightFacet(rig, trackAccent) {
  const accent = CLASS_ACCENTS.bellwright;
  const chitin = mix(PALETTE.voidCharcoal, accent, 0.35);
  const chitinHex = chitin.getHex();
  const chitinDarkHex = mix(chitin, PALETTE.voidCharcoal, 0.4).getHex();
  // the belly a step toward her bronze: full Bone faces up into the key
  // light and glares
  const bellyHex = mix(mix(PALETTE.bone, PALETTE.paleGold, 0.25), accent, 0.22).getHex();
  // The classic's brass and cases sat bright in the amber family. The cases
  // keep her bell bronze, dark; the bell and the mallet head take that
  // bronze lit toward Pale Gold and aged toward the warm grey (an old,
  // weathered bell), so the metal leaves amber to the damage numbers.
  const brassHex = mix(mix(accent, PALETTE.paleGold, 0.3), PALETTE.warmGrey, 0.42).getHex();
  const caseHex = mix(accent, PALETTE.paleGold, 0.1).getHex();
  const headHex = mix(accent, PALETTE.warmGrey, 0.3).getHex();
  const woodHex = mix(PALETTE.bruiseUmber, PALETTE.warmGrey, 0.4).getHex();
  const roofHex = mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.3).getHex();
  const cordHex = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.4).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  const chitinMat = facetMaterial(chitinHex);
  const chitinDarkMat = facetMaterial(chitinDarkHex);
  const bellyMat = facetMaterial(bellyHex);
  const caseMat = trackAccent(facetMaterial(caseHex));
  const bellMat = trackAccent(facetMaterial(brassHex));
  const headMat = facetMaterial(headHex);
  const woodMat = facetMaterial(woodHex);
  const roofMat = facetMaterial(roofHex);
  const cordMat = facetMaterial(cordHex);
  const boneMat = facetMaterial(PALETTE.bone);

  // --- The round body: nine sides, a short wide bell.
  const coatGeo = sharedGeo('facet:beetle-coat', () => facetize(new LatheGeometry(COAT.map(([x, y]) => new Vector2(x, y)), 9), { jitter: 0.14, seed: 401 }));
  const coat = fpart(coatGeo, chitinMat);
  coat.scale.set(COAT_W, 1, COAT_D);
  body.add(coat);
  // The pale belly plate riding just outside the facets, with dark chitin
  // seams across it (three segments).
  const plate = plateGeometry();
  const wedge = wedgeGeometry();
  const P = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const BELLY = [
    [0.232, 0.1],
    [0.236, 0.2],
    [0.222, 0.3],
    [0.19, 0.38],
  ];
  const bellyGeo = sharedGeo('facet:beetle-belly', () => facetize(new LatheGeometry(BELLY.map(([x, y]) => new Vector2(x * 1.05, y)), 3, -0.575, 1.15), { jitter: 0.06, seed: 403 }));
  const belly = new Mesh(bellyGeo, bellyMat);
  belly.scale.set(COAT_W, 1, COAT_D);
  body.add(belly);
  const seams = placeRow(plate, chitinDarkMat, 3, (i, m) => {
    const y = 0.17 + i * 0.07;
    const r = coatR(y) * 1.075;
    P.set(0, y, r * COAT_D);
    Y.set(0, 0.1 * i, 1).normalize(); // the plate's normal faces out
    X.set(1, 0, 0);
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.22 - i * 0.03, 0.006, 0.012);
  }, { name: 'beetle-seams', seed: 404 });
  body.add(seams);

  // --- The wing cases: two faceted half-domes over the back, split down the
  // middle, opening on the Wing Hop.
  const caseGeos = [-1, 1].map((side) => sharedGeo(`facet:beetle-case${side}`, () => facetize(new SphereGeometry(0.265, 9, 6, side > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI * 0.5), { jitter: 0.08, seed: 405 + side })));
  const cases = [];
  [-1, 1].forEach((side, i) => {
    const pivot = new Group();
    pivot.position.set(0, 0.25, -0.06);
    pivot.rotation.x = -Math.PI / 2 + 0.32;
    body.add(pivot);
    const hinge = new Group();
    pivot.add(hinge);
    const half = fpart(caseGeos[i], caseMat);
    half.scale.set(1.0, 0.62, 1.12);
    half.rotation.y = Math.PI / 2;
    half.position.x = side * 0.006;
    hinge.add(half);
    // chitin studs along each case
    const studs = placeRow(plate, chitinDarkMat, 5, (j, m) => {
      const a = 0.35 + j * 0.28; // along the case from the hinge
      P.set(side * 0.13, Math.cos(a) * 0.165, Math.sin(a) * 0.29);
      Y.set(side * 0.5, Math.cos(a), Math.sin(a)).normalize();
      X.set(1, 0, 0);
      Z.crossVectors(X, Y).normalize();
      X.crossVectors(Y, Z).normalize();
      setTRS(m, P, X, Y, Z, 0.03, 0.012, 0.03);
    }, { name: `beetle-studs${i}`, seed: 409 + i });
    hinge.add(studs);
    cases.push({ side, hinge });
  });
  // Ridge plates down the seam between the cases.
  const ridge = placeRow(wedge, chitinDarkMat, 8, (i, m) => {
    const a = 0.25 + (i / 7) * 1.35; // over the back, nape to tail
    P.set(0, 0.25 + Math.cos(a) * 0.165, -0.06 - Math.sin(a) * 0.27);
    Y.set(0, Math.cos(a), -Math.sin(a)).normalize();
    X.set(1, 0, 0);
    Z.crossVectors(X, Y).normalize();
    setTRS(m, P, X, Y, Z, 0.022, 0.03, 0.05);
  }, { name: 'beetle-ridge', seed: 411, mottle: 0.05 });
  body.add(ridge);

  // The tuning fork tucked at her belt.
  const fork = new Group();
  fork.position.set(0.07, 0.19, 0.235);
  const tineGeo = sharedGeo('facet:beetle-tine', () => new CylinderGeometry(0.006, 0.006, 0.07, 4));
  for (const dx of [-0.012, 0.012]) {
    const tine = new Mesh(tineGeo, boneMat);
    tine.position.set(dx, 0.04, 0);
    fork.add(tine);
  }
  const stemGeo = sharedGeo('facet:beetle-stem', () => new CylinderGeometry(0.007, 0.007, 0.05, 4));
  fork.add(new Mesh(stemGeo, boneMat));
  fork.rotation.z = -0.25;
  body.add(fork);

  // --- Head: round, with big eyes, small mandibles and the curling antennae.
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skullGeo = sharedGeo('facet:beetle-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 421 }));
  const skull = fpart(skullGeo, headMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.1, eyeH: 0.12, spread: 0.2, drop: 0.5 }));
  const mandGeo = sharedGeo('facet:beetle-mandible', () => facetize(new SphereGeometry(0.022, 6, 4), { jitter: 0.08, seed: 423 }));
  const mandMat = facetMaterial(mix(bellyHex, accent, 0.35).getHex());
  for (const side of [-1, 1]) {
    const m = fpart(mandGeo, mandMat);
    m.scale.set(1, 0.7, 1.2);
    m.position.set(side * 0.06, -0.12, SZ * HEAD_R * 0.82);
    head.add(m);
  }
  const antennae = [];
  const beadGeo = sharedGeo('facet:beetle-bead', () => facetize(new SphereGeometry(0.024, 6, 4), { jitter: 0.08, seed: 425 }));
  for (const side of [-1, 1]) {
    const root = new Group();
    root.position.set(side * 0.09, 0.15, 0.08);
    head.add(root);
    let parent = root;
    const segs = [];
    for (const [len, tilt] of [[0.12, 0.35], [0.1, 0.5], [0.08, 0.6]]) {
      const pivot = new Group();
      parent.add(pivot);
      pivot.rotation.set(-tilt * 0.6, 0, side * tilt * 0.45);
      const segGeo = sharedGeo(`facet:beetle-antenna${len}`, () => new CylinderGeometry(0.009, 0.011, len, 4));
      const seg = new Mesh(segGeo, chitinDarkMat);
      seg.position.y = len / 2;
      pivot.add(seg);
      const next = new Group();
      next.position.y = len;
      pivot.add(next);
      segs.push(pivot);
      parent = next;
    }
    parent.add(fpart(beadGeo, bellMat));
    antennae.push(segs);
  }

  // --- The belfry: two posts from the shell, a crossbar under a shingled
  // roof, and the faceted bell hanging from it. Her signature mass.
  const belfry = new Group();
  belfry.position.set(0, 0.3, -0.14);
  body.add(belfry);
  const postGeo = sharedGeo('facet:beetle-post', () => facetize(new CylinderGeometry(0.014, 0.017, BELFRY_Y - 0.3, 5), { jitter: 0.05, seed: 431 }));
  for (const side of [-1, 1]) {
    const post = fpart(postGeo, woodMat);
    post.position.set(side * 0.13, (BELFRY_Y - 0.3) / 2, 0);
    post.rotation.z = -side * 0.08;
    belfry.add(post);
  }
  const barGeo = sharedGeo('facet:beetle-bar', () => facetize(new CylinderGeometry(0.016, 0.016, 0.32, 5), { jitter: 0.05, seed: 433 }));
  const bar = fpart(barGeo, woodMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = BELFRY_Y - 0.3;
  belfry.add(bar);
  const ROOF = 6;
  const roof = placeRow(plate, roofMat, ROOF, (i, m) => {
    const side = i < ROOF / 2 ? -1 : 1;
    const k = i % (ROOF / 2);
    P.set(side * 0.075, BELFRY_Y - 0.3 + 0.05, -0.06 + k * 0.06);
    Y.set(side * 0.62, 0.78, 0).normalize(); // a gable: each shingle faces up and out
    Z.set(0, 0, 1);
    X.crossVectors(Y, Z).normalize();
    setTRS(m, P, X, Y, Z, 0.19, 0.014, 0.07);
  }, { name: 'beetle-roof', seed: 435, mottle: 0.05 });
  belfry.add(roof);
  const swing = new Group();
  swing.position.y = BELFRY_Y - 0.3 - 0.015;
  belfry.add(swing);
  const BELL = [
    [0.0, -0.168],
    [0.122, -0.168],
    [0.098, -0.145],
    [0.08, -0.1],
    [0.072, -0.045],
    [0.05, -0.008],
    [0.0, 0.0],
  ];
  const bellGeo = sharedGeo('facet:beetle-bell', () => facetize(new LatheGeometry(BELL.map(([x, y]) => new Vector2(x, y)), 8), { jitter: 0.06, seed: 437 }));
  swing.add(fpart(bellGeo, bellMat));
  const tongueGeo = sharedGeo('facet:beetle-tongue', () => facetize(new SphereGeometry(0.02, 5, 4), { jitter: 0.06, seed: 439 }));
  const tongue = fpart(tongueGeo, chitinDarkMat, false);
  tongue.position.y = -0.16;
  swing.add(tongue);

  // --- The mallet: a wooden handle with bound grip and a faceted bronze
  // head.
  const mallet = new Group();
  body.add(mallet);
  const handleGeo = sharedGeo('facet:beetle-handle', () => facetize(new CylinderGeometry(0.012, 0.014, 0.26, 5), { jitter: 0.05, seed: 441 }));
  const handle = fpart(handleGeo, woodMat);
  handle.position.y = 0.11;
  mallet.add(handle);
  const mheadGeo = sharedGeo('facet:beetle-mallet', () => facetize(new CapsuleGeometry(0.035, 0.05, 2, 6), { jitter: 0.08, seed: 443 }));
  const mhead = fpart(mheadGeo, bellMat);
  mhead.rotation.z = Math.PI / 2;
  mhead.position.y = 0.25;
  mallet.add(mhead);
  const bindings = placeRow(plate, cordMat, 3, (i, m) => {
    P.set(0, 0.0 + i * 0.035, 0);
    setTRS(m, P, X.set(1, 0, 0), Y.set(0, 1, 0), Z.set(0, 0, 1), 0.034, 0.012, 0.034);
  }, { name: 'beetle-bindings', seed: 445 });
  mallet.add(bindings);
  const pawGeo = sharedGeo('facet:paw', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 91 }));
  const gripPaw = fpart(pawGeo, chitinMat);
  gripPaw.scale.setScalar(0.048);
  gripPaw.position.set(0, 0.04, 0.02);
  mallet.add(gripPaw);
  // The named points (B8): the hand on the grip, the tip at the mallet's
  // head where the chime leaves.
  const hand = namedPoint(mallet, 'hand', 0, 0.04, 0.0);
  const tip = namedPoint(mallet, 'tip', 0, 0.25, 0);
  const gripLocal = new Vector3(0, 0.04, 0.0);
  const gripBody = new Vector3();

  // --- Arms, the free paw and the stubby feet.
  const armL = facetArm(chitinMat, 0.045, 0.18, 453);
  armL.position.set(-0.2, 0.34, 0.07);
  body.add(armL);
  const armR = facetArm(chitinMat, 0.045, 0.18, 455);
  armR.position.set(0.2, 0.34, 0.07);
  body.add(armR);
  const freePaw = fpart(pawGeo, chitinMat);
  freePaw.scale.setScalar(0.046);
  body.add(freePaw);

  const HOME = [new Vector3(-0.12, 0.044, 0.15), new Vector3(0.12, 0.044, 0.15)];
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(pawGeo, chitinDarkMat);
    foot.scale.set(0.066, 0.042, 0.075);
    foot.position.copy(HOME[i]);
    rig.add(foot); // feet stay planted: they do not inherit the torso lean
    feet.push(foot);
  }

  // ------------------------------------------------------------------------
  // Locked feet and the strikes (the hero core: render/facet/hero.js). The
  // mallet-side foot (+X) steps forward into a lunge.
  // ------------------------------------------------------------------------
  const lock = createFootLock({ rig, feet, home: HOME, lunge: { lead: 1, reach: 0.13, brace: 0.03 } });
  const atk = createAttackClock({ pack: PACK, hits: HITS, abilities: MOVES, skillAbility, window: COMBO_WINDOW, ranged: true });
  let lastT = null;
  const live = PACK.make();
  const lagged = PACK.make();
  const led = PACK.make();
  const idle = PACK.make();
  const walk = {};

  let drawnMrx = REST.mrx;
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
    // the mallet's pitch (weaponField 'mrx'), as drawn: it trails the hips
    swing: () => drawnMrx,
    parts: { torso, head, weapon: mallet, mallet },
  };
  const flatQ = new Quaternion();
  const flatE = new Euler();
  const flatP = new Vector3();
  // The belfry bell: a damped pendulum the strikes kick (pure in the
  // mallet's drawn pitch, so a hitstop holds it with the rest of the rig).
  let bellA = 0;
  let bellV = 0;
  let lastMrx = REST.mrx;

  function apply(Pz, t, fallSign, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const upright = 1 - Pz.collapse;

    antennae.forEach((segs, k) => {
      const side = k === 0 ? -1 : 1;
      segs.forEach((s, i) => {
        s.rotation.x = -(0.21 + i * 0.09) + 0.18 * Pz.ear * (1 + i * 0.5) - 0.06 * Math.abs(Pz.stride) * i - Pz.collapse * 0.3;
        s.rotation.z = side * (0.16 + i * 0.07) + 0.05 * Math.sin(t * 3.1 + i + k);
      });
    });

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
    // The thrower's squash (B3, shots): 20/29/38% wider on steady fire and a
    // rig-only shove back off the strike, after the press.
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

    // The mallet: a strike places it (a frame behind the hips); otherwise
    // the stance, with the classic's generic cast (raise and strike) on top.
    let S;
    if (attacking) S = lagged;
    else {
      S = PACK.copy(idle, REST);
      const lift = Math.max(0, Pz.prop);
      const wind = Math.min(0, Pz.prop);
      S.mrx += -1.1 * lift + 0.55 * wind;
      S.mrz += -0.15 * lift;
      S.my += 0.06 * lift;
      S.ox += 0.03 * lift;
      S.oy += 0.08 * lift;
      S.oz += 0.08 * lift;
    }
    drawnMrx = S.mrx;
    mallet.position.set(S.mx, S.my, S.mz);
    mallet.rotation.set(S.mrx, 0, S.mrz);
    const lay = Pz.collapse;
    if (lay > 0) {
      flatQ.setFromEuler(flatE.set(Math.PI / 2 - 0.2, 0, fallSign * 0.6));
      mallet.quaternion.slerp(flatQ, lay);
      mallet.position.lerp(flatP.set(0.28, 0.06, 0.16), lay);
    }
    mallet.updateMatrix();
    aimArm(armR, gripBody.copy(gripLocal).applyMatrix4(mallet.matrix));
    freePaw.position.set(S.ox, S.oy, S.oz);
    aimArm(armL, freePaw.position);

    // The wing cases: a hair apart on the walk, wide open on the Wing Hop.
    const open = Math.max(0, Math.min(1, S.wing));
    for (const c of cases) {
      c.hinge.rotation.z = c.side * (0.03 * Math.abs(Pz.stride) + 0.55 * open);
      c.hinge.rotation.x = 0.35 * open;
    }

    // The belfry bell: swings with the walk; each strike's downswing kicks
    // it (the mallet's drawn pitch speed), and it rings down on its own.
    if (dt > 0) {
      const kick = Math.max(0, S.mrx - lastMrx);
      bellV += kick * 6 - (bellA * 120 + bellV * 7) * dt;
      bellA += bellV * dt;
      bellA = Math.max(-0.7, Math.min(0.7, bellA));
    }
    lastMrx = S.mrx;
    const lift = Math.max(0, Pz.prop);
    swing.rotation.x = 0.22 * Pz.stride * upright + bellA + 0.5 * lift * Math.sin(t * 18) + 0.06 * Math.sin(t * 1.7) * (1 - lift);
    swing.rotation.z = 0.08 * Pz.tail;
    tongue.position.z = -swing.rotation.x * 0.04;

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
    basePitch: 0.02,
    metrics: {
      standHeight: BELFRY_Y + 0.04,
      earTopY: HEAD_C + 0.3,
      domeTopY: HEAD_C + HEAD_R * SY,
      chinY: HEAD_C - HEAD_R * SY,
      headR: HEAD_R * SX,
      halfWidth: 0.26,
      ringRadius: 0.48,
      hipY: HIP,
    },
  };
}

// The model lab's basic combo: three strikes at the Bellwright's real
// cadence (ALLY_CLASSES.bellwright.attackIntervalTicks in sim/allies.js:
// 0.4 s; the heroes probe checks the two agree). Pure in t, so it rewinds.
export const SWING_SEC = 0.4;
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC, ranged: true, label: 'Basic combo' });

// The Bellwright in the model-standard registry (render/facet/heroes.js).
export const BELLWRIGHT_SPEC = Object.freeze({
  id: 'bellwright',
  label: 'Bellwright',
  build: buildBellwrightFacet,
  hits: HITS,
  moves: MOVES,
  skillAbility,
  swingSec: SWING_SEC,
  comboLab: COMBO_LAB,
  ranged: true,
  walkSpeed: WALK_SPEED,
  weaponField: 'mrx',
  lab: {
    abilities: [
      ['combo', 'Basic combo'],
      ['hang', 'Hang Bell'],
      ['peal', 'Peal'],
      ['clap', 'Clapper'],
      ['hum', 'Hum'],
      ['swing', 'Bell Swing'],
      ['hop', 'Wing Hop'],
      ['chime', 'Chime'],
      ['spawn', 'Spawn'],
    ],
    frame: { y: 0.6, z: 0, dist: 3.6, speed: 2.35, loop: 2.2, side: 1.3 },
    cues: {
      strike: { sound: 'bw_ding', pitch: 1, fx: 'flash' },
      finisher: { sound: 'bw_toll', pitch: 0.9, fx: ['flash', 'star'], size: 1.5 },
      hang: { sound: 'bw_hang', pitch: 1, fx: 'ring' },
      peal: { sound: 'bw_peal', pitch: 1, fx: ['ring', 'star'], size: 1.3 },
      clap: { sound: 'bw_clap', pitch: 1, fx: ['flash', 'star'], size: 1.2 },
      hum: { sound: 'bw_fork', pitch: 0.8, fx: 'ring', size: 1.4 },
      swing: { sound: 'bw_swing', pitch: 1, fx: ['flash', 'star'], size: 1.2 },
      hop: { sound: 'bw_hop', pitch: 1, fx: 'ring' },
      chime: { sound: 'bw_vesper', pitch: 1, fx: 'star', size: 1.2 },
    },
  },
});
