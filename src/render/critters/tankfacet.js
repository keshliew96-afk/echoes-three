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
// Same contract as buildTank (apply, torso, head, basePitch, metrics), plus
// `cue(kind, ev)` (the attack events) and `lab` (the model lab). Render only:
// attack timing, damage and the sim are untouched.
import { BoxGeometry, CapsuleGeometry, CylinderGeometry, Group, LatheGeometry, Mesh, OctahedronGeometry, Quaternion, SphereGeometry, Vector2, Vector3 } from 'three';
import { CLASS_ACCENTS, PALETTE } from '../../data/palette.js';
import { addInk, exactHex, faceDecal, faceMarkings, INK_PX, mix } from './common.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { placeRow, plateGeometry, setTRS, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';

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

// Basic attack: a shot inside this window of the last one is the next hit
// (the Tank swings every 0.65 s; docs/MODEL_STANDARD.md).
// ALLY_CLASSES.tank.moveSpeed (u/s): full walk lean at full speed
const WALK_SPEED = 2.1;
export const COMBO_WINDOW = 1.0;
const LAG = 0.034; // the slab trails the hips by a frame (30 fps)
const LEAD = 0.017; // the hips lead by half a frame

// --- Key poses (body space). yaw/pitch/roll: torso; sx..srz: the shoulder
// block (slab) position and rotation; rx/ry/rz: root shift (weight); squash;
// paw: 0..1 the off paw on the slab; step: the lunge foot's stance offset.
const REST = { yaw: 0, pitch: 0, roll: 0, sx: 0.26, sy: 0.53, sz: 0.01, srx: 0, sry: 0, srz: -0.16, rx: 0, ry: 0, rz: 0, squash: 1, paw: 0, step: 0 };
const K = (o) => Object.freeze({ ...REST, ...o });
// Hit 1, BACKHAND BASH: horizontal, the slab's side (+X) to the other side.
const A1 = K({ yaw: 0.55, pitch: 0.04, sx: 0.37, sy: 0.5, sz: -0.12, sry: 0.62, srz: -0.32, rx: 0.035, squash: 1.04 });
const S1 = K({ yaw: -0.42, pitch: 0.08, sx: -0.02, sy: 0.5, sz: 0.36, sry: -0.72, srz: -0.04, rx: -0.03, rz: 0.04, squash: 0.95 });
const O1 = K({ yaw: -0.62, pitch: 0.09, sx: -0.17, sy: 0.47, sz: 0.25, sry: -0.98, srz: 0.08, rx: -0.04, rz: 0.04, squash: 0.97 });
// Hit 2, RISING BASH: low on the far side, up across to high on the slab side.
const A2 = K({ yaw: -0.55, pitch: 0.12, sx: -0.15, sy: 0.33, sz: 0.2, srx: 0.32, sry: -0.82, srz: 0.32, rx: -0.03, ry: -0.03, squash: 1.06 });
const S2 = K({ yaw: 0.36, pitch: -0.1, sx: 0.34, sy: 0.76, sz: 0.22, srx: -0.52, sry: 0.4, srz: -0.46, rx: 0.02, ry: 0.02, rz: 0.03, squash: 0.94 });
const O2 = K({ yaw: 0.5, pitch: -0.14, sx: 0.38, sy: 0.85, sz: 0.06, srx: -0.92, sry: 0.46, srz: -0.4, ry: 0.03, squash: 0.95 });
// Hit 3, CRUSHING SLAM: overhead on the toes, down into the ground ahead
// with a lunge step; both paws on the slab.
const A3 = K({ yaw: 0.14, pitch: -0.2, sx: 0.1, sy: 0.98, sz: -0.04, srx: -1.22, sry: 0.1, srz: 0, ry: 0.045, rz: -0.02, squash: 0.94, paw: 1 });
const S3 = K({ yaw: -0.05, pitch: 0.21, sx: 0.05, sy: 0.3, sz: 0.47, srx: 0.92, sry: 0, srz: 0, ry: -0.07, rz: 0.1, squash: 1.12, paw: 1, step: 1 });
const O3 = K({ yaw: -0.07, pitch: 0.21, sx: 0.05, sy: 0.25, sz: 0.5, srx: 1.0, sry: 0, srz: 0, ry: -0.08, rz: 0.12, squash: 1.14, paw: 1, step: 1 });
const HITS = [
  { label: 'backhand bash', from: A1, strike: S1, over: O1, next: A2 },
  { label: 'rising bash', from: A2, strike: S2, over: O2, next: A3 },
  { label: 'crushing slam', from: A3, strike: S3, over: O3, next: A1 },
];
// Hit timing at 30 fps: 1.5 frames of wind (only from rest: a chained hit
// starts AT its wind-up, which the last hit's settle already holds), 2.5 of
// strike, 2 of overshoot, 5 to settle into the next wind-up, then held ready
// until the combo window lapses, then a recover to the stance.
export const WIND = 0.05;
const hitTimeline = (n) =>
  createTimeline(`hit${n + 1}`, `Hit ${n + 1}: ${HITS[n].label}`, [
    { id: 'wind', label: 'wind-up', dur: WIND },
    { id: 'strike', label: 'strike', dur: 0.083 },
    { id: 'overshoot', label: 'overshoot', dur: 0.067 },
    { id: 'settle', label: `settle into hit ${((n + 1) % 3) + 1}`, dur: 0.167 },
    { id: 'ready', label: `hit ${((n + 1) % 3) + 1} wind-up held`, dur: COMBO_WINDOW - 0.367 },
    { id: 'recover', label: 'recover', dur: 0.35 },
  ]);
