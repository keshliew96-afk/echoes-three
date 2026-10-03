// Interactive environmental assets (docs/gauntlet/PLAN.md §3.6
// "Interactable", BUILD_BRIEF §23.7). Owner: M4b. Five types, all faction
// 'neutral', all plain entity data:
//   dewfont    E within 1.1 u: every living party member heals 25% max HP
//              (the §9 heal pipeline — crits allowed, full_heal events); once
//              per room ("E · Drink" -> "Dry")
//   barricade  destructible cover: box 1.4 × 0.45 u, 60 HP, lifecycle 'break';
//              blocks movement and every straight projectile (party bolts,
//              skill bolts, enemy shots — lobbed globs pass over); damaged by
//              projectiles and area damage. An entity-owned DYNAMIC collider
//              (sim/movement.js) that lives exactly as long as the entity
//   keg        1 HP, lifecycle 'break': any damage -> a 60-tick Ember fuse
//              (kind 'kegfuse') -> 30 dmg blast r 1.6 to ALL factions (the
//              pipeline's knockback throws enemies), chaining other kegs
//   sluice     E: the gate drops and its millrace lanes stop (current +
//              surges) for 720 ticks, then a 1200-tick cooldown
//   bell       E: stun every non-boss hostile within 3.0 u for 60 ticks; once
//              per room
//
// `interact` (KeyE press) resolves in the §4 discrete phase AFTER revive
// arbitration: a press next to a Downed ally (or during a revive channel) is a
// revive, never an interaction. Presses resolve ascending party index; a
// same-tick second use of a spent asset emits `interact_denied { reason:
// 'used' }`. Only the nearest asset in range (surface distance <= 1.1 u, ties
// by spawn ordinal) answers a press.
import { SCREENSHAKE } from '../core/constants.js';
import { setDynamicColliders } from './movement.js';
import * as statusMod from './status.js';

const r2 = (v) => Math.round(v * 100) / 100;

export const INTERACT_RADIUS = 1.1; // u, surface distance (PLAN §3.6)
export const INTERACT_TYPES = Object.freeze({
  dewfont: Object.freeze({ verb: 'Drink', spentLabel: 'Dry', radius: 0.5, healPct: 0.25, uses: 1 }),
  barricade: Object.freeze({ hp: 60, hx: 0.7, hz: 0.225 }),
  keg: Object.freeze({ hp: 1, radius: 0.3, fuseTicks: 60, damage: 30, blastRadius: 1.6 }),
  sluice: Object.freeze({ verb: 'Pull', spentLabel: 'Closed', radius: 0.4, stopTicks: 720, cooldownTicks: 1200 }),
  bell: Object.freeze({ verb: 'Ring', spentLabel: 'Rung', radius: 0.42, stunRadius: 3.0, stunTicks: 60, uses: 1 }),
});
// Revive adjacency (sim/allies.js REVIVE.range, §10).
const REVIVE_RANGE = 0.6;

// Every entity-owned blocker in the registry (barricades from here, rubble from
// hazards.js) installed as the movement module's dynamic colliders, ascending
// id. Called whenever a blocker spawns or breaks and once per tick.
export function refreshBlockers(registry) {
  const list = [];
  for (const e of registry.all()) {
    if (!e.collider) continue;
    if (e.collider.r !== undefined) list.push({ id: e.id, x: e.x, z: e.z, r: e.collider.r });
    else list.push({ id: e.id, x: e.x, z: e.z, hx: e.collider.hx, hz: e.collider.hz, yaw: e.collider.yaw ?? 0 });
  }
  return setDynamicColliders(list.length ? list : null);
}

