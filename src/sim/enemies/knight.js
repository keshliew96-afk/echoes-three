// Bone Knight (docs/CONTENT_PLAN.md §3, slice 2 — Ashen Barrow) — the
// elite heavy. It ALWAYS spawns Elite (crown, ring and the §23.5 multipliers;
// `alwaysElite`), so one costs a wave a big slice of its budget. 70 HP before
// the Elite bump, 0.95 u/s, and a tower SHIELD in front: party projectiles
// AND melee arcs arriving within ±65° of its facing are blocked. It turns at
// 110°/s, so the party gets round it — but a hit that lands from behind makes
// it WHEEL (turn rate ×3 for 40 ticks). Its attack is the OVERHEAD SLAM, a
// slow, delayed blow: an Ember ring r 1.4 centred 1.1 u in front of it
// (66 ticks — the longest enemy wind-up) that lands for 12 (x the Elite
// bump). The shield comes down to swing, so the guard is OFF from the
// wind-up until 50 ticks after the slam. Cooldown 300 ticks. Knockback it
// takes is ×0.4.
import { r2, unit, angleTo, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 70,
  moveSpeed: 0.95,
  radius: 0.5,
  damage: 12,
  attackCdTicks: 300,
  turnRateDegPerSec: 110,
  wheelMul: 3,
  wheelTicks: 40,
  guardHalfArcDeg: 65,
  slamReach: 1.1, // ring centre ahead of the knight
  slamRadius: 1.4,
  slamRange: 2.2, // starts the slam when its target is this close
  telegraphTicks: 66,
  openTicks: 50,
  kbScale: 0.4,
  firstAttackDelay: 70,
});

const DEG = Math.PI / 180;

export default {
  id: 'knight',
  threat: 3.0, // x ELITE_COST on every draw (always Elite)
  alwaysElite: true,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.kbScale = S.kbScale;
    e.mode = 'march'; // march | slam
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.guardOpenUntil = 0;
    e.wheelUntil = 0;
    e.slamTick = -1;
    e.lastHp = e.hp;
    e.guard = { active: true, dirX: e.faceX, dirZ: e.faceZ, halfArcDeg: S.guardHalfArcDeg, shapes: ['projectile', 'melee_arc'] };
  },

  continuous(ctx, e, tick) {
    const g = e.guard;
    g.active = !e.telegraph && tick >= e.guardOpenUntil;
    if (!e.telegraph && e.mode === 'slam') e.mode = 'march'; // a stun cancelled the swing
    // A hit that got through (HP dropped while the guard was up = it came from
    // the side or behind): wheel round to face the threat.
    if (e.hp < e.lastHp && !e.telegraph && tick >= e.guardOpenUntil) e.wheelUntil = tick + S.wheelTicks;
    e.lastHp = e.hp;
    if (e.kbTicks > 0) {
      g.dirX = e.faceX;
      g.dirZ = e.faceZ;
      return;
    }
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (target && !e.telegraph) {
      const want = Math.atan2(target.x - e.x, target.z - e.z);
      const have = Math.atan2(e.faceX, e.faceZ);
      const rate = S.turnRateDegPerSec * (tick < e.wheelUntil ? S.wheelMul : 1);
      const maxTurn = (rate * DEG * ctx.speedMul(e, tick)) / ctx.TICK_HZ;
      const dA = angleTo(have, want);
      const next = have + Math.max(-maxTurn, Math.min(maxTurn, dA));
      e.faceX = Math.sin(next);
      e.faceZ = Math.cos(next);
      const d = unit(target.x - e.x, target.z - e.z);
      const stop = S.slamReach + (target.radius ?? 0);
      if (d.l > stop && Math.abs(dA) < 70 * DEG) {
        const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), d.l - stop);
        ctx.movement.walkStep(e, e.faceX * step, e.faceZ * step, e.radius);
      }
    }
    g.dirX = e.faceX;
    g.dirZ = e.faceZ;
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
      e.mode = 'march';
      e.slamTick = tick;
      e.guardOpenUntil = tick + S.openTicks;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'knight_slam', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims.concat(props), ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.slamRange + (target.radius ?? 0)) return;
    // Only swings at what is in front of it.
    if ((d.x * e.faceX + d.z * e.faceZ) < Math.cos(50 * DEG)) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'slam';
    const reach = S.slamReach * (e.scale ?? 1);
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x + e.faceX * reach,
      z: e.z + e.faceZ * reach,
      dirX: e.faceX,
      dirZ: e.faceZ,
      radius: S.slamRadius,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode, guard: !!(e.guard && e.guard.active) };
  },
};
