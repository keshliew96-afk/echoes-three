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
import { levelFor, ACT_IDS, CAMPAIGN_ACTS, ROADS, DEFAULT_ROAD, roadOfAct, bossFor, campaignLevel } from '../data/levels.js';
// ENDLESS (docs/ENDLESS.md): the descent past Act III.
import { endlessDifficulty, endlessLevel, endlessBossIndex, endlessNextLevel, endlessRules, levelOfDepth, beyondCampaign } from '../data/endless.js';
import { LAYOUTS, arenaOf } from '../data/layouts.js';
import { difficulty, CHALLENGE, setDifficultyLegacy, isDifficultyLegacy } from '../data/difficulty.js';
import { createStatusTracker, STATUS_KINDS } from './status.js';
import { createAutopilot } from './autopilot.js';
// RELICS (docs/CONTENT_PLAN.md §5): run-long relics + cursed doors.
import { createRelicSystem, cursedDiff, dailyOmen, RELICS, RELIC_RULES, CURSES } from './relics.js';
// DAILY DESCENT (docs/DAILY.md): the shared run of the UTC day.
import { isDailyKey, dailySeed, dailyLevelSeed, dailyDepth, DAILY_RULES } from '../data/daily.js';
// BOSS RUSH (docs/BOSS_RUSH.md): the bosses back to back.
import { RUSH_RULES, rushLine, rushDifficulty, rushNextLevel, rushSupply, rushReward, rushAct, rushRules } from '../data/rush.js';
// ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md): hunt and purge rooms.
import { assignObjectives, isObjectiveMode, OBJECTIVE_RULES } from './objectives.js';
// CHAMPION ROOMS (docs/CHAMPIONS.md): the crown door and its relic chest.
import { crownFor, crownSide, championPick, championById, CHAMPION_RULES, isChampionKind } from './champions.js';
// KEYS AND VAULTS (docs/VAULTS.md): keys from elites and champions, the vault
// door and its treasure room.
import { createVaultSystem, eliteDropsKey, vaultPref, vaultSide, VAULT_RULES } from './vaults.js';
import { createConsumableSystem, eliteDropsTonic, chestTonic, CONSUMABLES } from './consumables.js';
// SECRET ROOMS (docs/SECRET_ROOMS.md): the cracked wall and its hidden chamber.
import { createSecretSystem, wallRolls, SECRET_RULES } from './secrets.js';
import { refreshBlockers } from './interactables.js';
import { SHRINES } from './shrines.js';
// EVENT ROOMS (docs/EVENT_ROOMS.md): "?" doors and their encounters.
import { createEncounterSystem, ENCOUNTERS, EVENT_RULES } from './encounters.js';
// ELITE AFFIXES (docs/ELITE_AFFIXES.md): how many powers an elite carries.
import { affixCountFor, AFFIX_RULES, AFFIXES, LATE_AFFIX_ROOM } from './affixes.js';
import { encounterSpec } from './interactables.js';
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
import {
  CARRY_RULES,
  TRANSIT,
  FIRST_LEVEL,
  nextLevel,
  nextLevels,
  isLevel,
  grantFor,
  campaignRules,
} from '../data/campaign.js';

