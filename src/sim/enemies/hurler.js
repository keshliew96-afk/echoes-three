// Coal Hurler (content plan 5 slice 9, docs/KILN.md "Two more creatures") —
// the Kiln's mortar. A squat soot-black imp with a sack of live coals over
// one shoulder (22 HP) that keeps 3.6-5.2 u from its target. When a hero
// stands 2.4-6.8 u off it plants, swings the sack back and marks a COAL: an
// Ember ring r 1.3 on the hero's spot for 66 ticks (the coal is in the air
// for the last part of it). The coal lands for 9 and bursts into a bed of
// cinders that slows (r 1.0, 30 %, 150 ticks). A stun mid-swing makes it
// fumble the coal (no throw, a short cooldown). Cooldown 240 ticks from the
// throw. Up close it scurries back. Governor-gated like every
// player-targeted telegraph. No RNG: the strafe side is spawn-ordinal parity.
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 22,
  moveSpeed: 1.6,
  radius: 0.3,
  damage: 9,
  attackCdTicks: 240,
  keepMin: 3.6,
  keepMax: 5.2,
  throwMin: 2.4,
  throwMax: 6.8,
  coalRadius: 1.3,
  telegraphTicks: 66,
  bedRadius: 1.0,
  bedSlow: 0.3,
  bedTicks: 150,
  fumbleCdTicks: 110,
  firstAttackDelay: 100,
  sidleEvery: 140,
});

export default {
  id: 'hurler',
  threat: 1.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'sidle'; // sidle | wind
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.throwTick = -1; // render: the throw clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'wind';
      return; // planted, the sack swung back
    }
    if (e.mode === 'wind') {
      // A stun mid-swing cancelled the coal (enemies.js cancelTelegraph): it
      // fumbles the sack and tries again a little sooner.
      e.nextAttackTick = tick + S.fumbleCdTicks;
      ctx.events.emit(tick, 'hurler_fumble', { id: e.id, x: r2(e.x), z: r2(e.z) });
    }
    e.mode = 'sidle';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    const side = (e.id + Math.floor(tick / S.sidleEvery)) % 2 === 0 ? 1 : -1;
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step * 1.1, -d.z * step * 1.1, e.radius);
    else ctx.movement.walkStep(e, -d.z * step * 0.4 * side, d.x * step * 0.4 * side, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      e.mode = 'sidle';
      e.throwTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'hurler_coal', { id: e.id, x: r2(t.x), z: r2(t.z), fromX: r2(e.x), fromZ: r2(e.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims, ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      ctx.strike(e, neutralsInRadius(ctx.registry, t.x, t.z, t.radius), ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      ctx.spawnSlick(e, t.x, t.z, { radius: S.bedRadius, ticks: S.bedTicks, slow: S.bedSlow, variant: 'ash' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l < S.throwMin || d.l > S.throwMax) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'wind';
    ctx.face(e, d.x, d.z);
    const { mx, mz } = ctx.movement.innerBounds(0.2);
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: Math.max(-mx, Math.min(mx, target.x)),
      z: Math.max(-mz, Math.min(mz, target.z)),
      dirX: d.x,
      dirZ: d.z,
      radius: S.coalRadius,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
