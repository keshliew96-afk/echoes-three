// THE GEODE COLOSSUS — Act IV (The Hollow Heart) alternate boss (content
// plan 2, slice 5; docs/ACT_IV_BOSSES.md). When the singer will not show
// itself, the Heart grows a body of black rock and pale crystal to sing
// through: a hunched giant with a geode split open in its chest.
//
//   Fissure (primary): it slams a fist and a crack runs out along the floor —
//     an Ember LANE (1.0 u wide, up to 9 u, 54-tick warning) toward its
//     target, 17 to every body in it. The crack leaves three crystal patches
//     along its length (slick, 35 % slow, 4 s). Cooldown 270 ticks (190
//     enraged).
//   Geode Rain (secondary): four geodes fall from the ceiling — one on its
//     target (the player-targeted one) and three round it — each an Ember
//     RING r 1.1 (66-tick fall) that bursts for 11 and leaves a crystal patch.
//     Cooldown 360 ticks (280 enraged).
//   Geode Burst (close): with a body inside 2.4 u, an Ember RING r 2.6 round
//     itself (60-tick warning) that bursts for 20; enraged, six crystal shards
//     fly out of it (6 each). Then it is SPENT for 80 ticks: no attacks, the
//     party's punish window. Cooldown 330 ticks.
//   Enrage: under 40 % HP (`enraged`).
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;
const DEG = Math.PI / 180;

export const COLOSSUS = Object.freeze({
  name: 'THE GEODE COLOSSUS',
  radius: 0.85,
  hpMul: 1.1,
  moveSpeed: 1.15,
  scale: 2.6,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['husk', 'husk', 'censer']),
  fissure: Object.freeze({ damage: 17, cdTicks: 270, enragedCdTicks: 190, firstDelay: 90, telegraphTicks: 54, width: 1.0, maxLen: 9.0, range: 8.0, patches: 3, patchRadius: 0.75, patchTicks: 240, patchSlow: 0.35 }),
  rain: Object.freeze({ damage: 11, cdTicks: 360, enragedCdTicks: 280, firstDelay: 240, flightTicks: 66, radius: 1.1, side: 2.3, patchTicks: 240, patchSlow: 0.35 }),
  burst: Object.freeze({ damage: 20, cdTicks: 330, firstDelay: 120, telegraphTicks: 60, radius: 2.6, trigger: 2.4, spentTicks: 80, shards: 6, shardDamage: 6, shardSpeed: 4.5, shardRange: 4.5 }),
  enrageAt: 0.4,
  standoff: 0.9,
});

