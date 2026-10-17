// THE CINDERBACK — the Ember Kiln's alternate boss and its warden (content
// plan 5, slice 8; docs/KILN_BOSSES.md). A great fire salamander that basked
// in the kiln's mouth while the gods fired their bells and kept the fire fed;
// the Ember Newts are its brood. The hollow song found it in the coals. Where
// the Bellfounder stands off and fills the room with heat, the Cinderback
// swims through the floor and comes up under you.
//
//   Magma Dive (primary): it noses into the floor and an Ember RING r 2.0
//     opens under its target (76-tick warning); for the last 46 ticks it is
//     under the floor, out of reach, swimming to the ring. It bursts up for
//     16 to every hero inside and leaves a pool of slag (r 1.4, 30 % slow,
//     3 s). It comes up SPENT for 60 ticks (40 enraged): it attacks nothing
//     and takes 25 % more damage (the punish window). Cooldown 320 ticks (240
//     enraged).
//   Tail Lash (close): with a hero inside 2.8 u it swings its tail round, an
//     Ember CONE r 3.2, half-angle 65° toward the nearest hero (48-tick
//     warning), 12 and a throw 1.8 u back. Cooldown 240 ticks.
//   Ember Spit (from the Second phase, under 50 %): it rears and spits three
//     gobbets of fire, one onto each hero it can see (round its target when
//     there are fewer), each on its own Ember ring r 1.1 (60, 72, 84 ticks), 9
//     each, and each leaves a small slag pool. Cooldown 420 ticks.
//   Enrage: under 40 % HP (`enraged`).
//   Add phases call its newts and a Bellows Imp.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const CINDERBACK = Object.freeze({
  name: 'THE CINDERBACK',
  radius: 0.85,
  hpMul: 1.05,
  moveSpeed: 1.5,
  scale: 2.4,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['newt', 'newt', 'bellows']),
  dive: Object.freeze({ damage: 16, cdTicks: 320, enragedCdTicks: 240, firstDelay: 110, telegraphTicks: 76, underTicks: 46, radius: 2.0, poolRadius: 1.4, poolTicks: 180, poolSlow: 0.3, spentTicks: 60, enragedSpentTicks: 40, spentTaken: 1.25 }),
  lash: Object.freeze({ damage: 12, cdTicks: 240, firstDelay: 60, telegraphTicks: 48, trigger: 2.8, radius: 3.2, halfAngleDeg: 65, throwDist: 1.8, throwTicks: 8 }),
  spit: Object.freeze({ fromPhase: 2, damage: 9, cdTicks: 420, flightTicks: 60, step: 12, radius: 1.1, gobs: 3, poolRadius: 0.9, poolTicks: 120, poolSlow: 0.25, spread: 2.2 }),
  enrageAt: 0.4,
  standoff: 1.0,
});

