// Per-character build data (docs/gauntlet/PLAN.md §16.2, BUILD_BRIEF §25).
// Owner: PARTY. Pure data + pure helpers — no sim state, no DOM, no RNG.
//
// EVERY party member — Healer (seat 0), Tank (1), Swordsman (2), Archer (3) —
// has the Healer's build model: at most 4 equipped skills, 8 node sockets per
// skill, no rarity caps, the per-node repetition limits and the grey / inert
// verdicts, drawn from its OWN class skill pool and a class-matched node pool
// (the 6 class nodes + the shared nodes its fantasy allows, §25.3). The §7
// fixed kits are each ally's starting loadout.
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
export const ALLY_CLASS_IDS = Object.freeze(['tank', 'swordsman', 'archer']);

// §25.2 class skill pools, in the §25.2 table order (the 4 starting rows
// first). The rows themselves live in sim/skills.js SKILLS (cls-tagged).
export const CLASS_SKILLS = Object.freeze({
  tank: Object.freeze(['heavy_slam', 'brutal_cleave', 'ground_crack', 'whirling_guard', 'taunting_roar', 'shield_wall', 'shoulder_charge', 'iron_stance']),
  swordsman: Object.freeze(['flurry', 'lunge_strike', 'blade_storm', 'caltrops', 'fox_step', 'crescent_finisher', 'riposte', 'razor_wake']),
  archer: Object.freeze(['piercing_shot', 'volley', 'detonating_charge', 'sundering_nova', 'vault_shot', 'pinning_arrow', 'rain_of_arrows', 'kestrel_watch']),
});

// The §7 kits = the starting loadouts, in kit (= slot = key) order.
export const STARTING_LOADOUT = Object.freeze({
  tank: Object.freeze(['heavy_slam', 'brutal_cleave', 'ground_crack', 'whirling_guard']),
  swordsman: Object.freeze(['flurry', 'lunge_strike', 'blade_storm', 'caltrops']),
  archer: Object.freeze(['piercing_shot', 'volley', 'detonating_charge', 'sundering_nova']),
});

// §25.3 class nodes (6 per class, all techniques) — the rows live in
// sim/nodes.js NODES (cls-tagged).
export const CLASS_NODES = Object.freeze({
  tank: Object.freeze(['provoke', 'brace', 'tremor', 'anchor', 'retaliate', 'aegis']),
  swordsman: Object.freeze(['flow', 'momentum', 'parry', 'pursuit', 'lethality', 'execute']),
  archer: Object.freeze(['skewer', 'concussive', 'steady_aim', 'disengage', 'scatter', 'heartseeker']),
});

// §25.3 shared-node access per class (the Healer: all 17, unchanged).
export const SHARED_ACCESS = Object.freeze({
  tank: Object.freeze(['sharpen', 'quicken', 'multiply', 'ascend', 'widen', 'reach', 'linger', 'echo', 'snare', 'galvanize', 'bulwark', 'resonance']),
  swordsman: Object.freeze(['sharpen', 'quicken', 'multiply', 'ascend', 'widen', 'reach', 'keen', 'siphon', 'echo', 'detonate', 'galvanize', 'resonance']),
  archer: Object.freeze(['sharpen', 'quicken', 'multiply', 'ascend', 'reach', 'linger', 'keen', 'bounce', 'split', 'snare', 'detonate', 'echo', 'resonance']),
});

// A class's node pool, sorted ascending id (the §16 draw order).
export function nodePoolOf(classId) {
  if (!SHARED_ACCESS[classId]) return [];
  return [...SHARED_ACCESS[classId], ...CLASS_NODES[classId]].sort();
}

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

// After an AI swap the seat orders its 4 slots by priority (its cast order).
export function prioritySorted(classId, slots) {
  const list = AI_PRIORITY[classId] ?? [];
  return [...slots].sort((a, b) => rankOf(list, a) - rankOf(list, b));
}

// §25.5 supply per ally (the Healer keeps SPOILS_PER_CLEAR 2 / its wallet).
export const ALLY_SUPPLY = Object.freeze({ spoilsPerClear: 1, stipend: 12 });

// §25.7 deadlines, sim ticks (only with >= 2 humans in the session).
export const PARTY_DEADLINES = Object.freeze({
  pageTicks: 1800,
  doorTicks: 1800,
  shopTicks: 5400,
  shopAdvanceTicks: 900,
  socketHoldTicks: 480,
  countdownTicks: 600,
});

// §25.2 / §25.8: an equipped active ready and unused this long is cast under
// the §7 range rule, so no equipped skill idles.
export const AI_IDLE_FALLBACK_TICKS = 480;

