// Ash Keener (content plan 3 slice 4, docs/NEW_ENEMIES_BARROW_HEART.md —
// Ashen Barrow) — the mourner. A shrouded figure in grey grave-cloth, 24 HP,
// that walks at 1.45 u/s to a mid range of 2.0-3.4 u and KEENS: it throws
// back its hood and wails down a long, narrow Ember cone (radius 4.2 u,
// half-angle 28°, 54 ticks, aim locked at the start). Every party body inside
// when it lands takes 10 and is SLOWED by 40% for 2 s (120 ticks) — the
// grief settles on the legs. Step out sideways and the cone misses; stay in
// it and the next bite from the Barrow's rushers is hard to walk away from.
// Governor-gated like every player-targeted telegraph; cooldown 270 ticks.
// No RNG: the strafe side is spawn-ordinal parity.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 24,
  moveSpeed: 1.45,
  radius: 0.3,
  damage: 10,
  slow: 0.4,
  slowTicks: 120,
  attackCdTicks: 270,
  keepMin: 2.0,
  keepMax: 3.4,
  engageRange: 3.9, // starts a wail when its target is this close
  coneRadius: 4.2,
  coneHalfAngleDeg: 28,
  telegraphTicks: 54,
  firstAttackDelay: 80,
});

const DEG = Math.PI / 180;

// Party (and neutral breakable) bodies inside the cone record `t`.
export function inCone(registry, t) {
  const cosHalf = Math.cos(t.halfAngleDeg * DEG);
  const out = [];
  for (const p of registry.all()) {
    const party = p.faction === 'party';
    if (!(party || (p.faction === 'neutral' && p.hittable)) || !(p.hp > 0)) continue;
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
  id: 'keener',
  threat: 1.4,
  stats: S,
  telegraph: Object.freeze({ kind: 'cone', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'drift'; // drift | keen
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.wailTick = -1; // render: the wail clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return; // planted for the keen
    }
    e.mode = 'drift';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      // A slow mourning drift across the line between wails.
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.3 * side, d.x * step * 0.3 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = inCone(ctx.registry, t);
      const party = victims.filter((v) => v.faction === 'party');
      e.mode = 'drift';
      e.wailTick = tick;
      e.nextAttackTick = tick + S.attackCdTicks;
      ctx.events.emit(tick, 'keener_wail', { id: e.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), radius: t.radius, halfAngleDeg: t.halfAngleDeg, victims: party.length });
      ctx.strike(e, victims, ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
      // The grief: every party body the wail found is slowed (a downed or
      // dead one refuses nothing — apply() needs a live record only).
      for (const v of party) if (v.hp > 0) ctx.status.apply(v, 'slow', S.slow, S.slowTicks, tick, e.id);
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 1e-6) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'keen';
    ctx.face(e, d.x, d.z);
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
