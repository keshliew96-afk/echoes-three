// Linear campaign data (docs/gauntlet/PLAN.md §12, BUILD_BRIEF §24 / ruling
// A15 — the user's CRITICAL REFACTOR of 2026-09-25). Owner: CAMPAIGN.
//
// A CAMPAIGN is one continuous run from a starting level through the final
// level: Level 1 The Hollow Wood -> Level 2 The Sunken Mill -> Level 3 The
// Ashen Barrow -> Level 4 The Hollow Heart (Act IV, docs/ACT_IV.md). The
// order is DATA (derived from data/levels.js ACT_IDS), so Level 4 was
// appended by adding a LEVELS row — nothing here or in sim/run.js names a
// level by number.
//
// Pure data + pure helpers (sim-importable): no DOM, no three, no wall clock.
import { ACT_IDS, levelFor } from './levels.js';

// The campaign's level order (ascending level ids).
export const CAMPAIGN_LEVELS = Object.freeze([...ACT_IDS].sort((a, b) => a - b));
export const FIRST_LEVEL = CAMPAIGN_LEVELS[0];
export const FINAL_LEVEL = CAMPAIGN_LEVELS[CAMPAIGN_LEVELS.length - 1];

export const isLevel = (n) => CAMPAIGN_LEVELS.includes(Number(n));

// The level after `level` in campaign order, or null after the final one.
export function nextLevel(level) {
  const i = CAMPAIGN_LEVELS.indexOf(Number(level));
  return i >= 0 && i < CAMPAIGN_LEVELS.length - 1 ? CAMPAIGN_LEVELS[i + 1] : null;
}

// The level before `level`, or null for the first one (the unlock chain).
export function prevLevel(level) {
  const i = CAMPAIGN_LEVELS.indexOf(Number(level));
  return i > 0 ? CAMPAIGN_LEVELS[i - 1] : null;
}

// "Clear The Hollow Wood to unlock" — the one lock line every surface uses.
export function lockLine(level) {
  const p = prevLevel(level);
  return p === null ? 'Locked' : `Clear ${levelFor(p).name} to unlock`;
}

// ---------------------------------------------------------------------------
// CARRY / RESTORE / RESET — one table of named constants (PLAN §12.3). The
// run system reads these at every level transition inside one campaign, so a
// rule is flipped here and nowhere else. Carry and restore flags are real
// behaviour switches (the Node probes flip them); the reset flags complete the
// table and must stay true in a shipping build — flipping one leaks by
// definition.
export const CARRY_RULES = Object.freeze({
  // CARRY — kept across the transition.
  carrySkills: true, // equipped skills (<= 4) keep their slots (false: back to the starting kit)
  carrySockets: true, // every socketed node stays socketed (false: onto the bench when carryBench, else dropped)
  carryBench: true, // unsocketed nodes on the bench (false: bench emptied)
  carryGlint: true, // the wallet (false: 0)
  carryHealOverride: true, // the F1-F4 heal-target override is not touched (§8 room clear already clears it at the Stag's clear)
  carrySeedStream: true, // the run RNG stream continues (false: reseeded from one draw)
  carryRecords: true, // campaign counters (levels, rooms, time, Glint earned) accumulate
  // RESTORE — the transition is a respite.
  restoreHp: true, // every party member to max HP
  reviveDowned: true, // downed members stand up
  clearStatuses: true, // every status on the party cleared
  resetCooldowns: true, // skill cooldowns ready; dodge and basic ready
  // RESET — nothing may leak into the next level.
  resetEntities: true, // enemies, adds, projectiles, skill bolts, zones, ally zones, hazards, interactables
  resetDirector: true, // wave director stopped, boss state reset, room layout exited
  resetShop: true, // the level's shop stock dropped (the next level's shop rolls its own)
  resetPresentation: true, // decals, particles, numerals, telegraphs, threat markers, level VFX + audio voices + dressing
});

