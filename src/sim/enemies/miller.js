// Drowned Miller (content plan 3 slice 3 — Sunken Mill) — the bruiser. The
// mill's last miller, walked up out of the race (48 HP), swinging a small
// millstone on a chain. He plods at 1.1 u/s straight at his target and has
// two moves, each governor-gated:
//   Flail Sweep  within 1.9 u: he plants his feet and whirls the stone; an
//                Ember ring round him (r 2.2 u, 60 ticks) lands for 13. The
//                longest wind-up in the Mill: walk out of the ring.
//   Sack Toss    at 3-6.5 u, at most every 300 ticks: he heaves a sodden
//                flour sack at where the hero stands. The Ember ring where
//                it lands (r 1.1 u, 60 ticks of flight) hits for 10 and
//                leaves a paste of wet flour that slows by 40% for 5 s.
// Cooldown 200 ticks after either move. The sack is a lobbed glob (it flies
// over barricades and lands even if he dies); the paste is a slick with the
// `flour` variant.
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 48,
  moveSpeed: 1.1,
  radius: 0.42,
  sweepDamage: 13,
  sweepRadius: 2.2,
  sweepRange: 1.9,
  sweepTicks: 60,
  sackDamage: 10,
  sackRadius: 1.1,
  sackFlight: 60,
  sackMin: 3.0,
  sackMax: 6.5,
  sackCdTicks: 300,
  slickRadius: 1.2,
  slickTicks: 300,
  slickSlow: 0.4,
  attackCdTicks: 200,
  firstAttackDelay: 80,
});

export default {
  id: 'miller',
  threat: 2.4,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.sweepTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'plod'; // plod | whirl
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.nextSackTick = tick + S.firstAttackDelay + 60;
    e.sweepTick = -1; // render: the sweep clip
    e.tossTick = -1; // render: the toss clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'whirl';
      return;
    }
    e.mode = 'plod';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const stop = 1.1 + (target.radius ?? 0);
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
      e.sweepTick = tick;
      e.mode = 'plod';
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'miller_sweep', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims.concat(props), ctx.dmg(e, S.sweepDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const playerTargeted = target.partyIndex !== undefined;
    if (d.l <= S.sweepRange + (target.radius ?? 0)) {
      if (playerTargeted && !ctx.governor.grants(tick)) return;
      e.mode = 'whirl';
      ctx.startTelegraph(e, tick, {
        kind: 'ring',
        startTick: tick,
        resolveTick: tick + S.sweepTicks,
        x: e.x,
        z: e.z,
        dirX: e.faceX ?? 0,
        dirZ: e.faceZ ?? 1,
        radius: S.sweepRadius,
        playerTargeted,
        targetId: target.id,
      });
      return;
    }
    if (d.l < S.sackMin || d.l > S.sackMax || tick < e.nextSackTick) return;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.tossTick = tick;
    e.nextSackTick = tick + S.sackCdTicks;
    e.nextAttackTick = tick + S.attackCdTicks;
    ctx.spawnGlob(e, tick, {
      tx: target.x,
      tz: target.z,
      flightTicks: S.sackFlight,
      radius: S.sackRadius,
      power: ctx.dmg(e, S.sackDamage),
      slickRadius: S.slickRadius,
      slickTicks: S.slickTicks,
      slickSlow: S.slickSlow,
      slickVariant: 'flour',
      sack: true,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
