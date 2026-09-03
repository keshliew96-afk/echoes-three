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
import { createEnemySystem } from './enemies.js';
import { createWaveDirector } from './waves.js';
import { createSkillSystem, STARTING_SKILLS, PARTY_ALLIES } from './skills.js';
import { createBuildSystem } from './nodes.js';
import { createAllySystem } from './allies.js';
import { createBossSystem } from './boss.js';
import { createRunSystem } from './run.js';

// §10: a Downed character crawls at 0.8 u/s (movement only, cannot act).
const DOWNED_CRAWL_SPEED = 0.8;

const TICK_DT = 1 / TICK_HZ; // seconds per tick, for u/s -> u/tick
const r2 = (v) => Math.round(v * 100) / 100;

export function createWorld({ rng, registry, events, harness = true, requestHitstop = null, room = null }) {
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
    // Run block (§9 #4 x §2): kill hitstop is combat juice, so once a run has
    // been played it is granted only while that run is in live combat — a
    // leaked kill on the end card or in Camp must never stall the sim.
    // runSys is late-bound below; the closure is only ever called at a kill.
    requestHitstop: requestHitstop
      ? (n) => (runSys && !runSys.combatAllowed() ? 0 : requestHitstop(n))
      : null,
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
    hittable: true, // enemy shots sweep vs the player (enemies block)
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

  // --- Sim-side party allies (skills block): static bodies at the arena's
  // idle-critter spots (§7 max_hp rows) so the healer kit has real §8 targets
  // — smart-target fractions, Guardian Bond bottom-2, aura/zone occupancy.
  // The ally-AI block owns movement/kits; until then they stand and take heals.
  for (const spec of PARTY_ALLIES) {
    const ally = registry.spawn({
      kind: 'ally',
      classId: spec.classId,
      partyIndex: spec.partyIndex,
      faction: 'party',
      hittable: true,
      knockbackable: false, // §9/A5: party members are never knocked back
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      x: spec.x,
      z: spec.z,
      px: spec.x,
      pz: spec.z,
      radius: spec.radius,
    });
    events.emit(0, 'spawn', { id: ally.id, kind: 'ally', classId: spec.classId });
  }

  // --- Healer skill kit (skills block, §6–§8). The world keeps the dash /
  // priority rules; the skill system owns slots, cooldowns, delivery shapes,
  // smart-targeting and the F1–F4 heal override. Skill-bolt impacts ride the
  // same §4 ① deferred queue as basic bolts.
  // Build system (nodes block, §15) is created below; the skill system takes
  // its §15.4 resolver through this late-bound hook (identity until it lands).
  let buildSys = null;
  let runSys = null; // run block (§2/§13): late-bound, owns combat_active
  const skillSys = createSkillSystem({
    player,
    registry,
    events,
    combat,
    getTick: () => currentTick,
    isIframed,
    queueDeferred: (carrierOrdinal, resolve) => deferred.push({ carrierOrdinal, resolve }),
    resolve: (def) => (buildSys ? buildSys.resolveDef(def) : def),
  });
  for (const id of STARTING_SKILLS) skillSys.giveSkill(id); // §7 starting kit

  // --- Enemies & waves (enemies block, §11): Thorn Boar / Spitting Mantis AI
  // with the telegraph cadence governor, seeded wave schedules and the
  // kill_all / defend win conditions. All logic lives in sim/enemies.js +
  // sim/waves.js; the world only calls the phase hooks in the §4 total order
  // and routes debug cmds. `?room=kill_all|defend` starts a room at boot.
  const enemies = createEnemySystem({
    registry,
    events,
    rng,
    combat,
    getTick: () => currentTick,
    queueImpact,
  });
  const waves = createWaveDirector({
    registry,
    events,
    rng,
    enemies,
    getTick: () => currentTick,
  });
  if (room === 'kill_all' || room === 'defend') waves.startRoom(room);

  // --- Ally AI, party command verbs and the downed/revive contract (ally
  // block, §7 kits / §8 mark+rally / §10 downed+revive / §12 leash+targeting).
  // The world only calls its three phase hooks in the §4 total order and
  // routes the player-only command intents + debug cmds into it.
  const allySys = createAllySystem({
    player,
    registry,
    events,
    combat,
    rng,
    getTick: () => currentTick,
    getRoomState: () => waves.roomState(),
  });
  events.on('room_cleared', () => allySys.onRoomBoundary('room_clear'));
  events.on('room_start', () => allySys.onRoomBoundary('room_start'));
  events.on('hit', (ev) => allySys.onHit(ev));

  // --- Build system (nodes block, §15): the 8-node pool, sockets/bench, the
  // flat->pct->mult->technique->clamp resolver and the depth-1 technique
  // primitives. Techniques ride the §4 ③ continuation queue; Echo recasts are
  // §4 ① maturations run from buildSys.discrete(). combat_active truth = a
  // live un-cleared wave room (§2: between-rooms only build interaction).
  buildSys = createBuildSystem({
    player,
    registry,
    events,
    combat,
    getTick: () => currentTick,
    isIframed,
    queueDeferred: (carrierOrdinal, resolve) => deferred.push({ carrierOrdinal, resolve }),
    queueContinuation: (fn) => continuations.push({ resolve: fn }),
    getSkillSlots: () => skillSys.slotsView(),
    isCombatActive: () => {
      // §2 "between-rooms only": while a RUN is live the run system owns the
      // combat_active truth (it also covers the boss room and the meta
      // screens); outside a run the standalone `?room=` harness rules.
      if (runSys && runSys.isActive()) return runSys.combatActive();
      const r = waves.roomState();
      return !!(r && !r.cleared);
    },
  });

  // --- Run structure (run block, §2/§13/§14/§16): the 8-room run frame, the
  // room-clear boundary sequence, drafts/path/shop, the Glint wallet, and the
  // room-8 Hollow Stag (sim/boss.js). The world only calls its three phase
  // hooks in the §4 total order and routes the debug cmds.
  const bossSys = createBossSystem({
    registry,
    events,
    rng,
    combat,
    getTick: () => currentTick,
    enemies,
    bus: events,
  });
  runSys = createRunSystem({
    rng,
    registry,
    events,
    getTick: () => currentTick,
    player,
    waves,
    enemies,
    boss: bossSys,
    skillSys,
    buildSys,
    allySys,
    combat,
  });
  events.on('room_cleared', (ev) => runSys.onRoomCleared(ev));
  events.on('defeat', () => runSys.onDefeat());

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
        // along walls; only the dash hard-stops. §10: a Downed player keeps
        // movement only, at the 0.8 u/s crawl.
        const spd = player.hp > 0 ? HEALER.moveSpeed : DOWNED_CRAWL_SPEED;
        walkStep(player, x * spd * TICK_DT, z * spd * TICK_DT, player.radius);
        player.facing = { x, z };
      }
    }

    // Ally AI steering + revive channels (ally block, §10/§12) — party bodies
    // settle before the enemy pass so enemy nearest-target scans and party
    // bolts both sweep against final positions.
    allySys.continuous(snapshot);

    // Enemies (enemies block, §11): steering/retreat + enemy-shot flight —
    // before knockback so displaced bodies still sweep against walls, before
    // projectiles so party bolts sweep against final enemy positions.
    enemies.continuous();

    // Run block (§11 boss): the Hollow Stag steers/lunges with the enemy pass,
    // so its body settles before knockback and projectile sweeps.
    runSys.continuous();

    // §9 #3 knockback displacement: impulse away from the hit over kbTicks,
    // swept vs walls (no slide — wall contact ends the impulse). Runs before
    // projectiles so bolts sweep against final positions this tick.
    for (const e of registry.all()) {
      if (!(e.kbTicks > 0)) continue;
      const { hit } = sweptStep(e, e.kbVx, e.kbVz, e.radius);
      e.kbTicks -= 1;
      if (hit) e.kbTicks = 0;
    }

    // Projectiles advance (swept) after actors. Skill bolts share the phase;
    // Echo-recast bolts (nodes block) fly on the same swept subsystem.
    projectiles.step(currentTick);
    skillSys.step(currentTick);
    buildSys.step(currentTick);

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
    // Delayed Echo recasts mature first (§4 ① — nodes block): direct/nova/arc
    // recasts resolve instantly, projectile recasts spawn echo bolts whose
    // impacts join this tick's deferred batch below.
    buildSys.discrete();
    drainContinuations(); // ③ techniques triggered by instant echo recasts

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
    // ascending spawn ordinal. ③ technique continuations (nodes block: Bounce
    // hops, Siphon, Detonate bursts) nest depth-first right after the actor
    // resolutions that triggered them.
    resolvePlayer(snapshot);
    drainContinuations();
    // ② continued: party_index 1-3 (ally block) — the player's revive-channel
    // arbitration also lands here so it sees the post-dodge state (§5: a
    // same-tick dodge beats a revive-channel start).
    allySys.resolveAll(snapshot);
    drainContinuations();
    for (const e of registry.all()) {
      if (e.kind === 'wisp' && registry.byId(e.id)) resolveWisp(e);
    }
    // ② continued: real enemies (boar bites, mantis telegraph starts/fires)
    // in ascending spawn-ordinal order (enemies block, §11).
    enemies.resolveAll();
    drainContinuations();
    // ② continued: the boss (run block) resolves with the enemy pass.
    runSys.discrete();
    drainContinuations();

    // ④ persistent-zone scheduled ticks, ascending zone spawn ordinal, then
    // the Warding Aura cadence (skills block). Zone/aura heals can carry
    // techniques (Siphon per tick per occupant) — drain ③ after.
    skillSys.zonePhase();
    drainContinuations();

    // ④ continued: ally damage zones (ally block, §7 ground_aoe kit rows),
    // then the §2 defeat rule on live HP so an all-four-down lands its
    // `defeat` event on the exact tick — before the room's clear predicate,
    // which §2 says defeat outranks.
    allySys.endOfTick();
    drainContinuations();

    // Encounter director: spawn-telegraph maturations, wave triggers, and the
    // §11 clear predicates (evaluated end of tick).
    waves.step();
    // Run block: boss add phases + the boss-room clear predicate (end of
    // tick, like every other room predicate) and the transition-fade clock.
    runSys.endOfTick();
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
      if (kind === 'target_select') {
        // §8 heal-target override toggle (F1–F4) — durable, never suppressed.
        const override = skillSys.toggleOverride(press.index);
        events.emit(currentTick, 'intent', { kind, index: press.index, override });
        continue;
      }
      // §8 party-shared enemy mark (Tab) and rally (R) — ally block.
      if (kind === 'target_cycle') {
        events.emit(currentTick, 'intent', { kind, mark: allySys.cycleMark() });
        continue;
      }
      if (kind === 'rally') {
        events.emit(currentTick, 'intent', { kind, rally: allySys.rally() });
        continue;
      }
      events.emit(currentTick, 'intent', { kind });
    }

    // §10: a Downed character cannot act. Targeting/party commands above are
    // never suppressed; dodge, skills and the basic below are.
    if (player.hp <= 0) return;

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

    // Skills ascending slot 0-3 (§4). During a dash all skill/basic fires are
    // suppressed (§5) — the world owns that rule; the skill system owns
    // empty/passive/cooldown denials and the actual §6 instant-cast fire.
    // Same-frame multi-skill presses all fire here, ascending slot.
    for (let slot = 0; slot < 4; slot++) {
      const kind = `skill_${slot + 1}`;
      if (!accepted.has(kind)) continue;
      if (player.dashTicksLeft > 0) {
        deny(kind, DENIAL.prioritySuppressed);
      } else {
        skillSys.tryFire(slot);
      }
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
    // §10: a held attack carried into a revive channel is consumed silently
    // (neither fires nor breaks). A FRESH press still fires here and breaks
    // the channel in the ally block's resolution below.
    if (allySys.basicSuppressed()) return;
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
      room: waves.roomState(), // enemies block (§11 win conditions); null outside rooms
      wallet: runSys.wallet(), // §14 Glint wallet (run block)
      run: runSys.view(), // §2/§13/§16 run frame, phase, reward/path/shop, boss
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
          // §10 downed state + the live revive channel this body is running.
          downed: player.hp <= 0,
          reviving: player.reviveTargetId ?? null,
        },
        // Sim-side allies (skills block): §8 heal targets.
        ...registry
          .all()
          .filter((e) => e.kind === 'ally')
          .map((a) => ({
            id: a.id,
            kind: a.kind,
            classId: a.classId,
            partyIndex: a.partyIndex,
            hp: r2(a.hp),
            maxHp: a.maxHp,
            x: r2(a.x),
            z: r2(a.z),
            // Ally-block AI state (§12) so captures can assert leash/target.
            downed: !!a.downed,
            state: a.aiState ?? null,
            target: a.targetId ?? null,
            reviving: a.reviveTargetId ?? null,
          })),
      ],
      // Ally AI / mark / rally / revive-channel truth (ally block).
      party_ai: allySys.view(),
      // Skill-kit state (skills block): slots/cooldowns, heal override, zones.
      skills: skillSys.slotsView(),
      // Build-system state (nodes block, §15): bench, sockets, resolved stats.
      build: buildSys.view(),
      healOverride: skillSys.getOverride(),
      zones: registry
        .all()
        .filter((e) => e.kind === 'zone')
        .map((z) => ({
          id: z.id,
          skill: z.skill,
          x: r2(z.x),
          z: r2(z.z),
          radius: z.radius,
          ticksDone: z.ticksDone,
          nextTickTick: z.nextTickTick,
        })),
      // Ally kit ground_aoe zones (ally block, §7 Ground Crack / Caltrops /
      // Detonating Charge).
      azones: registry
        .all()
        .filter((e) => e.kind === 'azone')
        .map((z) => ({
          id: z.id,
          skill: z.skill,
          x: r2(z.x),
          z: r2(z.z),
          radius: z.radius,
          ticksDone: z.ticksDone,
          totalTicks: z.totalTicks,
        })),
      skillBolts: registry
        .all()
        .filter((e) => e.kind === 'skillbolt')
        .map((e) => ({
          id: e.id,
          skill: e.skill,
          heal: e.heal,
          x: r2(e.x),
          z: r2(e.z),
          traveled: r2(e.traveled),
        })),
      projectiles: registry
        .all()
        .filter((e) => e.kind === 'bolt')
        .map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), traveled: r2(e.traveled) })),
      enemies: registry
        .all()
        .filter(
          (e) => e.kind === 'wisp' || e.kind === 'dummy' || e.kind === 'boar' || e.kind === 'mantis'
        )
        .map((e) => ({
          id: e.id,
          kind: e.kind,
          x: r2(e.x),
          z: r2(e.z),
          hp: e.hp,
          kbTicks: e.kbTicks ?? 0,
          iframed: (e.iframeUntilTick ?? 0) > currentTick,
          // Enemies-block fields (undefined on wisp/dummy, dropped by JSON):
          state: e.state,
          targetId: e.targetId ?? undefined,
          telegraph: e.telegraph
            ? { x: r2(e.telegraph.x), z: r2(e.telegraph.z), resolveTick: e.telegraph.resolveTick }
            : undefined,
        })),
      // Enemy shots in flight (enemies block; §11 4.0 u/s telegraphed shots).
      eshots: registry
        .all()
        .filter((e) => e.kind === 'eshot')
        .map((e) => ({ id: e.id, x: r2(e.x), z: r2(e.z), traveled: r2(e.traveled) })),
    };
  }

  function cmd(name, ...args) {
    switch (name) {
      case 'spawn': {
        const [type, x, z] = args; // ('dummy'|'wisp'|'boar'|'mantis', x, z)
        // Real §11 enemies (enemies block) — full AI/telegraph/juice pipeline.
        if (type === 'boar' || type === 'mantis') return enemies.debugSpawn(type, x, z);
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
      // Skills-block test command: park a sim ally body at (x, z) so
      // count-capped shapes can be driven past their cap (e.g. 4 candidates
      // inside Nova Bloom's 1.4 u burst). Sim-only — the arena draws ally rigs
      // at fixed camp spots, so run cap probes in ?scene=graybox.
      case 'placeAlly': {
        const [index, x, z] = args;
        const a = registry.all().find((e) => e.kind === 'ally' && e.partyIndex === index);
        if (!a) return null;
        const { mx, mz } = innerBounds(a.radius);
        a.x = Math.min(mx, Math.max(-mx, x));
        a.z = Math.min(mz, Math.max(-mz, z));
        a.px = a.x;
        a.pz = a.z;
        return { id: a.id, x: r2(a.x), z: r2(a.z) };
      }
      case 'setHp': {
        const [id, pct] = args;
        const e = registry.byId(id);
        if (!e || e.maxHp === undefined) return null;
        e.hp = e.maxHp * pct;
        if (e.hp <= 0) {
          if (e.kind === 'wisp') killWisp(e);
          // Full kill juice for dummies, real enemies and the Waystone; party
          // members (partyIndex defined) stay downed, never killed/despawned.
          else if (e.partyIndex === undefined) combat.kill(e);
        }
        return e.hp;
      }
      case 'killAllEnemies': {
        maintainPopulation = false;
        const hostiles = registry
          .all()
          .filter(
            (e) =>
              e.kind === 'wisp' || e.kind === 'dummy' || e.kind === 'boar' || e.kind === 'mantis'
          );
        for (const h of hostiles) {
          if (h.kind === 'wisp') killWisp(h);
          else combat.kill(h);
        }
        return hostiles.length;
      }
      // --- Enemies-block test commands (§11 rooms/waves, docs/TESTING.md).
      case 'startRoom': {
        const [m] = args; // 'kill_all' | 'defend'
        return waves.startRoom(m ?? 'kill_all');
      }
      case 'startWave':
        return waves.forceNextWave();
      case 'clearRoom':
        return waves.forceClear();
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
        // One basic-power damage instance on a dummy (default: first dummy),
        // on the PLAYER, or on an ALLY (pass the entity id — drives the rig's
        // hurt clip / §10 downed, and the §17 Bruise-Umber incoming numeral
        // that the whole party shares), through combat.applyDamage — real crit
        // roll, knockback (party exempt per A5), juice.
        const [id] = args;
        const t = id != null ? registry.byId(id) : firstDummy();
        if (!t || (t.kind !== 'dummy' && t.kind !== 'player' && t.kind !== 'ally')) return null;
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
      // --- Skill-kit test commands (skills block, docs/TESTING.md).
      case 'giveSkill': {
        const [id] = args;
        return skillSys.giveSkill(id);
      }
      case 'healOverride': {
        // Same durable toggle as F1-F4 (§8), scriptable.
        const [index] = args;
        return skillSys.toggleOverride(index);
      }
      case 'skillState':
        // Persistence plumbing for the run block: remaining cooldown ticks.
        return skillSys.serialize();
      case 'restoreSkillState': {
        const [data] = args;
        return skillSys.restore(data);
      }
      // --- Build-system test commands (nodes block, docs/TESTING.md).
      case 'grantNode': {
        const [id, provenance] = args;
        return buildSys.grantNode(id, provenance ?? 'drafted');
      }
      case 'socket': {
        const [skillId, nodeId, slot] = args;
        return buildSys.socket(skillId, nodeId, slot ?? null);
      }
      case 'unsocket': {
        const [skillId, slot] = args;
        return buildSys.unsocket(skillId, slot);
      }
      case 'buildView':
        return buildSys.view();
      case 'buildPreview': {
        const [skillId, nodeId] = args;
        return buildSys.preview(skillId, nodeId);
      }
      case 'kitVerdict': {
        const [nodeId] = args;
        return buildSys.kitVerdict(nodeId);
      }
      case 'buildVerdict': {
        // Raw §15.5 verdict for one node on one skill. `slot` names the socket
        // the node already sits in, so the saturation baseline excludes that
        // copy (omit it and it is looked up).
        const [skillId, nodeId, slot] = args;
        return buildSys.verdictFor(skillId, nodeId, slot ?? null);
      }
      case 'buildState':
        // Persistence plumbing for the run block (§13 bench + assignments).
        return buildSys.serialize();
      case 'restoreBuildState': {
        const [data] = args;
        return buildSys.restore(data);
      }
      default: {
        // Ally-block test commands (mark / cycleMark / rally / allyState /
        // reviveState / downAll / breakRevive / reviveFlinchBreak).
        // Run-block test commands (startRun / runState / draftTake /
        // draftDecline / pathFocus / pathChoose / shopBuy / shopAdvance /
        // skipToRoom / bossHp / killBoss / wallet / draftPools / endRun /
        // returnToCamp), then the ally-block ones.
        const ran = runSys.cmd(name, args);
        if (ran !== undefined) return ran;
        const handled = allySys.cmd(name, args);
        if (handled !== undefined) return handled;
        console.warn(`__echoes.cmd('${name}') lands with a later block`);
        return null;
      }
    }
  }

  return {
    step,
    cmd,
    player,
    stats,
    entities: () => registry.all(),
    // Skill-slot view for the HUD (skills block): [{id, abbrev, passive,
    // remainingTicks, totalTicks} | null] x4.
    skillSlots: () => skillSys.slotsView(),
    // Build-system accessor (nodes block): the socket screen reads view()/
    // preview() and drives socket()/unsocket() through the same sim entry
    // points as __echoes.cmd.
    buildSystem: () => buildSys,
    // Run-block accessor (§2/§13/§16): the run UI screens read view() and
    // drive the same entry points __echoes.cmd does; the boss render layer
    // reads the Stag body read-only.
    runSystem: () => runSys,
    bossSystem: () => bossSys,
    // Ally-block accessor (render layer reads the mark, the revive channels
    // and the per-ally AI state read-only; it never mutates sim state).
    allySystem: () => allySys,
    // Spawn telegraphs in flight (enemies block) — render-layer state sync.
    pendingSpawns: () => waves.pendingSpawnsList(),
    snapshotState,
    get tick() {
      return currentTick;
    },
  };
}
