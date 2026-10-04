// THE THORNMOTHER — Act I (Hollow Wood) second boss (docs/CONTENT_PLAN.md
// §2.4). A bramble-backed sow that turns the clearing into a thicket and then
// tears through it.
//
//   Seed Volley (primary): she flings three seed pods — one at her target,
//     two 1.9 u to either side of it. Each is a lobbed glob (an Ember ring
//     r 1.0, 54 ticks of flight) that lands for 12 and roots a THORN PATCH
//     there (r 1.1, 35% slow, 720 ticks). Cooldown 300 ticks.
//   Briar Charge (secondary): an Ember lane from her through her target to
//     the wall (1.4 u wide, up to 9 u, 60 ticks), then she charges down it at
//     10 u/s for 18 to each party body she crosses. Every thorn patch the
//     charge runs through is TORN UP: it bursts for 8 on whoever still stands
//     in it (the lane was the warning) and is gone, so the clearing opens
//     again. She skids for 40 ticks after (no attacks). Cooldown 420 ticks.
//   Add phases call the wood's boars and a mantis like the Stag's.
//
// The Stag fights the party in the open; the Thornmother fights the floor.
// All per-boss state is plain entity data.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const THORNMOTHER = Object.freeze({
  name: 'THE THORNMOTHER',
  radius: 0.75,
  hpMul: 1.0,
  moveSpeed: 1.3,
  scale: 2.2,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['boar', 'boar', 'mantis']),
  volley: Object.freeze({ damage: 12, cdTicks: 300, flightTicks: 54, radius: 1.0, side: 1.9, range: 7.0, patchRadius: 1.1, patchSlow: 0.35, patchTicks: 720 }),
  charge: Object.freeze({ damage: 18, burst: 8, cdTicks: 420, firstDelay: 240, telegraphTicks: 60, width: 1.4, maxLen: 9.0, speed: 10.0, skidTicks: 40, engageRange: 7.5 }),
  standoff: 1.6,
  firstVolleyDelay: 75,
});

