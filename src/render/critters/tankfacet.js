// TANK, MODEL STANDARD (docs/MODEL_STANDARD.md). The pilot hero of the
// faceted look from Kesh's sample video, laid ON TOP of the chibi badger of
// tank.js (BUILD_BRIEF §19.2): the same widest, lowest body, the same
// head-stripe two-tone and painted face, the same squared shoulder block as
// the party's only rectangular mass, the same ink. What changes:
//
//   * every mass is faceted (render/facet/material.js): the coat is a ten-
//     sided bell, the skull a low-poly ball, the arms and paws cut flat;
//   * detail from the parts kit (render/facet/kit.js): a stack of ridged
//     lames over the shoulder with a crest of three steel spikes, a riveted
//     slab with a boss, scale mail down the tabard, a plated belt;
//   * a THREE-HIT SHIELD COMBO on the basic attack (Kesh's animation
//     template): a backhand bash right to left, a rising bash low left to high
//     right, then an overhead slam with a lunge step. Each hit's overshoot
//     and settle IS the next hit's wind-up, the hips lead and the slab trails
//     a frame behind (weight), and the off paw joins it for the slam;
//   * two ability timelines for his skills: Heavy Slam (every melee arc and
//     ground skill) and Brace (every nova, guard and aura skill);
//   * LOCKED FEET (Kesh's self-check): each foot is pinned to the floor in
//     world space while it carries weight and steps only when the stance
//     needs it, toward where the body is actually going, so the feet never
//     skate, a walk backward or sideways steps backward or sideways, and the
//     slam's front foot steps into the lunge while the back foot anchors.
//
// The heroes slice (v0.5.335) re-measured him against the [M] rules of the
// VFX/hit rules doc (§6.1) and moved his machinery onto the shared hero core
// (render/facet/hero.js): each blow pulls back before it and lunges into its
// contact with a 20-25° lean and a squash held through the hitstop (B2, B9),
// recoils off a connect (B3), recovers with one small overshoot (B5), grows
// in from the floor on a room entry (B7) and names its hand and slab tip
// (B8).
//
// Same contract as buildTank (apply, torso, head, basePitch, metrics), plus
// `cue(kind, ev)`, `hold(dt)`, `comboHitOf(ev)`, `points` and `lab`. Render
// only: attack timing, damage and the sim are untouched.
import { BoxGeometry, CylinderGeometry, Group, LatheGeometry, Mesh, OctahedronGeometry, SphereGeometry, Vector2, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { exactHex, faceDecal, faceMarkings, INK_PX, mix } from './common.js';
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
  HIT_TIMING,
  LUNGE_PITCH_MAX,
  namedPoint,
  posePack,
  RECOIL,
  walkBody,
} from '../facet/hero.js';

const HIP = 0.19;
const HEM = 0.022;
const HEAD_C = 0.767;
const HEAD_R = 0.232;
const SX = 1.08, SY = 0.92, SZ = 1.0;
const EAR_TOP = 1.02;
const BODY_SCALE_X = 1.35;
const COAT = [
  [0, HEM],
  [0.23, HEM],
  [0.31, 0.055],
  [0.335, 0.15],
  [0.325, 0.27],
  [0.295, 0.39],
  [0.24, 0.47],
  [0.165, 0.535],
  [0.115, 0.575],
  [0, 0.6],
];
// The coat's radius at a height (the scale mail and belt sit on it).
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

// ALLY_CLASSES.tank.moveSpeed (u/s): full walk lean at full speed
const WALK_SPEED = 2.1;
// Basic attack: a shot inside this window of the last one is the next hit
// (the Tank swings every 0.65 s; docs/MODEL_STANDARD.md).
export const COMBO_WINDOW = 1.0;
export const WIND = HIT_TIMING.wind;

