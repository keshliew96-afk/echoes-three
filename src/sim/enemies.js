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
//
// GAUNTLET CONTENT EXTENSION (M4b, docs/gauntlet/PLAN.md §3.6 / §4.5,
// BUILD_BRIEF §23.5). Five more archetypes — Quillback, Mire Toad, Gloam Moth,
// Barrow Ram, Grave Mole — live in src/sim/enemies/<id>.js as plain-data
// modules this system DISPATCHES to (`ARCHETYPES`), plus the Elite modifier
// (x1.8 HP, x1.25 damage, x1.2 scale) and difficulty scaling through
// `spawnScaled(etype, x, z, { hpMul, dmgMul, elite })`. Boar and Mantis keep
// their v0.4.63 code paths verbatim (the ?room= golden traces are unchanged);
// statuses (sim/status.js) now scale every enemy's steering (slow / stun) and
// stun blocks attack starts and interrupts a live wind-up. The telegraph
// governor counts EVERY live player-targeted telegraph in the registry (boss,
// adds, rockfall included) and hears every `telegraph_start` on the bus, so
// the §11 1.2 s stagger holds across systems. Lobbed toad globs (kind
// 'eglob') and their slicks (kind 'slick') are simulated here too.
import { TICK_HZ, KNOCKBACK } from '../core/constants.js';
import {
  walkStep,
  sweptStep,
  sweptContactT,
  sweptContact,
  sweptDynamicContact,
  dynamicColliders,
  innerBounds,
} from './movement.js';
import * as statusMod from './status.js';
import { strike, partyInRadius, neutralsInRadius } from './enemies/common.js';
import quillback from './enemies/quillback.js';
import toad from './enemies/toad.js';
import moth from './enemies/moth.js';
import ram from './enemies/ram.js';
import mole from './enemies/mole.js';

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

// Gauntlet archetypes (M4b): etype -> plain-data module (PLAN §3.6).
export const ARCHETYPES = Object.freeze({ quillback, toad, moth, ram, mole });
// Every hostile enemy kind this system owns (the boss is sim/boss.js's).
export const ENEMY_KINDS = Object.freeze(new Set(['boar', 'mantis', ...Object.keys(ARCHETYPES)]));
// §23.5 Elite modifier (any non-boss).
export const ELITE = Object.freeze({ hpMul: 1.8, dmgMul: 1.25, scale: 1.2 });
export function enemyStats(etype) {
  return ENEMY_STATS[etype] ?? (ARCHETYPES[etype] ? ARCHETYPES[etype].stats : null);
}

const isEnemyKind = (k) => ENEMY_KINDS.has(k);

