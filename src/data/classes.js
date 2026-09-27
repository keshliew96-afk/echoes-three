// Per-character build data (docs/gauntlet/PLAN.md §16.2, BUILD_BRIEF §25).
// Owner: PARTY. Pure data + pure helpers — no sim state, no DOM, no RNG.
//
// Ruling A17 (the user's rule, 2026-09-27): "when the 4 slot of skill is
// full, player still pick skill wave, do not change it to node reward wave,
// instead the reward is still skill, but player can choose whether to replace
// one of the current 4 skill or not to replace". A skill reward for a
// character that holds 4 skills is a SWAP offer: the new skill replaces one
// of the 4 (the player's choice) or the player Leaves and keeps the loadout.
// The AI's choice (Suggested pre-picks, the autopilot, AI-held seats,
// timeouts) is the §25.8 priority rule below — one pure function for every
// seat.

// Seat = party index = class (fixed).
export const CLASS_OF_SEAT = Object.freeze(['healer', 'tank', 'swordsman', 'archer']);
export const SEAT_OF_CLASS = Object.freeze({ healer: 0, tank: 1, swordsman: 2, archer: 3 });
export const CLASS_NAME = Object.freeze({ healer: 'Healer', tank: 'Tank', swordsman: 'Swordsman', archer: 'Archer' });

// §25.8 equip priority (the AI's loadout converges to its top four). The
// Healer's (ruling A17) ranks sustain first — the default-build autopilot
// casts heals on the neediest member and damage at the nearest enemy.
export const AI_PRIORITY = Object.freeze({
  healer: Object.freeze([
    'mending_tide', 'guardian_bond', 'nova_bloom', 'mending_bolt', 'swift_mend',
    'kindred_shield', 'hearthsong', 'restorative_wave', 'dewfall', 'sanctuary',
    'quiet_hearth', 'warding_aura', 'bell_toll', 'pale_lance', 'lantern_flurry',
    'rootsnare', 'spirit_bolt',
  ]),
  tank: Object.freeze([
    'shield_wall', 'taunting_roar', 'heavy_slam', 'shoulder_charge',
    'whirling_guard', 'iron_stance', 'brutal_cleave', 'ground_crack',
  ]),
  swordsman: Object.freeze([
    'flurry', 'crescent_finisher', 'fox_step', 'lunge_strike',
    'riposte', 'blade_storm', 'razor_wake', 'caltrops',
  ]),
  archer: Object.freeze([
    'piercing_shot', 'volley', 'pinning_arrow', 'vault_shot',
    'rain_of_arrows', 'kestrel_watch', 'detonating_charge', 'sundering_nova',
  ]),
});

const rankOf = (list, id) => {
  const i = list.indexOf(id);
  return i < 0 ? list.length : i; // unknown ids rank last
};

// The §25.8 swap rule, shared by every seat. `slots` = the 4 owned skill ids
// in slot order (null for an empty slot). Returns the suggestion for a SWAP
// offer of `offered`:
//   { choice: 'take'|'leave', replace: slot }
// replace = the slot of the LOWEST-priority owned skill (ties: the higher
// slot, so a later key moves first); take iff `offered` outranks it. When
// the AI would Leave, `replace` still names that slot — the Replaces selector
// opens on it (§25.6) and the card on Leave.
export function swapSuggestion(classId, slots, offered) {
  const list = AI_PRIORITY[classId] ?? [];
  let worst = -1;
  let worstRank = -1;
  for (let i = 0; i < slots.length; i++) {
    const id = slots[i];
    if (!id) continue;
    const r = rankOf(list, id);
    if (r >= worstRank) {
      worstRank = r;
      worst = i;
    }
  }
  if (worst < 0) return { choice: 'take', replace: 0 };
  return { choice: rankOf(list, offered) < worstRank ? 'take' : 'leave', replace: worst };
}
