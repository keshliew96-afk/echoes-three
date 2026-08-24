// Procedural animation driver (BUILD_BRIEF §19.2: no keyframe assets).
// Five named clips write a small generic pose vector each frame; the driver
// exponentially blends toward the clip's target (so clip switches are smooth
// and mid-action frames show anticipation/impact, per the reference bar's
// motion check) and each class maps the vector onto its own bones (ears,
// tail, prop, gem). Phase offsets come from the cosmetic stream — clip motion
// is render-only and never touches sim state.
const TAU = Math.PI * 2;

export const CLIPS = ['idle', 'walk', 'cast', 'hurt', 'downed'];

const easeOut = (k) => 1 - (1 - k) * (1 - k);
const smooth = (k) => k * k * (3 - 2 * k);

// Pose fields (all blended): bob (y u) · breathe (y scale) · squash (xz
// scale) · pitch/roll (rad lean) · ear/tail (rad swing) · prop (-0.6..1
// windup->thrust) · gem (0..1 emitter heat) · collapse/desat (0..1 downed).
function defaultPose() {
  return {
    bob: 0,
    breathe: 1,
    squash: 1,
    pitch: 0,
    roll: 0,
    ear: 0,
    tail: 0,
    prop: 0,
    gem: 0.3,
    collapse: 0,
    desat: 0,
  };
}

const clipFns = {
  // Idle: visible breathing (±2% y-scale, §19.2) + ear/tail sway.
  idle(t, ph, T) {
    const b = Math.sin(TAU * 0.5 * t + ph.a);
    T.breathe = 1 + 0.022 * b;
    T.squash = 1 - 0.01 * b; // volume conservation sells the breath
    T.bob = 0.008 * b;
    T.pitch = 0;
    T.roll = 0.012 * Math.sin(TAU * 0.35 * t + ph.b);
    T.ear = 0.11 * Math.sin(TAU * 0.7 * t + ph.b);
    T.tail = 0.35 * Math.sin(TAU * 0.55 * t + ph.c);
    T.prop = 0;
    T.gem = 0.3 + 0.15 * Math.sin(TAU * 0.8 * t + ph.c);
  },

  // Walk: double-bounce bob per stride + forward lean toward the move vector
  // (§19.2 walk bob + lean; the gallery leans toward facing).
  walk(t, ph, T) {
    const f = 2.1; // stride Hz
    T.bob = 0.05 * 0.5 * (1 - Math.cos(TAU * f * t + ph.a));
    T.breathe = 1 + 0.02 * Math.sin(TAU * f * t + ph.a);
    T.squash = 1;
    T.pitch = 0.15 + 0.025 * Math.sin(TAU * f * t + ph.a);
    T.roll = 0.06 * Math.sin(TAU * (f / 2) * t + ph.a);
    T.ear = 0.24 * Math.sin(TAU * f * t + ph.b);
    T.tail = 0.55 * Math.sin(TAU * 0.9 * t + ph.c);
    T.prop = 0;
    T.gem = 0.3;
  },

  // Cast: anticipation crouch + prop pulled back, then a stretch pop with the
  // prop thrust/raised and the emitter flaring, then recovery. Loops so seq
  // captures always contain both the wind-up and the release pose.
  cast(t, ph, T) {
    const P = 1.3;
    const u = (t % P) / P;
    T.bob = 0;
    T.roll = 0;
    T.ear = 0;
    T.tail = 0.2 * Math.sin(TAU * 0.9 * t + ph.c);
    if (u < 0.26) {
      const k = easeOut(u / 0.26); // wind-up
      T.breathe = 1 - 0.11 * k;
      T.squash = 1 + 0.07 * k;
      T.pitch = -0.12 * k;
      T.prop = -0.6 * k;
      T.gem = 0.35 + 0.3 * k;
      T.ear = -0.25 * k;
    } else if (u < 0.4) {
      const k = easeOut((u - 0.26) / 0.14); // release pop
      T.breathe = 0.89 + 0.26 * k;
      T.squash = 1.07 - 0.12 * k;
      T.pitch = -0.12 + 0.26 * k;
      T.prop = -0.6 + 1.6 * k;
      T.gem = 1;
      T.ear = -0.25 + 0.45 * k;
    } else if (u < 0.75) {
      const k = smooth((u - 0.4) / 0.35); // follow-through hold
      T.breathe = 1.15 - 0.13 * k;
      T.squash = 0.95 + 0.05 * k;
      T.pitch = 0.14 - 0.1 * k;
      T.prop = 1 - 0.25 * k;
      T.gem = 1 - 0.35 * k;
      T.ear = 0.2 * (1 - k);
    } else {
      const k = smooth((u - 0.75) / 0.25); // recover
      T.breathe = 1.02 - 0.02 * k;
      T.squash = 1;
      T.pitch = 0.04 * (1 - k);
      T.prop = 0.75 * (1 - k); // settle back to rest
      T.gem = 0.65 - 0.3 * k;
    }
  },

  // Hurt: sharp recoil flinch (rock back, squash, ears pinned), then recover.
  hurt(t, ph, T) {
    const P = 0.9;
    const u = (t % P) / P;
    T.bob = 0;
    T.tail = 0.15 * Math.sin(TAU * 1.2 * t + ph.c);
    T.prop = 0;
    T.gem = 0.2;
    if (u < 0.16) {
      const k = easeOut(u / 0.16);
      T.breathe = 1 - 0.14 * k;
      T.squash = 1 + 0.1 * k;
      T.pitch = -0.3 * k;
      T.roll = 0.1 * k * Math.sin(ph.a);
      T.ear = -0.5 * k;
    } else if (u < 0.55) {
      const k = smooth((u - 0.16) / 0.39);
      T.breathe = 0.86 + 0.16 * k;
      T.squash = 1.1 - 0.1 * k;
      T.pitch = -0.3 * (1 - k);
      T.roll = 0.1 * (1 - k) * Math.sin(ph.a);
      T.ear = -0.5 + 0.55 * k;
    } else {
      T.breathe = 1 + 0.012 * Math.sin(TAU * 1.4 * t);
      T.squash = 1;
      T.pitch = 0;
      T.roll = 0;
      T.ear = 0.05;
    }
  },

  // Downed (§10): the target is fully collapsed + fully desaturated; the
  // driver's collapse integrator below supplies the fall timing/settle.
  // Shallow slow breathing keeps a downed body alive (it can still crawl).
  downed(t, ph, T) {
    T.bob = 0;
    T.breathe = 1 + 0.012 * Math.sin(TAU * 0.35 * t + ph.a);
    T.squash = 1;
    T.pitch = 0;
    T.roll = 0;
    T.ear = -0.55;
    T.tail = 0;
    T.prop = 0;
    T.gem = 0;
    T.collapse = 1;
    T.desat = 1;
  },
};

