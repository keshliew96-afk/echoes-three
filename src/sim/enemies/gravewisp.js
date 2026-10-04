// Grave Wisp (docs/CONTENT_PLAN.md §3, slice 2 — Ashen Barrow) — the warder.
// A 12 HP flier with no attack of its own. It TETHERS to the nearest other
// enemy within 5.5 u (never a boss, a broodling or another wisp) and, while
// the tether holds, that enemy is IMMUNE: every instance on it resolves as
// `hit_immune` (the same iframe check the party's dodge uses). A tether lasts
// 240 ticks, snaps when the pair drift more than 6.5 u apart, and then the
// wisp needs 150 ticks to gather a new one — so it reads as a rhythm (kill
// the wisp, or wait out the ward and burst the target), never a wall. It
// hovers 1.6 u behind its ward, on the side away from the party, and flees
// a party body that comes within 2.2 u.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 12,
  moveSpeed: 2.3,
  radius: 0.24,
  tetherRange: 5.5,
  tetherBreak: 6.5,
  tetherTicks: 240,
  regatherTicks: 150,
  firstTether: 45,
  behind: 1.6,
  fleeRange: 2.2,
});

const wardable = (ctx, w, t) =>
  t.id !== w.id &&
  t.faction === 'hostile' &&
  t.state === 'active' &&
  t.hp > 0 &&
  t.boss !== true &&
  t.kind !== 'stag' &&
  t.kind !== 'gravewisp' &&
  t.kind !== 'broodling' &&
  !t.wardedBy &&
  ctx.isEnemyKind(t.kind);

function dropTether(ctx, e, tick, cause) {
  const t = e.tetherId != null ? ctx.registry.byId(e.tetherId) : null;
  if (t && t.wardedBy === e.id) {
    t.wardedBy = null;
    t.iframeUntilTick = Math.min(t.iframeUntilTick ?? 0, tick);
  }
  if (e.tetherId != null) ctx.events.emit(tick, 'wisp_tether_end', { id: e.id, target: e.tetherId, cause });
  e.tetherId = null;
  e.nextTetherTick = tick + S.regatherTicks;
}

export default {
  id: 'gravewisp',
  threat: 1.4,
  stats: S,

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'drift'; // drift | ward
    e.tetherId = null;
    e.tetherUntil = 0;
    e.nextTetherTick = tick + S.firstTether;
  },

  continuous(ctx, e, tick) {
    // Keep the ward live through this tick's damage (both phases).
    const ward = e.tetherId != null ? ctx.registry.byId(e.tetherId) : null;
    if (ward && ward.wardedBy === e.id) ward.iframeUntilTick = Math.max(ward.iframeUntilTick ?? 0, tick + 2);
    if (e.kbTicks > 0) return;
    const foe = ctx.nearestTarget(e);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (foe) {
      const f = unit(e.x - foe.x, e.z - foe.z);
      if (f.l < S.fleeRange) {
        ctx.movement.walkStep(e, f.x * step, f.z * step, e.radius);
        return;
      }
    }
    let gx = e.x;
    let gz = e.z;
    if (ward && foe) {
      const a = unit(ward.x - foe.x, ward.z - foe.z);
      gx = ward.x + a.x * S.behind;
      gz = ward.z + a.z * S.behind;
    } else if (foe) {
      // No ward: hang back 4 u from the party.
      const a = unit(e.x - foe.x, e.z - foe.z);
      gx = foe.x + a.x * 4;
      gz = foe.z + a.z * 4;
    }
    const g = unit(gx - e.x, gz - e.z);
    if (g.l > 0.1) {
      const s = Math.min(step, g.l);
      ctx.movement.walkStep(e, g.x * s, g.z * s, e.radius);
    }
    if (ward) ctx.face(e, ward.x - e.x, ward.z - e.z);
    else if (foe) ctx.face(e, foe.x - e.x, foe.z - e.z);
  },

  resolve(ctx, e, tick) {
    if (e.tetherId != null) {
      const t = ctx.registry.byId(e.tetherId);
      const gone = !t || !(t.hp > 0) || t.state !== 'active';
      if (gone) return dropTether(ctx, e, tick, 'ward_gone');
      if (Math.hypot(t.x - e.x, t.z - e.z) > S.tetherBreak) return dropTether(ctx, e, tick, 'stretched');
      if (tick >= e.tetherUntil) return dropTether(ctx, e, tick, 'faded');
      if (ctx.stunned(e, tick)) return dropTether(ctx, e, tick, 'stun');
      t.iframeUntilTick = Math.max(t.iframeUntilTick ?? 0, tick + 2);
      return;
    }
    e.mode = 'drift';
    if (ctx.stunned(e, tick) || tick < e.nextTetherTick) return;
    let best = null;
    let bd = Infinity;
    for (const t of ctx.registry.all()) {
      if (!wardable(ctx, e, t)) continue;
      const d = Math.hypot(t.x - e.x, t.z - e.z);
      if (d <= S.tetherRange && d < bd) {
        bd = d;
        best = t;
      }
    }
    if (!best) return;
    e.tetherId = best.id;
    e.tetherUntil = tick + S.tetherTicks;
    e.mode = 'ward';
    best.wardedBy = e.id;
    best.iframeUntilTick = Math.max(best.iframeUntilTick ?? 0, tick + 2);
    ctx.events.emit(tick, 'wisp_tether', { id: e.id, target: best.id, etype: best.kind, x: r2(best.x), z: r2(best.z) });
  },

  // A dead wisp frees its ward at once.
  onDeath(ctx, e, tick) {
    if (e.tetherId != null) dropTether(ctx, e, tick, 'wisp_died');
  },

  view(e) {
    return { mode: e.mode, tether: e.tetherId };
  },
};
