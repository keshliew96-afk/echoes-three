// Vein Siphon (content plan 3 slice 4, docs/NEW_ENEMIES_BARROW_HEART.md —
// The Hollow Heart) — the drinker. A floating violet sac trailing vein
// tendrils, 20 HP, a flier. It keeps 2.8-4.4 u from its target and casts a
// TENDRIL down an Ember lane (0.7 u wide, through the target and 1 u past
// it, up to 5.4 u, 54 ticks, aim locked). The first party body in the lane
// when it lands takes 5 and is LATCHED: a vein tether joins them for up to
// 3 s, and every 30 ticks it drinks 2 from that hero and heals itself by as
// much. The tether is the counterplay as much as the lane: it SNAPS when the
// pair are more than 5.6 u apart (the siphon anchors to drink and does not
// follow), when the siphon is stunned, or when the hero falls. So: sidestep
// the lane, or walk away from the drink, or kill the sac. Governor-gated
// like every player-targeted telegraph; cooldown 300 ticks from the cast's
// end. No RNG.
import { r2, unit } from './common.js';
import { inLane } from './lancer.js';

const S = Object.freeze({
  hp: 20,
  moveSpeed: 1.9,
  radius: 0.28,
  keepMin: 2.8,
  keepMax: 4.4,
  engageRange: 4.8,
  laneLength: 5.4,
  laneWidth: 0.7,
  lanePast: 1.0,
  telegraphTicks: 54,
  latchDamage: 5,
  drainDamage: 2,
  drainEvery: 30,
  drainTicks: 180,
  breakRange: 5.6,
  attackCdTicks: 300,
  firstAttackDelay: 100,
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

function unlatch(ctx, e, tick, cause) {
  if (e.latchId == null) return;
  ctx.events.emit(tick, 'siphon_unlatch', { id: e.id, target: e.latchId, cause, drank: r2(e.drank ?? 0) });
  e.latchId = null;
  e.mode = 'drift';
  e.nextAttackTick = tick + S.attackCdTicks;
}

export default {
  id: 'siphon',
  threat: 1.5,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'drift'; // drift | cast | drink
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.latchId = null;
    e.latchUntil = 0;
    e.nextDrainTick = 0;
    e.drank = 0;
    e.castTick = -1; // render: the tendril lash
  },

  continuous(ctx, e, tick) {
    if (e.latchId != null) {
      // Anchored to drink: it turns to its prey and holds still.
      const t = ctx.registry.byId(e.latchId);
      if (ctx.stunned(e, tick)) return unlatch(ctx, e, tick, 'stun');
      if (t) ctx.face(e, t.x - e.x, t.z - e.z);
      return;
    }
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    e.mode = 'drift';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.5 * side, d.x * step * 0.5 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.latchId != null) {
      const t = ctx.registry.byId(e.latchId);
      if (!t || !(t.hp > 0)) return unlatch(ctx, e, tick, 'fallen');
      if (Math.hypot(t.x - e.x, t.z - e.z) > S.breakRange) return unlatch(ctx, e, tick, 'stretched');
      if (tick >= e.latchUntil) return unlatch(ctx, e, tick, 'full');
      if (tick < e.nextDrainTick) return;
      e.nextDrainTick = tick + S.drainEvery;
      const before = t.hp;
      // A drink, not a blow: no knockback (it would walk the hero out).
      ctx.combat.applyDamage(t, ctx.dmg(e, S.drainDamage), { delivery: 'contact', shape: 'tether', attacker: e.id, source: e.kind, kbScale: 0 });
      const took = Math.max(0, before - (t.hp ?? 0));
      if (took > 0) {
        const was = e.hp;
        e.hp = Math.min(e.maxHp, e.hp + took);
        e.drank = (e.drank ?? 0) + took;
        ctx.events.emit(tick, 'siphon_drink', { id: e.id, target: t.id, amount: r2(took), healed: r2(e.hp - was), x: r2(t.x), z: r2(t.z) });
      }
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      e.castTick = tick;
      // The tendril takes the first party body along the lane.
      let prey = null;
      let best = Infinity;
      for (const v of inLane(ctx.registry, t)) {
        if (v.faction !== 'party') continue;
        const along = (v.x - t.fromX) * t.dirX + (v.z - t.fromZ) * t.dirZ;
        if (along < best) {
          best = along;
          prey = v;
        }
      }
      ctx.events.emit(tick, 'siphon_lash', { id: e.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length), width: t.width, target: prey ? prey.id : null });
      if (!prey) {
        e.mode = 'drift';
        e.nextAttackTick = tick + S.attackCdTicks;
        return;
      }
      ctx.strike(e, [prey], ctx.dmg(e, S.latchDamage), e.x, e.z, { delivery: 'skill', shape: 'lane' });
      if (!(prey.hp > 0)) {
        e.mode = 'drift';
        e.nextAttackTick = tick + S.attackCdTicks;
        return;
      }
      e.mode = 'drink';
      e.latchId = prey.id;
      e.latchUntil = tick + S.drainTicks;
      e.nextDrainTick = tick + S.drainEvery;
      e.drank = 0;
      ctx.events.emit(tick, 'siphon_latch', { id: e.id, target: prey.id, x: r2(prey.x), z: r2(prey.z), untilTick: e.latchUntil });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    const length = clipLength(ctx, e.x, e.z, d.x, d.z, Math.min(S.laneLength, d.l + S.lanePast));
    e.mode = 'cast';
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

  // A dead sac lets go at once.
  onDeath(ctx, e, tick) {
    unlatch(ctx, e, tick, 'siphon_died');
  },

  view(e) {
    return { mode: e.mode, latch: e.latchId };
  },
};
