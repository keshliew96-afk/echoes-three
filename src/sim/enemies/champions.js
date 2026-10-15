// CHAMPIONS (docs/CHAMPIONS.md, content plan 3 slice 1): the named
// mini-bosses behind the crown door, one per land. Each speaks the archetype
// module contract (sim/enemies.js ARCHETYPES) with two telegraphed moves
// under the §11 governor, alternating, plus a once-only rage at half health
// (shorter cooldowns, a little more speed). Never elite (no affixes, no
// elite relic drop): the chest is the champion's reward.
//
//   briar_knight   Hollow Wood. A thorn-armoured knight on root legs with a
//                  briar lance.
//                  Bramble Charge  a lane up to 6.5 u (60 ticks), then it
//                                  charges down it, 16 to each hero it meets
//                  Thorn Ring      a ring r 2.8 round itself (72 ticks), 14,
//                                  and a thorn thicket stays (slow 35 %)
//   sluice_warden  Sunken Mill. A hulking weir-keeper with a sluice-gate
//                  shield and a millstone maul.
//                  Floodgate       a cone r 3.4, half-angle 42° (66 ticks), 18
//                  Undertow        a ring r 1.9 under a hero (78 ticks), 12,
//                                  and the floor stays flooded (slow 40 %)
//   bone_reeve     Ashen Barrow. A tall skeletal reeve with a grave scythe.
//                  Reaping Sweep   a cone r 2.7, half-angle 75° (54 ticks), 16
//                  Grave Lance     a lane 8 u x 1.1 (66 ticks): bone spikes
//                                  burst along it, 14
//   hollow_choir   The Hollow Heart. Three hollow choristers fused round a
//                  violet heart, floating; it keeps its distance.
//                  Discord         a ring r 3.2 round itself (72 ticks), 15
//                  Shard Hymn      a cone r 6, half-angle 28° (60 ticks), then
//                                  a fan of five crystal shards, 9 each
//   gale_herald    The Still Spire (plan 4 slice 7). A winged stone herald of
//                  the gods' belfry with a long bronze horn; it keeps to the
//                  middle distance.
//                  Gale Call       a cone r 5.2, half-angle 34° (60 ticks):
//                                  the horn blasts for 12 and throws every
//                                  hero in it 2.4 u away down the wind
//                  Stoop           a ring r 2.1 under a hero up to 7.5 u off
//                                  (72 ticks): it takes wing and glides over,
//                                  landing on the mark at the end for 17
//                                  (over barricades and hazards while aloft)
//
// Sim discipline as every archetype: plain data on the entity, no RNG draws
// (the move order alternates; the circling side is spawn-ordinal parity).
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';
import { inLane } from './lancer.js';
import { CHAMPION_RULES } from '../champions.js';

const DEG = Math.PI / 180;
const R = CHAMPION_RULES;

// Party bodies inside a cone (apex x,z; facing dir; radius; half-angle).
function inCone(registry, t) {
  const cosHalf = Math.cos(t.halfAngleDeg * DEG);
  const out = [];
  for (const p of registry.all()) {
    const party = p.faction === 'party';
    if (!(party || (p.faction === 'neutral' && p.hittable)) || !(p.hp > 0)) continue;
    const v = unit(p.x - t.x, p.z - t.z);
    if (v.l > t.radius + (p.radius ?? 0)) continue;
    if (v.l > 1e-6 && v.x * t.dirX + v.z * t.dirZ < cosHalf) continue;
    out.push(p);
  }
  return out;
}
const partyOnly = (list) => list.filter((p) => p.faction === 'party').length;

// Distance along (dx, dz) from (x, z) to the arena's inner box.
function clipLength(ctx, x, z, dx, dz, len) {
  const { mx, mz } = ctx.movement.innerBounds(0.1);
  let t = len;
  if (dx > 1e-6) t = Math.min(t, (mx - x) / dx);
  if (dx < -1e-6) t = Math.min(t, (-mx - x) / dx);
  if (dz > 1e-6) t = Math.min(t, (mz - z) / dz);
  if (dz < -1e-6) t = Math.min(t, (-mz - z) / dz);
  return Math.max(1, t);
}

