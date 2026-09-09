// Healer skill kit (§7) + slot/cooldown machinery (§6) + heal targeting (§8).
//
// Every number in SKILLS and PARTY_ALLIES is VERBATIM from BUILD_BRIEF §7
// (the healer skill table and the class stat table) — no invented stats.
// power is per-instance (nova/sanctuary/aura/bond rows are per-target /
// per-tick / each, exactly as the table annotates them).
//
// §6 binding rules owned here:
//   - 4 slots, cooldown-gated, no mana, INSTANT cast (press → fire → cooldown
//     starts). No cast bars; firing never touches movement. No global
//     cooldown; no input buffering. Cooldown floor max(0.5 s, cd).
//   - Cooldowns tick in sim time (integer readyTick), persist across rooms and
//     scene/state reloads (serialize/restore below carry REMAINING ticks for
//     the run block's persistence ledger), never reset by any path.
//   - Warding Aura is a passive: it occupies a slot when drafted but has no
//     activation — a press on its slot is denied with the closed-vocabulary
//     reason `empty_slot` (nothing activatable in that slot; §4's denial list
//     has no passive-specific code) and its HUD slot renders a static glyph.
//   - Same-tick multi-skill presses all fire (world resolves ascending slot).
//   - During a dash the WORLD denies skill fires `priority_suppressed` before
//     this module is consulted (§5 contract, preserved).
//
// §8 heal-override state (F1–F4 / portrait click) is caster-local and lives
// here: durable toggle, press = set / same = clear / other = replace; an
// invalid override (downed / out of range) falls back to smart-target WITHOUT
// clearing and resumes when valid again.
//
// Sim discipline: no DOM, no render imports, no wall clock, gameplay RNG only
// via the combat pipeline's own crit rolls.
import { TICK_HZ } from '../core/constants.js';
import { DENIAL } from '../core/intents.js';
import {
  fanDirections,
  selectDirect,
  selectNova,
  selectArc,
  clampPlacement,
  createSkillBolts,
} from './shapes.js';

const r2 = (v) => Math.round(v * 100) / 100;
const secTicks = (s) => Math.round(s * TICK_HZ);
const CD_FLOOR_TICKS = secTicks(0.5); // §6: cd_final = max(0.5 s, cd)
const ZONE_CADENCE_TICKS = secTicks(1.0); // §6: zone tick cadence 1.0 s, first at 1.0 s
const AURA_CADENCE_TICKS = secTicks(1.0); // §7: Warding Aura 1.0 s cadence
const BOLT_RADIUS = 0.05; // same swept-vs-wall scaffold radius as the basic bolt

// §7 Healer skills — 2 starting + 6 draftable, table rows verbatim.
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

const cdTicks = (def) => Math.max(CD_FLOOR_TICKS, secTicks(def.cd ?? 0));

