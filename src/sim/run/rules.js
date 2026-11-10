// THE RUN'S RULES (sim/run.js and its parts under sim/run/): the run frame's
// fixed numbers (§2, §14, §16), the path door glyphs, the tutorial room's
// gentler difficulty, and two small helpers the parts share.
import { TICK_HZ } from '../../core/constants.js';
import { SPOILS_PER_CLEAR } from '../draft.js';

// Plain-data deep copy (sim state only — structuredClone keeps -Infinity/NaN).
export const cloneData = (v) => (v === null || v === undefined ? v : structuredClone(v));

export const r2 = (v) => Math.round(v * 100) / 100;

// TUTORIAL (docs/TUTORIAL.md): the guided room's layout (Level 1's clearing
// with a dewfont) and how much gentler it is than a real room 1.
export const TUTORIAL_LAYOUT = 2;
export function tutorialDiff(d) {
  return Object.freeze({ ...d, budget: d.budget * 0.5, hpMul: d.hpMul * 0.6, dmgMul: d.dmgMul * 0.4, eliteChance: 0 });
}

export const RUN = Object.freeze({
  rooms: 8, // §2
  combatRooms: 6, // rooms 1-6
  defendCount: 2, // §2: exactly 2 of rooms 1-6 are defend
  shopRoom: 7, // §2 fixed
  bossRoom: 8, // §2 fixed
  stipend: 12, // §14 clear stipend, per combat-room clear (incl. boss)
  startingGlint: 0, // §14
  shopWallet: 72, // §14 deterministic wallet at the shop = 0 + 12x6
  spoilsPerClear: SPOILS_PER_CLEAR, // M4c: nodes dropped on the bench per combat-room clear (rooms 1-6)
  pathRooms: 5, // §2: rooms 1-5 clear -> path choice
  fadeTicks: Math.round(0.3 * TICK_HZ), // §16 enter/exit <= 300 ms fades
});

// §16 path doors carry ONLY these two glyph channels.
export const WIN_GLYPH = Object.freeze({ kill_all: '⚔', defend: '⛨', boss: '☠', event: '?', hunt: '➶', purge: '✹', escort: '⚑', hold: '◎', champion: '♛', vault: '⚿' });
export const REWARD_GLYPH = Object.freeze({ skill: '✦', node: '◈' });
