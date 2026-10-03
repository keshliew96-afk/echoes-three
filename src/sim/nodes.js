// Build system (BUILD_BRIEF §15 + §23.4) — nodes, sockets, reinterpretation.
//
// Owns, with every number VERBATIM from §15.1–§15.4 / Appendix A4 / §23.4:
//   - the 17-node pool: 8 stat (Sharpen, Quicken, Multiply, Ascend, Widen,
//     Reach, Linger, Keen) + 9 technique (Bounce, Siphon, Echo, Detonate,
//     Snare, Galvanize, Bulwark, Split, Resonance), rarities, per-skill limits
//   - sockets (M4c user correction 2026-09-22): EVERY skill — actives and
//     passives — has SOCKETS_PER_SKILL (8) sockets and ANY node of ANY rarity
//     fits ANY socket (the old §15.2 rarity caps are gone); the bench with
//     provenance ('drafted' | 'purchased' | 'spoils' | ...); socket/unsocket
//     free + unlimited but ONLY while combat_active == false; repetition ≤
//     limit incl. the candidate; autoFill() = the one auto-socket policy the
//     socket screen and the autopilot share
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
import { TICK_HZ, KNOCKBACK, SOCKETS_PER_SKILL } from '../core/constants.js';
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

  // ------------------------------------ PARTY class nodes (BUILD_BRIEF §25.3) --
  // All techniques; `cls` = the only class whose pool holds it (shared nodes
  // above carry none). Per-column effects: sim/partytech.js.
  provoke: Object.freeze({ id: 'provoke', name: 'Provoke', kind: 'technique', rarity: 'common', limit: 1, cls: 'tank' }),
  brace: Object.freeze({ id: 'brace', name: 'Brace', kind: 'technique', rarity: 'common', limit: 2, cls: 'tank' }),
  tremor: Object.freeze({ id: 'tremor', name: 'Tremor', kind: 'technique', rarity: 'rare', limit: 1, cls: 'tank' }),
  anchor: Object.freeze({ id: 'anchor', name: 'Anchor', kind: 'technique', rarity: 'rare', limit: 1, cls: 'tank' }),
  retaliate: Object.freeze({ id: 'retaliate', name: 'Retaliate', kind: 'technique', rarity: 'rare', limit: 1, cls: 'tank' }),
  aegis: Object.freeze({ id: 'aegis', name: 'Aegis', kind: 'technique', rarity: 'legendary', limit: 1, cls: 'tank' }),
  flow: Object.freeze({ id: 'flow', name: 'Flow', kind: 'technique', rarity: 'common', limit: 2, cls: 'swordsman' }),
  momentum: Object.freeze({ id: 'momentum', name: 'Momentum', kind: 'technique', rarity: 'common', limit: 1, cls: 'swordsman' }),
  parry: Object.freeze({ id: 'parry', name: 'Parry', kind: 'technique', rarity: 'common', limit: 1, cls: 'swordsman' }),
  pursuit: Object.freeze({ id: 'pursuit', name: 'Pursuit', kind: 'technique', rarity: 'rare', limit: 1, cls: 'swordsman' }),
  lethality: Object.freeze({ id: 'lethality', name: 'Lethality', kind: 'technique', rarity: 'rare', limit: 1, cls: 'swordsman' }),
  execute: Object.freeze({ id: 'execute', name: 'Execute', kind: 'technique', rarity: 'legendary', limit: 1, cls: 'swordsman' }),
  skewer: Object.freeze({ id: 'skewer', name: 'Skewer', kind: 'technique', rarity: 'common', limit: 2, cls: 'archer' }),
  concussive: Object.freeze({ id: 'concussive', name: 'Concussive', kind: 'technique', rarity: 'common', limit: 1, cls: 'archer' }),
  steady_aim: Object.freeze({ id: 'steady_aim', name: 'Steady Aim', kind: 'technique', rarity: 'rare', limit: 1, cls: 'archer' }),
  disengage: Object.freeze({ id: 'disengage', name: 'Disengage', kind: 'technique', rarity: 'rare', limit: 1, cls: 'archer' }),
  scatter: Object.freeze({ id: 'scatter', name: 'Scatter', kind: 'technique', rarity: 'rare', limit: 1, cls: 'archer' }),
  heartseeker: Object.freeze({ id: 'heartseeker', name: 'Heartseeker', kind: 'technique', rarity: 'legendary', limit: 1, cls: 'archer' }),
});

