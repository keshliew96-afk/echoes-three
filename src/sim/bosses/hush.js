// THE HUSH — Act V (The Still Spire) final boss (content plan 4, slice 3;
// docs/ACT_V_BOSSES.md). The silence that stopped the gods: when they sat
// down in their belfry to watch, something sat down with them and took the
// sound out of the air. It is the quiet the Hollow Cantor sang into, and the
// campaign's last fight. A tall veiled shape of grey stillness with a cracked
// bronze bell for a head and no clapper in it.
//
//   Still Note (primary): an Ember RING r 1.8 at its target (50-tick
//     warning) that bursts for 11 and HUSHES every hero it catches: slowed
//     35 % for 1.5 s. From the Second Stillness on, the note leaves a patch of
//     silence on the floor (slick, 30 % slow, 3 s). Cooldown 230 ticks (170
//     in the Third Stillness, where the ring grows to r 2.3).
//   Unringing (secondary): an Ember LANE from its body toward a target 2.5 to
//     9 u away (1.3 u wide, 56-tick warning), 15 to every body in it.
//     Cooldown 320 ticks (260 in the Third Stillness).
//   Stillnesses (the three phases): at 75 / 50 / 25 % HP it stills one of
//     the Spire's bells and the Spire's creatures come (the level's boss row
//     carries them as `addsByPhase`). Each Stillness is followed at once by...
//   The Great Hush (signature): it rises and draws the sound out of the room,
//     an Ember RING r 4.6 round itself (96-tick warning), 20 to every body
//     still inside. Then it is DRAINED for 90 ticks: it sinks, makes no
//     attack and takes 30 % more damage (the party's punish window). After
//     the First Stillness it comes again every 600 ticks (480 in the Third).
//
// It keeps 3 to 5.5 u from its target like the Cantor, so a Great Hush
// catches whoever stood close: the answer is to walk out to the room's edge.
//
// Plain entity data, integer ticks, no RNG of its own.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;
// Not yet due (a plain number: saves carry it, unlike Infinity).
const NEVER = 1e9;

export const HUSH = Object.freeze({
  name: 'THE HUSH',
  radius: 0.75,
  hpMul: 0.95,
  moveSpeed: 1.25,
  scale: 2.6,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['kite', 'kite', 'gargoyle']),
  keep: Object.freeze({ near: 3.0, far: 5.5 }),
  note: Object.freeze({ damage: 11, cdTicks: 230, still3CdTicks: 170, firstDelay: 80, telegraphTicks: 50, radius: 1.8, still3Radius: 2.3, slow: 0.35, slowTicks: 90, patchFrom: 2, patchTicks: 180, patchSlow: 0.3 }),
  lane: Object.freeze({ damage: 15, cdTicks: 320, still3CdTicks: 260, firstDelay: 170, telegraphTicks: 56, width: 1.3, maxLen: 9.0, minRange: 2.5 }),
  great: Object.freeze({ damage: 20, everyTicks: 600, still3EveryTicks: 480, telegraphTicks: 96, radius: 4.6, drainTicks: 90, drainTaken: 1.3 }),
});