// --- Key poses (body space). The body fields are the hero core's (yaw,
// pitch, roll: torso; rx, ry, rz: the root's weight shift; sw, sh: squash;
// step: the lunge foot); sx..srz: the shoulder block (slab) position and
// rotation; paw: 0..1 the off paw on the slab.
const PACK = posePack({ sx: 0.26, sy: 0.53, sz: 0.01, srx: 0, sry: 0, srz: -0.16, paw: 0 });
const { REST, K } = PACK;
// Each wind-up pulls the weight back (rz < 0) a few frames before contact;
// each contact lunges past rest (rz > 0) and leans 20-25° into the target
// with a squash held through the hitstop (+19% wide, -9% tall; B9); the
// overshoot snaps the squash back in 2 frames.
// Hit 1, BACKHAND BASH: horizontal, the slab's side (+X) to the other side.
const A1 = K({ yaw: 0.55, pitch: -0.06, sx: 0.37, sy: 0.5, sz: -0.12, sry: 0.62, srz: -0.32, rx: 0.035, rz: -0.05, sw: 1.04, sh: 0.97 });
const S1 = K({ yaw: -0.42, pitch: 0.38, sx: -0.02, sy: 0.5, sz: 0.36, sry: -0.72, srz: -0.04, rx: -0.03, rz: 0.08, sw: 1.19, sh: 0.91 });
const O1 = K({ yaw: -0.62, pitch: 0.24, sx: -0.17, sy: 0.47, sz: 0.25, sry: -0.98, srz: 0.08, rx: -0.04, rz: 0.06, sw: 1.02, sh: 0.99 });
// Hit 2, RISING BASH: low on the far side, up across to high on the slab
// side; the legs drive the body up and into it.
const A2 = K({ yaw: -0.55, pitch: -0.04, sx: -0.15, sy: 0.33, sz: 0.2, srx: 0.32, sry: -0.82, srz: 0.32, rx: -0.03, ry: -0.03, rz: -0.05, sw: 1.06, sh: 0.95 });
const S2 = K({ yaw: 0.36, pitch: 0.37, sx: 0.34, sy: 0.76, sz: 0.22, srx: -0.52, sry: 0.4, srz: -0.46, rx: 0.02, ry: 0.03, rz: 0.08, sw: 1.19, sh: 0.91 });
const O2 = K({ yaw: 0.5, pitch: 0.18, sx: 0.38, sy: 0.85, sz: 0.06, srx: -0.92, sry: 0.46, srz: -0.4, ry: 0.03, rz: 0.05, sw: 1.0, sh: 1.02 });
// Hit 3, CRUSHING SLAM (the finisher, the biggest: B6): overhead on the toes,
// stretched tall, then down into the ground ahead with a lunge step, the
// deepest lean and squash; both paws on the slab.
const A3 = K({ yaw: 0.14, pitch: -0.2, sx: 0.1, sy: 0.98, sz: -0.04, srx: -1.22, sry: 0.1, srz: 0, ry: 0.045, rz: -0.06, sw: 0.94, sh: 1.08, paw: 1 });
const S3 = K({ yaw: -0.05, pitch: 0.42, sx: 0.05, sy: 0.3, sz: 0.47, srx: 0.92, sry: 0, srz: 0, ry: -0.07, rz: 0.14, sw: 1.19, sh: 0.88, paw: 1, step: 1 });
const O3 = K({ yaw: -0.07, pitch: 0.3, sx: 0.05, sy: 0.25, sz: 0.5, srx: 1.0, sry: 0, srz: 0, ry: -0.08, rz: 0.14, sw: 1.06, sh: 0.96, paw: 1, step: 1 });
const HITS = createCombo(
  PACK,
  [
    { label: 'backhand bash', from: A1, strike: S1, over: O1 },
    { label: 'rising bash', from: A2, strike: S2, over: O2 },
    { label: 'crushing slam', from: A3, strike: S3, over: O3 },
  ],
  { window: COMBO_WINDOW }
);
// (for the probes: the chain and its timelines)
export const TANK_HITS = HITS;

