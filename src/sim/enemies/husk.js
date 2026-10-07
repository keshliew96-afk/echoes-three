// Hollow Husk (docs/ACT_IV.md — The Hollow Heart) — the rusher of Act IV. A
// corrupted husk with the Heart's violet in its veins. It walks in at 1.6 u/s
// and bites on contact (9 damage, 48-tick per-target cooldown, like the boar),
// but it moves to the HEARTBEAT: every husk in the room surges together on one
// shared clock (every HEARTBEAT.period ticks of the sim clock), running at
// x2.2 for HEARTBEAT.surge ticks. The beat is a rhythm the party can learn —
// step back on the pulse, swing between pulses — never a surprise: its veins
// swell for HEARTBEAT.warn ticks before each surge (render reads `beatK`).
// No RNG, no governor slot (a bite is a contact, not a telegraph).
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 22,
  moveSpeed: 1.6, // u/s between beats
  radius: 0.36,
  damage: 9,
  attackCdTicks: 48, // per target
  contactRange: 0.35,
});

// One clock for the whole room: a beat every 3 s, a 0.7 s surge, a 0.5 s
// swell before it.
export const HEARTBEAT = Object.freeze({ period: 180, surge: 42, warn: 30, surgeMul: 2.2 });

// Ticks into the beat cycle (0 = the surge starts).
export const beatPhase = (tick) => ((tick % HEARTBEAT.period) + HEARTBEAT.period) % HEARTBEAT.period;
export const surging = (tick) => beatPhase(tick) < HEARTBEAT.surge;

export default {
  id: 'husk',
  threat: 1.1,
  stats: S,

  spawn(ctx, e) {
    e.mode = 'stalk'; // stalk | surge
    e.cdByTarget = {};
    e.biteTick = -1; // render: the bite clip
  },

  continuous(ctx, e, tick) {
    const surge = surging(tick);
    if (surge && e.mode !== 'surge') ctx.events.emit(tick, 'husk_surge', { id: e.id, x: r2(e.x), z: r2(e.z) });
    e.mode = surge ? 'surge' : 'stalk';
    if (e.kbTicks > 0) return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const stop = S.contactRange + target.radius - 0.04;
    if (d.l > stop) {
      const speed = S.moveSpeed * (surge ? HEARTBEAT.surgeMul : 1);
      const step = Math.min(ctx.stepLen(e, speed, tick), d.l - stop);
      ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = Math.hypot(target.x - e.x, target.z - e.z);
    if (d > S.contactRange + target.radius + 0.02) return;
    if (tick < (e.cdByTarget[target.id] ?? 0)) return;
    e.cdByTarget[target.id] = tick + S.attackCdTicks;
    e.biteTick = tick;
    ctx.events.emit(tick, 'enemy_bite', { id: e.id, target: target.id });
    ctx.strike(e, [target], ctx.dmg(e, S.damage), e.x, e.z);
  },

  view(e) {
    return { mode: e.mode };
  },
};
