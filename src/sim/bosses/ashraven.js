// THE ASH RAVEN — Act III (Ashen Barrow) third boss (content plan 3, slice 11;
// docs/THIRD_BOSSES.md). The barrow's carrion bird, grown huge on the ash of
// the pyres and the hollow song: a black raven with a cracked bone mask, ash
// in its feathers and embers of violet in its eye sockets. The Wyrm swims
// under the mound and the Lich Ram charges across it; the Raven owns the air
// above it: it dives the length of the room and calls its crows down on
// whoever it marks.
//
//   Carrion Dive (primary): an Ember LANE from it through its target (1.2 u
//     wide, up to 9 u, 50-tick warning). It rises, then dives the lane over
//     the last 14 ticks for 15 to every body in it, and lands at the far end
//     to preen for 40 ticks (the party's punish window). Cooldown 250 ticks
//     (180 enraged). `lance: true`, so AI allies step out of it.
//   Wing Gust (close): with a body inside 2.8 u, an Ember CONE in front
//     (3.4 u, 60 degrees either side, 40-tick warning), 10 to every body in
//     it, and each one is blown 2.6 u away. Cooldown 280 ticks.
//   Omen: an Ember RING r 1.4 on its target (84-tick warning). For the first
//     54 ticks the ring FOLLOWS that hero at 2.4 u/s (a hero who runs keeps
//     ahead of it), then it locks for the last 30 and the crows come down
//     for 14. Enraged, the ring leaves a patch of ash (30 % slow, 4 s).
//     Cooldown 420 ticks (320 enraged), first at 4 s.
//   Enrage: under 40 % HP (`enraged`), faster on its feet, shorter cooldowns.
//   Add phases call the barrow's crows and a Grave Wisp.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const ASHRAVEN = Object.freeze({
  name: 'THE ASH RAVEN',
  radius: 0.8,
  hpMul: 1.0,
  moveSpeed: 1.35,
  enragedMoveSpeed: 1.7,
  scale: 2.4,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['crow', 'crow', 'gravewisp']),
  dive: Object.freeze({ damage: 15, cdTicks: 250, enragedCdTicks: 180, firstDelay: 90, telegraphTicks: 50, diveTicks: 14, preenTicks: 40, width: 1.2, maxLen: 9.0, range: 8.5, minRange: 2.0 }),
  gust: Object.freeze({ damage: 10, cdTicks: 280, firstDelay: 120, telegraphTicks: 40, trigger: 2.8, length: 3.4, halfAngleDeg: 60, shoveDist: 2.6, shoveTicks: 10 }),
  omen: Object.freeze({ damage: 14, cdTicks: 420, enragedCdTicks: 320, firstDelay: 240, telegraphTicks: 84, lockTicks: 30, followSpeed: 2.4, radius: 1.4, ashRadius: 1.3, ashTicks: 240, ashSlow: 0.3 }),
  enrageAt: 0.4,
  standoff: 1.2,
});

// The lane from (x, z) along (dirX, dirZ), cut short at the room's edge.
function laneLength(ctx, x, z, dirX, dirZ, max) {
  const { mx, mz } = ctx.innerBounds(0.3);
  let len = max;
  if (dirX > 1e-6) len = Math.min(len, (mx - x) / dirX);
  else if (dirX < -1e-6) len = Math.min(len, (-mx - x) / dirX);
  if (dirZ > 1e-6) len = Math.min(len, (mz - z) / dirZ);
  else if (dirZ < -1e-6) len = Math.min(len, (-mz - z) / dirZ);
  return len;
}

