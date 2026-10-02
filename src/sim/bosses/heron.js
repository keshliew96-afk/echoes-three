// THE DROWNED HERON — Act II (Sunken Mill) boss kit (docs/CONTENT_PLAN.md
// §2.2). A gaunt wading bird 2.2x party height whose bill is a spear.
//
//   Bill Spear (primary): an Ember LANE from the Heron through its target
//     (1.0 u wide, up to 7.5 u, 48-tick warning), then it DRIVES down the lane
//     at 11 u/s: 16 damage to every party body it crosses (once each).
//     Cooldown 270 ticks from the telegraph start.
//   Wingbeat (secondary): an Ember RING r 2.2 centred on the Heron itself
//     (42-tick warning), 10 damage — it punishes crowding the bird, so the
//     melee pair has to step out. Cooldown 360 ticks. Only when a party body
//     stands within 2.4 u.
//   Submerge (add phases): every add wave sends the Heron under the millrace —
//     untargetable (`hittable: false`) while it glides to the arena centre. It
//     resurfaces when its adds are dead or after 360 ticks, with a 48-tick
//     Ember ring r 1.8 under it that bursts for 14 damage.
//
// All per-boss state is plain entity data (mode, telegraph, dash velocity,
// per-dash hit ids, submerge clock) so saves and snapshots carry it for free.
// Telegraphs go through the boss-side §11 governor like the Stag's quake.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const HERON = Object.freeze({
  name: 'THE DROWNED HERON',
  radius: 0.6,
  moveSpeed: 2.0,
  scale: 2.2,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['toad', 'moth', 'moth']),
  spear: Object.freeze({
    damage: 16,
    cdTicks: 270,
    telegraphTicks: 48,
    width: 1.0,
    maxLen: 7.5,
    engageRange: 6.5,
    dashSpeed: 11.0,
  }),
  wingbeat: Object.freeze({ damage: 10, cdTicks: 360, telegraphTicks: 42, radius: 2.2, trigger: 2.4 }),
  submerge: Object.freeze({ maxTicks: 360, telegraphTicks: 48, radius: 1.8, damage: 14 }),
  standoff: 1.4, // keeps a spear's length away rather than pressing to contact
  firstSpearDelay: 90,
});

