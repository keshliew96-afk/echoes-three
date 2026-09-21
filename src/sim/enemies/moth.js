// Gloam Moth (BUILD_BRIEF §23.5) — the only FLIER: it hovers at 2.4 u/s on a
// 3.5 u orbit around its target, then telegraphs a swoop LANE (0.8 u × 5.5 u
// through the target, 45 ticks) and dives down it at 8.0 u/s, 9 damage to
// every party member it crosses (once each). Fliers ignore Bramble, the
// Millrace, toad slicks and ground blockers (`e.flier`; walls still bound it).
// Cooldown 180 ticks from the swoop start.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 16,
  moveSpeed: 2.4, // u/s hover
  radius: 0.3,
  damage: 9,
  attackCdTicks: 180,
  orbitR: 3.5, // u
  orbitBand: 0.45, // u — tolerance around the orbit radius (scaffold)
  engageRange: 4.6, // u — the lane (5.5) must pass THROUGH the target with room to spare
  swoopSpeed: 8.0, // u/s
  laneLen: 5.5, // u
  laneWidth: 0.8, // u
  firstAttackDelay: 60,
});

export default {
  id: 'moth',
  threat: 1.3,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: 45 }),

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'orbit'; // orbit | swoop
    e.swoopTicksLeft = 0;
    e.swoopVx = 0;
    e.swoopVz = 0;
    e.swoopHits = [];
    e.nextAttackTick = tick + S.firstAttackDelay;
  },

  continuous(ctx, e, tick) {
    const { movement } = ctx;
    if (e.mode === 'swoop') {
      const k = ctx.speedMul(e, tick);
      const hit = movement.walkStep(e, e.swoopVx * k, e.swoopVz * k, e.radius);
      e.swoopTicksLeft -= 1;
      if (hit || e.swoopTicksLeft <= 0) {
        e.mode = 'orbit';
        ctx.events.emit(tick, 'enemy_swoop_end', { id: e.id, etype: e.kind, x: r2(e.x), z: r2(e.z) });
      }
      return;
    }
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.orbitR + S.orbitBand) movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.orbitR - S.orbitBand) movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      const side = e.id % 2 === 0 ? 1 : -1; // orbit direction by ordinal parity (no RNG)
      movement.walkStep(e, -d.z * step * 0.6 * side, d.x * step * 0.6 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'swoop') {
      const reach = S.laneWidth / 2;
      const hits = [];
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || e.swoopHits.includes(t.id)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) <= reach + (t.radius ?? 0)) hits.push(t);
      }
      for (const t of hits) e.swoopHits.push(t.id);
      if (hits.length) {
        ctx.strike(e, hits, ctx.dmg(e, S.damage), e.x - e.swoopVx * 4, e.z - e.swoopVz * 4);
      }
      return;
    }
    if (e.telegraph) {
      if (tick >= e.telegraph.resolveTick) {
        const t = e.telegraph;
        const perTick = S.swoopSpeed / ctx.TICK_HZ;
        e.swoopVx = t.dirX * perTick;
        e.swoopVz = t.dirZ * perTick;
        e.swoopTicksLeft = Math.max(1, Math.ceil(t.length / perTick));
        e.swoopHits = [];
        e.mode = 'swoop';
        ctx.endTelegraph(e, tick);
        ctx.events.emit(tick, 'enemy_swoop', {
          id: e.id,
          etype: e.kind,
          x: r2(e.x),
          z: r2(e.z),
          dx: r2(t.dirX),
          dz: r2(t.dirZ),
          length: r2(t.length),
        });
      }
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 0.6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    // The lane runs THROUGH the target; a wall shortens it (walls only — a
    // flier crosses blockers).
    const { mx, mz } = ctx.movement.innerBounds(e.radius);
    let length = S.laneLen;
    if (d.x > 1e-6) length = Math.min(length, (mx - e.x) / d.x);
    else if (d.x < -1e-6) length = Math.min(length, (-mx - e.x) / d.x);
    if (d.z > 1e-6) length = Math.min(length, (mz - e.z) / d.z);
    else if (d.z < -1e-6) length = Math.min(length, (-mz - e.z) / d.z);
    if (length < d.l + 0.2) return; // the target would not be on the lane
    ctx.startTelegraph(e, tick, {
      kind: 'lane',
      startTick: tick,
      resolveTick: tick + this.telegraph.ticks,
      fromX: e.x,
      fromZ: e.z,
      x: e.x + d.x * length,
      z: e.z + d.z * length,
      dirX: d.x,
      dirZ: d.z,
      length,
      width: S.laneWidth,
      playerTargeted,
      targetId: target.id,
    });
    e.nextAttackTick = tick + this.telegraph.ticks + S.attackCdTicks;
  },

  view(e) {
    return { mode: e.mode };
  },
};
