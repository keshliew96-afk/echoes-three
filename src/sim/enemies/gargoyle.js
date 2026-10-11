// Gargoyle (docs/ACT_V.md — The Still Spire) — the sleeper. A crouched
// winged grotesque of the Spire's pale stone (48 HP) that arrives as STONE:
// it does not move or attack, and knockback does not shift it. It wakes when
// a hero comes within 2.6 u or anything hurts it: the stone cracks for 48
// ticks behind an Ember ring r 1.7 round itself, then it bursts free for 12
// to every hero inside (the wake). Awake it stalks at 1.9 u/s and SLAMS: an
// Ember ring r 1.3 centred 0.9 u in front of it for 54 ticks, 13 damage.
// When no hero has been within 5 u for 6 s it settles back into stone where
// it stands, and the next hero who walks up wakes it again. Takes x0.5
// knockback awake. Its wake and slam are governor-gated; a wake the governor
// holds back still frees it, just without the burst.
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 48,
  moveSpeed: 1.9,
  radius: 0.42,
  damage: 13,
  wakeDamage: 12,
  attackCdTicks: 200,
  wakeRange: 2.6,
  wakeRadius: 1.7,
  wakeTicks: 48,
  slamReach: 0.9,
  slamRadius: 1.3,
  slamRange: 1.9,
  telegraphTicks: 54,
  kbScale: 0.5,
  settleRange: 5.0,
  settleTicks: 360,
  firstSlamDelay: 50, // after it wakes
});

const partyNear = (ctx, e, range) => {
  for (const t of ctx.registry.all()) {
    if (t.faction !== 'party' || !(t.hp > 0) || t.partyIndex === undefined) continue;
    if (Math.hypot(t.x - e.x, t.z - e.z) <= range + (t.radius ?? 0)) return true;
  }
  return false;
};

export default {
  id: 'gargoyle',
  threat: 2.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'stone'; // stone | wake | stalk
    e.kbScale = 0;
    e.nextAttackTick = tick;
    e.stoneHp = e.hp; // a hit while stone (hp below this) wakes it
    e.lastNearTick = tick;
    e.wakeTick = -1; // render: the burst clip
    e.slamTick = -1; // render: the slam clip
  },

  continuous(ctx, e, tick) {
    if (e.mode === 'stone' || e.mode === 'wake') return; // perched / cracking
    if (e.telegraph) return; // planted for the slam
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
    if (e.mode === 'stone') {
      const hurt = e.hp < e.stoneHp - 1e-6;
      if (!hurt && !partyNear(ctx, e, S.wakeRange)) return;
      // Cracking free: the wake burst is a ring round itself.
      e.mode = 'wake';
      e.kbScale = S.kbScale;
      const target = ctx.nearestTarget(e);
      const playerTargeted = !!(target && target.partyIndex !== undefined);
      const burst = !playerTargeted || ctx.governor.grants(tick);
      ctx.events.emit(tick, 'gargoyle_crack', { id: e.id, x: r2(e.x), z: r2(e.z), hit: hurt, burst });
      if (burst) {
        ctx.startTelegraph(e, tick, {
          kind: 'ring',
          startTick: tick,
          resolveTick: tick + S.wakeTicks,
          x: e.x,
          z: e.z,
          dirX: e.faceX ?? 0,
          dirZ: e.faceZ ?? 1,
          radius: S.wakeRadius,
          wake: true,
          playerTargeted,
          targetId: target ? target.id : null,
        });
      } else e.wakeUntil = tick + S.wakeTicks;
      return;
    }
    if (e.mode === 'wake') {
      if (e.telegraph) {
        if (tick < e.telegraph.resolveTick) return;
        const t = e.telegraph;
        ctx.endTelegraph(e, tick);
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims, ctx.dmg(e, S.wakeDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        ctx.events.emit(tick, 'gargoyle_wake', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      } else if (e.wakeUntil != null && tick < e.wakeUntil) return;
      else ctx.events.emit(tick, 'gargoyle_wake', { id: e.id, x: r2(e.x), z: r2(e.z), radius: 0, victims: 0 });
      // (a stun during the crack cancels its burst; it wakes all the same)
      delete e.wakeUntil;
      e.mode = 'stalk';
      e.wakeTick = tick;
      e.lastNearTick = tick;
      e.nextAttackTick = tick + S.firstSlamDelay;
      return;
    }
    // Awake.
    if (partyNear(ctx, e, S.settleRange)) e.lastNearTick = tick;
    else if (!e.telegraph && tick - e.lastNearTick >= S.settleTicks) {
      e.mode = 'stone';
      e.kbScale = 0;
      e.stoneHp = e.hp;
      ctx.events.emit(tick, 'gargoyle_settle', { id: e.id, x: r2(e.x), z: r2(e.z) });
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      const breakables = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
      e.slamTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'gargoyle_slam', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, [...victims, ...breakables], ctx.dmg(e, S.damage), e.x, e.z, { delivery: 'skill', shape: 'ring' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.slamRange + (target.radius ?? 0)) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    const dir = d.l > 1e-6 ? d : { x: e.faceX ?? 0, z: e.faceZ ?? 1 };
    ctx.face(e, dir.x, dir.z);
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x + dir.x * S.slamReach,
      z: e.z + dir.z * S.slamReach,
      dirX: dir.x,
      dirZ: dir.z,
      radius: S.slamRadius,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
