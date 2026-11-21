// The First Bell's moves (the Wandering Spirit, an encounter: no walk, no attacks, no talk). Units are model units (the
// page draws it CFG.unit times bigger). Timings come from the game's prop, propSpirit in
// src/render/interactables/encounters.js: the spirit floats 0.25 u up, bobbing 0.12 u on 1.6 rad a second and turning
// 0.2 rad side to side on 0.7 rad a second (its see-through skin breathing on 2.3 rad a second is drawn by the page);
// when the party gives up its newest relic it swirls: over 0.9 s it rises 0.6 u, spins 9 rad and fades to a quarter,
// pale embers rising round it, and it stays up there, faded, while the bob and turn carry on.
export const CFG = {
  name: 'firstbell', unit: 1.1, base: {},
  chain: [['hips', 'b']], extras: [['head', 'h'], ['earL', 'eL'], ['earR', 'eR']], legs: {}, springs: [],
};
const U = CFG.unit, TAU = 2 * Math.PI;
const spirit = (t, wb, wy, s) => ({ oy: (0.25 + 0.12 * Math.sin(wb * t) + 0.6 * s) / U, by: 0.2 * Math.sin(wy * t) + 9 * s });
// ------------------------------------------------------------------------------------------------ idle
// One loop of 27 s: seven bobs and three turns (1.63 and 0.70 rad a second, rounded so both close).
const ID = 1620 / 60, WB = TAU * 7 / ID, WY = TAU * 3 / ID;
const idle = { dur: ID, loop: true, feet: () => ({}), pose: (t) => spirit(t, WB, WY, 0) };
// ------------------------------------------------------------------------------------------------ the trade
const TD = 150 / 60;
const trade = {
  dur: TD, contact: [0.05], feet: () => ({}),
  phases: [['takes the relic and swirls up', 0], ['hangs there, faded', 0.9]],
  pose: (t) => spirit(t, WB, WY, Math.min(1, t / 0.9)),
};
const still = (dur) => ({ dur, loop: true, feet: () => ({}), pose: () => spirit(0, WB, WY, 0) });
export const CLIPS = { idle, walk: still(1), turnL: still(1), turnR: still(1), trade, hurt: { dur: 0.4, upperOnly: true, feet: () => ({}), pose: () => spirit(0, WB, WY, 0) }, spawn: { dur: 0.5, contact: [], feet: () => ({}), pose: () => spirit(0, WB, WY, 0) }, death: { dur: 0.5, contact: [], feet: () => ({}), pose: () => spirit(0, WB, WY, 0) } };
