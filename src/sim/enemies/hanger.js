// Rope Hanger (docs/ACT_V.md — The Still Spire) — the battering ram. A
// lanky bell-ringer's corpse still tangled in its belfry rope (30 HP). It
// creeps along keeping 3.0-6.0 u from its target, then grips the rope, leans
// back and marks a SWING: an Ember lane 1.1 u wide from itself through the
// target, up to 8.5 u long (clipped at the walls), for 66 ticks. It swings
// down the lane at 10 u/s on the rope, over barricades and hazards (a flier
// while it swings), and every hero it passes is struck once for 8 and thrown
// 2 u to the side, out of the lane. At the far end it dangles for 45 ticks,
// slack and turning, before it lets go and creeps again. Cooldown 280 ticks
// from the landing. Governor-gated like every player-targeted telegraph.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 30,
  moveSpeed: 1.25,
  radius: 0.34,
  damage: 8,
  attackCdTicks: 280,
  keepMin: 3.0,
  keepMax: 6.0,
  engageRange: 6.0,
  laneLength: 8.5,
  laneWidth: 1.1,
  telegraphTicks: 66,
  swingSpeed: 10.0, // u/s
  throwDist: 2.0, // sideways shove on a hit (heroes ignore knockback)
  throwTicks: 10,
  dangleTicks: 45,
  firstAttackDelay: 140,
});

function clipLength(ctx, e, dx, dz, len) {
  const { mx, mz } = ctx.movement.innerBounds(e.radius);
  let t = len;
  if (dx > 1e-6) t = Math.min(t, (mx - e.x) / dx);
  if (dx < -1e-6) t = Math.min(t, (-mx - e.x) / dx);
  if (dz > 1e-6) t = Math.min(t, (mz - e.z) / dz);
  if (dz < -1e-6) t = Math.min(t, (-mz - e.z) / dz);
  return Math.max(0, t);
}

export default {
  id: 'hanger',
  threat: 1.8,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'creep'; // creep | grip | swing | dangle
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.swingVx = 0;
    e.swingVz = 0;
    e.swingTicksLeft = 0;
    e.swingHits = [];
    e.dangleUntil = 0;
    e.swingTick = -1; // render: the swing clip
    e.shove = null; // { pushes: [[id, dx, dz]], ticksLeft } while a thrown hero flies
  },

  continuous(ctx, e, tick) {
    const { movement } = ctx;
    // Heroes it struck are thrown clear of the rope over a few ticks (the
    // combat pipeline never knocks the party back, so the throw is its own).
    if (e.shove) {
      const per = S.throwDist / S.throwTicks;
      for (const [id, dx, dz] of e.shove.pushes) {
        const p = ctx.registry.byId(id);
        if (p && p.hp > 0) movement.walkStep(p, dx * per, dz * per, p.radius ?? 0.3);
      }
      e.shove.ticksLeft -= 1;
      if (e.shove.ticksLeft <= 0) e.shove = null;
    }
    if (e.mode === 'swing') {
      movement.walkStep(e, e.swingVx, e.swingVz, e.radius);
      e.swingTicksLeft -= 1;
      return;
    }
    if (e.mode === 'dangle') return;
    if (e.telegraph) {
      e.mode = 'grip';
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
    if (d.l > S.keepMax) movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      const side = e.id % 2 === 0 ? 1 : -1;
      movement.walkStep(e, -d.z * step * 0.4 * side, d.x * step * 0.4 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'swing') {
      const reach = S.laneWidth / 2;
      const len = Math.hypot(e.swingVx, e.swingVz) || 1;
      const nx = -e.swingVz / len;
      const nz = e.swingVx / len;
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || e.swingHits.includes(t.id)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) > reach + (t.radius ?? 0)) continue;
        e.swingHits.push(t.id);
        // Thrown to whichever side of the rope it stood on.
        const side = (t.x - e.x) * nx + (t.z - e.z) * nz >= 0 ? 1 : -1;
        ctx.strike(e, [t], ctx.dmg(e, S.damage), e.x - nx * side, e.z - nz * side, { delivery: 'skill', shape: 'lane' });
        if (t.hp > 0 && t.partyIndex !== undefined) {
          if (!e.shove) e.shove = { pushes: [], ticksLeft: S.throwTicks };
          e.shove.pushes.push([t.id, nx * side, nz * side]);
          e.shove.ticksLeft = S.throwTicks;
        }
      }
      if (e.swingTicksLeft <= 0) {
        e.mode = 'dangle';
        e.flier = false;
        e.dangleUntil = tick + S.dangleTicks;
        ctx.events.emit(tick, 'hanger_land', { id: e.id, x: r2(e.x), z: r2(e.z), hits: e.swingHits.length, untilTick: e.dangleUntil });
      }
      return;
    }
    if (e.mode === 'dangle') {
      if (tick < e.dangleUntil) return;
      e.mode = 'creep';
      e.nextAttackTick = tick + S.attackCdTicks;
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      const perTick = S.swingSpeed / ctx.TICK_HZ;
      e.swingVx = t.dirX * perTick;
      e.swingVz = t.dirZ * perTick;
      e.swingTicksLeft = Math.max(1, Math.ceil(t.length / perTick));
      e.swingHits = [];
      e.mode = 'swing';
      e.flier = true; // on the rope: over barricades and hazards
      e.swingTick = tick;
      ctx.endTelegraph(e, tick);
      ctx.events.emit(tick, 'hanger_swing', { id: e.id, x: r2(e.x), z: r2(e.z), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length) });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 1.0) return;
    const length = clipLength(ctx, e, d.x, d.z, S.laneLength);
    if (length < d.l + 0.5) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'grip';
    ctx.face(e, d.x, d.z);
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
      lance: true, // AI seats step sideways out of it (sim/allies.js laneGoal)
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
