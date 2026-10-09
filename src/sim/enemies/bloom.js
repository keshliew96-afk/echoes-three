// Heart Bloom (content plan 3 slice 4, docs/NEW_ENEMIES_BARROW_HEART.md —
// The Hollow Heart) — the rooted pulse. A crystal flower on a knot of violet
// vein-roots, 34 HP. It creeps in on its roots at 0.7 u/s and TAKES ROOT
// for good once a party body is within 2.4 u (or after 4 s of creeping):
// from then on it never moves and shrugs off knockback. Rooted, it beats
// with the room's HEART (the husks' shared clock, sim/enemies/husk.js): on
// every second beat its petals open under an Ember ring r 2.3 round itself
// for 54 ticks, closing on the surge — every party body inside takes 12.
// Every Bloom in the room pulses on the same beat, so a room of them is a
// rhythm to learn, not a surprise: step out on the swell, back in to hit it.
// The ring is centred on itself, not aimed, so it takes no governor slot
// (like a Rotcap's burst); a stun during the opening spills it. It only
// opens when a party body is near enough to care (within 6 u). No RNG.
import { r2, unit, partyInRadius, neutralsInRadius } from './common.js';
import { HEARTBEAT, beatPhase } from './husk.js';

const S = Object.freeze({
  hp: 34,
  moveSpeed: 0.7,
  radius: 0.4,
  damage: 12,
  rootRange: 2.4,
  creepTicks: 240,
  pulseRadius: 2.3,
  telegraphTicks: 54,
  wakeRange: 6.0,
  beatEvery: 2, // pulses on every second heartbeat
});

// The tick a pulse's opening starts: 54 ticks before an even beat's surge.
export const bloomOpens = (tick) =>
  beatPhase(tick) === HEARTBEAT.period - S.telegraphTicks && Math.floor(tick / HEARTBEAT.period) % S.beatEvery === S.beatEvery - 1;

function root(ctx, e, tick, cause) {
  e.mode = 'rooted';
  e.kbScale = 0;
  e.rootTick = tick;
  ctx.events.emit(tick, 'bloom_root', { id: e.id, x: r2(e.x), z: r2(e.z), cause });
}

export default {
  id: 'bloom',
  threat: 1.5,
  stats: S,
  telegraph: Object.freeze({ kind: 'ring', ticks: S.telegraphTicks }),

  spawn(ctx, e, tick) {
    e.mode = 'creep'; // creep | rooted
    e.creepUntil = tick + S.creepTicks;
    e.rootTick = -1; // render: the roots driving in
    e.pulseTick = -1; // render: the petals snapping shut
  },

  continuous(ctx, e, tick) {
    if (e.mode === 'rooted') return;
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    if (d.l > S.rootRange) {
      const step = Math.min(ctx.stepLen(e, S.moveSpeed, tick), d.l - S.rootRange);
      ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    if (e.mode !== 'rooted') {
      const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
      const near = target && Math.hypot(target.x - e.x, target.z - e.z) <= S.rootRange + 0.05;
      if (near || tick >= e.creepUntil) root(ctx, e, tick, near ? 'near' : 'tired');
      return;
    }
    if (e.telegraph) {
      if (tick < e.telegraph.resolveTick) return;
      const t = e.telegraph;
      ctx.endTelegraph(e, tick);
      const victims = partyInRadius(ctx.registry, t.x, t.z, t.radius);
      const props = neutralsInRadius(ctx.registry, t.x, t.z, t.radius);
      e.pulseTick = tick;
      ctx.events.emit(tick, 'bloom_pulse', { id: e.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
      ctx.strike(e, victims.concat(props), ctx.dmg(e, S.damage), t.x, t.z, { delivery: 'skill', shape: 'ring' });
      return;
    }
    if (ctx.stunned(e, tick) || !bloomOpens(tick)) return;
    const foe = ctx.nearestTarget(e);
    if (!foe || Math.hypot(foe.x - e.x, foe.z - e.z) > S.wakeRange) return;
    ctx.startTelegraph(e, tick, {
      kind: 'ring',
      startTick: tick,
      resolveTick: tick + S.telegraphTicks,
      x: e.x,
      z: e.z,
      dirX: e.faceX ?? 0,
      dirZ: e.faceZ ?? 1,
      radius: S.pulseRadius,
      playerTargeted: false,
      targetId: foe.id,
    });
    ctx.events.emit(tick, 'bloom_open', { id: e.id, x: r2(e.x), z: r2(e.z), radius: S.pulseRadius, resolveTick: e.telegraph.resolveTick });
  },

  view(e) {
    return { mode: e.mode };
  },
};
