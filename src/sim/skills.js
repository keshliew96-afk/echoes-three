// Healer skill kit (§7 + §23.3) + slot/cooldown machinery (§6, §23.9) + heal
// targeting (§8).
//
// Every number in SKILLS and PARTY_ALLIES is VERBATIM from BUILD_BRIEF §7
// (the healer skill table and the class stat table) and §23.3 (the nine
// Gauntlet skills) — no invented stats. power is per-instance (nova / zone /
// aura / bond rows are per-target / per-tick / each, exactly as the tables
// annotate them).
//
// §6 binding rules owned here:
//   - SKILL_SLOTS (4 — at most 4 equipped skills; M4c user correction, the
//     content extension's 8 are node sockets per skill) slots, cooldown-gated,
//     no mana, INSTANT cast
//     (press → fire → cooldown starts). No cast bars; firing never touches
//     movement. No global cooldown; no input buffering. Cooldown floor
//     max(0.5 s, cd).
//   - Cooldowns tick in sim time (integer readyTick), persist across rooms and
//     scene/state reloads (serialize/restore below carry REMAINING ticks for
//     the run block's persistence ledger), never reset by any path.
//   - Passives (Warding Aura, Quiet Hearth) occupy a slot when drafted but
//     have no activation — a press on their slot is denied with the closed-
//     vocabulary reason `empty_slot` (nothing activatable in that slot; §4's
//     denial list has no passive-specific code) and their HUD slot renders a
//     static glyph. Every owned passive pulses on its own 1.0 s cadence, in
//     ascending slot order.
//   - Same-tick multi-skill presses all fire (world resolves ascending slot).
//   - During a dash the WORLD denies skill fires `priority_suppressed` before
//     this module is consulted (§5 contract, preserved).
//
// §23.3 additions: damage novas (Bell Toll) and damage zones (Rootsnare) hit
// hostiles plus breakable world objects (shapes.selectAreaDamage); a skill
// row may carry `status: { kind, mag, ticks }` that its delivery applies to
// every body it reaches (stun / slow on enemies, shield / haste / ward on the
// party — sim/status.js owns the immunity rules); `pierce` is the number of
// bodies a bolt resolves on before it is spent (Pale Lance).
//
// §8 heal-override state (F1–F4 / portrait click) is caster-local and lives
// here: durable toggle, press = set / same = clear / other = replace; an
// invalid override (downed / out of range) falls back to smart-target WITHOUT
// clearing and resumes when valid again.
//
// Sim discipline: no DOM, no render imports, no wall clock, gameplay RNG only
// via the combat pipeline's own crit rolls.
import { TICK_HZ, SKILL_SLOTS } from '../core/constants.js';
import { DENIAL } from '../core/intents.js';
import {
  fanDirections,
  selectDirect,
  selectNova,
  selectArc,
  selectAreaDamage,
  isAreaDamageable,
  clampPlacement,
  createSkillBolts,
} from './shapes.js';

const r2 = (v) => Math.round(v * 100) / 100;
const secTicks = (s) => Math.round(s * TICK_HZ);
const CD_FLOOR_TICKS = secTicks(0.5); // §6: cd_final = max(0.5 s, cd)
const ZONE_CADENCE_TICKS = secTicks(1.0); // §6: zone tick cadence 1.0 s, first at 1.0 s
const AURA_CADENCE_TICKS = secTicks(1.0); // §7 / §23.3: passive auras pulse every 1.0 s
const BOLT_RADIUS = 0.05; // same swept-vs-wall scaffold radius as the basic bolt

