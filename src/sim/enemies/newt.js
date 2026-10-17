// Ember Newt (docs/KILN.md — The Ember Kiln) — the skitterer. A small fire
// lizard with a coal-bright belly (16 HP) that skitters in fast and low to
// 2.0-3.0 u of its target. When its target is within 3.2 u it crouches and
// marks a LUNGE: an Ember lane 0.7 u wide through the target, up to 3.6 u
// long (clipped at the walls), for 42 ticks. Then it shoots down the lane at
// 13 u/s, biting every hero it crosses once for 7, and skids to a stop at
// the lane's end with its flanks heaving: it rests there for 40 ticks before
// it skitters off again. Cooldown 190 ticks from the stop. Fast and fragile:
// it dies to one good hit, so the danger is three of them lunging together.
// Governor-gated like every player-targeted telegraph.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 16,
  moveSpeed: 2.6,
  radius: 0.24,
  damage: 7,
  attackCdTicks: 190,
  keepMin: 2.0,
  keepMax: 3.0,
  engageRange: 3.2,
  laneLength: 3.6,
  laneWidth: 0.7,
  telegraphTicks: 42,
  lungeSpeed: 13.0, // u/s
  restTicks: 40,
  firstAttackDelay: 90,
  weaveEvery: 70, // ticks between weave direction flips
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
  id: 'newt',
  threat: 1.2,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'skitter'; // skitter | crouch | lunge | rest
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.lungeVx = 0;
    e.lungeVz = 0;
    e.lungeTicksLeft = 0;
    e.lungeHits = [];
    e.restUntil = 0;
    e.lungeTick = -1; // render: the lunge clip
  },

  continuous(ctx, e, tick) {
    const { movement } = ctx;
    if (e.mode === 'lunge') {
      // The lunge ignores slows and knockback: it is a leap, not a walk.
      movement.walkStep(e, e.lungeVx, e.lungeVz, e.radius);
      e.lungeTicksLeft -= 1;
      return;
    }
    if (e.mode === 'rest') return;
    if (e.telegraph) {
      e.mode = 'crouch';
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    e.mode = 'skitter';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    const side = (e.id + Math.floor(tick / S.weaveEvery)) % 2 === 0 ? 1 : -1;
    if (d.l > S.keepMax) movement.walkStep(e, d.x * step + -d.z * step * 0.35 * side, d.z * step + d.x * step * 0.35 * side, e.radius);
    else if (d.l < S.keepMin) movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else movement.walkStep(e, -d.z * step * 0.6 * side, d.x * step * 0.6 * side, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'lunge') {
      const reach = S.laneWidth / 2;
      const hits = [];
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || e.lungeHits.includes(t.id)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) <= reach + (t.radius ?? 0)) hits.push(t);
      }
      for (const t of hits) e.lungeHits.push(t.id);
      if (hits.length) ctx.strike(e, hits, ctx.dmg(e, S.damage), e.x - e.lungeVx * 4, e.z - e.lungeVz * 4, { delivery: 'skill', shape: 'lane' });
      if (e.lungeTicksLeft <= 0) {
        e.mode = 'rest';
        e.restUntil = tick + S.restTicks;
        ctx.events.emit(tick, 'newt_stop', { id: e.id, x: r2(e.x), z: r2(e.z), hits: e.lungeHits.length });
      }
      return;
    }
    if (e.mode === 'rest') {
      if (tick < e.restUntil) return;
      e.mode = 'skitter';
      e.nextAttackTick = tick + S.attackCdTicks;
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      const perTick = S.lungeSpeed / ctx.TICK_HZ;
      e.lungeVx = t.dirX * perTick;
      e.lungeVz = t.dirZ * perTick;
      e.lungeTicksLeft = Math.max(1, Math.ceil(t.length / perTick));
      e.lungeHits = [];
      e.mode = 'lunge';
      e.lungeTick = tick;
      ctx.endTelegraph(e, tick);
      ctx.events.emit(tick, 'newt_lunge', { id: e.id, x: r2(e.x), z: r2(e.z), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length) });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 0.5) return;
    const length = clipLength(ctx, e, d.x, d.z, S.laneLength);
    if (length < d.l + 0.2) return; // the target is against a wall: wait
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'crouch';
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