export default {
  id: 'cinderback',
  def: CINDERBACK,

  spawn(ctx, b, tick) {
    b.mode = 'prowl'; // 'prowl' | 'nose' | 'under' | 'spent' | 'lash' | 'rear'
    b.phase = 0;
    b.nextDiveTick = tick + CINDERBACK.dive.firstDelay;
    b.nextLashTick = tick + CINDERBACK.lash.firstDelay;
    b.nextSpitTick = tick;
    b.enraged = false;
    b.spentUntil = 0;
    b.spitUntil = 0;
    b.shove = null; // { pushes: [[id, dx, dz]], ticksLeft }
  },

  continuous(ctx, b, tick) {
    const L = CINDERBACK.lash;
    // Heroes the tail caught are thrown clear over a few ticks.
    if (b.shove) {
      const per = L.throwDist / L.throwTicks;
      for (const [id, dx, dz] of b.shove.pushes) {
        const p = ctx.registry.byId(id);
        if (p && p.hp > 0) ctx.walkStep(p, dx * per, dz * per, p.radius ?? 0.3);
      }
      b.shove.ticksLeft -= 1;
      if (b.shove.ticksLeft <= 0) b.shove = null;
    }
    const t = b.telegraph;
    if (t && t.attack === 'dive') {
      // Nosing in, then under the floor for the last underTicks, swimming
      // straight to the ring (through props: it is under them).
      const left = t.resolveTick - tick;
      if (left > CINDERBACK.dive.underTicks) {
        b.mode = 'nose';
        return;
      }
      b.mode = 'under';
      b.hittable = false;
      const dx = t.x - b.x;
      const dz = t.z - b.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const step = Math.min(d, d / Math.max(1, left));
        const { mx, mz } = ctx.innerBounds(b.radius);
        b.x = Math.min(mx, Math.max(-mx, b.x + (dx / d) * step));
        b.z = Math.min(mz, Math.max(-mz, b.z + (dz / d) * step));
        b.faceX = dx / d;
        b.faceZ = dz / d;
      }
      return;
    }
    if (b.mode === 'spent' || b.mode === 'rear') return;
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target || t) return; // planted while it lashes: the shape is the promise
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    b.mode = 'prowl';
    const stop = b.radius + target.radius + CINDERBACK.standoff;
    if (d > stop) {
      const adv = Math.min(CINDERBACK.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    const D = CINDERBACK.dive;
    if (!b.enraged && b.hp <= b.maxHp * CINDERBACK.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    if (b.mode === 'spent') {
      if (tick < b.spentUntil) return;
      b.mode = 'prowl';
      delete b.takenMul;
      ctx.events.emit(tick, 'boss_cinder_recover', { id: b.id, x: r2(b.x), z: r2(b.z) });
      b.nextLashTick = Math.max(b.nextLashTick, tick + 20);
      return;
    }
    if (b.mode === 'rear') {
      if (tick < b.spitUntil) return;
      b.mode = 'prowl';
      return;
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'dive') {
        b.x = b.px = t.x;
        b.z = b.pz = t.z;
        b.hittable = true;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        const pool = ctx.spawnSlick(b, t.x, t.z, { radius: D.poolRadius, ticks: D.poolTicks, slow: D.poolSlow, variant: 'slag' }).id;
        ctx.events.emit(tick, 'boss_magma_dive', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, pool });
        ctx.shake(tick, 'boss_magma_dive', t.x, t.z);
        ctx.hitAll(b, victims, D.damage, t.x, t.z);
        // Spent: it surfaces slow and steaming, open to the party.
        b.mode = 'spent';
        b.spentUntil = tick + (b.enraged ? D.enragedSpentTicks : D.spentTicks);
        b.takenMul = D.spentTaken;
        b.nextDiveTick = tick + (b.enraged ? D.enragedCdTicks : D.cdTicks);
      } else if (t.attack === 'lash') {
        const L = CINDERBACK.lash;
        const cosHalf = Math.cos((t.halfAngleDeg * Math.PI) / 180);
        const victims = ctx.partyIn(t.x, t.z, t.radius).filter((p) => {
          const px = p.x - t.x;
          const pz = p.z - t.z;
          const l = Math.hypot(px, pz);
          if (l <= p.radius + 0.2) return true; // at its flank
          return (px * t.dirX + pz * t.dirZ) / l >= cosHalf;
        });
        const pushes = [];
        for (const p of victims) {
          const px = p.x - b.x;
          const pz = p.z - b.z;
          const l = Math.hypot(px, pz);
          pushes.push([p.id, l > 1e-6 ? px / l : t.dirX, l > 1e-6 ? pz / l : t.dirZ]);
        }
        b.mode = 'prowl';
        ctx.events.emit(tick, 'boss_tail_lash', { id: b.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), radius: t.radius, victims: victims.length });
        ctx.hitAll(b, victims, L.damage, t.x, t.z);
        const live = pushes.filter(([id]) => {
          const p = ctx.registry.byId(id);
          return p && p.hp > 0;
        });
        if (live.length) b.shove = { pushes: live, ticksLeft: L.throwTicks };
        b.nextLashTick = tick + L.cdTicks;
        b.nextDiveTick = Math.max(b.nextDiveTick, tick + 30);
      }
      return;
    }
    if (b.mode === 'nose' || b.mode === 'under' || b.mode === 'lash') b.mode = 'prowl'; // a cancelled shape
    b.hittable = true;
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const party = ctx.partyBodies();
    // Tail Lash first when someone stands at its flank.
    const L = CINDERBACK.lash;
    if (tick >= b.nextLashTick) {
      let close = null;
      let cd = Infinity;
      for (const p of party) {
        const dd = Math.hypot(p.x - b.x, p.z - b.z);
        if (dd <= L.trigger + p.radius && dd < cd) {
          cd = dd;
          close = p;
        }
      }
      if (close) {
        const dirX = cd > 1e-6 ? (close.x - b.x) / cd : b.faceX ?? 0;
        const dirZ = cd > 1e-6 ? (close.z - b.z) / cd : b.faceZ ?? 1;
        b.faceX = dirX;
        b.faceZ = dirZ;
        b.mode = 'lash';
        ctx.startTelegraph(b, tick, { kind: 'cone', attack: 'lash', ticks: L.telegraphTicks, x: b.x, z: b.z, dirX, dirZ, radius: L.radius, length: L.radius, halfAngleDeg: L.halfAngleDeg, targetId: close.id });
        b.nextLashTick = tick + 100000; // armed on the resolve
        return;
      }
    }
    // Ember Spit (from the Second phase): a gobbet onto each hero, each on
    // its own ring, the first one counted by the governor.
    const S = CINDERBACK.spit;
    if (b.phase >= S.fromPhase && tick >= b.nextSpitTick) {
      const { mx, mz } = ctx.innerBounds(0.4);
      const clamp = (x, z) => [Math.min(mx, Math.max(-mx, x)), Math.min(mz, Math.max(-mz, z))];
      const spots = [];
      // Party order is seat order (registry order), so the spots are stable.
      for (const p of party) if (spots.length < S.gobs) spots.push(clamp(p.x, p.z));
      for (let k = spots.length; k < S.gobs; k++) {
        const a = (k / S.gobs) * Math.PI * 2;
        spots.push(clamp(target.x + Math.cos(a) * S.spread, target.z + Math.sin(a) * S.spread));
      }
      const gobs = [];
      for (let k = 0; k < spots.length; k++) {
        const [px, pz] = spots[k];
        const g = ctx.spawnGlob(b, tick, {
          tx: px,
          tz: pz,
          flightTicks: S.flightTicks + k * S.step,
          radius: S.radius,
          power: S.damage * ctx.dmgMul(),
          slickRadius: S.poolRadius,
          slickTicks: S.poolTicks,
          slickSlow: S.poolSlow,
          slickVariant: 'slag',
          ember: true,
          playerTargeted: k === 0,
          targetId: k === 0 ? target.id : null,
        });
        gobs.push(g.id);
      }
      b.mode = 'rear';
      b.spitUntil = tick + 30;
      ctx.events.emit(tick, 'boss_ember_spit', { id: b.id, x: r2(b.x), z: r2(b.z), gobs, spots: spots.map(([x, z]) => [r2(x), r2(z)]) });
      b.nextSpitTick = tick + S.cdTicks;
      b.nextDiveTick = Math.max(b.nextDiveTick, tick + S.flightTicks + 40);
      return;
    }
    // Magma Dive under its target.
    if (tick >= b.nextDiveTick) {
      const { mx, mz } = ctx.innerBounds(b.radius);
      b.mode = 'nose';
      ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'dive', ticks: D.telegraphTicks, x: Math.min(mx, Math.max(-mx, target.x)), z: Math.min(mz, Math.max(-mz, target.z)), radius: D.radius, targetId: target.id });
      b.nextDiveTick = tick + 100000; // armed on the resolve
    }
  },

  onAddPhase(ctx, b, tick) {
    b.phase = Math.min(3, (b.phase || 0) + 1);
    ctx.events.emit(tick, 'boss_cinderback_phase', { id: b.id, phase: b.phase, x: r2(b.x), z: r2(b.z) });
  },

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, spent: b.mode === 'spent', under: b.mode === 'under', phase: b.phase | 0 };
  },
};
