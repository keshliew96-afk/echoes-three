// Barrow Ram (BUILD_BRIEF §23.5) — the heavy. 90 HP, 1.1 u/s, and it TURNS at
// 90°/s: it walks where its horns point, so the party beats it by flanking.
// HORN GUARD: party projectiles arriving within ±55° of its facing are blocked
// (0 damage, `hit_blocked`) — arcs, novas, zones and direct heals are not. The
// guard is plain data on the entity, rewritten every tick from its facing, and
// checked at the one damage choke point (combat.applyDamage, M4a — PLAN §3.6
// (c)). HORN SLAM: cone 1.8 u / half-angle 50°, 60-tick Ember cone telegraph,
// 18 damage; cooldown 270 ticks. Knockback it takes is ×0.3 (`kbScale`, applied
// by the enemy system the tick after an impulse is armed).
import { unit, angleTo } from './common.js';

const S = Object.freeze({
  hp: 90,
  moveSpeed: 1.1, // u/s
  radius: 0.55,
  damage: 18,
  attackCdTicks: 270,
  turnRateDegPerSec: 90,
  walkArcDeg: 55, // only walks while the target is within this of its horns (scaffold)
  guardHalfArcDeg: 55,
  slamRadius: 1.8,
  slamHalfAngleDeg: 50,
  kbScale: 0.3,
  firstAttackDelay: 40,
});

const DEG = Math.PI / 180;

export default {
  id: 'ram',
  threat: 3.0,
  stats: S,
  telegraph: Object.freeze({ kind: 'cone', ticks: 60 }),

  spawn(ctx, e, tick) {
    e.kbScale = S.kbScale;
    e.mode = 'advance';
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.guard = { active: true, dirX: e.faceX, dirZ: e.faceZ, halfArcDeg: S.guardHalfArcDeg, shapes: ['projectile'] };
  },

  continuous(ctx, e, tick) {
    const g = e.guard;
    if (e.kbTicks > 0) {
      g.dirX = e.faceX;
      g.dirZ = e.faceZ;
      return;
    }
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!e.telegraph && target) {
      const want = Math.atan2(target.x - e.x, target.z - e.z);
      const have = Math.atan2(e.faceX, e.faceZ);
      const maxTurn = (S.turnRateDegPerSec * DEG * ctx.speedMul(e, tick)) / ctx.TICK_HZ;
      const d = angleTo(have, want);
      const next = have + Math.max(-maxTurn, Math.min(maxTurn, d));
      e.faceX = Math.sin(next);
      e.faceZ = Math.cos(next);
      const dist = Math.hypot(target.x - e.x, target.z - e.z);
      const stop = S.slamRadius * 0.6 + (target.radius ?? 0);
      if (Math.abs(angleTo(next, want)) <= S.walkArcDeg * DEG && dist > stop) {
        const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), dist - stop);
        ctx.movement.walkStep(e, e.faceX * step, e.faceZ * step, e.radius);
      }
    }
    g.active = e.state === 'active';
    g.dirX = e.faceX;
    g.dirZ = e.faceZ;
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick >= e.telegraph.resolveTick) {
        const t = e.telegraph;
        const cosHalf = Math.cos(t.halfAngleDeg * DEG);
        const victims = [];
        for (const p of ctx.registry.all()) {
          if (p.faction !== 'party' || !(p.hp > 0)) continue;
          const v = unit(p.x - t.x, p.z - t.z);
          if (v.l > t.radius + (p.radius ?? 0)) continue;
          if (v.l > 1e-6 && v.x * t.dirX + v.z * t.dirZ < cosHalf) continue;
          victims.push(p);
        }
        ctx.endTelegraph(e, tick);
        ctx.events.emit(tick, 'enemy_slam', {
          id: e.id,
          etype: e.kind,
          x: Math.round(t.x * 100) / 100,
          z: Math.round(t.z * 100) / 100,
          dx: Math.round(t.dirX * 100) / 100,
          dz: Math.round(t.dirZ * 100) / 100,
          victims: victims.length,
        });
        ctx.strike(e, victims, ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
      }
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const v = unit(target.x - e.x, target.z - e.z);
    if (v.l > S.slamRadius + (target.radius ?? 0) - 0.1) return;
    if (v.l > 1e-6 && v.x * e.faceX + v.z * e.faceZ < Math.cos(S.slamHalfAngleDeg * DEG)) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    ctx.startTelegraph(e, tick, {
      kind: 'cone',
      startTick: tick,
      resolveTick: tick + this.telegraph.ticks,
      x: e.x,
      z: e.z,
      dirX: e.faceX,
      dirZ: e.faceZ,
      radius: S.slamRadius,
      halfAngleDeg: S.slamHalfAngleDeg,
      playerTargeted,
      targetId: target.id,
    });
    e.nextAttackTick = tick + this.telegraph.ticks + S.attackCdTicks;
  },

  view(e) {
    return { mode: e.mode, guard: e.guard ? { ...e.guard, shapes: [...e.guard.shapes] } : null };
  },
};
