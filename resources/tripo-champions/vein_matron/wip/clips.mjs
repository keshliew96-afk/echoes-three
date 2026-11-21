// The Vein Matron's moves. Units are model units (the model is 1 tall to the tip of the crown; the page draws her 3.0 u
// tall, CFG.unit). Timings come from the game: VM in src/sim/enemies/champions.js (moves at 1.1 u/s and keeps 2.0 to
// 3.8 u off; Vein Lash: a 58-tick lane up to 7 u long and 1.0 wide at a hero, 13 damage, and she drinks 3 % of her
// health for each hero it cuts, 6 % at most; Heart Pulse: a 70-tick ring of r 2.8 round herself, 14 damage, then eight
// shards all round, the first along her facing, at 4.6 u/s for 7 u, 7 each), CHAMPION_RULES in src/sim/champions.js (a
// 96-tick entrance; rage below half health: cooldowns x0.7, speed x1.15) and the beats in render/facet/beats.js (a frame
// is 1/30 s: strike 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// She has no legs: her gown is a mass of roots spread on the floor. The roots on the floor never move (they go with the
// root), the gown bends above them, and every move is carried by the waist, the arms, the head and the veins. The four
// veins that hang from her hands are cut free (wip/rig.py): the long one from each hand's fingers is her whip.
import * as THREE from 'three';
import { track, V3, smooth, lerp, clamp, addPose, EASE } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'veinmatron', unit: 3.0,
  base: {},
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['skirt1', 'ka'], ['skirt2', 'kb'],
    ['upperarmL', 'ul'], ['forearmL', 'fl'], ['handL', 'wl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'],
    ['whip1L', 'xa'], ['whip2L', 'xb'], ['whip3L', 'xc'], ['whip1R', 'ya'], ['whip2R', 'yb'], ['whip3R', 'yc'],
    ['teth1L', 'ta'], ['teth2L', 'tb'], ['teth1R', 'tc'], ['teth2R', 'td']],
  arms: { AL: { b: ['upperarmL', 'forearmL', 'handL'], pole: [0.9, -0.35, -0.4] }, AR: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.9, -0.35, -0.4] } },
  legs: {},
  springs: [{ bone: 'whip1L', k: 75, c: 6.5, max: 0.25 }, { bone: 'whip2L', k: 58, c: 6, max: 0.32 }, { bone: 'whip3L', k: 46, c: 5.2, max: 0.42 },
    { bone: 'whip1R', k: 73, c: 6.4, max: 0.25 }, { bone: 'whip2R', k: 56, c: 5.9, max: 0.32 }, { bone: 'whip3R', k: 44, c: 5.1, max: 0.42 },
    { bone: 'teth1L', k: 80, c: 6, max: 0.25 }, { bone: 'teth2L', k: 62, c: 5, max: 0.35 }, { bone: 'teth1R', k: 78, c: 6, max: 0.25 }, { bone: 'teth2R', k: 60, c: 5, max: 0.35 }],
};
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const nofeet = () => ({});
// both arms, by hand. out: away from the body, fwd: raised forward, inw: turned in across the body, el: the elbow bent
// more (+), tw: the forearm rolled, hand: the wrist bent forward; L and R can differ ({L:{...}, R:{...}})
const A0 = { out: 0, fwd: 0, inw: 0, el: 0, tw: 0, hand: 0 };
function arms(a) {
  const L = { ...A0, ...(a.L || a) }, R = { ...A0, ...(a.R || a) };
  return { ulr: L.out, ulp: L.fwd, uly: -L.inw, flp: L.el, flr: L.tw, wlp: L.hand, urr: -R.out, urp: R.fwd, ury: R.inw, frp: R.el, frr: -R.tw, wrp: R.hand };
}
const mixA = (a, b, u) => Object.fromEntries(Object.keys(A0).map((k) => [k, lerp(a[k] ?? 0, b[k] ?? 0, u)]));
function armTrack(keys) { // [[t, {out,fwd,..}, ease]]
  return (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; let u = clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0])); u = b[2] ? EASE[b[2]](u) : smooth(u); return mixA({ ...A0, ...a[1] }, { ...A0, ...b[1] }, u); };
}
// the hands closed over the heart (the arms reach for it: w 0..1 hands the arms over to the reach)
const HEART = { L: [0.066, 0.672, 0.136], R: [-0.066, 0.672, 0.136] };
const toHeart = (w, lift = 0) => ({ ALW: w, ALx: HEART.L[0], ALy: HEART.L[1] + lift, ALz: HEART.L[2], ARW: w, ARx: HEART.R[0], ARy: HEART.R[1] + lift, ARz: HEART.R[2] });
// the veins. Each hangs from its hand (the long whip) or its wrist (the short vein); W (0..1) holds it at a heading in
// the room, p: swung forward (+) or back, out: swung out to her side, b2/b3: the whip's lower joints bent forward (+),
// r2/r3: bent out
const VP = { L: ['xa', 'xb', 'xc', 'ta', 'tb'], R: ['ya', 'yb', 'yc', 'tc', 'td'] };
function veins(o = {}) {
  const out = {};
  for (const s of ['L', 'R']) {
    const v = { W: 0.92, p: 0, out: 0, b2: 0, b3: 0, r2: 0, r3: 0, tW: 0.85, tp: 0, tout: 0, ...(o.all || {}), ...(o[s] || {}) }; const sg = s === 'L' ? 1 : -1; const [a, b, c, d, e] = VP[s];
    Object.assign(out, { [a + 'W']: v.W, [a + 'Wp']: v.p, [a + 'Wr']: v.out * sg, [b + 'p']: v.b2, [b + 'r']: v.r2 * sg, [c + 'p']: v.b3, [c + 'r']: v.r3 * sg,
      [d + 'W']: v.tW, [d + 'Wp']: v.tp, [d + 'Wr']: v.tout * sg });
  }
  return out;
}
// The gown stands on its roots: whatever the waist does, its two joints turn back so the bottom of the gown stays level,
// and a drop of the waist is taken up by the upper gown only.
function gown(k, sway = 0, lean = 0) {
  const hp = k.hp || 0, hr = k.hr || 0, hy = k.hy || 0, oy = k.oy || 0;
  return { kap: -0.55 * hp + lean, kbp: -0.45 * hp - lean, kar: -0.55 * hr + sway, kbr: -0.45 * hr - sway * 0.6, kay: -0.5 * hy, kby: -0.5 * hy, kbb: -oy * 0.85 };
}
const REST = {};
const WIDE = { out: 1.35, fwd: 0.25, el: -0.15, hand: -0.3 };