// The Healer's 17 shared nodes (class nodes excluded), ascending id.
export const SHARED_NODE_IDS = Object.freeze(Object.keys(NODES).filter((id) => !NODES[id].cls).sort());

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

// §15.2 sockets (M4c user correction, 2026-09-22 — binding): 8 sockets on
// EVERY skill, passives included, and no socket has a rarity cap. A legendary
// therefore fits a passive too, so each legendary has a defined passive
// reinterpretation instead of a cap verdict: Ascend is a stat node (×2 pulse
// power through the §15.4 pipeline), Resonance makes every 3rd pulse ×2
// (pulseMods() below).
export const SOCKET_COUNT = SOCKETS_PER_SKILL;

const isPassiveDef = (def) => def.shape === 'aura';
const slotCountFor = () => SOCKET_COUNT;
// A build row is always exactly SOCKET_COUNT long in memory: rows restored
// from an older save (2 / 1 sockets) or a run-block payload are padded, never
// truncated below a socketed node (the schema-2 migration moved any overflow
// to the bench first; a longer row keeps its nodes).
function normRow(row) {
  const out = Array.isArray(row) ? row.map((r) => (r ? r : null)) : [];
  while (out.length < SOCKET_COUNT) out.push(null);
  return out;
}
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

// ------------------------------------------- PARTY class verdicts (§25.3/§25.4) --
// The node × class-skill rules of BUILD_BRIEF §25.3 — exactly the rules the
// design oracle (tools/gntPARTYD-grid.mjs, docs/gauntlet/party-oracle.json)
// derives the 440 cells from. Healer rows keep the §15 rules below
// (verdictFor), which the oracle cross-checks separately (289 cells).
// Static except the two per-copy saturation cases (Widen on a clamped arc,
// Multiply on a guard that already reaches the party), resolved by the build.
const isClassSkill = (def) => !!def && !!def.cls && def.cls !== 'healer';
const areaShape = (d) => d.shape === 'melee_arc' || d.shape === 'nova' || d.shape === 'ground_aoe';
const rollsCrit = (d) => d.archetype === 'damage' || d.archetype === 'heal' || (isPassiveDef(d) && d.output !== 'shield');
const PASSIVE_GREY = 'a passive field — nothing here for this technique to act on';
function classHasStat(d, stat) {
  if (stat === 'critBonus') return rollsCrit(d);
  if (stat === 'area') return d.area !== undefined && d.area > 0;
  if (stat === 'duration') return d.durationSec !== undefined || (!!d.status && !isPassiveDef(d)) || (!!d.parry && !isPassiveDef(d));
  return d[stat] !== undefined;
}
const CLASS_GREY_STAT = Object.freeze({
  cd: 'no cooldown stat on this skill',
  count: 'no count stat on this skill',
  area: 'single-target shape — no area to widen',
  range: 'no range stat on this skill',
  duration: 'nothing on this skill lasts — no duration to extend',
  critBonus: 'shields never crit',
  power: 'no power stat',
});
// classVerdict(def, nodeId) -> { state: 'live'|'grey'|'inert', reason? } for
// the FIRST copy on an otherwise empty row (the oracle's cell).
export function classVerdict(d, id) {
  const n = NODES[id];
  if (!n) return { state: 'grey', reason: 'unknown_node' };
  const G = (reason) => ({ state: 'grey', reason });
  const I = (reason) => ({ state: 'inert', reason });
  const L = { state: 'live' };
  const passive = isPassiveDef(d);
  const dmg = d.archetype === 'damage';
  if (n.kind === 'stat') {
    if (!classHasStat(d, n.stat)) return G(CLASS_GREY_STAT[n.stat]);
    if (id === 'widen' && d.shape === 'melee_arc' && d.area >= 90) return I('+0 — already a full 90° half-angle (the §23.4 clamp)');
    if (id === 'multiply' && (d.archetype === 'heal' || d.archetype === 'guard') && (d.shape === 'direct' || d.shape === 'nova' || d.shape === 'melee_arc') && (d.count ?? 1) >= 4)
      return I('+0 — the whole party is already reached');
    return L;
  }
  switch (id) {
    case 'bounce':
      if (passive) return G(PASSIVE_GREY);
      return retargetable(d) ? L : G('needs a retargetable impact (projectile or direct)');
    case 'siphon':
      if (d.archetype === 'guard') return G('a shield drains nothing');
      if (passive) return d.field === 'hostile' ? L : G(PASSIVE_GREY);
      return L;
    case 'echo':
    case 'resonance':
      return L;
    case 'detonate':
      if (passive) return d.field === 'hostile' ? L : G(PASSIVE_GREY);
      return L;
    case 'snare':
    case 'galvanize':
    case 'bulwark':
      return L;
    case 'split':
      if (passive) return G(PASSIVE_GREY);
      return retargetable(d) ? L : G('needs a retargetable impact (projectile or direct)');
    case 'provoke':
      if (passive) return d.field === 'ally' ? L : G('a hostile field of another class');
      if (d.archetype === 'guard') return L;
      if (d.status && d.status.kind === 'taunt' && d.status.ticks >= 90) return I(`+0 — this skill already taunts longer (${d.status.ticks} ticks)`);
      return L;
    case 'brace':
      return L;
    case 'tremor':
      if (!dmg || !areaShape(d)) return G(passive ? PASSIVE_GREY : 'no hostile delivery to stagger with');
      if (d.status && d.status.kind === 'stun' && d.status.ticks >= 18) return I(`+0 — this skill already stuns longer (${d.status.ticks} ticks)`);
      return L;
    case 'anchor':
      if (!dmg || !areaShape(d)) return G(passive ? PASSIVE_GREY : 'no hostile area delivery to pull with');
      return L;
    case 'retaliate':
      return passive ? G(PASSIVE_GREY) : L;
    case 'aegis':
    case 'flow':
    case 'momentum':
      return L;
    case 'parry':
      return passive ? G(PASSIVE_GREY) : L;
    case 'pursuit':
      if (passive) return G(PASSIVE_GREY);
      if (d.parry) return G('the counter answers an attacker already in reach');
      if (d.dash) return L;
      if (d.shape === 'melee_arc' || d.shape === 'nova') return L;
      return G('the delivery is placed at range — nothing to close');
    case 'lethality':
    case 'execute':
    case 'concussive':
    case 'steady_aim':
    case 'heartseeker':
      return L;
    case 'skewer':
      return d.shape === 'projectile' ? L : G('only a bolt can pierce');
    case 'disengage':
      return passive ? G(PASSIVE_GREY) : L;
    case 'scatter':
      if (d.shape === 'ground_aoe' || d.shape === 'projectile') return L;
      return G(passive ? PASSIVE_GREY : 'a self burst has nothing to scatter');
    default:
      return G('unknown_node');
  }
}

