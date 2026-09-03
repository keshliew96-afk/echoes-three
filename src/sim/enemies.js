// Enemy sim (BUILD_BRIEF §11) — Act-1 corrupted beasts: the Thorn Boar (melee
// rusher, contact damage on a per-target cooldown) and the Spitting Mantis
// (ranged, every shot telegraphed 0.7 s before it fires). All stats below are
// the §11 table verbatim; the few scaffold values (collision footprints, the
// mantis reposition band, shot flight cap) are labelled as such and carry no
// brief number of their own.
//
// Targeting (§11): every enemy independently targets the nearest living
// non-Downed party-faction body, re-evaluated continuously — no threat table,
// no coordination. In defend rooms the Waystone is spawned as a party-faction
// entity, so the candidate set {party} ∪ {objective} with nearest-wins falls
// out of the same scan (interposition IS the defense) and reverts on objective
// death for free. Distance ties break by ascending spawn ordinal (§1: strict
// `<` over an ascending-ordinal scan).
//
// Telegraph cadence governor (§11 structural rule): no two player-targeted
// telegraphs resolve within 1.2 s of each other — enforced by capping
// simultaneous telegraphing attackers at 2 AND staggering attack-cast starts
// by >= 1.2 s. Telegraph durations are uniform (0.7 s), so staggered starts
// imply staggered resolutions. Waystone-targeted casts are not player-facing
// and do not consume governor slots (the rule protects player readability).
//
// Enemy shots are simulated here (kind 'eshot') rather than through
// sim/projectiles.js so they can carry their own kind for the render layer
// (enemy shots are Ember-family, §19.4 — the player-bolt renderer must never
// pick them up). Flight math matches projectiles.js: straight line, swept vs
// walls AND vs party-faction hittable bodies, impact beats same-tick expiry;
// impacts resolve through the world's §4 ① deferred-maturation queue via the
// injected `queueImpact`, so bolt-vs-shot resolution order stays a single
// ascending-carrier-ordinal sort.
//
// Sim discipline: no DOM, no render imports, no wall clock. The only seeded
// RNG the enemy system consumes is inside combat.applyDamage (crit rolls, in
// resolution order); steering/strafe/retreat are pure geometry + spawn-ordinal
// parity, so two loads with one seed replay identically.
import { TICK_HZ } from '../core/constants.js';
import { walkStep, sweptStep, sweptContactT, innerBounds } from './movement.js';

const TICK_DT = 1 / TICK_HZ;
const r2 = (v) => Math.round(v * 100) / 100;

// §11 enemy table — verbatim rows (ticks = seconds x 60, integer).
export const ENEMY_STATS = Object.freeze({
  boar: Object.freeze({
    hp: 20, // §11
    moveSpeed: 2.0, // §11 u/s
    contactDamage: 8, // §11
    attackCdTicks: 48, // §11 0.8 s per target
    contactRange: 0.35, // §11 "contact (0.35 u)" — the boar's contact footprint
    radius: 0.35, // collision footprint = the contact figure (scaffold mapping)
  }),
  mantis: Object.freeze({
    hp: 15, // §11
    moveSpeed: 1.6, // §11 u/s ("repositions to keep range")
    shotDamage: 10, // §11
    attackCdTicks: 150, // §11 2.5 s
    engageRange: 3.5, // §11 engage 3.5 u
    telegraphTicks: 42, // §11 telegraphed 0.7 s
    shotSpeed: 4.0, // §11 enemy projectile speed (always < the player's 5.2)
    radius: 0.3, // scaffold footprint (same capsule as the Healer)
    keepMin: 2.4, // scaffold: reposition band floor for "keep range"
    shotRange: 7.0, // scaffold flight cap (2x engage; walls stop shots anyway)
    shotRadius: 0.07, // scaffold swept radius (player bolt uses 0.05)
  }),
});

