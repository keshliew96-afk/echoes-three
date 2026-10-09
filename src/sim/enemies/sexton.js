// Barrow Sexton (content plan 3 slice 4, docs/NEW_ENEMIES_BARROW_HEART.md —
// Ashen Barrow) — the trapper. A hunched gravedigger with a spade and a
// lantern, 28 HP, that never strikes in person. It keeps 3.0-4.6 u from its
// target and every 300 ticks KNEELS for 36 ticks (rooted) and buries a BONE
// SNARE 1.8 u toward its target: a ring of grave-bone teeth on the floor,
// radius 0.55, that ARMS 45 ticks later and lies there for 20 s. A party
// ground body that steps onto an armed snare SPRINGS it: an Ember ring
// r 0.95 for 42 ticks (the jaws rising), then they snap shut for 11 and
// hold everyone inside with a 60% slow for 75 ticks. So a snare is never a
// surprise: it is visible from the moment it is buried, and stepping off it
// inside the ring's 0.7 s escapes the bite. Fliers never spring it.
// It keeps at most three snares (the oldest crumbles when a fourth goes in);
// a dead Sexton's snares crumble with it, and a stun mid-dig spoils the
// grave. The snares are slicks (kind 'slick', variant 'snare', no slow of
// their own) this archetype steps itself, so they save and replay like any
// patch. The jaws are not player-targeted (they close where they lie) and
// take no governor slot. No RNG.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 28,
  moveSpeed: 1.4,
  radius: 0.32,
  keepMin: 3.0,
  keepMax: 4.6,
  digEvery: 300,
  digTicks: 36,
  firstDig: 100,
  spoilTicks: 120, // a stunned dig: the next one waits this long
  snareReach: 1.8, // u toward the target
  snareRadius: 0.55, // the trigger plate
  snareTicks: 1200,
  armTicks: 45,
  jawRadius: 0.95,
  jawTicks: 42,
  damage: 11,
  holdSlow: 0.6,
  holdTicks: 75,
  maxSnares: 3,
});

function crumble(ctx, e, s, tick, cause) {
  if (!s) return;
  ctx.events.emit(tick, 'sexton_snare_crumble', { id: e.id, snare: s.id, x: r2(s.x), z: r2(s.z), cause });
  ctx.registry.despawn(s.id);
}

export default {
  id: 'sexton',
  threat: 1.3,
  stats: S,

  spawn(ctx, e, tick) {
    e.mode = 'skulk'; // skulk | dig
    e.nextDigTick = tick + S.firstDig;
    e.digUntil = 0;
    e.digX = 0;
    e.digZ = 0;
    e.snareIds = [];
    e.digTick = -1; // render: the dig clip (the spade comes down)
  },

  continuous(ctx, e, tick) {
    if (e.mode === 'dig') {
      // A stun spoils the grave (the clock starts again).
      if (ctx.stunned(e, tick)) {
        e.mode = 'skulk';
        e.nextDigTick = tick + S.spoilTicks;
        ctx.events.emit(tick, 'sexton_spoil', { id: e.id, x: r2(e.x), z: r2(e.z) });
      }
      return;
    }
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      const side = e.id % 2 === 0 ? -1 : 1;
      ctx.movement.walkStep(e, -d.z * step * 0.45 * side, d.x * step * 0.45 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    // The snares: arm, spring under a party ground body, then snap.
    const live = [];
    for (const id of e.snareIds) {
      const s = ctx.registry.byId(id);
      if (!s) continue;
      if (s.telegraph) {
        if (tick < s.telegraph.resolveTick) {
          live.push(id);
          continue;
        }
        const victims = [];
        for (const t of ctx.registry.all()) {
          if (t.faction !== 'party' || !(t.hp > 0) || t.flier) continue;
          if (Math.hypot(t.x - s.x, t.z - s.z) <= S.jawRadius + (t.radius ?? 0)) victims.push(t);
        }
        s.telegraph = null;
        ctx.events.emit(tick, 'sexton_snare_snap', { id: e.id, snare: s.id, x: r2(s.x), z: r2(s.z), radius: S.jawRadius, victims: victims.length });
        ctx.strike(e, victims, ctx.dmg(e, S.damage), s.x, s.z, { delivery: 'skill', shape: 'ring' });
        for (const v of victims) if (v.hp > 0) ctx.status.apply(v, 'slow', S.holdSlow, S.holdTicks, tick, e.id);
        ctx.registry.despawn(s.id);
        continue;
      }
      if (tick >= s.untilTick - 1) {
        // Lain too long: it sinks back into the ash on the slick step.
        live.push(id);
        continue;
      }
      if (tick >= s.armTick) {
        let trip = null;
        for (const t of ctx.registry.all()) {
          if (t.partyIndex === undefined || !(t.hp > 0) || t.flier) continue;
          if (Math.hypot(t.x - s.x, t.z - s.z) <= s.radius + (t.radius ?? 0) * 0.5) {
            trip = t;
            break;
          }
        }
        if (trip) {
          s.telegraph = {
            kind: 'ring',
            startTick: tick,
            resolveTick: tick + S.jawTicks,
            x: s.x,
            z: s.z,
            dirX: 0,
            dirZ: 1,
            radius: S.jawRadius,
            playerTargeted: false,
            targetId: trip.id,
          };
          s.untilTick = Math.max(s.untilTick, tick + S.jawTicks + 2);
          ctx.events.emit(tick, 'sexton_snare_trip', { id: e.id, snare: s.id, x: r2(s.x), z: r2(s.z), radius: S.jawRadius, by: trip.id, resolveTick: tick + S.jawTicks });
        }
      }
      live.push(id);
    }
    e.snareIds = live;

    if (e.mode === 'dig') {
      if (tick < e.digUntil) return;
      e.mode = 'skulk';
      e.nextDigTick = tick + S.digEvery;
      if (e.snareIds.length >= S.maxSnares) crumble(ctx, e, ctx.registry.byId(e.snareIds.shift()), tick, 'oldest');
      const s = ctx.spawnSlick(e, e.digX, e.digZ, { radius: S.snareRadius, ticks: S.snareTicks, slow: 0, variant: 'snare' });
      s.armTick = tick + S.armTicks;
      e.snareIds.push(s.id);
      e.digTick = tick;
      ctx.events.emit(tick, 'sexton_bury', { id: e.id, snare: s.id, x: r2(s.x), z: r2(s.z), radius: S.snareRadius, armTick: s.armTick });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextDigTick) return;
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const reach = Math.min(S.snareReach, Math.max(0.6, d.l - 0.6));
    const { mx, mz } = ctx.movement.innerBounds(S.snareRadius);
    e.digX = Math.min(mx, Math.max(-mx, e.x + d.x * reach));
    e.digZ = Math.min(mz, Math.max(-mz, e.z + d.z * reach));
    e.mode = 'dig';
    e.digUntil = tick + S.digTicks;
    ctx.face(e, d.x, d.z);
    ctx.events.emit(tick, 'sexton_dig', { id: e.id, x: r2(e.digX), z: r2(e.digZ), untilTick: e.digUntil });
  },

  // A dead Sexton's snares crumble with it (even a sprung one: no bite).
  onDeath(ctx, e, tick) {
    for (const id of e.snareIds || []) crumble(ctx, e, ctx.registry.byId(id), tick, 'sexton_died');
    e.snareIds = [];
  },

  view(e) {
    return { mode: e.mode, snares: (e.snareIds || []).length };
  },
};
