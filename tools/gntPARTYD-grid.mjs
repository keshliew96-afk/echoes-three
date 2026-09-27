#!/usr/bin/env node
// PARTYD — per-character builds DESIGN oracle (docs/BUILD_BRIEF.md §25,
// docs/gauntlet/PLAN.md §16). Owner: PARTYD (design). Read-only for every
// other key: the PARTY builder implements against it, the party critic
// verifies the running game against it.
//
// It holds the design's data in one place — the three class skill pools
// (Tank, Swordsman, Archer: the 4 starting-kit skills VERBATIM from
// BUILD_BRIEF §7 + 4 new), the 18 class nodes, each class's shared-node
// access list, and the verdict RULES (live / grey / inert per node × skill)
// — and derives from them:
//   * the per-class node × skill grids (markdown, for BUILD_BRIEF §25.5),
//   * the per-skill LIVE CAPACITY (Σ repetition limits of the live nodes in
//     the class pool — every skill must be able to fill all 8 sockets with
//     live nodes, gate GP.3),
//   * the pool rarity bands (the shop strata need ≥ 2 commons, ≥ 1 rare,
//     ≥ 1 legendary per class),
//   * docs/gauntlet/party-oracle.json — the machine-readable oracle.
//
// It also CROSS-CHECKS the rule encoding against the REAL Healer
// implementation (src/sim/nodes.js verdictFor over the 17 Healer skills ×
// 17 nodes): the shared rules the design extends must reproduce today's
// Healer grid exactly, or this tool exits 1.
//
// Usage:
//   node tools/gntPARTYD-grid.mjs                 write the oracle + print a summary
//   node tools/gntPARTYD-grid.mjs --md            print the §25 markdown tables
//   node tools/gntPARTYD-grid.mjs --verify-node   compare the IMPLEMENTED sim (world.cmd('partyVerdicts'),
//                                                 world.cmd('partyPools')) with the oracle — exit 1 on any mismatch
//   node tools/gntPARTYD-grid.mjs --verify-page [url]   same, in page via __echoes.cmd (GPU harness launcher)
//
// The two verify modes exist so the gate is runnable the moment PARTY lands;
// before that they report "not implemented" (exit 2), never a false pass.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);

// ------------------------------------------------------------------ data --
// Shared nodes (BUILD_BRIEF §15.1 + §23.4, unchanged): kind, rarity, limit.
const SHARED = {
  sharpen: { name: 'Sharpen', kind: 'stat', rarity: 'common', limit: 2, stat: 'power' },
  quicken: { name: 'Quicken', kind: 'stat', rarity: 'common', limit: 2, stat: 'cd' },
  multiply: { name: 'Multiply', kind: 'stat', rarity: 'rare', limit: 1, stat: 'count' },
  ascend: { name: 'Ascend', kind: 'stat', rarity: 'legendary', limit: 1, stat: 'power' },
  bounce: { name: 'Bounce', kind: 'technique', rarity: 'common', limit: 2 },
  siphon: { name: 'Siphon', kind: 'technique', rarity: 'common', limit: 1 },
  echo: { name: 'Echo', kind: 'technique', rarity: 'rare', limit: 1 },
  detonate: { name: 'Detonate', kind: 'technique', rarity: 'rare', limit: 1 },
  widen: { name: 'Widen', kind: 'stat', rarity: 'common', limit: 2, stat: 'area' },
  reach: { name: 'Reach', kind: 'stat', rarity: 'common', limit: 2, stat: 'range' },
  linger: { name: 'Linger', kind: 'stat', rarity: 'rare', limit: 1, stat: 'duration' },
  keen: { name: 'Keen', kind: 'stat', rarity: 'rare', limit: 1, stat: 'critBonus' },
  snare: { name: 'Snare', kind: 'technique', rarity: 'common', limit: 1 },
  galvanize: { name: 'Galvanize', kind: 'technique', rarity: 'common', limit: 1 },
  bulwark: { name: 'Bulwark', kind: 'technique', rarity: 'rare', limit: 1 },
  split: { name: 'Split', kind: 'technique', rarity: 'rare', limit: 1 },
  resonance: { name: 'Resonance', kind: 'technique', rarity: 'legendary', limit: 1 },
};

