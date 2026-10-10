// THE GLOAM WOLF — Act I (Hollow Wood) third boss (content plan 3, slice 10;
// docs/THIRD_BOSSES.md). The wood's oldest hunter, gone grey and hollow: a
// huge night wolf with a bramble mane and the violet in its eyes. Where the
// Stag holds the clearing and the Thornmother fights the floor, the wolf
// hunts: it closes distance in one bound and punishes anyone who stays near.
//
//   Pounce (primary): an Ember RING r 1.5 at its target (54-tick warning).
//     It crouches, then bounds over the last 16 ticks and lands in the ring
//     for 15. Cooldown 260 ticks (190 enraged). Range 2.5 to 8.5 u.
//   Rend (close): with a body inside 2.7 u, an Ember CONE in front (2.8 u,
//     55 degrees either side, 36-tick warning), 13 to every body in it.
//     Cooldown 150 ticks.
//   Moon Howl: an Ember RING r 3.2 round itself (60-tick warning) that hits
//     for 8 and slows 35 % for 1.5 s; then THE HUNT: its next two Pounces
//     come back to back (no cooldown between them, the second on whoever is
//     farthest). First at 6 s, then every 600 ticks (420 enraged).
//   Enrage: under 40 % HP (`enraged`), faster on its feet.
//   Add phases call the wood's boars and a Shriek Owl.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const GLOAMWOLF = Object.freeze({
  name: 'THE GLOAM WOLF',
  radius: 0.75,
  hpMul: 0.95,
  moveSpeed: 1.7,
  enragedMoveSpeed: 2.1,
  scale: 2.3,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['boar', 'boar', 'owl']),
  pounce: Object.freeze({ damage: 15, cdTicks: 260, enragedCdTicks: 190, firstDelay: 100, telegraphTicks: 54, huntTelegraphTicks: 48, leapTicks: 16, radius: 1.5, minRange: 2.5, range: 8.5 }),
  rend: Object.freeze({ damage: 13, cdTicks: 150, firstDelay: 60, telegraphTicks: 36, trigger: 2.7, length: 2.8, halfAngleDeg: 55 }),
  howl: Object.freeze({ damage: 8, cdTicks: 600, enragedCdTicks: 420, firstDelay: 360, telegraphTicks: 60, radius: 3.2, slow: 0.35, slowTicks: 90, hunt: 2 }),
  enrageAt: 0.4,
  standoff: 1.0,
});

// Where a Pounce at `target` lands: on it, kept inside the room.
function landing(ctx, target) {
  const { mx, mz } = ctx.innerBounds(GLOAMWOLF.radius);
  return { x: Math.min(mx, Math.max(-mx, target.x)), z: Math.min(mz, Math.max(-mz, target.z)) };
}

