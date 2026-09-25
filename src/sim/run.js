// Run structure — the 8-room run (BUILD_BRIEF §2 "Run overview", §13 "Rooms &
// run lifecycle", §14 "Glint economy", §16 "Draft, shop, path flow").
//
// One run = 8 rooms: 1-6 combat (exactly 2 defend, 4 kill_all; room 1 is
// always kill_all per ruling A3), room 7 shop, room 8 boss. The RUN FRAME
// (defend positions, path pairings, reward-side randomization) is rolled ONCE
// at run start from the seeded stream and is immutable — so the same seed
// always plays the same shape of run.
//
// Room-clear boundary sequence (§13, fixed order from the clear tick):
//   1. combat_active := false
//   2. every live combat entity ends (projectiles, zones, surviving enemies)
//   3. all Downed party members revive at 30% max_hp
//   4. targeting state clears: mark -> none, heal overrides cleared, rally
//      point cleared
//   5. `room_cleared` + stipend +12 Glint for combat rooms
//   6. reward presentation (skipped if forfeited) -> path choice (rooms 1-5)
//      -> transition fade
//   7. next room's first tick: combat_active := true
// Steps 2-4 are shared with the enemy/ally blocks, which already hang their
// half off `room_cleared` (survivor retreat + shot despawn in sim/waves.js;
// free revives, mark and rally clearing in sim/allies.js) — this module owns
// the player-side transient sweep, the heal-override clear, the stipend, and
// the whole of step 6.
//
// PERSISTENCE (§13): cooldowns (skills + dodge), party HP + Downed state,
// owned skills + socket assignments, bench nodes, Glint, RNG stream state and
// the run frame all persist ACROSS every boundary — this module never touches
// them at a transition. CLEARED each boundary: targeting state, projectiles,
// zones. WIPED at run end: everything.
//
// Sim discipline: no DOM, no render imports, no wall clock. The UI in
// src/ui/run/** is a pure view over `view()` and drives the same entry points
// __echoes.cmd does.
//
// GAUNTLET (docs/gauntlet/PLAN.md §3.6 / §4.1 / §4.2, BUILD_BRIEF §23.1–23.2):
//   - startRun({ act = 1, challenge = 'standard' }) — the expedition and the
//     difficulty challenge ride run state (serialised); the curve reads run
//     state, never settings (contract (f)).
//   - every room rolls its LAYOUT from the act's room table (never the same
//     layout twice in a row; room 8 = the act's boss layout; the shop keeps
//     the last combat layout's biome) with the run RNG, right after the wave
//     schedule, and delivers it two ways: runSys.setRoomHooks({ enter(layout,
//     tick), exit(tick) }) for the sim content systems (M4b), and the
//     `layout_enter { room, act, layoutId, biome }` event right before
//     `room_enter` for presentation (contract (a)).
//   - wave rooms are planned with the act's roster and the §4.2 numbers; the
//     boss room scales the Stag (HP 2400·T, damage) and its act-tier adds.
//   - the status tracker (sim/status.js) announces status_apply / expire at
//     the end of every tick; the autopilot (sim/autopilot.js) is created here.
//
// LINEAR CAMPAIGN (CAMPAIGN, 2026-09-25 — docs/gauntlet/PLAN.md §12, the
// user's CRITICAL REFACTOR). This module is also the LEVEL DIRECTOR:
//   - startCampaign({ level }) opens a campaign AT a level; clearing a level
//     (the boss room's room_cleared — the Stag AND its adds dead) fires
//     `level_clear` exactly once (a per-level latch), resets the level
//     (director, boss, every hostile and transient, hazards + interactables
//     through the room hooks), restores the party per data/campaign.js
//     CARRY_RULES and enters phase 'transit' (the level-clear card). The
//     host presentation (src/campaign/manager.js) calls campaignAdvance()
//     once the next level is ready; the sim advances by itself at the card's
//     hardUntilTick, so the card can never hang. The next level rolls a fresh
//     run frame from the CARRIED run RNG stream and enters its room 1.
//   - only the FINAL level's clear ends the run (victory, CAMPAIGN COMPLETE
//     card, automatic return to camp after TRANSIT.victoryReturnTicks).
//   - abandonRun() is the pause menu's Quit to Lobby: run_end
//     { result: 'abandoned' } then return_to_camp, no end card.
//   - startRun({ act }) keeps its legacy contract — ONE level (a 'single'
//     run: the Stag clear -> victory -> camp) for the act runner, simtrace,
//     ?run=1 and every probe written against it.
//   - view() keeps its exact shape (the Node golden traces hash it); the
//     campaign is read through campaign(), and no new event fires before the
//     first level clear, so the 9 goldens stay bit-identical.
import { TICK_HZ, SKILL_SLOTS } from '../core/constants.js';
import { PARTY_ALLIES, STARTING_SKILLS, SKILLS } from './skills.js';
import { createDraftSystem, SPOILS_PER_CLEAR } from './draft.js';
import { NODES } from './nodes.js';
import { levelFor, ACT_IDS } from '../data/levels.js';
import { difficulty, CHALLENGE } from '../data/difficulty.js';
import { createStatusTracker, STATUS_KINDS } from './status.js';
import { createAutopilot } from './autopilot.js';
import {
  CARRY_RULES,
  TRANSIT,
  FIRST_LEVEL,
  nextLevel,
  isLevel,
  grantFor,
  campaignRules,
} from '../data/campaign.js';

// Plain-data deep copy (sim state only — structuredClone keeps -Infinity/NaN).
const cloneData = (v) => (v === null || v === undefined ? v : structuredClone(v));

const r2 = (v) => Math.round(v * 100) / 100;

export const RUN = Object.freeze({
  rooms: 8, // §2
  combatRooms: 6, // rooms 1-6
  defendCount: 2, // §2: exactly 2 of rooms 1-6 are defend
  shopRoom: 7, // §2 fixed
  bossRoom: 8, // §2 fixed
  stipend: 12, // §14 clear stipend, per combat-room clear (incl. boss)
  startingGlint: 0, // §14
  shopWallet: 72, // §14 deterministic wallet at the shop = 0 + 12x6
  spoilsPerClear: SPOILS_PER_CLEAR, // M4c: nodes dropped on the bench per combat-room clear (rooms 1-6)
  pathRooms: 5, // §2: rooms 1-5 clear -> path choice
  fadeTicks: Math.round(0.3 * TICK_HZ), // §16 enter/exit <= 300 ms fades
});

// §16 path doors carry ONLY these two glyph channels.
export const WIN_GLYPH = Object.freeze({ kill_all: '⚔', defend: '⛨', boss: '☠' });
export const REWARD_GLYPH = Object.freeze({ skill: '✦', node: '◈' });