// Class nodes (BUILD_BRIEF §25.4). All techniques; `cls` = the only class
// whose pool holds it.
const CLASS_NODES = {
  // Tank — protects and controls
  provoke: { name: 'Provoke', cls: 'tank', kind: 'technique', rarity: 'common', limit: 1, glyph: '‼' },
  brace: { name: 'Brace', cls: 'tank', kind: 'technique', rarity: 'common', limit: 2, glyph: '▣' },
  tremor: { name: 'Tremor', cls: 'tank', kind: 'technique', rarity: 'rare', limit: 1, glyph: '∿' },
  anchor: { name: 'Anchor', cls: 'tank', kind: 'technique', rarity: 'rare', limit: 1, glyph: '⤓' },
  retaliate: { name: 'Retaliate', cls: 'tank', kind: 'technique', rarity: 'rare', limit: 1, glyph: '↺' },
  aegis: { name: 'Aegis', cls: 'tank', kind: 'technique', rarity: 'legendary', limit: 1, glyph: '⬡' },
  // Swordsman — strikes and chains close-quarter combos
  flow: { name: 'Flow', cls: 'swordsman', kind: 'technique', rarity: 'common', limit: 2, glyph: '⟳' },
  momentum: { name: 'Momentum', cls: 'swordsman', kind: 'technique', rarity: 'common', limit: 1, glyph: '⇶' },
  parry: { name: 'Parry', cls: 'swordsman', kind: 'technique', rarity: 'common', limit: 1, glyph: '⟂' },
  pursuit: { name: 'Pursuit', cls: 'swordsman', kind: 'technique', rarity: 'rare', limit: 1, glyph: '↗' },
  lethality: { name: 'Lethality', cls: 'swordsman', kind: 'technique', rarity: 'rare', limit: 1, glyph: '✕' },
  execute: { name: 'Execute', cls: 'swordsman', kind: 'technique', rarity: 'legendary', limit: 1, glyph: '⌖' },
  // Archer — kites at range
  skewer: { name: 'Skewer', cls: 'archer', kind: 'technique', rarity: 'common', limit: 2, glyph: '→' },
  concussive: { name: 'Concussive', cls: 'archer', kind: 'technique', rarity: 'common', limit: 1, glyph: '⊙' },
  steady_aim: { name: 'Steady Aim', cls: 'archer', kind: 'technique', rarity: 'rare', limit: 1, glyph: '⊡' },
  disengage: { name: 'Disengage', cls: 'archer', kind: 'technique', rarity: 'rare', limit: 1, glyph: '↶' },
  scatter: { name: 'Scatter', cls: 'archer', kind: 'technique', rarity: 'rare', limit: 1, glyph: '⁂' },
  heartseeker: { name: 'Heartseeker', cls: 'archer', kind: 'technique', rarity: 'legendary', limit: 1, glyph: '♡' },
};

const SHARED_ACCESS = {
  healer: Object.keys(SHARED), // all 17 — unchanged
  tank: ['sharpen', 'quicken', 'multiply', 'ascend', 'widen', 'reach', 'linger', 'echo', 'snare', 'galvanize', 'bulwark', 'resonance'],
  swordsman: ['sharpen', 'quicken', 'multiply', 'ascend', 'widen', 'reach', 'keen', 'siphon', 'echo', 'detonate', 'galvanize', 'resonance'],
  archer: ['sharpen', 'quicken', 'multiply', 'ascend', 'reach', 'linger', 'keen', 'bounce', 'split', 'snare', 'detonate', 'echo', 'resonance'],
};

