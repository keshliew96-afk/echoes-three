// THE BARROW WYRM, MODEL STANDARD (docs/MODEL_STANDARD.md). The pilot boss of
// the faceted look from Kesh's sample video, laid on top of the chibi ink
// style: the same ash-grey grave worm with its violet God-stuff cracks
// (docs/BOSS_IDENTITY.md), rebuilt out of repeated faceted parts.
//
//   * a coil of scales: 26 rings of overlapping ridged plates round a moving
//     spine, a tarnished grave-bronze torc every fifth ring, a row of dorsal
//     spikes with bronze tips and violet crack shards between them;
//   * a wedge skull with a hinged jaw, rows of bone teeth, swept horns and a
//     crest fan of spines;
//   * the body FOLLOWS ITS PATH: the neck root's world track is recorded and
//     every ring sits on it by arc length, so the coil never slides sideways
//     (the serpent's version of Kesh's root-motion rule), and a Wyrm standing
//     still keeps its coil planted while the head and neck drive the attack;
//   * two ability timelines (render/facet/timeline.js): Ash Breath (draw,
//     strike, pour, settle) and Burrow Strike (dive, tunnel, rise, burst,
//     exposed, settle). The sim's telegraph drives the anticipation, the
//     strike starts when the telegraph resolves; the model lab plays and
//     rewinds the same timelines.
//
// Same interface as render/boss/wyrm.js (group, mats, setYaw, setFlash,
// pose), plus `lab` for the model lab. Faces +Z. Render only.
import { Color, Group, IcosahedronGeometry, CylinderGeometry, Matrix4, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import { addInk, groundShadow, INK_PX, mix } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';
import { sharedGeo } from '../geocache.js';
import { facetize, facetMaterial } from '../facet/material.js';
import { PART_INK_PX, createPlateTube, createSpine, createSpineRow, instancedPart, placeRow, setTRS, wedgeGeometry } from '../facet/kit.js';
import { createTimeline, ease } from '../facet/timeline.js';

// --- Palette (derived from the classic Wyrm's ash and the enemy hides,
// pulled cool so the warm key light never turns a foe warm: style.js):
// three ash-slate values for the facets, bone teeth, and a tarnished
// grave-bronze accent for the torcs and spike tips (saturation under the
// analyzer's amber gate, value under the bone).
const ASH = HIDE.ramBody.clone().lerp(new Color(PALETTE.warmGrey), 0.12).multiplyScalar(0.8);
const ASH_DARK = HIDE.moleBody.clone().lerp(new Color(PALETTE.warmGrey), 0.28).multiplyScalar(1.05);
const ASH_PALE = HIDE.ramBody.clone().lerp(new Color(PALETTE.bone), 0.3).multiplyScalar(0.92);
const FANG = new Color(PALETTE.bone).multiplyScalar(0.92);
const EARTH = HIDE.moleBody.clone().lerp(new Color(PALETTE.warmGrey), 0.5).multiplyScalar(0.7);
export const WYRM_BRONZE = mix(PALETTE.warmGrey, PALETTE.paleGold, 0.15).lerp(new Color(PALETTE.signalBlue), 0.08).multiplyScalar(0.72);
// the hide under the plates: a shade of the plates, so a bend that opens
// the plates shows shadowed scale, not a black hole
const ASH_CORE = ASH.clone().multiplyScalar(0.82);
// the God-stuff glow (eyes, throat, spine): God-stuff Violet pulled toward
// the violet tell, as the classic rig's glow
const GLOW_HEX = `#${new Color(PALETTE.godstuffViolet).lerp(new Color(TELL_VIOLET), 0.35).getHexString()}`;
const flashable = (c) => facetMaterial(c, { emissive: '#FFFFFF', emissiveIntensity: 0 });

function glow(size, opacity) {
  const g = makeGlowSprite({ color: GLOW_HEX, size, opacity });
  g.material.toneMapped = false;
  return g;
}

// --- Body shape.
const SPINE_PTS = 10; // head, neck root, then the trail
const SEG_GAP = 0.5; // trail spacing between control points (u)
const NECK = 0.42; // head pivot to neck root
const HEAD_Y = 0.52;
const RINGS = 34;
const AROUND = 8;
// Body radius along the spine (u = 0 at the head, 1 at the tail tip).
const radius = (u) => {
  if (u < 0.12) return 0.34 + (0.46 - 0.34) * (u / 0.12);
  if (u < 0.3) return 0.46;
  return 0.46 * (1 - (u - 0.3) / 0.7) ** 1.15 + 0.05;
};

// --- Ability timelines (render only; the sim's numbers live in
// src/sim/bosses/wyrm.js: a 54-tick wind-up for both attacks, a 90-tick
// exposed window).
export const WYRM_ABILITIES = Object.freeze({
  breath: createTimeline('breath', 'Ash Breath', [
    { id: 'draw', label: 'draw back', dur: 0.9 },
    { id: 'strike', label: 'strike', dur: 0.18 },
    { id: 'pour', label: 'pour', dur: 0.5 },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: 0.9, id: 'breath' }] }),
  burrow: createTimeline('burrow', 'Burrow Strike', [
    { id: 'dive', label: 'dive', dur: 0.5 },
    { id: 'tunnel', label: 'tunnel', dur: 1.2 },
    { id: 'rise', label: 'rise', dur: 0.9 },
    { id: 'burst', label: 'burst', dur: 0.25 },
    { id: 'exposed', label: 'exposed', dur: 1.5 },
    { id: 'settle', label: 'settle', dur: 0.6 },
  ], { cues: [{ at: 0.5, id: 'burrow' }, { at: 2.6, id: 'emerge' }] }),
});