// §7 Healer skills — 2 starting + 6 draftable, table rows verbatim; §23.3
// adds nine more (the draftable pool grows 6 → 15).
// shape ∈ the closed §6 set; power/cd/range/area/count as authored.
export const SKILLS = Object.freeze({
  mending_bolt: Object.freeze({
    id: 'mending_bolt', name: 'Mending Bolt', abbrev: 'MB',
    archetype: 'heal', shape: 'projectile',
    power: 22, cd: 3.5, range: 5.0, area: 0, count: 1, speed: 5.2,
    // heal bolt; hits first ally in path (passes enemies)
  }),
  swift_mend: Object.freeze({
    id: 'swift_mend', name: 'Swift Mend', abbrev: 'SM',
    archetype: 'heal', shape: 'direct',
    power: 14, cd: 2.5, range: 3.2, count: 1, // smart-target instant heal
  }),
  nova_bloom: Object.freeze({
    id: 'nova_bloom', name: 'Nova Bloom', abbrev: 'NB',
    archetype: 'heal', shape: 'nova',
    power: 16, cd: 7, area: 1.4, count: 3, // 16/target
  }),
  sanctuary: Object.freeze({
    id: 'sanctuary', name: 'Sanctuary', abbrev: 'SA',
    archetype: 'heal', shape: 'ground_aoe',
    power: 6, cd: 9, range: 3.8, area: 1.0, durationSec: 4, // 6/tick, 4 s (4 ticks)
  }),
  spirit_bolt: Object.freeze({
    id: 'spirit_bolt', name: 'Spirit Bolt', abbrev: 'SB',
    archetype: 'damage', shape: 'projectile',
    power: 18, cd: 4, range: 4.8, area: 0, count: 1, speed: 5.0,
  }),
  warding_aura: Object.freeze({
    id: 'warding_aura', name: 'Warding Aura', abbrev: 'WA',
    archetype: 'passive', shape: 'aura',
    power: 3, area: 0.9, cadenceSec: 1.0, // 3/tick, always-on field, heals allies inside
  }),
  guardian_bond: Object.freeze({
    id: 'guardian_bond', name: 'Guardian Bond', abbrev: 'GB',
    archetype: 'heal', shape: 'direct',
    power: 12, cd: 6, range: 3.4, count: 2, // 12 each, bottom-2 HP allies
  }),
  restorative_wave: Object.freeze({
    id: 'restorative_wave', name: 'Restorative Wave', abbrev: 'RW',
    archetype: 'heal', shape: 'melee_arc',
    power: 15, cd: 5, range: 1.1, area: 55, count: 4, // reach 1.1, half-angle 55°
  }),

  // ---------------------------------------------- §23.3 Gauntlet skills --
  lantern_flurry: Object.freeze({
    id: 'lantern_flurry', name: 'Lantern Flurry', abbrev: 'LF',
    archetype: 'damage', shape: 'projectile',
    power: 9, cd: 5.0, range: 4.6, area: 0, count: 3, speed: 5.6, // 9 per bolt, 3 bolts (12° fan)
  }),
  pale_lance: Object.freeze({
    id: 'pale_lance', name: 'Pale Lance', abbrev: 'PL',
    archetype: 'damage', shape: 'projectile',
    power: 30, cd: 6.0, range: 6.0, area: 0, count: 1, speed: 6.5,
    pierce: 3, // resolves on up to 3 different enemies along its line, full power each
  }),
  bell_toll: Object.freeze({
    id: 'bell_toll', name: 'Bell Toll', abbrev: 'BT',
    archetype: 'damage', shape: 'nova',
    power: 20, cd: 8.0, area: 1.6, count: 5, // 20 per target
    status: Object.freeze({ kind: 'stun', mag: 1, ticks: 30 }), // non-boss
  }),
  rootsnare: Object.freeze({
    id: 'rootsnare', name: 'Rootsnare', abbrev: 'RS',
    archetype: 'damage', shape: 'ground_aoe',
    power: 6, cd: 10.0, range: 4.2, area: 1.3, durationSec: 5, // 6 per zone tick, 5 ticks
    status: Object.freeze({ kind: 'slow', mag: 0.45, ticks: 72 }), // refreshed each zone tick
  }),
  dewfall: Object.freeze({
    id: 'dewfall', name: 'Dewfall', abbrev: 'DF',
    archetype: 'heal', shape: 'ground_aoe',
    power: 7, cd: 11.0, range: 4.0, area: 1.5, durationSec: 5, // 7 per zone tick, 5 s
  }),
  kindred_shield: Object.freeze({
    id: 'kindred_shield', name: 'Kindred Shield', abbrev: 'KS',
    archetype: 'heal', shape: 'direct',
    power: 16, cd: 8.0, range: 3.6, count: 1,
    status: Object.freeze({ kind: 'shield', mag: 20, ticks: 240 }), // + shield 20 for 240 ticks
  }),
  mending_tide: Object.freeze({
    id: 'mending_tide', name: 'Mending Tide', abbrev: 'MT',
    archetype: 'heal', shape: 'melee_arc',
    power: 12, cd: 4.0, range: 1.8, area: 70, count: 4, // wide sweep: reach 1.8, half-angle 70°
  }),
  hearthsong: Object.freeze({
    id: 'hearthsong', name: 'Hearthsong', abbrev: 'HS',
    archetype: 'heal', shape: 'nova',
    power: 10, cd: 9.0, area: 2.0, count: 4, // 10 per target
    status: Object.freeze({ kind: 'haste', mag: 0.25, ticks: 120 }), // + haste 25% for 120 ticks
  }),
  quiet_hearth: Object.freeze({
    id: 'quiet_hearth', name: 'Quiet Hearth', abbrev: 'QH',
    archetype: 'passive', shape: 'aura',
    power: 2, area: 1.2, cadenceSec: 1.0, // 2 per pulse, 1.0 s cadence
    status: Object.freeze({ kind: 'ward', mag: 0.15, ticks: 72 }), // allies inside: ward 15%, pulse-refreshed
  }),
  // MORE CLASS SKILLS (docs/CLASS_SKILLS.md): the Healer's two new rows.
  lantern_ward: Object.freeze({
    id: 'lantern_ward', name: 'Lantern Ward', abbrev: 'LW',
    archetype: 'heal', shape: 'direct',
    power: 10, cd: 10.0, range: 3.8, count: 4, // the whole party in reach
    status: Object.freeze({ kind: 'ward', mag: 0.2, ticks: 180 }), // + ward 20% for 3 s
  }),
  dawn_brand: Object.freeze({
    id: 'dawn_brand', name: 'Dawn Brand', abbrev: 'DB',
    archetype: 'damage', shape: 'ground_aoe',
    power: 6, cd: 9.0, range: 4.5, area: 1.2, durationSec: 4, // 6 per zone tick, 4 s
    status: Object.freeze({ kind: 'exposed', mag: 0.2, ticks: 72 }), // enemies inside take 20% more, refreshed each tick
  }),

  // ------------------------------------ PARTY class skills (BUILD_BRIEF §25.2) --
  // `cls` = the only class that may hold the row (Healer rows carry none).
  // The 12 starting rows (`·s`) equal v0.5.150 allies.js ALLY_KITS field for
  // field (ALLY_KITS is now derived from these rows); the 12 new rows are the
  // §25.2 numbers VERBATIM. Plain-data modifiers: dash / vault / combo / parry
  // (§25.2 "the new mechanics"), `field` + `output` on passives, `shieldCap`.
  // Tank (badger) — protects and controls.
  heavy_slam: Object.freeze({ id: 'heavy_slam', name: 'Heavy Slam', abbrev: 'HS', cls: 'tank', archetype: 'damage', shape: 'melee_arc', power: 34, cd: 5, range: 1.0, area: 40, count: 3 }),
  brutal_cleave: Object.freeze({ id: 'brutal_cleave', name: 'Brutal Cleave', abbrev: 'BC', cls: 'tank', archetype: 'damage', shape: 'melee_arc', power: 16, cd: 4, range: 0.95, area: 80, count: 6 }),
  ground_crack: Object.freeze({ id: 'ground_crack', name: 'Ground Crack', abbrev: 'GC', cls: 'tank', archetype: 'damage', shape: 'ground_aoe', power: 10, cd: 8, range: 2.6, area: 0.9, durationSec: 4 }),
  whirling_guard: Object.freeze({ id: 'whirling_guard', name: 'Whirling Guard', abbrev: 'WG', cls: 'tank', archetype: 'damage', shape: 'nova', power: 20, cd: 9, area: 1.3, count: 5 }),
  taunting_roar: Object.freeze({
    id: 'taunting_roar', name: 'Taunting Roar', abbrev: 'TR', cls: 'tank', archetype: 'damage', shape: 'nova',
    power: 6, cd: 10, area: 2.0, count: 6,
    status: Object.freeze({ kind: 'taunt', mag: 1, ticks: 150 }), // the Stag: 60, then 300 ticks immune
  }),
  shield_wall: Object.freeze({
    id: 'shield_wall', name: 'Shield Wall', abbrev: 'SW', cls: 'tank', archetype: 'guard', shape: 'direct',
    power: 24, cd: 10, range: 3.0, count: 2, // recipients = the bottom-2 HP fractions in range (Tank eligible)
    status: Object.freeze({ kind: 'shield', mag: 24, ticks: 240 }),
  }),
  shoulder_charge: Object.freeze({
    id: 'shoulder_charge', name: 'Shoulder Charge', abbrev: 'SC', cls: 'tank', archetype: 'damage', shape: 'melee_arc',
    power: 22, cd: 7, range: 0.9, area: 60, count: 3,
    dash: Object.freeze({ dist: 2.4, speed: 9 }), // no i-frames
    status: Object.freeze({ kind: 'stun', mag: 1, ticks: 36 }), // non-boss
  }),
  iron_stance: Object.freeze({
    id: 'iron_stance', name: 'Iron Stance', abbrev: 'IS', cls: 'tank', archetype: 'passive', field: 'ally', output: 'shield', shape: 'aura',
    power: 3, area: 1.3, cadenceSec: 1.0, shieldCap: 12, // +3 shield per pulse to everyone inside (Tank included), this source <= 12, 240 ticks
  }),
  // Swordsman (fox) — strikes and chains close-quarter combos.
  flurry: Object.freeze({ id: 'flurry', name: 'Flurry', abbrev: 'FL', cls: 'swordsman', archetype: 'damage', shape: 'melee_arc', power: 11, cd: 3, range: 0.8, area: 60, count: 6 }),
  lunge_strike: Object.freeze({ id: 'lunge_strike', name: 'Lunge Strike', abbrev: 'LS', cls: 'swordsman', archetype: 'damage', shape: 'melee_arc', power: 26, cd: 4, range: 1.3, area: 30, count: 2 }),
  blade_storm: Object.freeze({ id: 'blade_storm', name: 'Blade Storm', abbrev: 'BS', cls: 'swordsman', archetype: 'damage', shape: 'nova', power: 14, cd: 7, area: 1.0, count: 5 }),
  caltrops: Object.freeze({ id: 'caltrops', name: 'Caltrops', abbrev: 'CT', cls: 'swordsman', archetype: 'damage', shape: 'ground_aoe', power: 8, cd: 6.5, range: 2.0, area: 0.7, durationSec: 5 }),
  fox_step: Object.freeze({
    id: 'fox_step', name: 'Fox Step', abbrev: 'FS', cls: 'swordsman', archetype: 'damage', shape: 'melee_arc',
    power: 18, cd: 5, range: 0.8, area: 50, count: 3,
    dash: Object.freeze({ dist: 2.0, speed: 10, iframes: true }),
  }),
  crescent_finisher: Object.freeze({
    id: 'crescent_finisher', name: 'Crescent Finisher', abbrev: 'CF', cls: 'swordsman', archetype: 'damage', shape: 'melee_arc',
    power: 20, cd: 6, range: 1.0, area: 70, count: 5,
    combo: Object.freeze({ perStack: 0.5, maxStacks: 2, windowTicks: 120 }), // +50% per OTHER skill that connected in 120 ticks
  }),
  riposte: Object.freeze({
    id: 'riposte', name: 'Riposte', abbrev: 'RP', cls: 'swordsman', archetype: 'damage', shape: 'melee_arc',
    power: 30, cd: 8, range: 0.9, area: 90, count: 3, // the counter arc
    parry: Object.freeze({ windowTicks: 36 }),
  }),
  razor_wake: Object.freeze({
    id: 'razor_wake', name: 'Razor Wake', abbrev: 'RZ', cls: 'swordsman', archetype: 'passive', field: 'hostile', output: 'damage', shape: 'aura',
    power: 4, area: 0.9, count: 3, cadenceSec: 1.0, knockback: 0, // the 3 nearest hostiles inside; never pushes
  }),
  // Archer (hare) — kites at range.
  piercing_shot: Object.freeze({ id: 'piercing_shot', name: 'Piercing Shot', abbrev: 'PS', cls: 'archer', archetype: 'damage', shape: 'projectile', power: 30, cd: 3, range: 5.5, speed: 6.2, count: 1, area: 0 }),
  volley: Object.freeze({ id: 'volley', name: 'Volley', abbrev: 'VO', cls: 'archer', archetype: 'damage', shape: 'projectile', power: 14, cd: 4.5, range: 4.8, speed: 5.4, count: 3, area: 0 }),
  detonating_charge: Object.freeze({ id: 'detonating_charge', name: 'Detonating Charge', abbrev: 'DC', cls: 'archer', archetype: 'damage', shape: 'ground_aoe', power: 12, cd: 7, range: 4.2, area: 0.85, durationSec: 3 }),
  sundering_nova: Object.freeze({ id: 'sundering_nova', name: 'Sundering Nova', abbrev: 'SN', cls: 'archer', archetype: 'damage', shape: 'nova', power: 16, cd: 8, area: 1.1, count: 4 }),
  vault_shot: Object.freeze({
    id: 'vault_shot', name: 'Vault Shot', abbrev: 'VS', cls: 'archer', archetype: 'damage', shape: 'projectile',
    power: 18, cd: 6, range: 4.5, speed: 6.0, count: 1, area: 0,
    vault: Object.freeze({ dist: 1.6, ticks: 10, iframes: true }),
    status: Object.freeze({ kind: 'slow', mag: 0.3, ticks: 90 }),
  }),
  pinning_arrow: Object.freeze({
    id: 'pinning_arrow', name: 'Pinning Arrow', abbrev: 'PA', cls: 'archer', archetype: 'damage', shape: 'projectile',
    power: 20, cd: 7, range: 5.0, speed: 6.0, count: 1, area: 0,
    status: Object.freeze({ kind: 'stun', mag: 1, ticks: 45 }), // non-boss
  }),
  rain_of_arrows: Object.freeze({
    id: 'rain_of_arrows', name: 'Rain of Arrows', abbrev: 'RA', cls: 'archer', archetype: 'damage', shape: 'ground_aoe',
    power: 7, cd: 11, range: 5.0, area: 1.4, durationSec: 4,
    status: Object.freeze({ kind: 'slow', mag: 0.25, ticks: 72 }), // refreshed by every zone tick
  }),
  kestrel_watch: Object.freeze({
    id: 'kestrel_watch', name: 'Kestrel Watch', abbrev: 'KW', cls: 'archer', archetype: 'passive', field: 'hostile', output: 'damage', shape: 'aura',
    power: 6, area: 4.0, count: 1, cadenceSec: 1.0, // the nearest hostile within 4.0 u (basic-hit knockback)
  }),

  // MORE CLASS SKILLS (docs/CLASS_SKILLS.md, 2026-10-08): three more per
  // class. Plain-data modifiers added with them: `pull` (an area strike drags
  // non-boss enemies toward the caster instead of knocking them back),
  // `grant` (a guard's recipients also gain this status) and `selfStatus`
  // (the caster gains this status as the cast lands).
  earthshatter: Object.freeze({
    id: 'earthshatter', name: 'Earthshatter', abbrev: 'ES', cls: 'tank', archetype: 'damage', shape: 'melee_arc',
    power: 46, cd: 11, range: 1.8, area: 22, count: 4, // a long narrow fault ahead of the Tank
    status: Object.freeze({ kind: 'stun', mag: 1, ticks: 30 }), // non-boss
  }),
  rallying_cry: Object.freeze({
    id: 'rallying_cry', name: 'Rallying Cry', abbrev: 'RC', cls: 'tank', archetype: 'guard', shape: 'direct',
    power: 10, cd: 12, range: 3.5, count: 4, // every member in reach (Tank included)
    status: Object.freeze({ kind: 'shield', mag: 10, ticks: 240 }),
    grant: Object.freeze({ kind: 'inspired', mag: 0.2, ticks: 180 }), // + 20% damage dealt for 3 s
  }),
  earthen_grasp: Object.freeze({
    id: 'earthen_grasp', name: 'Earthen Grasp', abbrev: 'EG', cls: 'tank', archetype: 'damage', shape: 'nova',
    power: 12, cd: 9, area: 2.3, count: 6,
    pull: 0.9, // non-boss enemies hit are dragged 0.9 u toward the Tank
    status: Object.freeze({ kind: 'slow', mag: 0.3, ticks: 90 }),
  }),
  moonfang: Object.freeze({
    id: 'moonfang', name: 'Moonfang', abbrev: 'MF', cls: 'swordsman', archetype: 'damage', shape: 'melee_arc',
    power: 24, cd: 7, range: 1.0, area: 45, count: 4,
    dash: Object.freeze({ dist: 3.2, speed: 13, iframes: true }), // a longer untouchable dash than Fox Step
    status: Object.freeze({ kind: 'exposed', mag: 0.2, ticks: 120 }), // the cut marks: +20% taken for 2 s
  }),
  blade_dance: Object.freeze({
    id: 'blade_dance', name: 'Blade Dance', abbrev: 'BD', cls: 'swordsman', archetype: 'damage', shape: 'nova',
    power: 10, cd: 6, area: 1.3, count: 6,
    selfStatus: Object.freeze({ kind: 'haste', mag: 0.3, ticks: 120 }), // the fox runs 30% faster for 2 s
  }),
  crimson_edge: Object.freeze({
    id: 'crimson_edge', name: 'Crimson Edge', abbrev: 'CE', cls: 'swordsman', archetype: 'passive', field: 'hostile', output: 'damage', shape: 'aura',
    power: 9, area: 1.5, count: 1, cadenceSec: 1.0, critBonus: 0.25, knockback: 0, // the nearest hostile within 1.5 u; +25% crit chance
  }),
  hunters_mark: Object.freeze({
    id: 'hunters_mark', name: "Hunter's Mark", abbrev: 'HM', cls: 'archer', archetype: 'damage', shape: 'projectile',
    power: 12, cd: 6, range: 6.5, speed: 7.5, count: 1, area: 0,
    status: Object.freeze({ kind: 'exposed', mag: 0.3, ticks: 180 }), // marked: +30% taken for 3 s
  }),
  barbed_trap: Object.freeze({
    id: 'barbed_trap', name: 'Barbed Trap', abbrev: 'BA', cls: 'archer', archetype: 'damage', shape: 'ground_aoe',
    power: 16, cd: 9, range: 3.6, area: 0.75, durationSec: 3,
    status: Object.freeze({ kind: 'stun', mag: 1, ticks: 40 }), // snaps shut: a stun (not the bosses), then the stun immunity
  }),
  feather_fan: Object.freeze({
    id: 'feather_fan', name: 'Feather Fan', abbrev: 'FF', cls: 'archer', archetype: 'damage', shape: 'projectile',
    power: 9, cd: 5, range: 3.2, speed: 6.5, count: 5, area: 0, // a close five-arrow spray
    selfStatus: Object.freeze({ kind: 'haste', mag: 0.3, ticks: 90 }), // then the hare darts off: 30% faster for 1.5 s
  }),

  // THE TIDECALLER (docs/TIDECALLER.md): the otter's four base skills. Her
  // rhythm is soak, then crash: `status: soaked` soaks what it reaches (the
  // status, sim/status.js), `crash` deals +60% to a soaked enemy and consumes
  // the soak (sim/allycast.js), `drag` pulls a zone's occupants toward its
  // centre each zone tick (not the bosses), `push` is an area strike's own
  // knockback distance.
  riverbolt: Object.freeze({
    id: 'riverbolt', name: 'Riverbolt', abbrev: 'RB', cls: 'tidecaller', archetype: 'damage', shape: 'projectile',
    power: 14, cd: 2.5, range: 5.0, speed: 6.0, count: 1, area: 0,
    status: Object.freeze({ kind: 'soaked', mag: 0.15, ticks: 240 }),
  }),
  undertow: Object.freeze({
    id: 'undertow', name: 'Undertow', abbrev: 'UT', cls: 'tidecaller', archetype: 'damage', shape: 'ground_aoe',
    power: 6, cd: 8, range: 3.5, area: 1.0, durationSec: 4,
    drag: 0.25, // each zone tick drags the enemies inside 0.25 u toward the centre (not the bosses)
    status: Object.freeze({ kind: 'soaked', mag: 0.15, ticks: 240 }),
  }),
  breaker: Object.freeze({
    id: 'breaker', name: 'Breaker', abbrev: 'BK', cls: 'tidecaller', archetype: 'damage', shape: 'nova',
    power: 22, cd: 8, area: 1.4, count: 5,
    crash: true, // +60% to a soaked enemy, and the soak is spent
    push: 1.0, // knocks the enemies hit 1.0 u back
  }),
  tidepool: Object.freeze({
    id: 'tidepool', name: 'Tidepool', abbrev: 'TP', cls: 'tidecaller', archetype: 'passive', field: 'hostile', output: 'damage', shape: 'aura',
    power: 5, area: 2.5, count: 2, cadenceSec: 1.0, knockback: 0, // the 2 nearest enemies within 2.5 u, never pushed
    status: Object.freeze({ kind: 'soaked', mag: 0.15, ticks: 240 }),
  }),

  // THE TIDECALLER, her whole kit (Tidecaller slice 3). New plain-data keys:
  // `pierce` on a class bolt (Torrent runs through the line), `also` (a
  // zone's second status, the slow inside Whirlpool and Rain Squall),
  // `atOrigin` (Ripple Step's puddle lands where the vault began), `pick:
  // 'threat'` (Bubble Ward's one recipient: the member most enemies are on),
  // `burstSoak` (the bubble soaks enemies near it when it ends or breaks) and
  // the Maelstrom's `drawIn` / `drawArea` / `delaySec` (drag the room in at
  // the cast, burst a second later where she cast it).
  torrent: Object.freeze({
    id: 'torrent', name: 'Torrent', abbrev: 'TO', cls: 'tidecaller', archetype: 'damage', shape: 'projectile',
    power: 18, cd: 6, range: 5.5, speed: 9.0, count: 1, area: 0,
    pierce: 12, // through every enemy on the line
    crash: true,
  }),
  whirlpool: Object.freeze({
    id: 'whirlpool', name: 'Whirlpool', abbrev: 'WP', cls: 'tidecaller', archetype: 'damage', shape: 'ground_aoe',
    power: 4, cd: 12, range: 4.0, area: 1.4, durationSec: 5,
    drag: 0.5,
    status: Object.freeze({ kind: 'soaked', mag: 0.15, ticks: 240 }),
    also: Object.freeze({ kind: 'slow', mag: 0.3, ticks: 72 }), // refreshed by every zone tick
  }),
  ripple_step: Object.freeze({
    id: 'ripple_step', name: 'Ripple Step', abbrev: 'RI', cls: 'tidecaller', archetype: 'damage', shape: 'ground_aoe',
    power: 6, cd: 7, range: 0, area: 0.8, durationSec: 3,
    vault: Object.freeze({ dist: 2.6, ticks: 14, iframes: true }), // away from the aim (the AI: from the nearest enemy)
    atOrigin: true,
    status: Object.freeze({ kind: 'soaked', mag: 0.15, ticks: 240 }),
  }),
  bubble_ward: Object.freeze({
    id: 'bubble_ward', name: 'Bubble Ward', abbrev: 'BW', cls: 'tidecaller', archetype: 'guard', shape: 'direct',
    power: 14, cd: 11, range: 4.0, count: 1,
    pick: 'threat',
    status: Object.freeze({ kind: 'shield', mag: 14, ticks: 240 }),
    burstSoak: true,
  }),
  crashing_wave: Object.freeze({
    id: 'crashing_wave', name: 'Crashing Wave', abbrev: 'CW', cls: 'tidecaller', archetype: 'damage', shape: 'melee_arc',
    power: 20, cd: 9, range: 2.2, area: 50, count: 6, // a 100° wave rolling 2.2 u out
    crash: true,
    push: 1.2,
  }),
  rain_squall: Object.freeze({
    id: 'rain_squall', name: 'Rain Squall', abbrev: 'SQ', cls: 'tidecaller', archetype: 'damage', shape: 'ground_aoe',
    power: 3, cd: 14, range: 5.0, area: 1.8, durationSec: 6,
    status: Object.freeze({ kind: 'soaked', mag: 0.15, ticks: 240 }),
    also: Object.freeze({ kind: 'slow', mag: 0.25, ticks: 72 }),
  }),
  maelstrom: Object.freeze({
    id: 'maelstrom', name: 'Maelstrom', abbrev: 'MA', cls: 'tidecaller', archetype: 'damage', shape: 'nova',
    power: 40, cd: 16, area: 1.6, count: 8,
    drawIn: 1.0, // at the cast: everything within 3.0 u is dragged 1.0 u in (not the bosses)
    drawArea: 3.0,
    delaySec: 1.0, // then the burst, where she cast it
    crash: true,
  }),
});

