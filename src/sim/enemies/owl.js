// Shriek Owl (content plan 3 slice 3 — Hollow Wood) — the screamer. A pale
// barn-owl shape (18 HP) that flies high over the fight, keeping 3.2-5.2 u
// from its target and drifting round it. When its target is within 4.2 u it
// hangs still, flares its facial disc and SHRIEKS: an Ember cone (r 3.8 u,
// half-angle 30°, 54 ticks) that lands for 8 damage and slows every hero in
// it by 35% for 1.5 s. The cone is long and narrow, so the answer is a
// sidestep, not a retreat. It is a flier (`e.flier`): ground hazards and
// blockers never touch it, and only other fliers jostle it. Cooldown 230
// ticks from the shriek. Governor-gated like every player-targeted
// telegraph.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 18,
  moveSpeed: 2.4,
  radius: 0.3,
  damage: 8,
  attackCdTicks: 230,
  keepMin: 3.2,
  keepMax: 5.2,
  engageRange: 4.2,
  coneRadius: 3.8,
  coneHalfAngleDeg: 30,
  telegraphTicks: 54,
  slow: 0.35,
  slowTicks: 90,
  firstAttackDelay: 100,
  driftEvery: 120, // ticks between drift side flips
});

const DEG = Math.PI / 180;

// Party bodies inside a cone telegraph record (apex x,z; dir; radius;
// half-angle). A body right on the apex is always inside.
export function inCone(registry, t) {
  const cosHalf = Math.cos(t.halfAngleDeg * DEG);
  const out = [];
  for (const p of registry.all()) {
    if (p.faction !== 'party' || !(p.hp > 0)) continue;
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    const l = Math.hypot(dx, dz);
    if (l > t.radius + (p.radius ?? 0)) continue;
    if (l > (p.radius ?? 0) + 0.15 && (dx * t.dirX + dz * t.dirZ) / l < cosHalf) continue;
    out.push(p);
  }
  return out;
}

export default {
  id: 'owl',
  threat: 1.4,
  stats: S,
  telegraph: Object.freeze({ kind: 'cone', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'glide'; // glide | hang
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.shriekTick = -1; // render: the shriek clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'hang';
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    e.mode = 'glide';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    const side = (e.id + Math.floor(tick / S.driftEvery)) % 2 === 0 ? 1 : -1;
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else ctx.movement.walkStep(e, -d.z * step * 0.6 * side, d.x * step * 0.6 * side, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = inCone(ctx.registry, t);
      e.shriekTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'owl_shriek', { id: e.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), radius: t.radius, halfAngleDeg: t.halfAngleDeg, victims: victims.length });
      for (const v of victims) {
        ctx.strike(e, [v], ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
        if (v.hp > 0) ctx.status.apply(v, 'slow', S.slow, S.slowTicks, tick, e.id);
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
    ctx.face(e, d.x, d.z);
    e.mode = 'hang';
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
