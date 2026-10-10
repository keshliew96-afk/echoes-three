// Vine Lasher (content plan 3 slice 3 — Hollow Wood) — the puller. A
// bramble pod on a knot of roots (30 HP) that drags itself along at
// 0.8 u/s, keeping 2.2-4.6 u from its target. When its target is within
// 5 u it coils its long whip-vine back and marks an Ember lane (0.7 u wide,
// up to 5.4 u, clipped at the walls) for 48 ticks; then it LASHES: every
// hero in the lane takes 9 and is YANKED 1.8 u toward the pod over 12 ticks
// (never closer than 0.9 u to it). The pull is the danger: it drags a hero
// off a safe spot into thorn patches, puffcaps or the next wave. Cooldown
// 220 ticks from the lash. Governor-gated.
//
// The yank moves party bodies directly (they take no knockback): the list
// of pulled ids and the per-tick step live on the lasher, so saves and
// snapshots carry a pull in flight.
import { r2, unit } from './common.js';
import { inLane } from './lancer.js';

const S = Object.freeze({
  hp: 30,
  moveSpeed: 0.8,
  radius: 0.36,
  damage: 9,
  attackCdTicks: 220,
  keepMin: 2.2,
  keepMax: 4.6,
  engageRange: 5.0,
  laneLength: 5.4,
  laneWidth: 0.7,
  telegraphTicks: 48,
  yankDist: 1.8,
  yankTicks: 12,
  yankStop: 0.9, // a pulled body stops this far from the pod
  firstAttackDelay: 110,
});

function clipLength(ctx, x, z, dx, dz, len) {
  const { mx, mz } = ctx.movement.innerBounds(0.1);
  let t = len;
  if (dx > 1e-6) t = Math.min(t, (mx - x) / dx);
  if (dx < -1e-6) t = Math.min(t, (-mx - x) / dx);
  if (dz > 1e-6) t = Math.min(t, (mz - z) / dz);
  if (dz < -1e-6) t = Math.min(t, (-mz - z) / dz);
  return Math.max(1, t);
}

export default {
  id: 'lasher',
  threat: 1.4,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'creep'; // creep | coil
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.lashTick = -1; // render: the lash clip
    e.yank = null; // { ids, ticksLeft } while a pull is in flight
  },

  continuous(ctx, e, tick) {
    // A pull in flight: each pulled body steps toward the pod.
    if (e.yank) {
      const per = S.yankDist / S.yankTicks;
      for (const id of e.yank.ids) {
        const p = ctx.registry.byId(id);
        if (!p || !(p.hp > 0)) continue;
        const d = unit(e.x - p.x, e.z - p.z);
        const room = d.l - (S.yankStop + (p.radius ?? 0) + e.radius);
        if (room <= 0) continue;
        const s = Math.min(per, room);
        ctx.movement.walkStep(p, d.x * s, d.z * s, p.radius ?? 0.3);
      }
      e.yank.ticksLeft -= 1;
      if (e.yank.ticksLeft <= 0) e.yank = null;
    }
    if (e.telegraph) {
      e.mode = 'coil';
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    e.mode = 'creep';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = inLane(ctx.registry, t);
      const party = victims.filter((v) => v.faction === 'party');
      e.lashTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'lasher_lash', { id: e.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length), width: t.width, victims: party.length });
      // Knock props away down the lane; heroes are yanked back (below).
      for (const v of victims) ctx.strike(e, [v], ctx.dmg(e, S.damage), v.x - t.dirX, v.z - t.dirZ, { delivery: 'skill', shape: 'lane' });
      const pulled = party.filter((v) => v.hp > 0 && v.kind !== 'waystone' && v.kind !== 'pilgrim').map((v) => v.id);
      if (pulled.length) {
        e.yank = { ids: pulled, ticksLeft: S.yankTicks };
        ctx.events.emit(tick, 'lasher_yank', { id: e.id, x: r2(e.x), z: r2(e.z), ids: pulled });
      }
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    const length = clipLength(ctx, e.x, e.z, d.x, d.z, S.laneLength);
    e.mode = 'coil';
    ctx.startTelegraph(e, tick, {
      kind: 'lane',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      fromX: e.x,
      fromZ: e.z,
      x: e.x + d.x * length,
      z: e.z + d.z * length,
      dirX: d.x,
      dirZ: d.z,
      length,
      width: S.laneWidth,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode, yanking: !!e.yank };
  },
};
