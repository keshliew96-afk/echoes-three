// The Tide Caller's new body moves for the ability page, keyed on frames of her passed clips (idle, stream, tsunami, dash, castPoint, castBloom, castPlant, castSweep, slide, hurt, the four left-paw casts ...).
// A key: { t, b: [clip, time] (a passed frame; rest if left out), a: { bone: [x, y, z] } (Euler degree deltas on top, her bones' own axes), h: [x, y, z] hips slide (model units), e: ease into this key }.
export const RCLIPS = {};
// ---- additive gestures, laid over any clip by a card's body(t): each returns { bone: [x, y, z] } deltas
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const win = (t, a, b, fin = 0.1, fout = 0.15) => t < a || t > b ? 0 : Math.min(1, (t - a) / fin, (b - t) / fout);
export const mixA = (...ms) => { const o = {}; for (const m of ms) for (const n in m) { const a = o[n] || [0, 0, 0], b = m[n]; o[n] = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; } return o; };
// the tail cracks on the floor at a heavy release: up, then slapped down hard
export const tailSlap = (t, t0, k = 1) => { const u = bump(t, t0 - 0.12, 0.08) * 1, d = bump(t, t0 + 0.02, 0.06); const v = (-38 * u + 30 * d) * k; return { tail1: [v, 0, 0], tail2: [v * 0.6, 0, 0], tail3: [v * 0.5, 0, 0], tail4: [v * 0.4, 0, 0] }; };
// the shake, her end pose: a ripple from nose to tail, fast and decaying
export const shake = (t, t0, dur = 0.6, k = 1) => { const a = t - t0; if (a < 0 || a > dur) return {}; const e = (1 - a / dur) * k, w = 46; const f = (ph, amp) => amp * e * Math.sin(a * w - ph);
  return { head: [0, f(0, 14), f(0, 10)], chest: [0, f(0.6, 9), f(0.6, 6)], spine: [0, f(1.2, 7), f(1.2, 5)], hips: [0, f(1.8, 5), 0], tail1: [0, f(2.4, 16), 0], tail2: [0, f(3, 18), 0], tail3: [0, f(3.6, 20), 0], tail4: [0, f(4.2, 22), 0], upperarmL: [0, 0, f(1, 12)] }; };
// the coil: her long body winds round the upright staff (a twist down the spine, the tail wrapped round) and unwinds
export const coil = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, (t1 - t0) * 0.6, 0.08) * k; return { hips: [0, 30 * w, 0], spine: [8 * w, 28 * w, 6 * w], chest: [4 * w, 24 * w, 0], head: [-6 * w, -40 * w, 0], tail1: [10 * w, 40 * w, 0], tail2: [0, 35 * w, 0], tail3: [0, 35 * w, 0], tail4: [0, 30 * w, 0] }; };
// a lean back on a planted staff with the tail braced on the floor behind her
export const leanBack = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.15, 0.2) * k; return { spine: [-20 * w, 0, 0], chest: [-10 * w, 0, 0], head: [10 * w, 0, 0], tail1: [-25 * w, 0, 0], tail2: [12 * w, 0, 0], _hips: [0, -0.03 * w, -0.03 * w] }; };
// a crouch (the hips sink: with knees on the page the legs bend)
export const crouch = (t, t0, t1, k = 1, fin = 0.12, fout = 0.2) => { const w = win(t, t0, t1, fin, fout) * k; return { spine: [14 * w, 0, 0], head: [-10 * w, 0, 0], _hips: [0, -0.06 * w, 0.01 * w] }; };
// a turn of the whole trunk (the sweeps come from the trunk: her arms are short)
export const turnTrunk = (t, t0, t1, deg, k = 1) => { const w = win(t, t0, t1, 0.08, 0.15) * k; return { hips: [0, deg * 0.35 * w, 0], spine: [0, deg * 0.35 * w, 0], chest: [0, deg * 0.3 * w, 0], head: [0, -deg * 0.3 * w, 0] }; };
// the head snaps up to watch something rise
export const lookUp = (t, t0, t1, deg = 30) => { const w = win(t, t0, t1, 0.12, 0.2); return { head: [-deg * w, 0, 0], chest: [-deg * 0.3 * w, 0, 0] }; };
// a recoil shiver while she streams
export const shiver = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.08, 0.1) * k; return { chest: [2 * w * Math.sin(t * 61), 0, 1.5 * w * Math.sin(t * 47)], tail3: [0, 10 * w * Math.sin(t * 9), 0], tail4: [0, 14 * w * Math.sin(t * 9 - 1), 0] }; };
// the tuck: curled nose to tail, arms in (a flip in the air)
export const tuck = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.1, 0.12) * k; return { spine: [40 * w, 0, 0], chest: [25 * w, 0, 0], head: [30 * w, 0, 0], tail1: [50 * w, 0, 0], tail2: [30 * w, 0, 0], tail3: [30 * w, 0, 0], tail4: [20 * w, 0, 0], upperarmL: [-40 * w, 0, 0] }; };
// the left paw flung up and out (a call to a friend, a point)
export const pawUp = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.1, 0.18) * k; return { upperarmL: [-70 * w, 0, 30 * w], forearmL: [-20 * w, 0, 0] }; };