// fix-M4a-r5 (content r5 F5, GP.8 — BUILD_BRIEF §25.8 engagement note): in a
// campaign run an AI-held seat ENGAGES instead of idling behind the ranged
// line. v0.5.165 measured 14 of 598 equipped actives never cast in combat
// rooms of 20 s+ over carried campaigns seeds 1-3 (the Swordsman's Flurry /
// Blade Storm, the Tank's Heavy Slam / Brutal Cleave in Level 1-2 defend
// rooms: the Archer and the Healer killed every wave 4-7 u out while the
// melee pair waited on the 3.4 u leash ring). The rules, all off in the
// ?room= harness (no run) and under the Node-only legacy switch, so the
// §16.9 goldens and the v0.5.150 proof keep their traces:
//   - vanguardU: the melee classes (Tank, Swordsman) may step out this much
//     past the §12 leash ring to meet a threat (3.4 + 2.0 = 5.4 u; the Archer
//     and the Healer keep 3.4). Dash / vault / lunge end points are capped by
//     the same per-seat ring.
//   - an OVERDUE active (ready >= AI_IDLE_FALLBACK_TICKS; firstUseTicks for
//     one not yet cast this room) is served before the higher slots (it never
//     starves behind them), takes the nearest hostile in its reach, and its
//     seat steers to bring one inside that reach (a parry opens with a hostile
//     inside its reach + lungeU, never lunging);
//   - a melee delivery (arc / nova) cast that way closes the last <= lungeU
//     with a short lunge (the Pursuit dash machinery, cause 'lunge', no
//     iframes) instead of swinging at air.
export const AI_ENGAGE = Object.freeze({ vanguardU: 2.0, lungeU: 1.2, lungeSpeed: 9, commitStandFrac: 0.8, firstUseTicks: 300 });
export const MELEE_CLASSES = Object.freeze(['tank', 'swordsman']);

// §25.2 taunt rules.
export const TAUNT = Object.freeze({ capTicks: 240, stagCapTicks: 60, stagImmuneTicks: 300 });

// The Ally builds mode (Settings ▸ Gameplay ▸ Ally builds).
export const PARTY_MODES = Object.freeze(['suggest', 'manual', 'auto']);

// §25.3 class-technique numbers (verbatim from the §25.3 tables).
export const CLASS_TECH = Object.freeze({
  provokeTicks: 90, // damage skill: hit non-boss enemies taunted onto the Tank
  provokeStagTicks: 45,
  provokeGuardTicks: 60, // Shield Wall: hostiles within 1.5 u of each recipient
  provokeGuardRadiusU: 1.5,
  provokePassiveTicks: 72, // Iron Stance: each pulse taunts the 2 nearest hostiles inside
  provokePassiveCount: 2,
  braceShield: 8, // per copy, every cast (240 ticks)
  braceTicks: 240,
  bracePassive: 2, // per copy per pulse (cap 12)
  bracePassiveCap: 12,
  tremorTicks: 18, // area deliveries: non-boss stun
  anchorPullU: 0.5, // area deliveries: pulled toward the Tank (zone: its centre)
  retaliateTicks: 120, // thorns window after the cast
  retaliateFrac: 0.25, // of the skill's flat-stage power, no crit roll
  aegisWard: 0.2, // Tank ward while the skill is on cooldown (<= 600 ticks)
  aegisMaxTicks: 600,
  aegisPassiveWard: 0.1, // Iron Stance: allies inside ward 10% (pulse-refreshed)
  flowCutSec: 0.3, // per copy, once per connecting cast
  flowPassiveCutSec: 0.1, // per copy per pulse that hits
  momentumPct: 0.12, // per distinct other skill cast in the last 120 ticks
  momentumMax: 0.36,
  recentWindowTicks: 120,
  parryTicks: 24, // after the cast; Riposte: window + 24
  parryCounterFrac: 0.5, // counter = one melee_arc instance at 50% resolved power
  pursuitDashU: 1.2, // self-anchored deliveries dash first; Fox Step +1.0 u
  pursuitFoxBonusU: 1.0,
  lethalityCritMul: 2.2, // crits from this skill x2.2 instead of x1.5
  executeFrac: 0.35, // x2 power on a hostile at or below 35% HP
  executeMul: 2,
  skewerPierce: 1, // per copy
  concussiveKb: 2, // knockback x2
  steadyAimPct: 0.4, // +40% if the Archer has not moved in the 30 ticks before the cast
  steadyAimStillTicks: 30,
  disengageU: 1.0, // hop away from the nearest hostile within 2.5 u (8 i-frame ticks)
  disengageRangeU: 2.5,
  disengageTicks: 8,
  disengageVaultBonusU: 0.8,
  scatterZoneFrac: 0.6, // 3 zones of 60% radius and 60% power in a triangle 0.8 u around the aim
  scatterOffsetU: 0.8,
  scatterShardFrac: 0.4, // a spent bolt bursts into 3 shards (±30°, 40% power, 1.5 u)
  scatterShardDeg: 30,
  scatterShardRangeU: 1.5,
});

// §25.10 MAX-STRESS build (GP.10 / GP.15 precondition; `?partygrant=max`,
// cmd('partyStress')): deterministic loadouts, and the socket fill order —
// the instance multipliers first, then the rest of the class pool ascending.
export const STRESS_LOADOUT = Object.freeze({
  healer: Object.freeze(['lantern_flurry', 'pale_lance', 'bell_toll', 'nova_bloom']),
  tank: Object.freeze(['taunting_roar', 'whirling_guard', 'ground_crack', 'iron_stance']),
  swordsman: Object.freeze(['flurry', 'blade_storm', 'caltrops', 'razor_wake']),
  archer: Object.freeze(['volley', 'rain_of_arrows', 'piercing_shot', 'kestrel_watch']),
});
export const STRESS_ORDER = Object.freeze(['echo', 'multiply', 'split', 'bounce', 'bounce', 'skewer', 'skewer', 'scatter', 'detonate', 'resonance']);