// The pose channels an ability writes (all 0 at rest):
//   rear   front of the body lifts (the coil base stays down)
//   reach  head pulled back (-1) .. thrust forward (+1)
//   pitch  head pitch (- = nose up)
//   jaw    0..1 open          throat  0..1 violet heat in the throat
//   coil   0..1 neck folds into an S (the spring before a strike)
//   sweep  head yaw while the breath pours
//   sink   0..1 under the ground   rise  0..1 the mound swells
//   slump  0..1 the exposed sprawl (head down, eyes dim)
function restChannels(C) {
  C.rear = 0;
  C.reach = 0;
  C.pitch = 0;
  C.jaw = 0;
  C.throat = 0;
  C.coil = 0;
  C.sweep = 0;
  C.sink = 0;
  C.rise = 0;
  C.slump = 0;
  return C;
}
const lerp = (a, b, k) => a + (b - a) * k;

// Pure: the channels of an ability at a phase sample (s = timeline.sample(t)).
export function abilityChannels(id, s, C = restChannels({})) {
  restChannels(C);
  const k = s.k;
  if (id === 'breath') {
    if (s.id === 'draw') {
      const a = ease.out(k);
      C.rear = 0.85 * a;
      C.reach = -1 * a;
      C.pitch = -0.5 * a;
      C.jaw = 0.18 * a;
      C.throat = ease.in(k);
      C.coil = a;
    } else if (s.id === 'strike') {
      const a = ease.out(k);
      C.rear = lerp(0.85, 0.55, a);
      C.reach = lerp(-1, 1, ease.back(k));
      C.pitch = lerp(-0.5, 0.14, a);
      C.jaw = lerp(0.18, 1, a);
      C.throat = 1;
      C.coil = 1 - a;
    } else if (s.id === 'pour') {
      C.rear = 0.55;
      C.reach = lerp(1, 0.8, k);
      C.pitch = 0.14;
      C.jaw = 1;
      C.throat = lerp(1, 0.55, k);
      C.sweep = Math.sin(k * Math.PI * 2) * 0.22;
    } else {
      const a = ease.inOut(k);
      C.rear = 0.55 * (1 - a);
      C.reach = 0.8 * (1 - a);
      C.pitch = 0.14 * (1 - a);
      // the jaw snaps shut with a small bounce
      C.jaw = Math.max(0, 1 - ease.out(Math.min(1, k * 1.6))) + 0.08 * Math.sin(Math.min(1, k * 1.6) * Math.PI) * (1 - k);
      C.throat = 0.55 * (1 - a);
    }
  } else if (id === 'burrow') {
    if (s.id === 'dive') {
      C.rear = 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.4));
      C.pitch = lerp(-0.3, 0.9, ease.in(k));
      C.sink = ease.in(k);
      C.jaw = 0.2;
    } else if (s.id === 'tunnel') {
      C.sink = 1;
    } else if (s.id === 'rise') {
      C.sink = 1;
      C.rise = ease.in(k);
    } else if (s.id === 'burst') {
      const a = ease.out(k);
      C.sink = 1 - a;
      C.rise = 1 - a;
      C.rear = a;
      C.pitch = -0.65 * a;
      C.jaw = a;
      C.throat = 0.6 * a;
    } else if (s.id === 'exposed') {
      const a = ease.inOut(Math.min(1, k * 3));
      C.rear = 1 - a;
      C.pitch = lerp(-0.65, 0.35, a);
      C.jaw = lerp(1, 0.32, a);
      C.slump = a;
    } else {
      const a = ease.inOut(k);
      C.pitch = 0.35 * (1 - a);
      C.jaw = 0.32 * (1 - a);
      C.slump = 1 - a;
    }
  }
  return C;
}