export default {
  id: 'hush',
  def: HUSH,

  spawn(ctx, b, tick) {
    b.mode = 'drift'; // 'drift' | 'rise' (the Great Hush) | 'drained'
    b.stillness = 0; // 0 before the first Stillness, then 1..3
    b.nextNoteTick = tick + HUSH.note.firstDelay;
    b.nextLaneTick = tick + HUSH.lane.firstDelay;
    b.nextGreatTick = NEVER; // armed by the First Stillness
    b.greatOwed = false; // a Stillness owes a Great Hush at the next chance
    b.drainUntil = 0;
  },

  continuous(ctx, b, tick) {
    if (b.mode === 'drained' || b.mode === 'rise') return; // still
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
    if (b.telegraph || d < 1e-6) return; // it holds still while it hushes
    const K = HUSH.keep;
    let adv = 0;
    if (d > K.far) adv = Math.min(HUSH.moveSpeed * TICK_DT, d - K.far);
    else if (d < K.near) adv = -Math.min(HUSH.moveSpeed * 0.7 * TICK_DT, K.near - d);
    if (adv !== 0) ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
  },

  resolve(ctx, b, tick) {
    if (b.mode === 'drained') {
      if (tick < b.drainUntil) return;
      b.mode = 'drift';
      delete b.takenMul;
      ctx.events.emit(tick, 'boss_hush_wake', { id: b.id, x: r2(b.x), z: r2(b.z) });
      b.nextNoteTick = Math.max(b.nextNoteTick, tick + 30);
      return;
    }
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'note') {
        const N = HUSH.note;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        let patch = null;
        if (b.stillness >= N.patchFrom) patch = ctx.spawnSlick(b, t.x, t.z, { radius: t.radius * 0.8, ticks: N.patchTicks, slow: N.patchSlow, variant: 'hush' }).id;
        ctx.events.emit(tick, 'boss_still_note', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, patch });
        ctx.hitAll(b, victims, N.damage, t.x, t.z);
        const st = ctx.combat.status;
        if (st && typeof st.apply === 'function') for (const p of victims) if (p.hp > 0) st.apply(p, 'slow', N.slow, N.slowTicks, tick, b.id);
        b.nextNoteTick = tick + (b.stillness >= 3 ? N.still3CdTicks : N.cdTicks);
      } else if (t.attack === 'unring') {
        const victims = ctx.partyBodies().filter((p) => {
          const px = p.x - t.fromX;
          const pz = p.z - t.fromZ;
          const along = px * t.dirX + pz * t.dirZ;
          if (along < -p.radius || along > t.length + p.radius) return false;
          return Math.abs(px * t.dirZ - pz * t.dirX) <= t.width / 2 + p.radius;
        });
        ctx.events.emit(tick, 'boss_unring', { id: b.id, x: r2(t.fromX), z: r2(t.fromZ), dx: r2(t.dirX), dz: r2(t.dirZ), len: r2(t.length), victims: victims.length });
        ctx.hitAll(b, victims, HUSH.lane.damage, t.fromX, t.fromZ, 'lane');
        b.nextLaneTick = tick + (b.stillness >= 3 ? HUSH.lane.still3CdTicks : HUSH.lane.cdTicks);
      } else if (t.attack === 'great') {
        const G = HUSH.great;
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        ctx.events.emit(tick, 'boss_great_hush', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length, drainTicks: G.drainTicks });
        ctx.shake(tick, 'boss_great_hush', t.x, t.z);
        ctx.hitAll(b, victims, G.damage, t.x, t.z);
        // Drained: it sinks with the sound it took, open to the party.
        b.mode = 'drained';
        b.drainUntil = tick + G.drainTicks;
        b.takenMul = G.drainTaken;
        b.nextGreatTick = tick + G.drainTicks + (b.stillness >= 3 ? G.still3EveryTicks : G.everyTicks);
      }
      return;
    }
    if (b.mode === 'rise') b.mode = 'drift'; // a cancelled Great Hush
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    // The Great Hush first: owed by a Stillness, or due on its clock.
    const G = HUSH.great;
    if (b.greatOwed || tick >= b.nextGreatTick) {
      b.greatOwed = false;
      b.mode = 'rise';
      ctx.startTelegraph(b, tick, { kind: 'ring', attack: 'great', ticks: G.telegraphTicks, x: b.x, z: b.z, radius: G.radius, targetId: target.id });
      b.nextGreatTick = NEVER; // armed on the resolve
      return;
    }
    const L = HUSH.lane;
    if (tick >= b.nextLaneTick && d >= L.minRange && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(0.2);
      let len = L.maxLen;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      if (len >= 2) {
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'unring',
          lance: true, // seats step sideways out of it
          ticks: L.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: L.width,
          targetId: target.id,
        });
        b.nextLaneTick = tick + 100000;
        return;
      }
    }
    const N = HUSH.note;
    if (tick >= b.nextNoteTick) {
      const { mx, mz } = ctx.innerBounds(0.3);
      ctx.startTelegraph(b, tick, {
        kind: 'ring',
        attack: 'note',
        ticks: N.telegraphTicks,
        x: Math.min(mx, Math.max(-mx, target.x)),
        z: Math.min(mz, Math.max(-mz, target.z)),
        radius: b.stillness >= 3 ? N.still3Radius : N.radius,
        targetId: target.id,
      });
      b.nextNoteTick = tick + 100000;
    }
  },

  // Each add phase is a Stillness: one of the Spire's bells goes quiet, its
  // creatures come (boss.js spawns them from addsByPhase), and a Great Hush
  // follows at the next chance.
  onAddPhase(ctx, b, tick) {
    b.stillness = Math.min(3, (b.stillness || 0) + 1);
    b.greatOwed = true;
    ctx.events.emit(tick, 'boss_stillness', { id: b.id, stillness: b.stillness, x: r2(b.x), z: r2(b.z) });
  },

  view(b) {
    return { mode: b.mode, stillness: b.stillness | 0, drained: b.mode === 'drained' };
  },
};
