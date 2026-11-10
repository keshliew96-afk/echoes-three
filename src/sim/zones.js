// The one lasting-zone system (AUDIT D2): every `ground_aoe` zone on the
// floor, whoever cast it, is a registry body of kind `zone` and ticks here.
// The Healer's kit (sim/skills.js) and the ally kits (sim/allycast.js,
// sim/allies.js) only spawn zones; an ally's zone carries its `classId`
// (the Healer's carries none), and its spawn, tick and expire events carry
// the same `classId` so a listener can tell the kits apart.
//
// §4 ④: zones tick in ascending spawn ordinal (registry order), on the 1.0 s
// cadence, first tick 1.0 s after placement (§6). Each tick creates normal
// instances: own crit roll, i-frame / Downed suppression.
//
// The kits keep their own hit rules, as before the merge:
// - a Healer zone heals the living seats inside (near to far, ties by id),
//   or, a damage zone (Rootsnare), hits every damageable body whose reach
//   touches it, then refreshes its status on the hostile survivors;
// - an ally zone hits the live hostiles whose centre is inside it (near to
//   far, its `count` nearest if it has one), pulls them in if it drags, and
//   resolves through the ally cast pipeline when it carries mods or a status;
// - a puddle (Tidecaller Dive and Deluge) soaks hostiles until it dries.
//
// Sim discipline: no DOM, no render imports, no wall clock.

import { TICK_HZ } from '../core/constants.js';
import { CLASS_TECH } from '../data/classes.js';
import { isHealable, selectAreaDamage } from './shapes.js';

export const ZONE_CADENCE_TICKS = Math.round(1.0 * TICK_HZ); // §6: 1.0 s, first tick at 1.0 s

const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;
function sortNearFar(list, x, z) {
  return list.sort((p, q) => {
    const dp = dist2(p.x, p.z, x, z);
    const dq = dist2(q.x, q.z, x, z);
    return dp !== dq ? dp - dq : p.id - q.id;
  });
}

// `allyHit(z, t, opts)` is the ally cast pipeline's zone instance (allycast
// zoneHit), attached once the ally block exists.
export function createZoneSystem({ registry, events, combat, getTick, isIframed }) {
  let allyHit = null;
  const ev = (z, o) => (z.classId ? { ...o, classId: z.classId } : o);
  const hostiles = () => registry.all().filter((e) => e.faction === 'hostile' && e.hittable && e.hp > 0);
  const status = (t, st, tick, src) => (combat.status && t && t.hp > 0 ? combat.status.apply(t, st.kind, st.mag, st.ticks, tick, src) : null);

  function expire(tick, z, extra) {
    events.emit(tick, 'zone_expire', ev(z, { id: z.id, skill: z.skill, ...extra }));
    registry.despawn(z.id);
  }

  function puddleTick(z, tick) {
    // A Deluge puddle checks every `every` ticks (the Dive puddle every tick).
    if (combat.status && !(z.every > 1 && (tick - z.nextTickTick) % z.every !== 0)) {
      for (const e of hostiles()) {
        if (dist2(e.x, e.z, z.x, z.z) <= z.radius * z.radius) combat.status.apply(e, 'soaked', CLASS_TECH.soakMag, CLASS_TECH.soakTicks, tick, z.sourceId);
      }
    }
    if (tick >= z.untilTick) expire(tick, z);
  }

  function healTick(z, tick) {
    const occupants = registry
      .all()
      .filter(isHealable)
      .filter((m) => m.hp > 0 && !isIframed(m) && dist2(m.x, m.z, z.x, z.z) <= z.radius * z.radius);
    sortNearFar(occupants, z.x, z.z);
    const healed = [];
    for (const m of occupants) {
      const r = combat.applyHeal(m, z.power, { healer: z.sourceId, source: z.skill, critBonus: z.critBonus ?? 0 });
      if (r) healed.push(m.id);
      if (z.applies) status(m, z.applies, tick, z.sourceId);
    }
    events.emit(tick, 'zone_tick', { id: z.id, skill: z.skill, n: z.ticksDone, healed });
  }

  function damageTick(z, tick) {
    let victims;
    if (z.classId) {
      victims = sortNearFar(hostiles().filter((e) => dist2(e.x, e.z, z.x, z.z) <= z.radius * z.radius), z.x, z.z);
      // THE TIDECALLER: the Maelstrom's burst hits its nearest `count`.
      if (z.count > 0) victims = victims.slice(0, z.count);
    } else victims = selectAreaDamage({ entities: registry.all(), x: z.x, z: z.z, radius: z.radius, isIframed });
    const hit = [];
    for (const t of victims) {
      const len = Math.hypot(t.x - z.x, t.z - z.z);
      // (an ally zone divides by 1 for a body on its centre, a Healer zone
      // gives it no direction; both give a centred body none)
      const tl = z.classId ? len || 1 : len;
      const opts = {
        delivery: 'skill',
        shape: 'ground_aoe',
        dirX: z.classId || len > 1e-6 ? (t.x - z.x) / tl : 0,
        dirZ: z.classId || len > 1e-6 ? (t.z - z.z) / tl : 0,
        attacker: z.sourceId,
        source: z.skill,
      };
      if (!z.classId) {
        opts.critBonus = z.critBonus ?? 0;
        if (combat.applyDamage(t, z.power, opts)) hit.push(t.id);
        if (z.applies && t.faction === 'hostile') status(t, z.applies, tick, z.sourceId);
        continue;
      }
      // THE TIDECALLER: Undertow drags its occupants toward the centre (a
      // pull no farther than the centre itself; never a boss).
      if (z.drag) opts.kbDist = t.boss === true || t.kind === 'stag' ? 0 : -Math.min(z.drag, len);
      // PARTY: a built ally's zone (mods / a status) resolves through the
      // cast pipeline; a plain zone keeps this path.
      const r = (z.mods || z.applies || z.crash) && allyHit ? allyHit(z, t, opts) : combat.applyDamage(t, z.power, opts);
      if (r && !r.immune) hit.push(t.id);
    }
    const out = { id: z.id, skill: z.skill, n: z.ticksDone, hit };
    if (!z.classId) out.damage = true;
    events.emit(tick, 'zone_tick', ev(z, out));
  }

  function phase() {
    const tick = getTick();
    for (const z of registry.all()) {
      if (z.kind !== 'zone' || tick < z.nextTickTick) continue;
      if (z.puddle) {
        puddleTick(z, tick);
        continue;
      }
      z.ticksDone += 1;
      z.nextTickTick += ZONE_CADENCE_TICKS;
      if (z.damage || z.classId) damageTick(z, tick);
      else healTick(z, tick);
      if (z.ticksDone >= z.totalTicks) expire(tick, z);
    }
  }

  // §13 step 2: at a room boundary every zone on the floor ends with `cause`
  // (the run's sweep and the ally block's boundary both call this).
  function sweep(tick, cause, pick = () => true) {
    for (const z of registry.all()) if (z.kind === 'zone' && pick(z)) expire(tick, z, { cause });
  }

  return {
    phase,
    sweep,
    expire,
    setAllyHit: (fn) => {
      allyHit = fn;
    },
  };
}