export function createInteractableSystem({ registry, events, combat, getTick, player, hazards = null }) {
  let dormant = false;

  const isAsset = (e) => e.interactable === true;

  function spawnInteractable(itype, x = 0, z = 0, params = {}) {
    const T = INTERACT_TYPES[itype];
    if (!T) return null;
    const tick = getTick();
    const base = { kind: itype, itype, faction: 'neutral', x, z, px: x, pz: z, yaw: params.yaw ?? 0 };
    let e;
    if (itype === 'dewfont' || itype === 'bell' || itype === 'sluice') {
      e = registry.spawn({
        ...base,
        interactable: true,
        interactRadius: INTERACT_RADIUS,
        radius: T.radius,
        verb: T.verb,
        spentLabel: T.spentLabel,
        uses: T.uses ?? null, // null = unlimited (cooldown-gated)
        cooldownUntilTick: 0,
        activeUntilTick: 0,
        usedTick: -1,
        usedBy: null,
        ...(itype === 'sluice' ? { laneIds: Array.isArray(params.laneIds) ? [...params.laneIds] : [] } : {}),
      });
    } else if (itype === 'barricade') {
      e = registry.spawn({
        ...base,
        hittable: true,
        hp: T.hp,
        maxHp: T.hp,
        lifecycle: 'break',
        knockbackable: false,
        radius: Math.max(T.hx, T.hz), // area damage treats a blocker as a circle (PLAN §3.6 (g))
        collider: { hx: T.hx, hz: T.hz, yaw: params.yaw ?? 0 },
        blocksMovement: true,
        blocksProjectiles: true,
        skin: params.skin ?? 'timber',
      });
    } else if (itype === 'keg') {
      e = registry.spawn({
        ...base,
        hittable: true,
        hp: T.hp,
        maxHp: T.hp,
        lifecycle: 'break',
        knockbackable: false,
        radius: T.radius,
      });
    }
    if (!e) return null;
    events.emit(tick, 'interactable_spawn', { id: e.id, itype, x: r2(x), z: r2(z) });
    return e;
  }

  // Breaks (combat.kill with lifecycle 'break' emits `broken`): a keg's break
  // lights its fuse; a barricade's collider leaves with it.
  events.on('broken', (ev) => {
    if (ev.kind === 'keg') startFuse(ev.x, ev.z, ev.id, ev.tick);
    if (ev.kind === 'barricade') refreshBlockers(registry);
  });

  function startFuse(x, z, kegId, tick) {
    const T = INTERACT_TYPES.keg;
    const f = registry.spawn({
      kind: 'kegfuse',
      faction: 'neutral',
      x,
      z,
      px: x,
      pz: z,
      radius: T.radius,
      kegId,
      startTick: tick,
      blastTick: tick + T.fuseTicks,
      blastRadius: T.blastRadius,
    });
    events.emit(tick, 'keg_ignite', { id: f.id, keg: kegId, x: r2(x), z: r2(z), blastTick: f.blastTick, radius: T.blastRadius });
    return f;
  }

  function armKeg(id) {
    const k = registry.byId(id);
    if (!k || k.kind !== 'keg' || !(k.hp > 0)) return null;
    combat.kill(k, { delivery: 'debug' }); // the real break path -> `broken` -> fuse
    const f = registry.all().find((e) => e.kind === 'kegfuse' && e.kegId === id);
    return f ? { fuse: f.id, blastTick: f.blastTick } : null;
  }

  function blast(f, tick) {
    const T = INTERACT_TYPES.keg;
    const victims = [];
    for (const t of registry.all()) {
      if (!(t.hp > 0) || t.id === f.id) continue;
      const hittableNeutral = t.faction === 'neutral' && t.hittable;
      const body = t.faction === 'party' || (t.faction === 'hostile' && t.hittable !== false);
      if (!body && !hittableNeutral) continue;
      if (Math.hypot(t.x - f.x, t.z - f.z) <= f.blastRadius + (t.radius ?? 0)) victims.push(t);
    }
    registry.despawn(f.id);
    events.emit(tick, 'keg_blast', { id: f.id, keg: f.kegId, x: r2(f.x), z: r2(f.z), radius: f.blastRadius, victims: victims.length });
    events.emit(tick, 'screenshake', {
      cause: 'keg',
      amp: SCREENSHAKE.maxAmp,
      durationSec: SCREENSHAKE.durationSec,
      x: r2(f.x),
      z: r2(f.z),
    });
    for (const t of victims) {
      if (!registry.byId(t.id) || !(t.hp > 0)) continue;
      const dx = t.x - f.x;
      const dz = t.z - f.z;
      const l = Math.hypot(dx, dz);
      combat.applyDamage(t, T.damage, {
        delivery: 'skill', // an explosion throws enemies (§9 #3 skill impulse; party never knocked back)
        shape: 'keg',
        dirX: l > 1e-6 ? dx / l : 0,
        dirZ: l > 1e-6 ? dz / l : 1,
        attacker: f.id,
        source: 'keg',
      });
    }
  }

  // -------------------------------------------------------------- phases --
  function continuous() {
    const tick = getTick();
    for (const e of registry.all()) {
      if (e.itype === 'sluice' && e.activeUntilTick > 0 && tick >= e.activeUntilTick) {
        e.activeUntilTick = 0;
        events.emit(tick, 'sluice_toggle', { id: e.id, closed: false, lanes: [...e.laneIds], cooldownUntilTick: e.cooldownUntilTick });
      }
    }
    refreshBlockers(registry);
  }

  function discrete(snapshot) {
    const tick = getTick();
    // Keg fuses mature first, ascending spawn ordinal (a chain spawns new fuses
    // that burn their own full 60 ticks).
    for (const f of registry.all()) {
      if (f.kind === 'kegfuse' && registry.byId(f.id) && tick >= f.blastTick) blast(f, tick);
    }
    if (!snapshot || !Array.isArray(snapshot.presses)) return;
    const press = snapshot.presses.find((p) => p.kind === 'interact');
    if (press) resolvePresses([{ actor: player, press }], tick);
  }

  // presses: [{ actor, press }] — ascending party index (network seats extend
  // this list; single-player passes the player only).
  function resolvePresses(list, tick = getTick()) {
    const sorted = list.slice().sort((a, b) => (a.actor.partyIndex ?? 0) - (b.actor.partyIndex ?? 0));
    for (const { actor } of sorted) {
      if (!actor || !(actor.hp > 0)) continue;
      if (actor.reviveTargetId != null) continue; // a revive channel owns KeyE
      if (downedNear(actor)) continue; // §23.7: next to a Downed ally, E is a revive
      const target = nearestAsset(actor);
      if (!target) continue; // nothing in reach: a silent press
      use(target, actor, tick);
    }
  }

  function downedNear(actor) {
    for (const e of registry.all()) {
      if (e.partyIndex === undefined || e.id === actor.id || e.hp > 0) continue;
      if (Math.hypot(e.x - actor.x, e.z - actor.z) <= REVIVE_RANGE) return true;
    }
    return false;
  }

  function reachOf(e, actor) {
    return Math.hypot(e.x - actor.x, e.z - actor.z) - (e.radius ?? 0);
  }

  function nearestAsset(actor) {
    let best = null;
    let bestD = Infinity;
    for (const e of registry.all()) {
      if (!isAsset(e)) continue;
      const d = reachOf(e, actor);
      if (d <= e.interactRadius && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function availability(e, tick = getTick()) {
    if (dormant && e.itype !== 'dewfont') return 'dormant';
    if (e.uses !== null && e.uses <= 0) return 'used';
    if (tick < e.cooldownUntilTick) return 'cooldown';
    if (e.itype === 'sluice' && (!e.laneIds || e.laneIds.length === 0)) return 'no_lane';
    return null;
  }

  function use(e, actor, tick) {
    const why = availability(e, tick);
    if (why) {
      events.emit(tick, 'interact_denied', { id: e.id, itype: e.itype, by: actor.id, reason: why });
      return false;
    }
    if (e.uses !== null) e.uses -= 1;
    e.usedTick = tick;
    e.usedBy = actor.id;
    events.emit(tick, 'interact', { id: e.id, itype: e.itype, by: actor.id, x: r2(e.x), z: r2(e.z) });
    if (e.itype === 'dewfont') {
      const T = INTERACT_TYPES.dewfont;
      let healed = 0;
      for (const t of registry.all()) {
        if (t.partyIndex === undefined || !(t.hp > 0)) continue;
        if (combat.applyHeal(t, t.maxHp * T.healPct, { healer: actor.id, source: 'dewfont' })) healed += 1;
      }
      events.emit(tick, 'dewfont_drink', { id: e.id, by: actor.id, healed, x: r2(e.x), z: r2(e.z) });
    } else if (e.itype === 'bell') {
      const T = INTERACT_TYPES.bell;
      let stunned = 0;
      for (const t of registry.all()) {
        if (t.faction !== 'hostile' || !(t.hp > 0) || statusMod.isBoss?.(t) || t.kind === 'stag') continue;
        if (t.state !== undefined && t.state !== 'active') continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) > T.stunRadius + (t.radius ?? 0)) continue;
        if (statusMod.apply(t, 'stun', 1, T.stunTicks, tick, e.id)) stunned += 1;
      }
      events.emit(tick, 'bell_ring', { id: e.id, by: actor.id, x: r2(e.x), z: r2(e.z), radius: T.stunRadius, stunned });
    } else if (e.itype === 'sluice') {
      const T = INTERACT_TYPES.sluice;
      const stopped = [];
      for (const lid of e.laneIds) {
        if (hazards && hazards.stopMillrace(lid, T.stopTicks) !== null) stopped.push(lid);
      }
      e.activeUntilTick = tick + T.stopTicks;
      e.cooldownUntilTick = tick + T.stopTicks + T.cooldownTicks;
      events.emit(tick, 'sluice_toggle', {
        id: e.id,
        closed: true,
        by: actor.id,
        lanes: stopped,
        untilTick: e.activeUntilTick,
        cooldownUntilTick: e.cooldownUntilTick,
      });
    }
    return true;
  }

  function despawnAll(tick, cause) {
    for (const e of registry.all()) {
      if (isAsset(e) || e.kind === 'barricade' || e.kind === 'keg' || e.kind === 'kegfuse') {
        events.emit(tick, 'interactable_despawn', { id: e.id, itype: e.itype ?? e.kind, cause });
        registry.despawn(e.id);
      }
    }
  }

  // Render/UI prompt feed: the asset the player would use right now (or null),
  // with its availability — the `ix-` prompt reads this (plain data).
  function promptFor(actor = player) {
    if (!actor || !(actor.hp > 0)) return null;
    const e = nearestAsset(actor);
    if (!e) return null;
    const tick = getTick();
    const why = availability(e, tick);
    return {
      id: e.id,
      itype: e.itype,
      verb: e.verb,
      spentLabel: e.spentLabel,
      state: why ?? 'ready',
      reviveOwnsKey: actor.reviveTargetId != null || downedNear(actor),
      cooldownTicks: Math.max(0, e.cooldownUntilTick - tick),
      activeTicks: Math.max(0, (e.activeUntilTick ?? 0) - tick),
      x: e.x,
      z: e.z,
      reach: r2(reachOf(e, actor)),
    };
  }

  function view() {
    const tick = getTick();
    return registry
      .all()
      .filter((e) => isAsset(e) || e.kind === 'barricade' || e.kind === 'keg' || e.kind === 'kegfuse')
      .map((e) => ({
        id: e.id,
        itype: e.itype ?? e.kind,
        x: r2(e.x),
        z: r2(e.z),
        yaw: e.yaw ?? 0,
        ...(isAsset(e)
          ? {
              state: availability(e, tick) ?? 'ready',
              uses: e.uses,
              cooldownUntilTick: e.cooldownUntilTick,
              activeUntilTick: e.activeUntilTick,
              interactRadius: e.interactRadius,
              ...(e.laneIds ? { laneIds: [...e.laneIds] } : {}),
            }
          : {}),
        ...(e.kind === 'barricade' ? { hp: r2(e.hp), maxHp: e.maxHp, collider: { ...e.collider }, skin: e.skin } : {}),
        ...(e.kind === 'keg' ? { hp: e.hp } : {}),
        ...(e.kind === 'kegfuse' ? { blastTick: e.blastTick, keg: e.kegId } : {}),
      }));
  }

  return {
    spawnInteractable,
    despawnAll,
    continuous,
    discrete,
    resolvePresses,
    armKeg,
    promptFor,
    view,
    refreshBlockers: () => refreshBlockers(registry),
    setDormant(on) {
      dormant = !!on;
    },
    serialize: () => ({ dormant }),
    restore(data) {
      dormant = !!(data && data.dormant);
    },
  };
}