// Class skills (BUILD_BRIEF §25.2). archetype ∈ damage | guard | passive;
// passives carry field ∈ ally | hostile. `start` = the §7 starting kit
// (numbers VERBATIM from src/sim/allies.js ALLY_KITS).
const CLASS_SKILLS = {
  tank: [
    { id: 'heavy_slam', name: 'Heavy Slam', archetype: 'damage', shape: 'melee_arc', power: 34, cd: 5, range: 1.0, area: 40, count: 3, start: true },
    { id: 'brutal_cleave', name: 'Brutal Cleave', archetype: 'damage', shape: 'melee_arc', power: 16, cd: 4, range: 0.95, area: 80, count: 6, start: true },
    { id: 'ground_crack', name: 'Ground Crack', archetype: 'damage', shape: 'ground_aoe', power: 10, cd: 8, range: 2.6, area: 0.9, durationSec: 4, start: true },
    { id: 'whirling_guard', name: 'Whirling Guard', archetype: 'damage', shape: 'nova', power: 20, cd: 9, area: 1.3, count: 5, start: true },
    { id: 'taunting_roar', name: 'Taunting Roar', archetype: 'damage', shape: 'nova', power: 6, cd: 10, area: 2.0, count: 6, status: { kind: 'taunt', mag: 1, ticks: 150 } },
    { id: 'shield_wall', name: 'Shield Wall', archetype: 'guard', shape: 'direct', power: 24, cd: 10, range: 3.0, count: 2, status: { kind: 'shield', mag: 24, ticks: 240 } },
    { id: 'shoulder_charge', name: 'Shoulder Charge', archetype: 'damage', shape: 'melee_arc', power: 22, cd: 7, range: 0.9, area: 60, count: 3, dash: { dist: 2.4, speed: 9 }, status: { kind: 'stun', mag: 1, ticks: 36 } },
    { id: 'iron_stance', name: 'Iron Stance', archetype: 'passive', field: 'ally', output: 'shield', shape: 'aura', power: 3, area: 1.3, cadenceSec: 1.0, shieldCap: 12 },
  ],
  swordsman: [
    { id: 'flurry', name: 'Flurry', archetype: 'damage', shape: 'melee_arc', power: 11, cd: 3, range: 0.8, area: 60, count: 6, start: true },
    { id: 'lunge_strike', name: 'Lunge Strike', archetype: 'damage', shape: 'melee_arc', power: 26, cd: 4, range: 1.3, area: 30, count: 2, start: true },
    { id: 'blade_storm', name: 'Blade Storm', archetype: 'damage', shape: 'nova', power: 14, cd: 7, area: 1.0, count: 5, start: true },
    { id: 'caltrops', name: 'Caltrops', archetype: 'damage', shape: 'ground_aoe', power: 8, cd: 6.5, range: 2.0, area: 0.7, durationSec: 5, start: true },
    { id: 'fox_step', name: 'Fox Step', archetype: 'damage', shape: 'melee_arc', power: 18, cd: 5, range: 0.8, area: 50, count: 3, dash: { dist: 2.0, speed: 10, iframes: true } },
    { id: 'crescent_finisher', name: 'Crescent Finisher', archetype: 'damage', shape: 'melee_arc', power: 20, cd: 6, range: 1.0, area: 70, count: 5, combo: { perStack: 0.5, maxStacks: 2, windowTicks: 120 } },
    { id: 'riposte', name: 'Riposte', archetype: 'damage', shape: 'melee_arc', power: 30, cd: 8, range: 0.9, area: 90, count: 3, parry: { windowTicks: 36 } },
    { id: 'razor_wake', name: 'Razor Wake', archetype: 'passive', field: 'hostile', output: 'damage', shape: 'aura', power: 4, area: 0.9, count: 3, cadenceSec: 1.0, knockback: 0 },
  ],
  archer: [
    { id: 'piercing_shot', name: 'Piercing Shot', archetype: 'damage', shape: 'projectile', power: 30, cd: 3, range: 5.5, speed: 6.2, count: 1, area: 0, start: true },
    { id: 'volley', name: 'Volley', archetype: 'damage', shape: 'projectile', power: 14, cd: 4.5, range: 4.8, speed: 5.4, count: 3, area: 0, start: true },
    { id: 'detonating_charge', name: 'Detonating Charge', archetype: 'damage', shape: 'ground_aoe', power: 12, cd: 7, range: 4.2, area: 0.85, durationSec: 3, start: true },
    { id: 'sundering_nova', name: 'Sundering Nova', archetype: 'damage', shape: 'nova', power: 16, cd: 8, area: 1.1, count: 4, start: true },
    { id: 'vault_shot', name: 'Vault Shot', archetype: 'damage', shape: 'projectile', power: 18, cd: 6, range: 4.5, speed: 6.0, count: 1, area: 0, vault: { dist: 1.6, ticks: 10, iframes: true }, status: { kind: 'slow', mag: 0.3, ticks: 90 } },
    { id: 'pinning_arrow', name: 'Pinning Arrow', archetype: 'damage', shape: 'projectile', power: 20, cd: 7, range: 5.0, speed: 6.0, count: 1, area: 0, status: { kind: 'stun', mag: 1, ticks: 45 } },
    { id: 'rain_of_arrows', name: 'Rain of Arrows', archetype: 'damage', shape: 'ground_aoe', power: 7, cd: 11, range: 5.0, area: 1.4, durationSec: 4, status: { kind: 'slow', mag: 0.25, ticks: 72 } },
    { id: 'kestrel_watch', name: 'Kestrel Watch', archetype: 'passive', field: 'hostile', output: 'damage', shape: 'aura', power: 6, area: 4.0, count: 1, cadenceSec: 1.0 },
  ],
};

