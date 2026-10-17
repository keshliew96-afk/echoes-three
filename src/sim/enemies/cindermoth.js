// Cinder Moth (docs/KILN.md — The Ember Kiln) — the kindler. A moth with
// wings of glowing ash (12 HP) that flutters straight at its target. Within
// 1.0 u it hangs still and KINDLES: an Ember ring r 1.2 round itself for 48
// ticks, then it flares for 6 to every hero inside. The flare burns it out:
// for 150 ticks it is SPENT, a grey husk drifting away from the party that
// takes double damage (the punish window), and then it catches light again.
// A flier (`e.flier`): ground hazards and blockers never touch it. They come
// several at once. Governor-gated like every player-targeted telegraph.
import { r2, unit, partyInRadius } from './common.js';

const S = Object.freeze({
  hp: 12,
  moveSpeed: 2.4,
  radius: 0.22,
  damage: 6,
  attackCdTicks: 60, // after it catches light again
  kindleRange: 1.0,
  kindleRadius: 1.2,
  telegraphTicks: 48,
  spentTicks: 150,
  spentTaken: 2.0,
  spentSpeed: 1.2,
  firstAttackDelay: 80,
  flutterEvery: 40,
});

export default {
  id: 'cindermoth',
  threat: 1.1,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'flutter'; // flutter | kindle | spent
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.spentUntil = 0;
    e.flareTick = -1; // render: the flare clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'kindle';
      return; // it hangs still while the ash catches
    }
    if (e.mode === 'kindle') {
      // A stun mid-kindle snuffed it: it goes dark without the flare.
      e.mode = 'spent';
      e.spentUntil = tick + S.spentTicks;
      e.takenMul = S.spentTaken;
      ctx.events.emit(tick, 'cindermoth_snuff', { id: e.id, x: r2(e.x), z: r2(e.z) });
    }
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (e.mode === 'spent') {
      // A burnt-out husk drifts away on the heat.
      const step = ctx.stepLen(e, S.spentSpeed, tick);
      if (d.l < 4.0) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
      ctx.face(e, -d.x, -d.z);
      return;
    }
    e.mode = 'flutter';
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    const wob = Math.floor(tick / S.flutterEvery + e.id) % 2 === 0 ? 0.4 : -0.4;
    if (d.l > S.kindleRange * 0.8) ctx.movement.walkStep(e, (d.x - d.z * wob) * step, (d.z + d.x * wob) * step, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'spent') {
      if (tick < e.spentUntil) return;
      e.mode = 'flutter';
      delete e.takenMul;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'cindermoth_relight', { id: e.id, x: r2(e.x), z: r2(e.z) });
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      e.mode = 'spent';
      e.flareTick = tick;
      e.spentUntil = tick + S.spentTicks;
      e.takenMul = S.spentTaken;
      ctx.events.emit(tick, 'cindermoth_flare', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims, ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.kindleRange + (target.radius ?? 0)) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'kindle';
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x,
      z: e.z,
      dirX: d.x,
      dirZ: d.z,
      radius: S.kindleRadius,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
