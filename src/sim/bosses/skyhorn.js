// THE SKYHORN — Act V (The Still Spire) alternate boss and the Spire's
// warden (content plan 4, slice 3; docs/ACT_V_BOSSES.md). A great ibex of the
// high ledges whose curled horns were cast in bell bronze; it kept the stair
// to the gods' belfry until the hollow song reached the top and turned it.
// Where the Hush stands off and empties the room, the Skyhorn rushes it.
//
//   Horn Rush (primary): it paws the floor while an Ember LANE (1.3 u wide)
//     runs from it through its target to the wall (up to 11 u, 60-tick
//     warning), then charges down the lane at 12 u/s. Each hero it touches
//     takes 12 once and is thrown 2.2 u aside. A rush that ends against the
//     wall (or a barricade) leaves it DAZED for 75 ticks: no attacks, and it
//     takes 25 % more damage (the punish window). Cooldown 300 ticks (220
//     enraged); when it is ready and its target stands at its horns it backs
//     off to make room. Enraged, a rush that does not end dazed chains
//     straight into a second one.
//   Bell Toll (close): with a body inside 2.6 u it clashes its horns, an
//     Ember RING r 2.9 round itself (50-tick warning), 12 and a 30 % slow for
//     1 s. Cooldown 260 ticks.
//   Sky Leap (from the Second phase, under 50 %): it bounds up the room's
//     air and comes down on the farthest hero, an Ember RING r 2.0 (72-tick
//     warning; out of reach for the last 36 ticks of it), 18, and six stone
//     shards fly out of the landing (6 each). Cooldown 480 ticks.
//   Enrage: under 40 % HP (`enraged`).
//   Add phases call the Spire's kites and a gargoyle.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const SKYHORN = Object.freeze({
  name: 'THE SKYHORN',
  radius: 0.8,
  hpMul: 1.05,
  moveSpeed: 1.6,
  scale: 2.5,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['kite', 'kite', 'gargoyle']),
  rush: Object.freeze({ damage: 12, cdTicks: 300, enragedCdTicks: 220, firstDelay: 100, chainTelegraphTicks: 44, telegraphTicks: 60, width: 1.3, maxLen: 11.0, minRange: 2.0, range: 9.5, speed: 12, throwDist: 2.2, throwTicks: 8, dazedTicks: 75, dazedTaken: 1.25, wallSlack: 0.35 }),
  toll: Object.freeze({ damage: 12, cdTicks: 260, firstDelay: 60, telegraphTicks: 50, radius: 2.9, trigger: 2.6, slow: 0.3, slowTicks: 60 }),
  leap: Object.freeze({ fromPhase: 2, damage: 18, cdTicks: 480, telegraphTicks: 72, airTicks: 36, radius: 2.0, shards: 6, shardDamage: 6, shardSpeed: 4.5, shardRange: 4.2 }),
  enrageAt: 0.4,
  standoff: 0.9,
  backOff: 1.4, // backs off to minRange + this when its rush is ready
});

