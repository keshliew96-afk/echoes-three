// The Bell Abbess's moves. Units are model units (the model is 1 tall to the top of the crozier; the page draws her 3.15 u
// tall, CFG.unit). Timings come from the game: BA in src/sim/enemies/champions.js (moves at 1.1 u/s and keeps 2.2 to
// 4.4 u off; Rope Swing: a 66-tick lane 1.2 wide at a hero 2.4 to 7.5 u off, running 1.2 u past them; she stands through
// half the warning, rides the rope up in an arc and has dropped at the lane's end by 92 % of it, 14 damage and a 1.6 u
// knock aside; Vesper Peal: a 60-tick cone of r 4.4 and 36 degrees each side, 11 damage and a 55 % slow for 1.2 s),
// render/enemies/champions2.js (the arc is 1.1 u high at its top), CHAMPION_RULES in src/sim/champions.js (a 96-tick
// entrance; rage below half health: cooldowns x0.7, speed x1.15) and the beats in render/facet/beats.js (a frame is
// 1/30 s: strike 2.5 frames, contact held 3 frames, spawn grow 7 frames).
// She has no legs: she stands on a round plinth like a saint's statue, and the plinth never moves (it goes with the
// root). Her habit bends above it, and every move is carried by the waist, the arms, the head, the crozier and its bell.
// The crozier is cut free (wip/rig.py): it rides in her right fist on its own joint, and the bell swings in its crook.
// The page lifts her and carries her down the lane on the rope (the game's arc), and draws the rope.
import * as THREE from 'three';
import { track, V3, smooth, lerp, clamp, addPose, EASE } from '../kit/biped.mjs';
const FRAME = 1 / 30; const STRIKE = 2.5 * FRAME, HOLD = 3 * FRAME, SPAWN = 7 * FRAME;
export const CFG = {
  name: 'bellabbess', unit: 3.15,
  base: {},
  chain: [['hips', 'h'], ['spine', 's'], ['chest', 'c'], ['head', 'n']],
  extras: [['skirt1', 'ka'], ['skirt2', 'kb'],
    ['upperarmL', 'ul'], ['forearmL', 'fl'], ['handL', 'wl'], ['sleeveL', 'sl'],
    ['upperarmR', 'ur'], ['forearmR', 'fr'], ['handR', 'wr'], ['sleeveR', 'sr'], ['staff', 'st'], ['bell', 'bl']],
  arms: { AL: { b: ['upperarmL', 'forearmL', 'handL'], pole: [0.17, -0.95, -0.25] }, AR: { b: ['upperarmR', 'forearmR', 'handR'], pole: [-0.17, -0.94, -0.31] } },
  legs: {},
  springs: [{ bone: 'bell', k: 34, c: 2.6, max: 0.75 }, { bone: 'sleeveL', k: 46, c: 6, max: 0.35 }, { bone: 'sleeveR', k: 46, c: 6, max: 0.35 }],
};
const bump = (t, c, w) => { const u = (t - c) / w; return Math.abs(u) >= 0.5 ? 0 : Math.cos(Math.PI * u) ** 2; };
const pulse = (t, a, b, c, d) => smooth((t - a) / (b - a)) * (1 - smooth((t - c) / (d - c)));
const nofeet = () => ({});
// both arms, by hand (as the Vein Matron's). out: away from the body, fwd: raised forward, inw: turned in, el: the elbow
// bent more (+), tw: the forearm rolled, hand: the wrist bent forward; L and R can differ ({L:{...}, R:{...}})
const A0 = { out: 0, fwd: 0, inw: 0, el: 0, tw: 0, hand: 0 };
function arms(a) {
  const L = { ...A0, ...(a.L || {}) }, R = { ...A0, ...(a.R || {}) };
  return { ulr: L.out, ulp: L.fwd, uly: -L.inw, flp: L.el, flr: L.tw, wlp: L.hand, urr: -R.out, urp: R.fwd, ury: R.inw, frp: R.el, frr: -R.tw, wrp: R.hand };
}
const mixA = (a, b, u) => Object.fromEntries(Object.keys(A0).map((k) => [k, lerp(a[k] ?? 0, b[k] ?? 0, u)]));
function armTrack(keys) { // [[t, {out,fwd,..}, ease]]
  return (t) => { let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; let u = clamp((t - a[0]) / Math.max(1e-6, b[0] - a[0])); u = b[2] ? EASE[b[2]](u) : smooth(u); return mixA({ ...A0, ...a[1] }, { ...A0, ...b[1] }, u); };
}
// The crozier stands by her: the right wrist holds a point in the room (rest: where it is in the model, so its foot is on
// the floor) and the crozier is held upright whatever the wrist does. dx, dy, dz move the wrist; tp tips the crozier
// forward (+), tr out to her right (+); w hands the arm and the crozier back to the arm's own channels.
const WR = [-0.16, 0.665, 0.09];
const crozier = (o = {}) => { const c = { w: 1, dx: 0, dy: 0, dz: 0, tp: 0, tr: 0, ...o }; const e = c.e || [-0.17, -0.94, -0.31];
  return { ARW: c.w, ARx: WR[0] + c.dx, ARy: WR[1] + c.dy, ARz: WR[2] + c.dz, ARex: e[0], ARey: e[1], ARez: e[2], stW: c.w, stWp: -c.tp, stWr: c.tr }; };