export function createRunSystem({
  rng,
  registry,
  events,
  getTick,
  player,
  waves,
  enemies,
  boss,
  skillSys,
  buildSys,
  allySys,
  combat,
}) {
  const draft = createDraftSystem({
    rng,
    build: () => buildSys,
    slots: () => skillSys.slotsView(),
  });
  // Late-bound cross links between the skill kit and the build system (both
  // exist before the run system): Resonance's per-cast hook, and Echo's
  // recasts / passive Reapply pulses through the kit's own delivery.
  if (typeof skillSys.attachBuild === 'function') skillSys.attachBuild(buildSys);
  if (typeof buildSys.attachSkills === 'function') buildSys.attachSkills(skillSys);
  const statusTracker = createStatusTracker({ registry, events, getTick });
  const autopilot = createAutopilot({
    registry,
    player,
    run: () => api,
    skills: skillSys,
    build: () => buildSys,
  });

  // §2 "all run state wiped at run end" / §18 "Corruption never touches
  // Camp": after the first run has been played, an enemy may spawn ONLY while
  // a run is in live combat. Before any run the ?room=/?scene=arena harness
  // keeps its ungated spawns. The same predicate gates kill hitstop
  // (sim/world.js) so a stray kill can never stall the sim on an end card.
  function combatAllowed() {
    return !everStarted || (active && phase === 'combat');
  }
  enemies.setSpawnGate(combatAllowed);

  let active = false;
  let roomIndex = 0; // 1..8 while a run is live
  let phase = 'idle'; // idle | combat | reward | path | shop | fade | victory | defeat
  let wallet = RUN.startingGlint;
  let frame = null;
  let reward = null; // live draft candidate
  let path = null; // live path offer
  let shop = null; // live shelf
  let summary = null; // frozen run summary for the end screens
  let pendingRoom = 0; // room the fade is walking toward
  let fadeUntilTick = 0;
  let rewardFor = {}; // room index -> promised reward type
  let clearedRooms = 0; // COMBAT rooms cleared — drives the §14 stipend only
  let roomsDone = 0; // every room left behind (combat + the shop) — the §18 summary row
  let startTick = 0;
  let everStarted = false; // once true, enemies exist only inside live combat
  // M4c clear spoils: the last drop `{ room, nodes: [id...] }` (the reward page
  // names it) and the run's running total (the end card / probes).
  let spoils = null;
  let spoilsTotal = 0;
  // Expedition state (serialised with the run).
  let act = 1;
  let challenge = 'standard';
  let layout = null; // { act, layoutId, biome, room, mode } of the live room
  let lastCombatLayout = null; // the "never the same layout twice in a row" memory
  let roomPlanView = null; // difficulty numbers of the live room (probe)
  let roomHooks = { enter: null, exit: null }; // M4b's content systems (contract (a))
  // Linear campaign (PLAN §12.2) — plain data, serialised with the run:
  //   { mode: 'campaign'|'single', harness, startLevel, level, index,
  //     levels: [{ level, index, startTick, rooms, cleared, ticks }],
  //     startTick, levelStartTick, clearedAt, card, grant, transitions }
  // card (phase 'transit') = { kind: 'clear'|'depart', from, to, startTick,
  //   untilTick, minSkipTick, hardUntilTick, summary }.
  let campaign = null;
  // CAMPAIGN COMPLETE card -> camp at this tick (survives the run-end wipe).
  let autoReturnTick = null;

  // ------------------------------------------------------------ run frame --
  // ONE fixed roll sequence (defend positions, then the 5 path side bits) so a
  // seed reproduces the frame exactly. Room 1 is always kill_all (A3).
  function rollFrame() {
    const modes = new Array(RUN.rooms).fill('kill_all');
    const candidates = [1, 2, 3, 4, 5]; // 0-based indices of rooms 2..6
    const defendAt = [];
    for (let i = 0; i < RUN.defendCount; i++) {
      const pick = candidates.splice(rng.int(candidates.length), 1)[0];
      modes[pick] = 'defend';
      defendAt.push(pick + 1);
    }
    defendAt.sort((a, b) => a - b);
    modes[RUN.shopRoom - 1] = 'shop';
    modes[RUN.bossRoom - 1] = 'boss';
    // Reward-side randomization for the 5 path screens: 0 = skill door on the
    // left, 1 = skill door on the right. Every pairing has exactly one skill
    // and one node option (§16).
    const sides = [];
    for (let i = 0; i < RUN.pathRooms; i++) sides.push(rng.int(2));
    return { seed: rng.seed, modes, defendAt, sides };
  }

  // -------------------------------------------------------------- lifecycle --
  // startRun({ act, challenge }) — the legacy SINGLE-LEVEL run (harness /
  // probes / act runner / ?run=1): one level, the Stag clear ends it with
  // victory. A start past the first level still gets the starter grant (PLAN
  // §12.4), so the act runner measures exactly "a Level-N start".
  function startRun(opts = {}) {
    const o = opts && typeof opts === 'object' ? opts : {};
    openRun({ act: o.act, challenge: o.challenge, mode: 'single', harness: true });
    enterRoom(1);
    return view();
  }

  // startCampaign({ level, challenge, depart, harness }) — a CAMPAIGN from
  // `level` through the final level (PLAN §12.2). `depart`: open on the
  // setting-out card (phase 'transit', kind 'depart') so the presentation can
  // load the level first — always used for a Level-N start from the Level
  // Select, and for Begin Run when Level 1's assets are not resident yet.
  // `harness`: started by a developer path that bypasses the unlock chain
  // (?level=N, cmd('startCampaign')) — the save lock check honours it.
  function startCampaign(opts = {}) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const level = isLevel(o.level ?? o.act) ? Number(o.level ?? o.act) : FIRST_LEVEL;
    openRun({ act: level, challenge: o.challenge, mode: 'campaign', harness: !!o.harness });
    if (o.depart) beginTransit('depart', null, level, getTick());
    else enterRoom(1);
    return view();
  }

  function openRun({ act: a, challenge: c, mode, harness }) {
    wipeState({ silent: true });
    autoReturnTick = null;
    act = ACT_IDS.includes(Number(a)) ? Number(a) : 1;
    challenge = CHALLENGE[c] ? c : 'standard';
    frame = rollFrame();
    active = true;
    everStarted = true;
    wallet = RUN.startingGlint;
    clearedRooms = 0;
    roomsDone = 0;
    rewardFor = { 1: 'skill' }; // §2: room 1's reward is always a Skill draft
    summary = null;
    spoils = null;
    spoilsTotal = 0;
    startTick = getTick();
    campaign = {
      mode,
      harness: !!harness,
      startLevel: act,
      level: act,
      index: 1,
      levels: [{ level: act, index: 1, startTick, rooms: 0, cleared: false, ticks: 0 }],
      startTick,
      levelStartTick: startTick,
      clearedAt: 0,
      card: null,
      grant: null,
      transitions: 0,
    };
    // Payload unchanged since v0.5.x (the goldens hash every event).
    events.emit(getTick(), 'run_start', {
      seed: frame.seed,
      modes: [...frame.modes],
      defendAt: [...frame.defendAt],
      sides: [...frame.sides],
      act,
      actName: levelFor(act).name,
      challenge,
    });
    if (act !== FIRST_LEVEL) applyStarterGrant(act);
  }

  // PLAN §12.4 starter grant for a start AT level N > 1: skill draws, node
  // draws in pairs (the clear-spoils rule) each followed by the shared
  // auto-fill, legendary draws, then Glint. Fixed draw order off the run RNG
  // (right after the run frame), no combat active (phase idle), so the same
  // seed always grants the same kit.
  function applyStarterGrant(level) {
    const g = grantFor(level);
    if (!g) return null;
    const tick = getTick();
    const skills = [];
    for (let i = 0; i < (g.skills ?? 0); i++) {
      const pool = draft.skillPool();
      if (pool.length === 0) break;
      const id = pool[rng.int(pool.length)];
      const r = skillSys.giveSkill(id);
      if (r && r.error) break;
      skills.push(id);
    }
    const nodes = [];
    for (let left = g.nodes ?? 0; left > 0; ) {
      const ids = draft.spoils(Math.min(2, left));
      if (ids.length === 0) break;
      for (const id of ids) {
        buildSys.grantNode(id, 'grant');
        nodes.push(id);
      }
      left -= ids.length;
      buildSys.autoFill();
    }
    for (let i = 0; i < (g.legendaries ?? 0); i++) {
      const pool = draft.nodePool().filter((id) => NODES[id] && NODES[id].rarity === 'legendary');
      if (pool.length === 0) break;
      const id = pool[rng.int(pool.length)];
      buildSys.grantNode(id, 'grant');
      nodes.push(id);
      buildSys.autoFill();
    }
    if (g.glint) gainGlint(g.glint, 'starter_grant');
    campaign.grant = { level, skills, nodes, glint: g.glint ?? 0 };
    events.emit(tick, 'starter_grant', { level, skills: [...skills], nodes: [...nodes], glint: g.glint ?? 0 });
    return campaign.grant;
  }

  // §4.1 room table roll: one layout per combat room from the act's pool,
  // never the one the previous combat room used. Drawn with the run RNG after
  // the wave schedule (PLAN §3.6 (a)).
  function rollLayout(n, mode) {
    const level = levelFor(act);
    if (mode === 'boss') return level.bossLayout;
    if (mode === 'shop') return lastCombatLayout ?? level.layouts[0];
    const pool = level.layouts.filter((id) => id !== lastCombatLayout);
    const pick = pool.length > 0 ? pool[rng.int(pool.length)] : level.layouts[0];
    lastCombatLayout = pick;
    return pick;
  }

  function exitRoom(tick) {
    if (layout && typeof roomHooks.exit === 'function') roomHooks.exit(tick);
    layout = null;
  }

  function positionParty() {
    // Rooms are separate arenas: the party walks in at the entry arc.
    player.x = 0;
    player.z = 0;
    player.px = 0;
    player.pz = 0;
    for (const spec of PARTY_ALLIES) {
      const a = registry.all().find((e) => e.kind === 'ally' && e.partyIndex === spec.partyIndex);
      if (!a) continue;
      a.x = spec.x;
      a.z = spec.z;
      a.px = spec.x;
      a.pz = spec.z;
    }
  }

  function enterRoom(n) {
    const tick = getTick();
    exitRoom(tick);
    roomIndex = n;
    const mode = frame.modes[n - 1];
    const level = levelFor(act);
    reward = null;
    path = null;
    positionParty();
    const combatRoom = mode === 'kill_all' || mode === 'defend';
    const diff = difficulty(act, Math.min(6, n), challenge);
    if (combatRoom) waves.planRoom(mode, { act, room: n, challenge, level, diff });
    // Layout AFTER the schedule (one fixed roll order per room).
    const layoutId = rollLayout(n, mode);
    layout = { act, layoutId, biome: level.biome, room: n, mode };
    roomPlanView = {
      act,
      room: n,
      mode,
      challenge,
      layoutId,
      hpMul: combatRoom ? diff.hpMul : null,
      dmgMul: combatRoom ? diff.dmgMul : null,
      budget: mode === 'kill_all' ? diff.budget : mode === 'defend' ? diff.defendBudget : null,
      eliteChance: combatRoom ? diff.eliteChance : null,
      waveIntervalTicks: mode === 'kill_all' ? diff.waveIntervalTicks : null,
      waystoneHp: mode === 'defend' ? diff.waystoneHp : null,
      bossHp: mode === 'boss' ? diff.bossHp : null,
      bossDmgMul: mode === 'boss' ? diff.bossDmgMul : null,
      addHpMul: mode === 'boss' ? diff.addHpMul : null,
      addDmgMul: mode === 'boss' ? diff.addDmgMul : null,
    };
    if (typeof roomHooks.enter === 'function') roomHooks.enter({ ...layout }, tick);
    events.emit(tick, 'layout_enter', { room: n, act, layoutId, biome: level.biome, mode });
    events.emit(tick, 'room_enter', {
      index: n,
      mode,
      reward: rewardFor[n] ?? null,
      wallet,
      act,
      layoutId,
    });
    if (combatRoom) {
      phase = 'combat'; // §13 step 7: next room's first tick, combat_active := true
      waves.beginRoom();
    } else if (mode === 'shop') {
      phase = 'shop';
      openShop();
    } else if (mode === 'boss') {
      phase = 'combat';
      enemies.reset();
      // §23.1/§23.2: the Stag scales with the act (HP 2400·T after the
      // M4a tuning note, damage × 1 + 0.5(T − 1)) and calls the act's own
      // add phases, which scale with the act tier alone (data/difficulty.js).
      boss.start(0, -4.2, {
        hp: diff.bossHp,
        dmgMul: diff.bossDmgMul,
        adds: level.bossAdds.map(([et, k]) => [et, k]),
        addHpMul: diff.addHpMul,
        addDmgMul: diff.addDmgMul,
      });
      // The ally block hangs its room-start hygiene off this event (channels,
      // mark, rally, AI state) exactly as it does for wave rooms.
      events.emit(tick, 'room_start', { mode: 'boss', waves: [] });
    }
  }

  // §13 boundary sequence, steps 1-6. Fires off the `room_cleared` event, so
  // waves-cleared rooms and the boss room walk the identical path.
  function onRoomCleared(ev) {
    if (!active || phase !== 'combat') return;
    const tick = getTick();
    // 2. every live combat entity ends — the player-side half (enemy shots and
    //    survivors are handled by the enemy block, ally zones/bolts by the ally
    //    block). No instance may land after the clear tick.
    sweepPlayerTransients(tick, 'room_clear');
    // 4. targeting state clears. Mark and rally are cleared by the ally
    //    block's own `room_cleared` handler; the heal override is ours (§8:
    //    "room clear = clear").
    skillSys.clearOverride();
    events.emit(tick, 'heal_override', { index: null });
    // 5. stipend (+12 per combat-room clear, incl. the boss, incl. after a
    //    defend soft-fail). `clearedRooms` is the COMBAT counter the §14
    //    arithmetic rides on; `roomsDone` is the §18 summary's "rooms cleared"
    //    and counts every room left behind, the shop included — a flawless run
    //    must read 8 / 8, not 7 / 8.
    clearedRooms += 1;
    roomsDone = Math.max(roomsDone, roomIndex);
    gainGlint(RUN.stipend, 'clear_stipend');

    if (roomIndex === RUN.bossRoom) {
      onLevelCleared(tick);
      return;
    }
    // 6. reward presentation — SKIPPED (silently, no reward event) when the
    //    defend objective died: §11 soft-fail forfeits the room reward.
    const forfeited = !!ev.softFailed;
    if (forfeited) {
      spoils = null; // the soft-fail forfeits the spoils with the reward
      events.emit(tick, 'reward_forfeited', { room: roomIndex });
      afterReward();
      return;
    }
    dropSpoils(tick);
    presentReward();
  }

  function sweepPlayerTransients(tick, cause) {
    for (const e of registry.all()) {
      if (e.kind === 'bolt') {
        events.emit(tick, 'projectile_despawn', { id: e.id, cause, x: r2(e.x), z: r2(e.z) });
        registry.despawn(e.id);
      } else if (e.kind === 'skillbolt' && e.boltOwner !== 'ally_kits') {
        events.emit(tick, 'skill_bolt_despawn', {
          id: e.id,
          skill: e.skill,
          heal: !!e.heal,
          cause,
          traveled: r2(e.traveled ?? 0),
          x: r2(e.x),
          z: r2(e.z),
        });
        registry.despawn(e.id);
      } else if (e.kind === 'zone') {
        events.emit(tick, 'zone_expire', { id: e.id, skill: e.skill, cause });
        registry.despawn(e.id);
      }
    }
  }

  function gainGlint(amount, reason) {
    wallet += amount;
    events.emit(getTick(), 'glint_gain', { amount, wallet, reason, room: roomIndex });
    return wallet;
  }

  // --------------------------------------------------------- clear spoils --
  // M4c node supply (8 sockets per skill): every combat-room clear drops
  // SPOILS_PER_CLEAR nodes straight onto the bench (provenance 'spoils'),
  // drawn from the live usable pool's commons and rares BEFORE the reward
  // candidate (a fixed draw order: stipend -> spoils -> reward). They are
  // never auto-socketed; the reward page and the socket screen name them.
  function dropSpoils(tick) {
    const ids = draft.spoils(RUN.spoilsPerClear);
    for (const id of ids) buildSys.grantNode(id, 'spoils');
    spoils = { room: roomIndex, nodes: ids };
    spoilsTotal += ids.length;
    events.emit(tick, 'spoils_drop', { room: roomIndex, nodes: [...ids], total: spoilsTotal });
  }

  // ----------------------------------------------------------------- draft --
  function presentReward() {
    const promised = rewardFor[roomIndex] ?? 'skill';
    reward = draft.offer(promised);
    phase = 'reward';
    // NOTE (binding, whole module): the bus builds every event as
    // `{ tick, type, ...payload }` (core/events.js), so a payload key named
    // `type` OVERWRITES the event's own type and makes the event unfindable by
    // `events.some(e => e.type === 'reward_offer')`. The reward's kind
    // therefore rides on `reward:` here, in draft_taken and in draft_declined.
    events.emit(getTick(), 'reward_offer', {
      room: roomIndex,
      promised,
      reward: reward.type,
      id: reward.id,
      substituted: reward.substituted,
      line: reward.line,
      freeSkillSlots: reward.freeSkillSlots,
      poolSize: reward.poolSize,
    });
  }

  // §16: take-or-decline, no confirm, no reroll, no reopen.
  function takeReward() {
    if (phase !== 'reward' || !reward || !reward.type) return null;
    const tick = getTick();
    const taken = { type: reward.type, id: reward.id };
    if (reward.type === 'skill') {
      const r = skillSys.giveSkill(reward.id); // -> first empty slot (§16)
      events.emit(tick, 'draft_taken', { reward: 'skill', id: reward.id, slot: r.slot ?? null });
    } else {
      buildSys.grantNode(reward.id, 'drafted'); // -> bench, never auto-socketed
      events.emit(tick, 'draft_taken', { reward: 'node', id: reward.id, bench: true });
    }
    reward = null;
    afterReward(taken);
    return taken;
  }

  function declineReward() {
    if (phase !== 'reward') return null;
    const type = reward ? reward.type : null;
    const id = reward ? reward.id : null;
    events.emit(getTick(), 'draft_declined', { reward: type, id }); // declines have no memory
    reward = null;
    afterReward(null);
    return { declined: true, type, id };
  }

  function afterReward(taken = null) {
    if (roomIndex <= RUN.pathRooms) {
      presentPath();
    } else {
      // Rooms 6->7 and 7->8 are fixed transitions (§2: no choice).
      beginFade(roomIndex + 1);
    }
    return taken;
  }

  // ------------------------------------------------------------------ path --
  function presentPath() {
    const nextRoom = roomIndex + 1;
    const win = frame.modes[nextRoom - 1];
    const skillLeft = frame.sides[roomIndex - 1] === 0;
    const options = [
      { side: 0, win, reward: skillLeft ? 'skill' : 'node' },
      { side: 1, win, reward: skillLeft ? 'node' : 'skill' },
    ];
    path = {
      nextRoom,
      options,
      focus: 0,
      freeSkillSlots: draft.freeSkillSlots(),
    };
    phase = 'path';
    events.emit(getTick(), 'path_offer', {
      room: roomIndex,
      nextRoom,
      options: options.map((o) => ({ side: o.side, win: o.win, reward: o.reward })),
      freeSkillSlots: path.freeSkillSlots,
    });
  }

  function focusPath(side) {
    if (phase !== 'path' || !path) return null;
    path.focus = side === 1 ? 1 : 0;
    return path.focus;
  }

  function choosePath(side) {
    if (phase !== 'path' || !path) return null;
    const opt = path.options[side === 1 ? 1 : 0];
    rewardFor[path.nextRoom] = opt.reward;
    events.emit(getTick(), 'path_chosen', {
      room: roomIndex,
      nextRoom: path.nextRoom,
      side: opt.side,
      win: opt.win,
      reward: opt.reward,
    });
    const next = path.nextRoom;
    path = null;
    beginFade(next);
    return { nextRoom: next, reward: opt.reward, win: opt.win };
  }

  // §13/§16 transition fade (<= 300 ms) between the meta screens and the next
  // room's first tick.
  function beginFade(next) {
    pendingRoom = next;
    fadeUntilTick = getTick() + RUN.fadeTicks;
    phase = 'fade';
    events.emit(getTick(), 'room_transition', { from: roomIndex, to: next, ticks: RUN.fadeTicks });
  }

  // ------------------------------------------------ level director (§12) --
  // The level-clear trigger. Reached ONLY from onRoomCleared in the boss room,
  // which itself acts only while phase === 'combat' and changes the phase in
  // this same call; the per-level latch below makes a second call a no-op
  // whatever path reaches it (a replayed clear, a cmd, a same-tick double).
  function onLevelCleared(tick) {
    const c = campaign;
    if (c && c.clearedAt === c.index) return;
    const level = act;
    const next = c && c.mode === 'campaign' ? nextLevel(level) : null;
    const levelTicks = c ? tick - c.levelStartTick : tick - startTick;
    if (c) {
      c.clearedAt = c.index;
      const rec = c.levels[c.levels.length - 1];
      if (rec) {
        rec.rooms = roomsDone;
        rec.cleared = true;
        rec.ticks = levelTicks;
      }
    }
    events.emit(tick, 'level_clear', {
      level,
      name: levelFor(level).name,
      next,
      final: next === null,
      index: c ? c.index : 1,
      campaign: !!(c && c.mode === 'campaign'),
      ticks: levelTicks,
      rooms: roomsDone,
    });
    if (next === null) {
      endRun('victory');
      // CAMPAIGN COMPLETE: the card returns to camp by itself (sim time, so a
      // pause holds it and a network guest follows the host).
      if (c && c.mode === 'campaign') autoReturnTick = tick + TRANSIT.victoryReturnTicks;
      return;
    }
    beginTransit('clear', level, next, tick);
  }

  // RESET — every level-bound thing the sim owns goes (PLAN §12.3). The
  // presentation half (decals, particles, numerals, telegraph rigs, voices,
  // dressing) follows the `level_transit` event (src/campaign/manager.js).
  function resetLevel(tick, cause) {
    if (CARRY_RULES.resetShop) shop = null;
    reward = null;
    path = null;
    pendingRoom = 0;
    if (CARRY_RULES.resetDirector) {
      waves.stop(cause);
      boss.despawn();
    }
    if (CARRY_RULES.resetEntities) {
      enemies.reset();
      sweepPlayerTransients(tick, cause);
      exitRoom(tick); // room hooks: hazards + interactables despawn
      allySys.cmd('mark', [null]);
      allySys.cmd('roomBoundary'); // ally zones + ally bolts, revive channels
      // Pending Echo recasts are in-flight casts of the level that ended.
      const bs = cloneData(buildSys.saveState());
      if (bs && Array.isArray(bs.echoQueue) && bs.echoQueue.length) {
        bs.echoQueue = [];
        buildSys.loadState(bs);
      }
      // Anything level-owned a system missed (belt and braces): only the
      // party may ride into the next level. Counted so a leak stays visible
      // (campaign().card.leftovers — the GC.5 probe expects []).
      const leftovers = [];
      for (const e of registry.all()) {
        if (e.partyIndex !== undefined || e.kind === 'player' || e.kind === 'ally') continue;
        leftovers.push(e.kind);
        registry.despawn(e.id);
      }
      return leftovers;
    }
    return [];
  }

  // RESTORE + the non-default CARRY switches (PLAN §12.3).
  function restoreParty(tick) {
    for (const e of registry.all()) {
      if (e.partyIndex === undefined) continue;
      if (CARRY_RULES.reviveDowned && (e.downed || e.hp <= 0)) {
        e.downed = false;
        e.downedTick = -1;
        if (e.hp <= 0) e.hp = e.maxHp;
      }
      if (CARRY_RULES.restoreHp) e.hp = e.maxHp;
      if (CARRY_RULES.clearStatuses && e.status) e.status = {};
      if (CARRY_RULES.resetCooldowns) {
        if (Array.isArray(e.cds)) e.cds = e.cds.map(() => tick);
        if (e.kind === 'ally' && Number.isFinite(e.dodgeReadyTick)) e.dodgeReadyTick = tick;
      }
    }
    if (CARRY_RULES.resetCooldowns) {
      const s = skillSys.serialize();
      s.slots = s.slots.map((x) => (x ? { ...x, remaining: 0 } : null));
      skillSys.restore(s);
      player.dodgeReadyTick = tick;
      player.nextBasicTick = tick;
      player.dashTicksLeft = 0;
    }
    applyCarrySwitches(tick);
  }

  function applyCarrySwitches(tick) {
    const R = CARRY_RULES;
    if (!R.carrySkills || !R.carrySockets || !R.carryBench) {
      const bs = cloneData(buildSys.saveState());
      const keep = R.carrySkills ? null : new Set(STARTING_SKILLS);
      const freed = [];
      const rows = [];
      for (const [id, row] of bs.assignments ?? []) {
        if ((keep && !keep.has(id)) || !R.carrySockets) {
          for (const r of row) if (r) freed.push({ ...r });
          continue;
        }
        rows.push([id, row]);
      }
      bs.assignments = rows;
      bs.bench = R.carryBench ? [...(bs.bench ?? []), ...freed] : [];
      buildSys.loadState(bs);
      if (keep) {
        const s = skillSys.serialize();
        const kit = new Array(SKILL_SLOTS).fill(null);
        STARTING_SKILLS.forEach((id, i) => {
          kit[i] = { id, remaining: 0 };
        });
        skillSys.restore({ slots: kit, override: s.override, auras: s.auras });
      }
    }
    if (!R.carryGlint) wallet = 0;
    if (!R.carryHealOverride) {
      skillSys.clearOverride();
      events.emit(tick, 'heal_override', { index: null });
    }
    if (!R.carrySeedStream && typeof rng.reseed === 'function') rng.reseed(Math.floor(rng.float() * 0x100000000) >>> 0);
    if (!R.carryRecords && campaign) campaign.levels = campaign.levels.slice(-1);
  }

  // What the card shows about the build that rides into the next level.
  function carriedSummary() {
    const b = buildSys.view();
    const owned = skillSys.slotsView().filter(Boolean).map((s) => s.id);
    return {
      skills: owned,
      socketed: b.skills.reduce((n, s) => n + s.filled, 0),
      sockets: b.skills.length * (b.socketCount ?? 8),
      bench: b.bench.length,
      wallet,
      grant: campaign && campaign.grant ? cloneData(campaign.grant) : null,
    };
  }

  // Phase 'transit' — the level-clear card (kind 'clear') or the setting-out
  // card of a Level-N start (kind 'depart'). The card is sim-timed.
  function beginTransit(kind, from, to, tick) {
    let leftovers = [];
    if (kind === 'clear') {
      leftovers = resetLevel(tick, 'level_clear');
      restoreParty(tick);
    }
    const min = kind === 'clear' ? TRANSIT.clearTicks : to !== FIRST_LEVEL ? TRANSIT.departTicks : 0;
    campaign.card = {
      kind,
      from,
      to,
      startTick: tick,
      untilTick: tick + min,
      minSkipTick: tick + Math.min(min, TRANSIT.minSkipTicks),
      hardUntilTick: tick + TRANSIT.hardTicks,
      summary: carriedSummary(),
      leftovers,
    };
    campaign.transitions += 1;
    phase = 'transit';
    events.emit(tick, 'level_transit', {
      kind,
      from,
      to,
      name: levelFor(to).name,
      index: campaign.index + (kind === 'clear' ? 1 : 0),
      untilTick: campaign.card.untilTick,
      minSkipTick: campaign.card.minSkipTick,
      hardUntilTick: campaign.card.hardUntilTick,
    });
  }

  // The card's Enter / the presentation's "ready" advance / the autopilot.
  function campaignAdvance(reason = 'skip') {
    if (!active || phase !== 'transit' || !campaign || !campaign.card) return null;
    const tick = getTick();
    if (tick < campaign.card.minSkipTick) return { refused: 'settle', inTicks: campaign.card.minSkipTick - tick };
    return advanceLevel(typeof reason === 'string' ? reason : 'skip');
  }

  // Build the next level and walk into its room 1.
  function advanceLevel(reason) {
    const tick = getTick();
    const card = campaign.card;
    const to = card.to;
    exitRoom(tick);
    act = to;
    frame = rollFrame(); // the CARRIED run stream (no reseed) rolls the new level's frame
    roomIndex = 0;
    clearedRooms = 0;
    roomsDone = 0;
    rewardFor = { 1: 'skill' };
    reward = null;
    path = null;
    shop = null;
    spoils = null;
    pendingRoom = 0;
    fadeUntilTick = 0;
    lastCombatLayout = null;
    roomPlanView = null;
    if (card.kind === 'clear') {
      campaign.index += 1;
      campaign.levels.push({ level: to, index: campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
    }
    campaign.level = to;
    campaign.levelStartTick = tick;
    campaign.card = null;
    events.emit(tick, 'level_start', {
      level: to,
      name: levelFor(to).name,
      index: campaign.index,
      from: card.kind === 'clear' ? card.from : null,
      campaign: campaign.mode === 'campaign',
      reason,
      seed: frame.seed,
      modes: [...frame.modes],
    });
    enterRoom(1);
    return view();
  }

  // Quit to Lobby (pause menu, confirmed): the campaign is abandoned — the
  // records count it — and the world returns to camp with no end card.
  function abandonRun(reason = 'quit') {
    if (!active) return null;
    const tick = getTick();
    const s = endRun('abandoned');
    phase = 'idle';
    autoReturnTick = null;
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    events.emit(tick, 'return_to_camp', { enemies: leaked, reason: typeof reason === 'string' ? reason : 'quit' });
    return { abandoned: true, summary: s };
  }

  function campaignView() {
    const c = campaign;
    const tick = getTick();
    if (!c) return { active: false, mode: null, autoReturnTick, autoReturnInTicks: autoReturnTick !== null ? Math.max(0, autoReturnTick - tick) : null };
    const card = c.card
      ? {
          ...cloneData(c.card),
          name: levelFor(c.card.to).name,
          fromName: c.card.from !== null ? levelFor(c.card.from).name : null,
          elapsedTicks: tick - c.card.startTick,
          canSkip: tick >= c.card.minSkipTick,
          due: tick >= c.card.untilTick,
        }
      : null;
    return {
      active,
      mode: c.mode,
      harness: c.harness,
      startLevel: c.startLevel,
      level: c.level,
      name: levelFor(c.level).name,
      index: c.index,
      next: c.mode === 'campaign' ? nextLevel(c.level) : null,
      levels: cloneData(c.levels),
      levelsCleared: c.levels.filter((l) => l.cleared).length,
      clearedAt: c.clearedAt,
      card,
      grant: cloneData(c.grant),
      transitions: c.transitions,
      startTick: c.startTick,
      levelStartTick: c.levelStartTick,
      autoReturnTick,
      autoReturnInTicks: autoReturnTick !== null ? Math.max(0, autoReturnTick - tick) : null,
    };
  }

  // ------------------------------------------------------------------ shop --
  function openShop() {
    const stock = draft.shopStock().map((s) => ({ ...s, sold: false }));
    shop = { stock, visited: true };
    events.emit(getTick(), 'shop_open', {
      room: roomIndex,
      wallet,
      stock: stock.map((s) => ({ node: s.node, rarity: s.rarity, price: s.price })),
      affordableAny2: stock.length >= 2,
    });
  }

  // §14: integer wallet, atomic spend; insufficient funds => `currency_denied`
  // no-op — the item is NEVER hidden or greyed for price (§16: plaque emphasis
  // + one ~300 ms shake, item stays).
  function buy(index) {
    if (phase !== 'shop' || !shop) return null;
    const card = shop.stock[index];
    if (!card || card.sold) return null;
    const tick = getTick();
    if (wallet < card.price) {
      events.emit(tick, 'currency_denied', {
        node: card.node,
        price: card.price,
        wallet,
        index,
      });
      return { denied: 'insufficient_funds', price: card.price, wallet };
    }
    wallet -= card.price;
    buildSys.grantNode(card.node, 'purchased'); // card departs to the bench
    card.sold = true;
    const owned = draft.ownedCount(card.node);
    events.emit(tick, 'shop_purchase', {
      node: card.node,
      price: card.price,
      wallet,
      owned,
      index,
    });
    return { node: card.node, price: card.price, wallet, owned };
  }

  function advanceFromShop() {
    if (phase !== 'shop') return null;
    // The shop room is a room the player leaves behind, so it counts toward
    // the §18 summary row (it pays no stipend — `clearedRooms` is untouched).
    roomsDone = Math.max(roomsDone, RUN.shopRoom);
    events.emit(getTick(), 'shop_close', {
      wallet,
      sold: shop.stock.filter((s) => s.sold).length,
      roomsDone,
    });
    beginFade(RUN.bossRoom); // one-way (§16)
    return { nextRoom: RUN.bossRoom };
  }

  // ------------------------------------------------------------- run end --
  function buildSummary(result) {
    const b = buildSys.view();
    return {
      result,
      victory: result === 'victory',
      act,
      actName: levelFor(act).name,
      challenge,
      rooms: roomsDone, // §18 "ROOMS CLEARED n / 8" — every room left behind
      combatRooms: clearedRooms, // the §14 stipend counter (max 7)
      lastRoom: roomIndex,
      glint: wallet,
      seed: frame ? frame.seed : null,
      ticks: getTick() - startTick,
      skills: skillSys
        .slotsView()
        .filter(Boolean)
        .map((s) => s.id),
      nodes: {
        bench: b.bench.map((x) => x.node),
        socketed: b.skills.flatMap((sk) =>
          sk.sockets.filter(Boolean).map((s) => `${sk.id}:${s.node}`)
        ),
      },
      party: registry
        .all()
        .filter((e) => e.partyIndex !== undefined)
        .map((e) => ({ index: e.partyIndex, hp: r2(e.hp), maxHp: e.maxHp })),
      // PLAN §12.8: the campaign this run was (levels played, cleared, time).
      campaign: campaign
        ? {
            mode: campaign.mode,
            harness: campaign.harness,
            startLevel: campaign.startLevel,
            level: campaign.level,
            index: campaign.index,
            levels: cloneData(campaign.levels),
            levelsCleared: campaign.levels.filter((l) => l.cleared).length,
            complete: campaign.mode === 'campaign' && result === 'victory',
            grant: cloneData(campaign.grant),
          }
        : null,
    };
  }

  function endRun(result) {
    if (!active) return null;
    const tick = getTick();
    summary = buildSummary(result);
    events.emit(tick, 'run_end', {
      result,
      rooms: summary.rooms,
      glint: summary.glint,
      skills: [...summary.skills],
      nodes: summary.nodes.bench.length + summary.nodes.socketed.length,
      ticks: summary.ticks,
      act,
      challenge,
      campaign: summary.campaign ? cloneData(summary.campaign) : null,
    });
    // §2/§13: ALL run state is wiped at run end (the end screen renders from
    // the frozen summary above, never from live state).
    wipeState({ silent: false });
    phase = result; // 'victory' | 'defeat'
    return summary;
  }

  // Everything the run owns goes back to boot condition (§13 "Wiped at run
  // end: everything"): skills back to the starting kit with fresh cooldowns,
  // bench + sockets empty, Glint 0, party topped up and standing, dodge timer
  // clear, arena emptied of enemies and of the boss.
  function wipeState({ silent }) {
    const tick = getTick();
    exitRoom(tick);
    lastCombatLayout = null;
    roomPlanView = null;
    campaign = null; // (endRun froze it into the summary first)
    active = false;
    roomIndex = 0;
    reward = null;
    path = null;
    shop = null;
    frame = null;
    rewardFor = {};
    pendingRoom = 0;
    roomsDone = 0;
    clearedRooms = 0;
    spoils = null;
    spoilsTotal = 0;
    wallet = RUN.startingGlint;
    phase = 'idle';
    // The encounter director stops dead (schedule + spawn telegraphs +
    // Waystone), then the boss + adds, every hostile body and shot, and every
    // zone go. From here combatAllowed() is false, so enemies.spawn is a hard
    // no-op until the next run's first combat tick (Round D F6: the pending
    // spawns used to mature 48 ticks after run_end and walk into Camp).
    waves.stop('run_end');
    boss.despawn();
    enemies.reset();
    sweepPlayerTransients(tick, 'run_end');
    allySys.cmd('mark', [null]);
    allySys.cmd('roomBoundary');
    const kit = new Array(SKILL_SLOTS).fill(null);
    STARTING_SKILLS.forEach((id, i) => {
      kit[i] = { id, remaining: 0 };
    });
    skillSys.restore({ slots: kit, override: null });
    buildSys.restore({ bench: [], assignments: [] });
    for (const e of registry.all()) {
      if (e.partyIndex === undefined) continue;
      e.hp = e.maxHp;
      e.downed = false;
      e.downedTick = -1;
      if (e.status) e.status = {}; // §13 "wiped at run end: everything" — statuses too
    }
    player.dodgeReadyTick = tick;
    player.nextBasicTick = tick;
    player.dashTicksLeft = 0;
    if (!silent) events.emit(tick, 'run_wiped', { wallet, skills: STARTING_SKILLS.length });
  }

  function returnToCamp() {
    // The camp hub scene lands with its own block; run state is already wiped
    // at run end, so this only dismisses the end screen.
    if (phase !== 'victory' && phase !== 'defeat') return null;
    phase = 'idle';
    autoReturnTick = null;
    // Debug assertion for §18: nothing hostile may ride into the hub. The
    // count is taken BEFORE the belt-and-braces sweep so a leak is visible in
    // the event payload even though the sweep removes it.
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    events.emit(getTick(), 'return_to_camp', { enemies: leaked });
    return { phase, enemies: leaked };
  }

  // -------------------------------------------------------------- ticking --
  function continuous() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.continuous();
  }

  function discrete() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.resolve();
  }

  function endOfTick() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.endOfTick();
    // Status bookkeeping for the tick that just resolved (announce + prune),
    // before a fade can walk into the next room.
    statusTracker.endOfTick();
    if (phase === 'fade' && getTick() >= fadeUntilTick) enterRoom(pendingRoom);
    // PLAN §12.2: the card's own hard bound — the sim advances whatever the
    // presentation does (hidden host tab, no UI, a stuck preload).
    if (phase === 'transit' && campaign && campaign.card && getTick() >= campaign.card.hardUntilTick) advanceLevel('timeout');
    // CAMPAIGN COMPLETE -> camp, in sim time (pause holds it; guests follow).
    if (phase === 'victory' && autoReturnTick !== null && getTick() >= autoReturnTick) returnToCamp();
  }

  // §2: defeat = all 4 party members Downed simultaneously (the ONLY defeat
  // rule). The ally block owns the predicate and emits `defeat`.
  function onDefeat() {
    if (!active) return;
    endRun('defeat');
  }

  // ----------------------------------------------------------------- view --
  const combatActive = () => active && phase === 'combat';

  function view() {
    return {
      active,
      phase,
      combatActive: combatActive(),
      room: roomIndex,
      rooms: RUN.rooms,
      act,
      actName: levelFor(act).name,
      challenge,
      layout: layout ? { ...layout } : null,
      mode: frame && roomIndex ? frame.modes[roomIndex - 1] : null,
      wallet,
      clearedRooms,
      roomsDone,
      freeSkillSlots: draft.freeSkillSlots(),
      frame: frame
        ? { seed: frame.seed, modes: [...frame.modes], defendAt: [...frame.defendAt], sides: [...frame.sides] }
        : null,
      rewardFor: { ...rewardFor },
      spoils: spoils ? { room: spoils.room, nodes: [...spoils.nodes] } : null,
      spoilsTotal,
      reward: reward
        ? {
            type: reward.type,
            id: reward.id,
            promised: reward.promised,
            substituted: reward.substituted,
            line: reward.line,
            freeSkillSlots: reward.freeSkillSlots,
          }
        : null,
      path: path
        ? {
            nextRoom: path.nextRoom,
            focus: path.focus,
            freeSkillSlots: path.freeSkillSlots,
            options: path.options.map((o) => ({ ...o })),
          }
        : null,
      shop: shop
        ? {
            wallet,
            stock: shop.stock.map((s) => ({
              node: s.node,
              rarity: s.rarity,
              price: s.price,
              sold: s.sold,
              owned: draft.ownedCount(s.node),
              affordable: wallet >= s.price,
            })),
          }
        : null,
      boss: active && roomIndex === RUN.bossRoom ? boss.view() : null,
      summary,
      fadeTicksLeft: phase === 'fade' ? Math.max(0, fadeUntilTick - getTick()) : 0,
    };
  }

  // ----------------------------------------------- debug cmds (TESTING.md) --
  function cmd(name, args) {
    switch (name) {
      case 'startRun':
        // ('startRun', { act, challenge }) — PLAN §6.4; bypasses act locks.
        return startRun(args[0] && typeof args[0] === 'object' ? args[0] : { act: args[0], challenge: args[1] });
      // ------------------------------------------ CAMPAIGN (PLAN §12.11) --
      case 'startCampaign': {
        // ('startCampaign', { level, challenge, depart }) — a developer path:
        // bypasses the unlock chain and marks the run harness.
        const o = args[0] && typeof args[0] === 'object' ? args[0] : { level: args[0], challenge: args[1] };
        return startCampaign({ harness: true, ...o });
      }
      case 'campaignAdvance':
        return campaignAdvance(args[0] ?? 'skip');
      case 'abandonRun':
        return abandonRun(args[0] ?? 'quit');
      case 'campaignState':
        return campaignView();
      case 'campaignRules':
        return campaignRules();
      // ------------------------------------------ Gauntlet M4a probe cmds --
      case 'setStatus': {
        // ('setStatus', id, kind, mag, ticks) -> the stored record | refusal
        const [id, kind, mag = 0.5, ticks = 120] = args;
        const e = registry.byId(id);
        if (!e) return { error: 'no_entity' };
        const why = combat.status.refusal(e, kind, getTick());
        if (why) return { refused: why };
        const rec = combat.status.apply(e, kind, mag, ticks, getTick(), player.id);
        return rec ? { ...rec } : { refused: 'non_positive' };
      }
      case 'clearStatus': {
        const [id, kind] = args;
        const e = registry.byId(id);
        if (!e) return { error: 'no_entity' };
        return combat.status.clear(e, kind ?? null);
      }
      case 'statusOf': {
        const [id] = args;
        const e = registry.byId(id);
        return e ? combat.status.view(e, getTick()) : null;
      }
      case 'autopilot':
        return autopilot.configure(args[0] === undefined ? true : args[0]);
      case 'echoArm':
        return buildSys.echoArm(args[0]);
      case 'resonance':
        return buildSys.setResonance(args[0], args[1]);
      case 'roomPlan':
        return roomPlanFull();
      case 'difficultyTable':
        return null; // served by the content service (data/difficulty.js)
      case 'keenProbe': {
        // ('keenProbe', id, critBonus) — one real damage instance (power 1,
        // no knockback) through the §9 pipeline with a crit bonus: the probe
        // that measures Keen's roll (G4a.3). Draws exactly one crit roll.
        const [id, bonus = 0] = args;
        const t = registry.byId(id);
        if (!t) return null;
        return combat.applyDamage(t, 1, { delivery: 'skill', shape: 'debug', attacker: null, source: 'keen_probe', critBonus: bonus });
      }
      case 'runState':
        return view();
      case 'draftTake':
        return takeReward();
      case 'draftDecline':
        return declineReward();
      case 'pathFocus':
        return focusPath(args[0] ?? 0);
      case 'pathChoose':
        return choosePath(args[0] ?? 0);
      case 'shopBuy':
        return buy(args[0] ?? 0);
      case 'shopAdvance':
        return advanceFromShop();
      case 'returnToCamp':
        return returnToCamp();
      case 'endRun':
        return endRun(args[0] === 'defeat' ? 'defeat' : 'victory');
      case 'skipToRoom': {
        // Jump the run frame forward for scripted probes: clears the live room
        // and walks straight into room n (rewards/paths for the skipped rooms
        // are not presented; the stipends they would have paid ARE, so the
        // §14 wallet arithmetic still holds at the shop).
        // ('skipToRoom', n[, { act, challenge }]) — a live run keeps its act;
        // with no run live, the options start one in that act.
        const n = Math.max(1, Math.min(RUN.rooms, args[0] ?? 1));
        if (!active) startRun(args[1] && typeof args[1] === 'object' ? args[1] : {});
        // A level-transition card is between two levels: advance it first
        // (the skip then lands in the NEW level), never skip inside the old one.
        if (phase === 'transit' && campaign && campaign.card) advanceLevel('skip_room');
        phase = 'skip'; // suppresses the boundary sequence on the forced clear
        waves.forceClear();
        boss.despawn();
        enemies.reset();
        sweepPlayerTransients(getTick(), 'skip');
        // §14: the stipend is +12 per COMBAT-room clear. The shop room pays
        // nothing, so skipping past it must not mint 12 Glint out of thin air
        // — walking to room 7 or room 8 both land on the deterministic 72.
        const combatBefore = frame.modes
          .slice(0, n - 1)
          .filter((m) => m === 'kill_all' || m === 'defend' || m === 'boss').length;
        while (clearedRooms < combatBefore) {
          clearedRooms += 1;
          gainGlint(RUN.stipend, 'skip_stipend');
        }
        roomsDone = Math.max(roomsDone, n - 1); // every room before n is behind us
        enterRoom(n);
        return view();
      }
      case 'bossHp':
        // ('bossHp', pct[, skipPhases]) — skipPhases marks the add waves at or
        // above pct as already played, so no adds spawn for them.
        return boss.setHpPct(args[0] ?? 0.5, args[1] === true);
      case 'killBoss': {
        const b = boss.entity();
        if (!b) return null;
        combat.kill(b);
        return true;
      }
      case 'wallet': {
        if (args[0] !== undefined) {
          wallet = Math.max(0, Math.round(args[0]));
          events.emit(getTick(), 'glint_set', { wallet });
        }
        return wallet;
      }
      case 'draftPools':
        return { skill: draft.skillPool(), node: draft.nodePool(), free: draft.freeSkillSlots() };
      case 'autoFill':
        // The socket screen's Auto-fill (M4c D7) — the same policy the
        // autopilot uses; refused while combat is live.
        return buildSys.autoFill();
      default:
        return undefined;
    }
  }

  // The live room's plan: difficulty numbers + the rolled waves (wave rooms).
  function roomPlanFull() {
    if (!roomPlanView) return null;
    const w = typeof waves.planView === 'function' ? waves.planView() : null;
    return { ...roomPlanView, waves: w ? w.waves : [], roster: w ? w.roster : [], legacy: w ? w.legacy : null };
  }

  // PLAN §3.6 (a): M4b's content systems register here; enter() is called
  // synchronously at the room-enter point (same tick, before room_enter),
  // exit() when the room is left and at run end.
  function setRoomHooks(h = {}) {
    roomHooks = {
      enter: typeof h.enter === 'function' ? h.enter : null,
      exit: typeof h.exit === 'function' ? h.exit : null,
    };
    return true;
  }

  // Persistence (PLAN §3.4) for the Gauntlet additions (the v0.4.63 run frame
  // members are captured by M2's world-level capture).
  const expeditionState = () => ({
    act,
    challenge,
    layout: layout ? { ...layout } : null,
    lastCombatLayout,
    roomPlan: roomPlanView ? { ...roomPlanView } : null,
    autopilot: autopilot.serialize(),
  });
  function restoreExpedition(d) {
    if (!d) return;
    act = ACT_IDS.includes(d.act) ? d.act : 1;
    challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    layout = d.layout ? { ...d.layout } : null;
    lastCombatLayout = d.lastCombatLayout ?? null;
    roomPlanView = d.roomPlan ? { ...d.roomPlan } : null;
    autopilot.restore(d.autopilot);
  }

  // Save system (docs/gauntlet/PLAN.md §3.4, M2): the COMPLETE run frame —
  // the v0.4.63 members plus the expedition state and the autopilot (the
  // draft and status tracker are stateless; roomHooks are wiring, not state).
  function saveState() {
    return {
      active,
      roomIndex,
      phase,
      wallet,
      frame,
      reward,
      path,
      shop,
      summary,
      pendingRoom,
      fadeUntilTick,
      rewardFor,
      clearedRooms,
      roomsDone,
      startTick,
      everStarted,
      act,
      challenge,
      layout,
      lastCombatLayout,
      roomPlan: roomPlanView,
      autopilot: autopilot.serialize(),
      spoils,
      spoilsTotal,
      // CAMPAIGN (schema 3): the level director's whole state, the card included.
      campaign: cloneData(campaign),
      autoReturnTick,
    };
  }
  function loadState(d) {
    if (!d || typeof d.phase !== 'string') throw new TypeError('run.loadState: missing phase');
    active = !!d.active;
    roomIndex = d.roomIndex ?? 0;
    phase = d.phase;
    wallet = d.wallet ?? RUN.startingGlint;
    frame = d.frame ?? null;
    reward = d.reward ?? null;
    path = d.path ?? null;
    shop = d.shop ?? null;
    summary = d.summary ?? null;
    pendingRoom = d.pendingRoom ?? 0;
    fadeUntilTick = d.fadeUntilTick ?? 0;
    rewardFor = d.rewardFor ?? {};
    clearedRooms = d.clearedRooms ?? 0;
    roomsDone = d.roomsDone ?? 0;
    startTick = d.startTick ?? 0;
    everStarted = !!d.everStarted;
    act = ACT_IDS.includes(d.act) ? d.act : 1;
    challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    layout = d.layout ?? null;
    lastCombatLayout = d.lastCombatLayout ?? null;
    roomPlanView = d.roomPlan ?? null;
    autopilot.restore(d.autopilot ?? null);
    // M4c additions — absent in a tree migrated from schema 1.
    spoils = d.spoils ?? null;
    spoilsTotal = Number.isFinite(d.spoilsTotal) ? d.spoilsTotal : 0;
    // CAMPAIGN additions (schema 3; save/codec.js MIGRATIONS[2] fills them
    // for an older act run). A live run with no campaign record is treated as
    // a campaign from its act, so an in-memory older payload still advances.
    campaign = d.campaign ? cloneData(d.campaign) : null;
    if (!campaign && active) {
      campaign = {
        mode: 'campaign',
        harness: false,
        startLevel: act,
        level: act,
        index: 1,
        levels: [{ level: act, index: 1, startTick, rooms: roomsDone, cleared: false, ticks: 0 }],
        startTick,
        levelStartTick: startTick,
        clearedAt: 0,
        card: null,
        grant: null,
        transitions: 0,
      };
    }
    autoReturnTick = Number.isFinite(d.autoReturnTick) ? d.autoReturnTick : null;
  }

  const api = {
    saveState,
    loadState,
    startRun,
    // Linear campaign (PLAN §12.2).
    startCampaign,
    campaignAdvance,
    abandonRun,
    campaign: campaignView,
    campaignRules,
    endRun,
    onRoomCleared,
    onDefeat,
    continuous,
    discrete,
    endOfTick,
    view,
    cmd,
    setRoomHooks,
    autopilot,
    roomPlan: roomPlanFull,
    layout: () => (layout ? { ...layout } : null),
    act: () => act,
    challenge: () => challenge,
    expeditionState,
    restoreExpedition,
    statusKinds: () => [...STATUS_KINDS],
    skillIds: () => Object.keys(SKILLS),
    isActive: () => active,
    // The spawn-gate predicate the HUD mirrors for the ?room= harness boot.
    combatAllowed,
    combatActive,
    combatAllowed,
    // UI entry points (src/ui/run/**) — the same paths __echoes.cmd drives.
    takeReward,
    declineReward,
    focusPath,
    choosePath,
    buy,
    advanceFromShop,
    returnToCamp,
    wallet: () => wallet,
  };
  return api;
}
