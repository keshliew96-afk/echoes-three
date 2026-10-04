// THE MILLWHEEL — Act II (Sunken Mill) second boss (docs/CONTENT_PLAN.md
// §2.4). The mill's own wheel, torn off its axle and turned: a rolling
// construct of oak and iron that owns the edge of the room.
//
//   Rim Roll (movement): it rolls round the room's rim at 2.4 u/s, turning
//     at the corners, and grinds any party body it touches on the way (3,
//     each body at most every 90 ticks). The centre is the party's ground;
//     the rim is the wheel's.
//   Cog Shards (primary): it stops on the rim and its spokes glow (an Ember
//     cone r 6.0, half-angle 28°, locked on its target, 48 ticks), then it
//     looses a fan of five shards (12° apart) down the cone, 5 damage each,
//     5.5 u/s. Cooldown 240 ticks.
//   Crosscut (secondary, and at every add phase): an Ember lane from the
//     wheel through its target to the far wall (1.6 u wide, 66 ticks), then
//     it rolls straight across at 9 u/s for 14 to each party body it crosses,
//     GRINDING every barricade, keg and puffcap in the lane. It slams into
//     the far wall and wobbles there, DIZZY, for 75 ticks (no attacks, no
//     roll — the punish window) before it rejoins the rim. Cooldown 480 ticks.
//
// The Heron hunts the party from the water; the Millwheel herds it off the
// walls and cuts across the floor. All state is plain entity data.
import { TICK_HZ } from '../../core/constants.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

export const MILLWHEEL = Object.freeze({
  name: 'THE MILLWHEEL',
  radius: 0.8,
  hpMul: 0.75,
  scale: 2.2,
  addPhases: Object.freeze([0.75, 0.5, 0.25]),
  addComposition: Object.freeze(['toad', 'moth', 'moth']),
  rim: Object.freeze({ speed: 2.4, inset: 0.2, damage: 3, perTargetTicks: 90 }),
  shards: Object.freeze({ damage: 5, cdTicks: 240, telegraphTicks: 48, coneRadius: 6.0, coneHalfAngleDeg: 28, count: 5, spreadDeg: 12, speed: 5.5, range: 9.0, firstDelay: 120 }),
  crosscut: Object.freeze({ damage: 14, cdTicks: 480, firstDelay: 330, telegraphTicks: 66, width: 1.6, speed: 9.0, dizzyTicks: 75 }),
});

const DEG = Math.PI / 180;

// The rim loop: the inner bounds rectangle, walked clockwise.
function rimRect(ctx, b) {
  const { mx, mz } = ctx.innerBounds(b.radius);
  const i = MILLWHEEL.rim.inset;
  return { mx: mx - i, mz: mz - i };
}

// Perimeter coordinate of a point (projected onto the rim rectangle), and
// back: edges run (-mx,-mz) -> (mx,-mz) -> (mx,mz) -> (-mx,mz) -> start.
function rimS(x, z, mx, mz) {
  const cx = Math.max(-mx, Math.min(mx, x));
  const cz = Math.max(-mz, Math.min(mz, z));
  const d = [cz + mz, mx - cx, mz - cz, cx + mx]; // distance to each edge
  let k = 0;
  for (let i = 1; i < 4; i++) if (d[i] < d[k]) k = i;
  if (k === 0) return cx + mx;
  if (k === 1) return 2 * mx + (cz + mz);
  if (k === 2) return 2 * mx + 2 * mz + (mx - cx);
  return 4 * mx + 2 * mz + (mz - cz);
}
function rimXZ(s, mx, mz) {
  const P = 4 * (mx + mz);
  let u = ((s % P) + P) % P;
  if (u < 2 * mx) return { x: u - mx, z: -mz };
  u -= 2 * mx;
  if (u < 2 * mz) return { x: mx, z: u - mz };
  u -= 2 * mz;
  if (u < 2 * mx) return { x: mx - u, z: mz };
  u -= 2 * mx;
  return { x: -mx, z: mz - u };
}

