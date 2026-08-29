// Draft candidates + shop stock (BUILD_BRIEF §16 "Draft"/"Shop", §14 prices,
// §15.5 "Draft/shop pools filter by usable_by_party").
//
// Binding rules implemented here:
//   - Draft = ONE candidate, take-or-decline. No reroll, no confirm, no
//     reopen — this module only ever hands back a single candidate.
//   - Skill pool = the 6 draftable healer skills MINUS owned, and it is empty
//     the moment `free_skill_slots == 0` (a skill with nowhere to go is not a
//     candidate). Node pool = the 8 nodes filtered by `usable_by_party`.
//   - Uniform seeded draw from the pool SORTED ASCENDING BY ID (§16) — the
//     sort is what makes one seed reproduce one candidate.
//   - Empty promised pool => substitute the other type with an explicit line
//     ("no slot free — offering a Node instead"); both empty => "the run moves
//     on" + Continue.
//   - Shop: 3 cards drawn without replacement from the same live filtered
//     pool, priced by rarity 25/30/35 (§14).
//
// Sim discipline: no DOM, no render imports, no wall clock. Every draw comes
// from the seeded gameplay stream in a fixed order, so one seed replays one
// run frame.
import { SKILLS, STARTING_SKILLS } from './skills.js';
import { NODES, RARITY_RANK } from './nodes.js';

// §16 "Skill pool = 6 draftable healer skills − owned": the 8 authored healer
// skills minus the 2 the Healer starts with. Sorted ascending id (the §16
// draw order).
export const DRAFTABLE_SKILL_IDS = Object.freeze(
  Object.keys(SKILLS)
    .filter((id) => !STARTING_SKILLS.includes(id))
    .sort()
);

export const NODE_IDS = Object.freeze(Object.keys(NODES).sort());

// §14 shop prices by rarity.
export const PRICES = Object.freeze({ common: 25, rare: 30, legendary: 35 });
export const RARITY_ORDER = Object.freeze(['common', 'rare', 'legendary']);

// §16 substitution copy, verbatim for the skill->node case (the one the brief
// spells out); the mirrored case reads the same way.
export const SUBSTITUTE_LINE = Object.freeze({
  node: 'no slot free — offering a Node instead',
  skill: 'nothing in your kit sockets a Node — offering a Skill instead',
});
export const EMPTY_LINE = 'the run moves on';

// build  = () => the build system (nodes block) — pools read its verdicts.
// slots  = () => skillSys.slotsView() (4 entries, null = empty slot).
export function createDraftSystem({ rng, build, slots }) {
  const ownedSkillIds = () => slots().filter(Boolean).map((s) => s.id);
  const freeSkillSlots = () => slots().filter((s) => !s).length;

  // §15.5 `usable_by_party`: "∃ owned skill + VACANT slot where the node is
  // non-grey, FITS THE CAP, and is WITHIN ITS LIMIT". All four clauses, read
  // off the live build state — a node that could only land greyed, or that no
  // vacant socket would accept, never enters a pool.
  function usableByParty(nodeId) {
    const sys = build();
    if (!sys) return false;
    const info = sys.nodeInfo(nodeId);
    if (!info) return false;
    for (const sk of sys.view().skills) {
      const copies = sk.sockets.filter((s) => s && s.node === nodeId).length;
      if (copies >= info.limit) continue; // limit already reached on this skill
      for (let i = 0; i < sk.caps.length; i++) {
        if (sk.sockets[i]) continue; // needs a VACANT slot
        if (info.rarityRank > RARITY_RANK[sk.caps[i]]) continue; // cap
        if (sys.verdictFor(sk.id, nodeId).state === 'grey') continue; // non-grey
        return true;
      }
    }
    return false;
  }

  function skillPool() {
    if (freeSkillSlots() === 0) return []; // nowhere to put it => not a candidate
    const owned = new Set(ownedSkillIds());
    return DRAFTABLE_SKILL_IDS.filter((id) => !owned.has(id));
  }

  function nodePool() {
    return NODE_IDS.filter(usableByParty);
  }

  // ONE candidate for a promised reward type. Returns
  //   { type: 'skill'|'node'|null, id, promised, substituted, line, freeSkillSlots }
  function offer(promised) {
    const pools = { skill: skillPool(), node: nodePool() };
    let type = promised;
    let substituted = false;
    if (pools[type].length === 0) {
      const other = type === 'skill' ? 'node' : 'skill';
      if (pools[other].length === 0) {
        return {
          type: null,
          id: null,
          promised,
          substituted: false,
          line: EMPTY_LINE,
          freeSkillSlots: freeSkillSlots(),
          poolSize: 0,
        };
      }
      type = other;
      substituted = true;
    }
    const pool = pools[type]; // already ascending-id (both builders sort)
    const id = pool[rng.int(pool.length)];
    return {
      type,
      id,
      promised,
      substituted,
      line: substituted ? SUBSTITUTE_LINE[type] : null,
      freeSkillSlots: freeSkillSlots(),
      poolSize: pool.length,
    };
  }

  // §16 shop: 3 node cards WITHOUT REPLACEMENT from the live filtered pool.
  // The draw is stratified one-per-rarity so the three §14 price points
  // (25/30/35) are the ones actually on the shelf — ruling A2 sizes the node
  // pool for exactly that ("Rarity spread keeps all three shop price points
  // reachable"), and the §14 wallet invariants are authored against those
  // three numbers. If a rarity band is empty after the usable_by_party filter,
  // the slot is backfilled from what is left (and with <3 eligible nodes the
  // shelf simply shows fewer, §16).
  function shopStock() {
    const avail = nodePool();
    const bands = { common: [], rare: [], legendary: [] };
    for (const id of avail) bands[NODES[id].rarity].push(id);
    const picked = [];
    const taken = new Set();
    for (const rarity of RARITY_ORDER) {
      const band = bands[rarity].filter((id) => !taken.has(id));
      if (band.length === 0) continue;
      const id = band[rng.int(band.length)];
      taken.add(id);
      picked.push({ node: id, rarity, price: PRICES[rarity] });
    }
    if (picked.length < 3) {
      const rest = avail.filter((id) => !taken.has(id));
      while (picked.length < 3 && rest.length > 0) {
        const id = rest.splice(rng.int(rest.length), 1)[0];
        taken.add(id);
        picked.push({ node: id, rarity: NODES[id].rarity, price: PRICES[NODES[id].rarity] });
      }
    }
    return picked;
  }

  // "you own N" (§16): copies on the bench plus copies already socketed.
  function ownedCount(nodeId) {
    const sys = build();
    if (!sys) return 0;
    const v = sys.view();
    let n = v.bench.filter((b) => b.node === nodeId).length;
    for (const sk of v.skills) n += sk.sockets.filter((s) => s && s.node === nodeId).length;
    return n;
  }

  return {
    offer,
    shopStock,
    ownedCount,
    usableByParty,
    skillPool,
    nodePool,
    freeSkillSlots,
    ownedSkillIds,
  };
}
