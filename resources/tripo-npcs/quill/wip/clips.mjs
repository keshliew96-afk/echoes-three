// Quill's moves (the Chronicler, an NPC: no walk, no attacks). Units are model units (the page draws it CFG.unit times
// bigger). Timings come from the game's rig, src/render/npcs/chronicler.js: a quick breath (2.2 rad a second) the body
// swells with; head tilts every 0.9-2.6 s that SNAP to a new tilt and turn (eased at 28 a second) and hold, birds
// cutting between poses; a tail flick every 2-4.5 s (a 0.28 s up-pump); a hop in place every 5-10 s (a 0.12 s crouch,
// a 0.3 s arc 0.07 u high, a 0.12 s landing squash, the wings flaring in the air); and talking (eased in and out at 8 a
// second by src/render/npcs/index.js): the beak chattering (0.5 rad on a 16 rad/s beat) and the head nodding (10 rad/s).
import fs from 'fs';
import { V3, smooth } from '../../mobs/kit/quad.mjs';
const SK = JSON.parse(fs.readFileSync(new URL('./rig/skel.json', import.meta.url)));
const END = Object.fromEntries(Object.entries(SK.ends).map(([k, v]) => [k, V3(...v)]));
export const CFG = {
  name: 'quill', unit: 0.55, base: {},
  chain: [['hips', 'b'], ['body', 'd'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['jaw', 'j'], ['tail1', 't1'], ['tail2', 't2'], ['wingL', 'wL'], ['wingR', 'wR']],
  scales: [['body', ['dsx', 'dsy', 'dsz']]],
  legs: {
    HL: { kind: 'limb', b: ['thighL', 'shinL', 'footL', 'toeL'], pole: [0.1, 0, -1] }, HR: { kind: 'limb', b: ['thighR', 'shinR', 'footR', 'toeR'], pole: [-0.1, 0, -1] },
  },
  springs: [],
};
const U = CFG.unit, TAU = 2 * Math.PI, GU = 0.55; // the game's Quill is 0.54 u to the top of her head
const REST_T = { HL: END.toeL.clone(), HR: END.toeR.clone() };
const JY = 0.37; // the body bone's height: its squash is shifted so the bird squashes from the floor as in the game
const pulse = (since, len, hold) => { if (since < 0 || since > len) return 0; const k = since / len, e = (1 - hold) / 2; return k < e ? smooth(k / e) : k > 1 - e ? smooth((1 - k) / e) : 1; };
// the game's hop: returns the lift (game u) and the squash
function hopAt(s) {
  if (s < 0 || s >= 0.54) return { y: 0, sq: 1 };
  if (s < 0.12) return { y: 0, sq: 1 - 0.12 * smooth(s / 0.12) };
  if (s < 0.42) { const a = (s - 0.12) / 0.3; return { y: 0.07 * Math.sin(Math.PI * a), sq: 1 + 0.08 * Math.sin(Math.PI * a) }; }
  return { y: 0, sq: 1 - 0.1 * Math.sin(Math.PI * ((s - 0.42) / 0.12)) };
}
// head tilts: a list of [time, r]; the n-th picks its turn by the game's golden step; each snaps from the last at 28/s
function tiltAt(t, list, wrap) {
  const tgt = (i) => ({ tilt: (list[i][1] - 0.5) * 0.9, turn: (((i + 1) * 0.618) % 1 - 0.5) * 1.0 });
  let cur = wrap ? tgt(list.length - 1) : { tilt: 0, turn: 0 };
  for (let i = 0; i < list.length && list[i][0] <= t; i++) {
    const nx = list[i + 1] && list[i + 1][0] <= t ? list[i + 1][0] : t; const k = 1 - Math.exp(-28 * (nx - list[i][0])); const g = tgt(i);
    cur = { tilt: cur.tilt + (g.tilt - cur.tilt) * k, turn: cur.turn + (g.turn - cur.turn) * k };
  }
  return cur;
}
// the pose: br (breath wave), tilt, turn, flick (0..1), hop {y, sq}, talk (0..1), chat and nod (the talk beats)
function magpie(o) {
  const br = o.br, h = o.hop, sx = 2 - h.sq, sy = h.sq, air = h.y / GU;
  const wing = h.y > 0 ? 0.25 * Math.max(0, h.sq - 1) * 8 : 0;
  return {
    oy: air + JY * (sy * (1 + 0.02 * br) - 1),
    dsx: sx * (1 + 0.015 * br) - 1, dsy: sy * (1 + 0.02 * br) - 1, dsz: sx * (1 + 0.015 * br) - 1,
    ny: o.turn, hr: o.tilt, hp: -0.12 * o.talk * Math.max(0, o.nod),
    jp: 0.5 * o.talk * Math.max(0, o.chat),
    t1p: -(0.35 * o.flick + 0.03 * br) * 0.7, t2p: -(0.35 * o.flick) * 0.3,
    wLr: wing, wRr: -wing,
  };
}
function feetOf(h) {
  const out = {}, s = h.y > 0 ? h.y / GU + JY * (h.sq - 1) : 0;
  for (const k of ['HL', 'HR']) { const p = REST_T[k].clone(); p.y += s; out[k] = { p, lock: s <= 0.0005, curl: 0 }; }
  return out;
}
// ------------------------------------------------------------------------------------------------ idle
// One loop of 20 s: seven breaths (the breath rounded to 2.2 rad a second's nearest whole turn). The game rolls when each
// tilt, flick and hop comes; the page fixes twelve tilts, six flicks and three hops in the loop.
const ID = 1200 / 60, WB = TAU * 7 / ID;
const TILTS = [[0.6, 0.82], [2.3, 0.3], [3.5, 0.55], [5.6, 0.12], [6.9, 0.7], [8.8, 0.45], [10.1, 0.95], [12.4, 0.25], [13.6, 0.6], [15.5, 0.08], [17.2, 0.75], [18.6, 0.4]];
const FLICKS = [1.2, 4.6, 7.4, 10.9, 14.0, 17.3];
const HOPS = [4.0, 11.5, 16.4];
const hopOf = (t, list) => { for (const a of list) { const s = t - a; if (s >= 0 && s < 0.54) return hopAt(s); } return { y: 0, sq: 1 }; };
const idle = {
  dur: ID, loop: true,
  pose: (t) => { const tl = tiltAt(t, TILTS, true); const flick = Math.max(...FLICKS.map((a) => pulse(t - a, 0.28, 0.1)));
    return magpie({ br: Math.sin(WB * t), ...tl, flick, hop: hopOf(t, HOPS), talk: 0, nod: 0, chat: 0 }); },
  feet: (t) => feetOf(hopOf(t, HOPS)),
};
// ------------------------------------------------------------------------------------------------ talk
// One line (mine, 6.3 s): the beak chatters and the head nods, eased in and out; the tilts and a flick carry on.
const TD = 377 / 60, tw = (n) => TAU * n / TD;
const TTILTS = [[0.9, 0.7], [2.4, 0.35], [3.8, 0.62], [5.1, 0.2]];
const talk = {
  dur: TD, contact: [],
  phases: [['speaks a line', 0], ['the line ends', TD - 0.4]],
  pose: (t) => { const k = Math.min(1 - Math.exp(-8 * t), 1 - Math.exp(-8 * (TD - t))); const tl = tiltAt(t, TTILTS, false);
    return magpie({ br: Math.sin(tw(2) * t), ...tl, flick: pulse(t - 3.1, 0.28, 0.1), hop: { y: 0, sq: 1 }, talk: k, nod: Math.sin(tw(10) * t), chat: Math.sin(tw(16) * t) }); },
  feet: () => feetOf({ y: 0, sq: 1 }),
};
const rest = () => feetOf({ y: 0, sq: 1 });
const still = (dur) => ({ dur, loop: true, feet: rest, pose: () => ({}) });
export const CLIPS = { idle, walk: still(1), turnL: still(1), turnR: still(1), talk, hurt: { dur: 0.4, upperOnly: true, feet: rest, pose: () => ({}) }, spawn: { dur: 0.5, contact: [], feet: rest, pose: () => ({}) }, death: { dur: 0.5, contact: [], feet: rest, pose: () => ({}) } };
