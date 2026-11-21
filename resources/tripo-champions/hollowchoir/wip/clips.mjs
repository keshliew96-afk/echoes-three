// The Hollow Choir's moves. Units are model units (the model is 1 tall; the page draws it 2.8 u tall, CFG.unit).
// Timings come from the game: HC in src/sim/enemies/champions.js (drifts at 1.0 u/s, keeps 3.2 to 5.4 u off and backs
// away; Shard Hymn: a 60-tick cone of r 6 and 28 degrees each side, then five shards 12 degrees apart at 5.4 u/s for
// 8.5 u; Discord: a 72-tick ring of r 3.2 round itself), CHAMPION_RULES in src/sim/champions.js (a 96-tick entrance,
// rage below half health: cooldowns x0.7, speed x1.15) and the beats in render/facet/beats.js (a frame is 1/30 s:
// strike 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// It has no legs and it hovers: nothing is planted, so every move is carried by the float, the arms, the head and the
// trailing pillar. The head is cut free at the neck (wip/rig.py), so it can turn any angle: each of its three faces can
// be brought to the front, and it can spin.
import * as THREE from 'three';
import { track, V3, smooth, lerp, clamp, addPose, EASE } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'hollowchoir', unit: 2.8,
  base: {},
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['upperarmL', 'ul'], ['forearmL', 'fl'], ['handL', 'wl'], ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'],
    ['tail1', 'ta'], ['tail2', 'tb'], ['stoleL', 'kl'], ['stoleR', 'kr'], ['capeB', 'cb'], ['capeB2', 'cc']],
  legs: {},
  springs: [{ bone: 'stoleL', k: 90, c: 6, max: 0.5 }, { bone: 'stoleR', k: 86, c: 5.8, max: 0.5 }, { bone: 'capeB', k: 80, c: 5.5, max: 0.35 }, { bone: 'capeB2', k: 60, c: 4.5, max: 0.5 },
    { bone: 'tail1', k: 60, c: 6, max: 0.2 }, { bone: 'tail2', k: 45, c: 4.5, max: 0.3 }],
};
const HOV = 0.07;                                             // how high the crystals at its foot hang over the floor
const FACE = 1.4;                                             // a side face looks this far round from the front one
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const nofeet = () => ({});
// both arms. out: away from the body, fwd: raised forward, inw: the forearm turned in across the chest, el: the elbow
// bent more (+) or straightened (-), tw: the forearm rolled; L and R can differ ({L:{...}, R:{...}})
const A0 = { out: 0, fwd: 0, inw: 0, el: 0, tw: 0, hand: 0 };
function arms(a) {
  const L = { ...A0, ...(a.L || a) }, R = { ...A0, ...(a.R || a) };
  return { ulr: L.out, ulp: L.fwd, uly: -L.inw, flp: L.el, flr: L.tw, wlp: L.hand, urr: -R.out, urp: R.fwd, ury: R.inw, frp: R.el, frr: -R.tw, wrp: R.hand };
}
const mixA = (a, b, u) => Object.fromEntries(Object.keys(A0).map((k) => [k, lerp(a[k] ?? 0, b[k] ?? 0, u)]));
function armTrack(keys) { // [[t, {out,fwd,..}, ease]]
  return (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; let u = clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0])); u = b[2] ? EASE[b[2]](u) : smooth(u); return mixA({ ...A0, ...a[1] }, { ...A0, ...b[1] }, u); };
}
// the trailing parts: the pillar (ta, tb), the stole's two strips and the cape; + swings forward
const trail = (tail = 0, tip = tail, stole = 0, cape = stole) => ({ tap: tail, tbp: tip, klp: stole, krp: stole, cbp: cape * 0.6, ccp: cape });
const REST = { out: 0, fwd: 0, inw: 0, el: 0 };
const ORANT = { out: 1.35, fwd: 1.25, el: 0.1 };              // arms out to the sides, forearms up, palms to the front
const WIDE = { out: 1.0, fwd: 0.2, el: -0.9 };                // arms thrown out and down, straight
const CROSS = { out: -0.1, fwd: 0.3, inw: 0.95, el: 0.95 };   // forearms crossed on the chest
const CUP = { out: 0.05, fwd: 0.3, inw: 0.6, el: 0.6 };       // hands together before the chest
const CAST = { out: 0.45, fwd: 1.2, el: -1.0 };               // arms thrown forward and apart

