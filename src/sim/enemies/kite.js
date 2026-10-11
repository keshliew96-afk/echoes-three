// Gust Kite (docs/ACT_V.md — The Still Spire) — the diver. A frame of cane
// and old sailcloth the Spire's wind keeps aloft (14 HP), riding high and
// circling its target 3.6-5.6 u out. When its target is within 5.2 u it
// hangs, folds its wings and marks a DIVE: an Ember lane 0.8 u wide through
// the target, up to 6.2 u long (clipped at the walls), for 50 ticks. Then it
// drops down the lane at 12 u/s, striking every hero it crosses once for 9,
// and lands at the lane's end, GROUNDED: its wings splay on the floor for 80
// ticks while it struggles back up, and it takes 50 % more damage there (the
// punish window). Then it climbs back into the air. A flier (`e.flier`)
// while it soars and dives, a ground body while grounded. Cooldown 250 ticks
// from the landing. Governor-gated like every player-targeted telegraph.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 14,
  moveSpeed: 2.8,
  radius: 0.26,
  damage: 9,
  attackCdTicks: 250,
  keepMin: 3.6,
  keepMax: 5.6,
  engageRange: 5.2,
  laneLength: 6.2,
  laneWidth: 0.8,
  telegraphTicks: 50,
  diveSpeed: 12.0, // u/s
  groundedTicks: 80,
  groundedTaken: 1.5, // damage taken while grounded
  firstAttackDelay: 110,
  circleEvery: 150, // ticks between circling side flips
});

// Distance along (dx, dz) from (x, z) to the arena's inner box.
function clipLength(ctx, e, dx, dz, len) {
  const { mx, mz } = ctx.movement.innerBounds(e.radius);
  let t = len;
  if (dx > 1e-6) t = Math.min(t, (mx - e.x) / dx);
  if (dx < -1e-6) t = Math.min(t, (-mx - e.x) / dx);
  if (dz > 1e-6) t = Math.min(t, (mz - e.z) / dz);
  if (dz < -1e-6) t = Math.min(t, (-mz - e.z) / dz);
  return Math.max(0, t);
}

export default {
  id: 'kite',
  threat: 1.3,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'soar'; // soar | hang | dive | grounded
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.diveVx = 0;
    e.diveVz = 0;
    e.diveTicksLeft = 0;
    e.diveHits = [];
    e.groundedUntil = 0;
    e.landTick = -1; // render: the landing clip
  },

  continuous(ctx, e, tick) {
    const { movement } = ctx;
    if (e.mode === 'dive') {
      // The dive ignores slows and knockback: it is a drop, not a walk.
      movement.walkStep(e, e.diveVx, e.diveVz, e.radius);
      e.diveTicksLeft -= 1;
      return;
    }
    if (e.mode === 'grounded') return;
    if (e.telegraph) {
      e.mode = 'hang';
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    e.mode = 'soar';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    const side = (e.id + Math.floor(tick / S.circleEvery)) % 2 === 0 ? 1 : -1;
    if (d.l > S.keepMax) movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else movement.walkStep(e, -d.z * step * 0.75 * side, d.x * step * 0.75 * side, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'dive') {
      const reach = S.laneWidth / 2;
      const hits = [];
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || e.diveHits.includes(t.id)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) <= reach + (t.radius ?? 0)) hits.push(t);
      }
      for (const t of hits) e.diveHits.push(t.id);
      if (hits.length) ctx.strike(e, hits, ctx.dmg(e, S.damage), e.x - e.diveVx * 4, e.z - e.diveVz * 4, { delivery: 'skill', shape: 'lane' });
      if (e.diveTicksLeft <= 0) {
        // Down: the wings splay on the floor and it is a ground body.
        e.mode = 'grounded';
        e.flier = false;
        e.groundedUntil = tick + S.groundedTicks;
        e.landTick = tick;
        e.takenMul = S.groundedTaken;
        ctx.events.emit(tick, 'kite_land', { id: e.id, x: r2(e.x), z: r2(e.z), hits: e.diveHits.length, untilTick: e.groundedUntil });
      }
      return;
    }
    if (e.mode === 'grounded') {
      if (tick < e.groundedUntil) return;
      e.mode = 'soar';
      e.flier = true;
      delete e.takenMul;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'kite_rise', { id: e.id, x: r2(e.x), z: r2(e.z) });
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      const perTick = S.diveSpeed / ctx.TICK_HZ;
      e.diveVx = t.dirX * perTick;
      e.diveVz = t.dirZ * perTick;
      e.diveTicksLeft = Math.max(1, Math.ceil(t.length / perTick));
      e.diveHits = [];
      e.mode = 'dive';
      ctx.endTelegraph(e, tick);
      ctx.events.emit(tick, 'kite_dive', { id: e.id, x: r2(e.x), z: r2(e.z), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length) });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 0.6) return;
    const length = clipLength(ctx, e, d.x, d.z, S.laneLength);
    if (length < d.l + 0.3) return; // the target is against a wall: wait
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'hang';
    ctx.face(e, d.x, d.z);
    ctx.startTelegraph(e, tick, {
      kind: 'lane',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      fromX: e.x,
      fromZ: e.z,
      x: e.x + d.x * length,
      z: e.z + d.z * length,
      dirX: d.x,
      dirZ: d.z,
      length,
      width: S.laneWidth,
      lance: true, // AI seats step sideways out of it (sim/allies.js laneGoal)
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
