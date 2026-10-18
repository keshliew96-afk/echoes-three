// THE BELLFOUNDER — the Ember Kiln's final boss (content plan 5, slice 8;
// docs/KILN_BOSSES.md). The gods' bell-founder: it poured every bell the
// gods ever rang, here in their kiln, and the hollow song found it still at
// the casting pit with the fire roaring. Now it casts hollow bells. A great
// shape of fire brick and slag with a crucible of molten bronze in its arms
// and a cast-bronze mask, the kiln's own heat glowing through its seams.
//
//   Molten Pour (primary): it tips its crucible down an Ember LANE from its
//     body toward a target 2.5 to 9 u away (1.4 u wide, 60-tick warning), 14
//     to every body in it, and the bronze cools on the floor in three pools of
//     slag (30 % slow, 3 s). It carries `lance: true`, so AI seats step out.
//     Cooldown 300 ticks (240 from the Third Casting).
//   Bell Drop (secondary): a fresh-cast bell falls on its target, an Ember
//     RING r 1.9 (64-tick warning), 16 to every hero under it. Cooldown 240
//     ticks (190 from the Third Casting, where the ring grows to r 2.3).
//   Castings (the three phases): at 75 / 50 / 25 % HP it breaks open a mould
//     and the Kiln's creatures crawl out (the level's boss row carries them as
//     `addsByPhase`). Each Casting is followed at once by...
//   The Firing (signature): it opens its chest and the kiln's heat pours out
//     of it, an Ember RING r 4.4 round itself (96-tick warning), 20 to every
//     body still inside. Then it is QUENCHED for 90 ticks: grey and steaming,
//     it makes no attack and takes 30 % more damage (the punish window).
//     After the First Casting it fires again every 600 ticks (480 from the
//     Third).
//
// It keeps 3 to 5.5 u from its target, like the Hush, so a Firing catches
// whoever stood close: walk out to the walls, then come back and hit it.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;
// Not yet due (a plain number: saves carry it, unlike Infinity).
const NEVER = 1e9;

export const FOUNDER = Object.freeze({
  name: 'THE BELLFOUNDER',
  radius: 0.8,
  hpMul: 1.0,
  moveSpeed: 1.2,
  scale: 2.6,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['newt', 'newt', 'slag']),
  keep: Object.freeze({ near: 3.0, far: 5.5 }),
  pour: Object.freeze({ damage: 14, cdTicks: 300, cast3CdTicks: 240, firstDelay: 90, telegraphTicks: 60, width: 1.4, maxLen: 9.0, minRange: 2.5, pools: 3, poolRadius: 0.8, poolTicks: 180, poolSlow: 0.3 }),
  bell: Object.freeze({ damage: 16, cdTicks: 240, cast3CdTicks: 190, firstDelay: 170, telegraphTicks: 64, radius: 1.9, cast3Radius: 2.3 }),
  firing: Object.freeze({ damage: 20, everyTicks: 600, cast3EveryTicks: 480, telegraphTicks: 96, radius: 4.4, quenchTicks: 90, quenchTaken: 1.3 }),
});

// Every hero inside a lane telegraph (from, dir, length, width).
function inLane(ctx, t) {
  return ctx.partyBodies().filter((p) => {
    const px = p.x - t.fromX;
    const pz = p.z - t.fromZ;
    const along = px * t.dirX + pz * t.dirZ;
    if (along < -p.radius || along > t.length + p.radius) return false;
    return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
  });
}