export function createEnemySystem({ registry, events, rng, combat, getTick, queueImpact }) {
  // Governor bookkeeping: concurrency is counted live off entity state (a dead
  // or retreating caster releases its slot implicitly); only the last START
  // needs remembering.
  let lastPlayerTelegraphStart = -100000;
  // Spawn gate (run block, §2/§18): once a run has been played, enemies may
  // only spawn while that run is in live combat — never on the end screens or
  // in Camp. Installed by sim/run.js; null = ungated (the ?room= harness).
  let spawnGate = null;

  // Concurrency counts every live player-targeted telegraph in the registry —
  // enemies, lobbed globs, the Stag's quake, rockfall — and the stagger clock
  // hears every `telegraph_start` on the bus (§11: "applies across boss +
  // adds too"). In the ?room= harness only mantises telegraph, so this is the
  // v0.4.63 count exactly.
  function governorGrants(tick) {
    let telegraphing = 0;
    for (const e of registry.all()) {
      if (e.telegraph && e.telegraph.playerTargeted) telegraphing += 1;
    }
    return (
      telegraphing < GOVERNOR.maxConcurrent &&
      tick - lastPlayerTelegraphStart >= GOVERNOR.staggerTicks
    );
  }
  const governor = {
    grants: governorGrants,
    noteStart(tick) {
      if (tick > lastPlayerTelegraphStart) lastPlayerTelegraphStart = tick;
    },
    lastStart: () => lastPlayerTelegraphStart,
  };
  events.on('telegraph_start', (ev) => {
    if (ev.playerTargeted && ev.tick > lastPlayerTelegraphStart) lastPlayerTelegraphStart = ev.tick;
  });

  // --- archetype context (PLAN §3.6): everything an archetype module may use.
  function startTelegraph(e, tick, rec) {
    e.telegraph = rec;
    if (rec.playerTargeted) governor.noteStart(tick);
    events.emit(tick, 'telegraph_start', {
      id: e.id,
      etype: e.kind,
      shape: rec.kind,
      target: rec.targetId,
      x: r2(rec.x),
      z: r2(rec.z),
      resolveTick: rec.resolveTick,
      playerTargeted: !!rec.playerTargeted,
    });
  }
  function endTelegraph(e, tick) {
    const pt = !!(e.telegraph && e.telegraph.playerTargeted);
    e.telegraph = null;
    events.emit(tick, 'telegraph_resolve', { id: e.id, playerTargeted: pt });
  }
  // Stun interrupts a live wind-up (BUILD_BRIEF §23.8: no attack starts; a
  // committed telegraph is cancelled, so the Warding Bell can save the party).
  function cancelTelegraph(e, tick, reason) {
    if (!e.telegraph) return;
    const pt = !!e.telegraph.playerTargeted;
    e.telegraph = null;
    if (e.mode === 'emerging') e.mode = 'burrowed';
    events.emit(tick, 'telegraph_cancel', { id: e.id, etype: e.kind, reason, playerTargeted: pt });
  }
  const ctx = {
    registry,
    events,
    combat,
    rng,
    getTick,
    queueImpact,
    TICK_HZ,
    movement: { walkStep, sweptStep, sweptContact, innerBounds },
    status: statusMod,
    governor,
    nearestTarget: (e) => nearestTarget(e),
    face: (e, dx, dz) => face(e, dx, dz),
    speedMul: (e, tick) => statusMod.speedMul(e, tick),
    stunned: (e, tick) => statusMod.isStunned(e, tick),
    stepLen: (e, unitsPerSec, tick) => unitsPerSec * TICK_DT * statusMod.speedMul(e, tick),
    dmg: (e, base) => base * (e.dmgMul ?? 1),
    startTelegraph,
    endTelegraph,
    strike: (e, targets, base, fx, fz, opts) => strike(ctx, e, targets, base, fx, fz, opts),
    spawnGlob: (e, tick, o) => spawnGlob(e, tick, o),
  };

  function spawn(etype, x = 0, z = 0, wave = -1, opts = null) {
    const A = ARCHETYPES[etype] ?? null;
    const S = ENEMY_STATS[etype] ?? (A ? A.stats : null);
    if (!S) return null;
    const tick = getTick();
    if (spawnGate && !spawnGate()) {
      events.emit(tick, "spawn_blocked", { etype, x: r2(x), z: r2(z), wave });
      return null;
    }
    const elite = !!(opts && opts.elite);
    const hpMul = (opts && opts.hpMul > 0 ? opts.hpMul : 1) * (elite ? ELITE.hpMul : 1);
    const dmgMul = (opts && opts.dmgMul > 0 ? opts.dmgMul : 1) * (elite ? ELITE.dmgMul : 1);
    const radius = elite ? S.radius * ELITE.scale : S.radius;
    const { mx, mz } = innerBounds(radius);
    const sx = Math.min(mx, Math.max(-mx, x));
    const sz = Math.min(mz, Math.max(-mz, z));
    // Initial facing: into the arena (spawns sit on the edge ring).
    const inLen = Math.hypot(sx, sz) || 1;
    const hp = hpMul === 1 ? S.hp : S.hp * hpMul;
    const e = registry.spawn({
      kind: etype,
      faction: 'hostile',
      hittable: true,
      knockbackable: true, // §9 #3: non-boss enemies take knockback
      hp,
      maxHp: hp,
      radius,
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
      dmgMul,
      elite,
      scale: elite ? ELITE.scale : 1,
    });
    if (A) A.spawn(ctx, e, tick);
    events.emit(tick, 'enemy_spawn', {
      id: e.id,
      etype,
      x: r2(sx),
      z: r2(sz),
      wave,
      ...(elite ? { elite: true } : {}),
      ...(hpMul !== 1 ? { hp: r2(hp) } : {}),
    });
    if (elite) events.emit(tick, 'elite_spawn', { id: e.id, etype, x: r2(sx), z: r2(sz) });
    return e;
  }

  // PLAN §3.6: difficulty applies through here (the wave director and the
  // boss's add phases call it with data/difficulty.js numbers).
  function spawnScaled(etype, x, z, { hpMul = 1, dmgMul = 1, elite = false, wave = -1 } = {}) {
    return spawn(etype, x, z, wave, { hpMul, dmgMul, elite });
  }

  // Nearest living party-faction body (player, future sim allies, and the
  // Waystone in defend rooms). Downed (hp <= 0) bodies are outside the set.
  function nearestTarget(e) {
    // PARTY (BUILD_BRIEF §25.2): a live taunt overrides the nearest-target
    // rule (and the defend room's objective-inclusive set) while its source
    // stands — interposition by force. The §11 governor is untouched.
    const ts = statusMod.tauntSource(e, getTick());
    if (ts !== null) {
      const src = registry.byId(ts);
      if (src && src.hp > 0 && src.faction === 'party') return src;
    }
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
      // Heavy bodies take a fraction of every impulse (Barrow Ram x0.3): an
      // impulse armed last discrete phase is still at its full tick count here.
      if (e.kbScale !== undefined && e.kbTicks === KNOCKBACK.durationTicks) {
        e.kbVx *= e.kbScale;
        e.kbVz *= e.kbScale;
      }
      const A = ARCHETYPES[e.kind];
      if (A) {
        A.continuous(ctx, e, tick);
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
      // Statuses (slow / stun) scale the steering step; exactly x1 without one.
      const sm = e.status ? statusMod.speedMul(e, tick) : 1;
      const step = sm === 1 ? S.moveSpeed * TICK_DT : S.moveSpeed * TICK_DT * sm;

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
      // Underground / rolling / diving bodies keep their committed path.
      if (a.burrowed || a.mode === 'charge' || a.mode === 'swoop') continue;
      for (let j = 0; j < all.length; j++) {
        if (i === j) continue;
        const b = all[j];
        const bSolid = (isEnemyKind(b.kind) && b.state === 'active' && !b.burrowed) || b.kind === 'waystone';
        if (!bSolid) continue;
        if (!!a.flier !== !!b.flier) continue; // fliers only jostle fliers
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
    stepGlobs(tick);
    stepSlicks(tick);
  }

  function retreatMove(e, tick) {
    if (tick >= e.despawnTick) {
      events.emit(tick, 'enemy_despawn', { id: e.id, etype: e.kind, cause: 'retreat' });
      registry.despawn(e.id);
      return;
    }
    // (M4a minimal fix: an archetype's stats live on its module, not in
    // ENEMY_STATS — a retreating Ram / Mole crashed the tick.)
    const S = enemyStats(e.kind) ?? ENEMY_STATS.boar;
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
        // Party bodies, and neutral breakables (kegs, puffcaps) — a stray shot
        // can pop a keg. Collider-owning blockers are met through their collider.
        if (!t.hittable || !(t.hp > 0) || t.collider) continue;
        if (t.faction !== 'party' && t.faction !== 'neutral') continue;
        const ct = circleContactT(p.x, p.z, dx, dz, t.x, t.z, p.radius + t.radius);
        if (ct < tHit) {
          tHit = ct;
          victim = t;
        }
      }
      const tWall = sweptContactT(p.x, p.z, dx, dz, p.radius);
      // Entity-owned blockers (barricades, rubble) stop a shot where it meets
      // them; a barricade takes the hit (M4b, PLAN §3.6 (g)).
      const block = dynamicColliders().length > 0 ? sweptDynamicContact(p.x, p.z, dx, dz, p.radius) : null;
      if (block && block.t <= 1 && block.t < tWall && !(victim && tHit <= block.t)) {
        p.x += dx * block.t;
        p.z += dz * block.t;
        p.traveled += Math.hypot(dx, dz) * block.t;
        events.emit(tick, 'eshot_despawn', { id: p.id, cause: 'blocked', blocker: block.entityId });
        registry.despawn(p.id);
        const blocker = block.entityId != null ? registry.byId(block.entityId) : null;
        if (blocker && blocker.hp > 0) queueImpact(tick, p, blocker);
        continue;
      }
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

  // --- Mire Toad globs (kind 'eglob'): lobbed, so they fly over blockers and
  // land even if the thrower dies. The Ember ring at the landing point is the
  // glob's own telegraph (plain data on the glob).
  function spawnGlob(owner, tick, o) {
    const g = registry.spawn({
      kind: 'eglob',
      faction: 'hostile',
      ownerId: owner.id,
      ownerKind: owner.kind,
      x: owner.x,
      z: owner.z,
      px: owner.x,
      pz: owner.z,
      radius: 0.12, // the glob body in flight (render + probes; never collides)
      fromX: owner.x,
      fromZ: owner.z,
      tx: o.tx,
      tz: o.tz,
      startTick: tick,
      landTick: tick + o.flightTicks,
      blastRadius: o.radius,
      power: o.power,
      slickRadius: o.slickRadius,
      slickTicks: o.slickTicks,
      slickSlow: o.slickSlow,
      telegraph: {
        kind: 'ring',
        startTick: tick,
        resolveTick: tick + o.flightTicks,
        x: o.tx,
        z: o.tz,
        fromX: owner.x,
        fromZ: owner.z,
        dirX: 0,
        dirZ: 1,
        radius: o.radius,
        playerTargeted: !!o.playerTargeted,
        targetId: o.targetId ?? null,
      },
    });
    if (o.playerTargeted) governor.noteStart(tick);
    events.emit(tick, 'telegraph_start', {
      id: g.id,
      etype: 'eglob',
      shape: 'ring',
      owner: owner.id,
      target: o.targetId ?? null,
      x: r2(o.tx),
      z: r2(o.tz),
      resolveTick: g.landTick,
      playerTargeted: !!o.playerTargeted,
    });
    events.emit(tick, 'enemy_lob', {
      id: owner.id,
      glob: g.id,
      x: r2(owner.x),
      z: r2(owner.z),
      tx: r2(o.tx),
      tz: r2(o.tz),
      landTick: g.landTick,
    });
    return g;
  }

  function stepGlobs(tick) {
    for (const g of registry.all()) {
      if (g.kind !== 'eglob') continue;
      const span = Math.max(1, g.landTick - g.startTick);
      const u = Math.min(1, Math.max(0, (tick - g.startTick) / span));
      g.x = g.fromX + (g.tx - g.fromX) * u;
      g.z = g.fromZ + (g.tz - g.fromZ) * u;
    }
  }

  function landGlob(g, tick) {
    const victims = partyInRadius(registry, g.tx, g.tz, g.blastRadius);
    const props = neutralsInRadius(registry, g.tx, g.tz, g.blastRadius);
    const owner = registry.byId(g.ownerId);
    const pt = !!(g.telegraph && g.telegraph.playerTargeted);
    g.telegraph = null;
    events.emit(tick, 'telegraph_resolve', { id: g.id, playerTargeted: pt });
    events.emit(tick, 'enemy_glob_land', {
      id: g.id,
      owner: g.ownerId,
      x: r2(g.tx),
      z: r2(g.tz),
      radius: g.blastRadius,
      victims: victims.length,
    });
    registry.despawn(g.id);
    const src = owner ?? { id: g.ownerId, kind: g.ownerKind, faceX: 0, faceZ: 1 };
    strike(ctx, src, victims.concat(props), g.power, g.tx, g.tz, { delivery: 'skill', shape: 'ring' });
    const slick = registry.spawn({
      kind: 'slick',
      faction: 'neutral',
      x: g.tx,
      z: g.tz,
      px: g.tx,
      pz: g.tz,
      radius: g.slickRadius,
      slow: g.slickSlow,
      startTick: tick,
      untilTick: tick + g.slickTicks,
      ownerId: g.ownerId,
    });
    events.emit(tick, 'slick_spawn', { id: slick.id, x: r2(g.tx), z: r2(g.tz), radius: g.slickRadius, untilTick: slick.untilTick });
  }

  // Slicks slow PARTY bodies standing in them (30%, §23.5); fliers never land.
  // The slow is refreshed in short leases so it lapses ~0.1 s after leaving.
  function stepSlicks(tick) {
    for (const s of registry.all()) {
      if (s.kind !== 'slick') continue;
      if (tick >= s.untilTick) {
        events.emit(tick, 'slick_expire', { id: s.id });
        registry.despawn(s.id);
        continue;
      }
      for (const t of registry.all()) {
        if (t.partyIndex === undefined || !(t.hp > 0) || t.flier) continue;
        if (Math.hypot(t.x - s.x, t.z - s.z) > s.radius) continue;
        const cur = t.status && t.status.slow;
        if (cur && cur.untilTick >= tick + 4 && cur.mag >= s.slow) continue;
        statusMod.apply(t, 'slow', s.slow, 8, tick, s.id);
      }
    }
  }

  // --------------------------------------------------------- discrete phase --
  // Enemy resolutions in ascending spawn-ordinal order (§4 ②; registry
  // iteration order IS ordinal order).
  function resolveAll() {
    const tick = getTick();
    for (const e of registry.all()) {
      if (e.kind === 'eglob') {
        if (registry.byId(e.id) && tick >= e.landTick) landGlob(e, tick);
        continue;
      }
      if (!isEnemyKind(e.kind) || e.state !== 'active' || !registry.byId(e.id)) continue;
      // Stun (§23.8): no attack starts, and a live wind-up is interrupted.
      if (e.status && statusMod.isStunned(e, tick)) {
        cancelTelegraph(e, tick, 'stun');
        continue;
      }
      const A = ARCHETYPES[e.kind];
      if (A) {
        A.resolve(ctx, e, tick);
        continue;
      }
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
            combat.applyDamage(target, e.dmgMul && e.dmgMul !== 1 ? S.contactDamage * e.dmgMul : S.contactDamage, {
              delivery: 'contact',
              shape: 'contact', // a bite, not a §6 arc — no melee hitstop
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
            power: e.dmgMul && e.dmgMul !== 1 ? S.shotDamage * e.dmgMul : S.shotDamage, // §11 shot 10
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
    if (e.guard) e.guard.active = false;
    if (ARCHETYPES[e.kind]) e.mode = 'retreat';
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
      if (e.kind === 'eglob' || e.kind === 'slick') {
        events.emit(tick, e.kind === 'eglob' ? 'eglob_despawn' : 'slick_expire', { id: e.id, cause: 'room_clear' });
        registry.despawn(e.id);
        continue;
      }
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
      if (isEnemyKind(e.kind) || e.kind === 'eshot' || e.kind === 'waystone' || e.kind === 'eglob' || e.kind === 'slick') {
        events.emit(tick, 'enemy_despawn', { id: e.id, etype: e.kind, cause: 'reset' });
        registry.despawn(e.id);
      }
    }
  }

  const debugSpawn = (etype, x, z, opts = null) => {
    const e = spawn(etype, x, z, -1, opts);
    return e ? e.id : null;
  };

  // Debug: force a mole under / out of the ground (PLAN §6.4 `burrow(id, on)`).
  function setBurrow(id, on) {
    const e = registry.byId(id);
    if (!e || e.kind !== 'mole' || e.state !== 'active') return null;
    const tick = getTick();
    if (e.telegraph) cancelTelegraph(e, tick, 'debug');
    if (on) mole.burrow(ctx, e, tick, 'debug');
    else mole.surface(ctx, e, tick);
    return { id, burrowed: !!e.burrowed, hittable: !!e.hittable, mode: e.mode };
  }

  // Save contract (PLAN §3.4): the only private state is the governor's last
  // start tick — every enemy, glob and slick is registry data.
  function serialize() {
    return { lastPlayerTelegraphStart };
  }
  function restore(data) {
    lastPlayerTelegraphStart =
      data && Number.isFinite(data.lastPlayerTelegraphStart) ? data.lastPlayerTelegraphStart : -100000;
  }

  return {
    spawn,
    spawnScaled,
    hasType: (etype) => !!(ENEMY_STATS[etype] || ARCHETYPES[etype]),
    isEnemyKind,
    governor,
    setBurrow,
    serialize,
    restore,
    // Save system (PLAN §3.4, M2): serialize() is already the complete state.
    saveState: serialize,
    loadState: restore,
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
