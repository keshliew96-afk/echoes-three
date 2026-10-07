// Vein Lancer (docs/ACT_IV.md — The Hollow Heart) — the ranged threat of Act
// IV. It keeps 3.4-5.6 u from its target and throws a LANCE of the Heart's
// violet along a straight line: an Ember lane 0.8 u wide and up to 7 u long
// (clipped at the walls) for 54 ticks, then every party body inside the lane
// takes 10 at once. Unlike a mantis shot nothing travels: the lane IS the
// attack, so stepping sideways out of it (or dodging through) is the answer,
// and a barricade does not stop it. The lancer stands still and locks its aim
// for the wind-up; cooldown 240 ticks. Governor-gated like every
// player-targeted telegraph.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 16,
  moveSpeed: 1.5,
  radius: 0.32,
  damage: 10,
  attackCdTicks: 240,
  keepMin: 3.4,
  keepMax: 5.6,
  engageRange: 6.2, // starts a lance when its target is this close
  laneLength: 7.0,
  laneWidth: 0.8,
  telegraphTicks: 54,
  firstAttackDelay: 90,
});

// Distance along (dx, dz) from (x, z) to the arena's inner box (radius r).
function clipLength(ctx, x, z, dx, dz, len) {
  const { mx, mz } = ctx.movement.innerBounds(0.1);
  let t = len;
  if (dx > 1e-6) t = Math.min(t, (mx - x) / dx);
  if (dx < -1e-6) t = Math.min(t, (-mx - x) / dx);
  if (dz > 1e-6) t = Math.min(t, (mz - z) / dz);
  if (dz < -1e-6) t = Math.min(t, (-mz - z) / dz);
  return Math.max(1, t);
}

// Party (and neutral breakable) bodies whose circle meets the lane.
export function inLane(registry, t) {
  const out = [];
  for (const p of registry.all()) {
    const party = p.faction === 'party';
    if (!(party || (p.faction === 'neutral' && p.hittable)) || !(p.hp > 0)) continue;
    const px = p.x - t.fromX;
    const pz = p.z - t.fromZ;
    const along = px * t.dirX + pz * t.dirZ;
    const r = p.radius ?? 0;
    if (along < -r || along > t.length + r) continue;
    const across = Math.abs(px * t.dirZ - pz * t.dirX);
    if (across <= t.width / 2 + r) out.push(p);
  }
  return out;
}

export default {
  id: 'lancer',
  threat: 1.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'stalk'; // stalk | aim
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.lanceTick = -1; // render: the throw clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    e.mode = 'stalk';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      // Slow circling between throws, side by spawn-ordinal parity (no RNG).
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.4 * side, d.x * step * 0.4 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = inLane(ctx.registry, t);
      e.mode = 'stalk';
      e.lanceTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'lancer_lance', { id: e.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length), width: t.width, victims: victims.filter((v) => v.faction === 'party').length });
      // The lance strikes along its own line (knockback pushes down the lane).
      for (const v of victims) ctx.strike(e, [v], ctx.dmg(e, S.damage), v.x - t.dirX, v.z - t.dirZ, { delivery: 'skill', shape: 'lane' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    const length = clipLength(ctx, e.x, e.z, d.x, d.z, S.laneLength);
    e.mode = 'aim';
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
      lance: true,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