const HIT_TL = [hitTimeline(0), hitTimeline(1), hitTimeline(2)];
// (for the model standard probe: the chain and its timelines)
export const TANK_HITS = Object.freeze(HITS.map((h, i) => Object.freeze({ ...h, timeline: HIT_TL[i] })));

// Heavy Slam (every melee arc and ground skill) and Brace (every nova, guard
// and aura skill). In game a skill enters its timeline 0.08 s before the
// strike, so the blow lands with the sim's hit while the wind-up still shows;
// the lab plays the whole wind-up.
const G_SLAM = K({ yaw: 0.2, pitch: -0.2, sx: 0.08, sy: 1.02, sz: -0.08, srx: -1.35, sry: 0.12, ry: 0.05, rz: -0.03, squash: 0.92, paw: 1 });
const S_SLAM = K({ yaw: -0.04, pitch: 0.21, sx: 0.04, sy: 0.26, sz: 0.5, srx: 1.05, ry: -0.09, rz: 0.12, squash: 1.16, paw: 1, step: 1 });
const G_BRACE = K({ yaw: 0.3, pitch: 0.1, sx: 0.2, sy: 0.42, sz: 0.06, srx: 0.2, sry: 0.4, srz: -0.3, ry: -0.04, squash: 1.08 });
const S_BRACE = K({ yaw: 0, pitch: -0.18, roll: 0, sx: 0.04, sy: 0.4, sz: 0.4, srx: 0.08, sry: 0, srz: 0, ry: 0.01, rz: 0.06, squash: 0.92, paw: 1, step: 0.6 });
export const TANK_ABILITIES = Object.freeze({
  slam: createTimeline('slam', 'Heavy Slam', [
    { id: 'gather', label: 'gather', dur: 0.32 },
    { id: 'strike', label: 'strike', dur: 0.09 },
    { id: 'impact', label: 'impact', dur: 0.28 },
    { id: 'settle', label: 'settle', dur: 0.42 },
  ], { cues: [{ at: 0.41, id: 'impact' }] }),
  brace: createTimeline('brace', 'Brace', [
    { id: 'gather', label: 'gather', dur: 0.26 },
    { id: 'plant', label: 'plant', dur: 0.1 },
    { id: 'hold', label: 'hold', dur: 0.42 },
    { id: 'settle', label: 'settle', dur: 0.4 },
  ], { cues: [{ at: 0.36, id: 'plant' }] }),
});
// Which ability a Tank skill plays, by its shape (all eleven skills).
export const TANK_SKILL_ABILITY = Object.freeze({ melee_arc: 'slam', ground_aoe: 'slam', nova: 'brace', direct: 'brace', aura: 'brace' });

