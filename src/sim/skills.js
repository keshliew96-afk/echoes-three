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
//   - SKILL_SLOTS (8, §23.9) slots, cooldown-gated, no mana, INSTANT cast
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
});

// §7 starting kit: Mending Bolt slot 1, Swift Mend slot 2 (the draft block
// re-owns loadout initialization when it lands).
export const STARTING_SKILLS = Object.freeze(['mending_bolt', 'swift_mend']);

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

  return {
    giveSkill,
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