// resolve(def) -> def is the build-system stat hook (§15.4): the node block
// passes its flat->pct->mult->clamp resolver so socketed stat nodes shape live
// casts; the default identity keeps this module standalone.
export function createSkillSystem({ player, registry, events, combat, getTick, isIframed, queueDeferred, resolve = (def) => def }) {
  // slots[i] = { id, readyTick } | null. player.skills mirrors the ids so any
  // module reading the entity sees the same truth.
  const slots = [null, null, null, null];
  let override = null; // §8 durable heal-target override: party_index 0–3 | null
  const aura = { on: false, nextPulseTick: 0 };

  const party = () =>
    registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex);

  // Impact resolution for skill bolts rides the §4 ① deferred-maturation
  // queue (ascending carrier ordinal), exactly like basic bolts.
  function queueBoltImpact(tick, bolt, target) {
    const len = Math.hypot(bolt.vx, bolt.vz);
    const dirX = len > 1e-9 ? bolt.vx / len : 0;
    const dirZ = len > 1e-9 ? bolt.vz / len : 0;
    const targetId = target.id;
    const { power, skill, heal, sourceId } = bolt;
    queueDeferred(bolt.id, () => {
      const t = registry.byId(targetId);
      if (!t) return;
      if (heal) combat.applyHeal(t, power, { healer: sourceId, source: skill });
      else combat.applyDamage(t, power, { delivery: 'skill', shape: 'projectile', dirX, dirZ, attacker: sourceId, source: skill });
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
    if (def.shape === 'aura') {
      aura.on = true;
      aura.nextPulseTick = getTick() + AURA_CADENCE_TICKS;
    }
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
    fire(rdef, slot, tick);
    s.readyTick = tick + cdTicks(rdef); // instant cast: fire → cooldown starts
    return true;
  }

  function fire(def, slot, tick) {
    const cast = { slot, skill: def.id, shape: def.shape };
    if (def.shape === 'projectile') {
      const dir = aimDir();
      for (const d of fanDirections(dir.x, dir.z, def.count)) {
        bolts.spawn(tick, {
          x: player.x,
          z: player.z,
          dirX: d.x,
          dirZ: d.z,
          speed: def.speed,
          range: def.range,
          radius: BOLT_RADIUS,
          power: def.power,
          skill: def.id,
          heal: def.archetype === 'heal',
          sourceId: player.id,
        });
      }
      cast.dx = r2(dir.x);
      cast.dz = r2(dir.z);
    } else if (def.shape === 'direct') {
      const { targets, overrideMode } = selectDirect({
        caster: player,
        party: party(),
        range: def.range,
        count: def.count,
        override,
        isIframed,
      });
      for (const t of targets) combat.applyHeal(t, def.power, { healer: player.id, source: def.id });
      cast.targets = targets.map((t) => t.id);
      cast.override = overrideMode;
    } else if (def.shape === 'nova') {
      const targets = selectNova({
        caster: player,
        party: party(),
        radius: def.area,
        count: def.count,
        isIframed,
      });
      for (const t of targets) combat.applyHeal(t, def.power, { healer: player.id, source: def.id });
      cast.targets = targets.map((t) => t.id);
    } else if (def.shape === 'melee_arc') {
      const dir = aimDir();
      const targets = selectArc({
        caster: player,
        party: party(),
        aimX: dir.x,
        aimZ: dir.z,
        reach: def.range,
        halfAngleDeg: def.area,
        count: def.count,
        isIframed,
      });
      for (const t of targets) combat.applyHeal(t, def.power, { healer: player.id, source: def.id });
      cast.targets = targets.map((t) => t.id);
      cast.dx = r2(dir.x);
      cast.dz = r2(dir.z);
    } else if (def.shape === 'ground_aoe') {
      const pos = clampPlacement(player, player.aim, def.range);
      const zone = registry.spawn({
        kind: 'zone',
        skill: def.id,
        x: pos.x,
        z: pos.z,
        px: pos.x,
        pz: pos.z,
        radius: def.area,
        power: def.power,
        sourceId: player.id,
        ticksDone: 0,
        totalTicks: Math.round(secTicks(def.durationSec) / ZONE_CADENCE_TICKS), // 4 s / 1 s = 4
        nextTickTick: tick + ZONE_CADENCE_TICKS, // first tick 1.0 s after placement (§6)
      });
      events.emit(tick, 'zone_spawn', {
        id: zone.id,
        skill: def.id,
        x: r2(pos.x),
        z: r2(pos.z),
        radius: def.area,
      });
      cast.zone = zone.id;
      cast.x = r2(pos.x);
      cast.z = r2(pos.z);
    }
    events.emit(tick, 'skill_cast', cast);
  }

  // ----------------------------------------------------- continuous phase --
  function step(tick) {
    bolts.step(tick);
  }

  // --- §4 ④: persistent-zone scheduled ticks, ascending zone spawn ordinal
  // (registry iteration order), then the aura's own cadence. Each tick creates
  // normal instances: own crit roll, i-frame / Downed suppression (§6).
  // Occupants resolve near→far from the zone center, ties ascending id (§4 ①).
  function zonePhase() {
    const tick = getTick();
    for (const z of registry.all()) {
      if (z.kind !== 'zone' || tick < z.nextTickTick) continue;
      z.ticksDone += 1;
      z.nextTickTick += ZONE_CADENCE_TICKS;
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
        const r = combat.applyHeal(m, z.power, { healer: z.sourceId, source: z.skill });
        if (r) healed.push(m.id);
      }
      events.emit(tick, 'zone_tick', { id: z.id, skill: z.skill, n: z.ticksDone, healed });
      if (z.ticksDone >= z.totalTicks) {
        events.emit(tick, 'zone_expire', { id: z.id, skill: z.skill });
        registry.despawn(z.id);
      }
    }

    if (aura.on && tick >= aura.nextPulseTick) {
      aura.nextPulseTick += AURA_CADENCE_TICKS;
      const def = resolve(SKILLS.warding_aura); // §15.4 hook (Sharpen/Ascend live on the aura)
      const inField = party().filter(
        (m) =>
          m.id !== player.id && // "heals allies inside" — the field's own caster is not her own ally
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
        const r = combat.applyHeal(m, def.power, { healer: player.id, source: def.id });
        if (r) healed.push(m.id);
      }
      events.emit(tick, 'aura_pulse', { healed });
    }
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
    return {
      slots: slots.map((s) =>
        s ? { id: s.id, remaining: Math.max(0, s.readyTick - tick) } : null
      ),
      override,
    };
  }

  function restore(data) {
    if (!data || !Array.isArray(data.slots)) return false;
    const tick = getTick();
    for (let i = 0; i < 4; i++) {
      const d = data.slots[i];
      slots[i] = d ? { id: d.id, readyTick: tick + (d.remaining ?? 0) } : null;
      player.skills[i] = d ? d.id : null;
      if (d && SKILLS[d.id]?.shape === 'aura') {
        aura.on = true;
        aura.nextPulseTick = tick + AURA_CADENCE_TICKS;
      }
    }
    aura.on = slots.some((s) => s && SKILLS[s.id].shape === 'aura');
    override = data.override ?? null;
    events.emit(tick, 'skills_restored', { slots: data.slots.map((d) => (d ? d.id : null)) });
    events.emit(tick, 'heal_override', { index: override }); // keep HUD/reticle in sync
    return true;
  }

  return {
    giveSkill,
    tryFire,
    step,
    zonePhase,
    toggleOverride,
    clearOverride,
    getOverride: () => override,
    slotsView,
    serialize,
    restore,
  };
}