// §11 governor numbers, verbatim: cap 2 concurrent player-targeted
// telegraphing attackers, stagger cast starts by >= 1.2 s (72 ticks).
export const GOVERNOR = Object.freeze({ maxConcurrent: 2, staggerTicks: 72 });

// §11 "Room clear: surviving enemies enter Retreating (ignore players, stop
// attacking, despawn ~1 s)". 66 ticks = 1.1 s of visible retreat travel.
const RETREAT_TICKS = 66;
const RETREAT_SPEED_MULT = 1.4; // scaffold urgency (brief binds only ~1 s)
// §12 gives allies a 0.26 u soft push; enemies reuse the same scale so a wave
// never collapses into one stacked silhouette (scaffold reuse, not a stat).
const SEPARATION = 0.26;
const SEP_STEP_CAP = 0.02; // u per tick of separation correction

// First contact parameter t in [0,1] of a point sweeping (dx, dz) against a
// circle at (cx, cz) with combined radius R (same math as projectiles.js).
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

const isEnemyKind = (k) => k === 'boar' || k === 'mantis';

export function createEnemySystem({ registry, events, rng, combat, getTick, queueImpact }) {
  // Governor bookkeeping: concurrency is counted live off entity state (a dead
  // or retreating caster releases its slot implicitly); only the last START
  // needs remembering.
  let lastPlayerTelegraphStart = -100000;
  // Spawn gate (run block, §2/§18): once a run has been played, enemies may
  // only spawn while that run is in live combat — never on the end screens or
  // in Camp. Installed by sim/run.js; null = ungated (the ?room= harness).
  let spawnGate = null;

  function governorGrants(tick) {
    let telegraphing = 0;
    for (const e of registry.all()) {
      if (isEnemyKind(e.kind) && e.telegraph && e.telegraph.playerTargeted) telegraphing += 1;
    }
    return (
      telegraphing < GOVERNOR.maxConcurrent &&
      tick - lastPlayerTelegraphStart >= GOVERNOR.staggerTicks
    );
  }

  function spawn(etype, x = 0, z = 0, wave = -1) {
    const S = ENEMY_STATS[etype];
    if (!S) return null;
    const tick = getTick();
    if (spawnGate && !spawnGate()) {
      events.emit(tick, "spawn_blocked", { etype, x: r2(x), z: r2(z), wave });
      return null;
    }
    const { mx, mz } = innerBounds(S.radius);
    const sx = Math.min(mx, Math.max(-mx, x));
    const sz = Math.min(mz, Math.max(-mz, z));
    // Initial facing: into the arena (spawns sit on the edge ring).
    const inLen = Math.hypot(sx, sz) || 1;
    const e = registry.spawn({
      kind: etype,
      faction: 'hostile',
      hittable: true,
      knockbackable: true, // §9 #3: non-boss enemies take knockback
      hp: S.hp,
      maxHp: S.hp,
      radius: S.radius,
      x: sx,
      z: sz,
      px: sx,
      pz: sz,
      kbVx: 0,
      kbVz: 0,
      kbTicks: 0,
      iframeUntilTick: 0,
      state: 'active', // 'active' | 'retreating'
      targetId: null,
      telegraph: null, // { startTick, resolveTick, x, z, dirX, dirZ, playerTargeted, targetId }
      nextAttackTick: 0, // mantis shot cadence
      cdByTarget: {}, // boar §11 "0.8 s per target"
      faceX: -sx / inLen,
      faceZ: -sz / inLen,
      wave,
    });
    events.emit(tick, 'enemy_spawn', { id: e.id, etype, x: r2(sx), z: r2(sz), wave });
    return e;
  }

  // Nearest living party-faction body (player, future sim allies, and the
  // Waystone in defend rooms). Downed (hp <= 0) bodies are outside the set.
  function nearestTarget(e) {
    let best = null;
    let bestD2 = Infinity;
    for (const t of registry.all()) {
      if (t.faction !== 'party' || !(t.hp > 0)) continue;
      const dx = t.x - e.x;
      const dz = t.z - e.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = t;
      }
    }
    return best;
  }

  function face(e, dx, dz) {
    const l = Math.hypot(dx, dz);
    if (l > 1e-6) {
      e.faceX = dx / l;
      e.faceZ = dz / l;
    }
  }

  // ------------------------------------------------------- continuous phase --
  function continuous() {
    const tick = getTick();
    const all = registry.all();

    for (const e of all) {
      if (!isEnemyKind(e.kind)) continue;
      if (e.state === 'retreating') {
        retreatMove(e, tick);
        continue;
      }
      if (e.kbTicks > 0) continue; // the knockback impulse owns the body

      const target = nearestTarget(e);
      e.targetId = target ? target.id : null;
      if (!target) continue;

      const S = ENEMY_STATS[e.kind];
      const dx = target.x - e.x;
      const dz = target.z - e.z;
      const d = Math.hypot(dx, dz);
      const step = S.moveSpeed * TICK_DT;

      if (e.kind === 'boar') {
        // Rusher: press straight to contact, stop just as the circles touch.
        const stop = S.contactRange + target.radius - 0.04;
        if (d > stop && d > 1e-6) {
          const adv = Math.min(step, d - stop);
          walkStep(e, (dx / d) * adv, (dz / d) * adv, e.radius);
        }
        face(e, dx, dz);
      } else {
        // Mantis: turret-still while telegraphing (the locked aim IS the
        // readable promise); otherwise keep the [keepMin, engage] band.
        if (e.telegraph) {
          face(e, e.telegraph.dirX, e.telegraph.dirZ);
        } else if (d > 1e-6) {
          if (d > S.engageRange) {
            walkStep(e, (dx / d) * step, (dz / d) * step, e.radius);
          } else if (d < S.keepMin) {
            walkStep(e, (-dx / d) * step, (-dz / d) * step, e.radius);
          } else {
            // Slow tangential strafe between shots; direction by spawn-ordinal
            // parity (deterministic, zero RNG draws).
            const side = e.id % 2 === 0 ? 1 : -1;
            walkStep(e, (-dz / d) * step * 0.45 * side, (dx / d) * step * 0.45 * side, e.radius);
          }
          face(e, dx, dz);
        }
      }
    }

    // Soft separation (enemies + the immobile Waystone) so a wave reads as
    // individual silhouettes, never one stacked blob.
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      if (!isEnemyKind(a.kind) || a.state !== 'active') continue;
      for (let j = 0; j < all.length; j++) {
        if (i === j) continue;
        const b = all[j];
        const bSolid = (isEnemyKind(b.kind) && b.state === 'active') || b.kind === 'waystone';
        if (!bSolid) continue;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d = Math.hypot(dx, dz);
        const want = a.radius + b.radius + SEPARATION * 0.5;
        if (d < want && d > 1e-6) {
          const push = Math.min(SEP_STEP_CAP, (want - d) * 0.5);
          walkStep(a, (dx / d) * push, (dz / d) * push, a.radius);
        }
      }
    }

    stepShots(tick);
  }

  function retreatMove(e, tick) {
    if (tick >= e.despawnTick) {
      events.emit(tick, 'enemy_despawn', { id: e.id, etype: e.kind, cause: 'retreat' });
      registry.despawn(e.id);
      return;
    }
    const S = ENEMY_STATS[e.kind];
    const step = S.moveSpeed * RETREAT_SPEED_MULT * TICK_DT;
    walkStep(e, e.retreatDx * step, e.retreatDz * step, e.radius);
    face(e, e.retreatDx, e.retreatDz);
  }

  // Enemy shot flight (see header): swept vs party bodies and walls.
  function stepShots(tick) {
    for (const p of registry.all()) {
      if (p.kind !== 'eshot') continue;
      const stepLen = Math.hypot(p.vx, p.vz);
      const remaining = p.range - p.traveled;
      let dx = p.vx;
      let dz = p.vz;
      let expires = false;
      if (stepLen >= remaining) {
        const s = stepLen > 0 ? remaining / stepLen : 0;
        dx *= s;
        dz *= s;
        expires = true;
      }
      let tHit = Infinity;
      let victim = null;
      for (const t of registry.all()) {
        if (t.faction !== 'party' || !t.hittable || !(t.hp > 0)) continue;
        const ct = circleContactT(p.x, p.z, dx, dz, t.x, t.z, p.radius + t.radius);
        if (ct < tHit) {
          tHit = ct;
          victim = t;
        }
      }
      const tWall = sweptContactT(p.x, p.z, dx, dz, p.radius);
      if (victim && tHit <= tWall) {
        p.x += dx * tHit;
        p.z += dz * tHit;
        p.traveled += Math.hypot(dx, dz) * tHit;
        events.emit(tick, 'eshot_despawn', { id: p.id, cause: 'impact' });
        registry.despawn(p.id);
        queueImpact(tick, p, victim); // §4 ① — resolves with the bolt batch
      } else {
        const { hit, t } = sweptStep(p, dx, dz, p.radius);
        p.traveled += Math.hypot(dx, dz) * t;
        if (hit || expires) {
          events.emit(tick, 'eshot_despawn', { id: p.id, cause: hit ? 'wall' : 'expired' });
          registry.despawn(p.id);
        }
      }
    }
  }

  // --------------------------------------------------------- discrete phase --
  // Enemy resolutions in ascending spawn-ordinal order (§4 ②; registry
  // iteration order IS ordinal order).
  function resolveAll() {
    const tick = getTick();
    for (const e of registry.all()) {
      if (!isEnemyKind(e.kind) || e.state !== 'active' || !registry.byId(e.id)) continue;
      const S = ENEMY_STATS[e.kind];

      if (e.kind === 'boar') {
        const target = e.targetId != null ? registry.byId(e.targetId) : null;
        if (!target || !(target.hp > 0)) continue;
        const dx = target.x - e.x;
        const dz = target.z - e.z;
        const d = Math.hypot(dx, dz);
        if (d <= S.contactRange + target.radius + 0.02) {
          const next = e.cdByTarget[target.id] ?? 0;
          if (tick >= next) {
            e.cdByTarget[target.id] = tick + S.attackCdTicks; // §11 per-target cd
            const l = d > 1e-6 ? d : 1;
            events.emit(tick, 'enemy_bite', { id: e.id, target: target.id });
            combat.applyDamage(target, S.contactDamage, {
              delivery: 'contact',
              dirX: dx / l,
              dirZ: dz / l,
              attacker: e.id,
            });
          }
        }
        continue;
      }

      // Mantis.
      if (e.telegraph) {
        if (tick >= e.telegraph.resolveTick) {
          // Fire along the LOCKED direction (the telegraph is a commitment —
          // dodging out of the lane or i-framing through both beat it).
          const { dirX, dirZ, playerTargeted } = e.telegraph;
          const shot = registry.spawn({
            kind: 'eshot',
            faction: 'hostile',
            x: e.x,
            z: e.z,
            px: e.x,
            pz: e.z,
            vx: dirX * S.shotSpeed * TICK_DT,
            vz: dirZ * S.shotSpeed * TICK_DT,
            traveled: 0,
            range: S.shotRange,
            radius: S.shotRadius,
            power: S.shotDamage, // §11 shot 10
            delivery: 'shot',
          });
          events.emit(tick, 'telegraph_resolve', { id: e.id, playerTargeted });
          events.emit(tick, 'enemy_fire', {
            id: e.id,
            shot: shot.id,
            x: r2(e.x),
            z: r2(e.z),
            dx: r2(dirX),
            dz: r2(dirZ),
          });
          e.telegraph = null;
          e.nextAttackTick = tick + S.attackCdTicks; // §11 2.5 s
        }
        continue;
      }

      const target = e.targetId != null ? registry.byId(e.targetId) : null;
      if (!target || !(target.hp > 0) || tick < e.nextAttackTick) continue;
      const dx = target.x - e.x;
      const dz = target.z - e.z;
      const d = Math.hypot(dx, dz);
      if (d > S.engageRange + 0.2 || d < 1e-6) continue;
      const playerTargeted = target.partyIndex !== undefined;
      if (playerTargeted && !governorGrants(tick)) continue; // cadence governor
      e.telegraph = {
        startTick: tick,
        resolveTick: tick + S.telegraphTicks, // §11: visible >= 0.7 s
        x: target.x, // locked impact zone (the Ember decal sits here)
        z: target.z,
        dirX: dx / d,
        dirZ: dz / d,
        playerTargeted,
        targetId: target.id,
      };
      if (playerTargeted) lastPlayerTelegraphStart = tick;
      events.emit(tick, 'telegraph_start', {
        id: e.id,
        target: target.id,
        x: r2(target.x),
        z: r2(target.z),
        resolveTick: e.telegraph.resolveTick,
        playerTargeted,
      });
    }
  }

  // ----------------------------------------------------------------- clears --
  function startRetreat(e) {
    if (e.state === 'retreating') return;
    const tick = getTick();
    e.state = 'retreating';
    e.telegraph = null;
    e.targetId = null;
    e.hittable = false; // §13: no instance may land after the clear tick
    e.despawnTick = tick + RETREAT_TICKS;
    // Retreat straight toward the nearest wall (the closest way out).
    const { mx, mz } = innerBounds(e.radius);
    const gaps = [
      { d: mx - e.x, dx: 1, dz: 0 },
      { d: mx + e.x, dx: -1, dz: 0 },
      { d: mz - e.z, dx: 0, dz: 1 },
      { d: mz + e.z, dx: 0, dz: -1 },
    ];
    gaps.sort((a, b) => a.d - b.d);
    e.retreatDx = gaps[0].dx;
    e.retreatDz = gaps[0].dz;
    events.emit(tick, 'enemy_retreat', { id: e.id, etype: e.kind });
  }

  function retreatAllSurvivors() {
    for (const e of registry.all()) {
      if (isEnemyKind(e.kind) && e.state === 'active') startRetreat(e);
    }
  }

  // §13 step 2 (enemy side): shots in flight end AT the clear tick — a forced
  // clear or a defend timer-clear must never let an airborne shot land after
  // clearance ("no instance may land after the clear tick").
  function despawnShots() {
    const tick = getTick();
    for (const e of registry.all()) {
      if (e.kind !== 'eshot') continue;
      events.emit(tick, 'eshot_despawn', { id: e.id, cause: 'room_clear' });
      registry.despawn(e.id);
    }
  }

  // Room-restart hygiene (cmd('startRoom') on a dirty arena): silent despawn
  // of every enemy-block entity, no death juice.
  function reset() {
    const tick = getTick();
    for (const e of registry.all()) {
      if (isEnemyKind(e.kind) || e.kind === 'eshot' || e.kind === 'waystone') {
        events.emit(tick, 'enemy_despawn', { id: e.id, etype: e.kind, cause: 'reset' });
        registry.despawn(e.id);
      }
    }
  }

  const debugSpawn = (etype, x, z) => {
    const e = spawn(etype, x, z, -1);
    return e ? e.id : null;
  };

  return {
    spawn,
    continuous,
    resolveAll,
    startRetreat,
    retreatAllSurvivors,
    despawnShots,
    reset,
    debugSpawn,
    setSpawnGate: (fn) => {
      spawnGate = typeof fn === "function" ? fn : null;
    },
  };
}