// ------------------------------------------------------------------------------------------------ idle
// 6 s. It hangs in the air and hums: a slow rise and fall, the arms breathing open and shut, the pillar swaying under it.
// Each voice takes its turn: the head turns to bring the left face to the front, back, then the right face.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 3, b = Math.sin(w);
    const ny = track([[0, { v: 0 }], [1.0, { v: 0 }], [1.7, { v: -FACE }], [2.7, { v: -FACE }], [3.3, { v: 0 }], [4.0, { v: 0 }], [4.7, { v: FACE }], [5.5, { v: FACE }], [6, { v: 0 }]])(t).v;
    return addPose({ oy: HOV + 0.012 * b, hp: 0.015 * Math.cos(w), cp: 0.02 * b, ny, cy: -0.08 * ny, np: 0.04 * b, hr: 0.012 * Math.sin(w / 2) },
      arms({ out: 0.05 + 0.06 * b, fwd: 0.03 * b, el: 0.05 * b }), trail(0.03 * Math.cos(w), 0.05 * Math.cos(w - 0.6), 0.02 * b), { tar: 0.02 * Math.sin(w / 2), tbr: 0.03 * Math.sin(w / 2 - 0.5) });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ drift and turn
// 1.0 u/s. It leans into the drift, the face held level, the arms swept a little back, and the pillar, the stole and
// the cape trail behind. 2 s loop (one slow rise and fall).
const walk = {
  dur: 2, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 2, b = Math.sin(w);
    return addPose({ oy: HOV + 0.01 * b, hp: -0.15, sp: -0.03, cp: -0.03, np: 0.2 + 0.02 * b, hr: 0.02 * Math.sin(w) },
      arms({ out: 0.16 + 0.03 * b, fwd: -0.28, el: -0.25 }), trail(-0.22 + 0.03 * b, -0.2 + 0.05 * Math.sin(w - 0.7), -0.16 + 0.03 * b, -0.22 + 0.04 * Math.sin(w - 0.5)), { tbr: 0.03 * Math.sin(w - 0.4) });
  },
  feet: nofeet,
};
const turn = (dir) => ({
  dur: 1.5, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 1.5, b = Math.sin(w);
    return addPose({ oy: HOV + 0.008 * b, hr: -0.07 * dir, cr: -0.03 * dir, ny: 0.4 * dir, cy: 0.12 * dir, np: 0.03 },
      arms({ L: { out: 0.1 + 0.1 * dir, fwd: -0.05 }, R: { out: 0.1 - 0.1 * dir, fwd: -0.05 } }), trail(0.02 * b, 0.03 * b, 0.02 * b), { tay: -0.12 * dir, tby: -0.18 * dir, tar: 0.06 * dir, tbr: 0.08 * dir });
  },
  feet: nofeet,
});