export default {
  id: 'gloamwolf',
  def: GLOAMWOLF,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'crouch' | 'leap' | 'howl' | 'rend'
    b.nextPounceTick = tick + GLOAMWOLF.pounce.firstDelay;
    b.nextRendTick = tick + GLOAMWOLF.rend.firstDelay;
    b.nextHowlTick = tick + GLOAMWOLF.howl.firstDelay;
    b.hunt = 0; // Pounces left in the Hunt
    b.enraged = false;
  },

  continuous(ctx, b, tick) {
    const t = b.telegraph;
    if (t && t.attack === 'pounce') {
      // Crouched until the last leapTicks, then the bound itself.
      const left = t.resolveTick - tick;
      if (left > GLOAMWOLF.pounce.leapTicks) {
        b.mode = 'crouch';
        return;
      }
      b.mode = 'leap';
      const dx = t.x - b.x;
      const dz = t.z - b.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const step = Math.min(d, d / Math.max(1, left));
        ctx.walkStep(b, (dx / d) * step, (dz / d) * step, b.radius);
        b.faceX = dx / d;
        b.faceZ = dz / d;
      }
      return;
    }
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (!target) return;
    const dx = target.x - b.x;
    const dz = target.z - b.z;
    const d = Math.hypot(dx, dz);
    if (t) return; // planted while it howls or rends: the shape is the promise
    if (d > 1e-6) {
      b.faceX = dx / d;
      b.faceZ = dz / d;
    }
    b.mode = 'stalk';
    const stop = b.radius + target.radius + GLOAMWOLF.standoff;
    if (d > stop) {
      const speed = b.enraged ? GLOAMWOLF.enragedMoveSpeed : GLOAMWOLF.moveSpeed;
      const adv = Math.min(speed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    if (!b.enraged && b.hp <= b.maxHp * GLOAMWOLF.enrageAt) {
      b.enraged = true;
      ctx.events.emit(tick, 'boss_enrage', { id: b.id, x: r2(b.x), z: r2(b.z) });
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'pounce') {
        const P = GLOAMWOLF.pounce;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_pounce', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, hunt: b.hunt });
        ctx.shake(tick, 'boss_pounce', t.x, t.z);
        ctx.hitAll(b, victims, P.damage, t.x, t.z);
        if (b.hunt > 0) {
          b.hunt -= 1;
          b.nextPounceTick = tick + 1;
        } else b.nextPounceTick = tick + (b.enraged ? P.enragedCdTicks : P.cdTicks);
        // A beat to recover before it rends the one it landed on.
        b.nextRendTick = Math.max(b.nextRendTick, tick + 24);
      } else if (t.attack === 'rend') {
        const R = GLOAMWOLF.rend;
        const cosHalf = Math.cos((t.halfAngleDeg * Math.PI) / 180);
        const victims = ctx.partyIn(t.x, t.z, t.radius).filter((p) => {
          const px = p.x - t.x;
          const pz = p.z - t.z;
          const l = Math.hypot(px, pz);
          if (l <= p.radius + 0.2) return true; // under its jaws
          return (px * t.dirX + pz * t.dirZ) / l >= cosHalf;
        });
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_rend', { id: b.id, x: r2(t.x), z: r2(t.z), dx: r2(t.dirX), dz: r2(t.dirZ), victims: victims.length });
        ctx.hitAll(b, victims, R.damage, t.x, t.z, 'ground_aoe');
        b.nextRendTick = tick + R.cdTicks;
      } else if (t.attack === 'howl') {
        const H = GLOAMWOLF.howl;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        b.mode = 'stalk';
        ctx.events.emit(tick, 'boss_howl', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
        ctx.shake(tick, 'boss_howl', t.x, t.z);
        ctx.hitAll(b, victims, H.damage, t.x, t.z);
        const st = ctx.combat.status;
        if (st && typeof st.apply === 'function') for (const p of victims) if (p.hp > 0) st.apply(p, 'slow', H.slow, H.slowTicks, tick, b.id);
        // The Hunt: the next Pounces come at once.
        b.hunt = H.hunt;
        b.nextPounceTick = tick + 12;
        b.nextHowlTick = tick + (b.enraged ? H.enragedCdTicks : H.cdTicks);
      }
      return;
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const party = ctx.partyBodies();
    // Rend first when someone stands at its jaws (and it is not mid-Hunt).
    const R = GLOAMWOLF.rend;
    if (tick >= b.nextRendTick && b.hunt === 0) {
      let close = null;
      let best = Infinity;
      for (const p of party) {
        const dd = Math.hypot(p.x - b.x, p.z - b.z) - p.radius;
        if (dd <= R.trigger && dd < best) {
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
        b.mode = 'rend';
        ctx.startTelegraph(b, tick, { kind: 'cone', attack: 'rend', ticks: R.telegraphTicks, x: b.x, z: b.z, dirX, dirZ, radius: R.length, length: R.length, halfAngleDeg: R.halfAngleDeg, targetId: close.id });
        b.nextRendTick = tick + 100000; // armed on the resolve
        return;
      }
    }
    // Moon Howl when due and it is not already hunting.
    const H = GLOAMWOLF.howl;
    if (tick >= b.nextHowlTick && b.hunt === 0) {
      b.mode = 'howl';
      ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'howl', ticks: H.telegraphTicks, x: b.x, z: b.z, radius: H.radius, targetId: target.id });
      b.nextHowlTick = tick + 100000;
      return;
    }
    // Pounce: on its target, or in the Hunt on whoever is farthest.
    const P = GLOAMWOLF.pounce;
    if (tick >= b.nextPounceTick) {
      let prey = target;
      if (b.hunt > 0) {
        let far = -1;
        for (const p of party) {
          const dd = Math.hypot(p.x - b.x, p.z - b.z);
          if (dd > far) {
            far = dd;
            prey = p;
          }
        }
      }
      const d = Math.hypot(prey.x - b.x, prey.z - b.z);
      if (d >= P.minRange && d <= P.range) {
        const at = landing(ctx, prey);
        b.mode = 'crouch';
        ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'pounce', ticks: b.hunt > 0 ? P.huntTelegraphTicks : P.telegraphTicks, x: at.x, z: at.z, radius: P.radius, targetId: prey.id });
        b.nextPounceTick = tick + 100000;
      } else if (b.hunt > 0) {
        // Nobody far enough to bound at: the Hunt ends.
        b.hunt = 0;
        b.nextPounceTick = tick + P.cdTicks;
      }
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode, enraged: !!b.enraged, hunt: b.hunt | 0 };
  },
};
