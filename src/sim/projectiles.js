// Projectile sim (§6): straight-line flight pos(t) = origin + dir*speed*t,
// expiry at max range, swept collision vs walls AND vs hittable entities
// (impact beats same-tick expiry). Bolts are registry entities — they carry
// spawn ordinals per §1 (the universal deterministic tiebreak; the world
// resolves queued impacts in ascending carrier-ordinal order, §4 ①).
//
// Entity collision: earliest circle contact along this tick's swept step,
// against living entities flagged `hittable` of a different faction. I-framed
// targets are still CONTACTED — the pipeline then resolves the contact to
// `hit_immune` with no instance and no RNG draw (§5/§9) — so the bolt stops on
// a dodging body instead of sailing through it. On impact the system despawns
// the bolt at the contact point and hands (tick, bolt, target) to `onImpact`;
// the world queues the actual damage instance as a §4 deferred maturation.
import { TICK_HZ } from '../core/constants.js';
import { sweptContactT, sweptStep } from './movement.js';

const r2 = (v) => Math.round(v * 100) / 100;

// First contact parameter t in [0,1] of a point sweeping (dx, dz) against a
// circle at (cx, cz) with combined radius R; Infinity if no contact this step.
// Already-overlapping starts contact immediately (t = 0).
function circleContactT(px, pz, dx, dz, cx, cz, R) {
  const rx = px - cx;
  const rz = pz - cz;
  const c = rx * rx + rz * rz - R * R;
  if (c <= 0) return 0;
  const a = dx * dx + dz * dz;
  if (a < 1e-12) return Infinity;
  const b = 2 * (rx * dx + rz * dz);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : Infinity;
}

export function createProjectileSystem({ registry, events, onImpact = null }) {
  // opts: { x, z, dirX, dirZ, speed, range, radius, power, delivery, faction }
  // power/delivery ride on the bolt so the impact resolver never guesses them.
  function spawn(tick, { x, z, dirX, dirZ, speed, range, radius, power = 0, delivery = 'basic', faction = 'party' }) {
    const perTick = speed / TICK_HZ;
    const p = registry.spawn({
      kind: 'bolt',
      x,
      z,
      px: x,
      pz: z,
      vx: dirX * perTick,
      vz: dirZ * perTick,
      traveled: 0,
      range,
      radius,
      power,
      delivery,
      faction,
    });
    events.emit(tick, 'projectile_spawn', {
      id: p.id,
      x: r2(x),
      z: r2(z),
      dx: r2(dirX),
      dz: r2(dirZ),
    });
    return p;
  }

  // Continuous-phase advance (§4 phase 1). One swept sub-step per tick;
  // earliest contact (entity vs wall) wins, impact beats same-tick expiry.
  function step(tick) {
    for (const p of registry.all()) {
      if (p.kind !== 'bolt') continue;
      const stepLen = Math.hypot(p.vx, p.vz);
      const remaining = p.range - p.traveled;
      let dx = p.vx;
      let dz = p.vz;
      let expires = false;
      if (stepLen >= remaining) {
        // Scale the final step so the bolt dies exactly AT range, not past it.
        const s = stepLen > 0 ? remaining / stepLen : 0;
        dx *= s;
        dz *= s;
        expires = true;
      }

      // Earliest hittable-entity contact. Ascending-ordinal scan with strict
      // `<` keeps the lowest spawn ordinal on exact ties (§1 tiebreak).
      let tHit = Infinity;
      let victim = null;
      if (onImpact) {
        for (const e of registry.all()) {
          if (!e.hittable || !(e.hp > 0) || e.faction === p.faction) continue;
          const t = circleContactT(p.x, p.z, dx, dz, e.x, e.z, p.radius + e.radius);
          if (t < tHit) {
            tHit = t;
            victim = e;
          }
        }
      }

      const tWall = sweptContactT(p.x, p.z, dx, dz, p.radius);
      if (victim && tHit <= tWall) {
        p.x += dx * tHit;
        p.z += dz * tHit;
        p.traveled += Math.hypot(dx, dz) * tHit;
        despawn(tick, p, 'impact');
        onImpact(tick, p, victim);
      } else {
        const { hit, t } = sweptStep(p, dx, dz, p.radius);
        p.traveled += Math.hypot(dx, dz) * t;
        if (hit) despawn(tick, p, 'wall'); // §6: impact beats same-tick expiry
        else if (expires) despawn(tick, p, 'expired');
      }
    }
  }

  function despawn(tick, p, cause) {
    events.emit(tick, 'projectile_despawn', {
      id: p.id,
      cause,
      traveled: r2(p.traveled),
    });
    registry.despawn(p.id);
  }

  return { spawn, step };
}
