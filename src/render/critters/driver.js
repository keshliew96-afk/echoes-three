// Procedural animation driver (BUILD_BRIEF §19.2 — no keyframe assets).
//
// Five named clips write a small generic pose vector each frame; the driver
// blends toward the clip's target and every class maps that vector onto its own
// bones (ears, tail, feet, prop, gem). Phase offsets come from the cosmetic
// stream; clip motion is render-only and never touches sim state.
//
// Two structural rules learned from rejected captures:
//   * The lean is ONE rotation on ONE torso pivot. Head, props and arms are
//     children of that pivot, so a walk lean can never slide the head off the
//     shoulders (the previous rig rotated head and body independently and left
//     a black wedge at the neck).
//   * Every clip must be legible in a SINGLE captured frame. `hurt` therefore
//     snaps in 2 frames and HOLDS the flinch for ~40% of its cycle; `cast`
//     holds both a wind-up and a follow-through; `walk` drives alternating feet
//     as well as bob + lean, so a still frame shows a stride, not a statue.
const TAU = Math.PI * 2;

export const CLIPS = ['idle', 'walk', 'cast', 'hurt', 'downed'];

const easeOut = (k) => 1 - (1 - k) * (1 - k);
const smooth = (k) => k * k * (3 - 2 * k);

// Pose fields (all exponentially blended except collapse/desat, which have
// their own integrators): bob (u) · breathe (y scale) · squash (xz scale) ·
// pitch/roll/yaw (torso rad) · ear/tail (rad) · stride (-1..1 foot phase) ·
// prop (-0.7 wind-up .. 1 release) · gem (emitter heat) · recoil (0..1 body
// shoved back) · collapse/desat (0..1 downed).
function defaultPose() {
  return {
    bob: 0,
    breathe: 1,
    squash: 1,
    pitch: 0,
    roll: 0,
    yaw: 0,
    ear: 0,
    tail: 0,
    stride: 0,
    prop: 0,
    gem: 0.3,
    recoil: 0,
    swing: 0,
    collapse: 0,
    desat: 0,
  };
}