// Heavy Slam (every melee arc and ground skill) and Brace (every nova, guard
// and aura skill). In game a skill enters its timeline 0.08 s before the
// strike (its gather plays after the press, compressed into it), so the
// blow lands with the sim's hit while the wind-up still shows; the lab plays
// the whole wind-up. Both settle into the stance with one small overshoot.
const G_SLAM = K({ yaw: 0.2, pitch: -0.2, sx: 0.08, sy: 1.02, sz: -0.08, srx: -1.35, sry: 0.12, ry: 0.05, rz: -0.06, sw: 0.92, sh: 1.1, paw: 1 });
const S_SLAM = K({ yaw: -0.04, pitch: 0.42, sx: 0.04, sy: 0.26, sz: 0.5, srx: 1.05, ry: -0.09, rz: 0.14, sw: 1.19, sh: 0.86, paw: 1, step: 1 });
const G_BRACE = K({ yaw: 0.3, pitch: 0.1, sx: 0.2, sy: 0.42, sz: 0.06, srx: 0.2, sry: 0.4, srz: -0.3, ry: 0.04, sw: 0.95, sh: 1.06 });
const S_BRACE = K({ yaw: 0, pitch: 0.12, roll: 0, sx: 0.04, sy: 0.4, sz: 0.4, srx: 0.08, sry: 0, srz: 0, ry: -0.05, rz: 0.06, sw: 1.1, sh: 0.92, paw: 1, step: 0.6 });
// the impact skid and the held brace breathe a little
const breathe = (out, s) => {
  if (s.id === 'impact' || s.id === 'hold') out.ry += -0.01 * Math.sin(s.k * Math.PI);
};
export const TANK_MOVES = Object.freeze({
  slam: createMove(
    PACK,
    'slam',
    'Heavy Slam',
    [
      { id: 'gather', label: 'gather', dur: 0.32, to: G_SLAM, ease: 'out' },
      { id: 'strike', label: 'strike', dur: 0.09, to: S_SLAM, ease: 'in' },
      { id: 'impact', label: 'impact', dur: 0.28, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.42, to: REST, ease: 'settle' },
    ],
    { contact: 'impact', entry: 'strike', cues: [{ at: 0.41, id: 'impact' }], recoil: true, extra: breathe }
  ),
  brace: createMove(
    PACK,
    'brace',
    'Brace',
    [
      { id: 'gather', label: 'gather', dur: 0.26, to: G_BRACE, ease: 'out' },
      { id: 'plant', label: 'plant', dur: 0.1, to: S_BRACE, ease: 'in' },
      { id: 'hold', label: 'hold', dur: 0.42, to: null, ease: 'hold' },
      { id: 'settle', label: 'settle', dur: 0.4, to: REST, ease: 'settle' },
    ],
    { contact: 'hold', entry: 'plant', cues: [{ at: 0.36, id: 'plant' }], extra: breathe }
  ),
});
export const TANK_ABILITIES = Object.freeze({ slam: TANK_MOVES.slam.timeline, brace: TANK_MOVES.brace.timeline });
// Which ability a Tank skill plays, by its shape (all eleven skills).
export const TANK_SKILL_ABILITY = Object.freeze({ melee_arc: 'slam', ground_aoe: 'slam', nova: 'brace', direct: 'brace', aura: 'brace' });
const skillAbility = (ev) => TANK_SKILL_ABILITY[ev && ev.shape] || 'brace';

// Pure: the pose of hit n at time t into it. `capture` is the pose the hit
// started from: a fresh hit (from rest) winds from it into its wind-up; a
// chained hit strikes straight from it (the held wind-up, or wherever a fast
// swing caught the last one).
export function hitPose(n, t, capture, fresh, out = PACK.make()) {
  return HITS[n].move.pose(t, capture, out, fresh ? 0 : 1);
}
// Pure: the pose of an ability at time t (from the stance).
export function abilityPose(id, t, out = PACK.make()) {
  return TANK_MOVES[id].pose(t, REST, out, 0);
}
export const TANK_REST = REST;