export default {
  id: 'thornmother',
  def: THORNMOTHER,

  spawn(ctx, b, tick) {
    b.mode = 'root'; // 'root' | 'charge' | 'skid'
    b.nextVolleyTick = tick + THORNMOTHER.firstVolleyDelay;
    b.nextChargeTick = tick + THORNMOTHER.charge.firstDelay;
    b.chargeVx = 0;
    b.chargeVz = 0;
    b.chargeTicksLeft = 0;
    b.chargeHit = [];
    b.skidUntil = 0;
    b.patchIds = [];
  },

  continuous(ctx, b, tick) {
    if (b.mode === 'charge') {
      const hitWall = ctx.walkStep(b, b.chargeVx, b.chargeVz, b.radius);
      b.chargeTicksLeft -= 1;
      for (const p of ctx.partyBodies()) {
        if (b.chargeHit.includes(p.id)) continue;
        const d = Math.hypot(p.x - b.x, p.z - b.z);
        if (d <= b.radius + p.radius + 0.1) {
          b.chargeHit.push(p.id);
          const l = d > 1e-6 ? d : 1;
          ctx.combat.applyDamage(p, THORNMOTHER.charge.damage * ctx.dmgMul(), { delivery: 'contact', shape: 'contact', dirX: (p.x - b.x) / l, dirZ: (p.z - b.z) / l, attacker: b.id });
        }
      }
      // Tear up every thorn patch she runs through.
      for (const s of ctx.registry.all()) {
        if (s.kind !== 'slick' || s.ownerId !== b.id || s.torn) continue;
        if (Math.hypot(s.x - b.x, s.z - b.z) > s.radius + b.radius) continue;
        s.torn = true;
        s.untilTick = tick; // gone on the next slick step
        const victims = ctx.partyIn(s.x, s.z, s.radius);
        ctx.events.emit(tick, 'boss_thorn_burst', { id: b.id, patch: s.id, x: r2(s.x), z: r2(s.z), radius: s.radius, victims: victims.length });
        ctx.hitAll(b, victims, THORNMOTHER.charge.burst, s.x, s.z);
      }
      if (hitWall || b.chargeTicksLeft <= 0) {
        b.mode = 'skid';
        b.skidUntil = tick + THORNMOTHER.charge.skidTicks;
        ctx.events.emit(tick, 'boss_charge_end', { id: b.id, x: r2(b.x), z: r2(b.z), wall: !!hitWall });
        ctx.shake(tick, 'boss_charge_end', b.x, b.z);
      }
      return;
    }
    if (b.mode === 'skid') return;
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
    if (b.telegraph) return; // the locked lane is the promise
    const stop = b.radius + target.radius + THORNMOTHER.standoff;
    if (d > stop) {
      const adv = Math.min(THORNMOTHER.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'charge') {
        const step = THORNMOTHER.charge.speed * TICK_DT;
        b.mode = 'charge';
        b.chargeVx = t.dirX * step;
        b.chargeVz = t.dirZ * step;
        b.chargeTicksLeft = Math.max(1, Math.ceil(t.length / step));
        b.chargeHit = [];
        ctx.events.emit(tick, 'boss_charge', { id: b.id, x: r2(b.x), z: r2(b.z), len: r2(t.length) });
      }
      return;
    }
    if (b.mode === 'charge') return;
    if (b.mode === 'skid') {
      if (tick < b.skidUntil) return;
      b.mode = 'root';
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    if (d < 1e-6) return;
    const dirX = (target.x - b.x) / d;
    const dirZ = (target.z - b.z) / d;
    // Briar Charge when due — the room's thicket is what it is for.
    if (tick >= b.nextChargeTick && d <= THORNMOTHER.charge.engageRange && ctx.governorGrants(tick)) {
      const { mx, mz } = ctx.innerBounds(b.radius);
      let len = THORNMOTHER.charge.maxLen;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      len = Math.max(1.5, len);
      ctx.startTelegraph(b, tick, {
        kind: 'lane',
        attack: 'charge',
        ticks: THORNMOTHER.charge.telegraphTicks,
        fromX: b.x,
        fromZ: b.z,
        x: b.x + dirX * len,
        z: b.z + dirZ * len,
        dirX,
        dirZ,
        length: len,
        width: THORNMOTHER.charge.width,
        targetId: target.id,
      });
      b.nextChargeTick = tick + THORNMOTHER.charge.cdTicks;
      return;
    }
    if (tick >= b.nextVolleyTick && d <= THORNMOTHER.volley.range && ctx.governorGrants(tick)) {
      const V = THORNMOTHER.volley;
      const power = V.damage * ctx.dmgMul();
      const { mx, mz } = ctx.innerBounds(V.radius);
      const pods = [
        [target.x, target.z, true],
        [target.x - dirZ * V.side, target.z + dirX * V.side, false],
        [target.x + dirZ * V.side, target.z - dirX * V.side, false],
      ];
      const globs = [];
      for (const [px, pz, aimed] of pods) {
        const tx = Math.min(mx, Math.max(-mx, px));
        const tz = Math.min(mz, Math.max(-mz, pz));
        const g = ctx.spawnGlob(b, tick, {
          tx,
          tz,
          flightTicks: V.flightTicks,
          radius: V.radius,
          power,
          slickRadius: V.patchRadius,
          slickTicks: V.patchTicks,
          slickSlow: V.patchSlow,
          slickVariant: 'thorn',
          // One pod is the aimed, governed telegraph; its sisters land beside
          // it in the same beat.
          playerTargeted: aimed,
          targetId: aimed ? target.id : null,
        });
        globs.push(g.id);
      }
      ctx.events.emit(tick, 'boss_seed_volley', { id: b.id, x: r2(b.x), z: r2(b.z), globs });
      b.nextVolleyTick = tick + V.cdTicks;
    }
  },

  onAddPhase() {},

  view(b) {
    return { mode: b.mode };
  },
};