const ELBOW_OUT = [-0.85, -0.45, -0.25];   // where the right elbow points when the crozier is raised high
// the left wrist reaches for a point (to hold the crozier with both hands)
const leftTo = (w, P) => ({ ALW: w, ALx: P[0], ALy: P[1], ALz: P[2], ALex: 0.6, ALey: -0.75, ALez: -0.2 });
// the sleeves hang from the forearms (held hanging in the room, swinging on springs); the bell is free on its spring
const sleeves = (o = {}) => ({ slW: o.W ?? 0.7, srW: o.W ?? 0.7, slWp: o.p ?? 0, srWp: o.p ?? 0, slWr: o.L ?? 0, srWr: -(o.R ?? 0) });
// The habit stands on the plinth: whatever the waist does, its two joints turn back so the hem stays level on the plinth,
// and a drop of the waist is taken up by the upper habit only.
function gown(k, sway = 0, lean = 0) {
  const hp = k.hp || 0, hr = k.hr || 0, hy = k.hy || 0, oy = k.oy || 0;
  return { kap: -0.55 * hp + lean, kbp: -0.45 * hp - lean, kar: -0.55 * hr + sway, kbr: -0.45 * hr - sway * 0.6, kay: -0.5 * hy, kby: -0.5 * hy, kbb: -oy * 0.85 };
}
const REST = {};
// The moves below are written with a bow forward as + on the waist, spine, chest and head (the solver turns them back for +)
const flip = (k) => { for (const c of ['hp', 'sp', 'cp', 'np']) if (k[c]) k[c] = -k[c]; return k; };
// the left hand is raised in blessing at rest; L.up raises it higher (the forearm straightens up), L.pal turns the palm out
const blessing = (up = 0, out = 0) => ({ out: 0.05 * up + out, fwd: 0.35 * up, el: -0.3 * up });
// the rope's grip: where the left wrist reaches up to take the rope
const ROPE = [0.2, 0.9, 0.1];
const toRope = (w, dy = 0, dz = 0) => ({ ALW: w, ALx: ROPE[0], ALy: ROPE[1] + dy, ALz: ROPE[2] + dz, ALex: 0.35, ALey: -1, ALez: -0.1 });