// A throw or a drag (plain data on the champion, so a save mid-throw
// continues): e.shove = { pushes: [[id, dx, dz, per?]], ticksLeft, per }.
// Heroes ignore knockback, so the champion moves them itself, a few ticks.
function shoveStep(ctx, e) {
  if (!e.shove) return;
  const base = e.shove.per ?? GH.throwDist / GH.throwTicks; // (a pre-slice-8 save: only the Gale Call threw)
  for (const [id, dx, dz, per] of e.shove.pushes) {
    const p = ctx.registry.byId(id);
    const len = per ?? base;
    if (p && p.hp > 0) ctx.movement.walkStep(p, dx * len, dz * len, p.radius ?? 0.3);
  }
  e.shove.ticksLeft -= 1;
  if (e.shove.ticksLeft <= 0) e.shove = null;
}
// Heroes in `victims` still standing, thrown `dist` u away from (x, z) (or
// along the move's facing when standing on it), over `ticks`.
function throwFrom(e, victims, x, z, fx, fz, dist, ticks) {
  const pushes = [];
  for (const v of victims) {
    if (v.partyIndex === undefined || !(v.hp > 0)) continue;
    const u = unit(v.x - x, v.z - z);
    pushes.push(u.l > 1e-6 ? [v.id, u.x, u.z] : [v.id, fx, fz]);
  }
  if (pushes.length) e.shove = { pushes, ticksLeft: ticks, per: dist / ticks };
}
// A glide or a leap over a move's warning: e.flight = { x0, z0, x1, z1,
// from?, to?, move? } carries the champion from where it rose to the mark
// between the `from` and `to` shares of the warning (the Gale Herald's
// Stoop: 0 to 0.8). Aloft it is a flier (over barricades and hazards).
function flightStep(ctx, e, tick) {
  if (!e.flight) return;
  const f = e.flight;
  const t = e.telegraph;
  if (!t || t.move !== (f.move ?? 'stoop')) {
    // The move was cut short (a stun): it drops where it is.
    e.flight = null;
    e.flier = false;
    return;
  }
  const from = f.from ?? 0;
  const to = f.to ?? 0.8;
  const W = t.resolveTick - t.startTick;
  const span = Math.max(1, W * (to - from));
  const k = Math.max(0, Math.min(1, (tick - t.startTick - W * from + 1) / span));
  const tx = f.x0 + (f.x1 - f.x0) * k;
  const tz = f.z0 + (f.z1 - f.z0) * k;
  ctx.movement.walkStep(e, tx - e.x, tz - e.z, e.radius);
}
// The mark a leap or a stoop lands on: the hero's spot, inside the room.
function landingMark(ctx, e, target) {
  const { mx, mz } = ctx.movement.innerBounds(e.radius);
  return { x: Math.max(-mx, Math.min(mx, target.x)), z: Math.max(-mz, Math.min(mz, target.z)) };
}
// Survivors among `victims` slowed (the party only).
function slowAll(ctx, e, victims, mag, ticks, tick) {
  for (const v of victims) if (v.partyIndex !== undefined && v.hp > 0) ctx.status.apply(v, 'slow', mag, ticks, tick, e.id);
}
// The farthest living hero between `min` and `max` u (ties: lowest id).
function farthestHero(ctx, e, min, max) {
  let best = null;
  let bd = -1;
  for (const t of ctx.registry.all()) {
    if (t.partyIndex === undefined || !(t.hp > 0)) continue;
    const l = Math.hypot(t.x - e.x, t.z - e.z);
    if (l < min || l > max) continue;
    if (l > bd + 1e-9) {
      bd = l;
      best = t;
    }
  }
  return best;
}