export default {
  id: 'ashraven',
  def: ASHRAVEN,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'rise' | 'dive' | 'preen' | 'gust' | 'call'
    b.nextDiveTick = tick + ASHRAVEN.dive.firstDelay;
    b.nextGustTick = tick + ASHRAVEN.gust.firstDelay;
    b.nextOmenTick = tick + ASHRAVEN.omen.firstDelay;
    b.preenUntil = 0;
    b.shove = null; // { pushes: [[id, dx, dz]], ticksLeft } while a gust blows
    b.enraged = false;
  },

  continuous(ctx, b, tick) {
    // A gust in flight: each body it caught is blown away from the beak.
    if (b.shove) {
      const G = ASHRAVEN.gust;
      const per = G.shoveDist / G.shoveTicks;
      for (const [id, dx, dz] of b.shove.pushes) {
        const p = ctx.registry.byId(id);
        if (!p || !(p.hp > 0)) continue;
        ctx.walkStep(p, dx * per, dz * per, p.radius ?? 0.3);
      }
      b.shove.ticksLeft -= 1;
      if (b.shove.ticksLeft <= 0) b.shove = null;
    }
    const t = b.telegraph;
    if (t && t.attack === 'dive') {
      // Wings up until the last diveTicks, then down the lane.
      const left = t.resolveTick - tick;
      if (left > ASHRAVEN.dive.diveTicks) {
        b.mode = 'rise';
        return;
      }
      b.mode = 'dive';
      const ex = t.fromX + t.dirX * Math.max(0, t.length - b.radius);
      const ez = t.fromZ + t.dirZ * Math.max(0, t.length - b.radius);
      const dx = ex - b.x;
      const dz = ez - b.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const step = d / Math.max(1, left);
        ctx.walkStep(b, (dx / d) * step, (dz / d) * step, b.radius);
      }
      b.faceX = t.dirX;
      b.faceZ = t.dirZ;
      return;
    }
    if (t && t.attack === 'omen') {
      // The mark follows its hero until it locks.
      b.mode = 'call';
      const O = ASHRAVEN.omen;
      if (t.resolveTick - tick > O.lockTicks) {
        const prey = t.targetId != null ? ctx.registry.byId(t.targetId) : null;
        if (prey && prey.hp > 0) {
          const dx = prey.x - t.x;
          const dz = prey.z - t.z;
          const d = Math.hypot(dx, dz);
          if (d > 1e-6) {
            const s = Math.min(d, O.followSpeed * TICK_DT);
            const { mx, mz } = ctx.innerBounds(0.4);
            t.x = Math.min(mx, Math.max(-mx, t.x + (dx / d) * s));
            t.z = Math.min(mz, Math.max(-mz, t.z + (dz / d) * s));
          }
        }
      }
      return;
    }
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    if (t || b.mode === 'preen') return; // planted while it gusts or preens
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    b.mode = 'stalk';
    const stop = b.radius + target.radius + ASHRAVEN.standoff;
    if (d > stop) {
      const speed = b.enraged ? ASHRAVEN.enragedMoveSpeed : ASHRAVEN.moveSpeed;
      const adv = Math.min(speed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * ASHRAVEN.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'dive') {
        const D = ASHRAVEN.dive;
        const victims = ctx.partyBodies().filter((p) => {
          const px = p.x - t.fromX;
          const pz = p.z - t.fromZ;
          const along = px * t.dirX + pz * t.dirZ;
          if (along < -p.radius || along > t.length + p.radius) return false;
          return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
        });
        ctx.events.emit(tick, 'boss_carrion_dive', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length });
        ctx.shake(tick, 'boss_carrion_dive', b.x, b.z);
        ctx.hitAll(b, victims, D.damage, t.fromX, t.fromZ, 'lane');
        b.mode = 'preen';
        b.preenUntil = tick + D.preenTicks;
        b.nextDiveTick = tick + (b.enraged ? D.enragedCdTicks : D.cdTicks);
        b.nextGustTick = Math.max(b.nextGustTick, tick + D.preenTicks + 20);
      } else if (t.attack === 'gust') {
        const G = ASHRAVEN.gust;
        const cosHalf = Math.cos((t.halfAngleDeg * Math.PI) / 180);
        const victims = ctx.partyIn(t.x, t.z, t.radius).filter((p) => {
          const px = p.x - t.x;
          const pz = p.z - t.z;
          const l = Math.hypot(px, pz);
          if (l <= p.radius + 0.2) return true; // under its beak
          return (px * t.dirX + pz * t.dirZ) / l >= cosHalf;
        });
        const pushes = [];
        for (const p of victims) {
          const px = p.x - b.x;
          const pz = p.z - b.z;
          const l = Math.hypot(px, pz);
          pushes.push([p.id, l > 1e-6 ? px / l : t.dirX, l > 1e-6 ? pz / l : t.dirZ]);
        }
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_wing_gust', { id: b.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), victims: victims.length });
        ctx.hitAll(b, victims, G.damage, t.x, t.z);
        if (pushes.length) b.shove = { pushes, ticksLeft: G.shoveTicks };
        b.nextGustTick = tick + G.cdTicks;
      } else if (t.attack === 'omen') {
        const O = ASHRAVEN.omen;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        let ash = null;
        if (b.enraged) ash = ctx.spawnSlick(b, t.x, t.z, { radius: O.ashRadius, ticks: O.ashTicks, slow: O.ashSlow, variant: 'ash' }).id;
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_omen', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, ...(ash !== null ? { ash } : {}) });
        ctx.shake(tick, 'boss_omen', t.x, t.z);
        ctx.hitAll(b, victims, O.damage, t.x, t.z);
        b.nextOmenTick = tick + (b.enraged ? O.enragedCdTicks : O.cdTicks);
      }
      return;
    }
    if (b.mode === 'preen') {
      if (tick < b.preenUntil) return;
      b.mode = 'stalk';
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    // Wing Gust first when someone crowds its beak.
    const G = ASHRAVEN.gust;
    if (tick >= b.nextGustTick) {
      let close = null;
      let best = Infinity;
      for (const p of ctx.partyBodies()) {
        const dd = Math.hypot(p.x - b.x, p.z - b.z) - p.radius;
        if (dd <= G.trigger && dd < best) {
          best = dd;
          close = p;
        }
      }
      if (close) {
        const dd = Math.hypot(close.x - b.x, close.z - b.z);
        const dirX = dd > 1e-6 ? (close.x - b.x) / dd : b.faceX ?? 0;
        const dirZ = dd > 1e-6 ? (close.z - b.z) / dd : b.faceZ ?? 1;
        b.faceX = dirX;
        b.faceZ = dirZ;
        b.mode = 'gust';
        ctx.startTelegraph(b, tick, { kind: 'cone', attack: 'gust', ticks: G.telegraphTicks, x: b.x, z: b.z, dirX, dirZ, radius: G.length, length: G.length, halfAngleDeg: G.halfAngleDeg, targetId: close.id });
        b.nextGustTick = tick + 100000; // armed on the resolve
        return;
      }
    }
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    // Omen when due: the mark on its target.
    const O = ASHRAVEN.omen;
    if (tick >= b.nextOmenTick) {
      const { mx, mz } = ctx.innerBounds(0.4);
      b.mode = 'call';
      ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'omen', ticks: O.telegraphTicks, x: Math.min(mx, Math.max(-mx, target.x)), z: Math.min(mz, Math.max(-mz, target.z)), radius: O.radius, targetId: target.id });
      b.nextOmenTick = tick + 100000;
      return;
    }
    // Carrion Dive through its target.
    const D = ASHRAVEN.dive;
    if (tick >= b.nextDiveTick && d >= D.minRange && d <= D.range) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const len = laneLength(ctx, b.x, b.z, dirX, dirZ, D.maxLen);
      if (len >= Math.max(D.minRange, d * 0.8)) {
        b.faceX = dirX;
        b.faceZ = dirZ;
        b.mode = 'rise';
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'dive',
          lance: true,
          ticks: D.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: D.width,
          targetId: target.id,
        });
        b.nextDiveTick = tick + 100000;
      }
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, preen: b.mode === 'preen' };
  },
};