// ---- held frames, a little alive (a card holds one while a beam runs, an orb is steered, a wave is ridden)
const breathe = (amp = 1) => (t) => ({ chest: [1.5 * amp * Math.sin(t * 5), 0, 0], tail3: [0, 8 * amp * Math.sin(t * 4), 0], tail4: [0, 12 * amp * Math.sin(t * 4 - 0.8), 0] });
RCLIPS.belly = { T: 2, loop: true, keys: [{ t: 0, b: ['slide', 0.45] }, { t: 2, b: ['slide', 0.45] }], fn: (t) => ({ tail2: [0, 10 * Math.sin(t * 6), 0], tail3: [0, 14 * Math.sin(t * 6 - 0.7), 0], tail4: [0, 18 * Math.sin(t * 6 - 1.4), 0], head: [0, 6 * Math.sin(t * 3), 0] }) };
RCLIPS.surf = { T: 2, loop: true, keys: [{ t: 0, b: ['dash', 0.43] }, { t: 2, b: ['dash', 0.43] }], fn: (t) => ({ spine: [0, 0, 5 * Math.sin(t * 3.2)], chest: [0, 0, 4 * Math.sin(t * 3.2 - 0.5)], tail3: [0, 15 * Math.sin(t * 5), 0], tail4: [0, 20 * Math.sin(t * 5 - 0.8), 0] }) };
RCLIPS.level = { T: 2, loop: true, keys: [{ t: 0, b: ['stream', 0.2] }, { t: 2, b: ['stream', 0.2] }], fn: breathe(1) };
RCLIPS.bloomHold = { T: 2, loop: true, keys: [{ t: 0, b: ['castBloom', 0.62] }, { t: 2, b: ['castBloom', 0.62] }], fn: breathe(1) };
RCLIPS.plantHold = { T: 2, loop: true, keys: [{ t: 0, b: ['castPlant', 0.45] }, { t: 2, b: ['castPlant', 0.45] }], fn: breathe(0.6) };
RCLIPS.pointHold = { T: 2, loop: true, keys: [{ t: 0, b: ['castPoint', 0.5] }, { t: 2, b: ['castPoint', 0.5] }], fn: breathe(0.6) };
RCLIPS.haulHold = { T: 2, loop: true, keys: [{ t: 0, b: ['tsunami', 0.55] }, { t: 2, b: ['tsunami', 0.55] }], fn: breathe(0.8) };
RCLIPS.idleHold = { T: 2, loop: true, keys: [{ t: 0, b: ['idle', 0.2] }, { t: 2, b: ['idle', 0.2] }], fn: breathe(1) };
// the left-paw point at a friend or a spot, held while the stream runs (handPoint at its reach)
RCLIPS.pawHold = { T: 2, loop: true, keys: [{ t: 0, b: ['handPoint', 0.42] }, { t: 2, b: ['handPoint', 0.42] }], fn: breathe(0.6) };
// the float: on her back on her own water, paws on her chest, one beat (the card rolls her root 180)
RCLIPS.float = { T: 2, loop: true, keys: [{ t: 0, b: ['slide', 0.45], a: { upperarmL: [40, 0, 0], head: [-20, 0, 0] } }, { t: 2, b: ['slide', 0.45], a: { upperarmL: [40, 0, 0], head: [-20, 0, 0] } }], fn: (t) => ({ tail3: [0, 10 * Math.sin(t * 2), 0], tail4: [0, 14 * Math.sin(t * 2 - 0.8), 0], spine: [2 * Math.sin(t * 2), 0, 0] }) };
// the flick: a low sidearm flick off the hip (a disc of water skimmed side-on)
RCLIPS.flick = { T: 0.9, keys: [{ t: 0, b: ['idle', 0] }, { t: 0.18, b: ['castSweep', 0.2], a: { spine: [16, 0, 0] }, h: [0, -0.04, 0] }, { t: 0.32, b: ['castSweep', 0.46], a: { spine: [22, 0, 0] }, h: [0, -0.06, 0.02], e: 'in' }, { t: 0.55, b: ['castSweep', 0.62], a: { spine: [12, 0, 0] }, h: [0, -0.04, 0.02] }, { t: 0.9, b: ['idle', 0] }] };
// the nozzle sweep: the staff level like a hose, swept from her right to her left by turning her trunk
RCLIPS.nozzle = { T: 0.9, keys: [{ t: 0, b: ['idle', 0] }, { t: 0.15, b: ['stream', 0.2], a: { hips: [0, -28, 0], spine: [0, -12, 0] } }, { t: 0.45, b: ['stream', 0.2], a: { hips: [0, 30, 0], spine: [0, 16, 0] }, e: 'lin' }, { t: 0.6, b: ['stream', 0.2], a: { hips: [0, 34, 0], spine: [0, 18, 0] } }, { t: 0.9, b: ['idle', 0] }] };
// the whip: wound round the staff, then unwound in one turn of the whole body
RCLIPS.whip = { T: 1.1, keys: [{ t: 0, b: ['idle', 0] }, { t: 0.3, b: ['castSweep', 0.2], a: { hips: [0, -30, 0], spine: [6, -24, 0], chest: [0, -18, 0], tail1: [0, -40, 0], tail2: [0, -30, 0] }, h: [0, -0.03, 0] }, { t: 0.48, b: ['castSweep', 0.46], a: { hips: [0, 20, 0], spine: [0, 16, 0] }, e: 'in' }, { t: 0.7, b: ['castSweep', 0.62] }, { t: 1.1, b: ['idle', 0] }] };
// the planted lean: staff driven in ahead, she leans back on it, tail braced behind
RCLIPS.plantLean = { T: 2, loop: true, keys: [{ t: 0, b: ['castPlant', 0.45], a: { spine: [-20, 0, 0], chest: [-8, 0, 0], head: [8, 0, 0], tail1: [-30, 0, 0], tail2: [10, 0, 0] }, h: [0, -0.02, -0.04] }, { t: 2, b: ['castPlant', 0.45], a: { spine: [-20, 0, 0], chest: [-8, 0, 0], head: [8, 0, 0], tail1: [-30, 0, 0], tail2: [10, 0, 0] }, h: [0, -0.02, -0.04] }], fn: (t) => ({ chest: [2 * Math.sin(t * 31), 0, 1.5 * Math.sin(t * 23)] }) };
// the tuck in the air (a curl nose to tail)
RCLIPS.tuckAir = { T: 2, loop: true, keys: [{ t: 0, b: ['slide', 0.45], a: { spine: [40, 0, 0], chest: [25, 0, 0], head: [30, 0, 0], tail1: [60, 0, 0], tail2: [35, 0, 0], tail3: [35, 0, 0], tail4: [25, 0, 0] } }, { t: 2, b: ['slide', 0.45], a: { spine: [40, 0, 0], chest: [25, 0, 0], head: [30, 0, 0], tail1: [60, 0, 0], tail2: [35, 0, 0], tail3: [35, 0, 0], tail4: [25, 0, 0] } }] };