// ------------------------------------------------------------------------------------------------ idle
// 6 s. She stands as still as the statue she looks like and breathes slowly; the blessing hand lifts a little and settles;
// the crozier stands by her, the bell stirring in its crook; the head bows a touch and rises.
const idle = {
  dur: 6, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 3, b = Math.sin(w), q = Math.sin(2 * Math.PI * t / 6);
    const k = { oy: 0.002 * b, sp: 0.01 * b, cp: 0.014 * b, np: -0.03 * q - 0.012 * b, nr: 0.03 * Math.sin(2 * Math.PI * t / 6 + 1), cr: -0.008 * q };
    flip(k);
    return addPose(k, gown(k, 0.008 * q), arms({ L: { ...blessing(0.12 + 0.12 * q), hand: 0.06 * b } }), crozier({ tp: 0.012 * q, tr: 0.01 * b }), sleeves(), { blp: 0.05 * Math.sin(2 * Math.PI * t / 1.5) });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ glide and turn
// 1.1 u/s. She glides on her plinth as if carried in a procession: she leans a little into it and sways once each beat
// of an unseen step, the habit ripples, the crozier is carried just off the floor and rocks with the beat (the bell
// swinging in its crook), the blessing hand stays raised. 2 s loop.
const walk = {
  dur: 2, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 2, b = Math.sin(w), b2 = Math.sin(2 * w);
    const k = { oy: 0.003 * b2, hp: 0.04, sp: 0.02, cp: 0.01, np: -0.02 + 0.012 * b2, hr: 0.018 * b, cr: -0.015 * b, nr: -0.01 * b, hy: 0.025 * b, cy: -0.03 * b, ny: 0.015 * b };
    flip(k);
    return addPose(k, gown(k, 0.018 * Math.sin(w - 0.8), -0.06 + 0.02 * Math.sin(2 * w - 0.6)), arms({ L: { ...blessing(0.05), out: 0.02 * b } }),
      crozier({ dy: 0.02 + 0.008 * Math.sin(2 * w - 0.4), dz: 0.012, tp: 0.07 * Math.sin(w - 0.5), tr: 0.015 * b }), sleeves({ p: -0.12 }));
  },
  feet: nofeet,
};
const turn = (dir) => ({
  dur: 1.5, loop: true,
  pose: (t) => {
    const w = 2 * Math.PI * t / 1.5, b = Math.sin(w);
    const k = { oy: 0.002 * b, hr: -0.025 * dir, cr: -0.02 * dir, hy: 0.06 * dir, sy: 0.06 * dir, cy: 0.08 * dir, ny: 0.15 * dir, np: -0.02 };
    flip(k);
    return addPose(k, gown(k, 0.015 * dir), arms({ L: blessing(0.05) }), crozier({ dy: 0.015, tr: -0.04 * dir, tp: 0.02 }), sleeves({ L: -0.08 * dir, R: -0.08 * dir }));
  },
  feet: nofeet,
});

