// THE [M] BEATS (docs/MODEL_STANDARD.md, VFX_HIT_RULES §6.1). The model
// rules every model standard slice carries, as small pure curves a rig plays
// on its own clock (pose's t, so a held clock holds them):
//
//   B1 anticipation   the sim's telegraph is the wind-up; with no telegraph
//                     (an untelegraphed lunge, a volley) at most 1.5 frames
//   B2 strike         2 to 3 frames, then the contact pose held (HOLD)
//   B3 recoil         a rig-only shove off the hit: 2 frames out, ~8 back
//   B4 kick           the strike starts on the press frame, no ramp
//   B5 settle         into idle with ONE small overshoot, never a plain blend
//   B7 spawn-in       the body grows from the floor in ~7 frames, ~10% over
//   B8 points         named hand / tip / mouth Object3Ds for effects
//   B9 lunge          pull back, lunge past rest, lean in, squash on contact
//
// Units: a "frame" here is a frame of the source videos, 1/30 s.
import { Object3D } from 'three';
import { createTimeline } from './timeline.js';

export const FRAME = 1 / 30;
export const STRIKE_SEC = 2.5 * FRAME; // B2: 2 to 3 frames
export const HOLD_SEC = 3 * FRAME; // B2: the contact pose held
export const GATHER_SEC = 1.5 * FRAME; // B1: the most an untelegraphed move may wind
export const SPAWN_SEC = 7 * FRAME; // B7

const clamp01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);

// B4: the strike leaves on the press frame (a fast-out curve, no ease-in).
export const kick = (k) => {
  const x = clamp01(k);
  return 1 - (1 - x) * (1 - x) * (1 - x);
};

// B5: a settle from 1 to 0 that dips past 0 once (by `over` of the swing,
// ~8%) and comes back, so a heavy body overshoots its rest once.
export function settle(k, over = 0.08) {
  const x = clamp01(k);
  if (x < 0.62) {
    const a = x / 0.62;
    return 1 - (1 + over) * (a * a * (3 - 2 * a));
  }
  const b = (x - 0.62) / 0.38;
  return -over * (1 - b * b * (3 - 2 * b));
}

// B3: a recoil envelope by age (s): out in 2 frames, back over ~8.
export function recoil(age) {
  if (age < 0) return 0;
  if (age < 2 * FRAME) return age / (2 * FRAME);
  const k = (age - 2 * FRAME) / (8 * FRAME);
  return k >= 1 ? 0 : (1 - k) * (1 - k);
}

// B7: the spawn-in grow by age (s): 0 -> 1.1 -> 1 in ~7 frames.
export function spawnGrow(age) {
  if (age <= 0) return 0.001;
  if (age >= SPAWN_SEC) return 1;
  const k = age / SPAWN_SEC;
  if (k < 0.6) {
    const a = k / 0.6;
    return 0.001 + 1.099 * (1 - (1 - a) * (1 - a));
  }
  const b = (k - 0.6) / 0.4;
  return 1.1 - 0.1 * (b * b * (3 - 2 * b));
}

// B9: a melee lunge across one move, k = 0..1 through `pull` (the 3 to 5
// frames before contact), `drive` (into contact) and `back` (2 to 3 frames
// home). Returns { reach } in body widths (-0.38 .. +0.88), { lean } in
// radians toward the target, and { sx, sy } the contact squash.
export function lunge(phase, k) {
  const x = clamp01(k);
  if (phase === 'pull') return { reach: -0.38 * kick(x), lean: -0.06 * x, sx: 1, sy: 1 };
  if (phase === 'drive') {
    const a = kick(x);
    return { reach: -0.38 + 1.26 * a, lean: -0.06 + 0.45 * a, sx: 1 + 0.19 * a * a, sy: 1 - 0.09 * a * a };
  }
  if (phase === 'hold') return { reach: 0.88, lean: 0.39, sx: 1.19, sy: 0.91 };
  // back home in 2 to 3 frames, with the settle's small overshoot
  const s = settle(x, 0.06);
  return { reach: 0.88 * s, lean: 0.39 * s, sx: 1 + 0.19 * Math.max(0, s), sy: 1 - 0.09 * Math.max(0, s) };
}

// B8: named points on a rig. `at` maps a name to [parent, x, y, z]; the
// points ride their parts, so an effect can anchor to a hoof, a jaw or a tip.
export function makePoints(at) {
  const out = {};
  for (const [name, [parent, x, y, z]] of Object.entries(at)) {
    const p = new Object3D();
    p.name = `point:${name}`;
    p.position.set(x, y, z);
    parent.add(p);
    out[name] = p;
  }
  return out;
}

// The lab's Spawn in tab: the same grow, then a beat standing.
export const SPAWN_TIMELINE = createTimeline('spawn', 'Spawn in', [
  { id: 'grow', label: 'grow from the floor', dur: SPAWN_SEC },
  { id: 'stand', label: 'stand', dur: 0.6 },
]);

// A spawn-in clock: the rig calls `age(t, live)` every pose; it restarts
// when a pooled rig is posed afresh (a jump in t or position) and reports
// the grow scale. Turntables and the lab's still poses skip it.
export function createSpawnClock() {
  let born = null;
  return {
    restart(t) {
      born = t;
    },
    clear() {
      born = null;
    },
    scale(t) {
      return born === null ? 1 : spawnGrow(t - born);
    },
    get born() {
      return born;
    },
  };
}
