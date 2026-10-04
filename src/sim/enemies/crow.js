// Barrow Crow (docs/CONTENT_PLAN.md §3.3 — Ashen Barrow) — a ground-hopping
// carrion bird and the second ranged archetype. It keeps 3.5–5.5 u from its
// target, then CAWS: an Ember cone (radius 5.0 u, half-angle 22°, 45 ticks)
// locked on the target, after which it looses a FAN of three feather-shots
// (-15°, 0°, +15°), 5 damage each at 5.0 u/s. Unlike the mantis's single shot,
// the fan punishes side-steps that are too small. Cooldown 240 ticks.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 14,
  moveSpeed: 2.0, // u/s
  radius: 0.3,
  damage: 5, // per feather
  attackCdTicks: 240,
  keepMin: 3.5,
  keepMax: 5.5,
  engageRange: 5.8,
  coneRadius: 5.0,
  coneHalfAngleDeg: 22,
  telegraphTicks: 45,
  spreadDeg: 15,
  shotSpeed: 5.0,
  shotRange: 7.5,
  firstAttackDelay: 60,
});

const DEG = Math.PI / 180;

export default {
  id: 'crow',
  threat: 1.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'cone', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'hop';
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.fireTick = -1; // render: the caw clip
  },

  continuous(ctx, e, tick) {
    if (e.kbTicks > 0) return;
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return; // planted while it caws
    }
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.4 * side, d.x * step * 0.4 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const { dirX, dirZ } = e.telegraph;
      ctx.endTelegraph(e, tick);
      const base = Math.atan2(dirZ, dirX);
      const shots = [];
      for (const k of [-1, 0, 1]) {
        const a = base + k * S.spreadDeg * DEG;
        const s = ctx.fireShot(e, tick, Math.cos(a), Math.sin(a), { speed: S.shotSpeed, range: S.shotRange, power: ctx.dmg(e, S.damage) });
        shots.push(s.id);
      }
      e.fireTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'crow_volley', { id: e.id, x: r2(e.x), z: r2(e.z), dx: r2(dirX), dz: r2(dirZ), shots });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
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
    return { mode: e.mode };
  },
};
