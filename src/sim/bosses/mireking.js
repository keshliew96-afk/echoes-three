// THE MIRE KING — Act II (Sunken Mill) third boss (content plan 3, slice 10;
// docs/THIRD_BOSSES.md). The millpond's old toad, grown vast on silt and
// the hollow song, wearing a crown of rusted mill-grate. The Heron strikes
// from the water and the Millwheel owns the rim; the Mire King owns the
// middle: it drags the party in and drops its weight on them.
//
//   Tongue Lash (primary): an Ember LANE from its mouth toward its target
//     (1.0 u wide, up to 7.5 u, 48-tick warning), 14 to every body in it;
//     each body hit is yanked 2 u toward it. Cooldown 240 ticks (180
//     enraged). `lance: true`, so AI allies step out of it.
//   Belly Flop: an Ember RING r 2.0 at its target (66-tick warning). It
//     heaves up over the last 20 ticks and lands there for 16, leaving a
//     ring of mire (slick, 35 % slow, 5 s; r 2.6 enraged). Cooldown 420
//     ticks (330 enraged). Range 3 to 8 u.
//   Swallow: an Ember RING r 1.9 round itself (78-tick warning). While it
//     gapes, every hero in front of it within 6 u is drawn in at 1.6 u/s (a
//     hero walking away still wins); when it snaps shut, 18 to every body in
//     the ring. Cooldown 540 ticks, first at 5 s.
//   Enrage: under 40 % HP (`enraged`).
//   Add phases call the mill's toads and a Mire Leech.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const MIREKING = Object.freeze({
  name: 'THE MIRE KING',
  radius: 0.9,
  hpMul: 1.05,
  moveSpeed: 1.0,
  scale: 2.4,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['toad', 'toad', 'leech']),
  lash: Object.freeze({ damage: 14, cdTicks: 240, enragedCdTicks: 180, firstDelay: 80, telegraphTicks: 48, width: 1.0, maxLen: 7.5, range: 7.0, yankDist: 2.0, yankTicks: 12, yankStop: 0.6 }),
  flop: Object.freeze({ damage: 16, cdTicks: 420, enragedCdTicks: 330, firstDelay: 200, telegraphTicks: 66, leapTicks: 20, radius: 2.0, minRange: 3.0, range: 8.0, mireRadius: 2.0, enragedMireRadius: 2.6, mireTicks: 300, mireSlow: 0.35 }),
  swallow: Object.freeze({ damage: 18, cdTicks: 540, firstDelay: 300, telegraphTicks: 78, radius: 1.9, pullRange: 6.0, pullHalfAngleDeg: 70, pullSpeed: 1.6 }),
  enrageAt: 0.4,
  standoff: 1.4,
});

