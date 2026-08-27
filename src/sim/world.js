// Sim root (§4). Each tick runs two phases:
//   1. CONTINUOUS — apply move/aim/held states, advance dashes and
//      projectiles (channels, zone clocks as those blocks land).
//   2. DISCRETE — resolve accepted discrete actions in the binding total order:
//      ① deferred maturations, ascending spawn ordinal of the carrying entity
//      ② actor resolutions: party by party_index 0-3, then enemies by spawn
//        ordinal; per actor: targeting/party commands (never suppressed), then
//        dodge (same-tick dodge beats skill/basic fires, §5), then skills
//        ascending slot, then basic-attack fire (slot 4)
//      ③ technique continuations, depth-first after their triggering impact
//      ④ persistent-zone scheduled ticks, ascending zone spawn ordinal
// The ordering skeleton is real; ①③④ are live queues that later blocks feed.
//
// This block: the PLAYER (Healer, party_index 0) is fully playable per §5/§7 —
// 8-dir instant movement, mouse aim, dodge roll with swept wall collision
// (wall contact terminates the dash, no slide), and the hold-to-repeat basic
// bolt (5.2 u/s projectile, 0.5 s interval, 5.0 u range, first shot immediate).
// The deterministic wisp HARNESS from the sim-core block survives behind the
// `harness` option (on for ?scene=simtest, off in the game scenes).
//
// Sim discipline (binding): no DOM access, no render imports, no wall-clock —
// integer tick counts and the seeded stream only.
import {
  TICK_HZ,
  DODGE,
  CRIT,
  DUMMY,
  HEALER,
  ARENA,
  HARNESS,
} from '../core/constants.js';
import { DENIAL } from '../core/intents.js';
import { innerBounds, walkStep, sweptStep } from './movement.js';
import { createProjectileSystem } from './projectiles.js';
import { createCombat } from './combat.js';

const TICK_DT = 1 / TICK_HZ; // seconds per tick, for u/s -> u/tick
const r2 = (v) => Math.round(v * 100) / 100;

