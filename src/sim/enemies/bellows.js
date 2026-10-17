// Bellows Imp (docs/KILN.md — The Ember Kiln) — the stoker. A pot-bellied
// imp with a leather bellows strapped to its back (26 HP) that keeps 2.6-3.8
// u from its target. When a hero is within 3.6 u it plants its feet, pumps
// the bellows and marks a FAN: an Ember cone r 3.4, half-angle 30°, for 60
// ticks. The fan blows a sheet of sparks down the cone for 8 to every hero
// inside. It is soft up close: walk into it and it scurries back, and a stun
// mid-pump chokes the fan (no sparks, a short cooldown). Cooldown 260 ticks
// from the fan. Governor-gated like every player-targeted telegraph.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 26,
  moveSpeed: 1.8,
  radius: 0.3,
  damage: 8,
  attackCdTicks: 260,
  keepMin: 2.6,
  keepMax: 3.8,
  fanRange: 3.6,
  coneRadius: 3.4,
  coneHalfAngleDeg: 30,
  telegraphTicks: 60,
  chokeCdTicks: 120,
  firstAttackDelay: 110,
  sidleEvery: 120,
});

const DEG = Math.PI / 180;

export default {
  id: 'bellows',
  threat: 1.7,
  stats: S,
  telegraph: Object.freeze({ kind: 'cone', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'sidle'; // sidle | pump
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.fanTick = -1; // render: the fan clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'pump';
      return; // feet planted while the bellows fill
    }
    if (e.mode === 'pump') {
      // A stun mid-pump cancelled the fan (enemies.js cancelTelegraph): the
      // bellows wheeze empty, and it tries again a little sooner.
      e.nextAttackTick = tick + S.chokeCdTicks;
      ctx.events.emit(tick, 'bellows_choke', { id: e.id, x: r2(e.x), z: r2(e.z) });
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
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step * 1.15, -d.z * step * 1.15, e.radius);
    else ctx.movement.walkStep(e, -d.z * step * 0.45 * side, d.x * step * 0.45 * side, e.radius);
    ctx.face(e, d.x, d.z);
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
      e.mode = 'sidle';
      e.fanTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'bellows_fan', { id: e.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims, ctx.dmg(e, S.damage), e.x, e.z, { delivery: 'skill', shape: 'cone' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.fanRange + (target.radius ?? 0) || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'pump';
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
    return { mode: e.mode };
  },
};
