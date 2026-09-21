// Mire Toad (BUILD_BRIEF §23.5) — a squat artillery body that keeps 3.0–5.5 u
// from its target and LOBS a glob at the target's position, locked when the
// throw starts. The glob is its own entity (kind 'eglob', see enemies.js): it
// arcs for 60 ticks — the Ember ring r 0.9 at the landing point is the
// telegraph — lands for 12 damage in r 0.9 and leaves a slick (r 0.9, 180
// ticks) that slows party bodies inside by 30%. Lobbed: it passes over
// barricades and survives the toad's death (a thrown glob is in the air).
// Cooldown 204 ticks.
import { unit } from './common.js';

const S = Object.freeze({
  hp: 34,
  moveSpeed: 1.0, // u/s
  radius: 0.42,
  damage: 12,
  attackCdTicks: 204,
  keepMin: 3.0, // u
  keepMax: 5.5, // u
  lobRange: 6.2, // u — throws from anywhere in its band plus a margin (scaffold)
  blastRadius: 0.9,
  slickRadius: 0.9,
  slickTicks: 180,
  slickSlow: 0.3,
  flightTicks: 60, // the ring telegraph (1.0 s)
  firstAttackDelay: 50,
});

export default {
  id: 'toad',
  threat: 1.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.flightTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'hold';
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.throwTick = -1; // render: the throw clip
  },

  continuous(ctx, e, tick) {
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      // Slow sidestep inside the band; direction by spawn-ordinal parity (no RNG).
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.35 * side, d.x * step * 0.35 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = Math.hypot(target.x - e.x, target.z - e.z);
    if (d > S.lobRange) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    ctx.spawnGlob(e, tick, {
      tx: target.x,
      tz: target.z,
      flightTicks: S.flightTicks,
      radius: S.blastRadius,
      power: ctx.dmg(e, S.damage),
      slickRadius: S.slickRadius,
      slickTicks: S.slickTicks,
      slickSlow: S.slickSlow,
      playerTargeted,
      targetId: target.id,
    });
    e.throwTick = tick;
    e.nextAttackTick = tick + S.attackCdTicks;
  },

  view(e) {
    return { mode: e.mode };
  },
};