export default {
  id: 'skyhorn',
  def: SKYHORN,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'paw' | 'rush' | 'dazed' | 'toll' | 'crouch' | 'air'
    b.phase = 0;
    b.nextRushTick = tick + SKYHORN.rush.firstDelay;
    b.nextTollTick = tick + SKYHORN.toll.firstDelay;
    b.nextLeapTick = tick;
    b.enraged = false;
    b.rushRun = null; // { dirX, dirZ, left, toWall, hits: [], chained }
    b.dazedUntil = 0;
    b.chain = false; // enraged: the next rush comes at once
    b.shove = null; // { pushes: [[id, dx, dz]], ticksLeft }
  },

  continuous(ctx, b, tick) {
    const R = SKYHORN.rush;
    // Heroes it struck are thrown clear over a few ticks (the party ignores
    // knockback, so the throw is its own; the Rope Hanger's pattern).
    if (b.shove) {
      const per = R.throwDist / R.throwTicks;
      for (const [id, dx, dz] of b.shove.pushes) {
        const p = ctx.registry.byId(id);
        if (p && p.hp > 0) ctx.walkStep(p, dx * per, dz * per, p.radius ?? 0.3);
      }
      b.shove.ticksLeft -= 1;
      if (b.shove.ticksLeft <= 0) b.shove = null;
    }
    if (b.mode === 'rush' && b.rushRun) {
      const run = b.rushRun;
      const want = Math.min(R.speed * TICK_DT, run.left);
      const x0 = b.x;
      const z0 = b.z;
      ctx.walkStep(b, run.dirX * want, run.dirZ * want, b.radius);
      const moved = Math.hypot(b.x - x0, b.z - z0);
      run.left -= want;
      // Every hero it passes, once.
      const nx = -run.dirZ;
      const nz = run.dirX;
      for (const p of ctx.partyBodies()) {
        if (run.hits.includes(p.id)) continue;
        if (Math.hypot(p.x - b.x, p.z - b.z) > b.radius + p.radius + 0.15) continue;
        run.hits.push(p.id);
        const side = (p.x - b.x) * nx + (p.z - b.z) * nz >= 0 ? 1 : -1;
        ctx.hitAll(b, [p], R.damage, b.x - nx * side, b.z - nz * side, 'lane');
        if (p.hp > 0) {
          if (!b.shove) b.shove = { pushes: [], ticksLeft: R.throwTicks };
          b.shove.pushes.push([p.id, nx * side, nz * side]);
          b.shove.ticksLeft = R.throwTicks;
        }
      }
      // Stopped short by a prop, or the run is spent.
      if (moved < want * 0.5) run.blocked = true;
      return;
    }
    const t = b.telegraph;
    if (t && t.attack === 'leap') {
      // Crouched, then airborne for the last airTicks, gliding over the room.
      const left = t.resolveTick - tick;
      if (left > SKYHORN.leap.airTicks) {
        b.mode = 'crouch';
        return;
      }
      b.mode = 'air';
      b.hittable = false;
      const dx = t.x - b.x;
      const dz = t.z - b.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const step = Math.min(d, d / Math.max(1, left));
        // Airborne: over props and barricades, kept inside the room.
        const { mx, mz } = ctx.innerBounds(b.radius);
        b.x = Math.min(mx, Math.max(-mx, b.x + (dx / d) * step));
        b.z = Math.min(mz, Math.max(-mz, b.z + (dz / d) * step));
        b.faceX = dx / d;
        b.faceZ = dz / d;
      }
      return;
    }
    if (b.mode === 'dazed') return;
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (t) return; // planted while it paws or tolls: the shape is the promise
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    b.mode = 'stalk';
    // Its rush is ready and its target is at its horns: it backs off along
    // the line to give itself room to charge (still facing the target).
    if (tick >= b.nextRushTick && d < R.minRange + SKYHORN.backOff && d > 1e-6) {
      const back = SKYHORN.moveSpeed * 0.75 * TICK_DT;
      ctx.walkStep(b, -(dx / d) * back, -(dz / d) * back, b.radius);
      return;
    }
    const stop = b.radius + target.radius + SKYHORN.standoff;
    if (d > stop) {
      const adv = Math.min(SKYHORN.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    const R = SKYHORN.rush;
    if (!b.enraged && b.hp <= b.maxHp * SKYHORN.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    // The rush ends: spent (against the wall it is dazed) or stopped by a prop.
    if (b.mode === 'rush' && b.rushRun) {
      const run = b.rushRun;
      if (!(run.left <= 1e-6 || run.blocked)) return;
      const wall = run.blocked || run.toWall;
      b.rushRun = null;
      ctx.events.emit(tick, 'boss_horn_rush_end', { id: b.id, x: r2(b.x), z: r2(b.z), dx: r2(run.dirX), dz: r2(run.dirZ), hits: run.hits.length, wall });
      if (wall) {
        b.mode = 'dazed';
        b.dazedUntil = tick + R.dazedTicks;
        b.takenMul = R.dazedTaken;
        ctx.shake(tick, 'boss_horn_wall', b.x + run.dirX * b.radius, b.z + run.dirZ * b.radius);
        b.chain = false;
      } else {
        b.mode = 'stalk';
        // Enraged, an open-floor rush chains into a second one at once.
        b.chain = b.enraged && !run.chained;
      }
      b.nextRushTick = tick + (b.chain ? 1 : b.enraged ? R.enragedCdTicks : R.cdTicks);
      b.nextTollTick = Math.max(b.nextTollTick, tick + 20);
      return;
    }
    if (b.mode === 'dazed') {
      if (tick < b.dazedUntil) return;
      b.mode = 'stalk';
      delete b.takenMul;
      ctx.events.emit(tick, 'boss_horn_recover', { id: b.id, x: r2(b.x), z: r2(b.z) });
      return;
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'rush') {
        // The paw ends: it goes.
        b.mode = 'rush';
        b.rushRun = { dirX: t.dirX, dirZ: t.dirZ, left: t.length, toWall: !!t.toWall, hits: [], chained: !!t.chained, blocked: false };
        ctx.events.emit(tick, 'boss_horn_rush', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), wall: !!t.toWall });
      } else if (t.attack === 'toll') {
        const T = SKYHORN.toll;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_horn_toll', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
        ctx.hitAll(b, victims, T.damage, t.x, t.z);
        const st = ctx.combat.status;
        if (st && typeof st.apply === 'function') for (const p of victims) if (p.hp > 0) st.apply(p, 'slow', T.slow, T.slowTicks, tick, b.id);
        b.nextTollTick = tick + T.cdTicks;
      } else if (t.attack === 'leap') {
        const L = SKYHORN.leap;
        b.x = b.px = t.x;
        b.z = b.pz = t.z;
        b.hittable = true;
        b.mode = 'stalk';
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        const shots = [];
        for (let k = 0; k < L.shards; k++) {
          const a = (k / L.shards) * Math.PI * 2 + Math.PI / L.shards;
          shots.push(ctx.fireShot(b, tick, Math.cos(a), Math.sin(a), { speed: L.shardSpeed, range: L.shardRange, power: L.shardDamage * ctx.dmgMul() }).id);
        }
        ctx.events.emit(tick, 'boss_sky_leap', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, shots });
        ctx.shake(tick, 'boss_sky_leap', t.x, t.z);
        ctx.hitAll(b, victims, L.damage, t.x, t.z);
        b.nextLeapTick = tick + L.cdTicks;
        b.nextRushTick = Math.max(b.nextRushTick, tick + 40);
      }
      return;
    }
    if (b.mode !== 'stalk') b.mode = 'stalk'; // a cancelled shape
    b.hittable = true;
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const party = ctx.partyBodies();
    // Bell Toll first when someone stands at its horns.
    const T = SKYHORN.toll;
    if (tick >= b.nextTollTick && !b.chain) {
      let close = false;
      for (const p of party) if (Math.hypot(p.x - b.x, p.z - b.z) <= T.trigger + p.radius) close = true;
      if (close) {
        b.mode = 'toll';
        ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'toll', ticks: T.telegraphTicks, x: b.x, z: b.z, radius: T.radius, targetId: target.id });
        b.nextTollTick = tick + 100000;
        return;
      }
    }
    // Sky Leap (from the Second phase): on the farthest hero.
    const L = SKYHORN.leap;
    if (b.phase >= L.fromPhase && tick >= b.nextLeapTick && !b.chain) {
      let far = null;
      let fd = -1;
      for (const p of party) {
        const dd = Math.hypot(p.x - b.x, p.z - b.z);
        if (dd > fd) {
          fd = dd;
          far = p;
        }
      }
      if (far && fd >= 3) {
        const { mx, mz } = ctx.innerBounds(b.radius);
        b.mode = 'crouch';
        ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'leap', ticks: L.telegraphTicks, x: Math.min(mx, Math.max(-mx, far.x)), z: Math.min(mz, Math.max(-mz, far.z)), radius: L.radius, targetId: far.id });
        b.nextLeapTick = tick + 100000;
        return;
      }
    }
    // Horn Rush: through its target to the wall.
    if (tick >= b.nextRushTick) {
      const d = Math.hypot(target.x - b.x, target.z - b.z);
      if (d >= R.minRange && d <= R.range && d > 1e-6) {
        const dirX = (target.x - b.x) / d;
        const dirZ = (target.z - b.z) / d;
        const { mx, mz } = ctx.innerBounds(b.radius);
        let wallLen = Infinity;
        if (dirX > 1e-6) wallLen = Math.min(wallLen, (mx - b.x) / dirX);
        else if (dirX < -1e-6) wallLen = Math.min(wallLen, (-mx - b.x) / dirX);
        if (dirZ > 1e-6) wallLen = Math.min(wallLen, (mz - b.z) / dirZ);
        else if (dirZ < -1e-6) wallLen = Math.min(wallLen, (-mz - b.z) / dirZ);
        const len = Math.min(R.maxLen, wallLen);
        if (len >= 2) {
          const chained = b.chain;
          b.chain = false;
          b.mode = 'paw';
          ctx.startTelegraph(b, tick, {
            kind: 'lane',
            attack: 'rush',
            lance: true, // seats step sideways out of it
            ticks: chained ? R.chainTelegraphTicks : R.telegraphTicks,
            fromX: b.x,
            fromZ: b.z,
            x: b.x + dirX * len,
            z: b.z + dirZ * len,
            dirX,
            dirZ,
            length: len,
            width: R.width,
            toWall: wallLen - len < R.wallSlack,
            chained,
            targetId: target.id,
          });
          b.nextRushTick = tick + 100000; // armed when the rush ends
          return;
        }
      }
      if (b.chain) {
        b.chain = false;
        b.nextRushTick = tick + R.enragedCdTicks;
      }
    }
  },

  onAddPhase(ctx, b, tick) {
    b.phase = Math.min(3, (b.phase || 0) + 1);
    ctx.events.emit(tick, 'boss_skyhorn_phase', { id: b.id, phase: b.phase, x: r2(b.x), z: r2(b.z) });
  },

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, dazed: b.mode === 'dazed', phase: b.phase | 0, rushing: b.mode === 'rush' };
  },
};