// ------------------------------------------------------------- the rules --
const isPassive = (s) => s.archetype === 'passive';
const isActive = (s) => !isPassive(s);
const retargetable = (s) => s.shape === 'projectile' || s.shape === 'direct';
const areaShape = (s) => s.shape === 'melee_arc' || s.shape === 'nova' || s.shape === 'ground_aoe';
// Instances that roll a crit: damage and heal (and the Healer's heal passives).
// Shields never crit (guard actives, the shield passive Iron Stance).
const rollsCrit = (s) => s.archetype === 'damage' || s.archetype === 'heal' || (isPassive(s) && s.output !== 'shield');

function hasStat(s, stat) {
  if (stat === 'critBonus') return rollsCrit(s);
  if (stat === 'area') return s.area !== undefined && s.area > 0;
  if (stat === 'duration')
    return s.durationSec !== undefined || (!!s.status && !isPassive(s)) || (!!s.parry && !isPassive(s));
  return s[stat] !== undefined;
}

// Multiply saturation (§15.5): heal / guard deliveries whose recipients are
// the party (direct / nova / melee_arc) — the party has 4 members.
const PARTY = 4;
function multiplyInert(s) {
  if (!(s.archetype === 'heal' || s.archetype === 'guard')) return false;
  if (!(s.shape === 'direct' || s.shape === 'nova' || s.shape === 'melee_arc')) return false;
  return (s.count ?? 1) >= PARTY;
}

