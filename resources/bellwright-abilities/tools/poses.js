// The Bellwright's new body moves for the ability page, keyed on frames of her passed clips (idle, combo, combo3, castPoint,
// castBloom, castPlant, castSweep, hop, dash, wave, hurt, downFall, downLie ...). Her arms reach about 16 cm: big moves come from
// her whole round body (the rock), her wing cases, her antennae and the bells, not from her arms.
// A key: { t, b: [clip, time], a: { bone: [x, y, z] } (degree deltas, her bones' own axes), h: [x, y, z] hips slide, e: ease into it }.
// Her axes: upperarmR x- lifts the mallet forward and up, z- takes it out to her right side; capes z (L+, R-) flare the wing cases;
// spine / hips z tips her to her right; bell z swings her back bell; head z tilts her head.
export const RCLIPS = {};
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const win = (t, a, b, fin = 0.1, fout = 0.15) => t < a || t > b ? 0 : Math.min(1, (t - a) / fin, (b - t) / fout);
export const mixA = (...ms) => { const o = {}; for (const m of ms) for (const n in m) { const a = o[n] || [0, 0, 0], b = m[n]; o[n] = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; } return o; };
// the rock: from foot to foot, her back bell swinging the other way and ringing (her way to ring herself)
export const rock = (t, t0, n = 3, per = 0.24, k = 1) => { let v = 0; for (let i = 0; i < n; i++) v += (i % 2 ? -1 : 1) * bump(t, t0 + i * per, per * 0.42); v *= k;
  return { hips: [0, 0, 7 * v], spine: [0, 0, 9 * v], chest: [0, 0, 5 * v], head: [0, 0, -8 * v], bell: [0, 0, -30 * v], pole: [0, 0, -4 * v], _hips: [0.012 * v, -0.008 * Math.abs(v), 0] }; };
// a slow rock held over a span (Midnight, Peal held): amp grows with g(t) 0..1
export const rockSlow = (t, t0, t1, per = 0.25, amp = 1) => { const w = win(t, t0, t1, 0.15, 0.25) * amp; const v = Math.sin((t - t0) / per * Math.PI) * w;
  return { hips: [0, 0, 7 * v], spine: [0, 0, 9 * v], chest: [0, 0, 4 * v], head: [0, 0, -7 * v], bell: [0, 0, -28 * v], _hips: [0.012 * v, -0.006 * Math.abs(v), 0] }; };
// the baton: the mallet held upright before her face, a conductor's cue
export const baton = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.12, 0.18) * k; return { upperarmR: [-62 * w, 0, 14 * w], forearmR: [-34 * w, 0, 0], handR: [24 * w, 0, 0], head: [-6 * w, 0, 0] }; };
// a baton beat inside a held baton: a small lift, then a sharp drop at tb
export const beat = (t, tb, k = 1) => { const up = bump(t, tb - 0.1, 0.07), dn = bump(t, tb + 0.02, 0.05); const v = (-16 * up + 18 * dn) * k; return { upperarmR: [v, 0, 0], forearmR: [v * 0.6, 0, 0], spine: [v * 0.15, 0, 0], antL: [v * 0.8, 0, 0], antR: [v * 0.8, 0, 0] }; };
// the conductor's strokes, left to right across her front
export const conduct = (t, t0, t1, n = 8, k = 1) => { const w = win(t, t0, t1, 0.15, 0.2) * k; const u = (t - t0) / (t1 - t0) * n; const s = Math.sin(u * Math.PI);
  return { upperarmR: [(-55 - 12 * Math.abs(s)) * w, (-28 + 56 * ((u % 1))) * w * 0.6, 10 * w], forearmR: [-30 * w, 0, 0], chest: [0, (-10 + 20 * ((u % 1))) * w, 0], hips: [0, 0, 4 * s * w] }; };
