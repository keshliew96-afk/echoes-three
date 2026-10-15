// Vane Cock (plan 4 slice 7, docs/ACT_V.md "Two more creatures") — the
// volley. A brass weathercock torn off a steeple, still turning on its iron
// spindle and hopping on it (24 HP). It keeps 4.0-7.0 u from its target and,
// when it has a clear line, swings round into the wind and marks a VOLLEY:
// an Ember lane 0.9 u wide from itself through the target, up to 8 u long,
// for 48 ticks. Then it lets fly three gust darts down the lane, one every 9
// ticks, 7 each, along the locked line: step out of the lane and all three
// miss. A stun mid-wind-up cancels the volley; it tries again a little
// sooner. Cooldown 230 ticks from the last dart. Governor-gated like every
// player-targeted telegraph.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 24,
  moveSpeed: 1.5,
  radius: 0.3,
  damage: 7,
  attackCdTicks: 230,
  keepMin: 4.0,
  keepMax: 7.0,
  engageRange: 7.5,
  laneLength: 8.0,
  laneWidth: 0.9,
  telegraphTicks: 48,
  darts: 3,
  dartEvery: 9,
  dartSpeed: 6.2,
  dartRange: 8.5,
  stunCdTicks: 110,
  firstAttackDelay: 130,
  hopEvery: 40, // render: a hop on its spindle every this many ticks of travel
});

// One dart of a volley in flight, when its beat comes.
function dart(ctx, e, tick) {
  const v = e.volley;
  if (tick < v.next) return;
  ctx.fireShot(e, tick, v.dirX, v.dirZ, { speed: S.dartSpeed, range: S.dartRange, power: ctx.dmg(e, S.damage) });
  v.left -= 1;
  v.next = tick + S.dartEvery;
  if (v.left <= 0) {
    e.volley = null;
    e.mode = 'hop';
    e.nextAttackTick = tick + S.attackCdTicks;
  }
}

export default {
  id: 'vane',
  threat: 1.5,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'hop'; // hop | aim | volley
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.volley = null; // { dirX, dirZ, left, next } while the darts fly
    e.volleyTick = -1; // render: the volley clip
  },

  continuous(ctx, e, tick) {
    if (e.volley) return; // planted while it fires
    if (e.telegraph) {
      e.mode = 'aim';
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    if (e.mode === 'aim') {
      // A stun mid-wind-up cancelled the volley (enemies.js cancelTelegraph).
      e.nextAttackTick = tick + S.stunCdTicks;
    }
    e.mode = 'hop';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.45 * side, d.x * step * 0.45 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.volley) {
      dart(ctx, e, tick);
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      e.mode = 'volley';
      e.volleyTick = tick;
      e.volley = { dirX: t.dirX, dirZ: t.dirZ, left: S.darts, next: tick };
      ctx.events.emit(tick, 'vane_volley', { id: e.id, x: r2(e.x), z: r2(e.z), dx: r2(t.dirX), dz: r2(t.dirZ), darts: S.darts });
      dart(ctx, e, tick); // the first dart leaves on the release tick
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 1.2) return;
    // A clear line: nothing solid between it and the target.
    const c = ctx.movement.sweptContact(e.x, e.z, d.x * d.l, d.z * d.l, 0.07);
    if (c && c.t < 0.98) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'aim';
    ctx.face(e, d.x, d.z);
    const length = Math.min(S.laneLength, Math.max(d.l + 1.5, 4));
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