// verdict(skill, nodeId) -> { state: 'live'|'grey'|'inert', reason, effect }
function verdict(s, id) {
  const n = SHARED[id] || CLASS_NODES[id];
  const G = (reason) => ({ state: 'grey', reason });
  const L = (effect) => ({ state: 'live', effect });
  const I = (reason) => ({ state: 'inert', reason });
  if (n.kind === 'stat') {
    if (!hasStat(s, n.stat)) {
      const why = {
        cd: 'no cooldown stat on this skill',
        count: 'no count stat on this skill',
        area: 'single-target shape — no area to widen',
        range: 'no range stat on this skill',
        duration: 'nothing on this skill lasts — no duration to extend',
        critBonus: 'shields never crit',
        power: 'no power stat',
      }[n.stat];
      return G(why);
    }
    if (id === 'widen' && s.shape === 'melee_arc' && s.area >= 90) return I('+0 — already a full 90° half-angle (the §23.4 clamp)');
    if (id === 'multiply') {
      if (multiplyInert(s)) return I('+0 — the whole party is already reached');
      return L(`count ${s.count ?? 1}→${(s.count ?? 1) + 1}`);
    }
    const eff = {
      sharpen: () => `power +25% (${s.power}→${+(s.power * 1.25).toFixed(2)})`,
      ascend: () => `power ×2 (${s.power}→${s.power * 2})`,
      quicken: () => `cooldown −15% (${s.cd}→${+(s.cd * 0.85).toFixed(3)} s)`,
      widen: () => (s.shape === 'melee_arc' ? `half-angle +25% (${s.area}°→${Math.min(90, +(s.area * 1.25).toFixed(2))}°)` : `radius +25% (${s.area}→${+(s.area * 1.25).toFixed(3)} u)`),
      reach: () => `range +25% (${s.range}→${+(s.range * 1.25).toFixed(3)} u)`,
      linger: () =>
        s.durationSec !== undefined
          ? `zone ${s.durationSec}→${Math.round(s.durationSec * 1.5)} zone ticks`
          : s.parry
            ? `parry window ${s.parry.windowTicks}→${Math.round(s.parry.windowTicks * 1.5)} ticks`
            : s.status.kind === 'stun'
              ? `stun ${s.status.ticks}→${Math.min(60, Math.round(s.status.ticks * 1.5))} ticks (the §23.8 60-tick stun cap)`
              : s.status.kind === 'taunt'
                ? `taunt ${s.status.ticks}→${Math.min(240, Math.round(s.status.ticks * 1.5))} ticks (taunt cap 240; the Stag stays ≤ 60)`
                : `${s.status.kind} ${s.status.ticks}→${Math.round(s.status.ticks * 1.5)} ticks`,
      keen: () => 'crit chance +0.15',
    }[id];
    return L(eff());
  }
  // ---- shared techniques
  switch (id) {
    case 'bounce':
      if (isPassive(s)) return G('a passive field — nothing here for this technique to act on');
      if (!retargetable(s)) return G('needs a retargetable impact (projectile or direct)');
      return L(s.archetype === 'guard' ? 'the shield hops to the next-lowest-HP other ally within 2.2 u' : s.archetype === 'heal' ? 'heal chains to the next-lowest-HP other ally within 2.2 u' : 'impact ricochets to the nearest other enemy within 2.2 u');
    case 'siphon':
      if (s.archetype === 'guard') return G('a shield drains nothing');
      if (isPassive(s)) return s.field === 'hostile' ? L('each pulse that hits heals the caster 25% of flat-stage pulse power') : G('a passive field — nothing here for this technique to act on');
      return L(s.archetype === 'heal' ? 'damages the nearest enemy of the healed ally (25% flat-stage)' : 'caster self-heals 25% of flat-stage power per instance');
    case 'echo':
      if (isPassive(s)) return L('Reapply: one bonus pulse every 3.0 s');
      return L(s.archetype === 'heal' ? 'recast 1.0 s later at 100%' : 'recast 1.0 s later at 50%');
    case 'detonate':
      if (isPassive(s)) return s.field === 'hostile' ? L('kills by a pulse explode: 50% power, r 1.2') : G('a passive field — nothing here for this technique to act on');
      if (s.archetype === 'guard') return L('a shield from this skill that breaks bursts for 50% power, r 1.2');
      return L(s.archetype === 'heal' ? 'full_heal bursts heal 50% within 1.2 u' : 'kills by this skill explode: 50% power, r 1.2');
    case 'snare':
      if (isPassive(s)) return L('hostiles inside slowed 25% (pulse-refreshed)');
      if (s.archetype === 'damage') return L('hit enemies slowed 40% for 90 ticks');
      return L(s.archetype === 'guard' ? 'shielded allies haste 20% for 90 ticks' : 'healed allies haste 20% for 90 ticks');
    case 'galvanize':
      if (isPassive(s)) return L(s.field === 'hostile' ? 'hostiles hit exposed +10% (pulse-refreshed)' : 'allies inside inspired +10% (pulse-refreshed)');
      if (s.archetype === 'damage') return L('hit enemies exposed +20% for 180 ticks');
      return L(s.archetype === 'guard' ? 'shielded allies inspired +15% for 180 ticks' : 'healed allies inspired +15% for 180 ticks');
    case 'bulwark':
      if (isPassive(s)) return L(s.field === 'hostile' ? 'caster shield 20% of pulse damage (cap 10)' : 'each pulse +2 shield to allies inside (cap 10)');
      if (s.archetype === 'damage') return L('caster shield 20% of final damage (cap 30)');
      return L(s.archetype === 'guard' ? 'the caster also gains 50% of each shield it grants' : 'overheal becomes a shield up to 50% of power');
    case 'split':
      if (isPassive(s) || !retargetable(s)) return G(isPassive(s) ? 'a passive field — nothing here for this technique to act on' : 'needs a retargetable impact (projectile or direct)');
      return L(s.archetype === 'damage' ? '2 shards at ±35°, 40% power, 2.0 u' : 'the 2 nearest other allies within 2.5 u get 40%');
    case 'resonance':
      return L(isPassive(s) ? 'every 3rd pulse ×2' : 'every 3rd cast ×2');
    default:
  }
  // ---- class techniques
  const dmg = s.archetype === 'damage';
  switch (id) {
    case 'provoke':
      if (isPassive(s)) return s.field === 'ally' ? L('each pulse taunts the 2 nearest hostiles inside for 72 ticks') : G('a hostile field of another class');
      if (s.archetype === 'guard') return L('hostiles within 1.5 u of each recipient taunted onto the Tank for 60 ticks');
      if (s.status && s.status.kind === 'taunt' && s.status.ticks >= 90) return I('+0 — this skill already taunts longer (150 ticks)');
      return L('hit enemies taunted onto the Tank for 90 ticks (Stag 45)');
    case 'brace':
      if (isPassive(s)) return L('each pulse +2 shield per copy to the Tank (cap 12)');
      return L('each cast shields the Tank +8 per copy (240 ticks)');
    case 'tremor':
      if (!dmg || !areaShape(s)) return G(isPassive(s) ? 'a passive field — nothing here for this technique to act on' : 'no hostile delivery to stagger with');
      if (s.status && s.status.kind === 'stun' && s.status.ticks >= 18) return I('+0 — this skill already stuns longer (36 ticks)');
      return L(s.shape === 'ground_aoe' ? 'the first zone tick on each enemy stuns 18 ticks' : 'hit enemies stunned 18 ticks (non-boss)');
    case 'anchor':
      if (!dmg || !areaShape(s)) return G(isPassive(s) ? 'a passive field — nothing here for this technique to act on' : 'no hostile area delivery to pull with');
      return L(s.shape === 'ground_aoe' ? 'enemies hit pulled 0.5 u toward the zone centre' : 'enemies hit pulled 0.5 u toward the Tank (not knocked back)');
    case 'retaliate':
      if (isPassive(s)) return G('a passive field — nothing here for this technique to act on');
      return L('for 120 ticks after the cast, hostiles that hit the Tank take 25% flat-stage power');
    case 'aegis':
      if (isPassive(s)) return L('allies inside ward 10% (pulse-refreshed)');
      return L(s.archetype === 'guard' ? 'ward 20% on the Tank while on cooldown; recipients ward 20% for the shield\'s life' : 'ward 20% on the Tank while this skill is on cooldown');
    case 'flow':
      if (isPassive(s)) return L('each pulse that hits: other skills −0.1 s per copy');
      return L(s.shape === 'ground_aoe' ? 'first connecting zone tick: other skills −0.3 s per copy' : 'a connecting cast: other skills −0.3 s per copy');
    case 'momentum':
      if (isPassive(s)) return L('pulses +12% per skill cast in the last 120 ticks (max +36%)');
      return L('+12% power per other Swordsman skill cast in the last 120 ticks (max +36%)');
    case 'parry':
      if (isPassive(s)) return G('a passive field — nothing here for this technique to act on');
      if (s.parry) return L(`parry window +24 ticks (${s.parry.windowTicks}→${s.parry.windowTicks + 24})`);
      return L('after the cast, a 24-tick parry: the next hit is blocked, the attacker takes 50% power');
    case 'pursuit':
      if (isPassive(s)) return G('a passive field — nothing here for this technique to act on');
      if (s.parry) return G('the counter answers an attacker already in reach');
      if (s.dash) return L(`dash +1.0 u (${s.dash.dist}→${s.dash.dist + 1} u)`);
      if (s.shape === 'melee_arc' || s.shape === 'nova') return L('dash up to 1.2 u toward the target before resolving');
      return G('the delivery is placed at range — nothing to close');
    case 'lethality':
      return L('crits deal ×2.2 (not ×1.5)');
    case 'execute':
      return L('×2 on hostiles at or below 35% HP');
    case 'skewer':
      if (s.shape !== 'projectile') return G('only a bolt can pierce');
      return L('pierces +1 enemy per copy (full power)');
    case 'concussive':
      return L('knockback ×2 on non-boss hits');
    case 'steady_aim':
      return L(isPassive(s) ? 'pulses +40% while standing still 30 ticks' : '+40% power if the Archer stood still for 30 ticks');
    case 'disengage':
      if (isPassive(s)) return G('a passive field — nothing here for this technique to act on');
      if (s.vault) return L(`vault +0.8 u (${s.vault.dist}→${+(s.vault.dist + 0.8).toFixed(1)} u)`);
      return L('after the cast, hop 1.0 u away from the nearest hostile (8 i-frames)');
    case 'scatter':
      if (s.shape === 'ground_aoe') return L('3 zones of 60% radius and power in a triangle');
      if (s.shape === 'projectile') return L('a bolt spent at max range bursts into 3 shards (40%)');
      return G(isPassive(s) ? 'a passive field — nothing here for this technique to act on' : 'a self burst has nothing to scatter');
    case 'heartseeker':
      return L(isPassive(s) ? 'every pulse instance is a guaranteed crit' : 'the first instance per target per cast is a guaranteed crit');
    default:
      throw new Error('no rule for ' + id);
  }
}

