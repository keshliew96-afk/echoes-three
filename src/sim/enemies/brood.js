// Brood Spider (docs/CONTENT_PLAN.md §3.4 — Ashen Barrow) — a bloated grave
// spider that SPLITS. It skitters in at 1.7 u/s and bites on contact (8
// damage, 60-tick per-target cooldown); when it dies it bursts into two
// Broodlings fanned around the corpse: 6 HP rushers at 2.8 u/s that bite for
// 3 (45-tick cooldown). A brood kill is never the last kill — the room holds
// until its young are dead too. Broodlings inherit the mother's scaling (hp /
// damage multipliers), are never elite and never split again.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 30,
  moveSpeed: 1.7,
  radius: 0.42,
  damage: 8,
  attackCdTicks: 60,
  contactRange: 0.42,
  broodCount: 2,
  broodSpread: 0.55, // u from the corpse
});

const L = Object.freeze({
  hp: 6,
  moveSpeed: 2.8,
  radius: 0.22,
  damage: 3,
  attackCdTicks: 45,
  contactRange: 0.24,
});

function chase(ctx, e, tick, st) {
  if (e.kbTicks > 0) return;
  const target = ctx.nearestTarget(e);
  e.targetId = target ? target.id : null;
  if (!target) return;
  const d = unit(target.x - e.x, target.z - e.z);
  const stop = st.contactRange + target.radius - 0.04;
  if (d.l > stop) {
    const step = Math.min(ctx.stepLen(e, st.moveSpeed, tick), d.l - stop);
    ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
  }
  ctx.face(e, d.x, d.z);
}

function bite(ctx, e, tick, st) {
  const target = e.targetId != null ? ctx.registry.byId(e.targetId) : null;
  if (!target || !(target.hp > 0)) return;
  const d = Math.hypot(target.x - e.x, target.z - e.z);
  if (d > st.contactRange + target.radius + 0.02) return;
  if (tick < (e.cdByTarget[target.id] ?? 0)) return;
  e.cdByTarget[target.id] = tick + st.attackCdTicks;
  e.biteTick = tick;
  ctx.events.emit(tick, 'enemy_bite', { id: e.id, target: target.id });
  ctx.strike(e, [target], ctx.dmg(e, st.damage), e.x, e.z);
}

export const broodling = {
  id: 'broodling',
  threat: 0.4,
  stats: L,
  telegraph: null,
  spawn(ctx, e) {
    e.mode = 'skitter';
    e.cdByTarget = {};
    e.biteTick = -1;
  },
  continuous: (ctx, e, tick) => chase(ctx, e, tick, L),
  resolve: (ctx, e, tick) => bite(ctx, e, tick, L),
  view: (e) => ({ mode: e.mode }),
};

export default {
  id: 'brood',
  threat: 2.0,
  stats: S,
  telegraph: null,
  spawn(ctx, e) {
    e.mode = 'skitter';
    e.cdByTarget = {};
    e.biteTick = -1;
  },
  continuous: (ctx, e, tick) => chase(ctx, e, tick, S),
  resolve: (ctx, e, tick) => bite(ctx, e, tick, S),

  onDeath(ctx, e, tick) {
    const hpMul = e.maxHp / S.hp / (e.elite ? 1.8 : 1);
    const dmgMul = (e.dmgMul ?? 1) / (e.elite ? 1.25 : 1);
    const ids = [];
    for (let i = 0; i < S.broodCount; i++) {
      const a = Math.atan2(e.faceZ ?? 1, e.faceX ?? 0) + Math.PI + ((i - (S.broodCount - 1) / 2) * Math.PI) / 2.5;
      const b = ctx.spawnChild('broodling', e.x + Math.cos(a) * S.broodSpread, e.z + Math.sin(a) * S.broodSpread, {
        hpMul,
        dmgMul,
        wave: e.wave,
      });
      if (b) ids.push(b.id);
    }
    if (ids.length) ctx.events.emit(tick, 'brood_split', { id: e.id, x: r2(e.x), z: r2(e.z), brood: ids });
  },

  view: (e) => ({ mode: e.mode }),
};