// The shared champion frame: entrance, rage, moving in its band, and the
// two-move rotation. `def.moves[i]`: { id, shape, ticks, cd, can(ctx, e,
// target, d) -> bool, start(ctx, e, target, d, tick) -> telegraph fields,
// resolve(ctx, e, t, tick) -> victims (party count) }.
function champion(def) {
  const S = def.stats;
  const cd = (e, ticks) => Math.round(ticks * (e.rage ? R.rageCdMul : 1));
  return {
    id: def.id,
    threat: 6,
    champion: true,
    stats: S,
    telegraph: Object.freeze({ kind: def.moves[0].shape, ticks: def.moves[0].ticks }),
    moves: Object.freeze(def.moves.map((m) => m.id)),

    spawn(ctx, e, tick) {
      e.champion = def.id;
      e.kbScale = S.kbScale;
      e.mode = 'enter'; // enter | stalk | <move id> | charge
      e.enterUntil = tick + R.entranceTicks;
      e.nextAttackTick = tick + R.entranceTicks;
      e.moveIdx = 0;
      e.lastMove = null;
      e.moveTick = -1; // render: the strike clip
      e.rage = false;
      e.heldSince = -1;
      e.heldLast = -1;
      if (def.spawn) def.spawn(ctx, e, tick);
    },

    continuous(ctx, e, tick) {
      shoveStep(ctx, e); // a throw or a drag in flight (Gale Call, Antler Toss, Chain Hook)
      flightStep(ctx, e, tick); // a glide or a leap over the warning (Stoop, Hart's Leap)
      if (def.pre) def.pre(ctx, e, tick);
      if (!e.rage && e.hp > 0 && e.hp < e.maxHp * R.rageAt) {
        e.rage = true;
        ctx.events.emit(tick, 'champion_rage', { id: e.id, champion: def.id, x: r2(e.x), z: r2(e.z) });
      }
      if (def.busy && def.busy(ctx, e, tick)) return; // a charge in flight
      if (e.kbTicks > 0) return;
      const target = ctx.nearestTarget(e);
      e.targetId = target ? target.id : null;
      if (e.telegraph) {
        ctx.face(e, e.telegraph.dirX, e.telegraph.dirZ); // planted: the locked shape IS the promise
        return;
      }
      if (!target) return;
      const d = unit(target.x - e.x, target.z - e.z);
      if (tick < e.enterUntil) {
        ctx.face(e, d.x, d.z);
        return; // it stands and roars
      }
      e.mode = 'stalk';
      const step = ctx.stepLen(e, S.moveSpeed * (e.rage ? R.rageSpeedMul : 1), tick);
      const near = S.keepMin + (target.radius ?? 0);
      if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * Math.min(step, d.l - near), d.z * Math.min(step, d.l - near), e.radius);
      else if (S.backs && d.l < near) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
      else if (d.l > near) ctx.movement.walkStep(e, d.x * Math.min(step, d.l - near) * 0.6, d.z * Math.min(step, d.l - near) * 0.6, e.radius);
      else {
        const side = e.id % 2 === 0 ? 1 : -1;
        ctx.movement.walkStep(e, -d.z * step * 0.35 * side, d.x * step * 0.35 * side, e.radius);
      }
      ctx.face(e, d.x, d.z);
    },

    resolve(ctx, e, tick) {
      if (def.hit) def.hit(ctx, e, tick); // charge contact
      if (e.telegraph) {
        if (tick < e.telegraph.resolveTick) return;
        const t = e.telegraph;
        const m = def.moves.find((x) => x.id === t.move) ?? def.moves[0];
        ctx.endTelegraph(e, tick);
        e.mode = 'stalk';
        e.moveTick = tick;
        e.lastMove = m.id;
        e.nextAttackTick = tick + cd(e, m.cd);
        e.moveExtra = null;
        const victims = m.resolve(ctx, e, t, tick);
        const extra = e.moveExtra; // what the move adds to its event (the Vein Matron's drink)
        e.moveExtra = null;
        ctx.events.emit(tick, 'champion_move', { id: e.id, champion: def.id, move: m.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), victims: victims | 0, ...(e.rage ? { rage: true } : {}), ...(extra || {}) });
        return;
      }
      if (def.busy && def.busy(ctx, e, tick)) return;
      if (tick < e.enterUntil || ctx.stunned(e, tick) || tick < e.nextAttackTick) return;
      const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
      if (!target || !(target.hp > 0)) return;
      const d = unit(target.x - e.x, target.z - e.z);
      let pick = -1;
      for (const k of [0, 1]) {
        const i = (e.moveIdx + k) % def.moves.length;
        if (def.moves[i].can(ctx, e, target, d)) {
          pick = i;
          break;
        }
      }
      if (pick < 0) return;
      const playerTargeted = target.partyIndex !== undefined;
      // The §11 governor, with the Bone Knight's starve rule: a champion the
      // governor has held back this long moves anyway (a room of cawing
      // crows must not freeze the room's centrepiece).
      if (playerTargeted && !ctx.governor.grants(tick)) {
        if (e.heldLast !== tick - 1) e.heldSince = tick;
        e.heldLast = tick;
        if (tick - e.heldSince < R.starveTicks) return;
      }
      const m = def.moves[pick];
      const rec = m.start(ctx, e, target, d, tick);
      e.mode = m.id;
      e.moveIdx = pick + 1;
      ctx.startTelegraph(e, tick, {
        kind: m.shape,
        startTick: tick,
        resolveTick: tick + m.ticks,
        playerTargeted,
        targetId: target.id,
        ...rec,
        move: m.id,
        champion: def.id,
      });
      ctx.events.emit(tick, 'champion_tell', { id: e.id, champion: def.id, move: m.id, shape: m.shape, x: r2(e.telegraph.x), z: r2(e.telegraph.z), resolveTick: e.telegraph.resolveTick });
    },

    view(e) {
      return { mode: e.mode, rage: !!e.rage, move: e.lastMove, ...(e.flight ? { aloft: true } : {}) };
    },
  };
}

