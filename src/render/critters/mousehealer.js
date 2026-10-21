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
//   walk    Run (loop). The healer moves at 2.4 u/s, about two body heights a
//           second, which is a trot for a figure this size; the clip's cadence
//           (1.5 strides a second) matches the procedural walk's 1.55 Hz.
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
import { AnimationMixer, Color, Group, LoopOnce, LoopRepeat, MeshToonMaterial, Quaternion, SRGBColorSpace, Vector3 } from 'three';
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

const CLIP_OF = Object.freeze({ idle: 'Idle', walk: 'Run', cast: 'Bolt_1', hurt: 'Hit', downed: 'Death' });
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
const RUN_RATE = 1.05;
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
  const once = (a) => {
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    return a;
  };
  for (const n of ['Hit', 'Death', 'Revive', 'Idle_Look', ...COMBO]) if (actions[n]) once(actions[n]);
  for (const k of Object.values(SKILL_CAST)) if (actions[k.clip]) once(actions[k.clip]);
  for (const n of ['Idle', 'Run']) if (actions[n]) actions[n].setLoop(LoopRepeat, Infinity);
  if (actions.Run) actions.Run.timeScale = RUN_RATE;
  // The sim revives a body at once; the rise is played quick so the healer is
  // on her feet before she can be steered far (~0.85 s, the procedural rise 0.42 s).
  if (actions.Revive) actions.Revive.timeScale = REVIVE_RATE;
  // The fall lands in ~0.75 s (the procedural collapse takes 0.45 s), so a
  // downed healer reads as down while the revive prompt is already up.
  if (actions.Death) actions.Death.timeScale = DEATH_RATE;

  let current = null; // the action playing
  let anim = null; // the game's clip name
  let pending = null; // what to play once the body has risen
  let lookIn = LOOK_EVERY * (0.4 + 0.6 * Math.random());
  let clock = 0;
  let lastShot = -Infinity;
  let hit = 0; // the combo hit last played, 1-3 (0 = none)

  function fadeTo(action, fade, time = 0) {
    if (!action) return;
    action.reset();
    action.time = time;
    action.enabled = true;
    action.setEffectiveWeight(1);
    if (current && current !== action) current.crossFadeTo(action, fade, false);
    action.play();
    current = action;
  }

  function start(name, phase, step) {
    if (name === 'cast') {
      // One shot = one hit. Explicit step from the arena, else the shot clock.
      hit = step >= 1 && step <= 3 ? step : clock - lastShot <= COMBO_WINDOW ? (hit % 3) + 1 : 1;
      lastShot = clock;
      fadeTo(actions[COMBO[hit - 1]], FADE.cast);
      return;
    }
    if (name === 'hurt' || name === 'downed') hit = 0;
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
    fadeTo(actions[k.clip], FADE.cast, k.from);
  }

  mixer.addEventListener('finished', (e) => {
    if (e.action === actions.Revive) {
      const next = pending || 'idle';
      pending = null;
      start(next);
    } else if (e.action === actions.Idle_Look && anim === 'idle') {
      fadeTo(actions.Idle, FADE.look);
    }
  });

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
    mixer.update(dt);
    chinUp(1 - P.collapse);

    // Emitter heat, as healer.js: the halo carries the cast and dims when down.
    const heat = P.gem * (1 - P.desat);
    const gs = (GLOW_BASE * (1 + 1.15 * heat)) / SCALE;
    glow.scale.set(gs, gs, 1);
    glow.material.opacity = (0.34 + 0.62 * heat) * (1 - P.desat);
    const fs = (GLOW_BASE * 0.32 * (1 + 0.9 * heat)) / SCALE;
    flare.scale.set(fs, fs, 1);
    flare.material.opacity = (0.2 + 0.55 * heat) * (1 - P.desat);
  }

  play('idle');

  return {
    clipDriven: true,
    play,
    castSkill,
    tick,
    // Read by tools/mouse-healer-browser.mjs through critters/index.js (harness only).
    clipState: () => ({
      anim,
      clip: current ? current.getClip().name : null,
      time: current ? current.time : 0,
      pending,
      hit,
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