// ------------------------------------------------------------------------------------------------ idle
// 6 s. She stands tall over her roots and breathes slowly; the heart beats (the page lights it); the hands open and
// close a little; the veins sway; the head tilts once and back.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 3, b = Math.sin(w), q = Math.sin(2 * Math.PI * t / 6);
    const k = { oy: 0.003 * b, sp: 0.012 * b, cp: 0.018 * b, np: -0.02 * b, nr: 0.05 * q, cr: -0.012 * q, hr: 0.008 * q };
    return addPose(k, gown(k, 0.012 * q), arms({ L: { out: 0.04 + 0.03 * b, el: 0.06 * Math.sin(w + 0.6), hand: 0.12 * Math.sin(w + 1.2) }, R: { out: 0.04 + 0.03 * b, el: 0.06 * Math.sin(w + 0.9), hand: 0.12 * Math.sin(w + 1.5) } }),
      veins({ L: { p: 0.03 * q, out: 0.03 * Math.sin(w) }, R: { p: -0.03 * q, out: 0.03 * Math.sin(w + 1) } }));
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ glide and turn
// 1.1 u/s. She glides on her roots: the body leans into it and rises and falls once each step of an unseen stride, the
// gown ripples from the waist down, the arms are drawn back and the veins trail behind. 2 s loop.
const walk = {
  dur: 2, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 2, b = Math.sin(w), b2 = Math.sin(2 * w);
    const k = { oy: 0.004 * b2, hp: -0.06, sp: -0.02, cp: 0.02, np: 0.06 + 0.015 * b2, hr: 0.025 * b, cr: -0.02 * b, nr: -0.01 * b, hy: 0.03 * b, cy: -0.05 * b, ny: 0.02 * b };
    return addPose(k, gown(k, 0.02 * Math.sin(w - 0.8), 0.02 * Math.sin(2 * w - 0.6)), arms({ L: { out: 0.13, fwd: -0.24 + 0.05 * b, el: 0.15 }, R: { out: 0.13, fwd: -0.24 - 0.05 * b, el: 0.15 } }),
      veins({ all: { p: -0.32, tp: -0.22 }, L: { out: 0.03 * b, b2: 0.05 * Math.sin(w - 0.7), b3: 0.08 * Math.sin(w - 1.4) }, R: { out: -0.03 * b, b2: 0.05 * Math.sin(w + 2.4), b3: 0.08 * Math.sin(w + 1.7) } }));
  },
  feet: nofeet,
};
const turn = (dir) => ({
  dur: 1.5, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 1.5, b = Math.sin(w);
    const k = { oy: 0.003 * b, hr: -0.04 * dir, cr: -0.03 * dir, hy: 0.06 * dir, sy: 0.06 * dir, cy: 0.1 * dir, ny: 0.16 * dir, np: 0.02 };
    return addPose(k, gown(k, 0.02 * dir), arms({ L: { out: 0.1 + 0.08 * dir, fwd: -0.06 }, R: { out: 0.1 - 0.08 * dir, fwd: -0.06 } }),
      veins({ L: { out: -0.14 * dir, p: -0.05 }, R: { out: 0.14 * dir, p: -0.05 } }));
  },
  feet: nofeet,
});

