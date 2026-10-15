// Bell Sacristan (plan 4 slice 7, docs/ACT_V.md "Two more creatures") — the
// warder. A stooped stone acolyte of the belfry in a bell-shaped cope, ringing
// a hand bell (34 HP, slow). It hangs back 3.0-5.0 u from its target behind
// its kin and, when two or more of them stand within 3.6 u, marks a VESPER
// HUSH: a pale ring r 3.6 round itself for 54 ticks. When it rings, every
// other enemy inside (not a boss) is hushed for 5 s: it takes 40 % less
// damage. Kill the sacristan first, or stun it mid-ring to choke the hush.
// With no kin near it walks in and raps a hero with its bell: a cone r 1.6,
// half-angle 60°, 36 ticks, for 7. Cooldowns: hush 380 ticks, rap 150.
// The hush is not an attack on the party, so the governor never holds it;
// the rap is governor-gated like every player-targeted telegraph.
import { r2, unit } from './common.js';

const DEG = Math.PI / 180;
const S = Object.freeze({
  hp: 34,
  moveSpeed: 1.05,
  radius: 0.36,
  damage: 7,
  keepMin: 3.0,
  keepMax: 5.0,
  hushRadius: 3.6,
  hushTicks: 54,
  hushKin: 2, // kin inside the ring before it bothers to ring
  hushFor: 300, // ticks a hushed enemy keeps it
  hushTaken: 0.6, // damage taken while hushed
  hushCdTicks: 380,
  rapRadius: 1.6,
  rapHalfDeg: 60,
  rapTicks: 36,
  rapCdTicks: 150,
  chokeCdTicks: 140,
  firstAttackDelay: 110,
});

// The enemies a hush would cover: hostile, alive, not a boss, not itself.
function kinNear(ctx, e) {
  const out = [];
  for (const o of ctx.registry.all()) {
    if (o === e || o.faction !== 'hostile' || !(o.hp > 0) || o.boss === true || o.champion || o.kind === 'stag' || o.kind === 'eshot' || o.kind === 'eglob' || o.lifecycle === 'break') continue;
    if (!ctx.isEnemyKind(o.kind)) continue;
    if (Math.hypot(o.x - e.x, o.z - e.z) <= S.hushRadius + (o.radius ?? 0)) out.push(o);
  }
  return out;
}

export default {
  id: 'sacristan',
  threat: 1.6,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.hushTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'tend'; // tend | hush | rap
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.nextHushTick = tick + S.firstAttackDelay;
    e.ringTick = -1; // render: the hush clip
    e.rapTick = -1; // render: the rap clip
  },

  continuous(ctx, e, tick) {
    if (e.telegraph) {
      e.mode = e.telegraph.hush ? 'hush' : 'rap';
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    if (e.mode === 'hush') {
      // A stun mid-ring cancelled the hush (enemies.js cancelTelegraph).
      e.nextHushTick = tick + S.chokeCdTicks;
      ctx.events.emit(tick, 'sacristan_choke', { id: e.id, x: r2(e.x), z: r2(e.z) });
    }
    e.mode = 'tend';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    // With kin about it hangs back among them; alone it walks in to rap.
    const alone = kinNear(ctx, e).length === 0;
    const near = alone ? S.rapRadius - 0.3 + (target.radius ?? 0) : S.keepMin;
    const far = alone ? S.rapRadius : S.keepMax;
    if (d.l > far) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < near) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      e.mode = 'tend';
      if (t.hush) {
        const kin = kinNear(ctx, e);
        for (const o of kin) {
          o.hushUntil = tick + S.hushFor;
          o.hushMul = S.hushTaken;
        }
        e.ringTick = tick;
        e.nextHushTick = tick + S.hushCdTicks;
        e.nextAttackTick = Math.max(e.nextAttackTick, tick + 40);
        ctx.events.emit(tick, 'sacristan_hush', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, kin: kin.map((o) => o.id), untilTick: tick + S.hushFor });
        return;
      }
      // The rap: a short cone at the bell.
      const cosHalf = Math.cos(S.rapHalfDeg * DEG);
      const victims = [];
      for (const p of ctx.registry.all()) {
        if (p.faction !== 'party' || !(p.hp > 0)) continue;
        const v = unit(p.x - t.x, p.z - t.z);
        if (v.l > t.radius + (p.radius ?? 0)) continue;
        if (v.l > 1e-6 && v.x * t.dirX + v.z * t.dirZ < cosHalf) continue;
        victims.push(p);
      }
      e.rapTick = tick;
      e.nextAttackTick = tick + S.rapCdTicks;
      ctx.strike(e, victims, ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
      ctx.events.emit(tick, 'sacristan_rap', { id: e.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), victims: victims.length });
      return;
    }
    if (ctx.stunned(e, tick)) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    // The hush first: it is what the sacristan is for.
    if (tick >= e.nextHushTick && kinNear(ctx, e).length >= S.hushKin) {
      e.mode = 'hush';
      ctx.startTelegraph(e, tick, {
        kind: 'ring',
        startTick: tick,
        resolveTick: tick + S.hushTicks,
        x: e.x,
        z: e.z,
        dirX: d.x,
        dirZ: d.z,
        radius: S.hushRadius,
        hush: true, // a ward on its kin, never a hit (render: pale, not Ember)
        playerTargeted: false,
        targetId: target.id,
      });
      return;
    }
    if (tick < e.nextAttackTick || d.l > S.rapRadius + (target.radius ?? 0)) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    e.mode = 'rap';
    ctx.startTelegraph(e, tick, {
      kind: 'cone',
      startTick: tick,
      resolveTick: tick + S.rapTicks,
      x: e.x,
      z: e.z,
      dirX: d.x,
      dirZ: d.z,
      radius: S.rapRadius,
      halfAngleDeg: S.rapHalfDeg,
      playerTargeted,
      targetId: target.id,
    });
  },

  view(e) {
    return { mode: e.mode };
  },
};