export default {
  id: 'colossus',
  def: COLOSSUS,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'spent'
    b.nextFissureTick = tick + COLOSSUS.fissure.firstDelay;
    b.nextRainTick = tick + COLOSSUS.rain.firstDelay;
    b.nextBurstTick = tick + COLOSSUS.burst.firstDelay;
    b.spentUntil = 0;
    b.enraged = false;
  },

  continuous(ctx, b, tick) {
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (b.telegraph || b.mode === 'spent') return; // planted
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    const stop = b.radius + target.radius + COLOSSUS.standoff;
    if (d > stop) {
      const adv = Math.min(COLOSSUS.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * COLOSSUS.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'fissure') {
        const F = COLOSSUS.fissure;
        const victims = ctx.partyBodies().filter((p) => {
          const px = p.x - t.fromX;
          const pz = p.z - t.fromZ;
          const along = px * t.dirX + pz * t.dirZ;
          if (along < -p.radius || along > t.length + p.radius) return false;
          return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
        });
        // The crack leaves crystal along its length (no damage of their own).
        const patches = [];
        for (let k = 1; k <= F.patches; k++) {
          const s = (t.length * k) / (F.patches + 0.5);
          const p = ctx.spawnSlick(b, t.fromX + t.dirX * s, t.fromZ + t.dirZ * s, { radius: F.patchRadius, ticks: F.patchTicks, slow: F.patchSlow, variant: 'crystal' });
          patches.push(p.id);
        }
        ctx.events.emit(tick, 'boss_fissure', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length, patches });
        ctx.shake(tick, 'boss_fissure', t.fromX + t.dirX * 1.2, t.fromZ + t.dirZ * 1.2);
        ctx.hitAll(b, victims, F.damage, t.fromX, t.fromZ, 'lane');
        b.nextFissureTick = tick + (b.enraged ? F.enragedCdTicks : F.cdTicks);
      } else if (t.attack === 'burst') {
        const B = COLOSSUS.burst;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        const shots = [];
        if (b.enraged) {
          for (let k = 0; k < B.shards; k++) {
            const a = (k / B.shards) * Math.PI * 2 + 30 * DEG;
            shots.push(ctx.fireShot(b, tick, Math.cos(a), Math.sin(a), { speed: B.shardSpeed, range: B.shardRange, power: B.shardDamage * ctx.dmgMul() }).id);
          }
        }
        ctx.events.emit(tick, 'boss_geode_burst', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, shots });
        ctx.shake(tick, 'boss_geode_burst', t.x, t.z);
        ctx.hitAll(b, victims, B.damage, t.x, t.z);
        b.mode = 'spent';
        b.spentUntil = tick + B.spentTicks;
        b.nextBurstTick = tick + B.cdTicks;
      }
      return;
    }
    if (b.mode === 'spent') {
      if (tick < b.spentUntil) return;
      b.mode = 'stalk';
      b.nextFissureTick = Math.max(b.nextFissureTick, tick + 30);
      ctx.events.emit(tick, 'boss_geode_recover', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    // Geode Burst first when the party crowds it.
    const B = COLOSSUS.burst;
    if (tick >= b.nextBurstTick) {
      let close = false;
      for (const p of ctx.partyBodies()) if (Math.hypot(p.x - b.x, p.z - b.z) <= B.trigger + p.radius) close = true;
      if (close) {
        ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'burst', ticks: B.telegraphTicks, x: b.x, z: b.z, radius: B.radius, targetId: target.id });
        return;
      }
    }
    const F = COLOSSUS.fissure;
    if (tick >= b.nextFissureTick && d <= F.range && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(0.2);
      let len = F.maxLen;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      if (len >= 1.5) {
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'fissure',
          lance: true,
          ticks: F.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: F.width,
          targetId: target.id,
        });
        b.nextFissureTick = tick + 100000; // armed on the resolve
        return;
      }
    }
    const R = COLOSSUS.rain;
    if (tick >= b.nextRainTick && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(0.4);
      // The aimed geode, one either side and one behind the target.
      const spots = [
        [target.x, target.z, true],
        [target.x - dirZ * R.side, target.z + dirX * R.side, false],
        [target.x + dirZ * R.side, target.z - dirX * R.side, false],
        [target.x + dirX * R.side, target.z + dirZ * R.side, false],
      ];
      const globs = [];
      for (const [px, pz, aimed] of spots) {
        const g = ctx.spawnGlob(b, tick, {
          tx: Math.min(mx, Math.max(-mx, px)),
          tz: Math.min(mz, Math.max(-mz, pz)),
          flightTicks: R.flightTicks,
          radius: R.radius,
          power: R.damage * ctx.dmgMul(),
          slickRadius: R.radius * 0.85,
          slickTicks: R.patchTicks,
          slickSlow: R.patchSlow,
          slickVariant: 'crystal',
          shard: true,
          playerTargeted: aimed,
          targetId: aimed ? target.id : null,
        });
        globs.push(g.id);
      }
      ctx.events.emit(tick, 'boss_geode_rain', { id: b.id, x: r2(b.x), z: r2(b.z), globs });
      b.nextRainTick = tick + (b.enraged ? R.enragedCdTicks : R.cdTicks);
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, spent: b.mode === 'spent' };
  },
};
