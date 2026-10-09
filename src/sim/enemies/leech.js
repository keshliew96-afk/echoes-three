// Mire Leech (content plan 3 slice 3 — Sunken Mill) — the latcher. A fat
// black leech (22 HP) that slithers at 2 u/s toward its target. Within
// 3 u it rears and marks a short Ember lane (0.6 u wide, up to 3.2 u) for
// 42 ticks, then LEAPS down it at 11 u/s. The first hero it touches is
// bitten for 5 and the leech LATCHES on: it rides on that hero, slows them
// by 25% and drains 3 every 30 ticks, healing itself by as much, for up to
// 150 ticks. It lets go the moment it is hit (anyone's hit: an ally can
// knock it off a friend), when its host dodges, when it is stunned or when
// it is full; then it lies flopped on the floor for 45 ticks. A leap that
// meets nobody ends in the same flop. Cooldown 200 ticks from the leap.
//
// All state lives on the leech (mode, latch host, clocks), so saves and
// snapshots carry a latch. The latched leech is moved onto its host in the
// continuous phase, before the host's own step reads it.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 22,
  moveSpeed: 2.0,
  radius: 0.26,
  biteDamage: 5,
  drainDamage: 3,
  drainEvery: 30,
  drainHeal: 3,
  latchTicks: 150,
  latchSlow: 0.25,
  engageRange: 3.0,
  leapLen: 3.2,
  laneWidth: 0.6,
  leapSpeed: 11.0,
  telegraphTicks: 42,
  attackCdTicks: 200,
  flopTicks: 45,
  shedDist: 0.9,
  firstAttackDelay: 70,
});

function shed(ctx, e, tick, cause) {
  const host = e.latchId != null ? ctx.registry.byId(e.latchId) : null;
  // Thrown off the way it came.
  const back = unit(e.latchOffX, e.latchOffZ);
  const bx = back.l > 1e-6 ? back.x : -(e.faceX ?? 0);
  const bz = back.l > 1e-6 ? back.z : -(e.faceZ ?? 1);
  if (host) {
    e.x = host.x;
    e.z = host.z;
  }
  ctx.movement.walkStep(e, bx * S.shedDist, bz * S.shedDist, e.radius);
  e.mode = 'flop';
  e.flopUntil = tick + S.flopTicks;
  e.latchId = null;
  ctx.events.emit(tick, 'leech_shed', { id: e.id, x: r2(e.x), z: r2(e.z), cause, host: host ? host.id : null });
}

