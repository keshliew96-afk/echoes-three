// Weir Crab (docs/CONTENT_PLAN.md §3, slice 2 — Sunken Mill) — the mobile
// shield. A low, wide crab (40 HP) that closes on its target SIDEWAYS: it
// scuttles across the target's line at 1.9 u/s while edging in at 0.6 u/s,
// and its raised CLAW GUARD blocks party projectiles arriving within ±60° of
// its facing (the Barrow Ram's guard, but on a small body that turns at
// 300°/s, so circling it does not work — a melee hit, an arc or a nova does).
// Within 1.3 u it SNAPS: an Ember cone (r 1.4 u, half-angle 55°, 42 ticks)
// that lands for 10 damage. The claws come down for the snap, so the guard is
// OFF from the wind-up until 45 ticks after it — the archers' window.
// Cooldown 180 ticks.
import { r2, unit, angleTo } from './common.js';

const S = Object.freeze({
  hp: 40,
  moveSpeed: 1.9, // sideways
  closeSpeed: 0.6,
  radius: 0.4,
  damage: 10,
  attackCdTicks: 180,
  turnRateDegPerSec: 300,
  guardHalfArcDeg: 60,
  snapRange: 1.3,
  coneRadius: 1.4,
  coneHalfAngleDeg: 55,
  telegraphTicks: 42,
  openTicks: 45, // guard stays down after the snap
  flipEvery: 75, // ticks between sidestep direction flips
  firstAttackDelay: 50,
});

const DEG = Math.PI / 180;

export default {
  id: 'crab',
  threat: 1.8,
  stats: S,
  telegraph: Object.freeze({ kind: 'cone', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'scuttle';
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.guardOpenUntil = 0;
    e.snapTick = -1;
    e.guard = { active: true, dirX: e.faceX, dirZ: e.faceZ, halfArcDeg: S.guardHalfArcDeg, shapes: ['projectile'] };
  },

  continuous(ctx, e, tick) {
    const g = e.guard;
    g.active = !e.telegraph && tick >= e.guardOpenUntil;
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
      const maxTurn = (S.turnRateDegPerSec * DEG * ctx.speedMul(e, tick)) / ctx.TICK_HZ;
      const next = have + Math.max(-maxTurn, Math.min(maxTurn, angleTo(have, want)));
      e.faceX = Math.sin(next);
      e.faceZ = Math.cos(next);
      const d = unit(target.x - e.x, target.z - e.z);
      const stop = S.snapRange * 0.75 + (target.radius ?? 0);
      const side = (e.id + Math.floor(tick / S.flipEvery)) % 2 === 0 ? 1 : -1;
      const sk = ctx.stepLen(e, S.moveSpeed, tick);
      const ck = d.l > stop ? Math.min(ctx.stepLen(e, S.closeSpeed, tick), d.l - stop) : 0;
      ctx.movement.walkStep(e, -d.z * sk * side + d.x * ck, d.x * sk * side + d.z * ck, e.radius);
    }
    g.dirX = e.faceX;
    g.dirZ = e.faceZ;
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const cosHalf = Math.cos(t.halfAngleDeg * DEG);
      const victims = [];
      for (const p of ctx.registry.all()) {
        if (p.faction !== 'party' || !(p.hp > 0)) continue;
        const dx = p.x - t.x;
        const dz = p.z - t.z;
        const l = Math.hypot(dx, dz);
        if (l > t.radius + (p.radius ?? 0)) continue;
        if (l > (p.radius ?? 0) + 0.15 && (dx * t.dirX + dz * t.dirZ) / l < cosHalf) continue;
        victims.push(p);
      }
      e.snapTick = tick;
      e.guardOpenUntil = tick + S.openTicks;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'crab_snap', { id: e.id, x: r2(e.x), z: r2(e.z), victims: victims.length });
      ctx.strike(e, victims, ctx.dmg(e, S.damage), e.x, e.z);
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.snapRange + (target.radius ?? 0) || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    ctx.face(e, d.x, d.z);
    ctx.startTelegraph(e, tick, {
      kind: 'cone',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x,
      z: e.z,
      dirX: d.x,
      dirZ: d.z,
      radius: S.coneRadius,
      length: S.coneRadius,
      halfAngleDeg: S.coneHalfAngleDeg,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode, guard: !!(e.guard && e.guard.active) };
  },
};