export function createWorld({ rng, registry, events, harness = true, requestHitstop = null }) {
  let currentTick = 0;

  // ① deferred maturations: { carrierOrdinal, resolve() } — sorted by carrier
  // spawn ordinal each tick. Delayed Echo recasts land here in later blocks.
  let deferred = [];
  // ③ technique continuations — depth-first queue (Bounce hops, Detonate
  // bursts). Populated by the build-system block; drained in order here.
  const continuations = [];

  // Cumulative pipeline counters (debug API: __echoes.stats) — lets a 200-hit
  // crit-frequency audit outlive the 200-event ring buffer.
  const stats = { hits: 0, crits: 0, immune: 0, heals: 0, healCrits: 0, kills: 0 };

  // §5/§9: i-framed targets produce no instance at all. The player is i-framed
  // for the dash's full travel window; test targets get a debug window via
  // cmd('iframe', id, ticks).
  function isIframed(e) {
    if (e === player && player.dashTicksLeft > 0) return true;
    return (e.iframeUntilTick ?? 0) > currentTick;
  }

  const combat = createCombat({
    registry,
    events,
    rng,
    stats,
    getTick: () => currentTick,
    requestHitstop,
    isIframed,
  });

  // Projectile impacts are §4 ① deferred maturations: detected in the
  // continuous phase, resolved same-tick in the discrete phase by ascending
  // carrier (bolt) spawn ordinal. Knockback direction = flight direction.
  function queueImpact(tick, bolt, target) {
    const len = Math.hypot(bolt.vx, bolt.vz);
    const dirX = len > 1e-9 ? bolt.vx / len : 0;
    const dirZ = len > 1e-9 ? bolt.vz / len : 0;
    const targetId = target.id;
    const { power, delivery } = bolt;
    deferred.push({
      carrierOrdinal: bolt.id,
      resolve: () => {
        const t = registry.byId(targetId);
        if (!t) return; // died to an earlier same-tick maturation
        combat.applyDamage(t, power, { delivery, dirX, dirZ });
      },
    });
  }

  const projectiles = createProjectileSystem({ registry, events, onImpact: queueImpact });

  // --- Player (Healer, party_index 0, party anchor). §5 movement/dodge,
  // §7 basic geometry: projectile 5.2 u/s, range 5.0, interval 0.5 s.
  const player = registry.spawn({
    kind: 'player',
    partyIndex: 0,
    faction: 'party',
    hp: HEALER.maxHp,
    maxHp: HEALER.maxHp,
    knockbackable: false, // §9/A5: party members are never knocked back
    x: 0,
    z: 0,
    px: 0,
    pz: 0,
    radius: HEALER.radius,
    facing: { x: 1, z: 0 }, // last nonzero move direction
    aim: null, // latest aim (world pos)
    lastAimDir: { x: 1, z: 0 }, // §6: aim exactly on caster reuses last valid aim
    dashTicksLeft: 0,
    dashVel: { x: 0, z: 0 }, // u per tick, locked at activation (§5)
    dodgeReadyTick: 0,
    nextBasicTick: 0, // earliest tick the held basic may fire again
    skills: [null, null, null, null], // empty until the draft block
  });
  events.emit(0, 'spawn', { id: player.id, kind: 'player' });

  // --- Harness wisps (sim-core proving population; ?scene=simtest only).
  function spawnWisp(x, z) {
    // Draw order is fixed: (position x, position z if not given), angle,
    // attack stagger — determinism depends on this order never changing.
    const sx = x ?? rng.range(-ARENA.halfW + HARNESS.spawnMargin, ARENA.halfW - HARNESS.spawnMargin);
    const sz = z ?? rng.range(-ARENA.halfD + HARNESS.spawnMargin, ARENA.halfD - HARNESS.spawnMargin);
    const angle = rng.range(0, Math.PI * 2);
    const speed = HARNESS.moveSpeed * TICK_DT;
    const wisp = registry.spawn({
      kind: 'wisp',
      x: sx,
      z: sz,
      px: sx,
      pz: sz,
      vx: Math.cos(angle) * speed,
      vz: Math.sin(angle) * speed,
      hp: HARNESS.hp,
      maxHp: HARNESS.hp,
      nextAttackTick: currentTick + rng.int(HARNESS.attackCooldownTicks),
    });
    events.emit(currentTick, 'spawn', {
      id: wisp.id,
      kind: 'wisp',
      x: r2(sx),
      z: r2(sz),
    });
    return wisp;
  }

  let maintainPopulation = harness; // killAllEnemies() turns respawn off
  if (harness) {
    for (let i = 0; i < HARNESS.population; i++) spawnWisp();
  }

  function killWisp(wisp) {
    events.emit(currentTick, 'death', { id: wisp.id, kind: 'wisp' });
    registry.despawn(wisp.id);
    if (maintainPopulation) spawnWisp();
  }

  // --- Training dummy (combat-juice proving target; __echoes.cmd('spawn',
  // 'dummy', x, z)). Static hostile body: hittable by party bolts,
  // knockbackable (non-boss), full §9 pipeline + juice on hit/kill.
  function spawnDummy(x = 2, z = 0) {
    const { mx, mz } = innerBounds(DUMMY.radius);
    const sx = Math.min(mx, Math.max(-mx, x));
    const sz = Math.min(mz, Math.max(-mz, z));
    const d = registry.spawn({
      kind: 'dummy',
      faction: 'hostile',
      hittable: true,
      knockbackable: true,
      x: sx,
      z: sz,
      px: sx,
      pz: sz,
      radius: DUMMY.radius,
      hp: DUMMY.hp,
      maxHp: DUMMY.hp,
      kbVx: 0,
      kbVz: 0,
      kbTicks: 0,
      iframeUntilTick: 0,
    });
    events.emit(currentTick, 'spawn', { id: d.id, kind: 'dummy', x: r2(sx), z: r2(sz) });
    return d;
  }

  function firstDummy() {
    for (const e of registry.all()) if (e.kind === 'dummy') return e;
    return null;
  }

  // ---------------------------------------------------------------- phases --

  function continuousPhase(snapshot) {
    // Record previous positions for render interpolation (render lerps
    // px/pz -> x/z by the clock alpha; never mutates sim state).
    for (const e of registry.all()) {
      e.px = e.x;
      e.pz = e.z;
    }

    // Player held states. Dash overrides move for its full travel window;
    // direction and speed were locked at activation (§5). Wall contact
    // terminates the dash at the contact point — swept, no slide.
    if (snapshot.aim) player.aim = snapshot.aim;
    if (player.dashTicksLeft > 0) {
      const { hit } = sweptStep(player, player.dashVel.x, player.dashVel.z, player.radius);
      player.dashTicksLeft -= 1;
      if (hit) player.dashTicksLeft = 0;
      if (player.dashTicksLeft === 0) endDash(hit ? 'wall' : 'complete', snapshot);
    } else {
      const { x, z } = snapshot.move;
      if (x !== 0 || z !== 0) {
        // §5: velocity = dir * move_speed, instant (no ramp). Walking slides
        // along walls; only the dash hard-stops.
        walkStep(player, x * HEALER.moveSpeed * TICK_DT, z * HEALER.moveSpeed * TICK_DT, player.radius);
        player.facing = { x, z };
      }
    }

    // §9 #3 knockback displacement: impulse away from the hit over kbTicks,
    // swept vs walls (no slide — wall contact ends the impulse). Runs before
    // projectiles so bolts sweep against final positions this tick.
    for (const e of registry.all()) {
      if (!(e.kbTicks > 0)) continue;
      const { hit } = sweptStep(e, e.kbVx, e.kbVz, e.radius);
      e.kbTicks -= 1;
      if (hit) e.kbTicks = 0;
    }

    // Projectiles advance (swept) after actors.
    projectiles.step(currentTick);

    // Wisp drift (velocity applied; decisions happen in their resolution).
    for (const e of registry.all()) {
      if (e.kind !== 'wisp') continue;
      e.x += e.vx;
      e.z += e.vz;
      bounceOffWalls(e);
    }
  }

  function endDash(cause, snapshot) {
    events.emit(currentTick, 'dash_end', { cause });
    // §5: after the dash, a still-held basic attack restarts its FULL
    // interval (hard reset) — never a queued instant shot.
    if (snapshot.basicAttackHeld) {
      player.nextBasicTick = currentTick + HEALER.attackIntervalTicks;
    }
  }

  function bounceOffWalls(e) {
    const mx = ARENA.halfW - ARENA.wallMargin;
    const mz = ARENA.halfD - ARENA.wallMargin;
    if ((e.x < -mx && e.vx < 0) || (e.x > mx && e.vx > 0)) e.vx = -e.vx;
    if ((e.z < -mz && e.vz < 0) || (e.z > mz && e.vz > 0)) e.vz = -e.vz;
    e.x = Math.min(mx, Math.max(-mx, e.x));
    e.z = Math.min(mz, Math.max(-mz, e.z));
  }

  function discretePhase(snapshot) {
    // ① deferred maturations, ascending carrier spawn ordinal.
    if (deferred.length > 0) {
      const batch = deferred.sort((a, b) => a.carrierOrdinal - b.carrierOrdinal);
      deferred = [];
      for (const d of batch) {
        d.resolve();
        drainContinuations(); // ③ nests depth-first after its trigger
      }
    }

    // ② actor resolutions: party by party_index (player = 0), then enemies by
    // ascending spawn ordinal.
    resolvePlayer(snapshot);
    for (const e of registry.all()) {
      if (e.kind === 'wisp' && registry.byId(e.id)) resolveWisp(e);
    }

    // ④ persistent-zone scheduled ticks land here (zones block).
  }

  function drainContinuations() {
    while (continuations.length > 0) continuations.shift().resolve();
  }

  // --- Player intent resolution. Presses arrive in press order but resolve in
  // the §4 per-actor order: targeting/party commands (never suppressed) ->
  // dodge -> skills ascending slot -> basic fire. One discrete intent of each
  // kind per tick; duplicates denied (no queue, no refund).
  function resolvePlayer(snapshot) {
    const accepted = new Map(); // kind -> press (first of each kind)
    for (const press of snapshot.presses) {
      if (accepted.has(press.kind)) {
        deny(press.kind, DENIAL.duplicateInTick);
      } else {
        accepted.set(press.kind, press);
      }
    }

    // Targeting / party commands first — never suppressed (§4/§5). Targets and
    // allies don't exist yet, so they resolve as accepted no-ops.
    for (const kind of ['target_cycle', 'target_select', 'rally']) {
      const press = accepted.get(kind);
      if (!press) continue;
      const detail = kind === 'target_select' ? { index: press.index } : {};
      events.emit(currentTick, 'intent', { kind, ...detail });
    }

    // Dodge — own timer, outside the skill pipeline; same-tick dodge beats
    // skill and basic fires (§5).
    if (accepted.has('dodge')) {
      if (currentTick < player.dodgeReadyTick) {
        deny('dodge', DENIAL.onCooldown);
      } else {
        startDash(snapshot);
        events.emit(currentTick, 'intent', { kind: 'dodge' });
      }
    }

    // Skills ascending slot 0-3. During a dash all skill/basic fires are
    // suppressed (§5); otherwise every slot is empty until the draft block.
    for (let slot = 0; slot < 4; slot++) {
      const kind = `skill_${slot + 1}`;
      if (!accepted.has(kind)) continue;
      if (player.dashTicksLeft > 0) {
        deny(kind, DENIAL.prioritySuppressed);
      } else if (player.skills[slot] === null) {
        deny(kind, DENIAL.emptySlot);
      }
      // (a real skill fire lands with the skills block)
    }

    // Basic-attack fire (slot 4).
    resolveBasic(snapshot);
  }

  // §5/§7 basic attack: free, hold-to-repeat at attack_interval, first shot
  // immediate on press (nextBasicTick starts in the past), rate never exceeds
  // the interval. During a dash a due fire is suppressed (priority_suppressed,
  // §5) and re-armed — one denial per attempt, no queue, no refund.
  function resolveBasic(snapshot) {
    if (!snapshot.basicAttackHeld) return;
    if (currentTick < player.nextBasicTick) return;
    if (player.dashTicksLeft > 0) {
      deny('basic_attack', DENIAL.prioritySuppressed);
      player.nextBasicTick = currentTick + HEALER.attackIntervalTicks;
      return;
    }
    const dir = aimDirection();
    projectiles.spawn(currentTick, {
      x: player.x,
      z: player.z,
      dirX: dir.x,
      dirZ: dir.z,
      speed: HEALER.basicSpeed,
      range: HEALER.basicRange,
      radius: HEALER.boltRadius,
      power: HEALER.basicPower,
      delivery: 'basic',
      faction: player.faction,
    });
    events.emit(currentTick, 'basic_fire', {
      x: r2(player.x),
      z: r2(player.z),
      dx: r2(dir.x),
      dz: r2(dir.z),
    });
    player.nextBasicTick = currentTick + HEALER.attackIntervalTicks;
  }

  // Unit direction from player toward the cursor. §6: aim exactly on the
  // caster (degenerate) reuses the last valid aim direction.
  function aimDirection() {
    if (player.aim) {
      const ax = player.aim.x - player.x;
      const az = player.aim.z - player.z;
      const len = Math.hypot(ax, az);
      if (len > 1e-4) {
        player.lastAimDir = { x: ax / len, z: az / len };
        return player.lastAimDir;
      }
    }
    return player.lastAimDir;
  }

  function deny(kind, reason) {
    events.emit(currentTick, 'intent_denied', { kind, reason });
  }

  function startDash(snapshot) {
    // Direction = this tick's move vector; if zero, dash toward aim; if aim is
    // degenerate, last facing. Locked at activation (§5).
    let dx = 0;
    let dz = 0;
    const move = snapshot.move;
    if (move.x !== 0 || move.z !== 0) {
      dx = move.x;
      dz = move.z;
    } else if (player.aim) {
      const ax = player.aim.x - player.x;
      const az = player.aim.z - player.z;
      const len = Math.hypot(ax, az);
      if (len > 1e-6) {
        dx = ax / len;
        dz = az / len;
      }
    }
    if (dx === 0 && dz === 0) {
      dx = player.facing.x;
      dz = player.facing.z;
    }
    const perTick = DODGE.distance / DODGE.durationTicks;
    player.dashVel = { x: dx * perTick, z: dz * perTick };
    player.dashTicksLeft = DODGE.durationTicks;
    player.dodgeReadyTick = currentTick + DODGE.cooldownTicks;
  }

  // --- Wisp resolution: one heading-jitter roll per tick (keeps the draw
  // index visibly tick-locked), plus an attack roll on cadence. All draws come
  // from the seeded gameplay stream in ascending-ordinal resolution order, so
  // two runs with one seed replay identically.
  function resolveWisp(wisp) {
    const turn = rng.range(-HARNESS.headingJitterRad, HARNESS.headingJitterRad);
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const vx = wisp.vx * cos - wisp.vz * sin;
    const vz = wisp.vx * sin + wisp.vz * cos;
    wisp.vx = vx;
    wisp.vz = vz;

    if (currentTick >= wisp.nextAttackTick) {
      wisp.nextAttackTick = currentTick + HARNESS.attackCooldownTicks;
      const target = nearestOtherWisp(wisp);
      if (target) {
        // §9 instance shape: base -> one crit roll (strict roll < chance) ->
        // final. The full pipeline (heals, clamps, full_heal) lands with the
        // combat block.
        const crit = rng.chance(CRIT.chance);
        const amount = crit ? HARNESS.damage * CRIT.mult : HARNESS.damage;
        target.hp -= amount;
        events.emit(currentTick, 'hit', {
          attacker: wisp.id,
          target: target.id,
          amount,
          crit,
        });
        if (target.hp <= 0) killWisp(target);
      }
    }
  }

  // Nearest living other wisp in range; distance ties break by ascending spawn
  // ordinal (§1 universal tiebreak — strict `<` over an ascending scan).
  function nearestOtherWisp(self) {
    let best = null;
    let bestD2 = HARNESS.attackRange * HARNESS.attackRange;
    for (const e of registry.all()) {
      if (e.kind !== 'wisp' || e.id === self.id || e.hp <= 0) continue;
      const dx = e.x - self.x;
      const dz = e.z - self.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ step --

  function step(tick, snapshot) {
    currentTick = tick;
    continuousPhase(snapshot);
    discretePhase(snapshot);
  }

  // ------------------------------------------- debug API (docs/TESTING.md) --

  function snapshotState() {
    return {
      tick: currentTick,
      seed: rng.seed,
      rngDraws: rng.drawIndex,
      room: null, // run/room blocks
      wallet: null, // glint block
      stats: { ...stats },
      party: [
        {
          id: player.id,
          kind: player.kind,
          hp: player.hp,
          maxHp: player.maxHp,
          x: player.x,
          z: player.z,
          aim: player.aim,
          dashTicksLeft: player.dashTicksLeft,
          dodgeReadyTick: player.dodgeReadyTick,
          nextBasicTick: player.nextBasicTick,
        },
      ],
      projectiles: registry
        .all()
        .filter((e) => e.kind === 'bolt')
        .map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), traveled: r2(e.traveled) })),
      enemies: registry
        .all()
        .filter((e) => e.kind === 'wisp' || e.kind === 'dummy')
        .map((e) => ({
          id: e.id,
          kind: e.kind,
          x: r2(e.x),
          z: r2(e.z),
          hp: e.hp,
          kbTicks: e.kbTicks ?? 0,
          iframed: (e.iframeUntilTick ?? 0) > currentTick,
        })),
    };
  }

  function cmd(name, ...args) {
    switch (name) {
      case 'spawn': {
        const [type, x, z] = args; // ('dummy'|'wisp', x, z)
        // Wisps exist only in the simtest harness (they have no game-scene
        // visuals); game scenes get combat-juice training dummies.
        if (type === 'wisp' && harness) return spawnWisp(x, z).id;
        if (type === 'dummy' || !harness) return spawnDummy(x, z).id;
        return spawnWisp(x, z).id;
      }
      case 'teleport': {
        const [x, z] = args;
        const { mx, mz } = innerBounds(player.radius);
        player.x = Math.min(mx, Math.max(-mx, x));
        player.z = Math.min(mz, Math.max(-mz, z));
        player.px = player.x;
        player.pz = player.z;
        return { x: player.x, z: player.z };
      }
      case 'setHp': {
        const [id, pct] = args;
        const e = registry.byId(id);
        if (!e || e.maxHp === undefined) return null;
        e.hp = e.maxHp * pct;
        if (e.hp <= 0) {
          if (e.kind === 'wisp') killWisp(e);
          else if (e.kind === 'dummy') combat.kill(e); // full kill juice
        }
        return e.hp;
      }
      case 'killAllEnemies': {
        maintainPopulation = false;
        const hostiles = registry.all().filter((e) => e.kind === 'wisp' || e.kind === 'dummy');
        for (const h of hostiles) {
          if (h.kind === 'wisp') killWisp(h);
          else combat.kill(h);
        }
        return hostiles.length;
      }
      // --- Combat-juice test commands (docs/TESTING.md: cmd surface grows
      // with each block). All of them go through the REAL §9 pipeline.
      case 'iframe': {
        // Debug i-frame window on any entity: hits during it produce zero
        // instance (no roll, no number/flash/HP change) + a hit_immune event.
        const [id, ticks = 60] = args;
        const e = registry.byId(id);
        if (!e) return null;
        e.iframeUntilTick = currentTick + ticks;
        return e.iframeUntilTick;
      }
      case 'hitOnce': {
        // One basic-power damage instance on a dummy (default: first dummy)
        // or on the PLAYER (pass the player id — drives the integrated rig's
        // hurt clip / §10 downed), through combat.applyDamage — real crit
        // roll, knockback (party exempt per A5), juice.
        const [id] = args;
        const t = id != null ? registry.byId(id) : firstDummy();
        if (!t || (t.kind !== 'dummy' && t.kind !== 'player')) return null;
        const len = Math.hypot(t.x - player.x, t.z - player.z);
        const dirX = len > 1e-6 ? (t.x - player.x) / len : 1;
        const dirZ = len > 1e-6 ? (t.z - player.z) / len : 0;
        return combat.applyDamage(t, HEALER.basicPower, { delivery: 'basic', dirX, dirZ });
      }
      case 'critTest': {
        // N pipeline hits on one dummy (topped up before each hit so it never
        // dies) — every hit draws a real seeded crit roll. Summary lands in
        // the event ring so __echoes.events can be checked after the fact.
        const [n = 200] = args;
        const t = firstDummy() ?? spawnDummy();
        let hits = 0;
        let crits = 0;
        for (let i = 0; i < n; i++) {
          t.hp = t.maxHp; // top-up outside the pipeline (no heal roll)
          const r = combat.applyDamage(t, HEALER.basicPower, { delivery: 'basic', dirX: 1, dirZ: 0 });
          if (!r || r.immune) continue;
          hits += 1;
          if (r.crit) crits += 1;
        }
        const summary = { hits, crits, rate: hits > 0 ? r2(crits / hits) : 0 };
        events.emit(currentTick, 'crit_test', summary);
        return summary;
      }
      case 'heal': {
        // One heal instance through the pipeline (crit roll, clamp,
        // full_heal). Default target: the player; default power: Swift Mend
        // (§7, power 14).
        const [id, amount = 14] = args;
        const t = registry.byId(id ?? player.id);
        return combat.applyHeal(t, amount);
      }
      default:
        console.warn(`__echoes.cmd('${name}') lands with a later block`);
        return null;
    }
  }

  return {
    step,
    cmd,
    player,
    stats,
    entities: () => registry.all(),
    snapshotState,
    get tick() {
      return currentTick;
    },
  };
}