// --- The track the coil follows: world points of the neck root, with their
// cumulative arc length (for the no-slip serpentine wave).
function createTrack() {
  const MAX = 160;
  const xs = new Float32Array(MAX);
  const zs = new Float32Array(MAX);
  const ss = new Float32Array(MAX); // cumulative arc length at the point
  let n = 0;
  return {
    get n() {
      return n;
    },
    reset(x, z, dirX, dirZ, len) {
      // a coil laid behind the neck in a lazy S, the way a fresh rig lies
      n = 0;
      const steps = Math.ceil(len / 0.1) + 1;
      let s = 0;
      for (let i = steps - 1; i >= 0; i--) {
        const d = i * 0.1;
        const side = 0.6 * Math.sin(d * 1.15) * Math.min(1, d / 1.2);
        xs[n] = x - dirX * d + dirZ * side;
        zs[n] = z - dirZ * d - dirX * side;
        if (n > 0) s += Math.hypot(xs[n] - xs[n - 1], zs[n] - zs[n - 1]);
        ss[n] = s;
        n++;
      }
    },
    // newest point last
    push(x, z) {
      const lx = xs[n - 1];
      const lz = zs[n - 1];
      const d = Math.hypot(x - lx, z - lz);
      if (d < 0.06) return false;
      if (n === MAX) {
        xs.copyWithin(0, 1);
        zs.copyWithin(0, 1);
        ss.copyWithin(0, 1);
        n--;
      }
      xs[n] = x;
      zs[n] = z;
      ss[n] = ss[n - 1] + d;
      n++;
      return true;
    },
    // Walk back `dist` along the track from the live head point (hx, hz).
    // Writes out.x/z and returns the absolute arc coordinate there.
    back(hx, hz, dist, out) {
      let px = hx;
      let pz = hz;
      let left = dist;
      let sAbs = ss[n - 1] + Math.hypot(hx - xs[n - 1], hz - zs[n - 1]);
      for (let i = n - 1; i >= 0; i--) {
        const d = Math.hypot(xs[i] - px, zs[i] - pz);
        if (d >= left) {
          const f = d > 1e-6 ? left / d : 0;
          out.x = px + (xs[i] - px) * f;
          out.z = pz + (zs[i] - pz) * f;
          return sAbs - left;
        }
        left -= d;
        sAbs -= d;
        px = xs[i];
        pz = zs[i];
      }
      // past the end: carry on straight along the last direction
      const ex = n > 1 ? xs[0] - xs[1] : 0;
      const ez = n > 1 ? zs[0] - zs[1] : -1;
      const el = Math.hypot(ex, ez) || 1;
      out.x = px + (ex / el) * left;
      out.z = pz + (ez / el) * left;
      return sAbs - left;
    },
  };
}