export default {
  id: 'mireking',
  def: MIREKING,

  spawn(ctx, b, tick) {
    b.mode = 'wade'; // 'wade' | 'lash' | 'heave' | 'flop' | 'gape'
    b.nextLashTick = tick + MIREKING.lash.firstDelay;
    b.nextFlopTick = tick + MIREKING.flop.firstDelay;
    b.nextSwallowTick = tick + MIREKING.swallow.firstDelay;
    b.yank = null; // { ids, ticksLeft } while a lash pulls
    b.enraged = false;
  },

  continuous(ctx, b, tick) {
    // A lash in flight: each body it caught is dragged toward the mouth.
    if (b.yank) {
      const L = MIREKING.lash;
      const per = L.yankDist / L.yankTicks;
      for (const id of b.yank.ids) {
        const p = ctx.registry.byId(id);
        if (!p || !(p.hp > 0)) continue;
        const dx = b.x - p.x;
        const dz = b.z - p.z;
        const l = Math.hypot(dx, dz);
        const room = l - (L.yankStop + (p.radius ?? 0) + b.radius);
        if (room <= 0 || l < 1e-6) continue;
        const s = Math.min(per, room);
        ctx.walkStep(p, (dx / l) * s, (dz / l) * s, p.radius ?? 0.3);
      }
      b.yank.ticksLeft -= 1;
      if (b.yank.ticksLeft <= 0) b.yank = null;
    }
    const t = b.telegraph;
    if (t && t.attack === 'flop') {
      const left = t.resolveTick - tick;
      if (left > MIREKING.flop.leapTicks) {
        b.mode = 'heave';
        return;
      }
      b.mode = 'flop';
      const dx = t.x - b.x;
      const dz = t.z - b.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const step = d / Math.max(1, left);
        ctx.walkStep(b, (dx / d) * step, (dz / d) * step, b.radius);
      }
      return;
    }
    if (t && t.attack === 'swallow') {
      // It gapes: heroes in front of it are drawn toward the mouth.
      const S = MIREKING.swallow;
      const cosHalf = Math.cos((S.pullHalfAngleDeg * Math.PI) / 180);
      const per = S.pullSpeed * TICK_DT;
      for (const p of ctx.partyBodies()) {
        const dx = b.x - p.x;
        const dz = b.z - p.z;
        const l = Math.hypot(dx, dz);
        if (l > S.pullRange || l < b.radius + (p.radius ?? 0) + 0.25) continue;
        if ((-dx * b.faceX - dz * b.faceZ) / l < cosHalf) continue;
        ctx.walkStep(p, (dx / l) * per, (dz / l) * per, p.radius ?? 0.3);
      }
      b.mode = 'gape';
      return;
    }
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (t) return; // the lane is locked
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    b.mode = 'wade';
    const stop = b.radius + target.radius + MIREKING.standoff;
    if (d > stop) {
      const adv = Math.min(MIREKING.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * MIREKING.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      b.mode = 'wade';
      if (t.attack === 'lash') {
        const L = MIREKING.lash;
        const victims = ctx.partyBodies().filter((p) => {
          const px = p.x - t.fromX;
          const pz = p.z - t.fromZ;
          const along = px * t.dirX + pz * t.dirZ;
          if (along < -p.radius || along > t.length + p.radius) return false;
          return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
        });
        ctx.events.emit(tick, 'boss_tongue_lash', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length });
        ctx.hitAll(b, victims, L.damage, t.fromX, t.fromZ, 'lane');
        const caught = victims.filter((p) => p.hp > 0).map((p) => p.id);
        b.yank = caught.length ? { ids: caught, ticksLeft: L.yankTicks } : null;
        b.nextLashTick = tick + (b.enraged ? L.enragedCdTicks : L.cdTicks);
      } else if (t.attack === 'flop') {
        const F = MIREKING.flop;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        const mire = ctx.spawnSlick(b, t.x, t.z, { radius: b.enraged ? F.enragedMireRadius : F.mireRadius, ticks: F.mireTicks, slow: F.mireSlow });
        ctx.events.emit(tick, 'boss_belly_flop', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, mire: mire ? mire.id : null });
        ctx.shake(tick, 'boss_belly_flop', t.x, t.z);
        ctx.hitAll(b, victims, F.damage, t.x, t.z);
        b.nextFlopTick = tick + (b.enraged ? F.enragedCdTicks : F.cdTicks);
        b.nextLashTick = Math.max(b.nextLashTick, tick + 40);
      } else if (t.attack === 'swallow') {
        const S = MIREKING.swallow;
        const victims = ctx.partyIn(b.x, b.z, t.radius);
        ctx.events.emit(tick, 'boss_swallow', { id: b.id, x: r2(b.x), z: r2(b.z), radius: t.radius, victims: victims.length });
        ctx.shake(tick, 'boss_swallow', b.x, b.z);
        ctx.hitAll(b, victims, S.damage, b.x, b.z);
        b.nextSwallowTick = tick + S.cdTicks;
      }
      return;
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    if (d < 1e-6) return;
    const dirX = (target.x - b.x) / d;
    const dirZ = (target.z - b.z) / d;
    // Swallow when due: the fight's signature beat.
    const S = MIREKING.swallow;
    if (tick >= b.nextSwallowTick && d <= S.pullRange) {
      b.mode = 'gape';
      b.faceX = dirX;
      b.faceZ = dirZ;
      ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'swallow', ticks: S.telegraphTicks, x: b.x, z: b.z, radius: S.radius, targetId: target.id });
      b.nextSwallowTick = tick + 100000;
      return;
    }
    const F = MIREKING.flop;
    if (tick >= b.nextFlopTick && d >= F.minRange && d <= F.range) {
      const { mx, mz } = ctx.innerBounds(b.radius);
      b.mode = 'heave';
      ctx.startTelegraph(b, tick, {
        kind: 'ring',
        attack: 'flop',
        ticks: F.telegraphTicks,
        x: Math.min(mx, Math.max(-mx, target.x)),
        z: Math.min(mz, Math.max(-mz, target.z)),
        radius: F.radius,
        targetId: target.id,
      });
      b.nextFlopTick = tick + 100000;
      return;
    }
    const L = MIREKING.lash;
    if (tick >= b.nextLashTick && d <= L.range) {
      const { mx, mz } = ctx.innerBounds(0.2);
      let len = L.maxLen;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      if (len >= 1.5) {
        b.mode = 'lash';
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'lash',
          lance: true,
          ticks: L.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: L.width,
          targetId: target.id,
        });
        b.nextLashTick = tick + 100000;
      }
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged };
  },
};
