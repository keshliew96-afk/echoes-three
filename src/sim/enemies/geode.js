// Geode Brute (docs/ACT_IV.md — The Hollow Heart) — the heavy of Act IV. A
// hunched mass of violet crystal grown through stone. 64 HP, 0.9 u/s, takes
// x0.35 knockback. Its attack is the CRYSTAL SLAM: an Ember ring r 1.5 centred
// 0.9 u in front of it (60 ticks) that lands for 14. The slam throws THREE
// CRYSTAL SHARDS outward (ahead and 70° to either side), each landing 2.4 u
// from the impact a full second later (an Ember ring r 0.8 each, 8 damage)
// and leaving a crystal patch (r 0.8, 3 s, 35% slow). So the brute leaves the
// floor worse than it found it: a party that stays near it fights among
// crystals. The shards are not player-targeted (they land where the slam
// threw them, like a Rotcap's burst) and take no governor slot; the slam is
// governor-gated like every player-targeted telegraph. Cooldown 280 ticks.
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 64,
  moveSpeed: 0.9,
  radius: 0.55,
  damage: 14,
  attackCdTicks: 280,
  slamReach: 0.9,
  slamRadius: 1.5,
  slamRange: 2.1,
  telegraphTicks: 60,
  kbScale: 0.35,
  firstAttackDelay: 60,
  shardCount: 3,
  shardSpreadDeg: 70,
  shardDist: 2.4,
  shardFlightTicks: 60,
  shardRadius: 0.8,
  shardDamage: 8,
  patchTicks: 180,
  patchSlow: 0.35,
});

const DEG = Math.PI / 180;

export default {
  id: 'geode',
  threat: 3.2,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.kbScale = S.kbScale;
    e.mode = 'march'; // march | slam
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.slamTick = -1; // render: the slam clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) return; // planted for the wind-up
    if (e.mode === 'slam') e.mode = 'march'; // a stun cancelled the swing
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const stop = S.slamReach + (target.radius ?? 0);
    if (d.l > stop) {
      const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), d.l - stop);
      ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
      e.mode = 'march';
      e.slamTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'geode_slam', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims.concat(props), ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      // The shards: ahead, and spread to either side, clamped into the arena.
      const base = Math.atan2(t.dirX, t.dirZ);
      const { mx, mz } = ctx.movement.innerBounds(S.shardRadius * 0.5);
      for (let i = 0; i < S.shardCount; i++) {
        const a = base + (i === 0 ? 0 : (i % 2 ? 1 : -1) * S.shardSpreadDeg * DEG * Math.ceil(i / 2));
        const tx = Math.min(mx, Math.max(-mx, t.x + Math.sin(a) * S.shardDist));
        const tz = Math.min(mz, Math.max(-mz, t.z + Math.cos(a) * S.shardDist));
        ctx.spawnGlob(e, tick, {
          tx,
          tz,
          flightTicks: S.shardFlightTicks,
          radius: S.shardRadius,
          power: ctx.dmg(e, S.shardDamage),
          slickRadius: S.shardRadius,
          slickTicks: S.patchTicks,
          slickSlow: S.patchSlow,
          slickVariant: 'crystal',
          shard: true,
          playerTargeted: false,
          targetId: null,
        });
      }
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.slamRange + (target.radius ?? 0)) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'slam';
    const reach = S.slamReach * (e.scale ?? 1);
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x + e.faceX * reach,
      z: e.z + e.faceZ * reach,
      dirX: e.faceX,
      dirZ: e.faceZ,
      radius: S.slamRadius,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
