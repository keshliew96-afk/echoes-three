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
  SKILL_SLOTS,
} from '../core/constants.js';
import { DENIAL } from '../core/intents.js';
import { innerBounds, walkStep, sweptStep, slipPatches, slipFollow, SLIP, createMovementState, useMovementState } from './movement.js';
import { createProjectileSystem } from './projectiles.js';
import { createCombat } from './combat.js';
import { createEnemySystem, ENEMY_KINDS } from './enemies.js';
import { createWaveDirector } from './waves.js';
import { createSkillSystem, STARTING_SKILLS, PARTY_ALLIES, SKILLS as SKILLS_REF } from './skills.js';
import { has as hasTalent, sapOn, hasRelic, talentCdMul, gladeNodes } from './reviewTalents.js'; // REVIEW-ONLY
import { createBuildSystem } from './nodes.js';
import { createAllySystem } from './allies.js';
import { createZoneSystem } from './zones.js';
import { installNightHunger } from './duskwing.js';
import { createBossSystem } from './boss.js';
import { createRunSystem } from './run.js';
// PARTY (docs/gauntlet/PLAN.md §16.3): the three ally builds + their
// technique module (the cast pipeline lives in the ally system).
import { createPartySystem } from './party.js';
import { createPartyTech } from './partytech.js';
import { seatDisplacement } from './allycast.js';
// @gnt:M4b IMPORTS begin — hazards / interactables / layout director (PLAN §3.6)
import { createHazardSystem, createLayoutSystem } from './hazards.js';
import { createInteractableSystem } from './interactables.js';
import { MENACE } from '../core/constants.js';
// @gnt:M4b IMPORTS end

// §10: a Downed character crawls at 0.8 u/s (movement only, cannot act).
const DOWNED_CRAWL_SPEED = 0.8;

const TICK_DT = 1 / TICK_HZ; // seconds per tick, for u/s -> u/tick
const r2 = (v) => Math.round(v * 100) / 100;