export function buildTankFacet(rig, trackAccent) {
  const accent = CLASS_ACCENTS.tank;
  const fur = mix(PALETTE.warmGrey, PALETTE.bone, 0.16);
  const furHex = fur.getHex();
  const furDark = mix(PALETTE.warmGrey, PALETTE.bruiseUmber, 0.45).getHex();
  const leatherHex = mix(PALETTE.bruiseUmber, PALETTE.voidCharcoal, 0.28).getHex();
  // The armour: the class accent in three facet tones, its darker trim, a
  // warm steel for the lame edges and spikes, and the rivets and boss in the
  // classic buckle tongue's dull brass (Bone into Bruise Umber): no Earth
  // Ochre or gold on the body, so nothing nears the reserved Hearth Amber
  // family and Bone stays the brightest value (tank.js round-3 F9).
  const steelHex = mix(accent, PALETTE.bone, 0.42).getHex();
  const brassHex = mix(PALETTE.bone, PALETTE.bruiseUmber, 0.45).getHex();

  const torso = new Group();
  torso.position.y = HIP;
  rig.add(torso);
  const body = new Group();
  body.position.y = -HIP;
  torso.add(body);

  const coatMat = trackAccent(facetMaterial(furHex));
  const furDarkMat = facetMaterial(furDark);
  const boneMat = facetMaterial(PALETTE.bone);
  const accentMat = trackAccent(facetMaterial(accent));
  const trimMat = trackAccent(facetMaterial(mix(accent, PALETTE.voidCharcoal, 0.22).getHex()));
  const steelMat = trackAccent(facetMaterial(steelHex));
  const brassMat = trackAccent(facetMaterial(brassHex));
  const leatherMat = trackAccent(facetMaterial(leatherHex));

  // --- Widest, lowest body: a ten-sided faceted bell.
  const coatGeo = facetize(new LatheGeometry(COAT.map(([x, y]) => new Vector2(x, y)), 10), { jitter: 0.15, seed: 61 });
  const coat = fpart(coatGeo, coatMat);
  coat.scale.set(BODY_SCALE_X, 1, 1.06);
  body.add(coat);

  // Tabard (accent) down the chest, and scale mail over it.
  const TAB = [
    [0.325, 0.1],
    [0.335, 0.15],
    [0.325, 0.27],
    [0.295, 0.39],
    [0.24, 0.47],
    [0.185, 0.53],
  ];
  const tabGeo = facetize(new LatheGeometry(TAB.map(([x, y]) => new Vector2(x * 1.024, y)), 4, -0.36, 0.72), { jitter: 0.06, seed: 63 });
  const tabard = new Mesh(tabGeo, accentMat);
  tabard.scale.set(BODY_SCALE_X, 1, 1.06);
  body.add(tabard);
  const plate = plateGeometry();
  const P = new Vector3();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const onCoat = (m, phi, y, out, w, h, l, tilt) => {
    // a plate on the coat surface at angle phi (0 = front) and height y
    const r = coatR(y) * out;
    const sx = Math.sin(phi);
    const cz = Math.cos(phi);
    P.set(sx * r * BODY_SCALE_X, y, cz * r * 1.06);
    Y.set(sx / BODY_SCALE_X, 0.25, cz / 1.06).normalize(); // outward
    X.set(cz, 0, -sx).normalize();
    Z.crossVectors(X, Y).normalize();
    // tip the lower edge out so each row overlaps the one under it
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const yx = Y.x * c - Z.x * s, yy = Y.y * c - Z.y * s, yz = Y.z * c - Z.z * s;
    Z.set(Z.x * c + Y.x * s, Z.y * c + Y.y * s, Z.z * c + Y.z * s);
    Y.set(yx, yy, yz);
    setTRS(m, P, X, Y, Z, w, h, l);
  };
  const MAIL_ROWS = [0.36, 0.29, 0.22, 0.15];
  const MAIL_COLS = 4;
  const mail = placeRow(plate, trimMat, MAIL_ROWS.length * MAIL_COLS, (i, m) => {
    const row = Math.floor(i / MAIL_COLS);
    const col = i % MAIL_COLS;
    const phi = (-0.27 + (0.54 * (col + 0.5 * (row % 2))) / MAIL_COLS) * 0.95;
    onCoat(m, phi, MAIL_ROWS[row], 1.05, 0.105, 0.05, 0.085, 0.35);
  }, { name: 'tank-mail', seed: 65 });
  body.add(mail);
  // Plated belt with bronze rivets.
  const BELT = 12;
  const belt = placeRow(plate, leatherMat, BELT, (i, m) => {
    onCoat(m, (i / BELT) * Math.PI * 2, 0.1, 1.03, 0.2, 0.045, 0.075, 0.1);
  }, { name: 'tank-belt', seed: 67 });
  body.add(belt);
  const rivet = sharedGeo('facet:rivet', () => facetize(new OctahedronGeometry(1, 0), { jitter: 0.1, seed: 69 }));
  const RIVETS = 6;
  const rivets = placeRow(rivet, brassMat, RIVETS, (i, m) => {
    const phi = -0.75 + (1.5 * i) / (RIVETS - 1);
    onCoat(m, phi, 0.1, 1.09, 0.024, 0.024, 0.024, 0);
  }, { name: 'tank-rivets', ink: false });
  body.add(rivets);

  // Narrow accent collar AT the chin (as tank.js), faceted.
  const collarGeo = sharedGeo('facet:tank-collar', () => facetize(new CylinderGeometry(0.125, 0.165, 0.075, 8), { jitter: 0.08, seed: 71 }));
  const collar = fpart(collarGeo, trimMat);
  collar.position.y = 0.552;
  body.add(collar);

  // --- Head: broad and low, a low-poly ball. The painted face and stripes
  // ride just outside it (a facet's middle sits inside the true sphere, so
  // the paint never sinks into it).
  const head = new Group();
  head.position.y = HEAD_C;
  body.add(head);
  const skullGeo = sharedGeo('facet:tank-skull', () => facetize(new SphereGeometry(HEAD_R, 12, 9), { jitter: 0.07, seed: 73 }));
  const skull = fpart(skullGeo, coatMat);
  skull.scale.set(SX, SY, SZ);
  head.add(skull);
  const stripe = exactHex(mix(PALETTE.voidCharcoal, PALETTE.bruiseUmber, 0.35).getHex());
  const blaze = exactHex(PALETTE.bone);
  head.add(
    faceMarkings({
      R: HEAD_R,
      sx: SX,
      sy: SY,
      sz: SZ,
      paint: (ctx, S) => {
        ctx.fillStyle = blaze;
        ctx.fillRect(S * 0.425, 0, S * 0.15, S);
        ctx.fillStyle = stripe;
        for (const side of [-1, 1]) {
          const cx = S * (0.5 + side * 0.235);
          ctx.beginPath();
          ctx.moveTo(cx - S * 0.075, 0);
          ctx.quadraticCurveTo(cx - S * 0.028, S * 0.58, cx - S * 0.06, S);
          ctx.lineTo(cx + S * 0.06, S);
          ctx.quadraticCurveTo(cx + S * 0.028, S * 0.58, cx + S * 0.075, 0);
          ctx.closePath();
          ctx.fill();
        }
      },
    })
  );
  const earGeo = sharedGeo('facet:tank-ear', () => facetize(new SphereGeometry(0.075, 7, 5), { jitter: 0.1, seed: 75 }));
  const ears = [];
  for (const side of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(side * 0.175, 0.14, -0.04);
    const ear = fpart(earGeo, furDarkMat);
    ear.scale.set(1, 1, 0.5);
    ear.position.y = 0.05;
    pivot.add(ear);
    pivot.rotation.z = side * -0.18;
    head.add(pivot);
    ears.push(pivot);
  }
  const snoutGeo = sharedGeo('facet:tank-snout', () => facetize(new SphereGeometry(0.09, 8, 6), { jitter: 0.08, seed: 77 }));
  const snout = fpart(snoutGeo, boneMat);
  snout.scale.set(1.0, 0.6, 0.95);
  snout.position.set(0, -0.108, SZ * HEAD_R * 0.78);
  head.add(snout);
  const noseGeo = sharedGeo('facet:tank-nose', () => facetize(new SphereGeometry(0.023, 6, 4), { jitter: 0.05, seed: 79 }));
  const nose = fpart(noseGeo, facetMaterial(PALETTE.voidCharcoal), false);
  nose.position.set(0, -0.072, SZ * HEAD_R * 0.78 + 0.07);
  head.add(nose);
  head.add(faceDecal({ R: HEAD_R, sx: SX, sy: SY, sz: SZ, eyeW: 0.115, eyeH: 0.135, spread: 0.215, drop: 0.58, sclera: 0.34 }));

  // --- THE squared mass: the shoulder block, now a stack of ridged lames
  // over a riveted slab, crested with three steel spikes.
  const shield = new Group();
  shield.position.set(REST.sx, REST.sy, REST.sz);
  shield.rotation.z = REST.srz;
  body.add(shield);
  const blockGeo = sharedGeo('facet:tank-block', () => facetize(new BoxGeometry(0.34, 0.16, 0.32), { jitter: 0.08, seed: 81 }));
  const pauldron = fpart(blockGeo, accentMat);
  shield.add(pauldron);
  const LAMES = 3;
  const lames = placeRow(plate, accentMat, LAMES, (i, m) => {
    // three overlapping lames stepping down the outer (+X) side of the block,
    // each tipped further out, like an armadillo's bands
    const a = 0.35 + i * 0.42; // tilt out from vertical-up toward +X
    P.set(0.1 + i * 0.07, 0.085 - i * 0.065, 0);
    Y.set(Math.sin(a), Math.cos(a), 0);
    Z.set(0, 0, 1);
    X.crossVectors(Y, Z).normalize();
    setTRS(m, P, X, Y, Z, 0.2, 0.09, 0.35 - i * 0.02);
  }, { name: 'tank-lames', seed: 83 });
  shield.add(lames);
  const wedge = wedgeGeometry();
  const spikes = placeRow(wedge, steelMat, 3, (i, m) => {
    P.set(-0.02, 0.07, -0.1 + i * 0.1);
    Y.set(0.15, 1, -0.25).normalize();
    X.set(1, 0, 0).addScaledVector(Y, -Y.x).normalize();
    Z.crossVectors(X, Y);
    const h = i === 1 ? 0.19 : 0.14;
    setTRS(m, P, X, Y, Z, 0.1, h, 0.09);
  }, { name: 'tank-crest', inkPx: INK_PX * 0.6, seed: 85 });
  shield.add(spikes);
  const slabGeo = sharedGeo('facet:tank-slab', () => facetize(new BoxGeometry(0.085, 0.22, 0.26), { jitter: 0.08, seed: 87 }));
  const slab = fpart(slabGeo, trimMat);
  slab.position.set(0.13, -0.19, 0);
  shield.add(slab);
  const bossGeo = sharedGeo('facet:tank-boss', () => facetize(new OctahedronGeometry(0.06, 0), { jitter: 0.12, seed: 89 }));
  const boss = fpart(bossGeo, brassMat);
  boss.scale.set(0.55, 1, 1);
  boss.position.set(0.178, -0.19, 0);
  shield.add(boss);
  const STUDS = 6;
  const studs = placeRow(rivet, brassMat, STUDS, (i, m) => {
    const y = i < 3 ? 0.08 : -0.08;
    const z = (-1 + (i % 3)) * 0.1;
    setTRS(m, P.set(0.175, -0.19 + y, z), X.set(1, 0, 0), Y.set(0, 1, 0), Z.set(0, 0, 1), 0.013, 0.017, 0.017);
  }, { name: 'tank-studs', ink: false });
  shield.add(studs);
  // The named points (B8): the grip paw and the slab's striking edge.
  const hand = namedPoint(shield, 'hand', -0.02, -0.11, 0.16);
  const tip = namedPoint(shield, 'tip', 0.175, -0.3, 0);

  // --- Arms, the off paw, the feet, the tail (all faceted).
  const armR = facetArm(coatMat, 0.06, 0.22);
  armR.position.set(0.31, 0.46, 0.06);
  body.add(armR);
  const armL = facetArm(coatMat, 0.06, 0.22);
  armL.position.set(-0.31, 0.46, 0.06);
  body.add(armL);
  const pawGeo = sharedGeo('facet:paw', () => facetize(new SphereGeometry(1, 7, 5), { jitter: 0.08, seed: 91 }));
  const pawL = fpart(pawGeo, coatMat);
  pawL.scale.setScalar(0.07);
  const PAW_REST = new Vector3(-0.46, 0.29, 0.2);
  pawL.position.copy(PAW_REST);
  body.add(pawL);
  const shieldGripLocal = new Vector3(-0.02, -0.11, 0.16);
  const shieldOffGrip = new Vector3(0.0, -0.3, 0.12); // where the off paw grips for a slam
  const gripWorld = new Vector3();
  const offGrip = new Vector3();

  const HOME = [new Vector3(-0.235, 0.052, 0.33), new Vector3(0.235, 0.052, 0.33)];
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const foot = fpart(pawGeo, furDarkMat);
    foot.scale.set(0.078, 0.078 * 0.72, 0.078);
    foot.position.copy(HOME[i]);
    rig.add(foot); // feet stay planted: they do not inherit the torso lean
    feet.push(foot);
  }
  const tailPivot = new Group();
  tailPivot.position.set(0, 0.17, -0.36);
  const tailGeo = sharedGeo('facet:tank-tail', () => facetize(new SphereGeometry(0.095, 7, 5), { jitter: 0.08, seed: 93 }));
  const tail = fpart(tailGeo, coatMat);
  tail.scale.set(1, 0.85, 0.7);
  tailPivot.add(tail);
  body.add(tailPivot);


  // ------------------------------------------------------------------------
  // Locked feet and the attacks (the hero core: render/facet/hero.js).
  // ------------------------------------------------------------------------
  const lock = createFootLock({ rig, feet, home: HOME, lunge: { lead: 0, reach: 0.16, brace: 0.03 } });
  const atk = createAttackClock({
    pack: PACK,
    hits: HITS,
    abilities: TANK_MOVES,
    skillAbility,
    window: COMBO_WINDOW,
  });
  let lastT = null;
  const live = PACK.make();
  const lagged = PACK.make();
  const led = PACK.make();
  const walk = {};

  // The model lab drives these instead of the live clock (pure in time).
  const lab = {
    abilities: TANK_MOVES,
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
    // the weapon's swing (weaponField), as drawn: it trails the hips
    swing: () => shield.rotation.y,
    parts: { torso, shield, head, weapon: shield },
  };

  function apply(P, t, fallSign, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const upright = 1 - P.collapse;

    // COMMON-MODE ear sway (as tank.js).
    ears[0].rotation.z = -0.18 + 0.5 * P.ear - P.collapse * 0.4;
    ears[1].rotation.z = 0.18 + 0.5 * P.ear + P.collapse * 0.4;
    tailPivot.rotation.y = P.tail * 0.5;

    atk.advance(dt, clip);
    const attacking = atk.active && clip !== 'downed';
    // The hips lead, the slab trails (sampled a frame apart on one timeline).
    if (attacking) atk.sample(live, led, lagged);

    // Torso and root: an attack owns them; otherwise the driver's clip does.
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
    // The recoil off a connect (B3): a rig-only shove and lean back, after
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

    // The slab: an attack places it (a frame behind the hips); otherwise
    // the idle flourish and the generic cast lift it as tank.js does.
    if (attacking) {
      shield.position.set(lagged.sx, lagged.sy, lagged.sz);
      shield.rotation.set(lagged.srx, lagged.sry, lagged.srz);
    } else {
      const thrust = Math.max(0, P.prop);
      const wind = Math.min(0, P.prop);
      shield.position.set(0.26 - 0.05 * thrust + 0.05 * wind, 0.53 + 0.1 * thrust, 0.28 * thrust + 0.14 * wind);
      shield.rotation.set(-0.3 * thrust, 0.5 * wind, REST.srz);
    }
    shield.updateMatrix();
    aimArm(armR, gripWorld.copy(shieldGripLocal).applyMatrix4(shield.matrix));
    // the off paw joins the slab for the heavy blows (two hands: its weight)
    const paw = attacking ? lagged.paw : 0;
    offGrip.copy(shieldOffGrip).applyMatrix4(shield.matrix);
    pawL.position.lerpVectors(PAW_REST, offGrip, paw);
    aimArm(armL, pawL.position);

    // Feet: locked to the floor, stepping on their own; through the grow-in
    // they ride the body (a foot planted at full size would stand apart).
    const locked = P.collapse < 0.04;
    lock.step(dt, attacking ? live : REST, locked && sp === 1);
    // The walk's bob, sway, twist and travel lean come from the steps.
    if (locked && clip === 'walk' && !attacking) {
      walkBody(lock, { walkSpeed: WALK_SPEED }, walk);
      rig.position.y += walk.dy - P.bob * upright * 0.6;
      torso.rotation.x = walk.pitch * upright;
      torso.rotation.y = walk.twist * upright;
      torso.rotation.z = walk.roll * upright;
      head.rotation.x = -torso.rotation.x * 0.88 - 0.18 * upright;
      head.rotation.y = -walk.twist * 0.55 * upright;
    }
  }

  return {
    apply,
    cue: atk.cue,
    hold: atk.hold,
    comboHitOf: atk.comboHitOf,
    points: { hand, tip },
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
      halfWidth: 0.335 * BODY_SCALE_X,
      hipY: HIP,
    },
  };
}