// ------------------------------------------------------------------------------------------------ Rope Swing
// reaches (0.3 s: the great bell's rope drops out of the dark; her blessing hand goes up and closes on it), pulls (to half
// the warning: she hangs her weight on it, bowing, the habit gathering, the crozier drawn back), rides (from 50 % to 92 %
// of the 66 ticks: the page lifts her off the floor in the game's arc, 1.1 u high, and carries her down the lane; the
// habit and sleeves stream behind and she tips back, then forward on the way down), lands (at 92 %, at the lane's end: the
// habit flares, she bows into it and plants the crozier with a toll; the lane strikes on the 66th tick), contact held
// (3 frames), lets go (0.3 s: the rope swings away up into the dark), settle (0.6 s).
const RS = { reach: 0.3, ride: 0.5 * 66 / 60, drop: 0.92 * 66 / 60, hit: 66 / 60 };
RS.strike = RS.hit - STRIKE; RS.held = RS.hit + HOLD; RS.rec = RS.held + 0.3; RS.end = RS.held + 0.9;
// the page carries her down the lane on the rope: from her start to the lane's end (the hero 3.0 u off, the lane 1.2 u past)
const LANE_END = (3.0 + 1.2) / 3.15;
const ropeSwing = {
  dur: RS.end, travel: (t) => LANE_END * (0.5 - 0.5 * Math.cos(Math.PI * clamp((t - RS.ride) / (RS.drop - RS.ride)))), contact: [RS.drop, RS.hit], kinds: ['land', 'swing'], cues: { lane: [0, RS.hit], rope: [0, RS.rec], ride: [RS.ride, RS.drop] },
  phases: [['reaches for the rope', 0], ['pulls', RS.reach], ['rides', RS.ride], ['lands', RS.drop], ['contact held', RS.hit], ['lets go', RS.held], ['settle', RS.rec]],
  pose: (t) => {
    const PULL = { oy: -0.02, hp: 0.04, sp: 0.06, cp: 0.08, np: 0.1, hr: 0.02 };
    const RIDE = { oy: 0.004, hp: -0.04, sp: -0.06, cp: -0.08, np: -0.06 };
    const LAND = { oy: -0.024, hp: 0.06, sp: 0.1, cp: 0.12, np: 0.16, hr: -0.02 };
    const k = track([[0, {}], [RS.reach, { cp: -0.03, np: -0.12 }], [RS.ride, PULL, 'in'], [RS.ride + 0.12, RIDE, 'out'], [RS.drop - 0.12, { ...RIDE, hp: -0.01, cp: 0.0, np: 0.02 }],
      [RS.drop, LAND, 'in'], [RS.held, { ...LAND, oy: -0.02, cp: 0.1 }], [RS.rec, { oy: -0.006, cp: 0.03, np: 0.05 }, 'out'], [RS.end, {}]])(t);
    flip(k);
    const grip = track([[0, { w: 0, dy: 0, dz: 0 }], [RS.reach, { w: 1, dy: 0.01, dz: 0 }], [RS.ride, { w: 1, dy: -0.03, dz: 0.02 }, 'in'], [RS.ride + 0.1, { w: 1, dy: -0.005, dz: 0 }], [RS.drop - 0.1, { w: 1, dy: -0.01, dz: 0.01 }], [RS.drop, { w: 1, dy: -0.045, dz: 0.04 }, 'in'], [RS.held, { w: 1, dy: -0.045, dz: 0.04 }], [RS.rec, { w: 0, dy: -0.02, dz: 0.02 }], [RS.end, { w: 0, dy: 0, dz: 0 }]])(t);
    const L = armTrack([[0, REST], [RS.reach, blessing(0.6)], [RS.rec, blessing(0.6)], [RS.end, REST]])(t);
    // the crozier: drawn back as she pulls, held out behind her on the ride, swung forward and planted as she lands
    const cz = track([[0, { dy: 0, dz: 0, tp: 0, tr: 0 }], [RS.ride, { dy: 0.03, dz: -0.04, tp: -0.12, tr: 0.04 }], [RS.ride + 0.15, { dy: 0.06, dz: -0.07, tp: -0.3, tr: 0.08 }], [RS.drop - 0.08, { dy: 0.07, dz: 0.02, tp: 0.05, tr: 0.06 }],
      [RS.drop, { dy: 0.012, dz: 0.07, tp: 0.12, tr: 0.02 }, 'in'], [RS.held, { dy: 0.01, dz: 0.07, tp: 0.1, tr: 0.02 }], [RS.rec, { dy: 0.005, dz: 0.03, tp: 0.04 }, 'out'], [RS.end, { dy: 0, dz: 0, tp: 0, tr: 0 }]])(t);
    const ride = pulse(t, RS.ride, RS.ride + 0.1, RS.drop - 0.1, RS.drop);
    const flare = pulse(t, RS.drop - 0.02, RS.drop + 0.03, RS.held, RS.rec + 0.1);
    const toll = t > RS.drop ? 0.55 * Math.exp(-(t - RS.drop) * 3.2) * Math.sin((t - RS.drop) * 15) : 0;
    return addPose(k, gown(k, 0, -0.3 * ride + 0.12 * flare), arms({ L }), toRope(clamp(grip.w), grip.dy, grip.dz), crozier(cz), sleeves({ p: -0.5 * ride + 0.15 * flare, L: 0.1 * flare, R: 0.15 * flare }), { blp: -0.4 * ride + toll });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ Vesper Peal
// raises (0.6 of the 60-tick cone: she lifts the crozier up and back over her right shoulder, the bell swinging, and
// turns her face up; the blessing hand opens toward the cone), the bell shivers (it rattles faster and faster in the
// crook while she holds it high), rings (2.5 frames, landing on the cone's tick: she brings the crozier down and forward
// and the bell tolls at the end of the swing, the peal rolling out over the cone), contact held (3 frames), the bell sings
// on (0.3 s), settle (0.6 s).
const VP = { raise: 0.6, hit: 60 / 60 };
VP.strike = VP.hit - STRIKE; VP.held = VP.hit + HOLD; VP.rec = VP.held + 0.3; VP.end = VP.held + 0.9;
const vesperPeal = {
  dur: VP.end, contact: [VP.hit], kinds: ['peal'], cues: { cone: [0, VP.hit] },
  phases: [['raises the crozier', 0], ['the bell shivers', VP.raise], ['rings', VP.strike], ['contact held', VP.hit], ['the bell sings on', VP.held], ['settle', VP.rec]],
  springGain: { bell: 0.6 },
  pose: (t) => {
    const UP = { hp: -0.03, sp: -0.05, cp: -0.08, np: -0.12, hy: -0.03, cy: -0.1, ny: 0.04, cr: 0.02 };
    const DOWN = { oy: -0.012, hp: 0.04, sp: 0.07, cp: 0.12, np: 0.14, hy: 0.03, cy: 0.1, ny: -0.06 };
    const k = track([[0, {}], [VP.raise, UP], [VP.strike, { ...UP, cy: -0.13, cp: -0.1 }], [VP.hit, DOWN, 'in'], [VP.held, { ...DOWN, cp: 0.13 }], [VP.rec, { oy: -0.004, cp: 0.04, np: 0.04 }, 'out'], [VP.end, {}]])(t);
    flip(k);
    // the crozier: lifted high and tipped back over her right shoulder, then swung down and forward to point the crook at the cone
    const cz = track([[0, { dx: 0, dy: 0, dz: 0, tp: 0, tr: 0 }], [VP.raise, { dx: -0.03, dy: 0.2, dz: -0.02, tp: -0.42, tr: 0.12 }], [VP.strike, { dx: -0.035, dy: 0.22, dz: -0.03, tp: -0.5, tr: 0.14 }],
      [VP.hit, { dx: 0.0, dy: 0.1, dz: 0.12, tp: 0.85, tr: 0.02 }, 'in'], [VP.held, { dx: 0.0, dy: 0.095, dz: 0.125, tp: 0.9, tr: 0.02 }], [VP.rec, { dx: 0, dy: 0.04, dz: 0.05, tp: 0.3 }, 'out'], [VP.end, { dx: 0, dy: 0, dz: 0, tp: 0, tr: 0 }]])(t);
    const eu = clamp(cz.dy / 0.1);
    const L = armTrack([[0, REST], [VP.raise, { ...blessing(0.5), out: 0.25 }], [VP.strike, { ...blessing(0.55), out: 0.3 }], [VP.hit, { ...blessing(0.8), out: 0.15, fwd: 0.6 }, 'in'], [VP.rec, blessing(0.4)], [VP.end, REST]])(t);
    const shiver = pulse(t, VP.raise - 0.1, VP.raise + 0.1, VP.strike - 0.02, VP.strike) * (0.35 + 0.65 * clamp((t - VP.raise) / (VP.strike - VP.raise)));
    const toll = t > VP.hit ? 0.75 * Math.exp(-(t - VP.hit) * 2.6) * Math.sin((t - VP.hit) * 16) : 0;
    const bl = 0.25 * shiver * Math.sin(55 * t) - 0.5 * pulse(t, VP.strike, VP.hit - 0.01, VP.hit, VP.hit + 0.02) + toll;
    return addPose(k, gown(k), arms({ L }), crozier({ ...cz, e: ELBOW_OUT.map((v, i) => lerp([-0.17, -0.94, -0.31][i], v, eu)) }), sleeves({ p: 0.1 * shiver }), { blp: bl, blr: 0.1 * shiver * Math.sin(47 * t + 1) });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ Rage (a call: the game shows only the glow and a sound)
// gather (she bows over the crozier, drawing it in to her breast), cry (2.5 frames: she rears up and thrusts the crozier
// high, the blessing hand flung up and open, the head thrown back, the bell clanging), then the bell rings on wildly while
// she holds it up, and she settles.
const RG = { gather: 0.34, roar: 0.34 + STRIKE, end: 1.6 };
const rage = {
  dur: RG.end, contact: [RG.roar], kinds: ['roar'], phases: [['gather', 0], ['cry', RG.gather], ['the bell clangs', RG.roar], ['settles', 1.25]],
  pose: (t) => {
    const IN = { oy: -0.016, hp: 0.05, sp: 0.09, cp: 0.14, np: 0.22 }, UP = { oy: 0.006, hp: -0.04, sp: -0.07, cp: -0.12, np: -0.25 };
    const k = track([[0, {}], [RG.gather, IN], [RG.roar, UP, 'in'], [1.2, { ...UP, np: -0.2 }], [RG.end, {}]])(t);
    flip(k);
    const cz = track([[0, { dx: 0, dy: 0, dz: 0, tp: 0, tr: 0, e: 0 }], [RG.gather, { dx: 0.05, dy: 0.02, dz: 0.03, tp: 0.05, tr: -0.12, e: 0 }], [RG.roar, { dx: -0.035, dy: 0.235, dz: 0.05, tp: -0.06, tr: 0.08, e: 1 }, 'in'], [1.2, { dx: -0.03, dy: 0.225, dz: 0.05, tp: -0.05, tr: 0.07, e: 1 }], [RG.end, { dx: 0, dy: 0, dz: 0, tp: 0, tr: 0, e: 0 }]])(t);
    const L = armTrack([[0, REST], [RG.gather, { out: -0.05, fwd: 0.2, el: 0.6, inw: 0.3 }], [RG.roar, { ...blessing(1), out: 0.75, fwd: 0.6 }, 'in'], [1.2, { ...blessing(1), out: 0.7, fwd: 0.55 }], [RG.end, REST]])(t);
    const sh = pulse(t, RG.roar, RG.roar + 0.05, 1.1, 1.3) * Math.sin(80 * t);
    const clang = pulse(t, RG.roar - 0.05, RG.roar + 0.02, 1.15, 1.45) * Math.sin(28 * t);
    return addPose(k, gown(k), arms({ L }), crozier({ ...cz, e: ELBOW_OUT.map((v, i) => lerp([-0.17, -0.94, -0.31][i], v, cz.e)) }), sleeves(), { cr: 0.015 * sh, nr: -0.02 * sh, blp: 0.55 * clang, blr: 0.2 * clang });
  },
  feet: nofeet,
};
// The enraged state, played on top of anything (spine, chest, head and arms only): drawn up stiff, the blessing hand
// raised higher with the palm thrust out, trembling; the bell in the crook keeps up a nervous ring.
const rageHold = {
  dur: 0.4, loop: true, upperOnly: true,
  pose: (t) => { const w = 2 * Math.PI * t / 0.4;
    return addPose(flip({ cp: -0.04, sp: -0.02, np: -0.04 + 0.012 * Math.sin(w), nr: 0.015 * Math.sin(2 * w) }), arms({ L: { ...blessing(0.6), out: 0.12 + 0.02 * Math.sin(w), hand: -0.25 } }), crozier({ dy: 0.006 }), { blp: 0.12 * Math.sin(2 * w), blr: 0.06 * Math.sin(w) }); },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ hurt (light)
// Played on top of anything: the chest and head flinch back, the blessing hand jolts up, the bell knocks.
const hurt = {
  dur: 0.42, upperOnly: true,
  pose: (t) => { const e = t < 0.07 ? smooth(t / 0.07) : 1 - smooth((t - 0.07) / 0.35);
    return addPose(flip({ sp: -0.04 * e, cp: -0.1 * e, np: -0.16 * e, nr: 0.05 * e, cr: 0.025 * e }), arms({ L: { out: 0.18 * e, fwd: 0.15 * e, el: -0.1 * e } }), crozier({ dy: 0.012 * e, tr: 0.03 * e }), { blp: 0.3 * e }); },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ heavy hit
// A blow that would stagger anyone else: her plinth holds, so she bends back from the waist, the crozier swaying out and
// the bell swinging wide, then she rocks forward past upright, catches herself on the crozier, and the bell rings down.
const heavyHit = {
  dur: 1.15, contact: [0, 0.46], kinds: ['hit', 'rebound'], phases: [['bent back', 0], ['rocks forward', 0.3], ['catches herself', 0.46], ['straightens', 0.7]],
  pose: (t) => {
    const k = track([[0, {}], [0.12, { oy: -0.006, hp: -0.07, sp: -0.08, cp: -0.12, np: -0.2, hr: 0.03 }, 'out'], [0.3, { oy: -0.003, hp: -0.03, sp: -0.03, cp: -0.04, np: -0.05 }],
      [0.46, { oy: -0.008, hp: 0.04, sp: 0.06, cp: 0.09, np: 0.12 }, 'in'], [0.7, { hp: 0.0, cp: 0.01, np: 0.02 }, 'out'], [1.15, {}]])(t);
    flip(k);
    const L = armTrack([[0, REST], [0.12, { out: 0.45, fwd: 0.35, el: -0.25 }, 'out'], [0.46, { out: 0.15, fwd: -0.1, el: 0.15 }], [0.75, { out: 0.04 }], [1.15, REST]])(t);
    const cz = track([[0, { dx: 0, dy: 0, tp: 0, tr: 0 }], [0.12, { dx: -0.02, dy: 0.02, tp: -0.12, tr: 0.12 }, 'out'], [0.46, { dx: 0, dy: 0.0, tp: 0.06, tr: 0.02 }], [0.75, { tp: 0.01 }], [1.15, { dx: 0, dy: 0, tp: 0, tr: 0 }]])(t);
    const sh = pulse(t, 0.5, 0.58, 0.8, 0.95) * 0.18 * Math.sin((t - 0.5) * 21);
    return addPose(k, gown(k), arms({ L }), crozier(cz), sleeves({ p: 0.2 * bump(t, 0.15, 0.3) - 0.15 * bump(t, 0.46, 0.3) }), { ny: sh, blr: 0.4 * bump(t, 0.2, 0.4) });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ spawn (the entrance)
// The game's spawn (grow from the floor in 7 frames) and its 96-tick entrance: she grows bowed in prayer over the crozier,
// the blessing hand lowered to her breast; then she straightens, lifts her face (the page opens the glow of her eyes),
// raises the blessing hand high, and the bell rings once.
const SP = { still: 0.3, open: 1.0, hit: 1.0 + STRIKE, end: 1.6 };
const spawn = {
  dur: SP.end, contact: [SP.hit], kinds: ['chime'], scale: (t) => 0.02 + 0.98 * EASE.out(clamp(t / SPAWN)),
  phases: [['grows', 0], ['straightens', SP.still], ['blesses', SP.open], ['settles', SP.hit]],
  pose: (t) => {
    const BOW = { oy: -0.025, hp: 0.06, sp: 0.12, cp: 0.16, np: 0.32 };
    const k = track([[0, BOW], [SP.still, BOW], [SP.open, { oy: 0.002, cp: -0.02, np: -0.06 }], [SP.hit, { oy: 0.004, sp: -0.02, cp: -0.05, np: -0.14 }, 'in'], [SP.end, {}]])(t);
    flip(k);
    const L = armTrack([[0, { out: -0.15, fwd: 0.1, el: 0.75, inw: 0.35 }], [SP.still, { out: -0.15, fwd: 0.1, el: 0.75, inw: 0.35 }], [SP.open, blessing(0.6)], [SP.hit, { ...blessing(1), hand: -0.2 }, 'in'], [SP.end, REST]])(t);
    const toll = t > SP.hit ? 0.5 * Math.exp(-(t - SP.hit) * 3) * Math.sin((t - SP.hit) * 15) : 0;
    return addPose(k, gown(k), arms({ L }), crozier({ dy: 0.005 }), sleeves(), { blp: toll });
  },
  feet: nofeet,
};

// ------------------------------------------------------------------------------------------------ death
// The bell cracks: a last toll jolts her upright and back; she draws the crozier in to her breast with both hands and
// bows over it as the light goes out of her eyes; she sinks a little into her habit with the head bowed to the crook, and
// the page turns her grey: she ends a statue at prayer on her plinth.
const D = { jolt: 0.12, draw: 0.7, bow: 1.7, end: 2.8 };
const death = {
  dur: D.end, contact: [0.05, D.bow], kinds: ['crack', 'still'], phases: [['the bell cracks', 0], ['draws in the crozier', D.jolt], ['bows', D.draw], ['stone', D.bow]],
  pose: (t) => {
    const LAST = { oy: -0.03, hp: 0.06, sp: 0.12, cp: 0.18, np: 0.42, nr: 0.06 };
    const k = track([[0, {}], [D.jolt, { oy: 0.004, hp: -0.04, sp: -0.05, cp: -0.1, np: -0.2 }, 'out'], [D.draw, { oy: -0.006, hp: 0.0, cp: 0.04, np: 0.08 }],
      [D.bow, LAST, 'io'], [D.bow + 0.12, { ...LAST, np: 0.44 }], [D.end, LAST]])(t);
    flip(k);
    const cz = track([[0, { dx: 0, dy: 0, dz: 0, tp: 0, tr: 0 }], [D.jolt, { dx: -0.01, dy: 0.015, dz: 0, tp: -0.06, tr: 0.05 }, 'out'], [D.draw, { dx: 0.075, dy: 0.03, dz: 0.05, tp: 0.12, tr: -0.2 }], [D.bow, { dx: 0.08, dy: 0.02, dz: 0.06, tp: 0.2, tr: -0.22 }, 'io'], [D.end, { dx: 0.08, dy: 0.02, dz: 0.06, tp: 0.2, tr: -0.22 }]])(t);
    const L = armTrack([[0, REST], [D.jolt, { ...blessing(0.6), out: 0.3 }, 'out'], [D.end, { ...blessing(0.6), out: 0.3 }]])(t);
    const lw = track([[0, { w: 0 }], [D.jolt, { w: 0 }], [D.draw, { w: 1 }], [D.end, { w: 1 }]])(t).w;
    const LH = [-0.035, 0.73 + cz.dy * 0.5, 0.165];
    const toll = 0.6 * Math.exp(-t * 2.4) * Math.sin(t * 14);
    return addPose(k, gown(k), arms({ L }), leftTo(lw, LH), crozier(cz), sleeves(), { blp: toll });
  },
  feet: nofeet,
};

export const CLIPS = { idle, walk, turnL: turn(1), turnR: turn(-1), ropeSwing, vesperPeal, rage, rageHold, hurt, heavyHit, spawn, death };
