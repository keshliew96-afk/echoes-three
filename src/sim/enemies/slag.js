// Slag Golem (docs/KILN.md — The Ember Kiln) — the furnace brute. A heap of
// cooled slag round a molten core (64 HP) that plods at 1.25 u/s. Its CRUST
// turns blows: it takes 40 % less damage while the crust is whole, and
// knockback barely moves it (x0.3). Within 1.9 u of its target it rears and
// marks a SLAM: an Ember ring r 1.4 centred 1.0 u in front of it for 56
// ticks. The slam lands for 14 and splashes a SLAG POOL where it struck (a
// slow patch r 1.3, 30 % slow, 240 ticks). The blow cracks its crust open:
// for 120 ticks after a slam the core shows and it takes 40 % MORE damage
// (the punish window). Cooldown 210 ticks from the slam. Governor-gated
// like every player-targeted telegraph.
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 64,
  moveSpeed: 1.25,
  radius: 0.5,
  damage: 14,
  attackCdTicks: 210,
  slamRange: 1.9,
  slamReach: 1.0,
  slamRadius: 1.4,
  telegraphTicks: 56,
  kbScale: 0.3,
  crustTaken: 0.6, // damage taken while the crust is whole
  coreTaken: 1.4, // damage taken while the core is open
  coreTicks: 120,
  poolRadius: 1.3,
  poolSlow: 0.3,
  poolTicks: 240,
  firstAttackDelay: 70,
});

export default {
  id: 'slag',
  threat: 2.8,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'plod'; // plod | slam
    e.kbScale = S.kbScale;
    e.takenMul = S.crustTaken;
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.coreUntil = 0; // the core shows until this tick
    e.slamTick = -1; // render: the slam clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'slam';
      return; // planted for the slam
    }
    e.mode = 'plod';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const stop = S.slamReach + (target.radius ?? 0);
    if (d.l > stop) {
      const step = ctx.stepLen(e, S.moveSpeed, tick);
      ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.coreUntil > 0 && tick >= e.coreUntil) {
      // The crust knits shut again.
      e.coreUntil = 0;
      e.takenMul = S.crustTaken;
      ctx.events.emit(tick, 'slag_crust', { id: e.id, x: r2(e.x), z: r2(e.z) });
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      e.mode = 'plod';
      e.slamTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      e.coreUntil = tick + S.coreTicks;
      e.takenMul = S.coreTaken;
      ctx.events.emit(tick, 'slag_slam', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims, ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      ctx.strike(e, neutralsInRadius(ctx.registry, t.x, t.z, t.radius), ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      ctx.spawnSlick(e, t.x, t.z, { radius: S.poolRadius, ticks: S.poolTicks, slow: S.poolSlow, variant: 'slag' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.slamRange + (target.radius ?? 0) || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'slam';
    ctx.face(e, d.x, d.z);
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x + d.x * S.slamReach,
      z: e.z + d.z * S.slamReach,
      dirX: d.x,
      dirZ: d.z,
      radius: S.slamRadius,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode, core: e.coreUntil > 0 };
  },
};
