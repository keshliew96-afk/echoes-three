// THE BARROW WYRM — Act III (Ashen Barrow) boss kit (docs/CONTENT_PLAN.md
// §2.3). An ash-scaled grave worm that swims through the burial mound.
//
//   Ash Breath (primary): an Ember CONE from the Wyrm's jaws toward its target
//     (radius 4.2 u, half-angle 32°, 54-tick warning), 14 damage to every
//     party body inside. Cooldown 240 ticks (168 once enraged).
//   Burrow Strike (secondary): the Wyrm dives (untargetable, `hittable:
//     false`) and tunnels at 3.4 u/s toward its target for up to 150 ticks,
//     then commits to an emergence: an Ember RING r 1.9 at that spot (54-tick
//     warning) that bursts for 16 damage. It then lies EXPOSED for 90 ticks —
//     no attacks, the party's punish window. Cooldown 600 ticks.
//   Enrage: under 50% HP the breath cooldown drops by 30% (`enraged`).
//
// All per-boss state is plain entity data (mode, telegraph, burrow clock).
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const WYRM = Object.freeze({
  name: 'THE BARROW WYRM',
  radius: 0.7,
  hpMul: 0.85, // x the act's boss HP (the burrow windows already stretch the fight)
  moveSpeed: 1.5,
  scale: 2.2,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['ram', 'mole', 'mole']),
  breath: Object.freeze({ damage: 14, cdTicks: 240, enragedCdTicks: 168, telegraphTicks: 54, radius: 4.2, halfAngleDeg: 32, range: 4.0 }),
  burrow: Object.freeze({
    damage: 16,
    cdTicks: 600,
    firstDelay: 300,
    speed: 3.4,
    maxTicks: 150,
    emergeRange: 0.4,
    telegraphTicks: 54,
    radius: 1.9,
    exposedTicks: 90,
    maxWaitTicks: 120, // a burrowed boss surfaces through the governor, but never stalls
  }),
  enrageAt: 0.5,
  standoff: 0.6,
  firstBreathDelay: 60,
});

export default {
  id: 'wyrm',
  def: WYRM,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'burrowed' | 'emerging' | 'exposed'
    b.nextBreathTick = tick + WYRM.firstBreathDelay;
    b.nextBurrowTick = tick + WYRM.burrow.firstDelay;
    b.burrowStartTick = 0;
    b.exposedUntil = 0;
    b.enraged = false;
  },

  continuous(ctx, b, tick) {
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (b.mode === 'burrowed') {
      if (d > 0.2) {
        const adv = Math.min(WYRM.burrow.speed * TICK_DT, d - 0.2);
        ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
      }
      if (d > 1e-6) {
        b.faceX = dx / d;
        b.faceZ = dz / d;
      }
      return;
    }
    if (b.mode === 'emerging') return;
    if (b.telegraph) return; // the locked cone is the promise
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    if (b.mode === 'exposed') return; // stunned by its own emergence
    const stop = b.radius + target.radius + WYRM.standoff;
    if (d > stop) {
      const adv = Math.min(WYRM.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * WYRM.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'breath') {
        const cosHalf = Math.cos((t.halfAngleDeg * Math.PI) / 180);
        const victims = ctx.partyIn(t.x, t.z, t.radius).filter((p) => {
          const px = p.x - t.x;
          const pz = p.z - t.z;
          const l = Math.hypot(px, pz);
          if (l <= p.radius + 0.2) return true; // standing in its jaws
          return (px * t.dirX + pz * t.dirZ) / l >= cosHalf;
        });
        ctx.events.emit(tick, 'boss_breath', { id: b.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), victims: victims.length });
        ctx.hitAll(b, victims, WYRM.breath.damage, t.x, t.z, 'ground_aoe');
        b.nextBreathTick = tick + (b.enraged ? WYRM.breath.enragedCdTicks : WYRM.breath.cdTicks);
      } else if (t.attack === 'emerge') {
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        b.mode = 'exposed';
        b.hittable = true;
        b.burrowed = false;
        b.exposedUntil = tick + WYRM.burrow.exposedTicks;
        ctx.events.emit(tick, 'boss_emerge', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
        ctx.shake(tick, 'boss_emerge', t.x, t.z);
        ctx.hitAll(b, victims, WYRM.burrow.damage, t.x, t.z);
      }
      return;
    }
    if (b.mode === 'emerging') return;
    if (b.mode === 'exposed') {
      if (tick >= b.exposedUntil) {
        b.mode = 'stalk';
        b.nextBreathTick = Math.max(b.nextBreathTick, tick + 30);
      }
      return;
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (b.mode === 'burrowed') {
      const d = target ? Math.hypot(target.x - b.x, target.z - b.z) : Infinity;
      const age = tick - b.burrowStartTick;
      const want = d <= WYRM.burrow.emergeRange || age >= WYRM.burrow.maxTicks;
      if (!want) return;
      if (!ctx.governorGrants(tick) && age < WYRM.burrow.maxTicks + WYRM.burrow.maxWaitTicks) return;
      b.mode = 'emerging';
      ctx.startTelegraph(b, tick, {
        kind: 'ring',
        attack: 'emerge',
        ticks: WYRM.burrow.telegraphTicks,
        x: b.x,
        z: b.z,
        radius: WYRM.burrow.radius,
        targetId: target ? target.id : null,
      });
      return;
    }
    if (!target || !(target.hp > 0)) return;
    // Burrow first when it is due (it is the fight's signature beat).
    if (tick >= b.nextBurrowTick) {
      b.mode = 'burrowed';
      b.burrowed = true;
      b.hittable = false;
      b.burrowStartTick = tick;
      b.nextBurrowTick = tick + WYRM.burrow.cdTicks;
      ctx.events.emit(tick, 'boss_burrow', { id: b.id, x: r2(b.x), z: r2(b.z) });
      return;
    }
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    if (tick >= b.nextBreathTick && d <= WYRM.breath.range && d > 1e-6 && ctx.governorGrants(tick)) {
      ctx.startTelegraph(b, tick, {
        kind: 'cone',
        attack: 'breath',
        ticks: WYRM.breath.telegraphTicks,
        x: b.x,
        z: b.z,
        dirX: (target.x - b.x) / d,
        dirZ: (target.z - b.z) / d,
        radius: WYRM.breath.radius,
        length: WYRM.breath.radius,
        halfAngleDeg: WYRM.breath.halfAngleDeg,
        targetId: target.id,
      });
      // The cooldown is armed on the resolve (enrage may shorten it).
      b.nextBreathTick = tick + 100000;
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode, burrowed: !!b.burrowed, enraged: !!b.enraged };
  },
};