const BLEND_RATE = 14; // 1/s — snappy but never popping
const FALL_SEC = 0.5; // §10 collapse travel time
const RISE_RATE = 3; // recover from downed faster than real time reversal

export function createPoseDriver(cosmetic) {
  const rand = cosmetic ? (a, b) => cosmetic.range(a, b) : (a, b) => a + Math.random() * (b - a);
  const ph = { a: rand(0, TAU), b: rand(0, TAU), c: rand(0, TAU) };
  const pose = defaultPose();
  const target = defaultPose();
  let clip = 'idle';
  let tClip = rand(0, 10); // desync gallery critters
  let downAge = 0;

  function setAnim(name) {
    if (!clipFns[name] || name === clip) return;
    clip = name;
    tClip = 0;
  }

  function update(dt) {
    tClip += dt;
    clipFns[clip](tClip, ph, target);

    const k = 1 - Math.exp(-BLEND_RATE * dt);
    for (const f of ['bob', 'breathe', 'squash', 'pitch', 'roll', 'ear', 'tail', 'prop', 'gem']) {
      pose[f] += (target[f] - pose[f]) * k;
    }

    // Collapse: accelerating fall (ease-in) + a small settle bounce at the
    // bottom; recovery is a quick smooth rise.
    if (target.collapse > 0.5) downAge += dt;
    else downAge = Math.max(0, downAge - RISE_RATE * dt);
    const c = Math.min(1, downAge / FALL_SEC);
    let collapse = c * c; // gravity: slow start, fast landing
    if (downAge > FALL_SEC) {
      const s = downAge - FALL_SEC;
      collapse -= 0.05 * Math.sin(s * 16) * Math.exp(-s * 7); // thud bounce
    }
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
