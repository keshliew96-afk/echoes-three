// The Corrupted Altar's moves (the Hollow Voice speaks through it; an encounter: no walk, no attacks). Units are model
// units (the page draws it CFG.unit times bigger). Timings come from the game's prop, propAltar in
// src/render/interactables/encounters.js: the shard floats at 1.35 u, bobbing 0.1 u on 1.4 rad a second and turning
// 0.9 rad a second (its violet glow pulsing 0.45 + 0.3 max(0, sin 3.2t), drawn by the page); when the party takes the
// curse the shard cracks, shrinking to 40% over 0.5 s and its glow falling by 70%, with a violet burst (embers and an
// impact spray), and stays that way while it keeps floating and turning.
export const CFG = {
  name: 'altar', unit: 1.25, base: {},
  chain: [['hips', 'b']], extras: [['crystal', 'k'], ['candleL', 'cl'], ['candleR', 'cr']],
  scales: [['crystal', 'ks']], legs: {}, springs: [],
};
const U = CFG.unit, TAU = 2 * Math.PI, CY = 0.68;
// the crystal's middle sits at CY in the model; the game floats it at 1.35 u
const shard = (t, wb, wy, gone) => ({ kb: (1.35 + 0.1 * Math.sin(wb * t)) / U - CY, ky: wy * t, ks: -0.6 * gone });
// ------------------------------------------------------------------------------------------------ idle
// One loop of 14 s: two turns and three bobs (0.90 and 1.35 rad a second, the bob rounded so both close).
const ID = 838 / 60, WB = TAU * 3 / ID, WY = TAU * 2 / ID;
const idle = { dur: ID, loop: true, feet: () => ({}), pose: (t) => shard(t, WB, WY, 0) };
// ------------------------------------------------------------------------------------------------ the curse
const TD = 150 / 60;
const curse = {
  dur: TD, contact: [0.05], feet: () => ({}),
  phases: [['the curse is taken: the shard cracks', 0], ['cracked, it floats on', 0.5]],
  pose: (t) => shard(t, WB, WY, Math.min(1, t / 0.5)),
};
const still = (dur) => ({ dur, loop: true, feet: () => ({}), pose: () => shard(0, WB, WY, 0) });
export const CLIPS = { idle, walk: still(1), turnL: still(1), turnR: still(1), curse, hurt: { dur: 0.4, upperOnly: true, feet: () => ({}), pose: () => shard(0, WB, WY, 0) }, spawn: { dur: 0.5, contact: [], feet: () => ({}), pose: () => shard(0, WB, WY, 0) }, death: { dur: 0.5, contact: [], feet: () => ({}), pose: () => shard(0, WB, WY, 0) } };
