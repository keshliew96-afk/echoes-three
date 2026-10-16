// THE HOURWARDEN — Act V (The Still Spire) third boss (content plan 5,
// slice 1; docs/THIRD_BOSSES.md "The Spire"). The gods' clock: a tall bronze
// clock-jack that struck the hours on the Spire's bells until the gods sat
// down to watch and the clock stopped. The hollow song wound it again, and
// now it counts the party down. It is met in the Clock Loft (layout 35) once
// the save has felled the Hush and the Skyhorn (`gated`).
//
//   Pendulum (primary): it plants and the great pendulum in its case swings
//     out down an Ember LANE from it through its target (1.4 u wide, up to
//     9.5 u, 54-tick warning) for 14, then BACK along the same lane 30 ticks
//     later for 10 (the lane stays lit between the two). A hero who steps
//     back into the lane after the first pass is caught by the second.
//     `lance: true`, so AI allies step out of it. Cooldown 300 ticks (230
//     enraged).
//   Hand Sweep (close): with a body inside 2.8 u, its two clock hands scythe
//     an Ember CONE in front (3.4 u, 70 degrees either side, 40-tick
//     warning), 13 to every body in it, and each is thrown 1.8 u away.
//     Cooldown 220 ticks.
//   Toll of the Hours: it strikes the hour and bronze clock weights fall
//     round it like the marks on a dial: Ember RINGS r 1.3 on a circle about
//     itself at its target's distance (2.5 to 6.5 u), the first on the
//     target, each next one an hour (30 degrees) clockwise and 14 ticks
//     later; 11 each. Three hours, four from the Second phase (under 50 %),
//     six enraged. Cooldown 480 ticks (380 enraged), first at 4 s.
//   Run Down: after the last weight of a Toll lands, its spring is spent
//     for 70 ticks: the key in its back turns, it attacks nothing and takes
//     25 % more damage (the punish window).
//   Enrage: under 40 % HP (`enraged`): shorter cooldowns, six hours.
//   Add phases call two chimes and a Vane Cock.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const HOURWARDEN = Object.freeze({
  name: 'THE HOURWARDEN',
  radius: 0.85,
  hpMul: 1.0,
  moveSpeed: 1.45,
  scale: 2.4,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['chime', 'chime', 'vane']),
  pendulum: Object.freeze({ damage: 14, backDamage: 10, cdTicks: 300, enragedCdTicks: 230, firstDelay: 90, telegraphTicks: 54, backTicks: 30, width: 1.4, maxLen: 9.5, minRange: 1.6, range: 9.0 }),
  sweep: Object.freeze({ damage: 13, cdTicks: 220, firstDelay: 60, telegraphTicks: 40, trigger: 2.8, length: 3.4, halfAngleDeg: 70, shoveDist: 1.8, shoveTicks: 8 }),
  toll: Object.freeze({ damage: 11, cdTicks: 480, enragedCdTicks: 380, firstDelay: 240, flightTicks: 60, step: 14, radius: 1.3, hours: 3, hoursPhase2: 4, hoursEnraged: 6, minDist: 2.5, maxDist: 6.5, hourRad: Math.PI / 6 }),
  runDown: Object.freeze({ ticks: 70, taken: 1.25 }),
  enrageAt: 0.4,
  standoff: 1.0,
});

// The hours a Toll strikes now.
export function tollHours(b) {
  const T = HOURWARDEN.toll;
  if (b.enraged) return T.hoursEnraged;
  return (b.phase | 0) >= 2 ? T.hoursPhase2 : T.hours;
}

// The points of a Toll of the Hours about (bx, bz) aimed at (tx, tz):
// [[x, z], ...] clockwise from the target (seen from above, +X east, +Z
// south), kept inside the room by `clamp`.
export function tollSpots(bx, bz, tx, tz, hours, clamp = (x, z) => [x, z]) {
  const T = HOURWARDEN.toll;
  const dx = tx - bx;
  const dz = tz - bz;
  const d = Math.min(T.maxDist, Math.max(T.minDist, Math.hypot(dx, dz)));
  const a0 = Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dz, dx) : Math.PI / 2;
  const out = [];
  for (let k = 0; k < hours; k++) {
    // Clockwise on the screen (the camera looks north, -Z up): +angle.
    const a = a0 + k * T.hourRad;
    out.push(clamp(bx + Math.cos(a) * d, bz + Math.sin(a) * d));
  }
  return out;
}