export default {
  id: 'millwheel',
  def: MILLWHEEL,

  spawn(ctx, b, tick) {
    b.mode = 'roll'; // 'roll' | 'spokes' | 'cut'
    b.sense = 1; // +1 clockwise, -1 counter
    b.nextShardTick = tick + MILLWHEEL.shards.firstDelay;
    b.nextCutTick = tick + MILLWHEEL.crosscut.firstDelay;
    b.cutVx = 0;
    b.cutVz = 0;
    b.cutTicksLeft = 0;
    b.cutHit = [];
    b.grindCd = {};
    b.spin = 0; // render: accumulated roll distance
    b.wantCut = false;
    b.dizzyUntil = 0;
  },

  continuous(ctx, b, tick) {
    if (b.mode === 'cut') {
      const hitWall = ctx.walkStep(b, b.cutVx, b.cutVz, b.radius);
      b.spin += Math.hypot(b.cutVx, b.cutVz);
      b.cutTicksLeft -= 1;
      for (const p of ctx.partyBodies()) {
        if (b.cutHit.includes(p.id)) continue;
        const d = Math.hypot(p.x - b.x, p.z - b.z);
        if (d <= MILLWHEEL.crosscut.width / 2 + p.radius) {
          b.cutHit.push(p.id);
          const l = d > 1e-6 ? d : 1;
          ctx.combat.applyDamage(p, MILLWHEEL.crosscut.damage * ctx.dmgMul(), { delivery: 'contact', shape: 'contact', dirX: (p.x - b.x) / l, dirZ: (p.z - b.z) / l, attacker: b.id });
        }
      }
      for (const n of ctx.neutralsIn(b.x, b.z, b.radius + 0.1)) {
        ctx.events.emit(tick, 'boss_grind', { id: b.id, target: n.id, x: r2(n.x), z: r2(n.z) });
        ctx.combat.applyDamage(n, 999, { delivery: 'contact', shape: 'contact', dirX: b.cutVx, dirZ: b.cutVz, attacker: b.id });
      }
      if (hitWall || b.cutTicksLeft <= 0) {
        b.mode = 'dizzy';
        b.dizzyUntil = tick + MILLWHEEL.crosscut.dizzyTicks;
        ctx.events.emit(tick, 'boss_cut_end', { id: b.id, x: r2(b.x), z: r2(b.z) });
        ctx.shake(tick, 'boss_cut_end', b.x, b.z);
      }
      return;
    }
    const target = ctx.pickTarget(b);
    b.targetId = target ? target.id : null;
    if (target) {
      const dx = target.x - b.x;
      const dz = target.z - b.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6 && b.mode !== 'roll') {
        b.faceX = dx / d;
        b.faceZ = dz / d;
      }
    }
    if (b.mode !== 'roll' || b.telegraph) return;
    // Rim Roll: head for the point one step further round the rim (from off
    // the rim this rolls it straight back out to the wall).
    const { mx, mz } = rimRect(ctx, b);
    const step = MILLWHEEL.rim.speed * TICK_DT;
    const off = Math.min(mx - Math.abs(b.x), mz - Math.abs(b.z));
    const goal = rimXZ(rimS(b.x, b.z, mx, mz) + (off > 0.15 ? 0 : step * b.sense), mx, mz);
    let vx = goal.x - b.x;
    let vz = goal.z - b.z;
    const gl = Math.hypot(vx, vz);
    if (gl > step) {
      vx = (vx / gl) * step;
      vz = (vz / gl) * step;
    }
    ctx.walkStep(b, vx, vz, b.radius);
    b.spin += Math.hypot(vx, vz);
    const l = Math.hypot(vx, vz);
    if (l > 1e-6) {
      b.faceX = vx / l;
      b.faceZ = vz / l;
    }
    // Grind contact on the rim.
    for (const p of ctx.partyBodies()) {
      if (tick < (b.grindCd[p.id] ?? 0)) continue;
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      if (d > b.radius + p.radius + 0.05) continue;
      b.grindCd[p.id] = tick + MILLWHEEL.rim.perTargetTicks;
      const dl = d > 1e-6 ? d : 1;
      ctx.combat.applyDamage(p, MILLWHEEL.rim.damage * ctx.dmgMul(), { delivery: 'contact', shape: 'contact', dirX: (p.x - b.x) / dl, dirZ: (p.z - b.z) / dl, attacker: b.id });
    }
  },

  resolve(ctx, b, tick) {
    const t = b.telegraph;
    if (t) {
      if (tick < t.resolveTick) return;
      ctx.endTelegraph(b, tick);
      if (t.attack === 'crosscut') {
        const step = MILLWHEEL.crosscut.speed * TICK_DT;
        b.mode = 'cut';
        b.cutVx = t.dirX * step;
        b.cutVz = t.dirZ * step;
        b.cutTicksLeft = Math.max(1, Math.ceil(t.length / step) + 2);
        b.cutHit = [];
        b.sense = -b.sense; // comes back round the other way
        ctx.events.emit(tick, 'boss_crosscut', { id: b.id, x: r2(b.x), z: r2(b.z), len: r2(t.length) });
      } else if (t.attack === 'shards') {
        const S = MILLWHEEL.shards;
        // Fired down the locked cone (the telegraph is the promise).
        const base = Math.atan2(t.dirZ, t.dirX);
        const shots = [];
        for (let k = 0; k < S.count; k++) {
          const a = base + (k - (S.count - 1) / 2) * S.spreadDeg * DEG;
          shots.push(ctx.fireShot(b, tick, Math.cos(a), Math.sin(a), { speed: S.speed, range: S.range, power: S.damage * ctx.dmgMul() }).id);
        }
        b.mode = 'roll';
        ctx.events.emit(tick, 'boss_cog_shards', { id: b.id, x: r2(b.x), z: r2(b.z), shots });
      }
      return;
    }
    if (b.mode === 'cut') return;
    if (b.mode === 'dizzy') {
      if (tick < b.dizzyUntil) return;
      b.mode = 'roll';
    }
    const target = b.targetId != null ? ctx.registry.byId(b.targetId) : null;
    if (!target || !(target.hp > 0)) return;
    if (!ctx.governorGrants(tick)) return;
    const d = Math.hypot(target.x - b.x, target.z - b.z);
    if (d < 1e-6) return;
    const dirX = (target.x - b.x) / d;
    const dirZ = (target.z - b.z) / d;
    if (b.wantCut || tick >= b.nextCutTick) {
      const { mx, mz } = ctx.innerBounds(b.radius);
      let len = 30;
      if (dirX > 1e-6) len = Math.min(len, (mx - b.x) / dirX);
      else if (dirX < -1e-6) len = Math.min(len, (-mx - b.x) / dirX);
      if (dirZ > 1e-6) len = Math.min(len, (mz - b.z) / dirZ);
      else if (dirZ < -1e-6) len = Math.min(len, (-mz - b.z) / dirZ);
      if (len >= 2) {
        b.wantCut = false;
        b.mode = 'spokes';
        ctx.startTelegraph(b, tick, {
          kind: 'lane',
          attack: 'crosscut',
          ticks: MILLWHEEL.crosscut.telegraphTicks,
          fromX: b.x,
          fromZ: b.z,
          x: b.x + dirX * len,
          z: b.z + dirZ * len,
          dirX,
          dirZ,
          length: len,
          width: MILLWHEEL.crosscut.width,
          targetId: target.id,
        });
        b.nextCutTick = tick + MILLWHEEL.crosscut.cdTicks;
        return;
      }
    }
    if (tick >= b.nextShardTick) {
      b.mode = 'spokes';
      ctx.startTelegraph(b, tick, {
        kind: 'cone',
        attack: 'shards',
        ticks: MILLWHEEL.shards.telegraphTicks,
        x: b.x,
        z: b.z,
        dirX,
        dirZ,
        radius: MILLWHEEL.shards.coneRadius,
        length: MILLWHEEL.shards.coneRadius,
        halfAngleDeg: MILLWHEEL.shards.coneHalfAngleDeg,
        targetId: target.id,
      });
      b.nextShardTick = tick + MILLWHEEL.shards.telegraphTicks + MILLWHEEL.shards.cdTicks;
    }
  },

  // Every add phase it answers with a Crosscut as soon as the governor lets it.
  onAddPhase(ctx, b) {
    b.wantCut = true;
  },

  view(b) {
    return { mode: b.mode, sense: b.sense };
  },
};
