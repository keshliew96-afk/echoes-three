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
import { SKILL_SLOTS } from '../core/constants.js';
import { PARTY_ALLIES, STARTING_SKILLS, SKILLS, HEALER_SKILL_IDS } from './skills.js';
import { createDraftSystem } from './draft.js';
import { NODES } from './nodes.js';
import { levelFor, ACT_IDS, CAMPAIGN_ACTS, roadOfAct, bossFor, campaignLevel } from '../data/levels.js';
// ENDLESS (docs/ENDLESS.md): the descent past Act III.
import { endlessDifficulty, endlessLevel, endlessBossIndex, endlessNextLevel, beyondCampaign } from '../data/endless.js';
import { LAYOUTS, arenaOf } from '../data/layouts.js';
import { difficulty, CHALLENGE, isDifficultyLegacy } from '../data/difficulty.js';
import { createStatusTracker, STATUS_KINDS } from './status.js';
import { createAutopilot } from './autopilot.js';
// RELICS (docs/CONTENT_PLAN.md §5): run-long relics + cursed doors.
import { createRelicSystem, cursedDiff, dailyOmen, CURSES } from './relics.js';
// DAILY DESCENT (docs/DAILY.md): the shared run of the UTC day.
import { isDailyKey, dailySeed, dailyDepth, DAILY_RULES } from '../data/daily.js';
// BOSS RUSH (docs/BOSS_RUSH.md): the bosses back to back.
import { RUSH_RULES, rushLine, rushDifficulty, rushNextLevel, rushSupply, rushReward } from '../data/rush.js';
// ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md): hunt and purge rooms.
import { assignObjectives, isObjectiveMode, OBJECTIVE_RULES } from './objectives.js';
// CHAMPION ROOMS (docs/CHAMPIONS.md): the crown door and its relic chest.
import { crownFor, crownSide, championPick, CHAMPION_RULES, isChampionKind } from './champions.js';
// KEYS AND VAULTS (docs/VAULTS.md): keys from elites and champions, the vault
// door and its treasure room.
import { createVaultSystem, eliteDropsKey, vaultPref, vaultSide, VAULT_RULES } from './vaults.js';
import { createConsumableSystem, eliteDropsTonic, chestTonic, CONSUMABLES } from './consumables.js';
// SECRET ROOMS (docs/SECRET_ROOMS.md): the cracked wall and its hidden chamber.
import { createSecretSystem, wallRolls, SECRET_RULES } from './secrets.js';
import { refreshBlockers } from './interactables.js';
// EVENT ROOMS (docs/EVENT_ROOMS.md): "?" doors and their encounters.
import { createEncounterSystem } from './encounters.js';
// ELITE AFFIXES (docs/ELITE_AFFIXES.md): how many powers an elite carries.
import { affixCountFor, LATE_AFFIX_ROOM } from './affixes.js';
// CROSS-RUN UNLOCKS (docs/UNLOCKS.md): the boons a campaign is started with.
import { sanitizeBoons } from '../data/unlocks.js';
import { VOW_RANKS, rankIn, rankValue, vowScale, vowFuseRule, vowLevelOf } from '../data/vows.js';
import { swapSuggestion, PARTY_DEADLINES } from '../data/classes.js';
import { DEFAULT_LINEUP } from '../data/lineup.js';
// PARTY (PLAN §16.3): the party page + the party shelves.
import { createPartyPages } from './partypage.js';
import { fillStress } from './party.js';
import { STRESS_LOADOUT, gatedPool } from '../data/classes.js';
import { SHARED_NODE_IDS } from './nodes.js';
import { FIRST_LEVEL, nextLevel, nextLevels, isLevel, grantFor, campaignRules } from '../data/campaign.js';