const FIELDS = Object.keys(REST);
function lerpPose(out, a, b, k) {
  for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * k;
  return out;
}

// Pure: the pose of hit n at time t into it. `capture` is the pose the hit
// started from: a fresh hit (from rest) winds from it into its wind-up; a
// chained hit strikes straight from it (the held wind-up, or wherever a fast
// swing caught the last one).
export function hitPose(n, t, capture, fresh, out = { ...REST }) {
  const H = HITS[n];
  const s = HIT_TL[n].sample(t);
  if (s.id === 'wind') return lerpPose(out, capture, H.from, ease.out(s.k));
  if (s.id === 'strike') return lerpPose(out, fresh ? H.from : capture, H.strike, ease.in(s.k));
  if (s.id === 'overshoot') return lerpPose(out, H.strike, H.over, ease.out(s.k));
  if (s.id === 'settle') return lerpPose(out, H.over, H.next, ease.inOut(s.k));
  if (s.id === 'ready') return lerpPose(out, H.next, H.next, 0);
  return lerpPose(out, H.next, REST, ease.inOut(s.k));
}
// Pure: the pose of an ability at time t.
export function abilityPose(id, t, out = { ...REST }) {
  const tl = TANK_ABILITIES[id];
  const s = tl.sample(t);
  const G = id === 'slam' ? G_SLAM : G_BRACE;
  const S = id === 'slam' ? S_SLAM : S_BRACE;
  if (s.id === 'gather') return lerpPose(out, REST, G, ease.out(s.k));
  if (s.id === 'strike' || s.id === 'plant') return lerpPose(out, G, S, ease.in(s.k));
  if (s.id === 'impact' || s.id === 'hold') {
    lerpPose(out, S, S, 0);
    // the impact skid and the held brace breathe a little
    out.ry += -0.01 * Math.sin(s.k * Math.PI);
    return out;
  }
  return lerpPose(out, S, REST, ease.inOut(s.k));
}

