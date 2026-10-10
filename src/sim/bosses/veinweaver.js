// THE VEIN WEAVER — Act IV (Hollow Heart) third boss, met only in the
// Endless Descent (content plan 3, slice 11; docs/THIRD_BOSSES.md). The
// Heart's own spider: a crystal-backed weaver that spins the violet veins
// through the chamber walls. The Cantor sings and the Colossus smashes; the
// Weaver ties the party to itself and then makes the Heart beat.
//
//   Bind (primary): an Ember LANE from it toward its target (0.9 u wide, up
//     to 8 u, 44-tick warning): a vein thread. 9 to every body in it, and
//     each one is BOUND for 2.5 s: while bound, a hero cannot walk farther
//     than 3.6 u from it (3.0 enraged); past that the thread reels them back
//     in (a hero caught at the far end is drawn to the leash over ~10 ticks).
//     Cooldown 300 ticks (220 enraged). `lance: true`.
//   Heartbeat Slam: with a body inside 2.6 u, or anyone bound to it, an
//     Ember RING r 2.8 round itself (60-tick warning) for 18; it leaves four
//     vein patches round the ring (40 % slow, 4 s). A bound hero who stands
//     at the end of the thread is just out of reach. Cooldown 300 ticks.
//   Brood Sacs: three egg sacs lobbed at its target and either side of it,
//     each an Ember RING r 1.1 (64-tick fall) that bursts for 10 and leaves
//     a web (50 % slow, 4 s). Cooldown 400 ticks (320 enraged).
//   Enrage: under 40 % HP (`enraged`), a shorter thread and cooldowns.
//   Add phases call the Heart's husks and a Vein Siphon.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const VEINWEAVER = Object.freeze({
  name: 'THE VEIN WEAVER',
  radius: 0.85,
  hpMul: 1.1,
  moveSpeed: 1.25,
  enragedMoveSpeed: 1.5,
  scale: 2.4,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['husk', 'husk', 'siphon']),
  bind: Object.freeze({ damage: 9, cdTicks: 300, enragedCdTicks: 220, firstDelay: 80, telegraphTicks: 44, width: 0.9, maxLen: 8.0, range: 7.5, bindTicks: 150, leash: 3.6, enragedLeash: 3.0, haul: 0.12 }),
  slam: Object.freeze({ damage: 18, cdTicks: 300, firstDelay: 150, telegraphTicks: 60, radius: 2.8, trigger: 2.6, patches: 4, patchRing: 2.1, patchRadius: 0.7, patchTicks: 240, patchSlow: 0.4 }),
  brood: Object.freeze({ damage: 10, cdTicks: 400, enragedCdTicks: 320, firstDelay: 260, flightTicks: 64, radius: 1.1, side: 2.2, webTicks: 240, webSlow: 0.5 }),
  enrageAt: 0.4,
  standoff: 1.3,
});

