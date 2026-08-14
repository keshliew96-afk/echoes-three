// Projectile sim (§6): straight-line flight pos(t) = origin + dir*speed*t,
// expiry at max range, swept wall collision (impact beats same-tick expiry).
// Bolts are registry entities — they carry spawn ordinals per §1 (the
// universal deterministic tiebreak once impacts/maturations land). Target
// collision (enemies/allies) arrives with the combat block; this block gives
// bolts full flight, wall stop, and range expiry.
import { TICK_HZ } from '../core/constants.js';
import { sweptStep } from './movement.js';

const r2 = (v) => Math.round(v * 100) / 100;

export function createProjectileSystem({ registry, events }) {
  function spawn(tick, { x, z, dirX, dirZ, speed, range, radius }) {
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

  // Continuous-phase advance (§4 phase 1). One swept sub-step per tick.
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
      const { hit, t } = sweptStep(p, dx, dz, p.radius);
      p.traveled += Math.hypot(dx, dz) * t;
      if (hit) despawn(tick, p, 'wall'); // §6: impact beats same-tick expiry
      else if (expires) despawn(tick, p, 'expired');
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