export default {
  id: 'hourwarden',
  def: HOURWARDEN,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'swing' | 'backswing' | 'sweep' | 'strike' | 'rundown'
    b.phase = 0;
    b.nextPendulumTick = tick + HOURWARDEN.pendulum.firstDelay;
    b.nextSweepTick = tick + HOURWARDEN.sweep.firstDelay;
    b.nextTollTick = tick + HOURWARDEN.toll.firstDelay;
    b.enraged = false;
    b.tollEnd = 0; // the tick the last weight of a Toll lands (then it runs down)
    b.runDownUntil = 0;
    b.shove = null; // { pushes: [[id, dx, dz]], ticksLeft } while the hands throw
  },

  continuous(ctx, b, tick) {
    // Heroes the hands caught are thrown clear over a few ticks.
    if (b.shove) {
      const S = HOURWARDEN.sweep;
      const per = S.shoveDist / S.shoveTicks;
      for (const [id, dx, dz] of b.shove.pushes) {
        const p = ctx.registry.byId(id);
        if (p && p.hp > 0) ctx.walkStep(p, dx * per, dz * per, p.radius ?? 0.3);
      }
      b.shove.ticksLeft -= 1;
      if (b.shove.ticksLeft <= 0) b.shove = null;
    }
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    // Planted while it swings, sweeps, strikes the hour or runs down.
    if (b.telegraph || b.mode === 'strike' || b.mode === 'rundown') return;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    b.mode = 'stalk';
    const stop = b.radius + target.radius + HOURWARDEN.standoff;
    if (d > stop) {
      const adv = Math.min(HOURWARDEN.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * HOURWARDEN.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    // The hour struck: it waits for its last weight, then its spring runs down.
    if (b.mode === 'strike') {
      if (tick < b.tollEnd) return;
      const R = HOURWARDEN.runDown;
      b.mode = 'rundown';
      b.runDownUntil = tick + R.ticks;
      b.takenMul = R.taken;
      ctx.events.emit(tick, 'boss_run_down', { id: b.id, x: r2(b.x), z: r2(b.z), ticks: R.ticks });
      return;
    }
    if (b.mode === 'rundown') {
      if (tick < b.runDownUntil) return;
      b.mode = 'stalk';
      delete b.takenMul;
      ctx.events.emit(tick, 'boss_wound', { id: b.id, x: r2(b.x), z: r2(b.z) });
      b.nextSweepTick = Math.max(b.nextSweepTick, tick + 20);
      b.nextPendulumTick = Math.max(b.nextPendulumTick, tick + 30);
      return;
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      // The back-swing is the first swing's promise kept, not a new one: it
      // never counts against the governor (see below), so it ends quietly.
      if (t.attack === 'backswing') b.telegraph = null;
      else ctx.endTelegraph(b, tick);
      if (t.attack === 'pendulum' || t.attack === 'backswing') {
        const P = HOURWARDEN.pendulum;
        const back = t.attack === 'backswing';
        const victims = ctx.partyBodies().filter((p) => {
          const px = p.x - t.fromX;
          const pz = p.z - t.fromZ;
          const along = px * t.dirX + pz * t.dirZ;
          if (along < -p.radius || along > t.length + p.radius) return false;
          return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
        });
        ctx.events.emit(tick, back ? 'boss_pendulum_back' : 'boss_pendulum', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length });
        ctx.hitAll(b, victims, back ? P.backDamage : P.damage, t.fromX, t.fromZ, 'lane');
        if (!back) {
          // The swing comes back along the same lane: the shape stays lit.
          // It is the same lane the party was already warned of, so it is
          // not a new player-targeted telegraph (the governor neither waits
          // on it nor counts it).
          ctx.shake(tick, 'boss_pendulum', t.fromX + t.dirX * t.length, t.fromZ + t.dirZ * t.length);
          b.mode = 'backswing';
          b.telegraph = { ...t, attack: 'backswing', ticks: P.backTicks, startTick: tick, resolveTick: tick + P.backTicks, playerTargeted: false };
          ctx.events.emit(tick, 'boss_telegraph_start', { id: b.id, attack: 'backswing', shape: 'lane', x: r2(t.x), z: r2(t.z), resolveTick: tick + P.backTicks });
          return;
        }
        b.mode = 'stalk';
        b.nextPendulumTick = tick + (b.enraged ? P.enragedCdTicks : P.cdTicks);
        b.nextSweepTick = Math.max(b.nextSweepTick, tick + 24);
      } else if (t.attack === 'sweep') {
        const S = HOURWARDEN.sweep;
        const cosHalf = Math.cos((t.halfAngleDeg * Math.PI) / 180);
        const victims = ctx.partyIn(t.x, t.z, t.radius).filter((p) => {
          const px = p.x - t.x;
          const pz = p.z - t.z;
          const l = Math.hypot(px, pz);
          if (l <= p.radius + 0.2) return true; // at its feet
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
        ctx.events.emit(tick, 'boss_hand_sweep', { id: b.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), radius: t.radius, victims: victims.length });
        ctx.hitAll(b, victims, S.damage, t.x, t.z);
        if (pushes.length) b.shove = { pushes, ticksLeft: S.shoveTicks };
        b.nextSweepTick = tick + S.cdTicks;
      }
      return;
    }
    if (b.mode !== 'stalk') b.mode = 'stalk'; // a cancelled shape
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const party = ctx.partyBodies();
    // Hand Sweep first when someone stands at its hands.
    const S = HOURWARDEN.sweep;
    if (tick >= b.nextSweepTick) {
      let close = null;
      let cd = Infinity;
      for (const p of party) {
        const dd = Math.hypot(p.x - b.x, p.z - b.z);
        if (dd <= S.trigger + p.radius && dd < cd) {
          cd = dd;
          close = p;
        }
      }
      if (close) {
        const dirX = cd > 1e-6 ? (close.x - b.x) / cd : b.faceX ?? 0;
        const dirZ = cd > 1e-6 ? (close.z - b.z) / cd : b.faceZ ?? 1;
        b.faceX = dirX;
        b.faceZ = dirZ;
        b.mode = 'sweep';
        ctx.startTelegraph(b, tick, { kind: 'cone', attack: 'sweep', ticks: S.telegraphTicks, x: b.x, z: b.z, dirX, dirZ, radius: S.length, length: S.length, halfAngleDeg: S.halfAngleDeg, targetId: close.id });
        b.nextSweepTick = tick + 100000; // armed on the resolve
        return;
      }
    }
    // Toll of the Hours when due: the weights carry their own rings.
    const T = HOURWARDEN.toll;
    if (tick >= b.nextTollTick) {
      const hours = tollHours(b);
      const { mx, mz } = ctx.innerBounds(0.4);
      const clamp = (x, z) => [Math.min(mx, Math.max(-mx, x)), Math.min(mz, Math.max(-mz, z))];
      const spots = tollSpots(b.x, b.z, target.x, target.z, hours, clamp);
      const weights = [];
      for (let k = 0; k < spots.length; k++) {
        const [px, pz] = spots[k];
        const g = ctx.spawnGlob(b, tick, {
          tx: px,
          tz: pz,
          flightTicks: T.flightTicks + k * T.step,
          radius: T.radius,
          power: T.damage * ctx.dmgMul(),
          slickRadius: 0,
          weight: true,
          playerTargeted: k === 0,
          targetId: k === 0 ? target.id : null,
        });
        weights.push(g.id);
      }
      b.mode = 'strike';
      b.tollEnd = tick + T.flightTicks + (spots.length - 1) * T.step;
      ctx.events.emit(tick, 'boss_toll_hours', { id: b.id, x: r2(b.x), z: r2(b.z), hours: spots.length, weights, spots: spots.map(([x, z]) => [r2(x), r2(z)]) });
      b.nextTollTick = tick + (b.enraged ? T.enragedCdTicks : T.cdTicks);
      b.nextPendulumTick = Math.max(b.nextPendulumTick, b.tollEnd + HOURWARDEN.runDown.ticks + 30);
      return;
    }
    // Pendulum through its target.
    const P = HOURWARDEN.pendulum;
    if (tick >= b.nextPendulumTick) {
      const d = Math.hypot(target.x - b.x, target.z - b.z);
      if (d >= P.minRange && d <= P.range && d > 1e-6) {
        const dirX = (target.x - b.x) / d;
        const dirZ = (target.z - b.z) / d;
        const { mx, mz } = ctx.innerBounds(0.3);
        let wallLen = Infinity;
        if (dirX > 1e-6) wallLen = Math.min(wallLen, (mx - b.x) / dirX);
        else if (dirX < -1e-6) wallLen = Math.min(wallLen, (-mx - b.x) / dirX);
        if (dirZ > 1e-6) wallLen = Math.min(wallLen, (mz - b.z) / dirZ);
        else if (dirZ < -1e-6) wallLen = Math.min(wallLen, (-mz - b.z) / dirZ);
        const len = Math.min(P.maxLen, wallLen);
        if (len >= 2) {
          b.faceX = dirX;
          b.faceZ = dirZ;
          b.mode = 'swing';
          ctx.startTelegraph(b, tick, {
            kind: 'lane',
            attack: 'pendulum',
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
          b.nextPendulumTick = tick + 100000; // armed when the back-swing lands
        }
      }
    }
  },

  onAddPhase(ctx, b, tick) {
    b.phase = Math.min(3, (b.phase || 0) + 1);
    ctx.events.emit(tick, 'boss_hourwarden_phase', { id: b.id, phase: b.phase, x: r2(b.x), z: r2(b.z) });
  },

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, phase: b.phase | 0, runDown: b.mode === 'rundown', striking: b.mode === 'strike' };
  },
};
