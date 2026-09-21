// Build system (BUILD_BRIEF §15 + §23.4) — nodes, sockets, reinterpretation.
//
// Owns, with every number VERBATIM from §15.1–§15.4 / Appendix A4 / §23.4:
//   - the 17-node pool: 8 stat (Sharpen, Quicken, Multiply, Ascend, Widen,
//     Reach, Linger, Keen) + 9 technique (Bounce, Siphon, Echo, Detonate,
//     Snare, Galvanize, Bulwark, Split, Resonance), rarities, per-skill limits
//   - sockets: active skills 2 slots (A cap rare, B cap legendary), passives
//     1 slot cap rare; the uncapped bench with provenance; socket/unsocket
//     free + unlimited but ONLY while combat_active == false; repetition ≤
//     limit incl. the candidate
//   - the stat resolution pipeline per stat key:
//       base → +flat → ×max(0, 1 + Σ additive_pct) → ×Π multiplicative
//       → techniques → clamps (cd ≥ 0.5 s, arc half-angle ≤ 90°)
//     (two Sharpens = +50% applied once: 22 → 33, never 22×1.25²)
//   - depth-1 technique primitives per the §15.3 / §23.4 reinterpretation
//     matrix. Technique-produced output NEVER triggers techniques (a Bounce
//     hop doesn't re-bounce, a Detonate burst never re-detonates or feeds
//     Siphon, shards / shields / statuses never trigger anything); Echo
//     recasts are new resolutions producing PRIMARY events but an echo never
//     re-arms its own echo, and never advances Resonance.
//   - grey / saturation-inert / verdict computation (§15.5 display contract's
//     sim truth): grey = technique cell GREY or stat key absent — legal to
//     socket, contributes nothing; saturation-inert = Multiply where the
//     realizable delta is 0 (a heal arc / nova / direct whose count already
//     covers the whole party).
//
// Integration seams (no rewrite of the skills chain's work):
//   - resolveDef(def) is handed to createSkillSystem as its stat hook — the
//     skill system fires with resolved power/cd/count/area/range/duration/
//     crit and this module never re-implements the §6 delivery pipeline.
//   - castMods(skillId) is the skill system's per-cast hook (Resonance).
//   - techniques trigger off the PRIMARY sim events the combat/skill systems
//     already emit (heal / hit / full_heal / death / skill_cast / aura_pulse,
//     correlated synchronously) and execute through the world's §4 ③
//     continuation queue, depth-first immediately after their trigger.
//   - Echo recasts are §4 ① delayed maturations, run from the world's
//     discrete phase via discrete(); they call the skill system's own
//     deliver() with the original cast record (same aim / targets /
//     placement), and echoed projectiles ride this module's own shapes.js
//     bolt subsystem (same swept sim + render kind 'skillbolt').
//
// Sim discipline: no DOM, no render imports, no wall clock; the only RNG this
// module touches is indirect (combat's own crit rolls). Siphon draws NO roll
// at all — its amount is flat-stage only, immune to %/× nodes, crit, clamps.
import { TICK_HZ, KNOCKBACK } from '../core/constants.js';
import { SKILLS } from './skills.js';
import { fanDirections, createSkillBolts, selectAreaDamage } from './shapes.js';
import * as STATUS from './status.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000; // cd previews: 3.5 × 0.85 = 2.975 exactly
const secTicks = (s) => Math.round(s * TICK_HZ);
const BOLT_RADIUS = 0.05; // same swept scaffold radius as every other bolt

// ---------------------------------------------------------------- node pool --
// §15.1 + §23.4 verbatim: | node | kind | rarity | limit/skill | effect |.
export const RARITY_RANK = Object.freeze({ common: 0, rare: 1, legendary: 2 });

export const NODES = Object.freeze({
  sharpen: Object.freeze({
    id: 'sharpen', name: 'Sharpen', kind: 'stat', rarity: 'common', limit: 2,
    stat: 'power', op: 'additive_pct', value: 0.25, // +25% power
  }),
  quicken: Object.freeze({
    id: 'quicken', name: 'Quicken', kind: 'stat', rarity: 'common', limit: 2,
    stat: 'cd', op: 'additive_pct', value: -0.15, // −15% cooldown (duration)
  }),
  multiply: Object.freeze({
    id: 'multiply', name: 'Multiply', kind: 'stat', rarity: 'rare', limit: 1,
    stat: 'count', op: 'additive_flat', value: 1, // +1 count
  }),
  ascend: Object.freeze({
    id: 'ascend', name: 'Ascend', kind: 'stat', rarity: 'legendary', limit: 1,
    stat: 'power', op: 'multiplicative', value: 2, // ×2 power
  }),
  bounce: Object.freeze({ id: 'bounce', name: 'Bounce', kind: 'technique', rarity: 'common', limit: 2 }),
  siphon: Object.freeze({ id: 'siphon', name: 'Siphon', kind: 'technique', rarity: 'common', limit: 1 }),
  echo: Object.freeze({ id: 'echo', name: 'Echo', kind: 'technique', rarity: 'rare', limit: 1 }),
  detonate: Object.freeze({ id: 'detonate', name: 'Detonate', kind: 'technique', rarity: 'rare', limit: 1 }),

  // ----------------------------------------------- §23.4 Gauntlet nodes --
  widen: Object.freeze({
    id: 'widen', name: 'Widen', kind: 'stat', rarity: 'common', limit: 2,
    stat: 'area', op: 'additive_pct', value: 0.25, // +25% area (arc: half-angle, clamp 90°)
  }),
  reach: Object.freeze({
    id: 'reach', name: 'Reach', kind: 'stat', rarity: 'common', limit: 2,
    stat: 'range', op: 'additive_pct', value: 0.25, // +25% range / reach / placement / eligibility
  }),
  linger: Object.freeze({
    id: 'linger', name: 'Linger', kind: 'stat', rarity: 'rare', limit: 1,
    stat: 'duration', op: 'additive_pct', value: 0.5, // +50% duration (zone ticks, status ticks)
  }),
  keen: Object.freeze({
    id: 'keen', name: 'Keen', kind: 'stat', rarity: 'rare', limit: 1,
    stat: 'critBonus', op: 'additive_flat', value: 0.15, // +0.15 crit chance on this skill's instances
  }),
  snare: Object.freeze({ id: 'snare', name: 'Snare', kind: 'technique', rarity: 'common', limit: 1 }),
  galvanize: Object.freeze({ id: 'galvanize', name: 'Galvanize', kind: 'technique', rarity: 'common', limit: 1 }),
  bulwark: Object.freeze({ id: 'bulwark', name: 'Bulwark', kind: 'technique', rarity: 'rare', limit: 1 }),
  split: Object.freeze({ id: 'split', name: 'Split', kind: 'technique', rarity: 'rare', limit: 1 }),
  resonance: Object.freeze({ id: 'resonance', name: 'Resonance', kind: 'technique', rarity: 'legendary', limit: 1 }),
});

