// The Duskwing's new body moves for the ability page, played on top of his passed clips (idle, run, combo, dash, castPoint, castBloom, castPlant, castSweep, dive, hurt).
// Deltas in Euler degrees XYZ in the parent's frame (his bones have no rest rotation). +x is his left, +y up, +z forward. _hips moves his hips (model units).
// Root travel, jumps, spins, flips and blinks are done by the page (defs.js root keys); these are the body.
const S = (t, T, ph = 0) => Math.sin(2 * Math.PI * (t / T - ph));
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
export const arm = (s, raise = 0, fwd = 0, twist = 0) => ({ ['upperarm' + s]: [twist, (s === 'L' ? -1 : 1) * fwd, (s === 'L' ? 1 : -1) * raise] });
export const wing = (s, open = 0, fwd = 0, tip = 0) => ({ ['hand' + s]: [-fwd, 0, (s === 'L' ? 1 : -1) * open], ['fingers' + s]: [-fwd * 0.4, 0, (s === 'L' ? 1 : -1) * tip] });
export const both = (raise = 0, fwd = 0, twist = 0, open = 0, wfwd = 0, tip = 0) => ({ ...arm('L', raise, fwd, twist), ...arm('R', raise, fwd, twist), ...wing('L', open, wfwd, tip), ...wing('R', open, wfwd, tip) });
export const ears = (droop = 0, fwd = 0) => ({ earL: [fwd, 0, -droop], earR: [fwd, 0, droop] });
const mix = (...a) => Object.assign({}, ...a);

// ---- shared poses
const N0 = {};
const SPREAD = mix({ spine: [-8, 0, 0], chest: [-6, 0, 0], head: [-8, 0, 0], _hips: [0, 0.02, 0] }, arm('L', 72, -18, 0), arm('R', 72, -18, 0), wing('L', 40, 0, 12), wing('R', 40, 0, 12), ears(-6, -10)); // wings thrown wide, the full span
const BLADES = mix({ spine: [6, 0, 0], chest: [2, 0, 0], head: [-8, 0, 0] }, both(86, -4, 62, 4, 0, 4), ears(30, 0));                       // wings rigid and flat like blades (the wheel)
const CURL = mix({ spine: [24, 0, 0], chest: [12, 0, 0], head: [16, 0, 0], _hips: [0, -0.065, 0], legL: [-22, 0, 5], legR: [-22, 0, -5], footL: [10, 0, 0], footR: [10, 0, 0] }, both(4, 38, 0, 8, 30, 0), ears(26, 8));
const TUCK = mix({ spine: [34, 0, 0], chest: [16, 0, 0], head: [20, 0, 0], _hips: [0, -0.02, 0], legL: [-70, 0, 8], legR: [-70, 0, -8], footL: [30, 0, 0], footR: [30, 0, 0] }, both(2, 46, -6, 10, 30, 0), ears(30, 6));
const CROUCH = mix({ spine: [26, 0, 0], chest: [10, 0, 0], head: [-22, 0, 0], _hips: [0, -0.07, 0.02], legL: [-30, 0, 8], legR: [-30, 0, -8], footL: [24, 0, 0], footR: [24, 0, 0] }, both(26, -30, 0, 30, 0, 8), ears(24, -4));
// the cape pose, his end pose (残心): a three-point crouch, one wing swept across his face like a cloak, eyes over the edge
const CAPE = mix({ spine: [30, -10, 0], chest: [10, -8, 0], head: [-20, 14, 0], _hips: [0, -0.085, 0.01], legL: [-44, 0, 10], legR: [-10, 0, -10], footL: [30, 0, 0], footR: [6, 0, 0] },
  arm('R', 34, 74, -30), wing('R', 22, 40, 10), arm('L', 30, -48, 0), wing('L', 52, 0, 16), ears(10, -8));
