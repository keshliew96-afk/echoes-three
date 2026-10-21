// Healer — the MOUSE HEALER model (docs/MOUSE_HEALER.md). A skinned, textured
// model with keyframed clips (src/assets/heroes/mousehealer.glb, built in
// Blender from Kesh's Meshy mouse), standing in for the procedural chibi in
// healer.js. The procedural healer stays in the code as the fallback:
// `HEALER_MODEL` below, `?healer=classic` in a harness build, or a model that
// failed to load all put the old rig back.
//
// The game drives five clip names through critters/index.js (idle, walk, cast,
// hurt, downed) and lets a revived body rise. This file maps each onto the
// model's own clips:
//
//   idle    Idle (loop), with Idle_Look played now and then (the procedural
//           idle's look-around flourish)
//   walk    a four-way run blended by where she is going relative to where
//           she faces (she faces her aim, so she can run backward or sideways
//           while shooting): Run_F, Run_B, Strafe_L, Strafe_R. Each is built
//           from IK foot paths whose planted foot moves back at exactly the
//           body's speed (2.4 u/s at rate 1), and the rate follows her real
//           speed, so a planted foot stays still on the floor.
//   cast    the three-hit staff combo Bolt_1, Bolt_2, Bolt_3 (below). Every
//           shot is one hit; the strike lands 2-3 frames after the shot.
//   hurt    Hit (once, held on its last frame)
//   downed  Death (once, held lying on the floor)
//   rise    Revive, whenever a downed body is asked for anything else; the
//           requested clip plays when the body is up.
//
// THE COMBO (render only; bolt timing, damage and the sim are untouched).
// Hit 1 is a wide horizontal sweep, back-left to front-right; hit 2 a rising
// reverse sweep, low right to high front; hit 3 an overhead slam that drives
// the crystal into the ground in front. Each clip ENDS in the next hit's
// wind-up pose and holds it there, so the momentum of one hit carries into the
// next instead of passing through idle: the sweep's follow-through keeps
// rotating up behind the right shoulder (hit 2's wind-up), the rising sweep
// carries on overhead (hit 3's wind-up), and the slam's recovery swings back
// to the left (hit 1's wind-up). The arena tells the model which hit a shot
// is (setAnim's third argument); a caller that does not (the AI seats) gets
// the same count from the time since the last shot.
import { AnimationClip, AnimationMixer, Color, Group, LoopOnce, LoopRepeat, MeshToonMaterial, Quaternion, SRGBColorSpace, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import glbUrl from '../../assets/heroes/mousehealer.glb?url';
import { PALETTE } from '../../data/palette.js';
import { getGradientMap } from '../toon.js';
import { makeGlowSprite } from '../glow.js';
import { exactColorNearest, addSkinnedInk } from './common.js';

// 'mouse' plays the model; 'classic' keeps the procedural chibi (healer.js).
export const HEALER_MODEL = 'mouse';

// The model is authored in metres at 1.70 tall (ear tips); the party stands
// 1.10 u tall (healer.js EAR_TOP), so it is scaled to match.
const MODEL_HEIGHT = 1.7;
const STAND_HEIGHT = 1.1;
const SCALE = STAND_HEIGHT / MODEL_HEIGHT;

const CLIP_OF = Object.freeze({ idle: 'Idle', walk: 'Run_F', cast: 'Bolt_1', hurt: 'Hit', downed: 'Death' });
const COMBO = Object.freeze(['Bolt_1', 'Bolt_2', 'Bolt_3']);
// A shot within this long of the last one is the next hit; later, hit 1.
export const COMBO_WINDOW = 0.9;
// SKILL CASTS (render only). A skill plays the cast that fits its shape, from
// the frame just before its strike, so the strike lands within ~0.25 s of the
// cast while the wind-up still shows:
//   projectile  Cast_Bolt   the two-hand staff thrust, the gem leads the bolt
//   direct      Cast_Quick  the free palm pushed toward the ally it lands on
//   nova        Cast_Area   staff high overhead, then slammed down: the burst
//   ground_aoe  Attack      an overhead staff strike on the ground ahead
//   melee_arc   Bolt_1      the wide horizontal sweep: the wave's arc
// Any other shape (the auras) plays Cast_Bolt.
export const SKILL_CAST = Object.freeze({
  projectile: Object.freeze({ clip: 'Cast_Bolt', from: 0.33 }),
  direct: Object.freeze({ clip: 'Cast_Quick', from: 0.37 }),
  nova: Object.freeze({ clip: 'Cast_Area', from: 0.8 }),
  ground_aoe: Object.freeze({ clip: 'Attack', from: 0.3 }),
  melee_arc: Object.freeze({ clip: 'Bolt_1', from: 0 }),
});
// READABILITY (Kesh's pick): the painted textures read darker than the toon
// party, so the lit colour is lifted; the head tips back a little so the face
// shows under the hood at the 52 deg gameplay camera (the procedural rigs'
// CHIN_UP); the body carries the party's ink line (common.js addSkinnedInk).
const LIFT = 1.18;
const CHIN_UP = 0.2; // rad
// The four-way run, and the speed its strides are built for (u/s at rate 1).
export const LOCO = Object.freeze({ F: 'Run_F', B: 'Run_B', L: 'Strafe_L', R: 'Strafe_R' });
export const LOCO_SPEED = 2.4;
const LOCO_KEYS = Object.keys(LOCO);
const MOVING = 0.3; // u/s, the game's MOVE_EPS
// LOWER BODY: the root, the hips and spine base the legs hang from, the legs
// and the tail. While she casts or flinches on the move, these come from the
// run (so her feet keep stepping the way she travels) and the rest from the
// cast; standing, the cast plays whole, its own planted steps included.
const LOWER = new Set(['Bone_000', 'Bone_001', 'Bone_003', 'Bone_002', 'Bone_004', 'Bone_005', 'Bone_006', 'Bone_007', 'Bone_008', 'Bone_009',
  'Bone_013', 'Bone_014', 'Bone_015', 'Bone_016', 'Bone_017', 'Bone_018', 'Bone_019', 'Bone_020', 'Bone_021', 'Bone_022']);
const boneOf = (trackName) => trackName.split('.')[0];
// LIVE FOOT LOCKS (Kesh's rule 2 in the game, docs/MOUSE_HEALER.md). The clips
// carry baked locks, but the game also turns her on the spot (she faces her
// aim) and blends clips into each other; both would drag a planted foot. So
// while she stands, each planted foot is held where it landed in the world by
// a two-bone IK on the thigh and shin, and it steps (lifted, one foot at a
// time, the one most out of place first) once the body has turned or shifted
// too far over it.
const IK_LEGS = Object.freeze({ L: ['Bone_017', 'Bone_016', 'Bone_015'], R: ['Bone_022', 'Bone_021', 'Bone_020'] });
const STEP_DIST = 0.07; // u the animated foot may drift from its lock before it steps
const STEP_TWIST = 0.6; // rad the foot may twist against its lock before it steps
const STEP_TIME = 0.14; // s a step takes
const STEP_LIFT = 0.035; // u a step lifts the foot
const PLANT_TOL = 0.02; // u above its rest height a foot still counts as planted
const IK_RATE = 6; // 1/s the live locks fade in and out
const REVIVE_RATE = 2;
const DEATH_RATE = 1.5;
// Cross-fade lengths (s): the hurt snap and the cast pop must land at once.
const FADE = Object.freeze({ idle: 0.25, walk: 0.18, cast: 0.04, hurt: 0.05, downed: 0.12, rise: 0.15, look: 0.3 });
// The look-around plays about every 6.4 s of idling, like the procedural idle.
const LOOK_EVERY = 6.4;

let gltf = null;
let loadFailed = false;
let loading = null;

export function preloadMouseHealer() {
  if (HEALER_MODEL !== 'mouse') return Promise.resolve(false);
  if (!loading) {
    loading = new GLTFLoader()
      .loadAsync(glbUrl)
      .then((g) => {
        gltf = g;
        return true;
      })
      .catch((err) => {
        loadFailed = true;
        console.warn('[echoes] mouse healer model failed to load; using the procedural healer', err);
        return false;
      });
  }
  return loading;
}

export function mouseHealerReady() {
  return !!gltf && !loadFailed;
}

// The gem halo: the same Bright Heal family as the procedural gem (healer.js),
// authored up-hue by the measured ACES skew so the core lands in the band.
function gemColor() {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(PALETTE.brightHeal).getHSL(hsl, SRGBColorSpace);
  return exactColorNearest(new Color().setHSL(hsl.h + 18 / 360, hsl.s, hsl.l, SRGBColorSpace).getHex());
}

export function buildMouseHealer(rig, trackAccent) {
  const model = cloneSkinned(gltf.scene);
  const inks = [];
  model.scale.setScalar(SCALE);
  rig.add(model);

  // Toon shading on the painted textures, so the model sits in the party's
  // 3-step light like every other hero, and so the hit flash (it drives toon
  // emissive) and the downed greying (trackAccent) both reach it.
  model.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    const mat = new MeshToonMaterial({
      color: new Color(LIFT, LIFT, LIFT),
      map: src.map || null,
      normalMap: src.normalMap || null,
      gradientMap: getGradientMap(),
    });
    o.material = trackAccent(mat);
    o.frustumCulled = false; // skinned bounds do not follow the clips
    if (o.isSkinnedMesh) inks.push(o);
  });
  for (const o of inks) addSkinnedInk(o);

  const head = model.getObjectByName('Bone_023') || model;
  const tip = model.getObjectByName('StaffTip') || head;
  const torso = new Group(); // the procedural lean pivot; unused by clips

  // Gem halo at the staff tip (healer.js: core + glow; the cast lifts it).
  const GLOW_BASE = 0.26;
  const gem = gemColor();
  const glow = makeGlowSprite({ color: gem.clone().multiplyScalar(3.1), size: GLOW_BASE / SCALE, opacity: 0.6 });
  tip.add(glow);
  const flare = makeGlowSprite({ color: gem.clone().multiplyScalar(1.9), size: (GLOW_BASE * 0.32) / SCALE, opacity: 0.5 });
  tip.add(flare);

  const mixer = new AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  // Split versions: the cast/hurt clips without the lower body, the run without
  // the upper body (see LOWER).
  const split = (name, keepLower) => {
    const c = gltf.animations.find((x) => x.name === name);
    if (!c) return null;
    const tracks = c.tracks.filter((t) => LOWER.has(boneOf(t.name)) === keepLower);
    return mixer.clipAction(new AnimationClip(`${name}_${keepLower ? 'legs' : 'upper'}`, c.duration, tracks));
  };
  const upper = {};
  for (const n of [...COMBO, ...Object.values(SKILL_CAST).map((k) => k.clip), 'Hit']) if (!upper[n]) upper[n] = split(n, false);
  const once = (a) => {
    if (!a) return a;
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    return a;
  };
  for (const n of ['Hit', 'Death', 'Revive', 'Idle_Look', ...COMBO]) once(actions[n]);
  for (const k of Object.values(SKILL_CAST)) once(actions[k.clip]);
  for (const a of Object.values(upper)) once(a);
  if (actions.Idle) actions.Idle.setLoop(LoopRepeat, Infinity);
  // The sim revives a body at once; the rise is played quick so the healer is
  // on her feet before she can be steered far (~0.85 s, the procedural rise 0.42 s).
  if (actions.Revive) actions.Revive.timeScale = REVIVE_RATE;
  // The fall lands in ~0.75 s (the procedural collapse takes 0.45 s), so a
  // downed healer reads as down while the revive prompt is already up.
  if (actions.Death) actions.Death.timeScale = DEATH_RATE;

  // The run: four full clips and four legs-only clips, all playing in step
  // from the start; only their weights change.
  const loco = {};
  const locoLegs = {};
  for (const [k, n] of Object.entries(LOCO)) {
    loco[k] = actions[n];
    locoLegs[k] = split(n, true);
    for (const a of [loco[k], locoLegs[k]]) {
      if (!a) continue;
      a.setLoop(LoopRepeat, Infinity);
      a.setEffectiveWeight(0);
      a.play();
    }
  }
  // Weights. The clips in `fades` are normalised to sum 1 while one of them is
  // the target; the full run takes whatever they leave (so nothing ever blends
  // toward the bind pose), and the legs-only run carries exactly the lower body
  // the upper-half clips leave out.
  let locoW = 0; // full run weight
  let legsW = 0; // legs-only run weight (casting on the move)
  const upperSet = new Set(Object.values(upper).filter(Boolean));
  const dirW = { F: 1, B: 0, L: 0, R: 0 };
  let speed = 0;
  let localX = 0;
  let localZ = 0;

  // Hand-run fades: every one-shot / idle action has a weight easing to its
  // target, so the run's weights and the clips' can be mixed freely.
  const fades = new Map(); // action -> { w, target, rate }
  let current = null; // the main (non-run) action
  let anim = null; // the game's clip name
  let pending = null; // what to play once the body has risen
  let lookIn = LOOK_EVERY * (0.4 + 0.6 * Math.random());
  let clock = 0;
  let lastShot = -Infinity;
  let hit = 0; // the combo hit last played, 1-3 (0 = none)
  let full = null; // the whole-body clip behind `current` (its upper half may be playing)

  function fadeTo(action, fade, time = 0) {
    if (!action) return;
    const rate = 1 / Math.max(0.02, fade);
    for (const [a, f] of fades) if (a !== action) {
      f.target = 0;
      f.rate = rate;
    }
    // a clip already blending in keeps its weight; nothing at all on screen
    // (a fresh rig, the HUD portrait) starts it whole
    const f = fades.get(action) || { w: fades.size === 0 && locoW + legsW < 1e-3 ? 1 : 0, target: 1, rate };
    f.target = 1;
    f.rate = rate;
    fades.set(action, f);
    action.reset();
    action.time = time;
    action.enabled = true;
    action.setEffectiveWeight(f.w);
    action.play();
    current = action;
  }
  // A clip that splits: standing it plays whole, on the move its upper half.
  function playSplit(name, fade, time = 0) {
    full = actions[name] || null;
    const a = speed > MOVING && upper[name] ? upper[name] : full;
    fadeTo(a, fade, time);
  }

  function start(name, phase, step) {
    if (name === 'cast') {
      // One shot = one hit. Explicit step from the arena, else the shot clock.
      hit = step >= 1 && step <= 3 ? step : clock - lastShot <= COMBO_WINDOW ? (hit % 3) + 1 : 1;
      lastShot = clock;
      playSplit(COMBO[hit - 1], FADE.cast);
      return;
    }
    if (name === 'hurt' || name === 'downed') hit = 0;
    full = null;
    if (name === 'walk') {
      // the run takes over: fade every clip out
      for (const f of fades.values()) {
        f.target = 0;
        f.rate = 1 / FADE.walk;
      }
      current = null;
      return;
    }
    if (name === 'hurt') {
      playSplit('Hit', FADE.hurt);
      return;
    }
    fadeTo(actions[CLIP_OF[name]], FADE[name] ?? 0.15);
    if (name === 'idle') lookIn = LOOK_EVERY * (0.6 + 0.4 * Math.random());
  }

  function play(name, phase, step) {
    if (!CLIP_OF[name]) return;
    if (name === anim && phase === undefined) return;
    const was = anim;
    anim = name;
    if (was === 'downed' && name !== 'downed' && actions.Revive) {
      pending = name;
      fadeTo(actions.Revive, FADE.rise);
      return;
    }
    if (current === actions.Revive && pending && name !== 'downed' && name !== 'hurt') {
      pending = name; // let the body finish getting up
      return;
    }
    pending = null;
    start(name, phase, step);
  }

  // A skill cast: the game names the skill's shape (critters/index.js castSkill).
  function castSkill(shape) {
    const k = SKILL_CAST[shape] || SKILL_CAST.projectile;
    if (anim === 'downed' || current === actions.Revive) return;
    anim = 'cast';
    pending = null;
    hit = 0; // a skill breaks the basic combo
    playSplit(k.clip, FADE.cast, k.from);
  }

  // Where she is going, relative to where she faces (critters/index.js).
  function setMove(lx, lz) {
    localX = lx;
    localZ = lz;
    speed = Math.hypot(lx, lz);
  }

  mixer.addEventListener('finished', (e) => {
    // (a hurt or a new down that cut into the rise owns the body now)
    if (e.action === actions.Revive && current === actions.Revive) {
      const next = pending || 'idle';
      pending = null;
      start(next);
    } else if (e.action === actions.Idle_Look && anim === 'idle') {
      fadeTo(actions.Idle, FADE.look);
    }
  });

  // RULE 3 ON THE MOVE: an upper-half clip leaves the pelvis to the run (the
  // legs hang from it), which would drop the hip turn that drives the swing.
  // The clip's own pelvis turn is put back on the chest instead, so the whole
  // torso still winds and unwinds through the strike while the legs run.
  const pelvis = model.getObjectByName('Bone_001');
  const chest = model.getObjectByName('Bone_012');
  const pelvisRest = pelvis ? pelvis.quaternion.clone() : null;
  const pelvisTrack = {};
  for (const n of Object.keys(upper)) {
    const c = gltf.animations.find((x) => x.name === n);
    const t = c && c.tracks.find((x) => x.name === 'Bone_001.quaternion');
    if (t && upper[n]) pelvisTrack[n] = t.createInterpolant();
  }
  const qC = new Quaternion();
  const qR = new Quaternion();
  const qW = new Quaternion();
  const qI = new Quaternion();
  function carryHips(w) {
    if (!pelvis || !chest || !current || !upperSet.has(current) || w <= 0) return;
    const name = current.getClip().name.replace(/_upper$/, '');
    const interp = pelvisTrack[name];
    if (!interp) return;
    const v = interp.evaluate(current.time);
    qC.set(v[0], v[1], v[2], v[3]);
    // the turn the clip gives the pelvis, as a world-space rotation
    pelvis.parent.getWorldQuaternion(qP);
    qR.copy(qP).multiply(pelvisRest); // the pelvis frame at rest
    qW.copy(qP).multiply(qC).multiply(qR.clone().invert()); // P*clip*(P*rest)^-1
    qW.slerp(qI.identity(), 1 - Math.min(1, w));
    chest.getWorldQuaternion(qA);
    qA.premultiply(qW);
    chest.parent.getWorldQuaternion(qP);
    chest.quaternion.copy(qP.invert().multiply(qA));
  }

  // The chin-up: a small tilt back of the head, added on top of the clip and
  // turned about the model's own sideways axis, so it reads the same whatever
  // the head bone's rest frame is. Faded out while the body is down.
  const qParent = new Quaternion();
  const qModel = new Quaternion();
  const qTilt = new Quaternion();
  const qWorld = new Quaternion();
  const XAXIS = new Vector3(1, 0, 0);
  function chinUp(k) {
    if (k <= 0 || head === model) return;
    qTilt.setFromAxisAngle(XAXIS, -CHIN_UP * k); // +Z faces forward: -X tips the face up
    model.getWorldQuaternion(qModel);
    head.parent.getWorldQuaternion(qParent);
    // local' = P^-1 * (M * tilt * M^-1) * P * local
    qWorld.copy(qModel).multiply(qTilt).multiply(qModel.invert());
    head.quaternion.premultiply(qParent.clone().invert().multiply(qWorld).multiply(qParent));
  }

  function tick(dt, P) {
    clock += dt;
    if (anim === 'idle' && current === actions.Idle && actions.Idle_Look) {
      lookIn -= dt;
      if (lookIn <= 0) {
        lookIn = LOOK_EVERY * (0.8 + 0.4 * Math.random());
        fadeTo(actions.Idle_Look, FADE.look);
      }
    }
    // A split clip follows her: whole when she stops, upper half when she moves.
    if (full && current && (anim === 'cast' || anim === 'hurt')) {
      const want = speed > MOVING && upper[full.getClip().name] ? upper[full.getClip().name] : full;
      if (want !== current) {
        const t = current.time;
        const f = fades.get(current);
        fadeTo(want, 0.08, t);
        if (f) fades.get(want).w = f.w;
      }
    }
    // Fades, then normalise the clips while one is the target.
    let sum = 0;
    for (const [a, f] of fades) {
      f.w = f.target > f.w ? Math.min(f.target, f.w + f.rate * dt) : Math.max(f.target, f.w - f.rate * dt);
      if (f.w <= 0 && f.target <= 0) {
        a.stop();
        fades.delete(a);
      } else sum += f.w;
    }
    const norm = sum > 0 && (current ? sum !== 1 : sum > 1) ? 1 / sum : 1;
    let wFull = 0;
    let wUpper = 0;
    for (const [a, f] of fades) {
      const w = f.w * norm;
      a.setEffectiveWeight(w);
      if (upperSet.has(a)) wUpper += w;
      else wFull += w;
    }
    const wasRunning = locoW + legsW;
    locoW = Math.max(0, 1 - wFull - wUpper);
    legsW = wUpper;
    // Direction: travel in her facing frame (+Z forward, +X her left).
    const moving = speed > MOVING;
    if (moving) {
      const f = Math.max(0, localZ);
      const b = Math.max(0, -localZ);
      const l = Math.max(0, localX);
      const r = Math.max(0, -localX);
      const total = f + b + l + r || 1;
      // from a standstill (or a reversal) the run starts in the right direction
      const kd = wasRunning < 0.05 ? 1 : Math.min(1, dt * 10);
      dirW.F += (f / total - dirW.F) * kd;
      dirW.B += (b / total - dirW.B) * kd;
      dirW.L += (l / total - dirW.L) * kd;
      dirW.R += (r / total - dirW.R) * kd;
      // The strides are built for LOCO_SPEED along each clip's own axis; blended
      // on a diagonal, the planted foot moves at |sum of w_i d_i| of that, so the
      // rate makes up the difference and the foot still matches her speed.
      const m = Math.max(0.5, Math.hypot(dirW.L - dirW.R, dirW.F - dirW.B));
      const rate = Math.min(3.2, Math.max(MOVING / LOCO_SPEED, speed / (LOCO_SPEED * m)));
      for (const key of LOCO_KEYS) {
        if (loco[key]) loco[key].timeScale = rate;
        if (locoLegs[key]) locoLegs[key].timeScale = rate;
      }
    }
    for (const key of LOCO_KEYS) {
      if (loco[key]) loco[key].setEffectiveWeight(locoW * dirW[key]);
      if (locoLegs[key]) locoLegs[key].setEffectiveWeight(legsW * dirW[key]);
    }
    // The bones edited after the mixer (head, legs, chest) go back to the clip
    // pose first: a track that holds still is not rewritten by the mixer, and
    // the IK must never read its own last result back as the clip.
    for (const [b, q] of edited) b.quaternion.copy(q);
    mixer.update(dt);
    for (const [b, q] of edited) q.copy(b.quaternion);
    carryHips(wUpper);
    chinUp(1 - P.collapse);
    liveLocks(dt);

    // Emitter heat, as healer.js: the halo carries the cast and dims when down.
    const heat = P.gem * (1 - P.desat);
    const gs = (GLOW_BASE * (1 + 1.15 * heat)) / SCALE;
    glow.scale.set(gs, gs, 1);
    glow.material.opacity = (0.34 + 0.62 * heat) * (1 - P.desat);
    const fs = (GLOW_BASE * 0.32 * (1 + 0.9 * heat)) / SCALE;
    flare.scale.set(fs, fs, 1);
    flare.material.opacity = (0.2 + 0.55 * heat) * (1 - P.desat);
  }

  // --- live foot locks
  const ik = {};
  for (const [side, names] of Object.entries(IK_LEGS)) {
    const [th, sh, ft] = names.map((n) => model.getObjectByName(n));
    if (th && sh && ft) ik[side] = { th, sh, ft, lock: null, lockQ: new Quaternion(), step: null, restY: 0, w: 0 };
  }
  model.updateWorldMatrix(true, true);
  {
    const base = model.getWorldPosition(new Vector3()).y;
    for (const leg of Object.values(ik)) leg.restY = leg.ft.getWorldPosition(new Vector3()).y - base;
  }
  let ikW = 0;
  const SIDES = Object.keys(ik);
  const errBy = { L: 0, R: 0 };
  const byErr = (a, b) => errBy[b] - errBy[a];
  const RELEASE_TIME = 0.1; // s a lifted foot takes to hand back from its lock to the clip
  const vH = new Vector3();
  const vK = new Vector3();
  const vA = new Vector3();
  const vT = new Vector3();
  const vU = new Vector3();
  const vB = new Vector3();
  const vD0 = new Vector3();
  const vD1 = new Vector3();
  const qA = new Quaternion();
  const qB = new Quaternion();
  const qP = new Quaternion();
  const qD = new Quaternion();
  // Turn bone `b` so that the direction from `from` to `cur` points from
  // `from` to `want`, in the world, blended by w over the clip's own pose.
  function aimBone(b, from, cur, want, w) {
    vD0.subVectors(cur, from).normalize();
    vD1.subVectors(want, from).normalize();
    qD.setFromUnitVectors(vD0, vD1);
    b.getWorldQuaternion(qA);
    qA.premultiply(qD);
    b.parent.getWorldQuaternion(qP);
    qB.copy(qP).invert().multiply(qA);
    b.quaternion.slerp(qB, w);
    b.updateMatrixWorld(true);
  }
  function setWorldQuat(b, q, w) {
    b.parent.getWorldQuaternion(qP);
    qB.copy(qP).invert().multiply(q);
    b.quaternion.slerp(qB, w);
    b.updateMatrixWorld(true);
  }
  // Analytic two-bone IK: put the ankle on T, the knee in the clip's own plane.
  function solveLeg(leg, T, footQ, w) {
    leg.th.getWorldPosition(vH);
    leg.sh.getWorldPosition(vK);
    leg.ft.getWorldPosition(vA);
    const L1 = vH.distanceTo(vK);
    const L2 = vK.distanceTo(vA);
    vU.subVectors(T, vH);
    let d = vU.length();
    const dMax = (L1 + L2) * 0.999;
    const dMin = Math.abs(L1 - L2) * 1.01 + 1e-4;
    d = Math.min(dMax, Math.max(dMin, d));
    vU.normalize();
    vT.copy(vH).addScaledVector(vU, d);
    vB.subVectors(vK, vH);
    vB.addScaledVector(vU, -vB.dot(vU));
    if (vB.lengthSq() < 1e-10) vB.set(0, 0, 1);
    vB.normalize();
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const knee = vB.multiplyScalar(h).addScaledVector(vU, a).add(vH);
    aimBone(leg.th, vH, vK, knee, w);
    leg.sh.getWorldPosition(vK);
    leg.ft.getWorldPosition(vA);
    aimBone(leg.sh, vK, vA, vT, w);
    setWorldQuat(leg.ft, footQ, w);
  }
  const vDesired = new Vector3();
  const qDesired = new Quaternion();
  const vStep = new Vector3();
  const qStep = new Quaternion();
  function liveLocks(dt) {
    const standing = speed <= MOVING && anim !== 'walk' && anim !== 'downed' && current !== actions.Revive && current !== actions.Death;
    // off at once when she sets off (the run carries its own feet), on gently
    ikW = standing ? Math.min(1, ikW + IK_RATE * dt) : 0;
    if (ikW <= 0) {
      for (const leg of Object.values(ik)) {
        leg.lock = null;
        leg.step = null;
        leg.w = 0;
      }
      return;
    }
    model.updateWorldMatrix(true, true);
    const ground = model.getWorldPosition(vStep).y;
    // the foot most out of place may step first; the other anchors
    for (const side of SIDES) {
      const leg = ik[side];
      leg.ft.getWorldPosition(vDesired);
      errBy[side] = leg.lock ? Math.hypot(vDesired.x - leg.lock.x, vDesired.z - leg.lock.z) : 0;
    }
    SIDES.sort(byErr);
    for (const side of SIDES) {
      const leg = ik[side];
      const other = ik[side === 'L' ? 'R' : 'L'];
      leg.ft.getWorldPosition(vDesired);
      leg.ft.getWorldQuaternion(qDesired);
      leg.th.getWorldPosition(vH);
      const reach = vH.distanceTo(leg.sh.getWorldPosition(vK)) + vK.distanceTo(vDesired);
      // a lock the body has jumped away from (a teleport, a room change) is dropped
      if (leg.lock && Math.hypot(leg.lock.x - vH.x, leg.lock.z - vH.z) > reach) {
        leg.lock = null;
        leg.step = null;
      }
      const lifted = vDesired.y - ground > leg.restY + PLANT_TOL;
      if (lifted) {
        // the clip itself lifts this foot (a hop, a baked step): hand it back
        // to the clip over RELEASE_TIME instead of snapping it there
        leg.step = null;
        if (leg.lock && leg.w > 0) {
          leg.w = Math.max(0, leg.w - dt / RELEASE_TIME);
          vStep.set(leg.lock.x, vDesired.y, leg.lock.z);
          solveLeg(leg, vStep, leg.lockQ, ikW * leg.w);
        }
        if (leg.w <= 0) leg.lock = null;
        continue;
      }
      if (!leg.lock) {
        // a fresh lock sits exactly where the clip has the foot: no pop
        leg.lock = vDesired.clone();
        leg.lockQ.copy(qDesired);
      }
      leg.w = 1;
      if (leg.step) {
        leg.step.t = Math.min(1, leg.step.t + dt / STEP_TIME);
        const k = leg.step.t * leg.step.t * (3 - 2 * leg.step.t);
        vStep.copy(leg.step.from).lerp(vDesired, k);
        vStep.y = vDesired.y + STEP_LIFT * Math.sin(Math.PI * leg.step.t);
        qStep.copy(leg.step.fromQ).slerp(qDesired, k);
        solveLeg(leg, vStep, qStep, ikW);
        if (leg.step.t >= 1) {
          leg.lock.copy(vDesired);
          leg.lockQ.copy(qDesired);
          leg.step = null;
        }
        continue;
      }
      const drift = Math.hypot(vDesired.x - leg.lock.x, vDesired.z - leg.lock.z);
      const twist = 2 * Math.acos(Math.min(1, Math.abs(qDesired.dot(leg.lockQ))));
      if ((drift > STEP_DIST || twist > STEP_TWIST) && !(other && other.step)) {
        leg.step = { t: 0, from: leg.lock.clone(), fromQ: leg.lockQ.clone() };
      }
      vStep.set(leg.lock.x, vDesired.y, leg.lock.z);
      solveLeg(leg, vStep, leg.lockQ, ikW);
    }
  }

  // Bones written after the mixer each frame (chest, head, legs): their clip
  // values are kept here and put back before the next mixer update.
  const edited = new Map();
  for (const b of [chest, head, ...Object.values(ik).flatMap((l) => [l.th, l.sh, l.ft])]) if (b && b !== model) edited.set(b, b.quaternion.clone());

  play('idle');

  return {
    clipDriven: true,
    play,
    castSkill,
    setMove,
    tick,
    // Read by tools/mouse-healer-browser.mjs through critters/index.js (harness only).
    clipState: () => ({
      anim,
      clip: current ? current.getClip().name : locoW > 0.5 ? LOCO[Object.keys(dirW).reduce((a, b) => (dirW[a] >= dirW[b] ? a : b))] : null,
      time: current ? current.time : 0,
      pending,
      hit,
      ik: +ikW.toFixed(2),
      wsum: (() => {
        let up = 0;
        let low = 0;
        for (const a of fades.keys()) {
          const w = a.getEffectiveWeight();
          up += w;
          if (!upperSet.has(a)) low += w;
        }
        return { upper: +(up + locoW).toFixed(3), lower: +(low + locoW + legsW).toFixed(3) };
      })(),
      feet: Object.fromEntries(Object.entries(ik).map(([side, leg]) => {
        const p = leg.ft.getWorldPosition(new Vector3());
        return [side, { x: +p.x.toFixed(4), y: +p.y.toFixed(4), z: +p.z.toFixed(4), locked: !!leg.lock, stepping: !!leg.step }];
      })),
      loco: { full: +locoW.toFixed(2), legs: +legsW.toFixed(2), rate: loco.F ? +loco.F.timeScale.toFixed(2) : 0, ...Object.fromEntries(Object.entries(dirW).map(([k, v]) => [k, +v.toFixed(2)])) },
    }),
    apply() {},
    torso,
    head,
    tip,
    basePitch: 0,
    metrics: {
      standHeight: STAND_HEIGHT,
      earTopY: STAND_HEIGHT,
      domeTopY: 1.0,
      chinY: 0.8,
      headR: 0.17,
      halfWidth: 0.34,
      hipY: 0.35,
    },
  };
}
