// Wick's moves (the Hearth-Keeper, an NPC: no walk, no attacks). Units are model units (the page draws it CFG.unit times
// bigger). Timings come from the game's rig, src/render/npcs/keeper.js: a slow breath (1.25 rad a second) the body swells
// with; a look every 4.5-8.5 s, eased in over 0.45 s and held 2.6 s, the neck turning 0.45 rad and the head tilting
// against it, every third look the owl's big swivel (0.95 rad); a slow blink every 2.8-5.5 s (0.32 s), sometimes doubled;
// a wing ruffle every 9-15 s (0.9 s, the wings shrugging out in a flutter); and talking (src/render/npcs/index.js eases it
// in and out at 8 a second): the beak chatters (0.45 rad on a 13 rad/s beat) and the head bobs.
import { V3, smooth, clamp } from '../../mobs/kit/quad.mjs';
export const CFG = {
  name: 'wick', unit: 1.25, base: {},
  chain: [['hips', 'b'], ['chest', 'c'], ['neck', 'n'], ['head', 'h']],
  extras: [['beak', 'k'], ['tuftL', 'qL'], ['tuftR', 'qR'], ['wingL', 'wL'], ['wingR', 'wR']],
  scales: [['chest', ['csx', 'csy', 'csz']], ['eyeL', ['exL', 'eyL', 'ezL']], ['eyeR', ['exR', 'eyR', 'ezR']]],
  legs: {}, springs: [],
};
const TAU = 2 * Math.PI;
const none = () => ({});
const c01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
// a held pulse: up over e, held, down over e, d long in all
const held = (s, d, e) => (s < 0 || s > d ? 0 : smooth(Math.min(1, s / e, (d - s) / e)));
function owl(t, o = {}) {
  const br = o.br ?? 0, talk = o.talk || 0, lk = o.look || 0, dir = o.dir || 1, big = !!o.big, lid = o.lid || 0, rk = o.ruffle || 0, rs = o.rs || 0;
  const chat = talk * Math.max(0, Math.sin(o.chatW * t));
  const flut = rk * Math.abs(Math.sin(rs * 14));
  return {
    csx: 0.012 * br, csy: 0.02 * br, csz: 0.012 * br,
    ny: dir * (big ? 0.95 : 0.45) * lk, hr: -dir * (big ? 0.08 : 0.22) * lk + 0.03 * Math.sin(o.tiltW * t),
    hp: 0.03 * Math.sin(o.nodW * t) + 0.05 * talk * Math.abs(Math.sin(o.bobW * t)), np: 0.02 * talk * Math.sin(o.bob2W * t),
    kp: -0.45 * chat,
    eyL: -0.85 * lid, eyR: -0.85 * lid,
    wLr: 0.22 * flut, wRr: -0.22 * flut, qLr: -0.08 * rk, qRr: 0.08 * rk,
  };
}
// ------------------------------------------------------------------------------------------------ idle
// Two of the game's breaths (10.05 s). Inside it, fixed where the game rolls them: a small look to its left at 0.8 s,
// the big swivel to its right at 5.2 s, blinks at 0.4 s, 3.6 s (a double) and 7.6 s, a wing ruffle at 8.4 s.
const ID = 603 / 60, W = (n) => TAU * n / ID;
const idle = {
  dur: ID, loop: true, feet: none,
  pose: (t) => {
    const l1 = held(t - 0.8, 2.6 + 0.9, 0.45), l2 = held(t - 5.2, 2.6 + 0.9, 0.45);
    const lid = Math.max(held(t - 0.4, 0.32, 0.12), held(t - 3.6, 0.32, 0.12), held(t - 4.02, 0.28, 0.1), held(t - 7.6, 0.32, 0.12));
    const rk = held(t - 8.4, 0.9, 0.2);
    return owl(t, { br: Math.sin(W(2) * t), look: l1 > 0 ? l1 : l2, dir: l1 > 0 ? 1 : -1, big: l2 > 0, lid, ruffle: rk, rs: t - 8.4, chatW: 0, tiltW: W(1), nodW: W(1), bobW: 0, bob2W: 0 });
  },
};
// ------------------------------------------------------------------------------------------------ talk
// The game's talking, one line of it: eased in at 8 a second, the beak chattering and the head bobbing, eased out at
// the end (the page repeats it, a pause between lines). Breathing and a slow head tilt carry on under it.
const TD = 377 / 60, TW = (n) => TAU * n / TD;
const talk = {
  dur: TD, contact: [], feet: none,
  phases: [['speaks a line', 0], ['the line ends', TD - 0.4]],
  pose: (t) => { const k = Math.min(1 - Math.exp(-8 * t), 1 - Math.exp(-8 * (TD - t)));
    return owl(t, { br: Math.sin(TW(1) * t), talk: k, chatW: TW(13), tiltW: TW(1), nodW: TW(1), bobW: TW(9), bob2W: TW(7) }); },
};
// ------------------------------------------------------------------------------------------------ the page's other slots
// The bench always has these; for an NPC they are hidden on the page (it never walks, turns, is hurt, spawns or dies).
const still = (dur) => ({ dur, loop: true, feet: none, pose: () => ({}) });
export const CLIPS = { idle, walk: still(1), turnL: still(1), turnR: still(1), talk, hurt: { dur: 0.4, upperOnly: true, feet: none, pose: () => ({}) }, spawn: { dur: 0.5, contact: [], feet: none, pose: () => ({}) }, death: { dur: 0.5, contact: [], feet: none, pose: () => ({}) } };
