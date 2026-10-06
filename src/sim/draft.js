// Draft candidates + shop stock (BUILD_BRIEF §16 "Draft"/"Shop", §14 prices,
// §15.5 "Draft/shop pools filter by usable_by_party").
//
// Binding rules implemented here:
//   - Draft = ONE candidate, take-or-decline. No reroll, no confirm, no
//     reopen — this module only ever hands back a single candidate.
//   - Skill pool = the Healer's class skills MINUS owned (= the 15 draftable
//     − owned while the starting skills are held). With `free_skill_slots
//     == 0` (free = 4 − owned: at most 4 skills, M4c) a skill candidate is a
//     SWAP offer (ruling A17, the user's rule of 2026-09-27: "the reward is
//     still skill, but player can choose whether to replace one of the
//     current 4 skill or not to replace") — never a 5th skill, never turned
//     into a node. Node pool = the 17 nodes filtered by `usable_by_party`.
//   - Uniform seeded draw from the pool SORTED ASCENDING BY ID (§16) — the
//     sort is what makes one seed reproduce one candidate.
//   - Empty promised NODE pool => substitute a skill (a swap offer when full)
//     with an explicit line; both empty => "the run moves on" + Continue (the
//     skill pool no longer empties, so this is defensive).
//   - Shop (M4c node-supply rebalance for 8 sockets per skill): 4 cards drawn
//     without replacement from the same live filtered pool, stratified 2
//     common + 1 rare + 1 legendary, priced 15 / 20 / 25 (§14 as restated:
//     all four = 75 > 72, any three ≤ 60 ≤ 72).
//   - Clear spoils (M4c): every combat-room clear drops SPOILS_PER_CLEAR nodes
//     on the bench, drawn without replacement from the live usable pool's
//     commons and rares.
//   - A FULL build keeps progressing (fix-M4a-r4, CONTENT4-F1). Every pool is
//     LAYERED: the FILL pool (`usable_by_party`: a vacant socket where the
//     node works) is drawn first, exactly as before; only when it cannot
//     serve a draw does the UPGRADE pool step in — nodes with no vacant
//     usable socket that OUTRANK a socketed node (a grey / +0 occupant, or a
//     lower rarity; buildSys.upgradeFor(), the policy auto-fill swaps by). A
//     node offer, a spoils top-up and an empty shop stratum therefore never
//     come back empty while the build can still improve; the offer carries
//     `pool: 'upgrade'` + the swap target. Both layers empty with 4 skills
//     owned = the build is COMPLETE (reason 'build_complete') — the only case
//     the §16 "the run moves on" page remains for.
//
// Sim discipline: no DOM, no render imports, no wall clock. Every draw comes
// from the seeded gameplay stream in a fixed order, so one seed replays one
// run frame.
import { SKILLS, STARTING_SKILLS, HEALER_SKILL_IDS } from './skills.js';
import { NODES, SHARED_NODE_IDS } from './nodes.js';

// §16 "Skill pool = draftable healer skills − owned": every authored healer
// skill (17 after §23.3) minus the ones the Healer starts with (none since
// v0.5.227, so all 17). Sorted ascending id (the §16 draw order).
export const DRAFTABLE_SKILL_IDS = Object.freeze(
  HEALER_SKILL_IDS.filter((id) => !STARTING_SKILLS.includes(id))
);

// The Healer's node pool: the 17 shared nodes (PARTY class nodes excluded —
// PLAN §16.2 reader hazard).
export const NODE_IDS = SHARED_NODE_IDS;

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
// Why a reward came back empty (the draft page words it — never "spent").
export const EMPTY_REASON = Object.freeze({
  build_complete: 'build_complete', // 4 skills and no node fills or outranks a socket
  no_candidates: 'no_candidates', // defensive: fewer than 4 skills yet no candidate
});