// ------------------------------------------------------------------------------------------------ Vein Lash
// winds up (the 58-tick lane less one strike: she turns her right shoulder back and raises her right arm high behind her
// head, the whip trailing down her back; the left arm goes out for balance; she holds there and the arm trembles), lash
// (2.5 frames, landing on the lane's tick: the shoulder comes round, the arm cuts forward and down and the whip unrolls
// along the lane and cracks; the page draws the crack running on down the lane), contact held (3 frames), drink (0.25 s:
// she draws the arm back to her side as the stolen life runs up the vein into her heart), settle (0.6 s).
const VL = { rise: 0.45, strike: 58 / 60 - STRIKE, hit: 58 / 60, held: 58 / 60 + HOLD };
VL.rec = VL.held + 0.25; VL.end = VL.held + 0.85;
const veinLash = {
  dur: VL.end, contact: [VL.hit], kinds: ['lash'], cues: { lane: [0, VL.hit], drink: [VL.held, VL.rec + 0.2] },
  phases: [['winds up', 0], ['lash', VL.strike], ['contact held', VL.hit], ['drinks', VL.held], ['settle', VL.rec]],
  springGain: { whip1R: 0, whip2R: 0, whip3R: 0 },
  pose: (t) => {
    const WIND = { sy: -0.1, cy: -0.26, ny: 0.36, cp: 0.06, hp: 0.02, hr: 0.03, cr: 0.03, nr: -0.03, oy: 0.004 };
    const CUT = { sy: 0.11, cy: 0.27, ny: -0.38, cp: -0.12, sp: -0.05, hp: -0.04, hr: -0.02, cr: -0.03, nr: 0.02, oy: -0.006 };
    const k = track([[0, {}], [VL.rise, WIND], [VL.strike, { ...WIND, cy: -0.31, sy: -0.12, ny: 0.43, cp: 0.08 }], [VL.hit, CUT, 'in'], [VL.held, { ...CUT, cy: 0.29, ny: -0.4 }], [VL.rec, { cy: 0.08, sy: 0.03, ny: -0.11, cp: -0.03 }, 'out'], [VL.end, {}]])(t);
    const R = armTrack([[0, REST], [VL.rise, { out: 0.55, fwd: 1.9, el: 1.05, tw: 0.2 }], [VL.strike, { out: 0.5, fwd: 2.45, el: 1.35, tw: 0.25, hand: -0.3 }], [VL.hit, { out: 0.12, fwd: 1.2, el: 0.02, inw: 0.25, hand: 0.25 }, 'in'],
      [VL.held, { out: 0.1, fwd: 1.08, el: 0.0, inw: 0.3, hand: 0.3 }], [VL.rec, { out: 0.18, fwd: 0.45, el: 0.35 }, 'out'], [VL.end, REST]])(t);
    const L = armTrack([[0, REST], [VL.rise, { out: 0.45, fwd: -0.3, el: 0.3 }], [VL.strike, { out: 0.5, fwd: -0.32, el: 0.32 }], [VL.hit, { out: 0.55, fwd: -0.45, el: 0.2 }, 'in'], [VL.rec, { out: 0.3, fwd: -0.2, el: 0.15 }], [VL.end, REST]])(t);
    const trem = pulse(t, VL.rise, VL.rise + 0.1, VL.strike - 0.03, VL.strike) * Math.sin(70 * t);
    // the right whip: hangs down her back while the arm is up, is flung back and up as the arm starts down, unrolls forward
    // and lies straight along the lane at the crack, then drops and hangs again
    const s1 = VL.strike + STRIKE * 0.45;
    const wv = track([[0, { W: 0.92, p: 0, b2: 0, b3: 0 }], [VL.rise, { W: 0.92, p: -0.55, b2: 0.1, b3: 0.1 }], [VL.strike, { W: 0.95, p: -0.75, b2: 0.12, b3: 0.12 }], [s1, { W: 1, p: 0.35, b2: -0.85, b3: -0.7 }],
      [VL.hit, { W: 1, p: 1.42, b2: 0.04, b3: 0.12 }, 'out'], [VL.held, { W: 1, p: 1.36, b2: 0.14, b3: 0.3 }], [VL.rec, { W: 0.95, p: 0.6, b2: 0.35, b3: 0.3 }], [VL.end, { W: 0.92, p: 0, b2: 0, b3: 0 }]])(t);
    return addPose(k, gown(k), arms({ L, R: { ...R, out: R.out + 0.02 * trem, fwd: R.fwd + 0.02 * trem } }),
      veins({ R: { W: clamp(wv.W), p: wv.p, b2: wv.b2, b3: wv.b3, out: 0.05 }, L: { out: 0.12 * smooth(t / VL.rise) * (1 - smooth((t - VL.rec) / 0.4)), p: -0.08 } }));
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ Heart Pulse
// gathers (the 70-tick ring less one strike: she brings both hands to the heart on her breast and bows over it, sinking a
// little into her gown; the heart beats faster and faster and her hands tremble), burst (2.5 frames, landing on the
// ring's tick: she throws her arms wide and arches back, the veins flung out, and the ring bursts from her; the eight
// shards fly), contact held (3 frames), recoil (0.25 s), settle (0.6 s).
const HP = { draw: 0.5, strike: 70 / 60 - STRIKE, hit: 70 / 60, held: 70 / 60 + HOLD };
HP.rec = HP.held + 0.25; HP.end = HP.held + 0.85;
const heartPulse = {
  dur: HP.end, contact: [HP.hit], kinds: ['pulse'], cues: { ring: [0, HP.hit] },
  phases: [['gathers', 0], ['burst', HP.strike], ['contact held', HP.hit], ['recoil', HP.held], ['settle', HP.rec]],
  pose: (t) => {
    const BOW = { oy: -0.014, hp: -0.03, sp: -0.06, cp: -0.12, np: -0.18 }, OPEN = { oy: 0.012, hp: 0.04, sp: 0.07, cp: 0.17, np: 0.2 };
    const k = track([[0, {}], [HP.draw, BOW], [HP.strike, { ...BOW, oy: -0.018, cp: -0.14, np: -0.22 }], [HP.hit, OPEN, 'in'], [HP.held, { ...OPEN, cp: 0.18 }], [HP.rec, { oy: 0.003, cp: 0.04, np: 0.05 }, 'out'], [HP.end, {}]])(t);
    const reach = track([[0, { w: 0 }], [HP.draw, { w: 1 }], [HP.strike, { w: 1 }], [HP.hit, { w: 0 }, 'in'], [HP.end, { w: 0 }]])(t).w;
    const a = armTrack([[0, REST], [HP.draw, { out: 0.2, fwd: 0.5, el: 1.2 }], [HP.strike, { out: 0.2, fwd: 0.5, el: 1.2, hand: 0.3 }], [HP.hit, WIDE, 'in'], [HP.held, { ...WIDE, out: 1.42 }], [HP.rec, { out: 0.55, fwd: 0.1, el: 0.1 }, 'out'], [HP.end, REST]])(t);
    const trem = pulse(t, HP.draw, HP.draw + 0.15, HP.strike - 0.02, HP.strike) * Math.sin(66 * t) * (0.5 + 0.5 * clamp((t - HP.draw) / (HP.strike - HP.draw)));
    const fl = track([[0, { o: 0, p: 0 }], [HP.draw, { o: -0.05, p: 0.12 }], [HP.strike, { o: -0.06, p: 0.14 }], [HP.hit, { o: 1.15, p: 0.15 }, 'out'], [HP.held, { o: 1.25, p: 0.12 }], [HP.rec, { o: 0.4, p: 0.0 }], [HP.end, { o: 0, p: 0 }]])(t);
    const T = toHeart(clamp(reach), 0.004 * trem);
    return addPose(k, gown(k), arms(a), T, veins({ all: { out: fl.o, p: fl.p, W: 0.92 + 0.08 * clamp(fl.o), r2: 0.2 * clamp(fl.o), r3: 0.25 * clamp(fl.o), tout: fl.o * 0.6 } }));
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the glow and a sound)
// gather (she clutches her heart and doubles over it), roar (2.5 frames: she rears up, the arms flung high and wide and
// the head thrown back, the veins whipping out), then she shakes with it and squares up again.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar], kinds: ['roar'], phases: [['gather', 0], ['roar', RG.gather], ['shakes', RG.roar], ['squares up', 1.25]],
  pose: (t) => {
    const IN = { oy: -0.018, hp: -0.05, sp: -0.1, cp: -0.16, np: -0.25 }, UP = { oy: 0.016, hp: 0.05, sp: 0.08, cp: 0.17, np: 0.3 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, UP, 'in'], [1.2, { ...UP, oy: 0.01, np: 0.22 }], [RG.end, {}]])(t);
    const reach = track([[0, { w: 0 }], [RG.gather, { w: 1 }], [RG.roar, { w: 0 }, 'in'], [RG.end, { w: 0 }]])(t).w;
    const a = armTrack([[0, REST], [RG.gather, { out: 0.2, fwd: 0.5, el: 1.2 }], [RG.roar, { out: 2.0, fwd: 0.4, el: 0.2, hand: -0.3 }, 'in'], [1.2, { out: 1.9, fwd: 0.35, el: 0.28 }], [RG.end, REST]])(t);
    const sh = pulse(t, RG.roar, RG.roar + 0.05, 1.1, 1.3) * Math.sin(80 * t);
    const fl = track([[0, { o: 0 }], [RG.gather, { o: -0.04 }], [RG.roar, { o: 1.2 }, 'out'], [1.2, { o: 0.8 }], [RG.end, { o: 0 }]])(t).o;
    return addPose(k, gown(k), arms(a), toHeart(clamp(reach)), { cr: 0.02 * sh, nr: -0.03 * sh },
      veins({ all: { out: fl, W: 0.92 + 0.08 * clamp(fl), r2: 0.25 * clamp(fl), r3: 0.3 * clamp(fl), tout: fl * 0.5 }, L: { b2: 0.15 * sh }, R: { b2: -0.15 * sh } }));
  },
  feet: nofeet,
};
// The enraged state, played on top of anything (spine, chest, head and arms only): drawn up, the hands half raised and
// clawed, trembling.
const rageHold = {
  dur: 0.4, loop: true, upperOnly: true,
  pose: (t) => { const w = 2 * Math.PI * t / 0.4; return addPose({ cp: 0.06, sp: 0.03, np: 0.06 + 0.015 * Math.sin(w), nr: 0.02 * Math.sin(2 * w) }, arms({ out: 0.35 + 0.025 * Math.sin(w), fwd: 0.35, el: 0.55, hand: -0.35 })); },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything: the chest and head flinch back and the arms jolt out.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const e = t < 0.07 ? smooth(t / 0.07) : 1 - smooth((t - 0.07) / 0.35);
    return addPose({ sp: 0.05 * e, cp: 0.13 * e, np: 0.18 * e, nr: 0.06 * e, cr: 0.03 * e }, arms({ out: 0.28 * e, fwd: -0.12 * e, el: 0.2 * e })); },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that would stagger anyone else: her roots hold, so she bends back from the waist like a tree in a gale, the arms