export default {
  id: 'heron',
  def: HERON,

  spawn(ctx, b, tick) {
    b.mode = 'stalk'; // 'stalk' | 'dash' | 'submerged' | 'surfacing'
    b.nextSpearTick = tick + HERON.firstSpearDelay;
    b.nextWingTick = tick + 180;
    b.dashVx = 0;
    b.dashVz = 0;
    b.dashTicksLeft = 0;
    b.dashHit = [];
    b.submergeUntil = 0;
  },

  continuous(ctx, b, tick) {
    if (b.mode === 'dash') {
      ctx.walkStep(b, b.dashVx, b.dashVz, b.radius);
      b.dashTicksLeft -= 1;
      for (const p of ctx.partyBodies()) {
        if (b.dashHit.includes(p.id)) continue;
        const d = Math.hypot(p.x - b.x, p.z - b.z);
        if (d <= b.radius + p.radius + 0.1) {
          b.dashHit.push(p.id);
          const l = d > 1e-6 ? d : 1;
          ctx.events.emit(tick, 'boss_spear_hit', { id: b.id, target: p.id });
          ctx.combat.applyDamage(p, HERON.spear.damage * ctx.dmgMul(), {
            delivery: 'contact',
            shape: 'contact',
            dirX: (p.x - b.x) / l,
            dirZ: (p.z - b.z) / l,
            attacker: b.id,
          });
        }
      }
      if (b.dashTicksLeft <= 0) b.mode = 'stalk';
      return;
    }
    if (b.mode === 'submerged' || b.mode === 'surfacing') {
      // Glide toward the arena centre under the water; plant while surfacing.
      if (b.mode === 'submerged') {
        const d = Math.hypot(b.x, b.z);
        if (d > 0.1) {
          const adv = Math.min(HERON.moveSpeed * 1.4 * TICK_DT, d);
          ctx.walkStep(b, (-b.x / d) * adv, (-b.z / d) * adv, b.radius);
        }
      }
      return;
    }
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
    if (b.telegraph) return; // the locked lane / ring is the promise
    const stop = b.radius + target.radius + HERON.standoff;
    if (d > stop) {
      const adv = Math.min(HERON.moveSpeed * TICK_DT, d - stop);
      ctx.walkStep(b, (dx / d) * adv, (dz / d) * adv, b.radius);
    }
  },

  resolve(ctx, b, tick) {
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'spear') {
        const len = Math.hypot(t.x - t.fromX, t.z - t.fromZ);
        const step = HERON.spear.dashSpeed * TICK_DT;
        b.mode = 'dash';
        b.dashVx = t.dirX * step;
        b.dashVz = t.dirZ * step;
        b.dashTicksLeft = Math.max(1, Math.ceil(len / step));
        b.dashHit = [];
        ctx.events.emit(tick, 'boss_spear', { id: b.id, x: r2(b.x), z: r2(b.z), len: r2(len) });
        ctx.shake(tick, 'boss_spear', b.x, b.z);
      } else if (t.attack === 'wingbeat') {
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        ctx.events.emit(tick, 'boss_wingbeat', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
        ctx.hitAll(b, victims, HERON.wingbeat.damage, t.x, t.z);
      } else if (t.attack === 'surface') {
        const victims = ctx.partyIn(t.x, t.z, t.radius);
        b.mode = 'stalk';
        b.hittable = true;
        b.submerged = false;
        b.nextSpearTick = Math.max(b.nextSpearTick, tick + 60);
        ctx.events.emit(tick, 'boss_surface', { id: b.id, x: r2(t.x), z: r2(t.z), radius: t.radius, victims: victims.length });
        ctx.shake(tick, 'boss_surface', t.x, t.z);
        ctx.hitAll(b, victims, HERON.submerge.damage, t.x, t.z);
      }
      return;
    }
    if (b.mode === 'dash' || b.mode === 'surfacing') return;
    if (b.mode === 'submerged') {
      const done = ctx.liveAdds() === 0 || tick >= b.submergeUntil;
      // Past its clock the Heron surfaces whatever the governor says (an
      // untargetable boss must never stall the fight).
      if (!done || (!ctx.governorGrants(tick) && tick < b.submergeUntil + 120)) return;
      b.mode = 'surfacing';
      ctx.startTelegraph(b, tick, {
        kind: 'ring',
        attack: 'surface',
        ticks: HERON.submerge.telegraphTicks,
        x: b.x,
        z: b.z,
        radius: HERON.submerge.radius,
        targetId: null,
      });
      return;
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    // Primary: the spear lane, aimed THROUGH the target and clamped to the room.
    if (tick >= b.nextSpearTick && d <= HERON.spear.engageRange && d > 1e-6) {
      const dirX = (target.x - b.x) / d;
      const dirZ = (target.z - b.z) / d;
      const { mx, mz } = ctx.innerBounds(b.radius);
      let len = Math.min(HERON.spear.maxLen, d + 2.5);
      // Shorten so the far end stays inside the walls.
      for (let i = 0; i < 40; i++) {
        const ex = b.x + dirX * len;
        const ez = b.z + dirZ * len;
        if (Math.abs(ex) <= mx && Math.abs(ez) <= mz) break;
        len -= 0.2;
      }
      len = Math.max(1.5, len);
      ctx.startTelegraph(b, tick, {
        kind: 'lane',
        attack: 'spear',
        ticks: HERON.spear.telegraphTicks,
        fromX: b.x,
        fromZ: b.z,
        x: b.x + dirX * len,
        z: b.z + dirZ * len,
        dirX,
        dirZ,
        length: len,
        width: HERON.spear.width,
        targetId: target.id,
      });
      b.nextSpearTick = tick + HERON.spear.cdTicks;
      return;
    }
    // Secondary: wingbeat when someone crowds the bird.
    if (tick >= b.nextWingTick) {
      const close = ctx.partyIn(b.x, b.z, HERON.wingbeat.trigger).length;
      if (close > 0) {
        ctx.startTelegraph(b, tick, {
          kind: 'ring',
          attack: 'wingbeat',
          ticks: HERON.wingbeat.telegraphTicks,
          x: b.x,
          z: b.z,
          radius: HERON.wingbeat.radius,
          targetId: target.id,
        });
        b.nextWingTick = tick + HERON.wingbeat.cdTicks;
      }
    }
  },

  // An add wave sends the Heron under (cancelling whatever it was winding up).
  onAddPhase(ctx, b, tick) {
    if (b.telegraph) ctx.cancelTelegraph(b, tick, 'submerge');
    b.mode = 'submerged';
    b.dashTicksLeft = 0;
    b.hittable = false;
    b.submerged = true;
    b.submergeUntil = tick + HERON.submerge.maxTicks;
    ctx.events.emit(tick, 'boss_submerge', { id: b.id, x: r2(b.x), z: r2(b.z), until: b.submergeUntil });
  },

  view(b) {
    return { mode: b.mode, submerged: !!b.submerged };
  },
};