import { cloneData, r2, TUTORIAL_LAYOUT, tutorialDiff, RUN } from './run/rules.js';
import { createRunLevels } from './run/levels.js';
import { createRunView } from './run/view.js';
import { createRunSave } from './run/save.js';
import { createRunCommands } from './run/cmds.js';
import { createEventRoom } from './run/eventroom.js';
import { createSecretRoom } from './run/secretroom.js';
import { createVaultRoom } from './run/vaultroom.js';
import { createRunShrines } from './run/shrines.js';
import { createRunShop } from './run/shop.js';

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
  party = null, // PARTY: the party system (sim/party.js)
}) {
  // MORE CLASS SKILLS (docs/CLASS_SKILLS.md): the 2026-10-08 skills and
  // nodes join the pools in a campaign (Endless too), never in the tutorial or
  // the legacy single-level run, so the nine golden traces draw as before.
  const rs = {}; // the run's mutable state (one object, shared with the run's modules)
  const RF = {}; // the run's functions, shared with its parts under sim/run/ (filled below)
  const poolsGrown = () => !!(rs.campaign && rs.campaign.mode === 'campaign' && !rs.campaign.tutorial);
  // NEW ENEMIES (docs/WOOD_MILL_ENEMIES.md): the campaign-only creatures join
  // the wave rosters on the same gate (campaign, Endless, the Daily; never the
  // tutorial or the legacy single-level run, so the goldens hold).
  const roomLevel = (lv) => (poolsGrown() ? campaignLevel(lv) : lv);
  const draft = createDraftSystem({
    rng,
    build: () => buildSys,
    slots: () => skillSys.slotsView(),
    skillIds: () => gatedPool(HEALER_SKILL_IDS, poolsGrown()),
  });
  if (party && typeof party.setPoolGate === 'function') party.setPoolGate(poolsGrown);
  // Late-bound cross links between the skill kit and the build system (both
  // exist before the run system): Resonance's per-cast hook, and Echo's
  // recasts / passive Reapply pulses through the kit's own delivery.
  if (typeof skillSys.attachBuild === 'function') skillSys.attachBuild(buildSys);
  // PARTY: the party page / shelves module over the three ally builds. The
  // ally supply can be switched off (Node determinism proof, PLAN §16.9).
  const controllers = () => (allySys && typeof allySys.controllers === 'function' ? allySys.controllers() : ['human', 'ai', 'ai', 'ai']);
  const pages = party
    ? createPartyPages({
        party,
        events,
        getTick,
        controllers,
        humansInSession: () => controllers().filter((c) => c === 'human').length,
      })
    : null;
  rs.supplyOn = !!party;
  rs.harnessGrant = null; // ?partygrant=N | 'max' — applied at the next run start
  rs.relicsDefault = true; // RELICS: campaigns roll relics + curses (cmd('relicsDefault'))
  const allyOn = () => rs.supplyOn && !!pages;
  if (typeof buildSys.attachSkills === 'function') buildSys.attachSkills(skillSys);
  const statusTracker = createStatusTracker({ registry, events, getTick });
  // RELICS batch 5: the run's Vow level (Oathkeeper's Brand) and the carry
  // slots (Bottomless Flask; `tonics` is built further down).
  const relics = createRelicSystem({
    registry,
    events,
    getTick,
    combat,
    skillSys,
    player,
    live: () => rs.active,
    glint: (n, reason) => gainGlint(n, reason),
    vowMods: () => (rs.active ? vowMods() : null),
    vowLevel: () => (rs.active && rs.campaign && rs.campaign.boons ? vowLevelOf(rs.campaign.boons) : 0),
    tonicSlot: { get: (seat) => tonics.slot(seat), set: (seat, id) => tonics.setSlot(seat, id) },
  });
  // EVENT ROOMS: on with the relics (campaigns only, never the tutorial).
  const encounters = createEncounterSystem({ events, getTick });
  const encCtx = () => ({ wallet: rs.wallet, relics: relics.owned().length, freeMajors: relics.freeMajors().length, majors: relics.majorCurses().length, land: levelFor(rs.act)?.biome ?? null });
  events.on('event_touch', () => RF.openEncounter());
  const autopilot = createAutopilot({
    registry,
    player,
    run: () => api,
    skills: skillSys,
    build: () => buildSys,
    room: () => waves.roomState(),
  });

  // §2 "all run state wiped at run end" / §18 "Corruption never touches
  // Camp": after the first run has been played, an enemy may spawn ONLY while
  // a run is in live combat. Before any run the ?room=/?scene=arena harness
  // keeps its ungated spawns. The same predicate gates kill hitstop
  // (sim/world.js) so a stray kill can never stall the sim on an end card.
  function combatAllowed() {
    return !rs.everStarted || (rs.active && rs.phase === 'combat');
  }
  enemies.setSpawnGate(combatAllowed);
  // RELICS (Short Fuse): a cursed room's shorter telegraphs.
  // UNLOCKS round two: the Short Fuse vow shortens them in every combat room
  // (read live from the run's boons, so a loaded save keeps it).
  if (typeof enemies.setFuse === 'function') enemies.setFuse(() => (rs.active ? relics.fuse() ?? vowFuse() : null));
  // RELICS batch 4: Warding Chalk slows the Hold ring's fade; Pauper's Mark
  // thins the ally purses too.
  if (typeof waves.setHoldFadeMul === 'function') waves.setHoldFadeMul(() => (rs.active ? relics.holdFadeMul() : 1));
  if (party && typeof party.setGlintMul === 'function') party.setGlintMul(() => (rs.active ? relics.glintMul() : 1));
  // ELITE AFFIXES (docs/ELITE_AFFIXES.md): elites in a campaign's wave rooms
  // (and the trapped chest's ambush) carry named powers. Never the boss room,
  // the tutorial, the legacy single-level run or the ?room= harness (relics
  // off), so the nine golden traces see none.
  if (typeof enemies.setAffixRule === 'function') enemies.setAffixRule(affixRule);
  function affixRule() {
    if (!rs.active || rs.phase !== 'combat' || !rs.frame || !rs.campaign || rs.campaign.mode !== 'campaign' || rs.campaign.tutorial || !relics.enabled()) return null;
    if (rs.frame.modes[rs.roomIndex - 1] === 'boss') return null;
    const depth = endlessDepth();
    // Endless: Depths 1-4 are the campaign's own count; two powers from Depth 5.
    // Batch two (Gusting, Crystal, Tolling, Cinder) joins from room 4 on.
    // RELICS batch 6: Heavy Crowns adds a power (three at most).
    const salt = `${rs.frame.seed}:${depth || rs.act}:${rs.campaign.index}:${rs.roomIndex}`;
    const count = affixCountFor({ act: rs.act, room: rs.roomIndex, endless: beyondCampaign(depth) });
    return { count: Math.min(3, count + relics.affixAdd(salt)), salt, late: rs.roomIndex >= LATE_AFFIX_ROOM };
  }

  rs.active = false;
  // fix-M4a-r5 (GP.8, data/classes.js AI_ENGAGE): the AI-held seats' campaign
  // engagement rules run while a run is live — never in the ?room= harness and
  // never under the Node-only legacy switch (the §16.9 determinism proof).
  if (allySys && typeof allySys.setEngage === 'function') allySys.setEngage(() => rs.active && !isDifficultyLegacy());
  rs.roomIndex = 0; // 1..8 while a run is live
  rs.phase = 'idle'; // idle | combat | reward | path | shop | fade | victory | defeat
  rs.wallet = RUN.startingGlint;
  rs.frame = null;
  rs.reward = null; // live draft candidate
  rs.path = null; // live path offer
  rs.shop = null; // live shelf
  rs.summary = null; // frozen run summary for the end screens
  rs.pendingRoom = 0; // room the fade is walking toward
  rs.fadeUntilTick = 0;
  rs.rewardFor = {}; // room index -> promised reward type
  rs.clearedRooms = 0; // COMBAT rooms cleared — drives the §14 stipend only
  rs.roomsDone = 0; // every room left behind (combat + the shop) — the §18 summary row
  rs.startTick = 0;
  rs.everStarted = false; // once true, enemies exist only inside live combat
  // M4c clear spoils: the last drop `{ room, nodes: [id...] }` (the reward page
  // names it) and the run's running total (the end card / probes).
  rs.spoils = null;
  rs.spoilsTotal = 0;
  // Expedition state (serialised with the run).
  rs.act = 1;
  rs.challenge = 'standard';
  rs.layout = null; // { act, layoutId, biome, room, mode } of the live room
  rs.lastCombatLayout = null; // the "never the same layout twice in a row" memory
  rs.roomPlanView = null; // difficulty numbers of the live room (probe)
  rs.roomHooks = { enter: null, exit: null }; // M4b's content systems (contract (a))
  // Linear campaign (PLAN §12.2) — plain data, serialised with the run:
  //   { mode: 'campaign'|'single', harness, startLevel, level, index,
  //     levels: [{ level, index, startTick, rooms, cleared, ticks }],
  //     startTick, levelStartTick, clearedAt, card, grant, transitions }
  // card (phase 'transit') = { kind: 'clear'|'depart', from, to, startTick,
  //   untilTick, minSkipTick, hardUntilTick, summary }.
  rs.campaign = null;
  // Content slice 2: which boss room 8 holds is bossFor(act, frame.seed) — a
  // pure hash of the seed, nothing saved. `bossPick` is the harness override
  // (cmd('startRun', { act, boss })), saved only while it is set.
  rs.bossPick = null;
  // THIRD BOSSES (docs/THIRD_BOSSES.md): the acts whose gated boss this run
  // can meet (the save had felled the act's other bosses when it set out;
  // never in the Daily). Saved only while non-empty.
  rs.thirdOpen = [];
  // ENDLESS: past the first cycle each cycle meets the act's other boss in turn.
  const currentBoss = () => {
    // BOSS RUSH: the fight's boss is the run's seeded line.
    if (!rs.bossPick && rushFight()) {
      const want = rs.campaign.rush.line[rushFight() - 1];
      const lv = levelFor(rs.act);
      const row = want && lv.bosses ? lv.bosses.find((b) => b.kind === want.kind) : null;
      if (row) return row;
    }
    if (!rs.bossPick && beyondCampaign(endlessDepth())) {
      const lv = levelFor(rs.act);
      if (lv.bosses && lv.bosses.length) return lv.bosses[endlessBossIndex(endlessDepth(), rs.frame ? rs.frame.seed : null, rs.thirdOpen)];
    }
    return bossFor(rs.act, rs.frame ? rs.frame.seed : null, rs.bossPick, rs.thirdOpen);
  };
  // ENDLESS: the depth of a live endless campaign (= its level index), else 0.
  const endlessDepth = () => (rs.campaign && rs.campaign.endless ? rs.campaign.index : 0);
  // BOSS RUSH: the fight of a live rush (= its level index, 1..10), else 0.
  const rushFight = () => (rs.campaign && rs.campaign.rush ? rs.campaign.index : 0);
  // The level after `level` in this campaign: the endless cycle wraps; the
  // rush's line runs on into its second lap and ends after its last fight.
  // The Daily plays the campaign's own CAMPAIGN_ACTS levels (five since the
  // Spire's bosses, docs/ACT_V_BOSSES.md), the same count the server's depth
  // check reads, so a won Daily is Depth 40.
  // THE LEVEL V FORK (docs/KILN_BOSSES.md): a campaign runs on the road the
  // party picked on the Level IV clear card (`c.road`, present once picked),
  // else the Spire's. The Daily keeps the Spire road, so its board never
  // meets the Kiln.
  const nextOf = (c, level) =>
    c && c.mode === 'campaign'
      ? c.rush
        ? rushNextLevel(c.index)
        : c.endless
        ? endlessNextLevel(level)
        : c.daily && level >= CAMPAIGN_ACTS
        ? null
        : nextLevel(level, c.daily ? 'spire' : c.road ?? null)
      : null;
  // The roads a clear of `level` forks into for this campaign: both Level Vs
  // after Level IV in a plain campaign that has not picked yet, else none.
  const forkRoads = (c, level) => {
    if (!c || c.mode !== 'campaign' || c.rush || c.endless || c.daily || c.road || c.tutorial) return null;
    const opens = nextLevels(level);
    if (opens.length < 2) return null;
    const roads = opens.map((a) => roadOfAct(a)).filter(Boolean);
    return roads.length >= 2 ? roads : null;
  };
  // The room a level opens in: room 1, or in the rush the boss room for the
  // first fight and the Peddler's clearing (then the boss) for the others.
  const firstRoom = () => (rs.campaign && rs.campaign.rush ? (rs.campaign.index === 1 ? RUN.bossRoom : RUN.shopRoom) : 1);
  // CAMPAIGN COMPLETE card -> camp at this tick (survives the run-end wipe).
  rs.autoReturnTick = null;

  // ROOM OBJECTIVES: on for campaigns (Endless too), off for the tutorial and
  // the legacy single-level run (the goldens).
  const objectivesOn = () => !!(rs.campaign && rs.campaign.mode === 'campaign' && !rs.campaign.tutorial);
  // CHAMPION ROOMS: the crown door rides the same gate (campaign, Endless and
  // the Daily; never the tutorial or the legacy single-level run).
  const championsOn = () => objectivesOn();
  rs.forcedCrown = null; // probe: the next path screen's crown ({ room, side })
  // SECRET ROOMS probes: a wall in room n of this level / a chamber's content.
  rs.forcedWall = null;
  rs.forcedHolds = null;
  rs.forcedChampion = null; // probe: this level's champion ({ index, id })
  // SECOND CHAMPIONS: the level's champion (one of its act's, by seed).
  const levelChampion = () => {
    if (rs.forcedChampion && rs.forcedChampion.index === rs.campaign.index) return rs.forcedChampion.id;
    return championPick(rs.frame.seed, rs.campaign.index, rs.act).id;
  };
  // KEYS AND VAULTS: on with the champions (campaign, Endless and the Daily;
  // never the tutorial or the legacy single-level run, so the goldens never
  // see a key).
  const vaults = createVaultSystem({ registry, events, getTick });
  rs.forcedVault = null; // probe: the next path screen's vault side (0 | 1)
  // The champion leaves a key where it fell (its chest spot)...
  events.on('champion_fall', (ev) => {
    if (rs.active && vaults.enabled() && rs.phase === 'combat') vaults.drop('champion', ev.champion, ev.x, ev.z, rs.roomIndex);
  });
  // ...and an elite now and then (a hash of the level, the room and its id).
  events.on('death', (ev) => {
    if (!rs.active || !vaults.enabled() || rs.phase !== 'combat' || !rs.frame || !rs.campaign) return;
    const e = registry.byId(ev.id);
    if (!e || !e.elite || e.faction !== 'hostile' || isChampionKind(e.kind)) return;
    if (eliteDropsKey(rs.frame.seed, rs.campaign.index, rs.roomIndex, e.id)) vaults.drop('elite', e.kind, ev.x, ev.z, rs.roomIndex);
  });
  events.on('vault_touch', () => RF.openVault());
  // TONICS AND BOMBS (docs/CONSUMABLES.md): one carry slot per hero, on with
  // the keys (campaign, Endless, the Daily and Boss Rush; never the tutorial
  // or the legacy single-level run, so the goldens never see one). Elites
  // drop them by a hash roll; the champion's and the vault's chests pay one.
  // RELICS batch 5: a Corked room seals every slot.
  const tonics = createConsumableSystem({ registry, events, getTick, combat, isChampion: isChampionKind, sealed: () => rs.active && relics.corked() });
  events.on('death', (ev) => {
    if (!rs.active || !tonics.enabled() || rs.phase !== 'combat' || !rs.frame || !rs.campaign) return;
    const e = registry.byId(ev.id);
    if (!e || !e.elite || e.faction !== 'hostile' || isChampionKind(e.kind)) return;
    const id = eliteDropsTonic(rs.frame.seed, rs.campaign.index, rs.roomIndex, e.id);
    if (id) tonics.drop(id, 'elite', ev.x ?? e.x, ev.z ?? e.z);
  });
  // SECRET ROOMS (docs/SECRET_ROOMS.md): on with the keys. A bomb bursting
  // beside a cracked wall, or a heavy hit on it, from a hero a person plays
  // (or the autopilot's Healer) breaks it open while the fight is on.
  const secrets = createSecretSystem({ registry, events, getTick });
  const humanSeat = (seat) => seat === 0 || controllers()[seat] === 'human';
  events.on('wall_blow', (ev) => {
    if (!rs.active || !secrets.shut() || rs.phase !== 'combat') return;
    const by = ev.attacker != null ? registry.byId(ev.attacker) : null;
    if (!by || by.partyIndex === undefined) return;
    // RELICS batch 6: Delver's Lantern opens it to any blow from a person's
    // hero; a Sealed Door keeps it shut whatever lands (a knock and its seal).
    const heavy = humanSeat(by.partyIndex) && ((ev.delivery === 'skill' && ev.base >= SECRET_RULES.heavyMin) || relics.lanternOpens());
    if (heavy && relics.wallSealed()) sealedKnock(by.partyIndex);
    else if (heavy) RF.openWall('hit', by.partyIndex);
    else if (secrets.knock()) {
      const w = secrets.wall();
      events.emit(getTick(), 'secret_knock', { id: w.id, seat: by.partyIndex, base: ev.base, x: r2(w.x), z: r2(w.z) });
    }
  });
  events.on('tonic_burst', (ev) => {
    if (!rs.active || !secrets.shut() || rs.phase !== 'combat' || !humanSeat(ev.seat)) return;
    const w = secrets.wall();
    if (Math.hypot(ev.x - w.x, ev.z - w.z) > (ev.radius ?? 0) + SECRET_RULES.bombReach) return;
    if (relics.wallSealed()) sealedKnock(ev.seat);
    else RF.openWall('bomb', ev.seat);
  });
  // A Sealed Door's wall turns a breaking blow: the seal flares (at most as
  // often as a knock's dust).
  function sealedKnock(seat) {
    if (!secrets.knock()) return;
    const w = secrets.wall();
    events.emit(getTick(), 'curse_proc', { curse: 'sealed_door', stage: 'refuse', wall: w.id, seat: seat ?? null, yaw: r2(w.yaw ?? 0), x: r2(w.x), z: r2(w.z) });
  }
  events.on('secret_touch', () => RF.openSecret());

  // The quarry is marked for the whole party the moment it breaks cover.
  events.on('quarry_spawn', (ev) => {
    if (rs.active && allySys && typeof allySys.cmd === 'function') allySys.cmd('mark', [ev.id]);
  });

  // ------------------------------------------------------------ run frame --
  // ONE fixed roll sequence (defend positions, then the 5 path side bits) so a
  // seed reproduces the frame exactly. Room 1 is always kill_all (A3).
  // DAILY: point the gameplay stream at `seed` (the app's handle swaps its
  // stream; a bare stream, in Node tools, is set to a fresh one's state).
  function reseedTo(seed) {
    if (typeof rng.reseed === 'function') rng.reseed(seed >>> 0);
    else if (typeof rng.setState === 'function') rng.setState({ seed: seed >>> 0, s: seed | 0, draws: 0 });
  }

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
    if (typeof o.boss === 'string') rs.bossPick = o.boss;
    enterRoom(1);
    return RF.view();
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
    // ENDLESS: an endless descent always sets out from the first level.
    // DAILY DESCENT (docs/DAILY.md): the day's shared run — Level 1 on,
    // Standard, nothing equipped; never endless, never the tutorial.
    // SHOP AND DAILY FIXES: `practice` = the day's counted run is spent
    // (src/daily/client.js), so this one never reaches the board.
    const daily = o.daily && isDailyKey(o.daily.key) ? { key: o.daily.key, ...(o.daily.practice ? { practice: true } : {}) } : null;
    const endless = !!o.endless && !daily;
    // BOSS RUSH (docs/BOSS_RUSH.md): the bosses back to back from Level 1's;
    // never endless, never the Daily.
    const rush = !!o.rush && !daily && !endless;
    // TUTORIAL (docs/TUTORIAL.md): the guided first room — always Level 1,
    // never endless, no boons.
    const tutorial = !!o.tutorial && !endless && !daily && !rush;
    openRun({
      act: endless || tutorial || daily || rush ? FIRST_LEVEL : level,
      challenge: daily ? DAILY_RULES.challenge : o.challenge,
      mode: 'campaign',
      harness: !!o.harness,
      endless,
      boons: tutorial || daily ? null : o.boons,
      tutorial,
      daily,
      rush,
      lineup: o.lineup,
      thirdBosses: o.thirdBosses,
    });
    // THIRD BOSSES: the Daily is the same run for everyone, so its gated
    // bosses never join; a campaign or Endless takes the acts the camp passed.
    rs.thirdOpen = !daily && Array.isArray(o.thirdBosses) ? o.thirdBosses.map(Number).filter((a) => ACT_IDS.includes(a)) : [];
    if (o.harness && typeof o.boss === 'string') rs.bossPick = o.boss;
    if (o.depart) RF.beginTransit('depart', null, rs.act, getTick());
    else enterRoom(firstRoom());
    return RF.view();
  }

  function openRun({ act: a, challenge: c, mode, harness, endless = false, boons: rawBoons = null, tutorial = false, daily = null, rush = false, lineup = null, thirdBosses = null }) {
    // UNLOCKS: what the player equipped between runs (campaigns only). null =
    // nothing picked, and then nothing below differs from a plain run.
    const boons = mode === 'campaign' ? sanitizeBoons(rawBoons) : null;
    wipeState({ silent: true });
    rs.autoReturnTick = null;
    rs.bossPick = null;
    rs.thirdOpen = [];
    rs.act = ACT_IDS.includes(Number(a)) ? Number(a) : 1;
    rs.challenge = CHALLENGE[c] ? c : 'standard';
    // DAILY: the day's seed, whatever stream the session was on.
    const day = daily && mode === 'campaign' ? { key: daily.key, seed: dailySeed(daily.key), practice: !!daily.practice } : null;
    if (day) reseedTo(day.seed);
    rs.frame = rollFrame();
    rs.active = true;
    rs.everStarted = true;
    rs.wallet = RUN.startingGlint;
    rs.clearedRooms = 0;
    rs.roomsDone = 0;
    rs.rewardFor = { 1: 'skill' }; // §2: room 1's reward is always a Skill draft
    rs.summary = null;
    rs.spoils = null;
    rs.spoilsTotal = 0;
    rs.startTick = getTick();
    rs.campaign = {
      mode,
      harness: !!harness,
      startLevel: rs.act,
      level: rs.act,
      index: 1,
      levels: [{ level: rs.act, index: 1, startTick: rs.startTick, rooms: 0, cleared: false, ticks: 0 }],
      startTick: rs.startTick,
      levelStartTick: rs.startTick,
      clearedAt: 0,
      card: null,
      grant: null,
      transitions: 0,
      // ENDLESS: present only on an endless campaign (a plain campaign's
      // record, and so its saves and hashes, are unchanged). `won` = the
      // final level was cleared (the campaign itself is won).
      ...(endless && mode === 'campaign' ? { endless: true, won: false } : {}),
      ...(boons ? { boons } : {}),
      // TUTORIAL: present only on the guided first room. `hold` keeps the
      // waves back until the player has moved, attacked, dodged and used the
      // spring (cmd('tutorialRelease') from the coach, src/ui/tutorial/).
      ...(tutorial && mode === 'campaign' ? { tutorial: { hold: true } } : {}),
      // DAILY: present only on the day's run (the day's relic and curse).
      ...(day
        ? {
            daily: { key: day.key, seed: day.seed, ...dailyOmen(day.seed), ...(day.practice ? { practice: true } : {}) },
          }
        : {}),
    };
    // BOSS RUSH: present only on a rush (the seeded line of eight bosses,
    // rolled with the third bosses the camp passed).
    if (rush && mode === 'campaign') {
      const open = Array.isArray(thirdBosses) ? thirdBosses.map(Number).filter((x) => ACT_IDS.includes(x)) : [];
      rs.campaign.rush = { seed: rs.frame.seed, line: rushLine(rs.frame.seed, open), fights: RUSH_RULES.fights };
      rs.rewardFor[RUN.bossRoom] = rushReward(1);
    }
    // ROOM OBJECTIVES: campaigns (never the tutorial) turn one kill_all room
    // of rooms 4-6 into a hunt, a purge, an escort or a hold (two of
    // different kinds on later levels). No draws.
    if (objectivesOn()) assignObjectives(rs.frame.modes, rs.frame.seed, rs.campaign.index);
    // PARTY: every ally back to its starting loadout, empty build, purse 0;
    // the party stream seeded from the run SEED (no gameplay draw).
    // UNLOCKS: an equipped kit replaces a class's starting skills.
    // PARTY LINEUP (docs/LINEUP.md): a campaign (never the tutorial) may seat
    // another class; every other run is the default four. Before the reset,
    // so the reset loads each seat's own class.
    if (party) party.setLineup(mode === 'campaign' && !tutorial ? lineup : DEFAULT_LINEUP);
    if (party) party.resetForRun(rs.frame.seed, boons && boons.kits ? boons.kits : null);
    if (boons && boons.kits && boons.kits.healer) {
      const kit = new Array(SKILL_SLOTS).fill(null);
      boons.kits.healer.slice(0, SKILL_SLOTS).forEach((id, i) => {
        kit[i] = { id, remaining: 0 };
      });
      skillSys.restore({ slots: kit, override: null });
    }
    if (pages) pages.reset();
    // RELICS: on for campaigns, off for the legacy single-level run (goldens).
    relics.reset(rs.frame.seed, mode === 'campaign' && rs.relicsDefault && !tutorial);
    encounters.reset(rs.frame.seed, mode === 'campaign' && rs.relicsDefault && !tutorial);
    vaults.reset(championsOn());
    tonics.reset(championsOn());
    secrets.reset(championsOn());
    RF.shrineReset();
    if (rs.campaign.daily) relics.grantDaily(rs.campaign.daily.relic, rs.campaign.daily.curse);
    // Payload unchanged since v0.5.x (the goldens hash every event).
    events.emit(getTick(), 'run_start', {
      seed: rs.frame.seed,
      modes: [...rs.frame.modes],
      defendAt: [...rs.frame.defendAt],
      sides: [...rs.frame.sides],
      act: rs.act,
      actName: levelFor(rs.act).name,
      challenge: rs.challenge,
      // TUTORIAL: key present only on the guided room (golden payloads unchanged).
      ...(tutorial && mode === 'campaign' ? { tutorial: true } : {}),
    });
    // PARTY: an explicit harness grant (?partygrant) REPLACES a Level-N
    // start's ally grant (never stacks, BUILD_BRIEF §25.10); `max` = the
    // deterministic max-stress build for all four seats.
    const hg = rs.harnessGrant;
    rs.harnessGrant = null;
    if (rs.act !== FIRST_LEVEL && hg !== 'max') applyStarterGrant(rs.act, { allies: hg === null });
    // BOSS RUSH: the rush sets out with the Level II starter kit.
    else if (rs.campaign.rush && hg !== 'max') {
      applyStarterGrant(RUSH_RULES.grantLevel, { allies: hg === null });
      applyRushSupply(0);
    }
    if (hg !== null && allyOn()) applyHarnessGrant(hg);
    if (boons) applyBoons(boons);
  }

  // UNLOCKS: the heirloom relic and the purse land after the starter grant
  // (no draws: the relic is given, not rolled). One `boons` event names them.
  function applyBoons(b) {
    const relic = b.relic ? relics.grant(b.relic) : null;
    if (b.glint) gainGlint(b.glint, 'boon_purse');
    events.emit(getTick(), 'boons', {
      kits: b.kits ? Object.keys(b.kits) : [],
      relic,
      glint: b.glint ?? 0,
      vows: b.vows ? [...b.vows] : [],
    });
  }
  const runVows = () => (rs.campaign && rs.campaign.boons && Array.isArray(rs.campaign.boons.vows) ? rs.campaign.boons.vows : null);
  // VOW RANKS (data/vows.js): each vow reads its rank (I unless the boons
  // name another), so a rank-I vow is the curse it always was.
  const vowRank = (v) => rankIn(rs.campaign && rs.campaign.boons, v);
  function vowedDiff(diff) {
    const vows = runVows();
    if (vows) for (const v of vows) diff = cursedDiff(diff, v, vowScale(v, vowRank(v)));
    return diff;
  }
  function vowFuse() {
    const vows = runVows();
    if (!vows || rs.phase !== 'combat' || !rs.frame || rs.frame.modes[rs.roomIndex - 1] === 'boss') return null;
    for (const v of vows) {
      if (VOW_RANKS[v] && VOW_RANKS[v].fuse) return vowFuseRule(v, vowRank(v));
      if (CURSES[v] && CURSES[v].fuse) return CURSES[v].fuse;
    }
    return null;
  }
  // The Spire vows (Thin Air, Heavy Bell): { heal, dodge }, null with neither.
  function vowMods() {
    const vows = runVows();
    if (!vows) return null;
    let heal = 0;
    let dodge = 0;
    for (const v of vows) {
      const row = VOW_RANKS[v];
      if (row && row.heal) heal = rankValue(v, vowRank(v));
      if (row && row.dodge) dodge = rankValue(v, vowRank(v));
    }
    return heal || dodge ? { heal, dodge } : null;
  }

  // `?partygrant=N` / `max` (PLAN §16.11) — marks the run harness.
  function applyHarnessGrant(g) {
    if (rs.campaign) rs.campaign.harness = true;
    if (g === 'max') {
      stressHealer();
      party.stress();
      return;
    }
    const lv = Number(g);
    const gr = grantFor(lv);
    if (gr && gr.allies) party.applyGrant(gr.allies, 'grant');
  }
  // The Healer's max-stress build (BUILD_BRIEF §25.10): its loadout + a full
  // 32 / 32 in the stress order.
  function stressHealer() {
    const want = STRESS_LOADOUT.healer;
    const kit = want.map((id) => ({ id, remaining: 0 }));
    buildSys.restore({ bench: [], assignments: [] });
    skillSys.restore({ slots: kit, override: null });
    fillStress(buildSys, want, SHARED_NODE_IDS);
  }

  // PLAN §12.4 starter grant for a start AT level N > 1: skill draws, node
  // draws in pairs (the clear-spoils rule) each followed by the shared
  // auto-fill, legendary draws, then Glint. Fixed draw order off the run RNG
  // (right after the run frame), no combat active (phase idle), so the same
  // seed always grants the same kit.
  function applyStarterGrant(level, { allies = true } = {}) {
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
    rs.campaign.grant = { level, skills, nodes, glint: g.glint ?? 0 };
    events.emit(tick, 'starter_grant', { level, skills: [...skills], nodes: [...nodes], glint: g.glint ?? 0 });
    // PARTY §25.10: each ally's STARTER_GRANT[N].allies (party stream, after
    // the Healer's, seat order; swaps by the §25.8 AI rule).
    if (allies && allyOn() && g.allies) rs.campaign.grant.allies = party.applyGrant(g.allies, 'grant');
    return rs.campaign.grant;
  }

  // §4.1 room table roll: one layout per combat room from the act's pool,
  // never the one the previous combat room used. Drawn with the run RNG after
  // the wave schedule (PLAN §3.6 (a)).
  // Slice 2 layouts (10-15) join campaign tables only: the legacy single-level
  // run keeps `legacyLayouts`, so the goldens roll the same rooms.
  function rollLayout(n, mode) {
    const level = levelFor(rs.act);
    // THIRD BOSSES (plan 3 slice 10): a boss row may name its own room (the
    // Gloam Wolf hunts in the Thornwood Ring, the Mire King sits in the
    // Millrace Basin); boss rooms carry no hazards, so only the dressing moves.
    if (mode === 'boss') return currentBoss().layout ?? level.bossLayout;
    const table = rs.campaign && rs.campaign.mode !== 'campaign' && level.legacyLayouts ? level.legacyLayouts : level.layouts;
    // EVENT ROOMS: a "?" room stands in the last combat room's clearing, as
    // the shop does (no draw).
    // KEYS AND VAULTS: so does the vault.
    if (mode === 'shop' || mode === 'event' || mode === 'vault') return rs.lastCombatLayout ?? table[0];
    const pool = table.filter((id) => id !== rs.lastCombatLayout);
    let pick = pool.length > 0 ? pool[rng.int(pool.length)] : table[0];
    // NEW LAYOUTS (plan 3 slice 8): a champion or Hold room stands in the
    // act's open arena, unless the last combat room was already it. The draw
    // above still happens, so the stream keeps its length.
    if (mode === 'champion' || mode === 'hold') {
      const arena = arenaOf(table);
      if (arena !== null && arena !== rs.lastCombatLayout) pick = arena;
    }
    rs.lastCombatLayout = pick;
    return pick;
  }

  function exitRoom(tick) {
    if (rs.layout && typeof rs.roomHooks.exit === 'function') rs.roomHooks.exit(tick);
    rs.layout = null;
    // KEYS AND VAULTS: the vault's piles and platter stay in their room.
    for (const e of registry.all()) if (e.kind === 'vault_pile' || e.kind === 'vault_platter') registry.despawn(e.id);
    // SECRET ROOMS: the wall, the chamber and what it held stay here.
    let walled = false;
    for (const e of registry.all()) {
      if (!RF.isSecretBody(e)) continue;
      if (e.collider) walled = true;
      registry.despawn(e.id);
    }
    if (walled) refreshBlockers(registry);
    secrets.leaveRoom();
    // TONICS AND BOMBS: what lies on the floor, flies or burns stays here.
    tonics.clearRoom();
  }

  // Walking on to the next room: the last room's bodies stay behind (its
  // retreaters, the escort pilgrim, the Waystone, nests and enemy shots, the
  // party's zones and bolts), whatever kind of room comes next. A combat
  // room's own planRoom reset finds nothing left; a shop, vault or event
  // room has no reset of its own.
  function leaveRoomBodies(tick) {
    enemies.reset();
    sweepPlayerTransients(tick, 'room_exit');
    if (allySys && typeof allySys.cmd === 'function') allySys.cmd('roomExit');
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
    leaveRoomBodies(tick);
    // PARTY: no socket hold outlives the room change.
    if (pages && pages.screensAny()) for (let s = 0; s < 4; s++) pages.setScreen(s, false);
    rs.roomIndex = n;
    const mode = rs.frame.modes[n - 1];
    const depth = endlessDepth();
    // ENDLESS: the wave director rolls from the depth's (mixed) roster.
    const level = depth ? endlessLevel(depth) : roomLevel(levelFor(rs.act));
    rs.reward = null;
    rs.path = null;
    positionParty();
    const combatRoom = mode === 'kill_all' || mode === 'defend' || mode === 'champion' || isObjectiveMode(mode);
    const baseDiff = rushFight() ? rushDifficulty(rushFight(), rs.challenge) : beyondCampaign(depth) ? endlessDifficulty(depth, Math.min(6, n), rs.challenge) : difficulty(rs.act, Math.min(6, n), rs.challenge);
    // SHRINES: the Grave Shrine's curse binds this fight (unless a door's
    // curse, room or major, already did).
    if (combatRoom && mode !== 'boss' && rs.shrine && rs.shrine.curse && !relics.curseHeldFor(n)) {
      relics.takeCurse(rs.shrine.curse, n);
      events.emit(tick, 'shrine_curse', { room: n, curse: rs.shrine.curse });
      rs.shrine.curse = null;
    }
    // RELICS: a cursed room rolls its waves with the curse's numbers.
    const roomCurse = combatRoom ? relics.curseFor(n) : null;
    let diff = roomCurse ? cursedDiff(baseDiff, roomCurse) : baseDiff;
    // TUTORIAL: a gentle room (half the threat, softer and weaker beasts, no
    // elites) so a first-time player learns rather than dies.
    if (combatRoom && tutorialOn()) diff = tutorialDiff(diff);
    // RELICS: each major curse the run holds reshapes every combat room.
    if (combatRoom) for (const m of relics.majorCurses()) diff = cursedDiff(diff, m, relics.majorScale());
    // UNLOCKS: each vow the party wears curses every combat room.
    if (combatRoom) diff = vowedDiff(diff);
    // NEW ENEMIES: campaign kinds roll in campaign rooms only (levels.js
    // CAMPAIGN_ONLY_ENEMIES), on the objectives' gate.
    if (combatRoom) waves.planRoom(mode, { act: rs.act, room: n, challenge: rs.challenge, level, diff, campaignKinds: objectivesOn(), ...(mode === 'champion' ? { champion: levelChampion() } : {}) });
    // Layout AFTER the schedule (one fixed roll order per room).
    // TUTORIAL: always the clearing with a dewfont (the spring the coach
    // sends the player to); no layout draw.
    const layoutId = tutorialOn() ? TUTORIAL_LAYOUT : rollLayout(n, mode);
    // A slice-2 layout's own spawn ring: move the rolled units onto it.
    const ring = combatRoom ? LAYOUTS[layoutId]?.spawns : null;
    if (ring) waves.relocateSpawns(ring);
    // Balance pass: a layout with its own enemy mix (Open Grave) retypes part
    // of the rolled schedule toward its favoured types, again with no draw.
    const mix = combatRoom ? LAYOUTS[layoutId]?.mix : null;
    if (mix) waves.favourRoster(mix, level, n);
    rs.layout = { act: rs.act, layoutId, biome: level.biome, room: n, mode };
    rs.roomPlanView = {
      act: rs.act,
      room: n,
      mode,
      challenge: rs.challenge,
      layoutId,
      hpMul: combatRoom ? diff.hpMul : null,
      dmgMul: combatRoom ? diff.dmgMul : null,
      budget: mode === 'kill_all' || mode === 'champion' || isObjectiveMode(mode) ? diff.budget : mode === 'defend' ? diff.defendBudget : null,
      eliteChance: combatRoom ? diff.eliteChance : null,
      waveIntervalTicks: mode === 'kill_all' || mode === 'hunt' || mode === 'escort' || mode === 'champion' ? diff.waveIntervalTicks : null,
      waystoneHp: mode === 'defend' ? diff.waystoneHp : null,
      bossHp: mode === 'boss' ? diff.bossHp : null,
      bossDmgMul: mode === 'boss' ? diff.bossDmgMul : null,
      addHpMul: mode === 'boss' ? diff.addHpMul : null,
      addDmgMul: mode === 'boss' ? diff.addDmgMul : null,
    };
    if (typeof rs.roomHooks.enter === 'function') rs.roomHooks.enter({ ...rs.layout }, tick);
    events.emit(tick, 'layout_enter', { room: n, act: rs.act, layoutId, biome: level.biome, mode });
    // SHRINES: the level's shrine stands in its first combat room from the
    // hashed room on (never the boss room); the Grave Shrine's curse lands
    // on the next fight.
    if (combatRoom && RF.shrinesOn() && mode !== 'boss') RF.placeShrine(n, mode, level.biome, tick);
    // SECRET ROOMS: from room 4 on, a plain fight may hide a cracked wall.
    if (combatRoom && secrets.canPlace() && rs.frame && rs.campaign && !tutorialOn() && !rushFight() && (rs.forcedWall === n || wallRolls(rs.frame.seed, rs.campaign.index, n, mode))) RF.placeWall(n, mode, tick);
    if (rs.forcedWall === n) rs.forcedWall = null;
    events.emit(tick, 'room_enter', {
      index: n,
      mode,
      reward: rs.rewardFor[n] ?? null,
      wallet: rs.wallet,
      act: rs.act,
      layoutId,
    });
    if (combatRoom) {
      rs.phase = 'combat'; // §13 step 7: next room's first tick, combat_active := true
      // TUTORIAL: the waves wait for the coach's release.
      if (!(tutorialOn() && rs.campaign.tutorial.hold)) waves.beginRoom();
      relics.onRoomEnter(n, mode);
    } else if (mode === 'shop') {
      rs.phase = 'shop';
      RF.openShop();
    } else if (mode === 'event') {
      RF.enterEvent(n, tick);
    } else if (mode === 'vault') {
      RF.enterVault(n, tick);
    } else if (mode === 'boss') {
      rs.phase = 'combat';
      enemies.reset();
      // §23.1/§23.2: the Stag scales with the act (HP 2400·T after the
      // M4a tuning note, damage × 1 + 0.5(T − 1)) and calls the act's own
      // add phases, which scale with the act tier alone (data/difficulty.js).
      // Slice 2: the act's boss for this run's seed (data/levels.js bossFor).
      const bd = currentBoss();
      boss.start(0, -4.2, {
        kind: bd.kind ?? 'stag',
        hp: diff.bossHp,
        dmgMul: diff.bossDmgMul,
        adds: bd.adds.map(([et, k]) => [et, k]),
        ...(bd.addsByPhase ? { addsByPhase: bd.addsByPhase.map((list) => list.map(([et, k]) => [et, k])) } : {}),
        addHpMul: diff.addHpMul,
        addDmgMul: diff.addDmgMul,
      });
      // The ally block hangs its room-start hygiene off this event (channels,
      // mark, rally, AI state) exactly as it does for wave rooms.
      events.emit(tick, 'room_start', { mode: 'boss', waves: [] });
      relics.onRoomEnter(n, mode);
    }
  }

  // §13 boundary sequence, steps 1-6. Fires off the `room_cleared` event, so
  // waves-cleared rooms and the boss room walk the identical path.
  function onRoomCleared(ev) {
    if (!rs.active || rs.phase !== 'combat') return;
    const tick = getTick();
    // KEYS AND VAULTS: a key still on the floor flies to the party.
    vaults.sweep();
    // TONICS AND BOMBS: loose ones fly to the empty slots.
    tonics.sweep();
    // EVENT ROOMS: the trapped chest's ambush is won — the chest pays.
    const enc = encounters.live();
    if (enc && enc.state === 'ambush' && enc.room === rs.roomIndex) {
      RF.ambushCleared(tick);
      return;
    }
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
    rs.clearedRooms += 1;
    rs.roomsDone = Math.max(rs.roomsDone, rs.roomIndex);
    gainGlint(RUN.stipend, 'clear_stipend');
    if (allyOn()) pages.stipend('clear_stipend'); // PARTY: +12 per ally purse
    // ROOM OBJECTIVES: an objective room won pays its bounty.
    if (ev.objective && ev.won) gainGlint(OBJECTIVE_RULES.bounty, `${ev.objective}_bounty`);
    // RELICS: clear procs (Grave Coin, Hearthstone), the curse lifts, and a
    // relic pick is owed after room 1 and after a cursed room.
    relics.onRoomCleared(rs.roomIndex, { forfeited: !!ev.softFailed, gainGlint, boss: rs.roomIndex === RUN.bossRoom, objective: ev.objective ?? null, won: !!ev.won, champion: ev.champion ?? null });
    // SHRINES: the Geode Shrine's pick (a relic outright when the room
    // already owes one: the curse's).
    if (rs.shrine && rs.shrine.pick === rs.roomIndex) {
      rs.shrine.pick = null;
      if (!ev.softFailed) {
        if (!relics.owed()) relics.owe(rs.roomIndex, 'shrine');
        else relics.grantTier('shrine', ['legendary', 'rare'], null, player);
      }
    }
    // CHAMPION ROOMS: the champion's chest opens; its greater relic pick
    // comes after the room's draft (the crown door is never cursed, so no
    // other pick is owed here).
    if (ev.champion && !ev.softFailed && relics.owe(rs.roomIndex, CHAMPION_RULES.chestSource)) {
      const at = ev.chest ?? { x: 0, z: 0 };
      events.emit(tick, 'champion_chest', { room: rs.roomIndex, champion: ev.champion, x: at.x, z: at.z });
      // TONICS AND BOMBS: the chest pays one into the first empty slot.
      if (tonics.enabled() && rs.frame) tonics.grant(chestTonic(rs.frame.seed, rs.campaign.index, rs.roomIndex, 'champion'), 'champion', null, at.x, at.z);
    }

    if (rs.roomIndex === RUN.bossRoom && rushFight()) {
      rushCleared(tick);
      return;
    }
    if (rs.roomIndex === RUN.bossRoom) {
      RF.onLevelCleared(tick);
      return;
    }
    // 6. reward presentation — SKIPPED (silently, no reward event) when the
    //    defend objective died: §11 soft-fail forfeits the room reward.
    const forfeited = !!ev.softFailed;
    if (forfeited) {
      rs.spoils = null; // the soft-fail forfeits the spoils with the reward
      events.emit(tick, 'reward_forfeited', { room: rs.roomIndex });
      afterReward();
      return;
    }
    dropSpoils(tick);
    // PARTY: each ally's clear spoils (party stream, after the Healer's).
    const allySpoils = allyOn() ? pages.dropSpoils(rs.roomIndex) : null;
    presentReward(allySpoils);
  }

  // BOSS RUSH: a boss felled pays its bounty; then, before the next fight,
  // the war chest, the fight's draft and (after odd fights) a relic pick.
  // The level clears once those are done (afterRelic). The last fight ends
  // the rush at once.
  function rushCleared(tick) {
    const n = rushFight();
    gainGlint(RUSH_RULES.bounty, 'rush_bounty');
    if (allyOn()) for (const i of [1, 2, 3]) party.gainPurse(i, RUSH_RULES.bounty, 'rush_bounty');
    events.emit(tick, 'rush_felled', { fight: n, boss: currentBoss().kind ?? 'stag', of: RUSH_RULES.fights, ticks: tick - rs.startTick });
    if (n >= RUSH_RULES.fights) {
      RF.onLevelCleared(tick);
      return;
    }
    // The fight is over: out of combat first, so the war chest's auto-fill
    // may socket (the build refuses while combat is live).
    rs.phase = 'reward';
    applyRushSupply(n);
    if (RUSH_RULES.relicAfter.includes(n)) relics.owe(rs.roomIndex, 'free');
    dropSpoils(tick);
    const allySpoils = allyOn() ? pages.dropSpoils(rs.roomIndex) : null;
    presentReward(allySpoils);
  }

  // The war chest (data/rush.js rushSupply): the Healer's skills and its nodes
  // in pairs with the shared auto-fill (the starter grant's rule), its
  // legendary, then each ally's share from the party stream.
  function applyRushSupply(n) {
    const g = rushSupply(n);
    if (!g) return null;
    const skills = [];
    for (let i = 0; i < g.skills; i++) {
      const pool = draft.skillPool();
      if (pool.length === 0 || draft.freeSkillSlots() <= 0) break;
      const id = pool[rng.int(pool.length)];
      const r = skillSys.giveSkill(id);
      if (r && r.error) break;
      skills.push(id);
    }
    const nodes = [];
    for (let left = g.nodes; left > 0; ) {
      const ids = draft.spoils(Math.min(2, left));
      if (ids.length === 0) break;
      for (const id of ids) {
        buildSys.grantNode(id, 'grant');
        nodes.push(id);
      }
      left -= ids.length;
      buildSys.autoFill();
    }
    for (let i = 0; i < g.legendaries; i++) {
      const pool = draft.nodePool().filter((id) => NODES[id] && NODES[id].rarity === 'legendary');
      if (pool.length === 0) break;
      const id = pool[rng.int(pool.length)];
      buildSys.grantNode(id, 'grant');
      nodes.push(id);
      buildSys.autoFill();
    }
    const allies = allyOn() ? party.applyGrant({ ...g.allies, glint: 0 }, 'grant') : null;
    events.emit(getTick(), 'rush_supply', { fight: n, skills: [...skills], nodes: [...nodes], allies: allies ? allies.map((r) => r.nodes.length) : null });
    return nodes;
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
    // RELICS batch 4: Pauper's Mark (a major curse) thins every gain.
    const gm = amount > 0 ? relics.glintMul() : 1;
    if (gm !== 1) amount = Math.max(1, Math.round(amount * gm));
    rs.wallet += amount;
    events.emit(getTick(), 'glint_gain', { amount, wallet: rs.wallet, reason, room: rs.roomIndex });
    return rs.wallet;
  }

  // --------------------------------------------------------- clear spoils --
  // M4c node supply (8 sockets per skill): every combat-room clear drops
  // SPOILS_PER_CLEAR nodes straight onto the bench (provenance 'spoils'),
  // drawn from the live usable pool's commons and rares BEFORE the reward
  // candidate (a fixed draw order: stipend -> spoils -> reward). They are
  // never auto-socketed; the reward page and the socket screen name them.
  function dropSpoils(tick) {
    const ids = draft.spoils(RUN.spoilsPerClear);
    // fix-M4a-r4: the drops that UPGRADE a full build (no vacant socket —
    // auto-fill swaps them in over a weaker node), named on the reward page.
    const upgrades = ids.filter((id) => draft.upgradeInfo(id) !== null);
    for (const id of ids) buildSys.grantNode(id, 'spoils');
    rs.spoils = upgrades.length ? { room: rs.roomIndex, nodes: ids, upgrades } : { room: rs.roomIndex, nodes: ids };
    rs.spoilsTotal += ids.length;
    events.emit(tick, 'spoils_drop', {
      room: rs.roomIndex,
      nodes: [...ids],
      total: rs.spoilsTotal,
      ...(upgrades.length ? { upgrades: [...upgrades] } : {}),
    });
  }

  // ----------------------------------------------------------------- draft --
  // Ruling A17: the Healer's loadout in slot order (null = empty slot).
  const healerSlots = () => skillSys.slotsView().map((s) => (s ? s.id : null));

  function presentReward(allySpoils = null) {
    const promised = rs.rewardFor[rs.roomIndex] ?? 'skill';
    rs.reward = draft.offer(promised);
    // Ruling A17 (the user's rule): a SWAP offer carries the §25.8 suggestion
    // — `replace` = the slot the Replaces selector opens on (the lowest-
    // priority owned skill), `suggest` = take|leave. No draw: state only.
    if (rs.reward.swap) {
      const s = swapSuggestion('healer', healerSlots(), rs.reward.id);
      rs.reward.replace = s.replace;
      rs.reward.suggest = s.choice;
    }
    rs.phase = 'reward';
    // NOTE (binding, whole module): the bus builds every event as
    // `{ tick, type, ...payload }` (core/events.js), so a payload key named
    // `type` OVERWRITES the event's own type and makes the event unfindable by
    // `events.some(e => e.type === 'reward_offer')`. The reward's kind
    // therefore rides on `reward:` here, in draft_taken and in draft_declined.
    events.emit(getTick(), 'reward_offer', {
      room: rs.roomIndex,
      promised,
      reward: rs.reward.type,
      id: rs.reward.id,
      substituted: rs.reward.substituted,
      line: rs.reward.line,
      freeSkillSlots: rs.reward.freeSkillSlots,
      poolSize: rs.reward.poolSize,
      // fix-M4a-r4: an UPGRADE offer names its swap target; an empty offer
      // names why (keys present only when set, so fill-pool traces are
      // byte-identical to the pre-fix ones).
      ...(rs.reward.pool ? { pool: rs.reward.pool, upgrade: rs.reward.upgrade ? { ...rs.reward.upgrade } : null } : {}),
      ...(rs.reward.reason ? { reason: rs.reward.reason } : {}),
      // Ruling A17: keys present only on a swap offer (fill-case traces keep
      // their exact payload) — exactly `swap` + `replace` (PLAN §16.3; the
      // suggestion rides the run view, never the event).
      ...(rs.reward.swap ? { swap: true, replace: rs.reward.replace } : {}),
    });
    // PARTY: the ally cards (party stream, seats 1 → 3) — the Healer's card 0
    // mirrors run.reward. With the ally supply off no page opens (the §16.9
    // proof: exactly v0.5.150's events).
    if (allyOn()) pages.open(rs.roomIndex, promised, rs.reward, allySpoils);
  }

  // Ruling A17: move the pending Replaces choice of a swap offer (the UI's
  // W/S / wheel / click, cmd('draftReplace')). Plain run state — saved,
  // replicated, and what takeReward() uses when it is given no slot.
  function setRewardReplace(slot) {
    if (rs.phase !== 'reward' || !rs.reward || !rs.reward.swap) return null;
    const s = Number(slot);
    if (!(Number.isInteger(s) && s >= 0 && s < SKILL_SLOTS) || !healerSlots()[s]) return null;
    rs.reward.replace = s;
    // The party page's card 0 mirrors run.reward: its mark follows at once
    // (was stale until the Healer's decision — state().run.party.cards[0]
    // .replace disagreed with the card on screen; PARTY r6 advisory).
    const c0 = pages && pages.isOpen() ? pages.card(0) : null;
    if (c0 && c0.swap) c0.replace = s;
    return s;
  }

  // PARTY (PLAN §16.3): a card's decision. Seat 0 = the Healer's card (its
  // swap slot moves run.reward.replace); seats 1-3 = the ally cards. The page
  // COMMITS when every card is decided (commitIfReady) — in Suggested mode
  // the AI-held cards open decided, so the Healer's one decision commits.
  function partyPick(seat, choice, replace = null, { by = 'human' } = {}) {
    if (rs.phase !== 'reward') return { denied: 'closed' };
    const s = Number(seat);
    if (s === 0) {
      if (choice === 'take' && (!rs.reward || !rs.reward.type)) return { denied: 'nothing_to_take' };
      if (rs.reward && rs.reward.swap && Number.isInteger(replace)) setRewardReplace(replace);
      if (pages && pages.isOpen()) pages.pick(0, choice, rs.reward && rs.reward.swap ? rs.reward.replace : null, { by });
      else return choice === 'take' ? takeReward(replace ?? undefined) : declineReward();
      return commitIfReady() ?? { ok: true, seat: 0, choice };
    }
    if (!pages || !pages.isOpen()) return { denied: 'closed' };
    const r = pages.pick(s, choice, replace, { by });
    if (r && r.denied) return r;
    return commitIfReady() ?? r;
  }
  function commitIfReady() {
    if (!pages || !pages.isOpen()) return null;
    if (pages.undecided().length > 0) return null;
    return commitPage('commit');
  }
  // Apply the page: seat 0 exactly as today, then seats 1-3, then the doors.
  function commitPage(reason = 'commit') {
    const c0 = pages && pages.isOpen() ? pages.card(0) : null;
    const choice0 = c0 && c0.decided ? c0.choice : rs.reward && rs.reward.type ? 'take' : 'leave';
    const taken = choice0 === 'take' && rs.reward && rs.reward.type ? applyTake(rs.reward.swap ? rs.reward.replace : undefined) : applyDecline();
    if (pages && pages.isOpen()) pages.applyAllies(reason);
    if (party && party.autoSocketOwn(0) && controllers()[0] === 'human') buildSys.autoFill();
    // v0.5.227: an AI-held Healer sockets its own nodes, like the AI seats.
    else if (party && controllers()[0] !== 'human' && party.mode() !== 'manual') buildSys.autoFill();
    afterReward(taken);
    return taken ?? { declined: true };
  }

  // §16: take-or-decline, no confirm, no reroll, no reopen. The legacy
  // one-call entry (the harness, the autopilot, cmd('draftTake')): the
  // Healer's card taken, then the page committed with the ally cards as the
  // mode left them (Suggested: today's one-call behaviour).
  // Ruling A17: on a SWAP offer `replace` names the slot the new skill takes
  // (default: the pending choice, reward.replace); the old skill leaves the
  // loadout and its nodes go to the bench.
  function takeReward(replace) {
    if (rs.phase !== 'reward' || !rs.reward || !rs.reward.type) return null;
    if (pages && pages.isOpen()) {
      if (rs.reward.swap && Number.isInteger(replace)) setRewardReplace(replace);
      pages.pick(0, 'take', rs.reward.swap ? rs.reward.replace : null, { by: 'human' });
      return commitPage('commit');
    }
    const taken = applyTake(replace);
    if (taken) afterReward(taken);
    return taken;
  }

  function applyTake(replace) {
    if (!rs.reward || !rs.reward.type) return null;
    const tick = getTick();
    const taken = { type: rs.reward.type, id: rs.reward.id };
    if (rs.reward.type === 'skill' && rs.reward.swap) {
      const slot = Number.isInteger(replace) && healerSlots()[replace] ? replace : rs.reward.replace;
      const old = healerSlots()[slot];
      if (!old) return null; // defensive: a swap always has 4 owned
      const released = buildSys.releaseSkill(old);
      const r = skillSys.replaceSkill(slot, rs.reward.id);
      if (!r || r.error) return null;
      taken.slot = slot;
      taken.replaced = old;
      taken.released = released;
      events.emit(tick, 'draft_taken', { reward: 'skill', id: rs.reward.id, slot, swap: true, replaced: old, released: [...released] });
      events.emit(tick, 'skill_swapped', { seat: 0, id: rs.reward.id, slot, replaced: old, released: [...released] });
    } else if (rs.reward.type === 'skill') {
      const r = skillSys.giveSkill(rs.reward.id); // -> first empty slot (§16)
      events.emit(tick, 'draft_taken', { reward: 'skill', id: rs.reward.id, slot: r.slot ?? null });
    } else {
      buildSys.grantNode(rs.reward.id, 'drafted'); // -> bench, never auto-socketed
      events.emit(tick, 'draft_taken', { reward: 'node', id: rs.reward.id, bench: true });
    }
    rs.reward = null;
    return taken;
  }

  function declineReward() {
    if (rs.phase !== 'reward') return null;
    if (pages && pages.isOpen()) {
      pages.pick(0, 'leave', null, { by: 'human' });
      return commitPage('commit');
    }
    const r = applyDecline();
    afterReward(null);
    return r;
  }
  function applyDecline() {
    const type = rs.reward ? rs.reward.type : null;
    const id = rs.reward ? rs.reward.id : null;
    events.emit(getTick(), 'draft_declined', { reward: type, id }); // declines have no memory
    rs.reward = null;
    return { declined: true, type, id };
  }

  function afterReward(taken = null) {
    // RELICS: an owed relic pick comes after the draft, before the doors.
    if (relics.presentDue(gainGlint)) {
      rs.phase = 'relic';
      return taken;
    }
    afterRelic();
    return taken;
  }
  function afterRelic() {
    // SECRET ROOMS: a wall broken open in this room: the party steps through
    // the breach before the doors.
    if (secrets.chamberDue(rs.roomIndex)) {
      RF.enterSecret(getTick());
      return;
    }
    // BOSS RUSH: the fight's draft and pick are done; on to the next land.
    if (rushFight() && rs.roomIndex === RUN.bossRoom) {
      RF.onLevelCleared(getTick());
      return;
    }
    if (rs.roomIndex <= RUN.pathRooms) {
      presentPath();
    } else {
      // Rooms 6->7 and 7->8 are fixed transitions (§2: no choice).
      beginFade(rs.roomIndex + 1);
    }
  }

  // RELICS: the relic page (phase 'relic') — one of three, no reroll.
  function focusRelic(i) {
    if (rs.phase !== 'relic') return null;
    return relics.focus(i);
  }
  function chooseRelic(i) {
    if (rs.phase !== 'relic') return null;
    const id = relics.choose(i);
    if (!id) return null;
    afterRelic();
    return { relic: id };
  }

  // ------------------------------------------------------------------ path --
  function presentPath() {
    const nextRoom = rs.roomIndex + 1;
    const win = rs.frame.modes[nextRoom - 1];
    const skillLeft = rs.frame.sides[rs.roomIndex - 1] === 0;
    const options = [
      { side: 0, win, reward: skillLeft ? 'skill' : 'node' },
      { side: 1, win, reward: skillLeft ? 'node' : 'skill' },
    ];
    // RELICS: one door may carry a curse (key present only then).
    const dc = relics.rollDoorCurse();
    if (dc) {
      options[dc.side].curse = dc.curse;
      if (dc.major) options[dc.side].major = true;
    }
    // EVENT ROOMS: maybe a "?" door, never the cursed one (keys present only then).
    const ed = encounters.rollDoor(nextRoom, dc ? dc.side : null, encCtx());
    if (ed) options[ed.side] = { side: ed.side, win: 'event', reward: 'event', event: true, encounter: ed.id };
    // CHAMPION ROOMS: the level's crown door (never the cursed one; over the
    // event door when the other is cursed). Its reward stays the door's own.
    const crown = championsOn() ? (rs.forcedCrown ?? crownFor(rs.frame.seed, rs.campaign.index)) : null;
    rs.forcedCrown = null;
    if (crown && crown.room === nextRoom) {
      const side = crownSide(crown.side, dc ? dc.side : null, ed ? ed.side : null);
      const keep = options[side].event ? { side, win: 'champion', reward: rs.frame.sides[rs.roomIndex - 1] === 0 ? (side === 0 ? 'skill' : 'node') : side === 0 ? 'node' : 'skill' } : { ...options[side], win: 'champion' };
      options[side] = { ...keep, champion: levelChampion() };
    }
    // KEYS AND VAULTS: while the party holds a key, the vault door (never the
    // cursed or the crown door; over a "?" door only when it must). It keeps
    // its door's own reward: the draft still follows the vault.
    const R = VAULT_RULES;
    if (vaults.enabled() && vaults.held() && vaults.open() && nextRoom >= R.doorRooms[0] && nextRoom <= R.doorRooms[1]) {
      const crownAt = options.findIndex((o) => o.champion);
      const eventAt = options.findIndex((o) => o.event);
      const pref = rs.forcedVault ?? vaultPref(rs.frame.seed, rs.campaign.index, nextRoom);
      const side = vaultSide(pref, dc ? dc.side : null, eventAt >= 0 ? eventAt : null, crownAt >= 0 ? crownAt : null);
      if (side !== null) {
        const reward = rs.frame.sides[rs.roomIndex - 1] === 0 ? (side === 0 ? 'skill' : 'node') : side === 0 ? 'node' : 'skill';
        options[side] = { side, win: 'vault', reward, vault: true };
      }
    }
    rs.forcedVault = null;
    rs.path = {
      nextRoom,
      options,
      focus: 0,
      freeSkillSlots: draft.freeSkillSlots(),
    };
    rs.phase = 'path';
    if (pages) pages.armDoor(getTick()); // PARTY: network door deadline (≥ 2 humans)
    events.emit(getTick(), 'path_offer', {
      room: rs.roomIndex,
      nextRoom,
      options: options.map((o) => ({ side: o.side, win: o.win, reward: o.reward, ...(o.curse ? { curse: o.curse } : {}), ...(o.major ? { major: true } : {}), ...(o.event ? { event: true } : {}), ...(o.champion ? { champion: o.champion } : {}), ...(o.vault ? { vault: true } : {}) })),
      freeSkillSlots: rs.path.freeSkillSlots,
    });
  }

  function focusPath(side) {
    if (rs.phase !== 'path' || !rs.path) return null;
    rs.path.focus = side === 1 ? 1 : 0;
    return rs.path.focus;
  }

  function choosePath(side, { hold = true } = {}) {
    if (rs.phase !== 'path' || !rs.path) return null;
    if (rs.path.hold) return { held: true, side: rs.path.hold.side, untilTick: rs.path.hold.untilTick };
    // PARTY (BUILD_BRIEF §25.7): a committed door waits <= socketHoldTicks
    // while a human's socket screen is open (network only: the screens are
    // reported only in a session with >= 2 humans).
    if (hold && pages && pages.humans() >= 2 && pages.humanScreenOpen()) {
      const untilTick = getTick() + PARTY_DEADLINES.socketHoldTicks;
      rs.path.hold = { side: side === 1 ? 1 : 0, untilTick };
      if (pages) pages.clearDoor();
      events.emit(getTick(), 'party_deadline', { what: 'socket_hold', tick: untilTick, side: rs.path.hold.side });
      return { held: true, side: rs.path.hold.side, untilTick };
    }
    const opt = rs.path.options[side === 1 ? 1 : 0];
    if (pages) pages.clearDoor();
    rs.rewardFor[rs.path.nextRoom] = opt.reward;
    events.emit(getTick(), 'path_chosen', {
      room: rs.roomIndex,
      nextRoom: rs.path.nextRoom,
      side: opt.side,
      win: opt.win,
      reward: opt.reward,
    });
    const next = rs.path.nextRoom;
    if (opt.curse) relics.takeCurse(opt.curse, next);
    // EVENT ROOMS: the "?" door turns the next room into its event room.
    if (opt.event) {
      rs.frame.modes[next - 1] = 'event';
      rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== next);
      encounters.arm(next, opt.encounter);
    }
    // CHAMPION ROOMS: the crown door turns the next room into the champion's.
    if (opt.champion) {
      rs.frame.modes[next - 1] = 'champion';
      rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== next);
      events.emit(getTick(), 'crown_door_taken', { room: next });
    }
    // KEYS AND VAULTS: the key turns in the lock; the next room is the vault.
    if (opt.vault) {
      rs.frame.modes[next - 1] = 'vault';
      rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== next);
      vaults.spend(next);
    }
    rs.path = null;
    // TUTORIAL: the door is the last lesson — back to camp.
    if (tutorialOn()) {
      endTutorial('done');
      return { nextRoom: next, reward: opt.reward, win: opt.win, tutorial: 'done' };
    }
    beginFade(next);
    return { nextRoom: next, reward: opt.reward, win: opt.win, ...(opt.curse ? { curse: opt.curse } : {}), ...(opt.major ? { major: true } : {}), ...(opt.event ? { event: true } : {}), ...(opt.champion ? { champion: opt.champion } : {}), ...(opt.vault ? { vault: true } : {}) };
  }


  const encounterBody = () => registry.all().find((e) => e.itype === 'encounter');





  // ------------------------------------------------------------ shrines --
  // SHRINES (docs/SHRINES.md, sim/shrines.js). One a level, on the champions'
  // gate (campaign, Endless and the Daily; never the tutorial or the legacy
  // single-level run, so the goldens never see one). Boss Rush has none.
  // shrine: { aim, room, id, used, usedBy, pick, curse, offered } | null
  rs.shrine = null;
  events.on('shrine_touch', (ev) => RF.useShrine(ev.seat ?? 0));








  // §13/§16 transition fade (<= 300 ms) between the meta screens and the next
  // room's first tick.
  function beginFade(next) {
    rs.pendingRoom = next;
    rs.fadeUntilTick = getTick() + RUN.fadeTicks;
    rs.phase = 'fade';
    events.emit(getTick(), 'room_transition', { from: rs.roomIndex, to: next, ticks: RUN.fadeTicks });
  }











  // ------------------------------------------------ tutorial (TUTORIAL.md) --
  // The guided first room: Level 1 room 1 at tutorialDiff, the waves held
  // until tutorialRelease(), relics off, and the door choice ends it. It ends
  // as run_end { result: 'tutorial' } (the profile records nothing) and goes
  // straight home: return_to_camp { reason: 'tutorial' }.
  function tutorialOn() {
    return !!(rs.active && rs.campaign && rs.campaign.tutorial);
  }
  function tutorialRelease() {
    if (!tutorialOn() || !rs.campaign.tutorial.hold) return null;
    rs.campaign.tutorial.hold = false;
    if (rs.phase === 'combat' && rs.roomIndex === 1) waves.beginRoom();
    events.emit(getTick(), 'tutorial_release', { room: rs.roomIndex });
    return { released: true };
  }
  function endTutorial(reason = 'done') {
    if (!tutorialOn()) return null;
    const tick = getTick();
    events.emit(tick, 'tutorial_end', { reason });
    endRun('tutorial');
    rs.phase = 'idle';
    rs.autoReturnTick = null;
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    events.emit(tick, 'return_to_camp', { enemies: leaked, reason: 'tutorial' });
    return { tutorial: reason };
  }

  // Quit to Lobby (pause menu, confirmed): the campaign is abandoned — the
  // records count it — and the world returns to camp with no end card.
  function abandonRun(reason = 'quit') {
    if (!rs.active) return null;
    // TUTORIAL: leaving the guided room is never a counted run.
    if (tutorialOn()) return endTutorial(typeof reason === 'string' ? reason : 'quit');
    const tick = getTick();
    const s = endRun('abandoned');
    rs.phase = 'idle';
    rs.autoReturnTick = null;
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    events.emit(tick, 'return_to_camp', { enemies: leaked, reason: typeof reason === 'string' ? reason : 'quit' });
    return { abandoned: true, summary: s };
  }


  // fix-M4a-r4: `{ upgrade: { skill, slot, replaces, why } }` when `nodeId`
  // would UPGRADE the build (no vacant usable socket, outranks a socketed
  // node), else {} — spread into view objects so the key exists only then.
  function upgradeKey(nodeId) {
    if (!nodeId) return {};
    const up = draft.upgradeInfo(nodeId);
    return up ? { upgrade: up } : {};
  }







  // TONICS AND BOMBS: this tick's slot presses (the world calls it after the
  // content pass): `list` = [{ seat, aim }] from the Healer's own snapshot and
  // the human seats' input frames, resolved in seat order; then the AI-held
  // seats (and the Healer under the autopilot) look at theirs.
  function useTonics(list) {
    if (!rs.active || !tonics.enabled()) return;
    const live = rs.phase === 'combat';
    for (const u of [...list].sort((a, b) => a.seat - b.seat)) tonics.use(u.seat, u.aim ?? null, live);
    const c = controllers();
    // SECRET ROOMS: the autopilot's Healer throws a bomb it holds at a cracked
    // wall in reach (so the probes can reach a chamber).
    if (live && autopilot.active() && secrets.shut() && !relics.wallSealed()) {
      const w = secrets.wall();
      const id = tonics.slot(0);
      const row = id ? CONSUMABLES[id] : null;
      if (row && row.type === 'bomb' && Math.hypot(player.x - w.x, player.z - w.z) <= 6) tonics.use(0, { x: w.x + Math.sin(w.yaw) * 0.5, z: w.z + Math.cos(w.yaw) * 0.5 }, live);
    }
    const ai = [0, 1, 2, 3].filter((s) => (s === 0 ? autopilot.active() : c[s] !== 'human'));
    tonics.aiStep(ai, live);
  }



  // ------------------------------------------------------------- run end --
  function buildSummary(result) {
    // CAMPAIGN: the level being played when the run ended records its rooms.
    if (rs.campaign) {
      const rec = rs.campaign.levels[rs.campaign.levels.length - 1];
      if (rec && !rec.cleared) {
        rec.rooms = rs.roomsDone;
        rec.ticks = getTick() - rs.campaign.levelStartTick;
      }
    }
    const b = buildSys.view();
    return {
      result,
      victory: result === 'victory',
      act: rs.act,
      actName: levelFor(rs.act).name,
      challenge: rs.challenge,
      rooms: rs.roomsDone, // §18 "ROOMS CLEARED n / 8" — every room left behind
      combatRooms: rs.clearedRooms, // the §14 stipend counter (max 7)
      lastRoom: rs.roomIndex,
      glint: rs.wallet,
      seed: rs.frame ? rs.frame.seed : null,
      ticks: getTick() - rs.startTick,
      skills: skillSys
        .slotsView()
        .filter(Boolean)
        .map((s) => s.id),
      ...(party ? { builds: RF.partyBuilds() } : {}),
      ...(relics.enabled() ? { relics: relics.owned(), curses: relics.view().cursesTaken } : {}),
      // SECRET ROOMS: the walls found of the walls seen (present only once one showed).
      ...(secrets.enabled() && secrets.summary().seen > 0 ? { secrets: secrets.summary() } : {}),
      // UNLOCKS: what the run was started with (present only when something was).
      ...(rs.campaign && rs.campaign.boons ? { boons: cloneData(rs.campaign.boons) } : {}),
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
      campaign: rs.campaign
        ? {
            mode: rs.campaign.mode,
            harness: rs.campaign.harness,
            startLevel: rs.campaign.startLevel,
            level: rs.campaign.level,
            index: rs.campaign.index,
            levels: cloneData(rs.campaign.levels),
            levelsCleared: rs.campaign.levels.filter((l) => l.cleared).length,
            complete: rs.campaign.mode === 'campaign' && !rs.campaign.rush && (result === 'victory' || !!rs.campaign.won),
            grant: cloneData(rs.campaign.grant),
            // ENDLESS: how deep the descent went (present only on one).
            ...(rs.campaign.endless ? { endless: true, depth: rs.campaign.index, depthsCleared: rs.campaign.levels.filter((l) => l.cleared).length, won: !!rs.campaign.won } : {}),
            // BOSS RUSH: how many bosses fell, of how many, and the line.
            ...(rs.campaign.rush
              ? {
                  rush: {
                    felled: rs.campaign.levels.filter((l) => l.cleared).length,
                    fights: rs.campaign.rush.fights,
                    won: result === 'victory',
                    line: cloneData(rs.campaign.rush.line),
                  },
                }
              : {}),
            // DAILY: the day and how deep the run got (rooms across levels).
            ...(rs.campaign.daily
              ? {
                  daily: {
                    key: rs.campaign.daily.key,
                    relic: rs.campaign.daily.relic,
                    curse: rs.campaign.daily.curse,
                    depth: dailyDepth({ index: rs.campaign.index, rooms: rs.roomsDone, won: result === 'victory', levels: rs.campaign.index }),
                    won: result === 'victory',
                    seed: rs.campaign.daily.seed,
                    ...(rs.campaign.daily.practice ? { practice: true } : {}),
                  },
                }
              : {}),
          }
        : null,
    };
  }

  function endRun(result) {
    if (!rs.active) return null;
    const tick = getTick();
    rs.summary = buildSummary(result);
    tonics.clearRoom();
    events.emit(tick, 'run_end', {
      result,
      rooms: rs.summary.rooms,
      glint: rs.summary.glint,
      skills: [...rs.summary.skills],
      nodes: rs.summary.nodes.bench.length + rs.summary.nodes.socketed.length,
      ticks: rs.summary.ticks,
      act: rs.act,
      challenge: rs.challenge,
      campaign: rs.summary.campaign ? cloneData(rs.summary.campaign) : null,
    });
    // §2/§13: ALL run state is wiped at run end (the end screen renders from
    // the frozen summary above, never from live state). Gauntlet r6 (journey
    // J6-F1 / campaign CR6-F1, PLAN §12.1 "CAMPAIGN COMPLETE card -> camp",
    // ruling A15): the run's world ends here — the director, the Stag, every
    // hostile and shot go, nothing can fight — but the party and its build
    // stay exactly as the last blow left them while the victory / defeat card
    // is up, so the level (and a fallen party) is what the card sits over.
    // The loadout reset (run_wiped) happens with the return to camp. A Quit
    // to Lobby has no card and resets at once.
    if (result === 'abandoned' || result === 'tutorial') wipeState({ silent: false });
    else endWorld();
    rs.phase = result; // 'victory' | 'defeat'
    return rs.summary;
  }

  // Everything the run owns goes back to boot condition (§13 "Wiped at run
  // end: everything"): skills back to the starting kit with fresh cooldowns,
  // bench + sockets empty, Glint 0, party topped up and standing, dodge timer
  // clear, arena emptied of enemies and of the boss.
  function wipeState({ silent }) {
    endWorld();
    resetLoadout({ silent });
  }

  // The run's world goes: room, campaign, pages, director, Stag, hostiles,
  // shots, zones. combatAllowed() is false from here.
  function endWorld() {
    const tick = getTick();
    exitRoom(tick);
    rs.lastCombatLayout = null;
    rs.roomPlanView = null;
    rs.campaign = null; // (endRun froze it into the summary first)
    rs.active = false;
    rs.roomIndex = 0;
    rs.reward = null;
    rs.path = null;
    rs.shop = null;
    rs.frame = null;
    rs.rewardFor = {};
    rs.pendingRoom = 0;
    rs.roomsDone = 0;
    rs.clearedRooms = 0;
    rs.spoils = null;
    rs.spoilsTotal = 0;
    rs.phase = 'idle';
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
  }

  // Everything the party carried goes back to boot condition.
  function resetLoadout({ silent }) {
    const tick = getTick();
    // (the boundary's free revive stands a fallen party up — at the return,
    // never under the defeat card)
    allySys.cmd('roomBoundary');
    rs.wallet = RUN.startingGlint;
    const kit = new Array(SKILL_SLOTS).fill(null);
    STARTING_SKILLS.forEach((id, i) => {
      kit[i] = { id, remaining: 0 };
    });
    skillSys.restore({ slots: kit, override: null });
    buildSys.restore({ bench: [], assignments: [] });
    // PARTY: every ally back to its starting loadout, empty build, purse 0.
    if (party) party.resetForRun(rng.seed);
    if (pages) pages.reset();
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
    if (!silent) events.emit(tick, 'run_wiped', { wallet: rs.wallet, skills: STARTING_SKILLS.length });
  }

  function returnToCamp() {
    // The camp hub scene lands with its own block; the run's world went at
    // run end, so this dismisses the end screen and resets the loadout.
    if (rs.phase !== 'victory' && rs.phase !== 'defeat') return null;
    rs.phase = 'idle';
    rs.autoReturnTick = null;
    // Debug assertion for §18: nothing hostile may ride into the hub. The
    // count is taken BEFORE the belt-and-braces sweep so a leak is visible in
    // the event payload even though the sweep removes it.
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    // The party leaves the end card's world: its loadout resets now (always,
    // so a card restored from a save resets too).
    resetLoadout({ silent: false });
    events.emit(getTick(), 'return_to_camp', { enemies: leaked });
    return { phase: rs.phase, enemies: leaked };
  }

  // -------------------------------------------------------------- ticking --
  function continuous() {
    if (rs.active && rs.roomIndex === RUN.bossRoom && rs.phase === 'combat') boss.continuous();
  }

  function discrete() {
    if (rs.active && rs.roomIndex === RUN.bossRoom && rs.phase === 'combat') boss.resolve();
  }

  function endOfTick() {
    // RELICS: this tick's procs (Thorn Mail, Leech Fang) land first.
    if (rs.active) relics.endOfTick();
    // KEYS AND VAULTS: a fallen key lands; a hero walking over one takes it;
    // in the vault, over a pile or the platter.
    // TONICS AND BOMBS: drops land, heroes walk over them, bombs land, fire
    // burns.
    if (rs.active && tonics.enabled()) tonics.step(controllers());
    if (rs.active && vaults.enabled()) {
      vaults.step();
      if (rs.phase === 'vault') RF.stepVault();
    }
    if (rs.active && rs.phase === 'secret') RF.stepSecret();
    if (rs.active && rs.roomIndex === RUN.bossRoom && rs.phase === 'combat') boss.endOfTick();
    // Status bookkeeping for the tick that just resolved (announce + prune),
    // before a fade can walk into the next room.
    statusTracker.endOfTick();
    // PARTY: network deadlines (armed live; nothing in single-player).
    if (pages && (rs.phase === 'reward' || rs.phase === 'path' || rs.phase === 'shop')) partyDeadlines();
    // PARTY: a held door leaves when every human socket screen closed or the
    // hold ran out (the screens close and bank a node in hand).
    if (rs.phase === 'path' && rs.path && rs.path.hold && (getTick() >= rs.path.hold.untilTick || !pages || !pages.humanScreenOpen())) {
      const side = rs.path.hold.side;
      const timedOut = getTick() >= rs.path.hold.untilTick;
      rs.path.hold = null;
      if (timedOut) events.emit(getTick(), 'party_socket_close', { reason: 'door' });
      choosePath(side, { hold: false });
    }
    if (rs.phase === 'fade' && getTick() >= rs.fadeUntilTick) enterRoom(rs.pendingRoom);
    // PLAN §12.2: the card's own hard bound — the sim advances whatever the
    // presentation does (hidden host tab, no UI, a stuck preload).
    if (rs.phase === 'transit' && rs.campaign && rs.campaign.card && getTick() >= rs.campaign.card.hardUntilTick) RF.advanceLevel('timeout');
    // CAMPAIGN COMPLETE -> camp, in sim time (pause holds it; guests follow).
    if (rs.phase === 'victory' && rs.autoReturnTick !== null && getTick() >= rs.autoReturnTick) returnToCamp();
  }

  // PARTY (PLAN §16.3 / §16.5): arm / fire the network deadlines.
  function partyDeadlines() {
    const tick = getTick();
    pages.syncDeadlines(tick);
    const due = pages.due(tick);
    if (!due) return;
    if (due === 'page' && rs.phase === 'reward') {
      pages.timeoutPage();
      const c0 = pages.card(0);
      if (c0 && !c0.decided) {
        // The Healer's own card (a human host that never chose): the §25.8 rule.
        const choice = rs.reward && rs.reward.type ? (rs.reward.swap ? rs.reward.suggest : 'take') : 'leave';
        pages.pick(0, choice, rs.reward && rs.reward.swap ? rs.reward.replace : null, { by: 'timeout' });
        events.emit(tick, 'party_autopick', { seat: 0, reason: 'timeout', choice, id: rs.reward ? rs.reward.id : null });
      }
      commitPage('timeout');
    } else if (due === 'door' && rs.phase === 'path') {
      // KEYS AND VAULTS: the AI takes the vault door when it holds a key.
      const vs = rs.path && rs.path.options[1] && rs.path.options[1].vault ? 1 : 0;
      events.emit(tick, 'party_autopick', { seat: 0, reason: 'door_timeout', choice: vs ? 'right' : 'left' });
      choosePath(vs);
    } else if (due === 'shop' && rs.phase === 'shop') {
      RF.advanceFromShop({ force: true });
    }
  }

  // §2: defeat = all 4 party members Downed simultaneously (the ONLY defeat
  // rule). The ally block owns the predicate and emits `defeat`.
  function onDefeat() {
    if (!rs.active) return;
    // TUTORIAL: a fallen party just goes home (no defeat card, no record).
    if (tutorialOn()) {
      endTutorial('defeat');
      return;
    }
    endRun('defeat');
  }

  // ----------------------------------------------------------------- view --
  const combatActive = () => rs.active && rs.phase === 'combat';



  // The live room's plan: difficulty numbers + the rolled waves (wave rooms).
  function roomPlanFull() {
    if (!rs.roomPlanView) return null;
    const w = typeof waves.planView === 'function' ? waves.planView() : null;
    return { ...rs.roomPlanView, waves: w ? w.waves : [], roster: w ? w.roster : [], legacy: w ? w.legacy : null };
  }

  // PLAN §3.6 (a): M4b's content systems register here; enter() is called
  // synchronously at the room-enter point (same tick, before room_enter),
  // exit() when the room is left and at run end.
  function setRoomHooks(h = {}) {
    rs.roomHooks = {
      enter: typeof h.enter === 'function' ? h.enter : null,
      exit: typeof h.exit === 'function' ? h.exit : null,
    };
    return true;
  }



  Object.assign(RF, { abandonRun, affixRule, afterRelic, afterReward, beginFade, choosePath, chooseRelic, commitPage, declineReward, endRun, endTutorial, enterRoom, exitRoom, focusPath, focusRelic, gainGlint, partyPick, positionParty, presentReward, reseedTo, returnToCamp, rollFrame, roomPlanFull, sealedKnock, setRewardReplace, startCampaign, startRun, stressHealer, sweepPlayerTransients, takeReward, tutorialOn, tutorialRelease, upgradeKey, vowedDiff }); // the closure's own functions the parts call
  Object.assign(RF, createRunShop({ rs, RF, allyOn, buildSys, controllers, draft, events, getTick, pages, party, relics, tonics }));
  Object.assign(RF, createRunShrines({ rs, RF, championsOn, events, getTick, party, player, registry, relics, tonics, vaults }));
  Object.assign(RF, createVaultRoom({ rs, RF, allyOn, combat, events, getTick, party, registry, relics, tonics, vaults }));
  Object.assign(RF, createSecretRoom({ rs, RF, allyOn, encCtx, encounters, events, getTick, party, player, registry, relics, secrets, tonics }));
  Object.assign(RF, createEventRoom({ rs, RF, allyOn, combat, encCtx, encounterBody, encounters, endlessDepth, events, getTick, objectivesOn, party, player, registry, relics, roomLevel, skillSys, waves }));
  Object.assign(RF, createRunCommands({ rs, RF, allyOn, autopilot, boss, buildSys, championsOn, combat, draft, encCtx, encounters, enemies, events, getTick, levelChampion, pages, party, player, registry, relics, rng, secrets, tonics, vaults, waves }));
  Object.assign(RF, createRunSave({ rs, autopilot, encounters, pages, relics, secrets, tonics, vaults }));
  Object.assign(RF, createRunView({ rs, RF, boss, combatActive, currentBoss, draft, encCtx, encounters, endlessDepth, getTick, nextOf, pages, party, relics, secrets, tonics, vaults }));
  Object.assign(RF, createRunLevels({ rs, RF, allySys, boss, buildSys, currentBoss, encounters, enemies, events, firstRoom, forkRoads, getTick, nextOf, objectivesOn, pages, party, player, registry, relics, rng, secrets, skillSys, vaults, waves }));
  const api = {
    saveState: RF.saveState,
    loadState: RF.loadState,
    startRun,
    // Linear campaign (PLAN §12.2).
    startCampaign,
    campaignAdvance: RF.campaignAdvance,
    pickRoad: RF.pickRoad,
    abandonRun,
    tutorialRelease,
    endTutorial,
    campaign: RF.campaignView,
    campaignRules,
    endRun,
    onRoomCleared,
    onDefeat,
    continuous,
    discrete,
    endOfTick,
    view: RF.view,
    cmd: RF.cmd,
    setRoomHooks,
    autopilot,
    roomPlan: roomPlanFull,
    layout: () => (rs.layout ? { ...rs.layout } : null),
    act: () => rs.act,
    challenge: () => rs.challenge,
    expeditionState: RF.expeditionState,
    restoreExpedition: RF.restoreExpedition,
    statusKinds: () => [...STATUS_KINDS],
    skillIds: () => Object.keys(SKILLS),
    isActive: () => rs.active,
    // The spawn-gate predicate the HUD mirrors for the ?room= harness boot.
    combatAllowed,
    combatActive,
    combatAllowed,
    // UI entry points (src/ui/run/**) — the same paths __echoes.cmd drives.
    takeReward,
    declineReward,
    setRewardReplace,
    // PARTY (PLAN §16.3): the party page / shelves entry points.
    partyPick,
    partyCommit: () => (rs.phase === 'reward' && pages && pages.isOpen() ? commitPage('commit') : null),
    partyReplace: (seat, slot) => (Number(seat) === 0 ? setRewardReplace(slot) : pages && pages.isOpen() ? pages.setReplace(Number(seat), slot) : null),
    partyBuy: RF.partyBuy,
    partyShopMark: RF.partyShopMark,
    partyShopDone: RF.partyShopDone,
    partyPages: () => pages,
    // PARTY (§25.1): reorder a character's 4 skills between rooms.
    reorderLoadout(seat, from, to) {
      if (combatActive()) return { denied: 'combat_active' };
      if (Number(seat) === 0) return skillSys.reorderSkills(from, to);
      return party ? party.reorder(Number(seat), from, to) : null;
    },
    // The Auto-fill all button (socket screen, Shift+F / pad). `seats`: the
    // seats this caller owns (a network host: its own + AI-held; a guest's
    // CMD: its own) — default all four.
    autoFillAll(seats = null) {
      if (combatActive()) return { denied: 'combat_active' };
      const want = (s) => !Array.isArray(seats) || seats.includes(s);
      const out = want(0) ? [{ seat: 0, ...buildSys.autoFill() }] : [];
      if (party) for (const s of [1, 2, 3]) if (want(s)) out.push({ seat: s, ...party.autoFill(s) });
      return out;
    },
    partyScreen: RF.partyScreen,
    setHarnessGrant: (g) => {
      rs.harnessGrant = g ?? null;
      return rs.harnessGrant;
    },
    focusPath,
    choosePath,
    // RELICS: the relic page's entry points.
    focusRelic,
    chooseRelic,
    buyRelic: RF.buyRelic,
    // EVENT ROOMS: the encounter card's entry points.
    openEncounter: RF.openEncounter,
    focusEncounter: RF.focusEncounter,
    chooseEncounter: RF.chooseEncounter,
    // KEYS AND VAULTS: the chest (E does the same through the interactables).
    openVault: RF.openVault,
    openSecret: RF.openSecret,
    // TONICS AND BOMBS: the stand, the slot presses and the system (probes).
    buyTonic: RF.buyTonic,
    useTonics,
    tonics: () => (tonics.enabled() ? tonics.view() : null),
    relics: () => (relics.enabled() ? relics.view() : null),
    buy: RF.buy,
    refreshShop: RF.refreshShop,
    refreshCost: RF.refreshCost,
    advanceFromShop: RF.advanceFromShop,
    returnToCamp,
    wallet: () => rs.wallet,
  };
  return api;
}