// ------------------------------------------------------------- derived --
const poolOf = (cls) => [...SHARED_ACCESS[cls], ...Object.keys(CLASS_NODES).filter((k) => CLASS_NODES[k].cls === cls)];
const nodeOf = (id) => SHARED[id] || CLASS_NODES[id];
const CLASSES = ['tank', 'swordsman', 'archer'];
const SOCKETS = 8;

const out = { schema: 'echoes-party-oracle/1', generatedBy: 'tools/gntPARTYD-grid.mjs', classes: {}, problems: [] };
for (const cls of CLASSES) {
  const pool = poolOf(cls);
  const bands = { common: [], rare: [], legendary: [] };
  for (const id of pool) bands[nodeOf(id).rarity].push(id);
  if (bands.common.length < 2 || bands.rare.length < 1 || bands.legendary.length < 1) out.problems.push(`${cls}: shop strata unfillable`);
  const classNodes = pool.filter((id) => CLASS_NODES[id]);
  if (classNodes.length < 6) out.problems.push(`${cls}: fewer than 6 class nodes`);
  const skills = CLASS_SKILLS[cls];
  if (skills.length < 8) out.problems.push(`${cls}: fewer than 8 skills`);
  const grid = {};
  const capacity = {};
  for (const s of skills) {
    grid[s.id] = {};
    let cap = 0;
    for (const id of pool) {
      const v = verdict(s, id);
      grid[s.id][id] = v;
      if (v.state === 'live') cap += nodeOf(id).limit;
    }
    capacity[s.id] = cap;
    if (cap < SOCKETS) out.problems.push(`${cls}.${s.id}: live capacity ${cap} < ${SOCKETS}`);
  }
  // every class node must be live on ≥ 3 class skills (a class node nobody can use is a dead card)
  for (const id of classNodes) {
    const live = skills.filter((s) => grid[s.id][id].state === 'live').length;
    if (live < 3) out.problems.push(`${cls}: class node ${id} live on only ${live} skills`);
  }
  out.classes[cls] = {
    skills: skills.map((s) => ({ ...s })),
    starting: skills.filter((s) => s.start).map((s) => s.id),
    pool,
    classNodes: classNodes.map((id) => ({ id, ...CLASS_NODES[id] })),
    shared: SHARED_ACCESS[cls],
    bands,
    grid,
    capacity,
    cells: skills.length * pool.length,
  };
}

