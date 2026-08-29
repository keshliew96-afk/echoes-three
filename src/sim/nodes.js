// Build system (BUILD_BRIEF §15) — nodes, sockets, reinterpretation.
//
// Owns, with every number VERBATIM from §15.1–§15.4 / Appendix A4:
//   - the 8-node MVP pool (4 stat + 4 technique), rarities, per-skill limits
//   - sockets: active skills 2 slots (A cap rare, B cap legendary), the
//     passive (Warding Aura) 1 slot cap rare; the uncapped bench with
//     provenance; socket/unsocket free + unlimited but ONLY while
//     combat_active == false; repetition ≤ limit incl. the candidate
//   - the stat resolution pipeline per stat key:
//       base → +flat → ×max(0, 1 + Σ additive_pct) → ×Π multiplicative
//       → techniques → clamps (cd ≥ 0.5 s)
//     (two Sharpens = +50% applied once: 22 → 33, never 22×1.25²)
//   - depth-1 technique primitives: Bounce / Siphon / Echo / Detonate per the
//     §15.3 reinterpretation matrix. Technique-produced output NEVER triggers
//     techniques (a Bounce hop doesn't re-bounce, a Detonate burst never
//     re-detonates or feeds Siphon); Echo recasts are new resolutions
//     producing PRIMARY events but an echo never re-arms its own echo.
//   - grey / saturation-inert / verdict computation (§15.5 display contract's
//     sim truth): grey = technique cell GREY or stat key absent — legal to
//     socket, contributes nothing; saturation-inert = Multiply where the
//     realizable delta is 0 (Restorative Wave: 4 → 5 but ally pop = 4).
//
// Integration seams (no rewrite of the skills chain's work):
//   - resolveDef(def) is handed to createSkillSystem as its stat hook — the
//     skill system fires with resolved power/cd/count and this module never
//     re-implements the §6 delivery pipeline for live casts.
//   - techniques trigger off the PRIMARY sim events the combat/skill systems
//     already emit (heal / hit / full_heal / death / skill_cast, correlated
//     synchronously) and execute through the world's §4 ③ continuation queue,
//     depth-first immediately after their triggering impact.
//   - Echo recasts are §4 ① delayed maturations, run from the world's
//     discrete phase via discrete(); echoed projectiles ride this module's own
//     shapes.js bolt subsystem (same swept sim + render kind 'skillbolt').
//
// Sim discipline: no DOM, no render imports, no wall clock; the only RNG this
// module touches is indirect (combat's own crit rolls). Siphon draws NO roll
// at all — its amount is flat-stage only, immune to %/× nodes, crit, clamps.
import { TICK_HZ, KNOCKBACK } from '../core/constants.js';
import { SKILLS } from './skills.js';
import { fanDirections, selectNova, selectArc, createSkillBolts } from './shapes.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000; // cd previews: 3.5 × 0.85 = 2.975 exactly
const secTicks = (s) => Math.round(s * TICK_HZ);
const BOLT_RADIUS = 0.05; // same swept scaffold radius as every other bolt

// ---------------------------------------------------------------- node pool --
// §15.1 verbatim: | node | kind | rarity | limit/skill | effect |.
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
});

// §15.3 + A4 authored technique numbers, verbatim.
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
});

// §15.3 binding card line — ALWAYS shown on Siphon's card.
export const SIPHON_CARD_LINE =
  'converts 25% of base healing — unmodified by any other socket, crit, or buff.';

// §15.2 socket caps: active skills slot A cap rare / slot B cap legendary;
// the passive (aura) has one slot, cap rare. Ascend (legendary) therefore
// fits only slot B and never the passive — no special case needed.
const ACTIVE_CAPS = Object.freeze(['rare', 'legendary']);
const PASSIVE_CAPS = Object.freeze(['rare']);

const isPassiveDef = (def) => def.shape === 'aura';
const capsFor = (def) => (isPassiveDef(def) ? PASSIVE_CAPS : ACTIVE_CAPS);
const slotCountFor = (def) => (isPassiveDef(def) ? 1 : 2);

