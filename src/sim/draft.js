// Draft candidates + shop stock (BUILD_BRIEF §16 "Draft"/"Shop", §14 prices,
// §15.5 "Draft/shop pools filter by usable_by_party").
//
// Binding rules implemented here:
//   - Draft = ONE candidate, take-or-decline. No reroll, no confirm, no
//     reopen — this module only ever hands back a single candidate.
//   - Skill pool = the draftable healer skills (15 after §23.3) MINUS owned,
//     and it is empty the moment `free_skill_slots == 0` (free = 4 − owned:
//     the player equips at most 4 skills, M4c) — a skill with nowhere to go
//     is never a candidate. Node pool = the 17 nodes filtered by
//     `usable_by_party`.
//   - Uniform seeded draw from the pool SORTED ASCENDING BY ID (§16) — the
//     sort is what makes one seed reproduce one candidate.
//   - Empty promised pool => substitute the other type with an explicit line
//     ("no slot free — offering a Node instead"); both empty => "the run moves
//     on" + Continue.
//   - Shop (M4c node-supply rebalance for 8 sockets per skill): 4 cards drawn
//     without replacement from the same live filtered pool, stratified 2
//     common + 1 rare + 1 legendary, priced 15 / 20 / 25 (§14 as restated:
//     all four = 75 > 72, any three ≤ 60 ≤ 72).
//   - Clear spoils (M4c): every combat-room clear drops SPOILS_PER_CLEAR nodes
//     on the bench, drawn without replacement from the live usable pool's
//     commons and rares.
//
// Sim discipline: no DOM, no render imports, no wall clock. Every draw comes
// from the seeded gameplay stream in a fixed order, so one seed replays one
// run frame.
import { SKILLS, STARTING_SKILLS } from './skills.js';
import { NODES } from './nodes.js';

// §16 "Skill pool = draftable healer skills − owned": every authored healer
// skill (17 after §23.3) minus the 2 the Healer starts with = 15. Sorted ascending id (the §16
// draw order).
export const DRAFTABLE_SKILL_IDS = Object.freeze(
  Object.keys(SKILLS)
    .filter((id) => !STARTING_SKILLS.includes(id))
    .sort()
);

export const NODE_IDS = Object.freeze(Object.keys(NODES).sort());

// §14 shop prices by rarity — M4c rebalance (4 skills × 8 sockets = 32
// sockets to feed): 15 / 20 / 25 (were 25 / 30 / 35 for a 3-card shelf and
// 2-socket rows). With the deterministic 72 Glint at the shop the §14
// invariants read: the whole 4-card shelf = 15+15+20+25 = 75 > 72 (never all
// of it), any three ≤ 15+20+25 = 60 ≤ 72 (any three affordable).
export const PRICES = Object.freeze({ common: 15, rare: 20, legendary: 25 });
export const RARITY_ORDER = Object.freeze(['common', 'rare', 'legendary']);
// Shelf strata, in draw order: two commons, one rare, one legendary.
export const SHOP_STRATA = Object.freeze(['common', 'common', 'rare', 'legendary']);
export const SHOP_SIZE = SHOP_STRATA.length;
// Clear spoils per combat-room clear (rooms 1-6; forfeited with the reward on
// a defend soft-fail). Commons and rares only: legendaries stay the chase
// items of drafts and the shop.
export const SPOILS_PER_CLEAR = 2;
export const SPOILS_RARITIES = Object.freeze(['common', 'rare']);

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

  // §15.5 `usable_by_party`: "∃ owned skill + VACANT socket where the node is
  // non-grey and WITHIN ITS LIMIT" (M4c: no socket has a rarity cap any more,
  // so the old "fits the cap" clause is gone). Read off the live build state —
  // a node that could only land greyed, or that no vacant socket would take,
  // never enters a pool.
  function usableByParty(nodeId) {
    const sys = build();
    if (!sys) return false;
    const info = sys.nodeInfo(nodeId);
    if (!info) return false;
    for (const sk of sys.view().skills) {
      const copies = sk.sockets.filter((s) => s && s.node === nodeId).length;
      if (copies >= info.limit) continue; // limit already reached on this skill
      if (!sk.sockets.some((s) => s === null)) continue; // needs a VACANT socket
      if (sys.verdictFor(sk.id, nodeId).state === 'grey') continue; // non-grey
      return true;
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

  // §16 shop: SHOP_SIZE (4) node cards WITHOUT REPLACEMENT from the live
  // filtered pool. The draw is stratified (2 common, 1 rare, 1 legendary) so
  // all three §14 price points (15/20/25) are on the shelf — ruling A2 sizes
  // the node pool for exactly that — and the §14 invariants above are
  // authored against that shelf. If a rarity band is empty after the
  // usable_by_party filter, the slot is backfilled from what is left (and
  // with fewer eligible nodes the shelf simply shows fewer, §16).
  function shopStock() {
    const avail = nodePool();
    const bands = { common: [], rare: [], legendary: [] };
    for (const id of avail) bands[NODES[id].rarity].push(id);
    const picked = [];
    const taken = new Set();
    for (const rarity of SHOP_STRATA) {
      const band = bands[rarity].filter((id) => !taken.has(id));
      if (band.length === 0) continue;
      const id = band[rng.int(band.length)];
      taken.add(id);
      picked.push({ node: id, rarity, price: PRICES[rarity] });
    }
    if (picked.length < SHOP_SIZE) {
      const rest = avail.filter((id) => !taken.has(id));
      while (picked.length < SHOP_SIZE && rest.length > 0) {
        const id = rest.splice(rng.int(rest.length), 1)[0];
        taken.add(id);
        picked.push({ node: id, rarity: NODES[id].rarity, price: PRICES[NODES[id].rarity] });
      }
    }
    return picked;
  }

  // Clear spoils (M4c): `n` distinct nodes, drawn without replacement from
  // the live usable pool's commons and rares (sorted ascending id, one seeded
  // draw each — the §16 draw discipline). Fewer when the pool is smaller.
  function spoils(n = SPOILS_PER_CLEAR) {
    const pool = nodePool().filter((id) => SPOILS_RARITIES.includes(NODES[id].rarity));
    const out = [];
    while (out.length < n && pool.length > 0) out.push(pool.splice(rng.int(pool.length), 1)[0]);
    return out;
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
    spoils,
    ownedCount,
    usableByParty,
    skillPool,
    nodePool,
    freeSkillSlots,
    ownedSkillIds,
  };
}
