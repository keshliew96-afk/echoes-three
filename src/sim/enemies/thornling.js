// Thornling (docs/CONTENT_PLAN.md §3, slice 2 — Hollow Wood) — the gardener.
// A knee-high bramble sprite (26 HP) that never bites: it keeps 2.6–4.2 u
// from its target and, every 240 ticks, roots for 30 ticks (it cannot move)
// and PLANTS a thorn patch at its feet: a ground patch r 1.0 that lasts 420
// ticks, slows party bodies inside by 35% and pricks them for 3 damage every
// 40 ticks. It keeps at most three patches alive (the oldest withers when a
// fourth is planted), so a Thornling left alone fences off the room and
// chasing it means wading through its thicket. Fliers ignore the patches.
// The patches are slicks (the toad's slow ground) with a `thorn` variant; the
// pricks are this archetype's own beat, so a dead Thornling's patches stop
// pricking and only slow until they wither.
import { r2, unit } from './common.js';

const S = Object.freeze({
  hp: 26,
  moveSpeed: 1.3,
  radius: 0.32,
  keepMin: 2.6,
  keepMax: 4.2,
  plantEvery: 240,
  rootTicks: 30,
  firstPlant: 90,
  patchRadius: 1.0,
  patchTicks: 420,
  patchSlow: 0.35,
  prickDamage: 3,
  prickEvery: 40,
  maxPatches: 3,
});

export default {
  id: 'thornling',
  threat: 1.2,
  stats: S,

  spawn(ctx, e, tick) {
    e.mode = 'skulk'; // skulk | root
    e.nextPlantTick = tick + S.firstPlant;
    e.rootUntil = 0;
    e.patchIds = [];
    e.nextPrickTick = tick + S.prickEvery;
    e.plantTick = -1; // render: the plant clip
  },

  continuous(ctx, e, tick) {
    if (e.kbTicks > 0 || e.mode === 'root') return;
    const target = ctx.nearestTarget(e);
    e.targetId = target ? target.id : null;
    if (!target) return;
    const d = unit(target.x - e.x, target.z - e.z);
    const step = ctx.stepLen(e, S.moveSpeed, tick);
    if (d.l > S.keepMax) ctx.movement.walkStep(e, d.x * step, d.z * step, e.radius);
    else if (d.l < S.keepMin) ctx.movement.walkStep(e, -d.x * step, -d.z * step, e.radius);
    else {
      const side = e.id % 2 === 0 ? 1 : -1;
      ctx.movement.walkStep(e, -d.z * step * 0.35 * side, d.x * step * 0.35 * side, e.radius);
    }
    ctx.face(e, d.x, d.z);
  },

  resolve(ctx, e, tick) {
    // Pricks: every live patch of ours, on every party ground body inside.
    e.patchIds = e.patchIds.filter((id) => ctx.registry.byId(id));
    if (tick >= e.nextPrickTick) {
      e.nextPrickTick = tick + S.prickEvery;
      const hit = [];
      for (const id of e.patchIds) {
        const p = ctx.registry.byId(id);
        for (const t of ctx.registry.all()) {
          if (t.partyIndex === undefined || !(t.hp > 0) || t.flier || hit.includes(t)) continue;
          if (Math.hypot(t.x - p.x, t.z - p.z) <= p.radius) hit.push(t);
        }
      }
      if (hit.length) {
        ctx.events.emit(tick, 'thorn_prick', { id: e.id, victims: hit.length });
        for (const t of hit) ctx.strike(e, [t], ctx.dmg(e, S.prickDamage), t.x, t.z, { delivery: 'skill', shape: 'ground_aoe' });
      }
    }
    if (e.mode === 'root') {
      if (tick < e.rootUntil) return;
      e.mode = 'skulk';
      // The patch goes down as the roots let go.
      if (e.patchIds.length >= S.maxPatches) {
        const old = ctx.registry.byId(e.patchIds.shift());
        if (old) old.untilTick = tick; // withers on the next slick step
      }
      const p = ctx.spawnSlick(e, e.x, e.z, { radius: S.patchRadius, ticks: S.patchTicks, slow: S.patchSlow, variant: 'thorn' });
      e.patchIds.push(p.id);
      e.plantTick = tick;
      ctx.events.emit(tick, 'thorn_plant', { id: e.id, patch: p.id, x: r2(e.x), z: r2(e.z), radius: S.patchRadius });
      return;
    }
    if (ctx.stunned(e, tick) || tick < e.nextPlantTick) return;
    e.mode = 'root';
    e.rootUntil = tick + S.rootTicks;
    e.nextPlantTick = tick + S.plantEvery;
  },

  view(e) {
    return { mode: e.mode, patches: e.patchIds.length };
  },
};