// §15.3 + A4 + §23.4 authored technique numbers, verbatim.
export const TECH = Object.freeze({
  bounceRadiusU: 2.2, // hop reach; full resolved power; 1 hop per copy
  siphonRadiusU: 2.0, // nearest enemy within 2.0 u of the healed ally
  siphonFrac: 0.25, // 0.25 × FLAT-stage power — immune to %/×, crit, clamps
  echoDelayTicks: secTicks(1.0), // full recast 1.0 s later
  echoDamageFrac: 0.5, // damage recast at 50% resolved power
  echoHealFrac: 1.0, // heal recast at 100%
  echoAuraTicks: secTicks(3.0), // passive Reapply: bonus pulse every 3.0 s
  detonateFrac: 0.5, // 50% resolved power
  detonateRadiusU: 1.2, // burst radius
  // Snare: damage → slow 40% / 90 t · heal → haste 20% / 90 t · passive → slow 25%, pulse-refreshed
  snareSlow: 0.4,
  snareHaste: 0.2,
  snareTicks: 90,
  snarePassiveSlow: 0.25,
  // Galvanize: damage → exposed +20% / 180 t · heal → inspired +15% / 180 t · passive → inspired +10%
  galvExposed: 0.2,
  galvInspired: 0.15,
  galvTicks: 180,
  galvPassiveInspired: 0.1,
  // Pulse-refreshed statuses last one cadence plus a 12-tick grace (the same
  // 72 ticks Quiet Hearth's ward and Rootsnare's slow use), so an ally that
  // stays in the field never flickers out of it between pulses.
  pulseStatusTicks: 72,
  // Bulwark: damage → caster shield 20% of final damage (cap 30) · heal →
  // overheal becomes shield up to 50% of instance power · passive → +2 per
  // pulse (cap 10). Shield lifetime 240 t (Kindred Shield's authored window).
  bulwarkDamageFrac: 0.2,
  bulwarkDamageCap: 30,
  bulwarkHealFrac: 0.5,
  bulwarkPassiveAdd: 2,
  bulwarkPassiveCap: 10,
  bulwarkTicks: 240,
  // Split: damage → 2 shards at ±35°, 40% resolved power, 2.0 u range · heal
  // → the 2 nearest OTHER allies within 2.5 u of the recipient get 40%.
  splitAngleDeg: 35,
  splitFrac: 0.4,
  splitRangeU: 2.0,
  splitHealRadiusU: 2.5,
  splitCount: 2,
  // Resonance: every 3rd cast of the skill resolves at ×2 power.
  resonanceEvery: 3,
  resonanceMul: 2,
});

// §15.3 binding card line — ALWAYS shown on Siphon's card.
export const SIPHON_CARD_LINE =
  'converts 25% of base healing — unmodified by any other socket, crit, or buff.';

// §15.2 socket caps: active skills slot A cap rare / slot B cap legendary;
// passives have one slot, cap rare. Legendaries (Ascend, Resonance) therefore
// fit only slot B and never a passive — no special case needed.
const ACTIVE_CAPS = Object.freeze(['rare', 'legendary']);
const PASSIVE_CAPS = Object.freeze(['rare']);

const isPassiveDef = (def) => def.shape === 'aura';
const capsFor = (def) => (isPassiveDef(def) ? PASSIVE_CAPS : ACTIVE_CAPS);
const slotCountFor = (def) => (isPassiveDef(def) ? 1 : 2);
const retargetable = (def) => def.shape === 'projectile' || def.shape === 'direct';

// Stat keys the resolver walks, and whether a skill "has" each one (§15.5:
// grey = the stat key is absent from the skill). `critBonus` is live on every
// skill (every instance draws a crit roll); `duration` exists on zones and on
// ACTIVE skills whose delivery applies a status (a passive's status is
// pulse-refreshed, so lengthening it changes nothing — grey).
const STAT_KEYS = Object.freeze(['power', 'cd', 'count', 'area', 'range', 'critBonus', 'duration']);
function hasStat(def, stat) {
  if (stat === 'critBonus') return true;
  if (stat === 'area') return def.area !== undefined && def.area > 0; // area 0 = single target
  if (stat === 'duration') return def.durationSec !== undefined || (!!def.status && !isPassiveDef(def));
  return def[stat] !== undefined;
}

// Human-readable grey reasons (§15.5 advisory copy).
const GREY_REASONS = Object.freeze({
  no_cd_stat: 'no cooldown stat on this skill',
  no_count_stat: 'no count stat on this skill',
  no_power_stat: 'no power stat on this skill',
  no_area_stat: 'single-target shape — no area to widen',
  no_range_stat: 'no range stat on this skill',
  no_duration_stat: 'nothing on this skill lasts — no duration to extend',
  passive_field: 'a passive field — nothing here for this technique to act on',
  no_retargetable_impact: 'needs a retargetable impact (projectile or direct)',
});