const FLY = (k = 1) => mix({ spine: [10, 0, 0], chest: [4, 0, 0], head: [-14, 0, 0], legL: [20, 0, 6], legR: [20, 0, -6], footL: [30, 0, 0], footR: [30, 0, 0] }, both(70, -12, 10, 36, 0, 12), ears(30, -4));
const STREAK = mix({ spine: [6, 0, 0], head: [-10, 0, 0], legL: [26, 0, 4], legR: [26, 0, -4], footL: [40, 0, 0], footR: [40, 0, 0] }, both(6, -60, 0, 4, -10, 0), ears(46, 0)); // folded tight, a falling dart
const DART = mix({ spine: [10, 0, 0], chest: [4, 0, 0], head: [-30, 0, 0], legL: [30, 0, 4], legR: [30, 0, -4], footL: [40, 0, 0], footR: [40, 0, 0] }, both(14, -64, 0, 20, 0, 6), ears(44, 0));  // flat lunge, jaws first, wings swept back like a dart
const CHOMP = mix({ spine: [30, 0, 0], chest: [14, 0, 0], head: [-20, 0, 0], _hips: [0, -0.05, 0.1], legL: [-24, 0, 4], legR: [16, 0, -4], footR: [14, 0, 0] }, both(10, -46, 0, 22, 0, 4), ears(34, 0));
const REAR = mix({ spine: [-16, 0, 0], chest: [-10, 0, 0], head: [-20, 0, 0], _hips: [0, 0.03, -0.035], footL: [22, 0, 0], footR: [22, 0, 0] }, both(62, -28, 0, 58, 0, 10), ears(-6, -12));
const OPEN = mix({ spine: [-6, 0, 0], chest: [-4, 0, 0], head: [-8, 0, 0], _hips: [0, -0.035, 0], legL: [-8, 0, 6], legR: [-8, 0, -6] }, both(64, -22, 0, 70, 0, 14), ears(-8, -10)); // out of the dark: wings thrown open
const SETTLE = mix({ spine: [6, 0, 0], _hips: [0, -0.02, 0] }, both(16, -4, 0, 20, 0, 2), ears(4, 0));
// a one-sided claw blow: wound (W) and struck (H); s = the striking side
const WIND = (s, k = 1) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [-6, 14 * sg * k, 0], chest: [-3, 18 * sg * k, 0], head: [-4, -20 * sg, 0], _hips: [0, 0.02, -0.01] }, arm(s, 70, -34, 0), wing(s, 48, 0, 10), arm(o, 20, 0, 0), wing(o, 20, 0, 4), ears(-6, -10)); };
const STRIKE = (s, k = 1) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [18, -14 * sg * k, 0], chest: [8, -20 * sg * k, 0], head: [-14, 20 * sg, 0], _hips: [0.008 * sg, -0.045, 0.06], legL: [-18, 0, 0], legR: [12, 0, 0] }, arm(s, 4, 84, -36), wing(s, 30, 46, 10), arm(o, 44, -30, 0), wing(o, 32, 0, 6), ears(26, 0)); };
const FOLLOW = (s) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [10, -16 * sg, 0], chest: [4, -22 * sg, 0], head: [-6, 22 * sg, 0], _hips: [0.008 * sg, -0.03, 0.05], legL: [-15, 0, 0], legR: [10, 0, 0] }, arm(s, 10, 56, -14), wing(s, 24, 22, 6), arm(o, 30, -20, 0), wing(o, 26, 0, 6), ears(0, -8)); };
// both claws driven down together
const RAISE2 = mix({ spine: [-20, 0, 0], chest: [-10, 0, 0], head: [-20, 0, 0], _hips: [0, 0.05, -0.03], footL: [22, 0, 0], footR: [22, 0, 0] }, both(78, -30, 0, 64, 0, 12), ears(-6, -12));
const SLAM2 = mix({ spine: [34, 0, 0], chest: [16, 0, 0], head: [-34, 0, 0], _hips: [0, -0.07, 0.1], legL: [-26, 0, 4], legR: [-22, 0, -4], footL: [10, 0, 0], footR: [10, 0, 0] }, both(2, 80, -34, 28, 46, 10), ears(34, 0));
const k = (t, p, ease) => (ease ? { t, ease, p } : { t, p });
// a rising claw: down low, the claw drawn back by the hip, then up and through, the body rising off the floor after it
const UPWIND = (s) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [26, 12 * sg, 0], chest: [10, 14 * sg, 0], head: [-24, -12 * sg, 0], _hips: [0, -0.075, -0.01], legL: [-34, 0, 8], legR: [-34, 0, -8], footL: [24, 0, 0], footR: [24, 0, 0] }, arm(s, 22, -46, 20), wing(s, 24, -14, 4), arm(o, 40, 10, 0), wing(o, 30, 0, 6), ears(30, 4)); };
const UPSTRIKE = (s) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [-20, -10 * sg, 0], chest: [-12, -14 * sg, 0], head: [-26, 10 * sg, 0], _hips: [0, 0.05, 0.05], legL: [8, 0, 0], legR: [-6, 0, 0], footL: [26, 0, 0], footR: [20, 0, 0] }, arm(s, 118, 22, 12 * -sg), wing(s, 40, 20, 14), arm(o, 40, -36, 0), wing(o, 44, 0, 10), ears(-10, -14)); };
const UPFOLLOW = (s) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [-10, -8 * sg, 0], chest: [-6, -10 * sg, 0], head: [-16, 8 * sg, 0], _hips: [0, 0.025, 0.04] }, arm(s, 102, 14, 8 * -sg), wing(s, 34, 10, 10), arm(o, 34, -24, 0), wing(o, 36, 0, 8), ears(-2, -10)); };
// a backhand: he turns his shoulder into it, then the claw whips back across the other way
const BHWIND = (s) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [8, -30 * sg, 0], chest: [4, -34 * sg, 0], head: [-8, 34 * sg, 0], _hips: [0, -0.04, 0] }, arm(s, 40, 70, 30), wing(s, 16, 30, 4), arm(o, 50, -30, 0), wing(o, 40, 0, 8), ears(20, 0)); };
const BHSTRIKE = (s) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [14, 26 * sg, 0], chest: [6, 32 * sg, 0], head: [-12, -18 * sg, 0], _hips: [-0.01 * sg, -0.05, 0.05], legL: [-14, 0, 0], legR: [10, 0, 0] }, arm(s, 84, -10, -40), wing(s, 50, 10, 16), arm(o, 30, 30, 0), wing(o, 24, 10, 6), ears(30, 0)); };
const BHFOLLOW = (s) => { const o = s === 'R' ? 'L' : 'R', sg = s === 'R' ? -1 : 1; return mix({ spine: [10, 32 * sg, 0], chest: [4, 36 * sg, 0], head: [-8, -22 * sg, 0], _hips: [-0.01 * sg, -0.035, 0.04] }, arm(s, 76, -24, -30), wing(s, 44, 0, 10), arm(o, 24, 20, 0), wing(o, 22, 6, 6), ears(8, -6)); };
const CLAWFX = (s, t) => { const sg = s === 'R' ? -1 : 1; return mix(wing(s, 0, -18 * bump(t, 0.18, 0.04), 24 * bump(t, 0.2, 0.05)), { head: [0, 8 * sg * bump(t, 0.19, 0.04), 5 * sg * bump(t, 0.2, 0.05)], earL: [0, 0, -12 * bump(t, 0.21, 0.06)], earR: [0, 0, 12 * bump(t, 0.21, 0.06)] }); };