// build  = () => the build system (nodes block) — pools read its verdicts.
// slots  = () => skillSys.slotsView() (4 entries, null = empty slot).
// PARTY (PLAN §16.3): a seat's draft system passes its CLASS pools —
// `skillIds` (its 8 class skills, ascending id) and `nodeIds` (its class node
// pool, ascending id); the Healer's defaults are unchanged.
export function createDraftSystem({ rng, build, slots, skillIds = HEALER_SKILL_IDS, nodeIds = NODE_IDS }) {
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

  // Ruling A17 (the user's rule, 2026-09-27): a skill reward stays a SKILL
  // reward when the Healer already holds 4 — a SWAP offer (offer() marks it).
  // The pool is the Healer's class pool minus owned, so a swapped-out
  // starting skill can be drawn again; while both starting skills are owned
  // (always true with a free slot) it is DRAFTABLE_SKILL_IDS − owned exactly —
  // the same ids in the same ascending order, so every non-swap draw is
  // unchanged.
  function skillPool() {
    const owned = new Set(ownedSkillIds());
    return skillIds.filter((id) => !owned.has(id));
  }

  function nodePool() {
    return nodeIds.filter(usableByParty);
  }

  // fix-M4a-r4 UPGRADE layer: where this node would replace the weakest
  // socketed node it outranks — null when it fills a vacant socket instead
  // (that is the FILL layer) or when it improves nothing.
  function upgradeInfo(nodeId) {
    const sys = build();
    if (!sys || typeof sys.upgradeFor !== 'function') return null;
    if (usableByParty(nodeId)) return null;
    return sys.upgradeFor(nodeId);
  }

  // Nodes with NO vacant usable socket that still upgrade the build, sorted
  // ascending id (the §16 draw order).
  function upgradePool() {
    return nodeIds.filter((id) => upgradeInfo(id) !== null);
  }

  // ONE candidate for a promised reward type. Returns
  //   { type: 'skill'|'node'|null, id, promised, substituted, line, freeSkillSlots }
  function offer(promised) {
    // Node pool = the FILL layer; only when it is empty, the UPGRADE layer.
    const fill = nodePool();
    const upgrading = fill.length === 0;
    const pools = { skill: skillPool(), node: upgrading ? upgradePool() : fill };
    let type = promised;
    let substituted = false;
    if (pools[type].length === 0) {
      const other = type === 'skill' ? 'node' : 'skill';
      if (pools[other].length === 0) {
        const free = freeSkillSlots();
        return {
          type: null,
          id: null,
          promised,
          substituted: false,
          line: EMPTY_LINE,
          freeSkillSlots: free,
          poolSize: 0,
          reason: free === 0 ? EMPTY_REASON.build_complete : EMPTY_REASON.no_candidates,
        };
      }
      type = other;
      substituted = true;
    }
    const pool = pools[type]; // already ascending-id (both builders sort)
    const id = pool[rng.int(pool.length)];
    const free = freeSkillSlots();
    const out = {
      type,
      id,
      promised,
      substituted,
      line: substituted ? SUBSTITUTE_LINE[type] : null,
      freeSkillSlots: free,
      poolSize: pool.length,
    };
    // Ruling A17: a skill with no free slot is a SWAP offer — the player picks
    // which of the 4 it replaces (run.js), or Leaves. Key present only then.
    if (type === 'skill' && free === 0) out.swap = true;
    if (type === 'node' && upgrading) {
      out.pool = 'upgrade';
      out.upgrade = upgradeInfo(id);
    }
    return out;
  }

  // §16 shop: SHOP_SIZE (4) node cards WITHOUT REPLACEMENT from the live
  // filtered pool. The draw is stratified (2 common, 1 rare, 1 legendary) so
  // all three §14 price points (15/20/25) are on the shelf — ruling A2 sizes
  // the node pool for exactly that — and the §14 invariants above are
  // authored against that shelf. If a rarity band is empty after the
  // usable_by_party filter, the slot is backfilled from what is left (and
  // with fewer eligible nodes the shelf simply shows fewer, §16).
  //
  // fix-M4a-r4: a stratum the FILL pool cannot serve draws the same rarity
  // from the UPGRADE pool (so a full build still sees a 15/15/20/25 shelf of
  // things that improve it), and the backfill takes the fill pool's rest
  // first, then the upgrade pool's. With a fill pool that serves every
  // stratum the draws are exactly the pre-fix ones.
  function shopStock() {
    const avail = nodePool();
    const bands = { common: [], rare: [], legendary: [] };
    for (const id of avail) bands[NODES[id].rarity].push(id);
    let up = null; // the upgrade layer, computed only if a stratum needs it
    const upPool = () => {
      if (up === null) up = upgradePool();
      return up;
    };
    const picked = [];
    const taken = new Set();
    for (const rarity of SHOP_STRATA) {
      let band = bands[rarity].filter((id) => !taken.has(id));
      if (band.length === 0) band = upPool().filter((id) => NODES[id].rarity === rarity && !taken.has(id));
      if (band.length === 0) continue;
      const id = band[rng.int(band.length)];
      taken.add(id);
      picked.push({ node: id, rarity, price: PRICES[rarity] });
    }
    if (picked.length < SHOP_SIZE) {
      for (const layer of [() => avail, upPool]) {
        const rest = layer().filter((id) => !taken.has(id));
        while (picked.length < SHOP_SIZE && rest.length > 0) {
          const id = rest.splice(rng.int(rest.length), 1)[0];
          taken.add(id);
          picked.push({ node: id, rarity: NODES[id].rarity, price: PRICES[NODES[id].rarity] });
        }
      }
    }
    return picked;
  }

  // Clear spoils (M4c): `n` distinct nodes, drawn without replacement from
  // the live usable pool's commons and rares (sorted ascending id, one seeded
  // draw each — the §16 draw discipline). Fewer when the pool is smaller.
  // fix-M4a-r4: when the fill pool runs short, the rest of the drop comes
  // from the upgrade pool's commons and rares (same draw discipline), so a
  // full build still gets its SPOILS_PER_CLEAR.
  function spoils(n = SPOILS_PER_CLEAR) {
    const pool = nodePool().filter((id) => SPOILS_RARITIES.includes(NODES[id].rarity));
    const out = [];
    while (out.length < n && pool.length > 0) out.push(pool.splice(rng.int(pool.length), 1)[0]);
    if (out.length < n) {
      const up = upgradePool().filter((id) => SPOILS_RARITIES.includes(NODES[id].rarity) && !out.includes(id));
      while (out.length < n && up.length > 0) out.push(up.splice(rng.int(up.length), 1)[0]);
    }
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
    upgradeInfo,
    upgradePool,
    skillPool,
    nodePool,
    freeSkillSlots,
    ownedSkillIds,
  };
}