// A faceted, inked part with its own (flashable, greyable) material.
function fpart(geo, mat, ink = true) {
  const m = new Mesh(geo, mat);
  if (ink) addInk(m);
  return m;
}
function facetArm(mat, radius, baseLen) {
  const pivot = new Group();
  const geo = sharedGeo(`facet:arm:${radius}:${baseLen}`, () => facetize(new CapsuleGeometry(radius, baseLen - radius * 2, 2, 6), { jitter: 0.08, seed: 51 }));
  const m = fpart(geo, mat);
  m.position.y = baseLen / 2;
  pivot.add(m);
  pivot.userData.baseLen = baseLen;
  return pivot;
}
const UPV = new Vector3(0, 1, 0);
const armTmp = new Vector3();
function aimArm(pivot, target) {
  armTmp.copy(target).sub(pivot.position);
  const len = Math.max(0.02, armTmp.length());
  pivot.quaternion.setFromUnitVectors(UPV, armTmp.normalize());
  pivot.scale.set(1, len / pivot.userData.baseLen, 1);
}

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
  // Locked feet. Each foot is pinned to the floor (world space) while it
  // carries weight; it steps when it falls too far from where the stance
  // wants it, one foot at a time, landing ahead along the body's real
  // velocity. Disabled while the body falls or lies downed.
  // ------------------------------------------------------------------------
  const yawGroup = () => rig.parent && rig.parent.parent;
  const STEP_TRIGGER = 0.085; // u off home before a planted foot steps
  const STEP_LIFT = 0.07;
  const foot = feet.map((f, i) => ({
    planted: new Vector3(), // world
    from: new Vector3(),
    to: new Vector3(),
    swing: -1, // 0..1 while stepping, -1 planted
    dur: 0.2,
    side: i === 0 ? -1 : 1,
    home: new Vector3(),
    aim: new Vector3(), // the home it steps for (yaw space), fixed at lift-off
  }));
  const vel = new Vector3();
  const lastPos = new Vector3();
  let feetInit = false;
  const w = new Vector3();
  function homeLocalOf(i, stance, out) {
    // the stance's home for this foot, at floor height, in yaw space
    out.copy(HOME[i]);
    if (stance.step > 0 && i === 0) out.z += 0.16 * stance.step; // the lunge foot (far side) steps in
    if (stance.step > 0 && i === 1) out.z -= 0.03 * stance.step; // the anchor braces back
    out.y = 0;
    return out;
  }
  function homeWorld(i, stance, out) {
    return yawGroup().localToWorld(homeLocalOf(i, stance, out));
  }
  function resetFeet(stance) {
    for (let i = 0; i < 2; i++) {
      homeWorld(i, stance, foot[i].planted);
      foot[i].swing = -1;
    }
    feetInit = true;
  }
  let bobLift = 0;
  let plantSide = 0;
  let swingSide = 0;
  // the travel in the Tank's own frame (+z ahead, +x to its left side's
  // opposite): yaw follows the aim, so a backpedal or a sidestep is common
  const yawQ = new Quaternion();
  function localVelocity(out) {
    const yg = yawGroup();
    out.copy(vel);
    if (yg) out.applyQuaternion(yg.getWorldQuaternion(yawQ).invert());
    return out;
  }
  function stepFeet(dt, stance, locked) {
    const yg = yawGroup();
    if (!yg) return;
    yg.updateWorldMatrix(true, false);
    const gp = yg.getWorldPosition(w);
    if (!feetInit || !locked) {
      if (dt > 0) lastPos.copy(gp);
      resetFeet(stance);
      bobLift = 0;
      if (!locked) {
        for (let i = 0; i < 2; i++) feet[i].position.copy(HOME[i]);
      }
      return;
    }
    if (dt > 0) {
      const jump = gp.distanceTo(lastPos);
      if (jump > 1.5) {
        resetFeet(stance); // a teleport or a new room: stand afresh
        lastPos.copy(gp);
      } else {
        const k = Math.min(1, dt * 12);
        vel.x += ((gp.x - lastPos.x) / dt - vel.x) * k;
        vel.z += ((gp.z - lastPos.z) / dt - vel.z) * k;
        lastPos.copy(gp);
      }
    }
    const speed = Math.hypot(vel.x, vel.z);
    for (let i = 0; i < 2; i++) homeWorld(i, stance, foot[i].home);
    // advance a swing
    let swinging = -1;
    for (let i = 0; i < 2; i++) {
      const f = foot[i];
      if (f.swing < 0) continue;
      f.swing += dt / f.dur;
      // keep re-aiming the landing while it flies (the body keeps moving),
      // at the home it lifted off for: a lunge lands even if the stance
      // has already begun to settle back
      yg.localToWorld(f.to.copy(f.aim)).addScaledVector(vel, f.dur * 0.55);
      if (f.swing >= 1) {
        f.swing = -1;
        f.planted.copy(f.to);
      } else swinging = i;
    }
    // start a step: the foot furthest from home, if it is too far
    if (swinging < 0) {
      let best = -1;
      let bestErr = STEP_TRIGGER * (speed > 0.3 ? 0.6 : 1);
      for (let i = 0; i < 2; i++) {
        const err = Math.hypot(foot[i].planted.x - foot[i].home.x, foot[i].planted.z - foot[i].home.z);
        if (err > bestErr) {
          bestErr = err;
          best = i;
        }
      }
      if (best >= 0) {
        const f = foot[best];
        f.swing = 0;
        f.dur = Math.max(0.12, Math.min(0.2, 0.2 - speed * 0.03));
        f.from.copy(f.planted);
        homeLocalOf(best, stance, f.aim);
        f.to.copy(f.home).addScaledVector(vel, f.dur * 0.55);
        swinging = best;
      }
    }
    // place the feet (world -> rig space)
    rig.updateWorldMatrix(true, false);
    bobLift = 0;
    for (let i = 0; i < 2; i++) {
      const f = foot[i];
      if (f.swing >= 0) {
        const k = ease.inOut(f.swing);
        w.lerpVectors(f.from, f.to, k);
        w.y = STEP_LIFT * Math.sin(Math.PI * f.swing) * Math.min(1, 0.4 + speed * 0.5);
        bobLift = Math.sin(Math.PI * f.swing);
        plantSide = -f.side;
        swingSide = f.side;
      } else {
        w.copy(f.planted);
        w.y = 0;
      }
      rig.worldToLocal(w);
      feet[i].position.set(w.x, w.y + HOME[i].y, w.z);
    }
  }

  // ------------------------------------------------------------------------
  // Attacks: the combo and the two abilities (render clock).
  // ------------------------------------------------------------------------
  let clock = 0;
  let lastT = null;
  let combo = 0; // 1..3 = the hit playing
  let hitT = 0;
  let fresh = true;
  let lastBasicAt = -99;
  let ab = null; // { id, t }
  let lastClip = 'idle';
  const lv = new Vector3();
  const fromPose = { ...REST };
  const live = { ...REST };
  const lagged = { ...REST };
  const led = { ...REST };
  const scratch = { ...REST };
  function currentPose(out, dtShift = 0) {
    if (ab) return abilityPose(ab.id, Math.max(0, ab.t + dtShift), out);
    if (combo > 0) return hitPose(combo - 1, Math.max(0, hitT + dtShift), fromPose, fresh, out);
    return lerpPose(out, REST, REST, 0);
  }
  function cue(kind, ev) {
    if (kind === 'basic') {
      currentPose(fromPose);
      fresh = clock - lastBasicAt > COMBO_WINDOW || combo === 0 || !!ab;
      combo = fresh ? 1 : (combo % 3) + 1;
      hitT = fresh ? 0 : WIND;
      ab = null;
      lastBasicAt = clock;
    } else if (kind === 'skill') {
      const id = TANK_SKILL_ABILITY[ev && ev.shape] || 'brace';
      const tl = TANK_ABILITIES[id];
      ab = { id, t: Math.max(0, tl.startOf(id === 'slam' ? 'strike' : 'plant') - 0.08) };
      combo = 0; // a skill breaks the combo: the next basic is hit 1
    }
  }

  // The model lab drives these instead of the live clock (pure in time).
  const lab = {
    abilities: TANK_ABILITIES,
    hits: HIT_TL,
    override: null, // { kind: 'hit', n, t, fresh } | { kind: 'ability', id, t } | null
    cue,
    // where each foot is (world), whether it carries weight, and where its
    // mesh actually drew (probes)
    feet: () =>
      foot.map((f, i) => {
        const at = feet[i].getWorldPosition(new Vector3());
        return { planted: f.swing < 0, x: f.planted.x, z: f.planted.z, drawnX: at.x, drawnZ: at.z, drawnY: at.y };
      }),
    parts: { torso, shield, head },
  };

  function apply(P, t, fallSign, clip = 'idle') {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    clock += dt;
    const upright = 1 - P.collapse;
    if (clip === 'hurt' && lastClip !== 'hurt') {
      combo = 0; // a hit taken breaks the combo
      ab = null;
    }
    if (clip === 'downed') {
      combo = 0;
      ab = null;
    }
    lastClip = clip;

    // COMMON-MODE ear sway (as tank.js).
    ears[0].rotation.z = -0.18 + 0.5 * P.ear - P.collapse * 0.4;
    ears[1].rotation.z = 0.18 + 0.5 * P.ear + P.collapse * 0.4;
    tailPivot.rotation.y = P.tail * 0.5;

    // Advance the live attack.
    if (lab.override) {
      const o = lab.override;
      if (o.kind === 'ability') {
        ab = { id: o.id, t: o.t };
        combo = 0;
      } else {
        ab = null;
        combo = o.n + 1;
        hitT = o.t;
        fresh = !!o.fresh;
        Object.assign(fromPose, o.from || (fresh ? REST : HITS[o.n].from));
      }
    } else {
      if (ab) {
        ab.t += dt;
        if (ab.t >= TANK_ABILITIES[ab.id].duration) ab = null;
      }
      if (combo > 0) {
        hitT += dt;
        if (hitT >= HIT_TL[combo - 1].duration) combo = 0;
      }
    }
    const attacking = (ab || combo > 0) && clip !== 'downed';

    // The hips lead, the slab trails (sampled a frame apart on one timeline).
    if (attacking) {
      currentPose(live, 0);
      currentPose(led, LEAD);
      currentPose(lagged, -LAG);
    }

    // Torso and root: an attack owns them; otherwise the driver's clip does.
    const torsoPose = attacking ? led : null;
    if (torsoPose) {
      torso.rotation.y = torsoPose.yaw * upright;
      torso.rotation.x = Math.min(0.21, torsoPose.pitch) * upright;
      torso.rotation.z = torsoPose.roll * upright;
      head.rotation.x = -torso.rotation.x * 0.88 - 0.18 * upright;
      head.rotation.y = -torsoPose.yaw * 0.5 * upright;
      rig.position.x = live.rx * upright;
      rig.position.y += live.ry * upright;
      rig.position.z += live.rz * upright;
      rig.scale.set(live.squash, 2 - live.squash, live.squash);
    } else {
      rig.position.x = 0;
    }

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

    // Feet: locked to the floor, stepping on their own (see above).
    const stance = attacking ? live : REST;
    const locked = P.collapse < 0.04;
    stepFeet(dt, stance, locked);
    // The walk's bob, sway and twist come from the steps themselves: the body
    // rises as a foot passes, rolls over the foot that carries it and turns
    // the stepping hip forward. The lean follows the TRAVEL, not the aim
    // (the driver's walk lean assumes forward): a backpedal leans back, a
    // sidestep leans aside, so the root motion matches the legs.
    if (locked && clip === 'walk' && !attacking) {
      rig.position.y += 0.035 * bobLift - P.bob * upright * 0.6;
      localVelocity(lv);
      const fwd = Math.max(-1, Math.min(1, lv.z / WALK_SPEED));
      const side = Math.max(-1, Math.min(1, lv.x / WALK_SPEED));
      const twist = -swingSide * 0.1 * bobLift;
      torso.rotation.x = Math.max(-0.08, Math.min(0.12, 0.1 * fwd)) * upright;
      torso.rotation.y = twist * upright;
      torso.rotation.z = (0.06 * plantSide * bobLift - 0.07 * side) * upright;
      head.rotation.x = -torso.rotation.x * 0.88 - 0.18 * upright;
      head.rotation.y = -twist * 0.55 * upright;
    }
  }

  return {
    apply,
    cue,
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
// the model standard probe checks the two agree). Pure in t, so it rewinds.
export const SWING_SEC = 0.65;
export const COMBO_LAB = Object.freeze({
  id: 'combo',
  label: 'Basic combo',
  duration: 2 * SWING_SEC + HIT_TL[2].duration - WIND,
  // which hit plays at t, how far into it, and the readout
  at(t) {
    const n = t < SWING_SEC ? 0 : t < 2 * SWING_SEC ? 1 : 2;
    const tt = n === 0 ? t : t - n * SWING_SEC + WIND;
    const s = HIT_TL[n].sample(tt);
    return { n, t: tt, fresh: n === 0, phase: s.id, label: `${HIT_TL[n].label}: ${s.label}` };
  },
  // seconds into the combo where each hit's strike lands (lab cues)
  strikes: [WIND + 0.083, SWING_SEC + 0.083, 2 * SWING_SEC + 0.083],
});
