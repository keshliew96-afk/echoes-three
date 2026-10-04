// THE LICH RAM — Act III (Ashen Barrow) second boss (docs/CONTENT_PLAN.md
// §2.4). The skeleton of the first ram, walked out of its mound with the
// barrow's graves answering it.
//
//   Horn Guard: party projectiles arriving within ±60° of its facing are
//     blocked (the Barrow Ram's guard, on a boss). It turns at only 75°/s, so
//     the party fights it from the flanks.
//   Grave Call (primary): three graves crack open around its target — one
//     under it and two 2.2 u to either side, each a lobbed soul (an Ember
//     ring r 1.0, 60 ticks) that bursts for 10. The grave under the target
//     then RAISES a Grave Mole (scaled like its add phases, inside the §11
//     add cap).
//     Cooldown 390 ticks (270 under 40% HP).
//   Bone Rush (secondary): only along its horns — when its target is within
//     ±25° of its facing it telegraphs an Ember lane (1.3 u wide, up to 7 u,
//     54 ticks) and rushes down it at 11 u/s for 12 to each party body it
//     crosses. The horns lodge in the ground at the end: it is STUCK for 75
//     ticks with the guard down — the punish window. Cooldown 300 ticks.
//
// The Wyrm dives under the party; the Lich Ram stands its ground, makes the
// party walk round it, and fills the room from below. Plain entity data.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const DEG = Math.PI / 180;
const r2 = (v) => Math.round(v * 100) / 100;
const angleTo = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
};

export const LICHRAM = Object.freeze({
  name: 'THE LICH RAM',
  radius: 0.7,
  hpMul: 0.8,
  moveSpeed: 1.2,
  turnRateDegPerSec: 75,
  scale: 2.2,
  guardHalfArcDeg: 60,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['ram', 'mole']),
  graves: Object.freeze({ damage: 10, cdTicks: 390, enragedCdTicks: 270, flightTicks: 60, radius: 1.0, side: 2.2, raise: 'mole', firstDelay: 150 }),
  rush: Object.freeze({ damage: 12, cdTicks: 300, firstDelay: 90, telegraphTicks: 54, width: 1.3, maxLen: 7.0, speed: 11.0, arcDeg: 25, stuckTicks: 75, engageRange: 6.0 }),
  enrageAt: 0.4,
  standoff: 1.2,
});