// createBuildSystem options added by PARTY (PLAN §16.3): the world makes FOUR
// instances — seat 0 (the Healer, today's buildSys: same object, same API,
// same events, same save subtree) and seats 1-3 (the party system). A seat
// instance:
//   seat, classId   — which character; `owns(skillId)` = the skill's class
//   caster()        — the body its techniques act for (default: the player)
//   echoCast(rec)   — an Echo recast of an ally skill (sim/allycast.js)
//   pulseCast(id, o)— a passive's bonus Reapply pulse (the party system)
// A seat instance registers NO technique listener of its own — the party
// technique module (sim/partytech.js) reacts for it through `tech` below.
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
  seat = 0,
  classId = 'healer',
  caster = null,
  echoCast = null,
  pulseCast = null,
}) {
  // The body this build's techniques act for (the Healer: the player).
  const P = () => (caster ? caster() : player);
  const isHealer = classId === 'healer';
  const owns = (id) => {
    const d = SKILLS[id];
    return !!d && (isHealer ? !d.cls || d.cls === 'healer' : d.cls === classId);
  };
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
    if (isClassSkill(def)) return classVerdictLive(def, nodeId, selfSlot);
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
    // Reapply; Snare / Galvanize / Bulwark / Resonance have a passive
    // reinterpretation (Resonance: every 3rd pulse ×2 — M4c, now that no
    // socket caps a legendary out of a passive).
    if (isPassiveDef(def)) {
      if (n.id === 'echo') return { state: 'live', reason: 'reapply' };
      if (n.id === 'snare' || n.id === 'galvanize' || n.id === 'bulwark' || n.id === 'resonance')
        return { state: 'live', reason: 'pulse' };
      return { state: 'grey', reason: 'passive_field' };
    }
    if ((n.id === 'bounce' || n.id === 'split') && !retargetable(def))
      return { state: 'grey', reason: 'no_retargetable_impact' };
    return { state: 'live' };
  }

  // PARTY: the §25.3 class rules + the per-copy saturation of this build's
  // rows (a SECOND Widen on Brutal Cleave: 80° → 90° → 90° is +0 on the
  // second copy, judged per copy as socketed).
  function classVerdictLive(def, nodeId, selfSlot) {
    const v = classVerdict(def, nodeId);
    if (v.state !== 'live') return v;
    if (nodeId === 'widen' && def.shape === 'melee_arc') {
      const slotIdx = selfSlotOf(def, nodeId, selfSlot);
      const base = slotIdx >= 0 ? resolveWithout(def, slotIdx) : resolveDef(def);
      if (base.area >= 90) return { state: 'inert', reason: '+0 — already a full 90° half-angle (the §23.4 clamp)' };
    }
    if (nodeId === 'multiply' && def.archetype === 'guard') {
      const slotIdx = selfSlotOf(def, nodeId, selfSlot);
      const base = slotIdx >= 0 ? resolveWithout(def, slotIdx) : resolveDef(def);
      if (Math.floor(base.count ?? 1) >= 4) return { state: 'inert', reason: '+0 — the whole party is already reached' };
    }
    return v;
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
      if (!(isClassSkill(def) ? classHasStat(def, stat) : hasStat(def, stat))) continue; // stat key absent — grey, untouched
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
        if (def.parry) out.parry = { ...def.parry, windowTicks: Math.round(def.parry.windowTicks * k) }; // PARTY: a parry window lasts
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

  // socket(skillId, nodeId, slot?, benchIndex?) — slot omitted picks the
  // first vacant socket. Any rarity fits any socket (M4c). Hard blocks — the
  // repetition limit, a full row, a bad slot, combat — refuse with a
  // socket_denied event (§16 rejection shake); grey is advisory and proceeds.
  // `benchIndex` names WHICH bench copy to take (the socket screen's focused
  // card); by default the first copy of that node.
  function socket(skillId, nodeId, slot = null, benchIndex = null) {
    const node = NODES[nodeId];
    if (!node) return deny(skillId, nodeId, slot, 'unknown_node');
    if (isCombatActive()) return deny(skillId, nodeId, slot, 'combat_active');
    if (!ownedIds().includes(skillId)) return deny(skillId, nodeId, slot, 'skill_not_owned');
    const benchIdx =
      Number.isInteger(benchIndex) && bench[benchIndex] && bench[benchIndex].node === nodeId
        ? benchIndex
        : bench.findIndex((b) => b.node === nodeId);
    if (benchIdx < 0) return deny(skillId, nodeId, slot, 'not_on_bench');
    const def = SKILLS[skillId];
    const slots = socketsOf(skillId);

    let target = slot;
    if (target === null || target === undefined) {
      target = slots.findIndex((s) => s === null);
      if (target < 0) return deny(skillId, nodeId, null, 'full');
    } else if (!(Number.isInteger(target) && target >= 0 && target < slots.length)) {
      return deny(skillId, nodeId, target, 'no_such_slot');
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
    return { skill: skillId, node: nodeId, slot: target, verdict: verdict.state, swapped: prev ? prev.node : null };
  }

  function unsocket(skillId, slot) {
    if (isCombatActive()) return deny(skillId, null, slot, 'combat_active');
    const slots = assignments.get(skillId);
    const rec = slots && Number.isInteger(slot) ? slots[slot] : null;
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
    typeof src === 'string' && !src.includes(':') && SKILLS[src] !== undefined && owns(src);

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
    return S().apply(e, kind, mag, ticks, getTick(), P().id);
  }

  // The Healer's technique listener (seat 0 only — a seat instance's
  // techniques react through sim/partytech.js, PLAN §16.3).
  if (isHealer) events.on('*', (ev) => {
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
                  S().addShield(m, TECH.bulwarkPassiveAdd, TECH.bulwarkPassiveCap, TECH.bulwarkTicks, tick, P().id);
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
        combat.applyHeal(best, power, { healer: P().id, source: `${skillId}:bounce`, critBonus: rdef.critBonus ?? 0 });
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
          attacker: P().id,
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
        attacker: P().id,
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
    if (!(P().hp > 0)) return; // Downed: outside the pipeline
    const amount = r2(TECH.siphonFrac * flatStagePower(skillId));
    const applied = Math.min(amount, P().maxHp - P().hp);
    P().hp += applied;
    const tick = getTick();
    suppress += 1;
    try {
      events.emit(tick, 'heal', {
        target: P().id,
        healer: P().id,
        source: `${skillId}:siphon`,
        amount,
        applied: r2(applied),
        crit: false,
        x: r2(P().x),
        z: r2(P().z),
      });
      events.emit(tick, 'siphon_selfheal', {
        skill: skillId,
        amount,
        x: r2(P().x),
        z: r2(P().z),
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
          attacker: P().id,
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
        combat.applyHeal(t, power, { healer: P().id, source: `${skillId}:detonate`, critBonus: rdef.critBonus ?? 0 });
    } finally {
      suppress -= 1;
    }
  }

  // --- Bulwark (§23.4). Damage side: the caster gains a shield worth 20% of
  // the instance's final damage, accumulating up to 30. Heal side: the
  // instance's overheal (pre-clamp − applied) becomes a shield on the
  // recipient, up to 50% of the instance's resolved power (refresh = max).
  function runBulwarkDamage(skillId, amount) {
    if (!(P().hp > 0) || !(amount > 0)) return;
    const tick = getTick();
    const rec = S().addShield(P(), TECH.bulwarkDamageFrac * amount, TECH.bulwarkDamageCap, TECH.bulwarkTicks, tick, P().id);
    if (rec)
      events.emit(tick, 'technique_pulse', { skill: skillId, node: 'bulwark', mode: 'damage', targets: [P().id], shield: r2(rec.mag) });
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
    owner: seat === 0 ? 'split_shards' : `split_shards:${seat}`, // one subsystem per build (PARTY: seats 1-3 tag their own)
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
            attacker: P().id,
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
        sourceId: P().id,
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
        combat.applyHeal(m, power, { healer: P().id, source: `${skillId}:split`, critBonus: rdef.critBonus ?? 0 });
    } finally {
      suppress -= 1;
    }
  }

  // --- Snare on a passive: enemies inside the field are slowed 25%,
  // refreshed each pulse.
  function runPassiveSnare(skillId, x, z, area) {
    const tick = getTick();
    const cx = Number.isFinite(x) ? x : P().x;
    const cz = Number.isFinite(z) ? z : P().z;
    const radius = Number.isFinite(area) ? area : resolveDef(SKILLS[skillId]).area;
    const hit = [];
    for (const e of hostiles()) {
      if ((e.x - cx) ** 2 + (e.z - cz) ** 2 > radius * radius) continue;
      if (S().apply(e, 'slow', TECH.snarePassiveSlow, TECH.pulseStatusTicks, tick, P().id)) hit.push(e.id);
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
    events.emit(getTick(), 'resonance_proc', { skill: skillId, n, mul: TECH.resonanceMul, x: r2(P().x), z: r2(P().z) });
    return { powerMul: TECH.resonanceMul, resonance: true, count: n };
  }

  // Resonance on a PASSIVE (M4c — a legendary now fits a passive's sockets):
  // every 3rd regular pulse of the aura resolves at ×2 power. Same per-skill
  // counter as casts (persists across rooms, resets at run end); the Echo
  // Reapply bonus pulse never passes through here, exactly as Echo recasts
  // never advance an active's count.
  function pulseMods(skillId) {
    if (!isPassiveDef(SKILLS[skillId]) || !liveTechs(skillId).includes('resonance')) return null;
    const n = (resonance.get(skillId) ?? 0) + 1;
    resonance.set(skillId, n);
    if (n % TECH.resonanceEvery !== 0) return { powerMul: 1, resonance: false, count: n };
    events.emit(getTick(), 'resonance_proc', { skill: skillId, n, mul: TECH.resonanceMul, pulse: true, x: r2(P().x), z: r2(P().z) });
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
    // A stable owner tag (M2, PLAN §3.4): an unnamed instance is numbered per
    // page (`bolts#N`), which would make a saved echo bolt page-dependent.
    owner: seat === 0 ? 'echo_bolts' : `echo_bolts:${seat}`, // PARTY: seats 1-3 tag their own (PLAN §16.3)
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
      x: r2(P().x),
      z: r2(P().z),
    });
    // PARTY: an ally skill's echo replays its DELIVERY through the ally cast
    // pipeline (never the dash / vault / parry window; never a cast).
    if (echoCast) {
      echoCast(rec, def, power);
      return;
    }
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
      if (!isPassiveDef(SKILLS[id]) || !owns(id)) continue;
      if (echoAuraLive(id)) {
        if (!auraEchoNext.has(id)) auraEchoNext.set(id, tick + TECH.echoAuraTicks);
        while (tick >= auraEchoNext.get(id)) {
          auraEchoNext.set(id, auraEchoNext.get(id) + TECH.echoAuraTicks);
          if (pulseCast) pulseCast(id, { echo: true });
          else if (skills && typeof skills.pulseAura === 'function') skills.pulseAura(id, { echo: true });
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
      // §15.5 "+0": the Healer's saturated Multiply keeps its binding copy.
      // A class cell (§25.3) states its own reason instead of the Multiply
      // template; the socket screen already prints the "＋0" mark, so the
      // reason's own "+0 — " lead is dropped here.
      if (v.reason === 'saturated') lines.push(`+1 target — currently +0 (all ${v.pop} allies already hit)`);
      else {
        const why = typeof v.reason === 'string' ? v.reason.replace(/^\+0\s*—\s*/, '') : '';
        lines.push(why || 'contributes nothing on this skill right now');
        lines.push('legal to socket — contributes nothing while this holds');
      }
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
            ? `every 3rd pulse resolves at ×2 power (${fmt(r2(pw * TECH.resonanceMul))} per ally)`
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

  // Pure read of one row: never creates the lazy all-empty row (so a
  // render-side read can never change what saveState() returns).
  const rowOf = (id) => assignments.get(id) ?? new Array(SOCKET_COUNT).fill(null);

  function view() {
    return {
      combatActive: isCombatActive(),
      socketCount: SOCKET_COUNT,
      bench: bench.map((b) => ({ ...b })),
      skills: ownedIds().map((id) => {
        const def = SKILLS[id];
        const res = resolveDef(def);
        const sockets = rowOf(id).map((rec, slot) =>
          rec ? { node: rec.node, verdict: verdictFor(def, rec.node, slot).state } : null
        );
        return {
          id,
          name: def.name,
          archetype: def.archetype,
          shape: def.shape,
          sockets,
          filled: sockets.filter(Boolean).length,
          live: sockets.filter((s) => s && s.verdict === 'live').length,
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

  // ------------------------------------------------------------ auto-fill --
  // The ONE auto-socket policy (M4c decision D7) — the socket screen's
  // Auto-fill and the autopilot both call it. Bench order; each node goes to
  // the owned skill where it is LIVE (never grey, never saturation-inert),
  // within its repetition limit, with a vacant socket, preferring the skill
  // with the FEWEST filled sockets (ties: the lower skill slot) — so a big
  // bench spreads over the kit instead of piling onto slot 1. Each placement
  // is an ordinary socket() (same events, same denials). Deterministic: state
  // only, ascending orders, no RNG.
  function planFill() {
    const plan = [];
    const owned = ownedIds();
    const rows = new Map(owned.map((id) => [id, rowOf(id).slice()]));
    for (let bi = 0; bi < bench.length; bi++) {
      const nodeId = bench[bi].node;
      const n = NODES[nodeId];
      if (!n) continue;
      let best = null;
      for (const id of owned) {
        const row = rows.get(id);
        const vacant = row.indexOf(null);
        if (vacant < 0) continue;
        const copies = row.filter((r) => r && r.node === nodeId).length;
        if (copies + 1 > n.limit) continue;
        if (verdictFor(SKILLS[id], nodeId).state !== 'live') continue;
        const filled = row.filter(Boolean).length;
        if (!best || filled < best.filled) best = { id, vacant, filled };
      }
      if (!best) {
        // No vacant live socket anywhere: an UPGRADE swap (fix-M4a-r4) —
        // replace the weakest socketed node this one outranks.
        const up = upgradeFor(nodeId, rows);
        if (!up) continue;
        rows.get(up.skill)[up.slot] = { node: nodeId, provenance: 'plan' };
        plan.push({ skill: up.skill, node: nodeId, slot: up.slot, benchIndex: bi, replaces: up.replaces, why: up.why });
        continue;
      }
      rows.get(best.id)[best.vacant] = { node: nodeId, provenance: 'plan' };
      plan.push({ skill: best.id, node: nodeId, slot: best.vacant, benchIndex: bi });
    }
    return plan;
  }

  // ------------------------------------------------------------- upgrades --
  // fix-M4a-r4 (CONTENT4-F1): a FULL build keeps progressing. A node with no
  // vacant live socket can still UPGRADE a row by replacing a weaker occupant
  // (the occupant banks to the bench — socket()'s free swap). The candidate
  // OUTRANKS an occupant when that occupant is dead weight on its skill (grey
  // or saturation-inert: score −1) or of a lower rarity (RARITY_RANK: common
  // 0 < rare 1 < legendary 2) — the same value ladder the shop prices by.
  // The candidate must be LIVE on the skill and stay within its repetition
  // limit with the occupant out. Target = the weakest outranked occupant
  // (lowest score), ties: the lower skill slot, then the lower socket.
  // Deterministic, no RNG, pure read (the rows may be a planned copy).
  const occupantScore = (def, rec, slot) =>
    verdictFor(def, rec.node, slot).state === 'live' ? RARITY_RANK[NODES[rec.node].rarity] : -1;

  function upgradeIn(skillId, nodeId, row = null) {
    const n = NODES[nodeId];
    const def = SKILLS[skillId];
    if (!n || !def) return null;
    const list = row ?? rowOf(skillId);
    const copies = list.filter((r) => r && r.node === nodeId).length;
    if (copies + 1 > n.limit) return null; // the occupant is never this node (same rank)
    if (verdictFor(def, nodeId).state !== 'live') return null;
    const rank = RARITY_RANK[n.rarity];
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const rec = list[i];
      if (!rec || rec.node === nodeId || !NODES[rec.node]) continue;
      const score = occupantScore(def, rec, i);
      if (score >= rank) continue;
      if (!best || score < best.score)
        best = {
          skill: skillId,
          slot: i,
          replaces: rec.node,
          score,
          why: score < 0 ? verdictFor(def, rec.node, i).state : 'rarity', // 'grey' | 'inert' | 'rarity'
        };
    }
    return best;
  }

  function upgradeFor(nodeId, rows = null) {
    let best = null;
    for (const id of ownedIds()) {
      const up = upgradeIn(id, nodeId, rows ? rows.get(id) : null);
      if (up && (!best || up.score < best.score)) best = up;
    }
    return best;
  }

  function autoFill() {
    if (isCombatActive()) return { denied: 'combat_active', socketed: [] };
    const socketed = [];
    // Re-plan after every placement: a Multiply that just landed can make a
    // later node's verdict inert, and bench indices shift as cards leave. An
    // upgrade swap strictly raises the build's rank sum and a vacant fill
    // raises its socket count, so this terminates; the guard is a backstop
    // (32 fills + at most 3 rank steps per socket).
    for (let guard = 0; guard < 256; guard++) {
      const plan = planFill();
      if (plan.length === 0) break;
      const p = plan[0];
      const r = socket(p.skill, p.node, p.slot, p.benchIndex);
      if (!r || r.denied) break;
      socketed.push(
        r.swapped ? { skill: p.skill, node: p.node, slot: r.slot, replaced: r.swapped } : { skill: p.skill, node: p.node, slot: r.slot }
      );
    }
    const upgraded = socketed.filter((s) => s.replaced).length;
    events.emit(getTick(), 'build_autofill', {
      socketed: socketed.length,
      bench: bench.length,
      ...(upgraded ? { upgraded } : {}),
    });
    return { socketed, bench: bench.length, upgraded };
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
    for (const [k, v] of data.assignments ?? []) assignments.set(k, normRow(v).map((r) => (r ? { ...r } : null)));
    resonance.clear();
    for (const [k, v] of data.resonance ?? []) resonance.set(k, v);
    auraEchoNext.clear();
    for (const [k, v] of data.auraEcho ?? []) auraEchoNext.set(k, tick + v);
    invalidate();
    events.emit(getTick(), 'build_restored', { bench: bench.length });
    return true;
  }

  // Ruling A17 (the user's rule): a skill SWAPPED out of the loadout takes
  // nothing with it — every node on its row goes to the bench with its
  // provenance (never lost), and its Resonance count, pending Echo recasts and
  // passive Reapply clock end with it. Returns the released node ids in
  // socket order. Called by the run system between rooms only.
  function releaseSkill(skillId) {
    const row = assignments.get(skillId);
    const released = [];
    if (row) {
      for (const rec of row) {
        if (!rec) continue;
        bench.push(rec);
        released.push(rec.node);
      }
    }
    assignments.delete(skillId);
    resonance.delete(skillId);
    for (let i = echoQueue.length - 1; i >= 0; i--) if (echoQueue[i].skill === skillId) echoQueue.splice(i, 1);
    auraEchoNext.delete(skillId);
    invalidate();
    return released;
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

  // Save system (docs/gauntlet/PLAN.md §3.4, M2) — the COMPLETE private state
  // (serialize()/restore() above are the run block's persistence and stay as
  // they are): bench, sockets, Resonance counters, the depth-1 suppression
  // counter, the heal/hit correlation memory, pending Echo recasts (plain
  // `{ due, skill, cast }` data, never closures) and the passive Reapply
  // clocks. The resolved-def cache is derived and simply invalidated.
  // `assignments` is filled LAZILY by reads (socketsOf() creates an all-empty
  // row the first time a view asks — the HUD and probes do), and it is only
  // ever accessed by key. So the saved form is canonical: all-empty rows are
  // omitted (socketsOf() recreates the identical row on demand) and rows are
  // sorted by skill id — a render-side read can never change a state hash.
  function saveState() {
    return {
      bench,
      assignments: [...assignments.entries()]
        .filter(([, v]) => Array.isArray(v) && v.some((r) => r))
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
      resonance: [...resonance.entries()],
      suppress,
      lastHeal,
      lastHit,
      echoQueue,
      auraEchoNext: [...auraEchoNext.entries()],
    };
  }
  function loadState(d) {
    if (!d || !Array.isArray(d.bench)) throw new TypeError('build.loadState: missing bench');
    bench.length = 0;
    for (const b of d.bench) bench.push(b);
    assignments.clear();
    // Rows are padded to SOCKET_COUNT (a tree migrated from schema 1 already
    // is; this keeps any older in-memory payload loadable too).
    for (const [k, v] of d.assignments ?? []) assignments.set(k, Array.isArray(v) && v.length >= SOCKET_COUNT ? v : normRow(v));
    resonance.clear();
    for (const [k, v] of d.resonance ?? []) resonance.set(k, v);
    suppress = Number.isFinite(d.suppress) ? d.suppress : 0;
    lastHeal = d.lastHeal ?? null;
    lastHit = d.lastHit ?? null;
    echoQueue.length = 0;
    for (const r of d.echoQueue ?? []) echoQueue.push(r);
    auraEchoNext.clear();
    for (const [k, v] of d.auraEchoNext ?? []) auraEchoNext.set(k, v);
    invalidate();
  }

  // PARTY (sim/partytech.js): the technique internals a seat instance's
  // class-aware listener drives — the shared primitives act for P().
  const tech = {
    liveTechs,
    flatStagePower,
    isPrimary,
    isSuppressed: () => suppress > 0,
    withSuppress(fn) {
      suppress += 1;
      try {
        return fn();
      } finally {
        suppress -= 1;
      }
    },
    setLastHit: (ev) => {
      lastHit = ev;
    },
    lastHit: () => lastHit,
    armEcho(skillId, cast, dueTick) {
      echoQueue.push({ due: dueTick, skill: skillId, cast });
      events.emit(getTick(), 'echo_armed', { skill: skillId, dueTick });
    },
    runDamageChain,
    runSiphonSelfHeal,
    runDetonateDamage,
    runBulwarkDamage,
    runSplitShards,
    runPassiveSnare,
    giveStatus,
  };

  return {
    seat,
    classId,
    owns,
    tech,
    saveState,
    loadState,
    resolveDef,
    castMods,
    pulseMods,
    autoFill,
    planFill,
    // fix-M4a-r4: where a node would UPGRADE the build (replace the weakest
    // socketed node it outranks) — the draft/shop pools, the socket screen's
    // suggestion and auto-fill all read this one policy.
    upgradeFor: (nodeId) => {
      const up = upgradeFor(nodeId);
      return up ? { skill: up.skill, slot: up.slot, replaces: up.replaces, why: up.why } : null;
    },
    upgradeIn: (skillId, nodeId) => {
      const up = upgradeIn(skillId, nodeId);
      return up ? { skill: up.skill, slot: up.slot, replaces: up.replaces, why: up.why } : null;
    },
    grantNode,
    socket,
    unsocket,
    releaseSkill,
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
    socketCount: () => SOCKET_COUNT,
    siphonCardLine: () => SIPHON_CARD_LINE,
  };
}