const clipFns = {
  // Idle: visible breathing (±2.4% y-scale, §19.2) + ear/tail sway.
  idle(t, ph, T) {
    const b = Math.sin(TAU * 0.5 * t + ph.a);
    T.breathe = 1 + 0.024 * b;
    T.squash = 1 - 0.012 * b; // volume conservation sells the breath
    T.bob = 0.009 * b;
    T.pitch = 0.01 * b;
    T.roll = 0.014 * Math.sin(TAU * 0.35 * t + ph.b);
    T.yaw = 0.05 * Math.sin(TAU * 0.23 * t + ph.b);
    T.ear = 0.13 * Math.sin(TAU * 0.7 * t + ph.b);
    T.tail = 0.4 * Math.sin(TAU * 0.55 * t + ph.c);
    T.stride = 0;
    T.prop = 0;
    T.recoil = 0;
    T.swing = 0;
    T.gem = 0.3 + 0.15 * Math.sin(TAU * 0.8 * t + ph.c);
  },

  // Walk: stride-driven feet + bouncy hip bob + shoulder counter-rotation.
  // 1.55 Hz gives a ~645 ms bounce that survives a 250 ms capture interval.
  // The LEAN is deliberately small (peak 0.105 rad = 6.0°, and 12.0° once the
  // fox's rest lean is added) — round 3 cranked it to 35-45° and lost every
  // face behind the crown; the motion now lives in bob, roll and yaw instead.
  walk(t, ph, T) {
    const f = 1.55; // stride Hz
    const p = TAU * f * t + ph.a;
    const lift = 0.5 * (1 - Math.cos(2 * p)); // two footfalls per stride cycle
    T.stride = Math.sin(p);
    T.bob = 0.095 * lift;
    T.breathe = 1 + 0.06 * (lift - 0.5); // stretch airborne, squash on impact
    T.squash = 1 - 0.042 * (lift - 0.5);
    T.pitch = 0.07 + 0.035 * Math.sin(2 * p); // §19.2 "~8°" lean toward the move
    T.roll = 0.14 * Math.sin(p);
    T.yaw = 0.2 * Math.sin(p);
    T.ear = 0.34 * Math.sin(p + 0.9);
    T.tail = 0.65 * Math.sin(p);
    T.prop = 0;
    T.recoil = 0;
    T.swing = 0;
    T.gem = 0.3;
  },

  // Cast: anticipation crouch with the prop pulled back and the torso wound
  // AWAY, then a stretch pop with the prop thrust and the torso counter-
  // rotating through, then a held follow-through. Loops, so any seq capture
  // contains both a wind-up and a release pose.
  cast(t, ph, T) {
    const P = 1.5;
    const u = (t % P) / P;
    T.bob = 0;
    T.roll = 0;
    T.stride = 0;
    T.recoil = 0;
    T.tail = 0.22 * Math.sin(TAU * 0.9 * t + ph.c);
    if (u < 0.3) {
      const k = easeOut(u / 0.3); // wind-up (held 450 ms)
      T.breathe = 1 - 0.12 * k;
      T.squash = 1 + 0.08 * k;
      T.pitch = -0.16 * k;
      T.yaw = -0.42 * k;
      T.prop = -1 * k; // full cock-back: blade over the shoulder
      T.gem = 0.35 + 0.35 * k;
      T.ear = -0.28 * k;
      T.swing = 0;
    } else if (u < 0.42) {
      const k = easeOut((u - 0.3) / 0.12); // release pop
      T.breathe = 0.88 + 0.28 * k;
      T.squash = 1.08 - 0.14 * k;
      T.pitch = -0.16 + 0.3 * k;
      T.yaw = -0.42 + 0.72 * k;
      T.prop = -1 + 2 * k;
      T.gem = 1;
      T.ear = -0.28 + 0.5 * k;
      T.swing = 1; // smear/trail is live through the whole release
    } else if (u < 0.78) {
      const k = smooth((u - 0.42) / 0.36); // follow-through hold
      T.breathe = 1.16 - 0.14 * k;
      T.squash = 0.94 + 0.06 * k;
      T.pitch = 0.14 - 0.08 * k;
      T.yaw = 0.3 - 0.22 * k;
      T.prop = 1 - 0.2 * k;
      T.gem = 1 - 0.4 * k;
      T.ear = 0.22 * (1 - k);
      T.swing = Math.max(0, 1 - k * 2.2); // decays over ~250 ms
    } else {
      const k = smooth((u - 0.78) / 0.22); // recover
      T.breathe = 1.02 - 0.02 * k;
      T.squash = 1;
      T.pitch = 0.06 * (1 - k);
      T.yaw = 0.08 * (1 - k);
      T.prop = 0.8 * (1 - k);
      T.gem = 0.6 - 0.3 * k;
      T.ear = 0;
      T.swing = 0;
    }
  },

  // Hurt: 2-frame snap into a deep recoil, then a HELD flinch (~40% of the
  // cycle) so a single captured frame separates it from idle, then recovery.
  // Body rocks back, squashes, ears pin, prop drops, whole rig shoves backward.
  hurt(t, ph, T) {
    const P = 1.5;
    const u = (t % P) / P;
    T.bob = 0;
    T.stride = 0;
    T.swing = 0;
    T.tail = 0.1 * Math.sin(TAU * 1.2 * t + ph.c);
    T.prop = -0.25;
    T.gem = 0.12;
    T.yaw = 0;
    if (u < 0.045) {
      const k = u / 0.045; // snap (2 frames at 60 Hz)
      T.breathe = 1 - 0.19 * k;
      T.squash = 1 + 0.16 * k;
      T.pitch = -0.34 * k;
      T.roll = 0.18 * k;
      T.ear = -0.75 * k;
      T.recoil = k;
    } else if (u < 0.45) {
      const s = (u - 0.045) / 0.405;
      const tremble = 0.03 * Math.sin(TAU * 6 * t);
      T.breathe = 0.81 + 0.03 * s;
      T.squash = 1.16 - 0.03 * s;
      T.pitch = -0.34 + 0.04 * s + tremble; // held flinch
      T.roll = 0.18 - 0.02 * s;
      T.ear = -0.75;
      T.recoil = 1;
    } else if (u < 0.68) {
      const k = smooth((u - 0.45) / 0.23);
      T.breathe = 0.84 + 0.16 * k;
      T.squash = 1.13 - 0.13 * k;
      T.pitch = -0.31 * (1 - k);
      T.roll = 0.16 * (1 - k);
      T.ear = -0.75 + 0.8 * k;
      T.recoil = 1 - k;
    } else {
      T.breathe = 1 + 0.014 * Math.sin(TAU * 1.4 * t);
      T.squash = 1;
      T.pitch = 0;
      T.roll = 0;
      T.ear = 0.05;
      T.recoil = 0;
    }
  },

  // Downed (§10): target is fully collapsed + fully desaturated; the collapse
  // integrator below supplies the fall timing and settle. Shallow slow breath
  // keeps a downed body alive (it can still crawl).
  downed(t, ph, T) {
    T.bob = 0;
    T.breathe = 1 + 0.014 * Math.sin(TAU * 0.35 * t + ph.a);
    T.squash = 1;
    T.pitch = 0;
    T.roll = 0;
    T.yaw = 0;
    T.ear = -0.6;
    T.tail = 0;
    T.stride = 0;
    T.prop = 0;
    T.gem = 0;
    T.recoil = 0;
    T.swing = 0;
    T.collapse = 1;
    T.desat = 1;
  },
};