export default {
  id: 'lichram',
  def: LICHRAM,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'rush' | 'stuck'
    b.nextGraveTick = tick + LICHRAM.graves.firstDelay;
    b.nextRushTick = tick + LICHRAM.rush.firstDelay;
    b.rushVx = 0;
    b.rushVz = 0;
    b.rushTicksLeft = 0;
    b.rushHit = [];
    b.stuckUntil = 0;
    b.graves = []; // [{ x, z, landTick }] pending raises
    b.enraged = false;
    b.guard = { active: true, dirX: b.faceX, dirZ: b.faceZ, halfArcDeg: LICHRAM.guardHalfArcDeg, shapes: ['projectile'] };
  },

  continuous(ctx, b, tick) {
    const g = b.guard;
    if (b.mode === 'rush') {
      const hitWall = ctx.walkStep(b, b.rushVx, b.rushVz, b.radius);
      b.rushTicksLeft -= 1;
      for (const p of ctx.partyBodies()) {
        if (b.rushHit.includes(p.id)) continue;
        const d = Math.hypot(p.x - b.x, p.z - b.z);
        if (d <= b.radius + p.radius + 0.1) {
          b.rushHit.push(p.id);
          const l = d > 1e-6 ? d : 1;
          ctx.combat.applyDamage(p, LICHRAM.rush.damage * ctx.dmgMul(), { delivery: 'contact', shape: 'contact', dirX: (p.x - b.x) / l, dirZ: (p.z - b.z) / l, attacker: b.id });
        }
      }
      if (hitWall || b.rushTicksLeft <= 0) {
        b.mode = 'stuck';
        b.stuckUntil = tick + LICHRAM.rush.stuckTicks;
        g.active = false;
        ctx.events.emit(tick, 'boss_horns_stuck', { id: b.id, x: r2(b.x), z: r2(b.z), until: b.stuckUntil });
        ctx.shake(tick, 'boss_horns_stuck', b.x, b.z);
      }
      g.dirX = b.faceX;
      g.dirZ = b.faceZ;
      return;
    }
    if (b.mode === 'stuck') return;
    g.active = true;
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    if (!b.telegraph) {
      // Slow turn toward the target; it walks where its horns point.
      const want = Math.atan2(target.x - b.x, target.z - b.z);
      const have = Math.atan2(b.faceX, b.faceZ);
      const maxTurn = LICHRAM.turnRateDegPerSec * DEG * TICK_DT;
      const dA = angleTo(have, want);
      const next = have + Math.max(-maxTurn, Math.min(maxTurn, dA));
      b.faceX = Math.sin(next);
      b.faceZ = Math.cos(next);
      const d = Math.hypot(target.x - b.x, target.z - b.z);
      const stop = b.radius + target.radius + LICHRAM.standoff;
      if (d > stop && Math.abs(dA) < 60 * DEG) {
        const adv = Math.min(LICHRAM.moveSpeed * TICK_DT, d - stop);
        ctx.walkStep(b, b.faceX * adv, b.faceZ * adv, b.radius);
      }
    }
    g.dirX = b.faceX;
    g.dirZ = b.faceZ;
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * LICHRAM.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    // Graves that have burst raise their mole.
    if (b.graves.length) {
      const due = b.graves.filter((gr) => tick >= gr.landTick);
      b.graves = b.graves.filter((gr) => tick < gr.landTick);
      for (const gr of due) {
        const m = ctx.raiseAdd(LICHRAM.graves.raise, gr.x, gr.z);
        ctx.events.emit(tick, 'boss_grave_raise', { id: b.id, x: r2(gr.x), z: r2(gr.z), raised: m ? m.id : null });
      }
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'rush') {
        const step = LICHRAM.rush.speed * TICK_DT;
        b.mode = 'rush';
        b.rushVx = t.dirX * step;
        b.rushVz = t.dirZ * step;
        b.rushTicksLeft = Math.max(1, Math.ceil(t.length / step));
        b.rushHit = [];
        ctx.events.emit(tick, 'boss_rush', { id: b.id, x: r2(b.x), z: r2(b.z), len: r2(t.length) });
      }
      return;
    }
    if (b.mode === 'rush') return;
    if (b.mode === 'stuck') {
      if (tick < b.stuckUntil) return;
      b.mode = 'stalk';
      b.guard.active = true;
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    if (d < 1e-6) return;
    const dirX = (target.x - b.x) / d;
    const dirZ = (target.z - b.z) / d;
    const R = LICHRAM.rush;
    const ahead = dirX * b.faceX + dirZ * b.faceZ >= Math.cos(R.arcDeg * DEG);
    if (tick >= b.nextRushTick && ahead && d <= R.engageRange) {
      const fx = b.faceX;
      const fz = b.faceZ;
      const { mx, mz } = ctx.innerBounds(b.radius);
      let len = R.maxLen;
      if (fx > 1e-6) len = Math.min(len, (mx - b.x) / fx);
      else if (fx < -1e-6) len = Math.min(len, (-mx - b.x) / fx);
      if (fz > 1e-6) len = Math.min(len, (mz - b.z) / fz);
      else if (fz < -1e-6) len = Math.min(len, (-mz - b.z) / fz);
      if (len >= 1.5) {
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'rush',
          ticks: R.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + fx * len,
          z: b.z + fz * len,
          dirX: fx,
          dirZ: fz,
          length: len,
          width: R.width,
          targetId: target.id,
        });
        b.nextRushTick = tick + R.cdTicks;
        return;
      }
    }
    const G = LICHRAM.graves;
    if (tick >= b.nextGraveTick) {
      const { mx, mz } = ctx.innerBounds(0.4);
      const spots = [
        [target.x, target.z, true],
        [target.x - dirZ * G.side, target.z + dirX * G.side, false],
        [target.x + dirZ * G.side, target.z - dirX * G.side, false],
      ];
      const globs = [];
      for (const [px, pz, aimed] of spots) {
        const tx = Math.min(mx, Math.max(-mx, px));
        const tz = Math.min(mz, Math.max(-mz, pz));
        const gl = ctx.spawnGlob(b, tick, {
          tx,
          tz,
          flightTicks: G.flightTicks,
          radius: G.radius,
          power: G.damage * ctx.dmgMul(),
          // A cracked grave leaves no slick: the mole is what it leaves.
          slickRadius: 0,
          slickTicks: 1,
          slickSlow: 0,
          playerTargeted: aimed,
          targetId: aimed ? target.id : null,
        });
        globs.push(gl.id);
        // Only the aimed grave raises its dead; its sisters only burst.
        if (aimed) b.graves.push({ x: tx, z: tz, landTick: tick + G.flightTicks });
      }
      ctx.events.emit(tick, 'boss_grave_call', { id: b.id, x: r2(b.x), z: r2(b.z), globs });
      b.nextGraveTick = tick + (b.enraged ? G.enragedCdTicks : G.cdTicks);
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, guard: !!(b.guard && b.guard.active), graves: b.graves.length };
  },
};