// ------------------------------------------------------------------------------------------------ Shard Hymn
// gathers (the 60-tick cone less one strike: it rises and leans back, the hands come together before the chest and the
// front face lifts to sing), cast (2.5 frames, landing on the cone's tick: it lunges and throws both arms forward and
// apart, and five shards fly out in a fan), contact held (3 frames), recoil (0.2 s: it drifts back), settle (0.6 s).
const SH = { cast: 1.0 - STRIKE, hit: 1.0, held: 1.0 + HOLD, rec: 1.0 + HOLD + 0.2, end: 1.0 + HOLD + 0.8 };
const shardHymn = {
  dur: SH.end, contact: [SH.hit], kinds: ['hymn'], cues: { cone: [0, SH.hit] },
  phases: [['gathers', 0], ['cast', SH.cast], ['contact held', SH.hit], ['recoil', SH.held], ['settle', SH.rec]],
  pose: (t) => {
    const UP = { oy: HOV + 0.045, oz: -0.02, hp: 0.13, sp: 0.04, cp: 0.1, np: 0.26 }, OUT = { oy: HOV - 0.015, oz: 0.06, hp: -0.2, sp: -0.06, cp: -0.12, np: 0.02 };
    const k = track([[0, { oy: HOV }], [0.4, UP], [SH.cast, { ...UP, oy: HOV + 0.055, cp: 0.13 }], [SH.hit, OUT, 'in'], [SH.held, { ...OUT, oz: 0.065 }], [SH.rec, { oy: HOV + 0.01, oz: -0.03, hp: 0.05, cp: 0.03, np: 0.05 }, 'out'], [SH.end, { oy: HOV }]])(t);
    const a = armTrack([[0, REST], [0.4, CUP], [SH.cast, { ...CUP, el: 0.7, fwd: 0.22 }], [SH.hit, CAST, 'in'], [SH.held, { ...CAST, out: 0.5 }], [SH.rec, { out: 0.3, fwd: 0.5, el: -0.4 }, 'out'], [SH.end, REST]])(t);
    const trem = pulse(t, 0.4, 0.5, SH.cast - 0.03, SH.cast) * 0.012 * Math.sin(70 * t);
    const tl = track([[0, { a: 0, s: 0 }], [0.4, { a: 0.09, s: 0.1 }], [SH.cast, { a: 0.1, s: 0.12 }], [SH.hit, { a: -0.3, s: -0.25 }, 'in'], [SH.rec, { a: 0.1, s: 0.06 }], [SH.end, { a: 0, s: 0 }]])(t);
    return addPose(k, arms(a), trail(tl.a, tl.a * 1.2, tl.s), { cr: trem, nr: -trem });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ Discord
// winds up (the 72-tick ring less one strike: it rises, the arms come up and out, and the head begins to turn, faster
// and faster, until the three faces blur into one: two full turns), burst (2.5 frames, landing on the ring's tick: the
// head stops dead on the front face, the arms are thrown out and down and the whole body drops), contact held
// (3 frames), recoil (0.2 s), settle (0.6 s).
const DC = { burst: 1.2 - STRIKE, hit: 1.2, held: 1.2 + HOLD, rec: 1.2 + HOLD + 0.2, end: 1.2 + HOLD + 0.8 };
const discord = {
  dur: DC.end, contact: [DC.hit], kinds: ['discord'], cues: { ring: [0, DC.hit] },
  phases: [['winds up', 0], ['burst', DC.burst], ['contact held', DC.hit], ['recoil', DC.held], ['settle', DC.rec]],
  pose: (t) => {
    const u = clamp(t / DC.hit); const spin = 4 * Math.PI * u * u;
    const UP = { oy: HOV + 0.075, hp: 0.06, cp: 0.12, np: 0.1 }, DOWN = { oy: HOV - 0.045, hp: -0.1, sp: -0.05, cp: -0.1, np: -0.12 };
    const k = track([[0, { oy: HOV }], [0.5, { ...UP, oy: HOV + 0.05 }], [DC.burst, UP], [DC.hit, DOWN, 'in'], [DC.held, { ...DOWN, oy: HOV - 0.05 }], [DC.rec, { oy: HOV + 0.015, cp: 0.04 }, 'out'], [DC.end, { oy: HOV }]])(t);
    const a = armTrack([[0, REST], [0.55, { ...ORANT, out: 1.0, fwd: 0.9 }], [DC.burst, ORANT], [DC.hit, WIDE, 'in'], [DC.held, { ...WIDE, out: 1.05 }], [DC.rec, { out: 0.5, fwd: 0.1, el: -0.4 }, 'out'], [DC.end, REST]])(t);
    const trem = pulse(t, 0.5, 0.7, DC.burst - 0.03, DC.burst) * 0.014 * Math.sin(74 * t);
    const wob = t > DC.hit ? 0.12 * Math.exp(-(t - DC.hit) * 5) * Math.sin((t - DC.hit) * 22) : 0;
    const tl = track([[0, { a: 0, s: 0 }], [DC.burst, { a: 0.05, s: 0.1 }], [DC.hit, { a: -0.1, s: 0.35 }, 'in'], [DC.rec, { a: 0.04, s: 0.1 }], [DC.end, { a: 0, s: 0 }]])(t);
    return addPose(k, arms(a), { ny: spin + wob, cy: -0.1 * u * (t < DC.hit ? 1 : 0) * (1 - smooth((t - DC.burst) / STRIKE)), cr: trem, hr: -trem },
      { tap: tl.a, tbp: tl.a, klp: tl.s, krp: tl.s, cbp: -tl.s * 0.6, ccp: -tl.s });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the glow and a sound)
// gather (it folds its arms across its chest, bows and sinks), roar (2.5 frames: it shoots up, the arms thrown wide and
// high, the head back), then each voice screams in turn: the head snaps to the left face, the right face, and back.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar], kinds: ['roar'], phases: [['gather', 0], ['roar', RG.gather], ['the three voices', RG.roar], ['squares up', 1.25]],
  pose: (t) => {
    const IN = { oy: HOV - 0.03, hp: -0.18, sp: -0.06, cp: -0.1, np: -0.3 }, OUT = { oy: HOV + 0.09, hp: 0.1, sp: 0.05, cp: 0.14, np: 0.34 };
    const k = track([[0, { oy: HOV }], [RG.gather, IN], [RG.roar, OUT, 'in'], [1.2, { ...OUT, oy: HOV + 0.07, np: 0.25 }], [RG.end, { oy: HOV }]])(t);
    const a = armTrack([[0, REST], [RG.gather, CROSS], [RG.roar, { ...ORANT, out: 1.5 }, 'in'], [1.2, ORANT], [RG.end, REST]])(t);
    const ny = track([[0, { v: 0 }], [RG.roar + 0.1, { v: 0 }], [RG.roar + 0.2, { v: -FACE }, 'out'], [0.78, { v: -FACE }], [0.88, { v: FACE }, 'out'], [1.08, { v: FACE }], [1.2, { v: 0 }, 'out'], [RG.end, { v: 0 }]])(t).v;
    const sh = pulse(t, RG.roar, RG.roar + 0.05, 1.1, 1.3) * 0.02 * Math.sin(80 * t);
    const tl = track([[0, { a: 0 }], [RG.gather, { a: -0.1 }], [RG.roar, { a: 0.2 }, 'in'], [1.2, { a: 0.05 }], [RG.end, { a: 0 }]])(t).a;
    return addPose(k, arms(a), trail(tl, tl * 1.3, tl * 0.8), { ny, cr: sh, nr: -sh * 1.5, cy: -0.06 * ny });
  },
  feet: nofeet,
};
// The enraged state, played on top of anything (spine, chest, head and arms only): drawn up, the arms half raised, the head twitching from face to face.
const rageHold = {
  dur: 0.4, loop: true, upperOnly: true,
  pose: (t) => { const w = 2 * Math.PI * t / 0.4; return addPose({ oy: HOV, cp: 0.07, sp: 0.03, np: 0.08 + 0.02 * Math.sin(w), ny: 0.1 * Math.sin(w), nr: 0.03 * Math.sin(2 * w) }, arms({ out: 0.4 + 0.03 * Math.sin(w), fwd: 0.25, el: 0.25 })); },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything: the chest and the head flinch away and the arms jolt.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const k = bump(t, 0.07, 0.3) * (t < 0.07 ? 1 : 1) + 0 * t; const e = t < 0.07 ? smooth(t / 0.07) : 1 - smooth((t - 0.07) / 0.35);
    return addPose({ oy: HOV, sp: 0.06 * e, cp: 0.14 * e, np: 0.2 * e, ny: -0.3 * e, nr: 0.08 * e, cy: -0.06 * e }, arms({ out: 0.3 * e, fwd: -0.15 * e, el: 0.2 * e })); },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that staggers it: knocked back through the air with the body tipped back and the pillar swinging forward under
// it, the arms flung up; it dips almost to the floor, catches itself, the head shakes once and it floats back to its place.
const heavyHit = {
  dur: 1.15, contact: [0, 0.46], kinds: ['hit', 'dip'], phases: [['knocked back', 0], ['dips', 0.3], ['catches itself', 0.46], ['floats back', 0.7]],
  pose: (t) => {
    const k = track([[0, { oy: HOV }], [0.12, { oy: HOV + 0.02, oz: -0.07, hp: 0.3, sp: 0.08, cp: 0.12, np: 0.3, hr: 0.05 }, 'out'], [0.3, { oy: HOV - 0.02, oz: -0.11, hp: 0.2, cp: 0.05, np: 0.1 }],
      [0.46, { oy: HOV - 0.05, oz: -0.12, hp: -0.1, cp: -0.08, np: -0.2 }, 'in'], [0.7, { oy: HOV + 0.01, oz: -0.1, hp: 0.0, np: 0.05 }, 'out'], [1.15, { oy: HOV, oz: 0 }]])(t);
    const a = armTrack([[0, REST], [0.12, { out: 1.1, fwd: 0.7, el: 0.2 }, 'out'], [0.46, { out: 0.5, fwd: 0.0, el: -0.5 }], [0.75, { out: 0.2, el: 0.1 }], [1.15, REST]])(t);
    const tl = track([[0, { a: 0 }], [0.14, { a: 0.45 }, 'out'], [0.46, { a: -0.2 }], [0.75, { a: 0.08 }], [1.15, { a: 0 }]])(t).a;
    const sh = pulse(t, 0.5, 0.58, 0.8, 0.95) * 0.3 * Math.sin((t - 0.5) * 21);
    return addPose(k, arms(a), trail(tl, tl * 1.3, tl * 0.7), { ny: sh });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: it grows standing on the floor like a
// crystal, arms folded, the heads bowed; then it lifts off, unfolds its arms, raises its faces and sings its first note.
const SP = { lift: 0.35, note: 1.0, hit: 1.0 + STRIKE, end: 1.6 };
const spawn = {
  dur: SP.end, contact: [SP.hit], kinds: ['note'], scale: (t) => 0.02 + 0.98 * EASE.out(clamp(t / SPAWN)),
  phases: [['grows', 0], ['lifts off', SP.lift], ['first note', SP.note], ['settles', SP.hit]],
  pose: (t) => {
    const k = track([[0, { oy: 0, hp: -0.1, cp: -0.12, np: -0.4 }], [SP.lift, { oy: 0, hp: -0.1, cp: -0.12, np: -0.4 }], [SP.note, { oy: HOV + 0.03, hp: -0.02, cp: 0.0, np: -0.1 }], [SP.hit, { oy: HOV + 0.06, hp: 0.06, cp: 0.12, np: 0.3 }, 'in'], [SP.end, { oy: HOV }]])(t);
    const a = armTrack([[0, CROSS], [SP.lift + 0.1, CROSS], [SP.note, { out: 0.3, fwd: 0.3, inw: 0.2, el: 0.3 }], [SP.hit, { out: 1.0, fwd: 0.7, el: 0.0 }, 'in'], [SP.end, REST]])(t);
    const tl = track([[0, { a: 0 }], [SP.lift, { a: 0 }], [SP.note, { a: -0.06 }], [SP.hit, { a: 0.1 }], [SP.end, { a: 0 }]])(t).a;
    return addPose(k, arms(a), trail(tl, tl, tl));
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ death
// The song breaks. A jolt, the float falters and it drops: the crystals at its foot strike the floor and it stands
// there like a pillar. Then the body sags forward from the waist, the arms fall and hang, and the three faces bow.
// The sag goes to its left and the head rolls onto that shoulder, so it reads as a thing that has gone out, not as a bow.
// It ends as a dead crystal, standing. The glow goes out.
const D = { falter: 0.12, drop: 0.7, land: 1.0, sag: 1.75, end: 2.6 };
const death = {
  dur: D.end, contact: [D.land, D.sag], kinds: ['thud', 'slump'], phases: [['jolt', 0], ['the song breaks', D.falter], ['drops', D.drop], ['lands', D.land], ['sags', D.land + 0.1], ['still', D.sag]],
  pose: (t) => {
    const k = track([[0, { oy: HOV }],
      [0.1, { oy: HOV + 0.015, hp: 0.14, cp: 0.12, np: 0.3, ny: -0.2 }, 'out'],
      [0.4, { oy: HOV - 0.02, hp: -0.03, cp: 0.02, np: 0.05, hr: 0.05, ny: 0.3 }],
      [D.drop, { oy: HOV + 0.005, hp: 0.03, cp: 0.04, np: 0.12, hr: -0.04, ny: -0.15 }],
      [D.land, { oy: 0, hp: -0.03, sp: -0.03, cp: -0.05, np: -0.1 }, 'in'],
      [D.land + 0.12, { oy: 0, hp: -0.05, sp: -0.05, cp: -0.08, np: -0.2 }, 'out'],
      [D.sag, { oy: 0, hp: -0.1, sp: -0.22, cp: -0.27, np: -0.5, ny: 0.5, nr: 0.24, hr: 0.03, sr: 0.07, cr: 0.11, cy: 0.2 }, 'in'],
      [D.sag + 0.15, { oy: 0, hp: -0.09, sp: -0.21, cp: -0.26, np: -0.58, ny: 0.54, nr: 0.27, hr: 0.03, sr: 0.07, cr: 0.115, cy: 0.2 }, 'out'],
      [D.end, { oy: 0, hp: -0.1, sp: -0.22, cp: -0.27, np: -0.6, ny: 0.55, nr: 0.28, hr: 0.03, sr: 0.07, cr: 0.12, cy: 0.2 }]])(t);
    const HANG = { out: 0.04, fwd: 0.0, el: -1.15, inw: 0.0 };
    const HANG_R = { out: 0.16, fwd: -0.12, el: -0.95, inw: 0.0 };   // the body sags to its left, so the right arm hangs a little off the flank and behind
    const side = (L, R) => ({ L, R });
    const aL = armTrack([[0, REST], [0.1, { out: 0.7, fwd: 0.4, el: 0.2 }, 'out'], [0.45, { out: 0.3, fwd: 0.1, el: 0.0 }], [D.drop, { out: 0.45, fwd: 0.2, el: 0.1 }], [D.land, { out: 0.2, fwd: 0.0, el: -0.4 }, 'in'], [D.sag, HANG, 'in'], [D.end, HANG]])(t);
    const aR = armTrack([[0, REST], [0.1, { out: 0.7, fwd: 0.4, el: 0.2 }, 'out'], [0.45, { out: 0.3, fwd: 0.1, el: 0.0 }], [D.drop, { out: 0.45, fwd: 0.2, el: 0.1 }], [D.land, { out: 0.2, fwd: 0.0, el: -0.4 }, 'in'], [D.sag + 0.1, HANG_R, 'in'], [D.end, HANG_R]])(t);
    const a = side(aL, aR);
    const fold = (k.hp || 0) + (k.sp || 0) + (k.cp || 0);       // the hanging arms, the stole and the cape stay upright as the body folds
    const tailUp = -(k.hp || 0);                                // the pillar stands on the floor: it does not swing with the hips
    const wob = t < D.land ? 0.06 * Math.sin(t * 17) * smooth((t - 0.1) / 0.3) : 0;
    const a2 = arms(a); const up = smooth((t - D.land) / (D.sag - D.land)); a2.ulp += -fold * 0.9 * up; a2.urp += -fold * 0.9 * up;
    return addPose(k, a2, { tap: tailUp + wob, tbp: wob * 1.4, tar: -(k.hr || 0), klp: -fold * 0.85, krp: -fold * 0.85, cbp: -fold * 0.5, ccp: -fold * 0.3 });
  },
  feet: nofeet,
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), shardHymn, discord, rage, rageHold, hurt, heavyHit, spawn, death };
