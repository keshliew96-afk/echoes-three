// Briar Wasp (docs/CONTENT_PLAN.md §3, slice 2 — Hollow Wood) — the swarm. A
// wave draw of one wasp brings a SWARM of three (the leader plus two
// sisters; the trio rides on one threat cost). Each is a 10 HP flier that
// buzzes on a tight 2.6 u orbit around its target and DARTS: an Ember lane
// (0.6 u × up to 3.6 u through the target, 42 ticks) and a dart down it at
// 9 u/s, 4 damage to each party body it crosses. The three sisters' first
// darts are staggered (60 / 105 / 150 ticks after the spawn), so a swarm
// reads as a rolling string of small, short lanes rather than the moth's one
// long swoop. Fliers ignore ground hazards and blockers (`e.flier`).
// Cooldown 165 ticks from the dart start.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 10,
  moveSpeed: 2.7, // u/s buzzing
  radius: 0.22,
  damage: 4,
  attackCdTicks: 165,
  orbitR: 2.6,
  orbitBand: 0.4,
  engageRange: 3.3,
  dartSpeed: 9.0, // u/s
  laneLen: 3.6,
  laneWidth: 0.6,
  telegraphTicks: 42,
  swarm: 3, // bodies per wave draw
  sisterSpread: 0.7, // u from the leader
  firstAttackDelay: 60,
  staggerTicks: 45,
});

// The swarm spawns its sisters from inside the leader's spawn hook; this
// guard keeps a sister from spawning sisters of her own.
let spawningSisters = false;

export default {
  id: 'wasp',
  threat: 1.5, // for the whole swarm
  stats: S,
  telegraph: Object.freeze({ kind: 'lane', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.flier = true;
    e.mode = 'buzz'; // buzz | dart
    e.dartTicksLeft = 0;
    e.dartVx = 0;
    e.dartVz = 0;
    e.dartHits = [];
    e.swarmIndex = 0;
    e.nextAttackTick = tick + S.firstAttackDelay;
    if (spawningSisters) return;
    spawningSisters = true;
    try {
      for (let k = 1; k < S.swarm; k++) {
        const a = (k / S.swarm) * Math.PI * 2 + 0.6;
        const sis = ctx.spawnChild('wasp', e.x + Math.cos(a) * S.sisterSpread, e.z + Math.sin(a) * S.sisterSpread, {
          hpMul: e.maxHp / S.hp / (e.elite ? 1.8 : 1),
          dmgMul: e.dmgMul / (e.elite ? 1.25 : 1),
          wave: e.wave,
        });
        if (!sis) continue;
        sis.swarmIndex = k;
        sis.leaderId = e.id;
        sis.nextAttackTick = tick + S.firstAttackDelay + k * S.staggerTicks;
      }
    } finally {
      spawningSisters = false;
    }
  },

  continuous(ctx, e, tick) {
    const { movement } = ctx;
    if (e.mode === 'dart') {
      const k = ctx.speedMul(e, tick);
      const hit = movement.walkStep(e, e.dartVx * k, e.dartVz * k, e.radius);
      e.dartTicksLeft -= 1;
      if (hit || e.dartTicksLeft <= 0) {
        e.mode = 'buzz';
        ctx.events.emit(tick, 'enemy_swoop_end', { id: e.id, etype: e.kind, x: r2(e.x), z: r2(e.z) });
      }
      return;
    }
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (e.telegraph) {
      ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ);
      return;
    }
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    // A jittery orbit: the swarm index and the tick pick the side (no RNG).
    const side = (e.swarmIndex + Math.floor(tick / 90)) % 2 === 0 ? 1 : -1;
    if (d.l > S.orbitR + S.orbitBand) movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.orbitR - S.orbitBand) movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else movement.walkStep(e, -d.z * step * 0.7 * side, d.x * step * 0.7 * side, e.radius);
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode === 'dart') {
      const reach = S.laneWidth / 2;
      const hits = [];
      for (const t of ctx.registry.all()) {
        if (t.faction !== 'party' || !(t.hp > 0) || e.dartHits.includes(t.id)) continue;
        if (Math.hypot(t.x - e.x, t.z - e.z) <= reach + (t.radius ?? 0)) hits.push(t);
      }
      for (const t of hits) e.dartHits.push(t.id);
      if (hits.length) ctx.strike(e, hits, ctx.dmg(e, S.damage), e.x - e.dartVx * 4, e.z - e.dartVz * 4);
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      const perTick = S.dartSpeed / ctx.TICK_HZ;
      e.dartVx = t.dirX * perTick;
      e.dartVz = t.dirZ * perTick;
      e.dartTicksLeft = Math.max(1, Math.ceil(t.length / perTick));
      e.dartHits = [];
      e.mode = 'dart';
      ctx.endTelegraph(e, tick);
      // Same beat as the moth's swoop (the flyer VFX family picks it up).
      ctx.events.emit(tick, 'enemy_swoop', { id: e.id, etype: e.kind, x: r2(e.x), z: r2(e.z), dx: r2(t.dirX), dz: r2(t.dirZ), length: r2(t.length) });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.engageRange || d.l < 0.5) return;
    const playerTargeted = target.partyIndex !== undefined;
    if (playerTargeted && !ctx.governor.grants(tick)) return;
    const { mx, mz } = ctx.movement.innerBounds(e.radius);
    let length = S.laneLen;
    if (d.x > 1e-6) length = Math.min(length, (mx - e.x) / d.x);
    else if (d.x < -1e-6) length = Math.min(length, (-mx - e.x) / d.x);
    if (d.z > 1e-6) length = Math.min(length, (mz - e.z) / d.z);
    else if (d.z < -1e-6) length = Math.min(length, (-mz - e.z) / d.z);
    if (length < d.l + 0.15) return;
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
    return { mode: e.mode, swarmIndex: e.swarmIndex };
  },
};