// ------------------------------------------------------- BRIAR KNIGHT --
const BK = Object.freeze({
  hp: 100, // x the room's champion HP share (waves.js sets the real HP)
  moveSpeed: 1.25,
  radius: 0.62,
  kbScale: 0.15,
  keepMin: 1.4,
  keepMax: 2.2,
  chargeDamage: 16,
  laneMax: 6.5,
  laneMin: 2.2,
  laneWidth: 1.1,
  chargeSpeed: 9.0, // u/s down the lane
  ringRadius: 2.8,
  ringDamage: 14,
  thicketRadius: 2.2,
  thicketTicks: 300,
  thicketSlow: 0.35,
});
function chargeTarget(ctx, e) {
  let best = null;
  let bd = -1;
  for (const t of ctx.registry.all()) {
    if (t.partyIndex === undefined || !(t.hp > 0)) continue;
    const l = Math.hypot(t.x - e.x, t.z - e.z);
    if (l < BK.laneMin || l > BK.laneMax + 1.5) continue;
    if (l > bd + 1e-9) {
      bd = l;
      best = t;
    }
  }
  return best;
}
export const briarKnight = champion({
  id: 'briar_knight',
  stats: BK,
  moves: [
    {
      id: 'bramble_charge',
      shape: 'lane',
      ticks: 60,
      cd: 150,
      // It charges the FARTHEST hero in reach: the backline, not the blade
      // in its face (ties: lowest id).
      can: (ctx, e) => !!chargeTarget(ctx, e),
      start(ctx, e) {
        const t = chargeTarget(ctx, e);
        const d = unit(t.x - e.x, t.z - e.z);
        const c = ctx.movement.sweptContact(e.x, e.z, d.x * BK.laneMax, d.z * BK.laneMax, e.radius);
        const length = Math.max(BK.laneMin, Math.max(0, Math.min(1, c.t)) * BK.laneMax);
        return { fromX: e.x, fromZ: e.z, x: e.x + d.x * length, z: e.z + d.z * length, dirX: d.x, dirZ: d.z, length, width: BK.laneWidth, targetId: t.id };
      },
      resolve(ctx, e, t) {
        const perTick = BK.chargeSpeed / ctx.TICK_HZ;
        e.charge = { vx: t.dirX * perTick, vz: t.dirZ * perTick, left: Math.ceil(t.length / perTick), hits: [] };
        e.mode = 'charge';
        return 0;
      },
    },
    {
      id: 'thorn_ring',
      shape: 'ring',
      ticks: 72,
      cd: 170,
      can: (ctx, e, target, d) => d.l <= BK.ringRadius + 0.6,
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: BK.ringRadius }),
      resolve(ctx, e, t, tick) {
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, BK.ringDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        ctx.spawnSlick(e, t.x, t.z, { radius: BK.thicketRadius, ticks: BK.thicketTicks, slow: BK.thicketSlow, variant: 'thorn' });
        return victims.length;
      },
    },
  ],
  busy: (ctx, e) => !!e.charge,
  hit(ctx, e, tick) {
    const c = e.charge;
    if (!c) return;
    // Move here (the resolve slot) so contact and travel share one tick order.
    const k = ctx.speedMul(e, tick);
    const { hit } = ctx.movement.sweptStep(e, c.vx * k, c.vz * k, e.radius);
    c.left -= 1;
    const hits = [];
    for (const t of ctx.registry.all()) {
      if (t.faction !== 'party' || !(t.hp > 0) || c.hits.includes(t.id)) continue;
      if (Math.hypot(t.x - e.x, t.z - e.z) <= e.radius + (t.radius ?? 0) + 0.1) hits.push(t);
    }
    for (const t of hits) c.hits.push(t.id);
    if (hits.length) ctx.strike(e, hits, ctx.dmg(e, BK.chargeDamage), e.x - c.vx, e.z - c.vz, { delivery: 'skill', shape: 'lane' });
    if (hit || c.left <= 0) {
      e.charge = null;
      e.mode = 'stalk';
      ctx.events.emit(tick, 'champion_charge_end', { id: e.id, champion: 'briar_knight', cause: hit ? 'wall' : 'spent', hits: c.hits.length, x: r2(e.x), z: r2(e.z) });
    }
  },
});

// ------------------------------------------------------- SLUICE WARDEN --
const SW = Object.freeze({
  hp: 100,
  moveSpeed: 1.0,
  radius: 0.72,
  kbScale: 0.1,
  keepMin: 1.6,
  keepMax: 2.6,
  coneRadius: 3.4,
  coneHalfDeg: 42,
  coneDamage: 18,
  undertowRange: 7.0,
  undertowRadius: 1.9,
  undertowDamage: 12,
  floodTicks: 360,
  floodSlow: 0.4,
});
export const sluiceWarden = champion({
  id: 'sluice_warden',
  stats: SW,
  moves: [
    {
      id: 'floodgate',
      shape: 'cone',
      ticks: 66,
      cd: 160,
      can: (ctx, e, target, d) => d.l <= SW.coneRadius - 0.4 + (target.radius ?? 0),
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: SW.coneRadius, halfAngleDeg: SW.coneHalfDeg }),
      resolve(ctx, e, t) {
        const victims = inCone(ctx.registry, t);
        ctx.strike(e, victims, ctx.dmg(e, SW.coneDamage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
        return partyOnly(victims);
      },
    },
    {
      id: 'undertow',
      shape: 'ring',
      ticks: 78,
      cd: 170,
      can: (ctx, e, target, d) => d.l <= SW.undertowRange,
      start: (ctx, e, target, d) => ({ x: target.x, z: target.z, dirX: d.x, dirZ: d.z, radius: SW.undertowRadius }),
      resolve(ctx, e, t) {
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, SW.undertowDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        ctx.spawnSlick(e, t.x, t.z, { radius: SW.undertowRadius, ticks: SW.floodTicks, slow: SW.floodSlow });
        return victims.length;
      },
    },
  ],
});

