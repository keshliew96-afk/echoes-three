// §4 Closed intent vocabulary — humans and AI both act only through these.
// Continuous intents are held states sampled every tick; discrete intents are
// edge-triggered presses, at most one of each KIND per tick (duplicates are
// denied `duplicate_in_tick`). This module is pure data + snapshot shape —
// shared by the controller layer (core/input.js, AI controllers later) and the
// sim; it must never touch the DOM.

export const CONTINUOUS_INTENTS = Object.freeze([
  'move', // Vec2, pre-normalized (no faster diagonals)
  'aim', // world position under the cursor (y=0 plane)
  'basic_attack', // held bool
  'revive_hold', // held bool
]);

export const DISCRETE_INTENTS = Object.freeze([
  'dodge',
  'skill_1',
  'skill_2',
  'skill_3',
  'skill_4',
  // Reserved (docs/gauntlet/PLAN.md §4.3): SKILL_SLOTS is 4 — the player
  // equips at most 4 skills (M4c user correction; the content extension's 8
  // are node sockets per skill). No key and no sim path produces skill_5..8;
  // the names stay in the closed vocabulary so the net press-bit tables keep
  // their wire layout.
  'skill_5',
  'skill_6',
  'skill_7',
  'skill_8',
  // Interactable use (PLAN §4.6, M4b): a discrete press on KeyE, alongside the
  // held `revive_hold` the same key already drives. The world ignores it
  // until the interactables system resolves it (after revive arbitration: a
  // press next to a Downed ally is a revive, never an interaction).
  'interact',
  'rally', // player-only
  'target_cycle', // player-only
  'target_select', // player-only, carries index 0-3
]);

// §4 denial reason codes — denied intents are no-ops (no queue, no refund)
// but emit `intent_denied` for HUD nudges (§17).
export const DENIAL = Object.freeze({
  onCooldown: 'on_cooldown',
  emptySlot: 'empty_slot',
  prioritySuppressed: 'priority_suppressed',
  duplicateInTick: 'duplicate_in_tick',
  notAnchor: 'not_anchor',
  reviveOccupied: 'revive_occupied',
});

// The per-tick snapshot every controller (human or AI) produces.
// presses: array of { kind, slot?, index? } in press order; the sim resolves
// them in the §4 total order, not press order.
export function emptySnapshot() {
  return {
    move: { x: 0, z: 0 },
    aim: null, // { x, z } world position, or null if never aimed
    basicAttackHeld: false,
    reviveHeld: false,
    presses: [],
  };
}