export default {
  id: 'founder',
  def: FOUNDER,

  spawn(ctx, b, tick) {
    b.mode = 'tend'; // 'tend' | 'stoke' (the Firing) | 'quenched'
    b.casting = 0; // 0 before the first Casting, then 1..3
    b.nextPourTick = tick + FOUNDER.pour.firstDelay;
    b.nextBellTick = tick + FOUNDER.bell.firstDelay;
    b.nextFiringTick = NEVER; // armed by the First Casting
    b.firingOwed = false; // a Casting owes a Firing at the next chance
    b.quenchUntil = 0;
  },

  continuous(ctx, b, tick) {
    if (b.mode === 'quenched' || b.mode === 'stoke') return; // planted
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    if (b.telegraph || d < 1e-6) return; // it stands to pour or drop
    const K = FOUNDER.keep;
    let adv = 0;
    if (d > K.far) adv = Math.min(FOUNDER.moveSpeed * TICK_DT, d - K.far);
    else if (d < K.near) adv = -Math.min(FOUNDER.moveSpeed * 0.7 * TICK_DT, K.near - d);
    if (adv !== 0) ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
  },

  resolve(ctx, b, tick) {
    if (b.mode === 'quenched') {
      if (tick < b.quenchUntil) return;
      b.mode = 'tend';
      delete b.takenMul;
      ctx.events.emit(tick, 'boss_founder_rekindle', { id: b.id, x: r2(b.x), z: r2(b.z) });
      b.nextBellTick = Math.max(b.nextBellTick, tick + 30);
      return;
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'pour') {
        const P = FOUNDER.pour;
        const victims = inLane(ctx, t);
        // The bronze cools on the floor down the lane: three pools of slag.
        const pools = [];
        for (let k = 0; k < P.pools; k++) {
          const s = t.length * ((k + 0.5) / P.pools);
          pools.push(ctx.spawnSlick(b, t.fromX + t.dirX * s, t.fromZ + t.dirZ * s, { radius: P.poolRadius, ticks: P.poolTicks, slow: P.poolSlow, variant: 'slag' }).id);
        }
        ctx.events.emit(tick, 'boss_molten_pour', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length, pools });
        ctx.hitAll(b, victims, P.damage, t.fromX, t.fromZ, 'lane');
        b.nextPourTick = tick + (b.casting >= 3 ? P.cast3CdTicks : P.cdTicks);
        b.nextBellTick = Math.max(b.nextBellTick, tick + 24);
      } else if (t.attack === 'bell') {
        const B = FOUNDER.bell;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        ctx.events.emit(tick, 'boss_bell_drop', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
        ctx.shake(tick, 'boss_bell_drop', t.x, t.z);
        ctx.hitAll(b, victims, B.damage, t.x, t.z);
        b.nextBellTick = tick + (b.casting >= 3 ? B.cast3CdTicks : B.cdTicks);
        b.nextPourTick = Math.max(b.nextPourTick, tick + 24);
      } else if (t.attack === 'firing') {
        const F = FOUNDER.firing;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        ctx.events.emit(tick, 'boss_firing', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, quenchTicks: F.quenchTicks });
        ctx.shake(tick, 'boss_firing', t.x, t.z);
        ctx.hitAll(b, victims, F.damage, t.x, t.z);
        // Quenched: the heat it poured out leaves it grey and open.
        b.mode = 'quenched';
        b.quenchUntil = tick + F.quenchTicks;
        b.takenMul = F.quenchTaken;
        b.nextFiringTick = tick + F.quenchTicks + (b.casting >= 3 ? F.cast3EveryTicks : F.everyTicks);
      }
      return;
    }
    if (b.mode === 'stoke') b.mode = 'tend'; // a cancelled Firing
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    // The Firing first: owed by a Casting, or due on its clock.
    const F = FOUNDER.firing;
    if (b.firingOwed || tick >= b.nextFiringTick) {
      b.firingOwed = false;
      b.mode = 'stoke';
      ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'firing', ticks: F.telegraphTicks, x: b.x, z: b.z, radius: F.radius, targetId: target.id });
      b.nextFiringTick = NEVER; // armed on the resolve
      return;
    }
    const P = FOUNDER.pour;
    if (tick >= b.nextPourTick && d >= P.minRange && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(0.2);
      let len = P.maxLen;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      if (len >= 2) {
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'pour',
          lance: true, // seats step sideways out of it
          ticks: P.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: P.width,
          targetId: target.id,
        });
        b.nextPourTick = tick + 100000; // armed on the resolve
        return;
      }
    }
    const B = FOUNDER.bell;
    if (tick >= b.nextBellTick) {
      const { mx, mz } = ctx.innerBounds(0.3);
      ctx.startTelegraph(b, tick, {
        kind: 'ring',
        attack: 'bell',
        ticks: B.telegraphTicks,
        x: Math.min(mx, Math.max(-mx, target.x)),
        z: Math.min(mz, Math.max(-mz, target.z)),
        radius: b.casting >= 3 ? B.cast3Radius : B.radius,
        targetId: target.id,
      });
      b.nextBellTick = tick + 100000; // armed on the resolve
    }
  },

  // Each add phase is a Casting: a mould breaks open, the Kiln's creatures
  // crawl out (boss.js spawns them from addsByPhase), and a Firing follows
  // at the next chance.
  onAddPhase(ctx, b, tick) {
    b.casting = Math.min(3, (b.casting || 0) + 1);
    b.firingOwed = true;
    ctx.events.emit(tick, 'boss_casting', { id: b.id, casting: b.casting, x: r2(b.x), z: r2(b.z) });
  },

  view(b) {
    return { mode: b.mode, casting: b.casting | 0, quenched: b.mode === 'quenched' };
  },
};