// ---------------------------------------------------------- BONE REEVE --
const BR = Object.freeze({
  hp: 100,
  moveSpeed: 1.2,
  radius: 0.6,
  kbScale: 0.15,
  keepMin: 1.5,
  keepMax: 3.0,
  sweepRadius: 2.7,
  sweepHalfDeg: 75,
  sweepDamage: 16,
  lanceLength: 8.0,
  lanceWidth: 1.1,
  lanceDamage: 14,
});
export const boneReeve = champion({
  id: 'bone_reeve',
  stats: BR,
  moves: [
    {
      id: 'reaping_sweep',
      shape: 'cone',
      ticks: 54,
      cd: 140,
      can: (ctx, e, target, d) => d.l <= BR.sweepRadius - 0.3 + (target.radius ?? 0),
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: BR.sweepRadius, halfAngleDeg: BR.sweepHalfDeg }),
      resolve(ctx, e, t) {
        const victims = inCone(ctx.registry, t);
        ctx.strike(e, victims, ctx.dmg(e, BR.sweepDamage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
        return partyOnly(victims);
      },
    },
    {
      id: 'grave_lance',
      shape: 'lane',
      ticks: 66,
      cd: 170,
      can: (ctx, e, target, d) => d.l > 1e-6 && d.l <= BR.lanceLength,
      start(ctx, e, target, d) {
        const length = clipLength(ctx, e.x, e.z, d.x, d.z, BR.lanceLength);
        return { fromX: e.x, fromZ: e.z, x: e.x + d.x * length, z: e.z + d.z * length, dirX: d.x, dirZ: d.z, length, width: BR.lanceWidth };
      },
      resolve(ctx, e, t) {
        const victims = inLane(ctx.registry, t);
        for (const v of victims) ctx.strike(e, [v], ctx.dmg(e, BR.lanceDamage), v.x - t.dirX, v.z - t.dirZ, { delivery: 'skill', shape: 'lane' });
        return partyOnly(victims);
      },
    },
  ],
});

// -------------------------------------------------------- HOLLOW CHOIR --
const HC = Object.freeze({
  hp: 100,
  moveSpeed: 1.0,
  radius: 0.75,
  kbScale: 0.1,
  keepMin: 3.2,
  keepMax: 5.4,
  backs: true, // it drifts away from a hero that closes in
  ringRadius: 3.2,
  ringDamage: 15,
  coneRadius: 6.0,
  coneHalfDeg: 28,
  shards: 5,
  shardSpreadDeg: 12,
  shardSpeed: 5.4,
  shardRange: 8.5,
  shardDamage: 9,
});
export const hollowChoir = champion({
  id: 'hollow_choir',
  stats: HC,
  moves: [
    {
      id: 'shard_hymn',
      shape: 'cone',
      ticks: 60,
      cd: 150,
      can: (ctx, e, target, d) => d.l > 1e-6 && d.l <= HC.coneRadius + 1,
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: HC.coneRadius, halfAngleDeg: HC.coneHalfDeg }),
      resolve(ctx, e, t, tick) {
        const base = Math.atan2(t.dirZ, t.dirX);
        const half = (HC.shards - 1) / 2;
        for (let k = 0; k < HC.shards; k++) {
          const a = base + (k - half) * HC.shardSpreadDeg * DEG;
          ctx.fireShot(e, tick, Math.cos(a), Math.sin(a), { speed: HC.shardSpeed, range: HC.shardRange, power: ctx.dmg(e, HC.shardDamage) });
        }
        return 0;
      },
    },
    {
      id: 'discord',
      shape: 'ring',
      ticks: 72,
      cd: 160,
      can: (ctx, e, target, d) => d.l <= HC.ringRadius + 0.4,
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: HC.ringRadius }),
      resolve(ctx, e, t) {
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, HC.ringDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        return victims.length;
      },
    },
  ],
});

