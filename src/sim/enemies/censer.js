// Heart Censer (docs/ACT_IV.md — The Hollow Heart) — the mender of Act IV. A
// floating violet censer on a chain of bone, 14 HP, no attack of its own.
// Every 300 ticks it GATHERS for 48 ticks (its coals flare; nothing Ember,
// because nothing here hurts the party) and then MENDS: every other living
// hostile within 4.2 u (never a boss, never another censer) heals 15% of its
// max HP. It hangs 3.2 u behind the nearest of its kin, on the side away from
// the party, and flees a party body that comes within 2.4 u. A stun during
// the gather spills it (no mend, the clock starts again). Kill it first, or
// pull the fight away from it. No RNG.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 14,
  moveSpeed: 2.0,
  radius: 0.28,
  mendEvery: 300,
  gatherTicks: 48,
  mendRange: 4.2,
  mendFrac: 0.15,
  firstMend: 150,
  behind: 3.2,
  fleeRange: 2.4,
});

const mendable = (ctx, c, t) =>
  t.id !== c.id && t.faction === 'hostile' && t.state === 'active' && t.hp > 0 && t.boss !== true && t.kind !== 'stag' && t.kind !== 'censer' && ctx.isEnemyKind(t.kind);

function nearestKin(ctx, e) {
  let best = null;
  let bd = Infinity;
  for (const t of ctx.registry.all()) {
    if (!mendable(ctx, e, t)) continue;
    const d = Math.hypot(t.x - e.x, t.z - e.z);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

export default {
  id: 'censer',
  threat: 1.5,
  stats: S,

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'drift'; // drift | gather
    e.nextMendTick = tick + S.firstMend;
    e.gatherUntil = 0;
    e.mendTick = -1; // render: the mend pulse
  },

  continuous(ctx, e, tick) {
    if (e.kbTicks > 0) return;
    const foe = ctx.nearestTarget(e);
    const step = ctx.stepLen(e, S.moveSpeed, tick) * (e.mode === 'gather' ? 0.35 : 1);
    if (foe) {
      const f = unit(e.x - foe.x, e.z - foe.z);
      if (f.l < S.fleeRange) {
        ctx.movement.walkStep(e, f.x * step, f.z * step, e.radius);
        ctx.face(e, -f.x, -f.z);
        return;
      }
    }
    const kin = nearestKin(ctx, e);
    let gx = e.x;
    let gz = e.z;
    if (kin && foe) {
      const a = unit(kin.x - foe.x, kin.z - foe.z);
      gx = kin.x + a.x * S.behind;
      gz = kin.z + a.z * S.behind;
    } else if (foe) {
      const a = unit(e.x - foe.x, e.z - foe.z);
      gx = foe.x + a.x * 4.5;
      gz = foe.z + a.z * 4.5;
    }
    const g = unit(gx - e.x, gz - e.z);
    if (g.l > 0.1) {
      const s = Math.min(step, g.l);
      ctx.movement.walkStep(e, g.x * s, g.z * s, e.radius);
    }
    if (foe) ctx.face(e, foe.x - e.x, foe.z - e.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'gather') {
      // A stunned enemy's resolve does not run (enemies.js), so the spill is
      // read on the first tick after the stun: any stun that landed since
      // the gather began (its record, or the immunity it leaves) spills it.
      const st = e.status && (e.status.stun || e.status.stunImmune);
      if (ctx.stunned(e, tick) || (st && st.at >= e.gatherUntil - S.gatherTicks)) {
        e.mode = 'drift';
        e.nextMendTick = tick + S.mendEvery;
        ctx.events.emit(tick, 'censer_spill', { id: e.id, x: r2(e.x), z: r2(e.z) });
        return;
      }
      if (tick < e.gatherUntil) return;
      e.mode = 'drift';
      e.mendTick = tick;
      e.nextMendTick = tick + S.mendEvery;
      const healed = [];
      for (const t of ctx.registry.all()) {
        if (!mendable(ctx, e, t)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) > S.mendRange + (t.radius ?? 0)) continue;
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + t.maxHp * S.mendFrac);
        if (t.hp > before) healed.push({ id: t.id, amount: r2(t.hp - before) });
      }
      ctx.events.emit(tick, 'censer_mend', { id: e.id, x: r2(e.x), z: r2(e.z), radius: S.mendRange, healed });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextMendTick) return;
    // Only bothers when some kin is in reach.
    const kin = nearestKin(ctx, e);
    if (!kin || Math.hypot(kin.x - e.x, kin.z - e.z) > S.mendRange) return;
    e.mode = 'gather';
    e.gatherUntil = tick + S.gatherTicks;
    ctx.events.emit(tick, 'censer_gather', { id: e.id, x: r2(e.x), z: r2(e.z), radius: S.mendRange, untilTick: e.gatherUntil });
  },

  view(e) {
    return { mode: e.mode };
  },
};
