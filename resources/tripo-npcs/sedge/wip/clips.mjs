// Sedge's moves (the Lost Pilgrim, an encounter: no walk, no attacks, no talk). Units are model units (the page draws it
// CFG.unit times bigger). Timings come from the game's prop, propPilgrim in src/render/interactables/encounters.js: a
// slow sway side to side (0.03 rad on 1.1 rad a second) and the lantern's glow flickering (5.3 and 13 rad a second);
// when the party gives the 20 Glint, a bow (0.35 rad, sin(pi * bow) as bow runs down from 1 at 0.9 a second, so 1.1 s)
// and amber embers rising round the lantern. The game tips the whole figure from the floor; here it bows from the waist
// with the feet planted, the staff leaning with the hand on it and the lantern hanging true.
import { smooth } from '../../mobs/kit/quad.mjs';
export const CFG = {
  name: 'sedge', unit: 1.5, base: {},
  chain: [['hips', 'b'], ['spine', 's'], ['chest', 'c'], ['head', 'h']],
  extras: [['staff', 'st'], ['lantern', 'l']],
  legs: {}, springs: [],
};
const TAU = 2 * Math.PI;
// sway (rad, + one way), bow (rad, + forward), lag (the lantern trailing the bow), lw (the lantern's own swing)
function pilgrim(o) {
  const sw = o.sway, B = o.bow;
  return {
    br: 0.5 * sw, sr: 0.25 * sw, cr: 0.25 * sw,
    bp: -0.45 * B, sp: -0.25 * B, cp: -0.15 * B, hp: -0.15 * B,
    stp: -0.2 * B, str: 0.5 * sw,
    lp: 0.2 * B + o.lag, lr: -0.5 * sw + o.lw,
  };
}
const bowAt = (t) => { const k = 1 - 0.9 * t; return k <= 0 || t < 0 ? 0 : 0.35 * Math.sin(Math.PI * Math.min(1, k)); };
// ------------------------------------------------------------------------------------------------ idle
// One sway, 5.7 s (the sway rounded to a whole number of frames). The lantern swings a touch behind it.
const ID = 343 / 60, WS = TAU / ID;
const idle = {
  dur: ID, loop: true, feet: () => ({}),
  pose: (t) => pilgrim({ sway: 0.03 * Math.sin(WS * t), bow: 0, lag: 0, lw: 0.04 * Math.sin(WS * t - 0.6) }),
};
// ------------------------------------------------------------------------------------------------ the gift
// The party gives 20 Glint: the bow, 1.1 s, then the sway carries on; embers rise round the lantern at once.
const GD = 150 / 60;
const gift = {
  dur: GD, contact: [0.05], feet: () => ({}),
  phases: [['takes the Glint and bows', 0], ['straightens', 0.56], ['sways on', 1.11]],
  pose: (t) => pilgrim({ sway: 0.03 * Math.sin(WS * t), bow: bowAt(t), lag: 0.5 * (bowAt(t - 0.14) - bowAt(t)), lw: 0.04 * Math.sin(WS * t - 0.6) }),
};
const still = (dur) => ({ dur, loop: true, feet: () => ({}), pose: () => ({}) });
export const CLIPS = { idle, walk: still(1), turnL: still(1), turnR: still(1), gift, hurt: { dur: 0.4, upperOnly: true, feet: () => ({}), pose: () => ({}) }, spawn: { dur: 0.5, contact: [], feet: () => ({}), pose: () => ({}) }, death: { dur: 0.5, contact: [], feet: () => ({}), pose: () => ({}) } };