export function buildWyrmFacet() {
  const group = new Group();
  group.name = 'boss-wyrm';
  group.userData.modelStandard = true;
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group(); // sinks while burrowed
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  const ashMat = track(flashable(ASH));
  const darkMat = track(flashable(ASH_DARK));
  const coreMat = track(flashable(ASH_CORE));
  const paleMat = track(flashable(ASH_PALE));
  const fangMat = track(flashable(FANG));
  const bronzeMat = track(flashable(WYRM_BRONZE));
  const crackMat = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });

  // --- The coil: a spine through the head, the neck root and the track.
  const spine = createSpine(SPINE_PTS);
  const body = new Group();
  rig.add(body);
  // Core: faceted ash masses along the spine, carrying the full silhouette ink.
  const CORE = 11;
  const coreGeo = sharedGeo('facet:wyrm-core', () => facetize(new IcosahedronGeometry(1, 1), { jitter: 0.08, seed: 21 }));
  // the core's ink is the thin part ink: where a bend opens the plates the
  // hide shows, not a thick black hull line
  const core = instancedPart(coreGeo, coreMat, CORE, { name: 'wyrm-core', inkPx: PART_INK_PX, moving: true });
  body.add(core);
  const tube = createPlateTube({
    spine,
    rings: RINGS,
    around: AROUND,
    u0: 0.035,
    u1: 0.97,
    radius,
    plateMat: ashMat,
    bandMat: bronzeMat,
    bandEvery: 7,
    bandAround: 10,
    tilt: 0.38,
    name: 'wyrm-scales',
  });
  body.add(tube.plates);
  if (tube.bands) body.add(tube.bands);
  const SPIKES = 15;
  const spikeH = (u) => 0.12 + 0.34 * Math.max(0, 1 - u * 1.1);
  const spikes = createSpineRow({ spine, count: SPIKES, u0: 0.08, u1: 0.9, height: spikeH, radius, mat: darkMat, name: 'wyrm-spikes', tip: { mat: bronzeMat, frac: 0.36 } });
  body.add(spikes.mesh);
  if (spikes.tips) body.add(spikes.tips);
  // God-stuff: violet crack shards lying flat between the spikes.
  const cracks = createSpineRow({ spine, count: 14, u0: 0.12, u1: 0.86, height: () => 0.2, radius: (u) => radius(u) * 0.97, mat: crackMat, lean: 1.38, name: 'wyrm-cracks', ink: false, offset: 0.5 / 15 });
  body.add(cracks.mesh);

  // --- Head: wedge skull, snout, brow, horns, crest fan, hinged jaw, teeth.
  const head = new Group();
  head.position.set(0, HEAD_Y, 0.22);
  rig.add(head);
  const skullGeo = sharedGeo('facet:wyrm-skull', () => facetize(new IcosahedronGeometry(0.5, 1), { jitter: 0.1, seed: 31 }));
  const skull = new Mesh(skullGeo, ashMat);
  skull.scale.set(0.98, 0.6, 1.08);
  addInk(skull);
  head.add(skull);
  const snoutGeo = sharedGeo('facet:wyrm-snout', () => {
    const g = new CylinderGeometry(0.17, 0.32, 0.62, 6, 1);
    g.rotateX(Math.PI / 2);
    return facetize(g, { jitter: 0.1, seed: 33 });
  });
  const snout = new Mesh(snoutGeo, paleMat);
  snout.scale.set(1, 0.58, 1);
  snout.position.set(0, 0.0, 0.52);
  addInk(snout);
  head.add(snout);
  // brow ridges + swept horns + crest fan (one wedge row each)
  const wedge = wedgeGeometry();
  const X = new Vector3();
  const Y = new Vector3();
  const Z = new Vector3();
  const P = new Vector3();
  const aim = (m, px, py, pz, dx, dy, dz, w, h, d, roll = 0) => {
    Y.set(dx, dy, dz).normalize();
    X.set(Math.cos(roll), Math.sin(roll), 0);
    X.addScaledVector(Y, -X.dot(Y)).normalize();
    Z.crossVectors(X, Y);
    setTRS(m, P.set(px, py, pz), X, Y, Z, w, h, d);
  };
  const horns = placeRow(wedge, darkMat, 4, (i, m) => {
    const side = i % 2 ? 1 : -1;
    if (i < 2) aim(m, side * 0.24, 0.2, 0.22, side * 0.35, 0.55, -1, 0.2, 0.62, 0.16, side * 0.4); // horn
    else aim(m, side * 0.2, 0.2, 0.42, side * 0.25, 0.4, -0.6, 0.22, 0.26, 0.14, side * 0.3); // brow ridge
  }, { name: 'wyrm-horns', inkPx: INK_PX * 0.75 });
  head.add(horns);
  // the crest: a fan of long spines raking back off the skull (the video's
  // crown of fins), bronze-tipped
  const FAN = 9;
  const fanDir = (i) => {
    const a = -1.15 + (2.3 * i) / (FAN - 1);
    return { a, len: 0.85 - 0.3 * Math.abs(a) };
  };
  const crest = placeRow(wedge, darkMat, FAN, (i, m) => {
    const { a, len } = fanDir(i);
    aim(m, Math.sin(a) * 0.2, 0.14 + Math.cos(a) * 0.05, -0.28, Math.sin(a) * 1.05, 0.5 + Math.cos(a) * 0.45, -0.95, 0.18, len, 0.08);
  }, { name: 'wyrm-crest', inkPx: INK_PX * 0.6 });
  head.add(crest);
  const crestTips = placeRow(wedge, bronzeMat, FAN, (i, m) => {
    const { a, len } = fanDir(i);
    Y.set(Math.sin(a) * 1.05, 0.5 + Math.cos(a) * 0.45, -0.95).normalize();
    const f = 0.38;
    aim(m, Math.sin(a) * 0.2 + Y.x * len * (1 - f), 0.14 + Math.cos(a) * 0.05 + Y.y * len * (1 - f), -0.28 + Y.z * len * (1 - f), Y.x, Y.y, Y.z, 0.18 * f * 1.1, len * f * 1.02, 0.08 * f * 1.1);
  }, { name: 'wyrm-crest-tips', ink: false });
  head.add(crestTips);
  // upper teeth: a row down each side of the snout plus two long fangs
  const UPPER = 12;
  const upper = placeRow(wedge, fangMat, UPPER, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1; // 0..5 back to front
    const z = 0.28 + j * 0.085;
    const x = side * (0.25 - j * 0.022);
    const fang = j === 4;
    aim(m, x, -0.1, z, side * 0.08, -1, 0.12, 0.09, fang ? 0.27 : 0.15, 0.06);
  }, { name: 'wyrm-teeth-up', inkPx: INK_PX * 0.5 });
  head.add(upper);
  const jaw = new Group();
  jaw.position.set(0, -0.12, -0.02);
  head.add(jaw);
  const jawGeo = sharedGeo('facet:wyrm-jaw', () => {
    const g = new CylinderGeometry(0.13, 0.27, 0.78, 5, 1);
    g.rotateX(Math.PI / 2);
    return facetize(g, { jitter: 0.12, seed: 37 });
  });
  const jawM = new Mesh(jawGeo, darkMat);
  jawM.scale.set(1, 0.42, 1);
  jawM.position.set(0, -0.06, 0.42);
  addInk(jawM);
  jaw.add(jawM);
  const LOWER = 10;
  const lower = placeRow(wedge, fangMat, LOWER, (i, m) => {
    const side = i % 2 ? 1 : -1;
    const j = i >> 1;
    const z = 0.3 + j * 0.085;
    const x = side * (0.2 - j * 0.02);
    aim(m, x, -0.02, z, side * 0.06, 1, 0.1, 0.08, j === 3 ? 0.22 : 0.13, 0.05);
  }, { name: 'wyrm-teeth-low', inkPx: INK_PX * 0.5 });
  jaw.add(lower);
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = glow(0.34, 0.6);
    e.position.set(side * 0.27, 0.12, 0.36);
    head.add(e);
    eyes.push(e);
  }
  const throat = glow(1.2, 0);
  throat.position.set(0, -0.1, 0.6);
  head.add(throat);
  const spineGlow = glow(2.4, 0.2);
  rig.add(spineGlow);

  // --- Ground: contact shadows under the coil, the burrow mound and rubble.
  const SHADOWS = 5;
  const shadows = [];
  for (let i = 0; i < SHADOWS; i++) {
    const s = groundShadow(0.62, 0.3);
    yaw.add(s);
    shadows.push(s);
  }
  const moundGeo = sharedGeo('facet:wyrm-mound', () => facetize(new SphereGeometry(0.9, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2), { jitter: 0.14, seed: 41 }));
  const earthMat = track(flashable(EARTH));
  const mound = new Mesh(moundGeo, earthMat);
  mound.scale.set(1, 0.35, 1.3);
  mound.visible = false;
  addInk(mound);
  group.add(mound);
  const rubbleGeo = sharedGeo('facet:rubble', () => facetize(new IcosahedronGeometry(1, 0), { jitter: 0.16, seed: 43 }));
  const RUBBLE = 9;
  const rubble = placeRow(rubbleGeo, earthMat, RUBBLE, (i, m) => {
    const a = (i / RUBBLE) * Math.PI * 2 + 0.3;
    const r = 0.95 + 0.12 * Math.sin(i * 2.7);
    const s = 0.1 + 0.05 * ((i * 7) % 3);
    setTRS(m, P.set(Math.cos(a) * r, s * 0.4, Math.sin(a) * r * 1.25), X.set(1, 0, 0), Y.set(0, 1, 0), Z.set(0, 0, 1), s, s * 0.8, s);
  }, { name: 'wyrm-rubble', inkPx: INK_PX * 0.6 });
  rubble.visible = false;
  mound.add(rubble);
  rubble.scale.set(1, 1 / 0.35, 1 / 1.3); // undo the mound's squash
  const seam = glow(1.4, 0);
  seam.position.y = 0.3;
  group.add(seam);

  // --- Live state.
  const C = restChannels({});
  const trail = createTrack();
  const neckW = new Vector3();
  const tmp = { x: 0, z: 0 };
  const loc = new Vector3();
  const m4 = new Matrix4();
  const T = new Vector3();
  const N = new Vector3();
  const B = new Vector3();
  let lastT = null;
  let sinkK = 0;
  let idle = 0;
  // ability playhead (render time)
  let ab = null; // { id, t, rate }
  let lastMode = 'stalk';
  let breathSeen = false;
  let teleSpan = 0.9;

  // Lay the spine's control points (in yaw space) for this frame.
  const ctrl = spine.pts;
  function layCoil(trackOn, rigid = false, moveK = 0) {
    // the breathing sway only at rest: a moving coil is all travelling wave
    const sway = 0.035 * (1 - Math.min(1, Math.max(0, moveK)));
    const cy = Math.cos(yaw.rotation.y);
    const sy = Math.sin(yaw.rotation.y);
    // world -> yaw-local (the yaw group's frame, origin at the entity)
    const toLocal = (wx, wz, y, out) => {
      const dx = wx - group.position.x;
      const dz = wz - group.position.z;
      return out.set(dx * cy - dz * sy, y, dx * sy + dz * cy);
    };
    // head and neck root follow the facing; the rest follows the track
    const reach = C.reach * 0.32;
    const lift = C.rear * 0.82 + C.burstRise;
    ctrl[0].set(Math.sin(C.sweep) * 0.3, HEAD_Y * 0.82 + lift * 0.95 - C.slump * 0.2, 0.32 + reach);
    // the S-fold of the coil (anticipation) bends the neck sideways
    ctrl[1].set(0.18 * C.coil, radius(0.08) + lift * 0.8 - C.slump * 0.1, -NECK + reach * 0.4 - 0.12 * C.coil);
    neckW.set(group.position.x - Math.sin(yaw.rotation.y) * NECK, 0, group.position.z - Math.cos(yaw.rotation.y) * NECK);
    // A turntable (the Journal viewer, the lab standing still) turns the
    // whole coil with the head: lay it straight behind every frame.
    if (rigid) trail.reset(neckW.x, neckW.z, Math.sin(yaw.rotation.y), Math.cos(yaw.rotation.y), SEG_GAP * SPINE_PTS + 1);
    else if (trackOn) trail.push(neckW.x, neckW.z);
    for (let i = 2; i < SPINE_PTS; i++) {
      const sAbs = trail.back(neckW.x, neckW.z, (i - 1) * SEG_GAP, tmp);
      const u = (i - 1) / (SPINE_PTS - 1);
      // only the front of the body lifts; the coil base stays planted
      const up = i === 2 ? lift * 0.45 + 0.1 * C.coil : i === 3 ? lift * 0.12 : 0;
      toLocal(tmp.x, tmp.z, radius(u) * 0.86 + up, ctrl[i]);
      // the no-slip serpentine wave: fixed to the track's arc length, so a
      // moving Wyrm slides through its curves instead of over the ground
      const w = Math.sin(sAbs * 2.1) * 0.16 * Math.min(1, (i - 1) / 3) + Math.sin(idle * 1.3 - i * 0.9) * sway;
      ctrl[i].x += w;
      if (i === 2) ctrl[i].x -= 0.22 * C.coil;
    }
  }

  function layBody() {
    // core masses
    for (let i = 0; i < CORE; i++) {
      const u = 0.03 + (0.95 * i) / (CORE - 1);
      spine.frame(u, loc, T, N, B);
      const r = radius(u);
      setTRS(m4, loc, B, N, T, r * 0.96, r * 0.8, r * 1.15);
      core.setMatrixAt(i, m4);
    }
    core.instanceMatrix.needsUpdate = true;
    tube.update();
    spikes.update();
    cracks.update();
    // shadows under the coil (yaw space, on the floor)
    for (let i = 0; i < SHADOWS; i++) {
      spine.point(0.1 + (0.8 * i) / (SHADOWS - 1), loc);
      shadows[i].position.set(loc.x, 0.008, loc.z);
      const s = radius(0.1 + (0.8 * i) / (SHADOWS - 1)) / 0.46;
      shadows[i].scale.set(s, s, 1);
    }
    // the head rides the first control point
    head.position.copy(ctrl[0]);
    head.rotation.set(C.pitch + 0.03 * Math.sin(idle * 1.9) + 0.25 * C.slump, C.sweep, 0);
    jaw.rotation.x = 0.62 * C.jaw + 0.04 * Math.sin(idle * 2.4);
    spineGlow.position.copy(spine.point(0.45, loc)).y += 0.3;
  }

  function applyGlow(hpFrac, enraged) {
    const fever = 0.65 + 0.15 * Math.sin(idle * 2.2) + 0.4 * C.throat + (1 - hpFrac) * 0.25 + (enraged ? 0.35 : 0);
    for (const g of eyes) g.material.opacity = Math.min(0.95, 0.55 * fever * (1 - 0.7 * C.slump));
    spineGlow.material.opacity = Math.min(0.5, 0.2 * fever);
    throat.material.opacity = Math.min(0.85, 0.85 * C.throat);
    crackMat.color.copy(TELL_VIOLET).multiplyScalar(0.75 + 0.35 * Math.min(1, fever - 0.4));
  }

  function applyGround(moveK, sink, rise) {
    rig.position.y = -1.7 * sink;
    rig.visible = sink < 0.96;
    for (const s of shadows) s.visible = sink < 0.5;
    mound.visible = sink > 0.05;
    rubble.visible = mound.visible;
    const churn = Math.sin(idle * 9) * 0.05 * (moveK + rise * 2);
    mound.scale.set(1 + churn, (0.35 + 0.35 * rise) * Math.min(1, sink * 1.5), 1.3 - churn);
    seam.material.opacity = sink * (0.25 + 0.45 * rise + 0.08 * Math.sin(idle * 5));
  }

  // --- In game: the sim's modes and telegraphs drive the timelines.
  function drive(dt, e) {
    const tel = e && e.telegraph ? e.telegraph : null;
    const mode = e ? e.mode || 'stalk' : 'stalk';
    if (tel && tel.attack === 'breath') {
      if (!breathSeen) {
        breathSeen = true;
        teleSpan = tel.resolveTick > tel.startTick ? (tel.resolveTick - tel.startTick) / 60 : 0.9;
        ab = { id: 'breath', t: 0 };
      }
    } else if (breathSeen) {
      breathSeen = false;
      // the telegraph resolved: the strike lands now
      if (ab && ab.id === 'breath') ab.t = Math.max(ab.t, WYRM_ABILITIES.breath.startOf('strike'));
    }
    const B2 = WYRM_ABILITIES.burrow;
    if (mode !== lastMode) {
      if (mode === 'burrowed' && lastMode !== 'emerging') ab = { id: 'burrow', t: 0 };
      else if (mode === 'emerging') ab = { id: 'burrow', t: B2.startOf('rise') };
      else if (mode === 'exposed') ab = { id: 'burrow', t: B2.startOf('burst') };
      else if (mode === 'stalk' && ab && ab.id === 'burrow') ab.t = Math.max(ab.t, B2.startOf('settle'));
      lastMode = mode;
    }
    if (!ab) return restChannels(C);
    const tl = WYRM_ABILITIES[ab.id];
    // advance, holding the open-ended phases while the sim is still in them
    let rate = 1;
    if (ab.id === 'breath') {
      const drawEnd = tl.startOf('strike');
      if (breathSeen) rate = ab.t < drawEnd ? 0.9 / teleSpan : 0;
      if (breathSeen && ab.t + dt * rate >= drawEnd) ab.t = drawEnd - 1e-4;
      else ab.t += dt * rate;
    } else {
      const hold = (phase, live) => {
        const end = tl.startOf(phase) + tl.phases[tl.phases.findIndex((p) => p.id === phase)].dur;
        if (live && ab.t + dt >= end) {
          ab.t = end - 1e-4;
          return true;
        }
        return false;
      };
      if (!(hold('tunnel', mode === 'burrowed') || hold('rise', mode === 'emerging') || hold('exposed', mode === 'exposed'))) ab.t += dt;
    }
    const s = tl.sample(ab.t);
    abilityChannels(ab.id, s, C);
    if (ab.t >= tl.duration) ab = null;
    return C;
  }

  function reset() {
    lastT = null;
    sinkK = 0;
    ab = null;
    lastMode = 'stalk';
    breathSeen = false;
    trail.reset(group.position.x - Math.sin(yaw.rotation.y) * NECK, group.position.z - Math.cos(yaw.rotation.y) * NECK, Math.sin(yaw.rotation.y), Math.cos(yaw.rotation.y), SEG_GAP * SPINE_PTS + 1);
  }
  let lastX = 0;
  let lastZ = 0;
  let live = false; // posed by a live entity at least once
  C.burstRise = 0;

  return {
    group,
    mats,
    setYaw: (r) => {
      yaw.rotation.y = r;
    },
    setFlash(k) {
      const v = k < 0 ? 0 : k > 1 ? 1 : k;
      for (const m of mats) m.emissiveIntensity = v;
    },
    // `turntable` (the Journal viewer spinning the model with setYaw) lays the
    // coil rigidly behind the head; a pose with no entity after live play (the
    // death collapse) freezes the coil where it lay.
    pose({ t, moveK = 0, hpFrac = 1, e = null, turntable = false }) {
      // a pooled rig coming back, or a jump (a new room): lay the coil afresh
      if (lastT === null || t < lastT || Math.hypot(group.position.x - lastX, group.position.z - lastZ) > 2.5) reset();
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      lastX = group.position.x;
      lastZ = group.position.z;
      idle += dt;
      drive(dt, e);
      const under = !!(e && e.burrowed);
      sinkK += ((under ? 1 : 0) - sinkK) * (1 - Math.exp(-7 * dt));
      C.burstRise = 0;
      const sink = ab && ab.id === 'burrow' ? Math.max(C.sink, sinkK * (C.sink > 0 ? 1 : 0)) : sinkK;
      applyGround(moveK, sink, C.rise);
      const hasEnt = !!(e && typeof e.x === 'number');
      if (hasEnt && !turntable) live = true;
      layCoil(hasEnt, turntable || !live, moveK);
      layBody();
      applyGlow(hpFrac, !!(e && e.enraged));
    },
    // The model lab: pose an ability at any time (play, scrub, rewind) and
    // walk the coil along a path it sets itself. Pure in `abT`.
    lab: {
      abilities: WYRM_ABILITIES,
      reset,
      // the spine's control points in world space, head first (probes)
      coil: () => ctrl.map((p) => rig.localToWorld(p.clone())),
      pose({ dt, ability = null, abT = 0, moveK = 0, hpFrac = 1, enraged = false, rigid = false }) {
        if (lastT === null) reset();
        lastT = 0;
        idle += dt;
        if (ability) abilityChannels(ability, WYRM_ABILITIES[ability].sample(abT), C);
        else restChannels(C);
        C.burstRise = 0;
        applyGround(moveK, C.sink, C.rise);
        layCoil(true, rigid, moveK);
        layBody();
        applyGlow(hpFrac, enraged);
      },
    },
  };
}
