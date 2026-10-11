// Chime Wraith (docs/ACT_V.md — The Still Spire) — the toller. A hooded
// shroud with a cracked bronze bell where its body should be (22 HP),
// floating a hand above the floor and drifting in to 1.4-2.4 u of its
// target. When a hero is within 2.8 u it stops, lifts the bell and marks a
// TOLL: an Ember ring r 2.8 round itself for 60 ticks. The toll rings out for
// 6 to every hero inside and slows them by 40 % for 2 s, so the answer is to
// step out of the ring, not to stand and trade. A hit that stuns it mid-swing
// chokes the toll (no ring, a short cooldown). A floater (`e.flier`): ground
// hazards and blockers never touch it. Cooldown 300 ticks from the toll.
// Governor-gated like every player-targeted telegraph.
import { r2, unit, partyInRadius } from './common.js';

const S = Object.freeze({
  hp: 22,
  moveSpeed: 1.6,
  radius: 0.3,
  damage: 6,
  attackCdTicks: 300,
  keepMin: 1.4,
  keepMax: 2.4, // inside the toll ring, so a hero who stands still is tolled
  tollRadius: 2.8,
  telegraphTicks: 60,
  slow: 0.4,
  slowTicks: 120,
  chokeCdTicks: 120,
  firstAttackDelay: 120,
  driftEvery: 140,
});

export default {
  id: 'chime',
  threat: 1.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'drift'; // drift | toll
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.tollTick = -1; // render: the toll clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'toll';
      return; // it hangs still while the bell swings back
    }
    if (e.mode === 'toll') {
      // A stun mid-swing cancelled the toll (enemies.js cancelTelegraph):
      // the bell is choked, and it tries again a little sooner.
      e.nextAttackTick = tick + S.chokeCdTicks;
      ctx.events.emit(tick, 'chime_choke', { id: e.id, x: r2(e.x), z: r2(e.z) });
    }
    e.mode = 'drift';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    const side = (e.id + Math.floor(tick / S.driftEvery)) % 2 === 0 ? 1 : -1;
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else ctx.movement.walkStep(e, -d.z * step * 0.5 * side, d.x * step * 0.5 * side, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      e.mode = 'drift';
      e.tollTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'chime_toll', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      for (const v of victims) {
        ctx.strike(e, [v], ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        if (v.hp > 0) ctx.status.apply(v, 'slow', S.slow, S.slowTicks, tick, e.id);
      }
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.tollRadius - 0.2) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'toll';
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x,
      z: e.z,
      dirX: d.x,
      dirZ: d.z,
      radius: S.tollRadius,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
