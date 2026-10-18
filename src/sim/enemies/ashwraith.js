// Ash Wraith (content plan 5 slice 9, docs/KILN.md "Two more creatures") —
// the Kiln's stalker. A tall shape of grey ash round a last ember, with long
// cinder claws (24 HP). It drifts to 2.4-5.0 u of its target, then FADES
// into a swirl of ash: it is gone (untargetable) while an Ember ring r 1.3
// opens BEHIND the hero, on the far side from where it faded (60 ticks).
// It rises out of the ash on the mark and rakes for 11. Then it stands
// spent for 90 ticks, slowed and taking 30 % more damage (the punish
// window). A stun before it fades stops it; once gone it cannot be stopped,
// so watch your back and step out of the ring. Cooldown 260 ticks from the
// rake. Governor-gated like every player-targeted telegraph. No RNG.
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';

const S = Object.freeze({
  hp: 24,
  moveSpeed: 1.7,
  radius: 0.32,
  damage: 11,
  attackCdTicks: 260,
  keepMin: 2.4,
  keepMax: 5.0,
  fadeRange: 5.4, // it fades on a hero this close...
  fadeMin: 1.2, // ...and no closer
  behind: 1.4, // the mark sits this far behind the hero
  rakeRadius: 1.3,
  telegraphTicks: 60,
  spentTicks: 90,
  spentTaken: 1.3,
  spentSlow: 0.5,
  firstAttackDelay: 120,
});

function unveil(e) {
  e.veiled = false;
  e.hittable = e.state === 'active';
  e.knockbackable = true;
}

export default {
  id: 'ashwraith',
  threat: 1.7,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'drift'; // drift | gone | spent
    e.veiled = false;
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.spentUntil = 0;
    e.rakeTick = -1; // render: the rake clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = 'gone';
      return; // in the ash: it does not move until it rises
    }
    if (e.veiled) unveil(e); // a cancelled rise (never a stun: it cannot be hit) still brings it back
    if (e.spentUntil > tick) {
      e.mode = 'spent';
      return;
    }
    if (e.mode === 'spent') {
      delete e.takenMul;
      ctx.events.emit(tick, 'ashwraith_recover', { id: e.id, x: r2(e.x), z: r2(e.z) });
    }
    e.mode = 'drift';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step * 0.8, -d.z * step * 0.8, e.radius);
    else {
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.5 * side, d.x * step * 0.5 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      // It rises on the mark.
      const fromX = e.x;
      const fromZ = e.z;
      e.x = t.x;
      e.z = t.z;
      e.px = t.x;
      e.pz = t.z;
      unveil(e);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      e.mode = 'spent';
      e.rakeTick = tick;
      e.spentUntil = tick + S.spentTicks;
      e.takenMul = S.spentTaken;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.status.apply(e, 'slow', S.spentSlow, S.spentTicks, tick, e.id);
      ctx.face(e, t.dirX, t.dirZ);
      ctx.events.emit(tick, 'ashwraith_rake', { id: e.id, x: r2(t.x), z: r2(t.z), fromX: r2(fromX), fromZ: r2(fromZ), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims, ctx.dmg(e, S.damage), t.x - t.dirX, t.z - t.dirZ, { delivery: 'skill', shape: 'ring' });
      ctx.strike(e, neutralsInRadius(ctx.registry, t.x, t.z, t.radius), ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick || e.spentUntil > tick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l < S.fadeMin || d.l > S.fadeRange) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    // The mark: behind the hero, on the far side from the wraith, inside
    // the room.
    const { mx, mz } = ctx.movement.innerBounds(e.radius + 0.1);
    const x = Math.max(-mx, Math.min(mx, target.x + d.x * S.behind));
    const z = Math.max(-mz, Math.min(mz, target.z + d.z * S.behind));
    e.mode = 'gone';
    e.veiled = true;
    e.hittable = false;
    e.knockbackable = false;
    e.kbTicks = 0;
    // It faces back toward the hero from the mark when it rises.
    const back = unit(target.x - x, target.z - z);
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x,
      z,
      dirX: back.l > 1e-6 ? back.x : -d.x,
      dirZ: back.l > 1e-6 ? back.z : -d.z,
      radius: S.rakeRadius,
      playerTargeted,
      targetId: target.id,
    });
    ctx.events.emit(tick, 'ashwraith_fade', { id: e.id, x: r2(e.x), z: r2(e.z), toX: r2(x), toZ: r2(z) });
  },

  view(e) {
    return { mode: e.mode, ...(e.veiled ? { veiled: true } : {}) };
  },
};