// --------------------------------------------------------- GALE HERALD --
const GH = Object.freeze({
  hp: 100,
  moveSpeed: 1.15,
  radius: 0.66,
  kbScale: 0.12,
  keepMin: 2.4,
  keepMax: 4.6,
  coneRadius: 5.2,
  coneHalfDeg: 34,
  coneDamage: 12,
  throwDist: 2.4, // heroes ignore knockback: the gale throws them itself
  throwTicks: 12,
  stoopRange: 7.5,
  stoopMin: 1.6,
  stoopRadius: 2.1,
  stoopDamage: 17,
});
export const galeHerald = champion({
  id: 'gale_herald',
  stats: GH,
  moves: [
    {
      id: 'gale_call',
      shape: 'cone',
      ticks: 60,
      cd: 160,
      can: (ctx, e, target, d) => d.l > 1e-6 && d.l <= GH.coneRadius - 0.6 + (target.radius ?? 0),
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: GH.coneRadius, halfAngleDeg: GH.coneHalfDeg }),
      resolve(ctx, e, t) {
        const victims = inCone(ctx.registry, t);
        ctx.strike(e, victims, ctx.dmg(e, GH.coneDamage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
        // Every hero still standing is thrown away from the horn.
        throwFrom(e, victims, t.x, t.z, t.dirX, t.dirZ, GH.throwDist, GH.throwTicks);
        return partyOnly(victims);
      },
    },
    {
      id: 'stoop',
      shape: 'ring',
      ticks: 72,
      cd: 180,
      can: (ctx, e, target, d) => d.l >= GH.stoopMin && d.l <= GH.stoopRange,
      start(ctx, e, target, d) {
        // The mark stays where the hero stood; the herald lands on it.
        const { x, z } = landingMark(ctx, e, target);
        e.flight = { x0: e.x, z0: e.z, x1: x, z1: z };
        e.flier = true; // aloft: over barricades and hazards
        return { x, z, dirX: d.x, dirZ: d.z, radius: GH.stoopRadius };
      },
      resolve(ctx, e, t) {
        e.flight = null;
        e.flier = false;
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, GH.stoopDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        return victims.length;
      },
    },
  ],
});

// ================================================== SECOND CHAMPIONS --
// (plan 4 slice 8, docs/CHAMPIONS.md "Second champions"): each of Acts I to
// IV has a second lord; the crown door leads to one of the two by seed.

// ---------------------------------------------------------- MOSS HART --
// The Hollow Wood. A great hart of moss and bark whose antlers have grown
// into a lichen-lit thicket; it keeps close.
//   Antler Toss   a cone r 3.0, half-angle 55° (56 ticks), 15, and every
//                 hero it hits is tossed 2 u away
//   Hart's Leap   a ring r 2.0 under the FARTHEST hero 2.5 to 8 u off (74
//                 ticks): it gathers itself for the first half, bounds over
//                 the second and lands on the mark for 15, leaving a moss
//                 patch (slow 30 %)
const MH = Object.freeze({
  hp: 100,
  moveSpeed: 1.3,
  radius: 0.66,
  kbScale: 0.12,
  keepMin: 1.5,
  keepMax: 2.6,
  coneRadius: 3.0,
  coneHalfDeg: 55,
  coneDamage: 15,
  tossDist: 2.0,
  tossTicks: 10,
  leapMin: 2.5,
  leapMax: 8.0,
  leapRadius: 2.0,
  leapDamage: 15,
  leapFrom: 0.45, // it crouches this share of the warning...
  leapTo: 0.95, // ...and is down on the mark by this one
  mossRadius: 1.8,
  mossTicks: 300,
  mossSlow: 0.3,
});
export const mossHart = champion({
  id: 'moss_hart',
  stats: MH,
  moves: [
    {
      id: 'antler_toss',
      shape: 'cone',
      ticks: 56,
      cd: 150,
      can: (ctx, e, target, d) => d.l <= MH.coneRadius - 0.3 + (target.radius ?? 0),
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: MH.coneRadius, halfAngleDeg: MH.coneHalfDeg }),
      resolve(ctx, e, t) {
        const victims = inCone(ctx.registry, t);
        ctx.strike(e, victims, ctx.dmg(e, MH.coneDamage), t.x, t.z, { delivery: 'skill', shape: 'cone' });
        throwFrom(e, victims, t.x, t.z, t.dirX, t.dirZ, MH.tossDist, MH.tossTicks);
        return partyOnly(victims);
      },
    },
    {
      id: 'harts_leap',
      shape: 'ring',
      ticks: 74,
      cd: 175,
      // It leaps at the backline, not the blade in its face.
      can: (ctx, e) => !!farthestHero(ctx, e, MH.leapMin, MH.leapMax),
      start(ctx, e) {
        const t = farthestHero(ctx, e, MH.leapMin, MH.leapMax);
        const d = unit(t.x - e.x, t.z - e.z);
        const { x, z } = landingMark(ctx, e, t);
        e.flight = { x0: e.x, z0: e.z, x1: x, z1: z, from: MH.leapFrom, to: MH.leapTo, move: 'harts_leap' };
        e.flier = true; // over barricades and hazards in the bound
        return { x, z, dirX: d.x, dirZ: d.z, radius: MH.leapRadius, targetId: t.id };
      },
      resolve(ctx, e, t) {
        e.flight = null;
        e.flier = false;
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, MH.leapDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        ctx.spawnSlick(e, t.x, t.z, { radius: MH.mossRadius, ticks: MH.mossTicks, slow: MH.mossSlow, variant: 'moss' });
        return victims.length;
      },
    },
  ],
});