export const RCLIPS = {
  // the cape pose, held (his end pose)
  cape: { T: 1.0, keys: [k(0, SETTLE), k(0.16, CAPE, 'out'), k(1.0, CAPE)], fn: (t) => ({ earL: [0, 0, -6 * bump(t, 0.55, 0.06)], chest: [1.2 * S(t, 1), 0, 0] }) },
  // the wing snap: both wings flare wide with one hard beat
  flare: { T: 0.5, keys: [k(0, N0), k(0.08, mix(CURL, { _hips: [0, -0.04, 0] })), k(0.16, SPREAD, 'out'), k(0.3, mix(SPREAD, both(78, -22, 0, 46, 0, 16))), k(0.5, SPREAD)] },
  spreadHold: { T: 1, keys: [k(0, SPREAD), k(1, SPREAD)], fn: (t) => ({ ...both(4 * S(t, 0.5), 0, 0, 6 * S(t, 0.5, 0.2)) }) },
  curl: { T: 0.4, keys: [k(0, N0), k(0.07, CURL, 'in'), k(0.4, CURL)] },
  emerge: { T: 0.6, keys: [k(0, CURL), k(0.07, OPEN, 'out'), k(0.25, mix(OPEN, { spine: [10, 0, 0], _hips: [0, -0.05, 0.01] })), k(0.6, SETTLE)] },
  // Thousand Claws: he drops low, wings half open as fists; eight jabs left and right; then a jump and both claws drawn down and apart: a cross
  jabs: { T: 1.6, keys: [k(0, N0), k(0.12, mix(CROUCH, { spine: [30, 0, 0] })), k(1.0, mix(CROUCH, { spine: [30, 0, 0] })), k(1.12, RAISE2, 'out'), k(1.24, mix(SLAM2, both(30, 70, -20, 50, 30, 10)), 'in'), k(1.34, SLAM2), k(1.6, CAPE)],
    fn: (t) => { if (t < 0.15 || t > 1.02) return {}; const ph = ((t - 0.15) / 0.11); const i = Math.floor(ph), u = ph - i, s = i % 2 ? 'L' : 'R', jab = Math.sin(Math.PI * Math.min(1, u * 1.6)), sg = s === 'R' ? -1 : 1;
      return mix({ spine: [0, -14 * sg * jab, 0], chest: [0, -12 * sg * jab, 0], head: [0, 10 * sg * jab, 0] }, arm(s, -10 * jab, 70 * jab, -20 * jab), wing(s, 0, 36 * jab, 0)); } },
  // Wing Wheel: wings rigid and flat like blades (the page spins him)
  blades: { T: 1.2, keys: [k(0, N0), k(0.1, mix(CROUCH, both(30, -40, 0, 30))), k(0.2, BLADES, 'out'), k(1.0, BLADES), k(1.2, SETTLE)] },
  // Skyward Rip: a low step in and a rising claw from the floor to over his head; air cuts; roll over and stamp it down with both feet
  rise: { T: 0.5, keys: [k(0, N0), k(0.1, mix(CROUCH, arm('R', 10, -20, 0), wing('R', 20, -10, 0))), k(0.22, mix({ spine: [-24, 20, 0], chest: [-12, 16, 0], head: [-24, -10, 0], _hips: [0, 0.06, 0.04], footL: [30, 0, 0], footR: [30, 0, 0] }, arm('R', 150, 30, -20), wing('R', 40, 30, 10), arm('L', 40, -30, 0), wing('L', 50, 0, 10), ears(-10, -14)), 'out'), k(0.5, mix(FLY(), arm('R', 120, 10, 0)))] },
  airCuts: { T: 0.8, keys: [k(0, FLY()), k(0.8, FLY())], fn: (t) => { const i = Math.min(3, Math.floor(t / 0.2)), u = (t - i * 0.2) / 0.2, s = i % 2 ? 'L' : 'R', sg = s === 'R' ? -1 : 1, e = Math.sin(Math.PI * Math.min(1, u * 1.4));
      return mix({ spine: [10 * e, -16 * sg * e, 0], chest: [6 * e, -10 * sg * e, 0] }, arm(s, -60 * e, 80 * e, -30 * e), wing(s, -20 * e, 40 * e, 0)); } },
  stomp: { T: 0.7, keys: [k(0, FLY()), k(0.18, mix(TUCK, both(60, -20, 0, 50, 0, 10))), k(0.3, mix({ spine: [-10, 0, 0], head: [-20, 0, 0], legL: [-60, 0, 4], legR: [-60, 0, -4], footL: [-30, 0, 0], footR: [-30, 0, 0] }, both(80, -30, 0, 60, 0, 16), ears(40, 0)), 'in'), k(0.45, mix(CROUCH, both(60, -30, 0, 60, 0, 12))), k(0.7, mix(CROUCH, both(60, -30, 0, 60, 0, 12)))] },
  drift: { T: 1.0, keys: [k(0, mix(SPREAD, { legL: [10, 0, 4], legR: [10, 0, -4], footL: [30, 0, 0], footR: [30, 0, 0] })), k(0.8, SPREAD), k(1.0, SETTLE)], fn: (t) => ({ ...both(6 * S(t, 0.6), 0, 0, 8 * S(t, 0.6, 0.15)) }) },
  // Last Bite: ears forward; one flat lunge, jaws first, wings swept back like a dart (the page tips him level)
  dart: { T: 0.7, keys: [k(0, N0), k(0.14, mix(CROUCH, ears(-10, -20))), k(0.24, DART, 'out'), k(0.42, mix(DART, { head: [-40, 0, 0] })), k(0.52, CHOMP), k(0.7, SETTLE)], fn: (t) => ({ head: [0, 8 * bump(t, 0.47, 0.05) * S(t, 0.08), 0] }) },
  lick: { T: 0.9, keys: [k(0, SETTLE), k(0.2, mix(SETTLE, { head: [-10, -18, 12] }, ears(0, -10))), k(0.6, mix(SETTLE, { head: [-6, -10, 6] })), k(0.9, N0)], fn: (t) => ({ earL: [0, 0, -14 * bump(t, 0.35, 0.05)], earR: [0, 0, 14 * bump(t, 0.4, 0.05)] }) },
  // Pounce: a crouch, a high arc with wings spread, he rides it down and mauls left right left right, then both
  pounce: { T: 0.6, keys: [k(0, N0), k(0.14, CROUCH), k(0.26, mix(SPREAD, { legL: [30, 0, 4], legR: [30, 0, -4], footL: [30, 0, 0], footR: [30, 0, 0] }), 'out'), k(0.5, mix(SPREAD, both(80, -10, 0, 50, 0, 16))), k(0.6, mix(CROUCH, both(60, 30, 0, 30, 20)))] },
  maul: { T: 0.9, keys: [k(0, mix(CROUCH, { spine: [36, 0, 0] })), k(0.9, mix(CROUCH, { spine: [36, 0, 0] }))], fn: (t) => { if (t > 0.72) { const e = Math.sin(Math.PI * clamp((t - 0.72) / 0.18)); return mix({ spine: [10 * e, 0, 0] }, both(-30 * e, 70 * e, -20 * e, 0, 30 * e)); }
      const i = Math.floor(t / 0.16), u = (t - i * 0.16) / 0.16, s = i % 2 ? 'L' : 'R', sg = s === 'R' ? -1 : 1, e = Math.sin(Math.PI * Math.min(1, u * 1.5)); return mix({ spine: [6 * e, -14 * sg * e, 0], chest: [0, -10 * sg * e, 0] }, arm(s, -30 * e, 70 * e, -20 * e), wing(s, 0, 40 * e, 0)); } },
  // Crescent Wings: wings spread full, a breath, then clapped shut in front; wings wrapped round him like a cloak
  clap: { T: 1.0, keys: [k(0, N0), k(0.1, mix(CURL, { _hips: [0, -0.03, 0] })), k(0.24, SPREAD, 'out'), k(0.36, mix(SPREAD, both(80, -34, 0, 50, 0, 18), { spine: [-12, 0, 0] })), k(0.44, mix({ spine: [22, 0, 0], chest: [10, 0, 0], head: [-18, 0, 0], _hips: [0, -0.04, 0.05] }, both(40, 86, -24, 30, 40, 10), ears(30, 0)), 'in'),
    k(0.6, mix({ spine: [14, 0, 0], chest: [8, 0, 0], head: [-6, 0, 0], _hips: [0, -0.04, 0.02] }, both(16, 70, -10, 14, 30, 4), ears(20, 4))), k(1.0, mix({ spine: [8, 0, 0], head: [-4, 0, 0] }, both(10, 60, -8, 10, 26, 4), ears(10, 0)))] },
  // flight: a loop of big wing beats (he hangs in the air); dive: folded tight, a falling dart; pull: the snap back up
  fly: { T: 0.5, loop: true, keys: [k(0, FLY()), k(0.5, FLY())], fn: (t, T) => { const s = S(t, T); return mix(both(-26 * s, 0, 0, -18 * s, 0, -12 * S(t, T, 0.12)), { spine: [4 * s, 0, 0], head: [-3 * s, 0, 0], _hips: [0, 0, 0] }); } },
  streak: { T: 0.5, keys: [k(0, STREAK), k(0.5, STREAK)] },
  pull: { T: 0.4, keys: [k(0, STREAK), k(0.12, mix(SPREAD, both(84, -10, 0, 56, 0, 20)), 'out'), k(0.4, FLY())] },
  // the hang: upside down from nothing, wings folded round him (the page turns him over)
  hang: { T: 1, keys: [k(0, mix(CURL, { legL: [10, 0, 4], legR: [10, 0, -4], footL: [-40, 0, 0], footR: [-40, 0, 0], head: [-30, 0, 0] }, ears(-20, 0))), k(1, mix(CURL, { legL: [10, 0, 4], legR: [10, 0, -4], footL: [-40, 0, 0], footR: [-40, 0, 0], head: [-30, 0, 0] }, ears(-20, 0)))], fn: (t) => ({ head: [0, 6 * S(t, 2), 0], earL: [0, 0, 4 * S(t, 1.3)] }) },
  kickUp: { T: 0.4, keys: [k(0, N0), k(0.12, CROUCH), k(0.4, mix(TUCK, { legL: [10, 0, 4], legR: [10, 0, -4], footL: [-40, 0, 0], footR: [-40, 0, 0] }))] },
  // Blood Lance: he bites his own wing claw, draws a thread out between both claws like a bowstring, and throws
  lance: { T: 1.1, keys: [k(0, N0), k(0.16, mix({ spine: [6, 10, 0], head: [10, 30, -10] }, arm('R', 30, 90, -40), wing('R', 10, 30, 0), ears(10, 0))), k(0.26, mix({ spine: [8, 12, 0], head: [12, 34, -12] }, arm('R', 34, 96, -44), wing('R', 10, 30, 0), ears(18, 0))),
    k(0.48, mix({ spine: [-6, -20, 0], chest: [-4, -16, 0], head: [-6, 26, 0] }, arm('R', 60, -40, 0), wing('R', 40, 0, 10), arm('L', 40, 80, -20), wing('L', 20, 30, 0), ears(-6, -10)), 'out'),
    k(0.62, mix({ spine: [-8, -24, 0], chest: [-6, -20, 0], head: [-6, 30, 0] }, arm('R', 64, -50, 0), wing('R', 44, 0, 12), arm('L', 40, 86, -20), wing('L', 20, 30, 0), ears(-8, -12))),
    k(0.7, mix({ spine: [20, 18, 0], chest: [10, 20, 0], head: [-16, -20, 0], _hips: [0, -0.04, 0.06], legL: [-20, 0, 0], legR: [12, 0, 0] }, arm('R', 20, 100, -30), wing('R', 30, 40, 6), arm('L', 50, -40, 0), wing('L', 40, 0, 8), ears(30, 0)), 'in'), k(1.1, SETTLE)] },
  // Blood Spikes: he leaps and drives one claw into the floor
  floorStab: { T: 0.9, keys: [k(0, N0), k(0.1, CROUCH), k(0.24, mix(RAISE2, arm('R', 140, 10, 0)), 'out'), k(0.36, mix({ spine: [50, 0, 0], chest: [20, 0, 0], head: [-40, 0, 0], _hips: [0, -0.09, 0.08], legL: [-50, 0, 10], legR: [-10, 0, -10], footL: [30, 0, 0] }, arm('R', -20, 90, -40), wing('R', 10, 50, 0), arm('L', 60, -40, 0), wing('L', 60, 0, 16), ears(36, 0)), 'in'),
    k(0.7, mix({ spine: [46, 0, 0], chest: [18, 0, 0], head: [-36, 0, 0], _hips: [0, -0.09, 0.08], legL: [-50, 0, 10], legR: [-10, 0, -10], footL: [30, 0, 0] }, arm('R', -20, 90, -40), wing('R', 10, 50, 0), arm('L', 60, -40, 0), wing('L', 60, 0, 16), ears(30, 0))), k(0.9, SETTLE)] },
  // Blood Mist: he wraps his wings shut and comes apart (the page hides him in the mist); out of it in the cape pose
  wrap: { T: 0.5, keys: [k(0, N0), k(0.16, mix(CURL, both(10, 60, -10, 14, 30, 4))), k(0.5, mix(CURL, both(10, 66, -12, 14, 30, 4)))] },
  // Boiling Blood: he rakes his own chest ruff and throws his head back in a silent screech
  boil: { T: 1.0, keys: [k(0, N0), k(0.14, mix({ spine: [10, 0, 0], head: [10, 0, 0] }, arm('R', 50, 70, -40), arm('L', 50, 70, -40), wing('L', 10, 20), wing('R', 10, 20), ears(20, 0))),
    k(0.28, mix({ spine: [16, 0, 0], head: [16, 0, 0] }, arm('R', 0, 40, -20), arm('L', 0, 40, -20), wing('L', 10, 10), wing('R', 10, 10), ears(26, 0)), 'in'),
    k(0.42, mix({ spine: [-24, 0, 0], chest: [-14, 0, 0], head: [-36, 0, 0], _hips: [0, 0.02, -0.02], footL: [20, 0, 0], footR: [20, 0, 0] }, both(70, -36, 0, 60, 0, 16), ears(-30, -16)), 'out'), k(0.75, mix({ spine: [-20, 0, 0], chest: [-12, 0, 0], head: [-30, 0, 0] }, both(66, -34, 0, 56, 0, 14), ears(-26, -14))), k(1.0, SETTLE)],
    fn: (t) => ({ head: [2 * bump(t, 0.55, 0.15) * S(t, 0.06), 0, 0] }) },
  // Blood Moon: he rises slowly with wings spread, then claps them down
  moonRise: { T: 1.6, keys: [k(0, N0), k(0.2, CROUCH), k(0.9, mix(SPREAD, both(82, -20, 0, 50, 0, 16), { spine: [-16, 0, 0], head: [-24, 0, 0], legL: [16, 0, 4], legR: [16, 0, -4], footL: [30, 0, 0], footR: [30, 0, 0] }), 'out'),
    k(1.05, mix(SPREAD, both(90, -30, 0, 56, 0, 20), { spine: [-18, 0, 0], head: [-26, 0, 0], legL: [16, 0, 4], legR: [16, 0, -4] })), k(1.15, mix({ spine: [24, 0, 0], chest: [10, 0, 0], head: [-20, 0, 0], legL: [16, 0, 4], legR: [16, 0, -4] }, both(10, 40, -20, 30, 30, 8), ears(30, 0)), 'in'), k(1.6, SETTLE)],
    fn: (t) => (t > 0.25 && t < 0.95 ? both(6 * S(t, 0.4), 0, 0, 8 * S(t, 0.4, 0.15)) : {}) },
  // Blink Strike: one wing claw driven in from behind, then a look back over his shoulder
  stab: { T: 0.8, keys: [k(0, mix(CURL, arm('R', 50, -40, 0))), k(0.05, mix({ spine: [24, 10, 0], chest: [10, 14, 0], head: [-20, -14, 0], _hips: [0, -0.05, 0.08], legL: [-24, 0, 0], legR: [14, 0, 0] }, arm('R', 10, 96, -40), wing('R', 20, 50, 6), arm('L', 50, -40, 0), wing('L', 50, 0, 12), ears(30, 0)), 'out'),
    k(0.32, mix({ spine: [20, 10, 0], chest: [8, 12, 0], head: [-14, -12, 0], _hips: [0, -0.05, 0.07], legL: [-24, 0, 0], legR: [14, 0, 0] }, arm('R', 10, 92, -40), wing('R', 20, 50, 6), arm('L', 50, -40, 0), wing('L', 50, 0, 12), ears(24, 0))),
    k(0.5, mix({ spine: [8, -10, 0], chest: [2, -16, 0], head: [0, -60, 0] }, arm('R', 30, 20, 0), wing('R', 30, 0, 6), arm('L', 30, -20, 0), wing('L', 30, 0, 8), ears(0, -12))), k(0.8, mix({ spine: [6, -8, 0], head: [0, -50, 0] }, both(16, -4, 0, 20, 0, 2)))] },
  // a back somersault, tucked (Flit; the page turns him over)
  flip: { T: 0.5, keys: [k(0, N0), k(0.08, CROUCH), k(0.16, TUCK, 'out'), k(0.36, TUCK), k(0.46, OPEN, 'out'), k(0.5, OPEN)] },
  // Death Mark: he sinks into the floor (the page lowers him), then stands up out of the foe's shadow with one claw resting on its back
  sink: { T: 0.4, keys: [k(0, N0), k(0.1, CURL), k(0.4, mix(CURL, both(4, 50, -10, 8, 30)))] },
  riseBehind: { T: 1.0, keys: [k(0, mix(CURL, both(4, 50, -10, 8, 30))), k(0.25, mix({ spine: [-10, 0, 0], head: [-14, 0, 0] }, arm('R', 40, 60, -10), wing('R', 30, 20), arm('L', 60, -30, 0), wing('L', 60, 0, 14), ears(-6, -10)), 'out'),
    k(0.4, mix({ spine: [14, 0, 0], head: [-10, 0, 0], _hips: [0, -0.02, 0.04] }, arm('R', 20, 84, -30), wing('R', 20, 40), arm('L', 50, -30, 0), wing('L', 50, 0, 12), ears(20, 0)), 'in'), k(1.0, mix({ spine: [12, 0, 0], head: [-8, 0, 0], _hips: [0, -0.02, 0.04] }, arm('R', 20, 80, -30), wing('R', 20, 40), arm('L', 40, -30, 0), wing('L', 40, 0, 10), ears(10, 0)))] },
  // the dark shade of him, hanging still
  shade: { T: 1, keys: [k(0, N0), k(1, N0)] },
  // a one-sided claw strike (for skills built from single blows)
  // the blow lands, then the body answers it: the wing tip whips past the claw, ears flop, the head snaps after, a small overshoot and a settle
  clawR: { T: 0.55, keys: [k(0, N0), k(0.08, WIND('R')), k(0.15, STRIKE('R'), 'in'), k(0.25, FOLLOW('R')), k(0.36, mix(FOLLOW('R'), { spine: [6, -10, 0], _hips: [0, -0.02, 0.03] })), k(0.55, SETTLE)], fn: (t) => CLAWFX('R', t) },
  clawL: { T: 0.55, keys: [k(0, N0), k(0.08, WIND('L')), k(0.15, STRIKE('L'), 'in'), k(0.25, FOLLOW('L')), k(0.36, mix(FOLLOW('L'), { spine: [6, 10, 0], _hips: [0, -0.02, 0.03] })), k(0.55, SETTLE)], fn: (t) => CLAWFX('L', t) },
  clawUpR: { T: 0.55, keys: [k(0, N0), k(0.08, UPWIND('R')), k(0.15, UPSTRIKE('R'), 'in'), k(0.25, UPFOLLOW('R')), k(0.38, mix(UPFOLLOW('R'), { _hips: [0, 0.01, 0.03] })), k(0.55, SETTLE)], fn: (t) => CLAWFX('R', t) },
  clawUpL: { T: 0.55, keys: [k(0, N0), k(0.08, UPWIND('L')), k(0.15, UPSTRIKE('L'), 'in'), k(0.25, UPFOLLOW('L')), k(0.38, mix(UPFOLLOW('L'), { _hips: [0, 0.01, 0.03] })), k(0.55, SETTLE)], fn: (t) => CLAWFX('L', t) },
  clawBackR: { T: 0.55, keys: [k(0, N0), k(0.08, BHWIND('R')), k(0.15, BHSTRIKE('R'), 'in'), k(0.25, BHFOLLOW('R')), k(0.38, mix(BHFOLLOW('R'), { spine: [6, -20, 0] })), k(0.55, SETTLE)], fn: (t) => CLAWFX('R', t) },
  clawBackL: { T: 0.55, keys: [k(0, N0), k(0.08, BHWIND('L')), k(0.15, BHSTRIKE('L'), 'in'), k(0.25, BHFOLLOW('L')), k(0.38, mix(BHFOLLOW('L'), { spine: [6, 20, 0] })), k(0.55, SETTLE)], fn: (t) => CLAWFX('L', t) },
  clawBoth: { T: 0.7, keys: [k(0, N0), k(0.05, mix(CROUCH, both(20, -20, 0, 20))), k(0.12, RAISE2, 'out'), k(0.2, SLAM2, 'in'), k(0.32, mix(SLAM2, { spine: [28, 0, 0] })), k(0.46, mix(SLAM2, { spine: [22, 0, 0], _hips: [0, -0.05, 0.08] })), k(0.7, SETTLE)],
    fn: (t) => mix(wing('L', 0, -16 * bump(t, 0.24, 0.05), 22 * bump(t, 0.26, 0.06)), wing('R', 0, -16 * bump(t, 0.24, 0.05), 22 * bump(t, 0.26, 0.06)), { head: [10 * bump(t, 0.23, 0.04), 0, 0], earL: [0, 0, -16 * bump(t, 0.25, 0.06)], earR: [0, 0, 16 * bump(t, 0.25, 0.06)] }) },
  // Open Vein: one wing claw drawn slowly back, then a single fast line across the foe
  vein: { T: 1.0, keys: [k(0, N0), k(0.36, mix(WIND('R', 1.4), arm('R', 76, -50, 0), { head: [-6, 10, 0] }, ears(-10, -16))), k(0.44, mix(STRIKE('R', 1.3), arm('R', 0, 96, -40)), 'in'), k(0.6, mix(FOLLOW('R'), arm('R', 6, 70, -20))), k(1.0, SETTLE)] },
  // Night Wings passive: a slow constant beat of the wings while he walks
  beat: { T: 0.6, loop: true, keys: [k(0, mix(SETTLE, both(30, -10, 0, 30, 0, 8))), k(0.6, mix(SETTLE, both(30, -10, 0, 30, 0, 8)))], fn: (t, T) => both(14 * S(t, T), 0, 0, 10 * S(t, T, 0.12)) },
  // Echo screech held a little longer than the passed cast: the shout
  standFace: { T: 1, keys: [k(0, mix(N0, ears(-8, -14))), k(1, mix(N0, ears(-8, -14)))] },
};
function clamp(x, a = 0, b = 1) { return Math.min(b, Math.max(a, x)); }