export default {
  id: 'veinweaver',
  def: VEINWEAVER,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'spin' | 'beat'
    b.nextBindTick = tick + VEINWEAVER.bind.firstDelay;
    b.nextSlamTick = tick + VEINWEAVER.slam.firstDelay;
    b.nextBroodTick = tick + VEINWEAVER.brood.firstDelay;
    b.binds = []; // [{ id, untilTick }] heroes on a thread
    b.enraged = false;
  },

  continuous(ctx, b, tick) {
    // The threads: a bound hero past the leash is hauled back toward it.
    if (b.binds.length) {
      const B = VEINWEAVER.bind;
      const leash = b.enraged ? B.enragedLeash : B.leash;
      const keep = [];
      for (const bd of b.binds) {
        const p = ctx.registry.byId(bd.id);
        if (!p || !(p.hp > 0) || tick >= bd.untilTick) {
          ctx.events.emit(tick, 'boss_bind_break', { id: b.id, target: bd.id });
          continue;
        }
        keep.push(bd);
        const dx = b.x - p.x;
        const dz = b.z - p.z;
        const l = Math.hypot(dx, dz);
        const over = l - leash;
        if (over > 0 && l > 1e-6) {
          const s = Math.min(over, B.haul + over * 0.25);
          ctx.walkStep(p, (dx / l) * s, (dz / l) * s, p.radius ?? 0.3);
        }
      }
      b.binds = keep;
    }
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    if (b.telegraph) return; // planted while it spins or beats
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    b.mode = 'stalk';
    const stop = b.radius + target.radius + VEINWEAVER.standoff;
    if (d > stop) {
      const speed = b.enraged ? VEINWEAVER.enragedMoveSpeed : VEINWEAVER.moveSpeed;
      const adv = Math.min(speed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * VEINWEAVER.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'bind') {
        const B = VEINWEAVER.bind;
        const victims = ctx.partyBodies().filter((p) => {
          const px = p.x - t.fromX;
          const pz = p.z - t.fromZ;
          const along = px * t.dirX + pz * t.dirZ;
          if (along < -p.radius || along > t.length + p.radius) return false;
          return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
        });
        const bound = [];
        for (const p of victims) {
          const at = b.binds.find((bd) => bd.id === p.id);
          if (at) at.untilTick = tick + B.bindTicks;
          else b.binds.push({ id: p.id, untilTick: tick + B.bindTicks });
          bound.push(p.id);
        }
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_bind', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length, bound });
        ctx.hitAll(b, victims, B.damage, t.fromX, t.fromZ, 'lane');
        b.nextBindTick = tick + (b.enraged ? B.enragedCdTicks : B.cdTicks);
        // A beat after the thread lands, the Heart answers.
        if (bound.length) b.nextSlamTick = Math.max(Math.min(b.nextSlamTick, tick + 40), tick + 24);
      } else if (t.attack === 'slam') {
        const S = VEINWEAVER.slam;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        const patches = [];
        for (let k = 0; k < S.patches; k++) {
          const a = (k / S.patches) * Math.PI * 2 + Math.PI / 4;
          const { mx, mz } = ctx.innerBounds(0.3);
          const px = Math.min(mx, Math.max(-mx, t.x + Math.cos(a) * S.patchRing));
          const pz = Math.min(mz, Math.max(-mz, t.z + Math.sin(a) * S.patchRing));
          patches.push(ctx.spawnSlick(b, px, pz, { radius: S.patchRadius, ticks: S.patchTicks, slow: S.patchSlow, variant: 'vein' }).id);
        }
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_vein_slam', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, patches });
        ctx.shake(tick, 'boss_vein_slam', t.x, t.z);
        ctx.hitAll(b, victims, S.damage, t.x, t.z);
        b.nextSlamTick = tick + S.cdTicks;
      }
      return;
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const party = ctx.partyBodies();
    // Heartbeat Slam when crowded or when someone is on a thread.
    const S = VEINWEAVER.slam;
    if (tick >= b.nextSlamTick) {
      let close = b.binds.length > 0;
      for (const p of party) if (Math.hypot(p.x - b.x, p.z - b.z) <= S.trigger + p.radius) close = true;
      if (close) {
        b.mode = 'beat';
        ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'slam', ticks: S.telegraphTicks, x: b.x, z: b.z, radius: S.radius, targetId: target.id });
        b.nextSlamTick = tick + 100000;
        return;
      }
    }
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    // Bind: a thread down a lane at its target.
    const B = VEINWEAVER.bind;
    if (tick >= b.nextBindTick && d <= B.range && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(0.2);
      let len = B.maxLen;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      if (len >= 1.5) {
        b.faceX = dirX;
        b.faceZ = dirZ;
        b.mode = 'spin';
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'bind',
          lance: true,
          ticks: B.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: B.width,
          targetId: target.id,
        });
        b.nextBindTick = tick + 100000;
        return;
      }
    }
    // Brood Sacs: lobbed at the target and either side of it (no telegraph
    // of the body's own: each sac carries its ring).
    const R = VEINWEAVER.brood;
    if (tick >= b.nextBroodTick && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(0.4);
      const spots = [
        [target.x, target.z, true],
        [target.x - dirZ * R.side, target.z + dirX * R.side, false],
        [target.x + dirZ * R.side, target.z - dirX * R.side, false],
      ];
      const globs = [];
      for (const [px, pz, aimed] of spots) {
        const g = ctx.spawnGlob(b, tick, {
          tx: Math.min(mx, Math.max(-mx, px)),
          tz: Math.min(mz, Math.max(-mz, pz)),
          flightTicks: R.flightTicks,
          radius: R.radius,
          power: R.damage * ctx.dmgMul(),
          slickRadius: R.radius * 0.9,
          slickTicks: R.webTicks,
          slickSlow: R.webSlow,
          slickVariant: 'vein',
          playerTargeted: aimed,
          targetId: aimed ? target.id : null,
        });
        globs.push(g.id);
      }
      ctx.events.emit(tick, 'boss_brood_sacs', { id: b.id, x: r2(b.x), z: r2(b.z), globs });
      b.nextBroodTick = tick + (b.enraged ? R.enragedCdTicks : R.cdTicks);
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, binds: b.binds.map((bd) => bd.id) };
  },
};