// A skill's class (Healer rows carry no `cls`).
export const classOfSkill = (id) => (SKILLS[id] ? SKILLS[id].cls ?? 'healer' : null);

// §7 starting kit: Mending Bolt slot 1, Swift Mend slot 2 (the draft block
// re-owns loadout initialization when it lands).
// v0.5.227 (CAMP FIXES): the Healer starts with NO skills, like every class;
// skills come only from wave rewards (or an equipped Unlocks kit). The §7 kit
// was ['mending_bolt', 'swift_mend'].
export const STARTING_SKILLS = Object.freeze([]);

// Ruling A17 (the user's rule, 2026-09-27): the Healer's CLASS pool — every
// Healer skill, sorted ascending id. A swap offer (4 skills owned) draws from
// this pool minus owned, so a replaced starting skill can come back; with
// both starting skills owned it equals draft.js DRAFTABLE_SKILL_IDS − owned
// exactly (same ids, same order), so the Healer's draws never change while
// its starting skills are held.
export const HEALER_SKILL_IDS = Object.freeze(
  Object.keys(SKILLS)
    .filter((id) => !SKILLS[id].cls || SKILLS[id].cls === 'healer')
    .sort()
);

// Sim-side party allies (§7 class rows: max_hp Tank 150 / Swordsman 95 /
// Archer 80). Positions mirror the arena scene's idle critter spots
// (scenes/arena.js ALLY_SPOTS — the render side draws them there, so heal
// events land on the drawn bodies). Static until the ally-AI block moves them.
// radius = the same 0.3 u capsule scaffold every sim body uses.
export const PARTY_ALLIES = Object.freeze([
  Object.freeze({ classId: 'tank', partyIndex: 1, maxHp: 150, x: -1.9, z: -1.0, radius: 0.3 }),
  Object.freeze({ classId: 'swordsman', partyIndex: 2, maxHp: 95, x: 1.8, z: -1.3, radius: 0.3 }),
  Object.freeze({ classId: 'archer', partyIndex: 3, maxHp: 80, x: -0.35, z: -2.2, radius: 0.3 }),
]);