export function createBuildSystem({
  player,
  registry,
  events,
  combat,
  getTick,
  isIframed,
  queueDeferred,
  queueContinuation,
  getSkillSlots,
  isCombatActive = () => false,
}) {
  // ------------------------------------------------------- sockets & bench --
  const bench = []; // { node, provenance: 'drafted'|'purchased'|... } — uncapped
  const assignments = new Map(); // skillId -> [null | { node, provenance }] per slot
  const resolvedCache = new Map(); // skillId -> resolved def (invalidated on change)
  const invalidate = () => resolvedCache.clear();
  const resonance = new Map(); // skillId -> casts counted while Resonance is socketed
  let skills = null; // the skill system (deliver / pulseAura), attached by the run block

  const ownedIds = () => getSkillSlots().filter(Boolean).map((s) => s.id);

  function socketsOf(skillId) {
    let a = assignments.get(skillId);
    if (!a) {
      a = new Array(slotCountFor(SKILLS[skillId])).fill(null);
      assignments.set(skillId, a);
    }
    return a;
  }

  const party = () =>
    registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex);
  const livingPartyCount = () => party().filter((m) => m.hp > 0).length;
  const hostiles = () =>
    registry.all().filter((e) => e.faction === 'hostile' && e.hittable && e.hp > 0);

  // ---------------------------------------------------------------- verdicts --
  // §15.3 shape capabilities + §15.5: grey = technique cell GREY or stat key
  // absent; saturation-inert = Multiply with realizable delta 0.
  function verdictFor(def, nodeId, selfSlot = null) {
    const n = NODES[nodeId];
    if (!n) return { state: 'grey', reason: 'unknown_node' };
    if (n.kind === 'stat') {
      if (!hasStat(def, n.stat)) return { state: 'grey', reason: `no_${n.stat}_stat` };
      if (
        n.id === 'multiply' &&
        def.archetype === 'heal' &&
        (def.shape === 'direct' || def.shape === 'nova' || def.shape === 'melee_arc')
      ) {
        // §15.5 saturation-inert = realizable delta 0, and the delta is
        // strictly WITH-this-copy minus WITHOUT-this-copy. For an ALREADY
        // SOCKETED Multiply resolveDef().count already contains its +1, so
        // the baseline c0 must exclude that slot — otherwise a contributing
        // node reads as inert (Nova Bloom 3 → 4 realises +1: LIVE, while
        // Restorative Wave 4 → 5 against ally pop 4 realises +0: INERT).
        // Only a PARTY-targeted shape saturates on the party's population; a
        // damage nova (Bell Toll 5 → 6) is capped by the enemies in reach.
        const pop = livingPartyCount();
        const slotIdx = selfSlotOf(def, nodeId, selfSlot);
        const base = slotIdx >= 0 ? resolveWithout(def, slotIdx) : resolveDef(def);
        const c0 = Math.max(1, Math.floor(base.count));
        if (Math.min(c0 + 1, pop) - Math.min(c0, pop) === 0)
          return { state: 'inert', reason: 'saturated', pop, c0 };
      }
      return { state: 'live' };
    }
    // Techniques: retargetable-impact = {projectile, direct} (Bounce, Split);
    // Siphon/Detonate/Echo-active = any active skill; Echo-passive = aura
    // Reapply; Snare / Galvanize / Bulwark have a passive reinterpretation;
    // Resonance's passive cell is the legendary cap (unsocketable, §23.4).
    if (isPassiveDef(def)) {
      if (n.id === 'echo') return { state: 'live', reason: 'reapply' };
      if (n.id === 'snare' || n.id === 'galvanize' || n.id === 'bulwark') return { state: 'live', reason: 'pulse' };
      if (n.id === 'resonance') return { state: 'live', reason: 'legendary_cap' };
      return { state: 'grey', reason: 'passive_field' };
    }
    if ((n.id === 'bounce' || n.id === 'split') && !retargetable(def))
      return { state: 'grey', reason: 'no_retargetable_impact' };
    return { state: 'live' };
  }

  // ---------------------------------------------------------------- resolver --
  // §15.4 per stat key: base → +flat → ×max(0,1+Σpct) → ×Πmult → clamp.
  // Returns the original frozen def untouched when nothing is socketed, so the
  // per-frame HUD path allocates nothing.
  function resolveDef(def) {
    const list = assignments.get(def.id);
    if (!list || list.every((s) => s === null)) return def;
    let out = resolvedCache.get(def.id);
    if (out) return out;
    out = { ...def };
    for (const stat of STAT_KEYS) {
      if (!hasStat(def, stat)) continue; // stat key absent — grey, untouched
      let flat = 0;
      let pct = 0;
      let mult = 1;
      let any = false;
      for (const rec of list) {
        if (!rec) continue;
        const n = NODES[rec.node];
        if (n.kind !== 'stat' || n.stat !== stat) continue;
        any = true;
        if (n.op === 'additive_flat') flat += n.value;
        else if (n.op === 'additive_pct') pct += n.value;
        else if (n.op === 'multiplicative') mult *= n.value;
      }
      if (stat === 'duration') {
        if (!any) continue;
        const k = Math.max(0, 1 + pct) * mult;
        // Zones: duration rounded to whole zone ticks (the skill system turns
        // durationSec into ticks / 1.0 s cadence and rounds). Statuses: ticks.
        if (def.durationSec !== undefined) out.durationSec = (def.durationSec + flat) * k;
        if (def.status) out.status = { ...def.status, ticks: Math.round(def.status.ticks * k) };
        continue;
      }
      if (stat === 'critBonus') {
        if (any) out.critBonus = (def.critBonus ?? 0) + flat;
        continue;
      }
      if (!any && stat !== 'power' && stat !== 'cd' && stat !== 'count') continue;
      let v = (def[stat] + flat) * Math.max(0, 1 + pct) * mult;
      if (stat === 'cd') v = Math.max(0.5, v); // §6/§15.4 cooldown floor
      if (stat === 'area' && def.shape === 'melee_arc') v = Math.min(90, v); // §23.4 Widen on arcs
      out[stat] = v;
    }
    resolvedCache.set(def.id, out);
    return out;
  }

  // Which slot (if any) already holds this node on this skill. An explicit
  // caller-supplied index wins; otherwise we look it up, so every entry point
  // (view/socket/kitVerdict/the exported probe) agrees on the baseline.
  function selfSlotOf(def, nodeId, selfSlot = null) {
    if (selfSlot !== null && selfSlot !== undefined) {
      const list = assignments.get(def.id);
      const rec = list && list[selfSlot];
      return rec && rec.node === nodeId ? selfSlot : -1;
    }
    const list = assignments.get(def.id);
    return list ? list.findIndex((s) => s && s.node === nodeId) : -1;
  }

  // Same pipeline with ONE socketed slot virtually emptied — the "without this
  // copy" baseline the saturation test compares against.
  function resolveWithout(def, slotIdx) {
    const saved = assignments.get(def.id);
    if (!saved || !saved[slotIdx]) return resolveDef(def);
    const list = saved.slice();
    list[slotIdx] = null;
    assignments.set(def.id, list);
    resolvedCache.delete(def.id);
    const out = { ...resolveDef(def) };
    assignments.set(def.id, saved);
    resolvedCache.delete(def.id);
    return out;
  }

  // Same pipeline with one candidate node virtually appended (socket preview).
  function resolveWith(def, nodeId) {
    const saved = assignments.get(def.id);
    const list = saved ? saved.slice() : [];
    list.push({ node: nodeId, provenance: 'preview' });
    assignments.set(def.id, list);
    resolvedCache.delete(def.id);
    const out = { ...resolveDef(def) };
    if (saved) assignments.set(def.id, saved);
    else assignments.delete(def.id);
    resolvedCache.delete(def.id);
    return out;
  }

  // Siphon amount base: FLAT-stage power (base + additive_flat power nodes —
  // none exist at MVP, so base). NEVER touched by pct/mult/crit/clamps.
  function flatStagePower(skillId) {
    let flat = 0;
    for (const rec of assignments.get(skillId) ?? []) {
      const n = rec && NODES[rec.node];
      if (n && n.kind === 'stat' && n.stat === 'power' && n.op === 'additive_flat')
        flat += n.value;
    }
    return SKILLS[skillId].power + flat;
  }

  // ------------------------------------------------------------ bench & ops --
  function grantNode(id, provenance = 'drafted') {
    const n = NODES[id];
    if (!n) return { error: `unknown node '${id}'` };
    bench.push({ node: id, provenance });
    events.emit(getTick(), 'node_granted', { node: id, provenance, bench: bench.length });
    return { node: id, bench: bench.length };
  }

  function deny(skillId, nodeId, slot, reason) {
    events.emit(getTick(), 'socket_denied', { skill: skillId, node: nodeId, slot, reason });
    return { denied: reason, skill: skillId, node: nodeId, slot };
  }

  // socket(skillId, nodeId, slot?) — slot omitted picks the first vacant slot
  // whose cap admits the node. Hard-blocks (cap / limit — §16 rejection shake)
  // refuse with a socket_denied event; grey is advisory and proceeds.
  function socket(skillId, nodeId, slot = null) {
    const node = NODES[nodeId];
    if (!node) return deny(skillId, nodeId, slot, 'unknown_node');
    if (isCombatActive()) return deny(skillId, nodeId, slot, 'combat_active');
    if (!ownedIds().includes(skillId)) return deny(skillId, nodeId, slot, 'skill_not_owned');
    const benchIdx = bench.findIndex((b) => b.node === nodeId);
    if (benchIdx < 0) return deny(skillId, nodeId, slot, 'not_on_bench');
    const def = SKILLS[skillId];
    const caps = capsFor(def);
    const slots = socketsOf(skillId);

    let target = slot;
    if (target === null || target === undefined) {
      target = slots.findIndex(
        (s, i) => s === null && RARITY_RANK[node.rarity] <= RARITY_RANK[caps[i]]
      );
      if (target < 0) {
        const anyCapFits = caps.some((c) => RARITY_RANK[node.rarity] <= RARITY_RANK[c]);
        return deny(skillId, nodeId, null, anyCapFits ? 'occupied' : 'cap');
      }
    } else {
      if (!(target >= 0 && target < slots.length)) return deny(skillId, nodeId, target, 'no_such_slot');
      // §15.2 cap = ceiling on rarity rank — HARD block.
      if (RARITY_RANK[node.rarity] > RARITY_RANK[caps[target]])
        return deny(skillId, nodeId, target, 'cap');
    }
    // §15.2 repetition: copies on one skill INCLUDING the candidate ≤ limit
    // (the displaced occupant of an explicit target slot doesn't count).
    const copies = slots.filter((s, i) => i !== target && s && s.node === nodeId).length;
    if (copies + 1 > node.limit) return deny(skillId, nodeId, target, 'limit');

    const [entry] = bench.splice(benchIdx, 1);
    const prev = slots[target];
    if (prev) bench.push(prev); // free swap — old node banks to the bench
    slots[target] = entry;
    invalidate();
    // The verdict is read back on the node AS SOCKETED — the baseline for a
    // Multiply saturation test therefore excludes this very copy.
    const verdict = verdictFor(def, nodeId, target);
    events.emit(getTick(), 'node_socketed', {
      skill: skillId,
      node: nodeId,
      slot: target,
      verdict: verdict.state, // 'grey' rides out as the advisory warning
      swapped: prev ? prev.node : null,
    });
    return { skill: skillId, node: nodeId, slot: target, verdict: verdict.state };
  }

  function unsocket(skillId, slot) {
    if (isCombatActive()) return deny(skillId, null, slot, 'combat_active');
    const slots = assignments.get(skillId);
    const rec = slots && slots[slot];
    if (!rec) return { error: 'empty_socket' };
    slots[slot] = null;
    bench.push(rec);
    invalidate();
    events.emit(getTick(), 'node_unsocketed', { skill: skillId, node: rec.node, slot });
    return { skill: skillId, node: rec.node, slot };
  }

  // ------------------------------------------------------------- techniques --
  // Depth-1 discipline: `suppress` > 0 while technique output is being
  // produced — the trigger listener drops EVERYTHING it hears in that window,
  // and technique instances additionally carry ':'-labelled sources so they
  // can never read as primary. Echo recasts run at suppress == 0 with plain
  // skill-id sources: new resolutions, primary events (§15.3), and echo
  // itself only ever arms on a real `skill_cast` — one per cast.
  let suppress = 0;
  let lastHeal = null; // most recent primary heal event (full_heal correlation)
  let lastHit = null; // most recent primary hit event (death correlation)

  const isPrimary = (src) =>
    typeof src === 'string' && !src.includes(':') && SKILLS[src] !== undefined;

  // Socketed technique node ids on a skill, ascending slot order, live only.
  function liveTechs(skillId) {
    const list = assignments.get(skillId);
    if (!list) return [];
    const def = SKILLS[skillId];
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const rec = list[i];
      if (!rec) continue;
      const n = NODES[rec.node];
      if (n.kind === 'technique' && verdictFor(def, rec.node, i).state === 'live')
        out.push(rec.node);
    }
    return out;
  }

  const S = () => combat.status ?? STATUS;
  function giveStatus(e, kind, mag, ticks) {
    if (!e || !(e.hp > 0)) return null;
    return S().apply(e, kind, mag, ticks, getTick(), player.id);
  }

  events.on('*', (ev) => {
    if (suppress > 0) return; // §15.3: technique output never triggers techniques
    switch (ev.type) {
      case 'heal': {
        lastHeal = ev;
        if (!isPrimary(ev.source)) return;
        // A passive's heals are its PULSE; its reinterpretations ride
        // `aura_pulse` below, never the heal-skill column.
        if (isPassiveDef(SKILLS[ev.source])) return;
        const techs = liveTechs(ev.source);
        if (techs.length === 0) return;
        const copies = techs.filter((t) => t === 'bounce').length;
        let chainQueued = false;
        for (const t of techs) {
          // §15.3: techniques fire ascending slot index (A then B).
          if (t === 'bounce' && !chainQueued) {
            chainQueued = true;
            const { source, target, x, z } = ev;
            queueContinuation(() => runHealChain(source, target, x, z, copies));
          } else if (t === 'siphon') {
            const { source, target } = ev;
            queueContinuation(() => runSiphonDrain(source, target));
          } else if (t === 'snare') {
            const { target } = ev;
            queueContinuation(() => giveStatus(registry.byId(target), 'haste', TECH.snareHaste, TECH.snareTicks));
          } else if (t === 'galvanize') {
            const { target } = ev;
            queueContinuation(() => giveStatus(registry.byId(target), 'inspired', TECH.galvInspired, TECH.galvTicks));
          } else if (t === 'bulwark') {
            const { source, target, amount, applied } = ev;
            queueContinuation(() => runBulwarkHeal(source, target, amount, applied));
          } else if (t === 'split') {
            const { source, target } = ev;
            queueContinuation(() => runSplitHeal(source, target));
          }
        }
        return;
      }
      case 'hit': {
        if (!isPrimary(ev.source)) return;
        lastHit = ev;
        const techs = liveTechs(ev.source);
        if (techs.length === 0) return;
        const copies = techs.filter((t) => t === 'bounce').length;
        let chainQueued = false;
        for (const t of techs) {
          if (t === 'bounce' && !chainQueued) {
            chainQueued = true;
            const { source, target, x, z } = ev;
            queueContinuation(() => runDamageChain(source, target, x, z, copies));
          } else if (t === 'siphon') {
            const { source } = ev;
            queueContinuation(() => runSiphonSelfHeal(source));
          } else if (t === 'snare') {
            const { target } = ev;
            queueContinuation(() => giveStatus(registry.byId(target), 'slow', TECH.snareSlow, TECH.snareTicks));
          } else if (t === 'galvanize') {
            const { target } = ev;
            queueContinuation(() => giveStatus(registry.byId(target), 'exposed', TECH.galvExposed, TECH.galvTicks));
          } else if (t === 'bulwark') {
            const { source, amount } = ev;
            queueContinuation(() => runBulwarkDamage(source, amount));
          } else if (t === 'split') {
            const { source, target, x, z, dirX, dirZ } = ev;
            queueContinuation(() => runSplitShards(source, target, x, z, dirX, dirZ));
          }
        }
        return;
      }
      case 'full_heal': {
        // full_heal is emitted synchronously inside the same applyHeal as its
        // heal event, so the correlation is exact: same target, same tick.
        if (!lastHeal || lastHeal.target !== ev.target || lastHeal.tick !== ev.tick) return;
        const src = lastHeal.source;
        if (!isPrimary(src) || !liveTechs(src).includes('detonate')) return;
        const { target, x, z } = lastHeal;
        queueContinuation(() => runDetonateHeal(src, target, x, z));
        return;
      }
      case 'death': {
        // Same-emit correlation: kill() fires inside the applyDamage that just
        // emitted the primary hit — "kills by THIS skill explode".
        if (!lastHit || lastHit.target !== ev.id || lastHit.tick !== ev.tick) return;
        const src = lastHit.source;
        if (!liveTechs(src).includes('detonate')) return;
        const { x, z } = ev;
        queueContinuation(() => runDetonateDamage(src, x, z));
        return;
      }
      case 'skill_cast': {
        if (!liveTechs(ev.skill).includes('echo')) return;
        const due = ev.tick + TECH.echoDelayTicks;
        echoQueue.push({ due, skill: ev.skill, cast: ev });
        events.emit(getTick(), 'echo_armed', { skill: ev.skill, dueTick: due });
        return;
      }
      case 'aura_pulse': {
        // §23.4 passive reinterpretations, once per pulse (the Echo Reapply
        // bonus pulse included): Snare slows enemies inside, Galvanize
        // inspires the allies inside, Bulwark tops up their shields.
        const src = ev.skill;
        if (!src || !SKILLS[src] || !isPassiveDef(SKILLS[src])) return;
        const techs = liveTechs(src);
        if (techs.length === 0) return;
        const healed = Array.isArray(ev.healed) ? [...ev.healed] : [];
        const { x, z, area } = ev;
        for (const t of techs) {
          if (t === 'snare') queueContinuation(() => runPassiveSnare(src, x, z, area));
          else if (t === 'galvanize')
            queueContinuation(() => {
              for (const id of healed) giveStatus(registry.byId(id), 'inspired', TECH.galvPassiveInspired, TECH.pulseStatusTicks);
              events.emit(getTick(), 'technique_pulse', { skill: src, node: 'galvanize', targets: healed });
            });
          else if (t === 'bulwark')
            queueContinuation(() => {
              const tick = getTick();
              for (const id of healed) {
                const m = registry.byId(id);
                if (m && m.hp > 0)
                  S().addShield(m, TECH.bulwarkPassiveAdd, TECH.bulwarkPassiveCap, TECH.bulwarkTicks, tick, player.id);
              }
              events.emit(tick, 'technique_pulse', { skill: src, node: 'bulwark', targets: healed });
            });
        }
        return;
      }
      default:
    }
  });

  // --- Bounce (§15.3): 1 hop per copy, 2.2 u reach, full resolved power.
  // The chain walks positions (the primary victim may already be dead), each
  // hop excluding everything already visited in this chain.
  function runHealChain(skillId, startId, x, z, hops) {
    const rdef = resolveDef(SKILLS[skillId]);
    const power = rdef.power;
    const visited = new Set([startId]);
    let cx = x;
    let cz = z;
    suppress += 1;
    try {
      for (let i = 0; i < hops; i++) {
        // Next-lowest-HP OTHER ally within 2.2 u; ties ascending party_index.
        let best = null;
        for (const m of party()) {
          if (!(m.hp > 0) || visited.has(m.id)) continue;
          const d2 = (m.x - cx) ** 2 + (m.z - cz) ** 2;
          if (d2 > TECH.bounceRadiusU * TECH.bounceRadiusU) continue;
          if (!best || m.hp / m.maxHp < best.hp / best.maxHp) best = m;
        }
        if (!best) break;
        visited.add(best.id);
        events.emit(getTick(), 'bounce_hop', {
          skill: skillId,
          mode: 'heal',
          hop: i + 1,
          to: best.id,
          power: r2(power),
          // Arc endpoints for the render layer (§19.4: the hop must read as
          // an event, not just a second numeral).
          fromX: r2(cx),
          fromZ: r2(cz),
          x: r2(best.x),
          z: r2(best.z),
        });
        combat.applyHeal(best, power, { healer: player.id, source: `${skillId}:bounce`, critBonus: rdef.critBonus ?? 0 });
        cx = best.x;
        cz = best.z;
      }
    } finally {
      suppress -= 1;
    }
  }

  function runDamageChain(skillId, startId, x, z, hops) {
    const rdef = resolveDef(SKILLS[skillId]);
    const power = rdef.power;
    const visited = new Set([startId]);
    let cx = x;
    let cz = z;
    suppress += 1;
    try {
      for (let i = 0; i < hops; i++) {
        // Nearest OTHER enemy within 2.2 u; distance ties by ascending id.
        let best = null;
        let bestD2 = TECH.bounceRadiusU * TECH.bounceRadiusU;
        for (const e of hostiles()) {
          if (visited.has(e.id)) continue;
          const d2 = (e.x - cx) ** 2 + (e.z - cz) ** 2;
          if (d2 < bestD2 || (d2 === bestD2 && best && e.id < best.id)) {
            bestD2 = d2;
            best = e;
          }
        }
        if (!best) break;
        visited.add(best.id);
        const len = Math.hypot(best.x - cx, best.z - cz);
        const dirX = len > 1e-6 ? (best.x - cx) / len : 1;
        const dirZ = len > 1e-6 ? (best.z - cz) / len : 0;
        events.emit(getTick(), 'bounce_hop', {
          skill: skillId,
          mode: 'damage',
          hop: i + 1,
          to: best.id,
          power: r2(power),
          fromX: r2(cx),
          fromZ: r2(cz),
          x: r2(best.x),
          z: r2(best.z),
        });
        combat.applyDamage(best, power, {
          delivery: 'skill',
          shape: 'bounce',
          dirX,
          dirZ,
          attacker: player.id,
          source: `${skillId}:bounce`,
          critBonus: rdef.critBonus ?? 0,
        });
        cx = best.x;
        cz = best.z;
      }
    } finally {
      suppress -= 1;
    }
  }

  // --- Siphon on a heal skill (§15.3): damages the nearest enemy within
  // 2.0 u of the healed ally for 0.25 × flat-stage power. NO crit roll, no
  // stat scaling — the instance is written directly (the §9 pipeline would
  // draw a roll). Ties → lowest spawn id; nobody near → fizzle cue event.
  function runSiphonDrain(skillId, allyId) {
    const ally = registry.byId(allyId);
    if (!ally) return;
    const amount = r2(TECH.siphonFrac * flatStagePower(skillId));
    let best = null;
    let bestD2 = TECH.siphonRadiusU * TECH.siphonRadiusU;
    for (const e of hostiles()) {
      const d2 = (e.x - ally.x) ** 2 + (e.z - ally.z) ** 2;
      if (d2 < bestD2 || (d2 === bestD2 && best && e.id < best.id)) {
        bestD2 = d2;
        best = e;
      }
    }
    const tick = getTick();
    if (!best) {
      events.emit(tick, 'siphon_fizzle', {
        skill: skillId,
        ally: allyId,
        x: r2(ally.x),
        z: r2(ally.z),
      });
      return;
    }
    suppress += 1;
    try {
      if (isIframed(best)) {
        events.emit(tick, 'hit_immune', {
          target: best.id,
          reason: 'iframe',
          x: r2(best.x),
          z: r2(best.z),
        });
        return;
      }
      best.hp -= amount;
      // §9 #3 juice: skill-grade knockback away from the drained ally.
      let kb = 0;
      if (best.knockbackable) {
        const len = Math.hypot(best.x - ally.x, best.z - ally.z);
        if (len > 1e-6) {
          kb = KNOCKBACK.skillDist;
          best.kbVx = ((best.x - ally.x) / len) * (kb / KNOCKBACK.durationTicks);
          best.kbVz = ((best.z - ally.z) / len) * (kb / KNOCKBACK.durationTicks);
          best.kbTicks = KNOCKBACK.durationTicks;
        }
      }
      events.emit(tick, 'hit', {
        target: best.id,
        kind: best.kind,
        attacker: player.id,
        source: `${skillId}:siphon`,
        amount,
        crit: false, // never rolls
        delivery: 'technique',
        kb,
        x: r2(best.x),
        z: r2(best.z),
      });
      events.emit(tick, 'siphon_drain', {
        skill: skillId,
        ally: allyId,
        target: best.id,
        amount,
        x: r2(best.x),
        z: r2(best.z),
        ax: r2(ally.x),
        az: r2(ally.z),
      });
      if (best.hp <= 0) combat.kill(best, { delivery: 'technique' });
    } finally {
      suppress -= 1;
    }
  }

  // --- Siphon on a damage skill: caster self-heals 0.25 × flat-stage power
  // per instance. Same immunity: no crit roll (HP still tops out at max_hp —
  // that is physics, not the resolver's clamp stage).
  function runSiphonSelfHeal(skillId) {
    if (!(player.hp > 0)) return; // Downed: outside the pipeline
    const amount = r2(TECH.siphonFrac * flatStagePower(skillId));
    const applied = Math.min(amount, player.maxHp - player.hp);
    player.hp += applied;
    const tick = getTick();
    suppress += 1;
    try {
      events.emit(tick, 'heal', {
        target: player.id,
        healer: player.id,
        source: `${skillId}:siphon`,
        amount,
        applied: r2(applied),
        crit: false,
        x: r2(player.x),
        z: r2(player.z),
      });
      events.emit(tick, 'siphon_selfheal', {
        skill: skillId,
        amount,
        x: r2(player.x),
        z: r2(player.z),
      });
    } finally {
      suppress -= 1;
    }
  }

  // --- Detonate (§15.3): damage side — kills by this skill explode for 50%
  // resolved power in 1.2 u (normal instances: own crit rolls). The burst
  // reaches breakable world objects too (area damage, PLAN §3.6 (g)).
  function runDetonateDamage(skillId, x, z) {
    const rdef = resolveDef(SKILLS[skillId]);
    const power = TECH.detonateFrac * rdef.power;
    const targets = selectAreaDamage({ entities: registry.all(), x, z, radius: TECH.detonateRadiusU });
    events.emit(getTick(), 'detonate', {
      skill: skillId,
      mode: 'damage',
      x: r2(x),
      z: r2(z),
      radius: TECH.detonateRadiusU,
      power: r2(power),
      targets: targets.map((t) => t.id),
    });
    suppress += 1;
    try {
      for (const t of targets) {
        const len = Math.hypot(t.x - x, t.z - z);
        const dirX = len > 1e-6 ? (t.x - x) / len : 1;
        const dirZ = len > 1e-6 ? (t.z - z) / len : 0;
        combat.applyDamage(t, power, {
          delivery: 'skill',
          shape: 'detonate',
          dirX,
          dirZ,
          attacker: player.id,
          source: `${skillId}:detonate`,
          critBonus: rdef.critBonus ?? 0,
        });
      }
    } finally {
      suppress -= 1;
    }
  }

  // Heal side: full_heal events from this skill burst-heal OTHER allies
  // within 1.2 u of the topped ally for 50% resolved power.
  function runDetonateHeal(skillId, allyId, x, z) {
    const rdef = resolveDef(SKILLS[skillId]);
    const power = TECH.detonateFrac * rdef.power;
    const r2max = TECH.detonateRadiusU * TECH.detonateRadiusU;
    const targets = party()
      .filter((m) => m.id !== allyId && m.hp > 0 && (m.x - x) ** 2 + (m.z - z) ** 2 <= r2max)
      .sort((a, b) => {
        const da = (a.x - x) ** 2 + (a.z - z) ** 2;
        const db = (b.x - x) ** 2 + (b.z - z) ** 2;
        return da !== db ? da - db : a.id - b.id;
      });
    events.emit(getTick(), 'detonate', {
      skill: skillId,
      mode: 'heal',
      x: r2(x),
      z: r2(z),
      radius: TECH.detonateRadiusU,
      power: r2(power),
      targets: targets.map((t) => t.id),
    });
    suppress += 1;
    try {
      for (const t of targets)
        combat.applyHeal(t, power, { healer: player.id, source: `${skillId}:detonate`, critBonus: rdef.critBonus ?? 0 });
    } finally {
      suppress -= 1;
    }
  }

  // --- Bulwark (§23.4). Damage side: the caster gains a shield worth 20% of
  // the instance's final damage, accumulating up to 30. Heal side: the
  // instance's overheal (pre-clamp − applied) becomes a shield on the
  // recipient, up to 50% of the instance's resolved power (refresh = max).
  function runBulwarkDamage(skillId, amount) {
    if (!(player.hp > 0) || !(amount > 0)) return;
    const tick = getTick();
    const rec = S().addShield(player, TECH.bulwarkDamageFrac * amount, TECH.bulwarkDamageCap, TECH.bulwarkTicks, tick, player.id);
    if (rec)
      events.emit(tick, 'technique_pulse', { skill: skillId, node: 'bulwark', mode: 'damage', targets: [player.id], shield: r2(rec.mag) });
  }

  function runBulwarkHeal(skillId, targetId, amount, applied) {
    const t = registry.byId(targetId);
    if (!t || !(t.hp > 0)) return;
    const over = (amount ?? 0) - (applied ?? 0);
    if (!(over > 1e-6)) return;
    const cap = TECH.bulwarkHealFrac * resolveDef(SKILLS[skillId]).power;
    const rec = giveStatus(t, 'shield', Math.min(over, cap), TECH.bulwarkTicks);
    if (rec)
      events.emit(getTick(), 'technique_pulse', { skill: skillId, node: 'bulwark', mode: 'heal', targets: [t.id], shield: r2(rec.mag) });
  }

  // --- Split (§23.4). Damage (projectile / direct): on impact, two shards at
  // ±35° of the flight direction, 40% resolved power, 2.0 u of travel — they
  // never touch the body the parent struck. Heal: the two nearest OTHER
  // allies within 2.5 u of the recipient receive 40% (own crit rolls).
  const shardBolts = createSkillBolts({
    registry,
    events,
    owner: 'split_shards',
    onImpact: (tick, bolt, target) => {
      const targetId = target.id;
      const { power, skill } = bolt;
      const len = Math.hypot(bolt.vx, bolt.vz);
      const dirX = len > 1e-9 ? bolt.vx / len : 0;
      const dirZ = len > 1e-9 ? bolt.vz / len : 0;
      const critBonus = bolt.critBonus ?? 0;
      queueDeferred(bolt.id, () => {
        const t = registry.byId(targetId);
        if (!t) return;
        suppress += 1;
        try {
          combat.applyDamage(t, power, {
            delivery: 'skill',
            shape: 'projectile',
            dirX,
            dirZ,
            attacker: player.id,
            source: `${skill}:split`,
            critBonus,
          });
        } finally {
          suppress -= 1;
        }
      });
    },
  });

  function runSplitShards(skillId, victimId, x, z, dirX, dirZ) {
    const rdef = resolveDef(SKILLS[skillId]);
    const len = Math.hypot(dirX ?? 0, dirZ ?? 0);
    const base = len > 1e-6 ? Math.atan2(dirZ, dirX) : 0;
    const power = TECH.splitFrac * rdef.power;
    const tick = getTick();
    const shards = [];
    for (const sgn of [-1, 1]) {
      const a = base + (sgn * TECH.splitAngleDeg * Math.PI) / 180;
      const b = shardBolts.spawn(tick, {
        x,
        z,
        dirX: Math.cos(a),
        dirZ: Math.sin(a),
        speed: rdef.speed ?? 5.0,
        range: TECH.splitRangeU,
        radius: BOLT_RADIUS,
        power,
        skill: skillId,
        heal: false,
        sourceId: player.id,
        critBonus: rdef.critBonus ?? 0,
        tech: 'split',
        exclude: [victimId],
      });
      shards.push(b.id);
    }
    events.emit(tick, 'split_shard', { skill: skillId, mode: 'damage', from: victimId, shards, power: r2(power), x: r2(x), z: r2(z) });
  }

  function runSplitHeal(skillId, recipientId) {
    const rec = registry.byId(recipientId);
    if (!rec) return;
    const rdef = resolveDef(SKILLS[skillId]);
    const power = TECH.splitFrac * rdef.power;
    const r2max = TECH.splitHealRadiusU * TECH.splitHealRadiusU;
    const near = party()
      .filter((m) => m.id !== recipientId && m.hp > 0 && !isIframed(m) && (m.x - rec.x) ** 2 + (m.z - rec.z) ** 2 <= r2max)
      .sort((a, b) => {
        const da = (a.x - rec.x) ** 2 + (a.z - rec.z) ** 2;
        const db = (b.x - rec.x) ** 2 + (b.z - rec.z) ** 2;
        return da !== db ? da - db : a.id - b.id;
      })
      .slice(0, TECH.splitCount);
    events.emit(getTick(), 'split_shard', {
      skill: skillId,
      mode: 'heal',
      from: recipientId,
      targets: near.map((m) => m.id),
      power: r2(power),
      x: r2(rec.x),
      z: r2(rec.z),
    });
    suppress += 1;
    try {
      for (const m of near)
        combat.applyHeal(m, power, { healer: player.id, source: `${skillId}:split`, critBonus: rdef.critBonus ?? 0 });
    } finally {
      suppress -= 1;
    }
  }

  // --- Snare on a passive: enemies inside the field are slowed 25%,
  // refreshed each pulse.
  function runPassiveSnare(skillId, x, z, area) {
    const tick = getTick();
    const cx = Number.isFinite(x) ? x : player.x;
    const cz = Number.isFinite(z) ? z : player.z;
    const radius = Number.isFinite(area) ? area : resolveDef(SKILLS[skillId]).area;
    const hit = [];
    for (const e of hostiles()) {
      if ((e.x - cx) ** 2 + (e.z - cz) ** 2 > radius * radius) continue;
      if (S().apply(e, 'slow', TECH.snarePassiveSlow, TECH.pulseStatusTicks, tick, player.id)) hit.push(e.id);
    }
    events.emit(tick, 'technique_pulse', { skill: skillId, node: 'snare', targets: hit });
  }

  // --- Resonance (§23.4): every 3rd cast of the skill resolves at ×2 power.
  // The counter is per skill, counts casts made while Resonance is socketed,
  // persists across rooms, resets at run end (restore() below). Echo recasts
  // never pass through here.
  function castMods(skillId) {
    if (!liveTechs(skillId).includes('resonance')) return null;
    const n = (resonance.get(skillId) ?? 0) + 1;
    resonance.set(skillId, n);
    if (n % TECH.resonanceEvery !== 0) return { powerMul: 1, resonance: false, count: n };
    events.emit(getTick(), 'resonance_proc', { skill: skillId, n, mul: TECH.resonanceMul, x: r2(player.x), z: r2(player.z) });
    return { powerMul: TECH.resonanceMul, resonance: true, count: n };
  }

  // --------------------------------------------------------------- echo -----
  const echoQueue = []; // { due, skill, cast } in arm order
  const auraEchoNext = new Map(); // passive skillId -> next Reapply tick

  // Echo recast bolts ride this module's own instance of the shared §6 bolt
  // subsystem (kind 'skillbolt' — the render layer picks them up untouched).
  // Impacts are §4 ① deferred maturations with PLAIN skill-id sources: an
  // echo recast is a new resolution producing primary events.
  const echoBolts = createSkillBolts({
    registry,
    events,
    onImpact: (tick, bolt, target) => {
      const targetId = target.id;
      const { power, skill, heal, sourceId } = bolt;
      const critBonus = bolt.critBonus ?? 0;
      queueDeferred(bolt.id, () => {
        const t = registry.byId(targetId);
        if (!t) return;
        if (heal) combat.applyHeal(t, power, { healer: sourceId, source: skill, critBonus });
        else {
          const len = Math.hypot(bolt.vx, bolt.vz);
          combat.applyDamage(t, power, {
            delivery: 'skill',
            shape: 'projectile',
            dirX: len > 1e-9 ? bolt.vx / len : 0,
            dirZ: len > 1e-9 ? bolt.vz / len : 0,
            attacker: sourceId,
            source: skill,
            critBonus,
          });
        }
      });
    },
  });

  function execEchoRecast(rec) {
    const base = SKILLS[rec.skill];
    const def = resolveDef(base);
    const frac = base.archetype === 'heal' ? TECH.echoHealFrac : TECH.echoDamageFrac;
    const power = def.power * frac;
    const tick = getTick();
    events.emit(tick, 'echo_recast', {
      skill: rec.skill,
      shape: base.shape,
      power: r2(power),
      x: r2(player.x),
      z: r2(player.z),
    });
    if (skills && typeof skills.deliver === 'function') {
      skills.deliver(def, power, { skill: rec.skill, shape: base.shape, echo: true }, {
        tick,
        boltSys: echoBolts,
        echo: rec.cast,
      });
    }
  }

  // Echo on a passive (§15.3 Reapply): one bonus full-strength pulse every
  // 3.0 s while the aura persists (aura owned + echo in its socket).
  function echoAuraLive(skillId) {
    if (!ownedIds().includes(skillId)) return false;
    return liveTechs(skillId).includes('echo');
  }

  // ---------------------------------------------------------- world phases --
  // Continuous phase: advance echo-recast bolts and Split shards (same swept
  // flight as all §6 projectiles).
  function step(tick) {
    echoBolts.step(tick);
    shardBolts.step(tick);
  }

  // Discrete phase, called before the world's ① deferred drain: delayed Echo
  // recasts mature here (§4 ①), then the passive Reapply cadences.
  function discrete() {
    const tick = getTick();
    while (echoQueue.length > 0 && echoQueue[0].due <= tick) {
      execEchoRecast(echoQueue.shift());
    }
    for (const id of Object.keys(SKILLS)) {
      if (!isPassiveDef(SKILLS[id])) continue;
      if (echoAuraLive(id)) {
        if (!auraEchoNext.has(id)) auraEchoNext.set(id, tick + TECH.echoAuraTicks);
        while (tick >= auraEchoNext.get(id)) {
          auraEchoNext.set(id, auraEchoNext.get(id) + TECH.echoAuraTicks);
          if (skills && typeof skills.pulseAura === 'function') skills.pulseAura(id, { echo: true });
        }
      } else {
        auraEchoNext.delete(id);
      }
    }
  }

  // -------------------------------------------------------- views & preview --
  const fmt = (v) => (Number.isInteger(v) ? String(v) : String(r3(v)));
  const STAT_LABEL = { power: 'power', cd: 'cooldown', count: 'count', area: 'area', range: 'range' };

  // §16 live preview + §15.5 copy for one candidate×skill cell.
  function preview(skillId, nodeId) {
    const def = SKILLS[skillId];
    const n = NODES[nodeId];
    if (!def || !n) return { error: 'unknown' };
    const v = verdictFor(def, nodeId);
    const lines = [];
    // §16 honesty: when this skill already holds the node at its repetition
    // limit, another copy is a hard block — the line must describe what the
    // SOCKETED copy currently does, never a phantom stacked value.
    const selfSlot = selfSlotOf(def, nodeId);
    const copies = (assignments.get(def.id) ?? []).filter((s) => s && s.node === nodeId).length;
    const seated = selfSlot >= 0 && copies >= n.limit;
    const heal = def.archetype === 'heal';
    const passive = isPassiveDef(def);
    if (v.state === 'grey') {
      lines.push(GREY_REASONS[v.reason] ?? v.reason);
      lines.push('legal to socket — contributes nothing');
    } else if (v.state === 'inert') {
      lines.push(`+1 target — currently +0 (all ${v.pop} allies already hit)`);
    } else if (n.kind === 'stat') {
      const from = seated ? resolveWithout(def, selfSlot) : resolveDef(def);
      const to = seated ? resolveDef(def) : resolveWith(def, nodeId);
      if (n.stat === 'critBonus') {
        const a = Math.round((0.05 + (from.critBonus ?? 0)) * 100);
        const b = Math.round((0.05 + (to.critBonus ?? 0)) * 100);
        lines.push(`crit chance ${a}% → ${b}%`);
      } else if (n.stat === 'duration') {
        if (def.durationSec !== undefined) {
          const ta = Math.round(from.durationSec);
          const tb = Math.round(to.durationSec);
          lines.push(`zone ${ta} ticks → ${tb} ticks (${fmt(ta)} s → ${fmt(tb)} s)`);
        }
        if (def.status) lines.push(`${def.status.kind} ${from.status.ticks} → ${to.status.ticks} ticks`);
      } else {
        const unit = n.stat === 'cd' ? ' s' : n.stat === 'area' && def.shape === 'melee_arc' ? '°' : n.stat === 'area' || n.stat === 'range' ? ' u' : '';
        const label = n.stat === 'area' && def.shape === 'melee_arc' ? 'arc half-angle' : STAT_LABEL[n.stat] ?? n.stat;
        lines.push(`${label} ${fmt(from[n.stat])}${unit} → ${fmt(to[n.stat])}${unit}`);
      }
      if (seated) lines.push('already socketed here — this is its live contribution');
    } else {
      const flat = r2(TECH.siphonFrac * flatStagePower(skillId));
      const pw = resolveDef(def).power;
      if (n.id === 'bounce')
        lines.push(
          heal
            ? `heal chains to the next-lowest-HP other ally within ${TECH.bounceRadiusU} u — full power, 1 hop per copy`
            : `impact ricochets to the nearest other enemy within ${TECH.bounceRadiusU} u — full power, 1 hop per copy`
        );
      else if (n.id === 'siphon')
        lines.push(
          heal
            ? `damages the nearest enemy within ${TECH.siphonRadiusU} u of the healed ally for ${flat}`
            : `self-heals ${flat} per instance`
        );
      else if (n.id === 'echo')
        lines.push(
          passive
            ? 'reapply: one bonus full-strength pulse every 3.0 s'
            : `full recast 1.0 s later at ${heal ? '100' : '50'}% power`
        );
      else if (n.id === 'detonate')
        lines.push(
          heal
            ? `full heals burst-heal allies within ${TECH.detonateRadiusU} u for 50% power`
            : `kills by this skill explode — 50% power burst, radius ${TECH.detonateRadiusU} u`
        );
      else if (n.id === 'snare')
        lines.push(
          passive
            ? 'enemies inside the field are slowed 25% (refreshed every pulse)'
            : heal
              ? 'healed allies gain haste 20% for 1.5 s'
              : 'enemies hit are slowed 40% for 1.5 s'
        );
      else if (n.id === 'galvanize')
        lines.push(
          passive
            ? 'allies inside are inspired: +10% damage dealt (refreshed every pulse)'
            : heal
              ? 'healed allies are inspired: +15% damage dealt for 3 s'
              : 'enemies hit are exposed: +20% damage taken for 3 s'
        );
      else if (n.id === 'bulwark')
        lines.push(
          passive
            ? 'each pulse adds 2 shield to the allies inside (up to 10)'
            : heal
              ? `overhealing becomes a shield — up to ${fmt(r2(TECH.bulwarkHealFrac * pw))} per heal, 4 s`
              : 'you gain a shield worth 20% of the damage dealt (up to 30)'
        );
      else if (n.id === 'split')
        lines.push(
          heal
            ? `the 2 nearest other allies within ${TECH.splitHealRadiusU} u get ${fmt(r2(TECH.splitFrac * pw))} too`
            : `on impact: 2 shards at ±${TECH.splitAngleDeg}°, ${fmt(r2(TECH.splitFrac * pw))} power, ${TECH.splitRangeU} u`
        );
      else if (n.id === 'resonance')
        lines.push(
          passive
            ? 'legendary — a passive’s single socket caps at rare'
            : `every 3rd cast resolves at ×2 power (${fmt(r2(pw * TECH.resonanceMul))})`
        );
    }
    if (n.id === 'siphon') lines.push(SIPHON_CARD_LINE); // binding card line
    return { verdict: v, seated, lines };
  }

  // §15.5 card verdict: non-grey AND non-inert on at least one owned skill.
  function kitVerdict(nodeId) {
    const fits = ownedIds().some((id) => verdictFor(SKILLS[id], nodeId).state === 'live');
    return fits ? 'fits your kit' : 'nothing in your kit uses this yet';
  }

  function view() {
    return {
      combatActive: isCombatActive(),
      bench: bench.map((b) => ({ ...b })),
      skills: ownedIds().map((id) => {
        const def = SKILLS[id];
        const res = resolveDef(def);
        const caps = capsFor(def);
        return {
          id,
          name: def.name,
          archetype: def.archetype,
          shape: def.shape,
          caps: [...caps],
          sockets: socketsOf(id).map((rec, slot) =>
            rec ? { node: rec.node, verdict: verdictFor(def, rec.node, slot).state } : null
          ),
          base: {
            power: def.power,
            cd: def.cd ?? null,
            count: def.count ?? null,
            area: def.area ?? null,
            range: def.range ?? null,
          },
          resolved: {
            power: r2(res.power),
            cd: res.cd !== undefined ? r3(res.cd) : null,
            count: res.count ?? null,
            area: res.area !== undefined ? r3(res.area) : null,
            range: res.range !== undefined ? r3(res.range) : null,
            critBonus: res.critBonus ?? 0,
            durationSec: res.durationSec ?? null,
            statusTicks: res.status ? res.status.ticks : null,
          },
          resonance: resonance.get(id) ?? 0,
        };
      }),
    };
  }

  // Persistence plumbing for the run block (§13: bench + assignments persist
  // across rooms, wiped at run end). Resonance counters ride along ("persist
  // across rooms, reset at run end" — the run wipe restores an empty build).
  function serialize() {
    const tick = getTick();
    return {
      bench: bench.map((b) => ({ ...b })),
      assignments: [...assignments.entries()].map(([k, v]) => [k, v.map((r) => (r ? { ...r } : null))]),
      resonance: [...resonance.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      auraEcho: [...auraEchoNext.entries()].map(([k, v]) => [k, Math.max(0, v - tick)]),
    };
  }

  function restore(data) {
    if (!data) return false;
    const tick = getTick();
    bench.length = 0;
    for (const b of data.bench ?? []) bench.push({ ...b });
    assignments.clear();
    for (const [k, v] of data.assignments ?? []) assignments.set(k, v.map((r) => (r ? { ...r } : null)));
    resonance.clear();
    for (const [k, v] of data.resonance ?? []) resonance.set(k, v);
    auraEchoNext.clear();
    for (const [k, v] of data.auraEcho ?? []) auraEchoNext.set(k, tick + v);
    invalidate();
    events.emit(getTick(), 'build_restored', { bench: bench.length });
    return true;
  }

  // Probe / harness hooks (PLAN §6.4): arm an Echo recast now (as if the
  // skill had just been cast on the current aim), and set a Resonance count.
  function echoArm(skillId) {
    const def = SKILLS[skillId];
    if (!def) return { error: `unknown skill '${skillId}'` };
    const tick = getTick();
    const cast = { tick, type: 'skill_cast', slot: -1, skill: skillId, shape: def.shape };
    const dir = player.lastAimDir ?? { x: 1, z: 0 };
    cast.dx = r2(dir.x);
    cast.dz = r2(dir.z);
    cast.x = r2(player.aim ? player.aim.x : player.x);
    cast.z = r2(player.aim ? player.aim.z : player.z);
    cast.targets = party().filter((m) => m.hp > 0).slice(0, def.count ?? 1).map((m) => m.id);
    const due = tick + 1;
    echoQueue.push({ due, skill: skillId, cast });
    events.emit(tick, 'echo_armed', { skill: skillId, dueTick: due, probe: true });
    return { skill: skillId, dueTick: due };
  }

  return {
    resolveDef,
    castMods,
    grantNode,
    socket,
    unsocket,
    preview,
    kitVerdict,
    verdictFor: (skillId, nodeId, slot = null) => verdictFor(SKILLS[skillId], nodeId, slot),
    view,
    step,
    discrete,
    serialize,
    restore,
    echoArm,
    setResonance: (skillId, n) => {
      if (!SKILLS[skillId]) return null;
      resonance.set(skillId, Math.max(0, Math.floor(n ?? 0)));
      return resonance.get(skillId);
    },
    resonanceCount: (skillId) => resonance.get(skillId) ?? 0,
    attachSkills: (s) => {
      skills = s;
    },
    // Read-only card data for the socket screen (§15.5 display contract).
    nodeInfo: (id) => {
      const n = NODES[id];
      return n
        ? { id: n.id, name: n.name, kind: n.kind, rarity: n.rarity, limit: n.limit, rarityRank: RARITY_RANK[n.rarity] }
        : null;
    },
    rarityRank: (r) => RARITY_RANK[r] ?? 0,
    siphonCardLine: () => SIPHON_CARD_LINE,
  };
}