// the listen: head tilted, one antenna cocked toward the bell (her end pose after a ringing skill)
export const listen = (t, t0, t1, side = 1) => { const w = win(t, t0, t1, 0.18, 0.25); return { head: [4 * w, 6 * side * w, 14 * side * w], antR: [-26 * w, 0, -10 * w], antL: [8 * w, 0, 0] }; };
// the wing cases flared wide (a big skill), or open a little for a lift
export const flare = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.12, 0.2) * k; return { capeL: [-14 * w, 0, 46 * w], capeR: [-14 * w, 0, -46 * w] }; };
// the wing cases clap shut hard (Click)
export const clap = (t, t0) => { const o = bump(t, t0 - 0.12, 0.08), c = bump(t, t0 + 0.02, 0.04); return { capeL: [-10 * o, 0, 40 * o - 8 * c], capeR: [-10 * o, 0, -40 * o + 8 * c], spine: [18 * c, 0, 0] }; };
// a small bow of the head (after a Tune)
export const nod = (t, t0, k = 1) => { const v = bump(t, t0, 0.12) * k; return { head: [16 * v, 0, 0], chest: [6 * v, 0, 0], antL: [12 * v, 0, 0], antR: [12 * v, 0, 0] }; };
export const crouch = (t, t0, t1, k = 1, fin = 0.12, fout = 0.2) => { const w = win(t, t0, t1, fin, fout) * k; return { spine: [12 * w, 0, 0], head: [-8 * w, 0, 0], _hips: [0, -0.05 * w, 0.01 * w] }; };
export const onToes = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.15, 0.2) * k; return { _hips: [0, 0.035 * w, 0], spine: [-8 * w, 0, 0], head: [-10 * w, 0, 0], footL: [22 * w, 0, 0], footR: [22 * w, 0, 0] }; };
export const turnTrunk = (t, t0, t1, deg, k = 1) => { const w = win(t, t0, t1, 0.08, 0.15) * k; return { hips: [0, deg * 0.35 * w, 0], spine: [0, deg * 0.35 * w, 0], chest: [0, deg * 0.3 * w, 0], head: [0, -deg * 0.25 * w, 0] }; };
export const lookUp = (t, t0, t1, deg = 30) => { const w = win(t, t0, t1, 0.12, 0.2); return { head: [-deg * w, 0, 0], chest: [-deg * 0.3 * w, 0, 0], antL: [-deg * 0.6 * w, 0, 0], antR: [-deg * 0.6 * w, 0, 0] }; };
// the antennae keep time: both flick forward on each beat
export const antFlick = (t, beats, k = 1) => { let v = 0; for (const b of beats) v += bump(t, b + 0.03, 0.05); v *= k; return { antL: [-28 * v, 0, 0], antR: [-28 * v, 0, 0] }; };
export const antQuiver = (t, t0, t1) => { const w = win(t, t0, t1, 0.05, 0.1); const q = Math.sin(t * 70) * 9 * w; return { antL: [q, 0, q * 0.5], antR: [-q, 0, q * 0.5] }; };
export const antDroop = (t, t0, t1) => { const w = win(t, t0, t1, 0.12, 0.2); return { antL: [36 * w, 0, 14 * w], antR: [36 * w, 0, -14 * w] }; };
export const antUp = (t, t0, t1) => { const w = win(t, t0, t1, 0.08, 0.2); return { antL: [-34 * w, 0, -8 * w], antR: [-34 * w, 0, 8 * w] }; };
// one antenna curls and twirls like a finger beside her head (Earworm)
export const antCurl = (t, t0, t1) => { const w = win(t, t0, t1, 0.1, 0.2); const a = (t - t0) * 14; return { antR: [(-30 + 18 * Math.sin(a)) * w, 0, (-10 + 22 * Math.cos(a)) * w], head: [0, 0, -8 * w] }; };
// a knock on her own shell with the mallet's butt, on each of `times`
export const knock = (t, t0, t1, times) => { const w = win(t, t0, t1, 0.15, 0.2); let v = 0; for (const b of times) v += bump(t, b, 0.05); return { upperarmR: [(-20 - 8 * v) * w, (38 + 10 * v) * w, (34 + 6 * v) * w], forearmR: [(-50 - 14 * v) * w, 0, 0], handR: [(60) * w, 0, 0], spine: [5 * v, 0, 0], head: [-6 * w + 6 * v, 0, -6 * w] }; };
// an underhand toss from low on her right, up and out at t0
export const toss = (t, t0, k = 1) => { const back = bump(t, t0 - 0.16, 0.08), fw = bump(t, t0 + 0.02, 0.08); return { upperarmR: [(30 * back - 60 * fw) * k, 0, 8 * back * k], forearmR: [-20 * fw * k, 0, 0], spine: [8 * back * k - 6 * fw * k, 0, 0], antL: [-14 * fw, 0, 0], antR: [-14 * fw, 0, 0] }; };
// the left paw held out flat: "stay" (Golden Bell), or a point at a friend
export const pawOut = (t, t0, t1, k = 1) => { const w = win(t, t0, t1, 0.12, 0.2) * k; return { upperarmL: [-78 * w, 0, -8 * w], forearmL: [-12 * w, 0, 0], handL: [-30 * w, 0, 0] }; };
// quick taps on her own shell, every `per` s (Allegro: twice as fast)
export const tapTime = (t, t0, t1, per) => { const w = win(t, t0, t1, 0.12, 0.2); const ph = ((t - t0) % per) / per; const v = Math.exp(-ph * 9) * w; return { upperarmR: [(-30 - 14 * v) * w, 30 * w, 28 * w], forearmR: [(-46 + 22 * v) * w, 0, 0], antL: [-16 * v, 0, 0], antR: [-16 * v, 0, 0] }; };
// the shoulder push: she sets her shoulder to a bell and shoves at t0
export const shove = (t, t0) => { const set = win(t, t0 - 0.3, t0 + 0.05, 0.15, 0.05), push = bump(t, t0 + 0.06, 0.07); return { spine: [20 * set + 10 * push, -18 * set, 0], chest: [8 * set, -10 * set, 0], upperarmL: [-40 * set, 0, 0], _hips: [0, -0.03 * set, 0.03 * push] }; };
// the floor circle: the mallet held low, drawn round once in front of her
export const floorCircle = (t, t0, t1) => { const w = win(t, t0, t1, 0.12, 0.2); const a = clamp01((t - t0) / (t1 - t0)) * 6.283; return { upperarmR: [(-30 + 14 * Math.sin(a)) * w, 30 * Math.cos(a) * w, 0], spine: [22 * w, 8 * Math.cos(a) * w, 0], head: [12 * w, 0, 0], _hips: [0, -0.03 * w, 0] }; };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
// sitting back on her pack for a beat (after a big skill), from the passed downed sit
// the drum: fast small strokes (the passed drum of hit 3), held as long as the card wants
RCLIPS.drumHold = { T: 0.2, loop: true, keys: [{ t: 0, b: ['combo', 0.92] }, { t: 0.1, b: ['combo', 0.97] }, { t: 0.2, b: ['combo', 0.92] }] };
RCLIPS.batonHold = { T: 2, loop: true, keys: [{ t: 0, b: ['idle', 0.4], a: { upperarmR: [-62, 0, 14], forearmR: [-34, 0, 0], handR: [24, 0, 0] } }, { t: 2, b: ['idle', 0.4], a: { upperarmR: [-62, 0, 14], forearmR: [-34, 0, 0], handR: [24, 0, 0] } }], fn: (t) => ({ chest: [1.5 * Math.sin(t * 5), 0, 0], antL: [5 * Math.sin(t * 4), 0, 0], antR: [5 * Math.sin(t * 4 + 1), 0, 0] }) };
RCLIPS.bloomHold = { T: 2, loop: true, keys: [{ t: 0, b: ['castBloom', 0.62] }, { t: 2, b: ['castBloom', 0.62] }], fn: (t) => ({ chest: [1.5 * Math.sin(t * 5), 0, 0] }) };
RCLIPS.sit = { T: 2, loop: true, keys: [{ t: 0, b: ['downLie', 0.5] }, { t: 2, b: ['downLie', 0.5] }] };
RCLIPS.sitDown = { T: 1.3, keys: [{ t: 0, b: ['idle', 0] }, { t: 0.3, b: ['downFall', 0.5], e: 'in' }, { t: 0.7, b: ['downLie', 0.5] }, { t: 1.3, b: ['idle', 0] }] };
RCLIPS.idleHold = { T: 2, loop: true, keys: [{ t: 0, b: ['idle', 0.2] }, { t: 2, b: ['idle', 0.2] }], fn: (t) => ({ chest: [1.5 * Math.sin(t * 5), 0, 0] }) };
// the walk behind something, tapping time (Parade): the passed walk with the baton up
RCLIPS.walkBaton = { T: 0.64, loop: true, keys: [{ t: 0, b: ['walk', 0], a: { upperarmR: [-55, 0, 10], forearmR: [-30, 0, 0] } }, { t: 0.32, b: ['walk', 0.32], a: { upperarmR: [-60, 0, 10], forearmR: [-34, 0, 0] } }, { t: 0.64, b: ['walk', 0.64], a: { upperarmR: [-55, 0, 10], forearmR: [-30, 0, 0] } }] };
// tucked tight, wing cases shut (a flip in the air, Click)
RCLIPS.tuck = { T: 2, loop: true, keys: [{ t: 0, b: ['downFall', 0.3], a: { spine: [30, 0, 0], chest: [18, 0, 0], head: [20, 0, 0], capeL: [0, 0, -6], capeR: [0, 0, 6] } }, { t: 2, b: ['downFall', 0.3], a: { spine: [30, 0, 0], chest: [18, 0, 0], head: [20, 0, 0], capeL: [0, 0, -6], capeR: [0, 0, 6] } }] };
// the open-winged glide (a hop held in the air)
RCLIPS.glide = { T: 2, loop: true, keys: [{ t: 0, b: ['hop', 0.4] }, { t: 2, b: ['hop', 0.4] }], fn: (t) => ({ capeL: [0, 0, 6 * Math.sin(t * 18)], capeR: [0, 0, -6 * Math.sin(t * 18)] }) };
