// Rotcap (docs/CONTENT_PLAN.md §3.1 — Hollow Wood / Sunken Mill) — a shambling
// toadstool. It shuffles in at 1.1 u/s and bites on contact (7 damage, 60-tick
// per-target cooldown, like the boar), but its real threat is its DEATH: the
// cap bursts into a spore cloud. Killing it drops an Ember ring r 1.2 on the
// spot (48 ticks — the glob telegraph, nothing in flight) that lands for 10
// damage and leaves a spore slick (r 1.2, 150 ticks, 30% slow). Melee pays for
// the kill; ranged kills are free. The burst is a lobbed glob owned by the
// dead cap, so it survives the body and dissolves on the room clear like any
// other in-flight enemy instance.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 22,
  moveSpeed: 1.1, // u/s
  radius: 0.36,
  damage: 7,
  attackCdTicks: 60, // per target
  contactRange: 0.36,
  burstTicks: 48,
  burstRadius: 1.2,
  burstDamage: 10,
  slickTicks: 150,
  slickSlow: 0.3,
});

export default {
  id: 'rotcap',
  threat: 1.0,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.burstTicks }),

  spawn(ctx, e) {
    e.mode = 'shamble';
    e.cdByTarget = {};
    e.biteTick = -1; // render: the bite clip
  },

  continuous(ctx, e, tick) {
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const stop = S.contactRange + target.radius - 0.04;
    if (d.l > stop) {
      const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), d.l - stop);
      ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = Math.hypot(target.x - e.x, target.z - e.z);
    if (d > S.contactRange + target.radius + 0.02) return;
    if (tick < (e.cdByTarget[target.id] ?? 0)) return;
    e.cdByTarget[target.id] = tick + S.attackCdTicks;
    e.biteTick = tick;
    ctx.events.emit(tick, 'enemy_bite', { id: e.id, target: target.id });
    ctx.strike(e, [target], ctx.dmg(e, S.damage), e.x, e.z);
  },

  // The spore burst: a zero-distance glob at the corpse. A death HAZARD, so
  // Spore Sac (sim/relics.js) smothers it on a party kill.
  deathHazard: true,
  onDeath(ctx, e, tick) {
    ctx.spawnGlob(e, tick, {
      tx: e.x,
      tz: e.z,
      flightTicks: S.burstTicks,
      radius: S.burstRadius,
      power: ctx.dmg(e, S.burstDamage),
      slickRadius: S.burstRadius,
      slickTicks: S.slickTicks,
      slickSlow: S.slickSlow,
      // Not player-targeted: a corpse cannot wait on the governor, and the
      // player chose to stand there.
      playerTargeted: false,
      targetId: null,
    });
    ctx.events.emit(tick, 'rotcap_burst', { id: e.id, x: r2(e.x), z: r2(e.z), radius: S.burstRadius });
  },

  view(e) {
    return { mode: e.mode };
  },
};