export const isPassiveSkill = (id) => !!SKILLS[id] && SKILLS[id].shape === 'aura';
const cdTicks = (def) => Math.max(CD_FLOOR_TICKS, secTicks(def.cd ?? 0));

// resolve(def) -> def is the build-system stat hook (§15.4): the node block
// passes its flat->pct->mult->clamp resolver so socketed stat nodes shape live
// casts; the default identity keeps this module standalone.
export function createSkillSystem({ player, registry, events, combat, getTick, isIframed, queueDeferred, resolve = (def) => def }) {
  // slots[i] = { id, readyTick } | null. player.skills mirrors the ids so any
  // module reading the entity sees the same truth.
  const slots = new Array(SKILL_SLOTS).fill(null);
  if (Array.isArray(player.skills)) while (player.skills.length < SKILL_SLOTS) player.skills.push(null);
  let override = null; // §8 durable heal-target override: party_index 0–3 | null
  // Passive auras: skillId -> next pulse tick (ascending slot order at pulse
  // time). Plain data, serialised as remaining ticks.
  const auraNext = new Map();
  // Build-system hook (nodes block): castMods(skillId) -> { powerMul } for the
  // Resonance technique; attached by the run block after both systems exist.
  let build = null;

  const party = () =>
    registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex);

  const statusOf = () => combat.status ?? null;
  function applyStatus(t, st, tick) {
    const S = statusOf();
    if (!st || !S || !t || !(t.hp > 0)) return null;
    return S.apply(t, st.kind, st.mag, st.ticks, tick, player.id);
  }

  // Impact resolution for skill bolts rides the §4 ① deferred-maturation
  // queue (ascending carrier ordinal), exactly like basic bolts.
  function queueBoltImpact(tick, bolt, target) {
    const len = Math.hypot(bolt.vx, bolt.vz);
    const dirX = len > 1e-9 ? bolt.vx / len : 0;
    const dirZ = len > 1e-9 ? bolt.vz / len : 0;
    const targetId = target.id;
    const { power, skill, heal, sourceId } = bolt;
    const critBonus = bolt.critBonus ?? 0;
    const source = bolt.tech ? `${skill}:${bolt.tech}` : skill;
    queueDeferred(bolt.id, () => {
      const t = registry.byId(targetId);
      if (!t) return;
      if (heal) combat.applyHeal(t, power, { healer: sourceId, source, critBonus });
      else combat.applyDamage(t, power, { delivery: 'skill', shape: 'projectile', dirX, dirZ, attacker: sourceId, source, critBonus });
    });
  }

  // `owner` tags every bolt this instance spawns so a SECOND bolt subsystem on
  // the same registry (the build block's Echo recasts) can never also advance
  // the kit's bolts — a double step would double every §7 bolt speed.
  const bolts = createSkillBolts({
    registry,
    events,
    onImpact: queueBoltImpact,
    owner: 'healer_kit',
  });

  function aimDir() {
    // §6: aim exactly on the caster reuses the last valid aim (same rule the
    // basic attack applies in world.js).
    if (player.aim) {
      const ax = player.aim.x - player.x;
      const az = player.aim.z - player.z;
      const len = Math.hypot(ax, az);
      if (len > 1e-4) {
        player.lastAimDir = { x: ax / len, z: az / len };
        return player.lastAimDir;
      }
    }
    return player.lastAimDir;
  }

  // ---------------------------------------------------------------- equip --
  function giveSkill(id) {
    const def = SKILLS[id];
    if (!def) return { error: `unknown skill '${id}'` };
    const existing = slots.findIndex((s) => s && s.id === id);
    if (existing >= 0) return { slot: existing, already: true };
    const slot = slots.findIndex((s) => s === null);
    if (slot < 0) return { error: 'no_free_slot' };
    slots[slot] = { id, readyTick: 0 };
    player.skills[slot] = id;
    if (def.shape === 'aura') auraNext.set(id, getTick() + AURA_CADENCE_TICKS);
    events.emit(getTick(), 'skill_equip', { slot, skill: id, passive: def.shape === 'aura' });
    return { slot };
  }

  // Ruling A17 (the user's rule): a SWAP — `id` takes `slot`, whose skill
  // leaves the loadout (never a 5th skill). The new skill is ready at once
  // (like a drafted one); the old skill's passive pulse clock ends with it.
  // The build system releases the old skill's sockets (nodes.js
  // releaseSkill) — the run system calls both.
  function replaceSkill(slot, id) {
    const def = SKILLS[id];
    if (!def) return { error: `unknown skill '${id}'` };
    if (!(Number.isInteger(slot) && slot >= 0 && slot < SKILL_SLOTS)) return { error: 'no_such_slot' };
    if (slots.some((s) => s && s.id === id)) return { error: 'owned' };
    const old = slots[slot];
    if (!old) return giveSkill(id); // an empty slot is a plain equip
    auraNext.delete(old.id);
    slots[slot] = { id, readyTick: 0 };
    player.skills[slot] = id;
    if (def.shape === 'aura') auraNext.set(id, getTick() + AURA_CADENCE_TICKS);
    events.emit(getTick(), 'skill_equip', { slot, skill: id, passive: def.shape === 'aura', replaced: old.id });
    return { slot, replaced: old.id };
  }

  // PARTY (§25.1): between rooms the 4 owned skills can be REORDERED (slot
  // order = keys 1-4); cooldowns and sockets travel with their skill (the
  // build keys sockets by skill id).
  function reorderSkills(from, to) {
    const ok = (k) => Number.isInteger(k) && k >= 0 && k < SKILL_SLOTS;
    if (!ok(from) || !ok(to) || from === to) return { denied: 'no_such_slot' };
    const t = slots[from];
    slots[from] = slots[to];
    slots[to] = t;
    player.skills[from] = slots[from] ? slots[from].id : null;
    player.skills[to] = slots[to] ? slots[to].id : null;
    events.emit(getTick(), 'loadout_reorder', { seat: 0, from, to, slots: slots.map((s) => (s ? s.id : null)) });
    return { ok: true, slots: slots.map((s) => (s ? s.id : null)) };
  }

  // ----------------------------------------------------------------- fire --
  // Called by the world in §4 per-actor order (skills ascending slot), only
  // when the player is NOT dashing (the world owns priority_suppressed).
  function tryFire(slot) {
    const tick = getTick();
    const kind = `skill_${slot + 1}`;
    const s = slots[slot];
    if (!s) {
      events.emit(tick, 'intent_denied', { kind, reason: DENIAL.emptySlot });
      return false;
    }
    const def = SKILLS[s.id];
    if (def.shape === 'aura') {
      // Passive: no activation (§7). Closed denial vocabulary → empty_slot.
      events.emit(tick, 'intent_denied', { kind, reason: DENIAL.emptySlot });
      return false;
    }
    if (tick < s.readyTick) {
      events.emit(tick, 'intent_denied', { kind, reason: DENIAL.onCooldown });
      return false;
    }
    const rdef = resolve(def); // §15.4: socketed stat nodes shape the live cast
    // Resonance (§23.4): every 3rd cast of this skill resolves at ×2 power.
    // The build system owns the counter; this call advances it.
    const mods = build && typeof build.castMods === 'function' ? build.castMods(s.id) : null;
    fire(rdef, slot, tick, mods);
    s.readyTick = tick + cdTicks(rdef); // instant cast: fire → cooldown starts
    return true;
  }

  function fire(def, slot, tick, mods = null) {
    const cast = { slot, skill: def.id, shape: def.shape };
    const powerMul = mods && mods.powerMul ? mods.powerMul : 1;
    deliver(def, def.power * powerMul, cast, { tick });
    if (mods && mods.resonance) cast.resonance = true;
    events.emit(tick, 'skill_cast', cast);
  }

  // One delivery of a skill (a primary cast, or an Echo recast when `echo`
  // carries the original cast record: same aim / targets / placement). Fills
  // `out` with the §6 cast payload in the v0.4.63 key order.
  //   boltSys: the bolt subsystem the projectiles ride (echo recasts use the
  //            build block's own instance, see nodes.js).
  function deliver(def, power, out, { tick = getTick(), boltSys = bolts, echo = null } = {}) {
    const heal = def.archetype === 'heal';
    const critBonus = def.critBonus ?? 0;
    const st = def.status ?? null;
    if (def.shape === 'projectile') {
      const dir = echo ? { x: echo.dx, z: echo.dz } : aimDir();
      for (const d of fanDirections(dir.x, dir.z, def.count)) {
        boltSys.spawn(tick, {
          x: player.x,
          z: player.z,
          dirX: d.x,
          dirZ: d.z,
          speed: def.speed,
          range: def.range,
          radius: BOLT_RADIUS,
          power,
          skill: def.id,
          heal,
          sourceId: player.id,
          critBonus,
          hits: def.pierce ?? 1,
        });
      }
      out.dx = r2(dir.x);
      out.dz = r2(dir.z);
    } else if (def.shape === 'direct') {
      let targets;
      let overrideMode = null;
      if (echo) {
        targets = (echo.targets ?? []).map((id) => registry.byId(id)).filter((t) => t && t.hp > 0);
      } else {
        const r = selectDirect({
          caster: player,
          party: party(),
          range: def.range,
          count: def.count,
          override,
          isIframed,
        });
        targets = r.targets;
        overrideMode = r.overrideMode;
      }
      for (const t of targets) combat.applyHeal(t, power, { healer: player.id, source: def.id, critBonus });
      if (st) for (const t of targets) applyStatus(t, st, tick);
      out.targets = targets.map((t) => t.id);
      if (!echo) out.override = overrideMode;
    } else if (def.shape === 'nova') {
      if (heal) {
        const targets = selectNova({
          caster: player,
          party: party(),
          radius: def.area,
          count: def.count,
          isIframed,
        });
        for (const t of targets) combat.applyHeal(t, power, { healer: player.id, source: def.id, critBonus });
        if (st) for (const t of targets) applyStatus(t, st, tick);
        out.targets = targets.map((t) => t.id);
      } else {
        const targets = selectAreaDamage({
          entities: registry.all(),
          x: player.x,
          z: player.z,
          radius: def.area,
          count: def.count,
          isIframed,
        });
        for (const t of targets) {
          const len = Math.hypot(t.x - player.x, t.z - player.z);
          combat.applyDamage(t, power, {
            delivery: 'skill',
            shape: 'nova',
            dirX: len > 1e-6 ? (t.x - player.x) / len : 0,
            dirZ: len > 1e-6 ? (t.z - player.z) / len : 0,
            attacker: player.id,
            source: def.id,
            critBonus,
          });
        }
        if (st) for (const t of targets) if (t.faction === 'hostile') applyStatus(t, st, tick);
        out.targets = targets.map((t) => t.id);
        out.area = def.area;
      }
    } else if (def.shape === 'melee_arc') {
      const dir = echo ? { x: echo.dx, z: echo.dz } : aimDir();
      const targets = selectArc({
        caster: player,
        party: heal ? party() : registry.all().filter(isAreaDamageable),
        aimX: dir.x,
        aimZ: dir.z,
        reach: def.range,
        halfAngleDeg: def.area,
        count: def.count,
        isIframed,
      });
      if (heal) for (const t of targets) combat.applyHeal(t, power, { healer: player.id, source: def.id, critBonus });
      else
        for (const t of targets)
          combat.applyDamage(t, power, { delivery: 'skill', shape: 'melee_arc', dirX: dir.x, dirZ: dir.z, attacker: player.id, source: def.id, critBonus });
      if (st) for (const t of targets) applyStatus(t, st, tick);
      out.targets = targets.map((t) => t.id);
      out.dx = r2(dir.x);
      out.dz = r2(dir.z);
    } else if (def.shape === 'ground_aoe') {
      const pos = echo ? { x: echo.x, z: echo.z } : clampPlacement(player, player.aim, def.range);
      const spec = {
        kind: 'zone',
        skill: def.id,
        x: pos.x,
        z: pos.z,
        px: pos.x,
        pz: pos.z,
        radius: def.area,
        power,
        sourceId: player.id,
        ticksDone: 0,
        totalTicks: Math.round(secTicks(def.durationSec) / ZONE_CADENCE_TICKS), // 4 s / 1 s = 4
        nextTickTick: tick + ZONE_CADENCE_TICKS, // first tick 1.0 s after placement (§6)
      };
      if (!heal) spec.damage = true;
      if (st) spec.applies = { kind: st.kind, mag: st.mag, ticks: st.ticks }; // (not `status`: that key is a body's own status map)
      if (critBonus > 0) spec.critBonus = critBonus;
      const zone = registry.spawn(spec);
      const ev = {
        id: zone.id,
        skill: def.id,
        x: r2(pos.x),
        z: r2(pos.z),
        radius: def.area,
      };
      if (!heal) ev.damage = true;
      if (echo) ev.echo = true;
      events.emit(tick, 'zone_spawn', ev);
      out.zone = zone.id;
      out.x = r2(pos.x);
      out.z = r2(pos.z);
    }
    return out;
  }

  // ----------------------------------------------------- continuous phase --
  function step(tick) {
    bolts.step(tick);
  }

  // --- §4 ④: persistent-zone scheduled ticks, ascending zone spawn ordinal
  // (registry iteration order), then the passive auras' own cadences. Each
  // tick creates normal instances: own crit roll, i-frame / Downed
  // suppression (§6). Occupants resolve near→far from the zone center, ties
  // ascending id (§4 ①).
  function zonePhase() {
    const tick = getTick();
    for (const z of registry.all()) {
      if (z.kind !== 'zone' || tick < z.nextTickTick) continue;
      z.ticksDone += 1;
      z.nextTickTick += ZONE_CADENCE_TICKS;
      if (z.damage) {
        // Damage zone (Rootsnare): every damageable body inside takes one
        // instance, then the zone's status refreshes on the survivors.
        const victims = selectAreaDamage({ entities: registry.all(), x: z.x, z: z.z, radius: z.radius, isIframed });
        const hit = [];
        for (const v of victims) {
          const len = Math.hypot(v.x - z.x, v.z - z.z);
          const r = combat.applyDamage(v, z.power, {
            delivery: 'skill',
            shape: 'ground_aoe',
            dirX: len > 1e-6 ? (v.x - z.x) / len : 0,
            dirZ: len > 1e-6 ? (v.z - z.z) / len : 0,
            attacker: z.sourceId,
            source: z.skill,
            critBonus: z.critBonus ?? 0,
          });
          if (r) hit.push(v.id);
          if (z.applies && v.faction === 'hostile') applyStatus(v, z.applies, tick);
        }
        events.emit(tick, 'zone_tick', { id: z.id, skill: z.skill, n: z.ticksDone, hit, damage: true });
      } else {
        const occupants = party().filter(
          (m) => m.hp > 0 && !isIframed(m) && (m.x - z.x) ** 2 + (m.z - z.z) ** 2 <= z.radius * z.radius
        );
        occupants.sort((a, b) => {
          const da = (a.x - z.x) ** 2 + (a.z - z.z) ** 2;
          const db = (b.x - z.x) ** 2 + (b.z - z.z) ** 2;
          return da !== db ? da - db : a.id - b.id;
        });
        const healed = [];
        for (const m of occupants) {
          const r = combat.applyHeal(m, z.power, { healer: z.sourceId, source: z.skill, critBonus: z.critBonus ?? 0 });
          if (r) healed.push(m.id);
          if (z.applies) applyStatus(m, z.applies, tick);
        }
        events.emit(tick, 'zone_tick', { id: z.id, skill: z.skill, n: z.ticksDone, healed });
      }
      if (z.ticksDone >= z.totalTicks) {
        events.emit(tick, 'zone_expire', { id: z.id, skill: z.skill });
        registry.despawn(z.id);
      }
    }

    // Passive auras, ascending slot order, each on its own cadence.
    for (const s of slots) {
      if (!s || SKILLS[s.id].shape !== 'aura') continue;
      const next = auraNext.get(s.id);
      if (next === undefined || tick < next) continue;
      auraNext.set(s.id, next + AURA_CADENCE_TICKS);
      pulseAura(s.id);
    }
  }

  // One pulse of a passive aura: heals every OTHER living party member inside
  // the field ("heals allies inside" — the field's own caster is not her own
  // ally), then its status (Quiet Hearth: ward) refreshes on them. `echo`
  // marks the Echo node's bonus Reapply pulse (nodes.js).
  function pulseAura(skillId, { echo = false, powerMul = 1 } = {}) {
    const tick = getTick();
    const def = resolve(SKILLS[skillId]); // §15.4 hook (Sharpen/Ascend/Widen live on auras)
    // Resonance on a passive (M4c): every 3rd REGULAR pulse ×2 — the build
    // system owns the counter; the Echo Reapply bonus pulse never advances it.
    if (!echo && build && typeof build.pulseMods === 'function') {
      const mods = build.pulseMods(skillId);
      if (mods && mods.powerMul) powerMul *= mods.powerMul;
    }
    const inField = party().filter(
      (m) =>
        m.id !== player.id &&
        m.hp > 0 &&
        !isIframed(m) &&
        (m.x - player.x) ** 2 + (m.z - player.z) ** 2 <= def.area * def.area
    );
    inField.sort((a, b) => {
      const da = (a.x - player.x) ** 2 + (a.z - player.z) ** 2;
      const db = (b.x - player.x) ** 2 + (b.z - player.z) ** 2;
      return da !== db ? da - db : a.id - b.id;
    });
    const healed = [];
    for (const m of inField) {
      const r = combat.applyHeal(m, def.power * powerMul, { healer: player.id, source: def.id, critBonus: def.critBonus ?? 0 });
      if (r) healed.push(m.id);
    }
    if (def.status) for (const m of inField) applyStatus(m, def.status, tick);
    const ev = { healed, skill: skillId, area: r2(def.area), x: r2(player.x), z: r2(player.z) };
    if (echo) ev.echo = true;
    events.emit(tick, 'aura_pulse', ev);
    return healed;
  }

  // ------------------------------------------------------------- override --
  // §8: durable toggle per caster. Press = set; same key = clear; other key =
  // replace. Self-select (index 0) legal. Room clear will clear via
  // clearOverride() when the room block lands.
  function toggleOverride(index) {
    override = override === index ? null : index;
    events.emit(getTick(), 'heal_override', { index: override });
    return override;
  }
  const clearOverride = () => {
    override = null;
  };

  // ------------------------------------------------------ views / plumbing --
  function slotsView() {
    const tick = getTick();
    return slots.map((s) => {
      if (!s) return null;
      const def = resolve(SKILLS[s.id]); // resolved cd so the HUD wipe shows Quicken
      const passive = def.shape === 'aura';
      return {
        id: s.id,
        abbrev: def.abbrev,
        passive,
        remainingTicks: passive ? 0 : Math.max(0, s.readyTick - tick),
        totalTicks: passive ? 0 : cdTicks(def),
      };
    });
  }

  // Persistence plumbing for the run block (§13: cooldowns persist across
  // rooms/scene swaps, never reset). Remaining ticks are stored relative, so a
  // restore into a fresh world/tick-base re-arms the same remaining time.
  function serialize() {
    const tick = getTick();
    const auras = {};
    for (const [id, next] of auraNext) auras[id] = Math.max(0, next - tick);
    return {
      slots: slots.map((s) =>
        s ? { id: s.id, remaining: Math.max(0, s.readyTick - tick) } : null
      ),
      override,
      auras,
    };
  }

  function restore(data) {
    if (!data || !Array.isArray(data.slots)) return false;
    const tick = getTick();
    auraNext.clear();
    for (let i = 0; i < SKILL_SLOTS; i++) {
      const d = data.slots[i] ?? null;
      slots[i] = d ? { id: d.id, readyTick: tick + (d.remaining ?? 0) } : null;
      player.skills[i] = d ? d.id : null;
      if (d && SKILLS[d.id]?.shape === 'aura') {
        const rem = data.auras && Number.isFinite(data.auras[d.id]) ? data.auras[d.id] : AURA_CADENCE_TICKS;
        auraNext.set(d.id, tick + rem);
      }
    }
    override = data.override ?? null;
    events.emit(tick, 'skills_restored', { slots: slots.map((s) => (s ? s.id : null)) });
    events.emit(tick, 'heal_override', { index: override }); // keep HUD/reticle in sync
    return true;
  }

  // Save system (docs/gauntlet/PLAN.md §3.4, M2) — the COMPLETE private state
  // with absolute ticks, no events, no clamping (serialize()/restore() above
  // are the run block's relative-cooldown persistence and stay as they are).
  // player.skills (the id mirror) lives on the player entity (registry).
  function saveState() {
    return {
      slots: slots.map((s) => (s ? { id: s.id, readyTick: s.readyTick } : null)),
      override,
      auraNext: [...auraNext.entries()],
    };
  }
  function loadState(d) {
    if (!d || !Array.isArray(d.slots)) throw new TypeError('skills.loadState: missing slots');
    for (let i = 0; i < SKILL_SLOTS; i++) {
      const s = d.slots[i] ?? null;
      slots[i] = s ? { id: s.id, readyTick: s.readyTick } : null;
    }
    override = d.override ?? null;
    auraNext.clear();
    for (const [k, v] of d.auraNext ?? []) auraNext.set(k, v);
  }

  return {
    saveState,
    loadState,
    giveSkill,
    replaceSkill,
    reorderSkills,
    tryFire,
    step,
    zonePhase,
    pulseAura,
    deliver,
    toggleOverride,
    clearOverride,
    getOverride: () => override,
    slotsView,
    serialize,
    restore,
    // Late-bound build hook (run.js attaches the build system once both exist).
    attachBuild: (b) => {
      build = b;
    },
    ownedIds: () => slots.filter(Boolean).map((s) => s.id),
    slotCount: () => SKILL_SLOTS,
  };
}