// The model lab's basic combo: three swings at the Tank's real cadence
// (ALLY_CLASSES.tank.attackIntervalTicks in sim/allies.js: 39 ticks = 0.65 s;
// the model standard probe checks the two agree), each contact held as the
// hitstop holds it. Pure in t, so it rewinds.
export const SWING_SEC = 0.65;
export const COMBO_LAB = createComboLab(HITS, { swingSec: SWING_SEC });

// The Tank in the model-standard registry (render/facet/heroes.js): the lab
// tab, the probe and the critter factory read him from here.
export const TANK_SPEC = Object.freeze({
  id: 'tank',
  label: 'Tank',
  build: buildTankFacet,
  hits: HITS,
  moves: TANK_MOVES,
  skillAbility,
  swingSec: SWING_SEC,
  comboLab: COMBO_LAB,
  ranged: false,
  walkSpeed: WALK_SPEED,
  weaponField: 'sry',
  lab: {
    abilities: [
      ['combo', 'Basic combo'],
      ['slam', 'Heavy Slam'],
      ['brace', 'Brace'],
      ['spawn', 'Spawn'],
    ],
    frame: { y: 0.5, z: 0, dist: 3.6, speed: 2.1, loop: 2.2, side: 1.5 },
    cues: {
      strike: { sound: 'swing', pitch: 0.8, fx: 'flash' },
      finisher: { sound: 'impact', pitch: 0.7, fx: 'crack' },
      impact: { sound: 'impact', pitch: 0.7, fx: 'crack' },
      plant: { sound: 'tank_shield', pitch: 1, fx: 'ring' },
    },
  },
});
