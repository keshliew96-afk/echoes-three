// Lantern Snail (docs/CONTENT_PLAN.md §3.2 — Sunken Mill) — the first SUPPORT
// enemy. Slow (0.6 u/s), tanky (48 HP), no attack of its own: it keeps 3.5 u
// back from the party, drifting toward the middle of its own pack, and every
// 240 ticks its shell-lantern MENDS every other living non-boss hostile within
// 3.2 u for 12 HP (x its own damage scale, clamped at max HP). The mend is not
// an attack, so it has no Ember telegraph — the lantern swells for the 30
// ticks before it (render, `e.mendStartTick`). A priority target: leave it and
// the wave refuses to die.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 48,
  moveSpeed: 0.6, // u/s
  radius: 0.45,
  damage: 0, // no attack
  keepAway: 3.5, // u from the nearest party body
  mendCdTicks: 240,
  mendWindupTicks: 30,
  mendRadius: 3.2,
  mendAmount: 12,
  firstMendDelay: 120,
});

export default {
  id: 'snail',
  threat: 1.4,
  stats: S,
  telegraph: null,

  spawn(ctx, e, tick) {
    e.mode = 'creep';
    e.nextMendTick = tick + S.firstMendDelay;
    e.mendStartTick = -1; // render: lantern swell
    e.mendTick = -1; // render: the pulse
  },

  continuous(ctx, e, tick) {
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    // Toward the centroid of the other hostiles; away from the party inside keepAway.
    let cx = 0;
    let cz = 0;
    let n = 0;
    for (const o of ctx.registry.all()) {
      if (o.id === e.id || o.faction !== 'hostile' || o.state !== 'active' || !(o.hp > 0) || o.boss) continue;
      cx += o.x;
      cz += o.z;
      n += 1;
    }
    let mx = 0;
    let mz = 0;
    if (n > 0) {
      const d = unit(cx / n - e.x, cz / n - e.z);
      if (d.l > 1.2) {
        mx += d.x;
        mz += d.z;
      }
    }
    if (target) {
      const d = unit(target.x - e.x, target.z - e.z);
      if (d.l < S.keepAway) {
        mx -= d.x * 1.5;
        mz -= d.z * 1.5;
      } else if (n === 0) {
        mx += d.x;
        mz += d.z;
      }
      ctx.face(e, d.x, d.z);
    }
    const m = unit(mx, mz);
    if (m.l > 1e-6) {
      const step = ctx.stepLen(e, S.moveSpeed, tick);
      ctx.movement.walkStep(e, m.x * step, m.z * step, e.radius);
    }
  },

  resolve(ctx, e, tick) {
    if (e.mendStartTick < 0 && tick >= e.nextMendTick - S.mendWindupTicks) e.mendStartTick = tick;
    if (tick < e.nextMendTick) return;
    const healed = [];
    const amt = ctx.dmg(e, S.mendAmount);
    for (const o of ctx.registry.all()) {
      if (o.id === e.id || o.faction !== 'hostile' || o.state !== 'active' || !(o.hp > 0) || o.boss || o.kind === 'stag') continue;
      if (!ctx.isEnemyKind(o.kind)) continue;
      if (Math.hypot(o.x - e.x, o.z - e.z) > S.mendRadius + (o.radius ?? 0)) continue;
      const before = o.hp;
      o.hp = Math.min(o.maxHp ?? o.hp, o.hp + amt);
      if (o.hp > before) healed.push({ id: o.id, amount: r2(o.hp - before) });
    }
    e.mendTick = tick;
    e.mendStartTick = -1;
    e.nextMendTick = tick + S.mendCdTicks;
    ctx.events.emit(tick, 'snail_mend', { id: e.id, x: r2(e.x), z: r2(e.z), radius: S.mendRadius, healed });
  },

  view(e) {
    return { mode: e.mode };
  },
};