// Human-readable grey reasons (§15.5 advisory copy).
const GREY_REASONS = Object.freeze({
  no_cd_stat: 'no cooldown stat on this skill',
  no_count_stat: 'no count stat on this skill',
  no_power_stat: 'no power stat on this skill',
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
      if (def[n.stat] === undefined) return { state: 'grey', reason: `no_${n.stat}_stat` };
      if (
        n.id === 'multiply' &&
        (def.shape === 'direct' || def.shape === 'nova' || def.shape === 'melee_arc')
      ) {
        // §15.5 saturation-inert = realizable delta 0, and the delta is
        // strictly WITH-this-copy minus WITHOUT-this-copy. For an ALREADY
        // SOCKETED Multiply resolveDef().count already contains its +1, so
        // the baseline c0 must exclude that slot — otherwise a contributing
        // node reads as inert (Nova Bloom 3 → 4 realises +1: LIVE, while
        // Restorative Wave 4 → 5 against ally pop 4 realises +0: INERT).
        const pop = livingPartyCount();
        const slotIdx = selfSlotOf(def, nodeId, selfSlot);
        const base = slotIdx >= 0 ? resolveWithout(def, slotIdx) : resolveDef(def);
        const c0 = Math.max(1, Math.floor(base.count));
        if (Math.min(c0 + 1, pop) - Math.min(c0, pop) === 0)
          return { state: 'inert', reason: 'saturated', pop, c0 };
      }
      return { state: 'live' };
    }
    // Techniques: retargetable-impact = {projectile, direct} (Bounce);
    // Siphon/Detonate/Echo-active = any active skill; Echo-passive = aura.
    if (isPassiveDef(def)) {
      return n.id === 'echo'
        ? { state: 'live', reason: 'reapply' }
        : { state: 'grey', reason: 'passive_field' };
    }
    if (n.id === 'bounce' && def.shape !== 'projectile' && def.shape !== 'direct')
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
    for (const stat of ['power', 'cd', 'count']) {
      if (def[stat] === undefined) continue; // stat key absent — grey, untouched
      let flat = 0;
      let pct = 0;
      let mult = 1;
      for (const rec of list) {
        if (!rec) continue;
        const n = NODES[rec.node];
        if (n.kind !== 'stat' || n.stat !== stat) continue;
        if (n.op === 'additive_flat') flat += n.value;
        else if (n.op === 'additive_pct') pct += n.value;
        else if (n.op === 'multiplicative') mult *= n.value;
      }
      let v = (def[stat] + flat) * Math.max(0, 1 + pct) * mult;
      if (stat === 'cd') v = Math.max(0.5, v); // §6/§15.4 cooldown floor
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
  // Depth-1 discipline: `suppress` > 0 while Bounce/Siphon/Detonate output is
  // being produced — the trigger listener drops EVERYTHING it hears in that
  // window, and technique instances additionally carry ':'-labelled sources
  // so they can never read as primary. Echo recasts run at suppress == 0 with
  // plain skill-id sources: new resolutions, primary events (§15.3), and echo
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

  events.on('*', (ev) => {
    if (suppress > 0) return; // §15.3: technique output never triggers techniques
    switch (ev.type) {
      case 'heal': {
        lastHeal = ev;
        if (!isPrimary(ev.source)) return;
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
      default:
    }
  });

  // --- Bounce (§15.3): 1 hop per copy, 2.2 u reach, full resolved power.
  // The chain walks positions (the primary victim may already be dead), each
  // hop excluding everything already visited in this chain.
  function runHealChain(skillId, startId, x, z, hops) {
    const power = resolveDef(SKILLS[skillId]).power;
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
        combat.applyHeal(best, power, { healer: player.id, source: `${skillId}:bounce` });
        cx = best.x;
        cz = best.z;
      }
    } finally {
      suppress -= 1;
    }
  }

  function runDamageChain(skillId, startId, x, z, hops) {
    const power = resolveDef(SKILLS[skillId]).power;
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
          dirX,
          dirZ,
          attacker: player.id,
          source: `${skillId}:bounce`,
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
  // resolved power in 1.2 u (normal instances: own crit rolls).
  function runDetonateDamage(skillId, x, z) {
    const power = TECH.detonateFrac * resolveDef(SKILLS[skillId]).power;
    const r2max = TECH.detonateRadiusU * TECH.detonateRadiusU;
    const targets = hostiles()
      .filter((e) => (e.x - x) ** 2 + (e.z - z) ** 2 <= r2max)
      .sort((a, b) => {
        const da = (a.x - x) ** 2 + (a.z - z) ** 2;
        const db = (b.x - x) ** 2 + (b.z - z) ** 2;
        return da !== db ? da - db : a.id - b.id;
      });
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
          dirX,
          dirZ,
          attacker: player.id,
          source: `${skillId}:detonate`,
        });
      }
    } finally {
      suppress -= 1;
    }
  }

  // Heal side: full_heal events from this skill burst-heal OTHER allies
  // within 1.2 u of the topped ally for 50% resolved power.
  function runDetonateHeal(skillId, allyId, x, z) {
    const power = TECH.detonateFrac * resolveDef(SKILLS[skillId]).power;
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
        combat.applyHeal(t, power, { healer: player.id, source: `${skillId}:detonate` });
    } finally {
      suppress -= 1;
    }
  }

  // --------------------------------------------------------------- echo -----
  const echoQueue = []; // { due, skill, cast } in arm order
  let auraEchoNextTick = null;

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
      queueDeferred(bolt.id, () => {
        const t = registry.byId(targetId);
        if (!t) return;
        if (heal) combat.applyHeal(t, power, { healer: sourceId, source: skill });
        else {
          const len = Math.hypot(bolt.vx, bolt.vz);
          combat.applyDamage(t, power, {
            delivery: 'skill',
            dirX: len > 1e-9 ? bolt.vx / len : 0,
            dirZ: len > 1e-9 ? bolt.vz / len : 0,
            attacker: sourceId,
            source: skill,
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
    if (base.shape === 'projectile') {
      for (const d of fanDirections(rec.cast.dx, rec.cast.dz, def.count)) {
        echoBolts.spawn(tick, {
          x: player.x,
          z: player.z,
          dirX: d.x,
          dirZ: d.z,
          speed: base.speed,
          range: def.range,
          radius: BOLT_RADIUS,
          power,
          skill: rec.skill,
          heal: base.archetype === 'heal',
          sourceId: player.id,
        });
      }
    } else if (base.shape === 'direct') {
      for (const id of rec.cast.targets ?? []) {
        const t = registry.byId(id);
        if (t && t.hp > 0)
          combat.applyHeal(t, power, { healer: player.id, source: rec.skill });
      }
    } else if (base.shape === 'nova') {
      const targets = selectNova({
        caster: player,
        party: party(),
        radius: def.area,
        count: def.count,
        isIframed,
      });
      for (const t of targets)
        combat.applyHeal(t, power, { healer: player.id, source: rec.skill });
    } else if (base.shape === 'melee_arc') {
      const targets = selectArc({
        caster: player,
        party: party(),
        aimX: rec.cast.dx,
        aimZ: rec.cast.dz,
        reach: def.range,
        halfAngleDeg: def.area,
        count: def.count,
        isIframed,
      });
      for (const t of targets)
        combat.applyHeal(t, power, { healer: player.id, source: rec.skill });
    } else if (base.shape === 'ground_aoe') {
      const zone = registry.spawn({
        kind: 'zone',
        skill: rec.skill,
        x: rec.cast.x,
        z: rec.cast.z,
        px: rec.cast.x,
        pz: rec.cast.z,
        radius: def.area,
        power,
        sourceId: player.id,
        ticksDone: 0,
        totalTicks: Math.round(secTicks(base.durationSec) / secTicks(1.0)),
        nextTickTick: tick + secTicks(1.0),
      });
      events.emit(tick, 'zone_spawn', {
        id: zone.id,
        skill: rec.skill,
        x: r2(rec.cast.x),
        z: r2(rec.cast.z),
        radius: def.area,
        echo: true,
      });
    }
  }

  // Echo on the passive (§15.3 Reapply): one bonus full-strength aura pulse
  // every 3.0 s while the aura persists (aura owned + echo in its socket).
  function echoAuraLive() {
    if (!ownedIds().includes('warding_aura')) return false;
    return liveTechs('warding_aura').includes('echo');
  }

  function runAuraReapply() {
    const def = resolveDef(SKILLS.warding_aura);
    const tick = getTick();
    const inField = party()
      .filter(
        (m) =>
          m.id !== player.id &&
          m.hp > 0 &&
          !isIframed(m) &&
          (m.x - player.x) ** 2 + (m.z - player.z) ** 2 <= def.area * def.area
      )
      .sort((a, b) => {
        const da = (a.x - player.x) ** 2 + (a.z - player.z) ** 2;
        const db = (b.x - player.x) ** 2 + (b.z - player.z) ** 2;
        return da !== db ? da - db : a.id - b.id;
      });
    const healed = [];
    for (const m of inField) {
      const r = combat.applyHeal(m, def.power, { healer: player.id, source: 'warding_aura' });
      if (r) healed.push(m.id);
    }
    events.emit(tick, 'aura_pulse', { healed, echo: true });
  }

  // ---------------------------------------------------------- world phases --
  // Continuous phase: advance echo-recast bolts (same swept flight as all
  // §6 projectiles).
  function step(tick) {
    echoBolts.step(tick);
  }

  // Discrete phase, called before the world's ① deferred drain: delayed Echo
  // recasts mature here (§4 ①), then the passive Reapply cadence.
  function discrete() {
    const tick = getTick();
    while (echoQueue.length > 0 && echoQueue[0].due <= tick) {
      execEchoRecast(echoQueue.shift());
    }
    if (echoAuraLive()) {
      if (auraEchoNextTick === null) auraEchoNextTick = tick + TECH.echoAuraTicks;
      while (tick >= auraEchoNextTick) {
        auraEchoNextTick += TECH.echoAuraTicks;
        runAuraReapply();
      }
    } else {
      auraEchoNextTick = null;
    }
  }

  // -------------------------------------------------------- views & preview --
  const fmt = (v) => (Number.isInteger(v) ? String(v) : String(r3(v)));

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
    if (v.state === 'grey') {
      lines.push(GREY_REASONS[v.reason] ?? v.reason);
      lines.push('legal to socket — contributes nothing');
    } else if (v.state === 'inert') {
      lines.push(`+1 target — currently +0 (all ${v.pop} allies already hit)`);
    } else if (n.kind === 'stat') {
      const unit = n.stat === 'cd' ? ' s' : '';
      const label = n.stat === 'cd' ? 'cooldown' : n.stat;
      const from = seated ? resolveWithout(def, selfSlot) : resolveDef(def);
      const to = seated ? resolveDef(def) : resolveWith(def, nodeId);
      lines.push(`${label} ${fmt(from[n.stat])}${unit} → ${fmt(to[n.stat])}${unit}`);
      if (seated) lines.push('already socketed here — this is its live contribution');
    } else {
      const flat = r2(TECH.siphonFrac * flatStagePower(skillId));
      const heal = def.archetype === 'heal';
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
          isPassiveDef(def)
            ? 'reapply: one bonus full-strength pulse every 3.0 s'
            : `full recast 1.0 s later at ${heal ? '100' : '50'}% power`
        );
      else if (n.id === 'detonate')
        lines.push(
          heal
            ? `full heals burst-heal allies within ${TECH.detonateRadiusU} u for 50% power`
            : `kills by this skill explode — 50% power burst, radius ${TECH.detonateRadiusU} u`
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
          base: { power: def.power, cd: def.cd ?? null, count: def.count ?? null },
          resolved: { power: r2(res.power), cd: res.cd !== undefined ? r3(res.cd) : null, count: res.count ?? null },
        };
      }),
    };
  }

  // Persistence plumbing for the run block (§13: bench + assignments persist
  // across rooms, wiped at run end).
  function serialize() {
    return {
      bench: bench.map((b) => ({ ...b })),
      assignments: [...assignments.entries()].map(([k, v]) => [k, v.map((r) => (r ? { ...r } : null))]),
    };
  }

  function restore(data) {
    if (!data) return false;
    bench.length = 0;
    for (const b of data.bench ?? []) bench.push({ ...b });
    assignments.clear();
    for (const [k, v] of data.assignments ?? []) assignments.set(k, v.map((r) => (r ? { ...r } : null)));
    invalidate();
    events.emit(getTick(), 'build_restored', { bench: bench.length });
    return true;
  }

  return {
    resolveDef,
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
