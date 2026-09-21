// Grave Mole (BUILD_BRIEF §23.5) — it BURROWS: untargetable (`hittable:
// false`, `burrowed: true`) with a visible dirt-ripple trail, tunnelling at
// 2.2 u/s toward its target. Within 0.3 u of the target — or after 180
// burrowed ticks — it commits to an emergence: an Ember ring r 0.8 at that
// spot for 60 ticks (the mole is still underground and does not move), then it
// bursts out for 11 damage in r 0.8 and stays SURFACED and hittable for 120
// ticks before it digs back in. Underground it passes under blockers.
import { r2, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 24,
  moveSpeed: 2.2, // u/s burrowed
  radius: 0.35,
  damage: 11,
  emergeRange: 0.3, // u — commit to an emergence this close to the target
  maxBurrowTicks: 180,
  biteRadius: 0.8,
  surfaceTicks: 120,
  surfacedWalk: 0.0, // u/s — a surfaced mole stands and blinks (the punish window)
});

function burrow(ctx, e, tick, cause) {
  e.mode = 'burrowed';
  e.burrowed = true;
  e.hittable = false;
  e.knockbackable = false;
  e.kbTicks = 0;
  e.burrowStartTick = tick;
  ctx.events.emit(tick, 'enemy_burrow', { id: e.id, etype: e.kind, cause, x: r2(e.x), z: r2(e.z) });
}

function surface(ctx, e, tick) {
  e.mode = 'surfaced';
  e.burrowed = false;
  e.hittable = e.state === 'active';
  e.knockbackable = true;
  e.surfaceUntilTick = tick + S.surfaceTicks;
}

export default {
  id: 'mole',
  threat: 1.5,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: 60 }),
  burrow,
  surface,

  spawn(ctx, e, tick) {
    e.surfaceUntilTick = 0;
    e.burrowStartTick = tick;
    // Spawns underground: the violet spawn shimmer shows where it went in.
    e.mode = 'burrowed';
    e.burrowed = true;
    e.hittable = false;
    e.knockbackable = false;
  },

  continuous(ctx, e, tick) {
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (e.mode === 'burrowed') {
      if (!target) return;
      const dx = target.x - e.x;
      const dz = target.z - e.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.2) {
        const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), d - 0.2);
        ctx.movement.walkStep(e, (dx / d) * step, (dz / d) * step, e.radius);
      }
      if (d > 1e-6) ctx.face(e, dx, dz);
      return;
    }
    if (e.mode === 'surfaced' && target && e.kbTicks <= 0) {
      ctx.face(e, target.x - e.x, target.z - e.z);
    }
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'emerging') {
      if (e.telegraph && tick >= e.telegraph.resolveTick) {
        const t = e.telegraph;
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.endTelegraph(e, tick);
        surface(ctx, e, tick);
        ctx.events.emit(tick, 'enemy_emerge', {
          id: e.id,
          etype: e.kind,
          x: r2(e.x),
          z: r2(e.z),
          radius: t.radius,
          victims: victims.length,
        });
        ctx.strike(e, victims.concat(props), ctx.dmg(e, S.damage), e.x, e.z);
      }
      return;
    }
    if (e.mode === 'surfaced') {
      if (tick >= e.surfaceUntilTick && e.state === 'active') burrow(ctx, e, tick, 'cycle');
      return;
    }
    // Burrowed: commit to an emergence under the target (or when the tunnel
    // clock runs out), through the §11 governor like every player-targeted
    // telegraph. A stunned mole cannot surface.
    if (ctx.stunned(e, tick)) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    const d = target ? Math.hypot(target.x - e.x, target.z - e.z) : Infinity;
    const want = d <= S.emergeRange || tick - e.burrowStartTick >= S.maxBurrowTicks;
    if (!want) return;
    const playerTargeted = !!target && target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'emerging';
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + this.telegraph.ticks,
      x: e.x,
      z: e.z,
      dirX: e.faceX,
      dirZ: e.faceZ,
      radius: S.biteRadius,
      playerTargeted,
      targetId: target ? target.id : null,
    });
  },

  view(e) {
    return { mode: e.mode, burrowed: !!e.burrowed };
  },
};
