// Bog Lamprey (docs/CONTENT_PLAN.md §3, slice 2 — Sunken Mill) — the
// ambusher. A 28 HP eel that LURKS submerged (untargetable: `hittable:
// false`, `burrowed: true`, only a ripple shows). It glides at 1.6 u/s to a
// lurk spot 3.0 u from its target — on the millrace when the room has one
// within reach, so the water itself is where it waits. When its target is
// 2.0–4.6 u away it breaks the surface and telegraphs a LUNGE: an Ember lane
// (0.9 u × up to 5.0 u through the target, 48 ticks), then it shoots down the
// lane at 10 u/s and bites the party bodies it crosses for 12 (once each).
// The lunge BEACHES it: it flops, hittable, for 110 ticks (the punish
// window) before it slides back under. Unlike the Grave Mole (a ring under
// your feet), the lamprey hits from range, along a line, and pays for it.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 28,
  moveSpeed: 1.6, // submerged
  radius: 0.34,
  damage: 12,
  lurkDist: 3.0,
  lungeMin: 2.0,
  lungeMax: 4.6,
  laneLen: 5.0,
  laneWidth: 0.9,
  telegraphTicks: 48,
  lungeSpeed: 10.0,
  beachTicks: 110,
  firstAttackDelay: 90,
  raceReach: 3.5, // a millrace point this close to the lurk spot is preferred
});

function submerge(ctx, e, tick) {
  e.mode = 'lurk';
  e.burrowed = true;
  e.hittable = false;
  e.knockbackable = false;
  e.kbTicks = 0;
  ctx.events.emit(tick, 'enemy_burrow', { id: e.id, etype: e.kind, cause: 'dive', x: r2(e.x), z: r2(e.z) });
}

// Nearest point on any millrace lane to (x, z), or null.
function racePoint(ctx, x, z) {
  let best = null;
  let bd = Infinity;
  for (const h of ctx.registry.all()) {
    if (h.kind !== 'hazard' || h.htype !== 'millrace') continue;
    const x0 = h.x0 ?? h.x - 3;
    const z0 = h.z0 ?? h.z;
    const x1 = h.x1 ?? h.x + 3;
    const z1 = h.z1 ?? h.z;
    const lx = x1 - x0;
    const lz = z1 - z0;
    const L2 = lx * lx + lz * lz || 1;
    const u = Math.max(0, Math.min(1, ((x - x0) * lx + (z - z0) * lz) / L2));
    const px = x0 + lx * u;
    const pz = z0 + lz * u;
    const d = Math.hypot(px - x, pz - z);
    if (d < bd) {
      bd = d;
      best = { x: px, z: pz, d };
    }
  }
  return best;
}

export default {
  id: 'lamprey',
  threat: 1.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'lurk'; // lurk | rise | lunge | beached
    e.burrowed = true;
    e.hittable = false;
    e.knockbackable = false;
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.lungeTicksLeft = 0;
    e.lungeVx = 0;
    e.lungeVz = 0;
    e.lungeHits = [];
    e.beachUntil = 0;
  },

  continuous(ctx, e, tick) {
    if (e.mode === 'lunge') {
      const hit = ctx.movement.walkStep(e, e.lungeVx, e.lungeVz, e.radius);
      e.lungeTicksLeft -= 1;
      if (hit || e.lungeTicksLeft <= 0) {
        e.mode = 'beached';
        e.beachUntil = tick + S.beachTicks;
        e.knockbackable = true;
        ctx.events.emit(tick, 'lamprey_beach', { id: e.id, x: r2(e.x), z: r2(e.z) });
      }
      return;
    }
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    if (e.mode === 'rise') {
      if (e.telegraph) ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    if (e.mode === 'beached') {
      return; // flops in place
    }
    // Lurk: glide (under everything) to a spot lurkDist from the target, on
    // the millrace when one is close to that spot.
    const d = unit(e.x - target.x, e.z - target.z);
    const dir = d.l > 1e-6 ? d : { x: 0, z: -1 };
    let gx = target.x + dir.x * S.lurkDist;
    let gz = target.z + dir.z * S.lurkDist;
    const rp = racePoint(ctx, gx, gz);
    // Balance pass: a race point outside the lunge band is skipped. Waiting
    // there, too close or too far to lunge, with the party idle (nothing it
    // can hit) left a room live forever.
    const rd = rp ? Math.hypot(rp.x - target.x, rp.z - target.z) : 0;
    if (rp && rp.d <= S.raceReach && rd >= S.lungeMin + 0.2 && rd <= S.lungeMax - 0.2) {
      gx = rp.x;
      gz = rp.z;
    }
    const g = unit(gx - e.x, gz - e.z);
    if (g.l > 0.1) {
      const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), g.l);
      ctx.movement.walkStep(e, g.x * step, g.z * step, e.radius);
    }
    ctx.face(e, target.x - e.x, target.z - e.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'lunge') {
      const reach = S.laneWidth / 2;
      const hits = [];
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || e.lungeHits.includes(t.id)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) <= reach + (t.radius ?? 0)) hits.push(t);
      }
      for (const t of hits) e.lungeHits.push(t.id);
      if (hits.length) ctx.strike(e, hits, ctx.dmg(e, S.damage), e.x - e.lungeVx * 4, e.z - e.lungeVz * 4);
      return;
    }
    if (e.mode === 'beached') {
      if (tick >= e.beachUntil && e.state === 'active') {
        submerge(ctx, e, tick);
        e.nextAttackTick = tick + 60;
      }
      return;
    }
    if (e.mode === 'rise') {
      if (!e.telegraph) {
        // Cancelled (a stun): back under.
        submerge(ctx, e, tick);
        return;
      }
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      const perTick = S.lungeSpeed / ctx.TICK_HZ;
      e.lungeVx = t.dirX * perTick;
      e.lungeVz = t.dirZ * perTick;
      e.lungeTicksLeft = Math.max(1, Math.ceil(t.length / perTick));
      e.lungeHits = [];
      e.mode = 'lunge';
      ctx.endTelegraph(e, tick);
      ctx.events.emit(tick, 'lamprey_lunge', { id: e.id, x: r2(e.x), z: r2(e.z), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length) });
      return;
    }
    // Lurking.
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l < S.lungeMin || d.l > S.lungeMax) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    const { mx, mz } = ctx.movement.innerBounds(e.radius);
    let length = S.laneLen;
    if (d.x > 1e-6) length = Math.min(length, (mx - e.x) / d.x);
    else if (d.x < -1e-6) length = Math.min(length, (-mx - e.x) / d.x);
    if (d.z > 1e-6) length = Math.min(length, (mz - e.z) / d.z);
    else if (d.z < -1e-6) length = Math.min(length, (-mz - e.z) / d.z);
    if (length < d.l + 0.2) return;
    // Breaks the surface: hittable through the wind-up.
    e.mode = 'rise';
    e.burrowed = false;
    e.hittable = true;
    ctx.events.emit(tick, 'enemy_emerge', { id: e.id, etype: e.kind, x: r2(e.x), z: r2(e.z), radius: 0, victims: 0 });
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
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode, burrowed: !!e.burrowed };
  },
};
