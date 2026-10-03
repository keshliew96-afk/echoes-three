// Quillback (BUILD_BRIEF §23.5) — a spiky rolling ball. It walks in at 1.5 u/s,
// and inside 5.0 u of its target it LOCKS a charge lane (Ember lane 0.7 u wide
// × min(6 u, to the first wall/blocker), 48 ticks), then rolls down it at
// 6.0 u/s for up to 60 ticks: 12 contact damage once per party body per
// charge. A charge that meets a wall or a blocker ends in a 30-tick stagger —
// the punish window. Cooldown 240 ticks from the charge start.
//
// All state is plain entity data (mode, charge velocity, per-charge hit ids).
import { r2, unit, strike } from './common.js';

const S = Object.freeze({
  hp: 26,
  moveSpeed: 1.5, // u/s
  radius: 0.38,
  damage: 12, // contact, once per target per charge
  attackCdTicks: 240,
  engageRange: 5.0, // u — starts a charge lane inside this
  holdRange: 3.6, // u — stops walking in here and lines the shot up (scaffold)
  chargeSpeed: 6.0, // u/s
  chargeMaxTicks: 60,
  laneMax: 6.0, // u
  laneMin: 1.2, // u — a lane shorter than this (hugging a wall) is not worth a charge (scaffold)
  laneWidth: 0.7, // u
  staggerTicks: 30,
  firstAttackDelay: 45, // ticks after spawn (a fresh spawn never charges on its first frame)
});

export default {
  id: 'quillback',
  threat: 1.5,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: 48 }),

  spawn(ctx, e, tick) {
    e.mode = 'approach'; // approach | charge | stagger
    e.chargeTicksLeft = 0;
    e.chargeVx = 0;
    e.chargeVz = 0;
    e.chargeHits = [];
    e.staggerUntilTick = 0;
    e.nextAttackTick = tick + S.firstAttackDelay;
  },

  continuous(ctx, e, tick) {
    const { movement } = ctx;
    if (e.mode === 'charge') {
      const k = ctx.speedMul(e, tick); // a stunned ball stops dead, a slowed one rolls slower
      const { hit } = movement.sweptStep(e, e.chargeVx * k, e.chargeVz * k, e.radius);
      e.chargeTicksLeft -= 1;
      if (hit) {
        e.mode = 'stagger';
        e.staggerUntilTick = tick + S.staggerTicks;
        ctx.events.emit(tick, 'enemy_charge_end', { id: e.id, etype: e.kind, cause: 'wall', x: r2(e.x), z: r2(e.z) });
      } else if (e.chargeTicksLeft <= 0) {
        e.mode = 'approach';
        ctx.events.emit(tick, 'enemy_charge_end', { id: e.id, etype: e.kind, cause: 'spent', x: r2(e.x), z: r2(e.z) });
      }
      return;
    }
    if (e.mode === 'stagger') {
      if (tick >= e.staggerUntilTick) e.mode = 'approach';
      return;
    }
    if (e.kbTicks > 0) return; // the knockback impulse owns the body
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ); // planted: the locked lane IS the promise
      return;
    }
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.holdRange) {
      const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), d.l - S.holdRange);
      movement.walkStep(e, d.x * step, d.z * step, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'charge') {
      // Contact damage once per party body per charge (§23.5).
      const hits = [];
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || e.chargeHits.includes(t.id)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) <= e.radius + (t.radius ?? 0) + 0.06) hits.push(t);
      }
      for (const t of hits) e.chargeHits.push(t.id);
      if (hits.length) strike(ctx, e, hits, ctx.dmg(e, S.damage), e.x - e.chargeVx, e.z - e.chargeVz);
      return;
    }
    if (e.mode === 'stagger') return;
    if (e.telegraph) {
      if (tick >= e.telegraph.resolveTick) {
        const t = e.telegraph;
        const perTick = S.chargeSpeed / ctx.TICK_HZ;
        e.chargeVx = t.dirX * perTick;
        e.chargeVz = t.dirZ * perTick;
        e.chargeTicksLeft = S.chargeMaxTicks;
        e.chargeHits = [];
        e.mode = 'charge';
        ctx.endTelegraph(e, tick);
        ctx.events.emit(tick, 'enemy_charge', {
          id: e.id,
          etype: e.kind,
          x: r2(e.x),
          z: r2(e.z),
          dx: r2(t.dirX),
          dz: r2(t.dirZ),
          length: r2(t.length),
        });
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
    // Lane = the committed roll: min(6 u, first wall / static / blocker).
    const c = ctx.movement.sweptContact(e.x, e.z, d.x * S.laneMax, d.z * S.laneMax, e.radius);
    const length = Math.max(0, Math.min(1, c.t)) * S.laneMax;
    if (length < S.laneMin) return;
    ctx.startTelegraph(e, tick, {
      kind: 'lane',
      startTick: tick,
      resolveTick: tick + this.telegraph.ticks,
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
    e.nextAttackTick = tick + this.telegraph.ticks + S.attackCdTicks;
  },

  view(e) {
    return { mode: e.mode, chargeTicksLeft: e.chargeTicksLeft };
  },
};