// and veins thrown forward; she whips back past upright, catches herself, the head shakes once and she straightens.
const heavyHit = {
  dur: 1.15, contact: [0, 0.46], kinds: ['hit', 'rebound'], phases: [['bent back', 0], ['whips forward', 0.3], ['catches herself', 0.46], ['straightens', 0.7]],
  pose: (t) => {
    const k = track([[0, {}], [0.12, { oy: -0.008, oz: -0.02, hp: 0.09, sp: 0.1, cp: 0.15, np: 0.22, hr: 0.03 }, 'out'], [0.3, { oy: -0.004, oz: -0.012, hp: 0.04, sp: 0.04, cp: 0.05, np: 0.06 }],
      [0.46, { oy: -0.006, oz: 0.008, hp: -0.04, sp: -0.06, cp: -0.1, np: -0.12 }, 'in'], [0.7, { oz: 0.0, hp: 0.0, cp: 0.01, np: 0.03 }, 'out'], [1.15, {}]])(t);
    const a = armTrack([[0, REST], [0.12, { out: 0.55, fwd: 0.6, el: 0.35 }, 'out'], [0.46, { out: 0.35, fwd: -0.25, el: -0.1 }], [0.75, { out: 0.1, el: 0.08 }], [1.15, REST]])(t);
    const v = track([[0, { p: 0, o: 0 }], [0.12, { p: 0.55, o: 0.2 }, 'out'], [0.46, { p: -0.3, o: 0.05 }], [0.75, { p: 0.08, o: 0 }], [1.15, { p: 0, o: 0 }]])(t);
    const sh = pulse(t, 0.5, 0.58, 0.8, 0.95) * 0.22 * Math.sin((t - 0.5) * 21);
    return addPose(k, gown(k), arms(a), { ny: sh }, veins({ all: { p: v.p, out: v.o, tp: v.p * 0.8, b2: 0.2 * v.p, b3: 0.3 * v.p } }));
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: she grows bowed low over her roots like a
// closed bud, arms hanging and the veins pooled; then she unfurls, rising and opening her arms, lifts her face, and her
// heart takes its first beat (the page lights it and her eyes open).
const SP = { still: 0.3, open: 1.0, hit: 1.0 + STRIKE, end: 1.6 };
const spawn = {
  dur: SP.end, contact: [SP.hit], kinds: ['beat'], scale: (t) => 0.02 + 0.98 * EASE.out(clamp(t / SPAWN)),
  phases: [['grows', 0], ['unfurls', SP.still], ['first heartbeat', SP.open], ['settles', SP.hit]],
  pose: (t) => {
    const BUD = { oy: -0.045, hp: -0.12, sp: -0.25, cp: -0.3, np: -0.42 };
    const k = track([[0, BUD], [SP.still, BUD], [SP.open, { oy: 0.004, hp: 0.02, sp: 0.03, cp: 0.08, np: 0.12 }], [SP.hit, { oy: 0.01, hp: 0.04, sp: 0.06, cp: 0.15, np: 0.2 }, 'in'], [SP.end, {}]])(t);
    const fold = (k.hp || 0) + (k.sp || 0) + (k.cp || 0);
    const a = armTrack([[0, { out: 0.02, el: -0.05 }], [SP.still, { out: 0.02, el: -0.05 }], [SP.open, { out: 0.8, fwd: 0.45, el: 0.35 }], [SP.hit, { out: 1.1, fwd: 0.3, el: 0.1, hand: -0.2 }, 'in'], [SP.end, REST]])(t);
    const a2 = arms(a); a2.ulp += -fold * 0.85 * (1 - smooth((t - SP.still) / (SP.open - SP.still))); a2.urp += -fold * 0.85 * (1 - smooth((t - SP.still) / (SP.open - SP.still)));
    const fl = track([[0, { o: 0 }], [SP.open, { o: 0.4 }], [SP.hit, { o: 0.7 }, 'in'], [SP.end, { o: 0 }]])(t).o;
    return addPose(k, gown(k), a2, veins({ all: { out: fl, W: 0.95, tout: fl * 0.5 } }));
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ death
// The heart cracks: a jolt that arches her back, the arms flung out; the glow goes out of her crown and her eyes; then
// she wilts like a cut flower, sinking a little into her gown and folding forward over her roots, the arms hanging
// and the head bowed to her breast. She ends standing, dead and dark, on her roots.
const D = { jolt: 0.12, sway: 0.5, wilt: 1.0, fold: 2.0, end: 2.8 };
const death = {
  dur: D.end, contact: [0.05, D.fold], kinds: ['crack', 'wilt'], phases: [['the heart cracks', 0], ['sways', D.jolt], ['wilts', D.wilt], ['still', D.fold]],
  pose: (t) => {
    const LAST = { oy: -0.05, hp: -0.12, sp: -0.32, cp: -0.42, np: -0.55, hr: 0.04, sr: 0.05, cr: 0.06, nr: 0.18, ny: 0.12 };
    const k = track([[0, {}], [D.jolt, { oy: 0.01, hp: 0.06, sp: 0.07, cp: 0.15, np: 0.25 }, 'out'], [D.sway, { oy: 0.0, hp: -0.01, cp: 0.02, np: 0.04, hr: -0.02 }],
      [D.wilt, { oy: -0.01, hp: -0.03, sp: -0.06, cp: -0.08, np: -0.12, hr: 0.01 }], [D.fold, LAST, 'io'], [D.fold + 0.15, { ...LAST, cp: -0.43, np: -0.58 }], [D.end, LAST]])(t);
    const fold = (k.hp || 0) + (k.sp || 0) + (k.cp || 0);
    const a = armTrack([[0, REST], [D.jolt, { out: 0.55, fwd: 0.35, el: 0.15 }, 'out'], [D.sway, { out: 0.25, fwd: 0.1 }], [D.wilt, { out: 0.12, el: 0.0 }], [D.fold, { out: 0.06, el: -0.1, hand: 0.3 }], [D.end, { out: 0.06, el: -0.1, hand: 0.35 }]])(t);
    const a2 = arms(a); const hang = smooth((t - D.sway) / (D.fold - D.sway)); a2.ulp += -fold * 0.9 * hang; a2.urp += -fold * 0.9 * hang;
    const v = track([[0, { p: 0, o: 0 }], [D.jolt, { p: 0.25, o: 0.35 }, 'out'], [D.sway, { p: 0.05, o: 0.1 }], [D.fold, { p: 0.1, o: 0.04 }], [D.end, { p: 0.1, o: 0.04 }]])(t);
    return addPose(k, gown(k), a2, veins({ all: { p: v.p, out: v.o, tp: v.p } }));
  },
  feet: nofeet,
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), veinLash, heartPulse, rage, rageHold, hurt, heavyHit, spawn, death };