const BLEND_RATE = 18; // 1/s — snappy enough to keep the hurt snap intact
const FALL_SEC = 0.45; // §10 collapse travel time
const RISE_RATE = 3;

const BLENDED = ['bob', 'breathe', 'squash', 'pitch', 'roll', 'yaw', 'ear', 'tail', 'stride', 'prop', 'gem', 'recoil'];

export function createPoseDriver(cosmetic) {
  const rand = cosmetic ? (a, b) => cosmetic.range(a, b) : (a, b) => a + Math.random() * (b - a);
  const ph = { a: rand(0, TAU), b: rand(0, TAU), c: rand(0, TAU) };
  const pose = defaultPose();
  const target = defaultPose();
  let clip = 'idle';
  let tClip = rand(0, 10); // desync gallery critters
  let downAge = 0;

  // `phase` (seconds into the clip) serves instant actions (§6: press -> fire):
  // the integrated Healer starts `cast` AT the release pop instead of sitting
  // through 450 ms of wind-up after the bolt has already left. Passing a phase
  // also RE-TRIGGERS the same clip (hold-to-repeat fire pops every shot);
  // without one, same-clip calls stay no-ops so per-frame arbitration is free.
  function setAnim(name, phase) {
    if (!clipFns[name] || (name === clip && phase === undefined)) return;
    clip = name;
    tClip = phase ?? 0;
  }

  function update(dt) {
    tClip += dt;
    clipFns[clip](tClip, ph, target);

    // `stride` is a 1.55 Hz carrier; blending it through the same exponential
    // filter as the postural fields would cost ~20% amplitude, so it is copied
    // straight and only cross-faded when the clip changes.
    const k = 1 - Math.exp(-BLEND_RATE * dt);
    for (const f of BLENDED) pose[f] += (target[f] - pose[f]) * k;

    // Collapse: accelerating fall (ease-in) + a small settle bounce; recovery
    // is a quick smooth rise.
    if (target.collapse > 0.5) downAge += dt;
    else downAge = Math.max(0, downAge - RISE_RATE * dt);
    const c = Math.min(1, downAge / FALL_SEC);
    let collapse = c * c; // gravity: slow start, fast landing
    if (downAge > FALL_SEC) {
      const s = downAge - FALL_SEC;
      collapse -= 0.05 * Math.sin(s * 16) * Math.exp(-s * 7); // thud bounce
    }
    // `swing` gates the attack smear: it must snap on with the release frame,
    // so it is copied rather than exponentially blended (an 18/s filter loses
    // ~40% of a 120 ms pulse).
    pose.swing = target.swing;
    pose.collapse = collapse;
    pose.desat += (target.desat - pose.desat) * (1 - Math.exp(-5 * dt));

    return pose;
  }

  return {
    setAnim,
    update,
    get anim() {
      return clip;
    },
    get pose() {
      return pose;
    },
  };
}