// ---------------------------------------------------------------------------
// TRANSITION CARD timing (sim ticks at 60 Hz; PLAN §12.2 / §12.5).
export const TRANSIT = Object.freeze({
  clearTicks: 180, // the level-clear card auto-advances after ~3 s (once the next level is ready)
  departTicks: 120, // the setting-out card of a Level-N start (N > 1) shows the starter grant ~2 s
  minSkipTicks: 30, // Enter may skip the card after 0.5 s (settle: a held/mashed key never skips it)
  hardTicks: 600, // the sim advances on its own after 10 s whatever the presentation does
  readyTimeoutMs: 6000, // presentation: stop waiting for the preload 6 s (wall) after the card appeared
  victoryReturnTicks: 600, // CAMPAIGN COMPLETE card -> camp automatically after 10 s of sim time
});

// ---------------------------------------------------------------------------
// STARTER GRANT for a start AT level N > 1 (PLAN §12.4). Applied at the
// start, before any combat, from the run RNG in a fixed order: skill draws
// (the draft system's live skill pool), then node draws in pairs (the clear-
// spoils rule: commons + rares of the usable pool, provenance 'grant') with
// the shared auto-fill after every pair, then `legendaries` draws from the
// legendary band, then Glint. Tuned against the §4.2 band (PLAN §12.10,
// BUILD_BRIEF §23.2 CAMPAIGN note): a Level-N start with this grant lands in
// the same band as a carried campaign that reached Level N.
// PARTY (BUILD_BRIEF §25.10): `allies` = what EACH ally additionally
// receives (party stream, after the Healer's grant, seat order): `swaps` swap
// offers resolved by the §25.8 AI rule, `nodes` in pairs with auto-fill,
// `legendaries`, purse `glint`. Retuned by PARTY (2026-09-28, BUILD_BRIEF
// §23.2 PARTY note): Level 3 = the median carried ally at the Level 2 -> 3
// card (2 new skills, 21 sockets filled, 43 Glint: 3 offers of which the AI
// takes ~2, 19 nodes + 2 legendaries); Level 2 sits BELOW the carried median
// (2 new skills, 12 filled, 34 Glint) — 1 offer, 9 nodes + 1 legendary —
// because a Level-2 start must stay in the band against the v0.5.150
// Level-2-start baseline, whose party (the Healer's grant) was weaker than
// a carried one.
export const STARTER_GRANT = Object.freeze({
  // fix-M4a-r5 (GP.13 (b)): the Level-2 ally grant 9 nodes + 1 legendary ->
  // 3 nodes + 0 (the AI engagement made a granted party x0.57-0.68 of the
  // v0.5.150 Level-2-start damage; the Healer's own grant is unchanged).
  2: Object.freeze({ skills: 2, nodes: 18, legendaries: 1, glint: 34, allies: Object.freeze({ swaps: 1, nodes: 3, legendaries: 0, glint: 34 }) }),
  3: Object.freeze({ skills: 2, nodes: 30, legendaries: 2, glint: 60, allies: Object.freeze({ swaps: 3, nodes: 19, legendaries: 2, glint: 43 }) }),
  // Act IV (docs/ACT_IV.md): a Level-4 start gets a full Level-3 build plus
  // one Level's worth more (the carried build is 32/32 by then).
  4: Object.freeze({ skills: 2, nodes: 40, legendaries: 3, glint: 80, allies: Object.freeze({ swaps: 4, nodes: 26, legendaries: 3, glint: 56 }) }),
});

export function grantFor(level) {
  return STARTER_GRANT[Number(level)] ?? null;
}

// Plain-data view of the whole rule set (the probe / UI surface).
export function campaignRules() {
  return {
    levels: [...CAMPAIGN_LEVELS],
    first: FIRST_LEVEL,
    final: FINAL_LEVEL,
    carry: { ...CARRY_RULES },
    transit: { ...TRANSIT },
    grants: Object.fromEntries(Object.entries(STARTER_GRANT).map(([k, v]) => [k, { ...v }])),
  };
}