import { cloneData, r2, TUTORIAL_LAYOUT, tutorialDiff, RUN } from './run/rules.js';
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
  events.on('event_touch', () => openEncounter());
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
    if (o.depart) beginTransit('depart', null, rs.act, getTick());
    else enterRoom(firstRoom());
    return view();
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
      enterEvent(n, tick);
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
      ambushCleared(tick);
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
      onLevelCleared(tick);
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
      onLevelCleared(tick);
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
      onLevelCleared(getTick());
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

  // ------------------------------------------------------- event rooms --
  // EVENT ROOMS (docs/EVENT_ROOMS.md). Phase 'event': the party walks in
  // with the encounter standing ahead (E · Inspect). Phase 'encounter': its
  // card (Take or Leave). Take pays the cost, then the reward: a relic page,
  // a Skill draft, Glint, a heal, or (the trapped chest) a short fight first.
  // Then the doors, as after any room.
  function enterEvent(n, tick) {
    rs.phase = 'event';
    const enc = encounters.enter(n);
    relics.onRoomEnter(n, 'event');
    if (!enc) {
      afterRelic(); // defensive: a "?" room with nothing armed walks on
      return;
    }
    const e = registry.spawn(encounterSpec(enc.id, EVENT_RULES.spot.x, EVENT_RULES.spot.z, EVENT_RULES.bodyRadius));
    events.emit(tick, 'interactable_spawn', { id: e.id, itype: 'encounter', x: r2(e.x), z: r2(e.z) });
  }

  const encounterBody = () => registry.all().find((e) => e.itype === 'encounter');

  function openEncounter() {
    if (rs.phase !== 'event' || !encounters.open(encCtx())) return null;
    const body = encounterBody();
    if (body && body.uses > 0) body.uses = 0;
    rs.phase = 'encounter';
    return encounters.view(encCtx());
  }

  function focusEncounter(i) {
    if (rs.phase !== 'encounter') return null;
    return encounters.focus(i);
  }

  function spend(amount, reason) {
    rs.wallet = Math.max(0, rs.wallet - amount);
    events.emit(getTick(), 'glint_spend', { amount, wallet: rs.wallet, reason, room: rs.roomIndex });
  }

  // choice: 'take' | 'leave' (default: the card's focus).
  function chooseEncounter(choice) {
    if (rs.phase !== 'encounter') return null;
    const enc = encounters.live();
    if (!enc) return null;
    const pick = choice === 'take' || choice === 'leave' ? choice : enc.focus === 1 ? 'leave' : 'take';
    const tick = getTick();
    const room = rs.roomIndex;
    if (pick === 'take') {
      const why = encounters.refusal(encCtx());
      if (why) {
        events.emit(tick, 'event_denied', { room, encounter: enc.id, reason: why });
        return { denied: why };
      }
    }
    rs.roomsDone = Math.max(rs.roomsDone, room);
    if (pick === 'leave') {
      encounters.finish('done', { left: true });
      events.emit(tick, 'event_leave', { room, encounter: enc.id });
      afterRelic();
      return { left: true, encounter: enc.id };
    }
    const E = ENCOUNTERS[enc.id];
    const R = EVENT_RULES;
    const result = { took: true };
    const bodies = registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0);
    switch (enc.id) {
      case 'blood_shrine': {
        let paid = 0;
        for (const e of bodies) {
          const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.hpCost));
          e.hp = r2(e.hp - loss);
          paid += loss;
        }
        result.hp = r2(paid);
        relics.owe(room, 'shrine');
        break;
      }
      case 'wishing_well': {
        spend(E.price, 'event_well');
        const relic = encounters.coin() ? relics.grantRandom('well', encounterBody() ?? player) : null;
        if (relic) result.relic = relic;
        else {
          gainGlint(R.wellGlint, 'event_well');
          result.glint = R.wellGlint;
        }
        break;
      }
      case 'trapped_chest':
        startAmbush(tick);
        events.emit(tick, 'event_take', { room, encounter: enc.id, ambush: true });
        return { ambush: true, encounter: enc.id };
      case 'lost_pilgrim':
        spend(E.price, 'event_pilgrim');
        result.draft = 'skill';
        break;
      case 'corrupted_altar': {
        const id = encounters.pick(relics.freeMajors());
        relics.takeMajor(id, room);
        relics.owe(room, 'altar', { curse: id });
        result.curse = id;
        break;
      }
      case 'wandering_spirit': {
        const lost = relics.loseNewest('spirit');
        relics.owe(room, 'spirit', { not: lost ? [lost] : null });
        result.lost = lost;
        break;
      }
      case 'forgotten_cache':
        gainGlint(R.cacheGlint, 'event_cache');
        if (allyOn()) for (const seat of [1, 2, 3]) party.gainPurse(seat, R.cachePurse, 'event_cache');
        result.glint = R.cacheGlint;
        break;
      // MORE EVENT ROOMS (slice 6).
      case 'fey_ring': {
        const paid = rs.wallet;
        spend(paid, 'event_fey');
        relics.owe(room, 'fey');
        result.paid = paid;
        break;
      }
      case 'sluice_gate': {
        if (encounters.coin()) {
          const relic = relics.grantRandom('sluice', encounterBody() ?? player);
          if (relic) result.relic = relic;
          gainGlint(R.sluiceGlint, 'event_sluice');
          result.glint = R.sluiceGlint;
        } else {
          let lost = 0;
          for (const e of bodies) {
            const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.sluiceFlood));
            e.hp = r2(e.hp - loss);
            lost += loss;
          }
          result.flood = true;
          result.hp = r2(lost);
        }
        break;
      }
      case 'barrow_ossuary': {
        let paid = 0;
        for (const e of bodies) {
          const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.ossuaryCost));
          e.hp = r2(e.hp - loss);
          paid += loss;
        }
        result.hp = r2(paid);
        result.draft = 'node';
        break;
      }
      case 'heart_crystal': {
        const grown = [];
        const n = relics.majorCurses().length;
        for (let k = 0; k < n; k++) {
          const relic = relics.grantRandom('crystal', encounterBody() ?? player);
          if (!relic) break;
          grown.push(relic);
        }
        result.relics = grown;
        if (grown.length < n) {
          gainGlint(RELIC_RULES.emptyPoolGlint * (n - grown.length), 'relic_pool_empty');
          result.glint = RELIC_RULES.emptyPoolGlint * (n - grown.length);
        }
        break;
      }
      // THE STILL SPIRE (plan 4 slice 7).
      case 'gods_seat': {
        const lost = [];
        for (let k = 0; k < R.seatRelics; k++) {
          const id = relics.loseNewest('seat');
          if (id) lost.push(id);
        }
        relics.owe(room, 'seat', { not: lost });
        result.lost = lost;
        break;
      }
      case 'silent_bell': {
        let paid = 0;
        for (const e of bodies) {
          const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.bellCost));
          e.hp = r2(e.hp - loss);
          paid += loss;
        }
        result.hp = r2(paid);
        const lifted = relics.liftMajor('bell');
        if (lifted) result.lifted = lifted;
        break;
      }
      // THE EMBER KILN (content plan 5 slice 9): Glint poured into the
      // mould, 40 for each relic, up to three; the rest stays in the purse.
      case 'molten_bell': {
        const n = Math.min(R.pourMax, Math.floor(rs.wallet / R.pourStep));
        spend(n * R.pourStep, 'event_bell');
        const rung = [];
        for (let k = 0; k < n; k++) {
          const relic = relics.grantRandom('molten', encounterBody() ?? player);
          if (!relic) break;
          rung.push(relic);
        }
        result.paid = n * R.pourStep;
        result.relics = rung;
        if (rung.length < n) {
          gainGlint(RELIC_RULES.emptyPoolGlint * (n - rung.length), 'relic_pool_empty');
          result.glint = RELIC_RULES.emptyPoolGlint * (n - rung.length);
        }
        break;
      }
      case 'traveling_smith': {
        spend(E.price, 'event_smith');
        const lost = relics.loseNewest('smith');
        const was = lost ? RELICS[lost].rarity : 'common';
        const tiers = was === 'common' ? [['rare'], ['legendary']] : [['legendary']];
        const relic = relics.grantTier('smith', tiers, lost ? [lost] : null, encounterBody() ?? player);
        result.lost = lost;
        if (relic) result.relic = relic;
        break;
      }
      case 'gamblers_dice': {
        spend(E.price, 'event_dice');
        const dice = encounters.dice();
        result.dice = dice;
        if (dice[0] === dice[1]) {
          const relic = relics.grantTier('dice', [['rare', 'legendary']], null, encounterBody() ?? player);
          if (relic) result.relic = relic;
          else {
            gainGlint(R.diceGlint, 'event_dice');
            result.glint = R.diceGlint;
          }
        } else if (dice[0] + dice[1] >= R.diceHigh) {
          gainGlint(R.diceGlint, 'event_dice');
          result.glint = R.diceGlint;
        }
        break;
      }
      case 'healing_spring': {
        let healed = 0;
        for (const e of bodies) {
          if (e.hp >= e.maxHp) continue;
          combat.applyHeal(e, e.maxHp - e.hp, { source: 'healing_spring' });
          e.hp = e.maxHp; // full, whatever the curses and relics say
          healed += 1;
        }
        result.healed = healed;
        break;
      }
      default:
        break;
    }
    encounters.finish('done', result);
    events.emit(tick, 'event_take', { room, encounter: enc.id, ...result });
    if (result.draft) {
      rs.rewardFor[room] = result.draft;
      presentReward(null);
      return { took: true, encounter: enc.id, ...result };
    }
    afterReward(null);
    return { took: true, encounter: enc.id, ...result };
  }

  // ------------------------------------------------------------ shrines --
  // SHRINES (docs/SHRINES.md, sim/shrines.js). One a level, on the champions'
  // gate (campaign, Endless and the Daily; never the tutorial or the legacy
  // single-level run, so the goldens never see one). Boss Rush has none.
  // shrine: { aim, room, id, used, usedBy, pick, curse, offered } | null
  rs.shrine = null;
  events.on('shrine_touch', (ev) => RF.useShrine(ev.seat ?? 0));






  // The trapped chest: two short elite-heavy waves in the event room.
  function startAmbush(tick) {
    const depth = endlessDepth();
    const level = depth ? endlessLevel(depth) : roomLevel(levelFor(rs.act));
    const n = rs.roomIndex;
    const base = beyondCampaign(depth) ? endlessDifficulty(depth, Math.min(6, n), rs.challenge) : difficulty(rs.act, Math.min(6, n), rs.challenge);
    const A = EVENT_RULES.ambush;
    let diff = { ...base, budget: r2(base.budget * A.budgetMul), eliteChance: r2(Math.min(0.9, (base.eliteChance ?? 0) + A.eliteAdd)) };
    for (const m of relics.majorCurses()) diff = cursedDiff(diff, m, relics.majorScale());
    diff = vowedDiff(diff);
    encounters.finish('ambush');
    waves.planRoom('kill_all', { act: rs.act, room: n, challenge: rs.challenge, level, diff, waves: A.waves, campaignKinds: objectivesOn() });
    const ring = rs.layout ? LAYOUTS[rs.layout.layoutId]?.spawns : null;
    if (ring) waves.relocateSpawns(ring);
    rs.phase = 'combat';
    waves.beginRoom();
    events.emit(tick, 'event_ambush', { room: n, encounter: 'trapped_chest' });
  }

  function ambushCleared(tick) {
    sweepPlayerTransients(tick, 'room_clear');
    skillSys.clearOverride();
    events.emit(tick, 'heal_override', { index: null });
    rs.roomsDone = Math.max(rs.roomsDone, rs.roomIndex);
    const R = EVENT_RULES;
    gainGlint(R.chestGlint, 'event_chest');
    relics.owe(rs.roomIndex, 'chest');
    encounters.finish('done', { took: true, glint: R.chestGlint });
    events.emit(tick, 'event_chest', { room: rs.roomIndex, glint: R.chestGlint });
    afterReward(null);
  }

  // §13/§16 transition fade (<= 300 ms) between the meta screens and the next
  // room's first tick.
  function beginFade(next) {
    rs.pendingRoom = next;
    rs.fadeUntilTick = getTick() + RUN.fadeTicks;
    rs.phase = 'fade';
    events.emit(getTick(), 'room_transition', { from: rs.roomIndex, to: next, ticks: RUN.fadeTicks });
  }

  // ------------------------------------------------ level director (§12) --
  // The level-clear trigger. Reached ONLY from onRoomCleared in the boss room,
  // which itself acts only while phase === 'combat' and changes the phase in
  // this same call; the per-level latch below makes a second call a no-op
  // whatever path reaches it (a replayed clear, a cmd, a same-tick double).
  function onLevelCleared(tick) {
    const c = rs.campaign;
    if (c && c.clearedAt === c.index) return;
    const level = rs.act;
    const next = nextOf(c, level);
    const levelTicks = c ? tick - c.levelStartTick : tick - rs.startTick;
    if (c) {
      c.clearedAt = c.index;
      const rec = c.levels[c.levels.length - 1];
      if (rec) {
        rec.rooms = rs.roomsDone;
        rec.cleared = true;
        rec.ticks = levelTicks;
        // THIRD BOSSES: the boss this level met (unlock facts read it).
        // Always kept: a Daily reseeds each level, so the summary's one seed
        // cannot re-roll the earlier levels' bosses.
        rec.boss = currentBoss().kind ?? 'stag';
      }
      // ENDLESS: the final level's first clear wins the campaign; the
      // descent goes on.
      if (c.endless && !c.won && nextLevel(level) === null) {
        c.won = true;
        events.emit(tick, 'campaign_won', { level, depth: c.index, endless: true });
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
      rooms: rs.roomsDone,
      ...(c && c.endless ? { depth: c.index } : {}),
      ...(c && c.rush ? { fight: c.index } : {}),
    });
    if (next === null) {
      endRun('victory');
      // CAMPAIGN COMPLETE: the card returns to camp by itself (sim time, so a
      // pause holds it and a network guest follows the host).
      if (c && c.mode === 'campaign') rs.autoReturnTick = tick + TRANSIT.victoryReturnTicks;
      return;
    }
    beginTransit('clear', level, next, tick);
  }

  // RESET — every level-bound thing the sim owns goes (PLAN §12.3). The
  // presentation half (decals, particles, numerals, telegraph rigs, voices,
  // dressing) follows the `level_transit` event (src/campaign/manager.js).
  function resetLevel(tick, cause) {
    if (CARRY_RULES.resetShop) rs.shop = null;
    // PARTY: the party page, the four shelves and every deadline are level-bound.
    if (pages) pages.reset();
    relics.levelReset(); // RELICS: the relics ride on; curse / pick do not
    encounters.levelReset(); // EVENT ROOMS: two "?" doors a level
    vaults.levelReset(rs.act); // KEYS AND VAULTS: a key lasts its level
    secrets.levelReset(); // SECRET ROOMS: one wall a level
    RF.shrineLevelReset(); // SHRINES: one shrine a level
    if (party && CARRY_RULES.resetEntities) party.resetLevelState();
    rs.reward = null;
    rs.path = null;
    rs.pendingRoom = 0;
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
      // PARTY: no parry window, dash / vault or pending cast rides across.
      if (e.kind === 'ally') {
        if (e.guard && e.guard.parry) e.guard = null;
        e.skillDash = null;
        e.pendingCast = null;
      }
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
    if (!R.carryGlint) rs.wallet = 0;
    if (!R.carryHealOverride) {
      skillSys.clearOverride();
      events.emit(tick, 'heal_override', { index: null });
    }
    if (!R.carrySeedStream && typeof rng.reseed === 'function') rng.reseed(Math.floor(rng.float() * 0x100000000) >>> 0);
    if (!R.carryRecords && rs.campaign) rs.campaign.levels = rs.campaign.levels.slice(-1);
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
      wallet: rs.wallet,
      grant: rs.campaign && rs.campaign.grant ? cloneData(rs.campaign.grant) : null,
      // PARTY: the four builds that ride on (the card's compact lines).
      ...(party ? { builds: partyBuilds() } : {}),
    };
  }

  // PARTY: [{ seat, classId, skills, filled, sockets, bench, purse }] ×4.
  function partyBuilds() {
    const b = buildSys.view();
    const out = [
      {
        seat: 0,
        classId: 'healer',
        skills: skillSys.slotsView().map((s) => (s ? s.id : null)),
        filled: b.skills.reduce((n, s) => n + s.filled, 0),
        sockets: 32,
        bench: b.bench.length,
        purse: rs.wallet,
      },
    ];
    for (const i of [1, 2, 3]) {
      const v = party.view(i);
      out.push({ seat: i, classId: v.classId, skills: [...v.slots], filled: v.filled, sockets: 32, bench: v.bench.length, purse: v.purse });
    }
    return out;
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
    // THE LEVEL V FORK: the Level IV clear card waits for the party's road
    // (pickRoad); until then it leads to the Spire, which it takes if nobody
    // picks.
    const roads = kind === 'clear' ? forkRoads(rs.campaign, from) : null;
    const wait = roads ? Math.max(min, TRANSIT.forkTicks) : min;
    rs.campaign.card = {
      kind,
      from,
      to,
      startTick: tick,
      untilTick: tick + wait,
      minSkipTick: tick + Math.min(min, TRANSIT.minSkipTicks),
      hardUntilTick: tick + wait - min + TRANSIT.hardTicks,
      summary: carriedSummary(),
      leftovers,
      // THE LEVEL V FORK: present only on the Level IV clear card of a
      // campaign that has two roads ahead (`pick`: the party's, else null).
      ...(roads ? { fork: { roads, pick: null } } : {}),
      // ENDLESS: the depth the card leads to (present only then).
      ...(rs.campaign.endless ? { depth: rs.campaign.index + (kind === 'clear' ? 1 : 0) } : {}),
      // BOSS RUSH: the fight the card leads to (present only then).
      ...(rs.campaign.rush ? { fight: rs.campaign.index + (kind === 'clear' ? 1 : 0), fights: rs.campaign.rush.fights } : {}),
    };
    rs.campaign.transitions += 1;
    rs.phase = 'transit';
    events.emit(tick, 'level_transit', {
      kind,
      from,
      to,
      name: levelFor(to).name,
      index: rs.campaign.index + (kind === 'clear' ? 1 : 0),
      untilTick: rs.campaign.card.untilTick,
      minSkipTick: rs.campaign.card.minSkipTick,
      hardUntilTick: rs.campaign.card.hardUntilTick,
      ...(rs.campaign.endless ? { depth: rs.campaign.card.depth } : {}),
      ...(roads ? { fork: roads.slice() } : {}),
    });
  }

  // THE LEVEL V FORK: the party picks its road on the Level IV clear card
  // (the host in co-op). The card then leads to that road's Level V and
  // sets out shortly after. -> { ok, road, to } | { refused }
  function pickRoad(road, reason = 'pick') {
    const c = rs.campaign;
    if (!rs.active || rs.phase !== 'transit' || !c || !c.card || !c.card.fork) return { refused: 'no_fork' };
    const card = c.card;
    if (card.fork.pick) return { refused: 'picked', road: card.fork.pick };
    if (!card.fork.roads.includes(road) || !ROADS[road]) return { refused: 'road' };
    const tick = getTick();
    c.road = road;
    card.fork.pick = road;
    card.to = ROADS[road];
    card.untilTick = Math.max(card.minSkipTick, tick + TRANSIT.forkSettleTicks);
    card.hardUntilTick = tick + TRANSIT.hardTicks;
    events.emit(tick, 'road_pick', { road, to: card.to, name: levelFor(card.to).name, from: card.from, reason });
    return { ok: true, road, to: card.to };
  }

  // The card's Enter / the presentation's "ready" advance / the autopilot.
  function campaignAdvance(reason = 'skip') {
    if (!rs.active || rs.phase !== 'transit' || !rs.campaign || !rs.campaign.card) return null;
    const tick = getTick();
    if (tick < rs.campaign.card.minSkipTick) return { refused: 'settle', inTicks: rs.campaign.card.minSkipTick - tick };
    return advanceLevel(typeof reason === 'string' ? reason : 'skip');
  }

  // Build the next level and walk into its room 1.
  function advanceLevel(reason) {
    const tick = getTick();
    // A fork nobody picked takes the Spire's road.
    if (rs.campaign.card && rs.campaign.card.fork && !rs.campaign.card.fork.pick) pickRoad(DEFAULT_ROAD, 'default');
    const card = rs.campaign.card;
    const to = card.to;
    exitRoom(tick);
    if (card.kind === 'clear') {
      // A NEW level: its own run frame, rolled from the CARRIED run stream (no
      // reseed), and fresh per-level counters. (A 'depart' card's level was
      // opened — frame rolled, grant applied — before the card.)
      rs.act = to;
      // DAILY: every level of the day's run rolls from the day, not from
      // what the party drew in the level before.
      if (rs.campaign.daily) reseedTo(dailyLevelSeed(rs.campaign.daily.seed, rs.campaign.index + 1));
      rs.frame = rollFrame();
      rs.roomIndex = 0;
      rs.clearedRooms = 0;
      rs.roomsDone = 0;
      rs.rewardFor = { 1: 'skill' };
      rs.reward = null;
      rs.path = null;
      rs.shop = null;
      rs.spoils = null;
      rs.pendingRoom = 0;
      rs.fadeUntilTick = 0;
      rs.lastCombatLayout = null;
      rs.roomPlanView = null;
      rs.campaign.index += 1;
      if (rs.campaign.rush) rs.rewardFor[RUN.bossRoom] = rushReward(rs.campaign.index);
      if (objectivesOn()) assignObjectives(rs.frame.modes, rs.frame.seed, rs.campaign.index);
      rs.campaign.levels.push({ level: to, index: rs.campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
    } else {
      const rec = rs.campaign.levels[rs.campaign.levels.length - 1];
      if (rec) rec.startTick = tick;
    }
    rs.campaign.level = to;
    rs.campaign.levelStartTick = tick;
    rs.campaign.card = null;
    events.emit(tick, 'level_start', {
      level: to,
      name: levelFor(to).name,
      index: rs.campaign.index,
      from: card.kind === 'clear' ? card.from : null,
      campaign: rs.campaign.mode === 'campaign',
      reason,
      seed: rs.frame.seed,
      modes: [...rs.frame.modes],
      ...(rs.campaign.endless ? { depth: rs.campaign.index } : {}),
      ...(rs.campaign.rush ? { fight: rs.campaign.index } : {}),
    });
    enterRoom(firstRoom());
    return view();
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

  function campaignView() {
    const c = rs.campaign;
    const tick = getTick();
    if (!c) return { active: false, mode: null, autoReturnTick: rs.autoReturnTick, autoReturnInTicks: rs.autoReturnTick !== null ? Math.max(0, rs.autoReturnTick - tick) : null };
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
      active: rs.active,
      mode: c.mode,
      harness: c.harness,
      startLevel: c.startLevel,
      level: c.level,
      name: levelFor(c.level).name,
      index: c.index,
      next: nextOf(c, c.level),
      ...(c.road ? { road: c.road } : {}),
      ...(c.endless ? { endless: true, depth: c.index, won: !!c.won } : {}),
      ...(c.rush ? { rush: { fight: c.index, fights: c.rush.fights, line: cloneData(c.rush.line) } } : {}),
      ...(c.tutorial ? { tutorial: { hold: !!c.tutorial.hold } } : {}),
      levels: cloneData(c.levels),
      levelsCleared: c.levels.filter((l) => l.cleared).length,
      clearedAt: c.clearedAt,
      card,
      grant: cloneData(c.grant),
      transitions: c.transitions,
      startTick: c.startTick,
      levelStartTick: c.levelStartTick,
      autoReturnTick: rs.autoReturnTick,
      autoReturnInTicks: rs.autoReturnTick !== null ? Math.max(0, rs.autoReturnTick - tick) : null,
    };
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
      ...(party ? { builds: partyBuilds() } : {}),
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
    if (rs.phase === 'transit' && rs.campaign && rs.campaign.card && getTick() >= rs.campaign.card.hardUntilTick) advanceLevel('timeout');
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

  function view() {
    return {
      active: rs.active,
      phase: rs.phase,
      combatActive: combatActive(),
      room: rs.roomIndex,
      rooms: RUN.rooms,
      act: rs.act,
      actName: levelFor(rs.act).name,
      challenge: rs.challenge,
      // Slice 2: the boss this run meets, from room 6 on (the shop's Advance
      // label, the boss banner); absent earlier so the hashed view of the
      // certified early rooms is unchanged.
      // THIRD BOSSES: present only when a gated boss can join (hash-stable view).
      ...(rs.thirdOpen.length ? { thirdBosses: rs.thirdOpen.slice() } : {}),
      ...(rs.active && rs.roomIndex >= 6 ? { actBoss: { kind: currentBoss().kind, name: currentBoss().name } } : {}),
      // ENDLESS: present only on an endless descent (hash-stable view).
      ...(endlessDepth() ? { endless: { depth: endlessDepth(), won: !!rs.campaign.won } } : {}),
      // DAILY: present only on the day's run (hash-stable view).
      ...(rs.active && rs.campaign && rs.campaign.daily ? { daily: { key: rs.campaign.daily.key, ...(rs.campaign.daily.practice ? { practice: true } : {}) } } : {}),
      // BOSS RUSH: present only on a rush (hash-stable view).
      ...(rs.active && rs.campaign && rs.campaign.rush ? { rush: { fight: rs.campaign.index, fights: rs.campaign.rush.fights } } : {}),
      // TUTORIAL: present only in the guided first room (hash-stable view).
      ...(tutorialOn() ? { tutorial: { hold: !!rs.campaign.tutorial.hold } } : {}),
      layout: rs.layout ? { ...rs.layout } : null,
      mode: rs.frame && rs.roomIndex ? rs.frame.modes[rs.roomIndex - 1] : null,
      wallet: rs.wallet,
      // Small fixes: every seat's Glint ([Healer wallet, seat 1-3 purses]) so
      // the HUD counter reads the viewer's own; present only when a seat
      // other than the Healer is played (class select, co-op), so a solo
      // Healer run hashes as before.
      ...(RF.seatPursesOn() ? { purses: [rs.wallet, party.purse(1), party.purse(2), party.purse(3)] } : {}),
      clearedRooms: rs.clearedRooms,
      roomsDone: rs.roomsDone,
      freeSkillSlots: draft.freeSkillSlots(),
      frame: rs.frame
        ? { seed: rs.frame.seed, modes: [...rs.frame.modes], defendAt: [...rs.frame.defendAt], sides: [...rs.frame.sides] }
        : null,
      rewardFor: { ...rs.rewardFor },
      // fix-M4a-r4: `upgrades` (the drops that upgrade a full build) is
      // present only when non-empty — the view is part of snapshotState(), so
      // a fill-only run hashes exactly as it did before the fix.
      spoils: rs.spoils
        ? rs.spoils.upgrades && rs.spoils.upgrades.length
          ? { room: rs.spoils.room, nodes: [...rs.spoils.nodes], upgrades: [...rs.spoils.upgrades] }
          : { room: rs.spoils.room, nodes: [...rs.spoils.nodes] }
        : null,
      spoilsTotal: rs.spoilsTotal,
      reward: rs.reward
        ? {
            type: rs.reward.type,
            id: rs.reward.id,
            promised: rs.reward.promised,
            substituted: rs.reward.substituted,
            line: rs.reward.line,
            freeSkillSlots: rs.reward.freeSkillSlots,
            // fix-M4a-r4: `pool: 'upgrade'` when drawn from the upgrade
            // layer, `upgrade` = the swap target read LIVE (the player may
            // re-socket while the page is up; absent once the node would fill
            // a vacant socket), `reason` = why an empty offer is empty. Each
            // key is present only when set (hash-stable view, see spoils).
            ...(rs.reward.pool ? { pool: rs.reward.pool } : {}),
            ...upgradeKey(rs.reward.type === 'node' ? rs.reward.id : null),
            ...(rs.reward.reason ? { reason: rs.reward.reason } : {}),
            // Ruling A17: a swap offer's pending Replaces slot + the AI's
            // suggestion (present only on a swap — hash-stable view).
            ...(rs.reward.swap ? { swap: true, replace: rs.reward.replace, suggest: rs.reward.suggest } : {}),
          }
        : null,
      path: rs.path
        ? {
            nextRoom: rs.path.nextRoom,
            focus: rs.path.focus,
            freeSkillSlots: rs.path.freeSkillSlots,
            options: rs.path.options.map((o) => ({ ...o })),
            // PARTY socket hold (present only while held — hash-stable).
            ...(rs.path.hold ? { hold: { side: rs.path.hold.side, untilTick: rs.path.hold.untilTick, inTicks: Math.max(0, rs.path.hold.untilTick - getTick()) } } : {}),
          }
        : null,
      shop: rs.shop
        ? {
            wallet: rs.wallet,
            stock: rs.shop.stock.map((s) => ({
              node: s.node,
              rarity: s.rarity,
              price: s.price,
              sold: s.sold,
              owned: draft.ownedCount(s.node),
              // fix-M4a-r4: the swap target when this card UPGRADES a full
              // build — present only then (hash-stable view).
              ...upgradeKey(s.sold ? null : s.node),
              affordable: rs.wallet >= s.price,
              // An AI-held Healer's Suggested pick (key present only then).
              ...(rs.shop.marked ? { marked: !!rs.shop.marked[rs.shop.stock.indexOf(s)] } : {}),
            })),
            // The AI-held Healer's shelf: the player bought on it (Manual).
            ...(rs.shop.marked ? { touched: !!rs.shop.touched } : {}),
            // SHOP REFRESH: how often the Healer's shelf was redrawn this
            // visit (present only after one — hash-stable).
            ...(rs.shop.refreshes ? { refreshes: rs.shop.refreshes } : {}),
            // TONICS AND BOMBS: the tonic stand (present only with tonics on).
            ...(rs.shop.stand ? { stand: { item: rs.shop.stand.item, price: rs.shop.stand.price, bought: [...rs.shop.stand.bought] } } : {}),
          }
        : null,
      boss: rs.active && rs.roomIndex === RUN.bossRoom ? boss.view() : null,
      // PARTY: the party page / shelves (keys present only while open, so a
      // v0.5.150 view hashes exactly as before when none is up).
      ...(pages && pages.isOpen() ? { party: pages.pageView() } : {}),
      ...(pages && pages.shopOpen() ? { partyShop: pages.shopView() } : {}),
      // PARTY: which socket screens are open (network only; present only then).
      ...(pages && pages.screensAny() ? { socketScreens: pages.screens() } : {}),
      // RELICS: present only while a run with relics is live (hash-stable).
      ...(rs.active && relics.enabled() ? { relics: relics.view() } : {}),
      // EVENT ROOMS: present only while an encounter is live (hash-stable).
      ...(rs.active && encounters.view(encCtx()) ? { encounter: encounters.view(encCtx()) } : {}),
      // KEYS AND VAULTS: present only in a run with keys (hash-stable).
      ...(rs.active && vaults.enabled() ? { vaults: vaults.view() } : {}),
      // TONICS AND BOMBS: present only in a run with tonics (hash-stable).
      ...(rs.active && tonics.enabled() ? { tonics: tonics.view() } : {}),
      // SECRET ROOMS: present only in a run with secrets (hash-stable).
      ...(rs.active && secrets.enabled() ? { secrets: secrets.view() } : {}),
      // SHRINES: present only in a run with shrines.
      ...(rs.active && rs.shrine ? { shrine: RF.shrineView() } : {}),
      // UNLOCKS: the run's boons (present only when the player picked some).
      ...(rs.active && rs.campaign && rs.campaign.boons ? { boons: cloneData(rs.campaign.boons) } : {}),
      summary: rs.summary,
      fadeTicksLeft: rs.phase === 'fade' ? Math.max(0, rs.fadeUntilTick - getTick()) : 0,
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
      case 'pickRoad':
        // ('pickRoad', 'spire' | 'kiln') — the Level IV clear card's fork.
        return pickRoad(String(args[0] ?? ''), 'pick');
      case 'abandonRun':
        return abandonRun(args[0] ?? 'quit');
      case 'tutorialRelease':
        return tutorialRelease();
      case 'endTutorial':
        return endTutorial(args[0] ?? 'skip');
      case 'campaignState':
        return campaignView();
      case 'campaignRules':
        return campaignRules();
      case 'endlessRules':
        return endlessRules();
      case 'rushRules':
        return rushRules();
      case 'rushJump': {
        // ('rushJump', fight) — probes: a live rush clears the fight it is in
        // AS fight - 1 and opens the card to `fight` (marks the campaign
        // harness). Never outside a rush.
        if (!rs.active || !rs.campaign || !rs.campaign.rush || rs.phase === 'transit') return null;
        const d = Math.min(RUSH_RULES.fights, Math.max(rs.campaign.index + 1, Number(args[0]) | 0));
        const tick = getTick();
        rs.campaign.harness = true;
        rs.campaign.index = d - 1;
        rs.act = rushAct(d - 1);
        rs.campaign.level = rs.act;
        rs.campaign.levels.push({ level: rs.act, index: rs.campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
        onLevelCleared(tick);
        return campaignView();
      }
      case 'endlessJump': {
        // ('endlessJump', depth) — probes: a live endless descent clears the
        // level it is in AS depth - 1 and opens the card to `depth` (marks
        // the campaign harness). Never in a plain campaign.
        if (!rs.active || !rs.campaign || !rs.campaign.endless || rs.phase === 'transit') return null;
        const d = Math.max(rs.campaign.index + 1, Number(args[0]) | 0);
        const tick = getTick();
        rs.campaign.harness = true;
        rs.campaign.index = d - 1;
        rs.act = levelOfDepth(d - 1);
        rs.campaign.level = rs.act;
        if (d - 1 > ACT_IDS.length) rs.campaign.won = true;
        rs.campaign.levels.push({ level: rs.act, index: rs.campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
        onLevelCleared(tick);
        return campaignView();
      }
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
        // ('draftTake'[, slot]) — ruling A17: the slot a swap replaces.
        return takeReward(Number.isInteger(args[0]) ? args[0] : undefined);
      case 'draftReplace':
        return setRewardReplace(args[0]);
      // ------------------------------------------- PARTY (PLAN §16.11) --
      case 'partyPick':
        return partyPick(args[0], args[1], Number.isInteger(args[2]) ? args[2] : null, { by: 'human' });
      case 'partyReplace':
        // ('partyReplace', seat, slot) — move a swap card's Replaces mark.
        if (Number(args[0]) === 0) return setRewardReplace(args[1]);
        return pages && pages.isOpen() ? pages.setReplace(Number(args[0]), args[1]) : null;
      case 'partyCommit':
        return rs.phase === 'reward' && pages && pages.isOpen() ? commitPage('commit') : null;
      case 'partyPage':
        return pages ? pages.pageView() : null;
      case 'partyShop':
        return pages ? pages.shopView() : null;
      case 'partyBuy':
        return RF.partyBuy(args[0], args[1] ?? 0);
      case 'partyShopMark':
        return RF.partyShopMark(args[0], args[1], args[2]);
      case 'partyShopDone':
        return RF.partyShopDone(args[0]);
      case 'difficultyLegacy':
        // ('difficultyLegacy', on) — Node-only determinism proof (PLAN §16.9):
        // the v0.5.150 difficulty constants back in force. Never set by the game.
        return setDifficultyLegacy(args[0] !== false);
      case 'partyScreen':
        // ('partyScreen', seat, open) — a socket screen open / closed (the
        // network socket hold, BUILD_BRIEF §25.7).
        return RF.partyScreen(args[0], args[1]);
      case 'partySupply':
        // Node determinism proof only (PLAN §16.9): the ally supply off.
        if (args[0] !== undefined) rs.supplyOn = !!args[0] && !!pages;
        return rs.supplyOn;
      case 'partyGrant': {
        // ('partyGrant', level | 'max') — now, between rooms (probes).
        if (!party) return null;
        if (args[0] === 'max') {
          stressHealer();
          return party.stress();
        }
        const gr = grantFor(Number(args[0]));
        return gr && gr.allies ? party.applyGrant(gr.allies, 'grant') : null;
      }
      case 'partyHarnessGrant':
        // ('partyHarnessGrant', N | 'max' | null) — applied at the next run start.
        rs.harnessGrant = args[0] === undefined ? null : args[0];
        return rs.harnessGrant;
      case 'draftDecline':
        return declineReward();
      // ------------------------------------------------------ RELICS --
      case 'relicChoose':
        return chooseRelic(args[0]);
      case 'relicFocus':
        return focusRelic(args[0] ?? 0);
      case 'relics':
        // ('relics'[, on]) — turn relics on / off for the live run (probes;
        // a single-level startRun() has them off).
        if (args[0] !== undefined) {
          if (args[0] && !relics.enabled()) relics.reset(rs.frame ? rs.frame.seed : rng.seed, true);
          else if (!args[0]) relics.reset(0, false);
        }
        return relics.enabled() ? relics.view() : null;
      case 'relicsDefault':
        // ('relicsDefault', on) — whether the NEXT campaign rolls relics.
        if (args[0] !== undefined) rs.relicsDefault = !!args[0];
        return rs.relicsDefault;
      case 'relicGrant':
        return relics.grant(args[0]);
      case 'relicDemo':
        // VFX lab: ('relicDemo', relicId) — a batch-4 room relic's beat here.
        return relics.demo(args[0]);
      case 'relicBuy':
        // ('relicBuy', index[, seat]) — buy off the shop's relic shelf.
        return RF.buyRelic(args[1] ?? 0, args[0] ?? 0);
      case 'relicPool':
        // Batch 3: the relic ids a pick could offer now (class relics only
        // while their class stands in the party).
        return relics.enabled() ? relics.pool() : null;
      case 'relicHit': {
        // Batch 3 probe: ('relicHit', targetId, attackerId|null, power, crit)
        // — one real party hit through the §9 pipeline.
        const [id, by = null, power = 10, crit = false] = args;
        const t = registry.byId(id);
        if (!t) return null;
        return combat.applyDamage(t, power, { delivery: 'basic', shape: 'debug', attacker: by, source: 'relic_probe', forceCrit: !!crit, kbDist: 0 });
      }
      case 'relicStatus': {
        // Batch 3 probe / VFX lab: ('relicStatus', id, kind, mag, ticks,
        // seat|null) — a real status from a party seat (a Tank taunt, an
        // exposure), announced like any other at the end of the tick.
        const [id, kind, mag = 1, ticks = 120, seat = null] = args;
        const t = registry.byId(id);
        const src = Number.isInteger(seat) ? registry.all().find((e) => e.partyIndex === seat) : null;
        if (!t) return null;
        return !!combat.status.apply(t, kind, mag, ticks, getTick(), src ? src.id : null);
      }
      case 'relicRoomEnter':
        // VFX lab: ('relicRoomEnter', mode) — replay the relics' room-entry
        // procs as if this room were a `mode` room (Huntsman's Horn,
        // Pilgrim's Lamp).
        if (!relics.enabled() || !rs.active) return null;
        relics.onRoomEnter(rs.roomIndex, args[0]);
        return true;
      case 'relicHeal': {
        // Batch 3 probe: ('relicHeal', targetId, healerId|null, amount).
        const [id, by = null, amount = 10] = args;
        const t = registry.byId(id);
        if (!t) return null;
        return combat.applyHeal(t, amount, { healer: by, source: 'relic_probe' });
      }
      case 'relicDropNext':
        // Probe / VFX lab: the next elite the party kills drops a relic.
        return relics.dropNext();
      case 'relicCurseHere':
        // Probe / VFX lab: ('relicCurseHere', curseId) curses the live room now
        // (its telegraph and healing rules; its wave numbers are already rolled).
        if (!relics.enabled() || rs.phase !== 'combat') return null;
        relics.takeCurse(args[0], rs.roomIndex);
        relics.onRoomEnter(rs.roomIndex, rs.frame ? rs.frame.modes[rs.roomIndex - 1] : 'kill_all');
        return relics.view().curse;
      // ----------------------------------------------- ROOM OBJECTIVES --
      case 'objectiveRoom': {
        // ('objectiveRoom', 'hunt'|'purge'|'escort'|'hold'|'kill_all', room) — a later combat
        // room of this level becomes that room (probes, screenshots).
        const m = args[0];
        const n = Number(args[1]);
        if (!rs.active || !rs.frame || !(isObjectiveMode(m) || m === 'kill_all')) return null;
        if (!(Number.isInteger(n) && n > rs.roomIndex && n >= 2 && n <= 6) || rs.frame.modes[n - 1] === 'defend') return null;
        rs.frame.modes[n - 1] = m;
        return [...rs.frame.modes];
      }
      case 'objectiveDebug':
        // ESCORT AND HOLD: ('objectiveDebug', 'road', 0.9) puts the pilgrim
        // 90% along its road; ('objectiveDebug', 'clock', 600) leaves the
        // hold 10 s (probes, screenshots).
        return rs.active ? waves.debugObjective(args[0], args[1]) : null;
      // ------------------------------------------------- CHAMPION ROOMS --
      case 'championRoom': {
        // ('championRoom', room) — a later combat room of this level becomes
        // the champion's room (probes, screenshots, the VFX lab).
        const n = Number(args[0]);
        if (!rs.active || !rs.frame || !championsOn()) return null;
        if (!(Number.isInteger(n) && n > rs.roomIndex && n >= 2 && n <= 6)) return null;
        rs.frame.modes[n - 1] = 'champion';
        rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== n);
        return [...rs.frame.modes];
      }
      case 'crownDoor':
        // ('crownDoor'[, side]) — the next path screen carries the crown door.
        if (!rs.active || !championsOn()) return null;
        rs.forcedCrown = { room: rs.roomIndex + 1, side: args[0] === 1 ? 1 : 0 };
        return { ...rs.forcedCrown };
      case 'championPick': {
        // ('championPick'[, id]) — this level's champion (by seed); with an
        // id of the act's own, force it for the rest of the level.
        if (!rs.active || !rs.frame || !championsOn()) return null;
        if (args.length && args[0] != null) {
          const c = championById(String(args[0]));
          if (!c) return null;
          rs.forcedChampion = { index: rs.campaign.index, id: c.id };
        }
        return levelChampion();
      }
      case 'crownOf':
        // The crown this level rolled: { room, side }.
        return rs.active && rs.frame && championsOn() ? crownFor(rs.frame.seed, rs.campaign.index) : null;
      // ------------------------------------------------ KEYS AND VAULTS --
      case 'tonicGive': {
        // ('tonicGive', seat, id) — fill a hero's slot (probes, screenshots).
        if (!rs.active || !tonics.enabled()) return null;
        tonics.setSlot(Number(args[0] ?? 0), args.length > 1 ? args[1] : 'mend_tonic');
        return tonics.view();
      }
      case 'tonicDrop': {
        // ('tonicDrop', id[, x, z]) — one falls in the live room.
        if (!rs.active || !tonics.enabled()) return null;
        return tonics.drop(args[0] ?? 'mend_tonic', 'probe', Number(args[1] ?? 0), Number(args[2] ?? -2));
      }
      case 'tonicUse': {
        // ('tonicUse', seat[, x, z]) — the seat presses its slot now.
        if (!rs.active || !tonics.enabled()) return null;
        return tonics.use(Number(args[0] ?? 0), args[1] !== undefined ? { x: Number(args[1]), z: Number(args[2] ?? 0) } : null, rs.phase === 'combat');
      }
      // ------------------------------------------------- SHRINES --
      case 'shrineState':
        return rs.shrine ? RF.shrineView() : null;
      case 'shrineHere': {
        // ('shrineHere'[, biome[, x, z]]) — a shrine stands in the live
        // combat room now (probes, screenshots, the lab).
        if (!rs.active || !rs.shrine || rs.phase !== 'combat') return null;
        const id = SHRINES[args[0]] ? args[0] : levelFor(rs.act)?.biome;
        rs.shrine.used = false;
        rs.shrine.room = rs.roomIndex;
        rs.shrine.id = id;
        for (const e of registry.all()) if (e.kind === 'shrine') registry.despawn(e.id);
        const at = args[1] !== undefined ? [Number(args[1]), Number(args[2] ?? 0)] : RF.shrineSpot(rs.roomIndex);
        return RF.spawnShrine(id, at[0], at[1], getTick());
      }
      case 'shrineRoom': {
        // ('shrineRoom', n) — this level's shrine aims at room n.
        if (!rs.active || !rs.shrine) return null;
        rs.shrine.aim = Number(args[0]);
        rs.shrine.room = null;
        return rs.shrine.aim;
      }
      case 'shrineUse':
        // ('shrineUse'[, seat]) — the seat offers at the live shrine now.
        return RF.useShrine(Number(args[0] ?? 0));
      case 'tonicState':
        return tonics.enabled() ? { ...tonics.view(), stand: rs.shop && rs.shop.stand ? { ...rs.shop.stand, bought: [...rs.shop.stand.bought] } : null } : null;
      case 'keyGive': {
        // The party holds a key (probes, screenshots).
        if (!rs.active || !vaults.enabled()) return null;
        if (!vaults.held()) vaults.loadState({ ...vaults.saveState(), key: { from: args[0] === 'elite' ? 'elite' : 'champion', room: rs.roomIndex, kind: 'probe' } });
        return vaults.view();
      }
      case 'keyDrop': {
        // ('keyDrop'[, x, z]) — a key falls in the live room.
        if (!rs.active || !vaults.enabled()) return null;
        return vaults.drop('elite', 'probe', Number(args[0] ?? 0), Number(args[1] ?? -2), rs.roomIndex);
      }
      case 'vaultDoor':
        // ('vaultDoor', side) — the next path screen's vault door prefers this side.
        if (!rs.active || !vaults.enabled()) return null;
        rs.forcedVault = args[0] === 1 ? 1 : 0;
        return rs.forcedVault;
      case 'vaultRoom': {
        // ('vaultRoom', n) — a later room of this level becomes the vault.
        const n = Number(args[0]);
        if (!rs.active || !rs.frame || !vaults.enabled()) return null;
        if (!(Number.isInteger(n) && n > rs.roomIndex && n >= 2 && n <= 6)) return null;
        rs.frame.modes[n - 1] = 'vault';
        rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== n);
        return [...rs.frame.modes];
      }
      case 'vaultOpen':
        return RF.openVault();
      // SECRET ROOMS probes.
      case 'secretWall':
        // ('secretWall', n?, holds?) — room n of this level (default: the
        // live room, placed now) hides a wall; `holds` forces its content.
        if (!rs.active || !rs.frame || !secrets.enabled()) return null;
        if (args[1] !== undefined) rs.forcedHolds = String(args[1]);
        if (args[0] === undefined || Number(args[0]) === rs.roomIndex) {
          if (rs.phase !== 'combat' || !secrets.canPlace()) return null;
          const e = RF.placeWall(rs.roomIndex, rs.frame.modes[rs.roomIndex - 1], getTick());
          return e ? secrets.view().wall : null;
        }
        rs.forcedWall = Number(args[0]);
        return rs.forcedWall;
      case 'secretOpen':
        // ('secretOpen') — the live room's wall breaks open now.
        return rs.active && secrets.shut() ? RF.openWall('probe', 0) : null;
      case 'secretTake':
        return RF.openSecret();
      case 'relicSealKnock':
        // RELICS batch 6 (probe / VFX lab): a breaking blow on a Sealed
        // Door's wall, turned by the seal.
        if (!rs.active || !secrets.shut() || !relics.wallSealed()) return null;
        sealedKnock(0);
        return true;
      case 'secretState':
        return secrets.enabled() ? secrets.view() : null;
      case 'vaultState':
        return vaults.enabled() ? vaults.view() : null;
      case 'relicDoor':
        // ('relicDoor', curseId[, side]) — the next path screen's cursed door.
        return relics.forceDoor(args[0], args[1] ?? 0);
      // ----------------------------------------------- ELITE AFFIXES --
      case 'affixRule':
        // The live room's roll rule ({ count, salt } | null).
        return affixRule();
      case 'affixes':
        // Every live affixed elite: { id, etype, affixes, ward, blink }.
        return registry
          .all()
          .filter((e) => Array.isArray(e.affixes) && e.state === 'active')
          .map((e) => ({ id: e.id, etype: e.kind, affixes: [...e.affixes], hp: Math.round(e.hp * 100) / 100, maxHp: e.maxHp, ward: e.affixWard ?? null, blink: e.blink ? { ...e.blink } : null, x: Math.round(e.x * 100) / 100, z: Math.round(e.z * 100) / 100 }));
      case 'affixData':
        return { ids: Object.keys(AFFIXES), rules: AFFIX_RULES };
      // ------------------------------------------------- EVENT ROOMS --
      case 'eventDoor':
        // ('eventDoor', encounterId[, side]) — the next path screen's "?" door.
        return encounters.force(args[0], args[1] ?? 0);
      case 'eventMajor':
        // ('eventMajor', curseId) — probe / lab: bind a major curse now (the
        // Heart Crystal feeds on them).
        return relics.takeMajor(args[0], rs.roomIndex);
      case 'eventLand':
        // The land the door roll reads ('wood' | 'mill' | 'barrow' | 'heart').
        return encCtx().land;
      case 'eventOpen':
        return openEncounter();
      case 'eventFocus':
        return focusEncounter(args[0] ?? 0);
      case 'eventChoose':
        return chooseEncounter(args[0]);
      case 'eventState':
        return encounters.view(encCtx());
      case 'pathFocus':
        return focusPath(args[0] ?? 0);
      case 'pathChoose':
        return choosePath(args[0] ?? 0);
      case 'shopBuy':
        return RF.buy(args[0] ?? 0);
      case 'shopRefresh':
        // ('shopRefresh'[, seat]) — redraw that seat's shelf for Glint.
        return RF.refreshShop(args[0] ?? 0);
      case 'shopRefreshCost':
        return rs.phase === 'shop' ? RF.refreshCost(args[0] ?? 0) : null;
      case 'shopAdvance':
        return RF.advanceFromShop();
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
        if (!rs.active) startRun(args[1] && typeof args[1] === 'object' ? args[1] : {});
        // A level-transition card is between two levels: advance it first
        // (the skip then lands in the NEW level), never skip inside the old one.
        if (rs.phase === 'transit' && rs.campaign && rs.campaign.card) advanceLevel('skip_room');
        rs.phase = 'skip'; // suppresses the boundary sequence on the forced clear
        waves.forceClear();
        boss.despawn();
        enemies.reset();
        sweepPlayerTransients(getTick(), 'skip');
        // §14: the stipend is +12 per COMBAT-room clear. The shop room pays
        // nothing, so skipping past it must not mint 12 Glint out of thin air
        // — walking to room 7 or room 8 both land on the deterministic 72.
        const combatBefore = rs.frame.modes
          .slice(0, n - 1)
          .filter((m) => m === 'kill_all' || m === 'defend' || m === 'boss' || m === 'champion' || isObjectiveMode(m)).length;
        while (rs.clearedRooms < combatBefore) {
          rs.clearedRooms += 1;
          gainGlint(RUN.stipend, 'skip_stipend');
          if (allyOn()) pages.stipend('skip_stipend'); // PARTY: every purse keeps the §14 arithmetic
        }
        rs.roomsDone = Math.max(rs.roomsDone, n - 1); // every room before n is behind us
        enterRoom(n);
        return view();
      }
      case 'bossHp':
        // ('bossHp', pct[, skipPhases]) — skipPhases marks the add waves at or
        // above pct as already played, so no adds spawn for them.
        return boss.setHpPct(args[0] ?? 0.5, args[1] === true);
      case 'bossPick':
        // ('bossPick', kind | null) — probes and benches: the boss room meets
        // this boss when it belongs to the level (data/levels.js bossFor).
        rs.bossPick = typeof args[0] === 'string' ? args[0] : null;
        return rs.bossPick;
      case 'killBoss': {
        const b = boss.entity();
        if (!b) return null;
        combat.kill(b);
        return true;
      }
      case 'wallet': {
        if (args[0] !== undefined) {
          rs.wallet = Math.max(0, Math.round(args[0]));
          events.emit(getTick(), 'glint_set', { wallet: rs.wallet });
        }
        return rs.wallet;
      }
      case 'draftPools':
        return {
          skill: draft.skillPool(),
          node: draft.nodePool(),
          upgrade: draft.upgradePool(), // fix-M4a-r4: the layer a full build draws from
          free: draft.freeSkillSlots(),
        };
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

  // Persistence (PLAN §3.4) for the Gauntlet additions (the v0.4.63 run frame
  // members are captured by M2's world-level capture).
  const expeditionState = () => ({
    act: rs.act,
    challenge: rs.challenge,
    layout: rs.layout ? { ...rs.layout } : null,
    lastCombatLayout: rs.lastCombatLayout,
    roomPlan: rs.roomPlanView ? { ...rs.roomPlanView } : null,
    autopilot: autopilot.serialize(),
  });
  function restoreExpedition(d) {
    if (!d) return;
    rs.act = ACT_IDS.includes(d.act) ? d.act : 1;
    rs.challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    rs.layout = d.layout ? { ...d.layout } : null;
    rs.lastCombatLayout = d.lastCombatLayout ?? null;
    rs.roomPlanView = d.roomPlan ? { ...d.roomPlan } : null;
    autopilot.restore(d.autopilot);
  }

  // Save system (docs/gauntlet/PLAN.md §3.4, M2): the COMPLETE run frame —
  // the v0.4.63 members plus the expedition state and the autopilot (the
  // draft and status tracker are stateless; roomHooks are wiring, not state).
  function saveState() {
    return {
      active: rs.active,
      roomIndex: rs.roomIndex,
      phase: rs.phase,
      wallet: rs.wallet,
      frame: rs.frame,
      reward: rs.reward,
      path: rs.path,
      shop: rs.shop,
      summary: rs.summary,
      pendingRoom: rs.pendingRoom,
      fadeUntilTick: rs.fadeUntilTick,
      rewardFor: rs.rewardFor,
      clearedRooms: rs.clearedRooms,
      roomsDone: rs.roomsDone,
      startTick: rs.startTick,
      everStarted: rs.everStarted,
      act: rs.act,
      challenge: rs.challenge,
      layout: rs.layout,
      lastCombatLayout: rs.lastCombatLayout,
      roomPlan: rs.roomPlanView,
      autopilot: autopilot.serialize(),
      spoils: rs.spoils,
      spoilsTotal: rs.spoilsTotal,
      // CAMPAIGN (schema 3): the level director's whole state, the card included.
      campaign: cloneData(rs.campaign),
      autoReturnTick: rs.autoReturnTick,
      // PARTY (schema 4, PLAN §16.6): the party page, the shelves, the door
      // deadline — present only when something is open.
      ...(pages && (pages.isOpen() || pages.shopOpen() || pages.doorDeadline() !== null || pages.screensAny()) ? { partyPages: pages.saveState() } : {}),
      // RELICS: present only when the run rolls relics.
      ...(rs.active && relics.enabled() ? { relics: relics.saveState() } : {}),
      // EVENT ROOMS: present only when the run rolls "?" doors.
      ...(rs.active && encounters.enabled() ? { encounters: encounters.saveState() } : {}),
      // KEYS AND VAULTS: present only in a run with keys.
      ...(rs.active && vaults.enabled() ? { vaults: vaults.saveState() } : {}),
      ...(rs.active && tonics.enabled() ? { tonics: tonics.saveState() } : {}),
      ...(rs.active && secrets.enabled() ? { secrets: secrets.saveState() } : {}),
      ...(rs.active && rs.shrine ? { shrine: cloneData(rs.shrine) } : {}),
      ...(rs.bossPick ? { bossPick: rs.bossPick } : {}),
      ...(rs.thirdOpen.length ? { thirdBosses: rs.thirdOpen.slice() } : {}),
    };
  }
  function loadState(d) {
    if (!d || typeof d.phase !== 'string') throw new TypeError('run.loadState: missing phase');
    rs.active = !!d.active;
    rs.roomIndex = d.roomIndex ?? 0;
    rs.phase = d.phase;
    rs.wallet = d.wallet ?? RUN.startingGlint;
    rs.frame = d.frame ?? null;
    rs.reward = d.reward ?? null;
    rs.path = d.path ?? null;
    rs.shop = d.shop ?? null;
    rs.summary = d.summary ?? null;
    rs.pendingRoom = d.pendingRoom ?? 0;
    rs.fadeUntilTick = d.fadeUntilTick ?? 0;
    rs.rewardFor = d.rewardFor ?? {};
    rs.clearedRooms = d.clearedRooms ?? 0;
    rs.roomsDone = d.roomsDone ?? 0;
    rs.startTick = d.startTick ?? 0;
    rs.everStarted = !!d.everStarted;
    rs.act = ACT_IDS.includes(d.act) ? d.act : 1;
    rs.challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    rs.bossPick = typeof d.bossPick === 'string' ? d.bossPick : null;
    rs.thirdOpen = Array.isArray(d.thirdBosses) ? d.thirdBosses.filter((a) => ACT_IDS.includes(a)) : [];
    rs.layout = d.layout ?? null;
    rs.lastCombatLayout = d.lastCombatLayout ?? null;
    rs.roomPlanView = d.roomPlan ?? null;
    autopilot.restore(d.autopilot ?? null);
    // M4c additions — absent in a tree migrated from schema 1.
    rs.spoils = d.spoils ?? null;
    rs.spoilsTotal = Number.isFinite(d.spoilsTotal) ? d.spoilsTotal : 0;
    // CAMPAIGN additions (schema 3; save/codec.js MIGRATIONS[2] fills them
    // for an older act run). A live run with no campaign record is treated as
    // a campaign from its act, so an in-memory older payload still advances.
    rs.campaign = d.campaign ? cloneData(d.campaign) : null;
    if (!rs.campaign && rs.active) {
      rs.campaign = {
        mode: 'campaign',
        harness: false,
        startLevel: rs.act,
        level: rs.act,
        index: 1,
        levels: [{ level: rs.act, index: 1, startTick: rs.startTick, rooms: rs.roomsDone, cleared: false, ticks: 0 }],
        startTick: rs.startTick,
        levelStartTick: rs.startTick,
        clearedAt: 0,
        card: null,
        grant: null,
        transitions: 0,
      };
    }
    rs.autoReturnTick = Number.isFinite(d.autoReturnTick) ? d.autoReturnTick : null;
    if (pages) pages.loadState(d.partyPages ?? null);
    relics.loadState(d.relics ?? null);
    encounters.loadState(d.encounters ?? null);
    vaults.loadState(d.vaults ?? null);
    tonics.loadState(d.tonics ?? null);
    secrets.loadState(d.secrets ?? null);
    rs.shrine = d.shrine ? cloneData(d.shrine) : null;
  }

  Object.assign(RF, { afterRelic, beginFade, gainGlint, positionParty, presentReward, spend }); // the closure's own functions the parts call
  Object.assign(RF, createRunShop({ rs, RF, allyOn, buildSys, controllers, draft, events, getTick, pages, party, relics, tonics }));
  Object.assign(RF, createRunShrines({ rs, RF, championsOn, events, getTick, party, player, registry, relics, tonics, vaults }));
  Object.assign(RF, createVaultRoom({ rs, RF, allyOn, combat, events, getTick, party, registry, relics, tonics, vaults }));
  Object.assign(RF, createSecretRoom({ rs, RF, allyOn, encCtx, encounters, events, getTick, party, player, registry, relics, secrets, tonics }));
  const api = {
    saveState,
    loadState,
    startRun,
    // Linear campaign (PLAN §12.2).
    startCampaign,
    campaignAdvance,
    pickRoad,
    abandonRun,
    tutorialRelease,
    endTutorial,
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
    layout: () => (rs.layout ? { ...rs.layout } : null),
    act: () => rs.act,
    challenge: () => rs.challenge,
    expeditionState,
    restoreExpedition,
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
    openEncounter,
    focusEncounter,
    chooseEncounter,
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