// ------------------------------------------- Healer cross-check (real sim) --
async function healerCrossCheck() {
  const u = (p) => pathToFileURL(join(here, p)).href;
  const { SKILLS } = await import(u('src/sim/skills.js'));
  const { NODES, createBuildSystem } = await import(u('src/sim/nodes.js'));
  const party = [0, 1, 2, 3].map((i) => ({ id: i + 1, partyIndex: i, hp: 50, maxHp: 100, x: 0, z: 0 }));
  const sys = createBuildSystem({
    player: party[0],
    registry: { all: () => party, byId: (id) => party.find((p) => p.id === id) || null },
    events: { on() {}, emit() {} },
    combat: {},
    getTick: () => 0,
    isIframed: () => false,
    queueDeferred() {},
    queueContinuation() {},
    getSkillSlots: () => [],
  });
  const mismatches = [];
  let cells = 0;
  for (const sid of Object.keys(SKILLS)) {
    if (SKILLS[sid].cls && SKILLS[sid].cls !== 'healer') continue; // after PARTY lands, class rows are checked by --verify
    const def = SKILLS[sid];
    const s = { ...def };
    for (const nid of Object.keys(SHARED)) {
      if (!NODES[nid]) continue;
      cells += 1;
      const real = sys.verdictFor(sid, nid).state;
      const mine = verdict(s, nid).state;
      if (real !== mine) mismatches.push(`${sid} × ${nid}: sim ${real}, rules ${mine}`);
    }
  }
  return { cells, mismatches };
}

// --------------------------------------------------------------- markdown --
const code = (v) => (v.state === 'live' ? 'live' : v.state === 'grey' ? 'GREY' : 'inert');
function md() {
  const lines = [];
  for (const cls of CLASSES) {
    const c = out.classes[cls];
    lines.push(`#### ${cls[0].toUpperCase() + cls.slice(1)} — node × skill grid (${c.skills.length} skills × ${c.pool.length} nodes = ${c.cells} cells)`);
    lines.push('');
    const head = ['Skill', ...c.pool.map((id) => nodeOf(id).name), 'live cap'];
    lines.push('| ' + head.join(' | ') + ' |');
    lines.push('|' + head.map(() => '---').join('|') + '|');
    for (const s of c.skills) {
      const row = [s.name + (s.start ? ' ·s' : '')];
      for (const id of c.pool) row.push(code(c.grid[s.id][id]));
      row.push(String(c.capacity[s.id]));
      lines.push('| ' + row.join(' | ') + ' |');
    }
    lines.push('');
    const notes = [];
    for (const s of c.skills)
      for (const id of c.pool) {
        const v = c.grid[s.id][id];
        if (v.state !== 'live') notes.push(`${s.name} × ${nodeOf(id).name} ${code(v)}: ${v.reason}`);
      }
    lines.push('Grey / inert reasons: ' + notes.join(' · ') + '.');
    lines.push('');
  }
  return lines.join('\n');
}