export function createWorld({ rng, registry, events, harness = true, requestHitstop = null, room = null }) {
  // Every listener a sim module registers is tagged SIM (core/events.js):
  // same listener list and order as before, but a network guest's replay()
  // skips them (docs/gauntlet/PLAN.md §3.7 "replica bus").
  if (events && typeof events.sim === 'function') events = events.sim();
  let currentTick = 0;
  // This world's colliders and slip patches (sim/movement.js): bound now, so
  // the systems built below install into it, and again on every step, cmd and
  // load, so a second world in the same process keeps its own.
  const movement = createMovementState();
  useMovementState(movement);

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
    const { power, delivery, reviewGem } = bolt;
    deferred.push({
      carrierOrdinal: bolt.id,
      resolve: () => {
        const t = registry.byId(targetId);
        if (!t) return; // died to an earlier same-tick maturation
        // SECRET ROOMS: a party bolt's blow on a cracked wall names the
        // player, so the run can tell a hero's knock from a stray one.
        if (t.kind === 'secret_wall') combat.applyDamage(t, power, { delivery, shape: 'projectile', dirX, dirZ, ...(bolt.faction === 'party' ? { attacker: player.id } : {}) });
        else combat.applyDamage(t, power, { delivery, shape: 'projectile', dirX, dirZ, ...(reviewGem ? { reviewGem } : {}) });
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
  let partySys = null; // PARTY: the three ally builds (late-bound for the ally system)
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
  // Every lasting `ground_aoe` zone, the Healer's and the allies' (AUDIT D2).
  const zoneSys = createZoneSystem({ registry, events, combat, getTick: () => currentTick, isIframed });

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
    party: () => partySys,
    zones: zoneSys,
  });
  zoneSys.setAllyHit(allySys.zoneHit);
  // One cast delivery for every kit (AUDIT D2): the Healer's casts and her
  // Echo replays deliver through the party's caster too.
  skillSys.attachDelivery((a, def, power, c) => allySys.caster().deliver(a, def, power, c));
  events.on('room_cleared', () => allySys.onRoomBoundary('room_clear'));
  events.on('room_start', () => allySys.onRoomBoundary('room_start'));
  events.on('hit', (ev) => allySys.onHit(ev));
  // THE DUSKWING (docs/DUSKWING.md): Night Hunger, his life steal.
  installNightHunger({
    registry,
    events,
    getTick: () => currentTick,
    // His Thirst and Vampire nodes: the techniques on the skill a blow came from.
    techsOf: (seat, skill) => {
      const b = partySys ? partySys.build(seat) : null;
      return b ? b.tech.liveTechs(skill) : [];
    },
  });

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

  // --- Party builds (PARTY, PLAN §16.3): seats 1-3 get the Healer's build
  // model — loadouts from their class pools, 8 sockets per skill, purses —
  // and a technique module that reacts to their class skills' primary
  // events. Created after the Healer's build system so every pre-existing
  // listener keeps its delivery order.
  const combatActiveNow = () => {
    if (runSys && runSys.isActive()) return runSys.combatActive();
    const r = waves.roomState();
    return !!(r && !r.cleared);
  };
  partySys = createPartySystem({
    rng,
    registry,
    events,
    combat,
    getTick: () => currentTick,
    player,
    isIframed,
    queueDeferred: (carrierOrdinal, resolve) => deferred.push({ carrierOrdinal, resolve }),
    queueContinuation: (fn) => continuations.push({ resolve: fn }),
    isCombatActive: combatActiveNow,
    isBetweenRooms: () => !!(runSys && runSys.isActive() && !runSys.combatActive()),
  });
  const partyTech = createPartyTech({
    registry,
    events,
    combat,
    getTick: () => currentTick,
    queueContinuation: (fn) => continuations.push({ resolve: fn }),
    build: (s) => partySys.build(s),
    state: (s) => partySys.seatState(s),
    body: (s) => partySys.body(s),
    caster: () => allySys.caster(),
    seatDisplacement,
    slotsOf: (s) => partySys.slots(s) ?? [],
    // PARTY LINEUP (docs/LINEUP.md): the seat a class holds this run (-1: camp).
    seatOfClass: (cls) => partySys.lineup().indexOf(cls),
  });
  partySys.attach({ caster: allySys.caster(), tech: partyTech });

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
    zones: zoneSys,
    combat,
    party: partySys,
  });
  events.on('room_cleared', (ev) => runSys.onRoomCleared(ev));
  events.on('defeat', () => runSys.onDefeat());

  // @gnt:M4b CONTENT-SYSTEMS begin — the hazards (sim/hazards.js) and
  // interactables (sim/interactables.js) systems are created here, hook the
  // phases at the CONTENT-* anchors below and receive the rolled room layout
  // through runSys.setRoomHooks({ enter(layout, tick), exit(tick) }) (M4a
  // implements setRoomHooks in run.js — docs/gauntlet/PLAN.md §2 / §3.6).
  const hazardSys = createHazardSystem({
    registry,
    events,
    combat,
    getTick: () => currentTick,
    getSeed: () => rng.seed,
    governor: enemies.governor,
  });
  const interactSys = createInteractableSystem({
    registry,
    events,
    combat,
    getTick: () => currentTick,
    player,
    hazards: hazardSys,
  });
  const layoutSys = createLayoutSystem({
    registry,
    events,
    getTick: () => currentTick,
    hazards: hazardSys,
    interactables: interactSys,
    getRunView: () => (runSys && runSys.isActive() ? runSys.view() : null),
    getRoomMode: () => (waves.roomState() ? waves.roomState().mode : null),
    getSeed: () => rng.seed,
  });
  if (typeof runSys.setRoomHooks === 'function') {
    runSys.setRoomHooks({
      enter: (layout, tick) => layoutSys.enter(layout, tick),
      exit: (tick) => layoutSys.exit(tick),
    });
  }
  // §13: a cleared room's hazards and assets stop acting (the reward pages
  // run on a live sim); run end clears them through the exit hook, and as a
  // belt-and-braces sweep here for a run.js without room hooks.
  events.on('room_cleared', () => layoutSys.onRoomCleared());
  events.on('run_end', (ev) => layoutSys.exit(ev.tick));
  events.on('return_to_camp', (ev) => layoutSys.exit(ev.tick));
  // The Tank's MENACE (constants.js MENACE, PLAN GP.5): its taunt sources —
  // Taunting Roar equipped, a live Provoke on an equipped skill — make every
  // non-boss hostile weigh it closer when choosing whom to attack. Read from
  // the seat build each tick by enemies.js; nothing new is saved.
  enemies.setThreat(() => {
    // PARTY LINEUP: whichever seat the Tank holds (none when it stayed at camp).
    const ts = partySys.lineup().indexOf('tank');
    if (ts < 1) return null;
    const tank = partySys.body(ts);
    if (!tank || !(tank.hp > 0)) return null;
    const b = partySys.build(ts);
    let n = 0;
    for (const id of partySys.slots(ts) || []) {
      if (!id) continue;
      if (id === 'taunting_roar') n += 1;
      if (b && b.tech.liveTechs(id).includes('provoke')) n += 1;
    }
    return n > 0 ? new Map([[tank.id, Math.min(MENACE.maxU, n * MENACE.perSourceU)]]) : null;
  });
  // @gnt:M4b CONTENT-SYSTEMS end

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
    if (player.dashTicksLeft > 0 && player.dashDip > 0) {
      player.dashDip -= 1; // REVIEW-ONLY: the dip before she springs
      player.dashTicksLeft -= 1;
    } else if (player.dashTicksLeft > 0) {
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
        // @gnt:M4a PLAYER-SPEED begin — M4a multiplies spd by
        // status.speedMul(player, currentTick) (haste/slow, BUILD_BRIEF §23.8).
        // The Downed crawl is never scaled; with no status the factor is 1.
        const spd =
          player.hp > 0
            ? HEALER.moveSpeed * (combat.status ? combat.status.speedMul(player, currentTick) : 1)
            : DOWNED_CRAWL_SPEED;
        // @gnt:M4a PLAYER-SPEED end
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
    // @gnt:M4b CONTENT-CONTINUOUS begin — hazard pushes/slows, interactable timers.
    layoutSys.continuous();
    // @gnt:M4b CONTENT-CONTINUOUS end

    // §9 #3 knockback displacement: impulse away from the hit over kbTicks,
    // swept vs walls (no slide — wall contact ends the impulse). Runs before
    // projectiles so bolts sweep against final positions this tick.
    const slick = slipPatches().length > 0;
    const knocked = slick ? new Set() : null;
    for (const e of registry.all()) {
      if (!(e.kbTicks > 0)) continue;
      if (knocked) knocked.add(e.id);
      const { hit } = sweptStep(e, e.kbVx, e.kbVz, e.radius);
      e.kbTicks -= 1;
      if (hit) e.kbTicks = 0;
    }
    // Slick floor (sim/movement.js slipFollow): every walking body's whole
    // step this tick (own motion, pushes, knockback) eases into its momentum
    // on a slip patch. Human seats slide per input frame inside their own
    // step (sim/remote.js), so only a knockback reaches them here. A dash or
    // a knockback is taken whole and slides on after it ends. Rooms without
    // a patch skip this entirely (no field is ever written).
    if (slick) {
      // Small fixes 8: Pumice Soles, the party never slides.
      const M = combat.getMods ? combat.getMods() : null;
      const soles = M && M.active() && M.slipProof ? M : null;
      for (const e of registry.all()) {
        if (e.flier || e.burrowed || e.boss === true || e.kind === 'stag') continue;
        const party = e.partyIndex !== undefined;
        if (!party && !(e.kind === 'dummy' || (ENEMY_KINDS.has(e.kind) && e.state === 'active'))) continue;
        const kb = knocked.has(e.id);
        if (e.controller === 'human' && !kb) continue;
        const snap = kb || e.dashTicksLeft > 0 || !!(e.skillDash && e.skillDash.ticksLeft > 0);
        // AI party members step carefully: they slide, but recover fast.
        const gripMul = party && e !== player && e.controller !== 'human' ? SLIP.aiGripMul : 1;
        const proof = party && soles !== null && soles.slipProof(e);
        slipFollow(e, e.px, e.pz, { snap, gripMul, proof });
      }
    } else {
      for (const e of registry.all()) if (e.slipVx !== undefined && e.controller !== 'human') slipFollow(e, e.px, e.pz);
    }

    // Projectiles advance (swept) after actors. Skill bolts share the phase;
    // Echo-recast bolts (nodes block) fly on the same swept subsystem.
    projectiles.step(currentTick);
    skillSys.step(currentTick);
    buildSys.step(currentTick);
    partySys.step(currentTick); // PARTY: the seat builds' echo / split bolts

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
    partySys.discrete(); // PARTY: the ally seats' echo recasts + Reapply pulses
    drainContinuations();

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
    // @gnt:M4b CONTENT-DISCRETE begin — hazard resolutions and `interact`
    // presses (after the ally pass, so revive arbitration has already claimed
    // KeyE next to a Downed body), ascending spawn ordinal.
    layoutSys.discrete(snapshot);
    drainContinuations();
    // @gnt:M4b CONTENT-DISCRETE end
    // TONICS AND BOMBS (docs/CONSUMABLES.md): the slot presses, the Healer's
    // and the human seats', then the AI seats' (a run without tonics: no-op).
    {
      const own = snapshot && Array.isArray(snapshot.presses) && snapshot.presses.some((p) => p.kind === 'use_item');
      const list = own ? [{ seat: 0, aim: snapshot.aim ?? player.aim ?? null }] : [];
      if (seatsActive) for (const u of allySys.humanUses()) list.push(u);
      runSys.useTonics(list);
      drainContinuations();
    }

    // ④ persistent-zone scheduled ticks, ascending zone spawn ordinal (every
    // kit's zones, sim/zones.js), then the Warding Aura cadence (skills
    // block). Zone/aura heals can carry techniques (Siphon per tick per
    // occupant) — drain ③ after.
    zoneSys.phase();
    skillSys.auraPhase();
    drainContinuations();
    // PARTY: the ally class passives (Iron Stance, Razor Wake, Kestrel Watch)
    // pulse on their 1.0 s cadence, ascending slot per seat.
    partySys.pulsePhase();
    drainContinuations();

    // ④ continued: the ally block's end of tick (Bubble Ward bursts), then
    // the §2 defeat rule on live HP so an all-four-down lands its
    // `defeat` event on the exact tick — before the room's clear predicate,
    // which §2 says defeat outranks.
    allySys.endOfTick();
    drainContinuations();
    partySys.endOfTick(); // PARTY: parry windows close, Steady Aim stillness

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
    // @gnt:M4a SKILL-SLOTS begin — slot loop runs 0..SKILL_SLOTS-1 (4 -> 8,
    // PLAN §4.3); M4a adds the stun gate (status.canAct) here.
    // A stunned caster starts nothing (BUILD_BRIEF §23.8). status.apply
    // refuses stun on party bodies by rule, so this gate is the contract's
    // belt-and-braces half: it can never fire in a v0.4.63 trace.
    const stunned = !!(combat.status && combat.status.isStunned(player, currentTick));
    for (let slot = 0; slot < SKILL_SLOTS; slot++) {
      const kind = `skill_${slot + 1}`;
      if (!accepted.has(kind)) continue;
      if (player.dashTicksLeft > 0 || stunned) {
        deny(kind, DENIAL.prioritySuppressed);
      } else {
        skillSys.tryFire(slot);
      }
    }
    // @gnt:M4a SKILL-SLOTS end

    // Basic-attack fire (slot 4).
    resolveBasic(snapshot);
  }

  // §5/§7 basic attack: free, hold-to-repeat at attack_interval, first shot
  // immediate on press (nextBasicTick starts in the past), rate never exceeds
  // the interval. During a dash a due fire is suppressed (priority_suppressed,
  // §5) and re-armed — one denial per attempt, no queue, no refund.
  // REVIEW-ONLY (never committed): ?tripo=1 plays the proposed staff combo
  // (review page line 1): hit 1 bolt, hit 2 bolt, hit 3 sends the gem out as a
  // turret (drift 0.85 s, float 1 s, a 3-damage bolt every 0.34 s at the
  // nearest foe within 4 u of the gem, home in 0.14 s). Hit 1 is locked for
  // 1 s after the gem leaves; after that, hit 1 calls the gem home.
  const REVIEW_COMBO = typeof location !== 'undefined' && /[?&]tripo=1\b/.test(location.search);
  // Kesh 11-16 (sketch): hit 3 throws the staff into the floor 2.2 u out; its gem (1.74 u out) is the turret from landing (26 ticks) until 5 s after the throw, or until her next basic attack recalls it.
  const CB = { gap2: 19, gap3: 20, reset: 36, drift: 26, float: 274, home: 11, every: 20, lock: 60, reach: 1.74, gemPower: 3, gemRange: 4.5, seek: 4 };
  const cb = { step: 0, last: -999, gem: null };
  // REVIEW-ONLY (never committed): Mosslight's talent grid, version 2, any mix
  // (?talents=quick_sprout,deep_roots,..., src/sim/reviewTalents.js; MOSSLIGHT_TALENT_PATHS.md
  // T19 to T33). Cooldowns, reach, area and charges live in skills.js, Second Flush in
  // nodes.js; the HoT, afterglow, Bark, Overgrowth and Sap rules wrap the one heal and
  // damage pipeline here.
  const HOT_SKILLS = new Set(Object.values(SKILLS_REF).filter((d) => d.archetype === 'heal' && d.shape !== 'ground_aoe' && d.shape !== 'aura').map((d) => d.id));
  const hots = new Map(); // `${target}|${skill}` -> { t, skill, per, left, next }
  const HV = { worth: 1.5, roots: 0.3, ticks: 6, every: 60, glow: 0.2, glowTicks: 4 };
  const SAP = {
    share: (hasTalent('reap') ? 0.3 : 0) + (hasTalent('rich_sap') ? 0.1 : 0), // T21, T24
    staffShare: hasTalent('rooted_staff') ? 0.5 : 0, // T27
    cap: hasTalent('deep_gem') ? 80 : 50, // T30
    reach: hasTalent('deep_gem') ? 2.4 : 1.8,
    every: 30,
    pour: 8,
    felled: hasTalent('bounty') ? 3 : 0, // T33
  };
  const BARK = { cut: 0.1, ticks: 240 }; // T26
  const PEREN = { per: 0.01, ticks: 6 }; // T32 Perennial: 1% of maximum health a second for 6 s
  const WISP = { cap: 0.2, ticks: 480 }; // Mercy Bell's wisp: stores up to 20% of the ally's maximum health, 8 s
  player.reviewSapOn = sapOn();
  player.reviewSapCap = SAP.cap;
  player.reviewSapReach = SAP.reach;
  player.reviewSap = hasTalent('deep_gem') ? 15 : 0; // T30: each room starts with at least 15
  const rawHeal = combat.applyHeal;
  const rawDamage = combat.applyDamage;
  const fromHer = (o) => o.healer === player.id || (o.source && (HOT_SKILLS.has(o.source) || String(o.source).startsWith('review_')));
  // Every heal of hers that lands passes here: Bark (T26) and Overgrowth (T32) ride it.
  function healLanded(t, base, o) {
    const r = rawHeal(t, base, o);
    if (!r || !fromHer(o)) return r;
    if (hasTalent('bark') && t.partyIndex !== undefined) {
      t.reviewBarkUntil = currentTick + BARK.ticks;
      events.emit(currentTick, 'review_bark', { target: t.id, ticks: BARK.ticks });
    }
    const over = r.amount - r.applied;
    if (hasRelic('mercy_bell') && over > 0.01 && t.partyIndex !== undefined && o.source !== 'review_pour' && o.source !== 'review_wisp') {
      // Mercy Bell, Kesh 11-16: her overheal summons a nature wisp that circles the ally and
      // stores it (up to 20% of the ally's maximum health, 8 s after the last addition).
      const w = wisps.get(t.id) || { t, store: 0 };
      w.store = Math.min(t.maxHp * WISP.cap, w.store + over);
      w.until = currentTick + WISP.ticks;
      wisps.set(t.id, w);
      t.reviewWisp = w.store;
      events.emit(currentTick, 'review_wisp', { target: t.id, store: r2(w.store), cap: r2(t.maxHp * WISP.cap) });
    }
    if (hasTalent('perennial') && t.partyIndex !== undefined && o.source !== 'review_perennial') {
      // Perennial (T32, replaces Overgrowth): anyone she heals regrows 1% of maximum health a
      // second for 6 s; a new heal restarts it, it never stacks.
      const key = `${t.id}|perennial`;
      const fresh = !hots.has(key);
      hots.set(key, { t, skill: 'perennial', healer: player.id, per: t.maxHp * PEREN.per, left: PEREN.ticks, next: currentTick + HV.every, src: 'review_perennial' });
      if (fresh) events.emit(currentTick, 'review_hot', { target: t.id, skill: 'perennial', secs: PEREN.ticks });
    }
    return r;
  }
  // Mercy Bell's wisp: when its ally takes damage, it heals the damage just taken, up to what it holds.
  const wisps = new Map(); // target id -> { t, store, until }
  if (REVIEW_COMBO) globalThis.__reviewWisps = wisps; // kit v1.5: the page can run a wisp's 8 s out
  function wispTick() {
    for (const [id, w] of wisps) {
      if (!(w.t.hp > 0) || currentTick >= w.until || w.store < 0.05) {
        if (w.t.hp > 0 && currentTick >= w.until && w.store >= 0.05) dropSeed(w.t.x + 0.35, w.t.z + 0.25, { x: w.t.x, z: w.t.z }); // kit v1.5 R46: a fading wisp leaves a seed
        wisps.delete(id);
        w.t.reviewWisp = 0;
        events.emit(currentTick, 'review_wisp_end', { target: id });
      }
    }
  }
  function wispOnHit(t, lost) {
    const w = wisps.get(t.id);
    if (!w || !(lost > 0) || !(t.hp > 0)) return;
    const amt = Math.min(lost, w.store, t.maxHp - t.hp);
    if (!(amt > 0)) return;
    w.store -= amt;
    t.reviewWisp = w.store;
    rawHeal(t, amt, { healer: player.id, source: 'review_wisp', critBonus: -1 });
    events.emit(currentTick, 'review_wisp_heal', { target: t.id, amount: r2(amt), store: r2(w.store) });
  }
  function addHot(t, key, skill, healer, total, n, secs) {
    const old = hots.get(key);
    const carry = old ? Math.min(old.per * old.left, total) : 0; // T18: keeps up to one extra cast's worth
    const h = { t, skill, healer, per: (total + carry) / n, left: n, next: currentTick };
    hots.set(key, h);
    events.emit(currentTick, 'review_hot', { target: t.id, skill: key.split('|').slice(1).join('|'), secs });
    return h;
  }
  if (REVIEW_COMBO) {
    combat.applyHeal = (t, base, o = {}) => {
      if (!t || !(t.hp > 0)) return rawHeal(t, base, o);
      // The druid kit (MOSSLIGHT_SKILL_KIT.md): Swiftleaf +50% on an ally with Moss (S10),
      // Nova Bloom blooms Moss before it heals (S4, S13), Mossgrowth and Wild Growth land as Moss (S15, S16).
      if (o.source === 'swift_mend' && t !== player) leafBack(t, base); // kit v1.5 R27: the leaf comes back
      if (o.source === 'swift_mend' && hasMoss(t)) base *= KIT.swiftBonus;
      if (o.source === 'nova_bloom') bloom(t, o.healer);
      const mossN = KIT.moss[o.source];
      if (mossN) {
        const total = base * (hasTalent('regrowth') ? HV.worth + (hasTalent('deep_roots') ? HV.roots : 0) : 1);
        const key = `${t.id}|${o.source}`;
        const h = addHot(t, key, o.source, o.healer, total, mossN, mossN);
        return hotTick(h, key);
      }
      const dash = o.source === 'review_dash';
      const skillHeal = dash || (o.source && HOT_SKILLS.has(o.source));
      if (skillHeal && hasTalent('regrowth')) {
        // T20: the heal lands as a HoT worth 150% in 6 ticks (180% with Deep Roots, T23);
        // the dash's 5% becomes 3 ticks of 2.5%.
        const n = dash ? 3 : HV.ticks;
        const total = dash ? base : base * (HV.worth + (hasTalent('deep_roots') ? HV.roots : 0));
        const h = addHot(t, `${t.id}|${o.source}`, o.source, o.healer, total, n, dash ? 2 : 5);
        return hotTick(h, `${t.id}|${o.source}`);
      }
      const r = healLanded(t, base, o);
      if (skillHeal && hasTalent('deep_roots') && r) {
        // T23 alone: the heal stays as it is and leaves 20% more over 4 s (4 ticks of 5%).
        const h = addHot(t, `${t.id}|${o.source}|glow`, o.source, o.healer, base * HV.glow, HV.glowTicks, 4);
        h.next = currentTick + HV.every;
      }
      return r;
    };
  }
  function hotTick(h, key) {
    if (!(h.t.hp > 0)) {
      hots.delete(key);
      return null;
    }
    h.left -= 1;
    h.next = currentTick + HV.every;
    if (h.left <= 0) hots.delete(key);
    events.emit(currentTick, 'review_hot_tick', { target: h.t.id, skill: h.skill }); // kit v1.4 R16: a flower opens on each tick
    if (h.left <= 0 && h.skill === 'kindred_shield' && globalThis.__reviewSeedAt) globalThis.__reviewSeedAt(h.t.x + 0.35, h.t.z + 0.25); // R18: a full run drops a seed
    return healLanded(h.t, h.per, { healer: h.healer, source: h.src || `${h.skill}:hot`, critBonus: -1 });
  }
  if (REVIEW_COMBO) {
    combat.applyDamage = (t, base, o = {}) => {
      if (t && t.reviewBarkUntil > currentTick && t.partyIndex !== undefined) base *= 1 - BARK.cut; // T26
      if (o.source === 'pale_lance' && t && weakened(t)) {
        { const ex = 1 + (combat.status.magnitude(t, 'exposed', currentTick) || 0); base = Math.round(base * KIT.lance * ex) / ex; } // whole numbers on screen (review build). S21 Briar Lance: +30% on a weakened foe (slowed, stunned or exposed, S5)
        events.emit(currentTick, 'review_weak', { target: t.id, x: r2(t.x), z: r2(t.z) });
      }
      if (o.shape === 'review' && t && t.partyIndex === undefined) { const ex = 1 + (combat.status.magnitude(t, 'exposed', currentTick) || 0); base = Math.round(base * ex) / ex; } // whole numbers on screen with Exposed (review build)
      const before = t && t.hp > 0 ? t.hp : 0;
      const r = rawDamage(t, base, o);
      if (t && t.partyIndex !== undefined && wisps.size) wispOnHit(t, before - (t.hp > 0 ? t.hp : 0));
      if (!player.reviewSapOn || !t || t.faction === 'party') return r;
      let got = 0;
      if (r && r.amount > 0 && (o.attacker === player.id || (o.delivery === 'basic' && o.attacker == null))) {
        got += Math.min(r.amount, before) * (SAP.share + (o.reviewGem ? SAP.staffShare : 0));
      }
      if (SAP.felled && before > 0 && !(t.hp > 0)) got += SAP.felled; // T33: whoever felled it
      if (got > 0) {
        player.reviewSap = Math.min(SAP.cap, player.reviewSap + got);
        events.emit(currentTick, 'review_sap', { x: r2(t.x), z: r2(t.z), sap: r2(player.reviewSap) });
      }
      return r;
    };
  }
  // ---- REVIEW-ONLY: the druid kit's new machinery (MOSSLIGHT_SKILL_KIT.md S3 to S25) ----
  const KIT = {
    swiftBonus: 1.5, // S10
    moss: { kindred_shield: 6, lantern_ward: 5 }, // S15 Mossgrowth 6 ticks, S16 Wild Growth 5 ticks
    seed: { heal: 11, life: 480, reach: 0.45, ripe: 60, wake: 4.0 }, // S11, S43 (v1.3: 8 s, sprouts)
    sapling: { every: 120, reach: 3.0 }, // S18
    vine: { ticks: 4, first: 30, every: 60, heal: 4, reach: 3.0 }, // S25
    lance: 1.3, // S21
  };
  const hasMoss = (t) => {
    for (const k of hots.keys()) if (k.startsWith(`${t.id}|`)) return true;
    return false;
  };
  const weakened = (t) => ['slow', 'stun', 'exposed'].some((k) => combat.status.magnitude(t, k, currentTick) > 0);
  function bloom(t, healer) {
    let sum = 0;
    for (const [k, h] of hots) {
      if (!k.startsWith(`${t.id}|`) || h.skill === 'perennial') continue;
      sum += h.per * h.left;
      hots.delete(k);
    }
    if (sum > 0.01) {
      events.emit(currentTick, 'review_bloom', { target: t.id, amount: r2(sum) });
      healLanded(t, sum, { healer, source: 'nova_bloom:bloom', critBonus: -1 });
    }
  }
  // S19 Glade Wisps (Kesh 11-16): every 2.5 s a wisp forms round her (at most 3 wait, 10 s each);
  // a waiting wisp flies to the most hurt other ally within 4 u at 5 u/s and heals 10 on touch.
  const GW = { every: 150, max: 3, life: 600, speed: 5, gap: 12, orbit: 0.6, hopReach: 2.2 };
  const glade = { seen: -1, def: null, next: 0, launch: 0, list: [] };
  globalThis.__reviewGladeWisps = glade.list;
  globalThis.__reviewGlade = (def) => {
    if (glade.seen < 0 || currentTick - glade.seen > 90) glade.next = currentTick + 30;
    glade.seen = currentTick;
    glade.def = def;
  };
  const gn = (id) => gladeNodes(id);
  function gladeTick() {
    const on = glade.def && currentTick - glade.seen <= 70 && player.hp > 0;
    const L = glade.list;
    const every = Math.round(GW.every * (1 - 0.15 * gn('quicken')) * talentCdMul({ archetype: 'heal' }));
    const max = GW.max + (gn('multiply') ? 1 : 0);
    const life = Math.round(GW.life * (gn('linger') ? 1.5 : 1));
    const reach = (glade.def ? glade.def.area : 4) * (1 + 0.25 * gn('reach')) * (hasTalent('long_reach') ? 1.2 : 1);
    const speed = (GW.speed * (1 + 0.4 * gn('breeze'))) / 60;
    const waiting = () => L.filter((w) => w.state === 'wait');
    if (!on) {
      for (const w of L) events.emit(currentTick, 'review_gw_end', { id: w.id });
      L.length = 0;
      return;
    }
    if (waiting().length >= max) glade.next = Math.max(glade.next, currentTick + 1); // the timer waits while she is full
    else if (currentTick >= glade.next) {
      glade.next = currentTick + every;
      const n = Math.min(gn('multiply') ? 2 : 1, max - waiting().length);
      for (let i = 0; i < n; i++) {
        const w = { id: ++kitIds, state: 'wait', born: currentTick, until: currentTick + life, ang: (kitIds * 2.399) % (Math.PI * 2), x: player.x, z: player.z, target: null, hops: gn('bounce'), healed: [] };
        L.push(w);
        events.emit(currentTick, 'review_gw_spawn', { id: w.id });
      }
    }
    // pending heals so two wisps do not chase one ally a single heal tops up
    const pending = new Map();
    for (const w of L) if (w.state === 'fly') pending.set(w.target, (pending.get(w.target) || 0) + glade.def.power);
    for (let i = L.length - 1; i >= 0; i--) {
      const w = L[i];
      if (w.state === 'wait') {
        w.ang += 0.045;
        w.x = player.x + Math.cos(w.ang) * GW.orbit;
        w.z = player.z + Math.sin(w.ang) * GW.orbit;
        if (currentTick >= w.until) {
          L.splice(i, 1);
          const seedy = currentTick - (glade.lastSeed ?? -1e9) >= K5.gladeGap; // kit v1.5 R45
          if (seedy) { glade.lastSeed = currentTick; dropSeed(w.x, w.z, { x: w.x, z: w.z }); } // sinks where it circles, at her side
          events.emit(currentTick, 'review_gw_end', { id: w.id, faded: true, seed: seedy });
          continue;
        }
        if (currentTick < glade.launch) continue;
        let best = null, bs = 1;
        for (const e of registry.all()) {
          if (e === player || e.partyIndex === undefined || !(e.hp > 0) || e.hp >= e.maxHp) continue;
          if (Math.hypot(e.x - player.x, e.z - player.z) > reach) continue;
          if ((pending.get(e.id) || 0) >= e.maxHp - e.hp) continue;
          const share = e.hp / e.maxHp;
          if (share < bs) { bs = share; best = e; }
        }
        if (best) {
          w.state = 'fly';
          w.target = best.id;
          pending.set(best.id, (pending.get(best.id) || 0) + glade.def.power);
          glade.launch = currentTick + GW.gap;
          events.emit(currentTick, 'review_gw_fly', { id: w.id, target: best.id });
        }
      } else {
        const t = registry.byId(w.target);
        if (!t || !(t.hp > 0)) { L.splice(i, 1); events.emit(currentTick, 'review_gw_end', { id: w.id }); continue; }
        const dx = t.x - w.x, dz = t.z - w.z, d = Math.hypot(dx, dz);
        if (d > speed + 0.3) { w.x += (dx / d) * speed; w.z += (dz / d) * speed; continue; }
        w.x = t.x; w.z = t.z;
        healLanded(t, glade.def.power, { healer: player.id, source: 'warding_aura:wisp', critBonus: glade.def.critBonus ?? 0 });
        w.healed.push(t.id);
        events.emit(currentTick, 'review_gw_heal', { id: w.id, target: t.id });
        let next = null;
        if (w.hops > 0) {
          let bs2 = 1;
          for (const e of registry.all()) {
            if (e === player || w.healed.includes(e.id) || e.partyIndex === undefined || !(e.hp > 0) || e.hp >= e.maxHp) continue;
            if (Math.hypot(e.x - t.x, e.z - t.z) > GW.hopReach) continue;
            const share = e.hp / e.maxHp;
            if (share < bs2) { bs2 = share; next = e; }
          }
        }
        if (next) {
          w.hops -= 1;
          w.target = next.id;
          events.emit(currentTick, 'review_gw_fly', { id: w.id, target: next.id, hop: true });
        } else {
          L.splice(i, 1);
          events.emit(currentTick, 'review_gw_end', { id: w.id });
        }
      }
    }
  }
  const seeds = []; // S11, S43: { id, x, z, born, until }
  // ---- REVIEW-ONLY: kit v1.3 (Kesh 11-16 16:02): seeds and Spitters, Heartbloom, Pollen Gust,
  // Firefly Swarm, Scatter Seeds, Rootspear, Wispfall, Rootsnare, Puffcap (MOSSLIGHT_SKILL_KIT.md).
  const K3 = {
    spit: { cap: 4, life: 300, every: 60, reach: 4.0, dmg: 4 },
    heart: { range: 6, grow: 240, moss: 16, mossN: 4, reach: 3, low: 0.4 },
    gust: { len: 7, width: 3, speed: 10 / 60, push: 2, pushTicks: 12, haste: 0.3, hasteTicks: 180, slow: 0.3, slowTicks: 120 },
    swarm: { range: 6, hop: 5, speed: 6 / 60, stay: 180, stops: 4, moss: 15 },
    scatter: { range: 5, gap: 0.7 },
    spear: { delay: 24, len: 7, width: 1.4 },
    fall: { ticks: 300, every: 30, reach: 4.5, splash: 0.9, delay: 12 },
    snare: { range: 5, r: 2.4, ticks: 180, drag: 0.5 / 60, slow: 0.45, clench: 12, hold: 48 },
    puff: { range: 5, wait: 900, trigger: 1.5, r: 2.2, ticks: 240, max: 2, exposed: 0.2 },
  };
  const foeOk = (e) => e && e.hittable && e.faction !== 'party' && e.hp > 0;
  const bossy = (e) => e.boss === true || e.kind === 'stag';
  const nearestFoe = (x, z, reach, not) => {
    let best = null, bd = reach;
    for (const e of registry.all()) {
      if (!foeOk(e) || (not && not.has(e.id))) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  };
  const foesIn = (x, z, r) => registry.all().filter((e) => foeOk(e) && Math.hypot(e.x - x, e.z - z) <= r + (e.radius || 0.3));
  const hurtNear = (x, z, reach, withHer, not) => {
    let best = null, bs = 1;
    for (const e of registry.all()) {
      if (e.partyIndex === undefined || !(e.hp > 0) || e.hp >= e.maxHp || (!withHer && e === player) || (not && not.has(e.id))) continue;
      if (Math.hypot(e.x - x, e.z - z) > reach) continue;
      const share = e.hp / e.maxHp;
      if (share < bs) { bs = share; best = e; }
    }
    return best;
  };
  const hit = (e, amt, src) => combat.applyDamage(e, amt, { delivery: 'skill', shape: 'review', dirX: 0, dirZ: 0, attacker: player.id, source: src });
  const aimAt = (range) => {
    const ax = (player.aim ? player.aim.x : player.x) - player.x;
    const az = (player.aim ? player.aim.z : player.z) - player.z;
    const len = Math.hypot(ax, az) || 1;
    const k = len > range ? range / len : 1;
    return { x: player.x + ax * k, z: player.z + az * k, dx: ax / len, dz: az / len };
  };
  const inRect = (e, x, z, dx, dz, len, width) => {
    const rx = e.x - x, rz = e.z - z, pad = e.radius || 0.3;
    const along = rx * dx + rz * dz, across = Math.abs(rx * -dz + rz * dx);
    return along >= -pad && along <= len + pad && across <= width / 2 + pad;
  };
  function dropSeed(x, z, from) {
    const sd = { id: ++kitIds, x, z, born: currentTick, until: currentTick + KIT.seed.life };
    seeds.push(sd);
    events.emit(currentTick, 'review_seed', { id: sd.id, x: r2(x), z: r2(z), secs: KIT.seed.life / 60, ...(from ? { fromX: r2(from.x), fromZ: r2(from.z) } : {}) });
  }
  const spitters = [];
  function sprout(sd) {
    const sp = { id: ++kitIds, x: sd.x, z: sd.z, until: currentTick + Math.round(K3.spit.life * (gladeNodes('linger_sp') ? 1.5 : 1)), next: currentTick + 20 };
    while (spitters.length >= K3.spit.cap) {
      const old = spitters.shift();
      events.emit(currentTick, 'review_spit_end', { id: old.id });
    }
    spitters.push(sp);
    events.emit(currentTick, 'review_spit', { id: sp.id, x: r2(sp.x), z: r2(sp.z), secs: K3.spit.life / 60 });
  }
  function spitTick() {
    for (let i = spitters.length - 1; i >= 0; i--) {
      const sp = spitters[i];
      if (currentTick >= sp.until) { spitters.splice(i, 1); events.emit(currentTick, 'review_spit_end', { id: sp.id }); continue; }
      if (currentTick < sp.next) continue;
      const f = nearestFoe(sp.x, sp.z, K3.spit.reach);
      if (!f) continue;
      sp.next = currentTick + (sp.fastUntil > currentTick ? Math.round(K3.spit.every / 1.5) : K3.spit.every); // R36: watered, 50% faster
      events.emit(currentTick, 'review_spit_shot', { id: sp.id, target: f.id, x: r2(sp.x), z: r2(sp.z) });
      hit(f, K3.spit.dmg, 'lantern_flurry');
    }
  }
  // S13 Heartbloom: a bud on the ally who needs it most; Moss for 4 s, then it blooms.
  const buds = [];
  function heartCast(def, power) {
    const not = new Set(buds.map((b) => b.t.id));
    const t = hurtNear(player.x, player.z, def.range, true, not);
    if (!t) return;
    const b = { id: ++kitIds, t, until: currentTick + K3.heart.grow, power, reach: def.area };
    buds.push(b);
    const h = addHot(t, `${t.id}|heartbloom`, 'heartbloom', player.id, K3.heart.moss, K3.heart.mossN, K3.heart.mossN);
    hotTick(h, `${t.id}|heartbloom`);
    events.emit(currentTick, 'review_heart_bud', { id: b.id, target: t.id, secs: K3.heart.grow / 60 });
  }
  function heartTick() {
    for (let i = buds.length - 1; i >= 0; i--) {
      const b = buds[i];
      if (!(b.t.hp > 0)) { buds.splice(i, 1); events.emit(currentTick, 'review_heart_end', { id: b.id }); continue; }
      const early = b.t.hp / b.t.maxHp < K3.heart.low;
      if (currentTick < b.until && !early) continue;
      buds.splice(i, 1);
      const to = registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0 && Math.hypot(e.x - b.t.x, e.z - b.t.z) <= b.reach);
      events.emit(currentTick, 'review_heart_bloom', { id: b.id, target: b.t.id, to: to.map((e) => e.id), early });
      sproutNear(b.t.x, b.t.z, K5.heartWake); // kit v1.5 R25: light wakes
      for (const m of to) {
        bloom(m, player.id);
        healLanded(m, b.power, { healer: player.id, source: 'nova_bloom:wisp' });
      }
    }
  }
  // S14 Pollen Gust: a wall of wind along her aim.
  const gusts = [];
  function gustCast(def, power) {
    const a = aimAt(1);
    const g = { id: ++kitIds, x: player.x, z: player.z, dx: a.dx, dz: a.dz, d: 0, len: def.range, width: def.area, power, hit: new Set([player.id]) };
    gusts.push(g);
    events.emit(currentTick, 'review_gust', { id: g.id, x: r2(g.x), z: r2(g.z), dx: r2(g.dx), dz: r2(g.dz), len: g.len, width: g.width, speed: K3.gust.speed * 60 });
  }
  function gustTick() {
    for (let i = gusts.length - 1; i >= 0; i--) {
      const g = gusts[i];
      g.d = Math.min(g.len, g.d + K3.gust.speed);
      // kit v1.5 R39: the wind rolls seeds with the wall and drops them where it ends.
      g.rolled ||= [];
      for (const sd of seeds) {
        if (sd.rolling || !inRect({ x: sd.x, z: sd.z, radius: 0.1 }, g.x, g.z, g.dx, g.dz, g.d, g.width)) continue;
        sd.rolling = g.id;
        sd.off = (sd.x - g.x) * -g.dz + (sd.z - g.z) * g.dx;
        g.rolled.push(sd);
      }
      for (const sd of g.rolled) {
        if (!seeds.includes(sd)) continue;
        sd.x = g.x + g.dx * g.d - g.dz * sd.off;
        sd.z = g.z + g.dz * g.d + g.dx * sd.off;
        if (currentTick % 2 === 0 || g.d >= g.len) events.emit(currentTick, 'review_seed_move', { id: sd.id, x: r2(sd.x), z: r2(sd.z) });
        if (g.d >= g.len) sd.rolling = 0;
      }
      // R38 Wind carries: a waiting Puffcap or a spore cloud in the wind loads it with spores.
      for (let j = puffs.length - 1; j >= 0; j--) if (inRect({ x: puffs[j].x, z: puffs[j].z, radius: 0.2 }, g.x, g.z, g.dx, g.dz, g.d, g.width)) { burstPuff(j); g.spores = true; }
      if (!g.spores) for (const c of clouds) if (inRect({ x: c.x, z: c.z, radius: c.r * 0.6 }, g.x, g.z, g.dx, g.dz, g.d, g.width)) g.spores = true;
      if (g.spores && !g.sporeSaid) { g.sporeSaid = true; events.emit(currentTick, 'review_gust_spores', { id: g.id }); }
      for (const e of registry.all()) {
        if (g.hit.has(e.id) || !(e.hp > 0)) continue;
        const ally = e.partyIndex !== undefined;
        if (!ally && !foeOk(e)) continue;
        if (!inRect(e, g.x, g.z, g.dx, g.dz, g.d, g.width)) continue;
        g.hit.add(e.id);
        if (ally) {
          healLanded(e, g.power, { healer: player.id, source: 'hearthsong' });
          combat.status.apply(e, 'haste', K3.gust.haste, K3.gust.hasteTicks, currentTick, player.id);
          events.emit(currentTick, 'review_gust_ally', { target: e.id, secs: K3.gust.hasteTicks / 60 }); // R14: petals while hasted
        } else if (!bossy(e)) {
          if (g.spores) { combat.status.apply(e, 'exposed', 0.2, 240, currentTick, player.id); events.emit(currentTick, 'review_spores', { target: e.id }); } // R38
          e.kbVx = (g.dx * K3.gust.push) / K3.gust.pushTicks;
          e.kbVz = (g.dz * K3.gust.push) / K3.gust.pushTicks;
          e.kbTicks = K3.gust.pushTicks;
          combat.status.apply(e, 'slow', K3.gust.slow, K3.gust.slowTicks, currentTick, player.id);
          events.emit(currentTick, 'review_gust_push', { target: e.id });
        }
      }
      if (g.d >= g.len) { gusts.splice(i, 1); events.emit(currentTick, 'review_gust_end', { id: g.id }); }
    }
  }
  // S16 Firefly Swarm: ally, foe, ally, foe.
  const swarms = [];
  globalThis.__reviewSwarms = swarms;
  function swarmCast(def, power) {
    const t = hurtNear(player.x, player.z, def.range, true);
    if (!t) return;
    for (const old of swarms.splice(0)) events.emit(currentTick, 'review_swarm_end', { id: old.id });
    const w = { id: ++kitIds, x: player.x, z: player.z, target: t.id, foe: false, state: 'fly', stops: K3.swarm.stops, power, until: 0, next: 0 };
    swarms.push(w);
    events.emit(currentTick, 'review_swarm', { id: w.id, target: t.id });
  }
  function swarmNext(w) {
    w.stops -= 1;
    if (w.stops <= 0) return false;
    const wantFoe = !w.foe;
    const foe = nearestFoe(w.x, w.z, K3.swarm.hop, new Set([w.target]));
    const ally = hurtNear(w.x, w.z, K3.swarm.hop, true, new Set([w.target]));
    const pick = wantFoe ? (foe ? [foe, true] : ally ? [ally, false] : null) : ally ? [ally, false] : foe ? [foe, true] : null;
    if (!pick) return false;
    w.target = pick[0].id;
    w.foe = pick[1];
    w.state = 'fly';
    events.emit(currentTick, 'review_swarm_hop', { id: w.id, target: w.target, foe: w.foe });
    return true;
  }
  function swarmTick() {
    for (let i = swarms.length - 1; i >= 0; i--) {
      const w = swarms[i];
      const t = registry.byId(w.target);
      const gone = !t || !(t.hp > 0);
      let alive = true;
      if (w.state === 'fly') {
        if (gone) alive = swarmNext(w);
        else {
          const dx = t.x - w.x, dz = t.z - w.z, d = Math.hypot(dx, dz);
          if (d > K3.swarm.speed + 0.2) { w.x += (dx / d) * K3.swarm.speed; w.z += (dz / d) * K3.swarm.speed; }
          else {
            w.state = 'stay';
            w.until = currentTick + K3.swarm.stay;
            w.next = currentTick;
            if (!w.foe) {
              const h = addHot(t, `${t.id}|swarm`, 'swarm', player.id, K3.swarm.moss, 3, 3);
              hotTick(h, `${t.id}|swarm`);
            }
            events.emit(currentTick, 'review_swarm_stay', { id: w.id, target: t.id, foe: w.foe });
          }
        }
      } else {
        if (gone) alive = swarmNext(w);
        else {
          w.x = t.x; w.z = t.z;
          if (w.foe && currentTick >= w.next && currentTick < w.until) { w.next = currentTick + 60; hit(t, w.power, 'lantern_ward'); }
          if (currentTick >= w.until) alive = swarmNext(w);
        }
      }
      if (!alive) { swarms.splice(i, 1); events.emit(currentTick, 'review_swarm_end', { id: w.id }); }
    }
  }
  // S20 Scatter Seeds: three seeds round her aim point.
  function scatterCast(def) {
    const a = aimAt(def.range);
    const n = def.count || 3;
    for (let k = 0; k < n; k++) {
      const ang = Math.PI / 2 + (k * Math.PI * 2) / n;
      dropSeed(a.x + Math.cos(ang) * K3.scatter.gap, a.z + Math.sin(ang) * K3.scatter.gap, player);
    }
  }
  // S21 Rootspear: a row of root spears after 0.4 s.
  const spears = [];
  function spearCast(def, power) {
    const a = aimAt(1);
    const sp = { id: ++kitIds, x: player.x, z: player.z, dx: a.dx, dz: a.dz, len: def.range, width: def.area, power, at: currentTick + K3.spear.delay };
    spears.push(sp);
    events.emit(currentTick, 'review_spear_warn', { id: sp.id, x: r2(sp.x), z: r2(sp.z), dx: r2(sp.dx), dz: r2(sp.dz), len: sp.len, width: sp.width, secs: K3.spear.delay / 60 });
  }
  function spearTick() {
    for (let i = spears.length - 1; i >= 0; i--) {
      const sp = spears[i];
      if (currentTick < sp.at) continue;
      spears.splice(i, 1);
      events.emit(currentTick, 'review_spear', { id: sp.id, x: r2(sp.x), z: r2(sp.z), dx: r2(sp.dx), dz: r2(sp.dz), len: sp.len, width: sp.width });
      for (let j = puffs.length - 1; j >= 0; j--) if (inRect({ x: puffs[j].x, z: puffs[j].z, radius: 0.2 }, sp.x, sp.z, sp.dx, sp.dz, sp.len, sp.width)) burstPuff(j); // R37: roots wake
      for (const e of registry.all()) if (foeOk(e) && inRect(e, sp.x, sp.z, sp.dx, sp.dz, sp.len, sp.width)) hit(e, sp.power, 'pale_lance');
      for (let j = seeds.length - 1; j >= 0; j--) {
        const sd = seeds[j];
        if (!inRect({ x: sd.x, z: sd.z, radius: 0.1 }, sp.x, sp.z, sp.dx, sp.dz, sp.len, sp.width)) continue;
        seeds.splice(j, 1);
        events.emit(currentTick, 'review_seed_end', { id: sd.id, target: null, sprout: true });
        sprout(sd);
      }
      if (sprouty('pale_lance')) dropSeed(sp.x + sp.dx * sp.len, sp.z + sp.dz * sp.len, null); // kit v1.5 R50: Sprout
    }
  }
  // S22 Wispfall: 10 dives round her over 5 s.
  const falls = [];
  const dives = [];
  function fallCast(def, power) {
    const f = { id: ++kitIds, until: currentTick + K3.fall.ticks, next: currentTick + 6, last: null, power, reach: def.area };
    falls.push(f);
    events.emit(currentTick, 'review_fall', { id: f.id, r: f.reach, secs: K3.fall.ticks / 60 });
  }
  function fallTick() {
    for (let i = falls.length - 1; i >= 0; i--) {
      const f = falls[i];
      if (currentTick >= f.until || !(player.hp > 0)) { falls.splice(i, 1); events.emit(currentTick, 'review_fall_end', { id: f.id }); continue; }
      if (currentTick < f.next) continue;
      f.next = currentTick + K3.fall.every;
      const t = nearestFoe(player.x, player.z, f.reach, f.last != null ? new Set([f.last]) : null) || nearestFoe(player.x, player.z, f.reach);
      if (!t) continue;
      f.last = t.id;
      dives.push({ x: t.x, z: t.z, at: currentTick + K3.fall.delay, power: f.power });
      events.emit(currentTick, 'review_fall_dive', { id: f.id, target: t.id, x: r2(t.x), z: r2(t.z), secs: K3.fall.delay / 60 });
    }
    for (let i = dives.length - 1; i >= 0; i--) {
      const d = dives[i];
      if (currentTick < d.at) continue;
      dives.splice(i, 1);
      events.emit(currentTick, 'review_fall_land', { x: r2(d.x), z: r2(d.z), r: K3.fall.splash });
      for (const e of foesIn(d.x, d.z, K3.fall.splash)) hit(e, d.power, 'bell_toll');
      sproutNear(d.x, d.z, K3.fall.splash); // kit v1.5 R26: light wakes
    }
  }
  // S23 Rootsnare: drag in for 3 s, then clench.
  const snares = [];
  function snareCast(def, power) {
    const a = aimAt(def.range);
    const sn = { id: ++kitIds, x: a.x, z: a.z, r: def.area, until: currentTick + K3.snare.ticks, next: currentTick, power };
    snares.push(sn);
    events.emit(currentTick, 'review_snare', { id: sn.id, x: r2(sn.x), z: r2(sn.z), r: sn.r, secs: K3.snare.ticks / 60 });
    for (let j = seeds.length - 1; j >= 0; j--) if (Math.hypot(seeds[j].x - sn.x, seeds[j].z - sn.z) <= sn.r) sproutSeed(j); // R21, R37: roots wake
  }
  function snareTick() {
    for (let i = snares.length - 1; i >= 0; i--) {
      const sn = snares[i];
      const inside = foesIn(sn.x, sn.z, sn.r);
      if (currentTick >= sn.until) {
        snares.splice(i, 1);
        events.emit(currentTick, 'review_snare_clench', { id: sn.id });
        for (const e of inside) {
          hit(e, K3.snare.clench, 'rootsnare');
          if (!bossy(e) && e.hp > 0) combat.status.apply(e, 'stun', 1, K3.snare.hold, currentTick, player.id);
        }
        continue;
      }
      for (const e of inside) {
        if (bossy(e)) continue;
        combat.status.apply(e, 'slow', K3.snare.slow, 12, currentTick, player.id);
        const dx = sn.x - e.x, dz = sn.z - e.z, d = Math.hypot(dx, dz);
        if (d > 0.15) { e.kbVx = (dx / d) * K3.snare.drag; e.kbVz = (dz / d) * K3.snare.drag; e.kbTicks = Math.max(e.kbTicks || 0, 1); }
      }
      if (currentTick >= sn.next) { sn.next = currentTick + 60; for (const e of inside) hit(e, sn.power, 'rootsnare'); }
    }
  }
  // S24 Puffcap: a mushroom that bursts into a spore cloud.
  const puffs = [];
  const clouds = [];
  function puffCast(def, power) {
    const a = aimAt(def.range);
    while (puffs.length >= K3.puff.max) { const old = puffs.shift(); events.emit(currentTick, 'review_puff_end', { id: old.id }); }
    const pf = { id: ++kitIds, x: a.x, z: a.z, until: currentTick + K3.puff.wait, power, r: def.area };
    puffs.push(pf);
    events.emit(currentTick, 'review_puff', { id: pf.id, x: r2(pf.x), z: r2(pf.z), fromX: r2(player.x), fromZ: r2(player.z) });
  }
  function burstPuff(i) {
    const pf = puffs.splice(i, 1)[0];
    const c = { id: pf.id, x: pf.x, z: pf.z, r: pf.r, until: currentTick + K3.puff.ticks, next: currentTick, power: pf.power };
    clouds.push(c);
    events.emit(currentTick, 'review_puff_burst', { id: c.id, x: r2(c.x), z: r2(c.z), r: c.r, secs: K3.puff.ticks / 60 });
  }
  function puffTick() {
    for (let i = puffs.length - 1; i >= 0; i--) {
      const pf = puffs[i];
      if (currentTick < pf.until && !foesIn(pf.x, pf.z, K3.puff.trigger).length) continue;
      burstPuff(i);
    }
    for (let i = clouds.length - 1; i >= 0; i--) {
      const c = clouds[i];
      if (currentTick >= c.until) { clouds.splice(i, 1); events.emit(currentTick, 'review_cloud_end', { id: c.id }); continue; }
      if (currentTick < c.next) continue;
      c.next = currentTick + 60;
      for (const e of foesIn(c.x, c.z, c.r)) {
        combat.status.apply(e, 'exposed', K3.puff.exposed, 70, currentTick, player.id);
        hit(e, c.power, 'dawn_brand');
      }
    }
  }
  function kit3Tick() { spitTick(); heartTick(); gustTick(); swarmTick(); spearTick(); fallTick(); snareTick(); puffTick(); kit4Tick(); }
  const saplings = []; // S18: { id, x, z, until, next, heal, reach }
  const vines = []; // S25: { id, foe, left, next, power }
  let kitIds = 0;
  if (REVIEW_COMBO) {
    events.on('skill_bolt_despawn', (ev) => {
      if (ev.skill !== 'mending_bolt' || !ev.heal || ev.cause === 'impact') return;
      dropSeed(ev.x, ev.z, null);
    });
    globalThis.__reviewCast = (a, def, power, echo) => {
      if (a !== player) return;
      const K3CAST = { nova_bloom: heartCast, hearthsong: gustCast, lantern_ward: swarmCast, lantern_flurry: scatterCast, pale_lance: spearCast, bell_toll: fallCast, rootsnare: snareCast, dawn_brand: puffCast, guardian_bond: oakCast, restorative_wave: lingCast, quiet_hearth: hedgeCast };
      if (K3CAST[def.id]) return K3CAST[def.id](def, power);
      if (def.id === 'sanctuary') {
        if (echo && saplings.length) { saplings[saplings.length - 1].until += def.durationSec * 60; return; } // Echo: lives twice as long
        const ax = (player.aim ? player.aim.x : player.x) - player.x;
        const az = (player.aim ? player.aim.z : player.z) - player.z;
        const len = Math.hypot(ax, az);
        const k = len > def.range ? def.range / len : 1;
        const sp = { id: ++kitIds, x: player.x + ax * k, z: player.z + az * k, until: currentTick + Math.round(def.durationSec * 60), next: currentTick + KIT.sapling.every, heal: power, reach: def.area };
        const keep = hasTalent('twin_buds') ? 2 : 1;
        while (saplings.length >= keep) {
          const old = saplings.shift();
          events.emit(currentTick, 'review_sapling_end', { id: old.id });
        }
        saplings.push(sp);
        events.emit(currentTick, 'review_sapling', { id: sp.id, x: r2(sp.x), z: r2(sp.z), reach: sp.reach, secs: def.durationSec });
      } else if (def.id === 'mending_tide') {
        // S12 Dew Wave (Kesh 11-16): a rectangle along her aim, def.range long and def.area wide;
        // heals up to def.count other allies inside, nearest first.
        let dx = (player.aim ? player.aim.x : player.x) - player.x;
        let dz = (player.aim ? player.aim.z : player.z) - player.z;
        const dl = Math.hypot(dx, dz) || 1;
        dx /= dl; dz /= dl;
        const inside = [];
        for (const e of registry.all()) {
          if (e === player || e.partyIndex === undefined || !(e.hp > 0)) continue;
          const rx = e.x - player.x, rz = e.z - player.z;
          const along = rx * dx + rz * dz, across = Math.abs(rx * -dz + rz * dx);
          const pad = e.radius || 0.3;
          if (along < -pad || along > def.range + pad || across > def.area / 2 + pad) continue;
          inside.push([along, e]);
        }
        inside.sort((a, b) => a[0] - b[0]);
        events.emit(currentTick, 'review_rect', { x: r2(player.x), z: r2(player.z), dx: r2(dx), dz: r2(dz), len: def.range, width: def.area });
        for (const [, e] of inside.slice(0, def.count || 4)) {
          healLanded(e, power, { healer: player.id, source: 'mending_tide', critBonus: def.critBonus ?? 0 });
          if (combat.status.magnitude(e, 'slow', currentTick) > 0) { combat.status.clear(e, 'slow'); events.emit(currentTick, 'review_wash', { target: e.id }); } // kit v1.5 R28: it washes
        }
        waterWhere((q) => inRect({ x: q.x, z: q.z, radius: 0.15 }, player.x, player.z, dx, dz, def.range, def.area)); // R11: water grows
        if (sprouty('mending_tide')) dropSeed(player.x + dx * def.range, player.z + dz * def.range, { x: player.x, z: player.z }); // kit v1.5 R50: Sprout
      } else if (def.id === 'spirit_bolt') {
        const ax = player.aim ? player.aim.x : player.x;
        const az = player.aim ? player.aim.z : player.z;
        let best = null, bd = Infinity;
        for (const e of registry.all()) {
          if (!e.hittable || e.faction === 'party' || !(e.hp > 0)) continue;
          if (Math.hypot(e.x - player.x, e.z - player.z) > def.range) continue;
          const d = Math.hypot(e.x - ax, e.z - az);
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) return;
        const v = { id: ++kitIds, foe: best.id, left: KIT.vine.ticks, next: currentTick + KIT.vine.first, power };
        vines.push(v);
        events.emit(currentTick, 'review_vine', { id: v.id, target: best.id, secs: KIT.vine.ticks });
      }
    };
  }

  // ---- REVIEW-ONLY: kit v1.4 (Kesh 11-16 17:29, MOSSLIGHT_DRUID_REVIEW.md R9 to R38): the garden
  // (water grows, roots wake, wind carries), Elder Oak (S50) and the Oakling (S51).
  const K4 = {
    water: { more: 180, fast: 180, moss: 2, puff: 1.25 }, // R36
    shed: 8, // R17
    oak: { grow: 36, ticks: 480, heal: 6, slow: 0.25, leaf: 10, leafDelay: 24 }, // S50
    ling: { ticks: 600, guard: 6, speed: 4 / 60, every: 90, reach: 1.6, dmg: 9, push: 1.5, pushTicks: 10, slow: 0.3, slowTicks: 90 }, // S51
  };
  const oaks = [];
  const oaklings = [];
  globalThis.__reviewOaklings = oaklings;
  const dewZones = new Map(); // Dewfall zones (R13): id -> { x, z, r }
  if (REVIEW_COMBO) {
    events.on('zone_spawn', (ev) => { if (ev.skill === 'dewfall' && !ev.classId) dewZones.set(ev.id, { x: ev.x, z: ev.z, r: ev.radius }); });
    events.on('zone_expire', (ev) => dewZones.delete(ev.id));
    globalThis.__reviewSeedAt = (x, z) => dropSeed(x, z, null);
  }
  function sproutSeed(j) {
    const sd = seeds.splice(j, 1)[0];
    events.emit(currentTick, 'review_seed_end', { id: sd.id, target: null, sprout: true });
    sprout(sd);
  }
  function wet(q, x, z) {
    if (q.watered) return false;
    q.watered = true;
    events.emit(currentTick, 'review_water', { x: r2(x), z: r2(z) });
    return true;
  }
  // R36 Water grows: each plant and each Moss once.
  function waterWhere(test) {
    const gm = cb.gem; // kit v1.5 R49: the planted staff, once per planting
    if (gm && gm.planted && gm.phase !== 'home' && test(gm) && wet(gm, gm.x, gm.z)) {
      gm.fastUntil = currentTick + K5.staffFast;
      events.emit(currentTick, 'review_staff_water', { x: r2(gm.x), z: r2(gm.z), secs: K5.staffFast / 60 });
    }
    for (const h of hedges) { // S53: watered, +3 s and 9 a second for 3 s
      if (h.watered || ![0, -0.4, 0.4].some((k) => test({ x: h.x + h.ax * k * h.w, z: h.z + h.az * k * h.w }))) continue;
      h.watered = true;
      h.until += K5.hedge.wetTicks;
      h.wetUntil = currentTick + K5.hedge.wetTicks;
      events.emit(currentTick, 'review_water', { x: r2(h.x), z: r2(h.z) });
      events.emit(currentTick, 'review_hedge_water', { id: h.id, secs: K5.hedge.wetTicks / 60 });
    }
    for (let j = seeds.length - 1; j >= 0; j--) if (test(seeds[j])) { events.emit(currentTick, 'review_water', { x: r2(seeds[j].x), z: r2(seeds[j].z) }); sproutSeed(j); }
    for (const q of [...spitters, ...saplings, ...oaklings]) {
      if (!test(q) || !wet(q, q.x, q.z)) continue;
      q.until += K4.water.more;
      q.fastUntil = currentTick + K4.water.fast;
      if (q.kind === 'ling') events.emit(currentTick, 'review_ling_water', { id: q.id });
    }
    for (const pf of puffs) {
      if (!test(pf) || !wet(pf, pf.x, pf.z)) continue;
      pf.r = r2(pf.r * K4.water.puff);
      events.emit(currentTick, 'review_puff_grow', { id: pf.id, r: pf.r });
    }
    for (const [, h] of hots) {
      if (h.watered || !(h.t.hp > 0) || h.skill === 'perennial' || !test(h.t)) continue;
      h.watered = true;
      h.left += K4.water.moss;
      events.emit(currentTick, 'review_water', { x: r2(h.t.x), z: r2(h.t.z), moss: h.t.id });
      events.emit(currentTick, 'review_hot', { target: h.t.id, skill: h.skill, secs: h.left });
    }
  }
  // S50 Elder Oak: a great oak; allies under its crown heal, foes are slowed, plants do not wither.
  function oakCast(def, power) {
    const a = aimAt(def.range);
    for (const old of oaks.splice(0)) events.emit(currentTick, 'review_oak_end', { id: old.id, to: [] });
    const o = { id: ++kitIds, x: a.x, z: a.z, r: def.area, grown: currentTick + K4.oak.grow, until: currentTick + K4.oak.grow + K4.oak.ticks, next: currentTick + K4.oak.grow + 60, power };
    oaks.push(o);
    events.emit(currentTick, 'review_oak', { id: o.id, x: r2(o.x), z: r2(o.z), r: o.r, grow: K4.oak.grow / 60, secs: K4.oak.ticks / 60 });
  }
  const leafWisps = [];
  function oakTick() {
    for (let i = oaks.length - 1; i >= 0; i--) {
      const o = oaks[i];
      if (currentTick < o.grown) continue;
      const under = (q) => Math.hypot(q.x - o.x, q.z - o.z) <= o.r;
      const allies = registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0 && under(e));
      if (currentTick >= o.until) {
        oaks.splice(i, 1);
        events.emit(currentTick, 'review_oak_end', { id: o.id, to: allies.map((e) => e.id), x: r2(o.x), z: r2(o.z) });
        for (const e of allies) leafWisps.push({ t: e, at: currentTick + K4.oak.leafDelay });
        continue;
      }
      for (const e of foesIn(o.x, o.z, o.r)) if (!bossy(e)) combat.status.apply(e, 'slow', K4.oak.slow, 12, currentTick, player.id);
      for (let j = seeds.length - 1; j >= 0; j--) if (under(seeds[j])) sproutSeed(j);
      for (const q of [...spitters, ...saplings, ...oaklings, ...hedges]) if (under(q)) q.until += 1; // nothing withers under the crown
      for (const pf of puffs) if (under(pf)) pf.until += 1;
      if (currentTick >= o.next) {
        o.next += 60;
        for (const e of allies) healLanded(e, o.power, { healer: player.id, source: 'guardian_bond' });
        events.emit(currentTick, 'review_oak_tick', { id: o.id, to: allies.map((e) => e.id) });
      }
    }
    for (let i = leafWisps.length - 1; i >= 0; i--) {
      const w = leafWisps[i];
      if (currentTick < w.at) continue;
      leafWisps.splice(i, 1);
      if (w.t.hp > 0) healLanded(w.t, K4.oak.leaf, { healer: player.id, source: 'guardian_bond:leaf' });
    }
  }
  // S51 Oakling: a small tree-folk that walks to the ally who needs it and slams foes off them.
  function lingCast(def, power) {
    const a = aimAt(def.range);
    for (const old of oaklings.splice(0)) events.emit(currentTick, 'review_ling_end', { id: old.id });
    const q = { id: ++kitIds, kind: 'ling', x: a.x, z: a.z, until: currentTick + K4.ling.ticks, next: currentTick + 30, guard: null, power, face: 0 };
    oaklings.push(q);
    events.emit(currentTick, 'review_ling', { id: q.id, x: r2(q.x), z: r2(q.z) });
  }
  function lingTick() {
    for (let i = oaklings.length - 1; i >= 0; i--) {
      const q = oaklings[i];
      if (currentTick >= q.until) { oaklings.splice(i, 1); events.emit(currentTick, 'review_ling_end', { id: q.id }); continue; }
      const g = hurtNear(q.x, q.z, K4.ling.guard, false) || hurtNear(q.x, q.z, K4.ling.guard, true) || q.guardEnt;
      if (g && g.hp > 0) {
        q.guardEnt = g;
        q.guard = g.id;
        const f = nearestFoe(g.x, g.z, 3);
        // stand beside the ally, on the side of the nearest foe
        let sx = g.x + 0.75, sz = g.z;
        if (f) { const d = Math.hypot(f.x - g.x, f.z - g.z) || 1; sx = g.x + ((f.x - g.x) / d) * 0.75; sz = g.z + ((f.z - g.z) / d) * 0.75; }
        const dx = sx - q.x, dz = sz - q.z, d = Math.hypot(dx, dz);
        const step = K4.ling.speed;
        if (d > 0.05) { const k = Math.min(1, step / d); q.x += dx * k; q.z += dz * k; q.face = Math.atan2(dx, dz); q.moving = d > step; } else q.moving = false;
      } else q.moving = false;
      if (currentTick < q.next) continue;
      const anchor = q.guardEnt && q.guardEnt.hp > 0 ? q.guardEnt : q;
      let f = null, bd = Infinity;
      for (const e of registry.all()) {
        if (!foeOk(e) || Math.hypot(e.x - q.x, e.z - q.z) > K4.ling.reach + (e.radius || 0.3)) continue;
        const d = Math.hypot(e.x - anchor.x, e.z - anchor.z);
        if (d < bd) { bd = d; f = e; }
      }
      if (!f) continue;
      q.next = currentTick + (q.fastUntil > currentTick ? Math.round(K4.ling.every / 1.5) : K4.ling.every);
      q.face = Math.atan2(f.x - q.x, f.z - q.z);
      events.emit(currentTick, 'review_ling_slam', { id: q.id, target: f.id, x: r2(f.x), z: r2(f.z) });
      hit(f, q.power, 'restorative_wave');
      if (!bossy(f) && f.hp > 0) {
        const dx = f.x - anchor.x, dz = f.z - anchor.z, d = Math.hypot(dx, dz) || 1;
        f.kbVx = ((dx / d) * K4.ling.push) / K4.ling.pushTicks;
        f.kbVz = ((dz / d) * K4.ling.push) / K4.ling.pushTicks;
        f.kbTicks = K4.ling.pushTicks;
        combat.status.apply(f, 'slow', K4.ling.slow, K4.ling.slowTicks, currentTick, player.id);
      }
    }
  }
  // ---- REVIEW-ONLY: kit v1.5 (Kesh 11-16 19:45 "1 a, 2 yes, 3 build all", MOSSLIGHT_SKILL_KIT.md):
  // Swiftleaf comes back (R27), the Sprout node (R50), Bramble Hedge (S53). The other 1.5 rules
  // ride their own skills above (R25, R26, R28, R39, R45, R46, R49).
  const K5 = {
    back: { delay: 18, reach: 1.5, half: 0.5, speed: 8 / 60 }, // R27
    heartWake: 3, // R25
    gladeGap: 300, // R45: at most one wisp seed every 5 s
    staffFast: 180, // R49
    hedge: { ticks: 300, thick: 0.6, every: 60, dmg: 6, wetDmg: 9, wetTicks: 180, grow: 18 }, // S53
  };
  const backs = [];
  const hedges = [];
  if (REVIEW_COMBO) {
    globalThis.__reviewBacks = backs;
    globalThis.__reviewSprout ||= new Set(); // R50: skill ids that carry Sprout (the page sets it per clip)
  }
  const sprouty = (id) => !!(globalThis.__reviewSprout && globalThis.__reviewSprout.has(id));
  function sproutNear(x, z, r) {
    for (let j = seeds.length - 1; j >= 0; j--) if (!seeds[j].rolling && Math.hypot(seeds[j].x - x, seeds[j].z - z) <= r) sproutSeed(j);
  }
  const segDist = (px, pz, ax, az, bx, bz) => {
    const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
    const k = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2));
    return Math.hypot(px - ax - vx * k, pz - az - vz * k);
  };
  // R27: after its heal the leaf flies home; on the way it heals the most hurt other ally within
  // 1.5 u of its path for half (Moss bonus too). Never her. A heal that lands while one waits (a hop)
  // moves the start, so the hops come first.
  function leafBack(t, base) {
    const wait = backs.find((b) => b.state === 'wait');
    if (wait) { wait.x = t.x; wait.z = t.z; wait.at = currentTick + K5.back.delay; wait.not.add(t.id); return; }
    backs.push({ id: ++kitIds, state: 'wait', x: t.x, z: t.z, at: currentTick + K5.back.delay, base, not: new Set([t.id]), via: null });
  }
  function backTick() {
    for (let i = backs.length - 1; i >= 0; i--) {
      const b = backs[i];
      if (b.state === 'wait') {
        if (currentTick < b.at) continue;
        b.state = 'fly';
        let best = null, bs = 1;
        for (const e of registry.all()) {
          if (e === player || e.partyIndex === undefined || !(e.hp > 0) || e.hp >= e.maxHp || b.not.has(e.id)) continue;
          if (segDist(e.x, e.z, b.x, b.z, player.x, player.z) > K5.back.reach) continue;
          const share = e.hp / e.maxHp;
          if (share < bs) { bs = share; best = e; }
        }
        b.via = best ? best.id : null;
        events.emit(currentTick, 'review_leaf_back', { id: b.id, x: r2(b.x), z: r2(b.z), via: b.via });
      }
      const t = b.via != null ? registry.byId(b.via) : null;
      if (b.via != null && !(t && t.hp > 0)) b.via = null;
      const goal = b.via != null ? t : player;
      const dx = goal.x - b.x, dz = goal.z - b.z, d = Math.hypot(dx, dz);
      if (d > K5.back.speed + 0.25) { b.x += (dx / d) * K5.back.speed; b.z += (dz / d) * K5.back.speed; continue; }
      if (b.via != null) {
        const amt = Math.floor(b.base * K5.back.half * (hasMoss(t) ? KIT.swiftBonus : 1));
        healLanded(t, amt, { healer: player.id, source: 'swift_mend:back', critBonus: -1 });
        events.emit(currentTick, 'review_leaf_back_heal', { id: b.id, target: t.id, amount: amt });
        b.via = null;
        continue;
      }
      backs.splice(i, 1);
      events.emit(currentTick, 'review_leaf_back_end', { id: b.id });
    }
  }
  // S53 Bramble Hedge: a wall of hedge across her aim, 4 u wide and 0.6 u thick, its middle up to
  // 4 u away; grows in 0.3 s, stands 5 s. Walking foes cannot pass and take 6 a second on touch; a
  // boss tramples it (one tick, then it ends).
  function hedgeCast(def, power) {
    for (const old of hedges.splice(0)) events.emit(currentTick, 'review_hedge_end', { id: old.id }); // one hedge at a time
    const a = aimAt(def.range);
    const h = { id: ++kitIds, x: a.x, z: a.z, nx: a.dx, nz: a.dz, ax: -a.dz, az: a.dx, w: def.area, until: currentTick + K5.hedge.ticks, up: currentTick + K5.hedge.grow, side: new Map(), next: new Map(), wetUntil: 0, power };
    hedges.push(h);
    events.emit(currentTick, 'review_hedge', { id: h.id, x: r2(h.x), z: r2(h.z), dx: r2(h.ax), dz: r2(h.az), w: h.w, thick: K5.hedge.thick, secs: K5.hedge.ticks / 60, grow: K5.hedge.grow / 60 });
  }
  function hedgeTick() {
    for (let i = hedges.length - 1; i >= 0; i--) {
      const h = hedges[i];
      let end = currentTick >= h.until;
      const dmg = h.wetUntil > currentTick ? K5.hedge.wetDmg : K5.hedge.dmg;
      if (!end) for (const e of registry.all()) {
        if (!foeOk(e)) continue;
        const rx = e.x - h.x, rz = e.z - h.z, pad = e.radius || 0.3;
        const along = rx * h.ax + rz * h.az, across = rx * h.nx + rz * h.nz;
        const half = K5.hedge.thick / 2 + pad;
        if (Math.abs(along) > h.w / 2 + pad) { h.side.delete(e.id); continue; }
        if (Math.abs(across) > half + 0.06) { h.side.set(e.id, Math.sign(across) || 1); continue; }
        if (currentTick < h.up) continue; // still growing
        if (e.flying) { // a foe that flies crosses it and takes the damage while over it
          if (Math.abs(across) > K5.hedge.thick / 2) continue;
          if (currentTick >= (h.next.get(e.id) ?? 0)) { h.next.set(e.id, currentTick + K5.hedge.every); hit(e, dmg, 'quiet_hearth'); events.emit(currentTick, 'review_hedge_hit', { id: h.id, target: e.id }); }
          continue;
        }
        if (bossy(e)) {
          hit(e, dmg, 'quiet_hearth');
          events.emit(currentTick, 'review_hedge_hit', { id: h.id, target: e.id, trample: true });
          end = true;
          break;
        }
        const side = h.side.get(e.id) ?? (Math.sign(across) || 1);
        h.side.set(e.id, side);
        if (side * across < half) { // keep it on its own side
          const push = side * half - across;
          e.x += h.nx * push;
          e.z += h.nz * push;
        }
        if (currentTick >= (h.next.get(e.id) ?? 0)) {
          h.next.set(e.id, currentTick + K5.hedge.every);
          hit(e, dmg, 'quiet_hearth');
          events.emit(currentTick, 'review_hedge_hit', { id: h.id, target: e.id });
        }
      }
      if (end) { hedges.splice(i, 1); events.emit(currentTick, 'review_hedge_end', { id: h.id }); }
    }
  }
  function kit5Tick() { backTick(); hedgeTick(); }
  function kit4Tick() {
    kit5Tick();
    oakTick();
    lingTick();
    if (dewZones.size && currentTick % 6 === 0) for (const [, zn] of dewZones) waterWhere((q) => Math.hypot(q.x - zn.x, q.z - zn.z) <= zn.r); // R13
  }
  const lowestNear = (x, z, reach, withHer) => {
    let best = null, bs = 1;
    for (const e of registry.all()) {
      if (e.partyIndex === undefined || !(e.hp > 0) || e.hp >= e.maxHp || (!withHer && e === player)) continue;
      if (Math.hypot(e.x - x, e.z - z) > reach) continue;
      const share = e.hp / e.maxHp;
      if (share < bs) { bs = share; best = e; }
    }
    return best;
  };
  function kitTick() {
    gladeTick();
    kit3Tick();
    for (let i = seeds.length - 1; i >= 0; i--) {
      const sd = seeds[i];
      let hit = null;
      for (const e of registry.all()) {
        if (e.partyIndex === undefined || !(e.hp > 0) || e.hp >= e.maxHp) continue;
        if (Math.hypot(e.x - sd.x, e.z - sd.z) <= KIT.seed.reach + (e.radius || 0.3)) { hit = e; break; }
      }
      if (hit) healLanded(hit, KIT.seed.heal, { healer: player.id, source: 'mending_bolt:seed' });
      const wake = !hit && !sd.rolling && currentTick - sd.born >= KIT.seed.ripe && nearestFoe(sd.x, sd.z, KIT.seed.wake);
      if (hit || wake || currentTick >= sd.until) {
        seeds.splice(i, 1);
        events.emit(currentTick, 'review_seed_end', { id: sd.id, target: hit ? hit.id : null, sprout: !!wake });
        if (wake) sprout(sd);
      }
    }
    for (let i = saplings.length - 1; i >= 0; i--) {
      const sp = saplings[i];
      if (currentTick >= sp.next) {
        sp.next += sp.fastUntil > currentTick ? Math.round(KIT.sapling.every / 1.5) : KIT.sapling.every; // R36
        const m = lowestNear(sp.x, sp.z, sp.reach, true);
        if (m) {
          events.emit(currentTick, 'review_sapling_mote', { id: sp.id, target: m.id, x: r2(sp.x), z: r2(sp.z) });
          healLanded(m, sp.heal, { healer: player.id, source: 'sanctuary:mote' });
        }
      }
      if (currentTick >= sp.until) {
        saplings.splice(i, 1);
        // R17: it sheds its leaves; every ally within its reach is healed 8.
        const to = registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0 && Math.hypot(e.x - sp.x, e.z - sp.z) <= sp.reach);
        events.emit(currentTick, 'review_sapling_shed', { id: sp.id, x: r2(sp.x), z: r2(sp.z), to: to.map((e) => e.id) });
        for (const e of to) healLanded(e, K4.shed, { healer: player.id, source: 'sanctuary:shed' });
        events.emit(currentTick, 'review_sapling_end', { id: sp.id });
      }
    }
    for (let i = vines.length - 1; i >= 0; i--) {
      const v = vines[i];
      const foe = registry.byId(v.foe);
      if (foe) { v.fx = foe.x; v.fz = foe.z; }
      if (!foe || !(foe.hp > 0) || v.left <= 0 || !(player.hp > 0)) {
        if (v.fx != null && (v.killed || ((!foe || !(foe.hp > 0)) && v.left > 0))) dropSeed(v.fx, v.fz, null); // R23: the vine drops a seed where its foe fell (a fallen foe may leave the registry at once)
        vines.splice(i, 1);
        events.emit(currentTick, 'review_vine_end', { id: v.id });
        continue;
      }
      if (currentTick < v.next) continue;
      v.next += KIT.vine.every;
      v.left -= 1;
      combat.applyDamage(foe, v.power, { delivery: 'skill', shape: 'review', dirX: 0, dirZ: 0, attacker: player.id, source: 'spirit_bolt' });
      if (!(foe.hp > 0)) v.killed = true;
      const m = lowestNear(player.x, player.z, KIT.vine.reach, true);
      events.emit(currentTick, 'review_vine_tick', { id: v.id, target: v.foe, healed: m ? m.id : null });
      if (m) healLanded(m, KIT.vine.heal, { healer: player.id, source: 'spirit_bolt:vine' });
    }
  }
  function staffAt() {
    const g = cb.gem;
    if (!hasTalent('rooted_staff') || !g || g.phase === 'home' || currentTick - g.t0 < CB.drift) return null;
    return g;
  }
  function pathTick() {
    for (const [key, h] of hots) if (currentTick >= h.next) hotTick(h, key);
    if (wisps.size) wispTick();
    kitTick();
    if (player.reviewSapOn && player.reviewSap > 0.5 && currentTick % SAP.every === 0 && player.hp > 0) {
      // T17: every 0.5 s the gem pours up to 8 into the hurt ally with the lowest share of
      // health within reach of her, or (T27) of the planted staff.
      const staff = staffAt();
      let best = null, bs = 1, viaStaff = false;
      for (const e of registry.all()) {
        if (e === player || e.partyIndex === undefined || !(e.hp > 0) || e.hp >= e.maxHp) continue;
        const dHer = Math.hypot(e.x - player.x, e.z - player.z);
        const dStaff = staff ? Math.hypot(e.x - staff.x, e.z - staff.z) : Infinity;
        if (dHer > SAP.reach && dStaff > SAP.reach) continue;
        const share = e.hp / e.maxHp;
        if (share < bs) { bs = share; best = e; viaStaff = dStaff < dHer; }
      }
      if (best) {
        const amt = Math.min(SAP.pour, player.reviewSap, best.maxHp - best.hp);
        player.reviewSap -= amt;
        healLanded(best, amt, { healer: player.id, source: 'review_pour', critBonus: -1 });
        if (hasTalent('bounty')) combat.status.apply(best, 'inspired', 0.1, 180, currentTick, player.id); // T33
        events.emit(currentTick, 'review_pour', { target: best.id, amount: r2(amt), sap: r2(player.reviewSap), ...(viaStaff ? { fx: r2(staff.x), fz: r2(staff.z) } : {}) });
      }
    }
  }
  function fireBolt(x, z, dir, power, range, gem = false) {
    const b = projectiles.spawn(currentTick, { x, z, dirX: dir.x, dirZ: dir.z, speed: HEALER.basicSpeed, range, radius: HEALER.boltRadius, power, delivery: 'basic', faction: player.faction });
    if (gem && b) b.reviewGem = true; // REVIEW-ONLY: Rooted Staff (T27) counts the staff's own bolts
  }
  function gemTick() {
    const g = cb.gem;
    if (!g) return;
    const age = currentTick - g.t0;
    if (g.phase !== 'home' && age >= CB.drift + CB.float) { g.phase = 'home'; g.th = currentTick; }
    if (g.phase === 'home' && g.planted && !g.upSaid) { g.upSaid = true; events.emit(currentTick, 'review_staff_up', { x: r2(g.x), z: r2(g.z) }); } // kit v1.5 R44
    if (g.phase === 'home') { if (currentTick - g.th >= CB.home) cb.gem = null; return; }
    if (age < CB.drift) return; // the staff is still in the air
    g.x = g.sx + g.dx * CB.reach;
    g.z = g.sz + g.dz * CB.reach;
    if (!g.planted) { g.planted = true; events.emit(currentTick, 'review_staff_plant', { x: r2(g.sx + g.dx * 2.2), z: r2(g.sz + g.dz * 2.2), gx: r2(g.x), gz: r2(g.z) }); } // kit v1.5 R44: it takes root
    if (currentTick >= g.nextShot) {
      g.nextShot = currentTick + (g.fastUntil > currentTick ? Math.round(CB.every / 1.5) : CB.every); // R49: watered, 50% faster
      let best = null, bd = CB.seek;
      for (const t of registry.all()) {
        if (!t.hittable || t.faction === 'party' || !(t.hp > 0)) continue;
        const d = Math.hypot(t.x - g.x, t.z - g.z);
        if (d < bd) { bd = d; best = t; }
      }
      const dir = best ? { x: (best.x - g.x) / (bd || 1), z: (best.z - g.z) / (bd || 1) } : { x: g.dx, z: g.dz };
      fireBolt(g.x, g.z, dir, CB.gemPower, CB.gemRange, true);
    }
  }
  function resolveBasicReview(snapshot) {
    gemTick();
    pathTick();
    // Line 2 + choice 25 b: the 5% landing heal as she lands (0.37 s), at most once every 3 s (Kesh 11-16).
    if (cb.healAt != null && currentTick >= cb.healAt) {
      cb.healAt = null;
      if (player.hp > 0 && currentTick - (cb.dashHeal ?? -9999) >= 180) {
        cb.dashHeal = currentTick;
        combat.applyHeal(player, Math.round(player.maxHp * 0.05), { healer: player.id, source: 'review_dash' });
        events.emit(currentTick, 'review_dash_heal', { x: r2(player.x), z: r2(player.z) });
      }
    }
    if (!snapshot.basicAttackHeld) {
      if (currentTick - cb.last > CB.reset) cb.step = 0;
      return;
    }
    if (allySys.basicSuppressed()) return;
    if (currentTick < player.nextBasicTick) return;
    if (player.dashTicksLeft > 0) {
      deny('basic_attack', DENIAL.prioritySuppressed);
      return;
    }
    if (currentTick - cb.last > CB.reset) cb.step = 0;
    const dir = aimDirection();
    if (cb.step === 0) {
      if (cb.gem && cb.gem.phase !== 'home') {
        if (currentTick - cb.gem.t0 < CB.lock) return;
        cb.gem.phase = 'home';
        cb.gem.th = currentTick;
      }
    }
    const hit = cb.step + 1;
    if (hit < 3) fireBolt(player.x, player.z, dir, HEALER.basicPower, HEALER.basicRange);
    else cb.gem = { t0: currentTick, sx: player.x, sz: player.z, dx: dir.x, dz: dir.z, x: player.x, z: player.z, phase: 'out', nextShot: currentTick + CB.drift + 4 };
    events.emit(currentTick, 'basic_fire', { x: r2(player.x), z: r2(player.z), dx: r2(dir.x), dz: r2(dir.z), hit, gem: hit === 3 });
    cb.last = currentTick;
    cb.step = hit % 3;
    player.nextBasicTick = currentTick + (hit === 1 ? CB.gap2 : hit === 2 ? CB.gap3 : CB.lock);
  }

  function resolveBasic(snapshot) {
    if (REVIEW_COMBO) return resolveBasicReview(snapshot);
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
    if (REVIEW_COMBO) {
      // REVIEW-ONLY (Kesh 11-16 "make it like model page"): 0.06 s dip, travel
      // 1.8 u over 0.27 s, untouchable 0 to 0.35 s, the heal at 0.37 s.
      player.dashVel = { x: (dx * DODGE.distance) / 16, z: (dz * DODGE.distance) / 16 };
      player.dashTicksLeft = 20;
      player.dashDip = 4;
      player.iframeUntilTick = currentTick + 21;
      cb.healAt = currentTick + 22;
      events.emit(currentTick, 'review_dash', { x: r2(player.x), z: r2(player.z), dx: r2(dx), dz: r2(dz), len: DODGE.distance }); // kit v1.5 R48
    }
    // RELICS (Ash Feather): the relic run's dodge cooldown factor.
    const M = combat.getMods ? combat.getMods() : null;
    const cd = M && M.active() ? Math.round(DODGE.cooldownTicks * M.dodgeCdMul()) : DODGE.cooldownTicks;
    player.dodgeReadyTick = currentTick + cd;
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

  // @gnt:M5b SEAT-INPUTS begin — network play extends this to
  // step(tick, snapshot, seatInputs) where seatInputs[partyIndex] is a human
  // guest's snapshot for that ally seat (absent -> the §12 AI), plus the
  // replica flag (world.setReplica: a guest's world is never stepped and
  // refuses mutating cmd()s, PLAN §3.7). Single-player never passes either
  // and must stay bit-identical (PLAN gate G5b.8).
  //
  // seatInputs (host of a network session only, sim/netseats.js):
  //   { seats: { [1..3]: SeatInput }, reasons, player: 'human'|'ai', rewind }
  // allySys.setSeatInputs() runs FIRST (controller changes emit
  // `seat_control` on this tick), then the usual two phases: the human seats
  // move in the ally continuous pass and resolve in their party_index slot;
  // their E presses join the Healer's in ONE interactables pass (ascending
  // party index — a same-tick double use activates once).
  let replicaMode = false; // world.setReplica (M5b REPLICA): a guest never steps
  let seatsActive = false;
  const refusals = { steps: 0, cmds: 0, byName: {} };
  // Commands a replica still answers: pure reads of the replicated state.
  const REPLICA_READ_CMDS = new Set([
    'skillState', 'buildView', 'buildPreview', 'kitVerdict', 'buildVerdict', 'buildState',
    'allyState', 'reviveState', 'runState', 'wallet', 'draftPools', 'roomPlan',
    'difficultyTable', 'statusOf', 'contentState', 'netSeats',
    // PARTY: the replicated builds (a guest's probes / HUD reads).
    'partyView', 'partyState', 'partyPools', 'partyVerdicts', 'partyAiLog',
  ]);
  function step(tick, snapshot, seatInputs) {
    useMovementState(movement);
    if (replicaMode) {
      refusals.steps += 1;
      return;
    }
    currentTick = tick;
    if (seatInputs) {
      seatsActive = true;
      allySys.setSeatInputs(seatInputs, tick);
    } else if (seatsActive) {
      // The session ended: every seat returns to the §12 AI on this tick.
      seatsActive = false;
      allySys.setSeatInputs(null, tick);
    } else if (allySys.controllers().some((c, i) => i > 0 && c === 'human')) {
      // PARTY (BUILD_BRIEF §25.7, PLAN GP.9 (e)): a NETWORK save loaded as
      // single-player restores its human seat controllers — no input will
      // ever drive them here: every ally seat returns to the AI on the first
      // tick (seat_control), so the party page's network deadlines (armed
      // only with >= 2 humans) are cleared on that tick too.
      allySys.setSeatInputs(null, tick);
    }
    continuousPhase(snapshot);
    discretePhase(snapshot);
  }
  // Human seats' E presses resolve inside the interactables pass, together
  // with the Healer's, sorted by party index (sim/interactables.js
  // resolvePresses). With no human press this is the untouched original.
  {
    const rawInteractDiscrete = interactSys.discrete;
    interactSys.discrete = (snap) => {
      const extra = seatsActive ? allySys.humanInteracts() : null;
      if (!extra || extra.length === 0) return rawInteractDiscrete(snap);
      const own = snap && Array.isArray(snap.presses) ? snap.presses.find((p) => p.kind === 'interact') : null;
      rawInteractDiscrete(own ? { ...snap, presses: snap.presses.filter((p) => p.kind !== 'interact') } : snap);
      const list = own ? [{ actor: player, press: own }] : [];
      for (const x of extra) list.push(x);
      interactSys.resolvePresses(list);
      return undefined;
    };
  }
  // @gnt:M5b SEAT-INPUTS end

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
      // Every lasting zone (sim/zones.js): the Healer's, and the ally kits'
      // (Ground Crack / Caltrops / Detonating Charge and kin), which carry
      // their classId.
      zones: registry
        .all()
        .filter((e) => e.kind === 'zone')
        .map((z) => ({
          id: z.id,
          skill: z.skill,
          ...(z.classId ? { classId: z.classId } : {}),
          x: r2(z.x),
          z: r2(z.z),
          radius: z.radius,
          ticksDone: z.ticksDone,
          totalTicks: z.totalTicks,
          nextTickTick: z.nextTickTick,
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
      // @gnt:M4b HOSTILE-KINDS begin — new enemy kinds must appear here
      // (faction === 'hostile' test replacing the kind list, PLAN §2.2).
      enemies: registry
        .all()
        .filter(
          // Faction rule (PLAN §3.6 (d)): every living hostile body except the
          // boss (its own view) — burrowed moles and retreating enemies stay
          // listed; shots/globs carry no HP. Plus the simtest wisps.
          (e) => e.kind === 'wisp' || (e.faction === 'hostile' && e.hp > 0 && e.kind !== 'stag' && e.boss !== true)
        )
      // @gnt:M4b HOSTILE-KINDS end
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
    useMovementState(movement);
    switch (name) {
      case 'spawn': {
        const [type, x, z] = args; // ('dummy'|'wisp'|'boar'|'mantis', x, z)
        // Real §11 enemies (enemies block) — full AI/telegraph/juice pipeline.
        // M4b: every enemy archetype, with { elite, hpMul, dmgMul } (PLAN §6.4).
        if (enemies.hasType(type)) return enemies.debugSpawn(type, x, z, args[3] ?? null);
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
      // THE TIDECALLER (docs/TIDECALLER.md): the camp shows the party the
      // next campaign will take (scenes/camp.js, from the class and bench
      // settings), so the chosen class walks its own body before the run.
      // Refused while a run is live: a run keeps the lineup it started with.
      case 'campLineup': {
        if (runSys && runSys.isActive()) return { ok: false, reason: 'run_active' };
        return { ok: true, lineup: [...partySys.setLineup(args[0])] };
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
        // @gnt:M4b HOSTILE-KINDS2 begin (same rule as snapshotState).
        maintainPopulation = false;
        const hostiles = registry
          .all()
          .filter((e) => e.kind === 'wisp' || (e.faction === 'hostile' && e.hp > 0 && e.kind !== 'stag' && e.boss !== true));
        // @gnt:M4b HOSTILE-KINDS2 end
        for (const h of hostiles) {
          if (h.kind === 'wisp') killWisp(h);
          else combat.kill(h);
        }
        // A Brood Spider splits on death: sweep its young too (a no-op pass
        // for every other roster, so legacy traces are unchanged).
        let killed = hostiles.length;
        for (let pass = 0; pass < 3; pass++) {
          const young = registry.all().filter((e) => e.faction === 'hostile' && e.hp > 0 && e.state === 'active' && e.kind !== 'stag' && e.boss !== true && enemies.isEnemyKind(e.kind));
          if (young.length === 0) break;
          for (const h of young) combat.kill(h);
          killed += young.length;
        }
        return killed;
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
        return combat.applyDamage(t, HEALER.basicPower, { delivery: 'basic', shape: 'debug', dirX, dirZ });
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
          const r = combat.applyDamage(t, HEALER.basicPower, { delivery: 'basic', shape: 'debug', dirX: 1, dirZ: 0 });
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
        // Gauntlet debug commands (PLAN §6.4): each key routes ITS commands
        // from its own block — `const r = mySys.cmd(name, args); if (r !==
        // undefined) return r;` — never by editing another key's block.
        // @gnt:M4a CMD begin (setStatus / clearStatus / autopilot / startRun{act,challenge} ...)
        // @gnt:M4a CMD end
        // @gnt:M4b CMD begin (spawnHazard / spawnInteractable / hazardPhase / armKeg / setLayout ...)
        if (name === 'burrow') return enemies.setBurrow(args[0], args[1] !== false);
        // MENACE probe: { bodyId: u } of the live presence map ({} = none).
        if (name === 'threat') return enemies.threat();
        {
          const rc = layoutSys.cmd(name, args);
          if (rc !== undefined) return rc;
        }
        // @gnt:M4b CMD end
        // @gnt:M5b CMD begin (replica-mode refusal of mutating commands, seat control)
        // Read-only network-seat probe (replica refusal itself wraps cmd in
        // setReplica below, so it also covers the explicit cases above).
        if (name === 'netSeats') {
          return { controllers: allySys.controllers(), lag: allySys.lagStats(), replica: replicaMode, refusals: { ...refusals, byName: { ...refusals.byName } } };
        }
        if (name === 'lagCompensation') return allySys.setLagCompensation(args[0] !== false);
        // @gnt:M5b CMD end
        // @gnt:PARTY CMD begin (PLAN §16.11)
        {
          const pc = partyCmd(name, args);
          if (pc !== undefined) return pc;
        }
        // @gnt:PARTY CMD end
        const ran = runSys.cmd(name, args);
        if (ran !== undefined) return ran;
        const handled = allySys.cmd(name, args);
        if (handled !== undefined) return handled;
        console.warn(`__echoes.cmd('${name}') lands with a later block`);
        return null;
      }
    }
  }

  // PARTY debug / harness commands (PLAN §16.11). Seat-0 commands keep their
  // meaning; these address the ally seats.
  function partyCmd(name, args) {
    const P = partySys;
    switch (name) {
      case 'partyPools':
        return P.partyPools();
      case 'partyVerdicts':
        return P.partyVerdicts();
      case 'partyView':
        return P.view(args[0]);
      case 'partyState':
        return P.state();
      case 'partySwap':
        return P.swap(args[0], args[1], Number.isInteger(args[2]) ? args[2] : null, { by: 'cmd' });
      case 'partyReorder':
        return P.reorder(args[0], args[1], args[2]);
      case 'partyGrantNode':
        return P.grantNode(args[0], args[1], args[2] ?? 'grant');
      case 'partySocket': {
        const b = P.build(args[0]);
        return b ? b.socket(args[1], args[2], Number.isInteger(args[3]) ? args[3] : null) : { error: 'no_such_seat' };
      }
      case 'partyUnsocket': {
        const b = P.build(args[0]);
        return b ? b.unsocket(args[1], args[2]) : { error: 'no_such_seat' };
      }
      case 'partyAutoFill':
        return P.autoFill(args[0] ?? 'all');
      case 'partyMode':
        return args[0] === undefined ? P.mode() : P.setMode(args[0]);
      case 'partyPurse':
        return args[1] === undefined ? P.purse(args[0]) : P.setPurse(args[0], args[1]);
      case 'partyAiLog':
        return allySys.aiLog();
      case 'partyStress':
        return P.stress();
      case 'partyCast': {
        // ('partyCast', seat, slot, { x, z }?) — fires a loadout slot as a
        // press would (aim at the point, else the facing) — sim / VFX /
        // audio probes. Ignores the cooldown; starts it.
        const [seat, slot, at] = args;
        const a = P.body(seat);
        const id = P.slots(seat) ? P.slots(seat)[slot] : null;
        if (!a || !id) return { error: 'empty_slot' };
        const def = SKILLS_REF[id];
        if (def.shape === 'aura') return P.pulse(seat, id);
        const aim = at && Number.isFinite(at.x) ? { x: at.x, z: at.z } : { x: a.x + (a.faceX ?? 0) * 2, z: a.z + (a.faceZ ?? 1) * 2 };
        const l = Math.hypot(aim.x - a.x, aim.z - a.z) || 1;
        const d = { x: (aim.x - a.x) / l, z: (aim.z - a.z) / l };
        if (allySys.isHumanSeat(seat)) allySys.caster().cast(a, def, slot, currentTick, { mode: 'human', f: { aim, viewTick: currentTick }, tag: null, d });
        else {
          // An AI-held seat casts at the hostile nearest the aim point.
          let target = null;
          let bd = Infinity;
          for (const e of registry.all()) {
            if (e.faction !== 'hostile' || !e.hittable || !(e.hp > 0)) continue;
            const dd = (e.x - aim.x) ** 2 + (e.z - aim.z) ** 2;
            if (dd < bd) {
              bd = dd;
              target = e;
            }
          }
          allySys.caster().cast(a, def, slot, currentTick, { mode: 'ai', target });
        }
        const rdef = P.build(seat).resolveDef(def);
        if (Array.isArray(a.cds)) a.cds[slot] = currentTick + Math.max(30, Math.round((rdef.cd ?? 0) * TICK_HZ));
        return { ok: true, seat, slot, skill: id };
      }
      default:
        return undefined;
    }
  }

  // @gnt:M2 WORLD-STATE — serialize()/restore() of the world's own state and
  // every system's (PLAN §3.4) are exposed from this object; M2 adds its
  // members inside the WORLD-STATE begin/end block at the end of it.
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
    // PARTY: the party system (the ally builds) — pages, socket screen, HUD.
    partySystem: () => partySys,
    // Ally-block accessor (render layer reads the mark, the revive channels
    // and the per-ally AI state read-only; it never mutates sim state).
    allySystem: () => allySys,
    // Spawn telegraphs in flight (enemies block) — render-layer state sync.
    pendingSpawns: () => waves.pendingSpawnsList(),
    // ESCORT AND HOLD: the live room view (the sigil ring's light) — read-only.
    roomState: () => waves.roomState(),
    snapshotState,
    // This world's movement state (sim/movement.js): the save layer, the
    // replica and the camp scene read and write the world's own lists.
    movementState: () => movement,
    get tick() {
      return currentTick;
    },
    // @gnt:M2 WORLD-STATE begin
    // Complete-state capture for the save system (docs/gauntlet/PLAN.md §3.4).
    // saveState() hands out LIVE state (the save layer deep-clones the whole
    // tree once); loadState() receives a private clone and adopts it. Both
    // run ONLY at a tick boundary (clock.onTickEnd or between frames): the ①
    // deferred and ③ continuation queues hold closures mid-tick, so a capture
    // that finds either non-empty throws a named CapturePointError listing
    // what is pending (the save layer then retries at the next tick end).
    pendingQueues: () => ({
      deferred: deferred.length,
      continuations: continuations.length,
      carriers: deferred.map((d) => d.carrierOrdinal),
    }),
    saveState() {
      if (deferred.length > 0 || continuations.length > 0) {
        const err = new Error(
          `world.saveState outside a tick boundary: ${deferred.length} deferred maturation(s)` +
            ` (carriers ${deferred.map((d) => d.carrierOrdinal).join(', ') || '-'}) and ${continuations.length} continuation(s) pending`
        );
        err.name = 'CapturePointError';
        err.pending = { deferred: deferred.length, continuations: continuations.length };
        throw err;
      }
      return {
        world: { tick: currentTick, stats, maintainPopulation, harness },
        systems: {
          combat: combat.saveState(),
          skills: skillSys.saveState(),
          build: buildSys.saveState(),
          enemies: enemies.saveState(),
          waves: waves.saveState(),
          allies: allySys.saveState(),
          boss: bossSys.saveState(),
          run: runSys.saveState(),
          layout: layoutSys.saveState(),
          // PARTY (PLAN §16.6): the three ally builds, purses, the party stream.
          party: partySys.saveState(),
        },
      };
    },
    loadState(data) {
      const w = data && data.world;
      const s = data && data.systems;
      if (!w || !s || !Number.isFinite(w.tick)) throw new TypeError('world.loadState: expected { world, systems }');
      useMovementState(movement);
      currentTick = w.tick;
      // `stats` is shared by reference with the combat pipeline: patch in place.
      for (const k of Object.keys(stats)) if (!(k in (w.stats ?? {}))) delete stats[k];
      Object.assign(stats, w.stats ?? {});
      maintainPopulation = !!w.maintainPopulation;
      deferred = [];
      continuations.length = 0;
      combat.loadState(s.combat);
      skillSys.loadState(s.skills);
      buildSys.loadState(s.build);
      enemies.loadState(s.enemies);
      waves.loadState(s.waves);
      allySys.loadState(s.allies);
      bossSys.loadState(s.boss);
      runSys.loadState(s.run);
      layoutSys.loadState(s.layout);
      // PARTY: absent in an older tree (the save codec's MIGRATIONS[3] adds it;
      // an in-memory older payload keeps the starting loadouts).
      if (s.party) partySys.loadState(s.party);
      return true;
    },
    // @gnt:M2 WORLD-STATE end
    // @gnt:M5b REPLICA begin (setReplica / replica flag, PLAN §3.7)
    // A network guest's world is a REPLICA: never stepped (step() refuses),
    // written only by snapshot application (registry.restore + loadState),
    // and cmd() refuses every mutating command (returns null, counted) — so
    // the camp scene's run_end -> seatParty -> cmd('teleport') is inert on a
    // guest while its scene swap still happens. Read-only probes pass.
    setReplica(on) {
      replicaMode = !!on;
      if (replicaMode) {
        this.cmd = (name, ...args) => {
          if (REPLICA_READ_CMDS.has(name)) return cmd(name, ...args);
          refusals.cmds += 1;
          refusals.byName[name] = (refusals.byName[name] || 0) + 1;
          return null;
        };
      } else this.cmd = cmd;
      return replicaMode;
    },
    get replica() {
      return replicaMode;
    },
    replicaRefusals: () => ({ ...refusals, byName: { ...refusals.byName } }),
    // Seat control surface for the net session driver (host).
    seatControllers: () => allySys.controllers(),
    // @gnt:M5b REPLICA end
  };
}