// --------------------------------------------------------- LOCKKEEPER --
// The Sunken Mill. A gaunt keeper of the mill's locks in a sodden coat, a
// great iron key on a chain over one shoulder and a lock-box lantern.
//   Chain Hook    a lane up to 7.5 u x 0.9 at its target, or else the
//                 farthest hero, 2.2 u or more off (58 ticks): the key
//                 flies down it for 10 and drags every hero it hooks back
//                 to the keeper's feet
//   Lock Turn     a ring r 2.5 round itself (70 ticks): it turns the key in
//                 the floor for 16, and the heroes inside are clamped (slow
//                 50 % for 1.5 s)
// Together: hooked in, then locked down. Step out of the lane.
const LK = Object.freeze({
  hp: 100,
  moveSpeed: 1.05,
  radius: 0.64,
  kbScale: 0.12,
  keepMin: 1.6,
  keepMax: 3.4,
  hookMin: 2.2,
  hookMax: 7.5,
  hookWidth: 0.9,
  hookDamage: 10,
  hookTicks: 10, // the drag takes this long...
  hookStop: 0.9, // ...and ends this far beyond touching
  ringRadius: 2.5,
  ringDamage: 16,
  clampSlow: 0.5,
  clampTicks: 90,
});
export const lockkeeper = champion({
  id: 'lockkeeper',
  stats: LK,
  moves: [
    {
      id: 'chain_hook',
      shape: 'lane',
      ticks: 58,
      cd: 160,
      // Its target when that hero stands in reach, else the farthest hero
      // who does: a tank at its knees must not keep the hook from the rest.
      can: (ctx, e, target, d) => (d.l >= LK.hookMin && d.l <= LK.hookMax) || !!farthestHero(ctx, e, LK.hookMin, LK.hookMax),
      start(ctx, e, target, d0) {
        const h = d0.l >= LK.hookMin && d0.l <= LK.hookMax ? target : farthestHero(ctx, e, LK.hookMin, LK.hookMax);
        const d = h === target ? d0 : unit(h.x - e.x, h.z - e.z);
        const length = clipLength(ctx, e.x, e.z, d.x, d.z, LK.hookMax);
        return { fromX: e.x, fromZ: e.z, x: e.x + d.x * length, z: e.z + d.z * length, dirX: d.x, dirZ: d.z, length, width: LK.hookWidth };
      },
      resolve(ctx, e, t) {
        const victims = inLane(ctx.registry, t);
        for (const v of victims) ctx.strike(e, [v], ctx.dmg(e, LK.hookDamage), v.x - t.dirX, v.z - t.dirZ, { delivery: 'skill', shape: 'lane' });
        // Every hooked hero still standing is dragged in to its feet.
        const pushes = [];
        for (const v of victims) {
          if (v.partyIndex === undefined || !(v.hp > 0)) continue;
          const u = unit(e.x - v.x, e.z - v.z);
          const pull = u.l - (e.radius + (v.radius ?? 0.3) + LK.hookStop);
          if (u.l > 1e-6 && pull > 0.05) pushes.push([v.id, u.x, u.z, pull / LK.hookTicks]);
        }
        if (pushes.length) e.shove = { pushes, ticksLeft: LK.hookTicks, per: 0 };
        e.moveExtra = { hooked: pushes.length };
        return partyOnly(victims);
      },
    },
    {
      id: 'lock_turn',
      shape: 'ring',
      ticks: 70,
      cd: 165,
      can: (ctx, e, target, d) => d.l <= LK.ringRadius + 0.4,
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: LK.ringRadius }),
      resolve(ctx, e, t, tick) {
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, LK.ringDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        slowAll(ctx, e, victims, LK.clampSlow, LK.clampTicks, tick);
        return victims.length;
      },
    },
  ],
});

// --------------------------------------------------- GRAVEBELL RINGER --
// The Ashen Barrow. A hunched, hooded skeleton under a wooden yoke from
// which a cracked grave bell hangs; it keeps back and rings.
//   Death Knell   a ring r 3.6 round itself (78 ticks): the bell tolls for
//                 11 and every hero inside is slowed 45 % for 2.5 s
//   Grave Call    a ring r 1.8 under a hero up to 8 u off (64 ticks): the
//                 grave opens in an ash burst for 14 and smoulders (an ash
//                 patch, slow 30 %, 5 s)
// Together: tolled slow, then the grave opens where you stand.
const GR = Object.freeze({
  hp: 100,
  moveSpeed: 0.95,
  radius: 0.62,
  kbScale: 0.12,
  keepMin: 2.6,
  keepMax: 4.6,
  knellRadius: 3.6,
  knellDamage: 11,
  knellSlow: 0.45,
  knellTicks: 150,
  callRange: 8.0,
  callRadius: 1.8,
  callDamage: 14,
  ashTicks: 300,
  ashSlow: 0.3,
});
export const gravebellRinger = champion({
  id: 'gravebell_ringer',
  stats: GR,
  moves: [
    {
      id: 'death_knell',
      shape: 'ring',
      ticks: 78,
      cd: 175,
      can: (ctx, e, target, d) => d.l <= GR.knellRadius + 0.4,
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: GR.knellRadius }),
      resolve(ctx, e, t, tick) {
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, GR.knellDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        slowAll(ctx, e, victims, GR.knellSlow, GR.knellTicks, tick);
        return victims.length;
      },
    },
    {
      id: 'grave_call',
      shape: 'ring',
      ticks: 64,
      cd: 155,
      can: (ctx, e, target, d) => d.l <= GR.callRange,
      start: (ctx, e, target, d) => ({ x: target.x, z: target.z, dirX: d.x, dirZ: d.z, radius: GR.callRadius }),
      resolve(ctx, e, t) {
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, GR.callDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        ctx.spawnSlick(e, t.x, t.z, { radius: GR.callRadius, ticks: GR.ashTicks, slow: GR.ashSlow, variant: 'ash' });
        return victims.length;
      },
    },
  ],
});