// --------------------------------------------------------------- verify --
function compareImpl(pools, verdicts) {
  const bad = [];
  let n = 0;
  for (const cls of CLASSES) {
    const want = out.classes[cls];
    const gotPool = pools && pools[cls] ? [...pools[cls].nodes].sort() : null;
    if (!gotPool || JSON.stringify(gotPool) !== JSON.stringify([...want.pool].sort())) bad.push(`${cls}: node pool differs (${gotPool})`);
    const gotSkills = pools && pools[cls] ? [...pools[cls].skills].sort() : null;
    if (!gotSkills || JSON.stringify(gotSkills) !== JSON.stringify(want.skills.map((s) => s.id).sort())) bad.push(`${cls}: skill pool differs (${gotSkills})`);
    for (const s of want.skills)
      for (const id of want.pool) {
        n += 1;
        const got = verdicts && verdicts[cls] && verdicts[cls][s.id] ? verdicts[cls][s.id][id] : undefined;
        if (got !== want.grid[s.id][id].state) bad.push(`${cls}.${s.id} × ${id}: game ${got}, design ${want.grid[s.id][id].state}`);
      }
  }
  return { cells: n, mismatches: bad };
}

async function verifyNode() {
  const u = (p) => pathToFileURL(join(here, p)).href;
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const clock = createClock();
  const world = createWorld({ rng: createGameplayRng(7), registry: createRegistry(), events: createEventBus(), harness: false, requestHitstop: clock.requestHitstop, room: null });
  const pools = world.cmd('partyPools');
  const verdicts = world.cmd('partyVerdicts');
  if (pools === undefined || verdicts === undefined) return { notImplemented: true };
  return compareImpl(pools, verdicts);
}

async function verifyPage(url) {
  const { launchEchoes, openEchoes, waitReady } = await import(pathToFileURL(join(here, 'tools/gnt-arch-browser.mjs')).href);
  const browser = await launchEchoes({ gpu: true });
  try {
    const { page } = await openEchoes(browser, url);
    await waitReady(page);
    const r = await page.evaluate(() => ({ pools: window.__echoes.cmd('partyPools'), verdicts: window.__echoes.cmd('partyVerdicts') }));
    if (r.pools === undefined || r.pools === null || r.verdicts === undefined || r.verdicts === null) return { notImplemented: true };
    return compareImpl(r.pools, r.verdicts);
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------ main --
const cross = await healerCrossCheck();
if (cross.mismatches.length) out.problems.push(...cross.mismatches.map((m) => 'healer cross-check: ' + m));
out.healerCrossCheck = { cells: cross.cells, mismatches: cross.mismatches.length };

if (has('--verify-node') || has('--verify-page')) {
  const r = has('--verify-node') ? await verifyNode() : await verifyPage(args[args.indexOf('--verify-page') + 1] || 'http://127.0.0.1:5199/?menu=0&seed=7');
  if (r.notImplemented) {
    console.log(JSON.stringify({ verify: 'not implemented yet (cmd partyPools / partyVerdicts missing)' }));
    process.exit(2);
  }
  console.log(JSON.stringify({ verify: r.mismatches.length ? 'FAIL' : 'PASS', cells: r.cells, mismatches: r.mismatches.slice(0, 40), total: r.mismatches.length }));
  process.exit(r.mismatches.length ? 1 : 0);
}

if (has('--md')) {
  console.log(md());
} else {
  writeFileSync(join(here, 'docs/gauntlet/party-oracle.json'), JSON.stringify(out, null, 1));
  const summary = {};
  for (const cls of CLASSES) {
    const c = out.classes[cls];
    summary[cls] = {
      skills: c.skills.length,
      pool: c.pool.length,
      classNodes: c.classNodes.length,
      cells: c.cells,
      bands: Object.fromEntries(Object.entries(c.bands).map(([k, v]) => [k, v.length])),
      minCapacity: Math.min(...Object.values(c.capacity)),
      grey: Object.values(c.grid).reduce((a, r) => a + Object.values(r).filter((v) => v.state === 'grey').length, 0),
      inert: Object.values(c.grid).reduce((a, r) => a + Object.values(r).filter((v) => v.state === 'inert').length, 0),
    };
  }
  console.log(JSON.stringify({ summary, healerCrossCheck: out.healerCrossCheck, problems: out.problems }, null, 1));
}
process.exit(out.problems.length ? 1 : 0);