export default {
  id: 'leech',
  threat: 1.3,
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'creep'; // creep | leap | latched | flop
    e.nextAttackTick = tick + S.firstAttackDelay;
    e.leapTicksLeft = 0;
    e.leapDx = 0;
    e.leapDz = 0;
    e.latchId = null;
    e.latchTick = -1;
    e.latchUntil = 0;
    e.latchOffX = 0;
    e.latchOffZ = 0;
    e.nextDrainTick = 0;
    e.flopUntil = 0;
  },

  continuous(ctx, e, tick) {
    if (e.mode === 'latched') {
      const host = e.latchId != null ? ctx.registry.byId(e.latchId) : null;
      if (host && host.hp > 0) {
        e.x = host.x + e.latchOffX;
        e.z = host.z + e.latchOffZ;
        ctx.face(e, -e.latchOffX, -e.latchOffZ);
      }
      return;
    }
    if (e.mode === 'leap') {
      const k = ctx.speedMul(e, tick);
      const hit = ctx.movement.walkStep(e, e.leapDx * k, e.leapDz * k, e.radius);
      e.leapTicksLeft -= 1;
      if (hit || e.leapTicksLeft <= 0) {
        e.mode = 'flop';
        e.flopUntil = tick + S.flopTicks;
        ctx.events.emit(tick, 'leech_miss', { id: e.id, x: r2(e.x), z: r2(e.z) });
      }
      return;
    }
    if (e.mode === 'flop' || e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const stop = S.engageRange * 0.7;
    if (d.l > stop) {
      // A slither: a slow side-to-side weave (no RNG).
      const step = ctx.stepLen(e, S.moveSpeed, tick);
      const w = Math.sin(tick * 0.12 + e.id) * 0.35;
      ctx.movement.walkStep(e, (d.x - d.z * w) * step, (d.z + d.x * w) * step, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'latched') {
      const host = e.latchId != null ? ctx.registry.byId(e.latchId) : null;
      if (!host || !(host.hp > 0)) return shed(ctx, e, tick, 'lost');
      if ((e.lastHitTick ?? -1) > e.latchTick) return shed(ctx, e, tick, 'hit');
      if ((host.iframeUntilTick ?? 0) > tick) return shed(ctx, e, tick, 'dodge');
      if (ctx.stunned(e, tick)) return shed(ctx, e, tick, 'stun');
      if (tick >= e.latchUntil) return shed(ctx, e, tick, 'full');
      if (tick >= e.nextDrainTick) {
        e.nextDrainTick = tick + S.drainEvery;
        const amt = ctx.dmg(e, S.drainDamage);
        ctx.strike(e, [host], amt, e.x, e.z, { delivery: 'skill', shape: 'contact' });
        const heal = Math.min(e.maxHp - e.hp, S.drainHeal * (e.dmgMul ?? 1));
        if (heal > 0) e.hp += heal;
        if (host.hp > 0) ctx.status.apply(host, 'slow', S.latchSlow, S.drainEvery + 6, tick, e.id);
        ctx.events.emit(tick, 'leech_drain', { id: e.id, host: host.id, x: r2(host.x), z: r2(host.z), healed: r2(Math.max(0, heal)) });
      }
      return;
    }
    if (e.mode === 'leap') {
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || t.kind === 'waystone') continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) > e.radius + (t.radius ?? 0) + 0.05) continue;
        // Latch on.
        e.mode = 'latched';
        e.latchId = t.id;
        e.latchTick = tick;
        e.latchUntil = tick + S.latchTicks;
        e.nextDrainTick = tick + S.drainEvery;
        const off = unit(e.x - t.x, e.z - t.z);
        const r = (t.radius ?? 0.3) * 0.8;
        e.latchOffX = r2((off.l > 1e-6 ? off.x : -e.leapDx) * r);
        e.latchOffZ = r2((off.l > 1e-6 ? off.z : -e.leapDz) * r);
        ctx.strike(e, [t], ctx.dmg(e, S.biteDamage), e.x, e.z, { delivery: 'skill', shape: 'contact' });
        if (t.hp > 0) ctx.status.apply(t, 'slow', S.latchSlow, S.drainEvery + 6, tick, e.id);
        ctx.events.emit(tick, 'leech_latch', { id: e.id, host: t.id, x: r2(t.x), z: r2(t.z) });
        return;
      }
      return;
    }
    if (e.mode === 'flop') {
      if (tick >= e.flopUntil) e.mode = 'creep';
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      const perTick = S.leapSpeed / ctx.TICK_HZ;
      e.leapDx = t.dirX * perTick;
      e.leapDz = t.dirZ * perTick;
      e.leapTicksLeft = Math.max(1, Math.ceil(t.length / perTick));
      e.mode = 'leap';
      ctx.endTelegraph(e, tick);
      ctx.events.emit(tick, 'leech_leap', { id: e.id, x: r2(e.x), z: r2(e.z), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length) });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 0.4) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    const { mx, mz } = ctx.movement.innerBounds(e.radius);
    let length = S.leapLen;
    if (d.x > 1e-6) length = Math.min(length, (mx - e.x) / d.x);
    else if (d.x < -1e-6) length = Math.min(length, (-mx - e.x) / d.x);
    if (d.z > 1e-6) length = Math.min(length, (mz - e.z) / d.z);
    else if (d.z < -1e-6) length = Math.min(length, (-mz - e.z) / d.z);
    if (length < d.l * 0.8) return;
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
    e.nextAttackTick = tick + S.telegraphTicks + S.attackCdTicks;
  },

  view(e) {
    return { mode: e.mode, latched: e.latchId };
  },
};