// -------------------------------------------------------- VEIN MATRON --
// The Hollow Heart. The brood-mother of the Heart's veins: a tall crystal
// matriarch on a skirt of violet vein-roots, a crown of crystal spines and
// two long vein whips.
//   Vein Lash     a lane up to 7 u x 1.0 at a hero (58 ticks): the whip
//                 cracks down it for 13, and she drinks 3 % of her max HP
//                 for every hero it cuts, 6 % at most
//   Heart Pulse   a ring r 2.8 round herself (70 ticks): the heart in her
//                 chest beats for 14, then eight crystal shards fly out all
//                 round her, 7 each
// Stay out of the lash and she cannot heal.
const VM = Object.freeze({
  hp: 100,
  moveSpeed: 1.1,
  radius: 0.7,
  kbScale: 0.1,
  keepMin: 2.0,
  keepMax: 3.8,
  lashMax: 7.0,
  lashWidth: 1.0,
  lashDamage: 13,
  drinkShare: 0.03,
  drinkCap: 0.06, // one lash heals at most this share, however many it cuts
  pulseRadius: 2.8,
  pulseDamage: 14,
  shards: 8,
  shardSpeed: 4.6,
  shardRange: 7.0,
  shardDamage: 7,
});
export const veinMatron = champion({
  id: 'vein_matron',
  stats: VM,
  moves: [
    {
      id: 'vein_lash',
      shape: 'lane',
      ticks: 58,
      cd: 150,
      can: (ctx, e, target, d) => d.l > 1e-6 && d.l <= VM.lashMax,
      start(ctx, e, target, d) {
        const length = clipLength(ctx, e.x, e.z, d.x, d.z, VM.lashMax);
        return { fromX: e.x, fromZ: e.z, x: e.x + d.x * length, z: e.z + d.z * length, dirX: d.x, dirZ: d.z, length, width: VM.lashWidth };
      },
      resolve(ctx, e, t) {
        const victims = inLane(ctx.registry, t);
        for (const v of victims) ctx.strike(e, [v], ctx.dmg(e, VM.lashDamage), v.x - t.dirX, v.z - t.dirZ, { delivery: 'skill', shape: 'lane' });
        const cut = partyOnly(victims);
        if (cut > 0 && e.hp > 0) {
          const before = e.hp;
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * Math.min(VM.drinkCap, VM.drinkShare * cut));
          e.moveExtra = { drank: r2(e.hp - before) };
        }
        return cut;
      },
    },
    {
      id: 'heart_pulse',
      shape: 'ring',
      ticks: 70,
      cd: 165,
      can: (ctx, e, target, d) => d.l <= VM.pulseRadius + 0.5,
      start: (ctx, e, target, d) => ({ x: e.x, z: e.z, dirX: d.x, dirZ: d.z, radius: VM.pulseRadius }),
      resolve(ctx, e, t, tick) {
        const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
        const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
        ctx.strike(e, victims.concat(props), ctx.dmg(e, VM.pulseDamage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
        // The shards fly out all round her, the first along her facing.
        const base = Math.atan2(t.dirZ, t.dirX);
        for (let k = 0; k < VM.shards; k++) {
          const a = base + (k / VM.shards) * Math.PI * 2;
          ctx.fireShot(e, tick, Math.cos(a), Math.sin(a), { speed: VM.shardSpeed, range: VM.shardRange, power: ctx.dmg(e, VM.shardDamage) });
        }
        return victims.length;
      },
    },
  ],
});

export const CHAMPION_KITS = Object.freeze({
  briar_knight: briarKnight,
  sluice_warden: sluiceWarden,
  bone_reeve: boneReeve,
  hollow_choir: hollowChoir,
  gale_herald: galeHerald,
  moss_hart: mossHart,
  lockkeeper,
  gravebell_ringer: gravebellRinger,
  vein_matron: veinMatron,
});
